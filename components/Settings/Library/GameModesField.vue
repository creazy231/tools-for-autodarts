<template>
  <!-- The games a feature plays in: the row's button says which, the editor has a switch for each. -->
  <AppButton @click="openEditor" :aria-label="t('gameModes.buttonLabel', { summary })" auto size="sm">
    <span class="flex items-center gap-1">
      {{ summary }}
      <span class="icon-[material-symbols--chevron-right-rounded] -mr-1 text-lg" />
    </span>
  </AppButton>

  <AppModal @close="closeEditor" :show="showEditor" ghost-close :title="t('gameModes.title')">
    <p class="mb-5 text-sm text-[var(--ad-text-muted)]">
      {{ intro }}
    </p>

    <div class="flex items-center justify-between gap-3 rounded-[var(--ad-radius-lg)] bg-white/[.04] px-3 py-2.5">
      <span class="text-sm font-bold text-white">{{ t("gameModes.summary.all") }}</span>
      <AppSwitch @update:model-value="setAll" :model-value="allOn" :label="t('gameModes.summary.all')" />
    </div>

    <section v-for="group in groups" :key="group.titleKey" class="mt-5">
      <h4 class="mb-1 text-xs font-bold uppercase tracking-wide text-[var(--ad-text-muted)]">
        {{ t(group.titleKey) }}
      </h4>
      <div class="grid gap-x-6 sm:grid-cols-2">
        <div
          v-for="item in group.modes"
          :key="item.mode"
          class="flex items-center justify-between gap-3 border-b border-[var(--ad-border-subtle)] py-2"
        >
          <span class="text-sm text-white">{{ t(item.labelKey) }}</span>
          <AppSwitch @update:model-value="setMode(item.mode, $event)" :label="t(item.labelKey)" :model-value="draft.includes(item.mode)" />
        </div>
      </div>
    </section>

    <template #footer>
      <AppButton @click="closeEditor" auto>
        {{ t("common.cancel") }}
      </AppButton>
      <AppButton @click="save" auto type="primary">
        {{ t("common.save") }}
      </AppButton>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import type { GameMode, GameModeFeature } from "@/utils/game-modes";

import AppButton from "@/components/AppButton.vue";
import AppModal from "@/components/AppModal.vue";
import AppSwitch from "@/components/AppSwitch.vue";
import { disabledToStore, enabledIn, gameModeGroupsFor, gameModesFor, gameModesSummary } from "@/utils/game-modes";

const props = defineProps<{
  feature: GameModeFeature;
  /** The editor's line on what it does. */
  intro: string;
}>();

/** The modes the feature is switched off for, as stored: undefined while every mode is on. */
const disabled = defineModel<GameMode[] | undefined>();

const { t } = useI18n();

const showEditor = ref(false);
/** The switches while the editor is open, as the modes that are on. Nothing is stored until Save. */
const draft = ref<GameMode[]>([]);

const groups = computed(() => gameModeGroupsFor(props.feature));
const shown = computed(() => gameModesFor(props.feature));
/** What the row's button says: "All games", "None", or "12 of 14". */
const summary = computed(() => {
  const { on, total } = gameModesSummary(disabled.value, shown.value);
  if (on === total) return t("gameModes.summary.all");
  if (on === 0) return t("gameModes.summary.none");
  return t("gameModes.summary.count", { on, total });
});
const allOn = computed(() => draft.value.length === shown.value.length);

function openEditor() {
  draft.value = enabledIn(disabled.value, shown.value);
  showEditor.value = true;
}

function closeEditor() {
  showEditor.value = false;
}

function setMode(mode: GameMode, on: boolean) {
  draft.value = on ? [ ...draft.value.filter(item => item !== mode), mode ] : draft.value.filter(item => item !== mode);
}

function setAll(on: boolean) {
  draft.value = on ? [ ...shown.value ] : [];
}

function save() {
  disabled.value = disabledToStore(shown.value, draft.value);
  closeEditor();
}
</script>
