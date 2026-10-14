<template>
  <!--
    The cover is the pack's widest size, moving, beside its name and count where the tile is wide, above them where
    it isn't. The button is named by the pack's name and count, so the cover is left out of it.
  -->
  <button
    @click="emit('open')"
    class="group flex w-full min-w-0 flex-col gap-2 rounded-[var(--ad-radius-md)] border border-[var(--ad-border-subtle)] bg-black/30 p-2.5 text-left outline-none transition-colors hover:border-white/25 hover:bg-white/[0.05] focus-visible:shadow-[var(--ad-focus-ring)] lg:flex-row lg:items-center lg:gap-3"
    type="button"
  >
    <span aria-hidden="true" class="flex w-full justify-center lg:w-[55%] lg:max-w-[16.25rem] lg:shrink-0 lg:justify-start">
      <PackPreview v-if="variant" :label="name" :preset="shown.cover" :variant="variant" size="tile" />
    </span>
    <span class="flex min-w-0 flex-1 items-baseline justify-between gap-3 lg:block">
      <span class="block truncate font-semibold text-[var(--ad-text-primary)]">{{ name }}</span>
      <span class="block shrink-0 truncate text-sm text-[var(--ad-text-muted)]">{{ t("wled.packs.card.count", { count: shown.effects }) }}</span>
    </span>
    <span aria-hidden="true" class="icon-[material-symbols--chevron-right-rounded] hidden shrink-0 text-xl text-[var(--ad-text-muted)] transition-colors group-hover:text-[var(--ad-text-primary)] lg:block" />
  </button>
</template>

<script setup lang="ts">
import PackPreview from "./PackPreview.vue";

import type { PackInfo, PackVariant } from "@/utils/wled-packs";

import { loadPackVariant } from "@/utils/wled-pack-catalog";
import { packText } from "@/utils/wled-packs";

const props = defineProps<{ pack: PackInfo }>();

const emit = defineEmits<{ open: [] }>();

const { t, language } = useI18n();

const variant = shallowRef<PackVariant>();

/** The size the tile shows: the widest, the first of those. */
const shown = computed(() => props.pack.sizes.reduce((widest, size) => (size.width > widest.width ? size : widest)));
const name = computed(() => packText(props.pack.name, language.value));

watch(() => shown.value.file, async (file) => {
  const loaded = await loadPackVariant(file);
  if (file === shown.value.file) variant.value = loaded;
}, { immediate: true });
</script>
