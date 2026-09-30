# Teams: own scores. Implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Teams' second format, where every player keeps their own seat and score. Teams are grouped in the lobby's Add Team drawer, a leg counts for the team of whoever checks out, and the first team to the lobby's legs target wins. The e-darts partner rule is an optional setting.

**Architecture:**
- **Rules:** `utils/teams.ts` stays the pure, tsx-tested core. It gains the saved team's format and members, lineups (own-score teams by seat id, per lobby), turn-order interleaving and the seat moves, team legs, the partner-rule check, card-to-seat assignment, and `teamView`.
- **Team view:** `utils/websocket-helpers.ts`'s `processWebSocketMessage` stores `teamView(frame)` instead of the raw frame. A team's deciding leg reads as the match won, and a partner-rule checkout as a bust. Every feature that reads game data then does the right thing without team code of its own.
- **Lobby:** `entrypoints/lobby.content/teams.ts` and `AddTeamDrawer.vue` get the Shared score / Own scores tabs. They write lineups to `local:teams-lineups`, keep the seats alternating with the site's `move/to-index`, and dress member rows.
- **Match:** `entrypoints/match.content/teams.ts` and `TeamsPill.vue` render members in their team's colours, with a team chip, a tally and the team win.
- **Service worker:** the partner rule's undo runs in the background, once per visit.

**Tech Stack:**
- WXT content scripts in TypeScript
- Vue 3 `<script setup>`, with `sortablejs` (already a dependency)
- tsx + `node:test` for the pure modules
- raw CDP against the `yarn dev` Chrome (`:9222`) for live checks

**Spec:** `docs/superpowers/specs/2026-09-30-teams-own-scores-design.md`, which builds on `docs/superpowers/specs/2026-09-30-teams-design.md`.

## Global Constraints

- **Storage:**
  - `IConfig.teams = { enabled: boolean; saved: SavedTeam[]; partnerRule: boolean }`
  - `SavedTeam.format: "shared" | "own"`, plus `SavedTeam.members?: TeamMember[]` for own
  - new item `AutodartsToolsTeamLineups` at `local:teams-lineups`, a `LineupStore`, default `{}`; entries older than `SHIFT_TTL_MS` (24 h) are dropped on every write
  - `CONFIG_VERSION` stays 15: `normalizeTeams` fills every new field
  - every write of `config.teams` keeps `partnerRule`
- **Limits:** a team has 2–6 players in both formats (`MIN_PLAYERS`, `MAX_PLAYERS`). A name is 1–24 characters after `normalizeName`.
- **Format:** all teams in a lobby use one format, and the first team sets it (`lobbyFormat`). A lobby with `sets` doesn't offer Own scores.
- **Team result:**
  - a team's legs = the sum of `scores[i].legs` over its seats
  - its target = `match.legs`
  - it's decided when a team's legs ≥ target, legs only (no result when `match.sets` is set)
- **Turn order:** `interleave`: seats grouped by team in their current order, then one of each team in turn, starting with the first seat's team. A seat on no team is a team of one.
- **Partner rule:**
  - X01 only, with exactly two lineup teams and every seat of the match on one of them, and a human thrower (no `cpuPPR`)
  - a checkout breaks it when a teammate's `gameScores` entry is **strictly** greater than the other team's entries added up
  - the bust: `POST /undo` once per dart of the visit, then `POST /players/next`, in the service worker, once per `matchId|dartIds`
- **Copy, verbatim:**
  - tabs: `Shared score`, `Own scores`
  - own-scores drawer line: `Everyone keeps their own score. A leg counts for the team of whoever checks out, and the first team to {N} legs wins the match.` When N is unknown: `Everyone keeps their own score. A leg counts for the team of whoever checks out, and the first team to the lobby's target wins the match.`
  - locked tabs: `{TEAM} already plays on own scores, so this lobby's teams do too.` / `{TEAM} already shares a score, so this lobby's teams do too.`
  - sets lobby: `Own-score teams play legs. Set the lobby to legs to use them.`
  - own sections: `In this lobby` (hint `tap to add`), `New players` (hint `join as guests on your board`)
  - own colour hint: `their cards' gradient while one of them is up`
  - lobby row label: `{TEAM}`, then `{k} of {n}`
  - uneven teams: `{A} has {a} players and {B} {b}: the bigger team throws more often each round.` (see `unevenText`)
  - the team win: `{TEAM} wins the match`, then the result `{a} – {b}` (an en dash between spaces)
  - tally: `first to {N}`
  - warning: `No checkout this visit: {TEAMMATE} has {x} left, more than {OPPONENTS} together ({y})`
  - bust: `{PLAYER}'s checkout didn't count: partner rule.`
  - missing players: `Added. {NAMES} isn't in the lobby: signed-in players join from their own board.` (`aren't` for more than one)
  - settings row: title `Partner rule`, description `Own scores, X01, two teams: nobody may check out while their partner has more left than both opponents together. A checkout that breaks it counts as a bust.`
  - saved team labels: `SHARED SCORE`, `OWN SCORES`
- **Selectors:** anchors go in `utils/selectors.ts` as ordered candidate lists, with no English text anchors ([[selector-robustness-over-hardcoding]]).
- **Code style:**
  - spaces inside array brackets (`[ a, b ]`) and object braces
  - double quotes
  - no `void` (use `.catch(e => console.error(e))`)
  - comments say why, as the files around them do
- **Never edit:** `safari/**/Shared (Extension)/**`, `components/WhatsNew.vue`, `entrypoints/content/migration-config.ts`.
- **Dev browser:**
  - use only my own background tab
  - park it at `about:blank` before every source edit, and check no tab is on `/matches/` first
  - keep WLED off during runs
  - at the end, restore `wledFx.enabled: true`, `teams` as it was, `adt:last-visited-url` and `urlstatus` = `https://play.autodarts.com/tools`
- **Commits:** one per task (more where a step says so), on `feat/teams`. No push.
- **Tests:**
  - `$SCR/tests/*.test.mts`, run with `node_modules/.bin/tsx --tsconfig tsconfig.json --test`
  - `$SCR` = `/private/tmp/claude-501/-Volumes-WD-BLACK-PROJECTS-Autodarts-autodarts-tools-wxt/5dbcfc36-4526-4092-b5a0-630879b56ae1/scratchpad`
  - live helpers are in `$SCR/live/`: `cdp.mjs`, `api.mjs`, `storage.mjs`, `play.mjs`, `probe.mjs`, `count.mjs`, `state.mjs`, `rmkey.mjs`
  - `yarn compile`'s baseline is 14 errors

## Review Focus

1. **The extension moves seats in a lobby that also changes under it.** The host drags, presses Shuffle, or a guest joins while a reorder runs. The seats must settle in alternating order within a bounded number of moves, never ping-pong, and stop when the site refuses a move. Pinned by Task 4 step 7 (Shuffle and a drag during a reorder, with the moves counted).
2. **Two bots of the same level on different teams.** Cards carry only a name, and each card must still show the right team in all three layouts. Pinned by the `assignCards` tests (Task 2) and Task 6 step 7 (a live match with two Bot Level 5).
3. **The partner-rule undo firing twice:** two open match tabs, or the site sending the same won-leg frame again. Only one visit may be undone. Pinned by the `undoVisit` tests (Task 7) and Task 7 step 8 (two tabs, darts counted on the server).
4. **Players carrying on after the team win.** The site's match is still open. Next Leg stays hidden and Space/Enter are held while the deciding leg's panel is up, the pill keeps the result afterwards, and nothing throws. Pinned by Task 6 step 6.
5. **A lineup for another lobby, or a frame for another match.** Game data is shared between tabs ([[board-data-and-game-data-are-cross-tab]]), so the view must key the lineup by the frame's own `id`, never the URL. Pinned by the `lineupOf` test (Task 1) and the `teamView` test with no lineup (Task 2), and checked by code review in Task 3.

---

### Task 1: Own-score data and the lobby's rules

