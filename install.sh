#!/bin/bash
# Install the Native Messaging host so Chromium browsers can talk to Harbor.
set -euo pipefail

# The extension ID is pinned by the "key" field in manifest.json, so it is the
# same on every machine and no longer depends on where this folder lives.
DEFAULT_ID="fochjdokmchcbcbjgfohfpifhagolonm"
EXT_ID="$DEFAULT_ID"
if [ "$#" -ge 1 ] && [ -n "$1" ]; then
  EXT_ID="$1"
fi

if ! [[ "$EXT_ID" =~ ^[a-p]{32}$ ]]; then
  echo "Error: '$EXT_ID' is not a Chrome extension ID (32 letters a-p)."
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "Error: python3 was not found."
  echo "The helper needs it; macOS provides it with the Command Line Tools:"
  echo
  echo "  xcode-select --install"
  echo
  echo "Then run this script again."
  exit 1
fi

ROOT="$HOME/Library/Application Support/HarborChrome"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

mkdir -p "$ROOT"
cp "$SCRIPT_DIR/host.py" "$ROOT/host.py"
chmod 700 "$ROOT/host.py"

# Each Chromium browser reads its own native messaging manifest.
BROWSERS=(
  "Google/Chrome"
  "Chromium"
  "BraveSoftware/Brave-Browser"
  "Microsoft Edge"
  "Vivaldi"
  "Arc/User Data"
)

installed=()
for base in "${BROWSERS[@]}"; do
  data="$HOME/Library/Application Support/$base"
  [ -d "$data" ] || continue
  hosts="$data/NativeMessagingHosts"
  mkdir -p "$hosts"
  python3 - "$ROOT/host.py" "$hosts/com.harbor.chrome.json" "$EXT_ID" <<'PY'
import json, sys
host_path, manifest_path, ext_id = sys.argv[1:]
data = {
    "name": "com.harbor.chrome",
    "description": "Harbor download bridge for Chromium browsers",
    "path": host_path,
    "type": "stdio",
    "allowed_origins": ["chrome-extension://" + ext_id + "/"]
}
with open(manifest_path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
PY
  installed+=("$base")
done

if [ "${#installed[@]}" -eq 0 ]; then
  echo "Warning: no Chromium browser folder found in ~/Library/Application Support."
  echo "Start the browser once, then run this script again."
  exit 1
fi

echo
echo "✓ Native host installed."
echo "  Script  : $ROOT/host.py"
echo "  Ext. ID : $EXT_ID"
for base in "${installed[@]}"; do
  echo "  Browser : $base"
done
echo
echo "Next:"
echo "  1. Quit the browser completely  (Cmd + Q)"
echo "  2. Reopen it"
echo "  3. Open the Harbor popup and click \"Test native helper\""
echo
echo "To uninstall later:"
echo '  rm -f "$HOME/Library/Application Support"/*/NativeMessagingHosts/com.harbor.chrome.json'
echo '  rm -rf "$HOME/Library/Application Support/HarborChrome"'
