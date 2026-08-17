/* ============================================================
   Dülük Hub — settings.js
   Ayarlar: bildirimler, yönetim girişi, hakkında.
   ============================================================ */

import { $, esc, toast } from "./app.js";
import { navigateTo } from "./navigation.js";
import { openAdminCodeModal, isAdminSession } from "./auth.js";

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

    el.innerHTML =
        '<header class="screen-head"><h1>Ayarlar</h1><p>Uygulama tercihleri ve hesap</p></header>' +
        '<div class="settings-group">' +

        '<h2 class="settings-label">Bildirimler</h2>' +
        '<div class="card setting-row">' +
        '<span class="nav-icon icon-bell">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg></span>' +
        "<div><strong>Duyuru bildirimleri</strong><small>Önemli duyurular için e-posta</small></div>" +
        '<button type="button" class="switch" id="notifEmail" role="switch" aria-checked="' + (readPref(NOTIF_KEYS.email) ? "true" : "false") + '" aria-label="Duyuru bildirimleri"></button></div>' +

        '<div class="card setting-row">' +
        '<span class="nav-icon icon-bell" style="background:var(--tone-giveaway-soft);color:var(--tone-giveaway)">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></span>' +
        "<div><strong>Hatırlatmalar</strong><small>Çekiliş ve etkinlik hatırlatmaları</small></div>" +
        '<button type="button" class="switch" id="notifPush" role="switch" aria-checked="' + (readPref(NOTIF_KEYS.push) ? "true" : "false") + '" aria-label="Çekiliş ve etkinlik hatırlatmaları"></button></div>' +

        '<div class="card setting-row" style="cursor:pointer" id="settingsAdmin">' +
        '<span class="nav-icon icon-admin">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>' +
        "<div><strong>Yönetim</strong><small>" + (isAdminSession() ? "Paneli aç" : "Yetki kodu ile paneli aç") + "</small></div>" +
        '<button type="button" class="btn btn-sm btn-ghost">Aç</button></div>' +

        '<div class="card" style="padding:16px;font-size:12.5px;color:var(--color-muted)">' +
        "<p style=\"margin:0 0 4px\"><strong style=\"color:var(--color-text)\">Dülük Köyü</strong> — Dülük Köyü'nün dijital buluşma noktası.</p>" +
        "<p style=\"margin:0\">© 2026 Dülük Köyü. Sürüm 2.2 (karanlık tema).</p></div></div>";

    const notifEmail = $("#notifEmail", el);
    if (notifEmail) {
        notifEmail.addEventListener("click", () => {
            const on = togglePref(NOTIF_KEYS.email, notifEmail);
            toast(on ? "Duyuru bildirimleri açıldı." : "Duyuru bildirimleri kapatıldı.");
        });
    }

    const notifPush = $("#notifPush", el);
    if (notifPush) {
        notifPush.addEventListener("click", () => {
            const on = togglePref(NOTIF_KEYS.push, notifPush);
            toast(on ? "Hatırlatmalar açıldı." : "Hatırlatmalar kapatıldı.");
        });
    }

    $("#settingsAdmin", el).addEventListener("click", () => {
        if (isAdminSession()) navigateTo("admin");
        else openAdminCodeModal();
    });
}