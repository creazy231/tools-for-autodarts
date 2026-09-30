# Teams, and Team Lobby renamed to Local Lobby

**Date:** 2026-09-30
**Status:** approved in conversation. The format, the lobby flow, the match
screen (from live mockups), the storage and the rules were each agreed with the
user, and the rest was left to be done without questions. Choices made after
that point are marked *(implementation choice)* so they can be reviewed.

## The request

Add a **Teams** feature to Tools for Autodarts, and rename the existing **Team
Lobby** to something that says what it does ("Local Lobby" was suggested, if it
fits). Look at the two existing team add-ons for inspiration only, without
copying them. Find out what works with local players, and whether a team can
include a bot. Keep the design as close to autodarts' own as possible.

## Research

### Teams for Autodarts (Chrome Web Store, Andy Pech, v1.0.1, 4 users)

- Each team is one seat: "Team Red/Green/Blue" are added as guests.
- 2–3 teams, up to 4 people each. The extension stores the people's names
  itself, in one fixed storage key.
- In the match it works out whose turn it is from the leg, set and round, and
  shows a "who's up" banner plus the names in each team's card.
- The team shares one score.
- It finds the site's buttons by their English labels ("Add Player", "Start
  Game"), so it stops working when the site is set to German or Dutch. It polls
  every 500 ms.

### Autodarts – Team 2vs2 (Greasy Fork, MartinHH, v3.83)

- A normal four-player match: seats 1 and 3 against seats 2 and 4, everyone on
  their own score.
- It adds a leg count per team, and the e-darts rule "you may not check out
  while your partner has more left than both opponents together", which it
  enforces by undoing the darts.
- It ends the match itself (`POST /finish`) when a team reaches the target
  number of legs.
- It works with exactly four players and polls `/state` every 1.2 s. Its colours
  and overlays are its own rather than the site's.

### What the site itself allows (read from its code on 2026-09-30)

- **No team concept anywhere.** No chunk mentions teams.
- **Lobby API** (`clients-*.js`): `POST /players` (a guest is
  `{name, hostId, boardId}`, a bot `{name, userId: null, cpuPPR, cpuSpeed}`),
  `POST /players/with-host/{id}`, `POST /players/move {direction, index}`,
  `POST /players/move/to-index {index, toIndex}`, `POST /players/shuffle`,
  `DELETE /players/by-index/{i}`, `PUT /players/by-index/{i}/host {boardId}`. A
  lobby has 6 seats (`maxPlayers`).
- **Bots only in X01 and Cricket.** Every game mode's module exports `hasBots`,
  and only those two say true. There are 11 levels, with averages 20 to 120.
- **Guest names are unique.** The Add Player drawer refuses a guest name
  already in the lobby (case-insensitive) and adds names in upper case.
- **Throwing order:** `match.players` is rotated every leg so that whoever throws
  first comes first ([[match-players-rotates-every-leg]]). A rotation keeps a
  cyclic order cyclic, so seats that alternate by team stay alternating.
- **Match API:** `next`, `undo`, `finish`, `surrender`. `finish` is the site's
  `F` key and is only offered once the server has marked the match finished.
- **Killer's player colours:** `PLAYER_COLORS` = orange, green, lavender, lime,
  cyan, coral. The site's `NameTag` takes a colour and fills its tag with it.
- **Killer's status line:** a pill between two 1px `black-60` lines.
  `StatusPill` is `px-6 py-4 rounded-full font-bold`, in the raspberry gradient
  with white text by default. It reads `"{{player}} to throw"`
  (`game.killer.toThrow`), in German `"{{player}} ist dran"`, and Dutch falls
  back to English. The name is upper-cased and the rest is not.
- **Drawers** (`ResponsiveDrawer`): on a wide screen, a centred modal
  (`bg-drawer` = `#0a0a23`, `max-w-2xl`, `rounded-xl`, `ring-1` white/10, over a
  `black-90/80` scrim), and a bottom sheet on a phone. The title is 18px bold
  white, and rows are a `NameTag` (lg) plus a small blue `secondary` button.
- **Button variants:** `secondary` is `bg-blue-60 text-blue-05 font-bold`
  (Add Player, Add Bot, Add), and `tertiary` is the raspberry gradient.

### What that means for teams and bots

- **Shared score** (each team is one seat): works with guests, in every game
  mode, and the site keeps score, legs, sets, the winner and stats. A bot can be
  an opponent but not a teammate, because the server throws every visit of a
  bot's seat. The only way round that is for the extension to throw for a
  pretend teammate, as hand-entered darts. That's possible, but a separate,
  bigger job.
