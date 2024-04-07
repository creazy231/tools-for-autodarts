import type { IConfig } from "@/utils/storage";
import { AutodartsToolsBoardStatus, AutodartsToolsConfig } from "@/utils/storage";
import { BoardStatus } from "@/utils/types";
import { waitForElement } from "@/utils";

export async function automaticNextLeg() {
  await waitForElement("#ad-ext-turn");
  try {
    const config: IConfig = await AutodartsToolsConfig.getValue();
    if (!config.automaticNextLeg.enabled) return;

    const playerWithAccount = document.querySelectorAll(".ad-ext-player a[href^='/users']:not([href^='/users/null'])");
    if (playerWithAccount.length > 1) return;

    const boardStatus = await AutodartsToolsBoardStatus.getValue();
    if (boardStatus !== BoardStatus.THROW) return;

    const buttons = [ ...document.querySelectorAll(".chakra-button") as NodeList ];
    const nextLegBtn = buttons.find(button => (button as HTMLElement).innerText === "Next Leg");
    if (!nextLegBtn) return;

    let startSec = config.automaticNextLeg.sec;

    const nextLegBtnTextEl = document.createElement("span");
    nextLegBtnTextEl.id = "ad-ext_next-leg-text";
    nextLegBtnTextEl.style.whiteSpace = "pre";
    nextLegBtnTextEl.textContent = ` (${startSec})`;
    nextLegBtn.appendChild(nextLegBtnTextEl);

    const nextLegInterval = setInterval(() => {
      startSec--;
      nextLegBtnTextEl.textContent = ` (${startSec})`;

      if (startSec <= 0) {
        clearInterval(nextLegInterval);
        (nextLegBtn as HTMLElement).click();
      }
    }, 1000);
  } catch (e) {
    console.error("Autodarts Tools: Automatic Next Leg - Error: ", e);
  }
}
