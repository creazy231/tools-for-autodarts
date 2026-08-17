import type { IGameData } from "@/utils/game-data-storage";

import { addStyles, removeStyles } from "@/utils";
import { AutodartsToolsGameData } from "@/utils/game-data-storage";
import { SELECTORS, qs, qsa } from "@/utils/selectors";

/**
 * Gotcha Helper — name the dart that resets the player who is ahead.
 *
 * In Gotcha you count up to the target, and landing exactly on another player's
 * score sends them back to zero. So the number worth knowing is not your own
 * score, it is the gap: this puts that gap on every player who is ahead of
 * whoever is throwing, written as the dart that closes it — "T20", "D11",
 * "BULL" — or as "+37" when no single dart can.
 *
 * v1 mounted a Vue app inside each player's score element. The rebuilt cards
 * are React and are rebuilt on every dart, so nothing is inserted here: the
 * value goes on the card as an attribute and CSS draws it as generated content,
 * styled to match the checkout chips the site itself puts in that spot in X01.
 * A re-render can drop the attribute, never the rule, so putting it back is one
 * cheap write.
 */
const HINT_ATTR = "data-adt-gotcha";
const STYLE_ID = "gotcha";

/**
 * The site's own checkout chip, matched token for token:
 * `bg-black-70 rounded-lg h-8 px-3 font-number text-xl leading-none uppercase`,
 * in the `left-3` column it reserves for them. Gotcha has no checkout, so that
 * column is free, and the hint lands where the eye already looks for "throw
 * this". The custom properties are the site's, so a palette change carries.
 */
const STYLES = `
  [${HINT_ATTR}]::after {
    content: attr(${HINT_ATTR});
    position: absolute;
    left: 0.75rem;
    top: 0;
    bottom: 0;
    margin: auto 0;
    height: 2rem;
    padding: 0.25rem 0.75rem 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.5rem;
    background: var(--color-black-70, #292c33);
    color: var(--color-black-05, #f7f8fa);
    font-family: var(--font-number, inherit);
    font-size: 1.25rem;
    line-height: 1;
    text-transform: uppercase;
    pointer-events: none;
  }
`;

let gameDataWatcherUnwatch: (() => void) | undefined;
let reapplyObserver: MutationObserver | null = null;
let frame = 0;

/** Hint per player index, in card order. `null` means "nothing to show". */
let hints: Array<string | null> = [];

export async function gotcha() {
  console.log("Autodarts Tools: Gotcha Helper");

  addStyles(STYLES, STYLE_ID);
  render(await AutodartsToolsGameData.getValue());

  gameDataWatcherUnwatch?.();
  gameDataWatcherUnwatch = AutodartsToolsGameData.watch(render);
}

export function gotchaOnRemove() {
  console.log("Autodarts Tools: Gotcha Helper removed!");
  gameDataWatcherUnwatch?.();
  gameDataWatcherUnwatch = undefined;
  reapplyObserver?.disconnect();
  reapplyObserver = null;
  hints = [];
  clear();
  removeStyles(STYLE_ID);
}

function render(gameData: IGameData): void {
  const match = gameData?.match;
  const scores = match?.gameScores;

  // Every other variant, and the moment a leg is won, has nothing to catch.
  if (!match || match.variant !== "Gotcha" || !scores || (match.gameWinner ?? -1) >= 0) {
    hints = [];
    clear();
    return;
  }

  const throwing = scores[match.player] ?? 0;
  hints = scores.map(score => (score - throwing > 0 ? dartFor(score - throwing) : null));

  apply();
  watchDom();
}

/** Write the current hints onto the cards, and only where they changed. */
function apply(): void {
  qsa<HTMLElement>(SELECTORS.match.playerCards).forEach((card, index) => {
    const target = qs<HTMLElement>(SELECTORS.match.playerScoreCard, card) ?? card;
    const hint = hints[index] ?? null;

    if (hint === null) target.removeAttribute(HINT_ATTR);
    else if (target.getAttribute(HINT_ATTR) !== hint) target.setAttribute(HINT_ATTR, hint);
  });
}

/**
 * React rebuilds the cards between game-data updates — a dart landing, the
 * timer, the viewer count — and takes our attribute with them. Watching for
 * added nodes puts it back; setting an attribute is not a childList mutation,
 * so this cannot retrigger itself.
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
  for (const el of document.querySelectorAll(`[${HINT_ATTR}]`)) el.removeAttribute(HINT_ATTR);
}

/**
 * The single dart worth exactly `points`, in the site's own segment notation.
 *
 * Singles first, so 18 reads "S18" rather than the D9 or T6 that also land it.
 * A gap no single dart can cover — 29, or anything past 60 — is written as the
 * gap itself, which is still the thing worth knowing.
 */
function dartFor(points: number): string {
  if (points === 50) return "BULL";
  if (points === 25) return "25";
  if (points <= 20) return `S${points}`;
  if (points <= 40 && points % 2 === 0) return `D${points / 2}`;
  if (points <= 60 && points % 3 === 0) return `T${points / 3}`;
  return `+${points}`;
}
