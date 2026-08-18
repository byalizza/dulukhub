/* ============================================================
   Dülük Hub — admin-tools.js
   Etkinlikleri toplu olarak Firestore'a ekler.
   Kullanıcının mevcut admin oturumunu kullanır.
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

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

const events = [
    { title: "Blok3 Konseri", date: "2026-09-26", time: "", location: "GOPSM – Gaziantep Odeon Performans Sanatları Merkezi", description: "Blok3 konseri." },
    { title: "Candlelit Ballet: Golden Swan", date: "2026-09-27", time: "20:15", location: "Şehitkamil Kültür ve Kongre Merkezi", description: "Mum ışıkları eşliğinde bale gösterisi." },
    { title: "GastroANTEP Kültür Yolu Festivali", date: "2026-10-03", endDate: "2026-10-11", time: "", location: "Gaziantep", description: "Konserler, sergiler, sanat atölyeleri, tiyatro, çocuk etkinlikleri ve gastronomi programlarıyla geniş kapsamlı şehir festivali. Gastronomi yarışmaları 9–11 Ekim'de yapılacak." },
    { title: "Fettah Can Senfonik", date: "2026-10-03", time: "20:30", location: "Şahinbey Kongre ve Sanat Merkezi", description: "Fettah Can'ın senfonik konseri." },
    { title: "Halil Sezai", date: "2026-10-09", time: "20:30", location: "Şehitkamil Kültür ve Kongre Merkezi", description: "Halil Sezai Gaziantep'te konser verecek." },
    { title: "Leman Sam", date: "2026-10-14", time: "20:30", location: "Şehitkamil Kültür ve Kongre Merkezi", description: "Leman Sam konseri." },
    { title: "An Epic Symphony & Hayko Cepkin", date: "2026-10-17", time: "21:00", location: "GAÜN Mâvera KSM Açıkhava Sahnesi", description: "Hayko Cepkin, Night Flight Symphony Orchestra & Choir eşliğinde sahne alacak." },
    { title: "Melek Mosso", date: "2026-10-23", time: "", location: "GAÜN Mâvera KSM Açıkhava Sahnesi", description: "Melek Mosso Gaziantep konseri." },
    { title: "Sagopa Kajmer", date: "2026-10-25", time: "20:00", location: "Jolly Joker Gaziantep", description: "Sagopa Kajmer Gaziantep'te sahne alacak." },
    { title: "Candles and Echoes", date: "2026-10-25", time: "20:15", location: "Şahinbey Kongre ve Sanat Merkezi", description: "Mum ışığı konseptli müzik etkinliği." },
    { title: "Gökhan Çınar / Katarsis", date: "2026-10-26", time: "", location: "Şahinbey Kongre ve Sanat Merkezi", description: "Gökhan Çınar'ın Katarsis programı, \u201CGel Yeniden Başlayalım\u201D başlığıyla sahnede." }
];

const statusEl = $("#status");
const btn = $("#importBtn");
const authInfo = $("#authInfo");

onAuthStateChanged(auth, (user) => {
    if (user) {
        authInfo.textContent = "Giriş: " + (user.email || user.uid);
    } else {
        authInfo.innerHTML = '<span class="err">Giriş yapılmamış. Önce ana siteden giriş yapın.</span>';
        btn.disabled = true;
    }
});

btn.addEventListener("click", async () => {
    btn.disabled = true;
    statusEl.innerHTML = "";
    let ok = 0, fail = 0;

    for (const ev of events) {
        const payload = {
            title: ev.title,
            date: ev.date,
            time: ev.time || "",
            location: ev.location,
            description: ev.description,
            createdAt: new Date().toISOString()
        };
        if (ev.endDate) payload.endDate = ev.endDate;

        try {
            await addDoc(collection(db, "events"), payload);
            ok++;
            statusEl.insertAdjacentHTML("beforeend", '<div class="ok">✔ ' + esc(ev.title) + " eklendi.</div>");
        } catch (err) {
            fail++;
            statusEl.insertAdjacentHTML("beforeend", '<div class="err">✘ ' + esc(ev.title) + " — " + esc(err.message) + "</div>");
        }
    }

    statusEl.insertAdjacentHTML("beforeend", '<div class="info">Sonuç: ' + ok + " eklendi, " + fail + " hata.</div>");
    btn.disabled = false;
});

function $(sel) { return document.querySelector(sel); }

function esc(s) {
    const d = document.createElement("div");
    d.textContent = s || "";
    return d.innerHTML;
}