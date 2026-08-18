<template>
  <!-- Feature Card -->
  <div
    v-if="config"
    class="adt-container adt-interactive h-56"
  >
    <div class="relative z-10 flex h-full flex-col justify-between">
      <div>
        <h3 class="mb-1 flex items-center adt-card-title">
          QR Code
        </h3>
        <p class="w-2/3 text-white/70">
          Pins the lobby's join code to the top right corner, in place of Autodarts' own QR button. The ✕ below it hides the code for that lobby and gives the original button back.
        </p>
      </div>
      <div class="flex">
        <AppToggle
          @update:model-value="toggleFeature"
          v-model="config.qrCode.enabled"
        />
      </div>
    </div>
    <div class="gradient-mask-left absolute inset-y-0 right-0 w-2/3">
      <img :src="imageUrl" alt="QR Code" class="size-full object-cover">
    </div>
  </div>
</template>

<script setup lang="ts">
import AppToggle from "../AppToggle.vue";

const imageUrl = browser.runtime.getURL("/images/qr-code.png");

const { config } = useConfig();

async function toggleFeature() {
  if (!config.value) return;

  // Toggle the feature
  const wasEnabled = config.value.qrCode.enabled;
  config.value.qrCode.enabled = !wasEnabled;
}
</script>
