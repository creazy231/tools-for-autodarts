# Online Teams: Cricket and Follow-ups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Announce and polish Online Teams for Cricket, close the final review's follow-ups, and fix three older bugs found along the way.

**Architecture:** Most changes are pure functions in `utils/` (team rules, invitation lists, Local Lobby's rows), each tested under tsx, plus small wiring in the lobby and match scripts, the room client and the `socket/` server. Cricket needs no new game logic: autodarts runs the game, and live checks showed the team layer working.

**Tech Stack:** WXT 0.20 extension (Vue 3, TypeScript), socket.io 4.8 client and server (Bun), node:test via tsx for unit tests, bun test for the server, linkedom for DOM tests.

**Spec:** `docs/superpowers/specs/2026-10-04-online-teams-cricket-and-follow-ups-design.md`

## Global Constraints

- Every text a person reads ships in English, German and Dutch in the same change (CLAUDE.md, "Translations"); `yarn i18n:check` passes.
- Online Teams' protocol stays version 1: nothing here changes a message's shape.
- `yarn compile` keeps the 14 errors `main` has, in the same files and codes.
- Unit tests live in the session scratchpad's `tests/` (`$SCR/tests`, run with `node_modules/.bin/tsx --test <file>` from the repo root) and in `socket/rooms.test.ts` (`bun test` in `socket/`).
- Never touch `adt-socket.tobias-thiele.de` or Coolify. Live checks use the local server (`bun run dev` in `socket/`).
- Before any source edit, park your own browser tabs at `about:blank`: a rebuild reloads lobby and match tabs.

## Review Focus

1. **A team removed on purpose while its owner reconnects.** The carry-over must not bring it back. Once the owner is a peer again, the new state is the truth. The "back" case in Task 6's test pins this.
2. **A long outage.** The chip says *connecting* once, then *offline*, and must not flap on every retry. Task 5's test checks the first sequence. Later retries aren't exercised: check that `connect_error` alone drives the state after that.
3. **A refused join** ("full", "busy") must not be retried in a tight loop. Only a timeout is retried, every 3 s (Task 5).
4. **Local Lobby with the other account's plain seat and its Online Teams seat** in one lobby. The plain seat moves onto the host's board; the team's seats don't. Task 3's test, and the live matrix.
5. **The invitation in a Hidden Cricket lobby,** which these accounts can't create. The mode name is shown unchanged, as for Tactics (Task 8's test, `mode: "Hidden Cricket"`).

---

### Task 1: Saved own-score teams keep two players of one name

