<template>
  <section class="mb-10">
    <div class="flex min-h-12 items-center justify-between gap-3">
      <!-- One run of text, as LibrarySection's heading, so a wrapped heading keeps its count after its last word. -->
      <h3 class="adt-section-title">
        <span>{{ t(words("title")) }}<span v-if="several" class="adt-section-count">&nbsp;·&nbsp;{{ sets.length }}</span></span>
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
            {{ t("library.sets.new") }}
          </span>
        </AppButton>
      </div>
    </div>
    <p class="mt-1 max-w-3xl text-sm text-[var(--ad-text-muted)]">
      {{ several ? t("library.sets.intro") : t(words("introSingle")) }}
    </p>

    <template v-if="several && viewed">
      <div :aria-label="t(words('title'))" class="adt-pills mt-4" role="group">
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
          <span class="adt-pill-count">{{ set.items.length }}</span>
          <span v-if="set.active" class="sr-only">{{ t("library.sets.inUse") }}</span>
        </button>
      </div>
      <div class="mt-3 flex min-h-8 flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <p v-if="viewed.active" class="text-[var(--ad-text-secondary)]">
          {{ t("library.sets.status.inUse") }}
        </p>
        <template v-else>
          <p class="text-[var(--ad-text-muted)]">
            {{ t("library.sets.status.notInUse", { set: label(active) }) }}
          </p>
          <AppButton @click="emit('use', viewed.id)" auto size="sm">
            {{ t("library.sets.use") }}
          </AppButton>
        </template>
      </div>
    </template>
  </section>

  <!-- New set, or the set viewed renamed -->
  <AppModal @close="closeNameDialog" :show="nameDialog !== null" :title="nameDialog === 'rename' ? t('library.sets.dialog.renameTitle') : t(words('newTitle'))" ghost-close size="sm">
    <div ref="nameForm" class="space-y-5">
      <div>
        <AppInput @keydown.enter="submitName" id="wled-set-name" v-model="draftName" :label="t('library.sets.dialog.nameLabel')" :placeholder="t('library.sets.dialog.namePlaceholder')" />
        <p v-if="nameError" class="adt-field-hint !text-[var(--ad-rose-500)]">
          {{ t(nameError) }}
        </p>
      </div>
      <div v-if="nameDialog === 'create' && viewed?.items.length">
        <p class="adt-field-label">
          {{ t("library.sets.dialog.startLabel") }}
        </p>
        <!-- Stacked: the copy option carries a set's name, which a phone's row has no room for beside the other. -->
        <AppRadioGroup v-model="startWith" :options="startOptions" button-size="sm" vertical />
      </div>
    </div>
    <template #footer>
      <AppButton @click="closeNameDialog" auto>
        {{ t("common.cancel") }}
      </AppButton>
      <AppButton @click="submitName" auto type="primary">
        {{ nameDialog === "rename" ? t("common.save") : t("library.sets.dialog.create") }}
      </AppButton>
    </template>
  </AppModal>

  <!-- The set viewed deleted -->
  <AppModal @close="showDelete = false" :show="showDelete" :title="t('library.sets.deleteDialog.title', { set: label(viewed) })" ghost-close size="sm">
    <p class="text-sm text-[var(--ad-text-muted)]">
      {{ viewed?.items.length ? t(words("deleteBody"), { count: viewed.items.length }) : t(words("deleteBodyEmpty")) }}
    </p>
    <template #footer>
      <AppButton @click="showDelete = false" auto>
        {{ t("common.cancel") }}
      </AppButton>
      <AppButton @click="confirmDelete" auto type="danger">
        {{ t("library.sets.deleteDialog.confirm") }}
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
import type { LibrarySetView, SetFeature } from "@/utils/library-sets";

import { librarySetLabel, librarySetNameTaken } from "@/utils/library-sets";

/**
 * A library's sets (utils/library-sets.ts): a pill for each, the set being
 * viewed picked out and the set in use dotted, a line on whether the set being
 * viewed is in use, and the dialogs that make, rename and delete one. Its words
 * are the feature's own (library.sets.<feature>) where it names the items, and
 * shared otherwise. It changes nothing itself: the panel does what it emits,
 * through composables/useLibrarySets.ts.
 */
const props = defineProps<{
  /** Whose sets: picks the words that name the feature's items. */
  feature: SetFeature;
  /** Every set, in order, as listLibrarySets gives them. */
  sets: LibrarySetView<unknown>[];
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

/** A name longer than this is cut short in the copy option, a button that doesn't wrap: 20 fits a 360px phone. */
const LABEL_LENGTH = 20;
/** The words of the feature's own that the section shows. */
type Words = "title" | "introSingle" | "newTitle" | "empty" | "deleteBody" | "deleteBodyEmpty";
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
  { label: t("library.sets.dialog.copy", { set: short(label(viewed.value)) }), value: "copy" },
  { label: t(words("empty")), value: "empty" },
]);
const moreActions = computed(() => [
  { label: t("library.sets.menu.rename"), icon: "icon-[material-symbols--edit-outline-rounded]", action: openRename },
  {
    label: t("library.sets.menu.delete"),
    hint: viewed.value?.active ? t("library.sets.menu.deleteInUse") : undefined,
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

// The set being viewed deleted elsewhere (another tab): its dialogs close rather
// than act on the set in use, shown in its place.
watch(() => viewed.value?.id, () => {
  closeNameDialog();
  showDelete.value = false;
});

/** The key of one of the feature's own words. */
function words(key: Words) {
  return `library.sets.${props.feature}.${key}` as const;
}

function label(set: { name: string } | undefined): string {
  return set ? librarySetLabel(set, t("library.sets.defaultName")) : "";
}

/** A long name cut before the word the limit falls in, or at the limit when it is one long word; never inside an emoji. */
function short(name: string): string {
  const chars = Array.from(name);
  if (chars.length <= LABEL_LENGTH) return name;
  const cut = chars.slice(0, LABEL_LENGTH - 1).join("");
  const whole = /\s/.test(chars[LABEL_LENGTH - 1]) ? cut : cut.replace(/\s+\S*$/, "");
  return (whole || cut).trimEnd() + ELLIPSIS;
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
  if (!nameDialog.value) return;
  const set = viewed.value;
  const renaming = nameDialog.value === "rename";
  const name = draftName.value.trim();
  if (!name) {
    nameError.value = "library.sets.errors.nameMissing";
    return;
  }
  // Saved as it was: the first set keeps no name of its own, and goes on following the language.
  if (renaming && set && name === label(set)) {
    closeNameDialog();
    return;
  }
  if (librarySetNameTaken(props.sets, name, t("library.sets.defaultName"), renaming ? set?.id : undefined)) {
    nameError.value = "library.sets.errors.nameTaken";
    return;
  }
  if (renaming && set) emit("rename", set.id, name);
  else emit("create", name, startWith.value === "copy" && Boolean(set?.items.length));
  closeNameDialog();
}

function confirmDelete() {
  if (!showDelete.value) return;
  showDelete.value = false;
  if (viewed.value && !viewed.value.active) emit("delete", viewed.value.id);
}
</script>
