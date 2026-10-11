# WLED Keeps the Player's Effect Between Darts (#267) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge #267 for history and credit, then rework it into an option, *Keep the player's effect between darts*. With it on, a dart that sets off no WLED effect of its own brings back the effect its turn started with, instead of `gameon`.

**Architecture:** The merge is a real merge of the PR's head commit, so GitHub marks #267 merged when `main` is pushed. The rework lives in the match's WLED runtime (`entrypoints/match.content/wled.ts`). It remembers the effect each turn started with, chosen by the existing `turnStartEffect` and settled on one concrete effect. With the option on, that effect replaces `gameon` as the starting point of every update. The PR's own lookup in `utils/wled.ts` goes again. Everything is built in a worktree outside the repo the running `yarn dev` watches, and `main` is fast-forwarded once at the end.

**Tech Stack:** TypeScript, Vue 3 SFC, WXT storage, esbuild + node for the headless runtime test, vue-tsc, ESLint, the repo's i18n check.

**Spec:** `docs/superpowers/specs/2026-10-11-wled-keep-turn-effect-design.md`

## Global Constraints

- The option is `wledFx.keepTurnEffect?: boolean`. It is optional, and missing means off. No migration, no `config.version` change, and it is not in `defaultConfig`.
- The merge commit's subject is `Merge pull request #267 from vert0r/main`. It is a real merge of `23912857a5c1f01706729d9bdd2bca42d28004ea`.
- The rework commit carries `Co-Authored-By: vert0r <37353813+vert0r@users.noreply.github.com>`. Every commit ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Nothing is pushed, the version isn't bumped (`main` is at 3.4.0), and nothing is posted to #267.
- The watched repo (`/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt`, `yarn dev` running) gets only the final state, in one `git merge --ff-only`.
- Text ships in en/de/nl with exactly these strings:
  - en: "Keep the player's effect between darts" / "A dart that sets off no effect of its own brings back the effect the turn started with, such as the player's own, instead of gameon."
  - de: "Effekt des Spielers zwischen den Darts halten" / "Ein Dart ohne eigenen Effekt holt den Effekt zurück, mit dem die Aufnahme begann, etwa den des Spielers, statt gameon."
  - nl: "Het effect van de speler tussen de darts vasthouden" / "Een dart zonder eigen effect haalt het effect terug waarmee de beurt begon, zoals dat van de speler, in plaats van gameon."
- `yarn compile` baseline: 12 errors (wled.ts 2, migration-config.ts 3, websocket-monitor 2, and one each in Migration.vue, match.content/index.ts, content/index.ts, AutoStart.vue and the Safari copy). A change adds none.
- Match Vue component order and attribute order as the file around it does: events, then `v-model`, then bound props, then static ones.

## Review Focus

1. A corrected dart (same throw id, new segment) that loses its own effect should bring the turn's effect back, with the option on. Pinned in Task 2, scenario K.
2. A turn whose darts are all undone should go back to the effect it started with, never a new random pick, with the option on or off. Pinned in Task 2, scenario L.
3. The same player's first turn of the next leg should be chosen afresh, not carry the last leg's pick. Pinned in Task 2, scenario M.
4. A stored config without `keepTurnEffect`, which every existing user has, should be off, show the switch off, and store `true` once switched on. Pinned in Task 2 scenario A (off) and the live check in Task 5.
5. A player with no effect of their own and no `next_player` should keep `gameon` as the background with the option on, exactly as today. Pinned in Task 2, scenario N.

---

Paths used throughout:

```bash
REPO=/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt
S=/private/tmp/claude-501/-Volumes-WD-BLACK-PROJECTS-Autodarts-autodarts-tools-wxt/87332ebf-18b4-46a1-ab5d-cbed5fc21a12/scratchpad
WT=$S/wt-267          # the worktree, outside the watched repo
H=$S/keep-turn        # the headless harness (not committed)
```

### Task 1: The worktree and the mechanical merge of #267

