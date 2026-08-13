import type { IConfig } from "@/utils/storage";

import { addStyles, waitForElement } from "@/utils";
import { AutodartsToolsGameData, GameMode } from "@/utils/game-data-storage";
import { AutodartsToolsConfig } from "@/utils/storage";

// CSS styles for winner animation
const WINNER_ANIMATION_STYLES = `
  .ad-ext-player-winner .ad-ext-player-score {
    text-align: center;
    line-height: 1;
    margin-bottom: 0;
  }
  
  #ad-ext_winner-animation--message {
    text-align: center;
    line-height: 1;
  }

  .ad-ext_winner-score-wrapper + div{
    margin-bottom: 1rem;
  }

  .ad-ext_winner-animation {
    overflow: visible;
    position: relative;
    z-index: 1;
  }

  .ad-ext_winner-animation > div:first-child {
    border-radius: 5px;
    background: linear-gradient(0deg, #000000, #212121);
  }

  .ad-ext_winner-animation:before,
  .ad-ext_winner-animation:after {
    content: "";
    position: absolute;
    left: -2px;
    top: -2px;
    background: linear-gradient(
      45deg,
      #fb0094,
      #0000ff,
      #00ff00,
      #ffff00,
      #ff0000,
      #fb0094,
      #0000ff,
      #00ff00,
      #ffff00,
      #ff0000
    );
    background-size: 400%;
    width: calc(100% + 4px);
    height: calc(100% + 4px);
    z-index: -1;
    animation: steam 20s linear infinite;
    border-radius: 5px;
  }

  .ad-ext_winner-animation .ad-ext-player-winner + div {
    border-radius: 5px;
    background: black;
    margin-top: 2px;
  }
  
  @keyframes steam {
    0% {
      background-position: 0 0;
    }
    50% {
      background-position: 400% 0;
    }
    100% {
      background-position: 0 0;
    }
  }

  .ad-ext_winner-animation:after {
    filter: blur(50px);
  }
`;

// Motivation text mapping based on game type and darts thrown
const MOTIVATION_TEXT = [ "UNBELIEVABLE!", "Splendid Game!", "Great Game!", "Nice Game!" ];
const MOTIVATION_MAPPING: Record<string, number[]> = {
  v121: [ 3, 4, 5, 6 ],
  v170: [ 3, 5, 7, 9 ],
  v301: [ 6, 9, 12, 15 ],
  v501: [ 9, 15, 20, 25 ],
  v701: [ 12, 18, 23, 28 ],
  v901: [ 16, 22, 27, 32 ],
};

let gameDataWatcher: (() => void) | null = null;

/**
 * Removes winner animation styling and elements
 */
export async function removeWinnerAnimation(): Promise<void> {
  await waitForElement("#ad-ext-turn");

  try {
    document.querySelectorAll(".ad-ext-player-score")?.forEach((el) => {
      (el as HTMLElement).style.fontSize = "";
      (el as HTMLElement).style.lineHeight = "";
    });

    document.getElementById("ad-ext_winner-animation--message")?.remove();

    const winnerAnimationContainer = document.querySelector(".ad-ext_winner-animation");
    if (!winnerAnimationContainer) return;

    const winnerScoreWrapperEl = winnerAnimationContainer?.querySelector(".ad-ext_winner-score-wrapper");
    if (winnerScoreWrapperEl) (winnerScoreWrapperEl as HTMLElement).style.height = "";

    document.querySelector(".ad-ext_winner-animation")?.classList.remove("ad-ext_winner-animation");
  } catch (e) {
    console.error("Autodarts Tools: Remove Winner Animation - Error: ", e);
  }
}

/**
 * Removes winner animation when game is edited
 */
export async function removeWinnerAnimationOnEdit(): Promise<void> {
  try {
    await removeWinnerAnimation();
  } catch (e) {
    console.error("Autodarts Tools: Remove Winner Animation on Edit - Error: ", e);
  }
}

/**
 * Applies winner animation based on game data
 */
