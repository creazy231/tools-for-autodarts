import type { Gif } from "@/utils/gif";

import { type IWled, WledType } from "@/utils/storage";

/**
 * WLED previews: which preset an effect plays, and that preset drawn the way
 * the device draws it, from the device's own presets.json and GIFs.
 *
 * Only what files hold is drawn: a GIF on *Image* (effect 53), a copy of
 * another segment (*Copy Segment*, 77), a plain colour (*Solid*, 0), and dark
 * segments. Every other effect WLED computes as it goes, so a preset with one
 * of those is named rather than drawn (isDrawable, ownEffects).
 *
 * Nothing here reads or draws: utils/wled-device.ts reads the device, and
 * utils/led-canvas.ts draws the pictures this makes.
 */

/** A preset on a device: the device's origin, such as `http://192.168.0.227`, and the preset's number. */
export interface PresetRef {
  address: string;
  preset: number;
}

/** A device's LEDs as WLED lays them out: a matrix, or a strip one LED high. */
export interface Layout {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Rgb = [number, number, number];

interface SegmentShape {
  id: number;
  rect: Rect;
  /** WLED's `rev`, `rY` and `tp`: mirrored side to side, top to bottom, and columns and rows swapped. */
  reverse: boolean;
  reverseY: boolean;
  transpose: boolean;
}

export type SegmentPlan =
  | SegmentShape & { kind: "image"; gif: string; speed: number }
  | SegmentShape & { kind: "copy"; source: number }
  | SegmentShape & { kind: "solid"; color: Rgb }
  | SegmentShape & { kind: "dark" }
  | SegmentShape & { kind: "effect"; fx: number };

export type PresetPlan =
  | { ok: true; name: string; segments: SegmentPlan[] }
  | { ok: false; reason: "missing" | "empty" };

/** A preview's pictures over time. */
export interface Preview {
  layout: Layout;
  /** Whether it changes over time at all. */
  animated: boolean;
  /** The same for the same picture: which frame each GIF shows at `t` milliseconds. */
  keyAt: (t: number) => string;
  /** The picture at `t` milliseconds: three bytes per LED, row by row. */
  pixelsAt: (t: number) => Uint8ClampedArray;
}

export const FX_SOLID = 0;
export const FX_IMAGE = 53;
export const FX_COPY = 77;

/** WLED's colour for a segment that names none. */
const DEFAULT_COLOR: Rgb = [ 255, 160, 0 ];

/** WLED keeps presets 1 to 250. */
const PRESETS = { first: 1, last: 250 };

/** WLED's speed slider: 128 plays a GIF as stored. */
const NORMAL_SPEED = 128;

/** No frame shorter than this, about what WLED's effects run at. */
const MIN_FRAME_MS = 20;

/** A playlist that starts a playlist: followed this far, no further. */
const PLAYLIST_DEPTH = 3;

/** `PL=5` in an HTTP API link: `/win&PL=5`, `/win/PL=5`, `/win?PL=5`. */
const PL_PARAM = /[?&/]PL=(\d{1,3})(?!\d)/i;

/** The placeholders an effect's JSON can hold (utils/wled-request.ts), and a name to put in them so it parses. */
const PLACEHOLDER = /\{(?:player|player_ascii)\}/g;
const STAND_IN_NAME = "Player";

/** A device's origin from what an effect holds: `192.168.0.227`, `http://wled.local/`, a whole link. */
export function deviceOrigin(address: string): string | undefined {
  const text = address.trim();
  if (!text) return undefined;
  try {
    return new URL(/^https?:\/\//i.test(text) ? text : `http://${text}`).origin;
  } catch {
    return undefined;
  }
}

/** The preset `effect` plays, and on which device: a preset effect's, a link's `PL=`, a JSON's `"ps"`. */
export function presetRef(effect: Pick<IWled, "type" | "url" | "preset" | "json_api">): PresetRef | undefined {
  const address = deviceOrigin(effect.url ?? "");
  if (!address) return undefined;
  let preset = Number.NaN;
  if (effect.type === WledType.PRESET) preset = Number(effect.preset);
  else if (effect.type === WledType.URL) preset = Number(effect.url.match(PL_PARAM)?.[1]);
  else if (effect.type === WledType.API) preset = jsonPreset(effect.json_api ?? "");
  if (!Number.isInteger(preset) || preset < PRESETS.first || preset > PRESETS.last) return undefined;
  return { address, preset };
}

function jsonPreset(json: string): number {
  try {
    const state: unknown = JSON.parse(json.replace(PLACEHOLDER, STAND_IN_NAME));
    const ps = isRecord(state) ? state.ps : undefined;
    if (typeof ps === "number") return ps;
    if (typeof ps === "string" && /^\d+$/.test(ps)) return Number(ps);
  } catch {}
  return Number.NaN;
}

/** The layout a device's `/json/info` describes, if it is a WLED's. */
export function layoutOf(info: unknown): Layout | undefined {
  const leds = isRecord(info) && isRecord(info.leds) ? info.leds : undefined;
  if (!leds) return undefined;
  const matrix = isRecord(leds.matrix) ? leds.matrix : undefined;
  if (matrix && isCount(matrix.w) && isCount(matrix.h)) return { width: matrix.w, height: matrix.h };
  if (isCount(leds.count)) return { width: leds.count, height: 1 };
  return undefined;
}

/** The presets of a `presets.json` that have a name, by number. */
export function presetNames(presets: Record<string, unknown>): [number, string][] {
  return Object.entries(presets)
    .map(([ id, preset ]): [number, unknown] => [ Number(id), isRecord(preset) ? preset.n : undefined ])
    .filter((entry): entry is [number, string] => entry[0] >= PRESETS.first && entry[0] <= PRESETS.last && typeof entry[1] === "string")
    .sort((a, b) => a[0] - b[0]);
}

/** What preset `id` shows, segment by segment. */
export function planPreset(presets: Record<string, unknown>, id: number, layout: Layout): PresetPlan {
  return plan(presets, id, layout, 0);
}

function plan(presets: Record<string, unknown>, id: number, layout: Layout, depth: number): PresetPlan {
  const preset = presets[String(id)];
  if (!isRecord(preset) || !Object.keys(preset).length) return { ok: false, reason: "missing" };
  const name = typeof preset.n === "string" ? preset.n : "";
  const segments = Array.isArray(preset.seg) ? preset.seg : isRecord(preset.seg) ? [ preset.seg ] : [];
  if (!segments.length) {
    // A preset that only starts a playlist shows that playlist's first preset first.
    const first = isRecord(preset.playlist) && Array.isArray(preset.playlist.ps) ? preset.playlist.ps[0] : undefined;
    if (typeof first === "number" && first !== id && depth < PLAYLIST_DEPTH) {
      const next = plan(presets, first, layout, depth + 1);
      return next.ok ? { ...next, name: name || next.name } : next;
    }
    return preset.on === false ? { ok: true, name, segments: [] } : { ok: false, reason: "empty" };
  }
  const allOff = preset.on === false;
  return {
    ok: true,
    name,
    segments: segments
      .filter(isRecord)
      .filter(segment => segment.stop !== 0)
      .map((segment, index) => planSegment(segment, index, layout, allOff))
      .sort((a, b) => a.id - b.id),
  };
}

function planSegment(segment: Record<string, unknown>, index: number, layout: Layout, allOff: boolean): SegmentPlan {
  const strip = layout.height === 1;
  const x = numberOr(segment.start, 0);
  const y = strip ? 0 : numberOr(segment.startY, 0);
  const rect = clip({ x, y, w: numberOr(segment.stop, layout.width) - x, h: strip ? 1 : numberOr(segment.stopY, layout.height) - y }, layout);
  const shape: SegmentShape = { id: numberOr(segment.id, index), rect, reverse: segment.rev === true, reverseY: segment.rY === true, transpose: segment.tp === true };
  if (allOff || segment.on === false || segment.bri === 0) return { ...shape, kind: "dark" };
  const fx = numberOr(segment.fx, FX_SOLID);
  if (fx === FX_IMAGE && typeof segment.n === "string" && /\.gif$/i.test(segment.n)) {
    return { ...shape, kind: "image", gif: segment.n, speed: numberOr(segment.sx, NORMAL_SPEED) };
  }
  if (fx === FX_COPY) return { ...shape, kind: "copy", source: numberOr(segment.c3, 0) };
  if (fx === FX_SOLID) return { ...shape, kind: "solid", color: colorOf(Array.isArray(segment.col) ? segment.col[0] : undefined) };
  return { ...shape, kind: "effect", fx };
}

/** Whether every segment of `plan` can be drawn: none runs an effect WLED computes itself. */
export function isDrawable(plan: PresetPlan): plan is Extract<PresetPlan, { ok: true }> {
  return plan.ok && plan.segments.every(segment => segment.kind !== "effect");
}

/** The effects WLED computes itself in `plan`, each once, in segment order. */
export function ownEffects(plan: PresetPlan): number[] {
  if (!plan.ok) return [];
  return [ ...new Set(plan.segments.flatMap(segment => (segment.kind === "effect" ? [ segment.fx ] : []))) ];
}

/** How long each frame of `gif` stays at `speed`, as WLED's image effect plays it: delay × (2 − speed / 128). */
export function frameTimes(gif: Gif, speed: number): number[] {
  const factor = 2 - Math.min(255, Math.max(0, speed)) / NORMAL_SPEED;
  return gif.frames.map(frame => Math.max(MIN_FRAME_MS, Math.round(frame.delay * factor)));
}

/** `plan`'s pictures over time, with the GIFs in `gifs`: one that isn't there is dark. */
export function makePreview(plan: Extract<PresetPlan, { ok: true }>, layout: Layout, gifs: ReadonlyMap<string, Gif>): Preview {
  const clocks = plan.segments.map((segment) => {
    const gif = segment.kind === "image" ? gifs.get(segment.gif) : undefined;
    return gif ? clockOf(frameTimes(gif, segment.kind === "image" ? segment.speed : NORMAL_SPEED)) : undefined;
  });
  const framesAt = (t: number) => clocks.map(clock => clock?.frameAt(t) ?? 0);
  return {
    layout,
    animated: clocks.some(clock => (clock?.frames ?? 0) > 1),
    keyAt: t => framesAt(t).join(","),
    pixelsAt: t => render(plan.segments, layout, gifs, framesAt(t)),
  };
}

/** Which frame shows at `t`, the frames lasting `times` and looping. */
function clockOf(times: number[]): { frames: number; frameAt: (t: number) => number } {
  const ends: number[] = [];
  let total = 0;
  for (const time of times) ends.push(total += time);
  return {
    frames: times.length,
    frameAt(t) {
      const into = ((t % total) + total) % total;
      let low = 0;
      let high = ends.length - 1;
      while (low < high) {
        const middle = (low + high) >> 1;
        if (ends[middle] > into) high = middle;
        else low = middle + 1;
      }
      return low;
    },
  };
}

/** A segment's picture before its flips: the size it has to WLED's effects, three bytes per LED. */
interface SegmentPicture {
  w: number;
  h: number;
  rgb: Uint8ClampedArray;
}

function render(segments: SegmentPlan[], layout: Layout, gifs: ReadonlyMap<string, Gif>, frames: number[]): Uint8ClampedArray {
  const out = new Uint8ClampedArray(layout.width * layout.height * 3);
  const drawn = new Map<number, SegmentPicture>();
  const order = segments.map((segment, index) => ({ segment, frame: frames[index] }));
  // A copy reads its source's picture, so the copies come after the rest.
  for (const { segment, frame } of [ ...order.filter(entry => entry.segment.kind !== "copy"), ...order.filter(entry => entry.segment.kind === "copy") ]) {
    const picture = pictureOf(segment, frame, gifs, drawn);
    drawn.set(segment.id, picture);
    place(out, layout, segment, picture);
  }
  return out;
}

function pictureOf(segment: SegmentPlan, frame: number, gifs: ReadonlyMap<string, Gif>, drawn: ReadonlyMap<number, SegmentPicture>): SegmentPicture {
  const w = segment.transpose ? segment.rect.h : segment.rect.w;
  const h = segment.transpose ? segment.rect.w : segment.rect.h;
  const rgb = new Uint8ClampedArray(w * h * 3);
  if (segment.kind === "solid") {
    for (let at = 0; at < w * h; at++) rgb.set(segment.color, at * 3);
  } else if (segment.kind === "image") {
    // Scaled to the segment, nearest pixel, as WLED's image loader does.
    const gif = gifs.get(segment.gif);
    const pixels = gif?.frames[frame]?.pixels;
    if (gif && pixels) {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const from = (Math.floor(y * gif.height / h) * gif.width + Math.floor(x * gif.width / w)) * 4;
          if (pixels[from + 3]) rgb.set(pixels.subarray(from, from + 3), (y * w + x) * 3);
        }
      }
    }
  } else if (segment.kind === "copy" && segment.source !== segment.id) {
    const source = drawn.get(segment.source);
    if (source) {
      for (let y = 0; y < Math.min(h, source.h); y++) {
        for (let x = 0; x < Math.min(w, source.w); x++) rgb.set(source.rgb.subarray((y * source.w + x) * 3, (y * source.w + x) * 3 + 3), (y * w + x) * 3);
      }
    }
  }
  return { w, h, rgb };
}

