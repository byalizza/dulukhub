/* ============================================================
   Dülük Hub — analytics.js
   Basit analiz: haber tıklama sayacı, son giriş zamanı,
   sayfa görüntüleme kayıtları.
   ============================================================ */

import { db, isLive } from "./firebase.js";
import {
    collection, doc, updateDoc, increment,
    addDoc, serverTimestamp, query, orderBy, limit, getDocs,
    where, Timestamp
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

const LOCAL_ANALYTICS_KEY = "dulukhub-analytics";
const SESSION_KEY = "dulukhub-session";

/* ---------- Yerel yedek ---------- */

function readLocal() {
    try { return JSON.parse(localStorage.getItem(LOCAL_ANALYTICS_KEY)) || { clicks: {}, views: [] }; }
    catch { return { clicks: {}, views: [] }; }
}

function writeLocal(data) {
    try { localStorage.setItem(LOCAL_ANALYTICS_KEY, JSON.stringify(data)); }
    catch (e) { console.warn("Analytics yerel yazılamadı:", e); }
}

/* ---------- Haber tıklama ---------- */

export async function trackNewsClick(newsId, userId) {
    if (!newsId) return;
    try {
        if (await isLive()) {
            const ref = doc(db, "posts", newsId);
            await updateDoc(ref, { clicks: increment(1) }).catch(() => {});
            await addDoc(collection(db, "analytics"), {
                type: "click",
                newsId,
                userId: userId || "anon",
                timestamp: serverTimestamp()
            }).catch(() => {});
        } else {
            const local = readLocal();
            local.clicks[newsId] = (local.clicks[newsId] || 0) + 1;
            writeLocal(local);
        }
    } catch (e) {
        console.warn("Tıklama kaydedilemedi:", e);
    }
}

/* ---------- Sayfa görüntüleme ---------- */

export async function trackPageView(path, userId) {
    try {
        if (await isLive()) {
            await addDoc(collection(db, "analytics"), {
                type: "view",
                path,
                userId: userId || "anon",
                timestamp: serverTimestamp()
            }).catch(() => {});
        } else {
            const local = readLocal();
            local.views.push({ path, userId: userId || "anon", timestamp: Date.now() });
            if (local.views.length > 200) local.views = local.views.slice(-200);
            writeLocal(local);
        }
    } catch (e) {
        console.warn("Görüntüleme kaydedilemedi:", e);
    }
}

/* ---------- Son giriş zamanı (kullanıcı profiline yazar) ---------- */

export async function updateLastSeen(uid) {
    if (!uid) return;
    try {
        if (await isLive()) {
            const { setDoc } = await import("https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js");
            await setDoc(doc(db, "users", uid), { lastSeen: new Date().toISOString() }, { merge: true }).catch(() => {});
        }
    } catch (e) {
        console.warn("Son görülen güncellenemedi:", e);
    }
}

/* ---------- Sosyal medya tıklama ---------- */

export async function trackSocialClick(platform, userId) {
    if (!platform) return;
    try {
        if (await isLive()) {
            const ref = doc(db, "socialClicks", platform);
            await updateDoc(ref, { count: increment(1) }).catch(async () => {
                await addDoc(collection(db, "socialClicks"), {
                    platform,
                    count: 1,
                    timestamp: serverTimestamp()
                }).catch(() => {});
            });
            await addDoc(collection(db, "analytics"), {
                type: "social",
                platform,
                userId: userId || "anon",
                timestamp: serverTimestamp()
            }).catch(() => {});
        } else {
            const local = readLocal();
            local.socialClicks = local.socialClicks || {};
            local.socialClicks[platform] = (local.socialClicks[platform] || 0) + 1;
            writeLocal(local);
        }
    } catch (e) {
        console.warn("Sosyal medya tıklaması kaydedilemedi:", e);
    }
}

/* ---------- Admin paneli okuma fonksiyonları ---------- */

export async function getAnalyticsOverview() {
    if (!(await isLive())) {
        return { totalUsers: 0, totalPosts: 0, totalViews: 0, totalClicks: 0, activeUsers: [] };
    }

    try {
        const [usersSnap, postsSnap, analyticsSnap] = await Promise.all([
            getDocs(collection(db, "users")),
            getDocs(collection(db, "posts")),
            getDocs(query(collection(db, "analytics"), orderBy("timestamp", "desc"), limit(500)))
        ]);

        const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const posts = postsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const events = analyticsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const now = Date.now();
        const fiveMinAgo = now - 5 * 60 * 1000;
        const activeUsers = users.filter(u => {
            if (!u.lastSeen) return false;
            const lastSeen = new Date(u.lastSeen).getTime();
            return lastSeen > fiveMinAgo;
        });

        const newsClicks = {};
        events.filter(e => e.type === "click").forEach(e => {
            newsClicks[e.newsId] = (newsClicks[e.newsId] || 0) + 1;
        });

        return {
            totalUsers: users.length,
            totalPosts: posts.length,
            totalViews: events.filter(e => e.type === "view").length,
            totalClicks: events.filter(e => e.type === "click").length,
            activeUsers,
            users: users.sort((a, b) => {
                const aTime = a.lastSeen ? new Date(a.lastSeen).getTime() : 0;
                const bTime = b.lastSeen ? new Date(b.lastSeen).getTime() : 0;
                return bTime - aTime;
            }),
            posts: posts.map(p => ({
                id: p.id,
                title: p.title || "",
                clicks: p.clicks || 0,
                date: p.date || p.createdAt || "",
                published: p.published !== false
            })).sort((a, b) => (b.clicks || 0) - (a.clicks || 0)),
            newsClicks
        };
    } catch (e) {
        console.error("Analytics okunamadı:", e);
        return { totalUsers: 0, totalPosts: 0, totalViews: 0, totalClicks: 0, activeUsers: [], users: [], posts: [] };
    }
}
