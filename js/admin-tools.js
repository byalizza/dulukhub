/* ============================================================
   Dülük Hub — admin-tools.js
   Tarihi eserleri Köy Hikayeleri'ne kopyalar (kopya korumalı).
   Çıkış butonu oturumu kapatmaz, panelden geri döner.
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

const statusEl = $("#status");
const authInfo = $("#authInfo");
const log = (cls, msg) => statusEl.insertAdjacentHTML("beforeend", '<div class="' + cls + '">' + msg + "</div>");

onAuthStateChanged(auth, (user) => {
    if (user) {
        authInfo.textContent = "Giriş: " + (user.email || user.uid);
    } else {
        authInfo.innerHTML = '<span class="err">Giriş yapılmamış. Önce ana siteden giriş yapın.</span>';
        document.querySelectorAll("button").forEach((b) => (b.disabled = true));
    }
});

function collectBy(collectionName, field) {
    return getDocs(collection(db, collectionName)).then((snap) => {
        const map = {};
        snap.docs.forEach((d) => {
            const key = (d.data()[field] || "").trim().toLowerCase();
            (map[key] = map[key] || []).push({ id: d.id, data: d.data() });
        });
        return map;
    });
}

async function dedupe(colName, byTitle) {
    let removed = 0;
    for (const t in byTitle) {
        const list = byTitle[t];
        if (list.length > 1) {
            for (const x of list.slice(1)) {
                try {
                    await deleteDoc(doc(db, colName, x.id));
                    removed++;
                } catch (e) {
                    log("err", "Kopya silinemedi: " + esc(e.message));
                }
            }
        }
    }
    return removed;
}

/* ===== Konser hikayelerini temizle (yanlışlıkla eklenenler) ===== */

$("#cleanupBtn").addEventListener("click", async () => {
    statusEl.innerHTML = "";
    try {
        let removed = 0;
        const snap = await getDocs(collection(db, "stories"));
        for (const d of snap.docs) {
            const title = (d.data().title || "").trim().toLowerCase();
            if (title.includes("konser") || title.includes("cepkin") || title.includes("mosso") ||
                title.includes("sagopa") || title.includes("sezai") || title.includes("leman") ||
                title.includes("fettah") || title.includes("blok3") || title.includes("golden swan") ||
                title.includes("gastroantep") || title.includes("katarsis") || title.includes("candles")) {
                await deleteDoc(doc(db, "stories", d.id));
                removed++;
                log("ok", "✘ Silindi: " + esc(d.data().title));
            }
        }
        log("info", removed + " konser hikayesi silindi.");
    } catch (err) {
        log("err", "Hata: " + esc(err.message));
    }
});

/* ===== Tarihi eserleri hikayeye çevir ===== */

$("#storyBtn").addEventListener("click", async () => {
    statusEl.innerHTML = "";
    try {
        const heritageMap = await collectBy("heritage", "title");
        const storyMap = await collectBy("stories", "title");

        const dupRemoved = await dedupe("stories", storyMap);
        log("info", dupRemoved + " kopya hikaye silindi.");

        let added = 0, skipped = 0;
        for (const title in heritageMap) {
            if (storyMap[title]) {
                skipped++;
                log("info", "↷ " + esc(heritageMap[title][0].data.title) + " hikayesi zaten var, atlandı.");
                continue;
            }
            const h = heritageMap[title][0].data;
            await addDoc(collection(db, "stories"), {
                title: h.title,
                content: (h.era ? h.era + ". " : "") + (h.description || ""),
                author: "Dülük Hub",
                likes: 0,
                date: h.date || new Date().toISOString(),
                createdAt: new Date().toISOString()
            });
            added++;
            log("ok", "✔ " + esc(h.title) + " hikayesi eklendi.");
        }
        log("info", "Sonuç: " + added + " eklendi, " + skipped + " zaten vardı.");
    } catch (err) {
        log("err", "Hata: " + esc(err.message));
    }
});

/* ===== Çıkış: sadece panele dön, oturumu kapatma ===== */

$("#backBtn").addEventListener("click", () => {
    location.href = "./admin.html";
});

function $(sel) { return document.querySelector(sel); }

function esc(s) {
    const d = document.createElement("div");
    d.textContent = s || "";
    return d.innerHTML;
}