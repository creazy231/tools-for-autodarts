import { AutodartsToolsConfig } from "@/utils/storage";
import { SELECTORS, anyOf } from "@/utils/selectors";
import { addStyles, removeStyles } from "@/utils";

/**
 * Larger Player Names.
 *
 * A stylesheet rather than inline styles, which is the difference between this
 * working and not: the rebuilt score card is React, and it re-renders the name
 * on every throw — anything written onto the element itself is gone by the next
 * dart.
 *
 * The site sizes the name with `text-[18px]` inside a fixed `h-3.75` box that
 * the glyphs overflow, so growing only the font crops it top and bottom. The
 * height and the plate behind it have to come along.
 *
 * Scoped to the card rather than to the column round it: only the widest layout
 * draws that column, so the rule used to do nothing below 1280px.
 */
const STYLE_ID = "larger-player-names";

export async function largerPlayerNames() {
  try {
    const config = await AutodartsToolsConfig.getValue();
    if (!config.largerPlayerNames.enabled) return;

    const rem = config.largerPlayerNames.value || 1.5;
    const card = anyOf(SELECTORS.match.scoreCard);
    const name = SELECTORS.match.playerName[0];

    addStyles(`
      ${card} ${name} {
        font-size: ${rem}rem !important;
        height: auto !important;
        line-height: 1.15 !important;
      }
      /* the name plate is a fixed-height pill; let it follow the text */
      ${card} :has(> ${name}) {
        height: auto !important;
      }
    `, STYLE_ID);

    console.log("Autodarts Tools: Larger Player Names - applied");
  } catch (e) {
    console.error("Autodarts Tools: Larger Player Names - Error: ", e);
  }
}

export function largerPlayerNamesOnRemove() {
  removeStyles(STYLE_ID);
}
