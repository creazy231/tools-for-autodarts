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
export function ledGeometry(layout: Layout, area: { width: number; height: number }): LedGeometry {
  // At least one LED at the least pitch with its margin, however little the line measured.
  const box = { width: Math.max(2 * PITCH.min, area.width), height: Math.max(2 * PITCH.min, area.height) };
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
