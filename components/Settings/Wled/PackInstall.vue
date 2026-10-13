<template>
  <div class="space-y-5">
    <div class="flex flex-col items-start gap-3">
      <PackPreview v-if="variant" :label="t('wled.packs.card.cover', { pack: name, size: label })" :preset="size.cover" :variant="variant" size="cover" />
      <h3 class="adt-section-title">
        <span>{{ name }}<span class="adt-section-count">&nbsp;·&nbsp;{{ label }}</span></span>
      </h3>
    </div>

    <template v-if="state.phase === 'confirm'">
      <p v-if="updating" class="text-sm text-[var(--ad-text-secondary)]">
        {{ t("wled.packs.install.summaryUpdate", { files: size.gifs, kb: kilobytes, presets: size.presets, address: host, effects: size.effects, set }) }}
      </p>
      <p v-else class="text-sm text-[var(--ad-text-secondary)]">
        {{ t("wled.packs.install.summary", { files: size.gifs, kb: kilobytes, presets: size.presets, address: host, effects: size.effects, set }) }}
      </p>
      <p class="text-sm text-[var(--ad-text-muted)]">
        {{ t("wled.packs.install.yours") }}
      </p>
      <AppAlert v-if="misfit" compact variant="warning">
        {{ misfit }}
      </AppAlert>
    </template>

    <div v-else-if="progress" aria-live="polite" class="space-y-3">
      <p class="text-sm text-[var(--ad-text-secondary)]">
        {{ stepText }}
      </p>
      <div :aria-label="stepText" :aria-valuemax="progress.total" :aria-valuenow="progress.done" aria-valuemin="0" class="h-2 overflow-hidden rounded-full bg-white/10" role="progressbar">
        <div class="h-full rounded-full bg-[var(--ad-action-primary)] transition-[width] duration-300" :style="{ width: `${Math.round((progress.done / progress.total) * 100)}%` }" />
      </div>
      <p class="text-sm text-[var(--ad-text-muted)]">
        {{ t("wled.packs.install.keepOpen") }}
      </p>
    </div>

    <AppAlert v-else-if="done" compact variant="success">
      {{ t("wled.packs.install.done", { pack: name, count: done.count, set: done.set }) }}
      {{ done.inUse ? t("wled.packs.install.plays") : t("wled.packs.install.waits", { set: done.playing }) }}
    </AppAlert>

    <AppAlert v-else-if="failureText" compact variant="error">
      {{ failureText }}
    </AppAlert>
  </div>
</template>

<script setup lang="ts">
import AppAlert from "../../AppAlert.vue";

import PackPreview from "./PackPreview.vue";

import type { InstallState } from "@/utils/wled-pack-install";
import type { PackInfo, PackSize, PackVariant } from "@/utils/wled-packs";

import { packText, sizeLabel } from "@/utils/wled-packs";

const props = defineProps<{
  pack: PackInfo;
  size: PackSize;
  variant?: PackVariant;
  /** The WLED's address, its origin: http://192.168.0.227. */
  address: string;
  /** Its matrix. */
  device: { width: number; height: number };
  /** The effect set's name: the new set's, or the one an update brings up to date. */
  set: string;
  updating: boolean;
  state: InstallState;
}>();

const { t, language } = useI18n();

const name = computed(() => packText(props.pack.name, language.value));
const label = computed(() => sizeLabel(props.size));
const host = computed(() => hostOf(props.address));
const kilobytes = computed(() => Math.ceil(props.size.bytes / 1000));
const misfit = computed(() => (props.device.width === props.size.width && props.device.height === props.size.height
  ? ""
  : t("wled.packs.card.misfit", { size: label.value, device: sizeLabel(props.device) })));
const progress = computed(() => (props.state.phase === "running" ? props.state.progress : undefined));
const done = computed(() => (props.state.phase === "done" ? props.state : undefined));
const stepText = computed(() => {
  const now = progress.value;
  if (!now) return "";
  if (now.step === "upload") return t("wled.packs.install.steps.upload", { done: now.done + 1, count: props.size.gifs });
  if (now.step === "save") return t("wled.packs.install.steps.save");
  if (now.step === "check") return t("wled.packs.install.steps.check");
  return t("wled.packs.install.steps.read");
});
const failureText = computed(() => {
  if (props.state.phase !== "failed") return "";
  const failure = props.state.failure;
  switch (failure.reason) {
    case "unreachable": return t("wled.packs.errors.unreachable", { address: host.value });
    case "not-wled": return t("wled.packs.errors.notWled", { address: host.value });
    case "not-matrix": return t("wled.packs.errors.notMatrix");
    case "effect-missing": return t("wled.packs.errors.effectMissing", { effect: failure.effect });
    case "presets-unreadable": return t("wled.packs.errors.presetsUnreadable");
    case "no-slots": return t("wled.packs.errors.noSlots", { needed: failure.needed, free: failure.free });
    case "no-room": return t("wled.packs.errors.noRoom", { needed: failure.neededKb, free: failure.freeKb, address: props.address });
    case "locked": return t("wled.packs.errors.locked");
    case "upload-failed": return t("wled.packs.errors.uploadFailed", { file: failure.file });
    case "restored": return t("wled.packs.errors.restored");
    case "not-restored": return t("wled.packs.errors.notRestored");
    case "pack-unreadable": return t("wled.packs.errors.packUnreadable");
  }
  return "";
});

function hostOf(address: string): string {
  try {
    return new URL(address).host;
  } catch {
    return address;
  }
}
</script>
