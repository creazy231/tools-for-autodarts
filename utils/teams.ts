/**
 * Teams: which seats of a lobby or match are teams, whose turn it is inside
 * one, and the rules a new team has to meet.
 *
 * Two formats. With a shared score, a team is one guest seat on the host's
 * board, named after the team, and its players take turns on that seat's score,
 * like steel-tip doubles. With own scores, every player is a seat of their own
 * (a guest, someone on their own board, or a bot), and a team is a group of
 * seats, recorded by seat id in the lobby's lineup: a leg counts for the team of
 * whoever checks out. The site knows nothing about either: everything here is
 * what the extension adds on top, and all of it is pure (no DOM, no storage, no
 * extension APIs), so it runs under tsx. The lobby, the match screen, the
 * Caller and the settings all build from here.
 *
 * Saved teams are keyed by name. A guest the host adds under a saved shared
 * team's name, in any lobby or match, is that team; a saved own-score team
 * remembers how each of its players joined, so the drawer can seat them again.
 */

import type { ColorScheme } from "@/utils/storage";

import { CARD_PRESETS, type ColorPreset, SITE_CARD } from "@/utils/colors";

export type TeamFormat = "shared" | "own";

/** How an own-score team's player joined, so a saved team can bring them back. */
export interface TeamMember {
  name: string;
  kind: "guest" | "account" | "bot";
  /** An account's user id. */
  userId?: string;
  /** A bot's level, as the site's cpuPPR. */
  ppr?: number;
}

/** A team as it is saved: its name, its players in throwing order, its colour and its format. */
export interface SavedTeam {
  /** The team's name, as the site shows a name: trimmed and upper case. For a shared score, its seat's name. */
  name: string;
  /** In throwing order, upper case, each once. */
  players: string[];
  /** The gradient its cards turn while it is up: a Colors scheme. */
  colour: ColorScheme;
  /** "shared" for every team saved before own scores existed. */
  format: TeamFormat;
  /** Own scores only: one per player, in the same order. */
  members?: TeamMember[];
}

/** `IConfig.teams`. */
export interface TeamsConfig {
  enabled: boolean;
  /** Most recently used first. */
  saved: SavedTeam[];
  /** Own scores' e-darts partner rule; see {@link partnerRuleBreach}. */
  partnerRule: boolean;
}

/** Per team name: how far tap-to-correct has moved its order on. */
export type TeamShifts = Record<string, number>;

/** Per match id: the shifts of its teams, and when they were last written. */
export type ShiftStore = Record<string, { at: number; shifts: TeamShifts }>;

/** The fields of a lobby or match seat that say whose it is. */
export interface SeatLike {
  /** The seat's id, the same in the lobby and the match started from it. */
  id?: string;
  /** The seat in the lobby's order; `players` itself is put in throwing order every leg. */
  index?: number;
  name?: string | null;
  userId?: string | null;
  hostId?: string | null;
  cpuPPR?: number | null;
}

/** An own-score team as a lobby and its match know it: its seats, in throwing order. */
export interface LineupTeam {
  name: string;
  colour: ColorScheme;
  seatIds: string[];
}

/** A lobby's own-score teams, in the order they were added. */
export interface Lineup {
  at: number;
  teams: LineupTeam[];
  /** The lobby's partner rule, from its card. A lineup written before the card has none, and goes by the setting. */
  partnerRule?: boolean;
}

/** Per lobby id, which is also its match's id. */
export type LineupStore = Record<string, Lineup>;

/** A place in an own-score team, before the lobby has seated everyone. */
export type SeatSlot =
  | { kind: "seat"; seatId: string }
  | { kind: "guest"; name: string }
  | { kind: "bot"; name: string; ppr: number }
  | { kind: "missing"; name: string };

/** A player picked in the drawer: a seat already in the lobby, a name to add as a guest, or a bot to add at a level (its cpuPPR). */
export type OwnPick = { seatId: string; name: string } | { guest: string } | { bot: number; name: string; key: string };

export interface OwnDraft {
  name: string;
  colour: ColorScheme;
  /** In throwing order. */
  picks: readonly OwnPick[];
}

export interface OwnContext {
  /** Every seat's name in the lobby, which a new guest must not take. */
  seatNames: readonly string[];
  /** The seats on the lobby's other own-score teams. */
  takenSeats: ReadonlySet<string>;
  /** The lobby's other own-score teams' names. */
  teamNames: readonly string[];
  /** Seats the lobby has left. */
  freeSeats: number;
}

/** The part of the match the throwing order is worked out from. */
export interface TurnState {
  variant?: string;
  set?: number;
  leg?: number;
  round?: number;
  /** Index into `players`, which the site keeps in this leg's throwing order. */
  player?: number;
  players?: readonly SeatLike[];
}

export interface TeamDraft {
  name: string;
  players: readonly string[];
  colour: ColorScheme;
}

export interface DraftContext {
  /** Every guest in the lobby, except the team being edited. */
  guestNames: readonly string[];
  /** The players of the lobby's other teams. */
  otherTeamPlayers: readonly string[];
}

export const MIN_PLAYERS = 1;
export const MAX_PLAYERS = 6;
export const MAX_NAME_LENGTH = 24;
/** How long a match's tap-to-corrections are kept. */
export const SHIFT_TTL_MS = 24 * 60 * 60 * 1000;
/** The tag the match screen's pill is mounted under, which Darts Zoom places itself below. */
export const TEAMS_PILL_TAG = "autodarts-tools-teams-pill";

/**
 * The colours a team can take: autodarts' own raspberry, then Colors' pairs
 * for the active card, which keep its white type readable (utils/colors.ts).
 */
