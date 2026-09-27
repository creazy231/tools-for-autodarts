import { SELECTORS, anyOf } from "@/utils/selectors";
import { addStyles, removeStyles } from "@/utils";

/**
 * Smaller Scores — shrink the waiting players' scores so the thrower's stands out.
 *
 * v1 keyed this off `.ad-ext-player-active`. The rebuilt site marks a card by
 * painting its face instead, and not only for whose turn it is: a bust turns
 * the thrower's card grey and a won leg gives the winner's its own gradient,
 * each taking the resting colour off. So the rule targets the cards still at
 * rest, as Colors does. Keyed on "no turn gradient", it shrank the thrower's
 * score the moment they busted or won, and everything around the card moved
 * with it: in the stacked layout the whole row of cards above the board, and
 * the board. With three or more players that layout draws the thrower's card
 * with no colour of its own, so it shrank the one big score it shows.
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
    const idle = anyOf(SELECTORS.match.idleCard);
    const score = SELECTORS.match.playerScore[0];

    addStyles(`
      ${card}${idle} ${score} {
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
