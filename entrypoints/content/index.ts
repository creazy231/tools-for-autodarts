import "~/assets/tailwind.css";
import { createApp } from "vue";
import PrimeVue from "primevue/config";
import App from "./App.vue";
import { waitForElement } from "@/utils";

export default defineContentScript({
  matches: [ "*://play.autodarts.io/*" ],
  cssInjectionMode: "ui",
  async main(ctx) {
    await waitForElement("#root > div:nth-of-type(1)");
    const ui = await createShadowRootUi(ctx, {
      name: "autodarts-tools-wxt",
      position: "inline",
      anchor: "#root > div > div:nth-of-type(2)",
      onMount: (container) => {
        const app = createApp(App);
        app.mount(container);
        app.use(PrimeVue);
        if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
          container.classList.add("dark");
        }
        return app;
      },
      onRemove: (app) => {
        app?.unmount();
      },
    });
    ui.mount();
  },
});
