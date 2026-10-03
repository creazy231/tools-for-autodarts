/**
 * Online Teams' server: a team room per autodarts lobby (rooms.ts), over
 * socket.io. It carries the team layer only (names, players, order, colours,
 * tap-to-correct, the host's partner rule, one-time claims); darts and scores
 * stay with autodarts.
 *
 * Run locally with `bun run dev` (port 4455), which the extension's `yarn dev`
 * builds talk to. Logs carry counts, never names or ids.
 */

import { createServer } from "node:http";
import { Server, type Socket } from "socket.io";

import { PROTOCOL_VERSION, type Result, type RoomState, Rooms, parsePeer } from "./rooms";

const PORT = Number(process.env.PORT) || 4455;
/** socket.io's own cap on one message. */
const MAX_MESSAGE_BYTES = 8 * 1024;
const RATE_WINDOW_MS = 10_000;
const RATE_MAX = 30;
const SWEEP_MS = 60_000;

/**
 * Where a browser may connect from: autodarts' page (where the content scripts
 * run) and the extensions themselves. Firefox's content scripts send
 * `Origin: null`. A client with no Origin at all (a script, a test) is let
 * through too: anything but a browser could claim any origin anyway, so this
 * only keeps other websites from using their visitors' browsers.
 */
const ORIGINS = [
  /^null$/,
  /^https:\/\/play\.autodarts\.com$/,
  /^chrome-extension:\/\/[a-p]{32}$/,
  /^moz-extension:\/\/[0-9a-f-]+$/i,
  /^safari-web-extension:\/\/[0-9a-f-]+$/i,
];

type Ack = (answer: unknown) => void;
type Payload = Record<string, unknown>;

const rooms = new Rooms();

const http = createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ ok: true, version: PROTOCOL_VERSION, ...rooms.counts() }));
    return;
  }
  response.writeHead(404).end();
});

const io = new Server(http, {
  transports: [ "websocket" ],
  maxHttpBufferSize: MAX_MESSAGE_BYTES,
  allowRequest: (request, callback) => {
    const origin = request.headers.origin;
    const allowed = !origin || ORIGINS.some(pattern => pattern.test(origin));
    // An origin names a site or an extension, never a person.
    if (!allowed) console.log(`Online Teams: refused a connection from ${origin}`);
    callback(null, allowed);
  },
});

io.use((socket, next) => {
  const auth = (socket.handshake.auth ?? {}) as Payload;
  if (auth.v !== PROTOCOL_VERSION) return next(new Error("version"));
  const peer = parsePeer(auth);
  if (!peer) return next(new Error("identity"));
  socket.data.peer = peer;
  next();
});

/** At most RATE_MAX messages in any RATE_WINDOW_MS, per socket. */
function limiter(): () => boolean {
  const times: number[] = [];
  return () => {
    const now = Date.now();
    while (times.length && now - times[0] > RATE_WINDOW_MS) times.shift();
    times.push(now);
    return times.length <= RATE_MAX;
  };
}

function broadcast(state: RoomState) {
  io.to(state.lobbyId).emit("room:state", state);
}

io.on("connection", (socket: Socket) => {
  const allowed = limiter();

  /** One event: rate-limited, answered on its ack, and the room told of any change. */
  function on<T>(event: string, run: (payload: Payload) => Result<T>, after?: (value: T) => void) {
    socket.on(event, (payload: unknown, ack?: Ack) => {
      const reply: Ack = typeof ack === "function" ? ack : () => {};
      if (!allowed()) return reply({ ok: false, error: "rate" });
      const result = run((payload && typeof payload === "object" ? payload : {}) as Payload);
      reply(result);
      if (result.ok) after?.(result.value);
    });
  }

  on("room:join", ({ lobbyId }) => rooms.join(lobbyId, socket.id, socket.data.peer), (state) => {
    socket.join(state.lobbyId);
    broadcast(state);
  });
  on("room:leave", ({ lobbyId }) => {
    if (typeof lobbyId !== "string") return { ok: false, error: "lobby" };
    const state = rooms.leave(lobbyId, socket.id);
    socket.leave(lobbyId);
    if (state) broadcast(state);
    return { ok: true, value: true };
  });
  on("room:teams", ({ lobbyId, teams }) => rooms.setTeams(lobbyId, socket.id, teams), broadcast);
  on("room:shift", ({ lobbyId, team, shift }) => rooms.setShift(lobbyId, socket.id, { team, shift }), broadcast);
  on("room:rule", ({ lobbyId, partnerRule }) => rooms.setRule(lobbyId, socket.id, { partnerRule }), broadcast);
  on("room:claim", ({ lobbyId, key }) => rooms.claim(lobbyId, socket.id, key));
  // Answered wherever its ack comes: `emit("room:ping", cb)` and `emit("room:ping", payload, cb)` alike.
  socket.on("room:ping", (...args: unknown[]) => {
    const ack = args.find((arg): arg is Ack => typeof arg === "function");
    ack?.({ ok: true });
  });

  socket.on("disconnect", () => {
    for (const state of rooms.leaveAll(socket.id)) broadcast(state);
  });
});

setInterval(() => {
  const dropped = rooms.sweep();
  if (dropped) console.log(`Online Teams: ${dropped} room(s) expired, ${rooms.counts().rooms} open`);
}, SWEEP_MS);

http.listen(PORT, () => {
  console.log(`Online Teams server on :${PORT}, protocol ${PROTOCOL_VERSION}`);
});
