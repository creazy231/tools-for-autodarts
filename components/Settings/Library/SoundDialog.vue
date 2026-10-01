<template>
  <AppModal @close="emit('close')" :show="show" :title="editing ? t('library.soundDialog.editTitle') : t('library.soundDialog.addTitle')" ghost-close>
    <div class="space-y-5">
      <div v-if="hasFile" class="flex items-center gap-3 rounded-[var(--ad-radius-lg)] bg-white/[.04] p-3">
        <PlayButton @click="emit('play')" :label="t('library.soundDialog.thisSound')" :playing="playing" />
        <div class="min-w-0">
          <p class="text-sm font-bold text-white">
            {{ t("library.source.uploaded") }}
          </p>
          <p class="text-xs text-[var(--ad-text-muted)]">
            {{ t("library.soundDialog.uploadedHint") }}
          </p>
        </div>
      </div>
      <div v-else>
        <label class="adt-field-label" for="sound-url">{{ t("library.soundDialog.linkLabel") }}</label>
        <div class="flex items-center gap-2">
          <div class="min-w-0 flex-1">
            <AppInput id="sound-url" v-model="url" :placeholder="t('library.soundDialog.linkPlaceholder')" type="url">
              <template #icon>
                <span class="icon-[material-symbols--link-rounded]" />
              </template>
            </AppInput>
          </div>
          <PlayButton @click="emit('play')" :disabled="!url" :label="t('library.soundDialog.theLink')" :playing="playing" large />
        </div>
        <p v-if="urlError" class="adt-field-hint !text-[var(--ad-rose-500)]">
          {{ urlError }}
        </p>
        <p v-else class="adt-field-hint">
          {{ t("library.soundDialog.linkHint") }}
        </p>
      </div>

      <div>
        <VolumeField v-model="volume">
          <template #hint>
            {{ t("library.soundDialog.volumeHint", { volume: DEFAULT_VOLUME, max: MAX_VOLUME }) }}
          </template>
        </VolumeField>
        <AppAlert v-if="louderBlocked" class="mt-3" compact variant="warning">
          {{ t("library.soundDialog.louderBlocked", { volume: DEFAULT_VOLUME }) }}
        </AppAlert>
      </div>

      <AppInput id="sound-name" v-model="name" :label="t('library.soundDialog.nameLabel')" :placeholder="t('library.soundDialog.namePlaceholder')" />

      <TriggerField id="sound-triggers" v-model="triggers" :feature="feature" />
    </div>

    <template #footer>
      <AppButton @click="emit('close')" auto>
        {{ t("common.cancel") }}
      </AppButton>
      <AppButton @click="emit('save')" auto type="primary">
        {{ editing ? t("common.save") : t("library.addSound") }}
      </AppButton>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import PlayButton from "./PlayButton.vue";
import TriggerField from "./TriggerField.vue";
import VolumeField from "./VolumeField.vue";

import type { TriggerFeature } from "@/utils/trigger-catalog";

import AppAlert from "@/components/AppAlert.vue";
import AppButton from "@/components/AppButton.vue";
import AppInput from "@/components/AppInput.vue";
import AppModal from "@/components/AppModal.vue";
import { DEFAULT_VOLUME, MAX_VOLUME } from "@/utils/sound-volume";

withDefaults(defineProps<{
  show: boolean;
  editing: boolean;
  /** An uploaded sound, whose file is kept and whose link field is hidden. */
  hasFile: boolean;
  feature: TriggerFeature;
  urlError?: string;
  playing?: boolean;
  /** Set above 100% on a link whose file the extension cannot read, which then plays at 100% at most. */
  louderBlocked?: boolean;
}>(), {
  urlError: "",
  playing: false,
  louderBlocked: false,
});
const emit = defineEmits<{ close: []; save: []; play: [] }>();
const name = defineModel<string>("name", { required: true });
const url = defineModel<string>("url", { required: true });
const triggers = defineModel<string[]>("triggers", { required: true });
const volume = defineModel<number>("volume", { required: true });

const { t } = useI18n();
</script>
