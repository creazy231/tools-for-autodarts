import "~/assets/tailwind.css";
import { createApp } from "vue";

import { colorChange, onRemove as colorChangeOnRemove } from "./color-change";
import Takeout from "./Takeout.vue";
import { nextPlayerOnTakeOutStuck, nextPlayerOnTakeOutStuckOnRemove } from "./next-player-on-take-out-stuck";
import { automaticNextLeg, automaticNextLegOnRemove } from "./automatic-next-leg";
import { smallerScores } from "./smaller-scores";
import { hideMenuInMatch, hideMenuInMatchOnRemove } from "./hide-menu-in-match";
import { automaticFullscreen, automaticFullscreenOnRemove } from "./automatic-fullscreen";
import { largerPlayerMatchData } from "./larger-player-match-data";
import { largerLegsSets } from "./larger-legs-sets";
import { largerPlayerNames } from "./larger-player-names";
import { winnerAnimation, winnerAnimationOnRemove } from "./winner-animation";
import { soundFx, soundFxOnRemove } from "./sound-fx";
import { wledFx, wledFxOnRemove } from "./wled";
import { caller, callerOnRemove } from "./caller";
import Zoom from "./Zoom.vue";
import Animations from "./Animations.vue";
import StreamingMode from "./StreamingMode.vue";
import QuickCorrection from "./QuickCorrection.vue";
import InstantReplay from "./InstantReplay.vue";
import Gotcha from "./Gotcha.vue";
import CheckoutGuide from "./CheckoutGuide.vue";
import { discordStream, discordStreamOnRemove } from "./discord-stream";
import { enhancedScoringDisplay, enhancedScoringDisplayOnRemove } from "./enhanced-scoring-display";

import type { IConfig } from "@/utils/storage";

import { waitForElement, waitForElementWithTextContent } from "@/utils";
import {
  AutodartsToolsConfig,
  AutodartsToolsUrlStatus,
} from "@/utils/storage";
import { SELECTORS } from "@/utils/selectors";
import { fetchWithAuth, isSafari, isiOS } from "@/utils/helpers";
import { processWebSocketMessage } from "@/utils/websocket-helpers";
import { AutodartsToolsGameData } from "@/utils/game-data-storage";
import { AUTODARTS_MATCHES } from "@/utils/content-script-matches";

let matchInitialized = false;
let activeMatchObserver: MutationObserver;
let gameDataWatcher: any;

/**
 * Match features whose port to the rebuilt site has landed.
 *
 * Everything below still targets the old Chakra markup — `#ad-ext-turn`,
 * `.ad-ext-player`, `#root > div > div:nth-of-type(2)` — none of which the
 * rebuilt match screen emits. Turning them loose on it does nothing useful and
 * plenty that is confusing, and their settings cards are disabled, so a user
 * carrying `enabled: true` from before could not switch them off.
 *
 * Mirrors `v2Ready` in components/PageConfig.vue — add the key here and set the
 * flag there as each feature is ported.
 */
const PORTED_TO_V2 = new Set<keyof IConfig>([ "animations" ]);

function isOn(config: IConfig, feature: keyof IConfig): boolean {
  if (!PORTED_TO_V2.has(feature)) return false;
  return Boolean((config[feature] as { enabled?: boolean })?.enabled);
}

const tools = {
  streamingMode: null as any,
  takeout: null as any,
  animations: null as any,
  zoom: null as any,
  quickCorrection: null as any,
  enhancedScoringDisplay: null as any,
  instantReplay: null as any,
  gotcha: null as any,
  checkoutGuide: null as any,
};

