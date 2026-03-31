<template>
  <template v-if="!$attrs['data-feature-index']">
    <!-- Settings Panel -->
    <div
      v-if="config"
      class="adt-container min-h-56"
    >
      <div class="relative z-10 flex h-full flex-col justify-between">
        <div>
          <h3 class="mb-1 flex flex-col items-start gap-2 font-bold uppercase md:flex-row md:items-center md:justify-between">
            <span>Settings - Caller</span>
            <div class="flex w-full flex-wrap gap-2 md:w-auto">
              <AppButton @click="sortSoundsByTriggers" size="sm" class="!py-1 text-xs md:text-sm" auto title="Sort sounds by their triggers">
                <span class="icon-[pixelarticons--sort-alphabetic] mr-1" />
                <span class="whitespace-nowrap">Sort</span>
              </AppButton>
              <AppButton @click="openDeleteAllModal" size="sm" class="!py-1 text-xs md:text-sm" auto type="danger" title="Delete all sounds">
                <span class="icon-[pixelarticons--trash] mr-1" />
                <span class="whitespace-nowrap">Delete All</span>
              </AppButton>
              <AppButton @click="openTTSModal()" size="sm" class="!py-1 text-xs md:text-sm" auto type="warning" :disabled="!isTTSAvailable" title="Generate sound from text-to-speech">
                <span class="icon-[pixelarticons--chat] mr-1" />
                <span class="whitespace-nowrap">Generate TTS</span>
              </AppButton>
              <AppButton @click="openImportURLModal" size="sm" class="!py-1 text-xs md:text-sm" auto type="success">
                <span class="icon-[pixelarticons--download] mr-1" />
                <span class="whitespace-nowrap">Import from URL</span>
              </AppButton>
              <AppButton @click="openUploadModal" size="sm" class="!py-1 text-xs md:text-sm" auto type="success">
                <span class="icon-[pixelarticons--upload] mr-1" />
                <span class="whitespace-nowrap">Upload Files</span>
              </AppButton>
            </div>
          </h3>
          <div class="space-y-3 text-white/70">
            <p>Configure the caller settings for the game. Click the plus button to add a new sound.<br>Click <b>Import from URL</b> to import predefined caller sets.</p>

            <div class="flex flex-col gap-20 sm:flex-row">
              <div class="mt-2 flex items-center gap-2">
                <div class="flex items-center gap-2">
                  <span>Call every dart</span>
                </div>
                <AppToggle
                  @update:model-value="config.caller.callEveryDart = !config.caller.callEveryDart"
                  v-model="config.caller.callEveryDart"
                />
              </div>

              <div class="mt-2 flex items-center gap-2">
                <div class="flex items-center gap-2">
                  <span>Call checkout</span>
                </div>
                <AppToggle
                  @update:model-value="config.caller.callCheckout = !config.caller.callCheckout"
                  v-model="config.caller.callCheckout"
                />
              </div>
            </div>

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

              <!-- Display existing sounds -->
              <div
                v-for="(sound, index) in config.caller.sounds"
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
              href="https://github.com/creazy231/tools-for-autodarts?tab=readme-ov-file#%EF%B8%8F-caller-feature"
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

    <!-- Import URL Modal -->
    <AppModal
      @close="closeImportURLModal"
      :show="showImportURLModal"
      title="Import Sounds from URL"
    >
      <div class="space-y-4">
        <div>
          <label for="preset-url" class="mb-1 block text-sm font-medium text-white">Predefined Caller Sets (Optional)</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-3 z-10 flex items-center text-white/60">
              <span class="icon-[pixelarticons--user]" />
            </span>
            <AppSelect
              id="preset-url"
              v-model="selectedPresetURL"
              :options="callerSets"
              class="pl-9"
            />
          </div>

          <p class="mt-2 text-xs text-white/60">
            Some predefined caller sets may not work using Safari. Also Tools for Autodarts is not responsible for the content of the caller sets.
          </p>
        </div>

        <div>
          <label for="base-url" class="mb-1 block text-sm font-medium text-white">Base URL</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-3 flex items-center text-white/60">
              <span class="icon-[pixelarticons--link]" />
            </span>
            <AppInput
              id="base-url"
              v-model="baseURL"
              type="url"
              placeholder="https://example.com/sounds"
              class="pl-9"
            />
          </div>
          <p class="mt-2 text-xs text-white/60">
            Enter a URL to a sound directory containing sounds. The script will then automatically check for matching files and triggers.
          </p>
          <div v-if="urlError" class="mt-1 text-sm text-red-500">
            {{ urlError }}
          </div>
        </div>

        <div class="mt-4 flex items-center">
          <label class="flex cursor-pointer items-center">
            <input
              v-model="generateTriggersFromURLFilenames"
              type="checkbox"
              class="form-checkbox size-4 rounded text-blue-600 focus:ring-blue-500"
              checked
              disabled
            >
            <span class="ml-2 text-sm">Generate triggers from filenames</span>
          </label>
          <span
            class="icon-[pixelarticons--info-box] ml-2 cursor-help text-white/50"
            title="If enabled, triggers will be automatically generated from filenames. For example, a file named '180.mp3' will trigger on '180' scores."
          />
        </div>

        <!-- ZIP file processing status -->
        <div v-if="isZipFile">
          <div class="space-y-3 rounded-md bg-white/5 p-3">
            <p class="text-sm font-medium">
              Processing ZIP file
            </p>

            <!-- ZIP download progress -->
            <div v-if="isDownloadingZip">
              <div class="mb-1 flex items-center justify-between">
                <span class="text-xs">Downloading ZIP file via background service...</span>
                <span class="text-xs">{{ zipDownloadProgress }}%</span>
              </div>
              <div class="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  class="h-full rounded-full bg-blue-500 transition-all duration-300"
                  :style="`width: ${zipDownloadProgress}%`"
                />
              </div>
            </div>

            <!-- ZIP extraction progress -->
            <div v-if="isExtractingZip">
              <div class="mb-1 flex items-center justify-between">
                <span class="text-xs">Extracting ZIP contents...</span>
                <span class="text-xs">{{ zipExtractedFiles }} / {{ zipTotalFiles || '?' }}</span>
              </div>
              <div class="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  class="h-full rounded-full bg-blue-500 transition-all duration-300"
                  :style="`width: ${zipTotalFiles ? (zipExtractedFiles / zipTotalFiles) * 100 : 0}%`"
                />
              </div>
            </div>

            <!-- CSV processing progress -->
            <div v-if="isProcessingCsv">
              <div class="mb-1 flex items-center justify-between">
                <span class="text-xs">Processing sound mappings...</span>
                <span class="text-xs">{{ csvProcessingProgress }}%</span>
              </div>
              <div class="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  class="h-full rounded-full bg-blue-500 transition-all duration-300"
                  :style="`width: ${csvProcessingProgress}%`"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Regular URL import progress display -->
        <div v-else-if="isImporting">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-sm">Importing sounds...</span>
            <span class="text-sm">{{ importedCount }} found</span>
          </div>
          <div class="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              class="h-full rounded-full bg-green-500 transition-all duration-300"
              :style="`width: ${(importProgress / 181) * 100}%`"
            />
          </div>
        </div>
      </div>

      <template #footer>
        <AppButton @click="closeImportURLModal">
          Cancel
        </AppButton>
        <AppButton
          @click="fetchSoundsFromURL"
          type="success"
          :disabled="!baseURL || isImporting || isDownloadingZip || isExtractingZip || isProcessingCsv"
          :loading="isImporting || isDownloadingZip || isExtractingZip || isProcessingCsv"
        >
          Fetch Sounds
        </AppButton>
      </template>
    </AppModal>

    <!-- Notification -->
    <AppNotification
      @close="hideNotification"
      :show="notification.show"
      :message="notification.message"
      :type="notification.type"
    />

    <!-- Delete All Confirmation Modal -->
    <AppModal
      @close="closeDeleteAllModal"
      :show="showDeleteAllModal"
      title="Delete All Sounds"
    >
      <div class="space-y-4">
        <p>Are you sure you want to delete all sounds? This action cannot be undone.</p>
        <p class="text-sm text-white/60">
          This will remove all {{ config?.caller.sounds.length || 0 }} sounds from the caller.
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
          <label for="tts-text-caller" class="mb-1 block text-sm font-medium text-white">Text to speak</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-3 flex items-center text-white/60">
              <span class="icon-[pixelarticons--chat]" />
            </span>
            <AppInput
              id="tts-text-caller"
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
          <label for="tts-triggers-caller" class="mb-1 flex items-center justify-between text-sm font-medium text-white">
            <span>Triggers <span class="text-xs text-white/60">(one per line)</span></span>
            <a
              href="https://github.com/creazy231/tools-for-autodarts?tab=readme-ov-file#%EF%B8%8F-caller-feature"
              target="_blank"
              class="text-blue-400 hover:text-blue-300"
            >
              View supported triggers
            </a>
          </label>
          <AppTextarea
            id="tts-triggers-caller"
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
import { computed, onMounted, ref, watch } from "vue";
import Sortable from "sortablejs";
import { useStorage } from "@vueuse/core";
import JSZip from "jszip";
import AppButton from "../AppButton.vue";
import AppModal from "../AppModal.vue";
import AppTextarea from "../AppTextarea.vue";
import AppInput from "../AppInput.vue";
import AppNotification from "../AppNotification.vue";
import AppSelect from "../AppSelect.vue";
import AppToggle from "../AppToggle.vue";
import AppSlider from "../AppSlider.vue";
import { AutodartsToolsConfig, type IConfig, type ISound } from "@/utils/storage";
import { useNotification } from "@/composables/useNotification";
import { useTTS } from "@/composables/useTTS";
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

