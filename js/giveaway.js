/* ============================================================
   Dülük Hub — giveaway.js
   Çekilişler: canlı geri sayım, katılım butonu ve kutlama efekti.
   ============================================================ */

import { $, $$, esc, toast, imgFallback, fmtDate, fmtDateTime, renderError } from "./app.js";
import { listGiveaways, enterGiveaway } from "./firebase.js";
import { getCurrentUser } from "./auth.js";

let cachedGiveaways = [];
let joinedSet = new Set();
let countdownTimer = null;

const JOIN_KEY = "dulukhub-giveaway-joined";

function loadJoined() {
    try {
        joinedSet = new Set(JSON.parse(localStorage.getItem(JOIN_KEY)) || []);
    } catch (err) {
        joinedSet = new Set();
    }
}

function isJoined(id) {
    return joinedSet.has(id);
}

function markJoined(id) {
    joinedSet.add(id);
    try {
        localStorage.setItem(JOIN_KEY, JSON.stringify([...joinedSet]));
    } catch (err) {
        console.warn("Katılım kaydedilemedi:", err);
    }
}

export async function renderGiveaways() {
    loadJoined();
    stopCountdown();
    const el = $("#giveawayContent");
    el.innerHTML =
        '<header class="screen-head"><h1>Çekilişler</h1><p>Katıl, şansını dene</p></header>' +
        '<div class="skeleton" style="height:150px;border-radius:14px"></div>' +
        '<div class="skeleton" style="height:150px;border-radius:14px;margin-top:14px"></div>';

    try {
        cachedGiveaways = await listGiveaways();

        if (!cachedGiveaways.length) {
            el.innerHTML =
                '<header class="screen-head"><h1>Çekilişler</h1><p>Katıl, şansını dene</p></header>' +
                '<div class="empty-state">' +
                '<span class="empty-emoji">🎁</span>' +
                "<h4>Şu an aktif çekiliş yok.</h4><p>Yeni çekilişler duyurulduğunda burada görünecek.</p></div>";
            return;
        }

        el.innerHTML =
            '<header class="screen-head"><h1>Çekilişler</h1><p>Katıl, şansını dene</p></header>' +
            '<div class="giveaway-list">' +
            cachedGiveaways.map(giveawayCard).join("") +
            "</div>";

        $$("[data-giveaway-id]", el).forEach((btn) => {
            btn.addEventListener("click", () => joinGiveaway(btn.dataset.giveawayId, btn));
        });
        $$("[data-giveaway-img]", el).forEach((img) => imgFallback(img, "Çekiliş görseli"));

        startCountdown(el);
    } catch (err) {
        console.error("Çekilişler yüklenemedi:", err);
        renderError(el, "Çekilişler");
    }
}

function giveawayCard(g) {
    const joined = isJoined(g.id);
    const pct = Math.min(100, Math.round((g.participants / g.target) * 100));
    return (
        '<article class="card giveaway-card">' +
        (g.imageUrl ? '<img class="giveaway-img" src="' + esc(g.imageUrl) + '" alt="' + esc(g.title) + '" loading="lazy" data-giveaway-img="' + encodeURIComponent(g.id) + '">' : "") +
        '<div class="giveaway-head">' +
        "<h3>" + esc(g.title) + "</h3>" +
        '<span class="badge badge-giveaway">' + esc(g.prize || "Hediye") + "</span>" +
        "</div>" +
        '<p class="giveaway-desc">' + esc(g.description || "") + "</p>" +
        '<div class="giveaway-countdown" data-count="' + encodeURIComponent(g.endDate) + '" role="timer" aria-live="polite">…</div>' +
        '<div class="progress-track"><div class="progress-fill" style="width:' + pct + '%"></div></div>' +
        '<p class="giveaway-stats"><span>' + esc(g.participants) + " kişi katıldı</span><span>" + esc(pct) + "%</span></p>" +
        (g.startDate ? '<p class="form-hint" style="text-align:center">Başlangıç: ' + fmtDateTime(g.startDate) + "</p>" : "") +
        (joined
            ? '<button type="button" class="btn btn-block btn-ghost" disabled>Katılımın alındı — bol şans!</button>'
            : '<button type="button" class="btn btn-block btn-accent" data-giveaway-id="' + encodeURIComponent(g.id) + '">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' +
              "Çekilişe Katıl</button>") +
        '<p class="form-hint" style="text-align:center">Katılım biter: ' + fmtDateTime(g.endDate) + "</p>" +
        "</article>"
    );
}

