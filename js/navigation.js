/* ============================================================
   Dülük Hub — navigation.js
   Merkezi ekran yöneticisi ve hash tabanlı SPA yönlendirme.
   Aktif olmayan ekranlar DOM'dan gizlenir; içerik yalnızca
   ekran görüntüleneceğinde yüklenir.
   ============================================================ */

import { $, $$, renderError } from "./app.js";
import { renderHome, renderAnnouncements } from "./app.js";
import { renderNewsList, renderNewsDetail } from "./news.js";
import { renderGallery, openPhoto } from "./gallery.js";
import { renderEvents, openEventModal } from "./events.js";
import { renderProfileScreen } from "./auth.js";

const TITLES = {
    home: "Dülük Hub — Dülük Köyü",
    news: "Haberler — Dülük Hub",
    gallery: "Galeri — Dülük Hub",
    events: "Etkinlikler — Dülük Hub",
    announcements: "Duyurular — Dülük Hub",
    about: "Hakkımızda — Dülük Hub",
    profile: "Profil — Dülük Hub"
};

const LOADERS = {
    home: () => renderHome(),
    news: (params) => (params ? renderNewsDetail(params) : renderNewsList()),
    gallery: () => renderGallery(),
    events: () => renderEvents(),
    announcements: () => renderAnnouncements(),
    about: () => null,
    profile: () => renderProfileScreen()
};

function parseHash() {
    const raw = location.hash.replace(/^#\/?/, "");
    const parts = raw.split("/").filter(Boolean);
    return {
        screen: parts[0] || "home",
        param: parts[1] ? decodeURIComponent(parts[1]) : null
    };
}

async function router() {
    const { screen, param } = parseHash();
    const target = $(`.screen[data-screen="${screen}"]`);

    if (!target) {
        navigateTo("home");
        return;
    }

    $$(".screen").forEach((s) => {
        s.hidden = true;
    });
    target.hidden = false;
    target.classList.remove("active");
    void target.offsetWidth;
    target.classList.add("active");

    $$("[data-nav]").forEach((link) => {
        if (link.getAttribute("data-nav") === screen) {
            link.setAttribute("aria-current", "page");
        } else {
            link.removeAttribute("aria-current");
        }
    });

    document.title = TITLES[screen] || TITLES.home;

    const main = $("#main-content");
    if (main) main.focus({ preventScroll: true });

    closeMoreMenu();

    const loader = LOADERS[screen];
    if (!loader) return;

    try {
        await loader(param);
    } catch (err) {
        console.error(`"${screen}" ekranı yüklenemedi:`, err);
        const container = $(".screen:not([hidden]) .screen-inner");
        if (container) renderError(container, "İçerik");
    }
}

export function navigateTo(screen, param) {
    const target = "#/" + screen + (param ? "/" + encodeURIComponent(param) : "");
    if (location.hash === target) {
        router();
    } else {
        location.hash = target;
    }
}

/* ---------- Mobil "Daha" menüsü ---------- */

function initMoreMenu() {
    const moreBtn = $("#moreButton");
    const moreMenu = $("#moreMenu");
    if (!moreBtn || !moreMenu) return;

    moreBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleMoreMenu(moreMenu.hidden);
    });

    document.addEventListener("click", (e) => {
        if (moreMenu.hidden) return;
        if (!moreMenu.contains(e.target) && e.target !== moreBtn) toggleMoreMenu(false);
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") toggleMoreMenu(false);
    });

    moreMenu.querySelectorAll("a, button").forEach((item) => {
        item.addEventListener("click", () => toggleMoreMenu(false));
    });
}

function toggleMoreMenu(open) {
    const moreBtn = $("#moreButton");
    const moreMenu = $("#moreMenu");
    moreMenu.hidden = !open;
    moreBtn.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
        const first = moreMenu.querySelector("a, button");
        if (first) first.focus();
    }
}

function closeMoreMenu() {
    const moreMenu = $("#moreMenu");
    if (moreMenu && !moreMenu.hidden) toggleMoreMenu(false);
}

/* ---------- Başlatma ---------- */

export function initRouter() {
    window.addEventListener("hashchange", router);
    initMoreMenu();
    if (!location.hash) {
        location.hash = "#/home";
    } else {
        router();
    }
}