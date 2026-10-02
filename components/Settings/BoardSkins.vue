<template>
  <template v-if="!$attrs['data-feature-index']">
    <!-- Settings Panel -->
    <div v-if="config" class="adt-container">
      <div class="relative z-10 pr-2 text-[var(--ad-text-secondary)]">
        <p class="mb-6 max-w-3xl">
          {{ t("boardSkins.intro") }}
        </p>

        <section>
          <h3 class="adt-section-title mb-4">
            {{ t("boardSkins.sections.skin") }}
          </h3>
          <!-- Three to a row across the dialog, two on a phone. -->
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4" role="group" :aria-label="t('boardSkins.sections.skin')">
            <button
              @click="config.boardSkins.skin = skin.id"
              v-for="skin in BOARD_SKINS"
              :key="skin.id"
              :aria-pressed="config.boardSkins.skin === skin.id"
              class="flex flex-col overflow-hidden rounded-[var(--ad-radius-lg)] bg-[var(--ad-surface-sunken)] text-center transition-colors hover:bg-[var(--ad-surface-card-hover)] focus-visible:shadow-[var(--ad-focus-ring)] focus-visible:outline-none"
              :class="{ 'ring-1 ring-inset ring-[var(--ad-border-strong)]': config.boardSkins.skin === skin.id }"
              type="button"
            >
              <!-- Round, as the match screen clips it: a picture's corners are not part of the board. -->
              <span class="block p-3 sm:p-5">
                <img
                  :src="skin.preview"
                  :alt="t('boardSkins.skinAlt', { skin: t(skin.labelKey) })"
                  class="aspect-square w-full rounded-full"
                  draggable="false"
                >
              </span>
              <!-- Picked the way a segmented control's option is: the hot gradient on a navy track. -->
              <span
                class="block px-3 py-2.5 text-[length:var(--ad-text-md)] text-white"
                :class="config.boardSkins.skin === skin.id ? 'bg-[image:var(--ad-gradient-hot)] font-bold' : 'bg-[var(--ad-navy-400)] font-semibold'"
              >
                {{ t(skin.labelKey) }}
              </span>
            </button>
          </div>
          <p class="mt-3 max-w-3xl text-sm text-[var(--ad-text-muted)]">
            <AppTrans
              v-if="selected.art"
              :params="{ label: t(selected.labelKey), description: t(selected.descriptionKey) }"
              class="adt-skin-selected"
              path="boardSkins.selected.redrawn"
            />
            <AppTrans
              v-else
              :params="{ label: t(selected.labelKey), description: t(selected.descriptionKey) }"
              class="adt-skin-selected"
              path="boardSkins.selected.kept"
            />
          </p>
        </section>

        <p class="mt-8 max-w-3xl border-t border-[var(--ad-border-subtle)] pt-4 text-sm text-[var(--ad-text-muted)]">
          {{ t("boardSkins.note") }}
        </p>
      </div>
    </div>
  </template>

  <template v-else>
    <!-- Feature Card -->
    <div v-if="config" class="adt-container adt-interactive h-56">
      <div class="relative z-10 flex h-full flex-col justify-between">
        <div>
          <h3 class="adt-card-title mb-1 flex items-center">
            {{ t("features.boardSkins") }}
            <span class="icon-[material-symbols--settings-alert-outline-rounded] ml-2 size-5" />
          </h3>
          <p class="w-2/3 text-white/70">
            {{ t("boardSkins.card") }}
          </p>
        </div>
        <div class="flex">
          <div @click="$emit('toggle', 'board-skins')" class="absolute inset-y-0 left-12 right-0 cursor-pointer" />
          <AppToggle @update:model-value="toggleFeature" v-model="config.boardSkins.enabled" />
        </div>
      </div>
      <div class="gradient-mask-left absolute inset-y-0 right-0 w-2/3">
        <img :src="imageUrl" :alt="t('features.boardSkins')" class="size-full object-cover">
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import AppToggle from "../AppToggle.vue";
import AppTrans from "../AppTrans.vue";

import { BOARD_SKINS, boardSkin } from "@/utils/board-skins";

const emit = defineEmits([ "toggle" ]);
const { t } = useI18n();
const { config } = useConfig();
/** The card always shows a match on the qwellcode board, whichever skin is chosen. */
const imageUrl = browser.runtime.getURL("/images/board-skins.png");

const selected = computed(() => boardSkin(config.value?.boardSkins?.skin));

async function toggleFeature() {
  if (!config.value) return;

  const wasEnabled = config.value.boardSkins.enabled;
  config.value.boardSkins.enabled = !wasEnabled;

  if (!wasEnabled) {
    await nextTick();
    emit("toggle", "board-skins");
  }
}
</script>

<style scoped>
/* The skin's name leads the line in bold and in the primary text colour; the rest of it is muted. */
.adt-skin-selected :deep(b) { font-weight: 600; color: var(--ad-text-primary); }
</style>