**Files:**
- Modify: `utils/teams.ts`
- Modify: `utils/storage.ts` (the `IConfig.teams` type, the default, and a new item)
- Modify: `entrypoints/lobby.content/teams.ts` (`saveTeam` keeps `partnerRule`; `submitDraft`'s team gets `format: "shared"`)
- Test: `$SCR/tests/teams-own.test.mts`

**Interfaces:**
- Consumes: the existing `utils/teams.ts` exports.
- Produces:
  - types `TeamFormat`, `TeamMember`, `SavedTeam` (`format`, `members?`), `TeamsConfig` (`partnerRule`), `SeatLike` (`id?`, `index?`), `LineupTeam`, `Lineup`, `LineupStore`, `SeatSlot`, `OwnPick`, `OwnDraft`, `OwnContext`
  - `sharedTeams(saved)`, `withLineup(store, lobbyId, teams, now)`, `lineupOf(store, id)`, `pruneLineup(teams, seatIds)`, `lobbyFormat(players, lineup, saved, hostId)`, `interleave(seatIds, teamOf)`, `seatMoves(current, target)`, `memberOf(seat)`, `rejoinSlots(team, players, hostId, taken)`, `resolveSlots(slots, known, players)`, `checkOwnTeam(draft, context)`, `joinNames(names)`, `unevenText(teams)`
  - `AutodartsToolsTeamLineups: WxtStorageItem<LineupStore, any>`

- [ ] **Step 1: Write the failing test** `$SCR/tests/teams-own.test.mts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  checkOwnTeam, interleave, lineupOf, lobbyFormat, memberOf, normalizeTeams, pruneLineup, rejoinSlots,
  rememberTeam, resolveSlots, seatMoves, teamSeats, unevenText, withLineup,
} from "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/utils/teams.ts";

const ME = "host-1";
const crimson = { preset: "crimson", from: "#6a1624", to: "#b8323f" };
const ocean = { preset: "ocean", from: "#374c98", to: "#0b55df" };
const guest = (id: string, name: string, hostId = ME) => ({ id, name, userId: null, hostId, cpuPPR: null });
const bot = (id: string, ppr = 60) => ({ id, name: "Bot Level 5", userId: null, hostId: ME, cpuPPR: ppr });
const account = (id: string, name: string, userId: string) => ({ id, name, userId, hostId: userId, cpuPPR: null });

test("normalizeTeams: old saved teams read as shared, the rule is off, own teams keep their members", () => {
  const out = normalizeTeams({ enabled: true, saved: [
    { name: "team red", players: [ "anna", "tom" ], colour: crimson },
    { name: "TEAM BLUE", players: [ "CREAZY.DEV", "BOT LEVEL 5" ], colour: ocean, format: "own",
      members: [ { name: "creazy.dev", kind: "account", userId: "u-2" }, { name: "Bot Level 5", kind: "bot", ppr: 60 } ] },
    { name: "TEAM GREEN", players: [ "A", "B" ], colour: ocean, format: "own", members: [ { name: "A", kind: "guest" } ] },
  ] });
  assert.equal(out.partnerRule, false);
  assert.deepEqual(out.saved[0], { name: "TEAM RED", players: [ "ANNA", "TOM" ], colour: crimson, format: "shared" });
  assert.deepEqual(out.saved[1].members, [ { name: "CREAZY.DEV", kind: "account", userId: "u-2" }, { name: "BOT LEVEL 5", kind: "bot", ppr: 60 } ]);
  assert.equal(out.saved[2].format, "own");
  assert.equal(out.saved[2].members, undefined, "members that don't line up with the players are dropped");
  assert.equal(normalizeTeams({ partnerRule: true }).partnerRule, true);
});

test("rememberTeam keeps a team's format and members, as plain data", () => {
  const own = { name: "TEAM BLUE", players: [ "BEN", "MIA" ], colour: ocean, format: "own" as const, members: [ { name: "BEN", kind: "guest" as const }, { name: "MIA", kind: "guest" as const } ] };
  const [ first ] = rememberTeam([], new Proxy(own, {}));
  assert.deepEqual(first, own);
  assert.notEqual(first.members, own.members);
});

test("teamSeats takes shared teams only: an own-score team's name is not a seat", () => {
  const saved = normalizeTeams({ saved: [ { name: "TEAM BLUE", players: [ "BEN", "MIA" ], colour: ocean, format: "own" } ] }).saved;
  assert.equal(teamSeats([ guest("s1", "TEAM BLUE") ], saved, ME).size, 0);
});

test("withLineup writes a lobby's teams as plain data, and drops empty teams and day-old lobbies", () => {
  const now = 1_000_000_000;
  const old = { at: now - 25 * 3_600_000, teams: [ { name: "X", colour: ocean, seatIds: [ "a" ] } ] };
  const store = withLineup({ old }, "lobby-1", [ { name: "TEAM RED", colour: crimson, seatIds: [ "a", "b" ] }, { name: "EMPTY", colour: ocean, seatIds: [] } ], now);
  assert.deepEqual(Object.keys(store), [ "lobby-1" ]);
  assert.deepEqual(lineupOf(store, "lobby-1")?.teams.map(team => team.name), [ "TEAM RED" ]);
  assert.equal(lineupOf(store, "another-lobby"), undefined);
  assert.deepEqual(withLineup(store, "lobby-1", [], now), {}, "a lobby with no teams left has no lineup");
});

test("pruneLineup drops seats that left, and teams with none left", () => {
  const teams = [ { name: "RED", colour: crimson, seatIds: [ "a", "b" ] }, { name: "BLUE", colour: ocean, seatIds: [ "c" ] } ];
  assert.deepEqual(pruneLineup(teams, [ "b", "d" ]), [ { name: "RED", colour: crimson, seatIds: [ "b" ] } ]);
});

test("lobbyFormat: a lineup means own scores, a shared team's guest means shared, else none", () => {
  const saved = normalizeTeams({ saved: [ { name: "TEAM RED", players: [ "ANNA", "TOM" ], colour: crimson } ] }).saved;
  const lineup = { at: 1, teams: [ { name: "TEAM BLUE", colour: ocean, seatIds: [ "s1" ] } ] };
  assert.equal(lobbyFormat([ guest("s1", "BEN") ], lineup, saved, ME), "own");
  assert.equal(lobbyFormat([ guest("s1", "TEAM RED") ], undefined, saved, ME), "shared");
  assert.equal(lobbyFormat([ guest("s1", "BEN") ], undefined, saved, ME), undefined);
});

test("interleave: teams take turns from the first seat's team, each in its own order", () => {
  const team: Record<string, string> = { a1: "A", a2: "A", b1: "B", b2: "B", b3: "B" };
  const of = (id: string) => team[id];
  assert.deepEqual(interleave([ "a1", "a2", "b1", "b2" ], of), [ "a1", "b1", "a2", "b2" ]);
  assert.deepEqual(interleave([ "b2", "a2", "a1", "b1" ], of), [ "b2", "a2", "b1", "a1" ]);
  assert.deepEqual(interleave([ "a1", "b1", "b2", "b3", "a2" ], of), [ "a1", "b1", "a2", "b2", "b3" ], "uneven: the bigger team's last seats close the round");
  assert.deepEqual(interleave([ "a1", "solo", "a2", "b1" ], of), [ "a1", "solo", "b1", "a2" ], "a seat on no team is a team of one");
  assert.deepEqual(interleave([ "a1", "b1", "a2", "b2" ], of), [ "a1", "b1", "a2", "b2" ], "an alternating order stays as it is");
});

test("seatMoves reaches the target from every order of four seats, one splice at a time", () => {
  const perms = (list: string[]): string[][] => list.length <= 1
    ? [ list ]
    : list.flatMap((x, i) => perms([ ...list.slice(0, i), ...list.slice(i + 1) ]).map(rest => [ x, ...rest ]));
  for (const from of perms([ "a", "b", "c", "d" ])) {
    for (const to of perms([ "a", "b", "c", "d" ])) {
      const order = [ ...from ];
      const moves = seatMoves(from, to);
      for (const { index, toIndex } of moves) order.splice(toIndex, 0, ...order.splice(index, 1));
      assert.deepEqual(order, to);
      assert.ok(moves.length <= 3);
    }
  }
});

test("memberOf says how a seat joined", () => {
  assert.deepEqual(memberOf(guest("s1", "anna")), { name: "ANNA", kind: "guest" });
  assert.deepEqual(memberOf(bot("s2", 40)), { name: "BOT LEVEL 5", kind: "bot", ppr: 40 });
  assert.deepEqual(memberOf(account("s3", "creazy.dev", "u-2")), { name: "CREAZY.DEV", kind: "account", userId: "u-2" });
});

test("rejoinSlots seats whoever is there, adds guests and bots, and names absent accounts", () => {
  const team = normalizeTeams({ saved: [ { name: "TEAM BLUE", colour: ocean, format: "own", players: [ "CREAZY.DEV", "BOT LEVEL 5", "MIA" ],
    members: [ { name: "CREAZY.DEV", kind: "account", userId: "u-2" }, { name: "BOT LEVEL 5", kind: "bot", ppr: 60 }, { name: "MIA", kind: "guest" } ] } ] }).saved[0];
  const lobby = [ account("s1", "creazy.dev", "u-2"), bot("s2", 60), guest("s3", "MIA") ];
  assert.deepEqual(rejoinSlots(team, lobby, ME, new Set()), [ { kind: "seat", seatId: "s1" }, { kind: "seat", seatId: "s2" }, { kind: "seat", seatId: "s3" } ]);
  assert.deepEqual(rejoinSlots(team, [ bot("s2", 60) ], ME, new Set([ "s2" ])), [
    { kind: "missing", name: "CREAZY.DEV" }, { kind: "bot", name: "BOT LEVEL 5", ppr: 60 }, { kind: "guest", name: "MIA" },
  ], "a bot already on another team is not taken");
});

test("resolveSlots finds the new seats: guests by name, bots by level, each once", () => {
  const slots = [ { kind: "seat", seatId: "s1" }, { kind: "guest", name: "MIA" }, { kind: "bot", name: "BOT LEVEL 5", ppr: 60 }, { kind: "bot", name: "BOT LEVEL 5", ppr: 60 }, { kind: "missing", name: "X" } ] as const;
  const known = new Set([ "s1", "old-bot" ]);
  assert.deepEqual(resolveSlots(slots, known, [ guest("s1", "ANNA"), bot("old-bot"), guest("n1", "mia"), bot("n2"), bot("n3") ]), [ "s1", "n1", "n2", "n3", undefined ]);
  assert.deepEqual(resolveSlots(slots, known, [ guest("s1", "ANNA") ]), [ "s1", undefined, undefined, undefined, undefined ]);
});

test("checkOwnTeam says what is wrong, or nothing", () => {
  const context = { seatNames: [ "ANNA", "creazy.dev" ], takenSeats: new Set([ "s9" ]), teamNames: [ "TEAM RED" ], freeSeats: 1 };
  const ok = { name: "TEAM BLUE", colour: ocean, picks: [ { seatId: "s2", name: "CREAZY.DEV" }, { guest: "mia" } ] };
  assert.equal(checkOwnTeam(ok, context), undefined);
  assert.equal(checkOwnTeam({ ...ok, name: " " }, context), "Give the team a name.");
  assert.equal(checkOwnTeam({ ...ok, name: "team red" }, context), "There's already a team called TEAM RED in this lobby.");
  assert.equal(checkOwnTeam({ ...ok, picks: [ { guest: "MIA" } ] }, context), "A team needs at least 2 players.");
  assert.equal(checkOwnTeam({ ...ok, picks: [ { seatId: "s9", name: "TOM" }, { guest: "MIA" } ] }, context), "TOM is already on another team.");
  assert.equal(checkOwnTeam({ ...ok, picks: [ { guest: "MIA" }, { guest: "mia" } ] }, context), "Each player can only be in the team once.");
  assert.equal(checkOwnTeam({ ...ok, picks: [ { seatId: "s2", name: "X" }, { guest: "anna" } ] }, context), "There's already a player called ANNA in this lobby. Pick them under In this lobby.");
  assert.equal(checkOwnTeam({ ...ok, picks: [ { guest: "MIA" }, { guest: "LEA" } ] }, context), "The lobby has room for 1 more player.");
});

test("unevenText: nothing for teams of one size, the sizes otherwise", () => {
  const t = (name: string, n: number) => ({ name, colour: ocean, seatIds: Array.from({ length: n }, (_, i) => `${name}${i}`) });
  assert.equal(unevenText([ t("TEAM RED", 2), t("TEAM BLUE", 2) ]), "");
  assert.equal(unevenText([ t("TEAM RED", 3), t("TEAM BLUE", 2) ]), "TEAM RED has 3 players and TEAM BLUE 2: the bigger team throws more often each round.");
  assert.equal(unevenText([ t("TEAM RED", 1), t("TEAM BLUE", 2), t("TEAM GREEN", 2) ]), "TEAM RED has 1 player, TEAM BLUE 2 and TEAM GREEN 2: the bigger team throws more often each round.");
});
```

- [ ] **Step 2: Run it and see it fail.**

Run: `cd $SCR/tests && /Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/node_modules/.bin/tsx --tsconfig /Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/tsconfig.json --test teams-own.test.mts`
Expected: FAIL: `does not provide an export named 'checkOwnTeam'`.

- [ ] **Step 3: `utils/teams.ts`.** Replace the module comment's first paragraph with one that covers both formats:

```ts
/**
 * Teams: which seats of a lobby or match are teams, whose turn it is inside
 * one, and the rules a new team has to meet.
 *
 * Two formats. With a shared score, a team is one guest seat on the host's
 * board, named after the team, and its players take turns on that seat's score,
 * like steel-tip doubles. With own scores, every player is a seat of their own
 * (a guest, someone on their own board, or a bot), and a team is a group of
 * seats, recorded by seat id in the lobby's lineup: a leg counts for the team of
 * whoever checks out. The site knows nothing about either: everything here is
 * what the extension adds on top, and all of it is pure (no DOM, no storage, no
 * extension APIs), so it runs under tsx.
 *
 * Saved teams are keyed by name. A guest the host adds under a saved shared
 * team's name, in any lobby or match, is that team; a saved own-score team
 * remembers how each of its players joined, so the drawer can seat them again.
 */
```

Replace the `SavedTeam` and `TeamsConfig` interfaces and `SeatLike` with:

```ts
export type TeamFormat = "shared" | "own";

/** How an own-score team's player joined, so a saved team can bring them back. */
export interface TeamMember {
  name: string;
  kind: "guest" | "account" | "bot";
  /** An account's user id. */
  userId?: string;
  /** A bot's level, as the site's cpuPPR. */
  ppr?: number;
}

/** A team as it is saved: its name, its players in throwing order, its colour and its format. */
export interface SavedTeam {
  /** The team's name, as the site shows a name: trimmed and upper case. For a shared score, its seat's name. */
  name: string;
  /** In throwing order, upper case, each once. */
  players: string[];
  /** The gradient its cards turn while it is up: a Colors scheme. */
  colour: ColorScheme;
  /** "shared" for every team saved before own scores existed. */
  format: TeamFormat;
  /** Own scores only: one per player, in the same order. */
  members?: TeamMember[];
}

/** `IConfig.teams`. */
export interface TeamsConfig {
  enabled: boolean;
  /** Most recently used first. */
  saved: SavedTeam[];
  /** Own scores' e-darts partner rule; see {@link partnerRuleBreach}. */
  partnerRule: boolean;
}
```

```ts
/** The fields of a lobby or match seat that say whose it is. */
export interface SeatLike {
  /** The seat's id, the same in the lobby and the match started from it. */
  id?: string;
  /** The seat in the lobby's order; `players` itself is put in throwing order every leg. */
  index?: number;
  name?: string | null;
  userId?: string | null;
  hostId?: string | null;
  cpuPPR?: number | null;
}

/** An own-score team as a lobby and its match know it: its seats, in throwing order. */
export interface LineupTeam {
  name: string;
  colour: ColorScheme;
  seatIds: string[];
}

/** A lobby's own-score teams, in the order they were added. */
export interface Lineup {
  at: number;
  teams: LineupTeam[];
}

/** Per lobby id, which is also its match's id. */
export type LineupStore = Record<string, Lineup>;

/** A place in an own-score team, before the lobby has seated everyone. */
export type SeatSlot =
  | { kind: "seat"; seatId: string }
  | { kind: "guest"; name: string }
  | { kind: "bot"; name: string; ppr: number }
  | { kind: "missing"; name: string };

/** A player picked in the drawer: a seat already in the lobby, or a name to add as a guest. */
export type OwnPick = { seatId: string; name: string } | { guest: string };

export interface OwnDraft {
  name: string;
  colour: ColorScheme;
  /** In throwing order. */
  picks: readonly OwnPick[];
}

export interface OwnContext {
  /** Every seat's name in the lobby, which a new guest must not take. */
  seatNames: readonly string[];
  /** The seats on the lobby's other own-score teams. */
  takenSeats: ReadonlySet<string>;
  /** The lobby's other own-score teams' names. */
  teamNames: readonly string[];
  /** Seats the lobby has left. */
  freeSeats: number;
}
```

Replace `normalizeTeams` with this, and add `normalizeMembers` above it:

```ts
/** Members that line up with the players one for one, or none: a saved team's record of how each joined. */
function normalizeMembers(raw: unknown, players: readonly string[]): TeamMember[] | undefined {
  if (!Array.isArray(raw) || raw.length !== players.length) return undefined;
  const members: TeamMember[] = [];
  for (const [ index, entry ] of raw.entries()) {
    const name = normalizeName(entry?.name);
    const kind = entry?.kind;
    if (name !== players[index] || (kind !== "guest" && kind !== "account" && kind !== "bot")) return undefined;
    if (kind === "account") {
      if (typeof entry.userId !== "string" || !entry.userId) return undefined;
      members.push({ name, kind, userId: entry.userId });
    } else if (kind === "bot") {
      const ppr = Math.round(Number(entry.ppr));
      if (!Number.isFinite(ppr) || ppr <= 0) return undefined;
      members.push({ name, kind, ppr });
    } else {
      members.push({ name, kind });
    }
  }
  return members;
}

/** Settings from anywhere, in the current shape: broken entries dropped, the rest cleaned. */
export function normalizeTeams(saved: unknown): TeamsConfig {
  const value = (saved && typeof saved === "object" ? saved : {}) as Record<string, any>;
  const teams: SavedTeam[] = [];
  for (const entry of Array.isArray(value.saved) ? value.saved : []) {
    const name = normalizeName(entry?.name).slice(0, MAX_NAME_LENGTH);
    if (!name || teams.some(team => team.name === name)) continue;
    const players = uniqueNames(Array.isArray(entry?.players) ? entry.players : []).slice(0, MAX_PLAYERS);
    if (players.length < MIN_PLAYERS) continue;
    const format: TeamFormat = entry?.format === "own" ? "own" : "shared";
    const team: SavedTeam = { name, players, colour: normalizeColour(entry?.colour), format };
    const members = format === "own" ? normalizeMembers(entry?.members, players) : undefined;
    if (members) team.members = members;
    teams.push(team);
  }
  return { enabled: Boolean(value.enabled), saved: teams, partnerRule: Boolean(value.partnerRule) };
}

/** The saved teams that share a score: the ones a guest seat can be. */
export function sharedTeams(saved: readonly SavedTeam[]): SavedTeam[] {
  return saved.filter(team => team.format !== "own");
}
```

In `teamSeats`, change `const team = findTeam(teams, seat.name);` to `const team = findTeam(sharedTeams(teams), seat.name);`, and its comment to `/** The seats that are shared-score teams, by their index in `players`. */`.

Replace `plainTeam`:

```ts
/** A team as plain data: its fields copied out of whatever reactive proxy holds them. */
function plainTeam(team: SavedTeam): SavedTeam {
  const { preset, from, to } = team.colour;
  const plain: SavedTeam = { name: team.name, players: [ ...team.players ], colour: { preset, from, to }, format: team.format === "own" ? "own" : "shared" };
  if (team.members) {
    plain.members = team.members.map(({ name, kind, userId, ppr }) => {
      const member: TeamMember = { name, kind };
      if (userId) member.userId = userId;
      if (ppr) member.ppr = ppr;
      return member;
    });
  }
  return plain;
}
```

Append after `rememberTeam`:

```ts
function plainLineupTeam(team: LineupTeam): LineupTeam {
  const { preset, from, to } = team.colour;
  return { name: team.name, colour: { preset, from, to }, seatIds: [ ...team.seatIds ] };
}

/**
 * A lobby's own-score teams written into the store, as plain data. Teams with
 * no seats are dropped, a lobby with no teams has no lineup, and entries older
 * than a day go.
 */
export function withLineup(store: LineupStore | undefined, lobbyId: string, teams: readonly LineupTeam[], now: number): LineupStore {
  const next: LineupStore = {};
  for (const [ id, entry ] of Object.entries(store ?? {})) {
    if (id !== lobbyId && entry && now - entry.at < SHIFT_TTL_MS) next[id] = entry;
  }
  const kept = teams.filter(team => team.seatIds.length).map(plainLineupTeam);
  if (kept.length) next[lobbyId] = { at: now, teams: kept };
  return next;
}

/** A lobby's (or its match's) lineup, by its own id: never the page's, since game data is shared between tabs. */
export function lineupOf(store: LineupStore | undefined, id: string | undefined): Lineup | undefined {
  return id ? store?.[id] : undefined;
}

/** The teams with the seats that left taken out, and the teams with none left dropped. */
export function pruneLineup(teams: readonly LineupTeam[], seatIds: readonly string[]): LineupTeam[] {
  const present = new Set(seatIds);
  return teams
    .map(team => ({ ...team, seatIds: team.seatIds.filter(id => present.has(id)) }))
    .filter(team => team.seatIds.length);
}

/** The format a lobby's teams have, or none while it has no team: the first team sets it. */
export function lobbyFormat(players: readonly SeatLike[], lineup: Lineup | undefined, saved: readonly SavedTeam[], hostId: string | null | undefined): TeamFormat | undefined {
  if (lineup?.teams.length) return "own";
  return teamSeats(players, saved, hostId).size ? "shared" : undefined;
}

/**
 * The seats in turn order: grouped by team as they stand, then one of each
 * team in turn, starting with the first seat's team. A seat on no team is a
 * team of one, and a team that has run out of seats drops out of the round.
 */
export function interleave(seatIds: readonly string[], teamOf: (seatId: string) => string | undefined): string[] {
  const groups: string[][] = [];
  const byTeam = new Map<string, string[]>();
  for (const id of seatIds) {
    const team = teamOf(id);
    if (team === undefined) {
      groups.push([ id ]);
      continue;
    }
    let group = byTeam.get(team);
    if (!group) {
      group = [];
      byTeam.set(team, group);
      groups.push(group);
    }
    group.push(id);
  }
  const out: string[] = [];
  for (let round = 0; out.length < seatIds.length; round++) {
    for (const group of groups) {
      if (round < group.length) out.push(group[round]);
    }
  }
  return out;
}

/** The site's `move/to-index` requests that turn one order into the other, each applied to the order the one before left. */
export function seatMoves(current: readonly string[], target: readonly string[]): { index: number; toIndex: number }[] {
  const order = [ ...current ];
  const moves: { index: number; toIndex: number }[] = [];
  target.forEach((id, toIndex) => {
    const index = order.indexOf(id);
    if (index < 0 || index === toIndex) return;
    order.splice(toIndex, 0, ...order.splice(index, 1));
    moves.push({ index, toIndex });
  });
  return moves;
}

/** How a seat joined: a bot (at its level), an account, or a guest. */
export function memberOf(seat: SeatLike): TeamMember {
  const name = normalizeName(seat.name);
  if (seat.cpuPPR) return { name, kind: "bot", ppr: seat.cpuPPR };
  if (seat.userId) return { name, kind: "account", userId: seat.userId };
  return { name, kind: "guest" };
}

/**
 * How a saved own-score team gets back into a lobby, one slot per player in
 * throwing order: a seat that is already there (and on no other team, `taken`),
 * a guest or a bot to add, or a signed-in player who isn't in the lobby, since
 * they join from their own board.
 */
export function rejoinSlots(team: SavedTeam, players: readonly SeatLike[], hostId: string | null | undefined, taken: ReadonlySet<string>): SeatSlot[] {
  const members = team.members ?? team.players.map((name): TeamMember => ({ name, kind: "guest" }));
  const used = new Set(taken);
  const claim = (fits: (seat: SeatLike) => boolean): string | undefined => {
    const seat = players.find(candidate => candidate.id && !used.has(candidate.id) && fits(candidate));
    if (seat?.id) used.add(seat.id);
    return seat?.id;
  };
  return members.map((member): SeatSlot => {
    if (member.kind === "account") {
      const seatId = claim(seat => Boolean(member.userId) && seat.userId === member.userId);
      return seatId ? { kind: "seat", seatId } : { kind: "missing", name: member.name };
    }
    if (member.kind === "bot") {
      const seatId = claim(seat => Boolean(seat.cpuPPR) && seat.cpuPPR === member.ppr);
      return seatId ? { kind: "seat", seatId } : { kind: "bot", name: member.name, ppr: member.ppr ?? 60 };
    }
    const seatId = claim(seat => isHostedGuest(seat, hostId) && normalizeName(seat.name) === member.name);
    return seatId ? { kind: "seat", seatId } : { kind: "guest", name: member.name };
  });
}

/**
 * The seat each slot ended up with once the lobby has seated the new ones, or
 * `undefined` where nobody was: a guest found by its name, a bot by its level,
 * each among the seats that weren't there before (`known`) and each once.
 */
export function resolveSlots(slots: readonly SeatSlot[], known: ReadonlySet<string>, players: readonly SeatLike[]): (string | undefined)[] {
  const fresh = players.filter(seat => seat.id && !known.has(seat.id));
  const used = new Set<string>();
  const take = (fits: (seat: SeatLike) => boolean): string | undefined => {
    const seat = fresh.find(candidate => !used.has(candidate.id!) && fits(candidate));
    if (seat?.id) used.add(seat.id);
    return seat?.id;
  };
  return slots.map((slot) => {
    if (slot.kind === "seat") return slot.seatId;
    if (slot.kind === "guest") return take(seat => !seat.userId && !seat.cpuPPR && normalizeName(seat.name) === slot.name);
    if (slot.kind === "bot") return take(seat => seat.cpuPPR === slot.ppr);
    return undefined;
  });
}

/** What stops an own-score team from being added, in words for the drawer, or nothing. */
export function checkOwnTeam(draft: OwnDraft, context: OwnContext): string | undefined {
  const name = normalizeName(draft.name);
  if (!name) return "Give the team a name.";
  if (name.length > MAX_NAME_LENGTH) return `A team name can be ${MAX_NAME_LENGTH} characters at most.`;
  if (uniqueNames(context.teamNames).includes(name)) return `There's already a team called ${name} in this lobby.`;
  if (draft.picks.length < MIN_PLAYERS) return `A team needs at least ${MIN_PLAYERS} players.`;
  if (draft.picks.length > MAX_PLAYERS) return `A team can have ${MAX_PLAYERS} players at most.`;

  const seats = draft.picks.filter((pick): pick is { seatId: string; name: string } => "seatId" in pick);
  const onAnother = seats.find(pick => context.takenSeats.has(pick.seatId));
  if (onAnother) return `${normalizeName(onAnother.name)} is already on another team.`;
  const guests = draft.picks.filter((pick): pick is { guest: string } => "guest" in pick).map(pick => normalizeName(pick.guest));
  if (new Set(guests).size !== guests.length || new Set(seats.map(pick => pick.seatId)).size !== seats.length) return "Each player can only be in the team once.";
  const seated = new Set(uniqueNames(context.seatNames));
  const clash = guests.find(guest => seated.has(guest));
  if (clash) return `There's already a player called ${clash} in this lobby. Pick them under In this lobby.`;
  if (guests.length > context.freeSeats) return `The lobby has room for ${context.freeSeats} more ${context.freeSeats === 1 ? "player" : "players"}.`;
  return undefined;
}

