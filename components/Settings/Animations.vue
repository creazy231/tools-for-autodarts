<template>
  <template v-if="!$attrs['data-feature-index']">
    <!-- Settings Panel -->
    <!-- Visible overflow so the list's heading can stick; see Wled.vue. -->
    <div v-if="config" class="adt-container !overflow-visible">
      <div class="relative z-10 pr-2 text-[var(--ad-text-secondary)]">
        <p class="mb-6 max-w-3xl">
          Shows a GIF over the board at the moments you pick: a 180, a bull, a bust, a won leg. A click puts it away early.
        </p>

        <section class="mb-10">
          <h3 class="adt-section-title">
            Options
          </h3>
          <OptionRow description="Seconds between the dart and the animation." title="Start delay">
            <div class="flex items-center gap-2">
              <div class="w-24">
                <AppInput
                  @update:model-value="setSeconds('delayStart', $event, 0)"
                  :model-value="String(config.animations.delayStart ?? 1)"
                  class="text-right"
                  dense
                  min="0"
                  step="0.1"
                  type="number"
                />
              </div>
              <span class="text-sm">s</span>
            </div>
          </OptionRow>
          <OptionRow description="Seconds an animation stays up." title="Show for">
            <div class="flex items-center gap-2">
              <div class="w-24">
                <AppInput
                  @update:model-value="setSeconds('duration', $event, 0.5)"
                  :model-value="String(config.animations.duration ?? 5)"
                  class="text-right"
                  dense
                  min="0.5"
                  step="0.5"
                  type="number"
                />
              </div>
              <span class="text-sm">s</span>
            </div>
          </OptionRow>
          <OptionRow description="Cover fills the space and may crop the GIF. Contain shows all of it." title="Fit">
            <AppRadioGroup v-model="objectFit" :options="FITS" button-size="sm" />
          </OptionRow>
          <OptionRow description="Just the board, or the whole page over a blurred background." title="Covers">
            <AppRadioGroup v-model="viewMode" :options="VIEW_MODES" button-size="sm" />
          </OptionRow>
          <OptionRow description="The games it shows GIFs in." title="Game modes">
            <GameModesField v-model="config.animations.disabledGameModes" feature="animations" intro="Animations only show in the games switched on here." />
          </OptionRow>
        </section>

        <LibrarySection
          @reorder="moveAnimation"
          :category-labels="{ players: 'Other' }"
          :entries="entries"
          empty-icon="icon-[material-symbols--animated-images-outline-rounded]"
          empty-text="Upload GIFs from your computer, or add one from a link. Links from Tenor and Giphy work."
          empty-title="No animations yet"
          list-class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
          search-placeholder="Search animations by trigger or link"
          title="Animations"
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
            <div
              v-for="entry in shown"
              :key="stableKey(config.animations.data[entry.index])"
              :ref="observeTile"
              :data-index="entry.index"
              class="flex flex-col overflow-hidden rounded-[var(--ad-radius-lg)] bg-[var(--ad-surface-sunken)] ring-1 ring-inset ring-[var(--ad-border-subtle)]"
            >
              <div class="relative aspect-video overflow-hidden bg-black/40">
                <img
                  :alt="`Animation on ${entry.triggers.join(', ') || 'no trigger'}`"
                  class="size-full object-cover transition"
                  :class="[{ 'opacity-30 grayscale': !entry.enabled }]"
                  :src="getAnimationSource(config.animations.data[entry.index])"
                  loading="lazy"
                >
                <span v-if="!filtering" class="adt-drag-handle is-glass absolute left-2 top-2" title="Drag to reorder">
                  <span class="icon-[material-symbols--drag-indicator]" />
                </span>
                <div class="absolute right-2 top-2 flex gap-1">
                  <button @click="editAnimation(entry.index)" aria-label="Edit animation" class="adt-glass-btn" title="Edit" type="button">
                    <span class="icon-[material-symbols--edit-outline-rounded]" />
                  </button>
                  <ConfirmDeleteButton @confirm="removeAnimation(entry.index)" glass label="animation" />
                </div>
                <span v-if="!entry.enabled" class="adt-chip absolute bottom-2 left-2 !bg-black/70">Off</span>
                <span
                  v-if="ownLengthLabels[entry.index]"
                  :title="`Stays up for ${ownLengthLabels[entry.index]}`"
                  class="adt-chip absolute bottom-2 right-2 gap-1 !bg-black/70"
                >
                  <span aria-hidden="true" class="icon-[material-symbols--timer-outline-rounded]" />
                  <span class="sr-only">Stays up for</span>
                  {{ ownLengthLabels[entry.index] }}
                </span>
              </div>
              <div class="flex items-center gap-2 p-2.5">
                <TriggerChips :max="2" :query="query" :triggers="entry.triggers" :wrap="false" class="flex-1" />
                <AppSwitch
                  @update:model-value="config.animations.data[entry.index].enabled = $event"
                  :label="`Animation on ${entry.name}: ${entry.enabled ? 'on' : 'off'}`"
                  :model-value="entry.enabled"
                />
              </div>
            </div>
          </template>

          <template #empty>
            <AppButton @click="openGifUploadModal" auto type="primary">
              Upload GIFs
            </AppButton>
            <AppButton @click="openAddAnimationModal" auto>
              Add from a link
            </AppButton>
          </template>
        </LibrarySection>
      </div>
    </div>

    <!-- Animation (add / edit) -->
    <AppModal @close="closeAnimationModal" :show="showAnimationModal" :title="isEditMode ? 'Edit animation' : 'Add an animation from a link'" ghost-close>
      <div class="space-y-5">
        <div v-if="previewSrc" class="overflow-hidden rounded-[var(--ad-radius-lg)] bg-black/40">
          <img :src="previewSrc" alt="Preview" class="mx-auto max-h-48 object-contain">
        </div>
        <div>
          <AppInput
            id="animation-url"
            v-model="newAnimation.url"
            :disabled="isUploadedGif"
            :label="isUploadedGif ? 'Uploaded GIF' : 'Link to a GIF'"
            :placeholder="isUploadedGif ? uploadedGifFilename : 'https://example.com/animation.gif'"
            type="url"
          >
            <template #icon>
              <span :class="isUploadedGif ? 'icon-[material-symbols--gif-box-outline-rounded]' : 'icon-[material-symbols--link-rounded]'" />
            </template>
          </AppInput>
          <p v-if="isUploadedGif" class="adt-field-hint">
            Kept in this browser as {{ uploadedGifFilename }}. Its triggers and how long it stays up can be changed.
          </p>
        </div>
        <div>
          <!-- Reading the GIF's length sits on the label row, as All triggers does on the triggers' -->
          <div class="adt-field-label justify-between">
            <label for="animation-duration">Show for</label>
            <button
              @click="readGifLength"
              :aria-busy="readingLength"
              :disabled="!previewSrc || readingLength"
              :title="previewSrc ? 'Fill in how long one run of this GIF takes' : 'Add a link to a GIF first'"
              class="flex items-center gap-1 text-xs font-semibold text-[var(--ad-blue-300)] enabled:hover:text-white disabled:cursor-not-allowed disabled:text-[var(--ad-text-disabled)]"
              type="button"
            >
              <span class="text-sm" :class="readingLength ? 'icon-[pixelarticons--loader] animate-spin' : 'icon-[material-symbols--timer-outline-rounded]'" />
              Use the GIF's length
            </button>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-24">
              <!-- No spin buttons: the browser's are a white box on this dark field, and a length is typed or read -->
              <AppInput
                id="animation-duration"
                v-model="durationText"
                :placeholder="showForText"
                class="text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                dense
                min="0.1"
                step="0.1"
                type="number"
              />
            </div>
            <span class="text-sm">s</span>
          </div>
          <p v-if="lengthError" class="adt-field-hint !text-[var(--ad-rose-500)]">
            {{ lengthError }}
          </p>
          <p v-else class="adt-field-hint">
            Leave it empty to use the Show for option ({{ showForText }} s).
          </p>
        </div>
        <TriggerField id="animation-triggers" v-model="animationTriggers" :validate="validateAnimationTrigger" feature="animations" />
      </div>
      <template #footer>
        <AppButton @click="closeAnimationModal" auto>
          Cancel
        </AppButton>
        <AppButton @click="saveAnimation" auto type="primary">
          {{ isEditMode ? "Save" : "Add animation" }}
        </AppButton>
      </template>
      <AppNotification @close="hideNotification" :message="notification.message" :show="notification.show" :type="notification.type" />
    </AppModal>

    <UploadDialog
      @close="closeGifUploadModal"
      @save="processGifFiles"
      :noun="{ one: 'GIF', other: 'GIFs' }"
      :processing="isGifProcessing"
      :show="showGifUploadModal"
      :triggers-from-name="file => extractTriggersFromGifFilename(file.name)"
      :validate="validateAnimationTrigger"
      accept="image/gif"
      feature="animations"
      file-icon="icon-[material-symbols--gif-box-outline-rounded]"
      formats="GIF"
      names-hint="A file named 180.gif plays on 180. Join several with a +, as in 180+t20.gif. A name that isn't a trigger gives none."
      title="Upload GIFs"
    />

    <AppModal @close="closeDeleteAllModal" :show="showDeleteAllModal" :title="`Delete all ${config?.animations.data.length ?? 0} animations?`" ghost-close size="sm">
      <p class="text-sm text-[var(--ad-text-muted)]">
        They're removed for good, uploaded GIFs included. This can't be undone.
      </p>
      <template #footer>
        <AppButton @click="closeDeleteAllModal" auto>
          Cancel
        </AppButton>
        <AppButton @click="deleteAllAnimations" auto type="danger">
          Delete all
        </AppButton>
      </template>
    </AppModal>

    <AppNotification @close="hideNotification" :message="notification.message" :show="notification.show" :type="notification.type" />
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

