# Colors: card and page schemes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Colors a colour scheme for the active player's card and one for the page: autodarts' own, presets, or a custom pair, with a live miniature of the match screen, the page texture kept and tinted, and an *Everywhere* switch.

**Architecture:** Everything Colors paints is built as a CSS string by a pure module (`utils/colors.ts`), so the match content script, a new site-wide applier in the all-pages content script, the settings preview and storage's migration all share one source. The only DOM-bound part, reading autodarts' page texture out of its own stylesheet, is in `utils/page-background.ts`.

**Tech Stack:** WXT 0.20, Vue 3.4 `<script setup>`, Tailwind 3.4, TypeScript. Pure-module checks run under `node_modules/.bin/tsx` from the repo root (it resolves `@/` there).

**Spec:** `docs/superpowers/specs/2026-09-24-colors-card-and-page-schemes-design.md`

## Global Constraints

- Colours stored and interpolated into CSS are `#rrggbb` only, lowercase. Anything else becomes "" or autodarts' own.
- Gradients are drawn `linear-gradient(to bottom right, FROM 0%, TO 100%)`, the site's own direction.
- autodarts' own colours: card `#75148b → #da3954`, page `#01040b → #001849`, idle cards `#16181c`, text `#f7f8fa`, bottom bar `#042963`.
- A scheme with `preset: "default"`, or an empty flat colour, draws no rule at all.
- Bust (`bg-grey-slush-diagonal`) and won-leg (`bg-game-shot-diagonal`) cards are never recoloured.
- Storage version goes 12 → 13; `defaultConfig.version` (22) is a different, older counter and is not touched.
- No bare `main` selector: always `#root main` or `SELECTORS` (FankiDarts plants a hidden `main`).
- Never edit sources while a dev-browser tab is on `/matches/`: park test tabs at `about:blank` first.

## Review Focus

1. **An exported settings file from before this change is imported or pasted.** Colors must load in the new shape, keeping the old colours, and the settings panel must not crash. → the Task 1 checks cover `normalizeColors` on the legacy shape, and Task 2 wires it into both import paths.
2. **A config value that is not a colour** (an imported file carrying `red; } body {display:none`). Nothing reaches a stylesheet. → Task 1 check "junk values".
3. **The site's stylesheet cannot be read** (a CSSOM access error, a renamed rule). The page must still get the new gradient with autodarts' mark kept. → Task 1 check "pageStyles without a mark"; Task 3 browser check with the texture lookup stubbed out.
4. **Three or more players, or a narrow window.** Every card must be recoloured, not only the first card of the wide layout's column. → Task 3 browser sweep at 1600, 1100 and 600 px, and with 3 players.
5. **A bust or a won leg.** They keep autodarts' colours, and the winner keeps its pattern. → Task 3 browser check, injecting `gameWinner`.

---

### Task 1: The pure core, `utils/colors.ts`

**Files:**
- Create: `utils/colors.ts`
- Modify: `utils/selectors.ts` (the `match` section, after `activePlayerCard`)
- Modify: `utils/storage.ts` (the `ColorScheme` type and the `colors` interface only; defaults and migration come in Task 2)
- Test: `$SCRATCHPAD/colors-check.mts` (the repo has no test runner; pure modules are checked with tsx)

**Interfaces:**
- Produces:
  - `type ColorsConfig = IConfig["colors"]`, and `interface ColorScheme { preset: string; from: string; to: string }` (exported from `utils/storage.ts`)
  - `SITE_CARD`, `SITE_PAGE` (`{ from, to }`), `SITE_CARDS`, `SITE_TEXT`, `SITE_ACTION_BAR` (strings)
  - `CARD_PRESETS`, `PAGE_PRESETS: readonly ColorPreset[]`, where `ColorPreset = { id, label, from, to }`
  - `defaultColors(): ColorsConfig`, `normalizeColors(saved: unknown): ColorsConfig`
  - `gradient({ from, to }): string`, `textureTint(hex): string`, `tintSvgFills(layer, color): string | undefined`
  - `pageLayers(page: ColorScheme, texture?: string): string`, `pageStyles(page: ColorScheme, texture?: string): string`, `matchStyles(colors: ColorsConfig): string`
  - `SELECTORS.match.activeHighlight`, `SELECTORS.match.idleCard`

- [ ] **Step 1: Change the `colors` type in `utils/storage.ts`**

Replace the `colors` block of `IConfig` with:

```ts
  colors: {
    enabled: boolean;
    /** The card of the player whose turn it is. */
    card: ColorScheme;
    /** The page behind the match, or behind every page with `everywhere`. */
    page: ColorScheme;
    everywhere: boolean;
    /** Every other card, and the throw bar. "" is autodarts' own, here and in the two below. */
    cards: string;
    text: string;
    actionBar: string;
  };
```

and add, after the `IConfig` interface:

```ts
/**
 * A gradient Colors paints: autodarts' own ("default", which draws nothing),
 * one of the presets in utils/colors.ts, or a pair picked by hand ("custom").
 * `from` and `to` always hold the colours it shows, so nothing that draws it
 * needs the preset list.
 */
export interface ColorScheme {
  preset: string;
  from: string;
  to: string;
}
```

