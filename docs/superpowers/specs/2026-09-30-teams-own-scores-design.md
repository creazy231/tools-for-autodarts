# Teams: own scores, beside the shared score

**Date:** 2026-09-30
**Builds on:** [2026-09-30-teams-design.md](2026-09-30-teams-design.md) (Teams with a shared score, on `feat/teams`)
**Status:** approved in conversation. These were each agreed with the user:
- how a team wins
- the lobby flow
- the partner rule
- the approach
- the mockups, shown in the brainstorm companion as `own-scores-overview-v3.html`
- the data and rules
- the architecture, including the team view

Choices made after that point are marked *(implementation choice)*.

## The request

Teams shipped with one format: each team is one guest seat and its players share
that seat's score. Add the other format, where every player keeps their own
score and players are grouped into teams, so both are possible.

## What the site allows (checked on 2026-09-30)

- **Seat ids carry over.** A lobby seat's `id` is the same player's `id` in the
  match started from it, and the match's id is the lobby's id.
- **Adding a guest returns nothing.** `POST /gs/v0/lobbies/{id}/players` answers
  200 with an empty body. A new seat's id arrives with the next lobby update.
  Guest names are unique within a lobby, and bots can share a name.
- **The site decides every leg and the match per player.** `scores[i].legs`
  counts player `i`'s legs, and a player at the lobby's "First to N legs" wins.
- **A match can't be ended early.**
  - `POST /gs/v0/matches/{id}/finish` on an unfinished match answers 200 and
    changes nothing. The match stays open and doesn't reach history.
  - `surrender` wants a player index ("invalid player index" otherwise), and a
    surrender counts against that player.
  - The Team 2vs2 script's way of ending a team's match therefore doesn't work on
    the current API.
- **Undo reopens a won leg** (the checkout re-arm recipe in
  [[feature-card-preview-screenshots]]). A bot's throws can't be undone: the site answers 403.
- **Seat order is turn order,** and the site rotates `match.players` each leg, so
  a cyclic order stays cyclic. `POST /players/move/to-index {index, toIndex}` moves
  one seat.
- **Bots exist only in X01 and Cricket.** A lobby has six seats.

## Decisions

1. **Two formats.** *Shared score* is today's Teams, unchanged. *Own scores*: every
   player is their own seat (a guest, someone signed in on their own board, or a
   bot), and seats are grouped into teams. All teams in a lobby use one format,
   because mixing them is unfair: an own-score team gets a turn per player each
   round.
2. **A team wins on team legs.** A leg counts for the team of whoever checks it
   out. A team's legs are the sum of its members' legs, and its target is the
   lobby's "First to N legs". The first team to N wins the match.
   - The site's own match is still open at that point, unless the winning leg
     also took a single player to N. Leaving it by Exit means the site doesn't
     save it.
   - **Legs only.** In a lobby set to sets, Own scores is not offered, because the
     site counts sets per player *(implementation choice)*.
3. **Lobby: the same Add Team drawer, with a format** (user's choice, as mocked
   up).
   - Tabs at the top: *Shared score* / *Own scores*. The lobby's first team sets
     the format, and the other tab stays disabled until the lobby has no teams.
   - **Own scores** builds the team from seats:
     - it picks seats already in the lobby: guests, signed-in players, and bots
       added with the site's Add Bot *(implementation choice: the drawer doesn't
       add bots itself)*
     - saved or typed names join as guests on the host's board
   - Every member's row carries the team's gradient on its name tag. Under the
     name, a team chip gives the team and the player's place in it ("TEAM RED ·
     1 of 2"), and the row gets the edit pencil.
4. **Turn order.** Adding or editing a team puts the lobby's seats in alternating
   order: group the seats by team in their current order, then lay them out A1
   B1 A2 B2 …, starting with the team of the current first seat. A seat on no team
   counts as a team of one.
   - After the host drags a row or presses Shuffle, the seats are alternated again.
     So a drag changes the order within a team, and Shuffle shuffles within teams
     *(implementation choice)*.
   - Teams of different sizes are allowed. The Players card then says the bigger
     team gets more turns each round.
   - A seat on no team plays for itself. It takes its place in the alternation as
     a team of one, gets no team colour or chip, and wins the match the site's
     way, by reaching N itself.
5. **Match display** (as mocked up):
   - Each card keeps the site's score and the player's own legs.
   - The card of whoever is up takes their team's gradient. Waiting members' name
     tags carry their team's gradient.
   - A team chip under each name shows the team and its legs.
   - Under the pill, a tally lists every team's legs and the target
     ("TEAM RED 2 · TEAM BLUE 1 · first to 3").
   - The pill says "TOM to throw · TEAM RED". The card that's up pulses once at
     each handover.
   - The Caller calls the player whose turn it is, as it does for anyone.