import AppButton from "../AppButton.vue";
import AppInput from "../AppInput.vue";
import AppMenu from "../AppMenu.vue";
import AppModal from "../AppModal.vue";
import AppNotification from "../AppNotification.vue";
import AppRadioGroup from "../AppRadioGroup.vue";
import AppSwitch from "../AppSwitch.vue";
import AppToggle from "../AppToggle.vue";

import ConfirmDeleteButton from "./Library/ConfirmDeleteButton.vue";
import GameModesField from "./Library/GameModesField.vue";
import LibrarySection from "./Library/LibrarySection.vue";
import OptionRow from "./Library/OptionRow.vue";
import TriggerChips from "./Library/TriggerChips.vue";
import TriggerField from "./Library/TriggerField.vue";
import UploadDialog from "./Library/UploadDialog.vue";
import { stableKey } from "./Library/stable-key";

import type { ComponentPublicInstance } from "vue";
import type { LibraryEntry } from "@/utils/library-search";

import { useNotification } from "@/composables/useNotification";
import { MIN_ANIMATION_DURATION, bytesOfDataUrl, durationToSave, formatSeconds, gifRunLength, ownDuration, roundedSeconds } from "@/utils/animation-duration";
import { backgroundFetch, deleteAnimationFromOPFS, getAnimationFromOPFS, getAnimationNameFromOPFS, isOPFSAvailable, saveAnimationToOPFS, validateAnimationTriggers } from "@/utils/helpers";
import { type IAnimation } from "@/utils/storage";

