<template>
  <template v-if="!$attrs['data-feature-index']">
    <!-- Settings Panel -->
    <div v-if="config" class="adt-container">
      <div class="relative z-10 pr-2 text-[var(--ad-text-secondary)]">
        <p class="mb-6 max-w-3xl">
          Replaces the match screen with a broadcast overlay: a chroma key or image background, the board, and a scoreboard you
          place where you want it. Switch it on and off from the stream icon in the match header; changes here show at once.
        </p>

        <section class="mb-10">
          <h3 class="adt-section-title">
            Scoreboard
          </h3>
          <OptionRow description="Autodarts follows the site's own design: flat surfaces, and one blue for whoever is throwing." title="Design">
            <AppRadioGroup v-model="config.streamingMode.design" :options="DESIGNS" aria-label="Design" button-size="sm" />
          </OptionRow>
          <OptionRow description="The darts of the visit in progress and its total, or Bust." title="Throws">
            <AppToggle v-model="config.streamingMode.throws" aria-label="Throws" size="sm" />
          </OptionRow>
          <OptionRow description="The route left for the player at the oche, moved along as each dart lands." title="Checkout suggestions">
            <AppToggle v-model="config.streamingMode.checkout" aria-label="Checkout suggestions" size="sm" />
          </OptionRow>
          <OptionRow description="The leg, set and match average beside each name." title="Averages">
            <AppToggle v-model="config.streamingMode.avg" aria-label="Averages" size="sm" />
          </OptionRow>
          <OptionRow description="Your own line along the bottom of the overlay." stacked title="Footer text">
            <AppInput
              id="streaming-footer"
              v-model="config.streamingMode.footerText"
              aria-label="Footer text"
              placeholder="Game provided by Autodarts.com"
            />
          </OptionRow>
        </section>

        <section class="mb-10">
          <h3 class="adt-section-title">
            Board
          </h3>
          <OptionRow description="The dartboard beside the scoreboard." title="Show the board">
            <AppToggle v-model="config.streamingMode.board" aria-label="Show the board" size="sm" />
          </OptionRow>
          <OptionRow
            v-if="config.streamingMode.board"
            description="The drawn board is a live copy that stays sharp at any size, and stands in while no camera runs. With Board Skins or Board View on, that feature decides."
            title="View"
          >
            <AppRadioGroup v-model="config.streamingMode.boardImage" :options="BOARD_VIEWS" aria-label="Board view" button-size="sm" />
          </OptionRow>
        </section>

        <section class="mb-10">
          <h3 class="adt-section-title">
            Background
          </h3>
          <OptionRow description="A flat colour to key out in your streaming software, or a picture of your own." title="Background">
            <AppRadioGroup v-model="config.streamingMode.backgroundImage" :options="BACKGROUNDS" aria-label="Background" button-size="sm" />
          </OptionRow>
          <OptionRow v-if="!config.streamingMode.backgroundImage" description="Pick one that appears nowhere else on the overlay." title="Colour">
            <div class="flex items-center gap-3">
              <span class="text-sm uppercase tabular-nums text-[var(--ad-text-muted)]">{{ config.streamingMode.chromaKeyColor }}</span>
              <input
                v-model="config.streamingMode.chromaKeyColor"
                aria-label="Chroma key colour"
                class="adt-color-input size-9 shrink-0"
                type="color"
              >
            </div>
          </OptionRow>
          <OptionRow v-else description="Covers the whole overlay. Until there is one, the chroma key colour shows." title="Image">
            <div class="flex items-center gap-2">
              <img
                v-if="config.streamingMode.image"
                :src="config.streamingMode.image"
                alt="Background image"
                class="h-12 w-20 rounded-[var(--ad-radius-sm)] object-cover ring-1 ring-inset ring-[var(--ad-border-strong)]"
              >
              <AppButton @click="streamingModeBackgroundFileSelect.click()" auto size="sm">
                <span class="flex items-center gap-1.5">
                  <span class="icon-[material-symbols--upload-rounded] text-base" />
                  {{ config.streamingMode.image ? "Replace" : "Upload image" }}
                </span>
              </AppButton>
              <ConfirmDeleteButton @confirm="config.streamingMode.image = ''" v-if="config.streamingMode.image" label="background image" />
            </div>
            <input @change="handleStreamingModeBackgroundFileSelected" ref="streamingModeBackgroundFileSelect" accept="image/*" class="hidden" type="file">
          </OptionRow>
        </section>

        <section>
          <h3 class="adt-section-title">
            Layout
          </h3>
          <OptionRow
            description="Puts the board and the scoreboard back where they started, at their first size. An overlay that is up follows at once."
            title="Positions"
          >
            <AppButton @click="handleResetPositions" auto size="sm">
              Reset positions
            </AppButton>
          </OptionRow>
        </section>
      </div>
    </div>
  </template>

  <template v-else>
    <!-- Feature Card -->
    <div
      v-if="config"
      class="adt-container adt-interactive h-56"
    >
      <div class="relative z-10 flex h-full flex-col justify-between">
        <div>
          <h3 class="mb-1 flex items-center adt-card-title">
            Streaming Mode
            <span class="icon-[material-symbols--settings-alert-outline-rounded] ml-2 size-5" />
          </h3>

          <p class="w-2/3 text-white/70">
            Optimizes the interface for streaming with custom backgrounds and layouts.
          </p>
        </div>
        <div class="flex">
          <div @click="$emit('toggle', 'streaming-mode')" class="absolute inset-y-0 left-12 right-0 cursor-pointer" />
          <AppToggle
            @update:model-value="toggleFeature"
            v-model="config.streamingMode.enabled"
          />
        </div>
      </div>
      <div class="gradient-mask-left absolute inset-y-0 right-0 w-2/3">
        <img :src="imageUrl" alt="Streaming Mode" class="size-full object-cover">
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import AppButton from "../AppButton.vue";
import AppInput from "../AppInput.vue";
import AppRadioGroup from "../AppRadioGroup.vue";
import AppToggle from "../AppToggle.vue";