async function applyWinnerAnimation(gameData: any): Promise<void> {
  if (!gameData?.match) return;

  // If match is activated (>= 0), call removeWinnerAnimationOnEdit
  if ((gameData.match.activated !== undefined && gameData.match.activated >= 0) || (gameData.match.winner === -1 && gameData.match.gameWinner === -1)) {
    return await removeWinnerAnimationOnEdit();
  }

  try {
    const winnerPlayerCard = document.querySelector(".ad-ext-player-winner");
    const winnerScoreEl = winnerPlayerCard?.querySelector(".ad-ext-player-score");
    if (!winnerScoreEl) return;

    const dartsThrown = gameData.match.stats[0].matchStats.dartsThrown;
    const winnerPlayerCardContainer = winnerPlayerCard?.parentElement;
    let winnerScoreWrapperEl = winnerPlayerCard?.querySelector(".ad-ext_winner-score-wrapper");

    const winnerScoreElHeight = winnerScoreWrapperEl?.clientHeight || winnerScoreEl.clientHeight;

    if (!winnerScoreWrapperEl) {
      winnerScoreWrapperEl = document.createElement("div");
      winnerScoreWrapperEl.classList.add("ad-ext_winner-score-wrapper");
      winnerScoreEl.parentNode?.insertBefore(winnerScoreWrapperEl, winnerScoreEl);
      winnerScoreWrapperEl.appendChild(winnerScoreEl);

      (winnerScoreWrapperEl as HTMLElement).style.height = `${winnerScoreElHeight}px`;
    }

    const config: IConfig = await AutodartsToolsConfig.getValue();

    if (!config.winnerAnimation.enabled) return;

    // Add animation class to container
    winnerPlayerCardContainer?.classList.add("ad-ext_winner-animation");

    // Create and add winner message
    document.getElementById("ad-ext_winner-animation--message")?.remove();
    const winnerAnimationMessageElement = document.createElement("p");
    winnerAnimationMessageElement.id = "ad-ext_winner-animation--message";
    winnerAnimationMessageElement.textContent = "Game Shot!";
    winnerAnimationMessageElement.style.fontSize = "4.85cqmin";
    winnerAnimationMessageElement.style.lineHeight = `${winnerScoreElHeight / 5 * 3.6}px`;

    (winnerScoreEl as HTMLElement).style.fontSize = `${winnerScoreElHeight / 5 * 1.4}px`;
    (winnerScoreEl as HTMLElement).style.lineHeight = `${winnerScoreElHeight / 5 * 1.4}px`;
    winnerScoreWrapperEl.appendChild(winnerAnimationMessageElement);

    if (gameData.gameMode !== GameMode.X01) return;

    // Set motivation text based on game type and darts thrown
    let baseScore = "";
    if (gameData.match.settings && "baseScore" in gameData.match.settings) {
      baseScore = gameData.match.settings.baseScore.toString();
    } else {
      baseScore = document.querySelector("#ad-ext-game-variant")?.nextSibling?.textContent || "";
    }

    if (!baseScore || !dartsThrown) return;

    const baseScoreKeys = MOTIVATION_MAPPING[`v${baseScore}`];
    if (baseScoreKeys) {
      baseScoreKeys.some((key, index) => {
        if (key >= dartsThrown) {
          winnerAnimationMessageElement.textContent = MOTIVATION_TEXT[index];
          return true;
        }
        return false;
      });
    }
  } catch (e) {
    console.warn("Autodarts Tools: Winner Animation - Error: ", e);
  }
}

/**
 * Sets up and displays the winner animation
 */
export async function winnerAnimation(): Promise<void> {
  console.log("Autodarts Tools: Winner Animation - Initializing");

  addStyles(WINNER_ANIMATION_STYLES, "winner-animation");
  await waitForElement("#ad-ext-turn");

  if (gameDataWatcher) {
    gameDataWatcher();
  }

  // Initial check when function is called
  const initialGameData = await AutodartsToolsGameData.getValue();
  await applyWinnerAnimation(initialGameData);

  gameDataWatcher = AutodartsToolsGameData.watch(async (gameData) => {
    await applyWinnerAnimation(gameData);
  });
}

/**
 * Cleanup function to remove watcher when component is unmounted
 */
export function winnerAnimationOnRemove(): void {
  if (gameDataWatcher) {
    gameDataWatcher();
    gameDataWatcher = null;
  }
}
