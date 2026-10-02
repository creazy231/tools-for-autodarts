<template>
  <template v-if="!$attrs['data-feature-index']">
    <!-- Settings Panel -->
    <div v-if="config" class="adt-container">
      <div class="relative z-10 pr-2 text-[var(--ad-text-secondary)]">
        <p class="mb-6 max-w-3xl">
          {{ t("boardView.intro") }}
        </p>

        <section>
          <h3 class="adt-section-title">
            {{ t("boardView.sections.options") }}
          </h3>
          <OptionRow :title="t('boardView.view.title')" :description="t('boardView.view.description')">
            <AppRadioGroup v-model="config.boardView.view" :options="VIEWS" :aria-label="t('boardView.view.title')" button-size="sm" class-name="is-grid" />
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
            {{ t("features.boardView") }}
            <span class="icon-[material-symbols--settings-alert-outline-rounded] ml-2 size-5" />
          </h3>
          <p class="w-2/3 text-white/70">
            {{ t("boardView.card") }}
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

const { t } = useI18n();
const { config } = useConfig();

const VIEWS = computed(() => [
  { label: t("boardView.view.options.camera1"), value: "camera-1" },
  { label: t("boardView.view.options.camera2"), value: "camera-2" },
  { label: t("boardView.view.options.camera3"), value: "camera-3" },
  { label: t("boardView.view.options.image"), value: "image" },
]);

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
