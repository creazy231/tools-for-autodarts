<template>
  <template v-if="!$attrs['data-feature-index']">
    <!-- Settings Panel -->
    <div v-if="config" class="adt-container">
      <div class="relative z-10 pr-2 text-[var(--ad-text-secondary)]">
        <p class="mb-6 max-w-3xl">
          {{ t("largerPlayerNames.intro") }}
        </p>

        <section>
          <h3 class="adt-section-title">
            {{ t("largerPlayerNames.sections.options") }}
          </h3>
          <OptionRow :description="t('largerPlayerNames.size.description')" :title="t('largerPlayerNames.size.title')">
            <AppNumberInput
              v-model="config.largerPlayerNames.value"
              :max="10"
              :min="0.5"
              :step="0.1"
              :label="t('largerPlayerNames.size.title')"
              unit="rem"
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
            {{ t("features.largerPlayerNames") }}
            <span class="icon-[material-symbols--settings-alert-outline-rounded] ml-2 size-5" />
          </h3>
          <p class="w-2/3 text-white/70">
            {{ t("largerPlayerNames.card") }}
          </p>
        </div>
        <div class="flex">
          <div @click="$emit('toggle', 'larger-player-names')" class="absolute inset-y-0 left-12 right-0 cursor-pointer" />
          <AppToggle
            @update:model-value="toggleFeature"
            v-model="config.largerPlayerNames.enabled"
          />
        </div>
      </div>
      <div class="gradient-mask-left absolute inset-y-0 right-0 w-2/3">
        <img :src="imageUrl" :alt="t('features.largerPlayerNames')" class="size-full object-cover">
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
const imageUrl = browser.runtime.getURL("/images/larger-player-names.png");

async function toggleFeature() {
  if (!config.value) return;

  // Toggle the feature
  const wasEnabled = config.value.largerPlayerNames.enabled;
  config.value.largerPlayerNames.enabled = !wasEnabled;

  // If we're enabling the feature, open settings
  if (!wasEnabled) {
    await nextTick();
    emit("toggle", "larger-player-names");
  }
}
</script>
