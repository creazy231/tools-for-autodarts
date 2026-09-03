import { AutodartsToolsConfig } from "@/utils/storage";
import { SELECTORS, anyOf } from "@/utils/selectors";
import { addStyles, removeStyles } from "@/utils";

/**
 * Larger Legs / Sets.
 *
 * The rebuilt card shows legs won as a small boxed number beside the score,
 * `size-8` — a fixed 2rem square. Growing the digit alone overflows it, so the
 * box is sized from the text instead.
 *
 * Scoped to the card rather than to the column round it: only the widest layout
 * draws that column, so the rule used to do nothing below 1280px.
 */
const STYLE_ID = "larger-legs-sets";

export async function largerLegsSets() {
  try {
    const config = await AutodartsToolsConfig.getValue();
    if (!config.largerLegsSets.enabled) return;

    const rem = config.largerLegsSets.value || 2.5;
    const card = anyOf(SELECTORS.match.scoreCard);
    const box = SELECTORS.match.playerLegsSets[0];

    addStyles(`
      ${card} ${box} {
        width: auto !important;
        height: auto !important;
        min-width: ${rem + 0.75}rem !important;
        padding: 0.25rem 0.5rem !important;
      }
      ${card} ${box} span {
        font-size: ${rem}rem !important;
        line-height: 1.1 !important;
      }
    `, STYLE_ID);

    console.log("Autodarts Tools: Larger Legs / Sets - applied");
  } catch (e) {
    console.error("Autodarts Tools: Larger Legs / Sets - Error: ", e);
  }
}

export function largerLegsSetsOnRemove() {
  removeStyles(STYLE_ID);
}
