<template>
  <div>
    <!-- Confirmation Dialog -->
    <ConfirmDialog
      @confirm="confirmDialogConfirm"
      @cancel="confirmDialogCancel"
      :show="confirmDialog.show"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :confirm-text="confirmDialog.confirmText"
      :cancel-text="confirmDialog.cancelText"
    />

    <!-- Notification -->
    <AppNotification
      @close="hideNotification"
      :show="notification.show"
      :message="notification.message"
      :type="notification.type"
    />

    <!--
      What's New.

      Opens itself the first time this page is seen on a new release and writes
      its own "seen" flag, so it needs nothing from here beyond being mounted —
      the ref is only for re-opening it from the advanced panel below.
    -->
    <WhatsNew ref="whatsNew" />

    <!-- Settings Modal -->
    <SettingsModal
      @close="closeSettingsModal"
      v-if="activeSettings && getComponentForSetting(activeSettings)"
      :show="showSettingsModal"
      :title="getSettingTitle(activeSettings)"
      :width="getSettingWidth(activeSettings)"
      :fill="getSettingFill(activeSettings)"
    >
      <component :is="getComponentForSetting(activeSettings)" />
    </SettingsModal>

    <div class="mx-auto mb-16 max-w-[1366px] space-y-8">
      <div class="space-y-4">
        <div class="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div class="flex items-center">
            <AppButton
              @click="goBack()"
              class="mr-4 aspect-square size-10 p-0"
            >
              <span class="icon-[pixelarticons--arrow-left]" />
            </AppButton>
            <h1 class="text-xl font-bold lg:text-2xl xl:text-3xl">
              Autodarts Tools {{ packageConfig.version }}
            </h1>
          </div>
          <!--
            On a phone the two menus share their row with Ko-fi and the gear,
            so they drop their icons there, and on the narrowest phones the two
            icon buttons wrap onto a row of their own. Export's menu lines up
            with its left edge, Import's with its right.
          -->
          <div class="mt-2 flex flex-wrap items-center gap-2 sm:mt-0 sm:flex-nowrap">
            <AppMenu :items="exportActions" align="start" class="flex-1 sm:flex-none">
              <template #trigger="{ open, toggle }">
                <AppButton @click="toggle" :aria-expanded="open" class="max-sm:px-3">
                  <span class="icon-[pixelarticons--calendar-export] mr-2 max-sm:hidden" />
                  <span>{{ t("settings.header.export") }}</span>
                  <span class="icon-[material-symbols--expand-more-rounded] -mr-1 ml-1 text-lg" />
                </AppButton>
              </template>
            </AppMenu>
            <AppMenu :items="importActions" class="flex-1 sm:flex-none">
              <template #trigger="{ open, toggle }">
                <AppButton @click="toggle" :aria-expanded="open" class="max-sm:px-3">
                  <span class="icon-[pixelarticons--calendar-import] mr-2 max-sm:hidden" />
                  <span>{{ t("settings.header.import") }}</span>
                  <span class="icon-[material-symbols--expand-more-rounded] -mr-1 ml-1 text-lg" />
                </AppButton>
              </template>
            </AppMenu>
            <div class="ml-auto flex gap-2">
              <AppButton
                @click="openKofi"
                :title="t('settings.header.kofi')"
                class="aspect-square size-10 p-0"
              >
                <span class="icon-[material-symbols--coffee-outline-rounded]" />
              </AppButton>
              <AppButton
                @click="toggleDangerZone"
                :title="t('settings.header.advanced')"
                class="aspect-square size-10 p-0"
              >
                <span class="icon-[material-symbols--settings-suggest-outline]" />
              </AppButton>
            </div>
          </div>
        </div>

        <!-- Tabs Component -->
        <AppTabs
          v-if="!showDangerZone"
          v-model="activeTab"
          :tabs="tabs"
        />

        <!-- Advanced Settings -->
        <div v-if="showDangerZone" class="space-y-5">
          <!-- Ko-fi Support Section -->
          <div class="adt-container space-y-4">
            <div class="flex items-center justify-between">
              <h2 class="adt-card-title">
                {{ t("settings.support.title") }}
              </h2>
              <AppButton @click="toggleDangerZone" type="ghost" auto>
                <span class="icon-[pixelarticons--close]" />
              </AppButton>
            </div>
            <p class="text-white/70">
              {{ t("settings.support.body") }}
            </p>
            <!--
              The single action in this panel, so it takes the primary variant.
              Green here was a status token doing an action's job — the system
              keeps blue as the only accent.
            -->
            <AppButton
              @click="openKofi"
              type="primary"
              auto
            >
              <span class="icon-[pixelarticons--heart] mr-2" />
              <span>{{ t("settings.header.kofi") }}</span>
            </AppButton>
          </div>

          <!-- Release Notes -->
          <div class="adt-container space-y-4">
            <h2 class="adt-card-title">
              {{ t("settings.releaseNotes.title") }}
            </h2>
            <p class="text-white/70">
              {{ t("settings.releaseNotes.body") }}
            </p>
            <AppButton
              @click="whatsNew?.reopen()"
              type="default"
              auto
            >
              <span class="icon-[pixelarticons--script-text] mr-2" />
              <span>{{ t("settings.releaseNotes.button") }}</span>
            </AppButton>
          </div>

          <!-- Danger Zone -->
          <div class="adt-container space-y-4">
            <!-- `!` because .adt-card-title sets its own colour and, being
                 plain CSS after @tailwind utilities, otherwise wins. -->
            <h2 class="adt-card-title !text-[var(--ad-text-destructive)]">
              {{ t("settings.danger.title") }}
            </h2>
            <p class="text-white/70">
              {{ t("settings.danger.body") }}
            </p>
            <AppAlert variant="error" :title="t('settings.danger.resetTitle')">
              {{ t("settings.danger.resetBody") }}
              <template #action>
                <AppButton
                  @click="resetAllSettings"
                  size="sm"
                  auto
                  type="danger"
                >
                  {{ t("common.reset") }}
                </AppButton>
              </template>
            </AppAlert>
          </div>
        </div>

        <!-- Feature cards grid -->
        <template v-if="mounted">
          <div
            v-if="!showDangerZone"
            class="grid grid-cols-1 gap-5 lg:grid-cols-2"
          >

            <!-- Warning message for sound and animation features -->
            <AppAlert
              v-if="featureGroups[activeTab].id==='sounds-animations'"
              variant="warning"
              :title="t('settings.performance.title')"
              class="col-span-full"
            >
              <AppTrans
                path="settings.performance.body"
                :params="{ animations: t('features.animations'), caller: t('features.caller'), soundFx: t('features.soundFx') }"
              />
            </AppAlert>

            <!--
              Feature Cards.

              The disabled state lives on this wrapper rather than on the
              component: several settings components have two root templates
              (panel / card), which makes them multi-root, and Vue does not
              apply fallthrough attributes to those — the class silently landed
              on only the single-root ones. The corner label of a disabled card,
              which the stylesheet draws from data-adt-v2-label, is set here too.
            -->
            <div
              v-for="(feature, idx) in featureGroups[activeTab].features"
              :key="feature.id"
              :class="[ 'relative', { 'adt-feature-disabled': !feature.v2Ready } ]"
              :data-adt-v2-label="feature.v2Ready ? undefined : t('settings.notOnV2')"
            >
              <component
                :is="feature.component"
                :data-feature-index="idx + 1"
                @toggle="handleToggle(feature)"
                class="feature-card"
              />
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from "vue";
import { useStorage } from "@vueuse/core";

