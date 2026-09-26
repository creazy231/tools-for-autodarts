/**
 * Numbers for a settings field: on the step's grid and inside the limits.
 *
 * The grid starts at the minimum, as a number input's own does. Float steps
 * leave tails (three tenths are 0.30000000000000004), so a result is cut to
 * the decimal places of the step and the minimum, and "on the grid" allows
 * for the tail.
 */
export interface NumberLimits {
  min?: number;
  max?: number;
  step?: number;
}

function places(value: number): number {
  const text = String(value);
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : text.length - dot - 1;
}

/** The nearest number on the step's grid, then inside the limits. */
export function snapNumber(value: number, { min, max, step = 1 }: NumberLimits): number {
  const base = min ?? 0;
  const snapped = step > 0 ? base + Math.round((value - base) / step) * step : value;
  const clamped = Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min ?? Number.NEGATIVE_INFINITY, snapped));
  return Number(clamped.toFixed(Math.max(places(step), places(base))));
}

/** Whether a number is already what snapNumber would make it: in range and on the grid. */
export function onStep(value: number, limits: NumberLimits): boolean {
  return Number.isFinite(value) && Math.abs(snapNumber(value, limits) - value) < 1e-9;
}