const emit = defineEmits([ "toggle" ]);
const { notification, showNotification, hideNotification } = useNotification();
useStorage("adt:active-settings", "animations");

const FITS = [ { label: "Cover", value: "cover" }, { label: "Contain", value: "contain" } ];
const VIEW_MODES = [ { label: "Board only", value: "board-only" }, { label: "Full page", value: "full-page" } ];
/** Drawn until a GIF comes near the view. */
const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E";
/** Why "Use the GIF's length" found none, said under the field. */
const LENGTH_ERRORS = {
  link: "This link's site doesn't let the extension read the file, so its length can't be read.",
  upload: "The uploaded GIF couldn't be read.",
  notAnimated: "This isn't an animated GIF, so it has no length to read.",
};

const { config } = useConfig();
const imageUrl = browser.runtime.getURL("/images/animations.png");
const showAnimationModal = ref(false);
const isEditMode = ref(false);
const newAnimation = ref<{ url: string; animationId: string | null }>({
  url: "",
  animationId: null,
});
const animationTriggers = ref<string[]>([]);
/** The dialog's Show for, as typed: empty for the option's. */
const durationText = ref("");
const readingLength = ref(false);
const lengthError = ref("");
const editingIndex = ref<number | null>(null);

// Which animations have come near the view
const visibleAnimations = ref<Set<string>>(new Set());

