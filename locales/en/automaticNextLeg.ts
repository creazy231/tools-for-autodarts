/**
 * Automatic Next Leg — components/Settings/AutomaticNextLeg.vue. The countdown itself is a number
 * on the site's own Next Leg button (entrypoints/match.content/button-countdown.ts), so it has no
 * text. Its name is features.automaticNextLeg.
 */
export default {
  /** `count` is the countdown in seconds, 5 until one is set. */
  card: {
    one: "Automatically starts the next leg {count} second after takeout.",
    other: "Automatically starts the next leg {count} seconds after takeout.",
  },
  /** "Next Leg" is the site's own button. */
  intro: "Starts the next leg once the darts are out of the board, after a countdown on the site's own Next Leg button.",
  sections: {
    options: "Options",
  },
  countdown: {
    title: "Countdown",
    description: "From the end of the takeout to the next leg.",
  },
};
