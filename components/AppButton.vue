<template>
  <button
    @click="handleClick"
    v-bind="_.omit($attrs, 'class')"
    :class="twMerge(
      'group relative flex w-full items-center rounded-md px-5 py-1 outline-none transition-all ease-in-out bg-white/15 font-bold text-white enabled:hover:bg-white/20',
      (disabled && !loading) && 'cursor-not-allowed opacity-50',
      (type === 'danger') && 'bg-red-300 enabled:hover:bg-red-400 text-gray-900',
      (type === 'success') && 'bg-green-300 enabled:hover:bg-green-400 text-gray-900',
      auto && 'w-auto',
      $attrs.class?.toString(),
    )"
    :disabled="disabled || loading"
  >
    <div class="relative w-full">
      <div
        :class="twMerge(
          'flex w-full items-center space-x-2',
          centered && 'justify-center',
          loading && 'opacity-0',
        )"
      >
        <div
          :class="twMerge(
            'relative w-full truncate',
          )"
        >
          <slot />
        </div>
      </div>
      <div v-if="loading" class="absolute inset-0 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="currentColor" d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z" opacity=".25" /><path fill="currentColor" d="M10.14,1.16a11,11,0,0,0-9,8.92A1.59,1.59,0,0,0,2.46,12,1.52,1.52,0,0,0,4.11,10.7a8,8,0,0,1,6.66-6.61A1.42,1.42,0,0,0,12,2.69h0A1.57,1.57,0,0,0,10.14,1.16Z"><animateTransform attributeName="transform" dur="0.75s" repeatCount="indefinite" type="rotate" values="0 12 12;360 12 12" /></path></svg>
      </div>
    </div>
  </button>
</template>

<script setup lang="ts">
import { twMerge } from "tailwind-merge";
import _ from "lodash";

defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(defineProps<{
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  loading?: boolean;
  disabled?: boolean;
  auto?: boolean;
  centered?: boolean;
  type?: "default" | "danger" | "success";
}>(), {
  size: "md",
  centered: true,
  type: "default",
});

const emit = defineEmits([ "click" ]);

function handleClick() {
  if (!props.disabled && !props.loading) {
    emit("click");
  }
}
</script>
