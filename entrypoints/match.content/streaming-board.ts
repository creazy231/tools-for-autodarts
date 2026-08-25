/**
 * What the two Streaming Mode scoreboards share.
 *
 * The overlay owns all of the reading and none of the drawing: it works out the
 * rows, the visit, the title and the checkout route, then hands them to one of
 * `StreamingBoardClassic.vue` / `StreamingBoardV2.vue`. Both are pure — props
 * in, two events out — so a fix to how a number is derived lands in both skins
 * at once, and a change to how one looks cannot touch the other.
 */
import type { IPlayer, IPlayerStats, IScore } from "@/utils/websocket-helpers";

/** One scoreboard row, with everything it needs already looked up. */
export interface IStreamingRow {
  player: IPlayer;
  gameScore?: number;
  score?: IScore;
  stats?: IPlayerStats;
  throwing: boolean;
}

/** A leg of a checkout route, or nothing where a dart has already been thrown. */
export type ICheckoutRoute = Array<{ name: string } | null>;

/**
 * The size of each skin, which the overlay needs and cannot ask for.
 *
 * `width` is what the scoreboard measures before it is scaled, in `rem` — the
 * fixed columns plus the padding around them. The overlay divides the window by
 * it to work out how much the board has to give up to stay on screen, so a
 * change to a skin's columns has to be answered here or it will overflow again.
 *
 * `rowPx` is one row's height, used to hold a dragged scoreboard in place as
 * players are added: it grows from its bottom-right corner, so without this a
 * three-player match sits a row lower than the two-player one it was placed as.
 */
export const SCOREBOARD_METRICS = {
  classic: { width: 30 + 8 + 8, widthWithSets: 35 + 8 + 8 + 8, rowPx: 68 },
  v2: { width: 44, widthWithSets: 51, rowPx: 72 },
} as const;

/** Which metrics a config's chosen skin uses. */
export function metricsFor(design: string | undefined) {
  return design === "v2" ? SCOREBOARD_METRICS.v2 : SCOREBOARD_METRICS.classic;
}
