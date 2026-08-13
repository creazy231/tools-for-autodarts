<template>
  <div>
    <label v-if="label" :for="id" class="adt-field-label">{{ label }}</label>
    <input
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      :id="id"
      :value="modelValue"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      :class="twMerge(
        // Design system › Forms › TextField
        'adt-input placeholder:text-[var(--ad-text-muted)]',
        disabled && 'cursor-not-allowed',
        $attrs.class?.toString(),
      )"
    >
    <p v-if="helperText" class="adt-field-hint">
      {{ helperText }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { twMerge } from "tailwind-merge";

defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(defineProps<{
  modelValue: string;
  label?: string;
  placeholder?: string;
  helperText?: string;
  id?: string;
  type?: string;
  disabled?: boolean;
}>(), {
  placeholder: "",
  id: `input-${Math.random().toString(36).substring(2, 9)}`,
  type: "text",
  disabled: false,
});

defineEmits([ "update:modelValue" ]);
</script>
