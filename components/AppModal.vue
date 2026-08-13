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
      <div
        :class="twMerge(
          'adt-modal relative mx-4',

          // Size variants
          size === 'xs' && 'w-full max-w-xs',
          size === 'sm' && 'w-full max-w-md',
          size === 'md' && 'w-full max-w-lg',
          size === 'lg' && 'w-full max-w-2xl',
          size === 'xl' && 'w-full max-w-4xl',
        )"
      >
        <AppButton
          @click="$emit('close')"
          v-if="!hideCloseButton"
          class="absolute right-3 top-3"
          size="xs"
          auto
        >
          <span class="icon-[pixelarticons--close]" />
        </AppButton>
        <h2 v-if="title" class="adt-modal-title mb-4">
          {{ title }}
        </h2>

        <div class="mb-6">
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