import DiscordWebhooks from "./Settings/DiscordWebhooks.vue";
import AutoStart from "./Settings/AutoStart.vue";
import RecentLocalPlayers from "./Settings/RecentLocalPlayers.vue";
import LocalLobby from "./Settings/LocalLobby.vue";
import Teams from "./Settings/Teams.vue";
import QrCode from "./Settings/QrCode.vue";
import Colors from "./Settings/Colors.vue";
import TakeoutNotification from "./Settings/TakeoutNotification.vue";
import NextPlayerOnTakeoutStuck from "./Settings/NextPlayerOnTakeoutStuck.vue";
import AutomaticNextLeg from "./Settings/AutomaticNextLeg.vue";
import SmallerScores from "./Settings/SmallerScores.vue";
import StreamingMode from "./Settings/StreamingMode.vue";
import AutomaticFullscreen from "./Settings/AutomaticFullscreen.vue";
import LargerLegsSets from "./Settings/LargerLegsSets.vue";
import LargerPlayerMatchData from "./Settings/LargerPlayerMatchData.vue";
import LargerPlayerNames from "./Settings/LargerPlayerNames.vue";
import WinnerAnimation from "./Settings/WinnerAnimation.vue";
import Animations from "./Settings/Animations.vue";
import Caller from "./Settings/Caller.vue";
import ExternalBoards from "./Settings/ExternalBoards.vue";
import SoundFx from "./Settings/SoundFx.vue";
import Wled from "./Settings/Wled.vue";
import Zoom from "./Settings/Zoom.vue";
import BoardView from "./Settings/BoardView.vue";
import BoardSkins from "./Settings/BoardSkins.vue";
import QuickCorrection from "./Settings/QuickCorrection.vue";
import EnhancedScoringDisplay from "./Settings/EnhancedScoringDisplay.vue";
import InstantReplay from "./Settings/InstantReplay.vue";
import Gotcha from "./Settings/Gotcha.vue";
import RoundCounter from "./Settings/RoundCounter.vue";

