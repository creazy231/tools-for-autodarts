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

  // The site draws Next Leg only once its GAME SHOT animation is over, about
  // three seconds after a won leg or set and four after a match, and every
  // game of Count Up counts as a match. Darts pulled quicker than that left the
  // countdown no button to start on, so it never ran. The time now runs from
  // the takeout all the same, and goes on the button when it is drawn.
  countdown.start(findNextLegButton, seconds, legIsWon);
}

/**
 * A leg is won, and the match goes on.
 *
 * Not `winner < 0`: a match played without legs or sets — Count Up and the
 * other practice games — is finished after every game, with its winner set,
 * and the site offers Next Leg all the same. It holds Next Leg back only once
 * a match played to legs or sets is won. Teams' team view marks the match
 * decided when an own-score team's legs reach the target while the site's own
 * match is still open (utils/teams.ts), and Next Leg must stay unpressed then.
 */
function legIsWon(): boolean {
  const match = gameData?.match;
  if (!match || (match.gameWinner ?? -1) < 0 || match.adtTeams?.decided) return false;
  return !match.finished || (!match.legs && !match.sets);
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
