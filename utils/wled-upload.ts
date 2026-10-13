/**
 * The background's part in putting an animation pack on a WLED
 * (utils/wled-pack-install.ts): one file POSTed to the device's /upload, as
 * WLED's own settings page sends it (multipart, field `data`, the file's name
 * with its slash). A GIF is read from the extension's own catalog
 * (public/wled-packs/gifs/), so only its name crosses the message channel.
 *
 * In the background because a content script in Firefox can't read what a
 * device on the LAN answers, and the answer says whether the file was kept.
 * WLED answers /upload with `Access-Control-Allow-Origin: *` like everything
 * else, so no host permission is needed.
 */

export interface WledUploadMessage {
  type: "wled:upload";
  /** The device's address; only its origin counts, such as http://192.168.0.227. */
  url: string;
  /** Where WLED keeps the file: "/ad_180.gif", "/presets.json". */
  name: string;
  /** A GIF of the catalog, by its name. */
  gif?: string;
  /** Or the file's text. */
  text?: string;
  timeoutMs?: number;
}

export interface WledUploadDeps {
  fetch: typeof fetch;
  /** The extension's own URL for one of its files. */
  packaged: (path: string) => string;
}

/** A name WLED keeps at the top of its file system: LittleFS keeps 31 characters of a path, the slash included. */
const NAME = /^\/[\w.-]{1,30}$/;
const GIF = /^[\w.-]+\.gif$/i;
const DEFAULT_TIMEOUT_MS = 20_000;

/** The multipart field WLED's /upload reads the file from, as its own settings page sends it. */
const UPLOAD_FIELD = "data";

export async function wledUpload(message: WledUploadMessage, deps: WledUploadDeps = defaultDeps()): Promise<{ ok: boolean; status?: number; error?: string }> {
  let origin: string;
  try {
    const url = new URL(message.url);
    if (url.protocol !== "http:" && url.protocol !== "https:") return { ok: false, error: "not a web address" };
    origin = url.origin;
  } catch {
    return { ok: false, error: "not an address" };
  }
  if (typeof message.name !== "string" || !NAME.test(message.name) || message.name.includes("..")) return { ok: false, error: "not a file name WLED keeps" };
  if (message.gif !== undefined && (typeof message.gif !== "string" || !GIF.test(message.gif))) return { ok: false, error: "not a GIF of the catalog" };
  if (message.gif === undefined && typeof message.text !== "string") return { ok: false, error: "no file" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), message.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    let blob: Blob;
    if (message.gif !== undefined) {
      const file = await deps.fetch(deps.packaged(`/wled-packs/gifs/${message.gif}`), { signal: controller.signal });
      if (!file.ok) return { ok: false, error: `the catalog has no ${message.gif}` };
      blob = await file.blob();
    } else {
      blob = new Blob([ message.text! ], { type: "application/json" });
    }
    const form = new FormData();
    form.append(UPLOAD_FIELD, blob, message.name);
    const response = await deps.fetch(`${origin}/upload`, { method: "POST", body: form, credentials: "omit", cache: "no-store", signal: controller.signal });
    return { ok: response.ok, status: response.status };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timer);
  }
}

function defaultDeps(): WledUploadDeps {
  return {
    fetch: (input, init) => fetch(input, init),
    // A path that changes with the pack: WXT's PublicPath type knows only the ones it has seen.
    packaged: path => (browser.runtime.getURL as (path: string) => string)(path),
  };
}