/** "A", "A and B", "A, B and C". */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** The note under the lobby's players when the teams aren't the same size, or "". */
export function unevenText(teams: readonly LineupTeam[]): string {
  const sizes = teams.map(team => team.seatIds.length);
  if (teams.length < 2 || sizes.every(size => size === sizes[0])) return "";
  const [ first, ...rest ] = teams;
  const firstPart = `${first.name} has ${first.seatIds.length} ${first.seatIds.length === 1 ? "player" : "players"}`;
  return `${joinNames([ firstPart, ...rest.map(team => `${team.name} ${team.seatIds.length}`) ])}: the bigger team throws more often each round.`;
}
```

- [ ] **Step 4: Run the test and see it pass,** then run `teams.test.mts` and `config-renames.test.mts` as well.

Run: `cd $SCR/tests && /Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/node_modules/.bin/tsx --tsconfig /Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/tsconfig.json --test teams-own.test.mts teams.test.mts config-renames.test.mts`
Expected:
- `# fail 0`
- `teams.test.mts`'s `normalizeTeams drops broken entries and cleans the rest` may now fail on the added `format` and `partnerRule` fields. If it does, update its expected objects to include `format: "shared"` and `partnerRule: false` (no other changes), and note that in the ledger.

- [ ] **Step 5: `utils/storage.ts`.**
  - In the `IConfig.teams` type, add after `saved: SavedTeam[];`:

```ts
    /** Own scores' e-darts partner rule; see utils/teams.ts. */
    partnerRule: boolean;
```
  - In `defaultConfig.teams`, add `partnerRule: false,`.
  - Change the import to `import { type LineupStore, type SavedTeam, type ShiftStore, normalizeTeams } from "@/utils/teams";`.
  - After `AutodartsToolsTeamShifts`, add:

```ts
/**
 * Own-score teams: per lobby id (the match's id too), which seats play for
 * which team (utils/teams.ts). Its own item rather than a setting: it is about
 * a lobby on this browser, and lives a day.
 */
export const AutodartsToolsTeamLineups: WxtStorageItem<LineupStore, any> = storage.defineItem(
  "local:teams-lineups",
  {
    defaultValue: {},
  },
);
```

- [ ] **Step 6: `entrypoints/lobby.content/teams.ts`.**
  - In `saveTeam`, write the whole normalized config back rather than rebuilding it, so `partnerRule` survives:

```ts
async function saveTeam(team: SavedTeam) {
  const config = await AutodartsToolsConfig.getValue();
  const current = normalizeTeams(config.teams);
  await AutodartsToolsConfig.setValue({ ...config, teams: { ...current, saved: rememberTeam(current.saved, team) } });
}
```
  - In `submitDraft`, the team becomes `{ name: …, players: …, colour: { ...draft.colour }, format: "shared" }`.
  - In `teamsInLobby`, look the name up in the shared teams: `const team = findTeam(sharedTeams(saved), seat.name);`, with `sharedTeams` added to the `@/utils/teams` import.

- [ ] **Step 7: Type-check, lint and commit.**

Run: `yarn compile 2>&1 | grep -c "error TS"`, then for each changed file `npx eslint <file>`, comparing with `git show "HEAD:<file>" | npx eslint --stdin --stdin-filename <file>`.
Expected: 14 errors, none in the changed files, and no new lint findings.

```bash
git add utils/teams.ts utils/storage.ts entrypoints/lobby.content/teams.ts
git commit -m "feat: own-score teams in the rules: formats, lineups, turn order and the checks"
```

---

### Task 2: The match's rules: team legs, the partner rule, the team view and the cards

**Files:**
- Modify: `utils/teams.ts`
- Test: `$SCR/tests/teams-match.test.mts`

**Interfaces:**
- Consumes: `SeatLike`, `Lineup`, `LineupTeam` and `normalizeName` from Task 1.
- Produces:
  - types `TeamMatch`, `Breach`, `AdtTeams`, `TeamViewContext`, `CardInfo`
  - `lineupTeams(players, lineup): Map<number, LineupTeam>`
  - `teamLegs(match, lineup): Record<string, number>`
  - `decidedTeam(match, lineup): string | undefined`
  - `partnerRuleBreach(match, lineup, seat): Breach | undefined`
  - `teamView<M extends TeamMatch>(match: M, context: TeamViewContext): M`
  - `assignCards(cards, players, up): number[]`
  - `decidedText(team)`, `resultText(legs, decided, lineup)`, `warningText(breach)`, `bustText(breach)`

- [ ] **Step 1: Write the failing test** `$SCR/tests/teams-match.test.mts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  assignCards, bustText, decidedTeam, decidedText, lineupTeams, partnerRuleBreach, resultText, teamLegs, teamView, warningText,
} from "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/utils/teams.ts";

const crimson = { preset: "crimson", from: "#6a1624", to: "#b8323f" };
const ocean = { preset: "ocean", from: "#374c98", to: "#0b55df" };
const RED = { name: "TEAM RED", colour: crimson, seatIds: [ "a1", "a2" ] };
const BLUE = { name: "TEAM BLUE", colour: ocean, seatIds: [ "b1", "b2" ] };
const LINEUP = { at: 1, teams: [ RED, BLUE ] };
const seat = (id: string, name: string, index: number, cpuPPR: number | null = null) => ({ id, name, index, userId: null, hostId: "h", cpuPPR });
const PLAYERS = [ seat("a1", "ANNA", 0), seat("b1", "BEN", 1), seat("a2", "TOM", 2), seat("b2", "Bot Level 5", 3, 60) ];

function frame(over: Record<string, unknown> = {}): any {
  return {
    id: "m1", variant: "X01", legs: 3, sets: null, set: 1, leg: 1, round: 2, player: 0,
    players: PLAYERS, scores: [ { sets: 0, legs: 1 }, { sets: 0, legs: 0 }, { sets: 0, legs: 1 }, { sets: 0, legs: 1 } ],
    gameScores: [ 32, 60, 160, 80 ], gameWinner: -1, winner: -1, gameFinished: false, turnBusted: false,
    turns: [ { points: 0, busted: false, throws: [] } ],
    ...over,
  };
}

test("lineupTeams maps seats to teams by id, whatever order the leg puts them in", () => {
  const seats = lineupTeams([ PLAYERS[2], PLAYERS[3], PLAYERS[0], PLAYERS[1] ], LINEUP);
  assert.deepEqual([ ...seats.entries() ].map(([ i, team ]) => `${i}:${team.name}`), [ "0:TEAM RED", "1:TEAM BLUE", "2:TEAM RED", "3:TEAM BLUE" ]);
  assert.equal(lineupTeams(PLAYERS, undefined).size, 0);
});

test("teamLegs adds up the members' legs; decidedTeam is a team at the target, in legs only", () => {
  assert.deepEqual(teamLegs(frame(), LINEUP), { "TEAM RED": 2, "TEAM BLUE": 1 });
  assert.equal(decidedTeam(frame(), LINEUP), undefined);
  const three = frame({ scores: [ { sets: 0, legs: 2 }, { sets: 0, legs: 0 }, { sets: 0, legs: 1 }, { sets: 0, legs: 1 } ] });
  assert.equal(decidedTeam(three, LINEUP), "TEAM RED");
  assert.equal(decidedTeam({ ...three, sets: 2 }, LINEUP), undefined, "no team result in a sets match");
});

test("partnerRuleBreach: a teammate with more left than both opponents together stops a checkout", () => {
  assert.deepEqual(partnerRuleBreach(frame(), LINEUP, 0), { player: "ANNA", teammate: "TOM", teammateLeft: 160, opponentsLeft: 140, opponents: [ "BEN", "BOT LEVEL 5" ] });
  assert.equal(partnerRuleBreach(frame({ gameScores: [ 32, 60, 140, 80 ] }), LINEUP, 0), undefined, "equal is allowed");
  assert.equal(partnerRuleBreach(frame(), LINEUP, 3), undefined, "a bot's checkout can't be undone, so the rule leaves it");
  assert.equal(partnerRuleBreach(frame({ variant: "Cricket" }), LINEUP, 0), undefined);
  const three = { at: 1, teams: [ RED, { ...BLUE, seatIds: [ "b1" ] }, { name: "G", colour: ocean, seatIds: [ "b2" ] } ] };
  assert.equal(partnerRuleBreach(frame(), three, 0), undefined, "only with exactly two teams");
  const solo = { at: 1, teams: [ RED, { ...BLUE, seatIds: [ "b1" ] } ] };
  assert.equal(partnerRuleBreach(frame(), solo, 0), undefined, "only when every seat is on one of them");
});

test("teamView leaves a frame alone unless a team decides the match or the rule busts a checkout", () => {
  const context = { enabled: true, partnerRule: true, lineup: LINEUP };
  const plain = frame();
  assert.equal(teamView(plain, context), plain);
  assert.equal(teamView(frame({ gameWinner: 0 }), { ...context, enabled: false }).gameWinner, 0);
  assert.equal(teamView(frame({ gameWinner: 0 }), { ...context, lineup: undefined }).gameWinner, 0, "a frame whose match has no lineup is not ours");
});

test("teamView: the leg that takes a team to its target reads as the match won", () => {
  const won = frame({ gameWinner: 2, gameFinished: true, gameScores: [ 32, 60, 0, 80 ], scores: [ { sets: 0, legs: 1 }, { sets: 0, legs: 0 }, { sets: 0, legs: 2 }, { sets: 0, legs: 1 } ] });
  const view = teamView(won, { enabled: true, partnerRule: true, lineup: LINEUP });
  assert.equal(view.winner, 2);
  assert.deepEqual(view.adtTeams, { decided: "TEAM RED", legs: { "TEAM RED": 3, "TEAM BLUE": 1 } });
  assert.equal(teamView({ ...won, winner: 2, finished: true }, { enabled: true, partnerRule: false, lineup: LINEUP }).winner, 2, "the site's own match win stays");
});

test("teamView: a checkout against the partner rule reads as a bust, its points and its leg taken back", () => {
  const checkout = frame({
    gameWinner: 0, gameFinished: true, gameScores: [ 0, 60, 160, 80 ],
    scores: [ { sets: 0, legs: 2 }, { sets: 0, legs: 0 }, { sets: 0, legs: 1 }, { sets: 0, legs: 1 } ],
    turns: [ { points: 32, busted: false, throws: [ { id: "d1" }, { id: "d2" } ] } ],
  });
  const view = teamView(checkout, { enabled: true, partnerRule: true, lineup: LINEUP });
  assert.equal(view.gameWinner, -1);
  assert.equal(view.gameFinished, false);
  assert.equal(view.turnBusted, true);
  assert.equal(view.turns[0].busted, true);
  assert.deepEqual(view.gameScores, [ 32, 60, 160, 80 ]);
  assert.equal(view.scores[0].legs, 1);
  assert.equal(view.adtTeams?.decided, undefined, "a bust decides nothing");
  assert.deepEqual(view.adtTeams?.bust, { seat: 0, dartIds: [ "d1", "d2" ], breach: partnerRuleBreach(checkout, LINEUP, 0) });
  assert.equal(checkout.gameWinner, 0, "the frame itself is left as it was");
  assert.equal(teamView(checkout, { enabled: true, partnerRule: false, lineup: LINEUP }).gameWinner, 0, "with the rule off, it stands");
});

test("assignCards: by name, and where seats share one, by seat order, throwing order, or whoever is up", () => {
  const twin = [ seat("x", "ANNA", 0), seat("y", "Bot Level 5", 1, 60), seat("z", "TOM", 2), seat("w", "Bot Level 5", 3, 60) ];
  const rotated = [ twin[1], twin[2], twin[3], twin[0] ];
  const full = [ "ANNA", "Bot Level 5", "TOM", "Bot Level 5" ].map(name => ({ name, small: false }));
  assert.deepEqual(assignCards(full, rotated, 0), [ 3, 0, 1, 2 ], "the wide and sidebar layouts draw cards in seat order");
  const small = [ "Bot Level 5", "TOM", "Bot Level 5", "ANNA" ].map(name => ({ name, small: true }));
  assert.deepEqual(assignCards([ ...small, { name: "Bot Level 5", small: false } ], rotated, 2), [ 0, 1, 2, 3, 2 ], "the top bar is in throwing order, and the stacked card is whoever is up");
  assert.deepEqual(assignCards([ { name: "NOBODY", small: false } ], rotated, 0), [ -1 ]);
});

test("the texts", () => {
  const breach = { player: "ANNA", teammate: "TOM", teammateLeft: 160, opponentsLeft: 140, opponents: [ "BEN", "BOT LEVEL 5" ] };
  assert.equal(warningText(breach), "No checkout this visit: TOM has 160 left, more than BEN and BOT LEVEL 5 together (140)");
  assert.equal(bustText(breach), "ANNA's checkout didn't count: partner rule.");
  assert.equal(decidedText("TEAM RED"), "TEAM RED wins the match");
  assert.equal(resultText({ "TEAM RED": 3, "TEAM BLUE": 1 }, "TEAM RED", LINEUP), "3 – 1");
});
```

