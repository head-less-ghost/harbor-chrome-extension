# Harbor Download Helper

A lightweight browser extension that sends download links directly to **Harbor**, the macOS download manager.

Choose your browser:

<p align="center">
  <a href="https://github.com/head-less-ghost/harbor-chrome-extension/releases/latest">
    <strong>Chrome / Chromium</strong>
  </a>
  &nbsp; · &nbsp;
  <a href="https://addons.mozilla.org/en-US/firefox/addon/harbor-download-helper/">
    <img src="firefox.svg" width="50" height="50" alt="Firefox" /> <strong>Firefox</strong>
  </a>
</p>

---

## Features

- **Context menu** — Right-click links, images, video, audio, pages, or selected text → Download with Harbor.
- **Popup** — Paste a URL or use the current tab's URL.
- **Auto-intercept** — Automatically forward browser downloads to Harbor (enabled by default).
- **Safe handoff** — Browser downloads are cancelled only after Harbor accepts the handoff.
- **Referer forwarding** — Pass the originating page URL to Harbor.
- **Test helper** — Check whether the native helper is reachable.
- **Notifications** — Desktop confirmations and error notifications.
- **Minimum file size** — Keep small downloads in your browser.
- **Blocked sites** — Exclude domains and their subdomains from automatic forwarding.
- **Deduplication** — Prevent the same URL from being forwarded repeatedly.

**Note:** Only the URL and referer are sent. Cookies, login sessions, and request headers are not transferred, so authenticated downloads may not work.

## Browser Support

| Browser | Availability |
|---|---|
| Chrome | Supported |
| Brave | Supported |
| Microsoft Edge | Supported |
| Vivaldi | Supported |
| Arc | Supported |
| Chromium | Supported |
| Firefox | Separate extension |

### Firefox

<a href="https://addons.mozilla.org/en-US/firefox/addon/harbor-download-helper/">
  <img src="firefox.svg" width="60" height="60" alt="Firefox" />
  **Get Harbor Download Helper for Firefox**
</a>

The Firefox version is maintained separately.

- [Install from Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/harbor-download-helper/)
- [Firefox source code](https://github.com/head-less-ghost/harbor-firefox-extension)

Firefox also requires its own native messaging helper on macOS.

## Requirements

- macOS
- Chrome or another supported Chromium browser
- Harbor installed
- Python 3
- Xcode Command Line Tools (`xcode-select --install`)

## Installation

### 1. Download the extension

Download the [latest release](https://github.com/head-less-ghost/harbor-chrome-extension/releases/latest) and extract it.

### 2. Load the extension

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click **Load unpacked**.
4. Select the extracted extension folder.

The extension ID is pinned by the `key` field in `manifest.json`.

### 3. Install the native helper

Open Terminal in the extracted folder:

```bash
cd ~/your/path/to/harbor-chrome-extension
```

Run:

```bash
chmod +x install.sh
./install.sh
```

The installer registers the native helper for supported Chromium browsers.

### 4. Restart your browser

Completely quit the browser using `Cmd + Q`, then reopen it.

### 5. Test the connection

Open the extension popup and click **Test native helper**.

You should see:

`Native helper connected`

Now right-click an HTTP or HTTPS link and select **Download with Harbor**.


## Uninstallation

1. Remove the extension from `chrome://extensions`.
2. Remove the native messaging files:

```bash
rm -f "$HOME/Library/Application Support"/*/NativeMessagingHosts/com.harbor.chrome.json
rm -rf "$HOME/Library/Application Support/HarborChrome"
```

## Discover Another Project

<p align="center">
  <img src="TurboFetch Neon Video Downloader.png" width="80%" alt="TurboFetch — Download videos from 14+ platforms" />
</p>

### Meet TurboFetch

Looking for a way to download videos from your favorite platforms?

**TurboFetch** helps you download videos and media from 14+ popular platforms.

YouTube · Vimeo · TikTok · Instagram · Facebook · X · Reddit · SoundCloud · Bandcamp · Dailymotion · Twitch · Bilibili · Tumblr · Streamable

<p align="center">
  <a href="https://github.com/head-less-ghost/TurboFetch">
    <strong>GET TURBOFETCH →</strong>
  </a>
</p>


## Support My Work

If you enjoy my open-source projects and would like to support development, cryptocurrency donations are appreciated.

### TON

Network: TON

```text
UQAXA1ITJ4Y-5sHeRCjs7KS9jKi-Y_bpcx0LEXnB3yRq-oSl
```

### Ethereum (ETH) / USDT

Network: Ethereum

```text
0xb381dc93fb3a40836d40cc438c3bb67f1b08b1a5
```

Thank you for supporting my projects!

---