export const TEAM_COLOURS: readonly ColorPreset[] = [
  { id: "default", label: "Default", ...SITE_CARD },
  ...CARD_PRESETS,
];

/** The order new teams take their colour in: red against blue first. */
const COLOUR_ORDER = [ "crimson", "ocean", "lime", "orange", "blueberry", "gold", "petrol", "slate", "qwellcode", "default" ] as const;

/** The word a colour gives a team's suggested name. */
const COLOUR_WORDS: Record<string, string> = {
  default: "RASPBERRY",
  blueberry: "PURPLE",
  ocean: "BLUE",
  lime: "GREEN",
  petrol: "TEAL",
  orange: "ORANGE",
  crimson: "RED",
  gold: "GOLD",
  slate: "SLATE",
  qwellcode: "QWELLCODE",
};

const HEX = /^#[0-9a-f]{6}$/i;

function hex(value: unknown): string {
  return typeof value === "string" && HEX.test(value) ? value.toLowerCase() : "";
}

function mod(value: number, by: number): number {
  return ((value % by) + by) % by;
}

function presetScheme(preset: ColorPreset): ColorScheme {
  return { preset: preset.id, from: preset.from, to: preset.to };
}

/** A name the way the site stores a guest's: trimmed, single-spaced, upper case. */
export function normalizeName(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().replace(/\s+/g, " ").toUpperCase() : "";
}

/** Names as {@link normalizeName} makes them, the empty ones dropped and each kept once, in order. */
export function uniqueNames(list: readonly unknown[]): string[] {
  const out: string[] = [];
  for (const raw of list) {
    const name = normalizeName(raw);
    if (name && !out.includes(name)) out.push(name);
  }
  return out;
}

/**
 * A stored colour, or the first of {@link TEAM_COLOURS} when it is not one. A
 * preset id no longer on offer keeps its colours, as the custom pair it now is,
 * the way Colors treats its own schemes.
 */
export function normalizeColour(saved: unknown): ColorScheme {
  const value = (saved && typeof saved === "object" ? saved : {}) as Record<string, unknown>;
  const from = hex(value.from);
  const to = hex(value.to);
  const known = TEAM_COLOURS.find(colour => colour.id === value.preset);
  if (from && to) return { preset: known ? known.id : "custom", from, to };
  return presetScheme(known ?? TEAM_COLOURS[0]);
}

/** Members that line up with the players one for one, or none: a saved team's record of how each joined. */
function normalizeMembers(raw: unknown, players: readonly string[]): TeamMember[] | undefined {
  if (!Array.isArray(raw) || raw.length !== players.length) return undefined;
  const members: TeamMember[] = [];
  for (const [ index, entry ] of raw.entries()) {
    const name = normalizeName(entry?.name);
    const kind = entry?.kind;
    if (name !== players[index] || (kind !== "guest" && kind !== "account" && kind !== "bot")) return undefined;
    if (kind === "account") {
      if (typeof entry.userId !== "string" || !entry.userId) return undefined;
      members.push({ name, kind, userId: entry.userId });
    } else if (kind === "bot") {
      const ppr = Math.round(Number(entry.ppr));
      if (!Number.isFinite(ppr) || ppr <= 0) return undefined;
      members.push({ name, kind, ppr });
    } else {
      members.push({ name, kind });
    }
  }
  return members;
}

/** Settings from anywhere, in the current shape: broken entries dropped, the rest cleaned. */
export function normalizeTeams(saved: unknown): TeamsConfig {
  const value = (saved && typeof saved === "object" ? saved : {}) as Record<string, any>;
  const teams: SavedTeam[] = [];
  for (const entry of Array.isArray(value.saved) ? value.saved : []) {
    const name = normalizeName(entry?.name).slice(0, MAX_NAME_LENGTH);
    if (!name || teams.some(team => team.name === name)) continue;
    const players = uniqueNames(Array.isArray(entry?.players) ? entry.players : []).slice(0, MAX_PLAYERS);
    if (players.length < MIN_PLAYERS) continue;
    const format: TeamFormat = entry?.format === "own" ? "own" : "shared";
    const team: SavedTeam = { name, players, colour: normalizeColour(entry?.colour), format };
    const members = format === "own" ? normalizeMembers(entry?.members, players) : undefined;
    if (members) team.members = members;
    teams.push(team);
  }
  return { enabled: Boolean(value.enabled), saved: teams, partnerRule: Boolean(value.partnerRule) };
}

/** The saved teams that share a score: the ones a guest seat can be. */
export function sharedTeams(saved: readonly SavedTeam[]): SavedTeam[] {
  return saved.filter(team => team.format !== "own");
}

/** The saved team a seat of that name is, if any. */
export function findTeam(teams: readonly SavedTeam[], name: unknown): SavedTeam | undefined {
  const key = normalizeName(name);
  return key ? teams.find(team => team.name === key) : undefined;
}

/**
 * A guest this host controls: no account and not a bot. `hostId` names the
 * account a guest was added by, so a guest from someone else's board is not
 * ours to make a team of.
 */
export function isHostedGuest(seat: SeatLike, hostId: string | null | undefined): boolean {
  return Boolean(hostId) && !seat.userId && !seat.cpuPPR && seat.hostId === hostId;
}

/** The seats that are shared-score teams, by their index in `players`. */
export function teamSeats(players: readonly SeatLike[], teams: readonly SavedTeam[], hostId: string | null | undefined): Map<number, SavedTeam> {
  const seats = new Map<number, SavedTeam>();
  players.forEach((seat, index) => {
    if (!isHostedGuest(seat, hostId)) return;
    const team = findTeam(sharedTeams(teams), seat.name);
    if (team) seats.set(index, team);
  });
  return seats;
}

