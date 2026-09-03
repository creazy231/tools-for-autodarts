#!/usr/bin/env node
/**
 * inspect.mjs — drive the live site WITH the extension loaded, for migration work.
 *
 * Always loads the DEV build (.output/chrome-mv3-dev) so `yarn dev` hot-reloads
 * your edits straight into this browser. Use --prod to force the packaged build.
 *
 * This is the counterpart to capture-dom.mjs, which deliberately loads NO
 * extension because it captures the raw site as a baseline.
 *
 * Typical session:
 *   yarn dev                             # terminal 1 — hot reload
 *   node scripts/inspect.mjs --keep-open # terminal 2 — browser stays up on :9222
 *
 * With --keep-open the CDP endpoint stays available, so the Playwright MCP and
 * Chrome DevTools MCP servers in .mcp.json can attach and drive this same window.
 *
 * Usage:
 *   node scripts/inspect.mjs                      # home, report what injected
 *   node scripts/inspect.mjs --url=/tournaments   # a specific route
 *   node scripts/inspect.mjs --keep-open          # leave the browser running
 *   node scripts/inspect.mjs --prod               # packaged build instead of dev
 *   node scripts/inspect.mjs --fresh-login        # ignore the saved profile
 */

import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { ROOT, describeExtension, isCdpOpen, resolveExtension } from "./lib/extension.mjs";

const argv = process.argv.slice(2);
const flag = n => argv.includes(`--${n}`);
const opt = n => argv.find(a => a.startsWith(`--${n}=`))?.split("=").slice(1).join("=");

const CDP_PORT = Number(opt("port") ?? 9222);
// Separate from .chrome-profile (used by dev-chrome.sh) so the two can coexist:
// Chrome locks a profile directory to a single running instance.
const PROFILE = join(ROOT, ".chrome-profile-pw");
const SECRETS = join(ROOT, ".secrets", "autodarts.env");

function creds() {
  if (!existsSync(SECRETS)) return null;
  const env = {};
  for (const line of readFileSync(SECRETS, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env.AUTODARTS_EMAIL ? env : null;
}

const env = creds();
const BASE = env?.AUTODARTS_URL || "https://play.autodarts.com";
const route = opt("url") ?? "/";

// ---------------------------------------------------------------- extension

let ext;
try {
  ext = await resolveExtension({ preferProd: flag("prod") });
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
console.log(describeExtension(ext));
console.log();

if (!ext.supportsSite) {
  console.error("Refusing to start: the build cannot load on the site, so anything you");
  console.error("observe would be the bare page. Rebuild first (see the warning above).");
  process.exit(1);
}

// ------------------------------------------------------------------ browser

/**
 * If something is already serving CDP on this port it is almost certainly the
 * browser `yarn dev` opened - which is the one being hot-reloaded. Drive that
 * one rather than starting a second browser running a different copy of the
 * extension.
 */
let ctx; let browser; let attached = false;

if (await isCdpOpen(CDP_PORT)) {
  console.log(`Attaching to the browser already on :${CDP_PORT} (yarn dev's, most likely).`);
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`);
  ctx = browser.contexts()[0];
  attached = true;
} else {
  if (flag("fresh-login")) rmSync(PROFILE, { recursive: true, force: true });
  mkdirSync(PROFILE, { recursive: true });
  console.log("No browser on that port — launching one with the dev build loaded.");
  ctx = await chromium.launchPersistentContext(PROFILE, {
    headless: false, // MV3 extensions require a headed browser
    viewport: null,
    // Playwright's default args include --disable-extensions, which installs
    // an extension quite happily and then never runs it: no content script, no
    // error, nothing to see. Drop it.
    ignoreDefaultArgs: [ "--disable-extensions" ],
    args: [
      `--remote-debugging-port=${CDP_PORT}`,
      "--no-first-run",
      "--no-default-browser-check",
    ],
  });

  // Chrome 137+ ignores --load-extension (DisableLoadExtensionCommandLineSwitch
  // is on by default), so install over CDP instead. It is a browser-level
  // command — a page session rejects it.
  const cdp = await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`);
  try {
    await (await cdp.newBrowserCDPSession()).send("Extensions.loadUnpacked", { path: ext.dir });
  } finally {
    await cdp.close(); // closes this connection, not the browser
  }
}

const page = ctx.pages()[0] ?? await ctx.newPage();
const extLogs = [];
page.on("console", (m) => {
  const t = m.text();
  if (/autodarts tools|adt-/i.test(t)) extLogs.push(t);
});
page.on("pageerror", e => extLogs.push(`PAGE ERROR: ${e.message}`));

console.log(`CDP endpoint: http://127.0.0.1:${CDP_PORT}`);
console.log(`Opening     : ${BASE}${route}\n`);

await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(3000);

// Log in if we landed on the auth screens and have credentials.
if (/\/login|\/landing/.test(page.url()) && env) {
  console.log("Not signed in — logging in with the test account...");
  try {
    if (!/\/login/.test(page.url())) await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    // v2 uses semantic ids; v1 generates ids, so fall back to autocomplete.
    const user = await page.$("#emailOrUsername") ?? await page.$("input[autocomplete=username]");
    const pass = await page.$("#password") ?? await page.$("input[autocomplete='current-password']");
    await user?.fill(env.AUTODARTS_EMAIL);
    await pass?.fill(env.AUTODARTS_PASSWORD);
    await page.click("button[type=submit]");
    await page.waitForTimeout(7000);
    if (route !== "/") await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
  } catch (e) {
    console.log(`  login attempt failed: ${e.message.split("\n")[0]}`);
  }
}

// -------------------------------------------------------------- did it load?

const report = await page.evaluate(() => {
  const custom = [ ...document.querySelectorAll("*") ]
    .map(e => e.tagName.toLowerCase())
    .filter(t => t.includes("-"));
  return {
    url: location.href,
    injectedElements: [ ...new Set(custom) ],
    adtNodes: document.querySelectorAll("[class*='adt-'],[id*='adt-'],[class*='ad-ext'],[id*='ad-ext']").length,
    siteVersion: document.querySelector("[data-slot]")
      ? "v2"
      : document.querySelector("[class*='chakra-']") ? "v1" : "unknown",
  };
});

console.log("--- state");
console.log(`  url            : ${report.url}`);
console.log(`  site version   : ${report.siteVersion}`);
console.log(`  extension roots: ${report.injectedElements.join(", ") || "(none — extension did not inject)"}`);
console.log(`  adt/ad-ext DOM : ${report.adtNodes} nodes`);
if (extLogs.length) {
  console.log("--- extension console");
  for (const l of extLogs.slice(0, 12)) console.log(`  ${l}`);
}

if (attached) {
  // We did not start this browser, so leave it running and just detach.
  console.log(`\nLeaving the attached browser open. CDP: http://127.0.0.1:${CDP_PORT}`);
  await browser.close(); // closes our CDP connection, not the browser
} else if (flag("keep-open")) {
  console.log(`\nBrowser stays open. CDP: http://127.0.0.1:${CDP_PORT}`);
  console.log("Edit source with `yarn dev` running and it hot-reloads here.");
  console.log("Ctrl-C to quit.");
  await new Promise(() => {}); // hold the process open
} else {
  await ctx.close();
}
