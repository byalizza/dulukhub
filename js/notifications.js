/* ============================================================
   Dülük Hub — notifications.js
   Web push bildirimleri: izin isteme, abone olma, bildirim gönderme.
   ============================================================ */

import { $, toast } from "./app.js";
import { auth, db, isLive } from "./firebase.js";
import {
    collection, query, orderBy, limit, getDocs, addDoc,
    serverTimestamp, doc, setDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

const VAPID_KEY = "BEl62iUYgUivxVkvSDZe9TRz5OQYP1MPFbLFVPAfH4tCK2kHjKEV8YRBJsT6vJFR3kGJFNJv2cQV8YRq_Y0z2QwY";

let swRegistration = null;

export async function initNotifications() {
    if (!("serviceWorker" in navigator) || !("Notification" in window)) return;

    try {
        swRegistration = await navigator.serviceWorker.register("./sw.js");
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

export async function subscribeToPush() {
    if (!swRegistration) return null;
    try {
        const sub = await swRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_KEY)
        });
        return sub.toJSON();
    } catch (err) {
        console.warn("Push aboneliği oluşturulamadı:", err);
        return null;
    }
}

export async function saveSubscription() {
    const user = auth.currentUser;
    if (!user) return;

    const granted = await requestNotificationPermission();
    if (!granted) return;

    const sub = await subscribeToPush();
    if (!sub) return;

    if (await isLive()) {
        await setDoc(doc(db, "pushSubscriptions", user.uid), {
            uid: user.uid,
            subscription: sub,
            createdAt: serverTimestamp()
        });
    } else {
        const local = JSON.parse(localStorage.getItem("dulukhub-push-subs") || "{}");
        local[user.uid] = sub;
        localStorage.setItem("dulukhub-push-subs", JSON.stringify(local));
    }

    toast("Bildirimler başarıyla açıldı!", "success");
}

export async function isSubscribed() {
    if (!swRegistration) return false;
    try {
        const sub = await swRegistration.pushManager.getSubscription();
        return !!sub;
    } catch (_) {
        return false;
    }
}

export async function unsubscribePush() {
    if (!swRegistration) return;
    try {
        const sub = await swRegistration.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();

        const user = auth.currentUser;
        if (user) {
            if (await isLive()) {
                const { deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js");
                await deleteDoc(doc(db, "pushSubscriptions", user.uid));
            } else {
                const local = JSON.parse(localStorage.getItem("dulukhub-push-subs") || "{}");
                delete local[user.uid];
                localStorage.setItem("dulukhub-push-subs", JSON.stringify(local));
            }
        }
        toast("Bildirimler kapatıldı.", "success");
    } catch (err) {
        console.warn("Push aboneliği kaldırılamadı:", err);
    }
}

/* ---------- Yeni içerik bildirimi (admin panelinden tetiklenir) ---------- */

export async function sendNotificationToAll(title, body, tag) {
    if (await isLive()) {
        const snap = await getDocs(query(collection(db, "pushSubscriptions"), limit(500)));
        const promises = snap.docs.map((d) => {
            const subData = d.data().subscription;
            if (!subData || !subData.endpoint) return Promise.resolve();
            return fetch(subData.endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: title || "Dülük Köyü",
                    body: body || "Yeni bir içerik eklendi.",
                    tag: tag || "duluk-hub"
                })
            }).catch(() => {});
        });
        await Promise.allSettled(promises);
    }

    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title || "Dülük Köyü", {
            body: body || "Yeni bir içerik eklendi.",
            icon: "./assets/favicon.png",
            tag: tag || "duluk-hub"
        });
    }
}

/* ---------- UI: bildirim açma/kapatma butonu ---------- */

export function renderNotificationButton(container) {
    if (!("Notification" in window)) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-ghost btn-sm";
    btn.id = "notifToggle";

    updateNotifButton(btn);

    btn.addEventListener("click", async () => {
        const sub = await isSubscribed();
        if (sub) {
            await unsubscribePush();
        } else {
            await saveSubscription();
        }
        updateNotifButton(btn);
    });

    container.appendChild(btn);
}

function updateNotifButton(btn) {
    isSubscribed().then((sub) => {
        if (sub) {
            btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg> Bildirimler Açık';
        } else {
            btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/><line x1="1" y1="1" x2="23" y2="23"/></svg> Bildirimleri Aç';
        }
    });
}

/* ---------- Yardımcı ---------- */

function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
}
