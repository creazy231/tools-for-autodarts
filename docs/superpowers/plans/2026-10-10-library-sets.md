# Sets for Animations, the Caller and Sound FX: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Animations, the Caller and Sound FX keep several named lists, as WLED does, and the user chooses which one plays.

**Architecture:**
- WLED's set pieces become shared:
  - `utils/library-sets.ts`, generic over the section's list name;
  - `components/Settings/Library/LibrarySets.vue`, picking each feature's words by a `feature` prop;
  - `composables/useLibrarySets.ts`: the viewed set, the list the library edits, the set actions, and the files items share between sets.
- Each panel uses the three.
- The list that plays stays where each runtime reads it, so no runtime changes.
- A copied set shares its items' stored files. A file is deleted only when no list of its feature keeps it, and never overwritten while another list keeps it.

**Tech Stack:** TypeScript, Vue 3.4 `<script setup>`, WXT 0.20; tsx + `node:test`; esbuild + `@vue/compiler-sfc` for panel logic (`$SCR/sfc/load-sfc.mjs`); Playwright over the yarn dev Chrome's CDP `:9222`.

**Spec:** `docs/superpowers/specs/2026-10-10-library-sets-design.md` (and, for what it doesn't change, `docs/superpowers/specs/2026-10-10-wled-effect-sets-design.md`).

`$REPO` is `/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt`, `$SCR` `/private/tmp/claude-501/-Volumes-WD-BLACK-PROJECTS-Autodarts-autodarts-tools-wxt/90285676-787c-434d-a2bb-d7fef5d7f8a5/scratchpad`. Tests run with the repo as cwd: `cd $REPO && node_modules/.bin/tsx --test $SCR/tests/<file>`.

## Global Constraints

- **List names:** `wledFx.effects`, `animations.data`, `caller.sounds`, `soundFx.sounds`.
  - A set keeps its list under the same name: `{ id, name, <list>? }`.
  - The set in use has no list of its own, and `activeSet` names it.
  - The first set's id is `"default"` and its stored name `""`.
  - New ids are `set-` and up to 8 base-36 characters.
- **Exports of `utils/library-sets.ts`:**
  - `LIBRARY_SET_LISTS`, `SetFeature`, `LibrarySet`, `SetSection`, `LibrarySetView`;
  - `DEFAULT_LIBRARY_SET_ID`, `listLibrarySets`, `librarySetLabel`, `librarySetNameTaken`;
  - `normalizeLibrarySets`, `activateLibrarySet`, `addLibrarySet`, `renameLibrarySet`, `deleteLibrarySet`;
  - `libraryFileUses`, `unusedLibraryFiles`.

  No bare `listSets`, `addSet` or the like: WXT auto-imports everything exported from `utils/`.
- **File ids:** `ISound.soundId` (IndexedDB `sounds-caller` / `sounds-fx`) and `IAnimation.animationId` (OPFS). `""` and `undefined` are no file.
- **No migration** (`CONFIG_VERSION`, `defaultConfig` unchanged) and **no runtime change** (`entrypoints/match.content/{wled,caller,sound-fx}.ts`, `entrypoints/match.content/Animations.vue`, lobby scripts).
- **Text:**
  - the catalog keys `library.sets.*` (shared) and `library.sets.{wledFx,animations,caller,soundFx}.*` (each feature's own);
  - the `wled.sets.*` and `wled.list.titleInSet` keys go;
  - en/de/nl in the same change; German *du*, Dutch *je*;
  - the set names, verbatim: effect sets / Effekt-Sets / effectensets; animation sets / Animations-Sets / animatiesets; sound sets / Sound-Sets / geluidensets (the Caller's and Sound FX's);
  - "In Benutzung" / "in gebruik"; "Default" / "Standard" / "Standaard".
- **Design language:**
  - *Add* is each panel's only blue button; New set and Use this set are default buttons;
  - the in-use dot is the only colour;
  - set actions sit under the sets' ⋯, and deleting a set takes a dialog with its count.
- **Browser:**
  - only the yarn dev Chrome, in tabs of my own, brought to the front;
  - no `page.route`;
  - `config-2-0-0` backed up first and restored after;
  - test configs whose WLED holds only stand-in effects;
  - IndexedDB and OPFS entries of my own, deleted after, and the user's left alone;
  - `ListAgents` and `/json/list` before any source edit while it runs.
- **Checks:**
  - `yarn compile` adds no error to the baseline (12 errors);
  - `yarn lint --base main` adds nothing;
  - `yarn i18n:check` passes;
  - `yarn build` and `yarn build:firefox` pass, and the manifests' permissions are unchanged.
- **Commits:** on `feat/library-sets`, one or more per task; merged into `main` locally with `--no-ff`; never pushed; no version bump.

## Review Focus

1. **A file shared by two sets.**
   - Deleting its item in one set (the bin, *Delete all*, or deleting the set) keeps the file for the other.
   - Deleting the last item that keeps it deletes it.
   - Pinned in Task 1 (`unusedLibraryFiles`), Task 3 (`deleteSet`, `releaseFiles`) and Tasks 4–6 (each panel's paths, with recorded file calls).
2. **Replacing a shared recording in an editor.** The other set keeps its recording. Pinned in Task 5 (the Caller writes a new file instead of overwriting) and Task 4 (Sound FX releases instead of deleting).
3. **Edits to a set that isn't in use** never reach the list that plays, in any of the three panels: rows, editor, upload, TTS, imports, sort, drag, *Delete all*. Pinned in Tasks 4–6.
4. **A config from before sets** in the three features opens without anything written, and plays as before. Pinned in Task 1 (`normalizeLibrarySets` without sets, all four names) and Task 8 (storage read back after opening each panel).
5. **A dialog open on a set deleted in another tab** closes with a notice, and its confirm does nothing. Pinned in Task 3 (the composable) and Task 4 (one panel through the real `useConfig`).

---

### Task 1: The shared module, its types, and configs coming in

**Files:**
- Create: `utils/library-sets.ts`
- Delete: `utils/wled-sets.ts`
- Modify: `utils/storage.ts` (the `sets`/`activeSet` types of the four sections; `IWledSet` becomes an alias)
- Modify: `composables/useConfig.ts`, `components/PageConfig.vue` (normalise all four sections)
- Modify: `components/Settings/Wled.vue`, `components/Settings/Wled/EffectSets.vue` (the new names only; both are rewritten in Tasks 2 and 3)
- Test: `$SCR/tests/library-sets.test.mts` (WLED's `wled-sets.test.mts`, generalised), `$SCR/tests/use-config.test.mts` (extended)

**Interfaces:**
- Produces:
  - `LIBRARY_SET_LISTS = { wledFx: "effects", animations: "data", caller: "sounds", soundFx: "sounds" } as const`, and `SetFeature = keyof typeof LIBRARY_SET_LISTS`;
  - `type LibrarySet<K extends string, T> = { id: string; name: string } & { [P in K]?: T[] }`;
  - `type SetSection<K extends string, T> = { [P in K]: T[] } & { sets?: LibrarySet<K, T>[]; activeSet?: string }`;
  - `interface LibrarySetView<T> { id: string; name: string; items: T[]; active: boolean }`;
  - `DEFAULT_LIBRARY_SET_ID = "default"`;
  - `listLibrarySets(section, key): LibrarySetView<T>[]`;
  - `librarySetLabel(set: { name: string }, defaultName: string): string`;
  - `librarySetNameTaken(sets: readonly { id: string; name: string }[], name: string, defaultName: string, exceptId?: string): boolean`;
  - `normalizeLibrarySets(section, key)`, `activateLibrarySet(section, key, id)`, `renameLibrarySet(section, key, id, name)` and `deleteLibrarySet(section, key, id)`, each returning the section's type;
  - `addLibrarySet(section, key, name, items): { section; id }`;
  - `libraryFileUses(section, key, fileOf, fileId): number`;
  - `unusedLibraryFiles(section, key, fileOf, candidates): string[]`.

- [ ] **Step 1: Write the failing test**

`$SCR/tests/library-sets.test.mts` runs every case of `wled-sets.test.mts` once per list name, `"effects"`, `"data"` and `"sounds"`. The base and the items become:
```ts
const item = (name: string, file?: string) => ({ name, triggers: [ name ], enabled: true, ...(file ? { soundId: file } : {}) });
const base = (key: string, items = [ item("gameon"), item("takeout") ]) => ({ enabled: true, other: [ "x" ], [key]: items });
```
In each case, `wledFx.effects` becomes `section[key]` and a set's `.effects` becomes `[key]`. The functions are imported under their new names, from `utils/library-sets.ts` or `WLED_SETS=…`. New cases, per list name:
```ts
test(`${key}: libraryFileUses counts every list's items that keep a file, and no id is no file`, () => {
  const start = base(key, [ item("a", "f1"), item("b", "f2"), item("c") ]);
  const { section, id } = addLibrarySet(start, key, "Halloween", start[key]);
  const fileOf = (x: any) => x.soundId;
  assert.equal(libraryFileUses(section, key, fileOf, "f1"), 2);
  assert.equal(libraryFileUses(activateLibrarySet(section, key, id), key, fileOf, "f1"), 2);
  assert.equal(libraryFileUses(section, key, fileOf, ""), 0);
  assert.equal(libraryFileUses(section, key, fileOf, undefined), 0);
  assert.equal(libraryFileUses(base(key), key, fileOf, "f9"), 0);
});

test(`${key}: unusedLibraryFiles names only files no list keeps, each once`, () => {
  const start = base(key, [ item("a", "f1"), item("b", "f2") ]);
  const { section, id } = addLibrarySet(start, key, "Halloween", start[key]);
  const fileOf = (x: any) => x.soundId;
  // Halloween loses "a": Default still keeps f1.
  const halloween = section.sets.find((s: any) => s.id === id);
  const lost = halloween[key].splice(0, 1);
  assert.deepEqual(unusedLibraryFiles(section, key, fileOf, lost), []);
  // Default loses "a" too: f1 is no one's now.
  const lostToo = section[key].splice(0, 1);
  assert.deepEqual(unusedLibraryFiles(section, key, fileOf, [ ...lost, ...lostToo ]), [ "f1" ]);
  // No id, or the same file twice among the candidates.
  assert.deepEqual(unusedLibraryFiles(base(key, []), key, fileOf, [ item("x"), item("y", "f3"), item("z", "f3") ]), [ "f3" ]);
});
```
`use-config.test.mts`: the stored config also gets broken `animations`, `caller` and `soundFx` sets, the same broken shape as its `wledFx`. Assert each comes out normalised: `[ "gone", "b" ]`, the set without a list given `[]`, and `activeSet` `"gone"`.

- [ ] **Step 2: Run them to see them fail**

Run: `node_modules/.bin/tsx --test $SCR/tests/library-sets.test.mts $SCR/tests/use-config.test.mts`
Expected:
- library-sets fails: `Cannot find module …/utils/library-sets.ts`;
- use-config fails on the three new sections, which pass through unnormalised.

- [ ] **Step 3: The module**

`utils/library-sets.ts`, WLED's module with the list name as a parameter:
```ts
/**
 * Sets of a library: lists of items kept for an occasion, such as Halloween,
 * of which one is in use. WLED's effects, Animations' GIFs and the Caller's and
 * Sound FX's sounds keep theirs this way.
 *
 * The list that plays stays where its runtime has always read it: `effects`,
 * `data`, `sounds`. The other sets' lists wait in `sets`, each under the same
 * name, and the set in use keeps its place there by id and name only. So a
 * config from before sets is one set, an export plays its set in use in an
 * older version, and no runtime knows anything of sets. Specs:
 * docs/superpowers/specs/2026-10-10-wled-effect-sets-design.md and
 * docs/superpowers/specs/2026-10-10-library-sets-design.md.
 *
 * Each function takes a config section and the name of its list, and returns a
 * new section without changing its input. Nothing here is imported at runtime,
 * so tsx runs it.
 */

/** The features whose lists come in sets, and the name of each one's list. */
export const LIBRARY_SET_LISTS = { wledFx: "effects", animations: "data", caller: "sounds", soundFx: "sounds" } as const;
export type SetFeature = keyof typeof LIBRARY_SET_LISTS;

/** A set: its id and name and, unless it is the set in use, its list under the section's list name. */
export type LibrarySet<K extends string, T> = { id: string; name: string } & { [P in K]?: T[] };

/** A config section whose list `K` comes in sets. */
export type SetSection<K extends string, T> = { [P in K]: T[] } & { sets?: LibrarySet<K, T>[]; activeSet?: string };

/** A set as the settings show it. */
export interface LibrarySetView<T> {
  id: string;
  /** As stored: "" is the first set, shown under the default name (librarySetLabel). */
  name: string;
  /** The stored list itself, so an edit in place reaches the config: for the set in use, the section's own list. */
  items: T[];
  /** Whether it is the set in use. */
  active: boolean;
}

/** The id of the first set: the one a config from before sets is. */
export const DEFAULT_LIBRARY_SET_ID = "default";

// What the functions read and write, whatever a section's list is called.
type AnySet = { id: string; name: string; [list: string]: unknown };
type AnySection = { sets?: AnySet[]; activeSet?: string; [key: string]: unknown };
type WrittenOut = AnySection & { sets: AnySet[]; activeSet: string };

/** Every set in order. A section without sets is one: the set in use, named "". */
export function listLibrarySets<K extends string, T>(section: SetSection<K, T>, key: K): LibrarySetView<T>[] {
  const fx = normalize(section as unknown as AnySection, key);
  const playing = fx[key] as T[];
  if (!fx.sets || !fx.activeSet) return [ { id: DEFAULT_LIBRARY_SET_ID, name: "", items: playing, active: true } ];
  return fx.sets.map(set => ({
    id: set.id,
    name: set.name,
    items: set.id === fx.activeSet ? playing : (set[key] as T[] | undefined) ?? [],
    active: set.id === fx.activeSet,
  }));
}

/** What a set is called: its name, or `defaultName` for the first set until it is renamed. */
export function librarySetLabel(set: { name: string }, defaultName: string): string {
  return set.name || defaultName;
}

/** Whether a set other than `exceptId` is called `name`, trimmed and in any case. A set named "" goes by `defaultName`. */
export function librarySetNameTaken(sets: readonly { id: string; name: string }[], name: string, defaultName: string, exceptId?: string): boolean {
  const wanted = name.trim().toLocaleLowerCase();
  return sets.some(set => set.id !== exceptId && librarySetLabel(set, defaultName).trim().toLocaleLowerCase() === wanted);
}

/**
 * The shape the functions here rely on, from whatever was stored or imported:
 * - no usable set: no `sets` and no `activeSet` at all;
 * - each set with an id of its own and a name, both text;
 * - a list on every set but the one in use, whose list is the section's own;
 * - a set in use, put first when `activeSet` names none.
 *
 * A set that needs nothing comes back as the same object, its list the same
 * array, so the settings go on editing what is stored. Fields this version
 * doesn't know are kept.
 */
export function normalizeLibrarySets<S extends SetSection<K, unknown>, K extends string>(section: S, key: K): S {
  return normalize(section as unknown as AnySection, key) as unknown as S;
}

/**
 * `id` as the set in use: the list that plays goes back to its own set, and
 * `id`'s list becomes the section's. The set already in use, or an id no set
 * has, gives back `section` itself.
 */
export function activateLibrarySet<S extends SetSection<K, unknown>, K extends string>(section: S, key: K, id: string): S {
  const fx = writtenOut(section as unknown as AnySection, key);
  const target = fx.sets.find(set => set.id === id);
  if (!target || id === fx.activeSet) return section;
  const sets = fx.sets.map((set) => {
    if (set.id === fx.activeSet) return { ...set, [key]: fx[key] };
    return set.id === id ? withoutList(set, key) : set;
  });
  return { ...fx, [key]: (target[key] as unknown[] | undefined) ?? [], sets, activeSet: id } as unknown as S;
}

/** A new set at the end, holding a copy of `items`, and its id. The set in use stays in use. */
export function addLibrarySet<S extends SetSection<K, unknown>, K extends string>(section: S, key: K, name: string, items: readonly unknown[]): { section: S; id: string } {
  const fx = writtenOut(section as unknown as AnySection, key);
  const id = newSetId(new Set(fx.sets.map(set => set.id)));
  // JSON rather than structuredClone, which refuses the settings' reactive proxies.
  const set: AnySet = { id, name: name.trim(), [key]: JSON.parse(JSON.stringify(items)) };
  return { section: { ...fx, sets: [ ...fx.sets, set ] } as unknown as S, id };
}

/** `id` under `name`, trimmed. An id no set has gives back `section` itself. */
export function renameLibrarySet<S extends SetSection<K, unknown>, K extends string>(section: S, key: K, id: string, name: string): S {
  const fx = writtenOut(section as unknown as AnySection, key);
  if (!fx.sets.some(set => set.id === id)) return section;
  return { ...fx, sets: fx.sets.map(set => (set.id === id ? { ...set, name: name.trim() } : set)) } as unknown as S;
}

/**
 * Every set but `id`. Neither the set in use, whose list is what plays, nor an
 * id no set has is deleted: both give back `section` itself.
 */
export function deleteLibrarySet<S extends SetSection<K, unknown>, K extends string>(section: S, key: K, id: string): S {
  const fx = normalize(section as unknown as AnySection, key);
  if (!fx.sets || id === fx.activeSet || !fx.sets.some(set => set.id === id)) return section;
  return { ...fx, sets: fx.sets.filter(set => set.id !== id) } as unknown as S;
}

/** How many items, in every list of the section, keep their file under `fileId`. No id is no file. */
export function libraryFileUses<K extends string, T>(section: SetSection<K, T>, key: K, fileOf: (item: T) => string | undefined, fileId: string | undefined): number {
  if (!fileId) return 0;
  let uses = 0;
  for (const list of lists(section as unknown as AnySection, key)) {
    for (const item of list) if (fileOf(item as T) === fileId) uses++;
  }
  return uses;
}

/** The files of `candidates` that no list of the section keeps any more, each once: the ones to delete. */
export function unusedLibraryFiles<K extends string, T>(section: SetSection<K, T>, key: K, fileOf: (item: T) => string | undefined, candidates: readonly T[]): string[] {
  const kept = new Set<string>();
  for (const list of lists(section as unknown as AnySection, key)) {
    for (const item of list) {
      const id = fileOf(item as T);
      if (id) kept.add(id);
    }
  }
  const unused = new Set<string>();
  for (const item of candidates) {
    const id = fileOf(item);
    if (id && !kept.has(id)) unused.add(id);
  }
  return [ ...unused ];
}

function normalize(section: AnySection, key: string): AnySection {
  if (!section || typeof section !== "object") return section;
  const { sets: stored, activeSet: storedActive, ...rest } = section;
  const fx: AnySection = Array.isArray(rest[key]) ? rest : { ...rest, [key]: [] };

  const ids = new Set<string>();
  const kept: AnySet[] = [];
  for (const set of Array.isArray(stored) ? stored : []) {
    if (!set || typeof set !== "object" || typeof set.id !== "string" || !set.id || ids.has(set.id)) continue;
    ids.add(set.id);
    kept.push(set);
  }
  if (!kept.length) return fx;

  let activeSet = typeof storedActive === "string" ? storedActive : "";
  if (!activeSet) activeSet = ids.has(DEFAULT_LIBRARY_SET_ID) ? newSetId(ids) : DEFAULT_LIBRARY_SET_ID;
  const sets = kept.map(set => tidy(set, set.id === activeSet, key));
  if (!ids.has(activeSet)) sets.unshift({ id: activeSet, name: "" });
  return { ...fx, sets, activeSet };
}

/** The section with its sets written out: one without sets gets the one set it is. */
function writtenOut(section: AnySection, key: string): WrittenOut {
  const fx = normalize(section, key);
  if (fx.sets && fx.activeSet) return { ...fx, sets: fx.sets, activeSet: fx.activeSet };
  return { ...fx, sets: [ { id: DEFAULT_LIBRARY_SET_ID, name: "" } ], activeSet: DEFAULT_LIBRARY_SET_ID };
}

/** Every list of the section: the one that plays, then every other set's. */
function lists(section: AnySection, key: string): unknown[][] {
  const fx = normalize(section, key);
  const others = (fx.sets ?? []).filter(set => set.id !== fx.activeSet).map(set => (set[key] as unknown[] | undefined) ?? []);
  return [ (fx[key] as unknown[] | undefined) ?? [], ...others ];
}

/** A stored set in the shape listLibrarySets reads, and the same object when it already is. */
function tidy(set: AnySet, inUse: boolean, key: string): AnySet {
  const name = typeof set.name === "string" ? set.name : "";
  if (inUse) return name === set.name && !(key in set) ? set : withoutList({ ...set, name }, key);
  const list = Array.isArray(set[key]) ? set[key] : [];
  return name === set.name && list === set[key] ? set : { ...set, name, [key]: list };
}

function withoutList(set: AnySet, key: string): AnySet {
  const copy = { ...set };
  delete copy[key];
  return copy;
}

/** An id no set in `taken` has. Random rather than counted, so two tabs adding a set at once don't pick the same one. */
function newSetId(taken: ReadonlySet<string>): string {
  for (;;) {
    const id = `set-${Math.random().toString(36).slice(2, 10)}`;
    if (id.length > 4 && !taken.has(id)) return id;
  }
}
```

- [ ] **Step 4: The types, the WLED callers, and configs coming in**

`utils/storage.ts`:
- add `import type { LibrarySet } from "@/utils/library-sets";` with the other type imports;
- give `animations`, `caller` and `soundFx` `sets?` and `activeSet?` after their list, with the same comments as `wledFx`'s: `LibrarySet<"data", IAnimation>[]` and `LibrarySet<"sounds", ISound>[]`;
- `wledFx.sets` becomes `LibrarySet<"effects", IWled>[]`;
- `IWledSet` becomes `export type IWledSet = LibrarySet<"effects", IWled>;`.

`composables/useConfig.ts` `withDefaults`:
```ts
  merged.wledFx = normalizeLibrarySets(merged.wledFx, "effects");
  merged.animations = normalizeLibrarySets(merged.animations, "data");
  merged.caller = normalizeLibrarySets(merged.caller, "sounds");
  merged.soundFx = normalizeLibrarySets(merged.soundFx, "sounds");
```
Its comment names "every library's sets", and it imports `normalizeLibrarySets` from `@/utils/library-sets`.

`components/PageConfig.vue`: the same four lines in both import paths, in place of `normalizeWledSets`. The comment says "…, Teams and the libraries' sets…" and ends "…normalizeTeams and normalizeLibrarySets."

`components/Settings/Wled.vue` and `components/Settings/Wled/EffectSets.vue`: import from `@/utils/library-sets` and rename each call:
- `listSets(x)` becomes `listLibrarySets(x, "effects")`;
- `activateSet(x, id)` becomes `activateLibrarySet(x, "effects", id)`;
- `addSet(x, n, l)` becomes `addLibrarySet(x, "effects", n, l)`, read as `added.section` where it was `added.wledFx`;
- `renameSet`, `deleteSet`, `setLabel` and `setNameTaken` become `renameLibrarySet`, `deleteLibrarySet`, `librarySetLabel` and `librarySetNameTaken`, with `"effects"` where they take a section;
- `WledSetView` becomes `LibrarySetView<IWled>`.

Then `git rm utils/wled-sets.ts`.

- [ ] **Step 5: Run the tests, the WLED panel's tests, and the checks**

```bash
node_modules/.bin/tsx --test $SCR/tests/library-sets.test.mts $SCR/tests/use-config.test.mts $SCR/tests/effect-sets.test.mts $SCR/tests/wled-panel.test.mts $SCR/tests/wled-two-tabs.test.mts
node_modules/.bin/tsx $SCR/wled-int/run-sets.mjs   # its import becomes utils/library-sets.ts, with "effects" passed
yarn compile > $SCR/compile-t1.log 2>&1; grep "error TS" $SCR/compile-t1.log | cut -d'(' -f1 | sort | uniq -c
```
Expected: all pass, and the baseline's 12 errors in the same files. Mutation check: the mutants of `wled-sets.ts` again, on `library-sets.ts`, plus:
- a `lists()` that leaves out other sets;
- an `unusedLibraryFiles` that doesn't skip kept ids.

Each must fail its own test.

- [ ] **Step 6: Commit**

```bash
git add utils/library-sets.ts utils/storage.ts composables/useConfig.ts components/PageConfig.vue components/Settings/Wled.vue components/Settings/Wled/EffectSets.vue
git rm -q utils/wled-sets.ts
git commit -m "feat: one module keeps every library's sets, and counts the files their items share"
```

### Task 2: The shared section and its words (`LibrarySets.vue`, `library.sets.*`)

**Files:**
- Create: `components/Settings/Library/LibrarySets.vue`, from `components/Settings/Wled/EffectSets.vue` (moved with `git mv`, then generalised)
- Modify: `components/Settings/Wled.vue` (uses `LibrarySets` with `feature="wledFx"`, and the `library.sets.wledFx.*` keys for its heading and card)
- Modify: `locales/{en,de,nl}/library.ts` (add `sets`), `locales/{en,de,nl}/wled.ts` (remove `sets` and `list.titleInSet`), `locales/same-as-english.json`, `locales/GLOSSARY.md`
- Test: `$SCR/tests/effect-sets.test.mts` → `$SCR/tests/library-sets-section.test.mts`

**Interfaces:**
- Consumes: `SetFeature`, `LibrarySetView`, `librarySetLabel`, `librarySetNameTaken` (Task 1).
- Produces: `LibrarySets.vue`:
  - props `feature: SetFeature`, `sets: LibrarySetView<unknown>[]`, `modelValue: string`;
  - emits `update:modelValue(id)`, `use(id)`, `create(name, copy)`, `rename(id, name)`, `delete(id)`;
  - keys `library.sets.<feature>.{title, introSingle, newTitle, empty, deleteBody, deleteBodyEmpty, cardLabel, listTitle}`.

- [ ] **Step 1: The failing test**

Copy `effect-sets.test.mts` to `library-sets-section.test.mts`:
- it loads `components/Settings/Library/LibrarySets.vue`;
- `mount(modelValue, sets, feature = "wledFx")` passes `feature`.

New cases:
```ts
test("each feature names its own empty option", () => {
  assert.equal(mount("h", SETS(), "caller").page.startOptions.value[1].label, "No sounds");
  assert.equal(mount("h", SETS(), "animations").page.startOptions.value[1].label, "No animations");
  assert.equal(mount("h", SETS(), "wledFx").page.startOptions.value[1].label, "No effects");
});

test("a long name of emoji is cut between characters, never inside one", () => {
  const sets = [ ...SETS(), { id: "e", name: "🎃".repeat(25), items: [ effect("x") ], active: false } ];
  assert.equal(mount("e", sets).page.startOptions.value[0].label, `A copy of ${"🎃".repeat(19)}…`);
});
```
Run: `node_modules/.bin/tsx --test $SCR/tests/library-sets-section.test.mts`. Expected: FAIL (`ENOENT …/Library/LibrarySets.vue`).

- [ ] **Step 2: The catalogs**

`locales/en/library.ts`, a new group `sets`:
```ts
  /**
   * Sets of a library: lists of items kept for an occasion, one of which plays (components/Settings/Library/LibrarySets.vue,
   * composables/useLibrarySets.ts). The words every feature shares come first, and each feature's own follow under its
   * config name. A set's items are effects, animations or sounds.
   */
  sets: {
    /** Under the heading once there are two or more. */
    intro: "One set plays at a time. Pick a set to edit it; it plays once you use it.",
    /** The first set's name until it is renamed. It is stored as nothing, so it follows the language. */
    defaultName: "Default",
    new: "New set",
    /** Spoken after the name of the set in use, in its pill. */
    inUse: "In use",
    /** The line under the pills, about the set being viewed. */
    status: {
      inUse: "This is the set that plays.",
      /** `set` is the name of the set in use. */
      notInUse: "Not in use. The set that plays is {set}.",
    },
    use: "Use this set",
    menu: {
      rename: "Rename set",
      delete: "Delete set",
      /** Under Delete set while it can't be pressed: the set being viewed is the one in use. */
      deleteInUse: "Use another set first",
    },
    dialog: {
      renameTitle: "Rename set",
      nameLabel: "Name",
      /** Example names. */
      namePlaceholder: "Halloween, Christmas, a birthday…",
      startLabel: "Start with",
      /** `set` is the name of the set being viewed, cut short when long. */
      copy: "A copy of {set}",
      create: "Create set",
    },
    /** Said under the name field when Create or Save refuses. */
    errors: {
      nameMissing: "Give the set a name.",
      nameTaken: "There's already a set with that name.",
    },
    deleteDialog: {
      /** `set` is the set's name. */
      title: "Delete {set}?",
      confirm: "Delete set",
    },
    notifications: {
      created: "{set} created. It plays once you use it.",
      inUse: "{set} plays now.",
      renamed: "Set renamed",
      deleted: "{set} deleted",
      /** Said when a dialog closes because its set was deleted in another tab while it was open. */
      goneElsewhere: "The set you were editing was deleted in another tab.",
    },
    wledFx: {
      title: "Effect sets",
      /** Under the heading while there is one set. */
      introSingle: "Keep another list of effects for an occasion, such as Halloween or a birthday, and switch to it when the day comes.",
      newTitle: "New effect set",
      empty: "No effects",
      deleteBody: {
        one: "The set and its {count} effect are deleted for good. This can't be undone.",
        other: "The set and its {count} effects are deleted for good. This can't be undone.",
      },
      deleteBodyEmpty: "The set has no effects. This can't be undone.",
      /** Spoken before the name of the set in use, on the card. */
      cardLabel: "Effect set in use:",
      /** The library's heading once there are two or more sets: `set` is the name of the set it shows. */
      listTitle: "Effects in {set}",
    },
    animations: {
      title: "Animation sets",
      introSingle: "Keep another list of animations for an occasion, such as Halloween or a birthday, and switch to it when the day comes.",
      newTitle: "New animation set",
      empty: "No animations",
      deleteBody: {
        one: "The set and its {count} animation are deleted for good. This can't be undone.",
        other: "The set and its {count} animations are deleted for good. This can't be undone.",
      },
      deleteBodyEmpty: "The set has no animations. This can't be undone.",
      cardLabel: "Animation set in use:",
      listTitle: "Animations in {set}",
    },
    /** "Sound sets", not "caller sets": a caller set is a voice pack that Import a caller set brings in. */
    caller: {
      title: "Sound sets",
      introSingle: "Keep another list of sounds, such as a second caller set or one for Halloween, and switch to it when you like.",
      newTitle: "New sound set",
      empty: "No sounds",
      deleteBody: {
        one: "The set and its {count} sound are deleted for good. This can't be undone.",
        other: "The set and its {count} sounds are deleted for good. This can't be undone.",
      },
      deleteBodyEmpty: "The set has no sounds. This can't be undone.",
      cardLabel: "Sound set in use:",
      listTitle: "Sounds in {set}",
    },
    soundFx: {
      title: "Sound sets",
      introSingle: "Keep another list of sounds for an occasion, such as Halloween or a birthday, and switch to it when the day comes.",
      newTitle: "New sound set",
      empty: "No sounds",
      deleteBody: {
        one: "The set and its {count} sound are deleted for good. This can't be undone.",
        other: "The set and its {count} sounds are deleted for good. This can't be undone.",
      },
      deleteBodyEmpty: "The set has no sounds. This can't be undone.",
      cardLabel: "Sound set in use:",
      listTitle: "Sounds in {set}",
    },
  },
```
`locales/de/library.ts`, the same keys:
- the shared words: WLED's German from `de/wled.ts` `sets`;
- `intro`: "Es wird immer nur ein Set abgespielt. Wähle ein Set, um es zu bearbeiten; abgespielt wird es erst, wenn du es benutzt.";
- `wledFx`: WLED's German. `listTitle` is "Effekte in {set}".

The other three features in German:
- **animations:** "Animations-Sets"; "Lege für einen Anlass wie Halloween oder einen Geburtstag eine weitere Liste mit Animationen an und wechsle zu ihr, wenn der Tag gekommen ist."; "Neues Animations-Set"; "Keine Animationen"; `deleteBody` `{ one: "Das Set und seine Animation werden dauerhaft gelöscht. Dies kann nicht rückgängig gemacht werden.", other: "Das Set und seine {count} Animationen werden dauerhaft gelöscht. Dies kann nicht rückgängig gemacht werden." }`; "Das Set hat keine Animationen. Dies kann nicht rückgängig gemacht werden."; "Animations-Set in Benutzung:"; "Animationen in {set}".
- **caller:** "Sound-Sets"; "Lege eine weitere Liste mit Sounds an, etwa für ein zweites Caller-Set oder für Halloween, und wechsle zu ihr, wann du willst."; "Neues Sound-Set"; "Keine Sounds"; `{ one: "Das Set und sein Sound werden dauerhaft gelöscht. Dies kann nicht rückgängig gemacht werden.", other: "Das Set und seine {count} Sounds werden dauerhaft gelöscht. Dies kann nicht rückgängig gemacht werden." }`; "Das Set hat keine Sounds. Dies kann nicht rückgängig gemacht werden."; "Sound-Set in Benutzung:"; "Sounds in {set}".
- **soundFx:** the Caller's, but `introSingle` is "Lege für einen Anlass wie Halloween oder einen Geburtstag eine weitere Liste mit Sounds an und wechsle zu ihr, wenn der Tag gekommen ist."

`locales/nl/library.ts`, the same keys:
- the shared words: WLED's Dutch;
- `intro`: "Er wordt steeds maar één set afgespeeld. Kies een set om hem te bewerken; hij wordt pas afgespeeld als je hem gebruikt.";
- `wledFx`: WLED's Dutch. `listTitle` is "Effecten in {set}".

The other three features in Dutch:
- **animations:** "Animatiesets"; "Maak voor een gelegenheid zoals Halloween of een verjaardag een extra lijst met animaties, en schakel ernaar over als de dag aanbreekt."; "Nieuwe animatieset"; "Geen animaties"; `{ one: "De set en de animatie erin worden definitief verwijderd. Dit kan niet ongedaan worden gemaakt.", other: "De set en de {count} animaties erin worden definitief verwijderd. Dit kan niet ongedaan worden gemaakt." }`; "De set heeft geen animaties. Dit kan niet ongedaan worden gemaakt."; "Animatieset in gebruik:"; "Animaties in {set}".
- **caller:** "Geluidensets"; "Maak een extra lijst met geluiden, bijvoorbeeld voor een tweede caller-set of voor Halloween, en schakel ernaar over wanneer je wilt."; "Nieuwe geluidenset"; "Geen geluiden"; `{ one: "De set en het geluid erin worden definitief verwijderd. Dit kan niet ongedaan worden gemaakt.", other: "De set en de {count} geluiden erin worden definitief verwijderd. Dit kan niet ongedaan worden gemaakt." }`; "De set heeft geen geluiden. Dit kan niet ongedaan worden gemaakt."; "Geluidenset in gebruik:"; "Geluiden in {set}".
- **soundFx:** the Caller's, but `introSingle` is "Maak voor een gelegenheid zoals Halloween of een verjaardag een extra lijst met geluiden, en schakel ernaar over als de dag aanbreekt."

`wled.ts` in all three languages loses `sets` and `list.titleInSet`.

`same-as-english.json` (`de`):
- `wled.sets.dialog.nameLabel` becomes `library.sets.dialog.nameLabel`;
- add `library.sets.caller.listTitle` and `library.sets.soundFx.listTitle` ("Sounds in {set}", as `library.sounds.title` is listed).

`GLOSSARY.md`, under WLED's table (or a new "Sets" paragraph after it), with the words settled here:
- effect / animation / sound set;
- in use: *In Benutzung* after `account.email.errors.emailInUse`, and *in gebruik*;
- Default (the first set): *Standard*, *Standaard*;
- the Caller's "sound sets", kept apart from "caller set".

- [ ] **Step 3: The component**

`git mv components/Settings/Wled/EffectSets.vue components/Settings/Library/LibrarySets.vue`, then:
- props get `feature: SetFeature`; `sets` becomes `LibrarySetView<unknown>[]`;
- imports `librarySetLabel` and `librarySetNameTaken` from `@/utils/library-sets`, and the shared components as `../../App*.vue`, as now;
- every `wled.sets.X` key: a shared word becomes `library.sets.X`. Each feature's own becomes `` `library.sets.${feature}.Y` ``, with these renames:
  - `title` stays `title`, `introSingle` stays `introSingle`;
  - `dialog.newTitle` becomes `newTitle`, `dialog.empty` becomes `empty`;
  - `deleteDialog.body` becomes `deleteBody`, `deleteDialog.bodyEmpty` becomes `deleteBodyEmpty`.
  In the script, `` const words = (key: "title" | "introSingle" | "newTitle" | "empty" | "deleteBody" | "deleteBodyEmpty") => `library.sets.${props.feature}.${key}` as const; ``, and the template calls `t(words('title'))`.
- `short()` counts code points:
```ts
/** A long name cut before the word the limit falls in, or at the limit when it is one long word; never inside an emoji. */
function short(name: string): string {
  const chars = Array.from(name);
  if (chars.length <= LABEL_LENGTH) return name;
  const cut = chars.slice(0, LABEL_LENGTH - 1).join("");
  const whole = /\s/.test(chars[LABEL_LENGTH - 1]) ? cut : cut.replace(/\s+\S*$/, "");
  return (whole || cut).trimEnd() + ELLIPSIS;
}
```
- Its doc comment: "A library's sets (utils/library-sets.ts): …".

`components/Settings/Wled.vue`:
- imports `LibrarySets from "./Library/LibrarySets.vue"`;
- `<LibrarySets … feature="wledFx" />` takes the place of `<EffectSets … />`;
- `libraryTitle` uses `library.sets.wledFx.listTitle`, and the card's `sr-only` uses `library.sets.wledFx.cardLabel`;
- the card's set name is capped: `max-w-[45%]` on its `<p>`.

- [ ] **Step 4: Run and check**

```bash
node_modules/.bin/tsx --test $SCR/tests/library-sets-section.test.mts
node $SCR/sfc-check.cjs components/Settings/Library/LibrarySets.vue components/Settings/Wled.vue
yarn i18n:check
```
Expected: pass; `ok` twice; i18n all good.

- [ ] **Step 5: Commit**

```bash
git add -A components/Settings/Library/LibrarySets.vue components/Settings/Wled components/Settings/Wled.vue locales
git commit -m "feat: the sets section is every library's, with each feature's own words in three languages"
```

### Task 3: The composable, and WLED's panel on it (`composables/useLibrarySets.ts`)

**Files:**
- Create: `composables/useLibrarySets.ts`
- Modify: `components/Settings/Wled.vue` (its set state and handlers come from the composable)
- Test: `$SCR/tests/use-library-sets.test.mts`; `$SCR/tests/wled-panel.test.mts` and `wled-two-tabs.test.mts` (their auto-imports gain `useLibrarySets`; handlers renamed where the composable names them)

**Interfaces:**
- Consumes: Task 1's functions.
- Produces: `useLibrarySets(feature, options)`.
  - options: `{ notify(message, type?), fileOf?(item), deleteFile?(id), closeDialogs?(): boolean }`.
  - It returns:
    - `viewedId`, `sets`, `several`, `viewed`, `items`, `viewedLabel` and `inUseLabel`;
    - `useSet(id)`, `createSet(name, copy)`, `renameSet(id, name)` and `deleteSet(id): Promise<void>`;
    - `releaseFiles(items): Promise<void>` and `fileShared(item): boolean`.

- [ ] **Step 1: The failing test**

`$SCR/tests/use-library-sets.test.mts` imports `composables/useLibrarySets.ts` directly under tsx. Its setup:
- an in-memory WXT `storage`, whose writes go through `structuredClone`;
- a stored config whose `caller.sounds` hold `a`→`f1`, `b`→`f2` and `c` (no file);
- `deleted` records `deleteFile`'s ids;
- watchers flush on `setTimeout(0)`.
```ts
const { useLibrarySets } = await import(`${REPO}/composables/useLibrarySets.ts`);
const notes: string[] = [];
const deleted: string[] = [];
let open = false;
const sets = useLibrarySets("caller", {
  notify: m => notes.push(m),
  fileOf: s => s.soundId,
  deleteFile: async id => { deleted.push(id); },
  closeDialogs: () => { const was = open; open = false; return was; },
});
// wait for useConfig to load
```
The cases, in order:
1. `createSet("Halloween", true)`:
   - viewed is Halloween, and `items` names `a, b, c`;
   - stored `caller.sets[1].sounds` share `f1` and `f2`;
   - the note is "Halloween created. It plays once you use it.".
2. `fileShared(items.value[0])` is `true`, and for `c` it is `false`.
3. Splice `a` out of Halloween's `items`, then `releaseFiles([a])`: `deleted` stays `[]`.
4. View `"default"`, splice `a` out, then `releaseFiles([a])`: `deleted` is `[ "f1" ]`.
5. `useSet(halloween)`: stored `activeSet` and `caller.sounds` are Halloween's, and `inUseLabel` is "Halloween".
6. `deleteSet("default")`. Default kept `b`→`f2` and `c`, and Halloween still keeps `f2`, so `deleted` is unchanged.
   - Make set "X" as a copy, then remove `b` from Halloween and release it: `f2` is kept, because X has it.
   - `deleteSet(X)`: `deleted` gains `f2`.
7. Gone elsewhere:
   - set `open = true` and view set Y;
   - another tab's write deletes Y (through the storage watcher);
   - after a tick, `open` is false and the last note is "The set you were editing was deleted in another tab.".
8. `deleteSet` of the set in use writes nothing and deletes no file.

Run it. Expected: FAIL (`Cannot find module …/composables/useLibrarySets.ts`).

- [ ] **Step 2: The composable**

```ts
import { computed, ref, toRaw, watch } from "vue";

import type { LibrarySetView, SetFeature, SetSection } from "@/utils/library-sets";
import type { IAnimation, ISound, IWled } from "@/utils/storage";

import { useConfig } from "@/composables/useConfig";
import { t } from "@/utils/i18n";
import {
  LIBRARY_SET_LISTS,
  activateLibrarySet,
  addLibrarySet,
  deleteLibrarySet,
  libraryFileUses,
  librarySetLabel,
  listLibrarySets,
  renameLibrarySet,
  unusedLibraryFiles,
} from "@/utils/library-sets";

/** What each feature's list holds. */
interface SetItems {
  wledFx: IWled;
  animations: IAnimation;
  caller: ISound;
  soundFx: ISound;
}

interface Options<T> {
  /** Says something in the panel, as its own notifications do. */
  notify: (message: string, type?: "success" | "error") => void;
  /** The id of an item's stored file, for a feature whose items keep one. */
  fileOf?: (item: T) => string | undefined;
  /** Deletes a stored file that no list keeps any more. */
  deleteFile?: (id: string) => Promise<unknown>;
  /**
   * Closes the panel's dialogs, and says whether one was open. Called when the
   * set they were open on is deleted elsewhere (another tab), so they don't act
   * on the set shown in its place, which is the one in use.
   */
  closeDialogs?: () => boolean;
}

/**
 * A settings panel's sets (utils/library-sets.ts), for LibrarySets.vue and the
 * panel's own library: the set being viewed, the list the library edits in
 * place, using, making, renaming and deleting a set, and the stored files that
 * items share between sets. A file is deleted only when no list keeps it.
 */
export function useLibrarySets<F extends SetFeature>(feature: F, options: Options<SetItems[F]>) {
  type T = SetItems[F];
  const key = LIBRARY_SET_LISTS[feature];
  const { config } = useConfig();

  /** The set the library shows, by id: "" or an id that has gone is the set in use. */
  const viewedId = ref("");

  const sets = computed<LibrarySetView<T>[]>(() => {
    const fx = section();
    return fx ? listLibrarySets(fx, key) : [];
  });
  const several = computed(() => sets.value.length > 1);
  const viewed = computed(() => sets.value.find(set => set.id === viewedId.value) ?? sets.value.find(set => set.active));
  /**
   * The list the library edits, in place: the stored list of the set being
   * viewed, which for the set in use is the section's own.
   */
  const items = computed<T[]>(() => viewed.value?.items ?? []);
  const viewedLabel = computed(() => (viewed.value ? labelOf(viewed.value.id) : ""));
  const inUseLabel = computed(() => {
    const set = sets.value.find(candidate => candidate.active);
    return set ? labelOf(set.id) : "";
  });

  watch(() => viewed.value?.id, () => {
    if (options.closeDialogs?.()) options.notify(t("library.sets.notifications.goneElsewhere"), "error");
  });

  function section(): SetSection<string, T> | undefined {
    return config.value?.[feature] as unknown as SetSection<string, T> | undefined;
  }

  /**
   * The section as stored. The set functions build plain objects from what they
   * are given, so they get the raw section: a reactive proxy kept inside one
   * would reach chrome.storage.
   */
  function raw(): SetSection<string, T> | undefined {
    const fx = section();
    return fx ? toRaw(fx) : undefined;
  }

  function write(next: SetSection<string, T>) {
    if (config.value) (config.value as unknown as Record<string, unknown>)[feature] = next;
  }

  function labelOf(id: string): string {
    const set = sets.value.find(candidate => candidate.id === id);
    return set ? librarySetLabel(set, t("library.sets.defaultName")) : "";
  }

  /** Makes the set the one that plays. */
  function useSet(id: string) {
    const fx = raw();
    if (!fx) return;
    const name = labelOf(id);
    write(activateLibrarySet(fx, key, id));
    options.notify(t("library.sets.notifications.inUse", { set: name }), "success");
  }

  /** A new set, a copy of the set being viewed or empty, shown and not used. */
  function createSet(name: string, copy: boolean) {
    const fx = raw();
    if (!fx) return;
    const added = addLibrarySet(fx, key, name, copy ? items.value : []);
    write(added.section);
    viewedId.value = added.id;
    options.notify(t("library.sets.notifications.created", { set: name }), "success");
  }

  function renameSet(id: string, name: string) {
    const fx = raw();
    if (!fx) return;
    write(renameLibrarySet(fx, key, id, name));
    options.notify(t("library.sets.notifications.renamed"), "success");
  }

  /** Deletes a set that isn't in use, and then the files of its items that no other list keeps. */
  async function deleteSet(id: string) {
    const fx = raw();
    if (!fx) return;
    const name = labelOf(id);
    const removed = sets.value.find(candidate => candidate.id === id)?.items ?? [];
    const next = deleteLibrarySet(fx, key, id);
    if (next === fx) return;
    write(next);
    options.notify(t("library.sets.notifications.deleted", { set: name }), "success");
    await releaseFiles(removed);
  }

  /** Deletes the files of `candidates`, items already taken out of their list, that no list keeps any more. */
  async function releaseFiles(candidates: readonly T[]) {
    const { fileOf, deleteFile } = options;
    const fx = raw();
    if (!fileOf || !deleteFile || !fx || !candidates.length) return;
    for (const id of unusedLibraryFiles(fx, key, fileOf, candidates)) {
      try {
        await deleteFile(id);
      } catch (error) {
        console.error("Autodarts Tools: couldn't delete a stored file", id, error);
      }
    }
  }

  /** Whether another item, in any list, keeps the same file: an editor replacing it writes a new one. */
  function fileShared(item: T): boolean {
    const fx = raw();
    return Boolean(options.fileOf && fx && libraryFileUses(fx, key, options.fileOf, options.fileOf(item)) > 1);
  }

  return { viewedId, sets, several, viewed, items, viewedLabel, inUseLabel, useSet, createSet, renameSet, deleteSet, releaseFiles, fileShared };
}
```

- [ ] **Step 3: WLED's panel on it**

`Wled.vue`:
- the composable replaces `viewedId`, `sets`, `several`, `viewed`, `effects`, `inUseLabel`, `useSet`, `createSet`, `renameEffectSet`, `deleteEffectSet`, `labelOf` and the gone-elsewhere watcher:
```ts
const { notification, showNotification, hideNotification } = useNotification();
const {
  viewedId, sets, several, viewed, items: effects, viewedLabel, inUseLabel,
  useSet, createSet, renameSet, deleteSet,
} = useLibrarySets("wledFx", { notify: showNotification, closeDialogs });
```
- `closeDialogs` closes the effect, CSV and delete-all dialogs, and returns whether any was open;
- `libraryTitle` uses `viewedLabel`;
- the template's `@rename`/`@delete` call `renameSet` and `deleteSet`;
- `wled-panel.test.mts` and `wled-two-tabs.test.mts`:
  - add `import { useLibrarySets } from "@/composables/useLibrarySets";` to their loader imports;
  - call `renameSet`/`deleteSet` where they called `renameEffectSet`/`deleteEffectSet`.

- [ ] **Step 4: Run and check**

```bash
node_modules/.bin/tsx --test $SCR/tests/use-library-sets.test.mts $SCR/tests/wled-panel.test.mts $SCR/tests/wled-two-tabs.test.mts $SCR/tests/library-sets.test.mts $SCR/tests/library-sets-section.test.mts $SCR/tests/use-config.test.mts
node $SCR/sfc-check.cjs components/Settings/Wled.vue
```
Expected: all pass. Mutants:
- `releaseFiles` deleting every candidate;
- `deleteSet` not releasing;
- `fileShared` counting `>= 1`;
- the watcher without `closeDialogs`.

Each must fail.

- [ ] **Step 5: Commit**

```bash
git add composables/useLibrarySets.ts components/Settings/Wled.vue
git commit -m "feat: one composable holds a panel's sets and the files their items share; WLED's panel uses it"
```

### Task 4: Sound FX's sets (`components/Settings/SoundFx.vue`)

**Files:**
- Modify: `components/Settings/SoundFx.vue`
- Test: `$SCR/tests/soundfx-panel.test.mts`. It uses `$SCR/sfc/files-shim.mjs`, a stand-in for `@/utils/helpers` with in-memory IndexedDB/OPFS calls and a log; it is written in this task and used again in Tasks 5–6.

**Interfaces:**
- Consumes: `useLibrarySets("soundFx", …)` (Task 3), `LibrarySets.vue` (Task 2).

- [ ] **Step 1: The files shim**

`$SCR/sfc/files-shim.mjs`. `load-sfc` takes it as the source of `@/utils/helpers`, through `shims: { "@/utils/helpers": … }`, so the real module still loads under its real path:
```js
export * from "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/utils/helpers.ts";
const files = globalThis.__files ??= { caller: new Map(), fx: new Map(), gif: new Map(), log: [], seq: 0 };
const save = store => async (name, base64, existingId) => { const id = existingId || `${store}-${++files.seq}`; files[store].set(id, { name, base64 }); files.log.push([ "save", store, id ]); return id; };
const get = store => async id => files[store].get(id)?.base64 ?? null;
const del = store => async (id) => { files.log.push([ "delete", store, id ]); return files[store].delete(id); };
export const isIndexedDBAvailable = () => true;
export const saveSoundToIndexedDB = save("caller");
export const getSoundFromIndexedDB = get("caller");
export const deleteSoundFromIndexedDB = del("caller");
export const saveSoundFxToIndexedDB = save("fx");
export const getSoundFxFromIndexedDB = get("fx");
export const deleteSoundFxFromIndexedDB = del("fx");
export const isOPFSAvailable = () => true;
export const saveAnimationToOPFS = async (name) => { const id = `gif-${++files.seq}`; files.gif.set(id, name); files.log.push([ "save", "gif", id ]); return id; };
export const getAnimationFromOPFS = async id => (files.gif.has(id) ? `blob:${id}` : null);
export const getAnimationNameFromOPFS = async id => files.gif.get(id) ?? null;
export const deleteAnimationFromOPFS = async (id) => { files.log.push([ "delete", "gif", id ]); return files.gif.delete(id); };
```
`load-sfc.mjs`'s shim plugin resolves exact names. `@/utils/helpers` is matched before the `@/` rule, and the shim's own `export *` names the real file by its path, so it doesn't come back to the shim.

- [ ] **Step 2: The failing test**

`soundfx-panel.test.mts` is modelled on `wled-panel.test.mts`.
- **Its harness:**
  - the in-memory `storage` with `structuredClone`, `browser`, `Audio`, and the files shim;
  - globals for what `useTTS`/`sound-copies` touch, added as the first run shows them;
  - `soundFx.sounds` hold `a` (`soundId: "fx-a"`), `b` (`"fx-b"`) and `t` (TTS), with `files.fx` holding `fx-a` and `fx-b`.
- **The cases, in order:**
  1. One set: `page.items.value` is the stored `soundFx.sounds`, and `libraryTitle` is "Sounds".
  2. `createSet("Halloween", true)`: viewed; the stored `sets[1].sounds` share `fx-a` and `fx-b`; `libraryTitle` is "Sounds in Halloween".
  3. In Halloween, `removeSound(0)` (a):
     - Halloween's list loses `a`, and `soundFx.sounds` still has it;
     - no `delete fx-a` in `files.log`;
     - there was a `stopPlayback` if it was playing: unchanged code.
  4. In Halloween, edit `b`:
     - `editSound(0)`, then wait for its base64;
     - change its name, then `saveSound()`;
     - a new `fx-…` file is saved for Halloween's `b`, and Default's `b` still has `fx-b`;
     - no delete of `fx-b`.
  5. In Halloween, `openDeleteAllModal()`, then `deleteAllSounds()`:
     - Halloween is empty, and `soundFx.sounds` is unchanged;
     - the `fx-…` file from step 4 is deleted, because no list keeps it, and `fx-b` is not.
  6. `useSet(halloween)`: `soundFx.sounds` is `[]` (Halloween's), and Default's list is back on its slot.
  7. `deleteSet("default")` is refused while Default isn't in use? No: Default isn't in use any more, so it is deleted. Its `fx-a` and `fx-b` are deleted with it (nothing else keeps them), and `t` has no file.
  8. Every save could be stored (no `DataCloneError`).

Run it. Expected: FAIL (the panel has no `items`, `createSet` or the rest).

- [ ] **Step 3: The panel**

`SoundFx.vue`:
- **Imports:** `LibrarySets from "./Library/LibrarySets.vue"`.
- **The composable**, after `useNotification()`:
```ts
const {
  viewedId, sets, several, viewed, items: sounds, viewedLabel, inUseLabel,
  useSet, createSet, renameSet, deleteSet, releaseFiles,
} = useLibrarySets("soundFx", {
  notify: showNotification,
  fileOf: sound => sound.soundId,
  deleteFile: deleteSoundFxFromIndexedDB,
  closeDialogs,
});
const libraryTitle = computed(() => (several.value ? t("library.sets.soundFx.listTitle", { set: viewedLabel.value }) : t("library.sounds.title")));
```
- **`closeDialogs()`:**
  - closes the sound, upload, TTS and delete-all dialogs, through their own close functions;
  - returns whether any of `showSoundModal`, `showUploadModal`, `showTTSModal` or `showDeleteAllModal` was open.
- **Template:**
  - `<LibrarySets @create="createSet" @delete="deleteSet" @rename="renameSet" @use="useSet" v-model="viewedId" :sets="sets" feature="soundFx" />` between the Options `</section>` and `<LibrarySection`;
  - `LibrarySection` gets `:key="viewed?.id"` and `:title="libraryTitle"`;
  - every `config.soundFx.sounds[entry.index]` becomes `sounds[entry.index]`, and the delete-all title's count becomes `sounds.length`;
  - the card: as WLED's, `flex items-center gap-3` on the toggle row, and then:
```vue
          <p v-if="several" class="flex min-w-0 max-w-[45%] items-center gap-1.5 text-sm font-semibold text-white/80">
            <span class="icon-[material-symbols--library-music-outline-rounded] shrink-0 text-base" aria-hidden="true" />
            <span class="sr-only">{{ t("library.sets.soundFx.cardLabel") }}</span>
            <span class="truncate">{{ inUseLabel }}</span>
          </p>
```
- **Script:** every `config.value?.soundFx.sounds`, `config.value!.soundFx.sounds` and `config.value.soundFx.sounds` becomes `sounds.value`, in:
  - `entries`, `draftHasFile`, `moreActions`, `moveSound`, `editAny`, `togglePlay`, `previewDraft`, `editSound`;
  - `saveSound`, `removeSound`, `processFiles`, `sortSoundsByTriggers`, `deleteAllSounds`, `saveTTSSound`.
- **Changed behaviour:**
  - `removeSound`: splice first, then `await releaseFiles([ sound ])` in place of `deleteSoundFxFromIndexedDB`.
  - `saveSound` editing: after `sounds.value[editingIndex.value] = sound`, `if (existingSound.soundId !== sound.soundId) await releaseFiles([ existingSound ]);` takes the place of the direct delete. `saveSound` starts with `if (!showSoundModal.value) return;`.
  - `deleteAllSounds`: `if (!config.value || !showDeleteAllModal.value) return; const removed = sounds.value.splice(0); await releaseFiles(removed);`, then the close and the notification as now.
  - `processFiles`: `const target = sounds.value;` at the start, and `target.unshift(…)` for each file, so the upload lands in the set it started in. It starts with `if (!showUploadModal.value) return;`.
  - `saveTTSSound` starts with `if (!showTTSModal.value) return;`.
  - The deletions `removeSound`, `deleteAllSounds` and `saveSound` no longer call `deleteSoundFxFromIndexedDB` themselves.

- [ ] **Step 4: Run and check**

```bash
node_modules/.bin/tsx --test $SCR/tests/soundfx-panel.test.mts
node $SCR/sfc-check.cjs components/Settings/SoundFx.vue
yarn lint --base main
```
Expected: pass; `ok`; nothing new. Mutants:
- `removeSound` deleting its file directly again;
- `processFiles` writing to `sounds.value` at the end, not to the target;
- `deleteAllSounds` without `releaseFiles`.

Each must fail.

- [ ] **Step 5: Commit**

```bash
git add components/Settings/SoundFx.vue
git commit -m "feat: Sound FX keeps sets of sounds, sharing their recordings, and you choose which one plays"
```

### Task 5: The Caller's sets (`components/Settings/Caller.vue`)

**Files:**
- Modify: `components/Settings/Caller.vue`
- Test: `$SCR/tests/caller-panel.test.mts`, with the files shim

**Interfaces:**
- Consumes: `useLibrarySets("caller", …)` and `LibrarySets.vue`.

- [ ] **Step 1: The failing test**

`caller-panel.test.mts`, as Sound FX's, with:
- `caller.sounds` `a` (`caller-a`), `b` (`caller-b`) and `t` (TTS);
- `libraryTitle` "Sounds", then "Sounds in Halloween".

The cases:
1. In Halloween (a copy), edit `a`: `editSound(0)`, wait for its base64, replace `newSound.base64` with a new recording, and `saveSound()`.
   - The file is saved under a **new** id (no `existingId`), and `files.caller` still holds `caller-a` with the old recording, for Default.
2. In Default, edit `b`, which nothing else shares now? It isn't: Halloween still has `b`. First remove `b` from Halloween, then edit Default's `b` with a new recording.
   - It is saved in place, under `caller-b`: the file is overwritten, as before sets.
3. In Halloween, `removeSound` of `a`: Halloween's own new file is deleted, and `caller-a` stays.
4. In Halloween, `deleteAllSounds`: Default's files stay.
5. Importing a caller set from a ZIP lands in the set viewed when it started. Call the import's last step directly: `fetchSoundsFromURL` with `checkIfZipURL` and the download stubbed is too wide, so the test covers the two lines that join the lists, through `importSounds(target, sounds)` (below).
6. `deleteSet` of a set not in use deletes its own files only.

Run it. Expected: FAIL.

- [ ] **Step 2: The panel**

`Caller.vue`, as Sound FX's:
- the composable for `"caller"`, with `deleteFile: deleteSoundFromIndexedDB`;
- `libraryTitle` uses `library.sets.caller.listTitle` / `library.sounds.title`;
- the `LibrarySets` section, the keyed library, `sounds[entry.index]`, and the card line (`library.sets.caller.cardLabel`);
- `closeDialogs` closes the sound, upload, TTS, delete-all and import dialogs. The import dialog is closed only while no import runs (`!isImporting.value`); an import that runs lands where it started.

Every list reference becomes `sounds.value`. Beyond Sound FX's:
- `saveSound` editing with a new recording writes in place only when no other list shares the file:
```ts
    if (existingSound?.soundId && !fileShared(existingSound)) {
      // Update existing sound in IndexedDB: no other set keeps this file
      soundId = await saveSoundToIndexedDB(name, base64, existingSound.soundId);
    } else {
      // A new file: also when another set keeps the old one, which stays as it is
      soundId = await saveSoundToIndexedDB(name, base64);
    }
```
  After the assignment, `if (existingSound.soundId && existingSound.soundId !== soundId) await releaseFiles([ existingSound ]);` takes the place of the direct delete.
- Joining an import into a list is one function, and the import keeps its target from its start:
```ts
/** Puts imported sounds at the top of `target`, the list of the set that was viewed when the import started. */
function importSounds(target: ISound[], imported: ISound[]) {
  target.unshift(...imported);
}
```
  - `fetchSoundsFromURL` takes `const target = sounds.value;` before its first `await`.
  - Its `config.value.caller.sounds = [ ...sounds, ...config.value.caller.sounds ]` (twice) becomes `importSounds(target, sounds)`, and `config.value.caller.sounds.unshift(sound)` (twice) becomes `importSounds(target, [ sound ])`.
  - The `Array.isArray` guard at its start goes: the normaliser guarantees the list.
- `processFiles` keeps its target, as Sound FX's does.
- `deleteAllSounds` splices and releases, as Sound FX's does.
- The confirm guards, as Sound FX's. `fetchSoundsFromURL` also refuses while its dialog is closed.

- [ ] **Step 3: Run, check, commit**

```bash
node_modules/.bin/tsx --test $SCR/tests/caller-panel.test.mts
node $SCR/sfc-check.cjs components/Settings/Caller.vue
yarn lint --base main
git add components/Settings/Caller.vue
git commit -m "feat: the Caller keeps sets of sounds, sharing their recordings, and you choose which one plays"
```
Mutants:
- `saveSound` overwriting a shared file in place;
- `importSounds` given `sounds.value` at the end.

Each must fail.

### Task 6: Animations' sets (`components/Settings/Animations.vue`)

**Files:**
- Modify: `components/Settings/Animations.vue`
- Test: `$SCR/tests/animations-panel.test.mts`, with the files shim

- [ ] **Step 1: The failing test**

As Sound FX's, with:
- `animations.data` of `a` (`animationId: "gif-a"`), `b` (`"gif-b"`) and `u` (a link);
- `libraryTitle` the feature's name, then "Animations in Halloween".

The cases:
- removing a shared GIF in a copy keeps it, and removing the last one deletes it;
- *Delete all* keeps another set's GIFs;
- a deleted set takes only its own GIFs;
- `animationSources` keeps the object URL of a GIF another set still shows, and lets go of a deleted one's;
- an upload (`processGifFiles`) lands in the set viewed when it started.

Run it. Expected: FAIL.

- [ ] **Step 2: The panel**

As Sound FX's:
- the composable for `"animations"`, with `fileOf: a => a.animationId` and `deleteFile: deleteAnimation`;
  - `deleteAnimation(id)` deletes the GIF from OPFS, revokes `animationSources.value[id]` and deletes the entry;
- `libraryTitle` uses `library.sets.animations.listTitle` / `features.animations`;
- the `LibrarySets` section, the keyed library, `items[entry.index]` in the grid, the card line (`library.sets.animations.cardLabel`, icon `icon-[material-symbols--animated-images-outline-rounded]`);
- `closeDialogs` closes the animation, upload and delete-all dialogs.

Every `config.value?.animations.data` becomes the composable's `items` (named `animations` here). That includes the IntersectionObserver's lookup by `dataset.index` and `ownLengthLabels`.
- **`removeAnimation`:** splice, then `releaseFiles([ animation ])`. It no longer deletes or revokes itself: `deleteAnimation` does, and only when no list keeps the GIF.
- **`deleteAllAnimations`:** guard, splice, release. The cache is cleared only through `deleteAnimation`.
- **`processGifFiles`:** keeps its target, and starts with `if (!showGifUploadModal.value) return;`.
- **`saveAnimation`:** gets the guard, and writes to `animations.value`.

- [ ] **Step 3: Run, check, commit**

```bash
node_modules/.bin/tsx --test $SCR/tests/animations-panel.test.mts
node $SCR/sfc-check.cjs components/Settings/Animations.vue
yarn lint --base main
git add components/Settings/Animations.vue
git commit -m "feat: Animations keeps sets of GIFs, sharing their files, and you choose which one plays"
```

### Task 7: README, changelog, glossary

- [ ] **Step 1: README**
  - **Animations, Caller and Sound FX** each get a *Configuration* line: "**Sets**: keep more than one list, such as one for Halloween, and choose which one plays. See [Sets of animations](#sets-of-animations)", and a short part.
  - **The parts** (*Sets of animations*, *Sound sets* for the Caller, *Sound sets* for Sound FX, with distinct anchors) each say what their sets are called and where the section is. They point to WLED's [Effect sets](#effect-sets) for the pills, *Use this set*, renaming and deleting.
    - The sound parts add that a copied set shares its recordings with the set it came from, and that deleting a sound, *Delete all* or a whole set keeps a recording another set still uses. Animations' says the same of its GIFs.
    - The Caller's adds that *Import a caller set* fills the set you're looking at, so a new empty set and an import make a second voice.
  - **WLED's Effect sets** says the same works for the other three.
- [ ] **Step 2: CHANGELOG:** `[Unreleased]` → *Added*. The WLED entry becomes one entry for all four:
  - "**WLED, Animations, the Caller and Sound FX** keep more than one set …";
  - the Caller's sound sets and caller sets;
  - shared files;
  - the "Checked …" sentence after Task 8.
- [ ] **Step 3: Commit** `docs: sets for Animations, the Caller and Sound FX in the README and the changelog`.

### Task 8: Verification

- [ ] **Step 1: Headless runtime.** `run-sets.mjs` (WLED) passes on `library-sets.ts`.

  Sound FX:
  - bundle `entrypoints/match.content/sound-fx.ts` with `$SCR/wled-int/build.mjs`'s method, its WXT auto-imports prepended per file (see memory *trigger-logic-is-testable-under-tsx*);
  - drive it with a match frame;
  - record `Audio` plays: after `activateLibrarySet` to Halloween, only Halloween's sound's URL plays.

  If the bundle needs more than an hour of stubs, ledger a ruling and rely on the live check in Step 3.
- [ ] **Step 2: Static checks.**
  - `yarn compile` (the baseline), `yarn lint --base main` and `yarn i18n:check`;
  - `yarn build` and `yarn build:firefox`, with the manifests' permissions unchanged.
- [ ] **Step 3: The dev Chrome.**
  - **Setup:** `ListAgents`, then the backup, then the test config: WLED's stand-in effects plus a few test sounds and GIFs of my own.
  - **For each of Animations, the Caller and Sound FX, in a tab of my own:**
    - opening the panel writes no `sets`;
    - New set (copy) gives storage with shared ids;
    - in the new set: delete an item that has a file, and the file is still in IndexedDB/OPFS;
    - upload into it: the new file lands in that set;
    - *Use this set*, rename, delete the set: the files it alone kept are gone.
  - **WLED's walkthrough again** (`e2e/panel.mjs`).
  - **Screenshots** of each new section in en/de/nl at 1600 px and 390 px, and the four cards.
  - **Live:**
    - Sound FX's lobby or match ambient sound from the set in use, through the play recorder (memory *testing-sound-engines-with-a-play-recorder*);
    - WLED's `e2e/live.mjs` once more.
  - **Restore:** the config and the tab keys; my IndexedDB and OPFS entries deleted, and the user's counted before and after.
- [ ] **Step 4:** fix what is found, each with its own test and commit.

### Task 9: Review and land it

- [ ] A fresh reviewer on the most capable model reviews `main..feat/library-sets`, with the Review Focus. One fix pass for Critical and Important.
- [ ] Merge into `main` locally with `--no-ff` from a temporary worktree, as on aee35d7. Nothing pushed.
- [ ] Memory: update `wled-effect-sets.md` (now the libraries' sets), and record the files shim and the panel tests.
