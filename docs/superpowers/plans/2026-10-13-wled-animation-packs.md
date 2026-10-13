# WLED animation packs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A catalog of ready-made WLED animation packs (Standard and Halloween, each for 32 × 8 and 64 × 8 matrices) that a user adds with one button: Tools puts the pack's GIFs and presets on their WLED and adds its effects as an effect set.

**Architecture:**
- **Build:** A build script turns wled-project's folders into a catalog under `public/wled-packs/` (an index, one JSON per pack and size, the GIFs), which ships with the extension.
- **Pure logic:** `utils/wled-packs.ts` plans the preset numbers on a device, writes WLED's `presets.json` layout, checks room, and makes and merges the effect sets.
- **Install:** `utils/wled-pack-install.ts` runs the install over an injected device I/O. In the browser that I/O is the background: the existing fetch relay for reads, and a new `wled:upload` message for uploads.
- **UI:** A nested dialog in the WLED settings offers the packs, with previews drawn by the existing LED painter.

**Tech Stack:** TypeScript, Vue 3 `<script setup>`, WXT, VueUse (auto-imported), node:test under tsx for tests (the repo has no test runner: tests live in the session scratchpad and run with `node_modules/.bin/tsx`, the repo as cwd).

**Spec:** `docs/superpowers/specs/2026-10-13-wled-animation-packs-design.md`

`$SCR` is this session's scratchpad: `/private/tmp/claude-501/-Volumes-WD-BLACK-PROJECTS-Autodarts-autodarts-tools-wxt/9d361d25-9430-4b90-996c-d24a3727e17d/scratchpad`. `$REPO` is `/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt`. `$SOURCE` is `/Volumes/WD_BLACK/PROJECTS/wled-project/animations` (read only: never write there).

## Global Constraints

- **No new manifest permissions and no manifest change at all.**
  - Device reads go through `backgroundFetch` (utils/helpers.ts).
  - Uploads go through the new background message `wled:upload`.
  - Catalog files are read through `backgroundFetch` of `browser.runtime.getURL(...)`, so nothing joins `web_accessible_resources`.
- **Never overwrite or delete a user's preset.**
  - A pack preset reuses a device number only when the device preset there has the same name.
  - Otherwise it takes its own number if free, else free numbers from 250 down. `{}` counts as free; `"0"` and keys beyond 250 are kept as they are.
  - References renumbered: playlist `ps`, playlist `end` (0 means none), and a numeric top-level `ps`.
- **The `presets.json` layout is WLED's own:** `{"0":…` then each other preset on its own line, each line starting with `,`, in number order. Built as `"{" + lines.join("\n,") + "}"`.
- **Room, as wled-project's `install.py`:**
  - block 4096 bytes; free = `(fs.t − fs.u) × 1000 − 999`;
  - GIFs take their blocks less those of the files they replace;
  - `tightest = after GIFs − blocks(new presets.json) × 4096` must be ≥ 4096;
  - after everything, ≥ new `presets.json` + 9000 + 4096 must stay free.
- **Timeouts:** `/json/info` 4000 ms, `/json/eff` and `/presets.json` 15 000 ms, `/edit?func=list` 8000 ms, a GIF upload 20 000 ms, a `presets.json` upload 30 000 ms.
- **Effects are matched by WLED name:** packs carry `fx` as `{"53":"Image","77":"Copy Segment"}` (WLED 16 ids), and the install maps them to the device's ids from `/json/eff`.
- **The catalog lives in `public/wled-packs/`:** `index.json`, `<pack>-<size>.json`, `gifs/<name>.gif`. Format `1`. `version` = first 12 hex digits of SHA-256 over the variant's presets, effects and GIF hashes. Size keys are `"<width>x<height>"`; size labels `"32 × 8"` (`×` U+00D7 between spaces).
- **Texts:**
  - Every visible string comes from `t()` (or AppTrans) in `locales/{en,de,nl}/wled.ts` under `wled.packs` and `wled.add.packs`. German says *du* and *dein WLED-Gerät*; Dutch says *je* and *je WLED-apparaat*.
  - Pack names and descriptions are data in the catalog (en/de/nl), and the dialog falls back to English.
  - *Use this set* is the existing `library.sets.use`.
  - Brand names Discord and GitHub may stay literal (they are in `locales/untranslated.json`).
- **Code conventions:**
  - Vue SFC order per CLAUDE.md: imports, constants, refs, computed, lifecycle/watch, methods.
  - No manual imports of auto-imported Vue, VueUse or WXT APIs or of local composables in components.
  - New `adt-*` global classes are avoided: style with Tailwind utilities.
- **Links:** Discord `https://discord.gg/autodarts`, GitHub `https://github.com/creazy231/tools-for-autodarts/issues/new`, email `mailto:info@tobias-thiele.de`.
- **Git:** commit on branch `feat/wled-animation-packs`. End every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never push.

## Review Focus

1. **The address typed in other forms:**
   - the forms: `192.168.0.227`, `http://192.168.0.227/`, `wled.local:8080`, `https://…/json`;
   - expected: the effects store the origin (`http://192.168.0.227`, `http://wled.local:8080`) and every request goes to that origin's paths;
   - pinned by: Task 3 (`packEffects` with a port), Task 6 (`deviceIo` paths).
2. **A second install of the same pack:**
   - the cases: the same pack again, from a second browser, or after `install.py`;
   - expected: no preset moves and no duplicates on the device; the set is updated, not doubled;
   - pinned by: Task 2 (device already holding the pack: all kept), Task 3 (`updatePackSet` keeps on/off), Task 4 (install twice gives the same `presets.json`).
3. **A connection that drops halfway:**
   - expected: GIFs left behind are harmless, `presets.json` is either the new one or the old one again, and a retry finishes;
   - pinned by: Task 4 (GIF 10 fails then retry succeeds; truncated `presets.json` restored; restore failing hands back the backup).
4. **A device the user filled themselves:**
   - the content: presets on the pack's numbers, duplicates of a pack name, `{}` slots, keys beyond 250, a non-empty `"0"`;
   - expected: all of it survives byte for byte in meaning;
   - pinned by: Task 2 planner tests.
5. **Another tab writing the settings while an install runs:**
   - expected: the pack's set is added to the config as stored at the end, not to a copy from before the install's awaits;
   - pinned by: Task 3 (the set functions take the section they are given and never mutate it), Task 9 (`storeSet` reads `config.value.wledFx` after `installPack` resolves; checked in review), Task 11 (live run with a write from the service worker during an upload).

---

## File Structure

| File | Responsibility |
|---|---|
| `scripts/lib/wled-packs.ts` (new) | Build the catalog from sources: CSV parsing, preset closure, GIF lookup, validation, versions, writing. Node only. |
| `scripts/wled-packs.ts` (new) | CLI `yarn wled:packs <folder>`. |
| `scripts/wled-packs.json` (new) | The source list: packs, their texts in en/de/nl, per size the presets file, CSVs, GIF folders and cover. |
| `public/wled-packs/**` (generated) | The shipped catalog. |
| `utils/wled-packs.ts` (new) | Pure: catalog types, size helpers, device summary, effect ids by name, the install plan, the presets file, room, the effect sets. |
| `utils/wled-pack-install.ts` (new) | The install sequence over `DeviceIo`, its progress and failures, and the dialog's `InstallState`. |
| `utils/wled-upload.ts` (new) | The background's `wled:upload`: one file POSTed to the device's `/upload`. |
| `entrypoints/background.ts` | Route `wled:upload`. |
| `utils/wled-pack-catalog.ts` (new) | Browser layer: catalog files and GIFs through the relay, pack previews, the device I/O and probe. |
| `utils/storage.ts` | `IWledSet` gains an optional `pack`. |
| `composables/useLedCanvas.ts` (new) | The LED painting and animation loop, shared by both preview components. |
| `components/Settings/Wled/PresetPreview.vue` | Uses `useLedCanvas`. |
| `components/Settings/Wled/PackPreview.vue` (new) | A pack preset drawn as LEDs: a card's cover or a list row. |
| `components/Settings/Wled/PackCard.vue` (new) | One pack: cover, texts, size choice, fit, Add/Update, its animations. |
| `components/Settings/Wled/PackInstall.vue` (new) | The install view's body: summary, progress, outcome. |
| `components/Settings/Wled/PacksDialog.vue` (new) | The dialog: address and probe, cards, install flow, writing the set, other-sizes note. |
| `components/Settings/Wled.vue` | The section, the Add menu entry, the empty-list button, the dialog. |
| `locales/{en,de,nl}/wled.ts`, `locales/same-as-english.json` | Texts. |
| `package.json`, `scripts/README.md`, `README.md`, `CHANGELOG.md` | Script and docs. |

---

### Task 1: The pack catalog and its build script

**Files:**
- Create: `scripts/lib/wled-packs.ts`, `scripts/wled-packs.ts`, `scripts/wled-packs.json`
- Modify: `package.json` (scripts), `scripts/README.md` (new section at the end)
- Generate: `public/wled-packs/` (by running the script)
- Test: `$SCR/tests/packs-build.test.mts`

**Interfaces:**
- Produces: `public/wled-packs/index.json` with the shape:
  - `{ format: 1, packs: [{ id, name: {en,de,nl}, description: {en,de,nl}, sizes: [{ size, width, height, file, version, effects, presets, gifs, bytes, cover }] }] }`
- Produces: `public/wled-packs/<pack>-<size>.json` with the shape:
  - `{ format: 1, pack, size, width, height, version, fx: Record<string,string>, presets: Record<string, object>, effects: [{ name, preset, triggers }], gifs: [{ name, bytes }] }`
- Produces: `public/wled-packs/gifs/<name>.gif`.
- Produces: `buildCatalog(sources: SourceList, root: string): Catalog`, `writeCatalog(catalog: Catalog, out: string): void` and `class PackError extends Error` from `scripts/lib/wled-packs.ts`.

- [ ] **Step 1: Write the source list `scripts/wled-packs.json`**

```json
{
  "packs": [
    {
      "id": "standard",
      "name": { "en": "Standard", "de": "Standard", "nl": "Standaard" },
      "description": {
        "en": "The big moments and the small ones: 180s, bull, busts, leg and match wins, Shanghai to Nelson, and the lobby and your board. Many moments come in two looks, picked at random.",
        "de": "Die großen Momente und die kleinen: 180er, Bull, Busts, gewonnene Legs und Matches, von Shanghai bis Nelson, dazu die Lobby und dein Board. Viele Momente gibt es in zwei Varianten, die zufällig wechseln.",
        "nl": "De grote momenten en de kleine: 180's, bull, busts, gewonnen legs en wedstrijden, van Shanghai tot Nelson, plus de lobby en je bord. Veel momenten hebben twee varianten, willekeurig gekozen."
      },
      "sizes": {
        "32x8": {
          "presets": "presets.json",
          "effects": [ "set_1/tools-for-autodarts.csv" ],
          "gifs": [ "set_1/32x8/gifs" ],
          "cover": "AD 180"
        },
        "64x8": {
          "presets": "dual/presets.json",
          "effects": [ "set_1/tools-for-autodarts.csv", "set_1/tools-for-autodarts-wide.csv" ],
          "gifs": [ "set_1/64x8/gifs", "set_1/32x8/gifs" ],
          "cover": "AD W 180"
        }
      }
    },
    {
      "id": "halloween",
      "name": { "en": "Halloween", "de": "Halloween", "nl": "Halloween" },
      "description": {
        "en": "Pumpkins, ghosts and bats for October. Moments without a Halloween animation of their own play the Standard pack's, so nothing goes dark.",
        "de": "Kürbisse, Geister und Fledermäuse für den Oktober. Momente ohne eigene Halloween-Animation zeigen die aus dem Standard-Paket, damit nichts dunkel bleibt.",
        "nl": "Pompoenen, spoken en vleermuizen voor oktober. Momenten zonder eigen Halloween-animatie tonen die uit het Standaard-pakket, zodat er niets donker blijft."
      },
      "sizes": {
        "32x8": {
          "presets": "presets.json",
          "effects": [ "set_halloween/tools-for-autodarts-halloween.csv" ],
          "gifs": [ "set_halloween/32x8/gifs", "set_1/32x8/gifs" ],
          "cover": "AD Halloween Idle"
        },
        "64x8": {
          "presets": "dual/presets.json",
          "effects": [ "set_halloween/tools-for-autodarts-halloween.csv", "set_halloween/tools-for-autodarts-wide-halloween.csv" ],
          "gifs": [ "set_halloween/64x8/gifs", "set_halloween/32x8/gifs", "set_1/64x8/gifs", "set_1/32x8/gifs" ],
          "cover": "AD W HW Idle"
        }
      }
    }
  ]
}
```

- [ ] **Step 2: Write the failing test `$SCR/tests/packs-build.test.mts`**

