/**
 * WLED animation packs: the catalog the extension ships (public/wled-packs/),
 * built from WLED presets, Tools CSV lines and GIFs, such as wled-project's
 * animations folder. `yarn wled:packs` runs it (scripts/wled-packs.ts); the
 * extension reads the catalog with utils/wled-packs.ts. Spec:
 * docs/superpowers/specs/2026-10-13-wled-animation-packs-design.md.
 *
 * A pack that would break an install on someone's WLED is refused here, with
 * what is wrong, rather than found out on their device.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

/** The languages Tools speaks: every pack text comes in each. */
export const LANGUAGES = [ "en", "de", "nl" ] as const;

/** WLED 16's names for the effect ids a pack's presets may use. An install looks each one up on the device by name. */
export const KNOWN_FX: Readonly<Record<string, string>> = { 0: "Solid", 53: "Image", 77: "Copy Segment" };

/** A GIF's name on the device: LittleFS keeps 31 characters of a path, its slash included. */
const GIF_NAME = /^[a-z0-9_.-]{1,26}\.gif$/;
const PACK_ID = /^[a-z0-9-]+$/;
const SIZE = /^([1-9]\d*)x([1-9]\d*)$/;

/** WLED keeps presets 1 to 250. */
const FIRST_PRESET = 1;
const LAST_PRESET = 250;

export type Texts = Record<(typeof LANGUAGES)[number], string>;

export interface SourceSize {
  /** The WLED presets.json that holds the variant's presets, relative to the source folder. */
  presets: string;
  /** Tools CSV files of `name;PRESET;address;preset;trigger;…` lines, in the order the effects are listed. */
  effects: string[];
  /** The folders the GIFs are found in, first match first. */
  gifs: string[];
  /** The name of the preset the pack's card shows. */
  cover: string;
}

export interface SourcePack {
  id: string;
  name: Texts;
  description: Texts;
  /** By size, `<width>x<height>`. */
  sizes: Record<string, SourceSize>;
}

export interface SourceList {
  packs: SourcePack[];
}

export interface CatalogSize {
  size: string;
  width: number;
  height: number;
  file: string;
  version: string;
  effects: number;
  presets: number;
  gifs: number;
  bytes: number;
  cover: number;
}

export interface CatalogPack {
  id: string;
  name: Texts;
  description: Texts;
  sizes: CatalogSize[];
}

export interface CatalogEffect {
  name: string;
  preset: number;
  triggers: string[];
}

export interface CatalogVariant {
  format: 1;
  pack: string;
  size: string;
  width: number;
  height: number;
  version: string;
  fx: Record<string, string>;
  presets: Record<string, Record<string, unknown>>;
  effects: CatalogEffect[];
  gifs: { name: string; bytes: number }[];
}

export interface Catalog {
  index: { format: 1; packs: CatalogPack[] };
  /** Each variant, by its file's name. */
  variants: Map<string, CatalogVariant>;
  /** Every GIF's bytes, by its name. */
  gifs: Map<string, Buffer>;
}

/** What is wrong with the sources, said so a maintainer can fix it. */
export class PackError extends Error {}

/** The catalog `sources` describe, from files under `root`. Throws a PackError naming what is wrong. */
export function buildCatalog(sources: SourceList, root: string): Catalog {
  if (!sources || !Array.isArray(sources.packs) || !sources.packs.length) throw new PackError("the source list has no packs");
  const variants = new Map<string, CatalogVariant>();
  const gifs = new Map<string, Buffer>();
  // For each size, what each preset name means: two packs that gave one name two meanings would overwrite each other's presets.
  const meanings = new Map<string, Map<string, { json: string; file: string }>>();
  const ids = new Set<string>();
  const packs: CatalogPack[] = [];
  for (const source of sources.packs) {
    if (!PACK_ID.test(source.id ?? "") || ids.has(source.id)) throw new PackError(`pack "${source.id}": an id is lower-case letters, digits and dashes, and each is used once`);
    ids.add(source.id);
    const name = texts(source.name, `${source.id}: name`);
    const description = texts(source.description, `${source.id}: description`);
    const sizes: CatalogSize[] = [];
    for (const [ size, sourceSize ] of Object.entries(source.sizes ?? {})) {
      const file = `${source.id}-${size}.json`;
      const variant = buildVariant(source.id, size, sourceSize, root, gifs);
      checkMeanings(meanings, variant, file);
      const cover = Object.entries(variant.presets).find(([ , preset ]) => preset.n === sourceSize.cover)?.[0];
      if (!cover) throw new PackError(`${file}: no preset named "${sourceSize.cover}" for the cover`);
      variants.set(file, variant);
      sizes.push({
        size,
        width: variant.width,
        height: variant.height,
        file,
        version: variant.version,
        effects: variant.effects.length,
        presets: Object.keys(variant.presets).length,
        gifs: variant.gifs.length,
        bytes: variant.gifs.reduce((sum, gif) => sum + gif.bytes, 0),
        cover: Number(cover),
      });
    }
    if (!sizes.length) throw new PackError(`${source.id}: no sizes`);
    packs.push({ id: source.id, name, description, sizes });
  }
  return { index: { format: 1, packs }, variants, gifs };
}

