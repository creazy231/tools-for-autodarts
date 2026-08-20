import type { IConfig } from "@/utils/storage";
import type { IGameData } from "@/utils/game-data-storage";

import { addStyles, removeStyles } from "@/utils";
import { AutodartsToolsGameData, GameMode } from "@/utils/game-data-storage";
import { AutodartsToolsConfig } from "@/utils/storage";
import { SELECTORS, qsaCount } from "@/utils/selectors";

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
 * enough for columns either side of the board, each player gets a wrapper that
 * neither clips nor is clipped, so the ring is drawn around the card with the
 * caption above. Narrower — a 320px sidebar of stacked cards, or a bar of cards
 * across the top, which is what every tablet and phone gets — there is no
 * wrapper left and the card face is the card, and it clips its own overflow, so
 * an outset ring would lose its edges and there is no room above for the
 * caption anyway. There the ring is drawn just inside the card's own edge and
 * the caption is dropped: the card is dense at that size and anything else
 * would land on top of the score.
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
  const players = match.players?.length ?? 0;
  clear();

  const refresh = () => put(winner, players, text);
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
function put(winner: number, players: number, text: string): void {
  const target = winnerTarget(winner, players);
  if (!target) return;

  const caption = target.mode === "wide" && hasHeadroom(target.el, target.cards) ? text : "";
  if (target.el.getAttribute(WINNER_FLAG) === target.mode
    && (target.el.getAttribute(MESSAGE_ATTR) ?? "") === caption) return;

  clearMarks();
  mark(target, caption);
}

/**
 * Whether the space the caption wants, directly above the card, is free.
 *
 * Two things take it away. A short window keeps the wide layout but runs the
 * card off the bottom of the screen; on 1280x600 the card started at the very
 * top and the caption sat off the edge entirely. And a column holds as many
 * cards as it needs to, stacked and touching, so from three players up the card
 * above is right there — which is where "12 DARTS" landed, written across
 * somebody else's score.
 *
 * Drawing nothing beats either. The ring is the part that says who won; the
 * caption only adds what it took, and the compact layouts already do without.
 */
function hasHeadroom(el: HTMLElement, cards: HTMLElement[]): boolean {
  const box = el.getBoundingClientRect();
  if (box.top < CAPTION_HEADROOM) return false;

  return !cards.some((other) => {
    if (other === el) return false;
    const above = other.getBoundingClientRect();
    const sameColumn = above.right > box.left && above.left < box.right;
    return sameColumn && above.bottom > box.top - CAPTION_HEADROOM && above.bottom <= box.top;
  });
}

/** Where the ring goes, which treatment to use, and the cards it sits among. */
interface WinnerTarget { el: HTMLElement; mode: "wide" | "compact"; cards: HTMLElement[] }

/**
 * The visible card for the winning player, in whichever layout is on screen.
 *
 * `attr()` only reads the attributes of the element the pseudo-element belongs
 * to, so the flag has to live on the same node the ring and caption are drawn
 * on — which is the card, not the column around it. The column is not one per
 * player anyway: the widest layout draws two of them however many are playing
 * and stacks the cards inside, so with three players indexing the columns put
 * the ring around player 3 when player 2 had won. Hence {@link qsaCount}, which
 * will not hand back a set that is not one element per player.
 *
 * Which of the two treatments to use follows from the element rather than from
 * the layout it came out of: the ring can only be drawn outside a card that
 * does not clip, and of the three layouts only the widest gives us one.
 */
function winnerTarget(index: number, players: number): WinnerTarget | null {
  const cards = qsaCount<HTMLElement>(SELECTORS.match.playerCard, players);
  const el = cards[index];
  if (!el) return null;

  const clipped = getComputedStyle(el).overflow !== "visible";
  return { el, cards, mode: clipped ? "compact" : "wide" };
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
