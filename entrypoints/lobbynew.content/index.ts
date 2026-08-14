import { onRemove as onQrCodeTournamentRemove, qrCodeTournament } from "./qr-code-tournament";

import type { GameMode, IGameData } from "@/utils/game-data-storage";

import { AutodartsToolsUrlStatus } from "@/utils/storage";
import { AutodartsToolsGameData } from "@/utils/game-data-storage";
import { waitForElement } from "@/utils";
import { isSafari, isiOS } from "@/utils/helpers";
import { AUTODARTS_MATCHES } from "@/utils/content-script-matches";

export default defineContentScript({
  matches: AUTODARTS_MATCHES,
  cssInjectionMode: "ui",
  async main() {
    AutodartsToolsUrlStatus.watch(async (url: string) => {
      if (!url && (isiOS() || isSafari())) url = window.location.href;

      if (/\/lobbies\/*new\//.test(url)) {
        console.log("Autodarts Tools: Lobby New Ready");

        // Read by Winner Animation, which is not ported yet. v2 collapsed these
        // per-variant routes into /play, so this only ever runs on the old site.
        const gameData: IGameData = await AutodartsToolsGameData.getValue();
        const gameModeTitle = await waitForElement("h2");

        await AutodartsToolsGameData.setValue({
          ...gameData,
          gameMode: gameModeTitle.textContent as GameMode,
        });

        console.log("Autodarts Tools: Game Mode", gameModeTitle.textContent);
      } else if (/\/tournaments\/[0-9a-f-]+/.test(url)) {
        await initScript(qrCodeTournament, url).catch(console.error);
      } else {
        await onQrCodeTournamentRemove();
      }
    });
  },
});

async function initScript(fn: any, url: string) {
  if (window.location.href !== url) return;
  await fn();
}
