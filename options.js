const $intercept = document.getElementById("intercept");
const $notifications = document.getElementById("notifications");
const $msg = document.getElementById("msg");

function flash(text) {
  $msg.textContent = text;
  setTimeout(() => {
    if ($msg.textContent === text) $msg.textContent = "";
  }, 2200);
}

chrome.storage.local
  .get({ intercept: true, notifications: true })
  .then((s) => {
    $intercept.checked = !!s.intercept;
    $notifications.checked = s.notifications !== false;
  });

$intercept.addEventListener("change", async () => {
  await chrome.storage.local.set({ intercept: $intercept.checked });
  flash($intercept.checked ? "Download intercept enabled." : "Download intercept disabled.");
});

$notifications.addEventListener("change", async () => {
  await chrome.storage.local.set({ notifications: $notifications.checked });
  flash($notifications.checked ? "Notifications on." : "Notifications off.");
});

/* ---------- Filters ---------- */

const $minValue = document.getElementById("minSizeValue");
const $minUnit = document.getElementById("minSizeUnit");
const $domainInput = document.getElementById("domainInput");
const $domainAdd = document.getElementById("domainAdd");
const $domainList = document.getElementById("domainList");

let blockedDomains = [];

function normalizeDomain(input) {
  let s = String(input || "").trim().toLowerCase().replace(/^\*\./, "");
  if (!s) return "";
  if (!/^[a-z][a-z0-9+.-]*:\/\//.test(s)) s = "http://" + s;
  try {
    const host = new URL(s).hostname.replace(/^\.+|\.+$/g, "");
    return host.includes(".") || host === "localhost" ? host : "";
  } catch {
    return "";
  }
}

function showSize(bytes) {
  const units = [1073741824, 1048576, 1024];
  const unit = bytes > 0 ? units.find((u) => bytes >= u) || 1024 : 1048576;
  $minUnit.value = String(unit);
  $minValue.value = bytes > 0 ? String(Math.round((bytes / unit) * 100) / 100) : "0";
}

async function saveSize() {
  const value = parseFloat($minValue.value);
  const bytes = Number.isFinite(value) && value > 0 ? Math.round(value * Number($minUnit.value)) : 0;
  await chrome.storage.local.set({ minSize: bytes });
  flash(bytes ? "Minimum size saved." : "Size limit off.");
}

function renderDomains() {
  $domainList.textContent = "";
  if (!blockedDomains.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "No blocked sites.";
    $domainList.appendChild(li);
    return;
  }
  for (const domain of blockedDomains) {
    const li = document.createElement("li");
    const name = document.createElement("span");
    name.textContent = domain;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Remove";
    btn.addEventListener("click", async () => {
      blockedDomains = blockedDomains.filter((d) => d !== domain);
      await chrome.storage.local.set({ blockedDomains });
      renderDomains();
      flash("Removed " + domain);
    });
    li.append(name, btn);
    $domainList.appendChild(li);
  }
}

async function addDomain() {
  const domain = normalizeDomain($domainInput.value);
  if (!domain) {
    flash("Enter a valid domain, e.g. example.com");
    return;
  }
  if (!blockedDomains.includes(domain)) {
    blockedDomains = [...blockedDomains, domain].sort();
    await chrome.storage.local.set({ blockedDomains });
  }
  $domainInput.value = "";
  renderDomains();
  flash("Blocked " + domain);
}

chrome.storage.local.get({ minSize: 0, blockedDomains: [] }).then((s) => {
  showSize(s.minSize);
  blockedDomains = s.blockedDomains || [];
  renderDomains();
});

$minValue.addEventListener("change", saveSize);
$minUnit.addEventListener("change", saveSize);
$domainAdd.addEventListener("click", addDomain);
$domainInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addDomain();
});

/* Stay in sync if the popup changes the list */
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.blockedDomains) {
    blockedDomains = changes.blockedDomains.newValue || [];
    renderDomains();
  }
});
