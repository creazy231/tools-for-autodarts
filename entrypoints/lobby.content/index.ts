import "~/assets/tailwind.css";
import { createApp } from "vue";

import { soundFx, soundFxOnRemove } from "../match.content/sound-fx";
import { wledFx, wledFxOnRemove } from "../match.content/wled";

import { teamLobby } from "./team-lobby";

import type { IConfig } from "@/utils/storage";

import { waitForElement, waitForElementWithTextContent } from "@/utils";
import {
  AutodartsToolsConfig,
  AutodartsToolsUrlStatus,
} from "@/utils/storage";
import { discordWebhooks } from "@/entrypoints/lobby.content/discord-webhooks";
import { autoStart, onRemove as onAutoStartRemove } from "@/entrypoints/lobby.content/auto-start";
import { onRemove as onShufflePlayersRemove, shufflePlayers } from "@/entrypoints/lobby.content/shuffle-players";
import { onRemove as onQrCodeRemove, qrCode } from "@/entrypoints/lobbynew.content/qr-code";
import RecentLocalPlayers from "@/entrypoints/lobby.content/RecentLocalPlayers.vue";
import { fetchWithAuth, isSafari, isiOS } from "@/utils/helpers";
import { processWebSocketMessage } from "@/utils/websocket-helpers";
import i18next from '@/utils/translate';

let recentLocalPlayersUI: any;
let lobbyReadyUnwatch: any;

export default defineContentScript({
  matches: [ "*://play.autodarts.io/*" ],
  cssInjectionMode: "ui",
  async main(ctx: any) {
    lobbyReadyUnwatch = AutodartsToolsUrlStatus.watch(async (url: string) => {
      if (!url && (isiOS() || isSafari())) url = window.location.href;

      const config: IConfig = await AutodartsToolsConfig.getValue();
      if (/\/lobbies\/(?!.*new\/)/.test(url)) {
        console.log("Autodarts Tools: Lobby Ready");

        // Extract lobby ID from URL and fetch lobby data
        const lobbyIdMatch = url.match(/\/lobbies\/([0-9a-f-]+)/);
        if (lobbyIdMatch && lobbyIdMatch[1]) {
          const lobbyId = lobbyIdMatch[1];
          console.log("Autodarts Tools: Lobby ID:", lobbyId);

          try {
            console.log("Autodarts Tools: Fetching lobby data with cookie authentication...");
            const apiUrl = `https://api.autodarts.io/gs/v0/lobbies/${lobbyId}`;
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

        if (config.discord.enabled) {
          await waitForElementWithTextContent("h2", i18next.t('lobby'));
          await initScript(discordWebhooks, url).catch(console.error);
        }

        if (config.autoStart.enabled) {
          await waitForElementWithTextContent("h2", i18next.t('lobby'));
          await initScript(autoStart, url).catch(console.error);
        }

        if (config.shufflePlayers.enabled) {
          await waitForElementWithTextContent("h2", i18next.t('lobby'));
          await initScript(shufflePlayers, url).catch(console.error);
        }

        if (config.qrCode.enabled) {
          await waitForElementWithTextContent("h2", i18next.t('lobby'));
          await initScript(qrCode, url).catch(console.error);
        }

        if (config.recentLocalPlayers.enabled) {
          const div = document.querySelector("autodarts-tools-recent-local-players");
          if (!div) initRecentLocalPlayers(ctx).catch(console.error);
        }

        if (config.teamLobby.enabled) {
          await waitForElementWithTextContent("h2", i18next.t('lobby'));
          await initScript(teamLobby, url).catch(console.error);
        }

        if (config.soundFx.enabled) {
          await waitForElementWithTextContent("h2", i18next.t('lobby'));
          await initScript(soundFx, url).catch(console.error);
        }

        if (config.wledFx.enabled) {
          await waitForElementWithTextContent("h2", i18next.t('lobby'));
          await initScript(wledFx, url).catch(console.error);
        }
      } else if (/\/tournaments\//.test(url)) {
        console.log("Autodarts Tools: Tournament Ready");

        if (config.soundFx.enabled) {
          await initScript(soundFx, url).catch(console.error);
        }

        if (config.wledFx.enabled) {
          await initScript(wledFx, url).catch(console.error);
        }
      } else {
        await onAutoStartRemove();
        await onShufflePlayersRemove();
        await onQrCodeRemove();
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

async function initRecentLocalPlayers(ctx: any) {
  const lobbyUserInputParent = (await waitForElement("input[placeholder=\"Enter name for local player\"]"))?.parentElement;
  if (!lobbyUserInputParent) return;

  recentLocalPlayersUI = await createShadowRootUi(ctx, {
    name: "autodarts-tools-recent-local-players",
    position: "inline",
    anchor: lobbyUserInputParent.parentElement,
    onMount: (container: any) => {
      const app = createApp(RecentLocalPlayers);
      app.mount(container);
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        container.classList.add("dark");
      }
      return app;
    },
    onRemove: (app: any) => {
      app?.unmount();
    },
  });
  recentLocalPlayersUI.mount();
}
