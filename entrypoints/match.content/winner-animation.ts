import type { IConfig } from "@/utils/storage";
import type { IGameData } from "@/utils/game-data-storage";

import { addStyles, removeStyles } from "@/utils";
import { AutodartsToolsGameData, GameMode } from "@/utils/game-data-storage";
import { AutodartsToolsConfig } from "@/utils/storage";
import { SELECTORS, qs, qsa } from "@/utils/selectors";

/**
 * Winner Animation — mark the winning card and say what it took.
 *
 * v1 restructured the card: it wrapped the score element in a div of its own,
 * shrank it and appended a message element. None of that survives on the
 * rebuilt site, which re-renders the card from React state.
 *
 * So the whole effect is CSS keyed on one attribute. The attribute is the only
 * thing JS writes, and a MutationObserver puts it back if a re-render drops it;
 * the ring and the darts-thrown note are generated content, which React cannot
 * clear because it never sees it.
 *
 * The attribute goes on the card body rather than the player column. The column
 * is stretched to the height of the whole row and centres the card inside it,
 * so a ring drawn on the column stood a good 160px clear of the card at the top
 * and the bottom, and the caption floated near the top of the window.
 *
 * There are two treatments, because the match screen has three layouts. Wide
 * enough for columns either side of the board, the card floats clear of
 * everything and the ring is drawn around it with the caption above. Narrower —
 * a 320px sidebar of stacked cards, or a bar of cards across the top, which is
 * what every tablet and phone gets — the card is flush against the window
 * inside a parent that clips, so an outset ring loses two of its edges and
 * there is no room above for the caption at all. There the ring is drawn just
 * inside the card's own edge and the caption is dropped: the card is dense at
 * that size and anything else would land on top of the score.
 */
const WINNER_FLAG = "data-adt-winner";
const MESSAGE_ATTR = "data-adt-winner-message";
const STYLE_ID = "winner-animation";

/**
 * How much clear space above the card the caption needs before it is worth
 * drawing — its largest size plus its margin, rounded up.
 */
const CAPTION_HEADROOM = 48;

let gameDataWatcherUnwatch: (() => void) | undefined;
let reapplyObserver: MutationObserver | null = null;
let resizeHandler: (() => void) | undefined;

const STYLES = `
  [${WINNER_FLAG}] {
    position: relative;
    isolation: isolate;
  }

  /* the animated ring */
  [${WINNER_FLAG}]::before {
    content: "";
    position: absolute;
    border-radius: inherit;
    background: linear-gradient(45deg, #fb0094, #00f, #0f0, #ff0, #f00, #fb0094, #00f, #0f0, #ff0, #f00);
    background-size: 400%;
    animation: adt-winner-steam 20s linear infinite;
  }

  /* wide: the card has room around it, so the ring goes around the outside */
  [${WINNER_FLAG}="wide"] {
    border-radius: 1rem;
  }

  [${WINNER_FLAG}="wide"]::before {
    inset: -3px;
    z-index: -1;
  }

  /*
   * Compact: drawn inside the card's own edge, masked to a 3px band so the card
   * shows through the middle, and stacked above the card's artwork — which is
   * painted over the top of it otherwise. No border-radius of ours here: the
   * site squares these corners off, and rounding them would reshape its card.
   */
  [${WINNER_FLAG}="compact"]::before {
    inset: 0;
    z-index: 10;
    padding: 3px;
    pointer-events: none;
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
  }

  /* what the leg was worth — the rebuilt site says "GAME SHOT" itself */
  [${WINNER_FLAG}="wide"]::after {
    content: attr(${MESSAGE_ATTR});
    position: absolute;
    inset-inline: 0;
    bottom: 100%;
    margin-bottom: 0.5rem;
    text-align: center;
    white-space: pre-line;
    font-family: var(--ad-font-display, inherit);
    font-size: clamp(1.25rem, 2.5cqmin, 2rem);
    font-weight: 800;
    line-height: 1.15;
    text-transform: uppercase;
    color: #fff;
    text-shadow: 0 2px 8px rgb(0 0 0 / 80%);
    pointer-events: none;
  }

  @keyframes adt-winner-steam {
    0%   { background-position: 0 0; }
    50%  { background-position: 400% 0; }
    100% { background-position: 0 0; }
  }
`;

export async function winnerAnimation() {
  console.log("Autodarts Tools: Winner Animation");

  addStyles(STYLES, STYLE_ID);

  const gameData = await AutodartsToolsGameData.getValue();
  await apply(gameData);

  gameDataWatcherUnwatch?.();
  gameDataWatcherUnwatch = AutodartsToolsGameData.watch(apply);
}

export async function winnerAnimationOnRemove() {
  gameDataWatcherUnwatch?.();
  gameDataWatcherUnwatch = undefined;
  clear();
  removeStyles(STYLE_ID);
}

