import type { IGameData } from "@/utils/game-data-storage";
import type { IThrow } from "@/utils/websocket-helpers";
import type { IConfig } from "@/utils/storage";
import type { IBoardImages } from "@/utils/board-image-storage";

import { addStyles, removeStyles } from "@/utils";
import { AutodartsToolsGameData } from "@/utils/game-data-storage";
import { AutodartsToolsBoardImages } from "@/utils/board-image-storage";
import { AutodartsToolsConfig } from "@/utils/storage";
import { getUserIdFromToken } from "@/utils/helpers";
import { SELECTORS, qs } from "@/utils/selectors";

/**
 * Darts Zoom — a close-up of where each dart of the current visit landed.
 *
 * The rebuilt site draws its dartboard as four stacked inline SVGs rather than
 * as an image, which is better than what v1 had to work with: a clone of it
 * zooms without going soft, and it carries the site's own hit highlight, so the
 * close-up matches the board on screen exactly. A copy costs well under a
 * millisecond, so each dart gets its own.
 *
 * With a board attached the site shows the camera instead, and the frames it
 * pushes are already captured into board-image storage by the WebSocket
 * handler — that is the "live" mode, and it is the one part of this that needs
 * real hardware. When a frame is missing, or the mode is "image", the cloned
 * SVG board stands in; if even that is gone, the extension's own board.png does.
 *
 * v1 mounted a Vue app and, for the centre position, cloned `#ad-ext-turn` and
 * wrote zoom tiles into its children — a hook the rebuilt site does not emit,
 * around markup it rebuilds on every dart anyway. Everything here lives in
 * `body`, where React never looks.
 */
const HOST_ID = "adt-zoom";
const STYLE_ID = "zoom";
/**
 * The moved action bar gets a sheet of its own. Its `top` is remeasured as the
 * layout shifts, and replacing a stylesheet restarts every animation the sheet
 * declares — so the tile animations must not be in the one being rewritten.
 */
const ACTION_BAR_STYLE_ID = "zoom-action-bar";

/**
 * Where a throw's coordinates sit on the board, as a fraction of its width.
 *
 * The site reports coordinates against the double ring, `1.0` being its outer
 * edge, and draws that ring at 37.778% of the board's width from the middle.
 * Confirmed against three throws — T20, D6 and the bull — which land on this to
 * four decimal places. `+y` is up, so it is subtracted rather than added.
 */
const RING_FRACTION = 0.37778;

/**
 * How hard to zoom for each position, on top of the configured level.
 *
 * The level alone cannot mean the same thing in both: the board copy is as wide
 * as its tile, and the bottom tile is a third of the window while the top one is
 * a few centimetres. The same scale there magnifies four times as much, which
 * left the bottom strip showing barely three segments. Scaled back it shows
 * around two thirds of the board's width, and the top row — which has the space
 * to spare — goes the other way.
 *
 * Never below 1: under that the board would be narrower than the tile and sit in
 * a gap of its own.
 */
const POSITION_ZOOM = { top: 1.25, bottom: 0.5 } as const;

const STYLES = `
  #${HOST_ID} {
    position: fixed;
    z-index: 190;
    display: flex;
    gap: 0.5rem;
    pointer-events: none;
  }

  /* below the throw display, at the width of the tiles themselves */
  #${HOST_ID}[data-position="top"] {
    left: 50%;
    transform: translateX(-50%);
    flex-direction: row;
  }

  #${HOST_ID}[data-position="top"] .adt-zoom-tile {
    width: clamp(5rem, 12vmin, 10rem);
    aspect-ratio: 1;
  }

  /* a strip across the foot of the window, a third of it per dart */
  #${HOST_ID}[data-position="bottom"] {
    left: 0;
    right: 0;
    bottom: 0;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    padding: 0 0.5rem 0.5rem;
  }

  #${HOST_ID}[data-position="bottom"] .adt-zoom-tile {
    width: 100%;
    height: clamp(4.5rem, 14vh, 10rem);
  }

  .adt-zoom-tile {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border-radius: calc(var(--radius, 0.625rem) + 4px);
    background: var(--color-black-90, #01040b);
    box-shadow: 0 0 0 1px rgb(247 248 250 / 15%);
  }

  #${HOST_ID}[data-position="top"] .adt-zoom-tile {
    animation: adt-zoom-fade 300ms ease-out;
  }

  /* the bottom strip rises into place from off the foot of the window */
  #${HOST_ID}[data-position="bottom"] .adt-zoom-tile {
    animation: adt-zoom-rise 320ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  /*
   * The copy of the board, moved so the dart sits in the middle.
   *
   * It is square and as wide as the tile, whatever shape the tile is. In the
   * bottom strip that means it overflows top and bottom and you see a wide band
   * through the board — the dart with the segments either side of it — rather
   * than a squashed board.
   */
  .adt-zoom-view {
    flex: none;
    width: 100%;
    aspect-ratio: 1;
    transform-origin: center;
  }

  .adt-zoom-view > img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .adt-zoom-marker {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 0.6rem;
    height: 0.6rem;
    margin: -0.3rem 0 0 -0.3rem;
    border-radius: 50%;
    border: 1px solid #fff;
    background: rgb(96 165 250 / 80%);
  }

  @keyframes adt-zoom-fade {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  @keyframes adt-zoom-rise {
    from { opacity: 0; transform: translateY(100%); }
    to   { opacity: 1; transform: none; }
  }
`;

