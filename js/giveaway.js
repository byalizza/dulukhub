/* ============================================================
   Dülük Hub — giveaway.js
   Çekilişler: aktif çekiliş listesi ve katılım butonu.
   ============================================================ */

import { $, $$, esc, toast, fmtDate, fmtDateTime, renderError } from "./app.js";
import { listGiveaways, enterGiveaway } from "./firebase.js";
import { getCurrentUser } from "./auth.js";

let cachedGiveaways = [];
let joinedSet = new Set();

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
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 4.5 12 7l-3-2.5"/><path d="M12 7v14"/><path d="M2 12h20"/></svg>' +
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
        '<div class="giveaway-head">' +
        "<h3>" + esc(g.title) + "</h3>" +
        '<span class="badge badge-giveaway">' + esc(g.prize || "Hediye") + "</span>" +
        "</div>" +
        '<p class="giveaway-desc">' + esc(g.description || "") + "</p>" +
        '<div class="progress-track"><div class="progress-fill" style="width:' + pct + '%"></div></div>' +
        '<p class="giveaway-stats"><span>' + esc(g.participants) + " kişi katıldı</span><span>" + esc(pct) + "%</span></p>" +
        (joined
            ? '<button type="button" class="btn btn-block btn-ghost" disabled>Katılımın alındı</button>'
            : '<button type="button" class="btn btn-block btn-primary" data-giveaway-id="' + encodeURIComponent(g.id) + '">Çekilişe Katıl</button>') +
        '<p class="form-hint" style="text-align:center">Katılım biter: ' + fmtDateTime(g.endDate) + "</p>" +
        "</article>"
    );
}

async function joinGiveaway(id, btn) {
    const g = cachedGiveaways.find((x) => x.id === id);
    if (!g || isJoined(g.id)) return;
    if (!getCurrentUser()) {
        toast("Önce giriş yapmalısın.", "error");
        return;
    }
    btn.disabled = true;
    try {
        await enterGiveaway(g.id);
        g.participants = (Number(g.participants) || 0) + 1;
        markJoined(g.id);
        renderGiveaways();
        toast("Çekilişe katıldın. Bol şans!");
    } catch (err) {
        console.error("Katılım alınamadı:", err);
        toast("Katılım alınamadı. Tekrar dene.", "error");
        btn.disabled = false;
    }
}

export function refreshGiveaways() {
    if (!cachedGiveaways.length) return;
    $("#giveawayContent") && renderGiveaways();
}