<template>
  <template v-if="!$attrs['data-feature-index']">
    <!-- Settings Panel -->
    <!-- Visible overflow so the list's heading can stick; see Wled.vue. -->
    <div v-if="config" class="adt-container !overflow-visible">
      <div class="relative z-10 pr-2 text-[var(--ad-text-secondary)]">
        <p class="mb-6 max-w-3xl">
          Calls out scores, checkouts and names during a match, in a voice of your choice. Each sound plays on the
          triggers you give it.
        </p>

        <section class="mb-10">
          <h3 class="adt-section-title">
            Options
          </h3>
          <OptionRow description="Call each dart as it lands, not only the visit's total." title="Call every dart">
            <AppToggle v-model="config.caller.callEveryDart" size="sm" />
          </OptionRow>
          <OptionRow description="Say what a player requires when they're on a finish, and in Gotcha the number left to the target." title="Call checkout">
            <AppToggle v-model="config.caller.callCheckout" size="sm" />
          </OptionRow>
          <OptionRow title="Prefer combined throws">
            <template #description>
              When there's a sound for the exact darts, such as <code class="adt-code">s20_s5_s1</code>, play it instead of the visit's total.
            </template>
            <AppToggle v-model="config.caller.preferCombinedThrows" size="sm" />
          </OptionRow>
        </section>

        <LibrarySection
          @reorder="moveSound"
          :entries="entries"
          empty-icon="icon-[material-symbols--record-voice-over-outline-rounded]"
          empty-text="Import a ready-made caller set, upload recordings of your own, or generate them from text."
          empty-title="No sounds yet"
          search-placeholder="Search sounds by name or trigger"
          title="Sounds"
        >
          <template #actions>
            <AppMenu :items="moreActions">
              <template #trigger="{ open, toggle }">
                <button @click="toggle" :aria-expanded="open" aria-label="More actions" class="adt-icon-btn" title="More" type="button">
                  <span class="icon-[material-symbols--more-horiz]" />
                </button>
              </template>
            </AppMenu>
            <AppMenu :items="addActions">
              <template #trigger="{ open, toggle }">
                <AppButton @click="toggle" :aria-expanded="open" auto size="sm" type="primary">
                  <span class="flex items-center gap-1">
                    <span class="icon-[material-symbols--add-rounded] text-lg" />
                    Add
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
              </template>
            </LibraryItem>
          </template>

          <template #empty>
            <AppButton @click="openImportURLModal" auto type="primary">
              Import a caller set
            </AppButton>
            <AppButton @click="openUploadModal" auto>
              Upload files
            </AppButton>
            <AppButton @click="openTTSModal()" :disabled="!isTTSAvailable" auto>
              Generate a sound
            </AppButton>
            <AppButton @click="openAddSoundModal" auto>
              Add from a link
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
      :editing="isEditMode"
      :has-file="draftHasFile"
      :playing="playingKey === DRAFT_KEY"
      :show="showSoundModal"
      :url-error="urlError"
      feature="caller"
    />

    <UploadDialog
      @close="closeUploadModal"
      @save="processFiles"
      :noun="{ one: 'sound', other: 'sounds' }"
      :processing="isProcessing"
      :show="showUploadModal"
      :triggers-from-name="file => extractTriggerFromFilename(file.name)"
      accept="audio/*"
      feature="caller"
      file-icon="icon-[material-symbols--audio-file-outline-rounded]"
      formats="MP3, WAV or OGG"
      names-hint="A file named 180.mp3 plays on 180. Anything after a + is left out, so 180+crowd.mp3 does too."
      title="Upload sounds"
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
      :editing="ttsEditingIndex !== null"
      :show="showTTSModal"
      :speaking="isSpeaking"
      :voices="voices"
      feature="caller"
    />

    <AppModal @close="closeDeleteAllModal" :show="showDeleteAllModal" :title="`Delete all ${config?.caller.sounds.length ?? 0} sounds?`" ghost-close size="sm">
      <p class="text-sm text-[var(--ad-text-muted)]">
        They're removed for good, stored files included. This can't be undone.
      </p>
      <template #footer>
        <AppButton @click="closeDeleteAllModal" auto>
          Cancel
        </AppButton>
        <AppButton @click="deleteAllSounds" auto type="danger">
          Delete all
        </AppButton>
      </template>
    </AppModal>

    <AppModal @close="closeImportURLModal" :show="showImportURLModal" ghost-close size="lg" title="Import a caller set">
      <div class="space-y-5">
        <AppSelect
          id="preset-url"
          v-model="selectedPresetURL"
          :options="callerSets"
          helper-text="From darts-downloads.peschi.org. Some sets may not play in Safari, and Tools for Autodarts isn't responsible for what they say."
          label="Caller set"
        />
        <div>
          <AppInput id="base-url" v-model="baseURL" label="Link" placeholder="https://darts-downloads.peschi.org/soundfiles/…" type="url">
            <template #icon>
              <span class="icon-[material-symbols--link-rounded]" />
            </template>
          </AppInput>
          <p class="adt-field-hint">
            Filled in from the set above, or a link of your own: a ZIP file, or a folder with files named 0.mp3 to 180.mp3.
            Triggers come from the file names. Links on darts-downloads.peschi.org, adt-socket.tobias-thiele.de and
            autodarts.x10.mx are supported.
          </p>
        </div>
        <AppAlert v-if="urlError" compact variant="error">
          {{ urlError }}
        </AppAlert>

        <div v-if="isZipFile && (isDownloadingZip || isExtractingZip || isProcessingCsv)" class="space-y-4 rounded-[var(--ad-radius-lg)] bg-white/[.04] p-4">
          <div v-if="isDownloadingZip">
            <div class="mb-1.5 flex justify-between text-xs">
              <span>Downloading the ZIP file…</span>
              <span class="tabular-nums">{{ zipDownloadProgress }}%</span>
            </div>
            <div class="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div :style="{ width: `${zipDownloadProgress}%` }" class="h-full rounded-full bg-[var(--ad-action-primary)] transition-all duration-300" />
            </div>
          </div>
          <div v-if="isExtractingZip">
            <div class="mb-1.5 flex justify-between text-xs">
              <span>Unpacking…</span>
              <span class="tabular-nums">{{ zipExtractedFiles }} / {{ zipTotalFiles || "?" }}</span>
            </div>
            <div class="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div :style="{ width: `${zipTotalFiles ? (zipExtractedFiles / zipTotalFiles) * 100 : 0}%` }" class="h-full rounded-full bg-[var(--ad-action-primary)] transition-all duration-300" />
            </div>
          </div>
          <div v-if="isProcessingCsv">
            <div class="mb-1.5 flex justify-between text-xs">
              <span>Matching sounds to triggers…</span>
              <span class="tabular-nums">{{ csvProcessingProgress }}%</span>
            </div>
            <div class="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div :style="{ width: `${csvProcessingProgress}%` }" class="h-full rounded-full bg-[var(--ad-action-primary)] transition-all duration-300" />
            </div>
          </div>
        </div>

        <div v-else-if="isImporting" class="rounded-[var(--ad-radius-lg)] bg-white/[.04] p-4">
          <div class="mb-1.5 flex justify-between text-xs">
            <span>Looking for sounds…</span>
            <span class="tabular-nums">{{ importedCount }} found</span>
          </div>
          <div class="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div :style="{ width: `${(importProgress / 181) * 100}%` }" class="h-full rounded-full bg-[var(--ad-action-primary)] transition-all duration-300" />
          </div>
        </div>
      </div>

      <template #footer>
        <AppButton @click="closeImportURLModal" auto>
          Cancel
        </AppButton>
        <AppButton
          @click="fetchSoundsFromURL"
          :disabled="!baseURL || isImporting || isDownloadingZip || isExtractingZip || isProcessingCsv"
          :loading="isImporting || isDownloadingZip || isExtractingZip || isProcessingCsv"
          auto
          type="primary"
        >
          Import
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
            Caller
            <span class="icon-[material-symbols--settings-alert-outline-rounded] ml-2 size-5" />
          </h3>
          <p class="w-2/3 text-white/70">
            Call out scores, checkouts and special events during your matches with customizable sound effects.
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
        <img :src="imageUrl" alt="Caller" class="size-full object-cover">
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

