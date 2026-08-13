<template>
  <Transition
    enter-active-class="transition ease-out duration-300"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition ease-in duration-200"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <!-- Backdrop -->
    <div
      @click="$emit('update:modelValue', false)"
      v-if="modelValue"
      class="fixed inset-0 z-40 bg-[var(--adt-overlay)] backdrop-blur-[4px]"
    />
  </Transition>

  <Transition
    enter-active-class="transition ease-out duration-300"
    enter-from-class="translate-x-full"
    enter-to-class="translate-x-0"
    leave-active-class="transition ease-in duration-200"
    leave-from-class="translate-x-0"
    leave-to-class="translate-x-full"
  >
    <!-- Slide panel -->
    <div
      v-if="modelValue"
      class="slide-dialog-bg fixed inset-y-0 right-0 z-50 min-w-80 shadow-lg"
    >
      <!-- Header -->
      <div class="border-b border-white/20 px-4 py-3">
        <div class="flex items-center justify-between">
          <slot v-if="$slots.title" name="title" />
          <h2 v-else-if="title" class="text-lg font-bold text-[var(--adt-text)]">
            {{ title }}
          </h2>
          <AppButton
            @click="$emit('update:modelValue', false)"
            class="-mr-3 -mt-3 rounded-lg bg-transparent p-0"
            auto
            size="sm"
          >
            <span class="icon-[pixelarticons--close] text-gray-400" />
          </AppButton>
        </div>
        <p
          v-if="description"
          class="mt-2 text-sm text-[var(--adt-text)]"
        >
          {{ description }}
        </p>
      </div>

      <!-- Content -->
      <div class="h-[calc(100%-3.3rem)] py-3">
        <slot />
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import AppButton from "@/components/AppButton.vue";

defineProps<{
  modelValue: boolean;
  title?: string;
  description?: string;
}>();

defineEmits<{
  "update:modelValue": [value: boolean];
}>();
</script>

<style>
.slide-dialog-bg {
  /* v2 drawer surface: flat fill with a 1px translucent edge, no gradients. */
  background-color: var(--adt-surface-raised);
  box-shadow: -1px 0 0 0 var(--adt-border);
  animation: slide-dialog-enter 0.3s ease-out forwards;
}

@keyframes slide-dialog-enter {
  from {
    opacity: 0;
    transform: translateX(100%) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}
</style>
