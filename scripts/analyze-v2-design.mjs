#!/usr/bin/env node
/**
 * analyze-v2-design.mjs — extract the v2 design system from the live site.
 *
 * The extension styles its own UI to blend into autodarts. v2 replaced Chakra
 * with Tailwind + shadcn/ui, so every `--chakra-*` the extension referenced is
 * gone and the whole UI renders unstyled. This dumps what v2 actually uses —
 * tokens with resolved values, the type scale, and the anatomy of each surface —
 * so the restyle is based on measurements rather than guesswork.
 *
 * Attaches to a browser already serving CDP (the one `yarn dev` opens) so it
 * never disturbs a running dev session. Falls back to launching its own.
 *
 *   node scripts/analyze-v2-design.mjs
 *
 * Writes snapshots/v2/design-tokens.json. Interpretation lives in
 * docs/v2-design-system.md.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "snapshots", "v2");
const CDP = `http://127.0.0.1:${process.env.CDP_PORT ?? 9222}`;

function creds() {
  const p = join(ROOT, ".secrets", "autodarts.env");
  if (!existsSync(p)) return {};
  const env = {};
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

// --------------------------------------------------------------- in-page probes

/** Every custom property on :root, with its resolved value. */
function readTokens() {
  const cs = getComputedStyle(document.documentElement);
  const names = new Set();
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules; } catch { continue; }
    for (const rule of rules) {
      if (!rule.style || !rule.selectorText) continue;
      if (!/^(:root|html|\*|body)/.test(rule.selectorText)) continue;
      for (const p of rule.style) if (p.startsWith("--")) names.add(p);
    }
  }
  const out = {};
  for (const n of [ ...names ].sort()) out[n] = cs.getPropertyValue(n).trim();
  return out;
}

/** Font stacks and the type scale actually rendered on this page. */
function readTypography() {
  const sample = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const c = getComputedStyle(el);
    return {
      selector: sel,
      fontFamily: c.fontFamily,
      fontSize: c.fontSize,
      fontWeight: c.fontWeight,
      lineHeight: c.lineHeight,
      letterSpacing: c.letterSpacing,
      textTransform: c.textTransform,
      color: c.color,
    };
  };

  const targets = [
    "body",
    "h1", "h2", "h3",
    "[data-slot='item-title']",
    "[data-slot='card'] h1", "[data-slot='card'] h2", "[data-slot='card'] h3",
    ".font-heading",
    "[data-slot='button']",
    "p",
    "[data-slot='item-description']",
    "[data-slot='table-head']",
    "[data-slot='table-cell']",
  ];

  // Distinct font-families in use anywhere on the page.
  const families = new Map();
  for (const el of document.querySelectorAll("body *")) {
    const f = getComputedStyle(el).fontFamily;
    families.set(f, (families.get(f) ?? 0) + 1);
  }

  return {
    samples: targets.map(sample).filter(Boolean),
    familiesByUsage: [ ...families.entries() ].sort((a, b) => b[1] - a[1]).slice(0, 8),
  };
}

/** Box model + paint of one element, for reproducing a surface. */
function describeSurface(el) {
  const c = getComputedStyle(el);
  return {
    tag: el.tagName.toLowerCase(),
    dataSlot: el.getAttribute("data-slot"),
    classes: el.className?.toString().slice(0, 300),
    backgroundColor: c.backgroundColor,
    backgroundImage: c.backgroundImage === "none" ? undefined : c.backgroundImage.slice(0, 160),
    color: c.color,
    border: c.border,
    borderColor: c.borderColor,
    borderRadius: c.borderRadius,
    padding: c.padding,
    gap: c.gap,
    boxShadow: c.boxShadow === "none" ? undefined : c.boxShadow,
    backdropFilter: c.backdropFilter === "none" ? undefined : c.backdropFilter,
    fontSize: c.fontSize,
    fontWeight: c.fontWeight,
    display: c.display,
  };
}

/** Anatomy of each distinct data-slot surface present on the page. */
function readSurfaces() {
  const slots = [ ...new Set([ ...document.querySelectorAll("[data-slot]") ].map(e => e.getAttribute("data-slot"))) ];
  const out = {};
  for (const slot of slots) {
    const el = document.querySelector(`[data-slot="${slot}"]`);
    if (el) out[slot] = describeSurface(el);
  }
  return out;
}

/** CSS rules that mention a token, so hover/state styling is visible too. */
function readStateRules() {
  const hits = [];
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules; } catch { continue; }
    for (const rule of rules) {
      const sel = rule.selectorText;
      if (!sel || !rule.style) continue;
      if (!/hover|focus|active|disabled|data-\[/.test(sel)) continue;
      if (!/background|color|border|shadow|ring/.test(rule.style.cssText)) continue;
      hits.push({ selector: sel.slice(0, 160), css: rule.style.cssText.slice(0, 200) });
      if (hits.length > 60) return hits;
    }
  }
  return hits;
}

/** Structural outline of a subtree: nesting of data-slots with their text. */
function outline(root, maxDepth = 4) {
  const walk = (el, depth) => {
    if (depth > maxDepth) return null;
    const slot = el.getAttribute?.("data-slot");
    const kids = [ ...el.children ].map(c => walk(c, depth + 1)).filter(Boolean);
    if (!slot && !kids.length) return null;
    return {
      slot: slot ?? el.tagName.toLowerCase(),
      text: kids.length ? undefined : (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 50),
      children: kids.length ? kids : undefined,
    };
  };
  return walk(root, 0);
}