import packageConfig from "../package.json";

import type { MessageKey } from "@/utils/i18n";
import type { IConfig, ISound } from "@/utils/storage";

import { AutodartsToolsConfig, defaultConfig } from "@/utils/storage";
import { normalizeColors } from "@/utils/colors";
import { renameSettings } from "@/utils/config-renames";
import { normalizeInstantReplay } from "@/utils/instant-replay";
import { normalizeTeams } from "@/utils/teams";
import { clearCallerSoundsFromIndexedDB, clearSoundFxFromIndexedDB, getAllCallerSoundsFromIndexedDB, getAllSoundFxFromIndexedDB, isIndexedDBAvailable, saveSoundFxToIndexedDB, saveSoundToIndexedDB } from "@/utils/helpers";
import AppButton from "@/components/AppButton.vue";
import AppMenu from "@/components/AppMenu.vue";
import AppAlert from "@/components/AppAlert.vue";
import AppTrans from "@/components/AppTrans.vue";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import AppNotification from "@/components/AppNotification.vue";
import SettingsModal from "@/components/SettingsModal.vue";
import WhatsNew from "@/components/WhatsNew.vue";
import { useConfirmDialog } from "@/composables/useConfirmDialog";
import { useNotification } from "@/composables/useNotification";
import AppTabs from "@/components/AppTabs.vue";

// Define feature groups with titles for modals
interface Feature {
  id: string;
  /** The key of its name in features.ts, which its settings dialog's heading is built from. */
  nameKey: MessageKey;
  component: Component;
  hasSettings: boolean;
  /** Ported to the rebuilt site. Absent means "not yet" — the card renders inert. */
  v2Ready?: boolean;
  /**
   * Give this feature's settings dialog the widest shell. For the panels that
   * pair a grid of tiles, or a preview, with a column of options and do not
   * fit the standard one.
   */
  wideSettings?: boolean;
  /**
   * Give its dialog the full height at all times. For the panels with a
   * searchable list, whose dialog would otherwise resize as the search narrows it.
   */
  fillSettings?: boolean;
}

interface FeatureGroup {
  id: string;
  tab: number;
  features: Feature[];
  settingIds: string[];
}

/**
 * Feature registry.
 *
 * `v2Ready` opts a feature back in after it has been ported to the rebuilt
 * autodarts site. Anything without it renders dimmed, with a not-allowed
 * cursor and no interaction — its selectors still target the old DOM, so
 * switching it on would only fail silently.
 *
 * Porting checklist: move its selectors into utils/selectors.ts, verify against
 * live v2, then add `v2Ready: true` here.
 */