/**
 * How far this leg's first player has moved on: one a leg and one a set, the
 * way the site moves its own first seat on (a set's first leg opens one seat
 * on from the set before's, measured 2026-09-30). The bull-off comes before
 * all of it.
 */
export function legIndex(state: TurnState): number {
  if (state.variant === "Bull-off") return 0;
  const set = Math.max(1, Math.floor(state.set ?? 1));
  const leg = Math.max(1, Math.floor(state.leg ?? 1));
  return (set - 1) + (leg - 1);
}

/**
 * The visit of this leg a seat is on, from 0. Every seat throws once a round,
 * so in round r the seat throwing plays visit r − 1. A seat before it in this
 * leg's order has thrown this round already and plays visit r next; one after
 * it still plays r − 1.
 */
export function visitIndex(state: TurnState, seat: number): number {
  if (state.variant === "Bull-off") return 0;
  const round = Math.max(1, Math.floor(state.round ?? 1));
  return seat < (state.player ?? 0) ? round : round - 1;
}

/**
 * Which of the team's players throws that seat's visit now, or its next one
 * while another seat throws: an index into `team.players`, or -1 for a team
 * with no players.
 */
export function playerUp(state: TurnState, seat: number, team: SavedTeam, shift = 0): number {
  if (!team.players.length) return -1;
  return mod(legIndex(state) + visitIndex(state, seat) + shift, team.players.length);
}

/** The shift that makes `wanted` the player {@link playerUp} gives for that seat now. */
export function shiftFor(state: TurnState, seat: number, team: SavedTeam, wanted: number): number {
  if (!team.players.length) return 0;
  return mod(wanted - legIndex(state) - visitIndex(state, seat), team.players.length);
}

/** A match's shift written into the store, and entries older than a day dropped. */
export function withShift(store: ShiftStore | undefined, matchId: string, team: string, shift: number, now: number): ShiftStore {
  const next: ShiftStore = {};
  for (const [ id, entry ] of Object.entries(store ?? {})) {
    if (id !== matchId && entry && now - entry.at < SHIFT_TTL_MS) next[id] = entry;
  }
  next[matchId] = { at: now, shifts: { ...store?.[matchId]?.shifts, [team]: shift } };
  return next;
}

/** A match's shifts, or none. */
export function shiftsOf(store: ShiftStore | undefined, matchId: string | undefined): TeamShifts {
  return (matchId && store?.[matchId]?.shifts) || {};
}

/** What the name triggers (the Caller, Sound FX, WLED) need to know of a match's teams. */
export interface CallContext {
  /** The saved teams, for shared-score seats. */
  saved: readonly SavedTeam[];
  /** Whose guests those seats are. */
  hostId: string | null | undefined;
  /** The match's tap-to-correct shifts. */
  shifts: TeamShifts;
  /** The match's own-score lineup, if it has one. */
  lineup: Lineup | undefined;
}

/**
 * A seat as the name triggers call it: the player who throws for it, and the
 * team it plays for. A shared-score seat is named after its team, and its
 * player is whoever's visit it is (`playerUp`, with the card's tap-to-correct
 * shift); an own-score seat is its player, on the lineup's team; any other
 * seat is only its own name.
 */
function seatCall(match: TurnState, seat: number, context: CallContext): string[] {
  const players = match.players ?? [];
  const name = players[seat]?.name ?? "";
  const ownTeam = context.lineup ? lineupTeams(players, context.lineup).get(seat) : undefined;
  if (ownTeam) return [ name, ownTeam.name ];
  const shared = teamSeats(players, context.saved, context.hostId).get(seat);
  if (shared) return [ shared.players[playerUp(match, seat, shared, context.shifts[shared.name] ?? 0)] ?? "", shared.name ];
  return [ name ];
}

const present = (names: readonly string[]) => [ ...new Set(names.filter(Boolean)) ];

/** The names to try, in turn, when a seat's visit starts: the player, then their team. */
export function turnCallNames(match: TurnState, context: CallContext): string[] {
  return present(seatCall(match, match.player ?? 0, context));
}

/** A leg won: the player who checked out, then their team. */
export function legWinCallNames(match: TeamMatch, context: CallContext): string[] {
  const seat = match.gameWinner ?? -1;
  return seat < 0 ? [] : present(seatCall(match, seat, context));
}

/** A match won: the team first, since it is the team's win, then the player who checked out. */
export function matchWinCallNames(match: TeamMatch, context: CallContext): string[] {
  const seat = (match.gameWinner ?? -1) >= 0 ? match.gameWinner! : match.winner ?? -1;
  if (seat < 0) return [];
  const [ player, team ] = seatCall(match, seat, context);
  return present(team ? [ team, player ] : [ player ]);
}

function sameColour(a: ColorScheme, b: ColorScheme): boolean {
  if (a.preset === "custom" || b.preset === "custom") return a.from === b.from && a.to === b.to;
  return a.preset === b.preset;
}

/** Whether one of `taken` already is that colour. */
export function colourTaken(colour: ColorScheme, taken: readonly ColorScheme[]): boolean {
  return taken.some(other => sameColour(colour, other));
}

/** The first colour in the order no team has yet, or the first of the order once all are taken. */
export function nextFreeColour(taken: readonly ColorScheme[]): ColorScheme {
  const ordered = COLOUR_ORDER.map(id => TEAM_COLOURS.find(colour => colour.id === id)!);
  const free = ordered.find(colour => !colourTaken(presetScheme(colour), taken));
  return presetScheme(free ?? ordered[0]);
}

/**
 * A saved team as it joins a lobby: in its own colour, or in the next free one
 * when another team there already has it, so no two teams in a lobby look alike.
 */
