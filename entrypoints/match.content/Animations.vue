<template>
  <!--
    Pinned from inside the shadow root, not by styling the host. WXT resets the
    host with `:host { all: initial !important }`, and an important declaration
    from a shadow tree beats even an important inline style on the host, so
    positioning it from the outside does nothing at all.

    Clicking the animation takes it away early — a GIF that outstays its welcome
    should never be something you have to wait out mid-leg.
  -->
  <div
    @click="hide"
    v-if="visible"
    class="fixed"
    :class="fullPage ? 'inset-0 backdrop-blur' : ''"
    :style="[ overlayStyle, { zIndex: LAYERS.animations } ]"
  >
    <img
      :src="currentUrl"
      class="size-full transition-opacity duration-300"
      :class="[shown ? 'opacity-100' : 'opacity-0', objectFit === 'contain' ? 'object-contain' : 'object-cover']"
      alt=""
    >
  </div>
</template>

<script setup lang="ts">
import type { IGameData } from "@/utils/game-data-storage";
import type { IPlayer, IThrow } from "@/utils/websocket-helpers";

import { AutodartsToolsGameData } from "@/utils/game-data-storage";
import { getAnimationFromOPFS, isOPFSAvailable, triggerPatterns } from "@/utils/helpers";
import { SELECTORS, qs } from "@/utils/selectors";
import { AutodartsToolsConfig, type IAnimation, type IConfig } from "@/utils/storage";
import { LAYERS } from "@/utils/layers";

/** Matches the `duration-300` on the image. */
const FADE_MS = 300;
/** One frame's grace so the browser paints opacity-0 before it animates. */
const FADE_IN_DELAY_MS = 50;
/** Between the turn total and the three-dart combination, so both are seen. */
const COMBINATION_GAP_MS = 500;

const config = ref<IConfig | null>(null);

/** Is the overlay in the DOM, and has it faded in. */
const visible = ref(false);
const shown = ref(false);
const currentUrl = ref("");

/** Where "board only" puts the overlay, in viewport coordinates. */
const boardRect = ref({ top: 0, left: 0, width: 0, height: 0 });

let hideTimer: number | null = null;
let unwatchGameData: (() => void) | undefined;

/** Object URLs handed out by OPFS, revoked on unmount. */
const opfsUrls = new Map<string, string>();

const fullPage = computed(() => config.value?.animations?.viewMode === "full-page");
const objectFit = computed(() => config.value?.animations?.objectFit ?? "cover");

const overlayStyle = computed(() => {
  if (fullPage.value) return { background: "#00000099" };

  return {
    top: `${boardRect.value.top}px`,
    left: `${boardRect.value.left}px`,
    width: `${boardRect.value.width}px`,
    height: `${boardRect.value.height}px`,
  };
});

onMounted(async () => {
  console.log("Autodarts Tools: Animations mounted");

  try {
    config.value = await AutodartsToolsConfig.getValue();
    measureBoard();
    window.addEventListener("resize", measureBoard);

    // Keep the handle: without it a remount — a new leg, or the hand-off out of
    // a bull-off — stacks a second watcher and every animation plays twice.
    unwatchGameData = AutodartsToolsGameData.watch(processGameData);
  } catch (error) {
    console.error("Autodarts Tools: Animations - initialization error", error);
  }
});

onUnmounted(() => {
  unwatchGameData?.();
  window.removeEventListener("resize", measureBoard);
  if (hideTimer) clearTimeout(hideTimer);
  for (const url of opfsUrls.values()) URL.revokeObjectURL(url);
  opfsUrls.clear();
});

/**
 * The dartboard, or the board camera when one is attached.
 *
 * Measured rather than mounted into, so the overlay never has to live inside
 * the site's own layout — the board block is a grid cell the site re-renders
 * on every throw.
 */
