<template>
  <template v-if="!$attrs['data-feature-index']">
    <!-- Settings Panel -->
    <div v-if="config" class="adt-container">
      <div class="relative z-10 pr-2 text-[var(--ad-text-secondary)]">
        <p class="mb-6 max-w-3xl">
          Autodarts has one button for what the board shows, and it only cycles: camera 1, 2, 3, the drawn board, and round
          again. This presses it for you when a game starts, until the view you picked comes up.
        </p>

        <section>
          <h3 class="adt-section-title">
            Options
          </h3>
          <OptionRow title="Start every game showing">
            <template #description>
              A board with fewer cameras has a shorter cycle, so asking for one it lacks leaves the view alone. While Board
              Skins is on, it keeps the drawn board up instead, and this stands aside.
            </template>
            <AppRadioGroup v-model="config.boardView.view" :options="VIEWS" aria-label="Start every game showing" button-size="sm" class-name="is-grid" />
          </OptionRow>
        </section>
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
import AppRadioGroup from "../AppRadioGroup.vue";
import AppToggle from "../AppToggle.vue";

import OptionRow from "./Library/OptionRow.vue";

const emit = defineEmits([ "toggle" ]);

const VIEWS = [
  { label: "Camera 1", value: "camera-1" },
  { label: "Camera 2", value: "camera-2" },
  { label: "Camera 3", value: "camera-3" },
  { label: "Board", value: "image" },
];

const { config } = useConfig();

async function toggleFeature() {
  if (!config.value) return;

  const wasEnabled = config.value.boardView.enabled;
  config.value.boardView.enabled = !wasEnabled;

  if (!wasEnabled) {
    await nextTick();
    emit("toggle", "board-view");
  }
}
</script>
