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

    <!-- Settings Modal -->
    <SettingsModal
      @close="closeSettingsModal"
      v-if="activeSettings && getComponentForSetting(activeSettings)"
      :show="showSettingsModal"
      :title="getSettingTitle(activeSettings)"
    >
      <component @setting-change="handleSettingChange" :is="getComponentForSetting(activeSettings)" :config="config" />
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
          <div class="mt-2 grid grid-cols-2 items-center gap-2 sm:mt-0 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]">
            <AppButton
              @click="exportSettings"
              title="Download settings as file"
            >
              <span class="icon-[pixelarticons--calendar-export] mr-2" />
              <span>Export</span>
            </AppButton>
            <AppButton
              @click="importSettings"
              title="Import settings from file"
            >
              <span class="icon-[pixelarticons--calendar-import] mr-2" />
              <span>Import</span>
            </AppButton>
            <AppButton
              @click="copyToClipboard"
              title="Copy settings to clipboard"
            >
              <span class="icon-[pixelarticons--copy] mr-2" />
              <span>Copy</span>
            </AppButton>
            <AppButton
              @click="pasteFromClipboard"
              title="Paste settings from clipboard"
            >
              <span class="icon-[pixelarticons--calendar-import] mr-2" />
              <span>Paste</span>
            </AppButton>
            <AppButton
              @click="toggleDangerZone"
              title="Advanced settings"
              class="aspect-square size-10 p-0"
            >
              <span class="icon-[material-symbols--settings-suggest-outline]" />
            </AppButton>
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
              <h2 class="text-xl font-bold text-white">
                Support the Project
              </h2>
              <AppButton @click="toggleDangerZone" auto class="text-white/70 hover:text-white">
                <span class="icon-[pixelarticons--close]" />
              </AppButton>
            </div>
            <p class="text-white/70">
              Autodarts Tools is free and open source. If you enjoy using it, consider supporting the development to keep it going!
            </p>
            <AppButton
              @click="openKofi"
              type="success"
              auto
            >
              <span class="icon-[pixelarticons--heart] mr-2" />
              <span>Support on Ko-fi</span>
            </AppButton>
          </div>

          <!-- Danger Zone -->
          <div class="adt-container space-y-6">
            <div class="flex items-center">
              <h2 class="text-xl font-bold text-red-400">
                Danger Zone
              </h2>
            </div>
            <div class="space-y-4">
              <p class="text-white/70">
                These actions are destructive and cannot be undone. Please proceed with caution and may export your settings before proceeding.
              </p>
              <div class="rounded border border-red-500/30 bg-red-500/5 p-4">
                <div class="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                  <div>
                    <h3 class="font-semibold text-red-300">
                      Reset All Settings
                    </h3>
                    <p class="text-sm text-white/60">
                      This will reset all settings to their default values. All your customizations will be lost.
                    </p>
                  </div>
                  <AppButton
                    @click="resetAllSettings"
                    auto
                    type="danger"
                  >
                    Reset All Settings
                  </AppButton>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Feature cards grid -->
        <template v-if="mounted">
          <div
            v-if="!showDangerZone"
            :key="reloadKey"
            class="grid grid-cols-1 gap-5 lg:grid-cols-2"
          >

            <!-- Warning message for sound and animation features -->
            <div
              v-if="featureGroups[activeTab].id==='sounds-animations'"
              class="col-span-full rounded-md border border-yellow-500/50 bg-yellow-500/10 p-4 text-xs"
            >
              <div class="flex items-start">
                <div>
                  <p class="font-medium text-yellow-400">
                    Performance Warning
                  </p>
                  <p class="mt-1 text-white/70">
                    Enabling the <b>Animations</b>, <b>Caller</b>, or <b>Sound FX</b> features may cause performance issues and may require decent hardware.
                    If you experience any lags or errors, try disabling these features.
                  </p>
                </div>
              </div>
            </div>

            <!--
              Feature Cards.

              The disabled state lives on this wrapper rather than on the
              component: several settings components have two root templates
              (panel / card), which makes them multi-root, and Vue does not
              apply fallthrough attributes to those — the class silently landed
              on only the single-root ones.
            -->
            <div
              v-for="(feature, idx) in featureGroups[activeTab].features"
              :key="feature.id"
              :class="[ 'relative', { 'adt-feature-disabled': !feature.v2Ready } ]"
            >
              <component
                :is="feature.component"
                :data-feature-index="idx + 1"
                @setting-change="updateConfig"
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
import { useDebounceFn, useStorage } from "@vueuse/core";

