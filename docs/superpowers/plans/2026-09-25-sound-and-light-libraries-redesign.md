# Sound and light libraries redesign: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the settings dialogs of Animations, Caller, Sound FX and WLED
as one "library" layout with search and trigger filters, keeping every function.

**Architecture:** Pure search logic (`utils/library-search.ts`) and a trigger
catalogue (`utils/trigger-catalog.ts`), tested under tsx.
- Generic controls: `AppSwitch`, `AppSearchInput`, `AppFilterPills`, `AppMenu`
  and `AppTokenInput`, plus restyles of `AppSelect`, `AppTextarea` and
  `AppInput`.
- Library building blocks in `components/Settings/Library/`, and three shared
  dialogs.
- The four feature components keep their storage logic and swap their panel
  templates for these parts.

**Tech Stack:** Vue 3.4 (`<script setup>`, `defineModel`), TypeScript,
Tailwind 3 plus design-system classes in `assets/tailwind.css`, sortablejs, and
Iconify `material-symbols`. WXT dev build in the yarn dev Chrome.

**Spec:** `docs/superpowers/specs/2026-09-25-sound-and-light-libraries-redesign-design.md`

## Global Constraints

- **Nothing is committed or pushed.** The user will review the working tree. Where the skill says "Commit", this plan says "Checkpoint": `git status --short` and move on.
- **Colour:** blue (`--ad-action-primary`) is the only accent. Green (`success`) is never an action colour, and dialog confirms use `type="primary"`.
- **Tokens:** every colour, radius and timing comes from `assets/design-tokens.css`. The site-measured values that have no token (switch ring `rgb(55 76 152 / 60%)`, popover `#292c33` = `--ad-ink-750`) are the only literals, each commented.
- **Cascade gotcha:** classes in `assets/tailwind.css` come *after* `@tailwind utilities`, so a component class beats a same-specificity utility. Size and space design-system elements with modifier classes, or with wrappers, never with utilities on the element.
- **Icons** are literal `icon-[material-symbols--…]` strings in source; Iconify only generates names it finds.
- **Triggers** are stored lower case, trimmed and without duplicates, as before. Board IDs are kept as typed.
- **Engines are untouched.** Nothing under `entrypoints/match.content/`, `lobby.content/` or `utils/wled.ts` changes.
- **Browser:**
  - Use only the yarn dev Chrome (CDP :9222), in a tab of my own.
  - Park it at `about:blank` before every source edit.
  - Never reload the extension.
  - Restore `adt:last-visited-url` and `urlstatus` to `https://play.autodarts.com/tools` at the end.
- **The user's config is real data.** It is backed up at `scratchpad/storage-backup-initial.json`. Anything a test adds is deleted, and the config is compared with the backup at the end.
- `yarn compile` baseline: 16 errors, none may be added. `yarn build` must pass.

## Review Focus

1. **A filter that empties under the user.** Switching the last "off" item on while the *Off* pill is picked should fall back to *All*, not leave an empty list with no way out. Pinned in Task 4 (the `present` watcher), checked in Task 6.
2. **Save clicked with a trigger still typed in the field.** It must be saved, not dropped. Pinned in Task 3 (`@blur="commit"`), checked in Task 6.
3. **Pasting a one-per-line list** from the old textarea habit. Each line becomes one chip, and names with spaces stay whole. Pinned in Task 3 (`onPaste`), checked in Task 6.
4. **Dragging after a sort, delete or edit.** Indices must address the right item. Keys are object identity and the DOM move is reverted before the data moves. Pinned in Task 4, checked in Task 6 (drag, sort, drag again).
5. **Closing a dialog, or deleting an item, while it plays.** Playback stops and nothing stays marked as playing. Pinned in Tasks 7–8 (`onBeforeUnmount(stopPlayback)`, `removeSound` stops first).

---

### Task 1: Search and filter logic

**Files:**
- Create: `utils/library-search.ts`
- Test: `scratchpad/test-library-search.mts` (outside the repo; there is no test framework)

**Interfaces:**
- Produces:
  - `type TriggerCategory = "scores" | "throws" | "events" | "board" | "players"`
  - `type LibraryFilter = "all" | TriggerCategory | "off"`
  - `interface LibraryEntry { index: number; name: string; triggers: string[]; source: string; enabled: boolean }`
  - `CATEGORY_LABELS`, `CATEGORY_ORDER`
  - `triggerCategory(t)`, `parseRange(t)`, `rangeCovers(t, n)`, `matchesFilter(e, f)`, `searchLibrary(entries, query, filter?)`, `filterCounts(entries)`, `triggerMatches(t, q)`, `highlight(text, q)`

- [ ] **Step 1: Write the failing test** at `scratchpad/test-library-search.mts`:

```ts
import assert from "node:assert/strict";

import { filterCounts, highlight, matchesFilter, parseRange, rangeCovers, searchLibrary, triggerCategory, triggerMatches } from "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/utils/library-search.ts";

const e = (index: number, name: string, triggers: string[], extra: Record<string, unknown> = {}) =>
  ({ index, name, triggers, source: "", enabled: true, ...extra });

const CATEGORIES: [string, string][] = [
  [ "180", "scores" ], [ "0", "scores" ], [ "ambient_42", "scores" ], [ "100-180", "scores" ], [ "range_100_180", "scores" ], [ "ambient_100-180", "scores" ], [ "25", "scores" ],
  [ "t20", "throws" ], [ "s25", "throws" ], [ "bull", "throws" ], [ "m17", "throws" ], [ "miss", "throws" ], [ "outside", "throws" ], [ "double", "throws" ],
  [ "ambient_s20_s20_s20", "throws" ], [ "s20_s5_s1", "throws" ], [ "t20_t20_bull", "throws" ], [ "s25_s25_bull", "throws" ],
  [ "gameon", "events" ], [ "ambient_gameshot", "events" ], [ "gameshot+d10", "events" ], [ "matchshot_john doe", "events" ], [ "cricket_hit", "events" ],
  [ "target7", "events" ], [ "targetbull", "events" ], [ "lobby_in", "events" ], [ "ambient_tournament_ready", "events" ], [ "other", "events" ], [ "bot_throw", "events" ],
  [ "board_started", "board" ], [ "calibration_finished", "board" ], [ "ambient_calibration started", "board" ], [ "takeout_finished", "board" ], [ "throw", "board" ],
  [ "todd jock", "players" ], [ "zane", "players" ], [ "s50", "players" ], [ "creazy.eth", "players" ],
];
for (const [ trigger, category ] of CATEGORIES) assert.equal(triggerCategory(trigger), category, `${trigger} → ${category}`);

assert.deepEqual(parseRange("180-100"), [ 100, 180 ]);
assert.equal(parseRange("t20"), null);
assert.equal(rangeCovers("100-180", 150), true);
assert.equal(rangeCovers("range_0_20", 21), false);
assert.equal(rangeCovers("ambient_100-180", 100), true);

const lib = [
  e(0, "126", [ "126" ]),
  e(1, "twenty six", [ "26" ]),
  e(2, "high", [ "100-180" ]),
  e(3, "fx", [ "ambient_26" ]),
  e(4, "zane+speedbump", [ "zane" ]),
  e(5, "russ zane", [ "russ zane" ]),
  e(6, "todd jock", [ "todd_jock" ]),
  e(7, "off one", [ "busted" ], { enabled: false }),
];
const ids = (query: string, filter?: Parameters<typeof searchLibrary>[2]) => searchLibrary(lib, query, filter).map(entry => entry.index);

assert.deepEqual(ids(""), [ 0, 1, 2, 3, 4, 5, 6, 7 ]); // no query: stored order
assert.deepEqual(ids("   "), [ 0, 1, 2, 3, 4, 5, 6, 7 ]);
assert.deepEqual(ids("26"), [ 1, 3, 0 ]); // exact (ambient_ ignored) before substring
assert.deepEqual(ids("150"), [ 2 ]); // a range that covers it
assert.deepEqual(ids("100-180"), [ 2 ]);
assert.deepEqual(ids("range_100_180"), [ 2 ]); // the same range spelt the other way
assert.deepEqual(ids("zane"), [ 4, 5 ]);
assert.deepEqual(ids("todd jock"), [ 6 ]); // a space finds an underscore
assert.deepEqual(ids("TODD_JOCK"), [ 6 ]);
assert.deepEqual(ids("speedbump"), [ 4 ]); // by name
assert.deepEqual(ids("zzz"), []);
assert.deepEqual(ids("", "off"), [ 7 ]);
assert.deepEqual(ids("", "scores"), [ 0, 1, 2, 3 ]);
assert.deepEqual(ids("26", "players"), []);
assert.equal(searchLibrary([ e(0, "gameon", [ "gameon" ], { source: "URL http://192.168.2.49/win/PL=6" }) ], "192.168").length, 1);

const counts = filterCounts(lib);
assert.deepEqual(counts, { all: 8, scores: 4, throws: 0, events: 1, board: 0, players: 3, off: 1 });
assert.deepEqual(filterCounts([ e(0, "x", [ "miss", "busted", "outside" ]) ]), { all: 1, scores: 0, throws: 1, events: 1, board: 0, players: 0, off: 0 });

assert.equal(triggerMatches("100-180", "150"), true);
assert.equal(triggerMatches("todd_jock", "jock"), true);
assert.equal(triggerMatches("t20", ""), false);
assert.equal(triggerMatches("t20", "t19"), false);

assert.deepEqual(highlight("Todd  Jock", "jock"), [ { text: "Todd  ", match: false }, { text: "Jock", match: true } ]);
assert.deepEqual(highlight("zane+speedbump", "zane"), [ { text: "zane", match: true }, { text: "+speedbump", match: false } ]);
assert.deepEqual(highlight("abc", ""), [ { text: "abc", match: false } ]);
assert.deepEqual(highlight("", "x"), []);
assert.deepEqual(highlight("aaa", "a"), [ { text: "aaa", match: true } ]);

assert.equal(matchesFilter(e(0, "none", []), "players"), false);
assert.equal(matchesFilter(e(0, "none", []), "all"), true);

console.log("library-search: all checks passed");
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd scratchpad && /Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/node_modules/.bin/tsx test-library-search.mts`
Expected: FAIL, "Cannot find module …/utils/library-search.ts"

- [ ] **Step 3: Implement `utils/library-search.ts`**

```ts
/**
 * Search and filters for the libraries in the Animations, Caller, Sound FX and
 * WLED settings: which items to show for what was typed and which pill is
 * picked, and in which order.
 *
 * Pure (no DOM, no storage, no Vue), so it runs under tsx. The dialogs map
 * each stored item to a flat {@link LibraryEntry} and render what comes back.
 */

/** The kinds of trigger the filter pills offer. */
export type TriggerCategory = "scores" | "throws" | "events" | "board" | "players";

/** A pill: everything, one kind of trigger, or what is switched off. */
export type LibraryFilter = "all" | TriggerCategory | "off";

export interface LibraryEntry {
  /** Position in the stored array, which is what edits and deletes address. */
  index: number;
  /** The title the list shows. */
  name: string;
  triggers: string[];
  /** Anything else it can be found by: a link, TTS text, a WLED address or preset. */
  source: string;
  enabled: boolean;
}

export const CATEGORY_LABELS: Record<TriggerCategory, string> = {
  scores: "Scores",
  throws: "Throws",
  events: "Events",
  board: "Board",
  players: "Players",
};

/** The order the pills come in. */
export const CATEGORY_ORDER: readonly TriggerCategory[] = [ "scores", "throws", "events", "board", "players" ];

const SCORE = "(?:180|1[0-7][0-9]|[1-9][0-9]|[0-9])";
const SCORE_RE = new RegExp(`^${SCORE}$`);
const RANGE_RE = new RegExp(`^(?:range_)?(${SCORE})[-_](${SCORE})$`);

/** One dart: a single, double, triple or miss beside a number, or the single bull. */
const DART_RE = /^(?:[sdtm](?:1[0-9]|20|[0-9])|s25|bull)$/;

const THROW_WORDS = new Set([ "bull", "outside", "miss", "double", "triple" ]);

const BOARD_WORDS = new Set([
  "board_starting",
  "board_started",
  "board_stopping",
  "board_stopped",
  "manual_reset_done",
  "throw",
  "last_throw",
  "takeout_finished",
  "calibration_started",
  "calibration_finished",
]);

const EVENT_WORDS = new Set([
  "gameon",
  "gameshot",
  "matchshot",
  "busted",
  "bulloff",
  "takeout",
  "idle",
  "other",
  "you_require",
  "next_player",
  "bot",
  "bot_throw",
  "opponent_throw",
  "cricket_hit",
  "cricket_miss",
  "lobby_in",
  "lobby_out",
  "tournament_ready",
]);

/**
 * A trigger as the categories read it: lower case, runs of whitespace as one
 * underscore, and Sound FX's `ambient_` prefix dropped, since `ambient_180` is
 * the same event as `180`.
 */
function bare(trigger: string): string {
  const t = trigger.trim().toLowerCase().replace(/\s+/g, "_");
  return t.startsWith("ambient_") ? t.slice("ambient_".length) : t;
}

/**
 * The kind of a trigger.
 *
 * Anything that is not a built-in trigger counts as a player's name. The
 * Caller, Sound FX and WLED all treat an unknown trigger as one, so a
 * misspelt trigger shows up there too, which is where it is worth seeing.
 */
export function triggerCategory(trigger: string): TriggerCategory {
  const t = bare(trigger);
  if (SCORE_RE.test(t) || RANGE_RE.test(t)) return "scores";
  if (THROW_WORDS.has(t) || DART_RE.test(t)) return "throws";

  const darts = t.split("_");
  if (darts.length >= 2 && darts.length <= 3 && darts.every(dart => DART_RE.test(dart))) return "throws";

  if (BOARD_WORDS.has(t)) return "board";
  if (EVENT_WORDS.has(t) || /^(?:gameshot|matchshot)[+_]/.test(t) || /^target(?:\d+|bull)$/.test(t)) return "events";
  return "players";
}

/** The two ends of a range trigger (`100-180`, `range_100_180`, `ambient_100-180`), in order. */
export function parseRange(trigger: string): [ number, number ] | null {
  const match = RANGE_RE.exec(bare(trigger));
  if (!match) return null;
  const a = Number(match[1]);
  const b = Number(match[2]);
  return a <= b ? [ a, b ] : [ b, a ];
}

/** Whether a range trigger takes in a score. */
export function rangeCovers(trigger: string, score: number): boolean {
  const range = parseRange(trigger);
  return range !== null && score >= range[0] && score <= range[1];
}

/** Case folded, with spaces and underscores as one: player names take either. */
function fold(text: string): string {
  return text.toLowerCase().replace(/[\s_]+/g, " ").trim();
}

/** Folded, then without Sound FX's prefix. */
function foldBare(trigger: string): string {
  const t = fold(trigger);
  return t.startsWith("ambient ") ? t.slice("ambient ".length) : t;
}

/** A query that is a score on its own, which also finds the ranges that cover it. */
function scoreOf(query: string): number | null {
  return SCORE_RE.test(query) ? Number(query) : null;
}

function sameRange(a: [ number, number ] | null, b: [ number, number ]): boolean {
  return a !== null && a[0] === b[0] && a[1] === b[1];
}

/**
 * How well an entry answers a folded, non-empty query, and 0 when it does not:
 *
 * - 4: a trigger is the query (ignoring `ambient_`), or the same range spelt another way
 * - 3: a trigger starts with it
 * - 2: every word of it is somewhere in the name, the triggers or the source
 * - 1: it is a score, and a range trigger covers it
 */
function rank(entry: LibraryEntry, query: string): number {
  const triggers = entry.triggers.map(foldBare);
  const range = parseRange(query.replace(/ /g, "_"));

  if (triggers.includes(query) || (range && entry.triggers.some(t => sameRange(parseRange(t), range)))) return 4;
  if (triggers.some(t => t.startsWith(query))) return 3;

  const haystack = [ entry.name, ...entry.triggers, entry.source ].map(fold).join("\n");
  if (query.split(" ").every(word => haystack.includes(word))) return 2;

  const score = scoreOf(query);
  if (score !== null && entry.triggers.some(t => rangeCovers(t, score))) return 1;
  return 0;
}

export function matchesFilter(entry: LibraryEntry, filter: LibraryFilter): boolean {
  if (filter === "all") return true;
  if (filter === "off") return !entry.enabled;
  return entry.triggers.some(trigger => triggerCategory(trigger) === filter);
}

/**
 * The entries to show, best match first.
 *
 * Without a query the list keeps its own order, which is the user's
 * arrangement, and with one ties keep that order too.
 */
export function searchLibrary(entries: readonly LibraryEntry[], query: string, filter: LibraryFilter = "all"): LibraryEntry[] {
  const q = fold(query);
  const found: { entry: LibraryEntry; rank: number }[] = [];

  for (const entry of entries) {
    if (!matchesFilter(entry, filter)) continue;
    const r = q ? rank(entry, q) : 1;
    if (r > 0) found.push({ entry, rank: r });
  }

  if (q) found.sort((a, b) => b.rank - a.rank || a.entry.index - b.entry.index);
  return found.map(item => item.entry);
}

/** How many entries each pill would show. An entry counts once for every kind of trigger it has. */
export function filterCounts(entries: readonly LibraryEntry[]): Record<LibraryFilter, number> {
  const counts: Record<LibraryFilter, number> = { all: entries.length, scores: 0, throws: 0, events: 0, board: 0, players: 0, off: 0 };
  for (const entry of entries) {
    if (!entry.enabled) counts.off++;
    for (const category of new Set(entry.triggers.map(triggerCategory))) counts[category]++;
  }
  return counts;
}

/** Whether a trigger chip is one the query found, to highlight it. */
export function triggerMatches(trigger: string, query: string): boolean {
  const q = fold(query);
  if (!q) return false;
  const t = fold(trigger);
  if (q.split(" ").some(word => t.includes(word))) return true;
  const score = scoreOf(q);
  return score !== null && rangeCovers(trigger, score);
}

/**
 * A title cut into the parts the query found and the rest, for marking them.
 * Matched on a folded copy of the same length, so the title keeps its own case
 * and spacing.
 */
export function highlight(text: string, query: string): { text: string; match: boolean }[] {
  if (!text) return [];
  const words = fold(query).split(" ").filter(Boolean);
  const flat = text.toLowerCase().replace(/_/g, " ");
  if (!words.length || flat.length !== text.length) return [ { text, match: false } ];

  const marked = Array.from({ length: text.length }, () => false);
  for (const word of words) {
    for (let at = flat.indexOf(word); at !== -1; at = flat.indexOf(word, at + word.length)) {
      marked.fill(true, at, at + word.length);
    }
  }

  const parts: { text: string; match: boolean }[] = [];
  let start = 0;
  for (let i = 1; i <= text.length; i++) {
    if (i === text.length || marked[i] !== marked[start]) {
      parts.push({ text: text.slice(start, i), match: marked[start] });
      start = i;
    }
  }
  return parts;
}
```

