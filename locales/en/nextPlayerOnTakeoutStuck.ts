/**
 * Auto Next Player on Takeout — components/Settings/NextPlayerOnTakeoutStuck.vue. The countdown
 * itself is a number on the site's own Next button (entrypoints/match.content/button-countdown.ts),
 * so it has no text. Its name is features.nextPlayerOnTakeoutStuck.
 */
export default {
  /** `count` is the countdown in seconds, 5 until one is set. */
  card: {
    one: "Automatically reset board and switch to next player if takeout stucks for {count} second.",
    other: "Automatically reset board and switch to next player if takeout stucks for {count} seconds.",
  },
  /** "Next" is the site's own button. */
  intro: "Presses Next for you when a takeout never finishes. A countdown starts on the site's own Next button as soon as the takeout does, and a click anywhere calls it off.",
  sections: {
    options: "Options",
  },
  countdown: {
    title: "Countdown",
    description: "From the start of the takeout to the press, unless the board comes back first.",
  },
};
