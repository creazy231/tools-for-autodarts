import type { IGameData } from "@/utils/game-data-storage";
import type { IThrow } from "@/utils/websocket-helpers";
import type { IConfig } from "@/utils/storage";

import { addStyles, removeStyles } from "@/utils";
import { AutodartsToolsGameData } from "@/utils/game-data-storage";
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
 * With a board attached the site shows a camera instead, and swaps a fresh
 * picture onto it a moment after each dart is scored. Those pictures are the
 * camera modes, and they are the one part of this that needs real hardware.
 * The picture that follows a dart is copied and kept against that dart's id —
 * see {@link frames} — so a tile can only ever show the frame taken as its own
 * dart landed. When there is no such frame, or the mode is "image", the cloned
 * board stands in; if even that is gone, the extension's own board.png does.
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
 * The same edge in a camera frame, which is smaller. The boards normalise the
 * pictures they send to an older convention that puts the double ring's outer
 * edge at a third of the width — the site's `OLD_RADIUS`, `SIZE / 3`. The site
 * draws its board to `RADIUS`, the 37.778% above, and lays a frame under that
 * drawing by scaling it up by `RADIUS_SCALE`, the ratio of the two (1.1333); see
 * `liveFeedStyle` in its board component. A tile shows the frame as sent, so it
 * has to slide the dart by the smaller fraction — sliding by the larger one
 * carried every dart past the middle by 13% of its distance from the bull — and
 * is scaled up by the same ratio, so a camera tile shows as much board as a
 * drawn one at the same level.
 */
const FRAME_RING_FRACTION = 1 / 3;
const FRAME_SCALE = RING_FRACTION / FRAME_RING_FRACTION;

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
 * How long a picture that arrived before its dart is kept waiting for it.
 *
 * The site swaps the picture onto its board some 70ms after the match state
 * that scores the dart, and that state reaches this script through extension
 * storage, which is a few milliseconds more on a quiet machine and could be
 * longer on a busy one. Should the picture win that race it is held here until
 * the dart shows up. The window is deliberately short: a board is reset, and
 * sends a picture of its empty face, a second or more before the first dart of
 * the visit is scored, and that picture must not be taken for the dart's.
 */
const ORPHAN_TTL = 500;

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

/**
 * Where the site's action bar sits, for the same reason — see
 * {@link actionBarStyles}. Pixels from the top left of the window.
 */
const BAR_X = "--adt-zoom-bar-x";
const BAR_Y = "--adt-zoom-bar-y";
/** Marks the bar mid-drag, which is only worth knowing to change the cursor. */
const DRAGGING_ATTRIBUTE = "data-adt-zoom-dragging";
/**
 * How far the pointer has to travel before a press on the bar is a drag rather
 * than a click.
 *
 * The bar is almost entirely the site's own buttons — undo, Next, the camera —
 * and they have to keep working, so a press is a click until this is passed and
 * the site's handler is only cut out once it is. Small enough that dragging
 * feels immediate, large enough to survive the wobble of a real click.
 */
const DRAG_THRESHOLD = 4;

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
 * The top right is only where it starts. The bar can be dragged anywhere in
 * the window from there — see {@link watchBarDrag} — because what is free space
 * on one screen is the scoreboard on another.
 *
 * Both corners are written through custom properties rather than into the rule
 * itself: a drag moves the bar with every pointer event, and rewriting a
 * `<style>` element that often drops its rules for an instant each time. The
 * properties go on the root element, where React never looks. See
 * {@link BOARD_SCALE} for the same reasoning on the board.
 */