- [ ] **Step 4: Run the test**: same command. Expected: `library-search: all checks passed`.
- [ ] **Step 5: Lint**: `npx eslint utils/library-search.ts`, expecting no output (`--fix` for spacing only).
- [ ] **Step 6: Checkpoint**: `git status --short` shows `?? utils/library-search.ts`.

---

### Task 2: Trigger catalogue

**Files:**
- Create: `utils/trigger-catalog.ts`
- Test: `scratchpad/test-trigger-catalog.mts`

**Interfaces:**
- Consumes: `triggerCategory` (Task 1), in the test only
- Produces:
  - `type TriggerFeature = "caller" | "soundFx" | "wled" | "animations"`
  - `interface TriggerHint { trigger: string; description: string }`
  - `TRIGGER_HINTS: Record<TriggerFeature, TriggerHint[]>`
  - `TRIGGER_PATTERNS: Record<TriggerFeature, string>`
  - `TRIGGER_DOCS: Record<TriggerFeature, string>`

- [ ] **Step 1: Write the failing test** at `scratchpad/test-trigger-catalog.mts`:

```ts
import assert from "node:assert/strict";

import { triggerCategory } from "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/utils/library-search.ts";
import { TRIGGER_DOCS, TRIGGER_HINTS, TRIGGER_PATTERNS } from "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/utils/trigger-catalog.ts";

for (const [ feature, hints ] of Object.entries(TRIGGER_HINTS)) {
  // Every suggestion is a built-in trigger, so none of them lands under Players.
  for (const hint of hints) assert.notEqual(triggerCategory(hint.trigger), "players", `${feature}: ${hint.trigger}`);
  assert.equal(new Set(hints.map(hint => hint.trigger)).size, hints.length, `${feature}: duplicates`);
  for (const hint of hints) assert.match(hint.trigger, /^[a-z0-9_+]+$/, `${feature}: ${hint.trigger} is stored lower case`);
  assert.ok(TRIGGER_PATTERNS[feature as keyof typeof TRIGGER_PATTERNS], `${feature}: patterns line`);
  assert.match(TRIGGER_DOCS[feature as keyof typeof TRIGGER_DOCS], /^https:\/\/github\.com\/creazy231\/tools-for-autodarts/);
}
console.log("trigger-catalog: all checks passed");
```

- [ ] **Step 2: Run it and watch it fail**: `cd scratchpad && …/tsx test-trigger-catalog.mts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement `utils/trigger-catalog.ts`**

```ts
/**
 * The named triggers each feature knows, with a line on when each goes off:
 * what the trigger field suggests as it is typed into. Taken from the README,
 * which stays the full reference. Numbers, segments and combinations follow
 * patterns, so they are summed up in one line instead of listed.
 */

export type TriggerFeature = "caller" | "soundFx" | "wled" | "animations";

export interface TriggerHint {
  trigger: string;
  description: string;
}

const README = "https://github.com/creazy231/tools-for-autodarts?tab=readme-ov-file";

/** The README section with the full list, per feature. */
export const TRIGGER_DOCS: Record<TriggerFeature, string> = {
  caller: `${README}#%EF%B8%8F-caller-feature`,
  soundFx: `${README}#-sound-fx-feature`,
  wled: `${README}#-wled-integration`,
  animations: `${README}#-animations`,
};

/** The pattern-shaped triggers, in one line. */
export const TRIGGER_PATTERNS: Record<TriggerFeature, string> = {
  caller: "Also scores 0–180, ranges like 100-180, s1–s20, d1–d20, t1–t20, combinations like s20_s5_s1, and a player's name.",
  soundFx: "Also scores 0–180, ranges like 100-180, s/d/t1–20, combinations like s20_t19_d12 and a player's name, each with or without ambient_.",
  wled: "Also scores 0–180, range_100_180, s/d/t1–20, m1–m20, combinations like t20_t20_t20, target7, and a player's name.",
  animations: "Also scores 0–180, ranges like 100-180, s0–s20, d1–d20, t1–t20, and combinations like s20_s5_d20.",
};

function board(prefix = ""): TriggerHint[] {
  return [
    { trigger: `${prefix}board_started`, description: "The board has started" },
    { trigger: `${prefix}board_stopped`, description: "The board has stopped or disconnected" },
    { trigger: `${prefix}manual_reset_done`, description: "After a manual reset, and when a new round starts" },
    { trigger: `${prefix}takeout_finished`, description: "Takeout has finished" },
    { trigger: `${prefix}calibration_started`, description: "Calibration has started" },
    { trigger: `${prefix}calibration_finished`, description: "Calibration has finished" },
  ];
}

const CRICKET: TriggerHint[] = [
  { trigger: "cricket_hit", description: "Cricket: a hit on a target that is still open" },
  { trigger: "cricket_miss", description: "Cricket: any other number, or a target everyone has closed" },
];

export const TRIGGER_HINTS: Record<TriggerFeature, TriggerHint[]> = {
  caller: [
    { trigger: "gameon", description: "At the start of a new game" },
    { trigger: "gameshot", description: "A player wins the leg" },
    { trigger: "busted", description: "A player busts" },
    { trigger: "you_require", description: "Before a checkout is called" },
    { trigger: "next_player", description: "The next player is up and has no sound of their own" },
    { trigger: "bot", description: "Instead of the name when a bot is up" },
    { trigger: "bulloff", description: "Once, when the bull-off begins" },
    { trigger: "bull", description: "A bullseye" },
    { trigger: "outside", description: "A dart outside the scoring area" },
    { trigger: "double", description: "Said before a double" },
    { trigger: "triple", description: "Said before a triple" },
    ...CRICKET,
    ...board(),
  ],
  soundFx: [
    { trigger: "ambient_gameon", description: "At the start of a new game" },
    { trigger: "ambient_gameshot", description: "A player wins the leg" },
    { trigger: "ambient_matchshot", description: "A player wins the match" },
    { trigger: "ambient_busted", description: "A player busts" },
    { trigger: "ambient_bull", description: "A bullseye" },
    { trigger: "ambient_miss", description: "A missed dart" },
    { trigger: "ambient_outside", description: "A missed dart, when there is no ambient_miss" },
    { trigger: "ambient_next_player", description: "The next player is up and has no sound of their own" },
    { trigger: "ambient_bot", description: "A bot is up" },
    { trigger: "bot_throw", description: "A bot throws a dart" },
    { trigger: "opponent_throw", description: "An opponent on another board throws a dart" },
    { trigger: "ambient_lobby_in", description: "A player joins the lobby" },
    { trigger: "ambient_lobby_out", description: "A player leaves the lobby" },
    { trigger: "ambient_tournament_ready", description: "A tournament match of yours is ready to mark ready" },
    ...CRICKET,
    ...board("ambient_"),
  ],
  wled: [
    { trigger: "gameon", description: "At the start of each turn, and when nothing else matches" },
    { trigger: "takeout", description: "While takeout is in progress" },
    { trigger: "gameshot", description: "A player wins the leg" },
    { trigger: "matchshot", description: "A player wins the match" },
    { trigger: "busted", description: "A player busts" },
    { trigger: "bulloff", description: "Once, when the bull-off begins" },
    { trigger: "idle", description: "Leaving the match" },
    { trigger: "bull", description: "A bullseye" },
    { trigger: "outside", description: "Any missed dart, when there is no effect on the miss itself" },
    { trigger: "miss", description: "A dart entered with Miss, or corrected to a bouncer" },
    { trigger: "throw", description: "A dart is detected" },
    { trigger: "last_throw", description: "The last dart of a visit is detected" },
    { trigger: "board_starting", description: "The board is about to start" },
    { trigger: "board_stopping", description: "The board is about to stop" },
    ...board(),
    { trigger: "bot_throw", description: "A bot throws a dart" },
    { trigger: "lobby_in", description: "A player joins the lobby" },
    { trigger: "lobby_out", description: "A player leaves the lobby" },
    { trigger: "tournament_ready", description: "A tournament match of yours is ready to mark ready" },
    { trigger: "other", description: "Throws on a board that isn't in your Boards list" },
  ],
  animations: [
    { trigger: "gameshot", description: "A player wins the leg" },
    { trigger: "busted", description: "A player busts" },
    { trigger: "bull", description: "A bullseye" },
    { trigger: "s25", description: "The single bull" },
    { trigger: "outside", description: "A dart outside the scoring area" },
  ],
};
```

- [ ] **Step 4: Run the test.** Expected: `trigger-catalog: all checks passed`.
- [ ] **Step 5: Lint**, then **Checkpoint**.

---

### Task 3: Controls and form styles

**Files:**
- Modify: `assets/tailwind.css`. Add the field modifiers after `.adt-input:disabled`, and a new "libraries" section before `/* --- disabled tile ---`.
- Create: `components/AppSwitch.vue`, `components/AppSearchInput.vue`, `components/AppFilterPills.vue`, `components/AppMenu.vue`, `components/AppTokenInput.vue`
- Modify: `components/AppInput.vue` (`size` prop, forward attrs), `components/AppSelect.vue` and `components/AppTextarea.vue` (design-system field), `components/AppModal.vue` (room for the close button beside the title)

**Interfaces:**
- Produces:
  - `AppSwitch` — `v-model: boolean`, `label?: string`, `disabled?: boolean`
  - `AppSearchInput` — `v-model: string`, `placeholder?: string`; exposes `focus()`
  - `AppFilterPills` — `v-model: string`, `options: { value: string; label: string; count?: number }[]`, `label?: string`
  - `AppMenu` — `items: { label; hint?; icon?; danger?; disabled?; separated?; action }[]`, `align?: "start" | "end"`, slot `#trigger="{ open, toggle }"`
  - `AppTokenInput` — `v-model: string[]`, `id?`, `placeholder?`, `suggestions?: TriggerHint[]`, `validate?: (t) => string`, `lowercase?: boolean`
  - `AppInput` — `size?: "md" | "sm"`
  - CSS classes: `.adt-section-title`, `.adt-section-count`, `.adt-search*`, `.adt-pills`, `.adt-pill*`, `.adt-chip` (`.is-match`, `.is-more`, `.is-warning`), `.adt-mark`, `.adt-switch*`, `.adt-icon-btn` (`.is-danger`), `.adt-glass-btn`, `.adt-confirm-delete`, `.adt-play` (`.is-playing`, `.is-lg`), `.adt-drag-handle` (`.is-glass`), `.adt-sortable-ghost`, `.adt-menu*`, `.adt-dropzone` (`.is-over`), `.adt-token-input`, `.adt-token*`, `.adt-suggestion*`, `.adt-code`, `.adt-code-block`, `.adt-input-sm`, `.adt-select`, `.adt-textarea` (`.is-mono`)

- [ ] **Step 1: Add the field modifiers** after `.adt-input:disabled { … }`:

```css
/* A denser field, for a number in a settings row. */
.adt-input.adt-input-sm {
  height: 40px;
  padding: 0 12px;
  font-size: var(--ad-text-base);
  border-radius: var(--ad-radius-lg);
}

/* Forms/Select: the TextField, with room for its chevron. */
.adt-select {
  display: block;
  padding-right: 44px;
  cursor: pointer;
  appearance: none;
}

.adt-select option {
  color: var(--ad-text-primary);
  background: var(--ad-ink-750);
}

/* Forms/TextArea: the TextField's fill, radius and focus ring, over several lines. */
.adt-textarea {
  display: block;
  width: 100%;
  padding: 14px 16px;
  font-family: var(--ad-font-body);
  font-size: var(--ad-text-md);
  font-weight: var(--ad-weight-medium);
  line-height: var(--ad-leading-normal);
  color: var(--ad-text-primary);
  background: var(--ad-surface-input);
  border: 0;
  border-radius: var(--ad-radius-xl);
  outline: none;
  transition: var(--ad-transition-interactive);
}

.adt-textarea::placeholder {
  color: var(--ad-text-muted);
}

.adt-textarea:focus {
  box-shadow: var(--ad-focus-ring);
}

.adt-textarea:disabled {
  color: var(--ad-text-disabled);
  cursor: not-allowed;
  background: var(--ad-action-disabled);
}

.adt-textarea.is-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: var(--ad-text-sm);
}
```

- [ ] **Step 2: Add the libraries section** before the disabled-tile section. It uses exactly the rules written in the spec's "What the site does" table. For the full CSS, see the block in Appendix A of this plan (copied verbatim into the file).

- [ ] **Step 3: `components/AppSwitch.vue`**

```vue
<template>
  <!--
    Forms/Switch as the site draws it in its own lists (data-slot="switch",
    size sm). For one item's on/off inside a list. A feature or a setting
    keeps AppToggle, the segmented control the product chose for those.
  -->
  <button
    @click="toggle"
    :aria-checked="modelValue"
    :aria-label="label"
    :class="[ 'adt-switch', { 'is-on': modelValue } ]"
    :disabled="disabled"
    :title="label"
    role="switch"
    type="button"
  >
    <span class="adt-switch-thumb" />
  </button>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: boolean;
  /** What is being switched, for screen readers and the tooltip. */
  label?: string;
  disabled?: boolean;
}>(), {
  label: undefined,
  disabled: false,
});

const emit = defineEmits<{ "update:modelValue": [ value: boolean ] }>();

function toggle() {
  if (!props.disabled) emit("update:modelValue", !props.modelValue);
}
</script>
```

- [ ] **Step 4: `components/AppSearchInput.vue`**

```vue
<template>
  <!-- The site's search field, as in its friends drawer: a light pill on the dark surface. -->
  <div class="adt-search">
    <span class="adt-search-icon icon-[material-symbols--search-rounded]" />
    <input
      ref="input"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @keydown.esc="clear"
      :aria-label="placeholder"
      :placeholder="placeholder"
      :value="modelValue"
      autocapitalize="off"
      autocomplete="off"
      class="adt-search-input"
      spellcheck="false"
      type="search"
    >
    <button
      @click="clear"
      v-if="modelValue"
      aria-label="Clear the search"
      class="adt-search-clear"
      title="Clear"
      type="button"
    >
      <span class="icon-[material-symbols--close-rounded]" />
    </button>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  modelValue: string;
  placeholder?: string;
}>(), {
  placeholder: "Search",
});

const emit = defineEmits<{ "update:modelValue": [ value: string ] }>();

const input = ref<HTMLInputElement>();

function clear() {
  emit("update:modelValue", "");
  input.value?.focus();
}

defineExpose({ focus: () => input.value?.focus() });
</script>
```

- [ ] **Step 5: `components/AppFilterPills.vue`**

```vue
<template>
  <!-- Tabs › PillTabs, as the site's Stats page draws them: filtering within one view. -->
  <div :aria-label="label" class="adt-pills" role="group">
    <button
      @click="emit('update:modelValue', option.value)"
      v-for="option in options"
      :key="option.value"
      :aria-pressed="modelValue === option.value"
      :class="[ 'adt-pill', { 'is-active': modelValue === option.value, 'is-empty': option.count === 0 } ]"
      type="button"
    >
      {{ option.label }}
      <span v-if="option.count !== undefined" class="adt-pill-count">{{ option.count }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  modelValue: string;
  options: { value: string; label: string; count?: number }[];
  label?: string;
}>(), {
  label: undefined,
});

const emit = defineEmits<{ "update:modelValue": [ value: string ] }>();
</script>
```

- [ ] **Step 6: `components/AppMenu.vue`**

```vue
<template>
  <div ref="root" class="relative inline-flex">
    <slot :open="open" :toggle="toggle" name="trigger" />
    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="scale-95 opacity-0"
      leave-active-class="transition duration-75 ease-in"
      leave-to-class="scale-95 opacity-0"
    >
      <div
        v-if="open"
        ref="menu"
        @keydown="onKeydown"
        :class="above ? 'origin-bottom' : 'origin-top'"
        :style="position"
        class="adt-menu"
        role="menu"
      >
        <template v-for="(item, index) in items" :key="item.label">
          <div v-if="item.separated && index > 0" class="adt-menu-divider" role="separator" />
          <button
            @click="choose(item)"
            :class="[ 'adt-menu-item', { 'is-danger': item.danger } ]"
            :disabled="item.disabled"
            role="menuitem"
            type="button"
          >
            <span v-if="item.icon" :class="[ 'adt-menu-item-icon', item.icon ]" />
            <span class="min-w-0">
              {{ item.label }}
              <span v-if="item.hint" class="adt-menu-item-hint">{{ item.hint }}</span>
            </span>
          </button>
        </template>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
/**
 * A button that opens a short list of actions, on the site's popover surface.
 *
 * Fixed rather than absolute, placed from the trigger's box. The settings
 * dialogs scroll, and a menu inside the scroller was cut off at its edge. So
 * the menu closes on any scroll in our shadow root instead of drifting from its
 * button. Outside clicks are read from the composed path, because a click in
 * the shadow root reaches `document` retargeted to the host.
 */
interface MenuItem {
  label: string;
  hint?: string;
  /** A literal `icon-[…]` class, so Tailwind finds it in the source. */
  icon?: string;
  danger?: boolean;
  disabled?: boolean;
  /** Draw a line above it. */
  separated?: boolean;
  action: () => void;
}

const props = withDefaults(defineProps<{
  items: MenuItem[];
  /** Which edge of the trigger the menu lines up with. */
  align?: "start" | "end";
}>(), {
  align: "end",
});

const open = ref(false);
const above = ref(false);
const position = ref<Record<string, string>>({});
const root = ref<HTMLElement>();
const menu = ref<HTMLElement>();
let scope: Node | undefined;

onBeforeUnmount(unlisten);

async function toggle() {
  if (open.value) close();
  else await show();
}

async function show() {
  const trigger = root.value?.getBoundingClientRect();
  if (!trigger) return;

  const edge = props.align === "end"
    ? { right: `${Math.max(8, window.innerWidth - trigger.right)}px` }
    : { left: `${Math.max(8, trigger.left)}px` };
  above.value = false;
  position.value = { ...edge, top: `${trigger.bottom + 8}px` };
  open.value = true;
  listen();
  await nextTick();

  // Upwards when it would run off the bottom and there is more room above.
  const box = menu.value?.getBoundingClientRect();
  if (box && box.bottom > window.innerHeight - 8 && trigger.top > window.innerHeight - trigger.bottom) {
    above.value = true;
    position.value = { ...edge, top: `${Math.max(8, trigger.top - 8 - box.height)}px` };
  }
  menu.value?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
}

function close() {
  open.value = false;
  unlisten();
}

