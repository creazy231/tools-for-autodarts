#!/usr/bin/env node
/**
 * capture-dom.mjs — DOM baseline capture for the autodarts site.
 *
 * Snapshots the *raw* autodarts site (no extension loaded) so we have a durable
 * record of the DOM the content scripts target.
 *
 * Only v2 is captured. play.autodarts.com now serves the rebuild, play-v2 is a
 * 301 to it, and the old Chakra site moved to play-v1.autodarts.com — which the
 * extension does not target, so there is nothing to baseline there. Treat
 * snapshots/v1/ as read-only history.
 *
 * For each route it writes, into snapshots/<site>/:
 *   <slug>.html        full outerHTML
 *   <slug>.png         full-page screenshot
 *   <slug>.probe.json  design tokens + stable-anchor inventory (the migration input)
 *
 * Usage:
 *   node scripts/capture-dom.mjs                     # default routes
 *   node scripts/capture-dom.mjs --discover          # crawl + print reachable routes, capture nothing
 *   node scripts/capture-dom.mjs --route=/play       # capture a single extra route
 *   node scripts/capture-dom.mjs --headless          # no visible window (CI / speed)
 *   node scripts/capture-dom.mjs --slow=250          # extra ms between actions, easier to follow
 *   node scripts/capture-dom.mjs --fresh-login       # ignore cached storageState
 *
 * The browser is VISIBLE by default so you can watch what the automation does.
 * Pass --headless when you don't want a window.
 *
 * Credentials come from .secrets/autodarts.env (gitignored).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SECRETS = join(ROOT, ".secrets", "autodarts.env");
const SNAPSHOTS = join(ROOT, "snapshots");

// ---------------------------------------------------------------- credentials

function loadSecrets() {
  if (!existsSync(SECRETS)) {
    console.error(`Missing ${SECRETS}\nSee scripts/README.md for the expected keys.`);
    process.exit(1);
  }
  const env = {};
  for (const line of readFileSync(SECRETS, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  for (const k of [ "AUTODARTS_EMAIL", "AUTODARTS_PASSWORD" ]) {
    if (!env[k]) { console.error(`${SECRETS} is missing ${k}`); process.exit(1); }
  }
  return env;
}

// ------------------------------------------------------------- site definitions

const SITES = {
  v2: {
    label: "v2 (Tailwind + shadcn/ui — the live site)",
    baseUrl: (e) => e.AUTODARTS_URL || "https://play.autodarts.com",
    // v2 lands on an OAuth-first /landing page; /login has the email+password
    // form behind stable ids. No OAuth needed.
    async login(page, base, { email, password }) {
      await page.goto(`${base}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForSelector("#emailOrUsername", { timeout: 30000 });
      await page.fill("#emailOrUsername", email);
      await page.fill("#password", password);
      await page.click("button[type=submit]");
    },
    routes: [
      [ "home", "/" ],
      // /play is v2's game-mode picker — the counterpart to v1 /lobbies/new/*
      [ "play", "/play" ],
      [ "tournaments", "/tournaments" ],
      [ "statistics", "/statistics" ],
      [ "subscriptions", "/subscriptions" ],
      [ "redeem", "/redeem" ],
      // Unauthenticated shells, useful because the extension also renders here
      [ "login", "/login" ],
    ],
  },
};

const isLoggedOut = (url) => /\/login|\/landing|\/auth/.test(url);

// ------------------------------------------------------------------ page probe

/**
 * Runs in the page. Inventories exactly what the migration needs to know:
 * which design-token system is live, and which stable anchors exist to hang
 * selectors off instead of nth-child chains.
 */
