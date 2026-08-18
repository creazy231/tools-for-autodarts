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
 * Where a throw's coordinates sit on the board, as a fraction of its width.
 *
 * The site reports coordinates against the double ring, `1.0` being its outer
 * edge, and draws that ring at 37.778% of the board's width from the middle.
 * Confirmed against three throws — T20, D6 and the bull — which land on this to
 * four decimal places. `+y` is up, so it is subtracted rather than added.
 */
const RING_FRACTION = 0.37778;

const STYLES = `
  #${HOST_ID} {
    position: fixed;
    z-index: 190;
    display: flex;
    gap: 0.5rem;
    pointer-events: none;
  }

  #${HOST_ID}[data-position="bottom-right"] { right: 1rem; bottom: 1rem; flex-direction: column; }
  #${HOST_ID}[data-position="bottom-left"]  { left: 1rem;  bottom: 1rem; flex-direction: column; }
  #${HOST_ID}[data-position="center"]       { left: 50%; transform: translateX(-50%); flex-direction: row; }

  .adt-zoom-tile {
    position: relative;
    overflow: hidden;
    width: clamp(5rem, 12vmin, 10rem);
    aspect-ratio: 1;
    border-radius: calc(var(--radius, 0.625rem) + 4px);
    background: var(--color-black-90, #01040b);
    box-shadow: 0 0 0 1px rgb(247 248 250 / 15%);
    animation: adt-zoom-in 300ms ease-out;
  }

  /* the copy of the board, moved so the dart sits in the middle */
  .adt-zoom-view {
    width: 100%;
    height: 100%;
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

  @keyframes adt-zoom-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
`;

let gameDataWatcherUnwatch: (() => void) | undefined;
let boardImagesWatcherUnwatch: (() => void) | undefined;
let onReposition: (() => void) | null = null;
let host: HTMLElement | null = null;
let config: IConfig["zoom"] | null = null;
let userId: string | null = null;
let boardImages: string[] = [];

export async function zoom() {
  console.log("Autodarts Tools: Darts Zoom");

  const stored = await AutodartsToolsConfig.getValue();
  config = stored.zoom;
  userId = await getUserIdFromToken();

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
  removeStyles(STYLE_ID);
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
  host.replaceChildren(...throws.map((thrown, index) => tile(thrown, index, board)));
  place();
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
  view.style.transform = `scale(${config?.level ?? 3}) translate(${-RING_FRACTION * x * 100}%, ${RING_FRACTION * y * 100}%)`;

  element.appendChild(view);
  if (config?.showMarker) {
    const marker = document.createElement("div");
    marker.className = "adt-zoom-marker";
    element.appendChild(marker);
  }
  return element;
}

/**
 * All three positions live along the bottom edge, "centre" included.
 *
 * v1 put the centre row under the throw display. On the rebuilt screen the
 * board starts immediately below that, so a row there covers the top of the
 * board — the part you most want to see when a dart is up by the 20. Centred
 * above the action bar keeps it prominent and clear of the scoring area, and
 * lines it up with the two corner positions.
 */
function place(): void {
  if (!host || !config) return;

  host.setAttribute("data-position", config.position);
  if (config.position !== "center") {
    host.style.bottom = "";
    return;
  }

  const bar = qs<HTMLElement>(SELECTORS.match.actionBar)?.getBoundingClientRect();
  host.style.bottom = bar ? `${Math.round(window.innerHeight - bar.top + 8)}px` : "";
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
