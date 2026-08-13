/**
 * Which autodarts hosts the content scripts run on.
 *
 * There are three shapes, because during the migration two builds run
 * side by side in the same browser and must not overlap:
 *
 *   both  production and devtools builds — one extension serves users through
 *         the transition.
 *   v2    `yarn dev` — the build being actively worked on.
 *   v1    `yarn build:reference` — the stable build, loaded next to the dev one
 *         so v1 keeps working normally while v2 is under construction.
 *
 * The split matters: if two copies of the extension claimed the same host they
 * would both inject, giving duplicate overlays, doubled notifications and
 * doubled sounds.
 */

/** Injected by Vite's `define` in wxt.config.ts. */
declare const __ADT_HOSTS__: "v1" | "v2" | "both";

const V1 = "*://play.autodarts.com/*";
const V2 = "*://play-v2.autodarts.com/*";

function resolve(): string[] {
  // `yarn dev` is always v2-only, whatever else is configured.
  if (import.meta.env.DEV) return [ V2 ];
  if (typeof __ADT_HOSTS__ === "undefined") return [ V1, V2 ];
  if (__ADT_HOSTS__ === "v1") return [ V1 ];
  if (__ADT_HOSTS__ === "v2") return [ V2 ];
  return [ V1, V2 ];
}

export const AUTODARTS_MATCHES: string[] = resolve();