// GIF upload modal state
const showGifUploadModal = ref(false);
const isGifProcessing = ref(false);

// Delete All Modal state
const showDeleteAllModal = ref(false);

const isUploadedGif = ref(false);
const uploadedGifFilename = ref("");

/** Object URLs of uploaded GIFs, by animationId. */
const animationSources = ref<Record<string, string>>({});
/** Uploaded GIFs being read from OPFS, so a render does not start a second read. */
const loadingSources = new Set<string>();

/**
 * GIFs load once they come near the view, and stay loaded: twenty remote GIFs
 * fetched and decoded at once is what this is for. Tiles register themselves
 * through a function ref, so a search that re-renders the grid needs no
 * container query to be observed again.
 */
const intersectionObserver = typeof IntersectionObserver === "undefined"
  ? null
  : new IntersectionObserver((observed) => {
    for (const entry of observed) {
      if (!entry.isIntersecting) continue;
      const animation = config.value?.animations.data[Number((entry.target as HTMLElement).dataset.index)];
      if (animation) visibleAnimations.value.add(visibilityKey(animation));
    }
  }, { rootMargin: "200px", threshold: 0.1 });

const objectFit = computed({
  get: () => config.value?.animations.objectFit ?? "cover",
  set: (value: string) => {
    if (config.value) config.value.animations.objectFit = value as "cover" | "contain";
  },
});

const viewMode = computed({
  get: () => config.value?.animations.viewMode ?? "board-only",
  set: (value: string) => {
    if (config.value) config.value.animations.viewMode = value as "full-page" | "board-only";
  },
});

const entries = computed<LibraryEntry[]>(() => (config.value?.animations.data ?? []).map((animation, index) => {
  const triggers = Array.isArray(animation.triggers) ? animation.triggers : [];
  return {
    index,
    name: triggers.join(", ") || "animation",
    triggers,
    source: animation.animationId ? "uploaded" : animation.url,
    enabled: animation.enabled,
  };
}));

/** The GIF the add/edit dialog holds: its link, or the uploaded file's picture. */
const previewSrc = computed(() => {
  const { url, animationId } = newAnimation.value;
  if (isUploadedGif.value && animationId) return animationSources.value[animationId] ?? "";
  return /^https?:\/\/\S+$/.test(url.trim()) ? url.trim() : "";
});

const showForText = computed(() => formatSeconds(config.value?.animations.duration ?? 5));

/** "2.37 s" for each animation with a length of its own, for its tile. */
const ownLengthLabels = computed(() => (config.value?.animations.data ?? []).map((animation) => {
  const seconds = ownDuration(animation);
  return seconds === undefined ? undefined : `${formatSeconds(seconds)} s`;
}));

const addActions = [
  { label: "Upload GIFs", hint: "From your computer, several at once", icon: "icon-[material-symbols--upload-rounded]", action: openGifUploadModal },
  { label: "Add from a link", hint: "A GIF on the web, e.g. from Tenor or Giphy", icon: "icon-[material-symbols--link-rounded]", action: openAddAnimationModal },
];

const moreActions = computed(() => [
  {
    label: "Sort by trigger",
    hint: "Puts the grid in trigger order",
    icon: "icon-[material-symbols--sort-by-alpha-rounded]",
    disabled: (config.value?.animations.data.length ?? 0) < 2,
    action: sortAnimationsByTriggers,
  },
  {
    label: "Delete all…",
    icon: "icon-[material-symbols--delete-outline-rounded]",
    danger: true,
    separated: true,
    disabled: !config.value?.animations.data.length,
    action: openDeleteAllModal,
  },
]);

// Another link is another GIF: what was said about the last one no longer applies
watch(() => newAnimation.value.url, () => {
  lengthError.value = "";
});

onUnmounted(() => {
  intersectionObserver?.disconnect();

  // Revoke all object URLs
  for (const url of Object.values(animationSources.value)) {
    URL.revokeObjectURL(url);
  }
  animationSources.value = {};
});

