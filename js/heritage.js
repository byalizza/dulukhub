/* ============================================================
   Dülük Hub — heritage.js
   Tarihi eserler: küçük kart ızgarası + tıklayınca detay modalı.
   ============================================================ */

import { $, esc, imgFallback, openModal, renderError } from "./app.js";
import { listHeritage } from "./firebase.js";

let cachedHeritage = [];

export async function renderHeritage() {
    const el = $("#heritageContent");
    el.innerHTML =
        '<header class="screen-head"><h1>Tarihi Eserler</h1><p>Köyümüzün kültürel mirası</p></header>' +
        '<div class="heritage-grid">' +
        '<div class="skeleton" style="height:140px;border-radius:12px"></div>'.repeat(3) +
        "</div>";

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
            '<div class="heritage-grid">' +
            cachedHeritage.map(heritageCard).join("") +
            "</div>";

        $$("#heritageContent .heritage-card").forEach((card) => {
            card.addEventListener("click", () => {
                const h = cachedHeritage.find((x) => x.id === card.dataset.id);
                if (h) openHeritageDetail(h);
            });
        });

        $$("#heritageContent .heritage-cover img").forEach((img) => imgFallback(img, "Tarihi eser görseli"));
    } catch (err) {
        console.error("Tarihi eserler yüklenemedi:", err);
        renderError(el, "Tarihi Eserler");
    }
}

function $$(sel) {
    return [...document.querySelectorAll(sel)];
}

function heritageCard(h) {
    return (
        '<button type="button" class="heritage-card" data-id="' + esc(h.id) + '" aria-label="' + esc(h.title) + ' — detayı aç">' +
        '<div class="heritage-cover">' +
        (h.era ? '<span class="heritage-era">' + esc(h.era) + "</span>" : "") +
        '<img src="' + esc(h.imageUrl) + '" alt="' + esc(h.title) + '" loading="lazy" width="400" height="300">' +
        "</div>" +
        '<div class="heritage-body">' +
        "<h3>" + esc(h.title) + "</h3>" +
        "</div></button>"
    );
}

function openHeritageDetail(h) {
    openModal({
        title: h.title,
        content:
            (h.imageUrl ? '<img class="heritage-modal-img" src="' + esc(h.imageUrl) + '" alt="' + esc(h.title) + '" style="width:100%;border-radius:12px;margin-bottom:14px">' : "") +
            (h.era ? '<div class="form-group"><label>Dönem</label><p style="margin:0;font-weight:600">' + esc(h.era) + "</p></div>" : "") +
            (h.location ? '<div class="form-group"><label>Konum</label><p style="margin:0;font-weight:600">' + esc(h.location) + "</p></div>" : "") +
            (h.description ? '<div class="form-group"><label>Açıklama</label><p style="margin:0;line-height:1.7">' + esc(h.description) + "</p></div>" : "") +
            '<div style="margin-top:18px;display:flex;justify-content:flex-end">' +
            '<button type="button" class="btn btn-primary btn-sm js-modal-close">Kapat</button></div>'
    });
}