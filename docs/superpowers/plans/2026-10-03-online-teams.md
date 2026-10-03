# Online Teams Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Teams (shared score and own scores) playable online. Both teams sit in one autodarts online lobby, each on its captain's board, and `socket/` becomes a team room that shares the team layer between the two Tools.

**Architecture:** Autodarts plays the one match. The rewritten Bun/socket.io server (`socket/rooms.ts` plus `socket/index.ts`) keeps a room per lobby id, in memory, holding each account's teams, tap-to-corrections, the host's partner rule and one-time claims. In the extension:
- **Room client:** the lobby and match scripts each hold a `RoomClient` (`utils/team-room-client.ts`), which mirrors every room state into `local:teams-room`.
- **Merge:** one pure function, `screenTeams` (`utils/team-room.ts`), merges your own teams with the trusted part of the room. The lobby, the match, the team view (`utils/websocket-helpers.ts`), the Caller (`utils/team-calls.ts`) and Local Lobby all read it.

**Tech Stack:** TypeScript, Vue 3, WXT, socket.io 4.8 (server) and socket.io-client 4.8 (extension, already a dependency), Bun 1.3 (server and `bun test`), tsx with `node:test` (extension tests, in the session scratchpad).

**Spec:** `docs/superpowers/specs/2026-10-03-online-teams-design.md`

## Global Constraints

- Repo: `/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt`, branch `feat/online-teams`. Commit after every task, with messages in the repo's style (`feat: …`, `fix: …`, `docs: …`), ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- `SCR=/private/tmp/claude-501/-Volumes-WD-BLACK-PROJECTS-Autodarts-autodarts-tools-wxt/be62af52-e872-4b28-afd4-31793b29fd62/scratchpad`. Extension tests live in `$SCR/tests/*.test.mts`, not in the repo, since the repo has no test framework. Run them **with the repo as cwd** so `@/` resolves: `cd /Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt && node_modules/.bin/tsx --test $SCR/tests/<file>.test.mts`.
- Protocol version **1** in `socket/rooms.ts` and in `utils/team-room.ts`. Keep the two in step.
- Server limits:
  - 6 teams per owner, names 1–24 characters, at most 6 players and 6 seat ids per team
  - 8 accounts per room, 4 rooms per socket
  - claim keys of at most 200 characters, shifts within ±100
  - 8 KB per message, 30 messages per 10 s per socket
- Server lifetimes: a room lives 30 min after its last socket leaves and 12 h at most; a claim lives 10 min.
- Mirror `local:teams-room` entries live 24 h. The chip's *missing* state needs 10 s (`MISSING_AFTER_MS`).
- Server address: `ADT_TEAMS_SERVER` if set. Otherwise `http://localhost:4455` for `wxt` serve (dev), and `https://adt-socket.tobias-thiele.de` for builds.
- Config: `teams.online` defaults to `true`; `CONFIG_VERSION` goes 15 → 16, with migration 16 running `normalizeTeams`.
- The autodarts token never leaves the browser. The handshake sends `{ v, userId, name }`, read from the token locally.
- Every string a person reads comes from `t()`, in `locales/{en,de,nl}/teams.ts`, under `teams.online.*`. German says *du*, Dutch *je*. Use the site's words (`yarn i18n:site "…"`) and `locales/GLOSSARY.md`. Feature names: *Online Teams* (en), *Online-Teams* (de), *Online teams* (nl).
- Never deploy or touch `adt-socket.tobias-thiele.de` or Coolify. The user deploys when shipping. Develop against `bun run dev` in `socket/`.
- Live debugging uses two real accounts in two real browsers running the dev extension: the `yarn dev` Chrome as `creazy` (host), and the Firefox dev build (`npx wxt -b firefox --port 4001`) as `creazy_dev`. Credentials are in `.secrets/autodarts.env` (`AUTODARTS_EMAIL[_2]`, `AUTODARTS_PASSWORD[_2]`). Never print a password.
- **Browser safety:**
  - Before any source edit under `entrypoints/` or `utils/`, check `curl -s :9222/json/list`. If a tab you didn't open is on `/matches/`, do read-only work and wait.
  - Park your own match and lobby tabs at `about:blank` (from the attached session) before edits.
  - Back up `config-2-0-0` before writing test settings, and restore only the keys you changed.
- **Code style:**
  - Template-first SFCs.
  - In a `<script setup>`: imports, constants, refs, computed, lifecycle, then methods.
  - Comments in the files' existing voice: sentences that say why.
  - No literal text in templates or DOM writes.
  - No `Array.prototype.at` (Safari before iOS 15.4).

## Review Focus

1. **The step from lobby to match.** The lobby's client stops and the match's starts. Meanwhile, and whenever the server is down, the other team must still show, from the `local:teams-room` mirror alone. Test in Task 3: `screenTeams` with a room taken from the mirror and no live client gives the same teams.
2. **Two tabs of one account** (the host with the lobby open twice, or a reload during a claim). The room lists the account once. Teams from either tab replace the same owner's set, and a claim is granted once across both. Test in Task 1: two sockets of account A, `peers` lists A once, the second socket's claim is refused.
3. **Two teams with one name.** You saved "TEAM RED" and so did the other captain. Your screen keeps yours and drops theirs, never mixing their players into your shifts. Test in Task 3: a room team named like one of yours is not taken, and its shift is ignored.
4. **A member leaves mid-lobby.** An own-score team keeps its other members on every screen, rather than vanishing until its owner republishes. Test in Task 3: a room team with one seat missing from `players` is taken with the seats still present.
5. **Server restart mid-match.** The room is lost. Clients must rejoin and send their teams again without anyone touching the page. Test in Task 5: restart the server child process, and both clients' teams come back in `room:state`.

---

## File map

| File | Responsibility |
|---|---|
| `socket/rooms.ts` (new) | Pure room state: join and leave, teams per owner, shifts, the rule, claims, validation, expiry |
| `socket/rooms.test.ts` (new) | `bun test` for `rooms.ts` |
| `socket/index.ts` (rewrite) | socket.io wiring, origin check, rate limit, `/health`, sweep timer |
| `socket/Dockerfile`, `socket/docker-compose.yml`, `socket/.dockerignore` (new), `socket/README.md`, `socket/package.json` | Running and deploying the server |
| `utils/team-room.ts` (new) | Pure Online Teams rules: protocol types, mirror store, `myRoomTeams`, trust, `screenTeams`, `roomStatus`, `shouldJoin`, `undoActor` |
| `utils/team-room-client.ts` (new) | `RoomClient`, the socket.io client per page script; `tokenIdentity` |
| `utils/team-room-mirror.ts` (new) | `mirrorRoom(state)`: writes a room state into `local:teams-room` |
| `utils/teams.ts` | `TeamsConfig.online`; `normalizeTeams` fills it; `CallContext.remoteShared` |
| `utils/storage.ts` | `teams.online`, migration 16, `AutodartsToolsTeamRoom` |
| `utils/selectors.ts` | `lobby.playerLinkButton` (the 🌐) |
| `wxt.config.ts` | `__ADT_TEAMS_SERVER__` |
| `utils/websocket-helpers.ts` | The team view's lineup through `screenTeams` |
| `utils/team-calls.ts` | The Caller's context through `screenTeams` |
| `entrypoints/lobby.content/teams.ts` | Every participant; merged teams; publishing; other accounts' rows; chip, Invite a team, invitation |
| `entrypoints/lobby.content/TeamRoomStatus.vue` (new) | The status chip and its card |
| `entrypoints/lobby.content/TeamInvite.vue` (new) | The invitation above the Players card |
| `entrypoints/lobby.content/local-lobby.ts` | Leaves other accounts' team seats alone |
| `entrypoints/match.content/teams.ts` | Merged teams; taps on your own teams only; shifts published; claim-gated undo; offline badge |
| `entrypoints/match.content/TeamsPill.vue`, `utils/teams-pill.ts` | `PillView.offline` and its badge |
| `components/Settings/Teams.vue` | The Online Teams row |
| `locales/{en,de,nl}/teams.ts`, `locales/same-as-english.json` | `teams.online.*` |
| `README.md`, `CHANGELOG.md` | Online Teams, and what it shares |

---

### Task 1: Team room state (`socket/rooms.ts`)

**Files:**
- Create: `socket/rooms.ts`
- Create: `socket/rooms.test.ts`
- Modify: `socket/package.json` (add `"test": "bun test"`)

**Interfaces:**
- Produces:
  - `PROTOCOL_VERSION = 1`, `LIMITS`, `ROOM_IDLE_MS`, `ROOM_MAX_MS`, `CLAIM_TTL_MS`
  - types `Colour`, `RoomTeamInput`, `RoomTeam`, `RoomShift`, `RoomRule`, `RoomPeer`, `RoomState`, `Result<T>`
  - `isId(v)`, `parsePeer(raw): RoomPeer | undefined`, `parseTeams(raw): Result<RoomTeamInput[]>`
  - `class Rooms(now?: () => number)` with:
    - `join(lobbyId, socketId, peer): Result<RoomState>`
    - `leave(lobbyId, socketId): RoomState | undefined`
    - `leaveAll(socketId): RoomState[]`
    - `roomsOf(socketId): string[]`
    - `setTeams(lobbyId, socketId, raw): Result<RoomState>`
    - `setShift(lobbyId, socketId, raw): Result<RoomState>`
    - `setRule(lobbyId, socketId, raw): Result<RoomState>`
    - `claim(lobbyId, socketId, key): Result<boolean>`
    - `state(lobbyId): RoomState | undefined`
    - `sweep(): number`
    - `counts(): { rooms; sockets }`

- [ ] **Step 1: Write the failing tests**

Create `socket/rooms.test.ts`:

```ts
import { describe, expect, test } from "bun:test";

import { CLAIM_TTL_MS, LIMITS, ROOM_IDLE_MS, ROOM_MAX_MS, Rooms, parsePeer, parseTeams } from "./rooms";

const LOBBY = "01a10312-5fd9-7b43-88ab-73ac80cb938e";
const A = { userId: "5e1f2afd-6ac0-4fb0-b98a-cb9cf2811917", name: "creazy" };
const B = { userId: "39a06afc-edfd-4a82-b1af-5155a475fa37", name: "creazy_dev" };
const SEAT_RED = "01a10312-0000-7000-8000-000000000001";
const SEAT_BLUE = "01a10312-0000-7000-8000-000000000002";
const crimson = { preset: "crimson", from: "#6a1624", to: "#b8323f" };
const ocean = { preset: "ocean", from: "#374c98", to: "#0b55df" };
const red = { name: "TEAM RED", colour: crimson, format: "shared", seatIds: [ SEAT_RED ], players: [ "ANNA", "TOM" ] };
const blue = { name: "TEAM BLUE", colour: ocean, format: "shared", seatIds: [ SEAT_BLUE ], players: [ "LISA", "MAX" ] };

const lobby = (i: number) => `${String(i).padStart(8, "0")}-1111-4000-8000-000000000000`;
const user = (i: number) => ({ userId: `${String(i).padStart(8, "0")}-2222-4000-8000-000000000000`, name: `p${i}` });

function setup() {
  let now = 1_000_000;
  return { rooms: new Rooms(() => now), tick: (ms: number) => { now += ms; } };
}

function value<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new Error(`expected ok, got ${result.error}`);
  return result.value;
}

describe("join", () => {
  test("lists each account once, however many sockets it has", () => {
    const { rooms } = setup();
    value(rooms.join(LOBBY, "a1", A));
    value(rooms.join(LOBBY, "a2", A));
    const state = value(rooms.join(LOBBY, "b1", B));
    expect(state.peers.map(peer => peer.name)).toEqual([ "creazy", "creazy_dev" ]);
  });

  test("refuses a lobby id that isn't a UUID", () => {
    expect(setup().rooms.join("nope", "a1", A)).toEqual({ ok: false, error: "lobby" });
  });

  test("caps the rooms per socket and the accounts per room", () => {
    const { rooms } = setup();
    for (let i = 0; i < LIMITS.roomsPerSocket; i++) value(rooms.join(lobby(i), "a1", A));
    expect(rooms.join(lobby(99), "a1", A)).toEqual({ ok: false, error: "rooms" });
    for (let i = 0; i < LIMITS.peersPerRoom; i++) value(rooms.join(LOBBY, `s${i}`, user(i)));
    expect(rooms.join(LOBBY, "late", user(99))).toEqual({ ok: false, error: "full" });
    // An account already in the room still gets in on another socket.
    value(rooms.join(LOBBY, "s0-again", user(0)));
  });
});

describe("teams", () => {
  test("are stamped with the sender and replace only the sender's", () => {
    const { rooms } = setup();
    rooms.join(LOBBY, "a1", A);
    rooms.join(LOBBY, "b1", B);
    value(rooms.setTeams(LOBBY, "a1", [ red ]));
    value(rooms.setTeams(LOBBY, "b1", [ blue ]));
    const state = value(rooms.setTeams(LOBBY, "a1", [ { ...red, players: [ "TOM", "ANNA" ] } ]));
    expect(state.teams.map(team => [ team.owner, team.name, team.players.join() ])).toEqual([
      [ A.userId, "TEAM RED", "TOM,ANNA" ],
      [ B.userId, "TEAM BLUE", "LISA,MAX" ],
    ]);
  });

  test("an empty list takes the sender's teams out", () => {
    const { rooms } = setup();
    rooms.join(LOBBY, "a1", A);
    rooms.setTeams(LOBBY, "a1", [ red ]);
    expect(value(rooms.setTeams(LOBBY, "a1", [])).teams).toEqual([]);
  });

  test("are refused from a socket that isn't in the room", () => {
    const { rooms } = setup();
    rooms.join(LOBBY, "a1", A);
    expect(rooms.setTeams(LOBBY, "b1", [ blue ])).toEqual({ ok: false, error: "room" });
  });

  test("are checked: colours, seat ids, counts, lengths, duplicates", () => {
    expect(parseTeams([ { ...red, colour: { ...crimson, from: "red" } } ]).ok).toBe(false);
    expect(parseTeams([ { ...red, seatIds: [ "seat-1" ] } ]).ok).toBe(false);
    expect(parseTeams([ { ...red, seatIds: [] } ]).ok).toBe(false);
    expect(parseTeams([ { ...red, format: "mixed" } ]).ok).toBe(false);
    expect(parseTeams([ { ...red, name: "X".repeat(LIMITS.nameLength + 1) } ]).ok).toBe(false);
    expect(parseTeams([ { ...red, players: Array(LIMITS.playersPerTeam + 1).fill("ANNA") } ]).ok).toBe(false);
    expect(parseTeams([ red, red ]).ok).toBe(false);
    expect(parseTeams(Array.from({ length: LIMITS.teamsPerOwner + 1 }, (_, i) => ({ ...red, name: `T${i}` }))).ok).toBe(false);
    expect(parseTeams("teams").ok).toBe(false);
    expect(parseTeams([ red, blue ])).toEqual({ ok: true, value: [ red, blue ] });
  });
});

describe("shifts", () => {
  test("only for a team the sender owns, and within range", () => {
    const { rooms } = setup();
    rooms.join(LOBBY, "a1", A);
    rooms.join(LOBBY, "b1", B);
    rooms.setTeams(LOBBY, "a1", [ red ]);
    rooms.setTeams(LOBBY, "b1", [ blue ]);
    expect(value(rooms.setShift(LOBBY, "a1", { team: "TEAM RED", shift: 1 })).shifts).toEqual([ { owner: A.userId, team: "TEAM RED", shift: 1 } ]);
    expect(rooms.setShift(LOBBY, "a1", { team: "TEAM BLUE", shift: 1 })).toEqual({ ok: false, error: "owner" });
    expect(rooms.setShift(LOBBY, "a1", { team: "TEAM RED", shift: LIMITS.maxShift + 1 })).toEqual({ ok: false, error: "shift" });
    expect(rooms.setShift(LOBBY, "a1", { team: "TEAM RED", shift: 0.5 })).toEqual({ ok: false, error: "shift" });
  });

  test("go with their team", () => {
    const { rooms } = setup();
    rooms.join(LOBBY, "a1", A);
    rooms.setTeams(LOBBY, "a1", [ red ]);
    rooms.setShift(LOBBY, "a1", { team: "TEAM RED", shift: 1 });
    expect(value(rooms.setTeams(LOBBY, "a1", [])).shifts).toEqual([]);
  });
});

describe("rule", () => {
  test("keeps who said it", () => {
    const { rooms } = setup();
    rooms.join(LOBBY, "b1", B);
    expect(value(rooms.setRule(LOBBY, "b1", { partnerRule: true })).rule).toEqual({ by: B.userId, partnerRule: true });
    expect(rooms.setRule(LOBBY, "b1", { partnerRule: "yes" })).toEqual({ ok: false, error: "rule" });
  });
});

describe("claims", () => {
  test("the first one wins, across sockets and accounts", () => {
    const { rooms } = setup();
    rooms.join(LOBBY, "a1", A);
    rooms.join(LOBBY, "a2", A);
    rooms.join(LOBBY, "b1", B);
    expect(rooms.claim(LOBBY, "a1", "undo|m|d1")).toEqual({ ok: true, value: true });
    expect(rooms.claim(LOBBY, "a2", "undo|m|d1")).toEqual({ ok: true, value: false });
    expect(rooms.claim(LOBBY, "b1", "undo|m|d1")).toEqual({ ok: true, value: false });
    expect(rooms.claim(LOBBY, "b1", "")).toEqual({ ok: false, error: "key" });
    expect(rooms.claim(LOBBY, "b1", "k".repeat(LIMITS.claimKeyLength + 1))).toEqual({ ok: false, error: "key" });
  });

  test("expire", () => {
    const { rooms, tick } = setup();
    rooms.join(LOBBY, "a1", A);
    rooms.claim(LOBBY, "a1", "k");
    tick(CLAIM_TTL_MS + 1);
    rooms.sweep();
    expect(rooms.claim(LOBBY, "a1", "k")).toEqual({ ok: true, value: true });
  });
});

describe("leaving and expiry", () => {
  test("a socket that leaves takes its peer out but leaves its teams", () => {
    const { rooms } = setup();
    rooms.join(LOBBY, "a1", A);
    rooms.join(LOBBY, "b1", B);
    rooms.setTeams(LOBBY, "b1", [ blue ]);
    const [ state ] = rooms.leaveAll("b1");
    expect(state.peers.map(peer => peer.name)).toEqual([ "creazy" ]);
    expect(state.teams.map(team => team.name)).toEqual([ "TEAM BLUE" ]);
  });

  test("an empty room lasts ROOM_IDLE_MS, then goes", () => {
    const { rooms, tick } = setup();
    rooms.join(LOBBY, "a1", A);
    rooms.setTeams(LOBBY, "a1", [ red ]);
    rooms.leave(LOBBY, "a1");
    tick(ROOM_IDLE_MS - 1);
    expect(rooms.sweep()).toBe(0);
    expect(value(rooms.join(LOBBY, "a2", A)).teams.map(team => team.name)).toEqual([ "TEAM RED" ]);
    rooms.leave(LOBBY, "a2");
    tick(ROOM_IDLE_MS + 1);
    expect(rooms.sweep()).toBe(1);
    expect(rooms.state(LOBBY)).toBeUndefined();
  });

  test("no room outlives ROOM_MAX_MS", () => {
    const { rooms, tick } = setup();
    rooms.join(LOBBY, "a1", A);
    tick(ROOM_MAX_MS + 1);
    expect(rooms.sweep()).toBe(1);
    expect(rooms.counts()).toEqual({ rooms: 0, sockets: 0 });
  });
});

describe("peers", () => {
  test("need a UUID and a name", () => {
    expect(parsePeer({ userId: A.userId, name: "creazy" })).toEqual(A);
    expect(parsePeer({ userId: "x", name: "creazy" })).toBeUndefined();
    expect(parsePeer({ userId: A.userId, name: " " })).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `cd socket && bun test`
Expected: FAIL, with `Cannot find module './rooms'` (or a similar resolve error).

- [ ] **Step 3: Write `socket/rooms.ts`**

```ts
/**
 * Online Teams' rooms: one per autodarts lobby (its match keeps the lobby's
 * id), holding each account's teams while the lobby and its match last.
 *
 * Pure: no sockets and no timers of its own. index.ts wires it to socket.io
 * and sweeps it once a minute. The extension's side is utils/team-room.ts;
 * keep PROTOCOL_VERSION and the shapes below in step with it.
 *
 * The server can't tell who anyone is (there are no logins), so it only keeps
 * each account to its own entries: a socket names its account once, at
 * connect, and can only write that account's teams and shifts. Whether a team
 * may be shown at all is each screen's call, from autodarts' own data.
 */

export const PROTOCOL_VERSION = 1;

export const LIMITS = {
  teamsPerOwner: 6,
  nameLength: 24,
  playersPerTeam: 6,
  seatsPerTeam: 6,
  peersPerRoom: 8,
  roomsPerSocket: 4,
  claimKeyLength: 200,
  maxShift: 100,
} as const;

/** An empty room waits this long: a reload, or the step from lobby to match, comes back well within it. */
export const ROOM_IDLE_MS = 30 * 60 * 1000;
/** No room outlives this, busy or not. */
export const ROOM_MAX_MS = 12 * 60 * 60 * 1000;
/** A claim is only needed while its visit is on screen. */
export const CLAIM_TTL_MS = 10 * 60 * 1000;

export type TeamFormat = "shared" | "own";
export interface Colour { preset: string; from: string; to: string }
export interface RoomTeamInput { name: string; colour: Colour; format: TeamFormat; seatIds: string[]; players: string[] }
export interface RoomTeam extends RoomTeamInput { owner: string }
export interface RoomShift { owner: string; team: string; shift: number }
export interface RoomRule { by: string; partnerRule: boolean }
export interface RoomPeer { userId: string; name: string }
export interface RoomState { lobbyId: string; teams: RoomTeam[]; shifts: RoomShift[]; rule?: RoomRule; peers: RoomPeer[] }

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX = /^#[0-9a-f]{6}$/i;

export function isId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

function text(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= max ? trimmed : undefined;
}

/** Who a socket says it is, at connect. */
export function parsePeer(raw: unknown): RoomPeer | undefined {
  const value = (raw ?? {}) as Record<string, unknown>;
  const name = text(value.name, 64);
  return isId(value.userId) && name ? { userId: value.userId, name } : undefined;
}

function parseColour(raw: unknown): Colour | undefined {
  const value = (raw ?? {}) as Record<string, unknown>;
  const preset = text(value.preset, 24);
  if (!preset || typeof value.from !== "string" || typeof value.to !== "string") return undefined;
  return HEX.test(value.from) && HEX.test(value.to) ? { preset, from: value.from, to: value.to } : undefined;
}

function parseTeam(raw: unknown): RoomTeamInput | undefined {
  const value = (raw ?? {}) as Record<string, unknown>;
  const name = text(value.name, LIMITS.nameLength);
  const colour = parseColour(value.colour);
  const format = value.format === "shared" || value.format === "own" ? value.format : undefined;
  if (!name || !colour || !format || !Array.isArray(value.seatIds) || !Array.isArray(value.players)) return undefined;
  const seatIds = value.seatIds as unknown[];
  if (!seatIds.length || seatIds.length > LIMITS.seatsPerTeam || !seatIds.every(isId)) return undefined;
  if (value.players.length > LIMITS.playersPerTeam) return undefined;
  const players = value.players.map(player => text(player, LIMITS.nameLength));
  if (players.some(player => !player)) return undefined;
  return { name, colour, format, seatIds: seatIds as string[], players: players as string[] };
}

