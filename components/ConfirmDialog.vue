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
        @click="$emit('cancel')"
        class="adt-modal-backdrop"
      />
      <div class="adt-modal relative max-w-md">
        <AppButton
          @click="$emit('cancel')"
          class="absolute right-3 top-3"
          size="xs"
          auto
        >
          <span class="icon-[pixelarticons--close]" />
        </AppButton>
        <h2 class="adt-modal-title mb-4">
          {{ title }}
        </h2>
        <p class="mb-6 text-[var(--adt-text)]">
          {{ message }}
        </p>
        <div class="flex justify-end gap-3">
          <AppButton
            @click="$emit('cancel')"
          >
            {{ cancelText }}
          </AppButton>
          <AppButton
            @click="$emit('confirm')"
            type="success"
          >
            {{ confirmText }}
          </AppButton>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import AppButton from "@/components/AppButton.vue";

defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  confirmText: {
    type: String,
    default: "Confirm",
  },
  cancelText: {
    type: String,
    default: "Cancel",
  },
});

defineEmits([ "confirm", "cancel" ]);
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
