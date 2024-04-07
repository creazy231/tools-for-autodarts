import { AutodartsToolsConfig } from "@/utils/storage";
import { AutodartsToolsSoundsConfig } from "@/utils/soundsStorage";
import { playSound } from "@/utils/playSound";

export async function soundsStart() {
  const config = await AutodartsToolsConfig.getValue();
  const soundConfig = await AutodartsToolsSoundsConfig.getValue();
  if (!config.sounds.enabled) return;

  if (soundConfig.gameOn?.data || soundConfig.gameOn?.info) {
    await playSound("gameOn", 2);
  }
}
