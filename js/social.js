/* ============================================================
   Dülük Hub — social.js
   Sosyal medya: Facebook, TikTok, Telegram, Instagram
   yönlendirme butonları.
   ============================================================ */

import { $, esc } from "./app.js";

const SOCIAL_LINKS = {
    instagram: "https://instagram.com/dulukhub",
    facebook: "https://facebook.com/dulukhub",
    tiktok: "https://tiktok.com/@dulukhub",
    telegram: "https://t.me/dulukhub"
};

const ICONS = {
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>',
    telegram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>'
};

const SOCIALS = [
    { id: "instagram", name: "Instagram", handle: "@dulukhub", tile: "linear-gradient(135deg, #F58529 0%, #DD2A7B 55%, #8134AF 100%)", shadow: "rgba(221, 42, 123, 0.4)" },
    { id: "facebook", name: "Facebook", handle: "Dülük Hub", tile: "#1877F2", shadow: "rgba(24, 119, 242, 0.4)" },
    { id: "tiktok", name: "TikTok", handle: "@dulukhub", tile: "linear-gradient(135deg, #FE2C55 0%, #25F4EE 160%)", shadow: "rgba(254, 44, 85, 0.4)" },
    { id: "telegram", name: "Telegram", handle: "@dulukhub", tile: "#229ED9", shadow: "rgba(34, 158, 217, 0.4)" }
];

export async function renderSocial() {
    const el = $("#socialContent");
    if (!el) return;

    el.innerHTML =
        '<header class="screen-head"><h1>Sosyal Medya</h1><p>Bizi sosyal medyadan takip edin</p></header>' +
        '<div class="social-grid">' +
        SOCIALS.map((s) =>
            '<button type="button" class="social-card" data-link="' + s.id + '">' +
            '<span class="social-tile" style="background:' + s.tile + ';box-shadow:0 6px 18px ' + s.shadow + '">' + ICONS[s.id] + "</span>" +
            "<span class=\"social-info\"><strong>" + s.name + "</strong><small>" + esc(s.handle) + "</small></span>" +
            '<svg class="social-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>' +
            "</button>"
        ).join("") +
        "</div>";

    el.querySelectorAll(".social-card").forEach((btn) => {
        btn.addEventListener("click", () => {
            const url = SOCIAL_LINKS[btn.dataset.link];
            if (url) location.href = url;
        });
    });
}