// Import JSZip for handling zip files

const emit = defineEmits([ "toggle", "settingChange" ]);
useStorage("adt:active-settings", "caller");

const textareaPlaceholder = `180
s60
s50
s25
...`;

const config = ref<IConfig>();
const imageUrl = browser.runtime.getURL("/images/caller.png");
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

// Import URL related refs
const allowAdd = ref(false);
const showImportURLModal = ref(false);
const baseURL = ref("");
const selectedPresetURL = ref("");
const importProgress = ref(0);
const importedCount = ref(0);
const isImporting = ref(false);
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
  { value: "", label: "Select a caller set (optional)" },

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

// Watch for changes to selectedPresetURL and update baseURL
watch(selectedPresetURL, (newValue) => {
  if (newValue) {
    baseURL.value = newValue;
  }
});

watch(config, async (_, oldValue) => {
  if (!oldValue) return;

  await AutodartsToolsConfig.setValue(toRaw(config.value!));
  emit("settingChange");
  console.log("Caller setting changed");
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
      if (evt.oldIndex !== evt.newIndex && config.value?.caller.sounds) {
        // Get the moved item
        const oldIndex = evt.oldIndex;
        const newIndex = evt.newIndex;

        // Update the data array to match the DOM
        if (oldIndex !== undefined && newIndex !== undefined) {
          const movedItem = config.value.caller.sounds.splice(oldIndex - 1, 1)[0];

          config.value.caller.sounds.splice(newIndex - 1, 0, movedItem);

          // Update the container key to force re-render
          containerKey.value++;

          // Show notification
          showNotification("Sound order updated");

          // Re-initialize sortable after a short delay to ensure DOM is updated
          setTimeout(() => {
            initSortable();
          }, 50);
        }
      }
    },
  });
}

