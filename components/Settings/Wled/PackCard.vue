<template>
  <article class="rounded-[var(--ad-radius-lg)] border border-[var(--ad-border-subtle)] bg-white/[0.03] p-4 sm:p-5">
    <div class="mb-4 flex">
      <PackPreview v-if="variant" :label="t('wled.packs.card.cover', { pack: name, size: label })" :preset="current.cover" :variant="variant" size="cover" />
    </div>

    <h3 class="adt-section-title">
      <span>{{ name }}<span class="adt-section-count">&nbsp;·&nbsp;{{ t("wled.packs.card.count", { count: current.effects }) }}</span></span>
    </h3>
    <p class="mt-2 max-w-3xl text-sm text-[var(--ad-text-secondary)]">
      {{ description }}
    </p>

    <div class="mt-4 flex flex-wrap items-center gap-3">
      <AppRadioGroup
        @update:model-value="emit('update:size', String($event))"
        v-if="pack.sizes.length > 1"
        :aria-label="t('wled.packs.card.size')"
        :model-value="current.size"
        :options="sizeOptions"
        button-size="sm"
      />
      <span v-else class="adt-chip">{{ label }}</span>
      <AppButton @click="emit('open')" auto class="ml-auto" size="sm">
        <span class="flex items-center gap-1">
          {{ t("wled.packs.card.open") }}
          <span aria-hidden="true" class="icon-[material-symbols--chevron-right-rounded] -mr-1 text-lg" />
        </span>
      </AppButton>
      <AppButton @click="emit('add')" :disabled="!canAdd" auto size="sm">
        <span class="flex items-center gap-1">
          <span aria-hidden="true" class="text-lg" :class="[added ? 'icon-[material-symbols--refresh-rounded]' : 'icon-[material-symbols--add-rounded]']" />
          {{ added ? t("wled.packs.card.update") : t("wled.packs.card.add") }}
        </span>
      </AppButton>
    </div>

    <p v-if="fit" class="mt-3 flex items-center gap-1.5 text-sm" :class="[fit.ok ? 'text-[var(--ad-text-muted)]' : 'text-[var(--ad-warning)]']">
      <span aria-hidden="true" class="shrink-0" :class="[fit.ok ? 'icon-[material-symbols--check-circle-outline-rounded]' : 'icon-[material-symbols--warning-outline-rounded]']" />
      {{ fit.text }}
    </p>
    <p v-if="added" class="mt-1 text-sm text-[var(--ad-text-muted)]">
      {{ t("wled.packs.card.added", { set: added.name }) }}<template v-if="added.outdated">
        · {{ t("wled.packs.card.newer") }}
      </template>
    </p>
  </article>
</template>

<script setup lang="ts">
import AppButton from "../../AppButton.vue";
import AppRadioGroup from "../../AppRadioGroup.vue";

import PackPreview from "./PackPreview.vue";

import type { PackInfo, PackVariant } from "@/utils/wled-packs";

import { loadPackVariant } from "@/utils/wled-pack-catalog";
import { packText, sizeLabel } from "@/utils/wled-packs";

const props = defineProps<{
  pack: PackInfo;
  /** The size picked, by its key: "64x8". */
  size: string;
  /** The matrix of the WLED that answered, once one has. */
  device?: { width: number; height: number };
  /** The effect set this pack in this size was added as, if it was, and whether the catalog has a newer version. */
  added?: { name: string; outdated: boolean };
  canAdd: boolean;
}>();

const emit = defineEmits<{ "update:size": [ size: string ]; "add": []; "open": [] }>();

const { t, language } = useI18n();

const variant = shallowRef<PackVariant>();

const current = computed(() => props.pack.sizes.find(size => size.size === props.size) ?? props.pack.sizes[0]);
const name = computed(() => packText(props.pack.name, language.value));
const description = computed(() => packText(props.pack.description, language.value));
const label = computed(() => sizeLabel(current.value));
const sizeOptions = computed(() => props.pack.sizes.map(size => ({ label: sizeLabel(size), value: size.size })));
/** Whether the size picked is the WLED's: said once a WLED has answered. Another size can still be added. */
const fit = computed(() => {
  if (!props.device) return undefined;
  const ok = props.device.width === current.value.width && props.device.height === current.value.height;
  return {
    ok,
    text: ok ? t("wled.packs.card.fits", { size: label.value }) : t("wled.packs.card.misfit", { size: label.value, device: sizeLabel(props.device) }),
  };
});

watch(() => current.value.file, async (file) => {
  variant.value = undefined;
  const loaded = await loadPackVariant(file);
  if (file === current.value.file) variant.value = loaded;
}, { immediate: true });
</script>
