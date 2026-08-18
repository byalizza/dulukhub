/* ============================================================
   Dülük Hub — news.js
   Haberler: karşılama (hero), öne çıkan haber, filtreli ızgara
   ve ekran içi detay görünümü.
   ============================================================ */

import { $, $$, esc, fmtDate, imgFallback, renderError } from "./app.js";
import { listPosts } from "./firebase.js";
import { trackNewsClick } from "./analytics.js";
import { getCurrentUser } from "./auth.js";

let cachedPosts = [];
let currentFilter = "Tümü";

const CATEGORY_LABELS = {
    "Güncel": "Güncel"
};

const RECENT_MS = 7 * 24 * 60 * 60 * 1000;

export async function renderNewsList() {
    const el = $("#newsContent");

    if (!cachedPosts.length) {
        el.innerHTML =
            '<section class="hero-banner">' +
            '<span class="hero-eyebrow">🌾 Dülük Mahallesi</span>' +
            "<h1>Dülük Mahallesi'nin Dijital Buluşma Noktasına Hoş Geldiniz</h1>" +
            "<p>Dülük Mahallesi'nden haberler, etkinlikler, çekilişler ve köyümüzün hikayesi — hepsi bir arada.</p>" +
            "</section>" +
            '<header class="screen-head"><h1>Haberler</h1><p>Dülük Mahallesi&rsquo;nden son haberler</p></header>' +
            '<div class="skeleton" style="height:220px;border-radius:16px"></div>' +
            '<div class="news-grid">' +
            '<div class="skeleton" style="height:130px;border-radius:16px"></div>'.repeat(4) +
            "</div>";
    }

    try {
        cachedPosts = await listPosts();
        currentFilter = "Tümü";
        renderList(el);
    } catch (err) {
        console.error("Haberler yüklenemedi:", err);
        renderError(el, "Haberler");
    }
}

function renderList(el) {
    const chips = ["Tümü", "Güncel"].map((c) =>
        '<button type="button" class="chip' + (c === currentFilter ? " active" : "") + '" data-filter="' + esc(c) + '">' + esc(CATEGORY_LABELS[c] || c) + "</button>"
    ).join("");

    el.innerHTML =
        '<section class="hero-banner">' +
        '<span class="hero-eyebrow">🌾 Dülük Mahallesi</span>' +
        "<h1>Dülük Mahallesi'nin Dijital Buluşma Noktasına Hoş Geldiniz</h1>" +
        "<p>Dülük Mahallesi'nden haberler, etkinlikler, çekilişler ve köyümüzün hikayesi — hepsi bir arada.</p>" +
        "</section>" +
        '<header class="screen-head"><h1>Haberler</h1><p>Dülük Köyü&rsquo;nden son haberler</p></header>' +
        '<div class="tabs" role="tablist" aria-label="Haber kategorisi">' + chips + "</div>" +
        '<div class="news-panel" id="newsPanel"></div>';

    $$(".tabs .chip", el).forEach((chip) => {
        chip.addEventListener("click", () => {
            currentFilter = chip.dataset.filter;
            $$(".tabs .chip", el).forEach((c) => c.classList.toggle("active", c === chip));
            renderItems($("#newsPanel"));
        });
    });

    renderItems($("#newsPanel"));
}

