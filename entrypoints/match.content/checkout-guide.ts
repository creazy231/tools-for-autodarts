import type { IGameData } from "@/utils/game-data-storage";

import { addStyles, removeStyles } from "@/utils";
import { AutodartsToolsGameData } from "@/utils/game-data-storage";
import { SELECTORS, qs, qsa } from "@/utils/selectors";
import { gotchaCheckout } from "@/utils/checkout";

/**
 * Checkout Guide — keep the route on screen for every player.
 *
 * The rebuilt site draws this itself, per player and live, but only while its
 * own *Show checkout guide* switch is on; turn that off and the whole column
 * disappears. The routes still arrive either way — `state.checkoutGuides` holds
 * one per player — so this fills the gap and otherwise stays out of the way: a
 * card the site is already drawing on is left alone, so there is never a second
 * copy of the same three darts.
 *
 * That is also the difference from v1, which drew unconditionally and only ever
 * had `state.checkoutGuide`, the singular route belonging to whoever was
 * throwing. It wrote that into the card whose turn it was and left every other
 * card showing whatever it had been given last time round.
 *
 * Gotcha gets no route from anybody: you count up to a target there rather than
 * down to zero, and the site keeps no `checkoutGuides` for it at any score or
 * in any of its three out modes. So that one is worked out here — see
 * utils/checkout.ts — and only for the player at the oche, who is the only one
 * who can throw it, and whose card is the one the Gotcha Helper leaves free.
 *
 * Drawing is CSS, for the reason every other match feature is: the cards are
 * React and are rebuilt on every dart, so the value goes on as an attribute and
 * generated content paints it.
 */
const GUIDE_ATTR = "data-adt-checkout";
const STYLE_ID = "checkout-guide";

/**
 * Sits in the same `left-3` column the site reserves for its own chips, and
 * borrows its tokens. One pill with a line per dart rather than three separate
 * ones — an element has only so many pseudo-elements, and stacked lines read
 * the same way round.
 */
const STYLES = `
  [${GUIDE_ATTR}]::before {
    content: attr(${GUIDE_ATTR});
    position: absolute;
    left: 0.75rem;
    top: 0;
    bottom: 0;
    height: fit-content;
    margin: auto 0;
    padding: 0.375rem 0.75rem;
    border-radius: 0.5rem;
    background: var(--color-black-70, #292c33);
    color: var(--color-black-05, #f7f8fa);
    font-family: var(--font-number, inherit);
    font-size: 1.25rem;
    line-height: 1.75;
    text-align: center;
    text-transform: uppercase;
    white-space: pre-line;
    pointer-events: none;
  }
`;

let gameDataWatcherUnwatch: (() => void) | undefined;
let reapplyObserver: MutationObserver | null = null;
let frame = 0;

/** Route per player index, in card order. `null` means "nothing to show". */
let routes: Array<string | null> = [];

export async function checkoutGuide() {
  console.log("Autodarts Tools: Checkout Guide");

  addStyles(STYLES, STYLE_ID);
  render(await AutodartsToolsGameData.getValue());

  gameDataWatcherUnwatch?.();
  gameDataWatcherUnwatch = AutodartsToolsGameData.watch(render);
}

export function checkoutGuideOnRemove() {
  console.log("Autodarts Tools: Checkout Guide removed!");
  gameDataWatcherUnwatch?.();
  gameDataWatcherUnwatch = undefined;
  reapplyObserver?.disconnect();
  reapplyObserver = null;
  routes = [];
  clear();
  removeStyles(STYLE_ID);
}

interface ICheckoutDart { name: string }

function render(gameData: IGameData): void {
  const match = gameData?.match;
  const state = match?.state as {
    checkoutGuide?: ICheckoutDart[];
    checkoutGuides?: Array<ICheckoutDart[] | null>;
  } | undefined;

  if (!match || !state || (match.gameWinner ?? -1) >= 0) {
    routes = [];
    clear();
    return;
  }

  const perPlayer = state.checkoutGuides;
  const count = match.gameScores?.length ?? 0;

  if (match.variant === "Gotcha") {
    const checkout = gotchaCheckout(match, match.player);
    routes = Array.from({ length: count }, (_, index) =>
      (index === match.player && checkout ? checkout.darts.join("\n") : null));
  } else {
    routes = Array.from({ length: count }, (_, index) => {
      // Older payloads carry only the singular route, which belongs to whoever
      // is throwing — so it is the only card it can honestly be put on.
      const darts = perPlayer ? perPlayer[index] : (index === match.player ? state.checkoutGuide : null);
      if (!darts?.length) return null;
      return darts.map(dart => dart.name).join("\n");
    });
  }

  apply();
  watchDom();
}

/** Write the routes onto the cards the site has left blank. */
function apply(): void {
  qsa<HTMLElement>(SELECTORS.match.playerCards).forEach((card, index) => {
    const target = qs<HTMLElement>(SELECTORS.match.playerScoreCard, card) ?? card;
    // The site is drawing this card's route itself — adding ours would double it.
    const siteIsDrawing = qs(SELECTORS.match.checkoutSuggestion, card) !== null;
    const route = siteIsDrawing ? null : routes[index] ?? null;

    if (route === null) target.removeAttribute(GUIDE_ATTR);
    else if (target.getAttribute(GUIDE_ATTR) !== route) target.setAttribute(GUIDE_ATTR, route);
  });
}

/**
 * React rebuilds the cards between game-data updates and takes the attribute
 * with them. Setting an attribute is not a childList mutation, so putting it
 * back cannot retrigger this.
 */
function watchDom(): void {
  if (reapplyObserver) return;

  const host = qsa<HTMLElement>(SELECTORS.match.playerCards)[0]?.closest("main");
  if (!host) return;

  reapplyObserver = new MutationObserver(() => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      apply();
    });
  });
  reapplyObserver.observe(host, { childList: true, subtree: true });
}

function clear(): void {
  for (const el of document.querySelectorAll(`[${GUIDE_ATTR}]`)) el.removeAttribute(GUIDE_ATTR);
}
