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
            <p>When enabled, your own entry is removed from the lobby, and anyone who joins on their own board is moved onto yours — so a whole team can play on one dartboard.</p>
            <p>Add the teams as local players once your own row is gone.</p>
            <p class="italic text-white/50">
              Only runs in private lobbies that you host.
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
            Removes your own entry and moves everyone who joins onto your board, so a team can play on one dartboard. Only in <b>private lobbies</b> you host.
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

const emit = defineEmits([ "toggle" ]);
const { config } = useConfig();
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
</script>
