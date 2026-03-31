<template>
  <template v-if="!$attrs['data-feature-index']">
    <!-- Settings Panel -->
    <div v-if="config" class="adt-container min-h-56">
      <div class="relative z-10 flex h-full flex-col justify-between">
        <div>
          <h3
            class="mb-1 flex flex-col items-start gap-2 font-bold uppercase sm:flex-row sm:items-center sm:justify-between"
          >
            <span>Settings - WLED</span>
            <div class="flex w-full flex-wrap gap-2 sm:w-auto">
              <AppButton
                @click="sortEffectsByTriggers"
                size="sm"
                class="!py-1 text-xs sm:text-sm"
                auto
                title="Sort effects by their triggers"
              >
                <span class="icon-[pixelarticons--sort-alphabetic] mr-1" />
                <span class="whitespace-nowrap">Sort</span>
              </AppButton>
              <AppButton
                @click="openDeleteAllModal"
                size="sm"
                class="!py-1 text-xs sm:text-sm"
                auto
                type="danger"
                title="Delete all effects"
              >
                <span class="icon-[pixelarticons--trash] mr-1" />
                <span class="whitespace-nowrap">Delete All</span>
              </AppButton>
              <AppButton
                @click="openImportCSVModal"
                size="sm"
                class="!py-1 text-xs md:text-sm"
                auto
                type="success"
              >
                <span class="icon-[pixelarticons--download] mr-1" />
                <span class="whitespace-nowrap">Import CSV</span>
              </AppButton>
            </div>
          </h3>
          <div class="space-y-3 text-white/70">
            <p>
              Configure WLED effects that are played during the game. If board IDs are defined, the
              effects are only played for throws on these boards. The 'other' effect is triggered
              for throws on other boards.
            </p>
            <div class="mt-4 space-y-4">
              <div class="grid grid-cols-[auto_1fr] gap-4">
                <p>Board IDs:<br><span class="text-xs text-white/60">(one per line)</span></p>
                <AppTextarea
                  id="wled-boards"
                  v-model="wledBoardIds"
                  :placeholder="boardIdsPlaceholder"
                  monospace
                  :rows="4"
                  :autosize="false"
                />
              </div>
            </div>

            <div>
              <div class="mt-2 flex items-center gap-2">
                <div class="flex items-center gap-2">
                  <span>trigger Effects only once</span>
                </div>
                <AppToggle @update:model-value="config.wledFx.onlyOnce = !config.wledFx.onlyOnce"
                  v-model="config.wledFx.onlyOnce" />
              </div>
            </div>

            <div class="mt-2 flex items-center gap-2 text-sm">
              <span class="icon-[pixelarticons--drag-and-drop] text-white/60" />
              <p>Drag and drop effects to change their order</p>
            </div>

            <div
              ref="effectsContainer"
              :key="containerKey"
              class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
            >
              <div
                @click="openAddEffectModal"
                v-if="allowAdd"
                class="flex h-32 cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-white/30 bg-transparent p-4 transition-colors hover:bg-white/10"
              >
                <div class="flex flex-col items-center">
                  <span class="icon-[pixelarticons--plus] mb-1 text-xl" />
                  <span>Add Effect</span>
                </div>
              </div>

              <div
                v-for="(effect, index) in config.wledFx.effects"
                :key="index"
                :data-id="index"
                class="group relative h-32 overflow-hidden rounded-md border border-white/30 bg-black/30"
                :class="{
                  'opacity-50': !effect.enabled,
                }"
              >
                <!-- Disabled overlay -->
                <div
                  v-if="!effect.enabled"
                  class="absolute inset-0 flex items-center justify-center bg-black/40"
                >
                  <span class="icon-[pixelarticons--close-circle] text-2xl text-white/70" />
                </div>

                <!-- Toggle button -->
                <div class="absolute left-2 top-2 z-20">
                  <AppToggle
                    @update:model-value="toggleEffect(index)"
                    v-model="effect.enabled"
                    size="sm"
                  />
                </div>

                <!-- Effect name (centered) -->
                <div
                  v-if="effect.name"
                  class="absolute left-[7.5rem] top-3.5 z-20 max-w-28 truncate"
                >
                  <div
                    class="truncate rounded bg-black/60 px-2 py-0.5 text-xs font-medium text-white"
                  >
                    {{ effect.name }}
                  </div>
                </div>

                <!-- Edit button -->
                <div class="absolute right-2 top-2 z-20">
                  <button
                    @click.stop="editEffect(index)"
                    class="flex size-8 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20"
                  >
                    <span class="icon-[pixelarticons--edit] text-sm" />
                  </button>
                </div>

                <!-- Info section - used as drag handle -->
                <div class="absolute inset-x-0 bottom-0 cursor-move bg-black/70 p-2 text-xs">
                  <div
                    class="truncate border-b border-white/30 pb-1 font-mono text-xxs"
                    :title="effect.url"
                  >
                    {{ effect.type === WledType.PRESET ? `${effect.url} preset ${effect.preset}` : effect.url }}
                  </div>
                  <div class="mt-1 truncate font-mono uppercase">
                    {{
                      Array.isArray(effect.triggers) ? effect.triggers.join(', ') : 'No triggers'
                    }}
                  </div>
                  <div class="mt-1 flex justify-between">
                    <button
                      @click.stop="setEffect(effect)"
                      class="text-[var(--chakra-colors-borderGreen)] hover:text-[var(--chakra-colors-glassGreen)]"
                      title="Play Effect"
                    >
                      <span class="icon-[pixelarticons--play] text-sm" />
                    </button>
                    <button
                      @click.stop="removeEffect(index)"
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

    <!-- Import CSV Modal -->
    <AppModal @close="closeImportCSVModal" :show="showImportCSVModal" size="xl" title="Import CSV">
      <div class="space-y-4">
        <div>
          <label for="csv-data" class="mb-1 block text-sm font-medium text-white">CSV data</label>
          <div class="relative">
            <AppTextarea
              id="csv-data"
              v-model="csvData"
              :placeholder="csvImportPlaceholder"
              monospace
              :rows="10"
              :autosize="false"
            />
          </div>
          <div v-if="csvError" class="mt-1 text-sm text-red-500">
            {{ csvError }}
          </div>
        </div>
      </div>
      <template #footer>
        <AppButton @click="closeImportCSVModal">
          Cancel
        </AppButton>
        <AppButton @click="processCSV" type="success" :disabled="!csvData">
          Import CSV
        </AppButton>
      </template>
    </AppModal>

    <!-- Effect Modal (Add/Edit) -->
    <AppModal
      @close="closeEffectModal"
      :show="showEffectModal"
      :title="isEditMode ? 'Edit Effect' : 'Add Effect'"
    >
      <div class="space-y-4">
        <div>
          <label for="effect-name" class="mb-1 block text-sm font-medium text-white">
            Effect Name (optional)
          </label>
          <div class="relative">
            <span class="absolute inset-y-0 left-3 flex items-center text-white/60">
              <span class="icon-[pixelarticons--contact-multiple]" />
            </span>
            <AppInput
              id="effect-name"
              v-model="newEffect.name"
              type="text"
              placeholder="Enter a name for this effect"
              class="pl-9"
            />
          </div>
        </div>

        <div>
          <label for="effect-type" class="mb-1 block text-sm font-medium text-white">
            Effect Type
          </label>
          <div class="relative">
            <AppRadioGroup v-model="newEffect.type" class="grid max-w-sm grid-cols-3" :options="[
              { label: 'PRESET', value: WledType.PRESET },
              { label: 'URL', value: WledType.URL },
              { label: 'JSON API', value: WledType.API },
            ]" />
          </div>
        </div>

        <div v-if="newEffect.type === WledType.PRESET">
          <label for="effect-url" class="mb-1 block text-sm font-medium text-white">WLED
            domain/IP</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-3 flex items-center text-white/60">
              <span class="icon-[pixelarticons--link]" />
            </span>
            <AppInput id="effect-url" v-model="newEffect.url" type="text" class="pl-9"
              placeholder="wled-device.local | 192.168.0.69" />
          </div>
          <div v-if="urlError" class="mt-1 text-sm text-red-500">
            {{ urlError }}
          </div>
          <div v-else-if="!newEffect.url.startsWith('https://')" class="mt-1 text-sm text-amber-400">
            Warning: Using HTTP URLs might cause mixed content issues.
          </div>
          <label class="mb-1 block text-sm font-medium text-white">WLED Preset</label>
          <AppDropdown :options="availablePresetsOptions" v-model="newEffect.preset" />
          <div v-if="presetError" class="mt-1 text-sm text-red-500">
            {{ presetError }}
          </div>
        </div>
        <div v-if="newEffect.type === WledType.URL">
          <label for="effect-url" class="mb-1 block text-sm font-medium text-white">Effect
            URL</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-3 flex items-center text-white/60">
              <span class="icon-[pixelarticons--link]" />
            </span>
            <AppInput id="effect-url" v-model="newEffect.url" type="text"
              placeholder="http://wled-device.local/win/PL=1" class="pl-9" />
          </div>
          <div v-if="urlError" class="mt-1 text-sm text-red-500">
            {{ urlError }}
          </div>
          <div v-else-if="newEffect.url.startsWith('http://')" class="mt-1 text-sm text-amber-400">
            Warning: Using HTTP URLs might cause mixed content issues.
          </div>
        </div>
        <div v-if="newEffect.type === WledType.API">
          <label for="effect-url" class="mb-1 block text-sm font-medium text-white">WLED API
            Endpoint</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-3 flex items-center text-white/60">
              <span class="icon-[pixelarticons--link]" />
            </span>
            <AppInput id="effect-url" v-model="newEffect.url" type="text"
              placeholder="http://wled-device.local/json" class="pl-9" />
          </div>
          <div v-if="urlError" class="mt-1 text-sm text-red-500">
            {{ urlError }}
          </div>
          <div v-else-if="newEffect.url.startsWith('http://')" class="mt-1 text-sm text-amber-400">
            Warning: Using HTTP URLs might cause mixed content issues.
          </div>
          <label for="wled-json-api" class="mb-1 block text-sm font-medium text-white">WLED
            JSON</label>
          <div class="relative">
            <AppTextarea id="wled-json-api" v-model="newEffect.json_api" placeholder="{}" monospace
              :rows="6" :autosize="false" />
            <div v-if="jsonError" class="mt-1 text-sm text-red-500">{{ jsonError }}</div>
          </div>
        </div>

        <hr class="border-white/20">

        <div>
          <label
            for="effect-trigger"
            class="mb-1 flex items-center justify-between text-sm font-medium text-white"
          >
            <span>Triggers <span class="text-xs text-white/60">(one per line)</span></span>
            <a
              href="https://github.com/creazy231/tools-for-autodarts?tab=readme-ov-file#-wled-integration"
              target="_blank"
              class="text-blue-400 hover:text-blue-300"
            >
              View supported triggers
            </a>
          </label>
          <AppTextarea
            id="wled-trigger"
            v-model="wledTrigger"
            :placeholder="triggerPlaceholder"
            monospace
            :rows="6"
            :autosize="false"
          />
        </div>
      </div>

      <template #footer>
        <AppButton @click="closeEffectModal">
          Cancel
        </AppButton>
        <AppButton @click="saveEffect" type="success">
          Save
        </AppButton>
      </template>
    </AppModal>

    <!-- Delete All Confirmation Modal -->
    <AppModal @close="closeDeleteAllModal" :show="showDeleteAllModal" title="Delete All Effects">
      <div class="space-y-4">
        <p>Are you sure you want to delete all effects? This action cannot be undone.</p>
        <p class="text-sm text-white/60">
          This will remove all {{ config?.wledFx.effects.length || 0 }} effects from the list.
        </p>
      </div>

      <template #footer>
        <AppButton @click="closeDeleteAllModal">
          Cancel
        </AppButton>
        <AppButton @click="deleteAllEffects" type="danger">
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
    <div v-if="config" class="adt-container h-56 transition-transform hover:-translate-y-0.5">
      <div class="relative z-10 flex h-full flex-col justify-between">
        <div>
          <h3 class="mb-1 flex items-center font-bold uppercase">
            WLED
            <span class="ml-2 rounded bg-amber-500/80 px-1.5 py-0.5 text-xs font-medium text-black">BETA</span>
            <span class="icon-[material-symbols--settings-alert-outline-rounded] ml-2 size-5" />
          </h3>
          <p class="w-2/3 text-white/70">
            Play WLED effects (or any other link) for events like gameon, takeout, and match wins.
          </p>
        </div>
        <div class="flex">
          <div
            @click="$emit('toggle', 'wled-fx')"
            class="absolute inset-y-0 left-12 right-0 cursor-pointer"
          />
          <AppToggle @update:model-value="toggleFeature" v-model="config.wledFx.enabled" />
        </div>
      </div>
      <div class="gradient-mask-left absolute inset-y-0 right-0 w-2/3">
        <img :src="imageUrl" alt="WLED Effects" class="size-full object-cover">
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, toRaw, watch } from "vue";
import Sortable from "sortablejs";
import { useStorage } from "@vueuse/core";

