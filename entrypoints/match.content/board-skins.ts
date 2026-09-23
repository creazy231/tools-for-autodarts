import { keepBoardView } from "./board-view";

import type { IConfig } from "@/utils/storage";

import { addStyles, removeStyles } from "@/utils";
import { AutodartsToolsConfig } from "@/utils/storage";
import { boardSkin } from "@/utils/board-skins";
import { SELECTORS } from "@/utils/selectors";

/**
 * Board Skins — autodarts' drawn dartboard in another design.
 *
 * The site draws its board as a stack of layers in one element: the segments,
 * then the maker's branding and the number ring, then — last, on top — the
 * layer holding the darts and the yellow of a hit. A skin takes the place of
 * the first three and leaves the last alone, so the darts, the highlight and
 * aiming with the pointer all work exactly as before: the picture lines up with
 * them because it is drawn to the site's own grid — see utils/board-skins.ts.
 *
 * It is a stylesheet, and adds no markup. React owns every one of those layers
 * and redraws them on every dart; a rule keeps applying through all of that,
 * through the screen being rebuilt after the bull-off and through the layout
 * changing with the window, where anything written into the board would have to
 * be put back each time. The picture is the segment layer's own background, and
 * the segments drawn over it are made transparent — so it moves with the layer
 * when Darts Zoom's board position zooms in, and it is gone the moment a camera
 * takes over, since the site draws the camera's picture in the segment layer's
 * place and the rules then have nothing to apply to.
 *
 * Only the drawn board can wear a skin, so this also keeps the board on it, the
 * way Board View does — and while it is on, it is the feature that decides what
 * the board shows. See `viewOwner` in board-view.ts.
 */
const STYLE_ID = "board-skins";

/**
 * How a dimmed segment is drawn.
 *
 * The games played at particular numbers dim every other segment to 20%, over
 * the near-black of the site's own board. A transparent segment dims to nothing
 * at all, so a dimmed one is painted in that near-black at 80% instead: the same
 * mix — a fifth of the colour underneath, the rest black — whatever the skin's
 * own colours are. The site fades the dimming in and out, and that comes across
 * too: the opacity is what changes, and the transition on it is the site's.
 *
 * The outer ring is left out. On the site's own board the numbers are a layer
 * of their own on top, so they never dim; a skin draws them into that ring,
 * which would otherwise dim with everything else — the number being aimed at
 * included. The ring's paths are the ones drawn out to the board's edge, which
 * d3 writes into them as the radius `A500,500`. Should that ever stop matching,
 * the numbers simply dim along with their segments.
 */
const DIM_FILL = "#01040B";
const DIM_OPACITY = "0.8";
const OUTER_RING = "[d*='A500,500']";

/** Candidate selectors for one layer of a board, relative to the board. */
type Layers = readonly string[];

/** The skin being drawn, for {@link dressBoardCopy}. Null while none is. */
let art: string | null = null;
let stopKeeping: (() => void) | null = null;

/**
 * Where the skin goes, and what gives way to it, relative to one board. Later
 * rules win where they overlap, as they would in a stylesheet.
 */
function rules(picture: string): [ Layers, Record<string, string> ][] {
  const segments = SELECTORS.match.boardSegments;
  const inSegments = (tail: string) => segments.map(layer => `${layer} > ${tail}`);

  return [
    [ segments, { background: `url("${picture}") center / 100% 100% no-repeat` } ],
    // The board's own backdrop, drawn under the segments.
    [ inSegments("g > circle"), { "fill-opacity": "0" } ],
    [ inSegments("g > path[fill-opacity]"), { "fill": DIM_FILL, "fill-opacity": "0" } ],
    [ inSegments(`g > path[fill-opacity]:not([fill-opacity='1'], ${OUTER_RING})`), { "fill-opacity": DIM_OPACITY } ],
    // The wires, which the site draws in with the segments.
    [ inSegments("g > g"), { display: "none" } ],
    [ SELECTORS.match.boardArtwork, { display: "none" } ],
  ];
}

function stylesheet(picture: string): string {
  return rules(picture).map(([ layers, declarations ]) => {
    const selector = SELECTORS.match.anyBoard
      .flatMap(board => layers.map(layer => `${board} > ${layer}`))
      .join(",\n");
    const body = Object.entries(declarations).map(([ property, value ]) => `  ${property}: ${value};`).join("\n");
    return `${selector} {\n${body}\n}`;
  }).join("\n\n");
}

/**
 * Put the current skin on a copy of the board.
 *
 * Darts Zoom and Streaming Mode draw copies of the site's board, and neither is
 * reached by the stylesheet: both take the board's role and label off their
 * copy, which is what the stylesheet recognises a board by, and Streaming Mode's
 * sits in a shadow root besides. A copy is a snapshot redrawn on every change,
 * so the same rules are written onto it directly instead. Does nothing while no
 * skin is being drawn.
 */
export function dressBoardCopy(copy: HTMLElement): void {
  if (!art) return;

  for (const [ layers, declarations ] of rules(art)) {
    const selector = layers.map(layer => `:scope > ${layer}`).join(", ");
    copy.querySelectorAll<HTMLElement | SVGElement>(selector).forEach((element) => {
      for (const [ property, value ] of Object.entries(declarations)) element.style.setProperty(property, value);
    });
  }
}

export async function boardSkins() {
  const config: IConfig = await AutodartsToolsConfig.getValue();
  const skin = boardSkin(config.boardSkins?.skin);

  art = skin.art;
  if (art) addStyles(stylesheet(art), STYLE_ID);
  else removeStyles(STYLE_ID);

  console.log(`Autodarts Tools: Board Skins - ${skin.label}, keeping the board on the drawn one`);
  stopKeeping?.();
  stopKeeping = keepBoardView("image");
}

/**
 * Stop keeping the view, and take the skin off.
 *
 * Except on the way out of the bull-off. The match is torn down and started
 * again a couple of seconds later, and taking the skin off in between shows the
 * site's own board for those seconds, just as the match proper begins.
 * Starting again replaces the stylesheet whatever it finds.
 */
export function boardSkinsOnRemove(fromBullOff = false) {
  stopKeeping?.();
  stopKeeping = null;
  if (fromBullOff) return;

  removeStyles(STYLE_ID);
  art = null;
}
