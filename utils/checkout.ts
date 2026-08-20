import type { IGotchaSettings, IMatch } from "@/utils/websocket-helpers";

/**
 * Checkouts for the variants autodarts works none out for.
 *
 * The site computes a route per player for X01 and puts it in the match state,
 * which is where both the Checkout Guide overlay and the caller's "you require"
 * read it from. Gotcha gets nothing: its `state` is empty at every score and in
 * all three out modes, because there you count *up* to a target rather than
 * down to zero and the server keeps no route for that. The numbers are all
 * there though — the target is in the match settings and `gameScores` holds the
 * running totals — so the gap, and the darts that close it, are worked out
 * here instead.
 */

/** A finish: how far there is to go, and the darts that get there. */
export interface ICheckout {
  remaining: number;
  darts: string[];
}

/**
 * The plainest single dart worth exactly `points`, in the site's notation, or
 * `null` where no one dart is worth it.
 *
 * Singles come first, so 18 reads "S18" rather than the D9 or T6 that also land
 * it, and doubles before trebles for the same reason — 36 is "D18", not "T12".
 */
function singleDart(points: number): string | null {
  if (points === 50) return "BULL";
  if (points === 25) return "25";
  if (points >= 1 && points <= 20) return `S${points}`;
  if (points <= 40 && points % 2 === 0) return `D${points / 2}`;
  if (points <= 60 && points % 3 === 0) return `T${points / 3}`;
  return null;
}

/**
 * The same, but never `null`: a gap no single dart covers is written as the gap
 * itself, which is still the thing worth knowing. Used by the Gotcha Helper for
 * the dart that resets a player who is ahead.
 */
export function dartFor(points: number): string {
  return singleDart(points) ?? `+${points}`;
}

/** Every value one dart can score, biggest first, named the plainest way. */
const SETUPS: Array<{ name: string; value: number }> = Array.from({ length: 60 }, (_, i) => 60 - i)
  .flatMap((value) => {
    const name = singleDart(value);
    return name ? [ { name, value } ] : [];
  });

/** The dart that may land on the target, which is what the out mode governs. */
function finisher(points: number, outMode: string): string | null {
  if (outMode === "Straight") return singleDart(points);
  if (points === 50) return "BULL";
  if (points <= 40 && points % 2 === 0) return `D${points / 2}`;
  if (outMode === "Master" && points <= 60 && points % 3 === 0) return `T${points / 3}`;
  return null;
}

/**
 * Darts that make exactly `remaining` and end on a legal finisher, or `null`
 * where three cannot.
 *
 * Shortest route first — one dart is tried before two, two before three — and
 * within a length the biggest dart that leaves something finishable, which is
 * both how the standard charts read for the long ones (170 as "T20 T20 BULL",
 * 167 as "T20 T19 BULL") and how anyone counting up thinks about it. Where
 * several routes are the same length that is an arbitrary pick among equals,
 * not a claim to be the one a chart would print.
 */
export function checkoutRoute(remaining: number, outMode: string): string[] | null {
  if (!Number.isInteger(remaining) || remaining < 1 || remaining > 180) return null;

  for (const darts of [ 1, 2, 3 ]) {
    const route = search(remaining, darts, outMode);
    if (route) return route;
  }
  return null;
}

/** A route of exactly `darts` darts. At most ~2000 steps, so depth-first is fine. */
function search(remaining: number, darts: number, outMode: string): string[] | null {
  if (darts === 1) {
    const last = finisher(remaining, outMode);
    return last ? [ last ] : null;
  }

  for (const setup of SETUPS) {
    if (setup.value >= remaining) continue;
    const rest = search(remaining - setup.value, darts - 1, outMode);
    if (rest) return [ setup.name, ...rest ];
  }
  return null;
}

/**
 * What the player at `index` has left to reach the Gotcha target, and how — or
 * `null` for any other variant, once the target is reached, and while it is
 * still too far off to finish this turn.
 */
export function gotchaCheckout(match: IMatch | undefined, index: number): ICheckout | null {
  if (match?.variant !== "Gotcha") return null;

  const { targetScore, outMode } = (match.settings ?? {}) as Partial<IGotchaSettings>;
  const score = match.gameScores?.[index];
  if (typeof targetScore !== "number" || typeof score !== "number") return null;

  const remaining = targetScore - score;
  const darts = checkoutRoute(remaining, outMode ?? "Straight");
  return darts ? { remaining, darts } : null;
}
