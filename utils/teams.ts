/**
 * Teams: which seats of a lobby or match are teams, whose turn it is inside
 * one, and the rules a new team has to meet.
 *
 * A team is one guest seat on the host's board, named after the team, and its
 * players take turns on that seat's score, like steel-tip doubles. The site
 * knows nothing about the players: it scores the seat. Everything here is what
 * the extension adds on top, and all of it is pure (no DOM, no storage, no
 * extension APIs), so it runs under tsx. The lobby, the match screen, the
 * Caller and the settings all build from here.
 *
 * Saved teams are keyed by name. A guest the host adds under a saved team's
 * name, in any lobby or match, is that team, which is what makes a team
 * outlast a reload, a rematch and a new lobby.
 */

import type { ColorScheme } from "@/utils/storage";

import { CARD_PRESETS, type ColorPreset, SITE_CARD } from "@/utils/colors";

/** A team as it is saved: its seat's name, its players in throwing order, and its colour. */
export interface SavedTeam {
  /** The guest seat's name, as the site shows it: trimmed and upper case. */
  name: string;
  /** In throwing order, upper case, each once. */
  players: string[];
  /** The gradient its card turns while it is up: a Colors scheme. */
  colour: ColorScheme;
}

/** `IConfig.teams`. */
export interface TeamsConfig {
  enabled: boolean;
  /** Most recently used first. */
  saved: SavedTeam[];
}

/** Per team name: how far tap-to-correct has moved its order on. */
export type TeamShifts = Record<string, number>;

/** Per match id: the shifts of its teams, and when they were last written. */
export type ShiftStore = Record<string, { at: number; shifts: TeamShifts }>;

/** The fields of a lobby or match seat that say whose it is. */
export interface SeatLike {
  name?: string | null;
  userId?: string | null;
  hostId?: string | null;
  cpuPPR?: number | null;
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

export const MIN_PLAYERS = 2;
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

/** Settings from anywhere, in the current shape: broken entries dropped, the rest cleaned. */
export function normalizeTeams(saved: unknown): TeamsConfig {
  const value = (saved && typeof saved === "object" ? saved : {}) as Record<string, any>;
  const teams: SavedTeam[] = [];
  for (const entry of Array.isArray(value.saved) ? value.saved : []) {
    const name = normalizeName(entry?.name).slice(0, MAX_NAME_LENGTH);
    if (!name || teams.some(team => team.name === name)) continue;
    const players = uniqueNames(Array.isArray(entry?.players) ? entry.players : []).slice(0, MAX_PLAYERS);
    if (players.length < MIN_PLAYERS) continue;
    teams.push({ name, players, colour: normalizeColour(entry?.colour) });
  }
  return { enabled: Boolean(value.enabled), saved: teams };
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

/** The seats that are teams, by their index in `players`. */
export function teamSeats(players: readonly SeatLike[], teams: readonly SavedTeam[], hostId: string | null | undefined): Map<number, SavedTeam> {
  const seats = new Map<number, SavedTeam>();
  players.forEach((seat, index) => {
    if (!isHostedGuest(seat, hostId)) return;
    const team = findTeam(teams, seat.name);
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

/**
 * What the Caller calls when the seat up is a team, most specific first: the
 * player whose visit it is, then the team. Empty when the seat is no team.
 */
export function callNames(state: TurnState, teams: readonly SavedTeam[], hostId: string | null | undefined, shifts: TeamShifts): string[] {
  const seat = state.player ?? 0;
  const team = teamSeats(state.players ?? [], teams, hostId).get(seat);
  if (!team) return [];
  const up = team.players[playerUp(state, seat, team, shifts[team.name] ?? 0)];
  return up ? [ up, team.name ] : [ team.name ];
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
  if (players.length < MIN_PLAYERS) return `A team needs at least ${MIN_PLAYERS} players.`;
  if (players.length > MAX_PLAYERS) return `A team can have ${MAX_PLAYERS} players at most.`;

  const others = new Set(uniqueNames(context.otherTeamPlayers));
  const clash = players.find(player => others.has(player));
  if (clash) return `${clash} is already on another team.`;
  return undefined;
}

/** A team as plain data: its fields copied out of whatever reactive proxy holds them. */
function plainTeam(team: SavedTeam): SavedTeam {
  const { preset, from, to } = team.colour;
  return { name: team.name, players: [ ...team.players ], colour: { preset, from, to } };
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

/** "TOM to throw", in the site's own words for its language (Killer's `game.killer.toThrow`). */
export function toThrowText(player: string, language: string | null | undefined): string {
  return (language ?? "").toLowerCase().startsWith("de") ? `${player} ist dran` : `${player} to throw`;
}
