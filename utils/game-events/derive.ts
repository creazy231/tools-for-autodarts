import { TriggerCategory } from "./types";

import type { IMatch, IThrow } from "@/utils/websocket-helpers";
import type { IGameEvent, IGameTrigger, TriggerSource } from "./types";

import { gotchaCheckout } from "@/utils/checkout";
import { type Here, isPlayerUpInTheRoom } from "@/utils/own-board";
import { GameMode } from "@/utils/game-modes";
import { winId } from "@/utils/win";

/**
 * Everything an update says, as triggers: what the Caller, Sound FX, WLED and
 * Animations used to work out each on their own from the state frames, now
 * once for all of them.
 *
 * The game events say that something happened — a dart, a new visit, a new
 * leg — and the state they came with says what: which dart it was, whether it
 * bust, who won. The state is the one Teams' rules have seen (utils/teams.ts),
 * so a checkout the partner rule takes back is a bust here although the
 * server's `game_shot` called it a win; a win or a bust is therefore never
 * read off an event. A state that came without events (a page load, a
 * correction, an event lost on the way) is compared with the one before it
 * instead, which is how every feature worked before there were events.
 *
 * This is a pure function: no storage and no extension APIs, so the replay
 * script can run recorded games through it.
 */
export interface DeriveInput {
  /** The game events that came with this state, oldest first. */
  events: readonly IGameEvent[];
  /** The state, as Teams' rules see it. */
  state: IMatch;
  /** The state acted on before this one, if it was the same match. */
  prev?: IMatch;
  source: TriggerSource;
  /** Who is called what (utils/team-calls.ts): whoever is up, and a match's winner. */
  names: { turn: readonly string[]; matchWin: readonly string[] };
  /** The signed-in account, to tell an opponent's dart from one of yours. */
  localUserId?: string | null;
  /** Where this browser is, for who throws in this room (utils/own-board.ts). Without it, no dart is an opponent's. */
  here?: Here;
  /** Cricket: the current player's score when the visit began. */
  turnStartScore?: number;
}

const TARGET_GAMES: readonly string[] = [ GameMode.ATC, GameMode.RTW, GameMode.SHANGHAI, GameMode.BOBS_27 ];

const WORDS: Record<string, string> = { s: "single", d: "double", t: "triple" };

