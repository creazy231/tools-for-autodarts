<template>
  <!-- While a pack or an animation goes on the WLED, nothing closes the dialog: its progress, and what it adds at the end, would be out of sight. -->
  <AppModal @close="close" :disable-backdrop-click="busy" :hide-close-button="busy" :show="show" :title="t('wled.packs.dialog.title')" ghost-close size="lg">
    <div v-if="!chosen && viewedPack" ref="pageRoot" class="space-y-5">
      <button @click="viewedPack = undefined" :disabled="busy" class="flex items-center gap-1 text-sm font-semibold text-[var(--ad-text-secondary)] hover:text-[var(--ad-text-primary)] disabled:opacity-45" type="button">
        <span aria-hidden="true" class="icon-[material-symbols--arrow-back-rounded] text-lg" />
        {{ t("wled.packs.page.back") }}
      </button>
      <PackPage
        @add="choose(viewedPack)"
        @add-one="addSingle(viewedPack, $event)"
        @update:size="pickSize(viewedPack, $event)"
        :key="viewedPack.id"
        :added="addedAs(viewedPack)"
        :busy="busy"
        :can-add="!!matrix"
        :device="matrix"
        :pack="viewedPack"
        :present="present"
        :rows="pageRows"
        :set="targetLabel"
        :size="sizeOf(viewedPack).size"
      >
        <PackAddress v-model="address" :disabled="busy" :reading="probe.state === 'reading'" :text="probeText" :warns="probeWarns" />
      </PackPage>
    </div>

    <div v-else-if="!chosen" ref="pageRoot" class="space-y-6">
      <p class="text-sm text-[var(--ad-text-muted)]">
        {{ t("wled.packs.dialog.intro") }}
      </p>

      <PackAddress v-model="address" :disabled="busy" :reading="probe.state === 'reading'" :text="probeText" :warns="probeWarns" />

      <AppAlert v-if="catalog === 'failed'" compact variant="error">
        {{ t("wled.packs.loadFailed") }}
      </AppAlert>
      <div v-else-if="catalog" class="space-y-4">
        <PackCard
          @add="choose(pack)"
          @open="viewedPack = pack"
          @update:size="pickSize(pack, $event)"
          v-for="pack in catalog.packs"
          :key="pack.id"
          :added="addedAs(pack)"
          :can-add="!!matrix"
          :device="matrix"
          :pack="pack"
          :size="sizeOf(pack).size"
        />
      </div>

      <p class="border-t border-[var(--ad-border-subtle)] pt-4 text-sm text-[var(--ad-text-muted)]">
        <AppTrans path="wled.packs.otherSizes">
          <template #discord>
            <a class="font-semibold text-[var(--ad-text-primary)] underline underline-offset-2" :href="DISCORD_URL" rel="noopener noreferrer" target="_blank">Discord</a>
          </template>
          <template #github>
            <a class="font-semibold text-[var(--ad-text-primary)] underline underline-offset-2" :href="GITHUB_URL" rel="noopener noreferrer" target="_blank">GitHub</a>
          </template>
          <template #email>
            <a class="font-semibold text-[var(--ad-text-primary)] underline underline-offset-2" :href="EMAIL_URL">{{ t("wled.packs.links.email") }}</a>
          </template>
        </AppTrans>
      </p>
    </div>

    <div v-else ref="pageRoot" class="space-y-5">
      <button @click="back" :disabled="running" class="flex items-center gap-1 text-sm font-semibold text-[var(--ad-text-secondary)] hover:text-[var(--ad-text-primary)] disabled:opacity-45" type="button">
        <span aria-hidden="true" class="icon-[material-symbols--arrow-back-rounded] text-lg" />
        {{ backText }}
      </button>
      <PackInstall
        v-if="chosen.device"
        :address="origin"
        :device="chosen.device"
        :pack="chosen.pack"
        :set="chosen.set"
        :size="chosen.size"
        :state="state"
        :updating="!!chosen.update"
        :variant="chosenVariant"
      />
    </div>

    <template #footer>
      <!-- A damaged presets.json from an earlier try: its old presets stay on offer until the dialog closes. -->
      <AppButton @click="saveBackup" v-if="backup && !busy && (state.phase === 'confirm' || state.phase === 'failed')" auto>
        {{ t("wled.packs.install.saveBackup") }}
      </AppButton>
      <AppButton @click="close" v-if="!chosen" :disabled="busy" auto>
        {{ t("common.close") }}
      </AppButton>
      <template v-else-if="state.phase === 'confirm'">
        <AppButton @click="back" auto>
          {{ t("common.cancel") }}
        </AppButton>
        <AppButton @click="start" auto type="primary">
          {{ t("wled.packs.install.start") }}
        </AppButton>
      </template>
      <AppButton v-else-if="state.phase === 'running'" auto disabled loading type="primary">
        {{ t("wled.packs.install.start") }}
      </AppButton>
      <template v-else-if="state.phase === 'done'">
        <AppButton @click="useAdded" v-if="!state.inUse" auto>
          {{ t("library.sets.use") }}
        </AppButton>
        <AppButton @click="close" auto type="primary">
          {{ t("wled.packs.install.close") }}
        </AppButton>
      </template>
      <template v-else>
        <AppButton @click="back" auto>
          {{ backText }}
        </AppButton>
        <AppButton @click="start" auto type="primary">
          {{ t("wled.packs.install.retry") }}
        </AppButton>
      </template>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import AppAlert from "../../AppAlert.vue";
