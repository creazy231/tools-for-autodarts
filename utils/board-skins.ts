import type { PublicPath } from "wxt/browser";
import type { MessageKey } from "@/utils/i18n";
import type { IConfig } from "@/utils/storage";

import boardV1 from "@/assets/autodarts_board_v1.svg?raw";
import boardV2 from "@/assets/autodarts_board_v2.svg?raw";

/**
 * The boards Board Skins can draw in place of autodarts' own.
 *
 * Every one is a whole board drawn to the site's own grid, so it lines up with
 * the darts, the hit highlight and a click on the board as it is, without being
 * scaled or moved. In the site's terms that is a 1000-unit square with the bull
 * at its centre and the double ring's outer edge 377.778 units out; for a
 * picture of any size, it is a square with the board filling it edge to edge,
 * the double ring's outer edge 75.56% of the way from the centre to the edge,
 * and the 20 at the top. Whatever lies outside the board's circle is never seen,
 * so a JPEG's corners can be any colour. A new skin is a file drawn to that grid
 * and an entry here, whose name and description go in locales/<language>/boardSkins.ts;
 * nothing on the match screen needs to know about it.
 *
 * The picture ends up in a stylesheet on autodarts' page, in the settings, and
 * in the copies of the board that Darts Zoom and Streaming Mode keep in places
 * of their own — one of them a shadow root — so it has to be an address the
 * page itself can load. How a skin gets one depends on its size:
 *
 * - An SVG is a few dozen KB of text, and goes in as a data URL: nothing to load.
 * - A photo or a rendered picture is hundreds of KB or more, and a data URL is a
 *   third bigger again, bundled twice and written into every copy Darts Zoom
 *   makes. So those ship as files: every `assets/<name>_board.<png|jpg|webp>`
 *   is copied to `images/` in the build by a hook in wxt.config.ts, where the
 *   manifest lets autodarts' pages load it, and is read from the extension.
 *   A PNG can leave everything outside the board transparent, which is worth
 *   doing when the board does not reach the picture's edge: the site clips the
 *   board to a circle as wide as the square, so a backdrop would show as a ring.
 */
export type BoardSkinId = IConfig["boardSkins"]["skin"];

export interface BoardSkin {
  id: BoardSkinId;
  /**
   * Where the skin's name and its description are in the catalog. They are keys,
   * not text: the settings call `t()` on them when they draw, so the text follows
   * the language of the site, and this module never imports the i18n runtime.
   */
  labelKey: MessageKey;
  descriptionKey: MessageKey;
  /** What the settings page shows for it. */
  preview: string;
  /**
   * What the match screen draws, or null to leave autodarts' board as it is.
   *
   * Default's preview is the board autodarts draws today, so there is nothing
   * to draw over it: choosing it keeps the site's own board, and the feature
   * only keeps that board on screen.
   */
  art: string | null;
}

function dataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * A skin drawn from a picture that ships with the extension.
 *
 * Its address is looked up when it is read rather than when this module loads:
 * WXT evaluates entrypoints in Node while it builds, and there is no `browser`
 * to ask there.
 */
function pictureSkin(id: BoardSkinId, labelKey: MessageKey, descriptionKey: MessageKey, path: PublicPath): BoardSkin {
  return {
    id,
    labelKey,
    descriptionKey,
    get preview() { return browser.runtime.getURL(path); },
    get art() { return browser.runtime.getURL(path); },
  };
}

const CLASSIC = dataUrl(boardV1);

export const BOARD_SKINS: readonly BoardSkin[] = [
  {
    id: "default",
    labelKey: "boardSkins.skins.default.label",
    descriptionKey: "boardSkins.skins.default.description",
    preview: dataUrl(boardV2),
    art: null,
  },
  {
    id: "v1",
    labelKey: "boardSkins.skins.v1.label",
    descriptionKey: "boardSkins.skins.v1.description",
    preview: CLASSIC,
    art: CLASSIC,
  },
  pictureSkin("qwellcode", "boardSkins.skins.qwellcode.label", "boardSkins.skins.qwellcode.description", "/images/qwellcode_board.jpg"),
  pictureSkin("opal", "boardSkins.skins.opal.label", "boardSkins.skins.opal.description", "/images/opal_board.png"),
  pictureSkin("marble", "boardSkins.skins.marble.label", "boardSkins.skins.marble.description", "/images/marble_board.png"),
  pictureSkin("sorbet", "boardSkins.skins.sorbet.label", "boardSkins.skins.sorbet.description", "/images/sorbet_board.png"),
];

/** The skin saved as `id`, or Default for anything this build does not know. */
export function boardSkin(id: unknown): BoardSkin {
  return BOARD_SKINS.find(skin => skin.id === id) ?? BOARD_SKINS[0];
}
