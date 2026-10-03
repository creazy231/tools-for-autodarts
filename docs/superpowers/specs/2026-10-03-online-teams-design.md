# Online Teams

**Date:** 2026-10-03
**Builds on:** [2026-09-30-teams-design.md](2026-09-30-teams-design.md) (shared score), [2026-09-30-teams-own-scores-design.md](2026-09-30-teams-own-scores-design.md) (own scores), [2026-09-30-teams-review-and-lobby-design.md](2026-09-30-teams-review-and-lobby-design.md)
**Status:** approved in conversation, section by section, in the brainstorm companion:
- the approach (one autodarts match, Tools shares the teams)
- how two teams meet in the lobby (automatically, by the lobby link)
- the match on both screens
- own-score teams online in the first version
- the server status chip in the lobby (the user's addition)
- the team room: protocol, server, local development

The user then asked for the rest to be done without further review, on these recommendations. Choices made after that point are marked *(implementation choice)*.

## The request

Teams works at one board. Make it playable online, with TEAM RED at one board and TEAM BLUE at a board somewhere else. Use `socket/`, which nothing uses any more, and drop its old logic. Start with X01. The user's first idea was two local matches, with Tools relaying each team's darts into the other match through the socket server.

Added along the way:
- a server status in the lobby, so players can see whether the team server is reachable
- debugging with two real accounts in two real browsers: the `yarn dev` Chrome as `creazy`, and a Firefox dev build as `creazy_dev`
- the socket server debugged locally. The user deploys it once the feature is ready to ship

## What autodarts allows (checked live on 2026-10-03, two accounts, REST API)

| Done by a non-host (`creazy_dev` in `creazy`'s private lobby) | Result |
|---|---|
| Add a guest of their own, `POST /gs/v0/lobbies/{id}/players {name, hostId}`, without being seated | 200. The guest is theirs, and plays on their board |
| The same with the host's id as `hostId` | 200, but the server stores **the caller** as `hostId` |
| Remove any seat, `DELETE …/players/by-index/{i}` | 200 |
| Move a seat, start the match, change the settings | 403 "player is not host" |
| In the match: throw, undo or press Next for **any** seat, the other account's included | 200 for all of them |

- The site's lobby draws the Players card, with Add Player and Add Bot, for every participant (`lobby._lobbyId-*.js`). Its Add Player posts `{name, hostId: me, boardId: localStorage.selectedBoard}`.
- In the match, each screen's own UI keeps it to its own turns (`useIsMyTurn`). On `creazy`'s screen, `creazy_dev`'s guest's visit was read-only: Exit, Game Stats and Call referee, with no keypad, Undo or Next.
- `/join/<lobby>` (the site's Copy link) seats whoever opens it with their own account. `/join/<lobby>?hostId=X` (the site's QR code) seats them at X's board. `/lobby/<lobby>` seats nobody.
- In a row the user doesn't host, the 🌐 button (`data-icon="globe"`) is `setHostForIndex`, which pulls that seat onto the user's board. In a row they do host, the 🏠 button (`data-icon="house"`) is `removeHostForIndex`.
- The old server at `adt-socket.tobias-thiele.de` answers "no available server".
- `play.autodarts.com` sends no Content-Security-Policy, so a content script can open a socket to any server.

## Decisions

### 1. One autodarts match; Tools shares the teams

Both teams sit in **one** online lobby. Each team's seats are guests of its captain, on the captain's board, and autodarts plays the match:
- it hands the turn between the two boards
- it keeps scores, busts, checkouts, legs, the winner, undo and corrections
- it shows the camera and the chat, and keeps the history

Tools adds only the team layer: who is on each team, the order, the colours, and who's up. `socket/` becomes a **team room** that shares that layer between the Tools in the lobby and the match. It carries no darts and no scores.

The user's mirror idea (two local matches, every dart relayed) is possible with the API (`throws`, `turns`, `PATCH throws`, `undo`, `players/next`, `games/next`). It was turned down for these reasons:
- Two matches would have to be kept identical by Tools, which would also have to notice and repair them when they drift.
- The other team's darts would count as hand-entered.
- There would be no camera of the other board.
- The match would stop whenever either Tools or the server stopped.

A card for the other team with no seat behind it doesn't work at all: the site would think one team throws every visit.

### 2. How two teams meet: automatically, by the lobby link

- The host adds their team with **Add Team**, as today. Nothing else needs switching on.
- **Invite a team**, a ghost button in the Players card's header, for the host, copies `https://play.autodarts.com/lobby/<id>`. The site's own Copy link (`/join/…`) would seat the opener's own account as a player as well. The site's QR code and friend invites still work.
- The other captain opens the link. Their Tools joins the lobby's room, finds the host's team, and shows an **invitation** above the Players card. It shows to anyone with no team of their own in the lobby while another account's team is in the room, and it goes once they have a team or dismiss it:
  - "TEAM RED invites you to a team match", followed by the lobby's game.
  - Their saved teams in the lobby's format. One tap seats that team on **their** board, as the site's Add Player or Add Bot would.
  - A team in the other format is greyed out with the reason.
  - **New team** opens the Add Team drawer.
  - A ✕ dismisses the invitation for this lobby.
- **Add Team is offered to every participant**, not only the host. A participant's drawer works with their own seats only.
- Once both teams are in, both screens show both teams: gradients, the order under the name, and "1 of 2" for own scores. The **pencil** shows only on your own teams.
- **Hidden 🌐:** on a row of another account's team, the site's 🌐 is hidden, so one click can't pull that team onto your board.
- **Local Lobby** leaves alone every seat of another account's team, whichever button it presses.

### 3. The server status chip (lobby)

- A chip in the Players card's header, after the seat count. It shows whenever Teams and Online Teams are on and the page is a lobby, even before anyone adds a team.

| State | Wording | When |
|---|---|---|
| connecting | Connecting to Online Teams… | just after the page opens, and while reconnecting |
| ready | Online Teams ready | connected, and no other account's Tools is in this lobby's room |
| synced | In sync with CREAZY_DEV | another account's Tools is in the room (names joined with the site's list format) |
| missing | CREAZY_DEV isn't connected | another account has seats in the lobby, and no Tools of theirs is in the room 10 s after both their first seat and our join |
| offline | Online Teams offline | the server can't be reached; Tools keeps retrying |
| outdated | Update Tools for Online Teams | the server refused this protocol version |

- **The card:** a tap on the chip opens a small card with these lines:
  - the server's state and round-trip time
  - each account in the lobby, with ✓ connected or ✗ not, and its teams
  - what is shared
  - a **Retry** button (reconnect now)
- **The match:** it has no chip. A note under the pill ("Online Teams offline: the other team's players may be out of date") shows only while the room is unreachable in a match that has another account's team.

### 4. The match: one game, the same team view on both screens

- Each Tools works out who's up from autodarts' own set, leg and round plus the shared order, exactly as Teams does today. So a turn needs no message, and both screens get the same answer.
- **Tap to correct** works only on your **own** team's names. The correction goes through the room, so the other screen follows.
- The Caller names the other team's players too, from the shared teams ("ANNA", then "TEAM RED", then `next_player`, as today).

### 5. Own-score teams online

- Each captain builds their team from **their own seats**: their guests on their board, their bots, and themselves. As today, a seat of an account with **no Tools in the room** (a friend on their own board without Tools) can also join your team. A seat of an account whose Tools *is* in the room is left to that account, and the drawer doesn't offer it *(refined while planning: the other screen would refuse a team holding its own seat)*.
- **Seat order:** only the host may move seats, so the **host's** Tools alternates every seat, the other account's teams included (`interleave`, `seatMoves`, one tab at a time as today).
- **Six seats** in a lobby, so up to 3 v 3, or 2 v 2 v 2. Shared score has one seat per team, so team size isn't limited.
- The **partner rule** is the host's call, on the lobby card as today. It reaches the other Tools through the room, and a screen takes it only from the lobby's host.
- **Team legs, the team win and Next Leg held** are worked out on each screen from the same lineup, so both screens agree.
- **The partner-rule undo**, which the server would let either side make:
  - The side whose seat checked out (the seat's `userId` or `hostId` is theirs) asks the room for the grant `undo|<matchId>|<dart ids>`, and undoes only if it gets it. Without the room, it undoes as today.
  - If that account has **no Tools in the room at all** (never joined, no team there, as with a friend without Tools), the **lobby host's** Tools asks for the same grant and undoes only if it gets it.
  - An account whose Tools is, or was, in the room undoes its own. If its Tools is briefly offline, the checkout stands, rather than risk a second undo *(refined while planning: the spec's first draft let the host step in after 4 s, which could double an undo the offline side also made)*.
  - The room grants a key once, so the visit is never undone twice.

### 6. Game modes

The online part doesn't depend on the mode, because autodarts runs the game. It is built, tested and announced for **X01** first, as asked. Other modes aren't blocked in code, and show the same team view the local Teams shows *(implementation choice)*.

### 7. Settings and what is shared

- An **Online Teams** row with a switch in Teams' panel, **on by default** *(implementation choice: a way out for anyone who doesn't want Tools to contact the server)*. Its description says what is shared and when.
- **What is shared:**
  - the user's autodarts id and name
  - the lobby's id
  - each team's name, players in order, colour, format and seat ids
  - tap-to-correct
  - the host's partner rule

  The autodarts token never leaves the browser: the id is read from it locally. Nothing is stored on the server beyond the room's life.
- **When:**
  - In any lobby with Teams and Online Teams on, Tools connects to the server, which is what makes the status true.
  - It **joins the lobby's room**, which is when data is shared, once it has a team there, or another account has a seat there.
  - A lobby where every seat is yours and none is a team never joins.
- README gets a section on this. At release, the user adds the disclosure to the store listings.

### 8. Not in this version

- a list of open team lobbies to find opponents (matchmaking)
- logins on the server
- team codes
- team stats
- relaying darts (the mirror idea)

## The team room: `socket/`

`index.ts` loses the friends and invitations code. The room logic goes in `rooms.ts`, which is pure and tested with `bun test`. `index.ts` is the socket.io wiring and `GET /health`.

### Protocol, version 1 (socket.io)

| Message | From → to | Payload / answer |
|---|---|---|
| connect | client → server | handshake `auth: { v: 1, userId, name }`. A wrong `v` is refused with `connect_error` "version", which the client shows as *outdated* |
| `room:join` | client → server | `{ lobbyId }` → ack `{ ok, state }` |
| `room:leave` | client → server | `{ lobbyId }` |
| `room:teams` | client → server | `{ lobbyId, teams: RoomTeamInput[] }` replaces **all** teams of the sender's `userId` in the room → ack `{ ok }` |
| `room:shift` | client → server | `{ lobbyId, team, shift }`, for a team of the sender → ack `{ ok }` |
| `room:rule` | client → server | `{ lobbyId, partnerRule }` → ack `{ ok }`; receivers take it only from the lobby's host |
| `room:claim` | client → server | `{ lobbyId, key }` → ack `{ granted }`. The first claim of a key in a room wins |
| `room:state` | server → room | `{ lobbyId, teams: RoomTeam[], shifts, rule, peers }`, the whole room after every change |

```ts
interface RoomTeamInput { name: string; colour: { preset: string; from: string; to: string }; format: "shared" | "own"; seatIds: string[]; players: string[] }
interface RoomTeam extends RoomTeamInput { owner: string }        // the sender's userId, stamped by the server
interface RoomShift { owner: string; team: string; shift: number }
interface RoomRule { by: string; partnerRule: boolean }
interface RoomPeer { userId: string; name: string }
interface RoomState { lobbyId: string; teams: RoomTeam[]; shifts: RoomShift[]; rule?: RoomRule; peers: RoomPeer[] }
```

- **Shared score:** `seatIds` is the team's one guest seat, and `players` are the people taking turns on it. **Own scores:** `seatIds` are the members' seats in throwing order, and `players` their names.
- `userId` is bound to the socket at connect. A peer is listed once per `userId`, however many tabs it has.

### What the server keeps, and its limits

- Memory only. Logs carry counts, never names or ids.
- A room is dropped 30 min after its last socket leaves, which covers a reload and the step from lobby to match, and 12 h after it was made at most. Claims are dropped after 10 min.
- **Checked on every message:**
  - lobby ids are UUIDs
  - at most 6 teams per owner
  - names are 1–24 characters, at most 6 players of up to 24 characters, at most 6 seat ids (UUIDs)
  - colours are `#rrggbb`
  - shifts are integers from −100 to 100
  - claim keys are at most 200 characters
- **Size and rate:** 8 KB per message (`maxHttpBufferSize`), at most 30 messages per 10 s per socket, 8 peers per room and 4 rooms per socket. A message over a limit is refused with an error ack.
- Allowed origins: `https://play.autodarts.com` and the extension origins (`chrome-extension://`, `moz-extension://`, `safari-web-extension://`). The client uses the WebSocket transport only.
- `PORT` comes from the environment, default 4455.
- Deployment files are prepared for the user to deploy:
  - a `Dockerfile` (oven/bun)
  - a `docker-compose.yml` on the `coolify` network with `traefik.docker.network=coolify`, per the user's Coolify note
  - a health check on `/health`

### What a screen trusts *(the client enforces it; the server can't verify identities)*

- **A team:** only if every seat it names is in autodarts' own lobby or match data and hosted by the team's owner (`seat.userId === owner || seat.hostId === owner`).
- **Your own seats:** never anything from anyone else. Your own teams always come from your own settings and lineup.
- **The partner rule:** only from the lobby's host (`lobby.host.id`, `match.host.id`).
- **A shift:** only for a team its sender owns.

Without logins, someone who knows a lobby's id could at worst show wrong team names on that lobby's screens. Scores and turns stay autodarts'. Logins on the server stay out of this version.

## The extension

### Config (storage migration 16)

`teams.online: boolean` defaults to `true`. `normalizeTeams` fills it, migration 16 runs `normalizeTeams` over the saved config, and the settings import already runs `normalizeTeams`.

### `utils/team-room.ts`: the rules, pure and tested under tsx

- The types above, plus `RoomMirror` (`RoomState` + `at`) and `RoomStore = Record<lobbyId, RoomMirror>`, kept 24 h like the lineups.
- `withRoom(store, state, now)` and `roomOf(store, id)`.
- `myRoomTeams(players, saved, lineup, me)`: this account's teams as the room should know them. These are its shared-score guests named after a saved team, and its own lineup's teams, each with the seats that are still in `players`.
- `trustedTeams(room, players, me)`: the room's teams that pass the trust rules.
- `remoteSharedSeats(players, room, me)`: `Map<index, SavedTeam>`, the other accounts' shared-score teams by seat.
- `onlineLineup(local, room, players, me, lobbyHostId)`: your lineup plus the other accounts' own-score teams. Its partner rule is the host's: from your own lineup when you are the host, and from `room.rule` when the rule's author is the host.
- `onlineShifts(local, room, players, me)`: your shifts plus the other accounts' shifts, for their own teams only.
- `seatOwner(seat)`: `userId || hostId`.
- `roomStatus(input)`: the chip's state and names, from the connection state, the room's peers, the lobby's seats and the time since joining.
- `shouldJoin(players, myTeams, me)`.
- `undoActor(seat, me, room, hostId)`, which returns `"legacy" | "own" | "fallback" | "none"` (`legacy` means no room, so this screen undoes as before), and `undoKey(matchId, dartIds)`.
- `tokenAccount(token)`: the `sub` and username of this browser's own token, decoded here so that the token never travels, and `utils/helpers.ts`, which creates `Audio` objects at load, stays out of the websocket monitor.

### `utils/team-room-client.ts`: one connection per page script

- The lobby's Teams script and the match's each hold a `RoomClient` while their page is open *(refined while planning: they are separate bundles, each with its own Vue, so one client shared on `globalThis` couldn't drive both UIs' reactivity)*. The room keeps the lobby's id into its match, so the step between them is a reconnect, and the mirror shows the teams meanwhile.
- It wraps `socket.io-client` (already a dependency) and connects to `__ADT_TEAMS_SERVER__` with `transports: ["websocket"]` and the handshake `auth`.
- Reactive state: `connection` (`connecting | connected | offline | outdated`), `rtt`, the joined `lobbyId`, the last `state`, and `joinedAt`.
- `start(lobbyId)`, `setJoin(join)` and `stop()` drive it. A new lobby id leaves the last one's room.
- `publishTeams`, `publishShift` and `publishRule` drop a payload the same as the last one sent, and send again after every reconnect.
- `claim(key)` returns `true`, `false`, or `undefined` while offline.
- `retry()` reconnects now.
- Every `room:state` is written to `local:teams-room` (`AutodartsToolsTeamRoom`), which is what every reader uses, other tabs included.

### Where it plugs in

| File | Change |
|---|---|
| `entrypoints/lobby.content/teams.ts` | Add Team for every participant; `teamsInLobby` and `currentLineup` merged with the room; `pruneSeats` and `writeLineup` touch only your own teams; the pencil only on your teams; `data-adt-team-remote` on other accounts' team rows, with the 🌐 hidden; publishes `myRoomTeams` and the host's rule; `keepOrder` over the merged lineup (host only, as now); mounts the status chip, Invite a team and the invitation |
| `entrypoints/lobby.content/TeamRoomStatus.vue` (new) | the chip and its card |
| `entrypoints/lobby.content/TeamInvite.vue` (new) | the invitation |
| `entrypoints/lobby.content/AddTeamDrawer.vue` | unchanged: `drawerContext` in `teams.ts` feeds it the merged teams, so taken names and colours include the other accounts', and its seat list leaves out seats whose account's Tools is in the room |
| `entrypoints/lobby.content/local-lobby.ts` | skips seats of other accounts' teams in the room |
| `entrypoints/match.content/teams.ts` | merged shared seats, lineup and shifts; tap-to-correct only on your own teams and published; the offline note; `askUndo` goes through `undoActor` and `claim` |
| `utils/websocket-helpers.ts` | the team view's lineup is `onlineLineup(…)` for the frame's id |
| `utils/team-calls.ts` | the Caller's context merges the room the same way |
| `utils/storage.ts` | `teams.online`, migration 16, and `AutodartsToolsTeamRoom` (`local:teams-room`) |
| `utils/teams.ts` | `normalizeTeams` fills `online` |
| `utils/selectors.ts` | `lobby.playerLinkButton` (`data-icon="globe"`). The chip and Invite a team go in the existing `lobby.playersCardHeader`, after `lobby.playerCountChip` |
| `components/Settings/Teams.vue` | the Online Teams row |
| `wxt.config.ts`, and a `declare const` in `utils/team-room-client.ts` (as `__ADT_PICKER__` is declared in `entrypoints/picker.content/index.ts`) | `__ADT_TEAMS_SERVER__`: `ADT_TEAMS_SERVER` if set, else `http://localhost:4455` for `wxt` dev (serve), else `https://adt-socket.tobias-thiele.de` |
| `locales/{en,de,nl}/teams.ts` | every new string, in the site's words; `yarn i18n:check` passes |
| `socket/` | `rooms.ts`, `rooms.test.ts`, `index.ts`, `Dockerfile`, `docker-compose.yml`, `README.md` |
| `README.md`, `CHANGELOG.md` | Online Teams, and what it shares |

## Local development

```bash
cd socket && bun install && bun run dev          # http://localhost:4455, /health
yarn dev                                         # Chrome, as creazy (port 4000)
npx wxt -b firefox --port 4001                   # Firefox, as creazy_dev
```

Both dev builds point at `localhost:4455`, which counts as secure, so `ws://` works from the https page. `ADT_TEAMS_SERVER` overrides it. Nothing is deployed during development.

## Testing

- **`bun test` (socket/):**
  - join and leave, peers per user
  - teams replaced per owner and stamped
  - a shift for someone else's team refused
  - the rule's author kept
  - the first claim granted and the second refused
  - every limit
  - room and claim expiry
  - the version refusal
- **tsx (`utils/team-room.ts`):**
  - `myRoomTeams` for both formats
  - the trust rules: an owner mismatch, a seat that left, a team claiming your seat
  - `onlineLineup` with the rule from the host, and from a non-host (ignored)
  - `onlineShifts`
  - `remoteSharedSeats`
  - `roomStatus` in every state
  - `shouldJoin`
  - `undoActor`: mine, a fallback with the owner absent and present, none
  - alternation over two accounts' seats with the existing `interleave`
- **Live,** with the local server, the `yarn dev` Chrome as `creazy` and the Firefox dev build as `creazy_dev` ([[online-teams-test-with-two-real-accounts]]), with manual entry, since neither account has a board online:
  - **Shared score:** the chip's states; Invite a team; the invitation and one-tap join; rows on both screens; the 🌐 hidden; Start; both screens through visits and legs; tap-to-correct on each side; the Caller's names (play recorder).
  - **Own scores, 2 v 2:** the alternation from both accounts; the partner rule from the host; a team win holding Next Leg on both screens; a partner-rule bust thrown on each side, undone once (no second undo); the fallback with the thrower's Tools closed.
  - **Failures:** the server stopped mid-match (offline chip and note, the match goes on, the teams stay); a reload mid-match; Firefox with Teams off (`missing`); Local Lobby on; Online Teams off (no connection at all).
- **Checks:**
  - `yarn compile` against the baseline
  - ESLint per changed file
  - `yarn i18n:check`
  - `yarn build` and `yarn build:firefox` (the entrypoint graph)
  - `bun test`

## To confirm live

- A participant who isn't seated can open `/lobby/<id>` and gets the lobby's updates.
- A Firefox content script can open `ws://localhost:4455` from `https://play.autodarts.com`.
- `match.host.id` is in the match frames Tools stores.

## A related finding, reported separately

`SELECTORS.lobby.playerBoardButton` matches `data-icon="house"`. On today's site that is the **unlink** button, enabled on account seats you host (`removeHostForIndex`). "Play on my board" is now the 🌐 `globe`. So Local Lobby's "move everyone onto my board" presses unlink on friends who joined at your board, and never moves anyone. It predates this feature (the selector is from 2026-08-14), and it is reported to the user rather than changed here.
