<template>
  <template v-if="!$attrs['data-feature-index']">
    <!-- Empty settings panel since this feature doesn't need settings -->
    <div class="adt-container min-h-56">
      <div class="relative z-10 flex h-full flex-col justify-between">
        <div>
          <h3 class="mb-1 adt-card-title">
            Team Lobby
          </h3>
          <div class="space-y-3 text-white/70">
            <p>This feature doesn't have any additional settings.</p>
            <p>When enabled, the first player is removed from the lobby and every following player is added to the board.</p>
            <p class="italic text-white/50">
              This feature only works in private lobbies.
            </p>
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
          <h3 class="mb-1 adt-card-title">
            Team Lobby
          </h3>
          <p class="w-2/3 text-white/70">
            Removes first player from the lobby and adds every following player to the board. Works only in <b>private lobbies</b>.
          </p>
        </div>
        <div class="flex">
          <div @click="$emit('toggle', 'team-lobby')" class="absolute inset-y-0 left-12 right-0 cursor-pointer" />
          <AppToggle
            @update:model-value="toggleFeature"
            v-model="config.teamLobby.enabled"
          />
        </div>
      </div>
      <div class="gradient-mask-left absolute inset-y-0 right-0 w-2/3">
        <img :src="imageUrl" alt="Team Lobby" class="size-full object-cover opacity-70">
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import AppToggle from "../AppToggle.vue";
import { AutodartsToolsConfig, type IConfig } from "@/utils/storage";

const emit = defineEmits([ "toggle", "settingChange" ]);
const config = ref<IConfig>();
const imageUrl = browser.runtime.getURL("/images/team-lobby.png");

async function toggleFeature() {
  if (!config.value) return;

  // Toggle the feature
  const wasEnabled = config.value.teamLobby.enabled;
  config.value.teamLobby.enabled = !wasEnabled;

  // If we're enabling the feature, open settings
  if (!wasEnabled) {
    await nextTick();
    emit("toggle", "team-lobby");
  }
}

onMounted(async () => {
  config.value = await AutodartsToolsConfig.getValue();
});

watch(config, async (_, oldValue) => {
  if (!oldValue) return;

  await AutodartsToolsConfig.setValue(toRaw(config.value!));
  emit("settingChange");
  console.log("Team Lobby setting changed");
}, { deep: true });
</script>