- [ ] **Step 2: Run it and see it fail.**

Run: `cd $SCR/tests && /Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/node_modules/.bin/tsx --tsconfig /Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/tsconfig.json --test teams-match.test.mts`
Expected: FAIL: `does not provide an export named 'assignCards'`.

- [ ] **Step 3: Append to `utils/teams.ts`:**

```ts
/** The part of a match frame the team rules read: {@link IMatch} fits it. */
export interface TeamMatch extends TurnState {
  id?: string;
  /** "First to N legs". */
  legs?: number | null;
  sets?: number | null;
  scores?: readonly { legs: number; sets: number }[] | null;
  gameScores?: readonly number[];
  gameWinner?: number;
  winner?: number;
  gameFinished?: boolean;
  turnBusted?: boolean;
  turns?: readonly { points?: number; busted?: boolean; throws?: readonly { id: string }[] }[];
  adtTeams?: AdtTeams;
}

/** A checkout the partner rule stops, with the scores that stop it. */
export interface Breach {
  player: string;
  teammate: string;
  teammateLeft: number;
  opponentsLeft: number;
  opponents: string[];
}

/** What {@link teamView} adds to a frame it changes. */
export interface AdtTeams {
  /** The team this won leg took to its target. */
  decided?: string;
  /** Every team's legs, with this leg in. */
  legs?: Record<string, number>;
  /** A checkout the partner rule turned into a bust: who threw it, and the visit's darts to undo. */
  bust?: { seat: number; dartIds: string[]; breach: Breach };
}

export interface TeamViewContext {
  enabled: boolean;
  partnerRule: boolean;
  /** The frame's own match's lineup, looked up by the frame's id. */
  lineup: Lineup | undefined;
}

/** A card as the match screen shows it: its name, and whether it is a top-bar cell. */
export interface CardInfo {
  name: string;
  small: boolean;
}

/** The own-score team of each seat, by its index in `players`, found by seat id. */
export function lineupTeams(players: readonly SeatLike[], lineup: Lineup | undefined): Map<number, LineupTeam> {
  const out = new Map<number, LineupTeam>();
  if (!lineup) return out;
  players.forEach((seat, index) => {
    const team = seat.id ? lineup.teams.find(candidate => candidate.seatIds.includes(seat.id!)) : undefined;
    if (team) out.set(index, team);
  });
  return out;
}

/** Every team's legs: its members' legs added up. `scores` is in the same order as `players`. */
export function teamLegs(match: TeamMatch, lineup: Lineup | undefined): Record<string, number> {
  const legs: Record<string, number> = {};
  if (!lineup) return legs;
  for (const team of lineup.teams) legs[team.name] = 0;
  lineupTeams(match.players ?? [], lineup).forEach((team, index) => {
    legs[team.name] += match.scores?.[index]?.legs ?? 0;
  });
  return legs;
}

/** The team whose legs have reached the match's "First to N", if any. Legs only: the site counts sets per player. */
export function decidedTeam(match: TeamMatch, lineup: Lineup | undefined): string | undefined {
  const target = match.legs ?? 0;
  if (!lineup || target < 1 || match.sets) return undefined;
  const legs = teamLegs(match, lineup);
  return lineup.teams.find(team => (legs[team.name] ?? 0) >= target)?.name;
}

/**
 * Whether a checkout by `seat` breaks the e-darts partner rule: in X01, with
 * exactly two own-score teams and every seat on one of them, a human player
 * may not check out while a teammate has more left than the other team's
 * players together. Scores are as they stand: during a visit only the
 * thrower's changes, so everyone else's are what they were at its start.
 */
export function partnerRuleBreach(match: TeamMatch, lineup: Lineup | undefined, seat: number): Breach | undefined {
  if (match.variant !== "X01" || lineup?.teams.length !== 2) return undefined;
  const players = match.players ?? [];
  const seats = lineupTeams(players, lineup);
  if (seats.size !== players.length) return undefined;
  const own = seats.get(seat);
  if (!own || players[seat]?.cpuPPR) return undefined;

  const scores = match.gameScores ?? [];
  const opponents: string[] = [];
  let opponentsLeft = 0;
  let teammate: { index: number; left: number } | undefined;
  players.forEach((player, index) => {
    const left = scores[index] ?? 0;
    if (seats.get(index)?.name !== own.name) {
      opponentsLeft += left;
      opponents.push(normalizeName(player.name));
    } else if (index !== seat && (!teammate || left > teammate.left)) {
      teammate = { index, left };
    }
  });
  if (!teammate || teammate.left <= opponentsLeft) return undefined;
  return { player: normalizeName(players[seat]?.name), teammate: normalizeName(players[teammate.index]?.name), teammateLeft: teammate.left, opponentsLeft, opponents };
}

/**
 * A frame as the team rules see it, for every feature that reads game data:
 * a won leg that takes an own-score team to its target reads as the match won,
 * and a checkout against the partner rule (when it is on) as a bust, with the
 * visit's points and the leg taken back. Anything else is returned as it came.
 * The frame itself is never changed.
 */
export function teamView<M extends TeamMatch>(match: M, context: TeamViewContext): M {
  if (!context.enabled || !context.lineup) return match;
  const winner = match.gameWinner ?? -1;
  if (winner < 0) return match;

  const breach = context.partnerRule ? partnerRuleBreach(match, context.lineup, winner) : undefined;
  const visit = match.turns?.[0];
  if (breach && visit) {
    const gameScores = [ ...(match.gameScores ?? []) ];
    gameScores[winner] = (gameScores[winner] ?? 0) + (visit.points ?? 0);
    const scores = match.scores ? match.scores.map((score, index) => index === winner ? { ...score, legs: Math.max(0, score.legs - 1) } : score) : match.scores;
    return {
      ...match,
      gameWinner: -1,
      gameFinished: false,
      turnBusted: true,
      gameScores,
      scores,
      turns: [ { ...visit, busted: true }, ...(match.turns ?? []).slice(1) ],
      adtTeams: { bust: { seat: winner, dartIds: (visit.throws ?? []).map(dart => dart.id), breach } },
    } as M;
  }

  const decided = decidedTeam(match, context.lineup);
  if (!decided) return match;
  return {
    ...match,
    winner: (match.winner ?? -1) >= 0 ? match.winner : winner,
    adtTeams: { decided, legs: teamLegs(match, context.lineup) },
  } as M;
}

/**
 * Which seat each card shows, by index into `players`, or -1. Cards carry only
 * a name ([[match-players-rotates-every-leg]]). Where seats share one (two bots
 * of one level), the rule depends on the card:
 *   - the wide and sidebar layouts draw full cards in seat order (`index`)
 *   - the top bar's small cells come in throwing order, which is `players`'s
 *   - a single full card among small ones is the stacked layout's card of
 *     whoever is up
 */
export function assignCards(cards: readonly CardInfo[], players: readonly SeatLike[], up: number): number[] {
  const byName = new Map<string, number[]>();
  players.forEach((player, index) => {
    const name = normalizeName(player.name);
    byName.set(name, [ ...(byName.get(name) ?? []), index ]);
  });
  const stackedCard = cards.some(card => card.small) && cards.filter(card => !card.small).length === 1;
  const taken = new Map<string, number>();
  return cards.map((card) => {
    const name = normalizeName(card.name);
    const seats = byName.get(name) ?? [];
    if (seats.length <= 1) return seats[0] ?? -1;
    if (!card.small && stackedCard) return seats.includes(up) ? up : -1;
    const key = `${card.small ? "small" : "full"}|${name}`;
    const nth = taken.get(key) ?? 0;
    taken.set(key, nth + 1);
    const ordered = card.small ? seats : [ ...seats ].sort((a, b) => (players[a].index ?? a) - (players[b].index ?? b));
    return ordered[nth] ?? -1;
  });
}

/** The pill once a team has won. */
export function decidedText(team: string): string {
  return `${team} wins the match`;
}

/** The result beside it: the winner's legs first, then the others', in the lineup's order. */
export function resultText(legs: Record<string, number>, decided: string, lineup: Lineup): string {
  const others = lineup.teams.filter(team => team.name !== decided).map(team => legs[team.name] ?? 0);
  return [ legs[decided] ?? 0, ...others ].join(" – ");
}

/** The line under the pill while the partner rule stops the player up from checking out. */
export function warningText(breach: Breach): string {
  return `No checkout this visit: ${breach.teammate} has ${breach.teammateLeft} left, more than ${joinNames(breach.opponents)} together (${breach.opponentsLeft})`;
}

/** The line after a checkout the rule turned into a bust. */
export function bustText(breach: Breach): string {
  return `${breach.player}'s checkout didn't count: partner rule.`;
}
```

- [ ] **Step 4: Run all three test files and see them pass.**

Run: `cd $SCR/tests && /Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/node_modules/.bin/tsx --tsconfig /Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/tsconfig.json --test teams-match.test.mts teams-own.test.mts teams.test.mts config-renames.test.mts`
Expected: `# fail 0`.

- [ ] **Step 5: Type-check, lint and commit.**

Run: `yarn compile 2>&1 | grep -c "error TS"` and `npx eslint utils/teams.ts`.
Expected: 14, and no findings.

```bash
git add utils/teams.ts
git commit -m "feat: team legs, the partner rule, the team view and card seats for own scores"
```

---

### Task 3: The team view, where game data is stored

**Files:**
- Modify: `utils/websocket-helpers.ts` (`IMatch.adtTeams`, the team view in `processWebSocketMessage`)
- Modify: `entrypoints/match.content/automatic-next-leg.ts` (`legIsWon`)
- Modify: `entrypoints/match.content/caller.ts` (the team's name at a team's matchshot)
- Create: `$SCR/live/lineup.mjs`

**Interfaces:**
- Consumes: `teamView`, `lineupOf`, `normalizeTeams`, `type AdtTeams`, `type LineupStore` (Tasks 1–2), and `AutodartsToolsTeamLineups` (Task 1).
- Produces:
  - stored game data where `match.adtTeams` is set on a team's deciding leg and on a partner-rule bust
  - `IMatch.adtTeams?: AdtTeams`

- [ ] **Step 1: A live test that fails first.** Write `$SCR/live/lineup.mjs`, which sets or clears a lineup through the service worker:

```js
// lineup.mjs set <lobbyId> <json teams> | clear — writes local:teams-lineups through the service worker.
import { toolsWorker, evaluate } from "./cdp.mjs";
const [ cmd, id, json ] = process.argv.slice(2);
const { session } = await toolsWorker();
if (cmd === "set") {
  console.log(await evaluate(session, `chrome.storage.local.get("teams-lineups").then(async v => { const s = v["teams-lineups"] || {}; s[${JSON.stringify(id)}] = { at: Date.now(), teams: ${json} }; await chrome.storage.local.set({ "teams-lineups": s }); return JSON.stringify(s[${JSON.stringify(id)}]); })`));
} else if (cmd === "clear") {
  console.log(await evaluate(session, `chrome.storage.local.remove("teams-lineups").then(() => "cleared")`));
}
session.close();
```

Then:
- Switch Teams on: `node storage.mjs set teams.enabled true`
- Switch WLED off: `node storage.mjs set-wled off`
- Create a 121 X01 lobby with legs 2 and four guests in the order ANNA, TOM, BEN, MIA. Get their seat ids with `GET /gs/v0/lobbies/{id}`, and start it.
- `node lineup.mjs set <id> '[{"name":"TEAM RED","colour":{"preset":"crimson","from":"#6a1624","to":"#b8323f"},"seatIds":["<ANNA>","<TOM>"]},{"name":"TEAM BLUE","colour":{"preset":"ocean","from":"#374c98","to":"#0b55df"},"seatIds":["<BEN>","<MIA>"]}]'`
- Load the match in my tab, with `adt:last-visited-url` set home.
- Play:
  - ANNA wins leg 1 (`M=<id> node play.mjs win`: T20 T20 S1), then `nextgame`.
  - The site rotates the seats, so leg 2 opens with TOM: `win` again.
  - Read the stored game data: `node storage.mjs get game-data`, looking at `match.winner` and `match.adtTeams`.

Expected before the change: `winner` is `-1` and there's no `adtTeams`, with TEAM RED at 2 legs.

- [ ] **Step 2: `utils/websocket-helpers.ts`.**
  - Add the imports:

```ts
import type { AdtTeams, LineupStore } from "@/utils/teams";

import { AutodartsToolsConfig, AutodartsToolsTeamLineups } from "@/utils/storage";
import { lineupOf, normalizeTeams, teamView } from "@/utils/teams";
```
  - In `IMatch`, add after `chalkboards?: IChalkboard[];`:

```ts
  /** Set by Teams' team view (utils/teams.ts) on a frame it changed: not the server's. */
  adtTeams?: AdtTeams;
```
  - Above `processWebSocketMessage`, add:

```ts
/**
 * Teams' settings and own-score lineups, for the team view: read once, then
 * kept current by watchers, so storing a frame waits on nothing after the first.
 */
let teamsContext: { enabled: boolean; partnerRule: boolean; lineups: LineupStore } | undefined;
let teamsContextLoad: Promise<void> | undefined;

function loadTeamsContext(): Promise<void> {
  teamsContextLoad ??= (async () => {
    const [ config, lineups ] = await Promise.all([ AutodartsToolsConfig.getValue(), AutodartsToolsTeamLineups.getValue() ]);
    const teams = normalizeTeams(config?.teams);
    teamsContext = { enabled: teams.enabled, partnerRule: teams.partnerRule, lineups: lineups ?? {} };
    AutodartsToolsConfig.watch((next) => {
      const nextTeams = normalizeTeams(next?.teams);
      if (!teamsContext) return;
      teamsContext.enabled = nextTeams.enabled;
      teamsContext.partnerRule = nextTeams.partnerRule;
    });
    AutodartsToolsTeamLineups.watch((next) => {
      if (teamsContext) teamsContext.lineups = next ?? {};
    });
  })();
  return teamsContextLoad;
}

/**
 * The match as Teams' rules see it (utils/teams.ts): an own-score team's
 * deciding leg as the match won, a partner-rule checkout as a bust. Every
 * feature reads game data from here, so none of them needs team code. The
 * lineup is the frame's own match's, whatever page this tab is on.
 */
function asTeamsSee(match: IMatch): IMatch {
  if (!teamsContext) return match;
  return teamView(match, { enabled: teamsContext.enabled, partnerRule: teamsContext.partnerRule, lineup: lineupOf(teamsContext.lineups, match.id) });
}
```
  - In the `autodarts.matches` case, add `await loadTeamsContext();` right after `const gameData = await AutodartsToolsGameData.getValue();`. In the "Replace entire match data" branch, store `match: asTeamsSee(data as IMatch),`.

- [ ] **Step 3: `entrypoints/match.content/automatic-next-leg.ts`.** Replace `legIsWon`:

```ts
/**
 * A leg is won, and the match goes on. Teams' team view marks the match won
 * when an own-score team's legs reach the target while the site's own match is
 * still open (utils/teams.ts), and Next Leg must stay unpressed then.
 */
function legIsWon(): boolean {
  return (gameData?.match?.gameWinner ?? -1) >= 0 && (gameData?.match?.winner ?? -1) < 0;
}
```

- [ ] **Step 4: `entrypoints/match.content/caller.ts`.** The X01 winner block (near l.711) and the Cricket one (near l.778) play the winner's name with the same seven lines, from `const winnerPlayer = …` to the closing `}` of `else if (winnerPlayerName)`. Replace them in both blocks with:

```ts
      // An own-score team's deciding leg is the team's match (utils/teams.ts):
      // call the team, not the player who happened to check out.
      const decidedTeam = gameData.match.adtTeams?.decided;
      const winnerPlayer = gameData.match.players?.find(player => player.index === gameData.match?.winner);
      const winnerPlayerName = winnerPlayer?.name;
      const isBot = !!winnerPlayer?.cpuPPR;

      if (decidedTeam) {
        for (const trigger of nameTriggers([ decidedTeam ]) ?? []) playSound(trigger);
      } else if (isBot) {
        playSound("bot");
      } else if (winnerPlayerName) {
        playSound(winnerPlayerName.toLowerCase());
      }
```

- [ ] **Step 5: Run the live test again.** First park my tab at `about:blank` and wait for the match and content bundles to rebuild: poll `.output/chrome-mv3-dev/content-scripts/match.js` for the string `adtTeams`. Then repeat Step 1 in a fresh match.

Expected:
- after TOM's winning leg, `match.winner` is his index in that leg's `players`, and `match.adtTeams` is `{ decided: "TEAM RED", legs: { "TEAM RED": 2, "TEAM BLUE": 0 } }`
- the site's own state (`node state.mjs <id>`) still says `finished: false`

Then check the partner rule's view:
- Set `node storage.mjs set teams.partnerRule true`.
- In a new match with the same seats (turn order ANNA, TOM, BEN, MIA, since nothing reorders seats before Task 4), bring the scores to ANNA 118, TOM 118, BEN 61, MIA 1:
  - ANNA `low` (S1×3 and next)
  - TOM `low`
  - BEN `sixty` (S20×3 and next)
  - MIA: T20, T20 through `api.mjs POST /gs/v0/matches/<id>/throws`, then `POST /gs/v0/matches/<id>/players/next`
- Then ANNA throws T20 T19 S1 (`win118`). TOM's 118 is more than BEN's 61 and MIA's 1 together.

Expected: the stored frame has `gameWinner: -1`, `turns[0].busted: true`, ANNA's `gameScores` entry back at 118, and `adtTeams.bust.dartIds` holding three ids. The server still has the checkout (Task 7 does the undo).

- [ ] **Step 6: Build and commit.** `yarn build` catches a module cycle through the websocket monitor's entrypoint ([[wxt-entrypoint-graph-is-tree-shaken]]), and `yarn build:firefox` must pass too. Also run `yarn compile` (14) and ESLint per file.

```bash
git add utils/websocket-helpers.ts entrypoints/match.content/automatic-next-leg.ts entrypoints/match.content/caller.ts
git commit -m "feat: game data as Teams sees it: a team's deciding leg is the match, a partner-rule checkout a bust"
```

---

### Task 4: The lobby follows its lineup: member rows, turn order and the uneven note

**Files:**
- Modify: `entrypoints/lobby.content/teams.ts`
- Modify: `utils/lobby-guests.ts` (`addBot`, `moveSeat`)

**Interfaces:**
- Consumes: `lineupOf`, `withLineup`, `pruneLineup`, `interleave`, `seatMoves`, `unevenText`, `type Lineup`, `type LineupStore`, `type LineupTeam` (Task 1), and `AutodartsToolsTeamLineups`.
- Produces:
  - `addBot(name: string, ppr: number, feature: string): Promise<boolean>`
  - `moveSeat(index: number, toIndex: number, feature: string): Promise<boolean>`
  - in the lobby script: `lineups: LineupStore`, `nextLobbyUpdate(): Promise<void>`, `writeLineupTeam(team: LineupTeam): Promise<void>`, and `addEditButton(row, label, onEdit)` (the new signature)

- [ ] **Step 1: A live test that fails first.**
  - Create a lobby with the guests ANNA, TOM, BEN, MIA in that order. Load it in my tab with Teams on.
  - Write the lineup `TEAM RED [ANNA, TOM]`, `TEAM BLUE [BEN, MIA]` with `lineup.mjs`.
  - Read the seat order with `GET /gs/v0/lobbies/{id}`, and count `.adt-team-label` in the page (`count.mjs`, extended to print `labels`).

  Expected before the change: the order stays ANNA, TOM, BEN, MIA, with no labels.

- [ ] **Step 2: `utils/lobby-guests.ts`.** Append:

```ts
/** Add a bot at a level (the site's cpuPPR) to the lobby on screen, with the site's own bot request. */
export async function addBot(name: string, ppr: number, feature: string): Promise<boolean> {
  const lobbyId = lobbyIdFromUrl();
  if (!lobbyId) return false;
  try {
    const response = await fetchWithAuth(`https://api.autodarts.com/gs/v0/lobbies/${lobbyId}/players`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, userId: null, cpuPPR: ppr }),
    });
    if (!response.ok) console.error(`Autodarts Tools: ${feature} - Failed to add a bot`, response.status, response.statusText);
    return response.ok;
  } catch (error) {
    console.error(`Autodarts Tools: ${feature} - Error adding a bot:`, error);
    return false;
  }
}

/** Move one seat of the lobby on screen, as the site's drag does. */
export async function moveSeat(index: number, toIndex: number, feature: string): Promise<boolean> {
  const lobbyId = lobbyIdFromUrl();
  if (!lobbyId) return false;
  try {
    const response = await fetchWithAuth(`https://api.autodarts.com/gs/v0/lobbies/${lobbyId}/players/move/to-index`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ index, toIndex }),
    });
    if (!response.ok) console.error(`Autodarts Tools: ${feature} - Failed to move a seat`, response.status, response.statusText);
    return response.ok;
  } catch (error) {
    console.error(`Autodarts Tools: ${feature} - Error moving a seat:`, error);
    return false;
  }
}
```

- [ ] **Step 3: `entrypoints/lobby.content/teams.ts`. Its state and the lineup watcher.**
  - Add to the imports:
    - from `@/utils/storage`: `AutodartsToolsTeamLineups`
    - from `@/utils/lobby-guests`: `addBot` and `moveSeat` (`addBot` is used in Task 5)
    - the `@/utils/teams` names this task uses: `interleave`, `lineupOf`, `pruneLineup`, `seatMoves`, `sharedTeams`, `unevenText`, `withLineup`, and `type Lineup`, `type LineupStore`, `type LineupTeam`
  - Add the constants `const NOTE_ID = "adt-team-note";`, `const MAX_REORDER_MOVES = 6;` and `const LOBBY_WAIT_MS = 3000;`.
  - Add these state variables:

```ts
let lineups: LineupStore = {};
let unwatchLineups: (() => void) | null = null;
/** One reorder at a time: the moves it makes come back as lobby updates. */
let reordering = false;
/** Resolved on the next lobby update: the moves and the adds wait on it. */
let lobbyWaiters: (() => void)[] = [];
```
  - In `teams()`:
    - after `lobby = currentLobby(...)`, add `lineups = (await AutodartsToolsTeamLineups.getValue()) ?? {};`
    - in the lobby watcher, after `lobby = currentLobby(value);`, add `for (const done of lobbyWaiters.splice(0)) done();`
    - add a watcher:

```ts
  unwatchLineups?.();
  unwatchLineups = AutodartsToolsTeamLineups.watch((value?: LineupStore) => {
    lineups = value ?? {};
    schedule();
  });
```
  - In `onRemove`, add `unwatchLineups?.(); unwatchLineups = null;`, `document.getElementById(NOTE_ID)?.remove();` and `for (const done of lobbyWaiters.splice(0)) done();`.
  - Add the helpers:

```ts
/** This lobby's own-score lineup, if it has one. */
function currentLineup(): Lineup | undefined {
  return lobby ? lineupOf(lineups, lobby.id) : undefined;
}

