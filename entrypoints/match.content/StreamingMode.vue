<template>
  <div
    v-if="enabled && config"
    class="fixed inset-0 font-sans"
    :style="{ zIndex: LAYERS.streamingMode }"
  >
    <div
      v-if="settings"
      :class="twMerge('absolute inset-0 z-[100] flex items-center justify-center', !isV2 && 'bg-black/70 backdrop-blur-sm')"
      :style="isV2 ? { backgroundColor: 'var(--ad-scrim)', backdropFilter: 'var(--ad-blur-overlay)' } : undefined"
    >
      <OnClickOutside
        @trigger="handleToggleSettings"
        :class="twMerge(
          'relative w-full max-w-sm overflow-hidden p-6',
          !isV2 && 'gradient-bg rounded-md border border-white/10 shadow-lg',
        )"
        :style="isV2 ? {
          backgroundColor: 'var(--ad-surface-overlay)',
          borderRadius: 'var(--ad-radius-xl)',
          boxShadow: 'var(--ad-shadow-overlay)',
          fontFamily: 'var(--ad-font-body)',
        } : undefined"
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
                <SliderRange :class="twMerge('absolute h-full rounded-full', !isV2 && 'bg-white')" :style="isV2 ? { backgroundColor: 'var(--ad-action-primary)' } : undefined" />
              </SliderTrack>
              <SliderThumb
                :class="twMerge('block size-5 rounded-[10px] shadow-[0_2px_10px] focus:outline-none', !isV2 && 'bg-white')"
                :style="isV2 ? { backgroundColor: 'var(--ad-action-primary)' } : undefined"
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
                <SliderRange :class="twMerge('absolute h-full rounded-full', !isV2 && 'bg-white')" :style="isV2 ? { backgroundColor: 'var(--ad-action-primary)' } : undefined" />
              </SliderTrack>
              <SliderThumb
                :class="twMerge('block size-5 rounded-[10px] shadow-[0_2px_10px] focus:outline-none', !isV2 && 'bg-white')"
                :style="isV2 ? { backgroundColor: 'var(--ad-action-primary)' } : undefined"
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
              :class="twMerge('rounded-md px-4 py-2', !isV2 && 'bg-cyan-600 hover:bg-cyan-700')"
              :style="isV2 ? { backgroundColor: 'var(--ad-action-primary)', borderRadius: 'var(--ad-radius-md)' } : undefined"
            >
              Save
            </AppButton>
          </div>
        </div>
      </OnClickOutside>
    </div>
    <!--
      The backdrop doubles as the way out: while the overlay is up it covers the
      header, so the button that switched it on cannot be reached to switch it
      off again. It used to forward the click to that button, which left no way
      out at all whenever the button had failed to be built — so it toggles the
      state itself now. The footer carries a labelled exit too.
    -->
    <div
      @click="toggleEnabled"
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
      <!--
        Live board: a camera frame, which only exists while a board is attached
        and pushing them. Drawn board: a copy of the site's own, filled in by
        `paintBoard` — see there for why this is not an image.
      -->
      <img v-if="liveFrame" :src="liveFrame" class="pointer-events-none size-full" alt="Dartboard">
      <div v-else ref="boardMount" class="pointer-events-none relative size-full" />
    </div>
    <div
      v-if="gameData?.match?.players?.length"
      ref="scoreBoardElement"
      :class="twMerge(
        'fixed origin-bottom-right',
        (scoreBoardElementX === 0 && scoreBoardElementY === 0) && 'bottom-8 right-24',
      )"
      :style="{
        transform: `scale(${scoreBoardScale * fitScale})`,
        left: (scoreBoardElementX === 0 && scoreBoardElementY === 0) ? undefined : `${scoreBoardElementX}px`,
        top: (scoreBoardElementX === 0 && scoreBoardElementY === 0) ? undefined
          : `${scoreBoardElementY - Math.max(0, (gameData?.match?.players?.length - 2) * metrics.rowPx)}px`,
        cursor: isScoreBoardDragging ? 'grabbing' : 'grab',
        zIndex: isScoreBoardDragging ? 100 : 10,
      }"
    >
      <!--
        Which skin to wear is a user setting, and a live one: this swaps under a
        match in progress, because the point of offering the choice is being able
        to see both against the stream before settling on one.

        Everything either skin draws is worked out here and handed over, so the
        two cannot disagree about a number, and neither can reach the game data
        to start disagreeing later.
      -->
      <component
        :is="isV2 ? StreamingBoardV2 : StreamingBoardClassic"
        :rows="rows"
        :title="title"
        :footer="footer"
        :visit-throws="visitThrows"
        :visit-points="visitPoints"
        :busted="!!gameData?.match?.turnBusted"
        :checkout="possibleCheckout"
        :show-avg="!!showAvg"
        :show-throws="!!config.streamingMode.throws"
        :has-sets="!!gameData?.match?.sets"
        @settings="handleToggleSettings"
        @exit="toggleEnabled"
      />
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
import type { IThrow } from "@/utils/websocket-helpers";
import type { IStreamingRow } from "./streaming-board";

