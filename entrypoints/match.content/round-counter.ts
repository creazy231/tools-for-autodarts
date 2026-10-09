import type { IGameData } from "@/utils/game-data-storage";

import { AutodartsToolsGameData } from "@/utils/game-data-storage";
import { onLanguageChange, t } from "@/utils/i18n";
import { SELECTORS, qs } from "@/utils/selectors";

/**
 * Round Counter — the round being thrown, and how many the match allows.
 *
 * The rebuilt match screen dropped the "Round 5/15" the old one showed, though
 * the site still ships the text for it (`game.roundOf`) and the match state
 * still carries `round` and `settings.maxRounds`. This puts it back, centred in
 * the match header between Exit and the icons, in the site's own words.
 *
 * Our own element rather than generated content, so a screen reader reads it.
 * The header is React too, so every game-data update checks the element is
 * still there and puts it back if not.
 */
const COUNTER_ID = "adt-round-counter";

/**
 * The site's own chip, as Gotcha's hint matches it. The custom properties are
 * the site's, so a palette change carries. Inline, because our Tailwind lives
 * in the shadow roots and never reaches the site's header.
 */
const COUNTER_STYLE = [
  "position: absolute",
  "left: 50%",
  "top: 50%",
  "transform: translate(-50%, -50%)",
  "padding: 0.375rem 0.75rem",
  "border-radius: 0.5rem",
  "background: var(--color-black-70, #292c33)",
  "color: var(--color-black-05, #f7f8fa)",
  "font-family: var(--font-number, inherit)",
  "font-size: 1.25rem",
  "line-height: 1",
  "white-space: nowrap",
  "pointer-events: none",
].join("; ");

let gameDataWatcherUnwatch: (() => void) | undefined;
let stopLanguageListener: (() => void) | undefined;
let lastGameData: IGameData | undefined;

export async function roundCounter() {
  console.log("Autodarts Tools: Round Counter");

  render(await AutodartsToolsGameData.getValue());

  gameDataWatcherUnwatch?.();
  gameDataWatcherUnwatch = AutodartsToolsGameData.watch(render);

  stopLanguageListener?.();
  stopLanguageListener = onLanguageChange(() => render(lastGameData));
}

export function roundCounterOnRemove() {
  console.log("Autodarts Tools: Round Counter removed!");
  gameDataWatcherUnwatch?.();
  gameDataWatcherUnwatch = undefined;
  stopLanguageListener?.();
  stopLanguageListener = undefined;
  lastGameData = undefined;
  document.getElementById(COUNTER_ID)?.remove();
}

function render(gameData: IGameData | undefined): void {
  lastGameData = gameData;
  const label = labelFor(gameData);

  if (!label) {
    document.getElementById(COUNTER_ID)?.remove();
    return;
  }

  const header = qs<HTMLElement>(SELECTORS.match.header);
  if (!header) return;

  let counter = document.getElementById(COUNTER_ID);
  if (!counter || counter.parentElement !== header) {
    counter?.remove();
    counter = document.createElement("div");
    counter.id = COUNTER_ID;
    counter.setAttribute("style", COUNTER_STYLE);
    counter.setAttribute("aria-live", "polite");
    header.appendChild(counter);
  }

  if (counter.textContent !== label) counter.textContent = label;
}

/**
 * "Round 7/15", or "Round 7" for a game played without a limit. Nothing for the
 * bull-off, whose rounds are not the match's.
 */
function labelFor(gameData: IGameData | undefined): string | null {
  const match = gameData?.match;
  if (!match?.round || match.variant === "Bull-off") return null;

  // Every variant's settings carry it, but only X01's type names it.
  const total = (match.settings as { maxRounds?: number } | undefined)?.maxRounds;
  return total
    ? t("roundCounter.roundOf", { round: match.round, total })
    : t("roundCounter.round", { round: match.round });
}
