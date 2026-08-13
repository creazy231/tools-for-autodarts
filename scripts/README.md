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

### `yarn dev` — the browser to use for migration work

`yarn dev` is the primary entry point. It builds to `.output/chrome-mv3-dev`,
serves hot reload on `:3000`, and opens a **visible** Chrome with that dev build
already loaded. Via `webExt` in `wxt.config.ts` it also:

- keeps its profile in `.chrome-profile-dev/`, so the autodarts login survives
  dev-server restarts, and
- exposes **CDP on `:9222`**, so Playwright and both MCP servers in `.mcp.json`
  drive *this* browser — the one your edits hot-reload into.

That last point is the whole trick. Debugging a browser running a different copy
of the extension than the one you're editing wastes a lot of time.

It opens v2 and v1 side by side. Note `yarn dev` needs a real terminal: it waits
on stdin for its "press o + enter" prompt and exits immediately without a TTY.

### `inspect.mjs` — drive the site with the extension loaded

Reports whether the extension actually injected, and what it logged.

```bash
node scripts/inspect.mjs                      # v2 home
node scripts/inspect.mjs --url=/tournaments
node scripts/inspect.mjs --v1
node scripts/inspect.mjs --keep-open          # leave the browser up on :9222
node scripts/inspect.mjs --prod               # packaged build instead of dev
```

If a browser is already serving CDP on `:9222` (i.e. `yarn dev`'s), it **attaches
to that one** instead of starting a second browser. Otherwise it launches its own
with the dev build, using the `.chrome-profile-pw/` profile.

It refuses to start against v2 with a build whose manifest lacks the `play-v2`
host, because the extension would silently not load and everything you observed
would be the bare site.

### `dev-chrome.sh` — browser without the dev server

Fallback for when you want the extension in a browser but aren't running
`yarn dev` (no hot reload). Same CDP endpoint, profile in `.chrome-profile/`.

```bash
./scripts/dev-chrome.sh           # v2
./scripts/dev-chrome.sh --v1
./scripts/dev-chrome.sh --clean   # wipe the saved profile
```

A dedicated profile directory is required either way — Chrome 136+ refuses
`--remote-debugging-port` on the default profile.

### DOM picker — capture elements for a Claude Code session

A dev-only element picker for driving v1 → v2 ports. Pick the element a feature
touches on the old site, pick its counterpart on the new one, paste both into a
Claude Code session, and ask for the port.

| key | action |
|---|---|
| `Alt+Shift+P` | arm / disarm the picker |
| hover | preview the element under the cursor |
| `↑` / `↓` | widen / narrow from whatever is previewed — **no click needed** |
| `E` or click | capture what is previewed |
| `C` | copy all captures to the clipboard as Markdown |
| `R` | reset the captures |
| `Esc` | release the lock; press again to disarm |

Clicks are swallowed while armed, so the site never acts on them.

**Hover and walk.** Point at an element and press `↑` to move up the tree — no
need to click first. The first `↑` *locks* the selection (the label shows 🔒), so
moving the mouse cannot steal it back while you adjust. `↓` walks back down; on
reaching the element you started from, the lock releases and the preview follows
the mouse again. `E` or a click captures whatever is previewed and ends the
walk. `E` is usually the better one — after walking up, the cursor is often no
longer over the element you actually want, and some elements react badly to
being clicked.

This matters more than it sounds: pointing at an icon previews a `<path>`, and
one `↑` gets you the button you actually meant.

For each captured element the report carries:

- **ranked selector candidates with live match counts**, ordered by *durability*
  rather than uniqueness — a two-match `a[href="/statistics"]` beats a unique
  `.chakra-stack > a:nth-of-type(6)`, because the chain breaks the moment a
  sibling moves
- attributes, text, box, and classes split into semantic / utility / **generated**
  (Emotion `css-*`, React `:r0:`, Base UI `_r_*_` — never anchor on these)
- the ancestor chain with each ancestor's stable anchors, for scoping
- **which extension code already targets it**, as `file:line`, filtered so
  generic selectors like `querySelector("button")` don't drown the useful ones

That last section comes from `utils/selector-index.generated.ts`. Regenerate it
after moving selectors around:

```bash
yarn picker:index
```

#### Installing the picker in a real browser

The picker is useless if it only exists in `yarn dev` — capturing the in-match
DOM needs a real board and a real match. So there is a second build target:

```bash
yarn build:devtools           # -> .output-devtools/chrome-mv3
yarn build:devtools:firefox
yarn zip:devtools             # zipped, for loading as an unpacked extension
```

That is a normal production build that also ships the picker. Load
`.output-devtools/chrome-mv3` via *chrome://extensions → Load unpacked*. It
reports itself as `3.0.0+devtools` in `chrome://extensions`, so it is obvious
which copy is installed.

| | `yarn build` (CI / stores) | `yarn build:devtools` (local) |
|---|---|---|
| output | `.output/` | `.output-devtools/` |
| picker | stripped | included |
| `clipboardWrite` permission | not requested | requested |
| `version_name` | — | `<version>+devtools` |

Everything else is identical, so the devtools build behaves exactly like the
store build on the existing site.

**The picker never reaches store users.** It is gated on a Vite `define`
(`__ADT_PICKER__`), and `build:manifestGenerated` / `build:done` hooks in
`wxt.config.ts` delete the emitted file and unregister it from the manifest for
any non-devtools production build. Verify at any time with:

```bash
grep -rl "adt-dom-picker-host" .output/chrome-mv3/   # must print nothing
```

### Which build gets loaded

`scripts/lib/extension.mjs` resolves this for every script: the **dev** build is
preferred, production is the fallback. It also checks two things that otherwise
cost real debugging time:

- **Is the dev server up?** The dev build loads without it but won't hot-reload.
- **Is the build stale?** A build made before `play-v2` was added to the manifest
  silently does not load on v2 at all. `dev-chrome.sh` performs the same check.

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