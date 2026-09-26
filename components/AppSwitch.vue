<template>
  <!--
    Forms/Switch as the site draws it in its own lists (data-slot="switch",
    size sm). For one item's on/off inside a list. A feature or a setting
    keeps AppToggle, the segmented control the product chose for those.
  -->
  <button
    @click="toggle"
    :aria-checked="modelValue"
    :aria-label="label"
    class="adt-switch"
    :class="[{ 'is-on': modelValue }]"
    :disabled="disabled"
    :title="label"
    role="switch"
    type="button"
  >
    <span class="adt-switch-thumb" />
  </button>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: boolean;
  /** What is being switched, for screen readers and the tooltip. */
  label?: string;
  disabled?: boolean;
}>(), {
  label: undefined,
  disabled: false,
});

const emit = defineEmits<{ "update:modelValue": [ value: boolean ] }>();

function toggle() {
  if (!props.disabled) emit("update:modelValue", !props.modelValue);
}
</script>
