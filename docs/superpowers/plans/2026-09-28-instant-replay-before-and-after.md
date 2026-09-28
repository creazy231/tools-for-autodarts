# Instant Replay: seconds before and after the gameshot. Implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Two settings, *Before the gameshot* and *After the gameshot*, and a replay that plays exactly that window of the webcam recording.

**Architecture:**
- **Stored shape:** `before` and `after` replace `duration`. One normalizer in a runtime-import-free `utils/instant-replay.ts`, tested under tsx, serves the WXT migration 14, the settings imports and the match script.
- **Recording:** overlapping `MediaRecorder` takes, so a take that started at least *before* seconds ago always exists.
- **Playback:** on a win, that take is held through *after*, stopped, seeked to the start of the run-up while hidden, and shown at *start delay*, or later if the footage isn't ready.

**Tech Stack:**
- WXT content script, TypeScript
- Vue 3 `<script setup>` with the settings library parts (`OptionRow`, `AppNumberInput`)
- tsx + `node:test` for the pure module
- raw CDP against the yarn dev Chrome (`:9222`) for the end-to-end run

**Spec:** `docs/superpowers/specs/2026-09-28-instant-replay-before-and-after-design.md`

## Global Constraints

- **Stored shape:** `instantReplay.before` and `instantReplay.after`, in seconds. `duration` is gone. Defaults: `before: 10`, `after: 3`, `startDelay: 3`.
- **Migration:** `CONFIG_VERSION` 13 → 14 in `utils/storage.ts`, running `normalizeInstantReplay`. Nothing goes into `entrypoints/content/migration-config.ts`, and `defaultConfig.version` stays 22.
- **Carry-over:**
  - `before` ← `before`, else old `duration`, else 10
  - `after` ← `after`, else old `startDelay`, else 3
  - `startDelay` ← `startDelay` if a number of seconds, else 3
  - `duration` and `delay` are dropped
- **Timing:**
  - overlap = `before × 1000 + 1000` ms
  - period = `max(30000, 2 × overlap)` ms
  - a take needs 1000 ms recorded before the dart
  - load and seek wait 3000 ms each
  - a stop waits 1500 ms
  - the safety timer is the clip's remaining length + 3000 ms
- **Copy, verbatim:**
  - Before row: title `Before the gameshot`, line `How much of the run-up to the winning dart the replay shows.`, limits 1–30, unit `s`
  - After row: title `After the gameshot`, line `And how much of what follows it.`, limits 0–10, unit `s`
  - Start delay line: `From the won leg to the replay, leaving room for autodarts' own celebration.`; when after > start delay: `` `From the won leg to the replay. The ${after} s after the gameshot have to be filmed first, so it starts after ${after} s.` ``
  - intro: `Point a webcam at your board, and the winning dart is played back over the screen whenever a leg is won, from a few seconds before it to a few after. A click on the replay puts it away early.`