import DiscordWebhooks from "./Settings/DiscordWebhooks.vue";
import AutoStart from "./Settings/AutoStart.vue";
import RecentLocalPlayers from "./Settings/RecentLocalPlayers.vue";
import ShufflePlayers from "./Settings/ShufflePlayers.vue";
import TeamLobby from "./Settings/TeamLobby.vue";
import QrCode from "./Settings/QrCode.vue";
import Colors from "./Settings/Colors.vue";
import TakeoutNotification from "./Settings/TakeoutNotification.vue";
import NextPlayerOnTakeoutStuck from "./Settings/NextPlayerOnTakeoutStuck.vue";
import AutomaticNextLeg from "./Settings/AutomaticNextLeg.vue";
import SmallerScores from "./Settings/SmallerScores.vue";
import StreamingMode from "./Settings/StreamingMode.vue";
import HideMenuInMatch from "./Settings/HideMenuInMatch.vue";
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
import QuickCorrection from "./Settings/QuickCorrection.vue";
import EnhancedScoringDisplay from "./Settings/EnhancedScoringDisplay.vue";
import InstantReplay from "./Settings/InstantReplay.vue";
import Gotcha from "./Settings/Gotcha.vue";
import CheckoutGuide from "./Settings/CheckoutGuide.vue";

import packageConfig from "../package.json";

import type { IConfig, ISound } from "@/utils/storage";

import { AutodartsToolsConfig, defaultConfig } from "@/utils/storage";
import { clearCallerSoundsFromIndexedDB, clearSoundFxFromIndexedDB, getAllCallerSoundsFromIndexedDB, getAllSoundFxFromIndexedDB, isIndexedDBAvailable, saveSoundFxToIndexedDB, saveSoundToIndexedDB } from "@/utils/helpers";
import AppButton from "@/components/AppButton.vue";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import AppNotification from "@/components/AppNotification.vue";
import SettingsModal from "@/components/SettingsModal.vue";
import { useConfirmDialog } from "@/composables/useConfirmDialog";
import { useNotification } from "@/composables/useNotification";
import AppTabs from "@/components/AppTabs.vue";

