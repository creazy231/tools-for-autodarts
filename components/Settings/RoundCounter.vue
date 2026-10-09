<template>
  <template v-if="!$attrs['data-feature-index']">
    <!-- Settings Panel -->
    <div v-if="config" class="adt-container min-h-56">
      <div class="relative z-10 flex h-full flex-col justify-between">
        <div>
          <div class="space-y-3 text-white/70">
            <p>{{ t("roundCounter.intro") }}</p>
          </div>
        </div>
      </div>
    </div>
  </template>

  <template v-else>
    <!-- Feature Card -->
    <div v-if="config" class="adt-container adt-interactive h-full min-h-56">
      <div class="relative z-10 flex h-full flex-col justify-between">
        <div>
          <h3 class="adt-card-title mb-1">
            {{ t("features.roundCounter") }}
          </h3>
          <p class="w-2/3 text-white/70">
            {{ t("roundCounter.card") }}
          </p>
        </div>
        <div class="flex items-center justify-between">
          <div class="flex">
            <div
              @click="$emit('toggle', 'round-counter')"
              class="absolute inset-y-0 left-12 right-0 cursor-pointer"
            />
            <AppToggle @update:model-value="toggleFeature" v-model="config.roundCounter.enabled" />
          </div>
        </div>
      </div>
      <div class="gradient-mask-left absolute inset-y-0 right-0 w-2/3">
        <img :src="imageUrl" :alt="t('roundCounter.imageAlt')" class="size-full object-cover">
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import AppToggle from "../AppToggle.vue";

const emit = defineEmits([ "toggle" ]);
const { t } = useI18n();
const { config } = useConfig();
const imageUrl = browser.runtime.getURL("/images/round-counter.png");

async function toggleFeature() {
  if (!config.value) return;

  // Toggle the feature
  const wasEnabled = config.value.roundCounter.enabled;
  config.value.roundCounter.enabled = !wasEnabled;

  // If we're enabling the feature, open settings
  if (!wasEnabled) {
    await nextTick();
    emit("toggle", "round-counter");
  }
}
</script>
