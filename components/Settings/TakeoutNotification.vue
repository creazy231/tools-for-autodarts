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
            <p>{{ t("takeoutNotification.noSettings") }}</p>
            <p>{{ t("takeoutNotification.intro") }}</p>
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
            {{ t("features.takeoutNotification") }}
          </h3>
          <p class="w-2/3 text-white/70">
            {{ t("takeoutNotification.card") }}
          </p>
        </div>
        <div class="flex">
          <div @click="$emit('toggle', 'takeout-notification')" class="absolute inset-y-0 left-12 right-0 cursor-pointer" />
          <AppToggle
            @update:model-value="toggleFeature"
            v-model="config.takeout.enabled"
          />
        </div>
      </div>
      <div class="gradient-mask-left absolute inset-y-0 right-0 w-2/3">
        <img :src="imageUrl" :alt="t('features.takeoutNotification')" class="size-full object-cover">
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import AppToggle from "../AppToggle.vue";

const emit = defineEmits([ "toggle" ]);
const { t } = useI18n();
const { config } = useConfig();
const imageUrl = browser.runtime.getURL("/images/takeout-notification.png");

async function toggleFeature() {
  if (!config.value) return;

  // Toggle the feature
  const wasEnabled = config.value.takeout.enabled;
  config.value.takeout.enabled = !wasEnabled;

  // If we're enabling the feature, open settings
  if (!wasEnabled) {
    await nextTick();
    emit("toggle", "takeout-notification");
  }
}
</script>
