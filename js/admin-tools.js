/* ============================================================
   Dülük Hub — admin-tools.js
   Etkinlikleri Firestore'a ekler.
   - Aynı başlıkta etkinlik varsa eklemez.
   - Aynı başlıktan birden fazla varsa kopyaları siler, 1 bırakır.
   Kullanıcının mevcut admin oturumunu kullanır.
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
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

const stories = [
    "26 Eylül'de GOPSM – Gaziantep Odeon Performans Sanatları Merkezi'nde Blok3 konseri düzenlenecek. Kalabalık bir grubun sahne alacağı gecede bolca enerji ve nostalji olacak.",
    "27 Eylül'de Şehitkamil Kültür ve Kongre Merkezi'nde mum ışıkları eşliğinde 'Candlelit Ballet: Golden Swan' bale gösterisi gerçekleşecek. Saat 20:15'te sahneye taşınacak eser, izleyenlere romantik bir atmosfer sunacak.",
    "Gaziantep'te 3–11 Ekim tarihleri arasında GastroANTEP Kültür Yolu Festivali düzenlenecek. Konserler, sergiler, sanat atölyeleri, tiyatro, çocuk etkinlikleri ve gastronomi programlarıyla geniş kapsamlı bir şehir festivali yaşanacak. Gastronomi yarışmaları 9–11 Ekim'de yapılacak.",
    "3 Ekim'de Şahinbey Kongre ve Sanat Merkezi'nde Fettah Can, senfonik orkestra eşliğinde sahne alacak. Saat 20:30'da başlayacak konserde sanatçının unutulmaz şarkıları yeniden yorumlanacak.",
    "9 Ekim'de Şehitkamil Kültür ve Kongre Merkezi'nde Halil Sezai Gaziantep'e konser verecek. Saat 20:30'da başlayacak gecede şarkıcının sevilen parçaları seslendirilecek.",
    "14 Ekim'de Şehitkamil Kültür ve Kongre Merkezi'nde Leman Sam sevenleriyle buluşacak. Saat 20:30'daki konserde sanatçı, nostaljik şarkılarıyla dinleyicilerine keyifli bir gece yaşatacak.",
    "17 Ekim'de GAÜN Mâvera KSM Açıkhava Sahnesi'nde Hayko Cepkin, Night Flight Symphony Orchestra & Choir eşliğinde sahne alacak. Saat 21:00'de başlayacak 'An Epic Symphony' gösterisi, rock ve senfoniyi buluşturacak.",
    "23 Ekim'de GAÜN Mâvera KSM Açıkhava Sahnesi'nde Melek Mosso Gaziantep konseri verecek. Şarkıcı, güçlü yorumuyla sahne alacak.",
    "25 Ekim'de Jolly Joker Gaziantep'te Sagopa Kajmer Türkiye turunun Gaziantep ayağında sahne alacak. Saat 20:00'de başlayacak konserde rap sevenler için unutulmaz bir gece olacak.",
    "25 Ekim'de Şahinbey Kongre ve Sanat Merkezi'nde mum ışığı konseptli müzik etkinliği 'Candles and Echoes' gerçekleşecek. Saat 20:15'te başlayacak etkinlik akustik tınılarıyla huzurlu bir atmosfer sunacak.",
    "26 Ekim'de Şahinbey Kongre ve Sanat Merkezi'nde Gökhan Çınar'ın Katarsis programı, 'Gel Yeniden Başlayalım' başlığıyla sahneye taşınacak. Samimi anlatımıyla dikkat çeken program, dinleyicilerine duygusal anlar yaşatacak."
];

const statusEl = $("#status");
const btn = $("#importBtn");
const checkBtn = $("#checkBtn");
const authInfo = $("#authInfo");

const log = (cls, msg) => statusEl.insertAdjacentHTML("beforeend", '<div class="' + cls + '">' + msg + "</div>");

onAuthStateChanged(auth, (user) => {
    if (user) {
        authInfo.textContent = "Giriş: " + (user.email || user.uid);
    } else {
        authInfo.innerHTML = '<span class="err">Giriş yapılmamış. Önce ana siteden giriş yapın.</span>';
        btn.disabled = true;
        if (checkBtn) checkBtn.disabled = true;
    }
});

async function cleanupDuplicates(colName) {
    const snap = await getDocs(collection(db, colName));
    const byTitle = {};
    snap.docs.forEach((d) => {
        const t = (d.data().title || "").trim().toLowerCase();
        (byTitle[t] = byTitle[t] || []).push({ id: d.id, doc: d });
    });

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
            byTitle[t] = [list[0]];
        }
    }
    return { byTitle, removed };
}

btn.addEventListener("click", async () => {
    btn.disabled = true;
    statusEl.innerHTML = "";

    try {
        const { byTitle, removed } = await cleanupDuplicates("events");
        log("info", removed + " kopya etkinlik silindi.");

        let added = 0, skipped = 0;

        for (const ev of events) {
            if (byTitle[ev.title.trim().toLowerCase()]) {
                skipped++;
                log("info", "↷ " + esc(ev.title) + " zaten var, atlandı.");
                continue;
            }

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
                added++;
                log("ok", "✔ " + esc(ev.title) + " eklendi.");
            } catch (err) {
                log("err", "✘ " + esc(ev.title) + " — " + esc(err.message));
            }
        }

        log("info", "Sonuç: " + added + " eklendi, " + skipped + " zaten vardı, " + removed + " kopya silindi.");
    } catch (err) {
        log("err", "Hata: " + esc(err.message));
    }

    btn.disabled = false;
});

const storyBtn = $("#storyBtn");

if (storyBtn) {
    storyBtn.addEventListener("click", async () => {
        storyBtn.disabled = true;
        statusEl.innerHTML = "";

        try {
            const { byTitle, removed } = await cleanupDuplicates("stories");
            log("info", removed + " kopya hikaye silindi.");

            let added = 0, skipped = 0;
            events.forEach((ev, i) => {
                const title = ev.title;
                if (byTitle[title.trim().toLowerCase()]) {
                    skipped++;
                    log("info", "↷ " + esc(title) + " hikayesi zaten var, atlandı.");
                    return;
                }

                const payload = {
                    title: title,
                    content: stories[i] || ev.description,
                    author: "Dülük Hub",
                    likes: 0,
                    date: ev.date,
                    createdAt: new Date().toISOString()
                };

                addDoc(collection(db, "stories"), payload)
                    .then(() => {
                        added++;
                        log("ok", "✔ " + esc(title) + " hikayesi eklendi.");
                    })
                    .catch((err) => {
                        log("err", "✘ " + esc(title) + " — " + esc(err.message));
                    });
            });

            await new Promise((r) => setTimeout(r, 3000));
            log("info", "Hikaye sonucu: " + added + " eklendi, " + skipped + " zaten vardı, " + removed + " kopya silindi.");
        } catch (err) {
            log("err", "Hata: " + esc(err.message));
        }

        storyBtn.disabled = false;
    });
}

if (checkBtn) {
    checkBtn.addEventListener("click", async () => {
        checkBtn.disabled = true;
        statusEl.innerHTML = "";

        try {
            const { removed } = await cleanupDuplicates();
            log("info", "Kontrol tamam. " + removed + " kopya etkinlik silindi, her etkinlik tek kopya.");
        } catch (err) {
            log("err", "Hata: " + esc(err.message));
        }

        checkBtn.disabled = false;
    });
}

$("#logoutBtn").addEventListener("click", async () => {
    try {
        await signOut(auth);
        location.href = "./admin.html";
    } catch (err) {
        log("err", "Çıkış yapılamadı: " + esc(err.message));
    }
});

function $(sel) { return document.querySelector(sel); }

function esc(s) {
    const d = document.createElement("div");
    d.textContent = s || "";
    return d.innerHTML;
}