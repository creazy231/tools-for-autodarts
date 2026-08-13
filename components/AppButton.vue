<template>
  <button
    @click="handleClick"
    v-bind="_.omit($attrs, 'class')"
    :class="twMerge(
      'user-select-none position-relative white-space-nowrap vertical-align-middle line-height-1.2 transition-property-common transition-duration-normal group relative inline-flex appearance-none items-center justify-center border-none outline-offset-2 outline-transparent',
      'rounded-[var(--adt-radius-md)] font-[600]',

      // Default style
      type === 'default' && 'bg-[var(--adt-overlay)] text-[var(--adt-text)] enabled:hover:bg-[var(--adt-overlay-strong)] enabled:active:bg-[var(--adt-overlay-strong)]',

      // Success style
      type === 'success' && 'border border-solid border-[var(--adt-success-border)] bg-[var(--adt-success-surface)] text-[var(--adt-text)] enabled:hover:bg-[rgba(58,255,0,0.3)] enabled:active:bg-[rgba(58,255,0,0.3)]',

      // Danger style
      type === 'danger' && 'border border-solid border-[var(--adt-error-border)] bg-[var(--adt-error-surface)] text-[var(--adt-text)] enabled:hover:bg-[rgba(255,0,0,0.3)] enabled:active:bg-[rgba(255,0,0,0.3)]',

      // Warning style
      type === 'warning' && 'border border-solid border-amber-500/50 bg-amber-500/20 text-[var(--adt-text)] enabled:hover:bg-amber-500/30 enabled:active:bg-amber-500/30',

      // Default size (md)
      size === 'md' && 'h-[2.5rem] min-w-[2.5rem] pe-[1rem] ps-[1rem]',

      // Small size
      size === 'sm' && 'h-8 max-h-8 min-w-8 pe-[0.75rem] ps-[0.75rem] text-[14px]',

      // Extra small size
      size === 'xs' && 'h-6 max-h-6 min-w-6 pe-[0.5rem] ps-[0.5rem] text-[14px]',

      // Large sizes
      size === 'lg' && 'h-[3rem] min-w-[3rem] pe-[1.5rem] ps-[1.5rem]',
      size === 'xl' && 'h-[4rem] min-w-[4rem] pe-[2rem] ps-[2rem]',

      'transition-colors',
      !auto && 'w-full',
      (disabled && !loading) && 'cursor-not-allowed opacity-50',
      $attrs.class?.toString(),
    )"
    :disabled="disabled || loading"
  >
    <div class="relative w-full">
      <div
        :class="twMerge(
          'flex w-full items-center space-x-2',
          centered && 'justify-center',
          loading && 'opacity-0',
        )"
      >
        <div
          :class="twMerge(
            'relative flex w-full items-center justify-center truncate',
          )"
        >
          <slot />
        </div>
      </div>
      <div v-if="loading" class="absolute inset-0 flex items-center justify-center">
        <span class="icon-[pixelarticons--loader] animate-spin text-xl" />
      </div>
    </div>
  </button>
</template>

<script setup lang="ts">
import { twMerge } from "tailwind-merge";
import _ from "lodash";

const props = withDefaults(defineProps<{
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  loading?: boolean;
  disabled?: boolean;
  auto?: boolean;
  centered?: boolean;
  type?: "default" | "danger" | "success" | "warning";
}>(), {
  size: "md",
  centered: true,
  type: "default",
});

const emit = defineEmits([ "click" ]);

defineOptions({
  inheritAttrs: false,
});

function handleClick() {
  if (!props.disabled && !props.loading) {
    emit("click");
  }
}
</script>
