<template>
  <template v-if="!$attrs['data-feature-index']">
    <!-- Settings Panel -->
    <!-- Visible overflow so the list's heading can stick; see Wled.vue. -->
    <div v-if="config" class="adt-container !overflow-visible">
      <div class="relative z-10 pr-2 text-[var(--ad-text-secondary)]">
        <p class="mb-6 max-w-3xl">
          {{ t("caller.intro") }}
        </p>

        <section class="mb-10">
          <h3 class="adt-section-title">
            {{ t("caller.sections.options") }}
          </h3>
          <OptionRow :description="t('caller.callEveryDart.description')" :title="t('caller.callEveryDart.title')">
            <AppToggle v-model="config.caller.callEveryDart" size="sm" />
          </OptionRow>
          <OptionRow :description="t('caller.callCheckout.description')" :title="t('caller.callCheckout.title')">
            <AppToggle v-model="config.caller.callCheckout" size="sm" />
          </OptionRow>
          <OptionRow :title="t('caller.combinedThrows.title')">
            <template #description>
              <AppTrans :params="{ token: 's20_s5_s1' }" path="caller.combinedThrows.description" />
            </template>
            <AppToggle v-model="config.caller.preferCombinedThrows" size="sm" />
          </OptionRow>
          <OptionRow :description="t('caller.gameModes.description')" :title="t('gameModes.title')">
            <GameModesField v-model="config.caller.disabledGameModes" :intro="t('caller.gameModes.intro')" feature="caller" />
          </OptionRow>
        </section>

        <LibrarySection
          @reorder="moveSound"
          :empty-text="t('caller.list.emptyText')"
          :empty-title="t('library.sounds.emptyTitle')"
          :entries="entries"
          :search-placeholder="t('library.sounds.searchPlaceholder')"
          :title="t('library.sounds.title')"
          empty-icon="icon-[material-symbols--record-voice-over-outline-rounded]"
        >
          <template #actions>
            <AppMenu :items="moreActions">
              <template #trigger="{ open, toggle }">
                <button @click="toggle" :aria-expanded="open" :aria-label="t('library.moreActions')" class="adt-icon-btn" :title="t('library.more')" type="button">
                  <span class="icon-[material-symbols--more-horiz]" />
                </button>
              </template>
            </AppMenu>
            <AppMenu :items="addActions">
              <template #trigger="{ open, toggle }">
                <AppButton @click="toggle" :aria-expanded="open" auto size="sm" type="primary">
                  <span class="flex items-center gap-1">
                    <span class="icon-[material-symbols--add-rounded] text-lg" />
                    {{ t("common.add") }}
                    <span class="icon-[material-symbols--expand-more-rounded] -mr-1 text-lg" />
                  </span>
                </AppButton>
              </template>
            </AppMenu>
          </template>

          <template #default="{ entries: shown, filtering, query }">
            <LibraryItem
              @delete="removeSound(entry.index)"
              @edit="editAny(entry.index)"
              @toggle="config.caller.sounds[entry.index].enabled = $event"
              v-for="entry in shown"
              :key="stableKey(config.caller.sounds[entry.index])"
              :data-index="entry.index"
              :draggable="!filtering"
              :enabled="entry.enabled"
              :query="query"
              :title="entry.name"
              :triggers="entry.triggers"
            >
              <template #lead>
                <PlayButton @click="togglePlay(entry.index)" :label="entry.name" :playing="playingKey === stableKey(config.caller.sounds[entry.index])" />
              </template>
              <template #meta>
                <SoundSource :sound="config.caller.sounds[entry.index]" :voices="voices" />
                <VolumeBadge :sound="config.caller.sounds[entry.index]" />
              </template>
            </LibraryItem>
          </template>

          <template #empty>
            <AppButton @click="openImportURLModal" auto type="primary">
              {{ t("caller.import.title") }}
            </AppButton>
            <AppButton @click="openUploadModal" auto>
              {{ t("library.sounds.add.upload.label") }}
            </AppButton>
            <AppButton @click="openTTSModal()" :disabled="!isTTSAvailable" auto>
              {{ t("library.sounds.add.generate.label") }}
            </AppButton>
            <AppButton @click="openAddSoundModal" auto>
              {{ t("library.sounds.add.link.label") }}
            </AppButton>
          </template>
        </LibrarySection>
      </div>
    </div>

    <SoundDialog
      @close="closeSoundModal"
      @play="previewDraft"
      @save="saveSound"
      v-model:name="newSound.name"
      v-model:triggers="newSound.triggers"
      v-model:url="newSound.url"
      v-model:volume="newSound.volume"
      :editing="isEditMode"
      :has-file="draftHasFile"
      :louder-blocked="louderBlocked"
      :playing="playingKey === DRAFT_KEY"
      :show="showSoundModal"
      :url-error="urlErrorText"
      feature="caller"
    />

    <UploadDialog
      @close="closeUploadModal"
      @save="processFiles"
      :formats="t('library.upload.formatsAudio')"
      :names-hint="t('library.sounds.upload.namesHint')"
      :processing="isProcessing"
      :show="showUploadModal"
      :title="t('library.sounds.upload.title')"
      :triggers-from-name="file => extractTriggerFromFilename(file.name)"
      accept="audio/*"
      add-key="library.upload.addSounds"
      feature="caller"
      file-icon="icon-[material-symbols--audio-file-outline-rounded]"
    />

    <TtsDialog
      @close="closeTTSModal"
      @prelisten="prelistenTTS"
      @save="saveTTSSound"
      v-model:pitch="ttsForm.pitch"
      v-model:rate="ttsForm.rate"
      v-model:text="ttsForm.text"
      v-model:triggers="ttsForm.triggers"
      v-model:voice="ttsForm.voiceURI"
      v-model:volume="ttsForm.volume"
      :editing="ttsEditingIndex !== null"
      :show="showTTSModal"
      :speaking="isSpeaking"
      :voices="voices"
      feature="caller"
    />

    <AppModal @close="closeDeleteAllModal" :show="showDeleteAllModal" :title="t('library.sounds.deleteAll.title', { count: config?.caller.sounds.length ?? 0 })" ghost-close size="sm">
      <p class="text-sm text-[var(--ad-text-muted)]">
        {{ t("library.sounds.deleteAll.body") }}
      </p>
      <template #footer>
        <AppButton @click="closeDeleteAllModal" auto>
          {{ t("common.cancel") }}
        </AppButton>
        <AppButton @click="deleteAllSounds" auto type="danger">
          {{ t("library.deleteAll") }}
        </AppButton>
      </template>
    </AppModal>

    <AppModal @close="closeImportURLModal" :show="showImportURLModal" :title="t('caller.import.title')" ghost-close size="lg">
      <div class="space-y-5">
        <AppSelect
          id="preset-url"
          v-model="selectedPresetURL"
          :helper-text="t('caller.import.setHelper')"
          :label="t('caller.import.setLabel')"
          :options="callerSets"
        />
        <div>
          <AppInput id="base-url" v-model="baseURL" :label="t('caller.import.linkLabel')" :placeholder="t('caller.import.linkPlaceholder')" type="url">
            <template #icon>
              <span class="icon-[material-symbols--link-rounded]" />
            </template>
          </AppInput>
          <p class="adt-field-hint">
            {{ t("caller.import.linkHint") }}
          </p>
        </div>
        <AppAlert v-if="urlError" compact variant="error">
          {{ urlErrorText }}
        </AppAlert>

        <div v-if="isZipFile && (isDownloadingZip || isExtractingZip || isProcessingCsv)" class="space-y-4 rounded-[var(--ad-radius-lg)] bg-white/[.04] p-4">
          <div v-if="isDownloadingZip">
            <div class="mb-1.5 flex justify-between text-xs">
              <span>{{ t("caller.import.progress.downloading") }}</span>
              <span class="tabular-nums">{{ zipDownloadProgress }}%</span>
            </div>
            <div class="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div :style="{ width: `${zipDownloadProgress}%` }" class="h-full rounded-full bg-[var(--ad-action-primary)] transition-all duration-300" />
            </div>
          </div>
          <div v-if="isExtractingZip">
            <div class="mb-1.5 flex justify-between text-xs">
              <span>{{ t("caller.import.progress.unpacking") }}</span>
              <span class="tabular-nums">{{ zipExtractedFiles }} / {{ zipTotalFiles || "?" }}</span>
            </div>
            <div class="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div :style="{ width: `${zipTotalFiles ? (zipExtractedFiles / zipTotalFiles) * 100 : 0}%` }" class="h-full rounded-full bg-[var(--ad-action-primary)] transition-all duration-300" />
            </div>
          </div>
          <div v-if="isProcessingCsv">
            <div class="mb-1.5 flex justify-between text-xs">
              <span>{{ t("caller.import.progress.matching") }}</span>
              <span class="tabular-nums">{{ csvProcessingProgress }}%</span>
            </div>
            <div class="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div :style="{ width: `${csvProcessingProgress}%` }" class="h-full rounded-full bg-[var(--ad-action-primary)] transition-all duration-300" />
            </div>
          </div>
        </div>

        <div v-else-if="isImporting" class="rounded-[var(--ad-radius-lg)] bg-white/[.04] p-4">
          <div class="mb-1.5 flex justify-between text-xs">
            <span>{{ t("caller.import.progress.looking") }}</span>
            <span class="tabular-nums">{{ t("caller.import.progress.found", { count: importedCount }) }}</span>
          </div>
          <div class="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div :style="{ width: `${(importProgress / 181) * 100}%` }" class="h-full rounded-full bg-[var(--ad-action-primary)] transition-all duration-300" />
          </div>
        </div>
      </div>

      <template #footer>
        <AppButton @click="closeImportURLModal" auto>
          {{ t("common.cancel") }}
        </AppButton>
        <AppButton
          @click="fetchSoundsFromURL"
          :disabled="!baseURL || isImporting || isDownloadingZip || isExtractingZip || isProcessingCsv"
          :loading="isImporting || isDownloadingZip || isExtractingZip || isProcessingCsv"
          auto
          type="primary"
        >
          {{ t("caller.import.button") }}
        </AppButton>
      </template>
    </AppModal>

    <AppNotification
      @close="hideNotification"
      :show="notification.show"
      :message="notification.message"
      :type="notification.type"
    />
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
            {{ t("features.caller") }}
            <span class="icon-[material-symbols--settings-alert-outline-rounded] ml-2 size-5" />
          </h3>
          <p class="w-2/3 text-white/70">
            {{ t("caller.card") }}
          </p>
        </div>
        <div class="flex">
          <div @click="$emit('toggle', 'caller')" class="absolute inset-y-0 left-12 right-0 cursor-pointer" />
          <AppToggle
            @update:model-value="toggleFeature"
            v-model="config.caller.enabled"
          />
        </div>
      </div>
      <div class="gradient-mask-left absolute inset-y-0 right-0 w-2/3">
        <img :src="imageUrl" :alt="t('features.caller')" class="size-full object-cover">
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import { useStorage } from "@vueuse/core";
import JSZip from "jszip";

