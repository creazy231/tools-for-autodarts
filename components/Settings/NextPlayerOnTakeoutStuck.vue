<template>
  <template v-if="!$attrs['data-feature-index']">
    <!-- Settings Panel -->
    <div v-if="config" class="adt-container">
      <div class="relative z-10 pr-2 text-[var(--ad-text-secondary)]">
        <p class="mb-6 max-w-3xl">
          {{ t("nextPlayerOnTakeoutStuck.intro") }}
        </p>

        <section>
          <h3 class="adt-section-title">
            {{ t("nextPlayerOnTakeoutStuck.sections.options") }}
          </h3>
          <OptionRow :description="t('nextPlayerOnTakeoutStuck.countdown.description')" :title="t('nextPlayerOnTakeoutStuck.countdown.title')">
            <AppNumberInput
              v-model="config.nextPlayerOnTakeOutStuck.sec"
              :max="120"
              :min="1"
              :label="t('nextPlayerOnTakeoutStuck.countdown.title')"
              unit="s"
            />
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
            {{ t("features.nextPlayerOnTakeoutStuck") }}
            <span class="icon-[material-symbols--settings-alert-outline-rounded] ml-2 size-5" />
          </h3>

          <p class="w-2/3 text-white/70">
            {{ t("nextPlayerOnTakeoutStuck.card", { count: config?.nextPlayerOnTakeOutStuck?.sec || 5 }) }}
          </p>
        </div>
        <div class="flex">
          <div @click="$emit('toggle', 'next-player-on-takeout-stuck')" class="absolute inset-y-0 left-12 right-0 cursor-pointer" />
          <AppToggle
            @update:model-value="toggleFeature"
            v-model="config.nextPlayerOnTakeOutStuck.enabled"
          />
        </div>
      </div>
      <div class="gradient-mask-left absolute inset-y-0 right-0 w-2/3">
        <img :src="imageUrl" :alt="t('features.nextPlayerOnTakeoutStuck')" class="size-full object-cover">
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import AppNumberInput from "../AppNumberInput.vue";
import AppToggle from "../AppToggle.vue";

import OptionRow from "./Library/OptionRow.vue";

const emit = defineEmits([ "toggle" ]);
const { t } = useI18n();
const { config } = useConfig();
const imageUrl = browser.runtime.getURL("/images/next-player-on-takeout-stuck.png");

async function toggleFeature() {
  if (!config.value) return;

  // Toggle the feature
  const wasEnabled = config.value.nextPlayerOnTakeOutStuck.enabled;
  config.value.nextPlayerOnTakeOutStuck.enabled = !wasEnabled;

  // If we're enabling the feature, open settings
  if (!wasEnabled) {
    await nextTick();
    emit("toggle", "next-player-on-takeout-stuck");
  }
}
</script>
