/* ============================================================
   Dülük Hub — stories.js
   Köy hikayeleri: nesilden nesile aktarılan hatıralar.
   ============================================================ */

import { $, $$, esc, toast, fmtDate, imgFallback, initials, renderError } from "./app.js";
import { listStories } from "./firebase.js";
import { getCurrentUser } from "./auth.js";

let cachedStories = [];
let likedSet = new Set();

const LIKE_KEY = "dulukhub-story-likes";

function loadLikes() {
    try {
        likedSet = new Set(JSON.parse(localStorage.getItem(LIKE_KEY)) || []);
    } catch (err) {
        likedSet = new Set();
    }
}

function isLiked(id) {
    return likedSet.has(id);
}

function markLiked(id) {
    likedSet.add(id);
    try {
        localStorage.setItem(LIKE_KEY, JSON.stringify([...likedSet]));
    } catch (err) {
        console.warn("Beğeni kaydedilemedi:", err);
    }
}

export async function renderStories() {
    loadLikes();
    const el = $("#storiesContent");
    el.innerHTML =
        '<header class="screen-head"><h1>Köy Hikayeleri</h1><p>Nesilden nesile aktarılan hatıralar</p></header>' +
        '<div class="skeleton" style="height:140px;border-radius:14px"></div>' +
        '<div class="skeleton" style="height:140px;border-radius:14px;margin-top:14px"></div>';

    try {
        cachedStories = await listStories();

        if (!cachedStories.length) {
            el.innerHTML =
                '<header class="screen-head"><h1>Köy Hikayeleri</h1><p>Nesilden nesile aktarılan hatıralar</p></header>' +
                '<div class="empty-state">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>' +
                "<h4>Henüz hikaye yok.</h4><p>İlk hikayeyi büyüklerinizden dinleyip paylaşabilirsiniz.</p></div>";
            return;
        }

        el.innerHTML =
            '<header class="screen-head"><h1>Köy Hikayeleri</h1><p>Nesilden nesile aktarılan hatıralar</p></header>' +
            '<div class="story-list">' +
            cachedStories.map(storyCard).join("") +
            "</div>";

        $$("[data-story-id]", el).forEach((btn) => {
            btn.addEventListener("click", () => likeStory(btn.dataset.storyId, btn));
        });
        $$("[data-story-img]", el).forEach((img) => imgFallback(img, "Hikâye görseli"));
    } catch (err) {
        console.error("Hikayeler yüklenemedi:", err);
        renderError(el, "Köy Hikayeleri");
    }
}

function storyCard(s) {
    const liked = isLiked(s.id);
    const author = s.author || "Köylümüz";
    return (
        '<article class="card story-card">' +
        '<div class="story-meta" style="margin-bottom:8px">' +
        '<span class="avatars"><span>' + esc(initials(author)) + "</span></span>" +
        "<strong style=\"font-size:12.5px\">" + esc(author) + "</strong>" +
        "<span>•</span><span>" + fmtDate(s.date) + "</span>" +
        "</div>" +
        "<h3>" + esc(s.title) + "</h3>" +
        (s.imageUrl ? '<img class="story-img" src="' + esc(s.imageUrl) + '" alt="' + esc(s.title) + '" loading="lazy" data-story-img="' + encodeURIComponent(s.id) + '">' : "") +
        '<p class="content">' + esc(s.content || "") + "</p>" +
        '<div class="story-meta">' +
        '<button type="button" class="btn btn-sm ' + (liked ? "btn-primary" : "btn-ghost") + '" data-story-id="' + encodeURIComponent(s.id) + '">' +
        '<svg viewBox="0 0 24 24" fill="' + (liked ? "currentColor" : "none") + '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.5-1.6 3-3.5 3-5.5A5.5 5.5 0 0 0 12 5.5 5.5 5.5 0 0 0 2 8.5c0 2 1.5 3.9 3 5.5l7 7Z"/></svg>' +
        (liked ? "Beğendin" : "Beğen") + " (" + esc(Number(s.likes) + (liked ? 1 : 0)) + ")" +
        "</button>" +
        "</div>" +
        "</article>"
    );
}

function likeStory(id, btn) {
    const s = cachedStories.find((x) => x.id === id);
    if (!s) return;
    if (!getCurrentUser()) {
        toast("Önce giriş yapmalısın.", "error");
        return;
    }
    if (isLiked(s.id)) return;
    markLiked(s.id);
    s.likes = (Number(s.likes) || 0) + 1;
    toast("Hikayeyi beğendin.");
    renderStories();
}