// ---------------------------------------------------------------------- driver

const env = creds();
let browser; let ownBrowser = false;
try {
  browser = await chromium.connectOverCDP(CDP);
  console.log(`Attached to the browser on ${CDP} (yarn dev's).`);
} catch {
  console.log("No CDP endpoint — launching a browser.");
  browser = await chromium.launch({ headless: false });
  ownBrowser = true;
}

const ctx = ownBrowser ? await browser.newContext({ viewport: { width: 1600, height: 1000 } }) : browser.contexts()[0];
const page = await ctx.newPage();
await page.setViewportSize({ width: 1600, height: 1000 }).catch(() => {});

const BASE = env.AUTODARTS_URL || "https://play.autodarts.com";

async function ensureLoggedIn() {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(5000);
  if (!/\/login|\/landing/.test(page.url())) return true;
  if (!env.AUTODARTS_EMAIL) return false;
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  await page.fill("#emailOrUsername", env.AUTODARTS_EMAIL);
  await page.fill("#password", env.AUTODARTS_PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForTimeout(9000);
  return !/\/login|\/landing/.test(page.url());
}

if (!await ensureLoggedIn()) {
  console.error("Could not sign in — aborting.");
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
const report = { capturedFrom: BASE, pages: {} };

// Tokens and typography are global; read them once on the home page.
report.tokens = await page.evaluate(readTokens);
report.typography = await page.evaluate(readTypography);
report.stateRules = await page.evaluate(readStateRules);
console.log(`tokens: ${Object.keys(report.tokens).length}`);

for (const route of [ "/", "/play", "/tournaments", "/statistics" ]) {
  await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3000);

  const data = await page.evaluate((fns) => {
    // eslint-disable-next-line no-eval
    const [ describeSurfaceSrc, readSurfacesSrc, outlineSrc ] = fns;
    // Re-hydrate the helpers inside the page context.
    // eslint-disable-next-line no-new-func
    const describeSurface = new Function(`return ${describeSurfaceSrc}`)();
    // eslint-disable-next-line no-new-func
    const outline = new Function(`return ${outlineSrc}`)();
    // eslint-disable-next-line no-new-func
    const readSurfaces = new Function("describeSurface", `return ${readSurfacesSrc}`)(describeSurface);

    const cards = [ ...document.querySelectorAll("[data-slot='card']") ].slice(0, 3);
    return {
      url: location.pathname,
      slots: [ ...new Set([ ...document.querySelectorAll("[data-slot]") ].map(e => e.getAttribute("data-slot"))) ].sort(),
      surfaces: readSurfaces(),
      cardOutlines: cards.map(c => outline(c)),
      cardSurfaces: cards.map(c => describeSurface(c)),
      headings: [ ...document.querySelectorAll("h1,h2,h3") ].slice(0, 8).map(h => ({
        tag: h.tagName.toLowerCase(),
        text: (h.textContent || "").trim().slice(0, 40),
        classes: h.className?.toString().slice(0, 160),
      })),
    };
  }, [ describeSurface.toString(), readSurfaces.toString(), outline.toString() ]);

  report.pages[route] = data;
  await page.screenshot({ path: join(OUT_DIR, `design-${route === "/" ? "home" : route.slice(1)}.png`), fullPage: false });
  console.log(`${route.padEnd(13)} slots=${data.slots.length} cards=${data.cardSurfaces.length}`);
}

// The "Online" modal in the top nav.
await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(4000);
try {
  const online = page.locator("nav a, nav button", { hasText: /^Online$/ }).first();
  await online.click({ timeout: 8000 });
  await page.waitForTimeout(3000);
  report.onlineModal = await page.evaluate((fns) => {
    const [ describeSurfaceSrc, outlineSrc ] = fns;
    // eslint-disable-next-line no-new-func
    const describeSurface = new Function(`return ${describeSurfaceSrc}`)();
    // eslint-disable-next-line no-new-func
    const outline = new Function(`return ${outlineSrc}`)();
    const dialog = document.querySelector("[role='dialog'],[data-slot='dialog-popup'],[data-slot='drawer-popup']");
    return dialog
      ? {
          found: true,
          slots: [ ...new Set([ ...dialog.querySelectorAll("[data-slot]") ].map(e => e.getAttribute("data-slot"))) ].sort(),
          surface: describeSurface(dialog),
          outline: outline(dialog, 5),
          backdrop: (() => {
            const b = document.querySelector("[data-slot='dialog-backdrop'],[data-slot='drawer-backdrop']");
            return b ? describeSurface(b) : null;
          })(),
        }
      : { found: false };
  }, [ describeSurface.toString(), outline.toString() ]);
  await page.screenshot({ path: join(OUT_DIR, "design-online-modal.png") });
  console.log(`online modal: ${report.onlineModal.found ? `${report.onlineModal.slots.length} slots` : "NOT FOUND"}`);
} catch (e) {
  report.onlineModal = { found: false, error: e.message.split("\n")[0] };
  console.log(`online modal: ${e.message.split("\n")[0]}`);
}

writeFileSync(join(OUT_DIR, "design-tokens.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(`\nWrote snapshots/v2/design-tokens.json`);

await page.close();
if (ownBrowser) await browser.close();
else await browser.close(); // closes only our CDP connection
