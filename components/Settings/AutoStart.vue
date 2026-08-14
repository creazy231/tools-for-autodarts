<template>
  <!-- Feature Card -->
  <div
    v-if="config"
    class="adt-container adt-interactive h-56"
  >
    <div class="relative z-10 flex h-full flex-col justify-between">
      <div>
        <h3 class="mb-1 adt-card-title">
          Autostart
        </h3>
        <p class="w-2/3 text-white/70">
          Adds an <b>Autostart</b> toggle beside the lobby's Start Game button. While it is on, the game starts <b>3 seconds</b> after another player joins. Each lobby opens with it off.
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
      <img :src="imageUrl" alt="Auto Start" class="size-full object-cover opacity-70">
    </div>
  </div>
</template>

<script setup lang="ts">
import AppToggle from "../AppToggle.vue";
import { type IConfig } from "@/utils/storage";
import { AutodartsToolsConfig } from "@/utils/storage";

const emit = defineEmits([ "toggle", "settingChange" ]);
const config = ref<IConfig>();
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

onMounted(async () => {
  config.value = await AutodartsToolsConfig.getValue();
});

// Watch for prop changes to update local config
watch(config, async (_, oldValue) => {
  if (!oldValue) return;

  await AutodartsToolsConfig.setValue(toRaw(config.value!));
  emit("settingChange");
  console.log("Auto Start setting changed");
}, { deep: true });
</script>
