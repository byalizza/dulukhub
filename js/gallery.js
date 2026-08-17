/* ============================================================
   Dülük Hub — gallery.js
   Galeri: kategori filtreli ızgara, fade-in ve lightbox (klavye).
   ============================================================ */

import { $, $$, esc, fmtDate, imgFallback, openModal, renderError } from "./app.js";
import { listPhotos } from "./firebase.js";

let cachedPhotos = [];
let currentCat = "Tümü";

export async function renderGallery() {
    const el = $("#galleryContent");
    el.innerHTML =
        '<header class="screen-head"><h1>Köy Galerisi</h1><p>Köyümüzden kareler</p></header>' +
        '<div class="gallery-grid">' +
        '<div class="skeleton" style="aspect-ratio:1/1;border-radius:0"></div>'.repeat(8) +
        "</div>";

    try {
        cachedPhotos = await listPhotos();

        if (!cachedPhotos.length) {
            el.innerHTML =
                '<header class="screen-head"><h1>Köy Galerisi</h1><p>Köyümüzden kareler</p></header>' +
                '<div class="empty-state">' +
                '<span class="empty-emoji">📷</span>' +
                "<h4>Henüz fotoğraf yok.</h4><p>İlk fotoğraflar yakında burada olacak.</p></div>";
            return;
        }

        renderGrid(el);
    } catch (err) {
        console.error("Galeri yüklenemedi:", err);
        renderError(el, "Galeri");
    }
}

function renderGrid(el) {
    const cats = ["Tümü", "Doğa", "Etkinlik", "Köy"].filter((c) =>
        c === "Tümü" || cachedPhotos.some((p) => (p.category || "").trim() === c)
    );

    const chips = cats.map((c) =>
        '<button type="button" class="chip' + (c === currentCat ? " active" : "") + '" data-cat="' + esc(c) + '">' + esc(c) + "</button>"
    ).join("");

    el.innerHTML =
        '<header class="screen-head"><h1>Köy Galerisi</h1><p>Köyümüzden kareler</p></header>' +
        '<div class="tabs" role="tablist" aria-label="Galeri kategorisi">' + chips + "</div>" +
        '<div class="gallery-grid" id="photoGrid"></div>';

    $$(".tabs .chip", el).forEach((chip) => {
        chip.addEventListener("click", () => {
            currentCat = chip.dataset.cat;
            $$(".tabs .chip", el).forEach((c) => c.classList.toggle("active", c === chip));
            renderPhotos($("#photoGrid"));
        });
    });

    renderPhotos($("#photoGrid"));
}

function renderPhotos(grid) {
    const filtered = currentCat === "Tümü"
        ? cachedPhotos
        : cachedPhotos.filter((p) => (p.category || "").trim() === currentCat);

    if (!filtered.length) {
        grid.innerHTML =
            '<div class="empty-state" style="grid-column:1/-1">' +
            '<span class="empty-emoji">🌿</span>' +
            "<h4>Bu kategoride fotoğraf yok.</h4></div>";
        return;
    }

    const baseIndex = cachedPhotos.indexOf(filtered[0]);

    grid.innerHTML = filtered.map((p, i) => {
        const idx = baseIndex + i;
        return (
            '<button type="button" class="gallery-item" data-index="' + idx + '" aria-label="Fotoğraf: ' + esc(p.title || "Köyümüzden kare") + '">' +
            '<img src="' + esc(p.thumbs) + '" alt="' + esc(p.title || "Köyümüzden kare") + '" loading="lazy" width="400" height="400">' +
            "</button>"
        );
    }).join("");

    $$(".gallery-item img", grid).forEach((img) => {
        imgFallback(img, "Fotoğraf");
        if (img.complete && img.naturalWidth) img.classList.add("loaded");
        else img.addEventListener("load", () => img.classList.add("loaded"), { once: true });
        img.addEventListener("error", () => img.classList.add("loaded"), { once: true });
    });

    $$(".gallery-item", grid).forEach((item) => {
        item.addEventListener("click", () => openPhoto(Number(item.dataset.index)));
    });
}

/* ---------- Lightbox ---------- */

function lightboxContent(photo) {
    return (
        '<button type="button" class="lightbox-close lb-close" aria-label="Kapat">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>' +
        '<span class="lightbox-counter lb-counter" aria-live="polite"></span>' +
        '<button type="button" class="lightbox-nav prev lb-prev" aria-label="Önceki fotoğraf">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>' +
        '<img class="lightbox-img" src="" alt="">' +
        '<button type="button" class="lightbox-nav next lb-next" aria-label="Sonraki fotoğraf">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>' +
        '<div class="lightbox-caption"><strong class="lb-title"></strong><span class="lb-desc"></span><span class="lb-date" style="display:block"></span></div>'
    );
}

export function openPhoto(index) {
    const photos = cachedPhotos;
    if (!photos.length) return;

    let state = { i: (index + photos.length) % photos.length };

    const onKey = (e) => {
        if (e.key === "ArrowRight") nav(1);
        if (e.key === "ArrowLeft") nav(-1);
    };

    const mount = openModal({
        variant: "bare",
        title: "Fotoğraf",
        content: lightboxContent(photos[state.i]),
        onClose: () => document.removeEventListener("keydown", onKey)
    });
    const dialog = mount.dialog;

    const update = () => {
        const photo = photos[state.i];
        const img = dialog.querySelector(".lightbox-img");
        img.src = photo.full;
        img.alt = photo.title || "Fotoğraf";
        dialog.querySelector(".lb-counter").textContent = state.i + 1 + " / " + photos.length;
        dialog.querySelector(".lb-title").textContent = photo.title || "";
        dialog.querySelector(".lb-desc").textContent = photo.description || "";
        dialog.querySelector(".lb-date").textContent = fmtDate(photo.date);
        dialog.setAttribute("aria-label", photo.title || "Fotoğraf");
    };

    const nav = (dir) => {
        state.i = (state.i + dir + photos.length) % photos.length;
        update();
    };

    document.addEventListener("keydown", onKey);

    dialog.querySelector(".lb-close").addEventListener("click", () => mount.close());
    dialog.querySelector(".lb-prev").addEventListener("click", () => nav(-1));
    dialog.querySelector(".lb-next").addEventListener("click", () => nav(1));

    update();
}