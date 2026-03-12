<template>
  <div class="pointer-events-none fixed bottom-4 right-4 opacity-0">
    <img
      :src="defaultBoardImage"
      class="size-80 object-cover"
    >
  </div>
  <div
    v-if="boardImages.length > 0 && throws > 0 && position !== 'center' && shouldShowZoom"
    :class="twMerge(
      'pointer-events-none fixed bottom-4 mx-auto flex justify-end',
      position === 'bottom-right' ? 'right-4' : 'left-4',
    )"
    :style="{
      left: `${leftPosition}px`,
    }"
  >
    <div class="flex flex-col space-y-2 px-4">
      <div
        v-for="(image, index) in filteredBoardImages"
        :key="`zoom-${index}`"
        :style="{ height: `${zoomContainerHeight}px` }"
        class="flex items-center justify-center overflow-hidden rounded-lg border border-[var(--chakra-colors-whiteAlpha-900)] transition-opacity duration-500"
        :class="[
          index === throws - 1 ? 'animate-fade-in' : '',
        ]"
      >
        <div
          class="relative size-[25rem] overflow-hidden bg-[#080808]"
        >
          <img
            :src="image || (config?.zoom?.mode === 'image' ? defaultBoardImage : '')"
            class="size-full object-cover"
            :style="{
              transform: `scale(${zoomLevel}) translate(calc(-${(throwCoordinates[index]?.x * (1000 / 3) + 500) / 10}% + 50%), calc(-${(-throwCoordinates[index]?.y * (1000 / 3) + 500) / 10}% + 50%))`,
              transformOrigin: 'center',
            }"
          >
          <div v-if="config?.zoom?.showMarker" class="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-blue-400 opacity-80" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { twMerge } from "tailwind-merge";

import type { IBoardImages } from "@/utils/board-image-storage";
import type { IGameData } from "@/utils/game-data-storage";
import type { IThrow } from "@/utils/websocket-helpers";

import { AutodartsToolsBoardImages } from "@/utils/board-image-storage";
import { AutodartsToolsGameData } from "@/utils/game-data-storage";
import { AutodartsToolsConfig } from "@/utils/storage";
import { waitForElement } from "@/utils";
import { getUserIdFromToken } from "@/utils/helpers";

const defaultBoardImage = browser.runtime.getURL("/images/board.png");
const boardImages = ref<string[]>([
  "",
  "",
  "",
]);
const throws = ref<number>(0);
const throwCoordinates = ref<{ x: number; y: number }[]>([]);
const leftPosition = ref<number>(0);
const zoomLevel = ref<number>(1.5);
const zoomContainerHeight = ref<number>(128); // Default fallback height
const position = ref<"bottom-right" | "bottom-left" | "center">("bottom-right");
const currentUserId = ref<string | null>(null);
const isOpponentPlaying = ref<boolean>(false);
const gameData = ref<IGameData | null>(null);

// Store divs for access from other functions
const zoomDiv1 = ref<HTMLElement | null>(null);
const zoomDiv2 = ref<HTMLElement | null>(null);
const zoomDiv3 = ref<HTMLElement | null>(null);
const zoomCenterElement = ref<HTMLElement | null>(null);

const config = ref<any>(null);

const filteredBoardImages = computed(() => {
  if (config.value?.zoom?.mode === "image") {
    return boardImages.value.slice(0, throws.value);
  }

  return boardImages.value.filter(image => image !== "");
});

// Computed property to check for possible checkout
const isCheckoutAvailable = computed(() => {
  if (!gameData.value?.match?.state?.checkoutGuide?.length) return false;

  const currentPlayerIndex = gameData.value.match.player;
  const currentScore = gameData.value.match.gameScores[currentPlayerIndex];

  // Return true if checkout guide is available and player has a valid score
  return currentScore > 0;
});

const shouldShowZoom = computed(() => {
  if (!config.value?.zoom) return true;

  // Check if there's a winner (game or match)
  const hasWinner = (gameData.value?.match?.gameWinner !== undefined && gameData.value.match.gameWinner >= 0)
    || (gameData.value?.match?.winner !== undefined && gameData.value.match.winner >= 0);

  // Check if onlyOnCheckout is enabled and no checkout is available
  // But still show zoom if there's a winner
  if (config.value.zoom.onlyOnCheckout && !isCheckoutAvailable.value && !hasWinner) {
    return false;
  }

  const zoomOn = config.value.zoom.zoomOn || "everyone";

  if (zoomOn === "everyone") {
    // Show zoom for every dart
    return true;
  } else if (zoomOn === "opponents") {
    // Only show zoom for opponent throws
    return isOpponentPlaying.value;
  }

  return true;
});

