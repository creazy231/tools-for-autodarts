<template>
  <AppModal @close="emit('close')" :show="show" :title="title" ghost-close size="lg">
    <div class="space-y-6">
      <div
        @click="chooser?.click()"
        @dragleave.prevent="dragging = false"
        @dragover.prevent="dragging = true"
        @drop.prevent="onDrop"
        @keydown.enter.prevent="chooser?.click()"
        @keydown.space.prevent="chooser?.click()"
        class="adt-dropzone"
        :class="[{ 'is-over': dragging }]"
        role="button"
        tabindex="0"
      >
        <span class="icon-[material-symbols--upload-rounded] mb-1 text-4xl text-white/70" />
        <p class="font-bold text-white">
          {{ t("library.upload.dropzone") }}
        </p>
        <p class="text-xs text-[var(--ad-text-muted)]">
          {{ t("library.upload.formatsLine", { formats }) }}
        </p>
        <input @change="onChoose" ref="chooser" :accept="accept" class="hidden" multiple type="file">
      </div>

      <div v-if="files.length">
        <p class="adt-field-label">
          {{ t("library.upload.chosen", { count: files.length }) }}
        </p>
        <ul class="max-h-64 overflow-y-auto rounded-[var(--ad-radius-lg)] bg-white/[.03]">
          <li
            v-for="(file, index) in files"
            :key="`${index}-${file.name}`"
            class="flex items-center gap-3 border-b border-[var(--ad-border-subtle)] py-2 pl-3 pr-1.5 last:border-b-0"
          >
            <span class="shrink-0 text-lg text-[var(--ad-text-muted)]" :class="[fileIcon]" />
            <span :title="file.name" class="min-w-0 flex-1 truncate text-sm text-white">{{ file.name }}</span>
            <TriggerChips :max="3" :triggers="triggersOf(file)" class="max-w-[45%] justify-end" />
            <button @click="remove(index)" :aria-label="t('common.remove', { name: file.name })" class="adt-icon-btn" :title="t('library.upload.remove')" type="button">
              <span class="icon-[material-symbols--close-rounded]" />
            </button>
          </li>
        </ul>
      </div>

      <div>
        <p class="adt-field-label">
          {{ t("library.triggers.label") }}
        </p>
        <AppRadioGroup v-model="mode" :options="MODES" button-size="sm" />
        <p v-if="mode === 'names'" class="adt-field-hint">
          {{ namesHint }}
        </p>
        <div v-else class="mt-4">
          <AppTokenInput
            v-model="shared"
            :placeholder="t('library.triggers.placeholder')"
            :suggestions="TRIGGER_HINTS[feature]"
            :validate="validate"
          />
          <p class="adt-field-hint">
            {{ t("library.upload.sharedHint") }}
          </p>
        </div>
      </div>
    </div>

    <template #footer>
      <AppButton @click="emit('close')" auto>
        {{ t("common.cancel") }}
      </AppButton>
      <AppButton @click="save" :disabled="!files.length || processing" :loading="processing" auto type="primary">
        {{ files.length ? t(addKey, { count: files.length }) : t("common.add") }}
      </AppButton>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import TriggerChips from "./TriggerChips.vue";

import type { MessageKey } from "@/utils/i18n";
import type { TriggerFeature } from "@/utils/trigger-catalog";

import AppButton from "@/components/AppButton.vue";
import AppModal from "@/components/AppModal.vue";
import AppRadioGroup from "@/components/AppRadioGroup.vue";
import AppTokenInput from "@/components/AppTokenInput.vue";
import { TRIGGER_HINTS } from "@/utils/trigger-catalog";

/**
 * Adding several files at once. Each file shows the trigger its name will give
 * before anything is saved, which is the one thing the old dialog left to guess.
 */
const props = withDefaults(defineProps<{
  show: boolean;
  title: string;
  feature: TriggerFeature;
  /** `audio/*` or an exact type, `image/gif`. */
  accept: string;
  /** The formats it takes, as shown: `t("library.upload.formatsAudio")`, or a format's name, such as "GIF". */
  formats: string;
  fileIcon: string;
  /**
   * The key of the plural on the Add button once files are chosen, which says
   * what the files are: `library.upload.addSounds`, `library.upload.addGifs`.
   */
  addKey: MessageKey;
  /** The triggers a file's name gives. */
  triggersFromName: (file: File) => string[];
  namesHint: string;
  processing?: boolean;
  validate?: (trigger: string) => string;
}>(), {
  processing: false,
  validate: undefined,
});

const emit = defineEmits<{
  close: [];
  save: [ request: { files: File[]; fromNames: boolean; triggers: string[] } ];
}>();

const { t } = useI18n();

const MODES = computed(() => [
  { label: t("library.upload.modes.names"), value: "names" },
  { label: t("library.upload.modes.shared"), value: "shared" },
]);

const files = ref<File[]>([]);
const mode = ref<string>("names");
const shared = ref<string[]>([]);
const dragging = ref(false);
const chooser = ref<HTMLInputElement>();

watch(() => props.show, (show) => {
  if (!show) return;
  files.value = [];
  mode.value = "names";
  shared.value = [];
  dragging.value = false;
});

function accepts(file: File): boolean {
  return props.accept.endsWith("/*") ? file.type.startsWith(props.accept.slice(0, -1)) : file.type === props.accept;
}

function addFiles(list: FileList | null | undefined) {
  const picked = Array.from(list ?? []).filter(accepts);
  if (picked.length) files.value = [ ...files.value, ...picked ];
}

function onDrop(event: DragEvent) {
  dragging.value = false;
  addFiles(event.dataTransfer?.files);
}

function onChoose(event: Event) {
  const input = event.target as HTMLInputElement;
  addFiles(input.files);
  input.value = ""; // so the same file can be chosen again
}

function remove(index: number) {
  files.value = files.value.filter((_, at) => at !== index);
}

function triggersOf(file: File): string[] {
  return mode.value === "names" ? props.triggersFromName(file) : shared.value;
}

function save() {
  emit("save", { files: [ ...files.value ], fromNames: mode.value === "names", triggers: [ ...shared.value ] });
}
</script>
