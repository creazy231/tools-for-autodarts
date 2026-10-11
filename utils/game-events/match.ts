import { triggerPatterns } from "./patterns";
import { LEVEL_STEP } from "./priorities";
import { TriggerCategory } from "./types";

import type { FallbackKind, IRankedTrigger } from "./types";

/**
 * Which sound, effect or animation a feature plays for an update's triggers.
 *
 * Replaces the lookups each feature had of its own: the exact trigger, a range
 * (`100-140`) for a visit's total, a pick at random among several items on the
 * same trigger, and the fallbacks — which are no longer chains in the features
 * but triggers of their own here, scored below the one they stand in for
 * (utils/game-events/derive.ts `dartTriggers`).
 *
 * An item's trigger may also join triggers with `+` (`matchshot+t20`): it fits
 * when every part is a trigger of the update, and scores as its strongest part
 * with a little more for each of the others, so it beats that part alone but
 * stays in its level: `matchshot+d20` > `matchshot` > `gameshot+d20` >
 * `gameshot`. A part may also be the context of the update — whoever is up,
 * the game being played (`t20+alice`, `t20+alice+cricket`) — which counts a
 * little less, so the more a trigger names, the more it wins by. Context alone never fits: a `+` item needs at
 * least one trigger of the update, or a name would go off on every dart.
 * Neither do the triggers of a kind the feature does not take (`partOnly`):
 * a Caller that does not call every dart still calls `gameshot+d20`, but not
 * `t20+alice`.
 */

/** What a context part adds to a `+` item (utils/game-events/priorities.ts `LEVEL_STEP`). */
const CONTEXT_BONUS = 1;
/**
 * What another trigger part adds to a `+` item: more than a context part, and
 * a little more still the higher its own priority, so `gameshot+t20_t15_d20`
 * and `gameshot+d20` go by the feature's order. A priority stays below 200.
 */
const PART_BONUS = 2;
const PART_PRIORITY_SHARE = 1 / 100;
/** All a `+` item's other parts add together, short of the next level up. */
const MAX_JOINED_BONUS = LEVEL_STEP - 1;

/** The fallbacks that are a visit's darts spelled another way, which may be parts of a `+` item. */
const SPELLINGS: ReadonlySet<FallbackKind> = new Set([ "missWildcard" ]);

export interface MatchableItem {
  enabled?: boolean;
  /** A WLED effect saved long ago may hold a single trigger as a string. */
  triggers?: string[] | string;
}

export interface MatchOptions {
  /**
   * The spellings a trigger is looked up under, the first that has an item
   * winning: Sound FX looks up `ambient_s20` and then `s20`.
   */
  forms?: (token: string) => string[];
  /**
   * What else a `+` item may be made of: the names of whoever is up and the
   * game's (utils/game-events/derive.ts `contextTokens`). Never matched alone.
   */
  context?: readonly string[];
}

export interface TriggerMatch<T> {
  /** The trigger that matched; for a `+` item, the strongest of its parts. */
  trigger: IRankedTrigger;
  /** What to play, in order: one item, or one per part of a sequence. */
  items: T[];
  score: number;
  category: TriggerCategory;
  /** What matched, for the log. */
  matched: string;
}

/**
 * A library read once: the switched-on items by their triggers, as they are
 * looked up, so that each lookup is one step rather than a pass through the
 * whole library — for every trigger, and every spelling of it, of every update.
 */
interface ItemIndex<T> {
  /** By trigger, in lower case: the items in the library's order. */
  exact: Map<string, T[]>;
  /** The items on a range (`100-140`), each range on its own. */
  ranges: { item: T; min: number; max: number }[];
  /** The `+` items, with their parts spelled as they are matched. */
  joined: { item: T; trigger: string; parts: string[] }[];
}

/**
 * Each library's index, built the first time it is looked up. The features
 * read their config anew when it changes and never change a library in
 * place, so a changed library is another array, and indexed again.
 */
const indexes = new WeakMap<readonly MatchableItem[], ItemIndex<MatchableItem>>();

