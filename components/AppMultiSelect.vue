<template>
  <div ref="root" class="relative">
    <button
      @click="isOpen = !isOpen"
      class="w-full rounded-md border border-white/30 bg-black/50 px-3 py-2 text-left text-sm text-white hover:border-white/50 focus:outline-none"
    >
      <div class="flex items-center justify-between">
        <span v-if="modelValue.length === 0" class="text-white/50">Select options...</span>
        <span v-else>{{ selectedLabels.join(', ') }}</span>
        <span class="icon-[pixelarticons--chevron-down] text-xs" />
      </div>
    </button>

    <div
      v-if="isOpen"
      class="absolute top-full z-50 mt-1 w-full rounded-md border border-white/30 bg-black/80 shadow-lg"
    >
      <div class="max-h-48 overflow-y-auto p-2 space-y-1">
        <label
          class="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/10 cursor-pointer border-b border-white/20 pb-2"
        >
          <input
            type="checkbox"
            :checked="allSelected"
            :indeterminate="partiallySelected"
            @change="toggleAll"
            class="rounded"
          />
          <span class="text-sm font-medium text-white">All</span>
        </label>
        <label
          v-for="option in options"
          :key="option.value"
          class="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/10 cursor-pointer"
        >
          <input
            type="checkbox"
            :checked="modelValue.includes(option.value)"
            @change="toggleOption(option.value)"
            class="rounded"
          />
          <span class="text-sm text-white">{{ option.label }}</span>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T extends string | number">
interface Option<T> {
  value: T;
  label: string;
}

interface Props {
  modelValue: T[];
  options: Option<T>[];
}

const props = defineProps<Props>();
const emit = defineEmits<{
  "update:modelValue": [value: T[]];
}>();

const root = ref<HTMLElement>();
const isOpen = ref(false);

onClickOutside(root, () => { isOpen.value = false; });
onKeyStroke("Escape", () => { isOpen.value = false; });

const selectedLabels = computed(() => {
  return props.modelValue
    .map((val) => props.options.find((opt) => opt.value === val)?.label || val)
    .filter(Boolean);
});

const allSelected = computed(() => {
  return props.options.length > 0 && props.modelValue.length === props.options.length;
});

const partiallySelected = computed(() => {
  return props.modelValue.length > 0 && props.modelValue.length < props.options.length;
});

function toggleOption(value: T) {
  const newValue = props.modelValue.includes(value)
    ? props.modelValue.filter((v) => v !== value)
    : [...props.modelValue, value];
  emit("update:modelValue", newValue);
}

function toggleAll() {
  if (allSelected.value) {
    emit("update:modelValue", []);
  } else {
    emit("update:modelValue", props.options.map((opt) => opt.value));
  }
}
</script>
