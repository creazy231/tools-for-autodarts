<template>
  <!--
    One colour scheme: autodarts' own, a preset, or two colours of your own.

    The two pickers are FankiDarts' Playerbox control: they always show the
    colours the scheme draws, and editing either makes it custom, starting
    from those colours, so a preset is the start of a pair of your own rather
    than a dead end.
  -->
  <div
    :aria-label="label"
    class="flex flex-wrap gap-2"
    role="group"
  >
    <button
      @click="pick(option)"
      v-for="option in options"
      :key="option.id"
      :aria-pressed="modelValue.preset === option.id"
      :title="option.label"
      class="flex w-16 flex-col items-center gap-1.5 rounded-[var(--ad-radius-sm)] p-1 text-[length:var(--ad-text-xs)] transition-colors focus-visible:shadow-[var(--ad-focus-ring)] focus-visible:outline-none"
      :class="modelValue.preset === option.id ? 'font-semibold text-white' : 'text-white/60 hover:text-white'"
      type="button"
    >
      <span
        :style="swatch(option)"
        class="block h-9 w-full rounded-[var(--ad-radius-sm)]"
        :class="modelValue.preset === option.id ? 'ring-2 ring-white' : 'ring-1 ring-inset ring-white/15'"
      />
      <span class="w-full truncate text-center">{{ option.label }}</span>
    </button>

    <div
      class="flex flex-col items-center gap-1.5 p-1 text-[length:var(--ad-text-xs)]"
      :class="custom ? 'font-semibold text-white' : 'text-white/60'"
    >
      <span
        class="flex h-9 items-center gap-1 rounded-[var(--ad-radius-sm)] bg-[var(--ad-surface-sunken)] px-1"
        :class="custom ? 'ring-2 ring-white' : 'ring-1 ring-inset ring-white/15'"
      >
        <input
          @input="edit('from', $event)"
          :value="modelValue.from"
          :aria-label="`${label}: top left colour`"
          class="adt-color-input h-7 w-8"
          title="Top left"
          type="color"
        >
        <input
          @input="edit('to', $event)"
          :value="modelValue.to"
          :aria-label="`${label}: bottom right colour`"
          class="adt-color-input h-7 w-8"
          title="Bottom right"
          type="color"
        >
      </span>
      <span>Custom</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ColorPreset } from "@/utils/colors";
import type { ColorScheme } from "@/utils/storage";

import { gradient, pageLayers } from "@/utils/colors";

const props = defineProps<{
  modelValue: ColorScheme;
  presets: readonly ColorPreset[];
  /** autodarts' own pair, offered first. */
  site: { from: string; to: string };
  /** What the group is called to a screen reader. */
  label: string;
  /**
   * autodarts' page texture, for the page's swatches: dark pairs are hard to
   * tell apart as bare gradients, and the mark, tinted as the page will be,
   * carries each one's hue.
   */
  texture?: string;
}>();

const emit = defineEmits<{ "update:modelValue": [ value: ColorScheme ] }>();

const options = computed<ColorPreset[]>(() => [ { id: "default", label: "Default", ...props.site }, ...props.presets ]);
const custom = computed(() => props.modelValue.preset === "custom");

function swatch(option: ColorPreset) {
  if (!props.texture) return { backgroundImage: gradient(option) };
  return {
    backgroundColor: option.from,
    backgroundImage: pageLayers({ preset: option.id, from: option.from, to: option.to }, props.texture),
    backgroundPosition: "0 100%",
    backgroundRepeat: "no-repeat",
    backgroundSize: "contain",
  };
}

function pick(option: ColorPreset) {
  emit("update:modelValue", { preset: option.id, from: option.from, to: option.to });
}

function edit(end: "from" | "to", event: Event) {
  emit("update:modelValue", { ...props.modelValue, preset: "custom", [end]: (event.target as HTMLInputElement).value });
}
</script>
