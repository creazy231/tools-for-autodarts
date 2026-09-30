/**
 * A checkout the partner rule takes back, as the autodarts site is shown it.
 *
 * Every feature of ours reads that checkout as a bust (`teamView` in
 * utils/teams.ts) and the match script undoes it within a few hundred
 * milliseconds. The site reads the socket itself, though, and celebrated it:
 * the `game_shot` game event starts its GAME SHOT animation and its caller's
 * "game shot", and holds every frame after it, the undo's included, until the
 * animation ends three seconds later. So the checkout looked like it counted.
 *
 * The WebSocket capture (entrypoints/websocket-capture.ts) hands the site
 * frames through `siteFrame` instead: while `<html>` names the visit up as
 * one that can't check out, that visit's `game_shot` reaches the site as an
 * event it doesn't know, and its winning state as the bust we see. The flag
 * comes from the frames before, set by the content script
 * (utils/websocket-helpers.ts), because the page script has no lineup: it
 * only compares names. Everything else reaches the site as it came.
 *
 * No imports, so the page script can carry it without the rest of Teams.
 */

/** On `<html>` while the visit it names ({@link visitKey}) can't be checked out. */
export const VOID_CHECKOUT_ATTR = "data-adt-void-checkout";

/** What a voided `game_shot` becomes: no handler of the site's knows it. */
export const VOIDED_GAME_SHOT = "adt_voided_game_shot";

/** What of a match's state this reads. */
export interface VisitState {
  id?: string;
  set?: number;
  leg?: number;
  round?: number;
  player?: number;
  gameWinner?: number;
  winner?: number;
  gameFinished?: boolean;
  finished?: boolean;
  turnBusted?: boolean;
  gameScores?: readonly number[];
  scores?: readonly { legs: number; sets: number }[] | null;
  /** The visit being thrown; the site keeps only that one. */
  turns?: readonly { points?: number; busted?: boolean }[];
}

/** A frame on the site's socket. */
export interface SocketFrame {
  channel?: string;
  topic?: string;
  data?: any;
}

/** A visit's name: its match, set, leg, round and seat. */
export function visitKey(state: VisitState, seat = state.player ?? 0): string {
  return [ state.id, state.set, state.leg, state.round, seat ].join("|");
}

/**
 * A checkout taken back as a bust: the thrower's points and the leg they won
 * returned, the visit busted, and nobody winning, the match included when the
 * checkout won that too. The darts stay, so the site shows where they went.
 */
export function bustView<M extends VisitState>(match: M, seat: number): M {
  const visit = match.turns?.[0];
  const gameScores = [ ...(match.gameScores ?? []) ];
  gameScores[seat] = (gameScores[seat] ?? 0) + (visit?.points ?? 0);
  const scores = match.scores ? match.scores.map((score, index) => index === seat ? { ...score, legs: Math.max(0, score.legs - 1) } : score) : match.scores;
  return {
    ...match,
    gameWinner: -1,
    gameFinished: false,
    winner: -1,
    finished: false,
    turnBusted: true,
    gameScores,
    scores,
    turns: visit ? [ { ...visit, busted: true }, ...(match.turns ?? []).slice(1) ] : match.turns,
  };
}

/**
 * What the site reads for a frame, or `undefined` for the frame as it came.
 * `voided` is the flag on `<html>`; `visits` is the visit each match's last
 * state was in, which this keeps. It has to: the `game_shot` names no seat,
 * and it arrives before the dart's own state.
 */
export function siteFrame(frame: SocketFrame, voided: string | null, visits: Map<string, string>): SocketFrame | undefined {
  if (frame.channel !== "autodarts.matches" || typeof frame.topic !== "string") return undefined;
  const dot = frame.topic.indexOf(".");
  const match = frame.topic.slice(0, dot);
  const kind = frame.topic.slice(dot + 1);
  const data = frame.data;

  // A whole state, not a correction's `{ activated }`, which is no visit.
  if (kind === "state" && Array.isArray(data?.players)) {
    visits.set(match, visitKey(data));
    const won = data.gameWinner ?? -1;
    return voided && won >= 0 && visitKey(data, won) === voided ? { ...frame, data: bustView(data, won) } : undefined;
  }
  if (kind === "game-events" && data?.event === "game_shot" && voided && visits.get(match) === voided) {
    return { ...frame, data: { ...data, event: VOIDED_GAME_SHOT } };
  }
  return undefined;
}
