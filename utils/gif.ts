/**
 * A GIF decoder: every frame of an animated GIF as the screen shows it once
 * that frame is drawn, and how long it stays.
 *
 * WLED previews (utils/wled-preview.ts) draw the GIFs a device plays, read off
 * the device. The browser's own decoders don't serve there: Safari has no
 * `ImageDecoder`, and Firefox won't load the device's pictures into the page,
 * so the bytes come through the background and are decoded here, the same in
 * every browser. Nothing in it touches the DOM, so it runs headless as well.
 *
 * Frames are composited the way browsers do it: disposal 2 clears the frame's
 * rectangle to transparent, 3 puts back what was there before it, and a pixel
 * no frame has drawn stays transparent black.
 */

export interface GifFrame {
  /** RGBA of the whole screen once this frame is drawn. */
  pixels: Uint8ClampedArray;
  /** How long it stays, in milliseconds, as stored: hundredths of a second, 0 included. */
  delay: number;
}

export interface Gif {
  width: number;
  height: number;
  frames: GifFrame[];
}

interface Control {
  disposal: number;
  /** The palette index that draws nothing, or -1. */
  transparent: number;
  delay: number;
}

const NO_CONTROL: Control = { disposal: 0, transparent: -1, delay: 0 };

/** No more frames than fit this many bytes of pixels: a wall-sized GIF stops after its first few. */
const PIXEL_BUDGET = 32 * 1024 * 1024;

/** The rows of an interlaced image, as its passes store them: every 8th from 0, every 8th from 4, every 4th from 2, every 2nd from 1. */
const PASSES: [number, number][] = [ [ 0, 8 ], [ 4, 8 ], [ 2, 4 ], [ 1, 2 ] ];

/** Every frame of `bytes`. Throws on something that isn't a GIF, or one without a single frame. */
export function decodeGif(bytes: Uint8Array): Gif {
  const input = new Bytes(bytes);
  const signature = input.ascii(6);
  if (signature !== "GIF87a" && signature !== "GIF89a") throw new Error("not a GIF");
  const width = input.u16();
  const height = input.u16();
  const screenFlags = input.u8();
  input.skip(2); // the background colour's index, and the pixel aspect ratio
  const globalTable = screenFlags & 0x80 ? input.bytes(3 * (2 << (screenFlags & 0x07))) : undefined;

  const screen = new Uint8ClampedArray(width * height * 4);
  const frames: GifFrame[] = [];
  let control = NO_CONTROL;
  let dispose: (() => void) | undefined;

  while (input.left() > 0 && (frames.length + 1) * screen.length <= PIXEL_BUDGET) {
    const introducer = input.u8();
    if (introducer === 0x3B) break;
    if (introducer === 0x21) {
      const label = input.u8();
      const block = input.subBlocks();
      if (label === 0xF9 && block.length >= 4) {
        control = {
          disposal: (block[0] >> 2) & 0x07,
          transparent: block[0] & 0x01 ? block[3] : -1,
          delay: (block[1] | (block[2] << 8)) * 10,
        };
      }
      continue;
    }
    // Anything else isn't a GIF block: the frames so far are all there is.
    if (introducer !== 0x2C) break;

    dispose?.();
    const left = input.u16();
    const top = input.u16();
    const w = input.u16();
    const h = input.u16();
    const imageFlags = input.u8();
    const table = imageFlags & 0x80 ? input.bytes(3 * (2 << (imageFlags & 0x07))) : globalTable;
    const interlaced = (imageFlags & 0x40) !== 0;
    const minCodeSize = input.u8();
    const decoded = lzw(input.subBlocks(), minCodeSize, w * h);

    const before = control.disposal === 3 ? screen.slice() : undefined;
    if (table) paint(screen, width, height, { left, top, w, h, interlaced, table, transparent: control.transparent, ...decoded });
    frames.push({ pixels: screen.slice(), delay: control.delay });

    if (control.disposal === 2) dispose = () => clear(screen, width, height, { left, top, w, h });
    else if (before) dispose = () => screen.set(before);
    else dispose = undefined;
    control = NO_CONTROL;
  }
  if (!frames.length) throw new Error("no frames");
  return { width, height, frames };
}

interface Placement {
  left: number;
  top: number;
  w: number;
  h: number;
}