const featureGroups: FeatureGroup[] = [
  // Lobbies (Tab 0)
  {
    id: "lobbies",
    tab: 0,
    features: [
      { id: "discord-webhooks", nameKey: "features.discordWebhooks", component: DiscordWebhooks, hasSettings: true, v2Ready: true },
      { id: "auto-start", nameKey: "features.autoStart", component: AutoStart, hasSettings: false, v2Ready: true },
      { id: "recent-local-players", nameKey: "features.recentLocalPlayers", component: RecentLocalPlayers, hasSettings: true, v2Ready: true, fillSettings: true },
      { id: "local-lobby", nameKey: "features.localLobby", component: LocalLobby, hasSettings: false, v2Ready: true },
      { id: "teams", nameKey: "features.teams", component: Teams, hasSettings: true, v2Ready: true, fillSettings: true },
      { id: "qr-code", nameKey: "features.qrCode", component: QrCode, hasSettings: false, v2Ready: true },
    ],
    settingIds: [ "discord-webhooks", "recent-local-players", "teams" ],
  },
  // Matches (Tab 1)
  {
    id: "matches",
    tab: 1,
    features: [
      { id: "colors", nameKey: "features.colors", component: Colors, hasSettings: true, v2Ready: true, wideSettings: true },
      { id: "takeout-notification", nameKey: "features.takeoutNotification", component: TakeoutNotification, hasSettings: false, v2Ready: true },
      { id: "next-player-on-takeout-stuck", nameKey: "features.nextPlayerOnTakeoutStuck", component: NextPlayerOnTakeoutStuck, hasSettings: true, v2Ready: true },
      { id: "automatic-next-leg", nameKey: "features.automaticNextLeg", component: AutomaticNextLeg, hasSettings: true, v2Ready: true },
      { id: "smaller-scores", nameKey: "features.smallerScores", component: SmallerScores, hasSettings: false, v2Ready: true },
      { id: "streaming-mode", nameKey: "features.streamingMode", component: StreamingMode, hasSettings: true, v2Ready: true },
      { id: "larger-legs-sets", nameKey: "features.largerLegsSets", component: LargerLegsSets, hasSettings: true, v2Ready: true },
      { id: "larger-player-names", nameKey: "features.largerPlayerNames", component: LargerPlayerNames, hasSettings: true, v2Ready: true },
      { id: "larger-player-match-data", nameKey: "features.largerPlayerMatchData", component: LargerPlayerMatchData, hasSettings: true, v2Ready: true },
      { id: "winner-animation", nameKey: "features.winnerAnimation", component: WinnerAnimation, hasSettings: false, v2Ready: true },
      { id: "automatic-fullscreen", nameKey: "features.automaticFullscreen", component: AutomaticFullscreen, hasSettings: false, v2Ready: true },
      { id: "zoom", nameKey: "features.zoom", component: Zoom, hasSettings: true, v2Ready: true },
      { id: "board-view", nameKey: "features.boardView", component: BoardView, hasSettings: true, v2Ready: true },
      { id: "board-skins", nameKey: "features.boardSkins", component: BoardSkins, hasSettings: true, v2Ready: true },
      { id: "quick-correction", nameKey: "features.quickCorrection", component: QuickCorrection, hasSettings: true, v2Ready: true },
      { id: "enhanced-scoring-display", nameKey: "features.enhancedScoringDisplay", component: EnhancedScoringDisplay, hasSettings: false, v2Ready: true },
      { id: "instant-replay", nameKey: "features.instantReplay", component: InstantReplay, hasSettings: true, v2Ready: true, wideSettings: true },
      { id: "gotcha", nameKey: "features.gotcha", component: Gotcha, hasSettings: false, v2Ready: true },
      { id: "round-counter", nameKey: "features.roundCounter", component: RoundCounter, hasSettings: false, v2Ready: true },
    ],
    settingIds: [ "colors", "next-player-on-takeout-stuck", "automatic-next-leg", "streaming-mode", "larger-legs-sets", "larger-player-names", "larger-player-match-data", "automatic-fullscreen", "zoom", "board-view", "board-skins", "quick-correction", "instant-replay" ],
  },
  // Boards (Tab 2)
  {
    id: "boards",
    tab: 2,
    features: [
      { id: "external-boards", nameKey: "features.externalBoards", component: ExternalBoards, hasSettings: false, v2Ready: true },
    ],
    settingIds: [],
  },
  // Sounds & Animations (Tab 3)
  {
    id: "sounds-animations",
    tab: 3,
    features: [
      { id: "animations", nameKey: "features.animations", component: Animations, hasSettings: true, v2Ready: true, wideSettings: true, fillSettings: true },
      { id: "caller", nameKey: "features.caller", component: Caller, hasSettings: true, v2Ready: true, wideSettings: true, fillSettings: true },
      { id: "sound-fx", nameKey: "features.soundFx", component: SoundFx, hasSettings: true, v2Ready: true, wideSettings: true, fillSettings: true },
      { id: "wled-fx", nameKey: "features.wled", component: Wled, hasSettings: true, v2Ready: true, wideSettings: true, fillSettings: true },
    ],
    settingIds: [ "animations", "caller", "sound-fx", "wled-fx" ],
  },
];

const { t } = useI18n();

/**
 * The header's two menus. Either import replaces every setting and reloads the
 * page without asking, so their hints say so.
 */
const exportActions = computed(() => [
  { label: t("settings.exportMenu.download"), hint: t("settings.exportMenu.downloadHint"), icon: "icon-[material-symbols--download-rounded]", action: exportSettings },
  { label: t("settings.exportMenu.copy"), hint: t("settings.exportMenu.copyHint"), icon: "icon-[material-symbols--content-copy-outline-rounded]", action: copyToClipboard },
]);
const importActions = computed(() => [
  { label: t("settings.importMenu.upload"), hint: t("settings.importMenu.uploadHint"), icon: "icon-[material-symbols--upload-rounded]", action: importSettings },
  { label: t("settings.importMenu.paste"), hint: t("settings.importMenu.pasteHint"), icon: "icon-[material-symbols--content-paste-rounded]", action: pasteFromClipboard },
]);

