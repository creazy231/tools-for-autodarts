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
            Settings - Larger Player Match Data
          </h3>
          <div class="space-y-3 text-white/70">
            <p>Configure the size of player match data display on the match page.</p>

            <div class="mt-4 space-y-4">
              <div class="grid grid-cols-[auto_1fr] items-center gap-4">
                <p>Font Size:</p>
                <AppInput
                  v-model="sizeValue"
                  type="text"
                  placeholder="Enter a size value (e.g., 1.5)"
                  class="w-full"
                />
              </div>
              <p class="text-sm text-white/50">
                This value will be used as a multiplier for the default font size.
                For example, a value of 1.5 will make the player match data 50% larger than the default size.
              </p>
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
import { useStorage } from "@vueuse/core";
import AppToggle from "../AppToggle.vue";
import AppInput from "../AppInput.vue";
import { AutodartsToolsConfig, type IConfig } from "@/utils/storage";

const emit = defineEmits([ "toggle", "settingChange" ]);
useStorage("adt:active-settings", "larger-player-match-data");
const config = ref<IConfig>();
const sizeValue = ref("");
const imageUrl = browser.runtime.getURL("/images/larger-player-match-data.png");

onMounted(async () => {
  config.value = await AutodartsToolsConfig.getValue();
  // Initialize the size value from config
  if (config.value?.largerPlayerMatchData?.value) {
    sizeValue.value = config.value.largerPlayerMatchData.value.toString();
  }
});

// Update config when size value changes
watch(sizeValue, (newValue) => {
  if (config.value) {
    // Convert string to number
    const numValue = Number.parseFloat(newValue) || 1; // Default to 1 if parsing fails
    config.value.largerPlayerMatchData.value = numValue;
  }
});

watch(config, async (_, oldValue) => {
  if (!oldValue) return;

  await AutodartsToolsConfig.setValue(toRaw(config.value!));
  emit("settingChange");
  console.log("Larger Player Match Data setting changed");
}, { deep: true });

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
