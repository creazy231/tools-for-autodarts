import "~/assets/tailwind.css";
import { createApp } from "vue";
import Takeout from "./Takeout.vue";
import { waitForElement } from "@/utils";
import type { IConfig, IMatchStatus } from "@/utils/storage";
import {
  AutodartsToolsBoardStatus,
  AutodartsToolsConfig,
  AutodartsToolsGlobalStatus,
  AutodartsToolsMatchStatus,
  AutodartsToolsUrlStatus,
  defaultMatchStatus,
} from "@/utils/storage";

import { scoreSmaller } from "@/entrypoints/match.content/scoreSmaller";
import { colorChange, onRemove as onRemoveColorChange } from "@/entrypoints/match.content/color-change";
import StreamingMode from "@/entrypoints/match.content/StreamingMode.vue";

import { sounds } from "@/entrypoints/match.content/sounds";
import { getBoardStatusEl, getMenu } from "@/utils/getElements";
import { BoardStatus } from "@/utils/types";
import { isBullOff, isCricket, isValidGameMode, isX01 } from "@/utils/helpers";
import { soundsWinner } from "@/entrypoints/match.content/soundsWinner";
import { setCricketClosedPoints } from "@/entrypoints/match.content/setCricketPoints";
import { hideMenu } from "@/entrypoints/match.content/hideMenu";
import { automaticNextLeg } from "@/entrypoints/match.content/automaticNextLeg";
import { playerMatchDataLarger } from "@/entrypoints/match.content/playerMatchDataLarger";
import {
  removeWinnerAnimation,
  removeWinnerAnimationOnEdit,
  winnerAnimation,
} from "@/entrypoints/match.content/winnerAnimation";
import { soundsStart } from "@/entrypoints/match.content/soundsStart";
import { liveViewRing } from "@/entrypoints/match.content/liveViewRing";
import { setPlayerInfo } from "@/entrypoints/match.content/setPlayerInfo";
import { nextPlayerAfter3darts } from "@/entrypoints/match.content/nextPlayerAfter3darts";
import { handleUndoMode } from "@/entrypoints/match.content/handleUndoMode";
import { nextPlayerOnTakeOutStuck } from "@/entrypoints/match.content/nextPlayerOnTakeOutStuck";
import { disableTakeout } from "@/entrypoints/match.content/disableTakeout";

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

        if (!config.disableTakeout.enabled) {
          const takeoutDiv = document.querySelector("autodarts-tools-takeout");
          if (!takeoutDiv) initTakeout(ctx).catch(console.error);
        }

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
        streamingModeUI?.remove();
        streamingModeUI = null;
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
  const config = await AutodartsToolsConfig.getValue();
  await AutodartsToolsMatchStatus.setValue(defaultMatchStatus);
  const globalStatus = await AutodartsToolsGlobalStatus.getValue();

  startThrowsObserver();
  if (!config.disableTakeout.enabled && getBoardStatusEl() && (config.takeout.enabled || config.automaticNextLeg.enabled || config.nextPlayerOnTakeOutStuck.enabled)) startBoardStatusObserver();

  if (isX01() && config.liveViewRing.enabled) {
    await liveViewRing();
    startViewObserver();
  }

  if (config.colors.enabled) {
    await colorChange();
  }

  await hideMenu();
  await playerMatchDataLarger();
  await handleUndoMode();
  if (!config.disableTakeout.enabled) {
    await nextPlayerOnTakeOutStuck();
  }

  if (isValidGameMode()) {
    if (globalStatus.isFirstStart) {
      await soundsStart();
      await AutodartsToolsGlobalStatus.setValue({ ...globalStatus, isFirstStart: false });
    }

    await disableTakeout();
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

async function throwsChange() {
  await setPlayerInfo();

  const matchStatus: IMatchStatus = await AutodartsToolsMatchStatus.getValue();

  if (isValidGameMode()) {
    if (matchStatus.hasWinner) {
      if (matchStatus.isInEditMode) {
        await removeWinnerAnimationOnEdit();
      } else {
        await winnerAnimation();
      }
    } else {
      await removeWinnerAnimation();
    }

    await nextPlayerAfter3darts();
  }

  if (isBullOff() && matchStatus.hasWinner) {
    const bullOffInterval = setInterval(() => {
      if (isValidGameMode()) {
        clearInterval(bullOffInterval);
        initMatch().catch(console.error);
      }
    }, 1000);
  }

  await scoreSmaller();
  await sounds();

  if (isCricket()) await setCricketClosedPoints(matchStatus.playerCount).catch(console.error);

  matchStatus.hasWinner && isValidGameMode() && (await soundsWinner());

  await AutodartsToolsMatchStatus.setValue({
    ...matchStatus,
    isInUndoMode: false,
  });
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
  const targetNode = getBoardStatusEl();
  if (!targetNode) {
    console.log("Autodarts Tools: No board status found");
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

function startViewObserver() {
  const targetNode = document.getElementById("ad-ext-turn")?.nextElementSibling;
  if (!targetNode) {
    console.error("Target node not found");
    return;
  }
  throwsObserver = new MutationObserver((m) => {
    m.forEach(async (record) => {
      if (record.addedNodes.length > 0 && record.addedNodes[0] && (record.addedNodes[0] as HTMLElement).childElementCount === 2 && (record.addedNodes[0] as HTMLElement).children[1].childElementCount === 2) {
        await liveViewRing();
      }
    });
  });
  throwsObserver.observe(targetNode, { childList: true, subtree: true, attributes: false });
}