export default defineContentScript({
  matches: AUTODARTS_MATCHES,
  cssInjectionMode: "ui",
  async main(ctx: any) {
    AutodartsToolsUrlStatus.watch(async (url: string) => {
      if (!url && (isiOS() || isSafari())) url = window.location.href;

      if (/\/(matches|boards)\/([0-9a-f-]+)/.test(url) && !url.includes("history")) {
        // The app shell. The old gate here, `#root > div > div:nth-of-type(2)`,
        // resolves on v2 to an empty zero-height trailing div — it settles, so
        // nothing looked broken, but it was not waiting for anything.
        await waitForElement(SELECTORS.app.contentRoot, 15000).catch(() => {
          console.warn("Autodarts Tools: Match page did not render in time");
        });

        // Extract lobby ID from URL and fetch lobby data
        let matchId = url.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/)?.[0];
        if (matchId) {
          try {
            console.log("Autodarts Tools: Fetching match data with cookie authentication...");

            if (url.includes("boards")) {
              const apiUrl = `https://api.autodarts.com/bs/v0/boards/${matchId}`;
              const response = await fetchWithAuth(apiUrl);

              if (response.ok) {
                matchId = (await response.json()).matchId;
              }
            }

            console.log("Autodarts Tools: Match ID:", matchId);

            const apiUrl = `https://api.autodarts.com/gs/v0/matches/${matchId}/state`;
            const response = await fetchWithAuth(apiUrl);

            console.log("Autodarts Tools: Response status:", response.status);

            if (response.ok) {
              const matchData = await response.json();
              console.log("Autodarts Tools: Match Data:", matchData);
              await processWebSocketMessage("autodarts.matches", matchData);
            } else {
              console.error("Autodarts Tools: Failed to fetch match data", response.status, response.statusText);
            }
          } catch (error) {
            console.error("Autodarts Tools: Error fetching match data:", error);
          }
        }

        const activeMatch = window.location.href.includes("boards") ? !(await waitForElementWithTextContent("h2", [ "Board has no active match", "Board hat kein aktives Spiel", "Bord heeft geen actieve wedstrijd" ], 1000).catch(() => undefined)) : true;

        if (activeMatch) {
          console.log("Autodarts Tools: Match found, initializing match");
          initMatch(ctx, url, matchId).catch(console.error);

          if (!gameDataWatcher) {
            gameDataWatcher = AutodartsToolsGameData.watch(async (value, oldValue) => {
              if (oldValue?.match?.variant === "Bull-off" && value?.match?.variant !== "Bull-off") {
                // Get current URL and matchId instead of using closure values
                const currentUrl = window.location.href;
                const currentMatchId = value?.match?.id || currentUrl.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/)?.[0];
                clearMatch(true);
                await new Promise(resolve => setTimeout(resolve, 2000));
                return initMatch(ctx, currentUrl, currentMatchId);
              }
            });
          }
        } else {
          console.log("Autodarts Tools: No Active Match found, waiting for match to start");
        }

        // Disconnect existing observer before creating a new one
        activeMatchObserver?.disconnect();
        activeMatchObserver = startActiveMatchObserver(ctx);
      } else {
        clearMatch();
      }
    });
  },
});

