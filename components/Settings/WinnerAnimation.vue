<template>
  <template v-if="!$attrs['data-feature-index']">
    <!-- Settings Panel -->
    <div
      v-if="config"
      class="adt-container min-h-56"
    >
      <div class="relative z-10 flex h-full flex-col justify-between">
        <div>
          <div class="space-y-3 text-white/70">
            <p>{{ t("winnerAnimation.intro") }}</p>

            <div class="mt-4 space-y-4">
              <!-- No additional settings needed for this feature -->
              <p>{{ t("winnerAnimation.effect") }}</p>
              <p>{{ t("winnerAnimation.customise", { animations: t("features.animations") }) }}</p>
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
            {{ t("features.winnerAnimation") }}
          </h3>
          <p class="w-2/3 text-white/70">
            {{ t("winnerAnimation.card") }}
          </p>
        </div>
        <div class="flex">
          <div @click="$emit('toggle', 'winner-animation')" class="absolute inset-y-0 left-12 right-0 cursor-pointer" />
          <AppToggle
            @update:model-value="toggleFeature"
            v-model="config.winnerAnimation.enabled"
          />
        </div>
      </div>
      <div class="gradient-mask-left absolute inset-y-0 right-0 w-2/3">
        <img :src="imageUrl" :alt="t('features.winnerAnimation')" class="size-full object-cover">
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import { useStorage } from "@vueuse/core";
import AppToggle from "../AppToggle.vue";

const emit = defineEmits([ "toggle" ]);
const { t } = useI18n();
useStorage("adt:active-settings", "winner-animation");
const { config } = useConfig();
const imageUrl = browser.runtime.getURL("/images/winner-animation.png");

async function toggleFeature() {
  if (!config.value) return;

  // Toggle the feature
  const wasEnabled = config.value.winnerAnimation.enabled;
  config.value.winnerAnimation.enabled = !wasEnabled;

  // If we're enabling the feature, open settings
  if (!wasEnabled) {
    await nextTick();
    emit("toggle", "winner-animation");
  }
}
</script>
