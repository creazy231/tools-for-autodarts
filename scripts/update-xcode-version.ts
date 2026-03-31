import fs from "node:fs";
import path from "node:path";

// Get version from package.json
const packageJsonPath = path.join(__dirname, "..", "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
const version = packageJson.version;

console.log(`Updating Xcode project to version ${version}`);

// Read the Xcode project file
const pbxprojPath = path.join(__dirname, "..", "Tools for Autodarts", "Tools for Autodarts.xcodeproj", "project.pbxproj");
let pbxprojContent = fs.readFileSync(pbxprojPath, "utf-8");

// Update all MARKETING_VERSION entries
const marketingVersionRegex = /MARKETING_VERSION = [^;]+;/g;
pbxprojContent = pbxprojContent.replace(marketingVersionRegex, `MARKETING_VERSION = ${version};`);

// Update all CURRENT_PROJECT_VERSION entries to a timestamp-based build number
// Format: YYYYMMDDNN (e.g. 2026032301) — always increases, avoids conflicts with prior uploads
const now = new Date();
const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
const buildNumber = Number(`${datePart}01`);
const currentProjectVersionRegex = /CURRENT_PROJECT_VERSION = [^;]+;/g;
pbxprojContent = pbxprojContent.replace(currentProjectVersionRegex, `CURRENT_PROJECT_VERSION = ${buildNumber};`);

// Write back the updated content
fs.writeFileSync(pbxprojPath, pbxprojContent);

console.log(`✅ Updated Xcode project MARKETING_VERSION to ${version}`);
console.log(`✅ Updated Xcode project CURRENT_PROJECT_VERSION to ${buildNumber}`);
