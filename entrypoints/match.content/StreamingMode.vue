<template>
  <div
    v-if="enabled && config"
    class="fixed inset-0 z-[200] font-sans"
  >
    <div v-if="settings" class="absolute inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <OnClickOutside
        @trigger="handleToggleSettings"
        class="gradient-bg relative w-full max-w-sm overflow-hidden rounded-md border border-white/10 p-6 shadow-lg"
      >
        <div class="space-y-8">
          <div v-if="config.streamingMode.board" class="space-y-2">
            <p class="font-semibold">
              Board Scale: ({{ 100 / 5 * coordsElementScale }} %)
            </p>
            <SliderRoot
              @update:model-value="handleSliderUpdate('coords', $event || [coordsElementScale])"
              class="relative flex h-5 w-full touch-none select-none items-center"
              :max="5"
              :min="0.5"
              :step="0.1"
              :default-value="[coordsElementScale]"
            >
              <SliderTrack class="relative h-[3px] grow rounded-full bg-white/30">
                <SliderRange class="absolute h-full rounded-full bg-white" />
              </SliderTrack>
              <SliderThumb
                class="block size-5 rounded-[10px] bg-white shadow-[0_2px_10px] focus:outline-none"
                aria-label="Volume"
              />
            </SliderRoot>
          </div>
          <div class="space-y-2">
            <p class="font-semibold">
              Score Scale: ({{ 100 / 5 * scoreBoardScale }} %)
            </p>
            <SliderRoot
              @update:model-value="handleSliderUpdate('score', $event || [scoreBoardScale])"
              class="relative flex h-5 w-full touch-none select-none items-center"
              :max="5"
              :min="0.5"
              :step="0.1"
              :default-value="[scoreBoardScale]"
            >
              <SliderTrack class="relative h-[3px] grow rounded-full bg-white/30">
                <SliderRange class="absolute h-full rounded-full bg-white" />
              </SliderTrack>
              <SliderThumb
                class="block size-5 rounded-[10px] bg-white shadow-[0_2px_10px] focus:outline-none"
                aria-label="Volume"
              />
            </SliderRoot>
          </div>
          <div class="flex justify-end gap-3">
            <AppButton
              @click="handleResetSettings"
              class="rounded-md border border-white/10 bg-transparent px-4 py-2 hover:bg-white/10"
            >
              Reset
            </AppButton>
            <AppButton
              @click="handleCloseSettings"
              class="rounded-md bg-cyan-600 px-4 py-2 hover:bg-cyan-700"
            >
              Save
            </AppButton>
          </div>
        </div>
      </OnClickOutside>
    </div>
    <div
      @click="streamingModeButton?.click()"
      class="absolute inset-0"
      :style="{
        backgroundColor: config.streamingMode.chromaKeyColor,
        backgroundImage: (config.streamingMode.backgroundImage && config.streamingMode.image) ? `url(${config.streamingMode.image})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }"
    />
    <div
      v-if="config.streamingMode.board"
      :key="`coords-${coordsElementScale}`"
      ref="coordsElement"
      class="absolute size-[35vw] origin-bottom-right overflow-hidden rounded-full"
      :style="{
        transform: `scale(${coordsElementScale})`,
        left: `${coordsElementX}px`,
        top: `${coordsElementY}px`,
        cursor: isCoordsDragging ? 'grabbing' : 'grab',
        zIndex: isCoordsDragging ? 100 : 10,
      }"
    >
      <img v-if="currentBoardImage" :src="currentBoardImage" class="pointer-events-none size-full" alt="Dartboard">
      <img v-else :src="defaultBoardImage" class="pointer-events-none size-full" alt="Default dartboard">
    </div>
    <div
      v-if="gameData?.match?.players?.length"
      ref="scoreBoardElement"
      :class="twMerge(
        'fixed origin-bottom-right border-2 border-black bg-gray-800 text-2xl',
        (scoreBoardElementX === 0 && scoreBoardElementY === 0) && 'bottom-8 right-24',
      )"
      :style="{
        transform: `scale(${scoreBoardScale})`,
        left: (scoreBoardElementX === 0 && scoreBoardElementY === 0) ? undefined : `${scoreBoardElementX}px`,
        top: (scoreBoardElementX === 0 && scoreBoardElementY === 0) ? undefined
          : `${scoreBoardElementY - Math.max(0, (gameData?.match?.players?.length - 2) * 68)}px`,
        cursor: isScoreBoardDragging ? 'grabbing' : 'grab',
        zIndex: isScoreBoardDragging ? 100 : 10,
      }"
    >
      <div
        :class="twMerge(
          'grid grid-cols-[30rem_8rem_8rem]',
          gameData?.match?.sets && 'grid-cols-[35rem_8rem_8rem_8rem]',
        )"
      >
        <div
          v-if="config.streamingMode.throws"
          :class="twMerge(
            'col-span-3 border-b-2 border-black',
            gameData?.match?.sets && 'col-span-4',
          )"
        >
          <div class="grid grid-cols-4 divide-x-2 divide-black text-center text-5xl font-bold">
            <div class="relative flex items-center justify-center p-2 uppercase">
              {{ gameData.match.turnBusted ? "Bust" : gameData?.match?.turns?.[0]?.points }}
            </div>
            <div
              v-for="n in 3"
              :key="n"
              :class="twMerge(
                'relative flex items-center justify-center p-2 uppercase',
                'bg-gray-300 text-black',
                gameData?.match?.turns?.[0]?.throws?.[n - 1] && 'bg-cyan-600 text-white',
                possibleCheckout && gameData?.match?.player !== undefined && possibleCheckout[n - 1] && 'bg-cyan-600',
              )"
            >
              <template v-if="gameData?.match?.turns?.[0]?.throws?.[n - 1]">
                {{ gameData?.match?.turns?.[0]?.throws?.[n - 1]?.segment.name }}
              </template>
              <template v-else-if="possibleCheckout && gameData?.match?.player !== undefined && possibleCheckout[n - 1]">
                <span class="text-4xl font-normal italic text-white/65">{{ possibleCheckout[n - 1].name }}</span>
              </template>
              <template v-else>
                <div class="absolute inset-0 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" class="-rotate-45" viewBox="0 0 512 512"><path fill="currentColor" d="M134.745 22.098c-4.538-.146-9.08 1.43-14.893 7.243c-5.586 5.586-11.841 21.725-15.248 35.992c-.234.979-.444 1.907-.654 2.836l114.254 105.338c-7.18-28.538-17.555-59.985-29.848-86.75c-11.673-25.418-25.249-46.657-37.514-57.024c-6.132-5.183-11.56-7.488-16.097-7.635M92.528 82.122L82.124 92.526L243.58 267.651l24.072-24.072zm-24.357 21.826c-.929.21-1.857.42-2.836.654c-14.267 3.407-30.406 9.662-35.993 15.248c-5.813 5.813-7.39 10.355-7.244 14.893c.147 4.538 2.452 9.965 7.635 16.098c10.367 12.265 31.608 25.842 57.025 37.515c26.766 12.293 58.211 22.669 86.749 29.848L68.17 103.948zM280.899 255.79l-25.107 25.107l73.265 79.469l31.31-31.31zm92.715 85.476l-32.346 32.344l2.07 2.246c.061.058 4.419 4.224 10.585 6.28c6.208 2.069 12.71 2.88 21.902-6.313c9.192-9.192 8.38-15.694 6.31-21.902c-2.057-6.174-6.235-10.54-6.283-10.59zm20.172 41.059a46.23 46.23 0 0 1-5.233 6.226a46.241 46.241 0 0 1-6.226 5.235L489.91 489.91z" /></svg>
                </div>
              </template>
            </div>
          </div>
        </div>
        <div class="px-4 py-2">
          {{ game.title }}
        </div>
        <div v-if="gameData?.match?.sets" class="px-4 py-2 text-center">
          Sets
        </div>
        <div class="px-4 py-2 text-center">
          Legs
        </div>
        <div />
        <template v-for="(player, index) in gameData?.match?.players" :key="player.name">
          <div
            :class="twMerge(
              'flex w-full items-center justify-between border-y-2 border-r-2 border-black bg-white px-4 py-2 text-black',
              index === 0 ? 'border-t-2' : 'border-t-0',
            )"
          >
            <div class="truncate py-2 font-bold uppercase">
              {{ player.name }}
            </div>
            <div v-if="showAvg && (gameData?.match?.stats?.[index]?.legStats?.average || gameData?.match?.stats?.[index]?.setStats?.average || gameData?.match?.stats?.[index]?.matchStats?.average)" class="whitespace-nowrap text-lg font-bold text-gray-500">
              ∅
              <span v-if="gameData?.match?.stats?.[index]?.legStats?.average?.toString()">{{ gameData?.match?.stats?.[index]?.legStats.average.toFixed(1) }} / </span>
              <span v-if="gameData?.match?.stats?.[index]?.setStats?.average?.toString()">{{ gameData?.match?.stats?.[index]?.setStats?.average.toFixed(1) }} / </span>
              <span v-if="gameData?.match?.stats?.[index]?.matchStats.average?.toString()">{{ gameData?.match?.stats?.[index]?.matchStats?.average .toFixed(1) }}</span>
            </div>
          </div>
          <div
            v-if="gameData?.match?.sets"
            :class="twMerge(
              'flex items-center justify-center border-y-2 border-r-2 border-black px-4 py-2 text-5xl font-bold',
              index === 0 ? 'border-t-2' : 'border-t-0',
            )"
          >
            {{ gameData?.match?.scores?.[index]?.sets || 0 }}
          </div>
          <div
            :class="twMerge(
              'flex items-center justify-center border-y-2 border-r-2 border-black px-4 py-2 text-5xl font-bold',
              index === 0 ? 'border-t-2' : 'border-t-0',
            )"
          >
            {{ gameData?.match?.scores?.[index]?.legs || 0 }}
          </div>
          <div
            :class="twMerge(
              'relative flex items-center justify-center border-y-2 border-black px-4 py-2 text-5xl font-bold',
              index === 0 ? 'border-t-2' : 'border-t-0',
            )"
          >
            {{ gameData?.match?.gameScores?.[index] }}
            <div v-if="gameData?.match?.player === index" class="absolute -inset-y-0.5 -right-20 flex w-20 items-center justify-center border-2 border-black bg-cyan-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="46" height="46" viewBox="0 0 512 512"><path fill="currentColor" d="M134.745 22.098c-4.538-.146-9.08 1.43-14.893 7.243c-5.586 5.586-11.841 21.725-15.248 35.992c-.234.979-.444 1.907-.654 2.836l114.254 105.338c-7.18-28.538-17.555-59.985-29.848-86.75c-11.673-25.418-25.249-46.657-37.514-57.024c-6.132-5.183-11.56-7.488-16.097-7.635M92.528 82.122L82.124 92.526L243.58 267.651l24.072-24.072zm-24.357 21.826c-.929.21-1.857.42-2.836.654c-14.267 3.407-30.406 9.662-35.993 15.248c-5.813 5.813-7.39 10.355-7.244 14.893c.147 4.538 2.452 9.965 7.635 16.098c10.367 12.265 31.608 25.842 57.025 37.515c26.766 12.293 58.211 22.669 86.749 29.848L68.17 103.948zM280.899 255.79l-25.107 25.107l73.265 79.469l31.31-31.31zm92.715 85.476l-32.346 32.344l2.07 2.246c.061.058 4.419 4.224 10.585 6.28c6.208 2.069 12.71 2.88 21.902-6.313c9.192-9.192 8.38-15.694 6.31-21.902c-2.057-6.174-6.235-10.54-6.283-10.59zm20.172 41.059a46.23 46.23 0 0 1-5.233 6.226a46.241 46.241 0 0 1-6.226 5.235L489.91 489.91z" /></svg>
            </div>
          </div>
        </template>
        <div
          :class="twMerge(
            'col-span-3 px-4 py-2 text-lg',
            gameData?.match?.sets && 'col-span-4',
          )"
        >
          <div class="grid grid-cols-[auto_2rem]">
            <div>{{ game.footer }}</div>
            <div @click="handleToggleSettings" class="flex cursor-pointer items-center justify-end opacity-20 hover:opacity-50">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="currentColor" d="M12 20H4q-.825 0-1.412-.587T2 18V6q0-.825.588-1.412T4 4h16q.825 0 1.413.588T22 6v5h-2V6H4v12h8zm-2.5-3.5v-9l7 4.5zm8.35 6.5l-.3-1.5q-.3-.125-.562-.262t-.538-.338l-1.45.45l-1-1.7l1.15-1q-.05-.35-.05-.65t.05-.65l-1.15-1l1-1.7l1.45.45q.275-.2.538-.337t.562-.263l.3-1.5h2l.3 1.5q.3.125.563.275t.537.375l1.45-.5l1 1.75l-1.15 1q.05.3.05.625t-.05.625l1.15 1l-1 1.7l-1.45-.45q-.275.2-.537.338t-.563.262l-.3 1.5zm1-3q.825 0 1.413-.587T20.85 18q0-.825-.587-1.412T18.85 16q-.825 0-1.412.588T16.85 18q0 .825.588 1.413T18.85 20" /></svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { twMerge } from "tailwind-merge";
import { SliderRange, SliderRoot, SliderThumb, SliderTrack } from "radix-vue";
import { OnClickOutside } from "@vueuse/components";

import type { Ref } from "vue";
import type {
  IConfig,
} from "@/utils/storage";
import type { IGameData } from "@/utils/game-data-storage";
import type { IBoardImages } from "@/utils/board-image-storage";

import { waitForElement } from "@/utils";
import {
  AutodartsToolsConfig,
  AutodartsToolsStreamingModeStatus,
} from "@/utils/storage";
import AppButton from "@/components/AppButton.vue";
import { AutodartsToolsGameData } from "@/utils/game-data-storage";
import { AutodartsToolsBoardImages } from "@/utils/board-image-storage";

const enabled = ref(false);
const settings = ref(false);

const coordsElement = ref<HTMLElement | null>(null);
const coordsElementScale = ref(1);
const coordsElementX = ref(0);
const coordsElementY = ref(0);
const isCoordsDragging = ref(false);

const scoreBoardElement = ref<HTMLElement | null>(null);
const scoreBoardScale = ref(1);
const scoreBoardElementX = ref(0);
const scoreBoardElementY = ref(0);
const isScoreBoardDragging = ref(false);

const game = reactive<{
  title: string;
  footer: string;
}>({
  title: "",
  footer: "Game provided by Autodarts.com",
});

const config: Ref<IConfig | null> = ref(null);
const gameData: Ref<IGameData | null> = ref(null);

const defaultBoardImage = browser.runtime.getURL("/images/board.png");
const currentBoardImage = ref<string>("");

const streamingModeButton: Ref<HTMLAnchorElement | null> = ref(null);

const showAvg = computed(() => config.value?.streamingMode.avg);

// Helper to get number of throws in current turn
const currentThrowCount = computed(() => {
  return gameData.value?.match?.turns?.[0]?.throws?.length || 0;
});

// Computed property to check for possible checkout
// Returns the checkout guide adjusted for darts already thrown
const possibleCheckout = computed(() => {
  // Check if checkout feature is enabled in config
  if (!config.value?.streamingMode.checkout) return null;

  if (!gameData.value?.match?.state?.checkoutGuide?.length) return null;

  const currentPlayerIndex = gameData.value.match.player;
  const currentScore = gameData.value.match.gameScores[currentPlayerIndex];

  // Return null if no valid score
  if (currentScore <= 0) return null;

  const checkoutGuide = gameData.value.match.state.checkoutGuide;
  const throwsAlreadyMade = currentThrowCount.value;

  // Build an array where each position matches the dart position (0, 1, 2)
  // For darts already thrown, the position is null
  // For remaining darts, map from the checkoutGuide
  const result: (typeof checkoutGuide[0] | null)[] = [ null, null, null ];

  for (let i = 0; i < 3; i++) {
    if (i < throwsAlreadyMade) {
      // This dart has already been thrown
      result[i] = null;
    } else {
      // Map from checkout guide: index in guide = dart position - throws already made
      const guideIndex = i - throwsAlreadyMade;
      result[i] = checkoutGuide[guideIndex] || null;
    }
  }

  return result;
});

// Custom drag handlers
function initDraggable() {
  let startX = 0;
  let startY = 0;
  let startElementX = 0;
  let startElementY = 0;

  // Function declarations
  const onCoordsMouseMove = (e: MouseEvent) => {
    if (isCoordsDragging.value) {
      const dx = (e.clientX - startX) / coordsElementScale.value;
      const dy = (e.clientY - startY) / coordsElementScale.value;
      coordsElementX.value = startElementX + dx;
      coordsElementY.value = startElementY + dy;
    }
  };

  const onCoordsMouseUp = () => {
    isCoordsDragging.value = false;
    document.removeEventListener("mousemove", onCoordsMouseMove);
    document.removeEventListener("mouseup", onCoordsMouseUp);
  };

  const onScoreBoardMouseMove = (e: MouseEvent) => {
    if (isScoreBoardDragging.value) {
      const dx = (e.clientX - startX) / scoreBoardScale.value;
      const dy = (e.clientY - startY) / scoreBoardScale.value;
      scoreBoardElementX.value = startElementX + dx;
      scoreBoardElementY.value = startElementY + dy;
    }
  };

  const onScoreBoardMouseUp = () => {
    isScoreBoardDragging.value = false;
    document.removeEventListener("mousemove", onScoreBoardMouseMove);
    document.removeEventListener("mouseup", onScoreBoardMouseUp);
  };

  // Coords element drag handlers
  const onCoordsMouseDown = (e: MouseEvent) => {
    isCoordsDragging.value = true;
    startX = e.clientX;
    startY = e.clientY;
    startElementX = coordsElementX.value;
    startElementY = coordsElementY.value;
    document.addEventListener("mousemove", onCoordsMouseMove);
    document.addEventListener("mouseup", onCoordsMouseUp);
  };

  // Scoreboard element drag handlers
  const onScoreBoardMouseDown = (e: MouseEvent) => {
    isScoreBoardDragging.value = true;
    startX = e.clientX;
    startY = e.clientY;
    startElementX = scoreBoardElementX.value;
    startElementY = scoreBoardElementY.value;
    document.addEventListener("mousemove", onScoreBoardMouseMove);
    document.addEventListener("mouseup", onScoreBoardMouseUp);
  };

  // Add event listeners
  if (coordsElement.value) {
    coordsElement.value.addEventListener("mousedown", onCoordsMouseDown);
  }

  if (scoreBoardElement.value) {
    scoreBoardElement.value.addEventListener("mousedown", onScoreBoardMouseDown);
  }

  // Return cleanup function
  return () => {
    if (coordsElement.value) {
      coordsElement.value.removeEventListener("mousedown", onCoordsMouseDown);
    }

    if (scoreBoardElement.value) {
      scoreBoardElement.value.removeEventListener("mousedown", onScoreBoardMouseDown);
    }

    document.removeEventListener("mousemove", onCoordsMouseMove);
    document.removeEventListener("mouseup", onCoordsMouseUp);
    document.removeEventListener("mousemove", onScoreBoardMouseMove);
    document.removeEventListener("mouseup", onScoreBoardMouseUp);
  };
}

// Set up drag functionality when elements are mounted
onMounted(async () => {
  config.value = await AutodartsToolsConfig.getValue();
  gameData.value = await AutodartsToolsGameData.getValue();

  AutodartsToolsGameData.watch((value) => {
    gameData.value = value;

    // Update game title when game data changes
    updateGameTitle();
  });

  // Set up board image watcher
  AutodartsToolsBoardImages.watch((boardImages: IBoardImages) => {
    if (boardImages.images.length > 0) {
      currentBoardImage.value = boardImages.images[boardImages.images.length - 1];
    }
  });

  try {
    // Get game title from DOM
    updateGameTitle();

    await initStreamModeButton();

    // Load saved positions and scales
    coordsElementScale.value = config.value?.streamingMode.coordsSettings?.scale || 1;
    scoreBoardScale.value = config.value?.streamingMode.scoreBoardSettings?.scale || 1;
    coordsElementX.value = config.value?.streamingMode.coordsSettings?.x || 0;
    coordsElementY.value = config.value?.streamingMode.coordsSettings?.y || 0;
    scoreBoardElementX.value = config.value?.streamingMode.scoreBoardSettings?.x || 0;
    scoreBoardElementY.value = config.value?.streamingMode.scoreBoardSettings?.y || 0;

    enabled.value = await AutodartsToolsStreamingModeStatus.getValue() || false;

    // Initialize draggable elements after the DOM is updated
    nextTick(() => {
      initDraggable();
    });
  } catch (e) {
    console.error("Autodarts Tools: Streaming Mode - initialization error", e);
  }
});

// Watch for reference changes and re-initialize dragging
watch([ coordsElement, scoreBoardElement ], () => {
  nextTick(() => {
    initDraggable();
  });
});

watch([ coordsElementScale, scoreBoardScale, coordsElementX, coordsElementY, scoreBoardElementX, scoreBoardElementY ], async () => {
  if (!config.value) return;

  config.value!.streamingMode.coordsSettings = {
    scale: coordsElementScale.value,
    x: coordsElementX.value,
    y: coordsElementY.value,
  };

  config.value!.streamingMode.scoreBoardSettings = {
    scale: scoreBoardScale.value,
    x: scoreBoardElementX.value,
    y: scoreBoardElementY.value,
  };

  await AutodartsToolsConfig.setValue(toRaw(config.value!));
  console.log("Streaming Mode setting changed");
}, { deep: true });

// Helper function to update game title
function updateGameTitle() {
  try {
    // Update game title from DOM
    const gameSettingsContainerElement = document.querySelector("#ad-ext-game-variant")?.parentElement;
    if (gameSettingsContainerElement) {
      game.title = Array.from(gameSettingsContainerElement.querySelectorAll("span") || [])
        .map(span => span.textContent)
        .filter(span => span && !span!.includes("/") && span.trim().length >= 2)
        .join(" - ");
    }

    // Set footer text if configured
    if (config.value?.streamingMode.footerText) {
      game.footer = config.value.streamingMode.footerText;
    }

    // Check if we need to trigger board mode change
    if (config.value?.streamingMode.board) {
      const coordsModeButton = config.value.streamingMode.boardImage
        ? document.querySelector("button[aria-label='Live mode']:not([data-active])") as HTMLButtonElement | null
        : document.querySelector("button[aria-label='Coords mode']:not([data-active])") as HTMLButtonElement | null;
      coordsModeButton?.click();
    }
  } catch (e) {
    console.error("Autodarts Tools: Error updating game title", e);
    // Set default values if there's an error
    if (!game.title) game.title = "Autodarts Game";
  }
}

async function initStreamModeButton() {
  if (!document.querySelector("#ad-ext-player-display") || document.querySelector("#adt-stream-mode-button")) return;
  const modeGroupElement = (await waitForElement("#ad-ext-game-variant"))?.parentElement;

  const streamModeButton = modeGroupElement?.lastElementChild?.cloneNode(true) as HTMLAnchorElement;
  streamModeButton.setAttribute("id", "adt-stream-mode-button");
  streamModeButton.toggleAttribute("data-active", enabled.value);
  streamModeButton.setAttribute("aria-label", "Streaming Mode");
  streamModeButton.setAttribute("title", "Streaming Mode");
  streamModeButton.removeAttribute("href");
  streamModeButton.style.cursor = "pointer";
  streamModeButton.style.paddingLeft = "1rem";
  streamModeButton.style.paddingRight = "1rem";

  streamModeButton.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\"><g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><path d=\"M7 9h.01m9.74 3H22l-3.5 7l-3.09-4.32\"/><path d=\"m18 9.5l-4 8l-10.39-5.2a2.92 2.92 0 0 1-1.3-3.91L3.69 5.6a2.92 2.92 0 0 1 3.92-1.3ZM2 19h3.76a2 2 0 0 0 1.8-1.1L9 15m-7 6v-4\"/></g></svg>";

  streamModeButton.addEventListener("click", () => {
    enabled.value = !enabled.value;
    AutodartsToolsStreamingModeStatus.setValue(enabled.value);
    streamModeButton.toggleAttribute("data-active", enabled.value);
  });

  modeGroupElement?.appendChild(streamModeButton);
  streamingModeButton.value = streamModeButton;
}

function handleToggleSettings() {
  settings.value = !settings.value;
}

async function handleCloseSettings() {
  settings.value = false;
}

function handleSliderUpdate(type: "coords" | "score", value: number[]) {
  switch (type) {
    case "coords":
      coordsElementScale.value = value[0];
      break;
    case "score":
      scoreBoardScale.value = value[0];
      break;
  }
}

async function handleResetSettings() {
  coordsElementScale.value = 1;
  coordsElementY.value = 0;
  coordsElementX.value = 0;
  scoreBoardScale.value = 1;
  scoreBoardElementY.value = 0;
  scoreBoardElementX.value = 0;
}
</script>

<style scoped>
.gradient-bg {
  background-image: radial-gradient(50% 30% at 86% 0%, rgba(49, 51, 112, 0.89) 0%, rgba(64, 52, 134, 0) 100%),
                    radial-gradient(50% 70% at 70% 22%, rgba(38, 89, 154, 0.9) 0%, rgba(64, 52, 134, 0) 100%),
                    radial-gradient(50% 70% at 112% 44%, rgba(44, 67, 108, 0.85) 0%, rgba(64, 52, 134, 0) 100%),
                    radial-gradient(90% 90% at -12% 89%, rgba(15, 47, 80, 0.88) 0%, rgba(64, 52, 134, 0) 100%),
                    radial-gradient(50% 70% at -2% 53%, rgba(52, 32, 95, 0.89) 0%, rgba(64, 52, 134, 0) 100%),
                    radial-gradient(50% 70% at 36% 22%, rgba(64, 52, 134, 0.83) 0%, rgba(64, 52, 134, 0) 100%),
                    radial-gradient(50% 40% at 66% 59%, rgba(32, 111, 185, 0.87) 7%, rgba(32, 111, 185, 0) 100%),
                    radial-gradient(75% 75% at 50% 50%, rgb(54, 98, 185) 1%, rgb(45, 40, 91) 100%);
}
</style>
