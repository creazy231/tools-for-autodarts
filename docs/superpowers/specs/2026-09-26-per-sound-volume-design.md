# A volume for every sound in the Caller and Sound FX

**Date:** 2026-09-26
**Issue:** [#253](https://github.com/creazy231/tools-for-autodarts/issues/253), "Louder Bull sound + individual volume slider per sound"
**Status:** designed and built without approvals, at the user's request ("I want you to work on this without me need to interact"). The choices below are the design's own.

## The request

> implement a vol slider for each sound editable in caller and sound fx settings from 0% to 200% where 100% is default

The issue asks for two things: the Bull sound as loud as T20 and the others, and a volume per sound so
each can be tuned on its own. The slider is the answer to both. The default stays 100% for every sound,
the Bull included.

## What was measured first

**The default Bull really is quiet.** Sound FX ships its dart sounds from `autodarts.x10.mx`. Measured
with ffmpeg (`ebur128`, `astats`):

| Sound | File | Loudness | Peak |
|---|---|---|---|
| `ambient_bull` | `beep_2_bullseye.mp3` | −21.9 LUFS | −13.3 dBFS |
| `ambient_t20` | `beep_2_20.wav` | −9.5 LUFS | −2.0 dBFS |
| `ambient_t19`, `ambient_t17` | `beep_2_19.wav`, `beep_2_17.wav` | −13.1 LUFS | −2.0 dBFS |
| `ambient_t18` | `beep_2_18.wav` | −15.1 LUFS | −1.5 dBFS |

The Bull is 12 dB quieter than T20 and 9 dB quieter than T17 and T19. 200% is +6 dB, so it brings the
Bull to −15.9 LUFS: level with T18, still below the others, and with its peak at −7.3 dBFS nothing clips.
Closing the whole gap needs a louder recording (the file has 13 dB of headroom), not a wider slider.

**An `<audio>` element cannot go above its file.** `HTMLMediaElement.volume` is 0 to 1; anything else
throws. On iOS and iPadOS it cannot be set at all and always reads 1.

**Not every linked file can be read.** Anything louder than the file means working on its samples, so
the extension needs the file's bytes. From the content script a fetch is the page's, bound by CORS; the
background's relay (`backgroundFetch`) is bound by the host permissions. Checked from the dev Chrome:

- `autodarts.x10.mx` sends no CORS headers, but it is in `host_permissions`, so the relay reads it. That
  covers eleven of Sound FX's thirteen default sounds, the Bull among them.
- `myinstants.com`, which hosts the default *busted* and *gameshot*, has neither. The relay's fetch fails.
  It is also the site people most often link sounds from.
- Uploaded files and imported caller sets are in IndexedDB (or the config) already.

**Speech has no volume above its own.** `SpeechSynthesisUtterance.volume` is 0 to 1 and the speech never
passes through anything the page could amplify.

## Decisions

1. **Stored as `ISound.volume`, a whole percentage, optional.** 0–200, or 0–100 for text to speech. A
   sound without it plays at 100%, so every config saved before this plays exactly as it did and no
   migration is needed. It is only written when it is not 100, so untouched sounds, exports and imports
   look as they did. Export, import and the IndexedDB migration all carry whole sound objects, so the field
   travels with them.

2. **How a volume is played.** Per sound, as it is taken off the queue (`planVolume`, pure):
   - **100%:** as today. The element's volume is set to 1 on every play, because pool elements are shared
     and the last sound on one may have been quieter.
   - **0%:** nothing plays, and the queue moves straight on, so a silenced "triple" does not hold up its
     "20".
   - **Below 100%:** the `<audio>` element's own volume, where the browser lets a page set it. iOS does
     not, so there it gets a quieter copy, the same way as above 100%.
   - **Above 100%:** a louder copy of the file.

3. **A louder copy is a new file, not Web Audio on the element.** The copy is made from the file's bytes:
   decoded (`decodeAudioData` on an `OfflineAudioContext` at 44.1 kHz), every sample multiplied and
   clipped at full scale, written out as 16-bit WAV, and played from a `blob:` URL through the same pool
   elements, lanes and unlock code as any other sound. Routing the element through a `GainNode` would have
   been less code, and was turned down for four reasons:
   - A linked file from a site without CORS goes silent through `MediaElementAudioSourceNode`, and
     Sound FX's default links are such files.
   - On iOS, Web Audio follows the ring/silent switch and `<audio>` does not. Routing sounds through it
     would silence them for iPad users on silent.
   - An `AudioContext` needs its own unlock by a user gesture, next to the one the engines already have.
   - Playback stays on the lane and pool code that was tuned to stop long sounds blocking short ones
     (the head-of-line fix). A copy has the file's duration, so the lanes treat it the same.

   Each engine and each settings panel owns a `soundCopies()` cache: one copy per source and volume, kept
   while it is open and revoked when it closes (the match or lobby is left, the panel unmounts). A linked
   file's bytes are fetched once. Failures are remembered, so an unreadable link costs one failed fetch
   per page, not one per dart. When an engine starts, it makes the copies its enabled sounds will need,
   one after another and at most 32, so the first bull of the match does not wait for a fetch.

4. **A link that cannot be read plays at 100% at most.** Turning it down still works, through the
   element's volume (not on iOS). The edit dialog says so as soon as such a link is set above 100%. It
   checks by reading the link once, then suggests uploading the file instead. A copy that fails for any
   other reason (a file the browser cannot decode) does the same: it plays the file as it is.

5. **Text to speech goes from 0 to 100%**, through `utterance.volume`. Its slider stops at 100% and
   says why.

6. **The queue.** A sound waiting for its copy holds its lane, as a sound read from IndexedDB already
   does. The lane's watchdog (6 s for the Caller, 3.5 s for Sound FX) still covers the wait. If the lane
   is given up in the meantime (the watchdog, or the match stopping every sound when a dart is being
   corrected), the sound is dropped rather than played late. The same guard stops a failed play from
   releasing a lane that has moved on to another sound.

7. **The settings.** Built from the parts the dialogs already use (see the settings design language and
   `2026-09-26-settings-dialogs-library-language-design.md`):
   - **A Volume field in both editors:** "Add a sound from a link" / "Edit sound" and "Generate a sound" /
     "Edit text-to-speech sound". A new `VolumeField` holds, in order:
     - the label with its value, as the TTS editor shows Speed and Pitch ("Volume 150%")
     - a quiet grey reset button (the Colors reset icon), shown only when the value is not 100%
     - the `AppSlider` the dialogs use: 0–200% or 0–100%, steps of 5, not focused on opening
     - a hint under it

     In the sound editor it comes straight after the link or uploaded file, next to the play button that
     plays it, and before Name and Triggers. In the TTS editor it follows Speed and Pitch. Uploading
     files and importing a caller set add sounds at 100%.
   - **The list shows a sound's volume** when it is not 100%, after the sound's source in the row's second
     line: "· 150%" with a volume icon (up, down, or off at 0%). The source truncates first, so the volume
     is never cut off.
   - **Previews play at the volume.** This covers the row's play button, the editor's play button (the
     draft volume, before saving) and the TTS editor's *Listen*, all through the same rules and a copy
     cache of the panel's own.
   - `AppSlider` gets a `label` prop, the thumb's accessible name, and says its value through
     `aria-valuetext` in the slider's own format ("150%").

## Not doing

- A volume for the whole feature. The issue asks for one per sound. Turning up a whole caller set one
  sound at a time is slow, and a bulk action under **⋯** would be the next step if that turns out to matter.
- Changing the default Bull's volume or file. The user set 100% as every sound's default. How far 200% goes
  is in the table above.
- A range beyond 200%, and live volume changes while a preview is playing: the next play uses the new
  volume.
- Volume in the upload and import flows.

## Parts

- `utils/sound-volume.ts` (pure, tested under tsx): `DEFAULT_VOLUME`, `MAX_VOLUME`, `MAX_TTS_VOLUME`,
  `VOLUME_STEP`, `soundVolume(sound)` (the stored value made safe), `planVolume(percent, elementVolumeWorks)`,
  `fallbackVolume(percent)`, `encodeWav(channels, sampleRate, gain)`.
- `utils/sound-copies.ts` (browser): `elementVolumeWorks()`, `soundCopies()` returning
  `{ copyAt(source, percent), readable(url), forget() }`, and `prepareCopies(copies, sounds, sourceOf)`.
- `components/Settings/Library/VolumeField.vue`, `components/Settings/Library/VolumeBadge.vue`,
  `composables/useLouderCheck.ts` (the dialog's link check).
- Changed: `utils/storage.ts` (`ISound.volume`), `components/AppSlider.vue`, `composables/useTTS.ts`,
  `SoundDialog.vue`, `TtsDialog.vue`, `Caller.vue`, `SoundFx.vue`, `entrypoints/match.content/caller.ts`,
  `entrypoints/match.content/sound-fx.ts`, `README.md`, `CHANGELOG.md`.

## Testing

- tsx: `soundVolume` (missing, junk, out of range, TTS cap), `planVolume` (every branch, with and without
  element volume), `encodeWav` (header fields, the gain, clipping, interleaved channels).
- The yarn dev Chrome, in a tab of my own, with the user's config backed up and restored:
  - Both editors: the field, reset, the TTS cap, saving and editing again, and the row's volume at
    1600 px and 390 px.
  - The link note, on the default *gameshot* link.
  - Previews measured: the copy the preview plays, decoded, has 1.5× the peak of the original at 150%.
  - The engine in a bot match. The Bull set to 150% plays a WAV copy with 1.5× the original's peak; 50%
    plays the original at element volume 0.5; 0% plays nothing; an unreadable link at 150% plays as it
    is, at volume 1.
- `yarn compile` (the 14 known errors, none new), ESLint on the touched files, `yarn build`.
- Not tested: Firefox, Safari, iOS (the dev browser is Chrome), and real hardware.

## After review

A fresh review of the whole change found one important problem, and three smaller ones were graded up
by their effect. All four are fixed, each with a test that failed first:

- **A copy that arrived late could play over the next sound.** While a sound waited for its copy, its
  pool element sat paused and looked free. So once the lane was given up (the watchdog, or every sound
  stopped for a correction), the next sound usually took that same element. The old check compared
  elements only, so the late copy still passed it and replaced the newer sound. Each lane now carries
  a hold counter, bumped whenever it is taken or given up, and a sound plays its copy only if the hold
  it took is still the current one. A Node harness runs the real engine code against a fake audio pool
  and a copy whose arrival the test controls. It showed the stale copy playing in four cases (stop and
  watchdog, both engines); every case now drops it.
- **The slider's thumb and pointer disagreed at its ends.** Keeping the thumb inside the track moved
  its centre up to 10 px from where the pointer mapping put it. Pressing the thumb at 0% of 0–200 gave
  5%, at 200% gave 195%, and the TTS volume's 100% gave 95%. The pointer now maps over the stretch the
  thumb's centre travels.
- **A copy that failed while being written rejected instead of resolving null**, for example when a
  long file runs out of memory. It then stayed rejected, so the sound was skipped for good rather than
  played as it is. The write is caught now.
- **At 100%, Sound FX called an async function without waiting for it**, so an error there went
  unhandled and the lane waited for the watchdog. The plan is now decided where the sound is started:
  a copy goes to its own function, which cannot reject, and everything else plays synchronously inside
  the old `try`, exactly as before.

Left as they are, for a later change:

- On iOS, an unreadable link turned *down* stays at 100%, and the editor says nothing about it.
- The settings keep a copy for each previewed volume until the dialog closes.
- A lobby prepares copies it rarely plays.
- The editor's note blames the site even when a link downloads but doesn't decode.

The review also suggested checking the copies in Firefox, where reading decoded samples across the
content script's boundary may be slow. That has not been done.