import LibraryItem from "./Library/LibraryItem.vue";
import LibrarySection from "./Library/LibrarySection.vue";
import OptionRow from "./Library/OptionRow.vue";
import PlayButton from "./Library/PlayButton.vue";
import SoundDialog from "./Library/SoundDialog.vue";
import SoundSource from "./Library/SoundSource.vue";
import TtsDialog from "./Library/TtsDialog.vue";
import UploadDialog from "./Library/UploadDialog.vue";
import { stableKey } from "./Library/stable-key";

import type { LibraryEntry } from "@/utils/library-search";

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

const emit = defineEmits([ "toggle" ]);
useStorage("adt:active-settings", "caller");

/** The playing key of a sound tried out in the add/edit dialog, before it is in the list. */
const DRAFT_KEY = -1;

const { config } = useConfig();
const imageUrl = browser.runtime.getURL("/images/caller.png");
const showSoundModal = ref(false);
const isEditMode = ref(false);
const newSound = ref({ url: "", name: "", base64: "", triggers: [] as string[] });
const editingIndex = ref<number | null>(null);
const urlError = ref("");

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

// Predefined caller sets for the select input
const callerSets = [
  { value: "", label: "Pick a set…" },

  // Dutch (nl-NL)
  { value: "https://darts-downloads.peschi.org/soundfiles/nl-NL-Laura-Female-v5.zip", label: "NL - Laura (Female)" },

  // French (fr-FR)
  { value: "https://darts-downloads.peschi.org/soundfiles/fr-FR-Remi-Male-v3.zip", label: "FR - Remi (Male)" },
  { value: "https://darts-downloads.peschi.org/soundfiles/fr-FR-Lea-Female-v3.zip", label: "FR - Lea (Female)" },

  // Spanish (es-ES)
  { value: "https://darts-downloads.peschi.org/soundfiles/es-ES-Lucia-Female-v3.zip", label: "ES - Lucia (Female)" },
  { value: "https://darts-downloads.peschi.org/soundfiles/es-ES-Sergio-Male-v3.zip", label: "ES - Sergio (Male)" },

  // Austrian German (de-AT)
  { value: "https://darts-downloads.peschi.org/soundfiles/de-AT-Hannah-Female-v5.zip", label: "AT - Hannah (Female)" },

  // German (de-DE)
  { value: "https://darts-downloads.peschi.org/soundfiles/de-DE-Vicki-Female-v8.zip", label: "DE - Vicki (Female)" },
  { value: "https://darts-downloads.peschi.org/soundfiles/de-DE-Daniel-Male-v8.zip", label: "DE - Daniel (Male)" },

  // British English (en-GB)
  { value: "https://darts-downloads.peschi.org/soundfiles/en-GB-Amy-Female-v4.zip", label: "GB - Amy (Female)" },
  { value: "https://darts-downloads.peschi.org/soundfiles/en-GB-Arthur-Male-v4.zip", label: "GB - Arthur (Male)" },

  // American English (en-US)
  { value: "https://darts-downloads.peschi.org/soundfiles/en-US-Ivy-Female-v8.zip", label: "US - Ivy (Female)" },
  { value: "https://darts-downloads.peschi.org/soundfiles/en-US-Joey-Male-v9.zip", label: "US - Joey (Male)" },
  { value: "https://darts-downloads.peschi.org/soundfiles/en-US-Joanna-Female-v9.zip", label: "US - Joanna (Female)" },
  { value: "https://darts-downloads.peschi.org/soundfiles/en-US-Matthew-Male-v6.zip", label: "US - Matthew (Male)" },
  { value: "https://darts-downloads.peschi.org/soundfiles/en-US-Danielle-Female-v6.zip", label: "US - Danielle (Female)" },
  { value: "https://darts-downloads.peschi.org/soundfiles/en-US-Kimberly-Female-v5.zip", label: "US - Kimberly (Female)" },
  { value: "https://darts-downloads.peschi.org/soundfiles/en-US-Ruth-Female-v5.zip", label: "US - Ruth (Female)" },
  { value: "https://darts-downloads.peschi.org/soundfiles/en-US-Salli-Female-v5.zip", label: "US - Salli (Female)" },
  { value: "https://darts-downloads.peschi.org/soundfiles/en-US-Kevin-Male-v5.zip", label: "US - Kevin (Male)" },
  { value: "https://darts-downloads.peschi.org/soundfiles/en-US-Justin-Male-v5.zip", label: "US - Justin (Male)" },
  { value: "https://darts-downloads.peschi.org/soundfiles/en-US-Stephen-Male-v8.zip", label: "US - Stephen (Male)" },
  { value: "https://darts-downloads.peschi.org/soundfiles/en-US-Kendra-Female-v9.zip", label: "US - Kendra (Female)" },
  { value: "https://darts-downloads.peschi.org/soundfiles/en-US-Gregory-Male-v6.zip", label: "US - Gregory (Male)" },
];

