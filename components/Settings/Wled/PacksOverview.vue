<template>
  <!-- The WLED panel's first section: the packs, edged in the site's brand gradient, a tile each that opens its page. -->
  <section class="adt-packs-overview relative mb-8 rounded-[var(--ad-radius-lg)] p-4 sm:p-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <!-- One run of text, as the other headings, so a wrapped heading keeps its count after its last word. -->
      <h3 class="adt-section-title">
        <span>{{ t("wled.packs.section.title") }}<span v-if="index" class="adt-section-count">&nbsp;·&nbsp;{{ index.packs.length }}</span></span>
      </h3>
      <AppButton @click="emit('open')" auto size="sm" type="primary">
        <span class="flex items-center gap-1">
          <span aria-hidden="true" class="icon-[material-symbols--library-add-outline-rounded] text-lg" />
          {{ t("wled.packs.section.browse") }}
        </span>
      </AppButton>
    </div>
    <p class="mt-1 max-w-3xl text-sm text-[var(--ad-text-secondary)]">
      {{ t("wled.packs.section.intro") }}
    </p>
    <ul v-if="index?.packs.length" class="mt-4 grid gap-3 sm:grid-cols-2">
      <li v-for="pack in index.packs" :key="pack.id" class="min-w-0">
        <PackTile @open="emit('open', pack.id)" :pack="pack" />
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import AppButton from "../../AppButton.vue";

import PackTile from "./PackTile.vue";

import type { PackIndex } from "@/utils/wled-packs";

import { loadPackIndex } from "@/utils/wled-pack-catalog";

const emit = defineEmits<{ open: [ pack?: string ] }>();

const { t } = useI18n();

const index = shallowRef<PackIndex>();

onMounted(async () => {
  index.value = await loadPackIndex();
});
</script>

<style scoped>
/*
 * The brand gradient as a 1px edge, round a faint wash of its colours. A gradient can't be a border's colour, so it is
 * the bottom layer, seen only under the transparent border; the panel's card colour covers it inside.
 */
.adt-packs-overview {
  background:
    linear-gradient(118deg, color-mix(in srgb, var(--ad-cyan-500) 9%, transparent), color-mix(in srgb, var(--ad-green-400) 5%, transparent)) padding-box,
    linear-gradient(var(--ad-surface-card), var(--ad-surface-card)) padding-box,
    var(--ad-gradient-brand) border-box;
  border: 1px solid transparent;
}
</style>