async function initMatch(ctx, url: string, matchId?: string) {
  if (matchInitialized) return;
  matchInitialized = true;

  console.log("Autodarts Tools: Initializing match");

  const config = await AutodartsToolsConfig.getValue();

  if (isOn(config, "hideMenuInMatch")) {
    await initScript(hideMenuInMatch, url).catch(console.error);
  }

  if (isOn(config, "automaticFullscreen")) {
    await initScript(automaticFullscreen, url).catch(console.error);
  }

  if (isOn(config, "streamingMode")) {
    await initStreamingMode(ctx).catch(console.error);
  }

  if (isOn(config, "colors")) {
    await initScript(colorChange, url).catch(console.error);
  }

  if (isOn(config, "takeout")) {
    await initTakeout(ctx).catch(console.error);
  }

  if (isOn(config, "nextPlayerOnTakeOutStuck")) {
    await initScript(nextPlayerOnTakeOutStuck, url).catch(console.error);
  }

  if (isOn(config, "automaticNextLeg")) {
    await initScript(automaticNextLeg, url).catch(console.error);
  }

  if (isOn(config, "smallerScores")) {
    await initScript(smallerScores, url).catch(console.error);
  }

  if (isOn(config, "largerLegsSets")) {
    await initScript(largerLegsSets, url).catch(console.error);
  }

  if (isOn(config, "largerPlayerMatchData")) {
    await initScript(largerPlayerMatchData, url).catch(console.error);
  }

  if (isOn(config, "largerPlayerNames")) {
    await initScript(largerPlayerNames, url).catch(console.error);
  }

  if (isOn(config, "winnerAnimation")) {
    await initScript(winnerAnimation, url).catch(console.error);
  }

  if (isOn(config, "zoom")) {
    await initZoom(ctx).catch(console.error);
  }

  if (isOn(config, "quickCorrection")) {
    await initQuickCorrection(ctx).catch(console.error);
  }

  if (isOn(config, "instantReplay")) {
    await initInstantReplay(ctx).catch(console.error);
  }

  if (isOn(config, "gotcha")) {
    await initGotcha(ctx).catch(console.error);
  }

  if (isOn(config, "checkoutGuide")) {
    await initCheckoutGuide(ctx).catch(console.error);
  }

  // Discord's lobby half — the webhook announcements — is ported and enabled in
  // entrypoints/lobby.content. This is the other half, which starts a stream
  // once the match begins, and it is not.
  if (matchId && isOn(config, "discord") && config.discord.autoStartAfterTimer?.stream) {
    if (config.discord.autoStartAfterTimer?.matchId === matchId || config.discord.autoStartAfterTimer?.matchId?.includes(matchId)) await initScript(discordStream, url).catch(console.error);
  }

  // *********************** YOU CAN ADD HERE ***********************

  if (isOn(config, "enhancedScoringDisplay")) {
    await initScript(enhancedScoringDisplay, url).catch(console.error);
  }

  // ****************************************************************

  if (isOn(config, "animations")) {
    await initAnimations(ctx).catch(console.error);
  }

  if (isOn(config, "caller")) {
    await initScript(caller, url).catch(console.error);
  }

  if (isOn(config, "soundFx")) {
    await initScript(soundFx, url).catch(console.error);
  }

  if (isOn(config, "wledFx")) {
    await initScript(wledFx, url).catch(console.error);
  }
}

function clearMatch(fromBullOff: boolean = false) {
  console.log("Autodarts Tools: Clearing match");

  // Always disconnect the observer when clearing
  activeMatchObserver?.disconnect();
  activeMatchObserver = null;

  // Clean up gameDataWatcher
  if (gameDataWatcher) {
    gameDataWatcher();
    gameDataWatcher = null;
  }

  tools.streamingMode?.remove();
  tools.takeout?.remove();
  tools.animations?.remove();
  tools.zoom?.remove();
  tools.gotcha?.forEach((e) =>  e.remove());
  tools.checkoutGuide?.forEach((e) =>  e.remove());
  tools.quickCorrection?.remove();
  tools.instantReplay?.remove();
  colorChangeOnRemove();
  if (!fromBullOff) hideMenuInMatchOnRemove();
  if (!fromBullOff) automaticFullscreenOnRemove();
  winnerAnimationOnRemove();
  callerOnRemove();
  soundFxOnRemove();
  wledFxOnRemove();
  nextPlayerOnTakeOutStuckOnRemove();
  discordStreamOnRemove();
  automaticNextLegOnRemove();
  enhancedScoringDisplayOnRemove();
  matchInitialized = false;
}

async function initScript(fn: any, url: string) {
  if (window.location.href !== url) return;
  await fn();
}