export function withFreeColour(team: SavedTeam, taken: readonly ColorScheme[]): SavedTeam {
  return colourTaken(team.colour, taken) ? { ...team, colour: nextFreeColour(taken) } : team;
}

/**
 * The name a new team is offered: TEAM and its colour's word, numbered when
 * that is taken ("TEAM RED 2"). A custom pair has no word, so it is TEAM 1,
 * TEAM 2 and so on.
 */
export function suggestName(colour: ColorScheme, takenNames: readonly string[]): string {
  const taken = new Set(takenNames.map(normalizeName));
  const word = COLOUR_WORDS[colour.preset];
  if (word) {
    const base = `TEAM ${word}`;
    if (!taken.has(base)) return base;
    for (let n = 2; ; n++) {
      if (!taken.has(`${base} ${n}`)) return `${base} ${n}`;
    }
  }
  for (let n = 1; ; n++) {
    if (!taken.has(`TEAM ${n}`)) return `TEAM ${n}`;
  }
}

/** What stops a draft from being added, in words for the drawer, or nothing. */
export function checkTeam(draft: TeamDraft, context: DraftContext): string | undefined {
  const name = normalizeName(draft.name);
  if (!name) return "Give the team a name.";
  if (name.length > MAX_NAME_LENGTH) return `A team name can be ${MAX_NAME_LENGTH} characters at most.`;
  if (uniqueNames(context.guestNames).includes(name)) return `There's already a player called ${name} in this lobby.`;

  const players = draft.players.map(normalizeName).filter(Boolean);
  if (new Set(players).size !== players.length) return "Each player can only be in the team once.";
  if (players.length < MIN_PLAYERS) return "Add at least one player.";
  if (players.length > MAX_PLAYERS) return `A team can have ${MAX_PLAYERS} players at most.`;

  const others = new Set(uniqueNames(context.otherTeamPlayers));
  const clash = players.find(player => others.has(player));
  if (clash) return `${clash} is already on another team.`;
  return undefined;
}

/** A team as plain data: its fields copied out of whatever reactive proxy holds them. */
function plainTeam(team: SavedTeam): SavedTeam {
  const { preset, from, to } = team.colour;
  const plain: SavedTeam = { name: team.name, players: [ ...team.players ], colour: { preset, from, to }, format: team.format === "own" ? "own" : "shared" };
  if (team.members) {
    plain.members = team.members.map(({ name, kind, userId, ppr }) => {
      const member: TeamMember = { name, kind };
      if (userId) member.userId = userId;
      if (ppr) member.ppr = ppr;
      return member;
    });
  }
  return plain;
}

/**
 * The saved teams with this one first, in place of one of the same name, as
 * plain data. The drawer hands over Vue's reactive copies, and browser storage
 * cannot clone a proxy: it stored a team's players as `{0: …, 1: …}`, which
 * {@link normalizeTeams} then rightly dropped.
 */
export function rememberTeam(saved: readonly SavedTeam[], team: SavedTeam): SavedTeam[] {
  return [ plainTeam(team), ...saved.filter(other => other.name !== team.name).map(plainTeam) ];
}

function plainLineupTeam(team: LineupTeam): LineupTeam {
  const { preset, from, to } = team.colour;
  return { name: team.name, colour: { preset, from, to }, seatIds: [ ...team.seatIds ] };
}

/**
 * A lobby's own-score teams written into the store, as plain data. Teams with
 * no seats are dropped, a lobby with no teams has no lineup, and entries older
 * than a day go. The lobby's partner rule is kept unless a new one is given.
 */
export function withLineup(store: LineupStore | undefined, lobbyId: string, teams: readonly LineupTeam[], now: number, partnerRule?: boolean): LineupStore {
  const next: LineupStore = {};
  for (const [ id, entry ] of Object.entries(store ?? {})) {
    if (id !== lobbyId && entry && now - entry.at < SHIFT_TTL_MS) next[id] = entry;
  }
  const kept = teams.filter(team => team.seatIds.length).map(plainLineupTeam);
  const rule = partnerRule ?? store?.[lobbyId]?.partnerRule;
  if (kept.length) next[lobbyId] = rule === undefined ? { at: now, teams: kept } : { at: now, teams: kept, partnerRule: rule };
  return next;
}

/** The lobby card's partner rule written into the lobby's lineup. A lobby with no lineup yet has nothing to hold it; the setting does. */
export function withPartnerRule(store: LineupStore | undefined, lobbyId: string, on: boolean, now: number): LineupStore {
  const lineup = store?.[lobbyId];
  return lineup ? withLineup(store, lobbyId, lineup.teams, now, on) : { ...store };
}

/** Whether a match plays the partner rule: its lobby's choice, or for a lineup from before the lobby card, the setting. */
export function lineupPartnerRule(lineup: Lineup | undefined, fallback: boolean): boolean {
  return lineup?.partnerRule ?? fallback;
}

/** A lobby's (or its match's) lineup, by its own id: never the page's, since game data is shared between tabs. */
export function lineupOf(store: LineupStore | undefined, id: string | undefined): Lineup | undefined {
  return id ? store?.[id] : undefined;
}

/**
 * The teams as the lobby stands (`seatIds`, in its order): the seats that left
 * taken out, each team's seats in the lobby's order, which is its throwing
 * order once a drag or a Shuffle has changed it, and the teams with none left
 * dropped.
 */
export function pruneLineup(teams: readonly LineupTeam[], seatIds: readonly string[]): LineupTeam[] {
  const position = new Map(seatIds.map((id, index) => [ id, index ]));
  return teams
    .map(team => ({ ...team, seatIds: team.seatIds.filter(id => position.has(id)).sort((a, b) => position.get(a)! - position.get(b)!) }))
    .filter(team => team.seatIds.length);
}