import AppButton from "../../AppButton.vue";
import AppModal from "../../AppModal.vue";
import AppTrans from "../../AppTrans.vue";

import PackAddress from "./PackAddress.vue";
import PackCard from "./PackCard.vue";
import PackInstall from "./PackInstall.vue";
import PackPage from "./PackPage.vue";

import type { InstallFailure, InstallState, SingleState } from "@/utils/wled-pack-install";
import type { DeviceSummary, PackIndex, PackInfo, PackSize, PackVariant } from "@/utils/wled-packs";

import { activateLibrarySet, librarySetLabel, listLibrarySets } from "@/utils/library-sets";
import { WledType } from "@/utils/storage";
import { deviceIo, loadPackIndex, loadPackVariant, probeDevice } from "@/utils/wled-pack-catalog";
import { installPack } from "@/utils/wled-pack-install";
import { addEffectsToSet, addPackSet, findPackSet, packEffects, packSetName, packSubset, packText, sizeFor, sizeLabel, updatePackSet } from "@/utils/wled-packs";
import { deviceOrigin } from "@/utils/wled-preview";

const props = defineProps<{
  show: boolean;
  /** The pack whose page opens, by its id: a tile on the WLED panel was clicked. None opens the list of packs. */
  start?: string;
  /** The effect set the WLED panel shows, by its id, which single animations go into. */
  targetSet?: string;
}>();

const emit = defineEmits<{ close: []; added: [ id: string ] }>();

/**
 * Where to ask for a pack in another size. Discord is the Autodarts community's
 * server, which the site's own docs link to: Tools has none of its own.
 */
const DISCORD_URL = "https://discord.gg/autodarts";
const GITHUB_URL = "https://github.com/creazy231/tools-for-autodarts/issues/new";
const EMAIL_URL = "mailto:info@tobias-thiele.de";
/** How long the typing has to stop before the address is tried. */
const PROBE_DEBOUNCE_MS = 500;

const { t, language } = useI18n();
const { config } = useConfig();

const address = ref("");
const probe = ref<{ state: "idle" } | { state: "reading" } | { state: "found"; device: DeviceSummary } | { state: "failed"; reason: "unreachable" | "not-wled" }>({ state: "idle" });
const catalog = shallowRef<PackIndex | "failed">();
/** The size picked on each pack's card, by the pack's id. Until one is picked, the WLED's own when the pack has it. */
const sizes = ref<Record<string, string>>({});
/** The pack being put on the WLED: its size, the WLED's matrix, the set's name, and the id of the set an update brings up to date. */
const chosen = shallowRef<{ pack: PackInfo; size: PackSize; device: { width: number; height: number }; set: string; update?: string }>();
const chosenVariant = shallowRef<PackVariant>();
const state = ref<InstallState>({ phase: "confirm" });
/** The set the last install added or brought up to date. */
const addedId = ref("");
/**
 * The WLED's presets.json from before an install that couldn't put it back, on offer until the dialog closes: a later
 * install that succeeds may have written over what the failed one left, so this can be the only copy of them.
 */
