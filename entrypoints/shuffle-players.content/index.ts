import "~/assets/tailwind.css";
import { createApp } from "vue";
import App from "./App.vue";
import { waitForElement } from "@/utils";
import { AutodartsToolsConfig } from "@/utils/storage";

let shufflePlayersUI: any;
let shufflePlayersUnwatch: any;

export default defineContentScript({
  matches: [ "*://play.autodarts.io/*" ],
  cssInjectionMode: "ui",
  async main(ctx) {
    shufflePlayersUnwatch = AutodartsToolsConfig.watch(async (config: any) => {
      if (!config.shufflePlayers.enabled) return;

      if (config.url.includes("/lobbies/") && !config.url.includes("/new/")) {
        const div = document.querySelector("autodarts-tools-shuffle-players");
        if (!div) init(ctx).catch(console.error);
      } else {
        shufflePlayersUI?.remove();
        shufflePlayersUI = null;
      }
    });
  },
});

async function init(ctx) {
  await waitForElement("#root > div > div:nth-of-type(2) > div > div > div:nth-of-type(3)");
  shufflePlayersUI = await createShadowRootUi(ctx, {
    name: "autodarts-tools-shuffle-players",
    position: "inline",
    anchor: "#root",
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
  shufflePlayersUI.mount();
}
