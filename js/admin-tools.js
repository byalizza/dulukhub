/* ============================================================
   Dülük Hub — admin-tools.js
   Bekleyen içerik onay ekranı:
   Tarihi eserler -> Köy Hikayesi adayları listelenir,
   kullanıcı tek tek veya tümünü onaylar; istenmeyenleri siler.
   "Panele Dön" oturumu kapatmaz, sadece panel sayfasına gider.
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDH_hZKMLL8vqM1ee_UGCo68Sr1TDQHlE4",
    authDomain: "dulukhub.firebaseapp.com",
    projectId: "dulukhub",
    storageBucket: "dulukhub.firebasestorage.app",
    messagingSenderId: "249826345730",
    appId: "1:249826345730:web:ac33bcc750260b3734781b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const pendingList = $("#pendingList");
const statusEl = $("#status");
const countInfo = $("#countInfo");
const approveAllBtn = $("#approveAllBtn");
const backBtn = $("#backBtn");

const log = (cls, msg) => statusEl.insertAdjacentHTML("beforeend", '<div class="' + cls + '">' + msg + "</div>");

let pending = [];
let approved = new Set();
let skipped = new Set();

onAuthStateChanged(auth, (user) => {
    if (user) {
        $("#authInfo").textContent = "Giriş: " + (user.email || user.uid) + " — bekleyen içerikler yükleniyor...";
        loadPending();
    } else {
        $("#authInfo").innerHTML = '<span class="err">Giriş yapılmamış. Önce ana siteden giriş yapın.</span>';
        approveAllBtn.disabled = true;
    }
});

async function loadPending() {
    try {
        const heritageSnap = await getDocs(collection(db, "heritage"));
        const storySnap = await getDocs(collection(db, "stories"));

        const storyTitles = new Set(
            storySnap.docs.map((d) => (d.data().title || "").trim().toLowerCase())
        );

        pending = heritageSnap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((h) => h.title && !storyTitles.has(h.title.trim().toLowerCase()))
            .sort((a, b) => (a.date || "").localeCompare(b.date || ""));

        renderList();
    } catch (err) {
        log("err", "Bekleyenler yüklenemedi: " + esc(err.message));
    }
}

function renderList() {
    countInfo.textContent = pending.length + " bekleyen içerik";

    if (!pending.length) {
        pendingList.innerHTML = '<div class="empty">Bekleyen içerik yok. Tüm tarihi eserler hikaye olarak eklenmiş.</div>';
        approveAllBtn.disabled = true;
        return;
    }

    pendingList.innerHTML = pending.map((h, i) => {
        const isApproved = approved.has(h.id);
        const isSkipped = skipped.has(h.id);
        const state = isApproved
            ? '<span class="done">Onaylandı</span>'
            : isSkipped
                ? '<span class="skip">Atlandı</span>'
                : "";

        return (
            '<div class="item">' +
            '<div class="meta">' +
            '<span class="badge badge-cat">Tarihi Eser → Hikaye</span>' +
            '<span class="badge badge-date">' + esc(h.era || h.date || "") + "</span>" +
            state +
            "</div>" +
            "<h3>" + esc(h.title) + "</h3>" +
            "<p>" + esc(h.description || "") + "</p>" +
            '<div class="item-actions">' +
            '<button type="button" class="small" data-approve="' + i + '"' + (isApproved || isSkipped ? " disabled" : "") + ">Onayla</button>" +
            '<button type="button" class="small secondary" data-skip="' + i + '"' + (isApproved || isSkipped ? " disabled" : "") + ">Atla</button>" +
            '<button type="button" class="small danger" data-del="' + i + '"' + (isApproved ? " disabled" : "") + ">Sil</button>" +
            "</div></div>"
        );
    }).join("");

    $$("#pendingList [data-approve]").forEach((btn) => {
        btn.addEventListener("click", () => approveOne(Number(btn.dataset.approve)));
    });
    $$("#pendingList [data-skip]").forEach((btn) => {
        btn.addEventListener("click", () => skipOne(Number(btn.dataset.skip)));
    });
    $$("#pendingList [data-del]").forEach((btn) => {
        btn.addEventListener("click", () => deleteOne(Number(btn.dataset.del)));
    });
}

async function approveOne(i) {
    const h = pending[i];
    if (!h || approved.has(h.id)) return;

    try {
        await addDoc(collection(db, "stories"), {
            title: h.title,
            content: (h.era ? h.era + ". " : "") + (h.description || ""),
            author: "Dülük Hub",
            likes: 0,
            date: h.date || new Date().toISOString(),
            createdAt: new Date().toISOString()
        });
        approved.add(h.id);
        log("ok", "Onaylandı: " + esc(h.title));
    } catch (err) {
        log("err", "Onaylanamadı: " + esc(h.title) + " — " + esc(err.message));
    }
    renderList();
}

function skipOne(i) {
    const h = pending[i];
    if (!h) return;
    skipped.add(h.id);
    log("info", "Atlandı: " + esc(h.title));
    renderList();
}

async function deleteOne(i) {
    const h = pending[i];
    if (!h) return;
    if (!confirm('"' + h.title + '" tamamen silinsin mi?')) return;

    try {
        await deleteDoc(doc(db, "heritage", h.id));
        pending = pending.filter((x) => x.id !== h.id);
        log("ok", "Silindi: " + esc(h.title));
    } catch (err) {
        log("err", "Silinemedi: " + esc(h.title) + " — " + esc(err.message));
    }
    renderList();
}

$("#deleteAllBtn").addEventListener("click", async () => {
    if (!pending.length) return;
    if (!confirm(pending.length + " bekleyen eser TAMAMEN silinsin mi? Bu geri alınamaz!")) return;

    $("#deleteAllBtn").disabled = true;
    let ok = 0, fail = 0;

    for (const h of [...pending]) {
        try {
            await deleteDoc(doc(db, "heritage", h.id));
            ok++;
        } catch (err) {
            fail++;
            log("err", "Silinemedi: " + esc(h.title) + " — " + esc(err.message));
        }
    }

    log("info", "Sonuç: " + ok + " silindi, " + fail + " hata.");
    pending = [];
    $("#deleteAllBtn").disabled = false;
    renderList();
});

approveAllBtn.addEventListener("click", async () => {
    approveAllBtn.disabled = true;
    let ok = 0, fail = 0;

    for (let i = 0; i < pending.length; i++) {
        const h = pending[i];
        if (approved.has(h.id) || skipped.has(h.id)) continue;
        try {
            await addDoc(collection(db, "stories"), {
                title: h.title,
                content: (h.era ? h.era + ". " : "") + (h.description || ""),
                author: "Dülük Hub",
                likes: 0,
                date: h.date || new Date().toISOString(),
                createdAt: new Date().toISOString()
            });
            approved.add(h.id);
            ok++;
        } catch (err) {
            fail++;
            log("err", "Onaylanamadı: " + esc(h.title) + " — " + esc(err.message));
        }
    }

    log("info", "Tümünü onayla bitti: " + ok + " eklendi, " + fail + " hata.");
    approveAllBtn.disabled = false;
    renderList();
});

/* ===== Yanlışlıkla eklenen konser hikayelerini temizle ===== */

$("#cleanupBtn").addEventListener("click", async () => {
    $("#cleanupBtn").disabled = true;
    statusEl.innerHTML = "";
    const concertTitles = [
        "blok3", "golden swan", "gastroantep", "fettah", "halil sezai", "leman sam",
        "cepkin", "melek mosso", "sagopa", "candles", "katarsis"
    ];
    try {
        const snap = await getDocs(collection(db, "stories"));
        let removed = 0;
        for (const d of snap.docs) {
            const t = (d.data().title || "").trim().toLowerCase();
            if (concertTitles.some((k) => t.includes(k))) {
                await deleteDoc(doc(db, "stories", d.id));
                removed++;
                log("ok", "Silindi: " + esc(d.data().title));
            }
        }
        log("info", removed + " konser hikayesi silindi.");
    } catch (err) {
        log("err", "Hata: " + esc(err.message));
    }
    $("#cleanupBtn").disabled = false;
});

/* ===== Panele dön: oturumu KAPATMAZ ===== */

backBtn.addEventListener("click", () => {
    location.href = "./admin.html";
});

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return [...document.querySelectorAll(sel)]; }
function esc(s) {
    const d = document.createElement("div");
    d.textContent = s || "";
    return d.innerHTML;
}