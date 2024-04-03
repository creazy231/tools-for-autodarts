import { soundEffectArray } from "@/utils/helpers";
import { AutodartsToolsConfig } from "@/utils/storage";
import { AutodartsToolsSoundsConfig } from "@/utils/soundsStorage";

soundEffectArray[0].autoplay = true;
soundEffectArray[1].autoplay = true;
soundEffectArray[2].autoplay = true;

export async function playSound(configKey: string, slot: number = 1, arrIndex?: number) {
  let soundConfig = (await AutodartsToolsSoundsConfig.getValue())[configKey];
  if (typeof arrIndex === "number") soundConfig = soundConfig[arrIndex];
  const isSoundsEnabled = (await AutodartsToolsConfig.getValue()).sounds.enabled;
  const fileName = soundConfig.info;
  if (!isSoundsEnabled || !fileName) return;
  const fileData = soundConfig.data;
  soundEffectArray[slot - 1].src = fileData || fileName;
}

export function playPointsSound(callerServerUrl: string, callerFileExt: string, turnPoints?: string, slot: number = 1) {
  if (!turnPoints) return;
  if (callerServerUrl?.length) soundEffectArray[slot - 1].src = callerServerUrl + turnPoints + callerFileExt;
}
