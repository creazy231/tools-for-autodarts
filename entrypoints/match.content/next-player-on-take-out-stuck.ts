import type { IBoard } from "@/utils/board-data-storage";

import { AutodartsToolsConfig } from "@/utils/storage";
import { waitForElementWithTextContent } from "@/utils";
import { AutodartsToolsBoardData } from "@/utils/board-data-storage";

let boardDataWatcherUnwatch: any;
let takeOutTimout: NodeJS.Timeout | undefined;
let clickListenerAttached = false;

function removeCountdown() {
  const element = document.getElementById("ad-ext_next-text");
  element?.remove();
  if (takeOutTimout) clearInterval(takeOutTimout);
}

export async function nextPlayerOnTakeOutStuck() {
  try {
    console.warn("Autodarts Tools: Next player on take out stuck");

    const config = await AutodartsToolsConfig.getValue();

    // Document-level listeners keep working in fullscreen, so a single registration is enough
    if (!clickListenerAttached) {
      document.addEventListener("click", removeCountdown);
      clickListenerAttached = true;
    }

    boardDataWatcherUnwatch?.();

    boardDataWatcherUnwatch = AutodartsToolsBoardData.watch(async (boardData: IBoard) => {
      const nextBtnTextEl = document.getElementById("ad-ext_next-text");
      nextBtnTextEl?.remove();

      if (takeOutTimout) clearInterval(takeOutTimout);

      const gameData = await AutodartsToolsGameData.getValue();
      if (gameData.match?.variant === "Bull-off") return;

      if (boardData.status === "Takeout in progress") {
        console.warn("Autodarts Tools: Takeout in progress");

        // Use a more robust selector that works in both normal and fullscreen modes
        // Increase timeout to allow more time for DOM to settle in fullscreen mode
        let nextBtn = await waitForElementWithTextContent("button", "Next", 2000);
        if (!nextBtn) {
          console.warn("Autodarts Tools: Next button not found, retrying with different approach");
          // Try another approach if the button wasn't found
          const buttons = document.querySelectorAll("button");
          for (const btn of buttons) {
            if (btn.textContent?.trim() === "Next") {
              nextBtn = btn as HTMLElement;
              break;
            }
          }
          if (!nextBtn) return;
        }

        let startSec = config.nextPlayerOnTakeOutStuck.sec;

        const nextBtnTextEl = document.createElement("span");
        nextBtnTextEl.id = "ad-ext_next-text";
        nextBtnTextEl.style.whiteSpace = "pre";
        nextBtnTextEl.textContent = ` (${startSec})`;
        nextBtn.appendChild(nextBtnTextEl);

        takeOutTimout = setInterval(() => {
          startSec--;
          nextBtnTextEl.textContent = ` (${startSec})`;

          if (startSec <= 0) {
            if (takeOutTimout) {
              nextBtnTextEl.textContent = ""; // Reset the button text
              clearInterval(takeOutTimout);
            }
            if (nextBtn instanceof HTMLElement) {
              console.log("Autodarts Tools: Auto-clicking Next button");
              nextBtn.click();
            }
            const element = document.getElementById("ad-ext_next-text");
            element?.remove();
          }
        }, 1000);
      } else {
        if (takeOutTimout) clearInterval(takeOutTimout);
        removeCountdown();
      }
    });
  } catch (e) {
    console.error("Autodarts Tools: Next player on takeout stuck - Error: ", e);
  }
}

export function nextPlayerOnTakeOutStuckOnRemove() {
  if (boardDataWatcherUnwatch) {
    boardDataWatcherUnwatch();
    boardDataWatcherUnwatch = null;
  }

  removeCountdown();

  if (clickListenerAttached) {
    document.removeEventListener("click", removeCountdown);
    clickListenerAttached = false;
  }
}
