import { addStyles, removeStyles } from "@/utils";
import { matchStyles, normalizeColors, pageStyles } from "@/utils/colors";
import { siteTexture } from "@/utils/page-background";
import { AutodartsToolsConfig } from "@/utils/storage";

/**
 * Colors: the active player's card, the other cards, the text on them, both
 * bars, and the page behind them.
 *
 * v1 walked the player display twice a second and wrote inline styles onto
 * every element it found. On the rebuilt site that would not survive anyway,
 * since React re-renders the score cards on every dart, so one stylesheet does
 * the whole job. What goes in it is built in utils/colors.ts, which the
 * settings page's preview draws from too.
 *
 * With *Everywhere* on, the content script paints the page as well; the two
 * rules are the same, so either one alone is enough.
 */
const STYLE_ID = "color-change";

export async function colorChange() {
  try {
    const colors = normalizeColors((await AutodartsToolsConfig.getValue()).colors);
    if (!colors.enabled) return;

    const rules = [ matchStyles(colors) ];
    if (colors.page.preset !== "default") rules.push(pageStyles(colors.page, siteTexture()));

    addStyles(rules.join("\n"), STYLE_ID);
    console.log("Autodarts Tools: Colors - applied");
  } catch (e) {
    console.error("Autodarts Tools: Colors - Error: ", e);
  }
}

export function onRemove() {
  removeStyles(STYLE_ID);
}
