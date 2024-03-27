import { AutodartsToolsConfig, AutodartsToolsMatchStatus } from "@/utils/storage";
import { AutodartsToolsCallerConfig } from "@/utils/callerStorage";
import { AutodartsToolsSoundsConfig } from "@/utils/soundsStorage";

import { playPointsSound, playSound1, playSound2, playSound3 } from "@/utils/playSound";
import { isCricket } from "@/utils/helpers";

export async function sounds() {
  const isCallerEnabled = (await AutodartsToolsConfig.getValue()).caller.enabled;
  const callerActive = (await AutodartsToolsCallerConfig.getValue()).caller.filter(caller => caller.isActive)[0];

  const soundConfig = await AutodartsToolsSoundsConfig.getValue();
  const matchStatus = (await AutodartsToolsMatchStatus.getValue());

  // if (!isCallerEnabled || !callerActive) return;

  let callerServerUrl = callerActive?.url || "";
  if (callerServerUrl.at(-1) !== "/") callerServerUrl += "/";
  const callerFileExt = callerActive?.fileExt || ".mp3";

  const turnPoints = matchStatus.turnPoints;
  const throwPointsArr = matchStatus.throws;

  const curThrowPointsName = throwPointsArr.slice(-1)[0];

  const playerEl: HTMLElement | null = document.querySelector(".ad-ext-player-active .ad-ext-player-name");
  const playerName = playerEl && playerEl.innerText;

  const turnContainerEl = document.getElementById("ad-ext-turn");
  const letsGo = [ ...turnContainerEl?.querySelectorAll("div") as NodeListOf<HTMLElement> ].filter(el => !el.classList.contains("ad-ext-turn-throw")).length === 4;

  if (letsGo) playSound1(soundConfig.playerStart);

  // console.log("curThrowPointsName", curThrowPointsName);

  let curThrowPointsNumber: number = -1;
  let curThrowPointsBed: string = "";
  let curThrowPointsMultiplier: number = 1;

  if (curThrowPointsName) {
    if (curThrowPointsName.startsWith("M")) {
      curThrowPointsNumber = 0;
      curThrowPointsBed = "Outside";
    } else if (curThrowPointsName === "BULL") {
      console.log("bull");
      curThrowPointsNumber = 25;
      curThrowPointsBed = "D";
    } else if (curThrowPointsName === "25") {
      curThrowPointsNumber = 25;
      curThrowPointsBed = "S";
    } else {
      curThrowPointsNumber = Number.parseInt(curThrowPointsName.slice(1));
      curThrowPointsBed = curThrowPointsName.charAt(0);
    }

    if (curThrowPointsBed === "D") curThrowPointsMultiplier = 2;
    if (curThrowPointsBed === "T") curThrowPointsMultiplier = 3;
  }

  // console.log("curThrowPointsNumber", curThrowPointsNumber);
  // console.log("curThrowPointsBed", curThrowPointsBed);
  // console.log("curThrowPointsMultiplier", curThrowPointsMultiplier);

  const isBot = curThrowPointsName?.length && playerName && playerName.startsWith("BOT LEVEL");
  if (isBot) {
    if (curThrowPointsBed === "Outside") {
      playSound3(soundConfig.botOutside);
    } else {
      playSound3(soundConfig.bot);
    }
  }

  setTimeout(async () => {
    if (turnPoints === "BUST") {
      if (soundConfig.bust?.length) {
        playSound2(soundConfig.bust);
      } else if (callerServerUrl.length && isCallerEnabled) {
        playSound2(`${callerServerUrl}` + `0${callerFileExt}`);
      }
    } else {
      if (curThrowPointsName === "BULL") {
        playSound2(soundConfig.bull);
      } else if (curThrowPointsBed === "Outside") {
        const missLength = soundConfig.miss.length;
        const randomMissCount = Math.floor(Math.random() * missLength);
        playSound2(soundConfig.miss[randomMissCount]);
      } else if (curThrowPointsMultiplier === 3) { // Triple
        if (!(isCricket() && curThrowPointsNumber < 15)) {
          if (curThrowPointsNumber >= 15 && soundConfig[`T${curThrowPointsNumber}`].length) {
            playSound2(soundConfig[`T${curThrowPointsNumber}`]);
          } else {
            playSound2(soundConfig.T);
          }
        }
      }
      /// ///////////// Cricket ////////////////////
      // if (isCricket()) {
      //   if (curThrowPointsNumber >= 0) {
      //     if (curThrowPointsNumber >= 15 && !cricketClosedPoints.includes(curThrowPointsNumber)) {
      //       setCricketClosedPoints();
      //       playSound3(soundConfig.cricketHit);
      //     } else {
      //       playSound3(soundConfig.cricketMiss);
      //     }
      //   }
      // }

      if (isCallerEnabled && throwPointsArr.length === 3 && !(isCricket() && turnPoints === "0") && !matchStatus.isInEditMode && turnPoints !== "BUST" && callerServerUrl.length && callerFileExt.length) {
        playPointsSound(callerServerUrl, callerFileExt, turnPoints);
      }
    }
  }, isBot ? 500 : 0);
}
