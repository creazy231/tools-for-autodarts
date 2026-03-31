<template>
  <template v-if="!$attrs['data-feature-index']">
    <!-- Settings Panel -->
    <div
      v-if="config"
      class="adt-container min-h-56"
    >
      <div class="relative z-10 flex h-full flex-col justify-between">
        <div>
          <h3 class="mb-1 flex flex-col items-start gap-2 font-bold uppercase sm:flex-row sm:items-center sm:justify-between">
            <span>Settings - Sound FX</span>
            <div class="flex w-full flex-wrap gap-2 sm:w-auto">
              <AppButton @click="sortSoundsByTriggers" size="sm" class="!py-1 text-xs sm:text-sm" auto title="Sort sounds by their triggers">
                <span class="icon-[pixelarticons--sort-alphabetic] mr-1" />
                <span class="whitespace-nowrap">Sort</span>
              </AppButton>
              <AppButton @click="openDeleteAllModal" size="sm" class="!py-1 text-xs sm:text-sm" auto type="danger" title="Delete all sounds">
                <span class="icon-[pixelarticons--trash] mr-1" />
                <span class="whitespace-nowrap">Delete All</span>
              </AppButton>
              <AppButton @click="openTTSModal()" size="sm" class="!py-1 text-xs sm:text-sm" auto type="warning" :disabled="!isTTSAvailable" title="Generate sound from text-to-speech">
                <span class="icon-[pixelarticons--chat] mr-1" />
                <span class="whitespace-nowrap">Generate TTS</span>
              </AppButton>
              <AppButton @click="openUploadModal" size="sm" class="!py-1 text-xs sm:text-sm" auto type="success">
                <span class="icon-[pixelarticons--upload] mr-1" />
                <span class="whitespace-nowrap">Upload Files</span>
              </AppButton>
            </div>
          </h3>
          <div class="space-y-3 text-white/70">
            <p>Configure sound effects that play during the game for special events.</p>

            <div class="mt-2 flex items-center gap-2 text-sm">
              <span class="icon-[pixelarticons--drag-and-drop] text-white/60" />
              <p>Drag and drop sounds to change their order</p>
            </div>

            <div
              ref="soundsContainer"
              :key="containerKey"
              class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
            >
              <div
                @click="openAddSoundModal"
                v-if="allowAdd"
                class="flex h-32 cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-white/30 bg-transparent p-4 transition-colors hover:bg-white/10"
              >
                <div class="flex flex-col items-center">
                  <span class="icon-[pixelarticons--plus] mb-1 text-xl" />
                  <span>Add Sound</span>
                </div>
              </div>

              <div
                v-for="(sound, index) in config.soundFx.sounds"
                :key="index"
                :data-id="index"
                class="group relative h-32 overflow-hidden rounded-md border border-white/30 bg-black/30"
                :class="{
                  'opacity-50': !sound.enabled,
                }"
              >
                <!-- Disabled overlay -->
                <div v-if="!sound.enabled" class="absolute inset-0 flex items-center justify-center bg-black/40">
                  <span class="icon-[pixelarticons--close-circle] text-2xl text-white/70" />
                </div>

                <!-- Toggle button -->
                <div class="absolute left-2 top-2 z-20">
                  <AppToggle
                    @update:model-value="toggleSound(index)"
                    v-model="sound.enabled"
                    size="sm"
                  />
                </div>

                <!-- Sound name (centered) -->
                <div v-if="sound.name" class="absolute left-[7.5rem] top-3.5 z-20 max-w-28 truncate">
                  <div class="truncate rounded bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
                    {{ sound.name }}
                  </div>
                </div>

                <!-- Edit button -->
                <div class="absolute right-2 top-2 z-20">
                  <button
                    @click.stop="sound.tts ? openTTSModal(sound, index) : editSound(index)"
                    class="flex size-8 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20"
                  >
                    <span class="icon-[pixelarticons--edit] text-sm" />
                  </button>
                </div>

                <!-- Info section - used as drag handle -->
                <div
                  class="absolute inset-x-0 bottom-0 cursor-move bg-black/70 p-2 text-xs"
                >
                  <div class="truncate border-b border-white/30 pb-1 font-mono text-xxs" :title="sound.tts ? `TTS: ${sound.tts.text}` : sound.url">
                    {{ sound.tts ? `TTS: "${sound.tts.text}"` : (sound.url || "Uploaded") }}
                  </div>
                  <div class="mt-1 truncate font-mono uppercase">
                    {{ Array.isArray(sound.triggers) ? sound.triggers.join(', ') : 'No triggers' }}
                  </div>
                  <div class="mt-1 flex justify-between">
                    <button
                      @click.stop="playSound(sound)"
                      class="text-[var(--chakra-colors-borderGreen)] hover:text-[var(--chakra-colors-glassGreen)]"
                      title="Play sound"
                    >
                      <span class="icon-[pixelarticons--play] text-sm" />
                    </button>
                    <button
                      @click.stop="removeSound(index)"
                      class="text-[var(--chakra-colors-borderRed)] hover:text-[var(--chakra-colors-glassRed)]"
                    >
                      <span class="icon-[pixelarticons--trash] text-sm" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Sound Modal (Add/Edit) -->
    <AppModal
      @close="closeSoundModal"
      :show="showSoundModal"
      :title="isEditMode ? 'Edit Sound' : 'Add Sound'"
    >
      <div class="space-y-4">
        <div>
          <label for="sound-name" class="mb-1 block text-sm font-medium text-white">Sound Name (optional)</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-3 flex items-center text-white/60">
              <span class="icon-[pixelarticons--contact-multiple]" />
            </span>
            <AppInput
              id="sound-name"
              v-model="newSound.name"
              type="text"
              placeholder="Enter a name for this sound"
              class="pl-9"
            />
          </div>
        </div>

        <div v-if="!newSound.base64">
          <label for="sound-url" class="mb-1 block text-sm font-medium text-white">Sound URL (MP3, WAV, etc.)</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-3 flex items-center text-white/60">
              <span class="icon-[pixelarticons--link]" />
            </span>
            <AppInput
              id="sound-url"
              v-model="newSound.url"
              type="url"
              placeholder="https://example.com/sound.mp3"
              class="pl-9"
            />
          </div>
          <div v-if="urlError" class="mt-1 text-sm text-red-500">
            {{ urlError }}
          </div>
        </div>

        <hr class="border-white/20">

        <div>
          <label for="sound-text" class="mb-1 flex items-center justify-between text-sm font-medium text-white">
            <span>Triggers <span class="text-xs text-white/60">(one per line)</span></span>
            <a
              href="https://github.com/creazy231/tools-for-autodarts?tab=readme-ov-file#-sound-fx-feature"
              target="_blank"
              class="text-blue-400 hover:text-blue-300"
            >
              View supported triggers
            </a>
          </label>
          <AppTextarea
            id="sound-text"
            v-model="lowercaseText"
            :placeholder="textareaPlaceholder"
            monospace
            :rows="6"
            :max-rows="10"
          />
        </div>
      </div>

      <template #footer>
        <AppButton @click="closeSoundModal">
          Cancel
        </AppButton>
        <AppButton @click="saveSound" type="success">
          Save
        </AppButton>
      </template>
    </AppModal>

    <!-- File Upload Modal -->
    <AppModal
      @close="closeUploadModal"
      :show="showUploadModal"
      title="Upload Sound Files"
    >
      <div class="space-y-4">
        <div
          @dragover.prevent="onFileDragOver"
          @dragleave.prevent="onFileDragLeave"
          @drop.prevent="onFileDrop"
          @click="triggerFileInput"
          :class="{ 'border-white/50 bg-white/10': isDragging }"
          class="flex h-40 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-white/30 transition-colors hover:bg-white/5"
        >
          <span class="icon-[pixelarticons--upload] mb-2 text-3xl text-white/70" />
          <p class="text-white/70">
            Drag and drop sound files here or click to browse
          </p>
          <p class="mt-1 text-xs text-white/50">
            Supported formats: MP3, WAV, OGG
          </p>
          <input
            @change="onFileSelect"
            ref="fileInput"
            type="file"
            accept="audio/*"
            multiple
            class="hidden"
          >
        </div>

        <!-- Selected files list -->
        <div v-if="selectedFiles.length > 0" class="mt-4">
          <h4 class="mb-2 text-sm font-medium">
            Selected Files ({{ selectedFiles.length }})
          </h4>
          <div class="max-h-60 overflow-y-auto rounded-md border border-white/20">
            <div
              v-for="(file, index) in selectedFiles"
              :key="index"
              class="flex items-center justify-between border-b border-white/10 p-2 last:border-b-0"
            >
              <div class="flex items-center">
                <span class="icon-[pixelarticons--volume-2] mr-2 text-white/70" />
                <span class="max-w-[calc(100%-2rem)] truncate">{{ file.name }}</span>
              </div>
              <button
                @click.stop="removeFile(index)"
                class="flex items-center justify-center text-red-500 hover:text-red-400"
              >
                <span class="icon-[pixelarticons--close]" />
              </button>
            </div>
          </div>
        </div>

        <div class="mt-4 space-y-3">
          <div class="flex items-center">
            <label class="flex cursor-pointer items-center">
              <input
                v-model="generateTriggersFromFilenames"
                type="checkbox"
                class="form-checkbox size-4 rounded text-blue-600 focus:ring-blue-500"
              >
              <span class="ml-2 text-sm">Generate triggers from filenames</span>
            </label>
            <span
              class="icon-[pixelarticons--info-box] ml-2 cursor-help text-white/50"
              title="If enabled, triggers will be automatically generated from filenames. For example, a file named '180.mp3' will trigger on '180' scores."
            />
          </div>
          <div v-if="!generateTriggersFromFilenames">
            <label for="bulk-trigger" class="mb-1 block text-sm font-medium text-white">
              Assign same trigger to all files (optional)
            </label>
            <div class="relative">
              <span class="absolute inset-y-0 left-3 flex items-center text-white/60">
                <span class="icon-[pixelarticons--edit]" />
              </span>
              <AppInput
                id="bulk-trigger"
                v-model="bulkTrigger"
                type="text"
                placeholder="e.g., t20, 180, gameshot"
                class="pl-9"
              />
            </div>
            <p class="mt-1 text-xs text-white/60">
              If provided, all uploaded files will be assigned this trigger.
            </p>
          </div>
        </div>
      </div>

      <template #footer>
        <AppButton @click="closeUploadModal">
          Cancel
        </AppButton>
        <AppButton
          @click="processFiles"
          type="success"
          :disabled="selectedFiles.length === 0 || isProcessing"
          :loading="isProcessing"
        >
          Save {{ selectedFiles.length }} Files
        </AppButton>
      </template>
    </AppModal>

    <!-- Delete All Confirmation Modal -->
    <AppModal
      @close="closeDeleteAllModal"
      :show="showDeleteAllModal"
      title="Delete All Sounds"
    >
      <div class="space-y-4">
        <p>Are you sure you want to delete all sounds? This action cannot be undone.</p>
        <p class="text-sm text-white/60">
          This will remove all {{ config?.soundFx.sounds.length || 0 }} sounds from the sound effects.
        </p>
      </div>

      <template #footer>
        <AppButton @click="closeDeleteAllModal">
          Cancel
        </AppButton>
        <AppButton
          @click="deleteAllSounds"
          type="danger"
        >
          Delete All
        </AppButton>
      </template>
    </AppModal>

    <!-- TTS Generate Modal -->
    <AppModal
      @close="closeTTSModal"
      :show="showTTSModal"
      title="Generate TTS Sound"
    >
      <div class="space-y-4">
        <div>
          <label for="tts-text" class="mb-1 block text-sm font-medium text-white">Text to speak</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-3 flex items-center text-white/60">
              <span class="icon-[pixelarticons--chat]" />
            </span>
            <AppInput
              id="tts-text"
              v-model="ttsForm.text"
              type="text"
              placeholder="e.g., One hundred and eighty!"
              class="pl-9"
            />
          </div>
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-white">Voice</label>
          <AppSelect
            v-model="ttsForm.voiceURI"
            :options="ttsVoiceOptions"
          />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-white">
            Speed <span class="text-xs text-white/60">({{ ttsForm.rate.toFixed(1) }}x)</span>
          </label>
          <AppSlider
            v-model="ttsForm.rate"
            :min="0.5"
            :max="2"
            :step="0.1"
          />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-white">
            Pitch <span class="text-xs text-white/60">({{ ttsForm.pitch.toFixed(1) }})</span>
          </label>
          <AppSlider
            v-model="ttsForm.pitch"
            :min="0"
            :max="2"
            :step="0.1"
          />
        </div>

        <hr class="border-white/20">

        <div>
          <label for="tts-triggers" class="mb-1 flex items-center justify-between text-sm font-medium text-white">
            <span>Triggers <span class="text-xs text-white/60">(one per line)</span></span>
            <a
              href="https://github.com/creazy231/tools-for-autodarts?tab=readme-ov-file#-sound-fx-feature"
              target="_blank"
              class="text-blue-400 hover:text-blue-300"
            >
              View supported triggers
            </a>
          </label>
          <AppTextarea
            id="tts-triggers"
            v-model="ttsLowercaseTriggers"
            :placeholder="textareaPlaceholder"
            monospace
            :rows="4"
            :max-rows="8"
          />
        </div>
      </div>

      <template #footer>
        <AppButton @click="closeTTSModal">
          Cancel
        </AppButton>
        <AppButton @click="prelistenTTS" :disabled="!ttsForm.text" :loading="isSpeaking">
          <span class="icon-[pixelarticons--play] mr-1" />
          Prelisten
        </AppButton>
        <AppButton @click="saveTTSSound" type="success" :disabled="!ttsForm.text || !ttsForm.triggers">
          Save
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
      class="adt-container h-56 transition-transform hover:-translate-y-0.5"
    >
      <div class="relative z-10 flex h-full flex-col justify-between">
        <div>
          <h3 class="mb-1 flex items-center font-bold uppercase">
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
import { computed, nextTick, onMounted, ref, watch } from "vue";
import Sortable from "sortablejs";
import { useStorage } from "@vueuse/core";
import AppToggle from "../AppToggle.vue";
import AppButton from "../AppButton.vue";
import AppModal from "../AppModal.vue";
import AppTextarea from "../AppTextarea.vue";
import AppInput from "../AppInput.vue";
import AppNotification from "../AppNotification.vue";
import AppSelect from "../AppSelect.vue";
import AppSlider from "../AppSlider.vue";
import { AutodartsToolsConfig, type IConfig, type ISound } from "@/utils/storage";
import { useNotification } from "@/composables/useNotification";
import { useTTS } from "@/composables/useTTS";
import {
  base64toBlob,
  deleteSoundFxFromIndexedDB,
  getSoundFxFromIndexedDB,
  isIndexedDBAvailable,
  isSafari,
  saveSoundFxToIndexedDB,
} from "@/utils/helpers";