- **Own scores** (each person is a seat): bots can be teammates, but only in
  X01 and Cricket. The site still decides the match per player, so the
  extension would have to end the match itself, and match history would name
  one player as the winner.

## Decisions

1. **Shared score.** Each team is one guest seat on the host's board, and its
   players take turns on the team's score. Bots and single players can be in
   the same match as themselves.
2. **Team Lobby becomes Local Lobby.** The feature takes the host's own account
   out of their private lobby and moves everyone who joins onto the host's
   board, so every player throws at a board the host provides. That is the
   site's own meaning of "local" ("In a local tournament every player will play
   on boards provided by you"). The site calls the people you add "guests", so
   the name clashes with nothing. Its text points at Teams for team play.
3. **Lobby: an Add Team button beside Add Player and Add Bot.** It opens a
   drawer built like the site's Add Player drawer, with these parts:
   - **Name:** suggested from the colour (Crimson gives TEAM RED) until the host
     types their own.
   - **Colour:** the Colors feature's scheme picker.
   - **Players:** in throwing order, with drag to reorder.
   - **Saved players:** shown as chips. Tap one to add it, or type a new name.
   - **Add Team:** needs at least two players.

   Only the host sees the button, because the site lets only the host add
   players.
4. **Lobby rows of a team** keep everything the site draws, and add three
   things: the team's gradient on its name tag, the throwing order under its
   name, and a pencil that reopens the drawer to edit the team.
5. **Match: B with gradients** (picked from the live mockups):
   - The card of the team that's up is filled with the team's gradient instead
     of raspberry.
   - A waiting team's card stays the site's black, with the gradient on its
     name tag.
   - Each team's card lists its players in order. The one throwing is filled
     white, and the waiting team's next player is outlined in its colour.
   - A pill under the turn bar, in the throwing team's gradient with white
     text, says who's up in the site's own words. In a match with a team in
     it, the pill stays up while any other seat throws as well, naming that
     seat in its own card colours, so the board doesn't jump down and up every
     turn.
   - At each handover, the pill fades to the new gradient, the next name slides
     in and the card that's up pulses once. With reduced motion switched on,
     the colours change but nothing pulses or slides.
   - A bust and a won leg keep the site's grey and green, and non-team seats
     keep raspberry, or whatever Colors sets.
6. **Colours come from Colors:** Default (raspberry) and Colors' nine card
   pairs, plus Custom. A pair another team in the lobby already uses is greyed
   out. New teams get the next free pair in a fixed order that starts red
   against blue.
7. **Throwing order rule:**
   - Leg 1 starts with player 1, and every new leg starts with the next player.
     Within a leg, the order carries on from whoever started it.
   - It's worked out from the site's own set, leg and round numbers, so a
     reload or an undo never throws it off.
   - **Tap to correct:** tapping a player's name in a team's card makes them the
     one who's up now (on the throwing team) or next (on a waiting one). The
     order carries on from them for the rest of the match.
8. **Caller:** when a team's turn starts, the Caller calls the player who's up
   if it has a sound for their name. If not, it calls the team's name, and
   failing that its usual `next_player`. Game shot and match shot call the
   team's name, as they do for any player now.
9. **Language:**
   - The pill uses the site's wording in the site's language ("TOM to throw",
     "TOM ist dran"). Dutch uses the English, as the site does.
   - The drawer and the lobby additions are in English, like the rest of the
     extension's additions to the page.
10. **Storage: teams are remembered by name.**
    - Add Team saves the team, with its players and colour, under its name.
    - Any guest the host hosts with that name, in any lobby or match, is that
      team. So a team survives reloads, rematches and new lobbies.
    - The drawer lists saved teams that aren't in the lobby yet, so one tap
      re-adds a whole team *(implementation choice: follows from the storage
      decision; without it, a new lobby would need the team built again)*.
    - Saved teams live in the settings, so they are exported and imported with
      everything else, like Saved players' list. Tap-to-corrections are per
      match and stored separately.
11. **Settings panel:** a Teams card on the Lobbies tab. The panel has one line
    on how to use it and the saved teams as a plain library list (colour, name,
    players, two-click delete), like Saved players. There are no other options.
12. **Not in this version:**
    - bots as teammates
    - games where each player keeps their own score
    - the e-darts checkout rule
    - random team draws
    - team statistics
    - sharing teams between devices: only the device that set the teams up
      shows them, and other screens in the match see normal seats

