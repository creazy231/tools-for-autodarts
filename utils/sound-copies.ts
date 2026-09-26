import type { ISound } from "@/utils/storage";

import { backgroundFetch } from "@/utils/helpers";
import { encodeWav, isLink, planVolume, soundVolume } from "@/utils/sound-volume";

/**
 * Copies of Caller and Sound FX sounds at volumes their files do not have.
 *
 * An <audio> element plays at most as loud as its file, and on iOS no quieter
 * either. So a sound set above 100% (or below it, where the element cannot
 * follow) plays from a copy: the file decoded, every sample multiplied, and
 * written out again as a WAV. The copy then goes through the same audio
 * elements, queues and unlocking as any other sound, so nothing about how
 * sounds play changes.
 *
 * Web Audio on the element was the other way to do it, and it was turned down:
 *
 * - A linked file from a site without CORS goes silent through it.
 * - On iOS it obeys the silent switch.
 * - It needs a gesture of its own.
 *
 * See docs/superpowers/specs/2026-09-26-per-sound-volume-design.md.
 */

/** The rate copies are decoded and written at: most sound files' own, so they are rarely resampled. */
const SAMPLE_RATE = 44100;

/** How many copies an engine makes as it starts. Any beyond are made the first time they play. */
const PREPARE_LIMIT = 32;

let honoured: boolean | undefined;

/**
 * Whether a page can turn an <audio> element down here. iOS and iPadOS do not
 * let it: the volume stays 1 whatever is set, and reads back as 1.
 */
export function elementVolumeWorks(): boolean {
  if (honoured === undefined) {
    try {
      const probe = new Audio();
      probe.volume = 0.5;
      honoured = probe.volume === 0.5;
    } catch {
      honoured = false;
    }
  }
  return honoured;
}

let context: BaseAudioContext | undefined;

/** Decodes a sound file to samples at SAMPLE_RATE. The callbacks work in old engines as well as new ones. */
function decode(bytes: ArrayBuffer): Promise<AudioBuffer> {
  if (!context) {
    const Offline: typeof OfflineAudioContext = window.OfflineAudioContext ?? (window as any).webkitOfflineAudioContext;
    context = new Offline(1, 1, SAMPLE_RATE);
  }
  const decoder = context;
  return new Promise((resolve, reject) => {
    // Newer engines also return a promise, rejected with what the callback gets.
    decoder.decodeAudioData(bytes, resolve, reject)?.catch?.(() => {});
  });
}

/** The bytes of a data: URL, or of bare base64. */
function bytesOf(file: string): ArrayBuffer {
  const binary = atob(file.slice(file.indexOf(",") + 1).replace(/\s+/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export interface SoundCopies {
  /**
   * A blob: URL of `source` (a link, or the file as a data: URL) at `percent`,
   * made once and then kept. null when no copy can be made: a link the
   * extension cannot read, or a file the browser cannot decode.
   */
  copyAt(source: string, percent: number): Promise<string | null>;
  /** Whether a link's file can be read and decoded, which a copy of it needs. */
  readable(url: string): Promise<boolean>;
  /**
   * Makes, one after another, the copies the enabled sounds will need, so the
   * first dart on one does not wait for its file. `sourceOf` finds the file the
   * engine itself would play. Resolves with how many it tried.
   */
  prepare(sounds: ISound[], sourceOf: (sound: ISound) => Promise<string | undefined>): Promise<number>;
  /** Revokes every copy. One still being made is dropped when it is done. */
  forget(): void;
}

export function soundCopies(): SoundCopies {
  /** A link's file, as a data: URL, or null when it cannot be read. Each link is fetched once. */
  let links = new Map<string, Promise<string | null>>();
  /** Copies by source, then by volume. */
  let copies = new Map<string, Map<number, Promise<string | null>>>();
  const made: string[] = [];
  /** Bumped by forget(), so work started before it is dropped. */
  let generation = 0;

  function fileOf(source: string): Promise<string | null> {
    if (!isLink(source)) return Promise.resolve(source);
    let file = links.get(source);
    if (!file) {
      file = backgroundFetch(source)
        .then(response => (response.ok && response.data?.startsWith("data:") ? response.data : null))
        .catch(() => null);
      links.set(source, file);
    }
    return file;
  }

  async function decoded(source: string): Promise<AudioBuffer | null> {
    const file = await fileOf(source);
    if (!file) return null;
    try {
      return await decode(bytesOf(file));
    } catch (error) {
      console.warn("Autodarts Tools: A sound could not be decoded to change its volume", error);
      return null;
    }
  }

  async function make(source: string, percent: number, started: number): Promise<string | null> {
    const audio = await decoded(source);
    if (!audio || started !== generation) return null;
    try {
      const channels = Array.from({ length: audio.numberOfChannels }, (_, i) => audio.getChannelData(i));
      const wav = encodeWav(channels, audio.sampleRate, percent / 100);
      if (started !== generation) return null;
      const url = URL.createObjectURL(new Blob([ wav ], { type: "audio/wav" }));
      made.push(url);
      return url;
    } catch (error) {
      // Out of memory for a long file, most likely: the sound plays as it is instead
      console.warn("Autodarts Tools: A copy of a sound at another volume could not be written", error);
      return null;
    }
  }

  const self: SoundCopies = {
    copyAt(source, percent) {
      let atVolume = copies.get(source);
      if (!atVolume) {
        atVolume = new Map();
        copies.set(source, atVolume);
      }
      let copy = atVolume.get(percent);
      if (!copy) {
        copy = make(source, percent, generation);
        atVolume.set(percent, copy);
      }
      return copy;
    },

    async readable(url) {
      return (await decoded(url)) !== null;
    },

    async prepare(sounds, sourceOf) {
      const started = generation;
      const works = elementVolumeWorks();
      const needed = sounds.filter(sound => sound.enabled && !sound.tts && planVolume(soundVolume(sound), works).kind === "copy");
      let tried = 0;
      for (const sound of needed.slice(0, PREPARE_LIMIT)) {
        if (started !== generation) break;
        tried++;
        try {
          const source = await sourceOf(sound);
          if (source && started === generation) await self.copyAt(source, soundVolume(sound));
        } catch (error) {
          console.warn("Autodarts Tools: A sound could not be prepared at its volume", error);
        }
      }
      return tried;
    },

    forget() {
      generation++;
      for (const url of made) URL.revokeObjectURL(url);
      made.length = 0;
      links = new Map();
      copies = new Map();
    },
  };
  return self;
}