function choose(item: MenuItem) {
  close();
  item.action();
}

function onKeydown(event: KeyboardEvent) {
  const buttons = [ ...(menu.value?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []) ];
  const at = buttons.indexOf(event.target as HTMLButtonElement);
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    const step = event.key === "ArrowDown" ? 1 : -1;
    buttons[(at + step + buttons.length) % buttons.length]?.focus();
  } else if (event.key === "Escape") {
    event.preventDefault();
    close();
    root.value?.querySelector<HTMLElement>("button")?.focus();
  } else if (event.key === "Tab") {
    close();
  }
}

function onPointerDown(event: PointerEvent) {
  if (root.value && !event.composedPath().includes(root.value)) close();
}

function listen() {
  document.addEventListener("pointerdown", onPointerDown, true);
  scope = root.value?.getRootNode();
  scope?.addEventListener("scroll", close, true);
  window.addEventListener("resize", close);
}

function unlisten() {
  document.removeEventListener("pointerdown", onPointerDown, true);
  scope?.removeEventListener("scroll", close, true);
  window.removeEventListener("resize", close);
}
</script>
```

- [ ] **Step 7: `components/AppTokenInput.vue`**

```vue
<template>
  <div>
    <div @click="input?.focus()" class="adt-token-input">
      <span
        v-for="(token, index) in modelValue"
        :key="token"
        :class="[ 'adt-token', { 'is-invalid': errors.get(token) } ]"
        :title="errors.get(token) || token"
      >
        <span class="truncate">{{ token }}</span>
        <button
          @click.stop="remove(index)"
          :aria-label="`Remove ${token}`"
          class="adt-token-remove"
          type="button"
        >
          <span class="icon-[material-symbols--close-rounded]" />
        </button>
      </span>
      <input
        :id="id"
        ref="input"
        v-model="draft"
        @blur="commit"
        @keydown="onKeydown"
        @paste="onPaste"
        :placeholder="modelValue.length ? '' : placeholder"
        autocapitalize="off"
        autocomplete="off"
        spellcheck="false"
        type="text"
      >
    </div>
    <!--
      In the flow rather than floating: the trigger field is the last thing in
      every dialog, and a list laid over the dialog's edge would be cut off by
      its scroller.
    -->
    <div v-if="suggested.length" class="adt-suggestions" role="listbox">
      <button
        @mousedown.prevent="pick(hint.trigger)"
        v-for="(hint, index) in suggested"
        :key="hint.trigger"
        :aria-selected="index === active"
        :class="[ 'adt-suggestion', { 'is-active': index === active } ]"
        role="option"
        tabindex="-1"
        type="button"
      >
        <span class="adt-suggestion-trigger">{{ hint.trigger }}</span>
        <span class="adt-suggestion-text">{{ hint.description }}</span>
      </button>
    </div>
    <p v-if="firstError" class="adt-field-hint !text-[var(--ad-rose-500)]">
      {{ firstError }}
    </p>
  </div>
</template>

<script setup lang="ts">
/**
 * Values as chips in a field: triggers, board IDs.
 *
 * Enter adds what was typed, and so does leaving the field, so a Save clicked
 * with a word still in it keeps the word. Pasted lines become one chip each,
 * which is what the old one-per-line boxes held. A space never splits one,
 * because a player's name is one trigger with spaces in it.
 */
const props = withDefaults(defineProps<{
  modelValue: string[];
  id?: string;
  placeholder?: string;
  /** Offered as the field is typed into. */
  suggestions?: { trigger: string; description: string }[];
  /** A message for a chip that will not work, or "" for one that will. */
  validate?: (token: string) => string;
  /** Triggers are stored lower case; board IDs are kept as typed. */
  lowercase?: boolean;
}>(), {
  id: undefined,
  placeholder: "Type and press Enter",
  suggestions: () => [],
  validate: undefined,
  lowercase: true,
});

const emit = defineEmits<{ "update:modelValue": [ value: string[] ] }>();

const draft = ref("");
const active = ref(-1);
const input = ref<HTMLInputElement>();

const errors = computed(() => new Map(props.modelValue.map(token => [ token, props.validate?.(token) ?? "" ])));
const firstError = computed(() => [ ...errors.value.values() ].find(Boolean) ?? "");
const suggested = computed(() => {
  const typed = normalize(draft.value);
  if (!typed) return [];
  const free = props.suggestions.filter(hint => !props.modelValue.includes(hint.trigger));
  const starting = free.filter(hint => hint.trigger.startsWith(typed));
  const containing = free.filter(hint => !hint.trigger.startsWith(typed)
    && (hint.trigger.includes(typed) || hint.description.toLowerCase().includes(typed)));
  return [ ...starting, ...containing ].slice(0, 6);
});

watch(draft, () => {
  active.value = -1;
});

function normalize(text: string): string {
  const trimmed = text.trim();
  return props.lowercase ? trimmed.toLowerCase() : trimmed;
}

function add(tokens: string[]) {
  const next = [ ...props.modelValue ];
  for (const raw of tokens) {
    const token = normalize(raw);
    if (token && !next.includes(token)) next.push(token);
  }
  if (next.length !== props.modelValue.length) emit("update:modelValue", next);
}

function commit() {
  if (draft.value.trim()) add([ draft.value ]);
  draft.value = "";
}

function pick(trigger: string) {
  add([ trigger ]);
  draft.value = "";
  input.value?.focus();
}

function remove(index: number) {
  emit("update:modelValue", props.modelValue.filter((_, at) => at !== index));
}

function onKeydown(event: KeyboardEvent) {
  if (event.isComposing) return;
  const list = suggested.value;

  if ((event.key === "ArrowDown" || event.key === "ArrowUp") && list.length) {
    event.preventDefault();
    const step = event.key === "ArrowDown" ? 1 : -1;
    active.value = active.value < 0
      ? (step > 0 ? 0 : list.length - 1)
      : (active.value + step + list.length) % list.length;
  } else if (event.key === "Enter") {
    event.preventDefault();
    if (list[active.value]) pick(list[active.value].trigger);
    else commit();
  } else if (event.key === "Backspace" && !draft.value && props.modelValue.length) {
    remove(props.modelValue.length - 1);
  } else if (event.key === "Escape" && draft.value) {
    draft.value = "";
  }
}

function onPaste(event: ClipboardEvent) {
  const text = event.clipboardData?.getData("text") ?? "";
  if (!/[\r\n]/.test(text)) return; // one line pastes into the field as usual
  event.preventDefault();
  add(`${draft.value}${text}`.split(/\r\n|\n|\r/));
  draft.value = "";
}
</script>
```

- [ ] **Step 8: `AppInput.vue`.** Add `size?: "md" | "sm"` (default `"md"`) to the props. Add `size === 'sm' && 'adt-input-sm'` to the input's `twMerge(…)` list. Add `v-bind="_.omit($attrs, 'class')"` to the `<input>`, with `import _ from "lodash";`, so `min`, `step` and listeners reach the field. They were dropped until now, since the component sets `inheritAttrs: false`.

- [ ] **Step 9: `AppSelect.vue`**, full replacement:

```vue
<template>
  <div>
    <label v-if="label" :for="id" class="adt-field-label">{{ label }}</label>
    <div class="relative">
      <select
        :id="id"
        @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
        :class="twMerge(
          // Design system › Forms › TextField, as a select.
          'adt-input adt-select',
          disabled && 'cursor-not-allowed',
          $attrs.class?.toString(),
        )"
        :disabled="disabled"
        :value="modelValue"
      >
        <option v-for="option in options" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
      <span class="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xl text-[var(--ad-text-muted)]">
        <span class="icon-[material-symbols--expand-more-rounded]" />
      </span>
    </div>
    <p v-if="helperText" class="adt-field-hint">
      {{ helperText }}
    </p>
  </div>
</template>
```

The `<script setup>` block is unchanged.

- [ ] **Step 10: `AppTextarea.vue`.** Change only the template:
  - The label takes `class="adt-field-label"`.
  - The textarea class becomes `twMerge('adt-textarea transition-height', monospace && 'is-mono', autosize && 'resize-none', $attrs.class?.toString())`.
  - The helper takes `class="adt-field-hint"`.

  Keep the script and the scoped style (hidden scrollbar, height transition).

- [ ] **Step 11: `AppModal.vue`.** Give the title room beside the close button: `<h2 v-if="title" class="adt-modal-title mb-4 pr-10">`.

- [ ] **Step 12: Lint all touched files.** Run `npx eslint components/App{Switch,SearchInput,FilterPills,Menu,TokenInput,Input,Select,Textarea,Modal}.vue` and `--fix` attribute order. Compare the modified files with their HEAD baseline: `git show HEAD:components/AppInput.vue | npx eslint --stdin --stdin-filename components/AppInput.vue -f unix | wc -l`.
- [ ] **Step 13: Checkpoint.**

---

### Task 4: Library building blocks

**Files (all in `components/Settings/Library/`):**
- Create: `stable-key.ts`, `TriggerChips.vue`, `ConfirmDeleteButton.vue`, `PlayButton.vue`, `LibraryItem.vue`, `LibrarySection.vue`, `OptionRow.vue`, `TriggerField.vue`, `SoundSource.vue`

**Interfaces:**
- Consumes: Task 1 (`LibraryEntry`, `searchLibrary`, `filterCounts`, `matchesFilter`, `triggerMatches`, `highlight`, `CATEGORY_LABELS`, `CATEGORY_ORDER`), Task 2 (`TRIGGER_HINTS`, `TRIGGER_PATTERNS`, `TRIGGER_DOCS`, `TriggerFeature`), Task 3 (controls)
- Produces:
  - `stableKey(item: object): number`
  - `TriggerChips` — `triggers`, `query?`, `max?` (4), `wrap?` (true)
  - `ConfirmDeleteButton` — `label`, `glass?`; emits `confirm`
  - `PlayButton` — `label`, `playing?`, `large?`, `disabled?`; click falls through
  - `LibraryItem` — `title`, `triggers`, `enabled`, `draggable`, `query?`; slots `lead`, `meta`; emits `toggle(value)`, `edit`, `delete`
  - `LibrarySection` — `title`, `entries`, `emptyTitle`, `emptyText`, `emptyIcon?`, `searchPlaceholder?`, `listClass?`, `categoryLabels?`; slots `actions`, default `{ entries, filtering, query }`, `empty`; emits `reorder(from, to)`
  - `OptionRow` — `title`, `description?`, `stacked?`; slots default and `description`
  - `TriggerField` — `v-model: string[]`, `feature`, `id`, `label?` ("Triggers"), `validate?`
  - `SoundSource` — `sound: ISound`, `voices: { value: string; label: string }[]`

- [ ] **Step 1: `stable-key.ts`**

```ts
import { toRaw } from "vue";

/**
 * A key for a stored item that survives its moves.
 *
 * The items have no ids. With the index as key, Vue patched each row's content
 * in place on a sort or a drag instead of moving the row, so a row half-way
 * through confirming a delete could end up confirming another item. Keyed by
 * the object itself, a row moves with its item. An edit stores a new object,
 * which gets a fresh row.
 */
const keys = new WeakMap<object, number>();
let last = 0;

export function stableKey(item: object): number {
  const raw = toRaw(item);
  let key = keys.get(raw);
  if (key === undefined) {
    key = ++last;
    keys.set(raw, key);
  }
  return key;
}
```

- [ ] **Step 2: `TriggerChips.vue`**

```vue
<template>
  <div :class="[ 'flex min-w-0 gap-1.5', wrap ? 'flex-wrap' : 'flex-nowrap overflow-hidden' ]">
    <span
      v-for="(trigger, index) in visible"
      :key="`${index}-${trigger}`"
      :class="[ 'adt-chip', { 'is-match': isMatch(trigger) } ]"
      :title="trigger"
    >
      <span class="truncate">{{ trigger }}</span>
    </span>
    <span v-if="hidden.length" :title="hidden.join(', ')" class="adt-chip is-more">+{{ hidden.length }}</span>
    <span v-if="!triggers.length" class="adt-chip is-warning" title="Without a trigger it never plays">No trigger</span>
  </div>
</template>

<script setup lang="ts">
import { triggerMatches } from "@/utils/library-search";

const props = withDefaults(defineProps<{
  triggers: string[];
  query?: string;
  /** Chips shown before the rest fold into "+n". */
  max?: number;
  wrap?: boolean;
}>(), {
  query: "",
  max: 4,
  wrap: true,
});

/** While searching, what the search found goes first, so it is never folded away. */
const ordered = computed(() => {
  if (!props.query.trim()) return props.triggers;
  return [ ...props.triggers ].sort((a, b) => Number(isMatch(b)) - Number(isMatch(a)));
});
const visible = computed(() => ordered.value.slice(0, props.max));
const hidden = computed(() => ordered.value.slice(props.max));

function isMatch(trigger: string): boolean {
  return triggerMatches(trigger, props.query);
}
</script>
```

- [ ] **Step 3: `ConfirmDeleteButton.vue`**

```vue
<template>
  <!--
    Delete in two clicks: the bin turns into a red "Delete" laid over its
    neighbours for four seconds. No dialog to get through, but no loss from a
    stray click either. A delete also takes the stored file with it.
  -->
  <span class="relative inline-flex">
    <button
      @click="arm"
      :aria-label="`Delete ${label}`"
      :class="glass ? 'adt-glass-btn' : 'adt-icon-btn is-danger'"
      title="Delete"
      type="button"
    >
      <span class="icon-[material-symbols--delete-outline-rounded]" />
    </button>
    <button
      ref="confirmButton"
      @blur="disarm"
      @click="confirm"
      @keydown.esc="disarm"
      v-if="armed"
      :class="[ 'adt-confirm-delete', { '!h-7': glass } ]"
      type="button"
    >
      Delete
    </button>
  </span>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  /** What is deleted, for screen readers. */
  label: string;
  /** Over a picture. */
  glass?: boolean;
}>(), {
  glass: false,
});

const emit = defineEmits<{ confirm: [] }>();

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
  emit("confirm");
}
</script>
```

- [ ] **Step 4: `PlayButton.vue`**

```vue
<template>
  <button
    :aria-label="playing ? `Stop ${label}` : `Play ${label}`"
    :class="[ 'adt-play', { 'is-playing': playing, 'is-lg': large } ]"
    :disabled="disabled"
    :title="playing ? 'Stop' : title"
    type="button"
  >
    <span v-if="playing" class="icon-[material-symbols--stop-rounded]" />
    <span v-else class="icon-[material-symbols--play-arrow-rounded]" />
  </button>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  /** What plays, for screen readers. */
  label: string;
  title?: string;
  playing?: boolean;
  /** As tall as a text field, beside one. */
  large?: boolean;
  disabled?: boolean;
}>(), {
  title: "Play",
  playing: false,
  large: false,
  disabled: false,
});
</script>
```

- [ ] **Step 5: `LibraryItem.vue`**

```vue
<template>
  <div class="flex items-center gap-2 border-b border-[var(--ad-border-subtle)] py-2.5 pl-1 pr-1.5 transition-colors hover:bg-white/[.03] sm:gap-3">
    <span :class="[ 'adt-drag-handle', { invisible: !draggable } ]" aria-hidden="true" title="Drag to reorder">
      <span class="icon-[material-symbols--drag-indicator]" />
    </span>
    <div :class="[ 'flex min-w-0 flex-1 items-center gap-3 transition-opacity', { 'opacity-45': !enabled } ]">
      <slot name="lead" />
      <div class="grid min-w-0 flex-1 items-center gap-x-6 gap-y-1.5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div class="min-w-0">
          <p :title="title" class="truncate text-sm font-bold text-[var(--ad-text-primary)]">
            <template v-for="(part, index) in highlight(title, query)" :key="index">
              <mark v-if="part.match" class="adt-mark">{{ part.text }}</mark>
              <template v-else>{{ part.text }}</template>
            </template>
          </p>
          <p v-if="$slots.meta" class="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-[var(--ad-text-muted)]">
            <slot name="meta" />
          </p>
        </div>
        <TriggerChips :query="query" :triggers="triggers" />
      </div>
    </div>
    <div class="flex shrink-0 items-center gap-0.5">
      <AppSwitch
        @update:model-value="emit('toggle', $event)"
        :label="`${title}: ${enabled ? 'on' : 'off'}`"
        :model-value="enabled"
        class="mr-2"
      />
      <button @click="emit('edit')" :aria-label="`Edit ${title}`" class="adt-icon-btn" title="Edit" type="button">
        <span class="icon-[material-symbols--edit-outline-rounded]" />
      </button>
      <ConfirmDeleteButton @confirm="emit('delete')" :label="title" />
    </div>
  </div>
</template>

<script setup lang="ts">
import ConfirmDeleteButton from "./ConfirmDeleteButton.vue";
import TriggerChips from "./TriggerChips.vue";

import AppSwitch from "@/components/AppSwitch.vue";
import { highlight } from "@/utils/library-search";

withDefaults(defineProps<{
  title: string;
  triggers: string[];
  enabled: boolean;
  /** Whether the handle shows: not while a search narrows the list. */
  draggable: boolean;
  query?: string;
}>(), {
  query: "",
});

const emit = defineEmits<{ toggle: [ value: boolean ]; edit: []; delete: [] }>();
</script>
```

- [ ] **Step 6: `LibrarySection.vue`**

```vue
<template>
  <section>
    <!--
      Heading, search and filters stay in view while the list scrolls under
      them. The dialog body is the scroller, so this sticks to its top edge on
      the dialog's own colour, a pixel above, because the edge falls between
      pixels and a sliver of what scrolled under would show.
    -->
    <div class="sticky -top-px z-20 bg-[var(--ad-surface-overlay)] pb-3 pt-px">
      <div class="flex min-h-12 items-center justify-between gap-3 pt-2">
        <h3 class="adt-section-title">
          {{ title }}
          <span v-if="entries.length" class="adt-section-count">· {{ entries.length }}</span>
        </h3>
        <div class="flex items-center gap-2">
          <slot name="actions" />
        </div>
      </div>
      <template v-if="entries.length">
        <AppSearchInput v-model="query" :placeholder="searchPlaceholder" class="mt-3" />
        <div v-if="showPills || filtering" class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <AppFilterPills v-if="showPills" v-model="filter" :options="pills" label="Show" />
          <p v-if="filtering" aria-live="polite" class="ml-auto text-sm font-semibold tabular-nums text-[var(--ad-text-muted)]">
            {{ shown.length }} of {{ entries.length }}
          </p>
        </div>
      </template>
    </div>

    <div ref="list" :class="listClass">
      <slot :entries="shown" :filtering="filtering" :query="query" />
    </div>

    <div v-if="!entries.length" class="flex flex-col items-center px-6 py-14 text-center">
      <span :class="[ emptyIcon, 'mb-4 text-5xl text-white/25' ]" />
      <p class="text-lg font-bold text-white">
        {{ emptyTitle }}
      </p>
      <p class="mt-1 max-w-md text-sm text-[var(--ad-text-muted)]">
        {{ emptyText }}
      </p>
      <div v-if="$slots.empty" class="mt-6 flex flex-wrap justify-center gap-2">
        <slot name="empty" />
      </div>
    </div>

    <div v-else-if="!shown.length" class="flex flex-col items-center px-6 py-14 text-center">
      <span class="icon-[material-symbols--search-off-rounded] mb-4 text-5xl text-white/25" />
      <p class="text-lg font-bold text-white">
        Nothing matches
      </p>
      <p class="mt-1 max-w-md text-sm text-[var(--ad-text-muted)]">
        No item has that in its name, triggers or source.
      </p>
      <AppButton @click="reset" auto class="mt-6" size="sm">
        Clear the search
      </AppButton>
    </div>

    <p v-else-if="filtering && shown.length > 1" class="mt-4 text-center text-xs text-[var(--ad-text-muted)]">
      Clear the search to drag items into a new order.
    </p>
  </section>