## The rules module: `utils/teams.ts`

Plain logic, with no DOM and no extension APIs, tested under `tsx` like
`utils/wled.ts` ([[trigger-logic-is-testable-under-tsx]]).

```ts
interface SavedTeam { name: string; players: string[]; colour: ColorScheme }
type TeamShifts = Record<string, number>;   // team name -> tap-to-correct shift

normalizeName(raw: string): string          // trimmed, inner spaces collapsed, upper case
normalizeTeams(saved: unknown): IConfig["teams"]
teamSeats(match, teams, myUserId): Map<number, SavedTeam>   // players[] index -> team
upNow(match, team, shifts): number | undefined              // index into team.players
nextUp(match, seatIndex, team, shifts): number              // for a waiting team
shiftFor(match, seatIndex, team, playerIndex): number       // the shift that makes playerIndex up/next
callName(match, teams, myUserId, shifts): string | undefined
nextFreeColour(taken: ColorScheme[]): ColorScheme
suggestName(colour: ColorScheme, takenNames: string[]): string
checkTeam(draft, lobbyGuestNames, otherTeamPlayers): string | undefined  // what's wrong, or nothing
```

- **A seat is a team** when it's a guest the host controls (`userId` null,
  `hostId` is the host, no `cpuPPR`), its name matches a saved team
  (case-insensitive, after `normalizeName`), and the team has at least two
  players.
- **Leg index** `k = (set − 1) + (leg − 1)`. Both are 1-based on the site, and
  `leg` restarts at 1 in each set, so every new leg moves the starter on by one,
  and each new set does too. `set` is taken as 1 when missing.
- **Visit index:** every seat throws once per round, so in round `r` a team is on
  its `r`-th visit of the leg.
  - The throwing team plays visit `r − 1`.
  - A waiting team whose seat comes before the thrower in this leg's order
    (`players` is in throwing order, and `player` indexes it) has already thrown
    this round, so its next visit is `r`.
  - A waiting team after the thrower has its next visit at `r − 1`.
- **Who's up:** `players[(k + visit + shift) mod n]`.
- **Tap to correct:** pick the shift that makes the tapped player come out of
  that formula. The shift is kept for the rest of the match.
- **Bull-off** (variant `Bull-off`) throws with `k = 0, visit = 0`.
- **Name suggestions:** default → TEAM RASPBERRY, blueberry → TEAM PURPLE,
  ocean → TEAM BLUE, lime → TEAM GREEN, petrol → TEAM TEAL, orange → TEAM
  ORANGE, crimson → TEAM RED, gold → TEAM GOLD, slate → TEAM SLATE, qwellcode →
  TEAM QWELLCODE, custom → TEAM *n*. A number is added when the name is taken
  ("TEAM RED 2").
- **Colour order for new teams:** crimson, ocean, lime, orange, blueberry, gold,
  petrol, slate, qwellcode, default.
- **Checks:**
  - a name, of at most 24 characters
  - 2 to 6 players, with no player twice and none already on another team in
    this lobby
  - a name no other guest in the lobby has, unless it's the team being edited

## Config (storage version 15)

```ts
localLobby: { enabled: boolean };                  // was teamLobby
teams: {
  enabled: boolean;
  saved: { name: string; players: string[]; colour: ColorScheme }[];  // most recently used first
};
```

- **Migration 15:**
  - `localLobby` takes the old `teamLobby` value, so a switch that was on stays
    on.
  - `teamLobby` is deleted.
  - `teams` is added with its defaults: `{ enabled: false, saved: [] }`.
- **Settings import** (file and clipboard) merges an export as it is, so it
  does the same `teamLobby` → `localLobby` step, and runs `normalizeTeams`
  alongside `normalizeColors`. The v1 importer (`components/Migration.vue`)
  writes `localLobby`.
- **Tap-to-corrections:** `local:teams-shifts` =
  `{ [matchId]: { at: epochMs, shifts: TeamShifts } }`. Entries older than a
  day are dropped whenever one is written. They are not part of the settings.

## Lobby: `entrypoints/lobby.content/teams.ts`

- **When it runs:** only in a lobby the user hosts (the stored lobby's
  `host.id`). The first frame is fetched by `index.ts`, and it follows
  `AutodartsToolsLobbyData` from there.
