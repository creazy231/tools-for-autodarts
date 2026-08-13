<template>
  <template v-if="!$attrs['data-feature-index']">
    <!-- Settings Panel -->
    <div
      v-if="config"
      class="adt-container min-h-56"
    >
      <div class="relative z-10 flex h-full flex-col justify-between">
        <div>
          <h3 class="mb-1 flex flex-col items-start gap-2 adt-card-title sm:flex-row sm:items-center sm:justify-between">
            <span>Settings - Animations</span>
            <div class="flex w-full flex-wrap gap-2 sm:w-auto">
              <AppButton @click="sortAnimationsByTriggers" size="sm" class="!py-1 text-xs sm:text-sm" auto title="Sort animations by their triggers">
                <span class="icon-[pixelarticons--sort-alphabetic] mr-1" />
                <span class="whitespace-nowrap">Sort</span>
              </AppButton>
              <AppButton @click="openDeleteAllModal" size="sm" class="!py-1 text-xs sm:text-sm" auto type="danger" title="Delete all animations">
                <span class="icon-[pixelarticons--trash] mr-1" />
                <span class="whitespace-nowrap">Delete All</span>
              </AppButton>
              <AppButton @click="openGifUploadModal" size="sm" class="!py-1 text-xs sm:text-sm" auto type="success">
                <span class="icon-[pixelarticons--upload] mr-1" />
                <span class="whitespace-nowrap">Upload GIFs</span>
              </AppButton>
            </div>
          </h3>
          <div class="space-y-3 text-white/70">
            <p>Configure the animations for the game. Click the plus button to add a new animation.</p>

            <!-- Animation Settings -->
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label class="mb-1 block text-sm font-medium text-white">Delay (seconds)</label>
                <AppInput
                  @update:model-value="val => config!.animations.delayStart = Number(val)"
                  v-if="config"
                  :model-value="String(config.animations.delayStart || 1)"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="1"
                />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-white">Duration (seconds)</label>
                <AppInput
                  @update:model-value="val => config!.animations.duration = Number(val)"
                  v-if="config"
                  :model-value="String(config.animations.duration || 5)"
                  type="number"
                  min="0.5"
                  step="0.5"
                  placeholder="5"
                />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-white">Object Fit</label>
                <AppSelect
                  @update:model-value="val => config!.animations.objectFit = val as 'cover' | 'contain'"
                  v-if="config"
                  :model-value="config.animations.objectFit || 'cover'"
                  :options="[
                    { value: 'cover', label: 'Cover' },
                    { value: 'contain', label: 'Contain' },
                  ]"
                />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-white">View Mode</label>
                <AppSelect
                  @update:model-value="val => config!.animations.viewMode = val as 'full-page' | 'board-only'"
                  v-if="config"
                  :model-value="config.animations.viewMode || 'board-only'"
                  :options="[
                    { value: 'full-page', label: 'Full Page' },
                    { value: 'board-only', label: 'Board Only' },
                  ]"
                />
              </div>
            </div>

            <div class="mt-2 flex items-center gap-2 text-sm">
              <span class="icon-[pixelarticons--drag-and-drop] text-white/60" />
              <p>Drag and drop animations to change their order</p>
            </div>

            <div
              ref="animationsContainer"
              :key="containerKey"
              class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
            >
              <div
                @click="openAddAnimationModal"
                v-if="allowAdd"
                class="add-animation-button flex aspect-video cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-white/30 bg-transparent p-4 transition-colors hover:bg-white/10"
              >
                <div class="flex flex-col items-center">
                  <span class="icon-[pixelarticons--plus] mb-1 text-xl" />
                  <span>Add Animation</span>
                </div>
              </div>

              <!-- Display existing animations -->
              <div
                v-for="(animation, index) in config.animations.data"
                :key="index"
                :data-id="index"
                class="group relative aspect-video overflow-hidden rounded-md border border-white/30 bg-black/30"
                :class="{
                  'opacity-50': !animation.enabled,
                }"
              >
                <!-- Main content -->
                <img
                  :src="getAnimationSource(animation)"
                  class="size-full object-cover"
                  loading="lazy"
                  :alt="`Animation ${index + 1}: ${animation.triggers.join(', ')}`"
                >

                <!-- Drag handle overlay -->
                <div class="absolute inset-0 flex h-12 cursor-move items-center justify-center bg-gradient-to-b from-black/100 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                  <span class="icon-[pixelarticons--drag-and-drop] text-lg text-white/70" />
                </div>

                <!-- Disabled overlay -->
                <div v-if="!animation.enabled" class="absolute inset-0 flex items-center justify-center bg-black/40">
                  <span class="icon-[pixelarticons--close-circle] text-2xl text-white/70" />
                </div>

                <!-- Toggle button -->
                <div class="absolute left-2 top-2 z-20">
                  <AppToggle
                    @update:model-value="toggleAnimationEnabled(index)"
                    :model-value="animation.enabled"
                    size="sm"
                  />
                </div>

                <!-- Edit button -->
                <div class="absolute right-2 top-2 z-20">
                  <button
                    @click.stop="editAnimation(index)"
                    class="flex size-8 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20"
                  >
                    <span class="icon-[pixelarticons--edit] text-sm" />
                  </button>
                </div>

                <!-- Info section -->
                <div class="absolute inset-x-0 bottom-0 cursor-move bg-black/70 p-2 text-xs">
                  <div class="truncate font-mono uppercase">
                    {{ Array.isArray(animation.triggers) ? animation.triggers.join(', ') : '' }}
                  </div>
                  <div class="mt-1 flex justify-end">
                    <button
                      @click.stop="removeAnimation(index)"
                      class="text-red-500 hover:text-red-400"
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

    <!-- Animation Modal (Add/Edit) -->
    <AppModal
      @close="closeAnimationModal"
      :show="showAnimationModal"
      :title="isEditMode ? 'Edit Animation' : 'Add Animation'"
    >
      <div class="space-y-4">
        <div>
          <label for="animation-url" class="mb-1 block text-sm font-medium text-white">
            {{ isUploadedGif ? "Uploaded GIF" : "Animation URL (GIF)" }}
          </label>
          <div class="relative">
            <span class="absolute inset-y-0 left-3 flex items-center text-white/60">
              <span :class="isUploadedGif ? 'icon-[pixelarticons--image]' : 'icon-[pixelarticons--link]'" />
            </span>
            <AppInput
              id="animation-url"
              v-model="newAnimation.url"
              type="url"
              :placeholder="isUploadedGif ? `Uploaded GIF: ${uploadedGifFilename}` : 'https://example.com/animation.gif'"
              class="pl-9"
              :disabled="isUploadedGif"
            />
          </div>
          <p v-if="isUploadedGif" class="mt-1 text-xs text-white/60">
            This GIF was uploaded to your browser's storage and cannot be edited directly.
          </p>
        </div>

        <hr class="border-white/20">

        <div>
          <label for="animation-text" class="mb-1 flex items-center justify-between text-sm font-medium text-white">
            <span>Triggers <span class="text-xs text-white/60">(one per line)</span></span>
            <a
              href="https://github.com/creazy231/tools-for-autodarts?tab=readme-ov-file#-animations"
              target="_blank"
              class="text-blue-400 hover:text-blue-300"
            >
              View supported triggers
            </a>
          </label>
          <AppTextarea
            id="animation-text"
            v-model="lowercaseText"
            :placeholder="textareaPlaceholder"
            monospace
            :rows="6"
            :max-rows="10"
          />
        </div>
      </div>

      <template #footer>
        <AppButton @click="closeAnimationModal">
          Cancel
        </AppButton>
        <AppButton @click="saveAnimation" type="success">
          Save
        </AppButton>
      </template>

      <AppNotification
        @close="hideNotification"
        :show="notification.show"
        :message="notification.message"
        :type="notification.type"
      />
    </AppModal>

    <!-- File Upload Modal -->
    <AppModal
      @close="closeGifUploadModal"
      :show="showGifUploadModal"
      title="Upload Animation GIFs"
    >
      <div class="space-y-4">
        <div
          @dragover.prevent="onGifDragOver"
          @dragleave.prevent="onGifDragLeave"
          @drop.prevent="onGifDrop"
          @click="triggerGifFileInput"
          :class="{ 'border-white/50 bg-white/10': isGifDragging }"
          class="flex h-40 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-white/30 transition-colors hover:bg-white/5"
        >
          <span class="icon-[pixelarticons--upload] mb-2 text-3xl text-white/70" />
          <p class="text-white/70">
            Drag and drop GIF files here or click to browse
          </p>
          <p class="mt-1 text-xs text-white/50">
            Supported format: GIF
          </p>
          <input
            @change="onGifFileSelect"
            ref="gifFileInput"
            type="file"
            accept="image/gif"
            multiple
            class="hidden"
          >
        </div>
        <div v-if="selectedGifFiles.length > 0" class="mt-4">
          <h4 class="mb-2 text-sm font-medium">
            Selected Files ({{ selectedGifFiles.length }})
          </h4>
          <div class="max-h-60 overflow-y-auto rounded-md border border-white/20">
            <div
              v-for="(file, index) in selectedGifFiles"
              :key="index"
              class="flex items-center justify-between border-b border-white/10 p-2 last:border-b-0"
            >
              <div class="flex items-center">
                <span class="icon-[pixelarticons--image] mr-2 text-white/70" />
                <span class="max-w-[calc(100%-2rem)] truncate">{{ file.name }}</span>
              </div>
              <button
                @click.stop="removeGifFile(index)"
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
                v-model="generateTriggersFromFilenamesGif"
                type="checkbox"
                class="form-checkbox size-4 rounded text-blue-600 focus:ring-blue-500"
              >
              <span class="ml-2 text-sm">Generate triggers from filenames</span>
            </label>
            <span
              class="icon-[pixelarticons--info-box] ml-2 cursor-help text-white/50"
              title="If enabled, triggers will be automatically generated from filenames. For example, a file named '180.gif' will trigger on '180' scores."
            />
          </div>
          <div v-if="!generateTriggersFromFilenamesGif">
            <label for="bulk-trigger-gif" class="mb-1 block text-sm font-medium text-white">
              Assign same trigger to all files (optional)
            </label>
            <div class="relative">
              <span class="absolute inset-y-0 left-3 flex items-center text-white/60">
                <span class="icon-[pixelarticons--edit]" />
              </span>
              <AppInput
                id="bulk-trigger-gif"
                v-model="bulkTriggerGif"
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
        <AppButton @click="closeGifUploadModal">
          Cancel
        </AppButton>
        <AppButton
          @click="processGifFiles"
          type="success"
          :disabled="selectedGifFiles.length === 0 || isGifProcessing"
          :loading="isGifProcessing"
        >
          Save {{ selectedGifFiles.length }} GIFs
        </AppButton>
      </template>
    </AppModal>

    <!-- Delete All Confirmation Modal -->
    <AppModal
      @close="closeDeleteAllModal"
      :show="showDeleteAllModal"
      title="Delete All Animations"
    >
      <div class="space-y-4">
        <p>Are you sure you want to delete all animations? This action cannot be undone.</p>
        <p class="text-sm text-white/60">
          This will remove all {{ config?.animations.data.length || 0 }} animations.
        </p>
      </div>

      <template #footer>
        <AppButton @click="closeDeleteAllModal">
          Cancel
        </AppButton>
        <AppButton
          @click="deleteAllAnimations"
          type="danger"
        >
          Delete All
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
          <h3 class="mb-1 flex items-center adt-card-title">
            Animations
            <span class="icon-[material-symbols--settings-alert-outline-rounded] ml-2 size-5" />
          </h3>
          <p class="w-2/3 text-white/70">
            Displays animations for special events like 180s, bulls, busts, and leg wins during gameplay.
          </p>
        </div>
        <div class="flex">
          <div @click="$emit('toggle', 'animations')" class="absolute inset-y-0 left-12 right-0 cursor-pointer" />
          <AppToggle
            @update:model-value="toggleFeature"
            v-model="config.animations.enabled"
          />
        </div>
      </div>
      <div class="gradient-mask-left absolute inset-y-0 right-0 w-2/3">
        <img :src="imageUrl" alt="Animations" class="size-full object-cover">
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import { useStorage } from "@vueuse/core";
import Sortable from "sortablejs";
import { computed, nextTick, onMounted, ref, toRaw, watch } from "vue";