- **Never edit** `safari/**/Shared (Extension)/**` (stale bundles), `components/WhatsNew.vue` (3.0's notes), or `migration-config.ts`.
- **Dev browser rules:**
  - only a tab of my own, never the user's `/tools` tab
  - stage edits outside the repo and land them in one `cp`, while no tab is on `/matches/`
  - back up `chrome.storage.local` before the first write and restore it after
- **No commits:** the harness allows them only when the user asks. Everything stays in the working tree for review.

## Review Focus

1. **An old export imported after the update:** `duration` and no `before`/`after`. The replay must still get numbers, not `undefined × 1000 = NaN` timers. Pinned by the tsx cases in Task 1, plus the one-line import wiring checked in Task 2's step 3.
2. **The win taken back and given again inside the *after* seconds** (undo, then the same checkout). The second win needs a replay of its own, and the first must never open. Pinned by the undo scenario in Task 5.
3. **A win well after the first rotation**, when the first take is long gone. The replay must still start *before* seconds ahead of the dart. Pinned by the 40-second scenario in Task 5.
4. ***After* longer than *Start delay*.** The replay can't open before the footage exists, and the settings line must say so. Pinned by scenario B in Task 5 and the settings check in Task 4.
5. **A browser that can't seek, or never fires `loadedmetadata`.** It must play the whole take, not nothing and not a clip cut short by the safety timer. Pinned by the `cued` fallback and its length. Code review only, since Chrome always seeks.

---

### Task 1: The settings shape and its normalizer

**Files:**
- Create: `utils/instant-replay.ts`
- Test: `<scratchpad>/instant-replay-config.test.mts` (outside the repo, like the other tsx tests)

**Interfaces:**
- Produces:
  - `type InstantReplayConfig = IConfig["instantReplay"]`
  - `defaultInstantReplay(): InstantReplayConfig`
  - `normalizeInstantReplay(saved: unknown): InstantReplayConfig`

- [ ] **Step 1: Write the failing test**

```ts
// instant-replay-config.test.mts: node_modules/.bin/tsx --test <this file>
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { defaultInstantReplay, normalizeInstantReplay } from "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/utils/instant-replay.ts";

const OLD_DEFAULT = { enabled: false, deviceId: "", duration: 10, startDelay: 3, viewMode: "board-only", zoom: 1, positionX: 0, positionY: 0 };

test("nothing saved, or not an object: the defaults", () => {
  for (const saved of [ undefined, null, "junk", 7, [] ]) assert.deepEqual(normalizeInstantReplay(saved), defaultInstantReplay());
});

test("the old defaults become the new ones", () => {
  assert.deepEqual(normalizeInstantReplay(OLD_DEFAULT), defaultInstantReplay());
});

test("a changed Duration and Start delay carry over as Before and After", () => {
  assert.deepEqual(
    normalizeInstantReplay({ ...OLD_DEFAULT, enabled: true, deviceId: "cam", duration: 20, startDelay: 5, viewMode: "full-page", zoom: 2.5, positionX: -10, positionY: 30 }),
    { enabled: true, deviceId: "cam", before: 20, after: 5, startDelay: 5, viewMode: "full-page", zoom: 2.5, positionX: -10, positionY: 30 },
  );
});

test("no start delay was nothing after the dart, and stays so", () => {
  assert.equal(normalizeInstantReplay({ ...OLD_DEFAULT, startDelay: 0 }).after, 0);
});

test("the old fields are gone", () => {
  const result = normalizeInstantReplay({ ...OLD_DEFAULT, delay: 5 });
  assert.equal("duration" in result, false);
  assert.equal("delay" in result, false);
});

test("the current shape comes back as it was", () => {
  const current = { enabled: true, deviceId: "cam", before: 7, after: 0, startDelay: 4, viewMode: "full-page", zoom: 1.5, positionX: 5, positionY: -5 };
  assert.deepEqual(normalizeInstantReplay(current), current);
});

test("a number outside today's limits is kept, as AppNumberInput keeps it", () => {
  assert.equal(normalizeInstantReplay({ ...defaultInstantReplay(), before: 45 }).before, 45);
});

test("missing fields come from the defaults", () => {
  assert.deepEqual(normalizeInstantReplay({ enabled: true }), { ...defaultInstantReplay(), enabled: true });
});

test("numbers that are not numbers of seconds fall back", () => {
  const result = normalizeInstantReplay({ ...OLD_DEFAULT, before: "7", after: -1, duration: Number.NaN, startDelay: null });
  assert.equal(result.before, 10);
  assert.equal(result.after, 3);
  assert.equal(result.startDelay, 3);
});

test("the dev config's own value migrates as expected", () => {
  const saved = JSON.parse(readFileSync(new URL("./dev-instant-replay.json", import.meta.url), "utf8"));
  const result = normalizeInstantReplay(saved);
  assert.equal(result.before, saved.duration ?? 10);
  assert.equal(result.after, saved.startDelay ?? 3);
  for (const key of [ "enabled", "deviceId", "startDelay", "viewMode", "zoom", "positionX", "positionY" ]) assert.deepEqual(result[key], saved[key], key);
});
```

`dev-instant-replay.json` is the dev config's `instantReplay`, read from the service worker in Task 2's step 1.

- [ ] **Step 2: Run it and see it fail**

Run: `node_modules/.bin/tsx --test <scratchpad>/instant-replay-config.test.mts`
Expected: FAIL, cannot find `utils/instant-replay.ts`.

- [ ] **Step 3: Write `utils/instant-replay.ts`**

```ts
import type { IConfig } from "@/utils/storage";

export type InstantReplayConfig = IConfig["instantReplay"];

/**
 * Instant Replay as it starts out: ten seconds of run-up, the number *Duration*
 * started at, and three of what follows the dart, which is about what the
 * replay showed before it was cut to the second.
 */
export function defaultInstantReplay(): InstantReplayConfig {
  return {
    enabled: false,
    deviceId: "",
    before: 10,
    after: 3,
    startDelay: 3,
    viewMode: "board-only",
    zoom: 1,
    positionX: 0,
    positionY: 0,
  };
}

/** A number of seconds, or nothing. */
function seconds(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}

/**
 * Settings from anywhere, in the current shape.
 *
 * Storage migrates what it holds, but an exported or a pasted config is merged
 * over the defaults as it is, so the settings page runs those through here as
 * well — and so does the match script, so an old shape never reaches the
 * recorder.
 *
 * The replay used to be counted back from the moment it began, *Start delay*
 * after the win, and played whole stretches of recording that added up to at
 * least *Duration*. *Duration* read as the run-up to the winning dart, and that
 * is what `before` is now, exactly, so its number carries over. What followed
 * the dart was the start delay, so that is where `after` starts.
 */
export function normalizeInstantReplay(saved: unknown): InstantReplayConfig {
  const defaults = defaultInstantReplay();
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) return defaults;

  const old = saved as Record<string, any>;
  const next: Record<string, any> = {
    ...defaults,
    ...old,
    before: seconds(old.before) ?? seconds(old.duration) ?? defaults.before,
    after: seconds(old.after) ?? seconds(old.startDelay) ?? defaults.after,
    startDelay: seconds(old.startDelay) ?? defaults.startDelay,
  };
  delete next.duration;
  delete next.delay;
  return next as InstantReplayConfig;
}
```

- [ ] **Step 4: Run the tests**

Same command. Expected: all pass. The type import on `@/utils/storage` is erased by tsx, so no alias resolution is needed.

---

### Task 2: The stored shape, the migration and the imports

**Files:**
- Modify: `utils/storage.ts`:
  - `IConfig.instantReplay` at :207-218
  - `defaultConfig.instantReplay` at :565-574
  - `CONFIG_VERSION` at :831
  - migrations at :845
- Modify: `components/PageConfig.vue` at :266, :591-594 and :844-847

**Interfaces:**
- Consumes: `defaultInstantReplay` and `normalizeInstantReplay` (Task 1).
- Produces: `IConfig["instantReplay"]` = `{ enabled, deviceId, before, after, startDelay, viewMode?, zoom, positionX, positionY }`.

- [ ] **Step 1: Save the dev config first**

From the worker, save all of `chrome.storage.local` to `<scratchpad>/config-backup.json`, and its `config-2-0-0.instantReplay` to `<scratchpad>/dev-instant-replay.json`. This is the restore target for everything later.

- [ ] **Step 2: Change `utils/storage.ts`**

```ts
import { defaultInstantReplay, normalizeInstantReplay } from "@/utils/instant-replay";
```

```ts
  instantReplay: {
    enabled: boolean;
    deviceId: string;
    /** Seconds of footage from before the winning dart. */
    before: number;
    /** Seconds of footage from after it. The replay can only start once these are filmed. */
    after: number;
    /** Seconds to wait after the leg is won before the replay covers the screen, or `after` where that is longer. */
    startDelay: number;
    viewMode?: "full-page" | "board-only";
    zoom: number;
    positionX: number;
    positionY: number;
  };
```

```ts
  instantReplay: defaultInstantReplay(),
```

```ts
const CONFIG_VERSION = 14;
```

```ts
    migrations: {
      /**
       * Instant Replay is cut to the second now, so *Duration* is split into
       * the seconds before the winning dart and the seconds after it. See
       * normalizeInstantReplay for how the old numbers carry over.
       */
      14: (config: any) => ({ ...config, instantReplay: normalizeInstantReplay(config.instantReplay) }),

      /** (13 unchanged) */
```

- [ ] **Step 3: Normalize both imports in `components/PageConfig.vue`**

```ts
import { normalizeColors } from "@/utils/colors";
import { normalizeInstantReplay } from "@/utils/instant-replay";
```

At both merge sites:

```ts
        // An export from before a change of shape is merged as it is, so
        // Colors and Instant Replay are brought up to date here; see
        // normalizeColors and normalizeInstantReplay.
        newConfig.colors = normalizeColors(newConfig.colors);
        newConfig.instantReplay = normalizeInstantReplay(newConfig.instantReplay);
```

- [ ] **Step 4: Check it**

- `grep -n "instantReplay.duration\|\.duration ??" -r utils components entrypoints --include=*.ts --include=*.vue` has no Instant Replay hits left outside `migration-config.ts`.
- Once landed (Task 6), the worker reads:
  - `config-2-0-0.instantReplay` with `before`/`after` and no `duration`
  - `config-2-0-0$` meta `v: 14`

---

### Task 3: Record in overlapping takes and play the window

**Files:**
- Modify (rewrite the recording and replay halves): `entrypoints/match.content/instant-replay.ts`

**Interfaces:**
- Consumes: `normalizeInstantReplay` and `InstantReplayConfig` (Task 1).
- Produces: `instantReplay()` and `instantReplayOnRemove()`, the same exports that `entrypoints/match.content/index.ts` already calls.

- [ ] **Step 1: The header comment and constants**

Replace the header's segment paragraphs, `KEEP_SEGMENTS`, `Segment` and the segment state:

```ts
/**
 * Instant Replay — play the winning throw back off your own webcam.
 *
 * This is a camera pointed at the board by hand, not the board's own: the board
 * camera is on the board, and nothing in the browser can reach it. So the
 * feature holds a rolling recording of whatever camera you picked, and when a
 * leg is won it plays the seconds around the winning dart over the screen:
 * `before` of them leading up to it and `after` of what follows.
 *
 * v1 did this by reading every frame back off a canvas with `getImageData` and
 * keeping them in a list — a GPU-to-CPU copy per frame, and around half a
 * gigabyte of uncompressed pixels for its own default five second delay. What
 * it produced was not a replay either: it was the live feed running a few
 * seconds behind, so once the buffer had drained you were watching a lagging
 * camera rather than the throw.
 *
 * This records with `MediaRecorder` instead — compressed by the same encoder
 * the browser uses for video calls, a few megabytes rather than hundreds — and
 * plays a real clip.
 *
 * A recorder hands its file over only once it is stopped, and a file cannot be
 * trimmed from the front, so the recording is a series of takes, each started
 * while the one before is still running. A take is kept until the next one
 * holds a whole run-up by itself: whenever a leg is won, one of them started at
 * least `before` seconds earlier. That one records on through the `after`
 * seconds, is stopped, and is played from the second the run-up begins — one
 * file, so the replay has no seam in it anywhere. Two recorders run at once
 * only for the overlap: `before` and a second, in every half minute or more.
 *
 * The one seek is to that first second. A file recorded in one piece, with no
 * timeslice, carries its length and an index in Chrome, and a seek lands on the
 * frame asked for. A browser that cannot seek plays the take from its start
 * instead: a longer run-up, never a shorter one.
 */
const HOST_ID = "adt-instant-replay";
const STYLE_ID = "instant-replay";

/** Matches the fade in the stylesheet. */
const FADE_MS = 500;

/** On top of the run-up, before a take is let go: timers run late. */
const OVERLAP_SLACK_MS = 1000;

/** New takes no more often than this, so two recorders run at once for a small part of the time. */
const MIN_PERIOD_MS = 30_000;

/** Less than this recorded before the winning dart, and there is no run-up to show. */
const MIN_RUN_UP_MS = 1000;

/** How long the video gets to load a take, and then to find the run-up in it. */
const CUE_TIMEOUT_MS = 3000;

/** How long a recorder gets to hand its footage over once stopped. */
const STOP_TIMEOUT_MS = 1500;
```

```ts
interface Take {
  recorder: MediaRecorder;
  /** When it began, by `performance.now()`: where its first frame sits, to within a frame. */
  start: number;
  /** Its footage, once it has been stopped; null when it recorded nothing. */
  footage: Promise<Blob | null>;
}

let gameDataWatcherUnwatch: (() => void) | undefined;
let onReposition: (() => void) | null = null;
let host: HTMLElement | null = null;
let video: HTMLVideoElement | null = null;
let config: InstantReplayConfig | null = null;

let stream: MediaStream | null = null;
let recording = false;
/** Oldest first. */
let takes: Take[] = [];
/** The take a won leg is holding on to, which retiring passes by. */
let held: Take | null = null;
let rotateTimer: ReturnType<typeof setTimeout> | undefined;
let retireTimer: ReturnType<typeof setTimeout> | undefined;

let url: string | null = null;
let legWon = false;
/** Goes up with every replay begun or called off, so a step still waiting can tell it is out of date. */
let replay = 0;
let captureTimer: ReturnType<typeof setTimeout> | undefined;
let showTimer: ReturnType<typeof setTimeout> | undefined;
let endTimer: ReturnType<typeof setTimeout> | undefined;
let clearTimer: ReturnType<typeof setTimeout> | undefined;
```

- [ ] **Step 2: Start and stop**

In `instantReplay()`, `config = normalizeInstantReplay(stored.instantReplay);`. `instantReplayOnRemove()` bumps `replay` and clears `captureTimer`/`showTimer`/`endTimer`/`clearTimer` where it cleared `showTimer`/`endTimer`/`clearTimer`. The rest is unchanged.

- [ ] **Step 3: The recording**

Replace `segmentMs`…`clip` with:

```ts
/** How long a take is kept once the next has started: until that one alone holds a run-up. */
function overlapMs(): number {
  return (config?.before ?? 10) * 1000 + OVERLAP_SLACK_MS;
}

/** How often a take starts: twice the overlap at least, so two overlap half the time at most. */
function periodMs(): number {
  return Math.max(MIN_PERIOD_MS, 2 * overlapMs());
}

function startRecording(): void {
  recording = true;
  takes = [];
  held = null;
  rotate();
}

/** Start the next take, and let the older ones go once it holds a run-up of its own. */
function rotate(): void {
  if (!recording) return;

  clearTimeout(rotateTimer);
  rotateTimer = undefined;
  if (!startTake()) {
    recording = false;
    return;
  }

  clearTimeout(retireTimer);
  retireTimer = setTimeout(retire, overlapMs());
  rotateTimer = setTimeout(rotate, periodMs());
}

/** Every take but the newest, which holds a whole run-up by now — and but the one a won leg is holding. */
function retire(): void {
  retireTimer = undefined;
  for (const take of takes.slice(0, -1)) {
    if (take !== held) dropTake(take);
  }
}

/**
 * Started without a timeslice: the footage then arrives in one piece when the
 * take is stopped, which is the only moment anything here wants it — and a file
 * made in one piece carries its own length and index, which is what lets the
 * replay start at the right second.
 */
function startTake(): Take | null {
  if (!stream) return null;

  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, recorderOptions());
  } catch (error) {
    console.warn("Autodarts Tools: Instant Replay - cannot record this camera", error);
    return null;
  }

  const chunks: Blob[] = [];
  const footage = new Promise<Blob | null>((resolve) => {
    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data?.size) chunks.push(event.data);
    };
    recorder.onstop = () => resolve(chunks.length
      ? new Blob(chunks, { type: chunks[0].type || recorder.mimeType || "video/webm" })
      : null);
  });

  try {
    recorder.start();
  } catch (error) {
    // A camera unplugged mid-match ends its track, and the recorder goes with it.
    console.warn("Autodarts Tools: Instant Replay - recording stopped", error);
    return null;
  }

  const take = { recorder, start: performance.now(), footage };
  takes.push(take);
  return take;
}

/**
 * Stop a take and hand its footage over.
 *
 * Resolves on a timer as well, because a recorder that never reports back would
 * otherwise mean a replay that never appears.
 */
function stopTake(take: Take): Promise<Blob | null> {
  takes = takes.filter(other => other !== take);
  try {
    if (take.recorder.state !== "inactive") take.recorder.stop();
  } catch {
    // a recorder whose track has already gone throws on stop; nothing to do
  }
  return Promise.race([ take.footage, new Promise<null>(resolve => setTimeout(resolve, STOP_TIMEOUT_MS, null)) ]);
}

/** Stop a take and throw its footage away. */
function dropTake(take: Take): void {
  take.recorder.ondataavailable = null;
  void stopTake(take);
}

function stopRecording(): void {
  recording = false;
  clearTimeout(rotateTimer);
  clearTimeout(retireTimer);
  rotateTimer = undefined;
  retireTimer = undefined;
  held = null;
  [ ...takes ].forEach(dropTake);
  takes = [];
}
```

- [ ] **Step 4: The overlay**

In `mount()`, `video.preload = "auto";` goes after `playsInline`. Replace `show`/`playClip`/`revokeUrls` with `present`/`when`/`seek`/`revokeUrl`. `hide()` clears the video when nothing is open:

```ts
/**
 * Put a won leg's take on screen: loaded, and moved to the second its run-up
 * starts while the overlay is still out of sight; then shown once autodarts has
 * had its own moment.
 *
 * `offset` is where the run-up starts in the take and `length` how long the
 * take is, both in milliseconds.
 */
async function present(id: number, footage: Blob, offset: number, length: number, won: number): Promise<void> {
  if (!host || !video || !config) return;

  clearTimeout(clearTimer);
  clearTimer = undefined;
  revokeUrl();
  url = URL.createObjectURL(footage);
  video.onended = null;
  video.src = url;

  // A browser that cannot seek into the take plays it from the start: more run-up, never less.
  const cued = await when(video, "loadedmetadata", CUE_TIMEOUT_MS) && await seek(video, offset / 1000);
  if (id !== replay || !host || !video) return;
  if (!cued) console.warn("Autodarts Tools: Instant Replay - cannot find the run-up in the recording, playing all of it");

  // The site has its own moment first — the card lights up and it says GAME
  // SHOT — and the darts are still in the board.
  const wait = won + config.startDelay * 1000 - performance.now();
  if (wait > 0) {
    await new Promise((resolve) => {
      showTimer = setTimeout(resolve, wait);
    });
    showTimer = undefined;
    if (id !== replay || !host || !video) return;
  }

  place();
  host.setAttribute("data-open", "");
  video.onended = hide;
  void video.play().catch((error) => {
    console.warn("Autodarts Tools: Instant Replay - playback failed", error);
    hide();
  });

  // `ended` never arrives from a clip the decoder will not take, and this
  // covers the board — so it comes off on a timer whatever happens.
  clearTimeout(endTimer);
  endTimer = setTimeout(hide, (cued ? length - offset : length) + 3000);
}

/** Whether `type` fires on `target` within `ms`. */
function when(target: EventTarget, type: string, ms: number): Promise<boolean> {
  const done = new AbortController();
  return new Promise<boolean>((resolve) => {
    target.addEventListener(type, () => resolve(true), { once: true, signal: done.signal });
    setTimeout(resolve, ms, false);
  }).finally(() => done.abort());
}

/** Move to `seconds` into the clip, and whether it got there. */
function seek(element: HTMLVideoElement, seconds: number): Promise<boolean> {
  const seeked = when(element, "seeked", CUE_TIMEOUT_MS);
  element.currentTime = seconds;
  return seeked;
}

function hide(): void {
  clearTimeout(showTimer);
  clearTimeout(endTimer);
  showTimer = undefined;
  endTimer = undefined;

  // A replay still being put together has nothing on screen to fade.
  if (!host?.hasAttribute("data-open")) return clearVideo();
  host.removeAttribute("data-open");

  // Let the fade finish first: dropping the source now would black the picture
  // out halfway through it.
  clearTimeout(clearTimer);
  clearTimer = setTimeout(clearVideo, FADE_MS + 100);
}

function clearVideo(): void {
  clearTimer = undefined;
  if (video) {
    video.onended = null;
    video.pause();
    video.removeAttribute("src");
    video.load();
  }
  revokeUrl();
}

function revokeUrl(): void {
  if (url) URL.revokeObjectURL(url);
  url = null;
}
```

- [ ] **Step 5: The trigger**

`onGameData` keeps its edge and its comment, and ends with:

```ts
  if (!won) return cancel();
  capture(performance.now());
}

/**
 * Hold on to the take with this leg's run-up, and stop it once the seconds
 * after the gameshot are in. `won` is when the leg was won.
 */
function capture(won: number): void {
  if (!config) return;

  const from = won - config.before * 1000;
  // The newest take already rolling when the run-up began; early in a match, the oldest there is.
  const take = takes.filter(candidate => candidate.start <= from).at(-1) ?? takes[0];
  // A page opened on a leg that was already won has nothing from before the dart.
  if (!take || won - take.start < MIN_RUN_UP_MS) {
    console.warn("Autodarts Tools: Instant Replay - nothing recorded before the winning dart");
    return;
  }

  const id = ++replay;
  held = take;
  // The next leg is recorded in a take of its own.
  rotate();

  clearTimeout(captureTimer);
  captureTimer = setTimeout(() => {
    captureTimer = undefined;
    void finishCapture(id, take, from, won);
  }, config.after * 1000);
}

/** The seconds after the gameshot are in: stop the take and put it on screen. */
async function finishCapture(id: number, take: Take, from: number, won: number): Promise<void> {
  const length = performance.now() - take.start;
  const footage = await stopTake(take);
  if (held === take) held = null;
  if (id !== replay) return;
  if (!footage) {
    console.warn("Autodarts Tools: Instant Replay - nothing recorded");
    return;
  }
  await present(id, footage, Math.max(0, from - take.start), length, won);
}

/** The win was taken back: drop the replay being put together, or put away the one on screen. */
function cancel(): void {
  replay++;
  held = null;
  clearTimeout(captureTimer);
  captureTimer = undefined;
  hide();
}
```

- [ ] **Step 6: Lint the staged file**

`npx eslint --stdin --stdin-filename entrypoints/match.content/instant-replay.ts -f unix < <stage>/entrypoints/match.content/instant-replay.ts`, compared with the same run on `git show HEAD:entrypoints/match.content/instant-replay.ts`. Expected: nothing new.

---

### Task 4: The settings rows

**Files:**
- Modify: `components/Settings/InstantReplay.vue:7-9` (intro), `:97-118` (Replay section) and the script's computed block (`:239-249`)

**Interfaces:**
- Consumes: `config.instantReplay.before` and `.after` (Task 2).

- [ ] **Step 1: The rows**

```vue
              <OptionRow description="How much of the run-up to the winning dart the replay shows." title="Before the gameshot">
                <AppNumberInput
                  v-model="config.instantReplay.before"
                  :max="30"
                  :min="1"
                  label="Before the gameshot"
                  unit="s"
                />
              </OptionRow>
              <OptionRow description="And how much of what follows it." title="After the gameshot">
                <AppNumberInput
                  v-model="config.instantReplay.after"
                  :max="10"
                  :min="0"
                  label="After the gameshot"
                  unit="s"
                />
              </OptionRow>
              <OptionRow :description="startDelayHint" title="Start delay">
                <AppNumberInput
                  v-model="config.instantReplay.startDelay"
                  :max="10"
                  :min="0"
                  label="Start delay"
                  unit="s"
                />
              </OptionRow>
```

```ts
/** Start delay's line, which says so when the seconds after the gameshot hold the replay back for longer. */
const startDelayHint = computed(() => {
  const after = config.value?.instantReplay?.after ?? 0;
  if (after <= (config.value?.instantReplay?.startDelay ?? 0)) return "From the won leg to the replay, leaving room for autodarts' own celebration.";
  return `From the won leg to the replay. The ${after} s after the gameshot have to be filmed first, so it starts after ${after} s.`;
});
```

- [ ] **Step 2: Compile the SFC**

Run `@vue/compiler-sfc` `parse` + `compileScript(…, { inlineTemplate: true })` on the staged file. Expected: no errors.

- [ ] **Step 3: See it**

Once landed (Task 6), open the dialog in a tab of my own with the fake camera (`fake-camera.js`, `ok`) and check:
- the three rows and their lines
- the line change when *After* goes above *Start delay*
- the page at 390 px wide

---

### Task 5: The end-to-end run in the dev Chrome

**Files:**
- Create: `<scratchpad>/replay-e2e.mjs` (harness), `<scratchpad>/clock-camera.js` (isolated-world setup)

- [ ] **Step 1: The isolated-world setup** (`clock-camera.js`), which installs:
  - a 640×480 canvas drawing `Math.round(performance.now())` as 32 black and white blocks, 20 px each, along the top at 60 Hz
  - `getUserMedia` returning a `clone()` of its 30 fps `captureStream`
  - a `MediaRecorder` subclass logging each recorder's start and stop
  - a `chrome.storage.onChanged` listener logging when `game-data` turns won or not won
  - a `MutationObserver` on `#adt-instant-replay[data-open]`, which on open decodes the frame on show, then every frame through `requestVideoFrameCallback`

- [ ] **Step 2: The harness (`replay-e2e.mjs`), in order:**
  1. refuse to run if another tab is on `/matches/` or `/boards/`
  2. save `urlstatus` and the user's `adt:last-visited-url`
  3. write the test config: from the backup, Instant Replay on with `deviceId: "test-clock"`, and everything noisy off (Caller, Sound FX, WLED, Animations, …)
  4. open its own window on `/`, and install `clock-camera.js` in the extension's isolated world
  5. create a 121 lobby with the guest `ADT Test` and a 30-PPR bot, `legs: 5`, and start it
  6. enter the match client-side (`pushState` + `popstate`), so the isolated world and its camera survive
  7. play the scenarios:
     - **A:** before 4, after 2, delay 3. Record 10 s, then T20 T20 S1.
     - **U:** the next leg: T20 T20 S1, undo 0.5 s later, then S1 again 2 s after that.
     - **B:** before 3, after 5, delay 1, re-entered client-side. Record 40 s, then T20 T20 S1.
     - Between legs, `Space` for the next leg, waiting through the bot's visit.
  8. `finally`: restore the config first, then abort the match, park the window at `about:blank` and close it, then restore `last-visited` and `urlstatus`

- [ ] **Step 3: What passes**
  - **Scenario A:**
    - the first frame on show is W − 4000 ms (±100)
    - the last frame is W + 2000 ms (±200)
    - it opens at W + 3000 ms (0 to +400)
  - **Scenario U:**
    - no open within 6 s of the undone win
    - the re-win opens a replay whose first frame is the re-win's W − 4000 ms
  - **Scenario B:**
    - first frame W − 3000, last W + 5000
    - it opens at W + 5000 to +5400, not at W + 1000
    - the recorder log shows takes starting 30 s apart, and each older one stopped 4 s after the next started
  - **Always:** at most three recorders live at once; none live after the match is left.

---

### Task 6: Land, document and check

**Files:**
- Modify: `README.md` (the Instant Replay section)
- Modify: `CHANGELOG.md` (new `## [Unreleased]` at the top)

- [ ] **Step 1: Land the staged files in one `cp`**, while no tab is on `/matches/`. Then check:
  - every bundle holds a literal from its change:
    - `match.js`: `nothing recorded before the winning dart`
    - `content.js`: `Before the gameshot`
  - the dev config migrated as Task 2 step 4 says

- [ ] **Step 2: README**, the Instant Replay bullets:

```markdown
  - Point any webcam at your board and pick it in the settings; a rolling recording is kept while you are in a match, and the seconds around the winning dart are played over the screen once the leg ends
  - This is your webcam, not the board's camera — the browser cannot reach that one. Nothing is uploaded and nothing is written to disk; the recording lives in memory and is dropped when the match does
  - **Before the gameshot** sets how many seconds leading up to the winning dart to play (1–30), and **After the gameshot** how many of what follows it (0–10). Both are counted from the moment autodarts reports the dart
  - **Start delay** sets how long to wait after the leg is won before the replay appears (0–10 seconds), leaving room for autodarts' own celebration. The seconds after the gameshot have to be filmed first, so the replay never appears sooner than those
```

- [ ] **Step 3: CHANGELOG**, under a new `## [Unreleased]` → `### Changed`:

```markdown
- **Instant Replay** plays from a set number of seconds before the gameshot to a set number after it. *Duration* is now *Before the gameshot* and keeps its number, and *After the gameshot* is new, starting at your *Start delay*. The replay used to be counted back from the moment it appeared, so it ran on past the winning dart for as long as the start delay, and it played whole stretches of recording that added up to at least *Duration*: at the defaults, anywhere from 7 to 17 seconds of run-up, changing from leg to leg. It now plays what is set, 10 seconds before the dart and 3 after by default. The start delay still holds the replay back for autodarts' own celebration, but never past the seconds after the gameshot, which have to be filmed first
  - The recording is a run of overlapping takes rather than back-to-back segments. Each take starts while the one before is still recording and is kept until the new one holds a whole run-up of its own, so whenever a leg is won, one take goes back far enough. That take records on through the seconds after the gameshot and is played from the second the run-up starts. A replay is one file, with no seam anywhere in it. A second recorder runs only for the overlap: the run-up plus a second, in every 30 seconds or more
  - Starting at that second takes a seek. The 3.0.0 entry below says seeking into such a recording is unreliable in Chrome. It isn't any more: a recording made in one piece carries its length and an index, and a seek lands on the frame. A browser that can't seek plays the whole take instead, showing more of the run-up, never less
```

- [ ] **Step 4: Checks**
  - `yarn compile` in the background, compared with the 14-error baseline (file list, not count)
  - ESLint on every touched file, compared with `HEAD`
  - `yarn build` for the tree-shaking check, since `storage.ts` now imports a new module

- [ ] **Step 5: Hand over:** no commit. Report what was verified and what was not (Firefox and Safari were not run).
