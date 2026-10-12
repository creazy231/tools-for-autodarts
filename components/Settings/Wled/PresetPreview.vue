<template>
  <!-- Phrasing content only: in a row it sits in the line under the name, a <p>. -->
  <!-- In the dialog it takes the line's width, which the preview is drawn to fit. -->
  <span v-if="state.status === 'ready'" ref="frame" class="min-w-0" :class="[variant === 'dialog' ? 'flex w-full flex-col items-start gap-2' : 'inline-flex shrink-0 items-center']">
    <canvas ref="canvas" :aria-label="label" class="block shrink-0 rounded-[3px]" role="img" :title="variant === 'row' ? label : undefined" />
    <span v-if="variant === 'dialog'" class="text-sm text-[var(--ad-text-secondary)]">
      {{ state.name ? t("wled.preview.name", { name: state.name, preset: state.target.preset }) : t("wled.preview.unnamed", { preset: state.target.preset }) }}
    </span>
  </span>
  <!-- While it loads: a spinner the size of the icon a row shows when its device doesn't answer. -->
  <!-- Still until the list stops at it, as nothing is read for it until then. -->
  <span v-else-if="state.status === 'loading' && variant === 'row'" ref="pending" :aria-label="message" class="icon-[material-symbols--progress-activity] shrink-0 text-sm" :class="[{ 'motion-safe:animate-spin': seen }]" role="img" :title="message" />
  <template v-else-if="variant === 'row'">
    <span v-if="state.status === 'unreachable'" :aria-label="t('wled.preview.unreachableShort', { address: host })" class="icon-[material-symbols--wifi-off-rounded] shrink-0 text-sm" role="img" :title="t('wled.preview.unreachableShort', { address: host })" />
    <span v-else-if="state.status === 'missing'" class="min-w-0 truncate text-[var(--ad-warning)]" :title="message">{{ message }}</span>
    <span v-else-if="state.status === 'effects' && state.effects.length" class="min-w-0 truncate" :title="state.effects.join(', ')">{{ state.effects.join(", ") }}</span>
  </template>
  <span v-else-if="state.status !== 'none'" ref="pending" class="flex items-center gap-1.5 text-sm" :class="[state.status === 'missing' ? 'text-[var(--ad-warning)]' : 'text-[var(--ad-text-muted)]']">
    <span v-if="state.status === 'loading'" aria-hidden="true" class="icon-[material-symbols--progress-activity] shrink-0" :class="[{ 'motion-safe:animate-spin': seen }]" />
    {{ message }}
  </span>
</template>

<script setup lang="ts">
import type { PresetRef } from "@/utils/wled-preview";

import { DIALOG_BOX, type LedPainter, ROW_BOX, everyFrame, ledGeometry, ledPainter } from "@/utils/led-canvas";
import { type PreviewState, wledDevices } from "@/utils/wled-device";

const props = withDefaults(defineProps<{
  target?: PresetRef;
  variant?: "row" | "dialog";
  /** Stands still on its first frame: an effect switched off. */
  still?: boolean;
}>(), {
  target: undefined,
  variant: "row",
  still: false,
});

const { t } = useI18n();

/** CSS pixels a row keeps beside its preview for the type's icon and the gap. */
const ROW_ICON_ROOM = 24;

const state = shallowRef<PreviewState | { status: "none" }>({ status: "none" });
const canvas = ref<HTMLCanvasElement>();
const frame = ref<HTMLElement>();
/** What shows while it loads: where it is tells when the list has stopped at it. */
const pending = ref<HTMLElement>();
const visible = ref(false);
/**
 * Whether the list has stopped at this preview (composables/useSeenAtRest.ts):
 * until then nothing is read for it, so a long list on an older tablet reads
 * and decodes only what is looked at.
 */
