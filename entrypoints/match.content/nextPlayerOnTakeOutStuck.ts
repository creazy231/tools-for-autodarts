import type { TBoardStatus } from "@/utils/storage";
import { AutodartsToolsBoardStatus, AutodartsToolsConfig } from "@/utils/storage";
import { BoardStatus } from "@/utils/types";
import { getNextBtn } from "@/utils/getElements";

export async function nextPlayerOnTakeOutStuck() {
  try {
    const { nextPlayerOnTakeOutStuck } = await AutodartsToolsConfig.getValue();
    if (!nextPlayerOnTakeOutStuck.enabled) return;

    let takeOutTimout: NodeJS.Timeout;

    AutodartsToolsBoardStatus.watch(async (boardStatus: TBoardStatus) => {
      takeOutTimout && clearInterval(takeOutTimout);

      if (boardStatus === BoardStatus.TAKEOUT) {
        const nextBtn = getNextBtn();
        if (!nextBtn) return;

        let startSec = nextPlayerOnTakeOutStuck.sec;

        const nextBtnTextEl = document.createElement("span");
        nextBtnTextEl.id = "ad-ext_next-leg-text";
        nextBtnTextEl.style.whiteSpace = "pre";
        nextBtnTextEl.textContent = ` (${startSec})`;
        nextBtn.appendChild(nextBtnTextEl);

        takeOutTimout = setInterval(() => {
          startSec--;
          nextBtnTextEl.textContent = ` (${startSec})`;

          if (startSec <= 0) {
            clearInterval(takeOutTimout);
            (nextBtn as HTMLElement).click();
            document.getElementById("ad-ext_next-leg-text")?.remove();
          }
        }, 1000);
      }
    });
  } catch (e) {
    console.error("Autodarts Tools: Next player ion takeout stuck - Error: ", e);
  }
}
