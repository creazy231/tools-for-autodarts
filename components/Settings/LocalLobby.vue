<template>
  <template v-if="!$attrs['data-feature-index']">
    <!-- Empty settings panel since this feature doesn't need settings -->
    <div class="adt-container min-h-56">
      <div class="relative z-10 flex h-full flex-col justify-between">
        <div>
          <h3 class="mb-1 adt-card-title">
            {{ t("features.localLobby") }}
          </h3>
          <div class="space-y-3 text-white/70">
            <p>{{ t("localLobby.noSettings") }}</p>
            <p>{{ t("localLobby.intro") }}</p>
            <p>{{ t("localLobby.teams", { teams: t("features.teams") }) }}</p>
            <p class="italic text-white/50">
              {{ t("localLobby.scope") }}
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
      class="adt-container adt-interactive h-full min-h-56"
    >
      <div class="relative z-10 flex h-full flex-col justify-between">
        <div>
          <h3 class="mb-1 adt-card-title">
            {{ t("features.localLobby") }}
          </h3>
          <p class="w-2/3 text-white/70">
            <AppTrans path="localLobby.card" />
          </p>
        </div>
        <div class="flex">
          <div @click="$emit('toggle', 'local-lobby')" class="absolute inset-y-0 left-12 right-0 cursor-pointer" />
          <AppToggle
            @update:model-value="toggleFeature"
            v-model="config.localLobby.enabled"
          />
        </div>
      </div>
      <div class="gradient-mask-left absolute inset-y-0 right-0 w-2/3">
        <img :src="imageUrl" :alt="t('features.localLobby')" class="size-full object-cover opacity-70">
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import AppToggle from "../AppToggle.vue";
import AppTrans from "../AppTrans.vue";

const emit = defineEmits([ "toggle" ]);
const { t } = useI18n();
const { config } = useConfig();
const imageUrl = browser.runtime.getURL("/images/local-lobby.png");

async function toggleFeature() {
  if (!config.value) return;

  // Toggle the feature
  const wasEnabled = config.value.localLobby.enabled;
  config.value.localLobby.enabled = !wasEnabled;

  // If we're enabling the feature, open settings
  if (!wasEnabled) {
    await nextTick();
    emit("toggle", "local-lobby");
  }
}
</script>
