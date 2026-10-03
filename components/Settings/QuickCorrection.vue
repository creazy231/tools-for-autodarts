<template>
  <template v-if="!$attrs['data-feature-index']">
    <!-- Settings Panel -->
    <div v-if="config" class="adt-container">
      <div class="relative z-10 pr-2 text-[var(--ad-text-secondary)]">
        <p class="mb-6 max-w-3xl">
          {{ t("quickCorrection.intro") }}
        </p>

        <AppAlert class="mb-6" compact variant="warning">
          {{ t("quickCorrection.safari.panel") }}
        </AppAlert>

        <section>
          <h3 class="adt-section-title">
            {{ t("quickCorrection.sections.options") }}
          </h3>
          <OptionRow :description="t('quickCorrection.windowSize.description')" :title="t('quickCorrection.windowSize.title')">
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
      class="adt-container adt-interactive h-full min-h-56"
    >
      <div class="relative z-10 flex h-full flex-col justify-between">
        <div>
          <h3 class="mb-1 flex items-center adt-card-title">
            {{ t("features.quickCorrection") }}
            <span class="icon-[material-symbols--settings-alert-outline-rounded] ml-2 size-5" />
          </h3>
          <p class="w-2/3 text-white/70">
            {{ t("quickCorrection.card") }}
          </p>
          <p class="mt-1 w-2/3 text-sm text-yellow-400">
            {{ t("quickCorrection.safari.card") }}
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
        <img :src="imageUrl" :alt="t('features.quickCorrection')" class="size-full object-cover opacity-70">
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
const { t } = useI18n();
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
