# Teams: design review fixes, the partner rule in the lobby, and the drawer's follow-ups

**Date:** 2026-09-30
**Builds on:** [2026-09-30-teams-design.md](2026-09-30-teams-design.md) and [2026-09-30-teams-own-scores-design.md](2026-09-30-teams-own-scores-design.md)
**Status:** the user asked for this and then went away, saying "please work on all of that without me need to interact". Nothing here was agreed in conversation. Every choice is a ruling of mine, marked **Ruling**, for review.

## The request

1. Check Teams in matches deeply for design errors, with the feature on and off, from screenshots.
2. Move the partner rule out of the feature settings and into the lobby's game creation. Every lobby gets its own switch, and the last state is kept for the next lobby.
3. In the Add Team drawer, let the user delete recently added player names and saved teams.
4. Allow uneven teams, such as 2 vs 1.
5. Find out how a bot joins a team in the lobby, and look into it.

## The design review (measured 2026-09-30)

Every match was set up through the API in a background tab of my own, in the `yarn dev` Chrome, at four sizes:
- 1920×1080, the Floating layout
- 1180×820, the Sidebar layout
- 820×1180, the Stacked layout
- 390×844, the phone layout

The board is measured as the size of the site's board element in CSS px. "Off" is the same match with Teams switched off and the tab reloaded.

| Match | Wide | Sidebar | Stacked | Phone |
|---|---|---|---|---|
| own scores, 2 v 2, off | 820 | 548 | 580 | 261 |
| own scores, 2 v 2, on | 739 | 467 | 438 | **120** |
| own scores, 2 v 2, on, partner-rule warning up | 695 | 423 | 395 | **57** |
| shared score, 2 teams, on (off 358 on the phone) | — | — | — | 322 |
| shared score, 2 teams + a bot, on | 773 | 501 | 468 | 150 |

### Findings

1. **Switching Teams off mid-match changes nothing until the page is reloaded.**
   - The match script reads the saved teams live, but not the `enabled` switch. The lobby script has the same gap.
   - The team view in `utils/websocket-helpers.ts` does follow the switch, so the pill kept showing while the decided/bust logic had stopped.
2. **Own scores squeeze the board in the stacked and phone layouts.** Four things add up:
   - each top-bar cell's team chip adds 30 px
   - the chip in the big card adds 30 px
   - the pill and its tally row take 81 px
   - wherever the rule can apply, a hidden line is kept for the partner-rule warning, 35 px more
   - on a phone the warning wraps to two lines

   On a phone, a 2 v 2 board is 120 px, and 57 px while the warning shows.
3. **In the wide layout, the partner-rule warning pushes the right-hand cards over the board.**
   - The site sizes the centre column (`grid … grid-rows-[auto_minmax(0,1fr)_auto]`) from its content, with the turn bar's row set to `w-0 min-w-full`.
   - At zero width our warning paragraph wraps to dozens of lines. That shrinks the board row in the sizing pass, so the column comes out 493 px wide.
   - The board then draws at its real size, 695 px, across the right-hand column.
   - Anything in the pill that can wrap has this effect.
4. **Top-bar cells come out at different heights.**
   - In the stacked and phone layouts with three or more seats, a team's cell gains a chip row. A plain seat's cell (a bot, a guest) doesn't.
   - The band's colour shows under the shorter cells.
5. **After a checkout the pill still says "LENA to throw"**, while the site shows its GAME SHOT and Next Leg. This happens in both formats.
6. **Own scores, rule on:** the empty line kept for the warning is a visible gap under the tally in every such match, and it costs board size.
7. **Phone lobby:**
   - the site's row of add buttons is `flex-1` each, with `overflow-hidden`
   - with Add Team as a third button at 390 px, "Add Player" runs into its button's edge