import AppButton from "../AppButton.vue";
import AppInput from "../AppInput.vue";
import AppModal from "../AppModal.vue";
import AppNotification from "../AppNotification.vue";
import AppSelect from "../AppSelect.vue";
import AppTextarea from "../AppTextarea.vue";
import AppToggle from "../AppToggle.vue";

import { useNotification } from "@/composables/useNotification";
import { deleteAnimationFromOPFS, getAnimationFromOPFS, getAnimationNameFromOPFS, isOPFSAvailable, saveAnimationToOPFS, validateAnimationTriggers } from "@/utils/helpers";
import { AutodartsToolsConfig, type IAnimation, type IConfig, defaultConfig } from "@/utils/storage";

const emit = defineEmits([ "toggle", "settingChange" ]);
const { notification, showNotification, hideNotification } = useNotification();
useStorage("adt:active-settings", "animations");
const config = ref<IConfig>();
const imageUrl = browser.runtime.getURL("/images/animations.png");
const showAnimationModal = ref(false);
const isEditMode = ref(false);
const newAnimation = ref<{ url: string; text: string; animationId: string | null }>({
  url: "",
  text: "",
  animationId: null,
});
const allowAdd = ref(false);
const editingIndex = ref<number | null>(null);
const animationsContainer = ref<HTMLElement | null>(null);
const isDragging = ref(false);
const currentDragIndex = ref<number | null>(null);
const containerKey = ref(0);
let sortableInstance: Sortable | null = null;

