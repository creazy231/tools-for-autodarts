import fs from "node:fs";
import path from "node:path";

import JSZip from "jszip";

/**
 * Turns the Firefox store zip into an XPI that Firefox for Android installs from
 * its debug menu ("Install add-on from file"). Run it after `yarn zip:firefox`.
 *
 * The store build carries no add-on ID — AMO assigned one on the first upload —
 * and Firefox will not permanently install an unsigned add-on without one: it
 * calls the file corrupt. So the XPI is the store zip with that ID written into
 * its manifest. It is the listing's own ID, so the XPI upgrades a copy installed
 * from AMO in place and keeps its settings.
 *
 * It is unsigned, so only Firefox Nightly takes it, with
 * `xpinstall.signatures.required` turned off in about:config.
 */

// The `guid` of https://addons.mozilla.org/api/v5/addons/addon/tools-for-autodarts/
const AMO_ID = "{4d96d300-1064-44b0-95f0-eb5b0b0230b4}";

const root = path.join(__dirname, "..");
const { name, version } = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf-8"));
// WXT's default artifact name, `{{name}}-{{version}}-{{browser}}.zip`
const zipPath = path.join(root, ".output", `${name}-${version}-firefox.zip`);
const xpiPath = path.join(root, ".output", `${name}-${version}-android.xpi`);

if (!fs.existsSync(zipPath)) {
  console.error(`${path.relative(root, zipPath)} not found — run \`yarn zip:firefox\` first`);
  process.exit(1);
}

const zip = await JSZip.loadAsync(fs.readFileSync(zipPath));
const manifest = JSON.parse(await zip.file("manifest.json")!.async("string"));

// Should wxt.config.ts ever set an ID itself, it has to be this one, or AMO rejects the upload.
const id = manifest.browser_specific_settings?.gecko?.id;
if (id && id !== AMO_ID) {
  console.error(`the Firefox build has add-on ID ${id}, but the AMO listing's is ${AMO_ID}`);
  process.exit(1);
}

manifest.browser_specific_settings = {
  ...manifest.browser_specific_settings,
  gecko: { ...manifest.browser_specific_settings?.gecko, id: AMO_ID },
};
zip.file("manifest.json", JSON.stringify(manifest));

// JSZip reuses the stored bytes of every entry it did not touch, so only the manifest is recompressed.
fs.writeFileSync(xpiPath, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 9 } }));
console.log(`✔ ${path.relative(root, xpiPath)}`);