export function deriveTriggers(input: DeriveInput): IGameTrigger[] {
  const { state: match, events, source } = input;
  const out: IGameTrigger[] = [];
  const turn = match.turns?.[0];
  if (!turn) return out;

  const prev = input.prev?.id === match.id ? input.prev : undefined;
  const throws = turn.throws ?? [];
  const has = (event: string) => events.some(item => item.event === event);

  const prevTurn = prev?.turns?.[0];
  const sameVisit = !!prev
    && prev.set === match.set
    && prev.leg === match.leg
    && prev.round === match.round
    && prev.player === match.player
    && (prevTurn?.id ?? "") === (turn.id ?? "");
  const legChanged = !prev || prev.set !== match.set || prev.leg !== match.leg || prev.variant !== match.variant;

  if (match.variant === GameMode.BULL_OFF) {
    // `bulloff` itself is called once, when the bull-off begins, with whoever
    // throws first as the context. Every player called to the oche after that
    // is a `bulloff` as well — when it is their turn and nothing is thrown yet,
    // after the darts before were taken out —, but one that only counts inside
    // a `+` item: `bulloff+alice` calls Alice up, and a plain `bulloff` sound
    // does not play again for every player.
    out.push({ trigger: "bulloff", category: TriggerCategory.START, level: "GAMEON", bonus: 0, onceKey: `bulloff:${match.id}` });
    const calledUp = source !== "init" && throws.length === 0
      && (has("turn_start") || (!!prev && (prev.player !== match.player || prev.round !== match.round)));
    if (calledUp) {
      out.push({ trigger: "bulloff", category: TriggerCategory.START, level: "GAMEON", bonus: 0, joinedOnly: true });
    }
    return out;
  }

  let gameStart: boolean;
  /** A visit begins: the checkout call, a practice game's target. */
  let newVisit: boolean;
  /** Somebody else is up, or the leg begins: their name. A solo game names its player once a leg. */
  let playerUp: boolean;
  let newDart: boolean;

  if (source === "init") {
    // A feature starting mid-game calls nothing it has missed: only a game
    // about to begin, as it did before.
    if (throws.length > 0 || match.round !== 1 || match.player !== 0) return out;
    gameStart = true;
    newVisit = true;
    playerUp = true;
    newDart = false;
  } else {
    // The site sends `game_on` from the second leg on; the first is a state
    // at round one with nothing thrown, of a leg (or a game, after the
    // bull-off) that was not the one before.
    gameStart = has("game_on") || (throws.length === 0 && match.round === 1 && legChanged);
    const visitChanged = !!prev && !sameVisit && (prev.player !== match.player || prev.round !== match.round || legChanged);
    newVisit = gameStart || has("turn_start") || visitChanged;
    playerUp = gameStart || (newVisit && (!prev || prev.player !== match.player || legChanged));

    const prevThrows = sameVisit ? prevTurn?.throws ?? [] : [];
    const added = sameVisit ? throws.length > prevThrows.length : throws.length > 0 && (!!prev || has("throw"));
    // A correction rewrites a dart in place, so the visit is called again as it now stands.
    const corrected = sameVisit && throws.length > 0 && throws.length === prevThrows.length
      && throws.some((dart, index) => dart.segment?.name !== prevThrows[index]?.segment?.name);
    newDart = added || corrected;
  }

  const seat = match.players?.[match.player];
  const isBot = !!seat?.cpuPPR;

  if (playerUp) {
    if (isBot) {
      out.push({ trigger: "bot", category: TriggerCategory.PLAYER, level: "PLAYER_NAME", bonus: 0 });
    } else {
      input.names.turn.forEach((name, index) => {
        for (const spelling of spellings(name)) {
          out.push({ trigger: spelling, category: TriggerCategory.PLAYER, level: "PLAYER_NAME", bonus: -0.1 * index });
        }
      });
      if (!gameStart) out.push({ trigger: "next_player", category: TriggerCategory.PLAYER, level: "PLAYER_NAME_COMMON", bonus: 0 });
    }
  }

  if (newVisit) {
    if (gameStart) {
      out.push({ trigger: "gameon", category: TriggerCategory.START, level: "GAMEON", bonus: 0, onceKey: `gameon:${match.id}:${match.set}:${match.leg}` });
    }

    const remaining = throws.length === 0 ? checkoutScore(match, events) : 0;
    if (remaining > 0) {
      out.push({ trigger: `yr_${remaining}`, category: TriggerCategory.REMAINING, level: "POINT_REMAINING", bonus: 0 });
      out.push({ trigger: `you_require_${remaining}`, category: TriggerCategory.REMAINING, level: "POINT_REMAINING", bonus: -0.5 });
      out.push({ trigger: [ "you_require", `${remaining}` ], category: TriggerCategory.REMAINING, level: "POINT_REMAINING_COMMON", bonus: 0 });
    }
  }

  // WLED lights the number a practice game is on, for a new visit as for a dart.
  if (newVisit || newDart) {
    const target = targetTrigger(match);
    if (target) out.push(target);
  }

  // A win is reported again and again after the dart that won it (utils/win.ts),
  // so it is once per win, and a repeat silences the whole update.
  const win = winId(match);
  if (win) {
    const matchWon = (match.winner ?? -1) >= 0;
    const once = { onceKey: `win:${win}`, exclusive: true };
    if (matchWon) {
      out.push({ trigger: "matchshot", category: TriggerCategory.OUTCOME, level: "MATCHSHOT", bonus: 0, ...once });

      // After a match shot, its winner: with Teams the team and then the player
      // who checked out; a bot on no team is "bot".
      if (match.players?.[match.gameWinner]?.cpuPPR && input.names.matchWin.length <= 1) {
        out.push({ trigger: "bot", category: TriggerCategory.WINNER, level: "PLAYER_NAME", bonus: 0, ...once });
      } else {
        input.names.matchWin.forEach((name, index) => {
          for (const spelling of spellings(name)) {
            out.push({ trigger: spelling, category: TriggerCategory.WINNER, level: "PLAYER_NAME", bonus: -0.1 * index, ...once });
          }
        });
      }
    }

    // A win for one player, team or slot is `gameshot+alice`, `matchshot+player1`:
    // the winner is whoever threw the winning dart, so the context names them.
    out.push({ trigger: "gameshot", category: TriggerCategory.OUTCOME, level: "GAMESHOT", bonus: 0, ...once });
  }

  if (!newDart) return out;

  const dart = throws[throws.length - 1];
  out.push(...dartTriggers(dart));

  if (isBot) {
    out.push({ trigger: "bot_throw", category: TriggerCategory.THROWER, level: "THROW", bonus: 0 });
  } else if (input.here && isPlayerUpInTheRoom(match, input.localUserId, input.here) === false) {
    out.push({ trigger: "opponent_throw", category: TriggerCategory.THROWER, level: "THROW", bonus: 0 });
  }

  if (match.variant === GameMode.CRICKET) {
    out.push({ trigger: cricketHit(match, prev, dart) ? "cricket_hit" : "cricket_miss", category: TriggerCategory.VARIANT, level: "VARIANT", bonus: 0 });
  } else if (match.variant === GameMode.GOTCHA && gotchaHit(match, prev)) {
    out.push({ trigger: "gotcha", category: TriggerCategory.VARIANT, level: "VARIANT", bonus: 0 });
  }

  for (const event of events) {
    if (event.event.startsWith("killer_")) out.push({ trigger: event.event, category: TriggerCategory.VARIANT, level: "VARIANT", bonus: 0 });
  }

  if (turn.busted) {
    out.push({ trigger: "busted", category: TriggerCategory.OUTCOME, level: "BUSTED", bonus: 0 });
    // A checkout Teams' partner rule takes back has a call of its own.
    if (match.adtTeams?.bust) out.push({ trigger: "partner_rule", category: TriggerCategory.OUTCOME, level: "BUSTED", bonus: 5 });
  } else if (win) {
    // The winning visit, for `gameshot+t20_t15_d20`: however many darts it
    // took, but at least two, since one is the winning dart's own trigger.
    if (throws.length >= 2) out.push(...comboTriggers(throws));
  } else if (throws.length >= 3) {
    if (match.variant === GameMode.CRICKET) {
      // Cricket's points count only on closed numbers, so its visit totals mean
      // little; the Caller calls the running score instead, when it moved.
      if ((match.players?.length ?? 0) > 1 && turn.score !== (input.turnStartScore ?? 0)) {
        out.push({ trigger: `${turn.score}`, category: TriggerCategory.TOTAL, level: "POINT_TOTAL", bonus: 0, tag: "cricketScore" });
      }
    } else {
      out.push({ trigger: `${turn.points}`, category: TriggerCategory.TOTAL, level: "POINT_TOTAL", bonus: 0 });
    }
    out.push(...comboTriggers(throws));
    if (isLuckyNumber(match, turn.points)) {
      out.push({ trigger: "luckynumber", category: TriggerCategory.VARIANT, level: "VARIANT", bonus: 0 });
    }
  }

  return out;
}

