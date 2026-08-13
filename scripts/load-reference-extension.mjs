#!/usr/bin/env node
/**
 * load-reference-extension.mjs — side-load the v1 reference build into the
 * browser `yarn dev` opens, so one browser has v1 working normally and v2
 * running whatever is being worked on.
 *
 * Runs alongside `wxt` (see the `dev` script): it polls for the CDP endpoint,
 * installs the reference build, and exits.
 *
 * Why CDP and not `--load-extension`: Chrome 137+ ships
 * `DisableLoadExtensionCommandLineSwitch` enabled, so the flag is silently
 * ignored — verified on Chrome 151, where the flag reached the process and the
 * extension still did not load. Overriding it needs `--disable-features`, but
 * web-ext already passes its own `--disable-features` list and Chrome honours
 * only the last one, so the two fight. CDP `Extensions.loadUnpacked` is the same
 * mechanism WXT uses for its own dev build, and has none of these problems.
 */

import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REFERENCE = join(ROOT, ".output-reference", "chrome-mv3");
const PORT = Number(process.env.CDP_PORT ?? 9222);
const ENDPOINT = `http://127.0.0.1:${PORT}`;
const DEADLINE_MS = 90_000;

if (!existsSync(REFERENCE)) {
  // Not an error: plenty of dev sessions only care about v2.
  console.log("[reference] no v1 reference build — run `yarn build:reference` to add v1 to the dev browser");
  process.exit(0);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitForCdp() {
  const started = Date.now();
  while (Date.now() - started < DEADLINE_MS) {
    try {
      const res = await fetch(`${ENDPOINT}/json/version`);
      if (res.ok) return await res.json();
    } catch { /* not up yet */ }
    await sleep(500);
  }
  return null;
}

const version = await waitForCdp();
if (!version) {
  console.log(`[reference] CDP never came up on ${ENDPOINT} — skipping v1 reference extension`);
  process.exit(0);
}

/**
 * Wait for WXT's own dev extension to finish installing before adding ours.
 *
 * Both are installed over CDP, and issuing a second Extensions.loadUnpacked
 * while the first is still in flight loses one of them — the browser ends up
 * with a single extension and no obvious error. A fixed delay is not enough
 * (it raced whenever the dev server started quickly), so wait for an actual
 * extension target to exist instead.
 */
async function waitForFirstExtension(deadlineMs = 30_000) {
  const started = Date.now();
  while (Date.now() - started < deadlineMs) {
    try {
      const targets = await (await fetch(`${ENDPOINT}/json/list`)).json();
      if (targets.some(t => String(t.url || "").startsWith("chrome-extension://"))) return true;
    } catch { /* keep polling */ }
    await sleep(400);
  }
  return false;
}

if (!await waitForFirstExtension()) {
  console.log("[reference] dev extension never appeared — loading the reference anyway");
}
// Small settle so the install transaction is fully committed.
await sleep(800);

let browser;
try {
  browser = await chromium.connectOverCDP(ENDPOINT);
  const session = await browser.newBrowserCDPSession();
  await session.send("Extensions.loadUnpacked", { path: REFERENCE });

  // Confirm both survived — a lost install is silent otherwise.
  await sleep(600);
  const targets = await (await fetch(`${ENDPOINT}/json/list`)).json();
  const ids = new Set(
    targets
      .map(t => String(t.url || ""))
      .filter(u => u.startsWith("chrome-extension://"))
      .map(u => u.split("/")[2]),
  );
  console.log(ids.size >= 2
    ? "[reference] v1 reference extension loaded — v1 now works in the dev browser"
    : `[reference] loaded, but only ${ids.size} extension is registered — the dev build may have been clobbered`);
} catch (e) {
  console.log(`[reference] could not load the v1 reference extension: ${e.message.split("\n")[0]}`);
} finally {
  // Close only our CDP connection, never the browser itself.
  await browser?.close().catch(() => {});
}
