import type { IGameData } from "@/utils/game-data-storage";
import type { IThrow } from "@/utils/websocket-helpers";
import type { IConfig } from "@/utils/storage";
import type { IBoardImages } from "@/utils/board-image-storage";

import { addStyles, removeStyles } from "@/utils";
import { AutodartsToolsGameData } from "@/utils/game-data-storage";
import { AutodartsToolsBoardImages } from "@/utils/board-image-storage";
import { AutodartsToolsConfig } from "@/utils/storage";
import { getUserIdFromToken } from "@/utils/helpers";
import { keepBoardView } from "./board-view";
import type { BoardView } from "./board-view";
import { SELECTORS, qs } from "@/utils/selectors";
import { LAYERS } from "@/utils/layers";

/**
 * Darts Zoom — a close-up of where each dart of the current visit landed.
 *
 * The rebuilt site draws its dartboard as four stacked inline SVGs rather than
 * as an image, which is better than what v1 had to work with: a clone of it
 * zooms without going soft, and it carries the site's own hit highlight, so the
 * close-up matches the board on screen exactly. A copy costs well under a
 * millisecond, so each dart gets its own.
 *
 * With a board attached the site shows a camera instead, and the picture it is
 * showing as each dart lands is already captured into board-image storage by
 * the WebSocket handler — those are the camera modes, and they are the one part
 * of this that needs real hardware. When a frame is missing, or the mode is
 * "image", the cloned SVG board stands in; if even that is gone, the
 * extension's own board.png does.
 *
 * The mode is the same choice Board View offers — camera 1, 2, 3 or the drawn
 * board — because it decides what the board itself shows: the frames are taken
 * off whatever picture is up, so the board has to be on the camera you asked
 * for. See board-view.ts, which presses the site's own button until it is.
 *
 * v1 mounted a Vue app and, for the centre position, cloned `#ad-ext-turn` and
 * wrote zoom tiles into its children — a hook the rebuilt site does not emit,
 * around markup it rebuilds on every dart anyway. Everything here lives in
 * `body`, where React never looks.
 */
const HOST_ID = "adt-zoom";
const STYLE_ID = "zoom";
/**
 * Whatever has to be remeasured as the layout shifts goes in a sheet of its own.
 * Replacing a stylesheet restarts every animation it declares, so the tile
 * animations must not be in the one being rewritten.
 */
const LAYOUT_STYLE_ID = "zoom-layout";

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
 * The level alone cannot mean the same thing everywhere: the board copy is as
 * wide as its tile, so the same scale magnifies in proportion to the tile. The
 * bottom strip is a third of the window per dart, where the level as written
 * showed barely three segments; scaled back it shows around two thirds of the
 * board's width. The top strip is a third of the throw display per dart — about
 * a third of that — and the level is taken as it is, which shows a third of the
 * board.
 *
 * Never below 1: under that the board would be narrower than the tile and sit in
 * a gap of its own.
 */
const POSITION_ZOOM = { top: 1, bottom: 0.5, board: 1 } as const;

/**
 * The board position moves the board with the `scale` and `translate`
 * properties rather than with `transform`, because the site already uses
 * `transform` on one of the board's own layers — writing there would either
 * lose to it or, with `!important`, wipe it out. These compose with whatever
 * the site has instead of replacing it.
 *
 * They are pushed through custom properties on the root element: rewriting a
 * `<style>` element drops the rule for an instant, which cancels the transition
 * and makes the board snap back before it moves, and a variable on the root is
 * somewhere React never looks.
 */
const BOARD_SCALE = "--adt-zoom-board-scale";
const BOARD_TRANSLATE = "--adt-zoom-board-translate";

