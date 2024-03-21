import fs from "node:fs";
import path from "node:path";

// get file from __dirname + ".output/safari-mv2/manifest.json"
const manifestPath = path.join(__dirname, "..", ".output/safari-mv2/manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

// add "persistent": false to manifest
manifest.background.persistent = false;

// write to manifestPath
fs.writeFileSync(manifestPath, JSON.stringify(manifest));
