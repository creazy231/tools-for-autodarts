import "~/assets/tailwind.css";
import { createApp } from "vue";
import App from "./App.vue";
import { waitForElement } from "@/utils";
import { AutodartsToolsConfig } from "@/utils/storage";

let streamingModeUI: any;
let streamingModeUnwatch: any;

export default defineContentScript({
  matches: [ "*://play.autodarts.io/*" ],
  cssInjectionMode: "ui",
  runAt: "document_end",
  async main(ctx) {
    streamingModeUnwatch = AutodartsToolsConfig.watch(async (config: any) => {
      if (!config.streamingMode.enabled) return;
      // @ts-expect-error
      if (config.url.includes("/matches/") || config.url.includes("/boards/") || window.ADT_STREAMING_MODE_ACTIVE) {
        const div = document.querySelector("autodarts-tools-streaming-mode");
        if (!div) init(ctx).catch(console.error);
      } else {
        streamingModeUI?.remove();
        streamingModeUI = null;
      }
    });
  },
});

async function init(ctx) {
  await waitForElement("#root > div > div:nth-of-type(2)");
  streamingModeUI = await createShadowRootUi(ctx, {
    name: "autodarts-tools-streaming-mode",
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
  streamingModeUI.mount();
}
