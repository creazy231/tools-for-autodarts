# WLED shows whose turn it is: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `next_player` WLED trigger, and `{player}` / `{player_ascii}` in JSON API and URL effects, so a matrix can show the name of whoever is up.

**Architecture:** Three new pure functions do the work:
- `wledRequest(effect, player)` in the new `utils/wled-request.ts` builds what an effect sends: placeholders filled in, `{player_ascii}` made, and a key for *Don't restart a running effect*.
- `turnStartEffect(...)` in `utils/wled.ts` picks a turn's effect.

`entrypoints/match.content/wled.ts` keeps the turn's player, compares request keys, and gives the settings a `tryEffect` that always sends. The transport stays `no-cors`.

**Tech Stack:** TypeScript, Vue 3.4 `<script setup>`, WXT 0.20; tsx + `node:test` for the pure modules; esbuild + linkedom for the real content-script module; the yarn dev Chrome over CDP `:9222`; `curl` against the WLED matrix.

**Spec:** `docs/superpowers/specs/2026-10-09-wled-player-name-design.md`

## Global Constraints

- **Placeholders:**
  - exactly `{player}` and `{player_ascii}`, case-sensitive; anything else in braces is left as it is;
  - JSON API effects: in the body, escaped with `JSON.stringify(v).slice(1, -1)`;
  - URL effects: in the link, with `encodeURIComponent`;
  - preset effects and a JSON API effect's address: never.