async function apply(gameData: IGameData): Promise<void> {
  const match = gameData?.match;
  if (!match) return;

  // A throw being corrected replays a finished leg; the ring should come off
  // rather than celebrate it twice.
  const editing = match.activated !== undefined && match.activated >= 0;
  const winner = match.gameWinner ?? -1;
  if (editing || winner < 0) return clear();

  const config: IConfig = await AutodartsToolsConfig.getValue();
  if (!config.winnerAnimation.enabled) return clear();

  const text = message(gameData);
  clear();

  const refresh = () => put(winner, text);
  refresh();

  /*
   * React re-renders the cards as the leg wraps up, and changing size — turning
   * a tablet over, resizing a window — swaps the layout for another one
   * wholesale. `main` does not survive that: an observer left on it goes on
   * watching a node that has been detached, which is how the ring came off at
   * one size and never came back at any of the others. Hence `document.body`,
   * which is never replaced, and a resize listener beside it so a layout change
   * is answered directly rather than waiting on a mutation that may not come.
   *
   * Attributes are not observed, so re-marking cannot retrigger this.
   */
  reapplyObserver = new MutationObserver(refresh);
  reapplyObserver.observe(document.body, { childList: true, subtree: true });

  resizeHandler = refresh;
  window.addEventListener("resize", resizeHandler);
}

/**
 * Put the flag where this layout wants it, unless it is already exactly there.
 *
 * Runs on every mutation batch while a leg is won, so it settles for reading
 * two attributes when nothing has moved, and only measures the card on the wide
 * layout — the compact one draws no caption and so needs no measurement.
 */
function put(winner: number, text: string): void {
  const target = winnerTarget(winner);
  if (!target) return;

  const caption = target.mode === "wide" && hasHeadroom(target.el) ? text : "";
  if (target.el.getAttribute(WINNER_FLAG) === target.mode
    && (target.el.getAttribute(MESSAGE_ATTR) ?? "") === caption) return;

  clearMarks();
  mark(target, caption);
}

/**
 * Whether there is room above the card to hang the caption.
 *
 * A short window keeps the wide layout but runs the card off the bottom of the
 * screen; on 1280x600 the card started at the very top and the caption, which
 * sits above it, was off the edge entirely. Drawing nothing beats that.
 */
function hasHeadroom(el: HTMLElement): boolean {
  return el.getBoundingClientRect().top >= CAPTION_HEADROOM;
}

/** Where the ring goes, and which of the two treatments the layout calls for. */
interface WinnerTarget { el: HTMLElement; mode: "wide" | "compact" }

/**
 * The visible card for the winning player, in whichever layout is on screen.
 *
 * `attr()` only reads the attributes of the element the pseudo-element belongs
 * to, so the flag has to live on the same node the ring and caption are drawn
 * on — which is the card, not the column around it.
 *
 * Player columns exist only on the widest layout. Below it the site drops to a
 * sidebar and then to a top bar, where the card face is all that is left per
 * player; it is the same element with the same classes in all three, so it
 * doubles as the anchor once the column has gone.
 */
function winnerTarget(index: number): WinnerTarget | null {
  const column = qsa<HTMLElement>(SELECTORS.match.playerCards)[index];
  if (column) return { el: qs<HTMLElement>(SELECTORS.match.playerCardBody, column) ?? column, mode: "wide" };

  const surface = qsa<HTMLElement>(SELECTORS.match.playerCardSurface)[index];
  return surface ? { el: surface, mode: "compact" } : null;
}

function mark(target: WinnerTarget, text: string): void {
  target.el.setAttribute(WINNER_FLAG, target.mode);
  if (text) target.el.setAttribute(MESSAGE_ATTR, text);
  else target.el.removeAttribute(MESSAGE_ATTR);
}

/** What the leg was worth, or nothing when there is nothing to add. */
function message(gameData: IGameData): string {
  const match = gameData.match!;
  const darts = match.stats?.[match.gameWinner]?.matchStats?.dartsThrown;

  // The rebuilt card already carries a "GAME SHOT" banner of the site's own,
  // right under where this sits, so saying it again is noise. What the site
  // does not say is how many darts it took.
  if (gameData.gameMode !== GameMode.X01 || !darts) return "";

  const settings = match.settings as { baseScore?: number };
  const base = settings?.baseScore;
  // A 501 leg in nine darts is the perfect leg; 301 in six is its equivalent.
  const perfect = (base === 501 && darts === 9) || (base === 301 && darts === 6);

  if (perfect) return `${darts} Darter — Perfect Leg!`;
  return `${darts} Darts`;
}

/**
 * Take the flag off whatever is carrying it, leaving the observer running.
 *
 * Separate from {@link clear} because the observer's own callback needs this:
 * tearing the observer down from inside it left the flag in place for good the
 * next time React replaced the card.
 */
function clearMarks() {
  for (const el of document.querySelectorAll(`[${WINNER_FLAG}]`)) {
    el.removeAttribute(WINNER_FLAG);
    el.removeAttribute(MESSAGE_ATTR);
  }
}

function clear() {
  reapplyObserver?.disconnect();
  reapplyObserver = null;
  if (resizeHandler) window.removeEventListener("resize", resizeHandler);
  resizeHandler = undefined;
  clearMarks();
}