const backup = ref("");
/** The pack whose page shows; none for the list of packs. */
const viewedPack = shallowRef<PackInfo>();
/** The page shown: the list, a pack's page or the install view. */
const pageRoot = ref<HTMLElement>();
/** Single animations on their way to the WLED, put there or not: by pack and size ("standard@64x8"), then by name. */
const singles = ref<Record<string, Record<string, SingleState>>>({});
/** Which address read is the latest: an older one's answer is dropped. */
let probing = 0;

const origin = computed(() => deviceOrigin(address.value) ?? "");
/** The matrix that answered: a strip, or nothing, can't take a pack. */
const matrix = computed(() => (probe.value.state === "found" && probe.value.device.layout.height > 1 ? probe.value.device.layout : undefined));
const running = computed(() => state.value.phase === "running");
/** Whether an install runs, of a pack or of a single animation: one at a time, and the dialog stays open meanwhile. */
const busy = computed(() => running.value || Object.values(singles.value).some(rows => Object.values(rows).some(single => single.phase === "running")));
/** The effect set single animations go into: the one the panel shows, or the set in use if that one has gone. */
const target = computed(() => {
  const fx = config.value?.wledFx;
  // Through the reactive settings, not toRaw: the panel edits a set's list in place (a delete, an add), and the rows'
  // "Already in" follows it.
  const sets = fx ? listLibrarySets(fx, "effects") : [];
  return sets.find(set => set.id === props.targetSet) ?? sets.find(set => set.active);
});
const targetLabel = computed(() => (target.value ? librarySetLabel(target.value, t("library.sets.defaultName")) : ""));
const present = computed(() => new Set((target.value?.items ?? []).map(effect => effect.name)));
/** The install view's way back: to the pack's page it was opened from, or to the packs. */
const backText = computed(() => (viewedPack.value ? t("wled.packs.install.backTo", { pack: packText(viewedPack.value.name, language.value) }) : t("wled.packs.install.back")));
/** What the page's rows say, in the size it shows. */
const pageRows = computed(() => (viewedPack.value ? singles.value[rowsKey(viewedPack.value, sizeOf(viewedPack.value))] ?? {} : {}));
const probeWarns = computed(() => probe.value.state === "failed" || (probe.value.state === "found" && !matrix.value));
const probeText = computed(() => {
  const now = probe.value;
  if (now.state === "reading") return t("wled.packs.device.reading");
  if (now.state === "failed") {
    return now.reason === "unreachable"
      ? t("wled.packs.device.unreachable", { address: hostOf(origin.value) })
      : t("wled.packs.device.notWled", { address: hostOf(origin.value) });
  }
  if (now.state === "found") {
    const { name, version, layout, freeKb } = now.device;
    if (layout.height < 2) return t("wled.packs.device.strip", { count: layout.width });
    return freeKb === undefined
      ? t("wled.packs.device.foundNoRoom", { name: name || "WLED", version, size: sizeLabel(layout) })
      : t("wled.packs.device.found", { name: name || "WLED", version, size: sizeLabel(layout), free: freeKb });
  }
  return t("wled.packs.device.hint");
});

watch(() => props.show, (open) => {
  if (open) openDialog();
}, { immediate: true });

// A new address: what answered at the one before no longer counts, and an older read's answer is dropped.
// Until the typing stops and it is read, the line says so and Add is off.
watch(origin, (now) => {
  probing++;
  probe.value = now ? { state: "reading" } : { state: "idle" };
});

watchDebounced(origin, () => tryAddress(), { debounce: PROBE_DEBOUNCE_MS });

// A new page opens at its top. The dialog's body is what scrolls, and it would keep the page before's place: a pack's
// page opened from far down the list would start mid-way, its way back out of sight.
watch([ viewedPack, chosen ], async () => {
  await nextTick();
  const body = pageRoot.value?.closest(".adt-modal-body");
  if (body) body.scrollTop = 0;
});

// An install cut off while presets.json is written can leave it damaged, and the old one is only kept here:
// leaving the page while one runs asks first.
useEventListener(window, "beforeunload", (event: BeforeUnloadEvent) => {
  if (!busy.value) return;
  event.preventDefault();
  event.returnValue = "";
});

/**
 * Opening: back at the packs, or on the page of the pack whose tile was clicked, with nothing of an earlier
 * dialog's (installs, a backup), the address of the user's effects when none is typed, and the catalog, once.
 */
