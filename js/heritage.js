/* ============================================================
   Dülük Hub — heritage.js
   Tarihi eserler: köyün kültürel mirası.
   ============================================================ */

import { $, esc, imgFallback, renderError } from "./app.js";
import { listHeritage } from "./firebase.js";

let cachedHeritage = [];

export async function renderHeritage() {
    const el = $("#heritageContent");
    el.innerHTML =
        '<header class="screen-head"><h1>Tarihi Eserler</h1><p>Köyümüzün kültürel mirası</p></header>' +
        '<div class="skeleton" style="height:220px;border-radius:14px"></div>' +
        '<div class="skeleton" style="height:220px;border-radius:14px;margin-top:14px"></div>';

    try {
        cachedHeritage = await listHeritage();

        if (!cachedHeritage.length) {
            el.innerHTML =
                '<header class="screen-head"><h1>Tarihi Eserler</h1><p>Köyümüzün kültürel mirası</p></header>' +
                '<div class="empty-state">' +
                '<span class="empty-emoji">🏺</span>' +
                "<h4>Henüz eser listelenmemiş.</h4><p>Tarihi eserlerimiz yakında burada olacak.</p></div>";
            return;
        }

        el.innerHTML =
            '<header class="screen-head"><h1>Tarihi Eserler</h1><p>Köyümüzün kültürel mirası</p></header>' +
            '<div class="heritage-list">' +
            cachedHeritage.map(heritageCard).join("") +
            "</div>";

        $$images(el).forEach((img) => imgFallback(img, "Tarihi eser görseli"));
    } catch (err) {
        console.error("Tarihi eserler yüklenemedi:", err);
        renderError(el, "Tarihi Eserler");
    }
}

function $$images(root) {
    return [...root.querySelectorAll(".heritage-cover img")];
}

function heritageCard(h) {
    return (
        '<article class="card heritage-card">' +
        '<div class="heritage-cover">' +
        (h.era ? '<span class="heritage-era">' + esc(h.era) + "</span>" : "") +
        '<img src="' + esc(h.imageUrl) + '" alt="' + esc(h.title) + '" loading="lazy" width="960" height="600">' +
        "</div>" +
        '<div class="heritage-body">' +
        "<h3>" + esc(h.title) + "</h3>" +
        "<p>" + esc(h.description || "") + "</p>" +
        "</div></article>"
    );
}