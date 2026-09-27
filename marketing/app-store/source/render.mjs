// Render the pages `build.py prepare` wrote to PNGs at their exact App Store size.
//
//   node render.mjs <work-dir> <out-dir>   → <out-dir>/iphone-6.9, iphone-6.5 and mac/*.png
//
// A headless Chromium of its own renders them: static pages, no extension and
// nothing shared with the yarn dev browser. It is forced to sRGB, the space the
// captures were converted to.
//
// The iPhone pages are laid out for 6.9" (1320 × 2868). The 6.5" set (1284 × 2778)
// renders the same page at 1284/1320 scale, so text is drawn at its final size
// rather than resampled, in a viewport 12 px shorter that trims the background under the phone.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(HERE, "..", "..", "..", "package.json"));
const { chromium } = require("playwright");

// Per page layout: every set it is rendered into, as viewport × scale → output size.
const SETS = {
  iphone: [
    { folder: "iphone-6.9", viewport: [ 1320, 2868 ], scale: 1, size: [ 1320, 2868 ] },
    { folder: "iphone-6.5", viewport: [ 1320, 2856 ], scale: 1284 / 1320, size: [ 1284, 2778 ] },
  ],
  mac: [
    { folder: "mac", viewport: [ 2880, 1800 ], scale: 1, size: [ 2880, 1800 ] },
  ],
};
const [ work, out ] = process.argv.slice(2).map(p => path.resolve(p));
const pages = fs.readdirSync(work).filter(f => /^(iphone|mac)--.+\.html$/.test(f)).sort();

const browser = await chromium.launch({ args: [ "--force-color-profile=srgb", "--allow-file-access-from-files" ] });
try {
  for (const file of pages) {
    const [ platform, name ] = file.replace(/\.html$/, "").split("--");
    for (const set of SETS[platform]) {
      const [ width, height ] = set.viewport;
      const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: set.scale });
      const page = await context.newPage();
      await page.goto("file://" + path.join(work, file));
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([ ...document.images ].map(image => image.decode()));
      });
      const fonts = await page.evaluate(() => [ [ "Bebas Neue", 400 ], [ "Manrope", 600 ] ]
        .every(([ family, weight ]) => document.fonts.check(`${weight} 40px "${family}"`)));
      if (!fonts) throw new Error(`${file}: Bebas Neue or Manrope did not load`);
      fs.mkdirSync(path.join(out, set.folder), { recursive: true });
      const target = path.join(out, set.folder, `${name}.png`);
      await page.screenshot({ path: target, type: "png" });
      console.log(`${set.folder}/${name}.png, expected ${set.size.join("x")}`);
      await context.close();
    }
  }
} finally {
  await browser.close();
}
