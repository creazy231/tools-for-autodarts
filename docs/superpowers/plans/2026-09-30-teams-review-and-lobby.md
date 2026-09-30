# Teams: review fixes, the lobby's partner rule, and the drawer follow-ups. Implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the Teams design errors the review found (the board size, the wide-layout overlap, unequal top-bar cells, the pill after a checkout, the live switch). Move the partner rule onto the lobby page. Let the drawer delete names and saved teams, allow teams of one, and put bots on own-score teams.

**Architecture:**
- **Rules:** `utils/teams.ts` stays the pure, tsx-tested core, and gains the rules for teams of one, bots, the lobby's partner rule and the drawer's deletes. A new pure `utils/teams-pill.ts` works out what the pill says, so the match script only renders it.
- **Match:** the pill (`TeamsPill.vue`) becomes one line of fixed height with the teams' legs either side. It never wraps, and never adds a row above the board.
- **Lobby:** `entrypoints/lobby.content/teams.ts` draws a partner-rule card next to the site's Autoscoring. The drawer (`AddTeamDrawer.vue`, plus a new `NameChip.vue`) gets deletes, bots and saved teams first.

**Tech Stack:**
- WXT content scripts in TypeScript
- Vue 3 `<script setup>`
- tsx + `node:test` (the scratchpad suite)
- raw CDP against the `yarn dev` Chrome on :9222

**Spec:** `docs/superpowers/specs/2026-09-30-teams-review-and-lobby-design.md`, which builds on `2026-09-30-teams-design.md` and `2026-09-30-teams-own-scores-design.md`.

## Global Constraints

- **Paths:**
  - `SCR=/private/tmp/claude-501/-Volumes-WD-BLACK-PROJECTS-Autodarts-autodarts-tools-wxt/5dbcfc36-4526-4092-b5a0-630879b56ae1/scratchpad`
  - the tests live in `$SCR/tests/*.test.mts` and import the repo by absolute path
  - suite command, from the repo root: `npx tsx --test $SCR/tests/*.test.mts`
- **No new config version:** `IConfig.teams` keeps `{ enabled, saved, partnerRule }`, and `partnerRule` is now the state the next lobby starts from. Every write of `config.teams` keeps all three.
- **Limits:** `MIN_PLAYERS = 1`, `MAX_PLAYERS = 6`. A team of one is a team.
- **Copy, verbatim:**
  - `Add at least one player.`
  - `Partner rule`
  - `Own-score teams in X01: nobody may check out while a teammate has more left than both opponents together. A checkout that breaks it is a bust.`
  - `It counts once there are two own-score teams and everyone is on one.`
  - `No checkout this visit` · `{TEAMMATE} has {x} left, more than {OPPONENTS} together ({y})`
  - `{PLAYER}'s checkout didn't count` · `partner rule`
  - `Undo {PLAYER}'s checkout yourself` · `it breaks the partner rule, and autodarts didn't take it back`
  - `{NAME} wins the leg` / `{NAME} gewinnt das Leg`, `{TEAM} wins the match` / `{TEAM} gewinnt das Match`
  - `Bots only play X01 and Cricket.`
  - `Bots`, hint `join at the level you pick`, option `Level {n} · {ppr}+`, button `Add bot`, list kind `new bot · {ppr}+`
  - `A bot can't share a score: autodarts throws every visit of a bot's seat. Use Own scores to put one on a team, or Add Bot to play against one.`
  - `Nobody yet: tap someone in this lobby, or add a new player or a bot.` / `Nobody yet: type a name, or tap one below.`
  - `{PLAYER} is already on {TEAM}.`
  - `Delete {NAME}` (the armed chip)
  - settings intro sentence: `Own-score teams in X01 can play the partner rule: switch it on the lobby page, next to Autoscoring.`
- **Pill geometry:**
  - host height 48 px, pill 40 px, no text wraps (`nowrap` plus an ellipsis everywhere)
  - container queries on the pill's own width: below 640 px no `first to N`; below 520 px the tally chips show no names and the normal pill no detail
- **Cards:**
  - top-bar cells (`SELECTORS.match.smallScoreCard`) get no chips in either format
  - own-score legs chips only on cards that aren't above the turn bar's row (`SELECTORS.match.turnBarRow`)
- **Code style:**
  - spaces inside array brackets and object braces
  - double quotes
  - Vue attribute order as the files already have: events, then `v-for`/`v-if`, `ref`, `:key`, bound attributes, then static ones
  - comments explain why, in plain sentences
- **Never:**
  - push
  - edit `safari/**/Shared (Extension)/**`, `components/WhatsNew.vue` or `entrypoints/content/migration-config.ts`
  - call `chrome.runtime.reload`
  - restart `yarn dev`
  - touch the user's tab (id 17 on `/`)
  - print password lines
- **Live testing:**
  - WLED stays off during tests and goes back on at the end
  - park my own tab at `about:blank` before any source edit
  - restore the config key by key from `$SCR/r2/storage-backup-start.json`: `teams`, `wledFx.enabled`, `recentLocalPlayers`

## Review Focus

1. **Long names on a phone.** A 24-character team name and a long player name in the one-line pill at 390 px should neither wrap nor push the host past 48 px. The text ends in an ellipsis. Live check in Task 5, Step 6.
2. **Two bots of one level on one own-score team.** Both are seated, the lineup holds both seat ids, and neither steals the other's seat. tsx in Task 1 (`resolveSlots`); live in Task 8.
3. **A deleted name must not come back.** Once it's gone from the drawer, the Saved players sync and the site's own Add Player list mustn't bring it back. Live check in Task 8, Step 7.
4. **Switching Teams off while Next Leg is held** (a decided own-score match). Next Leg shows again, and Space and Enter reach the site. Live check in Task 6, Step 5.
5. **The partner card against site re-renders.** The card must come back if React removes it, never twice, and must sit in the right column. Live check in Task 7, Step 6.

---

### Task 1: Teams of one, bots in own-score teams, the member label

**Files:**
- Modify: `utils/teams.ts`:
  - `MIN_PLAYERS`
  - `OwnPick`
  - `checkTeam`
  - `checkOwnTeam`
  - `rejoinProblem`
  - new: `pickSlots`, bot helpers, `memberLabel`
- Test: `$SCR/tests/teams-review.test.mts` (new), plus the expectation changes in `$SCR/tests/teams.test.mts` and `$SCR/tests/teams-own.test.mts`

**Interfaces:**
- Produces:
  - `MIN_PLAYERS = 1`
  - `type OwnPick = { seatId: string; name: string } | { guest: string } | { bot: number; name: string; key: string }`
  - `pickSlots(picks: readonly OwnPick[]): SeatSlot[]`
  - `BOT_LEVELS: readonly number[]`
  - `botPpr(level: number): number`
  - `botName(level: number): string`
  - `hasBots(variant: string | null | undefined): boolean`
  - `BOTS_ONLY_TEXT: string`
  - `memberLabel(place: number, size: number): string`

- [ ] **Step 1: Write the failing tests.** Create `$SCR/tests/teams-review.test.mts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  BOT_LEVELS, MIN_PLAYERS, botName, botPpr, checkOwnTeam, checkTeam, hasBots, memberLabel, normalizeTeams, pickSlots, resolveSlots,
} from "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/utils/teams.ts";

const ocean = { preset: "ocean", from: "#374c98", to: "#0b55df" };

test("a team of one: 2 vs 1 in both formats", () => {
  assert.equal(MIN_PLAYERS, 1);
  const none = { guestNames: [], otherTeamPlayers: [] };
  assert.equal(checkTeam({ name: "TEAM BLUE", players: [ "tobi" ], colour: ocean }, none), undefined);
  assert.equal(checkTeam({ name: "TEAM BLUE", players: [], colour: ocean }, none), "Add at least one player.");
  const context = { seatNames: [], takenSeats: new Set<string>(), teamNames: [], freeSeats: 6 };
  assert.equal(checkOwnTeam({ name: "TEAM BLUE", colour: ocean, picks: [ { guest: "tobi" } ] }, context), undefined);
  assert.equal(checkOwnTeam({ name: "TEAM BLUE", colour: ocean, picks: [] }, context), "Add at least one player.");
  assert.deepEqual(normalizeTeams({ saved: [ { name: "SOLO", players: [ "one" ], colour: ocean } ] }).saved.map(team => team.players), [ [ "ONE" ] ]);
});

test("bots in an own-score team: seats of their own, and a shared name is fine", () => {
  const context = { seatNames: [ "Bot Level 5" ], takenSeats: new Set<string>(), teamNames: [], freeSeats: 2 };
  const twoBots = { name: "TEAM BOTS", colour: ocean, picks: [ { bot: 60, name: "Bot Level 5", key: "b1" }, { bot: 60, name: "Bot Level 5", key: "b2" } ] };
  assert.equal(checkOwnTeam(twoBots, context), undefined, "bots may share a name, with each other and with a bot in the lobby");
  assert.equal(checkOwnTeam({ ...twoBots, picks: [ ...twoBots.picks, { guest: "MIA" } ] }, context), "The lobby has room for 2 more players.");
  assert.deepEqual(pickSlots([ { seatId: "s1", name: "ANNA" }, { guest: " mia " }, { bot: 60, name: "Bot Level 5", key: "b1" } ]), [
    { kind: "seat", seatId: "s1" }, { kind: "guest", name: "MIA" }, { kind: "bot", name: "Bot Level 5", ppr: 60 },
  ]);
});

test("two bots of one level each take one of the new seats", () => {
  const slots = [ { kind: "bot" as const, name: "Bot Level 5", ppr: 60 }, { kind: "bot" as const, name: "Bot Level 5", ppr: 60 } ];
  const players = [ { id: "old", name: "Bot Level 5", cpuPPR: 60 }, { id: "n1", name: "Bot Level 5", cpuPPR: 60 }, { id: "n2", name: "Bot Level 5", cpuPPR: 60 } ];
  assert.deepEqual(resolveSlots(slots, new Set([ "old" ]), players), [ "n1", "n2" ]);
});

test("the site's bot levels", () => {
  assert.equal(BOT_LEVELS.length, 11);
  assert.deepEqual([ botPpr(1), botPpr(5), botPpr(11) ], [ 20, 60, 120 ]);
  assert.equal(botName(5), "Bot Level 5");
  assert.deepEqual([ hasBots("X01"), hasBots("Cricket"), hasBots("Gotcha"), hasBots(undefined) ], [ true, true, false, true ]);
});

test("memberLabel: a place in the team, or nothing for a team of one", () => {
  assert.equal(memberLabel(1, 2), "1 of 2");
  assert.equal(memberLabel(1, 1), "");
});
```

  Then change the old expectations that the new rules break:
  - `teams.test.mts`, "normalizeTeams drops broken entries and cleans the rest": "SOLO" is now kept. Make the names assertion `[ "TEAM RED", "SOLO", "TEAM BLUE", "TEAM GREEN" ]` and move the colour assertions to `out.saved[2]` (custom) and `out.saved[3]` (lime).
  - `teams.test.mts`, "checkTeam says what is wrong, or nothing": replace `assert.match(checkTeam({ ...ok, players: [ "anna" ] }, none)!, /at least 2/);` with `assert.equal(checkTeam({ ...ok, players: [ "anna" ] }, none), undefined);` and `assert.equal(checkTeam({ ...ok, players: [] }, none), "Add at least one player.");`.
  - `teams-own.test.mts`, "checkOwnTeam says what is wrong, or nothing": replace the `[ { guest: "MIA" } ]` → "A team needs at least 2 players." line with `assert.equal(checkOwnTeam({ ...ok, picks: [] }, context), "Add at least one player.");`.

- [ ] **Step 2: Run the tests; they fail.**
  - Run: `npx tsx --test $SCR/tests/*.test.mts 2>&1 | tail -25`
  - Expected: FAIL. `teams-review.test.mts` fails to import `BOT_LEVELS` (not exported), and the three changed old tests fail on the two-player minimum.

- [ ] **Step 3: Implement in `utils/teams.ts`.**
  - `export const MIN_PLAYERS = 1;`
  - `OwnPick`:

```ts
/** A player picked in the drawer: a seat already in the lobby, a name to add as a guest, or a bot to add at a level (its cpuPPR). */
export type OwnPick = { seatId: string; name: string } | { guest: string } | { bot: number; name: string; key: string };
```

  - In `checkTeam`, change `if (players.length < MIN_PLAYERS) return \`A team needs at least ${MIN_PLAYERS} players.\`;` to `if (players.length < MIN_PLAYERS) return "Add at least one player.";`.
  - In `checkOwnTeam`, change the same line (with `draft.picks.length`) the same way. Replace its last check with:

```ts
  // Bots join as seats of their own, as new guests do; bots may share a name.
  const joining = guests.length + draft.picks.filter(pick => "bot" in pick).length;
  if (joining > context.freeSeats) return `The lobby has room for ${context.freeSeats} more ${context.freeSeats === 1 ? "player" : "players"}.`;
  return undefined;
```

  - After `unseated`, add:

```ts
/** The drawer's picks as places to fill: a seat already there, or a guest or a bot to add. */
export function pickSlots(picks: readonly OwnPick[]): SeatSlot[] {
  return picks.map((pick): SeatSlot => {
    if ("seatId" in pick) return { kind: "seat", seatId: pick.seatId };
    if ("bot" in pick) return { kind: "bot", name: pick.name, ppr: pick.bot };
    return { kind: "guest", name: normalizeName(pick.guest) };
  });
}
```

  - After `BOT_VARIANTS`, add:

```ts
/** The site's eleven bot levels, as its Add Bot dialog lists them: level n averages about 10n + 10. */
export const BOT_LEVELS: readonly number[] = [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 ];

/** A level's cpuPPR, the site's measure of how well a bot throws. */
export function botPpr(level: number): number {
  return 10 + 10 * level;
}

/** The name the site gives a bot of that level. */
export function botName(level: number): string {
  return `Bot Level ${level}`;
}

/** Whether a game has bots. One whose variant isn't known yet gets the benefit of the doubt. */
export function hasBots(variant: string | null | undefined): boolean {
  return !variant || BOT_VARIANTS.includes(variant);
}

/** Why the drawer's bots are off. */
export const BOTS_ONLY_TEXT = "Bots only play X01 and Cricket.";
```

  - In `rejoinProblem`, replace `if (!game.variant || BOT_VARIANTS.includes(game.variant) || !slots.some(slot => slot.kind === "bot")) return undefined;` with `if (hasBots(game.variant) || !slots.some(slot => slot.kind === "bot")) return undefined;`.
  - After `unevenText`, add:

```ts
/** A member's place in its own-score team, for the lobby row: "1 of 2", or nothing in a team of one. */
export function memberLabel(place: number, size: number): string {
  return size > 1 ? `${place} of ${size}` : "";
}
```

- [ ] **Step 4: Run the tests; they pass.**
  - Run: `npx tsx --test $SCR/tests/*.test.mts 2>&1 | tail -9`
  - Expected: PASS, 72/72: the 67 from before plus 5 new.

- [ ] **Step 5: Commit.**

```bash
git add utils/teams.ts
git commit -m "feat: a Teams team can be one player, and an own-score team can take new bots"
```

---

### Task 2: The lobby's own partner rule

**Files:**
- Modify: `utils/teams.ts`:
  - `Lineup`
  - `withLineup`
  - new: `withPartnerRule`, `lineupPartnerRule`, `PartnerCard`, `partnerCardState`
- Modify: `utils/websocket-helpers.ts` `asTeamsSee`
- Test: `$SCR/tests/teams-review.test.mts`

**Interfaces:**
- Produces:
  - `Lineup.partnerRule?: boolean`
  - `withLineup(store, lobbyId, teams, now, partnerRule?: boolean): LineupStore`
  - `withPartnerRule(store: LineupStore | undefined, lobbyId: string, on: boolean, now: number): LineupStore`
  - `lineupPartnerRule(lineup: Lineup | undefined, fallback: boolean): boolean`
  - `interface PartnerCard { show: boolean; on: boolean; applies: boolean }`
  - `partnerCardState(lobby: { variant?: string | null; sets?: number | null; players?: readonly SeatLike[] | null }, lineup: Lineup | undefined, saved: readonly SavedTeam[], hostId: string | null | undefined, fallback: boolean): PartnerCard`

- [ ] **Step 1: Write the failing tests.** Append to `teams-review.test.mts`, and add `lineupPartnerRule, partnerCardState, withLineup, withPartnerRule` to its import:

```ts
const ME = "host-1";
const crimson = { preset: "crimson", from: "#6a1624", to: "#b8323f" };
const guest = (id: string, name: string) => ({ id, name, userId: null, hostId: ME, cpuPPR: null });
const RED = { name: "TEAM RED", colour: crimson, seatIds: [ "a1" ] };
const BLUE = { name: "TEAM BLUE", colour: ocean, seatIds: [ "b1" ] };

test("withLineup keeps a lobby's partner rule when it rewrites the teams, and sets it when told", () => {
  const start = withLineup(undefined, "L", [ RED ], 1000, true);
  assert.equal(start.L.partnerRule, true);
  assert.equal(withLineup(start, "L", [ RED, BLUE ], 2000).L.partnerRule, true, "a rewrite keeps it");
  assert.equal(withLineup(start, "L", [ RED ], 2000, false).L.partnerRule, false);
  assert.equal("partnerRule" in withLineup(undefined, "L", [ RED ], 1000).L, false, "none given, none stored");
});

test("withPartnerRule sets the rule on a lineup, and leaves a lobby without one alone", () => {
  const store = withLineup(undefined, "L", [ RED ], 1000);
  assert.equal(withPartnerRule(store, "L", true, 2000).L.partnerRule, true);
  assert.deepEqual(withPartnerRule(store, "OTHER", true, 2000), store);
  assert.deepEqual(withPartnerRule(undefined, "L", true, 2000), {});
});

test("lineupPartnerRule: the lobby's choice, or else the setting", () => {
  assert.equal(lineupPartnerRule({ at: 1, teams: [], partnerRule: false }, true), false);
  assert.equal(lineupPartnerRule({ at: 1, teams: [], partnerRule: true }, false), true);
  assert.equal(lineupPartnerRule({ at: 1, teams: [] }, true), true, "a lineup from before the lobby card");
  assert.equal(lineupPartnerRule(undefined, false), false);
});

test("partnerCardState: X01 with legs and no shared-score team; on as the lobby, or the last lobby, left it", () => {
  const seats = [ guest("a1", "ANNA"), guest("b1", "BEN") ];
  const lineup = { at: 1, teams: [ RED, BLUE ], partnerRule: true };
  const x01 = { variant: "X01", sets: null, players: seats };
  assert.deepEqual(partnerCardState(x01, undefined, [], ME, false), { show: true, on: false, applies: false }, "no teams yet: shown, the last state, not counting yet");
  assert.deepEqual(partnerCardState(x01, lineup, [], ME, false), { show: true, on: true, applies: true });
  assert.equal(partnerCardState({ ...x01, variant: "Cricket" }, lineup, [], ME, true).show, false);
  assert.equal(partnerCardState({ ...x01, sets: 2 }, lineup, [], ME, true).show, false);
  const saved = [ { name: "TEAM RED", players: [ "ANNA", "TOM" ], colour: crimson, format: "shared" as const } ];
  assert.equal(partnerCardState({ ...x01, players: [ guest("t1", "TEAM RED") ] }, undefined, saved, ME, true).show, false, "a shared-score lobby has no partner rule");
  assert.equal(partnerCardState({ ...x01, players: [ ...seats, guest("c1", "CARL") ] }, lineup, [], ME, true).applies, false, "a seat on no team");
});
```

- [ ] **Step 2: Run the tests; they fail.**
  - Run: `npx tsx --test $SCR/tests/*.test.mts 2>&1 | tail -25`
  - Expected: FAIL on the import (`withPartnerRule` not exported).

- [ ] **Step 3: Implement in `utils/teams.ts`.**
  - `Lineup` gains:

```ts
  /** The lobby's partner rule, from its card. A lineup written before the card has none, and goes by the setting. */
  partnerRule?: boolean;
```

  - Replace `withLineup` with:

```ts
/**
 * A lobby's own-score teams written into the store, as plain data. Teams with
 * no seats are dropped, a lobby with no teams has no lineup, and entries older
 * than a day go. The lobby's partner rule is kept unless a new one is given.
 */
export function withLineup(store: LineupStore | undefined, lobbyId: string, teams: readonly LineupTeam[], now: number, partnerRule?: boolean): LineupStore {
  const next: LineupStore = {};
  for (const [ id, entry ] of Object.entries(store ?? {})) {
    if (id !== lobbyId && entry && now - entry.at < SHIFT_TTL_MS) next[id] = entry;
  }
  const kept = teams.filter(team => team.seatIds.length).map(plainLineupTeam);
  const rule = partnerRule ?? store?.[lobbyId]?.partnerRule;
  if (kept.length) next[lobbyId] = rule === undefined ? { at: now, teams: kept } : { at: now, teams: kept, partnerRule: rule };
  return next;
}

/** The lobby card's partner rule written into the lobby's lineup. A lobby with no lineup yet has nothing to hold it; the setting does. */
export function withPartnerRule(store: LineupStore | undefined, lobbyId: string, on: boolean, now: number): LineupStore {
  const lineup = store?.[lobbyId];
  return lineup ? withLineup(store, lobbyId, lineup.teams, now, on) : { ...store };
}

/** Whether a match plays the partner rule: its lobby's choice, or for a lineup from before the lobby card, the setting. */
export function lineupPartnerRule(lineup: Lineup | undefined, fallback: boolean): boolean {
  return lineup?.partnerRule ?? fallback;
}
```

  - After `partnerRuleApplies`, add:

```ts
/** The lobby's partner-rule card. */
export interface PartnerCard {
  /** An X01 lobby playing legs, whose teams, if it has any, keep their own scores. */
  show: boolean;
  on: boolean;
  /** Whether the rule can come in as the lobby stands: two teams, with every seat on one. */
  applies: boolean;
}

/** The card as a lobby stands: the rule is the lobby's own, or the one the last lobby left. */
export function partnerCardState(lobby: { variant?: string | null; sets?: number | null; players?: readonly SeatLike[] | null }, lineup: Lineup | undefined, saved: readonly SavedTeam[], hostId: string | null | undefined, fallback: boolean): PartnerCard {
  const players = lobby.players ?? [];
  const show = lobby.variant === "X01" && !lobby.sets && lobbyFormat(players, lineup, saved, hostId) !== "shared";
  return { show, on: lineupPartnerRule(lineup, fallback), applies: show && partnerRuleApplies({ variant: "X01", players }, lineup) };
}
```

  - In `utils/websocket-helpers.ts`, import `lineupPartnerRule`, and make `asTeamsSee`:

```ts
function asTeamsSee(match: IMatch): IMatch {
  if (!teamsContext) return match;
  const lineup = lineupOf(teamsContext.lineups, match.id);
  return teamView(match, { enabled: teamsContext.enabled, partnerRule: lineupPartnerRule(lineup, teamsContext.partnerRule), lineup });
}
```

  Also change its comment's last sentence to: "The lineup is the frame's own match's, whatever page this tab is on, and so is its partner rule."

- [ ] **Step 4: Run the tests; they pass.**
  - Run: `npx tsx --test $SCR/tests/*.test.mts 2>&1 | tail -9`
  - Expected: PASS, 76/76.

- [ ] **Step 5: Commit.**

```bash
git add utils/teams.ts utils/websocket-helpers.ts
git commit -m "feat: each own-score lobby keeps its own partner rule, and the next one starts from the last"
```

---

### Task 3: What the pill says: one line, with the teams' legs either side

**Files:**
- Modify: `utils/teams.ts` texts:
  - `toThrowText`
  - `decidedText`
  - new: `legWonText`, `PillNote`, `ruleWarningNote`, `ruleBustNote`, `ruleRefusedNote`
  - remove: `warningText`, `bustText`, `undoFailedText`
- Create: `utils/teams-pill.ts`, holding `PillView`, `TallyTeam`, `tallySides`, `sharedPill`, `ownPill`, `OwnPillOptions`
- Test: `$SCR/tests/teams-pill.test.mts` (new); `$SCR/tests/teams-match.test.mts` "the texts"