```ts
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

import { PackError, buildCatalog, writeCatalog } from "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/scripts/lib/wled-packs.ts";

const REPO = "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt";
const SOURCE = "/Volumes/WD_BLACK/PROJECTS/wled-project/animations";
const SCR = "/private/tmp/claude-501/-Volumes-WD-BLACK-PROJECTS-Autodarts-autodarts-tools-wxt/9d361d25-9430-4b90-996c-d24a3727e17d/scratchpad";

const sources = () => JSON.parse(readFileSync(`${REPO}/scripts/wled-packs.json`, "utf8"));

/** A copy of what the sources read, to break on purpose. */
function scratchRoot(): string {
  const root = mkdtempSync(path.join(SCR, "packs-src-"));
  for (const part of [ "presets.json", "dual/presets.json", "set_1", "set_halloween" ]) cpSync(path.join(SOURCE, part), path.join(root, part), { recursive: true });
  return root;
}

function editJson(file: string, edit: (value: any) => void) {
  const value = JSON.parse(readFileSync(file, "utf8"));
  edit(value);
  writeFileSync(file, JSON.stringify(value));
}

function refuses(build: () => unknown, message: RegExp) {
  assert.throws(build, (error: unknown) => error instanceof PackError && message.test(error.message));
}

test("the four variants hold what the sets need", () => {
  const catalog = buildCatalog(sources(), SOURCE);
  const counts = Object.fromEntries(catalog.index.packs.flatMap(pack => pack.sizes.map(size => [ size.file, [ size.effects, size.presets, size.gifs, size.bytes ] ])));
  assert.deepEqual(counts, {
    "standard-32x8.json": [ 68, 72, 71, 180809 ],
    "standard-64x8.json": [ 89, 94, 93, 261822 ],
    "halloween-32x8.json": [ 49, 51, 50, 125029 ],
    "halloween-64x8.json": [ 63, 66, 65, 195643 ],
  });
  assert.equal(catalog.gifs.size, 122);
  assert.deepEqual(catalog.index.packs.map(pack => pack.id), [ "standard", "halloween" ]);
});

test("effects keep the CSV's order, and an opt-in effect keeps no trigger", () => {
  const variant = buildCatalog(sources(), SOURCE).variants.get("standard-32x8.json")!;
  assert.deepEqual(variant.effects[0], { name: "AD Game on", preset: 101, triggers: [ "gameon" ] });
  assert.deepEqual(variant.effects.find(effect => effect.name === "AD Takeout"), { name: "AD Takeout", preset: 103, triggers: [] });
  assert.equal(variant.effects.at(-1)!.name, "AD Champagne breakfast");
});

test("a variant takes the presets its one-shots hold on and end on", () => {
  const catalog = buildCatalog(sources(), SOURCE);
  const halloween = catalog.variants.get("halloween-32x8.json")!;
  assert.deepEqual(halloween.presets["200"], { n: "AD hold" });
  assert.equal(halloween.presets["189"].n, "AD Halloween Leg won afterglow");
  assert.equal((halloween.presets["151"].playlist as any).end, 232);
  assert.equal(catalog.variants.get("standard-64x8.json")!.presets["91"].n, "AD W Leg won afterglow");
});

test("each variant names the effects it uses, and its cover", () => {
  const catalog = buildCatalog(sources(), SOURCE);
  assert.deepEqual(catalog.variants.get("standard-32x8.json")!.fx, { 53: "Image" });
  assert.deepEqual(catalog.variants.get("standard-64x8.json")!.fx, { 53: "Image", 77: "Copy Segment" });
  const covers = Object.fromEntries(catalog.index.packs.flatMap(pack => pack.sizes.map(size => [ size.file, size.cover ])));
  assert.deepEqual(covers, { "standard-32x8.json": 105, "standard-64x8.json": 53, "halloween-32x8.json": 233, "halloween-64x8.json": 78 });
});

test("a build is the same every time", () => {
  const one = mkdtempSync(path.join(SCR, "packs-out-"));
  const two = mkdtempSync(path.join(SCR, "packs-out-"));
  writeCatalog(buildCatalog(sources(), SOURCE), one);
  writeCatalog(buildCatalog(sources(), SOURCE), two);
  const list = (dir: string) => readdirSync(dir, { recursive: true }).map(String).sort();
  assert.deepEqual(list(one), list(two));
  for (const file of list(one).filter(name => name.includes("."))) assert.ok(readFileSync(path.join(one, file)).equals(readFileSync(path.join(two, file))), file);
  rmSync(one, { recursive: true });
  rmSync(two, { recursive: true });
});

test("refuses a GIF that isn't there", () => {
  const root = scratchRoot();
  rmSync(path.join(root, "set_1/32x8/gifs/ad_180.gif"));
  refuses(() => buildCatalog(sources(), root), /ad_180\.gif isn't in/);
});

test("refuses a preset a one-shot holds on that isn't there", () => {
  const root = scratchRoot();
  editJson(path.join(root, "presets.json"), (presets) => {
    delete presets["200"];
  });
  refuses(() => buildCatalog(sources(), root), /preset 200 is missing/);
});

test("refuses two presets of one name in a variant", () => {
  const root = scratchRoot();
  editJson(path.join(root, "presets.json"), (presets) => {
    presets["102"].n = "AD Game on";
  });
  refuses(() => buildCatalog(sources(), root), /both named "AD Game on"/);
});

test("refuses an effect it has no WLED name for", () => {
  const root = scratchRoot();
  editJson(path.join(root, "presets.json"), (presets) => {
    presets["101"].seg[0].fx = 9;
  });
  refuses(() => buildCatalog(sources(), root), /uses effect 9/);
});

test("refuses a GIF name a WLED can't keep", () => {
  const root = scratchRoot();
  editJson(path.join(root, "presets.json"), (presets) => {
    presets["101"].seg[0].n = "ad_a_name_far_too_long_for_littlefs.gif";
  });
  refuses(() => buildCatalog(sources(), root), /up to 30 characters/);
});

test("refuses a missing language", () => {
  const list = sources();
  delete list.packs[0].description.nl;
  refuses(() => buildCatalog(list, SOURCE), /standard: description: no nl text/);
});

test("refuses one name meaning two presets in one size", () => {
  const root = scratchRoot();
  const copy = path.join(root, "presets-other.json");
  cpSync(path.join(root, "presets.json"), copy);
  editJson(copy, (presets) => {
    presets["200"] = { n: "AD hold", on: true };
  });
  const list = sources();
  list.packs[1].sizes["32x8"].presets = "presets-other.json";
  refuses(() => buildCatalog(list, root), /"AD hold" differs from the preset of the same name in standard-32x8\.json/);
});

test("refuses a line that isn't a PRESET line", () => {
  const root = scratchRoot();
  const csv = path.join(root, "set_1/tools-for-autodarts.csv");
  writeFileSync(csv, `${readFileSync(csv, "utf8")}x;URL;http://a;gameon\n`);
  refuses(() => buildCatalog(sources(), root), /isn't a PRESET line/);
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `cd $REPO && node_modules/.bin/tsx $SCR/tests/packs-build.test.mts`
Expected: FAIL — `Cannot find module '…/scripts/lib/wled-packs.ts'`.

- [ ] **Step 4: Write `scripts/lib/wled-packs.ts`**

```ts
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
```

- [ ] **Step 5: Run the test to see it pass**

Run: `cd $REPO && node_modules/.bin/tsx $SCR/tests/packs-build.test.mts`
Expected: PASS, 13 tests, 0 failed.

- [ ] **Step 6: Write the CLI `scripts/wled-packs.ts` and its yarn script**

```ts
/**
 * yarn wled:packs <folder>
 *
 * Builds the WLED animation packs the extension ships, public/wled-packs/, from
 * the sources scripts/wled-packs.json lists, read under <folder>: so far
 * wled-project's animations folder. See scripts/README.md, "WLED animation packs".
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PackError, buildCatalog, writeCatalog } from "./lib/wled-packs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = process.argv[2];

if (!source) {
  console.error("usage: yarn wled:packs <folder with the packs' presets.json files, CSVs and GIFs>");
  process.exit(1);
}

try {
  const sources = JSON.parse(readFileSync(path.join(repo, "scripts/wled-packs.json"), "utf8"));
  const catalog = buildCatalog(sources, path.resolve(source));
  const out = path.join(repo, "public/wled-packs");
  writeCatalog(catalog, out);
  for (const pack of catalog.index.packs) {
    for (const size of pack.sizes) console.log(`${size.file}: ${size.effects} effects, ${size.presets} presets, ${size.gifs} GIFs (${size.bytes} bytes), version ${size.version}`);
  }
  console.log(`${catalog.gifs.size} GIFs in ${path.relative(repo, out)}/gifs`);
} catch (error) {
  if (!(error instanceof PackError)) throw error;
  console.error(`wled:packs: ${error.message}`);
  process.exit(1);
}
```

In `package.json` `scripts`, after `"i18n:site": …`, add:

```json
    "wled:packs": "tsx scripts/wled-packs.ts",
```

- [ ] **Step 7: Generate the catalog**

Run: `cd $REPO && yarn wled:packs /Volumes/WD_BLACK/PROJECTS/wled-project/animations`
Expected output (versions are hashes):
```
standard-32x8.json: 68 effects, 72 presets, 71 GIFs (180809 bytes), version …
standard-64x8.json: 89 effects, 94 presets, 93 GIFs (261822 bytes), version …
halloween-32x8.json: 49 effects, 51 presets, 50 GIFs (125029 bytes), version …
halloween-64x8.json: 63 effects, 66 presets, 65 GIFs (195643 bytes), version …
122 GIFs in public/wled-packs/gifs
```
Then `ls public/wled-packs` shows `gifs halloween-32x8.json halloween-64x8.json index.json standard-32x8.json standard-64x8.json`, and `du -sh public/wled-packs` stays under 1 MB.

- [ ] **Step 8: Document it in `scripts/README.md`**

Append:

```md
## WLED animation packs

`yarn wled:packs <folder>` builds the animation packs the WLED settings offer, `public/wled-packs/`, from the sources listed in `scripts/wled-packs.json`. So far `<folder>` is wled-project's `animations` folder (`/Volumes/WD_BLACK/PROJECTS/wled-project/animations` on the maintainer's Mac). The output is committed, so builds never need the sources.

Each pack in `scripts/wled-packs.json` has an `id`, a `name` and a `description` in English, German and Dutch, and its `sizes`, keyed `<width>x<height>` as WLED's 2D settings put a matrix. Each size names:

- `presets`: the WLED `presets.json` that holds its presets;
- `effects`: Tools CSV files (`name;PRESET;address;preset;trigger;…`). The address is ignored, since a user's own WLED takes its place;
- `gifs`: the folders its GIFs are found in;
- `cover`: the name of the preset the pack's card shows.

The script takes the presets the effects play, and every preset those hold on or end on, and the GIFs their *Image* segments play. It refuses whatever would break an install on a user's WLED:

- a missing preset or GIF;
- a preset without a name, or a name used twice;
- an effect it has no WLED name for (`KNOWN_FX` in `scripts/lib/wled-packs.ts`);
- a GIF name a WLED can't keep;
- two packs of one size that give one preset name two meanings;
- a missing language.

**To add a pack:** add its entry, run the script, check the counts it prints, and commit `scripts/wled-packs.json` with `public/wled-packs/`. A pack's presets are found on a device by their names, so names must be unique across packs of a size (wled-project's start with `AD `).
```

- [ ] **Step 9: Commit**

```bash
cd $REPO && git add scripts/lib/wled-packs.ts scripts/wled-packs.ts scripts/wled-packs.json scripts/README.md package.json public/wled-packs
git commit -m "feat(wled): build the animation packs' catalog from wled-project's sets

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The install plan and the device's files

**Files:**
- Create: `utils/wled-packs.ts`
- Test: `$SCR/tests/setup.mts` (exists: stubs WXT's `storage`), `$SCR/tests/packs-plan.test.mts`

**Interfaces:**
- Consumes: the catalog files from Task 1 (as test fixtures).
- Produces (exports of `utils/wled-packs.ts`):
  - Types: `PackText`, `PackSize`, `PackInfo`, `PackIndex`, `PackEffect`, `PackVariant`, `DeviceSummary`, `InstallPlan`, `Room`.
  - Constants: `PACK_FORMAT = 1`, `FS_BLOCK = 4096`, `PRESET_RESERVE = 9000`.
  - Catalog and device helpers:
    - `packText(text: PackText, language: Language): string`
    - `sizeLabel(size: { width: number; height: number }): string`
    - `sizeFor(pack: PackInfo, layout?: { width: number; height: number }): PackSize | undefined`
    - `isPackIndex(value: unknown): value is PackIndex`, `isPackVariant(value: unknown): value is PackVariant`
    - `deviceSummary(info: unknown): DeviceSummary | undefined`
    - `deviceEffects(fx: Record<string, string>, names: readonly string[]): { ok: true; ids: Record<string, number> } | { ok: false; missing: string }`
  - The plan and the presets file:
    - `planInstall(device: Record<string, unknown>, variant: Pick<PackVariant, "presets">, fxIds?: Record<string, number>): InstallPlan`
    - `presetsFile(presets: Record<string, unknown>): string`, `parsePresets(text: string): Record<string, unknown> | undefined`
    - `samePresets(a: Record<string, unknown>, b: Record<string, unknown>): boolean`
  - Files and room:
    - `fileSizes(listing: unknown): Record<string, number> | undefined`
    - `roomFor(info: unknown, files: Record<string, number> | undefined, gifs: readonly { name: string; bytes: number }[], oldPresets: number, newPresets: number): Room`

- [ ] **Step 1: Write the failing test `$SCR/tests/packs-plan.test.mts`**

```ts
import "./setup.mts";

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { deviceEffects, deviceSummary, fileSizes, packText, parsePresets, planInstall, presetsFile, roomFor, samePresets, sizeFor, sizeLabel } from "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/utils/wled-packs.ts";

const REPO = "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt";
const SOURCE = "/Volumes/WD_BLACK/PROJECTS/wled-project/animations";
const catalogFile = (name: string) => JSON.parse(readFileSync(`${REPO}/public/wled-packs/${name}`, "utf8"));

/** A small pack: a loop, a one-shot that holds on 200 and ends on the loop, and the hold. */
const SMALL = {
  presets: {
    101: { n: "AD Game on", on: true, seg: [ { id: 0, fx: 53, n: "ad_gameon.gif" } ] },
    105: { n: "AD 180", on: true, seg: [ { id: 0, fx: 53, n: "ad_180.gif" } ], playlist: { ps: [ 200 ], dur: [ 31 ], transition: [ 0 ], repeat: 1, end: 101 } },
    200: { n: "AD hold" },
  },
};

test("sizes and texts", () => {
  assert.equal(sizeLabel({ width: 64, height: 8 }), "64 × 8");
  assert.equal(packText({ en: "Standard", de: "Standard", nl: "Standaard" }, "nl"), "Standaard");
  assert.equal(packText({ en: "Standard" }, "de"), "Standard");
  const pack = catalogFile("index.json").packs[0];
  assert.equal(sizeFor(pack, { width: 64, height: 8 })?.size, "64x8");
  assert.equal(sizeFor(pack, { width: 32, height: 16 }), undefined);
  assert.equal(sizeFor(pack, undefined), undefined);
});

test("what answered at an address", () => {
  assert.deepEqual(deviceSummary({ ver: "16.0.1", name: "WLED-Matrix", leds: { count: 512, matrix: { w: 64, h: 8 } }, fs: { u: 588, t: 1400 } }), { name: "WLED-Matrix", version: "16.0.1", layout: { width: 64, height: 8 }, freeKb: 812 });
  assert.deepEqual(deviceSummary({ ver: "0.15.0", name: "Strip", leds: { count: 300 } }), { name: "Strip", version: "0.15.0", layout: { width: 300, height: 1 }, freeKb: undefined });
  assert.equal(deviceSummary({ hello: "world" }), undefined);
  assert.equal(deviceSummary(null), undefined);
});

test("a pack's effects are found on the device by name", () => {
  const names = Array.from({ length: 120 }, (_, id) => `FX ${id}`);
  names[53] = "Image";
  names[77] = "Copy Segment";
  assert.deepEqual(deviceEffects({ 53: "Image", 77: "Copy Segment" }, names), { ok: true, ids: { 53: 53, 77: 77 } });
  const moved = [ ...names ];
  moved[53] = "RSVD";
  moved[60] = "Image";
  assert.deepEqual(deviceEffects({ 53: "Image" }, moved), { ok: true, ids: { 53: 60 } });
  assert.deepEqual(deviceEffects({ 53: "Image", 77: "Copy Segment" }, names.slice(0, 70)), { ok: false, missing: "Copy Segment" });
});

test("on an empty device every preset takes its own number", () => {
  const plan = planInstall({}, SMALL);
  assert.ok(plan.ok);
  assert.deepEqual([ ...plan.slots ], [ [ 101, 101 ], [ 105, 105 ], [ 200, 200 ] ]);
  assert.deepEqual({ kept: plan.kept, added: plan.added, moved: plan.moved }, { kept: 0, added: 3, moved: 0 });
  assert.deepEqual(plan.presets["0"], {});
  assert.deepEqual(plan.presets["105"], SMALL.presets[105]);
});

test("presets already on the device by name stay where they are and are brought up to date", () => {
  const device = { 0: {}, 7: { n: "AD Game on", seg: [ { id: 0, fx: 53, n: "old.gif" } ] }, 8: { n: "AD hold" }, 9: { n: "AD 180" } };
  const plan = planInstall(device, SMALL);
  assert.ok(plan.ok);
  assert.deepEqual([ ...plan.slots ], [ [ 101, 7 ], [ 105, 9 ], [ 200, 8 ] ]);
  assert.deepEqual({ kept: plan.kept, added: plan.added, moved: plan.moved }, { kept: 3, added: 0, moved: 0 });
  assert.equal((plan.presets["7"] as any).seg[0].n, "ad_gameon.gif");
  assert.deepEqual((plan.presets["9"] as any).playlist, { ps: [ 8 ], dur: [ 31 ], transition: [ 0 ], repeat: 1, end: 7 });
  assert.equal(plan.presets["101"], undefined);
});

test("a device that has the pack from wled-project's installer keeps every number", () => {
  const variant = catalogFile("standard-64x8.json");
  const device = JSON.parse(readFileSync(`${SOURCE}/dual/presets.json`, "utf8"));
  const plan = planInstall(device, variant);
  assert.ok(plan.ok);
  assert.equal(plan.kept, Object.keys(variant.presets).length);
  assert.ok([ ...plan.slots ].every(([ from, to ]) => from === to));
  assert.ok(samePresets(plan.presets, device));
});

test("the user's presets on the pack's numbers stay, and the pack moves round them", () => {
  const device = { 0: {}, 1: { n: "Warm white", on: true }, 101: { n: "My red", seg: [ { id: 0, fx: 0, col: [ [ 255, 0, 0 ] ] } ] }, 200: { n: "Movie night" } };
  const plan = planInstall(device, SMALL);
  assert.ok(plan.ok);
  assert.deepEqual([ ...plan.slots ], [ [ 101, 250 ], [ 105, 105 ], [ 200, 249 ] ]);
  assert.deepEqual({ kept: plan.kept, added: plan.added, moved: plan.moved }, { kept: 0, added: 3, moved: 2 });
  assert.deepEqual(plan.presets["1"], device[1]);
  assert.deepEqual(plan.presets["101"], device[101]);
  assert.deepEqual(plan.presets["200"], device[200]);
  assert.equal((plan.presets["250"] as any).n, "AD Game on");
  assert.deepEqual((plan.presets["105"] as any).playlist, { ps: [ 249 ], dur: [ 31 ], transition: [ 0 ], repeat: 1, end: 250 });
  // The pack itself is not changed.
  assert.deepEqual(SMALL.presets[105].playlist, { ps: [ 200 ], dur: [ 31 ], transition: [ 0 ], repeat: 1, end: 101 });
});

test("an emptied slot is free, the lowest of two same-named presets is the pack's, and odd keys are kept", () => {
  const device = { 0: { n: "kept as it is" }, 3: { n: "AD hold" }, 101: {}, 120: { n: "AD hold" }, 251: { n: "beyond" }, note: { n: "not a number" } };
  const plan = planInstall(device, SMALL);
  assert.ok(plan.ok);
  assert.deepEqual([ ...plan.slots ], [ [ 101, 101 ], [ 105, 105 ], [ 200, 3 ] ]);
  assert.deepEqual(plan.presets["0"], { n: "kept as it is" });
  assert.deepEqual(plan.presets["120"], { n: "AD hold" });
  assert.deepEqual(plan.presets["251"], { n: "beyond" });
  assert.deepEqual(plan.presets.note, { n: "not a number" });
});

test("a device without enough free numbers is refused", () => {
  const full = Object.fromEntries(Array.from({ length: 250 }, (_, at) => [ String(at + 1), { n: `Mine ${at + 1}` } ]));
  assert.deepEqual(planInstall(full, SMALL), { ok: false, reason: "no-slots", needed: 3, free: 0 });
  delete full["17"];
  delete full["18"];
  assert.deepEqual(planInstall(full, SMALL), { ok: false, reason: "no-slots", needed: 3, free: 2 });
});

test("effect ids follow the device", () => {
  const plan = planInstall({}, SMALL, { 53: 60 });
  assert.ok(plan.ok);
  assert.equal((plan.presets["101"] as any).seg[0].fx, 60);
  assert.equal(SMALL.presets[101].seg[0].fx, 53);
});

test("presets.json in WLED's own layout", () => {
  for (const file of [ "presets.json", "dual/presets.json" ]) {
    const text = readFileSync(`${SOURCE}/${file}`, "utf8");
    assert.equal(presetsFile(JSON.parse(text)), text.trimEnd(), file);
  }
  assert.equal(presetsFile({ 2: { n: "b" }, 1: { n: "a" } }), "{\"0\":{}\n,\"1\":{\"n\":\"a\"}\n,\"2\":{\"n\":\"b\"}}");
});

test("reading presets.json", () => {
  assert.deepEqual(parsePresets(""), {});
  assert.deepEqual(parsePresets("  \n"), {});
  assert.deepEqual(parsePresets("{\"0\":{}}"), { 0: {} });
  assert.equal(parsePresets("[]"), undefined);
  assert.equal(parsePresets("{\"0\":{}\n,\"1\":"), undefined);
  assert.ok(samePresets({ 0: {}, 1: { n: "a", on: true } }, { 1: { on: true, n: "a" } }));
  assert.ok(!samePresets({ 1: { n: "a" } }, { 1: { n: "b" } }));
  assert.ok(!samePresets({ 0: { n: "x" } }, {}));
});

test("the device's files", () => {
  assert.deepEqual(fileSizes([ { name: "presets.json", type: "file", size: 56521 }, { name: "/ad_180.gif", type: "file", size: 4378 }, { name: "x" } ]), { "/presets.json": 56521, "/ad_180.gif": 4378 });
  assert.equal(fileSizes(null), undefined);
  assert.equal(fileSizes("<html>"), undefined);
});

test("room, as wled-project's installer counts it", () => {
  const gifs = [ { name: "a.gif", bytes: 5000 } ];
  // 100 kB free: the GIF takes 2 blocks, presets.json grows from 5 blocks to 8, and 43,096 bytes must stay free.
  assert.deepEqual(roomFor({ fs: { t: 1000, u: 900 } }, { "/presets.json": 20000 }, gifs, 20000, 30000), { ok: true });
  // 40 kB free: not enough.
  assert.deepEqual(roomFor({ fs: { t: 1000, u: 960 } }, { "/presets.json": 20000 }, gifs, 20000, 30000), { ok: false, neededKb: 64, freeKb: 39 });
  // A GIF already there costs only its growth.
  assert.deepEqual(roomFor({ fs: { t: 1000, u: 950 } }, { "/presets.json": 30000, "/a.gif": 5000 }, gifs, 30000, 30000), { ok: true });
  // Without a listing, every GIF counts whole, and presets.json's old size is the one read: the same device is short.
  assert.deepEqual(roomFor({ fs: { t: 1000, u: 950 } }, undefined, gifs, 30000, 30000), { ok: false, neededKb: 52, freeKb: 49 });
  // A WLED that doesn't say isn't checked.
  assert.deepEqual(roomFor({}, undefined, gifs, 0, 30000), { ok: true });
});
```

The arithmetic behind the room cases (keep = 30,000 + 9,000 + 4,096 = 43,096 throughout):
- **Case 1 (ok):** free 99,001; after the GIF (2 blocks) 90,809; tightest 90,809 − 32,768 = 58,041; presets.json grows from 5 to 8 blocks, so after 78,521 ≥ 43,096.
- **Case 2 (refused):** free 39,001; after the GIF 30,809; tightest −1,959; after 18,521. Needed max(39,001 − 18,521 + 43,096, 39,001 + 1,959 + 4,096) = 63,576, which is 64 kB.
- **Case 3 (ok):** free 49,001; the GIF replaces one of its size (0); tightest 49,001 − 32,768 = 16,233; presets.json the same size, so after 49,001 ≥ 43,096.
- **Case 4 (refused):** the same without a listing. After the GIF 49,001 − 8,192 = 40,809 < 43,096; tightest 8,041. Needed max(49,001 − 40,809 + 43,096, 49,001 − 8,041 + 4,096) = 51,288, which is 52 kB, with 49 kB free.

- [ ] **Step 2: Run it to see it fail**

Run: `cd $REPO && node_modules/.bin/tsx $SCR/tests/packs-plan.test.mts`
Expected: FAIL — `Cannot find module '…/utils/wled-packs.ts'`.

- [ ] **Step 3: Write `utils/wled-packs.ts`**

```ts
import type { Language } from "@/utils/i18n/site-language";
import type { Layout } from "@/utils/wled-preview";

import { canonicalJson } from "@/utils/canonical-json";
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

/** The catalog format this version reads. */
export const PACK_FORMAT = 1;

/** LittleFS keeps a file in whole blocks of this many bytes. */
export const FS_BLOCK = 4096;

/** WLED saves a preset only while presets.json and this many bytes more are free (wled00/file.cpp). */
export const PRESET_RESERVE = 9000;

/** WLED keeps presets 1 to 250. */
const PRESETS = { first: 1, last: 250 };

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
 * 3. the rest take free numbers from 250 down, away from the low numbers people
 *    save their own presets at.
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

  let free = 0;
  for (let number = PRESETS.first; number <= PRESETS.last; number++) if (!used.has(number)) free++;
  const needed = ids.length - kept;
  if (needed > free) return { ok: false, reason: "no-slots", needed, free };

  for (const id of ids) {
    if (slots.has(id) || used.has(id) || taken.has(id) || id < PRESETS.first || id > PRESETS.last) continue;
    slots.set(id, id);
    taken.add(id);
  }
  let moved = 0;
  let next = PRESETS.last;
  for (const id of ids) {
    if (slots.has(id)) continue;
    while (used.has(next) || taken.has(next)) next--;
    slots.set(id, next);
    taken.add(next);
    moved++;
  }

  const presets: Record<string, unknown> = { ...device };
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
```

- [ ] **Step 4: Run the test to see it pass**

Run: `cd $REPO && node_modules/.bin/tsx $SCR/tests/packs-plan.test.mts`
Expected: PASS, 14 tests.

- [ ] **Step 5: Commit**

```bash
cd $REPO && git add utils/wled-packs.ts
git commit -m "feat(wled): plan where a pack's presets go on a device, without touching the user's own

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: A pack's effect set in Tools

**Files:**
- Modify: `utils/storage.ts` (the `IWledSet` type, ~line 502–506)
- Modify: `utils/wled-packs.ts` (imports; append functions)
- Test: `$SCR/tests/packs-sets.test.mts`

**Interfaces:**
- Consumes: `addLibrarySet`, `activateLibrarySet`, `listLibrarySets`, `librarySetNameTaken` from `utils/library-sets.ts`; `IWled`, `IWledSet`, `IConfig`, `WledType` from `utils/storage.ts`.
- Produces:
  - In `utils/storage.ts`: `interface IWledSetPack { id: string; size: string; version: string }`; `IWledSet = LibrarySet<"effects", IWled> & { pack?: IWledSetPack }`.
  - In `utils/wled-packs.ts`, effects and names:
    - `packEffects(variant: Pick<PackVariant, "effects">, slots: ReadonlyMap<number, number>, address: string): IWled[]`
    - `mergePackEffects(current: readonly IWled[], fresh: readonly IWled[]): IWled[]`
    - `packSetName(name: string, size: string, sets: readonly { id: string; name: string }[], defaultName: string): string`
  - In `utils/wled-packs.ts`, the set itself:
    - `findPackSet(section: { sets?: IWledSet[] }, pack: string, size: string): IWledSet | undefined`
    - `addPackSet(section: WledFx, name: string, pack: IWledSetPack, effects: IWled[]): { section: WledFx; id: string; inUse: boolean }`
    - `updatePackSet(section: WledFx, id: string, pack: IWledSetPack, effects: IWled[]): WledFx`
    - where `WledFx = IConfig["wledFx"]`.

- [ ] **Step 1: Write the failing test `$SCR/tests/packs-sets.test.mts`**

```ts
import "./setup.mts";

import assert from "node:assert/strict";
import { test } from "node:test";

import { addPackSet, findPackSet, mergePackEffects, packEffects, packSetName, updatePackSet } from "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/utils/wled-packs.ts";

const effect = (name: string, preset: string, triggers: string[], enabled = true) => ({ name, type: "PRESET", url: "http://192.168.0.227", preset, json_api: "", enabled, triggers }) as any;
const PACK = { id: "halloween", size: "64x8", version: "abc123def456" };

test("a pack's effects play the presets where the plan put them, on the device's address", () => {
  const variant = { effects: [ { name: "AD Game on", preset: 101, triggers: [ "gameon" ] }, { name: "AD Takeout", preset: 103, triggers: [] } ] };
  const effects = packEffects(variant, new Map([ [ 101, 250 ], [ 103, 103 ] ]), "http://wled.local:8080");
  assert.deepEqual(effects, [
    { name: "AD Game on", type: "PRESET", url: "http://wled.local:8080", preset: "250", json_api: "", enabled: true, triggers: [ "gameon" ] },
    { name: "AD Takeout", type: "PRESET", url: "http://wled.local:8080", preset: "103", json_api: "", enabled: true, triggers: [] },
  ]);
  assert.notEqual(effects[0].triggers, variant.effects[0].triggers);
});

test("an update keeps each effect's on/off and the user's own effects", () => {
  const current = [ effect("AD 180", "105", [ "180" ], false), effect("Mine", "3", [ "t20" ]), effect("AD Old one", "140", [ "26" ]) ];
  const fresh = [ effect("AD Game on", "101", [ "gameon" ]), effect("AD 180", "105", [ "180", "t20_t20_t20" ]) ];
  assert.deepEqual(mergePackEffects(current, fresh), [
    effect("AD Game on", "101", [ "gameon" ]),
    effect("AD 180", "105", [ "180", "t20_t20_t20" ], false),
    effect("Mine", "3", [ "t20" ]),
    effect("AD Old one", "140", [ "26" ]),
  ]);
});

test("a new set's name: the pack's, then with its size, then numbered", () => {
  assert.equal(packSetName("Halloween", "64 × 8", [ { id: "default", name: "" } ], "Default"), "Halloween");
  assert.equal(packSetName("Halloween", "64 × 8", [ { id: "a", name: "halloween " } ], "Default"), "Halloween (64 × 8)");
  assert.equal(packSetName("Halloween", "64 × 8", [ { id: "a", name: "Halloween" }, { id: "b", name: "Halloween (64 × 8)" } ], "Default"), "Halloween (64 × 8) 2");
  assert.equal(packSetName("Default", "32 × 8", [ { id: "default", name: "" } ], "Default"), "Default (32 × 8)");
});

test("a pack's set is added beside the set in use, which goes on playing", () => {
  const section = { enabled: true, onlyOnce: true, effects: [ effect("Mine", "3", [ "t20" ]) ] } as any;
  const before = JSON.stringify(section);
  const added = addPackSet(section, "Halloween", PACK, [ effect("AD Game on", "101", [ "gameon" ]) ]);
  assert.equal(JSON.stringify(section), before);
  assert.equal(added.inUse, false);
  assert.equal(added.section.activeSet, "default");
  assert.deepEqual(added.section.effects, section.effects);
  const set = added.section.sets.find((candidate: any) => candidate.id === added.id);
  assert.deepEqual(set, { id: added.id, name: "Halloween", effects: [ effect("AD Game on", "101", [ "gameon" ]) ], pack: PACK });
  assert.equal(findPackSet(added.section, "halloween", "64x8")?.id, added.id);
  assert.equal(findPackSet(added.section, "halloween", "32x8"), undefined);
});

test("a pack's set plays at once when the set in use has no effects", () => {
  const section = { enabled: true, onlyOnce: true, effects: [] } as any;
  const added = addPackSet(section, "Standard", { ...PACK, id: "standard" }, [ effect("AD Game on", "101", [ "gameon" ]) ]);
  assert.equal(added.inUse, true);
  assert.equal(added.section.activeSet, added.id);
  assert.deepEqual(added.section.effects, [ effect("AD Game on", "101", [ "gameon" ]) ]);
  assert.deepEqual(added.section.sets.find((set: any) => set.id === "default"), { id: "default", name: "", effects: [] });
  assert.deepEqual(added.section.sets.find((set: any) => set.id === added.id), { id: added.id, name: "Standard", pack: { ...PACK, id: "standard" } });
});

test("updating a pack's set, in use or not", () => {
  const waiting = addPackSet({ effects: [ effect("Mine", "3", [ "t20" ]) ] } as any, "Halloween", PACK, [ effect("AD 180", "105", [ "180" ], true) ]);
  const newer = { ...PACK, version: "fff000fff000" };
  const updated = updatePackSet(waiting.section, waiting.id, newer, [ effect("AD 180", "105", [ "180", "t20_t20_t20" ]), effect("AD Bust", "114", [ "busted" ]) ]);
  const set = updated.sets!.find((candidate: any) => candidate.id === waiting.id) as any;
  assert.deepEqual(set.pack, newer);
  assert.deepEqual(set.effects.map((item: any) => item.name), [ "AD 180", "AD Bust" ]);
  assert.deepEqual(updated.effects, [ effect("Mine", "3", [ "t20" ]) ]);

  const playing = addPackSet({ effects: [] } as any, "Halloween", PACK, [ effect("AD 180", "105", [ "180" ], false) ]);
  const refreshed = updatePackSet(playing.section, playing.id, newer, [ effect("AD 180", "105", [ "180" ]) ]);
  assert.deepEqual(refreshed.effects, [ effect("AD 180", "105", [ "180" ], false) ]);
  assert.deepEqual((refreshed.sets!.find((candidate: any) => candidate.id === playing.id) as any).pack, newer);
  assert.equal(updatePackSet(playing.section, "gone", newer, []), playing.section);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd $REPO && node_modules/.bin/tsx $SCR/tests/packs-sets.test.mts`
Expected: FAIL — `addPackSet` (and the others) are not exported.

- [ ] **Step 3: Give `IWledSet` its pack in `utils/storage.ts`**

Replace:

```ts
/**
 * A list of WLED effects kept for an occasion, such as Halloween. One set is in
 * use at a time, and its effects are `wledFx.effects`: see utils/library-sets.ts.
 */
export type IWledSet = LibrarySet<"effects", IWled>;
```

with:

```ts
/**
 * A list of WLED effects kept for an occasion, such as Halloween. One set is in
 * use at a time, and its effects are `wledFx.effects`: see utils/library-sets.ts.
 * A set added from an animation pack remembers which (utils/wled-packs.ts).
 */
export type IWledSet = LibrarySet<"effects", IWled> & { pack?: IWledSetPack };

/** The animation pack a set was added from: its id, its size ("64x8") and the version added, to offer an update. */
export interface IWledSetPack {
  id: string;
  size: string;
  version: string;
}
```

- [ ] **Step 4: Add the set functions to `utils/wled-packs.ts`**

In the import block, add (keeping the groups: type imports first, then values):

```ts
import type { IConfig, IWled, IWledSet, IWledSetPack } from "@/utils/storage";

import { activateLibrarySet, addLibrarySet, librarySetNameTaken, listLibrarySets } from "@/utils/library-sets";
import { WledType } from "@/utils/storage";
```

After the `Room` type, add:

```ts
/** WLED's settings, whose effects come in sets. */
type WledFx = IConfig["wledFx"];
```

Append before the private helpers (`renumbered` …):

```ts
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
```

- [ ] **Step 5: Run both pure tests to see them pass**

Run: `cd $REPO && node_modules/.bin/tsx $SCR/tests/packs-sets.test.mts && node_modules/.bin/tsx $SCR/tests/packs-plan.test.mts`
Expected: PASS (6 and 14 tests).

- [ ] **Step 6: Commit**

```bash
cd $REPO && git add utils/storage.ts utils/wled-packs.ts
git commit -m "feat(wled): a pack's effects become an effect set that remembers its pack

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Putting a pack on a device

**Files:**
- Create: `utils/wled-pack-install.ts`
- Test: `$SCR/tests/packs-install.test.mts`

**Interfaces:**
- Consumes: `deviceEffects`, `fileSizes`, `parsePresets`, `planInstall`, `presetsFile`, `roomFor`, `samePresets`, `PackVariant` (Task 2); `layoutOf` (utils/wled-preview.ts).
- Produces:
  - The device I/O: `interface DeviceIo { read(path: string, timeoutMs: number): Promise<Uint8Array | null | undefined>; upload(name: string, file: { gif: string } | { text: string }, timeoutMs: number): Promise<{ ok: boolean; status?: number }> }`
  - Progress: `type InstallStep = "read" | "upload" | "save" | "check"`; `interface InstallProgress { step: InstallStep; done: number; total: number }`, where `total = gifs + 2` and the upload of GIF *i* (0-based) reports `done = i`.
  - `type InstallFailure`, one of:
    - `{ reason: "unreachable" }`, `{ reason: "not-wled" }`, `{ reason: "not-matrix" }`
    - `{ reason: "effect-missing"; effect: string }`
    - `{ reason: "presets-unreadable" }`
    - `{ reason: "no-slots"; needed: number; free: number }`, `{ reason: "no-room"; neededKb: number; freeKb: number }`
    - `{ reason: "locked" }`, `{ reason: "upload-failed"; file: string; status?: number }`
    - `{ reason: "restored" }`, `{ reason: "not-restored"; backup: string }`
    - `{ reason: "pack-unreadable" }` (the dialog's own; `installPack` never returns it)
  - `type InstallResult = { ok: true; slots: Map<number, number>; kept: number; added: number; moved: number } | ({ ok: false } & InstallFailure)`
  - `type InstallState`, one of `{ phase: "confirm" }`, `{ phase: "running"; progress: InstallProgress }`, `{ phase: "done"; set: string; count: number; inUse: boolean; playing: string }`, `{ phase: "failed"; failure: InstallFailure }`
  - `installPack(io: DeviceIo, variant: PackVariant, onProgress?: (progress: InstallProgress) => void): Promise<InstallResult>`

- [ ] **Step 1: Write the failing test `$SCR/tests/packs-install.test.mts`**

```ts
import "./setup.mts";

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { installPack } from "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/utils/wled-pack-install.ts";
import { parsePresets, presetsFile, samePresets } from "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/utils/wled-packs.ts";

const REPO = "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt";
const VARIANT = JSON.parse(readFileSync(`${REPO}/public/wled-packs/standard-32x8.json`, "utf8"));
const encode = (text: string) => new TextEncoder().encode(text);
const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

function wled16Effects(): string[] {
  const names = Array.from({ length: 120 }, (_, id) => `FX ${id}`);
  names[0] = "Solid";
  names[53] = "Image";
  names[77] = "Copy Segment";
  return names;
}

type Hook = (name: string, attempt: number, file: { gif: string } | { text: string }) => { ok: boolean; status?: number } | undefined;

/** A WLED 16 as the install sees it: files by name, its info, its effects; what it was asked, in order. */
class FakeWled {
  files = new Map<string, Uint8Array>();
  info: unknown = { ver: "16.0.1", name: "Test", leds: { count: 256, matrix: { w: 32, h: 8 } }, fs: { u: 200, t: 1400 } };
  effects: unknown = wled16Effects();
  listing = true;
  locked = false;
  answers = true;
  hook?: Hook;
  log: string[] = [];
  private attempts = new Map<string, number>();

  async read(path: string): Promise<Uint8Array | null | undefined> {
    this.log.push(`GET ${path}`);
    if (!this.answers) return undefined;
    if (path === "/json/info") return encode(JSON.stringify(this.info));
    if (path === "/json/eff") return encode(JSON.stringify(this.effects));
    if (path === "/edit?func=list") return this.listing ? encode(JSON.stringify([ ...this.files ].map(([ name, bytes ]) => ({ name: name.slice(1), type: "file", size: bytes.length })))) : encode("<html></html>");
    return this.files.get(path) ?? null;
  }

  async upload(name: string, file: { gif: string } | { text: string }): Promise<{ ok: boolean; status?: number }> {
    this.log.push(`POST ${name}`);
    if (!this.answers) return { ok: false };
    if (this.locked) return { ok: false, status: 401 };
    const attempt = (this.attempts.get(name) ?? 0) + 1;
    this.attempts.set(name, attempt);
    const hooked = this.hook?.(name, attempt, file);
    if (hooked) return hooked;
    this.files.set(name, encode("gif" in file ? `gif:${file.gif}` : file.text));
    return { ok: true, status: 200 };
  }

  presets() {
    const bytes = this.files.get("/presets.json");
    return bytes ? parsePresets(decode(bytes)) : undefined;
  }
}

test("a fresh device gets every GIF, then its presets, and is checked", async () => {
  const wled = new FakeWled();
  const progress: string[] = [];
  const result = await installPack(wled, VARIANT, ({ step, done, total }) => progress.push(`${step} ${done}/${total}`));
  assert.ok(result.ok);
  assert.equal(result.added, 72);
  assert.deepEqual(wled.log.slice(0, 5), [ "GET /json/info", "GET /json/eff", "GET /presets.json", "GET /edit?func=list", `POST /${VARIANT.gifs[0].name}` ]);
  assert.deepEqual(wled.log.slice(-2), [ "POST /presets.json", "GET /presets.json" ]);
  assert.equal(wled.log.filter(line => line.startsWith("POST /ad_")).length, 71);
  assert.ok(samePresets(wled.presets()!, VARIANT.presets));
  assert.equal(decode(wled.files.get("/presets.json")!), presetsFile({ 0: {}, ...VARIANT.presets }));
  assert.deepEqual([ progress[0], progress[1], progress[71], progress[72], progress[73], progress.at(-1) ], [ "read 0/73", "upload 0/73", "upload 70/73", "save 71/73", "check 72/73", "check 73/73" ]);
});

test("installing twice gives the same presets.json, every preset kept", async () => {
  const wled = new FakeWled();
  await installPack(wled, VARIANT);
  const first = decode(wled.files.get("/presets.json")!);
  const again = await installPack(wled, VARIANT);
  assert.ok(again.ok);
  assert.deepEqual({ kept: again.kept, added: again.added }, { kept: 72, added: 0 });
  assert.equal(decode(wled.files.get("/presets.json")!), first);
});

test("the user's own presets survive, and the pack moves round them", async () => {
  const wled = new FakeWled();
  wled.files.set("/presets.json", encode(presetsFile({ 1: { n: "Warm white" }, 101: { n: "My red" } })));
  const result = await installPack(wled, VARIANT);
  assert.ok(result.ok);
  assert.equal(result.slots.get(101), 250);
  const presets = wled.presets()!;
  assert.deepEqual(presets["1"], { n: "Warm white" });
  assert.deepEqual(presets["101"], { n: "My red" });
  assert.equal((presets["250"] as any).n, "AD Game on");
  assert.equal((presets["105"] as any).playlist.end, 250);
});

test("the effects' ids follow the device's names", async () => {
  const wled = new FakeWled();
  const names = wled16Effects();
  names[53] = "RSVD";
  names[60] = "Image";
  wled.effects = names;
  const result = await installPack(wled, VARIANT);
  assert.ok(result.ok);
  assert.equal((wled.presets()!["101"] as any).seg[0].fx, 60);
});

test("nothing is written to what isn't a matrix with GIFs and room", async () => {
  const cases: [ (wled: FakeWled) => void, object ][] = [
    [ (wled) => { wled.answers = false; }, { ok: false, reason: "unreachable" } ],
    [ (wled) => { wled.info = { hello: "world" }; }, { ok: false, reason: "not-wled" } ],
    [ (wled) => { wled.info = { ver: "16.0.1", leds: { count: 300 } }; }, { ok: false, reason: "not-matrix" } ],
    [ (wled) => { wled.effects = wled16Effects().slice(0, 50); }, { ok: false, reason: "effect-missing", effect: "Image" } ],
    [ (wled) => { wled.files.set("/presets.json", encode("{\"0\":{}\n,\"1\":")); }, { ok: false, reason: "presets-unreadable" } ],
    [ (wled) => { wled.files.set("/presets.json", encode(presetsFile(Object.fromEntries(Array.from({ length: 200 }, (_, at) => [ String(at + 1), { n: `Mine ${at}` } ]))))); }, { ok: false, reason: "no-slots", needed: 72, free: 50 } ],
    [ (wled) => { wled.info = { ver: "16.0.1", leds: { count: 256, matrix: { w: 32, h: 8 } }, fs: { u: 1300, t: 1400 } }; }, { ok: false, reason: "no-room", neededKb: 380, freeKb: 99 } ],
  ];
  for (const [ setUp, expected ] of cases) {
    const wled = new FakeWled();
    setUp(wled);
    assert.deepEqual(await installPack(wled, VARIANT), expected);
    assert.equal(wled.log.filter(line => line.startsWith("POST")).length, 0, JSON.stringify(expected));
  }
});

test("a settings PIN stops it at the first file", async () => {
  const wled = new FakeWled();
  wled.locked = true;
  assert.deepEqual(await installPack(wled, VARIANT), { ok: false, reason: "locked" });
  assert.equal(wled.log.filter(line => line.startsWith("POST")).length, 1);
});

test("a GIF that fails leaves presets.json alone, and a retry finishes", async () => {
  const wled = new FakeWled();
  const tenth = `/${VARIANT.gifs[9].name}`;
  wled.hook = (name, attempt) => (name === tenth && attempt === 1 ? { ok: false, status: 500 } : undefined);
  assert.deepEqual(await installPack(wled, VARIANT), { ok: false, reason: "upload-failed", file: VARIANT.gifs[9].name, status: 500 });
  assert.equal(wled.files.get("/presets.json"), undefined);
  const retry = await installPack(wled, VARIANT);
  assert.ok(retry.ok);
  assert.ok(samePresets(wled.presets()!, VARIANT.presets));
});

test("presets.json that didn't take is put back as it was", async () => {
  const wled = new FakeWled();
  const original = presetsFile({ 1: { n: "Warm white" } });
  wled.files.set("/presets.json", encode(original));
  wled.hook = (name, attempt, file) => {
    if (name !== "/presets.json" || attempt !== 1 || !("text" in file)) return undefined;
    wled.files.set(name, encode(file.text.slice(0, 100)));
    return { ok: true, status: 200 };
  };
  assert.deepEqual(await installPack(wled, VARIANT), { ok: false, reason: "restored" });
  assert.equal(decode(wled.files.get("/presets.json")!), original);
});

test("when even that fails, the old presets are handed back", async () => {
  const wled = new FakeWled();
  const original = presetsFile({ 1: { n: "Warm white" } });
  wled.files.set("/presets.json", encode(original));
  wled.hook = (name, _attempt, file) => {
    if (name !== "/presets.json" || !("text" in file)) return undefined;
    wled.files.set(name, encode(file.text.slice(0, 100)));
    return { ok: true, status: 200 };
  };
  assert.deepEqual(await installPack(wled, VARIANT), { ok: false, reason: "not-restored", backup: original });
});

test("a presets.json upload refused before writing changes nothing and isn't 'restored'", async () => {
  const wled = new FakeWled();
  wled.hook = name => (name === "/presets.json" ? { ok: false, status: 500 } : undefined);
  assert.deepEqual(await installPack(wled, VARIANT), { ok: false, reason: "upload-failed", file: "presets.json", status: 500 });
  assert.equal(wled.log.filter(line => line === "POST /presets.json").length, 1);
});
```

The `no-room` numbers come from the room rule, measured on this catalog:
- free is `(1400 − 1300) × 1000 − 999` = 99,001;
- the 71 GIFs take 335,872 bytes in whole blocks;
- the new presets.json is 13,997 bytes (4 blocks), so keep is 27,093;
- needed is 99,001 + 253,255 + 27,093 = 379,349, which is 380 kB, with 99 kB free.

- [ ] **Step 2: Run it to see it fail**

Run: `cd $REPO && node_modules/.bin/tsx $SCR/tests/packs-install.test.mts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `utils/wled-pack-install.ts`**

```ts
import type { PackVariant } from "@/utils/wled-packs";

import { deviceEffects, fileSizes, parsePresets, planInstall, presetsFile, roomFor, samePresets } from "@/utils/wled-packs";
import { layoutOf } from "@/utils/wled-preview";

/**
 * Putting an animation pack on a WLED: the order wled-project's installer
 * (animations/install.py) has proven on a real device, over whatever reads and
 * uploads for it. In the browser that is the background (utils/wled-pack-catalog.ts,
 * `deviceIo`); in tests a stand-in.
 *
 * Everything is read and checked before anything is written: the device, its
 * effects, its presets and its room. Then every GIF, then presets.json, which
 * is read back. If the device didn't keep it, the old presets.json goes back,
 * and if even that fails it is handed back to be saved. Nothing of the user's
 * is overwritten (utils/wled-packs.ts, planInstall).
 */

/** What the install asks of a device. */
export interface DeviceIo {
  /** GET `path`: its body; `null` for an answer with an error status, such as a 404; `undefined` when nothing answered in time. */
  read: (path: string, timeoutMs: number) => Promise<Uint8Array | null | undefined>;
  /** POST a file to the device's /upload, stored under `name` ("/ad_180.gif"): a GIF of the catalog by its name, or text. */
  upload: (name: string, file: { gif: string } | { text: string }, timeoutMs: number) => Promise<{ ok: boolean; status?: number }>;
}

export type InstallStep = "read" | "upload" | "save" | "check";

/** How far an install has got: `done` of `total`, the GIFs and then presets.json and its check. While GIF *i* goes up, `done` is *i*. */
export interface InstallProgress {
  step: InstallStep;
  done: number;
  total: number;
}

/** Why a pack isn't on the device. `pack-unreadable` is the dialog's own: the catalog's file couldn't be read. */
export type InstallFailure =
  | { reason: "unreachable" }
  | { reason: "not-wled" }
  | { reason: "not-matrix" }
  | { reason: "effect-missing"; effect: string }
  | { reason: "presets-unreadable" }
  | { reason: "no-slots"; needed: number; free: number }
  | { reason: "no-room"; neededKb: number; freeKb: number }
  | { reason: "locked" }
  | { reason: "upload-failed"; file: string; status?: number }
  | { reason: "restored" }
  | { reason: "not-restored"; backup: string }
  | { reason: "pack-unreadable" };

export type InstallResult =
  | { ok: true; slots: Map<number, number>; kept: number; added: number; moved: number }
  | ({ ok: false } & InstallFailure);

/** What the packs dialog shows of an install (components/Settings/Wled/PacksDialog.vue). */
export type InstallState =
  | { phase: "confirm" }
  | { phase: "running"; progress: InstallProgress }
  | { phase: "done"; set: string; count: number; inUse: boolean; playing: string }
  | { phase: "failed"; failure: InstallFailure };

/** /json/info is small, so an answer is expected soon: a device that is off shows quickly. */
export const INFO_TIMEOUT_MS = 4000;
/** An ESP32 took 3–4.5 s for a 56 KB presets.json. */
export const LIST_TIMEOUT_MS = 15_000;
export const FILES_TIMEOUT_MS = 8000;
export const GIF_UPLOAD_TIMEOUT_MS = 20_000;
export const PRESETS_UPLOAD_TIMEOUT_MS = 30_000;

export async function installPack(io: DeviceIo, variant: PackVariant, onProgress: (progress: InstallProgress) => void = () => {}): Promise<InstallResult> {
  const total = variant.gifs.length + 2;
  const report = (step: InstallStep, done: number) => onProgress({ step, done, total });
  report("read", 0);

  const info = parsed(await io.read("/json/info", INFO_TIMEOUT_MS));
  if (info === undefined) return { ok: false, reason: "unreachable" };
  const layout = layoutOf(info);
  if (!layout) return { ok: false, reason: "not-wled" };
  if (layout.height < 2) return { ok: false, reason: "not-matrix" };

  const names = parsed(await io.read("/json/eff", LIST_TIMEOUT_MS));
  if (names === undefined) return { ok: false, reason: "unreachable" };
  const fx = deviceEffects(variant.fx, Array.isArray(names) ? names.map(name => (typeof name === "string" ? name : "")) : []);
  if (!fx.ok) return { ok: false, reason: "effect-missing", effect: fx.missing };

  const raw = await io.read("/presets.json", LIST_TIMEOUT_MS);
  if (raw === undefined) return { ok: false, reason: "unreachable" };
  // A 404 is a device without presets.
  const original = raw === null ? "" : new TextDecoder().decode(raw);
  const device = parsePresets(original);
  if (!device) return { ok: false, reason: "presets-unreadable" };

  const plan = planInstall(device, variant, fx.ids);
  if (!plan.ok) return { ok: false, reason: "no-slots", needed: plan.needed, free: plan.free };
  const body = presetsFile(plan.presets);
  const files = fileSizes(parsed(await io.read("/edit?func=list", FILES_TIMEOUT_MS)));
  const room = roomFor(info, files, variant.gifs, raw?.length ?? 0, new TextEncoder().encode(body).length);
  if (!room.ok) return { ok: false, reason: "no-room", neededKb: room.neededKb, freeKb: room.freeKb };

  for (const [ at, gif ] of variant.gifs.entries()) {
    report("upload", at);
    const sent = await io.upload(`/${gif.name}`, { gif: gif.name }, GIF_UPLOAD_TIMEOUT_MS);
    if (sent.status === 401) return { ok: false, reason: "locked" };
    if (!sent.ok) return { ok: false, reason: "upload-failed", file: gif.name, status: sent.status };
  }

  report("save", variant.gifs.length);
  const saved = await io.upload("/presets.json", { text: body }, PRESETS_UPLOAD_TIMEOUT_MS);
  // WLED refuses a locked upload before it opens the file.
  if (saved.status === 401) return { ok: false, reason: "locked" };
  report("check", variant.gifs.length + 1);
  const written = saved.ok ? await readPresets(io) : undefined;
  if (written && samePresets(written, plan.presets)) {
    report("check", total);
    return { ok: true, slots: plan.slots, kept: plan.kept, added: plan.added, moved: plan.moved };
  }

  // The new presets didn't take. The old ones, unless they are still there, go back.
  const now = written ?? await readPresets(io);
  if (now && samePresets(now, device)) return { ok: false, reason: "upload-failed", file: "presets.json", status: saved.status };
  const backup = original || presetsFile({});
  const restored = await io.upload("/presets.json", { text: backup }, PRESETS_UPLOAD_TIMEOUT_MS);
  const after = restored.ok ? await readPresets(io) : undefined;
  if (after && samePresets(after, device)) return { ok: false, reason: "restored" };
  return { ok: false, reason: "not-restored", backup };
}

async function readPresets(io: DeviceIo): Promise<Record<string, unknown> | undefined> {
  const raw = await io.read("/presets.json", LIST_TIMEOUT_MS);
  return raw === undefined ? undefined : parsePresets(raw === null ? "" : new TextDecoder().decode(raw));
}

/** JSON from a read: `undefined` when nothing answered, `null` for an error status or something that isn't JSON. */
function parsed(bytes: Uint8Array | null | undefined): unknown {
  if (bytes === undefined) return undefined;
  if (bytes === null) return null;
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run the test to see it pass**

Run: `cd $REPO && node_modules/.bin/tsx $SCR/tests/packs-install.test.mts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
cd $REPO && git add utils/wled-pack-install.ts
git commit -m "feat(wled): put a pack on a WLED, check it took, and put the old presets back if not

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: The background uploads a file to the device

**Files:**
- Create: `utils/wled-upload.ts`
- Modify: `entrypoints/background.ts` (import; one branch before the `fetch` branch)
- Test: `$SCR/tests/upload.test.mts`

**Interfaces:**
- Produces:
  - `interface WledUploadMessage { type: "wled:upload"; url: string; name: string; gif?: string; text?: string; timeoutMs?: number }`
  - `interface WledUploadDeps { fetch: typeof fetch; packaged: (path: string) => string }`
  - `wledUpload(message: WledUploadMessage, deps?: WledUploadDeps): Promise<{ ok: boolean; status?: number; error?: string }>`
- The background answers `browser.runtime.sendMessage({ type: "wled:upload", … })` with that result.

- [ ] **Step 1: Write the failing test `$SCR/tests/upload.test.mts`**

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { wledUpload } from "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/utils/wled-upload.ts";

const GIF = new Uint8Array([ 71, 73, 70, 56, 57, 97, 1, 0 ]);

function deps(answer: (url: string, init?: RequestInit) => Promise<Response>) {
  const calls: { url: string; init?: RequestInit }[] = [];
  return {
    calls,
    deps: {
      fetch: (async (url: string, init?: RequestInit) => {
        calls.push({ url: String(url), init });
        return answer(String(url), init);
      }) as typeof fetch,
      packaged: (path: string) => `chrome-extension://test${path}`,
    },
  };
}

test("a GIF of the catalog goes to the device's /upload as WLED's own page sends it", async () => {
  const { calls, deps: injected } = deps(async url => (url.startsWith("chrome-extension:") ? new Response(GIF) : new Response("File Uploaded!", { status: 200 })));
  const result = await wledUpload({ type: "wled:upload", url: "http://192.168.0.227", name: "/ad_180.gif", gif: "ad_180.gif" }, injected);
  assert.deepEqual(result, { ok: true, status: 200 });
  assert.equal(calls[0].url, "chrome-extension://test/wled-packs/gifs/ad_180.gif");
  assert.equal(calls[1].url, "http://192.168.0.227/upload");
  assert.equal(calls[1].init?.method, "POST");
  const file = (calls[1].init?.body as FormData).get("data") as File;
  assert.equal(file.name, "/ad_180.gif");
  assert.deepEqual(new Uint8Array(await file.arrayBuffer()), GIF);
});

test("text goes up as a file of its name, to the address's origin", async () => {
  const { calls, deps: injected } = deps(async () => new Response("File Uploaded!"));
  const result = await wledUpload({ type: "wled:upload", url: "http://wled.local:8080/json", name: "/presets.json", text: "{\"0\":{}}" }, injected);
  assert.deepEqual(result, { ok: true, status: 200 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://wled.local:8080/upload");
  assert.equal(await ((calls[0].init?.body as FormData).get("data") as File).text(), "{\"0\":{}}");
});

test("a locked WLED's 401 comes back as it is", async () => {
  const { deps: injected } = deps(async () => new Response("Unlock settings using PIN code!", { status: 401 }));
  assert.deepEqual(await wledUpload({ type: "wled:upload", url: "http://192.168.0.227", name: "/presets.json", text: "{}" }, injected), { ok: false, status: 401 });
});

test("refuses what isn't an upload of a pack", async () => {
  for (const message of [
    { url: "file:///etc", name: "/presets.json", text: "{}" },
    { url: "not an address", name: "/presets.json", text: "{}" },
    { url: "http://192.168.0.227", name: "presets.json", text: "{}" },
    { url: "http://192.168.0.227", name: "/../cfg.json", text: "{}" },
    { url: "http://192.168.0.227", name: "/a/b.gif", gif: "b.gif" },
    { url: "http://192.168.0.227", name: "/a_name_that_is_much_too_long_for_wled.gif", gif: "x.gif" },
    { url: "http://192.168.0.227", name: "/x.gif", gif: "../secret.gif" },
    { url: "http://192.168.0.227", name: "/x.gif", gif: "x.png" },
    { url: "http://192.168.0.227", name: "/x.gif" },
  ]) {
    const { calls, deps: injected } = deps(async () => new Response("File Uploaded!"));
    const result = await wledUpload({ type: "wled:upload", ...message } as any, injected);
    assert.equal(result.ok, false, JSON.stringify(message));
    assert.equal(calls.length, 0, JSON.stringify(message));
  }
});

test("a GIF the package lacks isn't sent", async () => {
  const { calls, deps: injected } = deps(async url => new Response("", { status: url.startsWith("chrome-extension:") ? 404 : 200 }));
  const result = await wledUpload({ type: "wled:upload", url: "http://192.168.0.227", name: "/ad_x.gif", gif: "ad_x.gif" }, injected);
  assert.equal(result.ok, false);
  assert.equal(calls.length, 1);
});

test("a device that doesn't answer in time gives up", async () => {
  const { deps: injected } = deps((_url, init) => new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")))));
  const result = await wledUpload({ type: "wled:upload", url: "http://192.168.0.227", name: "/presets.json", text: "{}", timeoutMs: 50 }, injected);
  assert.equal(result.ok, false);
  assert.match(result.error ?? "", /abort/i);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd $REPO && node_modules/.bin/tsx $SCR/tests/upload.test.mts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `utils/wled-upload.ts`**

```ts
/**
 * The background's part in putting an animation pack on a WLED
 * (utils/wled-pack-install.ts): one file POSTed to the device's /upload, as
 * WLED's own settings page sends it (multipart, field `data`, the file's name
 * with its slash). A GIF is read from the extension's own catalog
 * (public/wled-packs/gifs/), so only its name crosses the message channel.
 *
 * In the background because a content script in Firefox can't read what a
 * device on the LAN answers, and the answer says whether the file was kept.
 * WLED answers /upload with `Access-Control-Allow-Origin: *` like everything
 * else, so no host permission is needed.
 */

export interface WledUploadMessage {
  type: "wled:upload";
  /** The device's address; only its origin counts, such as http://192.168.0.227. */
  url: string;
  /** Where WLED keeps the file: "/ad_180.gif", "/presets.json". */
  name: string;
  /** A GIF of the catalog, by its name. */
  gif?: string;
  /** Or the file's text. */
  text?: string;
  timeoutMs?: number;
}

export interface WledUploadDeps {
  fetch: typeof fetch;
  /** The extension's own URL for one of its files. */
  packaged: (path: string) => string;
}

/** A name WLED keeps at the top of its file system: LittleFS keeps 31 characters of a path, the slash included. */
const NAME = /^\/[\w.-]{1,30}$/;
const GIF = /^[\w.-]+\.gif$/i;
const DEFAULT_TIMEOUT_MS = 20_000;

export async function wledUpload(message: WledUploadMessage, deps: WledUploadDeps = defaultDeps()): Promise<{ ok: boolean; status?: number; error?: string }> {
  let origin: string;
  try {
    const url = new URL(message.url);
    if (url.protocol !== "http:" && url.protocol !== "https:") return { ok: false, error: "not a web address" };
    origin = url.origin;
  } catch {
    return { ok: false, error: "not an address" };
  }
  if (typeof message.name !== "string" || !NAME.test(message.name) || message.name.includes("..")) return { ok: false, error: "not a file name WLED keeps" };
  if (message.gif !== undefined && (typeof message.gif !== "string" || !GIF.test(message.gif))) return { ok: false, error: "not a GIF of the catalog" };
  if (message.gif === undefined && typeof message.text !== "string") return { ok: false, error: "no file" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), message.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    let blob: Blob;
    if (message.gif !== undefined) {
      const file = await deps.fetch(deps.packaged(`/wled-packs/gifs/${message.gif}`), { signal: controller.signal });
      if (!file.ok) return { ok: false, error: `the catalog has no ${message.gif}` };
      blob = await file.blob();
    } else {
      blob = new Blob([ message.text! ], { type: "application/json" });
    }
    const form = new FormData();
    form.append("data", blob, message.name);
    const response = await deps.fetch(`${origin}/upload`, { method: "POST", body: form, credentials: "omit", cache: "no-store", signal: controller.signal });
    return { ok: response.ok, status: response.status };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timer);
  }
}

function defaultDeps(): WledUploadDeps {
  return {
    fetch: (input, init) => fetch(input, init),
    // A path that changes with the pack: WXT's PublicPath type knows only the ones it has seen.
    packaged: path => (browser.runtime.getURL as (path: string) => string)(path),
  };
}
```

- [ ] **Step 4: Route the message in `entrypoints/background.ts`**

Add to the imports at the top:

```ts
import { wledUpload } from "@/utils/wled-upload";
```

Inside the `onMessage` listener, right before `// Handle fetch requests with chunked download support`, add:

```ts
      // WLED animation packs: one file put on the user's WLED (utils/wled-upload.ts).
      if (message.type === "wled:upload") return wledUpload(message);
```

- [ ] **Step 5: Run the test to see it pass**

Run: `cd $REPO && node_modules/.bin/tsx $SCR/tests/upload.test.mts`
Expected: PASS, 6 tests.

- [ ] **Step 6: Commit**

```bash
cd $REPO && git add utils/wled-upload.ts entrypoints/background.ts
git commit -m "feat(wled): the background uploads a pack's files to the WLED, with no new permission

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: The catalog, the device and pack previews in the settings

**Files:**
- Create: `utils/wled-pack-catalog.ts`
- Test: `$SCR/tests/setup-browser.mts`, `$SCR/tests/catalog.test.mts`

**Interfaces:**
- Consumes:
  - `backgroundFetch` (utils/helpers.ts, answers `{ ok, status?, data?: dataURL, error? }`);
  - `dataUrlBytes` (utils/wled-device.ts), `decodeGif` (utils/gif.ts), `planPreset` and `makePreview` (utils/wled-preview.ts);
  - `isPackIndex`, `isPackVariant`, `deviceSummary` (Task 2); `DeviceIo`, `INFO_TIMEOUT_MS` (Task 4); `WledUploadMessage` (Task 5).
- Produces:
  - `loadPackIndex(): Promise<PackIndex | undefined>`
  - `loadPackVariant(file: string): Promise<PackVariant | undefined>`
  - `loadPackGif(name: string): Promise<Gif | undefined>`
  - `packPreview(variant: PackVariant, preset: number): Promise<{ name: string; preview: Preview } | undefined>`
  - `deviceIo(origin: string): DeviceIo`
  - `type Probe = { ok: true; device: DeviceSummary } | { ok: false; reason: "unreachable" | "not-wled" }`, and `probeDevice(origin: string): Promise<Probe>`

- [ ] **Step 1: Write the browser stand-ins `$SCR/tests/setup-browser.mts`**

```ts
import "./setup.mts";

import { readFileSync } from "node:fs";

const REPO = "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt";

/** utils/helpers.ts makes three sounds when it loads. */
(globalThis as any).Audio = class {};

export const sent: any[] = [];
/** What the fake device answers a fetch: return a relay answer, or undefined to fall through. */
export const device: { answer?: (url: string) => any; upload?: (message: any) => any } = {};

(globalThis as any).browser = {
  runtime: {
    getURL: (path: string) => `chrome-extension://test${path.startsWith("/") ? path : `/${path}`}`,
    async sendMessage(message: any) {
      sent.push(message);
      if (message.type === "wled:upload") return device.upload?.(message);
      if (message.type !== "fetch") return undefined;
      if (message.url.startsWith("chrome-extension://test/")) {
        try {
          const bytes = readFileSync(`${REPO}/public${message.url.slice("chrome-extension://test".length)}`);
          return { ok: true, status: 200, data: `data:application/octet-stream;base64,${bytes.toString("base64")}` };
        } catch {
          return { ok: false, status: 404 };
        }
      }
      return device.answer?.(message.url) ?? { ok: false, error: "no answer" };
    },
  },
};
```

- [ ] **Step 2: Write the failing test `$SCR/tests/catalog.test.mts`**

```ts
import { device, sent } from "./setup-browser.mts";

import assert from "node:assert/strict";
import { test } from "node:test";

const { deviceIo, loadPackGif, loadPackIndex, loadPackVariant, packPreview, probeDevice } = await import("/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/utils/wled-pack-catalog.ts");

const json = (value: unknown) => ({ ok: true, status: 200, data: `data:application/json;base64,${Buffer.from(JSON.stringify(value)).toString("base64")}` });

test("the catalog is read once, from the extension's own files", async () => {
  const before = sent.length;
  const index = await loadPackIndex();
  await loadPackIndex();
  assert.deepEqual(index?.packs.map(pack => pack.id), [ "standard", "halloween" ]);
  assert.equal(sent.length - before, 1);
  assert.equal(sent.at(-1).url, "chrome-extension://test/wled-packs/index.json");
});

test("a variant, a GIF and a preview of a pack's preset", async () => {
  const variant = await loadPackVariant("standard-64x8.json");
  assert.equal(variant?.effects.length, 89);
  assert.equal(await loadPackVariant("missing.json"), undefined);
  const gif = await loadPackGif("ad_w_180.gif");
  assert.deepEqual([ gif?.width, gif?.height ], [ 64, 8 ]);
  const drawn = await packPreview(variant!, 105);
  assert.equal(drawn?.name, "AD 180");
  assert.deepEqual(drawn?.preview.layout, { width: 64, height: 8 });
  assert.ok(drawn?.preview.animated);
  // The mirrored half copies the left one, LED for LED.
  const pixels = drawn!.preview.pixelsAt(1500);
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 32; col++) {
      const left = (row * 64 + col) * 3;
      assert.deepEqual([ ...pixels.subarray(left, left + 3) ], [ ...pixels.subarray(left + 96, left + 99) ]);
    }
  }
});

test("the device: its answers as bytes, an error status as null, no answer as undefined", async () => {
  device.answer = (url) => {
    if (url === "http://wled.local:8080/json/info") return json({ ver: "16.0.1", name: "Matrix", leds: { count: 256, matrix: { w: 32, h: 8 } }, fs: { u: 400, t: 1400 } });
    if (url === "http://wled.local:8080/presets.json") return { ok: false, status: 404 };
    return undefined;
  };
  const io = deviceIo("http://wled.local:8080");
  assert.equal(JSON.parse(new TextDecoder().decode((await io.read("/json/info", 4000))!)).name, "Matrix");
  assert.equal(await io.read("/presets.json", 4000), null);
  assert.equal(await io.read("/json/eff", 4000), undefined);
  const read = sent.findLast(message => message.type === "fetch");
  assert.equal(read.url, "http://wled.local:8080/json/eff");
  assert.equal(read.timeoutMs, 4000);
  assert.deepEqual(await probeDevice("http://wled.local:8080"), { ok: true, device: { name: "Matrix", version: "16.0.1", layout: { width: 32, height: 8 }, freeKb: 1000 } });
  device.answer = () => json({ hello: "world" });
  assert.deepEqual(await probeDevice("http://wled.local:8080"), { ok: false, reason: "not-wled" });
  device.answer = () => undefined;
  assert.deepEqual(await probeDevice("http://wled.local:8080"), { ok: false, reason: "unreachable" });
});

test("uploads go to the background as wled:upload", async () => {
  device.upload = message => (message.name === "/presets.json" ? { ok: false, status: 401 } : { ok: true, status: 200 });
  const io = deviceIo("http://192.168.0.227");
  assert.deepEqual(await io.upload("/ad_180.gif", { gif: "ad_180.gif" }, 20000), { ok: true, status: 200 });
  assert.deepEqual(sent.at(-1), { type: "wled:upload", url: "http://192.168.0.227", name: "/ad_180.gif", gif: "ad_180.gif", timeoutMs: 20000 });
  assert.deepEqual(await io.upload("/presets.json", { text: "{}" }, 30000), { ok: false, status: 401 });
  device.upload = () => undefined;
  assert.deepEqual(await io.upload("/presets.json", { text: "{}" }, 30000), { ok: false, status: undefined });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `cd $REPO && node_modules/.bin/tsx $SCR/tests/catalog.test.mts`
Expected: FAIL — module not found.

- [ ] **Step 4: Write `utils/wled-pack-catalog.ts`**

```ts
import type { Gif } from "@/utils/gif";
import type { DeviceIo } from "@/utils/wled-pack-install";
import type { DeviceSummary, PackIndex, PackVariant } from "@/utils/wled-packs";
import type { WledUploadMessage } from "@/utils/wled-upload";
import type { Preview } from "@/utils/wled-preview";

import { decodeGif } from "@/utils/gif";
import { backgroundFetch } from "@/utils/helpers";
import { dataUrlBytes } from "@/utils/wled-device";
import { INFO_TIMEOUT_MS } from "@/utils/wled-pack-install";
import { deviceSummary, isPackIndex, isPackVariant } from "@/utils/wled-packs";
import { makePreview, planPreset } from "@/utils/wled-preview";

/**
 * The animation packs as the WLED settings use them: the catalog the extension
 * ships (public/wled-packs/) and its pack previews, and the user's WLED, read
 * and written through the background (utils/wled-pack-install.ts's DeviceIo).
 *
 * The catalog's files are read through the background's fetch relay too: a
 * content script may not read the extension's files unless the manifest offers
 * them to the page, and this way it doesn't. What was read is kept for the
 * page's life; what failed is asked again next time.
 */

/** The catalog's folder in the extension. Every path in the catalog is relative to it. */
const CATALOG = "/wled-packs/";

/** What answered at an address, or why nothing useful did. */
export type Probe = { ok: true; device: DeviceSummary } | { ok: false; reason: "unreachable" | "not-wled" };

let index: Promise<PackIndex | undefined> | undefined;
const variants = new Map<string, Promise<PackVariant | undefined>>();
const gifs = new Map<string, Promise<Gif | undefined>>();

/** The packs on offer. */
export function loadPackIndex(): Promise<PackIndex | undefined> {
  if (!index) {
    index = packaged("index.json").then(parseJson).then(value => (isPackIndex(value) ? value : undefined));
    void index.then((value) => {
      if (!value) index = undefined;
    });
  }
  return index;
}

/** A pack in one size, by its file in the catalog. */
export function loadPackVariant(file: string): Promise<PackVariant | undefined> {
  return remembered(variants, file, async () => {
    const value = parseJson(await packaged(file));
    return isPackVariant(value) ? value : undefined;
  });
}

/** One of the catalog's GIFs, decoded. */
export function loadPackGif(name: string): Promise<Gif | undefined> {
  return remembered(gifs, name, async () => {
    const bytes = await packaged(`gifs/${name}`);
    if (!bytes) return undefined;
    try {
      return decodeGif(bytes);
    } catch {
      return undefined;
    }
  });
}

/**
 * A pack's preset, drawn as a matrix of the pack's size would show it, from
 * the pack's own presets and GIFs (utils/wled-preview.ts). The pack's effect
 * ids are WLED 16's, which planPreset knows without a device's list.
 */
export async function packPreview(variant: PackVariant, preset: number): Promise<{ name: string; preview: Preview } | undefined> {
  const layout = { width: variant.width, height: variant.height };
  const plan = planPreset(variant.presets, preset, layout);
  if (!plan.ok) return undefined;
  const names = [ ...new Set(plan.segments.flatMap(segment => (segment.kind === "image" ? [ segment.gif ] : []))) ];
  const loaded = await Promise.all(names.map(async name => [ name, await loadPackGif(name) ] as const));
  const found = new Map(loaded.filter((entry): entry is readonly [string, Gif] => entry[1] !== undefined));
  return { name: plan.name, preview: makePreview(plan, layout, found) };
}

/** The WLED at `origin`, such as http://192.168.0.227, for an install: reads through the fetch relay, uploads through `wled:upload`. */
export function deviceIo(origin: string): DeviceIo {
  return {
    async read(path, timeoutMs) {
      const response = await backgroundFetch(`${origin}${path}`, { cache: "no-store", credentials: "omit" }, { timeoutMs });
      if (response.ok && typeof response.data === "string") return dataUrlBytes(response.data);
      // An answer with an error status, such as a 404, against no answer at all.
      return typeof response.status === "number" ? null : undefined;
    },
    async upload(name, file, timeoutMs) {
      const message: WledUploadMessage = { type: "wled:upload", url: origin, name, timeoutMs, ...file };
      const answer: unknown = await browser.runtime.sendMessage(message).catch(() => undefined);
      if (!answer || typeof answer !== "object") return { ok: false, status: undefined };
      const { ok, status } = answer as { ok?: unknown; status?: unknown };
      return { ok: ok === true, status: typeof status === "number" ? status : undefined };
    },
  };
}

/** What answers at `origin`: a WLED's name, version, LEDs and free space, read from its /json/info. */
export async function probeDevice(origin: string): Promise<Probe> {
  const bytes = await deviceIo(origin).read("/json/info", INFO_TIMEOUT_MS);
  if (bytes === undefined) return { ok: false, reason: "unreachable" };
  const device = deviceSummary(parseJson(bytes ?? undefined));
  return device ? { ok: true, device } : { ok: false, reason: "not-wled" };
}

/** One of the catalog's files, read through the background. */
async function packaged(path: string): Promise<Uint8Array | undefined> {
  // A path that changes with the pack: WXT's PublicPath type knows only the ones it has seen.
  const url = (browser.runtime.getURL as (path: string) => string)(`${CATALOG}${path}`);
  const response = await backgroundFetch(url, { cache: "no-cache" });
  return response.ok && typeof response.data === "string" ? dataUrlBytes(response.data) : undefined;
}

/** `load()`'s promise for `key`, kept unless it gave nothing. */
function remembered<T>(memo: Map<string, Promise<T | undefined>>, key: string, load: () => Promise<T | undefined>): Promise<T | undefined> {
  const known = memo.get(key);
  if (known) return known;
  const promise = load().catch(() => undefined);
  memo.set(key, promise);
  void promise.then((value) => {
    if (value === undefined) memo.delete(key);
  });
  return promise;
}

function parseJson(bytes: Uint8Array | undefined): unknown {
  if (!bytes) return undefined;
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return undefined;
  }
}
```

- [ ] **Step 5: Run the test to see it pass**

Run: `cd $REPO && node_modules/.bin/tsx $SCR/tests/catalog.test.mts`
Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

```bash
cd $REPO && git add utils/wled-pack-catalog.ts
git commit -m "feat(wled): read the packs, draw their previews and reach the WLED from the settings

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: The texts, in English, German and Dutch

**Files:**
- Modify: `locales/en/wled.ts`, `locales/de/wled.ts`, `locales/nl/wled.ts`, `locales/same-as-english.json`

**Interfaces:**
- Produces:
  - `wled.add.packs.{label,hint}`;
  - `wled.packs.section.{title,intro,browse}`, `wled.packs.dialog.{title,intro}`;
  - `wled.packs.device.{label,hint,reading,found,foundNoRoom,unreachable,notWled,strip}`;
  - `wled.packs.card.{count,size,add,update,fits,misfit,added,newer,show,hide,cover}`;
  - `wled.packs.otherSizes`, `wled.packs.links.email`, `wled.packs.loadFailed`;
  - `wled.packs.install.{back,summary,summaryUpdate,yours,start,steps.{read,upload,save,check},keepOpen,done,plays,waits,close,retry,saveBackup}`;
  - `wled.packs.errors.{unreachable,notWled,notMatrix,effectMissing,presetsUnreadable,noSlots,noRoom,locked,uploadFailed,restored,notRestored,packUnreadable}`.

- [ ] **Step 1: English — in `locales/en/wled.ts`, add `packs` first inside `add`:**

```ts
  add: {
    packs: {
      label: "Animation packs",
      hint: "Ready-made animations for LED matrices",
    },
```

and after the `preview` group, add:

```ts
  /**
   * Animation packs: ready-made animations put on the user's WLED and added as an effect set
   * (components/Settings/Wled/PacksDialog.vue). A pack's name and description come with the pack, in each language.
   * A size is written "32 × 8", width × height, in every language.
   */
  packs: {
    /** The panel's section, before the effect sets. */
    section: {
      title: "Animation packs",
      intro: "Ready-made animations for LED matrices. Tools puts a pack on your WLED and adds its effects as a set of their own.",
      browse: "Browse packs",
    },
    dialog: {
      title: "Animation packs",
      intro: "Pick a pack and the size of your matrix. Tools puts the animations on your WLED as presets and adds their effects to Tools as an effect set.",
    },
    /** The address field and the line under it, which says what answered there. */
    device: {
      label: "Your WLED",
      hint: "Type your WLED's address to add a pack.",
      reading: "Looking for your WLED…",
      /** `name` is the WLED's own name, `version` its WLED version, `size` its matrix ("64 × 8") and `free` its free space in kB. */
      found: "{name} · WLED {version} · {size} · {free} kB free",
      /** The same, for a WLED that doesn't say how much room it has. */
      foundNoRoom: "{name} · WLED {version} · {size}",
      /** `address` is what was typed, such as 192.168.0.227. */
      unreachable: "Nothing answered at {address}. Is your WLED on and on this network?",
      notWled: "{address} answered, but not as a WLED.",
      strip: {
        one: "This WLED drives a strip of {count} LED. The packs are for LED matrices.",
        other: "This WLED drives a strip of {count} LEDs. The packs are for LED matrices.",
      },
    },
    /** A pack's card. */
    card: {
      count: { one: "{count} animation", other: "{count} animations" },
      /** The size choice's accessible name. */
      size: "Size",
      add: "Add",
      update: "Update",
      /** `size` is the size picked, such as "64 × 8". */
      fits: "Made for your WLED ({size})",
      /** `size` is the size picked, `device` the WLED's matrix. Adding it is still possible. */
      misfit: "Made for {size}. Your WLED is {device}.",
      /** `set` is the name of the effect set the pack was added as. */
      added: "In your effect sets as {set}",
      newer: "A newer version is here.",
      show: { one: "Show the animation", other: "Show all {count} animations" },
      hide: "Hide the animations",
      /** The cover's accessible name: `pack` is the pack's name, `size` the size shown. */
      cover: "{pack} at {size}",
    },
    /** Under the packs. {discord} and {github} are links named Discord and GitHub, {email} a link named links.email. */
    otherSizes: "Need a pack in another size, such as 64 × 64? Ask on {discord}, on {github} or by {email}.",
    links: {
      email: "email",
    },
    loadFailed: "The packs couldn't be loaded. Reload the page and try again.",
    /** Putting a pack on the WLED. Using the new set afterwards is library.sets.use. */
    install: {
      back: "Back to the packs",
      /** `files` animation files of `kb` kB and `presets` presets go on the WLED at `address`; `effects` effects become the set `set`. */
      summary: "Puts {files} animation files ({kb} kB) and {presets} presets on your WLED at {address}, and adds {effects} effects to Tools as the effect set {set}.",
      /** The same, for a pack added before: its set is brought up to date. */
      summaryUpdate: "Puts {files} animation files ({kb} kB) and {presets} presets on your WLED at {address} again, and brings the {effects} effects of the effect set {set} up to date.",
      yours: "Your own presets stay as they are. Presets from an earlier install of this pack are brought up to date.",
      start: "Put it on my WLED",
      steps: {
        read: "Reading your WLED…",
        /** `done` of `count` animation files. */
        upload: "Putting the animations on your WLED: {done} of {count}",
        save: "Saving the presets…",
        check: "Checking…",
      },
      keepOpen: "Keep this tab open until it's done.",
      done: {
        one: "{pack} is on your WLED, and its effect is in the effect set {set}.",
        other: "{pack} is on your WLED, and its {count} effects are in the effect set {set}.",
      },
      plays: "The set plays from now on.",
      /** `set` is the name of the set that plays. */
      waits: "The set that plays is still {set}.",
      close: "Done",
      retry: "Try again",
      saveBackup: "Save your old presets",
    },
    /** Why a pack couldn't be put on the WLED. `address` is the WLED's, such as 192.168.0.227. */
    errors: {
      unreachable: "Your WLED at {address} didn't answer. Is it on and on this network?",
      notWled: "{address} isn't a WLED.",
      notMatrix: "Your WLED drives a strip. The packs are for LED matrices.",
      /** `effect` is WLED's name of an effect, such as Image. */
      effectMissing: "Your WLED has no {effect} effect, which the pack needs. It takes WLED 0.15 or newer on an ESP32.",
      presetsUnreadable: "Your WLED's presets.json can't be read, so nothing was changed.",
      noSlots: "The pack needs {needed} free preset numbers, and your WLED has {free}.",
      /** `address` here is the WLED's whole address, such as http://192.168.0.227. */
      noRoom: "The pack needs {needed} kB, and your WLED has {free} kB free. Delete files you don't need in WLED's file editor ({address}/edit).",
      locked: "Your WLED is locked with a settings PIN. Unlock it in WLED's settings, then try again.",
      /** `file` is the file's name, such as ad_180.gif. */
      uploadFailed: "Putting {file} on your WLED failed. Check the connection and try again.",
      restored: "Your WLED didn't keep the new presets, so the old ones were put back.",
      notRestored: "Your WLED's presets may be damaged. Save your old presets and restore them in WLED under Security & Updates.",
      packUnreadable: "The pack couldn't be read. Reload the page and try again.",
    },
  },
```

- [ ] **Step 2: German — in `locales/de/wled.ts`, add inside `add` first:**

```ts
    packs: {
      label: "Animationspakete",
      hint: "Fertige Animationen für LED-Matrizen",
    },
```

and after `preview`:

```ts
  packs: {
    section: {
      title: "Animationspakete",
      intro: "Fertige Animationen für LED-Matrizen. Tools überträgt ein Paket auf dein WLED-Gerät und legt seine Effekte als eigenes Set an.",
      browse: "Pakete ansehen",
    },
    dialog: {
      title: "Animationspakete",
      intro: "Wähle ein Paket und die Größe deiner Matrix. Tools überträgt die Animationen als Presets auf dein WLED-Gerät und legt ihre Effekte in Tools als Effekt-Set an.",
    },
    device: {
      label: "Dein WLED-Gerät",
      hint: "Gib die Adresse deines WLED-Geräts ein, um ein Paket hinzuzufügen.",
      reading: "Dein WLED-Gerät wird gesucht …",
      found: "{name} · WLED {version} · {size} · {free} kB frei",
      foundNoRoom: "{name} · WLED {version} · {size}",
      unreachable: "Unter {address} hat nichts geantwortet. Ist dein WLED-Gerät an und in diesem Netzwerk?",
      notWled: "{address} hat geantwortet, aber nicht als WLED.",
      strip: {
        one: "Dieses WLED-Gerät steuert einen Streifen mit {count} LED. Die Pakete sind für LED-Matrizen.",
        other: "Dieses WLED-Gerät steuert einen Streifen mit {count} LEDs. Die Pakete sind für LED-Matrizen.",
      },
    },
    card: {
      count: { one: "{count} Animation", other: "{count} Animationen" },
      size: "Größe",
      add: "Hinzufügen",
      update: "Aktualisieren",
      fits: "Passt zu deinem WLED-Gerät ({size})",
      misfit: "Gemacht für {size}. Dein WLED-Gerät hat {device}.",
      added: "In deinen Effekt-Sets als {set}",
      newer: "Es gibt eine neuere Version.",
      show: { one: "Animation zeigen", other: "Alle {count} Animationen zeigen" },
      hide: "Animationen ausblenden",
      cover: "{pack} in {size}",
    },
    otherSizes: "Du brauchst ein Paket in einer anderen Größe, etwa 64 × 64? Frag auf {discord}, auf {github} oder per {email}.",
    links: {
      email: "E-Mail",
    },
    loadFailed: "Die Pakete konnten nicht geladen werden. Lade die Seite neu und versuch es noch einmal.",
    install: {
      back: "Zurück zu den Paketen",
      summary: "Überträgt {files} Animationsdateien ({kb} kB) und {presets} Presets auf dein WLED-Gerät unter {address} und legt {effects} Effekte in Tools als Effekt-Set {set} an.",
      summaryUpdate: "Überträgt {files} Animationsdateien ({kb} kB) und {presets} Presets erneut auf dein WLED-Gerät unter {address} und bringt die {effects} Effekte im Effekt-Set {set} auf den neuesten Stand.",
      yours: "Deine eigenen Presets bleiben, wie sie sind. Presets aus einer früheren Installation dieses Pakets werden auf den neuesten Stand gebracht.",
      start: "Auf mein WLED übertragen",
      steps: {
        read: "Dein WLED-Gerät wird gelesen …",
        upload: "Die Animationen werden übertragen: {done} von {count}",
        save: "Die Presets werden gespeichert …",
        check: "Wird geprüft …",
      },
      keepOpen: "Lass diesen Tab offen, bis alles fertig ist.",
      done: {
        one: "{pack} ist auf deinem WLED-Gerät, und sein Effekt ist im Effekt-Set {set}.",
        other: "{pack} ist auf deinem WLED-Gerät, und seine {count} Effekte sind im Effekt-Set {set}.",
      },
      plays: "Das Set spielt ab jetzt.",
      waits: "Gespielt wird weiter das Set {set}.",
      close: "Fertig",
      retry: "Noch einmal versuchen",
      saveBackup: "Alte Presets speichern",
    },
    errors: {
      unreachable: "Dein WLED-Gerät unter {address} hat nicht geantwortet. Ist es an und in diesem Netzwerk?",
      notWled: "{address} ist kein WLED-Gerät.",
      notMatrix: "Dein WLED-Gerät steuert einen Streifen. Die Pakete sind für LED-Matrizen.",
      effectMissing: "Deinem WLED-Gerät fehlt der Effekt {effect}, den das Paket braucht. Den gibt es ab WLED 0.15 auf einem ESP32.",
      presetsUnreadable: "Die presets.json deines WLED-Geräts lässt sich nicht lesen, darum wurde nichts geändert.",
      noSlots: "Das Paket braucht {needed} freie Preset-Nummern, und dein WLED-Gerät hat {free}.",
      noRoom: "Das Paket braucht {needed} kB, und dein WLED-Gerät hat {free} kB frei. Lösche Dateien, die du nicht brauchst, im Dateieditor von WLED ({address}/edit).",
      locked: "Dein WLED-Gerät ist mit einer PIN für die Einstellungen gesperrt. Entsperre es in den Einstellungen von WLED und versuch es dann noch einmal.",
      uploadFailed: "{file} konnte nicht auf dein WLED-Gerät übertragen werden. Prüfe die Verbindung und versuch es noch einmal.",
      restored: "Dein WLED-Gerät hat die neuen Presets nicht behalten, darum wurden die alten zurückgespielt.",
      notRestored: "Die Presets deines WLED-Geräts sind womöglich beschädigt. Speichere deine alten Presets und stelle sie in WLED unter Security & Updates wieder her.",
      packUnreadable: "Das Paket konnte nicht gelesen werden. Lade die Seite neu und versuch es noch einmal.",
    },
  },
```

- [ ] **Step 3: Dutch — in `locales/nl/wled.ts`, add inside `add` first:**

```ts
    packs: {
      label: "Animatiepakketten",
      hint: "Kant-en-klare animaties voor LED-matrixen",
    },
```

and after `preview`:

```ts
  packs: {
    section: {
      title: "Animatiepakketten",
      intro: "Kant-en-klare animaties voor LED-matrixen. Tools zet een pakket op je WLED-apparaat en voegt de effecten toe als een eigen set.",
      browse: "Pakketten bekijken",
    },
    dialog: {
      title: "Animatiepakketten",
      intro: "Kies een pakket en de grootte van je matrix. Tools zet de animaties als presets op je WLED-apparaat en voegt de effecten in Tools toe als effectenset.",
    },
    device: {
      label: "Je WLED-apparaat",
      hint: "Typ het adres van je WLED-apparaat om een pakket toe te voegen.",
      reading: "Je WLED-apparaat wordt gezocht…",
      found: "{name} · WLED {version} · {size} · {free} kB vrij",
      foundNoRoom: "{name} · WLED {version} · {size}",
      unreachable: "Er gaf niets antwoord op {address}. Staat je WLED-apparaat aan en zit het op dit netwerk?",
      notWled: "{address} gaf antwoord, maar niet als WLED.",
      strip: {
        one: "Dit WLED-apparaat stuurt een strip met {count} led aan. De pakketten zijn voor LED-matrixen.",
        other: "Dit WLED-apparaat stuurt een strip met {count} leds aan. De pakketten zijn voor LED-matrixen.",
      },
    },
    card: {
      count: { one: "{count} animatie", other: "{count} animaties" },
      size: "Grootte",
      add: "Toevoegen",
      update: "Bijwerken",
      fits: "Gemaakt voor je WLED-apparaat ({size})",
      misfit: "Gemaakt voor {size}. Je WLED-apparaat is {device}.",
      added: "In je effectensets als {set}",
      newer: "Er is een nieuwere versie.",
      show: { one: "Animatie tonen", other: "Alle {count} animaties tonen" },
      hide: "Animaties verbergen",
      cover: "{pack} in {size}",
    },
    otherSizes: "Wil je een pakket in een andere grootte, zoals 64 × 64? Vraag het op {discord}, op {github} of per {email}.",
    links: {
      email: "e-mail",
    },
    loadFailed: "De pakketten konden niet worden geladen. Laad de pagina opnieuw en probeer het nog eens.",
    install: {
      back: "Terug naar de pakketten",
      summary: "Zet {files} animatiebestanden ({kb} kB) en {presets} presets op je WLED-apparaat op {address}, en voegt {effects} effecten in Tools toe als de effectenset {set}.",
      summaryUpdate: "Zet {files} animatiebestanden ({kb} kB) en {presets} presets opnieuw op je WLED-apparaat op {address}, en werkt de {effects} effecten van de effectenset {set} bij.",
      yours: "Je eigen presets blijven zoals ze zijn. Presets van een eerdere installatie van dit pakket worden bijgewerkt.",
      start: "Op mijn WLED zetten",
      steps: {
        read: "Je WLED-apparaat wordt gelezen…",
        upload: "De animaties gaan naar je WLED-apparaat: {done} van {count}",
        save: "De presets worden opgeslagen…",
        check: "Controleren…",
      },
      keepOpen: "Houd dit tabblad open tot het klaar is.",
      done: {
        one: "{pack} staat op je WLED-apparaat, en het effect staat in de effectenset {set}.",
        other: "{pack} staat op je WLED-apparaat, en de {count} effecten staan in de effectenset {set}.",
      },
      plays: "De set speelt vanaf nu.",
      waits: "De set die speelt is nog steeds {set}.",
      close: "Klaar",
      retry: "Opnieuw proberen",
      saveBackup: "Oude presets opslaan",
    },
    errors: {
      unreachable: "Je WLED-apparaat op {address} gaf geen antwoord. Staat het aan en zit het op dit netwerk?",
      notWled: "{address} is geen WLED-apparaat.",
      notMatrix: "Je WLED-apparaat stuurt een strip aan. De pakketten zijn voor LED-matrixen.",
      effectMissing: "Je WLED-apparaat heeft geen {effect}-effect, en dat heeft het pakket nodig. Daarvoor is WLED 0.15 of nieuwer op een ESP32 nodig.",
      presetsUnreadable: "De presets.json van je WLED-apparaat is niet te lezen, dus er is niets veranderd.",
      noSlots: "Het pakket heeft {needed} vrije presetnummers nodig, en je WLED-apparaat heeft er {free}.",
      noRoom: "Het pakket heeft {needed} kB nodig, en je WLED-apparaat heeft {free} kB vrij. Verwijder bestanden die je niet nodig hebt in de bestandseditor van WLED ({address}/edit).",
      locked: "Je WLED-apparaat is vergrendeld met een pincode voor de instellingen. Ontgrendel het in de instellingen van WLED en probeer het dan opnieuw.",
      uploadFailed: "{file} kon niet op je WLED-apparaat worden gezet. Controleer de verbinding en probeer het opnieuw.",
      restored: "Je WLED-apparaat heeft de nieuwe presets niet bewaard, dus de oude zijn teruggezet.",
      notRestored: "De presets van je WLED-apparaat zijn misschien beschadigd. Sla je oude presets op en zet ze in WLED terug onder Security & Updates.",
      packUnreadable: "Het pakket kon niet worden gelezen. Laad de pagina opnieuw en probeer het nog eens.",
    },
  },
```

- [ ] **Step 4: `locales/same-as-english.json` — add `"wled.packs.device.foundNoRoom"` to both the `de` and the `nl` list, in alphabetical place (it reads the same: a name, "WLED", a version and a size).**

- [ ] **Step 5: Run the catalog check**

Run: `cd $REPO && yarn i18n:check locales/en/wled.ts locales/de/wled.ts locales/nl/wled.ts`
Expected: exit 0, no problems. If it names a German or Dutch text as "still the English", reword it rather than listing it, unless it is `foundNoRoom`.

- [ ] **Step 6: Commit**

```bash
cd $REPO && git add locales
git commit -m "feat(wled): the animation packs' texts in English, German and Dutch

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: One LED painter for both previews, and the pack preview

**Files:**
- Create: `composables/useLedCanvas.ts`, `components/Settings/Wled/PackPreview.vue`
- Modify: `components/Settings/Wled/PresetPreview.vue` (script: painting moves to the composable)
- Test: `$SCR/tests/sfc-check.mjs` (compiles changed SFCs)

**Interfaces:**
- Consumes: `ledGeometry`, `ledPainter`, `everyFrame`, `ROW_BOX`, `DIALOG_BOX` (utils/led-canvas.ts); `packPreview` (Task 6); `useSeenAtRest` (composables, auto-imported).
- Produces:
  - `useLedCanvas(canvas: Ref<HTMLCanvasElement | undefined>, preview: Ref<Preview | undefined>, box: Ref<{ width: number; height: number }>, still?: Ref<boolean>): void`
  - The component `<PackPreview :variant :preset :label size="row|cover" />`.

- [ ] **Step 1: Write `composables/useLedCanvas.ts`**

```ts
import type { Ref } from "vue";
import type { Preview } from "@/utils/wled-preview";

import { tryOnScopeDispose, useIntersectionObserver, useMediaQuery } from "@vueuse/core";
import { ref, watch } from "vue";

import { type LedPainter, everyFrame, ledGeometry, ledPainter } from "@/utils/led-canvas";

/**
 * Draws `preview` onto `canvas` as LEDs (utils/led-canvas.ts), at the biggest
 * size that fits `box`, and plays it while the canvas is on screen: one shared
 * animation-frame loop draws only the previews in view, and only when a frame
 * changes. With prefers-reduced-motion, or while `still`, the first frame stands.
 * WLED's previews of a device's presets (PresetPreview.vue) and of a pack's
 * (PackPreview.vue) both draw through it.
 */
export function useLedCanvas(canvas: Ref<HTMLCanvasElement | undefined>, preview: Ref<Preview | undefined>, box: Ref<{ width: number; height: number }>, still: Ref<boolean> = ref(false)): void {
  const visible = ref(false);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  let painter: LedPainter | undefined;
  let stop: (() => void) | undefined;
  let startedAt = 0;
  let shown = "";

  useIntersectionObserver(canvas, ([ entry ]) => {
    visible.value = entry?.isIntersecting ?? false;
  });

  // By the box's size: a measurement that says what was already read draws nothing again.
  watch([ canvas, preview, () => box.value.width, () => box.value.height ], () => {
    painter = undefined;
    if (!preview.value || !canvas.value) return;
    painter = ledPainter(canvas.value, ledGeometry(preview.value.layout, box.value));
    startedAt = performance.now();
    shown = "";
    draw(startedAt);
  }, { flush: "post" });

  watch([ visible, reducedMotion, still, preview ], () => {
    stop?.();
    stop = undefined;
    if (preview.value?.animated && visible.value && !reducedMotion.value && !still.value) stop = everyFrame(draw);
  });

  tryOnScopeDispose(() => stop?.());

  /** The frame for `now`, when it differs from the one showing. */
  function draw(now: number) {
    const current = preview.value;
    if (!current || !painter) return;
    const t = reducedMotion.value || still.value ? 0 : now - startedAt;
    const key = current.keyAt(t);
    if (key === shown) return;
    shown = key;
    painter.paint(current.pixelsAt(t));
  }
}
```

- [ ] **Step 2: Move `PresetPreview.vue`'s painting to it**

In `components/Settings/Wled/PresetPreview.vue`'s `<script setup>`:
1. Change the led-canvas import to `import { DIALOG_BOX, ROW_BOX } from "@/utils/led-canvas";`.
2. Delete `const visible = ref(false);` and `const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");`.
3. After the `message` computed, add:

```ts
/** The picture once it is read, for the painter. */
const preview = computed(() => (state.value.status === "ready" ? state.value.preview : undefined));
```

4. Delete the `let painter`, `let stop`, `let startedAt` and `let shown` lines, and keep `let run = 0;`.
5. Delete the `useIntersectionObserver(canvas, …)` call, both watchers that start with `// By the box's size` and with `watch([ visible, reducedMotion, () => props.still, state ]`, and the `draw` function.
6. Put this after the loading watcher (`watch([ () => (props.target ? … ), seen ], …)`):

```ts
useLedCanvas(canvas, preview, box, toRef(props, "still"));
```

7. Make `onBeforeUnmount` just `onBeforeUnmount(() => { run++; });` (the composable stops its own loop).

The template doesn't change. The `widthNow` function stays (the box uses it).

- [ ] **Step 3: Write `components/Settings/Wled/PackPreview.vue`**

```vue
<template>
  <!-- A cover takes its column's width; a row's preview sits in its cell beside the animation's name. -->
  <span ref="frame" class="min-w-0" :class="[size === 'cover' ? 'flex w-full' : 'inline-flex shrink-0']">
    <canvas v-if="preview" ref="canvas" :aria-label="label" class="block shrink-0 rounded-[3px]" role="img" :title="size === 'row' ? label : undefined" />
    <!-- Until it is drawn, the dark panel at the picture's size: nothing moves when it comes. -->
    <span v-else ref="pending" :aria-label="label" class="block shrink-0 rounded-[3px] bg-[rgb(10_10_12)]" role="img" :style="{ width: `${placeholder.width}px`, height: `${placeholder.height}px` }" />
  </span>
</template>

<script setup lang="ts">
import type { PackVariant } from "@/utils/wled-packs";
import type { Preview } from "@/utils/wled-preview";

import { DIALOG_BOX, ROW_BOX, ledGeometry } from "@/utils/led-canvas";
import { packPreview } from "@/utils/wled-pack-catalog";

const props = withDefaults(defineProps<{
  variant: PackVariant;
  /** The variant's own number for the preset. */
  preset: number;
  size?: "row" | "cover";
  /** Its accessible name: the animation's, or the pack's for a cover. */
  label: string;
}>(), {
  size: "row",
});

const frame = ref<HTMLElement>();
const canvas = ref<HTMLCanvasElement>();
const pending = ref<HTMLElement>();
const preview = shallowRef<Preview>();
/** Read and decoded once the list stops at it (composables/useSeenAtRest.ts), as a long list's previews are many. */
const seen = useSeenAtRest(pending);
const { width: frameWidth } = useElementSize(frame);
// A row's: the cell it sits in.
const { width: cellWidth } = useElementSize(computed(() => (props.size === "row" ? frame.value?.parentElement ?? undefined : undefined)));
let run = 0;

/** What the preview may take: a cover its column, a row its cell, never more than the box of its kind. */
const box = computed(() => {
  const area = props.size === "cover" ? DIALOG_BOX : ROW_BOX;
  const width = Math.floor(props.size === "cover" ? frameWidth.value : cellWidth.value) || area.width;
  return { width: Math.min(area.width, width), height: area.height };
});
const placeholder = computed(() => ledGeometry({ width: props.variant.width, height: props.variant.height }, box.value));

watch([ () => props.variant, () => props.preset, seen ], async () => {
  const mine = ++run;
  preview.value = undefined;
  if (!seen.value) return;
  const drawn = await packPreview(props.variant, props.preset);
  if (mine === run) preview.value = drawn?.preview;
}, { immediate: true });

useLedCanvas(canvas, preview, box);

onBeforeUnmount(() => {
  run++;
});
</script>
```

- [ ] **Step 4: Write the SFC check `$SCR/tests/sfc-check.mjs` and run it**

```js
// Compiles each named .vue file the way the dev build does, so a parse or compile error shows here and not as a "dead watcher".
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire("/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/package.json");
const sfc = require("vue/compiler-sfc");
let failed = false;
for (const file of process.argv.slice(2)) {
  const { descriptor, errors } = sfc.parse(readFileSync(file, "utf8"), { filename: file });
  if (errors.length) {
    failed = true;
    console.error(file, errors.map(String));
    continue;
  }
  try {
    sfc.compileScript(descriptor, { id: "x", inlineTemplate: true });
    console.log("ok", file);
  } catch (error) {
    failed = true;
    console.error(file, String(error));
  }
}
process.exit(failed ? 1 : 0);
```

Run: `cd $REPO && node $SCR/tests/sfc-check.mjs components/Settings/Wled/PresetPreview.vue components/Settings/Wled/PackPreview.vue`
Expected: `ok …` twice.

- [ ] **Step 5: Type-check the touched files**

Run (in the background, it takes 2–4 minutes): `cd $REPO && yarn compile > $SCR/compile.txt 2>&1; grep -c "error TS" $SCR/compile.txt; grep -E "useLedCanvas|PackPreview|PresetPreview|wled-pack|wled-upload|wled-packs" $SCR/compile.txt`
Expected: 12 errors (the baseline), and none in the files of this change.

- [ ] **Step 6: Commit**

```bash
cd $REPO && git add composables/useLedCanvas.ts components/Settings/Wled/PresetPreview.vue components/Settings/Wled/PackPreview.vue
git commit -m "feat(wled): draw a pack's presets with the previews' LED painter, now shared

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: The packs dialog

**Files:**
- Create: `components/Settings/Wled/PackCard.vue`, `components/Settings/Wled/PackInstall.vue`, `components/Settings/Wled/PacksDialog.vue`

**Interfaces:**
- Consumes: Tasks 2–8 (`packText`, `sizeLabel`, `sizeFor`, `findPackSet`, `addPackSet`, `updatePackSet`, `packEffects`, `packSetName`, `installPack`, `InstallState`, `deviceIo`, `probeDevice`, `loadPackIndex`, `loadPackVariant`, `PackPreview`); `listLibrarySets`, `librarySetLabel`, `activateLibrarySet` (utils/library-sets.ts); `deviceOrigin` (utils/wled-preview.ts); `useConfig`, `useI18n` (auto-imported).
- Produces: `<PacksDialog :show @close @added="(setId: string) => …" />`.

- [ ] **Step 1: Write `components/Settings/Wled/PackCard.vue`**

```vue
<template>
  <article class="rounded-[var(--ad-radius-lg)] border border-[var(--ad-border-subtle)] bg-white/[0.03] p-4 sm:p-5">
    <div class="mb-4 flex">
      <PackPreview v-if="variant" :label="t('wled.packs.card.cover', { pack: name, size: label })" :preset="current.cover" :variant="variant" size="cover" />
    </div>

    <h3 class="adt-section-title">
      <span>{{ name }}<span class="adt-section-count">&nbsp;·&nbsp;{{ t("wled.packs.card.count", { count: current.effects }) }}</span></span>
    </h3>
    <p class="mt-2 max-w-3xl text-sm text-[var(--ad-text-secondary)]">
      {{ description }}
    </p>

    <div class="mt-4 flex flex-wrap items-center gap-3">
      <AppRadioGroup
        @update:model-value="emit('update:size', String($event))"
        v-if="pack.sizes.length > 1"
        :aria-label="t('wled.packs.card.size')"
        :model-value="current.size"
        :options="sizeOptions"
        button-size="sm"
      />
      <span v-else class="adt-chip">{{ label }}</span>
      <AppButton @click="emit('add')" :disabled="!canAdd" auto class="ml-auto" size="sm">
        <span class="flex items-center gap-1">
          <span aria-hidden="true" class="text-lg" :class="[added ? 'icon-[material-symbols--refresh-rounded]' : 'icon-[material-symbols--add-rounded]']" />
          {{ added ? t("wled.packs.card.update") : t("wled.packs.card.add") }}
        </span>
      </AppButton>
    </div>

    <p v-if="fit" class="mt-3 flex items-center gap-1.5 text-sm" :class="[fit.ok ? 'text-[var(--ad-text-muted)]' : 'text-[var(--ad-warning)]']">
      <span aria-hidden="true" class="shrink-0" :class="[fit.ok ? 'icon-[material-symbols--check-circle-outline-rounded]' : 'icon-[material-symbols--warning-outline-rounded]']" />
      {{ fit.text }}
    </p>
    <p v-if="added" class="mt-1 text-sm text-[var(--ad-text-muted)]">
      {{ t("wled.packs.card.added", { set: added.name }) }}<template v-if="added.outdated">
        · {{ t("wled.packs.card.newer") }}
      </template>
    </p>

    <button @click="open = !open" :aria-expanded="open" class="mt-3 flex items-center gap-1 text-sm font-semibold text-[var(--ad-text-secondary)] hover:text-[var(--ad-text-primary)]" type="button">
      <span aria-hidden="true" class="text-lg" :class="[open ? 'icon-[material-symbols--expand-less-rounded]' : 'icon-[material-symbols--expand-more-rounded]']" />
      {{ open ? t("wled.packs.card.hide") : t("wled.packs.card.show", { count: current.effects }) }}
    </button>
    <ul v-if="open && variant" class="mt-3 border-t border-[var(--ad-border-subtle)]">
      <li v-for="effect in variant.effects" :key="effect.name" class="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)] items-center gap-x-3 gap-y-1 border-b border-[var(--ad-border-subtle)] py-2 sm:grid-cols-[minmax(0,12.5rem)_minmax(0,1fr)_minmax(0,1fr)]">
        <span class="flex min-w-0">
          <PackPreview :label="effect.name" :preset="effect.preset" :variant="variant" />
        </span>
        <span class="min-w-0 truncate text-sm font-semibold text-[var(--ad-text-primary)]">{{ effect.name }}</span>
        <TriggerChips :max="3" :triggers="effect.triggers" :wrap="false" class="col-span-2 sm:col-span-1" />
      </li>
    </ul>
  </article>
</template>

<script setup lang="ts">
import AppButton from "../../AppButton.vue";
import AppRadioGroup from "../../AppRadioGroup.vue";
import TriggerChips from "../Library/TriggerChips.vue";

import PackPreview from "./PackPreview.vue";

import type { PackInfo, PackVariant } from "@/utils/wled-packs";

import { loadPackVariant } from "@/utils/wled-pack-catalog";
import { packText, sizeLabel } from "@/utils/wled-packs";

const props = defineProps<{
  pack: PackInfo;
  /** The size picked, by its key: "64x8". */
  size: string;
  /** The matrix of the WLED that answered, once one has. */
  device?: { width: number; height: number };
  /** The effect set this pack in this size was added as, if it was, and whether the catalog has a newer version. */
  added?: { name: string; outdated: boolean };
  canAdd: boolean;
}>();

const emit = defineEmits<{ "update:size": [ size: string ]; "add": [] }>();

const { t, language } = useI18n();

const open = ref(false);
const variant = shallowRef<PackVariant>();

const current = computed(() => props.pack.sizes.find(size => size.size === props.size) ?? props.pack.sizes[0]);
const name = computed(() => packText(props.pack.name, language.value));
const description = computed(() => packText(props.pack.description, language.value));
const label = computed(() => sizeLabel(current.value));
const sizeOptions = computed(() => props.pack.sizes.map(size => ({ label: sizeLabel(size), value: size.size })));
/** Whether the size picked is the WLED's: said once a WLED has answered. Another size can still be added. */
const fit = computed(() => {
  if (!props.device) return undefined;
  const ok = props.device.width === current.value.width && props.device.height === current.value.height;
  return {
    ok,
    text: ok ? t("wled.packs.card.fits", { size: label.value }) : t("wled.packs.card.misfit", { size: label.value, device: sizeLabel(props.device) }),
  };
});

watch(() => current.value.file, async (file) => {
  variant.value = undefined;
  const loaded = await loadPackVariant(file);
  if (file === current.value.file) variant.value = loaded;
}, { immediate: true });
</script>
```

- [ ] **Step 2: Write `components/Settings/Wled/PackInstall.vue`**

```vue
<template>
  <div class="space-y-5">
    <div class="flex flex-col items-start gap-3">
      <PackPreview v-if="variant" :label="t('wled.packs.card.cover', { pack: name, size: label })" :preset="size.cover" :variant="variant" size="cover" />
      <h3 class="adt-section-title">
        <span>{{ name }}<span class="adt-section-count">&nbsp;·&nbsp;{{ label }}</span></span>
      </h3>
    </div>

    <template v-if="state.phase === 'confirm'">
      <p v-if="updating" class="text-sm text-[var(--ad-text-secondary)]">
        {{ t("wled.packs.install.summaryUpdate", { files: size.gifs, kb: kilobytes, presets: size.presets, address: host, effects: size.effects, set }) }}
      </p>
      <p v-else class="text-sm text-[var(--ad-text-secondary)]">
        {{ t("wled.packs.install.summary", { files: size.gifs, kb: kilobytes, presets: size.presets, address: host, effects: size.effects, set }) }}
      </p>
      <p class="text-sm text-[var(--ad-text-muted)]">
        {{ t("wled.packs.install.yours") }}
      </p>
      <AppAlert v-if="misfit" compact variant="warning">
        {{ misfit }}
      </AppAlert>
    </template>

    <div v-else-if="progress" aria-live="polite" class="space-y-3">
      <p class="text-sm text-[var(--ad-text-secondary)]">
        {{ stepText }}
      </p>
      <div :aria-label="stepText" :aria-valuemax="progress.total" :aria-valuenow="progress.done" aria-valuemin="0" class="h-2 overflow-hidden rounded-full bg-white/10" role="progressbar">
        <div class="h-full rounded-full bg-[var(--ad-action-primary)] transition-[width] duration-300" :style="{ width: `${Math.round((progress.done / progress.total) * 100)}%` }" />
      </div>
      <p class="text-sm text-[var(--ad-text-muted)]">
        {{ t("wled.packs.install.keepOpen") }}
      </p>
    </div>

    <AppAlert v-else-if="done" compact variant="success">
      {{ t("wled.packs.install.done", { pack: name, count: done.count, set: done.set }) }}
      {{ done.inUse ? t("wled.packs.install.plays") : t("wled.packs.install.waits", { set: done.playing }) }}
    </AppAlert>

    <AppAlert v-else-if="failureText" compact variant="error">
      {{ failureText }}
    </AppAlert>
  </div>
</template>

<script setup lang="ts">
import AppAlert from "../../AppAlert.vue";

import PackPreview from "./PackPreview.vue";

import type { InstallState } from "@/utils/wled-pack-install";
import type { PackInfo, PackSize, PackVariant } from "@/utils/wled-packs";

import { packText, sizeLabel } from "@/utils/wled-packs";

const props = defineProps<{
  pack: PackInfo;
  size: PackSize;
  variant?: PackVariant;
  /** The WLED's address, its origin: http://192.168.0.227. */
  address: string;
  /** Its matrix. */
  device: { width: number; height: number };
  /** The effect set's name: the new set's, or the one an update brings up to date. */
  set: string;
  updating: boolean;
  state: InstallState;
}>();

const { t, language } = useI18n();

const name = computed(() => packText(props.pack.name, language.value));
const label = computed(() => sizeLabel(props.size));
const host = computed(() => hostOf(props.address));
const kilobytes = computed(() => Math.ceil(props.size.bytes / 1000));
const misfit = computed(() => (props.device.width === props.size.width && props.device.height === props.size.height
  ? ""
  : t("wled.packs.card.misfit", { size: label.value, device: sizeLabel(props.device) })));
const progress = computed(() => (props.state.phase === "running" ? props.state.progress : undefined));
const done = computed(() => (props.state.phase === "done" ? props.state : undefined));
const stepText = computed(() => {
  const now = progress.value;
  if (!now) return "";
  if (now.step === "upload") return t("wled.packs.install.steps.upload", { done: now.done + 1, count: props.size.gifs });
  if (now.step === "save") return t("wled.packs.install.steps.save");
  if (now.step === "check") return t("wled.packs.install.steps.check");
  return t("wled.packs.install.steps.read");
});
const failureText = computed(() => {
  if (props.state.phase !== "failed") return "";
  const failure = props.state.failure;
  switch (failure.reason) {
    case "unreachable": return t("wled.packs.errors.unreachable", { address: host.value });
    case "not-wled": return t("wled.packs.errors.notWled", { address: host.value });
    case "not-matrix": return t("wled.packs.errors.notMatrix");
    case "effect-missing": return t("wled.packs.errors.effectMissing", { effect: failure.effect });
    case "presets-unreadable": return t("wled.packs.errors.presetsUnreadable");
    case "no-slots": return t("wled.packs.errors.noSlots", { needed: failure.needed, free: failure.free });
    case "no-room": return t("wled.packs.errors.noRoom", { needed: failure.neededKb, free: failure.freeKb, address: props.address });
    case "locked": return t("wled.packs.errors.locked");
    case "upload-failed": return t("wled.packs.errors.uploadFailed", { file: failure.file });
    case "restored": return t("wled.packs.errors.restored");
    case "not-restored": return t("wled.packs.errors.notRestored");
    case "pack-unreadable": return t("wled.packs.errors.packUnreadable");
  }
  return "";
});

function hostOf(address: string): string {
  try {
    return new URL(address).host;
  } catch {
    return address;
  }
}
</script>
```

- [ ] **Step 3: Write `components/Settings/Wled/PacksDialog.vue`**

```vue
<template>
  <!-- While a pack goes on the WLED, nothing closes the dialog: its progress, and the set it adds at the end, would be out of sight. -->
  <AppModal @close="close" :disable-backdrop-click="running" :hide-close-button="running" :show="show" :title="t('wled.packs.dialog.title')" ghost-close size="lg">
    <div v-if="!chosen" class="space-y-6">
      <p class="text-sm text-[var(--ad-text-muted)]">
        {{ t("wled.packs.dialog.intro") }}
      </p>

      <div>
        <AppInput id="wled-pack-address" v-model="address" :label="t('wled.packs.device.label')" :placeholder="ADDRESS_EXAMPLE">
          <template #icon>
            <span class="icon-[material-symbols--router-outline-rounded]" />
          </template>
        </AppInput>
        <p aria-live="polite" class="adt-field-hint flex items-center gap-1.5" :class="[probeWarns ? '!text-[var(--ad-warning)]' : '']">
          <span v-if="probe.state === 'reading'" aria-hidden="true" class="icon-[material-symbols--progress-activity] shrink-0 motion-safe:animate-spin" />
          {{ probeText }}
        </p>
      </div>

      <AppAlert v-if="catalog === 'failed'" compact variant="error">
        {{ t("wled.packs.loadFailed") }}
      </AppAlert>
      <div v-else-if="catalog" class="space-y-4">
        <PackCard
          @add="choose(pack)"
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

    <div v-else class="space-y-5">
      <button @click="back" :disabled="running" class="flex items-center gap-1 text-sm font-semibold text-[var(--ad-text-secondary)] hover:text-[var(--ad-text-primary)] disabled:opacity-45" type="button">
        <span aria-hidden="true" class="icon-[material-symbols--arrow-back-rounded] text-lg" />
        {{ t("wled.packs.install.back") }}
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
      <AppButton v-if="!chosen" @click="close" auto>
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
        <AppButton v-if="!state.inUse" @click="useAdded" auto>
          {{ t("library.sets.use") }}
        </AppButton>
        <AppButton @click="close" auto type="primary">
          {{ t("wled.packs.install.close") }}
        </AppButton>
      </template>
      <template v-else>
        <AppButton v-if="backup" @click="saveBackup" auto>
          {{ t("wled.packs.install.saveBackup") }}
        </AppButton>
        <AppButton @click="back" auto>
          {{ t("wled.packs.install.back") }}
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
import AppInput from "../../AppInput.vue";
import AppModal from "../../AppModal.vue";
import AppTrans from "../../AppTrans.vue";

import PackCard from "./PackCard.vue";
import PackInstall from "./PackInstall.vue";

import type { InstallState } from "@/utils/wled-pack-install";
import type { DeviceSummary, PackIndex, PackInfo, PackSize, PackVariant } from "@/utils/wled-packs";

import { activateLibrarySet, librarySetLabel, listLibrarySets } from "@/utils/library-sets";
import { WledType } from "@/utils/storage";
import { deviceIo, loadPackIndex, loadPackVariant, probeDevice } from "@/utils/wled-pack-catalog";
import { installPack } from "@/utils/wled-pack-install";
import { addPackSet, findPackSet, packEffects, packSetName, packText, sizeFor, sizeLabel, updatePackSet } from "@/utils/wled-packs";
import { deviceOrigin } from "@/utils/wled-preview";

const props = defineProps<{ show: boolean }>();

const emit = defineEmits<{ close: []; added: [ id: string ] }>();

/**
 * Where to ask for a pack in another size. Discord is the Autodarts community's
 * server, which the site's own docs link to: Tools has none of its own.
 */
const DISCORD_URL = "https://discord.gg/autodarts";
const GITHUB_URL = "https://github.com/creazy231/tools-for-autodarts/issues/new";
const EMAIL_URL = "mailto:info@tobias-thiele.de";
/** An example address: the same in every language. */
const ADDRESS_EXAMPLE = "192.168.0.69";
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
/** The WLED's presets.json from before an install that couldn't put it back. */
const backup = ref("");
/** Which address read is the latest: an older one's answer is dropped. */
let probing = 0;

const origin = computed(() => deviceOrigin(address.value) ?? "");
/** The matrix that answered: a strip, or nothing, can't take a pack. */
const matrix = computed(() => (probe.value.state === "found" && probe.value.device.layout.height > 1 ? probe.value.device.layout : undefined));
const running = computed(() => state.value.phase === "running");
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
  if (open) void openDialog();
}, { immediate: true });

watchDebounced(origin, () => void tryAddress(), { debounce: PROBE_DEBOUNCE_MS });

/** Opening: back at the packs, the address of the user's effects when none is typed, and the catalog, once. */
async function openDialog() {
  chosen.value = undefined;
  state.value = { phase: "confirm" };
  backup.value = "";
  const before = address.value;
  if (!before) address.value = usualAddress();
  // A changed address is tried by its watcher.
  if (address.value === before) void tryAddress();
  if (!catalog.value || catalog.value === "failed") catalog.value = (await loadPackIndex()) ?? "failed";
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
  if (!fx || !device) return;
  const size = sizeOf(pack);
  const existing = findPackSet(fx, pack.id, size.size);
  const set = existing?.name ?? packSetName(packText(pack.name, language.value), sizeLabel(size), listLibrarySets(toRaw(fx), "effects"), t("library.sets.defaultName"));
  chosen.value = { pack, size, device, set, update: existing?.id };
  chosenVariant.value = undefined;
  state.value = { phase: "confirm" };
  backup.value = "";
  void loadPackVariant(size.file).then((variant) => {
    if (chosen.value?.size === size) chosenVariant.value = variant;
  });
}

/** Puts the chosen pack on the WLED, then into Tools. */
async function start() {
  const pick = chosen.value;
  const target = origin.value;
  if (!pick || !target || running.value) return;
  backup.value = "";
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
    const { ok: _ok, ...failure } = result;
    if (failure.reason === "not-restored") backup.value = failure.backup;
    state.value = { phase: "failed", failure };
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
  if (running.value) return;
  chosen.value = undefined;
  state.value = { phase: "confirm" };
  backup.value = "";
}

function close() {
  if (!running.value) emit("close");
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
```

- [ ] **Step 4: Check the three SFCs compile, the texts and the types**

Run: `cd $REPO && node $SCR/tests/sfc-check.mjs components/Settings/Wled/PackCard.vue components/Settings/Wled/PackInstall.vue components/Settings/Wled/PacksDialog.vue`
Expected: `ok …` three times.

Run: `cd $REPO && yarn i18n:check components/Settings/Wled/PackCard.vue components/Settings/Wled/PackInstall.vue components/Settings/Wled/PacksDialog.vue components/Settings/Wled/PackPreview.vue`
Expected: exit 0.

Run: `cd $REPO && yarn compile > $SCR/compile.txt 2>&1; grep -c "error TS" $SCR/compile.txt; grep -E "Pack(Card|Install|sDialog|Preview)|wled-pack|useLedCanvas" $SCR/compile.txt`
Expected: 12, and nothing from these files.

- [ ] **Step 5: Commit**

```bash
cd $REPO && git add components/Settings/Wled/PackCard.vue components/Settings/Wled/PackInstall.vue components/Settings/Wled/PacksDialog.vue
git commit -m "feat(wled): the animation packs dialog: the WLED, the packs, and putting one on

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: The way in from the WLED settings

**Files:**
- Modify: `components/Settings/Wled.vue`

**Interfaces:**
- Consumes: `PacksDialog` (Task 9), `loadPackIndex` (Task 6), `viewedId` from `useLibrarySets` (existing).

- [ ] **Step 1: The section, after the Options section and before `<LibrarySets`**

```vue
        <section class="mb-10">
          <div class="flex min-h-12 items-center justify-between gap-3">
            <!-- One run of text, as the other headings, so a wrapped heading keeps its count after its last word. -->
            <h3 class="adt-section-title">
              <span>{{ t("wled.packs.section.title") }}<span v-if="packCount" class="adt-section-count">&nbsp;·&nbsp;{{ packCount }}</span></span>
            </h3>
            <AppButton @click="openPacks" auto size="sm">
              <span class="flex items-center gap-1">
                <span class="icon-[material-symbols--library-add-outline-rounded] text-lg" />
                {{ t("wled.packs.section.browse") }}
              </span>
            </AppButton>
          </div>
          <p class="mt-1 max-w-3xl text-sm text-[var(--ad-text-muted)]">
            {{ t("wled.packs.section.intro") }}
          </p>
        </section>
```

- [ ] **Step 2: The empty list's button — in `<template #empty>`, after the CSV button:**

```vue
            <AppButton @click="openPacks" auto>
              {{ t("wled.add.packs.label") }}
            </AppButton>
```

- [ ] **Step 3: The dialog, after the Delete all `AppModal`:**

```vue
    <PacksDialog @added="showAddedSet" @close="showPacks = false" :show="showPacks" />
```

- [ ] **Step 4: The script**

1. Imports: after `import PresetPreview from "./Wled/PresetPreview.vue";` add `import PacksDialog from "./Wled/PacksDialog.vue";`. After the `wled-device` import add `import { loadPackIndex } from "@/utils/wled-pack-catalog";`.
2. Refs, after `const showDeleteAllModal = ref(false);`:

```ts
// Animation packs
const attrs = useAttrs();
const showPacks = ref(false);
/** How many packs there are, for the section's heading: read by the panel, not by the card. */
const packCount = ref(0);
```

3. In `addActions`, the first item:

```ts
  { label: t("wled.add.packs.label"), hint: t("wled.add.packs.hint"), icon: "icon-[material-symbols--library-add-outline-rounded]", action: openPacks },
```

4. Lifecycle, before the first `watchDebounced`:

```ts
onMounted(async () => {
  if (attrs["data-feature-index"]) return;
  packCount.value = (await loadPackIndex())?.packs.length ?? 0;
});
```

5. Methods, after `openImportCSVModal`:

```ts
function openPacks() {
  showPacks.value = true;
}

/** A pack's set was added or brought up to date: the list shows it. */
function showAddedSet(id: string) {
  viewedId.value = id;
}
```

- [ ] **Step 5: Check**

Run: `cd $REPO && node $SCR/tests/sfc-check.mjs components/Settings/Wled.vue && yarn i18n:check components/Settings/Wled.vue && yarn lint`
Expected: `ok`, exit 0, and `yarn lint` prints no problem in the files this change added or touched (new files clean).

- [ ] **Step 6: Commit**

```bash
cd $REPO && git add components/Settings/Wled.vue
git commit -m "feat(wled): open the animation packs from the WLED settings, the Add menu and the empty list

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: End to end in the yarn dev Chrome, against a stand-in WLED

**Files:**
- Create: `$SCR/e2e/wled-standin.mjs`, `$SCR/e2e/cdp.mjs`, and the scenario scripts written while running (in `$SCR/e2e/`)

This task finds bugs; each one found goes through superpowers:systematic-debugging and gets a failing test in the owning task's test file before its fix, committed as `fix(wled): …`.

- [ ] **Step 1: Write the stand-in `$SCR/e2e/wled-standin.mjs`**

```js
#!/usr/bin/env node
// A stand-in for a WLED 16 on the LAN, for the animation packs' end-to-end checks. It keeps files in memory and
// answers /json/info, /json/eff, /json/cfg, /edit?func=list, its files and /upload as WLED's own code does, with CORS on
// everything, and logs a JSON line per request. Bind it to the Mac's LAN address, never 127.0.0.1: Chrome's Local Network
// Access holds loopback behind a permission the dev profile hasn't granted.
// node wled-standin.mjs <host> <port> <log> [--matrix 64x8] [--fs 1400:300] [--presets file] [--locked]
import { appendFileSync, readFileSync } from "node:fs";
import http from "node:http";

const [ host, port, log, ...flags ] = process.argv.slice(2);
const option = (name, fallback) => {
  const at = flags.indexOf(`--${name}`);
  return at >= 0 ? flags[at + 1] : fallback;
};
const [ width, height ] = option("matrix", "64x8").split("x").map(Number);
const [ total, used ] = option("fs", "1400:300").split(":").map(Number);
let locked = flags.includes("--locked");
const files = new Map();
const initial = option("presets", "");
if (initial) files.set("/presets.json", readFileSync(initial));

const EFFECTS = Array.from({ length: 120 }, (_, id) => `FX ${id}`);
EFFECTS[0] = "Solid";
EFFECTS[53] = "Image";
EFFECTS[77] = "Copy Segment";

const usedKb = () => used + Math.ceil([ ...files.values() ].reduce((sum, data) => sum + Math.ceil(data.length / 4096) * 4096, 0) / 1000);

http.createServer((request, response) => {
  const chunks = [];
  request.on("data", chunk => chunks.push(chunk));
  request.on("end", () => {
    const body = Buffer.concat(chunks);
    const url = new URL(request.url, `http://${host}:${port}`);
    appendFileSync(log, `${JSON.stringify({ at: Date.now(), method: request.method, path: url.pathname + url.search, bytes: body.length, origin: request.headers.origin ?? "" })}\n`);
    const send = (status, data, type = "application/json") => {
      response.writeHead(status, { "Content-Type": type, "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "*", "Access-Control-Allow-Headers": "*" });
      response.end(data);
    };
    if (request.method === "OPTIONS") return send(200, "");
    if (url.pathname === "/__state") return send(200, JSON.stringify({ locked, files: Object.fromEntries([ ...files ].map(([ name, data ]) => [ name, data.length ])) }));
    if (url.pathname === "/__file") return files.has(url.searchParams.get("name")) ? send(200, files.get(url.searchParams.get("name")), "application/octet-stream") : send(404, "{}");
    if (url.pathname === "/__lock") {
      locked = url.searchParams.get("on") === "1";
      return send(200, "{}");
    }
    if (url.pathname === "/json/info") return send(200, JSON.stringify({ ver: "16.0.1", name: "WLED-Standin", leds: { count: width * height, matrix: height > 1 ? { w: width, h: height } : undefined }, fs: { u: usedKb(), t: total }, ip: host }));
    if (url.pathname === "/json/eff") return send(200, JSON.stringify(EFFECTS));
    if (url.pathname === "/json/cfg") return send(200, JSON.stringify({ hw: { led: { matrix: { panels: width === 64 ? [ { x: 0, y: 0, w: 32, h: height }, { x: 32, y: 0, w: 32, h: height } ] : [ { x: 0, y: 0, w: width, h: height } ] } } } }));
    if (url.pathname === "/edit" && url.searchParams.get("func") === "list") return send(200, JSON.stringify([ ...files ].map(([ name, data ]) => ({ name: name.slice(1), type: "file", size: data.length }))));
    if (url.pathname === "/edit" && url.searchParams.get("func") === "edit") {
      const data = files.get(url.searchParams.get("path") ?? "");
      return data ? send(200, data, "application/octet-stream") : send(404, "{}");
    }
    if (url.pathname === "/upload" && request.method === "POST") {
      if (locked) return send(401, "Unlock settings using PIN code!", "text/plain");
      const part = parseMultipart(body, request.headers["content-type"] ?? "");
      if (!part) return send(400, "bad upload", "text/plain");
      files.set(part.filename.startsWith("/") ? part.filename : `/${part.filename}`, part.content);
      return send(200, "File Uploaded!", "text/plain");
    }
    if (request.method === "GET") {
      const data = files.get(decodeURIComponent(url.pathname));
      return data ? send(200, data, url.pathname.endsWith(".gif") ? "image/gif" : "application/json") : send(404, "{}");
    }
    return send(200, "{}");
  });
}).listen(Number(port), host, () => console.log(`stand-in on http://${host}:${port}`));

/** The `data` part of a multipart body: its file name and bytes. */
function parseMultipart(body, contentType) {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType);
  if (!match) return undefined;
  const marker = Buffer.from(`--${match[1] ?? match[2]}`);
  let at = body.indexOf(marker);
  while (at !== -1) {
    const next = body.indexOf(marker, at + marker.length);
    if (next === -1) return undefined;
    const part = body.subarray(at + marker.length + 2, next - 2);
    const split = part.indexOf("\r\n\r\n");
    const head = part.subarray(0, split).toString("utf8");
    if (/name="data"/.test(head)) {
      const filename = /filename="([^"]*)"/.exec(head)?.[1];
      if (filename !== undefined) return { filename, content: part.subarray(split + 4) };
    }
    at = next;
  }
  return undefined;
}
```

- [ ] **Step 2: Write the raw CDP helper `$SCR/e2e/cdp.mjs`**

```js
// Raw CDP to the yarn dev Chrome (Playwright's connectOverCDP hangs on Chrome 155). One browser socket, flat sessions.
export async function connect(port = 9222) {
  const { webSocketDebuggerUrl } = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  const socket = new WebSocket(webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  let next = 0;
  const pending = new Map();
  const listeners = new Set();
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject, timer } = pending.get(message.id);
      clearTimeout(timer);
      pending.delete(message.id);
      if (message.error) reject(new Error(`${message.error.message}`));
      else resolve(message.result);
      return;
    }
    for (const listener of listeners) listener(message);
  };
  function send(method, params = {}, sessionId = undefined, timeoutMs = 30_000) {
    return new Promise((resolve, reject) => {
      const id = ++next;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`${method} timed out`));
      }, timeoutMs);
      pending.set(id, { resolve, reject, timer });
      socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
  return { send, listen: listener => listeners.add(listener), close: () => socket.close() };
}

/** A tab of our own, foreground (the site renders its shell only there), with its page world and the extension's isolated world. */
export async function openTab(cdp, { init = "" } = {}) {
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank", background: false });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  const isolated = new Map();
  cdp.listen((message) => {
    if (message.sessionId !== sessionId || message.method !== "Runtime.executionContextCreated") return;
    const context = message.params.context;
    if (context.auxData?.type === "isolated" && context.origin?.startsWith("chrome-extension://")) isolated.set(context.auxData.frameId, context.id);
  });
  await cdp.send("Page.enable", {}, sessionId);
  await cdp.send("Runtime.enable", {}, sessionId);
  if (init) await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: init }, sessionId);
  const evaluate = async (expression, contextId = undefined) => {
    const { result, exceptionDetails } = await cdp.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, ...(contextId ? { contextId } : {}) }, sessionId);
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
    return result.value;
  };
  return {
    targetId,
    sessionId,
    goto: url => cdp.send("Page.navigate", { url }, sessionId),
    evaluate,
    /** In the extension's content-script world, where chrome.storage is. */
    isolated: expression => evaluate(expression, [ ...isolated.values() ].at(-1)),
    screenshot: async () => Buffer.from((await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId)).data, "base64"),
    viewport: (width, height) => cdp.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false }, sessionId),
    click: async (x, y) => {
      await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 }, sessionId);
      await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 }, sessionId);
    },
    close: () => cdp.send("Target.closeTarget", { targetId }),
  };
}

