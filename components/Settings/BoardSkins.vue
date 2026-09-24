<template>
  <template v-if="!$attrs['data-feature-index']">
    <!-- Settings Panel -->
    <div v-if="config" class="adt-container min-h-56">
      <div class="relative z-10 flex h-full flex-col justify-between">
        <div>
          <div class="space-y-3 text-white/70">
            <p>
              Draws autodarts' board in the design you pick, for everyone who throws on it — bots
              included. A camera's picture has no board to redraw, so this also keeps the drawn
              board up while a game is on, pressing the camera button until it shows.
            </p>

            <div class="mt-4">
              <h4 class="mb-2 font-semibold">
                Board
              </h4>
              <!-- Three to a row across the dialog, two on a phone. -->
              <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4" role="group">
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
                      :alt="`${skin.label} board`"
                      class="aspect-square w-full rounded-full"
                      draggable="false"
                    >
                  </span>
                  <!-- Picked the way a segmented control's option is: the hot gradient on a navy track. -->
                  <span
                    class="block px-3 py-2.5 text-[length:var(--ad-text-md)] text-white"
                    :class="config.boardSkins.skin === skin.id ? 'bg-[image:var(--ad-gradient-hot)] font-bold' : 'bg-[var(--ad-navy-400)] font-semibold'"
                  >
                    {{ skin.label }}
                  </span>
                </button>
              </div>
              <p class="mt-2 text-sm text-white/60">
                {{ selected.description }}
                <template v-if="selected.art">
                  The darts, the yellow of a hit and aiming by hand all work as they do on autodarts'
                  own board, and Darts Zoom's close-ups and Streaming Mode's board wear it too.
                </template>
                <template v-else>
                  Nothing about the board changes; it is only kept on the drawn board.
                </template>
              </p>
            </div>

            <p class="text-sm text-white/60">
              Pressing the camera button yourself, or autodarts' own 1, 2 and 3 keys, leaves the
              view to you until the next leg begins. While this is on it is the one in charge of the
              view: <em>Board View</em> stands aside, and Darts Zoom and Streaming Mode no longer
              switch the board.
            </p>
          </div>
        </div>
      </div>
    </div>
  </template>

  <template v-else>
    <!-- Feature Card -->
    <div v-if="config" class="adt-container adt-interactive h-56">
      <div class="relative z-10 flex h-full flex-col justify-between">
        <div>
          <h3 class="adt-card-title mb-1 flex items-center">
            Board Skins
            <span class="icon-[material-symbols--settings-alert-outline-rounded] ml-2 size-5" />
          </h3>
          <p class="w-2/3 text-white/70">
            Play on autodarts' board in another design — the classic one, qwellcode, Opal, Marble or Sorbet.
          </p>
        </div>
        <div class="flex">
          <div @click="$emit('toggle', 'board-skins')" class="absolute inset-y-0 left-12 right-0 cursor-pointer" />
          <AppToggle @update:model-value="toggleFeature" v-model="config.boardSkins.enabled" />
        </div>
      </div>
      <div class="gradient-mask-left absolute inset-y-0 right-0 w-2/3">
        <img :src="imageUrl" alt="Board Skins" class="size-full object-cover">
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import AppToggle from "../AppToggle.vue";

import { BOARD_SKINS, boardSkin } from "@/utils/board-skins";

const emit = defineEmits([ "toggle" ]);
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
