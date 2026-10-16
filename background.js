/* Harbor Chrome Extension – background service worker */

const NATIVE_HOST = "com.harbor.chrome";
const MENU = {
  LINK: "harbor-link",
  IMAGE: "harbor-image",
  VIDEO: "harbor-video",
  AUDIO: "harbor-audio",
  SELECTION: "harbor-selection",
  PAGE: "harbor-page"
};

/** Same URL is ignored for this many ms after a successful send */
const DEDUPE_MS = 10000;
const recent = new Map();

function prune() {
  const cut = Date.now() - DEDUPE_MS;
  for (const [u, t] of recent) if (t < cut) recent.delete(u);
}

function alreadySent(url) {
  prune();
  return recent.has(url);
}

function markSent(url) {
  recent.set(url, Date.now());
}

function isHttpUrl(url) {
  if (!url || typeof url !== "string") return false;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Extract first http(s) URL from selected text */
function urlFromSelection(text) {
  if (!text) return null;
  const m = text.match(/https?:\/\/[^\s<>"']+/i);
  return m ? m[0].replace(/[.,;:!?)]+$/, "") : null;
}

/**
 * Send URL to Harbor via native messaging host.
 * @param {string} url
 * @param {{ force?: boolean }} opts
 */
function sendToHarbor(url, opts = {}) {
  if (!isHttpUrl(url)) {
    return Promise.reject(new Error("Only HTTP and HTTPS URLs are supported."));
  }
  if (!opts.force && alreadySent(url)) {
    return Promise.reject(new Error("This URL was already sent a moment ago."));
  }

  return new Promise((resolve, reject) => {
    chrome.runtime.sendNativeMessage(NATIVE_HOST, { action: "download", url }, (res) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(
          (err.message || "Native host error") +
          " — Install the helper (see options) and restart Chrome."
        ));
        return;
      }
      if (res && res.ok) {
        markSent(url);
        resolve(res);
      } else {
        reject(new Error((res && res.error) || "Harbor did not accept the URL."));
      }
    });
  });
}

function notify(title, message, isError) {
  chrome.storage.local.get({ notifications: true }).then(({ notifications }) => {
    if (!notifications) return;
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: title || "Harbor",
      message: message || "",
      priority: isError ? 2 : 0
    }).catch(() => {});
  });
}

/* ---------- Install / context menus ---------- */

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.contextMenus.removeAll();

  chrome.contextMenus.create({
    id: MENU.LINK,
    title: "Download with Harbor",
    contexts: ["link"]
  });
  chrome.contextMenus.create({
    id: MENU.IMAGE,
    title: "Download image with Harbor",
    contexts: ["image"]
  });
  chrome.contextMenus.create({
    id: MENU.VIDEO,
    title: "Download video with Harbor",
    contexts: ["video"]
  });
  chrome.contextMenus.create({
    id: MENU.AUDIO,
    title: "Download audio with Harbor",
    contexts: ["audio"]
  });
  chrome.contextMenus.create({
    id: MENU.SELECTION,
    title: "Download selected link with Harbor",
    contexts: ["selection"]
  });
  chrome.contextMenus.create({
    id: MENU.PAGE,
    title: "Download this page with Harbor",
    contexts: ["page"]
  });

  const defaults = {
    intercept: true,
    notifications: true,
    minSize: 0
  };
  const stored = await chrome.storage.local.get(defaults);
  await chrome.storage.local.set({ ...defaults, ...stored });
});

/* ---------- Context menu clicks ---------- */

chrome.contextMenus.onClicked.addListener(async (info) => {
  let url = null;

  switch (info.menuItemId) {
    case MENU.LINK:
      url = info.linkUrl;
      break;
    case MENU.IMAGE:
      url = info.srcUrl;
      break;
    case MENU.VIDEO:
    case MENU.AUDIO:
      url = info.srcUrl;
      break;
    case MENU.SELECTION:
      url = urlFromSelection(info.selectionText);
      break;
    case MENU.PAGE:
      url = info.pageUrl;
      break;
  }

  if (!url) {
    notify("Harbor", "No valid URL found.", true);
    return;
  }

  try {
    await sendToHarbor(url, { force: true });
    notify("Harbor", "Sent to Harbor.");
  } catch (e) {
    console.error(e);
    notify("Harbor", e.message, true);
  }
});

/* ---------- Auto-intercept Chrome downloads ---------- */

chrome.downloads.onCreated.addListener(async (item) => {
  try {
    const { intercept } = await chrome.storage.local.get({ intercept: true });
    if (!intercept) return;
    if (!item || item.id == null) return;
    if (!isHttpUrl(item.url)) return;
    if (item.byExtensionId === chrome.runtime.id) return;
    if (alreadySent(item.url)) return;

    // Cancel in Chrome and remove the list entry
    await chrome.downloads.cancel(item.id);
    try {
      await chrome.downloads.erase({ id: item.id });
    } catch (_) {}

    await sendToHarbor(item.url);
    notify("Harbor", "Download redirected to Harbor.");
  } catch (e) {
    console.error("Intercept failed:", e);
  }
});

/* ---------- Messages from popup / options ---------- */

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg?.type === "SEND") {
    sendToHarbor(msg.url, { force: !!msg.force })
      .then(() => {
        notify("Harbor", "Sent to Harbor.");
        reply({ ok: true });
      })
      .catch((e) => reply({ ok: false, error: e.message }));
    return true;
  }

  if (msg?.type === "GET_SETTINGS") {
    chrome.storage.local
      .get({ intercept: true, notifications: true })
      .then((s) => reply({ ok: true, ...s }));
    return true;
  }
});
