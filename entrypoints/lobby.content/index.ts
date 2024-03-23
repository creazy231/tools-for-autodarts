import "~/assets/tailwind.css";
import { createApp } from "vue";
import { waitForElement, waitForElementWithTextContent } from "@/utils";
import type { IConfig } from "@/utils/storage";
import { AutodartsToolsConfig } from "@/utils/storage";
import { discordWebhooks } from "@/entrypoints/lobby.content/discord-webhooks";
import { autoStart, onRemove as onAutoStartRemove } from "@/entrypoints/lobby.content/auto-start";
import { onRemove as onShufflePlayersRemove, shufflePlayers } from "@/entrypoints/lobby.content/shuffle-players";
import RecentLocalPlayers from "@/entrypoints/lobby.content/RecentLocalPlayers.vue";

let recentLocalPlayersUI: any;
let lobbyReadyUnwatch: any;

export default defineContentScript({
  matches: [ "*://play.autodarts.io/*" ],
  cssInjectionMode: "ui",
  async main(ctx: any) {
    lobbyReadyUnwatch = AutodartsToolsConfig.watch(async (config: IConfig) => {
      if (/\/lobbies\/(?!.*\/new\/)/.test(config.url)) {
        console.log("lobby ready");
        if (config.discord.enabled) {
          await waitForElementWithTextContent("h2", "Lobby");
          await discordWebhooks();
        }
        if (config.autoStart.enabled) {
          await waitForElementWithTextContent("h2", "Lobby");
          await autoStart();
        }
        if (config.shufflePlayers.enabled) {
          await waitForElementWithTextContent("h2", "Lobby");
          await shufflePlayers();
        }
        if (config.recentLocalPlayers.enabled) {
          const div = document.querySelector("autodarts-tools-recent-local-players");
          if (!div) initRecentLocalPlayers(ctx).catch(console.error);
        }
      } else {
        await onAutoStartRemove();
        await onShufflePlayersRemove();
      }
    });
  },
});

async function initRecentLocalPlayers(ctx: any) {
  const lobbyUserInput = await waitForElement("input[placeholder=\"Enter name for local player\"]");
  if (!lobbyUserInput) return;
  const lobbyUserInputParent = lobbyUserInput.parentElement;
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
