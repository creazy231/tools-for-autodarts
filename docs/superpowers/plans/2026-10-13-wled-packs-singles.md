# Animation packs first, and single animations: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The WLED panel opens with a highlighted Animation packs card whose tiles lead straight to a pack's page, and a pack's page lets the user put single animations on their WLED and into the effect set the panel shows.

**Architecture:**
- Two pure helpers in `utils/wled-packs.ts`:
  - `packSubset` cuts a variant down to what some of its effects need, so the existing `installPack` puts just those on the WLED;
  - `addEffectsToSet` puts effects into one set.
- The dialog gets a page per pack (`PackPage.vue`) and keeps one install at a time.
- The panel's new `PacksOverview.vue` sits above its intro.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Tailwind, WXT; tests under node:test + tsx in the session scratchpad; e2e over raw CDP against the yarn dev Chrome and the WLED stand-in.

**Spec:** `docs/superpowers/specs/2026-10-13-wled-animation-packs-design.md`, section "Follow-up: highlighted at the top, and single animations (2026-10-13)".

## Global Constraints

- Every new or changed text ships in en, de and nl in the same commit; `yarn i18n:check` passes on the whole tree. German says *du*, Dutch *je*.
- No new manifest permissions; nothing new in `wxt.config.ts`.
- `yarn compile` stays at its baseline of 12 errors, none in a file this plan touches; `yarn lint` adds no problems.
- Never write to the user's real WLED (192.168.0.227). E2e runs against the stand-in on the LAN IP.
- Before any source edit, the dev Chrome's tabs on autodarts are parked at about:blank, because two tabs reloading at once revoke the session.
- Effect names are unique within a variant (checked for all four on 2026-10-13); single animations are keyed by name.

## Review Focus

1. **Two installs at once:** while a single animation goes on the WLED, every other **+**, **Add all**, the size choice, **All packs** and the dialog's close stay disabled, and leaving the page asks first.
2. **Settings written elsewhere during an install:** the effect goes into the settings as they are when the install ends, not as they were when it started.
3. **A failed single install:** "restored" and "not-restored" behave as for a pack. The old presets stay on offer (Save your old presets) until a later install succeeds or the dialog closes, and are never offered while an install runs.
4. **Language switch with the dialog open:** the rows' states, the page's sentence and the failure texts follow the new language.
5. **390 px:**
   - the overview's tiles stack;
   - the primary button wraps under the title;
   - a pack page's rows keep the **+** in view;
   - nothing scrolls sideways.

---

### Task 1: `packSubset`, what single animations need

**Files:**
- Modify: `utils/wled-packs.ts` (new export after `planInstall`, private helpers at the end)
- Test: `$SCR/tests/packs-singles.test.mts` (new). `$SCR` is the session scratchpad: `/private/tmp/claude-501/-Volumes-WD-BLACK-PROJECTS-Autodarts-autodarts-tools-wxt/9d361d25-9430-4b90-996c-d24a3727e17d/scratchpad`

**Interfaces:**
- Consumes: `PackVariant` (same file).
- Produces: `packSubset(variant: PackVariant, names: readonly string[]): PackVariant`.

- [ ] **Step 1: Write the failing tests** in `$SCR/tests/packs-singles.test.mts`:

```ts
import "./setup.mts";

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { packSubset } from "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/utils/wled-packs.ts";

const REPO = "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt";
const load = (file: string) => JSON.parse(readFileSync(`${REPO}/public/wled-packs/${file}.json`, "utf8"));
const WIDE = load("standard-64x8");
const NARROW = load("standard-32x8");

test("a one-shot brings the hold and the loop it returns to, and the GIFs they show", () => {
  const subset = packSubset(WIDE, [ "AD 180 Lightning" ]);
  assert.deepEqual(subset.effects, [ { name: "AD 180 Lightning", preset: 201, triggers: [ "180", "t20_t20_t20" ] } ]);
  assert.deepEqual(Object.keys(subset.presets), [ "101", "200", "201" ]);
  assert.deepEqual(subset.presets["201"], WIDE.presets["201"]);
  assert.deepEqual(subset.gifs.map((gif: any) => gif.name), [ "ad_180_lightning.gif", "ad_gameon.gif" ]);
  assert.deepEqual(subset.gifs[0], WIDE.gifs.find((gif: any) => gif.name === "ad_180_lightning.gif"));
  assert.deepEqual(subset.fx, { 53: "Image", 77: "Copy Segment" });
  assert.deepEqual([ subset.format, subset.pack, subset.size, subset.width, subset.height, subset.version ], [ 1, "standard", "64x8", 64, 8, WIDE.version ]);
});

test("a loop brings only itself", () => {
  const subset = packSubset(WIDE, [ "AD Game on" ]);
  assert.deepEqual(Object.keys(subset.presets), [ "101" ]);
  assert.deepEqual(subset.gifs.map((gif: any) => gif.name), [ "ad_gameon.gif" ]);
});

test("a leg won brings its afterglow, which it ends on", () => {
  const subset = packSubset(WIDE, [ "AD Leg won" ]);
  assert.deepEqual(Object.keys(subset.presets), [ "115", "186", "200" ]);
  assert.deepEqual(subset.gifs.map((gif: any) => gif.name), [ "ad_legwon.gif", "ad_legwon_after.gif" ]);
});

test("64 × 8 needs Copy Segment only for the mirrored half-width animations", () => {
  assert.deepEqual(packSubset(WIDE, [ "AD W 180" ]).fx, { 53: "Image" });
  assert.deepEqual(packSubset(WIDE, [ "AD 180" ]).fx, { 53: "Image", 77: "Copy Segment" });
  assert.deepEqual(packSubset(NARROW, [ "AD 180" ]).fx, { 53: "Image" });
});

test("what two animations both need comes once", () => {
  const subset = packSubset(WIDE, [ "AD 180", "AD 180 Lightning" ]);
  assert.deepEqual(subset.effects.map((effect: any) => effect.name), [ "AD 180", "AD 180 Lightning" ]);
  assert.deepEqual(Object.keys(subset.presets), [ "101", "105", "200", "201" ]);
  assert.deepEqual(subset.gifs.map((gif: any) => gif.name), [ "ad_180.gif", "ad_180_lightning.gif", "ad_gameon.gif" ]);
});

test("a name the pack lacks adds nothing", () => {
  assert.deepEqual(packSubset(WIDE, [ "Nope" ]), { ...WIDE, fx: {}, presets: {}, effects: [], gifs: [] });
  assert.deepEqual(packSubset(WIDE, [ "Nope", "AD Game on" ]), packSubset(WIDE, [ "AD Game on" ]));
});

test("the variant isn't changed, and the subset is a copy", () => {
  const before = JSON.stringify(WIDE);
  const subset = packSubset(WIDE, [ "AD 180 Lightning" ]);
  (subset.presets["201"] as any).seg[0].n = "changed.gif";
  subset.effects[0].triggers.push("changed");
  subset.gifs[0].bytes = 0;
  assert.equal(JSON.stringify(WIDE), before);
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `cd $SCR/tests && perl -e 'alarm 60; exec @ARGV' node --import tsx packs-singles.test.mts`
Expected: every test fails with "packSubset is not a function" (or an import SyntaxError naming `packSubset`).

- [ ] **Step 3: Implement** in `utils/wled-packs.ts`, after `planInstall`:

```ts
/**
 * What `names`, effects of `variant`, need on a device: their presets and every
 * preset those play or end on, over and over (a playlist's hold, the loop or
 * afterglow it returns to); the GIFs all of them show; and the WLED effects
 * they use. Only the effects named come along, in the variant's order, and a
 * name the pack lacks adds nothing. Installed, it puts just those on a device
 * (utils/wled-pack-install.ts), where a later install of the whole pack finds
 * them by name. `variant` isn't changed.
 */
