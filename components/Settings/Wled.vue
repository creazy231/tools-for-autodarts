<template>
  <template v-if="!$attrs['data-feature-index']">
    <!-- Settings Panel -->
    <!--
      Visible overflow, or the list's heading could not stick: a container that
      clips is a scroll container of its own, and the heading would stick to it
      rather than to the dialog that actually scrolls.
    -->
    <div v-if="config" class="adt-container !overflow-visible">
      <div class="relative z-10 pr-2 text-[var(--ad-text-secondary)]">
        <p class="mb-6 max-w-3xl">
          Lights your WLED strips, or calls any other link, on game events. Each effect plays on the triggers you give it.
        </p>

        <section class="mb-10">
          <h3 class="adt-section-title">
            Options
          </h3>
          <OptionRow stacked title="Boards">
            <template #description>
              Effects play only for throws on these boards, and on every board while the list is empty. An effect on
              <code class="adt-code">other</code> plays for throws on boards that aren't listed.
            </template>
            <AppTokenInput
              id="wled-boards"
              v-model="boardIds"
              :lowercase="false"
              :validate="validateBoardId"
              placeholder="Paste a board ID and press Enter"
            />
          </OptionRow>
          <OptionRow
            description="An effect that is already showing isn't sent again, so the lights don't start over."
            title="Don't restart a running effect"
          >
            <AppToggle v-model="config.wledFx.onlyOnce" size="sm" />
          </OptionRow>
          <OptionRow description="The games it lights up in. Lobby and tournament effects play in any game." title="Game modes">
            <GameModesField v-model="config.wledFx.disabledGameModes" feature="wledFx" intro="WLED only lights up in the games switched on here." />
          </OptionRow>
        </section>

        <LibrarySection
          @reorder="moveEffect"
          :entries="entries"
          empty-icon="icon-[material-symbols--lightbulb-outline-rounded]"
          empty-text="Add an effect for each moment you want your lights to show, or import a list of them."
          empty-title="No effects yet"
          search-placeholder="Search effects by name, trigger or address"
          title="Effects"
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
              @delete="removeEffect(entry.index)"
              @edit="editEffect(entry.index)"
              @toggle="config.wledFx.effects[entry.index].enabled = $event"
              v-for="entry in shown"
              :key="stableKey(config.wledFx.effects[entry.index])"
              :data-index="entry.index"
              :draggable="!filtering"
              :enabled="entry.enabled"
              :query="query"
              :title="entry.name"
              :triggers="entry.triggers"
            >
              <template #lead>
                <PlayButton @click="setEffect(config.wledFx.effects[entry.index])" :label="entry.name" title="Send this effect" />
              </template>
              <template #meta>
                <span class="shrink-0 text-sm" :class="[TYPE_ICONS[config.wledFx.effects[entry.index].type]]" />
                <span class="truncate">{{ describe(config.wledFx.effects[entry.index]) }}</span>
              </template>
            </LibraryItem>
          </template>

          <template #empty>
            <AppButton @click="openAddEffectModal" auto type="primary">
              New effect
            </AppButton>
            <AppButton @click="openImportCSVModal" auto>
              Import CSV
            </AppButton>
          </template>
        </LibrarySection>
      </div>
    </div>

    <!-- Import CSV -->
    <AppModal @close="closeImportCSVModal" :show="showImportCSVModal" ghost-close size="lg" title="Import effects from CSV">
      <div class="space-y-4">
        <p class="text-sm text-[var(--ad-text-muted)]">
          One effect per line, its fields separated by semicolons, in one of these forms:
        </p>
        <pre class="adt-code-block">{{ csvImportPlaceholder }}</pre>
        <AppTextarea
          id="csv-data"
          v-model="csvData"
          :autosize="false"
          :rows="8"
          label="CSV"
          monospace
          placeholder="gameon;URL;http://wled-device.local/win/PL=1;gameon"
        />
        <AppAlert v-if="csvError" compact variant="error">
          {{ csvError }}
        </AppAlert>
      </div>
      <template #footer>
        <AppButton @click="closeImportCSVModal" auto>
          Cancel
        </AppButton>
        <AppButton @click="processCSV" :disabled="!csvData" auto type="primary">
          Import
        </AppButton>
      </template>
    </AppModal>

    <!-- Effect (add / edit) -->
    <AppModal @close="closeEffectModal" :show="showEffectModal" :title="isEditMode ? 'Edit effect' : 'New effect'" ghost-close>
      <div class="space-y-5">
        <AppInput id="effect-name" v-model="newEffect.name" label="Name" placeholder="Optional: shown in the list" />

        <div>
          <p class="adt-field-label">
            Type
          </p>
          <AppRadioGroup v-model="newEffect.type" :options="EFFECT_TYPES" button-size="sm" />
          <p class="adt-field-hint">
            {{ TYPE_HINTS[newEffect.type] }}
          </p>
        </div>

        <template v-if="newEffect.type === WledType.PRESET">
          <div>
            <AppInput id="effect-url" v-model="newEffect.url" label="WLED address" placeholder="wled-device.local or 192.168.0.69">
              <template #icon>
                <span class="icon-[material-symbols--router-outline-rounded]" />
              </template>
            </AppInput>
            <p v-if="urlError" class="adt-field-hint !text-[var(--ad-rose-500)]">
              {{ urlError }}
            </p>
            <p v-else-if="newEffect.url && !newEffect.url.startsWith('https://')" class="adt-field-hint !text-[var(--ad-warning)]">
              A plain http:// address works on your own network, but a browser may block it as mixed content.
            </p>
          </div>
          <div>
            <AppSelect id="effect-preset" v-model="newEffect.preset" :options="availablePresetsOptions" label="Preset" />
            <p v-if="presetError" class="adt-field-hint !text-[var(--ad-rose-500)]">
              {{ presetError }}
            </p>
            <p v-else class="adt-field-hint">
              Read from the device's presets.json once the address is typed.
            </p>
          </div>
        </template>

        <div v-if="newEffect.type === WledType.URL">
          <AppInput id="effect-url" v-model="newEffect.url" label="Link" placeholder="http://wled-device.local/win/PL=1">
            <template #icon>
              <span class="icon-[material-symbols--link-rounded]" />
            </template>
          </AppInput>
          <p v-if="urlError" class="adt-field-hint !text-[var(--ad-rose-500)]">
            {{ urlError }}
          </p>
          <p v-else-if="newEffect.url.startsWith('http://')" class="adt-field-hint !text-[var(--ad-warning)]">
            A plain http:// link works on your own network, but a browser may block it as mixed content.
          </p>
        </div>

        <template v-if="newEffect.type === WledType.API">
          <div>
            <AppInput id="effect-url" v-model="newEffect.url" label="API endpoint" placeholder="http://wled-device.local/json">
              <template #icon>
                <span class="icon-[material-symbols--link-rounded]" />
              </template>
            </AppInput>
            <p v-if="urlError" class="adt-field-hint !text-[var(--ad-rose-500)]">
              {{ urlError }}
            </p>
            <p v-else-if="newEffect.url.startsWith('http://')" class="adt-field-hint !text-[var(--ad-warning)]">
              A plain http:// link works on your own network, but a browser may block it as mixed content.
            </p>
          </div>
          <div>
            <AppTextarea id="wled-json-api" v-model="newEffect.json_api" :autosize="false" :rows="6" label="JSON" monospace placeholder="{}" />
            <p v-if="jsonError" class="adt-field-hint !text-[var(--ad-rose-500)]">
              {{ jsonError }}
            </p>
          </div>
        </template>

        <TriggerField id="effect-triggers" v-model="effectTriggers" feature="wled" />
      </div>

      <template #footer>
        <AppButton @click="testDraft" :disabled="!canTestDraft" auto class="mr-auto">
          <span class="flex items-center gap-1.5">
            <span class="icon-[material-symbols--play-arrow-rounded] text-lg" />
            Test
          </span>
        </AppButton>
        <AppButton @click="closeEffectModal" auto>
          Cancel
        </AppButton>
        <AppButton @click="saveEffect" auto type="primary">
          {{ isEditMode ? "Save" : "Add effect" }}
        </AppButton>
      </template>
    </AppModal>

    <!-- Delete all -->
    <AppModal @close="closeDeleteAllModal" :show="showDeleteAllModal" :title="`Delete all ${config?.wledFx.effects.length ?? 0} effects?`" ghost-close size="sm">
      <p class="text-sm text-[var(--ad-text-muted)]">
        They're removed for good. This can't be undone.
      </p>
      <template #footer>
        <AppButton @click="closeDeleteAllModal" auto>
          Cancel
        </AppButton>
        <AppButton @click="deleteAllEffects" auto type="danger">
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
    <div v-if="config" class="adt-container adt-interactive h-56">
      <div class="relative z-10 flex h-full flex-col justify-between">
        <div>
          <h3 class="adt-card-title mb-1 flex items-center">
            WLED
            <span class="adt-badge adt-badge-practice ml-2">BETA</span>
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
import { useStorage } from "@vueuse/core";

