import "~/assets/tailwind.css";
import { createApp } from "vue";
import App from "./App.vue";
import { waitForElement } from "@/utils";
import { AutodartsToolsConfig } from "@/utils/storage";

let discordWebhookUI: any;
let discordWebhookUnwatch: any;

export default defineContentScript({
  matches: [ "*://play.autodarts.io/*" ],
  cssInjectionMode: "ui",
  runAt: "document_end",
  async main(ctx) {
    discordWebhookUnwatch = AutodartsToolsConfig.watch(async (config: any) => {
      if (!config.discord.enabled) return;

      if (config.url.includes("/lobbies/") && !config.url.includes("/new/")) {
        const div = document.querySelector("autodarts-tools-discord-webhooks");
        if (!div) init(ctx).catch(console.error);
      } else {
        discordWebhookUI?.remove();
        discordWebhookUI = null;
      }
    });
  },
});

async function init(ctx) {
  await waitForElement("#root > div:nth-of-type(1)");
  discordWebhookUI = await createShadowRootUi(ctx, {
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
  discordWebhookUI.mount();
}
