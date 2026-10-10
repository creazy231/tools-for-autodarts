# WLED effect sets: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Users keep several named sets of WLED effects (Default, Halloween, a birthday…) and choose which one plays.

**Architecture:**
- `wledFx.effects` stays the list that plays: the set in use's. The other sets wait in an optional `wledFx.sets`, where the set in use keeps its slot by id and name, and `wledFx.activeSet` names it.
- A pure module, `utils/wled-sets.ts`, does every set operation as `wledFx → wledFx`.
- The settings view one set and use another. A new `components/Settings/Wled/EffectSets.vue` draws the sets, and `Wled.vue` points its effect editor at the set being viewed.
- The runtime (`entrypoints/match.content/wled.ts`) is untouched.

**Tech Stack:** TypeScript, Vue 3.4 `<script setup>`, WXT 0.20; tsx + `node:test` for the pure module; esbuild for the real content-script module; Playwright over the yarn dev Chrome's CDP `:9222`.

**Spec:** `docs/superpowers/specs/2026-10-10-wled-effect-sets-design.md`

`$REPO` is `/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt`, `$SCR` `/private/tmp/claude-501/-Volumes-WD-BLACK-PROJECTS-Autodarts-autodarts-tools-wxt/90285676-787c-434d-a2bb-d7fef5d7f8a5/scratchpad`. The repo has no test framework, so tests live in `$SCR`, as on 2026-10-09. Run them with the repo as cwd: `cd $REPO && node_modules/.bin/tsx --test $SCR/tests/<file>`.

## Global Constraints

- **Shape:**
  - `IWledSet { id: string; name: string; effects?: IWled[] }`;
  - `wledFx.sets?: IWledSet[]` and `wledFx.activeSet?: string`;
  - the set in use's entry has no `effects`, which are `wledFx.effects`;
  - the first set's id is `"default"` and its stored name `""`;
  - new ids are `set-` and 8 base-36 characters.
- **No migration:** `CONFIG_VERSION`, `defaultConfig` and `entrypoints/match.content/wled.ts` stay as they are. A config without `sets` gets none written until a second set is made.
- **Copies are deep** (JSON), so no two sets share an effect object.
- **Names:** required, trimmed, unique ignoring case. A stored `""` counts as the default name in the current language.
- **Design language** (memory *settings-design-language*):
  - *Add* stays the panel's only blue button: **New set** and **Use this set** are default buttons;
  - colour is used only for the in-use dot (`--ad-action-primary`);
  - deleting a set takes a dialog with its effect count;
  - set actions are under a quiet **⋯**.
- **Text:**
  - every string from `t()`, in en/de/nl in the same change;
  - German says *du*, Dutch *je*;
  - "Effect set" is *Effekt-Set* in German and *effectenset* in Dutch, and "Default" is *Standard* and *Standaard*.
- **Browser:**
  - only the yarn dev Chrome, in a tab of my own;
  - `config-2-0-0` backed up before the first write and restored after;
  - WLED effects in test configs point only at a stand-in on the LAN IP;
  - never press play or **Test** on an effect that points at real lights (192.168.0.227, 192.168.2.49/.95);
  - no `page.route` on a match tab.
- **Checks:**
  - `yarn compile` adds no error to the baseline measured before Task 1;
  - `yarn lint --base main` adds nothing;
  - `yarn i18n:check` passes;
  - `yarn build` and `yarn build:firefox` pass, with the manifests' `permissions` and `host_permissions` unchanged.
- **Commits:** one per task, on `feat/wled-effect-sets`; merged into `main` locally with `--no-ff`; never pushed; no version bump.

## Review Focus

1. **Editing a set that isn't in use.** Toggle, edit, delete, drag, sort, CSV import and *Delete all* must change that set's stored list and never `wledFx.effects`. Pinned in Task 1, where `listSets` hands back the stored arrays themselves, and in Task 5, which reads storage back after each edit in the panel.
2. **Switching back and forth after edits.** No effect may be lost or duplicated, and the lists must move, not be copied. Pinned in Task 1: the very same arrays come back after A → B → A.
3. **A config from before sets**, stored or imported. It must show one set and play as before, and opening the panel must not write `sets`. Pinned in Task 1 (`listSets`, and `normalizeWledSets` without sets) and in Task 5 (storage read back after opening the panel).
4. **A long name, a name of spaces, a name already taken (in any case), and "Default" when the first set is unnamed.** These must be refused, or shown without breaking the row. Pinned in Task 1 (`setNameTaken`), Task 3 (the dialog's checks) and Task 5 (a 40-character name at 390 px).
5. **Deleting the set in use.** It must be impossible from the function and greyed out in the menu. Pinned in Task 1 (`deleteSet` gives back its input) and Task 5.

---

### Task 1: The sets module (`utils/wled-sets.ts`, `IWledSet`)

**Files:**
- Create: `utils/wled-sets.ts`
- Modify: `utils/storage.ts` (`wledFx` in `IConfig`, and `IWledSet` after `IWled`)
- Test: `$SCR/tests/wled-sets.test.mts`

**Interfaces:**
- Produces:
  - `export const DEFAULT_SET_ID = "default"`
  - `export interface WledSetView { id: string; name: string; effects: IWled[]; active: boolean }`
  - `export function listSets(wledFx: IConfig["wledFx"]): WledSetView[]`
  - `export function setLabel(set: { name: string }, defaultName: string): string`
  - `export function setNameTaken(sets: readonly { id: string; name: string }[], name: string, defaultName: string, exceptId?: string): boolean`
  - `export function normalizeWledSets(wledFx: IConfig["wledFx"]): IConfig["wledFx"]`
  - `export function activateSet(wledFx, id: string): IConfig["wledFx"]`
  - `export function addSet(wledFx, name: string, effects: readonly IWled[]): { wledFx: IConfig["wledFx"]; id: string }`
  - `export function renameSet(wledFx, id: string, name: string): IConfig["wledFx"]`
  - `export function deleteSet(wledFx, id: string): IConfig["wledFx"]`
  - `export interface IWledSet` in `utils/storage.ts`

- [ ] **Step 0: Measure the compile baseline** (before any code change)

```bash
cd $REPO && yarn compile > $SCR/compile-baseline.log 2>&1; grep -c "error TS" $SCR/compile-baseline.log; grep "error TS" $SCR/compile-baseline.log | cut -d'(' -f1 | sort | uniq -c
```

- [ ] **Step 1: Write the failing test**

```ts
// $SCR/tests/wled-sets.test.mts
import assert from "node:assert/strict";
import { test } from "node:test";

const REPO = "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt";
const sets = await import(`${REPO}/utils/wled-sets.ts`);
const { DEFAULT_SET_ID, activateSet, addSet, deleteSet, listSets, normalizeWledSets, renameSet, setLabel, setNameTaken } = sets;

const effect = (name: string) => ({ name, type: "URL", url: `http://wled.test/${name}`, preset: "0", json_api: "", enabled: true, triggers: [ name ] });
const base = (effects = [ effect("gameon"), effect("takeout") ]) => ({ enabled: true, onlyOnce: true, boardIds: [ "b" ], effects });

/** Frozen all the way down: a function that changes its input throws (ES modules are strict). */
function frozen<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.values(value).forEach(frozen);
    Object.freeze(value);
  }
  return value;
}

/** Default, plus Halloween with one effect of its own: Default in use. */
function twoSets() {
  const start = base();
  const { wledFx, id } = addSet(start, "Halloween", [ effect("pumpkin") ]);
  return { start, wledFx, id };
}

