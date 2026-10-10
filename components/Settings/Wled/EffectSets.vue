<template>
  <section class="mb-10">
    <div class="flex min-h-12 items-center justify-between gap-3">
      <h3 class="adt-section-title">
        {{ t("wled.sets.title") }}
        <span v-if="several" class="adt-section-count">· {{ sets.length }}</span>
      </h3>
      <div class="flex items-center gap-2">
        <AppMenu v-if="several" :items="moreActions">
          <template #trigger="{ open, toggle }">
            <button @click="toggle" :aria-expanded="open" :aria-label="t('library.moreActions')" class="adt-icon-btn" :title="t('library.more')" type="button">
              <span class="icon-[material-symbols--more-horiz]" />
            </button>
          </template>
        </AppMenu>
        <AppButton @click="openCreate" auto size="sm">
          <span class="flex items-center gap-1">
            <span class="icon-[material-symbols--add-rounded] text-lg" />
            {{ t("wled.sets.new") }}
          </span>
        </AppButton>
      </div>
    </div>
    <p class="mt-1 max-w-3xl text-sm text-[var(--ad-text-muted)]">
      {{ several ? t("wled.sets.intro") : t("wled.sets.introSingle") }}
    </p>

    <template v-if="several && viewed">
      <div :aria-label="t('wled.sets.title')" class="adt-pills mt-4" role="group">
        <button
          @click="emit('update:modelValue', set.id)"
          v-for="set in sets"
          :key="set.id"
          :aria-pressed="set.id === viewed.id"
          class="adt-pill max-w-full"
          :class="[{ 'is-active': set.id === viewed.id }]"
          type="button"
        >
          <span v-if="set.active" class="size-2 shrink-0 rounded-full bg-[var(--ad-action-primary)]" aria-hidden="true" />
          <span class="min-w-0 truncate">{{ label(set) }}</span>
          <span class="adt-pill-count">{{ set.effects.length }}</span>
          <span v-if="set.active" class="sr-only">{{ t("wled.sets.inUse") }}</span>
        </button>
      </div>
      <div class="mt-3 flex min-h-8 flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <p v-if="viewed.active" class="text-[var(--ad-text-secondary)]">
          {{ t("wled.sets.status.inUse") }}
        </p>
        <template v-else>
          <p class="text-[var(--ad-text-muted)]">
            {{ t("wled.sets.status.notInUse", { set: label(active) }) }}
          </p>
          <AppButton @click="emit('use', viewed.id)" auto size="sm">
            {{ t("wled.sets.use") }}
          </AppButton>
        </template>
      </div>
    </template>
  </section>

  <!-- New set, or the set viewed renamed -->
  <AppModal @close="closeNameDialog" :show="nameDialog !== null" :title="nameDialog === 'rename' ? t('wled.sets.dialog.renameTitle') : t('wled.sets.dialog.newTitle')" ghost-close size="sm">
    <div ref="nameForm" class="space-y-5">
      <div>
        <AppInput @keydown.enter="submitName" id="wled-set-name" v-model="draftName" :label="t('wled.sets.dialog.nameLabel')" :placeholder="t('wled.sets.dialog.namePlaceholder')" />
        <p v-if="nameError" class="adt-field-hint !text-[var(--ad-rose-500)]">
          {{ t(nameError) }}
        </p>
      </div>
      <div v-if="nameDialog === 'create' && viewed?.effects.length">
        <p class="adt-field-label">
          {{ t("wled.sets.dialog.startLabel") }}
        </p>
        <AppRadioGroup v-model="startWith" :options="startOptions" button-size="sm" />
      </div>
    </div>
    <template #footer>
      <AppButton @click="closeNameDialog" auto>
        {{ t("common.cancel") }}
      </AppButton>
      <AppButton @click="submitName" auto type="primary">
        {{ nameDialog === "rename" ? t("common.save") : t("wled.sets.dialog.create") }}
      </AppButton>
    </template>
  </AppModal>

  <!-- The set viewed deleted -->
  <AppModal @close="showDelete = false" :show="showDelete" :title="t('wled.sets.deleteDialog.title', { set: label(viewed) })" ghost-close size="sm">
    <p class="text-sm text-[var(--ad-text-muted)]">
      {{ viewed?.effects.length ? t("wled.sets.deleteDialog.body", { count: viewed.effects.length }) : t("wled.sets.deleteDialog.bodyEmpty") }}
    </p>
    <template #footer>
      <AppButton @click="showDelete = false" auto>
        {{ t("common.cancel") }}
      </AppButton>
      <AppButton @click="confirmDelete" auto type="danger">
        {{ t("wled.sets.deleteDialog.confirm") }}
      </AppButton>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import AppButton from "../../AppButton.vue";
