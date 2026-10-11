import type { Gif } from "@/utils/gif";

import { decodeGif } from "@/utils/gif";
import { backgroundFetch } from "@/utils/helpers";
import { type Layout, type PresetRef, type Preview, isDrawable, layoutOf, makePreview, ownEffects, planPreset } from "@/utils/wled-preview";

/**
 * Reading a WLED for its previews (utils/wled-preview.ts): its layout, its
 * presets, its effects' names and the GIFs its presets play.
 *
 * Through the background's fetch relay, in every browser: Firefox lets a
 * content script send to the device but not read what it answers, and the
 * device answers any origin (`Access-Control-Allow-Origin: *`), so no
 * permission is needed. A device is read once and kept for the page's life; a
 * device that didn't answer is asked again only after FAILURE_MEMORY_MS, so a
 * list of effects on a lamp that is switched off asks once, not once a row.
 *
 * An ESP32 is slow to serve: presets.json, 56 KB, took the user's 3–4.5 s,
 * and six GIFs at once up to 3 s each. So each device gets READS_AT_ONCE reads
 * at a time, and the lists and GIFs long timeouts; only /json/info, which is
 * small, is expected quickly, so that a device that is off shows soon.
 */

export interface WledDevice {
  layout: Layout;
  presets: Record<string, unknown>;
  /** Its effects' names, by id (`/json/eff`). */
  effects: string[];
}

export type DeviceRead = { ok: true; device: WledDevice } | { ok: false; reason: "unreachable" | "not-wled" };

/**
 * A read through the background: the body as a data URL; `null` when the
 * device answered with an error, such as a 404 for a file it doesn't have; and
 * `undefined` when nothing answered in time.
 */
export type ReadUrl = (url: string, timeoutMs: number) => Promise<string | null | undefined>;

/** What a preview shows: the picture, or why there is none. */
export type PreviewState =
  | { status: "loading"; target: PresetRef }
  | { status: "unreachable"; target: PresetRef }
  | { status: "missing"; target: PresetRef }
  | { status: "empty"; target: PresetRef; name: string }
  | { status: "effects"; target: PresetRef; name: string; effects: string[] }
  | { status: "ready"; target: PresetRef; name: string; preview: Preview };

const INFO_TIMEOUT_MS = 4000;
const LIST_TIMEOUT_MS = 15_000;
const GIF_TIMEOUT_MS = 10_000;
const READS_AT_ONCE = 2;
const FAILURE_MEMORY_MS = 30_000;

interface Memo<T> {
  promise: Promise<T>;
  failedAt?: number;
}

