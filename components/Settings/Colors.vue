<template>
  <template v-if="!$attrs['data-feature-index']">
    <!-- Settings Panel -->
    <!--
      Visible overflow, or the preview could not stick: a container that clips
      is a scroll container of its own, and the sticky preview would stick to
      it rather than to the dialog that actually scrolls.
    -->
    <div
      v-if="config"
      class="adt-container !overflow-visible"
    >
      <div class="relative z-10 text-[var(--ad-text-secondary)]">
        <p class="mb-6 max-w-3xl">
          {{ t("colors.intro") }}
        </p>

        <!-- Side by side where there is room, the preview above the controls where there is not. -->
        <div class="lg:grid lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-start lg:gap-8">
          <!--
            Kept in view while the colours are picked, on a backdrop the
            controls scroll under: the dialog's own colour, as the panel is
            transparent and unpadded inside it. A pixel above the top edge,
            since the edge falls between pixels and a sliver of what scrolled
            under would show.
          -->
          <div class="sticky -top-px z-20 bg-[var(--ad-surface-overlay)] pb-4 pt-px lg:bg-transparent lg:p-0">
            <ColorsPreview
              :board="board"
              :colors="config.colors"
              :texture="texture"
              class="mx-auto max-w-md lg:max-w-none"
            />
          </div>

          <div class="space-y-8 pt-2 lg:pt-0">
            <section>
              <h3 class="adt-section-title">
                {{ t("colors.sections.playerCard.title") }}
              </h3>
              <p class="mb-4 mt-2 text-sm text-[var(--ad-text-muted)]">
                {{ t("colors.sections.playerCard.description") }}
              </p>
              <SchemePicker
                v-model="config.colors.card"
                :label="t('colors.sections.playerCard.title')"
                :presets="CARD_PRESETS"
                :site="SITE_CARD"
              />
            </section>

            <section>
              <h3 class="adt-section-title">
                {{ t("colors.sections.background.title") }}
              </h3>
              <p class="mb-4 mt-2 text-sm text-[var(--ad-text-muted)]">
                {{ t("colors.sections.background.description") }}
              </p>
              <SchemePicker
                v-model="config.colors.page"
                :label="t('colors.sections.background.title')"
                :presets="PAGE_PRESETS"
                :site="SITE_PAGE"
                :texture="texture"
              />
              <div class="mt-2">
                <OptionRow
                  :description="t('colors.everywhere.description')"
                  :title="t('colors.everywhere.title')"
                >
                  <AppToggle v-model="config.colors.everywhere" :aria-label="t('colors.everywhere.title')" size="sm" />
                </OptionRow>
              </div>
            </section>

            <section>
              <h3 class="adt-section-title">
                {{ t("colors.sections.moreColours") }}
              </h3>
              <OptionRow v-for="flat in FLAT" :key="flat.key" :title="flat.label">
                <template #description>
                  {{ flat.hint }}. {{ state(flat) }}
                </template>
                <div class="flex items-center gap-1">
                  <button
                    @click="config.colors[flat.key] = ''"
                    v-if="config.colors[flat.key]"
                    :aria-label="resetTitle(flat)"
                    :title="resetTitle(flat)"
                    class="adt-icon-btn"
                    type="button"
                  >
                    <span class="icon-[material-symbols--restart-alt-rounded]" />
                  </button>
                  <input
                    @input="setFlat(flat.key, $event)"
                    :value="shown(flat.key)"
                    :aria-label="flat.label"
                    class="adt-color-input size-9 shrink-0"
                    type="color"
                  >
                </div>
              </OptionRow>
            </section>
          </div>
        </div>
      </div>
    </div>
  </template>

  <template v-else>
    <!-- Feature Card -->
    <div
      v-if="config"
      class="adt-container adt-interactive h-full min-h-56"
    >
      <div class="relative z-10 flex h-full flex-col justify-between">
        <div>
          <h3 class="adt-card-title mb-1 flex items-center">
            {{ t("features.colors") }}
            <span class="icon-[material-symbols--settings-alert-outline-rounded] ml-2 size-5" />
          </h3>
          <p class="w-2/3 text-white/70">
            {{ t("colors.card") }}
          </p>
        </div>
        <div class="flex">
          <div @click="$emit('toggle', 'colors')" class="absolute inset-y-0 left-12 right-0 cursor-pointer" />
          <AppToggle
            @update:model-value="toggleFeature"
            v-model="config.colors.enabled"
          />
        </div>
      </div>
      <div class="gradient-mask-left absolute inset-y-0 right-0 w-2/3">
        <img :src="imageUrl" :alt="t('features.colors')" class="size-full object-cover opacity-70">
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import AppToggle from "../AppToggle.vue";

