<template>
  <section v-if="config" class="mt-6 flex flex-col gap-6">
    <!-- The bracket needs the hint: a bare `font-[…]` reads as a weight. -->
    <h2 class="font-[family-name:var(--ad-font-display)] text-2xl font-normal">
      {{ t("features.externalBoards") }}
    </h2>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
      <div
        v-for="board in config.externalBoards.boards"
        :key="board.id"
        class="adt-container flex flex-col justify-between gap-4"
      >
        <div class="min-w-0">
          <h3 class="adt-card-title truncate">
            {{ board.name || t("externalBoards.unnamedBoard") }}
          </h3>
          <p class="truncate text-xs text-white/40">
            {{ board.id }}
          </p>
        </div>
        <div class="flex items-center justify-between gap-2">
          <AppButton
            @click="removeBoard(board.id)"
            :title="t('externalBoards.forget')"
            type="danger"
            size="sm"
            auto
          >
            <span class="icon-[pixelarticons--trash]" />
          </AppButton>
          <AppButton
            @click="followBoard(board.id)"
            type="primary"
            size="sm"
            auto
          >
            {{ t("externalBoards.follow") }}
          </AppButton>
        </div>
      </div>

      <div class="adt-container flex flex-col justify-between gap-4">
        <div class="space-y-2">
          <AppInput v-model="draft.name" :placeholder="t('externalBoards.placeholders.name')" />
          <AppInput v-model="draft.id" :placeholder="t('externalBoards.placeholders.id')" />
        </div>
        <div class="flex items-center justify-between gap-2">
          <p class="text-xs text-[var(--ad-text-destructive)]">
            {{ error ? t(error) : "" }}
          </p>
          <!-- The label keeps its width and the message beside it wraps: "Hinzufügen" is wider than "Add". -->
          <AppButton
            @click="addBoard"
            type="success"
            size="sm"
            class="shrink-0"
            auto
          >
            {{ t("common.add") }}
          </AppButton>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { nextTick, onBeforeMount, reactive, ref, watch } from "vue";

import type { MessageKey } from "@/utils/i18n";

import AppButton from "@/components/AppButton.vue";
import AppInput from "@/components/AppInput.vue";
import { AutodartsToolsConfig, updateConfigIfChanged } from "@/utils/storage";

/** Boards are identified by a UUID anywhere in what was pasted. */
const BOARD_ID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

const { t } = useI18n();

const config = ref();
/** What is wrong with the draft, as a message key: the sentence follows a language picked while it is on screen. */
const error = ref<MessageKey | "">("");
const draft = reactive({ id: "", name: "" });

watch(config, async () => {
  const currentConfig = await AutodartsToolsConfig.getValue();
  await nextTick();
  await updateConfigIfChanged(currentConfig, config.value, "externalBoards");
}, { deep: true });

onBeforeMount(async () => {
  config.value = await AutodartsToolsConfig.getValue();
});

/**
 * Take the id out of whatever was pasted.
 *
 * What gets shared is the follow link, not the bare UUID, so asking for the id
 * and rejecting a URL would fail on the one thing people actually have.
 */
function addBoard() {
  const id = draft.id.trim().match(BOARD_ID)?.[0];
  if (!id) {
    error.value = "externalBoards.errors.missingId";
    return;
  }

  if (config.value.externalBoards.boards.some((board: { id: string }) => board.id === id)) {
    error.value = "externalBoards.errors.alreadyListed";
    return;
  }

  config.value.externalBoards.boards.push({ id, name: draft.name.trim() });
  draft.id = "";
  draft.name = "";
  error.value = "";
}

function removeBoard(id: string) {
  config.value.externalBoards.boards = config.value.externalBoards.boards
    .filter((board: { id: string }) => board.id !== id);
}

/**
 * Follow is the only board view the rebuilt site still has: `/boards/<id>` and
 * `/boards/<id>/stats` both answer 404 now, so v1's stats button has nowhere
 * left to go.
 */
function followBoard(id: string) {
  window.location.href = `/boards/${id}/follow`;
}
</script>
