<template>
  <template v-if="!$attrs['data-feature-index']">
    <!-- Settings Panel -->
    <div v-if="config" class="adt-container">
      <div class="relative z-10 pr-2 text-[var(--ad-text-secondary)]">
        <p class="mb-6 max-w-3xl">
          {{ t("zoom.intro") }}
        </p>

        <section class="mb-10">
          <h3 class="adt-section-title">
            {{ t("zoom.sections.closeUps") }}
          </h3>
          <OptionRow :title="t('zoom.position.title')" :description="t('zoom.position.description')">
            <AppRadioGroup v-model="config.zoom.position" :options="POSITIONS" :aria-label="t('zoom.position.title')" button-size="sm" />
          </OptionRow>
          <OptionRow
            v-if="config.zoom.position === 'bottom' && config.zoom.actionBarPosition"
            :description="t('zoom.barPosition.description')"
            :title="t('zoom.barPosition.title')"
          >
            <AppButton @click="resetActionBarPosition" auto size="sm">
              {{ t("zoom.barPosition.reset") }}
            </AppButton>
          </OptionRow>
          <OptionRow
            v-if="config.zoom.position === 'board'"
            :description="t('zoom.holdFor.description')"
            :title="t('zoom.holdFor.title')"
          >
            <AppNumberInput
              v-model="holdSeconds"
              :max="10"
              :min="0.2"
              :step="0.1"
              :label="t('zoom.holdFor.title')"
              unit="s"
            />
          </OptionRow>
          <OptionRow :description="t('zoom.zoomLevel.description')" :title="t('zoom.zoomLevel.title')">
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
          <OptionRow :description="t('zoom.centreDot.description')" :title="t('zoom.centreDot.title')">
            <AppToggle v-model="config.zoom.showMarker" :aria-label="t('zoom.centreDot.title')" size="sm" />
          </OptionRow>
        </section>

        <section class="mb-10">
          <h3 class="adt-section-title">
            {{ t("zoom.sections.whichDarts") }}
          </h3>
          <OptionRow :description="t('zoom.showDartsOf.description')" :title="t('zoom.showDartsOf.title')">
            <AppRadioGroup v-model="config.zoom.zoomOn" :options="ZOOM_ON" :aria-label="t('zoom.showDartsOf.title')" button-size="sm" />
          </OptionRow>
          <OptionRow :description="t('zoom.onlyOnCheckout.description')" :title="t('zoom.onlyOnCheckout.title')">
            <AppToggle v-model="config.zoom.onlyOnCheckout" :aria-label="t('zoom.onlyOnCheckout.title')" size="sm" />
          </OptionRow>
        </section>

        <section>
          <h3 class="adt-section-title">
            {{ t("zoom.sections.board") }}
          </h3>
          <OptionRow :title="t('zoom.view.title')" :description="t('zoom.view.description')">
            <AppRadioGroup v-model="config.zoom.mode" :options="VIEWS" :aria-label="t('zoom.view.ariaLabel')" button-size="sm" class-name="is-grid" />
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
            {{ t("features.zoom") }}
            <span class="icon-[material-symbols--settings-alert-outline-rounded] ml-2 size-5" />
          </h3>
          <p class="w-2/3 text-white/70">
            {{ t("zoom.card") }}
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
        <img :src="imageUrl" :alt="t('features.zoom')" class="size-full object-cover opacity-70">
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

const { t } = useI18n();
const { config } = useConfig();
const imageUrl = browser.runtime.getURL("/images/zoom.png");

const POSITIONS = computed(() => [
  { label: t("zoom.position.options.bottom"), value: "bottom" },
  { label: t("zoom.position.options.top"), value: "top" },
  { label: t("zoom.position.options.board"), value: "board" },
]);
const ZOOM_ON = computed(() => [
  { label: t("zoom.showDartsOf.options.everyone"), value: "everyone" },
  { label: t("zoom.showDartsOf.options.opponents"), value: "opponents" },
]);
const VIEWS = computed(() => [
  { label: t("zoom.view.options.camera1"), value: "camera-1" },
  { label: t("zoom.view.options.camera2"), value: "camera-2" },
  { label: t("zoom.view.options.camera3"), value: "camera-3" },
  { label: t("zoom.view.options.image"), value: "image" },
]);

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