- **Add Team button:**
  - It's a shallow copy of the site's Add Bot button, the way Discord Webhooks
    copies Shuffle, so it restyles with the site.
  - Add Bot is the button in the players card's content that draws
    FontAwesome's `robot` glyph (`[data-icon='robot']`). The fallback is the
    last button in the row that holds Add Player.
  - It gets our own `users` glyph and the label "Add Team", and is re-inserted
    by a MutationObserver when the site re-renders.
  - It's disabled while the lobby is full, as Add Bot is.
- **Drawer:**
  - A Vue app in a shadow root on `document.body`, drawn as the site's
    `ResponsiveDrawer`: a centred modal with the scrim and ring on wide
    screens, and a bottom sheet under 640px.
  - It behaves as a dialog: `role="dialog"`, `aria-modal`, Esc and the scrim
    close it, and focus stays inside while it's open.
  - Parts: a light search field for the name, Colors' `SchemePicker` (taken
    pairs disabled), the player list as `NameTag`-style rows with a drag handle
    and ✕, a light "Search or add a player" field, saved-player chips, saved
    teams, and a full-width blue Add Team (or Save) button in the footer.
  - A missing or clashing value is said inside the drawer, next to the button.
- **Where the chips come from:** Saved players' list, the site's own recent
  guests (`localStorage["autodarts-guest-players"]`) and the players of saved
  teams, without duplicates. Nothing is written to Saved players.
- **Adding a team:**
  1. Save the team to `config.teams.saved`.
  2. `POST /gs/v0/lobbies/{id}/players` with
     `{name, hostId, boardId: selectedBoard}`, the site's own body, as Saved
     players sends it.
  3. If the request fails, the drawer stays open and says so, and the saved
     team is kept.
- **Editing a team:**
  - The pencil opens the drawer filled in. Players and colour can be changed.
  - The name can't: the site has no way to rename a guest, so the drawer says
    to remove the team and add it again to rename it *(implementation choice)*.
  - Saving changes only the saved team. The seat is untouched.
