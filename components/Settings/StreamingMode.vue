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
            Settings - Streaming Mode
          </h3>
          <div class="space-y-3 text-white/70">
            <p>Configure the streaming mode settings for your broadcasts.</p>

            <div class="mt-4 space-y-4">
              <!-- Background Mode Selection -->
              <h4 class="font-semibold">
                Background Type
              </h4>

              <div class="flex">
                <AppRadioGroup
                  v-model="backgroundMode"
                  :options="[
                    { label: 'Image Background', value: true },
                    { label: 'Chroma Key Color', value: false },
                  ]"
                />
              </div>

              <!-- Chroma Key Color Selection (when in chroma key mode) -->
              <div v-if="!backgroundMode" class="mt-4">
                <h4 class="mb-2 font-semibold">
                  Chroma Key Color
                </h4>
                <div class="grid grid-cols-2 gap-4">
                  <div class="relative min-h-14 w-full">
                    <input
                      v-model="config.streamingMode.chromaKeyColor"
                      type="color"
                      class="size-full overflow-hidden rounded-md border-none border-transparent p-0 outline-none"
                    >
                    <span
                      class="pointer-events-none absolute inset-0 flex items-center justify-center p-2 text-center text-xs drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]"
                    >Chroma Key Color</span>
                  </div>
                  <div
                    class="flex h-14 w-full items-center justify-center rounded-md"
                    :style="{ backgroundColor: config.streamingMode.chromaKeyColor }"
                  >
                    <span class="text-xs text-white drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]">Preview</span>
                  </div>
                </div>
              </div>

              <!-- Background Image Upload (when in image mode) -->
              <div v-if="backgroundMode" class="grid grid-cols-[auto_1fr] items-center gap-4">
                <AppButton
                  @click="handleStreamingModeBackgroundFileSelect"
                  class="whitespace-nowrap"
                >
                  <span class="icon-[pixelarticons--image] mr-2" />
                  <span>Upload Background</span>
                </AppButton>
                <p>Upload a custom background image for streaming mode</p>
                <input @change="handleStreamingModeBackgroundFileSelected" ref="streamingModeBackgroundFileSelect" type="file" accept="image/*" class="hidden">
              </div>

              <!-- Reset Background Button -->
              <div v-if="backgroundMode && config.streamingMode.image" class="grid grid-cols-[auto_1fr] items-center gap-4">
                <AppButton
                  @click="handleStreamingModeBackgroundReset"
                  type="danger"
                  class="whitespace-nowrap"
                >
                  <span class="icon-[pixelarticons--close] mr-2" />
                  <span>Reset Background</span>
                </AppButton>
                <p>Remove the current background image</p>
              </div>

              <!-- Background Preview -->
              <div v-if="backgroundMode && config.streamingMode.image" class="mt-4">
                <p class="mb-2">
                  Current Background:
                </p>
                <img :src="config.streamingMode.image" alt="Streaming Mode Background" class="max-h-40 rounded border border-white/10">
              </div>

              <!-- Display Options -->
              <div class="mt-6 space-y-3">
                <h4 class="font-semibold">
                  Display Options
                </h4>

                <!-- Display Throws Toggle -->
                <div class="grid grid-cols-[auto_1fr] items-center gap-4">
                  <AppToggle v-model="config.streamingMode.throws" />
                  <p>Display Throws</p>
                </div>

                <!-- Display Board Toggle -->
                <div class="grid grid-cols-[auto_1fr] items-center gap-4">
                  <AppToggle v-model="config.streamingMode.board" />
                  <p>Display Board</p>
                </div>

                <!-- Board Mode Selection (only if board display is enabled) -->
                <div v-if="config.streamingMode.board" class="grid grid-cols-[auto_1fr] items-center gap-4">
                  <AppRadioGroup
                    v-model="config.streamingMode.boardImage"
                    :options="[
                      { label: 'Live Board', value: true },
                      { label: 'Image Board', value: false },
                    ]"
                  />
                </div>

                <!-- Display AVG Score Toggle -->
                <div class="grid grid-cols-[auto_1fr] items-center gap-4">
                  <AppToggle v-model="config.streamingMode.avg" />
                  <p>Display AVG Score</p>
                </div>

                <!-- Display Checkout Toggle -->
                <div class="grid grid-cols-[auto_1fr] items-center gap-4">
                  <AppToggle v-model="config.streamingMode.checkout" />
                  <p>Display Checkout Suggestions</p>
                </div>
              </div>

              <!-- Footer Text Input -->
              <div class="mt-6">
                <p class="mb-2 font-semibold">
                  Overlay Footer Text
                </p>
                <input
                  v-model="config.streamingMode.footerText"
                  placeholder="Enter text to display at the bottom of the streaming overlay"
                  class="w-full rounded-md border border-white/10 bg-transparent px-3 py-2 outline-none placeholder:opacity-50"
                >
              </div>

              <!-- Reset Positions Button -->
              <div class="mt-6 grid grid-cols-[auto_1fr] items-center gap-4">
                <AppButton
                  @click="handleResetPositions"
                  type="danger"
                  class="whitespace-nowrap"
                >
                  <span class="icon-[pixelarticons--reload] mr-2" />
                  <span>Reset Positions</span>
                </AppButton>
                <p>Reset the board and scoreboard positions and scales to default</p>
              </div>
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
            Streaming Mode
            <span class="icon-[material-symbols--settings-alert-outline-rounded] ml-2 size-5" />
          </h3>

          <p class="w-2/3 text-white/70">
            Optimizes the interface for streaming with custom backgrounds and layouts.
          </p>
        </div>
        <div class="flex">
          <div @click="$emit('toggle', 'streaming-mode')" class="absolute inset-y-0 left-12 right-0 cursor-pointer" />
          <AppToggle
            @update:model-value="toggleFeature"
            v-model="config.streamingMode.enabled"
          />
        </div>
      </div>
      <div class="gradient-mask-left absolute inset-y-0 right-0 w-2/3">
        <img :src="imageUrl" alt="Streaming Mode" class="size-full object-cover">
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import AppButton from "../AppButton.vue";
import AppToggle from "../AppToggle.vue";
import AppRadioGroup from "../AppRadioGroup.vue";

