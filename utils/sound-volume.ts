import type { ISound } from "@/utils/storage";

/**
 * How loud a Caller or Sound FX sound plays, as a percentage of its file.
 *
 * 100 is the file as it is, and the default: a sound saved before volumes
 * existed has none and plays at 100. Text to speech stops at 100, because a
 * voice can be turned down but nothing a page does makes it louder. See
 * docs/superpowers/specs/2026-09-26-per-sound-volume-design.md.
 */
export const DEFAULT_VOLUME = 100;
export const MAX_VOLUME = 200;
export const MAX_TTS_VOLUME = 100;
export const VOLUME_STEP = 5;

/**
 * The volume a sound plays at: what it stores, whole and inside its range, or
 * 100 when it stores nothing usable. A config can come from an import or be
 * edited by hand, so anything may be in there.
 */
export function soundVolume(sound: Pick<ISound, "volume" | "tts">): number {
  const { volume } = sound;
  if (typeof volume !== "number" || !Number.isFinite(volume)) return DEFAULT_VOLUME;
  const max = sound.tts ? MAX_TTS_VOLUME : MAX_VOLUME;
  return Math.min(max, Math.max(0, Math.round(volume)));
}

/**
 * How a sound gets to its volume.
 *
 * - `silent`: 0%, nothing plays.
 * - `element`: the <audio> element's own volume does it (1 at 100%).
 * - `copy`: a copy of the file made at that volume (utils/sound-copies.ts).
 *   That is how anything above 100% plays, since an element goes no louder
 *   than its file, and anything below it where the browser keeps elements at
 *   full volume, as iOS does.
 */
export type VolumePlan =
  | { kind: "silent" }
  | { kind: "element"; volume: number }
  | { kind: "copy"; percent: number };

export function planVolume(percent: number, elementVolumeWorks: boolean): VolumePlan {
  if (!Number.isFinite(percent)) return { kind: "element", volume: 1 };
  if (percent <= 0) return { kind: "silent" };
  if (percent === DEFAULT_VOLUME) return { kind: "element", volume: 1 };
  if (percent < DEFAULT_VOLUME && elementVolumeWorks) return { kind: "element", volume: percent / 100 };
  return { kind: "copy", percent };
}

/**
 * The 0–1 volume a percentage gives where nothing can go louder than the file
 * or voice itself: speech, and a sound whose copy could not be made.
 */
export function cappedVolume(percent: number): number {
  return Math.min(1, Math.max(0, percent / 100));
}

/** Whether a sound's source is a link, rather than its file as a data: URL (or, in old configs, bare base64). */
export function isLink(source: string): boolean {
  return /^https?:\/\//i.test(source);
}

/**
 * A 16-bit PCM WAV file of `channels`, one array per channel, every sample
 * multiplied by `gain` and clipped at full scale. WAV wants the channels
 * interleaved, one frame after another.
 */
export function encodeWav(channels: Float32Array[], sampleRate: number, gain: number): ArrayBuffer {
  const channelCount = Math.max(1, channels.length);
  const frames = channels[0]?.length ?? 0;
  const dataSize = frames * channelCount * 2;
  const view = new DataView(new ArrayBuffer(44 + dataSize));
  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };

  text(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channelCount * 2, true); // bytes per second
  view.setUint16(32, channelCount * 2, true); // bytes per frame
  view.setUint16(34, 16, true); // bits per sample
  text(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let frame = 0; frame < frames; frame++) {
    for (let channel = 0; channel < channelCount; channel++) {
      const sample = Math.max(-1, Math.min(1, (channels[channel]?.[frame] ?? 0) * gain));
      view.setInt16(offset, Math.round(sample < 0 ? sample * 0x8000 : sample * 0x7FFF), true);
      offset += 2;
    }
  }
  return view.buffer;
}
