/* ============================================================
   Dülük Hub — events.js
   Etkinlikler: yaklaşan etkinlik listesi ve detay modali.
   ============================================================ */

import { $, $$, esc, fmtDate, monthShort, openModal, renderError } from "./app.js";
import { listEvents } from "./firebase.js";

let cachedEvents = [];

export async function renderEvents() {
    const el = $("#eventsContent");
    el.innerHTML =
        '<header class="screen-head"><h1>Etkinlikler</h1><p>Yaklaşan etkinlikler</p></header>' +
        '<div class="skeleton" style="height:110px;border-radius:14px"></div>' +
        '<div class="skeleton" style="height:110px;border-radius:14px;margin-top:14px"></div>';

    try {
        cachedEvents = await listEvents();

        if (!cachedEvents.length) {
            el.innerHTML =
                '<header class="screen-head"><h1>Etkinlikler</h1><p>Yaklaşan etkinlikler</p></header>' +
                '<div class="empty-state">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 2v4"/><path d="M16 2v4"/><path d="M3 9h18"/><path d="m9 14 2 2 4-4"/></svg>' +
                "<h3>Yaklaşan etkinlik bulunmuyor.</h3><p>Yeni etkinlikler duyurulduğunda burada görünecek.</p></div>";
            return;
        }

        el.innerHTML =
            '<header class="screen-head"><h1>Etkinlikler</h1><p>Yaklaşan etkinlikler</p></header>' +
            '<div class="event-list">' +
            cachedEvents.map((e) => eventCard(e)).join("") +
            "</div>";

        $$("[data-event-id]", el).forEach((btn) => {
            btn.addEventListener("click", () => openEventModal(decodeURIComponent(btn.dataset.eventId)));
        });
    } catch (err) {
        console.error("Etkinlikler yüklenemedi:", err);
        renderError(el, "Etkinlikler");
    }
}

function eventCard(e) {
    const isSoon = new Date(e.date) - Date.now() < 7 * 86400000;
    return (
        '<article class="card event-card">' +
        '<div class="event-date' + (isSoon ? " accent" : "") + '">' +
        '<span class="day">' + esc(new Date(e.date).getDate()) + "</span>" +
        '<span class="month">' + monthShort(e.date) + "</span>" +
        "</div>" +
        '<div class="event-info">' +
        "<h3>" + esc(e.title) + "</h3>" +
        '<p class="meta">' +
        '<span>' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 2v4"/><path d="M16 2v4"/><path d="M3 9h18"/></svg>' +
        fmtDate(e.date) + "</span>" +
        (e.time ?
            '<span>' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>' +
            esc(e.time) + "</span>" : "") +
        (e.location ?
            '<span>' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>' +
            esc(e.location) + "</span>" : "") +
        "</p>" +
        '<button type="button" class="btn btn-sm btn-ghost" data-event-id="' + encodeURIComponent(e.id) + '">Detay</button>' +
        "</div></article>"
    );
}

/* ---------- Etkinlik detayı ---------- */

export function openEventModal(id) {
    const ev = cachedEvents.find((e) => e.id === id);
    if (!ev) return;

    openModal({
        title: "Etkinlik",
        content:
            '<div class="field"><label>Tarih</label><p style="margin:0;font-weight:600">' + esc(fmtDate(ev.date)) + "</p></div>" +
            (ev.time ? '<div class="field"><label>Saat</label><p style="margin:0;font-weight:600">' + esc(ev.time) + "</p></div>" : "") +
            (ev.location ? '<div class="field"><label>Konum</label><p style="margin:0;font-weight:600">' + esc(ev.location) + "</p></div>" : "") +
            '<div class="field"><label>Açıklama</label><p style="margin:0;line-height:1.7">' + esc(ev.description || "Açıklama eklenmedi.") + "</p></div>" +
            '<div style="margin-top:18px;display:flex;justify-content:flex-end">' +
            '<button type="button" class="btn btn-primary btn-sm js-modal-close">Kapat</button></div>'
    });
}