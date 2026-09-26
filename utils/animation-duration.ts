import type { IAnimation } from "@/utils/storage";

/**
 * How long an animation stays up, and how long one run of a GIF takes.
 *
 * An animation may have a length of its own, `IAnimation.duration`, in seconds.
 * Without one it stays up for the Show for option, so every animation saved
 * before there was such a thing plays as it always has, and nothing had to be
 * migrated. See docs/superpowers/specs/2026-09-26-per-animation-duration-design.md.
 */

/** The shortest length of its own an animation keeps, in seconds. */
export const MIN_ANIMATION_DURATION = 0.1;

/**
 * Browsers show a GIF frame of 10 ms or less for 100 ms: tools write 0 when they
 * mean "the default". Chromium and Firefox say so in as many words, WebKit as
 * "under 11 ms", and the dev Chrome was measured doing it.
 */
const FAST_FRAME_MS = 10;
const FAST_FRAME_SHOWN_MS = 100;

/**
 * The animation's own length in seconds, or undefined when it has none worth
 * using: missing, 0 (what the first version of this saved for "none"), or
 * anything an imported or hand-edited config holds that is not a number of at
 * least MIN_ANIMATION_DURATION — which would otherwise reach a setTimeout.
 */
export function ownDuration(animation: Pick<IAnimation, "duration">): number | undefined {
  const seconds = animation.duration;
  return typeof seconds === "number" && Number.isFinite(seconds) && seconds >= MIN_ANIMATION_DURATION ? seconds : undefined;
}

/** How long an animation stays up, in seconds: its own length, or the Show for option's. */
export function animationDuration(animation: Pick<IAnimation, "duration">, showFor: number): number {
  return ownDuration(animation) ?? showFor;
}

/**
 * What the editor's field saves: nothing for an empty field, 0, a negative
 * number or no number at all, and otherwise at least MIN_ANIMATION_DURATION, in
 * hundredths.
 */
export function durationToSave(text: string): number | undefined {
  const trimmed = text.trim();
  if (trimmed === "") return undefined;
  const seconds = Number(trimmed);
  if (!Number.isFinite(seconds) || seconds <= 0) return undefined;
  return Math.max(MIN_ANIMATION_DURATION, roundedSeconds(seconds * 1000));
}

/** Milliseconds as seconds to the hundredth, which is what GIF delays are counted in. */
export function roundedSeconds(ms: number): number {
  return Math.round(ms / 10) / 100;
}

/** Seconds as the editor and the grid show them: "4", "4.5", "2.37". */
export function formatSeconds(seconds: number): string {
  return String(Math.round(seconds * 100) / 100);
}

/** The bytes of a data: URL, whatever type it says it is, or of bare base64. */
export function bytesOfDataUrl(dataUrl: string): Uint8Array {
  const binary = atob(dataUrl.slice(dataUrl.indexOf(",") + 1).replace(/\s+/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * How long one run of a GIF takes in a browser, in milliseconds, or null when the
 * bytes are not an animated GIF: another format, a still picture, or too broken
 * to read.
 *
 * It walks the file's blocks. Looking for the graphics control extension's bytes,
 * `21 F9 04`, anywhere in the file finds them inside compressed picture data too:
 * three of the four default "outside" GIFs read as three to eight minutes long
 * that way. A file cut short counts the frames it has in full.
 */
export function gifRunLength(bytes: Uint8Array): number | null {
  if (bytes.length < 13 || !isGifHeader(bytes)) return null;

  let pos = 13 + colorTableSize(bytes[10]);
  /** The next frame's delay in milliseconds, from the graphics control extension before it. */
  let delay = 0;
  let frames = 0;
  let total = 0;

  while (pos < bytes.length) {
    const block = bytes[pos];
    if (block === 0x21) {
      // An extension: its label, then data sub-blocks
      if (bytes[pos + 1] === 0xF9 && bytes[pos + 2] === 4 && pos + 5 < bytes.length) {
        delay = (bytes[pos + 4] | (bytes[pos + 5] << 8)) * 10;
      }
      const end = skipSubBlocks(bytes, pos + 2);
      if (end < 0) break;
      pos = end;
    } else if (block === 0x2C) {
      // A frame: a 10-byte descriptor, its own colour table, the LZW code size, then data sub-blocks
      if (pos + 9 >= bytes.length) break;
      const end = skipSubBlocks(bytes, pos + 10 + colorTableSize(bytes[pos + 9]) + 1);
      if (end < 0) break;
      frames++;
      total += delay <= FAST_FRAME_MS ? FAST_FRAME_SHOWN_MS : delay;
      delay = 0;
      pos = end;
    } else {
      // The trailer, or a byte no GIF has here: either way, that is the end
      break;
    }
  }

  return frames >= 2 ? total : null;
}

/** "GIF87a" or "GIF89a". */
function isGifHeader(bytes: Uint8Array): boolean {
  return bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38
    && (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61;
}

/** The size in bytes of the colour table a packed field announces, or 0 for none. */
function colorTableSize(packed: number): number {
  return packed & 0x80 ? 3 * (1 << ((packed & 0x07) + 1)) : 0;
}

/** Where the data sub-blocks starting at `pos` end, past their terminator, or -1 when the file ends first. */
function skipSubBlocks(bytes: Uint8Array, pos: number): number {
  while (pos < bytes.length) {
    const size = bytes[pos];
    if (size === 0) return pos + 1;
    pos += size + 1;
  }
  return -1;
}