import { waitForElement } from "@/utils";
import {
  AutodartsToolsConfig,
  AutodartsToolsStreamingModeStatus,
} from "@/utils/storage";
import AppButton from "@/components/AppButton.vue";
import { AutodartsToolsGameData } from "@/utils/game-data-storage";
import { AutodartsToolsBoardImages } from "@/utils/board-image-storage";
import { SELECTORS, qs } from "@/utils/selectors";
import { setBoardView } from "./board-view";
import StreamingBoardClassic from "./StreamingBoardClassic.vue";
import StreamingBoardV2 from "./StreamingBoardV2.vue";
import { metricsFor } from "./streaming-board";
import { LAYERS } from "@/utils/layers";

/** The header button, so it can be found again to restyle or remove. */
const BUTTON_ID = "adt-stream-mode-button";

/**
 * The room the scoreboard is given: it hangs `right-24` off the right edge, and
 * a gap on the left so it does not sit flush against it.
 */
const SCOREBOARD_GUTTER_PX = 24 * 4 + 8;

/**
 * The same, downwards: it sits `bottom-8` off the bottom edge, and a gap above
 * so a tall scoreboard does not run flush into the top of the window.
 */
const SCOREBOARD_GUTTER_Y_PX = 8 * 4 + 8;

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

const config: Ref<IConfig | null> = ref(null);
const gameData: Ref<IGameData | null> = ref(null);

const defaultBoardImage = browser.runtime.getURL("/images/board.png");
const currentBoardImage = ref<string>("");
/** Where the copy of the site's own board goes — see {@link paintBoard}. */
const boardMount = ref<HTMLElement | null>(null);

const streamingModeButton: Ref<HTMLButtonElement | null> = ref(null);

// Storage watchers outlive the component unless their handles are kept, and
// this one is mounted and unmounted per match — so every match played would
// otherwise add another pair firing on every dart, each holding a dead
// component instance alive with it. Reported by @MaB-MaN in #230.
let gameDataUnwatch: (() => void) | null = null;
let boardImagesUnwatch: (() => void) | null = null;
let statusUnwatch: (() => void) | null = null;
let configUnwatch: (() => void) | null = null;
let onResize: (() => void) | null = null;
let scoreBoardResize: ResizeObserver | null = null;
let headerObserver: MutationObserver | null = null;
/** Guards {@link initStreamModeButton} against being run twice at once. */
let building = false;

const showAvg = computed(() => config.value?.streamingMode.avg);

/**
 * Which of the two scoreboards to draw.
 *
 * Read as "v2 or else classic" rather than matched against both, so a config
 * written before the setting existed — where this is `undefined` — draws the
 * skin its owner has always had.
 */
const isV2 = computed(() => config.value?.streamingMode.design === "v2");

