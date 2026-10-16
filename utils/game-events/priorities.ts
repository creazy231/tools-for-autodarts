/**
 * How much each kind of trigger counts for, per feature.
 *
 * A feature's priority order is a list of levels, most important first. It
 * decides two things at once: which of several matching triggers wins (WLED
 * and Animations show one, the Caller and Sound FX one per category), and the
 * order the Caller and Sound FX play theirs in. Every feature has an order of
 * its own in code, DEFAULT_ORDER, and a user can drag the levels into another
 * one in the feature's settings, which is stored as `priorityOrder` on the
 * feature's config. A missing list is the default, so nothing is migrated.
 *
 * The order is stored as level names, never as numbers: the numbers are worked
 * out here from the position, so a new level or a changed step later on does
 * not shift anything anyone saved.
 *
 * This module is read by utils/storage.ts (type-only) and by the service
 * worker's imports, so it holds message keys and never imports utils/i18n.
 */

import type { MessageKey } from "@/utils/i18n";

/** Every level, in the order that holds when nothing says otherwise. */
export const TRIGGER_LEVELS = [
  "MATCHSHOT",
  "GAMESHOT",
  "BUSTED",
  "PLAYER_NAME",
  "PLAYER_NAME_COMMON",
  "GAMEON",
  "COMBINED_THROWS",
  "POINT_TOTAL",
  "POINT_REMAINING",
  "POINT_REMAINING_COMMON",
  "VARIANT",
  "INDIVIDUAL_THROW",
  "THROW",
  "BOARD_EVENT",
  "OTHER",
] as const;

export type TriggerLevel = typeof TRIGGER_LEVELS[number];

/** The features with an order of their own, by their key in the config. */
export type PriorityFeature = "caller" | "soundFx" | "wledFx" | "animations";

/** How far apart two neighbouring levels are. A trigger's bonus stays well inside it. */
export const LEVEL_STEP = 10;

/**
 * Each feature's own order, as it played before the order could be changed:
 * the levels its settings list, most important first.
 *
 * - The Caller calls a dart before the visit's total and the total before its
 *   combination, and names whoever is up before the checkout.
 * - Sound FX plays Cricket's hit or miss before the dart.
 * - WLED shows the target of a practice game rather than the dart that hit it,
 *   and a combination rather than its total.
 * - Animations show a win or a bust over the dart, a game's own moment (a
 *   lucky number) over the visit, and a combination over its total.
 */
export const DEFAULT_ORDER: Record<PriorityFeature, readonly TriggerLevel[]> = {
  caller: [
    "MATCHSHOT",
    "GAMESHOT",
    "BUSTED",
    "PLAYER_NAME",
    "PLAYER_NAME_COMMON",
    "GAMEON",
    "POINT_REMAINING",
    "POINT_REMAINING_COMMON",
    "VARIANT",
    "INDIVIDUAL_THROW",
    "POINT_TOTAL",
    "COMBINED_THROWS",
  ],
  soundFx: [
    "MATCHSHOT",
    "GAMESHOT",
    "BUSTED",
    "PLAYER_NAME",
    "PLAYER_NAME_COMMON",
    "GAMEON",
    "VARIANT",
    "INDIVIDUAL_THROW",
    "POINT_TOTAL",
    "COMBINED_THROWS",
    "THROW",
  ],
  wledFx: [
    "MATCHSHOT",
    "GAMESHOT",
    "BUSTED",
    "VARIANT",
    "COMBINED_THROWS",
    "POINT_TOTAL",
    "INDIVIDUAL_THROW",
    "PLAYER_NAME",
    "GAMEON",
  ],
  animations: [
    "MATCHSHOT",
    "GAMESHOT",
    "BUSTED",
    "VARIANT",
    "COMBINED_THROWS",
    "POINT_TOTAL",
    "INDIVIDUAL_THROW",
  ],
};