export function packSubset(variant: PackVariant, names: readonly string[]): PackVariant {
  const wanted = new Set(names);
  const effects = variant.effects.filter(effect => wanted.has(effect.name));
  const needed = new Set<number>();
  const queue = effects.map(effect => effect.preset);
  while (queue.length) {
    const id = queue.pop()!;
    const preset = variant.presets[String(id)];
    if (needed.has(id) || !preset) continue;
    needed.add(id);
    queue.push(...references(preset));
  }

  const presets: PackVariant["presets"] = {};
  const fx: Record<string, string> = {};
  const shown = new Set<string>();
  for (const id of [ ...needed ].sort((a, b) => a - b)) {
    const preset = variant.presets[String(id)];
    presets[String(id)] = JSON.parse(JSON.stringify(preset));
    for (const segment of segmentsOf(preset)) {
      const name = typeof segment.fx === "number" ? variant.fx[String(segment.fx)] : undefined;
      if (!name) continue;
      fx[String(segment.fx)] = name;
      // An Image segment shows the GIF its `n` names, as the catalog's build reads it (scripts/lib/wled-packs.ts).
      if (name === "Image" && typeof segment.n === "string") shown.add(segment.n);
    }
  }
  return {
    ...variant,
    fx,
    presets,
    effects: effects.map(effect => ({ ...effect, triggers: [ ...effect.triggers ] })),
    gifs: variant.gifs.filter(gif => shown.has(gif.name)).map(gif => ({ ...gif })),
  };
}
```

and, among the private helpers at the end:

```ts
/** The presets a pack preset plays or ends on: a playlist's entries and its end, and a top-level `ps`. */
function references(preset: Record<string, unknown>): number[] {
  const found: unknown[] = [ preset.ps ];
  if (isRecord(preset.playlist)) found.push(...(Array.isArray(preset.playlist.ps) ? preset.playlist.ps : []), preset.playlist.end);
  return found.filter((id): id is number => typeof id === "number");
}

function segmentsOf(preset: Record<string, unknown>): Record<string, unknown>[] {
  const segments = Array.isArray(preset.seg) ? preset.seg : isRecord(preset.seg) ? [ preset.seg ] : [];
  return segments.filter(isRecord);
}
```

- [ ] **Step 4: Run the tests and the earlier suites**

Run: `cd $SCR/tests && perl -e 'alarm 60; exec @ARGV' node --import tsx packs-singles.test.mts; sh all.sh`
Expected: packs-singles 7/7 pass; all.sh "all suites: 59 passed, none failed".

- [ ] **Step 5: Commit**

```bash
git add utils/wled-packs.ts
git commit -m "feat(wled): packSubset, what single animations of a pack need on a WLED"
```

### Task 2: `addEffectsToSet`, and a single animation's install

**Files:**
- Modify: `utils/wled-packs.ts` (new export after `updatePackSet`)
- Test: `$SCR/tests/packs-singles.test.mts` (more tests); `$SCR/tests/packs-install.test.mts` (one more test); `$SCR/tests/all.sh` (adds the suite)

**Interfaces:**
- Consumes: `listLibrarySets` (utils/library-sets.ts), `IWled`, `WledFx` (same file), `packSubset` (Task 1), `installPack` (utils/wled-pack-install.ts).
- Produces: `addEffectsToSet(section: WledFx, id: string, effects: readonly IWled[]): { section: WledFx; id: string }`.

- [ ] **Step 1: Write the failing tests.** Append to `packs-singles.test.mts`, adding `addEffectsToSet` to its import:

```ts
const effect = (name: string, preset: string, triggers: string[], enabled = true) => ({ name, type: "PRESET", url: "http://192.168.0.227", preset, json_api: "", enabled, triggers }) as any;

test("new effects go on top of the set in their order, and the rest keep theirs", () => {
  const section = { enabled: true, onlyOnce: true, effects: [ effect("Mine", "3", [ "t20" ]), effect("Other", "4", [ "bull" ]) ] } as any;
  const placed = addEffectsToSet(section, "default", [ effect("AD 180", "105", [ "180" ]), effect("AD Game on", "101", [ "gameon" ]) ]);
  assert.equal(placed.id, "default");
  assert.deepEqual(placed.section.effects.map((item: any) => item.name), [ "AD 180", "AD Game on", "Mine", "Other" ]);
});

test("an effect of the same name is brought up to date where it is, keeping its on/off", () => {
  const section = { effects: [ effect("Mine", "3", [ "t20" ]), effect("AD 180", "105", [ "180" ], false) ] } as any;
  const placed = addEffectsToSet(section, "", [ effect("AD 180", "249", [ "180", "t20_t20_t20" ]) ]);
  assert.deepEqual(placed.section.effects, [ effect("Mine", "3", [ "t20" ]), effect("AD 180", "249", [ "180", "t20_t20_t20" ], false) ]);
});

test("a set that isn't in use gets them in its own list", () => {
  const section = {
    effects: [ effect("Mine", "3", [ "t20" ]) ],
    activeSet: "default",
    sets: [ { id: "default", name: "" }, { id: "b", name: "Halloween", effects: [ effect("Spooky", "7", [ "bust" ]) ] } ],
  } as any;
  const placed = addEffectsToSet(section, "b", [ effect("AD 180", "105", [ "180" ]) ]);
  assert.equal(placed.id, "b");
  assert.deepEqual(placed.section.effects, section.effects);
  assert.deepEqual(placed.section.sets[1].effects.map((item: any) => item.name), [ "AD 180", "Spooky" ]);
});

test("a set that has gone means the set in use", () => {
  const section = { effects: [], activeSet: "a", sets: [ { id: "a", name: "Mine" }, { id: "b", name: "Other", effects: [] } ] } as any;
  const placed = addEffectsToSet(section, "deleted-elsewhere", [ effect("AD 180", "105", [ "180" ]) ]);
  assert.equal(placed.id, "a");
  assert.deepEqual(placed.section.effects.map((item: any) => item.name), [ "AD 180" ]);
});

