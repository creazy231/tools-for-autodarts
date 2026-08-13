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
            Settings - Smaller Scores
          </h3>
          <div class="space-y-3 text-white/70">
            <p>Configure how the inactive player scores are displayed.</p>

            <div class="mt-4 space-y-4">
              <!-- No additional settings needed for this feature -->
              <p>This feature reduces the font-size of the score of inactive players.</p>
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
            Smaller Scores
          </h3>
          <p class="w-2/3 text-white/70">
            Reduces the font-size of the score of inactive players to improve focus on the current player.
          </p>
        </div>
        <div class="flex">
          <div @click="$emit('toggle', 'smaller-scores')" class="absolute inset-y-0 left-12 right-0 cursor-pointer" />
          <AppToggle
            @update:model-value="toggleFeature"
            v-model="config.smallerScores.enabled"
          />
        </div>
      </div>
      <div class="gradient-mask-left absolute inset-y-0 right-0 w-2/3">
        <img :src="imageUrl" alt="Smaller Scores" class="size-full object-cover">
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import AppToggle from "../AppToggle.vue";
import { AutodartsToolsConfig, type IConfig } from "@/utils/storage";

const emit = defineEmits([ "toggle", "settingChange" ]);
const config = ref<IConfig>();
const imageUrl = browser.runtime.getURL("/images/smaller-scores.png");

onMounted(async () => {
  config.value = await AutodartsToolsConfig.getValue();
});

watch(config, async (_, oldValue) => {
  if (!oldValue) return;

  await AutodartsToolsConfig.setValue(toRaw(config.value!));
  emit("settingChange");
  console.log("Shuffle Players setting changed");
}, { deep: true });

async function toggleFeature() {
  if (!config.value) return;

  // Toggle the feature
  const wasEnabled = config.value.smallerScores.enabled;
  config.value.smallerScores.enabled = !wasEnabled;

  // If we're enabling the feature, open settings
  if (!wasEnabled) {
    await nextTick();
    emit("toggle", "smaller-scores");
  }
}
</script>