function checkNavigationWidth() {
  const navigationElement = document.querySelector("#root .navigation");
  if (navigationElement) {
    const width = navigationElement.getBoundingClientRect().width;
    if (width < 700) {
      leftPosition.value = width;
    } else {
      leftPosition.value = 0;
    }
  }
}

// Check if current player is an opponent
async function updatePlayerStatus(gameData: IGameData) {
  if (!currentUserId.value) {
    currentUserId.value = await getUserIdFromToken();
  }

  if (gameData.match?.players?.length && currentUserId.value) {
    // If the current player's ID is different from the user's ID, it's an opponent
    isOpponentPlaying.value = gameData.match.players[gameData.match.player].userId !== currentUserId.value;
  }
}

function getShowAnimationsContainer(): HTMLElement | null {
  const gameMode = document.querySelector("#ad-ext-game-variant")?.textContent;

  // Find the container that holds the game animations
  const container = gameMode === "Cricket"
    ? document.getElementById("ad-ext-turn")?.nextElementSibling?.children[1]?.querySelector(".showAnimations")?.parentElement?.parentElement
    : document.getElementById("ad-ext-turn")?.nextElementSibling?.querySelector(".showAnimations")?.parentElement?.parentElement;

  return container as HTMLElement || null;
}

function updateZoomHeight() {
  const container = getShowAnimationsContainer();
  if (container) {
    const containerHeight = container.offsetHeight;
    // Divide by 3, reduce by 2rem (32px), and cap at 10rem (160px)
    zoomContainerHeight.value = Math.min(Math.floor(containerHeight / 3) - 32, 160);
  }
}

function setupResizeObserver() {
  const container = getShowAnimationsContainer();
  if (container && window.ResizeObserver) {
    const resizeObserver = new ResizeObserver(() => {
      updateZoomHeight();
    });
    resizeObserver.observe(container);
    return resizeObserver;
  }
  return null;
}

let resizeObserver: ResizeObserver | null = null;

function updateZoomDivs() {
  if (position.value !== "center") return;
  if (throws.value === 0) return resetZoomDivs();

  // Update each zoom div with the corresponding image
  const updateDiv = (div: HTMLElement | null, index: number) => {
    // DONT USE TAILWIND CSS HERE - USE DEFAULT CSS STYLES
    if (!div) return;
    if (throws.value - 1 < index) return;
    if (!shouldShowZoom.value) return;

    // Clear the div first
    div.innerHTML = "";
    div.style.overflow = "hidden";
    div.style.height = "7rem";

    const image = boardImages.value[index];
    if (!image && config.value?.zoom?.mode !== "image") return;

    // Get the width of the div element to use as a base for sizing
    const divWidth = div.offsetWidth || 350;

    // Create container with relative positioning
    const containerDiv = document.createElement("div");
    containerDiv.style.position = "relative";
    containerDiv.style.display = "flex";
    containerDiv.style.justifyContent = "center";
    containerDiv.style.alignItems = "center";
    containerDiv.style.width = `${divWidth}px`;
    containerDiv.style.height = `${divWidth}px`;
    containerDiv.style.overflow = "hidden";
    containerDiv.style.backgroundColor = "#080808";

    // Create and configure the image
    const imgElement = document.createElement("img");
    imgElement.src = image || (config.value?.zoom?.mode === "image" ? defaultBoardImage : "");
    imgElement.style.width = `${divWidth}px`;
    imgElement.style.height = `${divWidth}px`;
    imgElement.style.objectFit = "cover";
    imgElement.style.left = "0";
    imgElement.style.top = "0";
    imgElement.style.opacity = "1";

    // Apply the same transformation as in the template
    if (throwCoordinates.value[index]) {
      const x = throwCoordinates.value[index].x;
      const y = throwCoordinates.value[index].y;
      imgElement.style.transform = `scale(${zoomLevel.value}) translate(calc(-${(x * (1000 / 3) + 500) / 10}% + 50%), calc(-${(-y * (1000 / 3) + 500) / 10}% + 50%))`;
      imgElement.style.transformOrigin = "center";
    }

    // Create center dot marker
    const dotMarker = document.createElement("div");
    dotMarker.style.position = "absolute";
    dotMarker.style.left = "50%";
    dotMarker.style.top = "50%";
    dotMarker.style.width = "12px";
    dotMarker.style.height = "12px";
    dotMarker.style.transform = "translate(-50%, -50%)";
    dotMarker.style.borderRadius = "50%";
    dotMarker.style.border = "1px solid white";
    dotMarker.style.backgroundColor = "rgba(96, 165, 250, 0.8)"; // blue-400 with opacity 0.8

    // Append elements
    containerDiv.appendChild(imgElement);
    if (config.value?.zoom?.showMarker) {
      containerDiv.appendChild(dotMarker);
    }
    div.appendChild(containerDiv);
  };

  // Update all three divs
  updateDiv(zoomDiv1.value, 0);
  updateDiv(zoomDiv2.value, 1);
  updateDiv(zoomDiv3.value, 2);
}

