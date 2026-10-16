# One game event processor for the Caller, Sound FX, WLED and Animations

**Date:** 2026-10-11
**Branch:** `feature/game-event-processor`, from `main` at 3.3.0
**Status:** built; type check, `yarn i18n:check`, lint and both builds pass, and recorded games replay as expected. Not yet played in a browser (see *Open*).

## The request

The branch `local/gameDataprocessor_rework` had started to merge the game data processing of the Caller, Sound FX, Animations and WLED into one processor. It still parsed the state frames. `darts-board-controler-py` takes most of its events from autodarts' `game-events` topic instead. From the old branch, keep this: the processor returns a list of possible triggers, weighted by priority, and each feature can change the weights.

Decisions made with the user before building:

- **Start again from `main`.** The old branch was 368 commits behind (Teams, partner rule, `settleGameData`, `playsIn`, `winId`). It is the source of the idea only: `IGameTrigger`, the priority levels, overrides per feature, and `findMatchingItem`.
- **Hybrid source.** Game events are read together with the state frame they come with, as `match_state.py` does.
- **All four features** move over in one change.
- **Weights:** defaults in code and a feature's own order in code, which the user can override in the settings by **dragging the kinds of trigger into an order**.

## What was there

Each feature watched the stored game data, diffed every update against the one before, and worked out on its own what had happened. The same logic was copied between them, and the copies had drifted:

- the win guard (`winId`/`announcedWin`) six times
- the board event table three times, WLED's being the longest
- the single bull (`25` → `s25`) about fourteen times
- the fallback chains (`t20` → `triple` + `20` → `20`, `m17` → `outside`), each slightly different. The Caller's and Sound FX's took about 250 and 700 lines

The bot check was `!!cpuPPR` in one feature and `cpuPPR !== null` in another. Animations had no settler and no comparison with the frame before. `gameon` only played when a feature started on a fresh match.

The `game-events` frames already reached the content script but were thrown away. `processWebSocketMessage` dropped every frame with a `body`, and `websocket-monitor.content.ts` never passed the topic on.

## What the game events are

All findings come from `ws-messages.log`, `ws-messages-killer.log` and `ws-messages-shanghai.log`, captured by `darts-board-controler-py`.

| event | body | note |
|---|---|---|
| `throw` | `coords`, `segment {bed, multiplier, name, number}` | |
| `turn_start` | `player` (name), `playerId`, `score`, `isCheckout` | `score` is what is left |
| `turn_end` | `points` | `0` on a bust; there is no busted flag |
| `game_shot` | `player`, `type` | `type` was `"match"` every time, leg wins included |
| `game_on` | `leg`, `set`, `variant`, `player`, `score`, `isCheckout` | only from leg 2 on; `playerId` all zeros |
| `killer_became_killer`, `killer_killed` | `players [{id, name}]` | |

**Order:**

- A dart: `throw`, then `.state`.
- The last dart of a visit: `turn_end`, then `throw`, then `.state`. `turn_end` comes **before** the third `throw`.
- A win: `game_shot`, then the winning `throw`, then `.state` with the winner.
- A new visit: `turn_start`, then `.state` with nothing thrown.
- **The state sometimes comes first.** In one visit the third dart's state came before its `throw` and `turn_end`, which then arrived with the next visit's `turn_start`.
- Corrections produce no game events, only `.corrections` and `.referee` frames and a new `.state`.

**So:**

- Nothing is read off an event alone. The events say *that* something happened; the state says *what*.
- A win or a bust always comes from the state as Teams' rules see it. The content script gets the real `game_shot`, while the site sees a voided one (`utils/void-checkout.ts`).

## Design

### Transport: events are stored with their state

`utils/websocket-helpers.ts`:

- Splits the topic into match and kind. `game-events` are held back per match, but only for the page's match (or the match of the last state stored, for a `/boards/<id>` page).
- A `.state` takes its match's events **synchronously, before the first `await`**, and is stored with them as `IGameData.batch = { id, events }`. The id is new for every frame.
- A `.corrections` merge gets an empty batch. Other kinds are dropped, as the `body` check did before.
- A match's frames are stored one after the other through a promise chain, so the batches cannot swap.
- Events older than 5 s when a state comes are dropped: their state never came.