/** The games that count down, where a visit leaves points over. */
const COUNTDOWN_GAMES: readonly string[] = [ GameMode.X01, GameMode.RANDOM_CHECKOUT ];

/**
 * `luckynumber`: a visit that scored leaves a number of one digit repeated,
 * above 10 — 11, 22, 111, 333 —, a *Schnapszahl*.
 */
function isLuckyNumber(match: IMatch, points: number): boolean {
  if (!COUNTDOWN_GAMES.includes(match.variant) || !(points > 0)) return false;
  const left = match.gameScores?.[match.player];
  return typeof left === "number" && left > 10 && /^(\d)\1+$/.test(String(left));
}

/**
 * A visit's darts together, `t20_t20_t20`, and what stands in for them.
 *
 * - The single bull is `s25` here as on its own: `25` is only ever a visit's total.
 * - `miss` stands for any missed dart in its place: `s20_miss_d20` for
 *   `s20_m5_d20`. The more darts a stand-in leaves open, the less it counts,
 *   so the exact combination always wins ("missWildcard").
 */
export function comboTriggers(throws: readonly IThrow[]): IGameTrigger[] {
  const combo = (bonus: number, trigger: string, fallback?: IGameTrigger["fallback"]): IGameTrigger =>
    ({ trigger, category: TriggerCategory.COMBO, level: "COMBINED_THROWS", bonus, ...(fallback && { fallback }) });

  const darts = throws.map(item => (dartTriggers(item)[0]?.trigger as string | undefined) ?? "");
  const out = [ combo(0, darts.join("_")) ];

  const misses = darts.flatMap((dart, index) => (/^m\d{1,2}$/.test(dart) ? [ index ] : []));
  for (let mask = 1; mask < 1 << misses.length; mask++) {
    const open = misses.filter((_, bit) => mask & (1 << bit));
    const parts = darts.map((dart, index) => (open.includes(index) ? "miss" : dart));
    out.push(combo(-0.2 * open.length, parts.join("_"), "missWildcard"));
  }
  return out;
}

/** The number a practice game (ATC, RTW, Shanghai, Bob's 27) is on, as `target<N>`. */
function targetTrigger(match: IMatch): IGameTrigger | undefined {
  if (!TARGET_GAMES.includes(match.variant)) return undefined;
  const target = targetOf(match);
  return target ? { trigger: `target${target}`, category: TriggerCategory.TARGET, level: "VARIANT", bonus: 0 } : undefined;
}

/**
 * What a `+` item may name besides the update's triggers
 * (utils/game-events/match.ts): whoever is up — with Teams the player and then
 * the team —, their seat in the match (`player1`, `player2`, … by the seat's
 * `index`, which stays the same from leg to leg), and the game, as the site
 * names the variant (`x01`, `cricket`, `bob's_27`). The winner of a leg is the
 * one who threw its last dart, so `gameshot+alice` and `gameshot+player2` work
 * the same way.
 */
