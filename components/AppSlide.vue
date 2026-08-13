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
  background-color: rgba(25, 32, 71, 0.8);
  background-image:
    radial-gradient(600px 324px at 1650px 0px, rgba(49, 51, 112, 0.89) 0%, rgba(64, 52, 134, 0) 100%),
    radial-gradient(960px 756px at 1344px 238px, rgba(38, 89, 154, 0.9) 0%, rgba(64, 52, 134, 0) 100%),
    radial-gradient(960px 756px at 2150px 475px, rgba(44, 67, 108, 0.85) 0%, rgba(64, 52, 134, 0) 100%),
    radial-gradient(1728px 972px at -230px 961px, rgba(15, 47, 80, 0.88) 0%, rgba(64, 52, 134, 0) 100%),
    radial-gradient(960px 756px at -38px 572px, rgba(52, 32, 95, 0.89) 0%, rgba(64, 52, 134, 0) 100%),
    radial-gradient(960px 756px at 691px 238px, rgba(64, 52, 134, 0.83) 0%, rgba(64, 52, 134, 0) 100%),
    radial-gradient(960px 432px at 1267px 637px, rgba(32, 111, 185, 0.87) 7%, rgba(32, 111, 185, 0) 100%);

  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
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
