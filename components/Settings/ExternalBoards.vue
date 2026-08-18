<template>
  <div
    v-if="config"
    class="adt-container adt-interactive h-56"
  >
    <div class="relative z-10 flex h-full flex-col justify-between">
      <div>
        <h3 class="mb-1 adt-card-title">
          External Boards
        </h3>
        <p class="w-2/3 text-white/70">
          Allows you to save external Boards to easily follow them.
        </p>
      </div>
      <div class="flex">
        <div @click="$emit('toggle', 'external-boards')" class="absolute inset-y-0 left-12 right-0 cursor-pointer" />
        <AppToggle
          @update:model-value="toggleFeature"
          v-model="config.externalBoards.enabled"
        />
      </div>
    </div>
    <div class="gradient-mask-left absolute inset-y-0 right-0 w-2/3">
      <img :src="imageUrl" alt="External Boards" class="size-full object-cover">
    </div>
  </div>
</template>

<script setup lang="ts">
import { useStorage } from "@vueuse/core";
import AppToggle from "../AppToggle.vue";

const emit = defineEmits([ "toggle" ]);
useStorage("adt:active-settings", "external-boards");
const { config } = useConfig();
const imageUrl = browser.runtime.getURL("/images/external-boards.png");

async function toggleFeature() {
  if (!config.value) return;

  // Toggle the feature
  const wasEnabled = config.value.externalBoards.enabled;
  config.value.externalBoards.enabled = !wasEnabled;

  // If we're enabling the feature, open settings
  if (!wasEnabled) {
    await nextTick();
    emit("toggle", "external-boards");
  }
}
</script>
