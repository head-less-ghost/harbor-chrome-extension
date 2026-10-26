/* Harbor Chrome Extension – background service worker */

const NATIVE_HOST = "com.harbor.chrome";
const MENU = {
  LINK: "harbor-link",
  IMAGE: "harbor-image",
  VIDEO: "harbor-video",
  AUDIO: "harbor-audio",
  SELECTION: "harbor-selection",
  PAGE: "harbor-page",
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

/**
 * Drop trailing punctuation from a URL picked out of text, but keep a closing
 * paren that actually belongs to the URL (e.g. .../Foo_(bar)).
 */
function trimUrlEnd(raw) {
  let url = raw;
  const punctuation = ".,;:!?'\"";
  while (url.length > 0) {
    const last = url.charAt(url.length - 1);
    if (punctuation.indexOf(last) !== -1) {
      url = url.slice(0, -1);
      continue;
    }
    if (last === ")") {
      const opens = (url.match(/\(/g) || []).length;
      const closes = (url.match(/\)/g) || []).length;
      if (closes > opens) {
        url = url.slice(0, -1);
        continue;
      }
    }
    break;
  }
  return url;
}

/** Extract first http(s) URL from selected text */
function urlFromSelection(text) {
  if (!text) return null;
  const m = text.match(/https?:\/\/[^\s<>"']+/i);
  return m ? trimUrlEnd(m[0]) : null;
}

function hostError(err) {
  return new Error(
    (err.message || "Native host error") +
      " — run install.sh, then quit and reopen the browser.",
  );
}

/**
 * Send URL to Harbor via native messaging host.
 * @param {string} url
 * @param {{ force?: boolean, referrer?: string }} opts
 */
function sendToHarbor(url, opts = {}) {
  if (!isHttpUrl(url)) {
    return Promise.reject(new Error("Only HTTP and HTTPS URLs are supported."));
  }
  if (!opts.force && alreadySent(url)) {
    return Promise.reject(new Error("This URL was already sent a moment ago."));
  }

  const message = { action: "download", url };
  // Some hosts reject the request when the referer is missing.
  if (isHttpUrl(opts.referrer)) message.referrer = opts.referrer;

  return new Promise((resolve, reject) => {
    chrome.runtime.sendNativeMessage(NATIVE_HOST, message, (res) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(hostError(err));
        return;
      }
      if (res && res.ok) {
        markSent(url);
        resolve(res);
      } else {
        reject(
          new Error((res && res.error) || "Harbor did not accept the URL."),
        );
      }
    });
  });
}

/** Check that the native helper is installed and answering. */
function pingHost() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendNativeMessage(NATIVE_HOST, { action: "ping" }, (res) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(hostError(err));
        return;
      }
      if (res && res.ok) {
        resolve(res);
      } else {
        reject(
          new Error((res && res.error) || "The native helper did not answer."),
        );
      }
    });
  });
}

function notify(title, message, isError) {
  chrome.storage.local
    .get({ notifications: true })
    .then(({ notifications }) => {
      if (!notifications) return;
      chrome.notifications
        .create({
          type: "basic",
          iconUrl: "icons/icon128.png",
          title: title || "Harbor",
          message: message || "",
          priority: isError ? 2 : 0,
        })
        .catch(() => {});
    });
}

/* ---------- Install / context menus ---------- */

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.contextMenus.removeAll();

  chrome.contextMenus.create({
    id: MENU.LINK,
    title: "Download with Harbor",
    contexts: ["link"],
  });
  chrome.contextMenus.create({
    id: MENU.IMAGE,
    title: "Download image with Harbor",
    contexts: ["image"],
  });
  chrome.contextMenus.create({
    id: MENU.VIDEO,
    title: "Download video with Harbor",
    contexts: ["video"],
  });
  chrome.contextMenus.create({
    id: MENU.AUDIO,
    title: "Download audio with Harbor",
    contexts: ["audio"],
  });
  chrome.contextMenus.create({
    id: MENU.SELECTION,
    title: "Download selected link with Harbor",
    contexts: ["selection"],
  });
  chrome.contextMenus.create({
    id: MENU.PAGE,
    title: "Download this page with Harbor",
    contexts: ["page"],
  });

  const defaults = {
    intercept: true,
    notifications: true,
    minSize: 0,
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
    // The page the link sits on is the referer the file server expects.
    await sendToHarbor(url, {
      force: true,
      referrer: info.frameUrl || info.pageUrl,
    });
    notify("Harbor", "Sent to Harbor.");
  } catch (e) {
    console.error(e);
    notify("Harbor", e.message, true);
  }
});

/* ---------- Auto-intercept Chrome downloads ---------- */

const MAX_AGE_MS = 15000; // only handle downloads that just started

chrome.downloads.onCreated.addListener(async (item) => {
  try {
    const { intercept } = await chrome.storage.local.get({ intercept: true });
    if (!intercept) return;
    if (!item || item.id == null) return;
    if (!isHttpUrl(item.url)) return;
    // Never take over a download another extension started.
    if (item.byExtensionId) return;

    // Ignore restored / resumed / old downloads (the startup replay)
    const age = Date.now() - Date.parse(item.startTime);
    if (item.state !== "in_progress" || !(age >= 0 && age < MAX_AGE_MS)) {
      console.log(
        "Harbor: ignored old/non-active download",
        item.url,
        item.state,
        item.startTime,
      );
      return;
    }

    // Dedupe that survives service-worker restarts
    const { sent = {} } = await chrome.storage.session.get("sent");
    const now = Date.now();
    for (const u in sent) if (now - sent[u] > 60000) delete sent[u];
    if (sent[item.url]) return;
    sent[item.url] = now;
    await chrome.storage.session.set({ sent });

    // Hold the Chrome download so a failed handoff can be undone.
    let paused = false;
    try {
      await chrome.downloads.pause(item.id);
      paused = true;
    } catch (_) {}

    try {
      await sendToHarbor(item.url, { force: true, referrer: item.referrer });
      try {
        await chrome.downloads.cancel(item.id);
      } catch (_) {}
      try {
        await chrome.downloads.erase({ id: item.id });
      } catch (_) {}
      notify("Harbor", "Download redirected to Harbor.");
    } catch (e) {
      console.error("Intercept failed:", e);
      // allow a retry later if the handoff failed
      const s = (await chrome.storage.session.get("sent")).sent || {};
      delete s[item.url];
      await chrome.storage.session.set({ sent: s });
      if (paused) {
        try {
          await chrome.downloads.resume(item.id);
        } catch (_) {}
      }
      notify(
        "Harbor",
        "Could not reach Harbor — kept this download in Chrome.",
        true,
      );
    }
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

  if (msg?.type === "PING") {
    pingHost()
      .then((res) => reply({ ok: true, host: res.host }))
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