function startActiveMatchObserver(ctx) {
  const targetNode = document.querySelector("#root > div > div:nth-of-type(2)");
  const observer = new MutationObserver(async () => {
    const url = window.location.href;
    // Check for match/board URL pattern and exclude history pages
    if (!(/\/(matches|boards)\/([0-9a-f-]+)/.test(url)) || url.includes("history")) return;

    // Check if the "Board has no active match" element no longer exists
    const activeMatch = window.location.href.includes("boards") ? !(await waitForElementWithTextContent("h2", [ "Board has no active match", "Board hat kein aktives Spiel", "Bord heeft geen actieve wedstrijd" ], 1000).catch(() => undefined)) : true;

    if (!activeMatch) {
      console.log("Autodarts Tools Observer: No Active Match found, waiting for match to start");
      if (matchInitialized) {
        matchInitialized = false;
        clearMatch();
      }
    } else {
      const url = await AutodartsToolsUrlStatus.getValue();
      let matchId = url.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/)?.[0];

      if (url.includes("boards")) {
        const apiUrl = `https://api.autodarts.com/bs/v0/boards/${matchId}`;
        const response = await fetchWithAuth(apiUrl);

        if (response.ok) {
          matchId = (await response.json()).matchId;
        }
      }

      console.log("Autodarts Tools Observer: Match ID:", matchId);

      if (!matchInitialized && matchId) {
        console.log("Autodarts Tools Observer: Match found, initializing match because activeMatch is true");
        initMatch(ctx, url, matchId).catch(console.error);
      }
    }
  });

  // Add null check before observing
  if (targetNode) {
    observer.observe(targetNode, {
      childList: true,
      subtree: true,
    });
  }

  return observer;
}

async function initTakeout(ctx) {
  tools.takeout = await createShadowRootUi(ctx, {
    name: "autodarts-tools-takeout",
    position: "inline",
    anchor: "#root > div > div:nth-of-type(2)",
    onMount: (container) => {
      console.log("Autodarts Tools: Takeout initialized");
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
  tools.takeout.mount();
}

async function initStreamingMode(ctx) {
  await waitForElement("#ad-ext-player-display");
  tools.streamingMode = await createShadowRootUi(ctx, {
    name: "autodarts-tools-streaming-mode",
    position: "inline",
    anchor: "#root",
    onMount: (container: any) => {
      console.log("Autodarts Tools: Streaming Mode initialized");
      const app = createApp(StreamingMode);
      app.mount(container);
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        container.classList.add("dark");
      }
      return app;
    },
    onRemove: (app: any) => {
      app?.unmount();
      console.log("Autodarts Tools: Streaming Mode removed");
    },
  });

  tools.streamingMode.mount();
}

async function initAnimations(ctx) {
  // The app shell, not the match screen: the overlay covers the viewport and
  // measures the board when it plays, so it has nothing to wait for beyond a
  // rendered page. Anchoring it in `body` also keeps it clear of the grid cell
  // the site re-renders around the board on every throw.
  await waitForElement(SELECTORS.app.contentRoot, 15000).catch(() => {
    console.warn("Autodarts Tools: Animations - page did not render in time");
  });

  tools.animations = await createShadowRootUi(ctx, {
    name: "autodarts-tools-animations",
    position: "inline",
    anchor: "body",
    append: "last",
    // The overlay pins itself — see Animations.vue for why the host cannot.
    onMount: (container: any) => {
      console.log("Autodarts Tools: Animations initialized");
      const app = createApp(Animations);
      app.mount(container);
      container.classList.add("dark");
      return app;
    },
    onRemove: (app: any) => {
      app?.unmount();
      console.log("Autodarts Tools: Animations removed");
    },
  });

  tools.animations.mount();
}

async function initZoom(ctx) {
  await waitForElement("#root > div > div:nth-of-type(2)");
  const config = await AutodartsToolsConfig.getValue();

  const selector = (config.zoom.position === "bottom-right" || config.zoom.position === "bottom-left") ? "#root > div > div:nth-of-type(2)" : "#root > div > div:nth-of-type(1)";

  tools.zoom = await createShadowRootUi(ctx, {
    name: "autodarts-tools-zoom",
    position: "inline",
    anchor: selector,
    onMount: (container: any) => {
      console.log("Autodarts Tools: Zoom initialized");
      const app = createApp(Zoom);
      app.mount(container);
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        container.classList.add("dark");
      }
      return app;
    },
    onRemove: (app: any) => {
      app?.unmount();
      console.log("Autodarts Tools: Zoom removed");
    },
  });

  tools.zoom.mount();
}

async function initGotcha(ctx) {
  const selector = "div.ad-ext-player";
  await waitForElement(selector);
  const elements = document.querySelectorAll(selector);
  const shadowRootPromises = Array.from(elements).map(async (e, index) => {
    if (!e.id) {
      e.id = `ad-ext-player-${index}`;
    }
    return await createShadowRootUi(
      ctx,
      {
        name: "autodarts-tools-gotcha",
        position: "inline",
        anchor: `#${e.id} .ad-ext-player-score`,
        onMount: (container: any) => {
          console.log("Autodarts Tools: Gotcha: initialized");
          const app = createApp(Gotcha, { playerIndex: index });
          app.mount(container);
          if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
            container.classList.add("dark");
          }
          return app;
        },
        onRemove: (app: any) => {
          app?.unmount();
          console.log("Autodarts Tools: Gotcha: removed");
        },
      }
    );
  });
  tools.gotcha = await Promise.all(shadowRootPromises);
  tools.gotcha.forEach((e) =>  e.mount());
}

