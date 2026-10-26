# Harbor Download Helper

A Chrome extension that forwards download links to [Harbor](https://github.com/thsnkhn/harbor) on macOS.

It uses Chrome Native Messaging to pass URLs to a local helper, which opens Harbor with the `harbor://download?url=...` scheme.

## Features

- **Context menu** — right-click links, images, video, audio, the page, or selected text → Download with Harbor
- **Popup** — paste a URL or use the current tab’s URL
- **Auto-intercept** — when Chrome starts a download, hand the URL to Harbor instead (on by default, toggle in the popup)
- **Safe handoff** — the Chrome download is only cancelled once Harbor accepts it. If the helper is missing or Harbor refuses, the download stays in Chrome and you get a notification
- **Referer forwarding** — the page a link came from is passed to Harbor, which some file hosts require
- **Test helper** — one click in the popup tells you whether the native host is reachable
- **Notifications** — optional desktop confirmation after a handoff, and always on failure
- **Deduplication** — the same URL is not sent again for a few seconds

**Note:** Only the URL and the referer are sent. Cookies, login state, and request headers are not transferred, so authenticated downloads may still fail.

## Requirements

- macOS
- Chrome, Chromium, Brave, Edge, Vivaldi or Arc
- [Harbor](https://github.com/thsnkhn/harbor) installed
- `python3` — macOS provides it with the Xcode Command Line Tools (`xcode-select --install`). The installer checks for it.

## Installation

### 1. Load the extension

1. Download the latest [release](https://github.com/head-less-ghost/harbor-chrome-extension/releases) and extract it.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the extracted folder.

The extension ID is pinned by the `key` field in `manifest.json`, so it is the same on every machine and does not change when you move the folder.

### 2. Register the native host

1. Open Terminal and go to the extracted folder:

   ```sh
   cd ~/your/path/to/harbor-chrome-extension
   ```

2. Run the installer:

   ```sh
   chmod +x install.sh
   ./install.sh
   ```

   It installs the helper for every Chromium browser it finds, and needs no extension ID.

3. Quit the browser completely (**Cmd + Q**), then reopen it.

### 3. Test

Open the popup and click **Test native helper**. You should see “Native helper connected”.

Then right-click an HTTP or HTTPS link → **Download with Harbor**, or open the popup and enter a URL. Harbor may show its own confirmation dialog.

## Permissions

`downloads`, `contextMenus`, `nativeMessaging`, `notifications`, `storage` and `tabs` (only to read the current tab’s URL for “Use current tab”).

The extension does not request access to web pages: there are no host permissions, no content scripts, and it never reads page content. It only sees the URL of a download Chrome was already starting.

## Automatic forwarding

Auto-intercept is **on by default**. Turn it off in the popup or in Settings if you prefer Chrome to handle downloads.

Only the URL and referer are forwarded, so some sites may not work.

## Troubleshooting

### “Native helper not reachable”

Click **Test native helper** in the popup first — it answers the question directly.

- Make sure `install.sh` finished without errors.
- Quit and reopen the browser. Native messaging manifests are only read at startup.
- Confirm `python3` exists: `python3 --version`.
- Check that this file exists for your browser:

  ```text
  ~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.harbor.chrome.json
  ```

### Downloads keep landing in Chrome

Either auto-intercept is switched off, or the handoff failed. Failures always show a notification — check that notifications are enabled. The download is never deleted when the handoff fails.

### Harbor does not open

Confirm Harbor is installed and handles the `harbor://` scheme. Test with:

```sh
open 'harbor://download?url=https%3A%2F%2Fexample.com%2Ftest.zip'
```

### A download fails in Harbor

The site may need cookies or a login. Use a direct public link, or turn off auto-intercept and download with Chrome.

## Uninstallation

1. Remove the extension from `chrome://extensions`.
2. Delete the native host files:

   ```sh
   rm -f "$HOME/Library/Application Support"/*/NativeMessagingHosts/com.harbor.chrome.json
   rm -rf "$HOME/Library/Application Support/HarborChrome"
   ```

## Contributing

Bug reports and pull requests are welcome. Include your macOS, browser, and Harbor versions, plus the exact error message. Do not include private URLs, tokens, or credentials.

## Disclaimer

Independent community project. Not affiliated with or endorsed by the Harbor app or its maintainers.
