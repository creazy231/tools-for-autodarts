<template>
  <button
    :aria-label="playing ? t('library.stopNamed', { name: label }) : t('library.playNamed', { name: label })"
    class="adt-play"
    :class="[{ 'is-playing': playing, 'is-lg': large }]"
    :disabled="disabled"
    :title="playing ? t('library.stop') : shownTitle"
    type="button"
  >
    <span v-if="playing" class="icon-[material-symbols--stop-rounded]" />
    <span v-else class="icon-[material-symbols--play-arrow-rounded]" />
  </button>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  /**
   * What plays, for screen readers: a name, or a phrase such as "this sound".
   * It is the object of "Play …" and "Stop …", so a language that needs a case
   * for it gets the phrase in that case.
   */
  label: string;
  /** The tooltip while it is not playing. Left out, it says "Play" in the current language. */
  title?: string;
  playing?: boolean;
  /** As tall as a text field, beside one. */
  large?: boolean;
  disabled?: boolean;
}>(), {
  title: undefined,
  playing: false,
  large: false,
  disabled: false,
});

const { t } = useI18n();

const shownTitle = computed(() => props.title ?? t("library.play"));
</script>
