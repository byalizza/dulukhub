/* ============================================================
   Dülük Hub — stories.js
   Köy hikayeleri: kart önizleme + tıklayınca tam metin modalı.
   ============================================================ */

import { $, $$, esc, toast, fmtDate, imgFallback, initials, openModal, closeModal, renderError } from "./app.js";
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
                '<span class="empty-emoji">📖</span>' +
                "<h4>Henüz hikaye yok.</h4><p>İlk hikayeyi büyüklerinizden dinleyip paylaşabilirsiniz.</p></div>";
            return;
        }

        el.innerHTML =
            '<header class="screen-head"><h1>Köy Hikayeleri</h1><p>Nesilden nesile aktarılan hatıralar</p></header>' +
            '<div class="story-list">' +
            cachedStories.map(storyCard).join("") +
            "</div>";

        $$("[data-story-id]", el).forEach((btn) => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                likeStory(btn.dataset.storyId, btn);
            });
        });
        $$("[data-open-story]", el).forEach((card) => {
            card.addEventListener("click", () => {
                const s = cachedStories.find((x) => x.id === card.dataset.openStory);
                if (s) openStoryModal(s);
            });
        });
        $$("[data-story-img]", el).forEach((img) => imgFallback(img, "Hikâye görseli"));
    } catch (err) {
        console.error("Hikayeler yüklenemedi:", err);
        renderError(el, "Köy Hikayeleri");
    }
}

function previewText(text, maxLen) {
    if (!text) return "";
    const flat = text.replace(/\n+/g, " ").trim();
    return flat.length > maxLen ? flat.slice(0, maxLen).trimEnd() + "…" : flat;
}

function storyCard(s) {
    const liked = isLiked(s.id);
    const author = s.author || "Köylümüz";
    return (
        '<article class="card story-card" data-open-story="' + encodeURIComponent(s.id) + '" tabindex="0" role="button" aria-label="' + esc(s.title) + ' — oku" style="cursor:pointer">' +
        '<div class="story-meta story-author-line" style="margin-bottom:8px">' +
        '<span class="story-author-avatar">' + esc(initials(author)) + "</span>" +
        "<strong>" + esc(author) + "</strong>" +
        "<span>•</span><span>" + fmtDate(s.date) + "</span>" +
        "</div>" +
        "<h3>" + esc(s.title) + "</h3>" +
        (s.imageUrl ? '<img class="story-img" src="' + esc(s.imageUrl) + '" alt="' + esc(s.title) + '" loading="lazy" data-story-img="' + encodeURIComponent(s.id) + '">' : "") +
        '<p class="content" style="margin:0 0 10px">' + esc(previewText(s.content, 200)) + "</p>" +
        '<div class="story-meta">' +
        '<button type="button" class="btn btn-sm ' + (liked ? "btn-primary" : "btn-ghost") + '" data-story-id="' + encodeURIComponent(s.id) + '">' +
        '<svg class="heart" viewBox="0 0 24 24" fill="' + (liked ? "currentColor" : "none") + '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.5-1.6 3-3.5 3-5.5A5.5 5.5 0 0 0 12 5.5 5.5 5.5 0 0 0 2 8.5c0 2 1.5 3.9 3 5.5l7 7Z"/></svg>' +
        (liked ? "Beğendin" : "Beğen") + " (" + esc(Number(s.likes) + (liked ? 1 : 0)) + ")" +
        "</button>" +
        '<span class="btn btn-sm btn-ghost" style="pointer-events:none">Devamını oku →</span>' +
        "</div>" +
        "</article>"
    );
}

function openStoryModal(s) {
    const author = s.author || "Köylümüz";
    const paragraphs = (s.content || "").split(/\n+/).filter((p) => p.trim());
    const body = paragraphs.length
        ? paragraphs.map((p) => "<p style=\"margin:0 0 12px;line-height:1.8\">" + esc(p) + "</p>").join("")
        : "<p style=\"line-height:1.8\">" + esc(s.content || "") + "</p>";

    openModal({
        title: s.title,
        content:
            '<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;color:var(--color-muted);font-size:13px">' +
            '<span class="story-author-avatar">' + esc(initials(author)) + "</span>" +
            "<strong>" + esc(author) + "</strong>" +
            "<span>•</span><span>" + fmtDate(s.date) + "</span>" +
            "</div>" +
            (s.imageUrl ? '<img src="' + esc(s.imageUrl) + '" alt="' + esc(s.title) + '" style="width:100%;border-radius:12px;margin-bottom:14px">' : "") +
            body +
            '<div style="margin-top:18px;display:flex;justify-content:flex-end">' +
            '<button type="button" class="btn btn-primary btn-sm js-story-close">Kapat</button></div>',
        onMount: (dialog) => {
            const c = dialog.querySelector(".js-story-close");
            if (c) c.addEventListener("click", () => closeModal());
        }
    });
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

    btn.disabled = true;
    btn.classList.remove("btn-ghost");
    btn.classList.add("btn-primary");
    const heart = btn.querySelector(".heart");
    if (heart) {
        heart.setAttribute("fill", "currentColor");
        heart.classList.add("heart-pop");
        setTimeout(() => heart.classList.remove("heart-pop"), 700);
    }
    const label = btn.childNodes[1];
    if (label) label.textContent = " Beğendin (" + s.likes + ")";
    toast("Hikayeyi beğendin.");
}