function measureBoard(): void {
  const board = qs(SELECTORS.match.boardArea);
  if (!board) return;

  const rect = board.getBoundingClientRect();
  boardRect.value = { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
}

function hide(): void {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }

  shown.value = false;
  hideTimer = window.setTimeout(() => {
    visible.value = false;
    hideTimer = null;
  }, FADE_MS);
}

/**
 * Turn a game-data update into the triggers it fires.
 *
 * INFO: 50 is reported as "bull".
 */
async function processGameData(gameData: IGameData): Promise<void> {
  // `activated` is set while a throw is being corrected. Those updates replay
  // scores that were already played, so they must not fire anything.
  if (!gameData.match || gameData.match.activated !== undefined || !gameData.match.turns?.length) return;
  if (gameData.match.variant === "Bull-off") return;

  const match = gameData.match;
  const turn = match.turns[0];
  const currentThrow = turn.throws[turn.throws.length - 1];
  if (!currentThrow) return;

  const throwName: string = dartName(currentThrow); // s1
  const isLastThrow: boolean = turn.throws.length >= 3;
  const winner: boolean = match.gameWinner >= 0;
  const winnerMatch: boolean = match.winner >= 0;
  const busted: boolean = turn.busted;
  const points: number = turn.points;
  const miss: boolean = throwName.startsWith("m");
  const combination: string = turn.throws.map(dartName).join("_");

  const currentPlayer = findTurnPlayer(match.players, turn.playerId, match.player);
  const gameWinnerPlayer = findGameWinnerPlayer(match.players, match.gameWinner) ?? currentPlayer;
  const matchWinnerPlayer = findMatchWinnerPlayer(match.players, match.winner) ?? gameWinnerPlayer;

  // `25` is what setups have always used for the single bull, so it goes on
  // meaning that; `s25` takes over only when an animation is waiting on it.
  play(
    throwName === "s25" && !hasTriggerForPlayer("s25", currentPlayer) ? "25" : throwName,
    currentPlayer,
  );

  if (winner) {
    playWinner(
      winnerMatch,
      winnerMatch ? matchWinnerPlayer : gameWinnerPlayer,
      combination,
      throwName,
    );
  }

  if (busted) play("busted", currentPlayer);
  if (isLastThrow && !busted) {
    play(points.toString(), currentPlayer);
    await new Promise(resolve => setTimeout(resolve, COMBINATION_GAP_MS));
    play(combination, currentPlayer);
  }
  if (miss) play("outside", currentPlayer);
}

/**
 * What a dart is called in a trigger.
 *
 * Autodarts names the outer bull "25" — the same string a 25-point visit fires,
 * so an animation on `25` went off for both and no name meant the bull on its
 * own. `s25` is that name: WLED, the Caller and Sound FX all answer to it
 * already, and the trigger validator has always accepted it. Only the bull is
 * ever called "25", and its bed is what separates the single from the bullseye,
 * which autodarts reports as "bull" instead.
 */
function dartName(dart: IThrow): string {
  const name = dart.segment.name.toLowerCase();
  return name === "25" && dart.segment.bed === "Single" ? "s25" : name;
}

function findTurnPlayer(
  players: IPlayer[] | undefined,
  playerId: string,
  fallbackPosition: number,
): IPlayer | undefined {
  if (!players) return undefined;

  return players.find(player => player.id === playerId || player.userId === playerId)
    ?? players[fallbackPosition];
}

/**
 * `gameWinner` indexes the current leg's reordered `match.players` array.
 * The stable slot is carried by the resolved player's `index`.
 */
function findGameWinnerPlayer(
  players: IPlayer[] | undefined,
  gameWinner: number,
): IPlayer | undefined {
  if (!players || gameWinner < 0) return undefined;
  return players[gameWinner];
}

/** `winner` is the stable match seat exposed by `player.index`. */
function findMatchWinnerPlayer(
  players: IPlayer[] | undefined,
  winner: number,
): IPlayer | undefined {
  if (!players || winner < 0) return undefined;
  return players.find(player => player.index === winner);
}

interface TriggerScope {
  suffixes: string[];
  displaySuffix: string;
}