const STYLES = `
  #${HOST_ID} {
    position: fixed;
    z-index: ${LAYERS.zoom};
    display: flex;
    gap: 0.5rem;
    pointer-events: none;
  }

  /*
   * Below the throw display and as wide as it is, a third of it per dart — the
   * same band through the board as the bottom strip, sized for the oche rather
   * than the desk. It began as a row of squares a few centimetres across, which
   * reads as three small tiles you cannot make out from where you throw. The
   * left and width are measured off the throw display in place(); these are the
   * fallbacks for a screen without one.
   */
  #${HOST_ID}[data-position="top"] {
    left: 20vw;
    width: 60vw;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    min-height: clamp(4.5rem, 14vh, 10rem);
  }

  #${HOST_ID}[data-position="top"] .adt-zoom-tile {
    width: 100%;
    height: clamp(4.5rem, 14vh, 10rem);
  }

  /* a strip across the foot of the window, a third of it per dart */
  #${HOST_ID}[data-position="bottom"] {
    left: 0;
    right: 0;
    bottom: 0;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    padding: 0 0.5rem 0.5rem;
    box-sizing: border-box;
    min-height: calc(clamp(4.5rem, 14vh, 10rem) + 0.5rem);
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
 * Room for the bottom strip, taken out of the whole match area.
 *
 * The strip spans the window, so everything has to end above it — not just the
 * board. In the narrow landscape layout the player's panel is a full-height
 * column down the left, which shrinking the board alone left half-covered.
 * `main` is `overflow-hidden` with `h-full` children, so padding its foot takes
 * the lot with it. Its top is not touched: the throw display lives in there and
 * the top strip is positioned off it, which would chase its own tail.
 *
 * Taking the room is not free. The widest layout centres a side's player cards
 * in a column of their own, and centring splits any overflow evenly above and
 * below — where `main` clips it. Shrinking that column by the strip's height
 * therefore lifts its contents by half of it, and once the cards no longer fit,
 * what leaves at the top is the panel the site draws over the winning card:
 * the Next Leg and Next Set buttons, and there is no other way to start the
 * next leg. Six players in a short window was enough — the button sat 51px
 * above the window with the strip up and on screen without it.
 *
 * `safe` centring is the whole of the fix, and it is the site's own alignment
 * either way: it centres exactly as before for as long as the cards fit, and
 * falls back to the top edge the moment they do not, so what the site draws
 * over the first card of a side cannot be pushed up out of reach. A column
 * that was not already overflowing is left exactly as it was.
 */
function matchAreaStyles(clearance: number): string {
  return `
    ${SELECTORS.app.contentRoot[0]} {
      padding-bottom: ${clearance}px !important;
    }

    ${SELECTORS.match.playerColumn[0]} {
      justify-content: safe center !important;
    }
  `;
}

/**
 * Room for the top strip, taken out of the board.
 *
 * Only the board is in the way up there — the panels are beside it or above it
 * in every layout. The board is sized from a box pinned with `inset: 0`, so
 * pulling its top edge down shrinks the board and moves it clear. Its own child,
 * the flex box that centres the board, will not do: shrink that and the square
 * overflows it, moving without getting smaller.
 */
function boardRoomStyles(clearance: number): string {
  return `
    ${SELECTORS.match.boardStage[0]} {
      top: ${clearance}px !important;
    }
  `;
}

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
      z-index: ${LAYERS.zoomTile};
    }
  `;
}

/**
 * The board's own contents, zoomed inside the circle it is already clipped to.
 * Its children are the layers — four SVGs, or the camera view when a board is
 * attached — all pinned to the same box, so one rule moves them together.
 */
const BOARD_STYLES = `
  ${SELECTORS.match.board[0]} > * {
    scale: var(${BOARD_SCALE}, 1);
    translate: var(${BOARD_TRANSLATE}, 0 0);
    transform-origin: center;
    transition: scale 400ms ease, translate 400ms ease;
  }
`;

let gameDataWatcherUnwatch: (() => void) | undefined;
let boardImagesWatcherUnwatch: (() => void) | undefined;
let stopKeepingBoardView: (() => void) | undefined;
let onReposition: (() => void) | null = null;
let layoutObserver: MutationObserver | undefined;
let settle: ReturnType<typeof setTimeout> | undefined;
let host: HTMLElement | null = null;
let actionBarTop = 0;
let resetTimer: ReturnType<typeof setTimeout> | undefined;
/**
 * Every dart the board has already zoomed in on, so that none of them can be
 * zoomed in on twice.
 *
 * Keyed on the throw's own id, which is the one thing a correction leaves
 * alone: editing a dart rewrites its `segment` and its `coords`, and hands
 * every throw of the visit a fresh `createdAt`, but the id it landed with
 * stays. Anything read off where the dart is would therefore take a correction
 * for a new dart and zoom in on it all over again — and `activated`, which is
 * how the rest of the features know an edit when they see one, is no help
 * here: the corrected match arrives *after* it has gone back to -1.
 *
 * It is also what stops a redraw restarting the hold. The board lets go on a
 * timer, so without this any later update — a takeout, the other player's
 * board, a bot working through its visit — would zoom back in on a dart thrown
 * seconds ago.
 *
 * Ids are unique for the life of a match, so nothing leaves here until the
 * feature is torn down.
 */
