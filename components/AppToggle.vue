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
      On
    </button>
    <button
      @click="set(false)"
      :class="[ 'adt-segment-item', { 'is-resting': !props.modelValue } ]"
      :disabled="props.disabled"
      :aria-pressed="!props.modelValue"
      type="button"
    >
      Off
    </button>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: boolean;
  size?: "xs" | "sm" | "md";
  disabled?: boolean;
  className?: string;
}>(), {
  size: "md",
  disabled: false,
});

const emit = defineEmits([ "update:modelValue" ]);

/** md is the spec's 44px; the smaller sizes are for dense settings rows. */
const sizeClass = computed(() => (props.size === "md" ? "" : `is-${props.size}`));

function set(value: boolean) {
  if (props.disabled || props.modelValue === value) return;
  emit("update:modelValue", value);
}
</script>