import AppAlert from "../AppAlert.vue";
import AppButton from "../AppButton.vue";
import AppInput from "../AppInput.vue";
import AppMenu from "../AppMenu.vue";
import AppModal from "../AppModal.vue";
import AppNotification from "../AppNotification.vue";
import AppRadioGroup from "../AppRadioGroup.vue";
import AppSelect from "../AppSelect.vue";
import AppTextarea from "../AppTextarea.vue";
import AppToggle from "../AppToggle.vue";
import AppTokenInput from "../AppTokenInput.vue";

import GameModesField from "./Library/GameModesField.vue";
import LibraryItem from "./Library/LibraryItem.vue";
import LibrarySection from "./Library/LibrarySection.vue";
import OptionRow from "./Library/OptionRow.vue";
import PlayButton from "./Library/PlayButton.vue";
import TriggerField from "./Library/TriggerField.vue";
import { stableKey } from "./Library/stable-key";

import type { LibraryEntry } from "@/utils/library-search";

import { useNotification } from "@/composables/useNotification";
import { setEffect } from "@/entrypoints/match.content/wled";
import { type IWled } from "@/utils/storage";
import { WledType } from "#imports";

const emit = defineEmits([ "toggle" ]);
useStorage("adt:active-settings", "wled-fx");

const EFFECT_TYPES = [
  { label: "Preset", value: WledType.PRESET },
  { label: "URL", value: WledType.URL },
  { label: "JSON API", value: WledType.API },
];

