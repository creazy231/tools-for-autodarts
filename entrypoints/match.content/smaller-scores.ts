import { SELECTORS } from "@/utils/selectors";
import { addStyles, removeStyles } from "@/utils";

/**
 * Smaller Scores — shrink the waiting players' scores so the thrower's stands out.
 *
 * v1 keyed this off `.ad-ext-player-active`. The rebuilt site marks the active
 * player by painting that card with its gradient instead of by class, so the
 * rule targets the cards that do *not* carry it.
 *
 * The score sits in a fixed-height, `overflow-hidden` line box sized for the
 * full-size digits, so the height comes down with the type or the smaller
 * number floats at the top of a gap.
 */
const STYLE_ID = "score-smaller";

export async function smallerScores() {
  try {
    const card = SELECTORS.match.playerCards[0];
    const score = SELECTORS.match.playerScore[0];

    addStyles(`
      ${card}:not(:has([class*="bg-raspberry"])) ${score} {
        font-size: 3rem !important;
        height: auto !important;
        line-height: 1 !important;
      }
    `, STYLE_ID);

    console.log("Autodarts Tools: Smaller Scores - applied");
  } catch (e) {
    console.error("Autodarts Tools: Smaller Scores - Error: ", e);
  }
}

export function smallerScoresOnRemove() {
  removeStyles(STYLE_ID);
}