const entries = computed<LibraryEntry[]>(() => (config.value?.caller.sounds ?? []).map((sound, index) => {
  const triggers = Array.isArray(sound.triggers) ? sound.triggers : [];
  return {
    index,
    name: sound.name || sound.tts?.text || triggers[0] || "Untitled sound",
    triggers,
    source: sound.tts ? `tts ${sound.tts.text}` : sound.url || "uploaded",
    enabled: sound.enabled,
  };
}));

/** An uploaded sound being edited: its file loads a moment after the dialog opens. */
const draftHasFile = computed(() => {
  if (newSound.value.base64) return true;
  if (!isEditMode.value || editingIndex.value === null) return false;
  return !!config.value?.caller.sounds[editingIndex.value]?.soundId;
});

const addActions = computed(() => [
  { label: "Import a caller set", hint: "Ready-made voices in eight languages", icon: "icon-[material-symbols--library-music-outline-rounded]", action: openImportURLModal },
  { label: "Upload files", hint: "MP3, WAV or OGG, several at once", icon: "icon-[material-symbols--upload-rounded]", action: openUploadModal },
  {
    label: "Generate a sound",
    hint: isTTSAvailable.value ? "Text to speech, in a voice on this device" : "This device has no text-to-speech voices",
    icon: "icon-[material-symbols--record-voice-over-outline-rounded]",
    disabled: !isTTSAvailable.value,
    action: () => openTTSModal(),
  },
  { label: "Add from a link", hint: "A sound file on the web", icon: "icon-[material-symbols--link-rounded]", action: openAddSoundModal },
]);