**Interfaces:**
- Consumes (Task 2): `lineupPartnerRule`, whose value the caller passes as `OwnPillOptions.partnerRule`
- Produces:
  - `legWonText(name: string, language?: string | null): string`
  - `decidedText(team: string, language?: string | null): string`
  - `interface PillNote { primary: string; secondary: string }`
  - `ruleWarningNote(breach: Breach): PillNote`
  - `ruleBustNote(breach: Breach): PillNote`
  - `ruleRefusedNote(breach: Breach): PillNote`
  - in `utils/teams-pill.ts`:
    - `interface TallyTeam { name; legs; from; to }`
    - `interface PillView { turnKey; text; detail; from; to; left: TallyTeam[]; right: TallyTeam[]; target: number; noteKind: "" | "rule" | "bust" }`
    - `tallySides<T>(items: readonly T[]): [T[], T[]]`
    - `sharedPill(match: TeamMatch, seats: ReadonlyMap<number, SavedTeam>, shifts: Readonly<Record<string, number>>, other: { from: string; to: string }, language: string): PillView`
    - `interface OwnPillOptions { other; language; partnerRule: boolean; note?: PillNote }`
    - `ownPill(match: TeamMatch, lineup: Lineup, options: OwnPillOptions): PillView`

- [ ] **Step 1: Write the failing tests.**
  - In `teams-match.test.mts`, change the import's `bustText`, `undoFailedText` and `warningText` to `legWonText`, `ruleBustNote`, `ruleRefusedNote` and `ruleWarningNote`.
  - Replace "the texts" with:

```ts
test("the texts", () => {
  const breach = { player: "ANNA", teammate: "TOM", teammateLeft: 160, opponentsLeft: 140, opponents: [ "BEN", "BOT LEVEL 5" ] };
  assert.deepEqual(ruleWarningNote(breach), { primary: "No checkout this visit", secondary: "TOM has 160 left, more than BEN and BOT LEVEL 5 together (140)" });
  assert.deepEqual(ruleBustNote(breach), { primary: "ANNA's checkout didn't count", secondary: "partner rule" });
  assert.deepEqual(ruleRefusedNote(breach), { primary: "Undo ANNA's checkout yourself", secondary: "it breaks the partner rule, and autodarts didn't take it back" });
  assert.equal(decidedText("TEAM RED"), "TEAM RED wins the match");
  assert.equal(decidedText("TEAM RED", "de-DE"), "TEAM RED gewinnt das Match");
  assert.equal(legWonText("TEAM RED", "en"), "TEAM RED wins the leg");
  assert.equal(legWonText("TEAM RED", "de"), "TEAM RED gewinnt das Leg");
  assert.equal(resultText({ "TEAM RED": 3, "TEAM BLUE": 1 }, "TEAM RED", LINEUP), "3 – 1");
});
```

  - Create `$SCR/tests/teams-pill.test.mts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { ownPill, sharedPill, tallySides } from "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/utils/teams-pill.ts";

const ME = "host-1";
const crimson = { preset: "crimson", from: "#6a1624", to: "#b8323f" };
const ocean = { preset: "ocean", from: "#374c98", to: "#0b55df" };
const other = { from: "#7b2cbf", to: "#e24e67" };
const seat = (id: string, name: string, index: number, cpuPPR: number | null = null) => ({ id, name, index, userId: null, hostId: ME, cpuPPR });
const RED = { name: "TEAM RED", players: [ "ANNA", "TOM" ], colour: crimson, format: "shared" as const };
const BLUE = { name: "TEAM BLUE", players: [ "BEN" ], colour: ocean, format: "shared" as const };
const SHARED = [ seat("s1", "TEAM RED", 0), seat("s2", "TEAM BLUE", 1) ];
const seats = new Map([ [ 0, RED ], [ 1, BLUE ] ]);

test("tallySides: the first half, rounded up, on the left", () => {
  assert.deepEqual(tallySides([ 1, 2 ]), [ [ 1 ], [ 2 ] ]);
  assert.deepEqual(tallySides([ 1, 2, 3 ]), [ [ 1, 2 ], [ 3 ] ]);
  assert.deepEqual(tallySides([ 1 ]), [ [ 1 ], [] ]);
});

test("sharedPill: whose visit it is, in the team's colours", () => {
  const match = { variant: "X01", set: 1, leg: 1, round: 2, player: 0, gameWinner: -1, winner: -1, players: SHARED };
  const pill = sharedPill(match, seats, {}, other, "en");
  assert.equal(pill.text, "TOM to throw", "round 2: ANNA threw round 1");
  assert.equal(pill.detail, "TEAM RED");
  assert.equal(pill.from, crimson.from);
  assert.deepEqual([ pill.left, pill.right, pill.target, pill.noteKind ], [ [], [], 0, "" ]);
  assert.equal(sharedPill({ ...match, player: 1 }, seats, {}, other, "de").text, "BEN ist dran", "a team of one: BEN throws every visit");
});

test("sharedPill: a won leg, and a won match, while the site's Winner panel is up", () => {
  const won = { variant: "X01", set: 1, leg: 1, round: 2, player: 0, gameWinner: 0, winner: -1, players: SHARED };
  const leg = sharedPill(won, seats, {}, other, "en");
  assert.equal(leg.text, "TEAM RED wins the leg");
  assert.equal(leg.detail, "TOM", "the player who checked out");
  assert.equal(sharedPill({ ...won, winner: 0 }, seats, {}, other, "de").text, "TEAM RED gewinnt das Match");
  const withBot = [ SHARED[0], seat("b", "Bot Level 5", 1, 60) ];
  const bot = sharedPill({ ...won, gameWinner: 1, players: withBot }, new Map([ [ 0, RED ] ]), {}, other, "en");
  assert.deepEqual([ bot.text, bot.detail, bot.from ], [ "BOT LEVEL 5 wins the leg", "", other.from ]);
});

const OWN = [ seat("a1", "ANNA", 0), seat("b1", "BEN", 1), seat("a2", "TOM", 2), seat("b2", "MIA", 3) ];
const LINEUP = { at: 1, teams: [ { name: "TEAM RED", colour: crimson, seatIds: [ "a1", "a2" ] }, { name: "TEAM BLUE", colour: ocean, seatIds: [ "b1", "b2" ] } ] };
const own = (over: Record<string, unknown> = {}): any => ({
  id: "m", variant: "X01", set: 1, leg: 1, round: 1, player: 0, legs: 3, sets: null, gameWinner: -1, winner: -1, players: OWN,
  scores: [ { sets: 0, legs: 1 }, { sets: 0, legs: 0 }, { sets: 0, legs: 0 }, { sets: 0, legs: 0 } ], gameScores: [ 121, 121, 121, 121 ], ...over,
});
const options = { other, language: "en", partnerRule: false };

test("ownPill: who's up, with the teams' legs either side", () => {
  const pill = ownPill(own(), LINEUP, options);
  assert.deepEqual([ pill.text, pill.detail, pill.noteKind, pill.target ], [ "ANNA to throw", "TEAM RED", "", 3 ]);
  assert.deepEqual(pill.left.map(team => [ team.name, team.legs ]), [ [ "TEAM RED", 1 ] ]);
  assert.deepEqual(pill.right.map(team => [ team.name, team.legs ]), [ [ "TEAM BLUE", 0 ] ]);
});

test("ownPill: the partner rule's warning takes the pill, in one line", () => {
  // ANNA is up; TOM, her partner, has 160: more than BEN and MIA together (60 + 40).
  const pill = ownPill(own({ gameScores: [ 40, 60, 160, 40 ] }), LINEUP, { ...options, partnerRule: true });
  assert.deepEqual([ pill.noteKind, pill.text, pill.detail ], [ "rule", "No checkout this visit", "TOM has 160 left, more than BEN and MIA together (100)" ]);
  assert.equal(ownPill(own({ gameScores: [ 40, 60, 160, 40 ] }), LINEUP, options).noteKind, "", "with the rule off, no warning");
});

test("ownPill: a bust line wins over the warning, and a decided match over both", () => {
  const note = { primary: "ANNA's checkout didn't count", secondary: "partner rule" };
  const bust = ownPill(own({ gameScores: [ 40, 60, 160, 40 ] }), LINEUP, { ...options, partnerRule: true, note });
  assert.deepEqual([ bust.noteKind, bust.text, bust.detail ], [ "bust", note.primary, note.secondary ]);
  const legs = [ { sets: 0, legs: 2 }, { sets: 0, legs: 0 }, { sets: 0, legs: 1 }, { sets: 0, legs: 0 } ];
  const decided = ownPill(own({ gameWinner: 0, winner: 0, scores: legs }), LINEUP, { ...options, note });
  assert.deepEqual([ decided.text, decided.detail, decided.noteKind ], [ "TEAM RED wins the match", "3 – 0", "" ]);
});

test("ownPill: a won leg names the team, then the player", () => {
  const pill = ownPill(own({ gameWinner: 1 }), LINEUP, options);
  assert.deepEqual([ pill.text, pill.detail, pill.from ], [ "TEAM BLUE wins the leg", "BEN", ocean.from ]);
});
```

- [ ] **Step 2: Run the tests; they fail.**
  - Run: `npx tsx --test $SCR/tests/*.test.mts 2>&1 | tail -25`
  - Expected: FAIL. `teams-pill.ts` doesn't exist, and `ruleWarningNote` isn't exported.

- [ ] **Step 3: Implement the texts in `utils/teams.ts`.** Replace `toThrowText` with the block below, delete `decidedText`, `warningText`, `bustText` and `undoFailedText` at the end of the file, and add the rest:

```ts
function german(language: string | null | undefined): boolean {
  return (language ?? "").toLowerCase().startsWith("de");
}

/** "TOM to throw", in the site's own words for its language (Killer's `game.killer.toThrow`). */
export function toThrowText(player: string, language: string | null | undefined): string {
  return german(language) ? `${player} ist dran` : `${player} to throw`;
}

/** The pill while the site's Winner panel is up for a leg: in the site's language, where "ist dran" is. */
export function legWonText(name: string, language?: string | null): string {
  return german(language) ? `${name} gewinnt das Leg` : `${name} wins the leg`;
}

/** The pill once a team, or a player, has won the match. */
export function decidedText(team: string, language?: string | null): string {
  return german(language) ? `${team} gewinnt das Match` : `${team} wins the match`;
}

/** A partner-rule line in the pill's two parts: the news, then the reason at lower emphasis. */
export interface PillNote {
  primary: string;
  secondary: string;
}

/** While the partner rule stops the player up from checking out. */
export function ruleWarningNote(breach: Breach): PillNote {
  return { primary: "No checkout this visit", secondary: `${breach.teammate} has ${breach.teammateLeft} left, more than ${joinNames(breach.opponents)} together (${breach.opponentsLeft})` };
}

/** After a checkout the partner rule turned into a bust. */
export function ruleBustNote(breach: Breach): PillNote {
  return { primary: `${breach.player}'s checkout didn't count`, secondary: "partner rule" };
}

/** When autodarts refused to take a rule-breaking checkout back. */
export function ruleRefusedNote(breach: Breach): PillNote {
  return { primary: `Undo ${breach.player}'s checkout yourself`, secondary: "it breaks the partner rule, and autodarts didn't take it back" };
}
```

  Keep `resultText` where it is.

- [ ] **Step 4: Create `utils/teams-pill.ts`:**

```ts
/**
 * What the match screen's Teams pill says (entrypoints/match.content/TeamsPill.vue):
 * who's up, a won leg or match, or the partner rule's line. With own scores,
 * the teams' legs go either side of it. Pure, so it runs under tsx; the match
 * script only renders it.
 *
 * It's one line whatever it says. The site sizes the board's column from what's
 * in it, measuring the pill's row at no width at all. Anything that can wrap
 * then stands many lines tall, which shrank the board and let the side cards
 * over it (spec 2026-09-30-teams-review-and-lobby).
 */

import type { Lineup, PillNote, SavedTeam, TeamMatch } from "@/utils/teams";

import { decidedTeam, decidedText, legWonText, lineupTeams, normalizeName, partnerRuleBreach, playerUp, resultText, ruleWarningNote, teamLegs, toThrowText } from "@/utils/teams";

/** A team's legs, beside the pill. */
export interface TallyTeam {
  name: string;
  legs: number;
  from: string;
  to: string;
}

export interface PillView {
  /** Changes whenever what the pill says changes; the text slides in on it. */
  turnKey: string;
  /** Who's up, who won, or the partner rule's news. */
  text: string;
  /** At lower emphasis: the team, the player who checked out, the result, or the rule's reason. */
  detail: string;
  /** The pill's gradient, and its lines' colour. */
  from: string;
  to: string;
  /** Own scores: the teams' legs, either side of the pill. */
  left: TallyTeam[];
  right: TallyTeam[];
  /** "first to N", or 0. */
  target: number;
  /** The pill as a partner-rule line, in place of the gradient. */
  noteKind: "" | "rule" | "bust";
}

