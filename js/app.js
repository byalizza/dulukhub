/* ============================================================
   Dülük Hub — app.js
   Uygulama girişi: tema, toast, modal, yardımcılar,
   ana sayfa ve duyurular ekranı.
   ============================================================ */

import { listPosts, listPhotos, listEvents, listAnnouncements } from "./firebase.js";
import { initRouter, navigateTo } from "./navigation.js";
import { initAuth } from "./auth.js";

/* ---------- DOM yardımcıları ---------- */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const ESCAPE_MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ESCAPE_MAP[c]);
}

export function fmtDate(iso) {
    if (!iso) return "";
    try {
        return new Intl.DateTimeFormat("tr-TR", {
            day: "numeric",
            month: "long",
            year: "numeric"
        }).format(new Date(iso));
    } catch (err) {
        return "";
    }
}

export function fmtDateTime(iso) {
    if (!iso) return "";
    try {
        return new Intl.DateTimeFormat("tr-TR", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }).format(new Date(iso));
    } catch (err) {
        return "";
    }
}

export function monthShort(iso) {
    if (!iso) return "";
    const m = new Intl.DateTimeFormat("tr-TR", { month: "long" }).format(new Date(iso));
    return m.slice(0, 3).toUpperCase();
}

export function initials(name) {
    if (!name) return "G";
    const parts = String(name).trim().split(/\s+/);
    return ((parts[0]?.[0] || "G") + (parts[1]?.[0] || "")).toUpperCase();
}

export function imgFallback(img, alt = "Görsel yüklenemedi") {
    img.addEventListener("error", () => {
        img.src = "data:image/svg+xml;utf8," + encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">' +
            '<rect width="400" height="300" fill="#2F7D5A" opacity="0.14"/>' +
            '<text x="200" y="158" text-anchor="middle" font-family="Inter, Arial" font-size="24" fill="#6D766F">Dülük Hub</text>' +
            "</svg>"
        );
        img.alt = alt;
    });
}

/* ---------- Tema ---------- */

const THEME_KEY = "dulukhub-theme";

function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(saved || (prefersDark ? "dark" : "light"));

    const btn = $("#themeToggle");
    const btnMobile = $("#themeToggleMobile");
    btn.addEventListener("click", toggleTheme);
    btnMobile.addEventListener("click", () => {
        toggleTheme();
        $("#moreMenu").hidden = true;
        btnMobile.parentElement.querySelector("#moreButton")?.setAttribute("aria-expanded", "false");
    });

    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
        if (!localStorage.getItem(THEME_KEY)) applyTheme(e.matches ? "dark" : "light");
    });
}

function toggleTheme() {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(next);
}

function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
    renderThemeIcons(theme);
}

function renderThemeIcons(theme) {
    const sun = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.9 4.9 1.4 1.4"/><path d="m17.7 17.7 1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.3 17.7-1.4 1.4"/><path d="m19.1 4.9-1.4 1.4"/></svg>';
    const moon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>';
    const icon = theme === "dark" ? sun : moon;
    $("#themeToggle").innerHTML = icon;
    const mobileIcon = $("#moreThemeIcon");
    if (mobileIcon) mobileIcon.innerHTML = icon;
}

/* ---------- Toast ---------- */

export function toast(message, type = "success") {
    const root = $("#toast-root");
    if (!root) return;
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    const icon = type === "error"
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/></svg>';
    el.innerHTML = icon + "<span>" + esc(message) + "</span>";
    root.appendChild(el);
    setTimeout(() => el.classList.add("hide"), 2600);
    setTimeout(() => el.remove(), 3000);
}

/* ---------- Modal ---------- */

let activeModal = null;
let lastFocus = null;

