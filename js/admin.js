/* ============================================================
   Dülük Hub — admin.js
   Yönetim paneli: analiz dashboard'u.
   Ayrı sayfa olarak çalışır (admin.html).
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import {
    getFirestore, collection, getDocs, query, orderBy, limit
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

const ADMIN_CODE = "355334";
const ADMIN_SESSION_KEY = "dulukhub-admin-panel";

const firebaseConfig = {
    apiKey: "AIzaSyDH_hZKMLL8vqM1ee_UGCo68Sr1TDQHlE4",
    authDomain: "dulukhub.firebaseapp.com",
    databaseURL: "https://dulukhub-default-rtdb.firebaseio.com",
    projectId: "dulukhub",
    storageBucket: "dulukhub.firebasestorage.app",
    messagingSenderId: "249826345730",
    appId: "1:249826345730:web:ac33bcc750260b3734781b",
    measurementId: "G-Z5DY8Y9SNY"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* ---------- DOM ---------- */

const $ = (sel) => document.querySelector(sel);

/* ---------- Login ---------- */

function initLogin() {
    localStorage.removeItem(ADMIN_SESSION_KEY);

    const btn = $("#loginBtn");
    const input = $("#adminCode");
    const error = $("#adminError");

    const verify = () => {
        if (input.value.trim() !== ADMIN_CODE) {
            error.textContent = "Kod hatalı.";
            error.hidden = false;
            return;
        }
        localStorage.setItem(ADMIN_SESSION_KEY, "1");
        showDashboard();
    };

    btn.addEventListener("click", verify);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") verify(); });
    input.focus();
}

function showDashboard() {
    $("#loginScreen").hidden = true;
    $("#dashboard").hidden = false;
    loadDashboard();
    $("#refreshBtn").addEventListener("click", loadDashboard);
    $("#logoutBtn").addEventListener("click", () => {
        localStorage.removeItem(ADMIN_SESSION_KEY);
        location.reload();
    });
}

/* ---------- Dashboard ---------- */

function fmtDate(iso) {
    if (!iso) return "-";
    const d = new Date(iso);
    if (isNaN(d)) return "-";
    const pad = (n) => String(n).padStart(2, "0");
    return d.getDate() + " " + ["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"][d.getMonth()] + " " + d.getFullYear() + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
}

function timeAgo(iso) {
    if (!iso) return "Hiç";
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 0) return "Şimdi";
    if (diff < 60000) return Math.floor(diff / 1000) + " sn önce";
    if (diff < 3600000) return Math.floor(diff / 60000) + " dk önce";
    if (diff < 86400000) return Math.floor(diff / 3600000) + " saat önce";
    return Math.floor(diff / 86400000) + " gün önce";
}

async function safeGetDocs(queryOrCollection) {
    try {
        return await getDocs(queryOrCollection);
    } catch (e) {
        console.warn("Firestore okuma hatası:", e.message);
        return { docs: [] };
    }
}

async function loadDashboard() {
    $("#statUsers").textContent = "...";
    $("#statActive").textContent = "...";
    $("#statPosts").textContent = "...";
    $("#statClicks").textContent = "...";

    const [usersSnap, postsSnap, analyticsSnap] = await Promise.all([
        safeGetDocs(collection(db, "users")),
        safeGetDocs(collection(db, "posts")),
        safeGetDocs(query(collection(db, "analytics"), orderBy("timestamp", "desc"), limit(200)))
    ]);

    const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const posts = postsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const events = analyticsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const now = Date.now();
    const fiveMinAgo = now - 5 * 60 * 1000;
    const activeUsers = users.filter(u => u.lastSeen && new Date(u.lastSeen).getTime() > fiveMinAgo);

    $("#statUsers").textContent = users.length;
    $("#statActive").textContent = activeUsers.length;
    $("#statPosts").textContent = posts.length;
    $("#statClicks").textContent = events.filter(e => e.type === "click").length;

    renderTopNews(posts);
    renderUsers(users);
    renderActivity(events, users);
}

function renderTopNews(posts) {
    const el = $("#topNews");
    const sorted = posts
        .filter(p => p.published !== false)
        .sort((a, b) => (b.clicks || 0) - (a.clicks || 0))
        .slice(0, 10);

    if (!sorted.length) {
        el.innerHTML = '<div class="dash-empty">Henüz haber yok.</div>';
        return;
    }

    el.innerHTML = sorted.map((p, i) => {
        const clicks = p.clicks || 0;
        return '<div class="dash-list-item">' +
            '<div class="item-info">' +
            '<div class="item-title">' + (i + 1) + ". " + esc(p.title) + '</div>' +
            '<div class="item-sub">' + fmtDate(p.date) + '</div>' +
            '</div>' +
            '<span class="item-badge">' + clicks + ' tıklanma</span>' +
            '</div>';
    }).join("");
}

function renderUsers(users) {
    const el = $("#userList");
    const sorted = users.sort((a, b) => {
        const aT = a.lastSeen ? new Date(a.lastSeen).getTime() : 0;
        const bT = b.lastSeen ? new Date(b.lastSeen).getTime() : 0;
        return bT - aT;
    });

    if (!sorted.length) {
        el.innerHTML = '<div class="dash-empty">Kayıtlı kullanıcı yok.</div>';
        return;
    }

    const now = Date.now();
    const fiveMinAgo = now - 5 * 60 * 1000;

    el.innerHTML = sorted.slice(0, 20).map(u => {
        const isActive = u.lastSeen && new Date(u.lastSeen).getTime() > fiveMinAgo;
        const badge = isActive
            ? '<span class="item-badge active">Aktif</span>'
            : '<span class="item-badge">' + timeAgo(u.lastSeen) + '</span>';
        return '<div class="dash-list-item">' +
            '<div class="item-info">' +
            '<div class="item-title">' + esc(u.displayName || u.username || u.email || u.id) + '</div>' +
            '<div class="item-sub">' + esc(u.email || u.phone || "") + (u.role === "admin" ? ' · <span style="color:var(--color-primary)">Yönetici</span>' : "") + '</div>' +
            '</div>' +
            badge +
            '</div>';
    }).join("");
}

function renderActivity(events, users) {
    const el = $("#activityList");

    if (!events.length) {
        el.innerHTML = '<div class="dash-empty">Henüz aktivite yok.</div>';
        return;
    }

    el.innerHTML = events.slice(0, 30).map(e => {
        const user = users.find(u => u.id === e.userId);
        const name = user ? (user.displayName || user.username || user.email || user.id) : (e.userId || "Anonim");
        let action = "";
        let badge = "";

        if (e.type === "click") {
            action = "bir habere tıkladı";
            badge = '<span class="item-badge blue">Tıklama</span>';
        } else if (e.type === "view") {
            action = e.path + " sayfasını görüntüledi";
            badge = '<span class="item-badge teal">Görüntüleme</span>';
        } else {
            action = e.type;
            badge = '<span class="item-badge">' + e.type + '</span>';
        }

        return '<div class="dash-list-item">' +
            '<div class="item-info">' +
            '<div class="item-title">' + esc(name) + ' ' + action + '</div>' +
            '<div class="item-sub">' + timeAgo(e.timestamp?.toDate ? e.timestamp.toDate().toISOString() : (e.timestamp || "")) + '</div>' +
            '</div>' +
            badge +
            '</div>';
    }).join("");
}

function esc(str) {
    const d = document.createElement("div");
    d.textContent = str || "";
    return d.innerHTML;
}

/* ---------- Başlat ---------- */

initLogin();
