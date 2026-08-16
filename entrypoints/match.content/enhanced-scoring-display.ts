import type { IGameData } from "@/utils/game-data-storage";
import type { IThrow } from "@/utils/websocket-helpers";

import { addStyles, removeStyles } from "@/utils";
import { AutodartsToolsGameData } from "@/utils/game-data-storage";
import { SELECTORS } from "@/utils/selectors";

/**
 * Enhanced Scoring Display — show what each dart was worth, not just where it landed.
 *
 * The rebuilt bar prints the notation only: "T20", "BULL", "S3". This puts the
 * points above it in large type and drops the notation to a caption, and makes
 * the turn total match.
 *
 * v1 rewrote the slots' innerHTML. That is not an option here — the bar is
 * React and rebuilds those nodes on every dart — so nothing in the page is
 * touched at all. The values go into a stylesheet as generated content, keyed
 * on each slot's position, and the sheet is rewritten whenever the turn
 * changes. React has nothing to undo.
 */
const STYLE_ID = "enhanced-scoring-display";

let gameDataWatcherUnwatch: (() => void) | undefined;

export async function enhancedScoringDisplay() {
  console.log("Autodarts Tools: Enhanced Scoring Display");

  render(await AutodartsToolsGameData.getValue());

  gameDataWatcherUnwatch?.();
  gameDataWatcherUnwatch = AutodartsToolsGameData.watch(render);
}

export async function enhancedScoringDisplayOnRemove() {
  console.log("Autodarts Tools: Enhanced Scoring Display removed!");
  gameDataWatcherUnwatch?.();
  gameDataWatcherUnwatch = undefined;
  removeStyles(STYLE_ID);
}

function render(gameData: IGameData): void {
  const turn = gameData?.match?.turns?.[0];
  const slot = SELECTORS.match.dartSlots[0];
  const total = SELECTORS.match.turnTotal[0];

  const layout = `
    /* stack the value over the notation; ::before is the first flex item */
    ${slot} {
      flex-direction: column !important;
      justify-content: center !important;
      gap: 0 !important;
      line-height: 1 !important;
    }
    /* the notation the site prints becomes the caption */
    ${slot} > span:not([aria-hidden="true"]) {
      font-size: 0.8rem !important;
      opacity: 0.65;
    }
    ${slot}::before {
      font-size: 1.9rem;
      font-weight: 800;
      line-height: 1;
    }
    ${total} > span {
      font-size: 2.6rem !important;
      font-weight: 800 !important;
    }
  `;

  const throws = (turn?.throws ?? []) as IThrow[];
  const values = throws
    .map((t, index) => {
      const points = pointsOf(t.segment?.name ?? "");
      if (points === null) return "";
      return `${slot}:nth-child(${index + 1})::before { content: "${points}"; }`;
    })
    .filter(Boolean);

  addStyles([ layout, ...values ].join("\n"), STYLE_ID);
}

/**
 * Points for a segment name.
 *
 * "BULL" is 50 and "25" the outer ring; a miss is named M<number> and is worth
 * nothing, but still deserves the 0 rather than an empty slot.
 */
function pointsOf(name: string): number | null {
  const segment = name.trim().toUpperCase();
  if (!segment) return null;
  if (segment === "BULL") return 50;
  if (segment === "25") return 25;

  const match = segment.match(/^([SDTM])(\d{1,2})$/);
  if (!match) return null;

  const [ , bed, number ] = match;
  if (bed === "M") return 0;
  return Number(number) * (bed === "T" ? 3 : bed === "D" ? 2 : 1);
}