const zoomed = new Set<string>();
let boardInset = 0;
let config: IConfig["zoom"] | null = null;
let userId: string | null = null;
let boardImages: string[] = [];

export async function zoom() {
  console.log("Autodarts Tools: Darts Zoom");

  const stored = await AutodartsToolsConfig.getValue();
  // The migration narrows this too, but a content script can load before it has
  // run in this browser, and an unknown value must not mean "no layout".
  const position = stored.zoom?.position;
  config = { ...stored.zoom, position: position === "top" || position === "board" ? position : "bottom", mode: viewMode(stored.zoom?.mode) };
  userId = await getUserIdFromToken();

  actionBarTop = 0;
  boardInset = 0;
  zoomed.clear();
  addStyles(config.position === "board" ? `${STYLES}\n${BOARD_STYLES}` : STYLES, STYLE_ID);
  mount();

  // The close-ups come from whatever the board is showing, so put it on the
  // right thing — and keep it there, since the site forgets the view on its
  // own — unless Board View is switched on, in which case that has already
  // chosen and the two must not press the same button in turn.
  stopKeepingBoardView?.();
  if (!stored.boardView?.enabled) {
    console.log(`Autodarts Tools: Darts Zoom - keeping the board on ${config.mode}`);
    stopKeepingBoardView = keepBoardView(config.mode);
  }

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

  // A resize is not the end of it: the site picks its layout from the new width
  // and redraws after the event, so what place() measured then is where the
  // throw display *was*. It moving is a mutation under the app root, as is
  // anything else that shifts it, so the strip follows it from here — the
  // callback is one measurement, once the redraw has settled.
  layoutObserver?.disconnect();
  layoutObserver = new MutationObserver(() => {
    if (settle) clearTimeout(settle);
    settle = setTimeout(() => {
      settle = undefined;
      place();
    }, 100);
  });
  const root = qs(SELECTORS.app.contentRoot);
  if (root) layoutObserver.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: [ "class", "style" ] });
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
  layoutObserver?.disconnect();
  layoutObserver = undefined;
  if (settle) clearTimeout(settle);
  settle = undefined;
  stopKeepingBoardView?.();
  stopKeepingBoardView = undefined;

  releaseBoard();
  host?.remove();
  host = null;
  config = null;
  boardImages = [];
  zoomed.clear();
  actionBarTop = 0;
  boardInset = 0;
  removeStyles(STYLE_ID);
  removeStyles(LAYOUT_STYLE_ID);
}

/**
 * The saved view mode, narrowed to what the board can show.
 *
 * The migration narrows this too, but a content script can load before it has
 * run in this browser. "live" is what the mode used to be called before it
 * chose a camera; it meant whichever camera came up first, which is camera 1.
 */
