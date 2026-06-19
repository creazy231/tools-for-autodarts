import type { IBoard } from "@/utils/board-data-storage";

import { AutodartsToolsConfig } from "@/utils/storage";
import { waitForElementWithTextContent } from "@/utils";
import { AutodartsToolsBoardData } from "@/utils/board-data-storage";
import i18next from "@/utils/translate";

let boardDataWatcherUnwatch: any;

// Create a map to store event listeners
const eventListenersMap = new Map();

// Create a wrapper around addEventListener
// @ts-expect-error
Document.prototype.realAddEventListener = Document.prototype.addEventListener;
Document.prototype.addEventListener = function (eventName, callback) {
// @ts-expect-error
  this.realAddEventListener(eventName, callback);

  if (!eventListenersMap.has(eventName)) {
    eventListenersMap.set(eventName, []);
  }

  eventListenersMap.get(eventName).push(callback);
};

// Create a function to check if an event listener has been defined
function hasEventListener(eventName, callback) {
  const listeners = eventListenersMap.get(eventName);
  return listeners && listeners.includes(callback);
}

export async function nextPlayerOnTakeOutStuck() {
  try {
    console.warn("Autodarts Tools: Next player on take out stuck");

    const config = await AutodartsToolsConfig.getValue();

    let takeOutTimout: NodeJS.Timeout;

    function remove() {
      const element = document.getElementById("ad-ext_next-text");
      element?.remove();
      if (takeOutTimout) clearInterval(takeOutTimout);
    }

    // Make sure event listeners are properly registered and maintained in fullscreen mode
    if (!hasEventListener("click", remove)) {
      document.addEventListener("click", remove);
    }

    // Handle fullscreen changes
    function handleFullscreenChange() {
      if (document.fullscreenElement) {
        console.log("Autodarts Tools: Fullscreen mode detected, ensuring next player on takeout stuck still works");
        // Re-register click event if needed in fullscreen
        if (!hasEventListener("click", remove)) {
          document.addEventListener("click", remove);
        }
      }
    }

    // Add fullscreen change handler if not already present
    if (!hasEventListener("fullscreenchange", handleFullscreenChange)) {
      document.addEventListener("fullscreenchange", handleFullscreenChange);
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
        let nextBtn = await waitForElementWithTextContent("button", i18next.t('next'), 2000);
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
        remove();
      }
    });
  } catch (e) {
    console.error("Autodarts Tools: Next player on takeout stuck - Error: ", e);
  }
}

export function nextPlayerOnTakeOutStuckOnRemove() {
  if (boardDataWatcherUnwatch) {
    boardDataWatcherUnwatch();
  }

  // Clean up fullscreen event listener
  const fullscreenHandler = eventListenersMap.get("fullscreenchange")?.find(
    callback => callback.name === "handleFullscreenChange",
  );

  if (fullscreenHandler) {
    document.removeEventListener("fullscreenchange", fullscreenHandler);
  }

  // Clean up click handler
  const clickHandler = eventListenersMap.get("click")?.find(
    callback => callback.name === "remove",
  );

  if (clickHandler) {
    document.removeEventListener("click", clickHandler);
  }
}