</template>

<script setup lang="ts">
import Sortable from "sortablejs";

import type { LibraryEntry, LibraryFilter, TriggerCategory } from "@/utils/library-search";

import AppButton from "@/components/AppButton.vue";
import AppFilterPills from "@/components/AppFilterPills.vue";
import AppSearchInput from "@/components/AppSearchInput.vue";
import { CATEGORY_LABELS, CATEGORY_ORDER, filterCounts, matchesFilter, searchLibrary } from "@/utils/library-search";

/**
 * A feature's list of items: the heading with its count and actions, the
 * search, the trigger filters, and the list itself, which the parent renders
 * through the default slot from the entries this hands it.
 *
 * Order is the user's own arrangement, since the engines pick at random among
 * matching items. So the list is filtered, never regrouped, and it can be
 * dragged whenever it shows everything.
 */
const props = withDefaults(defineProps<{
  title: string;
  entries: LibraryEntry[];
  emptyTitle: string;
  emptyText: string;
  emptyIcon?: string;
  searchPlaceholder?: string;
  /** Layout of the list: rows by default, a grid for pictures. */
  listClass?: string;
  categoryLabels?: Partial<Record<TriggerCategory, string>>;
}>(), {
  emptyIcon: "icon-[material-symbols--library-music-outline-rounded]",
  searchPlaceholder: "Search by name or trigger",
  listClass: "",
  categoryLabels: () => ({}),
});

const emit = defineEmits<{ reorder: [ from: number, to: number ] }>();

const query = ref("");
const filter = ref<LibraryFilter>("all");
const list = ref<HTMLElement>();
let sortable: Sortable | undefined;

const matching = computed(() => searchLibrary(props.entries, query.value));
const shown = computed(() => matching.value.filter(entry => matchesFilter(entry, filter.value)));
const filtering = computed(() => query.value.trim() !== "" || filter.value !== "all");
/** Which pills there are comes from the whole library, so they stay put while typing… */
const present = computed(() => filterCounts(props.entries));
/** …and their numbers from what the search leaves. */
const counts = computed(() => filterCounts(matching.value));
const showPills = computed(() => CATEGORY_ORDER.filter(category => present.value[category]).length >= 2 || present.value.off > 0);
const pills = computed(() => {
  const labels = { ...CATEGORY_LABELS, ...props.categoryLabels };
  const options = [ { value: "all", label: "All", count: counts.value.all } ];
  for (const category of CATEGORY_ORDER) {
    if (present.value[category]) options.push({ value: category, label: labels[category], count: counts.value[category] });
  }
  if (present.value.off) options.push({ value: "off", label: "Off", count: counts.value.off });
  return options;
});

onMounted(() => {
  if (!list.value) return;
  sortable = Sortable.create(list.value, {
    animation: 150,
    handle: ".adt-drag-handle",
    draggable: "[data-index]",
    ghostClass: "adt-sortable-ghost",
    disabled: filtering.value,
    onEnd({ from, item, oldIndex, newIndex }) {
      if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return;
      // Put the node back where Vue left it. Vue moves it itself once the array changes.
      from.removeChild(item);
      from.insertBefore(item, from.children[oldIndex] ?? null);
      emit("reorder", oldIndex, newIndex);
    },
  });
});

watch(filtering, (value) => {
  sortable?.option("disabled", value);
});

// A pill whose last item has gone (the last one off switched back on) goes back to All.
watch(present, (value) => {
  if (filter.value !== "all" && !value[filter.value]) filter.value = "all";
});

onBeforeUnmount(() => sortable?.destroy());

function reset() {
  query.value = "";
  filter.value = "all";
}
</script>
```

- [ ] **Step 7: `OptionRow.vue`**

```vue
<template>
  <!-- A settings row as the site's own settings pages draw them: what it is on the left, the control on the right. -->
  <div :class="[ 'flex flex-col gap-3 border-b border-[var(--ad-border-subtle)] py-4 last:border-b-0', { 'sm:flex-row sm:items-center sm:justify-between sm:gap-8': !stacked } ]">
    <div class="min-w-0">
      <p class="text-sm font-bold text-[var(--ad-text-primary)]">
        {{ title }}
      </p>
      <p v-if="description || $slots.description" class="mt-1 max-w-2xl text-sm text-[var(--ad-text-muted)]">
        <slot name="description">
          {{ description }}
        </slot>
      </p>
    </div>
    <div :class="stacked ? 'w-full' : 'shrink-0'">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title: string;
  description?: string;
  /** The control under the text, at full width: for a field rather than a switch. */
  stacked?: boolean;
}>(), {
  description: undefined,
  stacked: false,
});
</script>
```

- [ ] **Step 8: `TriggerField.vue`**

```vue
<template>
  <div>
    <div class="adt-field-label justify-between">
      <label :for="id">{{ label }}</label>
      <a
        :href="TRIGGER_DOCS[feature]"
        class="text-xs font-semibold text-[var(--ad-blue-300)] hover:text-white"
        rel="noopener noreferrer"
        target="_blank"
      >
        All triggers
      </a>
    </div>
    <AppTokenInput
      :id="id"
      v-model="triggers"
      :suggestions="TRIGGER_HINTS[feature]"
      :validate="validate"
      placeholder="Type a trigger and press Enter"
    />
    <p class="adt-field-hint">
      {{ TRIGGER_PATTERNS[feature] }}
    </p>
  </div>
</template>

<script setup lang="ts">
import type { TriggerFeature } from "@/utils/trigger-catalog";

import AppTokenInput from "@/components/AppTokenInput.vue";
import { TRIGGER_DOCS, TRIGGER_HINTS, TRIGGER_PATTERNS } from "@/utils/trigger-catalog";

const triggers = defineModel<string[]>({ required: true });

withDefaults(defineProps<{
  feature: TriggerFeature;
  id: string;
  label?: string;
  validate?: (trigger: string) => string;
}>(), {
  label: "Triggers",
  validate: undefined,
});
</script>
```

- [ ] **Step 9: `SoundSource.vue`** (the meta line of a sound row)

```vue
<template>
  <span :class="[ icon, 'shrink-0 text-sm' ]" />
  <span class="truncate">{{ text }}</span>
</template>

<script setup lang="ts">
import type { ISound } from "@/utils/storage";

const props = defineProps<{
  sound: ISound;
  voices: { value: string; label: string }[];
}>();

const icon = computed(() => {
  if (props.sound.tts) return "icon-[material-symbols--record-voice-over-outline-rounded]";
  if (props.sound.soundId || props.sound.base64) return "icon-[material-symbols--audio-file-outline-rounded]";
  return "icon-[material-symbols--link-rounded]";
});

