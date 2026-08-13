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
            <p>Configure how long to wait before automatically switching to the next player when takeout is stuck.</p>

            <div class="mt-4 space-y-4">
              <!-- Seconds Input -->
              <div class="grid grid-cols-[5rem_auto] items-center gap-4">
                <AppInput
                  @update:model-value="config.nextPlayerOnTakeOutStuck.sec = Number($event)"
                  :model-value="String(config.nextPlayerOnTakeOutStuck.sec)"
                  placeholder="5"
                  type="number"
                  size="sm"
                  input-class="w-full"
                />
                <p>Seconds to wait before automatically switching to the next player</p>
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
            Auto Next Player on Takeout
            <span class="icon-[material-symbols--settings-alert-outline-rounded] ml-2 size-5" />
          </h3>

          <p class="w-2/3 text-white/70">
            Automatically reset board and switch to next player if takeout stucks for {{ config?.nextPlayerOnTakeOutStuck?.sec || '5' }} seconds.
          </p>
        </div>
        <div class="flex">
          <div @click="$emit('toggle', 'next-player-on-takeout-stuck')" class="absolute inset-y-0 left-12 right-0 cursor-pointer" />
          <AppToggle
            @update:model-value="toggleFeature"
            v-model="config.nextPlayerOnTakeOutStuck.enabled"
          />
        </div>
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import AppToggle from "../AppToggle.vue";
import AppInput from "../AppInput.vue";
import { AutodartsToolsConfig, type IConfig } from "@/utils/storage";

const emit = defineEmits([ "toggle", "settingChange" ]);
const config = ref<IConfig>();

onMounted(async () => {
  config.value = await AutodartsToolsConfig.getValue();
});

watch(config, async (_, oldValue) => {
  if (!oldValue) return;

  await AutodartsToolsConfig.setValue(toRaw(config.value!));
  emit("settingChange");
  console.log("Next Player on Takeout Stuck setting changed");
}, { deep: true });

async function toggleFeature() {
  if (!config.value) return;

  // Toggle the feature
  const wasEnabled = config.value.nextPlayerOnTakeOutStuck.enabled;
  config.value.nextPlayerOnTakeOutStuck.enabled = !wasEnabled;

  // If we're enabling the feature, open settings
  if (!wasEnabled) {
    await nextTick();
    emit("toggle", "next-player-on-takeout-stuck");
  }
}
</script>
