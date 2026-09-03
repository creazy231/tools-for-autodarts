import { onRemove as onQrCodeTournamentRemove, qrCodeTournament } from "./qr-code-tournament";

import { AutodartsToolsUrlStatus } from "@/utils/storage";
import { isSafari, isiOS } from "@/utils/helpers";
import { AUTODARTS_MATCHES } from "@/utils/content-script-matches";

/**
 * Tournament pages — the QR code for the invite dialog.
 *
 * This entrypoint used to also read the game mode off an `h2` on the old
 * site's `/lobbies/new/<variant>` page. The rebuilt site collapsed those routes
 * into the /play picker, so that branch never ran, and the one reader of the
 * value now takes the variant from the match data instead.
 */
export default defineContentScript({
  matches: AUTODARTS_MATCHES,
  cssInjectionMode: "ui",
  async main() {
    AutodartsToolsUrlStatus.watch(async (url: string) => {
      if (!url && (isiOS() || isSafari())) url = window.location.href;

      if (/\/tournaments\/[0-9a-f-]+/.test(url)) {
        await initScript(qrCodeTournament, url).catch(e => console.error(e));
      } else {
        onQrCodeTournamentRemove();
      }
    });
  },
});

async function initScript(fn: any, url: string) {
  if (window.location.href !== url) return;
  await fn();
}
