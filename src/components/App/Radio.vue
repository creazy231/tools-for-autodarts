<template>
  <div
    :class="twMerge(
      'w-full',
      disabled && 'cursor-not-allowed opacity-50',
    )"
  >
    <RadioGroup
      @update:model-value="value => emit('update:modelValue', value)"
      :model-value="modelValue"
    >
      <RadioGroupLabel
        v-if="label"
      >
        <div
          :class="twMerge(
            'text-black-400 mb-1 text-lg',
          )"
        >
          {{ label }}
        </div>
      </RadioGroupLabel>
      <div class="flex justify-between overflow-hidden rounded-md bg-base">
        <RadioGroupOption
          v-for="option in options"
          :key="option.value"
          v-slot="{ checked }"
          :value="option"
          :style="{
            width: `calc(100% / ${options.length})`,
          }"
        >
          <div
            :class="twMerge(
              'cursor-pointer px-5 py-1.5 text-center',
              checked && 'bg-primary cursor-default',
            )"
          >
            <span class="flex flex-col items-center">
              <span v-if="option.icon" class="my-3 p-3">
                <Icon :icon="option.icon" class="text-3xl" />
              </span>
              {{ option.name }}
            </span>
          </div>
        </RadioGroupOption>
      </div>
    </RadioGroup>
  </div>
</template>

<script setup lang="ts">
import {
  RadioGroup,
  RadioGroupLabel,
  RadioGroupOption,
} from "@headlessui/vue";
import { twMerge } from "tailwind-merge";

interface Option {
  name: string;
  value: string | boolean;
  icon?: string;
}

withDefaults(defineProps<{
  modelValue?: Option;
  label?: string;
  disabled?: boolean;
  options: Option[];
}>(), {
  label: "",
  disabled: false,
});

const emit = defineEmits([ "update:modelValue" ]);
</script>
