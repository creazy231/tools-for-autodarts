<template>
  <div
    :class="twMerge(
      'relative flex overflow-hidden rounded-md bg-[var(--adt-overlay)]',
      vertical ? 'flex-col' : 'flex-row',
      className,
    )"
  >
    <button
      @click="!option.disabled && selectOption(option.value)"
      v-for="(option, index) in options"
      :key="index"
      :disabled="option.disabled"
      :class="twMerge(
        'flex h-10 items-center justify-center whitespace-nowrap px-4 font-semibold text-[var(--adt-text)] transition-colors',
        buttonSize === 'sm' ? 'h-8 px-3 text-sm' : buttonSize === 'lg' ? 'h-12 px-5' : 'h-10 px-4',
        modelValue === option.value
          ? 'bg-[var(--adt-overlay-strong)]'
          : 'enabled:hover:bg-[var(--adt-overlay)]',
        option.disabled ? 'cursor-not-allowed opacity-50' : '',
      )"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { twMerge } from "tailwind-merge";

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

function selectOption(value: string | number | boolean) {
  emit("update:modelValue", value);
}
</script>