const TYPE_HINTS: Record<WledType, string> = {
  [WledType.PRESET]: "Plays a preset saved on your WLED device, picked from its own list.",
  [WledType.URL]: "Calls a link: a WLED API call such as /win/PL=1, or anything else.",
  [WledType.API]: "Sends a JSON body to WLED's /json endpoint.",
};

const TYPE_ICONS: Record<WledType, string> = {
  [WledType.PRESET]: "icon-[material-symbols--lightbulb-outline-rounded]",
  [WledType.URL]: "icon-[material-symbols--link-rounded]",
  [WledType.API]: "icon-[material-symbols--data-object-rounded]",
};

const BOARD_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const { config } = useConfig();
const imageUrl = browser.runtime.getURL("/images/ad_wled_logo.png");
const showEffectModal = ref(false);
const isEditMode = ref(false);
const newEffect = ref<IWled>({
  enabled: true,
  name: "",
  type: WledType.PRESET,
  preset: "0",
  url: "",
  json_api: "",
  triggers: "",
});
/** The dialog's triggers, as chips; `newEffect.triggers` is left unused while it is open. */
const effectTriggers = ref<string[]>([]);
const editingIndex = ref<number | null>(null);
const urlError = ref("");
const presetError = ref("");
const jsonError = ref("");
const availablePresetsOptions = ref<{ value: string; label: string }[]>([
  { value: "0", label: "Type the address first" },
]);

