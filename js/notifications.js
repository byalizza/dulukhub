/* ============================================================
   Dülük Hub — notifications.js
   Tarayıcı bildirimleri: izin isteme, yerel bildirim gönderme.
   ============================================================ */

import { toast } from "./app.js";
import { auth } from "./firebase.js";

export async function initNotifications() {
    if (!("serviceWorker" in navigator) || !("Notification" in window)) return;

    try {
        await navigator.serviceWorker.register("./sw.js");
    } catch (err) {
        console.warn("Service worker kaydedilemedi:", err);
    }
}

export async function requestNotificationPermission() {
    if (!("Notification" in window)) {
        toast("Tarayıcınız bildirim desteklemiyor.", "error");
        return false;
    }

    if (Notification.permission === "granted") return true;

    if (Notification.permission === "denied") {
        toast("Bildirim izni reddedildi. Tarayıcı ayarlarından açabilirsiniz.", "error");
        return false;
    }

    const result = await Notification.requestPermission();
    if (result === "granted") {
        toast("Bildirimler açıldı!", "success");
        return true;
    }
    toast("Bildirim izni verilmedi.", "error");
    return false;
}

export async function revokeNotificationPermission() {
    toast("Bildirimleri kapatmak için tarayıcı ayarlarını kullanın.", "error");
}

export function isNotificationGranted() {
    return "Notification" in window && Notification.permission === "granted";
}

export function sendLocalNotification(title, body, tag) {
    if (!isNotificationGranted()) return;
    try {
        new Notification(title || "Dülük Köyü", {
            body: body || "Yeni bir içerik eklendi.",
            icon: "./assets/favicon.png",
            tag: tag || "duluk-hub"
        });
    } catch (_) {}
}

export function renderNotificationButton(container) {
    if (!("Notification" in window)) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-ghost btn-sm";
    btn.id = "notifToggle";

    updateNotifButton(btn);

    btn.addEventListener("click", async () => {
        if (isNotificationGranted()) {
            toast("Bildirimler zaten açık. Kapatmak için tarayıcı ayarlarını kullanın.", "info");
        } else {
            await requestNotificationPermission();
        }
        updateNotifButton(btn);
    });

    container.appendChild(btn);
}

function updateNotifButton(btn) {
    if (isNotificationGranted()) {
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg> Bildirimler Açık';
    } else {
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/><line x1="1" y1="1" x2="23" y2="23"/></svg> Bildirimleri Aç';
    }
}
