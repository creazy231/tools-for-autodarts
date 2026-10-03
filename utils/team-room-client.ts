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
