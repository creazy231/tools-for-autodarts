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