/** The format a lobby's teams have, or none while it has no team: the first team sets it. */
export function lobbyFormat(players: readonly SeatLike[], lineup: Lineup | undefined, saved: readonly SavedTeam[], hostId: string | null | undefined): TeamFormat | undefined {
  if (lineup?.teams.length) return "own";
  return teamSeats(players, saved, hostId).size ? "shared" : undefined;
}

/**
 * The seats in turn order: grouped by team as they stand, then one of each
 * team in turn, starting with the first seat's team. A seat on no team is a
 * team of one, and a team that has run out of seats drops out of the round.
 */
export function interleave(seatIds: readonly string[], teamOf: (seatId: string) => string | undefined): string[] {
  const groups: string[][] = [];
  const byTeam = new Map<string, string[]>();
  for (const id of seatIds) {
    const team = teamOf(id);
    if (team === undefined) {
      groups.push([ id ]);
      continue;
    }
    let group = byTeam.get(team);
    if (!group) {
      group = [];
      byTeam.set(team, group);
      groups.push(group);
    }
    group.push(id);
  }
  const out: string[] = [];
  for (let round = 0; out.length < seatIds.length; round++) {
    for (const group of groups) {
      if (round < group.length) out.push(group[round]);
    }
  }
  return out;
}

/** The site's `move/to-index` requests that turn one order into the other, each applied to the order the one before left. */
export function seatMoves(current: readonly string[], target: readonly string[]): { index: number; toIndex: number }[] {
  const order = [ ...current ];
  const moves: { index: number; toIndex: number }[] = [];
  target.forEach((id, toIndex) => {
    const index = order.indexOf(id);
    if (index < 0 || index === toIndex) return;
    order.splice(toIndex, 0, ...order.splice(index, 1));
    moves.push({ index, toIndex });
  });
  return moves;
}

/** How a seat joined: a bot (at its level), an account, or a guest. */
export function memberOf(seat: SeatLike): TeamMember {
  const name = normalizeName(seat.name);
  if (seat.cpuPPR) return { name, kind: "bot", ppr: seat.cpuPPR };
  if (seat.userId) return { name, kind: "account", userId: seat.userId };
  return { name, kind: "guest" };
}

/**
 * How a saved own-score team gets back into a lobby, one slot per player in
 * throwing order: a seat that is already there (and on no other team, `taken`),
 * a guest or a bot to add, or a signed-in player who isn't in the lobby, since
 * they join from their own board.
 */
export function rejoinSlots(team: SavedTeam, players: readonly SeatLike[], hostId: string | null | undefined, taken: ReadonlySet<string>): SeatSlot[] {
  const members = team.members ?? team.players.map((name): TeamMember => ({ name, kind: "guest" }));
  const used = new Set(taken);
  const claim = (fits: (seat: SeatLike) => boolean): string | undefined => {
    const seat = players.find(candidate => candidate.id && !used.has(candidate.id) && fits(candidate));
    if (seat?.id) used.add(seat.id);
    return seat?.id;
  };
  return members.map((member): SeatSlot => {
    if (member.kind === "account") {
      const seatId = claim(seat => Boolean(member.userId) && seat.userId === member.userId);
      return seatId ? { kind: "seat", seatId } : { kind: "missing", name: member.name };
    }
    if (member.kind === "bot") {
      const seatId = claim(seat => Boolean(seat.cpuPPR) && seat.cpuPPR === member.ppr);
      return seatId ? { kind: "seat", seatId } : { kind: "bot", name: member.name, ppr: member.ppr ?? 60 };
    }
    const seatId = claim(seat => isHostedGuest(seat, hostId) && normalizeName(seat.name) === member.name);
    return seatId ? { kind: "seat", seatId } : { kind: "guest", name: member.name };
  });
}

/**
 * The seat each slot ended up with once the lobby has seated the new ones, or
 * `undefined` where nobody was: a guest found by its name, a bot by its level,
 * each among the seats that weren't there before (`known`) and each once.
 */
export function resolveSlots(slots: readonly SeatSlot[], known: ReadonlySet<string>, players: readonly SeatLike[]): (string | undefined)[] {
  const fresh = players.filter(seat => seat.id && !known.has(seat.id));
  const used = new Set<string>();
  const take = (fits: (seat: SeatLike) => boolean): string | undefined => {
    const seat = fresh.find(candidate => !used.has(candidate.id!) && fits(candidate));
    if (seat?.id) used.add(seat.id);
    return seat?.id;
  };
  return slots.map((slot) => {
    if (slot.kind === "seat") return slot.seatId;
    if (slot.kind === "guest") return take(seat => !seat.userId && !seat.cpuPPR && normalizeName(seat.name) === slot.name);
    if (slot.kind === "bot") return take(seat => seat.cpuPPR === slot.ppr);
    return undefined;
  });
}

/** The games autodarts has bots for; any other lobby answers a bot with `bots_not_supported`. */
const BOT_VARIANTS: readonly string[] = [ "X01", "Cricket" ];

/** The site's eleven bot levels, as its Add Bot dialog lists them: level n averages about 10n + 10. */
export const BOT_LEVELS: readonly number[] = [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 ];

/** A level's cpuPPR, the site's measure of how well a bot throws. */
export function botPpr(level: number): number {
  return 10 + 10 * level;
}

/** The name the site gives a bot of that level. */
export function botName(level: number): string {
  return `Bot Level ${level}`;
}

/** Whether a game has bots. One whose variant isn't known yet gets the benefit of the doubt. */
export function hasBots(variant: string | null | undefined): boolean {
  return !variant || BOT_VARIANTS.includes(variant);
}

