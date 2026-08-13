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

// The dev extension is installed over CDP too; give WXT a moment so the two
// installs do not race.
await sleep(1500);

let browser;
try {
  browser = await chromium.connectOverCDP(ENDPOINT);
  const session = await browser.newBrowserCDPSession();
  await session.send("Extensions.loadUnpacked", { path: REFERENCE });
  console.log(`[reference] v1 reference extension loaded — v1 now works in the dev browser`);
} catch (e) {
  console.log(`[reference] could not load the v1 reference extension: ${e.message.split("\n")[0]}`);
} finally {
  // Close only our CDP connection, never the browser itself.
  await browser?.close().catch(() => {});
}
