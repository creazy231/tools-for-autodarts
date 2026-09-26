/**
 * The game modes the Caller, Sound FX, WLED and Animations can each be kept to.
 *
 * A mode is a match's `variant`, the site's own name for the game, so these
 * are the values of the site's Variant enum. Each feature stores the modes it
 * is switched off for, `disabledGameModes`: a config saved before there was
 * such a list plays everywhere, and a game the site adds later is on without
 * anyone switching it on. See docs/superpowers/specs/2026-09-27-per-game-mode-design.md.
 */

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
  title: string;
  modes: readonly { mode: GameMode; label: string }[];
}

/** The site's game picker: its groups, its order and its English names. */
export const GAME_MODE_GROUPS: readonly GameModeGroup[] = [
  {
    title: "X01 and Cricket",
    modes: [
      { mode: GameMode.X01, label: "X01" },
      { mode: GameMode.CRICKET, label: "Cricket / Tactics" },
    ],
  },
  {
    title: "Practice",
    modes: [
      { mode: GameMode.COUNT_UP, label: "Count Up" },
      { mode: GameMode.ATC, label: "Around The Clock" },
      { mode: GameMode.RANDOM_CHECKOUT, label: "Random Checkout" },
      { mode: GameMode.RTW, label: "Round the World" },
      { mode: GameMode.SEGMENT_TRAINING, label: "Segment Training" },
      { mode: GameMode.BOBS_27, label: "Bob's 27" },
      { mode: GameMode.TRAINING_121, label: "121" },
    ],
  },
  {
    title: "Party",
    modes: [
      { mode: GameMode.SHANGHAI, label: "Shanghai" },
      { mode: GameMode.GOTCHA, label: "Gotcha" },
      { mode: GameMode.BERMUDA, label: "Bermuda" },
      { mode: GameMode.KILLER, label: "Killer" },
    ],
  },
  {
    title: "Before a match",
    modes: [ { mode: GameMode.BULL_OFF, label: "Bull-off" } ],
  },
];

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

/** What the Game modes row says: "All games", "None", or "12 of 14". */
export function gameModesSummary(disabled: readonly string[] | undefined, shown: readonly GameMode[]): string {
  const on = enabledIn(disabled, shown).length;
  if (on === shown.length) return "All games";
  if (on === 0) return "None";
  return `${on} of ${shown.length}`;
}
