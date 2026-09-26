# Game modes per feature (PR #251): implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge PR #251 into `main` and rework it onto the library settings. The Caller, Sound FX, WLED and Animations each play only in the game modes switched on for them; every mode is on until one is switched off.

**Architecture:**
- **Merge:** a mechanical merge commit and a rework commit, both built in a scratch worktree outside the watched repo. `main` is fast-forwarded to the rework in one step, so the pull request's migration never runs in a tab.
- **Logic:** a pure, tsx-tested `utils/game-modes.ts` holds the enum, the site's labels and groups, and the gates (`playsIn`, `pageVariant`), plus the editor's conversions.
- **Players:** each calls `playsIn` where the pull request placed its `_is_enabled`.
- **Settings:** `GameModesField` is a summary button in an `OptionRow` that opens an `AppModal` with a switch per mode.

**Tech Stack:**
- Vue 3.4 `<script setup>` (`defineModel`), TypeScript, Tailwind with the design-system classes
- tsx + `node:test`
- WXT dev build in the yarn dev Chrome over raw CDP (`:9222`)

**Spec:** `docs/superpowers/specs/2026-09-27-per-game-mode-design.md`

## Global Constraints

- **Paths:**
  - Worktree `WT=$SCR/trial251`
  - `SCR=/private/tmp/claude-501/-Volumes-WD-BLACK-PROJECTS-Autodarts-autodarts-tools-wxt/1058cd34-2677-4596-920e-e2351f64c84a/scratchpad`
  - Repo `REPO=/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt`
- **The stored field:**
  - `disabledGameModes?: GameMode[]` on `caller`, `soundFx`, `wledFx` and `animations`.
  - Missing or empty means every mode is on. It is only stored while something is off.
  - `defaultConfig.version` stays **22**, and `CONFIG_VERSION` stays 13. No migration, and no `disabledGameModes` in the defaults.
- **Variant strings are the site's:** `X01`, `Cricket`, `CountUp`, `ATC`, `Random Checkout`, `RTW`, `Segment Training`, `Bob's 27`, `121`, `Shanghai`, `Gotcha`, `Bermuda`, `Killer`, `Bull-off`.
- **Labels and groups, verbatim:**
  - **X01 and Cricket:** X01, Cricket / Tactics
  - **Practice:** Count Up, Around The Clock, Random Checkout, Round the World, Segment Training, Bob's 27, 121
  - **Party:** Shanghai, Gotcha, Bermuda, Killer
  - **Before a match:** Bull-off. Not for Animations.
- **Copy, verbatim:**
  - row title `Game modes`
  - summary `All games` / `None` / `{on} of {shown}`
  - editor title `Game modes`, the switch `All games`, buttons `Cancel` and `Save`
  - the row's line and the editor's line, per feature, exactly as the spec's Decision 5.
- **Gate rules:**
  - `playsIn`: off when the feature is off. A missing or unknown variant plays. A non-array list counts as none.
  - Board events use `pageVariant(storedMatch, location.href)`.
  - Lobby and tournament triggers are never gated.
- **UI parts:**
  - `OptionRow`
  - a small neutral `AppButton` with `icon-[material-symbols--chevron-right-rounded]` (checked present)
  - `AppModal ghost-close`
  - `AppSwitch` for each mode, in two columns from `sm` up
  - one blue button (Save) in the editor
- **The watched tree never sees an intermediate state:**
  - All code and commits are built in `$WT`.
  - `main` moves only by `git merge --ff-only` to the final commit, with no autodarts `/matches/` tab open and every peer session idle (`ListAgents`).
  - Fixes after that are edits in the repo, like any other.
- **Browser:**
  - Only the yarn dev Chrome, in a window of my own; the user's `/tools` tab is never touched.
  - Back up `config-2-0-0` first, and restore only the keys I change, never a whole snapshot.
  - Put back `adt:last-visited-url`, `adt:active-tab`, `adt:active-settings` and `urlstatus`.
  - WLED only against a LAN stand-in, never the user's lights.
- **Checks:**
  - tsx tests for `game-modes.ts`, RED first.
  - `yarn compile` against the 14-error baseline, via `vue-tsc` in `$WT` after `wxt prepare`.
  - ESLint on touched files via `--stdin` against `main`.
  - SFC compile.
  - `yarn build` in `$WT`.
- **Commits:** on `main`, local only:
  1. this plan (`docs:`);
  2. `Merge pull request #251 from MeisterBob/per-gamemode`;
  3. `feat:`, with `Closes #222` and co-author Gerhard.
  At the end, #251 gets a comment and stays open.

## Review Focus