8. **Drawer, own scores:** the Players list is blank while it's empty. Nothing says where players come from.
9. **Drawer:**
   - there's no way to put a bot on a team
   - the shared-score tab doesn't say why a bot can't be a teammate there

   Today a bot joins an own-score team like this: add it with the site's Add Bot, open Add Team, pick Own scores, and tap it under *In this lobby*. That answers question 5: it's possible, but nothing points to it.
10. **Drawer:** a saved team whose players are already on another team in this lobby is still offered. Adding it fails with "autodarts didn't add ANNA and LENA. Try again.", and trying again can never work.
11. **Lobby rows:** a one-player own-score team reads "TEAM BLUE 1 of 1".
12. **Drawer:** Saved teams are at the bottom of a long, scrolling drawer. That's the fastest way to set up a returning team, but on a phone it's two screens down. The site's own Add Player drawer puts recent entries first.
13. **Drawer on a phone:** the name field is focused when the drawer opens, so the keyboard covers half the sheet at once.

With Teams off, nothing of Teams appears in a match or a lobby. The Sidebar layout's grey compact rows are the site's own; they look the same with Teams on or off.

## Decisions

### A. The pill is one line that never wraps

**Ruling:** own scores lose the tally row and the reserved warning line. Findings 2, 3 and 6 all come from vertical space, and one fixed-height row removes them.

- **Shared score:** as now, the site's StatusLine round the pill: `—— (TOBI to throw · TEAM BLUE) ——`.
- **Own scores:** the teams' legs flank the pill, in the lineup's order. The first half of the teams (rounded up) go on the left and the rest on the right.

  `—— [■ TEAM RED 1] (ANNA to throw · TEAM RED) [■ TEAM BLUE 0] first to 3 ——`

  - A tally chip is the team's swatch, name and legs. Its accessible name is "TEAM RED, 1 leg".
  - `first to N` follows the last chip.