function indexItems<T extends MatchableItem>(all: readonly T[] | undefined): ItemIndex<T> {
  if (!all) return buildIndex([]);
  let index = indexes.get(all) as ItemIndex<T> | undefined;
  if (!index) indexes.set(all, index = buildIndex(all));
  return index;
}

function buildIndex<T extends MatchableItem>(all: readonly T[]): ItemIndex<T> {
  const index: ItemIndex<T> = { exact: new Map(), ranges: [], joined: [] };
  for (const item of all) {
    if (!item.enabled) continue;
    for (const trigger of triggersOf(item)) {
      const key = trigger.toLowerCase().trim();
      const list = index.exact.get(key);
      if (!list) index.exact.set(key, [ item ]);
      else if (list[list.length - 1] !== item) list.push(item);

      const range = bare(trigger).match(triggerPatterns.ranges);
      if (range) index.ranges.push({ item, min: Number(range[1]), max: Number(range[2]) });
      if (trigger.includes("+")) index.joined.push({ item, trigger, parts: trigger.split("+").map(bare) });
    }
  }
  return index;
}

function triggersOf(item: MatchableItem): string[] {
  if (Array.isArray(item.triggers)) return item.triggers;
  return typeof item.triggers === "string" ? [ item.triggers ] : [];
}

function randomOf<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

/** A Sound FX trigger reads the same with its `ambient_` prefix as without, for ranges and `+` parts. */
function bare(trigger: string): string {
  return trigger.toLowerCase().trim().replace(/^ambient_/, "");
}

/** The items on a trigger: under its first spelling that has one, else, for a total, under a range it falls in. */
function itemsFor<T extends MatchableItem>(index: ItemIndex<T>, token: string, options: MatchOptions, ranges: boolean): T[] {
  for (const form of options.forms?.(token) ?? [ token ]) {
    const exact = index.exact.get(form);
    if (exact?.length) return exact;
  }
  if (!ranges || !/^\d+$/.test(token)) return [];
  const value = Number(token);
  const fit = new Set(index.ranges.filter(range => value >= range.min && value <= range.max).map(range => range.item));
  return [ ...fit ];
}

/** Every way the items answer the triggers, one entry per trigger (and per `+` item). */
export function rankItems<T extends MatchableItem>(all: readonly T[] | undefined, triggers: readonly IRankedTrigger[], options: MatchOptions = {}): TriggerMatch<T>[] {
  const index = indexItems(all);
  const found: TriggerMatch<T>[] = [];

  for (const trigger of triggers) {
    if (trigger.joinedOnly || trigger.partOnly) continue;
    if (typeof trigger.trigger === "string") {
      const fit = itemsFor(index, trigger.trigger, options, trigger.category === TriggerCategory.TOTAL);
      if (fit.length) found.push({ trigger, items: [ randomOf(fit) ], score: trigger.priority, category: trigger.category, matched: trigger.trigger });
      continue;
    }

    // A sequence needs its first part; the rest play when there is something for them.
    const [ first, ...rest ] = trigger.trigger;
    const head = itemsFor(index, first, options, false);
    if (!head.length) continue;
    const sequence = [ randomOf(head) ];
    for (const part of rest) {
      const fit = itemsFor(index, part, options, false);
      if (fit.length) sequence.push(randomOf(fit));
    }
    found.push({ trigger, items: sequence, score: trigger.priority, category: trigger.category, matched: trigger.trigger.join(" ") });
  }

  // `+` items are made of a feature's own triggers and of the update's context,
  // and may name triggers of a kind it does not take beside one it does.
  // Of the fallbacks, only the other spellings of a visit's darts take part
  // (`t20_miss_d20+alice`): the rest stand in for a dart
  // with nothing of its own, and `gameshot+outside` would fit any miss.
  const context = new Set(options.context ?? []);
  const own = new Map<string, IRankedTrigger>();
  for (const trigger of triggers) {
    if (typeof trigger.trigger !== "string" || (trigger.fallback && !SPELLINGS.has(trigger.fallback))) continue;
    const known = own.get(trigger.trigger);
    // A trigger the feature takes wins over a part-only one spelled the same.
    const better = !known
      || (!!known.partOnly && !trigger.partOnly)
      || (!!known.partOnly === !!trigger.partOnly && known.priority < trigger.priority);
    if (better) own.set(trigger.trigger, trigger);
  }
  for (const { item, trigger: joined, parts } of index.joined) {
    if (!parts.every(part => own.has(part) || context.has(part))) continue;
    // A name is a trigger of its own when its player comes up or wins a
    // match. Beside a trigger that is not a name it only says whose that
    // is, and counts as context: `gameshot+alice` is a gameshot, not a name.
    const events = parts.filter(part => own.has(part) && !context.has(part));
    const hits = (events.length ? events : parts.filter(part => own.has(part))).map(part => own.get(part)!);
    const named = parts.length - hits.length;
    // At least one part must be of a kind the feature takes, and the item plays as that one.
    const taken = hits.filter(hit => !hit.partOnly);
    if (!taken.length) continue;
    const strongest = taken.reduce((best, hit) => (hit.priority > best.priority ? hit : best));
    const others = hits.filter(hit => hit !== strongest);
    const bonus = others.reduce((sum, hit) => sum + PART_BONUS + hit.priority * PART_PRIORITY_SHARE, 0) + named * CONTEXT_BONUS;
    const score = strongest.priority + Math.min(bonus, MAX_JOINED_BONUS);
    found.push({ trigger: strongest, items: [ item ], score, category: strongest.category, matched: joined });
  }

  return found;
}