test("a config without sets is one set: the one in use, named nothing, its list effects itself", () => {
  const wledFx = base();
  const list = listSets(wledFx);
  assert.equal(list.length, 1);
  assert.deepEqual({ id: list[0].id, name: list[0].name, active: list[0].active }, { id: DEFAULT_SET_ID, name: "", active: true });
  assert.equal(list[0].effects, wledFx.effects);
});

test("adding a set writes the first one out and keeps it in use", () => {
  const start = frozen(base());
  const { wledFx, id } = addSet(start, "  Halloween ", start.effects);
  assert.match(id, /^set-[0-9a-z]{1,8}$/);
  assert.equal(wledFx.activeSet, DEFAULT_SET_ID);
  assert.equal(wledFx.effects, start.effects);
  assert.deepEqual(wledFx.sets.map(set => set.id), [ DEFAULT_SET_ID, id ]);
  assert.deepEqual(wledFx.sets[0], { id: DEFAULT_SET_ID, name: "" });
  assert.equal(wledFx.sets[1].name, "Halloween");
  assert.deepEqual(wledFx.sets[1].effects, start.effects);
  assert.deepEqual([ wledFx.enabled, wledFx.onlyOnce, wledFx.boardIds ], [ true, true, [ "b" ] ]);
});

test("a copy shares no object with what it was copied from", () => {
  const start = base();
  const { wledFx, id } = addSet(start, "Copy", start.effects);
  const copy = wledFx.sets.find(set => set.id === id).effects;
  assert.notEqual(copy, start.effects);
  assert.notEqual(copy[0], start.effects[0]);
  copy[0].enabled = false;
  assert.equal(start.effects[0].enabled, true);
});

test("an empty new set has no effects", () => {
  const { wledFx, id } = addSet(base(), "Birthday", []);
  assert.deepEqual(wledFx.sets.find(set => set.id === id).effects, []);
});

test("ids never repeat", () => {
  let wledFx = base();
  const ids = new Set([ DEFAULT_SET_ID ]);
  for (let i = 0; i < 200; i++) {
    const added = addSet(wledFx, `Set ${i}`, []);
    assert.equal(ids.has(added.id), false);
    ids.add(added.id);
    wledFx = added.wledFx;
  }
});

test("using a set moves the lists, and using the first again gives back the very same arrays", () => {
  const { start, wledFx, id } = twoSets();
  const halloween = wledFx.sets[1].effects;
  const on = activateSet(frozen(wledFx), id);
  assert.equal(on.activeSet, id);
  assert.equal(on.effects, halloween);
  assert.equal(on.sets[0].effects, start.effects);
  assert.equal("effects" in on.sets[1], false);
  assert.deepEqual(on.sets.map(set => set.name), [ "", "Halloween" ]);
  const back = activateSet(on, DEFAULT_SET_ID);
  assert.equal(back.effects, start.effects);
  assert.equal(back.sets[1].effects, halloween);
  assert.equal("effects" in back.sets[0], false);
  assert.equal(back.activeSet, DEFAULT_SET_ID);
});

test("using the set in use, or an id no set has, gives back the input itself", () => {
  const { wledFx } = twoSets();
  assert.equal(activateSet(wledFx, DEFAULT_SET_ID), wledFx);
  assert.equal(activateSet(wledFx, "nope"), wledFx);
  const plain = base();
  assert.equal(activateSet(plain, DEFAULT_SET_ID), plain);
});

test("listSets gives each set its own stored list, the set in use effects", () => {
  const { wledFx, id } = twoSets();
  const on = activateSet(wledFx, id);
  const list = listSets(on);
  assert.deepEqual(list.map(set => [ set.id, set.active ]), [ [ DEFAULT_SET_ID, false ], [ id, true ] ]);
  assert.equal(list[0].effects, on.sets[0].effects);
  assert.equal(list[1].effects, on.effects);
});

test("renaming trims, leaves the others, and ignores an id no set has", () => {
  const { wledFx, id } = twoSets();
  const renamed = renameSet(frozen(wledFx), id, "  Spooky ");
  assert.deepEqual(renamed.sets.map(set => set.name), [ "", "Spooky" ]);
  assert.equal(renameSet(wledFx, "nope", "x"), wledFx);
  const first = renameSet(base(), DEFAULT_SET_ID, "Everyday");
  assert.deepEqual(first.sets, [ { id: DEFAULT_SET_ID, name: "Everyday" } ]);
  assert.equal(first.activeSet, DEFAULT_SET_ID);
});

test("deleting removes a set not in use, never the set in use, and keeps the last set written out", () => {
  const { wledFx, id } = twoSets();
  assert.equal(deleteSet(wledFx, DEFAULT_SET_ID), wledFx);
  assert.equal(deleteSet(wledFx, "nope"), wledFx);
  const plain = base();
  assert.equal(deleteSet(plain, DEFAULT_SET_ID), plain);
  const left = deleteSet(frozen(wledFx), id);
  assert.deepEqual(left.sets, [ { id: DEFAULT_SET_ID, name: "" } ]);
  assert.equal(left.effects, wledFx.effects);
  const on = activateSet(wledFx, id);
  const kept = deleteSet(on, DEFAULT_SET_ID);
  assert.deepEqual(kept.sets.map(set => set.name), [ "Halloween" ]);
  assert.equal(kept.activeSet, id);
});

test("normalize: no usable sets means no sets and no activeSet", () => {
  for (const stored of [ undefined, null, "x", [], [ null, 3, { name: "no id" }, { id: "" } ] ]) {
    const fixed = normalizeWledSets({ ...base(), sets: stored, activeSet: "default" });
    assert.equal("sets" in fixed, false, JSON.stringify(stored));
    assert.equal("activeSet" in fixed, false);
  }
});

test("normalize: a repeated id is dropped, a name that isn't text is empty, a set without a list gets an empty one", () => {
  const fixed = normalizeWledSets({ ...base(), activeSet: "a", sets: [ { id: "a", name: "A" }, { id: "b", name: 7 }, { id: "a", name: "again", effects: [] } ] });
  assert.deepEqual(fixed.sets, [ { id: "a", name: "A" }, { id: "b", name: "", effects: [] } ]);
});

test("normalize: the set in use loses a list of its own, effects wins", () => {
  const wledFx = base();
  const fixed = normalizeWledSets({ ...wledFx, activeSet: "a", sets: [ { id: "a", name: "A", effects: [ effect("stray") ] }, { id: "b", name: "B", effects: [] } ] });
  assert.deepEqual(fixed.sets[0], { id: "a", name: "A" });
  assert.equal(fixed.effects, wledFx.effects);
});

test("normalize: an activeSet that names no set puts the playing list first, under that id", () => {
  const fixed = normalizeWledSets({ ...base(), activeSet: "gone", sets: [ { id: "b", name: "B", effects: [] } ] });
  assert.deepEqual(fixed.sets.map(set => set.id), [ "gone", "b" ]);
  assert.deepEqual(fixed.sets[0], { id: "gone", name: "" });
  assert.equal(fixed.activeSet, "gone");
});