export function createDeviceReader(read: ReadUrl, now: () => number = Date.now) {
  const devices = new Map<string, Memo<DeviceRead>>();
  const gifs = new Map<string, Memo<Gif | undefined>>();
  const lanes = new Map<string, { busy: number; waiting: (() => void)[] }>();

  /** `load()`'s promise for `key`, kept: for good, or for FAILURE_MEMORY_MS when `failed` says it failed. */
  function remembered<T>(memo: Map<string, Memo<T>>, key: string, failed: (value: T) => boolean, load: () => Promise<T>): Promise<T> {
    const known = memo.get(key);
    if (known && (known.failedAt === undefined || now() - known.failedAt < FAILURE_MEMORY_MS)) return known.promise;
    const entry: Memo<T> = { promise: load() };
    void entry.promise.then((value) => {
      if (failed(value)) entry.failedAt = now();
    });
    memo.set(key, entry);
    return entry.promise;
  }

  /** `read`, READS_AT_ONCE at a time to each device: a read that ends hands its turn to the next. */
  async function readQueued(address: string, path: string, timeoutMs: number): Promise<string | null | undefined> {
    const lane = lanes.get(address) ?? { busy: 0, waiting: [] };
    lanes.set(address, lane);
    if (lane.busy < READS_AT_ONCE) lane.busy++;
    else await new Promise<void>(resolve => lane.waiting.push(resolve));
    try {
      return await read(`${address}${path}`, timeoutMs);
    } finally {
      const next = lane.waiting.shift();
      if (next) next();
      else lane.busy--;
    }
  }

  /** The JSON at `path`: `undefined` when nothing answered, `null` for an error or an answer that isn't JSON. */
  async function readJson(address: string, path: string, timeoutMs: number): Promise<unknown> {
    const data = await readQueued(address, path, timeoutMs);
    if (typeof data !== "string") return data;
    try {
      return JSON.parse(new TextDecoder().decode(dataUrlBytes(data)));
    } catch {
      return null;
    }
  }

  function loadDevice(address: string): Promise<DeviceRead> {
    return remembered(devices, address, value => !value.ok, async (): Promise<DeviceRead> => {
      const info = await readJson(address, "/json/info", INFO_TIMEOUT_MS);
      if (info === undefined) return { ok: false, reason: "unreachable" };
      const layout = layoutOf(info);
      if (!layout) return { ok: false, reason: "not-wled" };
      const [ presets, effects ] = await Promise.all([ readJson(address, "/presets.json", LIST_TIMEOUT_MS), readJson(address, "/json/eff", LIST_TIMEOUT_MS) ]);
      // A presets.json that didn't arrive isn't a device without presets (a
      // 404, `null`): kept as one, every preview would say its preset is gone.
      if (presets === undefined) return { ok: false, reason: "unreachable" };
      return {
        ok: true,
        device: {
          layout,
          presets: presets && typeof presets === "object" && !Array.isArray(presets) ? presets as Record<string, unknown> : {},
          effects: Array.isArray(effects) ? effects.map(name => (typeof name === "string" ? name : "")) : [],
        },
      };
    });
  }

  function loadGif(address: string, name: string): Promise<Gif | undefined> {
    return remembered(gifs, `${address}/${name}`, value => value === undefined, async () => {
      const data = await readQueued(address, filePath(name), GIF_TIMEOUT_MS);
      if (typeof data !== "string") return undefined;
      try {
        return decodeGif(dataUrlBytes(data));
      } catch {
        return undefined;
      }
    });
  }

  async function loadPreview(target: PresetRef): Promise<Exclude<PreviewState, { status: "loading" }>> {
    const device = await loadDevice(target.address);
    if (!device.ok) return { status: "unreachable", target };
    const { layout, presets, effects } = device.device;
    const plan = planPreset(presets, target.preset, layout, effects);
    if (!plan.ok) return plan.reason === "missing" ? { status: "missing", target } : { status: "empty", target, name: "" };
    if (!isDrawable(plan)) {
      // "RSVD" is how /json/eff marks an id it doesn't use: no name to show.
      const names = ownEffects(plan).map(fx => effects[fx] ?? "").filter(name => name && name !== "RSVD");
      return { status: "effects", target, name: plan.name, effects: names };
    }
    const names = [ ...new Set(plan.segments.flatMap(segment => (segment.kind === "image" ? [ segment.gif ] : []))) ];
    const loaded = await Promise.all(names.map(async name => [ name, await loadGif(target.address, name) ] as const));
    const found = new Map(loaded.filter((entry): entry is readonly [string, Gif] => entry[1] !== undefined));
    return { status: "ready", target, name: plan.name, preview: makePreview(plan, layout, found) };
  }

  return { loadDevice, loadGif, loadPreview };
}

/**
 * Where a device serves the file `name`: at its own path, unless that path
 * holds "win", which WLED takes for its HTTP API (state and all), or "sec",
 * which it refuses; those come through the file editor's path instead.
 */
function filePath(name: string): string {
  const file = name.replace(/^\/+/, "");
  if (/win|sec/.test(file)) return `/edit?func=edit&path=${encodeURIComponent(`/${file}`)}`;
  // Each part encoded whole, so "?", "#" and "&" in a name stay in the name:
  // a segment named like a request can't become one.
  return `/${file.split("/").map(encodeURIComponent).join("/")}`;
}

/** The bytes of a data URL's base64 body. */
export function dataUrlBytes(dataUrl: string): Uint8Array {
  const binary = atob(dataUrl.slice(dataUrl.indexOf(",") + 1));
  const bytes = new Uint8Array(binary.length);
  for (let at = 0; at < binary.length; at++) bytes[at] = binary.charCodeAt(at);
  return bytes;
}

/** The reader the settings use: through the background's fetch relay. */
export const wledDevices = createDeviceReader(async (url, timeoutMs) => {
  const response = await backgroundFetch(url, { cache: "no-store", credentials: "omit" }, { timeoutMs });
  if (response.ok && typeof response.data === "string") return response.data;
  // An answer with an error status, such as a 404, against no answer at all.
  return typeof response.status === "number" ? null : undefined;
});