interface Colours {
  from: string;
  to: string;
}

type ViewParts = Partial<Omit<PillView, "from" | "to">> & Pick<PillView, "turnKey" | "text"> & { colour: Colours };

function view({ colour, ...parts }: ViewParts): PillView {
  return { detail: "", left: [], right: [], target: 0, noteKind: "", ...parts, from: colour.from, to: colour.to };
}

/** The tally's two sides: the first half of the teams, rounded up, on the left. */
export function tallySides<T>(items: readonly T[]): [ T[], T[] ] {
  const left = Math.ceil(items.length / 2);
  return [ items.slice(0, left), items.slice(left) ];
}

/** A visit's place in the match: set, leg, round and seat. */
function visitKey(match: TeamMatch, seat: number): string {
  return `${match.set}|${match.leg}|${match.round}|${seat}`;
}

/** A shared score: whose visit it is, or whose leg or match. */
export function sharedPill(match: TeamMatch, seats: ReadonlyMap<number, SavedTeam>, shifts: Readonly<Record<string, number>>, other: Colours, language: string): PillView {
  const player = (seat: number) => {
    const team = seats.get(seat);
    return team ? team.players[playerUp(match, seat, team, shifts[team.name] ?? 0)] ?? "" : normalizeName(match.players?.[seat]?.name);
  };
  const won = match.gameWinner ?? -1;
  if (won >= 0) {
    const team = seats.get(won);
    const matchWon = (match.winner ?? -1) >= 0;
    const name = team?.name ?? player(won);
    return view({
      turnKey: `won|${visitKey(match, won)}|${matchWon ? "match" : "leg"}`,
      text: matchWon ? decidedText(name, language) : legWonText(name, language),
      detail: team ? player(won) : "",
      colour: team?.colour ?? other,
    });
  }
  const up = match.player ?? 0;
  const team = seats.get(up);
  const name = player(up);
  return view({ turnKey: `${visitKey(match, up)}|${name}`, text: toThrowText(name, language), detail: team?.name ?? "", colour: team?.colour ?? other });
}

export interface OwnPillOptions {
  /** The colours of a seat on no team: Colors' card, or the site's. */
  other: Colours;
  language: string;
  /** Whether this match plays the partner rule. */
  partnerRule: boolean;
  /** The bust line, while the script shows it: from the bust through the visit after it. */
  note?: PillNote;
}

/** Own scores: the teams' legs round the pill, and who's up, who won, or the partner rule's line. */
export function ownPill(match: TeamMatch, lineup: Lineup, options: OwnPillOptions): PillView {
  const players = match.players ?? [];
  const seats = lineupTeams(players, lineup);
  const legs = teamLegs(match, lineup);
  const [ left, right ] = tallySides(lineup.teams.map(team => ({ name: team.name, legs: legs[team.name] ?? 0, from: team.colour.from, to: team.colour.to })));
  const base = { left, right, target: match.legs ?? 0 };
  const name = (seat: number) => normalizeName(players[seat]?.name);

  // After the deciding leg, even if the players carry on: the match is the team's.
  const decided = match.adtTeams?.decided ?? decidedTeam(match, lineup);
  if (decided) {
    const team = lineup.teams.find(candidate => candidate.name === decided);
    return view({ ...base, turnKey: `decided|${decided}`, text: decidedText(decided, options.language), detail: resultText(legs, decided, lineup), colour: team?.colour ?? options.other });
  }
  const won = match.gameWinner ?? -1;
  if (won >= 0) {
    const team = seats.get(won);
    const matchWon = (match.winner ?? -1) >= 0;
    const winner = team?.name ?? name(won);
    return view({
      ...base,
      turnKey: `won|${visitKey(match, won)}|${matchWon ? "match" : "leg"}`,
      text: matchWon ? decidedText(winner, options.language) : legWonText(winner, options.language),
      detail: team ? name(won) : "",
      colour: team?.colour ?? options.other,
    });
  }
  const up = match.player ?? 0;
  const team = seats.get(up);
  const colour = team?.colour ?? options.other;
  const turnKey = `${visitKey(match, up)}|${name(up)}`;
  // For these visits the rule's line stands in for "ANNA to throw", which the
  // site's own highlight already says with own scores.
  const breach = options.partnerRule ? partnerRuleBreach(match, lineup, up) : undefined;
  const note = options.note ?? (breach ? ruleWarningNote(breach) : undefined);
  if (note) {
    const noteKind = options.note ? "bust" : "rule";
    return view({ ...base, turnKey: `${turnKey}|${noteKind}`, text: note.primary, detail: note.secondary, colour, noteKind });
  }
  return view({ ...base, turnKey, text: toThrowText(name(up), options.language), detail: team?.name ?? "", colour });
}
```

- [ ] **Step 5: Run the tests; they pass.**
  - Run: `npx tsx --test $SCR/tests/*.test.mts 2>&1 | tail -9`
  - Expected: PASS, 83/83: 76 plus 7 in `teams-pill.test.mts`. "The texts" is replaced, not added.
  - `yarn compile` still fails on the match script until Task 5 (it imports the removed texts), so no compile check here.

- [ ] **Step 6: Commit.**

```bash
git add utils/teams.ts utils/teams-pill.ts
git commit -m "feat: what the Teams pill says, worked out in one place: one line, the legs either side, and the winner once a leg is won"
```

---

### Task 4: The drawer's rules for deleting names and blocked saved teams

**Files:**
- Modify: `utils/teams.ts`, adding `forgettableNames`, `LobbyTeams` and `savedTeamProblem`
- Test: `$SCR/tests/teams-review.test.mts`

**Interfaces:**
- Produces:
  - `forgettableNames(offered: readonly string[], saved: readonly SavedTeam[]): string[]`
  - `interface LobbyTeams { playerTeams: Readonly<Record<string, string>>; seatTeams: Readonly<Record<string, string>> }`
  - `savedTeamProblem(team: SavedTeam, lobby: LobbyTeams): string | undefined`

- [ ] **Step 1: Write the failing tests.** Append to `teams-review.test.mts`, and add `forgettableNames, savedTeamProblem` to the import:

```ts
test("forgettableNames: every offered name but a saved team's players", () => {
  const saved = [ { name: "TEAM RED", players: [ "ANNA", "LENA" ], colour: crimson, format: "shared" as const } ];
  assert.deepEqual(forgettableNames([ "x", "ANNA", "Zane", "X" ], saved), [ "X", "ZANE" ]);
});

test("savedTeamProblem: a player already on another team here stops a saved team, a bot never does", () => {
  const shared = { name: "TEAM RED", players: [ "ANNA", "LENA" ], colour: crimson, format: "shared" as const };
  const own = { name: "TEAM RED 2", players: [ "ANNA", "BOT LEVEL 5" ], colour: crimson, format: "own" as const,
    members: [ { name: "ANNA", kind: "guest" as const }, { name: "BOT LEVEL 5", kind: "bot" as const, ppr: 60 } ] };
  const lobby = { playerTeams: { LENA: "TEAM BLUE" }, seatTeams: { "ANNA": "TEAM GREEN", "BOT LEVEL 5": "TEAM GREEN" } };
  assert.equal(savedTeamProblem(shared, lobby), "LENA is already on TEAM BLUE.");
  assert.equal(savedTeamProblem(own, lobby), "ANNA is already on TEAM GREEN.");
  assert.equal(savedTeamProblem({ ...own, players: [ "BOT LEVEL 5" ], members: [ own.members[1] ] }, lobby), undefined, "bots share names: another joins");
  assert.equal(savedTeamProblem(shared, { playerTeams: {}, seatTeams: { LENA: "TEAM BLUE" } }), undefined, "own-score seats don't stop a shared team");
});
```

- [ ] **Step 2: Run the tests; they fail.**
  - Run: `npx tsx --test $SCR/tests/*.test.mts 2>&1 | tail -25`
  - Expected: FAIL on the import.

- [ ] **Step 3: Implement.** After `checkOwnTeam` in `utils/teams.ts`:

```ts
/**
 * The offered names the drawer can delete: all but a saved team's players,
 * who come back with their team however often they're deleted. Deleting the
 * team is how those go.
 */
export function forgettableNames(offered: readonly string[], saved: readonly SavedTeam[]): string[] {
  const kept = new Set(saved.flatMap(team => team.players));
  return uniqueNames(offered).filter(name => !kept.has(name));
}

/** Who stands in a saved team's way in this lobby, by name. */
export interface LobbyTeams {
  /** A shared-score team's player → that team. */
  playerTeams: Readonly<Record<string, string>>;
  /** The name of a seat on an own-score team → that team. */
  seatTeams: Readonly<Record<string, string>>;
}

/**
 * Why a saved team can't join this lobby as it stands, or nothing: one of its
 * players is already on another team here. A bot never is: bots share names,
 * and another one joins.
 */
export function savedTeamProblem(team: SavedTeam, lobby: LobbyTeams): string | undefined {
  const taken = team.format === "own" ? lobby.seatTeams : lobby.playerTeams;
  const people = team.members ? team.members.filter(member => member.kind !== "bot").map(member => member.name) : team.players;
  const player = people.find(name => taken[name] && taken[name] !== team.name);
  return player ? `${player} is already on ${taken[player]}.` : undefined;
}
```

- [ ] **Step 4: Run the tests; they pass.**
  - Run: `npx tsx --test $SCR/tests/*.test.mts 2>&1 | tail -9`
  - Expected: PASS, 85/85.

- [ ] **Step 5: Commit.**

```bash
git add utils/teams.ts
git commit -m "feat: which names the Add Team drawer can delete, and which saved teams can't join as a lobby stands"
```

---

### Task 5: The one-line pill on the match screen

**Files:**
- Rewrite: `entrypoints/match.content/TeamsPill.vue`
- Modify: `entrypoints/match.content/teams.ts`:
  - `PillView` now comes from `utils/teams-pill.ts`
  - the `pill` reactive
  - `readConfig`
  - `applyShared`, `applyOwn`
  - `askUndo`
  - `bustNote`
  - remove `updatePill` and `updateOwnPill`

**Interfaces:**
- Consumes:
  - Task 2: `lineupPartnerRule(lineup, fallback)`
  - Task 3: `sharedPill`, `ownPill`, `PillView`, `TallyTeam`, `ruleBustNote`, `ruleRefusedNote`, `PillNote`

- [ ] **Step 1: Before editing,** check the user's tab isn't on a match, and park mine.
  - Run `curl -s http://127.0.0.1:9222/json/list` and check tab 17's URL.
  - Navigate my tab (18) to `about:blank`.

- [ ] **Step 2: Rewrite `TeamsPill.vue`:**

```vue
<template>
  <div class="adt-teams">
    <!--
      The site's StatusLine and StatusPill (Killer's "TOM to throw"), in the
      throwing team's gradient; with own scores, the teams' legs either side.
      One line, whatever it says: see utils/teams-pill.ts.
    -->
    <div :style="{ '--adt-to': view.to }" class="adt-teams-status">
      <span class="adt-teams-line" aria-hidden="true" />
      <span v-for="team in view.left" :key="team.name" :aria-label="legsLabel(team)" class="adt-teams-tally-team" role="img">
        <i :style="{ backgroundImage: swatch(team) }" /><span class="adt-teams-tally-name">{{ team.name }}</span><b>{{ team.legs }}</b>
      </span>
      <div :class="view.noteKind ? `is-${view.noteKind}` : ''" class="adt-teams-pill" aria-live="polite">
        <TransitionGroup class="adt-teams-layers" name="adt-teams-fade" tag="span" aria-hidden="true">
          <i v-for="layer in layers" :key="layer.key" :style="{ backgroundImage: layer.gradient }" />
        </TransitionGroup>
        <Transition mode="out-in" name="adt-teams-slide">
          <span :key="view.turnKey" class="adt-teams-text">
            <span class="adt-teams-primary">{{ view.text }}</span><span v-if="view.detail" class="adt-teams-detail">{{ view.detail }}</span>
          </span>
        </Transition>
      </div>
      <span v-for="team in view.right" :key="team.name" :aria-label="legsLabel(team)" class="adt-teams-tally-team" role="img">
        <i :style="{ backgroundImage: swatch(team) }" /><span class="adt-teams-tally-name">{{ team.name }}</span><b>{{ team.legs }}</b>
      </span>
      <em v-if="view.target && view.left.length" class="adt-teams-target">first to {{ view.target }}</em>
      <span class="adt-teams-line" aria-hidden="true" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PillView, TallyTeam } from "@/utils/teams-pill";

const props = defineProps<{ view: PillView }>();

/** One layer per gradient; a new one fades in over the one leaving. */
const layers = computed(() => [ {
  key: `${props.view.from}${props.view.to}`,
  gradient: `linear-gradient(to bottom right, ${props.view.from} 0%, ${props.view.to} 100%)`,
} ]);

