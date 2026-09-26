# A length for every animation (PR #254): implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge PR #254 into `main` and rework it onto the library settings: every animation can have its own *Show for*, read from its GIF on request, and the player gives a GIF its whole run.

**Architecture:**
- **Merge:** a mechanical merge commit brings the pull request in with its author's commit.
- **Logic:** one follow-up `feat:` commit makes the field optional (no migration) and moves the logic into a pure module tested under tsx, `utils/animation-duration.ts`: the stored value made safe, the editor's parsing, and a GIF block walk.
- **Editor:** the field, the button and the grid chip.
- **Player:** loads the GIF during the start delay and starts the clock on the picture's `load`.

**Tech Stack:**
- Vue 3.4 (`<script setup>`), TypeScript, Tailwind 3 with the design-system classes in `assets/tailwind.css`
- tsx + `node:test` for the pure module
- WXT dev build in the yarn dev Chrome, driven over raw CDP (`:9222`)

**Spec:** `docs/superpowers/specs/2026-09-26-per-animation-duration-design.md`

## Global Constraints

- **Stored shape:**
  - `IAnimation.duration?: number`, in seconds, written only when an animation has a length of its own. Missing means the *Show for* option.
  - No migration: `defaultConfig.version` stays 22 and `CONFIG_VERSION` stays 13. The pull request's `case 22` and its twenty `duration: 0` defaults go.
  - Read it only through `ownDuration` / `animationDuration` (`utils/animation-duration.ts`).
- **Numbers:**
  - `MIN_ANIMATION_DURATION = 0.1` s; lengths are kept to the hundredth.
  - A GIF frame of ≤ 10 ms counts 100 ms (Chromium, Firefox, WebKit).
  - The player waits at most `LOAD_WAIT_MS = 3000` past a duration for its GIF.
- **Copy, verbatim:**
  - field label `Show for`, unit `s`, placeholder the option's value (`5`)
  - button `Use the GIF's length`
  - hint `Leave it empty to use the Show for option (5 s).`
  - errors:
    - link: `This link's site doesn't let the extension read the file, so its length can't be read.`
    - not animated: `This isn't an animated GIF, so it has no length to read.`
    - upload: `The uploaded GIF couldn't be read.`
  - uploaded line `Kept in this browser as {name}. Its triggers and how long it stays up can be changed.`
  - chip `2.37 s`, titled `Stays up for 2.37 s`
- **UI parts:** `AppInput dense` in `w-28`; neutral `AppButton` (`auto`, `class="h-10"`); `adt-field-hint`, errors with `!text-[var(--ad-rose-500)]`; `adt-chip … !bg-black/70`; icon `icon-[material-symbols--timer-outline-rounded]` (checked present). No new blue buttons.
- **Browser:**
  - Only the yarn dev Chrome (CDP :9222), in a tab or window of my own. The user's tab is on `/tools`; never navigate, reload or close it.
  - Before every batch of source edits, check `:9222/json/list` for a `/matches/` tab, and park my own tab at `about:blank`.
  - Never reload the extension.
  - Put back `adt:last-visited-url`, `adt:active-tab` and `urlstatus` if a test tab changes them.
- **The user's config is real data:** back up `config-2-0-0` first, restore only that key afterwards (never `clear()`), and compare with key-sorted JSON. Test configs switch off WLED (real lights), the Caller, Sound FX, Discord, Instant Replay, Automatic Next Leg, Next Player on Takeout and Streaming Mode.
- **Code style:**
  - Template-first SFCs. Attribute order: events, `ref`, bound props, then static props, as the neighbouring code has it.
  - Imports: sibling, then `type`, then `@/` aliases, with blank lines between groups. Vue APIs are auto-imported in SFCs.
  - Comments say why, in the file's own voice.
- **Checks:**
  - `yarn compile`'s baseline is 14 errors; none may be added, and none may be in touched lines.
  - ESLint on touched files, against `git show HEAD:f | npx eslint --stdin`.
  - Every `.vue` edit is compiled with `sfc-check.cjs`; `yarn build` must pass.
- **Commits:** on `main`, local only, never pushed:
  1. the plan (`docs:`);
  2. `Merge pull request #254 from MeisterBob/animation-duration`;
  3. one `feat:` commit after the review.

## Review Focus

1. **Editing only an animation's triggers keeps its own length**, and one without a length stays without. Pinned in Task 5 (edit triggers on a 3.3 s animation → storage still `3.3`; a plain one → no `duration` key).
2. **"Use the GIF's length", then Cancel, changes nothing stored.** Pinned in Task 5 (storage compared before and after).
3. **A link that is not an animated GIF** (an HTML page, a still image), or a link whose site refuses the relay: the right line under the field, the field unchanged, and nothing thrown.
   - Pinned in Task 2 (`gifRunLength` → null for a PNG, a one-frame GIF and junk).
   - Pinned in Task 5 (both messages on screen).
4. **A dead link at match time** covers nothing, and the next trigger still plays. Pinned in Task 4 (a 404 GIF on `t18`: no overlay; then `t20` plays).
5. **Two triggers from one visit with different lengths** (a turn total, then its combination 500 ms later): the later one's length is what the overlay holds for, counted from its own show, and the first one's timer never hides it early. Pinned in Task 4 (`180` at 5 s and `t20_t20_t20` at 2.33 s → overlay hidden ≈ 1.5 s + 2.33 s after the visit, not at 1 s + 5 s).

---

### Task 1: Merge PR #254