/** What a level is called in the settings (locales/en/triggerPriorities.ts), and the line under it. */
export const LEVEL_LABEL_KEYS: Partial<Record<TriggerLevel, { labelKey: MessageKey; hintKey: MessageKey }>> = {
  MATCHSHOT: { labelKey: "triggerPriorities.levels.matchshot", hintKey: "triggerPriorities.hints.matchshot" },
  GAMESHOT: { labelKey: "triggerPriorities.levels.gameshot", hintKey: "triggerPriorities.hints.gameshot" },
  BUSTED: { labelKey: "triggerPriorities.levels.busted", hintKey: "triggerPriorities.hints.busted" },
  PLAYER_NAME: { labelKey: "triggerPriorities.levels.playerName", hintKey: "triggerPriorities.hints.playerName" },
  PLAYER_NAME_COMMON: { labelKey: "triggerPriorities.levels.nextPlayer", hintKey: "triggerPriorities.hints.nextPlayer" },
  GAMEON: { labelKey: "triggerPriorities.levels.gameon", hintKey: "triggerPriorities.hints.gameon" },
  COMBINED_THROWS: { labelKey: "triggerPriorities.levels.combo", hintKey: "triggerPriorities.hints.combo" },
  POINT_TOTAL: { labelKey: "triggerPriorities.levels.total", hintKey: "triggerPriorities.hints.total" },
  POINT_REMAINING: { labelKey: "triggerPriorities.levels.checkout", hintKey: "triggerPriorities.hints.checkout" },
  POINT_REMAINING_COMMON: { labelKey: "triggerPriorities.levels.checkoutCommon", hintKey: "triggerPriorities.hints.checkoutCommon" },
  VARIANT: { labelKey: "triggerPriorities.levels.variant", hintKey: "triggerPriorities.hints.variant" },
  INDIVIDUAL_THROW: { labelKey: "triggerPriorities.levels.dart", hintKey: "triggerPriorities.hints.dart" },
  THROW: { labelKey: "triggerPriorities.levels.thrower", hintKey: "triggerPriorities.hints.thrower" },
};

function isLevel(value: unknown): value is TriggerLevel {
  return typeof value === "string" && (TRIGGER_LEVELS as readonly string[]).includes(value);
}

/**
 * A feature's order as it stands: the stored one, kept to the levels the
 * feature lists, with any it lacks (a level added since it was saved) put in
 * after the one that comes before them by default. Anything but a list, from
 * an imported or hand-edited config, is the default.
 */
export function orderFor(feature: PriorityFeature, stored: readonly unknown[] | undefined): TriggerLevel[] {
  const defaults = DEFAULT_ORDER[feature];
  if (!Array.isArray(stored)) return [ ...defaults ];

  const order = [ ...new Set(stored.filter(isLevel).filter(level => defaults.includes(level))) ];
  defaults.forEach((level, index) => {
    if (order.includes(level)) return;
    const before = defaults.slice(0, index).reverse().find(earlier => order.includes(earlier));
    order.splice(before ? order.indexOf(before) + 1 : 0, 0, level);
  });
  return order;
}

/**
 * The weight of every level for a feature: its order first, then the levels it
 * does not list in the default order, each LEVEL_STEP below the one before.
 */
export function weightsFor(feature: PriorityFeature, stored: readonly unknown[] | undefined): Record<TriggerLevel, number> {
  const order = orderFor(feature, stored);
  const full = [ ...order, ...TRIGGER_LEVELS.filter(level => !order.includes(level)) ];
  return Object.fromEntries(full.map((level, index) => [ level, (full.length - index) * LEVEL_STEP ])) as Record<TriggerLevel, number>;
}

/** What to store for an order: nothing while it is the default, so a default changed later reaches it. */
export function orderToStore(feature: PriorityFeature, order: readonly TriggerLevel[]): TriggerLevel[] | undefined {
  const defaults = DEFAULT_ORDER[feature];
  const same = order.length === defaults.length && order.every((level, index) => level === defaults[index]);
  return same ? undefined : [ ...order ];
}