async function initCheckoutGuide(ctx) {
  const selector = ".ad-ext-player-score";
  await waitForElement(selector);
  const elements = document.querySelectorAll(selector);
  const shadowRootPromises = Array.from(elements).map(async (e, index) => {
    if (!e.id) {
      e.id = `ad-ext-player-${index}`;
    }
    return await createShadowRootUi(
      ctx,
      {
        name: "autodarts-tools-checkout-guide",
        position: "inline",
        anchor: `#${e.id} .ad-ext-player-score`,
        onMount: (container: any) => {
          console.log("Autodarts Tools: CheckoutGuide: initialized");
          const app = createApp(CheckoutGuide, { playerIndex: index });
          app.mount(container);
          if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
            container.classList.add("dark");
          }
          return app;
        },
        onRemove: (app: any) => {
          app?.unmount();
          console.log("Autodarts Tools: CheckoutGuide: removed");
        },
      }
    );
  });
  tools.checkoutGuide = await Promise.all(shadowRootPromises);
  tools.checkoutGuide.forEach((e) =>  e.mount());
}

async function initQuickCorrection(ctx) {
  await waitForElement("#root > div > div:nth-of-type(2)");
  tools.quickCorrection = await createShadowRootUi(ctx, {
    name: "autodarts-tools-quick-correction",
    position: "inline",
    anchor: "#root > div > div:nth-of-type(2)",
    onMount: (container: any) => {
      console.log("Autodarts Tools: Quick Correction initialized");
      const app = createApp(QuickCorrection);
      app.mount(container);
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        container.classList.add("dark");
      }
      return app;
    },
    onRemove: (app: any) => {
      app?.unmount();
      console.log("Autodarts Tools: Quick Correction removed");
    },
  });

  tools.quickCorrection.mount();
}

async function initInstantReplay(ctx) {
  await waitForElement("#root > div > div:nth-of-type(2)");
  tools.instantReplay = await createShadowRootUi(ctx, {
    name: "autodarts-tools-instant-replay",
    position: "inline",
    anchor: "#root > div > div:nth-of-type(2)",
    onMount: (container: any) => {
      console.log("Autodarts Tools: Instant Replay initialized");
      const app = createApp(InstantReplay);
      app.mount(container);
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        container.classList.add("dark");
      }
      return app;
    },
    onRemove: (app: any) => {
      app?.unmount();
      console.log("Autodarts Tools: Instant Replay removed");
    },
  });

  tools.instantReplay.mount();
}
