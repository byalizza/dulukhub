/* ============================================================
   Dülük Hub — admin.js
   Yönetim paneli: CRUD, kullanıcı yönetimi, şifre, analiz.
   Ayrı sayfa olarak çalışır (admin.html).
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getAuth, reauthenticateWithCredential, EmailAuthProvider, updatePassword } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import {
    getFirestore, collection, getDocs, getDoc, doc, deleteDoc,
    addDoc, updateDoc, setDoc,
    query, orderBy, limit, where, increment, serverTimestamp
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
const auth = getAuth(app);

const $ = (sel, ctx) => (ctx || document).querySelector(sel);
const $$ = (sel, ctx) => [...(ctx || document).querySelectorAll(sel)];

function esc(s) { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }

function fmtDate(iso) {
    if (!iso) return "-";
    const d = new Date(iso);
    if (isNaN(d)) return "-";
    const pad = n => String(n).padStart(2, "0");
    return d.getDate() + " " + ["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"][d.getMonth()] + " " + d.getFullYear() + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
}

function timeAgo(iso) {
    if (!iso) return "Hiç";
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 0) return "Şimdi";
    if (diff < 60000) return Math.floor(diff / 1000) + " sn";
    if (diff < 3600000) return Math.floor(diff / 60000) + " dk";
    if (diff < 86400000) return Math.floor(diff / 3600000) + " saat";
    return Math.floor(diff / 86400000) + " gün";
}

async function safeGet(q) {
    try { return await getDocs(q); } catch { return { docs: [] }; }
}

/* ---------- Cache ---------- */

let cachedUsers = [];
let cachedPosts = [];
let cachedAnalytics = [];
let cachedSocialClicks = {};
let activeContentTab = "posts";

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
    input.addEventListener("keydown", e => { if (e.key === "Enter") verify(); });
    input.focus();
}

function showDashboard() {
    $("#loginScreen").hidden = true;
    $("#dashboard").hidden = false;
    initTabs();
    loadDashboard();
    $("#refreshBtn").addEventListener("click", loadDashboard);
    $("#logoutBtn").addEventListener("click", () => {
        localStorage.removeItem(ADMIN_SESSION_KEY);
        location.reload();
    });
}

/* ---------- Tab Navigation ---------- */

function initTabs() {
    $$(".nav-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            $$(".nav-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            const tab = btn.dataset.tab;
            ["tabStats","tabUsers","tabContent","tabAdd","tabPassword"].forEach(id => {
                const el = $("#" + id);
                if (el) el.hidden = id !== "tab" + tab.charAt(0).toUpperCase() + tab.slice(1);
            });
            if (tab === "users") renderUserList();
            if (tab === "content") renderContentList();
            if (tab === "add") renderAddForms();
        });
    });

    $$(".content-tabs .chip").forEach(chip => {
        chip.addEventListener("click", () => {
            $$(".content-tabs .chip").forEach(c => c.classList.remove("active"));
            chip.classList.add("active");
            activeContentTab = chip.dataset.ctab;
            renderContentList();
        });
    });

    $("#pwForm").addEventListener("submit", handlePasswordChange);
}

/* ---------- Dashboard ---------- */

async function loadDashboard() {
    const statEls = ["statUsers","statActive","statPosts","statClicks","statSocial"];
    statEls.forEach(id => { const e = $("#" + id); if (e) e.textContent = "..."; });

    const [usersSnap, postsSnap, analyticsSnap, socialSnap] = await Promise.all([
        safeGet(collection(db, "users")),
        safeGet(collection(db, "posts")),
        safeGet(query(collection(db, "analytics"), orderBy("timestamp", "desc"), limit(300))),
        safeGet(collection(db, "socialClicks"))
    ]);

    cachedUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    cachedPosts = postsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    cachedAnalytics = analyticsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    cachedSocialClicks = {};
    socialSnap.docs.forEach(d => {
        const data = d.data();
        cachedSocialClicks[data.platform || d.id] = data.count || 0;
    });

    const now = Date.now();
    const fiveMinAgo = now - 5 * 60 * 1000;
    const activeUsers = cachedUsers.filter(u => u.lastSeen && new Date(u.lastSeen).getTime() > fiveMinAgo);
    const totalSocial = Object.values(cachedSocialClicks).reduce((a, b) => a + b, 0);

    $("#statUsers").textContent = cachedUsers.length;
    $("#statActive").textContent = activeUsers.length;
    $("#statPosts").textContent = cachedPosts.length;
    $("#statClicks").textContent = cachedAnalytics.filter(e => e.type === "click").length;
    $("#statSocial").textContent = totalSocial;

    renderTopNews();
    renderActivity();
}

