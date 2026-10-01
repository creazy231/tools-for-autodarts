/**
 * Search and filters for the libraries in the Animations, Caller, Sound FX and
 * WLED settings: which items to show for what was typed and which pill is
 * picked, and in which order.
 *
 * Pure (no DOM, no storage, no Vue), so it runs under tsx. The dialogs map
 * each stored item to a flat {@link LibraryEntry} and render what comes back.
 */

import type { MessageKey } from "@/utils/i18n";

/** The kinds of trigger the filter pills offer. */
export type TriggerCategory = "scores" | "throws" | "events" | "board" | "players";

/** A pill: everything, one kind of trigger, or what is switched off. */
export type LibraryFilter = "all" | TriggerCategory | "off";

export interface LibraryEntry {
  /** Position in the stored array, which is what edits and deletes address. */
  index: number;
  /** The title the list shows. */
  name: string;
  triggers: string[];
  /** Anything else it can be found by: a link, TTS text, a WLED address or preset. */
  source: string;
  enabled: boolean;
}

/**
 * Where each pill's label is in the catalog, for the component to hand to
 * `t()`: this module stays free of the i18n runtime, so it still runs under
 * tsx. The ids stay as they are, since the filter is keyed by them.
 */
export const CATEGORY_LABEL_KEYS: Record<TriggerCategory, MessageKey> = {
  scores: "library.categories.scores",
  throws: "library.categories.throws",
  events: "library.categories.events",
  board: "library.categories.board",
  players: "library.categories.players",
};

/** The order the pills come in. */
export const CATEGORY_ORDER: readonly TriggerCategory[] = [ "scores", "throws", "events", "board", "players" ];

const SCORE = "(?:180|1[0-7][0-9]|[1-9][0-9]|[0-9])";
const SCORE_RE = new RegExp(`^${SCORE}$`);
const RANGE_RE = new RegExp(`^(?:range_)?(${SCORE})[-_](${SCORE})$`);

/** One dart: a single, double, triple or miss beside a number, or the single bull. */
const DART_RE = /^(?:[sdtm](?:1[0-9]|20|[0-9])|s25|bull)$/;

const THROW_WORDS = new Set([ "bull", "outside", "miss", "double", "triple" ]);

const BOARD_WORDS = new Set([
  "board_starting",
  "board_started",
  "board_stopping",
  "board_stopped",
  "manual_reset_done",
  "throw",
  "last_throw",
  "takeout_finished",
  "calibration_started",
  "calibration_finished",
]);

const EVENT_WORDS = new Set([
  "gameon",
  "gameshot",
  "matchshot",
  "busted",
  "bulloff",
  "takeout",
  "idle",
  "other",
  "you_require",
  "next_player",
  "bot",
  "bot_throw",
  "opponent_throw",
  "cricket_hit",
  "cricket_miss",
  "lobby_in",
  "lobby_out",
  "tournament_ready",
]);

/**
 * A trigger as the categories read it: lower case, runs of whitespace as one
 * underscore, and Sound FX's `ambient_` prefix dropped, since `ambient_180` is
 * the same event as `180`.
 */
function bare(trigger: string): string {
  const t = trigger.trim().toLowerCase().replace(/\s+/g, "_");
  return t.startsWith("ambient_") ? t.slice("ambient_".length) : t;
}

/**
 * The kind of a trigger.
 *
 * Anything that is not a built-in trigger counts as a player's name. The
 * Caller, Sound FX and WLED all treat an unknown trigger as one, so a
 * misspelt trigger shows up there too, which is where it is worth seeing.
 */
export function triggerCategory(trigger: string): TriggerCategory {
  const t = bare(trigger);
  if (SCORE_RE.test(t) || RANGE_RE.test(t)) return "scores";
  if (THROW_WORDS.has(t) || DART_RE.test(t)) return "throws";

  const darts = t.split("_");
  if (darts.length >= 2 && darts.length <= 3 && darts.every(dart => DART_RE.test(dart))) return "throws";

  if (BOARD_WORDS.has(t)) return "board";
  if (EVENT_WORDS.has(t) || /^(?:gameshot|matchshot)[+_]/.test(t) || /^target(?:\d+|bull)$/.test(t)) return "events";
  return "players";
}

/** The two ends of a range trigger (`100-180`, `range_100_180`, `ambient_100-180`), in order. */
export function parseRange(trigger: string): [ number, number ] | null {
  const match = RANGE_RE.exec(bare(trigger));
  if (!match) return null;
  const a = Number(match[1]);
  const b = Number(match[2]);
  return a <= b ? [ a, b ] : [ b, a ];
}

/** Whether a range trigger takes in a score. */
export function rangeCovers(trigger: string, score: number): boolean {
  const range = parseRange(trigger);
  return range !== null && score >= range[0] && score <= range[1];
}

/** Case folded, with spaces and underscores as one: player names take either. */
function fold(text: string): string {
  return text.toLowerCase().replace(/[\s_]+/g, " ").trim();
}