/** Why the drawer's bots are off. */
export const BOTS_ONLY_TEXT = "Bots only play X01 and Cricket.";

/** Why a lobby with sets has no own scores: a team result is counted in legs. */
export const LEGS_ONLY_TEXT = "Own-score teams play legs. Set the lobby to legs to use them.";

/**
 * What stops a saved own-score team from rejoining this lobby before anyone is
 * added, or nothing: a lobby with sets, where no team result is counted, or a
 * bot to add in a game without bots, which would leave the team short of
 * whoever comes after it.
 */
export function rejoinProblem(team: SavedTeam, slots: readonly SeatSlot[], game: { variant?: string | null; sets?: number | null }): string | undefined {
  if (game.sets) return LEGS_ONLY_TEXT;
  if (hasBots(game.variant) || !slots.some(slot => slot.kind === "bot")) return undefined;
  return `${team.name} has a bot, and bots only play ${joinNames(BOT_VARIANTS)}.`;
}

/** The guests and bots that were to be added and have no seat: the lobby didn't take them. */
export function unseated(slots: readonly SeatSlot[], ids: readonly (string | undefined)[]): string[] {
  return slots.flatMap((slot, index) => (slot.kind === "guest" || slot.kind === "bot") && !ids[index] ? [ slot.name ] : []);
}

/** The drawer's picks as places to fill: a seat already there, or a guest or a bot to add. */
export function pickSlots(picks: readonly OwnPick[]): SeatSlot[] {
  return picks.map((pick): SeatSlot => {
    if ("seatId" in pick) return { kind: "seat", seatId: pick.seatId };
    if ("bot" in pick) return { kind: "bot", name: pick.name, ppr: pick.bot };
    return { kind: "guest", name: normalizeName(pick.guest) };
  });
}

/** What stops an own-score team from being added, in words for the drawer, or nothing. */
export function checkOwnTeam(draft: OwnDraft, context: OwnContext): string | undefined {
  const name = normalizeName(draft.name);
  if (!name) return "Give the team a name.";
  if (name.length > MAX_NAME_LENGTH) return `A team name can be ${MAX_NAME_LENGTH} characters at most.`;
  if (uniqueNames(context.teamNames).includes(name)) return `There's already a team called ${name} in this lobby.`;
  if (draft.picks.length < MIN_PLAYERS) return "Add at least one player.";
  if (draft.picks.length > MAX_PLAYERS) return `A team can have ${MAX_PLAYERS} players at most.`;

  const seats = draft.picks.filter((pick): pick is { seatId: string; name: string } => "seatId" in pick);
  const onAnother = seats.find(pick => context.takenSeats.has(pick.seatId));
  if (onAnother) return `${normalizeName(onAnother.name)} is already on another team.`;
  const guests = draft.picks.filter((pick): pick is { guest: string } => "guest" in pick).map(pick => normalizeName(pick.guest));
  if (new Set(guests).size !== guests.length || new Set(seats.map(pick => pick.seatId)).size !== seats.length) return "Each player can only be in the team once.";
  const seated = new Set(uniqueNames(context.seatNames));
  const clash = guests.find(guest => seated.has(guest));
  if (clash) return `There's already a player called ${clash} in this lobby. Pick them under In this lobby.`;
  // Bots join as seats of their own, as new guests do; bots may share a name.
  const joining = guests.length + draft.picks.filter(pick => "bot" in pick).length;
  if (joining > context.freeSeats) return `The lobby has room for ${context.freeSeats} more ${context.freeSeats === 1 ? "player" : "players"}.`;
  return undefined;
}

/**
 * The offered names the drawer can delete: all but a saved team's players,
 * who come back with their team however often they're deleted. Deleting the
 * team is how those go.
 */
export function forgettableNames(offered: readonly string[], saved: readonly SavedTeam[]): string[] {
  const kept = new Set(saved.flatMap(team => team.players));
  return uniqueNames(offered).filter(name => !kept.has(name));
}

/** Who stands in a saved team's way in this lobby, by name. */
export interface LobbyTeams {
  /** A shared-score team's player → that team. */
  playerTeams: Readonly<Record<string, string>>;
  /** The name of a seat on an own-score team → that team. */
  seatTeams: Readonly<Record<string, string>>;
}

/**
 * Why a saved team can't join this lobby as it stands, or nothing: one of its
 * players is already on another team here. A bot never is: bots share names,
 * and another one joins.
 */
export function savedTeamProblem(team: SavedTeam, lobby: LobbyTeams): string | undefined {
  const taken = team.format === "own" ? lobby.seatTeams : lobby.playerTeams;
  const people = team.members ? team.members.filter(member => member.kind !== "bot").map(member => member.name) : team.players;
  const player = people.find(name => taken[name] && taken[name] !== team.name);
  return player ? `${player} is already on ${taken[player]}.` : undefined;
}

/** "A", "A and B", "A, B and C". */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** The note under the lobby's players when the teams aren't the same size, or "". */
export function unevenText(teams: readonly LineupTeam[]): string {
  const sizes = teams.map(team => team.seatIds.length);
  if (teams.length < 2 || sizes.every(size => size === sizes[0])) return "";
  const [ first, ...rest ] = teams;
  const firstPart = `${first.name} has ${first.seatIds.length} ${first.seatIds.length === 1 ? "player" : "players"}`;
  return `${joinNames([ firstPart, ...rest.map(team => `${team.name} ${team.seatIds.length}`) ])}: the bigger team throws more often each round.`;
}

/** A member's place in its own-score team, for the lobby row: "1 of 2", or nothing in a team of one. */
export function memberLabel(place: number, size: number): string {
  return size > 1 ? `${place} of ${size}` : "";
}

function german(language: string | null | undefined): boolean {
  return (language ?? "").toLowerCase().startsWith("de");
}

