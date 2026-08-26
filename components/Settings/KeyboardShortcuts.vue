<template>
  <template v-if="!$attrs['data-feature-index']">
    <!-- Settings Panel -->
    <div
      v-if="config"
      class="adt-container min-h-56"
    >
      <div class="relative z-10 flex h-full flex-col justify-between">
        <div>
          <h3 class="mb-1 font-bold uppercase">
            Settings - Keyboard Shortcuts
          </h3>
          <div class="space-y-3 text-white/70">
            <p>Assign a key to click the match buttons. Press the key during a match to trigger the action. Shortcuts are ignored while typing in an input field.</p>

            <div class="mt-4 space-y-4">
              <div class="grid grid-cols-[5rem_auto] items-center gap-4">
                <AppInput
                  @update:model-value="setKey('nextLeg', $event)"
                  :model-value="config.shortcuts.nextLeg"
                  placeholder="n"
                  size="sm"
                  input-class="w-full"
                />
                <p>Next Leg / Next Set</p>
              </div>
              <div class="grid grid-cols-[5rem_auto] items-center gap-4">
                <AppInput
                  @update:model-value="setKey('resetBoard', $event)"
                  :model-value="config.shortcuts.resetBoard"
                  placeholder="r"
                  size="sm"
                  input-class="w-full"
                />
                <p>Reset board detection</p>
              </div>
              <div class="grid grid-cols-[5rem_auto] items-center gap-4">
                <AppInput
                  @update:model-value="setKey('referee', $event)"
                  :model-value="config.shortcuts.referee"
                  placeholder="c"
                  size="sm"
                  input-class="w-full"
                />
                <p>Referee</p>
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
      class="adt-container h-56 transition-transform hover:-translate-y-0.5"
    >
      <div class="relative z-10 flex h-full flex-col justify-between">
        <div>
          <h3 class="mb-1 flex items-center font-bold uppercase">
            Keyboard Shortcuts
            <span class="icon-[material-symbols--settings-alert-outline-rounded] ml-2 size-5" />
          </h3>

          <p class="w-2/3 text-white/70">
            Adds keyboard shortcuts for Next Leg ({{ config?.shortcuts?.nextLeg || 'n' }}), Reset detection ({{ config?.shortcuts?.resetBoard || 'r' }}) and Referee ({{ config?.shortcuts?.referee || 'c' }}).
          </p>
        </div>
        <div class="flex">
          <div @click="$emit('toggle', 'keyboard-shortcuts')" class="absolute inset-y-0 left-12 right-0 cursor-pointer" />
          <AppToggle
            @update:model-value="toggleFeature"
            v-model="config.shortcuts.enabled"
          />
        </div>
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import AppToggle from "../AppToggle.vue";
import AppInput from "../AppInput.vue";

import { AutodartsToolsConfig, type IConfig, defaultConfig } from "@/utils/storage";

const emit = defineEmits([ "toggle", "settingChange" ]);
const config = ref<IConfig>();

async function toggleFeature() {
  if (!config.value) return;

  // Toggle the feature
  const wasEnabled = config.value.shortcuts.enabled;
  config.value.shortcuts.enabled = !wasEnabled;

  // If we're enabling the feature, open settings
  if (!wasEnabled) {
    await nextTick();
    emit("toggle", "keyboard-shortcuts");
  }
}

function setKey(action: "nextLeg" | "resetBoard" | "referee", value: string) {
  if (!config.value) return;
  // Keep only the last typed character so the field always holds a single key
  config.value.shortcuts[action] = value.trim().slice(-1).toLowerCase();
}

onMounted(async () => {
  config.value = await AutodartsToolsConfig.getValue();
  if (!config.value?.shortcuts) config.value.shortcuts = defaultConfig.shortcuts;
});

watch(config, async (_, oldValue) => {
  if (!oldValue) return;

  await AutodartsToolsConfig.setValue(toRaw(config.value!));
  emit("settingChange");
  console.log("Keyboard Shortcuts setting changed");
}, { deep: true });
</script>
