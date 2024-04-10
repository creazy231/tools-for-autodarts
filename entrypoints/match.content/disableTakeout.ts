import { AutodartsToolsConfig, AutodartsToolsMatchStatus } from "@/utils/storage";
import { getNextBtn, getResetBtn, getStartBtn, getStopBtn } from "@/utils/getElements";

export async function disableTakeout() {
  const { disableTakeout } = await AutodartsToolsConfig.getValue();
  if (!disableTakeout.enabled) return;

  try {
    AutodartsToolsMatchStatus.watch(async (matchStatus) => {
      if (matchStatus.isInEditMode || matchStatus.isInUndoMode) {
        getStartBtn()?.click();
      }
      if (matchStatus.throws.length === 3) {
        getStopBtn()?.click();
      };
    });

    const nextBtn = getNextBtn();
    nextBtn?.addEventListener("click", () => {
      getResetBtn()?.click();
      setTimeout(() => {
        getStartBtn()?.click();
      }, 100);
    });
  } catch (e) {
    console.error("Autodarts Tools: disable takeout recognition - Error: ", e);
  }
}
