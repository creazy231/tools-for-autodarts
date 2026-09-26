<template>
  <div>
    <label v-if="label" :for="id" class="adt-field-label">{{ label }}</label>
    <textarea
      :id="id"
      ref="textareaRef"
      v-model="inputValue"
      :placeholder="placeholder"
      :rows="rows"
      :disabled="disabled"
      :style="maxRows ? { maxHeight: `${maxRows * 1.5}rem` } : {}"
      :class="twMerge(
        // Design system › Forms › TextField, over several lines.
        'adt-textarea transition-height',
        monospace && 'is-mono',
        autosize && 'resize-none',
        $attrs.class?.toString(),
      )"
    />
    <p v-if="helperText" class="adt-field-hint">
      {{ helperText }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { twMerge } from "tailwind-merge";
import { useTextareaAutosize } from "@vueuse/core";
import { computed, ref, watch } from "vue";

defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(defineProps<{
  modelValue: string;
  label?: string;
  placeholder?: string;
  helperText?: string;
  rows?: number;
  maxRows?: number;
  id?: string;
  monospace?: boolean;
  disabled?: boolean;
  autosize?: boolean;
}>(), {
  placeholder: "",
  rows: 4,
  id: `textarea-${Math.random().toString(36).substring(2, 9)}`,
  monospace: false,
  disabled: false,
  autosize: true,
});

const emit = defineEmits([ "update:modelValue" ]);
const textareaRef = ref<HTMLTextAreaElement | null>(null);

// Create a local input value that syncs with modelValue
const inputValue = ref(props.modelValue);

// Watch for changes to modelValue and update inputValue
watch(() => props.modelValue, (val) => {
  inputValue.value = val;
});

// Watch for changes to inputValue and emit update:modelValue
watch(inputValue, (val) => {
  emit("update:modelValue", val);
});

// Apply autosize if the prop is true
if (props.autosize) {
  // Create a computed ref that converts null to undefined for type compatibility
  const elementRef = computed(() => textareaRef.value || undefined);

  const { textarea } = useTextareaAutosize({
    element: elementRef,
    input: inputValue,
    styleProp: "minHeight",
    watch: [ () => props.rows, () => props.maxRows ], // Re-trigger resize when rows or maxRows change
    onResize: () => {
      // Optional callback when resize happens
    },
  });
}
</script>

<style scoped>
.transition-height {
  transition: height 0.1s ease;
}

textarea {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

textarea::-webkit-scrollbar {
  display: none;
}
</style>
