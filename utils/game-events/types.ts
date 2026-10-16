import type { TriggerLevel } from "./priorities";

/**
 * One message of a match's `<matchId>.game-events` topic, as the server sends
 * it: `throw` (`body.segment`), `turn_start` (`body.isCheckout`, `body.score`),
 * `turn_end` (`body.points`), `game_shot`, `game_on` (from the second leg on),
 * `killer_became_killer` / `killer_killed`.
 *
 * They arrive just before the state frame they belong to, and not always in
 * order: `turn_end` comes ahead of the visit's third `throw`, and `game_shot`
 * ahead of the winning one. So they are only ever read together with that
 * state — see utils/websocket-helpers.ts, which holds them back for it.
 */
export interface IGameEvent {
  event: string;
  matchId: string;
  body?: Record<string, any>;
  /** When this tab received it, for dropping events whose state never came. */
  receivedAt?: number;
}

/**
 * The game events that came in ahead of a state frame, stored with it on
 * `IGameData.batch`. A new `id` is a new frame; the events are what happened
 * between it and the frame before.
 */
export interface IGameEventBatch {
  id: string;
  events: IGameEvent[];
}

/**
 * What a trigger is about. A sound feature plays at most one trigger of each
 * category for one update (a name, a dart, a total…), and the categories are
 * what a feature picks to take part in at all.
 */
export enum TriggerCategory {
  START = "start",
  PLAYER = "player",
  WINNER = "winner",
  REMAINING = "remaining",
  OUTCOME = "outcome",
  THROW = "throw",
  TOTAL = "total",
  COMBO = "combo",
  VARIANT = "variant",
  TARGET = "target",
  THROWER = "thrower",
}

/**
 * A trigger that stands in for a dart's own one, for a library without a
 * sound for it: `double` and the number for `d20` ("word"), the number alone
 * for a single ("number"), `outside` for a miss, and `miss` in a visit's darts
 * for any missed dart there ("missWildcard"). Each feature says which it
 * takes; a fallback always scores below the trigger it stands in for. The
 * single bull has none: it is `s25`, and `25` is only ever a visit's total.
 */
export type FallbackKind = "word" | "number" | "outside" | "missWildcard";

/**
 * Where an update came from: a state frame with its game events, a state frame
 * alone (page load, a correction, a lost event), or a feature starting on the
 * stored state.
 */
export type TriggerSource = "events" | "state" | "init";

export interface IGameTrigger {
  /** A trigger, or a sequence of them played in order (`you_require`, `170`). */
  trigger: string | readonly string[];
  category: TriggerCategory;
  /** Which priority it has; the weights come from the feature's order (utils/game-events/priorities.ts). */
  level: TriggerLevel;
  /** Fine-tuning inside its level, always well below one level's step: + more specific, − less. */
  bonus: number;
  fallback?: FallbackKind;
  /** Plays once per feature and match: the gameon of a leg, the bull-off, a win. */
  onceKey?: string;
  /** Only counts as a part of a `+` item, never alone: a player called up in the bull-off (`bulloff+alice`). */
  joinedOnly?: boolean;
  /** A repeat of this once-key silences the whole update, as a win reported again does. */
  exclusive?: boolean;
  /** Cricket's running score, called on the last dart only by the Caller. */
  tag?: "cricketScore";
}

/** A trigger with the priority it has for one feature: the weight of its level plus its bonus. */
export interface IRankedTrigger extends IGameTrigger {
  priority: number;
  /**
   * Of a kind the feature does not take: only a part of a `+` item beside one
   * it does, as `d20` in `gameshot+d20` for a Caller that does not call every dart.
   */
  partOnly?: boolean;
}