export function openModal({ title, content, onMount, onClose, variant }) {
    closeModal();
    const root = $("#modal-root");
    const backdrop = document.createElement("div");
    backdrop.className = variant === "bare" ? "lightbox-backdrop modal-backdrop" : "modal-backdrop";

    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", title || "Pencere");
    dialog.tabIndex = -1;

    if (variant === "bare") {
        dialog.className = "lightbox";
        dialog.innerHTML = content;
    } else {
        dialog.className = "modal";
        dialog.innerHTML =
            '<div class="modal-head">' +
            "<h2>" + esc(title || "") + "</h2>" +
            '<button type="button" class="btn-icon js-modal-close" aria-label="Kapat">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>' +
            "</button></div>" +
            '<div class="modal-body">' + content + "</div>";
    }

    backdrop.appendChild(dialog);
    root.appendChild(backdrop);
    lastFocus = document.activeElement;

    const close = () => {
        backdrop.remove();
        activeModal = null;
        document.removeEventListener("keydown", onKey);
        if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
        if (onClose) onClose();
    };
    activeModal = { close };

    const onKey = (e) => {
        if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) close();
    });

    const closeBtn = dialog.querySelector(".js-modal-close");
    if (closeBtn) closeBtn.addEventListener("click", close);

    dialog.focus();
    if (onMount) onMount(dialog);
    return { close, dialog };
}

export function closeModal() {
    if (activeModal) activeModal.close();
}

/* ---------- Ana sayfa ---------- */

const ICONS = {
    newssvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>',
    photosvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.5-3.5a2 2 0 0 0-2.8 0L6 20"/></svg>',
    calendarSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 2v4"/><path d="M16 2v4"/><path d="M3 9h18"/><path d="m9 14 2 2 4-4"/></svg>',
    bellSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>'
};

export async function renderHome() {
    const el = $("#homeContent");
    el.innerHTML =
        '<section class="hero">' +
        '<span class="hero-badge">Dülük Köyü</span>' +
        '<h1>Dülük Köyü&rsquo;nün<br><span class="accent">dijital buluşma noktası.</span></h1>' +
        "<p>Güncel haberler, yaklaşan etkinlikler ve köyümüzden kareler &mdash; hepsi tek ekranda.</p>" +
        '<div class="hero-actions">' +
        '<button type="button" class="btn btn-primary" data-go="news">Haberleri Gör</button>' +
        '<button type="button" class="btn btn-ghost" data-go="gallery">Galeri</button>' +
        "</div></section>" +
        '<div id="homeDynamic"></div>';

    $$("[data-go]", el).forEach((btn) => {
        btn.addEventListener("click", () => navigateTo(btn.dataset.go));
    });

    await renderHomeDynamic();
}

async function renderHomeDynamic() {
    const host = $("#homeDynamic");
    host.innerHTML =
        '<div class="home-section"><div class="screen-sub"><h2>Son Haberler</h2><a href="#/news">Tümü</a></div>' +
        '<div class="home-news">' +
        '<div class="card mini-news"><div class="skeleton" style="height:16px;width:70%;margin-bottom:10px"></div><div class="skeleton" style="height:14px"></div></div>'.repeat(3) +
        "</div></div>";

    const [posts, photos, events, announcements] = await Promise.allSettled([
        listPosts(),
        listPhotos(),
        listEvents(),
        listAnnouncements()
    ]);

    const html = [];

    const anns = announcements.status === "fulfilled" ? announcements.value : [];
    const latestAnn = [...anns].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    if (latestAnn) {
        html.push(
            '<section class="home-section">' +
            '<div class="home-section-head"><h2>Son Duyuru</h2><a href="#/announcements">Tümü</a></div>' +
            '<div class="card featured-announce"><span class="dot" aria-hidden="true"></span>' +
            '<div><h3>' + esc(latestAnn.title) + "</h3>" +
            '<p>' + fmtDate(latestAnn.date) + "</p>" +
            '<a class="btn btn-sm btn-accent" href="#/announcements">Detay</a></div></div></section>'
        );
    }

    if (posts.status === "fulfilled" && posts.value.length) {
        const items = posts.value.slice(0, 3).map((p) =>
            '<a class="card mini-news" href="#/news/' + encodeURIComponent(p.id) + '">' +
            '<h3>' + esc(p.title) + "</h3>" +
            "<p>" + esc(p.description) + "</p>" +
            "<time>" + fmtDate(p.date) + "</time></a>"
        ).join("");
        html.push(
            '<section class="home-section">' +
            '<div class="home-section-head"><h2>Son Haberler</h2><a href="#/news">Tümü</a></div>' +
            '<div class="home-news">' + items + "</div></section>"
        );
    }

    if (photos.status === "fulfilled" && photos.value.length) {
        const items = photos.value.slice(0, 4).map((p) =>
            '<button type="button" class="mini-photo" data-photo-id="' + encodeURIComponent(p.id) + '" aria-label="' + esc(p.title) + '">' +
            '<img src="' + esc(p.thumbs) + '" alt="' + esc(p.title) + '" loading="lazy" width="300" height="225"></button>'
        ).join("");
        html.push(
            '<section class="home-section">' +
            '<div class="home-section-head"><h2>Köyümüzden kareler</h2><a href="#/gallery">Tümü</a></div>' +
            '<div class="mini-photos">' + items + "</div></section>"
        );
    }

    if (events.status === "fulfilled" && events.value.length) {
        const items = events.value.slice(0, 2).map((e) =>
            '<div class="card event-card"><div class="event-date">' +
            '<span class="day">' + esc(new Date(e.date).getDate()) + "</span>" +
            '<span class="month">' + monthShort(e.date) + "</span></div>" +
            '<div class="event-info"><h3>' + esc(e.title) + "</h3>" +
            '<p class="meta"><span>' + ICONS.calendarSvg + esc(fmtDate(e.date)) + "</span>" +
            (e.time ? "<span>" + esc(e.time) + "</span>" : "") + "</p>" +
            '<button type="button" class="btn btn-sm btn-ghost" data-event-id="' + encodeURIComponent(e.id) + '">Detay</button>' +
            "</div></div>"
        ).join("");
        html.push(
            '<section class="home-section">' +
            '<div class="home-section-head"><h2>Yaklaşan etkinlikler</h2><a href="#/events">Tümü</a></div>' +
            '<div class="mini-events">' + items + "</div></section>"
        );
    }

    host.innerHTML = html.join("");

    $$(".mini-photo img", host).forEach((img) => imgFallback(img, "Fotoğraf"));
    $$(".mini-photo", host).forEach((btn) => {
        btn.addEventListener("click", () => navigateTo("gallery"));
    });
    $$("[data-event-id]", host).forEach((btn) => {
        btn.addEventListener("click", () => navigateTo("events"));
    });
}

