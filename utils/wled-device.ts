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
 */

export interface WledDevice {
  layout: Layout;
  presets: Record<string, unknown>;
  /** Its effects' names, by id (`/json/eff`). */
  effects: string[];
}

export type DeviceRead = { ok: true; device: WledDevice } | { ok: false; reason: "unreachable" | "not-wled" };

/** A read through the background: the body as a data URL, or nothing when there was no answer. */
export type ReadUrl = (url: string, timeoutMs: number) => Promise<string | undefined>;

/** What a preview shows: the picture, or why there is none. */
export type PreviewState =
  | { status: "loading"; target: PresetRef }
  | { status: "unreachable"; target: PresetRef }
  | { status: "missing"; target: PresetRef }
  | { status: "empty"; target: PresetRef; name: string }
  | { status: "effects"; target: PresetRef; name: string; effects: string[] }
  | { status: "ready"; target: PresetRef; name: string; preview: Preview };

const JSON_TIMEOUT_MS = 4000;
const GIF_TIMEOUT_MS = 6000;
const FAILURE_MEMORY_MS = 30_000;

interface Memo<T> {
  promise: Promise<T>;
  failedAt?: number;
}

export function createDeviceReader(read: ReadUrl, now: () => number = Date.now) {
  const devices = new Map<string, Memo<DeviceRead>>();
  const gifs = new Map<string, Memo<Gif | undefined>>();

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

  /** The JSON at `url`: `undefined` when nothing answered, `null` when the answer isn't JSON. */
  async function readJson(url: string): Promise<unknown> {
    const data = await read(url, JSON_TIMEOUT_MS);
    if (data === undefined) return undefined;
    try {
      return JSON.parse(new TextDecoder().decode(dataUrlBytes(data)));
    } catch {
      return null;
    }
  }

  function loadDevice(address: string): Promise<DeviceRead> {
    return remembered(devices, address, value => !value.ok, async (): Promise<DeviceRead> => {
      const info = await readJson(`${address}/json/info`);
      if (info === undefined) return { ok: false, reason: "unreachable" };
      const layout = layoutOf(info);
      if (!layout) return { ok: false, reason: "not-wled" };
      const [ presets, effects ] = await Promise.all([ readJson(`${address}/presets.json`), readJson(`${address}/json/eff`) ]);
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
      const data = await read(`${address}/${encodeURI(name)}`, GIF_TIMEOUT_MS);
      if (data === undefined) return undefined;
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
    const plan = planPreset(presets, target.preset, layout);
    if (!plan.ok) return plan.reason === "missing" ? { status: "missing", target } : { status: "empty", target, name: "" };
    if (!isDrawable(plan)) return { status: "effects", target, name: plan.name, effects: ownEffects(plan).map(fx => effects[fx] ?? "").filter(Boolean) };
    const names = [ ...new Set(plan.segments.flatMap(segment => (segment.kind === "image" ? [ segment.gif ] : []))) ];
    const loaded = await Promise.all(names.map(async name => [ name, await loadGif(target.address, name) ] as const));
    const found = new Map(loaded.filter((entry): entry is readonly [string, Gif] => entry[1] !== undefined));
    return { status: "ready", target, name: plan.name, preview: makePreview(plan, layout, found) };
  }

  return { loadDevice, loadGif, loadPreview };
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
  return response.ok && typeof response.data === "string" ? response.data : undefined;
});
