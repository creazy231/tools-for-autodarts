<template>
  <div>
    <select
      v-model="value"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value); value = ($event.target as HTMLInputElement).value;"
      :class="twMerge(
        'w-full rounded-md border border-white/20',
        'bg-white/10 px-3 py-2 text-white placeholder:text-white/50',
        'focus:border-white/40 focus:outline-none',
        $attrs.class?.toString(),
      )">
      <option v-for="option in options" :key="option.value" :value="option.value"
        class="adt-popover">
        {{ option.label }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { twMerge } from "tailwind-merge";

const props = withDefaults(defineProps<{
  options: [{ value: string, label: string }];
  modelValue: string;
  size?: "xs" | "sm" | "md";
}>(), {
  size: "md",
});

const value = ref(props.modelValue);
</script>
