<template>
  <template v-if="!$attrs['data-feature-index']">
    <!-- Settings Panel -->
    <div v-if="config" class="adt-container">
      <div class="relative z-10 pr-2 text-[var(--ad-text-secondary)]">
        <p class="mb-6 max-w-3xl">
          A close-up of where each dart of the visit landed, one tile per dart: along the foot of the screen, under the throw
          display, or on the board itself.
        </p>

        <section class="mb-10">
          <h3 class="adt-section-title">
            Close-ups
          </h3>
          <OptionRow title="Position">
            <template #description>
              Bottom gives each dart a third of the window and moves undo and Next to the top right, where you can drag
              them anywhere. Top puts the strip under the throw display. On board zooms autodarts' own board in on each
              dart instead, and adds nothing to the screen.
            </template>
            <AppRadioGroup v-model="config.zoom.position" :options="POSITIONS" aria-label="Position" button-size="sm" />
          </OptionRow>
          <OptionRow
            v-if="config.zoom.position === 'bottom' && config.zoom.actionBarPosition"
            description="Puts autodarts' undo and Next back in the top right corner."
            title="Bar position"
          >
            <AppButton @click="resetActionBarPosition" auto size="sm">
              Reset bar position
            </AppButton>
          </OptionRow>
          <OptionRow
            v-if="config.zoom.position === 'board'"
            description="How long the board stays on a dart. It pulls back out as soon as the visit ends or passes on."
            title="Hold for"
          >
            <AppNumberInput
              v-model="holdSeconds"
              :max="10"
              :min="0.2"
              :step="0.1"
              label="Hold for"
              unit="s"
            />
          </OptionRow>
          <OptionRow description="How closely each tile zooms in on its dart." title="Zoom level">
            <div class="flex w-full items-center gap-3 sm:w-64">
              <AppSlider
                v-model="zoomLevel"
                :autofocus="false"
                :max="6"
                :min="1"
                :show-value="false"
                :step="0.1"
                class="flex-1"
              />
              <span class="w-11 text-right text-sm font-semibold tabular-nums text-[var(--ad-text-primary)]">{{ formatZoomLabel(zoomLevel) }}</span>
            </div>
          </OptionRow>
          <OptionRow description="A dot on the exact point each dart landed." title="Centre dot">
            <AppToggle v-model="config.zoom.showMarker" aria-label="Centre dot" size="sm" />
          </OptionRow>
        </section>

        <section class="mb-10">
          <h3 class="adt-section-title">
            Which darts
          </h3>
          <OptionRow description="Everyone's darts, or only your opponents'." title="Show darts of">
            <AppRadioGroup v-model="config.zoom.zoomOn" :options="ZOOM_ON" aria-label="Show darts of" button-size="sm" />
          </OptionRow>
          <OptionRow description="Close-ups only on visits where a checkout is on." title="Only on a checkout">
            <AppToggle v-model="config.zoom.onlyOnCheckout" aria-label="Only on a checkout" size="sm" />
          </OptionRow>
        </section>

        <section>
          <h3 class="adt-section-title">
            Board
          </h3>
          <OptionRow title="View">
            <template #description>
              What autodarts' board shows during a game, and so what the close-ups are cut from: a camera's own picture,
              or a sharp copy of the drawn board. While Board Skins or Board View is on, that feature decides.
            </template>
            <AppRadioGroup v-model="config.zoom.mode" :options="VIEWS" aria-label="Board view" button-size="sm" class-name="is-grid" />
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
            Darts Zoom
            <span class="icon-[material-symbols--settings-alert-outline-rounded] ml-2 size-5" />
          </h3>
          <p class="w-2/3 text-white/70">
            A close-up of where each dart landed — along the foot of the screen, under the throw display, or on the board itself.
          </p>
        </div>
        <div class="flex">
          <div @click="$emit('toggle', 'zoom')" class="absolute inset-y-0 left-12 right-0 cursor-pointer" />
          <AppToggle
            @update:model-value="toggleFeature"
            v-model="config.zoom.enabled"
          />
        </div>
      </div>
      <div class="gradient-mask-left absolute inset-y-0 right-0 w-2/3">
        <img :src="imageUrl" alt="Darts Zoom" class="size-full object-cover opacity-70">
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import AppButton from "../AppButton.vue";
import AppNumberInput from "../AppNumberInput.vue";
import AppRadioGroup from "../AppRadioGroup.vue";
import AppSlider from "../AppSlider.vue";
import AppToggle from "../AppToggle.vue";

import OptionRow from "./Library/OptionRow.vue";

const emit = defineEmits([ "toggle" ]);

const POSITIONS = [
  { label: "Bottom", value: "bottom" },
  { label: "Top", value: "top" },
  { label: "On board", value: "board" },
];
const ZOOM_ON = [
  { label: "Everyone", value: "everyone" },
  { label: "Opponents", value: "opponents" },
];
const VIEWS = [
  { label: "Camera 1", value: "camera-1" },
  { label: "Camera 2", value: "camera-2" },
  { label: "Camera 3", value: "camera-3" },
  { label: "Board", value: "image" },
];

const { config } = useConfig();
const imageUrl = browser.runtime.getURL("/images/zoom.png");

/** Stored in milliseconds; shown in seconds, as every other time in the settings. */
const holdSeconds = computed({
  get: () => (config.value?.zoom.resetAfterMs ?? 1000) / 1000,
  set: (seconds: number) => {
    if (config.value) config.value.zoom.resetAfterMs = Math.round(seconds * 1000);
  },
});

// Computed property for zoom level with mapping between 1-6 and the actual zoom value
const zoomLevel = computed({
  get: () => {
    if (!config.value?.zoom?.level) return 1;
    // Map from actual zoom level to slider (1-6)
    return config.value.zoom.level;
  },
  set: (value: number) => {
    if (config.value?.zoom) {
      config.value.zoom.level = value;
    }
  },
});

// Format the zoom level as a percentage (1 = 0%, 6 = 100%)
function formatZoomLabel(value: number): string {
  const percentage = Math.round(((value - 1) / 5) * 100);
  return `${percentage}%`;
}

function resetActionBarPosition() {
  if (config.value?.zoom) config.value.zoom.actionBarPosition = null;
}

async function toggleFeature() {
  if (!config.value) return;

  // Toggle the feature
  const wasEnabled = config.value.zoom.enabled;
  config.value.zoom.enabled = !wasEnabled;

  // If we're enabling the feature, open settings
  if (!wasEnabled) {
    await nextTick();
    emit("toggle", "zoom");
  }
}
</script>