test("normalize: no activeSet puts it first as default, or under a new id when default is taken", () => {
  const free = normalizeWledSets({ ...base(), sets: [ { id: "b", name: "B", effects: [] } ] });
  assert.deepEqual([ free.activeSet, free.sets[0] ], [ DEFAULT_SET_ID, { id: DEFAULT_SET_ID, name: "" } ]);
  const taken = normalizeWledSets({ ...base(), sets: [ { id: DEFAULT_SET_ID, name: "D", effects: [] } ] });
  assert.match(taken.activeSet, /^set-/);
  assert.deepEqual(taken.sets.map(set => set.id), [ taken.activeSet, DEFAULT_SET_ID ]);
});

test("normalize: a shape that needs nothing keeps its sets, lists and unknown fields as they were", () => {
  const { wledFx } = twoSets();
  const stored = { ...wledFx, sets: [ wledFx.sets[0], { ...wledFx.sets[1], dates: "10-25/11-01" } ] };
  const fixed = normalizeWledSets(stored);
  assert.equal(fixed.effects, stored.effects);
  assert.equal(fixed.sets[0], stored.sets[0]);
  assert.equal(fixed.sets[1], stored.sets[1]);
});

test("normalize: effects that aren't a list become an empty one", () => {
  assert.deepEqual(normalizeWledSets({ ...base(), effects: null }).effects, []);
});

