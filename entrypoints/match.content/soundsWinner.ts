import { AutodartsToolsConfig, AutodartsToolsMatchStatus } from "@/utils/storage";
import { AutodartsToolsCallerConfig } from "@/utils/callerStorage";
import { AutodartsToolsSoundsConfig } from "@/utils/soundsStorage";
import { playPointsSound, playSound } from "@/utils/playSound";

export async function soundsWinner() {
  const matchStatus = (await AutodartsToolsMatchStatus.getValue());

  const throwPointsArr = matchStatus.throws;

  const waitForSumCallingIsOver = throwPointsArr.length === 3 ? 2500 : 0;

  const winnerPlayerCard = document.querySelector(".ad-ext-player-winner");
  const winnerPlayerName = (winnerPlayerCard?.querySelector(".ad-ext-player-name") as HTMLElement)?.innerText;

  const isSoundsEnabled = (await AutodartsToolsConfig.getValue()).sounds.enabled;

  const callerActive = (await AutodartsToolsCallerConfig.getValue()).caller.filter(caller => caller.isActive)[0];
  const soundsConfig = await AutodartsToolsSoundsConfig.getValue();

  if (!isSoundsEnabled) return;

  let callerServerUrl = callerActive?.url || "";
  if (callerServerUrl.at(-1) !== "/") callerServerUrl += "/";

  setTimeout(() => {
    const buttons = [ ...document.querySelectorAll(".chakra-button") as NodeList ];
    const isLegWinner = buttons.findIndex(button => (button as HTMLElement).innerText === "Next Leg") !== -1;
    if (isLegWinner) {
      if (callerServerUrl.length) playPointsSound(callerServerUrl, ".mp3", "gameshot", 3);
    } else {
      const isMatchWinner = buttons.findIndex(button => (button as HTMLElement).innerText === "Finish") !== -1;
      if (isMatchWinner) {
        if (callerServerUrl.length) playPointsSound(callerServerUrl, ".mp3", "gameshot and the match", 3);

        setTimeout(() => {
          const winnerSoundIndex = soundsConfig.winner.findIndex(winner => winner.name.toLowerCase() === winnerPlayerName?.toLowerCase());
          const soundIndex = winnerSoundIndex && soundsConfig.winner[winnerSoundIndex]?.info ? winnerSoundIndex : 0;
          playSound("winner", 2, soundIndex);
        }, 1000);
      }
    }
  }, waitForSumCallingIsOver);
}
