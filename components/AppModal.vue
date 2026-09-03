<template>
  <Transition
    enter-active-class="transition duration-100 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition duration-100 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div v-if="show" class="fixed inset-0 z-[1400] flex items-center justify-center">
      <div
        @click="!disableBackdropClick && $emit('close')"
        v-if="!hideBackdrop"
        class="adt-modal-backdrop"
      />
      <!--
        Sizes are `adt-modal-*` classes, not Tailwind `max-w-*` utilities: this
        file's stylesheet declares `.adt-modal` after `@tailwind utilities`, so
        a utility here loses the cascade and the size prop did nothing at all.
      -->
      <div
        :class="twMerge(
          'adt-modal relative mx-4',

          // Size variants. `md` is the base width, so it carries no modifier.
          size === 'xs' && 'adt-modal-xs',
          size === 'sm' && 'adt-modal-sm',
          size === 'lg' && 'adt-modal-lg',
          size === 'xl' && 'adt-modal-xl',
        )"
      >
        <button
          @click="$emit('close')"
          v-if="!hideCloseButton && ghostClose"
          class="adt-modal-close"
          type="button"
          aria-label="Close"
        >
          <span class="icon-[pixelarticons--close] text-lg" />
        </button>
        <AppButton
          @click="$emit('close')"
          v-else-if="!hideCloseButton"
          class="absolute right-3 top-3"
          size="xs"
          auto
        >
          <span class="icon-[pixelarticons--close]" />
        </AppButton>
        <h2 v-if="title" class="adt-modal-title mb-4">
          {{ title }}
        </h2>

        <!--
          `.adt-modal` is `max-height: 85vh; overflow: hidden`, so without a
          scroller here a form taller than that was simply cut off — footer
          buttons included.
        -->
        <div class="adt-modal-body mb-6">
          <slot />
        </div>

        <div class="flex justify-end gap-3">
          <slot name="footer">
            <AppButton @click="$emit('close')">
              Cancel
            </AppButton>
          </slot>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { twMerge } from "tailwind-merge";
import AppButton from "@/components/AppButton.vue";

defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: "",
  },
  size: {
    type: String,
    default: "md",
    validator: (value: string) => [ "xs", "sm", "md", "lg", "xl" ].includes(value),
  },
  hideBackdrop: {
    type: Boolean,
    default: false,
  },
  disableBackdropClick: {
    type: Boolean,
    default: false,
  },
  hideCloseButton: {
    type: Boolean,
    default: false,
  },
  /**
   * Close with the design system's ghost icon button — the one `SettingsModal`
   * uses — instead of this component's chip-filled `AppButton`.
   *
   * Opt-in rather than the default only because every other dialog built on
   * this component already shows the filled one, and swapping them all is a
   * change to make deliberately rather than in passing.
   */
  ghostClose: {
    type: Boolean,
    default: false,
  },
});

defineEmits([ "close" ]);
</script>

<style>
@keyframes dialog-enter {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
