<template>
  <div class="relative w-full touch-none select-none pb-6 pt-5">
    <div
      @mousedown="handleTrackMouseDown"
      @touchstart="handleTrackTouchStart"
      ref="track"
      class="relative h-2 w-full rounded-full bg-[var(--chakra-colors-whiteAlpha-200)]"
    >
      <div
        class="absolute h-full rounded-full bg-[var(--chakra-colors-whiteAlpha-300)]"
        :style="{ width: `${percentage}%` }"
      />
      <div
        @keydown="handleKeyDown"
        @mousedown="handleThumbMouseDown"
        @touchstart="handleThumbTouchStart"
        ref="thumb"
        :aria-valuemin="min"
        :aria-valuemax="max"
        :aria-valuenow="modelValue"
        class="absolute top-[-6px] size-5 rounded-full border border-[var(--chakra-colors-whiteAlpha-900)] bg-[var(--chakra-colors-whiteAlpha-300)] !outline-none transition-colors focus:outline-none focus:ring-offset-0 disabled:pointer-events-none disabled:opacity-50"
        :style="{ left: `calc(${percentage}% - 10px)` }"
        tabindex="0"
        role="slider"
      />
    </div>
    <div
      v-if="showLabels"
      class="flex justify-between px-1 pt-1 text-xs text-[var(--chakra-colors-whiteAlpha-700)]"
    >
      <span>{{ formatLabel(min) }}</span>
      <span>{{ formatLabel(max) }}</span>
    </div>
    <div
      v-if="showValue"
      class="absolute bottom-0 left-[calc(50%-20px)] w-10 text-center text-xs text-[var(--chakra-colors-whiteAlpha-700)]"
    >
      {{ formatLabel(modelValue) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";

const props = withDefaults(defineProps<{
  modelValue: number;
  min?: number;
  max?: number;
  step?: number;
  showLabels?: boolean;
  showValue?: boolean;
  formatLabel?: (value: number) => string;
}>(), {
  min: 0,
  max: 100,
  step: 1,
  showLabels: false,
  showValue: true,
  formatLabel: (value: number) => value.toString(),
});

const emit = defineEmits([ "update:modelValue" ]);

const percentage = computed(() => {
  return ((props.modelValue - props.min) / (props.max - props.min)) * 100;
});

const track = ref<HTMLElement | null>(null);
const thumb = ref<HTMLElement | null>(null);
let isDragging = false;

function updateValue(clientX: number) {
  if (!track.value) return;

  const rect = track.value.getBoundingClientRect();
  const percentage = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
  const rawValue = (percentage / 100) * (props.max - props.min) + props.min;

  // Apply step and round to avoid floating point artifacts (e.g. 1.4000000000000001)
  const decimals = (props.step.toString().split(".")[1] || "").length;
  const steppedValue = Math.round(rawValue / props.step) * props.step;
  const clampedValue = Number(Math.min(props.max, Math.max(props.min, steppedValue)).toFixed(decimals));

  emit("update:modelValue", clampedValue);
}

function handleTrackMouseDown(e: MouseEvent) {
  updateValue(e.clientX);
  isDragging = true;
  document.addEventListener("mousemove", handleDocumentMouseMove);
  document.addEventListener("mouseup", handleDocumentMouseUp);
}

function handleTrackTouchStart(e: TouchEvent) {
  if (e.touches.length) {
    updateValue(e.touches[0].clientX);
    isDragging = true;
    document.addEventListener("touchmove", handleDocumentTouchMove);
    document.addEventListener("touchend", handleDocumentTouchEnd);
  }
}

function handleThumbMouseDown(e: MouseEvent) {
  e.preventDefault();
  isDragging = true;
  document.addEventListener("mousemove", handleDocumentMouseMove);
  document.addEventListener("mouseup", handleDocumentMouseUp);
}

function handleThumbTouchStart(e: TouchEvent) {
  e.preventDefault();
  isDragging = true;
  document.addEventListener("touchmove", handleDocumentTouchMove);
  document.addEventListener("touchend", handleDocumentTouchEnd);
}

function handleDocumentMouseMove(e: MouseEvent) {
  if (isDragging) {
    updateValue(e.clientX);
  }
}

function handleDocumentTouchMove(e: TouchEvent) {
  if (isDragging && e.touches.length) {
    updateValue(e.touches[0].clientX);
  }
}

function handleDocumentMouseUp() {
  isDragging = false;
  document.removeEventListener("mousemove", handleDocumentMouseMove);
  document.removeEventListener("mouseup", handleDocumentMouseUp);
}

function handleDocumentTouchEnd() {
  isDragging = false;
  document.removeEventListener("touchmove", handleDocumentTouchMove);
  document.removeEventListener("touchend", handleDocumentTouchEnd);
}

function handleKeyDown(e: KeyboardEvent) {
  const step = e.shiftKey ? props.step * 10 : props.step;

  switch (e.key) {
    case "ArrowRight":
    case "ArrowUp":
      e.preventDefault();
      emit("update:modelValue", Math.min(props.max, props.modelValue + step));
      break;
    case "ArrowLeft":
    case "ArrowDown":
      e.preventDefault();
      emit("update:modelValue", Math.max(props.min, props.modelValue - step));
      break;
    case "Home":
      e.preventDefault();
      emit("update:modelValue", props.min);
      break;
    case "End":
      e.preventDefault();
      emit("update:modelValue", props.max);
      break;
  }
}

onMounted(() => {
  if (thumb.value) {
    thumb.value.focus();
  }
});

onUnmounted(() => {
  handleDocumentMouseUp();
  handleDocumentTouchEnd();
});
</script>
