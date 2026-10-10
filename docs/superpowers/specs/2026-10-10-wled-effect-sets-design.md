# WLED effect sets: lists of effects to switch between

**Date:** 2026-10-10
**Status:** designed and built without approvals, at the user's request ("don't ask me back any questions since I'll be afk for a while. Decide everything based on your recommendations"). The calls made are listed under *Rulings*.

## The request

> Some events or situations "require" a different set of animations. Maybe some birthday animations or special events like Halloween where users wants to have different sets of animations than default. […] So having animations by default, then Halloween comes and then users can activate a different set of animations that are active then and when Halloween ends, they can switch back to their default list or create new ones etc. […] At the end I want users to be able to create multiple sets where they can choose which one is active.

"Animations" here are WLED's effects, not the GIFs of the Animations feature: the request is about the WLED feature.

## What is there today

- `IConfig.wledFx` holds one list, `effects: IWled[]`, beside the options that apply to it: `boardIds`, `onlyOnce` (*Don't restart a running effect*), `disabledGameModes` and the feature's `enabled`.
- The runtime (`entrypoints/match.content/wled.ts`, also started on lobby pages) reads `config.wledFx.effects` when WLED starts on a page. It picks every effect from that list, through `isTriggerPresent`, `setEffectByTrigger` and `turnStartEffect`. Nothing else in the extension reads the list.
- The settings (`components/Settings/Wled.vue`) edit `config.wledFx.effects` in place: add, edit, switch, delete, drag, sort, CSV import, delete all. The play button and **Test** go through `tryEffect`, which sends whatever effect they are given.
- Exports carry the whole config, and an import merges it over the defaults (`PageConfig.vue`). Settings are also shared between users this way, and the person importing may run an older version.
- Shape changes go through `CONFIG_VERSION` migrations in `utils/storage.ts`, but the codebase prefers optional fields, where missing means the old behaviour, to either migration system (`ISound.volume`, `IAnimation.duration`).

## Approaches

1. **Sets that own their effects.** `wledFx.sets: { id, name, effects }[]` plus `activeSet`, with `effects` migrated into the first set. One place per set, but it needs a migration and a read-time fix-up for imported exports, which skip migrations. The runtime would have to read the set in use. An export from this version would also break WLED in an older one, which reads `effects` and would find nothing.
2. **Effects tagged with sets.** One `effects` list, and each effect names its set or sets. An effect can be shared between sets, but an older version would play every set's effects at once. Every list operation (sort, delete all, CSV, drag by index) would have to be scoped to a set, and membership would need its own field in the effect dialog.
3. **A shelf beside the list that plays (chosen).** `wledFx.effects` stays the list that plays: the set in use's. The other sets' lists wait on a shelf, `wledFx.sets`, in the user's order. The set in use keeps its place there, by id and name, without a list of its own. Switching puts the playing list back on its shelf slot and takes the other one down.
   - The runtime doesn't change at all.
   - A config without `sets` is one set, so nothing is migrated.
   - An old export imports as it is.
   - An export from this version still works in an older one, which plays the set in use.
   - The cost is one invariant, that the set in use's effects are `wledFx.effects`. It is kept in one small pure module and tested there.

## Decisions

### Shape

```ts
export interface IWledSet {
  id: string;
  /** As typed. "" is the first set, which the settings call "Default" in the language they show. */
  name: string;
  /** Left out on the set in use: its effects are `wledFx.effects`. */
  effects?: IWled[];
}

wledFx: {
  // enabled, disabledGameModes, onlyOnce, boardIds: as before, for every set
  effects: IWled[];       // what plays: the set in use's effects
  sets?: IWledSet[];      // every set, in order; absent until a second set is made
  activeSet?: string;     // the id of the set in use
}
```

- **No `sets`** (every config so far) is one set: the one in use, called "Default".
- **The first set is stored with the name `""`**, so "Default" follows the language until the set is renamed ("Standard", "Standaard").
- **Ids** are short random strings, unique within the list. The first set's id is `"default"`.
- **The other sets' effects are deep copies**, so toggling an effect in one set never changes another set.

### The module: `utils/wled-sets.ts`

These functions take the `wledFx` section and return a new one. They never change their input, and they import nothing at runtime, so they run under tsx:
- `listSets(wledFx)`: every set in order, each with its effects (the list that plays for the set in use) and whether it is in use. A config without sets gives one set, `{ id: "default", name: "" }`.
- `normalizeWledSets(wledFx)`: repairs a stored or imported shape so that every function below can rely on it.
  - `sets` that is missing, not a list or empty, or holds no usable entry, is taken away, together with any `activeSet`.
  - An entry without a string id, or with an id seen before, is dropped.
  - A name that isn't a string becomes `""`.
  - A set not in use gets `[]` when it has no list.
  - The set in use loses any list of its own: `effects` is the one that plays.
  - When `activeSet` names no entry, an entry for the list that plays is put first. Its id is `activeSet`, or `"default"`, or a new one, whichever is free, and its name is `""`.
- `activateSet(wledFx, id)`: makes `id` the set in use. The playing list goes back into its slot, and the new set's list becomes `effects`. An unknown id, or the set already in use, changes nothing.
- `addSet(wledFx, name, effects)`: puts a new set, with a deep copy of `effects`, at the end of the list, and returns it with its id. The set in use stays in use. A config without sets gets the first set written out first.
- `renameSet(wledFx, id, name)`.
- `deleteSet(wledFx, id)`: removes a set that isn't in use. The set in use is never deleted.
- `setNameTaken(sets, name, defaultName, exceptId?)`: whether a set other than `exceptId` already has that name, trimmed and ignoring case. A set stored with the name `""` counts under `defaultName`, the name it is shown with, which the caller passes in. That keeps the module free of the catalogs.

### The settings

The settings view one set and use another. Viewing a set shows its effects for editing, and nothing lights up differently until **Use this set** is pressed. That way Halloween can be put together in September without the lights changing.

```
OPTIONS
  Boards · Don't restart a running effect · Game modes          (for every set)

EFFECT SETS · 3                                     [⋯]  [+ New set]
One set plays at a time. Pick a set to edit its effects; it plays once you use it.
( ● Default  14 )  ( Halloween  9 )  ( Birthday  3 )
Not in use: your matches use Default.                       [Use this set]

EFFECTS IN HALLOWEEN · 9                            [⋯]  [Add ▾]
[ search … ]
rows …
```

- **A section of its own, between Options and the effects.** With one set it is the heading, a sentence and **New set**, so a list of effects that nobody splits into sets looks almost as before.
  - With two or more sets, the section shows:
    - a pill per set, with its effect count. The pill being viewed is white, as the library's filter pills are, and the set in use carries a small blue dot, since colour means "on";
    - under the pills, a line on the set being viewed. It is either "Your matches use this set.", or "Not in use: your matches use {set}." with **Use this set** beside it.
  - **Use this set** is a secondary button: *Add* stays the panel's one blue button.
- **New set** is a quiet button, not blue. It opens a dialog with the name (required) and, when the set being viewed has effects, *Start with*: **A copy of {set}** (the default) or **No effects**. **Create set** makes the set and shows it, without using it.
- **⋯** (with two or more sets) holds **Rename set** and **Delete set**. Delete is greyed out for the set in use, with the hint "Use another set first".
  - Deleting a set takes a dialog that names it and counts its effects, as *Delete all* does, because it deletes every effect in it.
  - The two-click inline delete is for one item, and a set is a list of them.
- **Names are required and unique**, trimmed and ignoring case. The dialog says what is wrong under the field, as the effect dialog does, because panel notifications sit behind nested dialogs.
- **The effects library edits the set being viewed**: add, edit, switch, delete, drag, sort, CSV import and *Delete all*. With two or more sets its heading names the set, "Effects in Halloween", because the pills scroll away while the heading sticks.
- **The play button and Test** send the effect whichever set it is in, so a set can be tried before it is used.
- **When the panel opens it shows the set in use.** A set deleted or renamed elsewhere (another tab, an import) falls back to the set in use.
- **The feature card** names the set in use, with a lightbulb, when there are two or more sets. That way a Halloween set still in use in November shows on the card grid.
- **Normalised where configs come in:** `useConfig`'s `withDefaults` runs `normalizeWledSets`, and so do both import paths in `PageConfig.vue`, beside `normalizeColors` and the rest. The effect editor can then change the set's list in place, as it does today.

### The runtime

Unchanged. It plays `wledFx.effects`, which is the set in use. A page that is already open keeps the effects it loaded until WLED starts again on it: the next page, or a reload. Every other WLED setting works the same way today.

### Words

Every new string ships in English, German and Dutch, in `locales/*/wled.ts`.
- "Effect set" is *Effekt-Set* (das) in German, written like the glossary's *Caller-Set*, and *effectenset* (de) in Dutch.
- "Default" is *Standard* and *Standaard*, as in the glossary.
- The section is called *effect sets* rather than *sets*, to keep it apart from the darts set in Legs/Sets.

### README and changelog

- The README's WLED section gets **Effect sets** under *Configuration Options*, and a part of its own: what a set is, using a set, a new set as a copy, which options every set shares, that a set in use can't be deleted, and that an open match changes over on its next load.
- `CHANGELOG.md` gets the feature under *Added*.

## Rulings

These are the calls made without the user, for review:

1. **Sets are whole lists**, one of which plays. Effects are not shared between sets: a new set starts as a copy of the set being viewed, or empty.
2. **Switching is by hand.** Nothing switches by date. See *Not doing*.
3. **Viewing a set and using it are separate**, so a set can be prepared or tried without changing the lights.
4. **Boards, *Don't restart a running effect*, Game modes and the feature switch apply to every set.** They describe the setup, not the occasion.
5. **The shelf shape** (*Approaches*, 3): `effects` stays what plays, so nothing is migrated, the runtime is untouched, and exports keep working in older versions.
6. **The first set is "Default" in the user's language** until it is renamed.
7. **The set in use can't be deleted**, and deleting any other set asks first, with its effect count.
8. **Names are required and unique.**
9. **The card names the set in use** once there are two or more.
10. **A match already open keeps its effects until its next load**, as with every other WLED setting.
11. The work is committed on `feat/wled-effect-sets` and merged into `main` locally. Nothing is pushed, and the version is not bumped.

## Not doing

- **Sets that switch by date** (Halloween from the 25th to the 1st, a birthday). The ids leave room for an optional date range on a set later, but deciding which set wins when two overlap, and when a date starts, is a feature of its own.
- **Effects shared between sets**, and sets layered over a base set.
- **Options per set.**
- **Switching sets from the match page**, or picking up a switch in a match that is already open.
- **Exporting or importing one set** as CSV or as a file. The settings export carries all of them.
- **Sets for Sound FX, the Caller or Animations.** `utils/wled-sets.ts` knows nothing of the settings and could be generalised, but nothing asks for it yet.

## Parts

- New:
  - `utils/wled-sets.ts`;
  - `components/Settings/Wled/EffectSets.vue`: the section, its pills and its three dialogs (new, rename, delete). Like Colors' parts in `Settings/Colors/`, it is a part of one feature, in a folder named after it.
- Changed:
  - `utils/storage.ts`: `IWledSet` and the two optional fields;
  - `components/Settings/Wled.vue`: the editor follows the set being viewed, and the card names the set in use;
  - `composables/useConfig.ts` and `components/PageConfig.vue`: `normalizeWledSets`;
  - `locales/{en,de,nl}/wled.ts`;
  - `README.md` and `CHANGELOG.md`.

## Testing

- **tsx**, on `utils/wled-sets.ts`:
  - a config without sets as one set;
  - switching back and forth gives back the same lists, unchanged;
  - adding copies or starts empty, and a copy is independent of its source;
  - ids are unique;
  - renaming, and deleting (never the set in use);
  - `normalizeWledSets` on each broken shape above;
  - names taken.
- **The real `entrypoints/match.content/wled.ts`**, bundled with esbuild and driven by game-data frames as on 2026-10-09: after `activateSet`, the set in use's effects are sent and the other set's never are.
- **The yarn dev Chrome**, in a tab of my own:
  - the user's `wledFx` is backed up first and restored after, and the effects point at a stand-in server on the LAN address, never at real lights;
  - in the panel: make a set (as a copy and empty), view it, edit it, import CSV into it, use it, rename it, delete it, and check that the set in use can't be deleted;
  - storage is read back after each step, against the shape above;
  - the card's line;
  - screenshots at desktop width and at 390 px, in English, German and Dutch;
  - a live check that the runtime plays the set in use from what the panel stored.
- **Checks:**
  - `yarn compile` against the baseline;
  - `yarn lint`;
  - `yarn i18n:check`;
  - `yarn build` and `yarn build:firefox`;
  - the built manifests' permissions, unchanged.