// Define feature groups with titles for modals
interface Feature {
  id: string;
  title: string;
  component: Component;
  hasSettings: boolean;
  /** Ported to the rebuilt site. Absent means "not yet" — the card renders inert. */
  v2Ready?: boolean;
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
      { id: "discord-webhooks", title: "Discord Webhooks Settings", component: DiscordWebhooks, hasSettings: true },
      { id: "auto-start", title: "Auto Start Settings", component: AutoStart, hasSettings: false },
      { id: "recent-local-players", title: "Recent Local Players Settings", component: RecentLocalPlayers, hasSettings: true },
      { id: "shuffle-players", title: "Shuffle Players Settings", component: ShufflePlayers, hasSettings: false },
      { id: "team-lobby", title: "Team Lobby Settings", component: TeamLobby, hasSettings: false },
      { id: "qr-code", title: "QR Code Settings", component: QrCode, hasSettings: false },
    ],
    settingIds: [ "discord-webhooks", "recent-local-players" ],
  },
  // Matches (Tab 1)
  {
    id: "matches",
    tab: 1,
    features: [
      { id: "colors", title: "Colors Settings", component: Colors, hasSettings: true },
      { id: "takeout-notification", title: "Takeout Notification Settings", component: TakeoutNotification, hasSettings: false },
      { id: "next-player-on-takeout-stuck", title: "Next Player On Takeout Stuck Settings", component: NextPlayerOnTakeoutStuck, hasSettings: true },
      { id: "automatic-next-leg", title: "Automatic Next Leg Settings", component: AutomaticNextLeg, hasSettings: true },
      { id: "smaller-scores", title: "Smaller Scores Settings", component: SmallerScores, hasSettings: false },
      { id: "hide-menu-in-match", title: "Hide Menu In Match Settings", component: HideMenuInMatch, hasSettings: false },
      { id: "streaming-mode", title: "Streaming Mode Settings", component: StreamingMode, hasSettings: true },
      { id: "larger-legs-sets", title: "Larger Legs Sets Settings", component: LargerLegsSets, hasSettings: true },
      { id: "larger-player-names", title: "Larger Player Names Settings", component: LargerPlayerNames, hasSettings: true },
      { id: "larger-player-match-data", title: "Larger Player Match Data Settings", component: LargerPlayerMatchData, hasSettings: true },
      { id: "winner-animation", title: "Winner Animation Settings", component: WinnerAnimation, hasSettings: false },
      { id: "automatic-fullscreen", title: "Automatic Fullscreen Settings", component: AutomaticFullscreen, hasSettings: false },
      { id: "zoom", title: "Darts Zoom Settings", component: Zoom, hasSettings: true },
      { id: "quick-correction", title: "Quick Correction Settings", component: QuickCorrection, hasSettings: true },
      { id: "enhanced-scoring-display", title: "Enhanced Scoring Display Settings", component: EnhancedScoringDisplay, hasSettings: false },
      { id: "instant-replay", title: "Instant Replay Settings", component: InstantReplay, hasSettings: true },
      { id: "gotcha", title: "Gotcha Settings", component: Gotcha, hasSettings: false },
      { id: "checkout-guide", title: "Checkout Guide Settings", component: CheckoutGuide, hasSettings: false },
    ],
    settingIds: [ "colors", "next-player-on-takeout-stuck", "automatic-next-leg", "streaming-mode", "larger-legs-sets", "larger-player-names", "larger-player-match-data", "automatic-fullscreen", "zoom", "quick-correction", "instant-replay" ],
  },
  // Boards (Tab 2)
  {
    id: "boards",
    tab: 2,
    features: [
      { id: "external-boards", title: "External Boards Settings", component: ExternalBoards, hasSettings: false },
    ],
    settingIds: [],
  },
  // Sounds & Animations (Tab 3)
  {
    id: "sounds-animations",
    tab: 3,
    features: [
      { id: "animations", title: "Animations Settings", component: Animations, hasSettings: true },
      { id: "caller", title: "Caller Settings", component: Caller, hasSettings: true },
      { id: "sound-fx", title: "Sound FX Settings", component: SoundFx, hasSettings: true },
      { id: "wled-fx", title: "WLED Settings", component: Wled, hasSettings: true },
    ],
    settingIds: [ "animations", "caller", "sound-fx", "wled-fx" ],
  },
];

// Tabs component data
const tabs = ref([ "Lobbies", "Matches", "Boards", "Sounds & Animations" ]);
const activeSettings = useStorage("adt:active-settings", null);
const activeTab = useStorage("adt:active-tab", 0);
const showSettingsModal = ref(false);
const reloadKey = ref(0);

// Create a debounced function for updating reloadKey
const debouncedReload = useDebounceFn(() => {
  // Get the current scroll position before updating reloadKey
  const scrollContainers = [ document.querySelector("#root > div > div:nth-of-type(2)"), document.querySelector("html") ];
  const scrollPositions = scrollContainers.map(container => container?.scrollTop || 0);

  // Update reloadKey
  reloadKey.value++;

  // Restore scroll position after DOM update
  nextTick(() => {
    setTimeout(() => {
      scrollContainers.forEach((container, index) => {
        if (container) {
          container.scrollTop = scrollPositions[index];
        }
      });
    }, 250);
  });
}, 250); // 250ms debounce time

// Initialize config with default values to avoid null issues
const config = ref<IConfig>(defaultConfig);
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

