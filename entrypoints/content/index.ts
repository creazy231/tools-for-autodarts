import "~/assets/tailwind.css";
import { createApp } from "vue";
import App from "./App.vue";
import { waitForElement } from "@/utils";
import { AutodartsToolsGlobalStatus, AutodartsToolsSoundAutoplayStatus } from "@/utils/storage";
import { isiOS } from "@/utils/helpers";
import { getMenu } from "@/utils/getElements";

export default defineContentScript({
  matches: [ "*://play.autodarts.io/*" ],
  cssInjectionMode: "ui",
  async main(ctx) {
    if (window.location.href.includes("/tools")) {
      document.querySelector("#root")?.remove();
      window.location.href = "/settings";
    } else {
      if (isiOS()) {
        document.querySelector("body")!.style!.minHeight = "calc(100vh + 1px)";
      }
      await waitForElement("#root > div:nth-of-type(1)");

      const username = getMenu()?.lastElementChild?.querySelector("button")?.lastElementChild?.textContent?.trim();
      if (username?.length) {
        const globalStatus = await AutodartsToolsGlobalStatus.getValue();
        await AutodartsToolsGlobalStatus.setValue({ ...globalStatus, user: { name: username } });
      }

      await AutodartsToolsSoundAutoplayStatus.setValue(false);
      const ui = await createShadowRootUi(ctx, {
        name: "autodarts-tools-wxt",
        position: "inline",
        anchor: "#root > div > div:nth-of-type(2)",
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
      ui.mount();
    }
  },
});
