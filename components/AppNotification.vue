<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="transform translate-y-8 opacity-0"
    enter-to-class="transform translate-y-0 opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="transform translate-y-0 opacity-100"
    leave-to-class="transform translate-y-8 opacity-0"
  >
    <div v-if="show" class="fixed bottom-4 right-8 z-50 max-w-md rounded-md p-4 shadow-lg backdrop-blur-sm" :class="type === 'success' ? 'success-overlay' : 'error-overlay'">
      <div class="flex">
        <div class="mr-2 shrink-0">
          <span v-if="type === 'success'" class="icon-[pixelarticons--check] text-xl" />
          <span v-else class="icon-[pixelarticons--alert] text-xl" />
        </div>
        <div class="mr-4 grow">
          {{ message }}
        </div>
        <div class="shrink-0">
          <button @click="$emit('close')" class="text-xl opacity-70 hover:opacity-100">
            <span class="icon-[pixelarticons--close]" />
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String as () => "success" | "error",
    default: "success",
    validator: (value: string) => [ "success", "error" ].includes(value),
  },
  duration: {
    type: Number,
    default: 5000, // 5 seconds by default
  },
});

defineEmits([ "close" ]);
</script>

<style>
.success-overlay::after {
  content: '';
  position: absolute;
  inset: 0;
  background-color: rgba(22, 163, 74, 0.3);
  border-radius: 0.375rem;
  pointer-events: none;
}

.error-overlay::after {
  content: '';
  position: absolute;
  inset: 0;
  background-color: rgba(220, 38, 38, 0.3);
  border-radius: 0.375rem;
  pointer-events: none;
}
</style>