import AppToggle from "../AppToggle.vue";
import AppButton from "../AppButton.vue";
import AppModal from "../AppModal.vue";
import AppTextarea from "../AppTextarea.vue";
import AppInput from "../AppInput.vue";
import AppNotification from "../AppNotification.vue";
import AppRadioGroup from "../AppRadioGroup.vue";
import AppDropdown from "../AppDropDown.vue";

import { useNotification } from "@/composables/useNotification";
import { AutodartsToolsConfig, type IConfig, type IWled } from "@/utils/storage";
import { setEffect } from "@/entrypoints/match.content/wled";
import { WledType } from "#imports";

const emit = defineEmits(["toggle", "settingChange"]);
useStorage("adt:active-settings", "wled-fx");

const triggerPlaceholder = "gameon\ntakeout\nbusted\ngameshot\nmatchshot\n...";
const boardIdsPlaceholder = "6a501a61-53a5-468a-a56a-17134ace3099\n6128583a-66d8-46a7-87be-97f045ce7456\n...";

const config = ref<IConfig>();
const imageUrl = browser.runtime.getURL("/images/ad_wled_logo.png");
const showEffectModal = ref(false);
const isEditMode = ref(false);
const newEffect = ref<IWled>({
  enabled: true,
  name: '',
  type: WledType.PRESET,
  preset: "0",
  url: '',
  json_api: '',
  triggers: '',
});
const editingIndex = ref<number | null>(null);
const urlError = ref("");
const presetError = ref("");
const jsonError = ref("");
const allowAdd = ref(false);
const availablePresetsOptions = ref<[{ value: string, label: string }]>([
  { value: "0", label: 'not yet loaded' }
]);

