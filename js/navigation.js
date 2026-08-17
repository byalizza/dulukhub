/* ============================================================
   Dülük Hub — navigation.js
   Merkezi ekran yöneticisi, hash tabanlı SPA yönlendirme,
   sol çekmece menü, alt gezinti çubuğu ve yukarı çık butonu.
   ============================================================ */

import { $, $$, renderError } from "./app.js";
import { renderNewsList, renderNewsDetail } from "./news.js";
import { renderAnnouncements } from "./announcements.js";
import { renderGallery, openPhoto } from "./gallery.js";
import { renderEvents, openEventModal } from "./events.js";
import { renderGiveaways } from "./giveaway.js";
import { renderStories } from "./stories.js";
import { renderHeritage } from "./heritage.js";
import { renderSettings } from "./settings.js";
import { renderSocial } from "./social.js";
import { renderProfileScreen, renderAdminPanel } from "./auth.js";

const TITLES = {
    news: "Haberler — Dülük Hub",
    announcements: "Duyurular — Dülük Hub",
    events: "Etkinlikler — Dülük Hub",
    giveaway: "Çekilişler — Dülük Hub",
    gallery: "Köy Galerisi — Dülük Hub",
    stories: "Köy Hikayeleri — Dülük Hub",
    heritage: "Tarihi Eserler — Dülük Hub",
    settings: "Ayarlar — Dülük Hub",
    social: "Sosyal Medya — Dülük Hub",
    profile: "Profil — Dülük Hub",
    admin: "Yönetim — Dülük Hub"
};

const LOADERS = {
    news: (params) => (params ? renderNewsDetail(params) : renderNewsList()),
    announcements: () => renderAnnouncements(),
    events: () => renderEvents(),
    giveaway: () => renderGiveaways(),
    gallery: () => renderGallery(),
    stories: () => renderStories(),
    heritage: () => renderHeritage(),
    settings: () => renderSettings(),
    social: () => renderSocial(),
    profile: () => renderProfileScreen(),
    admin: () => renderAdminPanel()
};

function parseHash() {
    const raw = location.hash.replace(/^#\/?/, "");
    const parts = raw.split("/").filter(Boolean);
    return {
        screen: parts[0] || "news",
        param: parts[1] ? decodeURIComponent(parts[1]) : null
    };
}

async function router() {
    const { screen, param } = parseHash();
    const target = $(`.screen[data-screen="${screen}"]`);

    if (!target) {
        navigateTo("news");
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

    document.title = TITLES[screen] || TITLES.news;

    const main = $("#main-content");
    if (main) main.focus({ preventScroll: true });

    closeDrawer();
    syncScrollTop(target);

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

/* ---------- Çekmece menü ---------- */

function isDesktop() {
    return window.matchMedia("(min-width: 900px)").matches;
}

function isDrawerOpen() {
    const drawer = $("#drawer");
    if (!drawer) return true;
    return isDesktop() ? !drawer.classList.contains("closed") : drawer.classList.contains("open");
}

function setDrawer(open) {
    const drawer = $("#drawer");
    const scrim = $("#drawerScrim");
    const btn = $("#menuButton");
    if (!drawer) return;

    if (isDesktop()) {
        drawer.classList.toggle("closed", !open);
        if (scrim) scrim.hidden = true;
    } else {
        drawer.classList.toggle("open", open);
        if (scrim) scrim.hidden = !open;
    }
    if (btn) btn.setAttribute("aria-expanded", String(open));
}

export function toggleDrawer() {
    setDrawer(!isDrawerOpen());
}

export function closeDrawer() {
    if (!isDesktop()) setDrawer(false);
}

function initDrawer() {
    const btn = $("#menuButton");
    const scrim = $("#drawerScrim");

    if (btn) {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleDrawer();
        });
    }
    if (scrim) {
        scrim.addEventListener("click", () => closeDrawer());
    }

    $$("#drawer a[data-nav], #drawer button").forEach((item) => {
        item.addEventListener("click", () => {
            if (!isDesktop()) closeDrawer();
        });
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && isDrawerOpen() && !isDesktop()) closeDrawer();
    });

    window.addEventListener("resize", () => {
        setDrawer(isDesktop() ? true : false);
    });

    const brandBtn = $("#brandButton");
    if (brandBtn) brandBtn.addEventListener("click", () => navigateTo("news"));
}

/* ---------- Alt gezinti çubuğu ---------- */

function initTabBar() {
    $$(".tab-bar [data-nav]").forEach((btn) => {
        btn.addEventListener("click", () => navigateTo(btn.dataset.nav));
    });
}

/* ---------- Yukarı çık butonu ---------- */

function syncScrollTop(target) {
    const btn = $("#scrollTop");
    if (btn) btn.classList.toggle("show", target.scrollTop > 260);
}

function initScrollTop() {
    const btn = $("#scrollTop");
    if (!btn) return;

    btn.addEventListener("click", () => {
        const active = $(".screen:not([hidden])");
        if (active) active.scrollTo({ top: 0, behavior: "smooth" });
    });

    document.addEventListener(
        "scroll",
        () => {
            const active = $(".screen:not([hidden])");
            if (active) syncScrollTop(active);
        },
        { capture: true, passive: true }
    );
}

/* ---------- Sayfa alt bilgisi ---------- */

const FOOTER_HTML =
    '<footer class="app-footer">' +
    '<a class="footer-ig" href="https://instagram.com/dulukhub" target="_blank" rel="noopener noreferrer">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor"/></svg>@dulukhub</a>' +
    "<span>Dülük Köyü'nün dijital buluşma noktası</span>" +
    "<span>© 2026 Dülük Köyü</span>" +
    "</footer>";

function injectFooters() {
    $$(".screen").forEach((screen) => {
        if (!screen.querySelector(".app-footer")) {
            screen.insertAdjacentHTML("beforeend", FOOTER_HTML);
        }
    });
}

/* ---------- Başlatma ---------- */

export function initRouter() {
    initDrawer();
    initTabBar();
    initScrollTop();
    injectFooters();

    // İlk yüklemede masaüstünde çekmece açık olsun
    setDrawer(!isDesktop() ? false : true);

    window.addEventListener("hashchange", router);
    if (!location.hash) {
        location.hash = "#/news";
    } else {
        router();
    }
}