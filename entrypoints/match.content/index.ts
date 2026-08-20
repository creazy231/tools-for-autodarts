import "~/assets/tailwind.css";
import { createApp } from "vue";

import { colorChange, onRemove as colorChangeOnRemove } from "./color-change";
import { takeout, takeoutOnRemove } from "./takeout";
import { nextPlayerOnTakeOutStuck, nextPlayerOnTakeOutStuckOnRemove } from "./next-player-on-take-out-stuck";
import { automaticNextLeg, automaticNextLegOnRemove } from "./automatic-next-leg";
import { smallerScores, smallerScoresOnRemove } from "./smaller-scores";
import { automaticFullscreen, automaticFullscreenOnRemove } from "./automatic-fullscreen";
import { largerPlayerMatchData, largerPlayerMatchDataOnRemove } from "./larger-player-match-data";
import { largerLegsSets, largerLegsSetsOnRemove } from "./larger-legs-sets";
import { largerPlayerNames, largerPlayerNamesOnRemove } from "./larger-player-names";
import { winnerAnimation, winnerAnimationOnRemove } from "./winner-animation";
import { soundFx, soundFxOnRemove } from "./sound-fx";
import { wledFx, wledFxOnRemove } from "./wled";
import { caller, callerOnRemove } from "./caller";
import { gotcha, gotchaOnRemove } from "./gotcha";
import { checkoutGuide, checkoutGuideOnRemove } from "./checkout-guide";
import { zoom, zoomOnRemove } from "./zoom";
import { boardView, boardViewOnRemove } from "./board-view";
import { instantReplay, instantReplayOnRemove } from "./instant-replay";
import Animations from "./Animations.vue";
import StreamingMode from "./StreamingMode.vue";
import QuickCorrection from "./QuickCorrection.vue";
import { discordStream, discordStreamOnRemove } from "./discord-stream";
import { enhancedScoringDisplay, enhancedScoringDisplayOnRemove } from "./enhanced-scoring-display";
import { quietOwnDarts, quietOwnDartsOnRemove } from "./quiet-own-darts";

import type { IConfig } from "@/utils/storage";

import { waitForElement } from "@/utils";
import {
  AutodartsToolsConfig,
  AutodartsToolsUrlStatus,
} from "@/utils/storage";
import { SELECTORS, exists, qs } from "@/utils/selectors";
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
 *
 * This gate is deliberately not conditioned on the site version, so an unported
 * feature is off on v1 too even though its implementation still works there.
 * v1 is being retired; the unported code goes with it. Do not add a
 * `detectSiteVersion()` check here to bring those features back on v1.
 */
const PORTED_TO_V2 = new Set<keyof IConfig>([
  "animations",
  "caller",
  "soundFx",
  "wledFx",
  "colors",
  "smallerScores",
  "largerLegsSets",
  "largerPlayerNames",
  "largerPlayerMatchData",
  "automaticFullscreen",
  "winnerAnimation",
  "enhancedScoringDisplay",
  "quickCorrection",
  "gotcha",
  "checkoutGuide",
  "takeout",
  "nextPlayerOnTakeOutStuck",
  "automaticNextLeg",
  "zoom",
  "boardView",
  "instantReplay",
]);

/**
 * Features that act on the match rather than describe it.
 *
 * These three reach for the site's own controls — Next, Next Leg, and the throw
 * a correction rewrites — and on a board page those belong to whoever is at the
 * oche, not to whoever is watching them. Everything else the match screen runs
 * is drawing, sound or light, and reads the same from either side of it.
 */
const PLAYING_ONLY = new Set<keyof IConfig>([
  "nextPlayerOnTakeOutStuck",
  "automaticNextLeg",
  "quickCorrection",
]);

/**
 * Whether this page is watching a board rather than playing at one.
 *
 * `/boards/<id>/follow` is the board's own page on the rebuilt site — it is
 * what the cards on /boards link to — and it shows the match that board is
 * playing, from the outside. Playing happens at `/matches/<id>`.
 */
function isFollowingBoard(): boolean {
  return /\/boards\/[0-9a-f-]+/i.test(window.location.href);
}

function isOn(config: IConfig, feature: keyof IConfig): boolean {
  if (!PORTED_TO_V2.has(feature)) return false;
  if (PLAYING_ONLY.has(feature) && isFollowingBoard()) return false;
  return Boolean((config[feature] as { enabled?: boolean })?.enabled);
}

const MATCH_ID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;

/**
 * Whether a match is drawn on the screen right now.
 *
 * `playerCardSurface` rather than `playerCards`, because the match screen has
 * three layouts and only the widest of them puts a column round each player —
 * on a tablet or a narrow window there is nothing per-player left but the card
 * face itself. Asking for the column instead answered "no match" all through a
 * match on a small screen.
 */
function matchOnScreen(): boolean {
  return exists(SELECTORS.match.playerCardSurface);
}

