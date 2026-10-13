import type { Language } from "@/utils/i18n/site-language";
import type { IConfig, IWled, IWledSet, IWledSetPack } from "@/utils/storage";
import type { Layout } from "@/utils/wled-preview";

import { canonicalJson } from "@/utils/canonical-json";
import { activateLibrarySet, addLibrarySet, librarySetNameTaken, listLibrarySets } from "@/utils/library-sets";
import { WledType } from "@/utils/storage";
import { layoutOf } from "@/utils/wled-preview";

/**
 * WLED animation packs: ready-made sets of animations, each in one or more
 * matrix sizes, that Tools puts on the user's WLED as presets and adds to the
 * WLED settings as an effect set. The catalog ships with the extension
 * (public/wled-packs/, built by `yarn wled:packs`), utils/wled-pack-install.ts
 * puts a pack on a device, and components/Settings/Wled/PacksDialog.vue offers
 * them. Spec: docs/superpowers/specs/2026-10-13-wled-animation-packs-design.md.
 *
 * Nothing here reads, draws or stores, so tsx runs it.
 */

/** A pack's text in each language Tools speaks. English is always there, and stands in for one that is missing. */
export type PackText = { en: string } & Partial<Record<Language, string>>;

/** A pack in one size, as the catalog's index lists it. */
export interface PackSize {
  /** `<width>x<height>`, as WLED's 2D settings and wled-project's folders put a matrix: "64x8". */
  size: string;
  width: number;
  height: number;
  /** The variant's file, in the catalog's folder. */
  file: string;
  /** Changes exactly when the variant's content does. */
  version: string;
  effects: number;
  presets: number;
  gifs: number;
  /** The GIFs' bytes together. */
  bytes: number;
  /** The preset its card shows, by the variant's own number. */
  cover: number;
}

export interface PackInfo {
  id: string;
  name: PackText;
  description: PackText;
  sizes: PackSize[];
}

export interface PackIndex {
  format: 1;
  packs: PackInfo[];
}

/** An effect of a pack: its name, the preset it plays by the variant's own number, and its triggers. */
export interface PackEffect {
  name: string;
  preset: number;
  triggers: string[];
}

/** A pack in one size: what an install puts on a device and into Tools. */
export interface PackVariant {
  format: 1;
  pack: string;
  size: string;
  width: number;
  height: number;
  version: string;
  /** WLED 16's names of the effect ids its presets use, such as {"53": "Image"}. */
  fx: Record<string, string>;
  /** Its presets by its own numbers: wled-project's. */
  presets: Record<string, Record<string, unknown>>;
  effects: PackEffect[];
  gifs: { name: string; bytes: number }[];
}

/** What answered at an address: its name, its WLED version, its LEDs and its free space. */
export interface DeviceSummary {
  name: string;
  version: string;
  layout: Layout;
  freeKb?: number;
}

/** Where a pack's presets go on a device, and its presets.json with them; or why there is no room. */
export type InstallPlan =
  | {
    ok: true;
    /** The device's number for each of the variant's presets, by the variant's number. */
    slots: Map<number, number>;
    /** The device's presets with the pack's among them: the presets.json to write. */
    presets: Record<string, unknown>;
    /** Presets found on the device by name, new ones, and new ones not at the pack's own number. */
    kept: number;
    added: number;
    moved: number;
  }
  | { ok: false; reason: "no-slots"; needed: number; free: number };

export type Room = { ok: true } | { ok: false; neededKb: number; freeKb: number };

/** WLED's settings, whose effects come in sets. */
type WledFx = IConfig["wledFx"];

/** The catalog format this version reads. */
export const PACK_FORMAT = 1;

/** LittleFS keeps a file in whole blocks of this many bytes. */
export const FS_BLOCK = 4096;

/** WLED saves a preset only while presets.json and this many bytes more are free (wled00/file.cpp). */
export const PRESET_RESERVE = 9000;