const moreActions = computed(() => [
  {
    label: "Sort by trigger",
    hint: "Puts the list in trigger order",
    icon: "icon-[material-symbols--sort-by-alpha-rounded]",
    disabled: (config.value?.caller.sounds.length ?? 0) < 2,
    action: sortSoundsByTriggers,
  },
  {
    label: "Delete all…",
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

onBeforeUnmount(stopPlayback);

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
  const { url, base64, name } = newSound.value;
  const stored = isEditMode.value && editingIndex.value !== null ? config.value?.caller.sounds[editingIndex.value] : undefined;
  playSound({ name, url: url.trim(), base64, soundId: base64 ? undefined : stored?.soundId, enabled: true, triggers: [] }, DRAFT_KEY);
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
  newSound.value = { url: "", name: "", base64: "", triggers: [] };
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
    showNotification("Please provide either a sound URL or upload a file", "error");
    return;
  }
  if (!newSound.value.triggers.length) {
    showNotification("Please provide at least one trigger", "error");
    return;
  }

  // Check if URL starts with https://
  if (newSound.value.url && !newSound.value.url.startsWith("https://")) {
    urlError.value = "The link has to start with https://, for security.";
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
        newSound.value.name.trim() || "Unnamed sound",
        newSound.value.base64,
        existingSound.soundId, // Pass existing soundId to update instead of creating new
      );
    } else {
      // Create new sound in IndexedDB
      soundId = await saveSoundToIndexedDB(
        newSound.value.name.trim() || "Unnamed sound",
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
  newSound.value = { url: "", name: "", base64: "", triggers: [] };
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

    showNotification(`Added ${added} ${added === 1 ? "sound" : "sounds"}`);
  } catch (error) {
    console.error("Error processing files:", error);
    showNotification("Error processing files", "error");
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
  showNotification("Caller sounds have been sorted by their triggers");
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
  showNotification("All caller sounds have been deleted", "error");
}

async function playSound(sound: ISound, key: number) {
  stopPlayback();
  playingKey.value = key;

  // Handle TTS sounds; the isSpeaking watcher clears the key when it is done.
  if (sound.tts) {
    preview(sound.tts.text, sound.tts.voiceURI, sound.tts.rate, sound.tts.pitch);
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
        showNotification("No audio source available for this sound", "error");
        finish();
        return;
      }
    }

    // Stopped, or another sound started, while the file was read.
    if (currentPlayer !== audio) return;

    audio.addEventListener("ended", finish);

    // Use blob approach for all browsers, but especially Safari
    // This avoids the NotSupportedError on Safari
    if (source.startsWith("data:")) {
      try {
        const blob = base64toBlob(source);
        const blobUrl = URL.createObjectURL(blob);

        audio.onerror = (e) => {
          console.error("Error loading sound:", e);
          URL.revokeObjectURL(blobUrl);
          showNotification("Failed to play sound", "error");
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
    showNotification("Failed to play sound", "error");
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
    if (confirm("Import in progress. Are you sure you want to cancel?")) {
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
      urlError.value = "URL must start with https:// for security reasons";
      return;
    }

    // Check if URL is from allowed domains
    const isAllowedDomain = checkAllowedDomain(baseURL.value);
    if (!isAllowedDomain) {
      urlError.value = "Custom URLs are currently not supported due to security reasons";
      return;
    }

    // Test if URL is valid
    const urlObj = new URL(baseURL.value);
    urlError.value = "";
  } catch (error) {
    urlError.value = "Invalid URL format";
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
          showNotification("No sounds found in the ZIP file or CSV mapping", "error");
          closeImportURLModal();
          return;
        }

        // Add the sounds to the config
        config.value.caller.sounds = [ ...sounds, ...config.value.caller.sounds ];
        importedCount.value = sounds.length;

        // Show success notification
        showNotification(`Successfully imported ${sounds.length} sounds from ZIP file`);
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
          showNotification("No audio files found in the ZIP file", "error");
          closeImportURLModal();
          return;
        }

        // Add the sounds to the config
        config.value.caller.sounds = [ ...sounds, ...config.value.caller.sounds ];
        importedCount.value = sounds.length;

        // Show success notification
        showNotification(`Successfully imported ${sounds.length} sounds from ZIP file`);
      }

      // Close modal
      closeImportURLModal();
    } catch (error) {
      console.error("Error processing ZIP file:", error);

      // Provide a more specific error message if possible
      let errorMessage = "Error processing ZIP file";
      if (error instanceof Error) {
        if (error.message.includes("Failed to download")) {
          errorMessage = "Failed to download ZIP file - check your URL";
        } else if (error.message.includes("Invalid") || error.message.includes("corrupt")) {
          errorMessage = "Invalid or corrupted ZIP file";
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
    showNotification(`Successfully imported ${importedCount.value} sounds from URL`);
  } catch (error) {
    console.error("Error during import process:", error);
    showNotification("Error importing sounds from URL", "error");
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
  preview(ttsForm.value.text, ttsForm.value.voiceURI, ttsForm.value.rate, ttsForm.value.pitch);
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
  showNotification(editing !== null ? "TTS sound updated" : "TTS sound added");
}
</script>
