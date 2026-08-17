/* ============================================================
   Dülük Hub — app.js
   Uygulama girişi: yardımcılar, tema, toast, modal, hata durumu.
   ============================================================ */

import { initRouter } from "./navigation.js";
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
    if (btn) btn.addEventListener("click", toggleTheme);

    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
        if (!localStorage.getItem(THEME_KEY)) applyTheme(e.matches ? "dark" : "light");
    });
}

function toggleTheme() {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(next);
}

export function toggleThemeUI() {
    toggleTheme();
}

function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
    renderThemeIcons(theme);
}

function renderThemeIcons(theme) {
    const sun = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.9 4.9 1.4 1.4"/><path d="m17.7 17.7 1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.3 17.7-1.4 1.4"/><path d="m19.1 4.9-1.4 1.4"/></svg>';
    const moon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>';
    const btn = $("#themeToggle");
    if (btn) btn.innerHTML = theme === "dark" ? sun : moon;
}

/* ---------- Toast ---------- */

export function toast(message, type = "success") {
    const root = $("#toast-root");
    if (!root) return;
    const el = document.createElement("div");
    el.className = "toast " + type;
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
    backdrop.className = "modal-backdrop";

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
    setTimeout(() => splash.classList.add("done"), 300);
}

init();