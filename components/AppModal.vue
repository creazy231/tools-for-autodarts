<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-if="show" class="fixed inset-0 z-[1400] flex items-center justify-center">
      <div
        @click="!disableBackdropClick && $emit('close')"
        v-if="!hideBackdrop"
        class="absolute inset-0 bg-[var(--adt-overlay)] backdrop-blur-[4px]"
      />
      <div
        :class="twMerge(
          'dialog-bg relative mx-4 scale-100 rounded-xl p-6 shadow-lg',

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
        <h3 v-if="title" class="mb-4 text-xl font-[600] text-[var(--adt-text)]">
          {{ title }}
        </h3>

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
.dialog-bg {
  background-color: rgba(25, 32, 71, 0.95);
  background-image:
    radial-gradient(50% 30% at 86% 0%, rgba(49, 51, 112, 0.89) 0%, rgba(64, 52, 134, 0) 100%),
    radial-gradient(50% 70% at 70% 22%, rgba(38, 89, 154, 0.9) 0%, rgba(64, 52, 134, 0) 100%),
    radial-gradient(50% 70% at 112% 44%, rgba(44, 67, 108, 0.85) 0%, rgba(64, 52, 134, 0) 100%),
    radial-gradient(90% 90% at -12% 89%, rgba(15, 47, 80, 0.88) 0%, rgba(64, 52, 134, 0) 100%),
    radial-gradient(50% 70% at -2% 53%, rgba(52, 32, 95, 0.89) 0%, rgba(64, 52, 134, 0) 100%),
    radial-gradient(50% 70% at 36% 22%, rgba(64, 52, 134, 0.83) 0%, rgba(64, 52, 134, 0) 100%),
    radial-gradient(50% 40% at 66% 59%, rgba(32, 111, 185, 0.87) 7%, rgba(32, 111, 185, 0) 100%);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  animation: dialog-enter 0.3s ease-out forwards;
}

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
