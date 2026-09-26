<template>
  <div>
    <label v-if="label" :for="id" class="adt-field-label">{{ label }}</label>
    <div class="relative">
      <select
        @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
        :id="id"
        :class="twMerge(
          // Design system › Forms › TextField, as a select.
          'adt-input adt-select',
          disabled && 'cursor-not-allowed',
          $attrs.class?.toString(),
        )"
        :disabled="disabled"
        :value="modelValue"
      >
        <option v-for="option in options" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
      <span class="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xl text-[var(--ad-text-muted)]">
        <span class="icon-[material-symbols--expand-more-rounded]" />
      </span>
    </div>
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
  options: { value: string; label: string }[];
  label?: string;
  helperText?: string;
  id?: string;
  disabled?: boolean;
}>(), {
  id: `select-${Math.random().toString(36).substring(2, 9)}`,
  disabled: false,
});

defineEmits([ "update:modelValue" ]);
</script>
