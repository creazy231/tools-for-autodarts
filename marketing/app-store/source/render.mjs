// Render the pages `build.py prepare` wrote to PNGs at their exact App Store size.
//
//   node render.mjs <work-dir> <out-dir>      → <out-dir>/iphone/*.png, <out-dir>/mac/*.png
//
// A headless Chromium of its own renders them: static pages, no extension and
// nothing shared with the yarn dev browser. It is forced to sRGB, the space the
// captures were converted to.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(HERE, "..", "..", "..", "package.json"));
const { chromium } = require("playwright");

const SIZES = { iphone: [ 1320, 2868 ], mac: [ 2880, 1800 ] };
const [ work, out ] = process.argv.slice(2).map(p => path.resolve(p));
const pages = fs.readdirSync(work).filter(f => /^(iphone|mac)--.+\.html$/.test(f)).sort();

const browser = await chromium.launch({ args: [ "--force-color-profile=srgb", "--allow-file-access-from-files" ] });
try {
  for (const file of pages) {
    const [ platform, name ] = file.replace(/\.html$/, "").split("--");
    const [ width, height ] = SIZES[platform];
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    await page.goto("file://" + path.join(work, file));
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([ ...document.images ].map(image => image.decode()));
    });
    const fonts = await page.evaluate(() => [ [ "Bebas Neue", 400 ], [ "Manrope", 600 ] ]
      .every(([ family, weight ]) => document.fonts.check(`${weight} 40px "${family}"`)));
    if (!fonts) throw new Error(`${file}: Bebas Neue or Manrope did not load`);
    fs.mkdirSync(path.join(out, platform), { recursive: true });
    await page.screenshot({ path: path.join(out, platform, `${name}.png`), type: "png" });
    console.log(`${platform}/${name}.png ${width}x${height}`);
    await context.close();
  }
} finally {
  await browser.close();
}
