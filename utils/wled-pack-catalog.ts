import type { Gif } from "@/utils/gif";
import type { DeviceIo } from "@/utils/wled-pack-install";
import type { DeviceSummary, PackIndex, PackVariant } from "@/utils/wled-packs";
import type { WledUploadMessage } from "@/utils/wled-upload";
import type { Preview } from "@/utils/wled-preview";

import { decodeGif } from "@/utils/gif";
import { backgroundFetch } from "@/utils/helpers";
import { dataUrlBytes } from "@/utils/wled-device";
import { INFO_TIMEOUT_MS } from "@/utils/wled-pack-install";
import { deviceSummary, isPackIndex, isPackVariant } from "@/utils/wled-packs";
import { makePreview, planPreset } from "@/utils/wled-preview";

/**
 * The animation packs as the WLED settings use them: the catalog the extension
 * ships (public/wled-packs/) and its pack previews, and the user's WLED, read
 * and written through the background (utils/wled-pack-install.ts's DeviceIo).
 *
 * The catalog's files are read through the background's fetch relay too: a
 * content script may not read the extension's files unless the manifest offers
 * them to the page, and this way it doesn't. What was read is kept for the
 * page's life; what failed is asked again next time.
 */

/** The catalog's folder in the extension. Every path in the catalog is relative to it. */
const CATALOG = "/wled-packs/";

/** What answered at an address, or why nothing useful did. */
export type Probe = { ok: true; device: DeviceSummary } | { ok: false; reason: "unreachable" | "not-wled" };

let index: Promise<PackIndex | undefined> | undefined;
const variants = new Map<string, Promise<PackVariant | undefined>>();
const gifs = new Map<string, Promise<Gif | undefined>>();

/** The packs on offer. */
export function loadPackIndex(): Promise<PackIndex | undefined> {
  if (!index) {
    index = packaged("index.json").then(parseJson).then(value => (isPackIndex(value) ? value : undefined));
    void index.then((value) => {
      if (!value) index = undefined;
    });
  }
  return index;
}

/** A pack in one size, by its file in the catalog. */
export function loadPackVariant(file: string): Promise<PackVariant | undefined> {
  return remembered(variants, file, async () => {
    const value = parseJson(await packaged(file));
    return isPackVariant(value) ? value : undefined;
  });
}

/** One of the catalog's GIFs, decoded. */
export function loadPackGif(name: string): Promise<Gif | undefined> {
  return remembered(gifs, name, async () => {
    const bytes = await packaged(`gifs/${name}`);
    if (!bytes) return undefined;
    try {
      return decodeGif(bytes);
    } catch {
      return undefined;
    }
  });
}

/**
 * A pack's preset, drawn as a matrix of the pack's size would show it, from
 * the pack's own presets and GIFs (utils/wled-preview.ts). The pack's effect
 * ids are WLED 16's, which planPreset knows without a device's list.
 */
export async function packPreview(variant: PackVariant, preset: number): Promise<{ name: string; preview: Preview } | undefined> {
  const layout = { width: variant.width, height: variant.height };
  const plan = planPreset(variant.presets, preset, layout);
  if (!plan.ok) return undefined;
  const names = [ ...new Set(plan.segments.flatMap(segment => (segment.kind === "image" ? [ segment.gif ] : []))) ];
  const loaded = await Promise.all(names.map(async name => [ name, await loadPackGif(name) ] as const));
  const found = new Map(loaded.filter((entry): entry is readonly [string, Gif] => entry[1] !== undefined));
  return { name: plan.name, preview: makePreview(plan, layout, found) };
}

/** The WLED at `origin`, such as http://192.168.0.227, for an install: reads through the fetch relay, uploads through `wled:upload`. */
export function deviceIo(origin: string): DeviceIo {
  return {
    async read(path, timeoutMs) {
      const response = await backgroundFetch(`${origin}${path}`, { cache: "no-store", credentials: "omit" }, { timeoutMs });
      if (response.ok && typeof response.data === "string") return dataUrlBytes(response.data);
      // An answer with an error status, such as a 404, against no answer at all.
      return typeof response.status === "number" ? null : undefined;
    },
    async upload(name, file, timeoutMs) {
      const message: WledUploadMessage = { type: "wled:upload", url: origin, name, timeoutMs, ...file };
      const answer: unknown = await browser.runtime.sendMessage(message).catch(() => undefined);
      if (!answer || typeof answer !== "object") return { ok: false, status: undefined };
      const { ok, status } = answer as { ok?: unknown; status?: unknown };
      return { ok: ok === true, status: typeof status === "number" ? status : undefined };
    },
  };
}

/** What answers at `origin`: a WLED's name, version, LEDs and free space, read from its /json/info. */
export async function probeDevice(origin: string): Promise<Probe> {
  const bytes = await deviceIo(origin).read("/json/info", INFO_TIMEOUT_MS);
  if (bytes === undefined) return { ok: false, reason: "unreachable" };
  const device = deviceSummary(parseJson(bytes ?? undefined));
  return device ? { ok: true, device } : { ok: false, reason: "not-wled" };
}

/** One of the catalog's files, read through the background. */
async function packaged(path: string): Promise<Uint8Array | undefined> {
  // A path that changes with the pack: WXT's PublicPath type knows only the ones it has seen.
  const url = (browser.runtime.getURL as (path: string) => string)(`${CATALOG}${path}`);
  const response = await backgroundFetch(url, { cache: "no-cache" });
  return response.ok && typeof response.data === "string" ? dataUrlBytes(response.data) : undefined;
}

/** `load()`'s promise for `key`, kept unless it gave nothing. */
function remembered<T>(memo: Map<string, Promise<T | undefined>>, key: string, load: () => Promise<T | undefined>): Promise<T | undefined> {
  const known = memo.get(key);
  if (known) return known;
  const promise = load().catch(() => undefined);
  memo.set(key, promise);
  void promise.then((value) => {
    if (value === undefined) memo.delete(key);
  });
  return promise;
}

function parseJson(bytes: Uint8Array | undefined): unknown {
  if (!bytes) return undefined;
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return undefined;
  }
}

