const $url = document.getElementById("url");
const $send = document.getElementById("send");
const $status = document.getElementById("status");
const $intercept = document.getElementById("intercept");
const $test = document.getElementById("test");

function status(text, kind) {
  $status.textContent = text || "";
  $status.className = kind || "";
}

/* Load current intercept setting */
chrome.storage.local.get({ intercept: true }).then(({ intercept }) => {
  $intercept.checked = !!intercept;
});

/* Toggle auto-intercept from popup */
$intercept.addEventListener("change", async () => {
  await chrome.storage.local.set({ intercept: $intercept.checked });
  status(
    $intercept.checked ? "Auto-intercept on" : "Auto-intercept off",
    "ok"
  );
});

/* Send URL */
$send.addEventListener("click", async () => {
  const url = $url.value.trim();
  if (!url) {
    status("Enter a URL first", "err");
    return;
  }
  $send.disabled = true;
  status("Sending…");
  try {
    const res = await chrome.runtime.sendMessage({ type: "SEND", url, force: true });
    if (res?.ok) status("Sent to Harbor", "ok");
    else status(res?.error || "Failed", "err");
  } catch (e) {
    status(e.message || "Background error", "err");
  } finally {
    $send.disabled = false;
  }
});

/* Check that the native helper is installed and answering */
$test.addEventListener("click", async () => {
  $test.disabled = true;
  status("Checking helper…");
  try {
    const res = await chrome.runtime.sendMessage({ type: "PING" });
    if (res?.ok) status("Native helper connected", "ok");
    else status(res?.error || "Native helper not reachable", "err");
  } catch (e) {
    status(e.message || "Native helper not reachable", "err");
  } finally {
    $test.disabled = false;
  }
});

/* Use current tab */
document.getElementById("current").addEventListener("click", async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url && /^https?:\/\//i.test(tab.url)) {
      $url.value = tab.url;
      status("URL filled — click Download", "ok");
      $url.focus();
    } else {
      status("No valid URL on this tab", "err");
    }
  } catch {
    status("Could not read tab URL", "err");
  }
});

/* Never intercept downloads from the current site (like IDM's exclude list) */
const $block = document.getElementById("block");
let siteHost = "";

function setBlockLabel(blocked) {
  $block.textContent = blocked
    ? "Allow Harbor on " + siteHost
    : "Never download from " + siteHost;
}

function isBlocked(list) {
  return (list || []).some((d) => siteHost === d || siteHost.endsWith("." + d));
}

(async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url || !/^https?:\/\//i.test(tab.url)) return;
    siteHost = new URL(tab.url).hostname.toLowerCase();
    const { blockedDomains } = await chrome.storage.local.get({ blockedDomains: [] });
    setBlockLabel(isBlocked(blockedDomains));
    $block.hidden = false;
  } catch {}
})();

$block.addEventListener("click", async () => {
  const { blockedDomains } = await chrome.storage.local.get({ blockedDomains: [] });
  let next;
  if (isBlocked(blockedDomains)) {
    // Remove the entry (or parent domain entry) that covers this host
    next = blockedDomains.filter((d) => !(siteHost === d || siteHost.endsWith("." + d)));
    status("Harbor allowed on " + siteHost, "ok");
  } else {
    next = [...blockedDomains, siteHost].sort();
    status(siteHost + " will stay in Chrome", "ok");
  }
  await chrome.storage.local.set({ blockedDomains: next });
  setBlockLabel(isBlocked(next));
});

/* Settings gear */
document.getElementById("options").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

/* Enter to send */
$url.addEventListener("keydown", (e) => {
  if (e.key === "Enter") $send.click();
});

$url.focus();
