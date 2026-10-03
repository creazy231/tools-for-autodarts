<template>
  <!-- Feature Card -->
  <div
    v-if="config"
    class="adt-container adt-interactive h-full min-h-56"
  >
    <div class="relative z-10 flex h-full flex-col justify-between">
      <div>
        <h3 class="mb-1 adt-card-title">
          {{ t("features.autoStart") }}
        </h3>
        <p class="w-2/3 text-white/70">
          <AppTrans path="autoStart.card" />
        </p>
      </div>
      <div class="flex">
        <div @click="$emit('toggle', 'auto-start')" class="absolute inset-y-0 left-12 right-0 cursor-pointer" />
        <AppToggle
          @update:model-value="toggleFeature"
          v-model="config.autoStart.enabled"
        />
      </div>
    </div>
    <div class="gradient-mask-left absolute inset-y-0 right-0 w-2/3">
      <img :src="imageUrl" :alt="t('autoStart.imageAlt')" class="size-full object-cover opacity-70">
    </div>
  </div>
</template>

<script setup lang="ts">
import AppToggle from "../AppToggle.vue";
import AppTrans from "../AppTrans.vue";

const emit = defineEmits([ "toggle" ]);
const { t } = useI18n();
const { config } = useConfig();
const imageUrl = browser.runtime.getURL("images/auto-start.png");

async function toggleFeature() {
  if (!config.value) return;

  // Toggle the feature
  const wasEnabled = config.value.autoStart.enabled;
  config.value.autoStart.enabled = !wasEnabled;

  // If we're enabling the feature, open settings
  if (!wasEnabled) {
    await nextTick();
    emit("toggle", "auto-start");
  }
}

// Watch for prop changes to update local config
</script>