import ColorsPreview from "./Colors/ColorsPreview.vue";
import SchemePicker from "./Colors/SchemePicker.vue";
import OptionRow from "./Library/OptionRow.vue";

import { boardSkin } from "@/utils/board-skins";
import { CARD_PRESETS, PAGE_PRESETS, SITE_ACTION_BAR, SITE_CARD, SITE_CARDS, SITE_PAGE, SITE_TEXT, barPalette } from "@/utils/colors";
import { siteTexture } from "@/utils/page-background";

const emit = defineEmits([ "toggle" ]);

const { t } = useI18n();
const { config } = useConfig();
const imageUrl = browser.runtime.getURL("/images/colors.png");

/** autodarts' page texture, read once: the site's stylesheet does not change under a page. */
const texture = ref<string>();

/** The flat colours, each "" while it is autodarts' own. */
const FLAT = computed(() => [
  { key: "cards", label: t("colors.flat.cards.title"), hint: t("colors.flat.cards.hint"), site: SITE_CARDS },
  { key: "text", label: t("colors.flat.text.title"), hint: t("colors.flat.text.hint"), site: SITE_TEXT },
  { key: "actionBar", label: t("colors.flat.actionBar.title"), hint: t("colors.flat.actionBar.hint"), site: SITE_ACTION_BAR },
] as const);
type Flat = typeof FLAT.value[number];

/** The board in the preview is the one the match would draw: the Board Skins skin, when that is on. */
const board = computed(() => boardSkin(config.value?.boardSkins?.enabled ? config.value.boardSkins.skin : "default").preview);

onMounted(() => {
  texture.value = siteTexture();
});

/**
 * The colour a flat picker shows. The bottom bar follows the background until
 * a colour of its own is picked, so it shows the one the match screen draws.
 */
function shown(key: Flat["key"]): string {
  const colors = config.value!.colors;
  if (key === "actionBar" && !colors.actionBar) return barPalette(colors)?.bar ?? SITE_ACTION_BAR;
  return colors[key] || FLAT.value.find(flat => flat.key === key)!.site;
}

/** What a flat colour is while none is picked: autodarts' own, or for the bottom bar the background's. Nothing once one is. */
function state(flat: Flat): string {
  const colors = config.value!.colors;
  if (colors[flat.key]) return "";
  if (flat.key === "actionBar" && barPalette(colors)) return t("colors.state.followsBackground");
  return t("colors.state.siteOwn");
}

function resetTitle(flat: Flat): string {
  const following = flat.key === "actionBar" && config.value!.colors.page.preset !== "default";
  return following
    ? t("colors.reset.followBackground", { label: flat.label })
    : t("colors.reset.siteOwn", { label: flat.label });
}

function setFlat(key: Flat["key"], event: Event) {
  if (!config.value) return;
  config.value.colors[key] = (event.target as HTMLInputElement).value;
}

async function toggleFeature() {
  if (!config.value) return;

  // Toggle the feature
  const wasEnabled = config.value.colors.enabled;
  config.value.colors.enabled = !wasEnabled;

  // If we're enabling the feature, open settings
  if (!wasEnabled) {
    await nextTick();
    emit("toggle", "colors");
  }
}
</script>