test("names: trimmed, in any case, the empty name under the default name, except the set renamed", () => {
  const list = [ { id: "default", name: "" }, { id: "h", name: "Halloween" } ];
  assert.equal(setNameTaken(list, " halloween ", "Default"), true);
  assert.equal(setNameTaken(list, "DEFAULT", "Default"), true);
  assert.equal(setNameTaken(list, "Birthday", "Default"), false);
  assert.equal(setNameTaken(list, "Halloween", "Default", "h"), false);
  assert.equal(setLabel({ name: "" }, "Standard"), "Standard");
  assert.equal(setLabel({ name: "Halloween" }, "Standard"), "Halloween");
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd $REPO && node_modules/.bin/tsx --test $SCR/tests/wled-sets.test.mts`
Expected: FAIL, `Cannot find module …/utils/wled-sets.ts`.

- [ ] **Step 3: The type, in `utils/storage.ts`**

In `IConfig.wledFx`, replace `effects: IWled[];` with:
```ts
    /** The effects that play: the set in use's (utils/wled-sets.ts). */
    effects: IWled[];
    /**
     * Every effect set in the user's order, the set in use by its id and name
     * only. Absent until a second set is made: until then `effects` is the one
     * set there is.
     */
    sets?: IWledSet[];
    /** The id of the set in use, whose effects are `effects`. */
    activeSet?: string;
```
After `export interface IWled { … }`:
```ts
/**
 * A list of WLED effects kept for an occasion, such as Halloween. One set is in
 * use at a time, and its effects are `wledFx.effects`: see utils/wled-sets.ts.
 */
export interface IWledSet {
  id: string;
  /** As typed. "" is the first set, which the settings call "Default" in their language. */
  name: string;
  /** Left out on the set in use, whose effects are `wledFx.effects`. */
  effects?: IWled[];
}
```

- [ ] **Step 4: The module**

```ts
// utils/wled-sets.ts
import type { IConfig, IWled, IWledSet } from "@/utils/storage";

/**
 * WLED's effect sets: lists of effects kept for an occasion, such as Halloween,
 * of which one is in use.
 *
 * The list that plays stays where the runtime has always read it,
 * `wledFx.effects`. The other sets' lists wait in `wledFx.sets`, where the set
 * in use keeps its place by id and name only. So a config from before sets is
 * one set, an export plays its set in use in an older version, and
 * entrypoints/match.content/wled.ts knows nothing of sets.
 * Spec: docs/superpowers/specs/2026-10-10-wled-effect-sets-design.md.
 *
 * Each function takes the `wledFx` section and returns a new one without
 * changing its input, and nothing here is imported at runtime, so tsx runs it.
 */

type WledFx = IConfig["wledFx"];
type WrittenOut = WledFx & { sets: IWledSet[]; activeSet: string };

/** The id of the first set: the one a config from before sets is. */
export const DEFAULT_SET_ID = "default";

/** A set as the settings show it. */
export interface WledSetView {
  id: string;
  /** As stored: "" is the first set, shown under the default name (setLabel). */
  name: string;
  /** The stored list itself, so an edit in place reaches the config: for the set in use, `wledFx.effects`. */
  effects: IWled[];
  /** Whether it is the set in use. */
  active: boolean;
}

/** Every set in order. A config without sets is one: the set in use, named "". */
export function listSets(wledFx: WledFx): WledSetView[] {
  const fx = normalizeWledSets(wledFx);
  if (!fx.sets || !fx.activeSet) return [ { id: DEFAULT_SET_ID, name: "", effects: fx.effects, active: true } ];
  return fx.sets.map(set => ({
    id: set.id,
    name: set.name,
    effects: set.id === fx.activeSet ? fx.effects : set.effects ?? [],
    active: set.id === fx.activeSet,
  }));
}

/** What a set is called: its name, or `defaultName` for the first set until it is renamed. */
export function setLabel(set: { name: string }, defaultName: string): string {
  return set.name || defaultName;
}

/** Whether a set other than `exceptId` is called `name`, trimmed and in any case. A set named "" goes by `defaultName`. */
export function setNameTaken(sets: readonly { id: string; name: string }[], name: string, defaultName: string, exceptId?: string): boolean {
  const wanted = name.trim().toLocaleLowerCase();
  return sets.some(set => set.id !== exceptId && setLabel(set, defaultName).trim().toLocaleLowerCase() === wanted);
}

/**
 * The shape the functions here rely on, from whatever was stored or imported:
 * - no usable set: no `sets` and no `activeSet` at all;
 * - each set with an id of its own and a name, both text;
 * - a list of effects on every set but the one in use, whose list is `effects`;
 * - a set in use, put first when `activeSet` names none.
 *
 * A set that needs nothing comes back as the same object, its list the same
 * array, so the settings go on editing what is stored. Fields this version
 * doesn't know are kept.
 */
export function normalizeWledSets(wledFx: WledFx): WledFx {
  if (!wledFx || typeof wledFx !== "object") return wledFx;
  const { sets: stored, activeSet: storedActive, ...rest } = wledFx;
  const fx: WledFx = Array.isArray(rest.effects) ? rest : { ...rest, effects: [] };

  const ids = new Set<string>();
  const kept: IWledSet[] = [];
  for (const set of Array.isArray(stored) ? stored : []) {
    if (!set || typeof set !== "object" || typeof set.id !== "string" || !set.id || ids.has(set.id)) continue;
    ids.add(set.id);
    kept.push(set);
  }
  if (!kept.length) return fx;

  let activeSet = typeof storedActive === "string" ? storedActive : "";
  if (!activeSet) activeSet = ids.has(DEFAULT_SET_ID) ? newSetId(ids) : DEFAULT_SET_ID;
  const sets = kept.map(set => tidy(set, set.id === activeSet));
  if (!ids.has(activeSet)) sets.unshift({ id: activeSet, name: "" });
  return { ...fx, sets, activeSet };
}

/**
 * `id` as the set in use: the list that plays goes back to its own set, and
 * `id`'s list becomes `effects`. The set already in use, or an id no set has,
 * gives back `wledFx` itself.
 */
export function activateSet(wledFx: WledFx, id: string): WledFx {
  const fx = writtenOut(wledFx);
  const target = fx.sets.find(set => set.id === id);
  if (!target || id === fx.activeSet) return wledFx;
  const sets = fx.sets.map((set) => {
    if (set.id === fx.activeSet) return { ...set, effects: fx.effects };
    return set.id === id ? withoutEffects(set) : set;
  });
  return { ...fx, effects: target.effects ?? [], sets, activeSet: id };
}

/** A new set at the end, holding a copy of `effects`, and its id. The set in use stays in use. */
export function addSet(wledFx: WledFx, name: string, effects: readonly IWled[]): { wledFx: WledFx; id: string } {
  const fx = writtenOut(wledFx);
  const id = newSetId(new Set(fx.sets.map(set => set.id)));
  // JSON rather than structuredClone, which refuses the settings' reactive proxies.
  const set: IWledSet = { id, name: name.trim(), effects: JSON.parse(JSON.stringify(effects)) };
  return { wledFx: { ...fx, sets: [ ...fx.sets, set ] }, id };
}

/** `id` under `name`, trimmed. An id no set has gives back `wledFx` itself. */
export function renameSet(wledFx: WledFx, id: string, name: string): WledFx {
  const fx = writtenOut(wledFx);
  if (!fx.sets.some(set => set.id === id)) return wledFx;
  return { ...fx, sets: fx.sets.map(set => (set.id === id ? { ...set, name: name.trim() } : set)) };
}

/**
 * Every set but `id`. Neither the set in use, whose effects are what plays,
 * nor an id no set has is deleted: both give back `wledFx` itself.
 */
export function deleteSet(wledFx: WledFx, id: string): WledFx {
  const fx = normalizeWledSets(wledFx);
  if (!fx.sets || id === fx.activeSet || !fx.sets.some(set => set.id === id)) return wledFx;
  return { ...fx, sets: fx.sets.filter(set => set.id !== id) };
}

/** `wledFx` with its sets written out: a config without sets gets the one set it is. */
function writtenOut(wledFx: WledFx): WrittenOut {
  const fx = normalizeWledSets(wledFx);
  if (fx.sets && fx.activeSet) return { ...fx, sets: fx.sets, activeSet: fx.activeSet };
  return { ...fx, sets: [ { id: DEFAULT_SET_ID, name: "" } ], activeSet: DEFAULT_SET_ID };
}

/** A stored set in the shape listSets reads, and the same object when it already is. */
function tidy(set: IWledSet, inUse: boolean): IWledSet {
  const name = typeof set.name === "string" ? set.name : "";
  if (inUse) return name === set.name && !("effects" in set) ? set : withoutEffects({ ...set, name });
  const effects = Array.isArray(set.effects) ? set.effects : [];
  return name === set.name && effects === set.effects ? set : { ...set, name, effects };
}

function withoutEffects(set: IWledSet): IWledSet {
  const copy = { ...set };
  delete copy.effects;
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

- [ ] **Step 5: Run the tests**

Run: `cd $REPO && node_modules/.bin/tsx --test $SCR/tests/wled-sets.test.mts`
Expected: all pass. Then a mutation check: in a copy of the module under `$SCR/mut/` (point the test's import at it with `WLED_SETS=…`), make `activateSet` copy `fx.effects` instead of moving it, and make `deleteSet` drop the `fx.activeSet` guard. Each mutant must fail its own test.

- [ ] **Step 6: Commit**

```bash
git add utils/wled-sets.ts utils/storage.ts
git commit -m "feat: WLED's effect sets, as a list that plays and a shelf of the others"
```

### Task 2: Configs come in normalised (`useConfig`, the imports)

**Files:**
- Modify: `composables/useConfig.ts` (`withDefaults`)
- Modify: `components/PageConfig.vue` (both import paths, next to `normalizeTeams`)

**Interfaces:**
- Consumes: `normalizeWledSets(wledFx)` from Task 1.

- [ ] **Step 1: `withDefaults`**

Import `import { normalizeWledSets } from "@/utils/wled-sets";`. In `withDefaults`, after `merged.instantReplay = …`:
```ts
  merged.wledFx = normalizeWledSets(merged.wledFx);
```
In its doc comment, after the sentence on Colors and Instant Replay:
```
 * WLED's effect sets go through normalizeWledSets, so the WLED panel always
 * edits a list that is stored (utils/wled-sets.ts).
```

- [ ] **Step 2: The two imports in `PageConfig.vue`**

Import `import { normalizeWledSets } from "@/utils/wled-sets";`. In both places, after `newConfig.teams = normalizeTeams(newConfig.teams);`:
```ts
          newConfig.wledFx = normalizeWledSets(newConfig.wledFx);
```
The comment above them names `normalizeWledSets` too: "…see renameSettings, normalizeColors, normalizeInstantReplay, normalizeTeams and normalizeWledSets."

- [ ] **Step 3: Check and commit**

```bash
node $SCR/sfc-check.cjs components/PageConfig.vue
yarn compile > $SCR/compile-t2.log 2>&1; grep "error TS" $SCR/compile-t2.log | cut -d'(' -f1 | sort | uniq -c
git add composables/useConfig.ts components/PageConfig.vue
git commit -m "feat: the settings read WLED's effect sets in a shape they can edit, imported or stored"
```
Expected: `ok`; the same error files and counts as the baseline.

### Task 3: The sets section (`components/Settings/Wled/EffectSets.vue`, catalogs)

**Files:**
- Create: `components/Settings/Wled/EffectSets.vue`
- Modify: `locales/{en,de,nl}/wled.ts` (`sets`, `list.titleInSet`), `locales/same-as-english.json` (`de`: `wled.sets.dialog.nameLabel`)

**Interfaces:**
- Consumes: `WledSetView`, `setLabel`, `setNameTaken` (Task 1).
- Produces:
  - props `sets: WledSetView[]` and `modelValue: string` (the id of the set viewed);
  - emits `update:modelValue(id)`, `use(id)`, `create(name, copy: boolean)`, `rename(id, name)` and `delete(id)`.
  - It changes no config itself.

- [ ] **Step 1: The catalogs**

`locales/en/wled.ts`, after `sections`:
```ts
  /**
   * Effect sets (components/Settings/Wled/EffectSets.vue): lists of effects kept for an occasion, of which one plays.
   * "Effect set" in the heading and a dialog's title, so it isn't read as a darts set; "set" where that's clear.
   */
  sets: {
    title: "Effect sets",
    /** Under the heading while there is one set. */
    introSingle: "Keep another list of effects for an occasion, such as Halloween or a birthday, and switch to it when the day comes.",
    /** Under the heading once there are two or more. */
    intro: "One set plays at a time. Pick a set to edit its effects; it plays once you use it.",
    /** The first set's name until it is renamed. It is stored as nothing, so it follows the language. */
    defaultName: "Default",
    new: "New set",
    /** Spoken after the name of the set in use, in its pill. */
    inUse: "In use",
    /** Spoken before the name of the set in use, on the card. */
    cardLabel: "Effect set in use:",
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
      newTitle: "New effect set",
      renameTitle: "Rename set",
      nameLabel: "Name",
      /** Example names. */
      namePlaceholder: "Halloween, Christmas, a birthday…",
      startLabel: "Start with",
      /** `set` is the name of the set being viewed, cut short when long. */
      copy: "A copy of {set}",
      empty: "No effects",
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
      body: {
        one: "The set and its {count} effect are deleted for good. This can't be undone.",
        other: "The set and its {count} effects are deleted for good. This can't be undone.",
      },
      bodyEmpty: "The set has no effects. This can't be undone.",
      confirm: "Delete set",
    },
    notifications: {
      created: "{set} created. It plays once you use it.",
      inUse: "{set} plays now.",
      renamed: "Set renamed",
      deleted: "{set} deleted",
    },
  },
```
and in `list`, after `title`:
```ts
    /** The heading once there are two or more sets: `set` is the name of the set it shows. */
    titleInSet: "Effects in {set}",
```

`locales/de/wled.ts`, same keys:
```ts
  sets: {
    title: "Effekt-Sets",
    introSingle: "Lege für einen Anlass wie Halloween oder einen Geburtstag eine weitere Liste mit Effekten an und wechsle zu ihr, wenn der Tag gekommen ist.",
    intro: "Es wird immer ein Set abgespielt. Wähle ein Set, um seine Effekte zu bearbeiten; abgespielt wird es erst, wenn du es verwendest.",
    defaultName: "Standard",
    new: "Neues Set",
    inUse: "In Verwendung",
    cardLabel: "Verwendetes Effekt-Set:",
    status: {
      inUse: "Das ist das Set, das abgespielt wird.",
      notInUse: "Nicht in Verwendung. Abgespielt wird {set}.",
    },
    use: "Dieses Set verwenden",
    menu: {
      rename: "Set umbenennen",
      delete: "Set löschen",
      deleteInUse: "Verwende zuerst ein anderes Set",
    },
    dialog: {
      newTitle: "Neues Effekt-Set",
      renameTitle: "Set umbenennen",
      nameLabel: "Name",
      namePlaceholder: "Halloween, Weihnachten, ein Geburtstag …",
      // Over two buttons, "Kopie von …" and "Keine Effekte": "Beginnen mit" would want the dative in both.
      startLabel: "Inhalt",
      copy: "Kopie von {set}",
      empty: "Keine Effekte",
      create: "Set erstellen",
    },
    errors: {
      nameMissing: "Gib dem Set einen Namen.",
      nameTaken: "Es gibt schon ein Set mit diesem Namen.",
    },
    deleteDialog: {
      title: "{set} löschen?",
      body: {
        one: "Das Set und sein Effekt werden dauerhaft gelöscht. Dies kann nicht rückgängig gemacht werden.",
        other: "Das Set und seine {count} Effekte werden dauerhaft gelöscht. Dies kann nicht rückgängig gemacht werden.",
      },
      bodyEmpty: "Das Set hat keine Effekte. Dies kann nicht rückgängig gemacht werden.",
      confirm: "Set löschen",
    },
    notifications: {
      created: "{set} erstellt. Abgespielt wird es, sobald du es verwendest.",
      inUse: "Jetzt wird {set} abgespielt.",
      renamed: "Set umbenannt",
      deleted: "{set} gelöscht",
    },
  },
```
`list.titleInSet: "Effekte in {set}",`

`locales/nl/wled.ts`, same keys:
```ts
  sets: {
    title: "Effectensets",
    introSingle: "Maak voor een gelegenheid zoals Halloween of een verjaardag een extra lijst met effecten, en schakel ernaar over als de dag aanbreekt.",
    intro: "Er wordt steeds één set afgespeeld. Kies een set om de effecten ervan te bewerken; hij wordt pas afgespeeld als je hem gebruikt.",
    defaultName: "Standaard",
    new: "Nieuwe set",
    inUse: "In gebruik",
    cardLabel: "Effectenset in gebruik:",
    status: {
      inUse: "Dit is de set die wordt afgespeeld.",
      notInUse: "Niet in gebruik. De set die wordt afgespeeld, is {set}.",
    },
    use: "Deze set gebruiken",
    menu: {
      rename: "Set hernoemen",
      delete: "Set verwijderen",
      deleteInUse: "Gebruik eerst een andere set",
    },
    dialog: {
      newTitle: "Nieuwe effectenset",
      renameTitle: "Set hernoemen",
      nameLabel: "Naam",
      namePlaceholder: "Halloween, Kerst, een verjaardag…",
      startLabel: "Beginnen met",
      copy: "Een kopie van {set}",
      empty: "Geen effecten",
      create: "Set maken",
    },
    errors: {
      nameMissing: "Geef de set een naam.",
      nameTaken: "Er is al een set met die naam.",
    },
    deleteDialog: {
      title: "{set} verwijderen?",
      body: {
        one: "De set en het effect erin worden definitief verwijderd. Dit kan niet ongedaan worden gemaakt.",
        other: "De set en de {count} effecten erin worden definitief verwijderd. Dit kan niet ongedaan worden gemaakt.",
      },
      bodyEmpty: "De set heeft geen effecten. Dit kan niet ongedaan worden gemaakt.",
      confirm: "Set verwijderen",
    },
    notifications: {
      created: "{set} gemaakt. Hij wordt afgespeeld zodra je hem gebruikt.",
      inUse: "Nu wordt {set} afgespeeld.",
      renamed: "Set hernoemd",
      deleted: "{set} verwijderd",
    },
  },
```
`list.titleInSet: "Effecten in {set}",`

Before writing German and Dutch, check the site's own words: `yarn i18n:site "rename"`, `yarn i18n:site "in use"`, `yarn i18n:site "default"`. Where the site has a word for one of these, take it.

`locales/same-as-english.json`: add `"wled.sets.dialog.nameLabel"` to the `de` list, next to `wled.dialog.nameLabel`.

- [ ] **Step 2: The component**

```vue
<!-- components/Settings/Wled/EffectSets.vue -->
<template>
  <section class="mb-10">
    <div class="flex min-h-12 items-center justify-between gap-3">
      <h3 class="adt-section-title">
        {{ t("wled.sets.title") }}
        <span v-if="several" class="adt-section-count">· {{ sets.length }}</span>
      </h3>
      <div class="flex items-center gap-2">
        <AppMenu v-if="several" :items="moreActions">
          <template #trigger="{ open, toggle }">
            <button @click="toggle" :aria-expanded="open" :aria-label="t('library.moreActions')" class="adt-icon-btn" :title="t('library.more')" type="button">
              <span class="icon-[material-symbols--more-horiz]" />
            </button>
          </template>
        </AppMenu>
        <AppButton @click="openCreate" auto size="sm">
          <span class="flex items-center gap-1">
            <span class="icon-[material-symbols--add-rounded] text-lg" />
            {{ t("wled.sets.new") }}
          </span>
        </AppButton>
      </div>
    </div>
    <p class="mt-1 max-w-3xl text-sm text-[var(--ad-text-muted)]">
      {{ several ? t("wled.sets.intro") : t("wled.sets.introSingle") }}
    </p>

    <template v-if="several && viewed">
      <div :aria-label="t('wled.sets.title')" class="adt-pills mt-4" role="group">
        <button
          @click="emit('update:modelValue', set.id)"
          v-for="set in sets"
          :key="set.id"
          :aria-pressed="set.id === viewed.id"
          class="adt-pill max-w-full"
          :class="[{ 'is-active': set.id === viewed.id }]"
          type="button"
        >
          <span v-if="set.active" class="size-2 shrink-0 rounded-full bg-[var(--ad-action-primary)]" aria-hidden="true" />
          <span class="min-w-0 truncate">{{ label(set) }}</span>
          <span class="adt-pill-count">{{ set.effects.length }}</span>
          <span v-if="set.active" class="sr-only">{{ t("wled.sets.inUse") }}</span>
        </button>
      </div>
      <div class="mt-3 flex min-h-8 flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <p v-if="viewed.active" class="text-[var(--ad-text-secondary)]">
          {{ t("wled.sets.status.inUse") }}
        </p>
        <template v-else>
          <p class="text-[var(--ad-text-muted)]">
            {{ t("wled.sets.status.notInUse", { set: label(active) }) }}
          </p>
          <AppButton @click="emit('use', viewed.id)" auto size="sm">
            {{ t("wled.sets.use") }}
          </AppButton>
        </template>
      </div>
    </template>
  </section>

  <!-- New set, or the set viewed renamed -->
  <AppModal @close="closeNameDialog" :show="nameDialog !== null" :title="nameDialog === 'rename' ? t('wled.sets.dialog.renameTitle') : t('wled.sets.dialog.newTitle')" ghost-close size="sm">
    <div ref="nameForm" class="space-y-5">
      <div>
        <AppInput id="wled-set-name" v-model="draftName" @keydown.enter="submitName" :label="t('wled.sets.dialog.nameLabel')" :placeholder="t('wled.sets.dialog.namePlaceholder')" />
        <p v-if="nameError" class="adt-field-hint !text-[var(--ad-rose-500)]">
          {{ t(nameError) }}
        </p>
      </div>
      <div v-if="nameDialog === 'create' && viewed?.effects.length">
        <p class="adt-field-label">
          {{ t("wled.sets.dialog.startLabel") }}
        </p>
        <AppRadioGroup v-model="startWith" :options="startOptions" button-size="sm" />
      </div>
    </div>
    <template #footer>
      <AppButton @click="closeNameDialog" auto>
        {{ t("common.cancel") }}
      </AppButton>
      <AppButton @click="submitName" auto type="primary">
        {{ nameDialog === "rename" ? t("common.save") : t("wled.sets.dialog.create") }}
      </AppButton>
    </template>
  </AppModal>

  <!-- The set viewed deleted -->
  <AppModal @close="showDelete = false" :show="showDelete" :title="t('wled.sets.deleteDialog.title', { set: label(viewed) })" ghost-close size="sm">
    <p class="text-sm text-[var(--ad-text-muted)]">
      {{ viewed?.effects.length ? t("wled.sets.deleteDialog.body", { count: viewed.effects.length }) : t("wled.sets.deleteDialog.bodyEmpty") }}
    </p>
    <template #footer>
      <AppButton @click="showDelete = false" auto>
        {{ t("common.cancel") }}
      </AppButton>
      <AppButton @click="confirmDelete" auto type="danger">
        {{ t("wled.sets.deleteDialog.confirm") }}
      </AppButton>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import AppButton from "../../AppButton.vue";
import AppInput from "../../AppInput.vue";
import AppMenu from "../../AppMenu.vue";
import AppModal from "../../AppModal.vue";
import AppRadioGroup from "../../AppRadioGroup.vue";

import type { MessageKey } from "@/utils/i18n";
import type { WledSetView } from "@/utils/wled-sets";

import { setLabel, setNameTaken } from "@/utils/wled-sets";

/**
 * WLED's effect sets (utils/wled-sets.ts): a pill for each, the set being
 * viewed picked out and the set in use dotted, a line on whether the set being
 * viewed is in use, and the dialogs that make, rename and delete one. It
 * changes nothing itself: the panel does what it emits.
 */
const props = defineProps<{
  /** Every set, in order, as listSets gives them. */
  sets: WledSetView[];
  /** The id of the set being viewed. */
  modelValue: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [ id: string ];
  use: [ id: string ];
  create: [ name: string, copy: boolean ];
  rename: [ id: string, name: string ];
  delete: [ id: string ];
}>();

const { t } = useI18n();

/** A name longer than this is cut short in the copy option, a button that doesn't wrap. */
const LABEL_LENGTH = 24;
const ELLIPSIS = "…";

const nameDialog = ref<"create" | "rename" | null>(null);
const draftName = ref("");
/** What the name field refuses, as the key of the line said under it; "" is nothing to say. */
const nameError = ref<MessageKey | "">("");
const startWith = ref<"copy" | "empty">("copy");
const showDelete = ref(false);
const nameForm = ref<HTMLElement>();

const several = computed(() => props.sets.length > 1);
/** The set picked, or the set in use when the one picked has gone. */
const viewed = computed(() => props.sets.find(set => set.id === props.modelValue) ?? props.sets.find(set => set.active));
const active = computed(() => props.sets.find(set => set.active));
const startOptions = computed(() => [
  { label: t("wled.sets.dialog.copy", { set: short(label(viewed.value)) }), value: "copy" },
  { label: t("wled.sets.dialog.empty"), value: "empty" },
]);
const moreActions = computed(() => [
  { label: t("wled.sets.menu.rename"), icon: "icon-[material-symbols--edit-outline-rounded]", action: openRename },
  {
    label: t("wled.sets.menu.delete"),
    hint: viewed.value?.active ? t("wled.sets.menu.deleteInUse") : undefined,
    icon: "icon-[material-symbols--delete-outline-rounded]",
    danger: true,
    separated: true,
    disabled: Boolean(viewed.value?.active),
    action: () => {
      showDelete.value = true;
    },
  },
]);

watch(draftName, () => {
  nameError.value = "";
});

function label(set: { name: string } | undefined): string {
  return set ? setLabel(set, t("wled.sets.defaultName")) : "";
}

function short(name: string): string {
  return name.length > LABEL_LENGTH ? name.slice(0, LABEL_LENGTH - 1) + ELLIPSIS : name;
}

async function openCreate() {
  draftName.value = "";
  startWith.value = "copy";
  nameDialog.value = "create";
  await focusName();
}

async function openRename() {
  draftName.value = label(viewed.value);
  nameDialog.value = "rename";
  await focusName();
}

async function focusName() {
  nameError.value = "";
  await nextTick();
  nameForm.value?.querySelector("input")?.focus();
}

function closeNameDialog() {
  nameDialog.value = null;
}

function submitName() {
  const set = viewed.value;
  const renaming = nameDialog.value === "rename";
  const name = draftName.value.trim();
  if (!name) {
    nameError.value = "wled.sets.errors.nameMissing";
    return;
  }
  // Saved as it was: the first set keeps no name of its own, and goes on following the language.
  if (renaming && set && name === label(set)) {
    closeNameDialog();
    return;
  }
  if (setNameTaken(props.sets, name, t("wled.sets.defaultName"), renaming ? set?.id : undefined)) {
    nameError.value = "wled.sets.errors.nameTaken";
    return;
  }
  if (renaming && set) emit("rename", set.id, name);
  else emit("create", name, startWith.value === "copy" && Boolean(set?.effects.length));
  closeNameDialog();
}

function confirmDelete() {
  showDelete.value = false;
  if (viewed.value && !viewed.value.active) emit("delete", viewed.value.id);
}
</script>
```

- [ ] **Step 3: Check and commit**

```bash
node $SCR/sfc-check.cjs components/Settings/Wled/EffectSets.vue
yarn i18n:check
git add components/Settings/Wled/EffectSets.vue locales/en/wled.ts locales/de/wled.ts locales/nl/wled.ts locales/same-as-english.json
git commit -m "feat: WLED's effect sets section, with its pills and its dialogs, in three languages"
```
Expected: `ok …`; the i18n check passes. Fix what it reports first: a literal it reads as text gets hoisted into a const.

### Task 4: The panel edits the set being viewed (`Wled.vue`)

**Files:**
- Modify: `components/Settings/Wled.vue`

**Interfaces:**
- Consumes: `EffectSets` (Task 3); `listSets`, `activateSet`, `addSet`, `renameSet`, `deleteSet`, `setLabel` and `WledSetView` (Task 1).

- [ ] **Step 1: Script**

Imports, next to the Library ones:
```ts
import EffectSets from "./Wled/EffectSets.vue";
```
and with the `@/utils` imports:
```ts
import type { WledSetView } from "@/utils/wled-sets";
import { activateSet, addSet, deleteSet, listSets, renameSet, setLabel } from "@/utils/wled-sets";
```
Refs, after `const { config } = useConfig();`:
```ts
/** The set the effects library shows, by id: "" or an id that has gone is the set in use. */
const viewedId = ref("");
```
Computed, before `entries`:
```ts
const sets = computed<WledSetView[]>(() => (config.value ? listSets(config.value.wledFx) : []));
const several = computed(() => sets.value.length > 1);
const viewed = computed(() => sets.value.find(set => set.id === viewedId.value) ?? sets.value.find(set => set.active));
/**
 * The list the library edits, in place: the stored list of the set being
 * viewed, which for the set in use is `wledFx.effects` itself.
 */
const effects = computed<IWled[]>(() => viewed.value?.effects ?? []);
const libraryTitle = computed(() => (several.value && viewed.value
  ? t("wled.list.titleInSet", { set: setLabel(viewed.value, t("wled.sets.defaultName")) })
  : t("wled.list.title")));
const inUseLabel = computed(() => {
  const set = sets.value.find(candidate => candidate.active);
  return set ? setLabel(set, t("wled.sets.defaultName")) : "";
});
```
Every `config.value?.wledFx.effects` / `config.value.wledFx.effects` / `config.value!.wledFx.effects` in `entries`, `moreActions`, `moveEffect`, `processCSV`, `editEffect`, `saveEffect`, `removeEffect`, `sortEffectsByTriggers` and `deleteAllEffects` becomes `effects.value`. In particular:
```ts
function moveEffect(from: number, to: number) {
  const list = effects.value;
  const [ moved ] = list.splice(from, 1);
  list.splice(to, 0, moved);
}
```
`deleteAllEffects` empties the list in place, so it is the set being viewed that empties:
```ts
async function deleteAllEffects() {
  if (!config.value) return;

  const effectCount = effects.value.length;
  effects.value.splice(0);

  closeDeleteAllModal();
  showNotification(t("wled.notifications.allDeleted", { count: effectCount }), "error");
}
```
`processCSV`, `saveEffect` and `removeEffect` keep their `!config.value` guards. New methods, after `toggleFeature`:
```ts
/** Makes the set the one that plays. */
function useSet(id: string) {
  if (!config.value) return;
  const name = labelOf(id);
  config.value.wledFx = activateSet(toRaw(config.value.wledFx), id);
  showNotification(t("wled.sets.notifications.inUse", { set: name }), "success");
}

/** A new set, a copy of the set being viewed or empty, shown and not used. */
function createSet(name: string, copy: boolean) {
  if (!config.value) return;
  const added = addSet(toRaw(config.value.wledFx), name, copy ? effects.value : []);
  config.value.wledFx = added.wledFx;
  viewedId.value = added.id;
  showNotification(t("wled.sets.notifications.created", { set: name }), "success");
}

function renameEffectSet(id: string, name: string) {
  if (!config.value) return;
  config.value.wledFx = renameSet(toRaw(config.value.wledFx), id, name);
  showNotification(t("wled.sets.notifications.renamed"), "success");
}

function deleteEffectSet(id: string) {
  if (!config.value) return;
  const name = labelOf(id);
  config.value.wledFx = deleteSet(toRaw(config.value.wledFx), id);
  showNotification(t("wled.sets.notifications.deleted", { set: name }), "success");
}

function labelOf(id: string): string {
  const set = sets.value.find(candidate => candidate.id === id);
  return set ? setLabel(set, t("wled.sets.defaultName")) : "";
}
```
`toRaw` because the set functions build plain objects from their input, and a reactive proxy kept inside one would reach `chrome.storage`.

- [ ] **Step 2: Template**

Between the Options `</section>` and `<LibrarySection`:
```vue
        <EffectSets
          @create="createSet"
          @delete="deleteEffectSet"
          @rename="renameEffectSet"
          @use="useSet"
          v-model="viewedId"
          :sets="sets"
        />
```
`LibrarySection` gets `:key="viewed?.id"`, so each set opens unsearched, and `:title="libraryTitle"` instead of `:title="t('wled.list.title')"`. In the library's default slot, every `config.wledFx.effects[entry.index]` becomes `effects[entry.index]`. That covers the toggle, the key, the play button, the type icon and the description. The delete-all title becomes `t('wled.deleteAll.title', { count: effects.length })`.

The card: the toggle row `<div class="flex">` becomes `<div class="flex items-center gap-3">`, and after `<AppToggle … />`:
```vue
          <p v-if="several" class="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-white/80">
            <span class="icon-[material-symbols--lightbulb-outline-rounded] shrink-0 text-base" aria-hidden="true" />
            <span class="sr-only">{{ t("wled.sets.cardLabel") }}</span>
            <span class="truncate">{{ inUseLabel }}</span>
          </p>
```

- [ ] **Step 3: Check and commit**

```bash
node $SCR/sfc-check.cjs components/Settings/Wled.vue components/Settings/Wled/EffectSets.vue
yarn compile > $SCR/compile-t4.log 2>&1; grep "error TS" $SCR/compile-t4.log | cut -d'(' -f1 | sort | uniq -c
yarn i18n:check
yarn lint --base main
git add components/Settings/Wled.vue
git commit -m "feat: WLED's panel shows any effect set to edit, uses the one you pick, and names it on the card"
```
Expected: `ok` twice; the baseline's errors and no more; i18n passes; lint adds nothing.

### Task 5: Verification

- [ ] **Step 1: The runtime plays the set in use, headless**

Copy `wled-int/` from session e0e21cb1's scratchpad to `$SCR/wled-int/` (`build.mjs`, `imports-shim.ts`; point `HERE`'s output at `$SCR`). Build, then add `run-sets.mjs`. It uses `run.mjs`'s in-memory `storage`, recorded `fetch` and frame helpers, and imports `utils/wled-sets.ts` (run with tsx, repo as cwd). The scenario:

```js
const DEF = [ url("gameon", "/default/gameon", [ "gameon" ]), url("idle", "/default/idle", [ "idle" ]) ];
const HAL = [ url("gameon", "/halloween/gameon", [ "gameon" ]), url("idle", "/halloween/idle", [ "idle" ]) ];
const plain = { enabled: true, onlyOnce: true, boardIds: [], effects: DEF };
const { wledFx: two, id } = addSet(plain, "Halloween", HAL);

await config.setValue({ wledFx: two });
await wled.wledFx();
await play("A1 Default in use: its gameon", frame({ player: 0, turn: "t0" }), [ GET("/default/gameon") ]);
await wled.wledFxOnRemove(); await sleep(50);
expect("A2 left: Default's idle", [ GET("/default/idle") ]);

await config.setValue({ wledFx: activateSet(two, id) });
await wled.wledFx(); await sleep(400);
expect("B1 Halloween in use: its gameon for the stored turn", [ GET("/halloween/gameon") ]);
await wled.wledFxOnRemove(); await sleep(50);
expect("B2 left: Halloween's idle", [ GET("/halloween/idle") ]);

await config.setValue({ wledFx: activateSet(activateSet(two, id), "default") });
await wled.wledFx(); await sleep(400);
expect("C1 back to Default: its gameon", [ GET("/default/gameon") ]);
```
Expected: all pass. Each `expect` compares the exact sends, so the other set's paths never appear. (`url`, `GET`, `frame`, `play`, `expect` and `sleep` are `run.mjs`'s own, copied.)

- [ ] **Step 2: Static checks**

```bash
yarn compile > $SCR/compile-after.log 2>&1; grep "error TS" $SCR/compile-after.log | cut -d'(' -f1 | sort | uniq -c
yarn lint --base main
yarn i18n:check
yarn build > $SCR/build-chrome.log 2>&1 && yarn build:firefox > $SCR/build-firefox.log 2>&1
for d in chrome-mv3 firefox-mv2; do jq -c '{permissions, host_permissions}' .output/$d/manifest.json; done
```
Expected: baseline errors only; lint adds nothing; i18n passes; both builds pass. The permissions are the same as `main`'s: build `main` in a scratch worktree the same way, or read `.output` before switching.

- [ ] **Step 3: The yarn dev Chrome**

1. `ListAgents`: no other session drives the dev Chrome. Start `yarn dev` with the FIFO trick (memory *restarting-yarn-dev-needs-open-stdin*), logging to `$SCR/dev.log`, and wait for `:9222`.
2. Copy `e2e/lib.mjs`, `wled-standin.mjs`, `backup.mjs` and `restore.mjs` from session e0e21cb1's scratchpad into `$SCR/e2e/`, with `SCR` pointed at mine. Start the stand-in on `ipconfig getifaddr en0`, port 18090. Back up (`backup.mjs`).
3. Write a test `wledFx` through the worker: enabled; effects `gameon` → `http://<ip>:18090/default/gameon`, `lobby_in` → `/default/lobby_in`, `idle` → `/default/idle`; no `sets`. Leave every other key alone.
4. In a page of my own: seed `adt:last-visited-url` = `/tools` and `adt:active-tab` = `"3"`, load `/`, click the WLED card's catcher, and check:
   1. The panel shows *Effect sets* with **New set**, and no pills. Storage still has no `sets`.
   2. **New set** → "Halloween", *A copy of Default* → **Create set**. Storage: `sets` = [default "", Halloween with 3 copies], `activeSet` "default", `effects` unchanged. The Halloween pill is white, the Default pill has the dot, and the line says "Not in use…".
   3. Halloween viewed: import CSV `Pumpkin;URL;http://<ip>:18090/halloween/gameon;gameon`, switch `/default/gameon`'s copy off, edit `lobby_in`'s link to `/halloween/lobby_in`, and drag one row. After each, storage shows the change in `sets[1].effects` only, and `effects` is byte-identical to before (canonical JSON).
   4. **New set** with an existing name in other case ("halloween"), with spaces only, and with "Default" each say their error under the field. A 40-character name makes a pill that truncates, at 1600 px and at 390 px.
   5. **Use this set** on Halloween: storage `activeSet` = its id, `effects` = Halloween's list, Default's list on its slot. The card names Halloween. **⋯ → Delete set** is greyed out with "Use another set first".
   6. Default viewed → **⋯ → Rename set** → "Everyday": storage name, title "Effects in Everyday".
   7. **New set** "Birthday", *No effects*: the empty state shows. **⋯ → Delete set** → the dialog says it has no effects → delete: gone from storage, and Halloween still in use.
   8. Press the play button on Halloween's `Pumpkin` row (it points at the stand-in): the stand-in logs `GET /halloween/gameon`.
   9. Screenshots of the panel at 1600 px and 390 px, in English, German and Dutch (`autodarts.settings.language`), into `$SCR/shots/`.
5. The live runtime, from what the panel stored (Halloween in use): run a lobby + match script modeled on `e2e/match.mjs`. It makes a private lobby over the API, opens `/lobby/<id>` in my page, adds two guests (`lobby_in` → `/halloween/lobby_in`), starts, opens the match (`gameon` → `/halloween/gameon`), enters a dart, then aborts and goes to `about:blank` (`idle` from Halloween's list, if it has one). It uses no `page.route`. Then use Default again in the panel, and a second short run sends `/default/...`.
6. Restore (`restore.mjs`): config, `urlstatus` and the tab's localStorage keys, all compared canonically. Close my page and stop the stand-in.

- [ ] **Step 4: Fix anything found, each fix its own commit with its own check.**

### Task 6: README and changelog

**Files:**
- Modify: `README.md`, the WLED section:
  - *Configuration Options* gets an **Effect sets** line linking to the new part;
  - a new `#### Effect sets` after *Configuration Options*.
- Modify: `CHANGELOG.md`, `[Unreleased]` → *Added*.

- [ ] **Step 1: README**

In *Configuration Options*, after **Game modes**:
```md
- **Effect sets**: Keep more than one list of effects, such as one for Halloween or a birthday, and choose which one plays. See [Effect sets](#effect-sets)
```
After the *Configuration Options* list:
```md
#### Effect sets
Effects come in sets, and one set plays at a time. Your effects are the set *Default*, and a set of your own for Halloween, Christmas or a birthday is a click away:
- **New set** starts a set as a copy of the set you're looking at, or with no effects. Every set needs a name of its own
- Each set has a pill with its number of effects. Picking a pill shows that set's effects to edit, and the lights don't change while you do: a set plays once you press **Use this set**, and the set that plays carries a dot. The play button and **Test** send an effect from any set, so you can try a set out first
- **⋯** renames the set you're looking at, or deletes it along with its effects. The set that plays can't be deleted: use another one first
- **Boards**, **Don't restart a running effect**, **Game modes** and the switch on the card are the same for every set
- With two or more sets, the card names the set that plays
- A match, lobby or board page that is already open keeps the effects it started with until it loads again
- A settings export carries every set. A version of Tools from before effect sets plays the set in use
```

- [ ] **Step 2: Changelog**, `[Unreleased]` → *Added*, after the WLED entry:
```md
- **WLED** keeps more than one set of effects, and you choose which one plays: a set for Halloween, another for a birthday, and *Default* again when the day is over. **New set** starts a set as a copy of the one you're looking at, or empty. Picking a set's pill shows its effects to edit without changing the lights, until you press **Use this set**, and the play button tries an effect from any set. Every set shares the Boards, *Don't restart a running effect* and Game modes, the card names the set that plays, and the set that plays can't be deleted. Your effects so far are the set *Default*, and nothing about them changes
```
plus one sentence on what Task 5 checked, written after it ran.

- [ ] **Step 3: Commit**

```bash
git add README.md CHANGELOG.md
git commit -m "docs: WLED's effect sets in the README and the changelog"
```

### Task 7: Review and land it

- [ ] **Step 1:** A fresh reviewer on the most capable model reviews `main..feat/wled-effect-sets` against the spec. Fix what is real, each fix with its check.
- [ ] **Step 2:** `git checkout main && git merge --no-ff feat/wled-effect-sets -m "Merge branch 'feat/wled-effect-sets': WLED keeps sets of effects, and you choose which one plays"`. Nothing is pushed. Every autodarts tab is at `about:blank` or closed first, so WXT's rebuild after the merge reloads nothing of the user's.
- [ ] **Step 3:** Memory: the effect-sets shape and where its tests live. Leave out what the repo already records.
