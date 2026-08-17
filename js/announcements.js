/*
   Dülük Hub — announcements.js
   Duyurular: yöneticinin eklediği duyuruların okunduğu ortak ekran.
*/

import { $, esc, fmtDate, imgFallback, renderError } from "./app.js";
import { listAnnouncements } from "./firebase.js";

export function renderAnnouncements() {
    const el = $("#announcementsContent");
    if (!el) return;

    el.innerHTML =
        '<header class="screen-head"><h1>Duyurular</h1><p>Köyümüzden önemli bildirimler</p></header>' +
        '<div class="loader"><div class="spinner"></div></div>';

    listAnnouncements()
        .then((items) => {
            if (!items.length) {
                el.innerHTML =
                    '<header class="screen-head"><h1>Duyurular</h1><p>Köyümüzden önemli bildirimler</p></header>' +
                    '<div class="empty-state"><span>🔔</span><h3>Henüz duyuru yok</h3><p>Yeni bir duyuru eklendiğinde burada göreceksiniz.</p></div>';
                return;
            }
            items.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
            el.innerHTML =
                '<header class="screen-head"><h1>Duyurular</h1><p>Köyümüzden önemli bildirimler</p></header>' +
                '<div class="announce-list">' +
                items
                    .map(
                        (d) =>
                            '<article class="card announce-item' +
                            (d.important ? " important" : "") +
                            '">' +
                            (d.important ? '<span class="dot" aria-hidden="true"></span>' : "") +
                            "<div>" +
                            "<h3>" +
                            esc(d.title) +
                            (d.important ? "<span>Önemli</span>" : "") +
                            '</h3><time datetime="' +
                            esc(d.date || "") +
                            '">' +
                            fmtDate(d.date) +
                            "</time>" +
                            (d.content ? "<p>" + esc(d.content) + "</p>" : "") +
                            "</div></article>"
                    )
                    .join("") +
                "</div>";
        })
        .catch((err) => {
            console.error("Duyurular yüklenemedi:", err);
            renderError(el, "Duyurular");
        });
}