/** An account's teams for a room: all of them valid, or none taken. */
export function parseTeams(raw: unknown): Result<RoomTeamInput[]> {
  if (!Array.isArray(raw) || raw.length > LIMITS.teamsPerOwner) return { ok: false, error: "teams" };
  const teams: RoomTeamInput[] = [];
  for (const entry of raw) {
    const team = parseTeam(entry);
    if (!team || teams.some(other => other.name === team.name)) return { ok: false, error: "teams" };
    teams.push(team);
  }
  return { ok: true, value: teams };
}

interface Room {
  id: string;
  createdAt: number;
  /** When the last socket left; undefined while anyone is in. */
  emptySince?: number;
  /** Per owner, that account's teams. */
  teams: Map<string, RoomTeam[]>;
  /** Per "owner|team". */
  shifts: Map<string, RoomShift>;
  rule?: RoomRule;
  claims: Map<string, { by: string; at: number }>;
  /** Per socket id, the account it named at connect. */
  sockets: Map<string, RoomPeer>;
}

export class Rooms {
  private readonly rooms = new Map<string, Room>();

  constructor(private readonly now: () => number = Date.now) {}

  join(lobbyId: unknown, socketId: string, peer: RoomPeer): Result<RoomState> {
    if (!isId(lobbyId)) return { ok: false, error: "lobby" };
    if (this.roomsOf(socketId).filter(id => id !== lobbyId).length >= LIMITS.roomsPerSocket) return { ok: false, error: "rooms" };
    let room = this.rooms.get(lobbyId);
    if (!room) {
      room = { id: lobbyId, createdAt: this.now(), teams: new Map(), shifts: new Map(), claims: new Map(), sockets: new Map() };
      this.rooms.set(lobbyId, room);
    }
    const accounts = new Set([ ...room.sockets.values() ].map(other => other.userId));
    if (!accounts.has(peer.userId) && accounts.size >= LIMITS.peersPerRoom) return { ok: false, error: "full" };
    room.sockets.set(socketId, peer);
    room.emptySince = undefined;
    return { ok: true, value: this.stateOf(room) };
  }

  leave(lobbyId: string, socketId: string): RoomState | undefined {
    const room = this.rooms.get(lobbyId);
    if (!room?.sockets.delete(socketId)) return undefined;
    if (!room.sockets.size) room.emptySince = this.now();
    return this.stateOf(room);
  }

  /** A socket gone: out of every room it was in, each room's new state returned for the others. */
  leaveAll(socketId: string): RoomState[] {
    return this.roomsOf(socketId)
      .map(id => this.leave(id, socketId))
      .filter((state): state is RoomState => Boolean(state));
  }

  roomsOf(socketId: string): string[] {
    return [ ...this.rooms.values() ].filter(room => room.sockets.has(socketId)).map(room => room.id);
  }

  setTeams(lobbyId: unknown, socketId: string, raw: unknown): Result<RoomState> {
    const room = this.memberRoom(lobbyId, socketId);
    if (!room) return { ok: false, error: "room" };
    const parsed = parseTeams(raw);
    if (!parsed.ok) return parsed;
    const owner = room.sockets.get(socketId)!.userId;
    const teams = parsed.value.map(team => ({ ...team, owner }));
    if (teams.length) room.teams.set(owner, teams);
    else room.teams.delete(owner);
    // A shift for a team its owner no longer has goes with it.
    for (const [ key, shift ] of room.shifts) {
      if (shift.owner === owner && !teams.some(team => team.name === shift.team)) room.shifts.delete(key);
    }
    return { ok: true, value: this.stateOf(room) };
  }

  setShift(lobbyId: unknown, socketId: string, raw: unknown): Result<RoomState> {
    const room = this.memberRoom(lobbyId, socketId);
    if (!room) return { ok: false, error: "room" };
    const value = (raw ?? {}) as Record<string, unknown>;
    const team = text(value.team, LIMITS.nameLength);
    const shift = value.shift;
    if (!team || typeof shift !== "number" || !Number.isInteger(shift) || Math.abs(shift) > LIMITS.maxShift) return { ok: false, error: "shift" };
    const owner = room.sockets.get(socketId)!.userId;
    if (!(room.teams.get(owner) ?? []).some(candidate => candidate.name === team)) return { ok: false, error: "owner" };
    room.shifts.set(`${owner}|${team}`, { owner, team, shift });
    return { ok: true, value: this.stateOf(room) };
  }

  setRule(lobbyId: unknown, socketId: string, raw: unknown): Result<RoomState> {
    const room = this.memberRoom(lobbyId, socketId);
    if (!room) return { ok: false, error: "room" };
    const value = (raw ?? {}) as Record<string, unknown>;
    if (typeof value.partnerRule !== "boolean") return { ok: false, error: "rule" };
    // Whether its author is the lobby's host is each screen's call: they know the host from autodarts.
    room.rule = { by: room.sockets.get(socketId)!.userId, partnerRule: value.partnerRule };
    return { ok: true, value: this.stateOf(room) };
  }

  /** The first to claim a key gets it; everyone after, the same socket included, is told no. */
  claim(lobbyId: unknown, socketId: string, key: unknown): Result<boolean> {
    const room = this.memberRoom(lobbyId, socketId);
    if (!room) return { ok: false, error: "room" };
    if (typeof key !== "string" || !key || key.length > LIMITS.claimKeyLength) return { ok: false, error: "key" };
    if (room.claims.has(key)) return { ok: true, value: false };
    room.claims.set(key, { by: room.sockets.get(socketId)!.userId, at: this.now() });
    return { ok: true, value: true };
  }

  state(lobbyId: string): RoomState | undefined {
    const room = this.rooms.get(lobbyId);
    return room && this.stateOf(room);
  }

  /** Drops old claims, rooms nobody came back to, and rooms past their life; returns how many rooms went. */
  sweep(): number {
    const now = this.now();
    let dropped = 0;
    for (const [ id, room ] of this.rooms) {
      for (const [ key, claim ] of room.claims) {
        if (now - claim.at > CLAIM_TTL_MS) room.claims.delete(key);
      }
      const idle = room.emptySince !== undefined && now - room.emptySince > ROOM_IDLE_MS;
      if (idle || now - room.createdAt > ROOM_MAX_MS) {
        this.rooms.delete(id);
        dropped++;
      }
    }
    return dropped;
  }

  counts(): { rooms: number; sockets: number } {
    const sockets = new Set<string>();
    for (const room of this.rooms.values()) for (const id of room.sockets.keys()) sockets.add(id);
    return { rooms: this.rooms.size, sockets: sockets.size };
  }

  private memberRoom(lobbyId: unknown, socketId: string): Room | undefined {
    const room = isId(lobbyId) ? this.rooms.get(lobbyId) : undefined;
    return room?.sockets.has(socketId) ? room : undefined;
  }

  private stateOf(room: Room): RoomState {
    const peers = new Map<string, RoomPeer>();
    for (const peer of room.sockets.values()) peers.set(peer.userId, peer);
    return {
      lobbyId: room.id,
      teams: [ ...room.teams.values() ].flat(),
      shifts: [ ...room.shifts.values() ],
      ...(room.rule ? { rule: room.rule } : {}),
      peers: [ ...peers.values() ],
    };
  }
}
```

Add `"test": "bun test"` to the `scripts` in `socket/package.json`.

- [ ] **Step 4: Run the tests to see them pass**

Run: `cd socket && bun test`
Expected: PASS, every test in `rooms.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add socket/rooms.ts socket/rooms.test.ts socket/package.json
git commit -m "feat: the team room's state for Online Teams, pure and tested"
```

---

### Task 2: The server (`socket/index.ts`), health and deployment files

**Files:**
- Rewrite: `socket/index.ts`
- Create: `socket/Dockerfile`, `socket/docker-compose.yml`, `socket/.dockerignore`
- Modify: `socket/README.md`
- Test: `$SCR/tests/server-smoke.test.mts` (tsx, uses the repo's `socket.io-client`)

**Interfaces:**
- Consumes: `Rooms`, `PROTOCOL_VERSION`, `parsePeer` (Task 1).
- Produces:
  - **Handshake:** `auth: { v, userId, name }`, refused with `connect_error` message `"version"` or `"identity"`.
  - **Events with acks:** `room:join {lobbyId}` → `{ok, value: RoomState}`; `room:leave {lobbyId}` → `{ok}`; `room:teams {lobbyId, teams}`, `room:shift {lobbyId, team, shift}`, `room:rule {lobbyId, partnerRule}` → `{ok, value: RoomState}`; `room:claim {lobbyId, key}` → `{ok, value: boolean}`; `room:ping` → `{ok}`.
  - **Broadcast:** `room:state` (`RoomState`) to the room after every change.
  - **Errors:** `{ok: false, error}`, where error is `"rate"`, `"room"`, `"lobby"`, `"teams"`, `"shift"`, `"owner"`, `"rule"`, `"key"`, `"rooms"` or `"full"`.
  - `GET /health` → `200 {"ok":true,"version":1,"rooms":n,"sockets":n}`.

- [ ] **Step 1: Write the failing smoke test**

Create `$SCR/tests/server-smoke.test.mts`:

```ts
import { spawn, type ChildProcess } from "node:child_process";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";

import { io, type Socket } from "socket.io-client";

const PORT = 4467;
const URL = `http://localhost:${PORT}`;
const LOBBY = "01a10312-5fd9-7b43-88ab-73ac80cb938e";
const A = { userId: "5e1f2afd-6ac0-4fb0-b98a-cb9cf2811917", name: "creazy" };
const B = { userId: "39a06afc-edfd-4a82-b1af-5155a475fa37", name: "creazy_dev" };
const red = { name: "TEAM RED", colour: { preset: "crimson", from: "#6a1624", to: "#b8323f" }, format: "shared", seatIds: [ "01a10312-0000-7000-8000-000000000001" ], players: [ "ANNA", "TOM" ] };

let server: ChildProcess;

