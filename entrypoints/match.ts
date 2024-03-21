import "@/assets/tailwind.css";
import { createApp } from "vue";
import Caller from "./match.content/Caller.vue";
import Takeout from "./match.content/Takeout.vue";
import { waitForElement } from "@/utils";
import type { IMatchStatus } from "@/utils/storage";
import { AutodartsToolsBoardStatus, AutodartsToolsConfig, AutodartsToolsMatchStatus, BoardStatus } from "@/utils/storage";

let callerUI: any;
let takeoutUI: any;
let matchReadyUnwatch: any;
let throwsObserver: MutationObserver;
let boardStatusObserver: MutationObserver;

export default defineContentScript({
  matches: [ "*://play.autodarts.io/*" ],
  cssInjectionMode: "ui",
  async main(ctx: any) {
    matchReadyUnwatch = AutodartsToolsConfig.watch(async (config: any) => {
      if (config.url.match(/\/matches\/[0-9a-fA-F]{8}\b-/)?.[0]) {
        await waitForElement("#ad-ext-turn");
        console.log("match ready");
        const callerDiv = document.querySelector("autodarts-tools-caller");
        if (!callerDiv) initCaller(ctx).catch(console.error);
        const takeoutDiv = document.querySelector("autodarts-tools-takeout");
        if (!takeoutDiv) initTakeout(ctx).catch(console.error);
        await throwsChange(); // init matchData
        startThrowsObserver();
        startBoardStatusObserver();
      } else {
        throwsObserver?.disconnect();
        boardStatusObserver?.disconnect();
        callerUI?.remove();
        callerUI = null;
        takeoutUI?.remove();
        takeoutUI = null;
      }
    });
  },
});

async function initCaller(ctx) {
  callerUI = await createShadowRootUi(ctx, {
    name: "autodarts-tools-caller",
    position: "inline",
    anchor: "#root > div > div:nth-of-type(2)",
    onMount: (container) => {
      const caller = createApp(Caller);
      caller.mount(container);
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        container.classList.add("dark");
      }
      return caller;
    },
    onRemove: (caller) => {
      caller?.unmount();
    },
  });
  callerUI.mount();
}

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

async function throwsChange() {
  console.log("throws change");
  const editPlayerThrowActive = document.querySelector(".ad-ext-turn-throw.css-6pn4tf");
  const activePlayerCardPointsEl = document.querySelector(".ad-ext-player-active .ad-ext-player-score");
  const inactivePlayerCardPointsElArr = [ ...document.querySelectorAll(".ad-ext-player-inactive .ad-ext-player-score") ];
  const winnerPlayerCard = document.querySelector(".ad-ext-player-winner");

  const matchStatus: IMatchStatus = await AutodartsToolsMatchStatus.getValue();

  console.log("editPlayerThrowActive", !!editPlayerThrowActive);
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
    throwsChange();
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
        AutodartsToolsBoardStatus.setValue(record.target.textContent as BoardStatus);
      }
    });
  });
  boardStatusObserver.observe(targetNode, { characterData: true, subtree: true });
}