function triggerScopes(player: IPlayer | undefined): TriggerScope[] {
  const scopes: TriggerScope[] = [];

  if (player?.name) {
    const nameWithSpaces = player.name.trim().toLowerCase();
    const nameWithUnderscores = nameWithSpaces.replace(/\s+/g, "_");
    const suffixes = [ ...new Set([ nameWithUnderscores, nameWithSpaces ].filter(Boolean)) ];

    if (suffixes.length) {
      scopes.push({ suffixes, displaySuffix: nameWithUnderscores });
    }
  }

  if (player && Number.isInteger(player.index) && player.index >= 0) {
    const slot = `player${player.index + 1}`;
    scopes.push({ suffixes: [ slot ], displaySuffix: slot });
  }

  scopes.push({ suffixes: [ "" ], displaySuffix: "" });
  return scopes;
}

function baseTriggerMatches(configuredTrigger: string, eventTrigger: string): boolean {
  if (configuredTrigger === eventTrigger) return true;

  const asNumber = Number(eventTrigger);
  if (Number.isNaN(asNumber)) return false;

  const range = configuredTrigger.match(triggerPatterns.ranges);
  return range
    ? asNumber >= Number(range[1]) && asNumber <= Number(range[2])
    : false;
}

function matchesScope(animation: IAnimation, eventTrigger: string, scope: TriggerScope): boolean {
  if (!Array.isArray(animation.triggers)) return false;

  return animation.triggers.some((rawTrigger: string) => {
    const configuredTrigger = rawTrigger.trim().toLowerCase();

    for (const suffix of scope.suffixes) {
      if (!suffix) {
        if (baseTriggerMatches(configuredTrigger, eventTrigger)) return true;
        continue;
      }

      const ending = `_${suffix}`;
      if (!configuredTrigger.endsWith(ending)) continue;

      const baseTrigger = configuredTrigger.slice(0, -ending.length);
      if (baseTriggerMatches(baseTrigger, eventTrigger)) return true;
    }

    return false;
  });
}

function matchingAnimations(
  trigger: string,
  player: IPlayer | undefined,
): { animations: IAnimation[]; resolvedTrigger: string } | null {
  const animations = config.value?.animations?.data;
  if (!animations?.length) return null;

  for (const scope of triggerScopes(player)) {
    const matched = animations.filter(
      animation => animation.enabled && matchesScope(animation, trigger, scope),
    );

    if (matched.length) {
      return {
        animations: matched,
        resolvedTrigger: scope.displaySuffix ? `${trigger}_${scope.displaySuffix}` : trigger,
      };
    }
  }

  return null;
}

function hasTriggerForPlayer(trigger: string, player: IPlayer | undefined): boolean {
  return matchingAnimations(trigger, player) !== null;
}

function normalizedPlayerNameSuffixes(player: IPlayer | undefined): string[] {
  if (!player?.name) return [];

  const nameWithSpaces = player.name.trim().toLowerCase();
  const nameWithUnderscores = nameWithSpaces.replace(/\s+/g, "_");
  return [ ...new Set([ nameWithUnderscores, nameWithSpaces ].filter(Boolean)) ];
}

function hasExactTrigger(trigger: string): boolean {
  const animations = config.value?.animations?.data;
  if (!animations?.length) return false;

  return animations.some(
    animation => animation.enabled
      && Array.isArray(animation.triggers)
      && animation.triggers.some(
        rawTrigger => rawTrigger.trim().toLowerCase() === trigger,
      ),
  );
}

/**
 * Winner-trigger priority inside one family:
 * 1. player name + complete winning visit
 * 2. stable player slot + complete winning visit
 * 3. generic complete winning visit
 * 4. player name + winning dart
 * 5. stable player slot + winning dart
 * 6. generic winning dart
 * 7. player name
 * 8. stable player slot
 * 9. generic
 */