// Track which animations are visible
const visibleAnimations = ref<Set<string>>(new Set());
let intersectionObserver: IntersectionObserver | null = null;

// GIF upload modal state
const showGifUploadModal = ref(false);
const gifFileInput = ref<HTMLInputElement | null>(null);
const selectedGifFiles = ref<File[]>([]);
const isGifDragging = ref(false);
const isGifProcessing = ref(false);
const generateTriggersFromFilenamesGif = ref(true);
const bulkTriggerGif = ref("");

// Delete All Modal state
const showDeleteAllModal = ref(false);

// In the script section with other refs
const isUploadedGif = ref(false);
const uploadedGifFilename = ref("");

// Computed property for lowercase text handling
const lowercaseText = computed({
  get: () => newAnimation.value.text,
  set: (val: string) => {
    newAnimation.value.text = val.toLowerCase();
  },
});

const textareaPlaceholder = `0
180
100-180
t20
25
bull
gameshot
busted
outside
`;

// Display animations - modified to retrieve from OPFS
// Change from index-based to id-based storage
const animationSources = ref<Record<string, string>>({});

// Helper to get the proper URL source for an animation
function getAnimationSource(animation: IAnimation): string {
  // Create a unique identifier for this animation
  const animId = animation.animationId || `url_${animation.url}`;

  // If it's not in the visible set, don't load it yet
  const uniqueId = `${animId}_${animation.triggers.join("_")}`;
  if (!visibleAnimations.value.has(uniqueId)) {
    // Return an empty placeholder for animations not yet visible
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E";
  }

  // If we already have the source cached, return it
  if (animationSources.value[animId]) {
    return animationSources.value[animId];
  }

  // If it's a regular URL, return it directly
  if (animation.url && !animation.animationId) {
    animationSources.value[animId] = animation.url;
    return animation.url;
  }

  // Otherwise, try to load from OPFS
  loadAnimationSource(animation);

  // Return placeholder or URL while loading
  return animation.url || "";
}

