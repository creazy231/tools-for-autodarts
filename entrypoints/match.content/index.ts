import "~/assets/tailwind.css";
import { createApp } from "vue";
import Takeout from "./Takeout.vue";
import { waitForElement } from "@/utils";
import type { IConfig, IMatchStatus } from "@/utils/storage";
import { AutodartsToolsBoardStatus, AutodartsToolsConfig, AutodartsToolsMatchStatus, BoardStatus } from "@/utils/storage";
import { scoreSmaller } from "@/entrypoints/match.content/scoreSmaller";
import { colorChange, onRemove as onRemoveColorChange } from "@/entrypoints/match.content/color-change";
import StreamingMode from "@/entrypoints/match.content/StreamingMode.vue";
import { caller } from "@/entrypoints/match.content/caller";

let takeoutUI: any;
let streamingModeUI: any;
let matchReadyUnwatch: any;
let throwsObserver: MutationObserver;
let boardStatusObserver: MutationObserver;

export default defineContentScript({
  matches: [ "*://play.autodarts.io/*" ],
  cssInjectionMode: "ui",
  async main(ctx: any) {
    matchReadyUnwatch = AutodartsToolsConfig.watch(async (config: IConfig) => {
      if (/\/matches\/|\/boards\//.test(config.url)) {
        await waitForElement("#ad-ext-turn");
        console.log("match ready");
        await scoreSmaller();
        const takeoutDiv = document.querySelector("autodarts-tools-takeout");
        if (!takeoutDiv) initTakeout(ctx).catch(console.error);
        await throwsChange(); // init matchData
        startThrowsObserver();
        startBoardStatusObserver();

        if (config.colors.enabled) {
          await waitForElement("#ad-ext-player-display");
          await colorChange();
        }

        if (config.streamingMode.enabled) {
          const div = document.querySelector("autodarts-tools-streaming-mode");
          if (!div) initStreamingMode(ctx).catch(console.error);
        }
      } else {
        throwsObserver?.disconnect();
        boardStatusObserver?.disconnect();
        takeoutUI?.remove();
        takeoutUI = null;

        await onRemoveColorChange();
      }
    });
  },
});

async function initTakeout(ctx) {
  takeoutUI = await createShadowRootUi(ctx, {
    name: "autodarts-tools-takeout",
    position: "inline",
    anchor: "#root > div > div:nth-of-type(2)",
    onMount: (container) => {
      const takeout = createApp(Takeout);
      takeout.mount(container);
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        container.classList.add("dark");
      }
      return takeout;
    },
    onRemove: (takeout) => {
      takeout?.unmount();
    },
  });
  takeoutUI.mount();
}

async function initStreamingMode(ctx) {
  await waitForElement("#ad-ext-player-display");
  streamingModeUI = await createShadowRootUi(ctx, {
    name: "autodarts-tools-streaming-mode",
    position: "inline",
    anchor: "#root",
    onMount: (container: any) => {
      const app = createApp(StreamingMode);
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
  streamingModeUI.mount();
}

async function throwsChange() {
  await scoreSmaller();
  await caller();

  const editPlayerThrowActive = document.querySelector(".ad-ext-turn-throw.css-6pn4tf");

  const matchStatus: IMatchStatus = await AutodartsToolsMatchStatus.getValue();

  await AutodartsToolsMatchStatus.setValue({
    ...matchStatus,
    // throws: [
    //   ...matchData.throws,
    // ],
    isInEditMode: !!editPlayerThrowActive,
  });
}

function startThrowsObserver() {
  const targetNode = document.getElementById("ad-ext-turn");
  if (!targetNode) {
    console.error("Target node not found");
    return;
  }
  throwsObserver = new MutationObserver(() => {
    throwsChange().catch(console.error);
  });
  throwsObserver.observe(targetNode, { childList: true, subtree: true, attributes: true });
}

function startBoardStatusObserver() {
  const targetNode = (document.getElementById("ad-ext-game-settings-extra")?.previousElementSibling?.children[0]?.lastChild?.lastChild as Element)?.querySelector("a");

  if (!targetNode) {
    console.error("Target node not found");
    return;
  }
  boardStatusObserver = new MutationObserver((m) => {
    m.forEach((record) => {
      if (record.type === "characterData" && record.target.textContent && Object.values(BoardStatus).includes(record.target.textContent as BoardStatus)) {
        AutodartsToolsBoardStatus.setValue(record.target.textContent as BoardStatus).catch(console.error);
      }
    });
  });
  boardStatusObserver.observe(targetNode, { characterData: true, subtree: true });
}