const emit = defineEmits([ "toggle", "settingChange" ]);
useStorage("adt:active-settings", "sound-fx");

const textareaPlaceholder = `180
s60
s50
s25
...
`;

const config = ref<IConfig>();
const imageUrl = browser.runtime.getURL("/images/sound-fx.png");
const showSoundModal = ref(false);
const isEditMode = ref(false);
const newSound = ref({
  url: "",
  text: "",
  name: "",
  base64: "",
});
const editingIndex = ref<number | null>(null);
const urlError = ref("");
const allowAdd = ref(false);

// Sortable related refs
const soundsContainer = ref<HTMLElement | null>(null);
const containerKey = ref(0);
let sortableInstance: Sortable | null = null;

// File upload related refs
const showUploadModal = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const selectedFiles = ref<File[]>([]);
const isDragging = ref(false);
const generateTriggersFromFilenames = ref(true);
const bulkTrigger = ref("");
const isProcessing = ref(false);

// Delete all modal
const showDeleteAllModal = ref(false);

// Audio player reference for stopping previous sounds
let currentPlayer: HTMLAudioElement | null = null;

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
  triggers: "",
});

const ttsVoiceOptions = computed(() => {
  return [
    { value: "", label: "Default voice" },
    ...voices.value,
  ];
});

const ttsLowercaseTriggers = computed({
  get: () => ttsForm.value.triggers,
  set: (val: string) => {
    ttsForm.value.triggers = val.toLowerCase();
  },
});

