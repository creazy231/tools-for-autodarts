# How long each animation stays up (PR #254, merged onto the library design)

**Date:** 2026-09-26
**Pull request:** [#254](https://github.com/creazy231/tools-for-autodarts/pull/254), "Animations: set duration per animation", by @MeisterBob
**Status:** designed and built without approvals, at the user's request ("do not ask me back any questions since I'll be afk"). The choices below are the design's own and are listed for review under *Rulings*.

## The request

> please checkout https://github.com/creazy231/tools-for-autodarts/pull/254 and have a look on how we can get this merged into the current codebase since we heavy adjusted the tools for autodarts settings in the last commits made … debug and check implementation using the chrome browser thats running with yarn dev

The pull request, in its author's words: "Allows to set an individual duration for every animation. Defaults to whatever is set globally. Offers a button to get the duration from the gif file itself." It was written against 872f0ef (3.0.9), before the settings were rebuilt (e7e0d09, a76562e).

## What the pull request does

- `IAnimation.duration: number`, in seconds, with 0 meaning "use *Show for*". All 20 default animations get `duration: 0`.
- A migration in `entrypoints/content/migration-config.ts`, `config.version` 22 → 23, that writes `duration = 0` into every saved animation.
- In the old settings dialog, a millisecond field under the link with the global value as placeholder, and a **From GIF** button that fetches the GIF through `backgroundFetch` and adds up its frame delays.
- In the match, `resolveAnimation` returns `{ url, duration }` and `play()` holds the overlay for `animation.duration || animations.duration`.
- `gif-info` in `package.json` and `yarn.lock`.

## What was found

**Only the settings component conflicts.** A trial merge of `pr-254` into `main` conflicts in `components/Settings/Animations.vue` (5 hunks), whose dialog the pull request edits no longer exists in that form. `utils/storage.ts`, the migration, the match player and `package.json` merge cleanly. The branch also carries `03d44c4` (the AltStore bot's 3.0.9 commit), which `origin/main` has and local `main` does not yet.

**The migration is not needed, and it collides with #251.** A missing `duration` can mean "use *Show for*" the way a missing `ISound.volume` means 100% (354bb21): nothing saved before reads wrong, so there is nothing to migrate. The pull request's own description warns that it and #251 both take `config.version` 23, so whichever lands second has to be renumbered. The maintainer's schema changes since 0cca261 go through WXT's `CONFIG_VERSION` migrations in `utils/storage.ts` (at 13), not the old `config.version` switch.

**The GIF reading is wrong for three of the twenty default GIFs.** The pull request looks for the bytes `21 F9 04` anywhere in the file and adds the two bytes after them. Those bytes also turn up inside compressed image data. Measured on the 20 default GIFs, against a walk of the GIF's blocks and against Pillow:

| Default GIF (trigger) | Frames | Its run | The PR reads |
|---|---|---|---|
| `bulls-eye-animation.gif` (outside) | 263 | 8.77 s | 193.39 s |
| `bbc-america-darts-bbca.gif`, `sbknQ0…` (outside) | 21 | 2.10 s | 271.63 s |
| `sigh-growl.gif` (outside) | 33 | 3.30 s | 477.18 s |
| the other 17 | 18–191 | 1.80–10.40 s | the same as the walk |

**From GIF** on three of the four default *outside* animations would keep the board covered for three to eight minutes. The other problems with that code:

- When the response is not `image/gif`, it runs `TextEncoder` over the data: URL's text rather than decoding the file.
- It reads one byte past its loop bound.
- `gif-info` is never imported.

**Browsers do not play a frame of 10 ms or less for its length.** Chromium (`DeferredImageDecoder::FrameDurationAtIndex`), Firefox (`FrameTimeout::FromRawMilliseconds`) and WebKit (`ImageDecoderCG`, `ScalableImageDecoder`) all show such a frame for 100 ms. Measured in the dev Chrome with ten-frame test GIFs:

- frames of 0 and 10 ms each stayed up 100 ms;
- 20 ms frames played at 20 ms.

A GIF made with zero delays therefore runs ten times longer than its delays add up to.

**A GIF starts again from its first frame every time it is shown.** The overlay's `<img>` is created afresh on each show (`v-if`). Measured in the dev Chrome by sampling screenshots of a test GIF:

- a new `<img>` on the same URL, 300 ms or 1 s after the last one was removed, began at frame one;
- a blob: URL did the same.

So a length of one run covers the whole GIF on every play, as long as the GIF has loaded.

**The first play of a GIF is not loaded when the clock starts.** `play()` mounts the overlay after *Start delay* and starts the hide timer at the same moment. The `<img>` only begins downloading then. The default GIFs are 0.14–7.6 MB and took 0.3–0.5 s here (more on a slow network), and that time came off the end of the first play. With the default 5 s nobody noticed. With a length of exactly one run, the ending gets cut.

## Approaches

1. **Merge it as it is, then fit its field into the new editor.** Keeps the migration, the collision with #251 and the misreading scan. Turned down.
2. **Merge it for its history and credit, then rework it in a follow-up commit.** *Chosen.* GitHub marks #254 merged once `main` is pushed, and @MeisterBob keeps the commit. The follow-up changes what the review above found, and fits the feature into the library design.
3. **Re-implement it and close the pull request with thanks.** Loses the contributor's merge for no gain: the data model and the player change are right as they are.

## Decisions

1. **The merge commit is mechanical.** It is GitHub's default subject (`Merge pull request #254 from MeisterBob/animation-duration`). In the conflicted settings component it takes `main`'s version, since the dialog the pull request edits is gone. It adds `duration: 0` to the two animations that component creates, as the pull request itself does, so the merge type-checks. Everything else is the pull request as it merges. The follow-up commit then makes the changes below.

2. **Stored as `IAnimation.duration`, optional, in seconds.** A missing value means *Show for*, so every saved animation plays as before. The value is only written when an animation has a length of its own. Also:
   - The migration, the `config.version` bump and the twenty `duration: 0` defaults go, so #251 keeps its version 23.
   - A 0 already saved by a build of the pull request reads as missing too.
   - Read it through `animationDuration(animation, showFor)` in `utils/animation-duration.ts`, never directly. It returns the animation's own seconds when they are a finite number of at least 0.1, and `showFor` otherwise. That covers a string, a negative number, NaN or a 0 from an imported or hand-edited config, none of which may reach `setTimeout`.

3. **A GIF's run length is read by walking its blocks.** `gifRunLength(bytes)` in `utils/animation-duration.ts` is pure and tested under tsx, and returns milliseconds or null. It:
   - checks the `GIF87a`/`GIF89a` header;
   - skips the global and local colour tables;
   - skips every extension's and image's data sub-blocks;
   - takes each frame's delay from the graphics control extension before it;
   - adds up the frames with the browsers' rule, where a delay of 10 ms or less counts 100 ms.

   It gives null when the file is not a GIF or has fewer than two frames, since a still picture has no run. A file cut short counts the frames that were complete. `gif-info` goes from `package.json` and `yarn.lock`.

4. **Reading a GIF's length in the editor.**
   - A GIF on a link is fetched through `backgroundFetch`, as the pull request does and the Caller's volume copies do. It comes back as a data: URL, which is decoded whatever its MIME type.
   - An uploaded GIF is read from the object URL its preview already uses.
   - The run is rounded to hundredths of a second, because GIF delays are in hundredths.

   Links on Tenor send `Access-Control-Allow-Origin`, so the relay reads them. A link the relay cannot read, or a file that is not an animated GIF, gets a line under the field saying the length could not be read, and nothing is changed.

5. **The editor.** The *Add an animation from a link* / *Edit animation* dialog gets a **Show for** field straight after the link or uploaded GIF, before Triggers, where the sound editor puts Volume:
   - A dense number field in seconds (`min` 0.1, `step` 0.1, any precision kept), with `s` after it. Its placeholder is the *Show for* option's value.
   - A neutral **Use the GIF's length** button beside it (not blue, since the dialog's blue button is Save). It is greyed out while there is no link and no uploaded GIF, and shows its loading state while it reads.
   - A hint under the field, "Leave it empty to use the Show for option (5 s)." A failed read replaces it with the error, in the dialog's own error colour.
   - Saving:
     - An empty field, 0 or a negative number saves no `duration`.
     - Anything between 0 and 0.1 s saves 0.1 s.
     - Everything else is rounded to hundredths.
   - Editing keeps an animation's length unless it is changed.
   - The uploaded-GIF line becomes "Kept in this browser as {name}. Its triggers and how long it stays up can be changed."

   **Upload GIFs** adds GIFs without a length of their own, as before.

6. **The grid shows a length of its own.** An animation with its own length has a small chip at the bottom right of its picture: a timer icon and "2.37 s", titled "Stays up for 2.37 s". The number drops trailing zeros ("4 s", "4.5 s"). It is the same `adt-chip` on black as the *Off* chip at the bottom left. The chip is neutral: colour means on or playing, nothing else. Animations without a length of their own show nothing, as the sound rows show no volume at 100%.

7. **The player loads the GIF during the start delay, and starts the clock once it has loaded.** When and which GIF appears stays as it is, since a later trigger replacing an earlier one before it shows (a 180, then its three-dart combination 500 ms later) depends on that schedule. Only these change:
   - `play()` starts loading the picked GIF into a detached `Image` as soon as the trigger fires. With the defaults (1 s delay, GIFs loading in 0.3–0.5 s) the GIF is ready when the overlay appears, and runs from its first frame.
   - The hide timer starts when the overlay's picture has loaded (its `load` event, or at once when it already has), not when the overlay is mounted. A download slower than the start delay then no longer cuts the end off. The wait is capped: a GIF that never loads is hidden 3 s after its duration would have ended.
   - A GIF whose preload failed is not shown, and one that fails while on screen is hidden. Today a dead link puts up an empty overlay for the whole duration, and in *Full page* that blurs the page for nothing.
   - Uploaded GIFs are blob: URLs and load at once.

## Rulings

These are the calls made without the user, for review:

1. Merge the pull request (approach 2) rather than re-implement it, with a mechanical merge commit and a separate `feat:` commit for the rework.
2. No migration. The field is optional, so #251 keeps `config.version` 23.
3. The pull request's GIF scan and the unused `gif-info` dependency are replaced by a tested block walk that applies the browsers' 100 ms rule.
4. Seconds, not milliseconds, in the editor, to match *Start delay* and *Show for*. The minimum is 0.1 s, not the option's 0.5 s, because some GIFs run shorter than half a second.
5. The button is named for what it does: **Use the GIF's length** rather than **From GIF**.
6. A length chip on the grid, which the pull request did not have.
7. The player preloads the GIF during the start delay, starts the clock once it has loaded (waiting at most 3 s), and skips a GIF that fails to load. This goes beyond the pull request. Without it, "the GIF's length" cuts the end off the first play of a GIF that isn't cached yet, and Tenor lets its links be cached for an hour or a day.
8. Commits stay local on `main`. Nothing is pushed, and #254 gets no comment until the user has looked.

## Not doing

- Reading lengths automatically when GIFs are uploaded or added. The pull request makes it a button, and a default of *Show for* keeps every existing setup as it is.
- A GIF's loop count. One run is one pass, which is also the whole GIF for one that plays once and stops.
- More than one run ("show it twice"). The field takes any number of seconds.
- Renumbering #251. It keeps its version 23 now; the note on #254 about rebasing no longer applies.

## Parts

- New: `utils/animation-duration.ts` (pure, tested under tsx): `MIN_ANIMATION_DURATION`, `animationDuration(animation, showFor)`, `gifRunLength(bytes)`, `bytesOfDataUrl(dataUrl)`, `roundedSeconds(ms)`.
- Changed:
  - `utils/storage.ts` (`IAnimation.duration?`, no default entries, no version change)
  - `entrypoints/content/migration-config.ts` (the pull request's `case 22` goes)
  - `components/Settings/Animations.vue` (the field, the button, the chip)
  - `entrypoints/match.content/Animations.vue` (the duration through `animationDuration`, and the wait for the GIF)
  - `package.json` and `yarn.lock` (without `gif-info`)
  - `README.md`, `CHANGELOG.md`

## Testing

- **tsx:**
  - `gifRunLength` on built GIFs: frame delays, the ≤ 10 ms rule, local colour tables, comment and application extensions, a frame with no graphics control extension, a single frame, not a GIF, and a file cut short;
  - `gifRunLength` on the 20 default GIFs downloaded to the scratchpad, against Pillow's frame count and total;
  - `animationDuration` on missing, 0, junk, below the minimum and valid values;
  - `bytesOfDataUrl` and `roundedSeconds`.
- **The yarn dev Chrome, in a tab of my own,** with the user's config backed up and restored:
  - the field, the placeholder and hint, **Use the GIF's length** on a default link (one the old scan misread) and on an uploaded GIF, the error for a link that is not a GIF, saving, editing again, and clearing;
  - the stored config has `duration` only where one was set;
  - the chip on the grid, at 1600 and 390 px.
- **The player,** in a bot match with game-data injected: an animation with its own length stays up for it, and one without stays up for *Show for*. The first play of a GIF that isn't cached yet appears loaded, and a dead link shows nothing.
- `yarn compile` against the 14-error baseline, ESLint on the touched files, SFC compile checks, `yarn build`.