/** The chosen skin's own size, which the fit below is measured against. */
const metrics = computed(() => metricsFor(config.value?.streamingMode.design));

/** The line along the bottom of the overlay, which the user can replace. */
const footer = computed(() => config.value?.streamingMode.footerText || "Game provided by Autodarts.com");

/**
 * The scoreboard's rows, in a fixed order.
 *
 * `match.players` is re-ordered at the start of every leg so that whoever
 * throws first is first in the list, and `gameScores`, `scores`, `stats` and
 * `player` are all positions in *that* list rather than in the seating. Read
 * straight off it — which is what this did — every number was against the right
 * name, but the rows themselves changed places from one leg to the next.
 *
 * So each row is paired with its position in the live list here, and the rows
 * are then sorted by `player.index`: the seat, which is fixed for the whole
 * match. On a stream that is the difference between a scoreboard and a
 * distraction.
 */
const rows = computed<IStreamingRow[]>(() => {
  const match = gameData.value?.match;
  if (!match?.players?.length) return [];

  return match.players
    .map((player, at) => ({
      player,
      at,
      gameScore: match.gameScores?.[at],
      score: match.scores?.[at] ?? undefined,
      stats: match.stats?.[at],
      throwing: match.player === at,
    }))
    .sort((a, b) => (a.player.index ?? a.at) - (b.player.index ?? b.at));
});

/**
 * The darts of the visit being thrown right now.
 *
 * Handing the visit over does not empty `turns[0]`: the finished visit stays at
 * the head of the list until the next dart lands, so a straight read of it kept
 * the last player's three darts on the overlay through the whole of the next
 * player's approach. The turn names its own player, so ask it — the same check
 * Darts Zoom makes.
 */
const currentVisit = computed(() => {
  const match = gameData.value?.match;
  const turn = match?.turns?.[0];
  if (!turn) return null;

  const playing = match?.players?.[match.player];
  if (playing?.id && turn.playerId && turn.playerId !== playing.id) return null;

  return turn;
});

const visitThrows = computed<IThrow[]>(() => currentVisit.value?.throws ?? []);
const visitPoints = computed(() => currentVisit.value?.points ?? 0);

/**
 * The camera frame to show, or nothing.
 *
 * Only in "Live Board" mode, and only while a board is actually pushing frames
 * — with no board attached there are none, and the drawn board below is a
 * better answer than a stale one. What it replaced showed whichever frame it
 * had last seen in either mode.
 */
const liveFrame = computed(() =>
  (config.value?.streamingMode.boardImage && currentBoardImage.value) || "");

/**
 * What the overlay calls this game: "121 - First to 3 Legs - SI-DO".
 *
 * Built from the match data rather than read off the screen. v1 read the spans
 * under `#ad-ext-game-variant`, a hook the rebuilt site does not emit, so this
 * cell was simply blank. The pills the site draws along the top of the match
 * screen say the same three things — but only on its widest layout, and while
 * it is moving between layouts it draws some of them, so a title read at the
 * wrong moment was a third of a title and stayed that way until the next dart.
 *
 * The data says all of it at every window size and never half-way through a
 * render. What it does not do is say it in the user's language, as the pills
 * did; the rest of this extension's own text is English throughout, so that is
 * the side to come down on.
 *
 * Handed over in pieces rather than as a sentence: the two skins punctuate it
 * differently, and joining it here would make one of them take the other's
 * separator apart again.
 */
const title = computed<string[]>(() => {
  const match = gameData.value?.match;
  if (!match) return [];

  const settings = match.settings as { baseScore?: number; inMode?: string; outMode?: string } | undefined;

  const race = match.sets
    ? `First to ${match.sets} Sets`
    : (match.legs ? `First to ${match.legs} Legs` : "");

  // The site abbreviates the in and out modes to their initial plus I or O.
  // Only X01 and its relatives have them; the rest are named by variant.
  const modes = settings?.inMode && settings?.outMode
    ? `${settings.inMode[0].toUpperCase()}I-${settings.outMode[0].toUpperCase()}O`
    : "";

  return [ settings?.baseScore ? String(settings.baseScore) : match.variant, race, modes ]
    .filter(Boolean) as string[];
});