test("the section and the effects given aren't changed or shared", () => {
  const section = { effects: [ effect("AD 180", "105", [ "180" ], false) ] } as any;
  const fresh = [ effect("AD 180", "249", [ "180" ]), effect("AD Game on", "101", [ "gameon" ]) ];
  const before = JSON.stringify({ section, fresh });
  const placed = addEffectsToSet(section, "default", fresh);
  assert.equal(JSON.stringify({ section, fresh }), before);
  assert.notEqual(placed.section.effects[0], fresh[1]);
  assert.notEqual(placed.section.effects[0].triggers, fresh[1].triggers);
});
```

Append to `packs-install.test.mts`, adding `packSubset` to its `wled-packs.ts` import:

```ts
test("a single animation, then the whole pack: the pack keeps the animation's numbers", async () => {
  const wled = new FakeWled();
  wled.files.set("/presets.json", encode(presetsFile({ 1: { n: "Warm white" }, 101: { n: "Movie night" }, 200: { n: "Mine" } })));
  const single = await installPack(wled, packSubset(VARIANT, [ "AD 180" ]));
  assert.ok(single.ok);
  assert.deepEqual([ ...single.slots ], [ [ 101, 249 ], [ 105, 105 ], [ 200, 248 ] ]);
  assert.deepEqual(wled.log.filter(line => line.startsWith("POST /ad_")), [ "POST /ad_180.gif", "POST /ad_gameon.gif" ]);
  const after = wled.presets()!;
  assert.deepEqual([ after["105"].playlist.ps, after["105"].playlist.end ], [ [ 248 ], 249 ]);
  assert.deepEqual([ after["1"], after["101"], after["200"] ], [ { n: "Warm white" }, { n: "Movie night" }, { n: "Mine" } ]);

  const whole = await installPack(wled, VARIANT);
  assert.ok(whole.ok);
  assert.equal(whole.kept, 3);
  assert.deepEqual([ whole.slots.get(101), whole.slots.get(105), whole.slots.get(200) ], [ 249, 105, 248 ]);
  assert.deepEqual(wled.presets()!["101"], { n: "Movie night" });
});
```

and add `packs-singles` to the suite list in `all.sh`: `for suite in packs-build packs-plan packs-sets packs-singles packs-install upload catalog; do`.

- [ ] **Step 2: Run them and watch them fail**

Run: `cd $SCR/tests && perl -e 'alarm 60; exec @ARGV' node --import tsx packs-singles.test.mts; perl -e 'alarm 90; exec @ARGV' node --import tsx packs-install.test.mts 2>&1 | tail -5`
Expected:
- packs-singles: the five new tests fail with "addEffectsToSet is not a function", while the seven from Task 1 pass.
- packs-install: the new test passes, since Task 1 is in and planInstall already finds presets by name. It pins how packSubset and planInstall compose, and has no RED of its own. That is recorded in the ledger, not hidden.

- [ ] **Step 3: Implement** in `utils/wled-packs.ts`, after `updatePackSet`:

```ts
/**
 * `section` with `effects` in set `id`: one whose name the set has (its first
 * of that name) brought up to date where it is, keeping its on/off, and the
 * others on top, in their order. An id no set has, as when the set was deleted
 * in another tab meanwhile, is the set in use. The set's id comes back with it.
 * `section` and `effects` aren't changed.
 */
