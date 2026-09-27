// AP Admin service worker.
//
// Deliberately no fetch handling: every admin request goes straight to the
// network, so nothing is ever cached or shown out of date. It makes the admin
// installable, and shows new-booking notifications sent by app/lib/push.ts.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data && event.data.text() }; }
  const title = data.title || "AeroPark Direct";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      tag: data.tag,
      icon: "/brand/admin-icon-192.png",
      badge: "/brand/admin-icon-192.png",
      data: { url: data.url || "/admin" },
    })
  );
});

// Tapping the notification opens the admin page it points to, reusing an
// open admin window when there is one.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/admin", self.location.origin).href;
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of all) {
      if (new URL(c.url).pathname.startsWith("/admin") && "focus" in c) {
        await c.focus();
        if ("navigate" in c) await c.navigate(url).catch(() => {});
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});
