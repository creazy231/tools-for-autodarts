# Caller, Sound FX, WLED and Animations per game mode (PR #251, merged onto the library design)

**Date:** 2026-09-27
**Pull request:** [#251](https://github.com/creazy231/tools-for-autodarts/pull/251), "Enable Caller, Sound FX, WLED and Animations per game mode", by @MeisterBob. It closes [#222](https://github.com/creazy231/tools-for-autodarts/issues/222), "GAME MODE RULES", by @andypech06.
**Status:** designed and built without approvals, at the user's request ("implement it the same way — without me need to interact"). The choices below are the design's own, and each call made without the user is listed under *Rulings*. "The same way" refers to #254 (`2026-09-26-per-animation-duration-design.md`).

## The request

> now take care of https://github.com/creazy231/tools-for-autodarts/pull/251 and implement it the same way - without me need to interact

#222 asks to "include/exclude specific game modes": a GIF for a bad score (1–10) goes off all the time in Round the World, where every visit scores that little. The pull request answers it per feature. The Caller, Sound FX, WLED and Animations can each be limited to chosen game modes.

## What the pull request does

- **The `GameMode` enum** (`utils/game-data-storage.ts`) takes the site's variant names: `Bull-off`, `X01`, `Cricket`, `CountUp`, `ATC`, `Random Checkout`, `RTW`, `Segment Training`, `Bob's 27`, `121`, `Shanghai`, `Gotcha`, `Bermuda`, `Killer`. It adds `toEnabledGameModes()` / `toDisabledGameModes()`. `IGameData.gameMode`, scraped from the old site and never set, goes.
- **The config.** `disabledGameModes: GameMode[]` is added to `caller`, `soundFx`, `wledFx` and `animations`, required, with `[]` in the defaults. `defaultConfig.version` goes 22 → 23, and a step in `entrypoints/content/migration-config.ts` writes `[]` into each.
- **The players.** Each has an `_is_enabled(config, variant)` gate: the feature is on, the variant isn't switched off, and a missing variant counts as off. It is applied to:
  - the game-data watcher;
  - the first game-data on load;
  - board events, which read the stored match's variant on each event.
- **The UI.** A new `AppMultiSelect` (a button with a checkbox list and an *All* entry, in the old style) goes in each of the four settings panels, labelled "enable in selected Game Modes". It shows the raw variant names as labels.
- **Docs.** README, CHANGELOG (`[Unreleased]`) and CLAUDE.md (a "Game Modes" note, and `AppMultiSelect` in the component list).

## What was found

**Six files conflict.** A trial merge onto today's `main` conflicts in `CHANGELOG.md`, `README.md` and the four settings components, all rebuilt since (e7e0d09, a76562e, 354bb21, 35bb0c7). The four players, `storage.ts`, `game-data-storage.ts`, the migration file and CLAUDE.md merge cleanly.

**The variant names are right.** The site's own `Variant` enum (in its `clients` chunk) is:

```
X01, Cricket, Killer, 121, ATC, RTW, CountUp, Bermuda, Shanghai, Gotcha,
Random Checkout, Bull-off, Segment Training, Bob's 27
```

That is exactly the pull request's fourteen values, and the gate compares `match.variant` against them. The labels are not what the site shows. The site's English names are:

| Variant | Site's label |
|---|---|
| `Cricket` | Cricket / Tactics |
| `CountUp` | Count Up |
| `ATC` | Around The Clock |
| `RTW` | Round the World |
| `Bull-off` | Bull-Off |

The rest are shown as their own names. The site's game picker groups them in this order:

- **X01**, **Cricket**
- **Practice:** Count Up, Around The Clock, Random Checkout, Round the World, Segment Training, Bob's 27, 121
- **Party:** Shanghai, Gotcha, Bermuda, Killer

The bull-off is the phase before a match, not a game you pick.

**The migration is not needed, and landing it would rewrite the user's config again.** A missing `disabledGameModes` can mean "every mode on", the way a missing `IAnimation.duration` means *Show for* (35bb0c7), so nothing saved before reads wrong. There is a second reason. When #254's merge landed in the watched tree, the old-style migration ran in the user's open tab and rewrote their config (memory: intermediate merge states migrate the dev config). With no migration here, a profile that ran #254's own build (already at version 23) doesn't miss anything either.

**A missing variant silences a feature, and lobbies read the last match.** `soundFx()` and `wledFx()` also run on lobby pages (`entrypoints/lobby.content/index.ts`). Their board-event gate reads whichever match was stored last, so in a lobby:
- takeout and calibration sounds and effects follow the previous match's game mode;
- they stop altogether when no match was ever stored.

**The bull-off means different things per feature.**
- The Caller announces it.
- WLED has a `bulloff` trigger.
- Sound FX skips game sounds in it but plays board sounds (takeout).
- Animations never play in it (`processGameData` returns on `Bull-off`), so a Bull-off switch there would do nothing.

**The UI predates the library design.** `AppMultiSelect` uses the old `border-white/30 bg-black/50` panel with native checkboxes, and sits outside the rebuilt dialogs' Options rows.

## Approaches

1. **Merge as it is, then fit its dropdown into the new dialogs.** Keeps the migration and the lobby gate. Turned down.
2. **Merge for history and credit, and rework in a follow-up commit, landed together.** *Chosen*, as for #254. GitHub marks #251 merged when `main` is pushed, and #222 closes with it.
3. **Re-implement and close the pull request.** Loses the contributor's merge for no gain. The enum, the data model and the gate's placement are right.

## Decisions

1. **The merge commit is mechanical, and is never checked out on its own.**
   - Its subject is GitHub's default.
   - In the six conflicted files it takes `main`'s version. The pull request's hunks there edit layouts and docs that no longer exist in that form.
   - Everything else is the pull request as it merges.

   It is built in a scratch worktree outside the repo, together with the rework commit. `main` is fast-forwarded to the rework in one step, so the watched tree, and the user's open tab, only ever see the final state.

2. **Stored as `disabledGameModes?: GameMode[]`, optional, on `caller`, `soundFx`, `wledFx` and `animations`.**
   - Missing or empty means every mode is on, so every config saved before this plays as it always has.
   - It is only stored while something is switched off. Saving with every mode on removes it.
   - No migration: `config.version` stays 22, and the pull request's step and its four `[]` defaults go.
   - A list saved by the pull request's own build reads the same.

3. **`utils/game-modes.ts`, pure and tested under tsx:**
   - `GameMode`, moved from `game-data-storage.ts`, which re-exports it, so `helpers.ts` keeps its import.
   - `GAME_MODE_GROUPS`: the site's labels and groups.
   - `gameModesFor(feature)`: the modes a feature's editor shows. Every mode, except Bull-off for Animations.
   - `playsIn(settings, variant)`: the feature is on, and the variant isn't switched off. It returns `true` for:
     - a missing or unknown variant, which can't be switched off;
     - a list that isn't an array, from an imported or hand-edited config.
   - `pageVariant(match, href)`: the stored match's variant, but only when the page is that match's page. Otherwise `undefined`, which `playsIn` treats as on.
   - `enabledIn(disabled, shown)` / `disabledToStore(shown, enabled)`: between the editor's switches and the stored list. The latter gives `undefined` when nothing is off.
   - `gameModesSummary(disabled, shown)`: "All games", "None", or "9 of 14".

4. **The gate goes where the pull request puts it, through `playsIn`:**
   - the game-data watchers;
   - the first game-data on load;
   - board events, which take `pageVariant(storedMatch, location.href)`.

   A lobby, or a stale match from another tab, therefore leaves board sounds and effects as they were. Lobby and tournament triggers (`lobby_in`, `lobby_out`, `tournament_ready`, and Sound FX's lobby sounds) stay ungated.

5. **The settings: a *Game modes* row and a nested editor, built from the library parts.**
   - **The row.** Each dialog's Options gets an `OptionRow` titled **Game modes**, with a line on what it does. Its control is a neutral small `AppButton` showing the summary and a chevron. Sound FX has no Options yet and gets a section for it.
   - **The editor.** An `AppModal` titled **Game modes**:
     - a line on what it does;
     - an **All games** row with the list switch. It is on while every mode is on; switching it on turns every mode on, and off turns every mode off;
     - the modes as switch rows under the site's groups: "X01 and Cricket", "Practice", "Party" and "Before a match" (Bull-off, not for Animations);
     - two columns from `sm` up;
     - **Cancel** and **Save**. Save is the one blue button, and the editor works on a copy until then.
   - **Removed:** `AppMultiSelect`.
   - **Copy, verbatim:**
     - the row's line:
       - Caller: "The games it calls in."
       - Sound FX: "The games it plays in. Lobby and tournament sounds play in any game."
       - WLED: "The games it lights up in. Lobby and tournament effects play in any game."
       - Animations: "The games it shows GIFs in."
     - the editor's line:
       - Caller: "The Caller only calls in the games switched on here."
       - Sound FX: "Sound FX only plays in the games switched on here."
       - WLED: "WLED only lights up in the games switched on here."
       - Animations: "Animations only show in the games switched on here."

6. **Docs.**
   - README: a *Game modes* bullet in each of the four features' configuration.
   - CHANGELOG: the pull request's entry, rewritten for the new settings, under `[Unreleased]` › Added, with "(#222)" and "Contributed by @MeisterBob".
   - CLAUDE.md: the pull request's "Game Modes" note, pointed at `utils/game-modes.ts` and `playsIn`, without `AppMultiSelect`.

## Rulings

1. Approach 2, with the merge and the rework built outside the watched tree and landed in one fast-forward.
2. No migration: `disabledGameModes` is optional, and `config.version` stays 22.
3. A missing or unknown variant is on, where the pull request's gate made it off.
4. Board events are gated only on the page of the stored match (`pageVariant`), because `soundFx()` and `wledFx()` also run in lobbies.
5. No Bull-off switch for Animations, since they never play there.
6. The site's English labels and groups in the editor, not the raw variant names.
7. A summary row and a nested editor with switches, rather than a dropdown in the Options: the library design's rows, switches and nested dialogs.
8. `AppMultiSelect` is dropped rather than restyled. The editor is the only multi-select.
9. Commits stay local on `main`. Nothing is pushed, and #251 gets a comment only, so the push closes it as merged.

## Not doing

- A game-mode condition per trigger, which #222 literally asked for ("a condition tag"). The pull request's per-feature switch covers its example, where one feature is too busy in one game. Per-trigger conditions would be a separate change.
- Picking up a settings change during a match. The players read their config when the match starts, as they always have.
- Game modes for other features.

## Parts

- New:
  - `utils/game-modes.ts`
  - `components/Settings/Library/GameModesField.vue`: the row's button and the editor
- Changed:
  - `utils/game-data-storage.ts` (re-exports `GameMode`)
  - `utils/storage.ts` (four optional fields, no version change)
  - `entrypoints/content/migration-config.ts` (the step goes)
  - `entrypoints/match.content/caller.ts`, `sound-fx.ts`, `wled.ts`, `Animations.vue`
  - the four settings components
  - README, CHANGELOG, CLAUDE.md
- Removed: `components/AppMultiSelect.vue`.

## Testing

- **tsx:**
  - `playsIn`: every combination of on/off, switched off, missing, unknown and junk;
  - `pageVariant`: the page's match, another match, a lobby, no match;
  - `gameModesFor` and the site's grouping;
  - `enabledIn` / `disabledToStore` round trips;
  - `gameModesSummary`.
- **The yarn dev Chrome, in a window of my own**, with the user's config backed up and restored key by key:
  - the row and editor in all four dialogs;
  - switching modes off, saving, reopening and cancelling;
  - All games back on removes the stored list;
  - Animations without Bull-off;
  - the dialogs at 1600 and 390 px.
- **The players, in a bot match of my own with game-data injected, WLED against a LAN stand-in:** for each of the four, a trigger plays in X01 and not in a switched-off mode (the injected `variant`).
- **Board events:** a takeout is gated on the match page, and plays on a page whose stored match is another one.
- `yarn compile` against the 14-error baseline, ESLint, SFC checks, `yarn build`.