function actionBarStyles(): string {
  return `
    ${SELECTORS.match.actionBar[0]} {
      position: fixed !important;
      left: var(${BAR_X}) !important;
      top: var(${BAR_Y}) !important;
      right: auto !important;
      bottom: auto !important;
      width: auto !important;
      min-width: 0 !important;
      margin: 0 !important;
      z-index: ${LAYERS.zoomTile};
      cursor: grab;
      touch-action: none;
    }

    ${SELECTORS.match.actionBar[0]}[${DRAGGING_ATTRIBUTE}] {
      cursor: grabbing;
      user-select: none;
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
/** The watch kept while the bull-off runs, and nothing else does — see {@link waitForMatch}. */
let bullOffWatcherUnwatch: (() => void) | undefined;
let stopKeepingBoardView: (() => void) | undefined;
let onReposition: (() => void) | null = null;
let layoutObserver: MutationObserver | undefined;
let pictureObserver: MutationObserver | undefined;
let settle: ReturnType<typeof setTimeout> | undefined;
let host: HTMLElement | null = null;
let stopBarWatchers: (() => void) | undefined;
/** True while the pointer is moving the bar, so nothing else repositions it. */
let barDragging = false;
/** The bar's corner as last written, which is what a finished drag saves. */
let barPoint: { x: number; y: number } | null = null;
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
/**
 * The camera picture taken as each dart of the visit landed, as a data URL,
 * keyed on the throw's id.
 *
 * The site subscribes to pictures of the board being thrown at and swaps each
 * one onto its board as it comes — one per dart, some 70ms after the match
 * state that scores it, plus the odd one when a board is reset. That swap is
 * the signal: the picture that appears after a dart is the picture of it, and
 * it is copied here against the dart's id the moment it does. Only the darts of
 * the visit in progress are kept, and only an id can be looked up, so a tile
 * shows the frame of its own dart or nothing at all.
 *
 * This replaced a shared, positional list of the last six pictures that the
 * WebSocket handler had been filling on a timer after every board event, from
 * whichever board the event came. Tile `n` read position `n` of that list, and
 * once six pictures had gathered — two visits in — those were its three oldest,
 * so every tile showed a frame from a visit or two back, and with two boards
 * taking turns usually the other player's board. The site's own blob URL is
 * copied rather than kept because the site revokes it when the next picture
 * arrives, and a tile rebuilt after that — for a correction, say — would come
 * up blank.
 */
const frames = new Map<string, string>();
/**
 * A picture that arrived with no unclaimed dart to belong to, kept for
 * {@link ORPHAN_TTL} in case its dart is still on the way — see there.
 */
let orphan: { picture: string; at: number } | null = null;
/** The `src` of the board's picture as last seen, so only a change is copied. */
let lastPicture: string | null = null;
/** Copies started so far; a copy overtaken by a newer picture is dropped. */
let copies = 0;
/** The match state most recently drawn, which is what a new picture is matched against. */
let latest: IGameData | null = null;
let boardInset = 0;
let config: IConfig["zoom"] | null = null;
let userId: string | null = null;

export async function zoom() {
  console.log("Autodarts Tools: Darts Zoom");

  // Nothing is set up during the bull-off — see waitForMatch.
  if (isBullOff(await AutodartsToolsGameData.getValue())) return waitForMatch();

  await start();
}

/**
 * Stand aside for the bull-off, and start once the match proper does.
 *
 * The bull-off is one dart each at the bull to decide who throws first. A
 * close-up of it says nothing you cannot already see, and the bottom strip
 * reserves its band across the foot of the match area whether or not a dart has
 * landed — so on a screen the strip is never going to draw in, that band is
 * simply missing height. Worse, the two halves of standing down disagreed: the
 * strip gave the band up on every dart of the bull-off and the layout observer
 * put it back a tenth of a second later, so the match area jumped 151px twice
 * per dart. Never starting at all is the whole of the fix — no host, no styles,
 * no observers, and the board is left on whatever view it came up with.
 *
 * Waiting here rather than leaving it to the match being torn down and rebuilt
 * afterwards, which is what index.ts does when the variant changes: that hangs
 * off a watcher only the URL route registers, so a board page that was sitting
 * idle when its match began — the observer's route — would never start Darts
 * Zoom at all.
 */
function waitForMatch(): void {
  console.log("Autodarts Tools: Darts Zoom - standing down until the bull-off is over");

  bullOffWatcherUnwatch?.();
  bullOffWatcherUnwatch = AutodartsToolsGameData.watch((gameData: IGameData) => {
    if (isBullOff(gameData)) return;
    bullOffWatcherUnwatch?.();
    bullOffWatcherUnwatch = undefined;
    void start();
  });
}

/** The bull-off, which is a variant of its own rather than a phase of the match. */
function isBullOff(gameData: IGameData | null): boolean {
  return gameData?.match?.variant === "Bull-off";
}

async function start() {
  const stored = await AutodartsToolsConfig.getValue();
  // The migration narrows this too, but a content script can load before it has
  // run in this browser, and an unknown value must not mean "no layout".
  const position = stored.zoom?.position;
  config = { ...stored.zoom, position: position === "top" || position === "board" ? position : "bottom", mode: viewMode(stored.zoom?.mode) };
  userId = await getUserIdFromToken();

  boardInset = 0;
  barPoint = null;
  zoomed.clear();
  frames.clear();
  orphan = null;
  latest = null;
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

  const root = qs(SELECTORS.app.contentRoot);

  // The tiles of a camera mode are the pictures the site swaps onto its board;
  // the board position zooms that board itself, and the drawn board is cloned,
  // so neither has any use for them.
  pictureObserver?.disconnect();
  pictureObserver = undefined;
  if (config.mode !== "image" && config.position !== "board") watchPictures(root ?? document.body);

  render(await AutodartsToolsGameData.getValue());

  gameDataWatcherUnwatch?.();
  gameDataWatcherUnwatch = AutodartsToolsGameData.watch(render);

  // Only the bottom position moves the bar out of the site's own layout, so it
  // is the only one with anything to drag or to remember.
  stopBarWatchers?.();
  stopBarWatchers = undefined;
  if (config.position === "bottom") {
    const drag = watchBarDrag();
    const setting = watchBarSetting();
    stopBarWatchers = () => {
      drag();
      setting();
    };
  }

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
  if (root) layoutObserver.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: [ "class", "style" ] });
}

export function zoomOnRemove() {
  console.log("Autodarts Tools: Darts Zoom removed!");

  gameDataWatcherUnwatch?.();
  gameDataWatcherUnwatch = undefined;
  bullOffWatcherUnwatch?.();
  bullOffWatcherUnwatch = undefined;

  if (onReposition) {
    window.removeEventListener("resize", onReposition);
    onReposition = null;
  }
  layoutObserver?.disconnect();
  layoutObserver = undefined;
  pictureObserver?.disconnect();
  pictureObserver = undefined;
  if (settle) clearTimeout(settle);
  settle = undefined;
  stopKeepingBoardView?.();
  stopKeepingBoardView = undefined;
  stopBarWatchers?.();
  stopBarWatchers = undefined;

  releaseBoard();
  host?.remove();
  host = null;
  config = null;
  frames.clear();
  orphan = null;
  lastPicture = null;
  latest = null;
  zoomed.clear();
  boardInset = 0;
  barPoint = null;
  document.documentElement.style.removeProperty(BAR_X);
  document.documentElement.style.removeProperty(BAR_Y);
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
  latest = gameData;
  if (!host || !config) return;

  // A bull-off normally means this never started at all — see waitForMatch —
  // but it can also arrive under a strip that is already up, when what was on
  // screen at startup turned out not to be the match being played. Standing
  // down is then the same thing done late.
  if (isBullOff(gameData)) return sleep();

  const throws = visitInProgress(gameData) ?? [];
  reconcileFrames(throws);
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
    const stamp = stampOf(thrown);
    if (existing?.dataset.adtThrow === stamp) return;

    // The same dart, handed its picture or moved by a correction: only what the
    // tile shows changes. The tile itself stays, so a picture landing a tenth
    // of a second after the dart does not run its entrance a second time.
    if (existing?.dataset.adtId === thrown.id) {
      existing.querySelector(".adt-zoom-view")?.replaceWith(view(thrown, board));
      existing.dataset.adtThrow = stamp;
      return;
    }

    const fresh = tile(thrown, board);
    fresh.dataset.adtThrow = stamp;
    fresh.dataset.adtId = thrown.id;
    if (existing) host!.replaceChild(fresh, existing);
    else host!.appendChild(fresh);
  });

  place();
}

/**
 * Everything off, and nothing reserved: no tiles, no board hold, and none of
 * the room the strip normally takes out of the layout.
 *
 * The measurement is pushed off its real value rather than to zero, because
 * {@link place} skips its work when nothing has changed and would otherwise
 * never put the layout rules back.
 */
function sleep(): void {
  host?.replaceChildren();
  releaseBoard();
  frames.clear();
  orphan = null;
  boardInset = -1;
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
function stampOf(thrown: IThrow): string {
  const source = config?.mode !== "image" && frames.has(thrown.id) ? "frame" : "board";
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
function visitInProgress(gameData: IGameData | null): IThrow[] | null {
  const match = gameData?.match;
  const turn = match?.turns?.[0] as { throws?: IThrow[]; playerId?: string } | undefined;
  if (!turn) return null;

  const playing = match?.players?.[match.player] as { id?: string } | undefined;
  if (playing?.id && turn.playerId && turn.playerId !== playing.id) return null;

  return turn.throws ?? null;
}

/**
 * The picture the site is showing on its board, when a camera is up. Found
 * inside the board first; the blob it is drawn from is the fallback, and the
 * only one on the match screen.
 */
function boardPicture(): HTMLImageElement | null {
  return qs<HTMLElement>(SELECTORS.match.board)?.querySelector("img")
    ?? document.querySelector<HTMLImageElement>("img[src^='blob:']");
}

/**
 * Copy each new picture the site puts on its board, as it does so.
 *
 * The site replaces the picture's `src` rather than the element, and does so
 * inside the app root along with every other redraw, so one observer there
 * sees it; anything that is not a change of picture costs a `querySelector`.
 * The picture up when this starts is not copied: nothing has landed since it
 * was taken, and a dart already on the board gets the clone of that board.
 */
function watchPictures(root: Node): void {
  lastPicture = boardPicture()?.src ?? null;
  pictureObserver = new MutationObserver(() => {
    const src = boardPicture()?.src ?? null;
    if (src === lastPicture) return;
    lastPicture = src;
    if (src) void keepPicture(src);
  });
  pictureObserver.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: [ "src" ] });
}

/**
 * Copy a picture and give it to the dart it followed.
 *
 * The dart is the newest of the visit in progress that has no picture yet: the
 * site swaps the picture in after the match state that scores the dart, so by
 * the time it does the dart is normally already in {@link latest}. Should the
 * picture come first — see {@link ORPHAN_TTL} — it waits for the dart there;
 * and a picture with no dart to claim it, such as a reset board's, is dropped
 * once that has passed. Copying is asynchronous, so a copy the next picture has
 * already overtaken is dropped too: the dart is in the newer one.
 */
async function keepPicture(src: string): Promise<void> {
  const copy = ++copies;
  let picture: string;
  try {
    picture = await encode(src);
  } catch (error) {
    console.warn("Autodarts Tools: Darts Zoom - could not copy the board's picture", error);
    return;
  }
  if (copy !== copies) return;

  const throws = visitInProgress(latest) ?? [];
  const newest = throws[throws.length - 1];
  if (newest && !frames.has(newest.id)) {
    frames.set(newest.id, picture);
    orphan = null;
    if (latest) render(latest);
  } else {
    orphan = { picture, at: Date.now() };
  }
}

/** The bytes behind a blob URL as a data URL, which nothing can revoke. */
async function encode(src: string): Promise<string> {
  const blob = await (await fetch(src)).blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Keep only the frames of the darts on screen, and give a waiting picture to
 * the dart that has just arrived for it, if one has and it is still fresh.
 */
function reconcileFrames(throws: IThrow[]): void {
  const ids = new Set(throws.map(thrown => thrown.id));
  for (const id of frames.keys()) if (!ids.has(id)) frames.delete(id);

  if (!orphan) return;
  const newest = throws[throws.length - 1];
  const fresh = Date.now() - orphan.at <= ORPHAN_TTL;
  if (newest && !frames.has(newest.id) && fresh) frames.set(newest.id, orphan.picture);
  // Claimed, stale, or beaten to its dart by a picture that came the right way
  // round — whichever it was, it is nobody's now.
  if (!fresh || (newest && frames.has(newest.id))) orphan = null;
}

/** One close-up: a board that has been slid so the dart is dead centre. */
function tile(thrown: IThrow, board: HTMLElement | null): HTMLElement {
  const element = document.createElement("div");
  element.className = "adt-zoom-tile";
  element.appendChild(view(thrown, board));
  if (config?.showMarker) {
    const marker = document.createElement("div");
    marker.className = "adt-zoom-marker";
    element.appendChild(marker);
  }
  return element;
}

/** What a tile shows: the dart's own frame, or a board, moved so the dart is in the middle. */
function view(thrown: IThrow, board: HTMLElement | null): HTMLElement {
  const box = document.createElement("div");
  box.className = "adt-zoom-view";

  const frame = config?.mode !== "image" ? frames.get(thrown.id) : undefined;
  if (frame) {
    const image = document.createElement("img");
    image.src = frame;
    box.appendChild(image);
  } else if (board) {
    // The site's own board, hit highlight and all. Its children are absolutely
    // positioned against it, so the copy needs its own size back.
    const copy = board.cloneNode(true) as HTMLElement;
    copy.removeAttribute("role");
    copy.removeAttribute("aria-label");
    copy.style.width = "100%";
    copy.style.height = "100%";
    box.appendChild(copy);
  } else {
    const image = document.createElement("img");
    image.src = browser.runtime.getURL("/images/board.png");
    box.appendChild(image);
  }

  const x = thrown.coords?.x ?? 0;
  const y = thrown.coords?.y ?? 0;
  // Translate first, then scale about the middle: the dart ends up where the
  // marker is, magnified. Percentages are of the copy's own box, so this holds
  // at any tile size. A frame is a smaller board in the same box, so it slides
  // by its own fraction and is scaled up to match — see FRAME_RING_FRACTION.
  const level = Math.max(1, (config?.level ?? 3) * POSITION_ZOOM[config?.position ?? "bottom"]);
  const ring = frame ? FRAME_RING_FRACTION : RING_FRACTION;
  const scale = frame ? level * FRAME_SCALE : level;
  box.style.transform = `scale(${scale}) translate(${-ring * x * 100}%, ${ring * y * 100}%)`;

  return box;
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

  // The other way into the layout rules, and the one that used to undo standing
  // down: sleep() gives the strip's room back, and the redraw that follows is a
  // mutation, so a tenth of a second later this measured the empty strip and
  // took the room straight back again.
  if (isBullOff(latest)) return;

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

  if (clearance !== boardInset) {
    boardInset = clearance;
    const rules = config.position === "top"
      ? [ boardRoomStyles(clearance) ]
      : [ matchAreaStyles(clearance), actionBarStyles() ];
    addStyles(rules.join("\n"), LAYOUT_STYLE_ID);
  }

  // After the rules rather than with them: the bar has to be out of the flow
  // before it measures as its buttons rather than as the width of the screen.
  // Every pass, because this is also what pulls a corner saved on a wider
  // window back into a narrower one — place() already runs on a resize.
  if (config.position === "bottom") placeActionBar(turnBar);
}

/**
 * Put the action bar where it belongs: where it was last dragged to, or the
 * corner the bottom strip moves it to until it has been dragged anywhere.
 */
function placeActionBar(turnBar?: DOMRect): void {
  if (barDragging) return;

  const bar = qs<HTMLElement>(SELECTORS.match.actionBar);
  if (!bar) return;

  const { width, height } = bar.getBoundingClientRect();
  // Clear of the throw display, and never higher than the window's own header:
  // the display grows with the player count and can reach most of the way
  // across, at which point a bar pinned near the top would sit on top of it.
  const corner = { x: window.innerWidth - width - 16, y: Math.max(56, (turnBar?.bottom ?? 0) + 8) };
  moveActionBar(config?.actionBarPosition ?? corner, width, height);
}

/**
 * Let the bar be dragged anywhere in the window, and remember where.
 *
 * The listeners are on the document, not on the bar: the bar is React's and is
 * rebuilt on every redraw, so anything attached to the element itself would not
 * last a turn.
 *
 * A press is a click until the pointer has travelled {@link DRAG_THRESHOLD} —
 * the bar is almost entirely the site's own buttons, and undo and Next have to
 * go on working. Once it has, the bar follows the pointer, and the click that
 * ends the press is swallowed so a drag that finishes over Next does not press
 * it. The pointer is captured on the root element rather than on the bar for
 * the same reason as the listeners: a redraw mid-drag would drop the capture.
 */
function watchBarDrag(): () => void {
  let bar: HTMLElement | null = null;
  let pointer = -1;
  let startX = 0;
  let startY = 0;
  let offsetX = 0;
  let offsetY = 0;
  let width = 0;
  let height = 0;
  let swallowClick = false;

  const finish = () => {
    bar?.removeAttribute(DRAGGING_ATTRIBUTE);
    try {
      document.documentElement.releasePointerCapture(pointer);
    } catch {}
    bar = null;
    pointer = -1;
    barDragging = false;
  };

  const onPointerDown = (event: PointerEvent) => {
    // Whatever the last press left armed, this one is a fresh click.
    swallowClick = false;
    if (bar || event.button !== 0 || !config) return;
    // Only the bottom position moves the bar, and it lets go of it entirely
    // while it is standing down for a bull-off.
    if (config.position !== "bottom" || isBullOff(latest)) return;

    const found = qs<HTMLElement>(SELECTORS.match.actionBar);
    if (!found || !(event.target instanceof Node) || !found.contains(event.target)) return;

    const box = found.getBoundingClientRect();
    bar = found;
    pointer = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    offsetX = event.clientX - box.left;
    offsetY = event.clientY - box.top;
    width = box.width;
    height = box.height;
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!bar || event.pointerId !== pointer) return;

    if (!barDragging) {
      if (Math.abs(event.clientX - startX) < DRAG_THRESHOLD && Math.abs(event.clientY - startY) < DRAG_THRESHOLD) return;
      barDragging = true;
      bar.setAttribute(DRAGGING_ATTRIBUTE, "");
      try {
        document.documentElement.setPointerCapture(pointer);
      } catch {}
    }

    moveActionBar({ x: event.clientX - offsetX, y: event.clientY - offsetY }, width, height);
    event.preventDefault();
  };

  const onPointerUp = (event: PointerEvent) => {
    if (!bar || event.pointerId !== pointer) return;
    const dragged = barDragging;
    const point = barPoint;
    finish();
    if (!dragged || !point) return;

    swallowClick = true;
    void saveBarPosition(point);
  };

  const onClick = (event: MouseEvent) => {
    if (!swallowClick) return;
    swallowClick = false;
    event.stopPropagation();
    event.preventDefault();
  };

  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("pointermove", onPointerMove, true);
  document.addEventListener("pointerup", onPointerUp, true);
  document.addEventListener("pointercancel", onPointerUp, true);
  document.addEventListener("click", onClick, true);

  return () => {
    if (bar) finish();
    document.removeEventListener("pointerdown", onPointerDown, true);
    document.removeEventListener("pointermove", onPointerMove, true);
    document.removeEventListener("pointerup", onPointerUp, true);
    document.removeEventListener("pointercancel", onPointerUp, true);
    document.removeEventListener("click", onClick, true);
  };
}

/**
 * Follow the one setting that can change under a running match.
 *
 * Everything else this feature reads is fixed when it starts, but the settings
 * panel's *Reset bar position* has to reach a match already in progress —
 * otherwise the button appears to do nothing until the page is reloaded. A drag
 * writes the same value, so an unchanged point is ignored rather than replacing
 * the bar on top of itself.
 */
function watchBarSetting(): () => void {
  return AutodartsToolsConfig.watch((next: IConfig) => {
    if (!config || config.position !== "bottom") return;
    const saved = next.zoom?.actionBarPosition ?? null;
    const mine = config.actionBarPosition ?? null;
    if (saved?.x === mine?.x && saved?.y === mine?.y) return;
    config.actionBarPosition = saved;
    place();
  });
}

/**
 * Keep where the bar was dropped, both in storage and on the copy of the
 * settings this run is working from — without the second, the next place()
 * would read the old value and put the bar straight back.
 */
async function saveBarPosition(point: { x: number; y: number }): Promise<void> {
  if (config) config.actionBarPosition = point;
  try {
    const stored = await AutodartsToolsConfig.getValue();
    await AutodartsToolsConfig.setValue({ ...stored, zoom: { ...stored.zoom, actionBarPosition: point } });
  } catch (error) {
    console.warn("Autodarts Tools: Darts Zoom - could not save where the action bar was dropped", error);
  }
}

/** Write a corner to the properties the rule reads, with the bar kept on screen. */
function moveActionBar(point: { x: number; y: number }, width: number, height: number): void {
  const x = Math.min(Math.max(0, point.x), Math.max(0, window.innerWidth - width));
  const y = Math.min(Math.max(0, point.y), Math.max(0, window.innerHeight - height));

  barPoint = { x, y };
  const root = document.documentElement.style;
  root.setProperty(BAR_X, `${Math.round(x)}px`);
  root.setProperty(BAR_Y, `${Math.round(y)}px`);
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
