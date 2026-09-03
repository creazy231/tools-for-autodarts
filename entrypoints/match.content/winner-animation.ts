import type { IConfig } from "@/utils/storage";
import type { IGameData } from "@/utils/game-data-storage";

import { addStyles, removeStyles } from "@/utils";
import { AutodartsToolsGameData } from "@/utils/game-data-storage";
import { AutodartsToolsConfig } from "@/utils/storage";
import { SELECTORS, qs, qsaCount } from "@/utils/selectors";

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
 * There are three treatments, because the match screen has three layouts and
 * the site marks the finished leg itself.
 *
 * Wide enough for columns either side of the board, each player gets a wrapper
 * that neither clips nor is clipped, so the ring is drawn around the outside of
 * the card with the caption above — and being outside is what keeps it clear of
 * the site's own end-of-leg panel, which is drawn inside the card there.
 *
 * Narrower — a 320px sidebar of stacked cards, or a bar of cells across the top,
 * which is what every tablet and phone gets — there is no wrapper left, the card
 * face is the card and it clips its own overflow, and the site's panel is drawn
 * over the whole group of cards rather than inside one of them. So the group is
 * what carries the ring, just inside its edge and lifted over the site's panel.
 * See {@link coveredBlock}.
 *
 * Compact — a ring inside one card — is what is left when a card is clipped and
 * yet nothing is covering it. The caption is dropped in both of the narrow
 * treatments: the cards are dense at that size and anything else would land on
 * top of a score.
 */
const WINNER_FLAG = "data-adt-winner";
const MESSAGE_ATTR = "data-adt-winner-message";
const STYLE_ID = "winner-animation";

/**
 * How much clear space above the card the caption needs before it is worth
 * drawing — its largest size plus its margin, rounded up.
 */
const CAPTION_HEADROOM = 48;

/** How thick the ring is drawn, and so how much room outside a card it needs. */
const RING = 3;

/**
 * The layer the site stacks its own end-of-leg panel on, as a `z-index`.
 *
 * It writes `z-10` on the panel, wherever it draws it, so both of the inset
 * treatments have to be lifted clear of that number to be seen at all.
 */
