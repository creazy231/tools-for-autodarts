/**
 * Quick Correction — components/Settings/QuickCorrection.vue. Its name is features.quickCorrection.
 * The correction window in a match (entrypoints/match.content/QuickCorrection.vue) has no text of its
 * own: MISS, 25 and BULL are the values it sends to autodarts as well as its labels, so they stay.
 */
export default {
  card: "Adds a quick correction to dart throws, allowing you to fix incorrectly recognized darts.",
  intro: "Fixes a dart the board read wrong: open it on a throw and pick the right segment from a grid of the whole board, with the mouse or the number pad.",
  /** Safari's security rules block the correction window: a note on the card, and one in the panel. */
  safari: {
    card: "Not compatible with Safari browsers for now.",
    panel: "Not available in Safari yet: its security rules block the correction window.",
  },
  sections: {
    options: "Options",
  },
  windowSize: {
    title: "Window size",
    description: "How large the correction window opens.",
  },
};
