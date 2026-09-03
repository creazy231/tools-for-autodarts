import { AutodartsToolsConfig } from "@/utils/storage";
import { SELECTORS, anyOf } from "@/utils/selectors";
import { addStyles, removeStyles } from "@/utils";

/**
 * Larger Player Match Data — the "Leg 0.0 / Match 0.0" averages under the score.
 *
 * The site fits that row to the card: it writes a pixel font-size onto the
 * row's span and shrinks it until the row is no wider than the card, clipping
 * with an ellipsis when even its minimum will not fit. An `!important` rule
 * outranks the inline size, so the type scale is ours — and at a size of our
 * choosing the row should wrap onto a second line rather than be cut short.
 *
 * Scoped to the card rather than to the column round it: only the widest layout
 * draws that column, so the rule used to do nothing below 1280px.
 */
const STYLE_ID = "larger-player-match-data";

export async function largerPlayerMatchData() {
  try {
    const config = await AutodartsToolsConfig.getValue();
    if (!config.largerPlayerMatchData.enabled) return;

    const rem = config.largerPlayerMatchData.value || 1.5;
    const card = anyOf(SELECTORS.match.scoreCard);
    const row = anyOf(SELECTORS.match.playerMatchData);

    addStyles(`
      ${card} ${row},
      ${card} ${row} span {
        font-size: ${rem}rem !important;
        line-height: 1.2 !important;
      }
      ${card} ${row} > span {
        white-space: normal !important;
        overflow: visible !important;
        text-overflow: clip !important;
      }
      ${card} ${row} > span > div {
        flex-wrap: wrap !important;
        justify-content: center !important;
      }
    `, STYLE_ID);

    console.log("Autodarts Tools: Larger Player Match Data - applied");
  } catch (e) {
    console.error("Autodarts Tools: Larger Player Match Data - Error: ", e);
  }
}

export function largerPlayerMatchDataOnRemove() {
  removeStyles(STYLE_ID);
}