- [ ] **Step 2: Add the selectors** in `utils/selectors.ts`, after `activePlayerCard`:

```ts
    /**
     * Whatever marks whose turn it is. That is the card in every layout, the
     * cell of a 3+ player top bar, cricket's player cells, and the
     * active-player chip and status pill. The site paints all of them with
     * this one gradient and uses it for nothing else on the match screen, so
     * Colors recolours exactly these.
     *
     * The fallback is for a renamed gradient. It skips the site's variant
     * classes: `aria-pressed:bg-raspberry-…` sits on buttons that show it only
     * while pressed, and a bare substring match would paint them all the time.
     */
    activeHighlight: [
      ".bg-raspberry-slush-diagonal",
      "[class*='bg-raspberry']:not([class*=':bg-raspberry'])",
    ],
    /**
     * A score card at rest, as a class on its face. The site puts a gradient on
     * the active, busted and winning card, and tailwind-merge takes the resting
     * colour off whenever it does, so these two mean idle and nothing else.
     * black-60 is the sidebar and top-bar layouts'.
     */
    idleCard: [ ".bg-black-80", ".bg-black-60" ],
```

- [ ] **Step 3: Write the failing check** `$SCRATCHPAD/colors-check.mts`:

```ts
import assert from "node:assert/strict";

import {
  CARD_PRESETS, PAGE_PRESETS, SITE_CARD, SITE_PAGE, defaultColors, gradient, matchStyles,
  normalizeColors, pageLayers, pageStyles, textureTint, tintSvgFills,
} from "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/utils/colors.ts";

const rgb = (hex: string) => [ 1, 3, 5 ].map(i => Number.parseInt(hex.slice(i, i + 2), 16));
const near = (a: string, b: string, tolerance = 6) => rgb(a).every((v, i) => Math.abs(v - rgb(b)[i]) <= tolerance);
const lum = (hex: string) => {
  const [ r, g, b ] = rgb(hex).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => { const [ x, y ] = [ lum(a), lum(b) ].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const unwrap = (layer: string) => decodeURIComponent(layer.slice("url(\"data:image/svg+xml,".length, -2));

// the site's own serialisation of its mark, trimmed: percent-encoded, single quotes, a named clip-path fill
const SITE_MARK = "url(\"data:image/svg+xml,%3csvg%20width='390'%20height='685'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cg%20clip-path='url(%23c)'%3e%3cpath%20d='M1%202L3%204Z'%20fill='%23003EB3'%20fill-opacity='0.15'/%3e%3c/g%3e%3cdefs%3e%3cclipPath%20id='c'%3e%3crect%20width='10'%20height='10'%20fill='white'/%3e%3c/clipPath%3e%3c/defs%3e%3c/svg%3e\")";

// tint: autodarts' own mark is blue-70 on blue-90, and a light page gets a darker mark
assert.ok(near(textureTint("#001849"), "#003eb3"), `tint of blue-90 is ${textureTint("#001849")}`);
assert.ok(lum(textureTint("#f0f0f0")) < lum("#f0f0f0"), "a light page gets a darker mark");
assert.match(textureTint("#262626"), /^#[0-9a-f]{6}$/);

// tintSvgFills: every colour fill, no named ones, and nothing that is not an SVG data URI
const tinted = tintSvgFills(SITE_MARK, "#123456");
assert.ok(tinted, "the site's mark is tintable");
assert.match(unwrap(tinted), /fill='#123456' fill-opacity='0.15'/);
assert.match(unwrap(tinted), /fill='white'/);
assert.match(unwrap(tinted), /fill='none'/);
assert.doesNotMatch(unwrap(tinted), /003EB3/i);
assert.equal(tintSvgFills("url(\"https://example.com/a.png\")", "#123456"), undefined);
assert.equal(tintSvgFills(`url("data:image/svg+xml,${encodeURIComponent("<svg><path fill='none'/></svg>")}")`, "#123456"), undefined);
assert.equal(tintSvgFills("url(\"data:image/svg+xml;base64,PHN2Zz4=\")", "#123456"), undefined);

// normalizeColors: the current shape, junk values
assert.deepEqual(normalizeColors(undefined), defaultColors());
assert.deepEqual(normalizeColors({
  enabled: true, everywhere: true,
  card: { preset: "lime", from: "#00653B", to: "#0a8a78" },
  page: { preset: "default", from: "#123456", to: "#654321" },
  cards: "#112233", text: "white", actionBar: "red; } body { display: none",
}), {
  enabled: true, everywhere: true,
  card: { preset: "lime", from: "#00653b", to: "#0a8a78" },
  page: { preset: "default", ...SITE_PAGE },
  cards: "#112233", text: "", actionBar: "",
});
assert.deepEqual(normalizeColors({ card: { preset: "retired", from: "#111111", to: "#222222" }, page: {} }).card,
  { preset: "custom", from: "#111111", to: "#222222" }, "a preset no longer offered keeps its colours");
assert.deepEqual(normalizeColors({ card: { preset: "custom", from: "url(x)", to: "#222222" }, page: {} }).card,
  { preset: "default", ...SITE_CARD }, "a pair with a junk colour is autodarts' own");

// normalizeColors: the shape before schemes
assert.deepEqual(normalizeColors({ enabled: true, background: "#3182CE", text: "#FFFFFF", matchBackground: "#3c3c3c", actionBar: "#042963" }), {
  enabled: true, everywhere: false,
  card: { preset: "custom", from: "#3182ce", to: "#3182ce" },
  page: { preset: "custom", from: "#3c3c3c", to: "#3c3c3c" },
  cards: "#3182ce", text: "#ffffff", actionBar: "",
}, "switched on, what it drew is kept, defaults included");
assert.deepEqual(normalizeColors({ enabled: false, background: "#3182CE", text: "#FFFFFF", matchBackground: "#3c3c3c", actionBar: "#042963" }),
  defaultColors(), "switched off at the defaults, nothing was chosen");
const moved = normalizeColors({ enabled: false, background: "#3182CE", text: "#FFFFFF", matchBackground: "#224466", actionBar: "#101010" });
assert.deepEqual(moved.page, { preset: "custom", from: "#224466", to: "#224466" }, "switched off, a moved colour was a choice");
assert.equal(moved.card.preset, "default");
assert.equal(moved.cards, "");
assert.equal(moved.actionBar, "#101010");
assert.deepEqual(normalizeColors({ enabled: true, background: "#000000", text: "#ffffff" }).page,
  { preset: "default", ...SITE_PAGE }, "v1's shape has no page colour");

// presets: unique ids, colours, and the card bar autodarts sets for itself
for (const list of [ CARD_PRESETS, PAGE_PRESETS ]) {
  assert.equal(new Set(list.map(p => p.id)).size, list.length);
  for (const p of list) assert.match(`${p.from}${p.to}`, /^#[0-9a-f]{6}#[0-9a-f]{6}$/, p.id);
  assert.ok(!list.some(p => p.id === "default" || p.id === "custom"));
}
for (const p of CARD_PRESETS) {
  assert.ok(contrast(p.from, "#f7f8fa") >= 4 && contrast(p.to, "#f7f8fa") >= 4, `${p.id} carries white text`);
  assert.ok(Math.max(contrast(p.from, "#16181c"), contrast(p.to, "#16181c")) >= 2.5, `${p.id} stands apart from a resting card`);
}

// matchStyles: only what was picked
assert.equal(matchStyles(defaultColors()).trim(), "");
const card = matchStyles({ ...defaultColors(), card: { preset: "lime", from: "#00653b", to: "#0a8a78" } });
assert.match(card, /#root main :is\(\.bg-raspberry-slush-diagonal, /);
assert.match(card, /background-image: linear-gradient\(to bottom right, #00653b 0%, #0a8a78 100%\) !important/);
assert.doesNotMatch(card, /background-color|grey-slush|game-shot/);
const flats = matchStyles({ ...defaultColors(), cards: "#101010", text: "#fafafa", actionBar: "#202020" });
assert.match(flats, /:is\(\.bg-black-80, \.bg-black-60\) \{\s*background-color: #101010 !important/);
assert.match(flats, /color: #fafafa !important/);
assert.match(flats, /background-color: #202020 !important/);
assert.doesNotMatch(flats, /raspberry/);

// pageStyles: the mark tinted when there is one, only the gradient swapped when not
const forest = { preset: "forest", from: "#01040b", to: "#003a22" };
const withMark = pageStyles(forest, SITE_MARK);
assert.match(withMark, /background-color: #01040b !important/);
assert.match(withMark, /background-image: url\("data:image\/svg\+xml,[^"]+"\), linear-gradient\(to bottom right, #01040b 0%, #003a22 100%\) !important/);
assert.doesNotMatch(withMark, /003EB3/i);
assert.ok(withMark.includes(encodeURIComponent(textureTint("#003a22"))), "the mark takes the page's tint");
const withoutMark = pageStyles(forest);
assert.match(withoutMark, /--background-image-midnight-diagonal: linear-gradient\(to bottom right, #01040b 0%, #003a22 100%\) !important/);
assert.doesNotMatch(withoutMark, /background-image:/);
assert.ok(pageLayers({ preset: "default", ...SITE_PAGE }, SITE_MARK).startsWith(SITE_MARK), "autodarts' own page keeps the mark as drawn");
assert.equal(pageLayers(forest), gradient(forest));

console.log("colors: every check passes");
```

