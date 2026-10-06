# Online Teams: join a team from your own board — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Players on their own boards join another account's own-score team with "Play for TEAM RED", so four players on four boards, all with Tools and Online Teams, can play two against two.

**Architecture:** A join is a record of its own in the team room (protocol 2, `room:joins`): each account says which of its own seats plays for which team. Every screen merges joins into the teams in `screenTeams()` (`utils/team-room.ts`), which the lobby, the match, the team view and the Caller already read. A screen's own joins live in its lineup (`Lineup.joins`), the only word it takes for its own seats. The server keeps taking protocol 1, and a new client falls back to 1 against an old server.

**Tech Stack:** TypeScript, Vue 3 (WXT content scripts), socket.io 4 (server on Bun, client in the extension), `node:test` under tsx for the extension's pure modules, `bun:test` for the server.

**Spec:** `docs/superpowers/specs/2026-10-06-online-teams-join-from-own-board-design.md` (read it first; this plan argues from it).

## Where things are

- **Worktree:** `/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt-online-teams-join` (`$WT`), branch `feat/online-teams-join`. Work only here, never in `/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt`, where other sessions work.
- **Tests that aren't committed:** `/private/tmp/claude-501/-Volumes-WD-BLACK-PROJECTS-Autodarts-autodarts-tools-wxt/bb928eee-867d-4a8e-9b72-e7cf73df4e2f/scratchpad/tests` (`$TESTS`). The project has no test framework. The first Online Teams work kept its tsx tests outside the repo, and so does this. Only `socket/rooms.test.ts` (bun) is committed.
- **The shell's working directory resets after every command**, so every command below starts with `cd`. Spell out the paths: `$WT` and `$TESTS` are shorthand in this plan, not variables that exist.
- **Run one tsx test file:** `cd $WT && node_modules/.bin/tsx --test $TESTS/<file>.test.mts`. Run it from `$WT`, since that is what resolves the `@/` imports.
- **Run every tsx test (74 pass on the baseline):** `cd $WT && node_modules/.bin/tsx --test $TESTS/*.test.mts`
- **Server:** `cd $WT/socket && bun test && bun run typecheck` (20 pass on the baseline)
- **Type check:** `cd $WT && yarn compile 2>&1 | grep -c "error TS"`. The baseline is **14** errors, and that count must not grow. To list them: `cd $WT && yarn compile 2>&1 | grep "error TS"`.
- **Lint one file:** `cd $WT && npx eslint <file>`
- **Translations:** `cd $WT && yarn i18n:check`

## Global Constraints

- Every new or changed text ships in English, German and Dutch in the same task: `locales/{en,de,nl}/teams.ts`. German says *du*, Dutch *je*. The site's *Board* is German *Board* and Dutch *Bord*. `yarn i18n:check` must pass.
- No literal text in templates or DOM writes. Components use `const { t } = useI18n()`, scripts use `import { t } from "@/utils/i18n"`. Names (team names, account names) are data, not text.
- `utils/teams.ts` and `utils/team-room.ts` are loaded by the service worker through `utils/storage.ts`. They hold no text and never import `@/utils/i18n` values, only `import type`.
- Don't import what WXT auto-imports (`ref`, `computed`, `browser`, `createShadowRootUi`, `useI18n`, …), except where the file already does.
- No new permissions in `wxt.config.ts`.
- The server takes protocols 1 and 2. A 3.3.0 client must keep working as it does today.
- Never deploy `socket/` and never touch `adt-socket.tobias-thiele.de`: the user deploys it.
- Limits on `room:joins`, copied from the spec:
  - at most 6 entries
  - `owner` is a UUID and not the sender
  - `team` is 1–24 characters
  - 1–6 seat ids, all UUIDs
  - a seat appears at most once across the sender's entries
  - at most 16 accounts with joins per room
- Commits use the repo's prefixes (`feat:`, `fix:`, `docs:`, `test:`, `chore:`) and end with:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- Vue SFCs stay template-first. In `<script setup>` the order is imports, constants, refs, computed, lifecycle, then methods.
- Comments read like the surrounding code: full sentences that say why, in the codebase's voice.

## Review Focus

These are the inputs most likely to bite a real player that no task's unit tests reach. Each is pinned by a step in the owning task.

1. **Someone who opened *Invite a team*'s `/lobby/<id>` link has no seat when they tap Play for.** They must be seated with their own account on their own selected board, or with no board when the site's board is `manual`, and then joined. → Task 12, live step L3.
2. **The captain has Local Lobby on.** A joined player's seat must stay on its own board, and nothing may press its 🌐. → Task 3 (`joinedSeats` test), Task 8 (the Local Lobby change), Task 12 live step L6.
3. **An account on 3.3.0 comes into the lobby after someone joined.** The others' chip names them (*behind*), Play for is greyed, and nothing breaks. → Task 4 tests, Task 12 live step L8.
4. **The server restarts mid-match.** Each screen sends its joins again, and the mirror keeps an absent author's joins meanwhile. → Task 3 (`withRoom` test), Task 5 (restart test), Task 12 live step L7.
5. **The joiner reloads mid-match.** Their lineup keeps the join, so their screen shows the team at once. → Task 12 live step L7.

---

### Task 1: The server speaks protocol 2