function resetZoomDivs() {
  // Clear content and reset each zoom div
  const resetDiv = (div: HTMLElement | null) => {
    if (!div) return;
    div.innerHTML = "";
    div.style.background = "rgba(255, 255, 255, 0.05)";
    div.style.border = "2px solid transparent";
  };

  resetDiv(zoomDiv1.value);
  resetDiv(zoomDiv2.value);
  resetDiv(zoomDiv3.value);
}

onMounted(async () => {
  console.log("Autodarts Tools: Zoom mounted");

  config.value = await AutodartsToolsConfig.getValue();
  if (config.value.zoom.position === "center") initCenterZoom();
  zoomLevel.value = config.value.zoom.level;
  position.value = config.value.zoom.position;

  // Get user ID on mount
  currentUserId.value = await getUserIdFromToken();

  // Click Live mode button if zoom mode is set to live
  if (config.value?.zoom?.mode === "live") {
    try {
      const liveModeButton = await waitForElement("button[aria-label='Live mode']", 5000) as HTMLButtonElement;
      liveModeButton.click();
      console.log("Autodarts Tools: Clicked Live mode button");
    } catch (e) {
      console.warn("Autodarts Tools: Could not find Live mode button", e);
    }
  }

  await AutodartsToolsBoardImages.setValue({
    images: [],
  });

  if (config.value.zoom.mode === "live") {
    AutodartsToolsBoardImages.watch((_boardImages: IBoardImages) => {
      const lastImage = _boardImages.images[_boardImages.images.length - 1];
      if (lastImage && throws.value > 0) boardImages.value[throws.value - 1] = lastImage;

      // Update zoom divs when boardImages change and position is center
      if (position.value === "center") {
        updateZoomDivs();
      }
    });
  }

  // Also update the AutodartsToolsGameData.watch to call updateZoomDivs
  AutodartsToolsGameData.watch(async (_gameData: IGameData, _previousGameData: IGameData) => {
    if (!_gameData.match?.turns?.length) return;

    // Store the game data for checkout availability checking
    gameData.value = _gameData;

    // Update player status to check if current player is opponent
    await updatePlayerStatus(_gameData);

    const currentThrows = _gameData.match?.turns[0]?.throws.length ?? 0;
    throws.value = currentThrows;
    throwCoordinates.value = _gameData.match?.turns[0]?.throws.map((_throw: IThrow) => ({ x: _throw.coords?.x ?? 0, y: _throw.coords?.y ?? 0 })) ?? [];

    if (_gameData.match?.player !== _previousGameData.match?.player || !_gameData.match.turns[0]?.throws.length) {
      throws.value = 0;
      throwCoordinates.value = [];
      boardImages.value = [
        "",
        "",
        "",
      ];

      if (config.value.zoom.position === "center") {
        resetZoomDivs();
      }

      await AutodartsToolsBoardImages.setValue({
        images: [],
      });

      // Update player status when player changes
      await updatePlayerStatus(_gameData);

      // Update heights when player changes as the container might have changed
      setTimeout(() => {
        updateZoomHeight();
        if (resizeObserver) {
          resizeObserver.disconnect();
        }
        resizeObserver = setupResizeObserver();
      }, 300);
    }

    // if there are more throws than images, insert transparent image for missing throws
    if (config.value.zoom.mode === "live") {
      const throwsLength = _gameData.match?.turns?.[0]?.throws?.length || 0;

      if (throwsLength > boardImages.value.length) {
        const missingImagesCount = throwsLength - boardImages.value.length;
        const transparentImagePlaceholders = Array(missingImagesCount).fill(config.value?.zoom?.mode === "image" ? defaultBoardImage : "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7");
        boardImages.value = [ ...transparentImagePlaceholders, ...boardImages.value ];
      }
    }

    // Update zoom divs when throw coordinates change and position is center
    if (position.value === "center") {
      updateZoomDivs();
    }
  });

  // Check navigation width on mount
  checkNavigationWidth();

  // Add event listener for navigation width changes
  window.addEventListener("resize", checkNavigationWidth);

  // Set initial height and observe container for size changes
  setTimeout(() => {
    updateZoomHeight();
    resizeObserver = setupResizeObserver();
  }, 500);
});