**Files:**
- Modify (by the merge): `utils/storage.ts`, `entrypoints/content/migration-config.ts`, `entrypoints/match.content/Animations.vue`, `package.json`, `yarn.lock`, `Autodarts_Tools_Source.json` (03d44c4)
- Resolve: `components/Settings/Animations.vue`

**Interfaces:**
- Produces: `IAnimation.duration: number` (required, as the pull request has it; Task 3 makes it optional). `resolveAnimation(trigger): Promise<{ url: string; duration: number } | null>` in the match player.

- [ ] **Step 1: Redo the trial merge on top of today's `main`** (the scratch worktree was made before the spec commit)

```bash
SCR=/private/tmp/claude-501/-Volumes-WD-BLACK-PROJECTS-Autodarts-autodarts-tools-wxt/1058cd34-2677-4596-920e-e2351f64c84a/scratchpad
git -C $SCR/trial merge --abort
git -C $SCR/trial checkout --detach main
git -C $SCR/trial merge --no-ff --no-commit pr-254
```
Expected: `CONFLICT (content): Merge conflict in components/Settings/Animations.vue`, everything else auto-merged.

- [ ] **Step 2: Take `main`'s settings component and give its two new animations the pull request's `duration: 0`**

```bash
cd $SCR/trial && git checkout --ours components/Settings/Animations.vue
```
Then in `$SCR/trial/components/Settings/Animations.vue`, in `saveAnimation()`:
```ts
    animationId: newAnimation.value.animationId ?? undefined,
    duration: 0,
  };
```
and in `processGifFiles()`:
```ts
          triggers: fromNames ? extractTriggersFromGifFilename(file.name) : [ ...sharedTriggers ],
          enabled: true,
          duration: 0,
        };
```

- [ ] **Step 3: Check the result compiles**

Write `$SCR/sfc-check.cjs` (parses and compiles SFCs given as arguments, prints `ok` or the error):
```js
const { parse, compileScript } = require("/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/node_modules/@vue/compiler-sfc");
const fs = require("node:fs");
let failed = false;
for (const file of process.argv.slice(2)) {
  const { descriptor, errors } = parse(fs.readFileSync(file, "utf8"), { filename: file });
  if (errors.length) { failed = true; console.log("PARSE", file, errors.map(String)); continue; }
  try { compileScript(descriptor, { id: "x", inlineTemplate: true }); console.log("ok", file); }
  catch (error) { failed = true; console.log("COMPILE", file, String(error)); }
}
process.exit(failed ? 1 : 0);
```
Run: `node $SCR/sfc-check.cjs $SCR/trial/components/Settings/Animations.vue $SCR/trial/entrypoints/match.content/Animations.vue`
Expected: two `ok` lines. Run `grep -c "<<<<<<<\|>>>>>>>" $SCR/trial/components/Settings/Animations.vue`; expected `0`.

- [ ] **Step 4: Commit the merge in the worktree**

```bash
cd $SCR/trial && git add -A && git commit -F - <<'EOF'
Merge pull request #254 from MeisterBob/animation-duration

Animations: set duration per animation

The settings dialog this edits has been rebuilt since (e7e0d09), so the
conflict in components/Settings/Animations.vue takes main's version, with
the duration: 0 the pull request gives the animations it creates. The
field and the button come back in the next commit, fitted to the new
editor, which also reworks what the review found.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
```

- [ ] **Step 5: Fast-forward `main` to it**, once no tab is on a match

```bash
curl -s http://127.0.0.1:9222/json/list | grep -c '/matches/'   # expect 0
cd /Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt && git merge --ff-only "$(git -C $SCR/trial rev-parse HEAD)"
git log --oneline -4 --graph
```
Expected: `main` is the merge commit, with parents the plan commit and 583f5d7. `package.json` changing does not restart WXT (only `wxt.config.ts`, `modules/` and the runner config do), and nothing installs `gif-info`, which nothing imports.

- [ ] **Step 6: Wait for the rebuild**: `stat -f "%Sm" -t "%H:%M:%S" .output/chrome-mv3-dev/content-scripts/match.js` moves within ~3 min. The user's `/tools` tab reloads once, which is expected.

---

### Task 2: Duration logic and the GIF reader

**Files:**
- Create: `utils/animation-duration.ts`
- Test: `$SCR/tests/animation-duration.test.mts` (house practice: tsx tests live in the scratchpad)
- Fixture: `$SCR/gifs/*.gif` (the 20 defaults, downloaded) and `$SCR/gifs/expected.json` (from Pillow)

**Interfaces:**
- Produces:
  - `MIN_ANIMATION_DURATION: number` (0.1)
  - `ownDuration(animation: Pick<IAnimation, "duration">): number | undefined`
  - `animationDuration(animation: Pick<IAnimation, "duration">, showFor: number): number`
  - `durationToSave(text: string): number | undefined`
  - `roundedSeconds(ms: number): number`
  - `formatSeconds(seconds: number): string`
  - `bytesOfDataUrl(dataUrl: string): Uint8Array`
  - `gifRunLength(bytes: Uint8Array): number | null` (milliseconds)

- [ ] **Step 1: Write the Pillow fixture for the 20 defaults**

