<template>
  <!-- A number in a settings row: a dense field and its unit, as Animations lays out its seconds. -->
  <div class="flex items-center gap-2">
    <div :class="width">
      <AppInput
        @blur="commit"
        @keydown.enter="commit"
        @update:model-value="edit"
        :aria-label="spokenLabel"
        :disabled="disabled"
        :max="max"
        :min="min"
        :model-value="draft"
        :step="step"
        class="text-right"
        dense
        type="number"
      />
    </div>
    <span v-if="unit" class="text-sm" :class="[{ 'opacity-50': disabled }]">{{ unit }}</span>
  </div>
</template>

<script setup lang="ts">
import AppInput from "@/components/AppInput.vue";
import { onStep, snapNumber } from "@/utils/number-step";

/**
 * What is typed stays as typed while the field has focus, and only a number
 * inside the limits and on the step reaches the setting. A field that clamped
 * every keystroke turned the 1 of a 15 into the minimum before the 5 arrived.
 * Leaving the field, or Enter, puts an edited entry on the step and inside the
 * limits, or back to the setting when it is empty. A field that was only
 * focused leaves the setting alone, even one stored outside today's limits.
 */
const props = withDefaults(defineProps<{
  modelValue: number;
  min?: number;
  max?: number;
  step?: number;
  /** Shown after the field: "s", "min", "rem". */
  unit?: string;
  /** What the number is, for screen readers: the row's title. */
  label?: string;
  disabled?: boolean;
  /** Width of the field, as a literal Tailwind class. */
  width?: string;
}>(), {
  min: undefined,
  max: undefined,
  step: 1,
  unit: "",
  label: undefined,
  disabled: false,
  width: "w-24",
});

const emit = defineEmits<{ "update:modelValue": [ value: number ] }>();

/** Units a screen reader should say in full. */
const SPOKEN_UNITS: Record<string, string> = { s: "seconds", min: "minutes", ms: "milliseconds" };

const draft = ref(String(props.modelValue));
/** Typed into since the last commit: only then does leaving the field change anything. */
let edited = false;

const limits = computed(() => ({ min: props.min, max: props.max, step: props.step }));
const spokenLabel = computed(() => (props.label && props.unit ? `${props.label} in ${SPOKEN_UNITS[props.unit] ?? props.unit}` : props.label));

watch(() => props.modelValue, (value) => {
  if (Number(draft.value) !== value) draft.value = String(value);
});

function edit(text: string) {
  draft.value = text;
  edited = true;
  const value = Number(text);
  if (text.trim() !== "" && onStep(value, limits.value) && value !== props.modelValue) {
    emit("update:modelValue", value);
  }
}

function commit() {
  if (!edited) return;
  edited = false;
  const value = Number(draft.value);
  if (draft.value.trim() === "" || !Number.isFinite(value)) {
    draft.value = String(props.modelValue);
    return;
  }
  const snapped = snapNumber(value, limits.value);
  if (snapped !== props.modelValue) emit("update:modelValue", snapped);
  draft.value = String(snapped);
}
</script>
