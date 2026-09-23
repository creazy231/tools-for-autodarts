/**
 * Every layer this extension paints over autodarts' own page, in one place.
 *
 * These all compete in the **document's** root stacking context — the ones
 * written inside a shadow root included. WXT resets each shadow host with
 * `:host { all: initial !important }`, which leaves it `position: static` and
 * `z-index: auto`, so a host establishes no stacking context of its own and
 * whatever layer its content asks for is compared directly against every other
 * entry here.
 *
 * Which is why they have to be chosen together rather than one feature at a
 * time. Takeout Notification and Streaming Mode each picked 200 on their own,
 * and a tie is settled by document order — so the takeout notice, appended to
 * `body` after the overlay's host, painted over a broadcast overlay whose whole
 * purpose is to cover everything. Worse than untidy: its scrim darkened the
 * chroma key along with it, which is enough to stop the key working downstream.
 *
 * The site's own layers are in that context too, and the lowest entries here
 * are placed against them. On the match screen autodarts draws the match itself
 * at 10 and the game-info pills at 20. Its header and the match chat's messages
 * sit at 40, and its sheets and dialogs — the chat, the in-game settings, every
 * confirmation — at 50, portaled to `body`.
 *
 * Not every `z-index` in the extension belongs here. Winner Animation's is
 * measured against the site's own end-of-leg panel and lives *inside* the site's
 * card, a nested stacking context — a number in this scale would mean nothing
 * there.
 */

/**
 * The features that draw over the match, in the order they should stack.
 *
 * Add a new feature here rather than writing a number into it, and keep the gaps
 * — they leave room to slot something in without renumbering its neighbours.
 */
const FEATURE_LAYERS = {
  /**
   * Darts Zoom's tile strip: over the match, under everything the site lays
   * over it.
   *
   * It was 190, above all of those, and the bottom strip is where the site
   * opens its sheets from. The match chat came up with its message field and
   * quick replies behind the tiles, and the messages it shows at the bottom
   * right arrived behind the third one.
   */
  zoom: 30,
  /**
   * The site's own buttons, moved out from under that strip — so one above it,
   * and under the site's sheets with the rest of the match. That holds in the
   * sidebar and top-bar layouts, where the bar is a layer of its own. In the
   * widest one it stays inside the match area's own `z-10` context, so there it
   * is at 10 against everything here.
   */
  zoomTile: 31,
  /** Caller status readout. */
  callerStatus: 50,
  /** Sound FX status readout. */
  soundStatus: 50,
  /**
   * Animations, over the match but under anything that wants an answer.
   *
   * Darts Zoom counts as the match here. Its tiles only show darts that are
   * already on the board, and they stay up for the whole visit, so a GIF under
   * them had a strip cut out of it for as long as it played. The action bar Zoom
   * moves goes under the GIF with them, as the bar already does where the site
   * draws it, and a click on the GIF puts it away.
   */
  animations: 195,
  /** The takeout notice and its scrim. */
  takeout: 200,
  /** Instant Replay's clip, over the takeout notice it usually follows. */
  instantReplay: 210,
  /** Quick Correction, which is asking a question and has to be reachable. */
  quickCorrection: 10000,
} as const;

export const LAYERS = {
  ...FEATURE_LAYERS,

  /**
   * Streaming Mode, above every other layer in this extension.
   *
   * Derived from them rather than written down, so a feature added above cannot
   * end up over the overlay by picking a bigger number than whatever happened to
   * be the biggest the day this was typed. The overlay replaces the match screen
   * outright; nothing of ours belongs in front of it.
   */
  streamingMode: Math.max(...Object.values(FEATURE_LAYERS)) + 100,
} as const;
