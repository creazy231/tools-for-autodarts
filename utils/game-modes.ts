/**
 * The game modes the Caller, Sound FX, WLED and Animations can each be kept to.
 *
 * A mode is a match's `variant`, the site's own name for the game, so these
 * are the values of the site's Variant enum. Each feature stores the modes it
 * is switched off for, `disabledGameModes`: a config saved before there was
 * such a list plays everywhere, and a game the site adds later is on without
 * anyone switching it on. See docs/superpowers/specs/2026-09-27-per-game-mode-design.md.
 *
 * The names shown for the modes and their groups are message keys, which the
 * editor turns into the language shown with `t()`; this module never does.
 * The `GameMode` values are the site's variant names, and never translated.
 */

import type { MessageKey } from "@/utils/i18n";

export enum GameMode {
  X01 = "X01",
  CRICKET = "Cricket",

  COUNT_UP = "CountUp",
  ATC = "ATC",
  RANDOM_CHECKOUT = "Random Checkout",
  RTW = "RTW",
  SEGMENT_TRAINING = "Segment Training",
  BOBS_27 = "Bob's 27",
  TRAINING_121 = "121",

  SHANGHAI = "Shanghai",
  GOTCHA = "Gotcha",
  BERMUDA = "Bermuda",
  KILLER = "Killer",

  BULL_OFF = "Bull-off",
}

export type GameModeFeature = "caller" | "soundFx" | "wledFx" | "animations";

/** A feature's switch and the modes it is switched off for, as the config holds them. */
export interface GameModeSettings {
  enabled?: boolean;
  disabledGameModes?: readonly string[];
}

export interface GameModeGroup {
  titleKey: MessageKey;
  modes: readonly { mode: GameMode; labelKey: MessageKey }[];
}

/** The site's game picker: its groups, its order and its names (locales/en/gameModes.ts and its translations, which use the site's own words). */
export const GAME_MODE_GROUPS: readonly GameModeGroup[] = [
  {
    titleKey: "gameModes.groups.x01Cricket",
    modes: [
      { mode: GameMode.X01, labelKey: "gameModes.modes.x01" },
      { mode: GameMode.CRICKET, labelKey: "gameModes.modes.cricket" },
    ],
  },
  {
    titleKey: "gameModes.groups.practice",
    modes: [
      { mode: GameMode.COUNT_UP, labelKey: "gameModes.modes.countUp" },
      { mode: GameMode.ATC, labelKey: "gameModes.modes.atc" },
      { mode: GameMode.RANDOM_CHECKOUT, labelKey: "gameModes.modes.randomCheckout" },
      { mode: GameMode.RTW, labelKey: "gameModes.modes.rtw" },
      { mode: GameMode.SEGMENT_TRAINING, labelKey: "gameModes.modes.segmentTraining" },
      { mode: GameMode.BOBS_27, labelKey: "gameModes.modes.bobs27" },
      { mode: GameMode.TRAINING_121, labelKey: "gameModes.modes.game121" },
    ],
  },
  {
    titleKey: "gameModes.groups.party",
    modes: [
      { mode: GameMode.SHANGHAI, labelKey: "gameModes.modes.shanghai" },
      { mode: GameMode.GOTCHA, labelKey: "gameModes.modes.gotcha" },
      { mode: GameMode.BERMUDA, labelKey: "gameModes.modes.bermuda" },
      { mode: GameMode.KILLER, labelKey: "gameModes.modes.killer" },
    ],
  },
  {
    titleKey: "gameModes.groups.beforeMatch",
    modes: [ { mode: GameMode.BULL_OFF, labelKey: "gameModes.modes.bullOff" } ],
  },
];

/** A mode's label key, by the site's variant name; X01's for a variant the groups don't list. */
export function gameModeLabelKey(variant: string): MessageKey {
  for (const group of GAME_MODE_GROUPS) {
    const found = group.modes.find(entry => entry.mode === variant);
    if (found) return found.labelKey;
  }
  return "gameModes.modes.x01";
}

/** The groups a feature's editor shows. Animations never play in a bull-off, so they have no switch for it. */
export function gameModeGroupsFor(feature: GameModeFeature): GameModeGroup[] {
  if (feature !== "animations") return [ ...GAME_MODE_GROUPS ];
  return GAME_MODE_GROUPS
    .map(group => ({ ...group, modes: group.modes.filter(item => item.mode !== GameMode.BULL_OFF) }))
    .filter(group => group.modes.length > 0);
}

/** The modes a feature's editor shows, in order. */
export function gameModesFor(feature: GameModeFeature): GameMode[] {
  return gameModeGroupsFor(feature).flatMap(group => group.modes.map(item => item.mode));
}

/** The modes a feature is switched off for. Anything but a list, from an imported or hand-edited config, is none. */
function switchedOff(disabled: readonly unknown[] | undefined): readonly unknown[] {
  return Array.isArray(disabled) ? disabled : [];
}

/**
 * Whether a feature plays in a game: it is switched on, and the game's variant
 * isn't one it is switched off for. A variant that is missing or unknown can't
 * be switched off, so it plays.
 */
export function playsIn(settings: GameModeSettings | undefined, variant: string | undefined): boolean {
  if (!settings?.enabled) return false;
  return !variant || !switchedOff(settings.disabledGameModes).includes(variant);
}

/**
 * The stored match's variant, but only on that match's own page. Sound FX and
 * WLED also run in lobbies, where the stored match is the last one played, and
 * a takeout there must not follow that game. The page is told by its route,
 * not by the id alone: a match started from a lobby keeps the lobby's id.
 */
export function pageVariant(match: { id?: string; variant?: string } | undefined, href: string): string | undefined {
  if (!match?.id || !match.variant) return undefined;
  let segments: string[];
  try {
    segments = new URL(href).pathname.split("/");
  } catch {
    return undefined;
  }
  const at = segments.indexOf("matches");
  return at >= 0 && segments[at + 1] === match.id ? match.variant : undefined;
}

/** The modes the editor shows switched on. */
export function enabledIn(disabled: readonly string[] | undefined, shown: readonly GameMode[]): GameMode[] {
  const off = switchedOff(disabled);
  return shown.filter(mode => !off.includes(mode));
}

/** The list to store for the editor's switches, in the editor's order: none while every mode is on. */
export function disabledToStore(shown: readonly GameMode[], enabled: readonly GameMode[]): GameMode[] | undefined {
  const off = shown.filter(mode => !enabled.includes(mode));
  return off.length > 0 ? off : undefined;
}

/** What the Game modes row counts: "12 of 14". The row says "All games" when every one is on and "None" when none is. */
export function gameModesSummary(disabled: readonly string[] | undefined, shown: readonly GameMode[]): { on: number; total: number } {
  return { on: enabledIn(disabled, shown).length, total: shown.length };
}