const text = computed(() => {
  const { tts, soundId, base64, url } = props.sound;
  if (tts) {
    const voice = props.voices.find(option => option.value === tts.voiceURI)?.label;
    return `Text to speech · ${voice ?? "default voice"}`;
  }
  if (soundId || base64) return "Uploaded file";
  return url.replace(/^https?:\/\//, "") || "No source";
});
</script>
```

- [ ] **Step 10: Lint**, then **Checkpoint.** (Visual checks happen with the first feature, Task 6.)

---

### Task 5: Shared dialogs

**Files (in `components/Settings/Library/`):**
- Create: `UploadDialog.vue`, `SoundDialog.vue`, `TtsDialog.vue`

**Interfaces:**
- `UploadDialog`:
  - props `show`, `title`, `feature`, `accept`, `formats`, `fileIcon`, `noun: { one; other }`, `triggersFromName: (file) => string[]`, `namesHint`, `processing?`, `validate?`
  - emits `close`, `save({ files: File[]; fromNames: boolean; triggers: string[] })`
- `SoundDialog`:
  - v-models `name`, `url`, `triggers`
  - props `show`, `editing`, `hasFile`, `feature`, `urlError?`, `playing?`
  - emits `close`, `save`, `play`
- `TtsDialog`:
  - v-models `text`, `voice`, `rate`, `pitch`, `triggers`
  - props `show`, `editing`, `voices: { value; label }[]`, `speaking`, `feature`
  - emits `close`, `save`, `prelisten`

- [ ] **Step 1: `UploadDialog.vue`**

```vue
<template>
  <AppModal @close="emit('close')" :show="show" :title="title" ghost-close size="lg">
    <div class="space-y-6">
      <div
        @click="chooser?.click()"
        @dragleave.prevent="dragging = false"
        @dragover.prevent="dragging = true"
        @drop.prevent="onDrop"
        @keydown.enter.prevent="chooser?.click()"
        @keydown.space.prevent="chooser?.click()"
        :class="[ 'adt-dropzone', { 'is-over': dragging } ]"
        role="button"
        tabindex="0"
      >
        <span class="icon-[material-symbols--upload-rounded] mb-1 text-4xl text-white/70" />
        <p class="font-bold text-white">
          Drop files here, or click to choose
        </p>
        <p class="text-xs text-[var(--ad-text-muted)]">
          {{ formats }} · as many as you like
        </p>
        <input ref="chooser" @change="onChoose" :accept="accept" class="hidden" multiple type="file">
      </div>

      <div v-if="files.length">
        <p class="adt-field-label">
          {{ files.length }} {{ files.length === 1 ? "file" : "files" }} chosen
        </p>
        <ul class="max-h-64 overflow-y-auto rounded-[var(--ad-radius-lg)] bg-white/[.03]">
          <li
            v-for="(file, index) in files"
            :key="`${index}-${file.name}`"
            class="flex items-center gap-3 border-b border-[var(--ad-border-subtle)] py-2 pl-3 pr-1.5 last:border-b-0"
          >
            <span :class="[ fileIcon, 'shrink-0 text-lg text-[var(--ad-text-muted)]' ]" />
            <span :title="file.name" class="min-w-0 flex-1 truncate text-sm text-white">{{ file.name }}</span>
            <TriggerChips :max="3" :triggers="triggersOf(file)" class="max-w-[45%] justify-end" />
            <button @click="remove(index)" :aria-label="`Remove ${file.name}`" class="adt-icon-btn" title="Remove" type="button">
              <span class="icon-[material-symbols--close-rounded]" />
            </button>
          </li>
        </ul>
      </div>

      <div>
        <p class="adt-field-label">
          Triggers
        </p>
        <AppRadioGroup v-model="mode" :options="MODES" button-size="sm" />
        <p v-if="mode === 'names'" class="adt-field-hint">
          {{ namesHint }}
        </p>
        <div v-else class="mt-4">
          <AppTokenInput
            v-model="shared"
            :suggestions="TRIGGER_HINTS[feature]"
            :validate="validate"
            placeholder="Type a trigger and press Enter"
          />
          <p class="adt-field-hint">
            Every file gets these. Leave it empty to add the files without triggers.
          </p>
        </div>
      </div>
    </div>

    <template #footer>
      <AppButton @click="emit('close')" auto>
        Cancel
      </AppButton>
      <AppButton @click="save" :disabled="!files.length || processing" :loading="processing" auto type="primary">
        {{ files.length ? `Add ${files.length} ${files.length === 1 ? noun.one : noun.other}` : "Add" }}
      </AppButton>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import TriggerChips from "./TriggerChips.vue";

import type { TriggerFeature } from "@/utils/trigger-catalog";

import AppButton from "@/components/AppButton.vue";
import AppModal from "@/components/AppModal.vue";
import AppRadioGroup from "@/components/AppRadioGroup.vue";
import AppTokenInput from "@/components/AppTokenInput.vue";
import { TRIGGER_HINTS } from "@/utils/trigger-catalog";

/**
 * Adding several files at once. Each file shows the trigger its name will give
 * before anything is saved, which is the one thing the old dialog left to guess.
 */
const props = withDefaults(defineProps<{
  show: boolean;
  title: string;
  feature: TriggerFeature;
  /** `audio/*` or an exact type, `image/gif`. */
  accept: string;
  formats: string;
  fileIcon: string;
  noun: { one: string; other: string };
  /** The triggers a file's name gives. */
  triggersFromName: (file: File) => string[];
  namesHint: string;
  processing?: boolean;
  validate?: (trigger: string) => string;
}>(), {
  processing: false,
  validate: undefined,
});

const emit = defineEmits<{
  close: [];
  save: [ request: { files: File[]; fromNames: boolean; triggers: string[] } ];
}>();

const MODES = [
  { label: "From file names", value: "names" },
  { label: "The same for all", value: "shared" },
];

const files = ref<File[]>([]);
const mode = ref<string>("names");
const shared = ref<string[]>([]);
const dragging = ref(false);
const chooser = ref<HTMLInputElement>();

watch(() => props.show, (show) => {
  if (!show) return;
  files.value = [];
  mode.value = "names";
  shared.value = [];
  dragging.value = false;
});

function accepts(file: File): boolean {
  return props.accept.endsWith("/*") ? file.type.startsWith(props.accept.slice(0, -1)) : file.type === props.accept;
}

function addFiles(list: FileList | null | undefined) {
  const picked = Array.from(list ?? []).filter(accepts);
  if (picked.length) files.value = [ ...files.value, ...picked ];
}

function onDrop(event: DragEvent) {
  dragging.value = false;
  addFiles(event.dataTransfer?.files);
}

function onChoose(event: Event) {
  const input = event.target as HTMLInputElement;
  addFiles(input.files);
  input.value = ""; // so the same file can be chosen again
}

function remove(index: number) {
  files.value = files.value.filter((_, at) => at !== index);
}

function triggersOf(file: File): string[] {
  return mode.value === "names" ? props.triggersFromName(file) : shared.value;
}

function save() {
  emit("save", { files: [ ...files.value ], fromNames: mode.value === "names", triggers: [ ...shared.value ] });
}
</script>
```

- [ ] **Step 2: `SoundDialog.vue`**

```vue
<template>
  <AppModal @close="emit('close')" :show="show" :title="editing ? 'Edit sound' : 'Add a sound from a link'" ghost-close>
    <div class="space-y-5">
      <div v-if="hasFile" class="flex items-center gap-3 rounded-[var(--ad-radius-lg)] bg-white/[.04] p-3">
        <PlayButton @click="emit('play')" :playing="playing" label="this sound" />
        <div class="min-w-0">
          <p class="text-sm font-bold text-white">
            Uploaded file
          </p>
          <p class="text-xs text-[var(--ad-text-muted)]">
            Kept in this browser. Its name and triggers can be changed here.
          </p>
        </div>
      </div>
      <div v-else>
        <label class="adt-field-label" for="sound-url">Link to the sound</label>
        <div class="flex items-center gap-2">
          <div class="min-w-0 flex-1">
            <AppInput id="sound-url" v-model="url" placeholder="https://example.com/sound.mp3" type="url">
              <template #icon>
                <span class="icon-[material-symbols--link-rounded]" />
              </template>
            </AppInput>
          </div>
          <PlayButton @click="emit('play')" :disabled="!url" :playing="playing" label="the link" large />
        </div>
        <p v-if="urlError" class="adt-field-hint !text-[var(--ad-rose-500)]">
          {{ urlError }}
        </p>
        <p v-else class="adt-field-hint">
          An MP3, WAV or OGG file, on a link that starts with https://.
        </p>
      </div>

      <AppInput id="sound-name" v-model="name" label="Name" placeholder="Optional: shown in the list" />

      <TriggerField id="sound-triggers" v-model="triggers" :feature="feature" />
    </div>

    <template #footer>
      <AppButton @click="emit('close')" auto>
        Cancel
      </AppButton>
      <AppButton @click="emit('save')" auto type="primary">
        {{ editing ? "Save" : "Add sound" }}
      </AppButton>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import PlayButton from "./PlayButton.vue";
import TriggerField from "./TriggerField.vue";

import type { TriggerFeature } from "@/utils/trigger-catalog";

import AppButton from "@/components/AppButton.vue";
import AppInput from "@/components/AppInput.vue";
import AppModal from "@/components/AppModal.vue";

const name = defineModel<string>("name", { required: true });
const url = defineModel<string>("url", { required: true });
const triggers = defineModel<string[]>("triggers", { required: true });

withDefaults(defineProps<{
  show: boolean;
  editing: boolean;
  /** An uploaded sound, whose file is kept and whose link field is hidden. */
  hasFile: boolean;
  feature: TriggerFeature;
  urlError?: string;
  playing?: boolean;
}>(), {
  urlError: "",
  playing: false,
});

const emit = defineEmits<{ close: []; save: []; play: [] }>();
</script>
```

- [ ] **Step 3: `TtsDialog.vue`**

```vue
<template>
  <AppModal @close="emit('close')" :show="show" :title="editing ? 'Edit text-to-speech sound' : 'Generate a sound'" ghost-close>
    <div class="space-y-5">
      <AppInput id="tts-text" v-model="text" label="Text to speak" placeholder="e.g. One hundred and eighty!">
        <template #icon>
          <span class="icon-[material-symbols--record-voice-over-outline-rounded]" />
        </template>
      </AppInput>

      <AppSelect id="tts-voice" v-model="voice" :options="voiceOptions" label="Voice" />

      <div class="grid gap-x-8 sm:grid-cols-2">
        <div>
          <p class="adt-field-label">
            Speed <span class="font-medium text-[var(--ad-text-muted)]">{{ rate.toFixed(1) }}×</span>
          </p>
          <AppSlider v-model="rate" :max="2" :min="0.5" :show-value="false" :step="0.1" />
        </div>
        <div>
          <p class="adt-field-label">
            Pitch <span class="font-medium text-[var(--ad-text-muted)]">{{ pitch.toFixed(1) }}</span>
          </p>
          <AppSlider v-model="pitch" :max="2" :min="0" :show-value="false" :step="0.1" />
        </div>
      </div>

      <TriggerField id="tts-triggers" v-model="triggers" :feature="feature" />
    </div>

    <template #footer>
      <AppButton @click="emit('prelisten')" :disabled="!text" :loading="speaking" auto class="mr-auto">
        <span class="flex items-center gap-1.5">
          <span class="icon-[material-symbols--play-arrow-rounded] text-lg" />
          Listen
        </span>
      </AppButton>
      <AppButton @click="emit('close')" auto>
        Cancel
      </AppButton>
      <AppButton @click="emit('save')" :disabled="!text || !triggers.length" auto type="primary">
        {{ editing ? "Save" : "Add sound" }}
      </AppButton>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import TriggerField from "./TriggerField.vue";

import type { TriggerFeature } from "@/utils/trigger-catalog";

import AppButton from "@/components/AppButton.vue";
import AppInput from "@/components/AppInput.vue";
import AppModal from "@/components/AppModal.vue";
import AppSelect from "@/components/AppSelect.vue";
import AppSlider from "@/components/AppSlider.vue";

const text = defineModel<string>("text", { required: true });
const voice = defineModel<string>("voice", { required: true });
const rate = defineModel<number>("rate", { required: true });
const pitch = defineModel<number>("pitch", { required: true });
const triggers = defineModel<string[]>("triggers", { required: true });

const props = defineProps<{
  show: boolean;
  editing: boolean;
  voices: { value: string; label: string }[];
  speaking: boolean;
  feature: TriggerFeature;
}>();

const emit = defineEmits<{ close: []; save: []; prelisten: [] }>();

const voiceOptions = computed(() => [ { value: "", label: "Default voice" }, ...props.voices ]);
</script>
```

- [ ] **Step 4: Lint**, then **Checkpoint.**

---

### Task 6: WLED on the new layout

**Files:**
- Modify: `components/Settings/Wled.vue`. The panel template and script are rewritten; the card template (`v-else`) is kept byte for byte.

**Interfaces:**
- Consumes: Tasks 3–5; `setEffect` from `@/entrypoints/match.content/wled` (already imported today)

- [ ] **Step 1: Park the browser tab** at `about:blank` (CDP `navigate_page`), and check `curl -s :9222/json/list` shows no tab on `/matches/`.

- [ ] **Step 2: Replace the panel template.** This is everything inside `<template v-if="!$attrs['data-feature-index']">`, down to the card:

```vue
    <!-- Settings Panel -->
    <!--
      Visible overflow, or the list's heading could not stick: a container that
      clips is a scroll container of its own, and the heading would stick to it
      rather than to the dialog that actually scrolls.
    -->
    <div v-if="config" class="adt-container !overflow-visible">
      <div class="relative z-10 text-[var(--ad-text-secondary)]">
        <p class="mb-6 max-w-3xl">
          Lights your WLED strips, or calls any other link, on game events. Each effect plays on the triggers you give it.
        </p>

        <section class="mb-10">
          <h3 class="adt-section-title">
            Options
          </h3>
          <OptionRow stacked title="Boards">
            <template #description>
              Effects play only for throws on these boards, and on every board while the list is empty. An effect on
              <code class="adt-code">other</code> plays for throws on boards that aren't listed.
            </template>
            <AppTokenInput
              id="wled-boards"
              v-model="boardIds"
              :lowercase="false"
              :validate="validateBoardId"
              placeholder="Paste a board ID and press Enter"
            />
          </OptionRow>
          <OptionRow
            description="An effect that is already showing isn't sent again, so the lights don't start over."
            title="Don't restart a running effect"
          >
            <AppToggle v-model="config.wledFx.onlyOnce" size="sm" />
          </OptionRow>
        </section>

        <LibrarySection
          @reorder="moveEffect"
          :entries="entries"
          empty-icon="icon-[material-symbols--lightbulb-outline-rounded]"
          empty-text="Add an effect for each moment you want your lights to show, or import a list of them."
          empty-title="No effects yet"
          search-placeholder="Search effects by name, trigger or address"
          title="Effects"
        >
          <template #actions>
            <AppMenu :items="moreActions">
              <template #trigger="{ open, toggle }">
                <button @click="toggle" :aria-expanded="open" aria-label="More actions" class="adt-icon-btn" title="More" type="button">
                  <span class="icon-[material-symbols--more-horiz]" />
                </button>
              </template>
            </AppMenu>
            <AppMenu :items="addActions">
              <template #trigger="{ open, toggle }">
                <AppButton @click="toggle" :aria-expanded="open" auto size="sm" type="primary">
                  <span class="flex items-center gap-1">
                    <span class="icon-[material-symbols--add-rounded] text-lg" />
                    Add
                    <span class="icon-[material-symbols--expand-more-rounded] -mr-1 text-lg" />
                  </span>
                </AppButton>
              </template>
            </AppMenu>
          </template>

          <template #default="{ entries: shown, filtering, query }">
            <LibraryItem
              v-for="entry in shown"
              :key="stableKey(config.wledFx.effects[entry.index])"
              @delete="removeEffect(entry.index)"
              @edit="editEffect(entry.index)"
              @toggle="config.wledFx.effects[entry.index].enabled = $event"
              :data-index="entry.index"
              :draggable="!filtering"
              :enabled="entry.enabled"
              :query="query"
              :title="entry.name"
              :triggers="entry.triggers"
            >
              <template #lead>
                <PlayButton @click="setEffect(config.wledFx.effects[entry.index])" :label="entry.name" title="Send this effect" />
              </template>
              <template #meta>
                <span :class="[ TYPE_ICONS[config.wledFx.effects[entry.index].type], 'shrink-0 text-sm' ]" />
                <span class="truncate">{{ describe(config.wledFx.effects[entry.index]) }}</span>
              </template>
            </LibraryItem>
          </template>

          <template #empty>
            <AppButton @click="openAddEffectModal" auto type="primary">
              New effect
            </AppButton>
            <AppButton @click="openImportCSVModal" auto>
              Import CSV
            </AppButton>
          </template>
        </LibrarySection>
      </div>
    </div>

    <!-- Import CSV -->
    <AppModal @close="closeImportCSVModal" :show="showImportCSVModal" ghost-close size="lg" title="Import effects from CSV">
      <div class="space-y-4">
        <p class="text-sm text-[var(--ad-text-muted)]">
          One effect per line, its fields separated by semicolons, in one of these forms:
        </p>
        <pre class="adt-code-block">{{ csvImportPlaceholder }}</pre>
        <AppTextarea
          id="csv-data"
          v-model="csvData"
          :autosize="false"
          :rows="8"
          label="CSV"
          monospace
          placeholder="gameon;URL;http://wled-device.local/win/PL=1;gameon"
        />
        <AppAlert v-if="csvError" compact variant="error">
          {{ csvError }}
        </AppAlert>
      </div>
      <template #footer>
        <AppButton @click="closeImportCSVModal" auto>
          Cancel
        </AppButton>
        <AppButton @click="processCSV" :disabled="!csvData" auto type="primary">
          Import
        </AppButton>
      </template>
    </AppModal>

    <!-- Effect (add / edit) -->
    <AppModal @close="closeEffectModal" :show="showEffectModal" :title="isEditMode ? 'Edit effect' : 'New effect'" ghost-close>
      <div class="space-y-5">
        <AppInput id="effect-name" v-model="newEffect.name" label="Name" placeholder="Optional: shown in the list" />

        <div>
          <p class="adt-field-label">
            Type
          </p>
          <AppRadioGroup v-model="newEffect.type" :options="EFFECT_TYPES" button-size="sm" />
          <p class="adt-field-hint">
            {{ TYPE_HINTS[newEffect.type] }}
          </p>
        </div>

        <template v-if="newEffect.type === WledType.PRESET">
          <div>
            <AppInput id="effect-url" v-model="newEffect.url" label="WLED address" placeholder="wled-device.local or 192.168.0.69">
              <template #icon>
                <span class="icon-[material-symbols--router-outline-rounded]" />
              </template>
            </AppInput>
            <p v-if="urlError" class="adt-field-hint !text-[var(--ad-rose-500)]">
              {{ urlError }}
            </p>
            <p v-else-if="newEffect.url && !newEffect.url.startsWith('https://')" class="adt-field-hint !text-[var(--ad-warning)]">
              A plain http:// address works on your own network, but a browser may block it as mixed content.
            </p>
          </div>
          <div>
            <AppSelect id="effect-preset" v-model="newEffect.preset" :options="availablePresetsOptions" label="Preset" />
            <p v-if="presetError" class="adt-field-hint !text-[var(--ad-rose-500)]">
              {{ presetError }}
            </p>
            <p v-else class="adt-field-hint">
              Read from the device's presets.json once the address is typed.
            </p>
          </div>
        </template>

        <div v-if="newEffect.type === WledType.URL">
          <AppInput id="effect-url" v-model="newEffect.url" label="Link" placeholder="http://wled-device.local/win/PL=1">
            <template #icon>
              <span class="icon-[material-symbols--link-rounded]" />
            </template>
          </AppInput>
          <p v-if="urlError" class="adt-field-hint !text-[var(--ad-rose-500)]">
            {{ urlError }}
          </p>
          <p v-else-if="newEffect.url.startsWith('http://')" class="adt-field-hint !text-[var(--ad-warning)]">
            A plain http:// link works on your own network, but a browser may block it as mixed content.
          </p>
        </div>

        <template v-if="newEffect.type === WledType.API">
          <div>
            <AppInput id="effect-url" v-model="newEffect.url" label="API endpoint" placeholder="http://wled-device.local/json">
              <template #icon>
                <span class="icon-[material-symbols--link-rounded]" />
              </template>
            </AppInput>
            <p v-if="urlError" class="adt-field-hint !text-[var(--ad-rose-500)]">
              {{ urlError }}
            </p>
            <p v-else-if="newEffect.url.startsWith('http://')" class="adt-field-hint !text-[var(--ad-warning)]">
              A plain http:// link works on your own network, but a browser may block it as mixed content.
            </p>
          </div>
          <div>
            <AppTextarea id="wled-json-api" v-model="newEffect.json_api" :autosize="false" :rows="6" label="JSON" monospace placeholder="{}" />
            <p v-if="jsonError" class="adt-field-hint !text-[var(--ad-rose-500)]">
              {{ jsonError }}
            </p>
          </div>
        </template>

        <TriggerField id="effect-triggers" v-model="effectTriggers" feature="wled" />
      </div>

      <template #footer>
        <AppButton @click="testDraft" :disabled="!canTestDraft" auto class="mr-auto">
          <span class="flex items-center gap-1.5">
            <span class="icon-[material-symbols--play-arrow-rounded] text-lg" />
            Test
          </span>
        </AppButton>
        <AppButton @click="closeEffectModal" auto>
          Cancel
        </AppButton>
        <AppButton @click="saveEffect" auto type="primary">
          {{ isEditMode ? "Save" : "Add effect" }}
        </AppButton>
      </template>
    </AppModal>

    <!-- Delete all -->
    <AppModal @close="closeDeleteAllModal" :show="showDeleteAllModal" :title="`Delete all ${config?.wledFx.effects.length ?? 0} effects?`" ghost-close size="sm">
      <p class="text-sm text-[var(--ad-text-muted)]">
        They're removed for good. This can't be undone.
      </p>
      <template #footer>
        <AppButton @click="closeDeleteAllModal" auto>
          Cancel
        </AppButton>
        <AppButton @click="deleteAllEffects" auto type="danger">
          Delete all
        </AppButton>
      </template>
    </AppModal>

    <AppNotification
      @close="hideNotification"
      :show="notification.show"
      :message="notification.message"
      :type="notification.type"
    />
```

- [ ] **Step 3: Rewrite the script.**
  - **Imports:** `AppAlert`, `AppButton`, `AppInput`, `AppMenu`, `AppModal`, `AppNotification`, `AppRadioGroup`, `AppSelect`, `AppTextarea`, `AppToggle` and `AppTokenInput` (`../App*.vue`); `LibraryItem`, `LibrarySection`, `OptionRow`, `PlayButton`, `TriggerField` and `stableKey` (`./Library/…`); `type LibraryEntry`; `useNotification`; `setEffect`; `type IWled`; `WledType` from `#imports`.
  - **Drop:** `Sortable`, `nextTick`/`onMounted` usage, `AppDropdown`, `allowAdd`, `effectsContainer`, `containerKey`, `sortableInstance`, `initSortable`, `wledTrigger`, `wledBoardIds`, `triggerPlaceholder`, `boardIdsPlaceholder`, `toggleEffect`.
  - **Keep verbatim:** `stringToWledType`, `parseCSV`, `processCSV`, `openImportCSVModal`, `closeImportCSVModal`, `toggleFeature`, `sortEffectsByTriggers`, `openDeleteAllModal`, `closeDeleteAllModal`, `deleteAllEffects`, and `fetchPresets` (only its options ref retyped).
  - **New and changed:**

```ts
const EFFECT_TYPES = [
  { label: "Preset", value: WledType.PRESET },
  { label: "URL", value: WledType.URL },
  { label: "JSON API", value: WledType.API },
];

const TYPE_HINTS: Record<WledType, string> = {
  [WledType.PRESET]: "Plays a preset saved on your WLED device, picked from its own list.",
  [WledType.URL]: "Calls a link: a WLED API call such as /win/PL=1, or anything else.",
  [WledType.API]: "Sends a JSON body to WLED's /json endpoint.",
};

const TYPE_ICONS: Record<WledType, string> = {
  [WledType.PRESET]: "icon-[material-symbols--lightbulb-outline-rounded]",
  [WledType.URL]: "icon-[material-symbols--link-rounded]",
  [WledType.API]: "icon-[material-symbols--data-object-rounded]",
};

const BOARD_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const effectTriggers = ref<string[]>([]);
const availablePresetsOptions = ref<{ value: string; label: string }[]>([ { value: "0", label: "Type the address first" } ]);

const boardIds = computed<string[]>({
  get: () => config.value?.wledFx.boardIds ?? [],
  set: (ids) => {
    if (config.value) config.value.wledFx.boardIds = ids;
  },
});

const entries = computed<LibraryEntry[]>(() => (config.value?.wledFx.effects ?? []).map((effect, index) => {
  const triggers = triggerList(effect.triggers);
  return {
    index,
    name: effect.name || triggers[0] || "Untitled effect",
    triggers,
    source: `${effect.type} ${effect.url} ${effect.type === WledType.PRESET ? `preset ${effect.preset}` : ""}`,
    enabled: effect.enabled,
  };
}));

const canTestDraft = computed(() => !!newEffect.value.url.trim() && (newEffect.value.type !== WledType.PRESET || newEffect.value.preset !== "0"));

const addActions = [
  { label: "New effect", hint: "A preset, a link or a JSON API call", icon: "icon-[material-symbols--add-rounded]", action: openAddEffectModal },
  { label: "Import CSV", hint: "Several effects at once, one per line", icon: "icon-[material-symbols--content-paste-rounded]", action: openImportCSVModal },
];

const moreActions = computed(() => [
  {
    label: "Sort by trigger",
    hint: "Puts the list in trigger order",
    icon: "icon-[material-symbols--sort-by-alpha-rounded]",
    disabled: (config.value?.wledFx.effects.length ?? 0) < 2,
    action: sortEffectsByTriggers,
  },
  {
    label: "Delete all…",
    icon: "icon-[material-symbols--delete-outline-rounded]",
    danger: true,
    separated: true,
    disabled: !config.value?.wledFx.effects.length,
    action: openDeleteAllModal,
  },
]);

watch(() => [ newEffect.value.url, newEffect.value.type ], async () => {
  if (newEffect.value.type === WledType.PRESET && newEffect.value.url) await fetchPresets();
});

/** Stored triggers are an array, or a newline-separated string in configs from before. */
function triggerList(triggers: string | string[]): string[] {
  return Array.isArray(triggers) ? triggers : String(triggers || "").split("\n").map(t => t.trim()).filter(Boolean);
}

function describe(effect: IWled): string {
  if (effect.type === WledType.PRESET) return `Preset ${effect.preset} · ${effect.url}`;
  if (effect.type === WledType.API) return `JSON API · ${effect.url}`;
  return effect.url;
}

function validateBoardId(id: string): string {
  return BOARD_ID.test(id) ? "" : "That doesn't look like a board ID. They look like 6a501a61-53a5-468a-a56a-17134ace3099.";
}

function moveEffect(from: number, to: number) {
  const effects = config.value?.wledFx.effects;
  if (!effects) return;
  const [ moved ] = effects.splice(from, 1);
  effects.splice(to, 0, moved);
}

function openAddEffectModal() {
  newEffect.value = { name: "", type: WledType.PRESET, url: "", preset: "0", json_api: "", triggers: "", enabled: true };
  effectTriggers.value = [];
  isEditMode.value = false;
  editingIndex.value = null;
  urlError.value = "";
  presetError.value = "";
  jsonError.value = "";
  showEffectModal.value = true;
}

function closeEffectModal() {
  newEffect.value = { name: "", type: WledType.PRESET, url: "", preset: "0", json_api: "", triggers: "", enabled: true };
  effectTriggers.value = [];
  showEffectModal.value = false;
  editingIndex.value = null;
  urlError.value = "";
  presetError.value = "";
  jsonError.value = "";
}

function editEffect(index: number) {
  const effect = config.value!.wledFx.effects[index];
  newEffect.value = {
    name: effect.name || "",
    type: effect.type,
    url: effect.url || "",
    preset: effect.preset || "0",
    json_api: effect.json_api || "",
    triggers: "",
    enabled: true,
  };
  effectTriggers.value = triggerList(effect.triggers);
  isEditMode.value = true;
  editingIndex.value = index;
  urlError.value = "";
  presetError.value = "";
  jsonError.value = "";
  showEffectModal.value = true;
}

/** The effect as the dialog holds it, to test before it is saved. */
function testDraft() {
  setEffect({ ...newEffect.value, url: newEffect.value.url.trim(), triggers: [ ...effectTriggers.value ] });
}
```

  `saveEffect` changes only in its trigger handling:
  - Replace the trigger check with `if (!effectTriggers.value.length) { showNotification("Please provide at least one trigger", "error"); return; }`.
  - Replace the `triggers` computation with `const triggers = [ ...effectTriggers.value ];`.
  - Everything else stays as it is.

  `removeEffect` stays as it is, with its notification.

- [ ] **Step 4: Rebuild check.** Wait ~5 s, then `stat -f "%Sm" .output/chrome-mv3-dev/content-scripts/content.js`, and grep the bundle for a string literal from the edit (`Don't restart a running effect`).
- [ ] **Step 5: Verify in the dev browser**, in my tab:
  - seed `adt:last-visited-url` to `/tools` and `adt:active-tab` to 3;
  - open WLED with the card's click-catcher;
  - screenshot the options, list, search and pills.

  Then check behaviour:
  - Search `192.168.2.95`: 1 of 13, the bull effect.
  - Search `t19`: the triples effect, with its `t19` chip surfaced out of the "+2".
  - Pills: at least *Throws*, *Events* and *Board* appear.
  - Drag the last row to the top and confirm the order in config (`node scratchpad/sw.mjs eval`), then drag it back.
  - Open *Add › New effect* and check that the suggestions show for `ga`.
  - Test the empty state by filtering to *Players*, which should show "Nothing matches".
- [ ] **Step 6: Lint** `components/Settings/Wled.vue` against its HEAD baseline, then **Checkpoint.**

---

### Task 7: Sound FX on the new layout

**Files:**
- Modify: `components/Settings/SoundFx.vue`. The panel template and script are rewritten; the card is kept.

- [ ] **Step 1: Park the tab**, then check there is no match tab.
- [ ] **Step 2: Replace the panel template:**

```vue
    <!-- Settings Panel -->
    <!-- Visible overflow so the list's heading can stick; see Wled.vue. -->
    <div v-if="config" class="adt-container !overflow-visible">
      <div class="relative z-10 text-[var(--ad-text-secondary)]">
        <p class="mb-6 max-w-3xl">
          Plays sound effects on game events, such as a crowd on a 180 or a groan on a bust. Each sound plays on the
          triggers you give it. Start them with <code class="adt-code">ambient_</code> to keep them apart from the Caller's.
        </p>

        <LibrarySection
          @reorder="moveSound"
          :entries="entries"
          empty-icon="icon-[material-symbols--graphic-eq-rounded]"
          empty-text="Upload sounds of your own, add one from a link, or generate one from text."
          empty-title="No sounds yet"
          search-placeholder="Search sounds by name or trigger"
          title="Sounds"
        >
          <template #actions>
            <AppMenu :items="moreActions">
              <template #trigger="{ open, toggle }">
                <button @click="toggle" :aria-expanded="open" aria-label="More actions" class="adt-icon-btn" title="More" type="button">
                  <span class="icon-[material-symbols--more-horiz]" />
                </button>
              </template>
            </AppMenu>
            <AppMenu :items="addActions">
              <template #trigger="{ open, toggle }">
                <AppButton @click="toggle" :aria-expanded="open" auto size="sm" type="primary">
                  <span class="flex items-center gap-1">
                    <span class="icon-[material-symbols--add-rounded] text-lg" />
                    Add
                    <span class="icon-[material-symbols--expand-more-rounded] -mr-1 text-lg" />
                  </span>
                </AppButton>
              </template>
            </AppMenu>
          </template>

          <template #default="{ entries: shown, filtering, query }">
            <LibraryItem
              v-for="entry in shown"
              :key="stableKey(config.soundFx.sounds[entry.index])"
              @delete="removeSound(entry.index)"
              @edit="editAny(entry.index)"
              @toggle="config.soundFx.sounds[entry.index].enabled = $event"
              :data-index="entry.index"
              :draggable="!filtering"
              :enabled="entry.enabled"
              :query="query"
              :title="entry.name"
              :triggers="entry.triggers"
            >
              <template #lead>
                <PlayButton @click="togglePlay(entry.index)" :label="entry.name" :playing="playingKey === stableKey(config.soundFx.sounds[entry.index])" />
              </template>
              <template #meta>
                <SoundSource :sound="config.soundFx.sounds[entry.index]" :voices="voices" />
              </template>
            </LibraryItem>
          </template>

          <template #empty>
            <AppButton @click="openUploadModal" auto type="primary">
              Upload files
            </AppButton>
            <AppButton @click="openTTSModal()" :disabled="!isTTSAvailable" auto>
              Generate a sound
            </AppButton>
            <AppButton @click="openAddSoundModal" auto>
              Add from a link
            </AppButton>
          </template>
        </LibrarySection>
      </div>
    </div>

    <SoundDialog
      v-model:name="newSound.name"
      v-model:triggers="newSound.triggers"
      v-model:url="newSound.url"
      @close="closeSoundModal"
      @play="previewDraft"
      @save="saveSound"
      :editing="isEditMode"
      :has-file="!!newSound.base64"
      :playing="playingKey === DRAFT_KEY"
      :show="showSoundModal"
      :url-error="urlError"
      feature="soundFx"
    />

    <UploadDialog
      @close="closeUploadModal"
      @save="processFiles"
      :noun="{ one: 'sound', other: 'sounds' }"
      :processing="isProcessing"
      :show="showUploadModal"
      :triggers-from-name="file => extractTriggerFromFilename(file.name)"
      accept="audio/*"
      feature="soundFx"
      file-icon="icon-[material-symbols--audio-file-outline-rounded]"
      formats="MP3, WAV or OGG"
      names-hint="A file named 180.mp3 plays on 180. Anything after a + is left out, so 180+crowd.mp3 does too."
      title="Upload sounds"
    />

    <TtsDialog
      v-model:pitch="ttsForm.pitch"
      v-model:rate="ttsForm.rate"
      v-model:text="ttsForm.text"
      v-model:triggers="ttsForm.triggers"
      v-model:voice="ttsForm.voiceURI"
      @close="closeTTSModal"
      @prelisten="prelistenTTS"
      @save="saveTTSSound"
      :editing="ttsEditingIndex !== null"
      :show="showTTSModal"
      :speaking="isSpeaking"
      :voices="voices"
      feature="soundFx"
    />

    <AppModal @close="closeDeleteAllModal" :show="showDeleteAllModal" :title="`Delete all ${config?.soundFx.sounds.length ?? 0} sounds?`" ghost-close size="sm">
      <p class="text-sm text-[var(--ad-text-muted)]">
        They're removed for good, stored files included. This can't be undone.
      </p>
      <template #footer>
        <AppButton @click="closeDeleteAllModal" auto>
          Cancel
        </AppButton>
        <AppButton @click="deleteAllSounds" auto type="danger">
          Delete all
        </AppButton>
      </template>
    </AppModal>

    <AppNotification
      @close="hideNotification"
      :show="notification.show"
      :message="notification.message"
      :type="notification.type"
    />
```

- [ ] **Step 3: Rewrite the script.**
  - **Imports:** as Task 6, plus `SoundDialog`, `SoundSource`, `TtsDialog` and `UploadDialog` (`./Library/…`), `useTTS`, and the IndexedDB helpers used today.
  - **Drop:** `Sortable`, `AppInput`, `AppSelect`, `AppSlider`, `AppTextarea`, `AppToggle` (the card still uses `AppToggle`, so keep that import), `allowAdd`, `soundsContainer`, `containerKey`, `sortableInstance`, `initSortable`, `fileInput`, `selectedFiles`, `isDragging`, `generateTriggersFromFilenames`, `bulkTrigger`, the drag, drop and select handlers (`triggerFileInput`, `onFileDragOver`, `onFileDragLeave`, `onFileDrop`, `onFileSelect`, `removeFile`), `lowercaseText`, `ttsLowercaseTriggers`, `textareaPlaceholder`, `ttsVoiceOptions` (TtsDialog builds it), `toggleSound`.
  - **Keep verbatim:** `removeSound`'s IndexedDB cleanup, `toggleFeature`, `extractTriggerFromFilename`, `fileToBase64`, `sortSoundsByTriggers`, `openDeleteAllModal`, `closeDeleteAllModal`, `deleteAllSounds`, `closeTTSModal`, `prelistenTTS`.
  - **New and changed:**

```ts
/** The playing key of a sound being tried out in the add/edit dialog, before it is in the list. */
const DRAFT_KEY = -1;

const newSound = ref({ url: "", name: "", base64: "", triggers: [] as string[] });
const ttsForm = ref({ text: "", name: "", voiceURI: "", lang: "", rate: 1, pitch: 1, triggers: [] as string[] });
const playingKey = ref<number | null>(null);

const entries = computed<LibraryEntry[]>(() => (config.value?.soundFx.sounds ?? []).map((sound, index) => {
  const triggers = Array.isArray(sound.triggers) ? sound.triggers : [];
  return {
    index,
    name: sound.name || sound.tts?.text || triggers[0] || "Untitled sound",
    triggers,
    source: sound.tts ? `tts ${sound.tts.text}` : sound.url || "uploaded",
    enabled: sound.enabled,
  };
}));

const addActions = computed(() => [
  { label: "Upload files", hint: "MP3, WAV or OGG, several at once", icon: "icon-[material-symbols--upload-rounded]", action: openUploadModal },
  {
    label: "Generate a sound",
    hint: isTTSAvailable.value ? "Text to speech, in a voice on this device" : "This device has no text-to-speech voices",
    icon: "icon-[material-symbols--record-voice-over-outline-rounded]",
    disabled: !isTTSAvailable.value,
    action: () => openTTSModal(),
  },
  { label: "Add from a link", hint: "A sound file on the web", icon: "icon-[material-symbols--link-rounded]", action: openAddSoundModal },
]);

const moreActions = computed(() => [
  { label: "Sort by trigger", hint: "Puts the list in trigger order", icon: "icon-[material-symbols--sort-by-alpha-rounded]", disabled: (config.value?.soundFx.sounds.length ?? 0) < 2, action: sortSoundsByTriggers },
  { label: "Delete all…", icon: "icon-[material-symbols--delete-outline-rounded]", danger: true, separated: true, disabled: !config.value?.soundFx.sounds.length, action: openDeleteAllModal },
]);

// Text to speech has no ended event of ours to hook, so follow useTTS.
watch(isSpeaking, (speaking) => {
  if (!speaking && playingKey.value !== null && !currentPlayer) playingKey.value = null;
});

onBeforeUnmount(stopPlayback);

function moveSound(from: number, to: number) {
  const sounds = config.value?.soundFx.sounds;
  if (!sounds) return;
  const [ moved ] = sounds.splice(from, 1);
  sounds.splice(to, 0, moved);
}

function editAny(index: number) {
  const sound = config.value!.soundFx.sounds[index];
  if (sound.tts) openTTSModal(sound, index);
  else editSound(index);
}

function togglePlay(index: number) {
  const sound = config.value!.soundFx.sounds[index];
  if (playingKey.value === stableKey(sound)) stopPlayback();
  else playSound(sound, stableKey(sound));
}

function previewDraft() {
  if (playingKey.value === DRAFT_KEY) {
    stopPlayback();
    return;
  }
  const { url, base64, name } = newSound.value;
  const soundId = isEditMode.value && editingIndex.value !== null ? config.value?.soundFx.sounds[editingIndex.value]?.soundId : undefined;
  playSound({ name, url: url.trim(), base64, soundId: base64 ? undefined : soundId, enabled: true, triggers: [] }, DRAFT_KEY);
}

function stopPlayback() {
  if (currentPlayer) {
    currentPlayer.pause();
    currentPlayer.currentTime = 0;
    currentPlayer = null;
  }
  stopPreview();
  playingKey.value = null;
}
```

  `playSound(sound, key)`: keep today's body, with four additions:
  - First line: `stopPlayback(); playingKey.value = key;`.
  - The TTS branch sets nothing more. The `isSpeaking` watcher clears it.
  - After `audio.src = source;` add `audio.addEventListener("ended", () => { if (currentPlayer === audio) { currentPlayer = null; playingKey.value = null; } });`.
  - Every error path (the `error` listener and the `play()` rejection) also sets `playingKey.value = null` and `currentPlayer = null`.

  Other functions:
  - `removeSound(index)`: `if (playingKey.value === stableKey(sound)) stopPlayback();` before today's body.
  - `openAddSoundModal`, `closeSoundModal` and `editSound`: `text` becomes `triggers: []`, or `triggers: [ ...sound.triggers ]` in `editSound`. `closeSoundModal` also calls `stopPlayback()` when `playingKey.value === DRAFT_KEY`.
  - `saveSound`: `if (!newSound.value.triggers.length) { showNotification("Please provide at least one trigger", "error"); return; }` and `const triggers = [ ...newSound.value.triggers ];`. The rest is unchanged.
  - `openUploadModal`: `showUploadModal.value = true;`. `closeUploadModal`: `showUploadModal.value = false;`.
  - `processFiles(request)`:

```ts
async function processFiles({ files, fromNames, triggers: shared }: { files: File[]; fromNames: boolean; triggers: string[] }) {
  if (!config.value || !files.length) return;
  isProcessing.value = true;
  let added = 0;

  try {
    for (const file of files) {
      try {
        const base64Data = await fileToBase64(file);
        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf("."));
        const triggers = fromNames ? extractTriggerFromFilename(file.name) : [ ...shared ];

        let soundId: string | null = null;
        if (isIndexedDBAvailable()) soundId = await saveSoundFxToIndexedDB(nameWithoutExt, base64Data);

        config.value.soundFx.sounds.unshift({
          name: nameWithoutExt,
          url: "",
          base64: soundId ? "" : base64Data, // only kept in config when IndexedDB is unavailable
          soundId: soundId || "",
          enabled: true,
          triggers,
        });
        added++;
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
      }
    }
    showNotification(`Added ${added} ${added === 1 ? "sound" : "sounds"}`);
  } catch (error) {
    console.error("Error processing files:", error);
    showNotification("Error processing files", "error");
  } finally {
    isProcessing.value = false;
    closeUploadModal();
  }
}
```

  TTS functions:
  - `openTTSModal`: `triggers: [ ...sound.triggers ]`, or `[]` when new.
  - `saveTTSSound`: `const triggers = [ ...ttsForm.value.triggers ];` and the guard `if (!config.value || !ttsForm.value.text || !ttsForm.value.triggers.length) return;`.

- [ ] **Step 4: Rebuild check.** Grep for `Search sounds by name or trigger`.
- [ ] **Step 5: Verify in the dev browser.**
  - Open Sound FX and screenshot it.
  - Search `ambient_miss`: 3 rows, `ambient_miss` chips highlighted.
  - Search `busted`: 2 rows, and so on.
  - Play a row: its button turns blue with a stop glyph. Stop it, then play another row, and the first one stops.
  - Add a TTS sound (`zz-test`, trigger `zz_test`). It appears first, with the meta "Text to speech · …". Edit it and check the triggers load as chips.
  - Delete it with the inline confirm.
  - Upload dialog: chips preview a filename using `upload_file` on its input with `scratchpad/180+crowd.mp3` (a copy of a short system sound). Cancel without saving.
- [ ] **Step 6: Lint**, then **Checkpoint.**

---

### Task 8: Caller on the new layout

**Files:**
- Modify: `components/Settings/Caller.vue`. The panel template and script are rewritten; the card is kept.

- [ ] **Step 1: Park the tab**, then check there is no match tab.
- [ ] **Step 2: Replace the panel template.** It is the Sound FX template from Task 7, with these differences:
  - **Intro:** `Calls out scores, checkouts and names during a match, in a voice of your choice. Each sound plays on the triggers you give it.`
  - **Options section** before the library:

```vue
        <section class="mb-10">
          <h3 class="adt-section-title">
            Options
          </h3>
          <OptionRow description="Call each dart as it lands, not only the visit's total." title="Call every dart">
            <AppToggle v-model="config.caller.callEveryDart" size="sm" />
          </OptionRow>
          <OptionRow description="Say what a player requires when they're on a finish, and in Gotcha the number left to the target." title="Call checkout">
            <AppToggle v-model="config.caller.callCheckout" size="sm" />
          </OptionRow>
          <OptionRow title="Prefer combined throws">
            <template #description>
              When there's a sound for the exact darts, such as <code class="adt-code">s20_s5_s1</code>, play it instead of the visit's total.
            </template>
            <AppToggle v-model="config.caller.preferCombinedThrows" size="sm" />
          </OptionRow>
        </section>
```

  - **Library:** every `config.soundFx.sounds` becomes `config.caller.sounds`, the empty icon is `icon-[material-symbols--record-voice-over-outline-rounded]`, and the empty text is `Import a ready-made caller set, upload recordings of your own, or generate them from text.`
  - **Empty actions:** *Import a caller set* (primary), then *Upload files*, *Generate a sound*, *Add from a link*.
  - Every `feature="soundFx"` becomes `feature="caller"`.
  - **Import a caller set dialog** (restyled; same state and handlers as today):

```vue
    <AppModal @close="closeImportURLModal" :show="showImportURLModal" ghost-close size="lg" title="Import a caller set">
      <div class="space-y-5">
        <AppSelect
          id="preset-url"
          v-model="selectedPresetURL"
          :options="callerSets"
          helper-text="From darts-downloads.peschi.org. Some sets may not play in Safari, and Tools for Autodarts isn't responsible for what they say."
          label="Caller set"
        />
        <div>
          <AppInput id="base-url" v-model="baseURL" label="Link" placeholder="https://darts-downloads.peschi.org/soundfiles/…" type="url">
            <template #icon>
              <span class="icon-[material-symbols--link-rounded]" />
            </template>
          </AppInput>
          <p class="adt-field-hint">
            Filled in from the set above, or a link of your own: a ZIP file, or a folder with files named 0.mp3 to 180.mp3.
            Triggers come from the file names. Links on darts-downloads.peschi.org, adt-socket.tobias-thiele.de and
            autodarts.x10.mx are supported.
          </p>
        </div>
        <AppAlert v-if="urlError" compact variant="error">
          {{ urlError }}
        </AppAlert>

        <div v-if="isZipFile && (isDownloadingZip || isExtractingZip || isProcessingCsv)" class="space-y-4 rounded-[var(--ad-radius-lg)] bg-white/[.04] p-4">
          <div v-if="isDownloadingZip">
            <div class="mb-1.5 flex justify-between text-xs">
              <span>Downloading the ZIP file…</span>
              <span class="tabular-nums">{{ zipDownloadProgress }}%</span>
            </div>
            <div class="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div :style="{ width: `${zipDownloadProgress}%` }" class="h-full rounded-full bg-[var(--ad-action-primary)] transition-all duration-300" />
            </div>
          </div>
          <div v-if="isExtractingZip">
            <div class="mb-1.5 flex justify-between text-xs">
              <span>Unpacking…</span>
              <span class="tabular-nums">{{ zipExtractedFiles }} / {{ zipTotalFiles || "?" }}</span>
            </div>
            <div class="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div :style="{ width: `${zipTotalFiles ? (zipExtractedFiles / zipTotalFiles) * 100 : 0}%` }" class="h-full rounded-full bg-[var(--ad-action-primary)] transition-all duration-300" />
            </div>
          </div>
          <div v-if="isProcessingCsv">
            <div class="mb-1.5 flex justify-between text-xs">
              <span>Matching sounds to triggers…</span>
              <span class="tabular-nums">{{ csvProcessingProgress }}%</span>
            </div>
            <div class="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div :style="{ width: `${csvProcessingProgress}%` }" class="h-full rounded-full bg-[var(--ad-action-primary)] transition-all duration-300" />
            </div>
          </div>
        </div>

        <div v-else-if="isImporting" class="rounded-[var(--ad-radius-lg)] bg-white/[.04] p-4">
          <div class="mb-1.5 flex justify-between text-xs">
            <span>Looking for sounds…</span>
            <span class="tabular-nums">{{ importedCount }} found</span>
          </div>
          <div class="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div :style="{ width: `${(importProgress / 181) * 100}%` }" class="h-full rounded-full bg-[var(--ad-action-primary)] transition-all duration-300" />
          </div>
        </div>
      </div>

      <template #footer>
        <AppButton @click="closeImportURLModal" auto>
          Cancel
        </AppButton>
        <AppButton
          @click="fetchSoundsFromURL"
          :disabled="!baseURL || isImporting || isDownloadingZip || isExtractingZip || isProcessingCsv"
          :loading="isImporting || isDownloadingZip || isExtractingZip || isProcessingCsv"
          auto
          type="primary"
        >
          Import
        </AppButton>
      </template>
    </AppModal>
```

  `callerSets[0]` label becomes `"Pick a set…"`. The rest of the list is unchanged.

- [ ] **Step 3: Rewrite the script.**
  - Apply Task 7's changes, with `config.caller.sounds`, the Caller IndexedDB helpers and the Caller notifications as they are today.
  - Keep the Caller's own `saveSound`, which updates an uploaded sound in place under its `soundId`; only its trigger handling changes, as in Task 7.
  - Keep the Caller's own `playSound` body, which uses the blob approach for data URIs; add the same `key`, `ended` and error bookkeeping.
  - Keep `processFiles`' one-second pause before its notification.
  - **Keep verbatim** everything behind *Import a caller set*: `openImportURLModal`, `closeImportURLModal`, `parseCSV`, `checkIfZipURL`, `downloadZipWithProgress`, `processCSVandSounds`, `extractZipWithProgress`, `fetchSoundsFromURL`, `checkAllowedDomain`, the `selectedPresetURL` watcher, and all the zip and import refs.
  - `generateTriggersFromURLFilenames` stays as the constant `true` it always was.
  - `addActions` for the Caller:

```ts
const addActions = computed(() => [
  { label: "Import a caller set", hint: "Ready-made voices in eight languages", icon: "icon-[material-symbols--library-music-outline-rounded]", action: openImportURLModal },
  { label: "Upload files", hint: "MP3, WAV or OGG, several at once", icon: "icon-[material-symbols--upload-rounded]", action: openUploadModal },
  {
    label: "Generate a sound",
    hint: isTTSAvailable.value ? "Text to speech, in a voice on this device" : "This device has no text-to-speech voices",
    icon: "icon-[material-symbols--record-voice-over-outline-rounded]",
    disabled: !isTTSAvailable.value,
    action: () => openTTSModal(),
  },
  { label: "Add from a link", hint: "A sound file on the web", icon: "icon-[material-symbols--link-rounded]", action: openAddSoundModal },
]);
```

- [ ] **Step 4: Rebuild check.** Grep for `Prefer combined throws` together with `Search sounds by name or trigger`. Both are in the content bundle.
- [ ] **Step 5: Verify in the dev browser.**
  - Screenshot the Caller at the top, and scrolled 3,000 px down: the heading, search and pills are stuck.
  - Search `26`: the `26` row first, then `126`.
  - Search `150`: nothing, unless a range covers it.
  - Search `zane`: 6 or so rows, `zane` marked in the titles.
  - Pills: *Scores* 181, *Players* about 27.
  - Toggle *Call every dart* on and back off, and confirm through `sw.mjs eval` that the config is back.
  - Open *Import a caller set* and check that picking *DE - Daniel* fills the link. Cancel without importing.
  - The inline delete arms and disarms on blur, without deleting.
- [ ] **Step 6: Lint**, then **Checkpoint.**

---

### Task 9: Animations on the new layout

**Files:**
- Modify: `components/Settings/Animations.vue`. The panel template and script are rewritten; the card is kept.

- [ ] **Step 1: Park the tab**, then check there is no match tab.
- [ ] **Step 2: Replace the panel template:**

```vue
    <!-- Settings Panel -->
    <!-- Visible overflow so the list's heading can stick; see Wled.vue. -->
    <div v-if="config" class="adt-container !overflow-visible">
      <div class="relative z-10 text-[var(--ad-text-secondary)]">
        <p class="mb-6 max-w-3xl">
          Shows a GIF over the board at the moments you pick: a 180, a bull, a bust, a won leg. A click puts it away early.
        </p>

        <section class="mb-10">
          <h3 class="adt-section-title">
            Options
          </h3>
          <OptionRow description="Seconds between the dart and the animation." title="Start delay">
            <div class="flex items-center gap-2">
              <div class="w-24">
                <AppInput
                  @update:model-value="setSeconds('delayStart', $event, 0)"
                  :model-value="String(config.animations.delayStart ?? 1)"
                  class="text-right"
                  min="0"
                  size="sm"
                  step="0.1"
                  type="number"
                />
              </div>
              <span class="text-sm">s</span>
            </div>
          </OptionRow>
          <OptionRow description="Seconds an animation stays up." title="Show for">
            <div class="flex items-center gap-2">
              <div class="w-24">
                <AppInput
                  @update:model-value="setSeconds('duration', $event, 0.5)"
                  :model-value="String(config.animations.duration ?? 5)"
                  class="text-right"
                  min="0.5"
                  size="sm"
                  step="0.5"
                  type="number"
                />
              </div>
              <span class="text-sm">s</span>
            </div>
          </OptionRow>
          <OptionRow description="Cover fills the space and may crop the GIF. Contain shows all of it." title="Fit">
            <AppRadioGroup v-model="objectFit" :options="FITS" button-size="sm" />
          </OptionRow>
          <OptionRow description="Just the board, or the whole page over a blurred background." title="Covers">
            <AppRadioGroup v-model="viewMode" :options="VIEW_MODES" button-size="sm" />
          </OptionRow>
        </section>

        <LibrarySection
          @reorder="moveAnimation"
          :category-labels="{ players: 'Other' }"
          :entries="entries"
          empty-icon="icon-[material-symbols--animated-images-outline-rounded]"
          empty-text="Upload GIFs from your computer, or add one from a link. Links from Tenor and Giphy work."
          empty-title="No animations yet"
          list-class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
          search-placeholder="Search animations by trigger or link"
          title="Animations"
        >
          <template #actions>
            <AppMenu :items="moreActions">
              <template #trigger="{ open, toggle }">
                <button @click="toggle" :aria-expanded="open" aria-label="More actions" class="adt-icon-btn" title="More" type="button">
                  <span class="icon-[material-symbols--more-horiz]" />
                </button>
              </template>
            </AppMenu>
            <AppMenu :items="addActions">
              <template #trigger="{ open, toggle }">
                <AppButton @click="toggle" :aria-expanded="open" auto size="sm" type="primary">
                  <span class="flex items-center gap-1">
                    <span class="icon-[material-symbols--add-rounded] text-lg" />
                    Add
                    <span class="icon-[material-symbols--expand-more-rounded] -mr-1 text-lg" />
                  </span>
                </AppButton>
              </template>
            </AppMenu>
          </template>

          <template #default="{ entries: shown, filtering, query }">
            <div
              v-for="entry in shown"
              :key="stableKey(config.animations.data[entry.index])"
              :ref="observeTile"
              :data-index="entry.index"
              class="flex flex-col overflow-hidden rounded-[var(--ad-radius-lg)] bg-[var(--ad-surface-sunken)] ring-1 ring-inset ring-[var(--ad-border-subtle)]"
            >
              <div class="relative aspect-video overflow-hidden bg-black/40">
                <img
                  :alt="`Animation on ${entry.triggers.join(', ') || 'no trigger'}`"
                  :class="[ 'size-full object-cover transition', { 'opacity-30 grayscale': !entry.enabled } ]"
                  :src="getAnimationSource(config.animations.data[entry.index])"
                  loading="lazy"
                >
                <span v-if="!filtering" class="adt-drag-handle is-glass absolute left-2 top-2" title="Drag to reorder">
                  <span class="icon-[material-symbols--drag-indicator]" />
                </span>
                <div class="absolute right-2 top-2 flex gap-1">
                  <button @click="editAnimation(entry.index)" aria-label="Edit animation" class="adt-glass-btn" title="Edit" type="button">
                    <span class="icon-[material-symbols--edit-outline-rounded]" />
                  </button>
                  <ConfirmDeleteButton @confirm="removeAnimation(entry.index)" glass label="animation" />
                </div>
                <span v-if="!entry.enabled" class="adt-chip absolute bottom-2 left-2 !bg-black/70">Off</span>
              </div>
              <div class="flex items-center gap-2 p-2.5">
                <TriggerChips :max="2" :query="query" :triggers="entry.triggers" :wrap="false" class="flex-1" />
                <AppSwitch
                  @update:model-value="config.animations.data[entry.index].enabled = $event"
                  :label="`Animation on ${entry.name}: ${entry.enabled ? 'on' : 'off'}`"
                  :model-value="entry.enabled"
                />
              </div>
            </div>
          </template>

          <template #empty>
            <AppButton @click="openGifUploadModal" auto type="primary">
              Upload GIFs
            </AppButton>
            <AppButton @click="openAddAnimationModal" auto>
              Add from a link
            </AppButton>
          </template>
        </LibrarySection>
      </div>
    </div>

    <!-- Animation (add / edit) -->
    <AppModal @close="closeAnimationModal" :show="showAnimationModal" :title="isEditMode ? 'Edit animation' : 'Add an animation from a link'" ghost-close>
      <div class="space-y-5">
        <div v-if="previewSrc" class="overflow-hidden rounded-[var(--ad-radius-lg)] bg-black/40">
          <img :src="previewSrc" alt="Preview" class="mx-auto max-h-48 object-contain">
        </div>
        <div>
          <AppInput
            id="animation-url"
            v-model="newAnimation.url"
            :disabled="isUploadedGif"
            :label="isUploadedGif ? 'Uploaded GIF' : 'Link to a GIF'"
            :placeholder="isUploadedGif ? uploadedGifFilename : 'https://example.com/animation.gif'"
            type="url"
          >
            <template #icon>
              <span :class="isUploadedGif ? 'icon-[material-symbols--gif-box-outline-rounded]' : 'icon-[material-symbols--link-rounded]'" />
            </template>
          </AppInput>
          <p v-if="isUploadedGif" class="adt-field-hint">
            Kept in this browser as {{ uploadedGifFilename }}. Only its triggers can be changed.
          </p>
        </div>
        <TriggerField id="animation-triggers" v-model="animationTriggers" :validate="validateAnimationTrigger" feature="animations" />
      </div>
      <template #footer>
        <AppButton @click="closeAnimationModal" auto>
          Cancel
        </AppButton>
        <AppButton @click="saveAnimation" auto type="primary">
          {{ isEditMode ? "Save" : "Add animation" }}
        </AppButton>
      </template>
      <AppNotification @close="hideNotification" :message="notification.message" :show="notification.show" :type="notification.type" />
    </AppModal>

    <UploadDialog
      @close="closeGifUploadModal"
      @save="processGifFiles"
      :noun="{ one: 'GIF', other: 'GIFs' }"
      :processing="isGifProcessing"
      :show="showGifUploadModal"
      :triggers-from-name="file => extractTriggersFromGifFilename(file.name)"
      :validate="validateAnimationTrigger"
      accept="image/gif"
      feature="animations"
      file-icon="icon-[material-symbols--gif-box-outline-rounded]"
      formats="GIF"
      names-hint="A file named 180.gif plays on 180. Join several with a +, as in 180+t20.gif. A name that isn't a trigger gives none."
      title="Upload GIFs"
    />

    <AppModal @close="closeDeleteAllModal" :show="showDeleteAllModal" :title="`Delete all ${config?.animations.data.length ?? 0} animations?`" ghost-close size="sm">
      <p class="text-sm text-[var(--ad-text-muted)]">
        They're removed for good, uploaded GIFs included. This can't be undone.
      </p>
      <template #footer>
        <AppButton @click="closeDeleteAllModal" auto>
          Cancel
        </AppButton>
        <AppButton @click="deleteAllAnimations" auto type="danger">
          Delete all
        </AppButton>
      </template>
    </AppModal>

    <AppNotification @close="hideNotification" :message="notification.message" :show="notification.show" :type="notification.type" />
```

- [ ] **Step 3: Rewrite the script.**
  - **Keep verbatim:** `getAnimationSource`, `loadAnimationSource`, the `animationSources` cache and its revoke on unmount, `toggleFeature`, `removeAnimation` (with its OPFS cleanup), `sortAnimationsByTriggers`, `deleteAllAnimations`, `extractTriggersFromGifFilename`, `fileToBlob`, `openDeleteAllModal`, `closeDeleteAllModal`.
  - **Drop:** `Sortable`, `animationsContainer`, `containerKey`, `isDragging`, `currentDragIndex`, `allowAdd`, `initSortable`, `updateIntersectionObserverForNewAnimations`, the `containerKey` watcher, `lowercaseText`, `textareaPlaceholder`, `gifFileInput`, `selectedGifFiles`, `isGifDragging`, `generateTriggersFromFilenamesGif`, `bulkTriggerGif`, and the GIF drag, drop and select handlers.
  - **New and changed:**

```ts
const FITS = [ { label: "Cover", value: "cover" }, { label: "Contain", value: "contain" } ];
const VIEW_MODES = [ { label: "Board only", value: "board-only" }, { label: "Full page", value: "full-page" } ];

const animationTriggers = ref<string[]>([]);

/**
 * GIFs load once they come near the view, and stay loaded: 20 remote GIFs
 * fetched and decoded at once was what the observer was for. Tiles register
 * themselves through a function ref, which the search re-renders without any
 * container query.
 */
const intersectionObserver = typeof IntersectionObserver === "undefined"
  ? null
  : new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const animation = config.value?.animations.data[Number((entry.target as HTMLElement).dataset.index)];
      if (animation) visibleAnimations.value.add(visibilityKey(animation));
    }
  }, { rootMargin: "200px", threshold: 0.1 });

const objectFit = computed({
  get: () => config.value?.animations.objectFit ?? "cover",
  set: (value: string) => {
    if (config.value) config.value.animations.objectFit = value as "cover" | "contain";
  },
});

const viewMode = computed({
  get: () => config.value?.animations.viewMode ?? "board-only",
  set: (value: string) => {
    if (config.value) config.value.animations.viewMode = value as "full-page" | "board-only";
  },
});

const entries = computed<LibraryEntry[]>(() => (config.value?.animations.data ?? []).map((animation, index) => {
  const triggers = Array.isArray(animation.triggers) ? animation.triggers : [];
  return {
    index,
    name: triggers.join(", ") || "animation",
    triggers,
    source: animation.animationId ? "uploaded" : animation.url,
    enabled: animation.enabled,
  };
}));

const previewSrc = computed(() => {
  const { url, animationId } = newAnimation.value;
  if (isUploadedGif.value && animationId) return animationSources.value[animationId] ?? "";
  return /^https?:\/\/\S+$/.test(url.trim()) ? url.trim() : "";
});

const addActions = [
  { label: "Upload GIFs", hint: "From your computer, several at once", icon: "icon-[material-symbols--upload-rounded]", action: openGifUploadModal },
  { label: "Add from a link", hint: "A GIF on the web, e.g. from Tenor or Giphy", icon: "icon-[material-symbols--link-rounded]", action: openAddAnimationModal },
];

const moreActions = computed(() => [
  { label: "Sort by trigger", hint: "Puts the grid in trigger order", icon: "icon-[material-symbols--sort-by-alpha-rounded]", disabled: (config.value?.animations.data.length ?? 0) < 2, action: sortAnimationsByTriggers },
  { label: "Delete all…", icon: "icon-[material-symbols--delete-outline-rounded]", danger: true, separated: true, disabled: !config.value?.animations.data.length, action: openDeleteAllModal },
]);

onUnmounted(() => intersectionObserver?.disconnect());

function visibilityKey(animation: IAnimation): string {
  return `${animation.animationId || `url_${animation.url}`}_${animation.triggers.join("_")}`;
}

function observeTile(element: Element | ComponentPublicInstance | null) {
  if (element instanceof Element) intersectionObserver?.observe(element);
}

function setSeconds(key: "delayStart" | "duration", value: string, min: number) {
  const seconds = Number(value);
  if (!config.value || value === "" || Number.isNaN(seconds)) return;
  config.value.animations[key] = Math.max(min, seconds);
}

function validateAnimationTrigger(trigger: string): string {
  return validateAnimationTriggers([ trigger ]).invalidTriggers.length ? "Animations don't know this trigger." : "";
}

function moveAnimation(from: number, to: number) {
  const data = config.value?.animations.data;
  if (!data) return;
  const [ moved ] = data.splice(from, 1);
  data.splice(to, 0, moved);
}
```

  `getAnimationSource` checks `visibleAnimations.value.has(visibilityKey(animation))`, the same key as before, via the helper.

  The editor functions:
  - `openAddAnimationModal`, `closeAnimationModal` and `editAnimation` set `animationTriggers` instead of `newAnimation.text`. `editAnimation` also calls `loadAnimationSource(animation)` when an uploaded GIF's object URL is not cached yet, for the preview.
  - `saveAnimation` validates `animationTriggers` exactly as it validated the text lines:
    - When there are invalid ones, drop them and show the same notification.
    - When none are left, show the same error.
    - It saves `triggers: validTriggers`.

  `processGifFiles(request)`:

```ts
async function processGifFiles({ files, fromNames, triggers: shared }: { files: File[]; fromNames: boolean; triggers: string[] }) {
  if (!config.value || !files.length) return;
  isGifProcessing.value = true;

  if (!isOPFSAvailable()) {
    showNotification("Your browser doesn't support file storage. Try a different browser.", "error");
    isGifProcessing.value = false;
    return;
  }

  try {
    let successCount = 0;
    const sharedTriggers = validateAnimationTriggers(shared).validTriggers;

    for (const file of files) {
      try {
        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf("."));
        const animation: IAnimation = {
          url: "", // stored in OPFS
          triggers: fromNames ? extractTriggersFromGifFilename(file.name) : [ ...sharedTriggers ],
          enabled: true,
        };

        const animationId = await saveAnimationToOPFS(nameWithoutExt, fileToBlob(file));
        if (!animationId) throw new Error("Failed to save animation to browser storage");

        animation.animationId = animationId;
        const objectURL = await getAnimationFromOPFS(animationId);
        if (objectURL) animationSources.value[animationId] = objectURL;

        config.value.animations.data.unshift(animation);
        successCount++;
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        showNotification(`Failed to process ${file.name}`, "error");
      }
    }

    closeGifUploadModal();
    showNotification(`Added ${successCount} GIFs`, "success");
  } catch (error) {
    console.error("Error processing files:", error);
    showNotification("Error processing files", "error");
  } finally {
    isGifProcessing.value = false;
  }
}
```

  `openGifUploadModal` and `closeGifUploadModal` just flip `showGifUploadModal`.

- [ ] **Step 4: Rebuild check.** Grep for `Search animations by trigger or link`.
- [ ] **Step 5: Verify in the dev browser.**
  - The grid has five columns at 1800 px; GIFs load, and the disabled state looks right after toggling one off and back on.
  - Search `180`: 4 tiles.
  - *Other* shows the `s50` tiles.
  - *Covers* and *Fit* toggle and write the config, then are put back.
  - The add dialog previews a pasted Tenor link and flags `zzz` as invalid, then is cancelled.
  - Drag a tile and put it back.
- [ ] **Step 6: Lint**, then **Checkpoint.**

---

### Task 10: Shell, docs, cleanup

**Files:**
- Modify: `components/PageConfig.vue` (Animations `wideSettings: true`), `README.md`, `CHANGELOG.md`, `components/SettingsModal.vue` (width comment)
- Delete: `components/AppDropDown.vue`, once `grep -rn AppDropDown components entrypoints` finds nothing

- [ ] **Step 1: `PageConfig.vue`.** Set `{ id: "animations", …, wideSettings: true }`.
- [ ] **Step 2: `SettingsModal.vue`.** Change the `width` comment's "Caller and Sound FX" to "the Sounds & Animations libraries, Colors".
- [ ] **Step 3: README.**
  - Add a **Search and filters** bullet to the Caller, Sound FX, WLED and Animations configuration lists.
  - Under Sound FX TTS, replace "Available in the Sound FX settings toolbar alongside Upload and Delete buttons" with "Under *Add › Generate a sound* in the Sound FX settings". The Caller's TTS line is changed the same way.
  - In WLED Board Filtering, "one per line" becomes "paste each under *Boards* and press Enter".
- [ ] **Step 4: CHANGELOG.** Add `## [Unreleased]` with one **Changed** entry (the new layout) and one **Added** entry (search and filters), in the file's own voice.
- [ ] **Step 5: Delete `AppDropDown.vue`** after the grep.
- [ ] **Step 6: Checkpoint.**

---

### Task 11: Verification and hand-over

- [ ] **Step 1:** Run `yarn compile` in the background and compare with the 16-error baseline, file by file.
- [ ] **Step 2:** Run `yarn build` (the store build) and expect success. Then check whether the dev watcher needs a `touch` to rebuild afterwards.
- [ ] **Step 3:** ESLint every new and modified file, against its HEAD baseline.
- [ ] **Step 4: Responsive pass.** Reload `/tools` at each width, since changing across the mobile breakpoint drops the overlay:
  - 1280 × 900 and 1024 × 768: all four dialogs.
  - 390 × 844 (mobile, touch): WLED and the Caller.
  - Then back to the dev window's own size.
- [ ] **Step 5: Config integrity.** Compare `config-2-0-0` with `storage-backup-initial.json`, ignoring nothing: they must be equal. Restore `urlstatus` and `adt:last-visited-url` to `https://play.autodarts.com/tools`.
- [ ] **Step 6:** Request the code review (superpowers:requesting-code-review). Fix what it confirms and re-verify.
- [ ] **Step 7:** Close my tab. Leave everything uncommitted.

---


## Appendix A: the libraries CSS for `assets/tailwind.css`

Added in Task 3, Step 2, before the disabled-tile section, verbatim:

```css
/* ------------------------------------------------------------- libraries ---
 * The lists in the Animations, Caller, Sound FX and WLED settings, and their
 * controls. Built from parts measured on the rebuilt site so they read as its
 * own: the friends drawer's search field and group headings, the Stats page's
 * pill tabs, the switch in its lists, its popovers. See
 * docs/superpowers/specs/2026-09-25-sound-and-light-libraries-redesign-design.md.
 */

/* Section heading with a count, as the friends drawer's "OFFLINE · 2". */
.adt-section-title {
  display: flex;
  gap: 6px;
  align-items: baseline;
  font-family: var(--ad-font-display);
  font-size: var(--ad-text-xl);
  font-weight: var(--ad-weight-bold);
  line-height: 1;
  color: var(--ad-text-primary);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.adt-section-count {
  color: var(--ad-text-muted);
}

/* The friends drawer's search field: a light pill on the dark surface. */
.adt-search {
  position: relative;
  display: flex;
  align-items: center;
}

.adt-search-input {
  width: 100%;
  height: 48px;
  padding: 0 48px 0 46px;
  font-family: var(--ad-font-body);
  font-size: var(--ad-text-base);
  font-weight: var(--ad-weight-bold);
  color: var(--ad-text-on-light);
  background: var(--ad-surface-input-light);
  border: 0;
  border-radius: var(--ad-radius-xl);
  outline: none;
  transition: var(--ad-transition-interactive);
}

.adt-search-input::placeholder {
  color: var(--ad-ink-500);
}

.adt-search-input:focus-visible {
  box-shadow: var(--ad-focus-ring);
}

.adt-search-input::-webkit-search-cancel-button {
  display: none;
}

.adt-search-icon {
  position: absolute;
  left: 16px;
  font-size: 20px;
  color: var(--ad-ink-500);
  pointer-events: none;
}

.adt-search-clear {
  position: absolute;
  right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  font-size: 18px;
  color: var(--ad-ink-500);
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: var(--ad-radius-md);
  transition: var(--ad-transition-interactive);
}

.adt-search-clear:hover {
  color: var(--ad-text-on-light);
  background: rgb(22 24 28 / 8%);
}

/* The Stats page's pill tabs, for filtering within one view. */
.adt-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.adt-pill {
  display: inline-flex;
  flex: none;
  gap: 6px;
  align-items: center;
  height: 32px;
  padding: 0 14px;
  font-family: var(--ad-font-body);
  font-size: var(--ad-text-sm);
  font-weight: var(--ad-weight-bold);
  line-height: 1;
  color: var(--ad-text-secondary);
  white-space: nowrap;
  cursor: pointer;
  background: rgb(255 255 255 / 10%);
  border: 0;
  border-radius: var(--ad-radius-full);
  transition: var(--ad-transition-interactive);
}

.adt-pill:hover:not(.is-active) {
  background: rgb(255 255 255 / 15%);
}

.adt-pill:focus-visible {
  outline: none;
  box-shadow: var(--ad-focus-ring);
}

.adt-pill.is-active {
  color: var(--ad-text-on-light);
  background: var(--ad-white);
}

/* A pill the search has left nothing under. */
.adt-pill.is-empty:not(.is-active) {
  opacity: 0.45;
}

.adt-pill-count {
  font-weight: var(--ad-weight-semibold);
  font-variant-numeric: tabular-nums;
  opacity: 0.65;
}

/* A trigger, as the tournament cards' small pills. */
.adt-chip {
  display: inline-flex;
  flex: none;
  align-items: center;
  max-width: 100%;
  height: 22px;
  padding: 0 8px;
  font-family: var(--ad-font-body);
  font-size: var(--ad-text-xs);
  font-weight: var(--ad-weight-semibold);
  line-height: 1;
  color: var(--ad-text-secondary);
  white-space: nowrap;
  background: rgb(255 255 255 / 8%);
  border-radius: var(--ad-radius-full);
}

.adt-chip.is-match {
  color: var(--ad-white);
  background: color-mix(in srgb, var(--ad-blue-400) 32%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ad-blue-400) 60%, transparent);
}

.adt-chip.is-more {
  color: var(--ad-text-muted);
}

.adt-chip.is-warning {
  color: var(--ad-warning);
  background: color-mix(in srgb, var(--ad-warning) 16%, transparent);
}

/* The part of a title the search found. */
.adt-mark {
  color: var(--ad-white);
  background: color-mix(in srgb, var(--ad-blue-400) 38%, transparent);
  border-radius: 3px;
}

/*
 * Forms/Switch as the site draws it in its lists (data-slot="switch", size
 * sm): blue when on, the sunken fill with a navy ring when off. The ring is a
 * site value with no token. The border stays, transparent, when on, so the
 * thumb travels the same box either way.
 */
.adt-switch {
  position: relative;
  display: inline-flex;
  flex: none;
  align-items: center;
  width: 43px;
  height: 20px;
  padding: 0;
  cursor: pointer;
  background: var(--ad-surface-chrome);
  border: 1px solid rgb(55 76 152 / 60%);
  border-radius: var(--ad-radius-full);
  box-shadow: 0 2px 2px rgb(13 13 13 / 50%), inset 0 -0.5px 0 rgb(255 255 255 / 8%);
  transition:
    background-color var(--ad-duration-fast) var(--ad-ease-standard),
    border-color var(--ad-duration-fast) var(--ad-ease-standard);
}

.adt-switch.is-on {
  background: var(--ad-action-primary);
  border-color: transparent;
}

.adt-switch:focus-visible {
  outline: none;
  box-shadow: var(--ad-focus-ring);
}

.adt-switch:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.adt-switch-thumb {
  display: block;
  width: 20px;
  height: 14px;
  background: var(--ad-white);
  border-radius: var(--ad-radius-full);
  box-shadow: 0 2px 2px rgb(13 13 13 / 50%);
  transform: translateX(2px);
  transition: transform var(--ad-duration-fast) var(--ad-ease-standard);
}

.adt-switch.is-on .adt-switch-thumb {
  transform: translateX(19px);
}

/* Core/IconButton, ghost: the dialog's close button, for actions in a row. */
.adt-icon-btn {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  font-size: 18px;
  color: var(--ad-text-muted);
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: var(--ad-radius-md);
  transition: var(--ad-transition-interactive);
}

.adt-icon-btn:hover:enabled,
.adt-icon-btn[aria-expanded="true"] {
  color: var(--ad-text-primary);
  background: rgb(255 255 255 / 7%);
}

.adt-icon-btn.is-danger:hover:enabled {
  color: var(--ad-rose-500);
  background: color-mix(in srgb, var(--ad-rose-500) 14%, transparent);
}

.adt-icon-btn:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

/* The same over a picture: dark glass, so it reads on any GIF. */
.adt-glass-btn {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  font-size: 16px;
  color: var(--ad-white);
  cursor: pointer;
  background: rgb(1 4 11 / 60%);
  border: 0;
  border-radius: var(--ad-radius-sm);
  backdrop-filter: blur(6px);
  transition: var(--ad-transition-interactive);
}

.adt-glass-btn:hover {
  background: rgb(1 4 11 / 82%);
}

/* The second click of a delete: the bin turns into this, laid over its neighbours. */
.adt-confirm-delete {
  position: absolute;
  top: 50%;
  right: 0;
  z-index: 10;
  height: 32px;
  padding: 0 12px;
  font-family: var(--ad-font-body);
  font-size: var(--ad-text-sm);
  font-weight: var(--ad-weight-bold);
  color: var(--ad-white);
  white-space: nowrap;
  cursor: pointer;
  background: var(--ad-danger);
  border: 0;
  border-radius: var(--ad-radius-md);
  box-shadow: var(--ad-shadow-popover);
  transform: translateY(-50%);
}

/*
 * Play or test: the square button beside each voice on the site's caller
 * settings. Neutral at rest, since a list has one per row, and blue while its
 * item plays, as colour marks what is on.
 */
.adt-play {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  font-size: 22px;
  color: var(--ad-text-primary);
  cursor: pointer;
  background: rgb(255 255 255 / 8%);
  border: 0;
  border-radius: var(--ad-radius-md);
  transition: var(--ad-transition-interactive);
}

.adt-play.is-lg {
  width: 52px;
  height: 52px;
  border-radius: var(--ad-radius-xl);
}

.adt-play:hover:enabled,
.adt-play.is-playing {
  background: var(--ad-action-primary);
}

.adt-play:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.adt-icon-btn:focus-visible,
.adt-glass-btn:focus-visible,
.adt-confirm-delete:focus-visible,
.adt-play:focus-visible {
  outline: none;
  box-shadow: var(--ad-focus-ring);
}

.adt-drag-handle {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 32px;
  font-size: 18px;
  color: var(--ad-text-disabled);
  cursor: grab;
  border-radius: 6px;
  transition: var(--ad-transition-interactive);
}

.adt-drag-handle:hover {
  color: var(--ad-text-secondary);
}

.adt-drag-handle:active {
  cursor: grabbing;
}

/* A handle over a picture takes the glass button's look. */
.adt-drag-handle.is-glass {
  width: 28px;
  height: 28px;
  font-size: 16px;
  color: var(--ad-white);
  background: rgb(1 4 11 / 60%);
  border-radius: var(--ad-radius-sm);
  backdrop-filter: blur(6px);
}

/* Where a dragged item will land. */
.adt-sortable-ghost {
  opacity: 0.35;
}

/* The Filters popover's surface (#292c33 on the site), for menus. */
.adt-menu {
  position: fixed;
  z-index: 60;
  min-width: 248px;
  max-width: calc(100vw - 32px);
  padding: 6px;
  background: var(--ad-ink-750);
  border-radius: var(--ad-radius-lg);
  outline: 1px solid rgb(255 255 255 / 10%);
  outline-offset: -1px;
  box-shadow: 0 0 12px 2px rgb(1 4 11 / 30%), var(--ad-shadow-popover);
}

.adt-menu-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  width: 100%;
  padding: 10px 12px;
  font-family: var(--ad-font-body);
  font-size: var(--ad-text-base);
  font-weight: var(--ad-weight-semibold);
  line-height: var(--ad-leading-snug);
  color: var(--ad-text-primary);
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: var(--ad-radius-md);
  transition: var(--ad-transition-interactive);
}

.adt-menu-item:hover:enabled,
.adt-menu-item:focus-visible {
  background: rgb(255 255 255 / 7%);
  outline: none;
}

.adt-menu-item:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.adt-menu-item.is-danger {
  color: var(--ad-rose-500);
}

.adt-menu-item-icon {
  flex: none;
  margin-top: 1px;
  font-size: 18px;
  color: var(--ad-text-muted);
}

.adt-menu-item.is-danger .adt-menu-item-icon {
  color: inherit;
}

.adt-menu-item-hint {
  display: block;
  margin-top: 2px;
  font-size: var(--ad-text-xs);
  font-weight: var(--ad-weight-medium);
  color: var(--ad-text-muted);
}

.adt-menu-divider {
  height: 1px;
  margin: 6px 8px;
  background: var(--ad-border-subtle);
}

/* A file drop target. */
.adt-dropzone {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  justify-content: center;
  min-height: 168px;
  padding: 24px;
  color: var(--ad-text-secondary);
  text-align: center;
  cursor: pointer;
  background: rgb(255 255 255 / 3%);
  border: 1.5px dashed var(--ad-border-strong);
  border-radius: var(--ad-radius-xl);
  transition: var(--ad-transition-interactive);
}

.adt-dropzone:hover {
  background: rgb(255 255 255 / 5%);
  border-color: rgb(255 255 255 / 28%);
}

.adt-dropzone.is-over {
  background: color-mix(in srgb, var(--ad-action-primary) 14%, transparent);
  border-color: var(--ad-action-primary);
}

.adt-dropzone:focus-visible {
  outline: none;
  box-shadow: var(--ad-focus-ring);
}

/* Chips in a field: the trigger and board-ID inputs. */
.adt-token-input {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  min-height: 52px;
  padding: 10px 12px;
  cursor: text;
  background: var(--ad-surface-input);
  border-radius: var(--ad-radius-xl);
  transition: var(--ad-transition-interactive);
}

.adt-token-input:focus-within {
  box-shadow: var(--ad-focus-ring);
}

.adt-token-input > input {
  flex: 1 0 140px;
  min-width: 0;
  height: 30px;
  padding: 0 4px;
  font-family: var(--ad-font-body);
  font-size: var(--ad-text-md);
  font-weight: var(--ad-weight-medium);
  color: var(--ad-text-primary);
  background: transparent;
  border: 0;
  outline: none;
}

.adt-token-input > input::placeholder {
  color: var(--ad-text-muted);
}

.adt-token {
  display: inline-flex;
  gap: 2px;
  align-items: center;
  max-width: 100%;
  height: 30px;
  padding: 0 4px 0 12px;
  font-family: var(--ad-font-body);
  font-size: var(--ad-text-sm);
  font-weight: var(--ad-weight-semibold);
  color: var(--ad-text-primary);
  background: rgb(255 255 255 / 10%);
  border-radius: var(--ad-radius-full);
}

.adt-token.is-invalid {
  color: var(--ad-white);
  background: color-mix(in srgb, var(--ad-rose-500) 30%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ad-rose-500) 60%, transparent);
}

.adt-token-remove {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  font-size: 15px;
  color: var(--ad-text-muted);
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: var(--ad-radius-full);
}

.adt-token-remove:hover {
  color: var(--ad-white);
  background: rgb(255 255 255 / 12%);
}

/* Suggestions under a trigger field, in the flow so a dialog never clips them. */
.adt-suggestions {
  margin-top: 6px;
  padding: 4px;
  background: rgb(255 255 255 / 4%);
  border-radius: var(--ad-radius-lg);
}

.adt-suggestion {
  display: flex;
  gap: 12px;
  align-items: baseline;
  width: 100%;
  padding: 8px 10px;
  font-family: var(--ad-font-body);
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: var(--ad-radius-md);
}

.adt-suggestion:hover,
.adt-suggestion.is-active {
  background: rgb(255 255 255 / 8%);
}

.adt-suggestion-trigger {
  flex: none;
  font-size: var(--ad-text-sm);
  font-weight: var(--ad-weight-bold);
  color: var(--ad-text-primary);
}

.adt-suggestion-text {
  min-width: 0;
  font-size: var(--ad-text-xs);
  color: var(--ad-text-muted);
}

/* Code in hints and descriptions. */
.adt-code {
  padding: 1px 5px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.92em;
  color: var(--ad-text-secondary);
  background: rgb(255 255 255 / 8%);
  border-radius: var(--ad-radius-xs);
}

.adt-code-block {
  padding: 12px 14px;
  overflow-x: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: var(--ad-text-xs);
  line-height: var(--ad-leading-normal);
  color: var(--ad-text-secondary);
  white-space: pre;
  background: rgb(255 255 255 / 4%);
  border-radius: var(--ad-radius-lg);
}
```
