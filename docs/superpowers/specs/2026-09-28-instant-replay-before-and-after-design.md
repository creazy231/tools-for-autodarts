# Instant Replay: seconds before and after the gameshot

**Date:** 2026-09-28
**Status:** designed and built without approvals, at the user's request ("dont ask me back anything since I'll be afk for a while"). The choices are the design's own and are listed for review under *Rulings*.

## The request

> I want you to work on the Instant Replay feature of Tools for Autodarts … Once you're done working on that feature I want it to be possible to enter X seconds before the gameshot, and X seconds after the gameshot in settings. These inputs then getting used for the replay video display. work on this please using the chrome browser which is running with yarn dev right now

## What the replay does today

`entrypoints/match.content/instant-replay.ts` records the webcam with `MediaRecorder`, cut into segments of *Duration* seconds (at least 3), and keeps the last two. When a leg is won (W) it waits *Start delay*, closes the segment being recorded, and plays the newest whole segments that add up to at least *Duration*, back to back.

The replay therefore ends at W + *Start delay*, not at the dart. How much of the run-up it holds depends on where the segment boundary fell:

| Setting | What the settings page says | What plays |
|---|---|---|
| *Duration* (10 s) | "Before the winning dart. A little more may show, never less." | 10 to 20 s ending at W + 3 s: 7 to 17 s before the dart |
| *Start delay* (3 s) | "From the won leg to the replay" | also how much of what follows the dart is shown |

There is no way to say how much comes after the dart, and the run-up varies by up to one segment from leg to leg.

## What was measured (dev Chrome 154, 2026-09-28)

A canvas clock was recorded as the camera and every frame read back, in a throwaway page (`scratchpad/spike/`):

- **A `MediaRecorder` file can be seeked exactly.** Recorded without a timeslice, which is how this feature records, Chrome 154 writes a known-size Segment, a `Cues` index and the duration: a 20 s take reported `duration` 19.99 and `seekable` [0, 19.99]. Nine seeks between 0 and 19.5 s each landed within ±11 ms of the frame asked for (a third of a frame at 30 fps), in 3 to 50 ms.
- **Playback from a seek point is continuous.** From 12 s to the end, 240 frames played in 8.0 s with no gap over 52 ms, ending on the take's last frame.
- **Media time 0 is the frame current at `start()`.** The first frame carried a clock 16 ms before the `start()` call, so `performance.now()` at `start()` places the footage to within a frame.
- **A keyframe every 100 frames.** 7 clusters and 7 keyframes in 601 frames.
- **Two recorders can share one stream,** and each VP9 recorder at 640×480 cost about 8% of one core (0.81 s of renderer CPU per 10 s, measured with `SystemInfo.getProcessInfo`).

The file's own comment and the 3.0.0 changelog say seeking such a file "is unreliable in Chrome and worse elsewhere". That no longer holds for Chrome. Firefox and Safari were not measured, so the design keeps a fallback for a seek that doesn't land.

## Approaches

1. **One recorder, rotated, seeked and joined.** Keep the segments, seek into the first one and play the rest after it. One encoder at all times, but a clip can span a segment boundary at any point, the throw included. Each boundary loses the frames between one recorder stopping and the next starting, plus a load at the switch. Turned down for that seam.
2. **Overlapping takes: one file per replay (chosen).** Start a new take while the previous one is still recording, and keep the previous one until the new one holds a whole run-up. At any moment, then, there is a take that started at least *before* seconds ago. On a win, that take is kept recording until the *after* seconds are in, stopped, and played from the right second. There is one seek, at the start, and no seam anywhere. Two encoders run only for the overlap: *before* + 1 s in every 30 s or more.
3. **A frame ring buffer through WebCodecs or Media Source Extensions.** Exact at both ends and seamless, but `MediaStreamTrackProcessor` is Chrome-only, and iPhone Safari has no plain `MediaSource`. Turned down: a second recording pipeline for one feature.

## Design

