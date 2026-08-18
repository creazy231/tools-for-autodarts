<template>
  <AppModal @close="closeModal" size="lg" :show="showModal" title="Update Available" :disable-backdrop-click="true" :hide-close-button="true">
    <p class="mb-4 text-[var(--adt-text)]">
      A new version of <b>Tools for Autodarts</b> is available. You can migrate your settings now or continue with default settings.
    </p>

    <div class="mb-4 rounded-md border border-yellow-700/50 bg-yellow-800/30 p-3">
      <p class="text-sm text-yellow-200">
        <b>Note:</b> Sound, caller, and animation features have been reworked, and their settings cannot be migrated automatically.
        You can download your old settings for reference.
      </p>
      <AppButton @click="downloadOldConfig" type="default" auto size="sm" class="mt-2">
        Download Settings
      </AppButton>
    </div>

    <p class="text-sm opacity-60">
      Continueing without migration will reset your settings to default.
    </p>

    <template #footer>
      <AppButton @click="showConfirmDialog" type="danger">
        Continue without
      </AppButton>
      <AppButton @click="migrateSettings" type="success">
        Migrate now
      </AppButton>
    </template>
  </AppModal>

  <ConfirmDialog
    @confirm="confirmContinueWithout"
    @cancel="cancelContinueWithout"
    :show="showConfirm"
    title="Continue without migration?"
    message="This will reset all your settings to default. Any custom configurations will be lost."
    confirm-text="Continue"
    cancel-text="Go back"
  />

  <AppNotification
    @close="showNotification = false"
    :show="showNotification"
    message="Settings migrated successfully. Page is reloading..."
    type="success"
    :duration="3000"
  />
</template>

<script setup lang="ts">
import type { IConfig } from "@/utils/storage";

import AppModal from "@/components/AppModal.vue";
import AppButton from "@/components/AppButton.vue";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import AppNotification from "@/components/AppNotification.vue";
import { AutodartsToolsConfig } from "@/utils/storage";
import { clearCallerSoundsFromIndexedDB, clearSoundFxFromIndexedDB, isIndexedDBAvailable } from "@/utils/helpers";

interface OldConfig {
  version: number;
  discord: {
    enabled: boolean;
    manually: boolean;
    url: string;
  };
  autoStart: {
    enabled: boolean;
  };
  streamingMode: {
    enabled: boolean;
    backgroundImage: boolean;
    chromaKeyColor: string;
    image: string;
    throws: boolean;
    footerText: string;
    board: boolean;
    boardImage: boolean;
    avg: boolean;
    scoreBoardSettings: {
      scale: number;
      x: number;
      y: number;
    };
    coordsSettings: {
      scale: number;
      x: number;
      y: number;
    };
  };
  colors: {
    enabled: boolean;
    background: string;
    text: string;
  };
  recentLocalPlayers: {
    enabled: boolean;
    cap: number;
    players: any[];
  };
  takeout: {
    enabled: boolean;
  };
  inactiveSmall: {
    enabled: boolean;
  };
  caller: {
    enabled: boolean;
  };
  sounds: {
    enabled: boolean;
  };
  externalBoards: {
    enabled: boolean;
    boards: any[];
  };
  menuDisabled: boolean;
  legsSetsLarger: {
    enabled: boolean;
    value: number;
  };
  playerMatchData: {
    enabled: boolean;
    value: number;
  };
  automaticNextLeg: {
    enabled: boolean;
    sec: number;
  };
  winnerAnimation: {
    enabled: boolean;
  };
  thrownDartsOnWin: {
    enabled: boolean;
  };

  nextPlayerAfter3darts: {
    enabled: boolean;
  };
  nextPlayerOnTakeOutStuck: {
    enabled: boolean;
    sec: number;
  };
  teamLobby: {
    enabled: boolean;
  };