function best<T>(matches: readonly TriggerMatch<T>[]): TriggerMatch<T> | undefined {
  if (!matches.length) return undefined;
  const top = Math.max(...matches.map(match => match.score));
  return randomOf(matches.filter(match => match.score === top));
}

/** The one thing to show: WLED's effect, Animations' GIF. */
export function pickBest<T extends MatchableItem>(items: readonly T[] | undefined, triggers: readonly IRankedTrigger[], options: MatchOptions = {}): TriggerMatch<T> | undefined {
  return best(rankItems(items, triggers, options));
}

/** What a win or a bust takes the place of: the dart, the visit's total and its darts together. */
const REPLACED_BY_OUTCOME: ReadonlySet<TriggerCategory> = new Set([ TriggerCategory.THROW, TriggerCategory.TOTAL, TriggerCategory.COMBO ]);

/**
 * What the Caller and Sound FX play: the best of each category — one name, one
 * dart, one total — in the order of their scores, which is the order they play in.
 * A win or a bust is played in place of the dart, the total and the combination.
 */
export function pickPerCategory<T extends MatchableItem>(items: readonly T[] | undefined, triggers: readonly IRankedTrigger[], options: MatchOptions = {}): TriggerMatch<T>[] {
  const byCategory = new Map<TriggerCategory, TriggerMatch<T>[]>();
  for (const match of rankItems(items, triggers, options)) {
    byCategory.set(match.category, [ ...(byCategory.get(match.category) ?? []), match ]);
  }
  const picks = [ ...byCategory.values() ]
    .map(matches => best(matches)!)
    .sort((a, b) => b.score - a.score);
  return byCategory.has(TriggerCategory.OUTCOME) ? picks.filter(pick => !REPLACED_BY_OUTCOME.has(pick.category)) : picks;
}

/** The items on one trigger, as a board or lobby event plays them: exactly, or a range for a number. */
export function itemsOn<T extends MatchableItem>(items: readonly T[] | undefined, trigger: string, options: MatchOptions = {}): T[] {
  return itemsFor(indexItems(items), trigger.toLowerCase(), options, true);
}

/** One of the items on a trigger, at random when there are more (see {@link itemsOn}). */
export function oneOn<T extends MatchableItem>(items: readonly T[] | undefined, trigger: string, options: MatchOptions = {}): T | undefined {
  const fit = itemsOn(items, trigger, options);
  return fit.length ? randomOf(fit) : undefined;
}