function renderTopNews() {
    const el = $("#topNews");
    const sorted = cachedPosts
        .filter(p => p.published !== false)
        .sort((a, b) => (b.clicks || 0) - (a.clicks || 0))
        .slice(0, 10);

    if (!sorted.length) { el.innerHTML = '<div class="dash-empty">Henüz haber yok.</div>'; return; }

    el.innerHTML = sorted.map((p, i) =>
        '<div class="dash-list-item">' +
        '<div class="item-info">' +
        '<div class="item-title">' + (i + 1) + ". " + esc(p.title) + '</div>' +
        '<div class="item-sub">' + fmtDate(p.date) + '</div>' +
        '</div>' +
        '<span class="item-badge">' + (p.clicks || 0) + ' tıklanma</span>' +
        '</div>'
    ).join("");
}

function renderActivity() {
    const el = $("#activityList");
    if (!cachedAnalytics.length) { el.innerHTML = '<div class="dash-empty">Henüz aktivite yok.</div>'; return; }

    el.innerHTML = cachedAnalytics.slice(0, 30).map(e => {
        const user = cachedUsers.find(u => u.id === e.userId);
        const name = user ? (user.displayName || user.username || user.email || user.id) : (e.userId || "Anonim");
        let action = "", badge = "";

        if (e.type === "click") {
            const post = cachedPosts.find(p => p.id === e.newsId);
            action = '"' + esc(post ? post.title : e.newsId) + '" haberine tıkladı';
            badge = '<span class="item-badge blue">Tıklama</span>';
        } else if (e.type === "view") {
            action = esc(e.path || "") + " sayfasını görüntüledi";
            badge = '<span class="item-badge teal">Görüntüleme</span>';
        } else if (e.type === "social") {
            action = esc(e.platform || "") + " bağlantısına tıkladı";
            badge = '<span class="item-badge purple">Sosyal</span>';
        } else {
            action = esc(e.type);
            badge = '<span class="item-badge">' + esc(e.type) + '</span>';
        }

        const ts = e.timestamp?.toDate ? e.timestamp.toDate().toISOString() : (e.timestamp || "");
        return '<div class="dash-list-item">' +
            '<div class="item-info">' +
            '<div class="item-title">' + esc(name) + ' ' + action + '</div>' +
            '<div class="item-sub">' + timeAgo(ts) + '</div>' +
            '</div>' + badge + '</div>';
    }).join("");
}

/* ---------- Kullanıcı Listesi ---------- */

