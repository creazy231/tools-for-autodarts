# Sets for Animations, the Caller and Sound FX

**Date:** 2026-10-10
**Status:** designed and built without approvals, at the user's request ("can you implement the same for "Animations", "Caller" and "SoundFX" feaures please? Do this again without me need to interact please"). The calls made are listed under *Rulings*.
**Follows:** `2026-10-10-wled-effect-sets-design.md` (WLED's effect sets, merged locally as aee35d7 and not released). Everything said there about the shape, the settings and the runtime holds here, unless this spec says otherwise.

## The request

The same as WLED's effect sets, for the three other libraries on the *Sounds & Animations* tab. Each keeps several named lists, such as one for Halloween or a birthday, and the user chooses which one plays.

## What is there today

| | the list that plays | each item's stored file | the runtime that reads it |
|---|---|---|---|
| WLED | `wledFx.effects` | none | `entrypoints/match.content/wled.ts` |
| Animations | `animations.data` | an uploaded GIF in OPFS, by `animationId` (metadata in `localStorage`) | `entrypoints/match.content/Animations.vue` |
| Caller | `caller.sounds` | an uploaded or imported recording in IndexedDB (`sounds-caller`), by `soundId` | `entrypoints/match.content/caller.ts` |
| Sound FX | `soundFx.sounds` | the same, in `sounds-fx` | `entrypoints/match.content/sound-fx.ts`, also in lobbies |

- **The runtimes read their list in dozens of places.** Sound FX alone has about 30 filters over `config.soundFx.sounds`. The shelf shape that kept WLED's runtime untouched does the same here.
- **The files are what makes this harder than WLED.** Each panel deletes an item's file when the item is deleted, one by one or with *Delete all*.
  - Sound FX's editor saves a new file each time an item with a file is saved, and deletes the old one.
  - The Caller's editor overwrites the file in place, under the same `soundId`.
  - A set made as a copy shares its items' files with the set it came from. If nothing changes, deleting a sound in one set deletes the recording another set still plays, and replacing a recording in one set replaces it in both.
- **Exports carry every file of the two sound stores, whatever the config holds.** An import clears the stores and saves the files back under their own ids, so a set's references survive an export and an import. GIFs in OPFS have never been exported. That is unchanged and not part of this work.
- **The Caller already says "caller set":** a ready-made set of voice recordings, imported from darts-downloads.peschi.org (*Import a caller set*, the glossary's *Caller-Set*). Its catalog group `caller.sets` holds the picker's options.

## Approaches

1. **Generalise WLED's pieces, and share files between sets (chosen).**
   - One module (`utils/library-sets.ts`), one section component (`LibrarySets.vue`) and one composable (`useLibrarySets`), used by all four features.
   - A copied set refers to the same files.
   - A file is deleted only when no list of its feature refers to it any more, and it is never overwritten while another list refers to it.
2. **Copy the files with the set.**
   - Deleting stays simple.
   - A copy of a caller set of 211 recordings doubles about 30 MB in IndexedDB, and making the set takes as long as writing them all.
   - An export carries every copy.
3. **Three more copies of WLED's code**, one per panel. The fourth copy of the same rules would drift from the others, and none of them would handle files.

## Decisions

### One module for every library's sets: `utils/library-sets.ts`

It replaces `utils/wled-sets.ts`, which has never been released.
- **The functions take the section and the name of its list:** `"effects"`, `"data"` or `"sounds"`.
- **A set stores its list under the same name as the list that plays:** `caller.sets[i].sounds`, `animations.sets[i].data`, `wledFx.sets[i].effects`, as WLED's already does.
- **Types:** `LibrarySet<K, T> = { id; name } & { [P in K]?: T[] }`. The sections in `IConfig` gain `sets?` and `activeSet?`, and `IWledSet` stays as an alias.
- **The exports get names that say what they are about.** WXT auto-imports everything exported from `utils/`, and in a darts app a bare `deleteSet` reads as a darts set:
  - `listLibrarySets`, `librarySetLabel` and `librarySetNameTaken`;
  - `normalizeLibrarySets`, `activateLibrarySet`, `addLibrarySet`, `renameLibrarySet` and `deleteLibrarySet`;
  - `DEFAULT_LIBRARY_SET_ID`.

  They behave as their WLED versions did.
- **For files**, `libraryFileUses(section, key, idOf, fileId)` counts the items, in every list of the section, that refer to a file. `unusedLibraryFiles(section, key, idOf, candidates)` returns those of `candidates` no list refers to.
  - `idOf` is `sound => sound.soundId`, or `animation => animation.animationId`.
  - An empty or missing id is never a file.

### Files

- **Deleting an item** (its bin, *Delete all*, or a whole set) changes the config first. Then the item's files that no list refers to any more are deleted.
- **Replacing an item's file** in its editor writes a new file whenever the old one is still referred to elsewhere. The other sets keep theirs. The Caller's overwrite-in-place happens only for a file nothing else uses, and Sound FX's new file per save is unchanged.
- **Animations:** the panel's cache of object URLs lets go of a GIF only when its file is deleted.
- **Imports into a set** (upload, *Import a caller set*, CSV) write new files of their own, as now, into the set being viewed.

### One section component: `components/Settings/Library/LibrarySets.vue`

WLED's `EffectSets.vue`, moved and generalised. Its folder, `Settings/Wled/`, goes.
- **A `feature` prop** (`"wled" | "animations" | "caller" | "soundFx"`) picks the words of that feature.
- **Shared words move to `library.sets.*`:** New set, In use, the status line, Use this set, the menu, the name dialog, the errors, the delete dialog's title and button, and the notifications.
- **Each feature's own words go to `library.sets.<feature>.*`:**
  - the section's title, and the sentence for a single set;
  - the new-set dialog's title, and its *No …* option;
  - the delete dialog's body;
  - the card's label, and the library's heading with the set's name.
- **Every WLED key under `wled.sets` and `wled.list.titleInSet` moves there**, and the English stays what it was.
- **What the features call their sets:**

  | feature | English | German | Dutch |
  |---|---|---|---|
  | WLED | effect sets | Effekt-Sets | effectensets |
  | Animations | animation sets | Animations-Sets | animatiesets |
  | Sound FX | sound sets | Sound-Sets | geluidensets |
  | Caller | sound sets | Sound-Sets | geluidensets |

  The Caller's are *sound sets*, not *caller sets*: that name is taken by the voice packs that *Import a caller set* brings in. Its first line says how they meet: "a second caller set, or one for Halloween". So a voice pack can fill a set of its own: *New set* with no sounds, then *Import a caller set*.

### One composable: `composables/useLibrarySets`

It holds what WLED's panel did inline, once for every panel:
- the set being viewed, the sets, the set in use's name for the card, and the list the library edits in place;
- using, making, renaming and deleting a set (deleting also deletes the set's files nothing else uses), with the notifications;
- `releaseFiles(items)`, which the panels call after deleting items themselves;
- `fileShared(item)`, for an editor about to replace a file;
- closing a panel's dialogs, with a notice, when the set they were open on is deleted in another tab.

The panel gives it:
- the feature;
- `idOf` and `deleteFile`, for the three features with files;
- its `showNotification`;
- `closeDialogs`, which says whether one was open.

### The panels

Each of Animations, Caller and Sound FX, as WLED's:
- **The sets section** sits between Options and the library.
- **The library is keyed by the set being viewed.** Its heading names the set when there are two or more.
- **Every edit goes to the list of the set being viewed:** row switches, edit, delete, drag, sort, upload, import, TTS and *Delete all*. Where a panel replaced its whole list (`… = []`, `… = [ ...new, ...old ]`), it now changes the viewed list in place.
- **Confirms act only while their dialog is open.**
- **The card names the set in use** once there are two or more.
- **A long import** (*Import a caller set*, uploads) adds its items to the set that was viewed when it started.

WLED's panel moves onto the composable and the component, and nothing changes in what it does.

### Configs coming in

`useConfig`'s `withDefaults` and both import paths in `PageConfig.vue` normalise all four sections. That is WLED's `normalizeWledSets`, now `normalizeLibrarySets` with each section's list name.

### The runtimes

Unchanged. Each plays its section's list, which is the set in use's. A page that is already open keeps the list it loaded until it loads again, as before.

### Fixed along the way: WLED's deferred minors

The code they were in is rewritten here, so the final review's deferred minors are fixed with it:
- the generic names (above);
- `short()` cuts by code points, so an emoji is never split;
- the German line says "immer nur ein Set";
- `locales/GLOSSARY.md` records the set words;
- the card's set name is capped in width, so it stays off the picture.

### README and changelog

- **README:** each of the three features' sections gets a *Configuration* line on its sets and a short part of its own.
  - Each part says what its sets are called and points to WLED's *Effect sets* for what all four share: the pills, *Use this set*, renaming and deleting.
  - The Caller's and Sound FX's parts also say that a copied set shares its recordings, and that deleting keeps a file another set still uses. Animations' says the same of its GIFs.
- **CHANGELOG:** the WLED entry under *Added* becomes one entry for all four features.

## Rulings

1. **Files are shared between sets and counted** (*Approaches*, 1), never copied.
2. **The Caller's sets are "sound sets"**, so that "caller set" keeps its meaning.
3. **The shared pieces replace WLED's own**, which were never released: `utils/wled-sets.ts`, `EffectSets.vue` and the `wled.sets` keys go, and the WLED changelog entry is merged into the new one.
4. **WLED's deferred minors are fixed here**, because their code is rewritten anyway.
5. **Each feature switches on its own.** There is no switch for all four at once.
6. **Exports stay as they are:** sounds carry every file, and GIFs are still not exported.
7. The work is committed on `feat/library-sets` and merged into `main` locally. Nothing is pushed, and the version is not bumped.

## Not doing

- **One switch for every feature** (Halloween everywhere at once). It is a feature of its own, on top of these.
- **Exporting GIFs.**
- **Sets that switch by date** (as for WLED).
- **Duplicating an item within a set.**
- **Showing which other sets share an item's file.**

## Parts

- New:
  - `utils/library-sets.ts`, which replaces `utils/wled-sets.ts`;
  - `components/Settings/Library/LibrarySets.vue`, which replaces `components/Settings/Wled/EffectSets.vue`;
  - `composables/useLibrarySets.ts`.
- Changed:
  - `utils/storage.ts`: `LibrarySet`, and `sets`/`activeSet` on `animations`, `caller` and `soundFx`;
  - `composables/useConfig.ts` and `components/PageConfig.vue`;
  - `components/Settings/{Wled,Animations,Caller,SoundFx}.vue`;
  - `locales/{en,de,nl}/{library,wled}.ts`, `locales/same-as-english.json` and `locales/GLOSSARY.md`;
  - `README.md` and `CHANGELOG.md`.

## Testing

- **tsx:**
  - `utils/library-sets.ts` for all four list names: WLED's tests, carried over, plus the two file functions;
  - `useLibrarySets` on the real `useConfig` and an in-memory storage, with the file deletions recorded: deleting a set deletes only its unshared files, and `releaseFiles` and `fileShared` count across sets;
  - `LibrarySets.vue`'s logic, as `EffectSets.vue`'s was;
  - each panel's logic, headless, as WLED's:
    - edits reach the set being viewed and never the list that plays;
    - a file shared with another set survives its item's deletion, *Delete all* and a replaced recording;
    - the two-tab cases.
- **The runtimes:**
  - WLED's scenario again;
  - Sound FX's real engine (`entrypoints/match.content/sound-fx.ts`, bundled and driven headless) plays the set in use's sounds after a switch, and never another set's.
- **The yarn dev Chrome**, as for WLED:
  - the config is backed up and restored;
  - each of the three panels: a set made as a copy, edited, used, renamed and deleted, with the files read back from IndexedDB or OPFS. A file shared with another set survives;
  - screenshots in English, German and Dutch at 1600 and 390 px;
  - WLED's walkthrough again.
- **Checks:**
  - `yarn compile` against its baseline;
  - `yarn lint`;
  - `yarn i18n:check`;
  - `yarn build` and `yarn build:firefox`;
  - the manifests' permissions, unchanged.
