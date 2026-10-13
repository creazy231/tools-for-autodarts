# WLED animation packs: ready-made sets, put on the user's WLED and into Tools in one go

**Date:** 2026-10-13
**Status:** designed and built without approvals, at the user's request ("arbeite komplett alleine. treffe entscheidungen basierend auf deinen empfehlungen, da ich selbst erstmal AFK sein werde"). The calls made are listed under *Rulings*.

## The request

> Wir sollen in Tools for Autodarts für das WLED feature Sammlungen anbieten die die Leute dann per "+" button oder ähnlichem zu ihrer Sammlung hinzufügen können. Am besten werden die animationen dann auch direkt als Preset auf die Geräte der User geladen indem sie in den öffentlichen Sammlungen die entsprechende IP ihres WLED setups eingeben.
> Es wird immer mehr sets geben über die Zeit - achte also beim Programmieren darauf, dass für künftige Animation Packs / Sets noch platz ist.
> Außerdem sollen die sets wiederum in verschiedene größen sortiert werden. Quasi wenn es ein Halloween Set gibt sollte dieses wiederum noch möglichkeiten für die Auswahl zwischen 8x32 oder 8x64 oder 32x32 etc. geben.
> Zum Anfang wollen wir folgende Animationen anbieten: …/wled-project/animations/set_1 und …/set_halloween
> irgendwo muss dann noch eine Information hin, dass wenn User die Animationen in anderen Formaten haben möchten (wie zB 64x64 etc. pp.) dass sie das dann gerne im discord, auf github oder per mail einreichen können

So: a public catalog of animation sets, each in one or more matrix sizes; a "+" that puts a set's animations on the user's WLED as presets (the user types the WLED's address there) and adds its effects to their Tools library; room for many more sets later; and a note on how to ask for other sizes.

## What there is today

- **wled-project** (`/Volumes/WD_BLACK/PROJECTS/wled-project/animations`, the user's, built for WLED 16.0.1 on an ESP32):
  - Each animation is a GIF on the device's file system, played by a preset with effect 53 *Image* (the GIF named by the segment's `n`). One-shots add a playlist that holds on preset 200 (`"AD hold"`) and then `end`s on a home loop (Game on 101, Halloween Game on 232, an afterglow 186–199, …), so presets point at each other by number.
  - Two layouts: one 32×8 panel (`presets.json`, presets 101–250) and a 64×8 matrix of two panels (`dual/presets.json`, 41–250), where segment 1 copies segment 0 with effect 77 *Copy Segment* and 45 wide animations use both panels as one.
  - Sets in folders: `set_1/` (the pack), `set_halloween/`, `players/` (personal), each with `32x8/gifs` and `64x8/gifs`, and Tools import CSVs (`name;PRESET;url;preset;trigger;…`).
  - `install.py` uploads the GIFs to `/upload`, merges the pack into the device's `presets.json` (never touching presets outside the pack's range), checks free space first, backs up, uploads and verifies.
- **Tools** (`components/Settings/Wled.vue`): effects of three types; a PRESET effect is the device's address and a preset number. Effect *sets* (`utils/library-sets.ts`): one set plays, the others wait. Previews (`utils/wled-preview.ts`, `utils/wled-device.ts`, `utils/led-canvas.ts`, `utils/gif.ts`) draw a preset from the device's own files. The background's fetch relay (`backgroundFetch`) reads a WLED in every browser without a host permission: WLED answers any origin.