/** "TOM to throw", in the site's own words for its language (Killer's `game.killer.toThrow`). */
export function toThrowText(player: string, language: string | null | undefined): string {
  return german(language) ? `${player} ist dran` : `${player} to throw`;
}

/** The pill while the site's Winner panel is up for a leg: in the site's language, where "ist dran" is. */
export function legWonText(name: string, language?: string | null): string {
  return german(language) ? `${name} gewinnt das Leg` : `${name} wins the leg`;
}

/** The part of a match frame the team rules read: {@link IMatch} fits it. */
export interface TeamMatch extends TurnState {
  id?: string;
  /** "First to N legs". */
  legs?: number | null;
  sets?: number | null;
  scores?: readonly { legs: number; sets: number }[] | null;
  gameScores?: readonly number[];
  gameWinner?: number;
  winner?: number;
  finished?: boolean;
  gameFinished?: boolean;
  turnBusted?: boolean;
  turns?: readonly { points?: number; busted?: boolean; throws?: readonly { id: string }[] }[];
  adtTeams?: AdtTeams;
}

/** A checkout the partner rule stops, with the scores that stop it. */
export interface Breach {
  player: string;
  teammate: string;
  teammateLeft: number;
  opponentsLeft: number;
  opponents: string[];
}

/** What {@link teamView} adds to a frame it changes. */
export interface AdtTeams {
  /** The team this won leg took to its target. */
  decided?: string;
  /** Every team's legs, with this leg in. */
  legs?: Record<string, number>;
  /** A checkout the partner rule turned into a bust: who threw it, and the visit's darts to undo. */
  bust?: { seat: number; dartIds: string[]; breach: Breach };
}

export interface TeamViewContext {
  enabled: boolean;
  partnerRule: boolean;
  /** The frame's own match's lineup, looked up by the frame's id. */
  lineup: Lineup | undefined;
}

/** A card as the match screen shows it: its name, and whether it is a top-bar cell. */
export interface CardInfo {
  name: string;
  small: boolean;
}

/** The own-score team of each seat, by its index in `players`, found by seat id. */
export function lineupTeams(players: readonly SeatLike[], lineup: Lineup | undefined): Map<number, LineupTeam> {
  const out = new Map<number, LineupTeam>();
  if (!lineup) return out;
  players.forEach((seat, index) => {
    const team = seat.id ? lineup.teams.find(candidate => candidate.seatIds.includes(seat.id!)) : undefined;
    if (team) out.set(index, team);
  });
  return out;
}

/** Every team's legs: its members' legs added up. `scores` is in the same order as `players`. */
export function teamLegs(match: TeamMatch, lineup: Lineup | undefined): Record<string, number> {
  const legs: Record<string, number> = {};
  if (!lineup) return legs;
  for (const team of lineup.teams) legs[team.name] = 0;
  lineupTeams(match.players ?? [], lineup).forEach((team, index) => {
    legs[team.name] += match.scores?.[index]?.legs ?? 0;
  });
  return legs;
}

/** The team whose legs have reached the match's "First to N", if any. Legs only: the site counts sets per player. */
export function decidedTeam(match: TeamMatch, lineup: Lineup | undefined): string | undefined {
  const target = match.legs ?? 0;
  if (!lineup || target < 1 || match.sets) return undefined;
  const legs = teamLegs(match, lineup);
  return lineup.teams.find(team => (legs[team.name] ?? 0) >= target)?.name;
}

/**
 * Whether a checkout by `seat` breaks the e-darts partner rule: in X01, with
 * exactly two own-score teams and every seat on one of them, a human player
 * may not check out while a teammate has more left than the other team's
 * players together. Scores are as they stand: during a visit only the
 * thrower's changes, so everyone else's are what they were at its start.
 */
export function partnerRuleBreach(match: TeamMatch, lineup: Lineup | undefined, seat: number): Breach | undefined {
  if (!lineup || !partnerRuleApplies(match, lineup)) return undefined;
  const players = match.players ?? [];
  const seats = lineupTeams(players, lineup);
  const own = seats.get(seat);
  if (!own || players[seat]?.cpuPPR) return undefined;

  const scores = match.gameScores ?? [];
  const opponents: string[] = [];
  let opponentsLeft = 0;
  let teammate: { index: number; left: number } | undefined;
  players.forEach((player, index) => {
    const left = scores[index] ?? 0;
    if (seats.get(index)?.name !== own.name) {
      opponentsLeft += left;
      opponents.push(normalizeName(player.name));
    } else if (index !== seat && (!teammate || left > teammate.left)) {
      teammate = { index, left };
    }
  });
  if (!teammate || teammate.left <= opponentsLeft) return undefined;
  return { player: normalizeName(players[seat]?.name), teammate: normalizeName(players[teammate.index]?.name), teammateLeft: teammate.left, opponentsLeft, opponents };
}

/** Whether the partner rule can come into this match at all: X01, with exactly two own-score teams and every seat on one of them. */
export function partnerRuleApplies(match: TeamMatch, lineup: Lineup | undefined): boolean {
  if (match.variant !== "X01" || lineup?.teams.length !== 2) return false;
  const players = match.players ?? [];
  return lineupTeams(players, lineup).size === players.length;
}

/** The lobby's partner-rule card. */
export interface PartnerCard {
  /** An X01 lobby playing legs, whose teams, if it has any, keep their own scores. */
  show: boolean;
  on: boolean;
  /** Whether the rule can come in as the lobby stands: two teams, with every seat on one. */
  applies: boolean;
}