/** Writes `catalog` to `out`, afresh: a pack or GIF the sources dropped is dropped from the catalog too. */
export function writeCatalog(catalog: Catalog, out: string): void {
  rmSync(out, { recursive: true, force: true });
  mkdirSync(path.join(out, "gifs"), { recursive: true });
  writeFileSync(path.join(out, "index.json"), `${JSON.stringify(catalog.index, null, 2)}\n`);
  for (const [ file, variant ] of catalog.variants) writeFileSync(path.join(out, file), `${JSON.stringify(variant, null, 2)}\n`);
  for (const name of [ ...catalog.gifs.keys() ].sort()) writeFileSync(path.join(out, "gifs", name), catalog.gifs.get(name)!);
}

function buildVariant(pack: string, size: string, source: SourceSize, root: string, gifs: Map<string, Buffer>): CatalogVariant {
  const where = `${pack}-${size}`;
  const match = SIZE.exec(size);
  if (!match) throw new PackError(`${where}: a size is "<width>x<height>", such as 32x8`);
  const device = readJson(root, source.presets, where);
  if (!isRecord(device)) throw new PackError(`${where}: ${source.presets} isn't a JSON object`);
  const effects = (source.effects ?? []).flatMap(file => readEffects(root, file, where));
  if (!effects.length) throw new PackError(`${where}: no effects`);

  // Every preset the effects play, and every preset those hold on or end on.
  const needed = new Set<number>();
  const queue = effects.map(effect => effect.preset);
  while (queue.length) {
    const id = queue.pop()!;
    if (needed.has(id)) continue;
    if (id < FIRST_PRESET || id > LAST_PRESET) throw new PackError(`${where}: preset ${id} is outside 1–250`);
    const preset = device[String(id)];
    if (!isRecord(preset) || !Object.keys(preset).length) throw new PackError(`${where}: preset ${id} is missing from ${source.presets}`);
    needed.add(id);
    queue.push(...references(preset, where, id));
  }

  const presets: Record<string, Record<string, unknown>> = {};
  const names = new Map<string, number>();
  const fx: Record<string, string> = {};
  const gifNames = new Set<string>();
  for (const id of [ ...needed ].sort((a, b) => a - b)) {
    const preset = device[String(id)] as Record<string, unknown>;
    const name = preset.n;
    if (typeof name !== "string" || !name.trim()) throw new PackError(`${where}: preset ${id} has no name, and an install finds a pack's presets by name`);
    if (names.has(name)) throw new PackError(`${where}: presets ${names.get(name)} and ${id} are both named "${name}"`);
    names.set(name, id);
    for (const segment of segmentsOf(preset)) {
      if (segment.fx === undefined) continue;
      const known = KNOWN_FX[String(segment.fx)];
      if (typeof segment.fx !== "number" || !known) throw new PackError(`${where}: preset ${id} uses effect ${String(segment.fx)}, which has no WLED name here (KNOWN_FX in scripts/lib/wled-packs.ts)`);
      fx[String(segment.fx)] = known;
      if (known !== "Image") continue;
      if (typeof segment.n !== "string" || !GIF_NAME.test(segment.n)) {
        throw new PackError(`${where}: preset ${id} plays "${String(segment.n)}", but a GIF's name is up to 30 characters of a–z, 0–9, _, . and -, ending in .gif`);
      }
      gifNames.add(segment.n);
    }
    presets[String(id)] = JSON.parse(JSON.stringify(preset));
  }

  const files: { name: string; bytes: number }[] = [];
  const hashes: string[] = [];
  for (const name of [ ...gifNames ].sort()) {
    const bytes = findGif(root, source.gifs ?? [], name, where);
    const known = gifs.get(name);
    if (known && !known.equals(bytes)) throw new PackError(`${where}: ${name} differs from the GIF of that name in another pack, and a WLED keeps one file by a name`);
    gifs.set(name, bytes);
    files.push({ name, bytes: bytes.length });
    hashes.push(`${name}:${sha256(bytes)}`);
  }
  const version = sha256(Buffer.from(JSON.stringify({ presets, effects, gifs: hashes }))).slice(0, 12);
  return { format: 1, pack, size, width: Number(match[1]), height: Number(match[2]), version, fx, presets, effects, gifs: files };
}