// Load animation sources from OPFS
async function loadAnimationSource(animation: IAnimation) {
  // Create a unique identifier for this animation
  const animId = animation.animationId || `url_${animation.url}`;
  if (animation.animationId && isOPFSAvailable()) {
    try {
      const objectURL = await getAnimationFromOPFS(animation.animationId);
      if (objectURL) {
        animationSources.value[animId] = objectURL;
        return;
      }
    } catch (error) {
      console.error("Error loading animation from OPFS:", error);
    }
  }
  // Fallback to URL if animation is not stored in OPFS
  animationSources.value[animId] = animation.url;
}

// Setup the intersection observer to detect which animations are visible
function setupIntersectionObserver() {
  if (!intersectionObserver) {
    intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const target = entry.target as HTMLElement;
          const index = target.dataset.id;
          if (!index || !config.value) continue;

          const animation = config.value.animations.data[Number.parseInt(index, 10)];
          if (!animation) continue;

          const animId = animation.animationId || `url_${animation.url}`;
          const uniqueId = `${animId}_${animation.triggers.join("_")}`;

          if (entry.isIntersecting) {
            // Add to visible set when intersecting
            visibleAnimations.value.add(uniqueId);
          } else if (!isDragging.value) {
            // Only remove from visible set if not dragging
            visibleAnimations.value.delete(uniqueId);
          }
        }
      },
      {
        root: null, // viewport
        rootMargin: "200px", // Load images 200px before they enter viewport
        threshold: 0.1, // Trigger when at least 10% is visible
      },
    );
  }

  // Observe all animation items
  if (animationsContainer.value) {
    const items = animationsContainer.value.querySelectorAll("[data-id]");
    for (const item of items) {
      intersectionObserver?.observe(item);
    }
  }
}

