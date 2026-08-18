/* ============================================================
   Dülük Hub — calendar.js
   Aylık takvim görünümü: etkinlikleri takvim üzerinde gösterme.
   ============================================================ */

import { $, esc, openModal, fmtDate, toast } from "./app.js";
import { listEvents } from "./firebase.js";

let cachedEvents = [];
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

const MONTH_NAMES = [
    "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

const DAY_NAMES = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

export async function renderCalendar() {
    const el = $("#eventsContent");
    el.innerHTML =
        '<header class="screen-head"><h1>Etkinlik Takvimi</h1><p>Aylık etkinlik görünümü</p></header>' +
        '<div class="event-view-toggle">' +
        '<button type="button" class="chip" data-view="timeline"> Liste</button>' +
        '<button type="button" class="chip active" data-view="calendar"> Takvim</button>' +
        '</div>' +
        '<div class="skeleton" style="height:400px;border-radius:14px"></div>';

    try {
        cachedEvents = await listEvents();
        renderCalendarView(el);
    } catch (err) {
        console.error("Takvim yüklenemedi:", err);
        el.innerHTML = '<div class="error-state"><h3>Takvim yüklenemedi.</h3></div>';
    }
}

function renderCalendarView(el) {
    const monthLabel = MONTH_NAMES[currentMonth] + " " + currentYear;
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDay = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;

    let calHtml = '<div class="calendar-wrapper">' +
        '<div class="calendar-header">' +
        '<button type="button" class="btn-icon cal-nav" id="calPrev" aria-label="Önceki ay">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>' +
        '</button>' +
        '<h2 class="cal-month-label">' + esc(monthLabel) + '</h2>' +
        '<button type="button" class="btn-icon cal-nav" id="calNext" aria-label="Sonraki ay">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>' +
        '</button>' +
        '</div>' +
        '<div class="calendar-grid">';

    DAY_NAMES.forEach((d) => {
        calHtml += '<div class="cal-day-name">' + d + '</div>';
    });

    for (let i = 0; i < firstDay; i++) {
        calHtml += '<div class="cal-day empty"></div>';
    }

    const today = new Date();
    const isCurrentMonth = today.getMonth() === currentMonth && today.getFullYear() === currentYear;

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = currentYear + "-" + String(currentMonth + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0");
        const dayEvents = cachedEvents.filter((e) => e.date === dateStr);
        const isToday = isCurrentMonth && day === today.getDate();

        let classes = "cal-day";
        if (isToday) classes += " today";
        if (dayEvents.length) classes += " has-event";

        calHtml += '<div class="' + classes + '" data-date="' + dateStr + '">' +
            '<span class="cal-day-num">' + day + '</span>';

        if (dayEvents.length) {
            calHtml += '<div class="cal-event-dots">';
            dayEvents.slice(0, 3).forEach((_, i) => {
                calHtml += '<span class="cal-dot dot-' + (i + 1) + '"></span>';
            });
            calHtml += '</div>';
        }

        calHtml += '</div>';
    }

    calHtml += '</div></div>';

    /* ---------- Seçili gün etkinlikleri ---------- */

    calHtml += '<div class="cal-events-panel" id="calEventsPanel">' +
        '<p class="cal-events-hint">Takvimdeki bir güne tıklayın</p></div>';

    el.innerHTML =
        '<header class="screen-head"><h1>Etkinlik Takvimi</h1><p>Aylık etkinlik görünümü</p></header>' +
        '<div class="event-view-toggle">' +
        '<button type="button" class="chip" data-view="timeline"> Liste</button>' +
        '<button type="button" class="chip active" data-view="calendar"> Takvim</button>' +
        '</div>' +
        calHtml;

    /* ---------- Olaylar ---------- */

    $$(".event-view-toggle .chip", el).forEach((chip) => {
        chip.addEventListener("click", async () => {
            const { switchEventsMode } = await import("./events.js");
            switchEventsMode(chip.dataset.view);
        });
    });

    const prev = el.querySelector("#calPrev");
    const next = el.querySelector("#calNext");

    if (prev) prev.addEventListener("click", () => {
        currentMonth--;
        if (currentMonth < 0) { currentMonth = 11; currentYear--; }
        renderCalendarView(el);
    });

    if (next) next.addEventListener("click", () => {
        currentMonth++;
        if (currentMonth > 11) { currentMonth = 0; currentYear++; }
        renderCalendarView(el);
    });

    $$(".cal-day:not(.empty)", el).forEach((dayEl) => {
        dayEl.addEventListener("click", () => {
            $$(".cal-day.selected", el).forEach((d) => d.classList.remove("selected"));
            dayEl.classList.add("selected");
            showDayEvents(dayEl.dataset.date, el);
        });
    });
}

function showDayEvents(dateStr, el) {
    const panel = el.querySelector("#calEventsPanel");
    if (!panel) return;

    const events = cachedEvents.filter((e) => e.date === dateStr);

    if (!events.length) {
        const d = new Date(dateStr + "T12:00:00");
        panel.innerHTML = '<p class="cal-events-date">' + fmtDate(dateStr) + '</p>' +
            '<p class="cal-no-events">Bu gün için etkinlik yok.</p>';
        return;
    }

    const d = new Date(dateStr + "T12:00:00");
    let html = '<p class="cal-events-date">' + fmtDate(dateStr) + '</p>' +
        '<div class="cal-events-list">';

    events.forEach((ev) => {
        html += '<button type="button" class="cal-event-item" data-event-id="' + esc(ev.id) + '">' +
            '<div class="cal-event-time">' + (ev.time || "Tüm gün") + '</div>' +
            '<div class="cal-event-info">' +
            '<strong>' + esc(ev.title) + '</strong>' +
            (ev.location ? '<span class="cal-event-loc">' + esc(ev.location) + '</span>' : '') +
            '</div></button>';
    });

    html += '</div>';
    panel.innerHTML = html;

    $$(".cal-event-item", panel).forEach((item) => {
        item.addEventListener("click", () => {
            const ev = cachedEvents.find((e) => e.id === item.dataset.eventId);
            if (ev) openEventDetail(ev);
        });
    });
}

function openEventDetail(ev) {
    openModal({
        title: "Etkinlik",
        content:
            '<div class="form-group"><label>Tarih</label><p style="margin:0;font-weight:600">' + fmtDate(ev.date) + "</p></div>" +
            (ev.time ? '<div class="form-group"><label>Saat</label><p style="margin:0;font-weight:600">' + esc(ev.time) + "</p></div>" : "") +
            (ev.location ? '<div class="form-group"><label>Konum</label><p style="margin:0;font-weight:600">' + esc(ev.location) + "</p></div>" : "") +
            '<div class="form-group"><label>Açıklama</label><p style="margin:0;line-height:1.7">' + esc(ev.description || "Açıklama eklenmedi.") + "</p></div>" +
            '<div style="margin-top:18px;display:flex;justify-content:flex-end"><button type="button" class="btn btn-primary btn-sm js-modal-close">Kapat</button></div>'
    });
}