// Tabs component data. AppTabs works by index and `adt:active-tab` stores the
// index, so the order here is what the stored value means.
const tabs = computed(() => [ t("settings.tabs.lobbies"), t("settings.tabs.matches"), t("settings.tabs.boards"), t("settings.tabs.soundsAnimations") ]);
const activeSettings = useStorage("adt:active-settings", null);
const activeTab = useStorage("adt:active-tab", 0);
const showSettingsModal = ref(false);

const { config, ready } = useConfig();
const importFileInput = ref<HTMLInputElement>();

const mounted = useMounted();

// Use the composables
const { confirmDialog, showConfirmDialog, confirmDialogConfirm, confirmDialogCancel } = useConfirmDialog();
const { notification, showNotification, hideNotification } = useNotification();

/**
 * Return to whatever the user was looking at before opening the tools page.
 *
 * Exactly one history entry is added when the overlay opens (the pushState in
 * v2-menu.ts), so exactly one step back undoes it. This used to step back twice
 * because the old flow navigated to /settings first and then rewrote the URL,
 * adding two entries — stepping twice now overshoots onto an unrelated page.
 */
function goBack() {
  window.history.back();
}

function handleToggle(feature) {
  // Features not yet ported to v2 are inert — their selectors still target the
  // old site, so letting them be switched on would just fail silently.
  if (!feature.v2Ready) return;

  if (feature.hasSettings) {
    openSettingsModal(feature.id);
  }
}

// Function to get the title for a setting. The template calls it, so the
// heading follows the language.
function getSettingTitle(settingId) {
  for (const group of featureGroups) {
    const feature = group.features.find(f => f.id === settingId);
    if (feature) return t("settings.dialogTitle", { feature: t(feature.nameKey) });
  }
  return t("settings.title");
}

// Function to get the component for a setting
function getSettingWidth(settingId) {
  for (const group of featureGroups) {
    const feature = group.features.find(f => f.id === settingId);
    if (feature) return feature.wideSettings ? "widest" : "wide";
  }
  return "wide";
}

function getSettingFill(settingId) {
  for (const group of featureGroups) {
    const feature = group.features.find(f => f.id === settingId);
    if (feature) return !!feature.fillSettings;
  }
  return false;
}

function getComponentForSetting(settingId) {
  for (const group of featureGroups) {
    const feature = group.features.find(f => f.id === settingId && f.hasSettings);
    if (feature) {
      return feature.component;
    }
  }
  return null;
}

// Function to open settings modal
function openSettingsModal(settingId) {
  activeSettings.value = settingId;
  showSettingsModal.value = true;
}

// Function to close settings modal
function closeSettingsModal() {
  showSettingsModal.value = false;
  setTimeout(() => {
    activeSettings.value = null;
  }, 300); // Wait for animation to complete
}