// Computed property for trigger text handling
const lowercaseText = computed({
  get: () => newSound.value.text,
  set: (val: string) => {
    newSound.value.text = val.toLowerCase();
  },
});

onMounted(async () => {
  config.value = await AutodartsToolsConfig.getValue();
  await nextTick();
  initSortable();
  await nextTick();
  allowAdd.value = true;
});

watch(config, async (_, oldValue) => {
  if (!oldValue) return;

  await AutodartsToolsConfig.setValue(toRaw(config.value!));
  emit("settingChange");
  console.log("Sound FX setting changed");
}, { deep: true });

// Initialize Sortable.js
function initSortable() {
  if (!soundsContainer.value) return;

  // Clean up any existing instance
  if (sortableInstance) {
    sortableInstance.destroy();
    sortableInstance = null;
  }

  // Create a new Sortable instance
  sortableInstance = Sortable.create(soundsContainer.value, {
    animation: 150,
    draggable: "[data-id]",
    filter: ".flex.h-32", // Don't make the "Add Sound" button draggable
    ghostClass: "bg-gray-700",
    handle: ".cursor-move", // Use the info section as the drag handle
    onEnd(evt) {
      // Only update if the position actually changed
      if (evt.oldIndex !== evt.newIndex && config.value?.soundFx.sounds) {
        // Get the moved item
        const oldIndex = evt.oldIndex;
        const newIndex = evt.newIndex;

        // Update the data array to match the DOM
        if (oldIndex !== undefined && newIndex !== undefined) {
          const movedItem = config.value.soundFx.sounds.splice(oldIndex - 1, 1)[0];
          config.value.soundFx.sounds.splice(newIndex - 1, 0, movedItem);

          // Update the container key to force re-render
          containerKey.value++;

          // Re-initialize sortable after a short delay to ensure DOM is updated
          setTimeout(() => {
            initSortable();
          }, 50);
        }
      }
    },
  });
}

