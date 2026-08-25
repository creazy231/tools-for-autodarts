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
  /** Caller status readout. */
  callerStatus: 50,
  /** Sound FX status readout. */
  soundStatus: 50,
  /** Animations, over the match but under anything that wants an answer. */
  animations: 180,
  /** Darts Zoom's tile strip. */
  zoom: 190,
  /** The site's own buttons, moved out from under that strip. */
  zoomTile: 191,
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
