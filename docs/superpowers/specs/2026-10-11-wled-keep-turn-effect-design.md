# WLED keeps the player's effect between darts (PR #267, reworked as an option)

**Date:** 2026-10-11
**Pull request:** [#267](https://github.com/creazy231/tools-for-autodarts/pull/267), "Implement player name trigger in WLED after each throw", by @vert0r: one commit, `23912857`, on their fork's `main`, branched from `30158e7` (origin/main, 3.3.0).
**Status:** designed and built without approvals, at the user's request ("arbeite ohne, dass ich interagieren muss, da ich erstmal afk bin"). Each call made without the user is listed under *Rulings*.

## The request

> baue diesen PR dann bitte ein und mach es so, dass der PR automatisch closed wird wenn wir das dann auf main pushed haben und auch so, dass der ersteller für den PR erwähnt wird sobald alles in main ist. […] wenn du fertig bist, commite bitte alles local ohne es zu pushen

That is:

1. Build the pull request's feature in.
2. Pushing `main` closes #267.
3. @vert0r is credited once it is in `main`.
4. Commit locally, push nothing.

Before this, the user asked whether #267 was already covered by our own WLED work (`next_player`, `{player}`, `other`). It isn't, and that check is the source of *What was found*.

## What the pull request does

At the end of `processX01Data` (`utils/wled.ts`), after every dart trigger has failed to match, it takes the seat's name (`match.players[match.player].name`), lower-cases it, turns its spaces into underscores, and returns it as the trigger when an effect has it. So after a dart that sets off nothing of its own, the effect on the player's name is sent instead of `gameon`, and a player's colour stays on through their turn. It is always on.

## What was found

**Our code doesn't do this.** A turn's first effect comes from `turnStartEffect` (`utils/wled.ts`):
1. `bot_throw` for a bot;
2. otherwise the effect of the first of `turnNames(match)` that has one, each name as typed and with underscores for its spaces;
3. then `next_player`;
4. then `gameon`.

After a dart, `processGameData` (`entrypoints/match.content/wled.ts`) starts from `gameon`, and only a dart's own effect replaces it. The README says so ("the name stays up until the first dart's effect, or `gameon`, takes over"), and so does the `[Unreleased]` entry for `next_player` ("the first dart of a turn brought `gameon` back").

**Headless, main against main + #267.** The real `entrypoints/match.content/wled.ts` was bundled with esbuild, once with each `utils/wled.ts`, and driven through a local turn. The effects were on `gameon`, `anna`, `tom meier` (typed with its space, as the README allows) and `t20`, with *Don't restart a running effect* on:

| Update | main | main + #267 |
|---|---|---|
| Anna's turn starts | anna | anna |
| Dart 1, S5, no effect of its own | gameon | nothing sent: anna stays |
| Dart 2, T20 | t20 | t20 |
| Dart 3, S1, no effect of its own | gameon | anna |
| Tom Meier's turn starts | tom | tom |
| Tom's dart 1, S7 | gameon | gameon |

Without a `gameon` effect, main already keeps the player's effect, but only until a dart's own effect replaces it for the rest of the turn.

**What the pull request gets wrong:**
- It looks the name up with underscores only. `turnStartEffect` takes it as typed too, so a player whose effect is on `tom meier` starts their turn with it and loses it to `gameon` after the first dart (the table's last row).
- It looks up the seat, not the player whose turn it is. With Teams' shared score, the seat is the team, so a player's own effect gives way to the team's, or to `gameon`.
- It picks again at random on every dart (`setEffectByTrigger`). A player with two effects on their name can change colour in the middle of a turn.
- It doesn't skip bots. A bot's turn starts with `bot_throw`, and its darts would look up the bot's seat name.
- `next_player` isn't kept: a player without an effect of their own still gets `gameon` after the first dart.
- It changes released behaviour for every setup with an effect on a name as well as on `gameon`.
- Its comment is in German, it leaves a line of spaces, and it has no README or CHANGELOG change.

**Merging it.** The commit applies cleanly to today's local `main` (37 lines further down) and merges cleanly: its only file is `utils/wled.ts`, which `main` changed elsewhere. GitHub marks a pull request merged when a push brings its head commit into the base branch, as it did for #251, #254 and #258. The head is the fork's `main`, so a later push there moves it. In that case the merge needs redoing as `git merge -s ours <new head>` before our push; the `changelog-on-pr-merge` memory has the recipe.

## Approaches

1. **Merge it as it is.** Turned down, for the problems above.
2. **Merge it for history and credit, rework it in the next commit, and land both together.** *Chosen*, as for #251, #254 and #258. GitHub marks #267 merged when `main` is pushed, with @vert0r's commit in it.
3. **Re-implement and close the pull request.** That loses the contributor's merge for nothing, and the user asked for the push to close it.

What the rework does with the behaviour:

- a. **An option, off by default.** *Chosen.* The user's standing rule is to keep released defaults and make a trade-off between setups a setting. This is one: a setup that flashes the player's effect at the start of a turn and then shows `gameon` as the background would lose that.
- b. **The new behaviour for everyone.** Turned down, by the same rule.
- c. **A switch on each effect**, "keep for the turn", in the effect's editor. More to explain and to build, and nothing asks for it. The option covers the request.

## Decisions

1. **The merge commit is mechanical and is never checked out in the watched tree.**
   - Its subject is GitHub's default: `Merge pull request #267 from vert0r/main`.
   - It takes the pull request as it merges.
   - It is built in a worktree outside the repo, together with the rework. `main` is fast-forwarded in one step, so the running `yarn dev` only ever sees the final state.

2. **The option is `wledFx.keepTurnEffect?: boolean`.** It is optional: missing is off, as before the option. It needs no migration and no version change, and it isn't in `defaultConfig`. The panel's switch shows a missing value as off.

3. **With the option on, every update WLED acts on starts from the turn's effect, not from `gameon`.** The turn's effect is what the turn started with, chosen the way `turnStartEffect` chooses it: `bot_throw`, the player's or their team's effect, `next_player`, or `gameon`. So a dart that sets off no effect of its own brings it back. These are unchanged and still take precedence:
   - a dart's own effects;
   - a won leg or match;
   - a bust and the partner rule;
   - `other` for somebody elsewhere;
   - the bull-off;
   - board events.

   With the option on, a page opened in the middle of a turn shows the turn's effect, where it showed `gameon` before.

4. **A turn's effect is chosen once per turn and player.**
   - It is looked up by the match, set, leg, round, seat, turn id and the names `turnNames` gives, so with Teams a change of who throws picks again.
   - A trigger name (`next_player`, `bot_throw`, `gameon`) is resolved to one of its effects at that moment, the same random pick `setEffectByTrigger` makes. So a player with several effects, or several `next_player` effects, keeps the one their turn started with. The pick is split out of `setEffectByTrigger` as `pickEffect`.
   - It is forgotten when WLED starts on a page, since the effects may have changed, and when it is torn down.
   - With the option off, it is used only at the start of a turn, as today. One difference: a turn whose darts are all undone goes back to the effect it started with, where it used to pick again.

5. **The pull request's lookup in `processX01Data` goes.** The rework leaves `utils/wled.ts` as it is on `main`. With the lookup kept, the option couldn't switch the behaviour off.

6. **Don't restart a running effect** works as it does for every effect. While the turn's effect is still showing, it isn't sent again; after a dart's own effect, it is. With *Don't restart a running effect* switched off, it is sent after every dart that has no effect of its own, as `gameon` is today.

7. **The settings.** One `OptionRow` under *Options*, after *Don't restart a running effect*, with an `AppToggle` like it:

   | | Title | Description |
   |---|---|---|
   | en | Keep the player's effect between darts | A dart that sets off no effect of its own brings back the effect the turn started with, such as the player's own, instead of gameon. |
   | de | Effekt des Spielers zwischen den Darts halten | Ein Dart ohne eigenen Effekt holt den Effekt zurück, mit dem die Aufnahme begann, etwa den des Spielers, statt gameon. |
   | nl | Het effect van de speler tussen de darts vasthouden | Een dart zonder eigen effect haalt het effect terug waarmee de beurt begon, zoals dat van de speler, in plaats van gameon. |

   *Aufnahme* and *beurt* are the site's words for a visit (`locales/GLOSSARY.md`).

8. **README:**
   - a bullet for the option in WLED's *Configuration Options*;
   - `gameon`'s line under *Game Events*;
   - the `next_player` paragraph under *The player's name in an effect*;
   - *Smart Effect Selection*'s fallback.

9. **CHANGELOG.** The feature goes under `[Unreleased]` › Added, after the `next_player` entry, with a sub-bullet "Contributed by @vert0r ([#267](https://github.com/creazy231/tools-for-autodarts/pull/267))", as for @MeisterBob's.

10. **Credit.**
    - @vert0r's commit is in `main` through the merge.
    - The rework commit carries `Co-Authored-By: vert0r <37353813+vert0r@users.noreply.github.com>`, as the reworks of #251 and #254 carried @MeisterBob's.
    - The changelog names them.

    All three reach GitHub with the user's push, and with the push the pull request shows as merged. Nothing is posted to #267 now. The user asked for local commits only, and a comment linking commits would 404 until the push.

## Rulings

1. Approach 2: the merge for history and credit, then the rework, landed in one fast-forward.
2. Option a: a setting, off by default, not a new default.
3. The turn's effect covers `bot_throw`, `next_player` and a team's effect, not only an effect on a player's name.
4. A turn keeps the one effect it started with, rather than picking again on every dart.
5. No migration: the field is optional.
6. No comment on #267 before the push. A draft for afterwards goes in the hand-over.
7. The commits stay local on `main`. Nothing is pushed, and the version isn't bumped, since `main` is already at 3.4.0.

## Not doing

- A switch on each effect.
- Changing what `gameon` does with the option off.
- Bringing the turn's effect back after a board event (`throw`, `takeout`) without a game update. Board events set their own effects, and the next update that matches nothing brings the turn's effect back.

## Parts

- `entrypoints/match.content/wled.ts`:
  - the turn's effect, remembered;
  - `pickEffect`, split out of `setEffectByTrigger`;
  - the option in `processGameData`;
  - forgetting the turn's effect in `wledFx` and `wledFxOnRemove`.
- `utils/wled.ts`: the pull request's lookup goes again.
- `utils/storage.ts`: `keepTurnEffect?: boolean`, with a comment.
- `components/Settings/Wled.vue`: the row.
- `locales/{en,de,nl}/wled.ts`: `keepTurnEffect.title` and `.description`.
- `README.md` and `CHANGELOG.md`.

## Testing

- **The runtime, headless.** The real `entrypoints/match.content/wled.ts` is bundled with esbuild and driven through its own game-data watcher: in-memory storage, a recorded `fetch`, frames 350 ms apart, as in the earlier WLED work. Scenarios:
  - **Off:** exactly today's sends, the table's main column (a regression check).
  - **On:**
    - the table, with Tom's spaced name kept;
    - *Don't restart* off: the turn's effect is sent after every dart that has no effect of its own;
    - two `next_player` effects: the one the turn started with comes back after a dart's effect, with `Math.random` set up so that a second pick would choose the other one;
    - two effects on one name: the same;
    - a bot keeps `bot_throw`;
    - an online opponent with an effect on `other`: `other` throughout;
    - a winning dart: `gameshot`;
    - a page opened in the middle of a turn: the turn's effect, and `gameon` with the option off;
    - no `gameon` effect: the player's effect comes back after a dart's effect.
  - **Red first.** The same scenarios run against `main`'s module and against #267's, which fail the *on* cases.
  - **Mutants**, each of which must fail a scenario:
    - the option ignored;
    - the turn's effect picked again on every update;
    - trigger names left unresolved.
- **Checks:**
  - `yarn compile` against the 12-error baseline;
  - `yarn lint --base main`;
  - `yarn i18n:check`;
  - `yarn build`, for the entrypoint graph.
- **The yarn dev Chrome, in a tab of my own**, once `main` has the change:
  - the row in English, German and Dutch;
  - switched on and off, and read back from storage;
  - the user's config restored key by key.