onMounted(async () => {
  config.value = await AutodartsToolsConfig.getValue();
  await nextTick();
  initSortable();
  await nextTick();
  allowAdd.value = true;

  // Setup intersection observer for lazy gif loading after the DOM is updated
  await nextTick();
  setupIntersectionObserver();
});

onUnmounted(() => {
  // Disconnect the observer
  if (intersectionObserver) {
    intersectionObserver.disconnect();
    intersectionObserver = null;
  }

  // Revoke all object URLs
  for (const url of Object.values(animationSources.value)) {
    URL.revokeObjectURL(url);
  }
  animationSources.value = {};
});

watch(config, async (_, oldValue) => {
  if (!oldValue) return;

  await AutodartsToolsConfig.setValue(toRaw(config.value ?? defaultConfig));
  emit("settingChange");
  console.log("Animations setting changed");
}, { deep: true });

function initSortable() {
  if (!animationsContainer.value) return;

  // Clean up any existing instance
  if (sortableInstance) {
    sortableInstance.destroy();
    sortableInstance = null;
  }

  // Create a new Sortable instance
  sortableInstance = Sortable.create(animationsContainer.value, {
    animation: 150,
    draggable: "[data-id]",
    filter: ".flex.h-32", // Don't make the "Add Animation" button draggable
    ghostClass: "bg-gray-700",
    handle: ".cursor-move", // Use the info section as the drag handle
    onEnd(evt) {
      isDragging.value = false;
      currentDragIndex.value = null;

      // Only update if the position actually changed
      if (evt.oldIndex !== evt.newIndex && config.value?.animations.data) {
        // Get the moved item
        const oldIndex = evt.oldIndex;
        const newIndex = evt.newIndex;

        // Update the data array to match the DOM
        if (oldIndex !== undefined && newIndex !== undefined) {
          const movedItem = config.value.animations.data.splice(oldIndex - 1, 1)[0];

          config.value.animations.data.splice(newIndex - 1, 0, movedItem);

          // Update the container key to force re-render
          containerKey.value++;

          // Show notification
          showNotification("Animation order updated");

          // Re-initialize sortable after a short delay to ensure DOM is updated
          setTimeout(() => {
            initSortable();
          }, 50);
        }
      }
    },
  });
}

function toggleAnimationEnabled(index: number) {
  if (!config.value || !config.value.animations.data[index]) return;

  // Toggle the enabled state
  config.value.animations.data[index].enabled = !config.value.animations.data[index].enabled;
}

async function editAnimation(index: number) {
  if (!config.value || !config.value.animations.data[index]) return;

  const animation = config.value.animations.data[index];

  isUploadedGif.value = !!animation.animationId;
  uploadedGifFilename.value = "";

  // Try to extract a friendly filename from the animationId if possible
  if (animation.animationId) {
    const name = await getAnimationNameFromOPFS(animation.animationId);
    uploadedGifFilename.value = name || "unknown";
  }

  newAnimation.value = {
    url: animation.url || "",
    text: Array.isArray(animation.triggers)
      ? animation.triggers.join("\n")
      : "",
    animationId: animation.animationId || null,
  };
  isEditMode.value = true;
  editingIndex.value = index;
  showAnimationModal.value = true;
}

// After a new animation is added or animations are rearranged, re-initialize the observer
async function updateIntersectionObserverForNewAnimations() {
  // Disconnect existing observer to prevent memory leaks
  if (intersectionObserver) {
    intersectionObserver.disconnect();
  }

  // Short delay to ensure DOM is updated
  await nextTick();
  setupIntersectionObserver();
}

