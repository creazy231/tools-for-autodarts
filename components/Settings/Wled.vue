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
          {{ t("wled.intro") }}
        </p>

        <section class="mb-10">
          <h3 class="adt-section-title">
            {{ t("wled.sections.options") }}
          </h3>
          <OptionRow :title="t('wled.boards.title')" stacked>
            <template #description>
              <AppTrans class="adt-wled-code" :params="{ trigger: 'other' }" path="wled.boards.description" />
            </template>
            <AppTokenInput
              id="wled-boards"
              v-model="boardIds"
              :lowercase="false"
              :placeholder="t('wled.boards.placeholder')"
              :validate="validateBoardId"
            />
          </OptionRow>
          <OptionRow
            :description="t('wled.onlyOnce.description')"
            :title="t('wled.onlyOnce.title')"
          >
            <AppToggle v-model="config.wledFx.onlyOnce" size="sm" />
          </OptionRow>
          <OptionRow :description="t('wled.gameModes.description')" :title="t('gameModes.title')">
            <GameModesField v-model="config.wledFx.disabledGameModes" :intro="t('wled.gameModes.intro')" feature="wledFx" />
          </OptionRow>
        </section>

        <LibrarySection
          @reorder="moveEffect"
          :empty-text="t('wled.list.emptyText')"
          :empty-title="t('wled.list.emptyTitle')"
          :entries="entries"
          :search-placeholder="t('wled.list.searchPlaceholder')"
          :title="t('wled.list.title')"
          empty-icon="icon-[material-symbols--lightbulb-outline-rounded]"
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
                <PlayButton @click="setEffect(config.wledFx.effects[entry.index])" :label="entry.name" :title="t('wled.list.send')" />
              </template>
              <template #meta>
                <span class="shrink-0 text-sm" :class="[TYPE_ICONS[config.wledFx.effects[entry.index].type]]" />
                <span class="truncate">{{ describe(config.wledFx.effects[entry.index]) }}</span>
              </template>
            </LibraryItem>
          </template>

          <template #empty>
            <AppButton @click="openAddEffectModal" auto type="primary">
              {{ t("wled.add.effect.label") }}
            </AppButton>
            <AppButton @click="openImportCSVModal" auto>
              {{ t("wled.add.csv.label") }}
            </AppButton>
          </template>
        </LibrarySection>
      </div>
    </div>

    <!-- Import CSV -->
    <AppModal @close="closeImportCSVModal" :show="showImportCSVModal" ghost-close size="lg" :title="t('wled.csv.title')">
      <div class="space-y-4">
        <p class="text-sm text-[var(--ad-text-muted)]">
          {{ t("wled.csv.intro") }}
        </p>
        <pre class="adt-code-block">{{ csvImportPlaceholder }}</pre>
        <AppTextarea
          id="csv-data"
          v-model="csvData"
          :autosize="false"
          :placeholder="t('wled.csv.example')"
          :rows="8"
          label="CSV"
          monospace
        />
        <AppAlert v-if="csvError" compact variant="error">
          {{ t(csvError.key, csvError.params) }}
        </AppAlert>
      </div>
      <template #footer>
        <AppButton @click="closeImportCSVModal" auto>
          {{ t("common.cancel") }}
        </AppButton>
        <AppButton @click="processCSV" :disabled="!csvData" auto type="primary">
          {{ t("wled.csv.button") }}
        </AppButton>
      </template>
    </AppModal>

    <!-- Effect (add / edit) -->
    <AppModal @close="closeEffectModal" :show="showEffectModal" :title="isEditMode ? t('wled.dialog.editTitle') : t('wled.dialog.addTitle')" ghost-close>
      <div class="space-y-5">
        <AppInput id="effect-name" v-model="newEffect.name" :label="t('wled.dialog.nameLabel')" :placeholder="t('wled.dialog.namePlaceholder')" />

        <div>
          <p class="adt-field-label">
            {{ t("wled.dialog.typeLabel") }}
          </p>
          <AppRadioGroup v-model="newEffect.type" :options="EFFECT_TYPES" button-size="sm" />
          <p class="adt-field-hint">
            {{ TYPE_HINTS[newEffect.type] }}
          </p>
        </div>

        <template v-if="newEffect.type === WledType.PRESET">
          <div>
            <AppInput id="effect-url" v-model="newEffect.url" :label="t('wled.address.label')" :placeholder="t('wled.address.placeholder')">
              <template #icon>
                <span class="icon-[material-symbols--router-outline-rounded]" />
              </template>
            </AppInput>
            <p v-if="urlError" class="adt-field-hint !text-[var(--ad-rose-500)]">
              {{ t(urlError) }}
            </p>
            <p v-else-if="newEffect.url && !newEffect.url.startsWith('https://')" class="adt-field-hint !text-[var(--ad-warning)]">
              {{ t("wled.address.mixedContent") }}
            </p>
          </div>
          <div>
            <AppSelect id="effect-preset" v-model="newEffect.preset" :label="t('wled.preset.label')" :options="availablePresetsOptions" />
            <p v-if="presetError" class="adt-field-hint !text-[var(--ad-rose-500)]">
              {{ t(presetError) }}
            </p>
            <p v-else class="adt-field-hint">
              {{ t("wled.preset.hint") }}
            </p>
          </div>
        </template>

        <div v-if="newEffect.type === WledType.URL">
          <AppInput id="effect-url" v-model="newEffect.url" :label="t('wled.link.label')" :placeholder="t('wled.link.placeholder')">
            <template #icon>
              <span class="icon-[material-symbols--link-rounded]" />
            </template>
          </AppInput>
          <p v-if="urlError" class="adt-field-hint !text-[var(--ad-rose-500)]">
            {{ t(urlError) }}
          </p>
          <p v-else-if="newEffect.url.startsWith('http://')" class="adt-field-hint !text-[var(--ad-warning)]">
            {{ t("wled.link.mixedContent") }}
          </p>
        </div>

        <template v-if="newEffect.type === WledType.API">
          <div>
            <AppInput id="effect-url" v-model="newEffect.url" :label="t('wled.api.endpointLabel')" :placeholder="t('wled.api.endpointPlaceholder')">
              <template #icon>
                <span class="icon-[material-symbols--link-rounded]" />
              </template>
            </AppInput>
            <p v-if="urlError" class="adt-field-hint !text-[var(--ad-rose-500)]">
              {{ t(urlError) }}
            </p>
            <p v-else-if="newEffect.url.startsWith('http://')" class="adt-field-hint !text-[var(--ad-warning)]">
              {{ t("wled.link.mixedContent") }}
            </p>
          </div>
          <div>
            <AppTextarea id="wled-json-api" v-model="newEffect.json_api" :autosize="false" :rows="6" label="JSON" monospace placeholder="{}" />
            <p v-if="jsonError" class="adt-field-hint !text-[var(--ad-rose-500)]">
              {{ t(jsonError) }}
            </p>
          </div>
        </template>

        <TriggerField id="effect-triggers" v-model="effectTriggers" feature="wled" />
      </div>

      <template #footer>
        <AppButton @click="testDraft" :disabled="!canTestDraft" auto class="mr-auto">
          <span class="flex items-center gap-1.5">
            <span class="icon-[material-symbols--play-arrow-rounded] text-lg" />
            {{ t("wled.dialog.test") }}
          </span>
        </AppButton>
        <AppButton @click="closeEffectModal" auto>
          {{ t("common.cancel") }}
        </AppButton>
        <AppButton @click="saveEffect" auto type="primary">
          {{ isEditMode ? t("common.save") : t("wled.dialog.addButton") }}
        </AppButton>
      </template>
    </AppModal>

    <!-- Delete all -->
    <AppModal @close="closeDeleteAllModal" :show="showDeleteAllModal" :title="t('wled.deleteAll.title', { count: config?.wledFx.effects.length ?? 0 })" ghost-close size="sm">
      <p class="text-sm text-[var(--ad-text-muted)]">
        {{ t("wled.deleteAll.body") }}
      </p>
      <template #footer>
        <AppButton @click="closeDeleteAllModal" auto>
          {{ t("common.cancel") }}
        </AppButton>
        <AppButton @click="deleteAllEffects" auto type="danger">
          {{ t("library.deleteAll") }}
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
            {{ t("features.wled") }}
            <span class="icon-[material-symbols--settings-alert-outline-rounded] ml-2 size-5" />
          </h3>
          <p class="w-2/3 text-white/70">
            {{ t("wled.card") }}
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
        <img :src="imageUrl" :alt="t('wled.imageAlt')" class="size-full object-cover">
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
import AppTrans from "../AppTrans.vue";