/** WLED keeps presets 1 to 250. */
const PRESETS = { first: 1, last: 250 };

/** WLED's Autosave usermod saves to preset 250 unless it is told otherwise: a pack takes 250 only as its own number. */
const AUTOSAVE_PRESET = 250;

/** A pack text in `language`, or its English. */
export function packText(text: PackText, language: Language): string {
  return text[language] || text.en;
}

/** A matrix's size as the dialog writes it, width × height: "64 × 8". */
export function sizeLabel(size: { width: number; height: number }): string {
  return `${size.width} × ${size.height}`;
}

/** The size of `pack` made for a matrix of `layout`, if it has one. */
export function sizeFor(pack: PackInfo, layout?: { width: number; height: number }): PackSize | undefined {
  return layout ? pack.sizes.find(size => size.width === layout.width && size.height === layout.height) : undefined;
}

/** Whether `value` is a catalog index this version reads. */
export function isPackIndex(value: unknown): value is PackIndex {
  return isRecord(value) && value.format === PACK_FORMAT && Array.isArray(value.packs) && value.packs.every(pack => isRecord(pack)
    && typeof pack.id === "string"
    && isRecord(pack.name) && typeof pack.name.en === "string"
    && isRecord(pack.description) && typeof pack.description.en === "string"
    && Array.isArray(pack.sizes) && pack.sizes.length > 0
    && pack.sizes.every(size => isRecord(size) && typeof size.size === "string" && isCount(size.width) && isCount(size.height)
      && typeof size.file === "string" && typeof size.version === "string" && Number.isInteger(size.cover)));
}

/** Whether `value` is a pack variant this version reads. */
export function isPackVariant(value: unknown): value is PackVariant {
  return isRecord(value) && value.format === PACK_FORMAT && typeof value.version === "string"
    && isCount(value.width) && isCount(value.height)
    && isRecord(value.fx) && isRecord(value.presets)
    && Array.isArray(value.effects) && value.effects.every(effect => isRecord(effect) && typeof effect.name === "string" && Number.isInteger(effect.preset) && Array.isArray(effect.triggers))
    && Array.isArray(value.gifs) && value.gifs.every(gif => isRecord(gif) && typeof gif.name === "string" && typeof gif.bytes === "number");
}

/** What a device's `/json/info` says of it, if it is a WLED's. */
export function deviceSummary(info: unknown): DeviceSummary | undefined {
  const layout = layoutOf(info);
  if (!layout || !isRecord(info)) return undefined;
  const fs = isRecord(info.fs) ? info.fs : undefined;
  const total = fs?.t;
  const used = fs?.u;
  return {
    name: typeof info.name === "string" ? info.name : "",
    version: typeof info.ver === "string" ? info.ver : "",
    layout,
    freeKb: typeof total === "number" && typeof used === "number" && total >= used ? total - used : undefined,
  };
}

/**
 * The device's ids for the effects a pack uses, found by their names in its
 * `/json/eff`: WLED's effect ids move between versions, its names don't. The
 * first one the device lacks makes the pack unplayable there.
 */
export function deviceEffects(fx: Record<string, string>, names: readonly string[]): { ok: true; ids: Record<string, number> } | { ok: false; missing: string } {
  const ids: Record<string, number> = {};
  for (const [ id, name ] of Object.entries(fx)) {
    const at = names.indexOf(name);
    if (at < 0) return { ok: false, missing: name };
    ids[id] = at;
  }
  return { ok: true, ids };
}

/**
 * Where a pack's presets go on a device whose presets.json holds `device`,
 * and that presets.json with them. Nothing of the user's is overwritten:
 * 1. a pack preset whose name a device preset has takes that preset's number
 *    (the lowest, if several have it): it is the same preset from an earlier
 *    install, by Tools or by wled-project's installer, and is brought up to date;
 * 2. the others take their own number when nothing is there (`{}` is nothing);
 * 3. the rest take free numbers from 249 down, away from the low numbers people
 *    save their own presets at, and from 250, which WLED's Autosave usermod
 *    saves to.
 * The pack's references between its presets (a playlist's entries and end, a
 * top-level `ps`) follow them, and effect ids go through `fxIds` (deviceEffects).
 * `"0"`, WLED's placeholder, and keys that aren't preset numbers stay as they are.
 */
