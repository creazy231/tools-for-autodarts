# WLED previews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Each WLED effect that plays a preset shows that preset as an animated LED-look preview, drawn from the user's own WLED (its `presets.json`, layout and GIFs) without changing the lights.

**Architecture:** Three pure modules, `utils/gif.ts` (GIF decoder), `utils/wled-preview.ts` (which preset an effect plays, the preset's plan, the picture at time *t*) and `utils/led-canvas.ts` (geometry, LED-look painter, one shared animation loop), plus `utils/wled-device.ts`, which reads the device through the background fetch relay (now with a timeout) and turns a preset into a preview state. One component, `components/Settings/Wled/PresetPreview.vue`, shows it in the WLED list rows and in the effect dialog.

**Tech Stack:** TypeScript, Vue 3 `<script setup>`, WXT, VueUse (`useIntersectionObserver`, `useMediaQuery`, `watchDebounced`, auto-imported), canvas 2D. Tests: tsx scripts in the session scratchpad, as the repo has no test runner (`node_modules/.bin/tsx`, the repo as cwd so `@/` resolves).

**Spec:** `docs/superpowers/specs/2026-10-11-wled-previews-design.md`

## Global Constraints

- No new manifest permissions: reads go through `backgroundFetch` (utils/helpers.ts), which the background answers.
- Nothing is sent to a device to make a preview: only `GET /json/info`, `/presets.json`, `/json/eff` and GIF files.
- Previews are read only while the WLED settings are open; nothing in `entrypoints/match.content/` changes.
- Every new text in `locales/en`, `locales/de` and `locales/nl`, the site's terms (German *du*, Dutch *je*); `yarn i18n:check` passes.
- Vue SFC order per CLAUDE.md; no manual imports of auto-imported APIs; `t()` for every visible string.
- Timeouts: 4000 ms for JSON, 6000 ms for a GIF; failed reads remembered 30 000 ms.
- Drawn: fx 53 *Image* (GIF from `n`, speed `sx`, delay × (2 − sx/128), ≥ 20 ms), fx 77 *Copy Segment* (source `c3`), fx 0 *Solid* (`col[0]`), dark segments. Anything else: named, not drawn.
- LED look: panel (10, 10, 12), LED off (30, 30, 34), LED radius 0.42 of the pitch, 2–12 CSS px per LED; a row's preview fits 200 × 28, the dialog's 520 × 96.

## Review Focus

1. **A device that is off or unplugged** while the panel lists twenty effects on it: one read, rows show a quiet icon, nothing hangs or floods the console. → Task 3 test "unreachable is asked once in 30 s"; Task 5 live check with an unused address.
2. **A preset number with no preset on the device** (a typo): the row says so in the warning colour. → Task 2 `planPreset` "missing"; Task 5 live check.
3. **Typing in the dialog's address field**: no read per keystroke, and a slow answer for an old address never replaces the new one. → Task 5 debounce + `fetchPresets` address check.
4. **A big or odd GIF** (larger than the segment, interlaced, transparent, with zero delays, or truncated): it decodes or fails cleanly, never hangs. → Task 1 synthetic GIFs and the truncated-file test.
5. **Many rows animating**: off-screen rows don't draw, an effect switched off or reduced motion stands still. → Task 4 shared loop test; Task 5 live check of CPU (Performance trace not needed; check that hidden rows unsubscribe).

---

### Task 1: The GIF decoder

**Files:**
- Create: `utils/gif.ts`
- Test: `$SCR/previews/gif.test.mts`, fixtures `$SCR/previews/synth.py`, `$SCR/previews/gif-synth/`, reference `$SCR/gif-reference.json` (made from the device's GIFs in `$SCR/gifs/`)

`$SCR` is this session's scratchpad: `/private/tmp/claude-501/-Volumes-WD-BLACK-PROJECTS-Autodarts-autodarts-tools-wxt/86361c4a-960b-4e5e-8443-15e5f7681c37/scratchpad`.

**Interfaces:**
- Produces: `interface GifFrame { pixels: Uint8ClampedArray; delay: number }`, `interface Gif { width: number; height: number; frames: GifFrame[] }`, `decodeGif(bytes: Uint8Array): Gif` (throws on a non-GIF or a GIF without frames).

- [ ] **Step 1: Synthetic fixtures.** `synth.py` writes, with Pillow, GIFs that exercise what the device's GIFs don't, and a reference JSON in the same normalised form as `gif-reference.json` (per frame: delay and the SHA-1 of the RGBA with fully transparent pixels zeroed):

```python
# synth.py: GIFs for the decoder's edge cases, and Pillow's frames of them.
import hashlib, json, pathlib, sys
from PIL import Image, ImageSequence

out = pathlib.Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
W, H = 16, 8

def frames(colors, size=(W, H)):
    return [Image.new("RGB", size, c) for c in colors]

def boxes(n):
    # each frame a different small box on black, so sub-rectangles and disposal matter
    result = []
    for i in range(n):
        im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        for x in range(i * 2, i * 2 + 3):
            for y in range(1, 5):
                im.putpixel((x % W, y), (255, 40 * i % 256, 90, 255))
        result.append(im)
    return result

cases = {
    "plain.gif": dict(images=frames([(255, 0, 0), (0, 255, 0), (0, 0, 255)]), duration=[100, 50, 0], loop=0),
    "interlaced.gif": dict(images=frames([(10, 200, 30), (200, 10, 30)], (16, 20)), duration=100, loop=0, interlace=True),
    "transparent-dispose2.gif": dict(images=boxes(4), duration=80, loop=0, disposal=2, transparency=0),
    "transparent-dispose1.gif": dict(images=boxes(4), duration=80, loop=0, disposal=1, transparency=0),
    "dispose3.gif": dict(images=boxes(3), duration=60, loop=0, disposal=3, transparency=0),
    "zero-delay.gif": dict(images=frames([(1, 2, 3), (4, 5, 6)]), duration=0, loop=0),
    "local-tables.gif": dict(images=[Image.radial_gradient("L").resize((W, H)).convert("P"), Image.linear_gradient("L").resize((W, H)).convert("RGB")], duration=70, loop=0, optimize=False),
}
ref = {}
for name, opts in cases.items():
    images = opts.pop("images")
    images[0].save(out / name, save_all=True, append_images=images[1:], **opts)
    im = Image.open(out / name)
    fs = []
    for frame in ImageSequence.Iterator(im):
        rgba = frame.convert("RGBA").tobytes()
        norm = bytearray()
        for k in range(0, len(rgba), 4):
            r, g, b, a = rgba[k:k + 4]
            norm += bytes((0, 0, 0, 0)) if a == 0 else bytes((r, g, b, 255))
        fs.append({"delay": frame.info.get("duration", 0), "sha1": hashlib.sha1(norm).hexdigest()})
    ref[name] = {"w": im.width, "h": im.height, "frames": fs}
(out / "reference.json").write_text(json.dumps(ref))
print(len(ref), "synthetic GIFs")
```

Run: `python3 -I $SCR/previews/synth.py $SCR/previews/gif-synth` — Expected: `7 synthetic GIFs`.

- [ ] **Step 2: Write the failing test** `gif.test.mts`:

```ts
// utils/gif.ts against Pillow: every frame of every GIF, composited, with its delay.
//   cd $REPO && node_modules/.bin/tsx $SCR/previews/gif.test.mts
import { createHash } from "node:crypto";
import fs from "node:fs";

const SCR = "/private/tmp/claude-501/-Volumes-WD-BLACK-PROJECTS-Autodarts-autodarts-tools-wxt/86361c4a-960b-4e5e-8443-15e5f7681c37/scratchpad";
const { decodeGif } = await import(process.env.GIF_SRC ?? "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/utils/gif.ts");

let failed = 0;
function fail(label: string, detail: string) {
  failed++;
  console.log(`FAIL ${label}: ${detail}`);
}
function hash(pixels: Uint8ClampedArray): string {
  const norm = Buffer.alloc(pixels.length);
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] === 0) continue;
    norm[i] = pixels[i]; norm[i + 1] = pixels[i + 1]; norm[i + 2] = pixels[i + 2]; norm[i + 3] = 255;
  }
  return createHash("sha1").update(norm).digest("hex");
}
function compare(dir: string, reference: Record<string, { w: number; h: number; frames: { delay: number; sha1: string }[] }>) {
  let checked = 0;
  for (const [ name, want ] of Object.entries(reference)) {
    const gif = decodeGif(new Uint8Array(fs.readFileSync(`${dir}/${name}`)));
    if (gif.width !== want.w || gif.height !== want.h) { fail(name, `size ${gif.width}x${gif.height}`); continue; }
    if (gif.frames.length !== want.frames.length) { fail(name, `${gif.frames.length} frames, Pillow ${want.frames.length}`); continue; }
    want.frames.forEach((frame, i) => {
      if (gif.frames[i].delay !== frame.delay) fail(name, `frame ${i} delay ${gif.frames[i].delay}, Pillow ${frame.delay}`);
      if (hash(gif.frames[i].pixels) !== frame.sha1) fail(name, `frame ${i} pixels differ`);
    });
    checked++;
  }
  return checked;
}

const device = compare(`${SCR}/gifs`, JSON.parse(fs.readFileSync(`${SCR}/gif-reference.json`, "utf8")));
const synth = compare(`${SCR}/previews/gif-synth`, JSON.parse(fs.readFileSync(`${SCR}/previews/gif-synth/reference.json`, "utf8")));

// Not a GIF, and a GIF cut short: an error, or the frames that are whole, never a hang.
try { decodeGif(new TextEncoder().encode("<html>")); fail("not a GIF", "no error"); } catch {}
const whole = fs.readFileSync(`${SCR}/gifs/ad_gameon.gif`);
for (const cut of [ 13, 40, Math.floor(whole.length / 2), whole.length - 1 ]) {
  try {
    const gif = decodeGif(new Uint8Array(whole.subarray(0, cut)));
    if (!gif.frames.length) fail(`cut at ${cut}`, "no frames but no error");
  } catch {}
}
console.log(`${device} device GIFs, ${synth} synthetic`);
console.log(failed ? `${failed} FAILED` : "all passed");
process.exit(failed ? 1 : 0);
```

- [ ] **Step 3: Run it to see it fail.** Run: `cd $REPO && node_modules/.bin/tsx $SCR/previews/gif.test.mts` — Expected: `ERR_MODULE_NOT_FOUND … utils/gif.ts`.

- [ ] **Step 4: Write `utils/gif.ts`.**

```ts
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
```

- [ ] **Step 5: Run it to see it pass.** Expected: `139 device GIFs, 7 synthetic` and `all passed`.
- [ ] **Step 6: Mutation check.** Copy `utils/gif.ts` to `$SCR/previews/stage/gif.disposal.ts` with disposal 2 ignored (`if (control.disposal === 2)` → `if (false)`), and to `gif.interlace.ts` with `interlacedRow` returning `row`; run with `GIF_SRC=` each: both must FAIL their synthetic cases.
- [ ] **Step 7: Commit** `git add utils/gif.ts && git commit -m "feat: a GIF decoder for WLED previews"` (body: what it does and the Pillow check; Co-Authored-By line).

---

### Task 2: Which preset, its plan and its pictures

**Files:**
- Create: `utils/wled-preview.ts`
- Test: `$SCR/previews/preview.test.mts`

**Interfaces:**
- Consumes: `Gif` from Task 1.
- Produces:
  - `interface PresetRef { address: string; preset: number }` (`address` an origin, `http://192.168.0.227`)
  - `interface Layout { width: number; height: number }`, `interface Rect { x; y; w; h }`, `type Rgb = [number, number, number]`
  - `type SegmentPlan` (kinds `image` {gif, speed}, `copy` {source}, `solid` {color}, `dark`, `effect` {fx}; each with `id`, `rect`, `reverse`, `reverseY`, `transpose`)
  - `type PresetPlan = { ok: true; name: string; segments: SegmentPlan[] } | { ok: false; reason: "missing" | "empty" }`
  - `deviceOrigin(address: string): string | undefined`
  - `presetRef(effect: Pick<IWled, "type" | "url" | "preset" | "json_api">): PresetRef | undefined`
  - `layoutOf(info: unknown): Layout | undefined`
  - `presetNames(presets: Record<string, unknown>): [number, string][]`
  - `planPreset(presets: Record<string, unknown>, id: number, layout: Layout): PresetPlan`
  - `isDrawable(plan: PresetPlan): plan is Extract<PresetPlan, { ok: true }>`, `ownEffects(plan: PresetPlan): number[]`
  - `frameTimes(gif: Gif, speed: number): number[]`
  - `interface Preview { layout: Layout; animated: boolean; keyAt(t: number): string; pixelsAt(t: number): Uint8ClampedArray }` (RGB, 3 bytes per LED, row-major)
  - `makePreview(plan: Extract<PresetPlan, { ok: true }>, layout: Layout, gifs: ReadonlyMap<string, Gif>): Preview`

- [ ] **Step 1: Write the failing test** `preview.test.mts`. It stubs WXT's `storage` (storage.ts defines items at load) and uses the device's real `presets.json` and GIFs:

```ts
// utils/wled-preview.ts: which preset an effect plays, the preset's plan, its pictures.
//   cd $REPO && node_modules/.bin/tsx $SCR/previews/preview.test.mts
import { deepStrictEqual } from "node:assert";
import fs from "node:fs";

(globalThis as any).storage = { defineItem: () => ({ getValue: async () => undefined, setValue: async () => {}, watch: () => () => {} }) };
const SCR = "/private/tmp/claude-501/-Volumes-WD-BLACK-PROJECTS-Autodarts-autodarts-tools-wxt/86361c4a-960b-4e5e-8443-15e5f7681c37/scratchpad";
const REPO = "/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt";
const P = await import(process.env.PREVIEW_SRC ?? `${REPO}/utils/wled-preview.ts`);
const { decodeGif } = await import(`${REPO}/utils/gif.ts`);

let failed = 0;
function check(label: string, got: unknown, want: unknown) {
  try { deepStrictEqual(got, want); console.log(`PASS ${label}`); } catch { failed++; console.log(`FAIL ${label}\n  want ${JSON.stringify(want)}\n  got  ${JSON.stringify(got)}`); }
}
const fx = (type: string, url: string, preset = "0", json_api = "") => ({ type, url, preset, json_api });

// presetRef
check("preset effect", P.presetRef(fx("PRESET", "192.168.0.227", "105")), { address: "http://192.168.0.227", preset: 105 });
check("preset effect with a scheme and a slash", P.presetRef(fx("PRESET", "http://wled.local/", "7")), { address: "http://wled.local", preset: 7 });
check("preset effect without a preset", P.presetRef(fx("PRESET", "192.168.0.227", "0")), undefined);
check("preset effect without an address", P.presetRef(fx("PRESET", "", "5")), undefined);
check("preset 251 is none", P.presetRef(fx("PRESET", "192.168.0.227", "251")), undefined);
check("link with &PL=", P.presetRef(fx("URL", "http://192.168.2.49/win&PL=12&T=1")), { address: "http://192.168.2.49", preset: 12 });
check("link with /PL=", P.presetRef(fx("URL", "http://192.168.2.49/win/PL=3")), { address: "http://192.168.2.49", preset: 3 });
check("link without a preset", P.presetRef(fx("URL", "http://192.168.2.49/win&T=2")), undefined);
check("link to something else", P.presetRef(fx("URL", "https://example.com/hook?PLAYER=1")), undefined);
check("JSON with ps", P.presetRef(fx("API", "http://192.168.0.227/json/state", "0", "{\"ps\": 104}")), { address: "http://192.168.0.227", preset: 104 });
check("JSON with a placeholder and ps as text", P.presetRef(fx("API", "http://192.168.0.227/json/state", "0", "{\"ps\":\"9\",\"seg\":[{\"n\":\"{player_ascii}\"}]}")), { address: "http://192.168.0.227", preset: 9 });
check("JSON without ps", P.presetRef(fx("API", "http://192.168.0.227/json/state", "0", "{\"on\":true}")), undefined);
check("JSON that doesn't parse", P.presetRef(fx("API", "http://192.168.0.227/json/state", "0", "{on")), undefined);

// layoutOf
check("a matrix", P.layoutOf({ leds: { count: 512, matrix: { w: 64, h: 8 } } }), { width: 64, height: 8 });
check("a strip", P.layoutOf({ leds: { count: 60 } }), { width: 60, height: 1 });
check("not a WLED", P.layoutOf({ status: "ok" }), undefined);

const presets = JSON.parse(fs.readFileSync(`${SCR}/presets.json`, "utf8"));
const layout = { width: 64, height: 8 };
check("names: 170 presets less the empty 0", P.presetNames(presets).length, 169);
check("names: the first", P.presetNames(presets)[0], [ 51, "AD W Game on" ]);

// planPreset on the device's presets
const mirrored = P.planPreset(presets, 101, layout);
check("101: a GIF and its copy", mirrored.ok && mirrored.segments.map((s: any) => [ s.id, s.kind, s.rect ]), [ [ 0, "image", { x: 0, y: 0, w: 32, h: 8 } ], [ 1, "copy", { x: 32, y: 0, w: 32, h: 8 } ] ]);
check("101: its name", mirrored.ok && mirrored.name, "AD Game on");
check("101: drawable", P.isDrawable(mirrored), true);
const wide = P.planPreset(presets, 51, layout);
check("51: one wide GIF, the removed segment gone", wide.ok && wide.segments.map((s: any) => [ s.kind, s.gif, s.rect.w ]), [ [ "image", "ad_w_gameon.gif", 64 ] ]);
check("a one-shot keeps its own segments", P.planPreset(presets, 105, layout).ok, true);
check("200 holds: nothing to show", P.planPreset(presets, 200, layout), { ok: false, reason: "empty" });
check("999: missing", P.planPreset(presets, 999, layout), { ok: false, reason: "missing" });
const made = {
  1: { n: "Fire", seg: [ { id: 0, start: 0, stop: 64, startY: 0, stopY: 8, fx: 66 } ] },
  2: { n: "Red", seg: [ { id: 0, start: 0, stop: 32, startY: 0, stopY: 8, fx: 0, col: [ [ 255, 0, 0 ], [ 0, 0, 0 ] ] }, { id: 1, start: 32, stop: 64, startY: 0, stopY: 8, fx: 0, col: [ "00FF00" ], on: false } ] },
  3: { n: "Night", playlist: { ps: [ 2, 1 ], dur: [ 10, 10 ] } },
  4: { n: "Off", on: false },
};
check("an effect WLED computes: not drawable", P.isDrawable(P.planPreset(made, 1, layout)), false);
check("its effect named by id", P.ownEffects(P.planPreset(made, 1, layout)), [ 66 ]);
const red = P.planPreset(made, 2, layout);
check("solid colours, and a segment off", red.ok && red.segments.map((s: any) => [ s.kind, s.color ?? null ]), [ [ "solid", [ 255, 0, 0 ] ], [ "dark", null ] ]);
check("a playlist shows its first preset, under its own name", (() => { const p = P.planPreset(made, 3, layout); return p.ok && [ p.name, p.segments.length ]; })(), [ "Night", 2 ]);
check("a preset that switches off: drawable, all dark", (() => { const p = P.planPreset(made, 4, layout); return [ p.ok, P.isDrawable(p) ]; })(), [ true, true ]);

// frameTimes: WLED's delay × (2 − speed / 128), never under 20 ms
const gif = decodeGif(new Uint8Array(fs.readFileSync(`${SCR}/gifs/ad_gameon.gif`)));
const delays = gif.frames.map((f: any) => f.delay);
check("speed 128 plays as stored", P.frameTimes(gif, 128), delays.map((d: number) => Math.max(20, d)));
check("speed 0 plays at half speed", P.frameTimes(gif, 0), delays.map((d: number) => Math.max(20, d * 2)));
check("speed 255 as fast as WLED goes", P.frameTimes(gif, 255).every((d: number) => d >= 20), true);

// makePreview: 101's right half is its left half; its frames follow the GIF's
const gifs = new Map([ [ "ad_gameon.gif", gif ] ]);
const preview = P.makePreview(mirrored, layout, gifs);
check("animated", preview.animated, true);
const at = (t: number) => preview.pixelsAt(t);
const half = (pixels: Uint8ClampedArray, from: number) => Array.from({ length: 8 }, (_, y) => Array.from(pixels.subarray((y * 64 + from) * 3, (y * 64 + from + 32) * 3))).flat();
check("the copy shows what the GIF shows", half(at(0), 32), half(at(0), 0));
const gifRgb = (frame: number) => Array.from({ length: 8 * 32 }, (_, i) => [ 0, 1, 2 ].map(c => gif.frames[frame].pixels[i * 4 + 3] ? gif.frames[frame].pixels[i * 4 + c] : 0)).flat();
check("the left half is the GIF's first frame at 0 ms", half(at(0), 0), gifRgb(0));
const second = P.frameTimes(gif, 128)[0];
check("its second frame once the first one's time is up", half(at(second), 0), gifRgb(1));
check("a key per frame", [ preview.keyAt(0), preview.keyAt(second - 1), preview.keyAt(second) ], [ "0,0", "0,0", "1,0" ]);
const total = P.frameTimes(gif, 128).reduce((a: number, b: number) => a + b, 0);
check("it loops", preview.keyAt(total), "0,0");
const missingGif = P.makePreview(mirrored, layout, new Map());
check("a GIF that isn't on the device is dark", Array.from(missingGif.pixelsAt(0)).every(v => v === 0), true);
const redPreview = P.makePreview(red, layout, new Map());
check("solid red on the left, dark on the right, standing still", [ Array.from(redPreview.pixelsAt(0).subarray(0, 3)), Array.from(redPreview.pixelsAt(0).subarray(32 * 3, 33 * 3)), redPreview.animated ], [ [ 255, 0, 0 ], [ 0, 0, 0 ], false ]);
const flipped = P.makePreview({ ok: true, name: "", segments: [ { id: 0, rect: { x: 0, y: 0, w: 4, h: 2 }, reverse: true, reverseY: false, transpose: false, kind: "image", gif: "g", speed: 128 } ] }, { width: 4, height: 2 }, new Map([ [ "g", { width: 4, height: 2, frames: [ { delay: 100, pixels: new Uint8ClampedArray([ 255, 0, 0, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]) } ] } ] ]));
check("a reversed segment draws the GIF's first column last", Array.from(flipped.pixelsAt(0).subarray(9, 12)), [ 255, 0, 0 ]);

console.log(failed ? `${failed} FAILED` : "all passed");
process.exit(failed ? 1 : 0);
```

- [ ] **Step 2: Run it to see it fail** (`ERR_MODULE_NOT_FOUND … utils/wled-preview.ts`).

- [ ] **Step 3: Write `utils/wled-preview.ts`.**

```ts
import type { Gif } from "@/utils/gif";

import { type IWled, WledType } from "@/utils/storage";

/**
 * WLED previews: which preset an effect plays, and that preset drawn the way
 * the device draws it, from the device's own presets.json and GIFs.
 *
 * Only what files hold is drawn: a GIF on *Image* (effect 53), a copy of
 * another segment (*Copy Segment*, 77), a plain colour (*Solid*, 0), and dark
 * segments. Every other effect WLED computes as it goes, so a preset with one
 * of those is named rather than drawn (isDrawable, ownEffects).
 *
 * Nothing here reads or draws: utils/wled-device.ts reads the device, and
 * utils/led-canvas.ts draws the pictures this makes.
 */

/** A preset on a device: the device's origin, such as `http://192.168.0.227`, and the preset's number. */
export interface PresetRef {
  address: string;
  preset: number;
}

/** A device's LEDs as WLED lays them out: a matrix, or a strip one LED high. */
export interface Layout {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Rgb = [number, number, number];

interface SegmentShape {
  id: number;
  rect: Rect;
  /** WLED's `rev`, `rY` and `tp`: mirrored side to side, top to bottom, and columns and rows swapped. */
  reverse: boolean;
  reverseY: boolean;
  transpose: boolean;
}

export type SegmentPlan =
  | SegmentShape & { kind: "image"; gif: string; speed: number }
  | SegmentShape & { kind: "copy"; source: number }
  | SegmentShape & { kind: "solid"; color: Rgb }
  | SegmentShape & { kind: "dark" }
  | SegmentShape & { kind: "effect"; fx: number };

export type PresetPlan =
  | { ok: true; name: string; segments: SegmentPlan[] }
  | { ok: false; reason: "missing" | "empty" };

/** A preview's pictures over time. */
export interface Preview {
  layout: Layout;
  /** Whether it changes over time at all. */
  animated: boolean;
  /** The same for the same picture: which frame each GIF shows at `t` milliseconds. */
  keyAt: (t: number) => string;
  /** The picture at `t` milliseconds: three bytes per LED, row by row. */
  pixelsAt: (t: number) => Uint8ClampedArray;
}

export const FX_SOLID = 0;
export const FX_IMAGE = 53;
export const FX_COPY = 77;

/** WLED's colour for a segment that names none. */
const DEFAULT_COLOR: Rgb = [ 255, 160, 0 ];

/** WLED keeps presets 1 to 250. */
const PRESETS = { first: 1, last: 250 };

/** WLED's speed slider: 128 plays a GIF as stored. */
const NORMAL_SPEED = 128;

/** No frame shorter than this, about what WLED's effects run at. */
const MIN_FRAME_MS = 20;

/** A playlist that starts a playlist: followed this far, no further. */
const PLAYLIST_DEPTH = 3;

/** `PL=5` in an HTTP API link: `/win&PL=5`, `/win/PL=5`, `/win?PL=5`. */
const PL_PARAM = /[?&/]PL=(\d{1,3})(?!\d)/i;

/** The placeholders an effect's JSON can hold (utils/wled-request.ts), and a name to put in them so it parses. */
const PLACEHOLDER = /\{(?:player|player_ascii)\}/g;
const STAND_IN_NAME = "Player";

/** A device's origin from what an effect holds: `192.168.0.227`, `http://wled.local/`, a whole link. */
export function deviceOrigin(address: string): string | undefined {
  const text = address.trim();
  if (!text) return undefined;
  try {
    return new URL(/^https?:\/\//i.test(text) ? text : `http://${text}`).origin;
  } catch {
    return undefined;
  }
}

/** The preset `effect` plays, and on which device: a preset effect's, a link's `PL=`, a JSON's `"ps"`. */
export function presetRef(effect: Pick<IWled, "type" | "url" | "preset" | "json_api">): PresetRef | undefined {
  const address = deviceOrigin(effect.url ?? "");
  if (!address) return undefined;
  let preset = Number.NaN;
  if (effect.type === WledType.PRESET) preset = Number(effect.preset);
  else if (effect.type === WledType.URL) preset = Number(effect.url.match(PL_PARAM)?.[1]);
  else if (effect.type === WledType.API) preset = jsonPreset(effect.json_api ?? "");
  if (!Number.isInteger(preset) || preset < PRESETS.first || preset > PRESETS.last) return undefined;
  return { address, preset };
}

function jsonPreset(json: string): number {
  try {
    const state: unknown = JSON.parse(json.replace(PLACEHOLDER, STAND_IN_NAME));
    const ps = isRecord(state) ? state.ps : undefined;
    if (typeof ps === "number") return ps;
    if (typeof ps === "string" && /^\d+$/.test(ps)) return Number(ps);
  } catch {}
  return Number.NaN;
}

/** The layout a device's `/json/info` describes, if it is a WLED's. */
export function layoutOf(info: unknown): Layout | undefined {
  const leds = isRecord(info) && isRecord(info.leds) ? info.leds : undefined;
  if (!leds) return undefined;
  const matrix = isRecord(leds.matrix) ? leds.matrix : undefined;
  if (matrix && isCount(matrix.w) && isCount(matrix.h)) return { width: matrix.w, height: matrix.h };
  if (isCount(leds.count)) return { width: leds.count, height: 1 };
  return undefined;
}

/** The presets of a `presets.json` that have a name, by number. */
export function presetNames(presets: Record<string, unknown>): [number, string][] {
  return Object.entries(presets)
    .map(([ id, preset ]): [number, unknown] => [ Number(id), isRecord(preset) ? preset.n : undefined ])
    .filter((entry): entry is [number, string] => entry[0] >= PRESETS.first && entry[0] <= PRESETS.last && typeof entry[1] === "string")
    .sort((a, b) => a[0] - b[0]);
}

/** What preset `id` shows, segment by segment. */
export function planPreset(presets: Record<string, unknown>, id: number, layout: Layout): PresetPlan {
  return plan(presets, id, layout, 0);
}

function plan(presets: Record<string, unknown>, id: number, layout: Layout, depth: number): PresetPlan {
  const preset = presets[String(id)];
  if (!isRecord(preset) || !Object.keys(preset).length) return { ok: false, reason: "missing" };
  const name = typeof preset.n === "string" ? preset.n : "";
  const segments = Array.isArray(preset.seg) ? preset.seg : isRecord(preset.seg) ? [ preset.seg ] : [];
  if (!segments.length) {
    // A preset that only starts a playlist shows that playlist's first preset first.
    const first = isRecord(preset.playlist) && Array.isArray(preset.playlist.ps) ? preset.playlist.ps[0] : undefined;
    if (typeof first === "number" && first !== id && depth < PLAYLIST_DEPTH) {
      const next = plan(presets, first, layout, depth + 1);
      return next.ok ? { ...next, name: name || next.name } : next;
    }
    return preset.on === false ? { ok: true, name, segments: [] } : { ok: false, reason: "empty" };
  }
  const allOff = preset.on === false;
  return {
    ok: true,
    name,
    segments: segments
      .filter(isRecord)
      .filter(segment => segment.stop !== 0)
      .map((segment, index) => planSegment(segment, index, layout, allOff))
      .sort((a, b) => a.id - b.id),
  };
}

function planSegment(segment: Record<string, unknown>, index: number, layout: Layout, allOff: boolean): SegmentPlan {
  const strip = layout.height === 1;
  const x = numberOr(segment.start, 0);
  const y = strip ? 0 : numberOr(segment.startY, 0);
  const rect = clip({ x, y, w: numberOr(segment.stop, layout.width) - x, h: strip ? 1 : numberOr(segment.stopY, layout.height) - y }, layout);
  const shape: SegmentShape = { id: numberOr(segment.id, index), rect, reverse: segment.rev === true, reverseY: segment.rY === true, transpose: segment.tp === true };
  if (allOff || segment.on === false || segment.bri === 0) return { ...shape, kind: "dark" };
  const fx = numberOr(segment.fx, FX_SOLID);
  if (fx === FX_IMAGE && typeof segment.n === "string" && /\.gif$/i.test(segment.n)) {
    return { ...shape, kind: "image", gif: segment.n, speed: numberOr(segment.sx, NORMAL_SPEED) };
  }
  if (fx === FX_COPY) return { ...shape, kind: "copy", source: numberOr(segment.c3, 0) };
  if (fx === FX_SOLID) return { ...shape, kind: "solid", color: colorOf(Array.isArray(segment.col) ? segment.col[0] : undefined) };
  return { ...shape, kind: "effect", fx };
}

/** Whether every segment of `plan` can be drawn: none runs an effect WLED computes itself. */
export function isDrawable(plan: PresetPlan): plan is Extract<PresetPlan, { ok: true }> {
  return plan.ok && plan.segments.every(segment => segment.kind !== "effect");
}

/** The effects WLED computes itself in `plan`, each once, in segment order. */
export function ownEffects(plan: PresetPlan): number[] {
  if (!plan.ok) return [];
  return [ ...new Set(plan.segments.flatMap(segment => (segment.kind === "effect" ? [ segment.fx ] : []))) ];
}

/** How long each frame of `gif` stays at `speed`, as WLED's image effect plays it: delay × (2 − speed / 128). */
export function frameTimes(gif: Gif, speed: number): number[] {
  const factor = 2 - Math.min(255, Math.max(0, speed)) / NORMAL_SPEED;
  return gif.frames.map(frame => Math.max(MIN_FRAME_MS, Math.round(frame.delay * factor)));
}

/** `plan`'s pictures over time, with the GIFs in `gifs`: one that isn't there is dark. */
export function makePreview(plan: Extract<PresetPlan, { ok: true }>, layout: Layout, gifs: ReadonlyMap<string, Gif>): Preview {
  const clocks = plan.segments.map((segment) => {
    const gif = segment.kind === "image" ? gifs.get(segment.gif) : undefined;
    return gif ? clockOf(frameTimes(gif, segment.kind === "image" ? segment.speed : NORMAL_SPEED)) : undefined;
  });
  const framesAt = (t: number) => clocks.map(clock => clock?.frameAt(t) ?? 0);
  return {
    layout,
    animated: clocks.some(clock => (clock?.frames ?? 0) > 1),
    keyAt: t => framesAt(t).join(","),
    pixelsAt: t => render(plan.segments, layout, gifs, framesAt(t)),
  };
}

/** Which frame shows at `t`, the frames lasting `times` and looping. */
function clockOf(times: number[]): { frames: number; frameAt: (t: number) => number } {
  const ends: number[] = [];
  let total = 0;
  for (const time of times) ends.push(total += time);
  return {
    frames: times.length,
    frameAt(t) {
      const into = ((t % total) + total) % total;
      let low = 0;
      let high = ends.length - 1;
      while (low < high) {
        const middle = (low + high) >> 1;
        if (ends[middle] > into) high = middle;
        else low = middle + 1;
      }
      return low;
    },
  };
}

/** A segment's picture before its flips: the size it has to WLED's effects, three bytes per LED. */
interface SegmentPicture {
  w: number;
  h: number;
  rgb: Uint8ClampedArray;
}

function render(segments: SegmentPlan[], layout: Layout, gifs: ReadonlyMap<string, Gif>, frames: number[]): Uint8ClampedArray {
  const out = new Uint8ClampedArray(layout.width * layout.height * 3);
  const drawn = new Map<number, SegmentPicture>();
  const order = segments.map((segment, index) => ({ segment, frame: frames[index] }));
  // A copy reads its source's picture, so the copies come after the rest.
  for (const { segment, frame } of [ ...order.filter(entry => entry.segment.kind !== "copy"), ...order.filter(entry => entry.segment.kind === "copy") ]) {
    const picture = pictureOf(segment, frame, gifs, drawn);
    drawn.set(segment.id, picture);
    place(out, layout, segment, picture);
  }
  return out;
}

function pictureOf(segment: SegmentPlan, frame: number, gifs: ReadonlyMap<string, Gif>, drawn: ReadonlyMap<number, SegmentPicture>): SegmentPicture {
  const w = segment.transpose ? segment.rect.h : segment.rect.w;
  const h = segment.transpose ? segment.rect.w : segment.rect.h;
  const rgb = new Uint8ClampedArray(w * h * 3);
  if (segment.kind === "solid") {
    for (let at = 0; at < w * h; at++) rgb.set(segment.color, at * 3);
  } else if (segment.kind === "image") {
    // Scaled to the segment, nearest pixel, as WLED's image loader does.
    const gif = gifs.get(segment.gif);
    const pixels = gif?.frames[frame]?.pixels;
    if (gif && pixels) {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const from = (Math.floor(y * gif.height / h) * gif.width + Math.floor(x * gif.width / w)) * 4;
          if (pixels[from + 3]) rgb.set(pixels.subarray(from, from + 3), (y * w + x) * 3);
        }
      }
    }
  } else if (segment.kind === "copy" && segment.source !== segment.id) {
    const source = drawn.get(segment.source);
    if (source) {
      for (let y = 0; y < Math.min(h, source.h); y++) {
        for (let x = 0; x < Math.min(w, source.w); x++) rgb.set(source.rgb.subarray((y * source.w + x) * 3, (y * source.w + x) * 3 + 3), (y * w + x) * 3);
      }
    }
  }
  return { w, h, rgb };
}

/** A segment's picture onto the layout, flipped as WLED flips it: reversed first, then transposed. */
function place(out: Uint8ClampedArray, layout: Layout, segment: SegmentPlan, picture: SegmentPicture): void {
  for (let y = 0; y < picture.h; y++) {
    for (let x = 0; x < picture.w; x++) {
      let column = segment.reverse ? picture.w - 1 - x : x;
      let row = segment.reverseY ? picture.h - 1 - y : y;
      if (segment.transpose) [ column, row ] = [ row, column ];
      const px = segment.rect.x + column;
      const py = segment.rect.y + row;
      if (px >= layout.width || py >= layout.height) continue;
      out.set(picture.rgb.subarray((y * picture.w + x) * 3, (y * picture.w + x) * 3 + 3), (py * layout.width + px) * 3);
    }
  }
}

function clip(rect: Rect, layout: Layout): Rect {
  const x = Math.max(0, Math.min(layout.width, rect.x));
  const y = Math.max(0, Math.min(layout.height, rect.y));
  return { x, y, w: Math.max(0, Math.min(layout.width - x, rect.w)), h: Math.max(0, Math.min(layout.height - y, rect.h)) };
}

/** A colour as `col` holds one: `[r, g, b]`, `[r, g, b, w]` or hex `RRGGBB`/`WWRRGGBB`. White adds to all three. */
function colorOf(value: unknown): Rgb {
  if (Array.isArray(value) && value.length >= 3) {
    const white = Number(value[3]) || 0;
    return [ 0, 1, 2 ].map(channel => Math.min(255, (Number(value[channel]) || 0) + white)) as Rgb;
  }
  if (typeof value === "string" && /^(?:[0-9a-f]{2})?[0-9a-f]{6}$/i.test(value)) {
    const hex = value.slice(-6);
    const white = value.length === 8 ? Number.parseInt(value.slice(0, 2), 16) : 0;
    return [ 0, 2, 4 ].map(at => Math.min(255, Number.parseInt(hex.slice(at, at + 2), 16) + white)) as Rgb;
  }
  return DEFAULT_COLOR;
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isRecord(value: unknown): value is Record<string, any> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
```

- [ ] **Step 4: Run it to see it pass.**
- [ ] **Step 5: Mutation check.** A copy with `segment.c3` read as `segment.ix`'s neighbour (`source: numberOr(segment.ix, 99)`) must fail "the copy shows what the GIF shows"; one with the speed factor `speed / 128` must fail the speed checks.
- [ ] **Step 6: Commit** `feat: which preset a WLED effect plays, and the preset's pictures`.

---

### Task 3: Reading the device

**Files:**
- Create: `utils/wled-device.ts`
- Modify: `entrypoints/background.ts` (the non-chunked `fetch` path), `utils/helpers.ts` (`backgroundFetch`)
- Test: `$SCR/previews/device.test.mts`, `$SCR/previews/relay.test.mts`

**Interfaces:**
- Consumes: `decodeGif` (Task 1); `PresetRef`, `Layout`, `layoutOf`, `planPreset`, `isDrawable`, `ownEffects`, `makePreview`, `Preview` (Task 2).
- Produces:
  - `backgroundFetch(url: string, options?: RequestInit, extra?: { timeoutMs?: number })` (utils/helpers.ts; the message gains `timeoutMs`)
  - `interface WledDevice { layout: Layout; presets: Record<string, unknown>; effects: string[] }`
  - `type DeviceRead = { ok: true; device: WledDevice } | { ok: false; reason: "unreachable" | "not-wled" }`
  - `type ReadUrl = (url: string, timeoutMs: number) => Promise<string | undefined>` (the body as a data URL)
  - `type PreviewState = { status: "loading"; target } | { status: "unreachable"; target } | { status: "missing"; target } | { status: "empty"; target; name } | { status: "effects"; target; name; effects: string[] } | { status: "ready"; target; name; preview: Preview }` (`target: PresetRef`)
  - `createDeviceReader(read: ReadUrl, now?: () => number): { loadDevice(address: string): Promise<DeviceRead>; loadGif(address: string, name: string): Promise<Gif | undefined>; loadPreview(target: PresetRef): Promise<Exclude<PreviewState, { status: "loading" }>> }`
  - `dataUrlBytes(dataUrl: string): Uint8Array`
  - `wledDevices`: the reader through `backgroundFetch`.

- [ ] **Step 1: Write the failing tests.**

`device.test.mts` drives `createDeviceReader` with a fake `read` that serves the device's real files from `$SCR` as data URLs and counts requests; `relay.test.mts` loads `entrypoints/background.ts` with `defineBackground` and `browser.runtime.onMessage.addListener` stubbed, and a `fetch` that never answers unless aborted:

```ts
// device.test.mts — utils/wled-device.ts with a fake device behind `read`.
import { deepStrictEqual } from "node:assert";
import fs from "node:fs";

(globalThis as any).storage = { defineItem: () => ({ getValue: async () => undefined, setValue: async () => {}, watch: () => () => {} }) };
(globalThis as any).browser = { runtime: { getURL: (p: string) => p, sendMessage: async () => undefined } };
(globalThis as any).Audio = class extends EventTarget {};
const SCR = "/private/tmp/claude-501/-Volumes-WD-BLACK-PROJECTS-Autodarts-autodarts-tools-wxt/86361c4a-960b-4e5e-8443-15e5f7681c37/scratchpad";
const { createDeviceReader, dataUrlBytes } = await import("/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/utils/wled-device.ts");

let failed = 0;
function check(label: string, got: unknown, want: unknown) {
  try { deepStrictEqual(got, want); console.log(`PASS ${label}`); } catch { failed++; console.log(`FAIL ${label}\n  want ${JSON.stringify(want)}\n  got  ${JSON.stringify(got)}`); }
}
const dataUrl = (type: string, bytes: Buffer) => `data:${type};base64,${bytes.toString("base64")}`;
const info = { ver: "16.0.1", leds: { count: 512, matrix: { w: 64, h: 8 } } };
const files: Record<string, () => string | undefined> = {
  "http://wled.test/json/info": () => dataUrl("application/json", Buffer.from(JSON.stringify(info))),
  "http://wled.test/presets.json": () => dataUrl("application/json", fs.readFileSync(`${SCR}/presets.json`)),
  "http://wled.test/json/eff": () => dataUrl("application/json", Buffer.from(JSON.stringify(Array.from({ length: 220 }, (_, i) => (i === 66 ? "Fire 2012" : `fx${i}`))))),
  "http://html.test/json/info": () => dataUrl("text/html", Buffer.from("<html>")),
};
let requests: string[] = [];
let clock = 0;
const read = async (url: string) => {
  requests.push(url);
  if (files[url]) return files[url]();
  const gif = url.match(/^http:\/\/wled\.test\/(ad_[\w]+\.gif)$/)?.[1];
  return gif && fs.existsSync(`${SCR}/gifs/${gif}`) ? dataUrl("image/gif", fs.readFileSync(`${SCR}/gifs/${gif}`)) : undefined;
};
const reader = createDeviceReader(read, () => clock);

check("dataUrlBytes", Array.from(dataUrlBytes("data:text/plain;base64,AAEC")), [ 0, 1, 2 ]);
const device = await reader.loadDevice("http://wled.test");
check("a WLED: its layout and presets", device.ok && [ device.device.layout, Object.keys(device.device.presets).length ], [ { width: 64, height: 8 }, 170 ]);
check("read once, then kept", (await reader.loadDevice("http://wled.test"), requests.filter(r => r.endsWith("/json/info")).length), 1);
check("not a WLED", await reader.loadDevice("http://html.test"), { ok: false, reason: "not-wled" });

requests = [];
check("unreachable", await reader.loadDevice("http://gone.test"), { ok: false, reason: "unreachable" });
await reader.loadDevice("http://gone.test");
clock += 29_000;
await reader.loadDevice("http://gone.test");
check("unreachable is asked once in 30 s", requests.length, 1);
clock += 2_000;
await reader.loadDevice("http://gone.test");
check("and again after", requests.length, 2);

const ready = await reader.loadPreview({ address: "http://wled.test", preset: 101 });
check("101: ready, by its name", [ ready.status, ready.status === "ready" && ready.name, ready.status === "ready" && ready.preview.animated ], [ "ready", "AD Game on", true ]);
check("999: missing", (await reader.loadPreview({ address: "http://wled.test", preset: 999 })).status, "missing");
check("200: nothing to show", (await reader.loadPreview({ address: "http://wled.test", preset: 200 })).status, "empty");
check("a device that doesn't answer", (await reader.loadPreview({ address: "http://gone.test", preset: 1 })).status, "unreachable");
requests = [];
await Promise.all([ 101, 102, 101 ].map(preset => reader.loadPreview({ address: "http://wled.test", preset })));
check("each GIF read once", requests.filter(r => r.endsWith("ad_gameon.gif")).length, 0);

console.log(failed ? `${failed} FAILED` : "all passed");
process.exit(failed ? 1 : 0);
```

(`each GIF read once`: 101's GIF was read by the first `loadPreview`, so the later ones read nothing.)

```ts
// relay.test.mts — the background's fetch relay with a timeout.
import { deepStrictEqual } from "node:assert";

let listener: ((message: any, sender: any) => any) | undefined;
(globalThis as any).defineBackground = (main: any) => main;
(globalThis as any).browser = { runtime: { onMessage: { addListener: (l: any) => (listener = l) }, getURL: (p: string) => p } };
(globalThis as any).storage = { defineItem: () => ({ getValue: async () => undefined, setValue: async () => {}, watch: () => () => {} }) };
let aborted = false;
(globalThis as any).fetch = (_url: string, init: RequestInit = {}) => new Promise((_resolve, reject) => {
  init.signal?.addEventListener("abort", () => { aborted = true; reject(new DOMException("aborted", "AbortError")); });
});
const background = (await import(process.env.BACKGROUND_OUT ?? "./out/background.mjs")).default;
(typeof background === "function" ? background : background.main)();
const started = Date.now();
const answer = await listener!({ type: "fetch", url: "http://gone.test/json/info", timeoutMs: 200 }, {});
const took = Date.now() - started;
let failed = 0;
try { deepStrictEqual([ answer.ok, aborted, took < 1000 ], [ false, true, true ]); console.log(`PASS the relay gives up after timeoutMs (${took} ms)`); } catch { failed++; console.log("FAIL", JSON.stringify(answer), aborted, took); }
process.exit(failed ? 1 : 0);
```

`background.ts` has WXT imports, so `relay.test.mts` runs on an esbuild bundle of it: `$SCR/previews/build-background.mjs` bundles `entrypoints/background.ts` to `out/background.mjs` with `@/` pointing at the repo and the auto-imports (`defineBackground`, `browser`, `storage`) left as globals, as `wled-int/build.mjs` does for wled.ts.

- [ ] **Step 2: Run both to see them fail** (`utils/wled-device.ts` missing; the relay test hangs for nothing longer than its own guard: give the listener call a 3 s race and report FAIL).

- [ ] **Step 3: The relay's timeout.** In `entrypoints/background.ts`, non-chunked path:

```ts
          // For regular (non-chunked) fetches. A `timeoutMs` gives up on a host
          // that doesn't answer, such as a WLED that is switched off.
          const controller = typeof timeoutMs === "number" && timeoutMs > 0 ? new AbortController() : undefined;
          const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : undefined;
          return fetch(url, controller ? { ...options, signal: controller.signal } : options)
            .then(async (response) => { /* as before */ })
            .catch((error) => { /* as before */ })
            .finally(() => clearTimeout(timer));
```

with `const { url, options = {}, timeoutMs } = message;`. In `utils/helpers.ts`:

```ts
export async function backgroundFetch(url: string, options: RequestInit = {}, { timeoutMs }: { timeoutMs?: number } = {}): Promise<{ … }> {
  …
    const response = await browser.runtime.sendMessage({
      type: "fetch",
      url,
      options,
      timeoutMs,
    });
```

- [ ] **Step 4: Write `utils/wled-device.ts`.**

```ts
import type { Gif } from "@/utils/gif";

import { decodeGif } from "@/utils/gif";
import { backgroundFetch } from "@/utils/helpers";
import { isDrawable, type Layout, layoutOf, makePreview, ownEffects, planPreset, type Preview, type PresetRef } from "@/utils/wled-preview";

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
```

- [ ] **Step 5: Run both tests to see them pass.**
- [ ] **Step 6: Commit** `feat: read a WLED's presets and GIFs for its previews, through the background` (body mentions the relay's new `timeoutMs` and why reads go through the background).

---

### Task 4: Drawing LEDs

**Files:**
- Create: `utils/led-canvas.ts`
- Test: `$SCR/previews/canvas.test.mts` (geometry and the shared loop, headless; the painter is checked in the browser in Task 5)

**Interfaces:**
- Consumes: `Layout` (Task 2).
- Produces: `ROW_BOX = { width: 200, height: 28 }`, `DIALOG_BOX = { width: 520, height: 96 }`, `interface LedGeometry { cols; rows; step; pitch; margin; width; height }`, `ledGeometry(layout: Layout, box: { width: number; height: number }): LedGeometry`, `interface LedPainter { paint(rgb: Uint8ClampedArray): void }`, `ledPainter(canvas: HTMLCanvasElement, layout: Layout, geometry: LedGeometry, ratio?: number): LedPainter`, `everyFrame(callback: (now: number) => void): () => void`.

- [ ] **Step 1: Write the failing test.**

```ts
// canvas.test.mts — utils/led-canvas.ts: how a layout fits a box, and one loop for every preview.
import { deepStrictEqual } from "node:assert";

const frames: ((now: number) => void)[] = [];
(globalThis as any).requestAnimationFrame = (callback: (now: number) => void) => { frames.push(callback); return frames.length; };
const C = await import("/Volumes/WD_BLACK/PROJECTS/Autodarts/autodarts-tools-wxt/utils/led-canvas.ts");
let failed = 0;
function check(label: string, got: unknown, want: unknown) {
  try { deepStrictEqual(got, want); console.log(`PASS ${label}`); } catch { failed++; console.log(`FAIL ${label}\n  want ${JSON.stringify(want)}\n  got  ${JSON.stringify(got)}`); }
}
const fit = (w: number, h: number, box: { width: number; height: number }) => { const g = C.ledGeometry({ width: w, height: h }, box); return [ g.cols, g.rows, g.step, g.pitch, g.width, g.height ]; };
check("64×8 in a row", fit(64, 8, C.ROW_BOX), [ 64, 8, 1, 3, 194, 26 ]);
check("32×8 in a row", fit(32, 8, C.ROW_BOX), [ 32, 8, 1, 3, 98, 26 ]);
check("64×8 in the dialog", fit(64, 8, C.DIALOG_BOX), [ 64, 8, 1, 8, 520, 72 ]);
check("32×8 in the dialog", fit(32, 8, C.DIALOG_BOX), [ 32, 8, 1, 10, 330, 90 ]);
check("a 300-LED strip in a row: every 4th LED", fit(300, 1, C.ROW_BOX), [ 75, 1, 4, 2, 152, 4 ]);
check("16×16 in a row", fit(16, 16, C.ROW_BOX), [ 16, 16, 1, 2, 34, 34 ].map((v, i) => (i < 4 ? v : v)));
const fits = (w: number, h: number, box: { width: number; height: number }) => { const g = C.ledGeometry({ width: w, height: h }, box); return g.width <= box.width && g.height <= box.height; };
check("every size fits its box", [ [ 64, 8 ], [ 32, 8 ], [ 300, 1 ], [ 1000, 1 ], [ 128, 64 ], [ 8, 8 ] ].every(([ w, h ]) => fits(w, h, C.ROW_BOX) && fits(w, h, C.DIALOG_BOX)), true);

// One loop: two previews share a frame, and it stops with the last of them.
const seen: string[] = [];
const stopA = C.everyFrame(() => seen.push("a"));
const stopB = C.everyFrame(() => seen.push("b"));
check("one frame asked for two previews", frames.length, 1);
frames.shift()!(16);
check("both drawn in it", seen, [ "a", "b" ]);
stopA();
frames.shift()!(32);
check("only b after a stops", seen, [ "a", "b", "b" ]);
stopB();
frames.shift()!(48);
check("no frame asked for once none is left", frames.length, 0);

console.log(failed ? `${failed} FAILED` : "all passed");
process.exit(failed ? 1 : 0);
```

(The 16×16 row case: pitch is limited by the 28 px height, `floor(28 / 17) = 1`, raised to the minimum 2: 32 + 2 margin… the run settles the exact numbers; what must hold is the "every size fits its box" check, so this one line is adjusted to the implementation's numbers once, with the reason noted.)

- [ ] **Step 2: Run it to see it fail.**
- [ ] **Step 3: Write `utils/led-canvas.ts`.**

```ts
import type { Layout } from "@/utils/wled-preview";

/**
 * Drawing a WLED preview as LEDs: round, on a dark panel, the look of
 * wled-project's preview GIFs. A picture goes into a canvas of one pixel per
 * LED, is drawn scaled up without smoothing, and a plate with a round hole per
 * LED is laid over it, so a frame costs three draws whatever the LED count.
 */

/** The panel's colour, and an LED's that is off: wled-project's preview colours. */
const PANEL_FILL = "rgb(10 10 12)";
const LED_OFF = [ 30, 30, 34 ];

/** An LED's radius, in pitches. */
const LED_RADIUS = 0.42;

/** CSS pixels per LED. */
const PITCH = { min: 2, max: 12 };

/** What a preview may take: a row's, in the line under the effect's name, and the dialog's. */
export const ROW_BOX = { width: 200, height: 28 };
export const DIALOG_BOX = { width: 520, height: 96 };

export interface LedGeometry {
  /** LEDs drawn across and down: every `step`-th of the layout's. */
  cols: number;
  rows: number;
  step: number;
  /** CSS pixels from one LED's centre to the next, and the panel's margin. */
  pitch: number;
  margin: number;
  /** The panel, in CSS pixels. */
  width: number;
  height: number;
}

export interface LedPainter {
  paint: (rgb: Uint8ClampedArray) => void;
}

/** The biggest panel for `layout` that fits `box`, at a whole number of pixels per LED. */
export function ledGeometry(layout: Layout, box: { width: number; height: number }): LedGeometry {
  let step = 1;
  while ((Math.ceil(layout.width / step) + 1) * PITCH.min > box.width || (Math.ceil(layout.height / step) + 1) * PITCH.min > box.height) step++;
  const cols = Math.ceil(layout.width / step);
  const rows = Math.ceil(layout.height / step);
  const pitch = Math.max(PITCH.min, Math.min(PITCH.max, Math.floor(Math.min(box.width / (cols + 1), box.height / (rows + 1)))));
  const margin = Math.floor(pitch / 2);
  return { cols, rows, step, pitch, margin, width: cols * pitch + 2 * margin, height: rows * pitch + 2 * margin };
}

/** Draws pictures of `layout` (three bytes per LED, row by row) onto `canvas` as LEDs. */
export function ledPainter(canvas: HTMLCanvasElement, layout: Layout, geometry: LedGeometry, ratio = Math.max(1, Math.round(globalThis.devicePixelRatio || 1))): LedPainter {
  canvas.width = geometry.width * ratio;
  canvas.height = geometry.height * ratio;
  canvas.style.width = `${geometry.width}px`;
  canvas.style.height = `${geometry.height}px`;
  const context = canvas.getContext("2d");
  const leds = document.createElement("canvas");
  leds.width = geometry.cols;
  leds.height = geometry.rows;
  const ledContext = leds.getContext("2d");
  const image = ledContext?.createImageData(geometry.cols, geometry.rows);
  const plate = platePicture(geometry, ratio);
  return {
    paint(rgb) {
      if (!context || !ledContext || !image) return;
      for (let row = 0; row < geometry.rows; row++) {
        for (let col = 0; col < geometry.cols; col++) {
          const from = ((row * geometry.step) * layout.width + col * geometry.step) * 3;
          const to = (row * geometry.cols + col) * 4;
          const lit = rgb[from] || rgb[from + 1] || rgb[from + 2];
          image.data[to] = lit ? rgb[from] : LED_OFF[0];
          image.data[to + 1] = lit ? rgb[from + 1] : LED_OFF[1];
          image.data[to + 2] = lit ? rgb[from + 2] : LED_OFF[2];
          image.data[to + 3] = 255;
        }
      }
      ledContext.putImageData(image, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.imageSmoothingEnabled = false;
      context.drawImage(leds, geometry.margin * ratio, geometry.margin * ratio, geometry.cols * geometry.pitch * ratio, geometry.rows * geometry.pitch * ratio);
      context.drawImage(plate, 0, 0);
    },
  };
}

/** The panel with a round hole per LED. */
function platePicture(geometry: LedGeometry, ratio: number): HTMLCanvasElement {
  const plate = document.createElement("canvas");
  plate.width = geometry.width * ratio;
  plate.height = geometry.height * ratio;
  const context = plate.getContext("2d");
  if (!context) return plate;
  context.fillStyle = PANEL_FILL;
  context.fillRect(0, 0, plate.width, plate.height);
  context.globalCompositeOperation = "destination-out";
  context.beginPath();
  const radius = geometry.pitch * LED_RADIUS * ratio;
  for (let row = 0; row < geometry.rows; row++) {
    for (let col = 0; col < geometry.cols; col++) {
      const x = (geometry.margin + (col + 0.5) * geometry.pitch) * ratio;
      const y = (geometry.margin + (row + 0.5) * geometry.pitch) * ratio;
      context.moveTo(x + radius, y);
      context.arc(x, y, radius, 0, Math.PI * 2);
    }
  }
  context.fill();
  return plate;
}

const callbacks = new Set<(now: number) => void>();
let scheduled = false;

/** `callback` on every animation frame until the returned function stops it: one loop for every preview on screen. */
export function everyFrame(callback: (now: number) => void): () => void {
  callbacks.add(callback);
  schedule();
  return () => {
    callbacks.delete(callback);
  };
}

function schedule(): void {
  if (scheduled || !callbacks.size) return;
  scheduled = true;
  requestAnimationFrame((now) => {
    scheduled = false;
    for (const callback of [ ...callbacks ]) callback(now);
    schedule();
  });
}
```

- [ ] **Step 4: Run it to see it pass** (adjust the one 16×16 line as noted).
- [ ] **Step 5: Commit** `feat: draw WLED previews as LEDs, one animation loop for all of them`.

---

### Task 5: The previews in the WLED settings

**Files:**
- Create: `components/Settings/Wled/PresetPreview.vue`
- Modify: `components/Settings/Wled.vue` (rows' `#meta`, the dialog, `fetchPresets`), `locales/en/wled.ts`, `locales/de/wled.ts`, `locales/nl/wled.ts`, `locales/same-as-english.json` if `i18n:check` asks, `README.md`, `CHANGELOG.md`
- Test: `$SCR/e2e/previews-live.mjs` (dev Chrome, real device, read-only), `$SCR/e2e/previews-shots.mjs`

**Interfaces:**
- Consumes: `presetRef`, `deviceOrigin`, `presetNames`, `PresetRef`, `Preview` (Task 2); `wledDevices`, `PreviewState` (Task 3); `ROW_BOX`, `DIALOG_BOX`, `ledGeometry`, `ledPainter`, `everyFrame` (Task 4).
- Produces: `<PresetPreview :target="PresetRef | undefined" variant="row" | "dialog" :still="boolean" />`.

- [ ] **Step 1: Texts.** `locales/en/wled.ts`, a `preview` group:

```ts
  /** WLED previews: an effect's preset drawn from the user's WLED (components/Settings/Wled/PresetPreview.vue). */
  preview: {
    title: "Preview",
    /** The preview's accessible name. `address` is the device's, "192.168.0.227". */
    alt: "Preview of preset {preset} on {address}",
    /** Under the dialog's preview: the preset's name on the device, and its number. */
    name: "{name} · preset {preset}",
    unnamed: "Preset {preset}",
    loading: "Reading the preset from your WLED…",
    unreachable: "Your WLED at {address} didn't answer, so there's no preview.",
    /** A row's tooltip on the icon it shows instead. */
    unreachableShort: "{address} didn't answer",
    missing: "Your WLED has no preset {preset}.",
    /** `effects` are WLED's own effect names, such as "Fire 2012". */
    effects: "{effects}: WLED draws this itself, so it only shows on the lights.",
    ownEffect: "WLED draws this preset itself, so it only shows on the lights.",
    empty: "Preset {preset} changes nothing that can be shown.",
  },
```

German (`du`, "WLED-Gerät" as the catalog says elsewhere) and Dutch (`je`):

```ts
  preview: {
    title: "Vorschau",
    alt: "Vorschau von Preset {preset} auf {address}",
    name: "{name} · Preset {preset}",
    unnamed: "Preset {preset}",
    loading: "Preset wird von deinem WLED-Gerät gelesen …",
    unreachable: "Dein WLED-Gerät unter {address} hat nicht geantwortet, darum gibt es keine Vorschau.",
    unreachableShort: "{address} hat nicht geantwortet",
    missing: "Dein WLED-Gerät hat kein Preset {preset}.",
    effects: "{effects}: Das berechnet WLED selbst, es ist nur an den Lichtern zu sehen.",
    ownEffect: "Dieses Preset berechnet WLED selbst, es ist nur an den Lichtern zu sehen.",
    empty: "Preset {preset} ändert nichts, was sich zeigen ließe.",
  },
```

```ts
  preview: {
    title: "Voorbeeld",
    alt: "Voorbeeld van preset {preset} op {address}",
    name: "{name} · preset {preset}",
    unnamed: "Preset {preset}",
    loading: "Preset wordt van je WLED-apparaat gelezen…",
    unreachable: "Je WLED-apparaat op {address} gaf geen antwoord, dus er is geen voorbeeld.",
    unreachableShort: "{address} gaf geen antwoord",
    missing: "Je WLED-apparaat heeft geen preset {preset}.",
    effects: "{effects}: dit berekent WLED zelf, dus het is alleen op de lampen te zien.",
    ownEffect: "Deze preset berekent WLED zelf, dus hij is alleen op de lampen te zien.",
    empty: "Preset {preset} verandert niets wat te laten zien is.",
  },
```

(Match the catalogs' existing words: check `locales/nl/wled.ts` for how it names the device and "preset" first, and `locales/GLOSSARY.md`.)

- [ ] **Step 2: The component** `components/Settings/Wled/PresetPreview.vue`:

```vue
<template>
  <!-- Phrasing content only: in a row it sits in the line under the name, a <p>. -->
  <span v-if="state.status === 'ready'" class="inline-flex min-w-0" :class="[variant === 'dialog' ? 'flex-col items-start gap-2' : 'shrink-0 items-center']">
    <canvas ref="canvas" :aria-label="label" class="block shrink-0 rounded-[3px]" role="img" :title="variant === 'row' ? label : undefined" />
    <span v-if="variant === 'dialog'" class="text-sm text-[var(--ad-text-secondary)]">
      {{ state.name ? t("wled.preview.name", { name: state.name, preset: state.target.preset }) : t("wled.preview.unnamed", { preset: state.target.preset }) }}
    </span>
  </span>
  <span v-else-if="state.status === 'loading'" aria-hidden="true" class="block shrink-0 animate-pulse rounded-[3px] bg-white/5" :class="[variant === 'dialog' ? 'h-[72px] w-[330px] max-w-full' : 'h-[26px] w-[98px]']" />
  <template v-else-if="variant === 'row'">
    <span v-if="state.status === 'unreachable'" :aria-label="t('wled.preview.unreachableShort', { address: host })" class="icon-[material-symbols--wifi-off-rounded] shrink-0 text-sm" role="img" :title="t('wled.preview.unreachableShort', { address: host })" />
    <span v-else-if="state.status === 'missing'" class="shrink-0 text-[var(--ad-warning)]">{{ t("wled.preview.missing", { preset: state.target.preset }) }}</span>
    <span v-else-if="state.status === 'effects' && state.effects.length" class="shrink-0">{{ state.effects.join(", ") }}</span>
  </template>
  <span v-else-if="state.status !== 'none'" class="block text-sm" :class="[state.status === 'missing' ? 'text-[var(--ad-warning)]' : 'text-[var(--ad-text-muted)]']">
    {{ message }}
  </span>
</template>

<script setup lang="ts">
import { DIALOG_BOX, everyFrame, type LedPainter, ledGeometry, ledPainter, ROW_BOX } from "@/utils/led-canvas";
import { type PreviewState, wledDevices } from "@/utils/wled-device";
import type { PresetRef } from "@/utils/wled-preview";

const props = withDefaults(defineProps<{
  target?: PresetRef;
  variant?: "row" | "dialog";
  /** Stands still on its first frame: an effect switched off. */
  still?: boolean;
}>(), {
  target: undefined,
  variant: "row",
  still: false,
});

const { t } = useI18n();

const state = shallowRef<PreviewState | { status: "none" }>({ status: "none" });
const canvas = ref<HTMLCanvasElement>();
const visible = ref(false);
const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

const host = computed(() => (props.target ? new URL(props.target.address).host : ""));
const label = computed(() => (props.target ? t("wled.preview.alt", { preset: props.target.preset, address: host.value }) : ""));
const message = computed(() => {
  const now = state.value;
  if (now.status === "loading") return t("wled.preview.loading");
  if (now.status === "unreachable") return t("wled.preview.unreachable", { address: host.value });
  if (now.status === "missing") return t("wled.preview.missing", { preset: now.target.preset });
  if (now.status === "effects") return now.effects.length ? t("wled.preview.effects", { effects: now.effects.join(", ") }) : t("wled.preview.ownEffect");
  if (now.status === "empty") return t("wled.preview.empty", { preset: now.target.preset });
  return "";
});

let painter: LedPainter | undefined;
let stop: (() => void) | undefined;
let startedAt = 0;
let shown = "";
let run = 0;

useIntersectionObserver(canvas, ([ entry ]) => {
  visible.value = entry?.isIntersecting ?? false;
});

watch(() => (props.target ? `${props.target.address}#${props.target.preset}` : ""), async () => {
  const target = props.target;
  const mine = ++run;
  if (!target) {
    state.value = { status: "none" };
    return;
  }
  state.value = { status: "loading", target };
  const loaded = await wledDevices.loadPreview(target);
  if (mine === run) state.value = loaded;
}, { immediate: true });

watch([ canvas, state ], () => {
  const now = state.value;
  painter = undefined;
  if (now.status !== "ready" || !canvas.value) return;
  const layout = now.preview.layout;
  painter = ledPainter(canvas.value, layout, ledGeometry(layout, props.variant === "dialog" ? DIALOG_BOX : ROW_BOX));
  startedAt = performance.now();
  shown = "";
  draw(startedAt);
}, { flush: "post" });

watch([ visible, reducedMotion, () => props.still, state ], () => {
  stop?.();
  stop = undefined;
  const now = state.value;
  if (now.status === "ready" && now.preview.animated && visible.value && !reducedMotion.value && !props.still) stop = everyFrame(draw);
});

onBeforeUnmount(() => {
  stop?.();
  run++;
});

/** The frame for `now`, when it differs from the one showing. */
function draw(now: number) {
  const current = state.value;
  if (current.status !== "ready" || !painter) return;
  const t = reducedMotion.value || props.still ? 0 : now - startedAt;
  const key = current.preview.keyAt(t);
  if (key === shown) return;
  shown = key;
  painter.paint(current.preview.pixelsAt(t));
}
</script>
```

- [ ] **Step 3: Wire it into `Wled.vue`.**
  - Imports: `import PresetPreview from "./Wled/PresetPreview.vue";`, `import { deviceOrigin, type PresetRef, presetNames, presetRef } from "@/utils/wled-preview";`, `import { wledDevices } from "@/utils/wled-device";`.
  - Refs: `const draftTarget = ref<PresetRef>();`
  - Computed: `const previewTargets = computed(() => effects.value.map(effect => presetRef(effect)));`
  - Rows, `#meta`, first: `<PresetPreview :still="!entry.enabled" :target="previewTargets[entry.index]" variant="row" />`.
  - Dialog, after the type-specific fields and before `TriggerField`:

```vue
        <div v-if="draftTarget">
          <p class="adt-field-label">
            {{ t("wled.preview.title") }}
          </p>
          <PresetPreview :target="draftTarget" variant="dialog" />
        </div>
```

  - Watches: replace the one that calls `fetchPresets` on every keystroke by

```ts
watchDebounced(() => [ newEffect.value.url, newEffect.value.type ], async () => {
  if (newEffect.value.type === WledType.PRESET && newEffect.value.url) await fetchPresets();
}, { debounce: 400 });

watchDebounced(() => [ newEffect.value.type, newEffect.value.url, newEffect.value.preset, newEffect.value.json_api ], () => {
  draftTarget.value = presetRef(newEffect.value);
}, { debounce: 400 });
```

  - `openAddEffectModal`: `draftTarget.value = undefined;` — `editEffect`: `draftTarget.value = presetRef(newEffect.value);` once `newEffect` is set, so an existing effect's preview shows at once.
  - `fetchPresets()` through the device reader (Firefox couldn't read `presets.json` from the content script):

```ts
async function fetchPresets() {
  const address = deviceOrigin(newEffect.value.url);
  if (!address) return;
  presetChoices.value = [ { value: newEffect.value.preset, key: "wled.preset.readFailed" } ];
  const read = await wledDevices.loadDevice(address);
  // Typed on meanwhile: the newer address's read decides.
  if (deviceOrigin(newEffect.value.url) !== address || !read.ok) return;
  presetChoices.value = [
    { value: "0", key: "wled.preset.pick" },
    ...presetNames(read.device.presets).map(([ id, name ]) => ({ value: String(id), label: `[${id}] ${name}` })),
  ];
}
```

  (Before: a preset without a name was skipped, and that stays so.)

- [ ] **Step 4: Checks.** `yarn i18n:check`, `yarn lint`, `yarn compile` (12 errors, none in changed files), `yarn build`; the built manifest's permissions equal the last release's.
- [ ] **Step 5: In the dev Chrome, read-only.** A test config with effects of the real device's presets (101 mirrored, 51 wide, 105 one-shot, 999 missing), a URL effect `http://192.168.0.227/win&PL=52`, an API effect `{"ps":186}`, and a preset effect on `192.168.0.250` (nothing there). Solid colours and effects WLED computes are checked against the stand-in, never by writing presets to the real device: it serves `/json/info` (a 32×8 matrix), a `presets.json` with a *Solid* red preset and a *Fire 2012* preset, and `/json/eff`. Check: rows draw, the copy half equals the GIF half (read back from the canvas with `getImageData`), the unreachable row shows the icon within the 4 s timeout and is read once, the missing row says so, the Fire row names its effect, the dialog shows "AD Game on · preset 101", and the preset list fills. Screenshots at 1600 and 390 px, in en, de and nl. The config is backed up first and put back in `finally`.
- [ ] **Step 6: README and CHANGELOG.** README, WLED section, a `#### Previews` part: what is drawn, from where, what isn't, no address to enter, nothing changes on the lights. CHANGELOG `[Unreleased]`: *Added* the previews; *Fixed* the dialog's preset list on Firefox.
- [ ] **Step 7: Commit** `feat: WLED shows each effect's preset as it looks, read from your own WLED`, then merge the branch into `main` with `--no-ff`. Not pushed.
