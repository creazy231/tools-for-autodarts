<template>
  <template v-if="!$attrs['data-feature-index']">
    <!-- Settings Panel -->
    <div v-if="config" class="adt-container">
      <div class="relative z-10 pr-2 text-[var(--ad-text-secondary)]">
        <p class="mb-6 max-w-3xl">
          Fixes a dart the board read wrong: open it on a throw and pick the right segment from a grid of the whole board,
          with the mouse or the number pad.
        </p>

        <AppAlert class="mb-6" compact variant="warning">
          Not available in Safari yet: its security rules block the correction window.
        </AppAlert>

        <section>
          <h3 class="adt-section-title">
            Options
          </h3>
          <OptionRow description="How large the correction window opens." title="Window size">
            <div class="flex w-full items-center gap-3 sm:w-64">
              <AppSlider
                v-model="scale"
                :autofocus="false"
                :max="2"
                :min="0.5"
                :show-value="false"
                :step="0.1"
                class="flex-1"
              />
              <span class="w-11 text-right text-sm font-semibold tabular-nums text-[var(--ad-text-primary)]">{{ formatScaleLabel(scale) }}</span>
            </div>
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
            Quick Correction
            <span class="icon-[material-symbols--settings-alert-outline-rounded] ml-2 size-5" />
          </h3>
          <p class="w-2/3 text-white/70">
            Adds a quick correction to dart throws, allowing you to fix incorrectly recognized darts.
          </p>
          <p class="mt-1 w-2/3 text-sm text-yellow-400">
            Not compatible with Safari browsers for now.
          </p>
        </div>
        <div class="flex">
          <div @click="$emit('toggle', 'quick-correction')" class="absolute inset-y-0 left-12 right-0 cursor-pointer" />
          <AppToggle
            @update:model-value="toggleFeature"
            v-model="config.quickCorrection.enabled"
          />
        </div>
      </div>
      <div class="gradient-mask-left absolute inset-y-0 right-0 w-2/3">
        <img :src="imageUrl" alt="Quick Correction" class="size-full object-cover opacity-70">
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import AppAlert from "../AppAlert.vue";
import AppSlider from "../AppSlider.vue";
import AppToggle from "../AppToggle.vue";

import OptionRow from "./Library/OptionRow.vue";

const emit = defineEmits([ "toggle" ]);
const { config } = useConfig();
const imageUrl = browser.runtime.getURL("/images/quick-correction.png");

// Computed property for scale
const scale = computed({
  get: () => {
    if (!config.value?.quickCorrection?.scale) return 1;
    return config.value.quickCorrection.scale;
  },
  set: (value: number) => {
    if (config.value?.quickCorrection) {
      config.value.quickCorrection.scale = value;
    }
  },
});

// Format the scale as a percentage
function formatScaleLabel(value: number): string {
  const percentage = Math.round(value * 100);
  return `${percentage}%`;
}

async function toggleFeature() {
  if (!config.value) return;

  // Toggle the feature
  const wasEnabled = config.value.quickCorrection.enabled;
  config.value.quickCorrection.enabled = !wasEnabled;

  // If we're enabling the feature, open settings
  if (!wasEnabled) {
    await nextTick();
    emit("toggle", "quick-correction");
  }
}
</script>