Storage was chosen over an event bus because:

- `match.content`, `lobby.content` and the Animations shadow UI each have their own module instances.
- The features already watch `AutodartsToolsGameData`, so state, events and the previous value come in one write.

The plan's separate write of orphaned events was left out. Without their state they would announce the previous dart.

### `utils/game-events/`

| file | what |
|---|---|
| `types.ts` | `IGameEvent`, `IGameEventBatch`, `TriggerCategory`, `IGameTrigger`, `IRankedTrigger`, `FallbackKind` |
| `priorities.ts` | the levels, each feature's default order, labels; `orderFor`, `weightsFor`, `orderToStore`. Message keys only (`labelKey`, `hintKey`), no i18n import, since `storage.ts` imports it |
| `derive.ts` | `deriveTriggers({ events, state, prev, source, names, localUserId, turnStartScore })`. Pure: no storage, no extension APIs |
| `board.ts` | `boardTrigger` (WLED's table, now everyone's), `lobbyTrigger`, `isOnALobbyPage` |
| `patterns.ts` | `triggerPatterns`, moved out of `utils/helpers.ts`, which re-exports it |
| `match.ts` | the matcher: `rankItems`, `pickBest`, `pickPerCategory`, `itemsOn` |
| `processor.ts` | `registerTriggers(registration)`; one watcher per bundle |

### The processor

Each feature registers with:

- `feature` and `settings()` (`enabled`, `disabledGameModes`, `priorityOrder`, read at every update)
- `categories()`, `fallbacks`, `filter`
- `onTriggers`, `onBoard`, `onLobby`, `onEdit`

On a game data change, the processor:

1. Skips it unless it is this page's match: the id in `/matches/<id>`, or a `/boards/<id>` board among the players. Storage is shared by every tab.
2. Clears the once-only memory when the match changes.
3. Calls `onEdit` while a dart is corrected (`activated >= 0`).
4. Handles a **new batch with events** straight away (`source: "events"`). First `settler.flushBefore()`, so a state still settling for another moment is acted on rather than lost. Afterwards `settler.markActed()`.
5. Sends anything else through `settleGameData`, as before (`source: "state"`). The two paths share its note of what was acted on, so a state is never acted on twice.
6. For each feature:
   - checks `playsIn`
   - keeps the categories, fallbacks and filter it takes
   - drops once-only triggers it has had: gameon per leg, bulloff, a win. A repeated **win** silences the whole update, which keeps WLED's lights on it.
   - weighs the rest by its order plus each trigger's bonus
   - sorts them, highest first
   - calls `onTriggers`, even with nothing for it, since WLED falls back to `gameon`

A feature registering derives once from the stored state (`source: "init"`). This only calls a game about to begin (round 1, player 0, nothing thrown), and replaces each feature's old start-up call.

The once-only memory survives the features being torn down and started again, as `index.ts` does on the hand-over from the bull-off.

Board events go to `onBoard`, gated by `playsIn(settings, pageVariant(...))`. Lobby joins and leaves go to `onLobby`, gated only by the feature being on. `tournament_ready` stays with the features (`watchTournamentReady`).

### Derivation

**When something counts as new:**

- **`gameStart`:** a `game_on` event, or a state at round 1 with nothing thrown, of a leg (or variant, after the bull-off) that differs from the one before.
- **`newVisit`:** `gameStart`, a `turn_start` event, or the player or round changed. It drives the checkout call and a practice game's target.
- **`playerUp`:** `gameStart`, or a new visit by somebody else. It drives the name.
  - Kept apart from `newVisit` because `turn_start` comes every round in a solo game, which would call the name on every visit. A solo game now names its player once a leg, as before.
- **`newDart`:** the visit has more darts than the state before. A visit already under way when first seen counts too. So does a dart rewritten in place (a correction), which calls the visit again as it now stands.

**Triggers, by category and level:**