- **`{player_ascii}`:** NFC; then ä ae, ö oe, ü ue, Ä Ae, Ö Oe, Ü Ue, ß ss, ẞ SS, æ ae, Æ Ae, œ oe, Œ Oe, ø o, Ø O, ł l, Ł L, đ d, Đ D, ð d, Ð D, þ th, Þ Th, ı i; then NFKD without `\p{M}`; whitespace runs become one space; anything outside `\x20-\x7E` is dropped and spaces collapsed again; trimmed; at most 32 characters, trimmed again.
- **Precedence at a turn's start:** `bot_throw` (bot) > the player's own name effect > the team's > `next_player` > `gameon`. A win from `gameDataProcessor` and `other` still override afterwards.
- **Transport:** `mode: "no-cors"` for every type, exactly the request options of today (URL GET; preset and JSON API POST; `cache: "no-cache"`, `credentials: "omit"`; JSON API with `Content-Type: application/json` and its body).
- **Don't restart:** compares `` `${method} ${url}\n${body ?? ""}` ``; tries from the settings ignore it.
- **No stored-shape change:** no migration, `defaultConfig` untouched, no manifest or permission change.
- **Copy, verbatim:**
  - `triggers.wled.nextPlayer`:
    - en "The next player is up and has no effect of their own"
    - de "Der nächste Spieler ist dran und hat keinen eigenen Effekt"
    - nl "De volgende speler is aan de beurt en heeft geen eigen effect"
  - `wled.type.hints.url`:
    - en "Calls a link: a WLED API call such as /win/PL=1, or anything else. <code>{player}</code> in it becomes the name of the player whose turn it is, and <code>{player_ascii}</code> the same name in plain letters."
    - de "Ruft einen Link auf: einen WLED-API-Aufruf wie /win/PL=1 oder etwas ganz anderes. <code>{player}</code> darin wird zum Namen des Spielers, der dran ist, und <code>{player_ascii}</code> zum selben Namen in einfachen Buchstaben."
    - nl "Roept een link aan: een WLED-API-aanroep zoals /win/PL=1, of iets heel anders. <code>{player}</code> daarin wordt de naam van de speler die aan de beurt is, en <code>{player_ascii}</code> dezelfde naam in gewone letters."
  - `wled.type.hints.api`:
    - en "Sends a JSON body to WLED's /json endpoint. <code>{player}</code> in it becomes the name of the player whose turn it is, and <code>{player_ascii}</code> the same name in plain letters, which a matrix's font can draw."
    - de "Sendet einen JSON-Body an den /json-Endpunkt von WLED. <code>{player}</code> darin wird zum Namen des Spielers, der dran ist, und <code>{player_ascii}</code> zum selben Namen in einfachen Buchstaben, die die Schrift einer Matrix zeichnen kann."
    - nl "Stuurt een JSON-body naar het /json-eindpunt van WLED. <code>{player}</code> daarin wordt de naam van de speler die aan de beurt is, en <code>{player_ascii}</code> dezelfde naam in gewone letters, die het lettertype van een matrix kan tekenen."
  - `wled.samplePlayer`: en "Player", de "Spieler", nl "Speler" (the site's own words).
- **Browser:**
  - Only the yarn dev Chrome (CDP `:9222`), in a tab of my own; `ListAgents` and `/json/list` before any source edit while it runs.
  - Back up `config-2-0-0` before writing it, and restore only it.
  - The WLED matrix's `/json/state` is saved before and put back after.
- **Checks:**
  - `yarn compile` adds no error to the baseline, which is measured on this branch's base;
  - `yarn lint --base main` adds nothing;
  - `yarn i18n:check` passes;
  - `yarn build` and `yarn build:firefox` pass.
- **Commits:** on `feat/wled-player-name`, one per task; merged into `main` locally with a merge commit; never pushed.

## Review Focus

1. **A name with `"`, `\` or a newline in it.** The body must stay valid JSON and show the name as typed. Pinned in Task 1 (`JSON.parse(body).seg[0].n` equals the name).
2. **Two players in a row with no name effect, and nothing sent between their turns** (no `gameon` effect, no dart effects). Each must get their own name. Pinned in Task 3: two turn starts back to back must give two sends.
3. **A JSON API effect without placeholders.** Its body must go out byte for byte as today. Pinned in Task 1 (`body === json_api`, `init` deep-equal to today's options).
4. **Pressing the play button or Test twice.** Both presses must send, with *Don't restart* on. Pinned in Task 3: `tryEffect` twice gives two sends.
5. **Leaving the match.** An `idle` effect with `{player}` must send it empty, not the last player's name. Pinned in Task 3: after teardown, the `idle` body has `"n":""`.

---

### Task 1: The request an effect sends (`utils/wled-request.ts`)

**Files:**
- Create: `utils/wled-request.ts`
- Test: `$SCR/tests/wled-request.test.mts` (scratchpad; the repo has no test framework)

`$SCR` is `/private/tmp/claude-501/-Volumes-WD-BLACK-PROJECTS-Autodarts-autodarts-tools-wxt/e0e21cb1-9a84-4e85-970e-1a705973db35/scratchpad`. Tests run with the repo as cwd so tsx applies the tsconfig's `@/` paths: `cd $REPO && node_modules/.bin/tsx --test $SCR/tests/<file>`.

**Interfaces:**
- Produces:
  - `export interface WledRequest { url: string; init: RequestInit; key: string }`
  - `export function asciiName(name: string): string`
  - `export function fillPlaceholders(text: string, player: string, escape: (value: string) => string): string`
  - `export function wledRequest(effect: IWled, player: string): WledRequest`

- [ ] **Step 1: Write the failing test**

```ts
// $SCR/tests/wled-request.test.mts
import assert from "node:assert/strict";
import { test } from "node:test";

// utils/storage.ts defines its items with WXT's `storage` when it loads.
const item = () => ({ getValue: async () => undefined, setValue: async () => {}, watch: () => () => {}, removeValue: async () => {} });
(globalThis as any).storage = { defineItem: item };

const REPO = "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt";
const { asciiName, fillPlaceholders, wledRequest } = await import(`${REPO}/utils/wled-request.ts`);
const { WledType } = await import(`${REPO}/utils/storage.ts`);

const effect = (over: object) => ({ name: "", type: WledType.API, url: "http://wled/json/state", preset: "0", json_api: "", enabled: true, triggers: [], ...over });

test("asciiName spells out umlauts and ß, also when typed decomposed", () => {
  assert.equal(asciiName("Jürgen"), "Juergen");
  assert.equal(asciiName("Jürgen"), "Juergen");
  assert.equal(asciiName("ÄÖÜ äöü ß ẞ"), "AeOeUe aeoeue ss SS");
});

test("asciiName drops other marks and spells out the letters NFKD keeps", () => {
  assert.equal(asciiName("José Núñez"), "Jose Nunez");
  assert.equal(asciiName("Søren Ærø"), "Soren Aero");
  assert.equal(asciiName("Łukasz Đorđe Þór ı"), "Lukasz Dorde Thor i");
  assert.equal(asciiName("ﬁnn Ｍａｘ"), "finn Max");
});

test("asciiName keeps ASCII punctuation, drops the rest, tidies spaces", () => {
  assert.equal(asciiName("O'Neil \"Q\" #1"), "O'Neil \"Q\" #1");
  assert.equal(asciiName("🎯 Anna 🎯 Lena"), "Anna Lena");
  assert.equal(asciiName("  Max\t\nMuster  "), "Max Muster");
  assert.equal(asciiName("🎯🎯"), "");
  assert.equal(asciiName("李雷"), "");
});

test("asciiName cuts at 32 characters without a trailing space", () => {
  assert.equal(asciiName("A".repeat(40)), "A".repeat(32));
  assert.equal(asciiName(`${"a".repeat(31)} b`), "a".repeat(31));
});

test("fillPlaceholders fills both, leaves anything else, takes $ literally", () => {
  const raw = (v: string) => v;
  assert.equal(fillPlaceholders("{player}|{player_ascii}", "Jürgen", raw), "Jürgen|Juergen");
  assert.equal(fillPlaceholders("{Player} {foo} {player", "X", raw), "{Player} {foo} {player");
  assert.equal(fillPlaceholders("<{player}>", "$& $1 $$", raw), "<$& $1 $$>");
  assert.equal(fillPlaceholders("no placeholders", "X", raw), "no placeholders");
});

test("a JSON API effect gets the name escaped for a JSON string", () => {
  const name = "Jo \"J\" \\ D\nE";
  const request = wledRequest(effect({ json_api: "{\"seg\":[{\"n\":\"{player}\"}]}" }), name);
  assert.equal(JSON.parse(request.init.body).seg[0].n, name);
  assert.equal(wledRequest(effect({ json_api: "{\"n\":\"{player_ascii}\"}" }), "Jürgen").init.body, "{\"n\":\"Juergen\"}");
});

test("a JSON API effect without placeholders sends what it sends today", () => {
  const json_api = "{\"on\":true,\"bri\":255,\"n\":\"{x}\"}";
  const request = wledRequest(effect({ json_api }), "Anna");
  assert.equal(request.url, "http://wled/json/state");
  assert.deepEqual(request.init, {
    mode: "no-cors",
    method: "POST",
    cache: "no-cache",
    credentials: "omit",
    headers: { "Content-Type": "application/json" },
    body: json_api,
  });
});

test("a URL effect gets the names URI-encoded, a preset effect none", () => {
  const url = wledRequest(effect({ type: WledType.URL, url: "http://h/hook?p={player}&a={player_ascii}" }), "Jürgen Ä&B");
  assert.equal(url.url, "http://h/hook?p=J%C3%BCrgen%20%C3%84%26B&a=Juergen%20Ae%26B");
  assert.deepEqual(url.init, { mode: "no-cors", method: "GET", cache: "no-cache", credentials: "omit" });

  assert.equal(wledRequest(effect({ type: WledType.PRESET, url: "wled.local", preset: "7" }), "X").url, "http://wled.local/win/PL=7");
  assert.equal(wledRequest(effect({ type: WledType.PRESET, url: "http://w/", preset: "7" }), "X").url, "http://w/win/PL=7");
  assert.equal(wledRequest(effect({ type: WledType.PRESET, url: "http://w", preset: "7" }), "X").init.method, "POST");
});

test("the key is the request: a name in it tells players apart, none doesn't", () => {
  const api = effect({ json_api: "{\"n\":\"{player}\"}" });
  assert.equal(wledRequest(api, "Anna").key, wledRequest(api, "Anna").key);
  assert.notEqual(wledRequest(api, "Anna").key, wledRequest(api, "Lena").key);
  const plain = effect({ type: WledType.URL, url: "http://w/win/PL=3" });
  assert.equal(wledRequest(plain, "Anna").key, wledRequest(plain, "Lena").key);
  assert.equal(wledRequest(effect({ json_api: "" }), "Anna").init.body, "");
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd $REPO && node_modules/.bin/tsx --test $SCR/tests/wled-request.test.mts`
Expected: FAIL, `Cannot find module '…/utils/wled-request.ts'`.

- [ ] **Step 3: Write the module**

```ts
// utils/wled-request.ts
import { type IWled, WledType } from "@/utils/storage";

/**
 * What an effect sends, and `key`: the same for the same request. *Don't
 * restart a running effect* compares keys, so the same effect with another
 * player's name in it counts as new, and two effects that send the very same
 * thing count as one.
 */
export interface WledRequest {
  url: string;
  init: RequestInit;
  key: string;
}

/** The longest segment name an ESP8266 keeps (an ESP32 keeps 64). */
const ASCII_NAME_LENGTH = 32;

/**
 * Letters written out before the marks come off the rest: the German ones the
 * way German spells them without dots, and the ones NFKD doesn't take apart.
 */
const SPELLED_OUT: Record<string, string> = {
  ä: "ae", ö: "oe", ü: "ue", Ä: "Ae", Ö: "Oe", Ü: "Ue", ß: "ss", ẞ: "SS",
  æ: "ae", Æ: "Ae", œ: "oe", Œ: "Oe", ø: "o", Ø: "O",
  ł: "l", Ł: "L", đ: "d", Đ: "D", ð: "d", Ð: "D", þ: "th", Þ: "Th", ı: "i",
};

/** `{player}` and `{player_ascii}`, the names an effect can carry. */
const PLACEHOLDER = /\{(player|player_ascii)\}/g;

/**
 * A name in what WLED's fonts draw, ASCII 32–126: "Jürgen" is "Juergen",
 * "José" is "Jose", and emoji go. Composed first, so an "ü" typed as "u" and
 * a separate diaeresis is still spelled out.
 */
export function asciiName(name: string): string {
  return name
    .normalize("NFC")
    .replace(/[äöüÄÖÜßẞæÆœŒøØłŁđĐðÐþÞı]/g, letter => SPELLED_OUT[letter])
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/ {2,}/g, " ")
    .trim()
    .slice(0, ASCII_NAME_LENGTH)
    .trimEnd();
}

/**
 * `text` with `{player}` and `{player_ascii}` filled in for `player`, each
 * value through `escape` first, as its place in the text needs it.
 */
export function fillPlaceholders(text: string, player: string, escape: (value: string) => string): string {
  return text.replace(PLACEHOLDER, (_, name: string) => escape(name === "player" ? player : asciiName(player)));
}

/** A value as it goes between a JSON string's quotes. */
function jsonString(value: string): string {
  return JSON.stringify(value).slice(1, -1);
}

/**
 * What `effect` sends, with `player` in its placeholders: in a JSON API
 * effect's JSON, escaped for a JSON string, and in a URL effect's link,
 * URI-encoded. A preset effect has none.
 */
export function wledRequest(effect: IWled, player: string): WledRequest {
  const method = effect.type === WledType.URL ? "GET" : "POST";
  let url = effect.url;
  let body: string | undefined;
  if (effect.type === WledType.PRESET) {
    url = (effect.url.startsWith("http") ? "" : "http://")
      + effect.url
      + (effect.url.endsWith("/") ? "" : "/")
      + "win/PL=" + effect.preset;
  } else if (effect.type === WledType.URL) {
    url = fillPlaceholders(effect.url, player, encodeURIComponent);
  } else if (effect.type === WledType.API) {
    body = effect.json_api && fillPlaceholders(effect.json_api, player, jsonString);
  }

  return {
    url,
    init: {
      // A browser sends a `no-cors` body as text/plain, whatever the header
      // says, and WLED reads it as JSON all the same: the /json handler it
      // ships (src/dependencies/json/AsyncJson-v6.h) doesn't look at the type,
      // from 0.13 to 16. `cors` would put a preflight in front of every effect
      // and stop the ones sent to a server that doesn't answer one.
      mode: "no-cors",
      method,
      cache: "no-cache",
      credentials: "omit",
      ...(effect.type === WledType.API && {
        headers: { "Content-Type": "application/json" },
        body,
      }),
    },
    key: `${method} ${url}\n${body ?? ""}`,
  };
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `cd $REPO && node_modules/.bin/tsx --test $SCR/tests/wled-request.test.mts`
Expected: all 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add utils/wled-request.ts
git commit -m "feat: WLED's requests are built in one place, with {player} and {player_ascii} filled in"
```

### Task 2: A turn's effect (`turnStartEffect` in `utils/wled.ts`)

**Files:**
- Modify: `utils/wled.ts` (a new export after `gameDataProcessor`; one type import)
- Test: `$SCR/tests/turn-start.test.mts`

**Interfaces:**
- Produces: `export function turnStartEffect(names: readonly string[], isBot: boolean, effects: readonly IWled[] | undefined, triggerPresentCB: (trigger: string) => boolean): string | IWled`

- [ ] **Step 1: Write the failing test**

```ts
// $SCR/tests/turn-start.test.mts
import assert from "node:assert/strict";
import { test } from "node:test";

const REPO = "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt";
const { turnStartEffect } = await import(`${REPO}/utils/wled.ts`);

const fx = (name: string, triggers: string[], enabled = true) => ({ name, type: "URL", url: `http://w/${name}`, preset: "0", json_api: "", enabled, triggers });
const creazy = fx("creazy", [ "creazy" ]);
const max = fx("max", [ "max_muster" ]);
const team = fx("team", [ "team red" ]);
const off = fx("off", [ "anna" ], false);
const EFFECTS = [ creazy, max, team, off ];
const withNext = (t: string) => t === "next_player";
const without = () => false;

test("a bot gets bot_throw, even with an effect on its name", () => {
  assert.equal(turnStartEffect([ "creazy" ], true, EFFECTS, withNext), "bot_throw");
});

test("the player's own effect comes first, as typed or with underscores", () => {
  assert.equal(turnStartEffect([ "creazy" ], false, EFFECTS, withNext), creazy);
  assert.equal(turnStartEffect([ "Max Muster" ], false, EFFECTS, withNext), max);
});

test("then the team's, then next_player, then gameon", () => {
  assert.equal(turnStartEffect([ "Lena", "Team Red" ], false, EFFECTS, withNext), team);
  assert.equal(turnStartEffect([ "creazy", "Team Red" ], false, EFFECTS, withNext), creazy);
  assert.equal(turnStartEffect([ "Lena" ], false, EFFECTS, withNext), "next_player");
  assert.equal(turnStartEffect([ "Lena" ], false, EFFECTS, without), "gameon");
  assert.equal(turnStartEffect([], false, undefined, withNext), "next_player");
});

test("a switched-off effect on the name doesn't count", () => {
  assert.equal(turnStartEffect([ "Anna" ], false, EFFECTS, withNext), "next_player");
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd $REPO && node_modules/.bin/tsx --test $SCR/tests/turn-start.test.mts`
Expected: FAIL, `turnStartEffect is not a function`.

- [ ] **Step 3: Add the function**

In `utils/wled.ts`, the imports become:
```ts
import { type IGameData } from "@/utils/game-data-storage";
import { type IWled } from "@/utils/storage";
```
and after `gameDataProcessor`:
```ts
/**
 * What a visit starts with, before its first dart: `bot_throw` for a bot;
 * otherwise the effect of the first of `names` that has one (the player's,
 * then their team's, each as typed and with underscores for its spaces); then
 * `next_player`, which can show whoever is up; and `gameon` when there is
 * none of those.
 */
export function turnStartEffect(
  names: readonly string[],
  isBot: boolean,
  effects: readonly IWled[] | undefined,
  triggerPresentCB: (trigger: string) => boolean,
): string | IWled {
  if (isBot) {
    console.log("Autodarts Tools: WLED: Bot player detected");
    return "bot_throw";
  }

  for (const name of names) {
    const lower = name.toLowerCase();
    const underscored = lower.replace(/\s+/g, "_");
    const nameEffects = effects?.filter(
      effect =>
        effect.enabled
        && effect.triggers
        && (effect.triggers.includes(lower)
          || effect.triggers.includes(underscored)),
    ) ?? [];
    if (!nameEffects.length) continue;
    console.log(`Autodarts Tools: WLED: Found player name effect for ${underscored}`);
    return nameEffects[Math.floor(Math.random() * nameEffects.length)];
  }

  return triggerPresentCB("next_player") ? "next_player" : "gameon";
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `cd $REPO && node_modules/.bin/tsx --test $SCR/tests/turn-start.test.mts`
Expected: all 4 tests pass. Then run Task 1's test again: still green.

- [ ] **Step 5: Commit**

```bash
git add utils/wled.ts
git commit -m "feat: WLED's next_player trigger, between a player's own effect and gameon"
```

### Task 3: The match sends the turn's player (`entrypoints/match.content/wled.ts`)

**Files:**
- Modify: `entrypoints/match.content/wled.ts` (imports; a `turnPlayer` beside `announcedWin`; `wledFxOnRemove`; the turn block of `processGameData`; the comment in `setEffectByTrigger`; `setEffect` and the new `tryEffect` and `send` replacing `currentEffect` and the inline fetch)
- Test: `$SCR/wled-int/` — `build.mjs` (esbuild), `run.mjs` (the scenario), `imports-shim.ts`, `head/wled.ts` (`git show main:entrypoints/match.content/wled.ts`)

**Interfaces:**
- Consumes: `wledRequest`, `WledRequest` (Task 1); `turnStartEffect` (Task 2); `turnNames(match)` (utils/team-calls.ts, unchanged).
- Produces:
  - `export async function setEffect(effect: IWled, wait?: boolean): Promise<void>`, with the same signature;
  - `export async function tryEffect(effect: IWled, player: string): Promise<void>`, used by Task 4.

- [ ] **Step 1: Write the harness and the scenario**

`$SCR/wled-int/imports-shim.ts`:
```ts
export { WledType } from "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/utils/storage";
```

`$SCR/wled-int/build.mjs` bundles the file named by `WLED_SRC` for node, `@/` resolved to the repo:
```js
import { build } from "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/node_modules/esbuild/lib/main.js";
import path from "node:path";

const REPO = "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt";
const HERE = path.dirname(new URL(import.meta.url).pathname);
const src = process.env.WLED_SRC ?? `${REPO}/entrypoints/match.content/wled.ts`;

await build({
  stdin: { contents: `export * from ${JSON.stringify(src)};`, resolveDir: HERE, loader: "ts" },
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: `${HERE}/out/wled.mjs`,
  logLevel: "warning",
  plugins: [ {
    name: "aliases",
    setup(b) {
      b.onResolve({ filter: /^@\// }, async args => b.resolve(`${REPO}/${args.path.slice(2)}`, { kind: args.kind, resolveDir: REPO }));
      b.onResolve({ filter: /^#imports$/ }, () => ({ path: `${HERE}/imports-shim.ts` }));
    },
  } ],
});
console.log("built", src);
```

`$SCR/wled-int/run.mjs` drives the real module: an in-memory `storage`, a match URL, a recorded `fetch`, game-data frames 350 ms apart (the settler waits 200 ms). It prints each send and fails on the first difference:
```js
import assert from "node:assert/strict";

const stores = new Map();
globalThis.storage = {
  defineItem(key, opts = {}) {
    const watchers = new Set();
    return {
      getValue: async () => (stores.has(key) ? structuredClone(stores.get(key)) : structuredClone(opts.fallback ?? opts.defaultValue ?? null)),
      async setValue(value) {
        const old = stores.get(key);
        stores.set(key, structuredClone(value));
        for (const cb of watchers) queueMicrotask(() => cb(structuredClone(value), structuredClone(old)));
      },
      watch(cb) { watchers.add(cb); return () => watchers.delete(cb); },
      removeValue: async () => stores.delete(key),
    };
  },
};
globalThis.browser = { runtime: { getURL: p => p, sendMessage: async () => undefined, id: "test" }, storage: { local: { get: async () => ({}), set: async () => {} } } };
const MATCH = "0199c7a0-1111-7000-8000-000000000001";
globalThis.window = globalThis;
globalThis.location = { href: `https://play.autodarts.com/matches/${MATCH}` };
const sends = [];
globalThis.fetch = async (url, init) => { sends.push({ method: init.method, url, body: init.body ?? null, mode: init.mode }); return new Response(null); };
const quiet = !process.env.DEBUG;
if (quiet) { console.log = () => {}; console.info = () => {}; }

const wled = await import("./out/wled.mjs");
// The bundle's storage items are its own, so the scenario writes the same
// entries through the stand-in, by the keys utils/storage.ts and
// utils/game-data-storage.ts define them under.
const config = globalThis.storage.defineItem(CONFIG_KEY);
const gameData = globalThis.storage.defineItem(GAME_DATA_KEY);
```
`CONFIG_KEY` and `GAME_DATA_KEY` are read from `utils/storage.ts` (`AutodartsToolsConfig`) and `utils/game-data-storage.ts` (`AutodartsToolsGameData`) when the file is written, exactly as they are spelled there, `local:` prefix and all.

The scenario itself, with `fx(name, type, url, triggers, json_api)` building `IWled`s and `frame({ player, throws, gameWinner, activated })` building a one-leg X01 match of Anna, Jürgen, creazy and a bot (`cpuPPR: 60`):

| # | Config / frame | Expected sends since the last row |
|---|---|---|
| A | effects: `creazy` URL `/win/PL=11` on `creazy`; `next` API `/json/state` `{"seg":[{"id":0,"n":"{player_ascii}"}]}` on `next_player`; bot URL `/win/PL=12` on `bot_throw`; gameon URL `/win/PL=10`; gameshot URL `/win/PL=13`; idle API `/json/state` `{"n":"{player}"}` on `idle`; `onlyOnce` on; `wledFx()` | none |
| 1 | Anna, no darts | POST `/json/state` body `…"n":"Anna"…` |
| 2 | Jürgen, no darts (nothing between) | POST `/json/state` body `…"n":"Juergen"…` |
| 3 | Jürgen, `S5` | GET `/win/PL=10` |
| 4 | creazy, no darts | GET `/win/PL=11` |
| 5 | bot, no darts | GET `/win/PL=12` |
| 6 | Anna, no darts | POST `…"n":"Anna"…` |
| 7 | Anna, no darts, `activated: -1` (acted on, same request) | none |
| 8 | Anna, `T20` with `gameWinner: 0` | GET `/win/PL=13` |
| 9 | `tryEffect(next, "Lena")` twice | two POSTs `…"n":"Lena"…` |
| 10 | `wledFxOnRemove()` | POST `/json/state` body `{"n":""}` |
| B | the same effects without `next`; `wledFx()` again | none |
| 11 | Lena (a fifth player), no darts | GET `/win/PL=10` |

(Preset effects aren't in it: the test of Task 1 covers their address. Every URL effect here is fetched with GET and every JSON API effect posted.)

- [ ] **Step 2: Run it against `main`'s file to see it fail**

```bash
mkdir -p $SCR/wled-int/head && git show main:entrypoints/match.content/wled.ts > $SCR/wled-int/head/wled.ts
cd $SCR/wled-int && WLED_SRC=$SCR/wled-int/head/wled.ts node build.mjs && node run.mjs
```
Expected: FAIL at row 1. `main` sends `gameon` (`/win/PL=10`), since it has no `next_player`. `main` has no `tryEffect` either, so row 9 is skipped there, and the run says so.

- [ ] **Step 3: Change `entrypoints/match.content/wled.ts`**

Imports: `wledRequest` and `WledRequest`, `turnStartEffect`; `WledType` and `#imports` go:
```ts
import { gameDataProcessor, turnStartEffect } from "@/utils/wled";
import { type WledRequest, wledRequest } from "@/utils/wled-request";
import { winId } from "@/utils/win";
```

After `announcedWin`:
```ts
/**
 * Whose name `{player}` and `{player_ascii}` stand for: the player up in the
 * last update acted on, so an effect a board event sets between two updates
 * gets it too. Empty where there is no match (a lobby, a board page), and once
 * the match is left.
 */
let turnPlayer = "";
```

In `wledFxOnRemove`, before `setEffectByTrigger("idle")`:
```ts
  announcedWin = undefined;
  turnPlayer = "";
```

In `processGameData`, right after the `!gameData.match || !gameData.match.turns?.length` guard:
```ts
  const names = turnNames(gameData.match);
  turnPlayer = names[0] ?? "";
```
and the turn block becomes:
```ts
  // gameon is the default effect to play when no other event happened
  let nextEffect: string | IWled = "gameon";

  // A visit that has just started: the player's own effect, or the one that
  // shows whoever is up (utils/wled.ts).
  if (gameData.match.turns[0].throws.length === 0) {
    const currentPlayer = gameData.match.players?.[gameData.match.player];
    nextEffect = turnStartEffect(names, currentPlayer?.cpuPPR !== null, config.wledFx.effects, isTriggerPresent);
  }
```

In `setEffectByTrigger`'s comment: "The settings' send and Test buttons go to tryEffect, so they still work."

`currentEffect`, `setEffect` and the fetch at the end of the file become:
```ts
/** What was sent last, for *Don't restart a running effect* (`WledRequest.key`). */
let lastRequest: string | undefined;

export async function setEffect(effect: IWled, wait: boolean = false) {
  if (!config)
    config = await AutodartsToolsConfig.getValue();

  if (!effect.url) {
    console.info("Autodarts Tools: WLED: effect", effect.name, "doesn't have an url");
    return;
  }
  const request = wledRequest(effect, turnPlayer);
  if (config.wledFx.onlyOnce && request.key === lastRequest) {
    console.info("Autodarts Tools: WLED: didn't fetch", request.url, "because the effect is already active");
    return;
  }
  lastRequest = request.key;
  await send(request, wait);
}

/**
 * An effect tried in the settings, with its play button or Test. There is no
 * turn there, so `player` stands in for the placeholders, and it is sent on
 * every press: *Don't restart a running effect* is about the effects a game
 * sets off.
 */
export async function tryEffect(effect: IWled, player: string): Promise<void> {
  if (!effect.url) return;
  await send(wledRequest(effect, player));
}

async function send(request: WledRequest, wait: boolean = false): Promise<void> {
  console.info("Autodarts Tools: WLED: fetching", request.url);

  const controller = new AbortController();
  const init: RequestInit = { ...request.init, signal: controller.signal };
  if (wait) {
    try {
      // Use setTimeout to ensure the fetch doesn't block or interfere with page state
      // This makes it truly fire-and-forget
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      await fetch(request.url, init);
      clearTimeout(timeoutId);
    } catch (e) {
      const error = e as Error;
      if (error.name !== "AbortError") {
        console.log("Autodarts Tools: WLED: Request failed (non-critical)", error);
      }
    }
  } else {
    setTimeout(() => {
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      fetch(request.url, init)
        .then(() => {
          clearTimeout(timeoutId);
          // Success - no need to do anything with no-cors response
        })
        .catch((e) => {
          const error = e as Error;
          clearTimeout(timeoutId);
          // Silently ignore errors to prevent interfering with game state
          if (error.name !== "AbortError") {
            console.log("Autodarts Tools: WLED: Request failed (non-critical)", error);
          }
        });
    }, 0);
  }
}
```

- [ ] **Step 4: Run the scenario on the changed file, and the unit tests again**

```bash
cd $SCR/wled-int && node build.mjs && node run.mjs
cd $REPO && node_modules/.bin/tsx --test $SCR/tests/*.test.mts
```
Expected: every row as in the table; unit tests green. Then check a mutant: with `request.key === lastRequest` changed back to an identity comparison of the effect, row 2 must fail.

- [ ] **Step 5: Commit**

```bash
git add entrypoints/match.content/wled.ts
git commit -m "feat: WLED fills in whose turn it is, and Don't restart a running effect compares what is sent"
```

### Task 4: The settings (`components/Settings/Wled.vue`, catalogs, trigger hints)

**Files:**
- Modify: `components/Settings/Wled.vue` (imports; `TYPE_HINTS` → keys + `PLACEHOLDERS`; the hint `<p>`; `sendEffect`; the play button; `testDraft`)
- Modify: `utils/trigger-catalog.ts` (WLED list, after `gameon`)
- Modify: `locales/{en,de,nl}/triggers.ts` (`wled.nextPlayer`), `locales/{en,de,nl}/wled.ts` (`type.hints.url`, `type.hints.api`, `samplePlayer`)

**Interfaces:**
- Consumes: `tryEffect(effect, player)` (Task 3); `tokenAccount(token)` (utils/team-room.ts); `getAuthToken()` (utils/helpers.ts).

- [ ] **Step 1: The catalogs and the trigger hint**

`utils/trigger-catalog.ts`, in `wled:` after the `gameon` line:
```ts
    { trigger: "next_player", descriptionKey: "triggers.wled.nextPlayer" },
```
`locales/en/triggers.ts`, `wled:` after `gameon`: `nextPlayer: "The next player is up and has no effect of their own",`; German and Dutch as in *Global Constraints*.

`locales/en/wled.ts`, `type.hints` becomes:
```ts
    /** `player` and `player_ascii` are the placeholders as they are typed: params, so no translation can change them. */
    hints: {
      preset: "Plays a preset saved on your WLED device, picked from its own list.",
      url: "Calls a link: a WLED API call such as /win/PL=1, or anything else. <code>{player}</code> in it becomes the name of the player whose turn it is, and <code>{player_ascii}</code> the same name in plain letters.",
      api: "Sends a JSON body to WLED's /json endpoint. <code>{player}</code> in it becomes the name of the player whose turn it is, and <code>{player_ascii}</code> the same name in plain letters, which a matrix's font can draw.",
    },
```
and after `type`:
```ts
  /** What {player} stands for when an effect is sent from here (its play button, Test) while nobody is signed in. It is shown on the lights. */
  samplePlayer: "Player",
```
German and Dutch as in *Global Constraints*, same keys.

- [ ] **Step 2: `Wled.vue`**

Imports: `setEffect` → `tryEffect`, plus
```ts
import { getAuthToken } from "@/utils/helpers";
import { tokenAccount } from "@/utils/team-room";
```
`TYPE_HINTS` stops being computed text and becomes keys, with the placeholders as params:
```ts
/** The line under the type picker. The URL and JSON API lines name the placeholders, as they are typed. */
const TYPE_HINTS: Record<WledType, MessageKey> = {
  [WledType.PRESET]: "wled.type.hints.preset",
  [WledType.URL]: "wled.type.hints.url",
  [WledType.API]: "wled.type.hints.api",
};

/** The placeholders as they are typed: the same in every language. */
const PLACEHOLDERS = { player: "{player}", player_ascii: "{player_ascii}" };
```
Template:
```vue
          <p class="adt-field-hint">
            <AppTrans :params="PLACEHOLDERS" :path="TYPE_HINTS[newEffect.type]" />
          </p>
```
The play button: `<PlayButton @click="sendEffect(config.wledFx.effects[entry.index])" … />`. `testDraft` calls `sendEffect({ … })`. New method, before `testDraft`:
```ts
/**
 * Sends an effect from here, with its play button or Test. Its `{player}` is
 * the account signed in, as on their own turn, or "Player" signed out.
 */
async function sendEffect(effect: IWled) {
  await tryEffect(effect, tokenAccount(await getAuthToken())?.name ?? t("wled.samplePlayer"));
}
```

- [ ] **Step 3: Check**

```bash
yarn i18n:check
node $SCR/sfc-check.cjs components/Settings/Wled.vue
```
Expected: i18n check passes; `ok components/Settings/Wled.vue`.

- [ ] **Step 4: Commit**

```bash
git add components/Settings/Wled.vue utils/trigger-catalog.ts locales/en/triggers.ts locales/de/triggers.ts locales/nl/triggers.ts locales/en/wled.ts locales/de/wled.ts locales/nl/wled.ts
git commit -m "feat: WLED's settings try an effect with your own name, and name the placeholders"
```

### Task 5: README and changelog

**Files:**
- Modify: `README.md`, the WLED section:
  - *Configuration Options* gets **Don't restart a running effect**;
  - *Game Events* gets `next_player` and a new `gameon` line;
  - *Player-Specific Effects*: a player's effect comes "instead of `next_player` and `gameon`";
  - a new *The player's name in an effect* after the JSON API example, with the matrix effect as a CSV line (address `http://wled-device.local/json/state`) and what its fields do;
  - *Smart Effect Selection*: the order a turn's effect is picked in;
  - *Technical Implementation*: the body goes as `text/plain`, which WLED reads as JSON;
  - *CSV Import Format*: an API line, and a JSON can't hold a `;`.
- Modify: `CHANGELOG.md` `[Unreleased]`:
  - *Added*: the feature;
  - *Changed*: *Don't restart a running effect* compares what is sent;
  - *Fixed*: the play button sends on every press.

- [ ] **Step 1: Write both** (the wording follows the spec's decisions; the CHANGELOG entry says what was checked, after Task 6)
- [ ] **Step 2: Commit**

```bash
git add README.md CHANGELOG.md
git commit -m "docs: WLED's next_player and the player's name in an effect"
```

### Task 6: Verification

- [ ] **Step 1: Static checks**

```bash
yarn compile > $SCR/compile-after.log 2>&1; grep -c "error TS" $SCR/compile-after.log; grep "error TS" $SCR/compile-after.log | cut -d'(' -f1 | sort | uniq -c
yarn lint --base main
yarn i18n:check
yarn build && yarn build:firefox
```
Expected: the same error files and counts as `$SCR/compile-baseline.log`, or fewer in `wled.ts`; no new lint problems; i18n clean; both builds pass. The manifests' `permissions` and `host_permissions` are the same as `main`'s builds (`jq '{permissions, host_permissions}' .output/*/manifest.json`).

- [ ] **Step 2: The matrix, with the matrix effect's own JSON**

Save `/json/state`. Post the CSV line's JSON with `{player_ascii}` filled in for "Juergen", once as `text/plain;charset=UTF-8` like a browser's `no-cors`, and read back `seg[0].n == "Juergen"` and `fx == 122`. Then put the saved state back: `{"ps":<saved ps>}` and `{"bri":<saved bri>}`.

- [ ] **Step 3: The dev Chrome**

Start `yarn dev` with the FIFO trick when it isn't running. Then, in a tab of my own, with `config-2-0-0` backed up:
- Settings → WLED → New effect → JSON API: the hint shows `{player}` and `{player_ascii}` in code style, in English, German and Dutch.
- Import the matrix effect's CSV line and press its play button twice. The matrix reads back the signed-in account's name both times.
- A bot match on a test config (WLED on, the matrix effect on `next_player`, a preset on `gameon`): at the account's turn the matrix reads back its name; after a dart, the `gameon` preset is back.

Restore `config-2-0-0` and the matrix's state.

- [ ] **Step 4: Fix anything found, and commit the CHANGELOG's "Checked …" sentence**

### Task 7: Land it

- [ ] `git checkout main && git merge --no-ff feat/wled-player-name -m "Merge branch 'feat/wled-player-name': WLED shows whose turn it is"`. Nothing is pushed.
- [ ] Memory: what WLED's /json handler accepts, and the integration harness.