import GameModesField from "./Library/GameModesField.vue";
import LibraryItem from "./Library/LibraryItem.vue";
import LibrarySection from "./Library/LibrarySection.vue";
import OptionRow from "./Library/OptionRow.vue";
import PlayButton from "./Library/PlayButton.vue";
import TriggerField from "./Library/TriggerField.vue";
import { stableKey } from "./Library/stable-key";

import type { MessageKey, Params } from "@/utils/i18n";
import type { LibraryEntry } from "@/utils/library-search";

import { useNotification } from "@/composables/useNotification";
import { setEffect } from "@/entrypoints/match.content/wled";
import { type IWled } from "@/utils/storage";
import { WledType } from "#imports";

const emit = defineEmits([ "toggle" ]);
useStorage("adt:active-settings", "wled-fx");

const { t } = useI18n();

/** `WledType` is what an effect is stored as and what a CSV line names it by: only the labels are said in the language. */
const EFFECT_TYPES = computed(() => [
  { label: t("wled.type.options.preset"), value: WledType.PRESET },
  { label: t("wled.type.options.url"), value: WledType.URL },
  { label: t("wled.type.options.api"), value: WledType.API },
]);

const TYPE_HINTS = computed<Record<WledType, string>>(() => ({
  [WledType.PRESET]: t("wled.type.hints.preset"),
  [WledType.URL]: t("wled.type.hints.url"),
  [WledType.API]: t("wled.type.hints.api"),
}));

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
/**
 * What the dialog's fields refuse, as the key of the line said under each: it follows a language picked while it
 * shows. "" is nothing to say.
 */