/** In the page: every element matching `selector` in the document and every open shadow root, as `window.__deep(selector)`. */
export const DEEP = `window.__deep = (selector) => { const roots = (root) => [ root, ...[ ...root.querySelectorAll("*") ].filter(element => element.shadowRoot).flatMap(element => roots(element.shadowRoot)) ]; return roots(document).flatMap(root => [ ...root.querySelectorAll(selector) ]); };`;
```

- [ ] **Step 3: Start the stand-in and yarn dev**

1. Run: `ipconfig getifaddr en0` (the LAN address, `$LAN`), then in the background: `node $SCR/e2e/wled-standin.mjs $LAN 18095 $SCR/e2e/standin.log --matrix 64x8`. Then `curl -s http://$LAN:18095/json/info` answers with the matrix.
2. Check `ListAgents` for another session on this repo, and `curl -s :9222/json/list` for a running dev Chrome. If none runs, start it with stdin held open (yarn dev exits on EOF):

```sh
cd $REPO && rm -f $SCR/devfifo && mkfifo $SCR/devfifo && ( sleep 100000 > $SCR/devfifo & ) && nohup yarn dev < $SCR/devfifo > $SCR/dev.log 2>&1 &
```

Wait for `curl -s http://127.0.0.1:9222/json/version` to answer (up to ~60 s).
3. Check that the build has the catalog: `ls .output/chrome-mv3-dev/wled-packs/` lists `index.json` and `gifs`. If not, copy it: `cp -R public/wled-packs .output/chrome-mv3-dev/` (WXT's dev build doesn't pick up new public files).
4. Back up the stored config before anything: in a tab's isolated world, `chrome.storage.local.get("config-2-0-0")`, saved to `$SCR/e2e/config-backup.json`.

