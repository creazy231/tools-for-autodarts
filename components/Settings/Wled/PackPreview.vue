<template>
  <!-- A cover takes its column's width; a row's or a tile's preview sits in its cell beside the name. -->
  <span ref="frame" class="min-w-0" :class="[size === 'cover' ? 'flex w-full' : 'inline-flex shrink-0']">
    <canvas v-if="preview" ref="canvas" :aria-label="label" class="block shrink-0 rounded-[3px]" role="img" :title="size === 'row' ? label : undefined" />
    <!-- Until it is drawn, the dark panel at the picture's size: nothing moves when it comes. -->
    <span v-else ref="pending" :aria-label="label" class="block shrink-0 rounded-[3px] bg-[rgb(10_10_12)]" role="img" :style="{ width: `${placeholder.width}px`, height: `${placeholder.height}px` }" />
  </span>
</template>

<script setup lang="ts">
import type { PackVariant } from "@/utils/wled-packs";
import type { Preview } from "@/utils/wled-preview";

import { DIALOG_BOX, ROW_BOX, TILE_BOX, ledGeometry } from "@/utils/led-canvas";
import { packPreview } from "@/utils/wled-pack-catalog";

const props = withDefaults(defineProps<{
  variant: PackVariant;
  /** The variant's own number for the preset. */
  preset: number;
  size?: "row" | "tile" | "cover";
  /** Its accessible name: the animation's, or the pack's for a cover. */
  label: string;
}>(), {
  size: "row",
});

const frame = ref<HTMLElement>();
const canvas = ref<HTMLCanvasElement>();
const pending = ref<HTMLElement>();
const preview = shallowRef<Preview>();
/** Read and decoded once the list stops at it (composables/useSeenAtRest.ts), as a long list's previews are many. */
const seen = useSeenAtRest(pending);
const { width: frameWidth } = useElementSize(frame);
// A row's or a tile's: the cell it sits in.
const { width: cellWidth } = useElementSize(computed(() => (props.size === "cover" ? undefined : frame.value?.parentElement ?? undefined)));
let run = 0;

/** What the preview may take: a cover its column, a row or a tile its cell, never more than the box of its kind. */
const box = computed(() => {
  const area = props.size === "cover" ? DIALOG_BOX : props.size === "tile" ? TILE_BOX : ROW_BOX;
  const width = Math.floor(props.size === "cover" ? frameWidth.value : cellWidth.value) || area.width;
  return { width: Math.min(area.width, width), height: area.height };
});
const placeholder = computed(() => ledGeometry({ width: props.variant.width, height: props.variant.height }, box.value));

watch([ () => props.variant, () => props.preset, seen ], async () => {
  const mine = ++run;
  preview.value = undefined;
  if (!seen.value) return;
  const drawn = await packPreview(props.variant, props.preset);
  if (mine === run) preview.value = drawn?.preview;
}, { immediate: true });

useLedCanvas(canvas, preview, box);

onBeforeUnmount(() => {
  run++;
});
</script>