/** Kept in step with the window, since `fitScale` is measured against it. */
const viewportWidth = ref(window.innerWidth);
const viewportHeight = ref(window.innerHeight);

/**
 * The scoreboard's own laid-out height — watched, rather than worked out from
 * the number of rows.
 *
 * Height is not a constant the way the columns are: it depends on how many
 * players are in the match, whether the throws row is on, and which skin is
 * drawing. Measuring it is both simpler and right for all of those at once.
 *
 * `transform: scale()` does not affect layout, so this stays the *unscaled*
 * height and the scale derived from it below cannot feed back into it.
 */
const scoreBoardHeight = ref(0);

/**
 * How much the scoreboard has to give up to fit on screen, on top of whatever
 * the Score Scale slider asks for.
 *
 * Its columns are fixed `rem` widths adding up to 46rem — 736px at the usual
 * root size — and it is pinned to the bottom right. Below about 830px that put
 * the whole left-hand side of it, the player names included, off the left edge
 * of the window: at 420px all that was left on screen were two numbers. The
 * board went with it, since the scoreboard was drawn over the top.
 *
 * Never above 1, so a wide window is left exactly as it was, and the slider
 * still multiplies over it — a user who wants it bigger than the window can
 * still have that.
 */
const fitScale = computed(() => {
  const columns = gameData.value?.match?.sets ? metrics.value.widthWithSets : metrics.value.width;
  const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

  const across = (viewportWidth.value - SCOREBOARD_GUTTER_PX) / (columns * rem);
  // Height was not considered at all, which was fine while there was one skin
  // three players tall. It is not: a six-player match, or the taller of the two
  // skins in a short window, ran off the top of the screen exactly the way the
  // narrow window ran off the side. Until it has been measured once there is
  // nothing to divide by, and width alone is the answer.
  const down = scoreBoardHeight.value
    ? (viewportHeight.value - SCOREBOARD_GUTTER_Y_PX) / scoreBoardHeight.value
    : 1;

  return Math.min(1, across, down);
});

// Helper to get number of throws in current turn
const currentThrowCount = computed(() => visitThrows.value.length);