function paint(screen: Uint8ClampedArray, width: number, height: number, image: Placement & {
  interlaced: boolean;
  table: Uint8Array;
  transparent: number;
  indices: Uint8Array;
  count: number;
}): void {
  const colors = image.table.length / 3;
  for (let row = 0; row < image.h; row++) {
    const y = image.top + (image.interlaced ? interlacedRow(row, image.h) : row);
    if (y >= height) continue;
    for (let column = 0; column < image.w; column++) {
      const at = row * image.w + column;
      if (at >= image.count) return;
      const x = image.left + column;
      const index = image.indices[at];
      if (x >= width || index === image.transparent || index >= colors) continue;
      const pixel = (y * width + x) * 4;
      screen[pixel] = image.table[index * 3];
      screen[pixel + 1] = image.table[index * 3 + 1];
      screen[pixel + 2] = image.table[index * 3 + 2];
      screen[pixel + 3] = 255;
    }
  }
}

function clear(screen: Uint8ClampedArray, width: number, height: number, area: Placement): void {
  for (let y = area.top; y < Math.min(height, area.top + area.h); y++) {
    for (let x = area.left; x < Math.min(width, area.left + area.w); x++) screen.fill(0, (y * width + x) * 4, (y * width + x) * 4 + 4);
  }
}

/** Where the `row`th row an interlaced image stores goes. */
function interlacedRow(row: number, height: number): number {
  let left = row;
  for (const [ start, step ] of PASSES) {
    const rows = start < height ? Math.ceil((height - start) / step) : 0;
    if (left < rows) return start + left * step;
    left -= rows;
  }
  return row;
}

/**
 * GIF's LZW: codes from `minCodeSize` + 1 bits up to 12, packed from the low
 * bit. `count` is how many of the `pixels` indices it got to before the data
 * ran out or ended.
 */
function lzw(data: Uint8Array, minCodeSize: number, pixels: number): { indices: Uint8Array; count: number } {
  const indices = new Uint8Array(pixels);
  if (minCodeSize < 1 || minCodeSize > 11) return { indices, count: 0 };
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;
  const prefix = new Int16Array(4096);
  const suffix = new Uint8Array(4096);
  const stack = new Uint8Array(4097);
  for (let code = 0; code < clearCode; code++) suffix[code] = code;

  let size = minCodeSize + 1;
  let mask = (1 << size) - 1;
  let next = clearCode + 2;
  let previous = -1;
  let first = 0;
  let count = 0;
  let buffer = 0;
  let bits = 0;
  let at = 0;
  while (count < pixels) {
    while (bits < size) {
      if (at >= data.length) return { indices, count };
      buffer |= data[at++] << bits;
      bits += 8;
    }
    const code = buffer & mask;
    buffer >>>= size;
    bits -= size;

    if (code === clearCode) {
      size = minCodeSize + 1;
      mask = (1 << size) - 1;
      next = clearCode + 2;
      previous = -1;
      continue;
    }
    if (code === endCode) break;
    if (previous === -1) {
      if (code >= clearCode) break;
      indices[count++] = code;
      previous = code;
      first = code;
      continue;
    }

    let top = 0;
    let walk = code;
    if (code >= next) {
      // Not in the table yet: the previous string and its own first letter.
      if (code > next) break;
      stack[top++] = first;
      walk = previous;
    }
    while (walk >= clearCode && top < 4096) {
      stack[top++] = suffix[walk];
      walk = prefix[walk];
    }
    first = walk;
    stack[top++] = walk;
    while (top > 0 && count < pixels) indices[count++] = stack[--top];

    if (next < 4096) {
      prefix[next] = previous;
      suffix[next] = first;
      next++;
      if (next === mask + 1 && size < 12) {
        size++;
        mask = (1 << size) - 1;
      }
    }
    previous = code;
  }
  return { indices, count };
}

/** Reading a GIF's bytes: little-endian, and past the end every byte is 0. */
class Bytes {
  private at = 0;

  constructor(private readonly data: Uint8Array) {}

  left(): number {
    return this.data.length - this.at;
  }

  u8(): number {
    return this.at < this.data.length ? this.data[this.at++] : (this.at++, 0);
  }

  u16(): number {
    return this.u8() | (this.u8() << 8);
  }

  skip(count: number): void {
    this.at += count;
  }

  bytes(count: number): Uint8Array {
    const part = this.data.subarray(this.at, this.at + count);
    this.at += count;
    return part;
  }

  ascii(count: number): string {
    return String.fromCharCode(...this.bytes(count));
  }

  /** A run of sub-blocks, each its length and as many bytes, joined: up to the empty one that ends it. */
  subBlocks(): Uint8Array {
    const parts: Uint8Array[] = [];
    let size = 0;
    for (let length = this.u8(); length > 0 && this.left() > 0; length = this.u8()) {
      const part = this.bytes(length);
      parts.push(part);
      size += part.length;
    }
    const joined = new Uint8Array(size);
    let offset = 0;
    for (const part of parts) {
      joined.set(part, offset);
      offset += part.length;
    }
    return joined;
  }
}
