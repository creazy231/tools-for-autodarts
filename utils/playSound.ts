import { soundEffect1, soundEffect2, soundEffect3 } from "@/utils/helpers";
import { AutodartsToolsConfig } from "@/utils/storage";

soundEffect1.autoplay = true;
soundEffect2.autoplay = true;
soundEffect3.autoplay = true;

export async function playSound1(fileName) {
  const isSoundsEnabled = (await AutodartsToolsConfig.getValue()).sounds.enabled;
  if (!isSoundsEnabled || !fileName) return;
  // console.log("fileName1", fileName);
  soundEffect1.src = fileName;
}

export async function playSound2(fileName) {
  const isSoundsEnabled = (await AutodartsToolsConfig.getValue()).sounds.enabled;
  if (!isSoundsEnabled || !fileName) return;
  // console.log('fileName2', fileName);
  soundEffect2.src = fileName;
}

export async function playSound3(fileName) {
  const isSoundsEnabled = (await AutodartsToolsConfig.getValue()).sounds.enabled;
  if (!isSoundsEnabled || !fileName) return;
  // console.log('fileName3', fileName);
  soundEffect3.src = fileName;
}

export function playPointsSound(callerServerUrl: string, callerFileExt: string, turnPoints?: string) {
  if (!turnPoints) return;
  if (callerServerUrl?.length) playSound1(callerServerUrl + turnPoints + callerFileExt);
  // if (callerServerUrl?.length) soundEffect1.src = callerServerUrl + turnPoints + callerFileExt;
}
