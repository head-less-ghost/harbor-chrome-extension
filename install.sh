#!/bin/bash
# Install the Native Messaging host so Chrome can talk to Harbor.
set -euo pipefail

EXT_ID="${1:-}"
if [[ -z "$EXT_ID" ]]; then
  echo "Harbor Chrome – native host installer"
  echo
  read -r -p "Paste the extension ID from chrome://extensions: " EXT_ID
fi

if [[ ! "$EXT_ID" =~ ^[a-p]{32}$ ]]; then
  echo "Error: that does not look like a Chrome extension ID (32 letters a–p)."
  echo "Load the unpacked extension first, then copy the ID from the card."
  exit 1
fi

ROOT="$HOME/Library/Application Support/HarborChrome"
HOSTS="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
MANIFEST="$HOSTS/com.harbor.chrome.json"

mkdir -p "$ROOT" "$HOSTS"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cp "$SCRIPT_DIR/host.py" "$ROOT/host.py"
chmod 700 "$ROOT/host.py"

python3 - "$ROOT/host.py" "$MANIFEST" "$EXT_ID" <<'PY'
import json, sys
host_path, manifest_path, ext_id = sys.argv[1:]
data = {
    "name": "com.harbor.chrome",
    "description": "Harbor download bridge for Chrome",
    "path": host_path,
    "type": "stdio",
    "allowed_origins": [f"chrome-extension://{ext_id}/"]
}
with open(manifest_path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
PY

echo
echo "✓ Native host installed."
echo "  Script : $ROOT/host.py"
echo "  Manifest: $MANIFEST"
echo
echo "Next:"
echo "  1. Quit Chrome completely  (Cmd + Q)"
echo "  2. Reopen Chrome"
echo "  3. Right-click a link → Download with Harbor"
echo
echo "To uninstall later:"
echo "  rm -f \"$MANIFEST\""
echo "  rm -rf \"$ROOT\""