/** The match a board is playing right now, if it is playing one. */
async function matchIdForBoard(boardId: string): Promise<string | undefined> {
  try {
    const response = await fetchWithAuth(`https://api.autodarts.com/bs/v0/boards/${boardId}`);
    if (!response.ok) {
      console.warn("Autodarts Tools: could not read board", boardId, response.status);
      return undefined;
    }
    return (await response.json()).matchId || undefined;
  } catch (error) {
    console.error("Autodarts Tools: Error fetching board data:", error);
    return undefined;
  }
}

/**
 * Which match this page is about, and whether there is one to work with.
 *
 * A match page names its match and always has one. A board page names a board,
 * and its board is idle most of the time — so the board's own record is what
 * answers, which is the site's answer rather than a guess at its markup, and it
 * survives the language switcher.
 *
 * What it replaced did neither: it waited for an `h2` reading "Board has no
 * active match", which the rebuilt site never renders — it says "No active
 * match" in a `<p>`, and puts no `h2` on the page at all. So the wait always
 * timed out, the absence of the heading was read as "there is a match", and
 * every match feature started up on an empty board page.
 *
 * The screen still gets a moment to disagree, which covers both a board that
 * has just this second started a match and an API call that did not answer.
 */
async function resolveMatch(url: string): Promise<{ matchId?: string; active: boolean }> {
  const boardId = url.match(/\/boards\/([0-9a-f-]+)/i)?.[1];
  if (!boardId) return { matchId: url.match(MATCH_ID)?.[0], active: true };

  const matchId = await matchIdForBoard(boardId);
  if (matchId) return { matchId, active: true };

  const rendered = await waitForElement(SELECTORS.match.playerCardSurface, 1500).then(() => true).catch(() => false);
  return { active: rendered };
}

