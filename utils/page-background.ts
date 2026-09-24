import { STYLE_ID_PREFIX, addStyles, removeStyles } from "@/utils";
import { normalizeColors, pageStyles } from "@/utils/colors";
import { AutodartsToolsConfig } from "@/utils/storage";

const STYLE_ID = "page-background";

/**
 * autodarts' page texture, the SVG layer of its `body` background, as the
 * site's own stylesheet has it.
 *
 * Read from the rules rather than the computed style, which is ours whenever
 * Colors has painted the page already. The site keeps the rule in
 * `@layer base`, so layers and other group rules are searched too, and a sheet
 * that will not be read is skipped. `undefined` when there is none to be found:
 * pageStyles then leaves the texture exactly as the site draws it.
 */
export function siteTexture(): string | undefined {
  for (const sheet of Array.from(document.styleSheets)) {
    if ((sheet.ownerNode as Element | null)?.id?.startsWith(STYLE_ID_PREFIX)) continue;
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    const layer = bodyTexture(rules);
    if (layer) return layer;
  }
  return undefined;
}

/**
 * Duck-typed rather than `instanceof`, which a content script cannot rely on
 * for the page's own objects in every browser.
 */
function bodyTexture(rules: CSSRuleList): string | undefined {
  for (const rule of Array.from(rules)) {
    const style = rule as CSSStyleRule;
    if (style.selectorText?.trim() === "body" && style.style?.backgroundImage) {
      const layer = style.style.backgroundImage.match(/url\(\s*"data:image\/svg\+xml[^"]*"\s*\)/)?.[0];
      if (layer) return layer;
    }
    const nested = (rule as CSSGroupingRule).cssRules;
    if (nested?.length) {
      const layer = bodyTexture(nested);
      if (layer) return layer;
    }
  }
  return undefined;
}

/**
 * Colors' page on every autodarts page, when it is set to *Everywhere*.
 *
 * The match screen paints the page itself, along with the rest of Colors. This
 * is the part for everywhere else, and it runs from the content script that is
 * on every page. It follows the config, so a colour picked on the settings page
 * shows behind it at once.
 *
 * @returns the teardown
 */
export async function pageBackground(): Promise<() => void> {
  let texture: string | undefined;

  const apply = (saved: unknown) => {
    const colors = normalizeColors(saved);
    if (colors.enabled && colors.everywhere && colors.page.preset !== "default") {
      texture ??= siteTexture();
      addStyles(pageStyles(colors.page, texture), STYLE_ID);
    } else {
      removeStyles(STYLE_ID);
    }
  };

  apply((await AutodartsToolsConfig.getValue())?.colors);
  const unwatch = AutodartsToolsConfig.watch(value => apply(value?.colors));

  return () => {
    unwatch();
    removeStyles(STYLE_ID);
  };
}