const urlError = ref<MessageKey | "">("");
const presetError = ref<MessageKey | "">("");
const jsonError = ref<MessageKey | "">("");
/**
 * The preset picker's options. A note of ours (type the address first, couldn't read, pick one) holds its message
 * key, so it follows a language picked while the dialog is open; a preset of the device is shown by its own name.
 * The value "0" is no preset.
 */
const presetChoices = ref<{ value: string; key?: MessageKey; label?: string }[]>([
  { value: "0", key: "wled.preset.typeAddress" },
]);

// Import CSV modal
const showImportCSVModal = ref(false);
const csvData = ref("");
/** Why the pasted lines are refused: the key of the message and its params (the line). */
const csvError = ref<{ key: MessageKey; params: Params } | null>(null);
// The form of a line as it is typed: its type names are what a line is read by, so it is the same in every language.
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
    name: effect.name || triggers[0] || t("wled.list.untitled"),
    triggers,
    // What a search also matches: the type's stored name, the address and "preset <n>". They are tokens, not text, so they are the same in every language.
    source: `${effect.type} ${effect.url} ${effect.type === WledType.PRESET ? `preset ${effect.preset}` : ""}`,
    enabled: effect.enabled,
  };
}));

const canTestDraft = computed(() => !!newEffect.value.url.trim()
  && (newEffect.value.type !== WledType.PRESET || newEffect.value.preset !== "0"));

/** What the picker shows: our notes said in the current language, the device's presets as they are named. */
const availablePresetsOptions = computed(() => presetChoices.value.map(choice => ({
  value: choice.value,
  label: choice.key ? t(choice.key) : (choice.label ?? ""),
})));

const addActions = computed(() => [
  { label: t("wled.add.effect.label"), hint: t("wled.add.effect.hint"), icon: "icon-[material-symbols--add-rounded]", action: openAddEffectModal },
  { label: t("wled.add.csv.label"), hint: t("wled.add.csv.hint"), icon: "icon-[material-symbols--content-paste-rounded]", action: openImportCSVModal },
]);