import ConfirmDeleteButton from "./Library/ConfirmDeleteButton.vue";
import OptionRow from "./Library/OptionRow.vue";

const emit = defineEmits([ "toggle" ]);

const DESIGNS = [
  { label: "Classic", value: "classic" },
  { label: "Autodarts", value: "v2" },
];
/** `boardImage` is the camera's picture when true, autodarts' drawn board when false. */
const BOARD_VIEWS = [
  { label: "Camera", value: true },
  { label: "Drawn board", value: false },
];
const BACKGROUNDS = [
  { label: "Chroma key", value: false },
  { label: "Image", value: true },
];

const { config } = useConfig();
const streamingModeBackgroundFileSelect = ref() as Ref<HTMLInputElement>;
const imageUrl = browser.runtime.getURL("/images/streaming-mode.png");

async function toggleFeature() {
  if (!config.value) return;

  // Toggle the feature
  const wasEnabled = config.value.streamingMode.enabled;
  config.value.streamingMode.enabled = !wasEnabled;

  // If we're enabling the feature, open settings
  if (!wasEnabled) {
    await nextTick();
    emit("toggle", "streaming-mode");
  }
}

function handleStreamingModeBackgroundFileSelected() {
  const file = streamingModeBackgroundFileSelect.value.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    if (config.value) {
      config.value.streamingMode.image = reader.result as string;
    }
  };
  reader.readAsDataURL(file);

  streamingModeBackgroundFileSelect.value.value = "";
}

async function handleResetPositions() {
  if (!config.value) return;

  // Reset coordinates and scoreboard positions and scales to default values
  config.value.streamingMode.coordsSettings = {
    scale: 1,
    x: 0,
    y: 0,
  };

  config.value.streamingMode.scoreBoardSettings = {
    scale: 1,
    x: 0,
    y: 0,
  };
}
</script>
