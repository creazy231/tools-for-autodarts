<template>
  <!-- A sound's volume in its editor: the value in the label, as Speed and Pitch have it, and a way back to 100%. -->
  <div>
    <div class="flex min-h-8 items-center justify-between gap-3">
      <p class="adt-field-label !mb-0">
        {{ t("library.volume.label") }} <span class="font-medium tabular-nums text-[var(--ad-text-muted)]">{{ volume }}%</span>
      </p>
      <button
        @click="volume = DEFAULT_VOLUME"
        v-if="volume !== DEFAULT_VOLUME"
        :aria-label="t('library.volume.reset', { volume: DEFAULT_VOLUME })"
        class="adt-icon-btn"
        :title="t('library.volume.reset', { volume: DEFAULT_VOLUME })"
        type="button"
      >
        <span class="icon-[material-symbols--restart-alt-rounded]" />
      </button>
    </div>
    <AppSlider
      v-model="volume"
      :autofocus="false"
      :format-label="percent"
      :max="max"
      :min="0"
      :show-value="false"
      :step="VOLUME_STEP"
      class="!pb-3"
      :label="t('library.volume.label')"
    />
    <p v-if="$slots.hint" class="adt-field-hint !mt-0">
      <slot name="hint" />
    </p>
  </div>
</template>

<script setup lang="ts">
import AppSlider from "@/components/AppSlider.vue";
import { DEFAULT_VOLUME, MAX_VOLUME, VOLUME_STEP } from "@/utils/sound-volume";

withDefaults(defineProps<{
  /** 200 for a file, 100 for text to speech. */
  max?: number;
}>(), {
  max: MAX_VOLUME,
});

const volume = defineModel<number>({ required: true });

const { t } = useI18n();

function percent(value: number): string {
  return `${value}%`;
}
</script>