- **start:** `gameon` (once per leg), `bulloff` (once per match; nothing else is derived during the bull-off). Each player called up in the bull-off — an update with nothing thrown yet and a `turn_start`, or another player or round than the state before, which comes after the takeout — adds a `bulloff` marked `joinedOnly`: the matcher never matches it alone, only as a part of a `+` item, so `bulloff+alice` calls Alice to the oche before she throws (the context names whoever is up) and a plain `bulloff` sound stays a single call. The first player is named by the once-only `bulloff` itself
- **player:** the names from `turnNames` (both spellings, a bonus of −0.1 per name down the list), `bot`, and `next_player` except at a game's start
- **remaining:** `yr_<n>`, `you_require_<n>`, `[you_require, <n>]` (a sequence)
  - The amount comes from `turn_start`/`game_on` (`isCheckout`, `score`), else the state's `checkoutGuide`.
  - Gotcha uses `gotchaCheckout`.
- **outcome:** `matchshot`, `gameshot`, `busted`, `partner_rule` (+5). A win for one player, team or seat is a `+` item with the context (`gameshot+alice`, `matchshot+player2`); `gameshot_<name>`/`matchshot_<name>` were dropped, since a name may hold underscores, and config migration 19 (`renameTrigger` in `utils/config-renames.ts`) rewrites saved ones, as `renameSettings` does for imported settings
- **winner:** after a match shot, the winner's names, or `bot` (Caller only)
- **throw:** the dart, with stand-ins as fallbacks. The single bull is always `s25`, with no stand-in: `25` is only ever a visit's total (the `legacy25` fallback was dropped, as it fired a total's item for the bull):
  - `[single|double|triple, n]` (−1, `word`)
  - `n` (−2, `number`), for a single only: a double's or triple's number is only said after its word
  - `miss` (−2) and `outside` (−3) (`outside`)
- **total:**
  - The visit's points after its last dart, unless it bust or won.
  - In Cricket, the running score instead, tagged `cricketScore`, when it moved since the visit began (only the Caller keeps it).
