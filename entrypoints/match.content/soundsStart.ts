import { AutodartsToolsConfig } from "@/utils/storage";
import { AutodartsToolsSoundsConfig } from "@/utils/soundsStorage";
import { playSound } from "@/utils/playSound";
import { AutodartsToolsCallerConfig } from "@/utils/callerStorage";

export async function soundsStart() {
  const config = await AutodartsToolsConfig.getValue();
  const soundConfig = await AutodartsToolsSoundsConfig.getValue();
  const callerConfig = await AutodartsToolsCallerConfig.getValue();

  if (!config.sounds.enabled) return;

  const playerNameSoundExists = await playPlayerNameSound(callerConfig);

  if (playerNameSoundExists) {
    setTimeout(() => {
      playGameOnSound(soundConfig);
    }, 1200); // Delay the "gameOn" sound by 1.2 seconds
  } else {
    playGameOnSound(soundConfig);
  }
}

async function playPlayerNameSound(callerConfig: ReturnType<typeof AutodartsToolsCallerConfig.getValue>): Promise<boolean> {
  const isCallerEnabled = (await AutodartsToolsConfig.getValue()).caller.enabled;
  const activeCallerIndex = callerConfig.caller.findIndex((caller) => caller.isActive);
  if (isCallerEnabled && activeCallerIndex !== -1) {
    const activeCallerConfig = callerConfig.caller[activeCallerIndex];
    let callerServerUrl = activeCallerConfig.url || "";
    if (callerServerUrl.at(-1) !== "/") callerServerUrl += "/";
    const callerFileExt = activeCallerConfig.fileExt || ".mp3";

    // Get the player name from the DOM
    const playerEl: HTMLElement | null = document.querySelector(".ad-ext-player-active .ad-ext-player-name");
    const playerName = playerEl?.innerText.toLowerCase();

    if (playerName) {
      const soundExists = await PlayPlayerSound(callerServerUrl, callerFileExt, playerName, 1);
      return soundExists;
    }
  }
  return false;
}

async function playGameOnSound(soundConfig: ReturnType<typeof AutodartsToolsSoundsConfig.getValue>) {
  if (soundConfig.gameOn?.data || soundConfig.gameOn?.info) {
    await playSound("gameOn", 2);
  }
}

async function PlayPlayerSound(callerServerUrl, callerFileExt, playerName, volume): Promise<boolean> {
  const soundUrl = `${callerServerUrl}${playerName}${callerFileExt}`;

  // Check if the file exists may need to configure CORS to allow GET/FETCH/HEAD from https://play.autodarts.io to access the sound files
  const response = await fetch(soundUrl, { method: 'HEAD' });
  if (response.ok) {
    const audio = new Audio(soundUrl);
    audio.volume = volume;
    audio.play();
    return true;
  } else {
    console.log(`The file ${soundUrl} does not exist.`);
    return false;
  }
}