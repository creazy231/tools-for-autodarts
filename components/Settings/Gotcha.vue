<template>
  <template v-if="!$attrs['data-feature-index']">
    <!-- Settings Panel -->
    <div v-if="config" class="adt-container min-h-56">
      <div class="relative z-10 flex h-full flex-col justify-between">
        <div>
          <div class="space-y-3 text-white/70">
            <p>Shows how many points the other players are ahead.</p>
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
          <h3 class="mb-1 adt-card-title">Gotcha Helper</h3>
          <p class="w-2/3 text-white/70">
            Shows how many points the other players are ahead.
          </p>
        </div>
        <div class="flex items-center justify-between">
          <div class="flex">
            <div @click="$emit('toggle', 'gotcha')"
              class="absolute inset-y-0 left-12 right-0 cursor-pointer" />
            <AppToggle @update:model-value="toggleFeature" v-model="config.gotcha.enabled" />
          </div>
        </div>
      </div>
      <div class="gradient-mask-left absolute inset-y-0 right-0 w-2/3">
        <img :src="imageUrl" alt="Gotcha Helper feature preview" class="size-full object-cover">
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import AppToggle from "../AppToggle.vue";

const emit = defineEmits(["toggle"]);
const { config } = useConfig();
const imageUrl = browser.runtime.getURL("/images/gotcha.png");

async function toggleFeature() {
  if (!config.value) return;

  // Toggle the feature
  const wasEnabled = config.value.gotcha.enabled;
  config.value.gotcha.enabled = !wasEnabled;

  // If we're enabling the feature, open settings
  if (!wasEnabled) {
    await nextTick();
    emit("toggle", "gotcha");
  }
}
</script>
