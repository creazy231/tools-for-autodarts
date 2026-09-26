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
          Recolours the match screen: the card of the player whose turn it is, the page behind it, and the
          colours around them. Everything starts at autodarts' own, so nothing changes until you pick something.
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
                Player card
              </h3>
              <p class="mb-4 mt-2 text-sm text-[var(--ad-text-muted)]">
                The card of the player whose turn it is, in every layout. A bust and a won leg keep autodarts' own
                colours, and so does the winner's pattern.
              </p>
              <SchemePicker
                v-model="config.colors.card"
                :presets="CARD_PRESETS"
                :site="SITE_CARD"
                label="Player card"
              />
            </section>

            <section>
              <h3 class="adt-section-title">
                Background
              </h3>
              <p class="mb-4 mt-2 text-sm text-[var(--ad-text-muted)]">
                The page behind the match, and the bottom bar and its buttons with it. autodarts' mark stays on the
                page, tinted to go with the colours you pick.
              </p>
              <SchemePicker
                v-model="config.colors.page"
                :presets="PAGE_PRESETS"
                :site="SITE_PAGE"
                :texture="texture"
                label="Background"
              />
              <div class="mt-2">
                <OptionRow
                  description="Puts the background on the lobby, the home page and the settings as well, not only on the match screen."
                  title="On every autodarts page"
                >
                  <AppToggle v-model="config.colors.everywhere" aria-label="On every autodarts page" size="sm" />
                </OptionRow>
              </div>
            </section>

            <section>
              <h3 class="adt-section-title">
                More colours
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
      class="adt-container adt-interactive h-56"
    >
      <div class="relative z-10 flex h-full flex-col justify-between">
        <div>
          <h3 class="adt-card-title mb-1 flex items-center">
            Colors
            <span class="icon-[material-symbols--settings-alert-outline-rounded] ml-2 size-5" />
          </h3>
          <p class="w-2/3 text-white/70">
            Recolour the active player's card, the page behind the match and more, in colour pairs or your own.
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
        <img :src="imageUrl" alt="Colors" class="size-full object-cover opacity-70">
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

/** The flat colours, each "" while it is autodarts' own. */
const FLAT = [
  { key: "cards", label: "Other cards", hint: "Every card but the active one, and the throw bar", site: SITE_CARDS },
  { key: "text", label: "Text", hint: "On the cards and in the throw bar", site: SITE_TEXT },
  { key: "actionBar", label: "Bottom bar", hint: "The bar that holds undo and Next, and its buttons with it", site: SITE_ACTION_BAR },
] as const;

const { config } = useConfig();
const imageUrl = browser.runtime.getURL("/images/colors.png");

/** autodarts' page texture, read once: the site's stylesheet does not change under a page. */
const texture = ref<string>();

/** The board in the preview is the one the match would draw: the Board Skins skin, when that is on. */
const board = computed(() => boardSkin(config.value?.boardSkins?.enabled ? config.value.boardSkins.skin : "default").preview);

onMounted(() => {
  texture.value = siteTexture();
});

/**
 * The colour a flat picker shows. The bottom bar follows the background until
 * a colour of its own is picked, so it shows the one the match screen draws.
 */
function shown(key: typeof FLAT[number]["key"]): string {
  const colors = config.value!.colors;
  if (key === "actionBar" && !colors.actionBar) return barPalette(colors)?.bar ?? SITE_ACTION_BAR;
  return colors[key] || FLAT.find(flat => flat.key === key)!.site;
}

/** What a flat colour is while none is picked: autodarts' own, or for the bottom bar the background's. */
function state(flat: typeof FLAT[number]): string {
  const colors = config.value!.colors;
  if (colors[flat.key]) return "";
  if (flat.key === "actionBar" && barPalette(colors)) return "Follows the background until you pick one.";
  return "autodarts' own until you pick one.";
}

function resetTitle(flat: typeof FLAT[number]): string {
  const following = flat.key === "actionBar" && config.value!.colors.page.preset !== "default";
  return following ? `${flat.label}: follow the background again` : `${flat.label}: back to autodarts' own`;
}

function setFlat(key: typeof FLAT[number]["key"], event: Event) {
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