export function addEffectsToSet(section: WledFx, id: string, effects: readonly IWled[]): { section: WledFx; id: string } {
  const views = listLibrarySets(section, "effects");
  const target = views.find(set => set.id === id) ?? views.find(set => set.active) ?? views[0];
  const fresh = new Map<string, IWled>();
  for (const effect of effects) if (!fresh.has(effect.name)) fresh.set(effect.name, effect);
  const updated = new Set<string>();
  const kept = target.items.map((item) => {
    const effect = fresh.get(item.name);
    if (!effect || updated.has(item.name)) return item;
    updated.add(item.name);
    return { ...copyEffect(effect), enabled: item.enabled };
  });
  const list = [ ...[ ...fresh.values() ].filter(effect => !updated.has(effect.name)).map(copyEffect), ...kept ];
  if (target.active) return { section: { ...section, effects: list }, id: target.id };
  return { section: { ...section, sets: (section.sets ?? []).map(set => (set.id === target.id ? { ...set, effects: list } : set)) }, id: target.id };
}
```

and, among the private helpers:

```ts
/** A copy of an effect, through JSON as addLibrarySet copies, which the settings' reactive proxies don't refuse. */
function copyEffect(effect: IWled): IWled {
  return JSON.parse(JSON.stringify(effect));
}
```

- [ ] **Step 4: Run every suite**

Run: `cd $SCR/tests && sh all.sh`
Expected: packs-singles 12/12, packs-install 17/17 (16 + 1), "all suites: 72 passed, none failed".

- [ ] **Step 5: Commit**

```bash
git add utils/wled-packs.ts
git commit -m "feat(wled): addEffectsToSet, single animations into the effect set shown"
```

### Task 3: A pack's page, and single animations in the dialog

**Files:**
- Create: `components/Settings/Wled/PackPage.vue`, `components/Settings/Wled/PackAddress.vue`, `components/Settings/Wled/install-failure.ts`
- Modify: `components/Settings/Wled/PacksDialog.vue`, `components/Settings/Wled/PackCard.vue`, `components/Settings/Wled/PackInstall.vue`, `components/Settings/Wled.vue` (passes `target-set`), `locales/{en,de,nl}/wled.ts`
- Test: e2e scenarios `$SCR/e2e/sc/page.mjs` and `$SCR/e2e/sc/single.mjs` (new), against the stand-in

**Interfaces:**
- Consumes: `packSubset`, `addEffectsToSet` (Tasks 1–2); `installPack`, `InstallFailure`, `InstallResult`; `searchLibrary`, `LibraryEntry`; `listLibrarySets`, `librarySetLabel`.
- Produces:
  - `PacksDialog` props `{ show: boolean; start?: string; targetSet?: string }`, emits `close`, `added(id)`. Task 4 passes `start`.
  - `installFailureText(t, failure, address): string`.

- [ ] **Step 1: Write the e2e scenarios first** and run them against the current build. Expected RED:
  - there is no **Show animations**;
  - there are no rows with a **+**.

`sc/page.mjs` (opens the panel's dialog, opens Standard's page, reads it):

```js
export default async function ({ page, sleep, save, args }) {
  const pack = args[0] ?? "Standard";
  const opened = await page(`const card = [...modal.querySelectorAll("article")].find(a => a.querySelector("h3")?.textContent.includes(args.pack)); const button = card && [...card.querySelectorAll("button")].find(b => /^(Show animations|Animationen ansehen|Animaties bekijken)$/.test(b.textContent.trim())); if (!button) return false; button.click(); return true;`, { pack });
  if (!opened) return { opened };
  await sleep(1500);
  await save("page-top");
  return page(`return {
    back: [...modal.querySelectorAll("button")].find(b => /All packs|Alle Pakete|Alle pakketten/.test(b.textContent))?.textContent.trim(),
    title: modal.querySelector(".adt-section-title")?.textContent.replace(/\\s+/g, " ").trim(),
    intro: [...modal.querySelectorAll("p")].map(p => p.textContent.trim()).find(text => /single|einzelne|losse/.test(text)),
    rows: modal.querySelectorAll("li button[aria-label]").length,
    address: !!modal.querySelector("#wled-pack-address"),
  };`);
}
```

`sc/single.mjs` (presses one row's **+**, follows its state, and reads what the stand-in got and what the panel lists):

```js
export default async function ({ page, sleep, save, args }) {
  const name = args[0] ?? "AD 180 Lightning";
  const pressed = await page(`const button = [...modal.querySelectorAll("li button[aria-label]")].find(b => b.getAttribute("aria-label").includes(args.name)); if (!button || button.disabled) return false; button.scrollIntoView({ block: "center" }); button.click(); return true;`, { name });
  if (!pressed) return { pressed };
  const seen = [];
  for (let tries = 0; tries < 240; tries++) {
    await sleep(250);
    const now = await page(`const row = [...modal.querySelectorAll("li")].find(li => li.querySelector("button[aria-label]")?.getAttribute("aria-label").includes(args.name)); return {
      state: row?.querySelector("[data-row-state]")?.textContent.trim(),
      others: [...modal.querySelectorAll("li button[aria-label]")].filter(b => !b.disabled).length,
      close: !!modal.querySelector(".adt-modal-close"),
    };`, { name });
    const line = `${now.state} · ${now.others} enabled · × ${now.close}`;
    if (seen.at(-1) !== line) seen.push(line);
    if (now.state && !/WLED…|WLED-Gerät…|WLED-apparaat gezet…/.test(now.state)) break;
  }
  await save("single-after");
  return { seen };
}
```

Run (dev Chrome on /tools, the stand-in up, the panel's dialog opened with `node do.mjs openpanel`): `node do.mjs page`.
Expected: `{ "opened": false }`.

- [ ] **Step 2: Texts.** In `locales/en/wled.ts`, under `packs`:
  - `section.intro` stays for Task 4.
  - `dialog.intro`: "Pick a pack and the size of your matrix. Tools puts the animations on your WLED as presets and adds their effects to Tools: a whole pack as an effect set of its own, or single animations into the effect set you're editing."
  - `device.hint`: "Type your WLED's address to add animations."
  - `card.add`: "Add all".
  - New `card.open`: "Show animations". Delete `card.show` and `card.hide`.
  - New group `page`:

```ts
    /** A pack's page: its animations, each of which can be added alone. `set` is the name of the effect set single animations go into. */
    page: {
      back: "All packs",
      intro: "Add single animations to the effect set {set}, or all of them as an effect set of their own.",
      /** Under library.section.nothingMatches when the search finds none. */
      noMatch: "No animation has that in its name or triggers.",
      /** The row's + button: its accessible name and tooltip. `name` is the animation's. */
      addOne: "Add {name}",
      adding: "Putting it on your WLED…",
      added: "Added to {set}",
      present: "Already in {set}",
    },
```

German (`locales/de/wled.ts`), the same keys:
- `dialog.intro`: "Wähle ein Paket und die Größe deiner Matrix. Tools überträgt die Animationen als Presets auf dein WLED-Gerät und legt ihre Effekte in Tools an: ein ganzes Paket als eigenes Effekt-Set oder einzelne Animationen in dem Effekt-Set, das du gerade bearbeitest."
- `device.hint`: "Gib die Adresse deines WLED-Geräts ein, um Animationen hinzuzufügen."
- `card.add`: "Alle hinzufügen"; `card.open`: "Animationen ansehen"
- `page.back`: "Alle Pakete"
- `page.intro`: "Füge einzelne Animationen dem Effekt-Set {set} hinzu oder alle als eigenes Effekt-Set."
- `page.noMatch`: "Keine Animation hat das im Namen oder in den Triggern."
- `page.addOne`: "{name} hinzufügen"
- `page.adding`: "Wird auf dein WLED-Gerät übertragen…"
- `page.added`: "Zu {set} hinzugefügt"
- `page.present`: "Schon in {set}"

Dutch (`locales/nl/wled.ts`):
- `dialog.intro`: "Kies een pakket en de grootte van je matrix. Tools zet de animaties als presets op je WLED-apparaat en voegt de effecten toe aan Tools: een heel pakket als eigen effectenset, of losse animaties in de effectenset die je nu bewerkt."
- `device.hint`: "Typ het adres van je WLED-apparaat om animaties toe te voegen."
- `card.add`: "Alles toevoegen"; `card.open`: "Animaties bekijken"
- `page.back`: "Alle pakketten"
- `page.intro`: "Voeg losse animaties toe aan de effectenset {set}, of allemaal als eigen effectenset."
- `page.noMatch`: "Geen animatie heeft dat in de naam of de triggers."
- `page.addOne`: "{name} toevoegen"
- `page.adding`: "Wordt op je WLED-apparaat gezet…"
- `page.added`: "Toegevoegd aan {set}"
- `page.present`: "Al in {set}"

- [ ] **Step 3: `install-failure.ts`.** Move PackInstall's `failureText` switch here unchanged, as:

```ts
import type { MessageKey, Params } from "@/utils/i18n";
import type { InstallFailure } from "@/utils/wled-pack-install";

/**
 * What the packs dialog says of an install that failed (utils/wled-pack-install.ts): the install view of a whole
 * pack, and a single animation's row. `t` is the component's, so the text follows the language. `address` is the
 * WLED's origin, such as http://192.168.0.227.
 */
export function installFailureText(t: (key: MessageKey, params?: Params) => string, failure: InstallFailure, address: string): string {
  const host = hostOf(address);
  switch (failure.reason) {
    // … the twelve cases exactly as PackInstall.vue had them, `host.value` → `host`, `props.address` → `address` …
  }
  return "";
}

function hostOf(address: string): string {
  try {
    return new URL(address).host;
  } catch {
    return address;
  }
}
```

PackInstall's `failureText` becomes `computed(() => (props.state.phase === "failed" ? installFailureText(t, props.state.failure, props.address) : ""))`.

- [ ] **Step 4: `PackAddress.vue`**, the address field and its line, taken out of PacksDialog unchanged so both pages show it:

```vue
<template>
  <div>
    <AppInput id="wled-pack-address" v-model="address" :label="t('wled.packs.device.label')" :placeholder="ADDRESS_EXAMPLE">
      <template #icon>
        <span class="icon-[material-symbols--router-outline-rounded]" />
      </template>
    </AppInput>
    <p aria-live="polite" class="adt-field-hint flex items-center gap-1.5" :class="[warns ? '!text-[var(--ad-warning)]' : '']">
      <span v-if="reading" aria-hidden="true" class="icon-[material-symbols--progress-activity] shrink-0 motion-safe:animate-spin" />
      {{ text }}
    </p>
  </div>
