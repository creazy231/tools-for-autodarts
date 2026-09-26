<template>
  <template v-if="!$attrs['data-feature-index']">
    <!-- Settings Panel -->
    <div v-if="config" class="adt-container">
      <div class="relative z-10 pr-2 text-[var(--ad-text-secondary)]">
        <p class="mb-6 max-w-3xl">
          Starts the next leg once the darts are out of the board, after a countdown on the site's own Next Leg button.
        </p>

        <section>
          <h3 class="adt-section-title">
            Options
          </h3>
          <!-- At least a second: a countdown of 0 is never started (button-countdown.ts), which would switch this off. -->
          <OptionRow description="From the end of the takeout to the next leg." title="Countdown">
            <AppNumberInput
              v-model="config.automaticNextLeg.sec"
              :max="120"
              :min="1"
              label="Countdown"
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
            Automatic Next Leg
            <span class="icon-[material-symbols--settings-alert-outline-rounded] ml-2 size-5" />
          </h3>

          <p class="w-2/3 text-white/70">
            Automatically starts the next leg {{ config?.automaticNextLeg?.sec || '5' }} seconds after takeout.
          </p>
        </div>
        <div class="flex">
          <div @click="$emit('toggle', 'automatic-next-leg')" class="absolute inset-y-0 left-12 right-0 cursor-pointer" />
          <AppToggle
            @update:model-value="toggleFeature"
            v-model="config.automaticNextLeg.enabled"
          />
        </div>
      </div>
      <div class="gradient-mask-left absolute inset-y-0 right-0 w-2/3">
        <img :src="imageUrl" alt="Automatic Next Leg" class="size-full object-cover">
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
const imageUrl = browser.runtime.getURL("/images/automatic-next-leg.png");

async function toggleFeature() {
  if (!config.value) return;

  // Toggle the feature
  const wasEnabled = config.value.automaticNextLeg.enabled;
  config.value.automaticNextLeg.enabled = !wasEnabled;

  // If we're enabling the feature, open settings
  if (!wasEnabled) {
    await nextTick();
    emit("toggle", "automatic-next-leg");
  }
}
</script>
