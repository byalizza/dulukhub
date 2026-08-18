/* ============================================================
   Dülük Hub — settings.js
   Ayarlar: bildirimler, hakkında.
   ============================================================ */

import { $, esc, toast } from "./app.js";
import { saveSubscription, unsubscribePush, isSubscribed, initNotifications } from "./notifications.js";

const NOTIF_KEYS = {
    email: "dulukhub-notif-email",
    push: "dulukhub-notif-push"
};

function readPref(key) {
    return localStorage.getItem(key) === "1";
}

function togglePref(key, btn) {
    const next = !(btn.getAttribute("aria-checked") === "true");
    localStorage.setItem(key, next ? "1" : "0");
    btn.setAttribute("aria-checked", String(next));
    return next;
}

export async function renderSettings() {
    const el = $("#settingsContent");

    await initNotifications();
    const pushEnabled = await isSubscribed();

    el.innerHTML =
        '<header class="screen-head"><h1>Ayarlar</h1><p>Uygulama tercihleri ve hesap</p></header>' +
        '<div class="settings-group">' +

        '<h2 class="settings-label">Bildirimler</h2>' +
        '<div class="card setting-row">' +
        '<span class="nav-icon icon-bell">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg></span>' +
        "<div><strong>Push bildirimleri</strong><small>Yeni haber ve duyuru bildirimleri</small></div>" +
        '<button type="button" class="switch" id="notifPushToggle" role="switch" aria-checked="' + (pushEnabled ? "true" : "false") + '" aria-label="Push bildirimleri"></button></div>' +

        '<div class="card setting-row">' +
        '<span class="nav-icon icon-bell" style="background:var(--color-primary-soft);color:var(--color-primary)">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg></span>' +
        "<div><strong>Duyuru bildirimleri</strong><small>Önemli duyurular için bildirim</small></div>" +
        '<button type="button" class="switch" id="notifEmail" role="switch" aria-checked="' + (readPref(NOTIF_KEYS.email) ? "true" : "false") + '" aria-label="Duyuru bildirimleri"></button></div>' +

        '<div class="card" style="padding:16px;font-size:12.5px;color:var(--color-muted)">' +
        "<p style=\"margin:0 0 4px\"><strong style=\"color:var(--color-text)\">Dülük Köyü</strong> — Dülük Köyü'nün dijital buluşma noktası.</p>" +
        "<p style=\"margin:0\">© 2026 Dülük Köyü. Sürüm 3.0 (yeni tema + özellikler).</p></div></div>";

    const pushToggle = $("#notifPushToggle", el);
    if (pushToggle) {
        pushToggle.addEventListener("click", async () => {
            const sub = await isSubscribed();
            if (sub) {
                await unsubscribePush();
                pushToggle.setAttribute("aria-checked", "false");
            } else {
                await saveSubscription();
                const nowSub = await isSubscribed();
                pushToggle.setAttribute("aria-checked", String(nowSub));
            }
        });
    }

    const notifEmail = $("#notifEmail", el);
    if (notifEmail) {
        notifEmail.addEventListener("click", () => {
            const on = togglePref(NOTIF_KEYS.email, notifEmail);
            toast(on ? "Duyuru bildirimleri açıldı." : "Duyuru bildirimleri kapatıldı.");
        });
    }
}
