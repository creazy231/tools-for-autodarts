import "~/assets/tailwind.css";
import { createApp } from "vue";
import App from "./App.vue";
import { waitForElement } from "@/utils";
import { AutodartsToolsConfig } from "@/utils/storage";

let colorChangeUI: any;
let colorChangeUnwatch: any;

export default defineContentScript({
  matches: [ "*://play.autodarts.io/*" ],
  cssInjectionMode: "ui",
  async main(ctx) {
    colorChangeUnwatch = AutodartsToolsConfig.watch(async (config: any) => {
      if (!config.colors.enabled) return;

      if (config.url.includes("/matches/") || config.url.includes("/boards/")) {
        console.log("RIGHT PAGE");
        const div = document.querySelector("autodarts-tools-color-change");
        if (!div) init(ctx).catch(console.error);
      } else {
        colorChangeUI?.remove();
        colorChangeUI = null;
      }
    });
  },
});

async function init(ctx) {
  await waitForElement("#root > div > div:nth-of-type(2)");
  colorChangeUI = await createShadowRootUi(ctx, {
    name: "autodarts-tools-color-change",
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
  colorChangeUI.mount();
}