// Import CSV modal
const showImportCSVModal = ref(false);
const csvData = ref("");
const csvError = ref("");
const csvImportPlaceholder = ref(
  "[name];URL;[url];[trigger][;[trigger]...]\n"
  + "[name];PRESET;[url];[preset_id];[trigger][;[trigger]...]\n"
  + "[name];API;[api_url];[json];[trigger][;[trigger]...]",
);

// Delete all modal
const showDeleteAllModal = ref(false);

const { notification, showNotification, hideNotification } = useNotification();

const boardIds = computed<string[]>({
  get: () => config.value?.wledFx.boardIds ?? [],
  set: (ids) => {
    if (config.value) config.value.wledFx.boardIds = ids;
  },
});

const entries = computed<LibraryEntry[]>(() => (config.value?.wledFx.effects ?? []).map((effect, index) => {
  const triggers = triggerList(effect.triggers);
  return {
    index,
    name: effect.name || triggers[0] || "Untitled effect",
    triggers,
    source: `${effect.type} ${effect.url} ${effect.type === WledType.PRESET ? `preset ${effect.preset}` : ""}`,
    enabled: effect.enabled,
  };
}));

const canTestDraft = computed(() => !!newEffect.value.url.trim()
  && (newEffect.value.type !== WledType.PRESET || newEffect.value.preset !== "0"));

const addActions = [
  { label: "New effect", hint: "A preset, a link or a JSON API call", icon: "icon-[material-symbols--add-rounded]", action: openAddEffectModal },
  { label: "Import CSV", hint: "Several effects at once, one per line", icon: "icon-[material-symbols--content-paste-rounded]", action: openImportCSVModal },
];

const moreActions = computed(() => [
  {
    label: "Sort by trigger",
    hint: "Puts the list in trigger order",
    icon: "icon-[material-symbols--sort-by-alpha-rounded]",
    disabled: (config.value?.wledFx.effects.length ?? 0) < 2,
    action: sortEffectsByTriggers,
  },
  {
    label: "Delete all…",
    icon: "icon-[material-symbols--delete-outline-rounded]",
    danger: true,
    separated: true,
    disabled: !config.value?.wledFx.effects.length,
    action: openDeleteAllModal,
  },
]);

watch(() => [ newEffect.value.url, newEffect.value.type ], async () => {
  if (newEffect.value.type === WledType.PRESET && newEffect.value.url) await fetchPresets();
});

/** Stored triggers are an array, or a newline-separated string in configs from before. */
function triggerList(triggers: string | string[]): string[] {
  return Array.isArray(triggers)
    ? triggers
    : String(triggers || "").split("\n").map(trigger => trigger.trim()).filter(Boolean);
}

function describe(effect: IWled): string {
  if (effect.type === WledType.PRESET) return `Preset ${effect.preset} · ${effect.url}`;
  if (effect.type === WledType.API) return `JSON API · ${effect.url}`;
  return effect.url;
}

function validateBoardId(id: string): string {
  return BOARD_ID.test(id) ? "" : "That doesn't look like a board ID. They look like 6a501a61-53a5-468a-a56a-17134ace3099.";
}

