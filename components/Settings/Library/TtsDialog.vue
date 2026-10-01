<template>
  <AppModal @close="emit('close')" :show="show" :title="editing ? t('library.tts.editTitle') : t('library.tts.addTitle')" ghost-close>
    <div class="space-y-5">
      <AppInput id="tts-text" v-model="text" :label="t('library.tts.textLabel')" :placeholder="t('library.tts.textPlaceholder')">
        <template #icon>
          <span class="icon-[material-symbols--record-voice-over-outline-rounded]" />
        </template>
      </AppInput>

      <AppSelect id="tts-voice" v-model="voice" :label="t('library.tts.voiceLabel')" :options="voiceOptions" />

      <div class="grid gap-x-8 sm:grid-cols-2">
        <div>
          <p class="adt-field-label">
            {{ t("library.tts.speed") }} <span class="font-medium text-[var(--ad-text-muted)]">{{ rate.toFixed(1) }}×</span>
          </p>
          <AppSlider v-model="rate" :max="2" :min="0.5" :show-value="false" :step="0.1" />
        </div>
        <div>
          <p class="adt-field-label">
            {{ t("library.tts.pitch") }} <span class="font-medium text-[var(--ad-text-muted)]">{{ pitch.toFixed(1) }}</span>
          </p>
          <AppSlider v-model="pitch" :max="2" :min="0" :show-value="false" :step="0.1" />
        </div>
      </div>

      <VolumeField v-model="volume" :max="MAX_TTS_VOLUME">
        <template #hint>
          {{ t("library.tts.volumeHint", { max: MAX_TTS_VOLUME }) }}
        </template>
      </VolumeField>

      <TriggerField
        id="tts-triggers"
        v-model="triggers"
        :error="missingTrigger ? t('library.tts.missingTrigger') : ''"
        :feature="feature"
      />
    </div>

    <template #footer>
      <AppButton @click="emit('prelisten')" :disabled="!text" :loading="speaking" auto class="mr-auto">
        <span class="flex items-center gap-1.5">
          <span class="icon-[material-symbols--play-arrow-rounded] text-lg" />
          {{ t("library.tts.listen") }}
        </span>
      </AppButton>
      <AppButton @click="emit('close')" auto>
        {{ t("common.cancel") }}
      </AppButton>
      <AppButton @click="save" :disabled="!text" auto type="primary">
        {{ editing ? t("common.save") : t("library.addSound") }}
      </AppButton>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import TriggerField from "./TriggerField.vue";
import VolumeField from "./VolumeField.vue";

import type { TriggerFeature } from "@/utils/trigger-catalog";

import AppButton from "@/components/AppButton.vue";
import AppInput from "@/components/AppInput.vue";
import AppModal from "@/components/AppModal.vue";
import AppSelect from "@/components/AppSelect.vue";
import AppSlider from "@/components/AppSlider.vue";
import { MAX_TTS_VOLUME } from "@/utils/sound-volume";

const props = defineProps<{
  show: boolean;
  editing: boolean;
  voices: { value: string; label: string }[];
  speaking: boolean;
  feature: TriggerFeature;
}>();
const emit = defineEmits<{ close: []; save: []; prelisten: [] }>();
const text = defineModel<string>("text", { required: true });
const voice = defineModel<string>("voice", { required: true });
const rate = defineModel<number>("rate", { required: true });
const pitch = defineModel<number>("pitch", { required: true });
const volume = defineModel<number>("volume", { required: true });
const triggers = defineModel<string[]>("triggers", { required: true });

const { t } = useI18n();

const missingTrigger = ref(false);

const voiceOptions = computed(() => [ { value: "", label: t("library.tts.defaultVoice") }, ...props.voices ]);

// Opening the dialog afresh, or adding a trigger, clears the complaint.
watch(() => props.show, () => {
  missingTrigger.value = false;
});
watch(triggers, (value) => {
  if (value.length) missingTrigger.value = false;
});

/**
 * Save stays enabled while a trigger is still being typed: pressing it takes
 * focus from the field, which turns the text into a chip before the click.
 */
function save() {
  missingTrigger.value = !triggers.value.length;
  if (!missingTrigger.value) emit("save");
}
</script>
