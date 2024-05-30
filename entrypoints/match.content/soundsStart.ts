import { AutodartsToolsConfig } from "@/utils/storage";
import { AutodartsToolsSoundsConfig } from "@/utils/soundsStorage";
import { playSound } from "@/utils/playSound";
import { soundsPlayer } from "@/entrypoints/match.content/soundsPlayer";

export async function soundsStart() {
  const config = await AutodartsToolsConfig.getValue();
  const soundConfig = await AutodartsToolsSoundsConfig.getValue();
  if (!config.sounds.enabled) return;

  // Call the soundsPlayer function and check if the player name sound was played
  const playerNameSoundPlayed = await soundsPlayer();

  // Introduce the delay only if the player name sound was played
  if (playerNameSoundPlayed) {
    await new Promise(resolve => setTimeout(resolve, 1200));
  }

  if (soundConfig.gameOn?.data || soundConfig.gameOn?.info) {
    await playSound("gameOn", 2);
  }
}