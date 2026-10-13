<template>
  <div class="space-y-5">
    <div class="flex flex-col items-start gap-3">
      <PackPreview v-if="variant" :label="t('wled.packs.card.cover', { pack: name, size: label })" :preset="current.cover" :variant="variant" size="cover" />
      <h3 class="adt-section-title">
        <span>{{ name }}<span class="adt-section-count">&nbsp;·&nbsp;{{ t("wled.packs.card.count", { count: current.effects }) }}</span></span>
      </h3>
    </div>

    <!-- The address field, from the dialog. -->
    <slot />

    <div>
      <div class="flex flex-wrap items-center gap-3">
        <AppRadioGroup
          @update:model-value="emit('update:size', String($event))"
          v-if="pack.sizes.length > 1"
          :aria-label="t('wled.packs.card.size')"
          :model-value="current.size"
          :options="sizeOptions"
          button-size="sm"
        />
        <span v-else class="adt-chip">{{ label }}</span>
        <AppButton @click="emit('add')" :disabled="!canAdd || busy" auto class="ml-auto" size="sm">
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
    </div>

    <section class="border-t border-[var(--ad-border-subtle)] pt-4">
      <p class="mb-3 text-sm text-[var(--ad-text-secondary)]">
        {{ t("wled.packs.page.intro", { set }) }}
      </p>
      <AppSearchInput v-model="query" :placeholder="t('library.section.searchPlaceholder')" />
      <ul v-if="variant && shown.length" class="mt-3 border-t border-[var(--ad-border-subtle)]">
        <li v-for="effect in shown" :key="effect.name" class="flex items-center gap-3 border-b border-[var(--ad-border-subtle)] py-2">
          <span class="flex w-[7.5rem] shrink-0 sm:w-[12.5rem]">
            <PackPreview :label="effect.name" :preset="effect.preset" :variant="variant" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-semibold text-[var(--ad-text-primary)]">{{ effect.name }}</span>
            <TriggerChips :max="3" :query="query" :triggers="effect.triggers" :wrap="false" class="mt-1" />
            <span v-if="states[effect.name]" class="mt-1 block text-xs" :class="[states[effect.name].tone]" data-row-state>
              {{ states[effect.name].text }}
            </span>
          </span>
          <AppButton
            @click="emit('addOne', effect.name)"
            :aria-label="t('wled.packs.page.addOne', { name: effect.name })"
            :disabled="!canAdd || busy"
            :loading="rows[effect.name]?.phase === 'running'"
            :title="t('wled.packs.page.addOne', { name: effect.name })"
            auto
            class="shrink-0 px-0"
            size="sm"
          >
            <span aria-hidden="true" class="icon-[material-symbols--add-rounded] text-lg" />
          </AppButton>
        </li>
      </ul>
      <div v-else-if="variant" class="py-8 text-center">
        <p class="font-semibold text-[var(--ad-text-primary)]">
          {{ t("library.section.nothingMatches") }}
        </p>
        <p class="mt-1 text-sm text-[var(--ad-text-muted)]">
          {{ t("wled.packs.page.noMatch") }}
        </p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import AppButton from "../../AppButton.vue";
import AppRadioGroup from "../../AppRadioGroup.vue";
import AppSearchInput from "../../AppSearchInput.vue";
import TriggerChips from "../Library/TriggerChips.vue";

import PackPreview from "./PackPreview.vue";
import { installFailureText } from "./install-failure";

import type { LibraryEntry } from "@/utils/library-search";
import type { SingleState } from "@/utils/wled-pack-install";
import type { PackInfo, PackVariant } from "@/utils/wled-packs";

import { searchLibrary } from "@/utils/library-search";
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
  /** Whether an install runs: everything that would start one waits. */
  busy: boolean;
  /** The effect set single animations go into, by its name. */
  set: string;
  /** The names of the effects that set has. */
  present: ReadonlySet<string>;
  /** Each row's install in this size, by the animation's name. */
  rows: Record<string, SingleState>;
}>();

const emit = defineEmits<{ "update:size": [ size: string ]; "add": []; "addOne": [ name: string ] }>();

const { t, language } = useI18n();

const variant = shallowRef<PackVariant>();
const query = ref("");

const current = computed(() => props.pack.sizes.find(size => size.size === props.size) ?? props.pack.sizes[0]);
const name = computed(() => packText(props.pack.name, language.value));
const label = computed(() => sizeLabel(current.value));
/** While an install runs, another size would change the rows under it. */
const sizeOptions = computed(() => props.pack.sizes.map(size => ({ label: sizeLabel(size), value: size.size, disabled: props.busy && size.size !== current.value.size })));
/** Whether the size picked is the WLED's: said once a WLED has answered. Another size can still be added. */
const fit = computed(() => {
  if (!props.device) return undefined;
  const ok = props.device.width === current.value.width && props.device.height === current.value.height;
  return {
    ok,
    text: ok ? t("wled.packs.card.fits", { size: label.value }) : t("wled.packs.card.misfit", { size: label.value, device: sizeLabel(props.device) }),
  };
});
/** The animations the search leaves, best match first: by name or trigger, as the libraries search. */
const shown = computed(() => {
  const effects = variant.value?.effects ?? [];
  const entries: LibraryEntry[] = effects.map((effect, index) => ({ index, name: effect.name, triggers: effect.triggers, source: "", enabled: true }));
  return searchLibrary(entries, query.value).map(entry => effects[entry.index]);
});
/** What each row says: its install's state, else whether the set has its effect already. */
const states = computed(() => {
  const said: Record<string, { text: string; tone: string }> = {};
  for (const effect of variant.value?.effects ?? []) {
    const row = props.rows[effect.name];
    if (row?.phase === "running") said[effect.name] = { text: t("wled.packs.page.adding"), tone: "text-[var(--ad-text-muted)]" };
    else if (row?.phase === "failed") said[effect.name] = { text: installFailureText(row.failure, row.address), tone: "text-[var(--ad-text-destructive)]" };
    else if (row?.phase === "done") said[effect.name] = { text: t("wled.packs.page.added", { set: row.set }), tone: "text-[var(--ad-success)]" };
    else if (props.present.has(effect.name)) said[effect.name] = { text: t("wled.packs.page.present", { set: props.set }), tone: "text-[var(--ad-text-muted)]" };
  }
  return said;
});

watch(() => current.value.file, async (file) => {
  variant.value = undefined;
  const loaded = await loadPackVariant(file);
  if (file === current.value.file) variant.value = loaded;
}, { immediate: true });
</script>
