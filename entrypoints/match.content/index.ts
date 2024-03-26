import "~/assets/tailwind.css";
import { createApp } from "vue";
import Takeout from "./Takeout.vue";
import { waitForElement } from "@/utils";
import type { IConfig, IMatchStatus } from "@/utils/storage";
import {
  AutodartsToolsBoardStatus,
  AutodartsToolsConfig,
  AutodartsToolsMatchStatus,
  AutodartsToolsUrlStatus,
  defaultMatchStatus,
} from "@/utils/storage";

import { scoreSmaller } from "@/entrypoints/match.content/scoreSmaller";
import { colorChange, onRemove as onRemoveColorChange } from "@/entrypoints/match.content/color-change";
import StreamingMode from "@/entrypoints/match.content/StreamingMode.vue";

import { sounds } from "@/entrypoints/match.content/sounds";
import { getMenuBar } from "@/utils/getElements";
import { BoardStatus } from "@/utils/types";
import { isBullOff, isX01 } from "@/utils/helpers";
import SoundsStart from "@/entrypoints/match.content/SoundsStart.vue";
import { soundsWinner } from "@/entrypoints/match.content/soundsWinner";

let takeoutUI: any;
let streamingModeUI: any;
let soundsstartUI: any;
let matchReadyUnwatch: any;
let throwsObserver: MutationObserver;
let boardStatusObserver: MutationObserver;

export default defineContentScript({
  matches: [ "*://play.autodarts.io/*" ],
  cssInjectionMode: "ui",
  async main(ctx: any) {
    matchReadyUnwatch = AutodartsToolsUrlStatus.watch(async (url: string) => {
      const config: IConfig = await AutodartsToolsConfig.getValue();
      if (/\/matches\/|\/boards\//.test(url)) {
        await waitForElement("#ad-ext-turn");
        console.log("Autodarts Tools: Match Ready");

        const takeoutDiv = document.querySelector("autodarts-tools-takeout");
        if (!takeoutDiv) initTakeout(ctx).catch(console.error);

        if (config.streamingMode.enabled) {
          const div = document.querySelector("autodarts-tools-streaming-mode");
          if (!div) initStreamingMode(ctx).catch(console.error);
        }

        if (config.sounds.enabled || config.caller.enabled) {
          const div = document.querySelector("autodarts-tools-soundsstart");
          if (!div) initSoundsstart(ctx).catch(console.error);
        }

        initMatch().catch(console.error);
      } else {
        throwsObserver?.disconnect();
        boardStatusObserver?.disconnect();
        takeoutUI?.remove();
        takeoutUI = null;
        soundsstartUI?.remove();
        soundsstartUI = null;
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

async function initMatch() {
  startThrowsObserver();
  startBoardStatusObserver();

  const config = await AutodartsToolsConfig.getValue();
  await AutodartsToolsMatchStatus.setValue(defaultMatchStatus);

  if (config.colors.enabled) {
    await colorChange();
  }

  throwsChange().catch(console.error);
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

async function initSoundsstart(ctx) {
  soundsstartUI = await createShadowRootUi(ctx, {
    name: "autodarts-tools-soundsstart",
    position: "inline",
    anchor: "#root > div > div:nth-of-type(2)",
    onMount: (container) => {
      const soundsstart = createApp(SoundsStart);
      soundsstart.mount(container);
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        container.classList.add("dark");
      }
      return soundsstart;
    },
    onRemove: (soundsstart) => {
      soundsstart?.unmount();
    },
  });
  soundsstartUI.mount();
}

async function throwsChange() {
  const hasWinner = document.querySelector(".ad-ext-player-winner");

  const editPlayerThrowActive = document.querySelector(".ad-ext-turn-throw.css-6pn4tf");
  const turnPoints = document.querySelector<HTMLElement>(".ad-ext-turn-points")?.innerText.trim();

  const turnContainerEl = document.getElementById("ad-ext-turn");
  const throws = [ ...turnContainerEl?.querySelectorAll(".ad-ext-turn-throw") as NodeListOf<HTMLElement> ].map(el => el.innerText);

  if (isBullOff() && hasWinner) {
    const bullOffInterval = setInterval(() => {
      if (isX01()) {
        clearInterval(bullOffInterval);
        initMatch().catch(console.error);
      }
    }, 1000);
  }

  const matchStatus: IMatchStatus = await AutodartsToolsMatchStatus.getValue();

  await AutodartsToolsMatchStatus.setValue({
    ...matchStatus,
    throws,
    turnPoints,
    isInEditMode: !!editPlayerThrowActive,
    hasWinner: !!hasWinner,
  });

  await scoreSmaller();
  await sounds();
  hasWinner && (await soundsWinner());
}

function startThrowsObserver() {
  const targetNode = document.getElementById("ad-ext-turn");
  if (!targetNode) {
    console.error("Target node not found");
    return;
  }
  throwsObserver = new MutationObserver((m) => {
    if (m[0].attributeName === "class") {
      // timeout to get correct values after edit
      setTimeout(() => throwsChange().catch(console.error), 500);
    }
  });
  throwsObserver.observe(targetNode, { childList: false, subtree: true, attributes: true });
}

function startBoardStatusObserver() {
  const targetNode = (getMenuBar()?.lastChild?.lastChild as Element)?.querySelector("a");
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
