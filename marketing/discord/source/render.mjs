// Render the pages `make.py prepare` wrote to 1920 × 1080 PNGs.
//
//   node render.mjs <work-dir> <out-dir>   → <out-dir>/teams-*.png
//
// The same headless Chromium as the App Store set: static pages, no extension,
// nothing shared with the yarn dev browser, and forced to sRGB.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(HERE, "..", "..", "..", "package.json"));
const { chromium } = require("playwright");

const [ work, out ] = process.argv.slice(2).map(p => path.resolve(p));
const pages = fs.readdirSync(work).filter(f => /^teams-.+\.html$/.test(f)).sort();

const browser = await chromium.launch({ args: [ "--force-color-profile=srgb", "--allow-file-access-from-files" ] });
try {
  fs.mkdirSync(out, { recursive: true });
  for (const file of pages) {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    await page.goto("file://" + path.join(work, file));
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([ ...document.images ].map(image => image.decode()));
    });
    const fonts = await page.evaluate(() => [ [ "Bebas Neue", 400 ], [ "Manrope", 600 ], [ "Manrope", 700 ], [ "Manrope", 800 ] ]
      .every(([ family, weight ]) => document.fonts.check(`${weight} 40px "${family}"`)));
    if (!fonts) throw new Error(`${file}: Bebas Neue or Manrope did not load`);
    // The headline fits itself once its font is in; run that again now the font has loaded.
    await page.evaluate(() => {
      const h = document.getElementById("headline");
      h.style.fontSize = "";
      let size = parseFloat(getComputedStyle(h).fontSize);
      while (h.scrollWidth > h.clientWidth && size > 90) { size -= 2; h.style.fontSize = size + "px"; }
    });
    const target = path.join(out, file.replace(/\.html$/, ".png"));
    await page.screenshot({ path: target, type: "png" });
    console.log(path.basename(target));
    await context.close();
  }
} finally {
  await browser.close();
}
