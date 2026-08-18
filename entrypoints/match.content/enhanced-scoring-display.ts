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
 *
 * Keyed on position means keyed on the slots that have a dart in them: the
 * remaining slots carry the site's checkout suggestion for the darts still to
 * come, and those are left exactly as the site draws them.
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

  // Only the slots holding a dart that has been thrown. The slots after those
  // hold the site's checkout suggestion for the darts still to come — same
  // elements, different meaning — and restyling them shrank the site's own
  // suggestion to caption size.
  const scored = ((turn?.throws ?? []) as IThrow[])
    .map((thrown, index) => ({ nth: index + 1, points: pointsOf(thrown.segment?.name ?? "") }))
    .filter((entry): entry is { nth: number; points: number } => entry.points !== null);

  const rules = [ `
    ${total} > span {
      font-size: 2.6rem !important;
      font-weight: 800 !important;
    }
  ` ];

  if (scored.length) {
    // Each of these has to carry its own suffix. `a, b::before` attaches the
    // pseudo-element to `b` only, and `a` quietly takes the rule itself — which
    // is how the first slot ended up scaled as a whole cell.
    const slots = scored.map(entry => `${slot}:nth-child(${entry.nth})`).join(", ");
    const values = scored.map(entry => `${slot}:nth-child(${entry.nth})::before`).join(", ");
    const notation = scored.map(entry => `${slot}:nth-child(${entry.nth}) > span:not([aria-hidden="true"])`).join(", ");

    rules.push(`
      /*
       * Stack the value over the notation; ::before is the first flex item.
       *
       * The whole cell is scaled rather than just the number: a transform does
       * not lay out, so the slot keeps its size and the ones beside it stay
       * where they are — the turn bar spaces them well apart enough to take it.
       */
      ${slots} {
        flex-direction: column !important;
        justify-content: center !important;
        gap: 0 !important;
        line-height: 1 !important;
        transform: scale(1.5);
      }
      /* the notation the site prints becomes the caption */
      ${notation} {
        font-size: 0.8rem !important;
        opacity: 0.65;
      }
      ${values} {
        font-size: 1.9rem;
        font-weight: 800;
        line-height: 1;
      }
    `);

    for (const entry of scored) {
      rules.push(`${slot}:nth-child(${entry.nth})::before { content: "${entry.points}"; }`);
    }
  }

  addStyles(rules.join("\n"), STYLE_ID);
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