async function exportSettings() {
  await ready();
  if (!config.value) return;

  interface ExportData {
    config: IConfig;
    exportDate: string;
    version: string;
    sounds: {
      caller: ISound[];
      soundFx: ISound[];
    };
  }

  const exportData: ExportData = {
    config: config.value,
    exportDate: new Date().toISOString(),
    version: "1.0",
    sounds: {
      caller: [],
      soundFx: [],
    },
  };

  // Add sounds from IndexedDB if available
  if (isIndexedDBAvailable()) {
    try {
      // Get all sounds from IndexedDB
      const callerSounds = await getAllCallerSoundsFromIndexedDB();
      const soundFxSounds = await getAllSoundFxFromIndexedDB();

      if (callerSounds) {
        // Convert IndexedDB sound format to ISound format
        exportData.sounds.caller = callerSounds.map(sound => ({
          name: sound.name,
          url: "", // Ensure url field exists
          base64: sound.base64,
          enabled: true,
          triggers: [], // Empty triggers array as default
          soundId: sound.id,
        }));
      }

      if (soundFxSounds) {
        // Convert IndexedDB sound format to ISound format
        exportData.sounds.soundFx = soundFxSounds.map(sound => ({
          name: sound.name,
          url: "", // Ensure url field exists
          base64: sound.base64,
          enabled: true,
          triggers: [], // Empty triggers array as default
          soundId: sound.id,
        }));
      }

      console.log("Autodarts Tools: Loaded sounds for export", {
        caller: callerSounds?.length || 0,
        soundFx: soundFxSounds?.length || 0,
      });
    } catch (error) {
      console.error("Autodarts Tools: Error exporting sounds from IndexedDB", error);
      showNotification(t("settings.notifications.exportSoundsFailed"), "error");
    }
  }

  // Convert to JSON and then to base64
  const jsonString = JSON.stringify(exportData);
  const base64String = btoa(encodeURIComponent(jsonString));

  // Create a blob and download it
  const blob = new Blob([ base64String ], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `autodarts-tools-settings-${new Date().toISOString().split("T")[0]}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importSettings() {
  if (!importFileInput.value) {
    importFileInput.value = document.createElement("input");
    importFileInput.value.type = "file";
    importFileInput.value.accept = ".txt";
    importFileInput.value.onchange = async (e) => {
      const file = importFileInput.value?.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64String = e.target?.result as string;
          const jsonString = decodeURIComponent(atob(base64String));
          const importedData = JSON.parse(jsonString);

          if (!importedData.config) {
            showNotification(t("settings.notifications.invalidFile"), "error");
            return;
          }

          // Update the config
          const newConfig = {
            ...JSON.parse(JSON.stringify(defaultConfig)),
            ...renameSettings(JSON.parse(JSON.stringify(importedData.config))),
          };
          // An export from before a change of shape is merged as it is, so
          // Colors, Instant Replay and Teams are brought up to date here, and
          // a renamed setting (Team Lobby, now Local Lobby) is carried over
          // before the merge, which would otherwise shadow it with the new
          // name's default; see renameSettings, normalizeColors,
          // normalizeInstantReplay and normalizeTeams.
          newConfig.colors = normalizeColors(newConfig.colors);
          newConfig.instantReplay = normalizeInstantReplay(newConfig.instantReplay);
          newConfig.teams = normalizeTeams(newConfig.teams);

          // Set the local ref
          config.value = newConfig;

          // Explicitly save to storage
          await AutodartsToolsConfig.setValue(newConfig);

          // Import sounds to IndexedDB if available
          if (importedData.sounds && isIndexedDBAvailable()) {
            try {
              // Clear existing sounds first if there are new sounds to import
              if (importedData.sounds.caller?.length > 0) {
                await clearCallerSoundsFromIndexedDB();
              }

              if (importedData.sounds.soundFx?.length > 0) {
                await clearSoundFxFromIndexedDB();
              }

              // Import caller sounds
              let callerImportCount = 0;
              if (importedData.sounds.caller?.length > 0) {
                for (const sound of importedData.sounds.caller) {
                  // Use existing soundId if available instead of creating a new one
                  const soundId = await saveSoundToIndexedDB(
                    sound.name,
                    sound.base64,
                    sound.soundId || sound.id, // Use existing soundId/id from imported data
                  );
                  if (soundId) {
                    callerImportCount++;

                    // Update the sound in config to reference the soundId
                    const soundInConfig = newConfig.caller.sounds.find(
                      s => s.name === sound.name && (!s.soundId || s.soundId === sound.soundId || s.soundId === sound.id),
                    );

                    if (soundInConfig) {
                      soundInConfig.soundId = soundId;
                      soundInConfig.base64 = ""; // Clear base64 data from config
                    }
                  }
                }
              }

              // Import soundFx sounds
              let soundFxImportCount = 0;
              if (importedData.sounds.soundFx?.length > 0) {
                for (const sound of importedData.sounds.soundFx) {
                  // Use existing soundId if available instead of creating a new one
                  const soundId = await saveSoundFxToIndexedDB(
                    sound.name,
                    sound.base64,
                    sound.soundId || sound.id, // Use existing soundId/id from imported data
                  );
                  if (soundId) {
                    soundFxImportCount++;

                    // Update the sound in config to reference the soundId
                    const soundInConfig = newConfig.soundFx.sounds.find(
                      s => s.name === sound.name && (!s.soundId || s.soundId === sound.soundId || s.soundId === sound.id),
                    );

                    if (soundInConfig) {
                      soundInConfig.soundId = soundId;
                      soundInConfig.base64 = ""; // Clear base64 data from config
                    }
                  }
                }
              }

              // Update the config with the updated sounds
              config.value = newConfig;
              await AutodartsToolsConfig.setValue(newConfig);

              console.log("Autodarts Tools: Imported sounds", {
                caller: callerImportCount,
                soundFx: soundFxImportCount,
              });
            } catch (error) {
              console.error("Autodarts Tools: Error importing sounds to IndexedDB", error);
              showNotification(t("settings.notifications.importSoundsFailed"), "error");
            }
          }

          showNotification(t("settings.notifications.imported"));

          // Reload the page after a short delay to allow the notification to be seen
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } catch (error) {
          console.error("Failed to import settings:", error);
          showNotification(t("settings.notifications.importFailed"), "error");
        }
      };
      reader.readAsText(file);
    };
  }
  importFileInput.value.click();
}

// State for danger zone
const showDangerZone = ref(false);

/** The What's New dialog, so the advanced panel can re-open it. */
const whatsNew = ref<InstanceType<typeof WhatsNew>>();

function openKofi() {
  window.open("https://ko-fi.com/creazy231", "_blank", "noopener,noreferrer");
}

function toggleDangerZone() {
  showDangerZone.value = !showDangerZone.value;
}

function resetAllSettings() {
  showConfirmDialog(
    t("settings.danger.resetTitle"),
    t("settings.danger.resetConfirm"),
    async () => {
      // Clear the IndexedDB sound files
      if (isIndexedDBAvailable()) {
        try {
          await clearCallerSoundsFromIndexedDB();
          await clearSoundFxFromIndexedDB();
          console.log("Autodarts Tools: IndexedDB sounds cleared");
        } catch (error) {
          console.error("Autodarts Tools: Error clearing IndexedDB sounds", error);
        }
      }

      config.value = { ...defaultConfig };

      // Explicitly save to storage
      await AutodartsToolsConfig.setValue(defaultConfig);
      await new Promise(resolve => setTimeout(resolve, 1000));

      showNotification(t("settings.notifications.resetDone"));

      // Close danger zone
      showDangerZone.value = false;

      // Reload the page after a short delay to allow the notification to be seen
      setTimeout(() => {
        window.location.reload();
        // After reload, navigate to first tab
        activeTab.value = 0;
      }, 1500);
    },
  );
}

async function copyToClipboard() {
  await ready();
  if (!config.value) return;

  interface ExportData {
    config: IConfig;
    exportDate: string;
    version: string;
    sounds: {
      caller: ISound[];
      soundFx: ISound[];
    };
  }

  const exportData: ExportData = {
    config: config.value,
    exportDate: new Date().toISOString(),
    version: "1.0",
    sounds: {
      caller: [],
      soundFx: [],
    },
  };

  // Add sounds from IndexedDB if available
  if (isIndexedDBAvailable()) {
    try {
      // Get all sounds from IndexedDB
      const callerSounds = await getAllCallerSoundsFromIndexedDB();
      const soundFxSounds = await getAllSoundFxFromIndexedDB();

      if (callerSounds) {
        // Convert IndexedDB sound format to ISound format
        exportData.sounds.caller = callerSounds.map(sound => ({
          name: sound.name,
          url: "", // Ensure url field exists
          base64: sound.base64,
          enabled: true,
          triggers: [], // Empty triggers array as default
          soundId: sound.id,
        }));
      }

      if (soundFxSounds) {
        // Convert IndexedDB sound format to ISound format
        exportData.sounds.soundFx = soundFxSounds.map(sound => ({
          name: sound.name,
          url: "", // Ensure url field exists
          base64: sound.base64,
          enabled: true,
          triggers: [], // Empty triggers array as default
          soundId: sound.id,
        }));
      }

      console.log("Autodarts Tools: Copied sounds to clipboard", {
        caller: callerSounds?.length || 0,
        soundFx: soundFxSounds?.length || 0,
      });
    } catch (error) {
      console.error("Autodarts Tools: Error copying sounds from IndexedDB", error);
      showNotification(t("settings.notifications.copySoundsFailed"), "error");
    }
  }

  // Convert to JSON and then to base64
  const jsonString = JSON.stringify(exportData);
  const base64String = btoa(encodeURIComponent(jsonString));

  // Copy to clipboard
  navigator.clipboard.writeText(base64String)
    .then(() => {
      showNotification(t("settings.notifications.copied"));
    })
    .catch((err) => {
      console.error("Failed to copy settings to clipboard:", err);
      showNotification(t("settings.notifications.copyFailed"), "error");
    });
}

function pasteFromClipboard() {
  navigator.clipboard.readText()
    .then(async (text) => {
      try {
        const jsonString = decodeURIComponent(atob(text));
        const importedData = JSON.parse(jsonString);

        if (!importedData.config) {
          showNotification(t("settings.notifications.invalidData"), "error");
          return;
        }

        // Update the config
        const newConfig = {
          ...JSON.parse(JSON.stringify(defaultConfig)),
          ...renameSettings(JSON.parse(JSON.stringify(importedData.config))),
        };
        // An export from before a change of shape is merged as it is, so
        // Colors, Instant Replay and Teams are brought up to date here, and
        // a renamed setting (Team Lobby, now Local Lobby) is carried over
        // before the merge, which would otherwise shadow it with the new
        // name's default; see renameSettings, normalizeColors,
        // normalizeInstantReplay and normalizeTeams.
        newConfig.colors = normalizeColors(newConfig.colors);
        newConfig.instantReplay = normalizeInstantReplay(newConfig.instantReplay);
        newConfig.teams = normalizeTeams(newConfig.teams);

        // Set the local ref
        config.value = newConfig;

        // Explicitly save to storage
        await AutodartsToolsConfig.setValue(newConfig);

        // Import sounds to IndexedDB if available
        if (importedData.sounds && isIndexedDBAvailable()) {
          try {
            // Clear existing sounds first if there are new sounds to import
            if (importedData.sounds.caller?.length > 0) {
              await clearCallerSoundsFromIndexedDB();
            }

            if (importedData.sounds.soundFx?.length > 0) {
              await clearSoundFxFromIndexedDB();
            }

            // Import caller sounds
            let callerImportCount = 0;
            if (importedData.sounds.caller?.length > 0) {
              for (const sound of importedData.sounds.caller) {
                // Use existing soundId if available instead of creating a new one
                const soundId = await saveSoundToIndexedDB(
                  sound.name,
                  sound.base64,
                  sound.soundId || sound.id, // Use existing soundId/id from imported data
                );
                if (soundId) {
                  callerImportCount++;

                  // Update the sound in config to reference the soundId
                  const soundInConfig = newConfig.caller.sounds.find(
                    s => s.name === sound.name && (!s.soundId || s.soundId === sound.soundId || s.soundId === sound.id),
                  );

                  if (soundInConfig) {
                    soundInConfig.soundId = soundId;
                    soundInConfig.base64 = ""; // Clear base64 data from config
                  }
                }
              }
            }

            // Import soundFx sounds
            let soundFxImportCount = 0;
            if (importedData.sounds.soundFx?.length > 0) {
              for (const sound of importedData.sounds.soundFx) {
                // Use existing soundId if available instead of creating a new one
                const soundId = await saveSoundFxToIndexedDB(
                  sound.name,
                  sound.base64,
                  sound.soundId || sound.id, // Use existing soundId/id from imported data
                );
                if (soundId) {
                  soundFxImportCount++;

                  // Update the sound in config to reference the soundId
                  const soundInConfig = newConfig.soundFx.sounds.find(
                    s => s.name === sound.name && (!s.soundId || s.soundId === sound.soundId || s.soundId === sound.id),
                  );

                  if (soundInConfig) {
                    soundInConfig.soundId = soundId;
                    soundInConfig.base64 = ""; // Clear base64 data from config
                  }
                }
              }
            }

            // Update the config with the updated sounds
            config.value = newConfig;
            await AutodartsToolsConfig.setValue(newConfig);

            console.log("Autodarts Tools: Imported sounds from clipboard", {
              caller: callerImportCount,
              soundFx: soundFxImportCount,
            });
          } catch (error) {
            console.error("Autodarts Tools: Error importing sounds from clipboard to IndexedDB", error);
            showNotification(t("settings.notifications.importSoundsFailed"), "error");
          }
        }

        showNotification(t("settings.notifications.imported"));

        // Reload the page after a short delay to allow the notification to be seen
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (error) {
        console.error("Failed to import settings from clipboard:", error);
        showNotification(t("settings.notifications.pasteImportFailed"), "error");
      }
    })
    .catch((err) => {
      console.error("Failed to read from clipboard:", err);
      showNotification(t("settings.notifications.pasteReadFailed"), "error");
    });
}
</script>

<style>
input[type="color"] {
  -webkit-appearance: none;
  border: none;
}

input[type="color"]::-webkit-color-swatch-wrapper {
  padding: 0;
}

input[type="color"]::-webkit-color-swatch {
  border: none;
}

.gradient-mask-left {
  mask-image: linear-gradient(to right, transparent 10%, black 60%);
  -webkit-mask-image: linear-gradient(to right, transparent 10%, black 60%);
}
</style>