const moreActions = computed(() => [
  {
    label: t("wled.menu.sort.label"),
    hint: t("wled.menu.sort.hint"),
    icon: "icon-[material-symbols--sort-by-alpha-rounded]",
    disabled: (config.value?.wledFx.effects.length ?? 0) < 2,
    action: sortEffectsByTriggers,
  },
  {
    label: t("library.deleteAllMenu"),
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
  if (effect.type === WledType.PRESET) return t("wled.list.preset", { n: effect.preset, url: effect.url });
  if (effect.type === WledType.API) return t("wled.list.api", { url: effect.url });
  return effect.url;
}

/** What the board field says under a chip that is no board ID, said as it validates; "" for a board ID. */
function validateBoardId(id: string): string {
  return BOARD_ID.test(id) ? "" : t("wled.boards.invalid");
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
  csvError.value = null;
}

function closeImportCSVModal() {
  showImportCSVModal.value = false;
  csvData.value = "";
  csvError.value = null;
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
      csvError.value = { key: "wled.csv.errors.fields", params: { line } };
      return [];
    }

    const name = values.shift()!;
    const type: WledType | null = stringToWledType(values.shift()!);
    const url = values.shift()!;
    const preset: string = type === WledType.PRESET ? values.shift()! : "0";
    const json_api = type === WledType.API ? values.shift()! : "";
    const triggers: string[] = values;

    if (type === null) {
      csvError.value = { key: "wled.csv.errors.type", params: { line } };
      return [];
    }

    if (!url.startsWith("https://") && !url.startsWith("http://")) {
      csvError.value = { key: "wled.csv.errors.url", params: { line } };
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

  csvError.value = null;
  const csvEntries = parseCSV(csvData.value);

  if (csvError.value) return;

  csvEntries.forEach((effect) => {
    config.value?.wledFx.effects.unshift(effect);
  });

  closeImportCSVModal();
  showNotification(t("wled.csv.imported", { count: csvEntries.length }), "success");
}

async function fetchPresets() {
  console.log("Autodarts Tools: WLED: fetchPresets");
  try {
    const presetUrl = `${(newEffect.value.url.startsWith("http") ? "" : "http://")
      + newEffect.value.url
      + (newEffect.value.url.endsWith("/") ? "" : "/")
       }presets.json`;
    console.log("Autodarts Tools: WLED: loading presets from", presetUrl);
    presetChoices.value = [ { value: newEffect.value.preset, key: "wled.preset.readFailed" } ];
    window.fetch(presetUrl)
      .then(resp => resp.json())
      .then((data: Record<string, { n: string }>) => {
        if (data && typeof data === "object") {
          presetChoices.value = [ { value: "0", key: "wled.preset.pick" } ];
          Object.entries(data).forEach(([ id, preset ]) => {
            if (id === "0" || !("n" in preset) || preset.n === undefined) return;
            presetChoices.value.push({ value: id, label: `[${id}] ${preset.n}` });
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
    showNotification(t("wled.notifications.configNotLoaded"), "error");
    return;
  }

  // Check if we have triggers
  if (!effectTriggers.value.length) {
    showNotification(t("wled.notifications.needsTrigger"), "error");
    return;
  }

  if (newEffect.value.type === WledType.URL) {
    // Check if URL is valid
    if (!newEffect.value.url.trim()) {
      showNotification(t("wled.notifications.needsUrl"), "error");
      return;
    }
    if (!newEffect.value.url.startsWith("https://") && !newEffect.value.url.startsWith("http://")) {
      urlError.value = "wled.errors.linkScheme";
      return;
    }
  } else if (newEffect.value.type === WledType.PRESET) {
    if (newEffect.value.preset === "0") {
      presetError.value = "wled.errors.presetFirst";
      return;
    }
  } else if (newEffect.value.type === WledType.API) {
    // Check if json is valid
    try {
      JSON.parse(newEffect.value.json_api);
    } catch (e) {
      showNotification(t("wled.notifications.jsonInvalid"), "error");
      jsonError.value = "wled.errors.jsonInvalid";
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
  showNotification(t(isEditMode.value ? "wled.notifications.updated" : "wled.notifications.added"), "success");
}

async function removeEffect(index: number) {
  if (config.value?.wledFx.effects) {
    config.value.wledFx.effects.splice(index, 1);
    showNotification(t("wled.notifications.removed"), "success");
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
  showNotification(t("wled.notifications.sorted"), "success");
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
  showNotification(t("wled.notifications.allDeleted", { count: effectCount }), "error");
}
</script>

<style scoped>
/* The token in the Boards description is a plain <code> in the message; it is set as .adt-code is (assets/tailwind.css). */
.adt-wled-code :deep(code) {
  padding: 1px 5px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.92em;
  color: var(--ad-text-secondary);
  background: rgb(255 255 255 / 8%);
  border-radius: var(--ad-radius-xs);
}
</style>
