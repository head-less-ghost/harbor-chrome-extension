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
