<template>
  <button
    @click="handleClick"
    v-bind="_.omit($attrs, 'class')"
    :type="htmlType"
    :class="twMerge(
      'relative flex w-full items-center rounded-md border px-4 py-1.5 transition-all ease-in-out',
      type === 'default' && 'enabled:hover:bg-primary-600 enabled:hover:border-primary-600 border-base bg-base text-white enabled:hover:text-white',
      type === 'primary' && 'enabled:hover:bg-primary-600 enabled:hover:border-primary-600 border-primary bg-primary text-black enabled:hover:text-white',
      size === 'sm' && 'px-3 py-1 text-sm',
      disabled && !loading && 'cursor-not-allowed opacity-50',
      auto && 'w-auto min-w-0',
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
        <Icon v-if="iconLeft" :icon="iconLeft" />
        <span>
          <slot />
        </span>
      </div>
      <div v-if="loading" class="absolute inset-0 flex items-center justify-center">
        <Icon
          icon="svg-spinners:90-ring-with-bg"
          :class="twMerge(
            size === 'xl' && 'text-4xl',
          )"
        />
      </div>
    </div>
  </button>
</template>

<script setup lang="ts">
import { twMerge } from "tailwind-merge";
import _ from "lodash";
import Icon from "@/components/App/Icon.vue";

defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(defineProps<{
  type?: "default" | "primary";
  htmlType?: "button" | "submit" | "reset";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  loading?: boolean;
  disabled?: boolean;
  auto?: boolean;
  borderless?: boolean;
  dashed?: boolean;
  transparent?: boolean;
  notRounded?: boolean;
  centered?: boolean;
  iconLeft?: string;
}>(), {
  type: "default",
  htmlType: "button",
  size: "md",
});
const emit = defineEmits([ "click" ]);

function handleClick() {
  if (!props.disabled && !props.loading) {
    emit("click");
  }
}
</script>