import AppAlert from "../AppAlert.vue";
import AppButton from "../AppButton.vue";
import AppInput from "../AppInput.vue";
import AppMenu from "../AppMenu.vue";
import AppModal from "../AppModal.vue";
import AppNotification from "../AppNotification.vue";
import AppSelect from "../AppSelect.vue";
import AppToggle from "../AppToggle.vue";
import AppTrans from "../AppTrans.vue";

import GameModesField from "./Library/GameModesField.vue";
import LibraryItem from "./Library/LibraryItem.vue";
import LibrarySection from "./Library/LibrarySection.vue";
import OptionRow from "./Library/OptionRow.vue";
import PlayButton from "./Library/PlayButton.vue";
import SoundDialog from "./Library/SoundDialog.vue";
import SoundSource from "./Library/SoundSource.vue";
import TtsDialog from "./Library/TtsDialog.vue";
import UploadDialog from "./Library/UploadDialog.vue";
import VolumeBadge from "./Library/VolumeBadge.vue";
import { stableKey } from "./Library/stable-key";

import type { MessageKey } from "@/utils/i18n";
import type { LibraryEntry } from "@/utils/library-search";

import { useLouderCheck } from "@/composables/useLouderCheck";
import { useNotification } from "@/composables/useNotification";
import { useTTS } from "@/composables/useTTS";
import { type ISound } from "@/utils/storage";
import {
  backgroundFetch,
  base64toBlob,
  chunkedBackgroundFetch,
  deleteSoundFromIndexedDB,
  detectAudioMimeType,
  getSoundFromIndexedDB,
  isIndexedDBAvailable,
  saveSoundToIndexedDB,
} from "@/utils/helpers";
import { elementVolumeWorks, soundCopies } from "@/utils/sound-copies";
import { DEFAULT_VOLUME, cappedVolume, planVolume, soundVolume } from "@/utils/sound-volume";

const emit = defineEmits([ "toggle" ]);
useStorage("adt:active-settings", "caller");

/** The playing key of a sound tried out in the add/edit dialog, before it is in the list. */
const DRAFT_KEY = -1;

const { t } = useI18n();
const { config } = useConfig();
const imageUrl = browser.runtime.getURL("/images/caller.png");
const showSoundModal = ref(false);
const isEditMode = ref(false);
const newSound = ref({ url: "", name: "", base64: "", triggers: [] as string[], volume: DEFAULT_VOLUME });
const editingIndex = ref<number | null>(null);
/** Why the link in the dialog open is refused, as the key of the line said under it: it follows a language picked meanwhile. */
const urlError = ref<MessageKey | "">("");

// File upload
const showUploadModal = ref(false);
const isProcessing = ref(false);

// Delete all modal
const showDeleteAllModal = ref(false);

/**
 * What is playing: the stable key of its item, or DRAFT_KEY for the dialog's.
 * One sound at a time, so a new one stops the last.
 */
const playingKey = ref<number | null>(null);
let currentPlayer: HTMLAudioElement | null = null;
/** Stopping a voice ends its speech, which is not the end of the one we start next. */
let ignoreSpeechEnd = false;
/** Copies of sounds at volumes their files don't have, for the play buttons — see utils/sound-copies.ts. */
const copies = soundCopies();