/** The next lobby update, or a few seconds, whichever comes first. */
function nextLobbyUpdate(): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, LOBBY_WAIT_MS);
    lobbyWaiters.push(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function writeLineup(teams: readonly LineupTeam[]) {
  if (!lobby) return;
  lineups = withLineup(lineups, lobby.id, teams, Date.now());
  await AutodartsToolsTeamLineups.setValue(lineups);
}

/** A team written into this lobby's lineup: an edited team keeps its place, a new one goes last. */
async function writeLineupTeam(team: LineupTeam) {
  const teams = [ ...(currentLineup()?.teams ?? []) ];
  const index = teams.findIndex(other => other.name === team.name);
  if (index >= 0) teams.splice(index, 1, team);
  else teams.push(team);
  await writeLineup(teams);
}
```

- [ ] **Step 4: `apply`, the pruning and the turn order.**

```ts
function apply() {
  syncButton();
  const lineup = currentLineup();
  if (lineup) {
    pruneSeats(lineup);
    dressOwnRows(lineup);
    keepOrder(lineup).catch(e => console.error(e));
  } else {
    dressRows();
  }
  noteUneven(lineup);
}

/** A seat that left the lobby leaves its team. */
function pruneSeats(lineup: Lineup) {
  const ids = (lobby?.players ?? []).map(seat => seat.id).filter((id): id is string => Boolean(id));
  const pruned = pruneLineup(lineup.teams, ids);
  if (JSON.stringify(pruned) === JSON.stringify(lineup.teams)) return;
  writeLineup(pruned).catch(e => console.error(e));
}

/**
 * The seats in turn order (utils/teams.ts `interleave`). One move at a time,
 * each waiting for the lobby update it brings, from the order as it then
 * stands, so a drag or a Shuffle in between is taken as it is. Bounded, and
 * it stops at the first move the site refuses. Not while the drawer is open:
 * the drawer is about to change the teams.
 */
async function keepOrder(lineup: Lineup) {
  if (reordering || drawerUi || opening || !isHost()) return;
  const teamOf = (id: string) => lineup.teams.find(team => team.seatIds.includes(id))?.name;
  const order = () => (lobby?.players ?? []).map(seat => seat.id ?? "");
  if (order().some(id => !id) || interleave(order(), teamOf).join() === order().join()) return;

  reordering = true;
  try {
    for (let moves = 0; moves < MAX_REORDER_MOVES; moves++) {
      const current = order();
      const [ move ] = seatMoves(current, interleave(current, teamOf));
      if (!move) break;
      const updated = nextLobbyUpdate();
      if (!await moveSeat(move.index, move.toIndex, "Teams")) break;
      await updated;
    }
  } finally {
    reordering = false;
  }
}
```

- [ ] **Step 5: Member rows and the note.**
  - Add to `LOBBY_CSS`:

```css
  .adt-team-label {
    display: inline-flex; align-items: center; gap: 6px; height: 22px; padding: 0 10px 0 8px;
    border-radius: 999px; background: rgb(255 255 255 / 8%); color: #f7f8fa;
    font-size: 11px; font-weight: 800; line-height: 1; letter-spacing: .02em; flex-basis: auto;
  }
  .adt-team-label i { width: 10px; height: 10px; border-radius: 3px; background: linear-gradient(to right, var(--adt-team-from), var(--adt-team-to)); }
  .adt-team-label small { font-size: 11px; font-weight: 700; color: rgb(247 248 250 / 55%); }
  [${ROW_ATTR}] > div:has(> .adt-team-label) { flex-wrap: wrap; }
  #${NOTE_ID} { margin: 4px 0 12px; font-size: 12px; font-weight: 600; color: #a1a1a1; }
```
  - Change `addEditButton` to take what it opens, and pass the shared rows' lookup where it's called from `dress`:

```ts
/** A copy of the row's own ✕, so it sits and hovers like the site's buttons, before the first of them. */
function addEditButton(row: HTMLElement, label: string, onEdit: () => void) {
  const remove = qs<HTMLButtonElement>(SELECTORS.lobby.playerRemoveButton, row);
  if (!remove) return;

  const edit = remove.cloneNode(false) as HTMLButtonElement;
  edit.classList.add("adt-team-edit");
  edit.type = "button";
  edit.disabled = false;
  edit.title = "Edit team";
  edit.setAttribute("aria-label", `Edit ${label}`);
  edit.innerHTML = ICON_EDIT;
  edit.addEventListener("click", (event) => {
    event.stopPropagation();
    onEdit();
  });
  const firstButton = [ ...row.children ].find(child => child.matches("button[data-slot='button']")) ?? remove;
  firstButton.before(edit);
}
```

In `dress`, the call becomes:

```ts
  if (!row.querySelector(".adt-team-edit")) {
    addEditButton(row, team.name, () => {
      const current = findTeam(sharedTeams(saved), normalizeName(qs(SELECTORS.lobby.playerNameInRow, row)?.textContent));
      if (current) openDrawer(current);
    });
  }
```
  - Add `row.querySelector(".adt-team-label")?.remove();` to `undress`.
  - Add the member rows. Rows come in seat order, so row `i` is `lobby.players[i]`, which is how two bots of one level are told apart:

```ts
function dressOwnRows(lineup: Lineup) {
  const seats = lobby?.players ?? [];
  qsa<HTMLElement>(SELECTORS.lobby.playerRows).forEach((row, index) => {
    const seatId = seats[index]?.id;
    const team = seatId ? lineup.teams.find(candidate => candidate.seatIds.includes(seatId)) : undefined;
    if (!team || !seatId) {
      if (row.hasAttribute(ROW_ATTR)) undress(row);
      return;
    }
    const place = team.seatIds.indexOf(seatId) + 1;
    const key = `own|${team.name}|${place}|${team.seatIds.length}|${team.colour.from}|${team.colour.to}`;
    if (row.getAttribute(ROW_ATTR) !== key || !row.querySelector(".adt-team-label")) {
      row.setAttribute(ROW_ATTR, key);
      row.style.setProperty("--adt-team-from", team.colour.from);
      row.style.setProperty("--adt-team-to", team.colour.to);
      row.querySelector(".adt-team-order")?.remove();
      row.querySelector(".adt-team-label")?.remove();
      qs<HTMLElement>(SELECTORS.lobby.playerNameColumn, row)?.append(teamLabel(team, place));
    }
    if (!row.querySelector(".adt-team-edit")) addEditButton(row, team.name, () => openOwnEditor(team.name));
  });
}

function teamLabel(team: LineupTeam, place: number): HTMLElement {
  const label = document.createElement("span");
  label.className = "adt-team-label";
  const swatch = document.createElement("i");
  swatch.setAttribute("aria-hidden", "true");
  const count = document.createElement("small");
  count.textContent = `${place} of ${team.seatIds.length}`;
  label.append(swatch, team.name, count);
  return label;
}

/** Under the players when the teams aren't the same size: the bigger team throws more often. */
function noteUneven(lineup: Lineup | undefined) {
  const text = lineup ? unevenText(lineup.teams) : "";
  let note = document.getElementById(NOTE_ID);
  if (!text) {
    note?.remove();
    return;
  }
  const buttons = qs<HTMLElement>(SELECTORS.lobby.addPlayerButton)?.parentElement;
  if (!buttons) return;
  if (!note) {
    note = document.createElement("p");
    note.id = NOTE_ID;
  }
  if (note.textContent !== text) note.textContent = text;
  if (buttons.previousElementSibling !== note) buttons.before(note);
}
```
  - Until Task 5, `openOwnEditor` is a stub: `function openOwnEditor(_name: string) {}`, marked `// Task 5`.

- [ ] **Step 6: Run the live test again.** Park my tab first, wait for `lobby.js` to rebuild, then repeat Step 1.

  Expected:
  - Within a few seconds the order is ANNA, BEN, TOM, MIA.
  - There are four `.adt-team-label`s reading `TEAM RED 1 of 2`, `TEAM BLUE 1 of 2`, `TEAM RED 2 of 2`, `TEAM BLUE 2 of 2`.
  - Add a guest LEA and put her in TEAM RED's lineup (rewrite it with `lineup.mjs`). The note then reads `TEAM RED has 3 players and TEAM BLUE 2: the bigger team throws more often each round.`, and the order is ANNA, BEN, TOM, MIA, LEA.

- [ ] **Step 7: Review Focus 1: a lobby that changes under the reorder.**
  - Log each `move/to-index` the page makes: arm a `PerformanceObserver` for `resource` entries in my tab, filtered on `move/to-index`.
  - Press Shuffle (`POST /players/shuffle`) three times, one second apart.
  - During a reorder, move a seat with `POST /players/move/to-index {"index":0,"toIndex":3}`.

  Expected:
  - After each change the seats end alternating: no two neighbours on one team while the other team still has seats to place.
  - The extension makes at most 6 moves per change.
  - Nothing more is logged once the lobby settles.
  - Remove a seat (`DELETE /players/by-index/{i}`), and the lineup in storage loses its id.

- [ ] **Step 8: Lint, the SFC check, compile and commit.**

```bash
git add entrypoints/lobby.content/teams.ts utils/lobby-guests.ts
git commit -m "feat: the lobby keeps own-score teams in turn order and shows who plays for whom"
```

---

### Task 5: Own scores in the Add Team drawer, and saved own-score teams

**Files:**
- Modify: `entrypoints/lobby.content/AddTeamDrawer.vue`
- Modify: `entrypoints/lobby.content/teams.ts`
- Modify: `utils/websocket-helpers.ts` (`ILobbies.legs`, `ILobbies.sets`)

**Interfaces:**
- Consumes: `checkOwnTeam`, `rejoinSlots`, `resolveSlots`, `memberOf`, `lobbyFormat`, `joinNames`, `withFreeColour`, `type OwnDraft`, `type SeatSlot`, `type TeamFormat` (Task 1), and `addBot`, `writeLineupTeam`, `nextLobbyUpdate` (Task 4).
- Produces:
  - `DrawerState` gains `lockedFormat: TeamFormat | undefined`, `formatTeam: string`, `setsLobby: boolean`, `legs: number`, `seats: SeatChoice[]`, `editingSeats: string[]` and `submitOwn(draft: OwnDraft)`
  - `interface SeatChoice { id: string; name: string; kind: "guest" | "account" | "bot"; team?: string }`

- [ ] **Step 1: A live test that fails first.** In a lobby with Teams on and two guests (ANNA, TOM), open the drawer and read its shadow root for `button` elements whose text is `Own scores`.
Expected: none.

- [ ] **Step 2: `utils/websocket-helpers.ts`.** Add to `ILobbies`:

```ts
  /** "First to N legs". */
  legs?: number | null;
  /** Sets to win, or null in a legs match. */
  sets?: number | null;
```

- [ ] **Step 3: `entrypoints/lobby.content/teams.ts`.**
  - Extend `DrawerState`:

```ts
  /** The lobby's format once it has a team; the tabs keep to it. */
  lockedFormat: TeamFormat | undefined;
  /** The team that set it, for the tabs' note. */
  formatTeam: string;
  /** A lobby playing sets can't have own-score teams. */
  setsLobby: boolean;
  /** The lobby's "First to N legs", for the drawer's own-scores line. */
  legs: number;
  /** Every seat, for Own scores' In this lobby. */
  seats: SeatChoice[];
  /** The seats of the own-score team being edited, in order. */
  editingSeats: string[];
  submitOwn: (draft: OwnDraft) => Promise<string | undefined>;
```
  - Export the type:

```ts
export interface SeatChoice {
  id: string;
  name: string;
  kind: "guest" | "account" | "bot";
  /** The other own-score team this seat is on. */
  team?: string;
}
```
  - Initialise the new fields in `drawer`: `lockedFormat: undefined, formatTeam: "", setsLobby: false, legs: 0, seats: [], editingSeats: [], submitOwn: submitOwnTeam,`.
  - Change `drawerContext(editing)` to `drawerContext(editing, editingSeats = [])`. Change its return type to `Omit<DrawerState, "submit" | "addSaved" | "close" | "submitOwn">`, and add:

```ts
  const lineup = currentLineup();
  const format = lobbyFormat(lobby?.players ?? [], lineup, saved, hostId);
  const ownTeams = (lineup?.teams ?? []).filter(team => team.name !== editing?.name);
  const seatTeam = new Map<string, string>();
  for (const team of ownTeams) for (const id of team.seatIds) seatTeam.set(id, team.name);
  const inLobby = (team: SavedTeam) => team.format === "own" ? Boolean(lineup?.teams.some(other => other.name === team.name)) : guests.includes(team.name);
```

  and return these (with the existing fields):

```ts
    takenColours: format === "own" ? ownTeams.map(team => team.colour) : lobbyTeams.map(team => team.colour),
    savedTeams: editing ? [] : saved.filter(team => (!format || team.format === format) && !inLobby(team)),
    lockedFormat: editing ? editing.format : format,
    formatTeam: format === "own" ? (lineup?.teams[0]?.name ?? "") : ([ ...teamsInLobby().keys() ][0] ?? ""),
    setsLobby: Boolean(lobby?.sets),
    legs: lobby?.legs ?? 0,
    seats: (lobby?.players ?? []).filter(seat => seat.id).map(seat => ({ id: seat.id!, name: normalizeName(seat.name), kind: memberOf(seat).kind, team: seatTeam.get(seat.id!) })),
    editingSeats,
```
  - `openDrawer(editing: SavedTeam | null, editingSeats: string[] = [])` passes `editingSeats` to `drawerContext`.
  - Replace the Task 4 stub:

```ts
/** The pencil on a member's row: the drawer on that team's seats. */
function openOwnEditor(name: string) {
  const team = currentLineup()?.teams.find(candidate => candidate.name === name);
  if (!team) return;
  const players = team.seatIds.map(id => normalizeName(lobby?.players?.find(seat => seat.id === id)?.name));
  openDrawer({ name: team.name, players, colour: { ...team.colour }, format: "own" }, [ ...team.seatIds ]);
}
```
  - Add the own-scores flow:

```ts
const SEAT_WAIT_MS = 5000;

/** Seats the new slots (guests and bots) and waits for the lobby update that holds them. */
async function seatSlots(slots: readonly SeatSlot[]): Promise<(string | undefined)[]> {
  const known = new Set((lobby?.players ?? []).map(seat => seat.id).filter((id): id is string => Boolean(id)));
  for (const slot of slots) {
    const ok = slot.kind === "guest" ? await addGuest(slot.name, "Teams") : slot.kind === "bot" ? await addBot(slot.name, slot.ppr, "Teams") : true;
    if (!ok) break;
  }
  const deadline = Date.now() + SEAT_WAIT_MS;
  let ids = resolveSlots(slots, known, lobby?.players ?? []);
  while (ids.some((id, index) => !id && slots[index].kind !== "missing") && Date.now() < deadline) {
    await nextLobbyUpdate();
    ids = resolveSlots(slots, known, lobby?.players ?? []);
  }
  return ids;
}

/** The team as it is saved: its players, and how each of them joined. */
function ownSavedTeam(name: string, colour: ColorScheme, seatIds: readonly string[]): SavedTeam {
  const members = seatIds.map(id => memberOf(lobby?.players?.find(seat => seat.id === id) ?? {}));
  return { name, players: members.map(member => member.name), colour: { ...colour }, format: "own", members };
}

async function submitOwnTeam(draft: OwnDraft): Promise<string | undefined> {
  if (!lobby) return "The lobby isn't loaded yet. Try again in a moment.";
  const editing = drawer.editing;
  const others = (currentLineup()?.teams ?? []).filter(team => team.name !== editing?.name);
  const problem = checkOwnTeam(editing ? { ...draft, name: editing.name } : draft, {
    seatNames: (lobby.players ?? []).map(seat => seat.name ?? ""),
    takenSeats: new Set(others.flatMap(team => team.seatIds)),
    teamNames: others.map(team => team.name),
    freeSeats: Math.max(0, (lobby.maxPlayers || 6) - (lobby.players?.length ?? 0)),
  });
  if (problem) return problem;
  if (colourTaken(draft.colour, others.map(team => team.colour))) return "Another team in this lobby already has that colour.";

  const slots: SeatSlot[] = draft.picks.map(pick => "seatId" in pick ? { kind: "seat", seatId: pick.seatId } : { kind: "guest", name: normalizeName(pick.guest) });
  const ids = await seatSlots(slots);
  if (ids.some(id => !id)) return "autodarts didn't add every new player. Try again.";
  const name = editing?.name ?? normalizeName(draft.name);
  const seatIds = ids as string[];
  await writeLineupTeam({ name, colour: { ...draft.colour }, seatIds });
  await saveTeam(ownSavedTeam(name, draft.colour, seatIds));
  closeDrawer();
  return undefined;
}

async function addSavedOwnTeam(savedTeam: SavedTeam): Promise<string | undefined> {
  if (!lobby) return "The lobby isn't loaded yet. Try again in a moment.";
  const others = currentLineup()?.teams ?? [];
  const team = withFreeColour(savedTeam, others.map(other => other.colour));
  const slots = rejoinSlots(team, lobby.players ?? [], hostId, new Set(others.flatMap(other => other.seatIds)));
  const adding = slots.filter(slot => slot.kind === "guest" || slot.kind === "bot").length;
  const free = Math.max(0, (lobby.maxPlayers || 6) - (lobby.players?.length ?? 0));
  if (adding > free) return `The lobby has room for ${free} more ${free === 1 ? "player" : "players"}.`;

  const ids = await seatSlots(slots);
  const seatIds = ids.filter((id): id is string => Boolean(id));
  if (seatIds.length < 1) return "autodarts didn't add the team. Try again.";
  await writeLineupTeam({ name: team.name, colour: team.colour, seatIds });
  await saveTeam({ ...team, members: team.members });
  const missing = slots.filter(slot => slot.kind === "missing").map(slot => slot.name);
  if (missing.length) return `Added. ${joinNames(missing)} ${missing.length === 1 ? "isn't" : "aren't"} in the lobby: signed-in players join from their own board.`;
  closeDrawer();
  return undefined;
}
```
  - At the top of `addSavedTeam`, add `if (savedTeam.format === "own") return addSavedOwnTeam(savedTeam);`.
  - Add to the `@/utils/teams` import: `checkOwnTeam`, `joinNames`, `lobbyFormat`, `memberOf`, `rejoinSlots`, `resolveSlots`, `type OwnDraft`, `type SeatSlot`, `type TeamFormat`.

- [ ] **Step 4: `AddTeamDrawer.vue`.**
  - In the header, under the `<p>` description, add the tabs:

```vue
        <p class="mt-0.5 text-[13px] text-[var(--ad-text-muted)]">
          {{ format === "own" ? ownLine : "The team plays as one player on your board, and its players take turns in this order." }}
        </p>
        <div class="mt-3 inline-flex gap-1 rounded-full bg-[#16181c] p-1 ring-1 ring-inset ring-white/10" role="tablist">
          <button
            @click="format = option.id"
            v-for="option in formats"
            :key="option.id"
            :aria-selected="format === option.id"
            :disabled="option.disabled"
            class="adt-team-tab"
            role="tab"
            type="button"
          >
            {{ option.label }}
          </button>
        </div>
        <p v-if="formatNote" class="mt-2 text-xs text-[var(--ad-text-muted)]">
          {{ formatNote }}
        </p>
```
  - Change the colour hint to `{{ format === "own" ? "their cards' gradient while one of them is up" : "the card's gradient while this team is up" }}`.
  - Wrap the existing Players section's list, search and chips in `<template v-if="format === 'shared'">`. Add the own-scores sections after it:

```vue
          <template v-else>
            <ol ref="ownList" class="flex flex-col gap-2.5">
              <li v-for="(pick, index) in picks" :key="pickKey(pick)" :data-index="index" class="flex items-center gap-2">
                <span class="adt-team-handle icon-[material-symbols--drag-indicator] size-5 shrink-0 cursor-grab text-[#4d525d]" aria-hidden="true" />
                <span class="w-4 shrink-0 text-center text-[13px] font-extrabold text-[#707580]">{{ index + 1 }}</span>
                <span class="adt-team-tag">{{ pickName(pick) }}</span>
                <span class="text-xs font-bold text-[var(--ad-text-muted)]">{{ pickKind(pick) }}</span>
                <button @click="removePick(index)" :aria-label="`Remove ${pickName(pick)}`" class="ml-auto grid size-8 place-items-center rounded-lg text-[#707580] hover:bg-white/10 hover:text-white" type="button">
                  <span class="icon-[material-symbols--close-rounded] size-5" />
                </button>
              </li>
            </ol>
          </template>
        </section>

        <section v-if="format === 'own'">
          <h3 class="mb-2 flex items-baseline justify-between gap-3 text-sm font-bold">
            In this lobby <small class="text-xs font-semibold text-[var(--ad-text-muted)]">tap to add</small>
          </h3>
          <div class="flex flex-wrap gap-1.5">
            <button
              @click="pickSeat(seat)"
              v-for="seat in lobbySeats"
              :key="seat.id"
              :disabled="Boolean(seat.team) || picks.length >= MAX_PLAYERS"
              :title="seat.team ? `On ${seat.team}` : `Add ${seat.name}`"
              class="adt-team-offer"
              type="button"
            >
              {{ seat.name }}<small v-if="seat.team">{{ seat.team }}</small>
            </button>
          </div>
        </section>

        <section v-if="format === 'own'">
          <h3 class="mb-2 flex items-baseline justify-between gap-3 text-sm font-bold">
            New players <small class="text-xs font-semibold text-[var(--ad-text-muted)]">join as guests on your board</small>
          </h3>
          <form @submit.prevent="addTyped" class="relative">
            <span class="icon-[material-symbols--search-rounded] pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#707580]" aria-hidden="true" />
            <input
              v-model="query"
              :disabled="picks.length >= MAX_PLAYERS"
              aria-label="Search or add a player"
              autocomplete="off"
              class="adt-team-field has-icon"
              placeholder="Search or add a player"
              spellcheck="false"
              type="text"
            >
          </form>
          <div v-if="ownChips.length" class="mt-2.5 flex flex-wrap gap-1.5">
            <button @click="addPlayer(chip)" v-for="chip in ownChips" :key="chip" :disabled="picks.length >= MAX_PLAYERS" class="adt-team-offer" type="button">
              {{ chip }}
            </button>
          </div>
```

  (The Players `<section>`'s closing tag moves to just after the `</template>` above.)
  - Saved teams rows show the format before the players. Replace the players line with:

```vue
                <span class="block truncate text-xs text-[var(--ad-text-muted)]"><span class="mr-1.5 rounded bg-white/10 px-1.5 py-px text-[10.5px] font-extrabold tracking-wide text-[var(--ad-ink-200)]">{{ team.format === "own" ? "OWN SCORES" : "SHARED SCORE" }}</span>{{ team.players.join(" ▸ ") }}</span>
```
  - In the script, import `type OwnPick` from `@/utils/teams` and `type SeatChoice` from `./teams`, then add:

```ts
const format = ref<"shared" | "own">(props.state.lockedFormat ?? "shared");
const picks = ref<OwnPick[]>(props.state.editingSeats.map(id => ({ seatId: id, name: props.state.seats.find(seat => seat.id === id)?.name ?? "" })));
const ownList = ref<HTMLElement>();
let ownSorter: Sortable | undefined;

const formats = computed(() => [
  { id: "shared" as const, label: "Shared score", disabled: Boolean(props.state.lockedFormat && props.state.lockedFormat !== "shared") },
  { id: "own" as const, label: "Own scores", disabled: props.state.setsLobby || Boolean(props.state.lockedFormat && props.state.lockedFormat !== "own") },
]);
const formatNote = computed(() => {
  if (props.state.setsLobby && format.value !== "own" && !props.state.lockedFormat) return "Own-score teams play legs. Set the lobby to legs to use them.";
  if (!props.state.lockedFormat || !props.state.formatTeam || props.state.editing) return "";
  return props.state.lockedFormat === "own"
    ? `${props.state.formatTeam} already plays on own scores, so this lobby's teams do too.`
    : `${props.state.formatTeam} already shares a score, so this lobby's teams do too.`;
});
const ownLine = computed(() => props.state.legs > 0
  ? `Everyone keeps their own score. A leg counts for the team of whoever checks out, and the first team to ${props.state.legs} legs wins the match.`
  : "Everyone keeps their own score. A leg counts for the team of whoever checks out, and the first team to the lobby's target wins the match.");