import AppInput from "../../AppInput.vue";
import AppMenu from "../../AppMenu.vue";
import AppModal from "../../AppModal.vue";
import AppRadioGroup from "../../AppRadioGroup.vue";

import type { MessageKey } from "@/utils/i18n";
import type { WledSetView } from "@/utils/wled-sets";

import { setLabel, setNameTaken } from "@/utils/wled-sets";

/**
 * WLED's effect sets (utils/wled-sets.ts): a pill for each, the set being
 * viewed picked out and the set in use dotted, a line on whether the set being
 * viewed is in use, and the dialogs that make, rename and delete one. It
 * changes nothing itself: the panel does what it emits.
 */
const props = defineProps<{
  /** Every set, in order, as listSets gives them. */
  sets: WledSetView[];
  /** The id of the set being viewed. */
  modelValue: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [ id: string ];
  use: [ id: string ];
  create: [ name: string, copy: boolean ];
  rename: [ id: string, name: string ];
  delete: [ id: string ];
}>();

const { t } = useI18n();

/** A name longer than this is cut short in the copy option, a button that doesn't wrap. */
const LABEL_LENGTH = 24;
const ELLIPSIS = "…";

const nameDialog = ref<"create" | "rename" | null>(null);
const draftName = ref("");
/** What the name field refuses, as the key of the line said under it; "" is nothing to say. */
const nameError = ref<MessageKey | "">("");
const startWith = ref<"copy" | "empty">("copy");
const showDelete = ref(false);
const nameForm = ref<HTMLElement>();

const several = computed(() => props.sets.length > 1);
/** The set picked, or the set in use when the one picked has gone. */
const viewed = computed(() => props.sets.find(set => set.id === props.modelValue) ?? props.sets.find(set => set.active));
const active = computed(() => props.sets.find(set => set.active));
const startOptions = computed(() => [
  { label: t("wled.sets.dialog.copy", { set: short(label(viewed.value)) }), value: "copy" },
  { label: t("wled.sets.dialog.empty"), value: "empty" },
]);
const moreActions = computed(() => [
  { label: t("wled.sets.menu.rename"), icon: "icon-[material-symbols--edit-outline-rounded]", action: openRename },
  {
    label: t("wled.sets.menu.delete"),
    hint: viewed.value?.active ? t("wled.sets.menu.deleteInUse") : undefined,
    icon: "icon-[material-symbols--delete-outline-rounded]",
    danger: true,
    separated: true,
    disabled: Boolean(viewed.value?.active),
    action: () => {
      showDelete.value = true;
    },
  },
]);

watch(draftName, () => {
  nameError.value = "";
});

function label(set: { name: string } | undefined): string {
  return set ? setLabel(set, t("wled.sets.defaultName")) : "";
}

function short(name: string): string {
  return name.length > LABEL_LENGTH ? name.slice(0, LABEL_LENGTH - 1).trimEnd() + ELLIPSIS : name;
}

async function openCreate() {
  draftName.value = "";
  startWith.value = "copy";
  nameDialog.value = "create";
  await focusName();
}

async function openRename() {
  draftName.value = label(viewed.value);
  nameDialog.value = "rename";
  await focusName();
}

async function focusName() {
  nameError.value = "";
  await nextTick();
  nameForm.value?.querySelector("input")?.focus();
}

function closeNameDialog() {
  nameDialog.value = null;
}

function submitName() {
  const set = viewed.value;
  const renaming = nameDialog.value === "rename";
  const name = draftName.value.trim();
  if (!name) {
    nameError.value = "wled.sets.errors.nameMissing";
    return;
  }
  // Saved as it was: the first set keeps no name of its own, and goes on following the language.
  if (renaming && set && name === label(set)) {
    closeNameDialog();
    return;
  }
  if (setNameTaken(props.sets, name, t("wled.sets.defaultName"), renaming ? set?.id : undefined)) {
    nameError.value = "wled.sets.errors.nameTaken";
    return;
  }
  if (renaming && set) emit("rename", set.id, name);
  else emit("create", name, startWith.value === "copy" && Boolean(set?.effects.length));
  closeNameDialog();
}

function confirmDelete() {
  showDelete.value = false;
  if (viewed.value && !viewed.value.active) emit("delete", viewed.value.id);
}
</script>
