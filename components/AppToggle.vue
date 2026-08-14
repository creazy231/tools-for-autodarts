<template>
  <!--
    Design system › Forms › SegmentedControl — the toggler shown in the Overlay
    card ("Referee: Off / Enabled"), not Forms/Switch. Navy-400 track, 44px
    items, the selected one filled.

    Colour marks one thing only: the feature is ON. A selected "Off" is the
    resting state, so it takes the neutral fill (.is-resting) rather than the
    hot gradient — a gradient there read as an alert.

    Styling lives in assets/tailwind.css so track, fills and sizes stay in one
    place.
  -->
  <div
    :class="[ 'adt-segment', sizeClass, className ]"
    role="group"
  >
    <button
      @click="set(true)"
      :class="[ 'adt-segment-item', { 'is-active': props.modelValue } ]"
      :disabled="props.disabled"
      :aria-pressed="props.modelValue"
      type="button"
    >
      {{ props.onLabel }}
    </button>
    <button
      @click="set(false)"
      :class="[ 'adt-segment-item', { 'is-resting': !props.modelValue } ]"
      :disabled="props.disabled"
      :aria-pressed="!props.modelValue"
      type="button"
    >
      {{ props.offLabel }}
    </button>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  disabled?: boolean;
  className?: string;
  /**
   * Segment labels. On a settings card the surrounding heading says what is
   * being switched, so plain On/Off is enough; a control injected into the
   * autodarts page has no such heading and names itself instead.
   */
  onLabel?: string;
  offLabel?: string;
}>(), {
  size: "md",
  disabled: false,
  onLabel: "On",
  offLabel: "Off",
});

const emit = defineEmits([ "update:modelValue" ]);

/** md is the spec's 44px; the other sizes are for dense rows and page inserts. */
const sizeClass = computed(() => (props.size === "md" ? "" : `is-${props.size}`));

function set(value: boolean) {
  if (props.disabled || props.modelValue === value) return;
  emit("update:modelValue", value);
}
</script>