  animations: {
    enabled: boolean;
    startDelay: number;
    endDelay: number;
    objectFit: string;
    winner: Array<{
      info: string;
    }>;
    bull: Array<{
      info: string;
    }>;
    oneEighty: Array<{
      info: string;
    }>;
    miss: Array<{
      info: string;
    }>;
    bust: Array<{
      info: string;
    }>;
  };
}

const showModal = ref(false);
const showConfirm = ref(false);
const showNotification = ref(false);

onMounted(() => {
  showModal.value = true;
});

function closeModal() {
  showModal.value = false;
}

function showConfirmDialog() {
  showConfirm.value = true;
}

async function confirmContinueWithout() {
  // Delete old storage keys
  await browser.storage.local.remove([ "config", "soundsconfig", "callerconfig", "matchstatus", "soundstartstatus" ]);

  showConfirm.value = false;
  closeModal();
}

function cancelContinueWithout() {
  showConfirm.value = false;
}

async function downloadOldConfig() {
  try {
    const { config: oldConfig } = await browser.storage.local.get("config") as { config: OldConfig };
    const { soundsconfig: oldSounds } = await browser.storage.local.get("soundsconfig");
    const { callerconfig: oldCallerConfig } = await browser.storage.local.get("callerconfig");

    // Create a human-readable text format of the settings
    let settingsText = "# Autodarts Tools - Old Settings Backup\n\n";

    // Add animations settings
    settingsText += "## Animation Settings\n";
    settingsText += `${JSON.stringify(oldConfig?.animations || {}, null, 2)}\n\n`;

    // Add sounds settings
    settingsText += "## Sound Settings\n";
    settingsText += `${JSON.stringify(oldSounds || {}, null, 2)}\n\n`;

    // Add caller settings
    settingsText += "## Caller Settings\n";
    settingsText += `${JSON.stringify(oldCallerConfig || {}, null, 2)}\n\n`;

    // Create a blob with the text content
    const blob = new Blob([ settingsText ], { type: "text/plain" });

    // Create a URL for the blob
    const url = URL.createObjectURL(blob);

    // Create a temporary anchor element to trigger the download
    const a = document.createElement("a");
    a.href = url;
    a.download = "autodarts-tools-old-settings.txt";
    document.body.appendChild(a);
    a.click();

    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    console.error("Error downloading old config:", error);
  }
}

async function migrateSettings() {
  console.log("Migrating settings...");
  const config: IConfig = await AutodartsToolsConfig.getValue();
  const { config: oldConfig } = await browser.storage.local.get("config") as { config: OldConfig };

  if (!oldConfig.version) {
    config.discord = oldConfig.discord;
    config.autoStart = oldConfig.autoStart;
    config.streamingMode = oldConfig.streamingMode;
    config.colors = oldConfig.colors;
    config.recentLocalPlayers = oldConfig.recentLocalPlayers;
    config.takeout = oldConfig.takeout;
    config.smallerScores = oldConfig.inactiveSmall;
    config.externalBoards = oldConfig.externalBoards;
    config.largerLegsSets = oldConfig.legsSetsLarger;
    config.largerPlayerMatchData = oldConfig.playerMatchData;
    config.automaticNextLeg = oldConfig.automaticNextLeg;
    config.winnerAnimation = oldConfig.winnerAnimation;

    config.nextPlayerOnTakeOutStuck = oldConfig.nextPlayerOnTakeOutStuck;
    config.teamLobby = oldConfig.teamLobby;

    await AutodartsToolsConfig.setValue(config);
  } else {
    // @ts-expect-error
    await AutodartsToolsConfig.setValue(oldConfig);
  };

  // Delete old storage keys
  await browser.storage.local.remove([ "config", "soundsconfig", "callerconfig", "matchstatus", "soundstartstatus" ]);

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

  closeModal();

  // Show success notification
  showNotification.value = true;

  // Wait a moment for the notification to be visible before reloading
  setTimeout(() => {
    window.location.reload();
  }, 2000);
}
</script>