function moveEffect(from: number, to: number) {
  const effects = config.value?.wledFx.effects;
  if (!effects) return;
  const [ moved ] = effects.splice(from, 1);
  effects.splice(to, 0, moved);
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
    const json_api = type === WledType.API ? values.shift()! : "";
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
      name,
      type,
      url,
      preset,
      json_api,
      enabled: true,
      triggers,
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
    const presetUrl = `${(newEffect.value.url.startsWith("http") ? "" : "http://")
      + newEffect.value.url
      + (newEffect.value.url.endsWith("/") ? "" : "/")
       }presets.json`;
    console.log("Autodarts Tools: WLED: loading presets from", presetUrl);
    availablePresetsOptions.value = [ { value: newEffect.value.preset, label: "Couldn't read presets from the device" } ];
    window.fetch(presetUrl)
      .then(resp => resp.json())
      .then((data: Record<string, { n: string }>) => {
        if (data && typeof data === "object") {
          availablePresetsOptions.value = [ { value: "0", label: "Pick a preset" } ];
          Object.entries(data).forEach(([ id, preset ]) => {
            if (id === "0" || !("n" in preset) || preset.n === undefined) return;
            availablePresetsOptions.value.push({ value: id, label: `[${id}] ${preset.n}` });
          });
        } else {
          console.error("Autodarts Tools: WLED: Invalid response format. Expected an object.", data);
        }
      })
      .catch((error) => {
        console.error("Autodarts Tools: WLED: Error fetching presets:", error);
      });
  } catch (error) {
    console.error("Autodarts Tools: WLED: Error fetching presets:", error);
  }
}

function openAddEffectModal() {
  newEffect.value = { name: "", type: WledType.PRESET, url: "", preset: "0", json_api: "", triggers: "", enabled: true };
  effectTriggers.value = [];
  isEditMode.value = false;
  editingIndex.value = null;
  urlError.value = "";
  presetError.value = "";
  jsonError.value = "";
  showEffectModal.value = true;
}

function closeEffectModal() {
  newEffect.value = { name: "", type: WledType.PRESET, url: "", preset: "0", json_api: "", triggers: "", enabled: true };
  effectTriggers.value = [];
  showEffectModal.value = false;
  editingIndex.value = null;
  urlError.value = "";
  presetError.value = "";
  jsonError.value = "";
}

function editEffect(index: number) {
  const effect = config.value!.wledFx.effects[index];

  newEffect.value = {
    name: effect.name || "",
    type: effect.type,
    url: effect.url || "",
    preset: effect.preset || "0",
    json_api: effect.json_api || "",
    triggers: "",
    enabled: true,
  };
  effectTriggers.value = triggerList(effect.triggers);

  isEditMode.value = true;
  editingIndex.value = index;
  urlError.value = "";
  presetError.value = "";
  jsonError.value = "";
  showEffectModal.value = true;
}

/** The effect as the dialog holds it, to try it before it is saved. */
function testDraft() {
  setEffect({ ...newEffect.value, url: newEffect.value.url.trim(), triggers: [ ...effectTriggers.value ] });
}

async function saveEffect() {
  if (!config.value) {
    showNotification("Configuration not loaded", "error");
    return;
  }

  // Check if we have triggers
  if (!effectTriggers.value.length) {
    showNotification("Please provide at least one trigger", "error");
    return;
  }

  if (newEffect.value.type === WledType.URL) {
    // Check if URL is valid
    if (!newEffect.value.url.trim()) {
      showNotification("Please provide a URL", "error");
      return;
    }
    if (!newEffect.value.url.startsWith("https://") && !newEffect.value.url.startsWith("http://")) {
      urlError.value = "The link has to start with http:// or https://";
      return;
    }
  } else if (newEffect.value.type === WledType.PRESET) {
    if (newEffect.value.preset === "0") {
      presetError.value = "Pick a preset first.";
      return;
    }
  } else if (newEffect.value.type === WledType.API) {
    // Check if json is valid
    try {
      JSON.parse(newEffect.value.json_api);
    } catch (e) {
      showNotification("JSON is invalid", "error");
      jsonError.value = "That isn't valid JSON.";
      return;
    }
  }

  urlError.value = "";
  presetError.value = "";
  jsonError.value = "";

  const triggers = [ ...effectTriggers.value ];

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
