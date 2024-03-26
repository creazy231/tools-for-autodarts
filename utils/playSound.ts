import { soundEffect1, soundEffect2, soundEffect3 } from "@/utils/helpers";

soundEffect1.autoplay = true;
soundEffect2.autoplay = true;
soundEffect3.autoplay = true;

export function playSound1(fileName) {
  if (!fileName) return;
  // console.log("fileName1", fileName);
  soundEffect1.src = fileName;
}

export function playSound2(fileName) {
  if (!fileName) return;
  // console.log('fileName2', fileName);
  soundEffect2.src = fileName;
}

export function playSound3(fileName) {
  if (!fileName) return;
  // console.log('fileName3', fileName);
  soundEffect3.src = fileName;
}

export function playPointsSound(callerServerUrl: string, callerFileExt: string, turnPoints?: string) {
  if (!turnPoints) return;
  if (callerServerUrl?.length) playSound1(callerServerUrl + turnPoints + callerFileExt);
}