const tools = {
  streamingMode: null as any,
  animations: null as any,
  quickCorrection: null as any,
  enhancedScoringDisplay: null as any,
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

        const { matchId, active: activeMatch } = await resolveMatch(url);

        if (matchId) {
          try {
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

        if (activeMatch) {
          console.log("Autodarts Tools: Match found, initializing match");
          initMatch(ctx, url, matchId).catch(e => console.error(e));

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

  if (isOn(config, "automaticFullscreen")) {
    await initScript(automaticFullscreen, url).catch(e => console.error(e));
  }

  if (isOn(config, "streamingMode")) {
    await initStreamingMode(ctx).catch(e => console.error(e));
  }

  if (isOn(config, "colors")) {
    await initScript(colorChange, url).catch(e => console.error(e));
  }

  if (isOn(config, "takeout")) {
    await initScript(takeout, url).catch(e => console.error(e));
  }

  if (isOn(config, "nextPlayerOnTakeOutStuck")) {
    await initScript(nextPlayerOnTakeOutStuck, url).catch(e => console.error(e));
  }

  if (isOn(config, "automaticNextLeg")) {
    await initScript(automaticNextLeg, url).catch(e => console.error(e));
  }

  if (isOn(config, "smallerScores")) {
    await initScript(smallerScores, url).catch(e => console.error(e));
  }

  if (isOn(config, "largerLegsSets")) {
    await initScript(largerLegsSets, url).catch(e => console.error(e));
  }

  if (isOn(config, "largerPlayerMatchData")) {
    await initScript(largerPlayerMatchData, url).catch(e => console.error(e));
  }

  if (isOn(config, "largerPlayerNames")) {
    await initScript(largerPlayerNames, url).catch(e => console.error(e));
  }

  if (isOn(config, "winnerAnimation")) {
    await initScript(winnerAnimation, url).catch(e => console.error(e));
  }

  if (isOn(config, "boardView")) {
    await initScript(boardView, url).catch(e => console.error(e));
  }

  if (isOn(config, "zoom")) {
    await initScript(zoom, url).catch(e => console.error(e));
  }

  if (isOn(config, "quickCorrection")) {
    await initQuickCorrection(ctx).catch(e => console.error(e));
  }

  if (isOn(config, "instantReplay")) {
    await initScript(instantReplay, url).catch(e => console.error(e));
  }

  if (isOn(config, "gotcha")) {
    await initScript(gotcha, url).catch(e => console.error(e));
  }

  if (isOn(config, "checkoutGuide")) {
    await initScript(checkoutGuide, url).catch(e => console.error(e));
  }

  // Discord's lobby half — the webhook announcements — is ported and enabled in
  // entrypoints/lobby.content. This is the other half, which starts a stream
  // once the match begins, and it is not.
  if (matchId && isOn(config, "discord") && config.discord.autoStartAfterTimer?.stream) {
    if (config.discord.autoStartAfterTimer?.matchId === matchId || config.discord.autoStartAfterTimer?.matchId?.includes(matchId)) await initScript(discordStream, url).catch(e => console.error(e));
  }

  // *********************** YOU CAN ADD HERE ***********************

  if (isOn(config, "enhancedScoringDisplay")) {
    await initScript(enhancedScoringDisplay, url).catch(e => console.error(e));
  }

  // ****************************************************************

  if (isOn(config, "animations")) {
    await initAnimations(ctx).catch(e => console.error(e));
  }

  // No `isOn` gate: its switch is drawn into autodarts' own In Game Settings
  // rather than onto a card of ours, so the feature has to be running for
  // anyone to find it — including anyone who wants it off.
  await initScript(quietOwnDarts, url).catch(e => console.error(e));

  if (isOn(config, "caller")) {
    await initScript(caller, url).catch(e => console.error(e));
  }

  if (isOn(config, "soundFx")) {
    await initScript(soundFx, url).catch(e => console.error(e));
  }

  if (isOn(config, "wledFx")) {
    await initScript(wledFx, url).catch(e => console.error(e));
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
  tools.animations?.remove();
  tools.quickCorrection?.remove();
  colorChangeOnRemove();
  smallerScoresOnRemove();
  largerLegsSetsOnRemove();
  largerPlayerNamesOnRemove();
  largerPlayerMatchDataOnRemove();
  if (!fromBullOff) automaticFullscreenOnRemove();
  winnerAnimationOnRemove();
  callerOnRemove();
  soundFxOnRemove();
  wledFxOnRemove();
  nextPlayerOnTakeOutStuckOnRemove();
  discordStreamOnRemove();
  automaticNextLegOnRemove();
  enhancedScoringDisplayOnRemove();
  gotchaOnRemove();
  checkoutGuideOnRemove();
  takeoutOnRemove();
  zoomOnRemove();
  boardViewOnRemove();
  instantReplayOnRemove();
  quietOwnDartsOnRemove();
  matchInitialized = false;
}

async function initScript(fn: any, url: string) {
  if (window.location.href !== url) return;
  await fn();
}

/**
 * Notice a match starting or ending under a page we are already on.
 *
 * This matters most on a board page, which is where you sit and wait for
 * someone to start throwing — the URL never changes, so nothing else would ever
 * look again. It used to watch `#root > div > div:nth-of-type(2)`, which on the
 * rebuilt site is an empty trailing div that never mutates, so it never fired.
 *
 * `main` does mutate — constantly, on every dart — so the callback has to be
 * cheap. It settles for one `querySelector` in the steady state: only when what
 * is on screen disagrees with what has been initialised is anything else asked,
 * and only then is the board endpoint consulted.
 */
function startActiveMatchObserver(ctx) {
  const targetNode = qs(SELECTORS.app.contentRoot);
  let settle: ReturnType<typeof setTimeout> | null = null;
  let busy = false;

  const observer = new MutationObserver(() => {
    if (settle) clearTimeout(settle);
    settle = setTimeout(async () => {
      settle = null;
      if (busy) return;

      const url = window.location.href;
      // Check for match/board URL pattern and exclude history pages
      if (!(/\/(matches|boards)\/([0-9a-f-]+)/.test(url)) || url.includes("history")) return;

      // The cheap half: a match screen draws a card per player, and nothing
      // else on these routes does. While that agrees with what is running there
      // is nothing to decide, and the board endpoint is never asked.
      if (matchOnScreen() === matchInitialized) return;

      busy = true;
      try {
        const { matchId, active } = await resolveMatch(url);

        if (!active) {
          console.log("Autodarts Tools Observer: No Active Match found, waiting for match to start");
          if (matchInitialized) {
            // Tearing the match down stops this observer with it, and a board
            // page stays put while one match ends and the next begins — so it
            // goes straight back on, or nothing would notice the next one.
            //
            // The same instance, rather than a fresh one from the factory:
            // naming the factory in here makes it reference itself, and WXT
            // reads an entrypoint's config by removing `main` and dropping
            // whatever nothing points at any more. A function in a cycle is
            // still pointed at, so the whole feature graph survives that pass
            // and gets evaluated in node — where `utils/helpers.ts` builds an
            // `Audio` as it loads, and `yarn build` dies on it.
            clearMatch();
            if (targetNode) {
              observer.observe(targetNode, { childList: true, subtree: true });
              activeMatchObserver = observer;
            }
          }
          return;
        }

        console.log("Autodarts Tools Observer: Match ID:", matchId);

        if (!matchInitialized) {
          console.log("Autodarts Tools Observer: Match found, initializing match because activeMatch is true");
          await initMatch(ctx, url, matchId).catch(e => console.error(e));
        }
      } finally {
        busy = false;
      }
    }, 400);
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

async function initQuickCorrection(ctx) {
  await waitForElement(SELECTORS.app.contentRoot, 15000).catch(() => {
    console.warn("Autodarts Tools: Quick Correction - page did not render in time");
  });
  tools.quickCorrection = await createShadowRootUi(ctx, {
    name: "autodarts-tools-quick-correction",
    position: "inline",
    // The grid places itself from viewport rects, so it needs to be clear of
    // the match layout — see QuickCorrection.vue.
    anchor: "body",
    append: "last",
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