// Import URL related refs
const showImportURLModal = ref(false);
const baseURL = ref("");
const selectedPresetURL = ref("");
const importProgress = ref(0);
const importedCount = ref(0);
const isImporting = ref(false);
/** Triggers always come from the file names on import: the old dialog's box for it could not be unticked. */
const generateTriggersFromURLFilenames = ref(true);
const { notification, showNotification, hideNotification } = useNotification();

// TTS related
const { voices, isTTSAvailable, isSpeaking, lastVoiceURI, lastRate, lastPitch, preview, stopPreview, saveDefaults } = useTTS();
const showTTSModal = ref(false);
const ttsEditingIndex = ref<number | null>(null);
const ttsForm = ref({
  text: "",
  name: "",
  voiceURI: "",
  lang: "",
  rate: 1,
  pitch: 1,
  volume: DEFAULT_VOLUME,
  triggers: [] as string[],
});

// Zip Import related refs
const isZipFile = ref(false);
const isDownloadingZip = ref(false);
const zipDownloadProgress = ref(0);
const isExtractingZip = ref(false);
const zipTotalFiles = ref(0);
const zipExtractedFiles = ref(0);
const isProcessingCsv = ref(false);
const csvProcessingProgress = ref(0);
const csvTotalEntries = ref(0);

/**
 * The caller sets that can be imported, by the file they are: the select shows each as "NL - Laura (Female)",
 * worded by the current language. The region is the set's country code, as its file name has it.
 */
const CALLER_SETS: { value: string; region: string; voice: string; gender: "female" | "male" }[] = [
  // Dutch (nl-NL)
  { value: "https://darts-downloads.peschi.org/soundfiles/nl-NL-Laura-Female-v5.zip", region: "NL", voice: "Laura", gender: "female" },

  // French (fr-FR)
  { value: "https://darts-downloads.peschi.org/soundfiles/fr-FR-Remi-Male-v3.zip", region: "FR", voice: "Remi", gender: "male" },
  { value: "https://darts-downloads.peschi.org/soundfiles/fr-FR-Lea-Female-v3.zip", region: "FR", voice: "Lea", gender: "female" },

  // Spanish (es-ES)
  { value: "https://darts-downloads.peschi.org/soundfiles/es-ES-Lucia-Female-v3.zip", region: "ES", voice: "Lucia", gender: "female" },
  { value: "https://darts-downloads.peschi.org/soundfiles/es-ES-Sergio-Male-v3.zip", region: "ES", voice: "Sergio", gender: "male" },

  // Austrian German (de-AT)
  { value: "https://darts-downloads.peschi.org/soundfiles/de-AT-Hannah-Female-v5.zip", region: "AT", voice: "Hannah", gender: "female" },

  // German (de-DE)
  { value: "https://darts-downloads.peschi.org/soundfiles/de-DE-Vicki-Female-v8.zip", region: "DE", voice: "Vicki", gender: "female" },
  { value: "https://darts-downloads.peschi.org/soundfiles/de-DE-Daniel-Male-v8.zip", region: "DE", voice: "Daniel", gender: "male" },

  // British English (en-GB)
  { value: "https://darts-downloads.peschi.org/soundfiles/en-GB-Amy-Female-v4.zip", region: "GB", voice: "Amy", gender: "female" },
  { value: "https://darts-downloads.peschi.org/soundfiles/en-GB-Arthur-Male-v4.zip", region: "GB", voice: "Arthur", gender: "male" },

  // American English (en-US)
  { value: "https://darts-downloads.peschi.org/soundfiles/en-US-Ivy-Female-v8.zip", region: "US", voice: "Ivy", gender: "female" },
  { value: "https://darts-downloads.peschi.org/soundfiles/en-US-Joey-Male-v9.zip", region: "US", voice: "Joey", gender: "male" },
  { value: "https://darts-downloads.peschi.org/soundfiles/en-US-Joanna-Female-v9.zip", region: "US", voice: "Joanna", gender: "female" },
  { value: "https://darts-downloads.peschi.org/soundfiles/en-US-Matthew-Male-v6.zip", region: "US", voice: "Matthew", gender: "male" },
  { value: "https://darts-downloads.peschi.org/soundfiles/en-US-Danielle-Female-v6.zip", region: "US", voice: "Danielle", gender: "female" },
  { value: "https://darts-downloads.peschi.org/soundfiles/en-US-Kimberly-Female-v5.zip", region: "US", voice: "Kimberly", gender: "female" },
  { value: "https://darts-downloads.peschi.org/soundfiles/en-US-Ruth-Female-v5.zip", region: "US", voice: "Ruth", gender: "female" },
  { value: "https://darts-downloads.peschi.org/soundfiles/en-US-Salli-Female-v5.zip", region: "US", voice: "Salli", gender: "female" },
  { value: "https://darts-downloads.peschi.org/soundfiles/en-US-Kevin-Male-v5.zip", region: "US", voice: "Kevin", gender: "male" },
  { value: "https://darts-downloads.peschi.org/soundfiles/en-US-Justin-Male-v5.zip", region: "US", voice: "Justin", gender: "male" },
  { value: "https://darts-downloads.peschi.org/soundfiles/en-US-Stephen-Male-v8.zip", region: "US", voice: "Stephen", gender: "male" },
  { value: "https://darts-downloads.peschi.org/soundfiles/en-US-Kendra-Female-v9.zip", region: "US", voice: "Kendra", gender: "female" },
  { value: "https://darts-downloads.peschi.org/soundfiles/en-US-Gregory-Male-v6.zip", region: "US", voice: "Gregory", gender: "male" },
];

const entries = computed<LibraryEntry[]>(() => (config.value?.caller.sounds ?? []).map((sound, index) => {
  const triggers = Array.isArray(sound.triggers) ? sound.triggers : [];
  return {
    index,
    name: sound.name || sound.tts?.text || triggers[0] || t("library.sounds.untitled"),
    triggers,
    source: sound.tts ? `tts ${sound.tts.text}` : sound.url || "uploaded",
    enabled: sound.enabled,
  };
}));

/** The select's options: "Pick a set…", then each set with its country, voice and gender in the current language. */
const callerSets = computed(() => [
  { value: "", label: t("caller.sets.pick") },
  ...CALLER_SETS.map(set => ({
    value: set.value,
    label: t("caller.sets.label", { region: set.region, voice: set.voice, gender: t(`caller.sets.${set.gender}`) }),
  })),
]);

/** The line under the link in the add and import dialogs: the key in urlError, said in the current language. */
const urlErrorText = computed(() => (urlError.value ? t(urlError.value) : ""));

/** An uploaded sound being edited: its file loads a moment after the dialog opens. */
const draftHasFile = computed(() => {
  if (newSound.value.base64) return true;
  if (!isEditMode.value || editingIndex.value === null) return false;
  return !!config.value?.caller.sounds[editingIndex.value]?.soundId;
});

/** A link set above 100% that the extension cannot read, so the editor can say it plays at 100% at most. */
const louderBlocked = useLouderCheck(copies, () => ({
  open: showSoundModal.value,
  url: newSound.value.url,
  volume: newSound.value.volume,
  hasFile: draftHasFile.value,
}));