function saveAnimation() {
  if (!config.value || !newAnimation.value.text) {
    return;
  }

  // Either url (remote gif) or animationId (uploaded gif) is required
  if (!newAnimation.value.url && !newAnimation.value.animationId) {
    return;
  }

  // Convert text to array of triggers (split by newline and filter empty lines)
  const rawTriggers = newAnimation.value.text
    .split("\n")
    .map(line => line.trim().toLowerCase())
    .filter(line => line.length > 0);

  // Validate triggers
  const { validTriggers, invalidTriggers } = validateAnimationTriggers(rawTriggers);

  // If there are invalid triggers, show a warning
  if (invalidTriggers.length > 0) {
    newAnimation.value.text = validTriggers.join("\n");
    showNotification(`Some triggers were invalid and removed: ${invalidTriggers.join(", ")}`, "error");
    return;
  }

  // If no valid triggers remain, show an error but still save
  if (validTriggers.length === 0) {
    showNotification("No valid triggers found. Please check the documentation for supported trigger formats.", "error");
    return;
  }

  // Create animation object
  const animation: IAnimation = {
    url: newAnimation.value.url.trim(),
    triggers: validTriggers, // Use the validated triggers
    enabled: true, // New animations are enabled by default
    animationId: newAnimation.value.animationId ?? undefined,
  };

  if (isEditMode.value && editingIndex.value !== null) {
    // Update existing animation
    const existingAnimation = config.value.animations.data[editingIndex.value];
    animation.enabled = existingAnimation.enabled; // Preserve enabled state when editing
    config.value.animations.data[editingIndex.value] = animation;
  } else {
    // Add to animations data array
    config.value.animations.data.unshift(animation);
  }

  // Reset form and close modal
  newAnimation.value = { url: "", text: "", animationId: null };
  showAnimationModal.value = false;
  editingIndex.value = null;

  // Update intersection observer to detect the newly added animation
  updateIntersectionObserverForNewAnimations();
}

function closeAnimationModal() {
  newAnimation.value = { url: "", text: "", animationId: null };
  showAnimationModal.value = false;
  editingIndex.value = null;
  isUploadedGif.value = false;
  uploadedGifFilename.value = "";
}

function removeAnimation(index: number) {
  if (config.value?.animations.data) {
    // If animation is stored in OPFS, delete it
    const animation = config.value.animations.data[index];
    if (animation.animationId && isOPFSAvailable()) {
      deleteAnimationFromOPFS(animation.animationId).catch(console.error);
      // Also remove from sources cache
      delete animationSources.value[animation.animationId];
    }
    // Also remove URL-based entry if exists
    delete animationSources.value[`url_${animation.url}`];
    config.value.animations.data.splice(index, 1);
    containerKey.value++; // Force re-render of the list
  }
}

function openAddAnimationModal() {
  newAnimation.value = { url: "", text: "", animationId: null };
  isEditMode.value = false;
  editingIndex.value = null;
  showAnimationModal.value = true;
}

async function toggleFeature() {
  if (!config.value) return;

  // Toggle the feature
  const wasEnabled = config.value.animations.enabled;
  config.value.animations.enabled = !wasEnabled;

  // If we're enabling the feature, open settings
  if (!wasEnabled) {
    await nextTick();
    emit("toggle", "animations");
  }
}

function openGifUploadModal() {
  showGifUploadModal.value = true;
  selectedGifFiles.value = [];
  bulkTriggerGif.value = "";
}

function closeGifUploadModal() {
  showGifUploadModal.value = false;
  selectedGifFiles.value = [];
  isGifDragging.value = false;
}

function triggerGifFileInput() {
  gifFileInput.value?.click();
}

function onGifDragOver(event: DragEvent) {
  isGifDragging.value = true;
}

function onGifDragLeave(event: DragEvent) {
  isGifDragging.value = false;
}

function onGifDrop(event: DragEvent) {
  isGifDragging.value = false;
  if (!event.dataTransfer) return;
  const files = Array.from(event.dataTransfer.files).filter(file => file.type === "image/gif");
  if (files.length > 0) {
    selectedGifFiles.value = [ ...selectedGifFiles.value, ...files ];
  }
}

function onGifFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files) return;
  const files = Array.from(input.files).filter(file => file.type === "image/gif");
  if (files.length > 0) {
    selectedGifFiles.value = [ ...selectedGifFiles.value, ...files ];
  }
  input.value = "";
}

function removeGifFile(index: number) {
  selectedGifFiles.value.splice(index, 1);
}