```bash
cd $SCR/gifs && python3 - <<'EOF'
import glob, json
from PIL import Image
out = {}
for f in sorted(glob.glob("*.gif")):
    im = Image.open(f); total = 0; n = 0
    try:
        while True:
            ms = im.info.get("duration", 0)
            total += 100 if ms <= 10 else ms
            n += 1
            im.seek(im.tell() + 1)
    except EOFError:
        pass
    out[f] = {"frames": n, "ms": total}
json.dump(out, open("expected.json", "w"), indent=1)
print(len(out), "files")
EOF
```
Expected: `20 files`.

- [ ] **Step 2: Write the failing tests** in `$SCR/tests/animation-duration.test.mts`

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  MIN_ANIMATION_DURATION,
  animationDuration,
  bytesOfDataUrl,
  durationToSave,
  formatSeconds,
  gifRunLength,
  ownDuration,
  roundedSeconds,
} from "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/utils/animation-duration.ts";

const GIFS = "/private/tmp/claude-501/-Volumes-WD-BLACK-PROJECTS-Autodarts-autodarts-tools-wxt/1058cd34-2677-4596-920e-e2351f64c84a/scratchpad/gifs";

// A GIF built by hand: header, a 1×1 screen, an optional two-colour table, the blocks, the trailer.
function gif(blocks: number[][], { globalTable = false, version = "89a" } = {}): Uint8Array {
  return Uint8Array.from([
    ...Buffer.from(`GIF${version}`),
    1, 0, 1, 0, globalTable ? 0x80 : 0x00, 0, 0,
    ...(globalTable ? [ 0, 0, 0, 255, 255, 255 ] : []),
    ...blocks.flat(),
    0x3B,
  ]);
}
// A graphics control extension: the next frame's delay, in hundredths of a second.
const gce = (cs: number) => [ 0x21, 0xF9, 0x04, 0x00, cs & 0xFF, cs >> 8, 0x00, 0x00 ];
// An image: descriptor, optional local table, LZW code size, its data sub-blocks, terminator.
const frame = (subBlocks: number[][] = [ [ 0x02, 0x44, 0x01 ] ], localTable = false) => [
  0x2C, 0, 0, 0, 0, 1, 0, 1, 0, localTable ? 0x80 : 0x00,
  ...(localTable ? [ 0, 0, 0, 255, 255, 255 ] : []),
  0x02,
  ...subBlocks.flatMap(data => [ data.length, ...data ]),
  0x00,
];
const comment = (text: string) => [ 0x21, 0xFE, text.length, ...Buffer.from(text), 0x00 ];
const netscape = [ 0x21, 0xFF, 0x0B, ...Buffer.from("NETSCAPE2.0"), 0x03, 0x01, 0x00, 0x00, 0x00 ];

test("adds up the frames' delays", () => {
  assert.equal(gifRunLength(gif([ gce(50), frame(), gce(30), frame() ])), 800);
});

test("shows a frame of 10 ms or less for 100 ms, as browsers do", () => {
  assert.equal(gifRunLength(gif([ gce(0), frame(), gce(1), frame() ])), 200);
  assert.equal(gifRunLength(gif([ gce(2), frame(), gce(2), frame() ])), 40);
});

test("a frame without a graphics control extension counts 100 ms", () => {
  assert.equal(gifRunLength(gif([ frame(), frame() ])), 200);
  assert.equal(gifRunLength(gif([ frame(), frame() ], { version: "87a" })), 200);
});

test("the extension's bytes inside picture data are not a delay", () => {
  const trap = [ 0x21, 0xF9, 0x04, 0x00, 0xFF, 0xFF, 0x00, 0x00 ];
  assert.equal(gifRunLength(gif([ gce(10), frame([ trap ]), gce(10), frame([ trap, trap ]) ])), 200);
});

test("skips colour tables, long data and other extensions", () => {
  assert.equal(gifRunLength(gif([ gce(10), frame(undefined, true), gce(10), frame(undefined, true) ], { globalTable: true })), 200);
  assert.equal(gifRunLength(gif([ gce(10), frame([ Array.from({ length: 255 }, (_, i) => i), [ 1, 2, 3 ] ]), gce(10), frame() ])), 200);
  assert.equal(gifRunLength(gif([ netscape, comment("hi"), gce(20), frame(), comment("x"), gce(20), frame() ])), 400);
});

test("a file cut short counts the frames it has in full", () => {
  const whole = gif([ gce(10), frame(), gce(10), frame(), gce(10), frame([ [ 1, 2, 3, 4, 5, 6 ] ]) ]);
  assert.equal(gifRunLength(whole), 300);
  assert.equal(gifRunLength(whole.slice(0, whole.length - 6)), 200);
});

test("no run for a still picture, another format or junk", () => {
  assert.equal(gifRunLength(gif([ gce(50), frame() ])), null);
  assert.equal(gifRunLength(Uint8Array.from([ 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0, 0, 0 ])), null);
  assert.equal(gifRunLength(Uint8Array.from(Buffer.from("GIF90a......."))), null);
  assert.equal(gifRunLength(new Uint8Array()), null);
  assert.equal(gifRunLength(Uint8Array.from(Buffer.from("<!doctype html><html></html>"))), null);
});

test("the 20 default GIFs read as Pillow reads them", () => {
  const expected: Record<string, { frames: number; ms: number }> = JSON.parse(readFileSync(`${GIFS}/expected.json`, "utf8"));
  assert.equal(Object.keys(expected).length, 20);
  for (const [ file, { ms } ] of Object.entries(expected)) {
    assert.equal(gifRunLength(new Uint8Array(readFileSync(`${GIFS}/${file}`))), ms, file);
  }
});