const addActions = computed(() => [
  { label: t("caller.import.title"), hint: t("caller.import.hint"), icon: "icon-[material-symbols--library-music-outline-rounded]", action: openImportURLModal },
  { label: t("library.sounds.add.upload.label"), hint: t("library.sounds.add.upload.hint"), icon: "icon-[material-symbols--upload-rounded]", action: openUploadModal },
  {
    label: t("library.sounds.add.generate.label"),
    hint: t(isTTSAvailable.value ? "library.sounds.add.generate.hint" : "library.sounds.add.generate.hintUnavailable"),
    icon: "icon-[material-symbols--record-voice-over-outline-rounded]",
    disabled: !isTTSAvailable.value,
    action: () => openTTSModal(),
  },
  { label: t("library.sounds.add.link.label"), hint: t("library.sounds.add.link.hint"), icon: "icon-[material-symbols--link-rounded]", action: openAddSoundModal },
]);

const moreActions = computed(() => [
  {
    label: t("library.sounds.menu.sort.label"),
    hint: t("library.sounds.menu.sort.hint"),
    icon: "icon-[material-symbols--sort-by-alpha-rounded]",
    disabled: (config.value?.caller.sounds.length ?? 0) < 2,
    action: sortSoundsByTriggers,
  },
  {
    label: t("library.deleteAllMenu"),
    icon: "icon-[material-symbols--delete-outline-rounded]",
    danger: true,
    separated: true,
    disabled: !config.value?.caller.sounds.length,
    action: openDeleteAllModal,
  },
]);

// Watch for changes to selectedPresetURL and update baseURL
watch(selectedPresetURL, (newValue) => {
  if (newValue) {
    baseURL.value = newValue;
  }
});

// Text to speech has no ended event of ours to hook, so follow useTTS.
watch(isSpeaking, (speaking) => {
  if (speaking) return;
  if (ignoreSpeechEnd) {
    ignoreSpeechEnd = false;
    return;
  }
  if (!currentPlayer) playingKey.value = null;
});

onBeforeUnmount(() => {
  stopPlayback();
  copies.forget();
});

function moveSound(from: number, to: number) {
  const sounds = config.value?.caller.sounds;
  if (!sounds) return;
  const [ moved ] = sounds.splice(from, 1);
  sounds.splice(to, 0, moved);
}

function editAny(index: number) {
  const sound = config.value!.caller.sounds[index];
  if (sound.tts) openTTSModal(sound, index);
  else editSound(index);
}

function togglePlay(index: number) {
  const sound = config.value!.caller.sounds[index];
  if (playingKey.value === stableKey(sound)) stopPlayback();
  else playSound(sound, stableKey(sound));
}

/** Plays what the add/edit dialog holds: its link, or the uploaded file being edited. */
function previewDraft() {
  if (playingKey.value === DRAFT_KEY) {
    stopPlayback();
    return;
  }
  const { url, base64, name, volume } = newSound.value;
  const stored = isEditMode.value && editingIndex.value !== null ? config.value?.caller.sounds[editingIndex.value] : undefined;
  playSound({ name, url: url.trim(), base64, soundId: base64 ? undefined : stored?.soundId, enabled: true, triggers: [], volume }, DRAFT_KEY);
}

function stopPlayback() {
  if (currentPlayer) {
    currentPlayer.pause();
    currentPlayer.currentTime = 0;
    currentPlayer = null;
  }
  if (isSpeaking.value) ignoreSpeechEnd = true;
  stopPreview();
  playingKey.value = null;
}

function openAddSoundModal() {
  newSound.value = { url: "", name: "", base64: "", triggers: [], volume: DEFAULT_VOLUME };
  isEditMode.value = false;
  editingIndex.value = null;
  urlError.value = "";
  showSoundModal.value = true;
}

function editSound(index: number) {
  const sound = config.value!.caller.sounds[index];

  // Set up base form values
  newSound.value = {
    url: sound.url || "",
    name: sound.name || "",
    base64: "", // loaded below if needed
    triggers: Array.isArray(sound.triggers) ? [ ...sound.triggers ] : [],
    volume: soundVolume(sound),
  };

  // If we have a soundId, load from IndexedDB
  if (sound.soundId && isIndexedDBAvailable()) {
    getSoundFromIndexedDB(sound.soundId)
      .then((base64Data) => {
        if (base64Data) {
          newSound.value.base64 = base64Data;
        } else if (sound.base64) {
          // Fallback to the base64 in config if exists
          newSound.value.base64 = sound.base64;
        }
      })
      .catch((error) => {
        console.error("Error loading sound from IndexedDB:", error);
        // Fallback to the base64 in config if exists
        if (sound.base64) {
          newSound.value.base64 = sound.base64;
        }
      });
  } else if (sound.base64) {
    // Use the base64 in config
    newSound.value.base64 = sound.base64;
  }

  isEditMode.value = true;
  editingIndex.value = index;
  urlError.value = "";
  showSoundModal.value = true;
}

async function saveSound() {
  if (!config.value) return;

  // Check if we're in edit mode with an existing sound
  const existingSound = isEditMode.value && editingIndex.value !== null
    ? config.value.caller.sounds[editingIndex.value]
    : null;

  // Different validation when editing vs adding new sound
  if (!existingSound && !newSound.value.url && !newSound.value.base64) {
    showNotification(t("library.sounds.notifications.needsSource"), "error");
    return;
  }
  if (!newSound.value.triggers.length) {
    showNotification(t("library.sounds.notifications.needsTrigger"), "error");
    return;
  }

  // Check if URL starts with https://
  if (newSound.value.url && !newSound.value.url.startsWith("https://")) {
    urlError.value = "library.sounds.linkNotHttps";
    return;
  }

  // Reset error message
  urlError.value = "";

  const triggers = [ ...newSound.value.triggers ];

  // Store base64 data in IndexedDB if available
  let soundId: string | null = null;
  if (newSound.value.base64 && isIndexedDBAvailable()) {
    if (existingSound?.soundId) {
      // Update existing sound in IndexedDB
      soundId = await saveSoundToIndexedDB(
        newSound.value.name.trim() || t("library.sounds.unnamed"),
        newSound.value.base64,
        existingSound.soundId, // Pass existing soundId to update instead of creating new
      );
    } else {
      // Create new sound in IndexedDB
      soundId = await saveSoundToIndexedDB(
        newSound.value.name.trim() || t("library.sounds.unnamed"),
        newSound.value.base64,
      );
    }

    if (!soundId) {
      // If IndexedDB failed, fall back to storing in config
      console.warn("Failed to save sound to IndexedDB, falling back to local storage");
    }
  } else if (existingSound?.soundId && !newSound.value.base64) {
    // Saved before its file finished loading: the stored file is still the one to keep.
    soundId = existingSound.soundId;
  }

  // Create sound object
  const sound: ISound = {
    url: newSound.value.url.trim(),
    name: newSound.value.name.trim() || "", // Use the name if provided
    // Only store base64 in config if we couldn't store in IndexedDB
    base64: soundId ? "" : newSound.value.base64 || existingSound?.base64 || "",
    soundId: soundId || "", // Store the IndexedDB ID if available
    enabled: true, // New sounds are enabled by default
    triggers,
  };
  // Only a volume other than the file's own is stored
  if (newSound.value.volume !== DEFAULT_VOLUME) sound.volume = newSound.value.volume;

  if (existingSound && editingIndex.value !== null) {
    // Update existing sound
    sound.enabled = existingSound.enabled; // Preserve enabled state when editing

    // Only delete old sound from IndexedDB if we didn't reuse the soundId and there's a new one
    if (existingSound.soundId && existingSound.soundId !== soundId && soundId !== null) {
      await deleteSoundFromIndexedDB(existingSound.soundId);
    }

    config.value.caller.sounds[editingIndex.value] = sound;
  } else {
    config.value.caller.sounds.unshift(sound);
  }

  // Reset form and close modal
  closeSoundModal();
}