const SITE_PANEL_LAYER = 10;

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
    inset: -${RING}px;
    z-index: -1;
  }

  /*
   * Compact and block are both drawn inside their element's own edge, masked to
   * a RING-thick band so what is behind shows through the middle. No
   * border-radius of ours on either: the site squares these corners off, and
   * rounding them would reshape its own card.
   */
  [${WINNER_FLAG}="compact"]::before,
  [${WINNER_FLAG}="block"]::before {
    inset: 0;
    /*
     * Over the card's own artwork, which is painted on top of the ring
     * otherwise — and over the site's end-of-leg panel, which is painted on top
     * of both. Matching the panel's layer is not enough: equal z-index falls
     * back to document order, and the panel comes later, so a ring level with it
     * was painted out completely and nothing showed below 1500px at all.
     */
    z-index: ${SITE_PANEL_LAYER + 10};
    padding: ${RING}px;
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
  const who = identify(match, winner);
  clear();

  const refresh = () => put(who, text);
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
 * Who won, in terms the cards on screen can be searched by.
 *
 * `match.players` is not the order the cards are in. It is re-ordered every leg
 * so that whoever throws first comes first — leg 2 of a three-player match
 * reads `[SEED01, SEED02, creazy]` where the cards still read
 * `[creazy, SEED01, SEED02]` — and `gameWinner` indexes *that* list. Taking it
 * as a card position therefore congratulated the wrong player from leg 2 on:
 * SEED01 checked out, `gameWinner` was 0, and the ring went round card 0, which
 * was creazy. Leg 1 was always right, which is what made it look occasional.
 *
 * `player.index` is the seat, and the seat *is* the card order — but only in the
 * two layouts that keep the players still. The top-bar layout lists them in
 * throwing order instead, so it agrees with `gameWinner` and disagrees with the
 * seat. Neither index is right everywhere, so neither is what we search by: the
 * name is on the card, and it means the same thing in every layout.
 *
 * The seat is kept as a fallback for the case a name cannot settle — two
 * players called the same thing — and the score to tell those two apart, since
 * only one of them is on the score that just won the leg.
 */
function identify(match: NonNullable<IGameData["match"]>, winner: number): WinnerId {
  const player = match.players?.[winner];
  const score = match.gameScores?.[winner];
  return {
    name: player?.name?.trim(),
    seat: player?.index ?? winner,
    score: score === undefined ? undefined : String(score),
    players: match.players?.length ?? 0,
  };
}

/** The winning player, as the DOM can be asked about them. */
interface WinnerId { name?: string; seat: number; score?: string; players: number }

/**
 * Put the flag where this layout wants it, unless it is already exactly there.
 *
 * Runs on every mutation batch while a leg is won, so it settles for reading
 * two attributes when nothing has moved, and only measures the card on the wide
 * layout — the compact one draws no caption and so needs no measurement.
 */
function put(who: WinnerId, text: string): void {
  const target = winnerTarget(who);
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
interface WinnerTarget { el: HTMLElement; mode: "wide" | "compact" | "block"; cards: HTMLElement[] }

/**
 * The group of cards the site's own end-of-leg panel is drawn over, if it is
 * drawn over more than the winner's own card.
 *
 * The site marks the finished leg itself, with a panel carrying the winner's
 * name, "GAME SHOT" and a Next Leg button. In the widest layout that panel
 * lives *inside* the winning card, which is why an outset ring survives it. In
 * every narrower layout it is `position: absolute; inset: 0; z-index: 10` inside
 * the box that holds the whole group — the 320px sidebar of stacked cards, or
 * the strip of cells across the top — so it covers every card in the group, and
 * a ring drawn inside the winner's card was painted out completely. Nothing was
 * visible below 1500px at all.
 *
 * So the group is what gets ringed there, which is also the useful answer: the
 * site's panel is what a player is looking at, and the ring frames it. The
 * winner is still named — by the panel, in the site's own words.
 *
 * Found by shape rather than by its text, which is translated. Walking up from
 * the card's parent rather than the card keeps the widest layout out of this:
 * there the only such panel is the card's own descendant, which is a treatment
 * that already works and not a group at all.
 */
function coveredBlock(card: HTMLElement): HTMLElement | null {
  const box = card.getBoundingClientRect();

  for (let node = card.parentElement; node && node.tagName !== "MAIN"; node = node.parentElement) {
    for (const child of Array.from(node.children)) {
      // the branch the card itself hangs off, rather than something over it
      if (child.contains(card)) continue;

      const style = getComputedStyle(child);
      if (style.position !== "absolute") continue;
      if (style.zIndex === "auto" || Number(style.zIndex) < 1) continue;

      const over = child.getBoundingClientRect();
      const covered = over.left <= box.left + 1 && over.top <= box.top + 1
        && over.right >= box.right - 1 && over.bottom >= box.bottom - 1;
      if (covered) return node;
    }
  }
  return null;
}

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
 * Which of the three treatments to use follows from the element rather than
 * from the layout it came out of: the ring can only be drawn outside a card
 * that neither clips it nor is pressed against the edge of the window, and
 * inside a card only where the site is not covering that card over.
 */
function winnerTarget(who: WinnerId): WinnerTarget | null {
  const cards = qsaCount<HTMLElement>(SELECTORS.match.playerCard, who.players);
  const el = pick(cards, who);
  if (!el) return null;

  /*
   * A ring outside the card needs the card to have an outside. Overflow says
   * whether the card would clip it; this says whether the window would. The
   * narrow layouts run a single player's card the full width of the screen, and
   * there the outset ring fell off three edges and left its bottom 3px lying
   * across the page as a stray rainbow line.
   */
  const clipped = getComputedStyle(el).overflow !== "visible";
  const box = el.getBoundingClientRect();
  const roomOutside = box.left >= RING && box.right <= window.innerWidth - RING;
  if (!clipped && roomOutside) return { el, cards, mode: "wide" };

  // Inside the card is only worth drawing if the site is not covering the card.
  const block = coveredBlock(el);
  return block ? { el: block, cards, mode: "block" } : { el, cards, mode: "compact" };
}

/**
 * The winner's card, found by name rather than by counting.
 *
 * See {@link identify} for why an index cannot do this. Unique name is the
 * answer in every layout; the score separates two players sharing a name,
 * because the one who just won this leg is the one showing the winning score;
 * and the seat is what is left when the cards say nothing we can match, which
 * is at least right in the two layouts that seat players in order.
 */
function pick(cards: HTMLElement[], who: WinnerId): HTMLElement | undefined {
  const named = who.name
    ? cards.filter(card => qs(SELECTORS.match.playerName, card)?.textContent?.trim() === who.name)
    : [];

  if (named.length === 1) return named[0];
  if (named.length > 1) {
    const onScore = named.find(card =>
      qs(SELECTORS.match.playerScore, card)?.textContent?.trim() === who.score);
    return onScore ?? named[0];
  }
  return cards[who.seat];
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
  //
  // `match.variant` is the site's own name for the game, from the match data.
  // `gameData.gameMode` was read off an `h2` on the old site's new-lobby page,
  // which the rebuilt site does not have, so it never left its default.
  if (match.variant !== "X01" || !darts) return "";

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
