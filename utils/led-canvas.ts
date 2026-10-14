import type { Layout } from "@/utils/wled-preview";

/**
 * Drawing a WLED preview as LEDs: round, on a dark panel, the look of
 * wled-project's preview GIFs. A picture goes into a canvas of one pixel per
 * LED, is drawn scaled up without smoothing, and a plate with a round hole per
 * LED is laid over it, so a frame costs three draws whatever the LED count.
 *
 * A matrix of several panels (Layout.panels) gets a plate per panel, with
 * SEAM LEDs' room where two meet, so that panels hung apart read as apart:
 * WLED places them side by side and doesn't know how far apart they hang.
 * The LEDs then sit on a grid that has those empty columns and rows in it.
 * Seams go only where no panel crosses, and only where they cost no detail:
 * a preview that would have to leave out more LEDs for them is one plate.
 */

/** The panel's colour, and an LED's that is off: wled-project's preview colours. */
const PANEL_FILL = "rgb(10 10 12)";
const LED_OFF = [ 30, 30, 34 ];

/** An LED's radius, in pitches. */
const LED_RADIUS = 0.42;

/** CSS pixels per LED. */
const PITCH = { min: 2, max: 12 };

/** LEDs' room between two panels. */
const SEAM = 2;

/** A plate's rounded corners, in CSS pixels. */
const PLATE_RADIUS = 3;

/** What a preview may take: a row's, in the line under the effect's name, and the dialog's. */
export const ROW_BOX = { width: 200, height: 28 };
/** An animation pack's tile on the WLED panel: a 64 × 8 matrix at a pitch of 4. */
export const TILE_BOX = { width: 260, height: 36 };
export const DIALOG_BOX = { width: 520, height: 96 };

export interface LedGeometry {
  /** LEDs drawn across and down: every `step`-th of the layout's. */
  cols: number;
  rows: number;
  step: number;
  /** CSS pixels from one LED's centre to the next, and a plate's margin. */
  pitch: number;
  margin: number;
  /** The picture, in CSS pixels. */
  width: number;
  height: number;
  /** The grid the LEDs sit on: the LEDs drawn, and SEAM empty ones at each seam between panels. */
  gridCols: number;
  gridRows: number;
  /** For each place on the grid, row by row, the layout's LED it shows; -1 for none, a seam or no panel. */
  source: Int32Array;
  /** The panels' plates, in CSS pixels. */
  plates: LedPlate[];
}

