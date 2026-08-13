<template>
  <template v-if="!$attrs['data-feature-index']">
    <!-- Settings Panel -->
    <div
      v-if="config"
      class="adt-container min-h-56"
    >
      <div class="relative z-10 flex h-full flex-col justify-between">
        <div>
          <h3 class="mb-1 adt-card-title">
            Settings - Enhanced Scoring Display
          </h3>
          <div class="space-y-3 text-white/70">
            <p>Configure how the scoring is displayed during matches.</p>

            <div class="mt-4 space-y-4">
              <!-- No additional settings needed for this feature -->
              <p>This feature enhances the scoring display by showing larger point values, dart notation (S/D/T, BULL), and adding smooth animations when scores update during matches.</p>
            </div>
          </div>
        </div>
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
          <h3 class="mb-1 adt-card-title">
            Enhanced Scoring Display
          </h3>

          <p class="w-2/3 text-white/70">
            Enhances dart throw displays with larger numbers and scoring notation during matches.
          </p>
        </div>
        <div class="flex items-center justify-between">
          <div class="flex">
            <div @click="$emit('toggle', 'enhanced-scoring-display')" class="absolute inset-y-0 left-12 right-0 cursor-pointer" />
            <AppToggle
              @update:model-value="toggleFeature"
              v-model="config.enhancedScoringDisplay.enabled"
            />
          </div>
          <div class="self-end text-xs text-white/50">
            <i>Originally by @LeSiiN</i>
          </div>
        </div>
      </div>
      <div class="gradient-mask-left absolute inset-y-0 right-0 w-2/3">
        <img :src="imageUrl" alt="External Boards" class="size-full object-cover">
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";

import AppToggle from "../AppToggle.vue";

import { AutodartsToolsConfig, type IConfig } from "@/utils/storage";

const emit = defineEmits([ "toggle", "settingChange" ]);
const config = ref<IConfig>();
const imageUrl = browser.runtime.getURL("/images/enhanced-scoring-display.png");

async function toggleFeature() {
  if (!config.value) return;

  // Toggle the feature
  const wasEnabled = config.value.enhancedScoringDisplay.enabled;
  config.value.enhancedScoringDisplay.enabled = !wasEnabled;

  // If we're enabling the feature, open settings
  if (!wasEnabled) {
    await nextTick();
    emit("toggle", "enhanced-scoring-display");
  }
}

onMounted(async () => {
  config.value = await AutodartsToolsConfig.getValue();
});

watch(config, async (_, oldValue) => {
  if (!oldValue) return;

  await AutodartsToolsConfig.setValue(toRaw(config.value!));
  emit("settingChange");
  console.log("Enhanced Scoring Display setting changed");
}, { deep: true });
</script>
