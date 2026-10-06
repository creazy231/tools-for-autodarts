# Online Teams: players join a team from their own board

**Date:** 2026-10-06
**Builds on:** [2026-10-03-online-teams-design.md](2026-10-03-online-teams-design.md), [2026-10-04-online-teams-cricket-and-follow-ups-design.md](2026-10-04-online-teams-cricket-and-follow-ups-design.md), [2026-09-30-teams-own-scores-design.md](2026-09-30-teams-own-scores-design.md)
**Status:** approved in the brainstorm companion, step by step:
- who sets up the teams: the players join one themselves (the user's pick, "C")
- the approach: a join is a record of its own in the room ("A")
- section 1, the lobby
- section 2, the protocol and the server

The user then asked for the rest to be done without further review, on these recommendations. Choices made after that point are marked *(implementation choice)*.

## The request

A user asked whether four players, each on their own board, can play two against two on a shared score. They can't: a shared-score team is one seat, and autodarts takes a seat's darts from its own board. With own scores they could, except that Online Teams leaves every seat of an account whose Tools is in the room to that account. So a team can't hold two such accounts. The user asked whether and how that could change, and chose this: each captain makes a team, and the other players join one themselves.

## What already holds

- autodarts runs one match across any number of boards, and each board scores its own seat.
- The host's Tools alternates every seat from the merged lineup (`keepOrder` → `interleave`), whoever's teams they are. A team's own order is the lobby's order (`pruneLineup`).
- The lobby, the match, the team view (`utils/websocket-helpers.ts`) and the Caller (`utils/team-calls.ts`) all take their teams from `screenTeams()` in `utils/team-room.ts`. The pill, legs, the team win, Next Leg held, the partner rule, Sound FX and WLED follow from it.
- A partner-rule take-back is made by the thrower's own Tools (`undoActor` → `"own"`), through the room's one-time grant.

Two places stop four boards today:
1. The Add Team drawer leaves out a seat whose account's Tools is in the room (`theirs()` in `drawerContext`).
2. `trusted()` takes an own-score seat only from the team's owner or from an account with no Tools in the room, and a screen never takes another account's word for its own seat. So the screens would disagree on the teams.

## Decisions

### 1. Players join; nobody else puts them on a team

- A captain makes a team from their own seats, as today. Any other player with Tools joins it with **Play for TEAM RED**.
- **A join is a record of its own** in the room: the joiner's account says which of its own seats plays for which team. The captain's Tools takes no part, so a join lands even while the captain's tab is reloading or closed.
- Every account still speaks only for its own seats, so the trust rule stays as strict as it is.
- **Turned down:**
  - *The captain's Tools takes them in:* it waits on the captain's Tools, needs a record of removed players so a standing request doesn't take them back in, and has more states to show.
  - *Same name, same team* (no protocol change): two unrelated teams that share a name would merge, and nothing could tell which screens still run 3.3.0.

### 2. In the lobby

- **Play for TEAM RED** sits in the invitation card (`TeamInvite.vue`). The card already shows to anyone in the lobby without a team.
  - It gets one button per own-score team of another account, with the team's colour and its captain's name under it.
  - The Play for buttons come first, then the existing *Join with* saved teams and *New team*.
  - The card shows while none of this account's seats is on a team. It goes once one is, and comes back after leaving. Before, it went once the account had a team of its own; it still does.
- **One tap:**
  - If the account has no seat of its own in the lobby (it came in through *Invite a team*'s `/lobby/<id>` link, which seats nobody), Tools seats it on its own board first, with the request the site's own `/join/<id>` link makes.
  - In a full lobby, the buttons are greyed and the card says "The lobby is full." (`teams.problems.lobbyFull`, which the drawer already uses).
  - Then the join is written and sent.
- **Leave team** is a button on your own row, and only on a seat you brought to another account's team. It takes your join back. There's no confirmation, since joining again is one tap.
  - It is an icon button beside the row's ✕, copied from the ✕ as the pencil is, with "Leave team" as its tooltip and "Leave TEAM RED" as its spoken name *(implementation choice: the approved mockup drew it as a text pill, but the row's other buttons are icons, and a text pill doesn't fit a phone-width row)*.
- **The order needs nothing new.** The host's Tools alternates the seats as it does today.
- **On every screen, the 🌐 is hidden** on a joined seat's row (`data-adt-team-remote`, whose style hides only the 🌐), the captain's own screen included. One click there would pull the player onto the captain's board. On the captain's screen the pencil stays: it edits the captain's part of the team. Local Lobby leaves a joined seat on its board.
- **The captain can't remove a joined player.** Only the player leaves. The site's ✕ still removes the seat, as anyone in a lobby can do today.
- **You join with your own account seat**, not with your guests or bots. The protocol carries a list of seats, so guests can come later without another server change.
- **Up to six on a team** (`MAX_PLAYERS`). A full team, a shared-score lobby or a sets lobby shows no Play for button.
- **Lobby only.** You join and leave in the lobby. In the match the teams are fixed, as they are today.

### 3. Protocol 2 and the server

| Message | From → to | Payload / answer |
|---|---|---|
| connect | client → server | handshake `auth: { v, userId, name }`. The server takes `v` 1 or 2 and refuses anything else with `connect_error` "version" |
| `room:joins` *(new)* | client → server | `{ lobbyId, joins: RoomJoinInput[] }` replaces **all** of the sender's joins in the room → ack `{ ok, value: state }` |
| `room:state` | server → room | gains `joins: RoomJoin[]`, and each peer gains `v` |

```ts
interface RoomJoinInput { owner: string; team: string; seatIds: string[] }
interface RoomJoin extends RoomJoinInput { by: string }   // the sender's userId, stamped by the server
interface RoomPeer { userId: string; name: string; v: number }
interface RoomState { lobbyId; teams; shifts; rule?; peers; joins: RoomJoin[] }
```

- **A peer's `v`** is the lowest protocol among that account's sockets in the room. So a 3.3.0 phone next to a new desktop counts as 1.
- **What the server checks** on `room:joins`:
  - at most 6 entries
  - `owner` is a UUID and not the sender
  - `team` is 1–24 characters
  - each entry has 1–6 seat ids, all UUIDs, and a seat appears at most once across the sender's entries (one seat, one team)
  - all of it is valid, or none of it is taken
  - the existing rate limit and 8 KB cap apply
- **Room limit:** at most 16 accounts with joins per room, beside the 16 with teams.
- **Lifetime:** a join stays when its author's socket leaves, like a team does, so the step from lobby to match keeps it. It goes with the room (30 min idle, 12 h at most).
- **The server never checks a join against the teams.** Whether a seat counts is each screen's call, from autodarts' own data.
- **Old and new:**

| | Server as deployed (1) | New server (1 and 2) |
|---|---|---|
| Tools 3.3.0 (1) | as today | as today. It gets `joins` and ignores them, so on its screen a joined player plays without a team |
| New Tools (2) | refused with "version", it reconnects with 1: Online Teams works as today, and no Play for shows | joins work. Play for works only while every account in the room is on 2; otherwise its buttons are greyed and the card names who needs an update |

- **Ship order:** deploy `socket/` first, then release. A release that reaches people before the deploy loses only joining.

### 4. The rule on every screen *(implementation choice)*

**Where joins come from:**
- **This screen's own joins** are kept in its lineup, `Lineup.joins` in `local:teams-lineups`, for a day like the lineup. That is the only word this screen takes for its own seats, and every reader of `screenTeams()` already passes the lineup.
- **The other accounts' joins** come from `room.joins`, leaving out those with `by` = this account.
- **A room without a `joins` field** (one from a protocol-1 server, or a mirror written before) counts no join at all, this screen's own included. A screen never shows a team the other screens can't.

**`screenTeams()`** keeps its steps and adds one after the remote teams are taken:
1. As today: this account's shared seats and lineup teams, then `trusted()` for the others'. `trusted()` now also counts **join authors as in the room**, so a team can't hold a joiner's seat as a Tools-less one.
2. **Each join is matched to its team** by `owner` and `normalizeName(team)`, among the own-score teams just collected (this account's included: its owner is this account). A join seat counts when all of these hold:
   - it is in autodarts' lobby or match data
   - `seatOwner(seat)` is the join's `by` (a join brings only its author's seats)
   - it isn't on a team already (a seat its owner lists in a team of their own stays there)
   - the team has fewer than `MAX_PLAYERS` seats

   A join whose team isn't there counts nothing.
3. **A team's seats are then put in the lobby's order** (`seat.index`, else its place in `players`), as `pruneLineup` keeps a lineup's own. Every screen numbers them alike ("2 of 2"), and the match's leg rotation of `players` doesn't change it.
4. **The teams are listed by their first seat**, as today. That now also applies when only joins mixed them.

**New output:** `ScreenTeams.joined: Map<seatId, RoomJoin>`, the joins that count. The lobby reads it for Leave team and for the 🌐, and the invitation reads it to know whether this account's seat is on a team.

**Also:**
- `withRoom()` treats join authors as present, and keeps the joins of an author who is neither a peer, an owner nor a join author in the new state, as it keeps their teams.
- `undoActor()` counts join authors as in the room.
- `joinedSeats(room, players, me)` gives the seats that other accounts have joined to any team, checked to be their own, whether or not the team is there. Local Lobby leaves these alone, without needing anyone's lineup.

**`joinOffer()`**, pure, for the invitation:
- **Its input:** the screen's teams, the seats, the room, this account, the lobby's sets and seat count.
- **It returns:**
  - the other accounts' own-score teams with room for one more: owner, name, colour, the captain's name (the room's peer name, else the one autodarts shows for their seats)
  - the accounts in the room still on protocol 1, by name (the card greys the buttons and names them)
  - this account's own seat, if it has one
  - `full`: the account has no seat and the lobby has none free (the card greys the buttons and says so)
- **It offers nothing when:**
  - the lobby plays sets or a shared score
  - the room carries no joins
  - this account's seat is already on a team

**The status chip:**
- A new state, **behind** (amber): "LISA needs a Tools update". It shows while joins count in the lobby and an account in the room is on protocol 1. That account's screen shows the joined players without a team.
- It comes after *outdated*, *offline* and *connecting*, and before *synced*, *missing* and *ready*.
- On the chip's card, an account's line lists the teams it joined beside its own, and an account on protocol 1 says "needs a newer Tools" (the key the card already has).

### 5. Failures *(implementation choice)*

- **Play for while not connected, or on protocol 1:** no buttons. A join only made locally would show a team the other screens can't see.
- **The connection drops after a join:** the join stays in the lineup and is sent again on every reconnect, as teams are.
- **Leaving a team:** the join leaves the lineup, and `room:joins` goes out without it.
- **The captain removes their team, or their seats leave:**
  - The join counts nothing, and the joined player is a plain seat again.
  - Their card comes back if another team is there.
  - The join itself stays in their lineup until they leave, or until the seat is gone. If the captain adds a team of that name again, the player is back on it: they asked to play for that captain's team.
- **The joined seat leaves the lobby:** the lineup's prune drops the join, as it drops a team's seat.
- **A server restart:**
  - The room comes back empty, and each screen sends its teams and joins again when it rejoins.
  - Meanwhile the mirror keeps an absent author's joins.
- **Seating yourself fails, or no seat shows within the wait the drawer uses (`SEAT_WAIT_MS`):** the card says "autodarts didn't add you to the lobby. Try again." (a new `teams.problems.notSeated`, worded as the drawer's `playersNotAdded` is), and nothing is written.
- **Someone poses as an account in the room** (no logins, as today): they can show that account's seat on a team on the other screens. That account's own screen trusts only its own lineup, so it never does. The README's paragraph on posing says so.

### 6. What is shared

The README's *Online Teams and your data* adds "which team each of your seats joined". Its paragraph on posing adds "put a player on a team".

### 7. Not in this version

- a captain removing a joined player
- joining with guests or bots
- joining or leaving in the match
- a list of open lobbies (matchmaking), logins on the server, team codes

## The extension

### `utils/teams.ts`
- `LineupJoin { owner: string; team: string; seatIds: string[] }` and `Lineup.joins?: LineupJoin[]`.
- `withLineup()` keeps the lobby's joins. A lobby's entry stays while it has teams **or** joins.
- `withJoins(store, lobbyId, joins, now)` writes them, keeping the teams and the partner rule.
- `pruneJoins(joins, seatIds)` drops the seats that left, and a join with none left.

### `utils/team-room.ts`
- The types above. `PROTOCOL_VERSION = 2`, and `OLDEST_PROTOCOL = 1`, which the client falls back to.
- `screenTeams()` as in decision 4, plus `joinedSeats()`, `joinOffer()`, `roomStatus()` with *behind*, `statusAccounts()` with joined teams and each account's protocol, and the join-aware `withRoom()` and `undoActor()`.

### `utils/team-room-client.ts`
- It connects with protocol 2. On "version" it switches its handshake to 1 and reconnects. A refusal of 1 too is *outdated*.
- `RoomClientState.protocol` says which one holds.
- `publishJoins(joins)` sends after the teams, drops a payload the same as the last one sent, sends again after every (re)join, and sends nothing while on protocol 1.

### `utils/lobby-guests.ts`
- `addSelf(name, feature)`: the site's `/join` request, which seats this account on its selected board.

## Where it plugs in

| File | Change |
|---|---|
| `socket/rooms.ts`, `socket/index.ts`, `socket/rooms.test.ts`, `socket/README.md` | protocol 2, `room:joins`, joins in the state, `v` on peers, the limits; `/health` says `version: 2` |
| `utils/team-room.ts` | decision 4 |
| `utils/teams.ts` | `LineupJoin`, `withJoins`, `pruneJoins`, `withLineup` keeping joins |
| `utils/team-room-client.ts` | the fallback, `protocol`, `publishJoins` |
| `utils/lobby-guests.ts` | `addSelf` |
| `entrypoints/lobby.content/teams.ts` | publishes the lineup's joins; prunes them; the invitation's Play for (`joinOffer`); `joinTeam` and `leaveTeam`; Leave team on the row; the 🌐 hidden on joined rows; the card shown while no seat of yours is on a team; the chip's *behind* |
| `entrypoints/lobby.content/TeamInvite.vue` | the Play for buttons, and the line naming who needs an update |
| `entrypoints/lobby.content/TeamRoomStatus.vue` | *behind*, joined teams and "needs a newer Tools" on the card |
| `entrypoints/lobby.content/local-lobby.ts` | leaves `joinedSeats()` alone |
| `entrypoints/match.content/teams.ts` | publishes the lineup's joins in the match too (a restarted server, a reload) |
| `locales/{en,de,nl}/teams.ts` | every new string, in the site's words; `yarn i18n:check` passes |
| `README.md`, `CHANGELOG.md` | joining a team from your own board, and what it shares |

## Testing

- **`bun test` (socket/):**
  - handshakes with 1 and 2 accepted, and 3 refused
  - a peer's `v` is the lowest of its sockets
  - joins replaced per account and stamped
  - every check on `room:joins`
  - joins kept after their author's socket leaves
  - the cap on accounts with joins
  - joins in the state
- **tsx:**
  - `screenTeams`:
    - a joined seat on every other screen, and on the joiner's own from its lineup only, never from the room
    - a join whose team isn't there
    - a seat that isn't the joiner's
    - a seat its owner keeps in their own team
    - a full team
    - lobby order and "2 of 2" alike on every screen
    - a protocol-1 room counting no join
    - a join to this account's own team
    - join authors in the room for `trusted()`
  - `joinedSeats`, `joinOffer` in each case, `roomStatus` *behind*, `statusAccounts`, `withRoom` carrying joins, `undoActor`
  - `withJoins`, `withLineup` keeping joins, `pruneJoins`
- **Client, against a spawned server:**
  - joins published, deduplicated and sent again after a rejoin
  - against a protocol-1-only server: the fallback to 1, no joins sent, and *outdated* when 1 is refused too
- **linkedom:** Local Lobby's rows leave a joined seat alone.
- **Live,** with the local server, the `yarn dev` Chrome as `creazy` and the Firefox dev build as `creazy_dev`, entering darts by hand:
  - An own-score X01 lobby hosted by creazy. TEAM RED is creazy's own seat. TEAM BLUE is two of creazy's guests, or a guest and a bot.
  - creazy_dev opens *Invite a team*'s link, so it has no seat yet, and taps Play for TEAM RED: seated on its own board and joined.
  - Both screens show TEAM RED as CREAZY, CREAZY_DEV. The host's Tools alternates the seats, and the 🌐 is hidden on CREAZY_DEV's row on creazy's screen.
  - Leave team brings the card back. Joining again works.
  - In the match: the pill and cards on both screens, team legs and the team win, Next Leg held, and a partner-rule bust thrown by creazy_dev taken back once by creazy_dev's Tools.
  - A reload mid-match.
  - A protocol-1 socket in the room (a script posing as a third account): Play for is disabled with the line, and once a join counts, the chip says *behind*.
  - The old server (protocol 1 only): the fallback, no Play for, and Online Teams otherwise as today.
- **Checks:**
  - `yarn compile` against the 14-error baseline
  - ESLint on changed files
  - `yarn i18n:check`
  - `yarn build` and `yarn build:firefox`
  - `bun test` and `bun run typecheck` in `socket/`

## To confirm live

- That the seat `addSelf` makes lands on the account's selected board. The request itself is read from the site (2026-10-06): its `/join/<id>` page posts `{ name: username, userId, boardId: <resolved scoring board> }` to `/gs/v0/lobbies/<id>/players` (`join_._lobbyId-*.js`, `clients-*.js` `addPlayer`).
- On the captain's own team, `data-adt-team-remote` on a joined row hides the 🌐 and leaves the pencil.