async function renderUserList() {
    const el = $("#userList");
    el.innerHTML = '<div class="dash-loading">Yükleniyor...</div>';

    if (!cachedUsers.length) {
        const snap = await safeGet(collection(db, "users"));
        cachedUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    const sorted = [...cachedUsers].sort((a, b) => {
        const aT = a.lastSeen ? new Date(a.lastSeen).getTime() : 0;
        const bT = b.lastSeen ? new Date(b.lastSeen).getTime() : 0;
        return bT - aT;
    });

    if (!sorted.length) { el.innerHTML = '<div class="dash-empty">Kayıtlı kullanıcı yok.</div>'; return; }

    const now = Date.now();
    const fiveMinAgo = now - 5 * 60 * 1000;

    el.innerHTML = sorted.map(u => {
        const isActive = u.lastSeen && new Date(u.lastSeen).getTime() > fiveMinAgo;
        const badge = isActive
            ? '<span class="item-badge active">Aktif</span>'
            : '<span class="item-badge">' + timeAgo(u.lastSeen) + '</span>';
        const role = u.role === "admin" ? ' <span style="color:var(--color-primary);font-weight:700">Yönetici</span>' : "";
        return '<div class="dash-list-item">' +
            '<div class="item-info">' +
            '<div class="item-title">' + esc(u.displayName || u.username || u.email || u.id) + role + '</div>' +
            '<div class="item-sub">' + esc(u.email || u.phone || u.id) + '</div>' +
            '</div>' +
            '<div style="display:flex;gap:8px;align-items:center">' +
            badge +
            (u.role !== "admin"
                ? '<button class="admin-btn-sm danger user-del-btn" data-uid="' + esc(u.id) + '">Sil</button>'
                : '') +
            '</div></div>';
    }).join("");

    $$(".user-del-btn", el).forEach(btn => {
        btn.addEventListener("click", () => deleteUser(btn.dataset.uid));
    });
}

async function deleteUser(uid) {
    if (!confirm("Bu kullanıcı kalıcı olarak silinsin mi?")) return;
    try {
        await deleteDoc(doc(db, "users", uid));
        cachedUsers = cachedUsers.filter(u => u.id !== uid);
        renderUserList();
        const e = $("#statUsers"); if (e) e.textContent = cachedUsers.length;
    } catch (err) {
        console.error("Kullanıcı silinemedi:", err);
        alert("Kullanıcı silinemedi: " + err.message);
    }
}

/* ---------- İçerik Listesi ---------- */

async function renderContentList() {
    const el = $("#contentList");
    el.innerHTML = '<div class="dash-loading">Yükleniyor...</div>';

    const collections = {
        posts: "Haberler",
        announcements: "Duyurular",
        events: "Etkinlikler",
        giveaways: "Çekilişler",
        stories: "Hikâyeler",
        heritage: "Tarihi Eserler",
        photos: "Fotoğraflar"
    };

    const col = activeContentTab;
    const snap = await safeGet(collection(db, col));
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (!items.length) {
        el.innerHTML = '<div class="dash-empty">Bu kategoride içerik yok.</div>';
        return;
    }

    el.innerHTML = items.map(item => {
        const title = item.title || item.name || item.id;
        const date = item.date || item.createdAt || item.endDate || "";
        const dateStr = fmtDate(date);
        let extra = "";
        if (col === "posts" && item.clicks) extra = " · " + item.clicks + " tıklanma";
        if (col === "giveaways" && item.participants) extra = " · " + item.participants + " katılımcı";
        return '<div class="dash-list-item">' +
            '<div class="item-info">' +
            '<div class="item-title">' + esc(title) + '</div>' +
            '<div class="item-sub">' + dateStr + extra + '</div>' +
            '</div>' +
            '<button class="admin-btn-sm danger content-del-btn" data-col="' + col + '" data-id="' + esc(item.id) + '">Sil</button>' +
            '</div>';
    }).join("");

    $$(".content-del-btn", el).forEach(btn => {
        btn.addEventListener("click", () => deleteContent(btn.dataset.col, btn.dataset.id));
    });
}

async function deleteContent(col, id) {
    if (!confirm("Bu içerik kalıcı olarak silinsin mi?")) return;
    try {
        await deleteDoc(doc(db, col, id));
        renderContentList();
    } catch (err) {
        console.error("İçerik silinemedi:", err);
        alert("İçerik silinemedi: " + err.message);
    }
}

/* ---------- İçerik Ekleme Formları ---------- */

function renderAddForms() {
    const el = $("#addForms");
    el.innerHTML = `
        <div class="dash-grid">
            <section class="dash-section">
                <h2>Haber Ekle</h2>
                <form id="addPost" class="add-form" novalidate>
                    <div class="fg"><label>Başlık *</label><input name="title" class="admin-input" required maxlength="150"></div>
                    <div class="fg"><label>Kısa açıklama</label><textarea name="description" class="admin-input" maxlength="500"></textarea></div>
                    <div class="fg"><label>Tarih (boşsa şimdi)</label><input name="date" class="admin-input" type="datetime-local"></div>
                    <div class="fg"><label>Görsel URL</label><input name="imageUrl" class="admin-input" type="url" placeholder="https://..."></div>
                    <div class="fg"><label>İçerik (her satır paragraf)</label><textarea name="content" class="admin-input" maxlength="8000" rows="4"></textarea></div>
                    <button type="submit" class="admin-btn">Ekle</button>
                </form>
            </section>

            <section class="dash-section">
                <h2>Duyuru Ekle</h2>
                <form id="addAnnounce" class="add-form" novalidate>
                    <div class="fg"><label>Duyuru *</label><textarea name="title" class="admin-input" maxlength="300" required></textarea></div>
                    <div class="fg"><label style="display:flex;gap:8px;align-items:center"><input name="important" type="checkbox" style="width:18px;height:18px"> Önemli duyuru</label></div>
                    <button type="submit" class="admin-btn">Yayınla</button>
                </form>
            </section>

            <section class="dash-section">
                <h2>Etkinlik Ekle</h2>
                <form id="addEvent" class="add-form" novalidate>
                    <div class="fg"><label>Etkinlik adı *</label><input name="title" class="admin-input" required maxlength="150"></div>
                    <div class="fg"><label>Tarih *</label><input name="date" class="admin-input" type="date" required></div>
                    <div class="fg"><label>Saat</label><input name="time" class="admin-input" type="time"></div>
                    <div class="fg"><label>Konum</label><input name="location" class="admin-input" maxlength="120"></div>
                    <div class="fg"><label>Açıklama</label><textarea name="description" class="admin-input" maxlength="1500"></textarea></div>
                    <button type="submit" class="admin-btn">Ekle</button>
                </form>
            </section>

            <section class="dash-section">
                <h2>Çekiliş Ekle</h2>
                <form id="addGiveaway" class="add-form" novalidate>
                    <div class="fg"><label>Çekiliş adı *</label><input name="title" class="admin-input" required maxlength="120"></div>
                    <div class="fg"><label>Ödül *</label><input name="prize" class="admin-input" required maxlength="120"></div>
                    <div class="fg"><label>Açıklama</label><textarea name="description" class="admin-input" maxlength="600"></textarea></div>
                    <div class="fg"><label>Başlangıç</label><input name="startDate" class="admin-input" type="datetime-local"></div>
                    <div class="fg"><label>Bitiş *</label><input name="endDate" class="admin-input" type="datetime-local" required></div>
                    <div class="fg"><label>Katılım hedefi</label><input name="target" class="admin-input" type="number" min="1" value="50"></div>
                    <button type="submit" class="admin-btn">Ekle</button>
                </form>
            </section>

            <section class="dash-section">
                <h2>Hikâye Ekle</h2>
                <form id="addStory" class="add-form" novalidate>
                    <div class="fg"><label>Başlık *</label><input name="title" class="admin-input" required maxlength="120"></div>
                    <div class="fg"><label>Hikâye *</label><textarea name="content" class="admin-input" maxlength="2000" required rows="4"></textarea></div>
                    <div class="fg"><label>Anlatan</label><input name="author" class="admin-input" maxlength="60"></div>
                    <button type="submit" class="admin-btn">Ekle</button>
                </form>
            </section>

            <section class="dash-section">
                <h2>Tarihi Eser Ekle</h2>
                <form id="addHeritage" class="add-form" novalidate>
                    <div class="fg"><label>Ad *</label><input name="title" class="admin-input" required maxlength="120"></div>
                    <div class="fg"><label>Dönem</label><input name="era" class="admin-input" maxlength="60" placeholder="ör. Roma Dönemi"></div>
                    <div class="fg"><label>Görsel URL</label><input name="imageUrl" class="admin-input" type="url"></div>
                    <div class="fg"><label>Açıklama</label><textarea name="description" class="admin-input" maxlength="800"></textarea></div>
                    <button type="submit" class="admin-btn">Ekle</button>
                </form>
            </section>

            <section class="dash-section">
                <h2>Fotoğraf Ekle</h2>
                <form id="addPhoto" class="add-form" novalidate>
                    <div class="fg"><label>Başlık *</label><input name="title" class="admin-input" required maxlength="120"></div>
                    <div class="fg"><label>Açıklama</label><textarea name="description" class="admin-input" maxlength="300"></textarea></div>
                    <div class="fg"><label>Fotoğraf URL *</label><input name="imageUrl" class="admin-input" type="url" required></div>
                    <button type="submit" class="admin-btn">Ekle</button>
                </form>
            </section>
        </div>
    `;

    $$(".add-form", el).forEach(form => {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            btn.disabled = true;
            try {
                await handleAddSubmit(form.id, new FormData(form));
                form.reset();
            } catch (err) {
                alert("Hata: " + err.message);
            }
            btn.disabled = false;
        });
    });
}

