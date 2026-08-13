# Scripts Documentation

## v2 Migration Tooling

Tooling for adapting the extension to the rebuilt autodarts site
(v1 `play.autodarts.com` → v2 `play-v2.autodarts.com`).
Background and findings: [`docs/v2-migration-map.md`](../docs/v2-migration-map.md).

### Credentials

Both scripts read `.secrets/autodarts.env`, which is **gitignored** and
deliberately *not* a `.env` file so WXT/Vite never loads it into a build:

```bash
AUTODARTS_EMAIL=...
AUTODARTS_PASSWORD=...
AUTODARTS_V1_URL=https://play.autodarts.com
AUTODARTS_V2_URL=https://play-v2.autodarts.com
```

Login is email + password. Do **not** use the Google/Apple buttons on v2.

### `dev-chrome.sh` — interactive debugging browser

Launches a **visible** Chrome with the extension loaded and a CDP endpoint on
port 9222, which both MCP servers in `.mcp.json` attach to. You can watch every
action and take over the browser at any time.

```bash
yarn dev                    # terminal 1 — builds + hot-reloads the extension
./scripts/dev-chrome.sh     # terminal 2 — opens v2
./scripts/dev-chrome.sh --v1
./scripts/dev-chrome.sh --clean   # wipe the saved profile
```

The profile lives in `.chrome-profile/` (gitignored), so you log in once and the
session persists. A dedicated profile directory is required — Chrome 136+
refuses `--remote-debugging-port` on the default profile.

### `capture-dom.mjs` — DOM baseline capture

Snapshots the raw site (no extension loaded) so we have a durable record of the
DOM the content scripts target. **v1 is not recapturable once retired.**

```bash
node scripts/capture-dom.mjs                 # both sites, all routes
node scripts/capture-dom.mjs --site=v2
node scripts/capture-dom.mjs --discover      # list reachable routes, capture nothing
node scripts/capture-dom.mjs --route=/play   # one ad-hoc route
node scripts/capture-dom.mjs --headless      # no visible window
node scripts/capture-dom.mjs --fresh-login   # ignore the cached session
```

The browser is **visible by default**; pass `--headless` to suppress it.

Per route it writes into `snapshots/<site>/`:

| file | contents | committed |
|---|---|---|
| `<slug>.html` | full outerHTML | yes |
| `<slug>.probe.json` | design tokens + stable-anchor inventory | yes |
| `<slug>.png` | full-page screenshot | no — regenerate locally |

`.probe.json` is the migration input: which token system is live, and every
`data-slot` / `aria-label` / `role` / stable `id` available to anchor on.

### Selector registry

`utils/selectors.ts` centralises every selector that targets the autodarts DOM.
Entries are ordered candidate lists — v2 first, v1 last — so one build serves
both sites during the transition:

```ts
waitForElement(SELECTORS.match.menuBar)   // accepts string[] natively
qs(SELECTORS.lobby.playerRows)            // querySelector with fallback
qsa(SELECTORS.lobby.playerRows)           // querySelectorAll with fallback
detectSiteVersion()                       // "v1" | "v2"
```

## AltStore Source Update Automation

### Overview

The `update-altstore-source.js` script automatically updates the `Autodarts_Tools_Source.json` file with new version information and news entries when a new release is created.

### How it works

1. **Triggered by GitHub Actions**: The script runs automatically as part of the release workflow in `.github/workflows/release.yml`
2. **Version Detection**: Gets the version from command line arguments or `package.json`
3. **File Size Calculation**: Downloads the IPA file from the live release to calculate the actual file size
4. **Version Management**: 
   - Adds new versions to the beginning of the `versions` array
   - Updates existing versions if they already exist
   - Keeps only the last 5 versions to prevent the file from growing too large
5. **News Generation**: 
   - Creates news entries for new releases
   - Differentiates between regular releases and pre-releases
   - Keeps only the last 10 news entries

### Manual Usage

You can run the script manually:

```bash
# Use version from package.json
node scripts/update-altstore-source.js

# Specify version and prerelease flag
node scripts/update-altstore-source.js "2.1.15" false

# For pre-release
node scripts/update-altstore-source.js "2.2.0-beta.1" true
```

### GitHub Workflow Integration

The script is integrated into the release workflow with these steps:

1. **draft_release** job: Creates a live GitHub release and builds browser extensions
2. **build_ios_app** job: Builds the iOS app and adds the IPA to the live release
3. **update_altstore_source** job: Downloads the IPA from the live release, runs the update script, and commits changes

### Features

- **Live release integration**: Uses actual release assets instead of temporary artifacts
- **Automatic file size detection**: Downloads and calculates actual IPA file size from the live release
- **Duplicate prevention**: Checks for existing versions and news entries
- **Pre-release handling**: Different messaging and notification settings for pre-releases
- **Error handling**: Graceful fallbacks and informative error messages
- **Version limiting**: Automatically maintains a reasonable number of versions and news entries

### File Structure

The script updates the following sections in `Autodarts_Tools_Source.json`:

- `apps[0].versions[]`: Array of available app versions
- `news[]`: Array of news entries about releases

### Configuration

Key configuration values in the script:

- **Default IPA size**: 31,400,000 bytes (used when actual file size cannot be determined)
- **Max versions**: 5 (older versions are automatically removed)
- **Max news entries**: 10 (older news entries are automatically removed)
- **Min iOS version**: 15.6 (required iOS version for the app)

### Release Process

The workflow now creates **live releases** that are immediately public, which means:

- No draft releases that need manual publishing
- The AltStore source is updated with real, downloadable assets
- Users can immediately download new versions through AltStore
- The automation is fully hands-off once triggered 