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
import { getMenu, getMenuBar } from "@/utils/getElements";
import { BoardStatus } from "@/utils/types";
import { isBullOff, isCricket, isX01 } from "@/utils/helpers";
import { soundsWinner } from "@/entrypoints/match.content/soundsWinner";
import { setCricketClosedPoints } from "@/entrypoints/match.content/setCricketPoints";
import { hideMenu } from "@/entrypoints/match.content/hideMenu";
import { automaticNextLeg } from "@/entrypoints/match.content/automaticNextLeg";
import { playerMatchDataLarger } from "@/entrypoints/match.content/playerMatchDataLarger";
import { removeWinnerAnimation, winnerAnimation } from "@/entrypoints/match.content/winnerAnimation";

let takeoutUI: any;
let streamingModeUI: any;
let matchReadyUnwatch: any;
let throwsObserver: MutationObserver;
let boardStatusObserver: MutationObserver;

export default defineContentScript({
  matches: [ "*://play.autodarts.io/*" ],
  cssInjectionMode: "ui",
  async main(ctx: any) {
    matchReadyUnwatch = AutodartsToolsUrlStatus.watch(async (url: string) => {
      const config: IConfig = await AutodartsToolsConfig.getValue();
      if (/(?<!history)(\/matches\/|\/boards\/)/.test(url)) {
        await waitForElement("#ad-ext-turn");
        console.log("Autodarts Tools: Match Ready");

        const takeoutDiv = document.querySelector("autodarts-tools-takeout");
        if (!takeoutDiv) initTakeout(ctx).catch(console.error);

        if (config.streamingMode.enabled) {
          const div = document.querySelector("autodarts-tools-streaming-mode");
          if (!div) initStreamingMode(ctx).catch(console.error);
        }

        initMatch().catch(console.error);
      } else {
        throwsObserver?.disconnect();
        boardStatusObserver?.disconnect();
        takeoutUI?.remove();
        takeoutUI = null;
        await onRemoveColorChange();
        const menu = getMenu();
        if (menu) menu.style.display = "flex";
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

  await hideMenu();
  await playerMatchDataLarger();

  throwsChange().catch(console.error);
}

async function endMatch() {
  console.log("endmatch");
  await hideMenu(false);
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
  const hasWinner = document.querySelector(".ad-ext-player-winner");
  const isValidGameMode = isX01() || isCricket();

  if (isValidGameMode) {
    if (hasWinner) {
      await winnerAnimation();
    } else {
      await removeWinnerAnimation();
    }
  }

  const editPlayerThrowActive = document.querySelector(".ad-ext-turn-throw.css-6pn4tf");
  const turnPoints = document.querySelector<HTMLElement>(".ad-ext-turn-points")?.innerText.trim();

  const turnContainerEl = document.getElementById("ad-ext-turn");
  const throws = [ ...turnContainerEl?.querySelectorAll(".ad-ext-turn-throw") as NodeListOf<HTMLElement> ].map(el => el.innerText);

  if (isBullOff() && hasWinner) {
    const bullOffInterval = setInterval(() => {
      if (isValidGameMode) {
        clearInterval(bullOffInterval);
        initMatch().catch(console.error);
      }
    }, 1000);
  }

  const playerCount = document.getElementById("ad-ext-player-display")?.children.length || 0;

  const matchStatus: IMatchStatus = await AutodartsToolsMatchStatus.getValue();

  await AutodartsToolsMatchStatus.setValue({
    ...matchStatus,
    playerCount,
    throws,
    turnPoints,
    isInEditMode: !!editPlayerThrowActive,
    hasWinner: !!hasWinner,
  });

  await scoreSmaller();
  await sounds();
  await sounds();

  if (isCricket()) await setCricketClosedPoints(playerCount).catch(console.error);

  hasWinner && isValidGameMode && (await soundsWinner());
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
        // automatic next leg if board status is throw (so it starts counting after takeout)
        if (record.target.textContent === BoardStatus.THROW) {
          AutodartsToolsMatchStatus.getValue().then((matchStatus) => {
            if (matchStatus.hasWinner) automaticNextLeg().catch(console.error);
          });
        }
      }
    });
  });
  boardStatusObserver.observe(targetNode, { characterData: true, subtree: true });
}
