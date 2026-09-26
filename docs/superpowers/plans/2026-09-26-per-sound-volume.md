# A volume for every sound: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every Caller and Sound FX sound gets a volume from 0 to 200% (text to speech 0 to 100%). It is set in the sound's editor, shown in the list, and honoured by the previews and by both match engines.

**Architecture:**
- **Pure logic, tested under tsx:** `utils/sound-volume.ts` holds the stored value made safe, how a volume is reached (the element's own volume, a copy, or silence) and a 16-bit WAV encoder.
- **The copies:** `utils/sound-copies.ts` makes and caches copies of files at another volume: it decodes, applies the gain and writes a WAV to a `blob:` URL. The engines play those copies through their existing `<audio>` pools and lanes.
- **The settings:** a `VolumeField` in both editors, a `VolumeBadge` in the rows, and a link check (`useLouderCheck`).

**Tech Stack:**
- Vue 3.4 (`<script setup>`, `defineModel`), TypeScript, Tailwind 3 with the design-system classes in `assets/tailwind.css`, VueUse (`watchDebounced`)
- Web Audio `OfflineAudioContext.decodeAudioData`
- WXT dev build in the yarn dev Chrome

**Spec:** `docs/superpowers/specs/2026-09-26-per-sound-volume-design.md`

## Global Constraints

- **Volume:** a whole percentage.
  - Range 0–200 (`MAX_VOLUME`), text to speech 0–100 (`MAX_TTS_VOLUME`), steps of 5 (`VOLUME_STEP`), default 100 (`DEFAULT_VOLUME`).
  - Stored as `ISound.volume`, only when not 100. A missing value means 100, so no migration and no `CONFIG_VERSION` bump.
- **At 100% nothing changes** except `audioElement.volume = 1` before each play on a pooled element.
- **Copies:** 16-bit PCM WAV at 44.1 kHz, clipped at full scale, `blob:` URLs owned and revoked by their `soundCopies()` instance. They are never pushed into the engines' `blobUrlsToRevoke`.
- **Engines prepare at most 32 copies** (`PREPARE_LIMIT`) when they start.
- **Lane rule:** code that waits on a copy re-checks that its element still holds the lane before playing. A failed play releases the lane only if its element still holds it.
- **UI parts:**
  - `AppSlider` with `:autofocus="false"`, the value in the field label as the TTS editor does ("Volume 150%")
  - a quiet grey `adt-icon-btn` reset with `icon-[material-symbols--restart-alt-rounded]`
  - notes as `AppAlert compact variant="warning"`
  - no new blue buttons
- **Icons** are literal `icon-[material-symbols--…]` strings: `volume-up-outline-rounded`, `volume-down-outline-rounded`, `volume-off-outline-rounded`, `restart-alt-rounded` (all checked present).
- **Browser:**
  - Only the yarn dev Chrome (CDP :9222), in a background tab of my own. The user's tab is on `/tools`; never navigate, reload or close it.
  - Before every batch of source edits, check `:9222/json/list` for a `/matches/` tab, and park my own tab at `about:blank`.
  - Never reload the extension.
  - Put back `adt:last-visited-url`, `adt:active-tab` and `urlstatus` if a test tab changes them.
- **The user's config is real data:** back up storage first (`sw.mjs backup`), restore it afterwards (`sw.mjs restore`), and compare with `canonicalJson`-style key-sorted JSON.
- **Code style:** template-first SFCs. Attribute order: events, directives, bound props alphabetical, then static props alphabetical. Imports: sibling, then `type`, then `@/` aliases, with blank lines between groups. No manual imports of auto-imported Vue APIs in SFCs; composables and utils import from `vue` / `@vueuse/core` explicitly, as `useTTS.ts` does.
- **Checks:** `yarn compile` baseline is 14 errors (none may be added, none in touched lines). ESLint on touched files, comparing with `git show HEAD:f | npx eslint --stdin`. `yarn build` must pass. SFCs are compiled with `sfc-check.cjs` after every `.vue` edit.
- **Commits:** on `main`, local only, never pushed. The plan goes in one `docs:` commit, the feature in one `feat:` commit after the review, with `Closes #253`.

## Review Focus

1. **Stopping every sound while a copy is still being made** (a dart corrected right after a bull at 150%): nothing may play once stopped.
   - Pinned in Task 2 (the harness: `forget()` during an in-flight copy resolves null).
   - Pinned in Task 3 (the `laneHolder` re-check, and a live check that a correction silences a sound playing from a copy).
2. **A pool element reused after a quieter sound:** a 100% sound on an element last used at 50% must play at full volume. Pinned in Task 3 (a 50% dart, then a 100% dart; both recorded volumes checked).
3. **A link that cannot be read, set above 100%** (the default *gameshot* on myinstants.com): it plays as it is at volume 1, never silence, and costs one failed fetch per page, not one per dart.
   - Pinned in Task 2 (failure cached: one fetch for two calls).
   - Pinned in Task 3 (the recorded play).
   - Pinned in Task 4 (the editor's note).
4. **A stored value out of range or of the wrong type** (an imported or hand-edited 250, −10, "150", or 150 on a TTS sound): clamped, never thrown from `element.volume`. Pinned in Task 1 (`soundVolume` cases). Both engines take the volume through `soundVolume` when queueing.
5. **Editing a sound keeps its volume, and 100% removes the field.** Changing only a 150% sound's name keeps 150. Setting it back to 100% leaves no `volume` key in storage. Pinned in Task 4.

---

### Task 1: Volume logic and the WAV encoder

**Files:**
- Create: `utils/sound-volume.ts`
- Modify: `utils/storage.ts` (the `ISound` interface, lines 238–246)
- Test: `$SCRATCH/test-sound-volume.mts` (outside the repo; there is no test framework)

`$SCRATCH` is `/private/tmp/claude-501/-Volumes-WD-BLACK-PROJECTS-Autodarts-autodarts-tools-wxt/04990c63-662c-4fa0-b256-d9999c228f00/scratchpad`.

**Interfaces:**
- Produces:
  - `DEFAULT_VOLUME = 100`, `MAX_VOLUME = 200`, `MAX_TTS_VOLUME = 100`, `VOLUME_STEP = 5`
  - `soundVolume(sound: Pick<ISound, "volume" | "tts">): number`
  - `type VolumePlan = { kind: "silent" } | { kind: "element"; volume: number } | { kind: "copy"; percent: number }`
  - `planVolume(percent: number, elementVolumeWorks: boolean): VolumePlan`
  - `cappedVolume(percent: number): number` (0–1, for speech and for a copy that failed)
  - `isLink(source: string): boolean`
  - `encodeWav(channels: Float32Array[], sampleRate: number, gain: number): ArrayBuffer`
  - `ISound.volume?: number`

- [ ] **Step 1: Write the failing test**

`$SCRATCH/test-sound-volume.mts`:

```ts
import assert from "node:assert/strict";

import {
  DEFAULT_VOLUME,
  MAX_TTS_VOLUME,
  MAX_VOLUME,
  VOLUME_STEP,
  cappedVolume,
  encodeWav,
  isLink,
  planVolume,
  soundVolume,
} from "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/utils/sound-volume.ts";

const tts = { text: "One hundred and eighty", voiceURI: "", lang: "", rate: 1, pitch: 1 };

assert.deepEqual([ DEFAULT_VOLUME, MAX_VOLUME, MAX_TTS_VOLUME, VOLUME_STEP ], [ 100, 200, 100, 5 ]);

// soundVolume: what a stored value plays at
assert.equal(soundVolume({}), 100, "missing");
assert.equal(soundVolume({ volume: undefined }), 100, "undefined");
assert.equal(soundVolume({ volume: 150 }), 150);
assert.equal(soundVolume({ volume: 0 }), 0);
assert.equal(soundVolume({ volume: 250 }), 200, "above the range");
assert.equal(soundVolume({ volume: -10 }), 0, "below the range");
assert.equal(soundVolume({ volume: 72.6 }), 73, "whole percent");
assert.equal(soundVolume({ volume: Number.NaN }), 100, "NaN");
assert.equal(soundVolume({ volume: Number.POSITIVE_INFINITY }), 100, "Infinity");
assert.equal(soundVolume({ volume: "150" as unknown as number }), 100, "a string");
assert.equal(soundVolume({ volume: null as unknown as number }), 100, "null");
assert.equal(soundVolume({ volume: 150, tts }), 100, "speech stops at 100");
assert.equal(soundVolume({ volume: 60, tts }), 60);
assert.equal(soundVolume({ tts }), 100);

// planVolume: how a volume is reached
assert.deepEqual(planVolume(0, true), { kind: "silent" });
assert.deepEqual(planVolume(0, false), { kind: "silent" });
assert.deepEqual(planVolume(-5, true), { kind: "silent" });
assert.deepEqual(planVolume(100, true), { kind: "element", volume: 1 });
assert.deepEqual(planVolume(100, false), { kind: "element", volume: 1 });
assert.deepEqual(planVolume(50, true), { kind: "element", volume: 0.5 });
assert.deepEqual(planVolume(50, false), { kind: "copy", percent: 50 }, "iOS turns down by copy");
assert.deepEqual(planVolume(150, true), { kind: "copy", percent: 150 });
assert.deepEqual(planVolume(200, false), { kind: "copy", percent: 200 });
assert.deepEqual(planVolume(Number.NaN, true), { kind: "element", volume: 1 }, "junk plays as the file");

// cappedVolume
assert.equal(cappedVolume(150), 1);
assert.equal(cappedVolume(40), 0.4);
assert.equal(cappedVolume(0), 0);
assert.equal(cappedVolume(-3), 0);

// isLink
assert.equal(isLink("https://autodarts.x10.mx/beep_2_bullseye.mp3"), true);
assert.equal(isLink("HTTP://example.com/a.mp3"), true);
assert.equal(isLink("data:audio/mpeg;base64,SUQz"), false);
assert.equal(isLink("SUQzBAAAAAAA"), false, "bare base64 from an old config");

// encodeWav: header
const left = new Float32Array([ 0, 0.25, -0.25, 0.6, -0.6 ]);
const right = new Float32Array([ 0.5, -0.5, 1, -1, 0 ]);
const wav = new DataView(encodeWav([ left, right ], 44100, 2));
const text = (offset: number, length: number) => String.fromCharCode(...new Uint8Array(wav.buffer, offset, length));
assert.equal(wav.byteLength, 44 + 5 * 2 * 2);
assert.equal(text(0, 4), "RIFF");
assert.equal(wav.getUint32(4, true), 36 + 20);
assert.equal(text(8, 4), "WAVE");
assert.equal(text(12, 4), "fmt ");
assert.equal(wav.getUint32(16, true), 16, "fmt chunk size");
assert.equal(wav.getUint16(20, true), 1, "PCM");
assert.equal(wav.getUint16(22, true), 2, "channels");
assert.equal(wav.getUint32(24, true), 44100, "sample rate");
assert.equal(wav.getUint32(28, true), 44100 * 4, "byte rate");
assert.equal(wav.getUint16(32, true), 4, "block align");
assert.equal(wav.getUint16(34, true), 16, "bits");
assert.equal(text(36, 4), "data");
assert.equal(wav.getUint32(40, true), 20, "data size");

// encodeWav: samples interleaved L R, doubled, clipped at full scale
const samples = Array.from({ length: 10 }, (_, i) => wav.getInt16(44 + i * 2, true));
assert.deepEqual(samples, [
  0, 32767, // 0, 0.5 × 2 = 1
  16384, -32768, // 0.25 × 2 = 0.5, −0.5 × 2 = −1
  -16384, 32767, // −0.5, 2 clipped to 1
  32767, -32768, // 1.2 clipped, −2 clipped
  -32768, 0, // −1.2 clipped, 0
]);

// encodeWav: gain 1 and 0.5, mono, empty
const mono = new DataView(encodeWav([ new Float32Array([ 0.5, -0.5, 1 ]) ], 22050, 1));
assert.equal(mono.getUint16(22, true), 1);
assert.equal(mono.getUint32(24, true), 22050);
assert.deepEqual([ 0, 1, 2 ].map(i => mono.getInt16(44 + i * 2, true)), [ 16384, -16384, 32767 ]);
const half = new DataView(encodeWav([ new Float32Array([ 1, -1 ]) ], 44100, 0.5));
assert.deepEqual([ 0, 1 ].map(i => half.getInt16(44 + i * 2, true)), [ 16384, -16384 ]);
const empty = new DataView(encodeWav([], 44100, 1));
assert.equal(empty.byteLength, 44);
assert.equal(empty.getUint16(22, true), 1, "an empty file still says one channel");

console.log("sound-volume: all assertions passed");
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd $SCRATCH && /Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/node_modules/.bin/tsx test-sound-volume.mts`
Expected: FAIL. It cannot find the module `utils/sound-volume.ts`.

- [ ] **Step 3: Implement `utils/sound-volume.ts`**

```ts
import type { ISound } from "@/utils/storage";

/**
 * How loud a Caller or Sound FX sound plays, as a percentage of its file.
 *
 * 100 is the file as it is, and the default: a sound saved before volumes
 * existed has none and plays at 100. Text to speech stops at 100, because a
 * voice can be turned down but nothing a page does makes it louder. See
 * docs/superpowers/specs/2026-09-26-per-sound-volume-design.md.
 */
export const DEFAULT_VOLUME = 100;
export const MAX_VOLUME = 200;
export const MAX_TTS_VOLUME = 100;
export const VOLUME_STEP = 5;

/**
 * The volume a sound plays at: what it stores, whole and inside its range, or
 * 100 when it stores nothing usable. A config can come from an import or be
 * edited by hand, so anything may be in there.
 */
export function soundVolume(sound: Pick<ISound, "volume" | "tts">): number {
  const { volume } = sound;
  if (typeof volume !== "number" || !Number.isFinite(volume)) return DEFAULT_VOLUME;
  const max = sound.tts ? MAX_TTS_VOLUME : MAX_VOLUME;
  return Math.min(max, Math.max(0, Math.round(volume)));
}

/**
 * How a sound gets to its volume.
 *
 * - `silent`: 0%, nothing plays.
 * - `element`: the <audio> element's own volume does it (1 at 100%).
 * - `copy`: a copy of the file made at that volume (utils/sound-copies.ts).
 *   That is how anything above 100% plays, since an element goes no louder than its file,
 *   and anything below it where the browser keeps elements at full volume, as iOS does.
 */
export type VolumePlan =
  | { kind: "silent" }
  | { kind: "element"; volume: number }
  | { kind: "copy"; percent: number };

export function planVolume(percent: number, elementVolumeWorks: boolean): VolumePlan {
  if (!Number.isFinite(percent)) return { kind: "element", volume: 1 };
  if (percent <= 0) return { kind: "silent" };
  if (percent === DEFAULT_VOLUME) return { kind: "element", volume: 1 };
  if (percent < DEFAULT_VOLUME && elementVolumeWorks) return { kind: "element", volume: percent / 100 };
  return { kind: "copy", percent };
}

/**
 * The 0–1 volume a percentage gives where nothing can go louder than the file
 * or voice itself: speech, and a sound whose copy could not be made.
 */
export function cappedVolume(percent: number): number {
  return Math.min(1, Math.max(0, percent / 100));
}

/** Whether a sound's source is a link, rather than its file as a data: URL (or, in old configs, bare base64). */
export function isLink(source: string): boolean {
  return /^https?:\/\//i.test(source);
}

/**
 * A 16-bit PCM WAV file of `channels`, one array per channel, every sample
 * multiplied by `gain` and clipped at full scale. WAV wants the channels
 * interleaved, one frame after another.
 */
export function encodeWav(channels: Float32Array[], sampleRate: number, gain: number): ArrayBuffer {
  const channelCount = Math.max(1, channels.length);
  const frames = channels[0]?.length ?? 0;
  const dataSize = frames * channelCount * 2;
  const view = new DataView(new ArrayBuffer(44 + dataSize));
  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };

  text(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channelCount * 2, true); // bytes per second
  view.setUint16(32, channelCount * 2, true); // bytes per frame
  view.setUint16(34, 16, true); // bits per sample
  text(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let frame = 0; frame < frames; frame++) {
    for (let channel = 0; channel < channelCount; channel++) {
      const sample = Math.max(-1, Math.min(1, (channels[channel]?.[frame] ?? 0) * gain));
      view.setInt16(offset, Math.round(sample < 0 ? sample * 0x8000 : sample * 0x7FFF), true);
      offset += 2;
    }
  }
  return view.buffer;
}
```

- [ ] **Step 4: Add the field to `ISound` in `utils/storage.ts`**

```ts
export interface ISound {
  name: string;
  url: string;
  base64: string;
  enabled: boolean;
  triggers: string[];
  soundId?: string;
  tts?: ISoundTTS;
  /**
   * How loud it plays, as a percentage of its file: 0–200, or 0–100 for text
   * to speech. Missing is 100, so every sound saved before this plays as it
   * always has; it is only stored when it is something else. Read it through
   * soundVolume in utils/sound-volume.ts, never directly.
   */
  volume?: number;
}
```

- [ ] **Step 5: Run the test to see it pass**

Run: `cd $SCRATCH && /Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/node_modules/.bin/tsx test-sound-volume.mts`
Expected: `sound-volume: all assertions passed`

- [ ] **Step 6: Lint**

Run: `npx eslint utils/sound-volume.ts utils/storage.ts -f unix`. The new file comes out clean. For `storage.ts`, compare with `git show HEAD:utils/storage.ts | npx eslint --stdin --stdin-filename utils/storage.ts -f unix`.

- [ ] **Step 7: Checkpoint.** Run `git status --short`; no commit yet.

---

### Task 2: Copies at another volume

**Files:**
- Create: `utils/sound-copies.ts`
- Test: a browser harness in `$SCRATCH/copies-harness/`:
  - `build.mjs`, `stub-helpers.ts`, `test.ts`, `server.mjs`, `run.mjs`
  - `public/fx/`: the Sound FX files downloaded to `$SCRATCH/fx`, plus a text file

**Interfaces:**
- Consumes: `encodeWav`, `planVolume`, `soundVolume`, `isLink` from Task 1; `backgroundFetch(url)` from `@/utils/helpers`, which resolves `{ ok, data?: "data:…" }`.
- Produces:
  - `elementVolumeWorks(): boolean`
  - `interface SoundCopies { copyAt(source: string, percent: number): Promise<string | null>; readable(url: string): Promise<boolean>; prepare(sounds: ISound[], sourceOf: (sound: ISound) => Promise<string | undefined>): Promise<number>; forget(): void }`
  - `soundCopies(): SoundCopies`

- [ ] **Step 1: Write the harness and the failing test**

`$SCRATCH/copies-harness/stub-helpers.ts` stands in for the relay. It fetches from the harness's own server, counts calls per URL, and answers as `backgroundFetch` does:

```ts
export const calls = new Map<string, number>();

export async function backgroundFetch(url: string): Promise<{ ok: boolean; status?: number; data?: string; error?: string }> {
  calls.set(url, (calls.get(url) ?? 0) + 1);
  try {
    const response = await fetch(url);
    if (!response.ok) return { ok: false, status: response.status };
    const blob = await response.blob();
    const data = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
    return { ok: true, status: response.status, data };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}
```

`$SCRATCH/copies-harness/test.ts`:

```ts
import { encodeWav } from "@/utils/sound-volume";
import { elementVolumeWorks, soundCopies } from "@/utils/sound-copies";

import { calls } from "./stub-helpers";

const results: Record<string, unknown> = {};
const check = (name: string, ok: boolean, detail?: unknown) => { results[name] = ok ? "ok" : { failed: detail ?? false }; };

const BASE = location.origin;
const bull = `${BASE}/fx/beep_2_bullseye.mp3`;
const t20 = `${BASE}/fx/beep_2_20.wav`;
const t19 = `${BASE}/fx/beep_2_19.wav`;
const t18 = `${BASE}/fx/beep_2_18.wav`;
const missing = `${BASE}/fx/missing.mp3`;
const notAudio = `${BASE}/fx/not-audio.txt`;

const decoder = new OfflineAudioContext(1, 1, 44100);
async function measure(url: string) {
  const audio = await decoder.decodeAudioData(await (await fetch(url)).arrayBuffer());
  let peak = 0;
  for (let c = 0; c < audio.numberOfChannels; c++) for (const v of audio.getChannelData(c)) peak = Math.max(peak, Math.abs(v));
  return { peak, frames: audio.length, channels: audio.numberOfChannels };
}
async function dataUrl(url: string) {
  const blob = await (await fetch(url)).blob();
  return new Promise<string>((resolve) => { const r = new FileReader(); r.onload = () => resolve(r.result as string); r.readAsDataURL(blob); });
}

(async () => {
  try {
    check("element volume works in Chrome", elementVolumeWorks() === true);
    const copies = soundCopies();

    const original = await measure(bull);
    const louder = await copies.copyAt(bull, 150);
    check("a link at 150% gives a blob: URL", typeof louder === "string" && louder.startsWith("blob:"), louder);
    const copy = await measure(louder!);
    check("the copy is 1.5× the original's peak", Math.abs(copy.peak / original.peak - 1.5) < 0.005, { original: original.peak, copy: copy.peak });
    check("the copy keeps length and channels", copy.frames === original.frames && copy.channels === original.channels, { original, copy });

    check("the same copy twice is the same URL", (await copies.copyAt(bull, 150)) === louder);
    const twice = await copies.copyAt(bull, 200);
    check("another volume is another copy", !!twice && twice !== louder);
    check("a link is fetched once for both", calls.get(bull) === 1, calls.get(bull));

    const t20File = await dataUrl(t20);
    const t20Original = await measure(t20);
    const quieter = await copies.copyAt(t20File, 50);
    check("a data: URL at 50% is half the peak", !!quieter && Math.abs((await measure(quieter)).peak / t20Original.peak - 0.5) < 0.005);
    const clipped = await copies.copyAt(t20File, 200);
    check("200% of a loud file clips at full scale", !!clipped && (await measure(clipped)).peak <= 1 && (await measure(clipped)).peak > 0.999);

    check("an unreadable link gives no copy", (await copies.copyAt(missing, 150)) === null);
    check("and stays that way without fetching again", (await copies.copyAt(missing, 150)) === null && calls.get(missing) === 1, calls.get(missing));
    check("a file that is not audio gives no copy", (await copies.copyAt(notAudio, 150)) === null);
    check("readable: a real link", (await copies.readable(bull)) === true);
    check("readable: a missing one", (await copies.readable(missing)) === false);

    const inFlight = copies.copyAt(t19, 150);
    const made = louder!;
    copies.forget();
    check("a copy still being made when forgotten comes to nothing", (await inFlight) === null);
    check("forgetting revokes what was made", await fetch(made).then(() => false, () => true));
    check("after forgetting, copies are made again", !!(await copies.copyAt(bull, 150)) && calls.get(bull) === 2, calls.get(bull));

    const fresh = soundCopies();
    const sounds = [
      { name: "bull", url: bull, base64: "", enabled: true, triggers: [], volume: 150 },
      { name: "off", url: t20, base64: "", enabled: false, triggers: [], volume: 150 },
      { name: "quieter", url: t19, base64: "", enabled: true, triggers: [], volume: 50 },
      { name: "speech", url: "", base64: "", enabled: true, triggers: [], volume: 150, tts: { text: "x", voiceURI: "", lang: "", rate: 1, pitch: 1 } },
      { name: "as is", url: t18, base64: "", enabled: true, triggers: [] },
    ];
    const before = calls.get(bull) ?? 0;
    check("prepare makes only the copies needed", (await fresh.prepare(sounds, async sound => sound.url || sound.base64 || undefined)) === 1);
    check("prepare fetched the link it needed", calls.get(bull) === before + 1 && !calls.has(t18), { bull: calls.get(bull), t18: calls.get(t18) });

    const tiny = (value: number) => {
      const bytes = new Uint8Array(encodeWav([ new Float32Array([ value, 0 ]) ], 44100, 1));
      return `data:audio/wav;base64,${btoa(String.fromCharCode(...bytes))}`;
    };
    const many = Array.from({ length: 40 }, (_, i) => ({ name: `s${i}`, url: "", base64: tiny((i + 1) / 100), enabled: true, triggers: [], volume: 150 }));
    check("prepare stops at 32", (await soundCopies().prepare(many, async sound => sound.base64)) === 32);

    const stopping = soundCopies();
    const run = stopping.prepare(many, async sound => sound.base64);
    stopping.forget();
    check("prepare stops when forgotten", (await run) < 32, await run);
  } catch (error) {
    results.crashed = String((error as Error)?.stack ?? error);
  }
  (window as any).__results = results;
})();
```

`$SCRATCH/copies-harness/build.mjs` bundles `test.ts` with esbuild. `@/utils/helpers` goes to the stub and every other `@/…` to the repo:

```js
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire("/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/package.json");
const { build } = require("esbuild");
const DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO = "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt";

await build({
  entryPoints: [ path.join(DIR, "test.ts") ],
  bundle: true,
  format: "esm",
  outfile: path.join(DIR, "public/test.js"),
  plugins: [ {
    name: "paths",
    setup(b) {
      b.onResolve({ filter: /^@\/utils\/helpers$/ }, () => ({ path: path.join(DIR, "stub-helpers.ts") }));
      b.onResolve({ filter: /^@\// }, args => ({ path: `${path.join(REPO, args.path.slice(2))}.ts` }));
    },
  } ],
});
console.log("built");
```

`$SCRATCH/copies-harness/server.mjs` serves `public/` on 127.0.0.1:4777 (`.mp3` → `audio/mpeg`, `.wav` → `audio/wav`, `.js` → `text/javascript`, `.html`, `.txt`; 404 otherwise). `public/index.html` is `<script type="module" src="test.js"></script>`.

`$SCRATCH/copies-harness/run.mjs`:
1. Starts the server.
2. With `cdp.mjs`, opens `http://127.0.0.1:4777/` in a background target.
3. Polls `window.__results` for up to 20 s, prints it, and exits 1 if any value is not `"ok"`.
4. Closes the target.

- [ ] **Step 2: Run it to see it fail**

Run: `cd $SCRATCH/copies-harness && node build.mjs`
Expected: FAIL. esbuild cannot resolve `utils/sound-copies.ts`.

- [ ] **Step 3: Implement `utils/sound-copies.ts`**

```ts
import type { ISound } from "@/utils/storage";

import { backgroundFetch } from "@/utils/helpers";
import { encodeWav, isLink, planVolume, soundVolume } from "@/utils/sound-volume";

/**
 * Copies of Caller and Sound FX sounds at volumes their files do not have.
 *
 * An <audio> element plays at most as loud as its file, and on iOS no quieter
 * either. So a sound set above 100% (or below it, where the element cannot
 * follow) plays from a copy: the file decoded, every sample multiplied, and
 * written out again as a WAV. The copy then goes through the same audio
 * elements, queues and unlocking as any other sound, so nothing about how
 * sounds play changes.
 *
 * Web Audio on the element was the other way to do it, and it was turned down:
 *
 * - A linked file from a site without CORS goes silent through it.
 * - On iOS it obeys the silent switch.
 * - It needs a gesture of its own.
 *
 * See docs/superpowers/specs/2026-09-26-per-sound-volume-design.md.
 */

/** The rate copies are decoded and written at: most sound files' own, so they are rarely resampled. */
const SAMPLE_RATE = 44100;

/** How many copies an engine makes as it starts. Any beyond are made the first time they play. */
const PREPARE_LIMIT = 32;

let honoured: boolean | undefined;

/**
 * Whether a page can turn an <audio> element down here. iOS and iPadOS do not
 * let it: the volume stays 1 whatever is set, and reads back as 1.
 */
export function elementVolumeWorks(): boolean {
  if (honoured === undefined) {
    try {
      const probe = new Audio();
      probe.volume = 0.5;
      honoured = probe.volume === 0.5;
    } catch {
      honoured = false;
    }
  }
  return honoured;
}

let context: BaseAudioContext | undefined;

/** Decodes a sound file to samples at SAMPLE_RATE. The callbacks work in old engines as well as new ones. */
function decode(bytes: ArrayBuffer): Promise<AudioBuffer> {
  if (!context) {
    const Offline: typeof OfflineAudioContext = window.OfflineAudioContext ?? (window as any).webkitOfflineAudioContext;
    context = new Offline(1, 1, SAMPLE_RATE);
  }
  const decoder = context;
  return new Promise((resolve, reject) => {
    // Newer engines also return a promise, rejected with what the callback gets.
    decoder.decodeAudioData(bytes, resolve, reject)?.catch?.(() => {});
  });
}

/** The bytes of a data: URL, or of bare base64. */
function bytesOf(file: string): ArrayBuffer {
  const binary = atob(file.slice(file.indexOf(",") + 1).replace(/\s+/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export interface SoundCopies {
  /**
   * A blob: URL of `source` (a link, or the file as a data: URL) at `percent`,
   * made once and then kept. null when no copy can be made: a link the
   * extension cannot read, or a file the browser cannot decode.
   */
  copyAt(source: string, percent: number): Promise<string | null>;
  /** Whether a link's file can be read and decoded, which a copy of it needs. */
  readable(url: string): Promise<boolean>;
  /**
   * Makes, one after another, the copies the enabled sounds will need, so the
   * first dart on one does not wait for its file. `sourceOf` finds the file the
   * engine itself would play. Resolves with how many it tried.
   */
  prepare(sounds: ISound[], sourceOf: (sound: ISound) => Promise<string | undefined>): Promise<number>;
  /** Revokes every copy. One still being made is dropped when it is done. */
  forget(): void;
}

export function soundCopies(): SoundCopies {
  /** A link's file, as a data: URL, or null when it cannot be read. Each link is fetched once. */
  let links = new Map<string, Promise<string | null>>();
  /** Copies by source, then by volume. */
  let copies = new Map<string, Map<number, Promise<string | null>>>();
  const made: string[] = [];
  /** Bumped by forget(), so work started before it is dropped. */
  let generation = 0;

  function fileOf(source: string): Promise<string | null> {
    if (!isLink(source)) return Promise.resolve(source);
    let file = links.get(source);
    if (!file) {
      file = backgroundFetch(source)
        .then(response => (response.ok && response.data?.startsWith("data:") ? response.data : null))
        .catch(() => null);
      links.set(source, file);
    }
    return file;
  }

  async function decoded(source: string): Promise<AudioBuffer | null> {
    const file = await fileOf(source);
    if (!file) return null;
    try {
      return await decode(bytesOf(file));
    } catch (error) {
      console.warn("Autodarts Tools: A sound could not be decoded to change its volume", error);
      return null;
    }
  }

  async function make(source: string, percent: number, started: number): Promise<string | null> {
    const audio = await decoded(source);
    if (!audio || started !== generation) return null;
    const channels = Array.from({ length: audio.numberOfChannels }, (_, i) => audio.getChannelData(i));
    const wav = encodeWav(channels, audio.sampleRate, percent / 100);
    if (started !== generation) return null;
    const url = URL.createObjectURL(new Blob([ wav ], { type: "audio/wav" }));
    made.push(url);
    return url;
  }

  const self: SoundCopies = {
    copyAt(source, percent) {
      let atVolume = copies.get(source);
      if (!atVolume) {
        atVolume = new Map();
        copies.set(source, atVolume);
      }
      let copy = atVolume.get(percent);
      if (!copy) {
        copy = make(source, percent, generation);
        atVolume.set(percent, copy);
      }
      return copy;
    },

    async readable(url) {
      return (await decoded(url)) !== null;
    },

    async prepare(sounds, sourceOf) {
      const started = generation;
      const works = elementVolumeWorks();
      const needed = sounds.filter(sound => sound.enabled && !sound.tts && planVolume(soundVolume(sound), works).kind === "copy");
      let tried = 0;
      for (const sound of needed.slice(0, PREPARE_LIMIT)) {
        if (started !== generation) break;
        tried++;
        try {
          const source = await sourceOf(sound);
          if (source && started === generation) await self.copyAt(source, soundVolume(sound));
        } catch (error) {
          console.warn("Autodarts Tools: A sound could not be prepared at its volume", error);
        }
      }
      return tried;
    },

    forget() {
      generation++;
      for (const url of made) URL.revokeObjectURL(url);
      made.length = 0;
      links = new Map();
      copies = new Map();
    },
  };
  return self;
}
```

- [ ] **Step 4: Run the harness to see it pass**

Run: `cd $SCRATCH/copies-harness && node build.mjs && node run.mjs`
Expected: every entry `"ok"`, exit 0.

- [ ] **Step 5: Lint** `utils/sound-copies.ts`. A new file, so it should come out clean.

- [ ] **Step 6: Checkpoint.** `git status --short`.

---

### Task 3: The engines play at each sound's volume

**Files:**
- Modify: `entrypoints/match.content/caller.ts`
- Modify: `entrypoints/match.content/sound-fx.ts`
- Test: `$SCRATCH/engine-test.mjs`, a bot match in a tab of my own.

**Interfaces:**
- Consumes:
  - `DEFAULT_VOLUME`, `cappedVolume`, `isLink`, `planVolume`, `soundVolume` (Task 1)
  - `elementVolumeWorks`, `soundCopies` (Task 2)
- Produces: queue entries typed `QueuedSound` with `volume?: number`, in both files.

Before editing: `curl -s :9222/json/list`. If any tab is on `/matches/`, stage the edits in `$SCRATCH/stage/` and copy them in once it leaves.

- [ ] **Step 1: `caller.ts`, the queue carries the volume**

- Imports, after `settleGameData`:

  ```ts
  import { elementVolumeWorks, soundCopies } from "@/utils/sound-copies";
  import { DEFAULT_VOLUME, cappedVolume, isLink, planVolume, soundVolume } from "@/utils/sound-volume";
  ```

- The queue type, in place of the inline type on line 16:

  ```ts
  /** A sound waiting its turn, and the volume it plays at (utils/sound-volume.ts). */
  interface QueuedSound { url?: string; base64?: string; name?: string; soundId?: string; tts?: ISoundTTS; volume?: number }
  // Queue for sounds to be played
  const soundQueue: QueuedSound[] = [];
  ```

- After `blobUrlsToRevoke`:

  ```ts
  // Copies of sounds at volumes their files don't have — see utils/sound-copies.ts
  const copies = soundCopies();
  ```

- In each of the five `soundQueue.push({ … })` literals, add a line after `name: X.name,`, where `X` is the variable the literal reads (`soundToPlay` or `numberSoundToPlay`):

  ```ts
  volume: soundVolume(X),
  ```

- [ ] **Step 2: `caller.ts`, playing at the volume**

- In `caller()`, after `initAudioPlayer();`:

  ```ts
      // Copies of the sounds set to volumes their files don't have, made before they are needed
      void copies.prepare(config.caller?.sounds ?? [], sourceOf);
  ```

- In `callerOnRemove()`, before the blob URL revocation:

  ```ts
    // Drop the copies made at other volumes
    copies.forget();
  ```

- In `playNextSound()`, replace the part from `// Handle TTS sounds` down to just before `// Try to load from IndexedDB first` with:

  ```ts
      const percent = nextSound.volume ?? DEFAULT_VOLUME;
      const plan = planVolume(percent, elementVolumeWorks());

      // Turned all the way down: nothing plays, and nothing behind it waits
      if (plan.kind === "silent") {
        releaseLane();
        return;
      }

      // Handle TTS sounds
      if (nextSound.tts) {
        playTTSSound(nextSound.tts, percent);
        return;
      }

      // A volume the file doesn't have plays from a copy made at that volume
      if (plan.kind === "copy") {
        await playCopy(nextSound, percent);
        return;
      }
  ```

- In the rest of `playNextSound()`:
  - Both `playBase64Sound(base64Data)` / `playBase64Sound(nextSound.base64)` calls get `, plan.volume`.
  - In the URL branch, put `audioElement.volume = plan.volume;` on the line before `audioElement.src = nextSound.url;`.

- `playTTSSound(tts: ISoundTTS, percent: number = DEFAULT_VOLUME)`: after `utterance.pitch = tts.pitch;`, add

  ```ts
    // Speech can be turned down, never up
    utterance.volume = cappedVolume(percent);
  ```

- `playBase64Sound(base64Data: string, volume: number = 1)`: put `audioElement.volume = volume;` on the line before `audioElement.src = audioUrl;`.

- New functions, after `playNextSound`:

```ts
/** The file a sound plays from, found as the queue finds it: its upload in IndexedDB, then the config's copy, then its link. */
async function sourceOf(sound: { url?: string; base64?: string; soundId?: string }): Promise<string | undefined> {
  if (sound.soundId && isIndexedDBAvailable()) {
    try {
      const stored = await getSoundFromIndexedDB(sound.soundId);
      if (stored) return stored;
    } catch (error) {
      console.error("Autodarts Tools: Error loading sound from IndexedDB", error);
    }
  }
  return sound.base64 || sound.url || undefined;
}

/**
 * Plays a sound at a volume its file doesn't have, from a copy made at that
 * volume. The copy is made while the sound holds the lane, as an IndexedDB
 * read would be; if the lane is given up in the meantime (the watchdog, or
 * every sound being stopped) the sound is dropped rather than played late.
 * Without a copy it plays the file as it is, as loud as the element goes.
 */
async function playCopy(sound: QueuedSound, percent: number): Promise<void> {
  const audioElement = takeAudioElement();
  if (!audioElement) {
    console.error("Autodarts Tools: Audio element not found in pool");
    releaseLane();
    return;
  }
  holdLane(audioElement);
  audioElement.pause();

  const source = await sourceOf(sound);
  const copy = source ? await copies.copyAt(source, percent) : null;
  if (laneHolder !== audioElement) return;

  if (!source) {
    console.error("Autodarts Tools: Sound has neither URL, base64 data, nor soundId");
    releaseLane();
    return;
  }

  if (copy) {
    startOnElement(audioElement, copy, 1);
  } else if (isLink(source)) {
    startOnElement(audioElement, source, cappedVolume(percent));
  } else {
    const blobUrl = createAudioBlobUrl(source);
    if (!blobUrl) {
      releaseLane();
      return;
    }
    blobUrlsToRevoke.push(blobUrl);
    startOnElement(audioElement, blobUrl, cappedVolume(percent), blobUrl);
  }
}

/** Plays `src` on the pool element holding the lane. `blobUrl` is revoked if it fails to play. */
function startOnElement(audioElement: HTMLAudioElement, src: string, volume: number, blobUrl?: string): void {
  audioElement.volume = volume;
  audioElement.src = src;
  audioElement.play()
    .then(() => {
      console.log("Autodarts Tools: Sound playing at its volume");
      releaseLaneIfLongSound(audioElement);
    })
    .catch((error) => {
      console.error("Autodarts Tools: Error playing a sound at its volume", error);
      if (isAutoplayBlocked(error)) {
        showInteractionNotification();
        unlockAudio();
      }
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        const index = blobUrlsToRevoke.indexOf(blobUrl);
        if (index > -1) blobUrlsToRevoke.splice(index, 1);
      }
      // Only a lane this sound still holds: another may have it by now
      if (laneHolder === audioElement) releaseLane();
    });
}
```

- [ ] **Step 3: `sound-fx.ts`, the queue carries the volume**

- Imports, after `settleGameData`:

  ```ts
  import { elementVolumeWorks, soundCopies } from "@/utils/sound-copies";
  import { DEFAULT_VOLUME, cappedVolume, isLink, planVolume, soundVolume } from "@/utils/sound-volume";
  ```

- Replace the two inline queue types (lines 21–22):

  ```ts
  /** A sound waiting its turn, and the volume it plays at (utils/sound-volume.ts). */
  interface QueuedSound { url?: string; base64?: string; name?: string; soundId?: string; tts?: ISoundTTS; volume?: number }
  // Queue for sounds to be played
  const soundQueue: QueuedSound[] = [];
  const soundQueue2: QueuedSound[] = [];
  ```

- After `blobUrlsToRevoke`:

  ```ts
  // Copies of sounds at volumes their files don't have — see utils/sound-copies.ts
  const copies = soundCopies();
  ```

- In each of the eighteen `soundQueue.push` / `soundQueue2.push` literals, add a line after `name: X.name,`:

  ```ts
  volume: soundVolume(X),
  ```

  `X` is the variable the literal reads: `soundToPlay`, `tripleSoundToPlay`, `wordSoundToPlay` or `numberSoundToPlay`.

- `playWithAvailableSource`'s parameter type becomes `nextSound: QueuedSound`.

- [ ] **Step 4: `sound-fx.ts`, playing at the volume**

- In `soundFx()`, after `initAudioPlayer();`:

  ```ts
      // Copies of the sounds set to volumes their files don't have, made before they are needed
      void copies.prepare(config.soundFx?.sounds ?? [], sourceOf);
  ```

- In `soundFxOnRemove()`, before the blob URL revocation:

  ```ts
    // Drop the copies made at other volumes
    copies.forget();
  ```

- In `playNextSound(channel)`, in **both** channel branches:
  - After the "neither URL, base64 data, soundId, nor TTS" check, and before `// Handle TTS sounds on channel N`:

    ```ts
        const percent = nextSound.volume ?? DEFAULT_VOLUME;

        // Turned all the way down: nothing plays, and nothing behind it waits
        if (planVolume(percent, elementVolumeWorks()).kind === "silent") {
          playNextSound(N);
          return;
        }
    ```

  - `playTTSSound(nextSound.tts, N)` becomes `playTTSSound(nextSound.tts, N, percent)`.
  - `playWithAvailableSource(nextSound, audioElement, N);` becomes `playAtVolume(nextSound, audioElement, N, percent);`, with the comment updated to `// Play based on available source (URL, IndexedDB, or base64), at its volume`.

- `playTTSSound(tts: ISoundTTS, channel: number, percent: number = DEFAULT_VOLUME)`: after `utterance.pitch = tts.pitch;`:

  ```ts
    // Speech can be turned down, never up
    utterance.volume = cappedVolume(percent);
  ```

- New functions, before `playWithAvailableSource`:

```ts
/** The file a sound plays from, found as playWithAvailableSource finds it: its link, then its upload in IndexedDB, then the config's copy. */
async function sourceOf(sound: { url?: string; base64?: string; soundId?: string }): Promise<string | undefined> {
  if (sound.url) return sound.url;
  if (sound.soundId && isIndexedDBAvailable()) {
    try {
      const stored = await getSoundFxFromIndexedDB(sound.soundId);
      if (stored) return stored;
    } catch (error) {
      console.error("Autodarts Tools: Error loading sound from IndexedDB", error);
    }
  }
  return sound.base64 || undefined;
}

/**
 * Plays a queued sound at its volume on a pool element that holds `channel`'s
 * lane: through the element's own volume, or from a copy made at that volume.
 * The copy is made while the sound holds the lane; if the lane is given up in
 * the meantime (the watchdog, or every sound being stopped) the sound is
 * dropped rather than played late. Without a copy it plays the file as it is,
 * as loud as the element goes.
 */
async function playAtVolume(nextSound: QueuedSound, audioElement: HTMLAudioElement, channel: number, percent: number): Promise<void> {
  const plan = planVolume(percent, elementVolumeWorks());
  let volume = plan.kind === "element" ? plan.volume : 1;

  if (plan.kind === "copy") {
    let copy: string | null = null;
    try {
      const source = await sourceOf(nextSound);
      if (source) copy = await copies.copyAt(source, plan.percent);
    } catch (error) {
      console.error(`Autodarts Tools: A sound could not be made at its volume (channel ${channel})`, error);
    }
    if ((channel === 2 ? laneHolder2 : laneHolder) !== audioElement) return;
    if (copy) {
      startCopy(audioElement, copy, channel);
      return;
    }
    volume = cappedVolume(percent);
  }

  // Pool elements are shared, so the last sound's volume must not carry over
  audioElement.volume = volume;
  playWithAvailableSource(nextSound, audioElement, channel);
}

/** Plays a copy made at a sound's volume on the pool element holding `channel`'s lane. */
function startCopy(audioElement: HTMLAudioElement, copy: string, channel: number): void {
  audioElement.volume = 1;
  audioElement.src = copy;
  audioElement.play()
    .then(() => {
      console.log(`Autodarts Tools: Sound playing at its volume (channel ${channel})`);
      releaseLaneIfLongSound(audioElement, channel);
    })
    .catch((error) => {
      console.error(`Autodarts Tools: Error playing a sound at its volume (channel ${channel})`, error);
      if (isAutoplayBlocked(error)) {
        showInteractionNotification();
        unlockAudio();
      }
      // Only a lane this sound still holds: another may have it by now
      if ((channel === 2 ? laneHolder2 : laneHolder) === audioElement) releaseLane(channel);
    });
}
```

- [ ] **Step 5: Build checks**

Run: `yarn build`. It must pass; this is the tree-shaking check. Then lint both files against `HEAD`, with no new warnings on touched lines.

Wait for the dev rebuild. Confirm `.output/chrome-mv3-dev/content-scripts/match.js` and `lobby.js` contain the literal `"Autodarts Tools: Sound playing at its volume"`, grepped with Python per the ugrep memory.

- [ ] **Step 6: Engine test in a bot match (`$SCRATCH/engine-test.mjs`)**

1. `node sw.mjs backup $SCRATCH/storage-backup-initial.json`.
2. Write a test config from the worker. Keep everything, and change these:
   - `soundFx.enabled = true`
   - among the Sound FX sounds with the default URLs:
     - `ambient_bull` at 150
     - `ambient_t20` at 50
     - `ambient_t19` at 0
     - `ambient_t18` untouched (100)
     - `ambient_gameshot` and `ambient_busted` (myinstants.com) at 150
   - Each of these sounds enabled. The Caller's state stays as the user has it.
3. Create a bot match through the API (a lobby with the account and a bot, X01 121, per the lobby recipe in the *match-player-identity* and *quick-bust-and-win* memories). Open `/matches/<id>` in a background target, attached for the whole run. Call `Page.bringToFront` before the throws, so the tab's audio is not suspended.
4. In the extension's isolated world, wrap `HTMLMediaElement.prototype.play` and `speechSynthesis.speak`. They record `{ t, src, volume }` into `window.__plays`.
5. Throw through `POST /gs/v0/matches/{id}/throws`, a few seconds apart:
   - Bull: expect one play with a `blob:` src at volume 1.
     - Fetch that blob in the isolated world and decode it. Fetch the original through the relay: `chrome.runtime.sendMessage({ type: "fetch", url })`.
     - Expect a peak ratio of 1.50 ± 0.01.
     - The copy was prepared, so the play comes as quickly as T18's.
   - T20: expect the x10 link at volume 0.5.
   - T19: expect no play of `beep_2_19.wav`.
   - T18: expect the x10 link at volume 1, on any element.
6. Next player, then the bot's turn. Throw a bust (T20 T20 T20 from 121): expect `ambient_busted`'s myinstants link at volume 1.
7. Throw a bull, and right away write game-data with `match.activated = 0` from the worker. Every pool element, the copy's included, is then paused (`!paused` count 0), and no further play is recorded.
8. Exit the match (the Abort confirmation from `/play`), park the tab at `about:blank` and close it. Then `node sw.mjs restore $SCRATCH/storage-backup-initial.json`, and compare the config with the backup.

Expected: every assertion prints ok. Any failure goes through superpowers:systematic-debugging before any fix.

- [ ] **Step 7: Checkpoint.** `git status --short`.

---

### Task 4: Volume in the settings

**Files:**
- Create: `components/Settings/Library/VolumeField.vue`
- Create: `components/Settings/Library/VolumeBadge.vue`
- Create: `composables/useLouderCheck.ts`
- Modify:
  - `components/AppSlider.vue` (the `label` prop; `aria-label`, `aria-valuetext` on the thumb)
  - `composables/useTTS.ts` (the `preview` volume)
  - `components/Settings/Library/SoundDialog.vue`, `components/Settings/Library/TtsDialog.vue`
  - `components/Settings/SoundFx.vue`, `components/Settings/Caller.vue`
- Test: `$SCRATCH/ui-test.mjs`, adapted from session 2c063cbd's `shot.mjs` (own tab, `/tools` seeded, dialog opened by its card).

**Interfaces:**
- Consumes: Task 1's constants, `soundVolume`, `planVolume`, `cappedVolume`, `isLink`; Task 2's `soundCopies`, `elementVolumeWorks`, `SoundCopies`.
- Produces:
  - `VolumeField` (`v-model: number`, prop `max?: number`, slot `hint`)
  - `VolumeBadge` (prop `sound: ISound`)
  - `useLouderCheck(copies: SoundCopies, draft: () => LouderDraft): ComputedRef<boolean>`
  - `SoundDialog` `v-model:volume` and prop `louderBlocked?: boolean`; `TtsDialog` `v-model:volume`
  - `useTTS().preview(text, voiceURI, rate, pitch, volume = 100)`

- [ ] **Step 1: `AppSlider.vue`**

Add a prop:

```ts
  /** What the slider sets, for screen readers: the thumb's accessible name. */
  label?: string;
```

Give it the default `label: undefined`. On the thumb `div`, after `:aria-valuenow="modelValue"`, add:

```vue
        :aria-label="label"
        :aria-valuetext="formatLabel(modelValue)"
```

- [ ] **Step 2: `components/Settings/Library/VolumeField.vue`**

```vue
<template>
  <!-- A sound's volume in its editor: the value in the label, as Speed and Pitch have it, and a way back to 100%. -->
  <div>
    <div class="flex min-h-8 items-center justify-between gap-3">
      <p class="adt-field-label !mb-0">
        Volume <span class="font-medium tabular-nums text-[var(--ad-text-muted)]">{{ volume }}%</span>
      </p>
      <button
        @click="volume = DEFAULT_VOLUME"
        v-if="volume !== DEFAULT_VOLUME"
        aria-label="Back to 100%"
        class="adt-icon-btn"
        title="Back to 100%"
        type="button"
      >
        <span class="icon-[material-symbols--restart-alt-rounded]" />
      </button>
    </div>
    <AppSlider
      v-model="volume"
      :autofocus="false"
      :format-label="percent"
      :max="max"
      :min="0"
      :show-value="false"
      :step="VOLUME_STEP"
      class="!pb-3"
      label="Volume"
    />
    <p v-if="$slots.hint" class="adt-field-hint !mt-0">
      <slot name="hint" />
    </p>
  </div>
</template>

<script setup lang="ts">
import AppSlider from "@/components/AppSlider.vue";
import { DEFAULT_VOLUME, MAX_VOLUME, VOLUME_STEP } from "@/utils/sound-volume";

withDefaults(defineProps<{
  /** 200 for a file, 100 for text to speech. */
  max?: number;
}>(), {
  max: MAX_VOLUME,
});

const volume = defineModel<number>({ required: true });

function percent(value: number): string {
  return `${value}%`;
}
</script>
```

- [ ] **Step 3: `components/Settings/Library/VolumeBadge.vue`**

```vue
<template>
  <!-- A sound's volume in its row, after where it comes from, when it is not the file's own. -->
  <template v-if="volume !== DEFAULT_VOLUME">
    <span aria-hidden="true" class="shrink-0">·</span>
    <span class="flex shrink-0 items-center gap-1 tabular-nums" :title="`Plays at ${volume}%`">
      <span aria-hidden="true" class="text-sm" :class="[icon]" />
      <span class="sr-only">Volume</span>
      {{ volume }}%
    </span>
  </template>
</template>

<script setup lang="ts">
import type { ISound } from "@/utils/storage";

import { DEFAULT_VOLUME, soundVolume } from "@/utils/sound-volume";

const props = defineProps<{ sound: ISound }>();

const volume = computed(() => soundVolume(props.sound));
const icon = computed(() => {
  if (volume.value === 0) return "icon-[material-symbols--volume-off-outline-rounded]";
  return volume.value > DEFAULT_VOLUME
    ? "icon-[material-symbols--volume-up-outline-rounded]"
    : "icon-[material-symbols--volume-down-outline-rounded]";
});
</script>
```

- [ ] **Step 4: `composables/useLouderCheck.ts`**

```ts
import { type ComputedRef, computed, ref } from "vue";
import { watchDebounced } from "@vueuse/core";

import type { SoundCopies } from "@/utils/sound-copies";

import { DEFAULT_VOLUME, isLink } from "@/utils/sound-volume";

/** What the sound editor holds, as far as the check goes. */
export interface LouderDraft {
  open: boolean;
  url: string;
  volume: number;
  /** An uploaded file, which can always be copied. */
  hasFile: boolean;
}

/**
 * Whether the sound in the editor is set louder than it can play.
 *
 * Only a link above 100% can be. A louder copy needs the file, and a site
 * that neither allows reading it (CORS) nor is one of the extension's own
 * hosts cannot be read — see utils/sound-copies.ts. Each link is tried once,
 * a moment after it stops changing, so typing one does not fetch at every
 * keystroke; what is known about it answers at once from then on.
 */
export function useLouderCheck(copies: SoundCopies, draft: () => LouderDraft): ComputedRef<boolean> {
  /** A link found to be unreadable. */
  const unreadable = ref("");

  const linkAboveFull = () => {
    const { open, url, volume, hasFile } = draft();
    const link = url.trim();
    return open && !hasFile && volume > DEFAULT_VOLUME && isLink(link) ? link : "";
  };

  watchDebounced(linkAboveFull, async (link) => {
    if (link && !(await copies.readable(link))) unreadable.value = link;
  }, { debounce: 400 });

  return computed(() => {
    const link = linkAboveFull();
    return link !== "" && link === unreadable.value;
  });
}
```

- [ ] **Step 5: `composables/useTTS.ts`**

- Import: `import { DEFAULT_VOLUME, cappedVolume } from "@/utils/sound-volume";`
- `function preview(text: string, voiceURI: string, rate: number, pitch: number, volume: number = DEFAULT_VOLUME)`
- After `utterance.pitch = pitch;`, add `utterance.volume = cappedVolume(volume);`.

- [ ] **Step 6: `SoundDialog.vue` and `TtsDialog.vue`**

**SoundDialog:**
- Between the link/file block and the Name field:

  ```vue
        <div>
          <VolumeField v-model="volume">
            <template #hint>
              100% is the file as it is. Up to 200% makes a quiet one louder.
            </template>
          </VolumeField>
          <AppAlert v-if="louderBlocked" class="mt-3" compact variant="warning">
            This link's site doesn't let the extension read the file, so it plays at 100% at most. To make it louder,
            upload the file instead.
          </AppAlert>
        </div>
  ```

- Imports: `import VolumeField from "./VolumeField.vue";` and `import AppAlert from "@/components/AppAlert.vue";`.
- Prop `louderBlocked?: boolean`, with the default `louderBlocked: false`.
- `const volume = defineModel<number>("volume", { required: true });`

**TtsDialog:**
- After the Speed/Pitch grid:

  ```vue
        <VolumeField v-model="volume" :max="MAX_TTS_VOLUME">
          <template #hint>
            Up to 100%: a voice can be turned down, but no louder than it speaks.
          </template>
        </VolumeField>
  ```

- Imports: `VolumeField`, and `MAX_TTS_VOLUME` from `@/utils/sound-volume`.
- `const volume = defineModel<number>("volume", { required: true });`

- [ ] **Step 7: `SoundFx.vue`**

Template:
- After `<SoundSource … />` in `#meta`, add `<VolumeBadge :sound="config.soundFx.sounds[entry.index]" />`.
- On `SoundDialog`, add `v-model:volume="newSound.volume"` and `:louder-blocked="louderBlocked"`.
- On `TtsDialog`, add `v-model:volume="ttsForm.volume"`.

Script:
- Imports:
  - `VolumeBadge`, after `UploadDialog`
  - `useLouderCheck`, after `useTTS`
  - `elementVolumeWorks, soundCopies` from `@/utils/sound-copies`
  - `DEFAULT_VOLUME, cappedVolume, isLink, planVolume, soundVolume` from `@/utils/sound-volume`
- `newSound` gets a `volume: DEFAULT_VOLUME` field in its initial value, and in the resets in `openAddSoundModal` and `closeSoundModal`. `editSound` sets `volume: soundVolume(sound)`.
- `ttsForm` gets `volume: DEFAULT_VOLUME`. `openTTSModal` sets `volume: soundVolume(sound)` when editing and `DEFAULT_VOLUME` for a new sound.
- `const copies = soundCopies();`, after `playingKey`.
- After `draftHasFile`:

  ```ts
  const louderBlocked = useLouderCheck(copies, () => ({ open: showSoundModal.value, url: newSound.value.url, volume: newSound.value.volume, hasFile: draftHasFile.value }));
  ```

- `onBeforeUnmount(stopPlayback);` becomes:

  ```ts
  onBeforeUnmount(() => {
    stopPlayback();
    copies.forget();
  });
  ```

- `previewDraft` passes `volume` in the temporary sound.
- `saveSound`: after the `sound` object is built, add `if (newSound.value.volume !== DEFAULT_VOLUME) sound.volume = newSound.value.volume;`.
- `saveTTSSound`: likewise, with `ttsForm.value.volume`.
- `prelistenTTS` passes `ttsForm.value.volume` as `preview`'s fifth argument.
- `playSound` resolves the file first, then plays at the volume. Replace everything from `stopPlayback(); playingKey.value = key;` down to `// Set the source` with:

```ts
  stopPlayback();
  playingKey.value = key;
  const percent = soundVolume(sound);

  // Handle TTS sounds; the isSpeaking watcher clears the key when it is done.
  if (sound.tts) {
    preview(sound.tts.text, sound.tts.voiceURI, sound.tts.rate, sound.tts.pitch, percent);
    return;
  }

  const plan = planVolume(percent, elementVolumeWorks());
  // At 0% there is nothing to hear.
  if (plan.kind === "silent") {
    playingKey.value = null;
    return;
  }

  // Create an audio element with preload enabled
  const audio = new Audio();
  audio.preload = "auto";
  currentPlayer = audio;

  const finish = () => {
    if (currentPlayer !== audio) return;
    currentPlayer = null;
    playingKey.value = null;
  };

  // The stored upload first, then the config's copy, then the link
  let source = "";
  let blobUrl: string | undefined;
  if (sound.soundId && isIndexedDBAvailable()) {
    source = (await getSoundFxFromIndexedDB(sound.soundId)) || "";
  }
  if (!source) source = sound.base64 || sound.url;
  if (!source) {
    showNotification("No audio source available for this sound", "error");
    finish();
    return;
  }

  // A volume the file doesn't have plays from a copy made at that volume.
  const copy = plan.kind === "copy" ? await copies.copyAt(source, plan.percent) : null;

  // Stopped, or another sound started, while the file was read.
  if (currentPlayer !== audio) return;

  if (copy) {
    source = copy;
  } else {
    // Without a copy, the file as it is, as loud as the element goes
    audio.volume = plan.kind === "element" ? plan.volume : cappedVolume(percent);

    // For Safari: convert base64 to blob for better compatibility
    if (!isLink(source) && isSafari()) {
      try {
        blobUrl = URL.createObjectURL(base64toBlob(source));
        source = blobUrl;
      } catch (error) {
        // Fall back to direct base64 if blob creation fails
        console.error("Error creating blob from base64:", error);
      }
    }
  }
```

  Everything from `audio.src = source;` on stays. The error handler's fallback audio also gets `fallbackAudio.volume = audio.volume;`.

- [ ] **Step 8: `Caller.vue`**

Make the same template and script changes as Step 7 (`config.caller.sounds[…]` in the badge).

`playSound`:
- Keep its structure, and put the volume in:
  - `const percent = soundVolume(sound);` after `playingKey.value = key;`
  - the TTS `preview(…, percent)`
  - the `plan` and silent check before the audio element is created, as in Step 7
- After the source is resolved and before `if (currentPlayer !== audio) return;`:

  ```ts
      // A volume the file doesn't have plays from a copy made at that volume.
      const copy = plan.kind === "copy" ? await copies.copyAt(source, plan.percent) : null;
  ```

- After `audio.addEventListener("ended", finish);`:

  ```ts
      if (copy) {
        audio.src = copy;
        await audio.play();
        return;
      }

      // Without a copy, the file as it is, as loud as the element goes
      audio.volume = plan.kind === "element" ? plan.volume : cappedVolume(percent);
  ```

The Caller's `saveSound` builds `sound` the same way, and it gets the same `volume` line.

- [ ] **Step 9: Compile the SFCs and lint**

Run: `node $SCRATCH/sfc-check.cjs` (from the repo). Expected: `all N compile`.

Lint the touched files against `HEAD`. The new files come out clean.

Wait for the rebuild. Grep `content.js` for `"Back to 100%"` and `"Plays at "` to confirm the modules are fresh.

- [ ] **Step 10: The settings in the dev Chrome (`$SCRATCH/ui-test.mjs`)**

Run it in a tab of my own on `/tools`, with storage backed up first. It checks the following, and takes screenshots at 1600×1000 and 390×844 (mobile):

1. **Sound FX:** the Bull's row shows no volume. Edit it:
   - The Volume field reads 100%, with no reset button.
   - Focus the slider thumb and press ArrowRight ×10: the field reads 150%, the reset button shows, and `aria-valuetext` is "150%".
   - Play in the dialog: the isolated world records a `blob:` src.
   - Save: storage has `volume: 150`, and the row shows "· 150%" with the volume-up icon.
2. **Keeping the volume:** edit the Bull again, change only its name, save → storage still has `volume: 150`. Edit, press reset, save → no `volume` key. Then put the original name back.
3. **An unreadable link:** edit *gameshot* (myinstants.com) and raise it above 100%. Within ~1.5 s the warning note shows. Lower it to 100% or less → the note goes. Cancel, and nothing is saved.
4. **Text to speech:** Add, then Generate a sound. The slider's `aria-valuemax` is 100, and End gives 100%. Cancel.
5. **Row previews:** set a sound to 50% in the stored config, reopen the dialog, and play the row. The recorded play has `volume` 0.5 and the original src.
6. **The Caller:** edit one of the user's sounds, raise it, play it → a `blob:` src. Cancel.
7. **Layout:** the audit shows no overflow and no new blue buttons at 390 px. The badge does not wrap the row's source line onto a third line.
8. **Clean-up:** restore the config and the shared localStorage keys, park the tab at `about:blank` and close it.

- [ ] **Step 11: Checkpoint.** `git status --short`.

---

### Task 5: Documentation, whole-change checks, review, commit

**Files:**
- Modify: `README.md` (the Caller's *Configuration Options*; the Sound FX section)
- Modify: `CHANGELOG.md` (`[Unreleased]` → `### Added`)

- [ ] **Step 1: README**

Under the Caller's *Configuration Options*, after *Text-to-Speech (TTS) Generation*:

```markdown
- **Volume per Sound**: Each sound's editor has a volume from 0 to 200%. 100% plays the file as it is, so a quiet recording can be turned up and a loud one down, and the list shows any sound that is set to something else. Text-to-speech sounds go up to 100%, since a voice can't be made louder than it speaks. A sound on a link can only be turned up when its site lets the extension read the file; the editor says when it can't, and uploading the file works instead
```

In the Sound FX section, a new `#### Volume per Sound` after the triggers list:

```markdown
#### Volume per Sound
Every sound has a volume from 0 to 200% in its editor, so each can be tuned on its own. The default Bull, for one, is much quieter than the triples; at 200% it is about as loud as T18. 100% plays the file as it is, 0% silences a sound without taking it out of the list, and the list shows any sound that isn't at 100%. Text-to-speech sounds go up to 100%. A sound on a link can only be turned up when its site lets the extension read the file, which the default *busted* and *gameshot* on myinstants.com do not; the editor says so, and uploading the file works instead
```

- [ ] **Step 2: CHANGELOG, under `[Unreleased]` → `### Added`**

```markdown
- **The Caller** and **Sound FX** have a volume on every sound, from 0 to 200%, in the sound's editor. 100% plays the file as it is, so a quiet sound can be turned up and a loud one down: Sound FX's default Bull, 12 dB quieter than T20, is about as loud as T18 at 200%. The list shows any sound that isn't at 100%, and the play buttons play at the volume set. Text-to-speech sounds go up to 100%, since a voice can't be made louder than it speaks. A sound on a link can only be turned up when its site lets the extension read the file, which myinstants.com does not; the editor says so, and uploading the file works instead (#253)
```

- [ ] **Step 3: Whole-change checks**

- `yarn compile`, in the background (2–4 min, and it starves the dev watcher). Compare the error file list with the 14-error baseline.
- `yarn build`.
- ESLint every touched file against `HEAD`.
- `node $SCRATCH/sfc-check.cjs`.
- Run the tsx test and the copies harness again.

- [ ] **Step 4: Review.** Use superpowers:requesting-code-review: a fresh reviewer on the whole diff, with the spec and this plan. Handle the findings with superpowers:receiving-code-review. Every fix is re-checked in the dev Chrome where it touches behaviour.

- [ ] **Step 5: Commit** (local, on `main`, never pushed)

```bash
git add docs/superpowers/plans/2026-09-26-per-sound-volume.md
git commit -m "docs: plan for a volume on every Caller and Sound FX sound"
git add utils/sound-volume.ts utils/sound-copies.ts utils/storage.ts composables/useLouderCheck.ts composables/useTTS.ts \
  components/AppSlider.vue components/Settings/Library/VolumeField.vue components/Settings/Library/VolumeBadge.vue \
  components/Settings/Library/SoundDialog.vue components/Settings/Library/TtsDialog.vue \
  components/Settings/SoundFx.vue components/Settings/Caller.vue \
  entrypoints/match.content/caller.ts entrypoints/match.content/sound-fx.ts README.md CHANGELOG.md
git commit   # feat: a volume on every Caller and Sound FX sound … Closes #253
```

- [ ] **Step 6: Close-out on GitHub** (the user asked for it)
  - A comment on #253 in the #243/#246 shape, written for the thread: what the report made clear, the measurement, what is new, what was and wasn't verified, and a request to test once it is out.
  - The label `needs real-device testing`.
  - Leave the issue open; the commit closes it on push.
