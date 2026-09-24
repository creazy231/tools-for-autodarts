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
      <div class="relative z-10 text-white/70">
        <p class="mb-6">
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

          <div class="space-y-6 pt-2 lg:pt-0">
            <section>
              <h4 class="mb-1 font-semibold text-white">
                Player card
              </h4>
              <p class="mb-3 text-sm text-white/60">
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
              <h4 class="mb-1 font-semibold text-white">
                Background
              </h4>
              <p class="mb-3 text-sm text-white/60">
                The page behind the match. autodarts' mark stays on it, tinted to go with the colours you pick.
              </p>
              <SchemePicker
                v-model="config.colors.page"
                :presets="PAGE_PRESETS"
                :site="SITE_PAGE"
                :texture="texture"
                label="Background"
              />
              <div class="mt-4 grid grid-cols-[auto_1fr] items-center gap-4">
                <AppToggle v-model="config.colors.everywhere" />
                <p>On every autodarts page, not only in matches</p>
              </div>
            </section>

            <section>
              <h4 class="mb-3 font-semibold text-white">
                More colours
              </h4>
              <div class="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <div
                  v-for="flat in FLAT"
                  :key="flat.key"
                  class="flex items-center gap-3 rounded-[var(--ad-radius-md)] bg-[var(--ad-surface-sunken)] p-3"
                >
                  <input
                    @input="setFlat(flat.key, $event)"
                    :value="config.colors[flat.key] || flat.site"
                    :aria-label="flat.label"
                    class="adt-color-input size-9 shrink-0"
                    type="color"
                  >
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-semibold text-white">
                      {{ flat.label }}
                    </p>
                    <p class="text-xs text-white/60">
                      {{ config.colors[flat.key] ? flat.hint : "autodarts' own" }}
                    </p>
                  </div>
                  <AppButton
                    @click="config.colors[flat.key] = ''"
                    v-if="config.colors[flat.key]"
                    :title="`${flat.label}: back to autodarts' own`"
                    auto
                    class="aspect-square size-8 shrink-0 p-0"
                    type="ghost"
                  >
                    <span class="icon-[pixelarticons--reload]" />
                  </AppButton>
                </div>
              </div>
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
import AppButton from "../AppButton.vue";
import AppToggle from "../AppToggle.vue";

import ColorsPreview from "./Colors/ColorsPreview.vue";
import SchemePicker from "./Colors/SchemePicker.vue";

import { boardSkin } from "@/utils/board-skins";
import { CARD_PRESETS, PAGE_PRESETS, SITE_ACTION_BAR, SITE_CARD, SITE_CARDS, SITE_PAGE, SITE_TEXT } from "@/utils/colors";
import { siteTexture } from "@/utils/page-background";

const emit = defineEmits([ "toggle" ]);

/** The flat colours, each "" while it is autodarts' own. */
const FLAT = [
  { key: "cards", label: "Other cards", hint: "Every card but the active one, and the throw bar", site: SITE_CARDS },
  { key: "text", label: "Text", hint: "On the cards and in the throw bar", site: SITE_TEXT },
  { key: "actionBar", label: "Bottom bar", hint: "The bar that holds undo and Next", site: SITE_ACTION_BAR },
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
