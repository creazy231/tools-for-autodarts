import "~/assets/tailwind.css";
import { createApp } from "vue";
import { waitForElementWithTextContent } from "@/utils";
import type { IConfig } from "@/utils/storage";
import { AutodartsToolsConfig, AutodartsToolsUrlStatus } from "@/utils/storage";
import ExternalBoards from "@/entrypoints/boards.content/ExternalBoards.vue";

let externalBoardsUI: any;
let boardsReadyUnwatch: any;

export default defineContentScript({
  matches: [ "*://play.autodarts.io/*" ],
  cssInjectionMode: "ui",
  async main(ctx: any) {
    boardsReadyUnwatch = AutodartsToolsUrlStatus.watch(async (url: string) => {
      const config: IConfig = await AutodartsToolsConfig.getValue();
      if (url.endsWith("/boards")) {
        console.log("Autodarts Tools: Boards Ready");
        if (config.externalBoards.enabled) {
          const div = document.querySelector("autodarts-tools-external-boards");
          if (!div) initExternalBoards(ctx).catch(console.error);
        }
      } else {
        // Silence is golden
      }
    });
  },
});

async function initScript(fn: any, url: string) {
  if (window.location.href !== url) return;
  await fn();
}

async function initExternalBoards(ctx: any) {
  const boardsContent = await waitForElementWithTextContent("h2", "My Boards");
  if (!boardsContent) return;
  const boardsParentElement = boardsContent.parentElement?.parentElement;

  if (!boardsParentElement) return;

  externalBoardsUI = await createShadowRootUi(ctx, {
    name: "autodarts-tools-external-boards",
    position: "inline",
    anchor: boardsParentElement.parentElement,
    onMount: (container: any) => {
      const app = createApp(ExternalBoards);
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
  externalBoardsUI.mount();
}