function probeScript() {
  const cssVars = () => {
    const out = new Set();
    for (const sheet of document.styleSheets) {
      let rules;
      try { rules = sheet.cssRules; } catch { continue; } // cross-origin
      for (const rule of rules) {
        if (!rule.style || !rule.selectorText) continue;
        if (!/^(:root|html|\*|body)/.test(rule.selectorText)) continue;
        for (const prop of rule.style) if (prop.startsWith("--")) out.add(prop);
      }
    }
    return [ ...out ].sort();
  };

  const uniqAttr = (attr) => [ ...new Set(
    [ ...document.querySelectorAll(`[${attr}]`) ].map(el => el.getAttribute(attr)).filter(Boolean),
  ) ].sort();

  // React/Emotion generate ids like "field-:r0:" and classes like "css-1a2b3c".
  // Those are noise; a hand-written id is a real anchor.
  const stableIds = [ ...document.querySelectorAll("[id]") ]
    .map(el => el.id)
    .filter(id => id && !/:[a-z0-9]+:|^css-|^\d/.test(id))
    .sort();

  const classTally = {};
  for (const el of document.querySelectorAll("[class]")) {
    for (const c of String(el.className).split(/\s+/)) {
      if (c) classTally[c] = (classTally[c] || 0) + 1;
    }
  }

  return {
    url: location.href,
    title: document.title,
    framework: {
      // Chakra ships `chakra-*` classes and `--chakra-*` vars via Emotion.
      hasChakraClasses: !!document.querySelector("[class*='chakra-']"),
      hasEmotionClasses: !!document.querySelector("[class^='css-']"),
      // shadcn/ui marks every primitive with data-slot.
      hasDataSlot: !!document.querySelector("[data-slot]"),
      // Tailwind utilities as a rough signal.
      looksTailwind: !!document.querySelector("[class*='flex flex-col'],[class*='items-center']"),
    },
    cssVars: cssVars(),
    anchors: {
      dataSlot: uniqAttr("data-slot"),
      dataTestid: uniqAttr("data-testid"),
      ariaLabel: uniqAttr("aria-label"),
      role: uniqAttr("role"),
      stableIds,
    },
    topClasses: Object.entries(classTally).sort((a, b) => b[1] - a[1]).slice(0, 60),
    counts: {
      elements: document.querySelectorAll("*").length,
      buttons: document.querySelectorAll("button").length,
      tables: document.querySelectorAll("table").length,
      canvas: document.querySelectorAll("canvas").length,
    },
  };
}

// -------------------------------------------------------------------- capturing

/** Navigate and let the SPA finish client-side rendering. */
async function settle(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2500);
}

async function capturePage(page, base, [ slug, route ], outDir) {
  const target = `${base}${route}`;
  try {
    await settle(page, target);

    // A restored storageState only rehydrates once the app has booted on its
    // own origin root; hitting a deep route cold bounces to /landing. Warm up
    // via base and retry before treating it as a real auth failure.
    if (isLoggedOut(page.url())) {
      await settle(page, base);
      await settle(page, target);
    }
  } catch (e) {
    console.log(`    ${slug.padEnd(14)} NAV FAILED  ${e.message.split("\n")[0]}`);
    return { slug, route, ok: false, error: "navigation" };
  }

  if (isLoggedOut(page.url())) {
    console.log(`    ${slug.padEnd(14)} BOUNCED to ${page.url()} (not authorised for this route)`);
    return { slug, route, ok: false, error: "logged-out" };
  }

  const html = await page.content();
  const probe = await page.evaluate(probeScript);

  writeFileSync(join(outDir, `${slug}.html`), html);
  writeFileSync(join(outDir, `${slug}.probe.json`), `${JSON.stringify(probe, null, 2)}\n`);
  await page.screenshot({ path: join(outDir, `${slug}.png`), fullPage: true }).catch(() => {});

  const fw = probe.framework;
  const tag = fw.hasChakraClasses ? "chakra" : fw.hasDataSlot ? "shadcn" : "?";
  console.log(
    `    ${slug.padEnd(14)} ok  ${String(probe.counts.elements).padStart(5)} els  `
    + `${tag.padEnd(7)} ${probe.anchors.dataSlot.length} slots  `
    + `${probe.anchors.ariaLabel.length} aria  ${Math.round(html.length / 1024)}kb`,
  );
  return { slug, route, ok: true, finalUrl: probe.url, elements: probe.counts.elements };
}

