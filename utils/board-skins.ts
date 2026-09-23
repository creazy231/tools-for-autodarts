import type { IConfig } from "@/utils/storage";

import boardV1 from "@/assets/autodarts_board_v1.svg?raw";
import boardV2 from "@/assets/autodarts_board_v2.svg?raw";

/**
 * The boards Board Skins can draw in place of autodarts' own.
 *
 * Every one is a whole board drawn on the site's own grid — a 1000-unit square,
 * the bull at its centre, the double ring's outer edge 377.778 units out — so
 * it lines up with the darts, the hit highlight and a click on the board as it
 * is, without being scaled or moved. A new skin is a new SVG drawn to that grid
 * and an entry here; nothing on the match screen needs to know about it.
 *
 * Carried as data URLs rather than as files in `public/`. The match screen puts
 * the picture into a stylesheet on autodarts' page, and into copies of the
 * board that Darts Zoom and Streaming Mode keep in places of their own — one of
 * them a shadow root — and a data URL is the one address that works in all of
 * them without asking the page to load anything from the extension.
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
];

/** The skin saved as `id`, or Default for anything this build does not know. */
export function boardSkin(id: unknown): BoardSkin {
  return BOARD_SKINS.find(skin => skin.id === id) ?? BOARD_SKINS[0];
}