/* ---------- Canlı geri sayım ---------- */

function stopCountdown() {
    if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
    }
}

function startCountdown(root) {
    const els = $$("[data-count]", root);
    if (!els.length) return;

    const tick = () => {
        const now = Date.now();
        els.forEach((el) => {
            const end = new Date(decodeURIComponent(el.dataset.count)).getTime();
            el.textContent = formatRemaining(end - now);
        });
    };

    tick();
    countdownTimer = setInterval(tick, 30000);
}

function formatRemaining(ms) {
    if (ms <= 0) return "Çekiliş sona erdi";
    const totalMin = Math.ceil(ms / 60000);
    const days = Math.floor(totalMin / 1440);
    const hours = Math.floor((totalMin % 1440) / 60);
    const minutes = totalMin % 60;

    let text = "Kalan süre: ";
    if (days > 0) text += days + " gün ";
    if (hours > 0 || days > 0) text += hours + " saat ";
    if (days === 0) text += minutes + " dakika";
    return text.trim();
}

/* ---------- Katılım + kutlama ---------- */

async function joinGiveaway(id, btn) {
    const g = cachedGiveaways.find((x) => x.id === id);
    if (!g || isJoined(g.id)) return;
    if (!getCurrentUser()) {
        toast("Önce giriş yapmalısın.", "error");
        return;
    }
    btn.disabled = true;
    try {
        const u = getCurrentUser();
        const livePhone = u ? u.phoneNumber || "" : "";
        const autoEmail = u ? (u.email || "").match(/^phone(\d+)@/) : null;
        await enterGiveaway(g.id, {
            uid: u ? u.uid : "",
            name: u ? (u.displayName || "") : "",
            phone: livePhone || (autoEmail ? autoEmail[1] : "")
        });
        g.participants = (Number(g.participants) || 0) + 1;
        markJoined(g.id);

        const card = btn.closest(".giveaway-card");
        if (card) {
            burstConfetti(card);
            btn.outerHTML = '<button type="button" class="btn btn-block btn-ghost" disabled>Katılımın alındı — bol şans!</button>';
            const stats = card.querySelector(".giveaway-stats span");
            if (stats) stats.textContent = g.participants + " kişi katıldı";
            const fill = card.querySelector(".progress-fill");
            if (fill) fill.style.width = Math.min(100, Math.round((g.participants / g.target) * 100)) + "%";
        }
        toast("Çekilişe katıldın. Bol şans!");
    } catch (err) {
        console.error("Katılım alınamadı:", err);
        toast("Katılım alınamadı. Tekrar dene.", "error");
        btn.disabled = false;
    }
}

function burstConfetti(card) {
    const colors = ["#F2B84B", "#58A6FF", "#9D8CFF", "#2ECCB8", "#F97A8D"];
    const burst = document.createElement("div");
    burst.className = "confetti-burst";
    for (let i = 0; i < 26; i++) {
        const piece = document.createElement("span");
        piece.style.setProperty("--x", (Math.random() * 200 - 100) + "px");
        piece.style.setProperty("--y", (Math.random() * -160 - 40) + "px");
        piece.style.setProperty("--r", Math.random() * 540 + "deg");
        piece.style.setProperty("--c", colors[i % colors.length]);
        piece.style.animationDelay = Math.random() * 0.12 + "s";
        burst.appendChild(piece);
    }
    card.appendChild(burst);
    setTimeout(() => burst.remove(), 1600);
}

export function refreshGiveaways() {
    if (!cachedGiveaways.length) return;
    $("#giveawayContent") && renderGiveaways();
}