async function discoverRoutes(page, base) {
  const links = await page.evaluate(() => [ ...new Set(
    [ ...document.querySelectorAll("a[href^='/']") ].map(a => a.getAttribute("href")),
  ) ]);
  console.log(`    reachable links: ${links.join("  ")}`);
  return links;
}

// ------------------------------------------------------------------------- main

const argv = process.argv.slice(2);
const flag = (name) => argv.some(a => a === `--${name}`);
const opt = (name) => argv.find(a => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");

const env = loadSecrets();
const creds = { email: env.AUTODARTS_EMAIL, password: env.AUTODARTS_PASSWORD };
const which = opt("site") ?? "v2";
const extraRoute = opt("route");
const sites = [ which ];

// Visible by default — you should be able to watch the automation work.
const headless = flag("headless");
const slowMo = Number(opt("slow") ?? (headless ? 0 : 150));
console.log(headless
  ? "Running headless (--headless given)."
  : `Opening a visible Chromium window (slowMo ${slowMo}ms). Pass --headless to suppress.`);

const browser = await chromium.launch({ headless, slowMo });
const summary = {};

for (const key of sites) {
  const site = SITES[key];
  if (!site) {
    console.error(`Unknown site "${key}" — only "v2" can be captured; v1 no longer exists.`);
    process.exit(1);
  }

  const base = site.baseUrl(env);
  const statePath = join(ROOT, ".secrets", `auth-${key}.json`);
  const outDir = join(SNAPSHOTS, key);
  mkdirSync(outDir, { recursive: true });

  console.log(`\n== ${key.toUpperCase()}  ${site.label}`);
  console.log(`   ${base}`);

  const useState = existsSync(statePath) && !flag("fresh-login");
  const ctx = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    storageState: useState ? statePath : undefined,
  });
  const page = await ctx.newPage();

  // Validate the cached session; log in if it is stale or absent.
  let authed = false;
  if (useState) {
    await page.goto(base, { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(3000);
    authed = !isLoggedOut(page.url());
    console.log(`   cached session: ${authed ? "valid" : "stale, re-logging in"}`);
  }

  if (!authed) {
    try {
      await site.login(page, base, creds);
      await page.waitForTimeout(7000);
      authed = !isLoggedOut(page.url());
    } catch (e) {
      console.log(`   LOGIN ERROR: ${e.message.split("\n")[0]}`);
    }
    if (!authed) {
      console.log(`   LOGIN FAILED — landed on ${page.url()}. Skipping ${key}.`);
      await page.screenshot({ path: join(outDir, "_login-failure.png") }).catch(() => {});
      summary[key] = { error: "login-failed" };
      await ctx.close();
      continue;
    }
    await ctx.storageState({ path: statePath });
    console.log(`   logged in, session cached -> .secrets/auth-${key}.json`);
  }

  if (flag("discover")) {
    summary[key] = { discovered: await discoverRoutes(page, base) };
    await ctx.close();
    continue;
  }

  const routes = extraRoute ? [ [ extraRoute.replace(/\W+/g, "-").replace(/^-|-$/g, "") || "route", extraRoute ] ] : site.routes;
  const results = [];
  for (const entry of routes) results.push(await capturePage(page, base, entry, outDir));

  const reachable = await discoverRoutes(page, base);
  const manifest = { site: key, label: site.label, baseUrl: base, reachableLinks: reachable, routes: results };
  writeFileSync(join(outDir, "_manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  summary[key] = { ok: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).length };

  await ctx.close();
}

await browser.close();

console.log("\n== summary");
for (const [ k, v ] of Object.entries(summary)) console.log(`   ${k}: ${JSON.stringify(v)}`);
console.log("\nSnapshots in snapshots/ — commit them; the v1 set is gone for good.");