// Computed property to check for possible checkout
// Returns the checkout guide adjusted for darts already thrown
const possibleCheckout = computed(() => {
  // Check if checkout feature is enabled in config
  if (!config.value?.streamingMode.checkout) return null;

  const match = gameData.value?.match;
  const state = match?.state as {
    checkoutGuide?: Array<{ name: string }>;
    checkoutGuides?: Array<Array<{ name: string }> | null>;
  } | undefined;
  if (!match || !state) return null;

  const currentPlayerIndex = match.player;
  const currentScore = match.gameScores?.[currentPlayerIndex];

  // Return null if no valid score
  if (!currentScore || currentScore <= 0) return null;

  // The rebuilt site sends a route per player; older payloads carry only the
  // singular one, which belongs to whoever is throwing. Either way what is
  // wanted here is the route for the player at the oche.
  const checkoutGuide = state.checkoutGuides?.[currentPlayerIndex] ?? state.checkoutGuide;
  if (!checkoutGuide?.length) return null;

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

  gameDataUnwatch?.();
  gameDataUnwatch = AutodartsToolsGameData.watch((value) => {
    gameData.value = value;

    // A dart has landed, so the site's board has a new hit highlight on it.
    paintBoard();
  });

  // Settings were read once here and never again, so nothing chosen on the
  // settings page — the chroma colour, the background, which rows to show, the
  // footer — reached a match already in progress. You had to leave the match and
  // come back, which is not a thing to ask of anyone mid-broadcast.
  configUnwatch?.();
  configUnwatch = AutodartsToolsConfig.watch((value: IConfig) => {
    config.value = value;
    adoptPlacement(value);
  });

  // Set up board image watcher
  boardImagesUnwatch?.();
  boardImagesUnwatch = AutodartsToolsBoardImages.watch((boardImages: IBoardImages) => {
    if (boardImages.images.length > 0) {
      currentBoardImage.value = boardImages.images[boardImages.images.length - 1];
    }
  });

  onResize = () => {
    viewportWidth.value = window.innerWidth;
    viewportHeight.value = window.innerHeight;
  };
  window.addEventListener("resize", onResize);

  // The header button belongs to the match screen, not to this component, so it
  // has to be put back whenever the site re-renders the header away.
  statusUnwatch?.();
  statusUnwatch = AutodartsToolsStreamingModeStatus.watch((value: boolean) => {
    enabled.value = value;
    syncButton();
  });

  try {
    await initStreamModeButton();

    // Load saved positions and scales
    coordsElementScale.value = config.value?.streamingMode.coordsSettings?.scale || 1;
    scoreBoardScale.value = config.value?.streamingMode.scoreBoardSettings?.scale || 1;
    coordsElementX.value = config.value?.streamingMode.coordsSettings?.x || 0;
    coordsElementY.value = config.value?.streamingMode.coordsSettings?.y || 0;
    scoreBoardElementX.value = config.value?.streamingMode.scoreBoardSettings?.x || 0;
    scoreBoardElementY.value = config.value?.streamingMode.scoreBoardSettings?.y || 0;

    enabled.value = await AutodartsToolsStreamingModeStatus.getValue() || false;
    syncButton();

    // Initialize draggable elements after the DOM is updated
    nextTick(() => {
      initDraggable();
      paintBoard();
    });
  } catch (e) {
    console.error("Autodarts Tools: Streaming Mode - initialization error", e);
  }
});

/**
 * Put the board on what the overlay is about to show, once.
 *
 * v1 clicked `button[aria-label='Live mode']` / `'Coords mode'`, neither of
 * which the rebuilt site emits — it has one button that cycles through the
 * cameras and the drawn board, so asking for a particular view means pressing
 * it until that view comes up. That is what Board View does, so this borrows it.
 *
 * On entering the overlay rather than on every dart: pressing is a loop with a
 * delay between presses, and running that on each update would leave the board
 * permanently mid-cycle.
 *
 * Board View itself is left alone when it is switched on — it has already
 * chosen, and two features pressing the same button in turn would fight.
 */
async function syncBoardView() {
  if (!enabled.value || !config.value?.streamingMode.board) return;
  if (config.value.boardView?.enabled) return;

  await setBoardView(config.value.streamingMode.boardImage ? "live" : "image")
    .catch(e => console.error("Autodarts Tools: Streaming Mode - board view", e));
}

watch([ enabled, () => config.value?.streamingMode.boardImage, () => config.value?.streamingMode.board ], () => {
  syncBoardView();
  nextTick(paintBoard);
});

/**
 * Fill the overlay's board with a copy of the site's own.
 *
 * The board is four stacked inline SVGs on the rebuilt site, not an image, so
 * there is nothing to point an `<img>` at — the static PNG this used to fall
 * back to showed no darts and no hit highlight, and the camera frames it
 * preferred only exist when a board is attached. A copy is live, sharp at any
 * scale, and needs no board at all, which is what makes the drawn mode worth
 * having.
 *
 * The layers are positioned by Tailwind classes on the page, and this copy
 * lands in a shadow root where those classes may not have been generated — so
 * they are pinned inline instead. Nothing in the markup refers to a CSS
 * variable, so the colours come across as they are.
 */
