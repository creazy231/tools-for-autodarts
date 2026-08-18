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
 */
const WINNER_FLAG = "data-adt-winner";
const MESSAGE_ATTR = "data-adt-winner-message";
const STYLE_ID = "winner-animation";

let gameDataWatcherUnwatch: (() => void) | undefined;
let reapplyObserver: MutationObserver | null = null;

const STYLES = `
  [${WINNER_FLAG}] {
    position: relative;
    isolation: isolate;
    border-radius: 1rem;
  }

  /* the animated ring */
  [${WINNER_FLAG}]::before {
    content: "";
    position: absolute;
    inset: -3px;
    z-index: -1;
    border-radius: inherit;
    background: linear-gradient(45deg, #fb0094, #00f, #0f0, #ff0, #f00, #fb0094, #00f, #0f0, #ff0, #f00);
    background-size: 400%;
    animation: adt-winner-steam 20s linear infinite;
  }

  /* what the leg was worth — the rebuilt site says "GAME SHOT" itself */
  [${WINNER_FLAG}]::after {
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

  const body = cardBody(winner);
  if (!body) return;

  clear();
  mark(body, message(gameData));

  // React re-renders the cards as the leg wraps up; put the flag back if the
  // element we marked is replaced.
  reapplyObserver?.disconnect();
  reapplyObserver = new MutationObserver(() => {
    const current = cardBody(winner);
    if (current && !current.hasAttribute(WINNER_FLAG)) {
      clear();
      mark(current, message(gameData));
    }
  });
  const host = qsa<HTMLElement>(SELECTORS.match.playerCards)[winner]?.parentElement;
  if (host) reapplyObserver.observe(host, { childList: true, subtree: true });
}

/**
 * The visible card within the winning player's column.
 *
 * `attr()` only reads the attributes of the element the pseudo-element belongs
 * to, so the flag has to live on the same node the ring and caption are drawn
 * on — which is this one, not the column around it.
 */
function cardBody(index: number): HTMLElement | null {
  const card = qsa<HTMLElement>(SELECTORS.match.playerCards)[index];
  if (!card) return null;
  return qs<HTMLElement>(SELECTORS.match.playerCardBody, card) ?? card;
}

function mark(element: HTMLElement, text: string): void {
  element.setAttribute(WINNER_FLAG, "");
  if (text) element.setAttribute(MESSAGE_ATTR, text);
  else element.removeAttribute(MESSAGE_ATTR);
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

function clear() {
  reapplyObserver?.disconnect();
  reapplyObserver = null;
  for (const el of document.querySelectorAll(`[${WINNER_FLAG}]`)) {
    el.removeAttribute(WINNER_FLAG);
    el.removeAttribute(MESSAGE_ATTR);
  }
}