</template>

<script setup lang="ts">
import AppInput from "../../AppInput.vue";

defineProps<{
  /** The line under the field: what answered at the address, or how to start. */
  text: string;
  reading: boolean;
  /** Said as a warning: nothing answered, or not a matrix. */
  warns: boolean;
}>();

/** An example address: the same in every language. */
const ADDRESS_EXAMPLE = "192.168.0.69";

const address = defineModel<string>({ required: true });

const { t } = useI18n();
</script>
```

- [ ] **Step 5: `PackCard.vue`**
  - Remove `open`, the toggle and the inline list, and the `TriggerChips` import.
  - Add **Show animations** before **Add all**, and an `open` emit:

```vue
      <AppButton @click="emit('open')" auto class="ml-auto" size="sm">
        <span class="flex items-center gap-1">
          {{ t("wled.packs.card.open") }}
          <span aria-hidden="true" class="icon-[material-symbols--chevron-right-rounded] -mr-1 text-lg" />
        </span>
      </AppButton>
      <AppButton @click="emit('add')" :disabled="!canAdd" auto size="sm">
```

  `defineEmits<{ "update:size": [ size: string ]; "add": []; "open": [] }>()`. "Add all" comes from `card.add`.

- [ ] **Step 6: `PackPage.vue`**:

```vue
<template>
  <div class="space-y-5">
    <div class="flex flex-col items-start gap-3">
      <PackPreview v-if="variant" :label="t('wled.packs.card.cover', { pack: name, size: label })" :preset="current.cover" :variant="variant" size="cover" />
      <h3 class="adt-section-title">
        <span>{{ name }}<span class="adt-section-count">&nbsp;·&nbsp;{{ t("wled.packs.card.count", { count: current.effects }) }}</span></span>
      </h3>
    </div>

    <!-- The address field, from the dialog. -->
    <slot />

    <div>
      <div class="flex flex-wrap items-center gap-3">
        <AppRadioGroup
          @update:model-value="emit('update:size', String($event))"
          v-if="pack.sizes.length > 1"
          :aria-label="t('wled.packs.card.size')"
          :model-value="current.size"
          :options="sizeOptions"
          button-size="sm"
        />
        <span v-else class="adt-chip">{{ label }}</span>
        <AppButton @click="emit('add')" :disabled="!canAdd || busy" auto class="ml-auto" size="sm">
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
    </div>

    <section class="border-t border-[var(--ad-border-subtle)] pt-4">
      <p class="mb-3 text-sm text-[var(--ad-text-secondary)]">
        {{ t("wled.packs.page.intro", { set }) }}
      </p>
      <AppSearchInput v-model="query" :placeholder="t('library.section.searchPlaceholder')" />
      <ul v-if="variant && shown.length" class="mt-3 border-t border-[var(--ad-border-subtle)]">
        <li v-for="effect in shown" :key="effect.name" class="flex items-center gap-3 border-b border-[var(--ad-border-subtle)] py-2">
          <span class="flex w-[7.5rem] shrink-0 sm:w-[12.5rem]">
            <PackPreview :label="effect.name" :preset="effect.preset" :variant="variant" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-semibold text-[var(--ad-text-primary)]">{{ effect.name }}</span>
            <TriggerChips :max="3" :query="query" :triggers="effect.triggers" :wrap="false" class="mt-1" />
            <span v-if="rowState(effect.name)" class="mt-1 block text-xs" :class="[rowState(effect.name)!.tone]" data-row-state>
              {{ rowState(effect.name)!.text }}
            </span>
          </span>
          <button
            @click="emit('addOne', effect.name)"
            :aria-label="t('wled.packs.page.addOne', { name: effect.name })"
            :disabled="!canAdd || busy"
            class="adt-icon-btn"
            :title="t('wled.packs.page.addOne', { name: effect.name })"
            type="button"
          >
            <span aria-hidden="true" :class="[rows[effect.name]?.phase === 'running' ? 'icon-[material-symbols--progress-activity] motion-safe:animate-spin' : 'icon-[material-symbols--add-rounded]']" />
          </button>
        </li>
      </ul>
      <div v-else-if="variant" class="py-8 text-center">
        <p class="font-semibold text-[var(--ad-text-primary)]">
          {{ t("library.section.nothingMatches") }}
        </p>
        <p class="mt-1 text-sm text-[var(--ad-text-muted)]">
          {{ t("wled.packs.page.noMatch") }}
        </p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import AppButton from "../../AppButton.vue";
import AppRadioGroup from "../../AppRadioGroup.vue";
import AppSearchInput from "../../AppSearchInput.vue";
import TriggerChips from "../Library/TriggerChips.vue";

import PackPreview from "./PackPreview.vue";

import type { LibraryEntry } from "@/utils/library-search";
import type { PackInfo, PackVariant } from "@/utils/wled-packs";

import { searchLibrary } from "@/utils/library-search";
import { loadPackVariant } from "@/utils/wled-pack-catalog";
import { packText, sizeLabel } from "@/utils/wled-packs";

/** What a row says of its animation's install: on its way, done, or why not. */
export type PackRow = { phase: "running" } | { phase: "done"; set: string } | { phase: "failed"; text: string };

const props = defineProps<{
  pack: PackInfo;
  /** The size picked, by its key: "64x8". */
  size: string;
  /** The matrix of the WLED that answered, once one has. */
  device?: { width: number; height: number };
  /** The effect set this pack in this size was added as, if it was. */
  added?: { name: string; outdated: boolean };
  canAdd: boolean;
  /** Whether an install runs: everything that would start one waits. */
  busy: boolean;
  /** The effect set single animations go into, by its name. */
  set: string;
  /** The names of the effects that set has. */
  present: ReadonlySet<string>;
  /** Each row's install in this size, by the animation's name. */
  rows: Record<string, PackRow>;
}>();

const emit = defineEmits<{ "update:size": [ size: string ]; "add": []; "addOne": [ name: string ] }>();

const { t, language } = useI18n();

const variant = shallowRef<PackVariant>();
const query = ref("");