/** A segment's picture onto the layout, flipped as WLED flips it: reversed first, then transposed. */
function place(out: Uint8ClampedArray, layout: Layout, segment: SegmentPlan, picture: SegmentPicture): void {
  for (let y = 0; y < picture.h; y++) {
    for (let x = 0; x < picture.w; x++) {
      let column = segment.reverse ? picture.w - 1 - x : x;
      let row = segment.reverseY ? picture.h - 1 - y : y;
      if (segment.transpose) [ column, row ] = [ row, column ];
      const px = segment.rect.x + column;
      const py = segment.rect.y + row;
      if (px >= layout.width || py >= layout.height) continue;
      out.set(picture.rgb.subarray((y * picture.w + x) * 3, (y * picture.w + x) * 3 + 3), (py * layout.width + px) * 3);
    }
  }
}

function clip(rect: Rect, layout: Layout): Rect {
  const x = Math.max(0, Math.min(layout.width, rect.x));
  const y = Math.max(0, Math.min(layout.height, rect.y));
  return { x, y, w: Math.max(0, Math.min(layout.width - x, rect.w)), h: Math.max(0, Math.min(layout.height - y, rect.h)) };
}

/** A colour as `col` holds one: `[r, g, b]`, `[r, g, b, w]` or hex `RRGGBB`/`WWRRGGBB`. White adds to all three. */
function colorOf(value: unknown): Rgb {
  if (Array.isArray(value) && value.length >= 3) {
    const white = Number(value[3]) || 0;
    return [ 0, 1, 2 ].map(channel => Math.min(255, (Number(value[channel]) || 0) + white)) as Rgb;
  }
  if (typeof value === "string" && /^(?:[0-9a-f]{2})?[0-9a-f]{6}$/i.test(value)) {
    const hex = value.slice(-6);
    const white = value.length === 8 ? Number.parseInt(value.slice(0, 2), 16) : 0;
    return [ 0, 2, 4 ].map(at => Math.min(255, Number.parseInt(hex.slice(at, at + 2), 16) + white)) as Rgb;
  }
  return DEFAULT_COLOR;
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isRecord(value: unknown): value is Record<string, any> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