// Modal handling
function openAddSoundModal() {
  newSound.value = { name: "", text: "", base64: "", url: "" };
  isEditMode.value = false;
  editingIndex.value = null;
  showSoundModal.value = true;
}

function closeSoundModal() {
  newSound.value = { name: "", text: "", base64: "", url: "" };
  showSoundModal.value = false;
  editingIndex.value = null;
  urlError.value = "";
}

function editSound(index: number) {
  const sound = config.value!.soundFx.sounds[index];

  // Set up base form values
  newSound.value = {
    name: sound.name || "",
    text: Array.isArray(sound.triggers) ? sound.triggers.join("\n") : "",
    base64: "", // We'll load this below if needed
    url: sound.url || "",
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
  if (!newSound.value.text) {
    showNotification("Please provide at least one trigger", "error");
    return;
  }

  // Check if URL starts with https://
  if (newSound.value.url && !newSound.value.url.startsWith("https://")) {
    urlError.value = "URL must start with https:// for security reasons";
    return;
  }

  // Reset error message
  urlError.value = "";

  // Convert text to array of triggers (split by newline and filter empty lines)
  let triggers = newSound.value.text
    .split("\n")
    .map(line => line.trim().toLowerCase())
    .filter(line => line.length > 0);

  // Ensure triggers is an array
  if (!Array.isArray(triggers)) {
    triggers = [];
  }

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
  if (config.value && config.value.soundFx.sounds) {
    const sound = config.value.soundFx.sounds[index];

    // If sound is stored in IndexedDB, delete it
    if (sound.soundId && isIndexedDBAvailable()) {
      await deleteSoundFxFromIndexedDB(sound.soundId);
    }

    config.value.soundFx.sounds.splice(index, 1);
  }
}

function toggleSound(index: number) {
  if (config.value && config.value.soundFx.sounds) {
    config.value.soundFx.sounds[index].enabled = !config.value.soundFx.sounds[index].enabled;
  }
}

async function playSound(sound: ISound) {
  // Handle TTS sounds
  if (sound.tts) {
    preview(sound.tts.text, sound.tts.voiceURI, sound.tts.rate, sound.tts.pitch);
    return;
  }

  // Stop current audio if it exists
  if (currentPlayer) {
    currentPlayer.pause();
    currentPlayer.currentTime = 0;
  }

  // Create an audio element with preload enabled
  const audio = new Audio();
  audio.preload = "auto";
  currentPlayer = audio;

  // Try to get base64 from IndexedDB first if sound has a soundId
  let source = "";
  let blobUrl: string | undefined;

  if (sound.soundId && isIndexedDBAvailable()) {
    const base64Data = await getSoundFxFromIndexedDB(sound.soundId);
    if (base64Data) {
      source = base64Data;

      // For Safari: convert base64 to blob for better compatibility
      if (isSafari()) {
        try {
          const blob = base64toBlob(base64Data);
          blobUrl = URL.createObjectURL(blob);
          source = blobUrl;
        } catch (error) {
          console.error("Error creating blob from base64:", error);
          // Fall back to direct base64 if blob creation fails
          source = base64Data;
        }
      }
    }
  }

  // If no source from IndexedDB, fall back to config values
  if (!source) {
    if (sound.base64) {
      source = sound.base64;

      // For Safari: convert base64 to blob for better compatibility
      if (isSafari()) {
        try {
          const blob = base64toBlob(sound.base64);
          blobUrl = URL.createObjectURL(blob);
          source = blobUrl;
        } catch (error) {
          console.error("Error creating blob from base64:", error);
          // Fall back to direct base64 if blob creation fails
          source = sound.base64;
        }
      }
    } else if (sound.url) {
      source = sound.url;
    } else {
      // No audio source available
      showNotification("No audio source available for this sound", "error");
      return;
    }
  }

  // Set the source
  audio.src = source;

  // Set up event handlers for cleanup
  if (blobUrl) {
    audio.addEventListener("ended", () => {
      URL.revokeObjectURL(blobUrl);
    });

    audio.addEventListener("error", () => {
      URL.revokeObjectURL(blobUrl);
      console.error("Error playing audio");
      showNotification("Failed to play sound", "error");

      // Fallback: try direct source if blob approach failed
      if (sound.base64 && source !== sound.base64) {
        const fallbackAudio = new Audio();
        fallbackAudio.src = sound.base64;
        fallbackAudio.play().catch((err) => {
          console.error("Fallback playback also failed:", err);
        });
      }
    });
  }

  // Play the audio
  audio.play().catch((error) => {
    console.error("Error playing sound:", error);
    showNotification("Failed to play sound", "error");

    // Revoke blob URL if there was an error
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
    }
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
  selectedFiles.value = [];
  bulkTrigger.value = "";
}

function closeUploadModal() {
  showUploadModal.value = false;
  selectedFiles.value = [];
  isDragging.value = false;
}

function triggerFileInput() {
  fileInput.value?.click();
}

function onFileDragOver(event: DragEvent) {
  isDragging.value = true;
}

function onFileDragLeave(event: DragEvent) {
  isDragging.value = false;
}

function onFileDrop(event: DragEvent) {
  isDragging.value = false;
  if (!event.dataTransfer) return;

  const files = Array.from(event.dataTransfer.files).filter(file =>
    file.type.startsWith("audio/"),
  );

  if (files.length > 0) {
    selectedFiles.value = [ ...selectedFiles.value, ...files ];
  }
}

function onFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files) return;

  const files = Array.from(input.files).filter(file =>
    file.type.startsWith("audio/"),
  );

  if (files.length > 0) {
    selectedFiles.value = [ ...selectedFiles.value, ...files ];
  }

  // Reset the input so the same file can be selected again
  input.value = "";
}

