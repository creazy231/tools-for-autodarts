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
      await waitForElement("#root > div:nth-of-type(1)", 15000);

      // wait until avatar image is loaded
      setTimeout(async () => {
        const userNameWithAvatar = getMenu()?.lastElementChild?.querySelector("button img")?.getAttribute("alt")?.trim();
        const userNameWithoutAvatar = getMenu()?.lastElementChild?.querySelector("button div[role='img']")?.getAttribute("aria-label")?.trim();

        const username = userNameWithAvatar || userNameWithoutAvatar;

        if (username?.length) {
          const globalStatus = await AutodartsToolsGlobalStatus.getValue();
          await AutodartsToolsGlobalStatus.setValue({
            ...globalStatus,
            user: { name: username },
          });
        }
      }, 2000);

      await AutodartsToolsSoundAutoplayStatus.setValue(false);
      await waitForElement("#root > div > div:nth-of-type(2)", 15000);
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