onMounted(async () => {
  const loadedConfig = await AutodartsToolsConfig.getValue();
  if (loadedConfig) {
    config.value = loadedConfig;
  }
});

watch(config, async () => {
  // Save the config to storage
  await AutodartsToolsConfig.setValue(toRaw(config.value));
  debouncedReload();
}, { deep: true });

function handleToggle(feature) {
  // Features not yet ported to v2 are inert — their selectors still target the
  // old site, so letting them be switched on would just fail silently.
  if (!feature.v2Ready) return;

  if (feature.hasSettings) {
    openSettingsModal(feature.id);
  }
}

// Function to get the title for a setting
function getSettingTitle(settingId) {
  for (const group of featureGroups) {
    const feature = group.features.find(f => f.id === settingId);
    if (feature) {
      // Titles are stored as "<Feature> Settings"; the dialog shows the
      // "Settings - <Feature>" form, which is the only heading now.
      return `Settings - ${feature.title.replace(/\s*Settings$/, "")}`;
    }
  }
  return "Settings";
}

// Function to handle setting changes
function handleSettingChange() {
  updateConfig();
}

// Function to get the component for a setting
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
  config.value = await AutodartsToolsConfig.getValue();
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
      showNotification("Error exporting sound files", "error");
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
            showNotification("Invalid settings file", "error");
            return;
          }

          // Update the config
          const newConfig = {
            ...JSON.parse(JSON.stringify(defaultConfig)),
            ...JSON.parse(JSON.stringify(importedData.config)),
          };

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
              showNotification("Settings imported, but error importing sounds", "error");
            }
          }

          showNotification("Settings imported successfully. Page will reload to apply changes...");

          // Reload the page after a short delay to allow the notification to be seen
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } catch (error) {
          console.error("Failed to import settings:", error);
          showNotification("Failed to import settings", "error");
        }
      };
      reader.readAsText(file);
    };
  }
  importFileInput.value.click();
}

// State for danger zone
const showDangerZone = ref(false);

function openKofi() {
  window.open("https://ko-fi.com/creazy231", "_blank", "noopener,noreferrer");
}

function toggleDangerZone() {
  showDangerZone.value = !showDangerZone.value;
}

function resetAllSettings() {
  showConfirmDialog(
    "Reset All Settings",
    "This will reset all settings to their default values. All your customizations will be lost. Are you sure you want to continue?",
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

      showNotification("All settings have been reset to default. Page will reload to apply changes...");

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
  config.value = await AutodartsToolsConfig.getValue();
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
      showNotification("Settings copied, but error including sounds", "error");
    }
  }

  // Convert to JSON and then to base64
  const jsonString = JSON.stringify(exportData);
  const base64String = btoa(encodeURIComponent(jsonString));

  // Copy to clipboard
  navigator.clipboard.writeText(base64String)
    .then(() => {
      showNotification("Settings copied to clipboard");
    })
    .catch((err) => {
      console.error("Failed to copy settings to clipboard:", err);
      showNotification("Failed to copy settings to clipboard", "error");
    });
}

function pasteFromClipboard() {
  navigator.clipboard.readText()
    .then(async (text) => {
      try {
        const jsonString = decodeURIComponent(atob(text));
        const importedData = JSON.parse(jsonString);

        if (!importedData.config) {
          showNotification("Invalid settings data", "error");
          return;
        }

        // Update the config
        const newConfig = {
          ...JSON.parse(JSON.stringify(defaultConfig)),
          ...JSON.parse(JSON.stringify(importedData.config)),
        };

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
            showNotification("Settings imported, but error importing sounds", "error");
          }
        }

        showNotification("Settings imported successfully. Page will reload to apply changes...");

        // Reload the page after a short delay to allow the notification to be seen
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (error) {
        console.error("Failed to import settings from clipboard:", error);
        showNotification("Failed to import settings from clipboard", "error");
      }
    })
    .catch((err) => {
      console.error("Failed to read from clipboard:", err);
      showNotification("Failed to read from clipboard", "error");
    });
}

async function updateConfig() {
  config.value = await AutodartsToolsConfig.getValue();
  debouncedReload();
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