const current = computed(() => props.pack.sizes.find(size => size.size === props.size) ?? props.pack.sizes[0]);
const name = computed(() => packText(props.pack.name, language.value));
const label = computed(() => sizeLabel(current.value));
/** While an install runs, another size would change the rows under it. */
const sizeOptions = computed(() => props.pack.sizes.map(size => ({ label: sizeLabel(size), value: size.size, disabled: props.busy && size.size !== current.value.size })));
const fit = computed(() => {
  if (!props.device) return undefined;
  const ok = props.device.width === current.value.width && props.device.height === current.value.height;
  return { ok, text: ok ? t("wled.packs.card.fits", { size: label.value }) : t("wled.packs.card.misfit", { size: label.value, device: sizeLabel(props.device) }) };
});
/** The animations the search leaves, best match first: by name or trigger, as the libraries search. */
const shown = computed(() => {
  const effects = variant.value?.effects ?? [];
  const entries: LibraryEntry[] = effects.map((effect, index) => ({ index, name: effect.name, triggers: effect.triggers, source: "", enabled: true }));
  return searchLibrary(entries, query.value).map(entry => effects[entry.index]);
});

watch(() => current.value.file, async (file) => {
  variant.value = undefined;
  const loaded = await loadPackVariant(file);
  if (file === current.value.file) variant.value = loaded;
}, { immediate: true });

/** What a row says: its install's state, else whether the set has its effect already. */
function rowState(effect: string): { text: string; tone: string } | undefined {
  const row = props.rows[effect];
  if (row?.phase === "running") return { text: t("wled.packs.page.adding"), tone: "text-[var(--ad-text-muted)]" };
  if (row?.phase === "failed") return { text: row.text, tone: "text-[var(--ad-error)]" };
  if (row?.phase === "done") return { text: t("wled.packs.page.added", { set: row.set }), tone: "text-[var(--ad-success)]" };
  if (props.present.has(effect)) return { text: t("wled.packs.page.present", { set: props.set }), tone: "text-[var(--ad-text-muted)]" };
  return undefined;
}
</script>
```

  (Check the token names `--ad-error`/`--ad-success` in `assets/design-tokens.css` first, and use what is there.)

- [ ] **Step 7: `PacksDialog.vue`**
  - Props: `defineProps<{ show: boolean; start?: string; targetSet?: string }>()`.
  - New state:

```ts
/** The pack whose page shows; none for the list of packs. */
const viewedPack = shallowRef<PackInfo>();
/** Single animations being put on the WLED, or put there, or not: by pack and size (`standard@64x8`), then by name. */
const singles = ref<Record<string, Record<string, SingleState>>>({});
```

  with `type SingleState = { phase: "running" } | { phase: "done"; set: string } | { phase: "failed"; failure: InstallFailure; address: string };`.
  - Computed values:

```ts
/** Whether an install runs, of a pack or of a single animation: one at a time, and the dialog stays open meanwhile. */
const busy = computed(() => running.value || Object.values(singles.value).some(rows => Object.values(rows).some(single => single.phase === "running")));
/** The effect set single animations go into: the one the panel shows, or the set in use if that one has gone. */
const target = computed(() => {
  const fx = config.value?.wledFx;
  const sets = fx ? listLibrarySets(toRaw(fx), "effects") : [];
  return sets.find(set => set.id === props.targetSet) ?? sets.find(set => set.active);
});
const targetLabel = computed(() => (target.value ? librarySetLabel(target.value, t("library.sets.defaultName")) : ""));
const present = computed(() => new Set((target.value?.items ?? []).map(effect => effect.name)));
/** What the page's rows say, in the size it shows. */
const pageRows = computed<Record<string, PackRow>>(() => {
  const pack = viewedPack.value;
  const rows = pack ? singles.value[rowsKey(pack, sizeOf(pack))] ?? {} : {};
  return Object.fromEntries(Object.entries(rows).map(([ name, single ]) => [ name, single.phase === "failed" ? { phase: "failed", text: installFailureText(t, single.failure, single.address) } : single ]));
});
```

  - The guards: `close()`, the `beforeunload` listener and `back()` test `busy` instead of `running`. AppModal gets `:disable-backdrop-click="busy" :hide-close-button="busy"`. The footer's Close gets `:disabled="busy"`. **Save your old presets** shows on `backup && !busy && (state.phase === 'confirm' || state.phase === 'failed')`. `choose()` returns early while `busy`.
  - `openDialog()` also resets `viewedPack.value = undefined` and `singles.value = {}`, and after the catalog is read:

```ts
  // A pack's tile on the panel opens its page.
  const index = catalog.value;
  if (props.start && index && index !== "failed") viewedPack.value = index.packs.find(pack => pack.id === props.start);
```

  - The failure bookkeeping of `start()` becomes `failureOf(result)`, shared with single animations:

```ts
/** What a failed install says. The first copy of the WLED's old presets one hands back is kept: a later try reads what the failed one left. */
function failureOf(result: { ok: false } & InstallFailure): InstallFailure {
  const { ok: _ok, ...failure } = result;
  if (failure.reason === "not-restored" && !backup.value) backup.value = failure.backup;
  // While one is held, presets.json is damaged from that try, so "nothing was changed" would be wrong.
  return backup.value && failure.reason === "presets-unreadable" ? { reason: "not-restored", backup: backup.value } : failure;
}
```

  and in `start()`: `if (!result.ok) { state.value = { phase: "failed", failure: failureOf(result) }; return; }`.
  - Single animations:

```ts
function rowsKey(pack: PackInfo, size: PackSize): string {
  return `${pack.id}@${size.size}`;
}

function setSingle(pack: PackInfo, size: PackSize, name: string, single: SingleState) {
  const key = rowsKey(pack, size);
  singles.value = { ...singles.value, [key]: { ...singles.value[key], [name]: single } };
}

/**
 * Puts one animation of `pack`, in the size picked, on the WLED, with the presets and GIFs it plays on (packSubset),
 * then its effect into the set the panel shows. The settings are read when the install is over, as for a pack.
 */
async function addSingle(pack: PackInfo, name: string) {
  const at = origin.value;
  if (!at || !matrix.value || busy.value || !config.value) return;
  const size = sizeOf(pack);
  setSingle(pack, size, name, { phase: "running" });
  try {
    const variant = await loadPackVariant(size.file);
    if (!variant) return setSingle(pack, size, name, { phase: "failed", failure: { reason: "pack-unreadable" }, address: at });
    const subset = packSubset(variant, [ name ]);
    const result = await installPack(deviceIo(at), subset);
    if (!result.ok) return setSingle(pack, size, name, { phase: "failed", failure: failureOf(result), address: at });
    backup.value = "";
    if (!config.value) return setSingle(pack, size, name, { phase: "failed", failure: { reason: "pack-unreadable" }, address: at });
    const placed = addEffectsToSet(toRaw(config.value.wledFx), props.targetSet ?? "", packEffects(subset, result.slots, at));
    config.value.wledFx = placed.section;
    emit("added", placed.id);
    setSingle(pack, size, name, { phase: "done", set: setLabel(placed.id) });
  } catch {
    // A relay that broke off (the extension reloaded, say) mustn't leave the dialog locked.
    setSingle(pack, size, name, { phase: "failed", failure: { reason: "unreachable" }, address: at });
  }
}
```

  - Template:
    - the packs page shows `PackAddress` where the field was;
    - each `PackCard` gets `@open="viewedPack = pack"`;
    - the pack page is:

```vue
    <div v-if="!chosen && viewedPack" class="space-y-5">
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
        <PackAddress v-model="address" :reading="probe.state === 'reading'" :text="probeText" :warns="probeWarns" />
      </PackPage>
    </div>
