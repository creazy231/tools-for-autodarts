import { SELECTORS, anyOf } from "@/utils/selectors";
import { addStyles, removeStyles } from "@/utils";

/**
 * Smaller Scores — shrink the waiting players' scores so the thrower's stands out.
 *
 * v1 keyed this off `.ad-ext-player-active`. The rebuilt site marks the active
 * player by painting that card with its gradient instead of by class, so the
 * rule targets the cards that do *not* carry it.
 *
 * The card, not the column it sits in: the widest layout stacks two or three
 * cards in one column, and a rule keyed on "the column without the gradient"
 * left every card sharing the thrower's column at full size. The other two
 * layouts have no column at all, so there it shrank nothing.
 *
 * The score sits in a fixed-height, `overflow-hidden` line box sized for the
 * full-size digits, so the height comes down with the type or the smaller
 * number floats at the top of a gap.
 */
const STYLE_ID = "score-smaller";

export async function smallerScores() {
  try {
    const card = anyOf(SELECTORS.match.scoreCard);
    const score = SELECTORS.match.playerScore[0];

    addStyles(`
      ${card}:not([class*="bg-raspberry"]) ${score} {
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
