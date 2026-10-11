# WLED previews: each effect's preset, drawn from the user's own WLED

**Date:** 2026-10-11
**Status:** designed and built without approvals, at the user's request ("Entscheide alles weitere selbst basierend auf deinen Empfehlungen, da ich erstmal AFK sein werde"). The calls made are listed under *Rulings*.

## The request

> Ich möchte, dass du schaust ob es möglich ist, irgendwie previews von den WLED presets einzubauen (vorausgesetzt der user gibt dann seine IP in die WLED settings ein. quasi soetwas, was hier bereits gemacht wurde: /Volumes/WD_BLACK/PROJECTS/wled-project/animations/dual/previews nur eben live vom WLED setup des users. […] Generell ist erstmal die Frage, ob es möglich ist. Wenn ja, baue das bitte in das WLED feature mit ein.

The previews in wled-project are LED-look GIFs (round LEDs on a dark panel, 10 px per LED), one per preset, rendered from the animation sources at build time. Wanted: the same look, but from whatever the user's own device holds.

## Is it possible? (measured 2026-10-11 on the user's WLED 16.0.1, ESP32, 64×8, two 32×8 panels)

Yes, without new permissions and without changing what the lights show.

- **The device serves everything a preview needs, with CORS.** `GET /presets.json` (56 KB, 170 presets), every GIF at `/<name>` (`image/gif`), `/json/info` (`leds.matrix {w:64,h:8}`), `/json/eff` (effect names) and `/json/fxdata` (slider meanings) all answer with `Access-Control-Allow-Origin: *`.
- **Every preset on the device is a GIF.** Segments use effect 53, *Image* (the GIF named by the segment's `n`, speed `sx`, 128 being normal), and effect 77, *Copy Segment* (the source segment's id in `c3`, per `/json/fxdata`: `,Color shift,Lighten,Brighten,ID,…`). The one-shots add a playlist that holds (preset 200, `{"n":"AD hold"}`) and then ends on a home preset. 139 GIFs, 32×8 or 64×8, all with disposal 1 and no transparency.
- **Reading from the browser:**
  - Chrome 155: a content script, the page and the extension's service worker can all `fetch` the device (`mode: "cors"`) and open its WebSocket. The service worker needs no host permission: the dev manifest lists none for the LAN.
  - Firefox 157: a content script's `cors` fetch to `http://192.168.…` fails with `NetworkError` before anything is sent (the `no-cors` requests the effects send do arrive). The background page fetches and opens the WebSocket fine, with `network.lna.blocking` on or off. An `<img>` from the device fails on the https page.
  - So reads go through the existing background fetch relay (`backgroundFetch` in utils/helpers.ts) in every browser.
- **A live mirror of the LEDs is not worth it.** `/json/live` answers `501 {"error":4}` (not in the release build). The WebSocket live view (`{"lv":true}`; binary frames `'L', 2, w, h`, then RGB) works from every context above, but came at 1.6–2.2 frames a second (gaps of 260–580 ms) in node and in Chrome, and WLED keeps one live-view subscriber: another client's `{"lv":false}` ends it.

## What is there today

- `IWled` effects of three types (`utils/storage.ts`): **PRESET** (`url` the device's address, `preset` its number; sent as `POST <address>/win/PL=<n>`), **URL** (a link, GET) and **API** (a JSON body POSTed to `url`). Every effect carries its device's address already.
- The WLED panel (`components/Settings/Wled.vue`) lists effects as `LibraryItem` rows: the play button in `#lead`, the type icon and `describe(effect)` in `#meta`. The effect dialog edits name, type, address, preset or JSON, and triggers, with **Test**.
- The background fetch relay returns a data URL and has no timeout.

## Approaches

1. **A live mirror.** Subscribe to the live view while the panel is open and show what the lights show. Works for every effect, but at about 2 frames a second, only while an effect is playing, with one subscriber per device, and the user has to press play on each effect to see it.
2. **Record each preset once.** Play it, capture the live view, cache the frames. Changes the lights for minutes, and the capture is as choppy as approach 1.
3. **Draw each preset from the device's own files (chosen).** Read `presets.json`, the layout and the GIFs, and draw the preset the way WLED would: a GIF per *Image* segment, scaled to the segment, at its speed; *Copy Segment* copies; *Solid* fills. Smooth (the GIF's own frame times), nothing on the device changes, and it covers every preset the user has. Effects WLED computes itself (Fire, Rainbow, …) can't be drawn, so those are named instead.

## Decisions

### Where the device and the preset come from

No address field: an effect already names its device. `presetRef(effect)` reads:
- **PRESET**: the address (`http://` added when missing), and `preset`.
- **URL**: the link's origin and a `PL=<n>` in it (`/win&PL=5`, `/win/PL=5`, `?PL=5`).
- **API**: the URL's origin and a top-level numeric `"ps"` in the JSON (placeholders filled with a stand-in name first).

Anything else (a link to another service, a JSON state without `ps`) has no preview. Effects on several devices each get their own device's preset.

### Reading the device: `utils/wled-device.ts`

- Through `backgroundFetch` with a new optional timeout (the relay gets `timeoutMs` and an AbortController; nothing else changes), 4 s for JSON, 6 s for a GIF.
- Per device, memoised for the page's lifetime: `/json/info` (layout: `leds.matrix` or `leds.count` × 1), `/presets.json`, `/json/eff`. Per GIF: its decoded frames. A failed read is remembered for 30 s, so a panel full of effects on an unplugged device asks once.
- Results: `{ ok: true, … }` or `{ ok: false, reason: "unreachable" | "not-wled" }`.

### Planning a preset: `utils/wled-preview.ts` (pure)

- `presetRef(effect)`, as above.
- `planPreset(presets, id, layout)`: the preset's segments in id order. A preset without segments that starts a playlist is planned as the playlist's first preset (three levels at most). Segments with `stop: 0` are gone, segments off or at brightness 0 are dark. Kinds:
  - `image` (fx 53, `n` ending in `.gif`): the GIF, the segment's rectangle, its speed;
  - `copy` (fx 77): the source segment by `c3`;
  - `solid` (fx 0): `col[0]` (an array or a hex string);
  - anything else: `unsupported`, by effect id.
- Geometry: `start`/`stop` are columns and `startY`/`stopY` rows on a matrix; on a strip, `start`/`stop` are LEDs and the height is 1. `rev`, `rY` and `tp` flip and transpose a segment; grouping, spacing, mirroring and blur are not drawn.
- The plan says whether it is drawable: every lit segment is `image`, `copy` or `solid`. A plan with an unsupported segment isn't drawn at all, and its effects are named (from `/json/eff`).

### Drawing

- `utils/gif.ts`: a GIF decoder in TypeScript, no dependency. Composites every frame onto the logical screen, with disposal 0–3, transparency, local colour tables and interlacing, and gives the frames as RGBA with their delays. `ImageDecoder` is missing from Safari, and Firefox can't load the device's images in the page, so the bytes are decoded here, in every browser alike.
- Time: an *Image* segment's frame delay is scaled as WLED's image loader does, `delay × (2 − speed / 128)`, at least 20 ms. Each segment loops on its own; the preview shows, at time *t*, every segment's frame at *t* modulo its length. `copy` copies its source after the source is drawn, clipped to its own rectangle.
- The LED look: the frame is put into a 1-pixel-per-LED canvas, drawn scaled with smoothing off, and a plate is laid over it with a round hole per LED (radius 0.42 of the pitch, as wled-project's previews). An LED that is off shows the plate's dim grey (30, 30, 34) on the panel's near-black (10, 10, 12).
- Size: a row's preview fits 168 × 24 CSS pixels, the dialog's 480 × 72, at a whole number of pixels per LED from 2 to 12. A layout wider than that draws every *n*-th LED.
- One shared `requestAnimationFrame` loop draws only the previews on screen (`IntersectionObserver`), and only when a frame changes. With `prefers-reduced-motion`, or for an effect switched off, the first frame stands still.

### The UI

- **A row**: the preview leads the line under the name (`#meta`), before the type icon and the address. While it loads, a dim placeholder of the same size. Its accessible name: "Preview of preset 105 on 192.168.0.227". When it can't be drawn:
  - effects WLED computes: their names, "Fire 2012";
  - no such preset on the device: "No preset 999 on this WLED", in the warning colour, which also catches a typo;
  - the device didn't answer: a muted icon with a tooltip, so an unplugged lamp doesn't fill the list with errors.
- **The dialog**: a *Preview* block under the preset number (PRESET), the link (URL with `PL=`) or the JSON (API with `ps`), updated 400 ms after typing stops: the larger preview and the preset's name on the device ("AD 180 · preset 105"), or the same states as a row, spelled out.
- Texts in English, German and Dutch (`locales/*/wled.ts`, `preview` group).

## Rulings

- **No IP field, though the request expected one.** Every effect already holds its device's address, so a separate field would be a second place to keep in step, and wrong for effects on another device. Previews appear as soon as there are preset effects.
- **No live mirror** (approach 1): 2 frames a second and a single subscriber make it a poor preview, and drawing from files shows every preset without playing it.
- **Only *Image*, *Copy Segment* and *Solid* are drawn.** WLED has 220 effects; re-implementing them would never match. Naming the effect still tells the user what the preset does.
- **No caching across page loads.** A preset or GIF changed on the device shows the next time the settings open.
- **Previews are read only while the WLED panel is open**, never during a match.
- **The gap between two panels isn't drawn**: WLED's layout has the panels side by side (`panels[].x` 0 and 32), and the physical gap is unknown to it.

## Testing

- Headless (tsx), red first:
  - `utils/gif.ts` against Pillow on all 139 GIFs from the device, compared frame by frame as hashes of the composited RGBA with their delays; and synthetic GIFs Pillow writes with transparency, disposal 2 and 3, interlacing, local colour tables, sub-rectangle frames and zero delays.
  - `presetRef` for the three effect types; `planPreset` on the device's `presets.json` (wide, mirrored, playlist-only, missing, off, unsupported); the frame at time *t*: a mirrored preset's right half equals its left, a speed of 64 halves the frame rate.
  - The relay's timeout.
- In the dev Chrome, against the real device (read-only: nothing is POSTed to it): the panel's rows and the dialog, screenshots at 1600 and 390 px, in en, de and nl; an unreachable address and a missing preset.
- `yarn compile` against the baseline (12), `yarn lint`, `yarn i18n:check`, `yarn build`, and the manifest's permissions against the last release.
