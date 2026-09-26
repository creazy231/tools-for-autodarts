<template>
  <template v-if="!$attrs['data-feature-index']">
    <!-- Settings Panel -->
    <div v-if="config" class="adt-container">
      <div class="relative z-10 pr-2 text-[var(--ad-text-secondary)]">
        <p class="mb-6 max-w-3xl">
          Draws the leg and match averages under each score larger. A row that no longer fits the card wraps onto a second line.
        </p>

        <section>
          <h3 class="adt-section-title">
            Options
          </h3>
          <OptionRow description="In rem: 1 is the browser's base size, 16 pixels by default. autodarts draws the averages at about 1.4." title="Size">
            <AppNumberInput
              v-model="config.largerPlayerMatchData.value"
              :max="10"
              :min="0.5"
              :step="0.1"
              label="Size"
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
            Larger Player Match Data
            <span class="icon-[material-symbols--settings-alert-outline-rounded] ml-2 size-5" />
          </h3>
          <p class="w-2/3 text-white/70">
            Increases the font-size of the player match data on the match page for better visibility.
          </p>
        </div>
        <div class="flex">
          <div @click="$emit('toggle', 'larger-player-match-data')" class="absolute inset-y-0 left-12 right-0 cursor-pointer" />
          <AppToggle
            @update:model-value="toggleFeature"
            v-model="config.largerPlayerMatchData.enabled"
          />
        </div>
      </div>
      <div class="gradient-mask-left absolute inset-y-0 right-0 w-2/3">
        <img :src="imageUrl" alt="Larger Player Match Data" class="size-full object-cover">
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import AppNumberInput from "../AppNumberInput.vue";
import AppToggle from "../AppToggle.vue";

import OptionRow from "./Library/OptionRow.vue";

const emit = defineEmits([ "toggle" ]);
const { config } = useConfig();
const imageUrl = browser.runtime.getURL("/images/larger-player-match-data.png");

async function toggleFeature() {
  if (!config.value) return;

  // Toggle the feature
  const wasEnabled = config.value.largerPlayerMatchData.enabled;
  config.value.largerPlayerMatchData.enabled = !wasEnabled;

  // If we're enabling the feature, open settings
  if (!wasEnabled) {
    await nextTick();
    emit("toggle", "larger-player-match-data");
  }
}
</script>
