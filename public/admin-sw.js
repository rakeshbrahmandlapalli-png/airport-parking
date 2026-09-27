// AP Admin service worker.
//
// Deliberately empty of any fetch handling: every admin request goes straight
// to the network, so nothing is ever cached or shown out of date. It exists so
// the admin can be installed as an app, and is the place push notifications
// for new bookings would be added later.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