- **Narrow rows** (a container query on the pill's own width, not the viewport):
  - below 520 px, the chips drop the team name (swatch and legs only), and the pill drops its secondary text in the normal state
  - below 640 px, `first to N` goes
- **The partner rule's lines move into the pill,** for the visits they concern. They take its primary and secondary text, on a dark pill (`--ad-ink-750`) with a 1.5 px ring:
  - warning (amber `#ffd27a`, ring `rgb(255 190 60 / 55%)`): `No checkout this visit` · `{TEAMMATE} has {x} left, more than {OPPONENTS} together ({y})`
  - bust (red `#ffb4b4`, ring `rgb(255 90 90 / 60%)`): `{PLAYER}'s checkout didn't count` · `partner rule`
  - undo refused: `Undo {PLAYER}'s checkout yourself` · `it breaks the partner rule, and autodarts didn't take it back`

  The timing is unchanged. The warning shows while the rule stops the player who's up, and the bust note from the bust through the visit after it. For own scores the pill's "ANNA to throw" repeats the site's own highlight, so giving it up for those visits loses nothing.
- **A won leg** (finding 5), while the site's Winner panel is up (`gameWinner >= 0`):
  - primary `{TEAM} wins the leg`, secondary the player who checked out
  - a seat on no team: `{PLAYER} wins the leg`, with no secondary text
  - once the site's match is won (`winner >= 0`) and for a team's decided match: `wins the match`, secondary the result for own scores (as now) or the player for a shared score
  - in the winner's colours
- **Language:**
  - "to throw" / "ist dran" as now
  - **Ruling:** the new win lines are in German too, since they sit where "ist dran" does: `gewinnt das Leg`, `gewinnt das Match`
  - the partner rule's lines stay in English, like the rest of our additions to the page
- **Nothing in the row can wrap.** Every text is `white-space: nowrap` with an ellipsis, the pill can shrink (`min-width: 0`), and the host's height is fixed at 48 px (a 40 px pill plus 8 px below). Its height never depends on its width, which is the cause of finding 3.

### B. Cards gain no rows above the board

- **Top-bar cells** (`SELECTORS.match.smallScoreCard`) get no chips at all, in either format. The waiting teams' name tags keep their gradient. This fixes findings 2 and 4.
- **Shared score:** the order chips stay on every full card, including the stacked layout's big card and the side-by-side cards of a two-seat phone match, since tap-to-correct lives there.
- **Own scores:** the team-and-legs chip stays only on full cards that sit beside the board: the wide layout's cards, and the sidebar's big card.
  - A card counts as above the board when its bottom edge is at or above the top of the turn bar's row (`SELECTORS.match.turnBarRow`). That row is the site's own, so it's there from the first paint.
  - The dressing runs on mutations and on `resize`.
  - The tally in the pill carries the legs in every layout.

Expected phone board for own scores, 2 v 2: about 214 px, warning or not (it was 120, and 57 with the warning).

### C. Teams follows its switch live

- **Match:** while `teams.enabled` is off, the script clears everything and draws nothing. When it's switched on again, the script draws again.
- **Lobby:** the same, for the Add Team button, the rows, the note and the partner-rule card, and an open drawer closes.
- A page that loaded with Teams off still needs a reload to start it, as every feature does.

### D. The partner rule is a card on the lobby page

The lobby page is the site's game creation: its title is "Create Lobby", and it holds the game card with *Edit settings* and the *Autoscoring* card.

- **Where:** a *Partner rule* card after the site's Autoscoring card.
  - From the site's `expanded` breakpoint (48rem) up, CSS turns that row into two columns, and only while our card is in it:
    - `display: grid`
    - `grid-template-columns: minmax(0,1fr) minmax(0,1fr)`
    - `grid-template-rows: auto 1fr`
    - the first child spans both rows

    So the right column holds Autoscoring and then the Partner rule, the two switch cards together.
  - Below 48rem the row is a column, and the card simply comes last.
  - **Ruling:** the right column, not a full-width row, because it stays next to the other switch and leaves the page's height alone.
- **When:** the user hosts the lobby, Teams is on, the lobby plays X01 without sets, and its teams aren't shared-score ones. A lobby with no team yet shows the card.
- **Look:**
  - the card, header, title and description are shallow copies of the Autoscoring card's own elements (`cloneNode(false)`), so it keeps the site's styling
  - the switch is a copy of the site's `[data-slot=switch]` and its thumb; we flip `data-checked` / `data-unchecked` and `aria-checked` ourselves
  - `role=switch`, focusable, and Space or Enter toggles it
  - when no Autoscoring card is there, we build our own with measured inline styles:
    - card `rgb(27 31 41)`, 18 px radius, 20 px padding
    - title Bebas 24 px
    - description 12 px / 600, `rgb(184 188 197)`
    - the switch 51×24, `#0b55df` when on and `#16181c` with a `rgb(55 76 152 / 60%)` 1 px ring when off
- **Copy:**
  - title `Partner rule`
  - description `Own-score teams in X01: nobody may check out while a teammate has more left than both opponents together. A checkout that breaks it is a bust.`
  - while it's on but the lobby's teams don't qualify: a second line, `It counts once there are two own-score teams and everyone is on one.`
- **State:**
  - `Lineup` gains `partnerRule?: boolean`
  - the card shows `lineup.partnerRule ?? config.teams.partnerRule`
  - toggling it writes `config.teams.partnerRule`, which is the state the next lobby starts from, and this lobby's `lineup.partnerRule` when it has a lineup
  - a lineup created later takes the remembered value
- **Match:**
  - the team view and the pill read `lineup.partnerRule ?? config.teams.partnerRule`
  - a lineup written before this change has no value, and falls back to the setting as before
- **Settings:**
  - the *Partner rule* row leaves Teams' panel
  - the intro gains one sentence: `Own-score teams in X01 can play the partner rule: switch it on the lobby page, next to Autoscoring.`
  - `config.teams.partnerRule` stays, as the remembered state

### E. Deleting in the drawer

- **Player names** (the chips, in both tabs): each chip whose name isn't in a saved team gets an ✕. A name in a saved team stays, and deleting the team is how it goes.
  - The first click arms it: the chip turns red and reads `Delete {NAME}`.
  - A second click on it within four seconds deletes. Escape, blur or the timeout disarm it.
  - This is the two-click inline delete of the design language, sized for a chip. The confirm keeps focus where it is, with `mousedown.prevent`, for Safari.
  - Deleting takes the name out of Saved players (`config.recentLocalPlayers.players`) and the site's own recent guests (`forgetGuestPlayers`), as the Saved players panel does. So it's gone everywhere, and the next sync doesn't bring it back.
- **Saved teams:** each row gets the settings' `ConfirmDeleteButton` beside *Add*. Deleting takes the team out of `config.teams.saved`, as the Teams panel does.

### F. Uneven teams

- **Ruling:** a team needs one player at least (`MIN_PLAYERS = 1`), in both formats.
  - **Shared score:** 2 vs 1 is fair by construction. Each team is one seat, and the lone player throws every visit of theirs.
  - **Own scores:** the bigger team still throws more often each round, which the lobby note already says.
- `normalizeTeams` keeps saved teams of one.
- **Checks:** `Add at least one player.`
- **Lobby rows:** a one-player own-score team reads `TEAM BLUE`, with no "1 of 1".

### G. Bots

- **Own scores:** a *Bots* section under *New players* (hint `join at the level you pick`) holds the site's eleven levels.
  - The picker is a select of `Level {n} · {10n+10}+`, default level 5, on the light field style.
  - Beside it is a secondary `Add bot` button.
  - A bot joins the team's list as `BOT LEVEL {n}`, marked `new bot · {ppr}+`. It's added with the site's own request (`{name: "Bot Level n", userId: null, cpuPPR, cpuSpeed}`). `cpuSpeed` is the site's `localStorage["autodarts-bot-speed"]`, or `realistic`.
  - Two bots of one level are fine: bots may share a name.
  - Bots count against the lobby's free seats.
  - Outside X01 and Cricket the section is disabled with `Bots only play X01 and Cricket.`
  - Bots already in the lobby are still tapped under *In this lobby*.
- **Shared score:** a line under the players: `A bot can't share a score: autodarts throws every visit of a bot's seat. Use Own scores to put one on a team, or Add Bot to play against one.`
- **README:** says how a bot joins a team.

### H. Smaller lobby fixes

- **The add buttons (finding 7):**
  - while Add Team is in the row, the row gets `flex-wrap: wrap` and each button `min-width: max-content`
  - they stay in one line while they fit
  - the last one wraps onto its own line, at full width, when they don't
- **Empty players (finding 8):**
  - own scores: `Nobody yet: tap someone in this lobby, or add a new player or a bot.`
  - shared score: `Nobody yet: type a name, or tap one below.`
- **Blocked saved teams (finding 10):** a saved team with a player already on another team in this lobby shows `{PLAYER} is already on {TEAM}.` under its players, and its *Add* is disabled.
- **Saved teams first (finding 12):**
  - **Ruling:** the section moves to the top of the drawer's body, under the tabs, following the site's recent-first Add Player drawer
  - editing a team still shows no saved teams
- **Focus (finding 13):** the name field is focused on open only with a fine pointer and no saved teams on show.

## The rules module: `utils/teams.ts`

- `MIN_PLAYERS = 1`.
- `OwnPick` gains `{ bot: number; name: string; key: string }`. `checkOwnTeam` counts bots against `freeSeats` and doesn't treat them as clashing with lobby names.
- `Lineup` gains `partnerRule?: boolean`.
  - `withLineup(store, lobbyId, teams, now, partnerRule?)` keeps the entry's value when it's `undefined`.
  - `withPartnerRule(store, lobbyId, on, now)` sets it on an existing lineup, and does nothing without one.
- `lineupPartnerRule(lineup, fallback): boolean` is `lineup?.partnerRule ?? fallback`.
- **Bot levels:** `BOT_LEVELS` holds 1–11, with `botPpr(level) = 10 + 10 × level` and `botName(level) = "Bot Level {n}"`. `hasBots(variant)` is true for X01 and Cricket.
- `memberLabel(place, size): string` is `"{place} of {size}"`, or `""` for a team of one.
- `forgettableNames(offered, saved): Set<string>` is the offered names that no saved team has.
- `savedTeamProblem(team, lobby): string | undefined` gives the first player already on another team, in either format. `lobby` is `{ playerTeams, seatTeams }`.
- **Pill text:**
  - `legWonText(name, language)`
  - `decidedText(team, language)`, which gains the language
  - `ruleNote(breach)`, `bustNote(breach)` and `undoFailedNote(breach)`, each returning `{ primary, secondary }` and replacing `warningText`, `bustText` and `undoFailedText`
- `tallySides<T>(items): [T[], T[]]` splits the tally, the first half rounded up.
- `partnerCardState(lobby, lineup, saved, hostId, fallback)` gives `{ show, on, applies }` for the lobby card.

## Files

| File | What changes |
|---|---|
| `utils/teams.ts` | everything in the section above |
| `utils/websocket-helpers.ts` | the team view's partner rule comes from the lineup |
| `utils/lobby-guests.ts` | `addBot` sends the site's `cpuSpeed` |
| `entrypoints/match.content/teams.ts` | the one-line pill view, no chips in top-bar cells, the legs chip only beside the board, the leg-won text, follows `enabled` live |
| `entrypoints/match.content/TeamsPill.vue` | one row: tally sides, note states, container queries |
| `entrypoints/lobby.content/teams.ts` | the partner-rule card, the button-row wrap, the drawer's new state (deletes, bots, blocked teams), follows `enabled` live, the one-player label |
| `entrypoints/lobby.content/AddTeamDrawer.vue` | saved teams first with delete, chips with delete, the bot section, empty hints, the bot note, focus |
| `components/Settings/Teams.vue` | the Partner rule row goes, and the intro changes |
| `README.md`, `CHANGELOG.md` | the partner rule in the lobby, 2 vs 1, bots, the drawer deletes |

## Testing

- **tsx:** in `$SCR/tests`, the scratchpad suite the Teams work already uses:
  - `checkTeam` and `checkOwnTeam` with one player
  - `normalizeTeams` keeping a one-player team
  - bots in `checkOwnTeam` (free seats, shared names)
  - `withLineup` and `withPartnerRule` keeping and setting the value
  - `lineupPartnerRule`
  - the bot helpers
  - `memberLabel`, `forgettableNames`, `savedTeamProblem`, `tallySides` and `partnerCardState`
  - the pill texts in `en` and `de`
  - the team view with the lineup's rule overriding the setting either way
- **Live**, in the dev Chrome, in a tab of my own:
  - the table above re-measured, with the partner-rule warning, in all four layouts
  - the wide overlap gone
  - equal top-bar cells
  - the leg-won pill
  - Teams switched off and on mid-match, and in the lobby
  - the lobby card: placement at 1440 and 390, toggling, the next lobby starting from the last state, a match following the lobby's value
  - the phone button row
  - the drawer: delete a name (it's gone from the site's list too), delete a saved team, a bot added to an own-score team and seated, a 2 vs 1 in both formats, a blocked saved team, the empty hints
- **Checks:**
  - `yarn compile` against the 14-error baseline
  - ESLint per changed file
  - `yarn build` and `yarn build:firefox`
- **Clean-up:**
  - the user's config restored key by key: `teams`, `wledFx.enabled`, `recentLocalPlayers`
  - the lineups and shifts I wrote removed
  - `adt:last-visited-url` and `urlstatus` put back
