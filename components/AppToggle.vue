<template>
  <!--
    Neutral track, as before. Colour is reserved for a single meaning: the
    feature is ON. "Off" being selected is the resting state, so it stays
    neutral — a gradient there would read as an alert.
  -->
  <div
    class="relative flex overflow-hidden rounded-md bg-[var(--adt-overlay)]"
    :class="{
      'h-6': props.size === 'xs',
      'h-8': props.size === 'sm',
      'h-10': props.size === 'md',
    }"
  >
    <button
      @click="setToOn"
      :class="twMerge(
        'flex h-full items-center justify-center transition-colors',
        props.size === 'xs' ? 'px-3 text-xs font-medium'
        : props.size === 'sm' ? 'px-4 text-sm font-semibold' : 'px-4 font-semibold',
        props.modelValue
          ? 'adt-toggle-on text-white'
          : 'text-[var(--adt-text)] enabled:hover:bg-[var(--adt-overlay)]',
      )"
      type="button"
      :aria-pressed="props.modelValue"
    >
      On
    </button>
    <button
      @click="setToOff"
      :class="twMerge(
        'flex h-full items-center justify-center text-[var(--adt-text)] transition-colors',
        props.size === 'xs' ? 'px-3 text-xs font-medium'
        : props.size === 'sm' ? 'px-4 text-sm font-semibold' : 'px-4 font-semibold',
        !props.modelValue
          ? 'bg-[var(--adt-overlay-strong)]'
          : 'enabled:hover:bg-[var(--adt-overlay)]',
      )"
      type="button"
      :aria-pressed="!props.modelValue"
    >
      Off
    </button>
  </div>
</template>

<script setup lang="ts">
import { twMerge } from "tailwind-merge";
// Define props with defaults
const props = withDefaults(defineProps<{
  modelValue: boolean;
  size?: "xs" | "sm" | "md";
}>(), {
  size: "md",
});

const emit = defineEmits([ "update:modelValue" ]);


function setToOn() {
  if (!props.modelValue) {
    emit("update:modelValue", true);
  }
}

function setToOff() {
  if (props.modelValue) {
    emit("update:modelValue", false);
  }
}
</script>
