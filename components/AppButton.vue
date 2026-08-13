<template>
  <button
    @click="handleClick"
    v-bind="_.omit($attrs, 'class')"
    :class="twMerge(
      // Design system › Core › Button
      'group relative inline-flex select-none appearance-none items-center justify-center whitespace-nowrap border-none leading-none outline-none',
      'font-[var(--ad-weight-semibold)] transition-[background-color,color,border-color,opacity,transform] duration-[var(--ad-duration-fast)]',
      'active:enabled:translate-y-px',

      // Variants — primary blue is the only accent; secondary is the chip fill.
      type === 'default' && 'bg-[var(--ad-action-secondary)] text-[var(--ad-text-primary)] enabled:hover:bg-[var(--ad-action-secondary-hover)]',
      type === 'primary' && 'bg-[var(--ad-action-primary)] font-[var(--ad-weight-bold)] text-[var(--ad-white)] enabled:hover:bg-[var(--ad-action-primary-hover)] enabled:active:bg-[var(--ad-action-primary-active)]',
      type === 'ghost' && 'bg-transparent text-[var(--ad-text-primary)] enabled:hover:bg-white/[.07]',
      type === 'success' && 'bg-[var(--ad-success)] font-[var(--ad-weight-bold)] text-[var(--ad-text-on-light)] enabled:hover:brightness-110',
      type === 'danger' && 'bg-[var(--ad-danger)] font-[var(--ad-weight-bold)] text-[var(--ad-white)] enabled:hover:brightness-110',
      type === 'warning' && 'bg-[var(--ad-warning)] font-[var(--ad-weight-bold)] text-[var(--ad-text-on-light)] enabled:hover:brightness-110',

      // Sizes — heights and radii straight from the Button spec.
      size === 'xs' && 'h-6 min-w-6 gap-1.5 rounded-[var(--ad-radius-sm)] px-2 text-[var(--ad-text-sm)]',
      size === 'sm' && 'h-8 min-w-8 gap-[7px] rounded-[var(--ad-radius-md)] px-[14px] text-[var(--ad-text-sm)]',
      size === 'md' && 'h-[42px] min-w-[42px] gap-[9px] rounded-[var(--ad-radius-lg)] px-[18px] text-[var(--ad-text-md)]',
      size === 'lg' && 'h-12 min-w-12 gap-2.5 rounded-[var(--ad-radius-lg)] px-[22px] text-[var(--ad-text-md)]',
      size === 'xl' && 'h-14 min-w-14 gap-2.5 rounded-[var(--ad-radius-lg)] px-8 text-[var(--ad-text-lg)]',

      !auto && 'w-full',
      // The system uses a single disabled treatment for every variant.
      (disabled && !loading) && 'cursor-not-allowed !bg-[var(--ad-action-disabled)] !text-[var(--ad-text-disabled)]',
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
  type?: "default" | "primary" | "ghost" | "danger" | "success" | "warning";
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