function visibilityKey(animation: IAnimation): string {
  return `${animation.animationId || `url_${animation.url}`}_${animation.triggers.join("_")}`;
}

function observeTile(element: Element | ComponentPublicInstance | null) {
  if (element instanceof Element) intersectionObserver?.observe(element);
}

/** A number of seconds from a field; ignores a field left empty while it is being retyped. */
function setSeconds(key: "delayStart" | "duration", value: string, min: number) {
  const seconds = Number(value);
  if (!config.value || value === "" || Number.isNaN(seconds)) return;
  config.value.animations[key] = Math.max(min, seconds);
}

function validateAnimationTrigger(trigger: string): string {
  return validateAnimationTriggers([ trigger ]).invalidTriggers.length ? "Animations don't know this trigger." : "";
}

function moveAnimation(from: number, to: number) {
  const data = config.value?.animations.data;
  if (!data) return;
  const [ moved ] = data.splice(from, 1);
  data.splice(to, 0, moved);
}

// Helper to get the proper URL source for an animation
function getAnimationSource(animation: IAnimation): string {
  // Not near the view yet: don't load it
  if (!visibleAnimations.value.has(visibilityKey(animation))) return PLACEHOLDER;

  // A GIF on the web is its own source
  if (!animation.animationId) return animation.url || PLACEHOLDER;

  // An uploaded one comes from OPFS, once read
  if (animationSources.value[animation.animationId]) return animationSources.value[animation.animationId];
  loadAnimationSource(animation);
  return animation.url || PLACEHOLDER;
}

// Load animation sources from OPFS
async function loadAnimationSource(animation: IAnimation) {
  const id = animation.animationId;
  if (!id || loadingSources.has(id) || !isOPFSAvailable()) return;
  loadingSources.add(id);
  try {
    const objectURL = await getAnimationFromOPFS(id);
    if (objectURL) animationSources.value[id] = objectURL;
  } catch (error) {
    console.error("Error loading animation from OPFS:", error);
  } finally {
    loadingSources.delete(id);
  }
}

/** Fills in how long one run of the dialog's GIF takes, read from its link or its uploaded file. */
async function readGifLength() {
  const source = previewSrc.value;
  if (!source || readingLength.value) return;
  readingLength.value = true;
  lengthError.value = "";
  try {
    const bytes = await gifBytes(source);
    // The link changed while it was being read: this answer is about another GIF
    if (source !== previewSrc.value) return;
    const run = bytes && gifRunLength(bytes);
    if (!bytes) lengthError.value = isUploadedGif.value ? LENGTH_ERRORS.upload : LENGTH_ERRORS.link;
    else if (run === null) lengthError.value = LENGTH_ERRORS.notAnimated;
    else durationText.value = formatSeconds(Math.max(MIN_ANIMATION_DURATION, roundedSeconds(run)));
  } finally {
    readingLength.value = false;
  }
}

/**
 * A GIF's bytes: an uploaded one from the object URL its preview uses, a link
 * through the background's relay, as the Caller's louder copies do. null when
 * they can't be had.
 */
async function gifBytes(source: string): Promise<Uint8Array | null> {
  try {
    if (source.startsWith("blob:")) return new Uint8Array(await (await fetch(source)).arrayBuffer());
    const response = await backgroundFetch(source);
    return response.ok && response.data?.startsWith("data:") ? bytesOfDataUrl(response.data) : null;
  } catch (error) {
    console.error("Autodarts Tools: Animations - could not read the GIF", error);
    return null;
  }
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
    // The dialog previews it; tiles out of view have not read it yet.
    loadAnimationSource(animation);
  }

  newAnimation.value = {
    url: animation.url || "",
    animationId: animation.animationId || null,
  };
  animationTriggers.value = Array.isArray(animation.triggers) ? [ ...animation.triggers ] : [];
  const own = ownDuration(animation);
  durationText.value = own === undefined ? "" : formatSeconds(own);
  lengthError.value = "";
  isEditMode.value = true;
  editingIndex.value = index;
  showAnimationModal.value = true;
}