function closeSoundModal() {
  if (playingKey.value === DRAFT_KEY) stopPlayback();
  newSound.value = { url: "", name: "", base64: "", triggers: [], volume: DEFAULT_VOLUME };
  showSoundModal.value = false;
  editingIndex.value = null;
  urlError.value = "";
}

async function removeSound(index: number) {
  const sounds = config.value?.caller.sounds;
  if (!sounds) return;

  const sound = sounds[index];
  if (playingKey.value === stableKey(sound)) stopPlayback();

  // If sound is stored in IndexedDB, delete it
  if (sound.soundId && isIndexedDBAvailable()) {
    await deleteSoundFromIndexedDB(sound.soundId);
  }

  // Found again after the wait, in case another delete moved it.
  const at = sounds.indexOf(sound);
  if (at !== -1) sounds.splice(at, 1);
}

// File upload related functions
function openUploadModal() {
  showUploadModal.value = true;
}

function closeUploadModal() {
  showUploadModal.value = false;
}

function extractTriggerFromFilename(filename: string): string[] {
  // Remove file extension
  const nameWithoutExt = filename.substring(0, filename.lastIndexOf(".")).toLowerCase();

  // Replace hyphens with underscores
  const cleanName = nameWithoutExt.replace(/-/g, "_").trim();

  // Handle the "+" case - remove + and everything after it
  const plusIndex = cleanName.indexOf("+");
  const finalTrigger = plusIndex !== -1 ? cleanName.substring(0, plusIndex) : cleanName;

  // Return as array with a single item if not empty
  return finalTrigger ? [ finalTrigger ] : [];
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

async function processFiles({ files, fromNames, triggers: shared }: { files: File[]; fromNames: boolean; triggers: string[] }) {
  if (!config.value || !files.length) return;

  isProcessing.value = true;
  let added = 0;

  try {
    // Ensure config.value.caller.sounds is an array
    if (!config.value.caller || !Array.isArray(config.value.caller.sounds)) {
      config.value.caller = {
        ...config.value.caller,
        sounds: [],
      };
    }

    for (const file of files) {
      try {
        const base64Data = await fileToBase64(file);
        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf("."));
        const triggers = fromNames ? extractTriggerFromFilename(file.name) : [ ...shared ];

        // Store file in IndexedDB if available
        let soundId: string | null = null;
        if (isIndexedDBAvailable()) {
          soundId = await saveSoundToIndexedDB(nameWithoutExt, base64Data);
        }

        config.value.caller.sounds.unshift({
          name: nameWithoutExt,
          url: "",
          base64: soundId ? "" : base64Data, // Only store in config if not in IndexedDB
          soundId: soundId || "", // Store the IndexedDB ID if available
          enabled: true,
          triggers,
        });
        added++;
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
      }
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    showNotification(t("library.sounds.notifications.added", { count: added }));
  } catch (error) {
    console.error("Error processing files:", error);
    showNotification(t("library.sounds.notifications.processingError"), "error");
  } finally {
    isProcessing.value = false;
    closeUploadModal();
  }
}

function sortSoundsByTriggers() {
  if (!config.value || !config.value.caller.sounds || config.value.caller.sounds.length <= 1) {
    return;
  }

  // Sort sounds by their first trigger alphabetically
  config.value.caller.sounds.sort((a, b) => {
    // Get first trigger from each sound, or empty string if no triggers
    const triggerA = Array.isArray(a.triggers) && a.triggers.length > 0 ? a.triggers[0] : "";
    const triggerB = Array.isArray(b.triggers) && b.triggers.length > 0 ? b.triggers[0] : "";

    // Sort numerically if both are numbers
    if (!Number.isNaN(Number(triggerA)) && !Number.isNaN(Number(triggerB))) {
      return Number(triggerA) - Number(triggerB);
    }

    // Otherwise sort alphabetically
    return triggerA.localeCompare(triggerB);
  });

  // Show notification
  showNotification(t("caller.notifications.sorted"));
}

function openDeleteAllModal() {
  showDeleteAllModal.value = true;
}

function closeDeleteAllModal() {
  showDeleteAllModal.value = false;
}

async function deleteAllSounds() {
  if (!config.value) return;
  stopPlayback();

  // Delete all sounds from IndexedDB
  if (isIndexedDBAvailable()) {
    // Delete individual sounds with their IDs to ensure cleanup
    for (const sound of config.value.caller.sounds) {
      if (sound.soundId) {
        await deleteSoundFromIndexedDB(sound.soundId);
      }
    }
  }

  // Clear all sounds from the config
  config.value.caller.sounds = [];

  // Close modal and show notification
  closeDeleteAllModal();
  showNotification(t("caller.notifications.allDeleted"), "error");
}

async function playSound(sound: ISound, key: number) {
  stopPlayback();
  playingKey.value = key;
  const percent = soundVolume(sound);

  // Handle TTS sounds; the isSpeaking watcher clears the key when it is done.
  if (sound.tts) {
    preview(sound.tts.text, sound.tts.voiceURI, sound.tts.rate, sound.tts.pitch, percent);
    return;
  }

  const plan = planVolume(percent, elementVolumeWorks());
  // At 0% there is nothing to hear.
  if (plan.kind === "silent") {
    playingKey.value = null;
    return;
  }

  // Create an audio element
  const audio = new Audio();
  audio.preload = "auto"; // Ensure preloading is enabled
  currentPlayer = audio;

  const finish = () => {
    if (currentPlayer !== audio) return;
    currentPlayer = null;
    playingKey.value = null;
  };

  try {
    // Try to get base64 from IndexedDB first if sound has a soundId
    let source = "";
    if (sound.soundId && isIndexedDBAvailable()) {
      const base64Data = await getSoundFromIndexedDB(sound.soundId);
      if (base64Data) {
        source = base64Data;
      }
    }

    // If no source from IndexedDB, fall back to config values
    if (!source) {
      if (sound.base64) {
        source = sound.base64;
      } else if (sound.url) {
        source = sound.url;
      } else {
        // No audio source available
        showNotification(t("library.sounds.notifications.noSource"), "error");
        finish();
        return;
      }
    }

    // A volume the file doesn't have plays from a copy made at that volume.
    const copy = plan.kind === "copy" ? await copies.copyAt(source, plan.percent) : null;

    // Stopped, or another sound started, while the file was read.
    if (currentPlayer !== audio) return;

    audio.addEventListener("ended", finish);

    if (copy) {
      audio.src = copy;
      await audio.play();
      return;
    }

    // Without a copy, the file as it is, as loud as the element goes
    audio.volume = plan.kind === "element" ? plan.volume : cappedVolume(percent);

    // Use blob approach for all browsers, but especially Safari
    // This avoids the NotSupportedError on Safari
    if (source.startsWith("data:")) {
      try {
        const blob = base64toBlob(source);
        const blobUrl = URL.createObjectURL(blob);

        audio.onerror = (e) => {
          console.error("Error loading sound:", e);
          URL.revokeObjectURL(blobUrl);
          showNotification(t("library.sounds.notifications.playFailed"), "error");
          finish();
        };

        // Set up cleanup when audio playback ends
        audio.onended = () => {
          URL.revokeObjectURL(blobUrl);
        };

        // Set the source to the blob URL
        audio.src = blobUrl;

        // Play the sound
        await audio.play();
        return;
      } catch (error) {
        console.error("Error creating/playing blob URL:", error);
        // Continue to fallback method if blob approach fails
      }
    }

    // Fallback: Set the source directly and play
    audio.src = source;
    await audio.play();
  } catch (error) {
    console.error("Error playing sound:", error);
    showNotification(t("library.sounds.notifications.playFailed"), "error");
    finish();
  }
}

async function toggleFeature() {
  if (!config.value) return;

  // Toggle the feature
  const wasEnabled = config.value.caller.enabled;
  config.value.caller.enabled = !wasEnabled;

  // If we're enabling the feature, open settings
  if (!wasEnabled) {
    await nextTick();
    emit("toggle", "caller");
  }
}

// Import URL related functions
function openImportURLModal() {
  showImportURLModal.value = true;
  baseURL.value = "";
  urlError.value = "";
  importProgress.value = 0;
  importedCount.value = 0;
  selectedPresetURL.value = "";
  isZipFile.value = false;
  isDownloadingZip.value = false;
  zipDownloadProgress.value = 0;
  isExtractingZip.value = false;
  zipTotalFiles.value = 0;
  zipExtractedFiles.value = 0;
  isProcessingCsv.value = false;
  csvProcessingProgress.value = 0;
  csvTotalEntries.value = 0;
}

function closeImportURLModal() {
  if (isImporting.value) {
    // Ask for confirmation before closing during import
    if (confirm(t("caller.import.cancelConfirm"))) {
      isImporting.value = false;
      showImportURLModal.value = false;
      selectedPresetURL.value = "";
    }
  } else {
    showImportURLModal.value = false;
    selectedPresetURL.value = "";
  }
}

// Parse CSV content into an array of objects
function parseCSV(csv: string) {
  // Split the CSV by newlines and filter out empty lines
  const lines = csv.split(/\r\n|\n|\r/).filter(line => line.trim() !== "");

  if (lines.length === 0) return [];

  // Process each line
  return lines.map((line) => {
    // Split by semicolon and remove empty/whitespace-only values
    const values = line.split(";").map(v => v.trim()).filter(v => v);

    // First value is both filename and display name
    const filename = values[0] || "";
    // Second value is the trigger, if not present use filename as trigger
    const trigger = values[1] || filename;

    return {
      file: filename,
      name: filename,
      triggers: trigger,
    };
  });
}

// Check if URL is a ZIP file by looking at Content-Type or extension
async function checkIfZipURL(url: string): Promise<boolean> {
  try {
    // Check URL extension first
    if (url.toLowerCase().endsWith(".zip")) {
      return true;
    }

    // Try HEAD request to check Content-Type using backgroundFetch instead of direct fetch
    const response = await backgroundFetch(url, { method: "HEAD" });
    if (response.ok) {
      // For HEAD requests, we need to check headers in a different way
      // since backgroundFetch doesn't return headers directly
      return url.toLowerCase().endsWith(".zip"); // Fallback to extension check for now
    }
    return false;
  } catch (error) {
    console.warn("Error checking if URL is a ZIP file:", error);
    // Default to checking extension if request fails
    return url.toLowerCase().endsWith(".zip");
  }
}

// Download ZIP file with progress reporting using chunkedBackgroundFetch
async function downloadZipWithProgress(url: string): Promise<ArrayBuffer> {
  isDownloadingZip.value = true;
  zipDownloadProgress.value = 0;

  try {
    console.log("Downloading ZIP file using chunkedBackgroundFetch");

    // Start with 10% to show progress has begun
    zipDownloadProgress.value = 10;

    // Use chunkedBackgroundFetch to bypass CORS and message size limitations
    const response = await chunkedBackgroundFetch(url);

    if (!response.ok) {
      throw new Error(`Failed to download ZIP file: ${response.error || "Unknown error"}`);
    }

    // Show 50% progress since we've received the file data
    zipDownloadProgress.value = 50;

    // Since we're getting base64 data back from chunkedBackgroundFetch, we need to convert it back to ArrayBuffer
    const base64Data = response.data;
    if (!base64Data || typeof base64Data !== "string") {
      throw new Error("Invalid response data");
    }

    // Convert base64 to blob then to ArrayBuffer
    const byteString = atob(base64Data.split(",")[1]);
    const mimeType = base64Data.split(",")[0].split(":")[1].split(";")[0];
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uint8Array = new Uint8Array(arrayBuffer);

    // Fill the array buffer
    for (let i = 0; i < byteString.length; i++) {
      uint8Array[i] = byteString.charCodeAt(i);
    }

    // Show complete progress
    zipDownloadProgress.value = 100;

    return arrayBuffer;
  } catch (error) {
    console.error("Error downloading ZIP:", error);
    throw error;
  } finally {
    isDownloadingZip.value = false;
  }
}

// Process CSV file and sound files from ZIP
async function processCSVandSounds(csvContent: string, zipFiles: Map<string, Blob>): Promise<ISound[]> {
  isProcessingCsv.value = true;
  csvProcessingProgress.value = 0;

  try {
    const csvEntries = parseCSV(csvContent);
    csvTotalEntries.value = csvEntries.length;
    const sounds: ISound[] = [];

    // Process each entry in the CSV
    for (let i = 0; i < csvEntries.length; i++) {
      const entry = csvEntries[i];
      csvProcessingProgress.value = Math.round((i / csvEntries.length) * 100);

      // Skip if name is not a number and no trigger is defined
      const isNameNumber = !Number.isNaN(Number(entry.name));
      const hasTrigger = entry.triggers && entry.triggers !== entry.name;
      if (!isNameNumber && !hasTrigger) {
        continue;
      }

      // Find the corresponding sound file in the ZIP by index
      // The pattern is AM-XXXXX_INDEX_mono.mp3 where INDEX matches the array position
      const soundFile = Array.from(zipFiles.keys()).find((filename) => {
        const match = filename.match(/AM-\d+_(\d+)_mono\.mp3$/);
        return match && Number.parseInt(match[1]) === i;
      });

      if (!soundFile) continue;

      // Get the blob for this sound file
      const blob = zipFiles.get(soundFile);
      if (!blob) continue;

      // Convert the blob to base64
      const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      // Create triggers array from the CSV entry
      const triggers = entry.triggers?.split(";")
        .map(t => t.trim().toLowerCase())
        .filter(t => t.length > 0) || [];

      // Store in IndexedDB if available
      let soundId: string | null = null;
      if (isIndexedDBAvailable()) {
        soundId = await saveSoundToIndexedDB(
          entry.name || soundFile,
          base64Data,
        );
      }

      // Create sound object
      const sound: ISound = {
        name: entry.name || soundFile,
        url: "",
        base64: soundId ? "" : base64Data,
        soundId: soundId || "",
        enabled: true,
        triggers: Array.isArray(triggers) ? triggers : [ triggers ],
      };

      sounds.push(sound);
    }

    return sounds;
  } finally {
    isProcessingCsv.value = false;
  }
}

// Extract files from a ZIP object with progress reporting
async function extractZipWithProgress(zipData: ArrayBuffer): Promise<Map<string, Blob>> {
  isExtractingZip.value = true;
  zipExtractedFiles.value = 0;

  try {
    const zip = await JSZip.loadAsync(zipData);
    const files = new Map<string, Blob>();
    zipTotalFiles.value = Object.keys(zip.files).length;

    // First find the inner ZIP file if it exists
    let innerZipFile: JSZip | null = null;
    let csvFile: string | null = null;

    // First pass - identify CSV and inner ZIP files
    for (const [ filename, file ] of Object.entries(zip.files)) {
      if (file.dir) continue;

      // Check if it's a CSV file
      if (filename.toLowerCase().endsWith(".csv")) {
        csvFile = filename;
      }

      // Check if it's a ZIP file
      if (filename.toLowerCase().endsWith(".zip")) {
        const innerZipData = await file.async("arraybuffer");
        innerZipFile = await JSZip.loadAsync(innerZipData);
        // Update total files count to include inner ZIP contents
        zipTotalFiles.value = zipTotalFiles.value - 1 + Object.keys(innerZipFile.files).length;
      }

      zipExtractedFiles.value++;
    }

    // If we found a CSV and inner ZIP, process the inner ZIP files
    if (csvFile && innerZipFile) {
      const csvContent = await zip.file(csvFile)!.async("text");
      files.set(csvFile, new Blob([ csvContent ], { type: "text/csv" }));

      // Extract all files from the inner ZIP
      for (const [ innerFilename, innerFile ] of Object.entries(innerZipFile.files)) {
        if (innerFile.dir) continue;

        const content = await innerFile.async("blob");
        files.set(innerFilename, content);
        zipExtractedFiles.value++;
      }
    } else {
      // Otherwise just extract all files from the main ZIP
      for (const [ filename, file ] of Object.entries(zip.files)) {
        if (file.dir) continue;

        const content = await file.async("blob");
        files.set(filename, content);
      }
    }

    return files;
  } finally {
    isExtractingZip.value = false;
  }
}

// Enhanced fetchSoundsFromURL function to handle ZIP files
async function fetchSoundsFromURL() {
  if (!config.value) return;

  // Validate URL
  try {
    // Ensure URL starts with https://
    if (!baseURL.value.startsWith("https://")) {
      urlError.value = "caller.import.errors.notHttps";
      return;
    }

    // Check if URL is from allowed domains
    const isAllowedDomain = checkAllowedDomain(baseURL.value);
    if (!isAllowedDomain) {
      urlError.value = "caller.import.errors.notAllowed";
      return;
    }

    // Test if URL is valid
    const urlObj = new URL(baseURL.value);
    urlError.value = "";
  } catch (error) {
    urlError.value = "caller.import.errors.invalid";
    return;
  }

  // Ensure config.value.caller.sounds is an array
  if (!config.value.caller || !Array.isArray(config.value.caller.sounds)) {
    config.value.caller = {
      ...config.value.caller,
      sounds: [],
    };
  }

  // Check if URL points to a ZIP file
  isZipFile.value = await checkIfZipURL(baseURL.value);

  console.log("Autodarts Tools: Zip file", isZipFile.value);

  // Handle ZIP file
  if (isZipFile.value) {
    try {
      // Download the ZIP file using backgroundFetch
      const zipData = await downloadZipWithProgress(baseURL.value);

      // Extract the ZIP contents
      const extractedFiles = await extractZipWithProgress(zipData);

      // Check if we have a CSV file
      const csvFile = Array.from(extractedFiles.keys()).find(filename =>
        filename.toLowerCase().endsWith(".csv"),
      );

      if (csvFile) {
        // We found a CSV file, process it with the sound files
        const csvBlob = extractedFiles.get(csvFile)!;
        const csvContent = await csvBlob.text();

        // Process the CSV and sound files
        const sounds = await processCSVandSounds(csvContent, extractedFiles);

        console.log("Autodarts Tools: Sounds", sounds);

        if (sounds.length === 0) {
          showNotification(t("caller.notifications.noSoundsInZip"), "error");
          closeImportURLModal();
          return;
        }

        // Add the sounds to the config
        config.value.caller.sounds = [ ...sounds, ...config.value.caller.sounds ];
        importedCount.value = sounds.length;

        // Show success notification
        showNotification(t("caller.notifications.importedFromZip", { count: sounds.length }));
      } else {
        // No CSV file found - process each file individually like regular sounds
        const sounds: ISound[] = [];

        for (const [ filename, blob ] of extractedFiles.entries()) {
          // Skip non-audio files
          if (!filename.toLowerCase().match(/\.(mp3|wav|ogg)$/)) continue;

          // Convert to base64
          const base64Data = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });

          // Generate triggers from filenames if enabled
          const triggers = generateTriggersFromURLFilenames.value
            ? extractTriggerFromFilename(filename)
            : [];

          // Store in IndexedDB if available
          let soundId: string | null = null;
          if (isIndexedDBAvailable()) {
            const nameWithoutExt = filename.substring(0, filename.lastIndexOf("."));
            soundId = await saveSoundToIndexedDB(nameWithoutExt, base64Data);
          }

          // Create sound object
          const sound: ISound = {
            name: filename.substring(0, filename.lastIndexOf(".")),
            url: "",
            base64: soundId ? "" : base64Data,
            soundId: soundId || "",
            enabled: true,
            triggers,
          };

          sounds.push(sound);
        }

        if (sounds.length === 0) {
          showNotification(t("caller.notifications.noAudioInZip"), "error");
          closeImportURLModal();
          return;
        }

        // Add the sounds to the config
        config.value.caller.sounds = [ ...sounds, ...config.value.caller.sounds ];
        importedCount.value = sounds.length;

        // Show success notification
        showNotification(t("caller.notifications.importedFromZip", { count: sounds.length }));
      }

      // Close modal
      closeImportURLModal();
    } catch (error) {
      console.error("Error processing ZIP file:", error);

      // Provide a more specific error message if possible
      let errorMessage = t("caller.notifications.zipFailed");
      if (error instanceof Error) {
        if (error.message.includes("Failed to download")) {
          errorMessage = t("caller.notifications.zipDownloadFailed");
        } else if (error.message.includes("Invalid") || error.message.includes("corrupt")) {
          errorMessage = t("caller.notifications.zipInvalid");
        }
      }

      showNotification(errorMessage, "error");
    }
    return;
  }

  // Start import process for regular URL
  isImporting.value = true;
  importProgress.value = 0;
  importedCount.value = 0;

  try {
    // Special named sounds to check
    const specialSounds = [
      { filename: "gameshot", triggers: [ "gameshot" ] },
      { filename: "game on", triggers: [ "gameon" ] },
      { filename: "miss_3rd_dart", triggers: [ "miss", "busted" ] },
    ];

    // Check for special named files first
    for (const specialSound of specialSounds) {
      const extensions = [ ".mp3", ".wav" ];

      for (const ext of extensions) {
        // Format the URL - handle spaces in filenames
        const encodedFilename = encodeURIComponent(specialSound.filename);
        const soundURL = `${baseURL.value.endsWith("/") ? baseURL.value : `${baseURL.value}/`}${encodedFilename}${ext}`;

        try {
          // Use backgroundFetch utility to bypass CORS
          const response = await backgroundFetch(soundURL);

          // If found, process it
          if (response.ok && response.data) {
            // Get the correct MIME type based on the actual content
            const detectedType = detectAudioMimeType(response.data);
            const base64Content = response.data.includes("data:")
              ? response.data.split(";base64,")[1]
              : response.data;

            // Create a properly formatted data URI with the correct MIME type
            const base64Data = `data:${detectedType};base64,${base64Content}`;

            // Store in IndexedDB if available
            let soundId: string | null = null;
            if (isIndexedDBAvailable()) {
              soundId = await saveSoundToIndexedDB(specialSound.filename, base64Data);
            }

            // Create sound object with specified triggers
            const sound: ISound = {
              name: specialSound.filename,
              url: "",
              base64: soundId ? "" : base64Data,
              soundId: soundId || "",
              enabled: true,
              triggers: specialSound.triggers,
            };

            // Add to sounds array
            config.value.caller.sounds.unshift(sound);
            importedCount.value++;

            // Found a sound with this name, no need to try other extensions
            break;
          }
        } catch (error) {
          console.warn(`Failed to fetch ${soundURL}:`, error);
        }

        // Add a small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Process numbers from 0 to 180
    for (let i = 0; i <= 180; i++) {
      importProgress.value = i;

      // Try both mp3 and wav extensions
      const extensions = [ ".mp3", ".wav" ];

      for (const ext of extensions) {
        const soundURL = `${baseURL.value.endsWith("/") ? baseURL.value : `${baseURL.value}/`}${i}${ext}`;

        try {
          // Use backgroundFetch utility to bypass CORS
          const response = await backgroundFetch(soundURL);

          // If found, process it
          if (response.ok && response.data) {
            // Get the correct MIME type based on the actual content
            const detectedType = detectAudioMimeType(response.data);
            const base64Content = response.data.includes("data:")
              ? response.data.split(";base64,")[1]
              : response.data;

            // Create a properly formatted data URI with the correct MIME type
            const base64Data = `data:${detectedType};base64,${base64Content}`;

            // Extract filename for the sound name
            const filename = `${i}${ext}`;
            const nameWithoutExt = filename.substring(0, filename.lastIndexOf("."));

            // Generate triggers if option is enabled
            const triggers = generateTriggersFromURLFilenames.value
              ? extractTriggerFromFilename(filename)
              : [];

            // Store in IndexedDB if available
            let soundId: string | null = null;
            if (isIndexedDBAvailable()) {
              soundId = await saveSoundToIndexedDB(nameWithoutExt, base64Data);
            }

            // Create sound object
            const sound: ISound = {
              name: nameWithoutExt,
              url: "", // Leave URL blank
              base64: soundId ? "" : base64Data, // Only store in config if not in IndexedDB
              soundId: soundId || "", // Store the IndexedDB ID if available
              enabled: true,
              triggers,
            };

            // Add to sounds array
            config.value.caller.sounds.unshift(sound);
            importedCount.value++;

            // Found a sound with this number, no need to try other extensions
            break;
          }
        } catch (error) {
          // Silently fail for individual sound fetches
          console.warn(`Failed to fetch ${soundURL}:`, error);
        }

        // Add a small delay between requests to not overwhelm the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Add a small delay between numbers
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Show success notification
    showNotification(t("caller.notifications.importedFromUrl", { count: importedCount.value }));
  } catch (error) {
    console.error("Error during import process:", error);
    showNotification(t("caller.notifications.urlImportFailed"), "error");
  } finally {
    isImporting.value = false;
    // Close modal if any sounds were imported
    if (importedCount.value > 0) {
      closeImportURLModal();
    }
  }
}

// Function to check if URL is from allowed domains
function checkAllowedDomain(url: string): boolean {
  const allowedDomains = [
    "darts-downloads.peschi.org",
    "adt-socket.tobias-thiele.de",
    "autodarts.x10.mx",
  ];

  try {
    const urlObj = new URL(url);
    return allowedDomains.includes(urlObj.hostname);
  } catch (error) {
    return false;
  }
}

// TTS functions
function openTTSModal(sound?: ISound, index?: number) {
  stopPlayback();
  if (sound?.tts && index !== undefined) {
    // Edit mode
    ttsEditingIndex.value = index;
    ttsForm.value = {
      text: sound.tts.text,
      name: sound.name || sound.tts.text,
      voiceURI: sound.tts.voiceURI || "",
      lang: sound.tts.lang || "",
      rate: sound.tts.rate ?? 1,
      pitch: sound.tts.pitch ?? 1,
      volume: soundVolume(sound),
      triggers: Array.isArray(sound.triggers) ? [ ...sound.triggers ] : [],
    };
  } else {
    // New mode — use last-used settings from localStorage
    ttsEditingIndex.value = null;
    ttsForm.value = {
      text: "",
      name: "",
      voiceURI: lastVoiceURI.value,
      lang: "",
      rate: lastRate.value,
      pitch: lastPitch.value,
      volume: DEFAULT_VOLUME,
      triggers: [],
    };
  }
  showTTSModal.value = true;
}

function closeTTSModal() {
  stopPlayback();
  showTTSModal.value = false;
  ttsEditingIndex.value = null;
}

function prelistenTTS() {
  if (!ttsForm.value.text) return;
  stopPlayback();
  preview(ttsForm.value.text, ttsForm.value.voiceURI, ttsForm.value.rate, ttsForm.value.pitch, ttsForm.value.volume);
}

function saveTTSSound() {
  if (!config.value || !ttsForm.value.text || !ttsForm.value.triggers.length) return;

  stopPlayback();
  saveDefaults(ttsForm.value.voiceURI, ttsForm.value.rate, ttsForm.value.pitch);

  const triggers = [ ...ttsForm.value.triggers ];
  const selectedVoice = voices.value.find(v => v.value === ttsForm.value.voiceURI);

  const sound: ISound = {
    name: ttsForm.value.text,
    url: "",
    base64: "",
    enabled: true,
    triggers,
    tts: {
      text: ttsForm.value.text,
      voiceURI: ttsForm.value.voiceURI,
      lang: selectedVoice?.lang || ttsForm.value.lang || "",
      rate: ttsForm.value.rate,
      pitch: ttsForm.value.pitch,
    },
  };
  // Only a volume other than the voice's own is stored
  if (ttsForm.value.volume !== DEFAULT_VOLUME) sound.volume = ttsForm.value.volume;

  // Read before closing, which resets it.
  const editing = ttsEditingIndex.value;
  if (editing !== null) {
    // Update existing
    const existing = config.value.caller.sounds[editing];
    sound.enabled = existing.enabled;
    config.value.caller.sounds[editing] = sound;
  } else {
    // Add new
    config.value.caller.sounds.unshift(sound);
  }

  closeTTSModal();
  showNotification(t(editing !== null ? "library.sounds.notifications.ttsUpdated" : "library.sounds.notifications.ttsAdded"));
}
</script>
