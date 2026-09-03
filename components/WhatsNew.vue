<template>
  <!--
    `ghost-close` so the ✕ is the one the feature settings dialogs use — this is
    otherwise the same shell, and the two open from the same page.
  -->
  <AppModal
    @close="dismiss"
    :show="show"
    size="lg"
    :title="`What's new in ${WHATS_NEW_TITLE}`"
    ghost-close
  >
    <div class="space-y-5">
      <p class="text-white/70">
        Autodarts rebuilt their site, so this release is a rebuild of the extension to match: every
        feature has been ported to the new design, and a few of them work rather differently now.
      </p>

      <!--
        Spans rather than a list: AppAlert's body is a `<span>`, which may hold
        phrasing content only — a `<ul>` in there is markup the parser is free
        to move somewhere else.
      -->
      <AppAlert variant="warning" title="Before you play">
        <span
          v-for="item in headsUp"
          :key="item.title"
          class="mt-2 block first:mt-1"
        >
          <b>{{ item.title }}</b> — {{ item.body }}
        </span>
      </AppAlert>

      <div>
        <h3 class="adt-card-title mb-3">
          New in this release
        </h3>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <!--
            Tiles, not cards: `.adt-modal-body > .adt-container` strips a card's
            own surface back off, and these are nested a level deeper anyway, so
            they carry the chip fill directly.
          -->
          <div
            v-for="item in highlights"
            :key="item.title"
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
            <span>Full changelog</span>
          </AppButton>
          <AppButton
            @click="open(ISSUES_URL)"
            type="ghost"
            size="sm"
            auto
          >
            <span class="icon-[pixelarticons--debug] mr-2" />
            <span>Report an issue</span>
          </AppButton>
          <AppButton
            @click="open(KOFI_URL)"
            type="ghost"
            size="sm"
            auto
          >
            <span class="icon-[pixelarticons--heart] mr-2" />
            <span>Support on Ko-fi</span>
          </AppButton>
        </div>
        <AppButton @click="dismiss" type="primary" auto>
          Got it
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

/** What changed under someone who already had the extension set up. */
const headsUp = [
  {
    title: "Two features are gone",
    body: "Shuffle Players — the lobby has its own Shuffle button now — and Hide Menu In Match, since the "
      + "rebuilt match screen ships no menu to hide.",
  },
  {
    title: "A few settings start fresh",
    body: "Instant Replay's Delay is now Start delay and means something else, so it begins at 3 seconds; "
      + "Darts Zoom's Center position is gone and its hold time is in milliseconds. Worth a look before "
      + "your next match.",
  },
];

/** Worth going and switching on. */
const highlights = [
  {
    icon: "icon-[material-symbols--videocam-outline-rounded]",
    title: "Board View",
    body: "Start every game — bull-off included — on the camera or the drawn board you want to be looking at.",
  },
  {
    icon: "icon-[material-symbols--zoom-in-rounded]",
    title: "Darts Zoom, reworked",
    body: "A new On Board mode zooms Autodarts' own board on each dart and adds nothing to the screen. "
      + "Bottom and Top draw close-ups instead, and Bottom is the new default.",
  },
  {
    icon: "icon-[material-symbols--volume-off-rounded]",
    title: "Quiet Own Darts",
    body: "Silences the thud for darts you can already hear land, and keeps it for everyone else. Its switch "
      + "is in Autodarts' own sound settings, under Dart landed.",
  },
  {
    icon: "icon-[material-symbols--live-tv-outline-rounded]",
    title: "Streaming Mode",
    body: "Works on the rebuilt site, and no longer needs a board camera. There is a second scoreboard to "
      + "choose from — Autodarts, drawn from the site's own design — beside the classic broadcast one.",
  },
  {
    icon: "icon-[material-symbols--campaign-outline-rounded]",
    title: "Caller",
    body: "Prefer combined throws stops a visit being called twice when it has a combination sound of its "
      + "own, and there is a bulloff trigger to go with WLED's.",
  },
  {
    icon: "icon-[material-symbols--target]",
    title: "Gotcha",
    body: "Checkout routes worked out here — Autodarts provides none for Gotcha — announced by the Caller, "
      + "plus a helper marking every player you could knock back.",
  },
];

const show = ref(false);

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
