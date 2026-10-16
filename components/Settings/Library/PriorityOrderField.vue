<template>
  <!-- A feature's priority order: the row's button says whether it is the default, the editor is a list to drag. -->
  <AppButton @click="openEditor" :aria-label="t('triggerPriorities.buttonLabel', { summary })" auto size="sm">
    <span class="flex items-center gap-1">
      {{ summary }}
      <span class="icon-[material-symbols--chevron-right-rounded] -mr-1 text-lg" />
    </span>
  </AppButton>

  <AppModal @close="closeEditor" :show="showEditor" ghost-close :title="t('triggerPriorities.title')">
    <p class="mb-2 text-sm text-[var(--ad-text-muted)]">
      {{ intro }}
    </p>
    <p class="mb-5 text-sm text-[var(--ad-text-muted)]">
      {{ t("triggerPriorities.howTo") }}
    </p>

    <ol ref="list" class="flex flex-col">
      <li
        v-for="(level, index) in draft"
        :key="level"
        :data-index="index"
        class="flex items-center gap-3 border-b border-[var(--ad-border-subtle)] py-2 last:border-b-0"
      >
        <span class="adt-drag-handle" aria-hidden="true" :title="t('library.dragToReorder')">
          <span class="icon-[material-symbols--drag-indicator]" />
        </span>
        <span class="w-5 shrink-0 text-right text-xs tabular-nums text-[var(--ad-text-muted)]">{{ index + 1 }}</span>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-bold text-white">
            {{ labelOf(level) }}
          </p>
          <p class="text-xs text-[var(--ad-text-muted)]">
            {{ hintOf(level) }}
          </p>
        </div>
        <div class="flex shrink-0 gap-1">
          <AppButton
            @click="move(index, -1)"
            :aria-label="t('triggerPriorities.moveUp', { level: labelOf(level) })"
            :disabled="index === 0"
            auto
            size="xs"
            type="ghost"
          >
            <span class="icon-[material-symbols--keyboard-arrow-up-rounded] text-lg" />
          </AppButton>
          <AppButton
            @click="move(index, 1)"
            :aria-label="t('triggerPriorities.moveDown', { level: labelOf(level) })"
            :disabled="index === draft.length - 1"
            auto
            size="xs"
            type="ghost"
          >
            <span class="icon-[material-symbols--keyboard-arrow-down-rounded] text-lg" />
          </AppButton>
        </div>
      </li>
    </ol>

    <template #footer>
      <AppButton @click="resetDraft" :disabled="isDefault(draft)" auto type="ghost">
        {{ t("triggerPriorities.reset") }}
      </AppButton>
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
import Sortable from "sortablejs";

import type { PriorityFeature, TriggerLevel } from "@/utils/game-events/priorities";

import AppButton from "@/components/AppButton.vue";
import AppModal from "@/components/AppModal.vue";
import { DEFAULT_ORDER, LEVEL_LABEL_KEYS, orderFor, orderToStore } from "@/utils/game-events/priorities";

const props = defineProps<{
  feature: PriorityFeature;
  /** The editor's line on what the order does for this feature. */
  intro: string;
}>();

/** The order as stored: undefined while it is the feature's default. */
const order = defineModel<TriggerLevel[] | undefined>();

const { t } = useI18n();

const showEditor = ref(false);
/** The list while the editor is open. Nothing is stored until Save. */
const draft = ref<TriggerLevel[]>([]);
const list = ref<HTMLElement | null>(null);
let sorter: Sortable | undefined;

const summary = computed(() => t(order.value?.length && !isDefault(orderFor(props.feature, order.value)) ? "triggerPriorities.summary.custom" : "triggerPriorities.summary.standard"));

// The list is only in the page while the editor is open, so the dragging comes and goes with it.
watch(showEditor, async (open) => {
  sorter?.destroy();
  sorter = undefined;
  if (!open) return;
  await nextTick();
  if (!list.value) return;
  sorter = Sortable.create(list.value, {
    animation: 150,
    handle: ".adt-drag-handle",
    draggable: "[data-index]",
    ghostClass: "adt-sortable-ghost",
    onEnd({ from, item, oldIndex, newIndex }) {
      if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return;
      // Put the node back where Vue left it. Vue moves it itself once the array changes.
      from.removeChild(item);
      from.insertBefore(item, from.children[oldIndex] ?? null);
      moveTo(oldIndex, newIndex);
    },
  });
});

onBeforeUnmount(() => sorter?.destroy());

function labelOf(level: TriggerLevel): string {
  const keys = LEVEL_LABEL_KEYS[level];
  return keys ? t(keys.labelKey) : level;
}

function hintOf(level: TriggerLevel): string {
  const keys = LEVEL_LABEL_KEYS[level];
  return keys ? t(keys.hintKey) : "";
}

function isDefault(levels: readonly TriggerLevel[]): boolean {
  return orderToStore(props.feature, levels) === undefined;
}

function openEditor() {
  draft.value = orderFor(props.feature, order.value);
  showEditor.value = true;
}

function closeEditor() {
  showEditor.value = false;
}

function moveTo(from: number, to: number) {
  const next = [ ...draft.value ];
  const [ level ] = next.splice(from, 1);
  next.splice(to, 0, level);
  draft.value = next;
}

function move(index: number, by: number) {
  const to = index + by;
  if (to < 0 || to >= draft.value.length) return;
  moveTo(index, to);
}

function resetDraft() {
  draft.value = [ ...DEFAULT_ORDER[props.feature] ];
}

function save() {
  order.value = orderToStore(props.feature, draft.value);
  closeEditor();
}
</script>