**Files:**
- Modify (by merge): `utils/wled.ts` (the PR's 8 lines at the end of `processX01Data`)

**Interfaces:**
- Consumes: `main` with the spec and this plan committed.
- Produces: branch `merge/pr-267` in `$WT`, whose tip is the merge commit. `23912857` is its second parent.

- [ ] **Step 1: Create the worktree** (via superpowers:using-git-worktrees)

```bash
git -C $REPO worktree add -b merge/pr-267 $WT main
ln -s $REPO/node_modules $WT/node_modules
cd $WT && node_modules/.bin/wxt prepare
```

If `wxt prepare` fails, `cp -R $REPO/.wxt $WT/.wxt` instead: its tsconfig paths are relative.

- [ ] **Step 2: Fetch the PR's head and check it is the reviewed commit**

```bash
cd $WT && git fetch origin pull/267/head && git rev-parse FETCH_HEAD
```

Expected: `23912857a5c1f01706729d9bdd2bca42d28004ea`. If it differs, @vert0r has pushed since the review: stop and record that in the hand-over.

- [ ] **Step 3: Merge**

```bash
cd $WT && cat > $S/merge-267.txt <<'EOF'
Merge pull request #267 from vert0r/main

Implement player name trigger in WLED after each throw

Merges cleanly onto main. The next commit makes it an option, off by
default, and brings back the effect the turn started with, found the
way the turn's start finds it: the name as typed as well as with
underscores, the player whose turn it is rather than a Teams seat,
and next_player and bot_throw as well.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
git merge --no-ff -F $S/merge-267.txt 23912857a5c1f01706729d9bdd2bca42d28004ea
```

- [ ] **Step 4: Verify the merge**

```bash
cd $WT && git merge-base --is-ancestor 23912857a5c1f01706729d9bdd2bca42d28004ea HEAD && echo ancestor
git diff --stat main HEAD
git log -1 --format=%s
```

Expected: `ancestor`; only `utils/wled.ts | 9 ++++++++-`; subject `Merge pull request #267 from vert0r/main`.

### Task 2: The turn's effect in the WLED runtime, behind the option

**Files:**
- Create (scratchpad, not committed): `$H/build.mjs`, `$H/run.mjs`
- Modify: `entrypoints/match.content/wled.ts` (state after `lastRequest`; `wledFx`; `wledFxOnRemove`; `processGameData`; `setEffectByTrigger` split into `pickEffect`)
- Modify: `utils/wled.ts` (back to `main`'s version: the PR's lookup goes)
- Modify: `utils/storage.ts:274` (the field)

**Interfaces:**
- Consumes: `turnStartEffect(names, isBot, effects, triggerPresentCB): string | IWled` (`utils/wled.ts`) and `turnNames(match): string[]` (`utils/team-calls.ts`).
- Produces:
  - `IConfig["wledFx"]["keepTurnEffect"]?: boolean`, which Task 3's switch binds;
  - `function pickEffect(trigger: string): IWled | undefined` and `function effectOfTheTurn(match: IMatch, names: readonly string[]): string | IWled`, both module-private.

- [ ] **Step 1: Write the harness's bundler**

`$H/build.mjs`:

```js
// Bundles a WLED content-script module for node: SRC (REPO's
// entrypoints/match.content/wled.ts by default), with `@/` resolved to REPO
// and `#imports` giving WledType. Writes out/<OUT>.mjs.
import { build } from "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/node_modules/esbuild/lib/main.js";
import path from "node:path";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const REPO = process.env.REPO;
if (!REPO) throw new Error("REPO names the tree whose code is bundled");
const src = process.env.SRC ?? `${REPO}/entrypoints/match.content/wled.ts`;
const out = process.env.OUT ?? "wled";

await build({
  stdin: { contents: `export * from ${JSON.stringify(src)};`, resolveDir: HERE, loader: "ts" },
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: `${HERE}/out/${out}.mjs`,
  logLevel: "warning",
  plugins: [ {
    name: "aliases",
    setup(b) {
      b.onResolve({ filter: /^@\// }, args => b.resolve(`${REPO}/${args.path.slice(2)}`, { kind: args.kind, resolveDir: REPO }));
      b.onResolve({ filter: /^#imports$/ }, () => ({ path: "imports", namespace: "shim" }));
      b.onLoad({ filter: /.*/, namespace: "shim" }, () => ({
        contents: `export { WledType } from ${JSON.stringify(`${REPO}/utils/storage`)};`,
        loader: "ts",
        resolveDir: REPO,
      }));
    },
  } ],
});
console.log("built", out, "from", src);
```

- [ ] **Step 2: Write the failing scenarios**

`$H/run.mjs`:

```js
// Drives the bundled WLED runtime (out/<BUNDLE>.mjs) through turns and checks
// every request it sends, for Keep the player's effect between darts (#267).
//   node $H/build.mjs (REPO=…, OUT=…) && BUNDLE=… node $H/run.mjs
import { deepStrictEqual } from "node:assert";

const stores = new Map();
const items = new Map();
globalThis.storage = {
  defineItem(key, opts = {}) {
    if (items.has(key)) return items.get(key);
    const watchers = new Set();
    const item = {
      getValue: async () => structuredClone(stores.has(key) ? stores.get(key) : (opts.fallback ?? opts.defaultValue ?? null)),
      async setValue(value) {
        const old = stores.get(key);
        stores.set(key, structuredClone(value));
        for (const cb of watchers) queueMicrotask(() => cb(structuredClone(value), structuredClone(old)));
      },
      watch(cb) {
        watchers.add(cb);
        return () => watchers.delete(cb);
      },
      removeValue: async () => {
        stores.delete(key);
      },
    };
    items.set(key, item);
    return item;
  },
};
globalThis.browser = {
  runtime: { id: "test", getURL: p => p, sendMessage: async () => undefined },
  storage: { local: { get: async () => ({}), set: async () => {} } },
};
globalThis.Audio = class Audio extends EventTarget {};
const local = new Map();
globalThis.localStorage = {
  getItem: key => (local.has(key) ? local.get(key) : null),
  setItem: (key, value) => local.set(key, String(value)),
  removeItem: key => local.delete(key),
};

const MATCH = "0199c7a0-1111-7000-8000-000000000001";
const MATCH_URL = `https://play.autodarts.com/matches/${MATCH}`;
globalThis.window = globalThis;
globalThis.location = { href: MATCH_URL };

const sends = [];
globalThis.fetch = async url => {
  sends.push(decodeURIComponent(new URL(url).pathname));
  return new Response(null);
};

// Random picks answer from `randoms` first and 0.99 after that, so a second
// pick between two effects takes the other one.
const randoms = [];
Math.random = () => (randoms.length ? randoms.shift() : 0.99);

const log = console.log;
if (!process.env.DEBUG) {
  console.log = () => {};
  console.info = () => {};
}

const wled = await import(`./out/${process.env.BUNDLE}.mjs`);
const config = globalThis.storage.defineItem("local:config-2-0-0");
const gameData = globalThis.storage.defineItem("local:game-data");
const globalStatus = globalThis.storage.defineItem("local:globalstatus");
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const ME = "me-0000";
const THEM = "them-0000";
const MY_BOARD = "aaaaaaaa-0000-4000-8000-000000000001";
const THEIR_BOARD = "bbbbbbbb-0000-4000-8000-000000000001";
const token = sub => `x.${Buffer.from(JSON.stringify({ sub })).toString("base64")}.y`;

const anna = { id: "p-anna", name: "Anna", userId: ME, hostId: ME, boardId: MY_BOARD, cpuPPR: null };
const tom = { id: "p-tom", name: "Tom Meier", userId: null, hostId: ME, cpuPPR: null };
const bob = { id: "p-bob", name: "Bob", userId: null, hostId: ME, cpuPPR: null };
const bot = { id: "p-bot", name: "Bot", userId: null, hostId: ME, cpuPPR: 60 };
const lena = { id: "p-lena", name: "Lena", userId: THEM, hostId: THEM, boardId: THEIR_BOARD, cpuPPR: null };

const dart = (id, name, bed, number, multiplier) => ({ id, segment: { name, bed, number, multiplier }, coords: { x: 0, y: 0 } });
const S5 = dart("d1", "S5", "SingleOuter", 5, 1);
const T20 = dart("d2", "T20", "Triple", 20, 3);
const S1 = dart("d3", "S1", "SingleInner", 1, 1);
const S7 = dart("d4", "S7", "SingleOuter", 7, 1);
const D20 = dart("d5", "D20", "Double", 20, 2);
// T20 corrected: the same dart, now a single.
const S20 = dart("d2", "S20", "SingleOuter", 20, 1);
const VALUE = { S5: 5, T20: 60, S1: 1, S7: 7, D20: 40, S20: 20 };

/** One update: `players[player]` has thrown `throws` in turn `turnId`. */
function frame(players, player, turnId, throws, { leg = 1, round = 1, gameWinner = -1 } = {}) {
  const points = throws.reduce((total, t) => total + VALUE[t.segment.name], 0);
  return {
    match: {
      id: MATCH,
      variant: "X01",
      set: 1,
      leg,
      round,
      player,
      players,
      gameWinner,
      winner: -1,
      gameScores: players.map(() => 501),
      settings: { baseScore: 501 },
      turns: [ { id: turnId, playerId: players[player].id, points, score: points, busted: false, throws } ],
    },
  };
}

const HOST = "http://wled.test";
const effect = (name, trigger) => ({ name, type: "URL", url: `${HOST}/${name}`, preset: "0", json_api: "", enabled: true, triggers: [ trigger ] });
/** Effects by name; a pair names one whose trigger is the second. */
const fx = list => list.map(entry => (Array.isArray(entry) ? effect(entry[0], entry[1]) : effect(entry, entry)));
const wledConfig = (effects, options = {}) => ({ wledFx: { enabled: true, onlyOnce: true, effects, ...options } });

let failed = 0;
let seen = 0;
function expect(label, expected) {
  const got = sends.slice(seen);
  seen = sends.length;
  try {
    deepStrictEqual(got, expected);
    log(`PASS ${label}`);
  } catch {
    failed++;
    log(`FAIL ${label}\n  expected ${JSON.stringify(expected)}\n  got      ${JSON.stringify(got)}`);
  }
}

async function start(cfg, stored) {
  location.href = MATCH_URL;
  await config.setValue(cfg);
  await gameData.setValue(stored);
  await wled.wledFx();
  await sleep(400);
}
async function update(next) {
  await gameData.setValue(next);
  await sleep(350);
}
async function leave() {
  await wled.wledFxOnRemove();
  await sleep(50);
  seen = sends.length;
  randoms.length = 0;
}

await globalStatus.setValue({ auth: { token: token(ME) } });
localStorage.setItem("selectedBoard", MY_BOARD);

const annaAndTom = [ anna, tom ];
// Tom's effect is typed with its space, which the README allows.
const BASE = fx([ "gameon", "anna", [ "tom", "tom meier" ], "t20" ]);

/** Anna throws S5 (no effect of its own), T20 (its own) and S1; then Tom's turn and his S7. */
async function annaThenTom(prefix, expected) {
  expect(`${prefix}0 Anna's turn starts`, expected[0]);
  await update(frame(annaAndTom, 0, "t1", [ S5 ]));
  expect(`${prefix}1 Anna's S5, no effect of its own`, expected[1]);
  await update(frame(annaAndTom, 0, "t1", [ S5, T20 ]));
  expect(`${prefix}2 Anna's T20`, expected[2]);
  await update(frame(annaAndTom, 0, "t1", [ S5, T20, S1 ]));
  expect(`${prefix}3 Anna's S1, no effect of its own`, expected[3]);
  await update(frame(annaAndTom, 1, "t2", []));
  expect(`${prefix}4 Tom Meier's turn starts`, expected[4]);
  await update(frame(annaAndTom, 1, "t2", [ S7 ]));
  expect(`${prefix}5 Tom's S7, no effect of its own`, expected[5]);
}

// A: the option missing, as in every config saved before it: what WLED always sent.
await start(wledConfig(BASE), frame(annaAndTom, 0, "t1", []));
await annaThenTom("A", [ [ "/anna" ], [ "/gameon" ], [ "/t20" ], [ "/gameon" ], [ "/tom" ], [ "/gameon" ] ]);
await leave();

// B: the option on: each player's effect stays up through their turn.
await start(wledConfig(BASE, { keepTurnEffect: true }), frame(annaAndTom, 0, "t1", []));
await annaThenTom("B", [ [ "/anna" ], [], [ "/t20" ], [ "/anna" ], [ "/tom" ], [] ]);
await leave();

// C: on, with Don't restart a running effect off: sent after every dart that has none of its own.
await start(wledConfig(BASE, { keepTurnEffect: true, onlyOnce: false }), frame(annaAndTom, 0, "t1", []));
await annaThenTom("C", [ [ "/anna" ], [ "/anna" ], [ "/t20" ], [ "/anna" ], [ "/tom" ], [ "/tom" ] ]);
await leave();

// D: two next_player effects for Bob, who has none of his own: his turn keeps the one it started with.
const bobAndAnna = [ bob, anna ];
randoms.push(0);
await start(wledConfig(fx([ "gameon", [ "np1", "next_player" ], [ "np2", "next_player" ], "t20" ]), { keepTurnEffect: true }), frame(bobAndAnna, 0, "t1", []));
expect("D0 Bob's turn starts: the first next_player effect", [ "/np1" ]);
await update(frame(bobAndAnna, 0, "t1", [ T20 ]));
expect("D1 Bob's T20", [ "/t20" ]);
await update(frame(bobAndAnna, 0, "t1", [ T20, S5 ]));
expect("D2 Bob's S5: the same next_player effect, not another pick", [ "/np1" ]);
await leave();

// E: two effects on Anna's name: her turn keeps the one it started with.
randoms.push(0);
await start(wledConfig(fx([ "gameon", [ "anna1", "anna" ], [ "anna2", "anna" ], "t20" ]), { keepTurnEffect: true }), frame(annaAndTom, 0, "t1", []));
expect("E0 Anna's turn starts: her first effect", [ "/anna1" ]);
await update(frame(annaAndTom, 0, "t1", [ T20 ]));
expect("E1 Anna's T20", [ "/t20" ]);
await update(frame(annaAndTom, 0, "t1", [ T20, S5 ]));
expect("E2 Anna's S5: the same effect of hers", [ "/anna1" ]);
await leave();

// F: a bot's turn keeps bot_throw.
const botAndAnna = [ bot, anna ];
await start(wledConfig(fx([ "gameon", "anna", "bot_throw", "t20" ]), { keepTurnEffect: true }), frame(botAndAnna, 0, "t1", []));
expect("F0 the bot's turn starts", [ "/bot_throw" ]);
await update(frame(botAndAnna, 0, "t1", [ S5 ]));
expect("F1 the bot's S5: bot_throw still showing", []);
await update(frame(botAndAnna, 0, "t1", [ S5, T20 ]));
expect("F2 the bot's T20", [ "/t20" ]);
await update(frame(botAndAnna, 0, "t1", [ S5, T20, S1 ]));
expect("F3 the bot's S1: bot_throw again", [ "/bot_throw" ]);
await leave();

// G: an online opponent, with an effect on other: other throughout their turn, as before.
const online = [ lena, anna ];
await start(wledConfig(fx([ "gameon", "anna", "lena", "other", "t20" ]), { keepTurnEffect: true }), frame(online, 0, "t1", []));
expect("G0 Lena, elsewhere, is up: other", [ "/other" ]);
await update(frame(online, 0, "t1", [ T20 ]));
expect("G1 Lena's T20: other still showing", []);
await update(frame(online, 1, "t2", []));
expect("G2 Anna's turn starts", [ "/anna" ]);
await update(frame(online, 1, "t2", [ S5 ]));
expect("G3 Anna's S5: hers still showing", []);
await leave();

// H: a won leg: gameshot, the option on.
await start(wledConfig(fx([ "gameon", "anna", "gameshot", "t20" ]), { keepTurnEffect: true }), frame(annaAndTom, 0, "t1", []));
expect("H0 Anna's turn starts", [ "/anna" ]);
await update(frame(annaAndTom, 0, "t1", [ S5 ]));
expect("H1 Anna's S5", []);
await update(frame(annaAndTom, 0, "t1", [ S5, D20 ], { gameWinner: 0 }));
expect("H2 Anna checks out: gameshot", [ "/gameshot" ]);
await leave();

// I: a page opened in the middle of a turn: the turn's effect with the option, gameon without.
await start(wledConfig(BASE, { keepTurnEffect: true }), frame(annaAndTom, 0, "t1", [ S5 ]));
expect("I0 opened after Anna's S5, the option on: hers", [ "/anna" ]);
await leave();
await start(wledConfig(BASE), frame(annaAndTom, 0, "t1", [ S5 ]));
expect("I1 opened after Anna's S5, the option off: gameon", [ "/gameon" ]);
await leave();

// J: no effect on gameon: the player's effect comes back after a dart's own.
await start(wledConfig(fx([ "anna", "t20" ]), { keepTurnEffect: true }), frame(annaAndTom, 0, "t1", []));
expect("J0 Anna's turn starts", [ "/anna" ]);
await update(frame(annaAndTom, 0, "t1", [ T20 ]));
expect("J1 Anna's T20", [ "/t20" ]);
await update(frame(annaAndTom, 0, "t1", [ T20, S5 ]));
expect("J2 Anna's S5: hers again", [ "/anna" ]);
await leave();

// K (review focus 1): a corrected dart that loses its own effect brings the turn's effect back.
await start(wledConfig(BASE, { keepTurnEffect: true }), frame(annaAndTom, 0, "t1", []));
expect("K0 Anna's turn starts", [ "/anna" ]);
await update(frame(annaAndTom, 0, "t1", [ T20 ]));
expect("K1 Anna's T20", [ "/t20" ]);
await update(frame(annaAndTom, 0, "t1", [ S20 ]));
expect("K2 the T20 corrected to S20: hers again", [ "/anna" ]);
await leave();

// L (review focus 2): every dart undone, the option off: the effect the turn started with, not another pick.
randoms.push(0);
await start(wledConfig(fx([ "gameon", [ "anna1", "anna" ], [ "anna2", "anna" ] ])), frame(annaAndTom, 0, "t1", []));
expect("L0 Anna's turn starts: her first effect", [ "/anna1" ]);
await update(frame(annaAndTom, 0, "t1", [ S5 ]));
expect("L1 Anna's S5, the option off: gameon", [ "/gameon" ]);
await update(frame(annaAndTom, 0, "t1", []));
expect("L2 the S5 undone: her first effect again", [ "/anna1" ]);
await leave();

// M (review focus 3): the same player's first turn of the next leg is picked afresh.
randoms.push(0);
await start(wledConfig(fx([ "gameon", [ "anna1", "anna" ], [ "anna2", "anna" ] ]), { keepTurnEffect: true }), frame(annaAndTom, 0, "t1", []));
expect("M0 Anna's first turn: anna1", [ "/anna1" ]);
await update(frame(annaAndTom, 1, "t2", []));
expect("M1 Tom's turn, no effect of his own: gameon", [ "/gameon" ]);
await update(frame(annaAndTom, 0, "t3", [], { leg: 2 }));
expect("M2 Anna's first turn of leg 2: picked afresh", [ "/anna2" ]);
await leave();

// N (review focus 5): nobody's effect and no next_player, the option on: gameon stays the background.
await start(wledConfig(fx([ "gameon", "anna", "t20" ]), { keepTurnEffect: true }), frame(bobAndAnna, 0, "t1", []));
expect("N0 Bob's turn starts: gameon", [ "/gameon" ]);
await update(frame(bobAndAnna, 0, "t1", [ S5 ]));
expect("N1 Bob's S5: gameon still showing", []);
await update(frame(bobAndAnna, 0, "t1", [ S5, T20 ]));
expect("N2 Bob's T20", [ "/t20" ]);
await update(frame(bobAndAnna, 0, "t1", [ S5, T20, S1 ]));
expect("N3 Bob's S1: gameon", [ "/gameon" ]);
await leave();

log(failed ? `${failed} FAILED` : "all passed");
process.exit(failed ? 1 : 0);
```

- [ ] **Step 3: Run it red, against `main` and against the merge**

```bash
REPO=$REPO OUT=main node $H/build.mjs && BUNDLE=main node $H/run.mjs
REPO=$WT OUT=merged node $H/build.mjs && BUNDLE=merged node $H/run.mjs
```

Expected, `main`: A, G0–G2, I1, M and N pass. B1/B3/B5, C1/C3/C5, D2, E2, F1, F3, G3, H1, I0, J2, K2 and L2 fail; G3 and H1 because `main` sends `gameon` after a dart. Expected, merged (the PR):
- A1 and A3 fail: that is the released behaviour the PR changes.
- B5 and C5 fail on Tom's spaced name.
- D2, E2, F1 and F3 fail: it keeps neither `next_player`, `bot_throw` nor the turn's pick.
- I1, L1 and L2 fail: it is always on.

- [ ] **Step 4: The field in the config**

In `utils/storage.ts`, after `onlyOnce: boolean;` in `wledFx`:

```ts
    onlyOnce: boolean;
    /**
     * After a dart that sets off no effect of its own, the effect its turn
     * started with plays again rather than `gameon`: the player's, their
     * team's, `next_player` or `bot_throw`. Missing is off, as before there
     * was the option.
     */
    keepTurnEffect?: boolean;
```

- [ ] **Step 5: The PR's lookup goes**

```bash
cd $WT && git checkout main -- utils/wled.ts && git diff --stat main -- utils/wled.ts
```

Expected: no difference from `main`.

- [ ] **Step 6: The turn's effect, remembered**

In `entrypoints/match.content/wled.ts`, after the `lastRequest` declaration:

```ts
let lastRequest: string | undefined;

/**
 * The effect the turn up started with, and the turn it was chosen for, for
 * *Keep the player's effect between darts* (`wledFx.keepTurnEffect`). Chosen
 * once a turn and settled on one effect, so a player with more than one, or
 * more than one `next_player` effect, keeps the one their turn started with.
 * Forgotten whenever WLED starts on a page, as the effects may have changed.
 */
let turnEffect: { turn: string; effect: string | IWled } | undefined;
```

In `wledFx()`, after `lastRequest = undefined;`:

```ts
    lastRequest = undefined;
    turnEffect = undefined;
```

In `wledFxOnRemove()`, after `turnPlayer = "";`:

```ts
  turnPlayer = "";
  turnEffect = undefined;
```

Before the `/** Process game data to trigger effects based on game events */` comment:

```ts
/**
 * What the turn up started with (see {@link turnEffect}): `bot_throw`, the
 * player's or their team's effect, `next_player` or `gameon`, as
 * turnStartEffect chooses. A trigger is settled on one of its effects here.
 * With Teams, a change of who throws is a change of `names`, and chooses again.
 */
function effectOfTheTurn(match: IMatch, names: readonly string[]): string | IWled {
  const turn = [ match.id, match.set, match.leg, match.round, match.player, match.turns[0]?.id, ...names ].join("\n");
  if (turnEffect?.turn !== turn) {
    const isBot = match.players?.[match.player]?.cpuPPR !== null;
    const effect = turnStartEffect(names, isBot, config.wledFx.effects, isTriggerPresent);
    turnEffect = { turn, effect: typeof effect === "string" ? pickEffect(effect) ?? effect : effect };
  }
  return turnEffect.effect;
}
```

- [ ] **Step 7: The option in `processGameData`**

Replace:

```ts
  // A visit that has just started: the player's own effect, or the one that
  // shows whoever is up. With Teams, `names` is the player's and then their
  // team's (utils/team-calls.ts).
  if (gameData.match.turns[0].throws.length === 0) {
    const currentPlayer = gameData.match.players?.[gameData.match.player];
    nextEffect = turnStartEffect(names, currentPlayer?.cpuPPR !== null, config.wledFx.effects, isTriggerPresent);
  }
```

with:

```ts
  // A visit that has just started: the player's own effect, or the one that
  // shows whoever is up. With Teams, `names` is the player's and then their
  // team's (utils/team-calls.ts). With *Keep the player's effect between
  // darts* it also stands in for gameon after a dart with no effect of its own.
  if (gameData.match.turns[0].throws.length === 0 || config.wledFx.keepTurnEffect) {
    nextEffect = effectOfTheTurn(gameData.match, names);
  }
```

- [ ] **Step 8: `pickEffect`, split out of `setEffectByTrigger`**

Replace the whole of `setEffectByTrigger`, from its `/** Set an effect based on the trigger */` comment to its closing brace, with:

```ts
/**
 * One of the switched-on effects on `trigger`, picked at random when there are
 * more; a number also finds the ranges that take it in.
 */
function pickEffect(trigger: string): IWled | undefined {
  // Find all effects that match the trigger
  const matchingEffects = config.wledFx.effects.filter(
    effect => effect.enabled && effect.triggers && effect.triggers.includes(trigger),
  );

  const points = Number(trigger);
  if (!matchingEffects.length && !Number.isNaN(points)) {
    const range_triggers = config.wledFx.effects.filter(
      effect =>
        effect.enabled && effect?.triggers.some(trigger => trigger.match(triggerPatterns.ranges)),
    );
    for (let i = 0; i < range_triggers.length; i++) {
      const element = range_triggers[i];
      for (let j = 0; j < element.triggers.length; j++) {
        const parts = element.triggers[j].match(triggerPatterns.ranges);
        if (!parts) continue;
        const min = Number(parts[1]);
        const max = Number(parts[2]);
        if (min <= points && points <= max) {
          matchingEffects.push(element);
          break;
        }
      }
    }
  }

  if (!matchingEffects.length) return undefined;

  // If multiple effects match the trigger, pick a random one
  return matchingEffects[Math.floor(Math.random() * matchingEffects.length)];
}

/**
 * Set an effect based on the trigger
 */
export async function setEffectByTrigger(trigger: string, wait: boolean = false): Promise<void> {
  if (!config) {
    config = await AutodartsToolsConfig.getValue();
    if (!config.wledFx.effects.length) {
      console.log("Autodarts Tools: WLED: No effects configured");
      return;
    }
  }

  // A trigger lights nothing while WLED is switched off. The lobby and match
  // scripts tear WLED down on every page they leave, whether it ever started or
  // not, and that teardown sends `idle`: it lit the lights with WLED off. The
  // settings' send and Test buttons go to tryEffect, so they still work.
  if (!config.wledFx?.enabled) return;

  const nextEffect = pickEffect(trigger);
  if (!nextEffect) {
    console.log(`Autodarts Tools: WLED: No effect found for trigger "${trigger}"`);
    return;
  }

  console.log(`Autodarts Tools: WLED: Found matching effect ${nextEffect.name}`);
  await setEffect(nextEffect, wait);
}
```

- [ ] **Step 9: Run it green**

```bash
REPO=$WT OUT=keep node $H/build.mjs && BUNDLE=keep node $H/run.mjs
```

Expected: `all passed`.

- [ ] **Step 10: Mutants, each of which must fail**

```bash
cd $S && F=$WT/entrypoints/match.content/wled.ts && mkdir -p $H/mut
python3 - "$F" "$H/mut" <<'EOF'
import sys
src = open(sys.argv[1]).read()
muts = {
  "ignored": ("throws.length === 0 || config.wledFx.keepTurnEffect", "throws.length === 0"),
  "repicked": ("if (turnEffect?.turn !== turn) {", "if (true) {"),
  "unresolved": ("effect: typeof effect === \"string\" ? pickEffect(effect) ?? effect : effect", "effect"),
}
for name, (a, b) in muts.items():
    assert src.count(a) == 1, name
    open(f"{sys.argv[2]}/{name}.ts", "w").write(src.replace(a, b))
EOF
for m in ignored repicked unresolved; do REPO=$WT SRC=$H/mut/$m.ts OUT=mut-$m node $H/build.mjs >/dev/null && BUNDLE=mut-$m node $H/run.mjs | grep -E "^FAIL|FAILED|all passed" | head -4; done
```

Expected: `ignored` fails B; `repicked` fails D2, E2 and L2; `unresolved` fails D2. None says `all passed`.

- [ ] **Step 11: Type-check and lint what changed**

```bash
cd $WT && yarn compile 2>&1 | grep -E "error TS" | sed -E 's/\(.*//' | sort | uniq -c
cd $WT && yarn lint --base main
```

Expected: the 12 baseline errors in the same files; nothing from lint in lines this task wrote.

- [ ] **Step 12: Commit**

```bash
cd $WT && git add utils/storage.ts utils/wled.ts entrypoints/match.content/wled.ts && git commit -F - <<'EOF'
feat: WLED can keep the player's effect between darts, from #267

With wledFx.keepTurnEffect on, a dart that sets off no effect of its
own brings back the effect its turn started with, instead of gameon:
bot_throw, the player's or their team's effect, or next_player. The
turn's effect is chosen once, as turnStartEffect chooses it, and
settled on one effect, so a player with more than one keeps theirs
until the turn ends. The pull request looked up the seat's name with
underscores only, which missed an effect on the name as typed and,
with Teams, the player whose turn it is; that lookup goes, so with the
option off WLED sends what it sent before.

Co-Authored-By: vert0r <37353813+vert0r@users.noreply.github.com>
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

### Task 3: The switch in WLED's Options, in three languages

**Files:**
- Modify: `components/Settings/Wled.vue:19-24` (a row after *Don't restart a running effect*)
- Modify: `locales/en/wled.ts`, `locales/de/wled.ts`, `locales/nl/wled.ts` (after `onlyOnce`)

**Interfaces:**
- Consumes: `config.wledFx.keepTurnEffect?: boolean` (Task 2).
- Produces: catalog keys `wled.keepTurnEffect.title` and `wled.keepTurnEffect.description`.

- [ ] **Step 1: The row, before its words exist**

In `components/Settings/Wled.vue`, after the `onlyOnce` row:

```vue
          <OptionRow
            :description="t('wled.onlyOnce.description')"
            :title="t('wled.onlyOnce.title')"
          >
            <AppToggle v-model="config.wledFx.onlyOnce" size="sm" />
          </OptionRow>
          <OptionRow
            :description="t('wled.keepTurnEffect.description')"
            :title="t('wled.keepTurnEffect.title')"
          >
            <AppToggle @update:model-value="config.wledFx.keepTurnEffect = $event" :model-value="config.wledFx.keepTurnEffect ?? false" size="sm" />
          </OptionRow>
```

The explicit binding shows a missing value as off without handing `AppToggle` an `undefined` for its boolean prop.

- [ ] **Step 2: See the check fail**

```bash
cd $WT && yarn i18n:check components/Settings/Wled.vue 2>&1 | tail -5
```

Expected: failure naming `wled.keepTurnEffect.title` or `.description` as missing. If the check doesn't read keys used in templates, `yarn compile` reports the unknown key instead, for a typed `t()`.

- [ ] **Step 3: The words**

`locales/en/wled.ts`, after the `onlyOnce` block:

```ts
  keepTurnEffect: {
    title: "Keep the player's effect between darts",
    description: "A dart that sets off no effect of its own brings back the effect the turn started with, such as the player's own, instead of gameon.",
  },
```

`locales/de/wled.ts`, after the `onlyOnce` block:

```ts
  keepTurnEffect: {
    title: "Effekt des Spielers zwischen den Darts halten",
    description: "Ein Dart ohne eigenen Effekt holt den Effekt zurück, mit dem die Aufnahme begann, etwa den des Spielers, statt gameon.",
  },
```

`locales/nl/wled.ts`, after the `onlyOnce` block:

```ts
  keepTurnEffect: {
    title: "Het effect van de speler tussen de darts vasthouden",
    description: "Een dart zonder eigen effect haalt het effect terug waarmee de beurt begon, zoals dat van de speler, in plaats van gameon.",
  },
```

- [ ] **Step 4: The checks pass**

```bash
cd $WT && yarn i18n:check && yarn lint --base main
cd $WT && node -e "const {parse}=require('@vue/compiler-sfc');const r=parse(require('fs').readFileSync('components/Settings/Wled.vue','utf8'));console.log(r.errors.length?r.errors:'sfc ok')"
cd $WT && yarn compile 2>&1 | grep -E "error TS" | sed -E 's/\(.*//' | sort | uniq -c
cd $WT && yarn build 2>&1 | tail -4
```

Expected: the i18n check passes; lint adds nothing; `sfc ok`; the same 12 compile errors; the build completes.

- [ ] **Step 5: Commit**

```bash
cd $WT && git add components/Settings/Wled.vue locales/en/wled.ts locales/de/wled.ts locales/nl/wled.ts && git commit -F - <<'EOF'
feat: WLED's options have Keep the player's effect between darts, in English, German and Dutch

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

### Task 4: README and CHANGELOG, crediting @vert0r

**Files:**
- Modify: `README.md` (WLED's *Configuration Options*, *Game Events*, *Smart Effect Selection*, *The player's name in an effect*)
- Modify: `CHANGELOG.md` (`[Unreleased]` › Added)

**Interfaces:**
- Consumes: the option's English title (Task 3).
- Produces: nothing code depends on.

- [ ] **Step 1: README, the option's bullet**

After the line that starts `- **Don't restart a running effect**:` in WLED's *Configuration Options*, add:

```markdown
- **Keep the player's effect between darts**: A dart that sets off no effect of its own brings back the effect the turn started with, instead of `gameon`: the player's own, their team's, `next_player` or `bot_throw`. A player with an effect on their name keeps it for their whole turn, with their darts' own effects in between. Off by default
```

- [ ] **Step 2: README, `gameon`, `next_player` and the fallback**

Replace:

```markdown
- **`gameon`**: At the start of each player's turn when there is neither an effect for the player nor a `next_player` effect, and whenever nothing else matches (the default fallback effect)
```

with:

```markdown
- **`gameon`**: At the start of each player's turn when there is neither an effect for the player nor a `next_player` effect, and whenever nothing else matches (the default fallback effect). With *Keep the player's effect between darts* on, a dart that matches nothing brings back the effect the turn started with instead
```

Replace:

```markdown
The `next_player` trigger is made for this. It plays at the start of the turn of every player who has no effect of their own, and the name stays up until the first dart's effect, or `gameon`, takes over.
```

with:

```markdown
The `next_player` trigger is made for this. It plays at the start of the turn of every player who has no effect of their own, and the name stays up until the first dart's effect, or `gameon`, takes over. With *Keep the player's effect between darts* on, it comes back after every dart that has no effect of its own, for the rest of the turn.
```

Replace:

```markdown
- **Fallback Logic**: Falls back to `gameon` effect if no specific trigger matches
```

with:

```markdown
- **Fallback Logic**: Falls back to `gameon` effect if no specific trigger matches, or, with *Keep the player's effect between darts* on, to the effect the turn started with
```

- [ ] **Step 3: CHANGELOG**

Under `## [Unreleased]` › `### Added`, after the bullet that starts `- **WLED** shows whose turn it is.`, add:

```markdown
- **WLED** can keep a player's effect on for their whole turn. With the new option *Keep the player's effect between darts*, a dart that sets off no effect of its own brings back the effect the turn started with, instead of `gameon`: the player's own, their team's, `next_player` or `bot_throw`. Each player can have a colour of their own that stays on while they throw, with their darts' own effects in between. A turn keeps the one effect it started with, also where there are several to pick from, and with *Don't restart a running effect* on, an effect that is still showing isn't sent again. The option is off until you switch it on, so nothing changes by itself. Checked headless, with WLED's match code driven through turns of players with and without effects of their own, a bot, an online opponent, a corrected dart and a won leg: with the option off it sent exactly what it sent before
  - Contributed by @vert0r ([#267](https://github.com/creazy231/tools-for-autodarts/pull/267))
```

- [ ] **Step 4: Check the docs read right**

```bash
cd $WT && grep -n "Keep the player's effect between darts" README.md CHANGELOG.md && git diff --stat main -- README.md CHANGELOG.md
```

Expected: four README lines and one CHANGELOG line, plus the `Contributed by @vert0r` line under it.

- [ ] **Step 5: Commit**

```bash
cd $WT && git add README.md CHANGELOG.md && git commit -F - <<'EOF'
docs: Keep the player's effect between darts in the README and the changelog, contributed by @vert0r

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

### Task 5: Review, land in one step, check in the dev Chrome

**Files:**
- Modify (only if the live check finds something): the files of Tasks 2–4.

**Interfaces:**
- Consumes: branch `merge/pr-267`.
- Produces: `main` at the branch's tip, with `23912857` in its history.

- [ ] **Step 1: Whole-branch review** with superpowers:requesting-code-review, the range `main..merge/pr-267`. Fix what it finds in follow-up commits on the branch, and re-run Task 2's harness after any runtime fix.

- [ ] **Step 2: Make sure landing strands no match**

```bash
curl -s --max-time 5 http://127.0.0.1:9222/json/list | python3 -c "import json,sys; [print(t['url']) for t in json.load(sys.stdin) if t['type']=='page']"
```

Expected: no `/matches/` or `/lobby/` page. If there is one, don't land: hand over with the branch ready.

- [ ] **Step 3: Land**

```bash
git -C $REPO merge --ff-only merge/pr-267 && git -C $REPO log --oneline -7
git -C $REPO merge-base --is-ancestor 23912857a5c1f01706729d9bdd2bca42d28004ea main && echo "PR head in main"
```

- [ ] **Step 4: The dev build has it**

```bash
sleep 20; ls -la $REPO/.output/chrome-mv3-dev/content-scripts/match.js; grep -c keepTurnEffect $REPO/.output/chrome-mv3-dev/content-scripts/match.js $REPO/.output/chrome-mv3-dev/content-scripts/content.js
```

Expected: a fresh mtime, and a count above 0 in both. A template-only SFC change can stay stale (the `wxt-dev-watcher-stops-silently` memory). If `content.js` lacks the row's key, `touch $REPO/components/Settings/Wled.vue` and check again.

- [ ] **Step 5: The row in the dev Chrome, in a tab of my own** (the `use-the-yarn-dev-browser`, `opening-the-tools-settings-panel` and `other-claude-sessions-share-the-dev-chrome` memories):
  1. Save `wledFx` from the service worker's `config-2-0-0`, and `adt:last-visited-url` and `urlstatus`.
  2. Open WLED's settings. Check the row's title and description in English, German and Dutch (`localStorage["autodarts.settings.language"]`, reload my tab).
  3. Switch it on: `wledFx.keepTurnEffect` reads `true`. Switch it off: it reads `false`.
  4. Put `wledFx` back as it was, key by key, and the other keys too.
  5. Close my tab.

- [ ] **Step 6: Record the check** in the changelog bullet only if Step 5 passed: append ` Checked in Chrome: the switch in WLED's options, in English, German and Dutch, stored on and off` to its first line's last sentence's end, and commit on `main`:

```bash
cd $REPO && git add CHANGELOG.md && git commit -F - <<'EOF'
docs: the changelog says where Keep the player's effect between darts was checked

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

- [ ] **Step 7: Clean up**

```bash
git -C $REPO worktree remove $WT && git -C $REPO branch -d merge/pr-267
```

- [ ] **Step 8: Memory and hand-over.** Update `pr-267-wled-player-effect-through-visit.md`: merged locally, not pushed; the force-push recipe if @vert0r pushes again. Hand over in German, with a short comment for #267 to post after the push.
