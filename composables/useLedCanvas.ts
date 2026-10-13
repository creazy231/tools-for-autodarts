import type { Ref } from "vue";
import type { Preview } from "@/utils/wled-preview";

import { tryOnScopeDispose, useIntersectionObserver, useMediaQuery } from "@vueuse/core";
import { ref, watch } from "vue";

import { type LedPainter, everyFrame, ledGeometry, ledPainter } from "@/utils/led-canvas";

/**
 * Draws `preview` onto `canvas` as LEDs (utils/led-canvas.ts), at the biggest
 * size that fits `box`, and plays it while the canvas is on screen: one shared
 * animation-frame loop draws only the previews in view, and only when a frame
 * changes. With prefers-reduced-motion, or while `still`, the first frame stands.
 * WLED's previews of a device's presets (PresetPreview.vue) and of a pack's
 * (PackPreview.vue) both draw through it.
 */
export function useLedCanvas(canvas: Ref<HTMLCanvasElement | undefined>, preview: Ref<Preview | undefined>, box: Ref<{ width: number; height: number }>, still: Ref<boolean> = ref(false)): void {
  const visible = ref(false);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  let painter: LedPainter | undefined;
  let stop: (() => void) | undefined;
  let startedAt = 0;
  let shown = "";

  useIntersectionObserver(canvas, ([ entry ]) => {
    visible.value = entry?.isIntersecting ?? false;
  });

  // By the box's size: a measurement that says what was already read draws nothing again.
  watch([ canvas, preview, () => box.value.width, () => box.value.height ], () => {
    painter = undefined;
    if (!preview.value || !canvas.value) return;
    painter = ledPainter(canvas.value, ledGeometry(preview.value.layout, box.value));
    startedAt = performance.now();
    shown = "";
    draw(startedAt);
  }, { flush: "post" });

  watch([ visible, reducedMotion, still, preview ], () => {
    stop?.();
    stop = undefined;
    if (preview.value?.animated && visible.value && !reducedMotion.value && !still.value) stop = everyFrame(draw);
  });

  tryOnScopeDispose(() => stop?.());

  /** The frame for `now`, when it differs from the one showing. */
  function draw(now: number) {
    const current = preview.value;
    if (!current || !painter) return;
    const t = reducedMotion.value || still.value ? 0 : now - startedAt;
    const key = current.keyAt(t);
    if (key === shown) return;
    shown = key;
    painter.paint(current.pixelsAt(t));
  }
}

