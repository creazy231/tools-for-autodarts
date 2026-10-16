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
      @error="hide"
      @load="startClock"
      ref="image"
      :src="currentUrl"
      class="size-full transition-opacity duration-300"
      :class="[shown ? 'opacity-100' : 'opacity-0', objectFit === 'contain' ? 'object-contain' : 'object-cover']"
      alt=""
    >
  </div>
</template>

<script setup lang="ts">
import type { TriggerUpdate } from "@/utils/game-events/processor";

import { animationDuration } from "@/utils/animation-duration";
import { pickBest } from "@/utils/game-events/match";
import { registerTriggers } from "@/utils/game-events/processor";
import { TriggerCategory } from "@/utils/game-events/types";
import { getAnimationFromOPFS, isOPFSAvailable } from "@/utils/helpers";
import { SELECTORS, qs } from "@/utils/selectors";
import { AutodartsToolsConfig, type IAnimation, type IConfig } from "@/utils/storage";
import { LAYERS } from "@/utils/layers";

/** Matches the `duration-300` on the image. */
const FADE_MS = 300;
/** One frame's grace so the browser paints opacity-0 before it animates. */
const FADE_IN_DELAY_MS = 50;
/** What Animations show a GIF for (utils/game-events/derive.ts): a win or a bust, a dart, a visit, a game's own moment. */
const CATEGORIES: readonly TriggerCategory[] = [ TriggerCategory.OUTCOME, TriggerCategory.THROW, TriggerCategory.TOTAL, TriggerCategory.COMBO, TriggerCategory.VARIANT ];
/** How much longer than its duration an animation waits for its GIF before giving up on it. */
const LOAD_WAIT_MS = 3000;

const config = ref<IConfig | null>(null);

/** Is the overlay in the DOM, and has it faded in. */
const visible = ref(false);
const shown = ref(false);
const currentUrl = ref("");
const image = ref<HTMLImageElement | null>(null);

/** Where "board only" puts the overlay, in viewport coordinates. */
const boardRect = ref({ top: 0, left: 0, width: 0, height: 0 });

let hideTimer: number | null = null;
/** The duration of the animation on screen, in ms, held until its GIF has loaded. */
let heldDuration: number | null = null;
let unregisterTriggers: (() => void) | undefined;

/** Object URLs handed out by OPFS, revoked on unmount. */
const opfsUrls = new Map<string, string>();
/** Links whose GIF failed to load, so a dead one never covers the board. */
const failedUrls = new Set<string>();

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
    // a bull-off — stacks a second registration and every animation plays twice.
    unregisterTriggers = registerTriggers({
      feature: "animations",
      settings: () => config.value?.animations,
      categories: () => CATEGORIES,
      // A miss falls back to `outside`.
      fallbacks: [ "outside", "missWildcard" ],
      // Cricket counts points only on numbers already closed, so nearly every visit
      // totals 0 however many marks it took, and an animation on `0` played after
      // almost all of them. Like Sound FX, leave Cricket's visit totals out.
      filter: trigger => trigger.tag !== "cricketScore",
      onTriggers: showAnimation,
    });
  } catch (error) {
    console.error("Autodarts Tools: Animations - initialization error", error);
  }
});

onUnmounted(() => {
  unregisterTriggers?.();
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
  heldDuration = null;

  shown.value = false;
  hideTimer = window.setTimeout(() => {
    visible.value = false;
    hideTimer = null;
  }, FADE_MS);
}

/**
 * The GIF for an update: the one on its highest trigger in Animations' order
 * (utils/game-events/priorities.ts) — a win or a bust over the dart, the
 * visit's darts over its total. A win reported again never gets here.
 */
function showAnimation({ triggers, context }: TriggerUpdate): void {
  const found = pickBest(config.value?.animations?.data, triggers, { context });
  if (found) play(found.items[0], found.matched);
}

/** An animation's GIF and how long it stays up, in seconds. */
async function resolveAnimation(animation: IAnimation): Promise<{ url: string; duration: number } | null> {
  // Uploaded GIFs live in OPFS and are addressed by id; the rest are plain URLs.
  const url = animation.animationId && !animation.url
    ? opfsUrls.get(animation.animationId) ?? await loadFromOPFS(animation.animationId)
    : animation.url;
  if (!url) return null;

  return { url, duration: animationDuration(animation, config.value?.animations?.duration ?? 5) };
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

async function play(picked: IAnimation, trigger: string): Promise<void> {
  try {
    const animation = await resolveAnimation(picked);
    if (!animation) return;

    console.log("Autodarts Tools: Animations - playing", trigger);

    // Loaded while the start delay runs, so the GIF is ready when it appears.
    preload(animation.url);

    // The board moves with the window and with the player count, so its
    // position is only worth knowing at the moment it is covered.
    measureBoard();

    if (visible.value) {
      hide();
      await new Promise(resolve => setTimeout(resolve, FADE_MS));
    }

    const delay = (config.value?.animations?.delayStart ?? 1) * 1000;
    const duration = animation.duration * 1000;

    currentUrl.value = animation.url;

    setTimeout(() => {
      // A GIF that could not be loaded shows nothing, rather than an empty overlay.
      if (failedUrls.has(currentUrl.value)) return;

      visible.value = true;
      setTimeout(() => (shown.value = true), FADE_IN_DELAY_MS);
      holdUntilLoaded(duration);
    }, delay);
  } catch (error) {
    console.error("Autodarts Tools: Animations - play error", error);
  }
}

/** Starts loading a GIF before it is shown, and remembers whether its link is dead. */
function preload(url: string): void {
  failedUrls.delete(url);
  const loader = new Image();
  loader.onload = () => failedUrls.delete(url);
  loader.onerror = () => failedUrls.add(url);
  loader.src = url;
}

/**
 * Starts the clock once the GIF on screen has loaded, so a download slower than
 * the start delay does not come off the end of it. A GIF that never loads is
 * hidden LOAD_WAIT_MS after it would have been.
 */
function holdUntilLoaded(duration: number): void {
  heldDuration = duration;
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = window.setTimeout(hide, duration + LOAD_WAIT_MS);

  // A GIF that was already on screen and loaded fires no load event again.
  nextTick(() => {
    if (image.value?.complete && image.value.naturalWidth > 0) startClock();
  });
}

/** The GIF on screen has loaded: its duration runs from now. */
function startClock(): void {
  if (heldDuration === null) return;
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = window.setTimeout(hide, heldDuration);
  heldDuration = null;
}
</script>
