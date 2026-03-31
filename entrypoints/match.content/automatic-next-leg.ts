import type { IConfig } from "@/utils/storage";
import type { IGameData } from "@/utils/game-data-storage";

import { AutodartsToolsConfig } from "@/utils/storage";
import { waitForElement, waitForElementWithTextContent } from "@/utils";

let gameDataWatcherUnwatch: any;
let boardDataWatcherUnwatch: any;

let gameData: IGameData;
let nextLegInterval: NodeJS.Timeout | undefined;

function cleanupCountdown() {
  if (nextLegInterval) {
    clearInterval(nextLegInterval);
    nextLegInterval = undefined;
  }
  const existingEl = document.getElementById("ad-ext_next-leg-text");
  existingEl?.remove();
}

export async function automaticNextLeg() {
  console.warn("Autodarts Tools: Automatic Next Leg - TEST THIS WITH LIVE BOARD");

  await waitForElement("#ad-ext-turn");
  try {
    const config: IConfig = await AutodartsToolsConfig.getValue();

    gameDataWatcherUnwatch = AutodartsToolsGameData.watch(async (_gameData: IGameData, _oldGameData: IGameData) => {
      gameData = _gameData;
    });

    boardDataWatcherUnwatch = AutodartsToolsBoardData.watch(async (_boardData: IBoard, _oldBoardData: IBoard) => {
      cleanupCountdown();

      if (_boardData.event === "Takeout finished" && (gameData.match?.gameWinner ?? -1) >= 0) {
        const nextLegBtn = await waitForElementWithTextContent("button", ["Next Leg", "Nächstes Leg", "Volgende leg"]);
        if (!nextLegBtn) return;
        let startSec = config.automaticNextLeg.sec;

        const nextLegBtnTextEl = document.createElement("span");
        nextLegBtnTextEl.id = "ad-ext_next-leg-text";
        nextLegBtnTextEl.style.whiteSpace = "pre";
        nextLegBtnTextEl.textContent = ` (${startSec})`;
        nextLegBtn.appendChild(nextLegBtnTextEl);

        nextLegInterval = setInterval(() => {
          startSec--;
          nextLegBtnTextEl.textContent = ` (${startSec})`;

          if (startSec <= 0) {
            cleanupCountdown();
            (nextLegBtn as HTMLElement).click();
          }
        }, 1000);
      }
    });
  } catch (e) {
    console.error("Autodarts Tools: Automatic Next Leg - Error: ", e);
  }
}

export function automaticNextLegOnRemove() {
  cleanupCountdown();
  gameDataWatcherUnwatch?.();
  boardDataWatcherUnwatch?.();
}