```

    The install view's back (`back()`) returns to the page it came from, as `viewedPack` is still set.
  - `ADDRESS_EXAMPLE` moves to PackAddress.vue.
- [ ] **Step 8: `Wled.vue`**: `<PacksDialog @added="showAddedSet" @close="showPacks = false" :show="showPacks" :target-set="viewed?.id ?? ''" />`.

- [ ] **Step 9: Checks**

Run:

```bash
yarn compile 2>&1 | grep -c "error TS"
yarn lint
yarn i18n:check
```

Expected:
- compile prints 12, and no error names a file of this task;
- lint adds no problems;
- i18n:check passes.

Then, in the dev Chrome (tabs parked before the edits; the stand-in at `node $SCR/e2e/wled-standin.mjs <LAN IP> 18095 $SCR/e2e/standin.log --matrix 64x8`; the dialog's address set to `<LAN IP>:18095`), run:
- `node do.mjs page`: `opened: true`, `back: "All packs"`, title "Standard · 68 animations" (or 89 once the 64 × 8 WLED answers), the intro naming the set, `rows` 89, `address: true`.
- `node do.mjs single "AD 180 Lightning"`:
  - `seen` starts "Putting it on your WLED… · 0 enabled · × false" and ends "Added to <set> · 89 enabled · × true";
  - the stand-in's `/__state` has `ad_180_lightning.gif`, `ad_gameon.gif` and presets named AD 180 Lightning, AD hold and AD Game on;
  - the panel's list has "AD 180 Lightning" first.
- Reopening the dialog on that page shows "Already in <set>" on that row.
- Search "lightning" leaves the Lightning rows; "zzz" shows "Nothing matches".
- **Add all** from the page opens the install view, and its Back returns to the page.

- [ ] **Step 10: Commit**

```bash
git add components/Settings/Wled/PackPage.vue components/Settings/Wled/PackAddress.vue components/Settings/Wled/install-failure.ts components/Settings/Wled/PacksDialog.vue components/Settings/Wled/PackCard.vue components/Settings/Wled/PackInstall.vue components/Settings/Wled.vue locales/en/wled.ts locales/de/wled.ts locales/nl/wled.ts
git commit -m "feat(wled): a page per animation pack, and single animations from it"
```

### Task 4: The packs first and highlighted on the WLED panel

**Files:**
- Create: `components/Settings/Wled/PacksOverview.vue`, `components/Settings/Wled/PackTile.vue`
- Modify: `components/Settings/Wled.vue`, `locales/{en,de,nl}/wled.ts` (`packs.section.intro`)
- Test: e2e scenario `$SCR/e2e/sc/overview.mjs` (new)

**Interfaces:**
- Consumes: `PacksDialog` prop `start` (Task 3); `loadPackIndex`, `loadPackVariant`; `PackPreview`.
- Produces: `PacksOverview` emits `open(pack?: string)`.

- [ ] **Step 1: Write the e2e scenario first**, `sc/overview.mjs`:

```js
export default async function ({ page, sleep, save, tab, args }) {
  const width = Number(args[0] ?? 1600);
  await tab.viewport(width, 1000);
  await sleep(800);
  const read = await page(`const panel = modal.querySelector(".adt-container"); const first = panel?.querySelector(":scope > div > *"); const tiles = [...(first?.querySelectorAll("button") ?? [])].filter(b => b.querySelector("canvas, [role=img]")); return {
    firstIsPacks: !!first?.matches("section") && /Animation packs|Animationspakete|Animatiepakketten/.test(first.textContent),
    highlighted: first ? getComputedStyle(first, "::before").backgroundImage.includes("gradient") : false,
    primary: !!first?.querySelector(".adt-btn-primary, [data-type=primary]"),
    tiles: tiles.map(b => b.textContent.replace(/\\s+/g, " ").trim()),
    sideways: document.documentElement.scrollWidth > innerWidth,
  };`);
  await save(`overview-${width}`);
  return read;
}
```

  Find AppButton's class for its primary type first, and correct the `primary` selector to it.
  Run against the current build: `node do.mjs openpanel` (with the dialog closed again), then `node do.mjs overview 1600`.
  Expected RED: `firstIsPacks: false`, `tiles: []`.

- [ ] **Step 2: Texts.** `packs.section.intro`:
  - en: "Ready-made animations for LED matrices. Tools puts them on your WLED: a whole pack as an effect set of its own, or single animations into one of your sets."
  - de: "Fertige Animationen für LED-Matrizen. Tools überträgt sie auf dein WLED-Gerät: ein ganzes Paket als eigenes Effekt-Set oder einzelne Animationen in eines deiner Sets."
  - nl: "Kant-en-klare animaties voor LED-matrixen. Tools zet ze op je WLED-apparaat: een heel pakket als eigen effectenset, of losse animaties in een van je sets."

- [ ] **Step 3: `PackTile.vue`**:

```vue
<template>
  <!-- The cover is the pack's first size, moving; the button's name is the pack's name and count. -->
  <button @click="emit('open')" class="flex w-full min-w-0 flex-col gap-3 rounded-[var(--ad-radius-md)] border border-[var(--ad-border-subtle)] bg-black/30 p-3 text-left transition-colors hover:border-white/25 hover:bg-white/[0.05] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ad-focus-ring)]" type="button">
    <span aria-hidden="true" class="flex w-full">
      <PackPreview v-if="variant" :label="name" :preset="first.cover" :variant="variant" size="cover" />
    </span>
    <span class="flex w-full min-w-0 items-baseline justify-between gap-3">
      <span class="truncate font-semibold text-[var(--ad-text-primary)]">{{ name }}</span>
      <span class="shrink-0 text-sm text-[var(--ad-text-muted)]">{{ t("wled.packs.card.count", { count: first.effects }) }}</span>
    </span>
  </button>
</template>

<script setup lang="ts">
import PackPreview from "./PackPreview.vue";

import type { PackInfo, PackVariant } from "@/utils/wled-packs";

import { loadPackVariant } from "@/utils/wled-pack-catalog";
import { packText } from "@/utils/wled-packs";

const props = defineProps<{ pack: PackInfo }>();

const emit = defineEmits<{ open: [] }>();

const { t, language } = useI18n();

const variant = shallowRef<PackVariant>();

const first = computed(() => props.pack.sizes[0]);
const name = computed(() => packText(props.pack.name, language.value));

