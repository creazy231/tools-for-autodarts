import { AutodartsToolsConfig } from "@/utils/storage";
import { SELECTORS } from "@/utils/selectors";
import { addStyles, removeStyles } from "@/utils";

/**
 * Colors — recolour the score cards, the throw bar and the page behind them.
 *
 * v1 walked the player display twice a second and wrote inline styles onto
 * every element it found. That was already a poll where it did not need to be
 * one, and on the rebuilt site it would not survive anyway: React re-renders
 * the score cards on every dart. One stylesheet does the whole job.
 *
 * The site paints the active player's card with a gradient image rather than a
 * background colour, so that has to be turned off explicitly or it covers
 * whatever colour is set here.
 */
const STYLE_ID = "color-change";

export async function colorChange() {
  try {
    const config = await AutodartsToolsConfig.getValue();
    if (!config.colors.enabled) return;

    const { background, text, matchBackground } = config.colors;
    const card = SELECTORS.match.playerCards[0];
    const scoreCard = SELECTORS.match.playerScoreCard[0];
    const turnBar = SELECTORS.match.turnBar[0];
    const turnBarPanel = SELECTORS.match.turnBarPanel[0];

    const rules = [ `
      /* score cards — the gradient is a background-image, so name it directly */
      ${card} ${scoreCard} {
        background-image: none !important;
        background-color: ${background} !important;
        color: ${text} !important;
      }
      ${card} ${scoreCard} :is(div, span, p) {
        color: ${text} !important;
      }
      /* the three dart slots and the turn total above the board */
      ${turnBar}, ${turnBar} span {
        color: ${text} !important;
      }
      /* the panel behind them too, or it shows in the gaps — and the site
         turns it red on a bust, which reads as broken next to a chosen scheme */
      ${turnBar}, ${turnBarPanel}, ${turnBarPanel} > div {
        background-color: ${background} !important;
      }
    ` ];

    if (matchBackground) {
      rules.push(`
        body, #root > div {
          background-color: ${matchBackground} !important;
          background-image: none !important;
        }
      `);
    }

    addStyles(rules.join("\n"), STYLE_ID);
    console.log("Autodarts Tools: Colors - applied");
  } catch (e) {
    console.error("Autodarts Tools: Colors - Error: ", e);
  }
}

export function onRemove() {
  removeStyles(STYLE_ID);
}
