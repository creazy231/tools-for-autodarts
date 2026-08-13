<template>
  <!--
    Design system › Forms › SegmentedControl — the same control as AppToggle,
    for an exclusive 2–3 way choice. The selected option carries the hot
    gradient; the track is navy-400.
  -->
  <div
    :class="[ 'adt-segment', sizeClass, { 'is-vertical': vertical }, className ]"
    role="group"
  >
    <button
      @click="!option.disabled && selectOption(option.value)"
      v-for="(option, index) in options"
      :key="index"
      :class="[ 'adt-segment-item', { 'is-active': modelValue === option.value } ]"
      :disabled="option.disabled"
      :aria-pressed="modelValue === option.value"
      type="button"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
interface RadioOption {
  label?: string;
  value: string | number | boolean;
  disabled?: boolean;
}

const props = withDefaults(defineProps<{
  modelValue: string | number | boolean;
  options: RadioOption[];
  name?: string;
  vertical?: boolean;
  buttonSize?: "sm" | "md" | "lg";
  className?: string;
}>(), {
  vertical: false,
  buttonSize: "md",
  className: "",
});

const emit = defineEmits([ "update:modelValue" ]);

/** md is the spec's 44px. */
const sizeClass = computed(() => (props.buttonSize === "md" ? "" : `is-${props.buttonSize}`));

function selectOption(value: string | number | boolean) {
  emit("update:modelValue", value);
}
</script>