/** Folded, then without Sound FX's prefix. */
function foldBare(trigger: string): string {
  const t = fold(trigger);
  return t.startsWith("ambient ") ? t.slice("ambient ".length) : t;
}

/** A query that is a score on its own, which also finds the ranges that cover it. */
function scoreOf(query: string): number | null {
  return SCORE_RE.test(query) ? Number(query) : null;
}

function sameRange(a: [ number, number ] | null, b: [ number, number ]): boolean {
  return a !== null && a[0] === b[0] && a[1] === b[1];
}

/**
 * How well an entry answers a folded, non-empty query, and 0 when it does not:
 *
 * - 4: a trigger is the query (ignoring `ambient_`), or the same range spelt another way
 * - 3: a trigger starts with it
 * - 2: every word of it is somewhere in the name, the triggers or the source
 * - 1: it is a score, and a range trigger covers it
 */
function rank(entry: LibraryEntry, query: string): number {
  const triggers = entry.triggers.map(foldBare);
  const range = parseRange(query.replace(/ /g, "_"));

  if (triggers.includes(query) || (range && entry.triggers.some(t => sameRange(parseRange(t), range)))) return 4;
  if (triggers.some(t => t.startsWith(query))) return 3;

  const haystack = [ entry.name, ...entry.triggers, entry.source ].map(fold).join("\n");
  if (query.split(" ").every(word => haystack.includes(word))) return 2;

  const score = scoreOf(query);
  if (score !== null && entry.triggers.some(t => rangeCovers(t, score))) return 1;
  return 0;
}

export function matchesFilter(entry: LibraryEntry, filter: LibraryFilter): boolean {
  if (filter === "all") return true;
  if (filter === "off") return !entry.enabled;
  return entry.triggers.some(trigger => triggerCategory(trigger) === filter);
}

/**
 * The entries to show, best match first.
 *
 * Without a query the list keeps its own order, which is the user's
 * arrangement, and with one ties keep that order too.
 */
export function searchLibrary(entries: readonly LibraryEntry[], query: string, filter: LibraryFilter = "all"): LibraryEntry[] {
  const q = fold(query);
  const found: { entry: LibraryEntry; rank: number }[] = [];

  for (const entry of entries) {
    if (!matchesFilter(entry, filter)) continue;
    const r = q ? rank(entry, q) : 1;
    if (r > 0) found.push({ entry, rank: r });
  }

  if (q) found.sort((a, b) => b.rank - a.rank || a.entry.index - b.entry.index);
  return found.map(item => item.entry);
}

/** How many entries each pill would show. An entry counts once for every kind of trigger it has. */
export function filterCounts(entries: readonly LibraryEntry[]): Record<LibraryFilter, number> {
  const counts: Record<LibraryFilter, number> = { all: entries.length, scores: 0, throws: 0, events: 0, board: 0, players: 0, off: 0 };
  for (const entry of entries) {
    if (!entry.enabled) counts.off++;
    for (const category of new Set(entry.triggers.map(triggerCategory))) counts[category]++;
  }
  return counts;
}

/** Whether the filter pills are worth showing: two kinds of trigger to tell apart, or something switched off. */
export function showsFilters(counts: Record<LibraryFilter, number>): boolean {
  return CATEGORY_ORDER.filter(category => counts[category]).length >= 2 || counts.off > 0;
}

/**
 * The filter to keep once the library has changed under it: back to all when
 * its pill has gone, or the whole row has, which would leave the list narrowed
 * with nothing on screen to widen it again.
 */
export function keptFilter(filter: LibraryFilter, counts: Record<LibraryFilter, number>): LibraryFilter {
  if (filter !== "all" && (!counts[filter] || !showsFilters(counts))) return "all";
  return filter;
}

/** Whether a trigger chip is one the query found, to highlight it. */
export function triggerMatches(trigger: string, query: string): boolean {
  const q = fold(query);
  if (!q) return false;
  const t = fold(trigger);
  if (q.split(" ").some(word => t.includes(word))) return true;
  const score = scoreOf(q);
  return score !== null && rangeCovers(trigger, score);
}

/**
 * A title cut into the parts the query found and the rest, for marking them.
 * Matched on a folded copy of the same length, so the title keeps its own case
 * and spacing.
 */
export function highlight(text: string, query: string): { text: string; match: boolean }[] {
  if (!text) return [];
  const words = fold(query).split(" ").filter(Boolean);
  const flat = text.toLowerCase().replace(/_/g, " ");
  if (!words.length || flat.length !== text.length) return [ { text, match: false } ];

  const marked = Array.from({ length: text.length }, () => false);
  for (const word of words) {
    for (let at = flat.indexOf(word); at !== -1; at = flat.indexOf(word, at + word.length)) {
      marked.fill(true, at, at + word.length);
    }
  }

  const parts: { text: string; match: boolean }[] = [];
  let start = 0;
  for (let i = 1; i <= text.length; i++) {
    if (i === text.length || marked[i] !== marked[start]) {
      parts.push({ text: text.slice(start, i), match: marked[start] });
      start = i;
    }
  }
  return parts;
}
