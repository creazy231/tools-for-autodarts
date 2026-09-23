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
 * and an entry here; nothing on the match screen needs to know about it.
 *
 * The picture ends up in a stylesheet on autodarts' page, in the settings, and
 * in the copies of the board that Darts Zoom and Streaming Mode keep in places
 * of their own — one of them a shadow root — so it has to be an address the
 * page itself can load. How a skin gets one depends on its size:
 *
 * - An SVG is a few dozen KB of text, and goes in as a data URL: nothing to load.
 * - A photo or a rendered picture is hundreds of KB, and a data URL is a third
 *   bigger again, bundled twice and written into every copy Darts Zoom makes. So
 *   those ship as files in `public/images/`, which the manifest lets autodarts'
 *   pages load, and are read from the extension.
 */
export type BoardSkinId = IConfig["boardSkins"]["skin"];

export interface BoardSkin {
  id: BoardSkinId;
  label: string;
  description: string;
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
 * The qwellcode board, from the extension.
 *
 * Looked up when it is read rather than when this module loads: WXT evaluates
 * entrypoints in Node while it builds, and there is no `browser` to ask there.
 */
function qwellcode(): string {
  return browser.runtime.getURL("/images/board-skin-qwellcode.jpg");
}

const CLASSIC = dataUrl(boardV1);

export const BOARD_SKINS: readonly BoardSkin[] = [
  {
    id: "default",
    label: "Default",
    description: "The board autodarts draws today.",
    preview: dataUrl(boardV2),
    art: null,
  },
  {
    id: "v1",
    label: "Classic",
    description: "The board autodarts drew before its rebuild.",
    preview: CLASSIC,
    art: CLASSIC,
  },
  {
    id: "qwellcode",
    label: "qwellcode",
    description: "The qwellcode board, with its lime-green rings.",
    get preview() { return qwellcode(); },
    get art() { return qwellcode(); },
  },
];

/** The skin saved as `id`, or Default for anything this build does not know. */
export function boardSkin(id: unknown): BoardSkin {
  return BOARD_SKINS.find(skin => skin.id === id) ?? BOARD_SKINS[0];
}
