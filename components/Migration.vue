<template>
  <AppModal @close="closeModal" size="lg" :show="showModal" :title="t('migration.title')" :disable-backdrop-click="true" :hide-close-button="true">
    <p class="mb-4 text-[var(--adt-text)]">
      <AppTrans path="migration.intro" />
    </p>

    <div class="mb-4 rounded-md border border-yellow-700/50 bg-yellow-800/30 p-3">
      <p class="text-sm text-yellow-200">
        <AppTrans path="migration.note" />
      </p>
      <AppButton @click="downloadOldConfig" type="default" auto size="sm" class="mt-2">
        {{ t("migration.download") }}
      </AppButton>
    </div>

    <p class="text-sm opacity-60">
      {{ t("migration.resetWarning") }}
    </p>

    <template #footer>
      <AppButton @click="showConfirmDialog" type="danger">
        {{ t("migration.continueWithout") }}
      </AppButton>
      <AppButton @click="migrateSettings" type="success">
        {{ t("migration.migrateNow") }}
      </AppButton>
    </template>
  </AppModal>

  <ConfirmDialog
    @confirm="confirmContinueWithout"
    @cancel="cancelContinueWithout"
    :show="showConfirm"
    :title="t('migration.confirm.title')"
    :message="t('migration.confirm.message')"
    :confirm-text="t('migration.confirm.confirmText')"
    :cancel-text="t('migration.confirm.cancelText')"
  />

  <AppNotification
    @close="showNotification = false"
    :show="showNotification"
    :message="t('migration.migrated')"
    type="success"
    :duration="3000"
  />
</template>

<script setup lang="ts">
import type { IConfig } from "@/utils/storage";

import AppModal from "@/components/AppModal.vue";
import AppButton from "@/components/AppButton.vue";
import AppTrans from "@/components/AppTrans.vue";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import AppNotification from "@/components/AppNotification.vue";
import { AutodartsToolsConfig } from "@/utils/storage";
import { normalizeColors } from "@/utils/colors";
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

const { t } = useI18n();

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
    config.colors = normalizeColors(oldConfig.colors);
    config.recentLocalPlayers = oldConfig.recentLocalPlayers;
    config.takeout = oldConfig.takeout;
    config.smallerScores = oldConfig.inactiveSmall;
    config.externalBoards = oldConfig.externalBoards;
    config.largerLegsSets = oldConfig.legsSetsLarger;
    config.largerPlayerMatchData = oldConfig.playerMatchData;
    config.automaticNextLeg = oldConfig.automaticNextLeg;
    config.winnerAnimation = oldConfig.winnerAnimation;

    config.nextPlayerOnTakeOutStuck = oldConfig.nextPlayerOnTakeOutStuck;
    // v1 called Local Lobby "teamLobby".
    config.localLobby = oldConfig.teamLobby ?? config.localLobby;

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