function saveAnimation() {
  if (!config.value) return;

  // Either url (remote gif) or animationId (uploaded gif) is required
  if (!newAnimation.value.url && !newAnimation.value.animationId) {
    showNotification("Add a link to a GIF first.", "error");
    return;
  }

  // Validate triggers
  const { validTriggers, invalidTriggers } = validateAnimationTriggers(animationTriggers.value);

  // If there are invalid triggers, drop them and say which
  if (invalidTriggers.length > 0) {
    animationTriggers.value = validTriggers;
    showNotification(`Some triggers were invalid and removed: ${invalidTriggers.join(", ")}`, "error");
    return;
  }

  if (validTriggers.length === 0) {
    showNotification("No valid triggers found. Please check the documentation for supported trigger formats.", "error");
    return;
  }

  // Create animation object
  const animation: IAnimation = {
    url: newAnimation.value.url.trim(),
    triggers: validTriggers,
    enabled: true, // New animations are enabled by default
    animationId: newAnimation.value.animationId ?? undefined,
  };

  // Only a length of its own is stored: without one it stays up for Show for
  const duration = durationToSave(durationText.value);
  if (duration !== undefined) animation.duration = duration;

  if (isEditMode.value && editingIndex.value !== null) {
    // Update existing animation
    const existingAnimation = config.value.animations.data[editingIndex.value];
    animation.enabled = existingAnimation.enabled; // Preserve enabled state when editing
    config.value.animations.data[editingIndex.value] = animation;
  } else {
    // Add to animations data array
    config.value.animations.data.unshift(animation);
  }

  closeAnimationModal();
}

function closeAnimationModal() {
  newAnimation.value = { url: "", animationId: null };
  animationTriggers.value = [];
  durationText.value = "";
  lengthError.value = "";
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
      deleteAnimationFromOPFS(animation.animationId).catch(e => console.error(e));
      // Also remove from sources cache
      if (animationSources.value[animation.animationId]) URL.revokeObjectURL(animationSources.value[animation.animationId]);
      delete animationSources.value[animation.animationId];
    }
    config.value.animations.data.splice(index, 1);
  }
}

function openAddAnimationModal() {
  newAnimation.value = { url: "", animationId: null };
  animationTriggers.value = [];
  durationText.value = "";
  lengthError.value = "";
  isUploadedGif.value = false;
  uploadedGifFilename.value = "";
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
}

function closeGifUploadModal() {
  showGifUploadModal.value = false;
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

async function processGifFiles({ files, fromNames, triggers: shared }: { files: File[]; fromNames: boolean; triggers: string[] }) {
  if (!config.value || !files.length) return;
  isGifProcessing.value = true;

  if (!isOPFSAvailable()) {
    showNotification("Your browser doesn't support file storage. Try a different browser.", "error");
    isGifProcessing.value = false;
    return;
  }

  try {
    let successCount = 0;
    const sharedTriggers = validateAnimationTriggers(shared).validTriggers;

    for (const file of files) {
      try {
        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf("."));

        // Create the animation object
        const animation: IAnimation = {
          url: "", // Empty URL since we're storing in OPFS
          triggers: fromNames ? extractTriggersFromGifFilename(file.name) : [ ...sharedTriggers ],
          enabled: true,
        };

        // Save to OPFS
        const animationId = await saveAnimationToOPFS(nameWithoutExt, fileToBlob(file));
        if (!animationId) throw new Error("Failed to save animation to browser storage");

        // If successful, store the ID reference and the object URL for display
        animation.animationId = animationId;
        const objectURL = await getAnimationFromOPFS(animationId);
        if (objectURL) animationSources.value[animationId] = objectURL;

        // Add to animations list
        config.value.animations.data.unshift(animation);
        successCount++;
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        showNotification(`Failed to process ${file.name}`, "error");
      }
    }

    // Close modal and update UI
    closeGifUploadModal();
    showNotification(`Added ${successCount} GIFs`, "success");
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

  // Close modal and show notification
  closeDeleteAllModal();
  showNotification("All animations have been deleted", "error");

  // Reset animations cache
  for (const url of Object.values(animationSources.value)) {
    URL.revokeObjectURL(url);
  }
  animationSources.value = {};
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
}
</script>
