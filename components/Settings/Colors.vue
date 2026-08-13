<template>
  <template v-if="!$attrs['data-feature-index']">
    <!-- Settings Panel -->
    <div
      v-if="config"
      class="adt-container min-h-56"
    >
      <div class="relative z-10 flex h-full flex-col justify-between">
        <div>
          <div class="space-y-3 text-white/70">
            <p>Customize the colors of dart throws and scores.</p>

            <div class="mt-4 space-y-4">
              <div class="grid grid-cols-2 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div class="relative min-h-14 w-full">
                  <input
                    v-model="config.colors.background"
                    type="color"
                    class="size-full overflow-hidden rounded-md border-none border-transparent p-0 outline-none"
                  >
                  <span
                    class="pointer-events-none absolute inset-0 flex items-center justify-center p-2 text-center text-xs drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]"
                  >Background color</span>
                </div>
                <div class="relative min-h-14 w-full">
                  <input
                    v-model="config.colors.text"
                    type="color"
                    class="size-full overflow-hidden rounded-md border-none border-transparent p-0 outline-none"
                  >
                  <span
                    class="pointer-events-none absolute inset-0 flex items-center justify-center p-2 text-center text-xs drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]"
                  >Text color</span>
                </div>
                <div class="relative min-h-14 w-full">
                  <input
                    v-model="config.colors.matchBackground"
                    type="color"
                    class="size-full overflow-hidden rounded-md border-none border-transparent p-0 outline-none"
                  >
                  <span
                    class="pointer-events-none absolute inset-0 flex items-center justify-center p-2 text-center text-xs drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]"
                  >Match background</span>
                </div>
                <div
                  class="col-span-1 flex h-14 w-full items-center justify-center rounded-md text-5xl font-bold"
                  :style="{
                    backgroundColor: config.colors.background,
                    color: config.colors.text,
                  }"
                >
                  501
                </div>
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
            Colors
            <span class="icon-[material-symbols--settings-alert-outline-rounded] ml-2 size-5" />
          </h3>
          <p class="w-2/3 text-white/70">
            Customize the colors of dart throws and scores to match your preferences.
          </p>
        </div>
        <div class="flex">
          <div @click="$emit('toggle', 'colors')" class="absolute inset-y-0 left-12 right-0 cursor-pointer" />
          <AppToggle
            @update:model-value="toggleFeature"
            v-model="config.colors.enabled"
          />
        </div>
      </div>
      <div class="gradient-mask-left absolute inset-y-0 right-0 w-2/3">
        <img :src="imageUrl" alt="Colors" class="size-full object-cover opacity-70">
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import AppToggle from "../AppToggle.vue";
import { AutodartsToolsConfig, type IConfig } from "@/utils/storage";

const emit = defineEmits([ "toggle", "settingChange" ]);
const config = ref<IConfig>();
const imageUrl = browser.runtime.getURL("/images/colors.png");

onMounted(async () => {
  config.value = await AutodartsToolsConfig.getValue();
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
  const wasEnabled = config.value.colors.enabled;
  config.value.colors.enabled = !wasEnabled;

  // If we're enabling the feature, open settings
  if (!wasEnabled) {
    await nextTick();
    emit("toggle", "colors");
  }
}
</script>