test("an animation's own length, made safe", () => {
  assert.equal(MIN_ANIMATION_DURATION, 0.1);
  assert.equal(ownDuration({}), undefined);
  assert.equal(ownDuration({ duration: 2.37 }), 2.37);
  assert.equal(ownDuration({ duration: 0.1 }), 0.1);
  for (const junk of [ 0, -1, 0.05, Number.NaN, Number.POSITIVE_INFINITY, "3" as unknown as number, null as unknown as number ]) {
    assert.equal(ownDuration({ duration: junk }), undefined, String(junk));
    assert.equal(animationDuration({ duration: junk }, 5), 5, String(junk));
  }
  assert.equal(animationDuration({}, 5), 5);
  assert.equal(animationDuration({ duration: 2.37 }, 5), 2.37);
});

test("what the editor's field saves", () => {
  for (const none of [ "", "  ", "0", "-2", "abc" ]) assert.equal(durationToSave(none), undefined, JSON.stringify(none));
  assert.equal(durationToSave("0.05"), 0.1);
  assert.equal(durationToSave("2.374"), 2.37);
  assert.equal(durationToSave("4"), 4);
  assert.equal(durationToSave(" 3.5 "), 3.5);
});

test("rounding and showing seconds", () => {
  assert.equal(roundedSeconds(2370), 2.37);
  assert.equal(roundedSeconds(3300), 3.3);
  assert.equal(roundedSeconds(2375), 2.38);
  assert.equal(formatSeconds(4), "4");
  assert.equal(formatSeconds(4.5), "4.5");
  assert.equal(formatSeconds(2.37), "2.37");
  assert.equal(formatSeconds(2.370000001), "2.37");
  assert.equal(formatSeconds(0.1), "0.1");
});

test("the bytes of a data: URL of any type, or bare base64", () => {
  const gifHeader = [ 0x47, 0x49, 0x46, 0x38, 0x39, 0x61 ];
  assert.deepEqual([ ...bytesOfDataUrl("data:image/gif;base64,R0lGODlh") ], gifHeader);
  assert.deepEqual([ ...bytesOfDataUrl("data:application/octet-stream;base64,R0lGODlh") ], gifHeader);
  assert.deepEqual([ ...bytesOfDataUrl("R0lGODlh") ], gifHeader);
});
```

- [ ] **Step 3: Run them and see them fail**

Run: `cd $SCR/tests && /Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/node_modules/.bin/tsx --test animation-duration.test.mts`
Expected: FAIL, `Cannot find module …/utils/animation-duration.ts`.

- [ ] **Step 4: Write `utils/animation-duration.ts`**

```ts
import type { IAnimation } from "@/utils/storage";

/**
 * How long an animation stays up, and how long one run of a GIF takes.
 *
 * An animation may have a length of its own, `IAnimation.duration`, in seconds.
 * Without one it stays up for the Show for option, so every animation saved
 * before there was such a thing plays as it always has, and nothing had to be
 * migrated. See docs/superpowers/specs/2026-09-26-per-animation-duration-design.md.
 */

/** The shortest length of its own an animation keeps, in seconds. */
export const MIN_ANIMATION_DURATION = 0.1;

/**
 * Browsers show a GIF frame of 10 ms or less for 100 ms: tools write 0 when they
 * mean "the default". Chromium and Firefox say so in as many words, WebKit as
 * "under 11 ms", and the dev Chrome was measured doing it.
 */
const FAST_FRAME_MS = 10;
const FAST_FRAME_SHOWN_MS = 100;

/**
 * The animation's own length in seconds, or undefined when it has none worth
 * using: missing, 0 (what the first version of this saved for "none"), or
 * anything an imported or hand-edited config holds that is not a number of at
 * least MIN_ANIMATION_DURATION — which would otherwise reach a setTimeout.
 */
export function ownDuration(animation: Pick<IAnimation, "duration">): number | undefined {
  const seconds = animation.duration;
  return typeof seconds === "number" && Number.isFinite(seconds) && seconds >= MIN_ANIMATION_DURATION ? seconds : undefined;
}

/** How long an animation stays up, in seconds: its own length, or the Show for option's. */
export function animationDuration(animation: Pick<IAnimation, "duration">, showFor: number): number {
  return ownDuration(animation) ?? showFor;
}

/**
 * What the editor's field saves: nothing for an empty field, 0, a negative
 * number or no number at all, and otherwise at least MIN_ANIMATION_DURATION, in
 * hundredths.
 */
export function durationToSave(text: string): number | undefined {
  const trimmed = text.trim();
  if (trimmed === "") return undefined;
  const seconds = Number(trimmed);
  if (!Number.isFinite(seconds) || seconds <= 0) return undefined;
  return Math.max(MIN_ANIMATION_DURATION, roundedSeconds(seconds * 1000));
}

/** Milliseconds as seconds to the hundredth, which is what GIF delays are counted in. */
export function roundedSeconds(ms: number): number {
  return Math.round(ms / 10) / 100;
}

/** Seconds as the editor and the grid show them: "4", "4.5", "2.37". */
export function formatSeconds(seconds: number): string {
  return String(Math.round(seconds * 100) / 100);
}