export interface LedPlate {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LedPainter {
  paint: (rgb: Uint8ClampedArray) => void;
}

/**
 * Where panels part, along one direction, in the layout's LEDs: a line no
 * panel crosses, at which a panel starts. Its room is SEAM where a panel ends
 * right there, and none where WLED already leaves LEDs between them.
 */
interface Cut {
  at: number;
  room: number;
}

/** One direction of the grid: how many LEDs are drawn, and where each one sits on the grid. */
interface Axis {
  drawn: number;
  at: number[];
  size: number;
}

/** The biggest picture of `layout` that fits `area`, at a whole number of pixels per LED. */
export function ledGeometry(layout: Layout, area: { width: number; height: number }): LedGeometry {
  // At least one LED at the least pitch with its margin, however little the line measured.
  const box = { width: Math.max(2 * PITCH.min, area.width), height: Math.max(2 * PITCH.min, area.height) };
  const panels = layout.panels?.length ? layout.panels : [ { x: 0, y: 0, w: layout.width, h: layout.height } ];
  const across = cutsOf(panels.map(panel => [ panel.x, panel.w ]), layout.width);
  const down = cutsOf(panels.map(panel => [ panel.y, panel.h ]), layout.height);
  // Panels apart only where that costs no detail: seams that would leave out
  // LEDs the picture draws without them, as a matrix of stacked panels or
  // small tiles in a row's few pixels would, make it one plate, as before.
  const together = fit(layout, [], [], box);
  const parted = fit(layout, across, down, box);
  const apart = parted.step <= together.step;
  const { step, x, y } = apart ? parted : together;
  let pitch = PITCH.max;
  while (pitch > PITCH.min && !fits(x, y, pitch, box)) pitch--;
  const margin = Math.floor(pitch / 2);

  const source = new Int32Array(x.size * y.size).fill(-1);
  // A plate for the panels between the same cuts: panels that meet with no
  // seam between them, such as two above one that spans them, share it.
  const parts = new Map<string, { left: number; right: number; top: number; bottom: number }>();
  for (const panel of panels) {
    const [ left, right ] = span(panel.x, panel.w, step, x.drawn);
    const [ top, bottom ] = span(panel.y, panel.h, step, y.drawn);
    if (left >= right || top >= bottom) continue;
    for (let row = top; row < bottom; row++) {
      for (let col = left; col < right; col++) source[y.at[row] * x.size + x.at[col]] = row * step * layout.width + col * step;
    }
    const key = apart ? `${cutsBefore(across, panel.x)},${cutsBefore(down, panel.y)}` : "";
    const part = parts.get(key);
    parts.set(key, part
      ? { left: Math.min(part.left, left), right: Math.max(part.right, right), top: Math.min(part.top, top), bottom: Math.max(part.bottom, bottom) }
      : { left, right, top, bottom });
  }
  const plates = [ ...parts.values() ].map(part => ({
    x: x.at[part.left] * pitch,
    y: y.at[part.top] * pitch,
    width: (x.at[part.right - 1] + 1 - x.at[part.left]) * pitch + 2 * margin,
    height: (y.at[part.bottom - 1] + 1 - y.at[part.top]) * pitch + 2 * margin,
  }));
  return {
    cols: x.drawn,
    rows: y.drawn,
    step,
    pitch,
    margin,
    width: extent(x, pitch),
    height: extent(y, pitch),
    gridCols: x.size,
    gridRows: y.size,
    source,
    plates,
  };
}

/** The cuts between panels from where each starts and how long it is, along a layout `length` LEDs long. */
function cutsOf(spans: number[][], length: number): Cut[] {
  const starts = [ ...new Set(spans.map(([ start ]) => start)) ].filter(at => at > 0 && at < length).sort((a, b) => a - b);
  return starts
    .filter(at => !spans.some(([ start, size ]) => start < at && at < start + size))
    .map(at => ({ at, room: spans.some(([ start, size ]) => start + size === at) ? SEAM : 0 }));
}

/** How many cuts come before a panel that starts at `start`: which part of the layout it is in. */
function cutsBefore(cuts: Cut[], start: number): number {
  return cuts.filter(cut => cut.at <= start).length;
}

/** Every step-th LED, the fewest left out that fit `box` at the least pitch, with the cuts' room. */
function fit(layout: Layout, across: Cut[], down: Cut[], box: { width: number; height: number }): { step: number; x: Axis; y: Axis } {
  // One LED each way always fits, and has no room beside it: so this ends by then.
  let step = 1;
  let x = axis(layout.width, across, step);
  let y = axis(layout.height, down, step);
  while (!fits(x, y, PITCH.min, box) && step < Math.max(layout.width, layout.height)) {
    step++;
    x = axis(layout.width, across, step);
    y = axis(layout.height, down, step);
  }
  return { step, x, y };
}

/** `length` LEDs, every `step`-th drawn, with each cut's room before the first LED drawn past it. */
function axis(length: number, cuts: Cut[], step: number): Axis {
  const drawn = Math.ceil(length / step);
  const room = new Map<number, number>();
  for (const cut of cuts) {
    const led = Math.ceil(cut.at / step);
    if (cut.room && led > 0 && led < drawn) room.set(led, (room.get(led) ?? 0) + cut.room);
  }
  const at: number[] = [];
  let shift = 0;
  for (let led = 0; led < drawn; led++) {
    shift += room.get(led) ?? 0;
    at.push(led + shift);
  }
  return { drawn, at, size: drawn + shift };
}

function fits(x: Axis, y: Axis, pitch: number, box: { width: number; height: number }): boolean {
  return extent(x, pitch) <= box.width && extent(y, pitch) <= box.height;
}

/** A grid's length in CSS pixels: its LEDs, and a margin each side. */
function extent(axis: Axis, pitch: number): number {
  return axis.size * pitch + 2 * Math.floor(pitch / 2);
}

/** The drawn LEDs a panel from `start`, `length` LEDs long, covers: [first, past the last). */
function span(start: number, length: number, step: number, drawn: number): [number, number] {
  return [ Math.ceil(start / step), Math.min(drawn, Math.ceil((start + length) / step)) ];
}

/** Draws pictures (three bytes per LED of the layout, row by row) onto `canvas` as LEDs, as `geometry` places them. */
export function ledPainter(canvas: HTMLCanvasElement, geometry: LedGeometry, ratio = Math.max(1, Math.round(globalThis.devicePixelRatio || 1))): LedPainter {
  canvas.width = geometry.width * ratio;
  canvas.height = geometry.height * ratio;
  canvas.style.width = `${geometry.width}px`;
  canvas.style.height = `${geometry.height}px`;
  const context = canvas.getContext("2d");
  const leds = document.createElement("canvas");
  leds.width = geometry.gridCols;
  leds.height = geometry.gridRows;
  const ledContext = leds.getContext("2d");
  // Clear to begin with, and a place with no LED stays clear: a seam, or a corner no panel covers.
  const image = ledContext?.createImageData(geometry.gridCols, geometry.gridRows);
  const plate = platePicture(geometry, ratio);
  return {
    paint(rgb) {
      if (!context || !ledContext || !image) return;
      for (let place = 0; place < geometry.source.length; place++) {
        const from = geometry.source[place] * 3;
        if (from < 0) continue;
        const to = place * 4;
        const lit = rgb[from] || rgb[from + 1] || rgb[from + 2];
        image.data[to] = lit ? rgb[from] : LED_OFF[0];
        image.data[to + 1] = lit ? rgb[from + 1] : LED_OFF[1];
        image.data[to + 2] = lit ? rgb[from + 2] : LED_OFF[2];
        image.data[to + 3] = 255;
      }
      ledContext.putImageData(image, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.imageSmoothingEnabled = false;
      context.drawImage(leds, geometry.margin * ratio, geometry.margin * ratio, geometry.gridCols * geometry.pitch * ratio, geometry.gridRows * geometry.pitch * ratio);
      context.drawImage(plate, 0, 0);
    },
  };
}

/** The panels' plates, with a round hole per LED. */
function platePicture(geometry: LedGeometry, ratio: number): HTMLCanvasElement {
  const plate = document.createElement("canvas");
  plate.width = geometry.width * ratio;
  plate.height = geometry.height * ratio;
  const context = plate.getContext("2d");
  if (!context) return plate;
  context.fillStyle = PANEL_FILL;
  context.beginPath();
  for (const box of geometry.plates) {
    const [ x, y, width, height ] = [ box.x, box.y, box.width, box.height ].map(value => value * ratio);
    // Safari before 16 and Firefox before 112 have no roundRect: square
    // corners there, but for the picture's own, which its CSS rounds.
    if (typeof context.roundRect === "function") context.roundRect(x, y, width, height, PLATE_RADIUS * ratio);
    else context.rect(x, y, width, height);
  }
  context.fill();
  context.globalCompositeOperation = "destination-out";
  context.beginPath();
  const radius = geometry.pitch * LED_RADIUS * ratio;
  for (let row = 0; row < geometry.gridRows; row++) {
    for (let col = 0; col < geometry.gridCols; col++) {
      if (geometry.source[row * geometry.gridCols + col] < 0) continue;
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