What the two sets amount to, per size (closure of the CSVs' presets through their playlists; measured):

| Variant | Effects | Presets | GIFs | Bytes | Effects used |
|---|---|---|---|---|---|
| Standard 32×8 | 68 | 72 | 71 | 180,809 | Image |
| Standard 64×8 | 89 | 94 | 93 | 261,822 | Image, Copy Segment |
| Halloween 32×8 | 49 | 51 | 50 | 125,029 | Image |
| Halloween 64×8 | 63 | 66 | 65 | 195,643 | Image, Copy Segment |

Every preset in them is named `AD …`, no name repeats within a variant, and every GIF is found. The 64×8 effect lists are the 32×8 CSV plus the wide CSV, exactly what wled-project's two-panel import page offers (checked line by line).

## Approaches

1. **Packs bundled with the extension, as data (chosen).** A build script turns wled-project's folders into a catalog under `public/wled-packs/`, which ships in every build. A new pack is a new catalog entry and a release. Works offline and needs no server, and the extension grows by about 600 kB.
2. **Packs fetched from GitHub at run time.** New packs appear without a release. But nothing can be tested until the repo is pushed, which the user does, and the extension would depend on a host for a core flow. The pack texts would have to travel with the data anyway.
3. **No catalog, only links to CSVs.** Users would still have to install the presets themselves, which is the part the request wants gone.

The catalog of approach 1 is written so approach 2 stays a small step: every path in it is relative to its root, the packs carry their own texts in all three languages, and nothing in the code names a pack.

## Design

### 1. Packs as data

**The catalog** (`public/wled-packs/`, generated, committed):

- `index.json`: `{ format: 1, packs: [...] }`. Each pack has `id`, `name` and `description` (each `{ en, de, nl }`), and `sizes`. Each size has `size` ("32x8", width × height as WLED's 2D settings put it), `width`, `height`, `file`, `version`, the counts (`effects`, `presets`, `gifs`, `bytes`) and `cover` (the preset its card shows).
- `<pack>-<size>.json`, one per variant:
  - `presets`: the presets it needs, keyed by wled-project's numbers;
  - `effects`: `{ name, preset, triggers }`, in CSV order;
  - `gifs`: `{ name, bytes }`;
  - `fx`: the WLED 16 names of the effect ids its presets use (`{"53":"Image","77":"Copy Segment"}`).
- `gifs/<name>.gif`: every GIF once. A name means the same bytes in every pack.
- `version`: the first 12 hex digits of a SHA-256 over the variant's presets, effects and GIF bytes, so it changes exactly when the content does.

**The build script:** `yarn wled:packs <wled-project>/animations` (`scripts/wled-packs.ts`, run under tsx). It reads `scripts/wled-packs.json`, the source list. For each pack that holds its texts, and for each size: its presets file, its CSV files, the GIF folders to look in, and the cover's preset name. It then:

- parses the CSV lines (PRESET only), follows each preset's playlist `ps` and `end` (and a numeric top-level `ps`) to the set of presets the variant needs, and collects the GIFs those presets' *Image* segments name;
- refuses, naming the culprit, anything that would break an install:
  - a missing preset or GIF, or a GIF found twice with different bytes;
  - a preset without a name, or a name used twice in a variant;
  - a preset number outside 1–250;
  - an effect id it has no WLED name for (it knows 0 *Solid*, 53 *Image*, 77 *Copy Segment*);
  - one name meaning two different presets in two packs of the same size;
  - a GIF name over 30 characters, or outside `[a-z0-9_.-]`;
  - a missing language;
- writes the output directory afresh, so a pack or GIF dropped from the sources is dropped from the catalog. The output is deterministic: two runs give the same bytes.

Adding a pack later means adding its entry to `scripts/wled-packs.json`, running the script, and releasing. A pack from somewhere other than wled-project only needs the same three things: a WLED `presets.json`, Tools CSV lines and GIFs.

### 2. Putting a pack on a WLED

`utils/wled-pack-install.ts` runs the steps over an injected device I/O (`read(path)`, `upload(name, file)`), so a fake device tests every branch. `utils/wled-packs.ts` holds the pure parts. All reads and writes go through the background:

1. **Look:** `/json/info` (4 s). Unreachable, not a WLED, or a strip rather than a matrix: stop.
2. **Effects by name:** `/json/eff`. Each effect the pack uses (`fx`) is looked up by its name. A device without *Image* or without *Copy Segment* stops, naming it. Both come with WLED 16: in 0.15, 53 is an unused slot and 77 is *Meteor Smooth*. Ids that differ from WLED 16's are rewritten in the presets, because WLED's effect ids move between versions.
3. **Presets:** `/presets.json` (15 s), kept as read. Only a 404 or an empty file means no presets. Stopping cases, since replacing the file would lose the user's presets:
   - any other error status;
   - bytes that aren't UTF-8, or aren't a JSON object;
   - a 404 or empty file while the device's file list shows a `presets.json` with something in it.
4. **Files:** `/edit?func=list` (WLED 16 lists names and sizes; older versions give nothing, and the check below then assumes every GIF is new).
5. **Plan the numbers** (`planInstall`, pure). The goal is never to overwrite or delete anything of the user's:
   1. A pack preset whose name a device preset already has takes that preset's number. It is the same preset from an earlier install, by Tools or by `install.py`, and is updated in place.
   2. The others take their own number (wled-project's) when it is free.
   3. The rest take free numbers from 249 down. Number 250 is taken only as a pack's own number, as WLED's Autosave usermod saves to it by default. Not enough free numbers stops.

   A number holding `{}` counts as free. `"0"`, WLED's placeholder, is never a number to use and is kept as it is, as are keys beyond 250. Then every reference is renumbered: playlist `ps` and `end`, top-level `ps`. The merged file is written in WLED's own layout: one preset per line, a newline before each top-level comma, `"0"` first, the rest in number order.
6. **Room:** the same rule as `install.py`, in 4 KB blocks.
   - Free space is `(fs.t − fs.u) × 1000 − 999` bytes.
   - The GIFs take their blocks, less the blocks of files of the same name they replace.
   - While `presets.json` is written, the old and new copies both need room.
   - Afterwards, the new `presets.json` + 9,000 bytes + one block must stay free, or WLED can no longer save a preset.

   Short of room stops, giving both numbers. Nothing has been written up to here.
7. **Write:** each GIF to `/upload` (multipart, field `data`, file name `/<name>`), one at a time, 20 s each, with progress. A 401 means a settings PIN is set: stop and say so. Then `presets.json` is read again; if anything was saved meanwhile (in WLED's app, by a home automation, from another tab), the numbers are planned again around it and room re-checked. Then it is written (30 s).
8. **Check:** read `presets.json` back (30 s, asked twice). What the device holds decides, not the upload's answer:
   - the planned file means success, even if the upload's answer was lost;
   - the old file means the write was refused before it began (a 401 is a settings PIN), so nothing is restored;
   - anything else, or no read at all, means the original bytes are uploaded again;
   - if even that fails, the result offers the original as a file download ("restore it in WLED under Security & Updates"). The original stays in memory until the dialog closes.

**Transport.** Reads use `backgroundFetch` with timeouts, as the previews do. Uploads use a new background message, `wled:upload` (`{ url, name, gif | text, timeoutMs }`). `utils/wled-upload.ts` handles it:
- the GIF is read from the extension's own package (`wled-packs/gifs/<name>`, the name checked against `[A-Za-z0-9._-]+\.gif`), so only text crosses the message channel;
- it builds the `FormData` and POSTs it with a timeout;
- it answers `{ ok, status }`.

WLED answers `/upload` with `Access-Control-Allow-Origin: *`, like everything else, so the background needs no host permission. **The manifest doesn't change.**

### 3. Adding it to Tools

A pack becomes an **effect set** of its own, named after the pack in the current language: "Halloween", or "Halloween (64 × 8)" if that name is taken, then "… 2". Its effects come from the pack's CSV lines: name, PRESET, the device's address (`http://<ip>`), the planned number, and the triggers. An opt-in effect, such as *AD Takeout*, comes without a trigger, as from the CSV. The set remembers where it came from: `pack: { id, size, version }` on `IWledSet`, an optional field, so no migration is needed. The set functions keep fields they don't know.

- **It plays at once** when the set in use has no effects, which covers a first-time user. Otherwise it waits, and the done screen offers *Use this set*. The panel then shows the new set.
- **Added before** (a set with the same pack and size): the button reads *Update*. It runs the same install, then refreshes that set. Each pack effect replaces the effect of the same name, keeping its on/off. Effects the user added stay after them. When the catalog's version differs from the set's, the card says a newer version is there.

### 4. The dialog

**Ways in:**
- a short **Animation packs** section in the WLED panel, before the effect sets: its title with the number of packs, one sentence, and a quiet *Browse packs* button;
- *Animation packs* in the list's **Add** menu;
- a button of the same name in the empty list.

All three open the same nested `AppModal` (`size="lg"`).

**Browse view:**

- **Your WLED:** an address field (`AppInput`). It is filled with the device most of the user's PRESET effects use, or left empty. 500 ms after typing stops, `/json/info` is read and a line under the field says what answered: "WLED-Matrix · WLED 16.0.1 · 64 × 8 · 812 kB free", or why not:
  - nothing answered;
  - not a WLED;
  - a strip, but packs are for matrices.

  Until a matrix answers, *Add* is off, and the field says to type the address first.
- **A card per pack:**
  - a cover: the pack's cover preset, drawn and animated with the existing LED painter from the pack's own preset and GIFs, at the size chosen;
  - the name, the description, and "68 animations";
  - the sizes as a segmented choice ("32 × 8", "64 × 8"). The device's size is picked when the pack has it;
  - a line on fit, either "Made for your WLED (64 × 8)" or "Made for 64 × 8. Your WLED is 32 × 16." (a warning; adding is still allowed);
  - the button: *+ Add*, or *Update* with "In your effect sets as Halloween";
  - *Show the 68 animations*, which lists every effect: a small preview, its name and its trigger chips. Previews are read only once seen.
- **Other sizes:** under the packs, "Need a pack in another size, such as 64 × 64? Ask on Discord, on GitHub or by email." The links:
  - Discord: `https://discord.gg/autodarts`, the Autodarts community server the site's docs link to. Tools has no server of its own.
  - GitHub: a new issue on `creazy231/tools-for-autodarts`.
  - Email: `mailto:info@tobias-thiele.de`, the address `package.json` publishes.

**Install view** (the card's button switches the dialog to it; a back arrow returns):

- **Summary.** "Puts 71 animation files (181 kB) and 72 presets on your WLED at 192.168.0.227, and adds 68 effects to Tools as the effect set Halloween. Your own presets stay as they are." Plus the size warning if any. Then *Cancel* and *Put it on my WLED* (the screen's one blue button). A card's count ("68 animations") counts effects, as the user sees them in Tools; the summary counts the files the device gets.
- **Progress.** Read, put on (n of N), save the presets, check, with a progress bar. The dialog can't be closed while it runs: no ×, no backdrop, no Escape. Each request has a timeout, so it always ends.
- **Done.** "Halloween is on your WLED. Its 63 effects are in the set Halloween", then either "and play from now on", or *Use this set*. Then *Done*.
- **Failed.** What happened and what to do (table below), with *Back* and *Try again*. When the presets file couldn't be restored, there is also *Save your old presets*.

### 5. Errors

| Case | Says | Changed on the device |
|---|---|---|
| no answer | Your WLED at {address} didn't answer. Is it on and on this network? | nothing |
| not a WLED / a strip | That address isn't a WLED / Your WLED is a strip; packs are for LED matrices. | nothing |
| effect missing | Your WLED has no {effect} effect, which the pack needs. It takes WLED 16 or newer on an ESP32. | nothing |
| presets unreadable | Your WLED's presets.json can't be read, so nothing was changed. | nothing |
| no numbers | The pack needs {needed} preset numbers, and your WLED has {free} free. | nothing |
| no room | The pack needs {needed} kB, and your WLED has {free} kB free. Delete files you don't need in WLED's file editor ({address}/edit). | nothing |
| PIN (401) | Your WLED is locked with a settings PIN. Unlock it in WLED's settings, then try again. | nothing (WLED refuses the first upload) |
| upload fails | Putting {file} on your WLED failed. Check the connection and try again. | GIFs, maybe |
| check fails, restored | Your WLED didn't keep the new presets, so the old ones were put back. | GIFs |
| check fails, not restored | Your WLED's presets may be damaged. Save your old presets and restore them in WLED (Security & Updates). | GIFs, presets.json |

GIFs left behind by a failed run are harmless: the next try overwrites them.

### 6. Texts

The dialog's texts are under `wled.packs` in `locales/{en,de,nl}/wled.ts`. Pack names and descriptions live in the catalog in all three languages: the build script refuses a missing language, and the dialog falls back to English for a language a future catalog lacks. A size is written `32 × 8` in every language. German says *du*, Dutch *je*, and the darts words are the site's (*Board/Bord*, *Match/wedstrijd*, *Bust*, *Legs*).

## Rulings

- **Bundled, not fetched** (approach 1). The format keeps fetching open for later.
- **Sizes are width × height, "32 × 8"**, as WLED's 2D settings and wled-project's folders write them, and as the device reports its matrix. The request said "8x32", the panel's shop name. With the device's own size picked automatically, the order matters little.
- **Numbers are planned per device, not fixed.** A device that has the pack's presets by name keeps them where they are. This is how an `install.py` install becomes a Tools install without moving anything. Otherwise the pack's own numbers are used, then free ones. This is what leaves room for future packs: WLED keeps only 250 presets, and two packs from different sources would otherwise collide.
- **Nothing of the user's is overwritten or deleted.** A preset is "the pack's" only by its exact name. Presets a newer pack version no longer has stay on the device. An independent review of the install found two ways around this, and both were closed:
  - an error status reading `presets.json` counted as "no presets";
  - a preset saved during the uploads was lost.
- **Preset 250 is left to WLED's Autosave usermod**, which saves there by default: free numbers count down from 249.
- **The background uploads only what an install sends**: a catalog GIF under its own name, or a `presets.json` that is a JSON object. It never uploads `cfg.json`, which WLED applies and reboots with.
- **Always every GIF.** Re-uploading costs seconds. Skipping by size would keep a changed GIF of equal size stale.
- **A pack is a set of its own**, as wled-project's import page already arranges it ("make a new effect set … call it Halloween"). It plays at once only when nothing else would.
- **Pack texts are data**, not catalog keys, so that a pack can be added without touching code. This departs from CLAUDE.md's "every string from `t()`". The build script enforces the three languages instead.
- **Discord** links to the Autodarts community server (`discord.gg/autodarts`). Tools has no server of its own, so the user may want another link. It is one constant.
- **Unverified here:** Firefox and Safari uploads (the reads through the background work in Firefox), and a real WLED. The user's matrix was offline, and the Mac on another network. A stand-in that answers as WLED 16 does is used instead.

## Testing

- **tsx, red first:**
  - `planInstall`: a fresh device; a device with the `install.py` dual layout, where everything lands on its own number; a user's presets on the pack's numbers (moved, references renumbered); `{}` slots; `AD hold` shared by two packs; no free numbers; ids beyond 250 left alone; a duplicate name on the device.
  - The presets file layout, effect ids by name, the room rule (against `install.py`'s numbers).
  - Effects for a set, unique set names, the merge on *Update*, the set's activation.
  - `installPack` against a fake device: the order of requests, progress, each failure in the table, rollback and its failure.
  - The background's upload checks, through its injected `fetch`.
- **The build script on wled-project:** the counts in the table above, determinism, and every refusal on a broken copy.
- **In the yarn dev Chrome, against a stand-in WLED on the LAN address:** a node server keeping files and `presets.json`, answering like WLED 16 (CORS, `/json/info`, `/json/eff`, `/json/cfg`, `/edit?func=list`, `/upload`, 401 when locked). The steps:
  - browse;
  - type the address;
  - add Standard 64×8, and check the stand-in's files byte for byte against the package and its `presets.json` against the plan;
  - check the new set in the config and the rows' previews (read back from the stand-in);
  - add Halloween (shared presets reused), *Update*, a 401, a full device;
  - screenshots at 1600 and 390 px, in en, de and nl.
- **Release checks:**
  - `yarn compile` against the baseline (12), `yarn lint`, `yarn i18n:check` and `yarn build`;
  - the manifest's permissions against the 3.4.0 release;
  - the catalog files present in `.output/chrome-mv3/wled-packs/`.

## Not in this change

- Removing a pack's presets and GIFs from a device.
- Installing on two devices at once, or one set for two devices.
- A remote catalog (approach 2).
- Packs for strips.

## Follow-up: highlighted at the top, and single animations (2026-10-13)

> bitte passe das ganze so an, dass "Animation packs" in der Übersicht gehighligted ist und ganz oben steht. die Unterseiten davon solltest du so anpassen, dass es für User auch möglich ist nur einzelne Animationen zu ihrem WLED setup hinzuzufügen - nicht nur das ganze Set so wie jetzt

Decided without asking back, as the rest of this work was.

### The overview: first, and highlighted
- The WLED panel opens with the packs, above its intro sentence: a card with the site's brand gradient (`--ad-gradient-brand`, cyan to green) as its border. It holds the title with the number of packs, the section's sentence, and **Browse packs** as a primary button.
  - This departs from the settings' "one blue button per screen" (`settings-design-language`): the request asks for this entry to stand out, and the effect list's **Add** stays blue too.
- **One tile per pack** with its cover drawn and moving (the pack's first size), its name and its number of animations. A tile opens the dialog straight on that pack's page.

### The dialog's pages
1. **Packs** (as before):
   - the address field;
   - a card per pack, with its cover, texts, sizes and fit;
   - **Show animations** opens the pack's page;
   - **Add all** (or **Update**) puts the whole pack on the WLED as a set of its own, through the install page as before.
2. **A pack's page:**
   - **All packs** to go back;
   - the cover, the name and the number of animations;
   - the size choice and its fit;
   - **Add all** or **Update**;
   - the line "Add single animations to the effect set {set}, or all of them as an effect set of their own.";
   - a search field, by name or trigger (`searchLibrary`, as the libraries search);
   - every animation as a row: its preview, its name and trigger chips, its state and a **+**.
3. **Installing the whole pack**, as before. Back returns to the page it came from.

### A single animation
- **What goes on the WLED:**
  - its preset, and every preset that one plays or ends on: the hold, and the loop or afterglow it returns to (`packSubset`). For example, *AD 180* brings *AD Game on* and *AD hold*;
  - the GIFs those presets show.
  - The same install runs as for a pack, with the same rules: the numbers are planned around the user's presets, presets.json is re-read before the write, the read-back decides, and the old file goes back if needed.
- **What goes into Tools:** only the animation's own effect, at the top of the effect set the WLED panel shows. An effect of the same name there is brought up to date where it is, keeping its on/off. No new set is made.
- **How it runs:**
  - No confirm step, as it is a few files. The row says *Putting it on your WLED…*, then *Added to {set}*, or what went wrong.
  - One install at a time: while one runs, every **+** and **Add all** waits, and the dialog can't be closed or left.
  - A row whose effect the set already has says *Already in {set}*. Its **+** puts it on the WLED again and brings the effect up to date.

### Texts
New or changed keys under `wled.packs`, in en/de/nl:
- the card's **Add all** and **Show animations**;
- the page's back link, line, search, empty search, the row's **+** label and its three states;
- the section's and the dialog's sentences, which now name single animations.

### Testing
- **tsx:**
  - `packSubset`: what an animation brings along, for a loop, a one-shot, an afterglow, the 64 × 8 mirror, and a name the pack lacks;
  - `addEffectsToSet`: new ones on top, same name updated in place keeping on/off, a set that has gone falls back to the set in use, the input unchanged;
  - an install of a single animation, then of the whole pack, on a device with the user's presets: the pack's later install keeps the animation's numbers.
- **In the dev Chrome against the stand-in:**
  - the overview at the top, at 1600 and 390 px;
  - a tile opening its pack;
  - a single *AD 180 Lightning*: the stand-in gets its GIFs and presets, and the panel's list shows the effect at the top;
  - the row's states, the search, then **Add all** from the page;
  - en/de/nl.
