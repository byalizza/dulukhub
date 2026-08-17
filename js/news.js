/* ============================================================
   Dülük Hub — news.js
   Haberler: filtreli liste ve ekran içi detay görünümü.
   ============================================================ */

import { $, $$, esc, fmtDate, imgFallback, renderError } from "./app.js";
import { listPosts } from "./firebase.js";

let cachedPosts = [];
let currentFilter = "Tümü";

const CATEGORY_LABELS = {
    "Güncel": "Güncel",
    "Etkinlik": "Etkinlik",
    "Köy": "Köy"
};

export async function renderNewsList() {
    const el = $("#newsContent");

    if (!cachedPosts.length) {
        el.innerHTML =
            '<header class="screen-head"><h1>Haberler</h1><p>Dülük Köyü&rsquo;nden haberler</p></header>' +
            '<div class="news-list">' +
            '<div class="skeleton" style="height:118px"></div>'.repeat(4) +
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
    const categories = ["Tümü", "Güncel", "Etkinlik", "Köy"].filter((c) =>
        c === "Tümü" || cachedPosts.some((p) => p.category === c)
    );

    const chips = categories.map((c) =>
        '<button type="button" class="chip' + (c === currentFilter ? " active" : "") + '" data-filter="' + esc(c) + '">' + esc(CATEGORY_LABELS[c] || c) + "</button>"
    ).join("");

    el.innerHTML =
        '<header class="screen-head"><h1>Haberler</h1><p>Dülük Köyü&rsquo;nden haberler</p></header>' +
        '<div class="chips" role="group" aria-label="Haber kategorisi">' + chips + "</div>" +
        '<div class="news-list" id="newsList"></div>';

    $$(".chip", el).forEach((chip) => {
        chip.addEventListener("click", () => {
            currentFilter = chip.dataset.filter;
            $$(".chip", el).forEach((c) => c.classList.toggle("active", c === chip));
            renderItems($("#newsList"));
        });
    });

    renderItems($("#newsList"));
}

function renderItems(list) {
    const filtered = currentFilter === "Tümü"
        ? cachedPosts
        : cachedPosts.filter((p) => p.category === currentFilter);

    if (!filtered.length) {
        list.innerHTML =
            '<div class="empty-state"><h4>Henüz haber bulunmuyor.</h4><p>Yeni haberler burada görünecek.</p></div>';
        return;
    }

    list.innerHTML = filtered.map((p) =>
        '<button type="button" class="news-card" data-news-id="' + encodeURIComponent(p.id) + '" aria-label="' + esc(p.title) + '">' +
        '<div class="news-card-cover">' +
        '<img src="' + esc(p.cover) + '" alt="' + esc(p.title) + '" loading="lazy" width="192" height="192">' +
        "</div>" +
        '<div class="news-card-body">' +
        '<div class="news-card-meta"><span class="badge">' + esc(p.category || "Güncel") + "</span><time>" + fmtDate(p.date) + "</time></div>" +
        "<h3>" + esc(p.title) + "</h3>" +
        "<p>" + esc(p.description) + "</p>" +
        "</div></button>"
    ).join("");

    $$(".news-card img", list).forEach((img) => imgFallback(img, "Haber görseli"));

    $$(".news-card", list).forEach((card) => {
        card.addEventListener("click", () => {
            location.hash = "#/news/" + encodeURIComponent(card.dataset.newsId);
        });
    });
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

        el.innerHTML =
            '<div class="news-detail">' +
            '<button type="button" class="back-link" id="newsBack">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>' +
            "Haberler</button>" +
            '<div class="news-detail-meta"><span class="badge">' + esc(post.category || "Güncel") + '</span><time datetime="' + esc(post.date) + '">' + fmtDate(post.date) + "</time></div>" +
            "<h1>" + esc(post.title) + "</h1>" +
            '<div class="news-detail-cover">' +
            '<img src="' + esc(post.cover) + '" alt="' + esc(post.title) + '" width="960" height="540">' +
            "</div>" +
            '<div class="content">' + paragraphs.map((p) => "<p>" + esc(p) + "</p>").join("") + "</div>" +
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
