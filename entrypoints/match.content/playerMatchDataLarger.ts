import { AutodartsToolsConfig } from "@/utils/storage";
import { waitForElement } from "@/utils";

export async function playerMatchDataLarger() {
  await waitForElement("#ad-ext-turn");
  try {
    const config = await AutodartsToolsConfig.getValue();
    if (!config.legsSetsLarger.enabled && !config.playerMatchData.enabled) return;
    const legsSetsLargerSize = config.legsSetsLarger.value || 3;
    const playerMatchDataSize = config.playerMatchData.value || 1.5;
    document.querySelectorAll(".ad-ext-player").forEach((playerCardEl) => {
      playerCardEl?.querySelectorAll("div > div > div > span").forEach((playerMatchDataEl) => {
        if (config.legsSetsLarger.enabled && playerMatchDataEl) {
          playerMatchDataEl.querySelector("p")!.style.fontSize = `${legsSetsLargerSize}rem`;
        }
      });
      if (config.playerMatchData.enabled) {
        (playerCardEl?.querySelector("div:last-of-type > p") as HTMLElement | null)!.style.fontSize = `${playerMatchDataSize}rem`;
      }
    });
  } catch (e) {
    console.error("Autodarts Tools: Larger Legs / Sets - Error: ", e);
  }
}
