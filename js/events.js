/* ============================================================
   Dülük Hub — events.js
   Etkinlikler: Bugün/Yarın etiketli zaman çizelgesi ve detay modali.
   ============================================================ */

import { $, $$, esc, imgFallback, fmtDate, monthShort, openModal, renderError } from "./app.js";
import { listEvents } from "./firebase.js";
import { renderCalendar } from "./calendar.js";

let cachedEvents = [];
let viewMode = "timeline";

function eventMoment(e) {
    return new Date(e.date + "T" + (e.time || "00:00") + ":00");
}

function startOfToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

export async function renderEvents() {
    const el = $("#eventsContent");

    if (viewMode === "calendar") {
        await renderCalendar();
        return;
    }

    el.innerHTML =
        '<header class="screen-head"><h1>Etkinlikler</h1><p>Köy takvimi — yaklaşan etkinlikler</p></header>' +
        '<div class="event-view-toggle">' +
        '<button type="button" class="chip active" data-view="timeline"> Liste</button>' +
        '<button type="button" class="chip" data-view="calendar"> Takvim</button>' +
        '</div>' +
        '<div class="skeleton" style="height:110px;border-radius:14px"></div>' +
        '<div class="skeleton" style="height:110px;border-radius:14px;margin-top:14px"></div>';

    try {
        cachedEvents = await listEvents();

        if (!cachedEvents.length) {
            el.innerHTML =
                '<header class="screen-head"><h1>Etkinlikler</h1><p>Köy takvimi — yaklaşan etkinlikler</p></header>' +
                '<div class="event-view-toggle">' +
                '<button type="button" class="chip active" data-view="timeline"> Liste</button>' +
                '<button type="button" class="chip" data-view="calendar"> Takvim</button>' +
                '</div>' +
                '<div class="empty-state">' +
                '<span class="empty-emoji">🎉</span>' +
                "<h4>Yaklaşan etkinlik bulunmuyor.</h4><p>Yeni etkinlikler duyurulduğunda burada görünecek.</p></div>";
            bindViewToggle(el);
            return;
        }

        el.innerHTML =
            '<header class="screen-head"><h1>Etkinlikler</h1><p>Köy takvimi — yaklaşan etkinlikler</p></header>' +
            '<div class="event-view-toggle">' +
            '<button type="button" class="chip active" data-view="timeline"> Liste</button>' +
            '<button type="button" class="chip" data-view="calendar"> Takvim</button>' +
            '</div>' +
            '<div class="event-timeline">' +
            eventGroups().map(groupBlock).join("") +
            "</div>";

        bindViewToggle(el);

        $$("[data-event-id]", el).forEach((item) => {
            const open = () => openEventModal(decodeURIComponent(item.dataset.eventId));
            item.addEventListener("click", open);
            item.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    open();
                }
            });
        });
        $$("[data-event-img]", el).forEach((img) => imgFallback(img, "Etkinlik görseli"));
    } catch (err) {
        console.error("Etkinlikler yüklenemedi:", err);
        renderError(el, "Etkinlikler");
    }
}

export function switchEventsMode(mode) {
    viewMode = mode;
    renderEvents();
}

function bindViewToggle(el) {
    $$(".event-view-toggle .chip", el).forEach((chip) => {
        chip.addEventListener("click", () => {
            viewMode = chip.dataset.view;
            renderEvents();
        });
    });
}

function eventGroups() {
    const today = startOfToday();
    const groups = [
        { key: "today", title: "Bugün" },
        { key: "tomorrow", title: "Yarın" },
        { key: "upcoming", title: "Yaklaşan" }
    ];

    groups.forEach((g) => (g.items = []));

    cachedEvents.forEach((e) => {
        const diffDays = Math.round((eventMoment(e).getTime() - today.getTime()) / 86400000);
        if (diffDays <= 0) groups[0].items.push(e);
        else if (diffDays === 1) groups[1].items.push(e);
        else groups[2].items.push(e);
    });

    return groups.filter((g) => g.items.length);
}

function groupBlock(g) {
    return (
        '<section class="event-group">' +
        '<h2 class="event-group-title">' + esc(g.title) + '<span class="event-group-count">' + g.items.length + "</span></h2>" +
        '<div class="event-list">' + g.items.map(eventCard).join("") + "</div>" +
        "</section>"
    );
}

function eventCard(e) {
    const moment = eventMoment(e);
    const today = startOfToday();
    const diffDays = Math.round((moment.getTime() - today.getTime()) / 86400000);
    const chip =
        diffDays <= 0
            ? '<span class="event-chip is-today">Bugün</span>'
            : diffDays === 1
                ? '<span class="event-chip is-tomorrow">Yarın</span>'
                : '<span class="event-chip">' + diffDays + " gün kaldı</span>";

    return (
        '<article class="card event-card" data-event-id="' + encodeURIComponent(e.id) + '" tabindex="0" role="button" aria-label="' + esc(e.title) + ' — detayı aç">' +
        (e.imageUrl
            ? '<img class="event-img" src="' + esc(e.imageUrl) + '" alt="' + esc(e.title) + '" loading="lazy" data-event-img="' + encodeURIComponent(e.id) + '">'
            : "") +
        '<div class="event-date' + (diffDays <= 1 ? " accent" : "") + '">' +
        '<span class="day">' + esc(moment.getDate()) + "</span>" +
        '<span class="month">' + monthShort(e.date) + "</span>" +
        "</div>" +
        '<div class="event-info">' +
        '<div class="event-info-head">' +
        "<h3>" + esc(e.title) + "</h3>" +
        chip +
        "</div>" +
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
        '<button type="button" class="btn btn-sm btn-ghost" data-event-open="1">Detay</button>' +
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
            (ev.imageUrl ? '<img class="event-img" src="' + esc(ev.imageUrl) + '" alt="' + esc(ev.title) + '">' : "") +
            '<div class="form-group"><label>Tarih</label><p style="margin:0;font-weight:600">' + esc(fmtDate(ev.date)) + "</p></div>" +
            (ev.endDate ? '<div class="form-group"><label>Son tarih</label><p style="margin:0;font-weight:600">' + esc(fmtDate(ev.endDate)) + "</p></div>" : "") +
            (ev.time ? '<div class="form-group"><label>Saat</label><p style="margin:0;font-weight:600">' + esc(ev.time) + "</p></div>" : "") +
            (ev.location ? '<div class="form-group"><label>Konum</label><p style="margin:0;font-weight:600">' + esc(ev.location) + "</p></div>" : "") +
            '<div class="form-group"><label>Açıklama</label><p style="margin:0;line-height:1.7">' + esc(ev.description || "Açıklama eklenmedi.") + "</p></div>" +
            '<div style="margin-top:18px;display:flex;justify-content:flex-end">' +
            '<button type="button" class="btn btn-primary btn-sm js-modal-close">Kapat</button></div>',
        onMount: (dialog) => {
            const img = dialog.querySelector(".event-img");
            if (img) imgFallback(img, "Etkinlik görseli");
        }
    });
}
