import type { IBoard } from "@/utils/board-data-storage";
import type { IGameData } from "@/utils/game-data-storage";

import { createButtonCountdown } from "./button-countdown";
import { AutodartsToolsBoardData } from "@/utils/board-data-storage";
import { AutodartsToolsGameData } from "@/utils/game-data-storage";
import { AutodartsToolsConfig } from "@/utils/storage";
import { SELECTORS, qs, qsText } from "@/utils/selectors";

/**
 * Automatic Next Leg — start the next leg once the darts are out of the board.
 *
 * The wait after a leg is won is the darts still being in the board, so the
 * cue is the board saying the takeout finished rather than the win itself.
 * From there a countdown runs on the site's own Next Leg button and presses it.
 *
 * v1 gated on `#ad-ext-turn`, a hook the rebuilt site does not emit, so it
 * never got past its first await here; it also found the button by label and
 * clicked the element it captured seconds earlier, which the rebuilt screen has
 * long since replaced. The button is now found by the `forward-step` glyph
 * FontAwesome stamps on it — which also covers "Next Set" — and is resolved
 * again on every tick. See button-countdown.ts.
 */
const COUNT_ATTR = "data-adt-next-leg-countdown";
const STYLE_ID = "automatic-next-leg";

const countdown = createButtonCountdown(COUNT_ATTR, STYLE_ID);

let boardDataWatcherUnwatch: (() => void) | undefined;
let gameDataWatcherUnwatch: (() => void) | undefined;
let gameData: IGameData | undefined;
let seconds = 0;

export async function automaticNextLeg() {
  console.log("Autodarts Tools: Automatic Next Leg");

  const config = await AutodartsToolsConfig.getValue();
  seconds = config.automaticNextLeg.sec;

  countdown.install();

  gameData = await AutodartsToolsGameData.getValue();
  gameDataWatcherUnwatch?.();
  gameDataWatcherUnwatch = AutodartsToolsGameData.watch((value: IGameData) => {
    gameData = value;
  });

  boardDataWatcherUnwatch?.();
  boardDataWatcherUnwatch = AutodartsToolsBoardData.watch(onBoard);
}

export function automaticNextLegOnRemove() {
  console.log("Autodarts Tools: Automatic Next Leg removed!");

  boardDataWatcherUnwatch?.();
  boardDataWatcherUnwatch = undefined;
  gameDataWatcherUnwatch?.();
  gameDataWatcherUnwatch = undefined;
  gameData = undefined;

  countdown.destroy();
}

function onBoard(boardData: IBoard): void {
  countdown.stop();
  if (boardData.event !== "Takeout finished" || !legIsWon()) return;

  countdown.start(findNextLegButton, seconds);
}

function legIsWon(): boolean {
  return (gameData?.match?.gameWinner ?? -1) >= 0;
}

/**
 * Null once the leg is no longer won — which is what happens the moment the
 * button is pressed, by us or by anyone else. The countdown stops on its own
 * rather than pressing whatever has taken the button's place.
 */
function findNextLegButton(): HTMLElement | null {
  if (!legIsWon()) return null;

  return qs<HTMLElement>(SELECTORS.match.nextLegButton)
    ?? qsText<HTMLElement>(SELECTORS.match.matchButtons, SELECTORS.match.nextLegButtonText);
}