6. **The team win.**
   - The leg ends with the site's own GAME SHOT. Then the pill says
     "TEAM RED wins the match" with the result ("3 – 1").
   - While the match is decided:
     - the site's Next Leg is hidden
     - its Space and Enter shortcuts are held back
     - Automatic Next Leg doesn't press it
   - The Caller plays `matchshot` and calls the team's name. Sound FX, WLED,
     Animations, the winner animation, Instant Replay, Zoom and Discord treat the
     leg as a match win.
   - Exit leaves the match the site's way.
7. **The partner rule: an optional setting, off by default** (user's choice).
   - **Where it applies:** in X01, with exactly two own-score teams, a player may
     not check out while a teammate has more left than the other team's players
     together.
   - **Which scores count:** those at the start of the visit. Only the thrower's
     score moves during a visit, so everyone else's current score is theirs at the
     start.
   - **The warning:** before the visit, a line under the pill says so:
     "No checkout this visit: TOM has 160 left, more than CREAZY.DEV and BOT
     LEVEL 5 together (140)".
   - **A checkout that breaks it is a bust.** We undo every dart of that visit
     with the site's undo and pass the turn.
     - The pill then says "ANNA's checkout didn't count: partner rule."
     - The Caller plays `busted`, and our other features stay quiet.
     - The site's own GAME SHOT shows for a moment before the undo.
   - **Human players only.** A bot's checkout can't be undone, so it stands.
8. **Saved teams remember their format.**
   - An own-score team also remembers how each player joined: a guest, a
     signed-in player (their user id), or a bot (its level, as `cpuPPR`).
   - Re-adding an own-score team from the drawer's Saved teams:
     - adds its guests on the host's board
     - adds its bots at their level *(implementation choice: with the site's own
       bot request, `{name, userId: null, cpuPPR}`)*
     - picks up its signed-in players when they're already in the lobby
   - The drawer names anyone who couldn't be seated, since signed-in players join
     from their own board.
9. **Settings.**
   - A *Partner rule* row with a switch goes in Teams' panel.
   - Each saved team's row shows its format as a label: SHARED SCORE or OWN
     SCORES.
10. **Not in this work:**
    - sets for own-score teams
    - ending the site's match early
    - team history or stats
    - the partner rule for three or more teams
    - player-name triggers for team players in Sound FX, WLED and Animations
      (already a follow-up from the first Teams)

## Data

No new config version. Version 15 hasn't been released, and `normalizeTeams`
fills every new field.

```ts
type TeamFormat = "shared" | "own";

/** How an own-score team's player joined, so a saved team can bring them back. */
interface TeamMember {
  name: string;
  kind: "guest" | "account" | "bot";
  /** An account's user id. */
  userId?: string;
  /** A bot's level, as the site's cpuPPR. */
  ppr?: number;
}

interface SavedTeam {
  name: string;
  /** In throwing order. */
  players: string[];
  colour: ColorScheme;
  /** "shared" for every team saved before this change. */
  format: TeamFormat;
  /** Own scores only: one per player, in the same order. */
  members?: TeamMember[];
}

interface TeamsConfig {
  enabled: boolean;
  saved: SavedTeam[];
  /** Decision 7. */
  partnerRule: boolean;
}

/** Own scores: which seats play for which team, per lobby id (= match id). */
interface Lineup {
  at: number;
  /** In the order the teams were added; each team's seats in its throwing order. */
  teams: { name: string; colour: ColorScheme; seatIds: string[] }[];
}
type LineupStore = Record<string, Lineup>;
```

- **New storage item:** `AutodartsToolsTeamLineups`, at `local:teams-lineups`, with
  default `{}`. Entries older than `SHIFT_TTL_MS` (24 h) are dropped whenever the
  item is written, as the shift store's are.
- **Seats that go:** a seat removed from the lobby is dropped from its lineup on
  the next lobby update. A team left with no seats is dropped.
- **Format of a lobby:**
  - a lineup exists → `own`
  - a guest of the host's is named after a saved shared team → `shared`
  - otherwise → none yet

## The rules module: `utils/teams.ts`

These are new, pure and tested under tsx. Existing exports keep their behaviour.

- `lineupTeams(players, lineup): Map<number, LineupTeam>`: for own scores, the
  team of each seat index, by seat id. The lineup carries each team's name and
  colour, so the match doesn't depend on the saved team still existing.
- `seatTeams(players, context): Map<number, SavedTeam>` covers both formats: a
  lineup when the match has one, and otherwise today's name rule (`teamSeats`).
- `interleave(seatIds, teamOf): string[]` gives the alternating order of decision
  4.
- `seatMoves(current, target): { index: number; toIndex: number }[]` gives the
  moves that turn one order into the other, each applied to the order the last
  one left.
- `teamLegs(match, lineup): Record<string, number>`, and `decidedTeam(match,
  lineup): string | undefined`, which is a team whose legs have reached
  `match.legs`.
- `partnerRuleBreach(match, lineup, seat): Breach | undefined`, where `Breach` is
  `{ player, teammate, teammateLeft, opponentsLeft }`. It covers both uses:
  - the warning for the seat that's up, which checks whether a checkout would
    break the rule
  - the check when a leg has just been won by `gameWinner`

  It applies only in X01, with two own-score teams, to a human seat.
- `teamView(match, context): IMatch` returns the match as the team rules see it
  (below). It returns the match itself when no rule changes anything.
- `rejoinPlan(team, lobbyPlayers): { guests: string[]; bots: { name: string;
  ppr: number }[]; seatIds: string[]; missing: string[] }` works out how a saved
  own-score team gets back into a lobby.
- `normalizeTeams` makes these defaults:
  - `format` → `"shared"`
  - `members` → kept only for own-score teams, and only when there's one per
    player
  - `partnerRule` → `false`

## The team view: `utils/websocket-helpers.ts`

`processWebSocketMessage` stores every match frame as `teamView(frame, context)`
instead of the frame itself (user's choice over a check in each feature).
`context` is `config.teams` plus the frame's lineup. It's read once and kept up to
date by storage watchers, so storing a frame stays synchronous after the first.

- **A team decides the match:** the frame's leg was won (`gameWinner >= 0`) and
  `decidedTeam` names a team. Then `adtTeams = { decided: team name, legs }`. If
  the site's own match isn't over (`winner < 0`), `winner` becomes `gameWinner`
  as well. When the winning leg also took a single player to N, the site
  finished the match itself, and only `adtTeams` is added.
- **A partner-rule checkout:** the rule is on, and `partnerRuleBreach` finds the
  leg's winner broke it. Then:
  - `gameWinner` becomes `-1`, and `gameFinished` becomes `false`
  - `turns[0].busted` becomes `true`
  - the winner's `gameScores` entry goes back to its score before the visit (the
    visit's points added back)
  - `adtTeams = { bust: { seat, dartIds } }`
- **Otherwise,** the frame is unchanged.

So every feature that reads `winner`, `gameWinner` or `turns[0].busted` does the
right thing without team code of its own: the Caller, Sound FX, WLED, Animations,
the winner animation, Instant Replay, Zoom and Discord. `adtTeams` gives the
Caller the team's name, and gives the Teams script what it needs to act.

Each tab's `processWebSocketMessage` stores the frames it receives, so the view
applies in every tab.

## Lobby: `entrypoints/lobby.content/teams.ts`, `AddTeamDrawer.vue`

- **Tabs:** the site's pill tabs, *Shared score* / *Own scores*. The one the
  lobby's format rules out is disabled, with a line saying why. In a lobby set
  to sets, *Own scores* is disabled with "Own-score teams play legs. Set the
  lobby to legs to use them."
- **Own scores sections:**
  - Name and Colour, as today.
  - *Players*: the members, in order, with drag to reorder.
  - *In this lobby*: every seat, tap to add; seats on another team are greyed with
    that team's name.
  - *New players*: the search field plus saved-player chips, where a name joins as
    a guest.
- **Add Team (own scores):**
  1. Add the new guests with `addGuest`.
  2. Wait for the lobby update that holds them (by name, with a 5-second limit,
     after which the message says what didn't join).
  3. Write the lineup.
  4. Alternate the seats with `seatMoves`, one `move/to-index` at a time, each
     waiting for its lobby update.
- **Edit (the pencil):**
  - It opens the drawer on the team's current seats. *Save* rewrites that team in
    the lineup and alternates the seats again.
  - The ✕ on a member takes them off the team only; they stay in the lobby.
- **Row dressing:** a member's row gets `data-adt-team`, the tag gradient, the
  team chip ("TEAM RED · 1 of 2") and the pencil. These are keyed as the shared
  rows are.
- **Keeping the order:** after each lobby update, if the seats of a lobby with a
  lineup don't alternate, they're alternated. There's one run at a time, and it's
  suspended while the drawer is open *(implementation choice)*.
- **Uneven teams:** a line under the Players card's rows: "TEAM RED has 3 players
  and TEAM BLUE 2: the bigger team throws more often each round."
- **Saved teams:** `rejoinPlan` drives the one-tap add, and the drawer's message
  names anyone missing.

## Match: `entrypoints/match.content/teams.ts`, `TeamsPill.vue`

- **Seats and teams:** `seatTeams` covers both formats. Shared score renders as
  today. Own scores renders as follows:
  - The gradient rule on the site's active marker is the team of the seat that's
    up.
  - Waiting members' name tags get their team's gradient.
  - Each member's card gets a team chip under its name: the team's name and legs,
    in the card, with `data-adt-team-legs`. It is keyed like the order chips.
  - The pill gains a tally row (every team's legs, then "first to N"), and a
    decided state: the text "TEAM RED wins the match", then the result, "3 – 1".
- **Holding the match once it's decided:** while the stored match has
  `adtTeams.decided`:
  - a stylesheet rule hides `SELECTORS.match.nextLegButton` in the Winner panel
  - a capture-phase `keydown` listener on `window` stops Space and Enter from
    reaching the site
  - both are removed when the match changes or the page leaves
  - if the players carry on anyway, the pill keeps the result and the tally
    goes on counting
- **The partner rule:**
  - **Warning:** while the rule would stop the seat that's up from checking out,
    the pill shows the warning line.
  - **Bust:** when the stored match has `adtTeams.bust`, the script sends the
    service worker `{ type: "teams:undo-visit", matchId, dartIds }`.
    - The service worker keeps the dart ids it has handled for the session and
      acts once per winning dart. It calls `POST /undo` once per dart, then
      `POST /players/next`, with the stored token. Two open match tabs can't undo
      twice.
    - The pill then shows "{player}'s checkout didn't count: partner rule." until
      the next visit starts.
- **Automatic Next Leg** (`automatic-next-leg.ts`) doesn't press Next Leg while the
  stored match has `winner >= 0`. The team view sets that for a decided team.

## Caller

- At a team's winning leg, the stored match has `winner >= 0` and
  `adtTeams.decided`. The Caller plays `matchshot` and calls the team's name
  instead of the seat's.
- A partner-rule bust has `turns[0].busted`, so it plays `busted` through the
  existing path.
- The rest is unchanged: an own-score seat is a player, and is called by their
  own name.

## Settings: `components/Settings/Teams.vue`

- A *Partner rule* `OptionRow` with a switch, bound to
  `config.teams.partnerRule`. Its description: "Own scores, X01, two teams: nobody
  may check out while their partner has more left than both opponents together. A
  checkout that breaks it counts as a bust."
- Each saved-team row gets a small format label before its players: SHARED SCORE
  or OWN SCORES.

## Docs

- **README:** add the second format to the Teams entry: own scores, the team win,
  the turn order and the partner rule.
- **CHANGELOG:** [Unreleased] → Added. Extend the Teams entry, since it hasn't
  been released yet.

## Testing

- **tsx** (`$SCR/tests`):
  - `interleave`: even and uneven teams, solo seats, the starting team
  - `seatMoves`: every permutation of four seats reaches its target
  - `teamLegs` and `decidedTeam`: ties, a single seat reaching N, the target
  - `partnerRuleBreach`:
    - the rule's boundary (equal is allowed)
    - a bot thrower
    - three teams
    - Cricket
    - the rule switched off
  - `teamView`: a decided team, a rule bust (scores restored, busted set), and
    frames left alone
  - `rejoinPlan`: guests, bots, a seated account, a missing account
  - `normalizeTeams`: old saved teams, and members that don't line up
- **Live, in the dev Chrome** ([[testing-teams-live]]), with guests and bots:
  - the drawer's own-scores flow
  - the seat order after a drag and after Shuffle
  - the note in a sets lobby, and the note for uneven teams
  - re-adding a saved own-score team
  - a 2v2 match: colours, chips, the tally and handover
  - the team win: the pill, Next Leg hidden, Space and Enter held, Automatic Next
    Leg skipped, the Caller's matchshot and team name (play recorder), Exit
  - the partner rule: the warning, and a bust with two match tabs open (one undo)
  - a bot's checkout left standing
  - Colors on
  - Cricket with own scores
  - a match with no lineup left alone
  - the shared-score checks from the first Teams, re-run
- **Checks:**
  - `yarn compile` against the 14-error baseline
  - ESLint per file
  - `yarn build`: `utils/teams.ts` now reaches the websocket monitor's
    entrypoint, see [[wxt-entrypoint-graph-is-tree-shaken]]
  - `yarn build:firefox`

## To confirm live

- The Winner panel's Next Leg matches `SELECTORS.match.nextLegButton`, and Space
  and Enter are the only keys that advance it.
- After undoing every dart of a won leg's visit, the leg is open and it's still
  the thrower's turn, so `players/next` passes it.
- `turns[0]` in the frame that reports a won leg is the winning visit, with its
  darts.
- The site keeps a signed-in player's seat id across a lobby update that moves
  seats.
