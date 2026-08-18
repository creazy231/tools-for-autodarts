<template>
  <template v-if="!$attrs['data-feature-index']">
    <!-- Settings Panel -->
    <div v-if="config" class="adt-container min-h-56">
      <div class="relative z-10 flex h-full flex-col justify-between">
        <div>
          <div class="space-y-3 text-white/70">
            <p>
              Autodarts has one button for what the board shows, and it only cycles: camera 1, 2, 3,
              the drawn board, and round again. This presses it for you when a game starts, until the
              view you picked comes up.
            </p>

            <div class="mt-4">
              <h4 class="mb-2 font-semibold">
                Start every game showing
              </h4>
              <div class="flex">
                <AppRadioGroup
                  v-model="config.boardView.view"
                  class="grid max-w-md grid-cols-4"
                  :options="[
                    { label: 'Camera 1', value: 'camera-1' },
                    { label: 'Camera 2', value: 'camera-2' },
                    { label: 'Camera 3', value: 'camera-3' },
                    { label: 'Board', value: 'image' },
                  ]"
                />
              </div>
              <p class="mt-1 text-sm text-white/60">
                Boards with fewer cameras have a shorter cycle — asking for a camera that is not
                there leaves the view alone rather than pressing forever.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>

  <template v-else>
    <!-- Feature Card -->
    <div v-if="config" class="adt-container adt-interactive h-56">
      <div class="relative z-10 flex h-full flex-col justify-between">
        <div>
          <h3 class="mb-1 flex items-center adt-card-title">
            Board View
            <span class="icon-[material-symbols--settings-alert-outline-rounded] ml-2 size-5" />
          </h3>
          <p class="w-2/3 text-white/70">
            Start every game on the camera — or the drawn board — you actually want to see.
          </p>
        </div>
        <div class="flex">
          <div @click="$emit('toggle', 'board-view')" class="absolute inset-y-0 left-12 right-0 cursor-pointer" />
          <AppToggle @update:model-value="toggleFeature" v-model="config.boardView.enabled" />
        </div>
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import AppToggle from "../AppToggle.vue";
import AppRadioGroup from "../AppRadioGroup.vue";

import { AutodartsToolsConfig, defaultConfig, type IConfig } from "@/utils/storage";

const emit = defineEmits([ "toggle", "settingChange" ]);
const config = ref<IConfig>();

async function toggleFeature() {
  if (!config.value) return;

  const wasEnabled = config.value.boardView.enabled;
  config.value.boardView.enabled = !wasEnabled;

  if (!wasEnabled) {
    await nextTick();
    emit("toggle", "board-view");
  }
}

onMounted(async () => {
  const stored = await AutodartsToolsConfig.getValue();
  // Settings saved before this feature existed have nothing for it.
  stored.boardView ||= { ...defaultConfig.boardView };
  config.value = stored;
});

watch(config, async (_, oldValue) => {
  if (!oldValue) return;

  await AutodartsToolsConfig.setValue(toRaw(config.value!));
  emit("settingChange");
  console.log("Autodarts Tools: Board View:", config.value?.boardView.enabled ? "enabled" : "disabled");
}, { deep: true });
</script>