function openAddSoundModal() {
  newSound.value = { url: "", text: "", name: "", base64: "" };
  isEditMode.value = false;
  editingIndex.value = null;
  showSoundModal.value = true;
}

function editSound(index: number) {
  const sound = config.value!.caller.sounds[index];

  // Set up base form values
  newSound.value = {
    url: sound.url || "",
    text: Array.isArray(sound.triggers) ? sound.triggers.join("\n") : "",
    name: sound.name || "",
    base64: "", // We'll load this below if needed
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
  showSoundModal.value = true;
}

async function saveSound() {
  // Check if we're in edit mode with an existing sound
  const existingSound = isEditMode.value && editingIndex.value !== null
    ? config.value?.caller.sounds[editingIndex.value]
    : null;

  // Different validation when editing vs adding new sound
  if (!config.value) return;

  if (isEditMode.value && existingSound) {
    // For editing: validate that we have triggers
    if (!newSound.value.text) {
      return;
    }
  } else {
    // For new sounds: require URL or base64 data plus triggers
    if ((!newSound.value.url && !newSound.value.base64) || !newSound.value.text) {
      return;
    }
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
    if (isEditMode.value && existingSound?.soundId) {
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
  }

  // Create sound object
  const sound: ISound = {
    url: newSound.value.url.trim(),
    name: newSound.value.name.trim() || "", // Use the name if provided
    // Only store base64 in config if we couldn't store in IndexedDB
    base64: soundId ? "" : newSound.value.base64 || "",
    soundId: soundId || "", // Store the IndexedDB ID if available
    enabled: true, // New sounds are enabled by default
    triggers,
  };

  if (isEditMode.value && editingIndex.value !== null) {
    // Update existing sound
    sound.enabled = existingSound!.enabled; // Preserve enabled state when editing

    // Only delete old sound from IndexedDB if we didn't reuse the soundId and there's a new one
    if (existingSound!.soundId && existingSound!.soundId !== soundId && soundId !== null) {
      await deleteSoundFromIndexedDB(existingSound!.soundId);
    }

    config.value.caller.sounds[editingIndex.value] = sound;
  } else {
    config.value.caller.sounds.unshift(sound);
  }

  // Reset form and close modal
  newSound.value = { url: "", text: "", name: "", base64: "" };
  showSoundModal.value = false;
  editingIndex.value = null;
}

function closeSoundModal() {
  newSound.value = { url: "", text: "", name: "", base64: "" };
  showSoundModal.value = false;
  editingIndex.value = null;
  urlError.value = "";
}

async function removeSound(index: number) {
  if (config.value && config.value.caller.sounds) {
    const sound = config.value.caller.sounds[index];

    // If sound is stored in IndexedDB, delete it
    if (sound.soundId && isIndexedDBAvailable()) {
      await deleteSoundFromIndexedDB(sound.soundId);
    }

    config.value.caller.sounds.splice(index, 1);
  }
}

function toggleSound(index: number) {
  if (config.value && config.value.caller.sounds) {
    config.value.caller.sounds[index].enabled = !config.value.caller.sounds[index].enabled;
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
    // Ensure config.value.caller.sounds is an array
    if (!config.value.caller || !Array.isArray(config.value.caller.sounds)) {
      config.value.caller = {
        ...config.value.caller,
        sounds: [],
      };
    }

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
          soundId = await saveSoundToIndexedDB(nameWithoutExt, base64Data);
        }

        // Create sound object
        const sound: ISound = {
          name: nameWithoutExt,
          url: "", // Leave URL blank as requested
          base64: soundId ? "" : base64Data, // Only store in config if not in IndexedDB
          soundId: soundId || "", // Store the IndexedDB ID if available
          enabled: true,
          triggers,
        };

        // Add to the beginning of sounds array
        config.value.caller.sounds.unshift(sound);
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
      }
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update config and wait for 100ms
    await AutodartsToolsConfig.setValue(toRaw(config.value));
    emit("settingChange");
    console.log("Caller setting changed");

    // Show notification
    showNotification(`Successfully added ${selectedFiles.value.length} sounds`);
  } catch (error) {
    console.error("Error processing files:", error);
    showNotification("Error processing files", "error");
  } finally {
    isProcessing.value = false;
    // Close modal and reset
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

  // Update config
  await AutodartsToolsConfig.setValue(toRaw(config.value));
  emit("settingChange");
  console.log("Caller setting changed");

  // Close modal and show notification
  closeDeleteAllModal();
  showNotification("All caller sounds have been deleted", "error");
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

  // Create an audio element
  const audio = new Audio();
  audio.preload = "auto"; // Ensure preloading is enabled
  currentPlayer = audio;

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
        return;
      }
    }

    // Use blob approach for all browsers, but especially Safari
    // This avoids the NotSupportedError on Safari
    if (source.startsWith("data:")) {
      try {
        const blob = base64toBlob(source);
        const blobUrl = URL.createObjectURL(blob);

        // Set up event listeners for tracking success/failure
        audio.oncanplaythrough = () => {
          console.log("Sound loaded successfully");
        };

        audio.onerror = (e) => {
          console.error("Error loading sound:", e);
          URL.revokeObjectURL(blobUrl);
          showNotification("Failed to play sound", "error");
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

      // Update config
      await AutodartsToolsConfig.setValue(toRaw(config.value));
      emit("settingChange");

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

    // Update config
    await AutodartsToolsConfig.setValue(toRaw(config.value!));
    emit("settingChange");
    console.log("Caller setting changed");

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
    const existing = config.value.caller.sounds[ttsEditingIndex.value];
    sound.enabled = existing.enabled;
    config.value.caller.sounds[ttsEditingIndex.value] = sound;
  } else {
    // Add new
    config.value.caller.sounds.unshift(sound);
  }

  closeTTSModal();
  showNotification(ttsEditingIndex.value !== null ? "TTS sound updated" : "TTS sound added");
}
</script>
