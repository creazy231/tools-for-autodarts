/**
 * Winner Animation — components/Settings/WinnerAnimation.vue, and the caption the match page draws
 * above the winning card, entrypoints/match.content/winner-animation.ts.
 * Its name is features.winnerAnimation.
 * The panel has no settings, so it only says what the feature does.
 */
export default {
  card: "Shows an animation around the player card when a player wins a leg, adding visual excitement to the game.",
  intro: "Configure the winner animation settings.",
  effect: "This feature shows an animation around the player card when a player wins a leg.",
  /** `animations` is the feature's name, features.animations. */
  customise: "You can customize the animations in the {animations} section of the settings page.",
  /** The caption over the winning card, set in capitals by CSS. `count` is the darts the winner has thrown. */
  darts: { one: "{count} Dart", other: "{count} Darts" },
  /** The same caption for the perfect leg: nine darts in 501, six in 301. */
  perfectLeg: "{count} Darter — Perfect Leg!",
};
