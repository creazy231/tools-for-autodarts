/**
 * yarn wled:packs <folder>
 *
 * Builds the WLED animation packs the extension ships, public/wled-packs/, from
 * the sources scripts/wled-packs.json lists, read under <folder>: so far
 * wled-project's animations folder. See scripts/README.md, "WLED animation packs".
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PackError, buildCatalog, writeCatalog } from "./lib/wled-packs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = process.argv[2];

if (!source) {
  console.error("usage: yarn wled:packs <folder with the packs' presets.json files, CSVs and GIFs>");
  process.exit(1);
}

try {
  const sources = JSON.parse(readFileSync(path.join(repo, "scripts/wled-packs.json"), "utf8"));
  const catalog = buildCatalog(sources, path.resolve(source));
  const out = path.join(repo, "public/wled-packs");
  writeCatalog(catalog, out);
  for (const pack of catalog.index.packs) {
    for (const size of pack.sizes) console.log(`${size.file}: ${size.effects} effects, ${size.presets} presets, ${size.gifs} GIFs (${size.bytes} bytes), version ${size.version}`);
  }
  console.log(`${catalog.gifs.size} GIFs in ${path.relative(repo, out)}/gifs`);
} catch (error) {
  if (!(error instanceof PackError)) throw error;
  console.error(`wled:packs: ${error.message}`);
  process.exit(1);
}