/** The lobby's seats not picked yet, the ones on another team greyed. */
const lobbySeats = computed(() => props.state.seats.filter(seat => !picks.value.some(pick => "seatId" in pick && pick.seatId === seat.id)));
/** Saved and recent names for new guests, minus anyone in the lobby or picked already. */
const ownChips = computed(() => {
  const typed = normalizeName(query.value);
  const seated = new Set(props.state.seats.map(seat => seat.name));
  const picked = new Set(picks.value.map(pickName));
  return props.state.offered.filter(name => !seated.has(name) && !picked.has(name) && (!typed || name.includes(typed)));
});

function pickKey(pick: OwnPick) {
  return "seatId" in pick ? `seat:${pick.seatId}` : `guest:${pick.guest}`;
}
function pickName(pick: OwnPick) {
  return "seatId" in pick ? pick.name : normalizeName(pick.guest);
}
function pickKind(pick: OwnPick) {
  if (!("seatId" in pick)) return "new guest";
  const kind = props.state.seats.find(seat => seat.id === pick.seatId)?.kind;
  return kind === "bot" ? "bot" : kind === "account" ? "on their own board" : "guest";
}
function pickSeat(seat: SeatChoice) {
  error.value = "";
  if (seat.team || picks.value.length >= MAX_PLAYERS) return;
  picks.value = [ ...picks.value, { seatId: seat.id, name: seat.name } ];
}
function removePick(index: number) {
  picks.value = picks.value.filter((_, i) => i !== index);
}
```
  - `addPlayer` gains an own-scores branch at its top:

```ts
  if (format.value === "own") {
    const guest = normalizeName(raw);
    error.value = "";
    if (!guest) return false;
    if (picks.value.some(pick => pickName(pick) === guest)) return true;
    if (picks.value.length >= MAX_PLAYERS) {
      error.value = `A team can have ${MAX_PLAYERS} players at most.`;
      return false;
    }
    picks.value = [ ...picks.value, { guest } ];
    query.value = "";
    return true;
  }
```
  - `submit()` sends own-score teams to `state.submitOwn`:

```ts
function submit() {
  if (query.value.trim() && !addTyped()) return;
  if (format.value === "own") {
    run(() => props.state.submitOwn({ name: name.value, colour: colour.value, picks: picks.value }));
    return;
  }
  run(() => props.state.submit({ name: name.value, players: players.value, colour: colour.value }));
}
```
  - A second Sortable drives the own list, created once the list is on screen (it's in a `v-if`), and destroyed with the drawer:

```ts
watch(ownList, (element) => {
  ownSorter?.destroy();
  ownSorter = element
    ? Sortable.create(element, {
      animation: 150,
      handle: ".adt-team-handle",
      draggable: "[data-index]",
      onEnd({ from, item, oldIndex, newIndex }) {
        if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return;
        // Back where Vue left it; Vue moves it once the array changes.
        from.removeChild(item);
        from.insertBefore(item, from.children[oldIndex] ?? null);
        const next = [ ...picks.value ];
        next.splice(newIndex, 0, ...next.splice(oldIndex, 1));
        picks.value = next;
      },
    })
    : undefined;
});
```

  and `onBeforeUnmount(() => sorter?.destroy())` becomes `onBeforeUnmount(() => { sorter?.destroy(); ownSorter?.destroy(); })`.
  - Add a style for the tabs:

```css
.adt-team-tab { height: 32px; padding: 0 16px; border-radius: 999px; font-size: 13px; font-weight: 700; color: var(--ad-text-muted); }
.adt-team-tab[aria-selected="true"] { background: var(--ad-ink-100); color: var(--ad-text-on-light); }
.adt-team-tab:disabled { opacity: .4; cursor: not-allowed; }
```

- [ ] **Step 5: Run the SFC check and wait for the rebuild.** Run `node $SCR/sfc-check.cjs entrypoints/lobby.content/AddTeamDrawer.vue`, park my tab, and poll `lobby.js` for `Own scores`.

- [ ] **Step 6: The live run.**
  - **A legs lobby** with ANNA and TOM as guests, and Bot Level 5 added with `{name, userId: null, cpuPPR: 60}`:
    - Open the drawer and switch to Own scores. Pick ANNA from In this lobby, type LEA, and press Add Team.
      - Expected: the drawer closes. `teams-lineups[<lobby>]` holds `TEAM RED [ANNA, LEA]`, and LEA is a new guest seat. `teams.saved[0]` is `{ format: "own", members: [ {ANNA guest}, {LEA guest} ] }`.
    - Open it again: Shared score is disabled, with the note `TEAM RED already plays on own scores, so this lobby's teams do too.` Pick TOM and the bot, and press Add Team.
      - Expected: the seats alternate, RED, BLUE, RED, BLUE. `teams.saved[0]` is TEAM BLUE, with members `{TOM guest}` and `{BOT LEVEL 5 bot 60}`.
    - Press a member row's pencil: the drawer opens as Edit Team on TEAM BLUE's seats. Remove the bot and Save.
      - Expected: the lineup's TEAM BLUE is `[TOM]`, and the uneven note shows.
    - Typing ANNA as a new player gives `There's already a player called ANNA in this lobby. Pick them under In this lobby.`
  - **A sets lobby** (`sets: 2`): Own scores is disabled, with `Own-score teams play legs. Set the lobby to legs to use them.`
  - **A fresh legs lobby** with nobody in it: Saved teams shows TEAM BLUE with `OWN SCORES`. Tap Add.
    - Expected: TOM joins as a guest, a Bot Level 5 joins at 60, and the lineup holds both.
  - **The shared-score flow** still adds a team as one seat, as in the first Teams.

- [ ] **Step 7: Lint, compile and commit.**

```bash
git add entrypoints/lobby.content/AddTeamDrawer.vue entrypoints/lobby.content/teams.ts utils/websocket-helpers.ts
git commit -m "feat: own-score teams in the Add Team drawer, saved and re-added with their players"
```

---

### Task 6: The match screen for own scores

**Files:**
- Modify: `entrypoints/match.content/teams.ts`
- Modify: `entrypoints/match.content/TeamsPill.vue`

**Interfaces:**
- Consumes: `lineupTeams`, `assignCards`, `teamLegs`, `decidedTeam`, `partnerRuleBreach`, `decidedText`, `resultText`, `warningText`, `lineupOf`, `type Lineup`, `type LineupStore`, `type LineupTeam` (Tasks 1–2), `AutodartsToolsTeamLineups`, and the stored `match.adtTeams` (Task 3).
- Produces: `PillView` gains `tally: { name: string; legs: number; from: string; to: string }[]`, `target: number`, `note: string` and `noteKind: "" | "rule" | "bust"`.

- [ ] **Step 1: A live test that fails first.**
  - Make a 2v2 own-score match: 121, legs 3, with ANNA and TOM for TEAM RED and BEN and a Bot Level 5 for TEAM BLUE, set up with the drawer or with `lineup.mjs`.
  - Load it in my tab and run `probe.mjs`.

  Expected: no `[data-adt-team]` cards and no pill.

- [ ] **Step 2: `TeamsPill.vue`.** The template becomes a column: the status line as it is, then the tally, then the note:

```vue
<template>
  <div class="adt-teams">
    <!-- The site's StatusLine and StatusPill (Killer's "TOM to throw"), in the throwing team's gradient. -->
    <div :style="{ '--adt-to': view.to }" class="adt-teams-status" aria-live="polite">
      <span class="adt-teams-line" aria-hidden="true" />
      <div class="adt-teams-pill">
        <TransitionGroup class="adt-teams-layers" name="adt-teams-fade" tag="span" aria-hidden="true">
          <i v-for="layer in layers" :key="layer.key" :style="{ backgroundImage: layer.gradient }" />
        </TransitionGroup>
        <Transition mode="out-in" name="adt-teams-slide">
          <span :key="view.turnKey" class="adt-teams-text">
            {{ view.text }}<span v-if="view.team" class="adt-teams-team">{{ view.team }}</span>
          </span>
        </Transition>
      </div>
      <span class="adt-teams-line" aria-hidden="true" />
    </div>
    <!-- Own scores: every team's legs against the target. -->
    <div v-if="view.tally.length" class="adt-teams-tally">
      <span v-for="team in view.tally" :key="team.name" class="adt-teams-tally-team">
        <i :style="{ backgroundImage: `linear-gradient(to right, ${team.from}, ${team.to})` }" aria-hidden="true" />{{ team.name }} <b>{{ team.legs }}</b>
      </span>
      <em v-if="view.target">first to {{ view.target }}</em>
    </div>
    <p v-if="view.note" :class="['adt-teams-note', `is-${view.noteKind}`]" role="status">
      {{ view.note }}
    </p>
  </div>
</template>
```
  - Add the styles:

```css
.adt-teams { display: flex; flex-direction: column; align-items: center; gap: 8px; padding-bottom: 8px; font-family: var(--ad-font-body); }
.adt-teams-tally { display: flex; align-items: center; gap: 8px; }
.adt-teams-tally-team { display: inline-flex; align-items: center; gap: 6px; height: 26px; padding: 0 11px 0 9px; border-radius: 999px; background: var(--ad-ink-800, #16181c); color: #f7f8fa; font-size: 12px; font-weight: 800; }
.adt-teams-tally-team i { width: 9px; height: 9px; border-radius: 3px; }
.adt-teams-tally-team b { font-size: 15px; }
.adt-teams-tally em { font-style: normal; font-size: 11px; font-weight: 700; color: #a1a1a1; }
.adt-teams-note { margin: 0; max-width: 640px; padding: 8px 12px; border-radius: 10px; font-size: 13px; font-weight: 700; text-align: center; }
.adt-teams-note.is-rule { color: #ffd27a; background: rgb(255 190 60 / 10%); box-shadow: inset 0 0 0 1px rgb(255 190 60 / 35%); }
.adt-teams-note.is-bust { color: #ffb4b4; background: rgb(255 80 80 / 10%); box-shadow: inset 0 0 0 1px rgb(255 90 90 / 40%); }
```
  - Drop `padding-bottom` from `.adt-teams-status`, since the outer element has it now.

- [ ] **Step 3: `entrypoints/match.content/teams.ts`: state and reading the lineup.**
  - Extend `PillView` and its default: `tally: [], target: 0, note: "", noteKind: ""`.
  - Add to the imports:
    - `AutodartsToolsTeamLineups`
    - from `@/utils/teams`: `assignCards`, `decidedTeam`, `decidedText`, `lineupOf`, `lineupTeams`, `partnerRuleBreach`, `resultText`, `teamLegs`, `warningText`, `type Lineup`, `type LineupStore`, `type LineupTeam`
  - Add the state: `let lineupStore: LineupStore = {};`, `let unwatchLineups: (() => void) | null = null;`, `let partnerRule = false;` and `let holding = false;`.
  - In `teams()`, add `lineupStore = (await AutodartsToolsTeamLineups.getValue()) ?? {};`, and a watcher that sets `lineupStore` and calls `schedule()`. Release it in `onRemove`.
  - In `readConfig`, add `partnerRule = normalizeTeams(config?.teams).partnerRule;`.
  - Add the constants `const LEGS_CLASS = "adt-team-legs";` and `const HOLD_STYLE_ID = "teams-match-hold";`.
  - Add to `BASE_CSS`:

```css
  .${LEGS_CLASS} {
    display: inline-flex; align-items: center; gap: 6px; height: 20px; padding: 0 9px 0 7px; margin: 2px auto 0;
    border-radius: 999px; background: rgb(0 0 0 / 28%); color: #f7f8fa; font-size: 10.5px; font-weight: 800; letter-spacing: .02em; white-space: nowrap;
  }
  .${LEGS_CLASS} i { width: 9px; height: 9px; border-radius: 3px; background: linear-gradient(to right, var(--adt-team-from), var(--adt-team-to)); }
  .${LEGS_CLASS} b { font-size: 12px; }
```

- [ ] **Step 4: `apply` in two formats.** Rename today's `apply` body to `applyShared()` (unchanged), and add `holdNextLeg(false)` at its end. Then:

```ts
function apply() {
  const lineup = match ? lineupOf(lineupStore, match.id) : undefined;
  if (lineup) applyOwn(lineup);
  else applyShared();
}

function applyOwn(lineup: Lineup) {
  const seats = lineupTeams(match!.players ?? [], lineup);
  if (!seats.size) {
    clear();
    return;
  }
  const up = match!.player ?? 0;
  const upTeam = seats.get(up);
  const decided = match!.adtTeams?.decided ?? decidedTeam(match!, lineup);
  const panelUp = (match!.gameWinner ?? -1) >= 0;
  writeStyles(decided ? undefined : upTeam);
  dressOwnCards(seats, up, lineup);
  updateOwnPill(lineup, upTeam, up, decided);
  ensurePill();
  holdNextLeg(Boolean(decided && panelUp));
  handover(decided ? undefined : upTeam, up);
}
```
  - `writeStyles` and `handover` take any team with a name and a colour, so both formats use them. Change their signatures, and nothing else in them, to:

```ts
type Coloured = { name: string; colour: { from: string; to: string } };

function writeStyles(upTeam?: Coloured) {
```

```ts
function handover(upTeam: Coloured | undefined, up: number) {
```
  - Also call `holdNextLeg(false)` from `clear()`.

- [ ] **Step 5: Cards, the pill and holding the win.**

```ts
function dressOwnCards(seats: Map<number, LineupTeam>, up: number, lineup: Lineup) {
  const cards = allCards();
  const players = match!.players ?? [];
  const shown = assignCards(cards.map(card => ({
    name: card.querySelector(SELECTORS.match.playerName[0])?.textContent ?? "",
    small: card.matches(anyOf(SELECTORS.match.smallScoreCard)),
  })), players, up);
  const legs = teamLegs(match!, lineup);
  cards.forEach((card, index) => {
    const team = seats.get(shown[index]);
    if (!team) {
      if (card.hasAttribute(CARD_ATTR)) undressCard(card);
      return;
    }
    if (card.getAttribute(CARD_ATTR) !== team.name) card.setAttribute(CARD_ATTR, team.name);
    card.toggleAttribute(WAITING_ATTR, shown[index] !== up);
    card.style.setProperty("--adt-team-from", team.colour.from);
    card.style.setProperty("--adt-team-to", team.colour.to);
    renderLegs(card, team, legs[team.name] ?? 0);
  });
}

/** Under a member's name: the team, and its legs. */
function renderLegs(card: HTMLElement, team: LineupTeam, legs: number) {
  const key = `${team.name}|${legs}`;
  const current = card.querySelector<HTMLElement>(`:scope .${LEGS_CLASS}`);
  if (current?.dataset.key === key) return;
  const nameRow = qs<HTMLElement>(SELECTORS.match.nameRow, card);
  current?.remove();
  if (!nameRow) return;
  const label = document.createElement("span");
  label.className = LEGS_CLASS;
  label.dataset.key = key;
  const swatch = document.createElement("i");
  swatch.setAttribute("aria-hidden", "true");
  const count = document.createElement("b");
  count.textContent = String(legs);
  label.append(swatch, `${team.name} `, count);
  nameRow.after(label);
}

function updateOwnPill(lineup: Lineup, upTeam: LineupTeam | undefined, up: number, decided: string | undefined) {
  const legs = teamLegs(match!, lineup);
  pill.tally = lineup.teams.map(team => ({ name: team.name, legs: legs[team.name] ?? 0, from: team.colour.from, to: team.colour.to }));
  pill.target = match!.legs ?? 0;
  pill.note = "";
  pill.noteKind = "";
  if (decided) {
    const team = lineup.teams.find(candidate => candidate.name === decided);
    pill.text = decidedText(decided);
    pill.team = resultText(legs, decided, lineup);
    pill.from = team?.colour.from ?? otherCard.from;
    pill.to = team?.colour.to ?? otherCard.to;
    pill.turnKey = `decided|${decided}`;
    return;
  }
  const player = normalizeName(match!.players?.[up]?.name);
  const colour = upTeam?.colour ?? otherCard;
  pill.text = toThrowText(player, siteLanguage());
  pill.team = upTeam?.name ?? "";
  pill.from = colour.from;
  pill.to = colour.to;
  pill.turnKey = `${match!.set}|${match!.leg}|${match!.round}|${up}|${player}`;
  const breach = partnerRule ? partnerRuleBreach(match!, lineup, up) : undefined;
  if (breach) {
    pill.note = warningText(breach);
    pill.noteKind = "rule";
  }
}

/**
 * While the leg that decided the match is on screen, its Next Leg is hidden
 * and Space and Enter (the site's own shortcuts for it) are held back. The
 * site's match is still open; the team's is over.
 */
function holdNextLeg(on: boolean) {
  if (on === holding) return;
  holding = on;
  if (on) {
    addStyles(`html body ${anyOf(SELECTORS.match.nextLegButton)} { display: none !important; }`, HOLD_STYLE_ID);
    window.addEventListener("keydown", holdKeys, true);
  } else {
    removeStyles(HOLD_STYLE_ID);
    window.removeEventListener("keydown", holdKeys, true);
  }
}

function holdKeys(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null;
  if (target?.closest("input, textarea, [contenteditable='true']")) return;
  if (event.code !== "Space" && event.code !== "Enter" && event.code !== "NumpadEnter") return;
  event.preventDefault();
  event.stopImmediatePropagation();
}
```
  - `undressCard` also removes `:scope .${LEGS_CLASS}`.