function removeFile(index: number) {
  selectedFiles.value.splice(index, 1);
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

async function processFiles() {
  if (!config.value || selectedFiles.value.length === 0) return;

  isProcessing.value = true;

  try {
    for (const file of selectedFiles.value) {
      try {
        // Convert file to base64
        const base64Data = await fileToBase64(file);

        // Get filename without extension
        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf("."));

        // Generate triggers - bulk trigger takes precedence
        let triggers: string[] = [];
        if (bulkTrigger.value.trim()) {
          // Use bulk trigger if provided
          triggers = [ bulkTrigger.value.trim().toLowerCase() ];
        } else if (generateTriggersFromFilenames.value) {
          // Otherwise use filename-based triggers if enabled
          triggers = extractTriggerFromFilename(file.name);
        }

        // Store file in IndexedDB if available
        let soundId: string | null = null;
        if (isIndexedDBAvailable()) {
          soundId = await saveSoundFxToIndexedDB(nameWithoutExt, base64Data);
        }

        // Create sound object
        const sound: ISound = {
          name: nameWithoutExt,
          url: "",
          base64: soundId ? "" : base64Data, // Only store in config if not in IndexedDB
          soundId: soundId || "", // Store the IndexedDB ID if available
          enabled: true,
          triggers,
        };

        // Add to the beginning of sounds array
        config.value.soundFx.sounds.unshift(sound);
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
      }
    }

    // Update config
    await AutodartsToolsConfig.setValue(toRaw(config.value));
    emit("settingChange");
    console.log("Sound FX setting changed");

    // Show notification
    showNotification(`Successfully added ${selectedFiles.value.length} sounds`);
  } catch (error) {
    console.error("Error processing files:", error);
    showNotification("Error processing files", "error");
  } finally {
    isProcessing.value = false;

    // Close modal
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

  // Update config
  await AutodartsToolsConfig.setValue(toRaw(config.value));
  emit("settingChange");
  console.log("Sound FX setting changed");

  // Close modal and show notification
  closeDeleteAllModal();
  showNotification("All sound effects have been deleted", "error");
}

// TTS functions
function openTTSModal(sound?: ISound, index?: number) {
  stopPreview();
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
      triggers: Array.isArray(sound.triggers) ? sound.triggers.join("\n") : "",
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
      triggers: "",
    };
  }
  showTTSModal.value = true;
}

function closeTTSModal() {
  stopPreview();
  showTTSModal.value = false;
  ttsEditingIndex.value = null;
}

function prelistenTTS() {
  if (!ttsForm.value.text) return;
  preview(ttsForm.value.text, ttsForm.value.voiceURI, ttsForm.value.rate, ttsForm.value.pitch);
}

function saveTTSSound() {
  if (!config.value || !ttsForm.value.text || !ttsForm.value.triggers) return;

  stopPreview();
  saveDefaults(ttsForm.value.voiceURI, ttsForm.value.rate, ttsForm.value.pitch);

  const triggers = ttsForm.value.triggers
    .split("\n")
    .map(l => l.trim().toLowerCase())
    .filter(Boolean);

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

  if (ttsEditingIndex.value !== null) {
    // Update existing
    const existing = config.value.soundFx.sounds[ttsEditingIndex.value];
    sound.enabled = existing.enabled;
    config.value.soundFx.sounds[ttsEditingIndex.value] = sound;
  } else {
    // Add new
    config.value.soundFx.sounds.unshift(sound);
  }

  closeTTSModal();
  showNotification(ttsEditingIndex.value !== null ? "TTS sound updated" : "TTS sound added");
}
</script>