function extractTriggersFromGifFilename(filename: string): string[] {
  const nameWithoutExt = filename.substring(0, filename.lastIndexOf(".")).trim();
  const { validTriggers } = validateAnimationTriggers(nameWithoutExt.split("+"));
  return validTriggers;
}

// Convert a File object directly to a Blob
function fileToBlob(file: File): Blob {
  return new Blob([ file ], { type: file.type });
}

async function processGifFiles() {
  if (!config.value || selectedGifFiles.value.length === 0) return;
  isGifProcessing.value = true;

  if (!isOPFSAvailable()) {
    showNotification("Your browser doesn't support file storage. Try a different browser.", "error");
    isGifProcessing.value = false;
    return;
  }

  try {
    let successCount = 0;

    for (const file of selectedGifFiles.value) {
      try {
        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf("."));
        
        // Generate triggers - bulk trigger takes precedence
        let triggers: string[] = [];
        if (bulkTriggerGif.value.trim()) {
          // Use bulk trigger if provided, validate it
          const bulkTriggerLower = bulkTriggerGif.value.trim().toLowerCase();
          const { validTriggers } = validateAnimationTriggers([ bulkTriggerLower ]);
          triggers = validTriggers;
        } else if (generateTriggersFromFilenamesGif.value) {
          // Otherwise use filename-based triggers if enabled
          triggers = extractTriggersFromGifFilename(file.name);
        }

        // Create the animation object
        const animation: IAnimation = {
          url: "", // Empty URL since we're storing in OPFS
          triggers,
          enabled: true,
        };

        // Save to OPFS
        const blob = fileToBlob(file);
        const animationId = await saveAnimationToOPFS(nameWithoutExt, blob);

        if (animationId) {
          // If successful, store the ID reference
          animation.animationId = animationId;
          // Get object URL for display
          const objectURL = await getAnimationFromOPFS(animationId);
          if (objectURL) {
            animationSources.value[animationId] = objectURL;
          }

          // Add to animations list
          config.value.animations.data.unshift(animation);
          successCount++;
        } else {
          throw new Error("Failed to save animation to browser storage");
        }
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        showNotification(`Failed to process ${file.name}`, "error");
      }
    }

    // Save config
    await AutodartsToolsConfig.setValue(toRaw(config.value));
    emit("settingChange");

    // Close modal and update UI
    closeGifUploadModal();
    showNotification(`Added ${successCount} GIFs`, "success");
    containerKey.value++; // Force re-render

    // Update intersection observer to detect newly added animations
    updateIntersectionObserverForNewAnimations();
  } catch (error) {
    console.error("Error processing files:", error);
    showNotification("Error processing files", "error");
  } finally {
    isGifProcessing.value = false;
  }
}

function openDeleteAllModal() {
  showDeleteAllModal.value = true;
}

function closeDeleteAllModal() {
  showDeleteAllModal.value = false;
}

async function deleteAllAnimations() {
  if (!config.value) return;

  // Delete all animations from OPFS
  if (isOPFSAvailable()) {
    // Delete individual animations with their IDs to ensure cleanup
    for (const animation of config.value.animations.data) {
      if (animation.animationId) {
        await deleteAnimationFromOPFS(animation.animationId);
      }
    }
  }

  // Clear all animations from the config
  config.value.animations.data = [];

  // Update config
  await AutodartsToolsConfig.setValue(toRaw(config.value));
  emit("settingChange");
  console.log("Animations setting changed");

  // Close modal and show notification
  closeDeleteAllModal();
  showNotification("All animations have been deleted", "error");

  // Reset animations cache
  animationSources.value = {};

  // Force re-render of the list
  containerKey.value++;
}

function sortAnimationsByTriggers() {
  if (!config.value || !config.value.animations.data || config.value.animations.data.length <= 1) {
    return;
  }

  // Sort animations by their first trigger alphabetically
  config.value.animations.data.sort((a, b) => {
    // Get first trigger from each animation, or empty string if no triggers
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
  showNotification("Animations have been sorted by their triggers");

  // Force re-render of the list
  containerKey.value++;
}

// Need to update containerKey when things change

// Also need to add a watch to reinit observer
watch(containerKey, () => {
  // Disconnect existing observer
  if (intersectionObserver) {
    intersectionObserver.disconnect();
  }

  // Wait for DOM update then reinitialize
  nextTick(() => {
    setupIntersectionObserver();
  });
});
</script>
