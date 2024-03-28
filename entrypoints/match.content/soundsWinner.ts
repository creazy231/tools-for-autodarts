import { AutodartsToolsConfig, AutodartsToolsMatchStatus } from "@/utils/storage";
import { AutodartsToolsCallerConfig } from "@/utils/callerStorage";
import { AutodartsToolsSoundsConfig } from "@/utils/soundsStorage";
import { playSound2, playSound3 } from "@/utils/playSound";

export async function soundsWinner() {
  const matchStatus = (await AutodartsToolsMatchStatus.getValue());

  const throwPointsArr = matchStatus.throws;

  const waitForSumCallingIsOver = throwPointsArr.length === 3 ? 2500 : 0;

  const winnerPlayerCard = document.querySelector(".ad-ext-player-winner");
  const winnerPlayerName = (winnerPlayerCard?.querySelector(".ad-ext-player-name") as HTMLElement)?.innerText;

  const isSoundsEnabled = (await AutodartsToolsConfig.getValue()).sounds.enabled;
  const isCallerEnabled = (await AutodartsToolsConfig.getValue()).caller.enabled;

  const callerActive = (await AutodartsToolsCallerConfig.getValue()).caller.filter(caller => caller.isActive)[0];
  const soundConfig = await AutodartsToolsSoundsConfig.getValue();

  if (!isCallerEnabled && !isSoundsEnabled) return;

  let callerServerUrl = callerActive?.url || "";
  if (callerServerUrl.at(-1) !== "/") callerServerUrl += "/";

  setTimeout(() => {
    const buttons = [ ...document.querySelectorAll(".chakra-button") as NodeList ];
    buttons.some((button) => {
      // --- Leg finished ---
      if ((button as HTMLElement).innerText === "Next Leg") {
        if (isCallerEnabled && callerServerUrl.length) playSound3(`${callerServerUrl}gameshot.mp3`);
        return true;
      }
      // --- Match finished ---
      if ((button as HTMLElement).innerText === "Finish") {
        if (isCallerEnabled && callerServerUrl.length) playSound3(`${callerServerUrl}gameshot and the match.mp3`);
        if (isSoundsEnabled) {
          setTimeout(() => {
            const winnerSound = soundConfig.winner.find(winner => winner.name.toLowerCase() === winnerPlayerName?.toLowerCase())?.url;
            playSound2(winnerSound || soundConfig.winner[0].url);
          }, 1000);
        }
        return true;
      }
      return false;
    });
  }, waitForSumCallingIsOver);
}