/**
 * The bottom strip needs the whole width, and the site puts its undo and Next
 * buttons there. Rather than cover them, the bar is moved to the empty space at
 * the top right — with CSS, so React keeps the element exactly where it thinks
 * it is and every handler on it still works. `w-full` has to go with it, or a
 * fixed element stretches to the viewport instead of to its buttons.
 *
 * The top is measured rather than fixed: the throw display grows with the
 * number of players and can reach most of the way across, at which point a bar
 * pinned near the top of the window would sit on top of it.
 */
function actionBarStyles(top: number): string {
  return `
    ${SELECTORS.match.actionBar[0]} {
      position: fixed !important;
      top: ${top}px !important;
      right: 1rem !important;
      left: auto !important;
      bottom: auto !important;
      width: auto !important;
      min-width: 0 !important;
      margin: 0 !important;
      z-index: 191;
    }
  `;
}


let gameDataWatcherUnwatch: (() => void) | undefined;
let boardImagesWatcherUnwatch: (() => void) | undefined;
let onReposition: (() => void) | null = null;
let host: HTMLElement | null = null;
let actionBarTop = 0;
let config: IConfig["zoom"] | null = null;
let userId: string | null = null;
let boardImages: string[] = [];

export async function zoom() {
  console.log("Autodarts Tools: Darts Zoom");

  const stored = await AutodartsToolsConfig.getValue();
  // The migration narrows this too, but a content script can load before it has
  // run in this browser, and an unknown value must not mean "no layout".
  config = { ...stored.zoom, position: stored.zoom?.position === "top" ? "top" : "bottom" };
  userId = await getUserIdFromToken();

  actionBarTop = 0;
  addStyles(STYLES, STYLE_ID);
  mount();

  // A fresh visit starts with no frames; the handler fills these as the board
  // pushes them.
  boardImages = (await AutodartsToolsBoardImages.getValue()).images ?? [];
  boardImagesWatcherUnwatch?.();
  boardImagesWatcherUnwatch = AutodartsToolsBoardImages.watch(async (value: IBoardImages) => {
    boardImages = value.images ?? [];
    render(await AutodartsToolsGameData.getValue());
  });

  render(await AutodartsToolsGameData.getValue());

  gameDataWatcherUnwatch?.();
  gameDataWatcherUnwatch = AutodartsToolsGameData.watch(render);

  onReposition = () => place();
  window.addEventListener("resize", onReposition);
}

export function zoomOnRemove() {
  console.log("Autodarts Tools: Darts Zoom removed!");

  gameDataWatcherUnwatch?.();
  gameDataWatcherUnwatch = undefined;
  boardImagesWatcherUnwatch?.();
  boardImagesWatcherUnwatch = undefined;

  if (onReposition) {
    window.removeEventListener("resize", onReposition);
    onReposition = null;
  }

  host?.remove();
  host = null;
  config = null;
  boardImages = [];
  actionBarTop = 0;
  removeStyles(STYLE_ID);
  removeStyles(ACTION_BAR_STYLE_ID);
}

function mount(): void {
  document.getElementById(HOST_ID)?.remove();
  host = document.createElement("div");
  host.id = HOST_ID;
  host.setAttribute("data-position", config?.position ?? "bottom-right");
  document.body.appendChild(host);
}

function render(gameData: IGameData): void {
  if (!host || !config) return;

  const throws = visitInProgress(gameData) ?? [];
  if (!throws.length || !shouldShow(gameData)) {
    host.replaceChildren();
    return;
  }

  const board = qs<HTMLElement>(SELECTORS.match.board);

  // A visit that has gone backwards — a correction, or the start of a new one —
  // loses the tiles it no longer has darts for.
  while (host.children.length > throws.length) host.lastElementChild?.remove();

  // Everything else is left exactly as it is. Rebuilding the lot on every update
  // would restart the animation on darts that landed several seconds ago, and
  // would re-clone a board that has moved on since.
  throws.forEach((thrown, index) => {
    const existing = host!.children[index] as HTMLElement | undefined;
    const stamp = stampOf(thrown, index);
    if (existing?.dataset.adtThrow === stamp) return;

    const fresh = tile(thrown, index, board);
    fresh.dataset.adtThrow = stamp;
    if (existing) host!.replaceChild(fresh, existing);
    else host!.appendChild(fresh);
  });

  place();
}