export function planInstall(device: Record<string, unknown>, variant: Pick<PackVariant, "presets">, fxIds: Record<string, number> = {}): InstallPlan {
  const used = new Set<number>();
  const byName = new Map<string, number>();
  for (const [ key, value ] of Object.entries(device)) {
    const id = presetNumber(key);
    if (id === undefined || !isRecord(value) || !Object.keys(value).length) continue;
    used.add(id);
    if (typeof value.n === "string" && value.n && !byName.has(value.n)) byName.set(value.n, id);
  }

  const ids = Object.keys(variant.presets).map(Number).sort((a, b) => a - b);
  const slots = new Map<number, number>();
  const taken = new Set<number>();
  for (const id of ids) {
    const name = variant.presets[String(id)].n;
    const there = typeof name === "string" ? byName.get(name) : undefined;
    if (there === undefined || taken.has(there)) continue;
    slots.set(id, there);
    taken.add(there);
  }
  const kept = slots.size;

  const needed = ids.length - kept;
  // The numbers the pack can take: 1 to 249 where nothing is, and 250 only as its own number.
  let free = ids.includes(AUTOSAVE_PRESET) && !slots.has(AUTOSAVE_PRESET) && !used.has(AUTOSAVE_PRESET) ? 1 : 0;
  for (let number = PRESETS.first; number < AUTOSAVE_PRESET; number++) if (!used.has(number)) free++;
  if (needed > free) return { ok: false, reason: "no-slots", needed, free };

  for (const id of ids) {
    if (slots.has(id) || used.has(id) || taken.has(id) || id < PRESETS.first || id > PRESETS.last) continue;
    slots.set(id, id);
    taken.add(id);
  }
  let moved = 0;
  let next = AUTOSAVE_PRESET - 1;
  for (const id of ids) {
    if (slots.has(id)) continue;
    while (used.has(next) || taken.has(next)) next--;
    // The count above leaves enough; this only guards against a mistake in it.
    if (next < PRESETS.first) return { ok: false, reason: "no-slots", needed, free };
    slots.set(id, next);
    taken.add(next);
    moved++;
  }

  // WLED's placeholder "0" is always there, as WLED and wled-project's installer write the file.
  const presets: Record<string, unknown> = { 0: {}, ...device };
  for (const [ id, at ] of slots) presets[String(at)] = renumbered(variant.presets[String(id)], slots, fxIds);
  return { ok: true, slots: new Map([ ...slots ].sort((a, b) => a[0] - b[0])), presets, kept, added: needed, moved };
}

/**
 * A device's presets.json as WLED writes it itself (wled00/file.cpp), which
 * its in-place edits rely on: `"0"` first, then one preset a line in number
 * order, each line after the first starting with its comma. wled-project's
 * own presets.json files come out byte for byte.
 */
export function presetsFile(presets: Record<string, unknown>): string {
  const keys = Object.keys(presets).filter(key => key !== "0").sort((a, b) => rank(a) - rank(b) || (a < b ? -1 : a > b ? 1 : 0));
  const lines = [ `"0":${JSON.stringify(presets["0"] ?? {})}`, ...keys.map(key => `${JSON.stringify(key)}:${JSON.stringify(presets[key])}`) ];
  return `{${lines.join("\n,")}}`;
}