**Files:**
- Modify: `utils/teams.ts` (`normalizeTeams`, `withOnlineTeams`'s comment)
- Test: `$SCR/tests/teams-normalize.test.mts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `normalizeTeams(saved: unknown): TeamsConfig`, unchanged in signature. Own-score teams may now repeat a player's name.

- [ ] **Step 1: Write the failing test**

```ts
// $SCR/tests/teams-normalize.test.mts
import { test } from "node:test";
import assert from "node:assert/strict";

import { normalizeTeams } from "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/utils/teams.ts";

const ocean = { preset: "ocean", from: "#374c98", to: "#0b55df" };

test("normalizeTeams: an own-score team keeps two bots of one level, and their members", () => {
  const blue = { name: "TEAM BLUE", players: [ "BOT LEVEL 1", "BOT LEVEL 1" ], colour: ocean, format: "own", members: [ { kind: "bot", name: "BOT LEVEL 1", ppr: 20 }, { kind: "bot", name: "BOT LEVEL 1", ppr: 20 } ] };
  const [ team ] = normalizeTeams({ saved: [ blue ] }).saved;
  assert.deepEqual(team.players, [ "BOT LEVEL 1", "BOT LEVEL 1" ]);
  assert.equal(team.members?.length, 2);
});

test("normalizeTeams: a shared team's players are each named once", () => {
  const [ team ] = normalizeTeams({ saved: [ { name: "TEAM RED", players: [ "anna", "ANNA", " tom ", "" ], colour: ocean, format: "shared" } ] }).saved;
  assert.deepEqual(team.players, [ "ANNA", "TOM" ]);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node_modules/.bin/tsx --test $SCR/tests/teams-normalize.test.mts`
Expected: test 1 fails, with `players` `[ 'BOT LEVEL 1' ]`. Test 2 passes, since that behaviour stays.

- [ ] **Step 3: Implement**

In `normalizeTeams`, decide the format before the players, and make only shared teams unique:

```ts
    const name = normalizeName(entry?.name).slice(0, MAX_NAME_LENGTH);
    if (!name || teams.some(team => team.name === name)) continue;
    const format: TeamFormat = entry?.format === "own" ? "own" : "shared";
    // A shared team's players are the people who take turns, each named once.
    // An own-score team's are seats, and two bots of one level share a name.
    const raw: unknown[] = Array.isArray(entry?.players) ? entry.players : [];
    const players = (format === "own" ? raw.map(normalizeName).filter(Boolean) : uniqueNames(raw)).slice(0, MAX_PLAYERS);
    if (players.length < MIN_PLAYERS) continue;
    const team: SavedTeam = { name, players, colour: normalizeColour(entry?.colour), format };
```

Remove the old `const players = uniqueNames(…)` and `const format = …` lines this replaces. In `withOnlineTeams`'s comment, drop the sentence about merging players of one name, since it no longer does. Keep: "Migration 16: Online Teams' switch, on unless it was switched off. Only the switch is added: saved teams stay exactly as they were."

- [ ] **Step 4: Run it to see it pass**

Run: `node_modules/.bin/tsx --test $SCR/tests/teams-normalize.test.mts $SCR/tests/team-room.test.mts $SCR/tests/teams-migration16.test.mts`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add utils/teams.ts
git commit -m "fix: a saved own-score team keeps two bots of one level"
```

---

### Task 2: A frame with no data is left alone

**Files:**
- Modify: `utils/websocket-helpers.ts` (`processWebSocketMessage`)
- Test: `$SCR/tests/websocket-null-frame.test.mts`

**Interfaces:** none new.

- [ ] **Step 1: Write the failing test**

```ts
// $SCR/tests/websocket-null-frame.test.mts
import { test } from "node:test";
import assert from "node:assert/strict";

// WXT's auto-imported storage, and enough of the extension API to load the module.
const item = () => ({ getValue: async () => undefined, setValue: async () => {}, watch: () => () => {}, removeValue: async () => {} });
(globalThis as any).storage = { defineItem: item };
(globalThis as any).browser = { runtime: { getURL: (path: string) => path, sendMessage: async () => undefined }, storage: { local: { get: async () => ({}), set: async () => {} } } };

const { processWebSocketMessage } = await import("/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/utils/websocket-helpers.ts");

test("processWebSocketMessage: a matches or lobbies frame with no data is left alone", async () => {
  await assert.doesNotReject(processWebSocketMessage("autodarts.matches", undefined as any));
  await assert.doesNotReject(processWebSocketMessage("autodarts.lobbies", undefined as any));
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node_modules/.bin/tsx --test $SCR/tests/websocket-null-frame.test.mts`
Expected: FAIL, "Cannot read properties of undefined (reading 'id')" for lobbies, or "… (reading 'body')" for matches.

- [ ] **Step 3: Implement**

At the top of `processWebSocketMessage`, before the `switch`:

```ts
  // Frames that only name their topic, as some at a match's start do, carry nothing to act on.
  if (data == null) return;
```

- [ ] **Step 4: Run it to see it pass**

Run: `node_modules/.bin/tsx --test $SCR/tests/websocket-null-frame.test.mts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add utils/websocket-helpers.ts
git commit -m "fix: a match or lobby frame with no data no longer throws in the websocket monitor"
```

---

### Task 3: Local Lobby presses "play on my board"

**Files:**
- Create: `utils/local-lobby-rows.ts`
- Modify: `entrypoints/lobby.content/local-lobby.ts` (`claimBoards`, its comment), `utils/selectors.ts` (drop `playerBoardButton`, update `playerLinkButton`'s comment)
- Test: `$SCR/tests/local-lobby-rows.test.mts`

**Interfaces:**
- Produces: `boardButtonsToPress(rows: readonly Element[], seatIds: readonly (string | undefined)[], keep: ReadonlySet<string>): HTMLButtonElement[]`

- [ ] **Step 1: Write the failing test**

```ts
// $SCR/tests/local-lobby-rows.test.mts
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";

import { boardButtonsToPress } from "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/utils/local-lobby-rows.ts";

const button = (icon: string, disabled = false) => `<button data-slot="button"${disabled ? " disabled" : ""}><svg data-icon="${icon}"></svg></button>`;
const { document } = parseHTML(`<ul>
  <li id="mine">${button("house")}${button("xmark")}</li>
  <li id="plain">${button("globe")}${button("xmark")}</li>
  <li id="team">${button("globe")}${button("xmark")}</li>
  <li id="off">${button("globe", true)}${button("xmark")}</li>
</ul>`);
const rows = [ ...document.querySelectorAll("li") ];

test("boardButtonsToPress: every enabled 🌐, never the house, and never a seat it must keep", () => {
  const pressed = boardButtonsToPress(rows, [ "s-mine", "s-plain", "s-team", "s-off" ], new Set([ "s-team" ]));
  assert.deepEqual(pressed.map(found => found.closest("li")!.id), [ "plain" ]);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node_modules/.bin/tsx --test $SCR/tests/local-lobby-rows.test.mts`
Expected: FAIL, with the module not found.

- [ ] **Step 3: Implement**

```ts
// utils/local-lobby-rows.ts
/**
 * Local Lobby's row logic (entrypoints/lobby.content/local-lobby.ts), apart
 * from the page so a test can run it.
 */

import { SELECTORS, qs } from "@/utils/selectors";

/**
 * The 🌐 buttons to press to pull every player onto this board: the site's
 * "play on my board" (`setHostForIndex`), on each row whose seat someone else
 * hosts. A pressed seat is hosted here, and its row no longer has one, so
 * running this on every render needs no bookkeeping. The house on a row is
 * the opposite, unlink (`removeHostForIndex`), and is never pressed. Rows come
 * in seat order; `keep` holds seats that stay where they are.
 */
export function boardButtonsToPress(rows: readonly Element[], seatIds: readonly (string | undefined)[], keep: ReadonlySet<string>): HTMLButtonElement[] {
  const out: HTMLButtonElement[] = [];
  rows.forEach((row, index) => {
    if (keep.has(seatIds[index] ?? "")) return;
    const button = qs<HTMLButtonElement>(SELECTORS.lobby.playerLinkButton, row);
    if (button && !button.disabled) out.push(button);
  });
  return out;
}
```

In `local-lobby.ts`, import it (`import { boardButtonsToPress } from "@/utils/local-lobby-rows";`, with the other `@/utils` imports) and replace `claimBoards` and its comment:

```ts
/**
 * Pull everyone onto this board, by the 🌐 on each row whose seat someone
 * else hosts (utils/local-lobby-rows.ts).
 *
 * Online Teams: a seat of another account's team stays on that account's
 * board (utils/team-room.ts). Rows come in seat order.
 */
function claimBoards(lobby: ILobbies, userId: string) {
  const room = roomOf(roomStore, lobby.id);
  const players = lobby.players ?? [];
  const theirs = new Set(screenTeams({ players, saved: [], lineup: undefined, shifts: {}, room, me: userId, hostId: lobby.host?.id }).remote.flatMap(team => team.seatIds));
  for (const button of boardButtonsToPress(qsa(SELECTORS.lobby.playerRows), players.map(seat => seat.id), theirs)) {
    button.click();
    console.log("Autodarts Tools: Local Lobby - Moved a player onto this board");
  }
}
```

`qs` is no longer used in `local-lobby.ts`: import only `SELECTORS, qsa`. In `utils/selectors.ts`, delete `playerBoardButton` and the comment's last sentence about it. Keep the comment's first paragraph about `data-icon`. Then extend `playerLinkButton`'s comment:

```ts
    /**
     * The 🌐 on a seat someone else hosts: the site's "play on my board"
     * (`setHostForIndex`), which pulls that seat onto this account's board.
     * Local Lobby presses it (utils/local-lobby-rows.ts); Online Teams hides
     * it on another account's team (lobby.content/teams.ts).
     */
```

- [ ] **Step 4: Run it to see it pass**

Run: `node_modules/.bin/tsx --test $SCR/tests/local-lobby-rows.test.mts`
Expected: PASS. Then `git grep -n playerBoardButton` finds nothing.

- [ ] **Step 5: Commit**

```bash
git add utils/local-lobby-rows.ts entrypoints/lobby.content/local-lobby.ts utils/selectors.ts
git commit -m "fix: Local Lobby moves players onto your board again, with the site's play-on-my-board button"
```

---

### Task 4: The server lets a limited socket leave, and is type-checked

**Files:**
- Modify: `socket/index.ts` (`room:leave`), `socket/rooms.test.ts` (fixtures), `socket/package.json` (script), `socket/README.md`
- Create: `socket/tsconfig.json`
- Test: `$SCR/tests/server-smoke.test.mts`

**Interfaces:** none new.

- [ ] **Step 1: Write the failing test**

Append to `$SCR/tests/server-smoke.test.mts`, before the connection-cap test:

```ts
test("a socket past the rate limit can still leave its room", async () => {
  const socket = client({ v: 1, ...A });
  await connected(socket);
  assert.equal((await ask(socket, "room:join", { lobbyId: LOBBY })).ok, true);
  await Promise.all(Array.from({ length: 35 }, () => ask(socket, "room:ping")));
  assert.deepEqual(await ask(socket, "room:leave", { lobbyId: LOBBY }), { ok: true, value: true });
  socket.close();
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node_modules/.bin/tsx --test --test-concurrency=1 $SCR/tests/server-smoke.test.mts`
Expected: the new test fails with `{ ok: false, error: 'rate' }`.

- [ ] **Step 3: Implement**

In `socket/index.ts`, replace the `on("room:leave", …)` call with a handler outside the limiter:

```ts
  // Leaving is never limited: a socket at its limit must still be able to go.
  socket.on("room:leave", (payload: unknown, ack?: Ack) => {
    const reply: Ack = typeof ack === "function" ? ack : () => {};
    const lobbyId = payload && typeof payload === "object" ? (payload as Payload).lobbyId : undefined;
    if (typeof lobbyId !== "string") return reply({ ok: false, error: "lobby" });
    const state = rooms.leave(lobbyId, socket.id);
    socket.leave(lobbyId);
    if (state) broadcast(state);
    reply({ ok: true, value: true });
  });
```

Create `socket/tsconfig.json`:

```json
{
  "compilerOptions": {
    "lib": ["ESNext"],
    "target": "ESNext",
    "module": "Preserve",
    "moduleDetection": "force",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true,
    "types": ["bun"]
  },
  "include": ["*.ts"]
}
```

In `socket/package.json`'s scripts add `"typecheck": "tsc --noEmit"`. In `socket/rooms.test.ts`, give the `red` and `blue` fixtures `format: "shared" as const`, so they type as `RoomTeamInput`. In `socket/README.md`'s command block add `bun run typecheck   # tsc, with the Bun types`.

- [ ] **Step 4: Run it to see it pass**

Run: `node_modules/.bin/tsx --test --test-concurrency=1 $SCR/tests/server-smoke.test.mts && (cd socket && bun test && bun run typecheck)`
Expected: 9 smoke tests pass, 20 bun tests pass, and tsc prints nothing.

- [ ] **Step 5: Commit**

```bash
git add socket/index.ts socket/rooms.test.ts socket/package.json socket/tsconfig.json socket/README.md
git commit -m "fix: the team server lets a socket at its rate limit leave, and is type-checked again"
```

---

### Task 5: The chip while reconnecting, and a join asked again

**Files:**
- Modify: `utils/team-room-client.ts` (`disconnect` handler, `joinRoom`, `stop`)
- Test: `$SCR/tests/room-client.test.mts`

**Interfaces:** none new. `RoomClientState.connection` reads `"connecting"` after a disconnect that socket.io retries.

- [ ] **Step 1: Write the failing tests**

Append to `$SCR/tests/room-client.test.mts`:

```ts
test("a lost connection reads as connecting until an attempt fails, then offline", async () => {
  const e = client(A);
  await e.start(LOBBY2);
  await until(() => e.state.connection === "connected");
  const seen: string[] = [];
  e.subscribe((state) => {
    if (seen[seen.length - 1] !== state.connection) seen.push(state.connection);
  });
  await stopServer();
  await until(() => e.state.connection === "offline");
  assert.deepEqual(seen.slice(0, 3), [ "connected", "connecting", "offline" ]);
  await startServer();
  await until(() => e.state.connection === "connected", 20000);
});

test("a join that times out is asked again", async () => {
  const handlers: Record<string, ((...args: any[]) => void)[]> = {};
  let joins = 0;
  const fake: any = {
    connected: true,
    on(event: string, fn: (...args: any[]) => void) { (handlers[event] ??= []).push(fn); return fake; },
    disconnect() { fake.connected = false; return fake; },
    connect() { return fake; },
    timeout() { return fake; },
    emit(event: string, ...args: any[]) {
      const ack = args.find((arg: unknown) => typeof arg === "function");
      if (event !== "room:join") return;
      joins++;
      if (joins === 1) ack?.(new Error("operation has timed out"));
      else ack?.(null, { ok: true, value: { lobbyId: LOBBY, teams: [], shifts: [], peers: [] } });
    },
  };
  const made = new RoomClient({ url: "http://unused", identity: async () => A, connect: (() => fake) as any });
  await made.start(LOBBY);
  handlers.connect.forEach(fn => fn());
  made.setJoin(true);
  await until(() => made.state.joined === LOBBY, 6000);
  assert.equal(joins, 2);
  made.stop();
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `node_modules/.bin/tsx --test --test-concurrency=1 $SCR/tests/room-client.test.mts`
Expected: the first fails, with `seen` going straight from `connected` to `offline`. The second times out, since `joined` stays undefined.

- [ ] **Step 3: Implement**

In `team-room-client.ts`:

```ts
const JOIN_RETRY_MS = 3000;
```

A field: `private joinRetry: ReturnType<typeof setTimeout> | undefined;`.

The `disconnect` handler becomes:

```ts
    socket.on("disconnect", (reason: string) => {
      // socket.io tries again unless the server or this client ended it, and
      // until an attempt fails, that is still connecting.
      const retrying = reason !== "io server disconnect" && reason !== "io client disconnect";
      this.update({ connection: retrying ? "connecting" : "offline", joined: undefined, joinedAt: undefined });
    });
```

In `joinRoom`'s callback, before the `!answer?.ok` check:

```ts
      if (lobbyId !== this.lobbyId || !this.wantJoin) return;
      if (error) {
        // No answer in time: ask again while this lobby's room is still wanted.
        clearTimeout(this.joinRetry);
        this.joinRetry = setTimeout(() => this.joinRoom(), JOIN_RETRY_MS);
        return;
      }
      if (!answer?.ok) return;
```

The callback's old first line, `if (error || !answer?.ok || lobbyId !== this.lobbyId || !this.wantJoin) return;`, is replaced by these lines. In `stop()`, add `clearTimeout(this.joinRetry);` next to `clearInterval(this.pinger)`.

- [ ] **Step 4: Run them to see them pass**

Run: `node_modules/.bin/tsx --test --test-concurrency=1 $SCR/tests/room-client.test.mts`
Expected: all 9 pass.

- [ ] **Step 5: Commit**

```bash
git add utils/team-room-client.ts
git commit -m "fix: Online Teams' chip says connecting while it reconnects, and a join that timed out is asked again"
```

---

### Task 6: No flicker after a server restart

**Files:**
- Modify: `utils/team-room.ts` (`withRoom`)
- Test: `$SCR/tests/team-room.test.mts`

**Interfaces:**
- Produces: `withRoom(store, state, now): RoomStore`, unchanged in signature. A mirror may now hold teams, shifts and a rule of accounts that aren't back yet.

- [ ] **Step 1: Write the failing test**

Append to `$SCR/tests/team-room.test.mts`:

```ts
test("withRoom: after a restart, an account not back yet keeps its teams, shifts and rule, until it is", () => {
  const before = withRoom(undefined, room({ shifts: [ { owner: B, team: "TEAM BLUE", shift: 1 } ], rule: { by: B, partnerRule: true } }), 1);
  const restarted = withRoom(before, { lobbyId: LOBBY, teams: [], shifts: [], peers: [ PEERS[0] ] }, 2);
  const kept = roomOf(restarted, LOBBY)!;
  assert.deepEqual(kept.teams.map(team => [ team.owner, team.name ]), [ [ B, "TEAM BLUE" ] ]);
  assert.deepEqual(kept.shifts, [ { owner: B, team: "TEAM BLUE", shift: 1 } ]);
  assert.deepEqual(kept.rule, { by: B, partnerRule: true });
  const back = withRoom(restarted, { lobbyId: LOBBY, teams: [], shifts: [], peers: PEERS }, 3);
  assert.deepEqual(roomOf(back, LOBBY)!.teams, [], "B is back, without teams: they went");
  assert.equal(roomOf(back, LOBBY)!.rule, undefined);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node_modules/.bin/tsx --test $SCR/tests/team-room.test.mts`
Expected: the new test fails, with `kept.teams` `[]`.

- [ ] **Step 3: Implement**

`withRoom` becomes:

```ts
/**
 * The room as it arrived, kept with the lobbies of the last day. A restarted
 * server comes back empty, and the first screen to rejoin hears that first:
 * an account that is neither a peer nor an owner in the new state keeps the
 * teams and shifts it had here, and an absent author its rule, until it is back.
 */
export function withRoom(store: RoomStore | undefined, state: RoomState, now: number): RoomStore {
  const next: RoomStore = {};
  for (const [ id, entry ] of Object.entries(store ?? {})) {
    if (id !== state.lobbyId && entry && now - entry.at < ROOM_TTL_MS) next[id] = entry;
  }
  const last = store?.[state.lobbyId];
  const before = last && now - last.at < ROOM_TTL_MS ? last : undefined;
  const here = new Set([ ...state.peers.map(peer => peer.userId), ...state.teams.map(team => team.owner) ]);
  const entry: RoomMirror = {
    ...state,
    teams: [ ...state.teams, ...(before?.teams ?? []).filter(team => !here.has(team.owner)) ],
    shifts: [ ...state.shifts, ...(before?.shifts ?? []).filter(shift => !here.has(shift.owner)) ],
    at: now,
    seen: [ ...new Set([ ...(before?.seen ?? []), ...here ]) ],
  };
  const rule = state.rule ?? (before?.rule && !state.peers.some(peer => peer.userId === before.rule!.by) ? before.rule : undefined);
  if (rule) entry.rule = rule;
  else delete entry.rule;
  next[state.lobbyId] = entry;
  return next;
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `node_modules/.bin/tsx --test $SCR/tests/team-room.test.mts`
Expected: all pass, the earlier `withRoom` tests included.

- [ ] **Step 5: Commit**

```bash
git add utils/team-room.ts
git commit -m "fix: after a team server restart, the other team stays on screen until its Tools is back"
```

---

### Task 7: The status card names you before the room does

**Files:**
- Modify: `utils/team-room.ts` (add `statusAccounts`, `StatusAccount`), `entrypoints/lobby.content/TeamRoomStatus.vue` (`accounts`), `entrypoints/lobby.content/teams.ts` (`StatusView.myName`, `myName`)
- Test: `$SCR/tests/team-room.test.mts`

**Interfaces:**
- Produces: `interface StatusAccount { userId: string; name: string; you: boolean; connected: boolean; teams: string[] }` and `statusAccounts(input: { room: RoomState | undefined; me: string | null; myName: string; players: readonly RoomSeat[]; myTeams: readonly string[]; connection: Connection }): StatusAccount[]`

- [ ] **Step 1: Write the failing test**

Add `statusAccounts` to the test file's import from `utils/team-room.ts`, then append:

```ts
test("statusAccounts: this account first, named by its token until the room knows it, then the others with seats here", () => {
  const before = statusAccounts({ room: undefined, me: A, myName: "creazy", players: [ RED_SEAT, BLUE_SEAT ], myTeams: [ "TEAM RED" ], connection: "connected" });
  assert.deepEqual(before, [
    { userId: A, name: "CREAZY", you: true, connected: false, teams: [ "TEAM RED" ] },
    { userId: B, name: "CREAZY_DEV", you: false, connected: false, teams: [] },
  ]);
  const joined = statusAccounts({ room: room(), me: A, myName: "creazy", players: [ RED_SEAT, BLUE_SEAT ], myTeams: [ "TEAM RED" ], connection: "connected" });
  assert.deepEqual(joined.map(account => [ account.name, account.connected, account.teams ]), [ [ "CREAZY", true, [ "TEAM RED" ] ], [ "CREAZY_DEV", true, [ "TEAM BLUE" ] ] ]);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node_modules/.bin/tsx --test $SCR/tests/team-room.test.mts`
Expected: FAIL, because `statusAccounts` isn't exported.

- [ ] **Step 3: Implement**

In `utils/team-room.ts`, after `otherAccounts`:

```ts
/** An account on the status card: whether its Tools is in the room, and its teams there. */
export interface StatusAccount { userId: string; name: string; you: boolean; connected: boolean; teams: string[] }

/** The status card's accounts: this one first, by the room's name for it or else its token's, then every other account with seats here. */
export function statusAccounts(input: { room: RoomState | undefined; me: string | null; myName: string; players: readonly RoomSeat[]; myTeams: readonly string[]; connection: Connection }): StatusAccount[] {
  const { room, me, myName, players, myTeams, connection } = input;
  const peers = new Set((room?.peers ?? []).map(peer => peer.userId));
  const teamsOf = (userId: string) => (room?.teams ?? []).filter(team => team.owner === userId).map(team => normalizeName(team.name));
  const self = (room?.peers ?? []).find(peer => peer.userId === me);
  const out: StatusAccount[] = me ? [ { userId: me, name: normalizeName(self?.name ?? myName), you: true, connected: connection === "connected" && peers.has(me), teams: [ ...myTeams ] } ] : [];
  for (const account of otherAccounts(players, me)) out.push({ userId: account.userId, name: account.name, you: false, connected: peers.has(account.userId), teams: teamsOf(account.userId) });
  return out;
}
```

In `TeamRoomStatus.vue`, replace the `accounts` computed's body with:

```ts
/** This account first, then everyone else with seats here: whether their Tools is in the room, and their teams. */
const accounts = computed(() => statusAccounts(props.view));
```

Import `statusAccounts` from `@/utils/team-room`, and drop the `normalizeName` and `otherAccounts` imports if nothing else uses them.

In `entrypoints/lobby.content/teams.ts`:
- add `myName: string;` to `StatusView` with a comment, "This account's name from its token, for the card until the room has it"
- add `myName: ""` to `statusView`'s initial value
- add a module variable, `/** This account's name, from its token. */ let myName = "";`
- set it where `hostId` is read: `myName = (await tokenIdentity())?.name ?? "";`
- in `syncOnline`, pass `myName` along with `me: hostId`

- [ ] **Step 4: Run it to see it pass**

Run: `node_modules/.bin/tsx --test $SCR/tests/team-room.test.mts && node_modules/.bin/eslint entrypoints/lobby.content/TeamRoomStatus.vue entrypoints/lobby.content/teams.ts utils/team-room.ts`
Expected: all pass and lint is clean.

- [ ] **Step 5: Commit**

```bash
git add utils/team-room.ts entrypoints/lobby.content/TeamRoomStatus.vue entrypoints/lobby.content/teams.ts
git commit -m "fix: Online Teams' status card names you before the room does"
```

---

### Task 8: The invitation: Cricket's mode, sets lobbies, reasons you can read, one mount

**Files:**
- Modify: `utils/team-room.ts` (add `inviteLists`, `inviteGame`), `entrypoints/lobby.content/TeamInvite.vue`, `entrypoints/lobby.content/teams.ts` (`InviteView`, `inviteView`, `syncOnline`, mount guards), `locales/{en,de,nl}/teams.ts` (`teams.online.invitation.setsLobby`)
- Test: `$SCR/tests/team-room.test.mts`

**Interfaces:**
- Produces:
  - `inviteLists(saved: readonly SavedTeam[], format: TeamFormat, sets: number): { saved: SavedTeam[]; other: SavedTeam[]; reasons: ("format" | "sets")[] }`
  - `inviteGame(game: { variant: string; mode: string; score: number }): { text: string } | { key: MessageKey }`
  - `InviteView.game` gains `mode: string`, and `InviteView` gains `reasons: ("format" | "sets")[]`

- [ ] **Step 1: Write the failing tests**

Add `inviteLists` and `inviteGame` to the test file's import from `utils/team-room.ts`, and import `gameModeLabelKey` from `utils/game-modes.ts`. Then append:

```ts
test("inviteLists: teams of the lobby's format can join; the rest are listed, with why", () => {
  const OWN: any = { name: "TEAM OWN", players: [ "ANNA", "TOM" ], colour: crimson, format: "own" };
  assert.deepEqual(inviteLists([ RED, OWN ], "shared", 0), { saved: [ RED ], other: [ OWN ], reasons: [ "format" ] });
  assert.deepEqual(inviteLists([ RED, OWN ], "own", 0), { saved: [ OWN ], other: [ RED ], reasons: [ "format" ] });
  assert.deepEqual(inviteLists([ RED, OWN ], "own", 3), { saved: [], other: [ RED, OWN ], reasons: [ "format", "sets" ] }, "a sets lobby takes no own-score team");
});

test("inviteGame: X01 by its score, Cricket by its game mode as the site writes it, the rest by their label", () => {
  assert.deepEqual(inviteGame({ variant: "X01", mode: "", score: 501 }), { text: "501" });
  assert.deepEqual(inviteGame({ variant: "Cricket", mode: "Tactics", score: 0 }), { text: "Tactics" });
  assert.deepEqual(inviteGame({ variant: "Cricket", mode: "Hidden Cricket", score: 0 }), { text: "Hidden Cricket" });
  assert.deepEqual(inviteGame({ variant: "Cricket", mode: "", score: 0 }), { key: gameModeLabelKey("Cricket") });
  assert.deepEqual(inviteGame({ variant: "Shanghai", mode: "", score: 0 }), { key: gameModeLabelKey("Shanghai") });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `node_modules/.bin/tsx --test $SCR/tests/team-room.test.mts`
Expected: FAIL, because neither function is exported.

- [ ] **Step 3: Implement**

In `utils/team-room.ts`, add `import type { MessageKey } from "@/utils/i18n";` with the type imports, `import { gameModeLabelKey } from "@/utils/game-modes";` with the others, and `TeamFormat` to the type import from `@/utils/teams` if it isn't there. Then:

```ts
/**
 * The invitation's saved teams: those that can join this lobby, and the rest,
 * with each reason once. A different format comes first; a sets lobby then
 * takes no own-score team either.
 */
export function inviteLists(saved: readonly SavedTeam[], format: TeamFormat, sets: number): { saved: SavedTeam[]; other: SavedTeam[]; reasons: ("format" | "sets")[] } {
  const out = { saved: [] as SavedTeam[], other: [] as SavedTeam[], reasons: [] as ("format" | "sets")[] };
  for (const team of saved) {
    const reason = team.format !== format ? "format" : sets && team.format === "own" ? "sets" : undefined;
    if (!reason) {
      out.saved.push(team);
      continue;
    }
    out.other.push(team);
    if (!out.reasons.includes(reason)) out.reasons.push(reason);
  }
  return out;
}

/**
 * How the invitation names a lobby's game: X01 by its base score, Cricket by
 * its game mode (Cricket, Tactics, Hidden Cricket), unchanged as the site's
 * own "This game" line shows it in every language, and anything else by its
 * label.
 */
export function inviteGame(game: { variant: string; mode: string; score: number }): { text: string } | { key: MessageKey } {
  if (game.variant === "X01") return { text: String(game.score) };
  if (game.variant === "Cricket" && game.mode) return { text: game.mode };
  return { key: gameModeLabelKey(game.variant) };
}
```

In `entrypoints/lobby.content/teams.ts`:
- `InviteView.game` becomes `{ variant: string; mode: string; score: number; legs: number; sets: number }`.
- Add `/** Why the others can't join, each once: "format", or "sets" for own scores in a sets lobby. */ reasons: ("format" | "sets")[];` to `InviteView`.
- `inviteView`'s initial value gets `game: { variant: "X01", mode: "", score: 501, legs: 1, sets: 0 }` and `reasons: []`.
- In `syncOnline`, compute `const lists = inviteLists(saved, format, lobby.sets ?? 0);`. Set `game: { variant: lobby.variant, mode: lobby.settings?.gameMode ?? "", score: lobby.settings?.baseScore ?? 0, legs: lobby.legs ?? 1, sets: lobby.sets ?? 0 }`, `saved: lists.saved`, `other: lists.other` and `reasons: lists.reasons`. Import `inviteLists` with the other `@/utils/team-room` imports.
- Add mount guards beside `statusUi`/`inviteUi`, `let statusMounting = false;` and `let inviteMounting = false;`, with the comment "/** On its way in: the first frames ask for the chip and the invitation several times before createShadowRootUi returns. */". In `syncOnline`:

```ts
  if (!statusUi && !statusMounting) {
    statusMounting = true;
    mountStatus().catch(e => console.error(e)).finally(() => {
      statusMounting = false;
    });
  }
  if (!inviteUi && !inviteMounting) {
    inviteMounting = true;
    mountInvite().catch(e => console.error(e)).finally(() => {
      inviteMounting = false;
    });
  }
```

In `TeamInvite.vue`:
- `details` uses `inviteGame`:

```ts
/** The lobby's game in the site's own words (utils/team-room.ts `inviteGame`), and what wins it. */
const details = computed(() => {
  const { legs, sets } = props.view.game;
  const name = inviteGame(props.view.game);
  const game = "text" in name ? name.text : t(name.key);
  return sets ? t("teams.online.invitation.sets", { game, count: sets }) : t("teams.online.invitation.legs", { game, count: legs });
});
```

- Drop the `GameMode`/`gameModeLabelKey` import if unused, and import `inviteGame` from `@/utils/team-room`.
- Remove the dim span's `:title`.
- After `.adt-invite-picks`, add:

```vue
    <p v-for="reason in view.reasons" :key="reason" class="adt-invite-why">
      {{ reason === "sets" ? t("teams.online.invitation.setsLobby") : t("teams.online.invitation.otherFormat", { format: formatText }) }}
    </p>
```

- Add the CSS `.adt-invite-why { margin: 8px 0 0; font-size: 11.5px; color: #dbe1eb; }`.

Locales, inside `teams.online.invitation` after `otherFormat`:
- en: `setsLobby: "Own scores play legs, and this lobby plays sets",`
- de: `setsLobby: "Eigene Scores spielen Legs, und diese Lobby spielt Sets",`
- nl: `setsLobby: "Eigen scores spelen legs, en deze lobby speelt sets",`

- [ ] **Step 4: Run them to see them pass**

Run: `node_modules/.bin/tsx --test $SCR/tests/team-room.test.mts && yarn -s i18n:check && node_modules/.bin/eslint entrypoints/lobby.content/TeamInvite.vue entrypoints/lobby.content/teams.ts utils/team-room.ts`
Expected: all pass, "i18n: all good.", and lint is clean.

- [ ] **Step 5: Commit**

```bash
git add utils/team-room.ts entrypoints/lobby.content/TeamInvite.vue entrypoints/lobby.content/teams.ts locales/en/teams.ts locales/de/teams.ts locales/nl/teams.ts
git commit -m "feat: Online Teams' invitation names a Cricket lobby by its game mode, and says why a saved team can't join"
```

---

### Task 9: Cricket in the docs

**Files:**
- Modify: `README.md` (the Online Teams sub-bullets), `CHANGELOG.md` (`[Unreleased]`), `docs/superpowers/specs/2026-10-03-online-teams-design.md` (protocol table)

- [ ] **Step 1: README**

The **Online Teams** sub-bullet's first sentence becomes: "two teams can play X01 or Cricket (Tactics included) from two boards in different places, in one autodarts online lobby."

- [ ] **Step 2: CHANGELOG**

In `[Unreleased]` → `### Added`, the Online Teams entry's first clause becomes: "two teams on two boards in different places play one autodarts online match of X01 or Cricket".

Under `### Fixed`, add:

```markdown
- **Local Lobby** moves everyone who joins onto your board again. On the rebuilt site it pressed the house button, which takes a player you host off your board, so it never moved anyone
- **Teams**: a saved own-score team with two bots of one level keeps both. Reading the settings merged them into one bot
```

- [ ] **Step 3: The first spec's protocol table**

In `docs/superpowers/specs/2026-10-03-online-teams-design.md`, the `room:join` row's ack reads `{ ok, value: state }`, as every ack in the code does: `{ ok: true, value } | { ok: false, error }`.

- [ ] **Step 4: Check and commit**

Run: `yarn -s i18n:check`
Expected: "i18n: all good."

```bash
git add README.md CHANGELOG.md docs/superpowers/specs/2026-10-03-online-teams-design.md
git commit -m "docs: Online Teams in Cricket, and the Local Lobby and saved-team fixes"
```

---

### Task 10: The live matrix

No new code unless a run fails. Each failure goes through superpowers:systematic-debugging, with a test where one fits, then a `fix:` commit.

- [ ] **Step 1: Run each with both browsers** (dev Chrome as creazy, Firefox on port 4001 as creazy_dev, and the local server). Bring Firefox forward (`open -a /Applications/Firefox.app`) before each Firefox read, since a hidden window gets no animation frames.
  1. **Cricket, shared:** lobby, match, tap-to-correct from both sides, a leg won.
  2. **Cricket, own scores:** the seats alternated, the tally, the team match win, Next Leg held.
  3. **The invitation in German** in a Tactics lobby: "Lobby von CREAZY · Tactics · Erster bis 3 Legs".
  4. **A sets lobby** with own scores: an own-score saved team is dim, with "Eigene Scores spielen Legs, und diese Lobby spielt Sets".
  5. **A server restart mid-match:**
     - stop and restart the local server
     - on the screen that rejoins first, the other team stays dressed throughout
     - the chip reads *connecting*, then *offline*, then in sync
  6. **Local Lobby on, in a private lobby of A's:**
     - B's account joins as a plain seat and is moved onto A's board (`hostId` becomes A's)
     - B's TEST BLUE team seat stays B's
     - switch Local Lobby back off
  7. **The status card before joining:** the "(you)" line carries A's name.
- [ ] **Step 2:** Write the results to `$SCR/E2E.md` under "Round 2".

---

### Task 11: Final checks, review, clean-up

- [ ] **Step 1: All checks**

Run:
```bash
(cd socket && bun test && bun run typecheck)
for f in $SCR/tests/*.test.mts; do node_modules/.bin/tsx --test --test-concurrency=1 "$f" || echo "FAILED $f"; done
yarn compile 2>&1 | grep -c "error TS"
git diff --name-only main...HEAD -- '*.ts' '*.vue' | grep -v '^socket/' | xargs node_modules/.bin/eslint
yarn -s i18n:check
yarn build 2>&1 | tail -2; yarn build:firefox 2>&1 | tail -2
```
Expected: every test passes; tsc prints nothing; 14 compile errors in `main`'s files; no lint problems beyond `main`'s own in `utils/storage.ts` and `wxt.config.ts`; "i18n: all good."; both builds succeed.

- [ ] **Step 2: Review.** A fresh reviewer on the most capable model reviews `main...feat/online-teams-cricket`, with the spec, this plan and its Review Focus. Then one fix pass with TDD.
- [ ] **Step 3: Clean up:**
  - restore Chrome's `config-2-0-0.teams` and `teams-lineups` from `$SCR/chrome-config-backup-2.json`, and remove `teams-shifts` and `teams-room`
  - restore `localStorage.selectedBoard`, `adt:last-visited-url` and `urlstatus`
  - delete or abort every test lobby and match (`cleanup.py`)
  - close your own tabs, and stop the Firefox build, its FIFO writer, the local server and `lna-hold.mjs`
  - leave `yarn dev` running
- [ ] **Step 4: Finish** with superpowers:finishing-a-development-branch: merge into `main` locally, as the user chose for the first round. Then report to the user.
