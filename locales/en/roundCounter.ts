/**
 * Round Counter — components/Settings/RoundCounter.vue and
 * entrypoints/match.content/round-counter.ts. Its name is features.roundCounter.
 * The panel has no settings, so it only says what the feature does.
 */
export default {
  card: "Shows the current round in the match header.",
  imageAlt: "Round Counter feature preview",
  intro: "Shows the current round and the match's round limit, centred in the match header — what the match screen showed before the site's rebuild.",
  /** The counter in the match header, in the site's own words (`game.roundOf`). */
  roundOf: "Round {round}/{total}",
  /** The counter in a game played without a round limit. */
  round: "Round {round}",
};
