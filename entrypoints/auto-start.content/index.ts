import "~/assets/tailwind.css";
import { createApp } from "vue";
import App from "./App.vue";
import { waitForElement } from "@/utils";
import { AutodartsToolsConfig } from "@/utils/storage";

let autoStartUI: any;
let autoStartUnwatch: any;

export default defineContentScript({
  matches: [ "*://play.autodarts.io/*" ],
  cssInjectionMode: "ui",
  async main(ctx) {
    autoStartUnwatch = AutodartsToolsConfig.watch(async (config: any) => {
      if (!config.autoStart.enabled) return;

      if (config.url.includes("/lobbies/") && !config.url.includes("/new/")) {
        console.log("RIGHT PAGE");
        const div = document.querySelector("autodarts-tools-auto-start");
        if (!div) init(ctx).catch(console.error);
      } else {
        autoStartUI?.remove();
        autoStartUI = null;
      }
    });
  },
});

async function init(ctx) {
  await waitForElement("#root > div > div:nth-of-type(2) > div > div > div:nth-of-type(3)");
  autoStartUI = await createShadowRootUi(ctx, {
    name: "autodarts-tools-auto-start",
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
  autoStartUI.mount();
}