### Settings (Replay section)

| Row | Control | Line under the title |
|---|---|---|
| **Before the gameshot** | `AppNumberInput` 1–30 s | How much of the run-up to the winning dart the replay shows. |
| **After the gameshot** | `AppNumberInput` 0–10 s | And how much of what follows it. |
| **Start delay** | `AppNumberInput` 0–10 s (unchanged) | From the won leg to the replay, leaving room for autodarts' own celebration. When *After* is longer: `From the won leg to the replay. The {after} s after the gameshot have to be filmed first, so it starts after {after} s.` |
| **Covers** | unchanged | unchanged |

*Duration* goes. The panel's opening line becomes "…the winning dart is played back over the screen whenever a leg is won, from a few seconds before it to a few after."

### Stored shape

`IConfig.instantReplay` loses `duration` and gains `before` and `after`, both in seconds. The defaults are before 10, after 3 and start delay 3.

- `utils/instant-replay.ts` (new, runtime-import-free like `utils/colors.ts`) holds `defaultInstantReplay()` and `normalizeInstantReplay(saved)`:
  - `before` = saved `before`, else the old `duration`, else 10
  - `after` = saved `after`, else the old `startDelay`, else 3
  - `startDelay` = saved `startDelay` when it is a number of seconds, else 3
  - missing fields come from the defaults; `duration` and the long-dead `delay` are dropped
- **WXT migration 14** (`CONFIG_VERSION` 13 → 14) runs it on the stored config.
- **Imports** (file and clipboard, `PageConfig.vue`) run it next to `normalizeColors`, because an old export is merged over the defaults unmigrated.
- **The settings page** runs it on load (`withDefaults` in `composables/useConfig.ts`), next to `normalizeColors`. The migration dialog's legacy branch writes old settings back as they were, after migration 14 has already run, and without this *Before* and *After* would show as empty fields. Added after the final review.
- **The match script** reads its config through it too, so an old shape never reaches the recorder.

The old *Duration* was labelled "Before the winning dart", so it carries over as *Before*. *After* starts from *Start delay*, the time the old replay ran on past the dart. The start delay itself is unchanged.

### Recording

- A **take** is one `MediaRecorder` on the camera stream, started with no timeslice. It keeps its `performance.now()` start and a promise of its footage, which the recorder hands over in one piece on `stop`.
- **Rotation:** a new take starts every `max(30 s, 2 × overlap)`, where overlap = *before* + 1 s.
- **Retirement:** *overlap* after a take starts, every older take is stopped and its footage dropped, except one a won leg is holding. The newest take then holds a whole run-up by itself.

### A won leg

At W (the game-data edge the feature already uses):

1. **Pick the take:** the newest one that started at or before W − *before*. Early in a match, when none has, the oldest one. If even that one started less than a second before W (a page opened on a leg that was already won), there is nothing before the dart to show, and no replay.
2. **Hold it:** the take is exempt from retirement, and a fresh take starts, so the next leg has one of its own.
3. **Stop it:** at W + *after* the held take is stopped, and its footage is loaded into the overlay's `<video>`. The overlay seeks to W − *before* − the take's start (0 if the take started later) while it is still invisible.
4. **Show it:** at W + *start delay*, or as soon as the footage is ready if that is later, the overlay fades in and plays. It ends on the take's last frame, W + *after*. It is on screen for about *before* + *after* seconds.

A generation counter invalidates every step still waiting when the win is taken back or the match is left, so nothing stale can open.

### When the win is taken back

As today:

- **Before the take is stopped:** the take is released to the normal retirement.
- **While the footage loads or waits:** it is dropped.
- **On screen:** the replay fades out.

### When things fail

