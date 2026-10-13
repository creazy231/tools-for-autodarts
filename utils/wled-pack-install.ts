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
 * effects, its presets and its room. Then every GIF. Then presets.json is read
 * again, as something may have been saved meanwhile, written, and read back.
 * What the device holds then decides, not what its answers said. If it didn't
 * keep the new file, the old one goes back, and if even that fails it is
 * handed back to be saved. Nothing of the user's is overwritten
 * (utils/wled-packs.ts, planInstall).
 */

/** An answer: its status, and its body for a 2xx. */
export interface DeviceAnswer {
  status: number;
  body: Uint8Array;
}

/** What the install asks of a device. */
export interface DeviceIo {
  /** GET `path`: the answer, or `undefined` when nothing answered in time. */
  read: (path: string, timeoutMs: number) => Promise<DeviceAnswer | undefined>;
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

/** What a pack page's row shows of its single animation's install (components/Settings/Wled/PackPage.vue): on its way, in effect set `set`, or why not, at `address`. */
export type SingleState =
  | { phase: "running" }
  | { phase: "done"; set: string }
  | { phase: "failed"; failure: InstallFailure; address: string };

/** /json/info is small, so an answer is expected soon: a device that is off shows quickly. */
export const INFO_TIMEOUT_MS = 4000;
/** An ESP32 took 3–4.5 s for a 56 KB presets.json. */
export const LIST_TIMEOUT_MS = 15_000;
export const FILES_TIMEOUT_MS = 8000;
export const GIF_UPLOAD_TIMEOUT_MS = 20_000;
export const PRESETS_UPLOAD_TIMEOUT_MS = 30_000;
/** presets.json has just grown when it is read back, and an ESP32 serves 12–19 KB a second. */
export const CHECK_TIMEOUT_MS = 30_000;

/** A presets.json as read: its text, and its presets. */
interface PresetsFile {
  text: string;
  presets: Record<string, unknown>;
}

export async function installPack(io: DeviceIo, variant: PackVariant, onProgress: (progress: InstallProgress) => void = () => {}): Promise<InstallResult> {
  const total = variant.gifs.length + 2;
  const report = (step: InstallStep, done: number) => onProgress({ step, done, total });
  report("read", 0);

  const info = await io.read("/json/info", INFO_TIMEOUT_MS);
  // A device that errors is in trouble: a WLED having a moment, not something else.
  if (!info || info.status >= 500) return { ok: false, reason: "unreachable" };
  const layout = layoutOf(json(info));
  if (!layout) return { ok: false, reason: "not-wled" };
  if (layout.height < 2) return { ok: false, reason: "not-matrix" };

  // Every WLED lists its effects: one that doesn't just now is in trouble, not without them.
  const names = json(await io.read("/json/eff", LIST_TIMEOUT_MS));
  if (!Array.isArray(names)) return { ok: false, reason: "unreachable" };
  const fx = deviceEffects(variant.fx, names.map(name => (typeof name === "string" ? name : "")));
  if (!fx.ok) return { ok: false, reason: "effect-missing", effect: fx.missing };

  const first = await readPresets(io, LIST_TIMEOUT_MS);
  if (first === undefined) return { ok: false, reason: "unreachable" };
  if (first === "unreadable") return { ok: false, reason: "presets-unreadable" };
  const files = fileSizes(json(await io.read("/edit?func=list", FILES_TIMEOUT_MS)));
  // A device that lists a presets.json with something in it, where the read found none, was read wrong:
  // going on would replace the presets it has.
  if (!first.text.trim() && (files?.["/presets.json"] ?? 0) > 0) return { ok: false, reason: "presets-unreadable" };

  let device = first;
  let plan = planInstall(device.presets, variant, fx.ids);
  if (!plan.ok) return { ok: false, reason: "no-slots", needed: plan.needed, free: plan.free };
  let body = presetsFile(plan.presets);
  const room = roomFor(json(info), files, variant.gifs, byteLength(device.text), byteLength(body));
  if (!room.ok) return { ok: false, reason: "no-room", neededKb: room.neededKb, freeKb: room.freeKb };

  for (const [ at, gif ] of variant.gifs.entries()) {
    report("upload", at);
    const sent = await io.upload(`/${gif.name}`, { gif: gif.name }, GIF_UPLOAD_TIMEOUT_MS);
    if (sent.status === 401) return { ok: false, reason: "locked" };
    if (!sent.ok) return { ok: false, reason: "upload-failed", file: gif.name, status: sent.status };
  }

  report("save", variant.gifs.length);
  // Read again just before writing: a preset saved while the GIFs went up, in WLED's own app, by a home
  // automation or by another tab, is planned around rather than lost.
  const latest = await readPresets(io, LIST_TIMEOUT_MS);
  if (latest === undefined) return { ok: false, reason: "unreachable" };
  if (latest === "unreadable") return { ok: false, reason: "presets-unreadable" };
  // presets.json doesn't vanish halfway through an install: a read that finds none, where there were some, went wrong.
  if (!latest.text.trim() && device.text.trim()) return { ok: false, reason: "presets-unreadable" };
  if (!samePresets(latest.presets, device.presets)) {
    device = latest;
    plan = planInstall(device.presets, variant, fx.ids);
    if (!plan.ok) return { ok: false, reason: "no-slots", needed: plan.needed, free: plan.free };
    body = presetsFile(plan.presets);
    const now = json(await io.read("/json/info", INFO_TIMEOUT_MS));
    const listed = fileSizes(json(await io.read("/edit?func=list", FILES_TIMEOUT_MS)));
    const roomNow = roomFor(now, listed, [], byteLength(device.text), byteLength(body));
    if (!roomNow.ok) return { ok: false, reason: "no-room", neededKb: roomNow.neededKb, freeKb: roomNow.freeKb };
  }

  const saved = await io.upload("/presets.json", { text: body }, PRESETS_UPLOAD_TIMEOUT_MS);
  report("check", variant.gifs.length + 1);
  // What the device holds decides, not the upload's answer: an answer lost on its way can belong to a write that took.
  const written = await readBack(io);
  if (written && samePresets(written.presets, plan.presets)) {
    report("check", total);
    return { ok: true, slots: plan.slots, kept: plan.kept, added: plan.added, moved: plan.moved };
  }
  // Still the old presets: the write was refused before it began. WLED checks a settings PIN that way.
  if (written && samePresets(written.presets, device.presets)) {
    return saved.status === 401 ? { ok: false, reason: "locked" } : { ok: false, reason: "upload-failed", file: "presets.json", status: saved.status };
  }

  // Something else is there, or it can't be read: the old presets go back.
  const backup = device.text || presetsFile({});
  const restored = await io.upload("/presets.json", { text: backup }, PRESETS_UPLOAD_TIMEOUT_MS);
  const after = restored.ok ? await readBack(io) : undefined;
  if (after && samePresets(after.presets, device.presets)) return { ok: false, reason: "restored" };
  return { ok: false, reason: "not-restored", backup };
}

/**
 * The device's presets.json. A 404 is a device without presets. Another error
 * status, or bytes that aren't UTF-8 or a JSON object, can't be read: going on
 * would replace the presets, or write them back changed. `undefined` is no answer.
 */
async function readPresets(io: DeviceIo, timeoutMs: number): Promise<PresetsFile | "unreadable" | undefined> {
  const answer = await io.read("/presets.json", timeoutMs);
  if (!answer) return undefined;
  if (answer.status === 404) return { text: "", presets: {} };
  if (answer.status < 200 || answer.status > 299) return "unreadable";
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(answer.body);
  } catch {
    return "unreadable";
  }
  const presets = parsePresets(text);
  return presets ? { text, presets } : "unreadable";
}

/** presets.json after a write, asked twice before it counts as unknown. */
async function readBack(io: DeviceIo): Promise<PresetsFile | undefined> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const read = await readPresets(io, CHECK_TIMEOUT_MS);
    if (read && read !== "unreadable") return read;
  }
  return undefined;
}

/** The JSON of a 2xx answer; `null` for an error status, nothing at all or something that isn't JSON. */
function json(answer: DeviceAnswer | undefined): unknown {
  if (!answer || answer.status < 200 || answer.status > 299) return null;
  try {
    return JSON.parse(new TextDecoder().decode(answer.body));
  } catch {
    return null;
  }
}

function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}