- [ ] **Step 4: Run it to see it fail**

Run: `node_modules/.bin/tsx $SCRATCHPAD/colors-check.mts` (from the repo root)
Expected: FAIL, `Cannot find module …/utils/colors.ts`.

- [ ] **Step 5: Write `utils/colors.ts`**

```ts
import type { ColorScheme, IConfig } from "@/utils/storage";

import { SELECTORS, anyOf } from "@/utils/selectors";

/**
 * Colors: what the feature paints, as data and as stylesheets.
 *
 * Pure on purpose. The settings page, the match screen, the site-wide
 * background and storage's migration all build from here, so nothing in it may
 * touch the DOM or the extension APIs. Reading autodarts' own page texture has
 * to, so that part is in utils/page-background.ts.
 */

export type ColorsConfig = IConfig["colors"];

/** A colour pair on offer. */
export interface ColorPreset {
  id: string;
  label: string;
  from: string;
  to: string;
}

/**
 * autodarts' own colours: what "default" leaves in place, and what a picker
 * shows while nothing is picked. From the site's stylesheet, 2026-09-24. The
 * active card is `bg-raspberry-slush-diagonal`, fushia-80 into red-60, and the
 * page is midnight, black-90 into blue-90, both drawn to the bottom right.
 */
export const SITE_CARD = { from: "#75148b", to: "#da3954" } as const;
export const SITE_PAGE = { from: "#01040b", to: "#001849" } as const;
/** `bg-black-80`, a card at rest and the throw bar's panel. */
export const SITE_CARDS = "#16181c";
/** `text-black-05`. A resting card's score is a shade darker, black-30. A picked colour replaces both. */
export const SITE_TEXT = "#f7f8fa";
/** The one-off `bg-[#042963]` of the bar holding undo and Next. */
export const SITE_ACTION_BAR = "#042963";

/**
 * Pairs for the card of the player whose turn it is.
 *
 * The card carries white type and has to stand apart from the resting cards
 * beside it, so every pair keeps to the bar autodarts sets for itself: 4:1 or
 * more against the text at both ends (raspberry's bright end is 4.2:1), and
 * 2.5:1 or more between the bright end and a resting card. The site's own
 * palettes come first, under their own names (`player-colors-*.js`). Lime is
 * darkened at its teal end, which is 2.2:1 as the site has it. The rest are
 * muted pairs in the manner of FankiDarts' Playerbox presets.
 */
export const CARD_PRESETS: readonly ColorPreset[] = [
  { id: "blueberry", label: "Blueberry", from: "#002a77", to: "#6d28de" },
  { id: "ocean", label: "Ocean", from: "#374c98", to: "#0b55df" },
  { id: "lime", label: "Lime", from: "#00653b", to: "#0a8a78" },
  { id: "petrol", label: "Petrol", from: "#134c57", to: "#0e7c86" },
  { id: "orange", label: "Orange", from: "#6f3f20", to: "#c5561c" },
  { id: "crimson", label: "Crimson", from: "#6a1624", to: "#b8323f" },
  { id: "gold", label: "Gold", from: "#5c4a12", to: "#8e7328" },
  { id: "graphite", label: "Graphite", from: "#424242", to: "#616161" },
];

/**
 * Pairs for the page. What the site draws straight onto the page is light
 * type, so these stay as dark as its own midnight: black-90 into a deep colour.
 */
export const PAGE_PRESETS: readonly ColorPreset[] = [
  { id: "royal", label: "Royal", from: "#01040b", to: "#002a77" },
  { id: "forest", label: "Forest", from: "#01040b", to: "#003a22" },
  { id: "petrol", label: "Petrol", from: "#01040b", to: "#0b3f4a" },
  { id: "wine", label: "Wine", from: "#01040b", to: "#4a0e1c" },
  { id: "plum", label: "Plum", from: "#01040b", to: "#3d0c4d" },
  { id: "ember", label: "Ember", from: "#01040b", to: "#4a1f08" },
  { id: "graphite", label: "Graphite", from: "#01040b", to: "#262626" },
];

/** What Colors starts from: autodarts' own, all of it. A fresh object every call. */
export function defaultColors(): ColorsConfig {
  return {
    enabled: false,
    card: { preset: "default", ...SITE_CARD },
    page: { preset: "default", ...SITE_PAGE },
    everywhere: false,
    cards: "",
    text: "",
    actionBar: "",
  };
}

const HEX = /^#[0-9a-f]{6}$/i;

/** A colour as a picker gives it, or "". Anything else would end up in a stylesheet. */
function hex(value: unknown): string {
  return typeof value === "string" && HEX.test(value) ? value.toLowerCase() : "";
}

/**
 * A saved scheme, or autodarts' own when it is not one. An id no longer on
 * offer keeps its colours, as the custom pair it now is.
 */
function scheme(saved: any, site: { from: string; to: string }, presets: readonly ColorPreset[]): ColorScheme {
  const from = hex(saved?.from);
  const to = hex(saved?.to);
  const preset = typeof saved?.preset === "string" ? saved.preset : "default";
  if (preset === "default" || !from || !to) return { preset: "default", ...site };
  return { preset: presets.some(p => p.id === preset) ? preset : "custom", from, to };
}

/**
 * Settings from anywhere, in the current shape.
 *
 * Storage migrates what it holds, but a config also arrives unmigrated: an
 * exported file or a pasted one is merged over the defaults as it is, and the
 * v1 importer hands its colours over whole. All of them come through here, and
 * so does whatever the content scripts read, so an old shape never reaches the
 * settings page or the match screen.
 */
export function normalizeColors(saved: unknown): ColorsConfig {
  if (!saved || typeof saved !== "object") return defaultColors();
  const colors = saved as Record<string, any>;
  if (!("card" in colors) && !("page" in colors)) return fromLegacy(colors);
  return {
    enabled: Boolean(colors.enabled),
    card: scheme(colors.card, SITE_CARD, CARD_PRESETS),
    page: scheme(colors.page, SITE_PAGE, PAGE_PRESETS),
    everywhere: Boolean(colors.everywhere),
    cards: hex(colors.cards),
    text: hex(colors.text),
    actionBar: hex(colors.actionBar),
  };
}

/** The old shape's defaults, lowercased as {@link hex} returns them. */
const LEGACY_DEFAULTS = { background: "#3182ce", text: "#ffffff", matchBackground: "#3c3c3c" } as const;

/**
 * Colors before schemes. `background` painted every card flat, the active one
 * included, and the throw bar; `matchBackground` painted the page flat, with
 * its texture taken off; `text` and `actionBar` meant what they mean now.
 *
 * Switched on, all of it was on screen, so all of it is kept, defaults
 * included: a default left alone was still what the user looked at. Switched
 * off, nothing was, and only a value moved off its default was a choice. The
 * bottom bar started at the site's own colour, so keeping that keeps nothing.
 */
function fromLegacy(saved: Record<string, any>): ColorsConfig {
  const colors = defaultColors();
  colors.enabled = Boolean(saved.enabled);

  const chosen = (key: keyof typeof LEGACY_DEFAULTS): string => {
    const value = hex(saved[key]);
    return colors.enabled || value !== LEGACY_DEFAULTS[key] ? value : "";
  };

  const background = chosen("background");
  const page = chosen("matchBackground");
  if (background) colors.card = { preset: "custom", from: background, to: background };
  if (page) colors.page = { preset: "custom", from: page, to: page };
  colors.cards = background;
  colors.text = chosen("text");

  const actionBar = hex(saved.actionBar);
  colors.actionBar = actionBar === SITE_ACTION_BAR ? "" : actionBar;
  return colors;
}

/** A pair the way the site draws its own: corner to corner, to the bottom right. */
export function gradient({ from, to }: { from: string; to: string }): string {
  return `linear-gradient(to bottom right, ${from} 0%, ${to} 100%)`;
}

function hexToHsl(color: string): [number, number, number] {
  const n = Number.parseInt(color.slice(1), 16);
  const r = (n >> 16 & 255) / 255;
  const g = (n >> 8 & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [ 0, 0, l ];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [ h / 6, s, l ];
}

function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const channel = (n: number) => {
    const k = (n + h * 12) % 12;
    const value = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(value * 255).toString(16).padStart(2, "0");
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

/**
 * The shade autodarts' mark is drawn in on a page that ends in `color`.
 *
 * The site's own is the page's hue a quarter of the way to white: blue-70
 * (L 35%) on blue-90 (L 14%). A colour that is light already goes a quarter of
 * the way to black instead, or the mark would disappear into it.
 */
export function textureTint(color: string): string {
  const [ h, s, l ] = hexToHsl(color);
  return hslToHex(h, s, l < 0.5 ? l + (1 - l) * 0.25 : l * 0.75);
}

/**
 * `layer`, a `url("data:image/svg+xml,…")`, with every colour its shapes are
 * filled with replaced by `color`. Named fills are left alone: `none`, and a
 * clip path's `white`. `undefined` when there is nothing to tint, and the
 * caller keeps the layer as it was.
 */
export function tintSvgFills(layer: string, color: string): string | undefined {
  const match = /^url\(\s*(["']?)data:image\/svg\+xml(;[^,]*)?,(.*)\1\s*\)$/s.exec(layer.trim());
  if (!match || match[2]?.includes("base64")) return undefined;

  let svg: string;
  try {
    svg = decodeURIComponent(match[3]);
  } catch {
    return undefined;
  }

  const tinted = svg.replace(/fill=(["'])#[0-9a-f]{3,8}\1/gi, (_, quote) => `fill=${quote}${color}${quote}`);
  return tinted === svg ? undefined : `url("data:image/svg+xml,${encodeURIComponent(tinted)}")`;
}

/**
 * The page's background layers: autodarts' mark, tinted to go with the pair,
 * over the pair's gradient. autodarts' own colours keep the mark as the site
 * drew it. With no mark to hand, the gradient alone.
 */
export function pageLayers(page: ColorScheme, texture?: string): string {
  const mark = texture && (page.preset === "default" ? texture : tintSvgFills(texture, textureTint(page.to)) ?? texture);
  return mark ? `${mark}, ${gradient(page)}` : gradient(page);
}

/**
 * The page behind everything. That is `body`, which is where the site paints it.
 *
 * `texture` is the site's own mark, read from its stylesheet. Without it, only
 * the gradient under the mark is swapped, through the custom property the site
 * draws it from, which leaves the mark exactly as the site drew it.
 */
export function pageStyles(page: ColorScheme, texture?: string): string {
  if (texture) {
    return `
      body {
        background-color: ${page.from} !important;
        background-image: ${pageLayers(page, texture)} !important;
      }`;
  }
  return `
    body {
      background-color: ${page.from} !important;
      --background-image-midnight-diagonal: ${gradient(page)} !important;
    }`;
}

/**
 * Everything Colors paints on the match screen except the page, which
 * {@link pageStyles} draws.
 *
 * Only what has been picked is drawn, so a colour left at autodarts' own is
 * never overridden with a copy that would go stale when the site changes. A
 * bust and a won leg are not touched: they are signals, and the winner's
 * pattern is a picture inside the card that no background reaches anyway.
 */
export function matchStyles(colors: ColorsConfig): string {
  const faces = anyOf(SELECTORS.match.scoreCard);
  const turnBar = SELECTORS.match.turnBar[0];
  const turnBarPanel = SELECTORS.match.turnBarPanel[0];
  const rules: string[] = [];

  if (colors.card.preset !== "default") {
    rules.push(`
      /* whose turn it is: the site marks it with one gradient, wherever it draws that player */
      #root main ${anyOf(SELECTORS.match.activeHighlight)} {
        background-image: ${gradient(colors.card)} !important;
      }`);
  }

  if (colors.cards) {
    rules.push(`
      /* the other cards: a state gradient takes the resting colour off a card,
         so the active, busted and winning card are never among these */
      ${faces}${anyOf(SELECTORS.match.idleCard)} {
        background-color: ${colors.cards} !important;
      }
      /* the throw bar's panel too, or it shows in the gaps between the dart
         slots, and the site turns it red on a bust */
      ${turnBar}, ${turnBarPanel}, ${turnBarPanel} > div {
        background-color: ${colors.cards} !important;
      }`);
  }

  if (colors.text) {
    rules.push(`
      ${faces}, ${faces} :is(div, span, p), ${turnBar}, ${turnBar} span {
        color: ${colors.text} !important;
      }`);
  }

  if (colors.actionBar) {
    rules.push(`
      /* the bar along the bottom, which holds undo and Next */
      ${SELECTORS.match.actionBar[0]} {
        background-color: ${colors.actionBar} !important;
      }`);
  }

  return rules.join("\n");
}
```

- [ ] **Step 6: Run the check to see it pass**

Run: `node_modules/.bin/tsx $SCRATCHPAD/colors-check.mts`
Expected: `colors: every check passes`

(No commit per task: the user asked for the commits at the end.)

### Task 2: Storage, the migration, and every path a config comes in by

**Files:**
- Modify: `utils/storage.ts` (defaults, `CONFIG_VERSION`, migration 13)
- Modify: `composables/useConfig.ts` (`withDefaults`)
- Modify: `components/PageConfig.vue` (file import around line 552, paste around line 803)
- Modify: `components/Migration.vue:252`
- Modify: `entrypoints/content/migration-config.ts:78-84` (case 9)

**Interfaces:**
- Consumes: `defaultColors()` and `normalizeColors()` from Task 1

- [ ] **Step 1: Defaults and migration** in `utils/storage.ts`:

```ts
import { defaultColors, normalizeColors } from "@/utils/colors";
```

`colors: defaultColors(),` in `defaultConfig`, `const CONFIG_VERSION = 13;`, and at the top of `migrations`:

```ts
      /**
       * Colors has a colour scheme for the active player's card and one for
       * the page, where it had one flat colour for every card and one for a
       * page stripped of its texture. See normalizeColors in utils/colors.ts
       * for how the old settings carry over: what was on screen stays.
       */
      13: (config: any) => ({ ...config, colors: normalizeColors(config.colors) }),
```

`colors.ts` imports storage.ts for types only, so there is no runtime cycle.

- [ ] **Step 2: `withDefaults`** in `composables/useConfig.ts` replaces the two `merged.colors` lines with `merged.colors = normalizeColors(merged.colors);`, imports it from `@/utils/colors`, and its comment names Colors among the nested sections.

- [ ] **Step 3: Import and paste** in `components/PageConfig.vue`: directly after each `const newConfig = { ...defaults, ...imported };`:

```ts
          // An export from before a change of shape is merged as it is, so
          // Colors is brought up to date here; see normalizeColors.
          newConfig.colors = normalizeColors(newConfig.colors);
```

- [ ] **Step 4: The v1 importer** `components/Migration.vue:252`: `config.colors = normalizeColors(oldConfig.colors);`

- [ ] **Step 5: The old inner-version migration** (`entrypoints/content/migration-config.ts`, case 9) keeps its version bump and drops the `matchBackground` line. By the time it runs, storage's v13 has already reshaped `colors`, and `normalizeColors` treats a missing `matchBackground` as autodarts' own page.

- [ ] **Step 6: Verify:** re-run the Task 1 check (it must still pass). Then `yarn compile`, in the background: the error count must stay at the baseline (16), with none in the touched lines.

### Task 3: The match screen, and the page site-wide

**Files:**
- Create: `utils/page-background.ts`
- Modify: `utils/index.ts` (export `STYLE_ID_PREFIX`)
- Modify: `entrypoints/match.content/color-change.ts` (whole file)
- Modify: `entrypoints/content/index.ts` (start the applier)

**Interfaces:**
- Consumes: `normalizeColors`, `matchStyles`, `pageStyles` (Task 1), `addStyles`/`removeStyles`/`STYLE_ID_PREFIX` (`@/utils`)
- Produces: `siteTexture(): string | undefined`, `pageBackground(): Promise<() => void>`

- [ ] **Step 1: `utils/page-background.ts`**

```ts
import { STYLE_ID_PREFIX, addStyles, removeStyles } from "@/utils";
import { normalizeColors, pageStyles } from "@/utils/colors";
import { AutodartsToolsConfig } from "@/utils/storage";

const STYLE_ID = "page-background";

/**
 * autodarts' page texture, the SVG layer of its `body` background, as the
 * site's own stylesheet has it.
 *
 * Read from the rules rather than the computed style, which is ours whenever
 * Colors has painted the page already. The site keeps the rule in
 * `@layer base`, so layers and other group rules are searched too, and a sheet
 * that will not be read is skipped. `undefined` when there is none to be found:
 * pageStyles then leaves the texture exactly as the site draws it.
 */
export function siteTexture(): string | undefined {
  for (const sheet of Array.from(document.styleSheets)) {
    if ((sheet.ownerNode as Element | null)?.id?.startsWith(STYLE_ID_PREFIX)) continue;
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    const layer = bodyTexture(rules);
    if (layer) return layer;
  }
  return undefined;
}

/**
 * Duck-typed rather than `instanceof`, which a content script cannot rely on
 * for objects of the page's in every browser.
 */
function bodyTexture(rules: CSSRuleList): string | undefined {
  for (const rule of Array.from(rules)) {
    const style = rule as CSSStyleRule;
    if (style.selectorText?.trim() === "body" && style.style?.backgroundImage) {
      const layer = style.style.backgroundImage.match(/url\(\s*"data:image\/svg\+xml[^"]*"\s*\)/)?.[0];
      if (layer) return layer;
    }
    const nested = (rule as CSSGroupingRule).cssRules;
    if (nested?.length) {
      const layer = bodyTexture(nested);
      if (layer) return layer;
    }
  }
  return undefined;
}

/**
 * Colors' page on every autodarts page, when it is set to *Everywhere*.
 *
 * The match screen paints the page itself, along with the rest of Colors. This
 * is the part for everywhere else, and it runs from the content script that is
 * on every page. It follows the config, so a colour picked on the settings page
 * shows behind it at once.
 *
 * @returns the teardown
 */
export async function pageBackground(): Promise<() => void> {
  let texture: string | undefined;

  const apply = (saved: unknown) => {
    const colors = normalizeColors(saved);
    if (colors.enabled && colors.everywhere && colors.page.preset !== "default") {
      texture ??= siteTexture();
      addStyles(pageStyles(colors.page, texture), STYLE_ID);
    } else {
      removeStyles(STYLE_ID);
    }
  };

  apply((await AutodartsToolsConfig.getValue())?.colors);
  const unwatch = AutodartsToolsConfig.watch(value => apply(value?.colors));

  return () => {
    unwatch();
    removeStyles(STYLE_ID);
  };
}
```

- [ ] **Step 2: `entrypoints/match.content/color-change.ts`**

```ts
import { addStyles, removeStyles } from "@/utils";
import { matchStyles, normalizeColors, pageStyles } from "@/utils/colors";
import { siteTexture } from "@/utils/page-background";
import { AutodartsToolsConfig } from "@/utils/storage";

/**
 * Colors: the active player's card, the other cards, the text on them, both
 * bars, and the page behind them.
 *
 * v1 walked the player display twice a second and wrote inline styles onto
 * every element it found. On the rebuilt site that would not survive anyway,
 * since React re-renders the score cards on every dart, so one stylesheet does
 * the whole job. What goes in it is built in utils/colors.ts, which the
 * settings page's preview draws from too.
 *
 * With *Everywhere* on, the content script paints the page as well; the two
 * rules are the same, so either one alone is enough.
 */
const STYLE_ID = "color-change";

export async function colorChange() {
  try {
    const colors = normalizeColors((await AutodartsToolsConfig.getValue()).colors);
    if (!colors.enabled) return;

    const rules = [ matchStyles(colors) ];
    if (colors.page.preset !== "default") rules.push(pageStyles(colors.page, siteTexture()));

    addStyles(rules.join("\n"), STYLE_ID);
    console.log("Autodarts Tools: Colors - applied");
  } catch (e) {
    console.error("Autodarts Tools: Colors - Error: ", e);
  }
}

export function onRemove() {
  removeStyles(STYLE_ID);
}
```

- [ ] **Step 3: Start the applier** in `entrypoints/content/index.ts`, after `ctx.onInvalidated(keepKeystrokesInFields());`:

```ts
    // Colors' page, where it is set to cover every page and not only the match
    // screen. See utils/page-background.ts.
    try {
      ctx.onInvalidated(await pageBackground());
    } catch (e) {
      console.error(e);
    }
```

and `export const STYLE_ID_PREFIX` in `utils/index.ts`.

- [ ] **Step 4: Browser check, in the yarn dev Chrome, in a tab of my own** (an API-made bot match; park it at `about:blank` before the edits above). Enable Colors in the config from the service worker: a Lime card, a Forest page, idle cards `#23324d`, text `#ffffcc`, bottom bar `#3a1030`. Then:
  - at 1600, 1100 and 600 px, the active card is Lime and the idle card flat, in every layout; the texture is kept and green;
  - with 3 players (a second match), every card is recoloured, not only the first card of a column;
  - after a dart, and after a bust, the styling is still there, and the busted card is grey-slush;
  - `gameWinner` injected through game-data: the winner is game-shot green with its pattern;
  - with `siteTexture` failing (its stylesheet hidden by replacing `document.styleSheets` in a quick eval, or by checking `pageStyles(page)` in isolation), the body falls back to the custom property and the texture stays;
  - *Everywhere* on: a lobby tab and the settings page show the Forest page, and switching it off takes it away live;
  - Colors off: nothing of ours in the page.

### Task 4: The settings panel and its preview

**Files:**
- Create: `components/Settings/Colors/SchemePicker.vue`
- Create: `components/Settings/Colors/ColorsPreview.vue`
- Modify: `components/Settings/Colors.vue` (panel rewritten, card text)
- Modify: `assets/tailwind.css` (`.adt-color-input`)

**Interfaces:**
- Consumes: `ColorScheme` (storage), `ColorPreset`, `CARD_PRESETS`, `PAGE_PRESETS`, `SITE_*`, `gradient`, `pageLayers` (Task 1), `siteTexture` (Task 3), `boardSkin` (`@/utils/board-skins`)

- [ ] **Step 1: `.adt-color-input`** in `assets/tailwind.css`, after the segment control:

```css
/* ---------------------------------------------------------- colour inputs ---
 * A native colour picker as nothing but its swatch. Every browser draws its own
 * bordered button round the swatch, which reads as a second control. Sized by
 * utilities where it is used, since this rule would outrank them.
 */
.adt-color-input {
  padding: 0;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: var(--ad-radius-xs);
}

.adt-color-input::-webkit-color-swatch-wrapper {
  padding: 0;
}

.adt-color-input::-webkit-color-swatch {
  border: 0;
  border-radius: var(--ad-radius-xs);
}

.adt-color-input::-moz-color-swatch {
  border: 0;
  border-radius: var(--ad-radius-xs);
}

.adt-color-input:focus-visible {
  outline: none;
  box-shadow: var(--ad-focus-ring);
}
```

- [ ] **Step 2: `SchemePicker.vue`**: the swatch row. The first swatch is "Autodarts" (the site's own pair), the presets follow, and last is a *Custom* pill holding two colour inputs (top left, bottom right). Picking a swatch emits `{ preset: id, from, to }`, and editing an input emits `{ ...modelValue, preset: "custom", [end]: value }`. Code as in the implementation. The swatches are `w-16` buttons with `aria-pressed`, a 36px gradient chip ringed white when picked, and the label under it.

- [ ] **Step 3: `ColorsPreview.vue`**: the miniature match screen. Its positions are the real screen's at 1600×900: throw bar 30%/3.11%/40%×8%, board 30%/15.11%/40%×71.11%, cards at 2% and 73%, 14.68%, 25% wide, bottom bar 31.5%/88.89%/37%×7.56%. Sizes are `cqw` of a `container-type: inline-size` frame; the card internals are the measured px ÷ 16. The page uses `pageLayers(colors.page, texture)` with `contain`, `0 100%`, `no-repeat`, as the site does. The active card uses `gradient(colors.card)`, the idle card `colors.cards || SITE_CARDS`, text `colors.text ||` the site's per-element colour, and the bottom bar `colors.actionBar || SITE_ACTION_BAR`. The board is `boardSkin(boardSkins.enabled ? skin : "default").preview`.

- [ ] **Step 4: `Colors.vue`**: intro, preview, *Player card* (SchemePicker over `config.colors.card`), *Background* (SchemePicker over `config.colors.page` plus the *Everywhere* AppToggle), and *More colours*: three tiles, each a colour input showing `value || site`, a label, "autodarts' own" while empty, and a ghost AppButton that resets to "". `siteTexture()` is read on mount.

- [ ] **Step 5: Browser check** on `/tools` in my own tab (seed `adt:last-visited-url`, `adt:active-tab` = "1", then real mouse events on the Colors card's gear):
  - every swatch picks, and editing a custom input switches the pill to Custom from the preset's colours;
  - the preview follows each control, at the modal's width and at 390 px wide;
  - the preview beside the real match screen with the same config: same colours, same texture tint;
  - `eslint` on the new and changed files is clean; `yarn compile` stays at the baseline.

### Task 5: Documentation, the full checks, and the commits

**Files:**
- Modify: `README.md` (Match Customization › Colors)
- Modify: `CHANGELOG.md` ([Unreleased] › Added and Fixed)

- [ ] **Step 1: README**: replace the *Color Customization* bullets with the Player card, Background and More colours descriptions, the preview, and *Everywhere*.
- [ ] **Step 2: CHANGELOG**: under Added, the schemes, presets, preview, texture and *Everywhere*, plus how old settings carry over. Under Fixed, that Colors reaches the cards in every layout and in a column of more than one, and that the page keeps autodarts' mark.
- [ ] **Step 3:** `yarn build` (the tree-shaking check), `yarn compile`, eslint on the touched files, and the Task 1 check once more.
- [ ] **Step 4: Put back everything the tests changed** in the dev browser: the Colors config, `urlstatus`, `adt:last-visited-url`, `adt:active-tab`; close my tabs; abort the test matches.
- [ ] **Step 5: Commit, locally.** First `docs:` with the spec and plan, then `feat:` with the rest. Do not push.