function paintBoard(): void {
  const mount = boardMount.value;
  if (!mount) return;

  const board = qs<HTMLElement>(SELECTORS.match.board);
  if (!board) {
    // No board drawn yet — before the match screen has settled, or on a screen
    // that does not show one. The bundled picture is better than a hole.
    if (mount.firstElementChild?.tagName !== "IMG") {
      const image = document.createElement("img");
      image.src = defaultBoardImage;
      image.alt = "Dartboard";
      image.style.width = "100%";
      image.style.height = "100%";
      mount.replaceChildren(image);
    }
    return;
  }

  const copy = board.cloneNode(true) as HTMLElement;
  copy.removeAttribute("role");
  copy.removeAttribute("aria-label");
  // The site puts the active player's glow on the board with an inline shadow;
  // outside its layout that reads as an accident rather than a highlight.
  copy.style.cssText = "position:relative;width:100%;height:100%;border-radius:9999px;overflow:hidden";
  copy.querySelectorAll("svg").forEach((layer) => {
    layer.style.position = "absolute";
    layer.style.inset = "0";
    layer.style.width = "100%";
    layer.style.height = "100%";
  });

  mount.replaceChildren(copy);
}

// Watch for reference changes and re-initialize dragging
watch([ coordsElement, scoreBoardElement ], () => {
  nextTick(() => {
    initDraggable();
  });
});

// The mount point comes and goes with the overlay and with the board switch, so
// a copy has to be put into whichever one is on screen now.
watch(boardMount, () => nextTick(paintBoard));

/**
 * Follow the scoreboard's height for {@link fitScale}.
 *
 * Re-attached rather than set up once: the element comes and goes with the match
 * data, and swapping skins replaces it outright.
 */
watch(scoreBoardElement, (element) => {
  scoreBoardResize?.disconnect();
  scoreBoardResize = null;
  if (!element) {
    scoreBoardHeight.value = 0;
    return;
  }

  scoreBoardHeight.value = element.offsetHeight;
  scoreBoardResize = new ResizeObserver(() => {
    scoreBoardHeight.value = element.offsetHeight;
  });
  scoreBoardResize.observe(element);
}, { immediate: true });

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

onUnmounted(() => {
  gameDataUnwatch?.();
  gameDataUnwatch = null;

  boardImagesUnwatch?.();
  boardImagesUnwatch = null;

  statusUnwatch?.();
  statusUnwatch = null;

  configUnwatch?.();
  configUnwatch = null;

  if (onResize) window.removeEventListener("resize", onResize);
  onResize = null;

  scoreBoardResize?.disconnect();
  scoreBoardResize = null;

  headerObserver?.disconnect();
  headerObserver = null;

  // Injected into the page rather than rendered by this component, so unmounting
  // does not take it with it.
  document.getElementById(BUTTON_ID)?.remove();
  streamingModeButton.value = null;
});

/**
 * Take the board's and the scoreboard's placement from settings, when settings
 * has something different to say.
 *
 * The refs are what the overlay is drawn from, and while a drag is in progress
 * they are the newer truth — so the two are only pulled together when nothing is
 * being dragged and the values actually differ. That last condition is what
 * stops this and the watcher that saves them from writing to each other in a
 * circle; it is also what makes *Reset Positions* on the settings page move an
 * overlay that is already on screen.
 */
function adoptPlacement(value: IConfig): void {
  if (isCoordsDragging.value || isScoreBoardDragging.value) return;

  const coords = value.streamingMode.coordsSettings;
  const board = value.streamingMode.scoreBoardSettings;

  if (coords) {
    if (coordsElementScale.value !== (coords.scale ?? 1)) coordsElementScale.value = coords.scale ?? 1;
    if (coordsElementX.value !== (coords.x ?? 0)) coordsElementX.value = coords.x ?? 0;
    if (coordsElementY.value !== (coords.y ?? 0)) coordsElementY.value = coords.y ?? 0;
  }

  if (board) {
    if (scoreBoardScale.value !== (board.scale ?? 1)) scoreBoardScale.value = board.scale ?? 1;
    if (scoreBoardElementX.value !== (board.x ?? 0)) scoreBoardElementX.value = board.x ?? 0;
    if (scoreBoardElementY.value !== (board.y ?? 0)) scoreBoardElementY.value = board.y ?? 0;
  }
}