/** A device's presets.json, read: an empty file is no presets, and anything but a JSON object is `undefined`. */
export function parsePresets(text: string): Record<string, unknown> | undefined {
  if (!text.trim()) return {};
  try {
    const value: unknown = JSON.parse(text);
    return isRecord(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

/** Whether two presets.json hold the same presets, WLED's empty `"0"` and the order of keys aside. */
export function samePresets(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  return canonicalJson(withoutPlaceholder(a)) === canonicalJson(withoutPlaceholder(b));
}

/** A device's files and their sizes, from WLED 16's `/edit?func=list` ("/ad_180.gif" → bytes). None from anything else. */
export function fileSizes(listing: unknown): Record<string, number> | undefined {
  if (!Array.isArray(listing)) return undefined;
  const files: Record<string, number> = {};
  for (const file of listing) {
    if (isRecord(file) && typeof file.name === "string" && typeof file.size === "number") files[`/${file.name.replace(/^\/+/, "")}`] = file.size;
  }
  return files;
}

/**
 * Whether a device has room for a pack, as wled-project's installer counts
 * it: free space is WLED's kB figure at its low end; a GIF takes its blocks,
 * less those of the file of its name it replaces (unknown without `files`, so
 * counted whole); the new presets.json is written while the old one is still
 * there; and afterwards presets.json, PRESET_RESERVE bytes and a block must
 * stay free, or WLED can no longer save a preset. A device that doesn't say
 * how full it is isn't checked.
 */
export function roomFor(info: unknown, files: Record<string, number> | undefined, gifs: readonly { name: string; bytes: number }[], oldPresets: number, newPresets: number): Room {
  const fs = isRecord(info) && isRecord(info.fs) ? info.fs : undefined;
  if (!fs || typeof fs.t !== "number" || typeof fs.u !== "number") return { ok: true };
  const free = (fs.t - fs.u) * 1000 - 999;
  const blocks = (bytes: number) => Math.ceil(bytes / FS_BLOCK);
  let after = free;
  for (const gif of gifs) after -= (blocks(gif.bytes) - blocks(files?.[`/${gif.name}`] ?? 0)) * FS_BLOCK;
  const tightest = after - blocks(newPresets) * FS_BLOCK;
  after -= (blocks(newPresets) - blocks(files?.["/presets.json"] ?? oldPresets)) * FS_BLOCK;
  const keep = newPresets + PRESET_RESERVE + FS_BLOCK;
  if (after >= keep && tightest >= FS_BLOCK) return { ok: true };
  const needed = Math.max(free - after + keep, free - tightest + FS_BLOCK);
  return { ok: false, neededKb: Math.ceil(needed / 1000), freeKb: Math.max(0, Math.floor(free / 1000)) };
}

/** The pack's effects for Tools: each a PRESET effect on the device at `address`, playing its preset where the plan put it. */
export function packEffects(variant: Pick<PackVariant, "effects">, slots: ReadonlyMap<number, number>, address: string): IWled[] {
  return variant.effects.map(effect => ({
    name: effect.name,
    type: WledType.PRESET,
    url: address,
    preset: String(slots.get(effect.preset) ?? effect.preset),
    json_api: "",
    enabled: true,
    triggers: [ ...effect.triggers ],
  }));
}

/**
 * A pack set's effects after an update: the pack's, each keeping the on/off of
 * the effect of its name, then every other effect the set held, such as the
 * user's own, in their order.
 */
export function mergePackEffects(current: readonly IWled[], fresh: readonly IWled[]): IWled[] {
  const before = new Map<string, IWled>();
  for (const effect of current) if (!before.has(effect.name)) before.set(effect.name, effect);
  const names = new Set(fresh.map(effect => effect.name));
  return [
    ...fresh.map(effect => ({ ...effect, enabled: before.get(effect.name)?.enabled ?? effect.enabled })),
    ...current.filter(effect => !names.has(effect.name)),
  ];
}

/** A name for a pack's new set: the pack's; with its size if a set has that name; then numbered. */
export function packSetName(name: string, size: string, sets: readonly { id: string; name: string }[], defaultName: string): string {
  const sized = `${name} (${size})`;
  if (!librarySetNameTaken(sets, name, defaultName)) return name;
  if (!librarySetNameTaken(sets, sized, defaultName)) return sized;
  for (let count = 2; ; count++) {
    const numbered = `${sized} ${count}`;
    if (!librarySetNameTaken(sets, numbered, defaultName)) return numbered;
  }
}

/** The set added from `pack` in `size`, if there is one. */
export function findPackSet(section: { sets?: IWledSet[] }, pack: string, size: string): IWledSet | undefined {
  return (section.sets ?? []).find(set => set.pack?.id === pack && set.pack?.size === size);
}

/**
 * `section` with a new set for a pack, holding `effects`, and the set's id.
 * It plays at once when the set in use has no effects, as nothing would play
 * otherwise; else the set in use goes on playing. `section` isn't changed.
 */
export function addPackSet(section: WledFx, name: string, pack: IWledSetPack, effects: IWled[]): { section: WledFx; id: string; inUse: boolean } {
  const added = addLibrarySet(section, "effects", name, effects);
  const marked: WledFx = { ...added.section, sets: (added.section.sets ?? []).map(set => (set.id === added.id ? { ...set, pack: { ...pack } } : set)) };
  const playing = listLibrarySets(section, "effects").find(set => set.active)?.items ?? [];
  if (playing.length) return { section: marked, id: added.id, inUse: false };
  return { section: activateLibrarySet(marked, "effects", added.id), id: added.id, inUse: true };
}

/** `section` with set `id`'s effects brought up to date from its pack (mergePackEffects), and the pack's version. An id no set has gives back `section`. */
export function updatePackSet(section: WledFx, id: string, pack: IWledSetPack, effects: IWled[]): WledFx {
  const view = listLibrarySets(section, "effects").find(set => set.id === id);
  if (!view) return section;
  const merged = mergePackEffects(view.items, effects);
  const sets = (section.sets ?? []).map(set => (set.id === id ? { ...set, pack: { ...pack }, ...(view.active ? {} : { effects: merged }) } : set));
  return view.active ? { ...section, effects: merged, sets } : { ...section, sets };
}

/** A pack preset with its references and effect ids as the device has them. The pack's own copy isn't changed. */
function renumbered(preset: Record<string, unknown>, slots: ReadonlyMap<number, number>, fxIds: Record<string, number>): Record<string, unknown> {
  const copy = JSON.parse(JSON.stringify(preset)) as Record<string, any>;
  const to = (id: unknown) => (typeof id === "number" && slots.has(id) ? slots.get(id) : id);
  if (typeof copy.ps === "number") copy.ps = to(copy.ps);
  if (isRecord(copy.playlist)) {
    if (Array.isArray(copy.playlist.ps)) copy.playlist.ps = copy.playlist.ps.map(to);
    if (copy.playlist.end !== undefined) copy.playlist.end = to(copy.playlist.end);
  }
  const segments = Array.isArray(copy.seg) ? copy.seg : isRecord(copy.seg) ? [ copy.seg ] : [];
  for (const segment of segments) {
    if (isRecord(segment) && typeof segment.fx === "number" && String(segment.fx) in fxIds) segment.fx = fxIds[String(segment.fx)];
  }
  return copy;
}

function withoutPlaceholder(presets: Record<string, unknown>): Record<string, unknown> {
  const copy = { ...presets };
  if (isRecord(copy["0"]) && !Object.keys(copy["0"]).length) delete copy["0"];
  return copy;
}

/** A key's preset number, 1 to 250, written as WLED writes it. */
function presetNumber(key: string): number | undefined {
  if (!/^[1-9]\d{0,2}$/.test(key)) return undefined;
  const id = Number(key);
  return id <= PRESETS.last ? id : undefined;
}

function rank(key: string): number {
  return /^\d+$/.test(key) ? Number(key) : Number.MAX_SAFE_INTEGER;
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isRecord(value: unknown): value is Record<string, any> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