/** The presets `preset` holds on or ends on: its playlist's entries and end, and a top-level `ps`. An end of 0 is none. */
function references(preset: Record<string, unknown>, where: string, id: number): number[] {
  const found: number[] = [];
  const playlist = preset.playlist;
  if (isRecord(playlist)) {
    if (playlist.ps !== undefined && !Array.isArray(playlist.ps)) throw new PackError(`${where}: preset ${id}'s playlist has no list of presets`);
    for (const entry of (playlist.ps as unknown[] | undefined) ?? []) found.push(presetNumber(entry, where, id));
    if (playlist.end !== undefined && playlist.end !== 0) found.push(presetNumber(playlist.end, where, id));
  }
  if (preset.ps !== undefined) found.push(presetNumber(preset.ps, where, id));
  return found;
}

function presetNumber(value: unknown, where: string, id: number): number {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  throw new PackError(`${where}: preset ${id} names "${String(value)}", which isn't a preset number`);
}

function segmentsOf(preset: Record<string, unknown>): Record<string, unknown>[] {
  const segments = Array.isArray(preset.seg) ? preset.seg : isRecord(preset.seg) ? [ preset.seg ] : [];
  return segments.filter(isRecord);
}

/** A CSV file's PRESET lines as effects: the address is the device's, so it is left out. */
function readEffects(root: string, file: string, where: string): CatalogEffect[] {
  return readText(root, file, where).split(/\r?\n/).map(line => line.trim()).filter(Boolean).map((line) => {
    // As the settings' CSV import reads a line: fields split by semicolons, empty ones dropped.
    const [ name, type, , preset, ...triggers ] = line.split(";").map(field => field.trim()).filter(Boolean);
    if (type !== "PRESET" || !name || !/^\d+$/.test(preset ?? "")) throw new PackError(`${where}: ${file}: "${line}" isn't a PRESET line (name;PRESET;address;preset;trigger;…)`);
    return { name, preset: Number(preset), triggers };
  });
}

function findGif(root: string, folders: string[], name: string, where: string): Buffer {
  let found: Buffer | undefined;
  for (const folder of folders) {
    const file = path.join(root, folder, name);
    if (!existsSync(file)) continue;
    const bytes = readFileSync(file);
    if (found && !found.equals(bytes)) throw new PackError(`${where}: ${name} is in two of its folders with different bytes`);
    found ??= bytes;
  }
  if (!found) throw new PackError(`${where}: ${name} isn't in ${folders.join(", ") || "any folder"}`);
  if (found.subarray(0, 3).toString("latin1") !== "GIF") throw new PackError(`${where}: ${name} isn't a GIF`);
  return found;
}

function checkMeanings(meanings: Map<string, Map<string, { json: string; file: string }>>, variant: CatalogVariant, file: string): void {
  const known = meanings.get(variant.size) ?? new Map<string, { json: string; file: string }>();
  meanings.set(variant.size, known);
  for (const preset of Object.values(variant.presets)) {
    const name = String(preset.n);
    const json = JSON.stringify(preset);
    const before = known.get(name);
    if (before && before.json !== json) throw new PackError(`${file}: "${name}" differs from the preset of the same name in ${before.file}, and an install would overwrite one with the other`);
    if (!before) known.set(name, { json, file });
  }
}

function texts(value: unknown, where: string): Texts {
  if (!isRecord(value)) throw new PackError(`${where}: missing`);
  for (const language of LANGUAGES) {
    const text = value[language];
    if (typeof text !== "string" || !text.trim()) throw new PackError(`${where}: no ${language} text`);
  }
  return Object.fromEntries(LANGUAGES.map(language => [ language, String(value[language]).trim() ])) as Texts;
}

function readJson(root: string, file: string, where: string): unknown {
  try {
    return JSON.parse(readText(root, file, where));
  } catch (error) {
    if (error instanceof PackError) throw error;
    throw new PackError(`${where}: ${file} isn't JSON`);
  }
}

function readText(root: string, file: string, where: string): string {
  const full = path.join(root, file);
  if (!existsSync(full)) throw new PackError(`${where}: ${file} isn't there`);
  return readFileSync(full, "utf8");
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function isRecord(value: unknown): value is Record<string, any> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

