<template>
  <template v-if="!$attrs['data-feature-index']">
    <!-- Settings Panel -->
    <!-- Visible overflow so the list's heading can stick; see Wled.vue. -->
    <div v-if="config" class="adt-container !overflow-visible">
      <div class="relative z-10 pr-2 text-[var(--ad-text-secondary)]">
        <p class="mb-6 max-w-3xl">
          Plays sound effects on game events, such as a crowd on a 180 or a groan on a bust. Each sound plays on the
          triggers you give it. Start them with <code class="adt-code">ambient_</code> to keep them apart from the Caller's.
        </p>

        <section class="mb-10">
          <h3 class="adt-section-title">
            Options
          </h3>
          <OptionRow description="The games it plays in. Lobby and tournament sounds play in any game." title="Game modes">
            <GameModesField v-model="config.soundFx.disabledGameModes" feature="soundFx" intro="Sound FX only plays in the games switched on here." />
          </OptionRow>
        </section>

        <LibrarySection
          @reorder="moveSound"
          :entries="entries"
          empty-icon="icon-[material-symbols--graphic-eq-rounded]"
          empty-text="Upload sounds of your own, add one from a link, or generate one from text."
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
              @toggle="config.soundFx.sounds[entry.index].enabled = $event"
              v-for="entry in shown"
              :key="stableKey(config.soundFx.sounds[entry.index])"
              :data-index="entry.index"
              :draggable="!filtering"
              :enabled="entry.enabled"
              :query="query"
              :title="entry.name"
              :triggers="entry.triggers"
            >
              <template #lead>
                <PlayButton @click="togglePlay(entry.index)" :label="entry.name" :playing="playingKey === stableKey(config.soundFx.sounds[entry.index])" />
              </template>
              <template #meta>
                <SoundSource :sound="config.soundFx.sounds[entry.index]" :voices="voices" />
                <VolumeBadge :sound="config.soundFx.sounds[entry.index]" />
              </template>
            </LibraryItem>
          </template>

          <template #empty>
            <AppButton @click="openUploadModal" auto type="primary">
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
      v-model:volume="newSound.volume"
      :editing="isEditMode"
      :has-file="draftHasFile"
      :louder-blocked="louderBlocked"
      :playing="playingKey === DRAFT_KEY"
      :show="showSoundModal"
      :url-error="urlError"
      feature="soundFx"
    />

    <UploadDialog
      @close="closeUploadModal"
      @save="processFiles"
      :formats="t('library.upload.formatsAudio')"
      :processing="isProcessing"
      :show="showUploadModal"
      :triggers-from-name="file => extractTriggerFromFilename(file.name)"
      accept="audio/*"
      add-key="library.upload.addSounds"
      feature="soundFx"
      file-icon="icon-[material-symbols--audio-file-outline-rounded]"
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
      v-model:volume="ttsForm.volume"
      :editing="ttsEditingIndex !== null"
      :show="showTTSModal"
      :speaking="isSpeaking"
      :voices="voices"
      feature="soundFx"
    />

    <AppModal @close="closeDeleteAllModal" :show="showDeleteAllModal" :title="`Delete all ${config?.soundFx.sounds.length ?? 0} sounds?`" ghost-close size="sm">
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
            Sound FX
            <span class="icon-[material-symbols--settings-alert-outline-rounded] ml-2 size-5" />
          </h3>
          <p class="w-2/3 text-white/70">
            Play sound effects for special events like 180s, checkouts, and match wins.
          </p>
        </div>
        <div class="flex">
          <div @click="$emit('toggle', 'sound-fx')" class="absolute inset-y-0 left-12 right-0 cursor-pointer" />
          <AppToggle
            @update:model-value="toggleFeature"
            v-model="config.soundFx.enabled"
          />
        </div>
      </div>
      <div class="gradient-mask-left absolute inset-y-0 right-0 w-2/3">
        <img :src="imageUrl" alt="Sound FX" class="size-full object-cover">
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import { useStorage } from "@vueuse/core";

import AppButton from "../AppButton.vue";
import AppMenu from "../AppMenu.vue";
import AppModal from "../AppModal.vue";
import AppNotification from "../AppNotification.vue";
import AppToggle from "../AppToggle.vue";

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

import type { LibraryEntry } from "@/utils/library-search";

import { useLouderCheck } from "@/composables/useLouderCheck";
import { useNotification } from "@/composables/useNotification";
import { useTTS } from "@/composables/useTTS";
import { type ISound } from "@/utils/storage";
import {
  base64toBlob,
  deleteSoundFxFromIndexedDB,
  getSoundFxFromIndexedDB,
  isIndexedDBAvailable,
  isSafari,
  saveSoundFxToIndexedDB,
} from "@/utils/helpers";
import { elementVolumeWorks, soundCopies } from "@/utils/sound-copies";
import { DEFAULT_VOLUME, cappedVolume, isLink, planVolume, soundVolume } from "@/utils/sound-volume";