export function contextTokens(match: IMatch, turnNames: readonly string[]): string[] {
  const tokens = turnNames.flatMap(spellings);
  const seat = match.players?.[match.player];
  if (seat && Number.isInteger(seat.index) && seat.index >= 0) tokens.push(`player${seat.index + 1}`);
  if (match.variant) tokens.push(...spellings(match.variant));
  return [ ...new Set(tokens) ];
}

/** A name as a trigger is looked up: in lower case, and with underscores for its spaces. */
export function spellings(name: string): string[] {
  const lower = name.toLowerCase();
  const underscored = lower.replace(/\s+/g, "_");
  return underscored === lower ? [ lower ] : [ lower, underscored ];
}

/**
 * A dart's triggers: its own name, and what stands in for it in a library
 * without a sound for it.
 *
 * Autodarts names the outer bull "25", the same string a 25-point visit fires,
 * so it is `s25` here, always: `25` is only ever a visit's total. A miss is "M17"
 * beside a number, or "Miss" from the keypad.
 */
export function dartTriggers(dart: IThrow | undefined): IGameTrigger[] {
  const name = (dart?.segment?.name ?? "").toLowerCase();
  if (!name) return [];
  const own = (trigger: string | readonly string[], bonus = 0, fallback?: IGameTrigger["fallback"]): IGameTrigger =>
    ({ trigger, category: TriggerCategory.THROW, level: "INDIVIDUAL_THROW", bonus, ...(fallback && { fallback }) });

  if (name === "25") return [ own("s25") ];
  if (name === "miss") return [ own(name), own("outside", -3, "outside") ];
  if (/^m\d{1,2}$/.test(name)) return [ own(name), own("miss", -2, "outside"), own("outside", -3, "outside") ];

  const field = name.match(/^([sdt])(\d{1,2})$/);
  if (field) {
    const [ , kind, number ] = field;
    const darts = [ own(name), own([ WORDS[kind], number ], -1, "word") ];
    // The number alone stands in for a single only. A double's or a triple's
    // number is said after its word, never in its place: `20` is a visit's
    // total as well, and a T20 played the sound of a 20 visit.
    return kind === "s" ? [ ...darts, own(number, -2, "number") ] : darts;
  }

  return [ own(name) ];
}

/**
 * What is left to finish when a visit starts, for the "you require" call, or 0
 * when there is no checkout on. Gotcha counts up to a target and the site sends
 * no route for it, so that is worked out (utils/checkout.ts); otherwise the
 * visit's `turn_start` says, or else the state's checkout guide.
 */
function checkoutScore(match: IMatch, events: readonly IGameEvent[]): number {
  if (match.variant === GameMode.GOTCHA) return gotchaCheckout(match, match.player)?.remaining ?? 0;

  const start = [ ...events ].reverse().find(item => item.event === "turn_start" || item.event === "game_on");
  if (start?.body && typeof start.body.isCheckout === "boolean") {
    return start.body.isCheckout && start.body.score > 0 ? start.body.score : 0;
  }
  return match.state?.checkoutGuide?.length ? match.gameScores?.[match.player] ?? 0 : 0;
}

/**
 * Whether a Cricket dart counted: it hit one of the game's numbers (those the
 * state keeps marks for — in Hidden Cricket the ones revealed so far) that not
 * everybody had closed before it.
 */
function cricketHit(match: IMatch, prev: IMatch | undefined, dart: IThrow | undefined): boolean {
  const name = (dart?.segment?.name ?? "").toLowerCase();
  let number = 0;
  if (name === "bull" || name === "25") number = 25;
  else number = Number(name.match(/^[sdt](\d+)$/)?.[1] ?? 0);

  if (!number || !match.state?.segments?.[number]) return false;
  const before: number[] = prev?.state?.segments?.[number] ?? [];
  return !(before.length > 0 && before.every(marks => marks >= 3));
}

/** Gotcha: the dart sent somebody else's score back to zero. */
function gotchaHit(match: IMatch, prev: IMatch | undefined): boolean {
  const now = match.gameScores;
  const before = prev?.gameScores;
  if (!now || !before || before.length !== now.length) return false;
  return now[match.player] > 0 && now.some((score, index) => score === 0 && before[index] > 0);
}

/** The number a practice game is on for whoever is up, as WLED's `target<N>` names it. */
function targetOf(match: IMatch): string | number | undefined {
  const state = match.state ?? {};
  const round = match.round;
  switch (match.variant) {
    case GameMode.ATC: {
      const target = state.targets?.[match.player]?.[state.currentTargets?.[match.player]]?.number;
      if (target === 25 && [ "Double", "Triple" ].includes(match.settings?.mode)) return "bull";
      return target;
    }
    case GameMode.RTW:
      return state.targets?.[round - 1]?.number;
    case GameMode.SHANGHAI:
      return state.targets?.[round - 1];
    case GameMode.BOBS_27:
      return round;
    default:
      return undefined;
  }
}
