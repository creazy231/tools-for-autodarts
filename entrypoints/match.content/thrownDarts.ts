import { waitForElement } from "@/utils";
import { getDartsThrown, getWinnerPlayerCard } from "@/utils/getElements";
import type { IConfig } from "@/utils/storage";
import { AutodartsToolsConfig } from "@/utils/storage";

export async function thrownDarts() {
  await waitForElement("#ad-ext-turn");

  try {
    const config: IConfig = await AutodartsToolsConfig.getValue();
    if (!config.thrownDartsOnWin.enabled) return;

    const winnerPlayerCard = getWinnerPlayerCard();
    const winnerScoreEl = winnerPlayerCard?.querySelector(".ad-ext-player-score");

    const dartsThrown = getDartsThrown(winnerPlayerCard as HTMLElement);
    if (!dartsThrown || !winnerScoreEl) return;

    (winnerScoreEl as HTMLElement).innerText = `${dartsThrown} Darts`;
  } catch (e) {
    console.error("Autodarts Tools: Winner Animation - Error: ", e);
  }
}
