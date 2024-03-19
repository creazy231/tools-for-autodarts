import "~/assets/tailwind.css";
import { createApp } from "vue";
import App from "./App.vue";
import { waitForElement } from "@/utils";
import { AutodartsToolsConfig } from "@/utils/storage";

let takeoutUI: any;
let takeoutUnwatch: any;

export default defineContentScript({
  matches: [ "*://play.autodarts.io/*" ],
  cssInjectionMode: "ui",
  async main(ctx) {
    takeoutUnwatch = AutodartsToolsConfig.watch(async (config: any) => {
      if (!config.takeout.enabled) return;

      if (config.url.includes("/matches/") || config.url.includes("/boards/")) {
        const div = document.querySelector("autodarts-tools-takeout");
        if (!div) init(ctx).catch(console.error);
      } else {
        takeoutUI?.remove();
        takeoutUI = null;
      }
    });
  },
});

async function init(ctx) {
  await waitForElement("#root > div > div:nth-of-type(2)");
  takeoutUI = await createShadowRootUi(ctx, {
    name: "autodarts-tools-takeout",
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
  takeoutUI.mount();
}
