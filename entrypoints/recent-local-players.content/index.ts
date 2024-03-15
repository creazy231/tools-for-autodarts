import "~/assets/tailwind.css";
import { createApp } from "vue";
import App from "./App.vue";
import { waitForElement } from "@/utils";
import { AutodartsToolsConfig } from "@/utils/storage";

let recentLocalPlayersUI: any;
let recentLocalPlayersUnwatch: any;

export default defineContentScript({
  matches: [ "*://play.autodarts.io/*" ],
  cssInjectionMode: "ui",
  runAt: "document_end",
  async main(ctx) {
    recentLocalPlayersUnwatch = AutodartsToolsConfig.watch(async (config: any) => {
      if (!config.recentLocalPlayers.enabled) return;

      if (config.url.includes("/lobbies/") && !config.url.includes("/new/")) {
        const div = document.querySelector("autodarts-tools-recent-local-players");
        if (!div) init(ctx).catch(console.error);
      } else {
        recentLocalPlayersUI?.remove();
        recentLocalPlayersUI = null;
      }
    });
  },
});

async function init(ctx) {
  const lobbyUserInput = await waitForElement("input[placeholder=\"Enter name for local player\"]");
  if (!lobbyUserInput) return;
  const lobbyUserInputParent = lobbyUserInput.parentElement;
  if (!lobbyUserInputParent) return;
  recentLocalPlayersUI = await createShadowRootUi(ctx, {
    name: "autodarts-tools-recent-local-players",
    position: "inline",
    anchor: lobbyUserInputParent.parentElement,
    onMount: (container) => {
      const app = createApp(App);
      app.mount(container);
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        container.classList.add("dark");
      }
      return app;
    },
    onRemove: (app) => {
      app?.unmount();
    },
  });
  recentLocalPlayersUI.mount();
}
