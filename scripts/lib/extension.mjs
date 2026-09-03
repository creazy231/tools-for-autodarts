/**
 * Shared resolver for "which extension build should the browser load?".
 *
 * Migration work should always run against the DEV build (.output/chrome-mv3-dev)
 * so `yarn dev` hot-reloads changes into the browser as you edit. The production
 * build is only a fallback for when the dev server isn't running.
 *
 * The dev build is easy to get wrong in a way that wastes a lot of time: it is a
 * build artifact, so it can be stale relative to the source. A dev build made
 * while the rebuild still lived on play-v2 is scoped to that subdomain and had
 * play.autodarts.com stripped from its manifest, so it silently fails to load
 * on the site at all - no error, the extension just isn't there. This module
 * checks for that.
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { createConnection } from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

const DEV_DIR = join(ROOT, ".output", "chrome-mv3-dev");
const PROD_DIR = join(ROOT, ".output", "chrome-mv3");

/**
 * Port WXT serves HMR on. Set via `wxt --port` in the dev script; override here
 * with WXT_DEV_PORT if that changes. The dev build's CSP allowlists this port,
 * so the two must agree.
 */
export const WXT_DEV_PORT = Number(process.env.WXT_DEV_PORT ?? 4000);

/**
 * The only host the extension serves. A build whose manifest lacks it cannot
 * run on autodarts at all - which is exactly what a dev build predating the
 * play-v2 -> play move looks like, since that build had this host stripped.
 */
const REQUIRED_HOST = "play.autodarts.com";

function tryConnect(port, host, timeout) {
  return new Promise((res) => {
    const sock = createConnection({ port, host });
    const done = (v) => { sock.destroy(); res(v); };
    sock.setTimeout(timeout);
    sock.once("connect", () => done(true));
    sock.once("timeout", () => done(false));
    sock.once("error", () => done(false));
  });
}

/**
 * WXT binds its dev server to [::1] (IPv6 loopback) only, so a 127.0.0.1 probe
 * gets ECONNREFUSED even while the server is up. Probe both stacks.
 */
async function isPortOpen(port, timeout = 400) {
  const results = await Promise.all(
    [ "127.0.0.1", "::1" ].map(h => tryConnect(port, h, timeout)),
  );
  return results.some(Boolean);
}

/** Is the WXT dev server up? Without it the dev build cannot hot-reload. */
export const isDevServerRunning = () => isPortOpen(WXT_DEV_PORT);

/** Is something already exposing a CDP endpoint we can attach to? */
export const isCdpOpen = (port = 9222) => isPortOpen(port);

function inspect(dir) {
  if (!existsSync(dir)) return null;
  const manifestPath = join(dir, "manifest.json");
  if (!existsSync(manifestPath)) return null;
  const raw = readFileSync(manifestPath, "utf8");
  return {
    dir,
    builtAt: statSync(manifestPath).mtime,
    // WXT dev builds register content scripts at runtime from the background
    // script (that's what makes HMR work), so content_scripts is empty there.
    // host_permissions is the reliable signal in both build modes.
    supportsSite: raw.includes(REQUIRED_HOST),
  };
}

/**
 * Resolve the extension build to load.
 *
 * @param {object}  [opts]
 * @param {boolean} [opts.preferProd] load the production build instead
 * @returns {Promise<{dir:string, mode:"dev"|"production", supportsSite:boolean,
 *                    builtAt:Date, devServer:boolean, warnings:string[]}>}
 */
export async function resolveExtension({ preferProd = false } = {}) {
  const dev = inspect(DEV_DIR);
  const prod = inspect(PROD_DIR);
  const devServer = await isDevServerRunning();
  const warnings = [];

  let chosen; let mode;
  if (preferProd && prod) {
    chosen = prod; mode = "production";
  } else if (dev) {
    chosen = dev; mode = "dev";
  } else if (prod) {
    chosen = prod; mode = "production";
    warnings.push("No dev build found — using the production build, so there is NO hot reload.\n  Run `yarn dev` and restart this to get hot reload.");
  } else {
    const err = new Error(
      "No extension build found in .output/\n"
      + "  Run `yarn dev` (recommended, hot reload) or `yarn build`, then retry.",
    );
    err.code = "NO_BUILD";
    throw err;
  }

  if (mode === "dev" && !devServer) {
    warnings.push(
      `WXT dev server is not listening on :${WXT_DEV_PORT}.\n`
      + "  The dev build will load but will NOT hot-reload. Start `yarn dev` in another terminal.",
    );
  }

  if (!chosen.supportsSite) {
    warnings.push(
      `This ${mode} build is STALE — its manifest has no "${REQUIRED_HOST}" host.\n`
      + "  It was built while the rebuild still lived on play-v2, which is now a\n"
      + "  redirect, so the extension will silently NOT load on the site.\n"
      + (mode === "dev"
        ? "  Restart `yarn dev` to rebuild it."
        : "  Run `yarn build` to rebuild it."),
    );
  }

  return { ...chosen, mode, devServer, warnings };
}

/** One-line-per-fact summary, plus any warnings. */
export function describeExtension(ext) {
  const lines = [
    `Extension  : ${ext.dir}`,
    `Build mode : ${ext.mode}${ext.mode === "dev" ? (ext.devServer ? " (hot reload active)" : " (dev server DOWN — no hot reload)") : " (no hot reload)"}`,
    `Built at   : ${ext.builtAt.toLocaleString()}`,
    `Site host  : ${ext.supportsSite ? REQUIRED_HOST : "MISSING — build is stale"}`,
  ];
  for (const w of ext.warnings) lines.push(`\n!  ${w}`);
  return lines.join("\n");
}
