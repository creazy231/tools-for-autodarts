/**
 * Import order matters here, and eslint's import/order would happily break it.
 *
 * The `.vue` import has to stay after the plain modules. Hoisting it above them
 * makes rolldown resolve the SFC before they are in the graph, and the build
 * dies with `"default" is not exported by ExternalBoards.vue?vue&type=script`
 * — naming this component, AppButton and AppInput, none of which are at fault.
 */
import "~/assets/tailwind.css";
import { createApp } from "vue";
import { waitForElement } from "@/utils";
import type { IConfig } from "@/utils/storage";
import { AutodartsToolsConfig, AutodartsToolsUrlStatus } from "@/utils/storage";
import ExternalBoards from "@/entrypoints/boards.content/ExternalBoards.vue";
import { SELECTORS, qs } from "@/utils/selectors";
import { isSafari, isiOS } from "@/utils/helpers";
import { AUTODARTS_MATCHES } from "@/utils/content-script-matches";

let externalBoardsUI: any;
let boardsReadyUnwatch: any;

export default defineContentScript({
  matches: AUTODARTS_MATCHES,
  cssInjectionMode: "ui",
  async main(ctx: any) {
    boardsReadyUnwatch = AutodartsToolsUrlStatus.watch(async (url: string) => {
      if (!url && (isiOS() || isSafari())) url = window.location.href;

      // `/boards` itself, not a board's own page underneath it.
      if (!/\/boards\/?$/.test(url.split(/[?#]/)[0] ?? "")) {
        await removeExternalBoards();
        return;
      }

      console.log("Autodarts Tools: Boards Ready");

      const config: IConfig = await AutodartsToolsConfig.getValue();
      if (config.externalBoards.enabled) await initExternalBoards(ctx).catch(console.error);
      else await removeExternalBoards();
    });
  },
});

async function initExternalBoards(ctx: any) {
  if (externalBoardsUI) return;

  const anchor = await waitForElement(SELECTORS.boards.pageColumn, 15000).catch(() => null);
  if (!anchor) {
    console.warn("Autodarts Tools: External Boards - Boards page did not render in time");
    return;
  }

  externalBoardsUI = await createShadowRootUi(ctx, {
    name: "autodarts-tools-external-boards",
    position: "inline",
    anchor: () => qs(SELECTORS.boards.pageColumn),
    // Below the site's own device sections, as one more section of the page.
    append: "last",
    onMount: (container: any) => {
      const app = createApp(ExternalBoards);
      app.mount(container);
      container.classList.add("dark");
      return app;
    },
    onRemove: (app: any) => {
      app?.unmount();
    },
  });
  externalBoardsUI.mount();
}

async function removeExternalBoards() {
  externalBoardsUI?.remove();
  externalBoardsUI = undefined;
}