async function handleAddSubmit(formId, fd) {
    const now = new Date().toISOString();

    if (formId === "addPost") {
        const title = fd.get("title")?.trim();
        if (!title) throw new Error("Başlık gerekli");
        await addDoc(collection(db, "posts"), {
            title,
            description: fd.get("description")?.trim() || "",
            category: "Güncel",
            imageUrl: fd.get("imageUrl")?.trim() || "",
            content: (fd.get("content") || "").split("\n").map(l => l.trim()).filter(Boolean),
            published: true,
            clicks: 0,
            date: fd.get("date") ? new Date(fd.get("date")).toISOString() : now,
            createdAt: now
        });
    } else if (formId === "addAnnounce") {
        const title = fd.get("title")?.trim();
        if (!title) throw new Error("Duyuru gerekli");
        await addDoc(collection(db, "announcements"), {
            title,
            important: fd.get("important") === "on",
            date: now,
            createdAt: now
        });
    } else if (formId === "addEvent") {
        const title = fd.get("title")?.trim();
        const date = fd.get("date");
        if (!title) throw new Error("Etkinlik adı gerekli");
        if (!date) throw new Error("Tarih gerekli");
        await addDoc(collection(db, "events"), {
            title,
            date,
            time: fd.get("time") || "",
            location: fd.get("location")?.trim() || "",
            description: fd.get("description")?.trim() || "",
            createdAt: now
        });
    } else if (formId === "addGiveaway") {
        const title = fd.get("title")?.trim();
        const prize = fd.get("prize")?.trim();
        const end = fd.get("endDate");
        if (!title) throw new Error("Çekiliş adı gerekli");
        if (!prize) throw new Error("Ödül gerekli");
        if (!end) throw new Error("Bitiş tarihi gerekli");
        await addDoc(collection(db, "giveaways"), {
            title,
            prize,
            description: fd.get("description")?.trim() || "",
            startDate: fd.get("startDate") ? new Date(fd.get("startDate")).toISOString() : "",
            endDate: new Date(end).toISOString(),
            target: Number(fd.get("target")) || 50,
            participants: 0,
            createdAt: now
        });
    } else if (formId === "addStory") {
        const title = fd.get("title")?.trim();
        const content = fd.get("content")?.trim();
        if (!title) throw new Error("Başlık gerekli");
        if (!content) throw new Error("Hikâye gerekli");
        await addDoc(collection(db, "stories"), {
            title,
            content,
            author: fd.get("author")?.trim() || "",
            likes: 0,
            date: now,
            createdAt: now
        });
    } else if (formId === "addHeritage") {
        const title = fd.get("title")?.trim();
        if (!title) throw new Error("Ad gerekli");
        await addDoc(collection(db, "heritage"), {
            title,
            era: fd.get("era")?.trim() || "",
            description: fd.get("description")?.trim() || "",
            imageUrl: fd.get("imageUrl")?.trim() || "",
            date: now,
            createdAt: now
        });
    } else if (formId === "addPhoto") {
        const title = fd.get("title")?.trim();
        const imageUrl = fd.get("imageUrl")?.trim();
        if (!title) throw new Error("Başlık gerekli");
        if (!imageUrl) throw new Error("Fotoğraf URL gerekli");
        await addDoc(collection(db, "photos"), {
            title,
            description: fd.get("description")?.trim() || "",
            imageUrl,
            thumbnailUrl: imageUrl,
            date: now,
            createdAt: now
        });
    }
}

