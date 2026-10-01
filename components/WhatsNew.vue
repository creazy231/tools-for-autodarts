<template>
  <!--
    `ghost-close` so the ✕ is the one the feature settings dialogs use — this is
    otherwise the same shell, and the two open from the same page.
  -->
  <AppModal
    @close="dismiss"
    :show="show"
    size="lg"
    :title="t('whatsNew.title', { release: WHATS_NEW_TITLE })"
    ghost-close
  >
    <div class="space-y-5">
      <p class="text-white/70">
        {{ t("whatsNew.intro") }}
      </p>

      <!--
        Spans rather than a list: AppAlert's body is a `<span>`, which may hold
        phrasing content only — a `<ul>` in there is markup the parser is free
        to move somewhere else.
      -->
      <AppAlert variant="warning" :title="t('whatsNew.beforeYouPlay')">
        <span
          v-for="item in headsUp"
          :key="item.id"
          class="mt-2 block first:mt-1"
        >
          <b>{{ item.title }}</b> — {{ item.body }}
        </span>
      </AppAlert>

      <div>
        <h3 class="adt-card-title mb-3">
          {{ t("whatsNew.newInThisRelease") }}
        </h3>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <!--
            Tiles, not cards: `.adt-modal-body > .adt-container` strips a card's
            own surface back off, and these are nested a level deeper anyway, so
            they carry the chip fill directly.
          -->
          <div
            v-for="item in highlights"
            :key="item.id"
            class="flex gap-3 rounded-[var(--ad-radius-lg)] bg-[var(--ad-surface-chip)] p-3"
          >
            <span :class="[ item.icon, 'mt-0.5 size-5 shrink-0 text-[var(--ad-text-accent)]' ]" />
            <div class="min-w-0">
              <p class="font-semibold text-[var(--ad-text-primary)]">
                {{ item.title }}
              </p>
              <p class="mt-0.5 text-sm text-white/60">
                {{ item.body }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <!--
        The dialog's own footer is `justify-end`; the links belong on the left,
        away from the button that closes it.
      -->
      <div class="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-wrap gap-2">
          <AppButton
            @click="open(CHANGELOG_URL)"
            type="ghost"
            size="sm"
            auto
          >
            <span class="icon-[pixelarticons--script-text] mr-2" />
            <span>{{ t("whatsNew.changelog") }}</span>
          </AppButton>
          <AppButton
            @click="open(ISSUES_URL)"
            type="ghost"
            size="sm"
            auto
          >
            <span class="icon-[pixelarticons--debug] mr-2" />
            <span>{{ t("whatsNew.reportIssue") }}</span>
          </AppButton>
          <AppButton
            @click="open(KOFI_URL)"
            type="ghost"
            size="sm"
            auto
          >
            <span class="icon-[pixelarticons--heart] mr-2" />
            <span>{{ t("settings.header.kofi") }}</span>
          </AppButton>
        </div>
        <AppButton @click="dismiss" type="primary" auto>
          {{ t("whatsNew.gotIt") }}
        </AppButton>
      </div>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import AppModal from "@/components/AppModal.vue";
import AppAlert from "@/components/AppAlert.vue";
import AppButton from "@/components/AppButton.vue";
import { AutodartsToolsWhatsNewSeen, WHATS_NEW_RELEASE } from "@/utils/storage";

/**
 * The release these notes describe, not the version that happens to be running.
 * A patch on top of this one ships the same notes and should say so.
 */
const WHATS_NEW_TITLE = "3.0";

const CHANGELOG_URL = "https://github.com/creazy231/tools-for-autodarts/blob/main/CHANGELOG.md";
const ISSUES_URL = "https://github.com/creazy231/tools-for-autodarts/issues";
const KOFI_URL = "https://ko-fi.com/creazy231";

const { t } = useI18n();

const show = ref(false);

/** What changed under someone who already had the extension set up. */
const headsUp = computed(() => [
  { id: "featuresGone", title: t("whatsNew.headsUp.featuresGone.title"), body: t("whatsNew.headsUp.featuresGone.body") },
  { id: "settingsFresh", title: t("whatsNew.headsUp.settingsFresh.title"), body: t("whatsNew.headsUp.settingsFresh.body") },
]);

/** Worth going and switching on. */
const highlights = computed(() => [
  {
    id: "boardView",
    icon: "icon-[material-symbols--videocam-outline-rounded]",
    title: t("whatsNew.highlights.boardView.title"),
    body: t("whatsNew.highlights.boardView.body"),
  },
  {
    id: "zoom",
    icon: "icon-[material-symbols--zoom-in-rounded]",
    title: t("whatsNew.highlights.zoom.title"),
    body: t("whatsNew.highlights.zoom.body"),
  },
  {
    id: "quietOwnDarts",
    icon: "icon-[material-symbols--volume-off-rounded]",
    title: t("whatsNew.highlights.quietOwnDarts.title"),
    body: t("whatsNew.highlights.quietOwnDarts.body"),
  },
  {
    id: "streamingMode",
    icon: "icon-[material-symbols--live-tv-outline-rounded]",
    title: t("whatsNew.highlights.streamingMode.title"),
    body: t("whatsNew.highlights.streamingMode.body"),
  },
  {
    id: "caller",
    icon: "icon-[material-symbols--campaign-outline-rounded]",
    title: t("whatsNew.highlights.caller.title"),
    body: t("whatsNew.highlights.caller.body"),
  },
  {
    id: "gotcha",
    icon: "icon-[material-symbols--target]",
    title: t("whatsNew.highlights.gotcha.title"),
    body: t("whatsNew.highlights.gotcha.body"),
  },
]);

onMounted(async () => {
  show.value = await AutodartsToolsWhatsNewSeen.getValue() !== WHATS_NEW_RELEASE;
});

/** Any way out counts as read: the ✕, the backdrop, or Got it. */
async function dismiss() {
  show.value = false;
  await AutodartsToolsWhatsNewSeen.setValue(WHATS_NEW_RELEASE);
}

function open(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

/** Lets the settings page re-open the notes after they have been dismissed. */
defineExpose({ reopen: () => (show.value = true) });
</script>
