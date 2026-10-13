import type { PackVariant } from "@/utils/wled-packs";

import { deviceEffects, fileSizes, parsePresets, planInstall, presetsFile, roomFor, samePresets } from "@/utils/wled-packs";
import { layoutOf } from "@/utils/wled-preview";

/**
 * Putting an animation pack on a WLED: the order wled-project's installer
 * (animations/install.py) has proven on a real device, over whatever reads and
 * uploads for it. In the browser that is the background (utils/wled-pack-catalog.ts,
 * `deviceIo`); in tests a stand-in.
 *
 * Everything is read and checked before anything is written: the device, its
 * effects, its presets and its room. Then every GIF, then presets.json, which
 * is read back. If the device didn't keep it, the old presets.json goes back,
 * and if even that fails it is handed back to be saved. Nothing of the user's
 * is overwritten (utils/wled-packs.ts, planInstall).
 */

/** What the install asks of a device. */
export interface DeviceIo {
  /** GET `path`: its body; `null` for an answer with an error status, such as a 404; `undefined` when nothing answered in time. */
  read: (path: string, timeoutMs: number) => Promise<Uint8Array | null | undefined>;
  /** POST a file to the device's /upload, stored under `name` ("/ad_180.gif"): a GIF of the catalog by its name, or text. */
  upload: (name: string, file: { gif: string } | { text: string }, timeoutMs: number) => Promise<{ ok: boolean; status?: number }>;
}

export type InstallStep = "read" | "upload" | "save" | "check";

/** How far an install has got: `done` of `total`, the GIFs and then presets.json and its check. While GIF *i* goes up, `done` is *i*. */
export interface InstallProgress {
  step: InstallStep;
  done: number;
  total: number;
}

/** Why a pack isn't on the device. `pack-unreadable` is the dialog's own: the catalog's file couldn't be read. */
export type InstallFailure =
  | { reason: "unreachable" }
  | { reason: "not-wled" }
  | { reason: "not-matrix" }
  | { reason: "effect-missing"; effect: string }
  | { reason: "presets-unreadable" }
  | { reason: "no-slots"; needed: number; free: number }
  | { reason: "no-room"; neededKb: number; freeKb: number }
  | { reason: "locked" }
  | { reason: "upload-failed"; file: string; status?: number }
  | { reason: "restored" }
  | { reason: "not-restored"; backup: string }
  | { reason: "pack-unreadable" };

export type InstallResult =
  | { ok: true; slots: Map<number, number>; kept: number; added: number; moved: number }
  | ({ ok: false } & InstallFailure);

/** What the packs dialog shows of an install (components/Settings/Wled/PacksDialog.vue). */
export type InstallState =
  | { phase: "confirm" }
  | { phase: "running"; progress: InstallProgress }
  | { phase: "done"; set: string; count: number; inUse: boolean; playing: string }
  | { phase: "failed"; failure: InstallFailure };

/** /json/info is small, so an answer is expected soon: a device that is off shows quickly. */
export const INFO_TIMEOUT_MS = 4000;
/** An ESP32 took 3–4.5 s for a 56 KB presets.json. */
export const LIST_TIMEOUT_MS = 15_000;
export const FILES_TIMEOUT_MS = 8000;
export const GIF_UPLOAD_TIMEOUT_MS = 20_000;
export const PRESETS_UPLOAD_TIMEOUT_MS = 30_000;

export async function installPack(io: DeviceIo, variant: PackVariant, onProgress: (progress: InstallProgress) => void = () => {}): Promise<InstallResult> {
  const total = variant.gifs.length + 2;
  const report = (step: InstallStep, done: number) => onProgress({ step, done, total });
  report("read", 0);

  const info = parsed(await io.read("/json/info", INFO_TIMEOUT_MS));
  if (info === undefined) return { ok: false, reason: "unreachable" };
  const layout = layoutOf(info);
  if (!layout) return { ok: false, reason: "not-wled" };
  if (layout.height < 2) return { ok: false, reason: "not-matrix" };

  const names = parsed(await io.read("/json/eff", LIST_TIMEOUT_MS));
  if (names === undefined) return { ok: false, reason: "unreachable" };
  const fx = deviceEffects(variant.fx, Array.isArray(names) ? names.map(name => (typeof name === "string" ? name : "")) : []);
  if (!fx.ok) return { ok: false, reason: "effect-missing", effect: fx.missing };

  const raw = await io.read("/presets.json", LIST_TIMEOUT_MS);
  if (raw === undefined) return { ok: false, reason: "unreachable" };
  // A 404 is a device without presets.
  const original = raw === null ? "" : new TextDecoder().decode(raw);
  const device = parsePresets(original);
  if (!device) return { ok: false, reason: "presets-unreadable" };

  const plan = planInstall(device, variant, fx.ids);
  if (!plan.ok) return { ok: false, reason: "no-slots", needed: plan.needed, free: plan.free };
  const body = presetsFile(plan.presets);
  const files = fileSizes(parsed(await io.read("/edit?func=list", FILES_TIMEOUT_MS)));
  const room = roomFor(info, files, variant.gifs, raw?.length ?? 0, new TextEncoder().encode(body).length);
  if (!room.ok) return { ok: false, reason: "no-room", neededKb: room.neededKb, freeKb: room.freeKb };

  for (const [ at, gif ] of variant.gifs.entries()) {
    report("upload", at);
    const sent = await io.upload(`/${gif.name}`, { gif: gif.name }, GIF_UPLOAD_TIMEOUT_MS);
    if (sent.status === 401) return { ok: false, reason: "locked" };
    if (!sent.ok) return { ok: false, reason: "upload-failed", file: gif.name, status: sent.status };
  }

  report("save", variant.gifs.length);
  const saved = await io.upload("/presets.json", { text: body }, PRESETS_UPLOAD_TIMEOUT_MS);
  // WLED refuses a locked upload before it opens the file.
  if (saved.status === 401) return { ok: false, reason: "locked" };
  report("check", variant.gifs.length + 1);
  const written = saved.ok ? await readPresets(io) : undefined;
  if (written && samePresets(written, plan.presets)) {
    report("check", total);
    return { ok: true, slots: plan.slots, kept: plan.kept, added: plan.added, moved: plan.moved };
  }

  // The new presets didn't take. The old ones, unless they are still there, go back.
  const now = written ?? await readPresets(io);
  if (now && samePresets(now, device)) return { ok: false, reason: "upload-failed", file: "presets.json", status: saved.status };
  const backup = original || presetsFile({});
  const restored = await io.upload("/presets.json", { text: backup }, PRESETS_UPLOAD_TIMEOUT_MS);
  const after = restored.ok ? await readPresets(io) : undefined;
  if (after && samePresets(after, device)) return { ok: false, reason: "restored" };
  return { ok: false, reason: "not-restored", backup };
}

async function readPresets(io: DeviceIo): Promise<Record<string, unknown> | undefined> {
  const raw = await io.read("/presets.json", LIST_TIMEOUT_MS);
  return raw === undefined ? undefined : parsePresets(raw === null ? "" : new TextDecoder().decode(raw));
}

/** JSON from a read: `undefined` when nothing answered, `null` for an error status or something that isn't JSON. */
function parsed(bytes: Uint8Array | null | undefined): unknown {
  if (bytes === undefined) return undefined;
  if (bytes === null) return null;
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}