/* ---------- Şifre Değiştir ---------- */

async function handlePasswordChange(e) {
    e.preventDefault();
    const oldPw = $("#pwOld").value;
    const newPw = $("#pwNew").value;
    const repeat = $("#pwRepeat").value;
    const errEl = $("#pwError");
    const okEl = $("#pwSuccess");

    errEl.hidden = true;
    okEl.hidden = true;

    if (!oldPw || !newPw) { errEl.textContent = "Tüm alanları doldurun."; errEl.hidden = false; return; }
    if (newPw.length < 6) { errEl.textContent = "Yeni şifre en az 6 karakter olmalı."; errEl.hidden = false; return; }
    if (newPw !== repeat) { errEl.textContent = "Yeni şifreler eşleşmiyor."; errEl.hidden = false; return; }

    const user = auth.currentUser;
    if (!user) { errEl.textContent = "Giriş yapılmamış."; errEl.hidden = false; return; }

    try {
        const cred = EmailAuthProvider.credential(user.email, oldPw);
        await reauthenticateWithCredential(user, cred);
        await updatePassword(user, newPw);
        okEl.textContent = "Şifre başarıyla değiştirildi.";
        okEl.hidden = false;
        $("#pwForm").reset();
    } catch (err) {
        console.error("Şifre değiştirme hatası:", err);
        if (err.code === "auth/wrong-password") errEl.textContent = "Mevcut şifre hatalı.";
        else if (err.code === "auth/weak-password") errEl.textContent = "Yeni şifre çok zayıf.";
        else if (err.code === "auth/requires-recent-login") errEl.textContent = "Güvenlik için lütfen çıkış yapıp tekrar giriş yapın.";
        else errEl.textContent = "Şifre değiştirilemedi: " + (err.message || "Bilinmeyen hata");
        errEl.hidden = false;
    }
}

/* ---------- Başlat ---------- */

initLogin();