// Sortable related refs
const effectsContainer = ref<HTMLElement | null>(null);
const containerKey = ref(0);
let sortableInstance: Sortable | null = null;

// Import CSV modal
const showImportCSVModal = ref(false);
const csvData = ref("");
const csvError = ref("");
const csvImportPlaceholder = ref(
  "[name];URL;[url];[trigger][;[trigger]...]\n" +
  "[name];PRESET;[url];[preset_id];[trigger][;[trigger]...]\n" +
  "[name];API;[api_url];[json];[trigger][;[trigger]...]"
);

// Delete all modal
const showDeleteAllModal = ref(false);

const { notification, showNotification, hideNotification } = useNotification();

// Computed property for trigger text handling
const wledTrigger = computed({
  get: () => newEffect.value.triggers,
  set: (val: string) => {
    newEffect.value.triggers = val.toLowerCase();
  },
});

// Computed property for Board IDs text handling
const wledBoardIds = computed({
  get: () => config.value?.wledFx.boardIds.join("\n") || "",
  set: (val: string) => {
    if (!config.value) return;
    val = val.replace(/\n\n+/g, "\n");
    config.value.wledFx.boardIds = val.length > 0 ? val.trim().split("\n").filter(id => id.trim()) : [];
  },
});

onMounted(async () => {
  config.value = await AutodartsToolsConfig.getValue();
  await nextTick();
  initSortable();
  await nextTick();
  allowAdd.value = true;
});

