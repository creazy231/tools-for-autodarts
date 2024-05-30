import { AutodartsToolsConfig } from "@/utils/storage";
import { AutodartsToolsCallerConfig } from "@/utils/callerStorage";

export async function soundsPlayer(): Promise<boolean> {
  const config = await AutodartsToolsConfig.getValue();
  const callerConfig = await AutodartsToolsCallerConfig.getValue();

  if (!config.caller.enabled) {
    return false;
  }

  const playerNameSoundExists = await playPlayerNameSound(callerConfig);
  if (playerNameSoundExists) {
    console.log("Player name sound exists!");
    return true;
  }

  return false;
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