- [ ] **Step 4: Run the checks, in a tab of our own** (seed `adt:last-visited-url` = `https://play.autodarts.com/tools` and `adt:active-tab` = `"3"` through `init`, open `https://play.autodarts.com/`, wait ~4 s, `.click()` the WLED card's `div.absolute.cursor-pointer` found through `__deep`). For each check, record what was seen:

| # | Do | Expect |
|---|---|---|
| 1 | Open the WLED panel | The **Animation packs** section, with "· 2" in its heading, sits before the effect sets. **Add** lists *Animation packs* first |
| 2 | **Browse packs** | The dialog opens: the address field and two cards with animated covers (Standard's AD 180, Halloween's idle). "Need a pack in another size…" has its three links |
| 3 | Type `$LAN:18095` | After ~0.5 s: "WLED-Standin · WLED 16.0.1 · 64 × 8 · … kB free". Both cards have 64 × 8 picked, say "Made for your WLED (64 × 8)", and **Add** is on |
| 4 | Pick 32 × 8 on Standard | "Made for 32 × 8. Your WLED is 64 × 8." in the warning colour. Pick 64 × 8 again |
| 5 | **Show all 89 animations** | Rows with previews, names and chips. Previews come in as the list stops |
| 6 | **Add** on Standard | Install view with the summary: "Puts 93 animation files (262 kB) and 94 presets … as the effect set Standard" |
| 7 | **Put it on my WLED**; during the uploads, click the backdrop | The progress goes through every file. The backdrop click does nothing and there is no × |
| 8 | Done | "Standard is on your WLED, and its 89 effects are in the effect set Standard", then "plays from now on" if the set in use was empty, or **Use this set** |
| 9 | Compare the stand-in with the catalog | `/__state` lists `/presets.json` and the 93 GIFs. Every GIF is byte-identical to `public/wled-packs/gifs/` (`/__file`). `presets.json` parses to the variant's presets at their own numbers (or as the plan moved them), in WLED's layout. The log shows only GET and POST /upload, with origin `chrome-extension://…` |
| 10 | Close the dialog | The list shows the set *Standard* with its 89 effects. Each row's preview is drawn from the stand-in: the mirrored ones copy their left half |
| 11 | Config | The isolated world's `chrome.storage.local` holds `wledFx.sets[…]` with `pack: { id: "standard", size: "64x8", version }` |
| 12 | Add Halloween 64 × 8 | Its shared presets ("AD hold", "AD Takeout", the copies' sources) keep their numbers, and the new set is *Halloween*, not in use |
| 13 | Open the dialog again | Standard's card says **Update** and "In your effect sets as Standard". **Update** runs again and leaves `presets.json` identical. The set's effects keep their on/off (switch one off first) |
| 14 | `/__lock?on=1`, then **Update** | "Your WLED is locked with a settings PIN…", and nothing changes. Unlock again |
| 15 | Restart the stand-in with `--fs 400:390`, then **Add** | "The pack needs … kB, and your WLED has … kB free…", and nothing is uploaded |
| 16 | Type an address nothing answers at, then `$LAN:18095/json` | "Nothing answered at …", then the WLED again. **Add** is off while nothing answers |
| 17 | Restart the stand-in with `--matrix 300x1` | "This WLED drives a strip of 300 LEDs…" in the warning colour; **Add** is off |
| 18 | Viewport 390 × 844, reloaded at that width | The dialog, the cards and the install view fit without sideways scrolling, and the covers shrink to the column |
| 19 | Site language German, then Dutch (localStorage `autodarts.settings.language`, reload) | Every text of the dialog is German, then Dutch. Pack names and descriptions follow |
| 20 | During an install, write the config from the service worker (switch `wledFx.onlyOnce`) | After the install the set is added and `onlyOnce` keeps the service worker's value |

Screenshots of 2, 3, 6, 7, 8 and 10 at 1600 px, and of 18, go to `$SCR/e2e/shots/`.

- [ ] **Step 5: Restore and leave**

Write the backed-up `config-2-0-0` back (only `wledFx` if another session wrote other keys meanwhile). Reset `adt:last-visited-url` and `urlstatus` to the home page. Close our tabs, stop the stand-in, and leave yarn dev running for the user.

- [ ] **Step 6: Commit any fixes made along the way** (each fix with its test, as said above).

---

### Task 12: Docs and release checks

**Files:**
- Modify: `README.md`, `CHANGELOG.md`

- [ ] **Step 1: README — in "💡 WLED Integration" › "Configuration Options", after the *Effect sets* bullet, add:**

```md
- **Animation packs**: Ready-made animations for LED matrices, put on your WLED as presets and added as an effect set in one go. See [Animation packs](#animation-packs)
```

and after the "#### Effect sets" subsection, add:

```md
#### Animation packs
Ready-made animations for LED matrices: Tools puts a pack's animations on your WLED as presets and adds their effects, triggers and all, as an effect set. Open them from **Animation packs** in the WLED settings, or from **Add › Animation packs**.

- **The packs**:
  - *Standard*: 180s, bull, busts, leg and match wins, Shanghai to Nelson, the lobby and your board, many of them in two looks picked at random.
  - *Halloween*: plays the Standard animations for the moments it has none of its own.
  - Each comes for a 32 × 8 matrix (one panel) and a 64 × 8 one (two panels side by side, with animations across both). Sizes are width × height, as WLED's 2D settings put them
- **Your WLED**: Type its address, such as `192.168.0.69`. The dialog shows what answered: its name, its WLED version, its matrix and its free space. Each card picks your matrix's size, shows a preview, and lists every animation with its triggers under **Show all … animations**
- **Add**: Puts the pack's GIFs and presets on your WLED, then adds its effects as a new effect set named after the pack.
  - The set plays at once when the set in use has no effects; otherwise **Use this set** switches to it.
  - Keep the tab open while it runs: an ESP32 takes a while for the files
- **Your presets stay**: Tools reads your WLED's presets first and never overwrites or deletes one of yours.
  - A pack's presets take their own numbers when those are free, and free numbers counted down from 250 when they aren't.
  - Presets already on your WLED under the same name, from an earlier install, are brought up to date where they are.
  - If the WLED doesn't keep the new presets, the old ones are put back. If even that fails, **Save your old presets** hands them to you as a file, to restore in WLED under *Security & Updates*
- **Update**: A pack you added before shows **Update**. It puts the pack on your WLED again and brings its set up to date: each effect keeps its on/off, and effects you added to the set stay. A newer version of a pack is pointed out on its card
- **What it needs**:
  - WLED 0.15 or newer on an ESP32, set up as a 2D matrix: the *Image* effect plays the GIFs, and a 64 × 8 pack uses *Copy Segment*.
  - Room on its file system: about 125 to 260 kB of GIFs, and room for presets.json to grow.
  - A settings PIN has to be unlocked first.
  - A size other than your matrix's can be added, with a warning
- **Other sizes**: Need a pack for a 64 × 64 matrix, or another size? Ask on [Discord](https://discord.gg/autodarts), on [GitHub](https://github.com/creazy231/tools-for-autodarts/issues/new) or by [email](mailto:info@tobias-thiele.de)
```

In the feature list near the top, extend the WLED line:

```md
- **WLED Integration**: Trigger lighting effects and HTTP requests synchronized with game events, from sets of effects you switch between, such as one for Halloween, and ready-made animation packs for LED matrices that go on your WLED in one go
```

- [ ] **Step 2: CHANGELOG — under `## [Unreleased]` › `### Added`, first:**

```md
- **WLED animation packs**: ready-made animations for LED matrices, put on your WLED and into Tools in one go.
  - **Animation packs** in the WLED settings (or **Add › Animation packs**) lists them with moving previews: *Standard* (68 animations for a 32 × 8 matrix, 89 for 64 × 8) and *Halloween* (49 and 63).
  - Type your WLED's address, pick a pack, and **Add** puts its GIFs and presets on the WLED and adds its effects, triggers and all, as an effect set named after the pack.
  - Your own presets are never overwritten: the pack's go to free numbers when theirs are taken, a pack added before is brought up to date where it is, and if the WLED doesn't keep the new presets, the old ones are put back.
  - A pack in another size, such as 64 × 64, can be asked for on Discord, on GitHub or by email.
  - Checked in Chrome against a stand-in that answers as WLED 16 does: <what Task 11 saw, in one or two sentences, with the numbers it measured>
```

Fill in the last bullet with the observations of Task 11. Write what was seen, with its numbers. It must not be left as written here.

- [ ] **Step 3: Release checks**

Run, each:
1. `cd $REPO && yarn i18n:check` → exit 0.
2. `cd $REPO && yarn lint --base main` → nothing added by this branch.
3. `cd $REPO && yarn compile > $SCR/compile.txt 2>&1; grep -c "error TS" $SCR/compile.txt` → 12, the same files as before.
4. `cd $REPO && yarn build` → success.
   - `ls .output/chrome-mv3/wled-packs/gifs | wc -l` → 122.
   - `du -sh .output/chrome-mv3/wled-packs` → under 1 MB.
5. The manifest against the last release:
   - `gh release download 3.4.0 --repo creazy231/tools-for-autodarts --pattern '*chrome*.zip' --dir $SCR/release`;
   - unzip its `manifest.json`;
   - compare `permissions`, `host_permissions`, `optional_permissions`, `web_accessible_resources` and `content_scripts[].matches` with `.output/chrome-mv3/manifest.json`. They must be identical.
   - If 3.4.0 isn't released, take the newest release `gh release list` shows.
6. Then `touch utils/storage.ts` so the running yarn dev rebuilds after `yarn build`.

- [ ] **Step 4: Commit**

```bash
cd $REPO && git add README.md CHANGELOG.md
git commit -m "docs: WLED animation packs in the README and the changelog

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Whole-branch review** with superpowers:requesting-code-review (one reviewer on the whole branch, `main..feat/wled-animation-packs`), then superpowers:finishing-a-development-branch: merge locally into `main` with `--no-ff`, not pushed, version not bumped, as the user's earlier features were.