watch(() => newEffect.value.url, async () => {
  if (newEffect.value.type === WledType.PRESET) {
    await fetchPresets();
  }
});

watch(config, async (_, oldValue) => {
  if (!oldValue) return;

  await AutodartsToolsConfig.setValue(toRaw(config.value!));
  emit("settingChange");
  console.log("Autodarts Tools: WLED: setting changed");
}, { deep: true });

// Initialize Sortable.js
function initSortable() {
  if (!effectsContainer.value) return;

  // Clean up any existing instance
  if (sortableInstance) {
    sortableInstance.destroy();
    sortableInstance = null;
  }

  // Create a new Sortable instance
  sortableInstance = Sortable.create(effectsContainer.value, {
    animation: 150,
    draggable: "[data-id]",
    filter: ".flex.h-32", // Don't make the "Add Effect" button draggable
    ghostClass: "bg-gray-700",
    handle: ".cursor-move", // Use the info section as the drag handle
    onEnd(evt) {
      // Only update if the position actually changed
      if (evt.oldIndex !== evt.newIndex && config.value?.wledFx.effects) {
        // Get the moved item
        const oldIndex = evt.oldIndex;
        const newIndex = evt.newIndex;

        // Update the data array to match the DOM
        if (oldIndex !== undefined && newIndex !== undefined) {
          const movedItem = config.value.wledFx.effects.splice(oldIndex - 1, 1)[0];
          config.value.wledFx.effects.splice(newIndex - 1, 0, movedItem);

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
function openImportCSVModal() {
  showImportCSVModal.value = true;
  csvData.value = "";
  csvError.value = "";
}

function closeImportCSVModal() {
  showImportCSVModal.value = false;
  csvData.value = "";
  csvError.value = "";
}

function stringToWledType(value: string): WledType | null {
  if (Object.values(WledType).includes(value as WledType)) {
    return value as WledType;
  }
  return null;
}

// Parse CSV content into an array of objects
function parseCSV(csv: string): IWled[] {
  // Split the CSV by newlines and filter out empty lines
  const lines = csv.split(/\r\n|\n|\r/).filter(line => line.trim() !== "");

  if (lines.length === 0) return [];

  // Process each line
  const results: IWled[] = [];

  for (const line of lines) {
    // Split by semicolon and remove empty/whitespace-only values
    const values = line.split(";").map(v => v.trim()).filter(v => v);

    if (values.length < 3) {
      csvError.value = `Line "${line}" doesn't have name, URL and trigger`;
      return [];
    }

    const name = values.shift()!;
    const type: WledType | null = stringToWledType(values.shift()!);
    const url = values.shift()!;
    const preset: string = type === WledType.PRESET ? values.shift()! : "0";
    const json_api = type === WledType.API ? values.shift()! : '';
    const triggers: string[] = values;

    if (type === null) {
      csvError.value = `Line "${line}": Invalid type. Choose from 'URL' or 'API'`;
      return [];
    }

    if (!url.startsWith("https://") && !url.startsWith("http://")) {
      csvError.value = `Line "${line}": URL must start with http:// or https://`;
      return [];
    }

    results.push({
      name: name,
      type: type,
      url: url,
      preset: preset,
      json_api: json_api,
      enabled: true,
      triggers: triggers,
    });
  }

  return results;
}

async function processCSV() {
  if (!config.value) return;

  csvError.value = "";
  const csvEntries = parseCSV(csvData.value);

  if (csvError.value) return;

  csvEntries.forEach((effect) => {
    config.value?.wledFx.effects.unshift(effect);
  });

  closeImportCSVModal();
  showNotification(`${csvEntries.length} effects imported`, "success");
}

async function fetchPresets() {
  console.log("Autodarts Tools: WLED: fetchPresets");
  try {
    const presetUrl = (newEffect.value.url.startsWith('http') ? '' : 'http://')
      + newEffect.value.url
      + (newEffect.value.url.endsWith('/') ? '' :'/')
      + 'presets.json';
    console.log("Autodarts Tools: WLED: loading presets from", presetUrl);
    availablePresetsOptions.value = [{ value: newEffect.value.preset, label: 'failed to fetch presets' }];
    window.fetch(presetUrl)
      .then((resp) => resp.json())
      .then((data: Record<string, { n: string }>) => {
        if (data && typeof data === 'object') {
          availablePresetsOptions.value = [{ value: "0", label: 'Select an option' }];
          Object.entries(data).forEach(([id, preset]) => {
            if (id === '0' || !('n' in preset) || preset.n === undefined) return;
            availablePresetsOptions.value.push({ value: id, label: `[${id}] ${preset.n}` });
          });
        } else {
          console.error('Autodarts Tools: WLED: Invalid response format. Expected an object.', data);
        }
      });
  } catch (error) {
    console.error('Autodarts Tools: WLED: Error fetching presets:', error);
  }
}

function openAddEffectModal() {
  newEffect.value = { name: "", type: WledType.PRESET, url: "", preset: "0", json_api: "", triggers: "", enabled: true };
  isEditMode.value = false;
  editingIndex.value = null;
  urlError.value = "";
  showEffectModal.value = true;
}

function closeEffectModal() {
  newEffect.value = { name: "", type: WledType.PRESET, url: "", preset: "0", json_api: "", triggers: "", enabled: true };
  showEffectModal.value = false;
  editingIndex.value = null;
  urlError.value = "";
}

function editEffect(index: number) {
  const effect = config.value!.wledFx.effects[index];

  // Set up base form values
  newEffect.value = {
    name: effect.name || "",
    type: effect.type,
    url: effect.url || "",
    preset: effect.preset || "0",
    json_api: effect.json_api || "",
    triggers: Array.isArray(effect.triggers) ? effect.triggers.join("\n") : "",
    enabled: true
  };

  isEditMode.value = true;
  editingIndex.value = index;
  urlError.value = "";
  showEffectModal.value = true;
}

async function saveEffect() {
  if (!config.value) {
    showNotification("Configuration not loaded", "error");
    return;
  }

  // Check if we have triggers
  if (typeof newEffect.value.triggers === 'string' && !newEffect.value.triggers.trim()) {
    showNotification("Please provide at least one trigger", "error");
    return;
  }

  if (newEffect.value.type == WledType.URL) {
    // Check if URL is valid
    if (!newEffect.value.url.trim()) {
      showNotification("Please provide a URL", "error");
      return;
    }
    if (!newEffect.value.url.startsWith("https://") && !newEffect.value.url.startsWith("http://")) {
      urlError.value = "URL must start with http:// or https://";
      return;
    }
  } else if (newEffect.value.type == WledType.PRESET) {
    if (newEffect.value.preset === "0") {
      presetError.value = "please select a preset";
      return;
    }
  } else if (newEffect.value.type == WledType.API) {
    // Check if json is valid
    try {
      JSON.parse(newEffect.value.json_api)
    } catch (e) {
      showNotification("JSON is invalid", "error")
      jsonError.value = "that's not valid JSON";
      return;
    }
  }

  urlError.value = "";
  presetError.value = "";
  jsonError.value = "";

  // Convert trigger to array of triggers (split by newline and filter empty lines)
  const triggers =
    typeof newEffect.value.triggers === 'string'
      ? newEffect.value.triggers
        .split("\n")
        .map((line) => line.trim().toLowerCase())
        .filter((line) => line.length > 0)
      : [];

  // Create effect object
  const effect: IWled = {
    name: newEffect.value.name.trim() || "",
    type: newEffect.value.type,
    url: newEffect.value.url.trim(),
    preset: newEffect.value.preset,
    json_api: newEffect.value.json_api.trim(),
    enabled: true,
    triggers,
  };

  if (isEditMode.value && editingIndex.value !== null) {
    // Update existing effect
    const existingEffect = config.value.wledFx.effects[editingIndex.value];
    effect.enabled = existingEffect.enabled;
    config.value.wledFx.effects[editingIndex.value] = effect;
  } else {
    // Add new effect
    config.value.wledFx.effects.unshift(effect);
  }

  // Reset form and close modal
  closeEffectModal();
  showNotification(isEditMode.value ? "Effect updated" : "Effect added", "success");
}

async function removeEffect(index: number) {
  if (config.value?.wledFx.effects) {
    config.value.wledFx.effects.splice(index, 1);
    showNotification("Effect removed", "success");
  }
}

function toggleEffect(index: number) {
  if (config.value?.wledFx.effects) {
    config.value.wledFx.effects[index].enabled = !config.value.wledFx.effects[index].enabled;
  }
}

async function toggleFeature() {
  if (!config.value) return;

  // Toggle the feature
  const wasEnabled = config.value.wledFx.enabled;
  config.value.wledFx.enabled = !wasEnabled;

  // If we're enabling the feature, open settings
  if (!wasEnabled) {
    await nextTick();
    emit("toggle", "wled-fx");
  }
}

function sortEffectsByTriggers() {
  if (!config.value?.wledFx.effects || config.value.wledFx.effects.length <= 1) {
    return;
  }

  // Sort effects by their first trigger alphabetically
  config.value.wledFx.effects.sort((a, b) => {
    // Get first trigger from each effect, or empty string if no triggers
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
  showNotification("WLED effects have been sorted by their triggers", "success");
}

function openDeleteAllModal() {
  showDeleteAllModal.value = true;
}

function closeDeleteAllModal() {
  showDeleteAllModal.value = false;
}

async function deleteAllEffects() {
  if (!config.value) return;

  const effectCount = config.value.wledFx.effects.length;

  // Clear all effects from the config
  config.value.wledFx.effects = [];

  // Close modal and show notification
  closeDeleteAllModal();
  showNotification(`All ${effectCount} WLED effects have been deleted`, "error");
}
</script>
