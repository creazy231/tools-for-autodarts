<template>
  <div class="tabs-container w-full overflow-y-auto pt-3">
    <div class="flex w-full flex-row items-center gap-1">
      <button
        @click="updateActiveTab(index)"
        v-for="(tab, index) in tabs"
        :key="index"
        :class="twMerge(
          'flex-1 whitespace-nowrap rounded-md border-b-2 border-transparent bg-[var(--adt-overlay)] px-6 py-4 text-center font-semibold transition-colors duration-200',
          activeTab === index
            ? 'active-tab border-blue-400 bg-[var(--adt-overlay-strong)] text-white'
            : 'inactive-tab text-white/70 hover:bg-[var(--adt-overlay-strong)]',
        )"
      >
        {{ tab }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { twMerge } from "tailwind-merge";

const props = defineProps<{
  tabs: string[];
  modelValue: number;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: number): void;
}>();

const activeTab = computed(() => props.modelValue);

function updateActiveTab(index: number) {
  emit("update:modelValue", index);
}
</script>

<style scoped>
/* Tabs styling */
/* Overlay values come from assets/tailwind.css; nothing local to declare. */

.tabs-container .active-tab {
  border-color: var(--adt-accent);
  color: var(--adt-text, #FFFFFF);
  position: relative;
}

.tabs-container .inactive-tab {
  color: rgba(255, 255, 255, 0.7);
  transition: background-color 200ms;
}
</style>