**Files:**
- Modify: `socket/rooms.ts` (the whole file's protocol parts; changes below)
- Modify: `socket/index.ts:14`, `:48`, `:71-78`, `:123-126`, `:144`
- Modify: `socket/rooms.test.ts` (fixtures and new tests)
- Modify: `socket/README.md`

**Interfaces:**
- Produces (for the extension's Task 3 to mirror):
  - `PROTOCOL_VERSION = 2`
  - `OLDEST_PROTOCOL = 1`
  - `isProtocol(v): v is number`
  - `RoomPeer { userId; name; v: number }`
  - `RoomJoinInput { owner; team; seatIds }`
  - `RoomJoin extends RoomJoinInput { by }`
  - `RoomState.joins: RoomJoin[]`
  - `parseJoins(raw, by): Result<RoomJoinInput[]>`
  - `Rooms.setJoins(lobbyId, socketId, raw): Result<RoomState>`
  - the socket event `room:joins { lobbyId, joins }`
  - `/health` gains `oldest: 1`

- [ ] **Step 1: Write the failing tests.** In `socket/rooms.test.ts`:

  **1a.** Replace the fixtures at lines 6–7 and line 16. Peers now carry their protocol:

```ts
const A = { userId: "5e1f2afd-6ac0-4fb0-b98a-cb9cf2811917", name: "creazy", v: 2 };
const B = { userId: "39a06afc-edfd-4a82-b1af-5155a475fa37", name: "creazy_dev", v: 2 };
```

```ts
const user = (i: number) => ({ userId: `${String(i).padStart(8, "0")}-2222-4000-8000-000000000000`, name: `p${i}`, v: 2 });
```

  **1b.** Change the import on line 3:

```ts
import { CLAIM_TTL_MS, LIMITS, OLDEST_PROTOCOL, PROTOCOL_VERSION, ROOM_IDLE_MS, ROOM_MAX_MS, Rooms, isProtocol, parseJoins, parsePeer, parseTeams } from "./rooms";
```

  **1c.** Replace the whole `describe("peers", …)` block at the end of the file with these, and append the two new blocks:

```ts
describe("peers", () => {
  test("need a UUID, a name and a protocol this server speaks", () => {
    expect(parsePeer({ userId: A.userId, name: "creazy", v: 2 })).toEqual(A);
    expect(parsePeer({ userId: A.userId, name: "creazy", v: 1 })).toEqual({ ...A, v: 1 });
    expect(parsePeer({ userId: A.userId, name: "creazy", v: 3 })).toBeUndefined();
    expect(parsePeer({ userId: A.userId, name: "creazy" })).toBeUndefined();
    expect(parsePeer({ userId: "x", name: "creazy", v: 2 })).toBeUndefined();
    expect(parsePeer({ userId: A.userId, name: " ", v: 2 })).toBeUndefined();
  });

  test("an account speaks the oldest protocol among its sockets", () => {
    const { rooms } = setup();
    value(rooms.join(LOBBY, "a1", A));
    expect(value(rooms.join(LOBBY, "a2", { ...A, v: 1 })).peers).toEqual([ { ...A, v: 1 } ]);
    expect(rooms.leave(LOBBY, "a2")!.peers).toEqual([ A ]);
  });
});

describe("protocol", () => {
  test("1 and 2 are spoken, nothing else", () => {
    expect([ OLDEST_PROTOCOL, PROTOCOL_VERSION ]).toEqual([ 1, 2 ]);
    expect([ 1, 2 ].every(isProtocol)).toBe(true);
    expect([ 0, 3, 1.5, "2", undefined, null ].some(isProtocol)).toBe(false);
  });
});

describe("joins", () => {
  const SEAT_BEN = "01a10312-0000-7000-8000-0000000000b1";
  const seat = (i: number) => `01a10312-0000-7000-8000-${String(i).padStart(12, "0")}`;
  const join = { owner: A.userId, team: "TEAM RED", seatIds: [ SEAT_BEN ] };

  test("are stamped with the sender and replace only the sender's", () => {
    const { rooms } = setup();
    rooms.join(LOBBY, "a1", A);
    rooms.join(LOBBY, "b1", B);
    value(rooms.setTeams(LOBBY, "a1", [ red ]));
    expect(value(rooms.setJoins(LOBBY, "b1", [ join ])).joins).toEqual([ { ...join, by: B.userId } ]);
    expect(value(rooms.setJoins(LOBBY, "b1", [ { ...join, team: "TEAM BLUE" } ])).joins).toEqual([ { ...join, team: "TEAM BLUE", by: B.userId } ]);
    expect(value(rooms.setJoins(LOBBY, "b1", [])).joins).toEqual([]);
    expect(value(rooms.setTeams(LOBBY, "a1", [ red ])).teams.length).toBe(1);
  });

  test("are checked: owner, team, seat ids, counts, one team per seat", () => {
    expect(parseJoins([ join ], B.userId)).toEqual({ ok: true, value: [ join ] });
    expect(parseJoins([ { ...join, owner: "x" } ], B.userId).ok).toBe(false);
    expect(parseJoins([ join ], A.userId).ok).toBe(false);
    expect(parseJoins([ { ...join, team: " " } ], B.userId).ok).toBe(false);
    expect(parseJoins([ { ...join, team: "X".repeat(LIMITS.nameLength + 1) } ], B.userId).ok).toBe(false);
    expect(parseJoins([ { ...join, seatIds: [] } ], B.userId).ok).toBe(false);
    expect(parseJoins([ { ...join, seatIds: [ "seat-1" ] } ], B.userId).ok).toBe(false);
    expect(parseJoins([ { ...join, seatIds: Array.from({ length: LIMITS.seatsPerTeam + 1 }, (_, i) => seat(i)) } ], B.userId).ok).toBe(false);
    expect(parseJoins([ { ...join, seatIds: [ SEAT_BEN, SEAT_BEN ] } ], B.userId).ok).toBe(false);
    expect(parseJoins([ join, { ...join, team: "TEAM BLUE" } ], B.userId).ok).toBe(false);
    expect(parseJoins(Array.from({ length: LIMITS.joinsPerAccount + 1 }, (_, i) => ({ ...join, seatIds: [ seat(i) ] })), B.userId).ok).toBe(false);
    expect(parseJoins("joins", B.userId).ok).toBe(false);
  });

  test("a refused list leaves the sender's joins as they were", () => {
    const { rooms } = setup();
    rooms.join(LOBBY, "b1", B);
    value(rooms.setJoins(LOBBY, "b1", [ join ]));
    expect(rooms.setJoins(LOBBY, "b1", [ { ...join, owner: B.userId } ])).toEqual({ ok: false, error: "joins" });
    expect(rooms.state(LOBBY)!.joins).toEqual([ { ...join, by: B.userId } ]);
  });

  test("stay when their author's socket leaves", () => {
    const { rooms } = setup();
    rooms.join(LOBBY, "a1", A);
    rooms.join(LOBBY, "b1", B);
    rooms.setJoins(LOBBY, "b1", [ join ]);
    const [ state ] = rooms.leaveAll("b1");
    expect(state.joins).toEqual([ { ...join, by: B.userId } ]);
  });

  test("come from a capped number of accounts, however many come and go", () => {
    const { rooms } = setup();
    for (let i = 0; i < LIMITS.joinersPerRoom; i++) {
      value(rooms.join(LOBBY, `s${i}`, user(i)));
      value(rooms.setJoins(LOBBY, `s${i}`, [ { ...join, seatIds: [ seat(i) ] } ]));
      rooms.leave(LOBBY, `s${i}`);
    }
    value(rooms.join(LOBBY, "late", user(99)));
    expect(rooms.setJoins(LOBBY, "late", [ { ...join, seatIds: [ seat(99) ] } ])).toEqual({ ok: false, error: "full" });
    // An account that has joins there may still change them.
    value(rooms.join(LOBBY, "s0-again", user(0)));
    value(rooms.setJoins(LOBBY, "s0-again", [ { ...join, seatIds: [ seat(100) ] } ]));
  });

  test("are refused from a socket that isn't in the room", () => {
    const { rooms } = setup();
    rooms.join(LOBBY, "a1", A);
    expect(rooms.setJoins(LOBBY, "b1", [ join ])).toEqual({ ok: false, error: "room" });
  });
});
```

- [ ] **Step 2: Run the tests and see them fail**

Run: `cd $WT/socket && bun test`
Expected: FAIL. The import of `OLDEST_PROTOCOL`, `isProtocol` and `parseJoins` fails ("not found" / "is not a function"), and the peers tests fail.

- [ ] **Step 3: Implement it in `socket/rooms.ts`.**

  **3a.** Replace the header comment and the version constant (lines 1–15):

```ts
/**
 * Online Teams' rooms: one per autodarts lobby (its match keeps the lobby's
 * id), holding each account's teams, and the seats it joined to other
 * accounts' teams, while the lobby and its match last.
 *
 * Pure: no sockets and no timers of its own. index.ts wires it to socket.io
 * and sweeps it once a minute. The extension's side is utils/team-room.ts;
 * keep PROTOCOL_VERSION and the shapes below in step with it.
 *
 * The server can't tell who anyone is (there are no logins), so it only keeps
 * each account to its own entries: a socket names its account once, at
 * connect, and can only write that account's teams, shifts and joins. Whether
 * a team, or a seat joined to it, may be shown at all is each screen's call,
 * from autodarts' own data.
 */

/** Protocol 2 added joins: a seat of one account playing for another account's team. */
export const PROTOCOL_VERSION = 2;
/** The oldest protocol still taken: Tools 3.3.0 speaks 1, and simply sees no joins. */
export const OLDEST_PROTOCOL = 1;
```

  **3b.** In `LIMITS`, after `maxShift: 100,`, add:

```ts
  /** An account's joins in a room, and the accounts with joins there: a leaving account's joins stay, as its teams do. */
  joinsPerAccount: 6,
  joinersPerRoom: 16,
```

  **3c.** Replace the `RoomPeer` and `RoomState` interfaces, and add the join types after `RoomRule`:

```ts
export interface RoomPeer { userId: string; name: string; v: number }
/** Seats of the sender's own that play for another account's own-score team, named by its owner and name. */
export interface RoomJoinInput { owner: string; team: string; seatIds: string[] }
export interface RoomJoin extends RoomJoinInput { by: string }
export interface RoomState { lobbyId: string; teams: RoomTeam[]; shifts: RoomShift[]; rule?: RoomRule; peers: RoomPeer[]; joins: RoomJoin[] }
```

  **3d.** Replace `parsePeer` and add `isProtocol` above it:

```ts
/** A protocol this server speaks. */
export function isProtocol(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= OLDEST_PROTOCOL && value <= PROTOCOL_VERSION;
}

/** Who a socket says it is at connect, and which protocol it speaks. */
export function parsePeer(raw: unknown): RoomPeer | undefined {
  const value = (raw ?? {}) as Record<string, unknown>;
  const name = text(value.name, 64);
  return isId(value.userId) && name && isProtocol(value.v) ? { userId: value.userId, name, v: value.v } : undefined;
}
```

  **3e.** After `parseTeams`, add:

```ts
function parseJoin(raw: unknown, by: string): RoomJoinInput | undefined {
  const value = (raw ?? {}) as Record<string, unknown>;
  const team = text(value.team, LIMITS.nameLength);
  if (!isId(value.owner) || value.owner === by || !team || !Array.isArray(value.seatIds)) return undefined;
  const seatIds = value.seatIds as unknown[];
  if (!seatIds.length || seatIds.length > LIMITS.seatsPerTeam || !seatIds.every(isId)) return undefined;
  return { owner: value.owner, team, seatIds: seatIds as string[] };
}

/** An account's joins for a room: all of them valid, each seat on one team only, or none taken. */
export function parseJoins(raw: unknown, by: string): Result<RoomJoinInput[]> {
  if (!Array.isArray(raw) || raw.length > LIMITS.joinsPerAccount) return { ok: false, error: "joins" };
  const joins: RoomJoinInput[] = [];
  const seats = new Set<string>();
  for (const entry of raw) {
    const join = parseJoin(entry, by);
    if (!join) return { ok: false, error: "joins" };
    for (const id of join.seatIds) {
      if (seats.has(id)) return { ok: false, error: "joins" };
      seats.add(id);
    }
    joins.push(join);
  }
  return { ok: true, value: joins };
}
```

  **3f.** In `interface Room`, after `shifts`, add:

```ts
  /** Per account, the seats it joined to other accounts' teams. */
  joins: Map<string, RoomJoin[]>;
```

  **3g.** In `join()`, change the room literal to include `joins: new Map()`:

```ts
      room = { id: lobbyId, createdAt: this.now(), teams: new Map(), shifts: new Map(), joins: new Map(), claims: new Map(), sockets: new Map() };
```

  **3h.** After `setShift`, add:

```ts
  setJoins(lobbyId: unknown, socketId: string, raw: unknown): Result<RoomState> {
    const room = this.memberRoom(lobbyId, socketId);
    if (!room) return { ok: false, error: "room" };
    const by = room.sockets.get(socketId)!.userId;
    const parsed = parseJoins(raw, by);
    if (!parsed.ok) return parsed;
    if (parsed.value.length && !room.joins.has(by) && room.joins.size >= LIMITS.joinersPerRoom) return { ok: false, error: "full" };
    if (parsed.value.length) room.joins.set(by, parsed.value.map(join => ({ ...join, by })));
    else room.joins.delete(by);
    return { ok: true, value: this.stateOf(room) };
  }
```

  **3i.** Replace `stateOf`:

```ts
  private stateOf(room: Room): RoomState {
    const peers = new Map<string, RoomPeer>();
    for (const peer of room.sockets.values()) {
      const known = peers.get(peer.userId);
      // An account speaks the oldest protocol among its sockets: a 3.3.0 phone beside a new desktop can't show joins.
      if (!known || peer.v < known.v) peers.set(peer.userId, peer);
    }
    return {
      lobbyId: room.id,
      teams: [ ...room.teams.values() ].flat(),
      shifts: [ ...room.shifts.values() ],
      ...(room.rule ? { rule: room.rule } : {}),
      peers: [ ...peers.values() ],
      joins: [ ...room.joins.values() ].flat(),
    };
  }
```

- [ ] **Step 4: Wire it into `socket/index.ts`.**

  **4a.** Update the header's list (line 3) to "(names, players, order, colours, tap-to-correct, the host's partner rule, which seats joined which team, one-time claims)".

  **4b.** Change the import (line 14):

```ts
import { OLDEST_PROTOCOL, PROTOCOL_VERSION, type Result, type RoomState, Rooms, isProtocol, parsePeer } from "./rooms";
```

  **4c.** Change `/health` (line 48):

```ts
    response.end(JSON.stringify({ ok: true, version: PROTOCOL_VERSION, oldest: OLDEST_PROTOCOL, ...rooms.counts() }));
```

  **4d.** Change the middleware's version check (line 73):

```ts
  if (!isProtocol(auth.v)) return next(new Error("version"));
```

  **4e.** After the `room:rule` line (125), add:

```ts
  on("room:joins", ({ lobbyId, joins }) => rooms.setJoins(lobbyId, socket.id, joins), broadcast);
```

  **4f.** Change the listen log (line 144):

```ts
  console.log(`Online Teams server on :${PORT}, protocols ${OLDEST_PROTOCOL}–${PROTOCOL_VERSION}`);
```

- [ ] **Step 5: Run the tests and see them pass**

Run: `cd $WT/socket && bun test && bun run typecheck`
Expected: every test passes (about 30), and `tsc --noEmit` prints nothing.

- [ ] **Step 6: Update `socket/README.md`.**

  **6a.** In the first paragraph, replace "Protocol version 1; the extension's side is `utils/team-room.ts`." with:

  > Protocol version 2, which added the seats one account plays for another account's team (`room:joins`). Version 1 (Tools 3.3.0) is still taken, and simply sees no joins. The extension's side is `utils/team-room.ts`.

  **6b.** Replace the `/health` sentence with: ``GET /health` answers `{"ok":true,"version":2,"oldest":1,"rooms":n,"sockets":n}`.``

  **6c.** Under `## Deploying`, add this paragraph first:

  > Deploy this before releasing a Tools that speaks a newer protocol. A newer Tools that meets an older server falls back to the protocol that server speaks, so Online Teams keeps working, but without what the newer protocol added: with protocol 2, joining a team from your own board.

- [ ] **Step 7: Commit**

```bash
cd $WT && git add socket/rooms.ts socket/index.ts socket/rooms.test.ts socket/README.md && git commit -m "$(cat <<'EOF'
feat: the team server speaks protocol 2, with joins

A join says which of an account's own seats play for another account's
own-score team. Peers carry the oldest protocol among their sockets, and
protocol 1 (Tools 3.3.0) is still taken.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: The lineup keeps this screen's joins

**Files:**
- Modify: `utils/teams.ts:107-121` (types), `:500-525` (`plainLineupTeam`, `withLineup`), plus three new functions after `pruneLineup`
- Test: `$TESTS/lineup-joins.test.mts` (new, not committed)

**Interfaces:**
- Produces:
  - `LineupJoin { owner: string; team: string; seatIds: string[] }`
  - `Lineup.joins?: LineupJoin[]`
  - `withJoins(store: LineupStore | undefined, lobbyId: string, joins: readonly LineupJoin[], now: number): LineupStore`
  - `pruneJoins(joins: readonly LineupJoin[], seatIds: readonly string[]): LineupJoin[]`
  - `withSeatJoin(joins: readonly LineupJoin[], seatId: string, join?: LineupJoin): LineupJoin[]`
  - `withLineup` (signature unchanged) now keeps the lobby's joins

- [ ] **Step 1: Write the failing test** `$TESTS/lineup-joins.test.mts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";

import { pruneJoins, withJoins, withLineup, withPartnerRule, withSeatJoin } from "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt-online-teams-join/utils/teams.ts";

const A = "5e1f2afd-6ac0-4fb0-b98a-cb9cf2811917";
const LOBBY = "01a10312-5fd9-7b43-88ab-73ac80cb938e";
const OTHER = "01a10312-5fd9-7b43-88ab-73ac80cb9390";
const DAY = 24 * 60 * 60 * 1000;
const crimson = { preset: "crimson", from: "#6a1624", to: "#b8323f" };
const RED = { name: "TEAM RED", colour: crimson, seatIds: [ "s1" ] };
const JOIN = { owner: A, team: "TEAM BLUE", seatIds: [ "s2" ] };

test("withLineup keeps the lobby's joins", () => {
  const next = withLineup(withJoins({}, LOBBY, [ JOIN ], 1), LOBBY, [ RED ], 2, true);
  assert.deepEqual(next[LOBBY], { at: 2, teams: [ RED ], partnerRule: true, joins: [ JOIN ] });
});

test("a lobby with joins but no teams keeps its lineup; with neither, it has none", () => {
  const store = withJoins({}, LOBBY, [ JOIN ], 1);
  assert.deepEqual(store[LOBBY], { at: 1, teams: [], joins: [ JOIN ] });
  assert.deepEqual(withLineup(store, LOBBY, [], 2)[LOBBY], { at: 2, teams: [], joins: [ JOIN ] });
  assert.equal(withJoins(store, LOBBY, [], 3)[LOBBY], undefined);
  assert.equal(withJoins({}, LOBBY, [ { ...JOIN, seatIds: [] } ], 3)[LOBBY], undefined, "a join with no seats is dropped");
});

test("withJoins keeps the lobby's teams and partner rule, and the other lobbies of the last day", () => {
  const store = { ...withLineup({}, LOBBY, [ RED ], 1, false), ...withLineup({}, OTHER, [ RED ], 1) };
  const next = withJoins(store, LOBBY, [ JOIN ], 2);
  assert.deepEqual(next[LOBBY], { at: 2, teams: [ RED ], partnerRule: false, joins: [ JOIN ] });
  assert.ok(next[OTHER]);
  assert.equal(withJoins(store, LOBBY, [ JOIN ], DAY + 2)[OTHER], undefined, "a day-old lobby goes");
});

test("withPartnerRule keeps the joins", () => {
  const store = withLineup(withJoins({}, LOBBY, [ JOIN ], 1), LOBBY, [ RED ], 1);
  assert.deepEqual(withPartnerRule(store, LOBBY, true, 2)[LOBBY]?.joins, [ JOIN ]);
});

test("pruneJoins drops the seats that left, and joins with none left", () => {
  assert.deepEqual(pruneJoins([ { ...JOIN, seatIds: [ "s2", "s3" ] }, { ...JOIN, team: "X", seatIds: [ "s4" ] } ], [ "s1", "s3" ]), [ { ...JOIN, seatIds: [ "s3" ] } ]);
});

test("withSeatJoin puts a seat on one team: off any other, and onto the new one, or off all", () => {
  const RED_JOIN = { owner: A, team: "TEAM RED", seatIds: [ "s2" ] };
  assert.deepEqual(withSeatJoin([ { ...JOIN, seatIds: [ "s2", "s3" ] } ], "s2", RED_JOIN), [ { ...JOIN, seatIds: [ "s3" ] }, RED_JOIN ]);
  assert.deepEqual(withSeatJoin([ { ...JOIN, seatIds: [ "s2", "s3" ] } ], "s3"), [ { ...JOIN, seatIds: [ "s2" ] } ]);
  assert.deepEqual(withSeatJoin([ JOIN ], "s2"), []);
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `cd $WT && node_modules/.bin/tsx --test $TESTS/lineup-joins.test.mts`
Expected: FAIL with `SyntaxError: The requested module ... does not provide an export named 'pruneJoins'`.

- [ ] **Step 3: Implement it in `utils/teams.ts`.**

  **3a.** After `interface LineupTeam` (line 111), add:

```ts
/** Online Teams: seats of this account's that play for another account's own-score team, the team named by its owner and name. */
export interface LineupJoin {
  owner: string;
  team: string;
  seatIds: string[];
}
```

  **3b.** In `interface Lineup`, after `partnerRule?`, add:

```ts
  /** This account's own word for the seats it joined to other accounts' teams (utils/team-room.ts). */
  joins?: LineupJoin[];
```

  **3c.** Change the comment on `Lineup` from "A lobby's own-score teams, in the order they were added." to "A lobby's own-score teams as this account set them up, in the order they were added, and the teams its seats joined."

  **3d.** Replace `withLineup` (the doc comment and the function) with these helpers and the new `withLineup`:

```ts
function plainJoin(join: LineupJoin): LineupJoin {
  return { owner: join.owner, team: join.team, seatIds: [ ...join.seatIds ] };
}

/** The store's other lobbies, those written within the last day. */
function otherLineups(store: LineupStore | undefined, lobbyId: string, now: number): LineupStore {
  const next: LineupStore = {};
  for (const [ id, entry ] of Object.entries(store ?? {})) {
    if (id !== lobbyId && entry && now - entry.at < SHIFT_TTL_MS) next[id] = entry;
  }
  return next;
}

/** A lobby's entry as plain data, or none when it has neither a team nor a join with seats. */
function lineupEntry(teams: readonly LineupTeam[], joins: readonly LineupJoin[] | undefined, partnerRule: boolean | undefined, now: number): Lineup | undefined {
  const kept = teams.filter(team => team.seatIds.length).map(plainLineupTeam);
  const keptJoins = (joins ?? []).filter(join => join.seatIds.length).map(plainJoin);
  if (!kept.length && !keptJoins.length) return undefined;
  const entry: Lineup = { at: now, teams: kept };
  if (partnerRule !== undefined) entry.partnerRule = partnerRule;
  if (keptJoins.length) entry.joins = keptJoins;
  return entry;
}

/**
 * A lobby's own-score teams written into the store, as plain data. Teams with
 * no seats are dropped, a lobby with neither teams nor joins has no lineup, and
 * entries older than a day go. The lobby's partner rule and joins are kept
 * unless a new rule is given.
 */
export function withLineup(store: LineupStore | undefined, lobbyId: string, teams: readonly LineupTeam[], now: number, partnerRule?: boolean): LineupStore {
  const next = otherLineups(store, lobbyId, now);
  const entry = lineupEntry(teams, store?.[lobbyId]?.joins, partnerRule ?? store?.[lobbyId]?.partnerRule, now);
  if (entry) next[lobbyId] = entry;
  return next;
}

/** A lobby's joins written into the store, its teams and partner rule kept. Joins with no seats are dropped. */
export function withJoins(store: LineupStore | undefined, lobbyId: string, joins: readonly LineupJoin[], now: number): LineupStore {
  const next = otherLineups(store, lobbyId, now);
  const last = store?.[lobbyId];
  const entry = lineupEntry(last?.teams ?? [], joins, last?.partnerRule, now);
  if (entry) next[lobbyId] = entry;
  return next;
}
```

  **3e.** After `pruneLineup`, add:

```ts
/** The joins as the lobby stands: the seats that left taken out, and the joins with none left dropped. */
export function pruneJoins(joins: readonly LineupJoin[], seatIds: readonly string[]): LineupJoin[] {
  const present = new Set(seatIds);
  return joins
    .map(join => ({ ...join, seatIds: join.seatIds.filter(id => present.has(id)) }))
    .filter(join => join.seatIds.length);
}

/** One seat on one team: off any team it joined before, and onto `join`'s, or off all of them when there is none. */
export function withSeatJoin(joins: readonly LineupJoin[], seatId: string, join?: LineupJoin): LineupJoin[] {
  const rest = pruneJoins(joins, joins.flatMap(other => other.seatIds).filter(id => id !== seatId));
  return join ? [ ...rest, join ] : rest;
}
```

- [ ] **Step 4: Run it and see it pass, and run the whole suite**

Run: `cd $WT && node_modules/.bin/tsx --test $TESTS/lineup-joins.test.mts && node_modules/.bin/tsx --test $TESTS/*.test.mts 2>&1 | grep -E "^# (pass|fail)"`
Expected: `lineup-joins` passes (6 tests), and the whole suite shows `# fail 0`.

- [ ] **Step 5: Commit**

```bash
cd $WT && git add utils/teams.ts && git commit -m "$(cat <<'EOF'
feat: a lobby's lineup keeps the teams this account's seats joined

Online Teams: a screen's own word for its seats on other accounts' teams
lives beside its teams, so every reader of the lineup has it.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Every screen counts the joins

**Files:**
- Modify: `utils/team-room.ts`. Change the types (`:23-48`), `withRoom` (`:74-94`), `trusted` (`:139-164`), `ScreenTeams` (`:180-191`), `screenTeams` (`:194-233`) and `undoActor` (`:350-358`), and add `joinedSeats` and `myRoomJoins`.
- Test: `$TESTS/team-room-joins.test.mts` (new)

**Interfaces:**
- Consumes: `Lineup`, `LineupJoin` (Task 2), `MAX_PLAYERS` and `normalizeName` from `utils/teams.ts`.
- Produces:
  - `PROTOCOL_VERSION = 2`
  - `OLDEST_PROTOCOL = 1`
  - `RoomJoinInput { owner; team; seatIds }`
  - `RoomJoin extends RoomJoinInput { by }`
  - `RoomPeer.v?: number`
  - `RoomState.joins?: RoomJoin[]`
  - `ScreenTeams.joined: Map<string, RoomJoin>` (by seat id)
  - `joinedSeats(room: RoomState | undefined, players: readonly SeatLike[], me: string | null | undefined): Set<string>`
  - `myRoomJoins(players: readonly SeatLike[], lineup: Lineup | undefined): RoomJoinInput[]`

- [ ] **Step 1: Write the failing test** `$TESTS/team-room-joins.test.mts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";

import { joinedSeats, myRoomJoins, roomOf, screenTeams, undoActor, withRoom } from "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt-online-teams-join/utils/team-room.ts";

const A = "5e1f2afd-6ac0-4fb0-b98a-cb9cf2811917"; // CREAZY: the host, TEAM RED's captain
const B = "39a06afc-edfd-4a82-b1af-5155a475fa37"; // BEN: on their own board, joins TEAM RED
const C = "cccccccc-0000-4000-8000-000000000003"; // LISA: TEAM BLUE's captain
const D = "dddddddd-0000-4000-8000-000000000004"; // MAX: on their own board, joins TEAM BLUE
const LOBBY = "01a10312-5fd9-7b43-88ab-73ac80cb938e";
const crimson = { preset: "crimson", from: "#6a1624", to: "#b8323f" };
const ocean = { preset: "ocean", from: "#374c98", to: "#0b55df" };

const seat = (n: number, name: string, userId: string | null, hostId: string, index: number): any => ({ id: `01a10312-0000-7000-8000-0000000000${String(n).padStart(2, "0")}`, name, userId, hostId, cpuPPR: null, index });
const CREAZY = seat(1, "CREAZY", A, A, 0);
const LISA = seat(2, "LISA", C, C, 1);
const BEN = seat(3, "BEN", B, B, 2);
const MAX = seat(4, "MAX", D, D, 3);
const PLAYERS = [ CREAZY, LISA, BEN, MAX ];
const peer = (userId: string, name: string, v = 2) => ({ userId, name, v });
const PEERS = [ peer(A, "creazy"), peer(B, "ben"), peer(C, "lisa"), peer(D, "max") ];
const RED_ROOM: any = { owner: A, name: "TEAM RED", colour: crimson, format: "own", seatIds: [ CREAZY.id ], players: [ "CREAZY" ] };
const BLUE_ROOM: any = { owner: C, name: "TEAM BLUE", colour: ocean, format: "own", seatIds: [ LISA.id ], players: [ "LISA" ] };
const BEN_JOIN = { owner: A, team: "TEAM RED", seatIds: [ BEN.id ] };
const MAX_JOIN = { owner: C, team: "TEAM BLUE", seatIds: [ MAX.id ] };
const room = (extra: Record<string, unknown> = {}): any => ({ lobbyId: LOBBY, teams: [ RED_ROOM, BLUE_ROOM ], shifts: [], peers: PEERS, joins: [ { ...BEN_JOIN, by: B }, { ...MAX_JOIN, by: D } ], ...extra });
const lineup = (teams: any[], joins?: any[]): any => ({ at: 1, teams, ...(joins ? { joins } : {}) });
const RED_LINEUP = lineup([ { name: "TEAM RED", colour: crimson, seatIds: [ CREAZY.id ] } ]);
const BLUE_LINEUP = lineup([ { name: "TEAM BLUE", colour: ocean, seatIds: [ LISA.id ] } ]);
const BEN_LINEUP = lineup([], [ BEN_JOIN ]);
const screen = (me: string, own: any, extra: Record<string, unknown> = {}) => screenTeams({ players: PLAYERS, saved: [], lineup: own, shifts: {}, room: room(), me, hostId: A, ...extra } as any);
const teamsOf = (view: ReturnType<typeof screenTeams>) => (view.lineup?.teams ?? []).map(team => [ team.name, team.seatIds ]);
const BOTH = [ [ "TEAM RED", [ CREAZY.id, BEN.id ] ], [ "TEAM BLUE", [ LISA.id, MAX.id ] ] ];

test("screenTeams: a seat joined to a team counts on every screen, its captain's included", () => {
  assert.deepEqual(teamsOf(screen(A, RED_LINEUP)), BOTH, "CREAZY, RED's captain and the host");
  assert.deepEqual(teamsOf(screen(C, BLUE_LINEUP)), BOTH, "LISA, BLUE's captain");
  assert.deepEqual(teamsOf(screen(D, lineup([], [ MAX_JOIN ]))), BOTH, "MAX, who joined BLUE");
  const joined = screen(A, RED_LINEUP).joined;
  assert.deepEqual([ ...joined.keys() ], [ BEN.id, MAX.id ]);
  assert.equal(joined.get(BEN.id)?.by, B);
});

test("screenTeams: the joiner's own screen takes its seat from its lineup, never from the room", () => {
  assert.deepEqual(teamsOf(screen(B, BEN_LINEUP)), BOTH);
  assert.deepEqual(teamsOf(screen(B, undefined))[0], [ "TEAM RED", [ CREAZY.id ] ], "the room says BEN joined RED; BEN's lineup doesn't");
});

test("screenTeams: a join counts only onto a team that is there, with its author's own seats", () => {
  const stray = room({ joins: [ { owner: A, team: "TEAM GREEN", seatIds: [ BEN.id ], by: B }, { owner: C, team: "TEAM BLUE", seatIds: [ BEN.id ], by: D } ] });
  const view = screen(A, RED_LINEUP, { room: stray });
  assert.deepEqual(teamsOf(view), [ [ "TEAM RED", [ CREAZY.id ] ], [ "TEAM BLUE", [ LISA.id ] ] ]);
  assert.equal(view.joined.size, 0);
});

test("screenTeams: a seat its owner keeps on a team of their own stays there", () => {
  const twice = room({ joins: [ { owner: A, team: "TEAM RED", seatIds: [ LISA.id ], by: C } ] });
  assert.deepEqual(teamsOf(screen(A, RED_LINEUP, { room: twice })), [ [ "TEAM RED", [ CREAZY.id ] ], [ "TEAM BLUE", [ LISA.id ] ] ]);
});

test("screenTeams: a team takes six at most, the seats earlier in the lobby first", () => {
  const guests = [ 5, 6, 7, 8 ].map((n, i) => seat(n, `G${n}`, null, A, 10 + i));
  const players = [ ...PLAYERS, ...guests ];
  const five = lineup([ { name: "TEAM RED", colour: crimson, seatIds: [ CREAZY.id, ...guests.map(guest => guest.id) ] } ]);
  const crowded = room({ joins: [ { owner: A, team: "TEAM RED", seatIds: [ MAX.id ], by: D }, { ...BEN_JOIN, by: B } ] });
  const view = screenTeams({ players, saved: [], lineup: five, shifts: {}, room: crowded, me: A, hostId: A } as any);
  assert.deepEqual(teamsOf(view)[0], [ "TEAM RED", [ CREAZY.id, BEN.id, ...guests.map(guest => guest.id) ] ]);
  assert.deepEqual([ ...view.joined.keys() ], [ BEN.id ]);
});

test("screenTeams: a team's seats are in the lobby's order on every screen, whatever order a leg puts the players in", () => {
  const rotated = [ MAX, BEN, CREAZY, LISA ];
  assert.deepEqual(teamsOf(screen(A, RED_LINEUP, { players: rotated })), BOTH);
});

test("screenTeams: a room without joins (a protocol-1 server) counts none, this screen's own included", () => {
  const old = room({ joins: undefined, peers: PEERS.map(({ userId, name }) => ({ userId, name })) });
  const view = screen(B, BEN_LINEUP, { room: old });
  assert.deepEqual(teamsOf(view), [ [ "TEAM RED", [ CREAZY.id ] ], [ "TEAM BLUE", [ LISA.id ] ] ]);
  assert.equal(view.joined.size, 0);
  assert.equal(screen(B, BEN_LINEUP, { room: undefined }).lineup, undefined, "Online Teams off: no other account's team, and no join");
});

test("trusted: a join author has Tools in the room, so no captain can list its seat as a Tools-less friend's", () => {
  const away = room({ peers: [ peer(A, "creazy"), peer(C, "lisa") ], teams: [ RED_ROOM, { ...BLUE_ROOM, seatIds: [ LISA.id, MAX.id ] } ], joins: [ { owner: A, team: "TEAM RED", seatIds: [ MAX.id ], by: D } ] });
  assert.deepEqual(teamsOf(screen(B, undefined, { room: away })), [ [ "TEAM RED", [ CREAZY.id, MAX.id ] ], [ "TEAM BLUE", [ LISA.id ] ] ]);
});

test("joinedSeats: other accounts' seats they joined to a team, checked to be their own, whether or not the team is there", () => {
  assert.deepEqual([ ...joinedSeats(room(), PLAYERS, A) ], [ BEN.id, MAX.id ]);
  assert.deepEqual([ ...joinedSeats(room(), PLAYERS, B) ], [ MAX.id ], "not this account's own");
  assert.deepEqual([ ...joinedSeats(room({ joins: [ { owner: A, team: "GONE", seatIds: [ BEN.id, LISA.id ], by: B } ] }), PLAYERS, A) ], [ BEN.id ], "LISA's seat isn't B's to join");
  assert.deepEqual([ ...joinedSeats(room({ joins: undefined }), PLAYERS, A) ], []);
});

test("myRoomJoins: the lineup's joins, with the seats still here", () => {
  assert.deepEqual(myRoomJoins([ CREAZY, BEN ], BEN_LINEUP), [ BEN_JOIN ]);
  assert.deepEqual(myRoomJoins([ CREAZY ], BEN_LINEUP), []);
  assert.deepEqual(myRoomJoins(PLAYERS, undefined), []);
});

test("withRoom: after a restart, an author not back yet keeps its joins; one that is back has the room's word", () => {
  const before = withRoom(undefined, room(), 1);
  assert.deepEqual(roomOf(before, LOBBY)!.seen, [ A, B, C, D ]);
  const restarted = withRoom(before, { lobbyId: LOBBY, teams: [], shifts: [], peers: [ peer(A, "creazy") ], joins: [] }, 2);
  assert.deepEqual(roomOf(restarted, LOBBY)!.joins!.map(join => join.by), [ B, D ]);
  const back = withRoom(restarted, { lobbyId: LOBBY, teams: [], shifts: [], peers: [ peer(A, "creazy"), peer(B, "ben") ], joins: [] }, 3);
  assert.deepEqual(roomOf(back, LOBBY)!.joins!.map(join => join.by), [ D ], "BEN is back without joins: theirs went");
  assert.equal(roomOf(withRoom(before, { lobbyId: LOBBY, teams: [], shifts: [], peers: [] }, 4), LOBBY)!.joins, undefined, "a protocol-1 room carries none");
});

test("undoActor: an account with a join in the room has Tools there, so its own screen takes its checkout back", () => {
  assert.equal(undoActor(BEN, A, room({ peers: [ peer(A, "creazy") ] }), A), "none");
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `cd $WT && node_modules/.bin/tsx --test $TESTS/team-room-joins.test.mts`
Expected: FAIL with `does not provide an export named 'joinedSeats'`.

- [ ] **Step 3: Implement it in `utils/team-room.ts`.**

  **3a.** Imports (line 18): add `Lineup` to the type import from `@/utils/teams` if it's missing; it is already there. Add `MAX_PLAYERS` to the value import (line 20):

```ts
import { MAX_NAME_LENGTH, MAX_PLAYERS, findTeam, isHostedGuest, normalizeColour, normalizeName, sharedTeams, teamSeats } from "@/utils/teams";
```

  **3b.** Replace `PROTOCOL_VERSION` (lines 23–24):

```ts
/** Keep in step with socket/rooms.ts: 2 added joins. */
export const PROTOCOL_VERSION = 2;
/** What the client falls back to when a server refuses 2: one deployed before joins. */
export const OLDEST_PROTOCOL = 1;
```

  **3c.** Replace `RoomPeer` and `RoomState` (lines 47–48), and add the join types:

```ts
/**
 * Seats of one account's that play for another account's own-score team,
 * named by its owner and name: the joiner speaks for its own seats only.
 */
export interface RoomJoinInput {
  owner: string;
  team: string;
  seatIds: string[];
}

export interface RoomJoin extends RoomJoinInput {
  /** The account that said it, stamped by the server. */
  by: string;
}

export interface RoomPeer {
  userId: string;
  name: string;
  /** The oldest protocol among the account's sockets; a protocol-1 server sends none. */
  v?: number;
}

export interface RoomState {
  lobbyId: string;
  teams: RoomTeam[];
  shifts: RoomShift[];
  rule?: RoomRule;
  peers: RoomPeer[];
  /** Protocol 2: who joined which team. A room without it carries no joins. */
  joins?: RoomJoin[];
}
```

  **3d.** Replace `withRoom`'s doc comment and body:

```ts
/**
 * The room as it arrived, kept with the lobbies of the last day. A restarted
 * server comes back empty, and the first screen to rejoin hears that first:
 * an account that is neither a peer, an owner nor a joiner in the new state
 * keeps the teams, shifts and joins it had here, and an absent author its
 * rule, until it is back. A room from a protocol-1 server carries no joins.
 */
export function withRoom(store: RoomStore | undefined, state: RoomState, now: number): RoomStore {
  const next: RoomStore = {};
  for (const [ id, entry ] of Object.entries(store ?? {})) {
    if (id !== state.lobbyId && entry && now - entry.at < ROOM_TTL_MS) next[id] = entry;
  }
  const last = store?.[state.lobbyId];
  const before = last && now - last.at < ROOM_TTL_MS ? last : undefined;
  const here = new Set([ ...state.peers.map(peer => peer.userId), ...state.teams.map(team => team.owner), ...(state.joins ?? []).map(join => join.by) ]);
  const entry: RoomMirror = {
    ...state,
    teams: [ ...state.teams, ...(before?.teams ?? []).filter(team => !here.has(team.owner)) ],
    shifts: [ ...state.shifts, ...(before?.shifts ?? []).filter(shift => !here.has(shift.owner)) ],
    at: now,
    seen: [ ...new Set([ ...(before?.seen ?? []), ...here ]) ],
  };
  if (state.joins) entry.joins = [ ...state.joins, ...(before?.joins ?? []).filter(join => !here.has(join.by)) ];
  else delete entry.joins;
  const rule = state.rule ?? (before?.rule && !state.peers.some(peer => peer.userId === before.rule!.by) ? before.rule : undefined);
  if (rule) entry.rule = rule;
  else delete entry.rule;
  next[state.lobbyId] = entry;
  return next;
}
```

  **3e.** After `seatOwner`, add:

```ts
/** A seat's place in the lobby's order, which a leg's rotation of the match's `players` leaves alone. */
function lobbyPlace(players: readonly SeatLike[], id: string): number {
  const at = players.findIndex(seat => seat.id === id);
  return at < 0 ? Number.POSITIVE_INFINITY : players[at].index ?? at;
}

/** The accounts with Tools in a room: its peers, its teams' owners and its joins' authors. */
function inRoomOf(room: RoomState): Set<string> {
  return new Set([ ...room.peers.map(peer => peer.userId), ...room.teams.map(team => team.owner), ...(room.joins ?? []).map(join => join.by) ]);
}
```

  **3f.** In `trusted()`, replace the `inRoom` line with `const inRoom = inRoomOf(room);`. Then add this sentence to the end of its doc comment: "An account with a join in the room has Tools there, as one with a team does."

  **3g.** In `ScreenTeams`, after `mine`, add:

```ts
  /** Online Teams: the joins that count here, by seat: a seat of one account's on another account's own-score team. */
  joined: Map<string, RoomJoin>;
```

  **3h.** Before `screenTeams`, add:

```ts
/** An own-score team with the account that owns it: joins find their team by both. */
interface OwnedTeam { owner: string; team: LineupTeam }

/**
 * The joins this screen may count: none in a room that carries none (one from
 * a protocol-1 server), so no screen shows a team the others can't; this
 * account's own from its lineup, its own word, never the room's; the other
 * accounts' from the room.
 */
function joinsHere(room: RoomState | undefined, lineup: Lineup | undefined, me: string | null | undefined): RoomJoin[] {
  if (!room?.joins || !me) return [];
  return [
    ...(lineup?.joins ?? []).map(join => ({ owner: join.owner, team: join.team, seatIds: join.seatIds, by: me })),
    ...room.joins.filter(join => join.by && join.by !== me),
  ];
}

/**
 * Each join's seats onto its team, found by its owner and name among the
 * own-score teams this screen has taken. A seat counts when it is in
 * autodarts' data, is its joiner's own, is on no team yet (a team of its
 * owner's own keeps it), and the team has room. Seats earlier in the lobby's
 * order go first, so every screen fills a team alike, and a team that took a
 * seat is put back in the lobby's order. Returns the joins that count, by seat.
 */
function applyJoins(owned: OwnedTeam[], joins: readonly RoomJoin[], players: readonly SeatLike[]): Map<string, RoomJoin> {
  const joined = new Map<string, RoomJoin>();
  if (!joins.length) return joined;
  const byId = new Map(players.filter(seat => seat.id).map(seat => [ seat.id!, seat ]));
  const taken = new Set(owned.flatMap(entry => entry.team.seatIds));
  const candidates = joins
    .flatMap(join => (join.seatIds ?? []).map(id => ({ id, join })))
    .sort((a, b) => lobbyPlace(players, a.id) - lobbyPlace(players, b.id));
  const grown = new Set<OwnedTeam>();
  for (const { id, join } of candidates) {
    const target = owned.find(entry => entry.owner === join.owner && entry.team.name === normalizeName(join.team));
    if (!target || taken.has(id) || seatOwner(byId.get(id)) !== join.by || target.team.seatIds.length >= MAX_PLAYERS) continue;
    target.team.seatIds.push(id);
    taken.add(id);
    joined.set(id, join);
    grown.add(target);
  }
  for (const entry of grown) entry.team.seatIds.sort((a, b) => lobbyPlace(players, a) - lobbyPlace(players, b));
  return joined;
}
```

  **3i.** In `screenTeams`, replace the block from `const own: LineupTeam[] = …` down to the `if (own.length) { … }` sort with:

```ts
  // Own-score teams with their owners, as copies: joins add seats to them.
  const owned: OwnedTeam[] = [
    ...(lineup?.teams ?? []).map(team => ({ owner: me ?? "", team: { ...team, seatIds: [ ...team.seatIds ] } })),
    ...remote.filter(team => team.format === "own").map(team => ({ owner: team.owner, team: { name: team.name, colour: team.colour, seatIds: [ ...team.seatIds ] } })),
  ];
  const joined = applyJoins(owned, joinsHere(room, lineup, me), players);
  const teams = owned.map(entry => entry.team);
  if (owned.length > (lineup?.teams.length ?? 0) || joined.size) {
    // Every screen lists the teams alike (the pill's tally): by their first seat
    // in the lobby's order, which a leg's rotation of `players` leaves alone.
    const place = (team: LineupTeam) => Math.min(...team.seatIds.map(id => lobbyPlace(players, id)));
    teams.sort((a, b) => place(a) - place(b));
  }
```

  Then change the return to `return { shared, lineup: merged, shifts: mergedShifts, remote, mine, joined };`. The `merged` line below stays as it is, since it already reads `teams`.

  **3j.** In `undoActor`, change the `inRoom` line to:

```ts
  const inRoom = inRoomOf(room).has(owner) || Boolean(room.seen?.includes(owner));
```

  **3k.** After `myRoomTeams`, add:

```ts
/** This account's joins as the room should know them: its lineup's, each with the seats still in the lobby or match. */
export function myRoomJoins(players: readonly SeatLike[], lineup: Lineup | undefined): RoomJoinInput[] {
  const present = new Set(players.map(seat => seat.id).filter(Boolean));
  return (lineup?.joins ?? [])
    .map(join => ({ owner: join.owner, team: join.team, seatIds: join.seatIds.filter(id => present.has(id)) }))
    .filter(join => join.seatIds.length);
}

/**
 * The seats other accounts joined to a team, each checked to be its joiner's
 * own, whether or not the team is there: Local Lobby leaves them on their own
 * board, without needing anyone's lineup.
 */
export function joinedSeats(room: RoomState | undefined, players: readonly SeatLike[], me: string | null | undefined): Set<string> {
  const out = new Set<string>();
  if (!room?.joins) return out;
  const byId = new Map(players.filter(seat => seat.id).map(seat => [ seat.id!, seat ]));
  for (const join of room.joins) {
    if (join.by === me) continue;
    for (const id of join.seatIds ?? []) {
      if (seatOwner(byId.get(id)) === join.by) out.add(id);
    }
  }
  return out;
}
```

- [ ] **Step 4: Run it and see it pass, then run the whole suite**

Run: `cd $WT && node_modules/.bin/tsx --test $TESTS/team-room-joins.test.mts && node_modules/.bin/tsx --test $TESTS/*.test.mts 2>&1 | grep -E "^# (pass|fail)"`
Expected: `team-room-joins` passes (12 tests), and the whole suite shows `# fail 0`.

- [ ] **Step 5: Type-check against the baseline**

Run: `cd $WT && yarn compile 2>&1 | grep -c "error TS"`
Expected: `14`, the baseline. `RoomPeer.v` is optional and `RoomState.joins` is optional, so existing readers compile unchanged.

- [ ] **Step 6: Commit**

```bash
cd $WT && git add utils/team-room.ts && git commit -m "$(cat <<'EOF'
feat: every screen counts a seat joined to another account's team

Online Teams protocol 2: a join puts its author's own seats on a team,
found by its owner and name. A screen takes its own joins from its
lineup only, and a room from a protocol-1 server counts none.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: The offer to join, and who needs an update

**Files:**
- Modify: `utils/team-room.ts`. Change `StatusKind`, `StatusInput` and `roomStatus` (`:291-325`) and `StatusAccount`/`statusAccounts` (`:246-258`), and add `JoinTeam`, `JoinOffer` and `joinOffer`.
- Modify: `$TESTS/team-room.test.mts:214-217`. The `before` expectation gains `behind: false` on both accounts.
- Test: `$TESTS/team-room-offer.test.mts` (new)

**Interfaces:**
- Consumes: `ScreenTeams.joined`, `RoomJoin`, `PROTOCOL_VERSION`, `OLDEST_PROTOCOL` (Task 3).
- Produces:
  - `JoinTeam { owner: string; name: string; colour: ColorScheme; captain: string }`
  - `JoinOffer { teams: JoinTeam[]; behind: string[]; seatId: string | undefined; full: boolean }`
  - `joinOffer(input: { view: ScreenTeams; players: readonly RoomSeat[]; room: RoomState | undefined; me: string | null | undefined; sets: number; maxSeats: number }): JoinOffer | undefined`
  - `StatusKind` gains `"behind"`
  - `StatusInput.joined?: number`
  - `StatusAccount.behind: boolean`

- [ ] **Step 1: Write the failing test** `$TESTS/team-room-offer.test.mts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";

import { joinOffer, roomStatus, screenTeams, statusAccounts } from "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt-online-teams-join/utils/team-room.ts";

const A = "5e1f2afd-6ac0-4fb0-b98a-cb9cf2811917"; // CREAZY: the host, TEAM RED's captain
const B = "39a06afc-edfd-4a82-b1af-5155a475fa37"; // BEN: on their own board
const C = "cccccccc-0000-4000-8000-000000000003"; // LISA: TEAM BLUE's captain
const D = "dddddddd-0000-4000-8000-000000000004"; // MAX: on their own board
const LOBBY = "01a10312-5fd9-7b43-88ab-73ac80cb938e";
const crimson = { preset: "crimson", from: "#6a1624", to: "#b8323f" };
const ocean = { preset: "ocean", from: "#374c98", to: "#0b55df" };

const seat = (n: number, name: string, userId: string | null, hostId: string, index: number): any => ({ id: `01a10312-0000-7000-8000-0000000000${String(n).padStart(2, "0")}`, name, userId, hostId, cpuPPR: null, index });
const CREAZY = seat(1, "CREAZY", A, A, 0);
const LISA = seat(2, "LISA", C, C, 1);
const BEN = seat(3, "BEN", B, B, 2);
const MAX = seat(4, "MAX", D, D, 3);
const PLAYERS = [ CREAZY, LISA, BEN, MAX ];
const peer = (userId: string, name: string, v = 2) => ({ userId, name, v });
const PEERS = [ peer(A, "creazy"), peer(B, "ben"), peer(C, "lisa"), peer(D, "max") ];
const RED_ROOM: any = { owner: A, name: "TEAM RED", colour: crimson, format: "own", seatIds: [ CREAZY.id ], players: [ "CREAZY" ] };
const BLUE_ROOM: any = { owner: C, name: "TEAM BLUE", colour: ocean, format: "own", seatIds: [ LISA.id ], players: [ "LISA" ] };
const BEN_JOIN = { owner: A, team: "TEAM RED", seatIds: [ BEN.id ] };
const MAX_JOIN = { owner: C, team: "TEAM BLUE", seatIds: [ MAX.id ] };
const room = (extra: Record<string, unknown> = {}): any => ({ lobbyId: LOBBY, teams: [ RED_ROOM, BLUE_ROOM ], shifts: [], peers: PEERS, joins: [ { ...BEN_JOIN, by: B }, { ...MAX_JOIN, by: D } ], ...extra });
const lineup = (teams: any[], joins?: any[]): any => ({ at: 1, teams, ...(joins ? { joins } : {}) });
const screen = (me: string, own: any, extra: Record<string, unknown> = {}) => screenTeams({ players: PLAYERS, saved: [], lineup: own, shifts: {}, room: room(), me, hostId: A, ...extra } as any);
const offer = (me: string, own: any, extra: Record<string, unknown> = {}, lobby: { sets?: number; maxSeats?: number } = {}) => {
  const view = screen(me, own, extra);
  return joinOffer({ view, players: (extra.players as any) ?? PLAYERS, room: (extra.room as any) ?? room(), me, sets: lobby.sets ?? 0, maxSeats: lobby.maxSeats ?? 6 });
};

test("joinOffer: the other accounts' own-score teams, with their captains, for this account's own seat", () => {
  const free = room({ joins: [] });
  assert.deepEqual(offer(B, undefined, { room: free }), {
    teams: [ { owner: A, name: "TEAM RED", colour: crimson, captain: "CREAZY" }, { owner: C, name: "TEAM BLUE", colour: ocean, captain: "LISA" } ],
    behind: [],
    seatId: BEN.id,
    full: false,
  });
});

test("joinOffer: nothing once this account's seat is on a team, or it captains one, or in a sets lobby, or in a protocol-1 room", () => {
  assert.equal(offer(B, lineup([], [ BEN_JOIN ])), undefined, "BEN plays for RED");
  assert.equal(offer(C, lineup([ { name: "TEAM BLUE", colour: ocean, seatIds: [ LISA.id ] } ]), { room: room({ joins: [] }) }), undefined, "LISA captains BLUE");
  assert.equal(offer(B, undefined, { room: room({ joins: [] }) }, { sets: 3 }), undefined, "a sets lobby");
  assert.equal(offer(B, undefined, { room: room({ joins: undefined }) }), undefined, "a protocol-1 room");
});

test("joinOffer: a shared-score lobby offers nothing", () => {
  const TEAM_SEAT = seat(9, "TEAM RED", null, A, 0);
  const shared = { lobbyId: LOBBY, teams: [ { owner: A, name: "TEAM RED", colour: crimson, format: "shared", seatIds: [ TEAM_SEAT.id ], players: [ "ANNA", "TOM" ] } ], shifts: [], peers: PEERS, joins: [] };
  assert.equal(offer(B, undefined, { room: shared, players: [ TEAM_SEAT, BEN ] }), undefined);
});

test("joinOffer: without a seat of its own, Play for seats this account while the lobby has room", () => {
  const free = room({ joins: [] });
  const players = [ CREAZY, LISA ];
  const pick = (result: any) => result && { seatId: result.seatId, full: result.full };
  assert.deepEqual(pick(offer(B, undefined, { room: free, players })), { seatId: undefined, full: false });
  assert.deepEqual(pick(offer(B, undefined, { room: free, players }, { maxSeats: 2 })), { seatId: undefined, full: true });
});

test("joinOffer: an account still on protocol 1 is named, and a full team isn't offered", () => {
  const old = room({ joins: [], peers: [ peer(A, "creazy"), peer(B, "ben"), peer(C, "lisa"), peer(D, "max", 1) ] });
  assert.deepEqual(offer(B, undefined, { room: old })?.behind, [ "MAX" ]);
  const guests = [ 5, 6, 7, 8, 9 ].map((n, i) => seat(n, `G${n}`, null, A, 10 + i));
  const fullRed = room({ joins: [], teams: [ { ...RED_ROOM, seatIds: [ CREAZY.id, ...guests.map(guest => guest.id) ] }, BLUE_ROOM ] });
  assert.deepEqual(offer(B, undefined, { room: fullRed, players: [ ...PLAYERS, ...guests ] }, { maxSeats: 12 })?.teams.map(team => team.name), [ "TEAM BLUE" ]);
});

test("roomStatus: with joins counting here, an account still on protocol 1 is named", () => {
  const old = room({ peers: [ peer(A, "creazy"), peer(B, "ben"), peer(C, "lisa", 1) ] });
  const input: any = { connection: "connected", joinedAt: 0, now: 1, room: old, players: PLAYERS, me: A, firstSeen: {} };
  assert.deepEqual(roomStatus({ ...input, joined: 2 }), { kind: "behind", names: [ "LISA" ] });
  assert.equal(roomStatus({ ...input, joined: 0 }).kind, "synced", "no join counts: nothing to miss");
  assert.equal(roomStatus({ ...input, joined: 2, room: room() }).kind, "synced", "everyone on 2");
  assert.equal(roomStatus({ ...input, joined: 2, connection: "offline" }).kind, "offline");
});

test("statusAccounts: an account's joined team is listed, and one on protocol 1 is marked", () => {
  const old = room({ peers: [ peer(A, "creazy"), peer(B, "ben"), peer(C, "lisa", 1) ] });
  const accounts = statusAccounts({ room: old, me: A, myName: "creazy", players: PLAYERS, myTeams: [ "TEAM RED" ], connection: "connected" });
  assert.deepEqual(accounts.map(account => [ account.name, account.teams, account.connected, account.behind ]), [
    [ "CREAZY", [ "TEAM RED" ], true, false ],
    [ "LISA", [ "TEAM BLUE" ], true, true ],
    [ "BEN", [ "TEAM RED" ], true, false ],
    [ "MAX", [ "TEAM BLUE" ], false, false ],
  ]);
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `cd $WT && node_modules/.bin/tsx --test $TESTS/team-room-offer.test.mts`
Expected: FAIL with `does not provide an export named 'joinOffer'`.

- [ ] **Step 3: Implement it in `utils/team-room.ts`.**

  **3a.** Replace `StatusAccount` and `statusAccounts`:

```ts
/** An account on the status card: whether its Tools is in the room, and its teams there, the ones it joined included. */
export interface StatusAccount {
  userId: string;
  name: string;
  you: boolean;
  connected: boolean;
  teams: string[];
  /** Its Tools is in the room on protocol 1, so its screen can't show who joined which team. */
  behind: boolean;
}

/** The status card's accounts: this one first, by the room's name for it or else its token's, then every other account with seats here. */
export function statusAccounts(input: { room: RoomState | undefined; me: string | null; myName: string; players: readonly RoomSeat[]; myTeams: readonly string[]; connection: Connection }): StatusAccount[] {
  const { room, me, myName, players, myTeams, connection } = input;
  const peers = new Map((room?.peers ?? []).map(peer => [ peer.userId, peer ]));
  const teamsOf = (userId: string) => [
    ...(room?.teams ?? []).filter(team => team.owner === userId).map(team => normalizeName(team.name)),
    ...(room?.joins ?? []).filter(join => join.by === userId).map(join => normalizeName(join.team)),
  ];
  const behind = (userId: string) => Boolean(room?.joins) && (peers.get(userId)?.v ?? PROTOCOL_VERSION) < PROTOCOL_VERSION;
  const self = me ? peers.get(me) : undefined;
  const out: StatusAccount[] = me ? [ { userId: me, name: normalizeName(self?.name ?? myName), you: true, connected: connection === "connected" && peers.has(me), teams: [ ...myTeams ], behind: false } ] : [];
  for (const account of otherAccounts(players, me)) out.push({ userId: account.userId, name: account.name, you: false, connected: peers.has(account.userId), teams: teamsOf(account.userId), behind: behind(account.userId) });
  return out;
}
```

  **3b.** After `inviteGame`, add:

```ts
/** An own-score team of another account's that this account can play for, and its captain's name. */
export interface JoinTeam {
  owner: string;
  name: string;
  colour: ColorScheme;
  captain: string;
}

/** What the invitation offers an account with no team: Play for each team with room, and why the buttons may be greyed. */
export interface JoinOffer {
  teams: JoinTeam[];
  /** Accounts in the room still on protocol 1, by name: their screens can't show a join, so nobody joins until they update. */
  behind: string[];
  /** This account's own seat, which a join brings; none when Play for has to seat it first. */
  seatId: string | undefined;
  /** No seat of its own, and none free in the lobby. */
  full: boolean;
}

/**
 * Play for: the other accounts' own-score teams with room for one more, for an
 * account none of whose seats is on a team. None in a sets lobby, a shared-score
 * one, or a room that carries no joins.
 */
export function joinOffer(input: { view: ScreenTeams; players: readonly RoomSeat[]; room: RoomState | undefined; me: string | null | undefined; sets: number; maxSeats: number }): JoinOffer | undefined {
  const { view, players, room, me, sets, maxSeats } = input;
  if (!me || !room?.joins || sets || view.shared.size || view.mine.size) return undefined;
  if ([ ...view.joined.values() ].some(join => join.by === me)) return undefined;
  const own = view.remote.filter(team => team.format === "own");
  if (!own.length) return undefined;
  const sizes = new Map((view.lineup?.teams ?? []).map(team => [ team.name, team.seatIds.length ]));
  const names = new Map(otherAccounts(players, me).map(account => [ account.userId, account.name ]));
  for (const peer of room.peers) names.set(peer.userId, normalizeName(peer.name));
  const teams = own
    .filter(team => (sizes.get(team.name) ?? team.seatIds.length) < MAX_PLAYERS)
    .map(team => ({ owner: team.owner, name: team.name, colour: team.colour, captain: names.get(team.owner) ?? "" }));
  if (!teams.length) return undefined;
  const seatId = players.find(seat => seat.id && seat.userId === me)?.id ?? undefined;
  const behind = room.peers.filter(peer => peer.userId !== me && (peer.v ?? OLDEST_PROTOCOL) < PROTOCOL_VERSION).map(peer => normalizeName(peer.name));
  return { teams, behind, seatId, full: !seatId && players.length >= maxSeats };
}
```

  **3c.** Update the status types and `roomStatus`:

```ts
export type StatusKind = "connecting" | "ready" | "synced" | "missing" | "offline" | "outdated" | "behind";
```

  In `StatusInput`, after `firstSeen`, add:

```ts
  /** How many joins count in this lobby: with any, an account in the room still on protocol 1 is named. */
  joined?: number;
```

  In `roomStatus`, after the `if (input.connection !== "connected") …` line, add:

```ts
  // Their screens show joined players without a team: worth naming before anything else.
  if (input.joined && input.room?.joins) {
    const behind = input.room.peers.filter(peer => peer.userId !== input.me && (peer.v ?? OLDEST_PROTOCOL) < PROTOCOL_VERSION);
    if (behind.length) return { kind: "behind", names: behind.map(peer => normalizeName(peer.name)) };
  }
```

  Update its doc comment to: "The lobby's status chip: the connection first; once connected, anyone in the room who can't show the joins that count here, then the other accounts in the room, or those with seats here whose Tools hasn't shown up within MISSING_AFTER_MS of both their first seat and our joining."

- [ ] **Step 4: Update the earlier test that compares whole accounts.** In `$TESTS/team-room.test.mts`, the `before` expectation in the `statusAccounts` test becomes:

```ts
  assert.deepEqual(before, [
    { userId: A, name: "CREAZY", you: true, connected: false, teams: [ "TEAM RED" ], behind: false },
    { userId: B, name: "CREAZY_DEV", you: false, connected: false, teams: [], behind: false },
  ]);
```

- [ ] **Step 5: Run the tests and see them pass**

Run: `cd $WT && node_modules/.bin/tsx --test $TESTS/team-room-offer.test.mts && node_modules/.bin/tsx --test $TESTS/*.test.mts 2>&1 | grep -E "^# (pass|fail)"`
Expected: `team-room-offer` passes (8 tests), and the suite shows `# fail 0`.

- [ ] **Step 6: Type-check**

Run: `cd $WT && yarn compile 2>&1 | grep "error TS"`
Expected: the 14 baseline errors only. `TeamRoomStatus.vue`'s `CHIP` table now misses `behind`. If that shows as a new error, Task 9 fixes it. To keep this task green, change the `CHIP` type there now to `Record<Exclude<StatusKind, "synced" | "missing" | "behind">, MessageKey>`.

- [ ] **Step 7: Commit**

```bash
cd $WT && git add utils/team-room.ts entrypoints/lobby.content/TeamRoomStatus.vue && git commit -m "$(cat <<'EOF'
feat: Online Teams offers to join a team, and names who needs an update

joinOffer lists the other accounts' own-score teams with room for an
account whose seats are on no team. The chip's new "behind" state names
an account still on protocol 1 while joins count, and the status card
lists the teams an account joined.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: The client speaks 2, falls back to 1, and sends joins

**Files:**
- Modify: `utils/team-room-client.ts` (changes below)
- Test: `$TESTS/room-client-joins.test.mts` (new)

**Interfaces:**
- Consumes: `PROTOCOL_VERSION`, `OLDEST_PROTOCOL` and `RoomJoinInput` (Task 3), and the server's `room:joins` (Task 1).
- Produces:
  - `RoomClientState.protocol: number | undefined`
  - `RoomClient.publishJoins(joins: RoomJoinInput[]): void`

- [ ] **Step 1: Write the failing test** `$TESTS/room-client-joins.test.mts`:

```ts
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import { after, test } from "node:test";
import assert from "node:assert/strict";

import { RoomClient } from "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt-online-teams-join/utils/team-room-client.ts";

const WT = "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt-online-teams-join";
const SCR = "/private/tmp/claude-501/-Volumes-WD-BLACK-PROJECTS-Autodarts-autodarts-tools-wxt/bb928eee-867d-4a8e-9b72-e7cf73df4e2f/scratchpad";
const LOBBY = "01a10312-5fd9-7b43-88ab-73ac80cb938e";
const A = { userId: "5e1f2afd-6ac0-4fb0-b98a-cb9cf2811917", name: "creazy" };
const B = { userId: "39a06afc-edfd-4a82-b1af-5155a475fa37", name: "creazy_dev" };
const RED: any = { name: "TEAM RED", colour: { preset: "crimson", from: "#6a1624", to: "#b8323f" }, format: "own", seatIds: [ "01a10312-0000-7000-8000-000000000001" ], players: [ "CREAZY" ] };
const JOIN = { owner: A.userId, team: "TEAM RED", seatIds: [ "01a10312-0000-7000-8000-000000000003" ] };

const servers = new Map<number, ChildProcess>();
const clients: RoomClient[] = [];

async function serve(dir: string, port: number) {
  const server = spawn("bun", [ "run", "index.ts" ], { cwd: dir, env: { ...process.env, PORT: String(port) }, stdio: "ignore" });
  servers.set(port, server);
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(`http://localhost:${port}/health`)).ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`no server from ${dir} on ${port}`);
}

async function stop(port: number) {
  const server = servers.get(port);
  servers.delete(port);
  if (!server || server.exitCode !== null || server.signalCode !== null) return;
  const exited = new Promise(resolve => server.once("exit", resolve));
  server.kill();
  await exited;
}

/** The server as Tools 3.3.0 met it (protocol 1 only): the files from the commit this branch starts at. */
function oldServer(): string {
  const dir = `${SCR}/old-server`;
  mkdirSync(dir, { recursive: true });
  for (const file of [ "index.ts", "rooms.ts" ]) writeFileSync(`${dir}/${file}`, execFileSync("git", [ "-C", WT, "show", `c8cb993:socket/${file}` ]));
  if (!existsSync(`${dir}/node_modules`)) symlinkSync(`${WT}/socket/node_modules`, `${dir}/node_modules`);
  return dir;
}

/** A server that refuses every protocol, as a far newer one would. */
function refusingServer(): string {
  const dir = `${SCR}/refusing-server`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/index.ts`, [
    "import { createServer } from \"node:http\";",
    "import { Server } from \"socket.io\";",
    "const http = createServer((request, response) => { response.writeHead(request.url === \"/health\" ? 200 : 404).end(\"{}\"); });",
    "const io = new Server(http, { transports: [ \"websocket\" ] });",
    "io.use((socket, next) => next(new Error(\"version\")));",
    "http.listen(Number(process.env.PORT));",
  ].join("\n"));
  if (!existsSync(`${dir}/node_modules`)) symlinkSync(`${WT}/socket/node_modules`, `${dir}/node_modules`);
  return dir;
}

function until(check: () => boolean, ms = 8000): Promise<void> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const poll = setInterval(() => {
      if (check()) { clearInterval(poll); resolve(); }
      else if (Date.now() - started > ms) { clearInterval(poll); reject(new Error("timed out")); }
    }, 25);
  });
}

function client(identity: typeof A, port: number): RoomClient {
  const made = new RoomClient({ url: `http://localhost:${port}`, identity: async () => identity });
  clients.push(made);
  return made;
}

after(async () => {
  for (const made of clients) made.stop();
  for (const port of [ ...servers.keys() ]) await stop(port);
});

test("protocol 2: a join reaches every screen, stamped with its author, and goes when taken back", async () => {
  await serve(`${WT}/socket`, 4471);
  const a = client(A, 4471);
  const b = client(B, 4471);
  await a.start(LOBBY);
  await b.start(LOBBY);
  a.setJoin(true);
  b.setJoin(true);
  a.publishTeams([ RED ]);
  b.publishJoins([ JOIN ]);
  await until(() => a.state.room?.joins?.length === 1 && b.state.room?.joins?.length === 1);
  assert.deepEqual(a.state.room!.joins, [ { ...JOIN, by: B.userId } ]);
  assert.equal(b.state.protocol, 2);
  assert.deepEqual(a.state.room!.peers.map(peer => peer.v), [ 2, 2 ]);
  b.publishJoins([]);
  await until(() => a.state.room?.joins?.length === 0);
});

test("protocol 2: after a server restart, the joins are sent again", async () => {
  const [ a, b ] = clients;
  b.publishJoins([ JOIN ]);
  await until(() => a.state.room?.joins?.length === 1);
  await stop(4471);
  await serve(`${WT}/socket`, 4471);
  await until(() => a.state.room?.joins?.length === 1 && a.state.room?.teams.length === 1, 20_000);
  assert.deepEqual(a.state.room!.joins, [ { ...JOIN, by: B.userId } ]);
});

test("a server from before joins: the client falls back to 1, sends no joins, and teams still work", async () => {
  await serve(oldServer(), 4472);
  const a = client(A, 4472);
  await a.start(LOBBY);
  a.setJoin(true);
  a.publishTeams([ RED ]);
  a.publishJoins([ JOIN ]);
  await until(() => a.state.room?.teams.length === 1);
  assert.equal(a.state.connection, "connected");
  assert.equal(a.state.protocol, 1);
  assert.equal(a.state.room!.joins, undefined);
});

test("a server that refuses 1 too: outdated", async () => {
  await serve(refusingServer(), 4473);
  const a = client(A, 4473);
  await a.start(LOBBY);
  await until(() => a.state.connection === "outdated");
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `cd $WT && node_modules/.bin/tsx --test $TESTS/room-client-joins.test.mts`
Expected: FAIL with `b.publishJoins is not a function`. Its process may hang for the 8 s timeout on the outdated test.

- [ ] **Step 3: Implement it in `utils/team-room-client.ts`.**

  **3a.** Imports:

```ts
import type { Connection, RoomJoinInput, RoomState, RoomTeamInput } from "@/utils/team-room";

import { OLDEST_PROTOCOL, PROTOCOL_VERSION, tokenAccount } from "@/utils/team-room";
```

  **3b.** In `RoomClientState`, after `room`, add:

```ts
  /** The protocol the server took: 2, or 1 from a server deployed before joins. Undefined until connected. */
  protocol: number | undefined;
```

  and add `protocol: undefined` to the `state` initializer, and to the `update` in `stop()`.

  **3c.** Add a field after `listeners`, and widen `intended` and `sent`:

```ts
  /** Protocol 2 until a server refuses it; then 1, for this client's life, so a page talks to an older server as 3.3.0 did. */
  private protocol = PROTOCOL_VERSION;
```

```ts
  private intended: { teams?: RoomTeamInput[]; rule?: boolean; shifts?: Record<string, number>; joins?: RoomJoinInput[] } = {};
  private sent: { teams: string; rule: boolean | undefined; shifts: Record<string, number>; joins: string } = { teams: "", rule: undefined, shifts: {}, joins: "" };
```

  Then change both resets in `joinRoom` and `leaveRoom` to `this.sent = { teams: "", rule: undefined, shifts: {}, joins: "" };`.

  **3d.** After `publishShift`, add:

```ts
  /** The seats this account joined to other accounts' teams, sent after its teams, and again after every (re)join. A protocol-1 server is sent none. */
  publishJoins(joins: RoomJoinInput[]) {
    this.intended.joins = joins;
    this.flush();
  }
```

  **3e.** In `stop()`, before the `update`, add `this.protocol = PROTOCOL_VERSION;`. The next page tries 2 again.

  **3f.** In `connect()`:
  - the handshake becomes `auth: { v: this.protocol, userId: identity.userId, name: identity.name },`
  - in the `"connect"` listener, the update becomes `this.update({ connection: "connected", protocol: this.protocol });`
  - the `connect_error` listener becomes:

```ts
    socket.on("connect_error", (error: Error) => {
      console.log("Autodarts Tools: Online Teams - connection failed:", error?.message);
      if (error?.message === "version") {
        // A server deployed before this protocol: Online Teams as it was, without joins.
        if (this.protocol > OLDEST_PROTOCOL) {
          this.protocol = OLDEST_PROTOCOL;
          socket.auth = { v: this.protocol, userId: identity.userId, name: identity.name };
          socket.connect();
          return;
        }
        this.update({ connection: "outdated" });
        socket.disconnect();
        return;
      }
      this.update({ connection: "offline" });
    });
```

  **3g.** In `flush()`, read `joins` from `this.intended` too, and after the `if (teams) { … }` block add:

```ts
    if (joins && this.protocol > OLDEST_PROTOCOL) {
      const key = JSON.stringify(joins);
      if (key !== this.sent.joins) {
        this.sent.joins = key;
        const answer = await this.send("room:joins", { joins });
        if (this.unsent(answer) && this.sent.joins === key) this.sent.joins = "";
      }
    }
```

  Change its doc comment to "Teams first: the room takes a shift only for a team it knows. Joins come after the teams, which is the order they make sense in."

- [ ] **Step 4: Run it and see it pass, then the earlier client and server tests**

Run: `cd $WT && node_modules/.bin/tsx --test $TESTS/room-client-joins.test.mts $TESTS/room-client.test.mts $TESTS/server-smoke.test.mts 2>&1 | grep -E "^# (pass|fail)"`
Expected: `# fail 0`.

- [ ] **Step 5: Type-check, and commit**

Run: `cd $WT && yarn compile 2>&1 | grep -c "error TS"`. Expected `14`.

```bash
cd $WT && git add utils/team-room-client.ts && git commit -m "$(cat <<'EOF'
feat: Online Teams' client speaks protocol 2, and falls back to 1

It sends this account's joins after its teams, again after every
rejoin, and none to a server that refused 2: there Online Teams works
as in 3.3.0.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: The new texts, in English, German and Dutch

**Files:**
- Modify: `locales/en/teams.ts`, `locales/de/teams.ts`, `locales/nl/teams.ts`

**Interfaces:**
- Produces these message keys:
  - `teams.lobby.leave.title`
  - `teams.lobby.leave.label` (`{team}`)
  - `teams.problems.notSeated`
  - `teams.online.status.behind` (plural, `{names}`, `count`)
  - `teams.online.invitation.play` (`{team}`)
  - `teams.online.invitation.behind` (plural, `{names}`, `count`)

- [ ] **Step 1: Check the site's own words.**

Run: `cd $WT && yarn i18n:site "leave"` and `cd $WT && yarn i18n:site "play"`.

If the site has a word for leaving (for example its "Leave lobby" in German and Dutch), use that verb below. The strings in Step 2 assume *verlassen* and *verlaten*, the site's verbs for leaving a lobby. Change them only if the site's own words differ.

- [ ] **Step 2: Add the keys.**

  **English** (`locales/en/teams.ts`). In `lobby`, after `edit`:

```ts
    /** The button on your own row when your seat plays for another account's team (Online Teams): its tooltip, and its spoken name. */
    leave: {
      title: "Leave team",
      label: "Leave {team}",
    },
```

  In `problems`, after `namesNotAdded`:

```ts
    /** When Play for (online.invitation.play) couldn't seat this account in the lobby. */
    notSeated: "autodarts didn't add you to the lobby. Try again.",
```

  In `online.status`, after `outdated`:

```ts
      /** While a player plays for another account's team: the accounts whose Tools is too old to show it. */
      behind: { one: "{names} needs a newer Tools", other: "{names} need a newer Tools" },
```

  In `online.invitation`, after `newTeam`:

```ts
      /** One button per own-score team of another account: this account's own seat joins it, from its own board. */
      play: "Play for {team}",
      /** Under the Play for buttons, greyed while an account in the room is still on an older Tools. */
      behind: {
        one: "{names} needs a newer Tools before anyone can join a team from their own board",
        other: "{names} need a newer Tools before anyone can join a team from their own board",
      },
```

  **German** (`locales/de/teams.ts`), at the same places:

```ts
    leave: {
      title: "Team verlassen",
      label: "{team} verlassen",
    },
```

```ts
    notSeated: "autodarts hat dich nicht zur Lobby hinzugefügt. Versuch es noch einmal.",
```

```ts
      behind: { one: "{names} braucht ein neueres Tools", other: "{names} brauchen ein neueres Tools" },
```

```ts
      play: "Für {team} spielen",
      behind: {
        one: "{names} braucht ein neueres Tools, bevor jemand vom eigenen Board aus einem Team beitreten kann",
        other: "{names} brauchen ein neueres Tools, bevor jemand vom eigenen Board aus einem Team beitreten kann",
      },
```

  **Dutch** (`locales/nl/teams.ts`), at the same places:

```ts
    leave: {
      title: "Team verlaten",
      label: "{team} verlaten",
    },
```

```ts
    notSeated: "autodarts heeft je niet aan de lobby toegevoegd. Probeer het opnieuw.",
```

```ts
      behind: { one: "{names} heeft een nieuwere Tools nodig", other: "{names} hebben een nieuwere Tools nodig" },
```

```ts
      play: "Spelen voor {team}",
      behind: {
        one: "{names} heeft een nieuwere Tools nodig voordat iemand vanaf het eigen bord bij een team kan",
        other: "{names} hebben een nieuwere Tools nodig voordat iemand vanaf het eigen bord bij een team kan",
      },
```

- [ ] **Step 3: Run the check**

Run: `cd $WT && yarn i18n:check`
Expected: it passes, with no missing or extra key, no mismatched placeholder, and no text "still the English". If it flags a German or Dutch string as still the English, reword that string; don't add it to `same-as-english.json`.

- [ ] **Step 4: Commit**

```bash
cd $WT && git add locales/en/teams.ts locales/de/teams.ts locales/nl/teams.ts && git commit -m "$(cat <<'EOF'
feat: the words for joining a team from your own board

Play for, Leave team, the chip's and the invitation's line about an
account on an older Tools, and the problem when autodarts didn't seat
you, in English, German and Dutch.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Play for, in the lobby

**Files:**
- Modify: `utils/lobby-guests.ts` (add `addSelf` after `addGuest`)
- Modify: `entrypoints/lobby.content/teams.ts`. Change the imports (`:32-47`), `InviteView` (`:216-234`), `StatusView` (`:201-214`), the `statusView` and `inviteView` initializers (`:280`, `:286-307`), `pruneSeats` (`:547-553`), `syncRoom` (`:609-635`) and `syncOnline` (`:651-682`), and add `writeJoins`, `ownSeat`, `waitForOwnSeat`, `playFor` and `leaveTeam`.
- Modify: `entrypoints/lobby.content/TeamInvite.vue`

**Interfaces:**
- Consumes: `joinOffer`, `JoinTeam`, `myRoomJoins` (Tasks 3–4); `withJoins`, `pruneJoins`, `withSeatJoin`, `LineupJoin` (Task 2); `RoomClient.publishJoins` (Task 5); the keys of Task 6.
- Produces:
  - `addSelf(name: string, feature: string): Promise<boolean>`
  - `leaveTeam(seatId: string): Promise<void>`, which Task 8's row button calls
  - `StatusView.joined: number`, which Task 9's chip reads

- [ ] **Step 1: Add `addSelf` to `utils/lobby-guests.ts`**, after `addGuest`:

```ts
/**
 * Seat this account in the lobby on screen, on its own board, with the request
 * the site's own /join/<lobby> page makes ({ name, userId, boardId }, read from
 * the site on 2026-10-06). Resolves whether autodarts took it.
 */
export async function addSelf(name: string, feature: string): Promise<boolean> {
  const lobbyId = lobbyIdFromUrl();
  const userId = await getUserIdFromToken();
  if (!lobbyId || !userId) {
    console.warn(`Autodarts Tools: ${feature} - Cannot take a seat without a lobby and a user id`);
    return false;
  }

  try {
    const response = await fetchWithAuth(`https://api.autodarts.com/gs/v0/lobbies/${lobbyId}/players`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, userId, boardId: selectedBoard() }),
    });
    if (!response.ok) console.error(`Autodarts Tools: ${feature} - Failed to take a seat`, response.status, response.statusText);
    return response.ok;
  } catch (error) {
    console.error(`Autodarts Tools: ${feature} - Error taking a seat:`, error);
    return false;
  }
}
```

- [ ] **Step 2: Wire the data in `entrypoints/lobby.content/teams.ts`.**

  **2a.** Imports:

```ts
import type { Connection, JoinTeam, RoomSeat, RoomState, RoomStore, ScreenTeams } from "@/utils/team-room";
```

```ts
import type { Lineup, LineupJoin, LineupStore, LineupTeam, OwnDraft, PartnerCard, SavedTeam, SeatLike, SeatSlot, TeamDraft, TeamFormat, TeamsMessage, TeamsProblem } from "@/utils/teams";
```

```ts
import { addBot, addGuest, addSelf, lobbyIdFromUrl, moveSeat } from "@/utils/lobby-guests";
```

  Add `pruneJoins`, `withJoins` and `withSeatJoin` to the `@/utils/teams` value import, keeping it alphabetical as it is. The team-room import becomes:

```ts
import { inviteLists, joinOffer, myRoomJoins, myRoomTeams, otherAccounts, roomOf, screenTeams, seatOwner, shouldJoin } from "@/utils/team-room";
```

  **2b.** In `StatusView`, after `myTeams`, add:

```ts
  /** How many joins count in this lobby: the chip names any account whose Tools can't show them. */
  joined: number;
```

  and add `joined: 0` to the `statusView` initializer.

  **2c.** In `InviteView`, after `reasons`, add:

```ts
  /** Online Teams: the other accounts' own-score teams this account can play for from its own board (utils/team-room.ts `joinOffer`). */
  play: JoinTeam[];
  /** Accounts in the room still on an older Tools, by name: Play for waits for them. */
  behind: string[];
  /** This account has no seat, and the lobby none free: Play for can't seat it. */
  full: boolean;
```

  After `join`, add:

```ts
  playFor: (team: JoinTeam) => void;
```

  In the `inviteView` initializer, add `play: [], behind: [], full: false,` after `reasons: [],`, and after `join` add:

```ts
  playFor: (team) => {
    playFor(team).catch(e => console.error(e));
  },
```

  **2d.** Replace `pruneSeats`:

```ts
/** A seat that left the lobby leaves its team, and its join. */
function pruneSeats(lineup: Lineup) {
  const ids = (lobby?.players ?? []).map(seat => seat.id).filter((id): id is string => Boolean(id));
  const pruned = pruneLineup(lineup.teams, ids);
  if (JSON.stringify(pruned) !== JSON.stringify(lineup.teams)) writeLineup(pruned).catch(e => console.error(e));
  const joins = pruneJoins(lineup.joins ?? [], ids);
  if (JSON.stringify(joins) !== JSON.stringify(lineup.joins ?? [])) writeJoins(joins).catch(e => console.error(e));
}
```

  **2e.** After `writeLineupTeam`, add:

```ts
/** This lobby's joins written into its lineup, beside its teams (utils/teams.ts `withJoins`). */
async function writeJoins(joins: readonly LineupJoin[]) {
  if (!lobby) return;
  lineups = withJoins(lineups, lobby.id, joins, Date.now());
  await AutodartsToolsTeamLineups.setValue(lineups);
}
```

  **2f.** In `syncRoom`, after `roomClient.publishTeams(mine);`, add:

```ts
  roomClient.publishJoins(myRoomJoins(players, localLineup()));
```

  **2g.** In `syncOnline`, replace the first `Object.assign(statusView, …)` line, and the `Object.assign(inviteView, { show: …, … })` call, with:

```ts
  // This account's seats on other accounts' teams: theirs to leave, and no invitation while there are any.
  const myJoins = [ ...view.joined.values() ].filter(join => join.by === hostId);
  Object.assign(statusView, { players: lobby.players ?? [], me: hostId, myName, firstSeen: { ...firstSeen }, myTeams: [ ...view.mine, ...myJoins.map(join => normalizeName(join.team)) ], joined: view.joined.size });
  syncInviteButton();
  const format: TeamFormat = view.remote.some(team => team.format === "own") ? "own" : "shared";
  const lists = inviteLists(saved, format, lobby.sets ?? 0);
  // Only while connected: offline, the mirror may still carry joins, and a join made now would show on this screen alone.
  const connected = roomClient?.state.connection === "connected";
  const offer = connected ? joinOffer({ view, players: lobby.players ?? [], room: roomOf(roomStore, lobby.id), me: hostId, sets: lobby.sets ?? 0, maxSeats: lobby.maxPlayers || 6 }) : undefined;
  Object.assign(inviteView, {
    show: view.remote.length > 0 && view.mine.size === 0 && !myJoins.length && !dismissed.has(lobby.id),
    teams: view.remote.map(team => ({ name: team.name, colour: team.colour })),
    host: normalizeName(lobby.host?.name),
    game: { variant: lobby.variant, mode: lobby.settings?.gameMode ?? "", score: lobby.settings?.baseScore ?? 0, legs: lobby.legs ?? 1, sets: lobby.sets ?? 0 },
    format,
    saved: lists.saved,
    other: lists.other,
    reasons: lists.reasons,
    play: offer?.teams ?? [],
    behind: offer?.behind ?? [],
    full: offer?.full ?? false,
  });
```

  Keep the existing `syncInviteButton()` call only once: the block above includes it, so delete the old one.

  **2h.** After `joinWith`, add:

```ts
/** This account's own seat in the lobby: what Play for brings to a team. */
function ownSeat(): SeatLike | undefined {
  return (lobby?.players ?? []).find(seat => seat.id && seat.userId === hostId);
}

/** This account's seat, once the lobby update that seats it is in, or nothing after SEAT_WAIT_MS. */
async function waitForOwnSeat(): Promise<SeatLike | undefined> {
  const deadline = Date.now() + SEAT_WAIT_MS;
  let seat = ownSeat();
  while (!seat && Date.now() < deadline) {
    await nextLobbyUpdate();
    seat = ownSeat();
  }
  return seat;
}

/**
 * Play for: this account's own seat joins another account's team. A seat it
 * hasn't got yet, as after opening Invite a team's link, which seats nobody,
 * is taken first, on its own board, as the site's own join link takes it. The
 * join goes into the lineup, which the room is told of on the next pass.
 */
async function playFor(team: JoinTeam) {
  if (!lobby || !hostId) return;
  inviteView.busy = true;
  inviteView.problem = undefined;
  try {
    let seat = ownSeat();
    if (!seat) {
      if (isFull()) {
        inviteView.problem = { key: "teams.problems.lobbyFull" };
        return;
      }
      seat = await addSelf(myName, "Teams") ? await waitForOwnSeat() : undefined;
      if (!seat?.id) {
        inviteView.problem = { key: "teams.problems.notSeated" };
        return;
      }
    }
    await writeJoins(withSeatJoin(localLineup()?.joins ?? [], seat.id!, { owner: team.owner, team: team.name, seatIds: [ seat.id! ] }));
  } finally {
    inviteView.busy = false;
  }
}

/** Leave team, on a row of this account's seat on another account's team: the join taken back, so the invitation comes back. */
export async function leaveTeam(seatId: string) {
  await writeJoins(withSeatJoin(localLineup()?.joins ?? [], seatId));
}
```

  `leaveTeam` is exported only so the next task's row button and this file's readers share one definition. It stays in this file. If ESLint asks for it, drop the `export` in Task 8.

- [ ] **Step 3: The Play for buttons in `TeamInvite.vue`.** In `.adt-invite-picks`, before the `v-for="team in view.saved"` button, add:

```vue
      <button
        @click="view.playFor(team)"
        v-for="team in view.play"
        :key="`${team.owner}|${team.name}`"
        :disabled="view.busy || view.full || view.behind.length > 0"
        class="adt-invite-pick is-go"
        type="button"
      >
        <i :style="{ backgroundImage: gradient(team.colour) }" />{{ t("teams.online.invitation.play", { team: team.name }) }}<small v-if="team.captain">{{ team.captain }}</small>
      </button>
```

  After the `v-for="reason in view.reasons"` paragraph, add:

```vue
    <p v-if="view.play.length && view.behind.length" class="adt-invite-why">
      {{ t("teams.online.invitation.behind", { names: list(view.behind), count: view.behind.length }) }}
    </p>
    <p v-else-if="view.play.length && view.full" class="adt-invite-why">
      {{ t("teams.problems.lobbyFull") }}
    </p>
```

  `list` and `gradient` are already imported there.

- [ ] **Step 4: Check it compiles, lints and builds**

Run: `cd $WT && yarn compile 2>&1 | grep -c "error TS"`. Expected `14`.

Run: `cd $WT && npx eslint entrypoints/lobby.content/teams.ts entrypoints/lobby.content/TeamInvite.vue utils/lobby-guests.ts`. Expected: no errors.

Run: `cd $WT && yarn i18n:check`. Expected: passes.

Run: `cd $WT && yarn build 2>&1 | tail -3`. Expected: `✔ Finished`, with no "new Audio" or "window is not defined" in the background build.

- [ ] **Step 5: Commit**

```bash
cd $WT && git add utils/lobby-guests.ts entrypoints/lobby.content/teams.ts entrypoints/lobby.content/TeamInvite.vue && git commit -m "$(cat <<'EOF'
feat: Play for TEAM RED, in the Online Teams invitation

A player with no team joins another account's own-score team with their
own seat, taking a seat on their own board first if they came in through
Invite a team's link. The join goes into the lineup, and from there to
the room, and the invitation goes once the seat is on a team.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Joined rows, and Local Lobby

**Files:**
- Modify: `entrypoints/lobby.content/teams.ts`. Change the constants (`:64-75`), `apply` (`:455`), `relabel` (`:469-478`), `dressOwnRows` (`:925-949`) and `undress` (`:998-1006`), and add `addLeaveButton` and `labelLeave`.
- Modify: `entrypoints/lobby.content/local-lobby.ts:23`, `:183`

**Interfaces:**
- Consumes: `ScreenTeams.joined` and `joinedSeats` (Task 3), `leaveTeam` (Task 7), and the `teams.lobby.leave.*` keys (Task 6).

- [ ] **Step 1: Constants.** Replace the `REMOTE_ATTR` comment, and add the Leave team constants after `EDIT_ATTR`:

```ts
/** On a row whose seat plays from another account's board (another account's team, or a seat it joined to one): the site's 🌐 hidden. */
const REMOTE_ATTR = "data-adt-team-remote";
/** On a row's Leave team: the team's name, for its spoken name in the language of the moment. */
const LEAVE_ATTR = "data-adt-team-leave";
```

  After `ICON_EDIT`, add:

```ts
/** Material Symbols "person-remove" (Apache 2.0). */
const ICON_LEAVE = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M16 11V9h6v2zm-9.825-.175Q5 9.65 5 8t1.175-2.825T9 4t2.825 1.175T13 8t-1.175 2.825T9 12t-2.825-1.175M1 20v-2.8q0-.85.438-1.562T2.6 14.55q1.55-.775 3.15-1.162T9 13t3.25.388t3.15 1.162q.725.375 1.163 1.088T17 17.2V20z\"/></svg>";
```

  Fix the stale comment on the CSS rule at the end of `LOBBY_CSS` to: "Online Teams: the site's "play on my board" would pull another account's seat onto this board."

- [ ] **Step 2: Rows.** In `apply()`, change `dressOwnRows(lineup, view.mine);` to `dressOwnRows(lineup, view.mine, view.joined);`.

  Replace `dressOwnRows`'s signature and its last three lines (the `row.toggleAttribute(REMOTE_ATTR, …)` line and the pencil `if/else`):

```ts
function dressOwnRows(lineup: Lineup, mine: ReadonlySet<string>, joined: ReadonlyMap<string, RoomJoin>) {
```

```ts
    const join = joined.get(seatId);
    // Another account's team, or another account's seat on one of ours: it plays from its own board.
    row.toggleAttribute(REMOTE_ATTR, !mine.has(team.name) || Boolean(join && join.by !== hostId));
    if (!mine.has(team.name)) row.querySelector(".adt-team-edit")?.remove();
    else if (!row.querySelector(".adt-team-edit")) addEditButton(row, team.name, () => openOwnEditor(team.name));
    // This account's own seat on another account's team: it may leave it, and only it.
    if (join?.by !== hostId) row.querySelector(".adt-team-leave")?.remove();
    else if (!row.querySelector(".adt-team-leave")) addLeaveButton(row, team.name, seatId);
```

  Add `RoomJoin` to the `import type { … } from "@/utils/team-room"` line.

  After `labelPencil`, add:

```ts
/** Leave team, on this account's own seat on another account's team: a copy of the row's own ✕, as the pencil is. */
function addLeaveButton(row: HTMLElement, team: string, seatId: string) {
  const remove = qs<HTMLButtonElement>(SELECTORS.lobby.playerRemoveButton, row);
  if (!remove) return;

  const leave = remove.cloneNode(false) as HTMLButtonElement;
  leave.classList.add("adt-team-leave");
  leave.type = "button";
  leave.disabled = false;
  leave.setAttribute(LEAVE_ATTR, team);
  labelLeave(leave);
  leave.innerHTML = ICON_LEAVE;
  leave.addEventListener("click", (event) => {
    event.stopPropagation();
    leaveTeam(seatId).catch(e => console.error(e));
  });
  const firstButton = [ ...row.children ].find(child => child.matches("button[data-slot='button']")) ?? remove;
  firstButton.before(leave);
}

/** Leave team's tooltip and spoken name, in the language of the moment: when it is made, and again on a change. */
function labelLeave(leave: HTMLElement) {
  leave.title = t("teams.lobby.leave.title");
  leave.setAttribute("aria-label", t("teams.lobby.leave.label", { team: leave.getAttribute(LEAVE_ATTR) ?? "" }));
}
```

  In `relabel()`, after the pencils' loop, add:

```ts
  for (const leave of document.querySelectorAll<HTMLElement>(`[${LEAVE_ATTR}]`)) labelLeave(leave);
```

  In `undress()`, add `row.querySelector(".adt-team-leave")?.remove();`.

  If `leaveTeam` was exported in Task 7 only for this, make it a plain `async function`.

- [ ] **Step 3: Local Lobby.** In `entrypoints/lobby.content/local-lobby.ts`, change the import (line 23):

```ts
import { joinedSeats, roomOf, screenTeams } from "@/utils/team-room";
```

  Replace the `theirs` line (183):

```ts
  // Another account's team stays on its board, and so does a seat another account joined to any team, ours included.
  const view = screenTeams({ players, saved: [], lineup: undefined, shifts: {}, room, me: userId, hostId: lobby.host?.id });
  const theirs = new Set([ ...view.remote.flatMap(team => team.seatIds), ...joinedSeats(room, players, userId) ]);
```

  Update `claimBoards`' doc comment to: "Online Teams: a seat of another account's team, or one another account joined to a team, stays on that account's board (utils/team-room.ts). Rows come in seat order."

- [ ] **Step 4: Check**

Run: `cd $WT && yarn compile 2>&1 | grep -c "error TS"`. Expected `14`.

Run: `cd $WT && npx eslint entrypoints/lobby.content/teams.ts entrypoints/lobby.content/local-lobby.ts`. Expected: no errors.

Run: `cd $WT && yarn i18n:check && node_modules/.bin/tsx --test $TESTS/*.test.mts 2>&1 | grep -E "^# (pass|fail)"`. Expected: passes, `# fail 0`.

- [ ] **Step 5: Commit**

```bash
cd $WT && git add entrypoints/lobby.content/teams.ts entrypoints/lobby.content/local-lobby.ts && git commit -m "$(cat <<'EOF'
feat: Leave team on your own row, and joined seats stay on their board

A seat another account joined to a team keeps its 🌐 hidden on every
screen, the captain's included, and Local Lobby leaves it alone. The
player's own row gets Leave team.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: The chip names who needs an update

**Files:**
- Modify: `entrypoints/lobby.content/TeamRoomStatus.vue`

**Interfaces:**
- Consumes: `StatusView.joined` (Task 7), `roomStatus` and `statusAccounts` (Task 4), and the `teams.online.status.behind` key (Task 6).

- [ ] **Step 1: The chip's text.** In `chipText`, before the final `return`, add:

```ts
  if (kind === "behind") return t("teams.online.status.behind", { names: list(names), count: names.length });
```

  Make sure `CHIP`'s type is `Record<Exclude<StatusKind, "synced" | "missing" | "behind">, MessageKey>`. Task 4 may already have changed it.

- [ ] **Step 2: The card's line.** Replace the account line's second `<span>`:

```vue
        <span :class="account.connected && !account.behind ? 'is-ok' : 'is-warn'">
          {{ account.connected ? t("teams.online.card.connected") : t("teams.online.card.notConnected") }}<template v-if="account.behind"> · {{ t("teams.online.card.outdated") }}</template><template v-if="account.teams.length"> · {{ account.teams.join(", ") }}</template>
        </span>
```

- [ ] **Step 3: Its colour.** In `<style>`, change the missing rule to:

```css
.adt-room-chip.is-missing, .adt-room-chip.is-behind { color: #f29727; background: rgb(242 151 39 / 12%); }
```

- [ ] **Step 4: Check and commit**

Run: `cd $WT && yarn compile 2>&1 | grep -c "error TS"` (expect `14`) and `cd $WT && npx eslint entrypoints/lobby.content/TeamRoomStatus.vue && yarn i18n:check`.

```bash
cd $WT && git add entrypoints/lobby.content/TeamRoomStatus.vue && git commit -m "$(cat <<'EOF'
feat: Online Teams' chip names an account on an older Tools

While a player plays for another account's team, an account in the room
on protocol 1 can't show it: the chip turns amber and names them, and
the card marks them.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: The match tells the room its joins too

**Files:**
- Modify: `entrypoints/match.content/teams.ts:47`, `:330-332`

**Interfaces:**
- Consumes: `myRoomJoins` (Task 3), `RoomClient.publishJoins` (Task 5).

- [ ] **Step 1: Implement.** Add `myRoomJoins` to the team-room import (line 47):

```ts
import { myRoomJoins, myRoomTeams, roomOf, screenTeams, shouldJoin, takesPart, undoActor, undoKey, undoOutcome } from "@/utils/team-room";
```

  In `syncRoom`, after `roomClient.publishTeams(mine);`, add:

```ts
  // And its joins, which a reloaded page or a restarted server would otherwise go without.
  roomClient.publishJoins(myRoomJoins(players, lineup));
```

- [ ] **Step 2: Check and commit**

Run: `cd $WT && yarn compile 2>&1 | grep -c "error TS"` (expect `14`), `cd $WT && npx eslint entrypoints/match.content/teams.ts`, and `cd $WT && yarn build 2>&1 | tail -2 && yarn build:firefox 2>&1 | tail -2`. Both builds must finish.

```bash
cd $WT && git add entrypoints/match.content/teams.ts && git commit -m "$(cat <<'EOF'
feat: the match sends this account's joins to the room too

So a reload mid-match or a restarted server keeps a joined player on
their team on every screen.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: README and changelog

**Files:**
- Modify: `README.md`, the Teams section (`:110-131`) and *Online Teams and your data* (`:707-720`)
- Modify: `CHANGELOG.md` (a new `[Unreleased]` section at the top)

- [ ] **Step 1: README, Teams.**

  **1a.** In the own-scores bullet (line 115), after "Pick seats already in the lobby, type new names, or add a bot at its level under **Bots** in the drawer…", add this sentence before "The seats are kept in turn order":

  > With **Online Teams**, a player on their own board who has Tools joins a team themselves (below)

  End it without a full stop where the sentence before it does.

  **1b.** Under the **Online Teams** bullet (lines 126–131), after the "Each captain edits and corrects only their own team…" sub-bullet, add:

```markdown
    - **Players on their own board** join a team themselves, with own scores: the captains add their teams, and each player taps **Play for TEAM RED** in the invitation above the Players card. Tools seats them on their own board first if they came in through *Invite a team*'s link. **Leave team** on their own row takes them off it again, and only they can. So four players on four boards can play two against two
    - Everyone in the lobby needs a Tools with this. While someone hasn't got it yet, the invitation names them and Play for waits, and once a player has joined, the chip names them: their screen would show the player without a team
```

- [ ] **Step 2: README, *Online Teams and your data*.**

  **2a.** In the list of what is shared, after "each of your teams' name, players in order, colour and format, and their seats", add:

```markdown
- which team each of your seats joined, when you play for another account's team
```

  **2b.** In the last paragraph, change "and show wrong teams on the other screens, or switch the partner rule on" to "and show wrong teams on the other screens, put a player on a team, or switch the partner rule on".

- [ ] **Step 3: CHANGELOG.** Above `## [3.3.0] - 2026-10-04`, add:

```markdown
## [Unreleased]

### Added

- **Online Teams**: players on their own board join a team themselves. With own scores, the captains add their teams, and each player taps **Play for TEAM RED** in the invitation, which seats them on their own board first if they need a seat. **Leave team** on their row takes them off again. Four players on four boards can now play two against two. Everyone in the lobby needs this version: the invitation and the chip name anyone who hasn't got it yet. The team server speaks a new protocol for it, and still takes 3.3.0's
```

- [ ] **Step 4: Check and commit**

Run: `cd $WT && yarn i18n:check`. It doesn't read the README, but this step confirms nothing else moved.

```bash
cd $WT && git add README.md CHANGELOG.md && git commit -m "$(cat <<'EOF'
docs: joining an Online Teams team from your own board

The README's Teams section and what Online Teams shares, and the
changelog's Unreleased entry.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: Live, with two real accounts *(the controller runs this)*

Run this yourself, not through a subagent. It drives the shared dev Chrome and a Firefox dev build, and the memories on doing that safely apply:
- [[use-the-yarn-dev-browser]]
- [[other-claude-sessions-share-the-dev-chrome]]
- [[online-teams-test-with-two-real-accounts]]
- [[content-script-websockets-to-a-local-server]]
- [[never-reload-the-wxt-dev-extension]]
- [[restarting-yarn-dev-needs-open-stdin]]
- [[firefox-dev-browser-is-driven-over-rdp]]
- [[host-lobby-tab-reload-ends-the-lobby]]

The previous session's harness is in `$SCR/prev` (`SETUP.md` explains each script).

**Setup** (log every lobby id and backup in `$SCR/SETUP.md`):
- [ ] **S1.** `ListAgents`: make sure no other session is using the dev Chrome. Back up Chrome's `config-2-0-0` teams with `cfg.mjs backup`.
- [ ] **S2.** Start the local server from the worktree: `cd $WT/socket && bun run dev` (background). `/health` must say `"version":2,"oldest":1`.
- [ ] **S3.** Start `yarn dev` in `$WT` with the FIFO trick. It uses `.chrome-profile-dev`, linked to the main checkout's profile, signed in as creazy. Hold Chrome's loopback grant with `lna-hold.mjs`.
- [ ] **S4.** Start the Firefox dev build: `cd $WT && npx wxt -b firefox --port 4001`, with a FIFO. Sign in as creazy_dev (`rdp.mjs login`) and set `network.lna.blocking=false` (`ffpref.mjs`).

**Matrix.** Each step passes or is fixed (TDD for any fix: a failing test in `$TESTS` first when the logic is pure):
- [ ] **L1.** creazy creates an own-score X01 121 lobby (API: `ad.py`) and adds TEAM RED, their own seat, with the drawer. They add TEAM BLUE as two guests, or a guest and a level-5 bot.
- [ ] **L2.** On creazy's screen, Invite a team copies `/lobby/<id>`.
- [ ] **L3** (Review Focus 1). Firefox opens that link, so creazy_dev has no seat. The invitation shows "Play for TEAM RED · CREAZY" and "Play for TEAM BLUE · CREAZY". Tap Play for TEAM RED:
  - creazy_dev is seated with their own account, with `boardId` = their `selectedBoard`, or none when it is `manual`
  - TEAM RED shows CREAZY and CREAZY_DEV, "1 of 2" / "2 of 2", on both screens
  - the invitation is gone
  - Leave team is on creazy_dev's own row
- [ ] **L4.** On creazy's screen, CREAZY_DEV's row has the pencil and no 🌐. The host's Tools has alternated the seats: RED, BLUE, RED, BLUE.
- [ ] **L5.** Leave team on Firefox: the row goes plain on both screens and the invitation comes back. Tap Play for again.
- [ ] **L6** (Review Focus 2). Turn Local Lobby on in Chrome. CREAZY_DEV's seat keeps `hostId` creazy_dev at 1, 4 and 8 s, and nothing presses its 🌐. Turn it off again.
- [ ] **L7** (Review Focus 4, 5). Start the match:
  - pill and cards on both screens
  - a leg won by creazy_dev's seat counts for TEAM RED
  - the team win holds Next Leg on both screens
  - with the partner rule on, a breaking checkout thrown on creazy_dev's turn is taken back once, by Firefox's Tools
  - reload Firefox mid-match: the team is back at once
  - stop and restart the server mid-match: TEAM RED keeps CREAZY_DEV on both screens throughout
- [ ] **L8** (Review Focus 3). Bring in a protocol-1 socket. Use a `live-probe.mjs`-style script with `auth { v: 1 }` as a third account (any UUID and a name), joining the room:
  - in a fresh lobby before anyone joins, Play for is greyed with "PROBE needs a newer Tools …"
  - after a join, creazy's chip says "PROBE needs a newer Tools" in amber, and the status card marks PROBE
- [ ] **L9.** The old server. Stop the new one and start `$SCR/old-server` on 4455. Reload Chrome's lobby tab the safe way (`about:blank` from the attached session, then back). The client falls back to 1: the chip says ready or synced, there is no Play for, and teams work as in 3.3.0. Restore the new server.
- [ ] **L10.** German on Firefox (the site set to Deutsch): "Für TEAM RED spielen", "Team verlassen", and the behind line read right, with no raw key anywhere.

**Clean-up (always):**
- delete or abort every test lobby and match (`DELETE /gs/v0/lobbies/<id>`, `DELETE /gs/v0/matches/<id>`)
- restore Chrome's config teams from the backup, and remove the test lobbies' entries from `teams-lineups` and `teams-room`
- stop the Firefox build, the FIFO sleeps, `lna-hold`, the servers, and `yarn dev` (only the one this session started)

Commit any fix as its own `fix:` commit.

---

### Task 13: Final checks, review, finish

- [ ] **Step 1: Every check, fresh:**

```bash
cd $WT/socket && bun test && bun run typecheck
cd $WT && node_modules/.bin/tsx --test $TESTS/*.test.mts 2>&1 | grep -E "^# (tests|pass|fail)"
cd $WT && yarn compile 2>&1 | grep -c "error TS"      # 14
cd $WT && yarn i18n:check
cd $WT && npx eslint utils/team-room.ts utils/team-room-client.ts utils/teams.ts utils/lobby-guests.ts entrypoints/lobby.content/teams.ts entrypoints/lobby.content/TeamInvite.vue entrypoints/lobby.content/TeamRoomStatus.vue entrypoints/lobby.content/local-lobby.ts entrypoints/match.content/teams.ts
cd $WT && yarn build && yarn build:firefox
```

- [ ] **Step 2: No new permissions.** Compare `permissions` and `host_permissions` in `.output/chrome-mv3/manifest.json` with the 3.3.0 release zip's manifest ([[no-new-permissions-on-update]]). They must be identical.
- [ ] **Step 3: Whole-branch review** with superpowers:requesting-code-review, against the spec. Fix what it finds, with tests.
- [ ] **Step 4: Finish** with superpowers:finishing-a-development-branch. The branch stays unmerged for the user, because other sessions work on `main`'s checkout. Report the deploy order: `socket/` first, then the release.