1. **A lobby's board sounds follow no game.** On a lobby page whose stored match was an RTW game switched off for Sound FX, a takeout still plays. Pinned in Task 1 (`pageVariant` with a lobby URL → undefined → `playsIn` true) and Task 7 (board-data on a match page whose stored match is another id).
2. **A config saved before this, or imported from an older version**, has no `disabledGameModes`: every feature plays everywhere, and the editor shows every switch on. Pinned in Task 1 (`playsIn` with the field missing, `enabledIn(undefined)`) and Task 6 (the user's real config opens with All games on).
3. **Saving with every mode on removes the key**, and Cancel stores nothing. Pinned in Task 6 (storage compared).
4. **A mode switched off for one feature doesn't affect another:** RTW off for Animations, and Sound FX still plays in RTW. Pinned in Task 7.
5. **Animations have no Bull-off switch**, and a list saved by the pull request's build that includes `Bull-off` doesn't break the editor. Pinned in Task 1 (`gameModesFor("animations")`, `enabledIn` with an extra mode) and Task 6 (the switch count in the editor).

---

### Task 1: The pure module, test-first

**Files:**
- Create: `$WT/utils/game-modes.ts`
- Test: `$SCR/tests/game-modes.test.mts`

**Interfaces:**
- Produces:
  - `enum GameMode` (the values above)
  - `type GameModeFeature = "caller" | "soundFx" | "wledFx" | "animations"`
  - `interface GameModeSettings { enabled?: boolean; disabledGameModes?: readonly string[] }`
  - `GAME_MODE_GROUPS`
  - `gameModeGroupsFor(feature)`
  - `gameModesFor(feature): GameMode[]`
  - `playsIn(settings, variant): boolean`
  - `pageVariant(match, href): string | undefined`
  - `enabledIn(disabled, shown): GameMode[]`
  - `disabledToStore(shown, enabled): GameMode[] | undefined`
  - `gameModesSummary(disabled, shown): string`

- [ ] **Step 1: Prepare the worktree on today's `main`** (after the plan commit): abort the trial merge, check out `main` detached, redo `git merge --no-ff --no-commit pr-251`, and resolve (Task 2) before writing new files.
- [ ] **Step 2: Write the failing tests** (`$SCR/tests/game-modes.test.mts`, importing `$WT/utils/game-modes.ts` by absolute path). Cases:
  - `playsIn`:
    - off feature → false;
    - on, field missing → true;
    - on, `["RTW"]` with `RTW` → false and with `X01` → true;
    - variant `undefined` → true;
    - unknown variant `"New Game"` → true;
    - `disabledGameModes: "RTW"` (junk) → true;
    - `[1, "RTW"]` with `RTW` → false.
  - `pageVariant`:
    - `{id:"m1",variant:"RTW"}` on `/matches/m1` → `RTW`;
    - on `/lobby/l2` → undefined;
    - on `/matches/m2` → undefined;
    - an undefined match → undefined;
    - a match without a variant → undefined.
  - `gameModesFor`:
    - `"caller"` → 14 modes in the stated order, ending with `Bull-off`;
    - `"animations"` → 13, no `Bull-off`.
  - `gameModeGroupsFor("animations")` has no "Before a match" group.
  - Every label equals the verbatim list above.
  - `enabledIn(undefined, shown)` → all shown.
  - `enabledIn(["RTW","Bull-off","Nope"], animationsShown)` → shown minus RTW.
  - `disabledToStore(shown, shown)` → undefined.
  - `disabledToStore(shown, shownMinus(RTW, ATC))` → `["ATC","RTW"]` in shown order.
  - `gameModesSummary`:
    - `(undefined, 14)` → `All games`;
    - `(["RTW","ATC"], 14)` → `12 of 14`;
    - all off → `None`.
- [ ] **Step 3: Run them. Expected: FAIL** (module missing). Then a wrong-value stub, and every test fails on its assertion.
- [ ] **Step 4: Write `utils/game-modes.ts`** as in the spec's Decision 3 (code in the execution record).
- [ ] **Step 5: Run the tests. Expected: all pass.** Then a mutation check:
  - `playsIn` with the missing-variant rule flipped fails;
  - `pageVariant` without the href check fails;
  - Bull-off kept for Animations fails.
- [ ] **Step 6:** ESLint via `--stdin --stdin-filename utils/game-modes.ts`. Expected: clean.

### Task 2: The merge commit (in `$WT`)

**Files:** the pull request's 16 files. Conflicts are resolved to `main`'s version in `CHANGELOG.md`, `README.md` and the four settings components.

- [ ] **Step 1:** `git checkout --ours CHANGELOG.md README.md components/Settings/{Animations,Caller,SoundFx,Wled}.vue` and `git add` them.
- [ ] **Step 2:** SFC compile of the four settings components and `components/AppMultiSelect.vue`, and `grep -c '<<<<<<<'` over the tree. Expected: `ok` everywhere, 0 markers.
- [ ] **Step 3:** Commit the merge in `$WT`:
  - subject `Merge pull request #251 from MeisterBob/per-gamemode`;
  - body: the pull request's title, and one paragraph on the resolution;
  - the Claude trailer.
  Do **not** fast-forward `main` to it.

### Task 3: The stored shape without a migration (in `$WT`)

**Files:** `utils/storage.ts`, `entrypoints/content/migration-config.ts`, `utils/game-data-storage.ts`, `utils/helpers.ts`

- [ ] **Step 1: `storage.ts`**
  - The four `disabledGameModes: GameMode[];` become `disabledGameModes?: GameMode[];`. The first has a doc comment ("the game modes it doesn't play in … missing plays everywhere … only stored while one is off … read it through `playsIn`"), and the other three say "as `caller.disabledGameModes`".
  - Add `import type { GameMode } from "@/utils/game-modes";`.
  - Remove the four `disabledGameModes: [],` defaults, and put back `version: 22`.
- [ ] **Step 2: `migration-config.ts`:** remove the pull request's `case 22`.
- [ ] **Step 3: `game-data-storage.ts`:** remove the enum and `toEnabledGameModes` / `toDisabledGameModes`, keeping the pull request's removal of `gameMode` from `IGameData`.
- [ ] **Step 4: `helpers.ts`:** `import { GameMode } from "@/utils/game-modes";`.
- [ ] **Step 5: Check.**
  - `git diff <main> -- utils/storage.ts` is only the optional fields, their comments and the import.
  - `migration-config.ts` is identical to `main`.
  - Expected: as stated.

### Task 4: The players (in `$WT`)

**Files:** `entrypoints/match.content/{caller,sound-fx,wled}.ts`, `entrypoints/match.content/Animations.vue`

- [ ] **Step 1:** In each `.ts`:
  - Remove `_is_enabled` and the added `GameMode` import, and import `{ pageVariant, playsIn }` from `@/utils/game-modes`.
  - In the game-data watcher and the first-load check, use `playsIn(config?.<feature>, gameData.match?.variant)`.
  - In the board watcher: `const stored = await AutodartsToolsGameData.getValue(); if (playsIn(config?.<feature>, pageVariant(stored?.match, window.location.href))) …`, with one line on why.
- [ ] **Step 2:** In `Animations.vue`, remove `_is_enabled`. The watch callback becomes `if (playsIn(config.value?.animations, gameData.match?.variant)) processGameData(gameData);`.
- [ ] **Step 3:** SFC compile, and ESLint per file against `main` (no new findings).

### Task 5: `GameModesField` and the four dialogs (in `$WT`)

**Files:**
- Create: `components/Settings/Library/GameModesField.vue`
- Modify: the four settings components
- Delete: `components/AppMultiSelect.vue`

- [ ] **Step 1: `GameModesField.vue`**
  - Props `feature: GameModeFeature` and `intro: string`; model `GameMode[] | undefined` (the disabled list).
  - The button:
    - a small default `AppButton`, `auto`;
    - text = `gameModesSummary`, and a chevron;
    - `aria-label` "Game modes: {summary}".
  - The `AppModal`:
    - `show`, `title="Game modes"`, `ghost-close`;
    - the intro line;
    - an "All games" row: `bg-white/[.04]`, rounded, with an `AppSwitch`;
    - a section per group from `gameModeGroupsFor`: a heading, then a `sm:grid-cols-2` grid of rows (label left, `AppSwitch` right, a bottom border);
    - a footer with `Cancel` and `Save` (primary).
  - Behaviour:
    - The draft is the enabled list, filled from `enabledIn` on open.
    - Save sets the model to `disabledToStore(shown, draft)`; Cancel closes without changing anything.
- [ ] **Step 2:** In each dialog, add `<OptionRow :description title="Game modes">` holding `<GameModesField v-model="config.<feature>.disabledGameModes" feature=… intro=…/>`, with the spec's verbatim copy.
  - Caller, WLED and Animations: the row goes last in the existing Options section.
  - Sound FX: a new Options section (`adt-section-title`) holding just this row, before its `LibrarySection`.
  - Import `GameModesField`.
- [ ] **Step 3:** `git rm components/AppMultiSelect.vue`. Confirm nothing imports it.
- [ ] **Step 4:** SFC compile for all five `.vue` files, and ESLint per file against `main`.

### Task 6: Docs, whole-tree checks, the feature commit (in `$WT`), and landing

**Files:** `README.md`, `CHANGELOG.md`, `CLAUDE.md`

- [ ] **Step 1: README.** Add a *Game modes* bullet:
  - Caller › Configuration Options, first;
  - WLED › Configuration Options, after Board Filtering;
  - Animations › Configuration, after *Covers*;
  - Sound FX: a short "#### Game modes" paragraph before "Game Event Sounds".
  Each says where it is (the Options) and that every game is on until one is switched off. Sound FX and WLED also say that lobby and tournament sounds and effects play in any game.
- [ ] **Step 2: CHANGELOG.** Under `[Unreleased]` › Added, the rewritten entry with "(#222)" and "- Contributed by @MeisterBob".
- [ ] **Step 3: CLAUDE.md.**
  - The "Game Modes" note, rewritten for `utils/game-modes.ts`, `playsIn`, `pageVariant` and `GameModesField`.
  - The component list back to `main`'s, without `AppMultiSelect`.
- [ ] **Step 4: Checks.**
  - tsx: all pass.
  - In `$WT`: symlink `node_modules` from the repo, `npx wxt prepare`, then `npx vue-tsc --noEmit`. Expected: the 14 baseline errors only.
  - `yarn build` in `$WT`. Expected: pass.
  - `git status` in `$WT`: only intended files, with any regenerated committed `.d.ts` reviewed.
- [ ] **Step 5: Commit** the `feat:` in `$WT`. Message ends with `Closes #222`, `Co-Authored-By: Gerhard <git@gerhard-joerges.de>` and the Claude line.
- [ ] **Step 6: Land.**
  - `ListAgents`: peers idle.
  - `:9222/json/list`: no `/matches/` tab.
  - `git merge --ff-only $(git -C $WT rev-parse HEAD)` in `$REPO`.
  - Wait for the rebuild. `touch utils/storage.ts` if `match.js`/`content.js` didn't move, then grep each bundle for a literal: "Game modes", "Before a match", and in `match.js` a literal of the gate if there is one.
  - Check the user's config: unchanged (no migration ran), key-sorted compare against a backup taken just before landing.

### Task 7: Live checks (yarn dev Chrome, own window)

- [ ] **Step 1: Settings (a CDP script like #254's).**
  - For each of the four dialogs:
    - the row shows "All games";
    - the editor opens with every switch on (14, or 13 for Animations);
    - switch RTW and ATC off, Save → summary "12 of 14" (Animations "11 of 13"), and storage holds `["ATC","RTW"]`;
    - reopen → those two off;
    - Cancel after changes → storage unchanged;
    - All games on and Save → the key is gone.
  - Screenshots at 1600 × 1000 and 390 × 844 (2×), and an overflow check.
  - Restore only `caller`/`soundFx`/`wledFx`/`animations`' `disabledGameModes`, as they were.
- [ ] **Step 2: Players (the bot-match script from #254, extended).**
  - Test config: Animations on with one GIF on `t20`; Sound FX on with one sound on `ambient_t20`; the Caller on with a sound on `t20`; WLED on with one effect on `t20` whose URL points at a LAN stand-in `http://<LAN IP>:<port>/`. All four have `disabledGameModes: ["RTW"]`, except Sound FX's, which is `[]`.
  - Recorders:
    - the Animations overlay (shadow root);
    - `HTMLMediaElement.prototype.play` and `speechSynthesis.speak` in the isolated world;
    - requests on the stand-in.
  - Visits, as injected game-data on my own X01 bot match:
    - (a) `variant: "X01"`, T20 → all four fire;
    - (b) `variant: "RTW"`, T20 → Animations, the Caller and WLED stay silent, and Sound FX plays (Review Focus 4).
  - Board data:
    - a takeout event with the stored match = mine and variant RTW, Sound FX's list `["RTW"]` → no takeout sound;
    - the same with the stored match's id ≠ this page's → the takeout sound plays (Review Focus 1).
  - Leave: abort the match, and restore every key I wrote.
- [ ] **Step 3:** Ledger every result. Any fix → an edit in `$REPO` with its own RED→GREEN, amended into the `feat:` commit.

### Task 8: Review, close-out

- [ ] **Step 1:** A fresh reviewer (most capable model) on the package `cb…` (`main` before the merge) `..HEAD`, with the spec, this plan, the Review Focus and the ledger rulings. One fix pass for Critical/Important, each RED→GREEN.
- [ ] **Step 2:** Comment on #251 for @MeisterBob, in #254's shape (thanks, what changed and why, next release). Leave it open, so the push closes it as merged and closes #222.
- [ ] **Step 3:** Rulings and deferred minors to the user; delete the plan workspace and the worktree.
