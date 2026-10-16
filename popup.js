const $url = document.getElementById("url");
const $send = document.getElementById("send");
const $status = document.getElementById("status");
const $intercept = document.getElementById("intercept");

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

/* Settings gear */
document.getElementById("options").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

/* Enter to send */
$url.addEventListener("keydown", (e) => {
  if (e.key === "Enter") $send.click();
});

$url.focus();