- **combo** (`comboTriggers`): the three darts after a visit that neither bust nor won, and the winning visit's two or three darts after a win (`gameshot+t20_t15_d20`; one dart is the dart's own trigger). The single bull is `s25` here as it is on its own (Animations already did this), with no `25…` form. Every way of putting `miss` for the visit's `m1`–`m20` darts is a `missWildcard` fallback, −0.2 per dart left open, so `s20_miss_d20` fits `s20_m5_d20` and the exact combination wins
- **variant:** `cricket_hit`/`cricket_miss` (state segments against the state before), `gotcha`, `killer_*` (from the events), and `luckynumber`: after a visit that neither bust nor won, scored at least one point, and leaves `gameScores[player]` as one digit repeated above 10, in the games that count down (X01, Random Checkout). Added at the user's request; a category of its own was not needed, since `variant` holds nothing else in those games
- **target:** `target<N>`/`targetbull` (ATC, RTW, Shanghai, Bob's 27)
- **names:** `names.turn` and `names.matchWin` from `utils/team-calls.ts`; a leg's winner needs no list of its own, being whoever is up
- **thrower:** `bot_throw`, `opponent_throw` (the player up throws outside this room: `isPlayerUpInTheRoom` of `utils/own-board.ts`, with the page's address and the board the site autoscores with, which the processor hands in as `DeriveInput.here`)

### Priorities

`TRIGGER_LEVELS`: MATCHSHOT, GAMESHOT, BUSTED, PLAYER_NAME, PLAYER_NAME_COMMON, GAMEON, COMBINED_THROWS, POINT_TOTAL, POINT_REMAINING, POINT_REMAINING_COMMON, VARIANT, INDIVIDUAL_THROW, THROW, BOARD_EVENT, OTHER.

**How the order turns into weights:**

- A feature's order lists the levels its settings show. Levels it doesn't list follow, in the global order.
- A level's weight is `(n − index) · 10`, and a trigger's bonus stays well inside the step.
- `priorityOrder` is stored as level **names**, and only while it differs from the default (`orderToStore`). A missing list is the default, so nothing is migrated. `orderFor` repairs a stored list: unknown levels go, and missing ones go back in after their default predecessor.

**What the order does in each feature:**

- **Caller and Sound FX** play the best item of each category, in descending order (`pickPerCategory`). The order is therefore both the choice within a category and the order of the calls.
  - A trigger in `outcome` removes `throw`, `total` and `combo`, which was the old if/else.
  - The Caller's **Prefer Combined Throws** drops the total when a combination is picked.
- **WLED and Animations** show one item (`pickBest`).
- **The matcher:**
  - matches exactly, ignoring case
  - takes Sound FX's `ambient_` form first
  - applies ranges to visit totals only
  - plays a sequence's first part if there is an item for it, and later parts only where there is one
  - lets an item trigger joined with `+` (`matchshot+t20`) match when all its parts are a feature's own non-fallback triggers, scoring as its strongest part plus a bonus for the others (2 + 1 % of its priority per trigger part, 1 per context part), capped below the next level, so `matchshot+d20` > `matchshot` > `gameshot+d20` > `gameshot`. It first summed its parts' priorities, which put `gameshot+d20` above `matchshot` on a match-winning dart
  - also lets a `+` part be the update's **context** (`contextTokens` in `derive.ts`, handed to the features as `TriggerUpdate.context`): the names of whoever is up (`turnNames`, both spellings), their seat (`player<index + 1>`, the seat's `index`, which stays from leg to leg) and the variant (`x01`, `bob's_27`). A context part adds 1, well inside a level's step, so `t20+alice+cricket` beats `t20+alice` beats `t20`. At least one part must be a trigger of the update, so a name and a game never go off alone. Added after the first build, at the user's request; `validateAnimationTriggers` accepts these too, along with the shared triggers it had not known (`matchshot`, `partner_rule`, `m1`–`m20`, `miss`, combinations with misses and `25`). Seats, winning visits and `miss` in combinations followed from PR #241 (kobra180), which did the same for Animations alone with `_` suffixes; `+` was kept, so `gameshot+max_mustermann` cannot be read as three parts
  - breaks ties at random
- WLED looks `bot` up as `bot_throw`, its old effect for a bot coming up.

**Default orders:**

- **Caller:** wins, bust, name, next player, gameon, checkout, checkout in parts, game-specific, dart, total, combination
- **Sound FX:** wins, bust, name, next player, gameon, game-specific, dart, total, combination, bot/opponent dart
- **WLED:** wins, bust, game-specific (targets), combination, total, dart, name, gameon
- **Animations:** wins, bust, game-specific, combination, total, dart

**Categories each feature takes:**

- **Caller:**
  - start, player, winner, outcome, total, combo, variant
  - remaining only with **Call Checkout**, throw only with **Call Every Dart**
  - no combinations in Cricket
- **Sound FX:**
  - start, player, outcome, throw, total, combo, variant, thrower (the thrower on channel 2)
  - in Cricket, no totals or combinations
- **WLED:**
  - outcome, player, start, throw, total, combo, variant, target
  - no Cricket score
  - falls back to `gameon`, or `bulloff` while the bull-off lasts
- **Animations:**
  - outcome, throw, total, combo, variant (since `luckynumber`)
  - no Cricket score

**Settings.** `components/Settings/Library/PriorityOrderField.vue` is built like `GameModesField`: a button saying Default or Custom, and a modal with a draft list. The list is dragged with sortablejs (as in `LibrarySection`), or moved with arrow buttons. The modal has Reset to default, Cancel and Save. It is a row under Options in all four panels.

**Texts.** All in en, de and nl:

- `locales/*/triggerPriorities.ts`
- `<feature>.priority.{description,intro}`
- new trigger hints, and the board set moved into `triggers.board`

### What the features kept

- **Caller and Sound FX:** their audio (pools, lanes, unlock, TTS, copies at other volumes) and an `enqueue(sound)`. Sound FX keeps its two channels.
- **WLED:** `setEffect`/`tryEffect` with `utils/wled-request.ts` (`{player}` placeholders, *Don't restart a running effect* by request key), `other` while the player up is outside this room (`utils/own-board.ts`, board events included), the turn's first effect (`bot_throw`, the player's or their team's, `next_player`, `gameon`) and *Keep the player's effect between darts* (`keepTurnEffect`), and `idle` on teardown. `utils/wled.ts` is gone: its `turnStartEffect` is `effectOfTheTurn` in the entrypoint, which finds the name effect with the matcher and the context, so `alice+x01` works there too.

### Rebased onto main (2026-10-14)

Main had moved on by 130 commits while this was built. Kept from it: the sets of the four libraries (the features still read the list in use; migration 19 rewrites `gameshot_<name>` in every set's list as well, after main's 17 and 18), WLED's room detection instead of the Boards list, `{player}` in effects, `next_player` for WLED, *Keep the player's effect between darts* (#267), the animation packs and the previews. Sound FX's `opponent_throw` takes main's room rule through `derive.ts`.
- **Animations:** its overlay; `play` now takes the picked animation.

Sizes: `caller.ts` went from 1528 to 981 lines, `sound-fx.ts` from 2329 to 1261.

## Behaviour that changed on purpose

1. `gameon` plays at the start of every leg, not only when the page opens on a fresh match.
2. A reload in the middle of a visit doesn't call its last dart again.
3. Of a name's two spellings, one plays, not both.
4. **Animations** show one GIF per moment (win or bust over the dart, combination over total), not one after another with a 500 ms gap.
5. **WLED:** `matchshot+t20` beats a plain `matchshot`.
6. Bots are told by `!!cpuPPR` everywhere.
7. **New triggers:**
   - **Caller and Sound FX:** the whole board set
   - **Caller and WLED:** `cricket_hit`/`cricket_miss`
   - **Caller, Sound FX and WLED:** `gotcha` and `killer_*`
   - **Caller and Animations:** `matchshot`
   - **Animations:** `partner_rule`
8. Ranges only match visit totals.
9. **Sound FX:**
   - `miss` no longer falls back to `cricket_miss`, which the variant trigger plays anyway
   - a win for one player is `ambient_gameshot+<name>` now (migrated)
10. Combinations name the single bull `s25` everywhere
11. Calls come as soon as a state with events arrives, without the 200 ms settle.

## Verification

- `yarn compile`: 12 errors, all on `main` already. `main` has 15; two old ones in `wled.ts` went with the rewrite.
- `yarn i18n:check` passes, ESLint is clean on the new and rewritten files, and `yarn build` and `yarn build:firefox` pass.
- `scripts/replay-game-events.ts` replays a captured log through `deriveTriggers` (see `scripts/README.md`). On the three logs at the time:
  - **wins:** `matchshot` and `gameshot` once per win
  - **checkout calls:** `yr_<n>` once for each `turn_start` with `isCheckout` (75 of 75)
  - **leg starts:** `gameon` once per `game_on` (8 of 8). The logs start mid-match, so there is no first leg.
  - **busts:** `busted` once per busting visit
  - **Cricket:** hit and miss
  - **other games:** `target<N>` in Shanghai, `killer_*` in Killer
  - **Two bugs found and fixed this way:**
    - the name on every visit of a solo game
    - Cricket calling a score of `0` on the first visit

## Open

- **Play it in a browser** (`yarn dev`), in Chrome and Firefox:
  - X01: busts on darts 1–3, a checkout call, leg and match wins with names, gameon in legs 1 and 2
  - Cricket: hit, miss, closed numbers
  - WLED: targets in ATC
  - the bull-off, then the match (exactly one gameon)
  - a corrected dart
  - Teams' partner rule
  - a reload mid-visit
  - a bot match
  - lobby join and leave, tournament ready
  - board start, stop and takeout
  - a Firefox tab in the background with a quick Next (#249)
  - two tabs
  - a `/boards/<id>` page: does the site subscribe to game events there? If not, the state path covers it.
  - the Priority editor
- **Unexplained:** the grown main log has 24 `game_shot` events but only 22 states with a winner. Not looked into. Partner-rule checkouts that Teams voided are a guess.
- **Old branches:** the WLED Cricket logic of the `cricket` branch (`cricketPrefix`, segment URL, `cricket_*_dart`, `cricket_gameon`) is not on `main` and was left out. It is to be moved onto the processor in that branch.
- **Config is read once.** As before, the features read the config when they start, so a changed order applies from the next match page.