function viewMode(saved: unknown): Exclude<BoardView, "live"> {
  if (saved === "image" || saved === "camera-1" || saved === "camera-2" || saved === "camera-3") return saved;
  return "camera-1";
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

  // The bull-off is one dart each at the bull to decide who throws first. A
  // close-up of it says nothing you cannot already see, and the strip would
  // take room out of a screen that is about to be torn down and rebuilt for the
  // match proper — so the feature stands down entirely until that happens.
  if (gameData?.match?.variant === "Bull-off") return sleep();

  const throws = visitInProgress(gameData) ?? [];
  const showing = Boolean(throws.length) && shouldShow(gameData);

  if (config.position === "board") return holdBoardOn(showing ? throws[throws.length - 1] : null);

  if (!showing) {
    host.replaceChildren();
    place();
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
 * Everything off, and nothing reserved: no tiles, no board hold, and none of
 * the room the strip normally takes out of the layout.
 *
 * The two measurements are pushed off their real values rather than to zero,
 * because {@link place} skips its work when nothing has changed and would
 * otherwise never put the layout rules back.
 */
function sleep(): void {
  host?.replaceChildren();
  releaseBoard();
  boardInset = -1;
  actionBarTop = -1;
  removeStyles(LAYOUT_STYLE_ID);
}

/**
 * Hold the site's own board on the dart that just landed, then let it go.
 *
 * It lets go on a timer — the visit is usually still in progress and you want
 * the whole board back to throw at — and immediately when the visit ends or
 * passes to someone else, which is what `null` means here.
 *
 * Only a dart that has just been thrown gets a hold; see {@link zoomed} for
 * what that rules out. Correcting the dart the board is already held on is
 * left to run its timer out rather than snatched back early — the hold is a
 * second at its default, and the board pulling out from under a correction
 * would read as the feature reacting to it.
 */
function holdBoardOn(thrown: IThrow | null): void {
  if (!thrown) return releaseBoard();
  if (zoomed.has(thrown.id)) return;
  zoomed.add(thrown.id);

  clearTimeout(resetTimer);
  resetTimer = undefined;

  const scale = Math.max(1, (config?.level ?? 3) * POSITION_ZOOM.board);
  const x = thrown.coords?.x ?? 0;
  const y = thrown.coords?.y ?? 0;

  // `translate` lands outside the scale rather than inside it, so the offset
  // has to carry the scale itself — otherwise the dart stops short of the middle
  // by exactly that factor.
  const root = document.documentElement.style;
  root.setProperty(BOARD_SCALE, String(scale));
  root.setProperty(BOARD_TRANSLATE, `${-scale * RING_FRACTION * x * 100}% ${scale * RING_FRACTION * y * 100}%`);

  const hold = config?.resetAfterMs ?? 1000;
  if (hold > 0) resetTimer = setTimeout(releaseBoard, hold);
}

function releaseBoard(): void {
  clearTimeout(resetTimer);
  resetTimer = undefined;
  document.documentElement.style.removeProperty(BOARD_SCALE);
  document.documentElement.style.removeProperty(BOARD_TRANSLATE);
}

/**
 * What makes a tile out of date: the dart moving, or its camera frame arriving
 * after the tile was already built from the board instead.
 */
function stampOf(thrown: IThrow, index: number): string {
  const source = config?.mode !== "image" && boardImages[index] ? "frame" : "board";
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

  const frame = config?.mode !== "image" ? boardImages[index] : undefined;
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
 * Everything that depends on where things currently are: the top strip hangs
 * off the throw display and takes its width, the board gives up the room the
 * strip needs, and in the bottom layout the site's buttons move out of the
 * strip's way.
 *
 * Nothing here is measured against something this then moves. The strip's own
 * height is reserved by the stylesheet whether or not a dart has landed, the
 * throw display is unaffected by either rule below, and the bottom strip is the
 * size of the window.
 */
function place(): void {
  if (!host || !config) return;

  host.setAttribute("data-position", config.position);
  if (config.position === "board") return;

  const turnBar = qs<HTMLElement>(SELECTORS.match.turnBarPanel)?.getBoundingClientRect();
  if (config.position === "top") {
    host.style.top = `${Math.round((turnBar?.bottom ?? 0) + 8)}px`;
    host.style.left = turnBar ? `${Math.round(turnBar.left)}px` : "";
    host.style.width = turnBar ? `${Math.round(turnBar.width)}px` : "";
  } else {
    host.style.top = "";
    host.style.left = "";
    host.style.width = "";
  }

  const strip = host.getBoundingClientRect();
  const clearance = Math.round(strip.height + 8);

  // Clear of the throw display, and never higher than the window's own header.
  const top = config.position === "bottom" ? Math.round(Math.max(56, (turnBar?.bottom ?? 0) + 8)) : 0;

  if (clearance === boardInset && top === actionBarTop) return;
  boardInset = clearance;
  actionBarTop = top;

  const rules = config.position === "top"
    ? [ boardRoomStyles(clearance) ]
    : [ matchAreaStyles(clearance), actionBarStyles(top) ];
  addStyles(rules.join("\n"), LAYOUT_STYLE_ID);
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
