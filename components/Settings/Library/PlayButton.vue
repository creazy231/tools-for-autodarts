<template>
  <button
    :aria-label="playing ? `Stop ${label}` : `Play ${label}`"
    class="adt-play"
    :class="[{ 'is-playing': playing, 'is-lg': large }]"
    :disabled="disabled"
    :title="playing ? 'Stop' : title"
    type="button"
  >
    <span v-if="playing" class="icon-[material-symbols--stop-rounded]" />
    <span v-else class="icon-[material-symbols--play-arrow-rounded]" />
  </button>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  /** What plays, for screen readers. */
  label: string;
  title?: string;
  playing?: boolean;
  /** As tall as a text field, beside one. */
  large?: boolean;
  disabled?: boolean;
}>(), {
  title: "Play",
  playing: false,
  large: false,
  disabled: false,
});
</script>