function renderItems(panel) {
    const filtered = currentFilter === "Güncel"
        ? cachedPosts.filter((p) => new Date(p.date).getTime() >= Date.now() - RECENT_MS)
        : cachedPosts;

    if (!filtered.length) {
        panel.innerHTML =
            '<div class="empty-state">' +
            '<span class="empty-emoji">🌾</span>' +
            "<h4>Bu kategoride henüz haber yok.</h4>" +
            "<p>Yeni haberler burada görünecek. Bizi takip etmeye devam et!</p>" +
            "</div>";
        return;
    }

    const featured = filtered[0];
    const rest = filtered.slice(1);

    panel.innerHTML =
        '<button type="button" class="featured-news" data-news-id="' + encodeURIComponent(featured.id) + '" aria-label="' + esc(featured.title) + '">' +
        '<div class="featured-cover">' +
        '<img src="' + esc(featured.cover) + '" alt="' + esc(featured.title) + '" width="960" height="540">' +
        "</div>" +
        '<div class="featured-body">' +
        '<div class="news-card-meta"><time>' + fmtDate(featured.date) + "</time></div>" +
        "<h2>" + esc(featured.title) + "</h2>" +
        "<p>" + esc(featured.description) + "</p>" +
        '<span class="featured-more">Devamını oku</span>' +
        "</div></button>" +
        (rest.length ? '<div class="news-grid">' + rest.map((p) => newsCard(p)).join("") + "</div>" : "");

    $$(".featured-news img, .news-card img", panel).forEach((img) => imgFallback(img, "Haber görseli"));

    $$(".featured-news, .news-card", panel).forEach((card) => {
        card.addEventListener("click", () => {
            const newsId = card.dataset.newsId;
            const user = getCurrentUser();
            trackNewsClick(newsId, user ? user.uid : null);
            location.hash = "#/news/" + encodeURIComponent(newsId);
        });
    });
}

function newsCard(p) {
    return (
        '<button type="button" class="news-card" data-news-id="' + encodeURIComponent(p.id) + '" aria-label="' + esc(p.title) + '">' +
        '<div class="news-card-cover">' +
        '<img src="' + esc(p.cover) + '" alt="' + esc(p.title) + '" loading="lazy" width="192" height="192">' +
        "</div>" +
        '<div class="news-card-body">' +
        '<div class="news-card-meta"><time>' + fmtDate(p.date) + "</time></div>" +
        "<h3>" + esc(p.title) + "</h3>" +
        "<p>" + esc(p.description) + "</p>" +
        "</div></button>"
    );
}

/* ---------- Haber detayı ---------- */

export async function renderNewsDetail(id) {
    const el = $("#newsContent");
    el.innerHTML =
        '<div class="news-detail">' +
        '<button type="button" class="back-link" id="newsBack">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>' +
        "Haberler</button>" +
        '<div class="skeleton" style="height:30px;width:70%"></div>' +
        '<div class="skeleton" style="height:16px;width:40%;margin-top:12px"></div>' +
        '<div class="skeleton" style="height:220px;margin-top:18px;border-radius:14px"></div>' +
        "</div>";

    $("#newsBack").addEventListener("click", () => {
        location.hash = "#/news";
    });

    try {
        const posts = await listPosts();
        const post = posts.find((p) => p.id === id);

        if (!post) {
            el.innerHTML =
                '<div class="error-state"><h3>Haber bulunamadı.</h3>' +
                '<button type="button" class="btn btn-primary btn-sm" id="newsBack2">Haberler</button></div>';
            $("#newsBack2").addEventListener("click", () => (location.hash = "#/news"));
            return;
        }

        const paragraphs = Array.isArray(post.content) && post.content.length
            ? post.content
            : [post.description || "Bu haber için henüz detay eklenmedi."];
        const lead = post.description ? '<p class="lead">' + esc(post.description) + "</p>" : "";

        el.innerHTML =
            '<div class="news-detail">' +
            '<button type="button" class="back-link" id="newsBack">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>' +
            "Haberler</button>" +
            "<h1>" + esc(post.title) + "</h1>" +
            '<div class="news-detail-meta"><time datetime="' + esc(post.date) + '">' + fmtDate(post.date) + "</time></div>" +
            '<div class="news-detail-cover">' +
            '<img src="' + esc(post.cover) + '" alt="' + esc(post.title) + '" width="960" height="540">' +
            "</div>" +
            '<div class="content">' + lead + paragraphs.map((p) => "<p>" + esc(p) + "</p>").join("") + "</div>" +
            "</div>";

        $("#newsBack").addEventListener("click", () => {
            location.hash = "#/news";
        });

        const coverImg = $(".news-detail-cover img", el);
        if (coverImg) imgFallback(coverImg, "Haber görseli");
    } catch (err) {
        console.error("Haber detayı yüklenemedi:", err);
        renderError(el, "Haber");
    }
}
