import "~/assets/tailwind.css";
import { createApp } from "vue";

import App from "./App.vue";
import { migrationConfig } from "./migration-config";
import { TOOLS_OVERLAY_CSS } from "./tools-overlay";

import { waitForElement } from "@/utils";
import { SELECTORS } from "@/utils/selectors";
import { AutodartsToolsConfig, AutodartsToolsGlobalStatus, AutodartsToolsUrlStatus, defaultConfig } from "@/utils/storage";
import { isiOS } from "@/utils/helpers";
import Migration from "@/components/Migration.vue";
import { AUTODARTS_MATCHES } from "@/utils/content-script-matches";
import { quietOwnDartsSwitch, quietOwnDartsSwitchOnRemove } from "@/utils/quiet-own-darts-switch";

let migrationModalUI: any;

export default defineContentScript({
  matches: AUTODARTS_MATCHES,
  cssInjectionMode: "ui",
  async main(ctx) {
    await waitForElement(SELECTORS.app.root, 15000);
    AutodartsToolsUrlStatus.setValue(window.location.href.split("#")[0] || "undefined");

    // Quiet Own Darts puts its switch in autodarts' own sound settings, which
    // exist in two places on two different routes — the in-match dialog and
    // /settings/sound-effects. This is the one content script that runs on
    // both, so it is the one that draws it. Ahead of the overlay rather than
    // after it, so a page where that fails to mount still gets the switch.
    // See utils/quiet-own-darts-switch.ts.
    await quietOwnDartsSwitch().catch(e => console.error(e));
    ctx.onInvalidated(quietOwnDartsSwitchOnRemove);

    // Create a custom event listener for the auth cookie
    ctx.addEventListener(window, "auth-cookie-available", (event: CustomEvent) => {
      const { authValue } = event.detail;
      console.log("Authorization cookie retrieved");

      // Store the auth value in the extension's storage for later use
      AutodartsToolsGlobalStatus.getValue().then((globalStatus) => {
        AutodartsToolsGlobalStatus.setValue({
          ...globalStatus,
          auth: { token: authValue },
        });
      });
    });

    // Inject the auth-cookie script
    try {
      // Create a script element to load the auth-cookie.js file
      const script = document.createElement("script");
      script.src = browser.runtime.getURL("/auth-cookie.js");
      (document.head || document.documentElement).appendChild(script);
      script.onload = () => script.remove();
    } catch (error) {
      console.error("Failed to inject auth cookie script:", error);
    }

    if (window.location.href.includes("/tools")) {
      document.querySelector("#root")?.remove();
      window.location.href = "/settings";
    } else {
      if (isiOS()) {
        document.querySelector("body")!.style!.minHeight = "calc(100vh + 1px)";
      }
      await waitForElement(SELECTORS.app.root, 15000);

      await waitForElement(SELECTORS.app.contentRoot, 15000);
      const ui = await createShadowRootUi(ctx, {
        name: "autodarts-tools-wxt",
        position: "inline",
        anchor: SELECTORS.app.contentRoot[0],
        // Gives the overlay a scroller of its own — see tools-overlay.ts.
        css: TOOLS_OVERLAY_CSS,
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

    try {
      const storage = await browser.storage.local.get("config");
      if (storage.config) {
        await initMigrationModal(ctx).catch(e => console.error(e));
      }
    } catch (error) {
      console.error("Failed to check for migration data:", error);
    }

    const config = await AutodartsToolsConfig.getValue();

    try {
      if (config && config.version !== defaultConfig.version) {
        await migrationConfig().catch(e => console.error(e));
      }
    } catch (error) {
      console.error("Failed to check for migration data:", error);
    }
  },
});

async function initMigrationModal(ctx) {
  await waitForElement(SELECTORS.app.contentRoot, 15000);
  migrationModalUI = await createShadowRootUi(ctx, {
    name: "autodarts-tools-migration-modal",
    position: "inline",
    anchor: SELECTORS.app.contentRoot[0],
    onMount: (container) => {
      console.log("Autodarts Tools: Migration modal initialized");
      const migrationModal = createApp(Migration);
      migrationModal.mount(container);
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        container.classList.add("dark");
      }
      return migrationModal;
    },
    onRemove: (migrationModal) => {
      migrationModal?.unmount();
    },
  });
  migrationModalUI.mount();
}