- [ ] **Step 6: Run the live test again (Review Focus 4).** Park my tab first, wait for `match.js` to rebuild, then reload the match.

  Expected in the wide layout (1920×963):
  - every card has `data-adt-team`, with RED's up card in Crimson and the waiting members' tags in their team's gradient
  - four `.adt-team-legs`, reading `TEAM RED 0` and `TEAM BLUE 0`
  - the pill reads `ANNA to throw` with `TEAM RED`, and the tally says `TEAM RED 0 · TEAM BLUE 0 · first to 3`

  Win three legs for TEAM RED (ANNA, TOM, ANNA). At the third:
  - the pill reads `TEAM RED wins the match` with `3 – 0`
  - `document.querySelectorAll("main button:has([data-icon='forward-step'])")` are all `display: none`
  - a trusted Space keydown (`Input.dispatchKeyEvent` over CDP) leaves `node state.mjs <id>` unchanged (`leg` doesn't move on)
  - Automatic Next Leg, switched on for this run, doesn't count down after a faked `Takeout finished` ([[fake-board-events-over-websocket-incoming]])

  Repeat the checks at 1180×820 (sidebar) and 820×1180 (stacked).

- [ ] **Step 7: Two bots of one level (Review Focus 2).** Make a match with TEAM RED = ANNA and Bot Level 5, and TEAM BLUE = BEN and Bot Level 5, set up with `lineup.mjs` by seat id.
  - Expected in all three layouts: each bot's card carries its own team's name and colour in `.adt-team-legs`, checked against the seat order from `GET /gs/v0/lobbies/{id}`.

- [ ] **Step 8: The warning.** Switch on `teams.partnerRule`. Start a 121 legs-3 match from a lobby where the drawer made TEAM RED = ANNA, TOM and TEAM BLUE = BEN, MIA (four guests), so the seats alternate ANNA, BEN, TOM, MIA. Throw:
  - ANNA `low` (118)
  - BEN `sixty` (61)
  - TOM `low` (118)
  - MIA: T20, T20, then `POST /players/next` (1)

  Expected: while ANNA is up, `.adt-teams-note.is-rule` reads `No checkout this visit: TOM has 118 left, more than BEN and MIA together (62)`, and the note goes when a visit starts without a breach.

- [ ] **Step 9: Lint, the SFC check, compile and commit.**

```bash
git add entrypoints/match.content/teams.ts entrypoints/match.content/TeamsPill.vue
git commit -m "feat: the match shows own-score teams, their legs, the team win and the partner rule's warning"
```

---

### Task 7: The partner rule's bust, and its switch

**Files:**
- Create: `utils/teams-undo.ts`
- Modify: `entrypoints/background.ts`
- Modify: `entrypoints/match.content/teams.ts` (asking for the undo, and the bust note)
- Modify: `components/Settings/Teams.vue` (the Partner rule row)
- Test: `$SCR/tests/teams-undo.test.mts`

**Interfaces:**
- Consumes: `bustText` and `AdtTeams.bust` (Task 2), and the stored `match.adtTeams` (Task 3).
- Produces:
  - `undoVisit(matchId: string, dartIds: readonly string[], post: Poster): Promise<{ ok: boolean; skipped?: boolean }>`
  - `forgetUndone(): void`
  - `type Poster = (path: string) => Promise<{ ok: boolean; status: number }>`
  - the message `{ type: "teams:undo-visit", matchId: string, dartIds: string[] }`

- [ ] **Step 1: Write the failing test** `$SCR/tests/teams-undo.test.mts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { forgetUndone, undoVisit } from "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/utils/teams-undo.ts";

test("undoVisit undoes each dart of the visit, then passes the turn", async () => {
  forgetUndone();
  const calls: string[] = [];
  const result = await undoVisit("m1", [ "d1", "d2", "d3" ], async (path) => {
    calls.push(path);
    return { ok: true, status: 200 };
  });
  assert.deepEqual(result, { ok: true });
  assert.deepEqual(calls, [ "/gs/v0/matches/m1/undo", "/gs/v0/matches/m1/undo", "/gs/v0/matches/m1/undo", "/gs/v0/matches/m1/players/next" ]);
});

test("undoVisit does a visit once, however often it is asked", async () => {
  forgetUndone();
  let posts = 0;
  const post = async () => {
    posts++;
    return { ok: true, status: 200 };
  };
  await Promise.all([ undoVisit("m1", [ "d1" ], post), undoVisit("m1", [ "d1" ], post) ]);
  assert.deepEqual(await undoVisit("m1", [ "d1" ], post), { ok: true, skipped: true });
  assert.equal(posts, 2, "one undo and one next");
});

test("undoVisit stops at the first refused request", async () => {
  forgetUndone();
  const calls: string[] = [];
  const result = await undoVisit("m1", [ "d1", "d2" ], async (path) => {
    calls.push(path);
    return { ok: false, status: 403 };
  });
  assert.deepEqual(result, { ok: false });
  assert.deepEqual(calls, [ "/gs/v0/matches/m1/undo" ]);
});
```

- [ ] **Step 2: Run it and see it fail.**
Expected: FAIL, because `utils/teams-undo.ts` doesn't exist.

- [ ] **Step 3: Write `utils/teams-undo.ts`:**

```ts
/**
 * The partner rule's bust, done (utils/teams.ts `teamView`): every dart of the
 * visit taken back with the site's undo, then the turn passed on. It runs in
 * the service worker, so however many tabs report the same checkout, and
 * however often the site sends the frame, the visit is undone once.
 */
export type Poster = (path: string) => Promise<{ ok: boolean; status: number }>;

/** Visits asked for, by match and darts, for as long as the service worker lives. */
const undone = new Set<string>();

export async function undoVisit(matchId: string, dartIds: readonly string[], post: Poster): Promise<{ ok: boolean; skipped?: boolean }> {
  const key = `${matchId}|${dartIds.join(",")}`;
  if (!matchId || !dartIds.length || undone.has(key)) return { ok: true, skipped: true };
  undone.add(key);
  for (let dart = 0; dart < dartIds.length; dart++) {
    if (!(await post(`/gs/v0/matches/${matchId}/undo`)).ok) return { ok: false };
  }
  return { ok: (await post(`/gs/v0/matches/${matchId}/players/next`)).ok };
}

/** For the tests. */
export function forgetUndone() {
  undone.clear();
}
```

- [ ] **Step 4: Run the test and see it pass.**

- [ ] **Step 5: `entrypoints/background.ts`.**
  - Import `import { undoVisit } from "@/utils/teams-undo";` and `import { AutodartsToolsGlobalStatus } from "@/utils/storage";` at the top.
  - As the listener's first branch, before `if (message.type === "fetch")`, add:

```ts
      // Teams' partner rule: a checkout that broke it is undone here, once.
      if (message.type === "teams:undo-visit") {
        return undoVisit(String(message.matchId ?? ""), Array.isArray(message.dartIds) ? message.dartIds : [], async (path) => {
          const token = (await AutodartsToolsGlobalStatus.getValue())?.auth?.token ?? "";
          const response = await fetch(`https://api.autodarts.com${path}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
          return { ok: response.ok, status: response.status };
        });
      }
```

- [ ] **Step 6: `entrypoints/match.content/teams.ts`.**
  - Add the state `let lastUndo = "";` and `let bustNote: { text: string; shownFor?: string } | undefined;`, and import `bustText`.
  - At the end of `applyOwn`, call `askUndo()`. In `updateOwnPill`, before the warning, show the bust note for the visit after the bust:

```ts
  if (bustNote) {
    bustNote.shownFor ??= pill.turnKey;
    if (bustNote.shownFor === pill.turnKey) {
      pill.note = bustNote.text;
      pill.noteKind = "bust";
      return;
    }
    bustNote = undefined;
  }
```

```ts
/** A checkout the team view made a bust: the service worker undoes it (utils/teams-undo.ts). */
function askUndo() {
  const bust = match?.adtTeams?.bust;
  if (!bust || !match) return;
  const key = `${match.id}|${bust.dartIds.join(",")}`;
  if (key === lastUndo) return;
  lastUndo = key;
  bustNote = { text: bustText(bust.breach) };
  browser.runtime.sendMessage({ type: "teams:undo-visit", matchId: match.id, dartIds: bust.dartIds }).catch(e => console.error(e));
}
```
  - Reset `lastUndo` and `bustNote` in `onRemove`.

- [ ] **Step 7: `components/Settings/Teams.vue`.** Above the saved-teams `LibrarySection`, add:

```vue
        <section class="mb-10">
          <h3 class="adt-section-title">
            Options
          </h3>
          <OptionRow description="Own scores, X01, two teams: nobody may check out while their partner has more left than both opponents together. A checkout that breaks it counts as a bust." title="Partner rule">
            <AppToggle v-model="config.teams.partnerRule" size="sm" />
          </OptionRow>
        </section>
```

Import `OptionRow` from `./Library/OptionRow.vue`. `config.teams.partnerRule` exists on every config read through `useConfig`, whose defaults fill it. Check that live: an old config without the field must show the switch off, not break the panel.

- [ ] **Step 8: The live run (Review Focus 3).**
  - Switch the rule on in the settings panel. Set up the match of Task 6 step 8, with **two** match tabs of mine open on it, and when ANNA is up at 118, she throws T20 T19 S1 (`win118`).

    Expected:
    - within a second, the server's `/state` has ANNA back at 118, it's BEN's turn, and the leg is 1
    - `turns` has lost exactly one visit: its darts are gone, and none from earlier
    - the pill reads `BEN to throw` with `ANNA's checkout didn't count: partner rule.` until BEN's visit ends
    - the play recorder ([[testing-sound-engines-with-a-play-recorder]]) logged `busted`, not `gameshot`
  - With the rule off, the same checkout stands.
  - A bot's checkout in a breach position stands. Make the bot TOM's partner, give TOM 160, and let the bot finish from 32 (low PPR). Or, if the bot won't finish, rely on the tsx test and record that.

- [ ] **Step 9: `yarn build` (the background's graph), `yarn build:firefox`, compile, lint and commit.**

```bash
git add utils/teams-undo.ts entrypoints/background.ts entrypoints/match.content/teams.ts components/Settings/Teams.vue
git commit -m "feat: the partner rule for own-score teams: a checkout that breaks it is a bust"
```

---

### Task 8: Settings, README and CHANGELOG

**Files:**
- Modify: `components/Settings/Teams.vue` (intro, card text, saved rows' format label)
- Modify: `README.md`, `CHANGELOG.md`

- [ ] **Step 1: `Teams.vue`.**
  - The panel's intro becomes: `Play in teams two ways. With a shared score, a team is one player on your board and its players take turns on it, like steel-tip doubles. With own scores, everyone keeps their own score and a leg counts for their team. Add teams in a lobby you host with <b class="text-[var(--ad-text-primary)]">Add Team</b>, next to Add Player and Add Bot.`
  - The card text: `Play in teams: on a shared score, or each on their own. Add them in the lobby, and the match shows whose turn it is in each team's colours.`
  - The saved row's meta:

```vue
              <template #meta>
                <span class="mr-1.5 rounded bg-white/10 px-1.5 py-px text-[10.5px] font-extrabold tracking-wide">{{ saved[entry.index].format === "own" ? "OWN SCORES" : "SHARED SCORE" }}</span>{{ saved[entry.index].players.join(" ▸ ") }}
              </template>
```

- [ ] **Step 2: README.** In the Teams entry:
  - The first line becomes: `- **Teams**: Play in teams, on a shared score or each on their own`
  - Add these sub-bullets after the drawer's bullet:

```markdown
  - **Two formats**, chosen in the drawer: *Shared score* makes the team one player on your board, and its players take turns on that score. *Own scores* keeps everyone on their own score, and a leg counts for the team of whoever checks out: the first team to the lobby's "First to N legs" wins the match. The first team in a lobby sets its format
  - With own scores, a team can mix guests, people playing on their own board and bots (bots in X01 and Cricket). Pick seats already in the lobby or type new names, and the seats are kept in turn order so the teams alternate. Own scores play legs, not sets
  - When an own-score team wins, the pill says so and Next Leg is held back. The site still counts the match per player, so it's only saved to your history when the winning leg also took one player to the target
  - **Partner rule** (settings, own scores, X01, two teams): nobody may check out while their partner has more left than both opponents together. A checkout that breaks it counts as a bust, and the pill warns before the visit
```
  - The existing limits bullet starts `With a shared score, each team is a guest on your board, …` instead of `Each team is a guest on your board, …`.

- [ ] **Step 3: CHANGELOG `[Unreleased]` → Added → Teams.** Add this sub-bullet after the colours bullet:

```markdown
  - **Own scores**, the second format, from the drawer's *Shared score* / *Own scores* tabs: everyone keeps their own score, and a team is a group of seats, so it can mix guests, people on their own boards and bots. A leg counts for the team of whoever checks it out, and the first team to the lobby's "First to N legs" wins the match: each card shows its team and the team's legs, a tally under the pill counts them, and when a team wins, the pill says so, Next Leg is held back and the Caller calls the team's match shot. The site still counts the match per player and keeps it open, so it's saved to history only when the winning leg also took one player to the target. The seats are kept in turn order, so the teams alternate, and own scores play legs, not sets. The e-darts **partner rule** is an option: nobody may check out while their partner has more left than both opponents together, and a checkout that breaks it counts as a bust
```

- [ ] **Step 4: A live look at the settings panel, then commit.** Take a screenshot of Teams' panel with one saved team of each format and the Partner rule row.

```bash
git add components/Settings/Teams.vue README.md CHANGELOG.md
git commit -m "docs: Teams' own scores in the settings, the README and the changelog"
```

---

### Task 9: The full run, the checks, and the dev browser put back

- [ ] **Step 1:** Re-run, on the final build, Task 5 step 6, Task 6 steps 6–8 and Task 7 step 8.
- [ ] **Step 2:** Re-run the first Teams' shared-score checks: its plan's Task 6 steps 5–10 and Task 4 steps 6–7, in `docs/superpowers/plans/2026-09-30-teams.md`.
- [ ] **Step 3:** The checks:
  - `yarn compile` (14)
  - ESLint per touched file, compared with `git show "HEAD:<file>"`
  - `yarn build` and `yarn build:firefox`
  - all tsx tests
- [ ] **Step 4:** Restore the dev browser:
  - `wledFx.enabled: true`
  - `teams`: `enabled: false`, `saved: []`, `partnerRule: false`
  - remove `teams-shifts` and `teams-lineups`
  - `colors` and `zoom` as they were
  - `adt:last-visited-url` and `urlstatus` = `https://play.autodarts.com/tools`
  - test lobbies deleted, test matches aborted, and my tab closed
- [ ] **Step 5:** Commit any fixes the run needed, with their own messages.

---

### Task 10: A whole-branch review

- [ ] **Step 1:** Run `review-package` over this plan's commits (from the spec commit `25dcf85`) and dispatch a fresh reviewer on the most capable model, with the spec, this plan, its Review Focus, and the ledger's rulings.
- [ ] **Step 2:** Handle the findings: re-grade them by effect, fix the Critical and Important ones RED→GREEN, ledger the minors, and commit.
