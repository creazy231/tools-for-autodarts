import { AutodartsToolsConfig, AutodartsToolsMatchStatus } from "@/utils/storage";
import { addStyles } from "@/utils";
import { AutodartsToolsCallerConfig } from "@/utils/callerStorage";
import { AutodartsToolsSoundsConfig } from "@/utils/soundsStorage";

import { playPointsSound, playSound2, playSound3 } from "@/utils/playSound";

export async function caller() {
  addStyles(`

        `);

  const isCallerEnabled = (await AutodartsToolsConfig.getValue()).caller.enabled;
  const soundAfterBotThrow = true;
  const callerArr = (await AutodartsToolsCallerConfig.getValue()).caller;
  const callerActive = (await AutodartsToolsCallerConfig.getValue()).caller.filter(caller => caller.isActive)[0];

  const isInEditMode = (await AutodartsToolsMatchStatus.getValue()).isInEditMode;
  // Sounds
  const soundServerUrl = "https://autodarts-plus.x10.mx";
  const bustSound = (await AutodartsToolsSoundsConfig.getValue()).bust;

  const handleCaller = () => {
    if (!isCallerEnabled || !callerActive) return;

    let callerServerUrl = callerActive?.url || "";
    if (callerServerUrl.at(-1) !== "/") callerServerUrl += "/";
    const callerFileExt = callerActive?.fileExt || ".mp3";

    const turnContainerEl = document.getElementById("ad-ext-turn");

    const turnPoints = document.querySelector<HTMLElement>(".ad-ext-turn-points")?.innerText.trim();
    // TODO: Timo - class only for thrown darts
    const throwPointsArr = [ ...turnContainerEl?.querySelectorAll(".ad-ext-turn-throw") as NodeListOf<HTMLElement> ].map(el => el.innerText);

    const curThrowPointsName = throwPointsArr.slice(-1)[0];

    const playerEl: HTMLElement | null = document.querySelector(".ad-ext-player-active .ad-ext-player-name");
    const playerName = playerEl && playerEl.innerText;

    let curThrowPointsNumber: number = -1;
    let curThrowPointsBed: string = "";
    let curThrowPointsMultiplier: number = 1;

    if (curThrowPointsName) {
      if (curThrowPointsName.startsWith("M")) {
        curThrowPointsNumber = 0;
        curThrowPointsBed = "Outside";
      } else if (curThrowPointsName === "Bull") {
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

    const isBot = curThrowPointsName?.length && playerName && playerName.startsWith("BOT LEVEL");
    if (soundAfterBotThrow && isBot) {
      if (curThrowPointsBed === "Outside") {
        playSound3(`${soundServerUrl}/` + "sound_wood-block.mp3");
      } else {
        playSound3(`${soundServerUrl}/` + "sound_chopping-wood.mp3");
      }
    }

    setTimeout(async () => {
      if (turnPoints === "BUST") {
        if (bustSound?.length) {
          playSound2(bustSound);
        } else if (callerServerUrl.length) {
          playSound2(`${callerServerUrl}` + `0${callerFileExt}`);
        }
      } else {
        // if (curThrowPointsName === 'BULL') {
        //   if (triplesound === '1') {
        //     playSound2(soundServerUrl + '/' + 'beep_1.mp3');
        //   }
        //   if (triplesound === '2') {
        //     playSound2(soundServerUrl + '/' + 'beep_2_bullseye.mp3');
        //   }
        // } else if (curThrowPointsBed === 'Outside') {
        //   if (boosound === true) {
        //     const randomMissCount = Math.floor(Math.random() * 3) + 1;
        //     playSound2(soundServerUrl + '/' + 'miss_' + randomMissCount + '.mp3');
        //   }
        // } else {
        //   if (matchVariant === 'X01' || (matchVariant === 'Cricket' && curThrowPointsNumber >= 15)) {
        //     if (curThrowPointsMultiplier === 3) {
        //       if (triplesound === '1') {
        //         playSound2(soundServerUrl + '/' + 'beep_1.mp3');
        //       }
        //       if (triplesound === '2' && curThrowPointsNumber >= 17) {
        //         playSound2(soundServerUrl + '/' + 'beep_2_' + curThrowPointsNumber + '.wav');
        //       }
        //     }
        //   }
        // }

        if (throwPointsArr.length === 3 && !isInEditMode && turnPoints !== "BUST" && callerServerUrl.length && callerFileExt.length) {
          playPointsSound(callerServerUrl, callerFileExt, turnPoints);
        }
      }
    }, isBot ? 500 : 0);
  };

  handleCaller();
}