/**
 * What makes a tile out of date: the dart moving, or its camera frame arriving
 * after the tile was already built from the board instead.
 */
function stampOf(thrown: IThrow, index: number): string {
  const source = config?.mode === "live" && boardImages[index] ? "frame" : "board";
  return `${thrown.segment?.name ?? ""}:${thrown.coords?.x ?? 0}:${thrown.coords?.y ?? 0}:${source}`;
}

/**
 * The darts of the visit being thrown right now, if that is what `turns[0]` is.
 *
 * Handing the visit over does not empty it: the finished visit stays at the
 * head of the list until the next dart lands, so a straight read of
 * `turns[0].throws` keeps the last player's darts on screen through the whole
 * of the next player's approach. The turn names its own player, so ask it.
 */
function visitInProgress(gameData: IGameData): IThrow[] | null {
  const match = gameData?.match;
  const turn = match?.turns?.[0] as { throws?: IThrow[]; playerId?: string } | undefined;
  if (!turn) return null;

  const playing = match?.players?.[match.player] as { id?: string } | undefined;
  if (playing?.id && turn.playerId && turn.playerId !== playing.id) return null;

  return turn.throws ?? null;
}

/** One close-up: a board that has been slid so the dart is dead centre. */
function tile(thrown: IThrow, index: number, board: HTMLElement | null): HTMLElement {
  const element = document.createElement("div");
  element.className = "adt-zoom-tile";

  const view = document.createElement("div");
  view.className = "adt-zoom-view";

  const frame = config?.mode === "live" ? boardImages[index] : undefined;
  if (frame) {
    const image = document.createElement("img");
    image.src = frame;
    view.appendChild(image);
  } else if (board) {
    // The site's own board, hit highlight and all. Its children are absolutely
    // positioned against it, so the copy needs its own size back.
    const copy = board.cloneNode(true) as HTMLElement;
    copy.removeAttribute("role");
    copy.removeAttribute("aria-label");
    copy.style.width = "100%";
    copy.style.height = "100%";
    view.appendChild(copy);
  } else {
    const image = document.createElement("img");
    image.src = browser.runtime.getURL("/images/board.png");
    view.appendChild(image);
  }

  const x = thrown.coords?.x ?? 0;
  const y = thrown.coords?.y ?? 0;
  // Translate first, then scale about the middle: the dart ends up where the
  // marker is, magnified. Percentages are of the copy's own box, so this holds
  // at any tile size.
  const scale = Math.max(1, (config?.level ?? 3) * POSITION_ZOOM[config?.position ?? "bottom"]);
  view.style.transform = `scale(${scale}) translate(${-RING_FRACTION * x * 100}%, ${RING_FRACTION * y * 100}%)`;

  element.appendChild(view);
  if (config?.showMarker) {
    const marker = document.createElement("div");
    marker.className = "adt-zoom-marker";
    element.appendChild(marker);
  }
  return element;
}

/**
 * The top strip hangs off the throw display, which moves with the layout; the
 * bottom one is pinned by the stylesheet but has to push the site's buttons out
 * of its way first.
 */
function place(): void {
  if (!host || !config) return;

  host.setAttribute("data-position", config.position);
  const turnBar = qs<HTMLElement>(SELECTORS.match.turnBarPanel)?.getBoundingClientRect();

  if (config.position === "top") {
    host.style.top = `${Math.round((turnBar?.bottom ?? 0) + 8)}px`;
    return;
  }

  host.style.top = "";

  // Clear of the throw display, and never higher than the window's own header.
  const top = Math.round(Math.max(56, (turnBar?.bottom ?? 0) + 8));
  if (top === actionBarTop) return;
  actionBarTop = top;
  addStyles(actionBarStyles(top), ACTION_BAR_STYLE_ID);
}

/** v1's two filters: whose darts to magnify, and whether to bother off a finish. */
function shouldShow(gameData: IGameData): boolean {
  const match = gameData?.match;
  if (!match || !config) return false;

  if (config.zoomOn === "opponents") {
    const playing = match.players?.[match.player];
    if (!playing || !userId || playing.userId === userId) return false;
  }

  if (!config.onlyOnCheckout) return true;

  // A finished leg is worth seeing however it was left.
  const won = (match.gameWinner ?? -1) >= 0 || (match.winner ?? -1) >= 0;
  if (won) return true;

  const state = match.state as {
    checkoutGuide?: unknown[];
    checkoutGuides?: Array<unknown[] | null>;
  } | undefined;
  const route = state?.checkoutGuides?.[match.player] ?? state?.checkoutGuide;

  return Boolean(route?.length) && (match.gameScores?.[match.player] ?? 0) > 0;
}