- **Team rows** (`SELECTORS.lobby.playerRows`, matched by the name in the
  row):
  - The name tag gets the team's gradient.
  - The throwing order is drawn under the name, as small chips with ▸ between
    them.
  - A pencil button (a copy of the row's ✕ button) goes before the site's own
    buttons.
  - All of it is plain DOM with `adt-team-*` classes and one injected
    stylesheet, redrawn by the lobby observer. A row that is no longer a team
    loses all of it.

## Match: `entrypoints/match.content/teams.ts`

It follows `AutodartsToolsGameData` and does nothing unless the match has at
least one team seat. Everything is found by name: the site's cards carry no
ids, and `match.players` rotates every leg.

1. **Card gradient:** one stylesheet (`addStyles`, id `teams`). While a team
   seat is up, it holds
   `html body #root main :is(activeHighlight) { background-image: <team gradient> !important }`.
   - The site paints the "this player is up" marker onto every card, sidebar
     row, top-bar cell and cricket cell in every layout, and uses it for nothing
     else, so this reaches all of them.
   - The extra `html body` makes it win over Colors' rule. When a non-team seat
     is up, the rule is removed.
   - A bust (`bg-grey-slush-diagonal`) and a win (`bg-game-shot-diagonal`) don't
     carry the marker, so they keep their own colours.
2. **Waiting teams' name tags:** each card (`SELECTORS.match.scoreCard`) is
   matched to a team by its `span.font-display` name. A card at rest gets
   `data-adt-team` plus CSS custom properties, and the stylesheet paints its
   name tag body with `linear-gradient(to right, from, to)` and its
   `svg[data-slot=nametag-shape]` with `from`.
3. **Throwing order:** a chips element after the card's name row, redrawn on
   every game-data update and every mutation of the card.
   - The player throwing is filled white. A waiting team's next player is
     outlined in its `to` colour. The others are `white/10`.
   - In cards narrower than 220px, only the player who's up (or next) is shown.
   - Chips are buttons: a click or tap applies tap-to-correct.
4. **Pill:** a small Vue app in a shadow root, inserted after the turn bar
   panel (`SELECTORS.match.turnBarPanel`), falling back to the top of the
   board's column.
   - It's the site's `StatusLine`: two thin lines in the throwing team's `to`
     colour at 60%, fading out towards the edges, round the pill.
   - The pill is the team's gradient with white text: "TOM to throw", then the
     team's name at lower emphasis.
   - While a non-team seat is up, it stays, and names that seat ("BOT LEVEL 5
     to throw", with no team name after it) in the seat's card colours:
     Colors' pair when Colors is on, raspberry when it isn't. Hiding it would
     move the board down and back up at every turn. A match with no team in
     it gets no pill at all.
   - Whether it sits in the flow or over the top of the board's column is
     settled live in each of the three layouts: it must never cover the board's
     scoring area or Darts Zoom's strip.
5. **Handover:** when the team seat that's up changes, the pill's new gradient
   fades in over the old, the text slides up, and the card pulses once. The
   pulse is an inset ring in the `to` colour, since the card clips anything
   outside it. Under `prefers-reduced-motion` none of this animates.
6. **Language:** from `localStorage["autodarts.settings.language"]`, falling
   back to the browser's. `de` → "ist dran", anything else → "to throw".
7. **Cleanup:** `onRemove` takes out the stylesheet, the chips, the pill and
   the observers. Everything is re-created on the next match.

## Caller

`entrypoints/match.content/caller.ts` asks `callName()` for the name to call
when the player changes, and at game-on. The order is: the player who's up if
the Caller has a sound for that name, then the team's name, then
`next_player`. Nothing changes for non-team seats.

## Settings

- `components/Settings/Teams.vue`: a feature card in the Lobbies tab, with a
  `teams.png` picture captured from a live team match.
- The panel, in the design language
  ([[settings-design-language]]): one sentence on what Teams does and where Add
  Team is, then **SAVED TEAMS · n** as a `LibrarySection` of plain rows (a
  gradient swatch, the name, the players as "ANNA ▸ TOM ▸ LISA", and a two-click
  delete). The empty state says what saved teams are and that they come from
  Add Team in a lobby.
- `components/Settings/LocalLobby.vue` replaces `TeamLobby.vue`, with the id
  `local-lobby` and the picture `local-lobby.png` (renamed with `git mv`).

## Files

| File | What |
|---|---|
| `utils/teams.ts` (+ test) | the rules module |
| `utils/storage.ts` | `localLobby`, `teams`, migration 15 |
| `components/PageConfig.vue` | Local Lobby and Teams in the registry, the import fix-up |
| `components/Migration.vue` | v1 importer writes `localLobby` |
| `components/Settings/LocalLobby.vue` | renamed from `TeamLobby.vue` |
| `components/Settings/Teams.vue` | the card and the panel |
| `entrypoints/lobby.content/local-lobby.ts` | renamed from `team-lobby.ts` |
| `entrypoints/lobby.content/teams.ts`, `AddTeamDrawer.vue` | the lobby half |
| `entrypoints/lobby.content/index.ts` | `localLobby`, `teams` in `PORTED_TO_V2` and the init/teardown |
| `entrypoints/match.content/teams.ts`, `TeamsPill.vue` | the match half |
| `entrypoints/match.content/index.ts` | `teams` in `PORTED_TO_V2`, init and `clearMatch` |
| `entrypoints/match.content/caller.ts` | `callName()` |
| `utils/selectors.ts` | Add Bot, the add-buttons row, name tag body and shape |
| `public/images/local-lobby.png`, `public/images/teams.png` | card pictures |
| `README.md`, `CHANGELOG.md` | Local Lobby renamed, Teams added |

## Testing

- **`tsx` tests for `utils/teams.ts`:**
  - rotation over legs and sets
  - waiting teams before and after the thrower
  - undo (a lower round)
  - shifts
  - bull-off
  - the seat lookup (guests only, host only, case, fewer than two players)
  - names, colours and checks
- **Live, in the `yarn dev` Chrome, in a background tab of my own:**
  - create a lobby, add two teams through the drawer and a bot, and check the
    rows
  - start the match and drive it through the API
  - check the gradient, tags, chips, pill and handover in the wide, sidebar and
    stacked layouts
  - get a bust and a win in a 121 match
  - reload mid-leg, undo, tap to correct, and check the Caller's name call with
    a play recorder
  - Cricket, to see the gradient on cricket's cells
- **Rename:** a config with `teamLobby.enabled: true` comes out as
  `localLobby.enabled: true`, and an old export imports the same way.
- **Checks:** `yarn compile` against the 14-error baseline, ESLint per file,
  `yarn build` (for entrypoint cycles, [[wxt-entrypoint-graph-is-tree-shaken]])
  and `yarn build:firefox`.

## To confirm live

These are assumptions from the site's code, checked before anything is built
on them:

- `set`, `leg` and `round` are 1-based, and `leg` restarts per set.
- Add Bot's glyph is `data-icon="robot"`.
- Where the pill can sit in each layout without covering the board or Zoom.
- That the marker rule recolours the card in Cricket and the party modes too.