async function openDialog() {
  chosen.value = undefined;
  viewedPack.value = undefined;
  state.value = { phase: "confirm" };
  singles.value = {};
  backup.value = "";
  const before = address.value;
  if (!before) address.value = usualAddress();
  // A changed address is tried by its watcher.
  if (address.value === before) tryAddress();
  if (!catalog.value || catalog.value === "failed") catalog.value = (await loadPackIndex()) ?? "failed";
  // A pack's tile on the panel opens its page.
  const index = catalog.value;
  if (props.start && index !== "failed") viewedPack.value = index.packs.find(pack => pack.id === props.start);
}

/** Reads what answers at the address typed. */
async function tryAddress() {
  const target = origin.value;
  const mine = ++probing;
  if (!target) {
    probe.value = { state: "idle" };
    return;
  }
  probe.value = { state: "reading" };
  const read = await probeDevice(target);
  if (mine !== probing) return;
  probe.value = read.ok ? { state: "found", device: read.device } : { state: "failed", reason: read.reason };
}

/** The WLED most of the user's preset effects play on, in any set: where a pack most likely goes. */
function usualAddress(): string {
  const fx = config.value?.wledFx;
  if (!fx) return "";
  const counts = new Map<string, number>();
  for (const set of listLibrarySets(toRaw(fx), "effects")) {
    for (const effect of set.items) {
      const at = effect.type === WledType.PRESET ? deviceOrigin(effect.url) : undefined;
      if (at) counts.set(at, (counts.get(at) ?? 0) + 1);
    }
  }
  const [ best ] = [ ...counts ].sort((a, b) => b[1] - a[1]);
  return best ? hostOf(best[0]) : "";
}

function sizeOf(pack: PackInfo): PackSize {
  return pack.sizes.find(size => size.size === sizes.value[pack.id]) ?? sizeFor(pack, matrix.value) ?? pack.sizes[0];
}

function pickSize(pack: PackInfo, size: string) {
  sizes.value = { ...sizes.value, [pack.id]: size };
}

/** The set `pack` in its size picked was added as, if it was. */
function addedAs(pack: PackInfo): { name: string; outdated: boolean } | undefined {
  const fx = config.value?.wledFx;
  const size = sizeOf(pack);
  const set = fx ? findPackSet(fx, pack.id, size.size) : undefined;
  return set ? { name: set.name, outdated: set.pack?.version !== size.version } : undefined;
}

/** The install view for `pack`, in the size picked, on the WLED that answered. */
function choose(pack: PackInfo) {
  const fx = config.value?.wledFx;
  const device = matrix.value;
  if (!fx || !device || busy.value) return;
  const size = sizeOf(pack);
  const existing = findPackSet(fx, pack.id, size.size);
  const set = existing?.name ?? packSetName(packText(pack.name, language.value), sizeLabel(size), listLibrarySets(toRaw(fx), "effects"), t("library.sets.defaultName"));
  chosen.value = { pack, size, device, set, update: existing?.id };
  chosenVariant.value = undefined;
  state.value = { phase: "confirm" };
  loadPackVariant(size.file).then((variant) => {
    if (chosen.value?.size === size) chosenVariant.value = variant;
  });
}

/** Puts the chosen pack on the WLED, then into Tools. */
async function start() {
  const pick = chosen.value;
  const target = origin.value;
  if (!pick || !target || busy.value) return;
  state.value = { phase: "running", progress: { step: "read", done: 0, total: pick.size.gifs + 2 } };
  const variant = chosenVariant.value ?? await loadPackVariant(pick.size.file);
  if (!variant) {
    state.value = { phase: "failed", failure: { reason: "pack-unreadable" } };
    return;
  }
  const result = await installPack(deviceIo(target), variant, (progress) => {
    state.value = { phase: "running", progress };
  });
  if (!result.ok) {
    state.value = { phase: "failed", failure: failureOf(result) };
    return;
  }
  const stored = storeSet(pick, variant, result.slots, target);
  if (!stored) {
    state.value = { phase: "failed", failure: { reason: "pack-unreadable" } };
    return;
  }
  addedId.value = stored.id;
  emit("added", stored.id);
  state.value = { phase: "done", set: setLabel(stored.id), count: variant.effects.length, inUse: stored.inUse, playing: playingLabel() };
}

/**
 * The pack's effects into Tools: its set brought up to date, or a new one. The
 * settings are read now, after the install's waits: another tab may have
 * written them meanwhile, and that write is what is stored.
 */
