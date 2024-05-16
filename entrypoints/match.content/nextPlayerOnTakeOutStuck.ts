import type { TBoardStatus } from "@/utils/storage";
import { AutodartsToolsBoardStatus, AutodartsToolsConfig } from "@/utils/storage";
import { BoardStatus } from "@/utils/types";
import { waitForElementWithTextContent } from "@/utils";

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
    const configValue = await AutodartsToolsConfig.getValue();
    if (!configValue || !configValue.nextPlayerOnTakeOutStuck || !configValue.nextPlayerOnTakeOutStuck.enabled) return;

    // check if element with id "ad-ext_next-leg-active" is already added to body. if yes, return
    if (document.getElementById("ad-ext_next-leg-active")) return;

    // add element with id "ad-ext_next-leg-active" to body
    const nextLegActiveEl = document.createElement("div");
    nextLegActiveEl.id = "ad-ext_next-leg-active";
    nextLegActiveEl.style.display = "none";
    document.body.appendChild(nextLegActiveEl);

    let takeOutTimout: NodeJS.Timeout;

    function remove() {
      const element = document.getElementById("ad-ext_next-leg-text");
      element?.remove();
      if (takeOutTimout) clearInterval(takeOutTimout);
    }

    if (!hasEventListener("click", remove)) {
      document.addEventListener("click", remove);
    }

    AutodartsToolsBoardStatus.watch(async (boardStatus: TBoardStatus) => {
      const nextBtnTextEl = document.getElementById("ad-ext_next-leg-text");
      nextBtnTextEl?.remove();

      if (takeOutTimout) clearInterval(takeOutTimout);

      if (boardStatus === BoardStatus.TAKEOUT) {
        const nextBtn = await waitForElementWithTextContent("button", "Next", 1000);
        if (!nextBtn) return;

        let startSec = configValue.nextPlayerOnTakeOutStuck.sec;

        const nextBtnTextEl = document.createElement("span");
        nextBtnTextEl.id = "ad-ext_next-leg-text";
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
              nextBtn.click();
            }
            const element = document.getElementById("ad-ext_next-leg-text");
            element?.remove();
          }
        }, 1000);
      }
    });
  } catch (e) {
    console.error("Autodarts Tools: Next player ion takeout stuck - Error: ", e);
  }
}
