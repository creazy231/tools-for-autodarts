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
/** blue-60, what the bar's buttons are filled with, and outlined in. */
export const SITE_BUTTON = "#0b55df";

/**
 * Pairs for the card of the player whose turn it is.
 *
 * The card carries white type and has to stand apart from the resting cards
 * beside it, so every pair keeps to the bar autodarts sets for itself: 4:1 or
 * more against the text at both ends (raspberry's bright end is 4.2:1), and
 * 2.5:1 or more between the bright end and a resting card. That bright end is
 * a colour, never a grey: the small layouts draw resting cells in black-60, a
 * mid grey nothing carrying white type can out-contrast, and there the hue is
 * what tells the active one apart, as it is for raspberry. The site's own
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
  { id: "slate", label: "Slate", from: "#253247", to: "#497097" },
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

/** WCAG relative luminance. */
function luminance(color: string): number {
  const n = Number.parseInt(color.slice(1), 16);
  const [ r, g, b ] = [ n >> 16 & 255, n >> 8 & 255, n & 255 ].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [ light, dark ] = [ luminance(a), luminance(b) ].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** `text-blue-05`, the label on the bar's filled buttons. */
const BUTTON_LABEL = "#f0f5fd";
/** blue-70, a button held down. */
const SITE_PRESSED = "#003eb3";

/*
 * How autodarts' own bar is put together, as contrast ratios so they carry to
 * any hue: a colour's lightness says little about how light it looks, and a
 * green as light as blue-60 would be nearly as light as its label. The bar
 * stands 1.2:1 off the page, the buttons 2.2:1 off the bar, which leaves their
 * label at 5.9:1, and a pressed button 1.4:1 under a resting one.
 */
const BAR_STEP = contrast(SITE_ACTION_BAR, SITE_PAGE.to);
const BUTTON_STEP = contrast(SITE_BUTTON, SITE_ACTION_BAR);
const PRESSED_STEP = contrast(SITE_BUTTON, SITE_PRESSED);
/** The lightest a button may be and keep its label readable, at 4.5:1. */
const READABLE = (luminance(BUTTON_LABEL) + 0.05) / 4.5 - 0.05;

/**
 * The colour of this hue and saturation with the given luminance. Luminance
 * rises with lightness, so halving the range finds it.
 */
function shade(h: number, s: number, target: number): string {
  let [ low, high ] = [ 0, 1 ];
  for (let i = 0; i < 24; i++) {
    const mid = (low + high) / 2;
    if (luminance(hslToHex(h, s, mid)) < target) low = mid;
    else high = mid;
  }
  return hslToHex(h, s, low);
}

/** The luminance `ratio`:1 above (or below, for a negative ratio) one of `from`. */
function step(from: number, ratio: number): number {
  const next = ratio > 0 ? ratio * (from + 0.05) - 0.05 : (from + 0.05) / -ratio - 0.05;
  return Math.min(1, Math.max(0, next));
}

/** The bottom bar's colours: its fill, its buttons, and the border a won leg spins round it. */
export interface BarPalette {
  bar: string;
  /** The buttons' fill and outline (the site's blue-60). */
  button: string;
  /** A button held down (blue-70). */
  pressed: string;
  /** The won leg's border: the button's colour, then two lighter steps of it. */
  glow: [ string, string, string ];
}

/**
 * The bottom bar and its buttons in the colours around them, or `undefined`
 * while those are autodarts' own.
 *
 * A bottom bar colour picked by hand is the bar; otherwise the background's end
 * colour is where it all comes from, the way autodarts derives its own from
 * blue-90: the bar a step lighter than the page, the buttons a further step
 * lighter than the bar, and a pressed one a step darker, all in the page's hue
 * and a touch less saturated (0.91 of it, as #042963 and blue-60 are). A
 * button is never so light that its label stops reading, so on a light bar
 * it comes out darker than the bar instead. Either way the buttons take the
 * bar's hue, so bar and buttons stay one piece.
 */
export function barPalette(colors: ColorsConfig): BarPalette | undefined {
  const source = colors.actionBar || (colors.page.preset === "default" ? "" : colors.page.to);
  if (!source) return undefined;

  const [ h, sourceSaturation ] = hexToHsl(source);
  const s = sourceSaturation * 0.91;
  const bar = colors.actionBar || shade(h, s, step(luminance(source), BAR_STEP));
  const light = Math.min(step(luminance(bar), BUTTON_STEP), READABLE);
  const button = shade(h, s, light);
  const [ bh, bs, bl ] = hexToHsl(button);
  const toward = (share: number) => hslToHex(bh, bs, bl + (1 - bl) * share);
  return {
    bar,
    button,
    pressed: shade(h, s, step(light, -PRESSED_STEP)),
    glow: [ button, toward(0.35), toward(0.6) ],
  };
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
  // every candidate at once: they are the three layouts the site draws, not
  // three guesses at one of them
  const faces = anyOf(SELECTORS.match.scoreCard);
  const turnBar = anyOf(SELECTORS.match.turnBar);
  const turnBarPanel = anyOf(SELECTORS.match.turnBarPanel);
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

  const bar = barPalette(colors);
  if (bar) {
    const actionBar = SELECTORS.match.actionBar[0];
    const [ glow, lighter, lightest ] = bar.glow;
    rules.push(`
      /* the bar's buttons, and the camera button beside the board, which is
         the same outlined button: the site fills and outlines them from these
         variables. --outline-high is resolved on the root, so it would keep
         the old blue if it were left to follow --color-blue-60 */
      ${actionBar}, ${SELECTORS.match.cameraButton[0]} {
        --color-blue-60: ${bar.button};
        --color-blue-70: ${bar.pressed};
        --outline-high: ${bar.button};
      }
      /* the bar along the bottom, which holds undo and Next. Once a leg is won
         the site draws its fill as a gradient layer, over any colour, inside a
         spinning border; a shadow inside the border covers the fill and
         leaves the border as it is */
      ${actionBar} {
        background-color: ${bar.bar} !important;
        box-shadow: inset 0 0 0 100vmax ${bar.bar} !important;
      }
      /* and that border spins through lighter shades of the buttons rather
         than autodarts' blue and green */
      ${actionBar}${anyOf(SELECTORS.match.actionBarHighlight)} {
        background-image:
          linear-gradient(${bar.bar}, ${bar.bar}),
          conic-gradient(from var(--control-bar-border-angle), ${glow} 0%, ${lighter} 20%, ${lightest} 40%, ${lighter} 60%, ${glow} 80%, ${glow} 100%) !important;
      }`);
  }

  return rules.join("\n");
}