watch(() => first.value.file, async (file) => {
  const loaded = await loadPackVariant(file);
  if (file === first.value.file) variant.value = loaded;
}, { immediate: true });
</script>
```

  (Check the focus-ring token's name in `assets/design-tokens.css`, or copy the focus style the settings' other card buttons use.)

- [ ] **Step 4: `PacksOverview.vue`**:

```vue
<template>
  <!-- The panel's first thing: the packs, edged in the site's brand gradient. -->
  <section class="adt-packs-overview relative mb-8 rounded-[var(--ad-radius-lg)] p-4 sm:p-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <!-- One run of text, as the other headings, so a wrapped heading keeps its count after its last word. -->
      <h3 class="adt-section-title">
        <span>{{ t("wled.packs.section.title") }}<span v-if="index" class="adt-section-count">&nbsp;·&nbsp;{{ index.packs.length }}</span></span>
      </h3>
      <AppButton @click="emit('open')" auto size="sm" type="primary">
        <span class="flex items-center gap-1">
          <span aria-hidden="true" class="icon-[material-symbols--library-add-outline-rounded] text-lg" />
          {{ t("wled.packs.section.browse") }}
        </span>
      </AppButton>
    </div>
    <p class="mt-1 max-w-3xl text-sm text-[var(--ad-text-secondary)]">
      {{ t("wled.packs.section.intro") }}
    </p>
    <ul v-if="index?.packs.length" class="mt-4 grid gap-3 sm:grid-cols-2">
      <li v-for="pack in index.packs" :key="pack.id" class="min-w-0">
        <PackTile @open="emit('open', pack.id)" :pack="pack" />
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import AppButton from "../../AppButton.vue";

import PackTile from "./PackTile.vue";

import type { PackIndex } from "@/utils/wled-packs";

import { loadPackIndex } from "@/utils/wled-pack-catalog";

const emit = defineEmits<{ open: [ pack?: string ] }>();

const { t } = useI18n();

const index = shallowRef<PackIndex>();

onMounted(async () => {
  index.value = await loadPackIndex();
});
</script>

<style scoped>
.adt-packs-overview {
  background: linear-gradient(118deg, color-mix(in srgb, var(--ad-cyan-500) 9%, transparent), color-mix(in srgb, var(--ad-green-400) 5%, transparent));
}

/* The brand gradient as a 1px edge: a gradient can't be a border's colour, so it is a layer masked to its ring. */
.adt-packs-overview::before {
  position: absolute;
  inset: 0;
  padding: 1px;
  pointer-events: none;
  content: "";
  background: var(--ad-gradient-brand);
  border-radius: inherit;
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
  -webkit-mask-composite: xor;
}
</style>
```

  Before using the class name, `grep -rn "adt-packs-overview" assets components` must find nothing (adt- class names are global). Check how other SFCs style themselves, and follow it if they don't use `<style scoped>`.

- [ ] **Step 5: `Wled.vue`**
  - Put `<PacksOverview @open="openPacks" />` first in `<div class="relative z-10 pr-2 …">`, before the intro `<p>`.
  - Delete the old packs `<section>` after Options.
  - Delete `attrs`, `packCount`, the `onMounted` that read it, and the `loadPackIndex` import. The overview reads the index itself, and only the panel mounts it.
  - New `const packStart = ref("");` and:

```ts
/** The packs dialog: on a pack's page when its tile was clicked, else on the list of packs. */
function openPacks(pack?: unknown) {
  packStart.value = typeof pack === "string" ? pack : "";
  showPacks.value = true;
}
```

  - `<PacksDialog … :start="packStart" :target-set="viewed?.id ?? ''" />`.

- [ ] **Step 6: Checks**: `yarn compile`, `yarn lint`, `yarn i18n:check` as in Task 3. Then in the dev Chrome (tabs parked first):
  - `node do.mjs overview 1600` and `node do.mjs overview 390` (390 in the same session as its screenshot) give:
    - `firstIsPacks: true`, `highlighted: true`, `primary: true`;
    - two tiles, "Standard 68 animations" and "Halloween 49 animations";
    - `sideways: false`.
  - Clicking the Halloween tile opens the dialog on Halloween's page (`node do.mjs page` reads the open page, not a card).
  - Look at both screenshots.

- [ ] **Step 7: Commit**

```bash
git add components/Settings/Wled/PacksOverview.vue components/Settings/Wled/PackTile.vue components/Settings/Wled.vue locales/en/wled.ts locales/de/wled.ts locales/nl/wled.ts
git commit -m "feat(wled): the animation packs first on the WLED panel, highlighted, a tile per pack"
```

### Task 5: Docs, and the sweep in three languages

**Files:**
- Modify: `README.md` (the "#### Animation packs" subsection), `CHANGELOG.md` (the [Unreleased] packs entry)
- Test: the e2e scenarios of Tasks 3–4 in de and nl

- [ ] **Step 1: README.** In "#### Animation packs":
  - the packs come first on the WLED panel, a tile per pack;
  - a pack's page lists its animations, with a search;
  - **+** puts a single animation on the WLED, with the hold and the loop it returns to, and its effect into the effect set the panel shows;
  - **Add all** does what Add did.
- [ ] **Step 2: CHANGELOG.** Extend the [Unreleased] → Added entry of the packs:
  - single animations from a pack's page;
  - the packs first on the WLED panel;
  - the new test counts.
- [ ] **Step 3: Sweep.** Set the site language to de, then nl (`localStorage["autodarts.settings.language"]`, reload the parked tab), and run:
  - `overview 1600`;
  - `page`;
  - `single "AD Game on"` against the stand-in.

  Read the screenshots for overflow and for English left in the texts. Set the language back to en.
- [ ] **Step 4: Commit**

```bash
git add README.md CHANGELOG.md
git commit -m "docs: single animations and the packs first on the WLED panel"
```

---

## Self-review

- **Spec coverage:**
  - overview first and highlighted, tiles: Task 4;
  - pages, back to origin, Add all/Update, sentence, search, rows: Task 3;
  - packSubset: Task 1;
  - addEffectsToSet and fallback: Task 2;
  - row states, one install at a time, locked dialog: Task 3;
  - texts: Tasks 3–4;
  - tsx tests: Tasks 1–2;
  - e2e: Tasks 3–5.
- **Types:** `packSubset` and `addEffectsToSet` signatures are the same in Tasks 1–3. `PackRow` is exported from PackPage.vue and imported in PacksDialog.vue with `import type { PackRow } from "./PackPage.vue"`. `installFailureText(t, failure, address)` is the same in PackInstall and PacksDialog.
- **Review Focus:** items 1–3 are in Task 3's e2e (`single.mjs` reads the enabled **+** count and the close button while running). Item 4 is in Task 5's sweep. Item 5 is in Task 4's 390 px run.
