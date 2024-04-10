import type { IConfig, IMatchStatus } from "@/utils/storage";
import { AutodartsToolsConfig, AutodartsToolsMatchStatus } from "@/utils/storage";
import { getNextBtn } from "@/utils/getElements";

export async function nextPlayerAfter3darts() {
  try {
    const config: IConfig = await AutodartsToolsConfig.getValue();
    if (!config.nextPlayerAfter3darts.enabled) return;

    const matchStatus: IMatchStatus = await AutodartsToolsMatchStatus.getValue();
    if (matchStatus.throws.length < 3) return;
    if (matchStatus.isInEditMode) return;
    if (matchStatus.isInUndoMode) return;
    const playerCount = matchStatus.playerCount;
    if (playerCount > 2) return;

    const isFirstPlayer = matchStatus.playerInfo[0].isActive;
    const dartsSumPlayer1 = Number.parseInt(matchStatus.playerInfo[0].darts || "0");

    if ((playerCount === 2 && isFirstPlayer) || (playerCount === 1 && (dartsSumPlayer1 % 6))) {
      const nextBtn = getNextBtn();
      setTimeout(() => {
        nextBtn?.click();
      }, 500);
    }
  } catch (e) {
    console.error("Autodarts Tools: Next Player after 3 darts - Error: ", e);
  }
}
