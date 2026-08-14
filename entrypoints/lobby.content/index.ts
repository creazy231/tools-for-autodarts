import "~/assets/tailwind.css";

import { soundFx, soundFxOnRemove } from "../match.content/sound-fx";
import { wledFx, wledFxOnRemove } from "../match.content/wled";

import { teamLobby } from "./team-lobby";

import type { IConfig } from "@/utils/storage";

import { waitForElement } from "@/utils";
import { SELECTORS } from "@/utils/selectors";
import {
  AutodartsToolsConfig,
  AutodartsToolsUrlStatus,
} from "@/utils/storage";
import { discordWebhooks, onRemove as onDiscordWebhooksRemove } from "@/entrypoints/lobby.content/discord-webhooks";
import { autoStart, onRemove as onAutoStartRemove } from "@/entrypoints/lobby.content/auto-start";
import { onRemove as onQrCodeRemove, qrCode } from "@/entrypoints/lobbynew.content/qr-code";
import { onRemove as onRecentLocalPlayersRemove, recentLocalPlayers } from "@/entrypoints/lobby.content/recent-local-players";
import { fetchWithAuth, isSafari, isiOS } from "@/utils/helpers";
import { processWebSocketMessage } from "@/utils/websocket-helpers";
import { AUTODARTS_MATCHES } from "@/utils/content-script-matches";

let lobbyReadyUnwatch: any;

/** The rebuilt site's lobby route. v1's `/lobbies/<id>` is gone. */
const LOBBY_ROUTE = /\/lobby\/([0-9a-f-]+)/i;

/**
 * Lobby features whose port to the rebuilt site has landed.
 *
 * The route fix below makes this content script run on v2 for the first time,
 * which would otherwise turn every remaining v1 implementation loose on markup
 * it was never written for. Their settings cards are disabled too, so a user
 * carrying `enabled: true` from before could not switch them off.
 *
 * Mirrors `v2Ready` in components/PageConfig.vue — add the key here and set
 * the flag there as each feature is ported.
 */
const PORTED_TO_V2 = new Set<keyof IConfig>([ "discord", "autoStart", "recentLocalPlayers" ]);

function isOn(config: IConfig, feature: keyof IConfig): boolean {
  if (!PORTED_TO_V2.has(feature)) return false;
  return Boolean((config[feature] as { enabled?: boolean })?.enabled);
}

export default defineContentScript({
  matches: AUTODARTS_MATCHES,
  cssInjectionMode: "ui",
  async main(ctx: any) {
    lobbyReadyUnwatch = AutodartsToolsUrlStatus.watch(async (url: string) => {
      if (!url && (isiOS() || isSafari())) url = window.location.href;

      const config: IConfig = await AutodartsToolsConfig.getValue();
      const lobbyIdMatch = url.match(LOBBY_ROUTE);
      if (lobbyIdMatch) {
        console.log("Autodarts Tools: Lobby Ready");

        // Extract lobby ID from URL and fetch lobby data
        {
          const lobbyId = lobbyIdMatch[1];
          console.log("Autodarts Tools: Lobby ID:", lobbyId);

          try {
            console.log("Autodarts Tools: Fetching lobby data with cookie authentication...");
            const apiUrl = `https://api.autodarts.com/gs/v0/lobbies/${lobbyId}`;
            const response = await fetchWithAuth(apiUrl);

            console.log("Autodarts Tools: Response status:", response.status);

            if (response.ok) {
              const lobbyData = await response.json();
              console.log("Autodarts Tools: Lobby Data:", lobbyData);
              await processWebSocketMessage("autodarts.lobbies", lobbyData);
            } else {
              console.error("Autodarts Tools: Failed to fetch lobby data", response.status, response.statusText);
            }
          } catch (error) {
            console.error("Autodarts Tools: Error fetching lobby data:", error);
          }
        }

        /**
         * The lobby is rendered once the Players card header exists. The old
         * gate here waited for an `h2` reading "Lobby" — the rebuilt lobby has
         * no headings at all, so that promise never settled.
         */
        await waitForElement(SELECTORS.lobby.playersCardHeader, 15000).catch(() => {
          console.warn("Autodarts Tools: Lobby did not render in time");
        });

        if (isOn(config, "discord")) {
          await initScript(discordWebhooks, url).catch(console.error);
        }

        if (isOn(config, "autoStart")) {
          // Needs ctx: its toggle is a Vue app in a shadow root, not a cloned
          // page button.
          await initScript(() => autoStart(ctx), url).catch(console.error);
        }

        if (isOn(config, "qrCode")) {
          await initScript(qrCode, url).catch(console.error);
        }

        if (isOn(config, "recentLocalPlayers")) {
          await initScript(() => recentLocalPlayers(ctx), url).catch(console.error);
        }

        if (isOn(config, "teamLobby")) {
          await initScript(teamLobby, url).catch(console.error);
        }

        if (isOn(config, "soundFx")) {
          await initScript(soundFx, url).catch(console.error);
        }

        if (isOn(config, "wledFx")) {
          await initScript(wledFx, url).catch(console.error);
        }
      } else if (/\/tournaments\//.test(url)) {
        console.log("Autodarts Tools: Tournament Ready");

        if (isOn(config, "soundFx")) {
          await initScript(soundFx, url).catch(console.error);
        }

        if (isOn(config, "wledFx")) {
          await initScript(wledFx, url).catch(console.error);
        }
      } else {
        await onDiscordWebhooksRemove();
        await onAutoStartRemove();
        await onQrCodeRemove();
        await onRecentLocalPlayersRemove();
        await soundFxOnRemove();
        await wledFxOnRemove();
      }
    });
  },
});

async function initScript(fn: any, url: string) {
  if (window.location.href !== url) return;
  await fn();
}
