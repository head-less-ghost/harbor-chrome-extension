# Harbor Download Helper

A Chrome extension that forwards download links to [Harbor](https://github.com/thsnkhn/harbor) on macOS.

there is a test version of Firefox too: <a href="https://addons.mozilla.org/en-US/firefox/addon/harbor-download-helper/">
  <img src="firefox.svg" alt="link!!" width="100">
</a>

It uses Chrome Native Messaging to pass URLs to a local helper, which opens Harbor with the `harbor://download?url=...` scheme.

## Features

- **Context menu** — right-click links, images, video, audio, the page, or selected text → Download with Harbor
- **Popup** — paste a URL or use the current tab’s URL
- **Auto-intercept** — when Chrome starts a download, cancel it and open the same URL in Harbor (on by default, toggle in the popup)
- **Notifications** — optional desktop confirmation after a successful handoff
- **Deduplication** — the same URL is not sent again for a few seconds

**Note:** Only the URL is sent. Cookies, login state, and request headers are not transferred, so authenticated downloads may fail.

## Requirements

- macOS
- Google Chrome (or another Chromium browser with Native Messaging support)
- [Harbor](https://github.com/thsnkhn/harbor) installed

## Installation

### 1. Load the extension

1. Download the latest [release](https://github.com/head-less-ghost/harbor-chrome-extension/releases) and extract it.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the extracted folder.
5. Copy the **extension ID** shown on the card.

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

3. Paste the extension ID when prompted.
4. Quit Chrome completely (**Cmd + Q**), then reopen it.

### 3. Test

Right-click an HTTP or HTTPS link → **Download with Harbor**, or open the popup and enter a URL.

Harbor may show its own confirmation dialog.

## Automatic forwarding

Auto-intercept is **on by default**. Turn it off in the popup or in Settings if you prefer Chrome to handle downloads.

Only the URL is forwarded — no cookies or auth headers — so some sites may not work.

## Troubleshooting

### Native host not found

- Make sure `install.sh` finished without errors.
- Confirm you entered the correct extension ID.
- Quit and reopen Chrome.
- Check that this file exists:

  ```text
  ~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.harbor.chrome.json
  ```

### Harbor does not open

Confirm Harbor is installed and handles the `harbor://` scheme. Test with:

```sh
open 'harbor://download?url=https%3A%2F%2Fexample.com%2Ftest.zip'
```

### A download fails in Harbor

The site may require cookies or login. Use a direct public link, or turn off auto-intercept and download with Chrome.

## Uninstallation

1. Remove the extension from `chrome://extensions`.
2. Delete the native host files:

   ```sh
   rm -f "$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.harbor.chrome.json"
   rm -rf "$HOME/Library/Application Support/HarborChrome"
   ```

## Contributing

Bug reports and pull requests are welcome. Include your macOS, Chrome, and Harbor versions, plus the exact error message. Do not include private URLs, tokens, or credentials.

## Disclaimer

Independent community project. Not affiliated with or endorsed by the Harbor app or its maintainers.