import { AutodartsToolsConfig, type IConfig } from "@/utils/storage";

const emit = defineEmits([ "toggle", "settingChange" ]);
const config = ref<IConfig>();
const streamingModeBackgroundFileSelect = ref() as Ref<HTMLInputElement>;
const backgroundMode = ref(true);
const imageUrl = browser.runtime.getURL("/images/streaming-mode.png");

onMounted(async () => {
  config.value = await AutodartsToolsConfig.getValue();
  // Initialize backgroundMode based on config
  if (config.value) {
    backgroundMode.value = config.value.streamingMode.backgroundImage;
  }
});

// Watch for changes to backgroundMode and update config
watch(backgroundMode, (newValue) => {
  if (config.value) {
    config.value.streamingMode.backgroundImage = newValue;
  }
});

watch(config, async (_, oldValue) => {
  if (!oldValue) return;

  await AutodartsToolsConfig.setValue(toRaw(config.value!));
  emit("settingChange");
  console.log("Streaming Mode setting changed");
}, { deep: true });

async function toggleFeature() {
  if (!config.value) return;

  // Toggle the feature
  const wasEnabled = config.value.streamingMode.enabled;
  config.value.streamingMode.enabled = !wasEnabled;

  // If we're enabling the feature, open settings
  if (!wasEnabled) {
    await nextTick();
    emit("toggle", "streaming-mode");
  }
}

function handleStreamingModeBackgroundFileSelect() {
  streamingModeBackgroundFileSelect.value.click();
}

function handleStreamingModeBackgroundFileSelected() {
  const file = streamingModeBackgroundFileSelect.value.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    if (config.value) {
      config.value.streamingMode.image = reader.result as string;
    }
  };
  reader.readAsDataURL(file);

  streamingModeBackgroundFileSelect.value.value = "";
}

function handleStreamingModeBackgroundReset() {
  if (config.value) {
    config.value.streamingMode.image = "";
  }
}

async function handleResetPositions() {
  if (!config.value) return;

  // Reset coordinates and scoreboard positions and scales to default values
  config.value.streamingMode.coordsSettings = {
    scale: 1,
    x: 0,
    y: 0,
  };

  config.value.streamingMode.scoreBoardSettings = {
    scale: 1,
    x: 0,
    y: 0,
  };

  // Save the updated config
  await AutodartsToolsConfig.setValue(toRaw(config.value));
}
</script>
