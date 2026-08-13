#!/usr/bin/env bash
#
# dev-chrome.sh — launch a visible, debuggable Chrome with the extension loaded.
#
# This is the browser Claude drives during migration work. It stays open so you
# can watch every action and take over at any time. It exposes a CDP endpoint on
# port 9222, which both MCP servers in .mcp.json attach to.
#
# The profile lives in .chrome-profile/ (gitignored), so you log in ONCE and the
# session persists across restarts. A dedicated profile dir is also mandatory:
# Chrome 136+ refuses --remote-debugging-port on the default profile.
#
#   ./scripts/dev-chrome.sh          # open the v2 site (default)
#   ./scripts/dev-chrome.sh --v1     # open the old site
#   ./scripts/dev-chrome.sh --clean  # wipe the profile and start fresh
#
# Run `yarn dev` in another terminal first so the extension build exists and
# hot-reloads as you edit.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROFILE="$ROOT/.chrome-profile"
PORT="${CDP_PORT:-9222}"
CHROME="${CHROME_BIN:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"

URL_V1="https://play.autodarts.com"
URL_V2="https://play-v2.autodarts.com"
URL="$URL_V2"

for arg in "$@"; do
  case "$arg" in
    --v1)    URL="$URL_V1" ;;
    --v2)    URL="$URL_V2" ;;
    --clean) echo "Removing $PROFILE"; rm -rf "$PROFILE" ;;
    *)       echo "Unknown option: $arg"; exit 1 ;;
  esac
done

if [[ ! -x "$CHROME" ]]; then
  echo "Chrome not found at: $CHROME"
  echo "Set CHROME_BIN to your Chrome binary and re-run."
  exit 1
fi

# Prefer the dev build (hot reload); fall back to a production build.
if   [[ -d "$ROOT/.output/chrome-mv3-dev" ]]; then EXT="$ROOT/.output/chrome-mv3-dev"; BUILD="dev (hot reload)"
elif [[ -d "$ROOT/.output/chrome-mv3"     ]]; then EXT="$ROOT/.output/chrome-mv3";     BUILD="production"
else
  echo "No extension build found in .output/"
  echo "Run 'yarn dev' (or 'yarn build') first, then re-run this script."
  exit 1
fi

if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Chrome is already listening on CDP port $PORT — reusing it."
  echo "Opening $URL in the running instance."
  open -a "Google Chrome" "$URL" 2>/dev/null || true
  exit 0
fi

mkdir -p "$PROFILE"

echo "Chrome      : $CHROME"
echo "Extension   : $EXT  [$BUILD]"
echo "Profile     : $PROFILE"
echo "CDP endpoint: http://127.0.0.1:$PORT"
echo "Opening     : $URL"
echo

if [[ ! -d "$PROFILE/Default" ]]; then
  echo "First run — you'll need to log in once. Credentials:"
  if [[ -f "$ROOT/.secrets/autodarts.env" ]]; then
    grep -E '^AUTODARTS_(EMAIL|PASSWORD)=' "$ROOT/.secrets/autodarts.env" | sed 's/^/  /'
  else
    echo "  (.secrets/autodarts.env not found)"
  fi
  echo "  Use the email + password form — do NOT use the Google/Apple buttons."
  echo
fi

# --user-data-dir keeps the session; the extension flags load our unpacked build.
# Disabling the "automation" infobar keeps the window usable as a normal browser.
exec "$CHROME" \
  --remote-debugging-port="$PORT" \
  --user-data-dir="$PROFILE" \
  --load-extension="$EXT" \
  --disable-extensions-except="$EXT" \
  --no-first-run \
  --no-default-browser-check \
  --disable-features=DisableLoadExtensionCommandLineSwitch \
  "$URL"