async function waitForHealth() {
  for (let i = 0; i < 50; i++) {
    try {
      const response = await fetch(`${URL}/health`);
      if (response.ok) return response.json();
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error("server did not start");
}

function client(auth: object): Socket {
  return io(URL, { transports: [ "websocket" ], auth, reconnection: false, forceNew: true });
}

const connected = (socket: Socket) => new Promise<void>((resolve, reject) => {
  socket.once("connect", () => resolve());
  socket.once("connect_error", reject);
});
const ask = (socket: Socket, event: string, payload?: object) => new Promise<any>(resolve => socket.emit(event, payload, resolve));

before(async () => {
  server = spawn("bun", [ "run", "index.ts" ], { cwd: "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/socket", env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
  await waitForHealth();
});
after(() => server.kill());

test("health answers with the protocol version", async () => {
  assert.deepEqual(await waitForHealth(), { ok: true, version: 1, rooms: 0, sockets: 0 });
});

test("a client of another protocol version is refused with 'version'", async () => {
  const socket = client({ v: 2, ...A });
  await assert.rejects(connected(socket), (error: Error) => error.message === "version");
  socket.close();
});

test("a client with no identity is refused with 'identity'", async () => {
  const socket = client({ v: 1, userId: "nope", name: "x" });
  await assert.rejects(connected(socket), (error: Error) => error.message === "identity");
  socket.close();
});

test("teams reach the other account, and a claim is granted once", async () => {
  const a = client({ v: 1, ...A });
  const b = client({ v: 1, ...B });
  await Promise.all([ connected(a), connected(b) ]);
  assert.equal((await ask(a, "room:join", { lobbyId: LOBBY })).ok, true);
  assert.equal((await ask(b, "room:join", { lobbyId: LOBBY })).ok, true);
  const seen = new Promise<any>(resolve => b.on("room:state", (state) => {
    if (state.teams.length) resolve(state);
  }));
  assert.equal((await ask(a, "room:teams", { lobbyId: LOBBY, teams: [ red ] })).ok, true);
  const state = await seen;
  assert.deepEqual(state.teams.map((team: any) => [ team.owner, team.name ]), [ [ A.userId, "TEAM RED" ] ]);
  assert.deepEqual(state.peers.map((peer: any) => peer.name).sort(), [ "creazy", "creazy_dev" ]);
  assert.deepEqual(await ask(b, "room:claim", { lobbyId: LOBBY, key: "undo|m|d" }), { ok: true, value: true });
  assert.deepEqual(await ask(a, "room:claim", { lobbyId: LOBBY, key: "undo|m|d" }), { ok: true, value: false });
  assert.deepEqual(await ask(a, "room:ping"), { ok: true });
  a.close();
  b.close();
});

test("a browser page on another site is turned away", async () => {
  const socket = io(URL, { transports: [ "websocket" ], auth: { v: 1, ...A }, reconnection: false, forceNew: true, extraHeaders: { Origin: "https://evil.example" } });
  await assert.rejects(connected(socket));
  socket.close();
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd /Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt && node_modules/.bin/tsx --test $SCR/tests/server-smoke.test.mts`
Expected: FAIL. The old `index.ts` answers `/health` with 404 (`server did not start`), or the refusal tests fail.

- [ ] **Step 3: Rewrite `socket/index.ts`**

```ts
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
 * run) and the extensions themselves. A client with no Origin at all (a script,
 * a test) is let through: it could claim any origin anyway.
 */
const ORIGINS = [
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
    callback(null, !origin || ORIGINS.some(pattern => pattern.test(origin)));
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
  socket.on("room:ping", (ack?: Ack) => {
    if (typeof ack === "function") ack({ ok: true });
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
```

Note: `room:ping` is answered with `{ ok: true }` and no `value`. The smoke test asserts exactly that.

- [ ] **Step 4: Run the smoke test and the unit tests**

Run: `cd /Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt && node_modules/.bin/tsx --test $SCR/tests/server-smoke.test.mts && (cd socket && bun test)`
Expected: PASS for all of them. If the origin test fails because Node's client can't set `Origin` through `extraHeaders`, check `allowRequest` directly instead: run `curl -s -o /dev/null -w "%{http_code}" -H "Origin: https://evil.example" -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw==" "http://localhost:4467/socket.io/?EIO=4&transport=websocket"` while the server runs. Expect `403`.

- [ ] **Step 5: Deployment files and README**

`socket/Dockerfile`:

```dockerfile
FROM oven/bun:1.3-alpine
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY rooms.ts index.ts tsconfig.json ./
ENV PORT=4455
EXPOSE 4455
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1:4455/health || exit 1
USER bun
CMD ["bun", "run", "index.ts"]
```

`socket/.dockerignore`:

```
node_modules
*.test.ts
```

`socket/docker-compose.yml` (Coolify. Per the user's note, every proxied service names the `coolify` network for Traefik):

```yaml
services:
  socket:
    build: .
    restart: unless-stopped
    environment:
      - SERVICE_FQDN_SOCKET_4455
      - PORT=4455
    networks:
      - default
      - coolify
    labels:
      - "traefik.docker.network=coolify"
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:4455/health"]
      interval: 30s
      timeout: 3s
      retries: 3

networks:
  coolify:
    external: true
```

`socket/README.md`: replace its body with:

````markdown
# Online Teams server

The team room for Tools for Autodarts' Online Teams: one room per autodarts
lobby, held in memory while the lobby and its match last. It shares each
account's teams (names, players, order, colours), tap-to-correct, the host's
partner rule and one-time claims between the Tools in a lobby. Darts and
scores stay with autodarts. Protocol version 1; the extension's side is
`utils/team-room.ts`.

```bash
bun install
bun run dev      # http://localhost:4455, what `yarn dev` builds talk to
bun test         # rooms.ts
```

`GET /health` answers `{"ok":true,"version":1,"rooms":n,"sockets":n}`.

## Deploying

`docker-compose.yml` is set up for Coolify: set the domain on the `socket`
service (store builds talk to `https://adt-socket.tobias-thiele.de`), and keep
the `coolify` network and its `traefik.docker.network` label, or Traefik picks
a network at random and answers 504s.
````

- [ ] **Step 6: Run the server locally for the rest of the work**

Run it in the background (Bash `run_in_background: true`): `cd /Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/socket && bun run dev`. Then run `curl -s localhost:4455/health`.
Expected: `{"ok":true,"version":1,"rooms":0,"sockets":0}`.

- [ ] **Step 7: Commit**

```bash
git add socket/index.ts socket/Dockerfile socket/.dockerignore socket/docker-compose.yml socket/README.md
git commit -m "feat: the Online Teams server: team rooms over socket.io, health check and deployment files"
```

---

### Task 3: The Online Teams rules (`utils/team-room.ts`)

**Files:**
- Create: `utils/team-room.ts`
- Test: `$SCR/tests/team-room.test.mts`

**Interfaces:**
- Consumes (from `utils/teams.ts`, unchanged): `findTeam`, `isHostedGuest`, `normalizeColour`, `normalizeName`, `sharedTeams`, `teamSeats`; types `Lineup`, `LineupTeam`, `SavedTeam`, `SeatLike`, `TeamFormat`, `TeamShifts`.
- Produces:
  - **Constants:** `PROTOCOL_VERSION = 1`, `ROOM_TTL_MS`, `MISSING_AFTER_MS = 10_000`.
  - **Types:** `RoomTeamInput`, `RoomTeam`, `RoomShift`, `RoomRule`, `RoomPeer`, `RoomState`, `RoomMirror`, `RoomStore`, `RoomSeat`, `ScreenInput`, `ScreenTeams`, `StatusInput`, `StatusKind`, `RoomStatus`, and `UndoActor` (`"legacy" | "own" | "fallback" | "none"`).
  - **Union:** `Connection = "idle" | "connecting" | "connected" | "offline" | "outdated"`.
  - **Mirror:** `withRoom(store, state, now): RoomStore`, `roomOf(store, id): RoomMirror | undefined`.
  - **Seats and teams:** `seatOwner(seat): string | undefined`, `myRoomTeams(players, saved, lineup, me): RoomTeamInput[]`, `screenTeams(input: ScreenInput): ScreenTeams`, `otherAccounts(players, me): RoomPeer[]`.
  - **Status and joining:** `roomStatus(input: StatusInput): RoomStatus`, `shouldJoin(players, myTeams, me): boolean`.
  - **Undo:** `undoActor(seat, me, room, hostId): UndoActor`, `undoKey(matchId, dartIds): string`.
  - **Token:** `tokenAccount(token): { userId: string; name: string } | null`, which reads a JWT's `sub` and `preferred_username` and nothing else.

- [ ] **Step 1: Write the failing tests**

Create `$SCR/tests/team-room.test.mts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";

import { MISSING_AFTER_MS, ROOM_TTL_MS, myRoomTeams, otherAccounts, roomOf, roomStatus, screenTeams, shouldJoin, tokenAccount, undoActor, undoKey, withRoom } from "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/utils/team-room.ts";

const A = "5e1f2afd-6ac0-4fb0-b98a-cb9cf2811917"; // creazy, the lobby's host
const B = "39a06afc-edfd-4a82-b1af-5155a475fa37"; // creazy_dev
const C = "cccccccc-0000-4000-8000-000000000003"; // a friend without Tools
const LOBBY = "01a10312-5fd9-7b43-88ab-73ac80cb938e";
const crimson = { preset: "crimson", from: "#6a1624", to: "#b8323f" };
const ocean = { preset: "ocean", from: "#374c98", to: "#0b55df" };

const seat = (id: string, name: string, extra: Record<string, unknown> = {}): any => ({ id, name, userId: null, hostId: null, cpuPPR: null, ...extra });
const RED_SEAT = seat("01a10312-0000-7000-8000-000000000001", "TEAM RED", { hostId: A, host: { id: A, name: "creazy" } });
const BLUE_SEAT = seat("01a10312-0000-7000-8000-000000000002", "TEAM BLUE", { hostId: B, host: { id: B, name: "creazy_dev" } });
const RED: any = { name: "TEAM RED", players: [ "ANNA", "TOM" ], colour: crimson, format: "shared" };
const BLUE_ROOM: any = { owner: B, name: "TEAM BLUE", colour: ocean, format: "shared", seatIds: [ BLUE_SEAT.id ], players: [ "LISA", "MAX" ] };
const PEERS = [ { userId: A, name: "creazy" }, { userId: B, name: "creazy_dev" } ];
const room = (extra: Record<string, unknown> = {}): any => ({ lobbyId: LOBBY, teams: [ BLUE_ROOM ], shifts: [], peers: PEERS, ...extra });
const base = (extra: Record<string, unknown> = {}): any => ({ players: [ RED_SEAT, BLUE_SEAT ], saved: [ RED ], lineup: undefined, shifts: {}, room: room(), me: A, hostId: A, ...extra });

const ANNA = seat("01a10312-0000-7000-8000-00000000000a", "ANNA", { hostId: A });
const TOM = seat("01a10312-0000-7000-8000-00000000000b", "TOM", { hostId: A });
const LISA = seat("01a10312-0000-7000-8000-00000000000c", "LISA", { hostId: B });
const MAX = seat("01a10312-0000-7000-8000-00000000000d", "MAX", { hostId: B });
const FRIEND = seat("01a10312-0000-7000-8000-00000000000e", "FRIEND", { userId: C, hostId: C });
const RED_LINEUP: any = { at: 1, teams: [ { name: "TEAM RED", colour: crimson, seatIds: [ ANNA.id, TOM.id ] } ], partnerRule: true };
const BLUE_OWN: any = { owner: B, name: "TEAM BLUE", colour: ocean, format: "own", seatIds: [ LISA.id, MAX.id ], players: [ "LISA", "MAX" ] };

test("myRoomTeams: this account's shared guests named after a saved team, and its lineup's teams with the seats still here", () => {
  assert.deepEqual(myRoomTeams([ RED_SEAT, BLUE_SEAT ], [ RED ], undefined, A), [
    { name: "TEAM RED", colour: crimson, format: "shared", seatIds: [ RED_SEAT.id ], players: [ "ANNA", "TOM" ] },
  ]);
  assert.deepEqual(myRoomTeams([ ANNA, LISA ], [], RED_LINEUP, A), [
    { name: "TEAM RED", colour: crimson, format: "own", seatIds: [ ANNA.id ], players: [ "ANNA" ] },
  ]);
  assert.deepEqual(myRoomTeams([ RED_SEAT ], [ RED ], undefined, null), []);
  assert.deepEqual(myRoomTeams([ { ...RED_SEAT, hostId: B } ], [ RED ], undefined, A), [], "someone else's guest named like my team is not mine");
});

test("screenTeams: the other account's shared team joins this screen's, by seat", () => {
  const view = screenTeams(base());
  assert.deepEqual([ ...view.shared.entries() ].map(([ index, team ]) => [ index, team.name, team.players.join() ]), [ [ 0, "TEAM RED", "ANNA,TOM" ], [ 1, "TEAM BLUE", "LISA,MAX" ] ]);
  assert.deepEqual([ ...view.mine ], [ "TEAM RED" ]);
  assert.deepEqual(view.remote.map(team => team.name), [ "TEAM BLUE" ]);
});

test("screenTeams: the room is never believed about this account's seats, nor about a seat its owner doesn't host", () => {
  const grab = { ...BLUE_ROOM, name: "TEAM GRAB", seatIds: [ RED_SEAT.id ] };
  assert.deepEqual(screenTeams(base({ room: room({ teams: [ grab ] }) })).remote, []);
  const forged = { ...BLUE_ROOM, owner: C };
  assert.deepEqual(screenTeams(base({ room: room({ teams: [ forged ] }) })).remote, []);
  assert.deepEqual(screenTeams(base({ me: null })).remote, []);
});

test("screenTeams: a team named like one of this account's is not taken, nor its shift", () => {
  const twin = { ...BLUE_ROOM, name: "TEAM RED" };
  const blueAsRed = { ...BLUE_SEAT, name: "TEAM RED" };
  const view = screenTeams(base({ players: [ RED_SEAT, blueAsRed ], room: room({ teams: [ twin ], shifts: [ { owner: B, team: "TEAM RED", shift: 1 } ] }), shifts: { "TEAM RED": 0 } }));
  assert.deepEqual(view.remote, []);
  assert.deepEqual(view.shifts, { "TEAM RED": 0 });
});

test("screenTeams: own scores put the other account's team in the lineup, with the host's partner rule", () => {
  const players = [ ANNA, LISA, TOM, MAX ];
  const asHost = screenTeams(base({ players, saved: [], lineup: RED_LINEUP, room: room({ teams: [ BLUE_OWN ], rule: { by: B, partnerRule: false } }) }));
  assert.deepEqual(asHost.lineup?.teams.map(team => [ team.name, team.seatIds.length ]), [ [ "TEAM RED", 2 ], [ "TEAM BLUE", 2 ] ]);
  assert.equal(asHost.lineup?.partnerRule, true, "the host goes by its own lineup");
  const blueLineup: any = { at: 1, teams: [ { name: "TEAM BLUE", colour: ocean, seatIds: [ LISA.id, MAX.id ] } ] };
  const redOwn = { owner: A, name: "TEAM RED", colour: crimson, format: "own", seatIds: [ ANNA.id, TOM.id ], players: [ "ANNA", "TOM" ] };
  const asGuest = (rule?: object) => screenTeams(base({ players, saved: [], lineup: blueLineup, me: B, hostId: A, room: room({ teams: [ redOwn, BLUE_OWN ], ...(rule ? { rule } : {}) }) }));
  assert.deepEqual(asGuest({ by: A, partnerRule: true }).lineup?.teams.map(team => team.name), [ "TEAM BLUE", "TEAM RED" ]);
  assert.equal(asGuest({ by: A, partnerRule: true }).lineup?.partnerRule, true);
  assert.equal(asGuest({ by: B, partnerRule: true }).lineup?.partnerRule, false, "only the host's word counts");
  assert.equal(asGuest().lineup?.partnerRule, false);
});

test("screenTeams: a member who left drops out, and the rest of the team stays", () => {
  const view = screenTeams(base({ players: [ ANNA, LISA ], saved: [], room: room({ teams: [ BLUE_OWN ] }) }));
  assert.deepEqual(view.lineup?.teams, [ { name: "TEAM BLUE", colour: ocean, seatIds: [ LISA.id ] } ]);
});

test("screenTeams: a friend without Tools can be on another account's team; one whose Tools is in the room can't", () => {
  const withFriend = { ...BLUE_OWN, seatIds: [ LISA.id, FRIEND.id ] };
  assert.deepEqual(screenTeams(base({ players: [ ANNA, LISA, FRIEND ], saved: [], room: room({ teams: [ withFriend ] }) })).lineup?.teams[0].seatIds, [ LISA.id, FRIEND.id ]);
  const friendOnline = room({ teams: [ withFriend ], peers: [ ...PEERS, { userId: C, name: "friend" } ] });
  assert.deepEqual(screenTeams(base({ players: [ ANNA, LISA, FRIEND ], saved: [], room: friendOnline })).lineup?.teams[0].seatIds, [ LISA.id ]);
});

test("screenTeams: the owner's shift for their shared team is taken; anyone else's isn't", () => {
  const view = screenTeams(base({ room: room({ shifts: [ { owner: B, team: "TEAM BLUE", shift: 1 }, { owner: C, team: "TEAM BLUE", shift: 3 } ] }), shifts: { "TEAM RED": 2 } }));
  assert.deepEqual(view.shifts, { "TEAM RED": 2, "TEAM BLUE": 1 });
});

test("screenTeams: the mirror alone, with no connection, gives the same teams", () => {
  const mirror = roomOf(withRoom({}, room(), 1000), LOBBY);
  assert.deepEqual([ ...screenTeams(base({ room: mirror })).shared.values() ].map(team => team.name), [ "TEAM RED", "TEAM BLUE" ]);
});

test("withRoom keeps a day of lobbies", () => {
  const old = withRoom({}, { ...room(), lobbyId: "01a10312-5fd9-7b43-88ab-000000000000" }, 0);
  const next = withRoom(old, room(), ROOM_TTL_MS + 1);
  assert.deepEqual(Object.keys(next), [ LOBBY ]);
  assert.equal(roomOf(next, LOBBY)?.at, ROOM_TTL_MS + 1);
});

test("otherAccounts: by the site's names, each once, without this account", () => {
  const BOT_OF_B = seat("01a10312-0000-7000-8000-0000000000ff", "BOT LEVEL 3", { hostId: B, cpuPPR: 40, host: { id: B, name: "creazy_dev" } });
  assert.deepEqual(otherAccounts([ RED_SEAT, BLUE_SEAT, BOT_OF_B, FRIEND ], A), [ { userId: B, name: "CREAZY_DEV" }, { userId: C, name: "FRIEND" } ]);
});

test("roomStatus: every state", () => {
  const input = (extra: Record<string, unknown>): any => ({ connection: "connected", joinedAt: 0, now: MISSING_AFTER_MS, room: room({ peers: [ PEERS[0] ] }), players: [ RED_SEAT, BLUE_SEAT ], me: A, firstSeen: { [B]: 0 }, ...extra });
  assert.equal(roomStatus(input({ connection: "outdated" })).kind, "outdated");
  assert.equal(roomStatus(input({ connection: "offline" })).kind, "offline");
  assert.equal(roomStatus(input({ connection: "connecting" })).kind, "connecting");
  assert.equal(roomStatus(input({ connection: "idle" })).kind, "connecting");
  assert.deepEqual(roomStatus(input({ room: room() })), { kind: "synced", names: [ "CREAZY_DEV" ] });
  assert.deepEqual(roomStatus(input({})), { kind: "missing", names: [ "CREAZY_DEV" ] });
  assert.equal(roomStatus(input({ now: MISSING_AFTER_MS - 1 })).kind, "ready", "not before the 10 s are up");
  assert.equal(roomStatus(input({ firstSeen: { [B]: 5000 } })).kind, "ready", "counted from their first seat");
  assert.equal(roomStatus(input({ players: [ RED_SEAT ] })).kind, "ready");
  assert.equal(roomStatus(input({ joinedAt: undefined })).kind, "ready");
});

test("shouldJoin: with a team of this account's, or another account's seat", () => {
  assert.equal(shouldJoin([ RED_SEAT ], [ { name: "TEAM RED" } as any ], A), true);
  assert.equal(shouldJoin([ RED_SEAT, BLUE_SEAT ], [], A), true);
  assert.equal(shouldJoin([ RED_SEAT ], [], A), false);
  assert.equal(shouldJoin([ RED_SEAT, BLUE_SEAT ], [], null), false);
});

test("undoActor: who takes a partner-rule bust back", () => {
  const withBlue = room({ teams: [ BLUE_OWN ] });
  assert.equal(undoActor(ANNA, A, undefined, A), "legacy");
  assert.equal(undoActor(ANNA, A, withBlue, A), "own");
  assert.equal(undoActor(LISA, A, withBlue, A), "none", "B's own Tools is in the room");
  assert.equal(undoActor(LISA, A, room({ teams: [ BLUE_OWN ], peers: [ PEERS[0] ] }), A), "none", "B's team in the room means B's Tools takes it");
  assert.equal(undoActor(FRIEND, A, withBlue, A), "fallback", "no Tools of C's, and this is the host");
  assert.equal(undoActor(FRIEND, B, withBlue, A), "none", "only the host stands in");
  assert.equal(undoKey("m", [ "d1", "d2" ]), "undo|m|d1,d2");
});

test("tokenAccount: the id and name a token names, or nothing", () => {
  const jwt = (payload: object) => `x.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.y`;
  assert.deepEqual(tokenAccount(jwt({ sub: A, preferred_username: "creazy", email: "x@y" })), { userId: A, name: "creazy" });
  assert.equal(tokenAccount(jwt({ sub: A })), null);
  assert.equal(tokenAccount("garbage"), null);
  assert.equal(tokenAccount(undefined), null);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd /Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt && node_modules/.bin/tsx --test $SCR/tests/team-room.test.mts`
Expected: FAIL with `Cannot find module '…/utils/team-room.ts'`.

- [ ] **Step 3: Write `utils/team-room.ts`**

```ts
/**
 * Online Teams: what the team room (socket/, protocol version 1) says about a
 * lobby or its match, and how that merges with this screen's own teams.
 *
 * Both teams sit in one autodarts match, each on its captain's board; the room
 * carries only the team layer. Every screen trusts autodarts' own lobby or
 * match data over the room: a team from the room counts only with seats that
 * are there and are its owner's, nobody's word goes for this screen's own
 * seats, and the partner rule is taken from the lobby's host alone.
 *
 * Pure, like utils/teams.ts: no DOM, no storage, no extension APIs, so it runs
 * under tsx; and no text, since the service worker loads its types through
 * utils/storage.ts.
 */

import type { ColorScheme } from "@/utils/storage";
import type { Lineup, LineupTeam, SavedTeam, SeatLike, TeamFormat, TeamShifts } from "@/utils/teams";

import { findTeam, isHostedGuest, normalizeColour, normalizeName, sharedTeams, teamSeats } from "@/utils/teams";

/** Keep in step with socket/rooms.ts. */
export const PROTOCOL_VERSION = 1;
/** A lobby's mirror lives as long as its lineup does. */
export const ROOM_TTL_MS = 24 * 60 * 60 * 1000;
/** How long another account may take to reach the room before the chip says they aren't connected. */
export const MISSING_AFTER_MS = 10_000;

export interface RoomTeamInput {
  name: string;
  colour: ColorScheme;
  format: TeamFormat;
  /** Shared score: the team's one guest seat. Own scores: its members' seats, in throwing order. */
  seatIds: string[];
  /** Shared score: who takes turns on the seat. Own scores: the members' names. */
  players: string[];
}

export interface RoomTeam extends RoomTeamInput {
  /** The account that said it, stamped by the server. */
  owner: string;
}

export interface RoomShift { owner: string; team: string; shift: number }
export interface RoomRule { by: string; partnerRule: boolean }
export interface RoomPeer { userId: string; name: string }
export interface RoomState { lobbyId: string; teams: RoomTeam[]; shifts: RoomShift[]; rule?: RoomRule; peers: RoomPeer[] }

/** A room as this browser last heard it, for a reload, the step to the match, or an outage. */
export interface RoomMirror extends RoomState { at: number }

/** Per lobby id, which is also its match's id. */
export type RoomStore = Record<string, RoomMirror>;

/** The room client's connection, as the status chip reads it. */
export type Connection = "idle" | "connecting" | "connected" | "offline" | "outdated";

/** A lobby or match seat, with the names the site sends along with it. */
export interface RoomSeat extends SeatLike {
  host?: { id?: string; name?: string } | null;
}

/** The room as it arrived, kept with the lobbies of the last day. */
export function withRoom(store: RoomStore | undefined, state: RoomState, now: number): RoomStore {
  const next: RoomStore = {};
  for (const [ id, entry ] of Object.entries(store ?? {})) {
    if (id !== state.lobbyId && entry && now - entry.at < ROOM_TTL_MS) next[id] = entry;
  }
  next[state.lobbyId] = { ...state, at: now };
  return next;
}

/** A lobby's (or its match's) room, by its own id: never the page's, since storage is shared between tabs. */
export function roomOf(store: RoomStore | undefined, id: string | undefined): RoomMirror | undefined {
  return id ? store?.[id] : undefined;
}

/** The account a seat plays for: its own, or for a guest or a bot, whoever added it. */
export function seatOwner(seat: SeatLike | undefined): string | undefined {
  return seat?.userId || seat?.hostId || undefined;
}

/**
 * This account's teams as the room should know them: its shared-score guests
 * named after a saved team, and the teams of its own lineup, each with the
 * seats still in the lobby or match.
 */
export function myRoomTeams(players: readonly SeatLike[], saved: readonly SavedTeam[], lineup: Lineup | undefined, me: string | null | undefined): RoomTeamInput[] {
  if (!me) return [];
  const present = new Map(players.filter(seat => seat.id).map(seat => [ seat.id!, seat ]));
  const teams: RoomTeamInput[] = [];
  for (const seat of players) {
    if (!seat.id || !isHostedGuest(seat, me)) continue;
    const team = findTeam(sharedTeams(saved), seat.name);
    if (team) teams.push({ name: team.name, colour: { ...team.colour }, format: "shared", seatIds: [ seat.id ], players: [ ...team.players ] });
  }
  for (const team of lineup?.teams ?? []) {
    const seatIds = team.seatIds.filter(id => present.has(id));
    if (!seatIds.length) continue;
    teams.push({ name: team.name, colour: { ...team.colour }, format: "own", seatIds, players: seatIds.map(id => normalizeName(present.get(id)!.name)) });
  }
  return teams;
}

/**
 * The room's teams this screen takes. Not its own account's, which it knows
 * better itself. Of the others', only seats that are in autodarts' data, aren't
 * this account's, and belong to no team taken before. A shared-score team is
 * its owner's one guest seat, named after it; an own-score team's seats are its
 * owner's, or an account's with no Tools in the room, as a friend on their own
 * board can play on someone's team. A seat that has left drops out; a team
 * with none left, or named like a team taken before, isn't taken.
 */
function trusted(room: RoomState | undefined, players: readonly SeatLike[], me: string | null | undefined, names: ReadonlySet<string>, seats: ReadonlySet<string>): RoomTeam[] {
  if (!room || !me) return [];
  const byId = new Map(players.filter(seat => seat.id).map(seat => [ seat.id!, seat ]));
  const inRoom = new Set([ ...room.peers.map(peer => peer.userId), ...room.teams.map(team => team.owner) ]);
  const takenNames = new Set(names);
  const takenSeats = new Set(seats);
  const out: RoomTeam[] = [];
  for (const team of room.teams) {
    const name = normalizeName(team.name);
    if (!team.owner || team.owner === me || !name || takenNames.has(name)) continue;
    const seatIds = (team.seatIds ?? []).filter((id) => {
      const seat = byId.get(id);
      const owner = seatOwner(seat);
      if (!seat || !owner || owner === me || takenSeats.has(id)) return false;
      if (team.format === "shared") return isHostedGuest(seat, team.owner) && normalizeName(seat.name) === name;
      return owner === team.owner || !inRoom.has(owner);
    });
    const people = (team.players ?? []).map(normalizeName).filter(Boolean);
    if (!seatIds.length) continue;
    if (team.format === "shared" && (seatIds.length !== 1 || !people.length)) continue;
    takenNames.add(name);
    for (const id of seatIds) takenSeats.add(id);
    out.push({ ...team, name, colour: normalizeColour(team.colour), seatIds, players: people });
  }
  return out;
}

export interface ScreenInput {
  players: readonly SeatLike[];
  saved: readonly SavedTeam[];
  /** This screen's own lineup for the lobby or match. */
  lineup: Lineup | undefined;
  /** This screen's own tap-to-corrections for it. */
  shifts: TeamShifts;
  /** The room's last word on it: undefined with Online Teams off, or before there was any. */
  room: RoomState | undefined;
  me: string | null | undefined;
  /** The lobby's host, which is the match's too. */
  hostId: string | null | undefined;
}

export interface ScreenTeams {
  /** Every shared-score seat, this account's and the others', by its index in `players`. */
  shared: Map<number, SavedTeam>;
  /** This account's lineup with the other accounts' own-score teams after it; its partner rule is the host's. */
  lineup: Lineup | undefined;
  /** Tap-to-corrections: this account's, and the others' for their own teams. */
  shifts: TeamShifts;
  /** The other accounts' teams this screen takes from the room. */
  remote: RoomTeam[];
  /** This account's own teams here, by name: the ones its screen may edit and correct. */
  mine: Set<string>;
}

/** A lobby's or a match's teams as this screen shows them: its own, and what the room says of everyone else's. */
export function screenTeams(input: ScreenInput): ScreenTeams {
  const { players, saved, lineup, shifts, room, me, hostId } = input;
  const ownShared = teamSeats(players, saved, me);
  const mine = new Set<string>([ ...[ ...ownShared.values() ].map(team => team.name), ...(lineup?.teams ?? []).map(team => team.name) ]);
  const mySeats = new Set<string>((lineup?.teams ?? []).flatMap(team => team.seatIds));
  ownShared.forEach((_, index) => {
    const id = players[index]?.id;
    if (id) mySeats.add(id);
  });
  const remote = trusted(room, players, me, mine, mySeats);

  const shared = new Map(ownShared);
  for (const team of remote) {
    if (team.format !== "shared") continue;
    const index = players.findIndex(seat => seat.id === team.seatIds[0]);
    if (index >= 0) shared.set(index, { name: team.name, players: team.players, colour: team.colour, format: "shared" });
  }

  const own: LineupTeam[] = remote.filter(team => team.format === "own").map(team => ({ name: team.name, colour: team.colour, seatIds: team.seatIds }));
  const teams = [ ...(lineup?.teams ?? []), ...own ];
  const isHost = Boolean(me) && me === hostId;
  const rule = isHost ? lineup?.partnerRule : (room?.rule && hostId && room.rule.by === hostId ? room.rule.partnerRule : false);
  const merged: Lineup | undefined = teams.length ? { at: lineup?.at ?? 0, teams, ...(rule === undefined ? {} : { partnerRule: rule }) } : undefined;

  const mergedShifts: TeamShifts = { ...shifts };
  for (const shift of room?.shifts ?? []) {
    const team = remote.find(candidate => candidate.format === "shared" && candidate.owner === shift.owner && candidate.name === normalizeName(shift.team));
    if (team && Number.isInteger(shift.shift)) mergedShifts[team.name] = shift.shift;
  }
  return { shared, lineup: merged, shifts: mergedShifts, remote, mine };
}

/** The other accounts with seats here, each once, by the name the site shows for them. */
export function otherAccounts(players: readonly RoomSeat[], me: string | null | undefined): RoomPeer[] {
  const out = new Map<string, string>();
  for (const seat of players) {
    const owner = seatOwner(seat);
    if (!owner || owner === me || out.has(owner)) continue;
    out.set(owner, normalizeName(seat.userId === owner ? seat.name : seat.host?.name ?? seat.name));
  }
  return [ ...out ].map(([ userId, name ]) => ({ userId, name }));
}

export type StatusKind = "connecting" | "ready" | "synced" | "missing" | "offline" | "outdated";

export interface StatusInput {
  connection: Connection;
  /** When this screen joined the room, if it has. */
  joinedAt: number | undefined;
  now: number;
  room: RoomState | undefined;
  players: readonly RoomSeat[];
  me: string | null | undefined;
  /** When each other account's first seat was seen here, by user id. */
  firstSeen: Readonly<Record<string, number>>;
}

export interface RoomStatus { kind: StatusKind; names: string[] }

/**
 * The lobby's status chip: the connection first; once connected, the other
 * accounts in the room, or those with seats here whose Tools hasn't shown up
 * within MISSING_AFTER_MS of both their first seat and our joining.
 */
export function roomStatus(input: StatusInput): RoomStatus {
  if (input.connection === "outdated") return { kind: "outdated", names: [] };
  if (input.connection === "offline") return { kind: "offline", names: [] };
  if (input.connection !== "connected") return { kind: "connecting", names: [] };
  const peers = (input.room?.peers ?? []).filter(peer => peer.userId !== input.me);
  if (peers.length) return { kind: "synced", names: peers.map(peer => normalizeName(peer.name)) };
  const joinedAt = input.joinedAt;
  if (joinedAt === undefined) return { kind: "ready", names: [] };
  const missing = otherAccounts(input.players, input.me).filter((account) => {
    const since = Math.max(joinedAt, input.firstSeen[account.userId] ?? input.now);
    return input.now - since >= MISSING_AFTER_MS;
  });
  return missing.length ? { kind: "missing", names: missing.map(account => account.name) } : { kind: "ready", names: [] };
}

/** Whether to join the lobby's room: with a team of this account's in it, or another account's seat. */
export function shouldJoin(players: readonly SeatLike[], myTeams: readonly RoomTeamInput[], me: string | null | undefined): boolean {
  if (!me) return false;
  return myTeams.length > 0 || players.some((seat) => {
    const owner = seatOwner(seat);
    return Boolean(owner) && owner !== me;
  });
}

/**
 * Who takes a partner-rule bust back (utils/teams-undo.ts), since autodarts
 * lets either account undo the other's darts:
 *   - "legacy": no room (Online Teams off, or never joined): this screen, as before
 *   - "own": the thrower is this account's: this screen, unless the room has granted the undo to another
 *   - "fallback": the thrower's account has no Tools in the room, and this is the lobby's host: this screen, only once the room grants it
 *   - "none": the thrower's own Tools
 */
export type UndoActor = "legacy" | "own" | "fallback" | "none";

export function undoActor(seat: SeatLike | undefined, me: string | null | undefined, room: RoomState | undefined, hostId: string | null | undefined): UndoActor {
  if (!room) return "legacy";
  const owner = seatOwner(seat);
  if (!owner || !me) return "none";
  if (owner === me) return "own";
  const inRoom = room.peers.some(peer => peer.userId === owner) || room.teams.some(team => team.owner === owner);
  return !inRoom && me === hostId ? "fallback" : "none";
}

/** The room's key for one visit's take-back. */
export function undoKey(matchId: string, dartIds: readonly string[]): string {
  return `undo|${matchId}|${dartIds.join(",")}`;
}

/**
 * The account an autodarts token names: its `sub` and username, read here so
 * the token itself never has to go anywhere. Decoded, not verified: it is only
 * ever this browser's own token.
 */
export function tokenAccount(token: string | null | undefined): { userId: string; name: string } | null {
  try {
    const part = (token ?? "").split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(part.padEnd(part.length + ((4 - (part.length % 4)) % 4), "=")));
    const name = String(payload.preferred_username ?? payload.name ?? "").trim().slice(0, 64);
    return typeof payload.sub === "string" && name ? { userId: payload.sub, name } : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `cd /Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt && node_modules/.bin/tsx --test $SCR/tests/team-room.test.mts`
Expected: PASS, all 16.

- [ ] **Step 5: Commit**

```bash
git add utils/team-room.ts
git commit -m "feat: Online Teams' rules: whose teams a screen takes from the room, and how they merge with its own"
```

---

### Task 4: Config, storage, build flag and selector

**Files:**
- Modify: `utils/teams.ts`. In `TeamsConfig` (after `partnerRule`), add `online`. Change `normalizeTeams`'s return.
- Modify: `utils/storage.ts`. Changes: the `IConfig.teams` type (~line 120), `defaultConfig.teams` (~line 552), `CONFIG_VERSION` (~line 841), migrations (~line 854), and a new item after `AutodartsToolsTeamLineups` (~line 1100).
- Modify: `wxt.config.ts` (the constants near `FAKE_CAMERA`, ~line 43, and `define`, ~line 223)
- Modify: `utils/selectors.ts` (after `playerBoardButton`, ~line 359)
- Test: `$SCR/tests/teams-online-config.test.mts`

**Interfaces:**
- Produces:
  - `TeamsConfig.online: boolean` and `IConfig.teams.online`
  - `AutodartsToolsTeamRoom: WxtStorageItem<RoomStore>` at `local:teams-room`
  - the global `__ADT_TEAMS_SERVER__: string`
  - `SELECTORS.lobby.playerLinkButton`

- [ ] **Step 1: Write the failing test**

```ts
// $SCR/tests/teams-online-config.test.mts
import { test } from "node:test";
import assert from "node:assert/strict";

import { normalizeTeams } from "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/utils/teams.ts";

test("Online Teams is on unless it was switched off", () => {
  assert.equal(normalizeTeams(undefined).online, true);
  assert.equal(normalizeTeams({ enabled: true, saved: [] }).online, true);
  assert.equal(normalizeTeams({ online: false }).online, false);
  assert.equal(normalizeTeams({ online: "no" }).online, true);
});
```

Run: `cd /Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt && node_modules/.bin/tsx --test $SCR/tests/teams-online-config.test.mts`
Expected: FAIL (`undefined !== true`).

- [ ] **Step 2: `utils/teams.ts`**

In `interface TeamsConfig`, after `partnerRule: boolean;`:

```ts
  /**
   * Online Teams: in a lobby with a team and another account, share this
   * account's teams with the other Tools there (utils/team-room.ts). On unless
   * switched off.
   */
  online: boolean;
```

In `normalizeTeams`, replace the return with:

```ts
  return { enabled: Boolean(value.enabled), saved: teams, partnerRule: Boolean(value.partnerRule), online: value.online !== false };
```

- [ ] **Step 3: `utils/storage.ts`**

1. At the imports, add `import type { RoomStore } from "@/utils/team-room";`.
2. In `IConfig.teams`, after `partnerRule: boolean;`, add:
   ```ts
   /** Online Teams: share this account's teams with the other Tools in a lobby; see utils/team-room.ts. */
   online: boolean;
   ```
3. In `defaultConfig.teams`, add `online: true,` after `partnerRule: false,`.
4. Change `const CONFIG_VERSION = 15;` to `const CONFIG_VERSION = 16;`, and add as the first entry of `migrations`:
   ```ts
      /** Online Teams is new, and on unless switched off: normalizeTeams fills its switch. */
      16: (config: any) => ({ ...config, teams: normalizeTeams(config.teams) }),
   ```
5. After `AutodartsToolsTeamLineups`, add:
   ```ts
   /**
    * Online Teams: per lobby id (the match's id too), what the team room last
    * said (utils/team-room.ts), so a reload, the step from lobby to match, or an
    * outage keeps the other accounts' teams on screen. Its own item: it is about
    * a lobby on this browser, and lives a day.
    */
   export const AutodartsToolsTeamRoom: WxtStorageItem<RoomStore, any> = storage.defineItem(
     "local:teams-room",
     {
       defaultValue: {},
     },
   );
   ```

- [ ] **Step 4: `wxt.config.ts`**

After the `FAKE_CAMERA` constant:

```ts
/**
 * Online Teams' server (socket/). `yarn dev` talks to one on this machine
 * (`bun run dev` in socket/), so debugging it needs nothing deployed; every
 * build talks to the deployed one. `ADT_TEAMS_SERVER=…` points either anywhere.
 */
const TEAMS_SERVER = process.env.ADT_TEAMS_SERVER;

function teamsServer(command: string): string {
  return TEAMS_SERVER || (command === "serve" ? "http://localhost:4455" : "https://adt-socket.tobias-thiele.de");
}
```

In `define`, after `__ADT_PICKER__`:

```ts
      // Where Online Teams connects; see teamsServer.
      __ADT_TEAMS_SERVER__: JSON.stringify(teamsServer(env.command)),
```

Check that `env` in `vite: env => ({…})` is WXT's `ConfigEnv`, which has `command: "serve" | "build"` (`node_modules/wxt/dist/types.d.mts`, `interface ConfigEnv`). Leave `manifest.host_permissions` as it is: a content script's WebSocket isn't gated by host permissions, and Task 8, Step 9 sees both browsers connect to `ws://localhost:4455`. Only if Firefox refuses it there, make `manifest` a function of `env` and add `"*://localhost/*"` when `env.command === "serve"`.

- [ ] **Step 5: `utils/selectors.ts`**

After `playerBoardButton`:

```ts
    /**
     * The 🌐 on a seat someone else hosts: the site's "play on my board"
     * (`setHostForIndex`), which pulls that seat onto this account's board.
     * Online Teams hides it on another account's team (lobby.content/teams.ts).
     */
    playerLinkButton: [ "button[data-slot='button']:has([data-icon='globe'])" ],
```

- [ ] **Step 6: Run the test, and type-check**

Run: `cd /Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt && node_modules/.bin/tsx --test $SCR/tests/teams-online-config.test.mts`
Expected: PASS.

Run `yarn compile 2>&1 | grep -E "error TS" | sort > $SCR/compile-after-4.txt`. Compare it with the baseline from `git stash`-free filtering: `git diff --stat` shows only this task's files, and none of the errors may name `utils/teams.ts`, `utils/storage.ts`, `utils/team-room.ts`, `wxt.config.ts` or `utils/selectors.ts`. A missing `online` in a hand-built `TeamsConfig` elsewhere (`grep -rn "partnerRule: " --include=*.ts --include=*.vue entrypoints components utils | grep -v teams.ts`) gets `online: true` added.

- [ ] **Step 7: Commit**

```bash
git add utils/teams.ts utils/storage.ts wxt.config.ts utils/selectors.ts
git commit -m "feat: the Online Teams switch, its room mirror and the server's address per build"
```

---

### Task 5: The room client (`utils/team-room-client.ts`, `utils/team-room-mirror.ts`)

**Files:**
- Create: `utils/team-room-client.ts`
- Create: `utils/team-room-mirror.ts`
- Test: `$SCR/tests/room-client.test.mts`

**Interfaces:**
- Consumes: `PROTOCOL_VERSION`, `Connection`, `RoomState`, `RoomTeamInput`, `withRoom` (Task 3); `AutodartsToolsTeamRoom` (Task 4); the server protocol (Task 2).
- Produces:
  - `interface Identity { userId: string; name: string }`
  - `interface RoomClientState { connection; rtt; joined; joinedAt; room }`
  - `class RoomClient`, built with `new RoomClient({ url?, identity, onRoom?, connect? })`:
    - `start(lobbyId): Promise<void>`, `setJoin(join): void`, `stop(): void`
    - `publishTeams(teams): void`, `publishRule(on): void`, `publishShift(team, shift): Promise<void>`
    - `claim(key): Promise<boolean | undefined>`
    - `retry(): void`
    - `subscribe(listener): () => void`
    - `readonly state: RoomClientState`
  - `tokenIdentity(): Promise<Identity | null>`
  - `mirrorRoom(state: RoomState): Promise<void>`

- [ ] **Step 1: Write the failing test**

```ts
// $SCR/tests/room-client.test.mts
import { spawn, type ChildProcess } from "node:child_process";
import { after, test } from "node:test";
import assert from "node:assert/strict";

import { RoomClient } from "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/utils/team-room-client.ts";

const PORT = 4468;
const URL = `http://localhost:${PORT}`;
const LOBBY = "01a10312-5fd9-7b43-88ab-73ac80cb938e";
const A = { userId: "5e1f2afd-6ac0-4fb0-b98a-cb9cf2811917", name: "creazy" };
const B = { userId: "39a06afc-edfd-4a82-b1af-5155a475fa37", name: "creazy_dev" };
const red: any = { name: "TEAM RED", colour: { preset: "crimson", from: "#6a1624", to: "#b8323f" }, format: "shared", seatIds: [ "01a10312-0000-7000-8000-000000000001" ], players: [ "ANNA", "TOM" ] };
const blue: any = { name: "TEAM BLUE", colour: { preset: "ocean", from: "#374c98", to: "#0b55df" }, format: "shared", seatIds: [ "01a10312-0000-7000-8000-000000000002" ], players: [ "LISA", "MAX" ] };

let server: ChildProcess | undefined;
const clients: RoomClient[] = [];

async function startServer() {
  server = spawn("bun", [ "run", "index.ts" ], { cwd: "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/socket", env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(`${URL}/health`)).ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error("server did not start");
}

async function stopServer() {
  const exited = new Promise(resolve => server?.once("exit", resolve));
  server?.kill();
  await exited;
}

function until(check: () => boolean, ms = 8000): Promise<void> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const poll = setInterval(() => {
      if (check()) { clearInterval(poll); resolve(); }
      else if (Date.now() - started > ms) { clearInterval(poll); reject(new Error("timed out")); }
    }, 25);
  });
}

function client(identity: typeof A): RoomClient {
  const made = new RoomClient({ url: URL, identity: async () => identity });
  clients.push(made);
  return made;
}

after(async () => {
  for (const made of clients) made.stop();
  await stopServer();
});

test("two accounts see each other's teams, and a claim is granted once", async () => {
  await startServer();
  const a = client(A);
  const b = client(B);
  await a.start(LOBBY);
  await b.start(LOBBY);
  a.setJoin(true);
  b.setJoin(true);
  a.publishTeams([ red ]);
  b.publishTeams([ blue ]);
  await until(() => a.state.room?.teams.length === 2 && b.state.room?.teams.length === 2);
  assert.deepEqual(a.state.room!.teams.map(team => team.name).sort(), [ "TEAM BLUE", "TEAM RED" ]);
  assert.equal(a.state.connection, "connected");
  assert.ok(a.state.joinedAt);
  assert.equal(await a.claim("undo|m|d"), true);
  assert.equal(await b.claim("undo|m|d"), false);
});

test("after a server restart, both rejoin and say their teams again", async () => {
  const [ a, b ] = clients;
  await stopServer();
  await until(() => a.state.connection === "offline");
  assert.equal(await a.claim("k"), undefined, "nothing to ask while offline");
  await startServer();
  await until(() => a.state.room?.teams.length === 2 && b.state.room?.teams.length === 2, 20000);
});

test("leaving the room takes this account out of its peers", async () => {
  const [ a, b ] = clients;
  b.setJoin(false);
  await until(() => a.state.room?.peers.length === 1);
});

test("a server of another version makes the client outdated", async () => {
  const handlers: Record<string, ((...args: any[]) => void)[]> = {};
  const fake: any = {
    connected: false,
    on(event: string, fn: (...args: any[]) => void) { (handlers[event] ??= []).push(fn); return fake; },
    disconnect() { fake.connected = false; },
    connect() {},
    timeout() { return fake; },
    emit() {},
  };
  const made = new RoomClient({ url: "http://unused", identity: async () => A, connect: (() => fake) as any });
  await made.start(LOBBY);
  handlers.connect_error.forEach(fn => fn(new Error("version")));
  assert.equal(made.state.connection, "outdated");
  made.stop();
  assert.equal(made.state.connection, "idle");
});
```

Run: `cd /Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt && node_modules/.bin/tsx --test --test-concurrency=1 $SCR/tests/room-client.test.mts`
Expected: FAIL with `Cannot find module '…/utils/team-room-client.ts'`.

- [ ] **Step 2: Write `utils/team-room-client.ts`**

```ts
/**
 * Online Teams' connection to the team room (socket/, protocol in
 * utils/team-room.ts). The lobby's and the match's Teams scripts each hold one
 * while their page is open. They are separate bundles, each with its own Vue,
 * so one client shared between them couldn't drive both UIs. The room keeps the
 * lobby's id into its match, so the step between them is a reconnect, with
 * the mirror (local:teams-room) showing the teams meanwhile.
 *
 * The autodarts token never leaves the browser: the user's id and name are
 * read from it here, and only those are sent.
 */

import { type Socket, io } from "socket.io-client";

import type { Connection, RoomState, RoomTeamInput } from "@/utils/team-room";

import { PROTOCOL_VERSION, tokenAccount } from "@/utils/team-room";

declare const __ADT_TEAMS_SERVER__: string;

export interface Identity { userId: string; name: string }

export interface RoomClientState {
  connection: Connection;
  /** Round trip to the server in ms, once measured. */
  rtt: number | undefined;
  /** The lobby whose room this client is in, once joined. */
  joined: string | undefined;
  joinedAt: number | undefined;
  /** The room's last word. */
  room: RoomState | undefined;
}

export interface RoomClientOptions {
  /** The server; `__ADT_TEAMS_SERVER__` by default. */
  url?: string;
  identity: () => Promise<Identity | null>;
  /** Every room state as it arrives; the page scripts mirror it (utils/team-room-mirror.ts). */
  onRoom?: (state: RoomState) => void;
  /** socket.io's `io`, which a test replaces. */
  connect?: typeof io;
}

type Ack<T> = { ok: true; value: T } | { ok: false; error: string };

const ACK_TIMEOUT_MS = 5000;
const PING_MS = 20_000;

export class RoomClient {
  readonly state: RoomClientState = { connection: "idle", rtt: undefined, joined: undefined, joinedAt: undefined, room: undefined };
  private socket: Socket | undefined;
  private starting: Promise<void> | undefined;
  private lobbyId: string | undefined;
  private wantJoin = false;
  /** What the page wants the room to know, and what the room has taken. */
  private intended: { teams?: RoomTeamInput[]; rule?: boolean } = {};
  private sent: { teams: string; rule: boolean | undefined } = { teams: "", rule: undefined };
  private pinger: ReturnType<typeof setInterval> | undefined;
  private readonly listeners = new Set<(state: RoomClientState) => void>();

  constructor(private readonly options: RoomClientOptions) {}

  /** Connects, once, for this lobby; its room is joined with {@link setJoin}. Another lobby leaves the last one's room. */
  start(lobbyId: string): Promise<void> {
    if (this.lobbyId !== lobbyId) {
      this.leaveRoom();
      this.lobbyId = lobbyId;
      this.intended = {};
      this.update({ room: undefined });
    }
    this.starting ??= this.connect();
    return this.starting;
  }

  /** In this lobby's room or out of it. */
  setJoin(join: boolean) {
    if (join === this.wantJoin) return;
    this.wantJoin = join;
    if (join) this.joinRoom();
    else this.leaveRoom();
  }

  stop() {
    this.leaveRoom();
    clearInterval(this.pinger);
    this.pinger = undefined;
    this.socket?.disconnect();
    this.socket = undefined;
    this.starting = undefined;
    this.lobbyId = undefined;
    this.wantJoin = false;
    this.intended = {};
    this.update({ connection: "idle", rtt: undefined, joined: undefined, joinedAt: undefined, room: undefined });
  }

  /** This account's teams in the lobby, sent when they change, and again after every (re)join. */
  publishTeams(teams: RoomTeamInput[]) {
    this.intended.teams = teams;
    this.flush();
  }

  /** The lobby's partner rule, from its host. */
  publishRule(partnerRule: boolean) {
    this.intended.rule = partnerRule;
    this.flush();
  }

  async publishShift(team: string, shift: number) {
    await this.send("room:shift", { team, shift });
  }

  /** The room's grant for `key`: true for the first to ask, false after that, undefined when the room can't be asked. */
  async claim(key: string): Promise<boolean | undefined> {
    const answer = await this.send<boolean>("room:claim", { key });
    return answer?.ok ? answer.value : undefined;
  }

  /** Reconnects now, rather than at socket.io's next try. */
  retry() {
    if (!this.socket || this.state.connection === "connected") return;
    this.update({ connection: "connecting" });
    this.socket.disconnect().connect();
  }

  subscribe(listener: (state: RoomClientState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private async connect(): Promise<void> {
    const identity = await this.options.identity();
    if (!identity || !this.lobbyId) {
      this.update({ connection: "offline" });
      this.starting = undefined;
      return;
    }
    this.update({ connection: "connecting" });
    const socket = (this.options.connect ?? io)(this.options.url ?? __ADT_TEAMS_SERVER__, {
      transports: [ "websocket" ],
      auth: { v: PROTOCOL_VERSION, userId: identity.userId, name: identity.name },
      reconnectionDelay: 1000,
      reconnectionDelayMax: 15_000,
    });
    this.socket = socket;
    socket.on("connect", () => {
      this.update({ connection: "connected" });
      this.ping();
      if (this.wantJoin) this.joinRoom();
    });
    socket.on("disconnect", () => {
      this.update({ connection: "offline", joined: undefined, joinedAt: undefined });
    });
    socket.on("connect_error", (error: Error) => {
      if (error?.message === "version") {
        this.update({ connection: "outdated" });
        socket.disconnect();
        return;
      }
      this.update({ connection: "offline" });
    });
    socket.on("room:state", (room: RoomState) => this.receive(room));
    this.pinger = setInterval(() => this.ping(), PING_MS);
  }

  private joinRoom() {
    const socket = this.socket;
    const lobbyId = this.lobbyId;
    if (!socket?.connected || !lobbyId || this.state.joined === lobbyId) return;
    socket.timeout(ACK_TIMEOUT_MS).emit("room:join", { lobbyId }, (error: Error | null, answer?: Ack<RoomState>) => {
      if (error || !answer?.ok || lobbyId !== this.lobbyId || !this.wantJoin) return;
      this.update({ joined: lobbyId, joinedAt: Date.now() });
      // A fresh join: the room may have lost what it was told, after a restart.
      this.sent = { teams: "", rule: undefined };
      this.receive(answer.value);
      this.flush();
    });
  }

  private leaveRoom() {
    const lobbyId = this.state.joined;
    if (lobbyId && this.socket?.connected) this.socket.emit("room:leave", { lobbyId });
    this.update({ joined: undefined, joinedAt: undefined });
    this.sent = { teams: "", rule: undefined };
  }

  private async flush() {
    if (!this.state.joined) return;
    const { teams, rule } = this.intended;
    if (teams) {
      const key = JSON.stringify(teams);
      if (key !== this.sent.teams) {
        this.sent.teams = key;
        const answer = await this.send("room:teams", { teams });
        if (!answer?.ok && this.sent.teams === key) this.sent.teams = "";
      }
    }
    if (rule !== undefined && rule !== this.sent.rule) {
      this.sent.rule = rule;
      const answer = await this.send("room:rule", { partnerRule: rule });
      if (!answer?.ok && this.sent.rule === rule) this.sent.rule = undefined;
    }
  }

  private send<T>(event: string, payload: Record<string, unknown>): Promise<Ack<T> | undefined> {
    const socket = this.socket;
    const lobbyId = this.state.joined;
    if (!socket?.connected || !lobbyId) return Promise.resolve(undefined);
    return new Promise((resolve) => {
      socket.timeout(ACK_TIMEOUT_MS).emit(event, { lobbyId, ...payload }, (error: Error | null, answer?: Ack<T>) => resolve(error ? undefined : answer));
    });
  }

  private receive(room: RoomState) {
    if (!room || room.lobbyId !== this.lobbyId) return;
    this.update({ room });
    this.options.onRoom?.(room);
  }

  private ping() {
    const socket = this.socket;
    if (!socket?.connected) return;
    const started = Date.now();
    socket.timeout(ACK_TIMEOUT_MS).emit("room:ping", (error: Error | null) => {
      if (!error) this.update({ rtt: Date.now() - started });
    });
  }

  private update(patch: Partial<RoomClientState>) {
    Object.assign(this.state, patch);
    for (const listener of this.listeners) listener(this.state);
  }
}

/**
 * The signed-in account, from the autodarts token the extension already holds;
 * the token itself stays here. Storage is imported when asked, so this module
 * loads under tsx without WXT.
 */
export async function tokenIdentity(): Promise<Identity | null> {
  const { AutodartsToolsGlobalStatus } = await import("@/utils/storage");
  return tokenAccount((await AutodartsToolsGlobalStatus.getValue())?.auth?.token);
}
```

`utils/team-room-mirror.ts`:

```ts
/**
 * Writes what the team room says into `local:teams-room`, which every reader
 * of teams uses (the lobby, the match, the team view, the Caller), in every
 * tab, and which outlasts a reload or an outage.
 */

import type { RoomState } from "@/utils/team-room";

import { AutodartsToolsTeamRoom } from "@/utils/storage";
import { withRoom } from "@/utils/team-room";

export async function mirrorRoom(state: RoomState): Promise<void> {
  const store = await AutodartsToolsTeamRoom.getValue();
  await AutodartsToolsTeamRoom.setValue(withRoom(store ?? {}, state, Date.now()));
}
```

- [ ] **Step 3: Run the test to see it pass**

Run: `cd /Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt && node_modules/.bin/tsx --test --test-concurrency=1 $SCR/tests/room-client.test.mts`
Expected: PASS, all 4. Make sure the server child from the test is gone afterwards: `lsof -i :4468` prints nothing.

- [ ] **Step 4: Commit**

```bash
git add utils/team-room-client.ts utils/team-room-mirror.ts
git commit -m "feat: the Online Teams room client, which rejoins and says its teams again after any reconnect"
```

---

### Task 6: The team view and the Caller read the room

**Files:**
- Modify: `utils/teams.ts`. Add `remoteShared` to `CallContext` (~line 362) and use it in `seatCall` (~line 380).
- Modify: `utils/team-calls.ts`
- Modify: `utils/websocket-helpers.ts` (`teamsContext`, `loadTeamsContext`, `teamContext`, ~lines 287–315)
- Test: `$SCR/tests/team-calls-online.test.mts`

**Interfaces:**
- Consumes: `screenTeams`, `roomOf`, `RoomStore` (Task 3); `AutodartsToolsTeamRoom` (Task 4).
- Produces: `CallContext.remoteShared?: ReadonlyMap<number, SavedTeam>`.

- [ ] **Step 1: Write the failing test**

```ts
// $SCR/tests/team-calls-online.test.mts
import { test } from "node:test";
import assert from "node:assert/strict";

import { turnCallNames } from "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/utils/teams.ts";

const A = "5e1f2afd-6ac0-4fb0-b98a-cb9cf2811917";
const B = "39a06afc-edfd-4a82-b1af-5155a475fa37";
const ocean = { preset: "ocean", from: "#374c98", to: "#0b55df" };
const players: any = [
  { id: "s1", name: "TEAM RED", userId: null, hostId: A, cpuPPR: null },
  { id: "s2", name: "TEAM BLUE", userId: null, hostId: B, cpuPPR: null },
];
const match: any = { variant: "X01", set: 1, leg: 1, round: 1, player: 1, players };

test("the Caller names the other account's player up, then their team", () => {
  const remoteShared = new Map([ [ 1, { name: "TEAM BLUE", players: [ "LISA", "MAX" ], colour: ocean, format: "shared" } ] ]) as any;
  assert.deepEqual(turnCallNames(match, { saved: [], hostId: A, shifts: {}, lineup: undefined, remoteShared }), [ "LISA", "TEAM BLUE" ]);
  assert.deepEqual(turnCallNames(match, { saved: [], hostId: A, shifts: { "TEAM BLUE": 1 }, lineup: undefined, remoteShared }), [ "MAX", "TEAM BLUE" ]);
  assert.deepEqual(turnCallNames(match, { saved: [], hostId: A, shifts: {}, lineup: undefined }), [ "TEAM BLUE" ]);
});
```

Run it as in Task 3. Expected: FAIL. The first assertion gets `[ "TEAM BLUE" ]`.

- [ ] **Step 2: `utils/teams.ts`**

In `CallContext`, after `lineup`:

```ts
  /** Online Teams: the other accounts' shared-score teams, by seat (utils/team-room.ts `screenTeams`). */
  remoteShared?: ReadonlyMap<number, SavedTeam>;
```

In `seatCall`, replace `const shared = teamSeats(players, context.saved, context.hostId).get(seat);` with:

```ts
  const shared = teamSeats(players, context.saved, context.hostId).get(seat) ?? context.remoteShared?.get(seat);
```

Run the test. Expected: PASS.

- [ ] **Step 3: `utils/team-calls.ts`**

The import changes: `AutodartsToolsTeamRoom` joins `AutodartsToolsConfig`, `AutodartsToolsTeamLineups` and `AutodartsToolsTeamShifts`; add `import type { RoomStore } from "@/utils/team-room";` and `import { roomOf, screenTeams } from "@/utils/team-room";`. Add `let rooms: RoomStore = {};`, and in `loadTeamCalls`, after the lineups watcher:

```ts
    rooms = (await AutodartsToolsTeamRoom.getValue()) ?? {};
    AutodartsToolsTeamRoom.watch((value) => {
      rooms = value ?? {};
    });
```

Replace `context(match)`:

```ts
function context(match: IMatch): CallContext {
  if (!teams.enabled) return { saved: [], hostId, shifts: {}, lineup: undefined };
  // Online Teams: the other accounts' teams too, as this screen shows them (utils/team-room.ts).
  const view = screenTeams({
    players: match.players ?? [],
    saved: teams.saved,
    lineup: lineupOf(lineups, match.id),
    shifts: shiftsOf(shifts, match.id),
    room: teams.online ? roomOf(rooms, match.id) : undefined,
    me: hostId,
    hostId: match.host?.id,
  });
  return { saved: teams.saved, hostId, shifts: view.shifts, lineup: view.lineup, remoteShared: view.shared };
}
```

- [ ] **Step 4: `utils/websocket-helpers.ts`**

The import changes: `AutodartsToolsTeamRoom` and `AutodartsToolsGlobalStatus` join the storage import; add `import type { RoomStore } from "@/utils/team-room";` and `import { roomOf, screenTeams, tokenAccount } from "@/utils/team-room";`. Do **not** import `@/utils/helpers` here: it creates `Audio` objects at load, and the websocket monitor's entrypoint is evaluated in node at build time ([[wxt-entrypoint-graph-is-tree-shaken]]).

Change the context's type and loader:

```ts
let teamsContext: { enabled: boolean; partnerRule: boolean; online: boolean; lineups: LineupStore; rooms: RoomStore; me: string | null } | undefined;
let teamsContextLoad: Promise<void> | undefined;

function loadTeamsContext(): Promise<void> {
  teamsContextLoad ??= (async () => {
    const [ config, lineups, rooms, status ] = await Promise.all([ AutodartsToolsConfig.getValue(), AutodartsToolsTeamLineups.getValue(), AutodartsToolsTeamRoom.getValue(), AutodartsToolsGlobalStatus.getValue() ]);
    const teams = normalizeTeams(config?.teams);
    teamsContext = { enabled: teams.enabled, partnerRule: teams.partnerRule, online: teams.online, lineups: lineups ?? {}, rooms: rooms ?? {}, me: tokenAccount(status?.auth?.token)?.userId ?? null };
    AutodartsToolsConfig.watch((next) => {
      const nextTeams = normalizeTeams(next?.teams);
      if (!teamsContext) return;
      teamsContext.enabled = nextTeams.enabled;
      teamsContext.partnerRule = nextTeams.partnerRule;
      teamsContext.online = nextTeams.online;
      flagVoidedVisit();
    });
    AutodartsToolsTeamLineups.watch((next) => {
      if (teamsContext) teamsContext.lineups = next ?? {};
      flagVoidedVisit();
    });
    AutodartsToolsTeamRoom.watch((next) => {
      if (teamsContext) teamsContext.rooms = next ?? {};
      flagVoidedVisit();
    });
    // The token can arrive after this script, which runs at document_start.
    AutodartsToolsGlobalStatus.watch((next) => {
      if (teamsContext) teamsContext.me = tokenAccount(next?.auth?.token)?.userId ?? null;
    });
  })();
  return teamsContextLoad;
}
```

Replace `teamContext`:

```ts
/**
 * Teams' rules for a frame: the lineup is the frame's own match's, whatever
 * page this tab is on, with Online Teams' other accounts' teams added
 * (utils/team-room.ts), and so is its partner rule, which is the host's.
 */
function teamContext(match: IMatch): TeamViewContext | undefined {
  if (!teamsContext) return undefined;
  const view = screenTeams({
    players: match.players ?? [],
    saved: [],
    lineup: lineupOf(teamsContext.lineups, match.id),
    shifts: {},
    room: teamsContext.online ? roomOf(teamsContext.rooms, match.id) : undefined,
    me: teamsContext.me,
    hostId: match.host?.id,
  });
  return { enabled: teamsContext.enabled, partnerRule: lineupPartnerRule(view.lineup, teamsContext.partnerRule), lineup: view.lineup };
}
```

- [ ] **Step 5: Type-check and build**

Run: `yarn compile 2>&1 | grep -E "utils/(teams|team-calls|websocket-helpers|team-room)" || echo "no new errors"`
Expected: `no new errors`.

Run: `yarn build 2>&1 | tail -5`
Expected: a successful build. The entrypoint graph is checked here: `utils/team-room.ts` now reaches the websocket monitor. See [[wxt-entrypoint-graph-is-tree-shaken]]. A failure about `new Audio()` in node means an import cycle pulled a feature into a node-built entrypoint.

- [ ] **Step 6: Commit**

```bash
git add utils/teams.ts utils/team-calls.ts utils/websocket-helpers.ts
git commit -m "feat: the team view and the Caller take the other account's teams from the room"
```

---

### Task 7: Two browsers, two accounts, the local server

No product code. This sets up what Tasks 8–12 debug with, and leaves it running.

**Files:**
- Create: `$SCR/rdp.mjs` (Firefox Remote Debugging Protocol driver, throwaway)
- Create: `$SCR/cfg.mjs` (Chrome config backup and writes over CDP, throwaway)
- Create: `$SCR/ad.py`, which exists already: the two-account API helper (`ad.api(1|2, method, path, body)`, `ad.me(1|2)`)

- [ ] **Step 1: Server and Chrome are up**

Run: `curl -s localhost:4455/health; curl -s 127.0.0.1:9222/json/list | python3 -c "import sys,json;[print(t['type'],t['url'][:90]) for t in json.load(sys.stdin) if t['type']=='page']"`
Expected: the health JSON, and the user's tabs. If the server is down, start it as in Task 2, Step 6. If Chrome is down, stop and report: don't restart `yarn dev`.

- [ ] **Step 2: Start the Firefox dev build on its own port**

`yarn dev` holds port 4000. WXT exits when stdin closes, so hold stdin open with a FIFO ([[restarting-yarn-dev-needs-open-stdin]]):

```bash
cd /Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt
mkfifo $SCR/ffdev.fifo
( sleep 1000000 > $SCR/ffdev.fifo & )
nohup npx wxt -b firefox --port 4001 < $SCR/ffdev.fifo > $SCR/ffdev.log 2>&1 &
```

Then wait about 40 s and run `ps aux | grep -i "[f]irefox" | grep -o "start-debugger-server [0-9]*"`.
Expected: `start-debugger-server <PORT>`. Keep `<PORT>` as `FFPORT`. Once this Firefox runs, never restart it: its profile is temporary, and the login would be lost.

- [ ] **Step 3: Write `$SCR/rdp.mjs`**

```js
// Firefox Remote Debugging Protocol driver for the `wxt -b firefox` dev browser.
//   node rdp.mjs <port> tabs
//   node rdp.mjs <port> eval <urlPart> '<js body; may await; return a value>'   (page world)
//   node rdp.mjs <port> addon '<js body>'                                         (the add-on's background page)
//   node rdp.mjs <port> open <url> | close <urlPart> | goto <urlPart> <url>
//   node rdp.mjs <port> login                                                     (creazy_dev, from .secrets; prints no secret)
//   node rdp.mjs <port> shot <urlPart> <out.png>
import fs from "node:fs";
import net from "node:net";

const [ , , portArg, command, ...args ] = process.argv;

class Rdp {
  constructor(port) {
    this.port = port;
    this.buffer = Buffer.alloc(0);
    this.waiters = [];
    this.results = new Map();
    this.resultWaiters = new Map();
    this.eventWaiters = [];
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.socket = net.connect(this.port, "127.0.0.1");
      this.socket.on("error", reject);
      this.socket.on("data", chunk => this.onData(chunk));
      this.waiters.push({ from: "root", resolve });
    });
  }

  onData(chunk) {
    this.buffer = Buffer.concat([ this.buffer, chunk ]);
    for (;;) {
      const colon = this.buffer.indexOf(58);
      if (colon < 0) return;
      const length = Number(this.buffer.subarray(0, colon).toString());
      if (this.buffer.length < colon + 1 + length) return;
      const packet = JSON.parse(this.buffer.subarray(colon + 1, colon + 1 + length).toString("utf8"));
      this.buffer = this.buffer.subarray(colon + 1 + length);
      this.dispatch(packet);
    }
  }

  dispatch(packet) {
    if (packet.type === "evaluationResult") {
      const waiter = this.resultWaiters.get(packet.resultID);
      if (waiter) {
        this.resultWaiters.delete(packet.resultID);
        waiter(packet);
      } else {
        this.results.set(packet.resultID, packet);
      }
      return;
    }
    if (packet.type && !packet.error) {
      for (const waiter of [ ...this.eventWaiters ]) waiter(packet);
      return;
    }
    const index = this.waiters.findIndex(waiter => waiter.from === packet.from);
    if (index >= 0) this.waiters.splice(index, 1)[0].resolve(packet);
  }

  request(to, type, extra = {}) {
    return new Promise((resolve) => {
      this.waiters.push({ from: to, resolve });
      const json = Buffer.from(JSON.stringify({ to, type, ...extra }), "utf8");
      this.socket.write(`${json.length}:`);
      this.socket.write(json);
    });
  }

  async evaluate(consoleActor, text) {
    const reply = await this.request(consoleActor, "evaluateJSAsync", { text });
    const ready = this.results.get(reply.resultID);
    if (ready) return ready;
    return new Promise(resolve => this.resultWaiters.set(reply.resultID, resolve));
  }

  async value(grip) {
    if (grip && typeof grip === "object" && grip.type === "longString") {
      return (await this.request(grip.actor, "substring", { start: 0, end: grip.length })).substring;
    }
    if (grip && typeof grip === "object" && grip.type === "undefined") return undefined;
    return grip;
  }

  /** Runs an async body, waits for it, and returns what it returned (JSON). */
  async run(consoleActor, body) {
    const key = `__adt_rdp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    await this.evaluate(consoleActor, `window[${JSON.stringify(key)}] = undefined; (async () => { ${body} })().then(v => { window[${JSON.stringify(key)}] = JSON.stringify({ ok: true, v }); }, e => { window[${JSON.stringify(key)}] = JSON.stringify({ ok: false, v: String((e && e.stack) || e) }); }); 0`);
    for (let i = 0; i < 600; i++) {
      const result = await this.evaluate(consoleActor, `window[${JSON.stringify(key)}]`);
      const value = await this.value(result.result);
      if (typeof value === "string") return JSON.parse(value);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error("timed out");
  }

  async tabs() {
    return (await this.request("root", "listTabs")).tabs ?? [];
  }

  async tabConsole(urlPart) {
    const tab = (await this.tabs()).find(candidate => candidate.url?.includes(urlPart));
    if (!tab) throw new Error(`no tab with ${urlPart}`);
    return { tab, frame: (await this.request(tab.actor, "getTarget")).frame };
  }

  async addonConsole() {
    const { addons } = await this.request("root", "listAddons");
    const addon = addons.find(candidate => /tools for autodarts/i.test(candidate.name));
    if (!addon) throw new Error("add-on not found");
    const { actor: watcher } = await this.request(addon.actor, "getWatcher");
    const found = new Promise((resolve) => {
      const waiter = (packet) => {
        const target = packet.type === "target-available-form" ? packet.target : undefined;
        if (target?.url?.endsWith("_generated_background_page.html")) {
          this.eventWaiters.splice(this.eventWaiters.indexOf(waiter), 1);
          resolve(target);
        }
      };
      this.eventWaiters.push(waiter);
    });
    await this.request(watcher, "watchTargets", { targetType: "frame" });
    return (await found).consoleActor;
  }
}

function secrets() {
  const out = {};
  for (const line of fs.readFileSync("/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/.secrets/autodarts.env", "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match) out[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const rdp = new Rdp(Number(portArg));
await rdp.connect();
const print = value => console.log(typeof value === "string" ? value : JSON.stringify(value, null, 1));

if (command === "tabs") {
  print((await rdp.tabs()).map(tab => `${tab.selected ? "*" : " "} ${tab.url}`).join("\n"));
} else if (command === "eval") {
  const { frame } = await rdp.tabConsole(args[0]);
  print(await rdp.run(frame.consoleActor, args[1]));
} else if (command === "addon") {
  print(await rdp.run(await rdp.addonConsole(), args[0]));
} else if (command === "open") {
  print(await rdp.run(await rdp.addonConsole(), `return (await browser.tabs.create({ url: ${JSON.stringify(args[0])}, active: true })).id;`));
} else if (command === "close") {
  print(await rdp.run(await rdp.addonConsole(), `const tabs = await browser.tabs.query({}); const ids = tabs.filter(t => (t.url || "").includes(${JSON.stringify(args[0])})).map(t => t.id); await browser.tabs.remove(ids); return ids;`));
} else if (command === "goto") {
  print(await rdp.run(await rdp.addonConsole(), `const tabs = await browser.tabs.query({}); const tab = tabs.find(t => (t.url || "").includes(${JSON.stringify(args[0])})); await browser.tabs.update(tab.id, { url: ${JSON.stringify(args[1])} }); return tab.id;`));
} else if (command === "login") {
  const s = secrets();
  const { frame } = await rdp.tabConsole("play.autodarts.com/login");
  const result = await rdp.run(frame.consoleActor, `
    const set = (el, v) => { Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); };
    for (let i = 0; i < 50 && !document.querySelector("#emailOrUsername"); i++) await new Promise(r => setTimeout(r, 100));
    set(document.querySelector("#emailOrUsername"), ${JSON.stringify(s.AUTODARTS_EMAIL_2)});
    set(document.querySelector("#password"), ${JSON.stringify(s.AUTODARTS_PASSWORD_2)});
    document.querySelector("button[type=submit]").click();
    return "submitted";`);
  print(result.ok ? "submitted" : "login failed");
} else if (command === "shot") {
  const { tab } = await rdp.tabConsole(args[0]);
  const root = await rdp.request("root", "getRoot");
  const shot = await rdp.request(root.screenshotActor, "capture", { args: { browsingContextID: tab.browsingContextID, fullpage: false, dpr: 1 } });
  const data = await rdp.value(shot.value?.data ?? shot.data);
  fs.writeFileSync(args[1], Buffer.from(String(data).split(",")[1], "base64"));
  print(args[1]);
}
rdp.socket.end();
```

Run: `node $SCR/rdp.mjs $FFPORT tabs`
Expected: the Firefox tab on `https://play.autodarts.com/…`. If `addon` fails with "add-on not found", print `listAddons` names and adjust the regex. If `shot` fails (the screenshot actor's API differs between Firefox versions), check the Firefox side by `eval` instead. Nothing else depends on screenshots.

- [ ] **Step 4: Sign in as creazy_dev in Firefox**

Run: `node $SCR/rdp.mjs $FFPORT goto play.autodarts.com https://play.autodarts.com/login`, then `node $SCR/rdp.mjs $FFPORT login`. After 5 s, run `node $SCR/rdp.mjs $FFPORT eval play.autodarts.com 'return location.pathname'`.
Expected: `submitted`, then a path that isn't `/login` or `/landing`. If it is `/consent`, stop and tell the user: the Terms click is theirs ([[autodarts-test-account-location]]).

- [ ] **Step 5: Test configs in both browsers**

`$SCR/cfg.mjs` (Chrome, over CDP, merging only the keys it names):

```js
// node cfg.mjs backup <file> | get | teams '<json for config.teams>'
import fs from "node:fs";
import { chromium } from "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/node_modules/playwright/index.mjs";

const [ , , command, arg ] = process.argv;
const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
const context = browser.contexts()[0];
let worker = context.serviceWorkers().find(w => w.url().includes("mgmgkokmogholhmpikfmeejmegmdadjj"));
if (!worker) worker = await context.waitForEvent("serviceworker", { timeout: 10000 });
if (command === "backup") {
  const all = await worker.evaluate(() => chrome.storage.local.get([ "config-2-0-0", "config-2-0-0$", "teams-lineups", "teams-shifts", "teams-room" ]));
  fs.writeFileSync(arg, JSON.stringify(all, null, 1));
  console.log("backed up", Object.keys(all));
} else if (command === "get") {
  console.log(JSON.stringify(await worker.evaluate(async () => (await chrome.storage.local.get("config-2-0-0"))["config-2-0-0"]?.teams), null, 1));
} else if (command === "teams") {
  const teams = JSON.parse(arg);
  console.log(await worker.evaluate(async (next) => {
    const all = await chrome.storage.local.get("config-2-0-0");
    const config = all["config-2-0-0"];
    config.teams = { ...config.teams, ...next };
    await chrome.storage.local.set({ "config-2-0-0": config });
    return JSON.stringify(config.teams);
  }, teams));
}
await browser.close().catch(() => {});
```

First check whether the extension ID matches with `curl -s 127.0.0.1:9222/json/list | grep service_worker`. Earlier this session it was `mgmgkokmogholhmpikfmeejmegmdadjj`. Then:

```bash
node $SCR/cfg.mjs backup $SCR/chrome-config-backup.json
node $SCR/cfg.mjs teams '{"enabled":true,"online":true}'
```

Then add the test team (keep the user's saved teams). Use `node $SCR/cfg.mjs get`, then write `saved` as `[{"name":"TEST RED","players":["ANNA","TOM"],"colour":{"preset":"crimson","from":"#6a1624","to":"#b8323f"},"format":"shared"}, …the existing entries…]`, passing the full `saved` array to `cfg.mjs teams '{"saved": […]}'`.

Firefox (temporary profile). Copy Chrome's config, with Teams set up as creazy_dev's:

```bash
CFG=$(node -e 'const b=require(process.argv[1]);const c=b["config-2-0-0"];c.teams={enabled:true,online:true,partnerRule:false,saved:[{name:"TEST BLUE",players:["LISA","MAX"],colour:{preset:"ocean",from:"#374c98",to:"#0b55df"},format:"shared"}]};process.stdout.write(JSON.stringify({"config-2-0-0":c,"config-2-0-0$":b["config-2-0-0$"]}))' $SCR/chrome-config-backup.json)
node $SCR/rdp.mjs $FFPORT addon "await browser.storage.local.set($CFG); return Object.keys(await browser.storage.local.get(null));"
```

Expected: the keys include `config-2-0-0`. Reload the Firefox autodarts tab (`goto`, to the same URL) so the content scripts read the config.

- [ ] **Step 6: Record the setup**

Append to `$SCR/SETUP.md`: `FFPORT`, how to call `rdp.mjs`, `cfg.mjs` and `ad.py`, and the clean-up still owed:
- the Chrome config: restore `teams` from `$SCR/chrome-config-backup.json`, keeping `online: true`
- delete `TEST RED`
- remove `teams-lineups`, `teams-shifts` and `teams-room` entries for test lobbies
- delete test lobbies and abort test matches
- stop the Firefox dev build and the local server at the end

---

### Task 8: The lobby: every participant, merged teams, the room, other accounts' rows

**Files:**
- Modify: `entrypoints/lobby.content/teams.ts`
- Modify: `entrypoints/lobby.content/local-lobby.ts` (`apply`, `claimBoards`)

**Interfaces:**
- Consumes:
  - `screenTeams`, `myRoomTeams`, `otherAccounts`, `roomOf`, `seatOwner`, `shouldJoin`, `ScreenTeams`, `RoomStore` (Task 3)
  - `RoomClient`, `RoomClientState`, `tokenIdentity` (Task 5)
  - `mirrorRoom` (Task 5)
  - `AutodartsToolsTeamRoom`, `SELECTORS.lobby.playerLinkButton` (Task 4)
- Produces: in `teams.ts`, the module functions `teamsView(): ScreenTeams`, `localLineup()`, `syncRoom()`, `stopRoom()` and `onClientState(state)`, which Task 9 extends.

Before editing, check Chrome's tabs as in Task 7, Step 1. No user tab may be on `/matches/`, and your own tabs must be parked.

- [ ] **Step 1: Imports, constants, state**

In `entrypoints/lobby.content/teams.ts`:

1. Add `AutodartsToolsTeamRoom` to the `@/utils/storage` import.
2. Add, keeping the file's grouping (types with the type imports, values with the value imports):
   ```ts
   import type { RoomStore, ScreenTeams } from "@/utils/team-room";
   import type { RoomClientState } from "@/utils/team-room-client";
   import type { SeatLike } from "@/utils/teams";
   import { myRoomTeams, otherAccounts, roomOf, screenTeams, seatOwner, shouldJoin } from "@/utils/team-room";
   import { RoomClient, tokenIdentity } from "@/utils/team-room-client";
   import { mirrorRoom } from "@/utils/team-room-mirror";
   ```
   (`SeatLike` joins the existing `@/utils/teams` type import, rather than a second import line.)
3. After `const EDIT_ATTR = …;`:
   ```ts
   /** On a row of another account's team: no pencil, and the site's 🌐 hidden. */
   const REMOTE_ATTR = "data-adt-team-remote";
   ```
4. At the end of `LOBBY_CSS` (inside the template string):
   ```css
     /* Online Teams: the site's "play on my board" would pull another account's team onto this board. */
     [${REMOTE_ATTR}] ${anyOf(SELECTORS.lobby.playerLinkButton)} { display: none !important; }
   ```
5. After `let reordering = false;`:
   ```ts
   /** Online Teams' switch (`teams.online`), followed live. */
   let online = true;
   /** What the team room last said of each lobby (utils/team-room.ts). */
   let roomStore: RoomStore = {};
   let unwatchRoom: (() => void) | null = null;
   /** This lobby's connection to the team room, while Teams and Online Teams are on. */
   let roomClient: RoomClient | null = null;
   let stopClientWatch: (() => void) | null = null;
   /** When each other account's first seat was seen in this lobby: the chip's "isn't connected" counts from it. */
   let firstSeen: Record<string, number> = {};
   let firstSeenLobby = "";
   ```

- [ ] **Step 2: Start, stop, config**

In `teams(ctx)`, after `lineups = (await AutodartsToolsTeamLineups.getValue()) ?? {};`:

```ts
  roomStore = (await AutodartsToolsTeamRoom.getValue()) ?? {};
```

After the lineups watcher:

```ts
  unwatchRoom?.();
  unwatchRoom = AutodartsToolsTeamRoom.watch((value?: RoomStore) => {
    roomStore = value ?? {};
    schedule();
  });
```

In `onRemove()`, before `teardown();`:

```ts
  unwatchRoom?.();
  unwatchRoom = null;
  stopRoom();
```

In `readConfig`, after `partnerRuleDefault = teamsConfig.partnerRule;`:

```ts
  online = teamsConfig.online;
```

- [ ] **Step 3: Whose lineup is whose**

Replace `currentLineup()` with these four:

```ts
/** This lobby's own-score lineup as this screen wrote it: this account's teams only. */
function localLineup(): Lineup | undefined {
  return lobby ? lineupOf(lineups, lobby.id) : undefined;
}

/** This lobby's teams as this screen shows them: its own, and what the room says of other accounts' (utils/team-room.ts). */
function teamsView(): ScreenTeams {
  return screenTeams({
    players: lobby?.players ?? [],
    saved,
    lineup: localLineup(),
    shifts: {},
    room: online ? roomOf(roomStore, lobby?.id) : undefined,
    me: hostId,
    hostId: lobby?.host?.id,
  });
}

/** This lobby's own-score teams, everyone's: what the order, the partner rule and the drawer's checks go by. */
function currentLineup(): Lineup | undefined {
  return teamsView().lineup;
}

/** The lobby's format once it has a team, anyone's: the first team sets it. */
function formatOf(view: ScreenTeams): TeamFormat | undefined {
  if (view.lineup?.teams.length) return "own";
  return view.shared.size ? "shared" : undefined;
}
```

Then switch the writers to the local lineup, so another account's teams are never written into this browser's lineup:
- `writeLineup`: `lineupPartnerRule(currentLineup(), partnerRuleDefault)` → `lineupPartnerRule(localLineup(), partnerRuleDefault)`.
- `writeLineupTeam`: `[ ...(currentLineup()?.teams ?? []) ]` → `[ ...(localLineup()?.teams ?? []) ]`.
- `openOwnEditor`: `currentLineup()?.teams.find(…)` → `localLineup()?.teams.find(…)`.
- `setPartnerRule`: both `currentLineup()` → `localLineup()`, and after the config write add `roomClient?.publishRule(on);`.

- [ ] **Step 4: The room**

Add after `oneTabAtATime`:

```ts
// ----------------------------------------------------------- online teams

/**
 * Online Teams: the lobby's room, joined while it has something to say about
 * this lobby, and told this account's teams and, from the host, the partner
 * rule. What it says comes back through the mirror, whose watch redraws.
 */
function syncRoom() {
  if (!online || !lobby) {
    stopRoom();
    return;
  }
  if (!roomClient) {
    roomClient = new RoomClient({ identity: tokenIdentity, onRoom: state => void mirrorRoom(state).catch(e => console.error(e)) });
    stopClientWatch = roomClient.subscribe(onClientState);
  }
  roomClient.start(lobby.id).catch(e => console.error(e));
  const players = lobby.players ?? [];
  const mine = myRoomTeams(players, saved, localLineup(), hostId);
  roomClient.setJoin(shouldJoin(players, mine, hostId));
  roomClient.publishTeams(mine);
  if (isHost()) roomClient.publishRule(lineupPartnerRule(localLineup(), partnerRuleDefault));
  if (firstSeenLobby !== lobby.id) {
    firstSeen = {};
    firstSeenLobby = lobby.id;
  }
  const now = Date.now();
  for (const account of otherAccounts(players, hostId)) firstSeen[account.userId] ??= now;
}

function stopRoom() {
  stopClientWatch?.();
  stopClientWatch = null;
  roomClient?.stop();
  roomClient = null;
}

/** The connection's news; the chip shows it (TeamRoomStatus.vue). */
function onClientState(_state: RoomClientState) {
  schedule();
}
```

- [ ] **Step 5: `apply()` and the rows**

Replace `apply()`:

```ts
function apply() {
  // Switched off in the settings: nothing of Teams in the lobby, until it's switched on again.
  if (!enabled) {
    teardown();
    stopRoom();
    return;
  }
  syncRoom();
  syncButton();
  const view = teamsView();
  const local = localLineup();
  if (local) pruneSeats(local);
  const lineup = view.lineup;
  if (lineup) {
    dressOwnRows(lineup, view.mine);
    keepOrder(lineup).catch(e => console.error(e));
  } else {
    dressRows(view);
  }
  noteUneven(lineup);
  syncPartnerCard(lineup);
}
```

In `syncButton()`, delete the `if (!isHost()) { existing?.remove(); return; }` block, since Add Team is for every participant now. Change its doc comment's "Only in a lobby the user hosts" (the file's header comment says the same: "Only in a lobby the user hosts: nobody else can add players there.") to: *every participant adds their own team, as the site lets every participant add players of their own; the seat order stays the host's*.

In `openDrawer`, change `if (!isHost() || !ctxRef) return;` to `if (!ctxRef) return;`.

Delete `teamsInLobby()`, and replace `dressRows` and `dress`:

```ts
/** The lobby's shared-score teams' rows, this account's and the others', found by name. */
function dressRows(view: ScreenTeams) {
  const byName = new Map([ ...view.shared.values() ].map(team => [ team.name, team ]));
  for (const row of qsa<HTMLElement>(SELECTORS.lobby.playerRows)) {
    const team = byName.get(normalizeName(qs(SELECTORS.lobby.playerNameInRow, row)?.textContent));
    if (team) dress(row, team, view.mine.has(team.name));
    else if (row.hasAttribute(ROW_ATTR)) undress(row);
  }
}

function dress(row: HTMLElement, team: SavedTeam, mine: boolean) {
  const key = `${team.name}|${team.players.join(",")}|${team.colour.from}|${team.colour.to}`;
  // Keyed on the order row alone. The pencil needs the row's ✕ to copy, and a
  // row drawn without one was redrawn every frame waiting for it.
  if (row.getAttribute(ROW_ATTR) !== key || !row.querySelector(".adt-team-order")) {
    row.setAttribute(ROW_ATTR, key);
    row.style.setProperty("--adt-team-from", team.colour.from);
    row.style.setProperty("--adt-team-to", team.colour.to);

    row.querySelector(".adt-team-order")?.remove();
    qs<HTMLElement>(SELECTORS.lobby.playerNameColumn, row)?.append(orderRow(team.players));
  }
  // Another account's team: theirs to edit, and to keep on their board.
  row.toggleAttribute(REMOTE_ATTR, !mine);
  if (!mine) {
    row.querySelector(".adt-team-edit")?.remove();
    return;
  }
  if (!row.querySelector(".adt-team-edit")) {
    addEditButton(row, team.name, () => {
      const current = findTeam(sharedTeams(saved), normalizeName(qs(SELECTORS.lobby.playerNameInRow, row)?.textContent));
      if (current) openDrawer(current);
    });
  }
}
```

In `dressOwnRows(lineup)`, change the signature to `dressOwnRows(lineup: Lineup, mine: ReadonlySet<string>)`. Replace its last line (`if (!row.querySelector(".adt-team-edit")) addEditButton(…)`) with:

```ts
    row.toggleAttribute(REMOTE_ATTR, !mine.has(team.name));
    if (!mine.has(team.name)) row.querySelector(".adt-team-edit")?.remove();
    else if (!row.querySelector(".adt-team-edit")) addEditButton(row, team.name, () => openOwnEditor(team.name));
```

In `undress`, add `row.removeAttribute(REMOTE_ATTR);`.

- [ ] **Step 6: The drawer sees everyone's teams, and offers only seats that are this account's to place**

In `drawerContext`, replace its first lines and the `lineup` and `format` ones:

```ts
  const view = teamsView();
  const lobbyTeams = [ ...view.shared.values() ].filter(team => team.name !== editing?.name);
```

`const lineup = currentLineup();` → `const lineup = view.lineup;`
`const format = lobbyFormat(lobby?.players ?? [], lineup, saved, hostId);` → `const format = formatOf(view);`

Before the `return {`:

```ts
  // Online Teams: a seat of an account whose own Tools is in the room is theirs to put on a team.
  const room = online ? roomOf(roomStore, lobby?.id) : undefined;
  const inRoom = new Set([ ...(room?.peers ?? []).map(peer => peer.userId), ...(room?.teams ?? []).map(team => team.owner) ]);
  const theirs = (seat: SeatLike) => {
    const owner = seatOwner(seat);
    return Boolean(owner) && owner !== hostId && inRoom.has(owner!);
  };
```

In the returned object:

```ts
    formatTeam: format === "own" ? (lineup?.teams[0]?.name ?? "") : ([ ...view.shared.values() ][0]?.name ?? ""),
    seats: (lobby?.players ?? []).filter(seat => seat.id && !theirs(seat)).map(seat => ({ id: seat.id!, name: normalizeName(seat.name), kind: memberOf(seat).kind, team: seatTeam.get(seat.id!) })),
```

Remove `lobbyFormat` from the `@/utils/teams` import if nothing else uses it (`grep -n lobbyFormat entrypoints/lobby.content/teams.ts`).

- [ ] **Step 7: Local Lobby leaves another account's team alone**

In `entrypoints/lobby.content/local-lobby.ts`: import `AutodartsToolsTeamRoom` from `@/utils/storage` and `roomOf, screenTeams` from `@/utils/team-room`. In `apply`, change `claimBoards();` to `await claimBoards(lobby, userId);`. Replace `claimBoards`:

```ts
/**
 * Pull everyone onto this board.
 *
 * Every player row carries a board button, which the site disables while that
 * player is already playing here — so an enabled one is precisely a player who
 * needs moving, and clicking it disables it. That makes this safe to run on
 * every render, with no bookkeeping of who has been moved.
 *
 * Online Teams: a seat of another account's team stays on that account's
 * board, whatever the button (utils/team-room.ts). Rows come in seat order.
 */
async function claimBoards(lobby: ILobbies, userId: string) {
  const room = roomOf(await AutodartsToolsTeamRoom.getValue(), lobby.id);
  const players = lobby.players ?? [];
  const theirs = new Set(screenTeams({ players, saved: [], lineup: undefined, shifts: {}, room, me: userId, hostId: lobby.host?.id }).remote.flatMap(team => team.seatIds));
  qsa(SELECTORS.lobby.playerRows).forEach((row, index) => {
    if (theirs.has(players[index]?.id ?? "")) return;
    const button = qs<HTMLButtonElement>(SELECTORS.lobby.playerBoardButton, row);
    if (!button || button.disabled) return;
    button.click();
    console.log("Autodarts Tools: Local Lobby - Moved a player onto this board");
  });
}
```

- [ ] **Step 8: Type-check, lint, build**

Run:
```bash
yarn compile 2>&1 | grep -E "lobby.content/(teams|local-lobby)" || echo "no new errors"
node_modules/.bin/eslint entrypoints/lobby.content/teams.ts entrypoints/lobby.content/local-lobby.ts
yarn i18n:check entrypoints/lobby.content/teams.ts
```
Expected: `no new errors`, then no ESLint errors, then the i18n check passes.

- [ ] **Step 9: Live, shared score, both browsers**

Use the browsers from Task 7.
1. **Create the lobby (A):** `python3 -c "import sys;sys.path.insert(0,'$SCR');import ad,json;st,l=ad.api(1,'POST','/gs/v0/lobbies',{'variant':'X01','settings':{'baseScore':121,'inMode':'Straight','outMode':'Straight','bullMode':'25/50','maxRounds':80},'bullOffMode':'Off','legs':2,'sets':None,'isPrivate':True});print(l['id'])"`. Keep the id as `L`.
2. **TEST RED (A):** add it as A's guest with `ad.api(1,'POST',f'/gs/v0/lobbies/{L}/players',{'name':'TEST RED','hostId':ad.me(1)['id']})`.
3. **Chrome:** open `https://play.autodarts.com/lobby/L` in a background tab of your own (`mcp__chrome-devtools__new_page`, `background: true`).
4. **Firefox:** `node $SCR/rdp.mjs $FFPORT goto play.autodarts.com https://play.autodarts.com/lobby/L`.
5. **TEST BLUE (B):** add it as B's guest: `ad.api(2,'POST',f'/gs/v0/lobbies/{L}/players',{'name':'TEST BLUE','hostId':ad.me(2)['id']})`.
6. **Expected after ≤ 3 s:**
   - `curl -s localhost:4455/health` shows `"rooms":1,"sockets":2`.
   - In Chrome (`evaluate_script` on your tab), `[...document.querySelectorAll('[data-adt-team]')].map(r => [r.querySelector('span.font-display')?.textContent, r.hasAttribute('data-adt-team-remote'), !!r.querySelector('.adt-team-edit'), [...r.querySelectorAll('.adt-team-chip')].map(c => c.textContent).join('>')])` gives `[["TEST RED", false, true, "ANNA>TOM"], ["TEST BLUE", true, false, "LISA>MAX"]]`.
   - In Firefox (`rdp.mjs eval play.autodarts.com 'return …the same expression…'`), the same with the flags reversed.
   - On TEST BLUE's row in Chrome, the 🌐 is hidden: `getComputedStyle(row.querySelector("button:has([data-icon='globe'])")).display === "none"`.
   - Add Team shows in Firefox (`#adt-add-team` exists).

If anything differs, use superpowers:systematic-debugging. Firefox's content-script console comes over RDP; Chrome's through `list_console_messages`.

- [ ] **Step 10: Live, own scores, the host's alternation**

In the same lobby, remove TEST RED and TEST BLUE (API, by index). Add A's guests ANNA and TOM, and B's guests LISA and MAX, with each account's token. Write each side's local lineup by seat ids (seat ids from `GET /gs/v0/lobbies/L`):
- **Chrome:** `cfg.mjs`-style `chrome.storage.local.set({"teams-lineups": {[L]: {at: Date.now(), teams: [{name: "TEST RED", colour: crimson, seatIds: [ANNA, TOM]}]}}})` (extend `cfg.mjs` with a `set <key> <json>` command).
- **Firefox:** `rdp.mjs addon 'await browser.storage.local.set({"teams-lineups": …TEST BLUE with LISA, MAX…})'`.

Expected within ~5 s: the lobby's seat order alternates (`GET /gs/v0/lobbies/L` names: ANNA, LISA, TOM, MAX, or LISA, ANNA, MAX, TOM), moved by Chrome (the host). Firefox moves nothing (a non-host's move would be a 403 in its console). Both screens show the "TEST RED · 1 of 2" style team labels for all four rows, with the pencil only on their own team's rows.

- [ ] **Step 11: Commit**

```bash
git add entrypoints/lobby.content/teams.ts entrypoints/lobby.content/local-lobby.ts
git commit -m "feat: Online Teams in the lobby: every captain adds their own team, and both screens show both"
```

---

### Task 9: The lobby's status chip, Invite a team, and the invitation

**Files:**
- Create: `entrypoints/lobby.content/TeamRoomStatus.vue`
- Create: `entrypoints/lobby.content/TeamInvite.vue`
- Modify: `entrypoints/lobby.content/teams.ts`
- Modify: `locales/en/teams.ts`, `locales/de/teams.ts`, `locales/nl/teams.ts`, and `locales/same-as-english.json` if the check asks for it

**Interfaces:**
- Consumes: `roomStatus`, `RoomStatus`, `RoomSeat`, `RoomState`, `Connection` (Task 3); `RoomClientState` (Task 5); `addSavedTeam`, `drawerContext`, `openDrawer` (in `teams.ts`).
- Produces:
  - `export interface StatusView { connection: Connection; rtt: number | undefined; joinedAt: number | undefined; room: RoomState | undefined; players: RoomSeat[]; me: string | null; firstSeen: Record<string, number>; myTeams: string[]; retry: () => void }`
  - `export interface InviteView { show: boolean; teams: { name: string; colour: ColorScheme }[]; host: string; game: { variant: string; score: number; legs: number; sets: number }; format: TeamFormat; saved: SavedTeam[]; other: SavedTeam[]; busy: boolean; problem: TeamsProblem; join: (team: SavedTeam) => void; newTeam: () => void; dismiss: () => void }`

  Both are exported from `teams.ts` for the two components.

- [ ] **Step 1: The catalogs (all three, same keys)**

In `locales/en/teams.ts`, add a top-level `online` group:

```ts
  online: {
    status: {
      connecting: "Connecting to Online Teams…",
      ready: "Online Teams ready",
      synced: "In sync with {names}",
      missing: { one: "{names} isn't connected", other: "{names} aren't connected" },
      offline: "Online Teams offline",
      outdated: "Update Tools for Online Teams",
    },
    card: {
      title: "Online Teams",
      server: "Server",
      online: "online · {ms} ms",
      onlineNoRtt: "online",
      connecting: "connecting…",
      offline: "offline",
      outdated: "needs a newer Tools",
      you: "{name} (you)",
      connected: "connected",
      notConnected: "not connected",
      shared: "Shared",
      sharedValue: "team names, players, colours, order",
      retry: "Retry",
      close: "Close",
    },
    invite: {
      button: "Invite a team",
      copied: "Link copied",
      copyFailed: "Couldn't copy the link",
    },
    invitation: {
      title: { one: "{teams} invites you to a team match", other: "{teams} invite you to a team match" },
      lobby: "{host}'s lobby · {details}",
      legs: { one: "{game} · First to {count} Leg", other: "{game} · First to {count} Legs" },
      sets: { one: "{game} · First to {count} Set", other: "{game} · First to {count} Sets" },
      join: "Join with {team}",
      newTeam: "New team",
      otherFormat: "This lobby plays {format}",
      formats: {
        shared: "shared score",
        own: "own scores",
      },
      dismiss: "Dismiss",
      busy: "Joining…",
    },
  },
```

`locales/de/teams.ts` (*du*; the site says *Erster bis*, *Leg/Legs*, *Einladen*; the format words follow `teams.formats`):

```ts
  online: {
    status: {
      connecting: "Verbinde mit Online-Teams…",
      ready: "Online-Teams bereit",
      synced: "Synchron mit {names}",
      missing: { one: "{names} ist nicht verbunden", other: "{names} sind nicht verbunden" },
      offline: "Online-Teams offline",
      outdated: "Aktualisiere Tools für Online-Teams",
    },
    card: {
      title: "Online-Teams",
      server: "Server",
      online: "online · {ms} ms",
      onlineNoRtt: "online",
      connecting: "verbinde…",
      offline: "offline",
      outdated: "braucht ein neueres Tools",
      you: "{name} (du)",
      connected: "verbunden",
      notConnected: "nicht verbunden",
      shared: "Geteilt",
      sharedValue: "Teamnamen, Spieler, Farben, Reihenfolge",
      retry: "Erneut versuchen",
      close: "Schließen",
    },
    invite: {
      button: "Team einladen",
      copied: "Link kopiert",
      copyFailed: "Link konnte nicht kopiert werden",
    },
    invitation: {
      title: { one: "{teams} lädt dich zu einem Teammatch ein", other: "{teams} laden dich zu einem Teammatch ein" },
      lobby: "Lobby von {host} · {details}",
      legs: { one: "{game} · Erster bis {count} Leg", other: "{game} · Erster bis {count} Legs" },
      sets: { one: "{game} · Erster bis {count} Set", other: "{game} · Erster bis {count} Sets" },
      join: "Mit {team} beitreten",
      newTeam: "Neues Team",
      otherFormat: "Diese Lobby spielt mit {format}",
      formats: {
        shared: "gemeinsamem Score",
        own: "eigenen Scores",
      },
      dismiss: "Ausblenden",
      busy: "Trete bei…",
    },
  },
```

`locales/nl/teams.ts` (*je*; the site says *Eerste tot*, *leg/legs*, *Uitnodigen*):

```ts
  online: {
    status: {
      connecting: "Verbinden met Online teams…",
      ready: "Online teams klaar",
      synced: "In sync met {names}",
      missing: { one: "{names} is niet verbonden", other: "{names} zijn niet verbonden" },
      offline: "Online teams offline",
      outdated: "Werk Tools bij voor Online teams",
    },
    card: {
      title: "Online teams",
      server: "Server",
      online: "online · {ms} ms",
      onlineNoRtt: "online",
      connecting: "verbinden…",
      offline: "offline",
      outdated: "heeft een nieuwere Tools nodig",
      you: "{name} (jij)",
      connected: "verbonden",
      notConnected: "niet verbonden",
      shared: "Gedeeld",
      sharedValue: "teamnamen, spelers, kleuren, volgorde",
      retry: "Opnieuw proberen",
      close: "Sluiten",
    },
    invite: {
      button: "Team uitnodigen",
      copied: "Link gekopieerd",
      copyFailed: "Kopiëren van de link is mislukt",
    },
    invitation: {
      title: { one: "{teams} nodigt je uit voor een teammatch", other: "{teams} nodigen je uit voor een teammatch" },
      lobby: "Lobby van {host} · {details}",
      legs: { one: "{game} · Eerste tot {count} leg", other: "{game} · Eerste tot {count} legs" },
      sets: { one: "{game} · Eerste tot {count} set", other: "{game} · Eerste tot {count} sets" },
      join: "Meedoen met {team}",
      newTeam: "Nieuw team",
      otherFormat: "Deze lobby speelt met {format}",
      formats: {
        shared: "gedeelde score",
        own: "eigen scores",
      },
      dismiss: "Verbergen",
      busy: "Bezig met meedoen…",
    },
  },
```

Run: `yarn i18n:check`
Expected: it passes, or it flags keys whose German or Dutch is rightly the English. Those include `teams.online.card.server` (*Server*), `…card.online` and `…card.onlineNoRtt` (*online*), `…card.offline` (*offline*), and possibly the `offline` badge in Task 10. Add each flagged key, under `de` and/or `nl` as flagged, to `locales/same-as-english.json`, keeping its sort order, and re-run until it passes. A flag on any other key is a translation to fix, not to list.

- [ ] **Step 2: `TeamRoomStatus.vue`**

```vue
<template>
  <div class="adt-room">
    <button
      @click="open = !open"
      :aria-expanded="open"
      :class="`is-${status.kind}`"
      class="adt-room-chip"
      type="button"
    >
      {{ chipText }}
    </button>
    <div v-if="open" :aria-label="t('teams.online.card.title')" class="adt-room-card" role="dialog" @keydown.esc="open = false">
      <div class="adt-room-head">
        <b>{{ t("teams.online.card.title") }}</b>
        <button @click="open = false" :aria-label="t('teams.online.card.close')" class="adt-room-x" type="button">
          <span aria-hidden="true" class="icon-[material-symbols--close-rounded]" />
        </button>
      </div>
      <div class="adt-room-line">
        <span>{{ t("teams.online.card.server") }}</span><span :class="serverClass">{{ serverText }}</span>
      </div>
      <div v-for="account in accounts" :key="account.userId" class="adt-room-line">
        <span>{{ account.you ? t("teams.online.card.you", { name: account.name }) : account.name }}</span>
        <span :class="account.connected ? 'is-ok' : 'is-warn'">
          {{ account.connected ? t("teams.online.card.connected") : t("teams.online.card.notConnected") }}<template v-if="account.teams.length"> · {{ account.teams.join(", ") }}</template>
        </span>
      </div>
      <div class="adt-room-line">
        <span>{{ t("teams.online.card.shared") }}</span><span>{{ t("teams.online.card.sharedValue") }}</span>
      </div>
      <button @click="view.retry()" class="adt-room-retry" type="button">
        {{ t("teams.online.card.retry") }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { StatusView } from "./teams";
import type { MessageKey } from "@/utils/i18n";
import type { StatusKind } from "@/utils/team-room";

import { list } from "@/utils/i18n";
import { normalizeName } from "@/utils/teams";
import { otherAccounts, roomStatus } from "@/utils/team-room";

const props = defineProps<{ view: StatusView }>();

/** How often the chip looks again: its "isn't connected" turns up after a while, not on an event. */
const TICK_MS = 2000;
const CHIP: Record<Exclude<StatusKind, "synced" | "missing">, MessageKey> = {
  connecting: "teams.online.status.connecting",
  ready: "teams.online.status.ready",
  offline: "teams.online.status.offline",
  outdated: "teams.online.status.outdated",
};

const { t } = useI18n();

const now = ref(Date.now());
const open = ref(false);

const status = computed(() => roomStatus({ ...props.view, now: now.value }));
const chipText = computed(() => {
  const { kind, names } = status.value;
  if (kind === "synced") return t("teams.online.status.synced", { names: list(names) });
  if (kind === "missing") return t("teams.online.status.missing", { names: list(names), count: names.length });
  return t(CHIP[kind]);
});
const serverText = computed(() => {
  const { connection, rtt } = props.view;
  if (connection === "connected") return rtt === undefined ? t("teams.online.card.onlineNoRtt") : t("teams.online.card.online", { ms: String(rtt) });
  if (connection === "outdated") return t("teams.online.card.outdated");
  if (connection === "offline") return t("teams.online.card.offline");
  return t("teams.online.card.connecting");
});
const serverClass = computed(() => (props.view.connection === "connected" ? "is-ok" : props.view.connection === "connecting" ? "" : "is-warn"));
/** This account first, then everyone else with seats here: whether their Tools is in the room, and their teams. */
const accounts = computed(() => {
  const { room, me, players, myTeams, connection } = props.view;
  const peers = new Set((room?.peers ?? []).map(peer => peer.userId));
  const teamsOf = (userId: string) => (room?.teams ?? []).filter(team => team.owner === userId).map(team => normalizeName(team.name));
  const self = (room?.peers ?? []).find(peer => peer.userId === me);
  const out = me ? [ { userId: me, name: normalizeName(self?.name ?? ""), you: true, connected: connection === "connected" && peers.has(me), teams: myTeams } ] : [];
  for (const account of otherAccounts(players, me)) out.push({ userId: account.userId, name: account.name, you: false, connected: peers.has(account.userId), teams: teamsOf(account.userId) });
  return out;
});

let timer: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now();
  }, TICK_MS);
});

onBeforeUnmount(() => clearInterval(timer));
</script>

<style scoped>
.adt-room { position: relative; display: inline-flex; font-family: var(--ad-font-body, Manrope, system-ui, sans-serif); }
.adt-room-chip {
  display: inline-flex; align-items: center; gap: 6px; height: 26px; padding: 0 10px; border: 0; border-radius: 999px;
  font-size: 11px; font-weight: 700; line-height: 1; white-space: nowrap; cursor: pointer;
  color: #a0a6b8; background: rgb(160 166 184 / 12%);
}
.adt-room-chip::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
.adt-room-chip.is-connecting::before { animation: adt-room-pulse 1.2s ease-in-out infinite; }
.adt-room-chip.is-ready, .adt-room-chip.is-synced { color: #49da9e; background: rgb(73 218 158 / 12%); }
.adt-room-chip.is-missing { color: #f29727; background: rgb(242 151 39 / 12%); }
.adt-room-chip.is-offline, .adt-room-chip.is-outdated { color: #ff6b81; background: rgb(226 78 103 / 14%); }
.adt-room-card {
  position: absolute; top: calc(100% + 8px); left: 0; z-index: 60; width: 300px; box-sizing: border-box;
  padding: 12px 14px; border-radius: 12px; background: #0b0b23; border: 1px solid rgb(255 255 255 / 10%);
  box-shadow: 0 12px 30px rgb(0 0 0 / 45%); color: #f7f8fa; font-size: 11.5px;
}
.adt-room-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; font-size: 13px; }
.adt-room-x { border: 0; background: none; color: #a0a6b8; cursor: pointer; display: inline-flex; padding: 2px; }
.adt-room-line { display: flex; justify-content: space-between; gap: 10px; padding: 5px 0; border-bottom: 1px solid rgb(255 255 255 / 6%); }
.adt-room-line > span:first-child { color: #a0a6b8; }
.adt-room-line > span:last-child { text-align: right; }
.is-ok { color: #49da9e; font-weight: 700; }
.is-warn { color: #f29727; font-weight: 700; }
.adt-room-retry { margin-top: 10px; border: 0; border-radius: 7px; padding: 6px 12px; font-size: 11px; font-weight: 800; color: #fff; background: #0b55df; cursor: pointer; }
@keyframes adt-room-pulse { 50% { opacity: .25; } }
@media (prefers-reduced-motion: reduce) { .adt-room-chip.is-connecting::before { animation: none; } }
</style>
```

- [ ] **Step 3: `TeamInvite.vue`**

```vue
<template>
  <div v-if="view.show" :aria-label="title" class="adt-invite" role="region">
    <div class="adt-invite-head">
      <div>
        <p class="adt-invite-title">
          {{ title }}
        </p>
        <p class="adt-invite-sub">
          {{ t("teams.online.invitation.lobby", { host: view.host, details }) }}
        </p>
      </div>
      <button @click="view.dismiss()" :aria-label="t('teams.online.invitation.dismiss')" class="adt-invite-x" type="button">
        <span aria-hidden="true" class="icon-[material-symbols--close-rounded]" />
      </button>
    </div>
    <div class="adt-invite-picks">
      <button
        v-for="team in view.saved"
        @click="view.join(team)"
        :key="team.name"
        :disabled="view.busy"
        class="adt-invite-pick is-go"
        type="button"
      >
        <i :style="{ backgroundImage: gradient(team.colour) }" />{{ t("teams.online.invitation.join", { team: team.name }) }}<small>{{ team.players.join(" ▸ ") }}</small>
      </button>
      <button @click="view.newTeam()" :disabled="view.busy" class="adt-invite-pick" type="button">
        {{ t("teams.online.invitation.newTeam") }}
      </button>
      <span v-for="team in view.other" :key="team.name" :title="t('teams.online.invitation.otherFormat', { format: formatText })" class="adt-invite-pick is-dim">
        <i :style="{ backgroundImage: gradient(team.colour) }" />{{ team.name }}
      </span>
    </div>
    <p v-if="view.busy || view.problem" class="adt-invite-note" aria-live="polite">
      {{ view.busy ? t("teams.online.invitation.busy") : problem }}
    </p>
  </div>
</template>

<script setup lang="ts">
import type { InviteView } from "./teams";

import { gradient } from "@/utils/colors";
import { list } from "@/utils/i18n";
import { GameMode, gameModeLabelKey } from "@/utils/game-modes";
import { problemText } from "@/utils/teams-text";

const props = defineProps<{ view: InviteView }>();

const { t } = useI18n();

const title = computed(() => t("teams.online.invitation.title", { teams: list(props.view.teams.map(team => team.name)), count: props.view.teams.length }));
/** The lobby's game in the site's own words: the X01 score, or the mode's name, and what wins it. */
const details = computed(() => {
  const { variant, score, legs, sets } = props.view.game;
  const game = variant === GameMode.X01 ? String(score) : t(gameModeLabelKey(variant));
  return sets ? t("teams.online.invitation.sets", { game, count: sets }) : t("teams.online.invitation.legs", { game, count: legs });
});
const formatText = computed(() => t(props.view.format === "own" ? "teams.online.invitation.formats.own" : "teams.online.invitation.formats.shared"));
const problem = computed(() => (props.view.problem ? problemText(props.view.problem) : ""));
</script>

<style scoped>
.adt-invite {
  box-sizing: border-box; margin: 0 0 16px; padding: 12px 14px; border-radius: 14px; color: #f7f8fa;
  background: linear-gradient(100deg, rgb(106 22 36 / 55%), rgb(184 50 63 / 35%)); border: 1px solid rgb(184 50 63 / 60%);
  font-family: var(--ad-font-body, Manrope, system-ui, sans-serif);
}
.adt-invite-head { display: flex; justify-content: space-between; gap: 12px; }
.adt-invite-title { margin: 0; font-size: 14px; font-weight: 800; }
.adt-invite-sub { margin: 2px 0 10px; font-size: 12px; color: #dbe1eb; }
.adt-invite-x { align-self: flex-start; border: 0; background: none; color: #dbe1eb; cursor: pointer; display: inline-flex; padding: 2px; }
.adt-invite-picks { display: flex; flex-wrap: wrap; gap: 8px; }
.adt-invite-pick {
  display: inline-flex; align-items: center; gap: 7px; padding: 7px 11px 7px 8px; border: 0; border-radius: 9px;
  font-size: 12px; font-weight: 700; color: #f7f8fa; background: rgb(0 0 0 / 35%); cursor: pointer;
}
.adt-invite-pick:disabled { opacity: .6; cursor: default; }
.adt-invite-pick.is-go { background: #0b55df; }
.adt-invite-pick.is-dim { opacity: .45; cursor: default; }
.adt-invite-pick i { width: 14px; height: 14px; border-radius: 4px; display: inline-block; }
.adt-invite-pick small { font-size: 10.5px; font-weight: 600; opacity: .8; }
.adt-invite-note { margin: 8px 0 0; font-size: 12px; color: #ffd7dd; }
</style>
```

`utils/game-modes.ts` exports the groups (`GAME_MODE_GROUPS`, each with `modes: { mode, labelKey }[]`) but no lookup by variant. Add one after `GAME_MODE_GROUPS`:

```ts
/** A mode's label key, by the site's variant name; X01's for a variant the groups don't list. */
export function gameModeLabelKey(variant: string): MessageKey {
  for (const group of GAME_MODE_GROUPS) {
    const found = group.modes.find(entry => entry.mode === variant);
    if (found) return found.labelKey;
  }
  return "gameModes.modes.x01";
}
```

The fallback can't happen for a lobby Teams runs in, and it keeps text out of code. `MessageKey` is already imported there.

- [ ] **Step 4: Mount them, and the Invite button, from `teams.ts`**

In `teams.ts`:

1. Import `TeamInvite from "./TeamInvite.vue"` and `TeamRoomStatus from "./TeamRoomStatus.vue"` (next to `AddTeamDrawer`). Add `Connection`, `RoomSeat` and `RoomState` to the `@/utils/team-room` type import.
2. After `DrawerState`, add the two exported interfaces from **Interfaces** above. Then add:

```ts
const INVITE_ID = "adt-invite-team";

/** Material Symbols "link" (Apache 2.0). */
const ICON_LINK = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M7 17q-2.075 0-3.537-1.463T2 12t1.463-3.537T7 7h3q.425 0 .713.288T11 8t-.288.713T10 9H7q-1.25 0-2.125.875T4 12t.875 2.125T7 15h3q.425 0 .713.288T11 16t-.288.713T10 17zm2-4q-.425 0-.712-.288T8 12t.288-.712T9 11h6q.425 0 .713.288T16 12t-.288.713T15 13zm5 4q-.425 0-.712-.288T13 16t.288-.712T14 15h3q1.25 0 2.125-.875T20 12t-.875-2.125T17 9h-3q-.425 0-.712-.288T13 8t.288-.712T14 7h3q2.075 0 3.538 1.463T22 12t-1.463 3.538T17 17z\"/></svg>";

/** What the status chip shows; shared with TeamRoomStatus.vue. */
const statusView = reactive<StatusView>({ connection: "idle", rtt: undefined, joinedAt: undefined, room: undefined, players: [], me: null, firstSeen: {}, myTeams: [], retry: () => roomClient?.retry() });

/** What the invitation shows; shared with TeamInvite.vue. */
const inviteView = reactive<InviteView>({
  show: false,
  teams: [],
  host: "",
  game: { variant: "X01", score: 501, legs: 1, sets: 0 },
  format: "shared",
  saved: [],
  other: [],
  busy: false,
  problem: undefined,
  join: team => void joinWith(team),
  newTeam: () => void openDrawer(null),
  dismiss: () => {
    if (lobby) dismissed.add(lobby.id);
    inviteView.show = false;
  },
});

let statusUi: any = null;
let inviteUi: any = null;
let inviteLabel: Text | null = null;
/** Lobbies whose invitation was dismissed, for as long as the page is open. */
const dismissed = new Set<string>();
```

3. `onClientState` becomes:

```ts
/** The connection's news, for the chip; a (re)join can change what is shown, so the lobby is redrawn too. */
function onClientState(state: RoomClientState) {
  Object.assign(statusView, { connection: state.connection, rtt: state.rtt, joinedAt: state.joinedAt, room: state.room });
  schedule();
}
```

4. At the end of `apply()` (in the enabled path), add `syncOnline(view);`. In `teardown()`, add `removeOnline();`. In `relabel()`, add `if (inviteLabel) inviteLabel.textContent = t("teams.online.invite.button");`.

5. Add:

```ts
/** Online Teams in the lobby's own parts: the chip, Invite a team (the host's), and the invitation. */
function syncOnline(view: ScreenTeams) {
  if (!online || !lobby || !ctxRef) {
    removeOnline();
    return;
  }
  Object.assign(statusView, { players: lobby.players ?? [], me: hostId, firstSeen: { ...firstSeen }, myTeams: [ ...view.mine ] });
  syncInviteButton();
  const format: TeamFormat = view.remote.some(team => team.format === "own") ? "own" : "shared";
  Object.assign(inviteView, {
    show: view.remote.length > 0 && view.mine.size === 0 && !dismissed.has(lobby.id),
    teams: view.remote.map(team => ({ name: team.name, colour: team.colour })),
    host: normalizeName(lobby.host?.name),
    game: { variant: lobby.variant, score: lobby.settings?.baseScore ?? 0, legs: lobby.legs ?? 1, sets: lobby.sets ?? 0 },
    format,
    saved: saved.filter(team => team.format === format && !(lobby!.sets && team.format === "own")),
    other: saved.filter(team => team.format !== format),
  });
  if (!statusUi) mountStatus().catch(e => console.error(e));
  if (!inviteUi) mountInvite().catch(e => console.error(e));
}

function removeOnline() {
  statusUi?.remove();
  statusUi = null;
  inviteUi?.remove();
  inviteUi = null;
  document.getElementById(INVITE_ID)?.remove();
  inviteLabel = null;
}

/** The chip, after the seat count in the Players card's header; WXT mounts it whenever the header is there. */
async function mountStatus() {
  const ui = await createShadowRootUi(ctxRef, {
    name: "autodarts-tools-team-room-status",
    position: "inline",
    anchor: () => qs<HTMLElement>(SELECTORS.lobby.playerCountChip) ?? null,
    append: "after",
    onMount: (container: HTMLElement) => {
      const app = createApp(TeamRoomStatus, { view: statusView });
      app.mount(container);
      return app;
    },
    onRemove: (app: any) => app?.unmount(),
  });
  if (statusUi || !online) return;
  statusUi = ui;
  ui.autoMount();
}

/** The invitation, above the Players card. */
async function mountInvite() {
  const ui = await createShadowRootUi(ctxRef, {
    name: "autodarts-tools-team-invite",
    position: "inline",
    anchor: () => qs<HTMLElement>(SELECTORS.lobby.playersCardHeader)?.parentElement ?? null,
    append: "before",
    onMount: (container: HTMLElement) => {
      const app = createApp(TeamInvite, { view: inviteView });
      app.mount(container);
      return app;
    },
    onRemove: (app: any) => app?.unmount(),
  });
  if (inviteUi || !online) return;
  inviteUi = ui;
  ui.autoMount();
}

/**
 * Invite a team, the host's: a copy of the site's Shuffle, as Discord Webhooks
 * copies it, before it in the Players card's header. It copies the lobby's
 * own link: the site's /join/ link would seat whoever opens it as a player too.
 */
function syncInviteButton() {
  const existing = document.getElementById(INVITE_ID) as HTMLButtonElement | null;
  if (!isHost()) {
    existing?.remove();
    return;
  }
  const shuffle = qs<HTMLButtonElement>(SELECTORS.lobby.shuffleButton);
  if (!shuffle?.parentElement) return;
  let button = existing;
  if (!button) {
    button = shuffle.cloneNode(false) as HTMLButtonElement;
    for (const attr of [ "data-disabled", "aria-disabled", "data-focus-visible", "aria-describedby", "tabindex" ]) button.removeAttribute(attr);
    button.id = INVITE_ID;
    button.type = "button";
    button.innerHTML = ICON_LINK;
    inviteLabel = document.createTextNode(t("teams.online.invite.button"));
    button.append(inviteLabel);
    button.addEventListener("click", () => {
      copyInvite().catch(e => console.error(e));
    });
  }
  if (shuffle.previousElementSibling !== button) shuffle.before(button);
}

async function copyInvite() {
  if (!lobby) return;
  const copied = await navigator.clipboard.writeText(`https://play.autodarts.com/lobby/${lobby.id}`).then(() => true, () => false);
  if (inviteLabel) inviteLabel.textContent = t(copied ? "teams.online.invite.copied" : "teams.online.invite.copyFailed");
  setTimeout(() => {
    if (inviteLabel) inviteLabel.textContent = t("teams.online.invite.button");
  }, 2000);
}

/** The invitation's one tap: the saved team seated on this account's board, as the drawer's saved teams are. */
async function joinWith(team: SavedTeam) {
  inviteView.busy = true;
  inviteView.problem = undefined;
  try {
    Object.assign(drawer, drawerContext(null));
    inviteView.problem = await addSavedTeam(team);
  } finally {
    inviteView.busy = false;
  }
}
```

Check `createShadowRootUi`'s `autoMount` in this WXT version (`grep -rn "autoMount" node_modules/wxt/dist/*.d.mts | head -3`). If it isn't there, keep the mounted UI by re-mounting in `syncOnline` whenever `!document.contains(ui.shadowHost)` (`ui.remove(); ui.mount();`).

- [ ] **Step 5: Type-check, lint, i18n**

Run:
```bash
yarn compile 2>&1 | grep -E "lobby.content/(teams|TeamRoomStatus|TeamInvite)|game-modes" || echo "no new errors"
node_modules/.bin/eslint entrypoints/lobby.content/teams.ts entrypoints/lobby.content/TeamRoomStatus.vue entrypoints/lobby.content/TeamInvite.vue utils/game-modes.ts
yarn i18n:check
```
Expected: no new errors, ESLint clean, and the i18n check passes (`same-as-english.json` updated as in Step 1).

- [ ] **Step 6: Live, both browsers**

1. **Chrome:** a fresh lobby `L2` as A, with the guest TEST RED (Task 8, Step 9). Open it in your Chrome tab.
   - The chip says `Online Teams ready`, and `#adt-invite-team` is in the header.
   - Click it (`mcp__chrome-devtools__click`). Its label reads `Link copied` for 2 s.
   - Read `navigator.clipboard.readText()` in the page. It should be `https://play.autodarts.com/lobby/L2`. Skip this check if Chrome asks for permission.
2. **Firefox:** `goto` that link.
   - The invitation shows: title `TEST RED invites you to a team match` and `CREAZY's lobby · 121 · First to 2 Legs`. Read the shadow root through `document.querySelector('autodarts-tools-team-invite').shadowRoot.textContent`.
   - It offers `Join with TEST BLUE`.
   - Click it from page context: `…shadowRoot.querySelector('.adt-invite-pick.is-go').click()`.
   - Expected within 3 s: B's guest TEST BLUE is in the lobby (API), and the invitation is gone.
   - Chrome's chip reads `In sync with CREAZY_DEV`, and Firefox's `In sync with CREAZY`.
   - Chrome's card (open it with a click) lists `CREAZY (you)` ✓ connected · TEST RED, and `CREAZY_DEV` ✓ connected · TEST BLUE.
3. **Missing:** set `teams.enabled: false` in Firefox (`rdp.mjs addon`, merging into `config-2-0-0`). Within 12 s, Chrome's chip reads `CREAZY_DEV isn't connected`. Set it back to `true`. Within a few seconds the chip is back to `In sync…`.
4. **Offline:** stop the local server (kill the `bun run dev` task). Within ~2 s both chips read `Online Teams offline`, and both lobbies still show both teams (the mirror). Start the server again. Both are back `In sync` within ~15 s, with no reload.
5. **German:** set `localStorage["autodarts.settings.language"] = "de"` in Chrome, reload your tab, and check that the chip, card and Invite button are German. Set it back.

- [ ] **Step 7: Commit**

```bash
git add entrypoints/lobby.content/teams.ts entrypoints/lobby.content/TeamRoomStatus.vue entrypoints/lobby.content/TeamInvite.vue utils/game-modes.ts locales/en/teams.ts locales/de/teams.ts locales/nl/teams.ts locales/same-as-english.json
git commit -m "feat: the lobby's Online Teams status, Invite a team, and the invitation to join with a saved team"
```

---

### Task 10: The match: merged teams, your own taps, shifts, the guarded undo, the offline badge

**Files:**
- Modify: `entrypoints/match.content/teams.ts`
- Modify: `entrypoints/match.content/TeamsPill.vue`
- Modify: `utils/teams-pill.ts` (`PillView`, `view()`)
- Modify: `locales/{en,de,nl}/teams.ts` (`teams.online.offline`)

**Interfaces:**
- Consumes:
  - `screenTeams`, `myRoomTeams`, `roomOf`, `shouldJoin`, `undoActor`, `undoKey`, `ScreenTeams`, `RoomStore`, `Connection` (Task 3)
  - `RoomClient`, `tokenIdentity` (Task 5)
  - `mirrorRoom` (Task 5)
  - `AutodartsToolsTeamRoom` (Task 4)
- Produces: `PillView.offline: boolean`.

Before editing, check the user's tabs (no `/matches/` tab of theirs), and park your own.

- [ ] **Step 1: Catalogs**

`locales/en/teams.ts`, inside `online`:

```ts
    offline: {
      badge: "Teams offline",
      hint: "Online Teams is offline: the other team's players may be out of date.",
    },
```

`locales/de/teams.ts`:

```ts
    offline: {
      badge: "Teams offline",
      hint: "Online-Teams ist offline: Die Spieler des anderen Teams sind vielleicht nicht aktuell.",
    },
```

`locales/nl/teams.ts`:

```ts
    offline: {
      badge: "Teams offline",
      hint: "Online teams is offline: de spelers van het andere team zijn misschien niet actueel.",
    },
```

`teams.online.offline.badge` is rightly the English in both. Add it to `locales/same-as-english.json` under `de` and `nl`, in sort order, if `yarn i18n:check` flags it.

- [ ] **Step 2: `PillView.offline` and the badge**

In `utils/teams-pill.ts`, add to `PillView`:

```ts
  /** Online Teams: the room can't be reached, in a match with another account's team. */
  offline: boolean;
```

In `view()`'s returned object, add `offline: false,` before `...parts`.

In `TeamsPill.vue`, inside `.adt-teams-status`, before its last `<span class="adt-teams-line" …>`:

```vue
      <span v-if="view.offline" :title="t('teams.online.offline.hint')" class="adt-teams-offline" role="status">{{ t("teams.online.offline.badge") }}</span>
```

And in its `<style scoped>`:

```css
/* Online Teams' outage, inside the one line: the board doesn't move when the room drops. */
.adt-teams-offline {
  flex: none; padding: 3px 8px; border-radius: 999px; white-space: nowrap;
  font-size: 10.5px; font-weight: 800; color: #ffb4c0; background: rgb(226 78 103 / 18%);
}
```

- [ ] **Step 3: `entrypoints/match.content/teams.ts`: imports, state, start, stop**

1. Add `AutodartsToolsTeamRoom` to the storage import.
2. Add these imports, keeping the grouping:
   ```ts
   import type { Connection, RoomStore, ScreenTeams } from "@/utils/team-room";
   import { myRoomTeams, roomOf, screenTeams, shouldJoin, undoActor, undoKey } from "@/utils/team-room";
   import { RoomClient, tokenIdentity } from "@/utils/team-room-client";
   import { mirrorRoom } from "@/utils/team-room-mirror";
   ```
3. Add `offline: false` to the `pill` reactive's initial object.
4. After `let lastUndo = "";`:
   ```ts
   /** Online Teams' switch (`teams.online`), followed live. */
   let online = true;
   /** What the team room last said of each lobby, which is each match's too (utils/team-room.ts). */
   let roomStore: RoomStore = {};
   let unwatchRoom: (() => void) | null = null;
   /** This match's connection to the team room, while Teams and Online Teams are on. */
   let roomClient: RoomClient | null = null;
   let stopClientWatch: (() => void) | null = null;
   let connection: Connection = "idle";
   ```
5. In `teams(ctx)`, after `lineupStore = …;`, add `roomStore = (await AutodartsToolsTeamRoom.getValue()) ?? {};`. After the lineups watcher:
   ```ts
     unwatchRoom?.();
     unwatchRoom = AutodartsToolsTeamRoom.watch((value) => {
       roomStore = value ?? {};
       schedule();
     });
   ```
6. In `onRemove()`, add `unwatchRoom?.(); unwatchRoom = null; stopRoom();` before `clear();`.
7. In `readConfig`, add `online = teamsConfig.online;`.

- [ ] **Step 4: `apply`, the two views, and the room**

Replace `apply`, and change the two `apply…` functions' signatures and data:

```ts
function apply() {
  // Switched off in the settings: nothing of Teams on the page, until it's switched on again.
  if (!enabled) {
    clear();
    stopRoom();
    return;
  }
  if (match) syncRoom(match);
  const view = match ? teamsView(match) : undefined;
  if (view?.lineup) applyOwn(view);
  else applyShared(view);
}

/** This match's teams as this screen shows them: its own, and the other accounts' from the room (utils/team-room.ts). */
function teamsView(current: IMatch): ScreenTeams {
  return screenTeams({
    players: current.players ?? [],
    saved,
    lineup: lineupOf(lineupStore, current.id),
    shifts: shiftsOf(shiftStore, current.id),
    room: online ? roomOf(roomStore, current.id) : undefined,
    me: hostId,
    hostId: current.host?.id,
  });
}

/** The pill's offline badge: only while the room can't be reached and the other team's players came from it. */
function offlineNote(view: ScreenTeams): boolean {
  return online && view.remote.length > 0 && (connection === "offline" || connection === "outdated");
}

/**
 * Online Teams in the match: the lobby's room, which keeps the lobby's id,
 * told this account's teams again (a restarted server has lost them) and, from
 * the host, the partner rule.
 */
function syncRoom(current: IMatch) {
  if (!online) {
    stopRoom();
    return;
  }
  if (!roomClient) {
    roomClient = new RoomClient({ identity: tokenIdentity, onRoom: state => void mirrorRoom(state).catch(e => console.error(e)) });
    stopClientWatch = roomClient.subscribe((state) => {
      if (state.connection === connection) return;
      connection = state.connection;
      schedule();
    });
  }
  roomClient.start(current.id).catch(e => console.error(e));
  const players = current.players ?? [];
  const lineup = lineupOf(lineupStore, current.id);
  const mine = myRoomTeams(players, saved, lineup, hostId);
  roomClient.setJoin(shouldJoin(players, mine, hostId));
  roomClient.publishTeams(mine);
  if (hostId && current.host?.id === hostId && lineup) roomClient.publishRule(lineupPartnerRule(lineup, partnerRuleDefault));
}

function stopRoom() {
  stopClientWatch?.();
  stopClientWatch = null;
  roomClient?.stop();
  roomClient = null;
  connection = "idle";
}
```

`applyShared` becomes `applyShared(view: ScreenTeams | undefined)`:
- `const seats = view?.shared ?? new Map<number, SavedTeam>();`
- `if (!match || !view || !seats.size) { clear(); return; }`
- `const shifts = view.shifts;`
- `dressCards(seats, shifts, up, view.mine);`
- `Object.assign(pill, sharedPill(match, seats, shifts, otherCard), { offline: offlineNote(view) });`

`applyOwn` becomes `applyOwn(view: ScreenTeams)`, with `const lineup = view.lineup!;` as its first line, and its pill line becomes:

```ts
  Object.assign(pill, ownPill(match!, lineup, { other: otherCard, partnerRule: lineupPartnerRule(lineup, partnerRuleDefault), note: shownBustNote(up) }), { offline: offlineNote(view) });
```

- [ ] **Step 5: Taps on your own team only, published**

`dressCards(seats, shifts, up)` becomes `dressCards(seats, shifts, up, mine: ReadonlySet<string>)`. Its `renderOrder(…)` call passes `mine.has(team.name)` as a sixth argument.

In `renderOrder(card, team, seat, index, throwing, tappable: boolean)`:
- The key becomes `` `${team.players.join(",")}|${index}|${throwing ? 1 : 0}|${small ? 1 : 0}|${tappable ? 1 : 0}|${language.value}` ``.
- In the loop, build each chip as:
  ```ts
      // Another account's team is corrected on its own screen; here its names only show who's up.
      const chip = document.createElement(tappable ? "button" : "span");
      chip.className = "adt-team-chip";
      if (i === index) chip.classList.add(throwing ? "is-up" : "is-next");
      chip.textContent = team.players[i];
      chip.title = throwing ? t("teams.match.isThrowing", { name: team.players[i] }) : t("teams.match.throwsNext", { name: team.players[i] });
      if (tappable) {
        (chip as HTMLButtonElement).type = "button";
        chip.setAttribute("aria-pressed", String(i === index));
        chip.addEventListener("click", (event) => {
          event.stopPropagation();
          correct(team, seat, i);
        });
      }
      order.append(chip);
  ```

Check the match stylesheet for chip rules qualified by `button` (`grep -n "button.adt-team-chip\|adt-team-chip" entrypoints/match.content/teams.ts`). Any rule that only a `button` matches is changed to `.adt-team-chip`, so a `span` chip looks the same. Then add `span.adt-team-chip { cursor: default; }`.

`correct` becomes:

```ts
/** Tap to correct: the tapped player is up (or next), and the order carries on from them; with Online Teams, on the other screens too. */
async function correct(team: SavedTeam, seat: number, wanted: number) {
  if (!match) return;
  const shift = shiftFor(match, seat, team, wanted);
  shiftStore = withShift(shiftStore, match.id, team.name, shift, Date.now());
  schedule();
  await AutodartsToolsTeamShifts.setValue(shiftStore);
  await roomClient?.publishShift(team.name, shift);
}
```

- [ ] **Step 6: The partner-rule undo, once, by the thrower's side**

In `askUndo()`, keep everything up to and including `const settle = …;`. Replace the final `browser.runtime.sendMessage(…)` statement with:

```ts
  // Online Teams: autodarts lets either account undo either's darts, so the
  // thrower's own Tools does it, granted once by the room (utils/team-room.ts
  // `undoActor`); the other screens only show the line.
  const room = online ? roomOf(roomStore, match.id) : undefined;
  const actor = undoActor(match.players?.[bust.seat], hostId, room, match.host?.id);
  if (actor === "none") return;
  const matchId = match.id;
  const dartIds = [ ...bust.dartIds ];
  const send = () => browser.runtime.sendMessage({ type: "teams:undo-visit", matchId, dartIds }).then(settle, (e) => {
    console.error(e);
    settle({ ok: false });
  });
  if (actor === "legacy") {
    send();
    return;
  }
  const asking = roomClient ? roomClient.claim(undoKey(matchId, dartIds)) : Promise.resolve(undefined);
  asking.then((granted) => {
    // This account's own visit goes ahead when the room can't be asked; standing in for another account's needs the grant.
    if (granted === true || (actor === "own" && granted === undefined)) send();
  }, e => console.error(e));
```

- [ ] **Step 7: Type-check, lint, i18n, build**

Run:
```bash
yarn compile 2>&1 | grep -E "match.content/(teams|TeamsPill)|teams-pill" || echo "no new errors"
node_modules/.bin/eslint entrypoints/match.content/teams.ts entrypoints/match.content/TeamsPill.vue utils/teams-pill.ts
yarn i18n:check
yarn build 2>&1 | tail -3
```
Expected: no new errors, ESLint clean, the i18n check passes, and the build succeeds.

- [ ] **Step 8: Live, shared score**

1. **Start the match:** with lobby `L2` from Task 9 (TEST RED by A, TEST BLUE by B), start it as A: `POST /gs/v0/lobbies/L2/start`.
2. **Open it on both screens:** in Chrome (your tab: `navigate_page` to `/matches/L2`), and in Firefox (`goto`).
3. **The match names its host:** Firefox's stored match has it (`rdp.mjs addon 'const g = (await browser.storage.local.get("game-data"))["game-data"]; return (g?.v ?? g)?.match?.host?.id'` is A's id). The partner rule and the undo's actor depend on it.
4. **Both screens show both teams:** TEST RED's and TEST BLUE's cards carry `[data-adt-team]`, their chips are ANNA/TOM and LISA/MAX, and the pill reads `ANNA to throw` / `TEST RED` (`autodarts-tools-teams-pill` shadow root, `.adt-teams-text`).
5. **TEST RED's visit:** as A, throw `S1` three times (`POST /gs/v0/matches/L2/throws`, `entry: manual_keyboard`), then `players/next`. Both pills read `LISA to throw` / `TEST BLUE`.
6. **Tap to correct, from A's side:** in Chrome, click TEST RED's `TOM` chip. Its card shows TOM next. In Firefox within 2 s, TEST RED's card shows TOM next too, and its chips are `span`s.
7. **Tap to correct, from B's side:** in Firefox, click TEST BLUE's `MAX` chip with `.click()` from page context (the chips are in the page DOM). Chrome follows.
8. **Offline:** stop the local server. Both pills show `Teams offline` within ~2 s, and the teams stay. Start it again, and the badge goes within ~15 s.
9. **Clean up:** abort the match (`DELETE /gs/v0/matches/L2`), and park both tabs at `about:blank` from their own sessions.

- [ ] **Step 9: Live, own scores and the partner rule**

1. **The lobby:** a fresh own-scores lobby `L3`, 121 straight out, first to 2 legs.
   - Seats: ANNA and TOM (A's guests, TEST RED), LISA and MAX (B's guests, TEST BLUE).
   - Lineups: written as in Task 8, Step 10.
   - The order: let Chrome alternate it, then switch Chrome's partner-rule card on.
   - Check that Firefox's lineup view takes it: `room.rule` is `{by: A, partnerRule: true}` in Firefox's `teams-room` entry (`rdp.mjs addon`).
2. **Start, and the tally:** start the match and open it on both screens. Both show the tally `TEST RED 0 · TEST BLUE 0 · first to 2`.
3. **Drive a bust by A's seat:** see [[quick-bust-and-win-in-a-121-match]].
   - LISA and MAX each score 100 (T20 T20 S20), leaving 21 each.
   - TOM scores 0, leaving 121, which is more than 42.
   - ANNA checks out 121 (T20 T20 S1, or whatever finishes from her score).
   - Expected:
     - Both pills say ANNA's checkout didn't count.
     - Exactly one undo happens: the match state shows ANNA back at her score before the visit, it's the next player's turn, and the visit isn't undone twice (the previous visit's darts are untouched).
     - Chrome's service worker handled it, and Firefox didn't.
4. **The mirror case:** a bust by one of B's seats. Firefox undoes it, and Chrome doesn't.
5. **The fallback:**
   - Set Firefox's `teams.enabled: false`, so B's Tools leaves the room. B's teams stay in the room, though.
   - So use a new lobby, where B is seated only as `CREAZY_DEV` (its own account, `POST players {name, userId: B}` with B's token), on TEST RED's side. That means Chrome's own team holds B's seat: B has no Tools in the room, so the seat is pickable.
   - Drive a bust by B's seat.
   - Expected: Chrome (the host) undoes it once, through the claim.
6. **A team win:** both screens hide Next Leg (`SELECTORS.match.nextLegButton` hidden) once TEST RED reaches 2 legs.
7. **Clean up:** abort the matches, and park the tabs.

- [ ] **Step 10: Commit**

```bash
git add entrypoints/match.content/teams.ts entrypoints/match.content/TeamsPill.vue utils/teams-pill.ts locales/en/teams.ts locales/de/teams.ts locales/nl/teams.ts locales/same-as-english.json
git commit -m "feat: Online Teams in the match: both teams on both screens, each side correcting and undoing its own"
```

---

### Task 11: The settings row, README and CHANGELOG

**Files:**
- Modify: `components/Settings/Teams.vue`
- Modify: `locales/{en,de,nl}/teams.ts` (`teams.online.settings`)
- Modify: `README.md` (the Teams section, plus a new "Online Teams and your data" section)
- Modify: `CHANGELOG.md` (`[Unreleased]`)

- [ ] **Step 1: Catalogs**

en, inside `online`:

```ts
    settings: {
      title: "Online Teams",
      description: "In a lobby with a team and another account, Tools shares the teams' names, players, colours and order with the other Tools there, through Tools' own server. Darts and scores stay with autodarts, and nothing is kept once the lobby and its match are over.",
    },
```

de:

```ts
    settings: {
      title: "Online-Teams",
      description: "In einer Lobby mit einem Team und einem weiteren Account teilt Tools die Namen, Spieler, Farben und die Reihenfolge der Teams über den eigenen Server von Tools mit dem Tools der anderen. Darts und Punkte bleiben bei autodarts, und nichts wird aufbewahrt, wenn Lobby und Match vorbei sind.",
    },
```

nl:

```ts
    settings: {
      title: "Online teams",
      description: "In een lobby met een team en nog een account deelt Tools de namen, spelers, kleuren en volgorde van de teams via de eigen server van Tools met de Tools van de anderen. Darts en scores blijven bij autodarts, en er wordt niets bewaard als de lobby en de match voorbij zijn.",
    },
```

- [ ] **Step 2: The row**

In `components/Settings/Teams.vue`, between the intro `<p>` and `<LibrarySection>`:

```vue
        <section class="mb-6">
          <OptionRow :description="t('teams.online.settings.description')" :title="t('teams.online.settings.title')">
            <AppToggle v-model="config.teams.online" :aria-label="t('teams.online.settings.title')" size="sm" />
          </OptionRow>
        </section>
```

Add `import OptionRow from "./Library/OptionRow.vue";` after the `LibrarySection` import.

- [ ] **Step 3: README and CHANGELOG**

In `README.md`, find the Teams entry (`grep -n "Teams" README.md`). Add at its end:

```markdown
**Online Teams.** Two teams can play from two boards in different places, in one autodarts online lobby. Autodarts runs the match: each team's darts come from its own board, and it hands the turn between the boards. Tools shows both teams the Teams way on both screens.

- The host adds their team and copies **Invite a team**. The other captain opens the link, and Tools offers to join with one of their saved teams, seated on their own board.
- Each captain edits and corrects only their own team. For own scores, the host's Tools alternates everyone's seats, and the partner rule is the host's.
- A chip in the Players card shows the connection: connecting, ready, in sync with whom, not connected, or offline.
- Both captains need Tools with Teams on. Without it, the other team shows as plain seats, and the match plays as normal.
- Switch it off under Teams → Online Teams.
```

After the features list, before the installation section (keep the README's heading level), add:

```markdown
## Online Teams and your data

With Teams and Online Teams on, Tools connects to its own server (`adt-socket.tobias-thiele.de`) in an autodarts lobby, which is how the lobby can show whether online team play is available. Only once a team is in play, or another account is in the lobby, does it share:

- your autodarts user id and name
- the lobby's id
- each of your teams' name, players in order, colour and format, and their seats
- tap-to-corrections
- the host's partner rule

Your autodarts login never leaves your browser, and no darts or scores are sent. The server keeps all of this in memory only, for the lobby and its match, and drops it at the latest 12 hours later. Switch Online Teams off under Teams to never connect.
```

In `CHANGELOG.md`, add to `## [Unreleased]` → `### Added` (create the headings if they're missing, in the file's style):

```markdown
- **Online Teams**: two teams on two boards in different places play one autodarts online match, with both teams shown on both screens: who's up, the order, colours, tap-to-correct, own scores' team legs and the partner rule. A chip in the lobby shows whether the team server is reachable and who is in sync; Invite a team copies the lobby's link, and the other captain joins with a saved team in one tap.
```

And, under `### Changed`:

```markdown
- The `socket/` server is the Online Teams room now; its friends and invitations code is gone.
```

- [ ] **Step 4: Check and commit**

Run:
```bash
node_modules/.bin/eslint components/Settings/Teams.vue
yarn i18n:check
```
Expected: clean, then a pass. Check the switch live in Chrome's settings ([[opening-the-tools-settings-panel]]): the row shows, and toggling it writes `config.teams.online`. Within ~5 s of turning it off, your lobby tab's chip and connection are gone (`localhost:4455/health` sockets drops). Turn it back on.

```bash
git add components/Settings/Teams.vue locales/en/teams.ts locales/de/teams.ts locales/nl/teams.ts locales/same-as-english.json README.md CHANGELOG.md
git commit -m "docs: Online Teams in the README and changelog, with what it shares, and its switch in Teams' settings"
```

---

### Task 12: The whole thing, live, with two accounts

No new code unless a run fails. Each failure goes through superpowers:systematic-debugging, with a test where one fits, then a `fix:` commit.

- [ ] **Step 1: The spec's matrix not yet covered**

Run each, with both browsers:
1. **Reload mid-match:** Chrome's match tab reloads (`navigate_page reload` on your tab). Within ~2 s, both teams show again from the mirror. The room shows CREAZY back in its peers.
2. **Lobby → match:**
   - Start from the lobby with both tabs open on it (A starts).
   - Both tabs follow the site into the match.
   - Check: the teams show in the first second (the mirror), the clients reconnect (`/health` sockets back to 2), and there are no console errors.
3. **Local Lobby:**
   - Switch Local Lobby on in Chrome's config.
   - Open a private lobby of A's, and B adds TEST BLUE from Firefox.
   - Expected: TEST BLUE stays on B's board (`hostId` is still B's in `GET /gs/v0/lobbies/…`). A's own entry is removed, as Local Lobby does.
   - Switch Local Lobby back off.
4. **Online Teams off in Chrome:**
   - No chip, and no socket from Chrome (`/health` sockets 1 with Firefox in the lobby).
   - TEST BLUE shows as a plain seat in Chrome. TEST RED still shows its players.
   - Switch it back on.
5. **A name clash:** add a saved team named `TEST RED` (shared) in Firefox too, and let B join with it. The site refuses a second guest of that name, so either the invitation shows the site's refusal (`teamNotAdded`), or Tools' own check refuses it first. Both are fine, as long as neither screen mixes the teams.
6. **Narrow screen:**
   - The chip and invitation at 390 px wide in Chrome (`emulate` / `resize_page` on your tab): nothing overflows the Players card header, and the chip's card stays on screen.
   - At 1920 px, the pill's offline badge doesn't wrap (stop the server to see it).

- [ ] **Step 2: Record what was seen**

Write the results (pass/fail per item, and any fix commit) to `$SCR/E2E.md`, for the final report.

---

### Task 13: Final checks, review, clean-up

- [ ] **Step 1: All checks**

Run:
```bash
cd /Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt
(cd socket && bun test)
for f in $SCR/tests/*.test.mts; do node_modules/.bin/tsx --test --test-concurrency=1 "$f" || echo "FAILED $f"; done
yarn compile 2>&1 | grep -c "error TS"
node_modules/.bin/eslint $(git diff --name-only main...HEAD -- '*.ts' '*.vue' | grep -v '^socket/')
yarn i18n:check
yarn build 2>&1 | tail -3
yarn build:firefox 2>&1 | tail -3
```
Expected:
- every test passes
- `yarn compile`'s count is no higher than before the branch (count it on `main`'s files only, by listing errors per file and comparing; see [[yarn-compile-baseline-is-16-errors]])
- ESLint is clean
- the i18n check passes
- both builds succeed

- [ ] **Step 2: Review**

Use superpowers:requesting-code-review on `main...feat/online-teams`, with the spec and this plan, and the Review Focus list called out. Handle the findings with superpowers:receiving-code-review. Fix in `fix:` commits and re-run Step 1.

- [ ] **Step 3: Clean up**

Restore Chrome's `config-2-0-0.teams` from `$SCR/chrome-config-backup.json`, keeping `online: true`, and remove `TEST RED`. Remove the test lobbies' entries from `teams-lineups`, `teams-shifts` and `teams-room` (`cfg.mjs set`). Delete or abort every test lobby and match (`ad.py`). Close your own tabs in both browsers. Stop the Firefox dev build (`pkill -f "wxt -b firefox --port 4001"` and the FIFO's `sleep`) and the local server. Leave the `yarn dev` Chrome running.

- [ ] **Step 4: Report**

Tell the user (written for them, not for a reviewer):
- what was built, and the branch with its commits
- how to try it: `bun run dev` in `socket/`, `yarn dev`, and a second browser
- what was verified live, and anything that wasn't
- what is theirs to do: deploy `socket/` with the compose file; add the store listings' data disclosure; the Local Lobby selector finding from the spec's last section, which predates this work, offered as an issue or a fix
- the decisions made without them, marked *(implementation choice)* in the spec