const emit = defineEmits([ "toggle" ]);
useStorage("adt:active-settings", "sound-fx");

/** The playing key of a sound tried out in the add/edit dialog, before it is in the list. */
const DRAFT_KEY = -1;

const { t } = useI18n();
const { config } = useConfig();
const imageUrl = browser.runtime.getURL("/images/sound-fx.png");
const showSoundModal = ref(false);
const isEditMode = ref(false);
const newSound = ref({ url: "", name: "", base64: "", triggers: [] as string[], volume: DEFAULT_VOLUME });
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
/** Copies of sounds at volumes their files don't have, for the play buttons — see utils/sound-copies.ts. */
const copies = soundCopies();

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

const entries = computed<LibraryEntry[]>(() => (config.value?.soundFx.sounds ?? []).map((sound, index) => {
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
  return !!config.value?.soundFx.sounds[editingIndex.value]?.soundId;
});

/** A link set above 100% that the extension cannot read, so the editor can say it plays at 100% at most. */
const louderBlocked = useLouderCheck(copies, () => ({
  open: showSoundModal.value,
  url: newSound.value.url,
  volume: newSound.value.volume,
  hasFile: draftHasFile.value,
}));

const addActions = computed(() => [
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
    disabled: (config.value?.soundFx.sounds.length ?? 0) < 2,
    action: sortSoundsByTriggers,
  },
  {
    label: "Delete all…",
    icon: "icon-[material-symbols--delete-outline-rounded]",
    danger: true,
    separated: true,
    disabled: !config.value?.soundFx.sounds.length,
    action: openDeleteAllModal,
  },
]);

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
  const sounds = config.value?.soundFx.sounds;
  if (!sounds) return;
  const [ moved ] = sounds.splice(from, 1);
  sounds.splice(to, 0, moved);
}

function editAny(index: number) {
  const sound = config.value!.soundFx.sounds[index];
  if (sound.tts) openTTSModal(sound, index);
  else editSound(index);
}

