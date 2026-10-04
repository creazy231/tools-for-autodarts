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

import { MAX_NAME_LENGTH, findTeam, isHostedGuest, normalizeColour, normalizeName, sharedTeams, teamSeats } from "@/utils/teams";

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
export interface RoomMirror extends RoomState {
  at: number;
  /** Every account the room has had, as a peer or with teams: a restarted, empty room mustn't make one look Tools-less. */
  seen?: string[];
}

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
  const last = store?.[state.lobbyId];
  const before = last && now - last.at < ROOM_TTL_MS ? last.seen ?? [] : [];
  const seen = [ ...new Set([ ...before, ...state.peers.map(peer => peer.userId), ...state.teams.map(team => team.owner) ]) ];
  next[state.lobbyId] = { ...state, at: now, seen };
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
  // The room refuses an account's whole set for one name over its length.
  const fit = (name: string) => name.slice(0, MAX_NAME_LENGTH).trim();
  const present = new Map(players.filter(seat => seat.id).map(seat => [ seat.id!, seat ]));
  const teams: RoomTeamInput[] = [];
  for (const seat of players) {
    if (!seat.id || !isHostedGuest(seat, me)) continue;
    const team = findTeam(sharedTeams(saved), seat.name);
    if (team) teams.push({ name: team.name, colour: { ...team.colour }, format: "shared", seatIds: [ seat.id ], players: team.players.map(fit) });
  }
  for (const team of lineup?.teams ?? []) {
    const seatIds = team.seatIds.filter(id => present.has(id));
    if (!seatIds.length) continue;
    teams.push({ name: team.name, colour: { ...team.colour }, format: "own", seatIds, players: seatIds.map(id => fit(normalizeName(present.get(id)!.name))) });
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
  if (own.length) {
    // Every screen lists the teams alike (the pill's tally): by their first seat
    // in the lobby's order, which a leg's rotation of `players` leaves alone.
    const place = (team: LineupTeam) => Math.min(...team.seatIds.map((id) => {
      const at = players.findIndex(seat => seat.id === id);
      return at < 0 ? Number.POSITIVE_INFINITY : players[at].index ?? at;
    }));
    teams.sort((a, b) => place(a) - place(b));
  }
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

/**
 * Whether to join the lobby's room: with a team of this account's in it, or
 * another account there. The lobby's host is in it with or without a seat, and
 * their screen counts a guest of ours as an account to wait for.
 */
export function shouldJoin(players: readonly SeatLike[], myTeams: readonly RoomTeamInput[], me: string | null | undefined, lobbyHost?: string | null): boolean {
  if (!me) return false;
  return myTeams.length > 0 || Boolean(lobbyHost && lobbyHost !== me) || players.some((seat) => {
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

export function undoActor(seat: SeatLike | undefined, me: string | null | undefined, room: (RoomState & Pick<RoomMirror, "seen">) | undefined, hostId: string | null | undefined): UndoActor {
  if (!room) return "legacy";
  const owner = seatOwner(seat);
  if (!owner || !me) return "none";
  if (owner === me) return "own";
  // "Is, or was": an account whose Tools a restart has briefly taken out of the room still takes back its own.
  const inRoom = room.peers.some(peer => peer.userId === owner) || room.teams.some(team => team.owner === owner) || Boolean(room.seen?.includes(owner));
  return !inRoom && me === hostId ? "fallback" : "none";
}

/**
 * What a side that may take a visit back does with the room's answer to its
 * claim: undo with the grant; leave it to whoever got it; and with no answer,
 * let the checkout stand rather than risk a second undo from another screen.
 */
export function undoOutcome(granted: boolean | undefined): "undo" | "theirs" | "stands" {
  if (granted === true) return "undo";
  return granted === false ? "theirs" : "stands";
}

/** Whether this account plays in a match, or hosts it: a match's room is theirs, not a spectator's. */
export function takesPart(players: readonly SeatLike[], me: string | null | undefined, matchHost: string | null | undefined): boolean {
  if (!me) return false;
  return matchHost === me || players.some(seat => seatOwner(seat) === me);
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