function winnerTriggerCandidates(
  baseTrigger: "gameshot" | "matchshot",
  player: IPlayer | undefined,
  winningCombination: string,
  winningThrow: string,
): string[] {
  const candidates: string[] = [];
  const names = normalizedPlayerNameSuffixes(player);
  const slot = player && Number.isInteger(player.index) && player.index >= 0
    ? "player" + (player.index + 1)
    : null;

  const addScope = (eventSuffix?: string): void => {
    const tail = eventSuffix ? "_" + eventSuffix : "";

    for (const name of names) {
      candidates.push(baseTrigger + "_" + name + tail);
    }

    if (slot) {
      candidates.push(baseTrigger + "_" + slot + tail);
    }

    candidates.push(baseTrigger + tail);
  };

  if (winningCombination) addScope(winningCombination);
  if (winningThrow && winningThrow !== winningCombination) addScope(winningThrow);
  addScope();

  return [ ...new Set(candidates) ];
}

function playWinner(
  matchWinner: boolean,
  player: IPlayer | undefined,
  winningCombination: string,
  winningThrow: string,
): void {
  const triggerFamilies: Array<"gameshot" | "matchshot"> = matchWinner
    ? [ "matchshot", "gameshot" ]
    : [ "gameshot" ];

  for (const baseTrigger of triggerFamilies) {
    const resolvedTrigger = winnerTriggerCandidates(
      baseTrigger,
      player,
      winningCombination,
      winningThrow,
    ).find(hasExactTrigger);

    if (resolvedTrigger) {
      void play(resolvedTrigger);
      return;
    }
  }
}

/** Pick an animation for a trigger, at random when several match. */
async function resolveAnimation(
  trigger: string,
  player: IPlayer | undefined,
): Promise<{ url: string; resolvedTrigger: string } | null> {
  const result = matchingAnimations(trigger, player);
  if (!result) return null;

  const picked = result.animations[Math.floor(Math.random() * result.animations.length)];

  // Uploaded GIFs live in OPFS and are addressed by id; the rest are plain URLs.
  if (picked.animationId && !picked.url) {
    const cached = opfsUrls.get(picked.animationId);
    if (cached) return { url: cached, resolvedTrigger: result.resolvedTrigger };

    const url = await loadFromOPFS(picked.animationId);
    return url ? { url, resolvedTrigger: result.resolvedTrigger } : null;
  }

  return picked.url
    ? { url: picked.url, resolvedTrigger: result.resolvedTrigger }
    : null;
}

async function loadFromOPFS(animationId: string): Promise<string | null> {
  if (!isOPFSAvailable()) {
    console.error("Autodarts Tools: Animations - OPFS not available, cannot load", animationId);
    return null;
  }

  try {
    const objectUrl = await getAnimationFromOPFS(animationId);
    if (objectUrl) {
      opfsUrls.set(animationId, objectUrl);
      return objectUrl;
    }
  } catch (error) {
    console.error("Autodarts Tools: Animations - OPFS read failed", error);
  }

  return null;
}

async function play(trigger: string, player?: IPlayer): Promise<void> {
  try {
    const resolved = await resolveAnimation(trigger, player);
    if (!resolved) return;

    const { url, resolvedTrigger } = resolved;
    console.log("Autodarts Tools: Animations - playing", resolvedTrigger);

    // The board moves with the window and with the player count, so its
    // position is only worth knowing at the moment it is covered.
    measureBoard();

    if (visible.value) {
      hide();
      await new Promise(resolve => setTimeout(resolve, FADE_MS));
    }

    const delay = (config.value?.animations?.delayStart ?? 1) * 1000;
    const duration = (config.value?.animations?.duration ?? 5) * 1000;

    currentUrl.value = url;

    setTimeout(() => {
      visible.value = true;
      setTimeout(() => (shown.value = true), FADE_IN_DELAY_MS);

      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = window.setTimeout(hide, duration);
    }, delay);
  } catch (error) {
    console.error("Autodarts Tools: Animations - play error", error);
  }
}
</script>
