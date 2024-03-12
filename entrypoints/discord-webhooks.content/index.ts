import "~/assets/tailwind.css";
import { createApp } from "vue";
import App from "./App.vue";
import { waitForElement } from "@/utils";
import { AutodartsToolsConfig } from "@/utils/storage";

let globalUI: any;
let globalUnwatch: any;

export default defineContentScript({
  matches: [ "*://play.autodarts.io/*" ],
  cssInjectionMode: "ui",
  async main(ctx) {
    globalUnwatch = AutodartsToolsConfig.watch(async (config: any) => {
      if (!config.discord.enabled) return;

      if (config.url.includes("/lobbies/") && !config.url.includes("/new/")) {
        console.log("RIGHT PAGE");
        init(ctx).catch(console.error);
      } else {
        globalUI?.remove();
        globalUI = null;
      }
    });
  },
});

async function init(ctx) {
  await waitForElement("#root > div:nth-of-type(1)");
  globalUI = await createShadowRootUi(ctx, {
    name: "autodarts-tools-discord-webhooks",
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
  globalUI.mount();
}