/** The bytes of a data: URL, whatever type it says it is, or of bare base64. */
export function bytesOfDataUrl(dataUrl: string): Uint8Array {
  const binary = atob(dataUrl.slice(dataUrl.indexOf(",") + 1).replace(/\s+/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * How long one run of a GIF takes in a browser, in milliseconds, or null when the
 * bytes are not an animated GIF: another format, a still picture, or too broken
 * to read.
 *
 * It walks the file's blocks. Looking for the graphics control extension's bytes,
 * `21 F9 04`, anywhere in the file finds them inside compressed picture data too:
 * three of the four default "outside" GIFs read as three to eight minutes long
 * that way. A file cut short counts the frames it has in full.
 */
export function gifRunLength(bytes: Uint8Array): number | null {
  if (bytes.length < 13 || !isGifHeader(bytes)) return null;

  let pos = 13 + colorTableSize(bytes[10]);
  /** The next frame's delay in milliseconds, from the graphics control extension before it. */
  let delay = 0;
  let frames = 0;
  let total = 0;

  while (pos < bytes.length) {
    const block = bytes[pos];
    if (block === 0x21) {
      // An extension: its label, then data sub-blocks
      if (bytes[pos + 1] === 0xF9 && bytes[pos + 2] === 4 && pos + 5 < bytes.length) {
        delay = (bytes[pos + 4] | (bytes[pos + 5] << 8)) * 10;
      }
      const end = skipSubBlocks(bytes, pos + 2);
      if (end < 0) break;
      pos = end;
    } else if (block === 0x2C) {
      // A frame: a 10-byte descriptor, its own colour table, the LZW code size, then data sub-blocks
      if (pos + 9 >= bytes.length) break;
      const end = skipSubBlocks(bytes, pos + 10 + colorTableSize(bytes[pos + 9]) + 1);
      if (end < 0) break;
      frames++;
      total += delay <= FAST_FRAME_MS ? FAST_FRAME_SHOWN_MS : delay;
      delay = 0;
      pos = end;
    } else {
      // The trailer, or a byte no GIF has here: either way, that is the end
      break;
    }
  }

  return frames >= 2 ? total : null;
}

/** "GIF87a" or "GIF89a". */
function isGifHeader(bytes: Uint8Array): boolean {
  return bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38
    && (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61;
}

/** The size in bytes of the colour table a packed field announces, or 0 for none. */
function colorTableSize(packed: number): number {
  return packed & 0x80 ? 3 * (1 << ((packed & 0x07) + 1)) : 0;
}

/** Where the data sub-blocks starting at `pos` end, past their terminator, or -1 when the file ends first. */
function skipSubBlocks(bytes: Uint8Array, pos: number): number {
  while (pos < bytes.length) {
    const size = bytes[pos];
    if (size === 0) return pos + 1;
    pos += size + 1;
  }
  return -1;
}
```

- [ ] **Step 5: Run the tests and see them pass**

Run: `cd $SCR/tests && /Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/node_modules/.bin/tsx --test animation-duration.test.mts`
Expected: `# pass 12`, `# fail 0`.

- [ ] **Step 6: Lint the new file**: `npx eslint utils/animation-duration.ts -f unix`. Expected: no output.

---

### Task 3: The stored shape, without a migration

**Files:**
- Modify: `utils/storage.ts` (`IAnimation`, `defaultConfig.version`, the twenty default animations)
- Modify: `entrypoints/content/migration-config.ts` (the pull request's `case 22`)
- Modify: `package.json`, `yarn.lock` (`gif-info`)

**Interfaces:**
- Produces: `IAnimation.duration?: number`. Tasks 4 and 5 read it only through `ownDuration` / `animationDuration`.

- [ ] **Step 1: `IAnimation` gets an optional, documented `duration`**

```ts
export interface IAnimation {
  url: string;
  triggers: string[];
  enabled: boolean;
  animationId?: string;
  /**
   * How long it stays up, in seconds, when it has a length of its own. Missing
   * is the Show for option (`animations.duration`), so every animation saved
   * before this plays as it always has; it is only stored when it is set. Read
   * it through ownDuration / animationDuration in utils/animation-duration.ts,
   * never directly.
   */
  duration?: number;
}
```

- [ ] **Step 2: Put back `version: 22` and the defaults without `duration: 0`**

```bash
cd /Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt
git diff 354bb21 -- utils/storage.ts | grep -c "^+        duration: 0,"   # expect 20
python3 - <<'EOF'
p = "utils/storage.ts"
s = open(p).read()
s = s.replace("        enabled: true,\n        duration: 0,\n      },", "        enabled: true,\n      },")
s = s.replace("  version: 23,\n  discord: {", "  version: 22,\n  discord: {")
open(p, "w").write(s)
EOF
git diff 354bb21 -- utils/storage.ts
```
Expected: the diff against 354bb21 is only the documented optional field.

- [ ] **Step 3: Drop the pull request's migration step**. In `entrypoints/content/migration-config.ts` remove:

```ts
      case 22:
        // Migration from version 22 to version 23
        config.version = 23;
        config.animations.data.forEach((animation) => {
          animation.duration = 0;
        });
        break;
```
Check: `git diff 354bb21 -- entrypoints/content/migration-config.ts` prints nothing.

- [ ] **Step 4: Drop `gif-info`**: remove `"gif-info": "^1.0.1",` from `package.json` and its five-line entry from `yarn.lock`, then check `git diff 354bb21 -- package.json yarn.lock` prints nothing.

---

### Task 4: The player gives each animation its length and its GIF its whole run

**Files:**
- Modify: `entrypoints/match.content/Animations.vue`

**Interfaces:**
- Consumes: `animationDuration(animation, showFor)` (Task 2).
- Produces: nothing new outside the component.

- [ ] **Step 1: The picture reports when it has loaded or failed.** The overlay's `<img>`:

```html
    <img
      @error="hide"
      @load="startClock"
      ref="image"
      :src="currentUrl"
      class="size-full transition-opacity duration-300"
      :class="[shown ? 'opacity-100' : 'opacity-0', objectFit === 'contain' ? 'object-contain' : 'object-cover']"
      alt=""
    >
```

- [ ] **Step 2: Constants and state**, next to the existing ones:

```ts
import { animationDuration } from "@/utils/animation-duration";

/** How much longer than its duration an animation waits for its GIF before giving up on it. */
const LOAD_WAIT_MS = 3000;

const image = ref<HTMLImageElement | null>(null);

/** Links whose GIF failed to load, so a dead one never covers the board. */
const failedUrls = new Set<string>();
/** The duration of the animation on screen, in ms, held until its GIF has loaded. */
let heldDuration: number | null = null;
```

- [ ] **Step 3: `resolveAnimation` returns the length through `animationDuration`**, keeping the pull request's shape:

```ts
/** Pick an animation for a trigger, at random when several match, with how long it stays up in seconds. */
async function resolveAnimation(trigger: string): Promise<{ url: string; duration: number } | null> {
  const animations = config.value?.animations?.data;
  if (!animations?.length) return null;

  const matched = animations.filter(animation => animation.enabled && matchesTrigger(animation, trigger));
  if (!matched.length) return null;

  const picked = matched[Math.floor(Math.random() * matched.length)];

  // Uploaded GIFs live in OPFS and are addressed by id; the rest are plain URLs.
  const url = picked.animationId && !picked.url
    ? opfsUrls.get(picked.animationId) ?? await loadFromOPFS(picked.animationId)
    : picked.url;
  if (!url) return null;

  return { url, duration: animationDuration(picked, config.value?.animations?.duration ?? 5) };
}
```

- [ ] **Step 4: `hide()` drops a held duration** (add `heldDuration = null;` after clearing the timer), and **`play()` preloads, skips a dead link, and holds the clock**:

```ts
async function play(trigger: string): Promise<void> {
  try {
    const animation = await resolveAnimation(trigger);
    if (!animation) return;

    console.log("Autodarts Tools: Animations - playing", trigger);

    // Loaded while the start delay runs, so the GIF is ready when it appears.
    preload(animation.url);

    // The board moves with the window and with the player count, so its
    // position is only worth knowing at the moment it is covered.
    measureBoard();

    if (visible.value) {
      hide();
      await new Promise(resolve => setTimeout(resolve, FADE_MS));
    }

    const delay = (config.value?.animations?.delayStart ?? 1) * 1000;
    const duration = animation.duration * 1000;

    currentUrl.value = animation.url;

    setTimeout(() => {
      // A GIF that could not be loaded shows nothing, rather than an empty overlay.
      if (failedUrls.has(currentUrl.value)) return;

      visible.value = true;
      setTimeout(() => (shown.value = true), FADE_IN_DELAY_MS);
      holdUntilLoaded(duration);
    }, delay);
  } catch (error) {
    console.error("Autodarts Tools: Animations - play error", error);
  }
}

/** Starts loading a GIF before it is shown, and remembers whether its link is dead. */
function preload(url: string): void {
  failedUrls.delete(url);
  const loader = new Image();
  loader.onload = () => failedUrls.delete(url);
  loader.onerror = () => failedUrls.add(url);
  loader.src = url;
}

/**
 * Starts the clock once the GIF on screen has loaded, so a download slower than
 * the start delay does not come off the end of it. A GIF that never loads is
 * hidden LOAD_WAIT_MS after it would have been.
 */
function holdUntilLoaded(duration: number): void {
  heldDuration = duration;
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = window.setTimeout(hide, duration + LOAD_WAIT_MS);

  // A GIF that was already on screen and loaded fires no load event again.
  nextTick(() => {
    if (image.value?.complete && image.value.naturalWidth > 0) startClock();
  });
}

/** The GIF on screen has loaded: its duration runs from now. */
function startClock(): void {
  if (heldDuration === null) return;
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = window.setTimeout(hide, heldDuration);
  heldDuration = null;
}
```

- [ ] **Step 5: Compile and lint**: `node $SCR/sfc-check.cjs entrypoints/match.content/Animations.vue` → `ok`; `npx eslint entrypoints/match.content/Animations.vue -f unix` → nothing new against `git show HEAD:…`.

- [ ] **Step 6: Live check in a bot match** (the review focus items 4 and 5, plus the basic lengths). Scripts in `$SCR`:
  - `sw.mjs`: `backup`, `restore`, `eval <js>` against the extension's worker. The dev extension is the `mgmgkok…` worker.
  - `match-test.mjs`: the steps below.

  Steps:
  1. Back up `config-2-0-0`.
  2. Write a test config: everything in *Global Constraints* switched off, and Animations on with `delayStart: 1`, `duration: 5`, board-only. The animations:
     - `t20`: default `09.gif`, `duration: 2.33`
     - `t19`: default `20.gif`, no duration
     - `t18`: `https://media.tenor.com/doesnotexist0000AAAAM/x.gif` (a 404)
     - `t17`: default `02.gif` with `?adt=<now>`, so it has never been cached
     - `180`: `11.gif`, no duration
     - `t20_t20_t20`: `09.gif`, `duration: 2.33`
  3. Create a lobby through the API: X01 301, a bot. Start it and open my own window on `/matches/<id>`.
  4. Arm a recorder in the main world on `autodarts-tools-animations`'s shadow root. It logs `{t, shown|hidden, src, complete}`.
  5. Inject game-data from the worker, one visit per trigger with `activated` removed, 10 s apart. Record the time of each write.
  - Expected, from each write:
    - `t20` appears at ≈1.0 s and is removed at ≈1.0 + 2.33 + 0.3 s.
    - `t19` at ≈1.0 s and ≈1.0 + 5 + 0.3 s.
    - `t18`: no overlay at all.
    - `t17`: `complete` true at appearance (preloaded), and removed ≈ load end + 5 + 0.3 s.
    - The three-dart `180` visit: overlay removed ≈1.5 + 2.33 + 0.3 s after the write.
    - After `t18`, the next `t20` still plays.
  6. Throttle my tab to 4 Mbit/s (`Network.emulateNetworkConditions`) and send `t17` again on a new `?adt=` URL.
     - Expected: the overlay appears at ≈1.0 s with `complete` false.
     - It is removed ≈ the GIF's load end + 5 + 0.3 s, not at 1.0 + 5 + 0.3 s.
     - Then turn the throttle off.
  7. Leave: navigate my match session to `about:blank` (answer `beforeunload`), `DELETE /gs/v0/matches/<id>`, restore the config, compare.

---

### Task 5: The editor and the grid chip

**Files:**
- Modify: `components/Settings/Animations.vue`

**Interfaces:**
- Consumes (Task 2): `MIN_ANIMATION_DURATION`, `ownDuration`, `durationToSave`, `roundedSeconds`, `formatSeconds`, `bytesOfDataUrl`, `gifRunLength`. Also `backgroundFetch` from `@/utils/helpers`.

- [ ] **Step 1: The field, the button and the hint**, straight after the link block in the add/edit `AppModal` (before `TriggerField`):

```html
        <div>
          <label class="adt-field-label" for="animation-duration">Show for</label>
          <div class="flex items-center gap-2">
            <div class="w-28">
              <AppInput
                id="animation-duration"
                v-model="durationText"
                :placeholder="showForText"
                class="text-right"
                dense
                min="0.1"
                step="0.1"
                type="number"
              />
            </div>
            <span class="text-sm">s</span>
            <AppButton @click="readGifLength" :disabled="!previewSrc" :loading="readingLength" auto class="h-10">
              <span class="flex items-center gap-1.5">
                <span class="icon-[material-symbols--timer-outline-rounded] text-lg" />
                Use the GIF's length
              </span>
            </AppButton>
          </div>
          <p v-if="lengthError" class="adt-field-hint !text-[var(--ad-rose-500)]">
            {{ lengthError }}
          </p>
          <p v-else class="adt-field-hint">
            Leave it empty to use the Show for option ({{ showForText }} s).
          </p>
        </div>
```
And the uploaded line becomes:
```html
          <p v-if="isUploadedGif" class="adt-field-hint">
            Kept in this browser as {{ uploadedGifFilename }}. Its triggers and how long it stays up can be changed.
          </p>
```

- [ ] **Step 2: The chip on a tile**, after the *Off* chip:

```html
                <span
                  v-if="ownLengthLabels[entry.index]"
                  :title="`Stays up for ${ownLengthLabels[entry.index]}`"
                  class="adt-chip absolute bottom-2 right-2 gap-1 !bg-black/70"
                >
                  <span aria-hidden="true" class="icon-[material-symbols--timer-outline-rounded]" />
                  <span class="sr-only">Stays up for</span>
                  {{ ownLengthLabels[entry.index] }}
                </span>
```

- [ ] **Step 3: The script.** Import the Task 2 parts and `backgroundFetch`. Then add:

```ts
/** Why "Use the GIF's length" found none, said under the field. */
const LENGTH_ERRORS = {
  link: "This link's site doesn't let the extension read the file, so its length can't be read.",
  upload: "The uploaded GIF couldn't be read.",
  notAnimated: "This isn't an animated GIF, so it has no length to read.",
};

/** The dialog's Show for, as typed: empty for the option's. */
const durationText = ref("");
const readingLength = ref(false);
const lengthError = ref("");

const showForText = computed(() => formatSeconds(config.value?.animations.duration ?? 5));

/** "2.37 s" for each animation with a length of its own, for its tile. */
const ownLengthLabels = computed(() => (config.value?.animations.data ?? []).map((animation) => {
  const seconds = ownDuration(animation);
  return seconds === undefined ? undefined : `${formatSeconds(seconds)} s`;
}));

// Another link is another GIF: what was said about the last one no longer applies
watch(() => newAnimation.value.url, () => {
  lengthError.value = "";
});
```
Then the reading, next to the other dialog handlers:
```ts
/** Fills in how long one run of the dialog's GIF takes, read from its link or its uploaded file. */
async function readGifLength() {
  const source = previewSrc.value;
  if (!source || readingLength.value) return;
  readingLength.value = true;
  lengthError.value = "";
  try {
    const bytes = await gifBytes(source);
    // The link changed while it was being read: this answer is about another GIF
    if (source !== previewSrc.value) return;
    const run = bytes && gifRunLength(bytes);
    if (!bytes) lengthError.value = isUploadedGif.value ? LENGTH_ERRORS.upload : LENGTH_ERRORS.link;
    else if (run === null) lengthError.value = LENGTH_ERRORS.notAnimated;
    else durationText.value = formatSeconds(Math.max(MIN_ANIMATION_DURATION, roundedSeconds(run)));
  } finally {
    readingLength.value = false;
  }
}

/**
 * A GIF's bytes: an uploaded one from the object URL its preview uses, a link
 * through the background's relay, as the Caller's louder copies do. null when
 * they can't be had.
 */
async function gifBytes(source: string): Promise<Uint8Array | null> {
  try {
    if (source.startsWith("blob:")) return new Uint8Array(await (await fetch(source)).arrayBuffer());
    const response = await backgroundFetch(source);
    return response.ok && response.data?.startsWith("data:") ? bytesOfDataUrl(response.data) : null;
  } catch (error) {
    console.error("Autodarts Tools: Animations - could not read the GIF", error);
    return null;
  }
}
```

- [ ] **Step 4: Fill, reset and save the field**:
  - `editAnimation`: `durationText.value = own === undefined ? "" : formatSeconds(own)` with `const own = ownDuration(animation)`, plus `lengthError.value = ""`.
  - `openAddAnimationModal` / `closeAnimationModal`: `durationText.value = ""; lengthError.value = "";`.
  - `saveAnimation`: drop the merge's `duration: 0` and, before the edit/add branch, add:
    ```ts
    // Only a length of its own is stored: without one it stays up for Show for
    const duration = durationToSave(durationText.value);
    if (duration !== undefined) animation.duration = duration;
    ```
  - `processGifFiles`: drop the merge's `duration: 0`.

- [ ] **Step 5: Compile and lint**: `node $SCR/sfc-check.cjs components/Settings/Animations.vue` → `ok`; ESLint against `HEAD` shows nothing new.

- [ ] **Step 6: Live check in the settings** (review focus 1–3). `settings-test.mjs` opens my own tab with `adt:last-visited-url` = `/tools` and `adt:active-tab` = `3`, then opens Animations. With the config backed up, it:
  1. Adds `sigh-growl.gif` from a link and presses the button. Expected: the field reads `3.3`, where the pull request's scan reads 477.18. Saves it on `t20`. The tile shows `3.3 s`, and storage has `duration: 3.3`.
  2. Edits it, changes only its triggers and saves. Expected: still `3.3`. Does the same on a default animation, which keeps no `duration` key.
  3. Edits it, presses the button, then Cancels. Expected: storage is identical.
  4. Edits it, empties the field and saves. Expected: no `duration` key, no chip.
  5. With the link `https://play.autodarts.com/` (HTML), expects the not-animated line. With `https://www.myinstants.com/media/sounds/x.gif`, expects the link line (the relay can't read it). In both, the field keeps its value.
  6. Uploads `$SCR/gifexp/frames10.gif` (10 × 200 ms). Edits it and presses the button. Expected: `2`. Saves, checks the chip reads `2 s`, and deletes it with two clicks, which also removes its OPFS file.
  7. Takes screenshots of the dialog and the grid at 1600 × 1000 and 390 × 844, and checks for overflow.

  Then it restores the config, compares, and puts back `adt:last-visited-url` and `adt:active-tab`.

---

### Task 6: Documentation, whole-change checks, review, commit

**Files:**
- Modify: `README.md` (🎬 Animations › Configuration)
- Modify: `CHANGELOG.md` (`[Unreleased]` › Added, Fixed)

- [ ] **Step 1: README**. Under *Show for*, add:

```markdown
- **A length for one animation**: An animation's editor has its own **Show for**, which overrides the option for that GIF; leave it empty to use the option. **Use the GIF's length** fills in how long one run of the GIF takes, read from the file, so it plays exactly once. An animation with a length of its own shows it on its picture
```
and add to the paragraph under the list: `A GIF loads during the start delay, and its time on screen starts once it has, so a slow download doesn't cut its end off.`

- [ ] **Step 2: CHANGELOG**. Under `[Unreleased]` › Added, after the Colors entry:

```markdown
- **Animations** can each have a length of their own. The editor has a *Show for* field that stands in for the option of the same name when it is filled in, and **Use the GIF's length** fills it with one run of the GIF, read from the file whether it is a link or an upload. An animation with a length of its own shows it on its picture. A GIF now loads during the start delay and its time starts once it has, so the first play of a GIF no longer loses its end to the download (#254)
  - Contributed by @MeisterBob
```
and under Fixed:
```markdown
- **Animations** skip a GIF that can't be loaded. A dead link used to put up an empty overlay for the whole duration, and blur the page behind it in *Full page*
```

- [ ] **Step 3: Whole-change checks**
  - `yarn compile` in the background: 14 errors, the same files as the baseline, none in the touched files.
  - ESLint per touched file against `HEAD`.
  - The tsx tests once more.
  - `yarn build` passes, after all edits, since a build can leave the watcher idle.

- [ ] **Step 4: Review.** Use superpowers:requesting-code-review. One fresh reviewer on the most capable model reads the change against `main` before the merge (`git diff <the merge's first parent>` for the working tree), with the spec and this plan. Fix what holds up, and re-run the affected checks.

- [ ] **Step 5: Commit** everything but the plan in one `feat:` commit on `main`, staging only these paths:
  - `utils/animation-duration.ts`
  - `utils/storage.ts`
  - `entrypoints/content/migration-config.ts`
  - `entrypoints/match.content/Animations.vue`
  - `components/Settings/Animations.vue`
  - `package.json`, `yarn.lock`
  - `README.md`, `CHANGELOG.md`

  The message ends with `Co-Authored-By: MeisterBob <git@gerhard-joerges.de>` and the Claude line. Nothing is pushed.