- **No `loadedmetadata`, or no `seeked`, within 3 s, or a seek that lands more than a second from the run-up:** the replay plays from wherever the video is, the start of the take at worst, a longer run-up rather than a shorter one, and logs why. A seek into a part of the file the browser can't reach is clamped and still reports `seeked`, so where it landed is what counts (found in the final review, pinned by a clamped-seek scenario).
- **A recorder that never reports back:** stopping a take resolves after 1.5 s at most, and no replay follows. As today.
- **A camera unplugged mid-match:** starting a take throws, and rotation stops. A held take still plays what it has.
- **The overlay's safety timer** runs from where the picture really starts to the end of the take (the video's own duration, or the measured length where the browser doesn't know it), so a fallback clip is not cut short.

## Testing

- **`normalizeInstantReplay` under tsx + `node:test`:**
  - old shapes: defaults, and a *Duration* and *Start delay* that were changed
  - partial and junk values
  - the current shape, which must come back unchanged
  - the migration applied to the dev config's real value
- **End to end in the yarn dev Chrome, in a tab of my own:**
  - a clock camera stubbed into the extension's isolated world
  - a 121 bot match through the API, the win thrown as T20 T20 S1
  - every replayed frame read back through `requestVideoFrameCallback`, compared with W as the isolated world's own `storage.onChanged` saw it
  - cases:
    - before 4 / after 2 / delay 3
    - after longer than the delay
    - a win after the first rotation
    - an undo during the *after* seconds
    - a second leg
- **Checks:**
  - `yarn compile` against the 14-error baseline
  - ESLint on the touched files
  - `yarn build` for the tree-shaking trap

## Rulings

1. *Duration* is replaced, not kept beside the two new settings: *before* + *after* is the replay's length.
2. *Start delay* stays and keeps its meaning. It can't bring the replay forward past the *after* seconds, which have to be filmed first, and its line says so when that happens.
3. Defaults are before 10 and after 3: the old *Duration*'s number, and the old start delay's worth of what follows the dart.
4. Migration: *Before* takes the old *Duration*, *After* takes the old *Start delay*.
5. Overlapping takes (approach 2) over one rotated recorder. The cost is a second encoder for *before* + 1 s in every 30 s or more (about 8% of a core at 640×480 in Chrome), and in return there is never a seam in a replay.
6. The seconds count from when autodarts reports the winning dart, which is when the feature learns of it. That is a moment after the dart lands with a board, and later still when scores are typed in.

## Out of scope

- Saving replays (#154), other triggers and playing beside GIFs (#155).
- The What's New dialog, which describes 3.0 and is the maintainer's to write per release.

## After review

A fresh review of the whole change found one important problem, and a smaller one was graded up by
its effect. Both are fixed, each with a test that failed first:

- **A seek the browser couldn't honour cut the replay short of the gameshot.** A position outside
  `seekable` is clamped, and `seeked` still fires. So a seek that landed at 0 counted as cued, and the
  safety timer, set for the clip from the run-up on, took the whole take off screen part way through.
  The end-to-end harness gained a scenario that clamps every seek to 0. There, the last frame shown
  was 4.8 s *before* the dart. Now a seek counts only if it lands within a second of the run-up, and
  the timer runs from where the picture really starts. The whole take plays, through to the dart and
  the *after* seconds.
- **The settings page showed *Before* and *After* as empty fields** for settings the migration
  dialog's legacy branch writes back as they were, after migration 14 has run. A config seeded in
  that shape showed both fields empty. The page now runs the normalizer on load, as it does for
  Colors, and shows 7 and 2 for a *Duration* of 7 and a *Start delay* of 2.

Left as they are, for a later change:

- A replay that ends, or is called off, during a click-started fade loses its picture before the
  fade is over.
- A win during an overlap starts a third recorder for the length of the overlap. A win taken back
  after retiring has already run leaves its take recording until the next rotation.
- A run-up that starts at 0 still seeks there. An engine that skips a seek to where it already is
  would wait 3 s, inside the start delay.
- The old-shape literal in `migration-config.ts` can no longer run, and could go.

Firefox and Safari have still not been run. The review suggested a Firefox check before the release
that ships this: a win about 40 s into a match, checking that the last frame is the dart.