function swatch(team: TallyTeam) {
  return `linear-gradient(to right, ${team.from}, ${team.to})`;
}

function legsLabel(team: TallyTeam) {
  return `${team.name}, ${team.legs} ${team.legs === 1 ? "leg" : "legs"}`;
}
</script>

<style scoped>
/* Sized by its own width, so the narrow forms follow the row it sits in, not the window. */
.adt-teams { container-type: inline-size; padding-bottom: 8px; font-family: var(--ad-font-body); }
.adt-teams-status {
  display: flex; align-items: center; gap: 10px; height: 40px; width: 100%; box-sizing: border-box; padding: 0 16px;
}
.adt-teams-line {
  flex: 1 1 0; min-width: 0; height: 2px; background-color: var(--adt-to); opacity: .6;
  transition: background-color 450ms var(--ad-ease-standard);
}
.adt-teams-line:first-child { -webkit-mask: linear-gradient(to left, #000, transparent); mask: linear-gradient(to left, #000, transparent); }
.adt-teams-line:last-child { -webkit-mask: linear-gradient(to right, #000, transparent); mask: linear-gradient(to right, #000, transparent); }
.adt-teams-pill {
  position: relative; isolation: isolate; overflow: hidden; display: flex; align-items: center;
  flex: 0 1 auto; min-width: 0; height: 40px; box-sizing: border-box; padding: 0 22px; border-radius: 999px;
  background: var(--ad-ink-750); color: #f7f8fa; font-size: 16px; font-weight: 700; line-height: 20px; white-space: nowrap;
  transition: color 300ms var(--ad-ease-standard), box-shadow 300ms var(--ad-ease-standard);
}
/* The partner rule's lines: dark, ringed and coloured as the old note line was. */
.adt-teams-pill.is-rule { color: #ffd27a; box-shadow: inset 0 0 0 1.5px rgb(255 190 60 / 55%); }
.adt-teams-pill.is-bust { color: #ffb4b4; box-shadow: inset 0 0 0 1.5px rgb(255 90 90 / 60%); }
.adt-teams-layers { position: absolute; inset: 0; z-index: -1; transition: opacity 300ms var(--ad-ease-standard); }
.adt-teams-pill.is-rule .adt-teams-layers, .adt-teams-pill.is-bust .adt-teams-layers { opacity: 0; }
.adt-teams-layers i { position: absolute; inset: 0; }
.adt-teams-text { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
.adt-teams-primary { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
/* The detail gives way first. */
.adt-teams-detail { flex: 0 1000 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; font-size: 13px; font-weight: 600; opacity: .75; }
.adt-teams-tally-team {
  flex: none; display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 11px 0 9px; box-sizing: border-box;
  border-radius: 999px; background: var(--ad-ink-800); color: #f7f8fa; font-size: 12px; font-weight: 800; white-space: nowrap;
}
.adt-teams-tally-team i { width: 9px; height: 9px; border-radius: 3px; }
.adt-teams-tally-team b { font-size: 15px; }
.adt-teams-target { flex: none; font-style: normal; font-size: 11px; font-weight: 700; color: #a1a1a1; white-space: nowrap; }
@container (max-width: 639px) {
  .adt-teams-target { display: none; }
}
@container (max-width: 519px) {
  .adt-teams-tally-name { display: none; }
  .adt-teams-tally-team { padding: 0 10px 0 9px; }
  .adt-teams-pill { padding: 0 16px; }
  .adt-teams-pill:not(.is-rule, .is-bust) .adt-teams-detail { display: none; }
}
.adt-teams-fade-enter-active, .adt-teams-fade-leave-active { transition: opacity 450ms var(--ad-ease-standard); }
.adt-teams-fade-enter-from, .adt-teams-fade-leave-to { opacity: 0; }
.adt-teams-slide-enter-active { transition: transform 380ms var(--ad-ease-standard), opacity 380ms var(--ad-ease-standard); }
.adt-teams-slide-leave-active { transition: opacity 120ms linear; }
.adt-teams-slide-enter-from { transform: translateY(120%); opacity: 0; }
.adt-teams-slide-leave-to { opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .adt-teams-line, .adt-teams-pill, .adt-teams-layers, .adt-teams-fade-enter-active, .adt-teams-fade-leave-active,
  .adt-teams-slide-enter-active, .adt-teams-slide-leave-active { transition: none; }
}
</style>
```

- [ ] **Step 3: Edit `entrypoints/match.content/teams.ts`.**
  - **Imports:**
    - `import type { PillView } from "@/utils/teams-pill";`
    - `import { ownPill, sharedPill } from "@/utils/teams-pill";`
    - from `@/utils/teams`, drop `bustText`, `decidedText`, `partnerRuleApplies`, `partnerRuleBreach`, `resultText`, `toThrowText`, `undoFailedText` and `warningText`
    - add `lineupPartnerRule`, `ruleBustNote` and `ruleRefusedNote`, and keep the rest
    - add `type PillNote` to the `@/utils/teams` type import
  - **Replace** the local `PillView` interface and the `pill` reactive with:

```ts
const pill = reactive<PillView>({ turnKey: "", text: "", detail: "", ...SITE_CARD, left: [], right: [], target: 0, noteKind: "" });
```

  - **Replace** `let partnerRule = false;` with:

```ts
/** The partner rule for a lineup that has none of its own: the last one set in a lobby. */
let partnerRuleDefault = false;
```

  - **`bustNote`** becomes `let bustNote: { note: PillNote; bustTurn: string; shownFor?: string } | undefined;`, and its comment stays.
  - **`readConfig`:** `partnerRuleDefault = teamsConfig.partnerRule;`
  - **In `applyShared`,** replace `updatePill(upTeam, up, shifts[upTeam?.name ?? ""] ?? 0);` with `Object.assign(pill, sharedPill(match, seats, shifts, otherCard, siteLanguage()));`.
  - **In `applyOwn`,** replace `updateOwnPill(lineup, upTeam, up, decided);` with:

```ts
  Object.assign(pill, ownPill(match!, lineup, { other: otherCard, language: siteLanguage(), partnerRule: lineupPartnerRule(lineup, partnerRuleDefault), note: shownBustNote(up) }));
```

  - **In `askUndo`,** build `const note = { note: ruleBustNote(bust.breach), bustTurn: turnKeyOf(bust.seat) };`, and in `settle` set `note.note = ruleRefusedNote(bust.breach);`.
  - **Delete** `updatePill` and `updateOwnPill`, and add:

```ts
/**
 * The bust's line, from the busted visit, whose frames go on arriving while
 * the undo runs, through the visit after it. It goes when the next one comes up.
 */
function shownBustNote(up: number): PillNote | undefined {
  if (!bustNote) return undefined;
  const turn = turnKeyOf(up);
  const onBustVisit = turn === bustNote.bustTurn;
  if (!onBustVisit) bustNote.shownFor ??= turn;
  if (onBustVisit || bustNote.shownFor === turn) return bustNote.note;
  bustNote = undefined;
  return undefined;
}
```

- [ ] **Step 4: Compile and lint.**
  - Run: `yarn compile 2>&1 | grep -c "error TS"`. Expected: `14` (the baseline).
  - Run: `yarn compile 2>&1 | grep -E "teams|TeamsPill"`. Expected: nothing.
  - Run: `npx eslint entrypoints/match.content/teams.ts entrypoints/match.content/TeamsPill.vue utils/teams-pill.ts utils/teams.ts`. Expected: no errors.

- [ ] **Step 5: Live check: the table.** Wait for the dev build (`.output/chrome-mv3-dev` mtime).
  - Start a fresh 2 v 2 own-score match: `mkown.sh 3 121 RED:ANNA BLUE:TOBI RED:LENA BLUE:MIA`, then start it.
  - Load it in my tab.
  - Play `S1,S1,S1 T20,T16,S1 S1,S1,S1 T20,T16,S1` with `play2.mjs` to reach the warning. The rule is on in the test config.
  - Run `shotm.mjs` at 1920×1080, 1180×820, 820×1180 and 390×844.
  - Expected:
    - the pill host is 48 px tall at every size
    - the wide layout's centre column (the `grid … grid-rows-[auto_minmax(0,1fr)_auto]` element) is as wide as the board, and no card overlaps the board
    - the pill reads "No checkout this visit" in amber with the reason at the 1920 size
    - the tally chips flank it
    - the screenshots are read and compared by eye

- [ ] **Step 6: Live check: long names on a phone (Review Focus 1).**
  - Run `mkown.sh 3 121 "RED:CHRISTOPHER-ALEXANDRA" BLUE:TOBI`. Rename the lineup's teams with `lineup.mjs` to the 24-character `TEAM QWELLCODE CHAMPIONS`, start, and load at 390×844.
  - Expected: the host is 48 px, the pill's right edge is at most the row's, and the primary text ends in an ellipsis.

- [ ] **Step 7: Commit.**

```bash
git add entrypoints/match.content/TeamsPill.vue entrypoints/match.content/teams.ts
git commit -m "fix: the Teams pill is one line, the legs either side, the partner rule inside it, so the board keeps its size and the cards stay off it"
```

---

### Task 6: Cards gain no rows above the board, and Teams follows its switch in a match

**Files:**
- Modify: `entrypoints/match.content/teams.ts`:
  - `renderOrder`, `renderLegs`
  - new `aboveBoard`
  - `readConfig`, `apply`
  - `teams()` / `onRemove`, for `resize`

**Interfaces:**
- Consumes: `SELECTORS.match.smallScoreCard`, `SELECTORS.match.turnBarRow`, which already exist

- [ ] **Step 1: Before editing:** the user's tab isn't on a match, and mine is at `about:blank`.

- [ ] **Step 2: Edit.**
  - **`renderOrder` starts:**

```ts
function renderOrder(card: HTMLElement, team: SavedTeam, seat: number, index: number, throwing: boolean) {
  const current = card.querySelector<HTMLElement>(":scope .adt-team-order");
  // A top-bar cell takes no chips: it would stand taller than the seats beside
  // it, with the band's colour showing under those, and the board would shrink.
  if (card.matches(anyOf(SELECTORS.match.smallScoreCard))) {
    current?.remove();
    return;
  }
  const small = card.getBoundingClientRect().width < NARROW_CARD_PX;
  const key = `${team.players.join(",")}|${index}|${throwing ? 1 : 0}|${small ? 1 : 0}`;
  if (current?.dataset.key === key) return;
```

  and continues from `const nameRow = …` as before.
  - **`renderLegs` starts:**

```ts
function renderLegs(card: HTMLElement, team: LineupTeam, legs: number) {
  const current = card.querySelector<HTMLElement>(`:scope .${LEGS_CLASS}`);
  // Only on a card beside the board. Above it, in the stacked and phone
  // layouts, a row more is that much less board, and the pill's tally has
  // the legs anyway.
  if (card.matches(anyOf(SELECTORS.match.smallScoreCard)) || aboveBoard(card)) {
    current?.remove();
    return;
  }
  const key = `${team.name}|${legs}`;
  if (current?.dataset.key === key) return;
```

  and continues from `const nameRow = …` as before.
  - **Add:**

```ts
/** Whether a card sits above the board, the turn bar's row being the site's own marker for where the board starts. */
function aboveBoard(card: HTMLElement): boolean {
  const bar = qs<HTMLElement>(SELECTORS.match.turnBarRow);
  return Boolean(bar) && card.getBoundingClientRect().bottom <= bar!.getBoundingClientRect().top + 1;
}
```

  - **Enabled:** `let enabled = true;` next to `saved`. In `readConfig`, `enabled = teamsConfig.enabled;`. `apply` starts:

```ts
function apply() {
  // Switched off in the settings: nothing of Teams on the page, until it's switched on again.
  if (!enabled) {
    clear();
    return;
  }
```

  - **Resize:** in `teams()`, next to the observer:

```ts
  // The layout changes with the window, and the legs chip depends on it.
  window.removeEventListener("resize", schedule);
  window.addEventListener("resize", schedule);
```

  In `onRemove`, `window.removeEventListener("resize", schedule);`.

- [ ] **Step 3: Compile and lint** as in Task 5, Step 4. Expected: 14 errors, none in the files touched, and ESLint clean.

- [ ] **Step 4: Live check: the table and the top bar.**
  - For each match below, run `shotm.mjs` at the four sizes:
    - own scores 2 v 2 (on, warning up)
    - shared score, two teams and a bot (`mkown.sh` with `NOLINEUP=1`, `"TEAM RED" BOT:40 "TEAM BLUE"`)
  - Expected on a phone:
    - own scores 2 v 2 board ≈ 214 px (the spec's estimate; it was 120)
    - shared score with a bot ≈ 183 px (it was 150)
    - every top-bar cell the same height, measured from their boxes
    - no `.adt-team-order` or `.adt-team-legs` in any `smallScoreCard`
    - the wide layout's own-score cards still carry the legs chip

- [ ] **Step 5: Live check: the switch (Review Focus 4).**
  - Take an own-score match to the decided state (legs 2: ANNA wins leg 1, LENA leg 2).
  - `storage.mjs set teams.enabled false`.
  - Expected:
    - the pill, the chips and `[data-adt-team]` are gone within a frame
    - the `teams-match-hold` style is gone, and the site's Next Leg is visible again
    - a CDP `Input.dispatchKeyEvent` Space reaches the page: a page-world keydown listener logs it
  - `storage.mjs set teams.enabled true`. Expected: all of it comes back, and the hold with it.

- [ ] **Step 6: Commit.**

```bash
git add entrypoints/match.content/teams.ts
git commit -m "fix: Teams adds no row to top-bar cells or to cards above the board, and a match follows Teams being switched off"
```

---

### Task 7: The partner-rule card on the lobby page, and the lobby's other fixes

**Files:**
- Modify: `utils/selectors.ts`, adding `lobby.switchCard` and `lobby.gameCard`
- Modify: `entrypoints/lobby.content/teams.ts`:
  - `LOBBY_CSS`
  - `readConfig`, `apply`
  - new: `teardown`, `writeLineup`, `teamLabel`, `syncPartnerCard`, `buildPartnerCard`, `renderPartnerCard`, `setPartnerRule`
  - `onRemove`
- Modify: `components/Settings/Teams.vue`, removing the Options section and changing the intro

**Interfaces:**
- Consumes:
  - Task 1: `memberLabel`
  - Task 2: `withPartnerRule`, `lineupPartnerRule`, `partnerCardState`, `PartnerCard`

- [ ] **Step 1: Before editing:** the user's tab isn't on a match, and mine is at `about:blank`.

- [ ] **Step 2: `utils/selectors.ts`,** after `playerNameColumn` in `lobby`:

```ts
    /**
     * The lobby page's switch cards: Autoscoring, measured 2026-09-30. A card
     * whose header holds a Base UI switch. Teams' partner-rule card copies it,
     * and goes after it.
     */
    switchCard: [ "main [data-slot='card']:not(#adt-partner-rule):has(> [data-slot='card-header'] [data-slot='switch'])" ],
    /** The game's own card, with its Edit settings gear: where the partner-rule card goes when there's no switch card. */
    gameCard: [ "main [data-slot='card']:has(button [data-icon='gear'])" ],
```

- [ ] **Step 3: `entrypoints/lobby.content/teams.ts`.**
  - **Imports:**
    - from `@/utils/teams`, add `lineupPartnerRule`, `memberLabel`, `partnerCardState` and `withPartnerRule`
    - add `type PartnerCard` to the type import
  - **Constants:**

```ts
const PARTNER_CARD_ID = "adt-partner-rule";
const PARTNER_TEXT = "Own-score teams in X01: nobody may check out while a teammate has more left than both opponents together. A checkout that breaks it is a bust.";
const PARTNER_PENDING_TEXT = "It counts once there are two own-score teams and everyone is on one.";
```

  - **`LOBBY_CSS` gains:**

```css
  /* With Add Team there are three buttons: on a narrow screen they wrap rather than clip their labels. */
  div:has(> #${BUTTON_ID}) { flex-wrap: wrap; }
  div:has(> #${BUTTON_ID}) > button { min-width: max-content; }
  /* The partner rule's card goes under Autoscoring, the page's other switch, in the right-hand column. */
  @media (width >= 48rem) {
    div:has(> #${PARTNER_CARD_ID}[data-adt-beside]) { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); grid-template-rows: auto 1fr; align-items: start; }
    div:has(> #${PARTNER_CARD_ID}[data-adt-beside]) > :first-child { grid-row: span 2; }
  }
  #${PARTNER_CARD_ID} [data-adt-line][hidden] { display: none; }
  /* With no Autoscoring card to copy: the same card in the site's measured styles. */
  #${PARTNER_CARD_ID}[data-adt-fallback] { display: flex; flex-direction: column; gap: 12px; padding: 20px; border-radius: 18px; background: rgb(27 31 41); color: #f7f8fa; }
  #${PARTNER_CARD_ID}[data-adt-fallback] > div:first-child { display: flex; gap: 16px; align-items: flex-start; }
  #${PARTNER_CARD_ID}[data-adt-fallback] > div:first-child > div { flex: 1; font-family: "Bebas Neue", var(--ad-font-display, sans-serif); font-size: 24px; line-height: 1.2; }
  #${PARTNER_CARD_ID}[data-adt-fallback] > div:last-child { display: flex; flex-direction: column; gap: 16px; }
  #${PARTNER_CARD_ID}[data-adt-fallback] > div:last-child > span { font-size: 12px; font-weight: 600; line-height: 16px; color: rgb(184 188 197); }
  #${PARTNER_CARD_ID}[data-adt-fallback] [role="switch"] { position: relative; flex: none; width: 51px; height: 24px; border-radius: 999px; background: #16181c; box-shadow: inset 0 0 0 1px rgb(55 76 152 / 60%); cursor: pointer; }
  #${PARTNER_CARD_ID}[data-adt-fallback] [role="switch"][aria-checked="true"] { background: #0b55df; box-shadow: none; }
  #${PARTNER_CARD_ID}[data-adt-fallback] [role="switch"] > span { position: absolute; top: 3px; left: 3px; width: 28px; height: 18px; border-radius: 999px; background: #fff; transition: transform 150ms; }
  #${PARTNER_CARD_ID}[data-adt-fallback] [role="switch"][aria-checked="true"] > span { transform: translateX(17px); }
```

  - **State:** next to `saved`, add `let enabled = true;` and `/** The partner rule the next lobby starts from: the last one set. */ let partnerRuleDefault = false;`. `readConfig` becomes:

```ts
function readConfig(config: any) {
  const teamsConfig = normalizeTeams(config?.teams);
  enabled = teamsConfig.enabled;
  saved = teamsConfig.saved;
  partnerRuleDefault = teamsConfig.partnerRule;
  savedPlayers = Array.isArray(config?.recentLocalPlayers?.players) ? config.recentLocalPlayers.players : [];
}
```

  - **`apply` and `teardown`:**

```ts
function apply() {
  // Switched off in the settings: nothing of Teams in the lobby, until it's switched on again.
  if (!enabled) {
    teardown();
    return;
  }
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
  syncPartnerCard(lineup);
}

/** Everything Teams draws in the lobby, taken out, and the drawer closed. */
function teardown() {
  closeDrawer();
  document.getElementById(BUTTON_ID)?.remove();
  document.getElementById(NOTE_ID)?.remove();
  document.getElementById(PARTNER_CARD_ID)?.remove();
  for (const row of document.querySelectorAll<HTMLElement>(`[${ROW_ATTR}]`)) undress(row);
}
```

  - **`onRemove`:** replace its `closeDrawer()`, the two `getElementById(…).remove()` lines and the undress loop with one `teardown();` call.
  - **`writeLineup`:**

```ts
async function writeLineup(teams: readonly LineupTeam[]) {
  if (!lobby) return;
  // A lobby's first team takes the partner rule the last lobby left; later writes keep its own.
  lineups = withLineup(lineups, lobby.id, teams, Date.now(), lineupPartnerRule(currentLineup(), partnerRuleDefault));
  await AutodartsToolsTeamLineups.setValue(lineups);
}
```

  - **`teamLabel`:** its count part becomes:

```ts
  const order = memberLabel(place, team.seatIds.length);
  // The space is for screen readers: the flex gap already spaces the parts on screen.
  if (order) {
    const count = document.createElement("small");
    count.textContent = order;
    label.append(swatch, team.name, " ", count);
  } else {
    label.append(swatch, team.name);
  }
```
  - **The card:**

```ts
// ------------------------------------------------------------ partner rule

/**
 * The partner rule, as a switch card beside the site's Autoscoring on the
 * lobby page, where the game is set up. Each lobby keeps its own, and the next
 * one starts from the last set (utils/teams.ts `partnerCardState`).
 */
function syncPartnerCard(lineup: Lineup | undefined) {
  const existing = document.getElementById(PARTNER_CARD_ID);
  const state = lobby && isHost() ? partnerCardState(lobby, lineup, saved, hostId, partnerRuleDefault) : undefined;
  if (!state?.show) {
    existing?.remove();
    return;
  }
  // After the last switch card, in its row, or failing that, under the game's
  // own card, in its column; only the first makes the row two columns.
  const switchCard = [ ...qsa<HTMLElement>(SELECTORS.lobby.switchCard) ].at(-1);
  const anchor = switchCard ?? qs<HTMLElement>(SELECTORS.lobby.gameCard);
  if (!anchor) return;
  const card = existing ?? buildPartnerCard(switchCard ?? null);
  card.toggleAttribute("data-adt-beside", Boolean(switchCard));
  if (anchor.nextElementSibling !== card) anchor.after(card);
  renderPartnerCard(card, state);
}

/** A shallow copy of one of the site's elements, so it keeps the site's styling; or a plain one when there's nothing to copy. */
function copyOf<K extends keyof HTMLElementTagNameMap>(source: Element | null | undefined, tag: K): HTMLElementTagNameMap[K] {
  const copy = (source ? source.cloneNode(false) : document.createElement(tag)) as HTMLElementTagNameMap[K];
  copy.removeAttribute("id");
  return copy;
}

/**
 * The card, as a copy of the site's Autoscoring card: its card, header, title
 * and line, and its switch, which Base UI drives there and this drives here.
 * With no card to copy, the same thing in the site's measured styles (LOBBY_CSS).
 */
function buildPartnerCard(template: HTMLElement | null): HTMLElement {
  const header = template?.querySelector(":scope > [data-slot='card-header']");
  const siteSwitch = header?.querySelector("[data-slot='switch']");
  const content = template?.querySelector(":scope > [data-slot='card-content']");
  const line = content?.querySelector("span");

  const card = copyOf(template, "div");
  card.id = PARTNER_CARD_ID;
  if (!template) card.dataset.adtFallback = "";
  const head = copyOf(header, "div");
  const title = copyOf(header?.querySelector("[data-slot='card-title']"), "div");
  title.textContent = "Partner rule";
  const toggle = copyOf(siteSwitch, "span");
  toggle.append(copyOf(siteSwitch?.querySelector("[data-slot='switch-thumb']"), "span"));
  toggle.setAttribute("role", "switch");
  toggle.setAttribute("aria-label", "Partner rule");
  toggle.tabIndex = 0;
  toggle.addEventListener("click", () => {
    setPartnerRule(toggle.getAttribute("aria-checked") !== "true").catch(e => console.error(e));
  });
  toggle.addEventListener("keydown", (event) => {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    toggle.click();
  });
  head.append(title, toggle);
  const body = copyOf(content, "div");
  const text = copyOf(line, "span");
  text.textContent = PARTNER_TEXT;
  const pending = copyOf(line, "span");
  pending.dataset.adtLine = "pending";
  pending.textContent = PARTNER_PENDING_TEXT;
  body.append(text, pending);
  card.append(head, body);
  return card;
}

/** The switch as the site draws its own: its data attributes pick the colours, and the thumb follows. */
function renderPartnerCard(card: HTMLElement, state: PartnerCard) {
  const toggle = card.querySelector<HTMLElement>("[role='switch']");
  if (!toggle) return;
  for (const part of [ toggle, toggle.firstElementChild ]) {
    part?.toggleAttribute("data-checked", state.on);
    part?.toggleAttribute("data-unchecked", !state.on);
  }
  if (toggle.getAttribute("aria-checked") !== String(state.on)) toggle.setAttribute("aria-checked", String(state.on));
  const pending = card.querySelector<HTMLElement>("[data-adt-line='pending']");
  if (pending) pending.hidden = !state.on || state.applies;
}

/** The card's switch: this lobby's rule, and the one the next lobby starts from. */
async function setPartnerRule(on: boolean) {
  partnerRuleDefault = on;
  if (lobby && currentLineup()) lineups = withPartnerRule(lineups, lobby.id, on, Date.now());
  syncPartnerCard(currentLineup());
  if (lobby && currentLineup()) await AutodartsToolsTeamLineups.setValue(lineups);
  const config = await AutodartsToolsConfig.getValue();
  await AutodartsToolsConfig.setValue({ ...config, teams: { ...normalizeTeams(config.teams), partnerRule: on } });
}
```

- [ ] **Step 4: `components/Settings/Teams.vue`.**
  - Delete the `<section class="mb-10">` Options block and the `OptionRow` import.
  - Replace the intro paragraph's text with:

    Play in teams two ways. With a shared score, a team is one player on your board and its players take turns on it, like steel-tip doubles. When someone else steps up, tap their name on the team's card. With own scores, everyone keeps their own score and a leg counts for their team, and a bot can play on a team. A team can be a single player, for 2 vs 1. Own-score teams in X01 can play the partner rule: switch it on the lobby page, next to Autoscoring. Add teams in a lobby you host with <b class="text-[var(--ad-text-primary)]">Add Team</b>, next to Add Player and Add Bot.

- [ ] **Step 5: Compile and lint.**
  - `yarn compile` gives 14 errors, none in the files touched.
  - Run ESLint on `entrypoints/lobby.content/teams.ts`, `utils/selectors.ts` and `components/Settings/Teams.vue`.
  - Compile the SFC first (`node $SCR/sfc-check.cjs components/Settings/Teams.vue`; see [[sfc-parse-error-looks-like-dead-watcher]]).

- [ ] **Step 6: Live check: the card (Review Focus 5).** Use a fresh lobby with `mkown.sh` and `NOLINEUP=1`, then 2 v 2 with a lineup.
  - At 1440×900, the card is in the right column under Autoscoring: its x equals Autoscoring's x, and its top is Autoscoring's bottom + 24.
  - At 390×844, it comes after Autoscoring.
  - Clicking the switch flips `aria-checked` and writes `teams.partnerRule` and the lineup's `partnerRule`.
  - A second lobby starts from the last state.
  - Removing the card from the page (`document.getElementById("adt-partner-rule").remove()`) brings it back on the next mutation, and there's exactly one.
  - A match started from that lobby follows the lobby's value, even after the setting is changed from another lobby.
  - The card doesn't show:
    - in a lobby with shared-score teams
    - in Cricket (`mkl.sh`)
    - with sets
  - It goes when Teams is switched off.

- [ ] **Step 7: Live check: the row of buttons, and the one-player label.**
  - At 390 px: Add Player and Add Bot are on one line and Add Team is full-width below, with no button's `scrollWidth` above its `clientWidth`.
  - At 1440: one row of three, as before.
  - A 2 v 1 own-score lobby's single member reads `TEAM BLUE`.

- [ ] **Step 8: Commit.**

```bash
git add utils/selectors.ts entrypoints/lobby.content/teams.ts components/Settings/Teams.vue
git commit -m "feat: the partner rule is a switch on the lobby page, remembered for the next lobby; the phone's add buttons wrap; a team of one has no 1 of 1"
```

---

### Task 8: The drawer: saved teams first with delete, names you can delete, bots, and the hints

**Files:**
- Create: `entrypoints/lobby.content/NameChip.vue`
- Modify:
  - `entrypoints/lobby.content/AddTeamDrawer.vue`
  - `entrypoints/lobby.content/teams.ts`: `DrawerState`, `drawerContext`, `forgetName`, `deleteSavedTeam`, `refreshDrawer`, `submitOwnTeam`
  - `utils/lobby-guests.ts` `addBot`

**Interfaces:**
- Consumes:
  - Task 1: `pickSlots`, `BOT_LEVELS`, `botPpr`, `botName`, `hasBots`, `BOTS_ONLY_TEXT`, `OwnPick` (bot)
  - Task 4: `forgettableNames`, `savedTeamProblem`
- Produces: `DrawerState` gains `forgettable: string[]`, `savedProblems: Record<string, string>`, `botsOk: boolean`, `forget(name: string): Promise<void>` and `deleteSaved(team: SavedTeam): Promise<void>`

- [ ] **Step 1: Before editing:** the user's tab isn't on a match, and mine is at `about:blank`.

- [ ] **Step 2: Create `NameChip.vue`:**

```vue
<template>
  <!--
    A name to tap, and when it can go, its ✕. Deleting takes two clicks, the
    second on the red "Delete" the chip turns into for four seconds, as the
    settings' deletes do (components/Settings/Library/ConfirmDeleteButton.vue).
    The red button keeps focus where it is: Safari and Firefox on macOS take
    focus off a clicked button on mousedown, which would disarm it first.
  -->
  <span class="adt-chip">
    <button
      @blur="disarm"
      @click="confirm"
      @keydown.esc="disarm"
      @mousedown.prevent
      v-if="armed"
      ref="confirmButton"
      class="adt-chip-confirm"
      type="button"
    >
      Delete {{ name }}
    </button>
    <template v-else>
      <button @click="emit('add')" :class="[{ 'has-forget': forgettable }]" :disabled="disabled" :title="team ? `On ${team}` : `Add ${name}`" class="adt-chip-add" type="button">
        {{ name }}<small v-if="team">{{ team }}</small>
      </button>
      <button @click="arm" v-if="forgettable" :aria-label="`Delete ${name}`" class="adt-chip-forget" title="Delete this name" type="button">
        <span class="icon-[material-symbols--close-rounded] size-4" aria-hidden="true" />
      </button>
    </template>
  </span>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  name: string;
  /** The other team the player is on, which greys the chip out. */
  team?: string;
  disabled?: boolean;
  /** Whether the name can be deleted: not while a saved team has it. */
  forgettable?: boolean;
}>(), {
  team: "",
  disabled: false,
  forgettable: false,
});

const emit = defineEmits<{ add: []; forget: [] }>();

const armed = ref(false);
const confirmButton = ref<HTMLButtonElement>();
let timer: ReturnType<typeof setTimeout> | undefined;

onBeforeUnmount(() => clearTimeout(timer));

async function arm() {
  armed.value = true;
  clearTimeout(timer);
  timer = setTimeout(disarm, 4000);
  await nextTick();
  confirmButton.value?.focus();
}

function disarm() {
  armed.value = false;
  clearTimeout(timer);
}

function confirm() {
  disarm();
  emit("forget");
}
</script>

<style scoped>
.adt-chip { position: relative; display: inline-flex; }
/* the saved-player chips, like the Saved players strip */
.adt-chip-add {
  display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px;
  border-radius: 10px; background: var(--ad-ink-750); color: var(--ad-text-primary);
  font-size: 13px; font-weight: 700;
}
.adt-chip-add.has-forget { padding-right: 32px; }
.adt-chip-add:hover:not(:disabled) { background: var(--ad-ink-700); }
.adt-chip-add:disabled { opacity: .4; cursor: not-allowed; }
.adt-chip-add small { font-size: 11px; font-weight: 600; color: var(--ad-text-muted); }
.adt-chip-forget {
  position: absolute; top: 4px; right: 4px; display: grid; place-items: center; width: 22px; height: 22px;
  border-radius: 7px; color: var(--ad-text-muted);
}
.adt-chip-forget:hover { color: var(--ad-rose-500); background: color-mix(in srgb, var(--ad-rose-500) 14%, transparent); }
.adt-chip-confirm {
  height: 30px; padding: 0 12px; border-radius: 10px; background: var(--ad-danger); color: var(--ad-white);
  font-size: 13px; font-weight: 700; white-space: nowrap;
}
.adt-chip-add:focus-visible, .adt-chip-forget:focus-visible, .adt-chip-confirm:focus-visible { outline: none; box-shadow: var(--ad-focus-ring); }
</style>
```

- [ ] **Step 3: `AddTeamDrawer.vue`.**
  - **Imports:**
    - `import ConfirmDeleteButton from "@/components/Settings/Library/ConfirmDeleteButton.vue";`
    - `import NameChip from "./NameChip.vue";`
    - from `@/utils/teams`, add `BOTS_ONLY_TEXT`, `BOT_LEVELS`, `botName` and `botPpr`
  - **Script additions:**

```ts
const botLevel = ref(5);
/** Tells two new bots of one level apart in the list. */
let botCount = 0;
/** The chips a ✕ can delete. */
const forgettable = computed(() => new Set(props.state.forgettable));
```

  - Replace `onMounted(() => nameInput.value?.focus());` with:

```ts
onMounted(() => {
  // The keyboard comes up only for a mouse and keys, and only when there's no
  // saved team to tap first: on a phone it covered half the sheet at once.
  // Focus still moves into the dialog either way.
  if (!props.state.savedTeams.length && matchMedia("(pointer: fine)").matches) nameInput.value?.focus();
  else panel.value?.focus();
});
```

  - Replace `pickKey`, `pickName` and `pickKind` with:

```ts
function pickKey(pick: OwnPick) {
  if ("seatId" in pick) return `seat:${pick.seatId}`;
  if ("bot" in pick) return `bot:${pick.key}`;
  return `guest:${pick.guest}`;
}

function pickName(pick: OwnPick) {
  if ("seatId" in pick) return pick.name;
  return normalizeName("bot" in pick ? pick.name : pick.guest);
}

function pickKind(pick: OwnPick) {
  if ("bot" in pick) return `new bot · ${pick.bot}+`;
  if (!("seatId" in pick)) return "new guest";
  const kind = props.state.seats.find(seat => seat.id === pick.seatId)?.kind;
  return kind === "bot" ? "bot" : kind === "account" ? "on their own board" : "guest";
}

/** A new bot at the picked level, added to the team's list; it joins the lobby with Add Team. */
function addBotPick() {
  error.value = "";
  if (picks.value.length >= MAX_PLAYERS) {
    error.value = `A team can have ${MAX_PLAYERS} players at most.`;
    return;
  }
  picks.value = [ ...picks.value, { bot: botPpr(botLevel.value), name: botName(botLevel.value), key: `bot-${++botCount}` } ];
}

function deleteSaved(team: SavedTeam) {
  props.state.deleteSaved(team).catch(e => console.error(e));
}

function forget(name: string) {
  props.state.forget(name).catch(e => console.error(e));
}
```

  - **Template: the body's sections in this order.**
    1. **Saved teams** (moved from the bottom): each row as before, plus the problem line and the delete:

```vue
        <!-- First: re-adding a team that has played before is one tap, as the site's Add Player drawer puts recent players first. -->
        <section v-if="state.savedTeams.length">
          <h3 class="mb-2 text-sm font-bold">
            Saved teams
          </h3>
          <div class="flex flex-col gap-2.5">
            <div v-for="team in state.savedTeams" :key="team.name" class="flex items-center gap-2 rounded-2xl bg-white/10 p-3">
              <span :style="{ backgroundImage: gradient(team.colour) }" class="mr-1 h-7 w-10 shrink-0 rounded-lg ring-1 ring-inset ring-white/15" />
              <span class="min-w-0 flex-1">
                <span class="block truncate font-[family-name:var(--ad-font-display)] text-lg uppercase leading-none">{{ team.name }}</span>
                <span class="block truncate text-xs text-[var(--ad-text-muted)]"><span class="mr-1.5 rounded bg-white/10 px-1.5 py-px text-[10.5px] font-extrabold tracking-wide text-[var(--ad-ink-200)]">{{ team.format === "own" ? "OWN SCORES" : "SHARED SCORE" }}</span>{{ team.players.join(" ▸ ") }}</span>
                <span v-if="state.savedProblems[team.name]" class="mt-0.5 block truncate text-xs font-semibold text-[var(--ad-text-muted)]">{{ state.savedProblems[team.name] }}</span>
              </span>
              <button @click="addSaved(team)" :disabled="pending || Boolean(state.savedProblems[team.name])" class="adt-team-button h-8 min-w-16 px-4 text-sm" type="button">
                Add
              </button>
              <ConfirmDeleteButton @confirm="deleteSaved(team)" :label="team.name" />
            </div>
          </div>
        </section>
```

    2. **Name**, unchanged.
    3. **Colour**, unchanged.
    4. **Players.**
       - *Shared:* after the `<ol ref="list">`, add `<p v-if="!players.length" class="text-[13px] text-[var(--ad-text-muted)]">Nobody yet: type a name, or tap one below.</p>`.
       - Its chips become:

```vue
            <div v-if="chips.length" class="mt-2.5 flex flex-wrap gap-1.5">
              <NameChip
                @add="addPlayer(chip.name)"
                @forget="forget(chip.name)"
                v-for="chip in chips"
                :key="chip.name"
                :disabled="Boolean(chip.team) || players.length >= MAX_PLAYERS"
                :forgettable="forgettable.has(chip.name)"
                :name="chip.name"
                :team="chip.team"
              />
            </div>
            <p class="mt-2.5 text-xs text-[var(--ad-text-muted)]">
              A bot can't share a score: autodarts throws every visit of a bot's seat. Use Own scores to put one on a team, or Add Bot to play against one.
            </p>
```

       - *Own:* after the `<ol ref="ownList">`, add `<p v-if="!picks.length" class="text-[13px] text-[var(--ad-text-muted)]">Nobody yet: tap someone in this lobby, or add a new player or a bot.</p>`.
    5. **In this lobby:** its buttons become `<NameChip @add="pickSeat(seat)" v-for="seat in lobbySeats" :key="seat.id" :disabled="Boolean(seat.team) || picks.length >= MAX_PLAYERS" :name="seat.name" :team="seat.team" />`.
    6. **New players:** its chips become `<NameChip @add="addPlayer(chip)" @forget="forget(chip)" v-for="chip in ownChips" :key="chip" :disabled="picks.length >= MAX_PLAYERS" :forgettable="forgettable.has(chip)" :name="chip" />`.
    7. **Bots** (new, own scores only):

```vue
        <section v-if="format === 'own'">
          <h3 class="mb-2 flex items-baseline justify-between gap-3 text-sm font-bold">
            Bots <small class="text-xs font-semibold text-[var(--ad-text-muted)]">join at the level you pick</small>
          </h3>
          <div class="flex items-center gap-2">
            <select v-model.number="botLevel" :disabled="!state.botsOk || picks.length >= MAX_PLAYERS" aria-label="Bot level" class="adt-team-field adt-team-select">
              <option v-for="level in BOT_LEVELS" :key="level" :value="level">
                Level {{ level }} · {{ botPpr(level) }}+
              </option>
            </select>
            <button @click="addBotPick" :disabled="!state.botsOk || picks.length >= MAX_PLAYERS" class="adt-team-button h-11 shrink-0 px-5 text-sm" type="button">
              Add bot
            </button>
          </div>
          <p v-if="!state.botsOk" class="mt-1.5 text-xs text-[var(--ad-text-muted)]">
            {{ BOTS_ONLY_TEXT }}
          </p>
        </section>
```

  - **Styles:** delete `.adt-team-offer` and its three rules (NameChip carries them now), and add:

```css
/* the light field as a picker: the site's own chevron, drawn here */
.adt-team-select {
  appearance: none; padding-right: 40px; cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23707580' d='M12 15.4 6 9.4 7.4 8l4.6 4.6L16.6 8 18 9.4z'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 14px center; background-size: 18px;
}
```

- [ ] **Step 4: `entrypoints/lobby.content/teams.ts`.**
  - **Imports:**
    - `import { forgetGuestPlayers, GUEST_KEY } from "@/utils/guest-players";`, merged with the existing `GUEST_KEY` import
    - from `@/utils/teams`, add `forgettableNames`, `hasBots`, `pickSlots` and `savedTeamProblem`
  - **`DrawerState` gains:**

```ts
  /** The offered names a ✕ can delete: those no saved team has. */
  forgettable: string[];
  /** A saved team that can't join as the lobby stands → why. */
  savedProblems: Record<string, string>;
  /** Whether this lobby's game has bots. */
  botsOk: boolean;
  forget: (name: string) => Promise<void>;
  deleteSaved: (team: SavedTeam) => Promise<void>;
```

  - **The `drawer` reactive** gains `forgettable: [], savedProblems: {}, botsOk: true, forget: forgetName, deleteSaved: deleteSavedTeam`.
  - **`drawerContext`:** its return type omits `"forget" | "deleteSaved"` as well. Inside, after `seatTeam`:

```ts
  const seatNameTeams: Record<string, string> = {};
  for (const team of ownTeams) {
    for (const id of team.seatIds) {
      const seat = lobby?.players?.find(candidate => candidate.id === id);
      if (seat) seatNameTeams[normalizeName(seat.name)] = team.name;
    }
  }
  const offered = uniqueNames([ ...savedPlayers, ...siteGuests(), ...saved.flatMap(team => team.players) ]);
  // A lobby with sets offers no own-score team (utils/teams.ts `rejoinProblem`).
  const savedTeams = editing ? [] : saved.filter(team => (!format || team.format === format) && !(lobby?.sets && team.format === "own") && !inLobby(team));
  const savedProblems: Record<string, string> = {};
  for (const team of savedTeams) {
    const problem = savedTeamProblem(team, { playerTeams, seatTeams: seatNameTeams });
    if (problem) savedProblems[team.name] = problem;
  }
```

  and the returned object uses `offered`, `forgettable: forgettableNames(offered, saved)`, `savedTeams`, `savedProblems` and `botsOk: hasBots(lobby?.variant)`, with the old inline `offered` and `savedTeams` expressions gone.
  - **New functions,** after `closeDrawer`:

```ts
/** A name out of the drawer's offer: out of Saved players and the site's own recent guests, as the Saved players panel deletes one, so no sync brings it back. */
async function forgetName(name: string) {
  const config = await AutodartsToolsConfig.getValue();
  const players = (config.recentLocalPlayers?.players ?? []).filter(player => normalizeName(player) !== name);
  await AutodartsToolsConfig.setValue({ ...config, recentLocalPlayers: { ...config.recentLocalPlayers, players } });
  forgetGuestPlayers([ name ]);
  savedPlayers = players;
  refreshDrawer();
}

/** A saved team deleted from the drawer, as from Teams' settings panel. */
async function deleteSavedTeam(team: SavedTeam) {
  const config = await AutodartsToolsConfig.getValue();
  const current = normalizeTeams(config.teams);
  const remaining = current.saved.filter(other => other.name !== team.name);
  await AutodartsToolsConfig.setValue({ ...config, teams: { ...current, saved: remaining } });
  saved = remaining;
  refreshDrawer();
}

/** The open drawer, redrawn from the lobby as it now stands. */
function refreshDrawer() {
  if (drawerUi || opening) Object.assign(drawer, drawerContext(drawer.editing, drawer.editingSeats));
}
```

  - **In `submitOwnTeam`,** `const slots = pickSlots(draft.picks);`.

- [ ] **Step 5: `utils/lobby-guests.ts` `addBot`:**

```ts
/** Where the site's Bot Settings keep the play speed it last used. */
const BOT_SPEED_KEY = "autodarts-bot-speed";

/** Add a bot at a level (the site's cpuPPR) to the lobby on screen, with the site's own bot request, at the speed its dialog last used. */
export async function addBot(name: string, ppr: number, feature: string): Promise<boolean> {
```

  and the body becomes `JSON.stringify({ name, userId: null, cpuPPR: ppr, cpuSpeed: localStorage.getItem(BOT_SPEED_KEY) || "realistic" })`.

- [ ] **Step 6: Compile, SFC-check and lint.**
  - Run `node $SCR/sfc-check.cjs` on both SFCs.
  - `yarn compile`: 14 errors, none in the files touched.
  - Run ESLint on the four files.

- [ ] **Step 7: Live check (Review Focus 2 and 3).** Use a fresh lobby. Before starting, keep a copy of `recentLocalPlayers.players` and `localStorage["autodarts-guest-players"]` from my tab.
  - **Delete a name:**
    - Pick a name that only I added: add a guest `ZZTEST` through the site's Add Player, then remove it from the lobby.
    - Open Add Team, ✕ it, then confirm. The chip goes.
    - `recentLocalPlayers.players` and the site's list no longer have it, even after the Saved players sync (navigate the lobby away and back).
  - **Delete a saved team:** a test team I save through the drawer (`ZZ TEST TEAM`). Delete it and it's gone from `teams.saved`, while the user's four teams stay.
  - **Bots:**
    - Own scores: add `ZZBOTTEAM` with two level-5 bots and a guest. All three are seated, the lineup has three seat ids, and the rows say `ZZBOTTEAM 1 of 3` and so on.
    - In a Gotcha lobby, the Bots section is disabled with the note.
  - **2 vs 1:**
    - shared: `ZZSOLO` with one player next to a two-player team
    - own: a one-player team, whose row reads `ZZSOLO`
  - **Blocked:** a saved own team whose player is on another team here shows the line, and its Add is disabled.
  - **Hints, saved teams first, and focus:** screenshots at 1440 and 390, where no keyboard comes up because `document.activeElement` isn't the name input.
  - **Clean-up:**
    - remove my test teams from `teams.saved`
    - put back the user's `recentLocalPlayers.players` and `autodarts-guest-players` if my test names are still in them
    - ✕ never touched the user's own names

- [ ] **Step 8: Commit.**

```bash
git add entrypoints/lobby.content/NameChip.vue entrypoints/lobby.content/AddTeamDrawer.vue entrypoints/lobby.content/teams.ts utils/lobby-guests.ts
git commit -m "feat: the Add Team drawer deletes names and saved teams, adds bots to own-score teams, and puts saved teams first"
```

---

### Task 9: README and CHANGELOG

**Files:**
- Modify: `README.md` (the Teams section) and `CHANGELOG.md` ([Unreleased], where Teams is)

- [ ] **Step 1: README, Teams section.**
  - The partner rule is now a switch on the lobby page, next to Autoscoring. It's per lobby, and the next lobby starts from the last state; it's no longer in Teams' settings.
  - A team can be a single player (2 vs 1). With a shared score, a player on their own throws every visit; with own scores, the bigger team throws more often.
  - To put a bot on an own-score team, use the drawer's Bots section (a level, then Add bot), or tap a bot already in the lobby under In this lobby. A bot can't share a score.
  - The drawer's ✕ deletes a recently added name, from Saved players and the site's list alike. The bin deletes a saved team.
  - The pill is one line. With own scores it shows the teams' legs either side, it shows the partner rule's warning and bust inside itself, and it says who won a leg.
- [ ] **Step 2: CHANGELOG.** Extend the unreleased Teams entry with the same points in the file's style. Under Fixed:
  - Teams no longer shrinks the board on phones
  - the partner-rule warning no longer pushes the cards over the board
  - top-bar cells keep one height
  - Teams follows being switched off mid-match
  - the phone lobby's add buttons wrap
- [ ] **Step 3: Commit.**

```bash
git add README.md CHANGELOG.md
git commit -m "docs: Teams' partner rule in the lobby, teams of one, bots, the drawer's deletes and the one-line pill"
```

---

### Task 10: Everything again, and the browser left as it was

- [ ] **Step 1: The suite and the builds.**
  - `npx tsx --test $SCR/tests/*.test.mts`, expected 85/85
  - `yarn compile`, expected 14 errors
  - `yarn build` and `yarn build:firefox`, expected exit 0
- [ ] **Step 2: The review table again,** with Teams on and off, at the four sizes:
  - own scores 2 v 2, with and without the warning
  - shared score, two teams
  - shared score, two teams and a bot
  - record each board size in the ledger
  - every screenshot read and compared by eye against the review's findings
- [ ] **Step 3: Restore.**
  - From `$SCR/r2/storage-backup-start.json`, put back `config-2-0-0.teams` (the user's four teams, `enabled: true`, `partnerRule: false`) and `recentLocalPlayers`, then set `wledFx.enabled` true.
  - Check each by canonical JSON against the backup.
  - Remove my lineups from `teams-lineups`; keep the user's `01a0f384-…` entry.
  - Remove `teams-shifts` entries of my matches.
  - Put `adt:last-visited-url` and `urlstatus` back.
  - Close my tab.
