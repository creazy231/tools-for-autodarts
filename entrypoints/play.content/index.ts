import "~/assets/tournaments/brackets-viewer.min.js";
import "~/assets/tailwind.css";
import { createApp } from "vue";
import { waitForElement, waitForElementWithTextContent } from "@/utils";
import type { IConfig } from "@/utils/storage";
import { AutodartsToolsConfig, AutodartsToolsUrlStatus } from "@/utils/storage";
import Tournaments from "@/entrypoints/play.content/Tournaments.vue";

let tournamentsUI: any;
let tournamentsReadyUnwatch: any;

export default defineContentScript({
  matches: [ "*://play.autodarts.io/*" ],
  cssInjectionMode: "ui",
  async main(ctx: any) {
    tournamentsReadyUnwatch = AutodartsToolsUrlStatus.watch(async (url: string) => {
      const config: IConfig = await AutodartsToolsConfig.getValue();
      if (config.tournaments.enabled && url === "https://play.autodarts.io/") {
        const cricketButtonElement = await waitForElementWithTextContent("a", "Cricket");

        // clone cricketButtonElement and append it it's parent
        const tournamentsButtonElement = cricketButtonElement.cloneNode(true) as HTMLAnchorElement;
        tournamentsButtonElement.textContent = "Tournaments";
        tournamentsButtonElement.removeAttribute("href");
        tournamentsButtonElement.style.cursor = "pointer";
        tournamentsButtonElement.onclick = () => {
          const settingsButton = document.querySelector("a[href='/settings']") as HTMLAnchorElement | null;
          settingsButton?.click();

          window.history.pushState(null, "", "/adt-tournaments");
        };

        cricketButtonElement.parentElement!.appendChild(tournamentsButtonElement);
      }

      if (url.endsWith("/adt-tournaments")) {
        console.log("Autodarts Tools: Tournaments Ready");
        if (config.tournaments.enabled) {
          const div = document.querySelector("autodarts-tools-tournaments");
          if (!div) initTournaments(ctx).catch(console.error);
        }
      } else {
        console.log("REMOVE TOURNAMENTS");
        tournamentsUI?.remove();
        tournamentsUI = null;
        // Silence is golden
      }
    });
  },
});

async function initScript(fn: any, url: string) {
  if (window.location.href !== url) return;
  await fn();
}

async function initTournaments(ctx: any) {
  console.log("INIT TOURNAMENTS");
  const rootContent = await waitForElement("#root > div > div:nth-of-type(2) > div");
  rootContent.style.display = "none";

  const rootContainer = await waitForElement("#root > div > div:nth-of-type(2)");

  tournamentsUI = await createShadowRootUi(ctx, {
    name: "autodarts-tools-tournaments",
    position: "inline",
    anchor: rootContainer,
    onMount: (container: any) => {
      const app = createApp(Tournaments);
      app.mount(container);
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        container.classList.add("dark");
      }
      return app;
    },
    onRemove: (app: any) => {
      app?.unmount();
    },
  });
  tournamentsUI.mount();
}
