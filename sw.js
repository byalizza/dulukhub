/* ============================================================
   Dülük Hub — Service Worker
   Push bildirimleri ve bildirim tıklama yönetimi.
   ============================================================ */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (e) => {
    let data = { title: "Dülük Köyü", body: "Yeni bir bildirim var." };
    if (e.data) {
        try { data = e.data.json(); } catch (_) { data.body = e.data.text(); }
    }
    e.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: "./assets/favicon.png",
            badge: "./assets/favicon.png",
            tag: data.tag || "duluk-hub",
            data: data.url || "./"
        })
    );
});

self.addEventListener("notificationclick", (e) => {
    e.notification.close();
    const url = e.notification.data || "./";
    e.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
            for (const c of list) {
                if (c.url.includes(self.registration.scope) && "focus" in c) return c.focus();
            }
            return self.clients.openWindow(url);
        })
    );
});
