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
            <p>Configure recent local players settings here.</p>

            <div class="mt-4 space-y-4">
              <!-- Maximum Players Cap -->
              <div class="grid grid-cols-[5rem_auto] items-center gap-4">
                <AppInput
                  @update:model-value="config.recentLocalPlayers.cap = Number($event)"
                  :model-value="String(config.recentLocalPlayers.cap)"
                  placeholder="10"
                  type="number"
                  size="sm"
                  input-class="w-full"
                />
                <p>Maximum recent players you want to store</p>
              </div>

              <!-- Current Players List -->
              <div v-if="config.recentLocalPlayers.players.length > 0" class="mt-4">
                <h4 class="mb-2 font-semibold">
                  Current Players List
                </h4>
                <div class="mb-2 flex flex-wrap gap-2">
                  <div
                    v-for="(player, index) in config.recentLocalPlayers.players"
                    :key="index"
                  >
                    <AppButton
                      @click="removePlayer(index)"
                      class="text-white/70 hover:text-white"
                      size="sm"
                    >
                      {{ player }}
                      <span class="icon-[pixelarticons--close] ml-2" />
                    </AppButton>
                  </div>
                </div>
                <AppButton
                  @click="clearAllPlayers"
                  size="sm"
                  auto
                >
                  <span class="icon-[pixelarticons--trash] mr-2" />
                  Clear All Players
                </AppButton>
              </div>

              <div v-else-if="config.recentLocalPlayers.enabled" class="mt-4 italic text-white/50">
                No players stored yet. Players will be added automatically when you add them in the lobby.
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
            Recent Local Players
            <span class="icon-[material-symbols--settings-alert-outline-rounded] ml-2 size-5" />
          </h3>

          <p class="w-2/3 text-white/70">
            Default recent local players capped at 5, this will extend it to infinite.
          </p>
        </div>
        <div class="flex">
          <div @click="$emit('toggle', 'recent-local-players')" class="absolute inset-y-0 left-12 right-0 cursor-pointer" />
          <AppToggle
            @update:model-value="toggleFeature"
            v-model="config.recentLocalPlayers.enabled"
          />
        </div>
      </div>
      <div class="gradient-mask-left absolute inset-y-0 right-0 w-2/3">
        <img :src="imageUrl" alt="Recent Local Players" class="size-full object-cover opacity-70">
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import AppToggle from "../AppToggle.vue";
import AppInput from "../AppInput.vue";
import AppButton from "../AppButton.vue";
import { AutodartsToolsConfig, type IConfig } from "@/utils/storage";

const emit = defineEmits([ "toggle", "settingChange" ]);
const config = ref<IConfig>();
const imageUrl = browser.runtime.getURL("/images/recent-local-players.png");

onMounted(async () => {
  config.value = await AutodartsToolsConfig.getValue();
});

watch(config, async (_, oldValue) => {
  if (!oldValue) return;

  await AutodartsToolsConfig.setValue(toRaw(config.value!));
  emit("settingChange");
  console.log("Recent Local Players setting changed");
}, { deep: true });

// Function to remove a player from the list
function removePlayer(index: number) {
  if (config.value && config.value.recentLocalPlayers.players) {
    config.value.recentLocalPlayers.players.splice(index, 1);
  }
}

// Function to clear all players
function clearAllPlayers() {
  if (config.value) {
    config.value.recentLocalPlayers.players = [];
  }
}

async function toggleFeature() {
  if (!config.value) return;

  // Toggle the feature
  const wasEnabled = config.value.recentLocalPlayers.enabled;
  config.value.recentLocalPlayers.enabled = !wasEnabled;

  // If we're enabling the feature, open settings
  if (!wasEnabled) {
    await nextTick();
    emit("toggle", "recent-local-players");
  }
}
</script>