/** The state the overlay is in, and the only place it is written. */
function toggleEnabled(): void {
  enabled.value = !enabled.value;
  AutodartsToolsStreamingModeStatus.setValue(enabled.value);
  syncButton();
}

/** Keep the header button showing which state the overlay is in. */
function syncButton(): void {
  const button = streamingModeButton.value;
  if (!button) return;

  button.toggleAttribute("data-active", enabled.value);
  // The header's icon buttons carry no active state of their own, so this is
  // the extension's: the site's blue for on, its own muted grey for off.
  button.style.color = enabled.value ? "var(--color-blue-40, #63b3ed)" : "";
  button.title = enabled.value ? "Leave Streaming Mode" : "Streaming Mode";
}

/**
 * The overlay's switch, in the match header beside the site's own icons.
 *
 * v1 cloned the last item out of the Chakra mode bar and appended a copy —
 * neither that bar nor the `#ad-ext-*` hooks it was found through exist on the
 * rebuilt site, so no button was ever built and the overlay could not be
 * switched on from a match at all. This builds its own and borrows the class off
 * a sibling, which is how Automatic Fullscreen puts one there.
 */
async function initStreamModeButton() {
  if (document.getElementById(BUTTON_ID) || building) return;

  // Held across the wait below, not just checked before it. The observer that
  // calls this again fires on every DOM change, and the wait is long — so
  // without the flag a header that had gone away collected one pending build per
  // mutation, and every one of them appended a button when the header returned.
  building = true;
  try {
    const header = await waitForElement(SELECTORS.match.header, 15000).catch(() => null);
    if (!header) {
      console.warn("Autodarts Tools: Streaming Mode - no match header found; use the overlay's own controls");
      return;
    }

    // The icon buttons live in the header's right-hand group; a sibling of the
    // existing ones inherits their hit area and spacing for free.
    const iconGroup = qs<HTMLElement>(SELECTORS.match.headerIconGroup, header) ?? header;
    const sibling = iconGroup.querySelector("button");

    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.setAttribute("aria-label", "Streaming Mode");
    button.className = sibling?.className ?? "";
    button.style.cursor = "pointer";
    button.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"20\" height=\"20\" viewBox=\"0 0 24 24\"><g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><path d=\"M7 9h.01m9.74 3H22l-3.5 7l-3.09-4.32\"/><path d=\"m18 9.5l-4 8l-10.39-5.2a2.92 2.92 0 0 1-1.3-3.91L3.69 5.6a2.92 2.92 0 0 1 3.92-1.3ZM2 19h3.76a2 2 0 0 0 1.8-1.1L9 15m-7 6v-4\"/></g></svg>";
    button.addEventListener("click", toggleEnabled);

    iconGroup.appendChild(button);
    streamingModeButton.value = button;
    syncButton();
    watchHeader(iconGroup);
  } finally {
    building = false;
  }
}

/**
 * Put the button back when the site re-renders the header without it.
 *
 * The header is React and is rebuilt on route and layout changes, which takes
 * anything of ours in it with it. Every other injected control on this screen is
 * CSS on an attribute and comes back by itself; this one is a real element, and
 * losing it while the overlay is off leaves nothing to switch it on with.
 */
function watchHeader(iconGroup: HTMLElement): void {
  headerObserver?.disconnect();
  headerObserver = new MutationObserver(() => {
    if (document.getElementById(BUTTON_ID)) return;

    const button = streamingModeButton.value;
    if (!button) return;

    if (iconGroup.isConnected) iconGroup.appendChild(button);
    else initStreamModeButton().catch(e => console.error(e));
  });

  // The app shell rather than the header, which is itself one of the things
  // that gets replaced. One `getElementById` per mutation is cheap enough to
  // sit under a screen that re-renders on every dart.
  const root = qs<HTMLElement>(SELECTORS.app.root) ?? document.body;
  headerObserver.observe(root, { childList: true, subtree: true });
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