/** The card as a lobby stands: the rule is the lobby's own, or the one the last lobby left. */
export function partnerCardState(lobby: { variant?: string | null; sets?: number | null; players?: readonly SeatLike[] | null }, lineup: Lineup | undefined, saved: readonly SavedTeam[], hostId: string | null | undefined, fallback: boolean): PartnerCard {
  const players = lobby.players ?? [];
  const show = lobby.variant === "X01" && !lobby.sets && lobbyFormat(players, lineup, saved, hostId) !== "shared";
  return { show, on: lineupPartnerRule(lineup, fallback), applies: show && partnerRuleApplies({ variant: "X01", players }, lineup) };
}

/**
 * A frame as the team rules see it, for every feature that reads game data:
 * a won leg that takes an own-score team to its target reads as the match won,
 * and a checkout against the partner rule (when it is on) as a bust, with the
 * visit's points and the leg taken back. Anything else is returned as it came.
 * The frame itself is never changed.
 */
export function teamView<M extends TeamMatch>(match: M, context: TeamViewContext): M {
  if (!context.enabled || !context.lineup) return match;
  const winner = match.gameWinner ?? -1;
  if (winner < 0) return match;

  const breach = context.partnerRule ? partnerRuleBreach(match, context.lineup, winner) : undefined;
  const visit = match.turns?.[0];
  if (breach && visit) {
    const gameScores = [ ...(match.gameScores ?? []) ];
    gameScores[winner] = (gameScores[winner] ?? 0) + (visit.points ?? 0);
    const scores = match.scores ? match.scores.map((score, index) => index === winner ? { ...score, legs: Math.max(0, score.legs - 1) } : score) : match.scores;
    // A checkout that also ended the site's match (its thrower reached the
    // target alone) is taken back with the match it won.
    return {
      ...match,
      gameWinner: -1,
      gameFinished: false,
      winner: -1,
      finished: false,
      turnBusted: true,
      gameScores,
      scores,
      turns: [ { ...visit, busted: true }, ...(match.turns ?? []).slice(1) ],
      adtTeams: { bust: { seat: winner, dartIds: (visit.throws ?? []).map(dart => dart.id), breach } },
    } as M;
  }

  const decided = decidedTeam(match, context.lineup);
  if (!decided) return match;
  return {
    ...match,
    winner: (match.winner ?? -1) >= 0 ? match.winner : winner,
    adtTeams: { decided, legs: teamLegs(match, context.lineup) },
  } as M;
}

/**
 * Which seat each card shows, by index into `players`, or -1. Cards carry only
 * a name ([[match-players-rotates-every-leg]]). Where seats share one (two bots
 * of one level), the layout decides:
 *   - the wide and sidebar layouts draw one card per seat, in seat order
 *     (`index`); the sidebar's compact rows are small cards, but in seat order
 *     all the same
 *   - the stacked layout draws one card more than there are seats: its top bar,
 *     in throwing order (`players`'s own), and a big card for whoever is up
 *   - a single full card among small ones is whoever is up, in either
 */
export function assignCards(cards: readonly CardInfo[], players: readonly SeatLike[], up: number): number[] {
  const byName = new Map<string, number[]>();
  players.forEach((player, index) => {
    const name = normalizeName(player.name);
    byName.set(name, [ ...(byName.get(name) ?? []), index ]);
  });
  const upCard = cards.some(card => card.small) && cards.filter(card => !card.small).length === 1;
  const topBar = cards.length > players.length;
  const taken = new Map<string, number>();
  return cards.map((card) => {
    const name = normalizeName(card.name);
    const seats = byName.get(name) ?? [];
    if (seats.length <= 1) return seats[0] ?? -1;
    if (!card.small && upCard) return seats.includes(up) ? up : -1;
    const key = `${card.small ? "small" : "full"}|${name}`;
    const nth = taken.get(key) ?? 0;
    taken.set(key, nth + 1);
    const ordered = card.small && topBar ? seats : [ ...seats ].sort((a, b) => (players[a].index ?? a) - (players[b].index ?? b));
    return ordered[nth] ?? -1;
  });
}

/** The pill once a team, or a player, has won the match. */
export function decidedText(team: string, language?: string | null): string {
  return german(language) ? `${team} gewinnt das Match` : `${team} wins the match`;
}

/** The result beside it: the winner's legs first, then the others', in the lineup's order. */
export function resultText(legs: Record<string, number>, decided: string, lineup: Lineup): string {
  const others = lineup.teams.filter(team => team.name !== decided).map(team => legs[team.name] ?? 0);
  return [ legs[decided] ?? 0, ...others ].join(" – ");
}

/** A partner-rule line in the pill's two parts: the news, then the reason at lower emphasis. */
export interface PillNote {
  primary: string;
  secondary: string;
}

/** While the partner rule stops the player up from checking out. */
export function ruleWarningNote(breach: Breach): PillNote {
  return { primary: "No checkout this visit", secondary: `${breach.teammate} has ${breach.teammateLeft} left, more than ${joinNames(breach.opponents)} together (${breach.opponentsLeft})` };
}

/** After a checkout the partner rule turned into a bust. */
export function ruleBustNote(breach: Breach): PillNote {
  return { primary: `${breach.player}'s checkout didn't count`, secondary: "partner rule" };
}

/** When the checkout was taken back but autodarts wouldn't pass the turn on: the visit is empty, so Next is all that's left. */
export function ruleNextNote(breach: Breach): PillNote {
  return { primary: `${breach.player}'s checkout didn't count`, secondary: "press Next to pass the turn" };
}

/** When autodarts refused to take a rule-breaking checkout back. */
export function ruleRefusedNote(breach: Breach): PillNote {
  return { primary: `Undo ${breach.player}'s checkout yourself`, secondary: "it breaks the partner rule, and autodarts didn't take it back" };
}