function togglePlay(index: number) {
  const sound = config.value!.soundFx.sounds[index];
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
  const stored = isEditMode.value && editingIndex.value !== null ? config.value?.soundFx.sounds[editingIndex.value] : undefined;
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

// Modal handling
function openAddSoundModal() {
  newSound.value = { name: "", url: "", base64: "", triggers: [], volume: DEFAULT_VOLUME };
  isEditMode.value = false;
  editingIndex.value = null;
  urlError.value = "";
  showSoundModal.value = true;
}

function closeSoundModal() {
  if (playingKey.value === DRAFT_KEY) stopPlayback();
  newSound.value = { name: "", url: "", base64: "", triggers: [], volume: DEFAULT_VOLUME };
  showSoundModal.value = false;
  editingIndex.value = null;
  urlError.value = "";
}

function editSound(index: number) {
  const sound = config.value!.soundFx.sounds[index];

  // Set up base form values
  newSound.value = {
    name: sound.name || "",
    url: sound.url || "",
    base64: "", // loaded below if needed
    triggers: Array.isArray(sound.triggers) ? [ ...sound.triggers ] : [],
    volume: soundVolume(sound),
  };

  // If we have a soundId, load from IndexedDB
  if (sound.soundId && isIndexedDBAvailable()) {
    getSoundFxFromIndexedDB(sound.soundId)
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
  if (!config.value) {
    showNotification("Configuration not loaded", "error");
    return;
  }

  // Check if we have either a URL or base64 data
  if (!newSound.value.url && !newSound.value.base64) {
    showNotification("Please provide either a sound URL or upload a file", "error");
    return;
  }

  // Check if we have triggers
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
    soundId = await saveSoundFxToIndexedDB(
      newSound.value.name.trim() || "Unnamed sound",
      newSound.value.base64,
    );

    if (!soundId) {
      // If IndexedDB failed, fall back to storing in config
      console.warn("Failed to save sound to IndexedDB, falling back to local storage");
    }
  }

  // Create sound object
  const sound: ISound = {
    name: newSound.value.name.trim() || "",
    url: newSound.value.url || "",
    base64: soundId ? "" : newSound.value.base64 || "", // Only store base64 in config if we couldn't store in IndexedDB
    soundId: soundId || "", // Store the IndexedDB ID if available
    enabled: true, // New sounds are enabled by default
    triggers,
  };
  // Only a volume other than the file's own is stored
  if (newSound.value.volume !== DEFAULT_VOLUME) sound.volume = newSound.value.volume;

  if (isEditMode.value && editingIndex.value !== null) {
    // Update existing sound
    const existingSound = config.value.soundFx.sounds[editingIndex.value];
    sound.enabled = existingSound.enabled; // Preserve enabled state when editing

    // Delete old sound from IndexedDB if exists and different
    if (existingSound.soundId && existingSound.soundId !== sound.soundId) {
      await deleteSoundFxFromIndexedDB(existingSound.soundId);
    }

    config.value.soundFx.sounds[editingIndex.value] = sound;
  } else {
    config.value.soundFx.sounds.unshift(sound);
  }

  // Reset form and close modal
  closeSoundModal();
}

async function removeSound(index: number) {
  const sounds = config.value?.soundFx.sounds;
  if (!sounds) return;

  const sound = sounds[index];
  if (playingKey.value === stableKey(sound)) stopPlayback();

  // If sound is stored in IndexedDB, delete it
  if (sound.soundId && isIndexedDBAvailable()) {
    await deleteSoundFxFromIndexedDB(sound.soundId);
  }

  // Found again after the wait, in case another delete moved it.
  const at = sounds.indexOf(sound);
  if (at !== -1) sounds.splice(at, 1);
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

  // Create an audio element with preload enabled
  const audio = new Audio();
  audio.preload = "auto";
  currentPlayer = audio;

  const finish = () => {
    if (currentPlayer !== audio) return;
    currentPlayer = null;
    playingKey.value = null;
  };

  // The stored upload first, then the config's copy, then the link
  let source = "";
  let blobUrl: string | undefined;
  if (sound.soundId && isIndexedDBAvailable()) {
    source = (await getSoundFxFromIndexedDB(sound.soundId)) || "";
  }
  if (!source) source = sound.base64 || sound.url;
  if (!source) {
    // No audio source available
    showNotification("No audio source available for this sound", "error");
    finish();
    return;
  }

  // A volume the file doesn't have plays from a copy made at that volume.
  const copy = plan.kind === "copy" ? await copies.copyAt(source, plan.percent) : null;

  // Stopped, or another sound started, while the file was read.
  if (currentPlayer !== audio) return;

  if (copy) {
    source = copy;
  } else {
    // Without a copy, the file as it is, as loud as the element goes
    audio.volume = plan.kind === "element" ? plan.volume : cappedVolume(percent);

    // For Safari: convert base64 to blob for better compatibility
    if (!isLink(source) && isSafari()) {
      try {
        blobUrl = URL.createObjectURL(base64toBlob(source));
        source = blobUrl;
      } catch (error) {
        // Fall back to direct base64 if blob creation fails
        console.error("Error creating blob from base64:", error);
      }
    }
  }

  // Set the source
  audio.src = source;

  audio.addEventListener("ended", () => {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    finish();
  });

  audio.addEventListener("error", () => {
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      console.error("Error playing audio");
      showNotification("Failed to play sound", "error");

      // Fallback: try direct source if blob approach failed
      if (sound.base64 && source !== sound.base64) {
        const fallbackAudio = new Audio();
        fallbackAudio.volume = audio.volume;
        fallbackAudio.src = sound.base64;
        fallbackAudio.play().catch((err) => {
          console.error("Fallback playback also failed:", err);
        });
      }
    }
    finish();
  });

  // Play the audio
  audio.play().catch((error) => {
    console.error("Error playing sound:", error);
    showNotification("Failed to play sound", "error");

    // Revoke blob URL if there was an error
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
    }
    finish();
  });
}

async function toggleFeature() {
  if (!config.value) return;

  // Toggle the feature
  const wasEnabled = config.value.soundFx.enabled;
  config.value.soundFx.enabled = !wasEnabled;

  // If we're enabling the feature, open settings
  if (!wasEnabled) {
    await nextTick();
    emit("toggle", "sound-fx");
  }
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
    for (const file of files) {
      try {
        const base64Data = await fileToBase64(file);
        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf("."));
        const triggers = fromNames ? extractTriggerFromFilename(file.name) : [ ...shared ];

        // Store file in IndexedDB if available
        let soundId: string | null = null;
        if (isIndexedDBAvailable()) {
          soundId = await saveSoundFxToIndexedDB(nameWithoutExt, base64Data);
        }

        config.value.soundFx.sounds.unshift({
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
  if (!config.value || !config.value.soundFx.sounds || config.value.soundFx.sounds.length <= 1) {
    return;
  }

  // Sort sounds by their first trigger alphabetically
  config.value.soundFx.sounds.sort((a, b) => {
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
  showNotification("Sound FX sounds have been sorted by their triggers");
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
    for (const sound of config.value.soundFx.sounds) {
      if (sound.soundId) {
        await deleteSoundFxFromIndexedDB(sound.soundId);
      }
    }
  }

  // Clear all sounds from the config
  config.value.soundFx.sounds = [];

  // Close modal and show notification
  closeDeleteAllModal();
  showNotification("All sound effects have been deleted", "error");
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
    const existing = config.value.soundFx.sounds[editing];
    sound.enabled = existing.enabled;
    config.value.soundFx.sounds[editing] = sound;
  } else {
    // Add new
    config.value.soundFx.sounds.unshift(sound);
  }

  closeTTSModal();
  showNotification(editing !== null ? "TTS sound updated" : "TTS sound added");
}
</script>
