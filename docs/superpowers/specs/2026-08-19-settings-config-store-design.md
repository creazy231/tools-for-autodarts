# One shared config for the settings page

**Date:** 2026-08-19
**Status:** approved, implementing

## The problem

Changing any setting on `/tools` visibly rebuilds the page. [PageConfig.vue](../../../components/PageConfig.vue)
hangs `:key="reloadKey"` on the feature-card grid and bumps that key 250ms after
every change, destroying and re-creating all ~18 cards of the active tab. A
scroll save/restore wraps the bump to hide the jump it causes.

The rebuild is not decoration. Each of the 28 components in
[components/Settings/](../../../components/Settings/) keeps its **own private copy of the
entire config** — `ref<IConfig>()`, filled from `AutodartsToolsConfig.getValue()`
on mount — and writes the **whole config** back on any deep change. A feature's
card and its settings dialog are two instances of the same file holding two
unrelated copies. Remounting every card after every change is what stops those
copies drifting apart. It is the coherence mechanism.

Two consequences fall out of the same design:

- The write path runs twice per change. A component writes, emits
  `settingChange`, `PageConfig.updateConfig()` re-reads into its own copy, and
  `PageConfig`'s deep watcher fires and writes the identical config again.
- `:config="config"` on the settings dialog is dead. No component declares
  props, so it has never been read.

## The design

Replace 28 private copies with one shared reactive config. Card and dialog then
edit the same object, so there is nothing to re-read and nothing to remount.

### 1. `composables/useConfig.ts` (new)

A module-scope `ref<IConfig>` plus a `useConfig()` accessor. The module owns:

- one storage read, on first use
- one deep `watch` that persists changes
- one `AutodartsToolsConfig.watch()` that folds in changes made anywhere else —
  another tab, a content script, a migration running late
- an echo guard: the serialization storage last agreed with. Needed in both
  directions, since our own write returns through the storage watcher (and would
  read as a fresh edit), and an adopted external write trips the deep watcher
  (and would bounce straight back).

The deep watcher is registered at **module scope**, not inside `useConfig()`. A
watcher created during a component's setup belongs to that component's effect
scope and stops when it unmounts — saving would quietly die the first time a
settings dialog closed.

Writes stay immediate, as they are today. The cost being removed is the remount,
not the write, and debouncing would buy a lost-write window for nothing. If write
pressure ever matters it is a one-line change inside the store, invisible to
every component.

### 2. The 28 feature components

Each loses its `ref<IConfig>()`, its `onMounted` load, and its
`watch`/`setValue`/`emit("settingChange")` block, and gains
`const { config } = useConfig();`. **Templates are untouched**, `v-if="config"`
guards included. The four extra explicit `setValue` calls in Animations, Caller,
SoundFx and StreamingMode become redundant and go with them.

### 3. `PageConfig.vue`

Drops `reloadKey`, `debouncedReload` and its scroll save/restore, `updateConfig`,
`handleSettingChange`, both `@setting-change` handlers, the dead `:config` prop,
and its own load and deep watcher. Export, import and reset keep working through
the shared ref. Their `window.location.reload()` calls stay — those genuinely
need the content scripts to re-initialise.

### 4. Defaults

Six components backfill missing sections in their own `onMounted`
(`boardView`, `colors.actionBar`, `discord.autoStartAfterTimer`,
`quickCorrection`, `automaticFullscreen`, `automaticNextLeg`). Those lines live
inside code being deleted, so they consolidate into the store's load. Four are
whole missing sections, covered by a shallow merge over `defaultConfig`; two are
nested and get an explicit line each.

They are applied **before** the ref is filled, so backfilling does not itself
count as an edit — it reaches storage with the first real change, exactly as it
did when each component did this for itself.

`App.vue`'s own top-level merge stays as it is: it runs whether or not the tools
page is open, and content scripts depend on it.

## Testing

`yarn compile` and eslint, then the `yarn dev` browser:

- toggling a card does not remount the grid (MutationObserver on the grid; card
  instances keep their identity)
- a change in a dialog is immediately visible on the card behind it, and the
  reverse
- the value actually lands in `storage.local`
- scroll position survives a change with the restore hack gone
- a write made outside the page shows up live

## Non-goals

- Live config reactivity inside match content scripts. They read config at init;
  that is a separate question.
- The sortable `containerKey` remounts in Caller, SoundFx, Animations and Wled.
  Those resync Vue after sortablejs mutates the DOM — a different problem.
- Per-feature config slices (`useConfigSection("zoom")`). A real boundary, but it
  rewrites every template in all 28 files for no behavioural gain.
