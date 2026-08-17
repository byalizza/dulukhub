/* ============================================================
   Dülük Hub — settings.js
   Ayarlar: tema, profil, yönetim girişi, çıkış, hakkında.
   ============================================================ */

import { $, esc, initials, toast, toggleThemeUI } from "./app.js";
import { navigateTo } from "./navigation.js";
import { getCurrentProfile, getCurrentUser, openAdminCodeModal, logout } from "./auth.js";

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
    const user = getCurrentUser();
    const profile = getCurrentProfile();
    const name = (profile && (profile.displayName || profile.username)) || "";
    const contact = (profile && (profile.phone || profile.email)) || (user ? user.email : "");

    el.innerHTML =
        '<header class="screen-head"><h1>Ayarlar</h1><p>Uygulama tercihleri ve hesap</p></header>' +
        '<div class="settings-group">' +

        '<div class="card setting-row">' +
        '<span class="nav-icon icon-settings">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.9 4.9 1.4 1.4"/><path d="m17.7 17.7 1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.3 17.7-1.4 1.4"/><path d="m19.1 4.9-1.4 1.4"/></svg></span>' +
        "<div><strong>Tema</strong><small>Karanlık / aydınlık görünüm</small></div>" +
        '<button type="button" class="btn btn-sm btn-ghost" id="themeSetting">Değiştir</button></div>' +

        '<div class="card setting-row" style="cursor:pointer" data-go="profile">' +
        '<span class="nav-icon icon-profile">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>' +
        "<div><strong>" + esc(name || "Profilim") + "</strong><small>" + esc(contact || "Hesap bilgilerini gör") + "</small></div>" +
        '<span class="avatar" style="width:34px;height:34px;font-size:13px">' + esc(initials(name || "G")) + "</span></div>" +

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
        "<div><strong>Yönetim</strong><small>Yetki kodu ile paneli aç</small></div>" +
        '<button type="button" class="btn btn-sm btn-ghost">Aç</button></div>' +

        '<div class="card setting-row" style="cursor:pointer" id="settingsLogout">' +
        '<span class="nav-icon icon-admin" style="color:var(--color-danger);background:var(--color-danger-soft)">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg></span>' +
        "<div><strong>Çıkış Yap</strong><small>Hesabından çık</small></div></div>" +

        '<div class="card" style="padding:16px;font-size:12.5px;color:var(--color-muted)">' +
        "<p style=\"margin:0 0 4px\"><strong style=\"color:var(--color-text)\">Dülük Köyü</strong> — Dülük Köyü'nün dijital buluşma noktası.</p>" +
        "<p style=\"margin:0\">© 2026 Dülük Köyü. Sürüm 2.1 (yeni tasarım).</p></div></div>";

    $("#themeSetting", el).addEventListener("click", () => {
        toggleThemeUI();
        toast(document.documentElement.dataset.theme === "dark" ? "Karanlık tema açıldı." : "Aydınlık tema açıldı.");
        renderThemeIconTip();
    });

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

    $('[data-go="profile"]', el).addEventListener("click", () => navigateTo("profile"));
    $("#settingsAdmin", el).addEventListener("click", openAdminCodeModal);
    $("#settingsLogout", el).addEventListener("click", () => navigatelessout());
}

async function navigatelessout() {
    await logout();
}

function renderThemeIconTip() {
    const label = $("#themeSetting");
    if (label) label.textContent = document.documentElement.dataset.theme === "dark" ? "Aydınlığa geç" : "Karanlığa geç";
}