const seen = useSeenAtRest(pending);
const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
const { width: frameWidth } = useElementSize(frame);
// A row's: the line under the name it sits in, which the grid sizes.
const { width: lineWidth } = useElementSize(computed(() => (props.variant === "row" ? frame.value?.parentElement ?? undefined : undefined)));

/**
 * What the preview may take: its box, or less on a narrow screen, where a row
 * keeps room for the type's icon. Until a width's first measurement arrives,
 * the width it has now: a first picture at the whole box would overflow a
 * phone's line, and be drawn again a moment later.
 */
const box = computed(() => {
  if (props.variant === "dialog") {
    const width = Math.floor(frameWidth.value) || widthNow(frame.value) || DIALOG_BOX.width;
    return { width: Math.min(DIALOG_BOX.width, width), height: DIALOG_BOX.height };
  }
  const room = (Math.floor(lineWidth.value) || widthNow(frame.value?.parentElement)) - ROW_ICON_ROOM;
  return { width: room > 0 ? Math.min(ROW_BOX.width, room) : ROW_BOX.width, height: ROW_BOX.height };
});
const host = computed(() => (props.target ? new URL(props.target.address).host : ""));
const label = computed(() => (props.target ? t("wled.preview.alt", { preset: props.target.preset, address: host.value }) : ""));
/** What the preview says instead of a picture: also the loading spinner's name. */
const message = computed(() => {
  const now = state.value;
  if (now.status === "loading") return t("wled.preview.loading");
  if (now.status === "unreachable") return t("wled.preview.unreachable", { address: host.value });
  if (now.status === "missing") return t("wled.preview.missing", { preset: now.target.preset });
  if (now.status === "effects") return now.effects.length ? t("wled.preview.effects", { effects: now.effects.join(", ") }) : t("wled.preview.ownEffect");
  if (now.status === "empty") return t("wled.preview.empty", { preset: now.target.preset });
  return "";
});

let painter: LedPainter | undefined;
let stop: (() => void) | undefined;
let startedAt = 0;
let shown = "";
let run = 0;

useIntersectionObserver(canvas, ([ entry ]) => {
  visible.value = entry?.isIntersecting ?? false;
});

watch([ () => (props.target ? `${props.target.address}#${props.target.preset}` : ""), seen ], async () => {
  const target = props.target;
  const mine = ++run;
  if (!target) {
    state.value = { status: "none" };
    return;
  }
  state.value = { status: "loading", target };
  if (!seen.value) return;
  const loaded = await wledDevices.loadPreview(target);
  if (mine === run) state.value = loaded;
}, { immediate: true });

// By the box's size: a measurement that says what was already read draws nothing again.
watch([ canvas, state, () => box.value.width, () => box.value.height ], () => {
  const now = state.value;
  painter = undefined;
  if (now.status !== "ready" || !canvas.value) return;
  const layout = now.preview.layout;
  painter = ledPainter(canvas.value, ledGeometry(layout, box.value));
  startedAt = performance.now();
  shown = "";
  draw(startedAt);
}, { flush: "post" });

watch([ visible, reducedMotion, () => props.still, state ], () => {
  stop?.();
  stop = undefined;
  const now = state.value;
  if (now.status === "ready" && now.preview.animated && visible.value && !reducedMotion.value && !props.still) stop = everyFrame(draw);
});

onBeforeUnmount(() => {
  stop?.();
  run++;
});

/** An element's width as useElementSize will measure it, rounded down: 0 for none. */
function widthNow(element?: HTMLElement | null): number {
  return element ? Math.floor(element.getBoundingClientRect().width) : 0;
}

/** The frame for `now`, when it differs from the one showing. */
function draw(now: number) {
  const current = state.value;
  if (current.status !== "ready" || !painter) return;
  const t = reducedMotion.value || props.still ? 0 : now - startedAt;
  const key = current.preview.keyAt(t);
  if (key === shown) return;
  shown = key;
  painter.paint(current.preview.pixelsAt(t));
}
</script>