/* ---------- Duyurular ekranı ---------- */

export async function renderAnnouncements() {
    const el = $("#announcementsContent");
    el.innerHTML =
        '<header class="screen-head"><h1>Duyurular</h1><p>Son duyurular</p></header>' +
        '<div class="skeleton" style="height:64px;border-radius:14px"></div>';

    try {
        const announcements = await listAnnouncements();
        const sorted = [...announcements].sort((a, b) => new Date(b.date) - new Date(a.date));

        if (!sorted.length) {
            el.innerHTML =
                '<header class="screen-head"><h1>Duyurular</h1><p>Son duyurular</p></header>' +
                '<div class="empty-state">' + ICONS.bellSvg +
                "<h3>Henüz duyuru bulunmuyor.</h3><p>Yeni duyurular burada görünecek.</p></div>";
            return;
        }

        const items = sorted.map((a) =>
            '<article class="card announce-item' + (a.important ? " important" : "") + '">' +
            '<span class="dot" aria-hidden="true"></span>' +
            "<div><h3>" + esc(a.title) + "</h3>" +
            '<time class="date">' + fmtDate(a.date) + "</time></div></article>"
        ).join("");

        el.innerHTML =
            '<header class="screen-head"><h1>Duyurular</h1><p>Son duyurular</p></header>' +
            '<div class="announce-list">' + items + "</div>";
    } catch (err) {
        console.error("Duyurular yüklenemedi:", err);
        renderError(el, "Duyurular");
    }
}

/* ---------- Ortak hata durumu ---------- */

export function renderError(el, name) {
    el.innerHTML =
        '<div class="error-state">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>' +
        "<h3>Bir sorun oluştu.</h3><p>" + esc(name) + " içeriği yüklenemedi.</p>" +
        '<button type="button" class="btn btn-primary btn-sm" data-retry="1">Tekrar Dene</button></div>';
    const retry = $("[data-retry]", el);
    if (retry) retry.addEventListener("click", () => location.reload());
}

/* ---------- Başlatma ---------- */

function init() {
    initTheme();
    initAuth();
    initRouter();

    const splash = $("#splash");
    const app = $("#app");
    app.hidden = false;
    setTimeout(() => splash.classList.add("done"), 150);
}

init();