onUnmounted(() => {
  // Clean up event listeners and observers
  window.removeEventListener("resize", checkNavigationWidth);

  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
});

async function initCenterZoom() {
  const turnElement = await waitForElement("#ad-ext-turn");
  if (turnElement) {
    // Create a duplicate of the turn element
    const duplicateElement = turnElement.cloneNode(true) as HTMLElement;
    duplicateElement.id = "autodarts-tools-zoom-center";

    // Hide any buttons inside the cloned element
    const buttons = duplicateElement.querySelectorAll("button");
    buttons.forEach((button) => {
      (button as HTMLElement).style.opacity = "0";
    });

    zoomCenterElement.value = duplicateElement;

    // Set opacity of the first div to 0
    const firstDiv = duplicateElement.querySelector("div");
    if (firstDiv) {
      firstDiv.style.opacity = "0";
      firstDiv.innerHTML = ""; // Clear the content
    }

    // Assign IDs to the 2nd, 3rd, and 4th divs and clear their content
    const divs = duplicateElement.querySelectorAll("div");
    if (divs.length >= 2) {
      divs[1].id = "adt-zoom-1";
      divs[1].innerHTML = "";
      divs[1].style.background = "rgba(255, 255, 255, 0.05)";
      divs[1].style.border = "2px solid transparent";
      divs[1].style.height = "7rem";
      zoomDiv1.value = divs[1] as HTMLElement;
    }
    if (divs.length >= 3) {
      divs[2].id = "adt-zoom-2";
      divs[2].innerHTML = "";
      divs[2].style.background = "rgba(255, 255, 255, 0.05)";
      divs[2].style.border = "2px solid transparent";
      divs[2].style.height = "7rem";
      zoomDiv2.value = divs[2] as HTMLElement;
    }
    if (divs.length >= 4) {
      divs[3].id = "adt-zoom-3";
      divs[3].innerHTML = "";
      divs[3].style.background = "rgba(255, 255, 255, 0.05)";
      divs[3].style.border = "2px solid transparent";
      divs[3].style.height = "7rem";
      zoomDiv3.value = divs[3] as HTMLElement;
    }

    // Insert the duplicate right after the original element (below it)
    if (turnElement.parentNode) {
      turnElement.parentNode.insertBefore(duplicateElement, turnElement.nextSibling);
    }

    // Set initial visibility based on shouldShowZoom
    duplicateElement.style.display = shouldShowZoom.value ? "" : "none";

    // Update leftPosition based on the original element's position
    const rect = turnElement.getBoundingClientRect();
    leftPosition.value = rect.left;

    // Listen for window resize to update the position
    window.addEventListener("resize", () => {
      const updatedTurnElement = document.querySelector("#ad-ext-turn");
      if (updatedTurnElement) {
        const updatedRect = updatedTurnElement.getBoundingClientRect();
        leftPosition.value = updatedRect.left;
      }
    });
  }
}

// Also watch for changes to position
watch(() => position.value, (newPosition) => {
  if (newPosition === "center") {
    updateZoomDivs();
  }
});

// Watch for changes to shouldShowZoom to hide/show the center zoom element
watch(() => shouldShowZoom.value, (shouldShow) => {
  if (position.value === "center" && zoomCenterElement.value) {
    zoomCenterElement.value.style.display = shouldShow ? "" : "none";
  }
}, { immediate: true });
</script>

<style>
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.animate-fade-in {
  animation: fadeIn 0.5s ease-in-out;
}
</style>