function storeSet(pick: { pack: PackInfo; size: PackSize; set: string }, variant: PackVariant, slots: Map<number, number>, target: string): { id: string; inUse: boolean } | undefined {
  if (!config.value) return undefined;
  const fx = toRaw(config.value.wledFx);
  const effects = packEffects(variant, slots, target);
  const pack = { id: pick.pack.id, size: pick.size.size, version: variant.version };
  const existing = findPackSet(fx, pick.pack.id, pick.size.size);
  if (existing) {
    config.value.wledFx = updatePackSet(fx, existing.id, pack, effects);
    return { id: existing.id, inUse: existing.id === config.value.wledFx.activeSet };
  }
  const added = addPackSet(fx, pick.set, pack, effects);
  config.value.wledFx = added.section;
  return { id: added.id, inUse: added.inUse };
}

/**
 * Puts one animation of `pack`, in the size picked, on the WLED, with the presets and GIFs it plays on
 * (packSubset), then its effect into the set the panel shows. The settings are read when the install is
 * over, as for a pack: another tab may have written them meanwhile.
 */
async function addSingle(pack: PackInfo, name: string) {
  const at = origin.value;
  if (!at || !matrix.value || busy.value || !config.value) return;
  const size = sizeOf(pack);
  const failed = (failure: InstallFailure) => setSingle(pack, size, name, { phase: "failed", failure, address: at });
  setSingle(pack, size, name, { phase: "running" });
  try {
    const variant = await loadPackVariant(size.file);
    if (!variant) return failed({ reason: "pack-unreadable" });
    const subset = packSubset(variant, [ name ]);
    const result = await installPack(deviceIo(at), subset);
    if (!result.ok) return failed(failureOf(result));
    if (!config.value) return failed({ reason: "pack-unreadable" });
    const placed = addEffectsToSet(toRaw(config.value.wledFx), props.targetSet ?? "", packEffects(subset, result.slots, at));
    config.value.wledFx = placed.section;
    emit("added", placed.id);
    setSingle(pack, size, name, { phase: "done", set: setLabel(placed.id) });
  } catch {
    // A relay that broke off (the extension reloaded, say) mustn't leave the dialog locked.
    failed({ reason: "unreachable" });
  }
}

function rowsKey(pack: PackInfo, size: PackSize): string {
  return `${pack.id}@${size.size}`;
}

function setSingle(pack: PackInfo, size: PackSize, name: string, single: SingleState) {
  const key = rowsKey(pack, size);
  singles.value = { ...singles.value, [key]: { ...singles.value[key], [name]: single } };
}

/** What a failed install says. The first copy of the WLED's old presets one hands back is kept: a later try reads what the failed one left. */
function failureOf(result: { ok: false } & InstallFailure): InstallFailure {
  const { ok: _ok, ...failure } = result;
  if (failure.reason === "not-restored" && !backup.value) backup.value = failure.backup;
  // While one is held, presets.json may be damaged from that try, so "nothing was changed" could be wrong, and the copy
  // held is what to restore.
  return backup.value && failure.reason === "presets-unreadable" ? { reason: "not-restored", backup: backup.value } : failure;
}

/** Makes the set just added the one that plays. */
function useAdded() {
  if (!config.value || !addedId.value) return;
  config.value.wledFx = activateLibrarySet(toRaw(config.value.wledFx), "effects", addedId.value);
  if (state.value.phase === "done") state.value = { ...state.value, inUse: true };
}

function setLabel(id: string): string {
  const fx = config.value?.wledFx;
  const set = fx ? listLibrarySets(toRaw(fx), "effects").find(candidate => candidate.id === id) : undefined;
  return set ? librarySetLabel(set, t("library.sets.defaultName")) : "";
}

function playingLabel(): string {
  const fx = config.value?.wledFx;
  const set = fx ? listLibrarySets(toRaw(fx), "effects").find(candidate => candidate.active) : undefined;
  return set ? librarySetLabel(set, t("library.sets.defaultName")) : "";
}

function back() {
  if (busy.value) return;
  chosen.value = undefined;
  state.value = { phase: "confirm" };
}

function close() {
  if (!busy.value) emit("close");
}

/** Hands back the WLED's old presets.json as a file, to restore in WLED (Security & Updates). */
function saveBackup() {
  const blob = new Blob([ backup.value ], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `presets-${hostOf(origin.value)}-${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function hostOf(at: string): string {
  try {
    return new URL(at).host;
  } catch {
    return at;
  }
}
</script>
