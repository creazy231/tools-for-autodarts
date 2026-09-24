import type { IThrow } from "@/utils/websocket-helpers";

/**
 * The kinds of `entry` that mean a dart was put on the scoreboard by hand.
 *
 * The server stamps every dart with how it got there, and it overrules the
 * client — a dart posted as `detected` comes back as `manual_coords` — so the
 * stamp can be trusted. Read off live matches on 2026-09-24:
 *
 * - `manual_coords`, `manual_keyboard`: clicked onto the board or typed in on
 *   the keypad — a dart the board missed, or one taken back and put in again
 * - `corrected_…`: moved after it was scored, `corrected_lens` for a Lens's
 *   dart and `corrected_bouncer` for one turned into a bouncer
 * - `fill_miss`: the misses a visit is padded out with when it ends early
 *
 * Everything else is a dart that landed: `detected` from an autodarts board,
 * `detected_lens` from a Lens, `bot`, and `referee_ai_confirmed` and
 * `referee_ai_corrected`, the AI referee's word on a dart it saw land.
 */
const ENTERED = [ "manual", "corrected", "fill" ];

/**
 * Whether a dart was thrown, rather than entered by hand.
 *
 * The kind is at the start of the stamp, so that is what is matched: the AI
 * referee's `referee_ai_corrected` has the word in it and is still a dart that
 * was thrown. It is the entered kinds that are picked out, not the thrown
 * ones, so a dart from a device this does not know yet counts as thrown.
 */
export function wasThrown(thrown: IThrow): boolean {
  const entry = thrown.entry ?? "";
  return !ENTERED.some(kind => entry.startsWith(kind));
}
