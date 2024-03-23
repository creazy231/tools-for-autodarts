// iOS fix
// https://stackoverflow.com/questions/31776548/why-cant-javascript-play-audio-files-on-iphone-safari
const soundEffect1 = new Audio();
soundEffect1.autoplay = true;
const soundEffect2 = new Audio();
soundEffect2.autoplay = true;
const soundEffect3 = new Audio();
soundEffect3.autoplay = true;

export function playSound1(fileName) {
  if (!fileName) return;
  // console.log('fileName1', fileName);
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

export function playPointsSound(callerFolder: string, turnPoints: string, callerServerUrl?: string) {
  if (callerFolder.startsWith("google")) {
    playSound1(`https://autodarts.de.cool/mp3_helper.php?language=${callerFolder.substring(7, 9)}&text=${turnPoints}`);
  } else {
    if (callerFolder?.length && callerServerUrl?.length) playSound1(`${callerServerUrl}/${callerFolder}/${turnPoints}.mp3`);
  }
}
