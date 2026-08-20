import type { IBoard } from "@/utils/board-data-storage";

import { createButtonCountdown } from "./button-countdown";
import { AutodartsToolsBoardData } from "@/utils/board-data-storage";
import { AutodartsToolsGameData } from "@/utils/game-data-storage";
import { AutodartsToolsConfig } from "@/utils/storage";
import { SELECTORS, qs, qsText } from "@/utils/selectors";

/**
 * Auto Next Player on Takeout — press "Next" when a takeout never ends.
 *
 * A board that loses sight of a dart sits in "Takeout in progress" forever and
 * the visit never closes. This starts a countdown on the site's own Next button
 * as soon as takeout begins, and presses it if the board has not come back by
 * then. Clicking anywhere calls it off — you are already dealing with it.
 *
 * The port is the anchoring and the timer. v1 found the button by its label,
 * appended a `<span>` to it for the count and clicked that same element several
 * seconds later; on the rebuilt site the turn bar is React and is replaced on
 * every dart, so the span is discarded and the click lands on a detached node.
 * See button-countdown.ts, which resolves the button again on every tick.
 *
 * v1 also replaced `Document.prototype.addEventListener` globally to keep a
 * registry of listeners, and used it to find its own handler again at teardown.
 * That patch outlived the feature, applied to every listener on the page, and
 * is gone: holding the handler in a variable does the same job.
 */
const COUNT_ATTR = "data-adt-next-countdown";
const STYLE_ID = "next-player-on-take-out-stuck";

/** The board status that means darts are being pulled. */
const TAKEOUT_STATUS = "Takeout in progress";

const countdown = createButtonCountdown(COUNT_ATTR, STYLE_ID);

let boardDataWatcherUnwatch: (() => void) | undefined;
let onUserClick: (() => void) | null = null;
let seconds = 0;

export async function nextPlayerOnTakeOutStuck() {
  console.log("Autodarts Tools: Auto Next Player on Takeout");

  const config = await AutodartsToolsConfig.getValue();
  seconds = config.nextPlayerOnTakeOutStuck.sec;

  countdown.install();

  // Re-running without a teardown in between would otherwise leave the previous
  // handler on the document for good.
  if (onUserClick) document.removeEventListener("click", onUserClick);
  onUserClick = () => countdown.stop();
  document.addEventListener("click", onUserClick);

  // No start-up read of `board-data`: it is one record in `storage.local` that
  // outlives the match, so a takeout left over from a previous one started this
  // countdown as the match screen appeared and pressed Next on the opening
  // visit. Only a board reporting a takeout now can start it. Same reason the
  // notification does not read it either — see takeout.ts.
  boardDataWatcherUnwatch?.();
  boardDataWatcherUnwatch = AutodartsToolsBoardData.watch(onBoard);
}

export function nextPlayerOnTakeOutStuckOnRemove() {
  console.log("Autodarts Tools: Auto Next Player on Takeout removed!");

  boardDataWatcherUnwatch?.();
  boardDataWatcherUnwatch = undefined;

  if (onUserClick) {
    document.removeEventListener("click", onUserClick);
    onUserClick = null;
  }

  countdown.destroy();
}

/**
 * Every board message restarts the decision: any status other than a takeout
 * in progress means there is nothing to rescue.
 */
async function onBoard(boardData: IBoard): Promise<void> {
  countdown.stop();
  if (boardData.status !== TAKEOUT_STATUS) return;

  // The bull-off has no "next player" to advance to.
  const gameData = await AutodartsToolsGameData.getValue();
  if (gameData?.match?.variant === "Bull-off") return;

  countdown.start(findNextButton, seconds);
}

/**
 * The label first, the fill as the fallback a language switch needs.
 *
 * It used to be the other way round, which pressed the wrong button: the camera
 * and undo buttons share Next's `bg-blue-60` and come before it in the document,
 * so the fill selector matched one of those and the label was never consulted.
 * Without a board the camera is disabled and the misfire went unnoticed; with
 * one it is live, and pressing it opened the camera instead of advancing the
 * player.
 */
function findNextButton(): HTMLElement | null {
  return qsText<HTMLElement>(SELECTORS.match.matchButtons, SELECTORS.match.nextButtonText)
    ?? qs<HTMLElement>(SELECTORS.match.nextButton);
}
