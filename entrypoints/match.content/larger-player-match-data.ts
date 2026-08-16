import { AutodartsToolsConfig } from "@/utils/storage";
import { SELECTORS } from "@/utils/selectors";
import { addStyles, removeStyles } from "@/utils";

/**
 * Larger Player Match Data — the "Leg 0.0 / Match 0.0" averages under the score.
 *
 * The site hides that row below a 190px card, so the rule has to leave
 * `display` alone; only the type scale changes.
 */
const STYLE_ID = "larger-player-match-data";

export async function largerPlayerMatchData() {
  try {
    const config = await AutodartsToolsConfig.getValue();
    if (!config.largerPlayerMatchData.enabled) return;

    const rem = config.largerPlayerMatchData.value || 1.5;
    const card = SELECTORS.match.playerCards[0];
    const row = SELECTORS.match.playerMatchData[0];

    addStyles(`
      ${card} ${row},
      ${card} ${row} span {
        font-size: ${rem}rem !important;
        line-height: 1.2 !important;
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
