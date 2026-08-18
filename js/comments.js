/* ============================================================
   Dülük Hub — comments.js
   Haber altı yorum sistemi: ekleme, silme, listeleme.
   ============================================================ */

import { $, $$, esc, fmtDateTime, initials, toast, openModal, renderError } from "./app.js";
import { auth, db, isLive } from "./firebase.js";
import {
    collection, query, orderBy, getDocs, addDoc, deleteDoc,
    doc, serverTimestamp, where, limit
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

/* ---------- Yorumları oku ---------- */

export async function getComments(postId) {
    if (!postId) return [];

    if (await isLive()) {
        try {
            const snap = await getDocs(
                query(
                    collection(db, "comments"),
                    where("postId", "==", postId),
                    limit(50)
                )
            );
            const items = snap.docs.map((d) => {
                const data = d.data();
                return {
                    id: d.id,
                    postId: data.postId,
                    uid: data.uid || "",
                    author: data.author || "Anonim",
                    text: data.text || "",
                    createdAt: data.createdAt?.toDate?.()
                        ? data.createdAt.toDate().toISOString()
                        : new Date().toISOString()
                };
            });
            return items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } catch (err) {
            console.warn("Yorumlar okunamadı:", err);
            return [];
        }
    }

    const local = JSON.parse(localStorage.getItem("dulukhub-comments") || "[]");
    return local
        .filter((c) => c.postId === postId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/* ---------- Yorum ekle ---------- */

export async function addComment(postId, text) {
    if (!postId || !text.trim()) {
        toast("Yorum boş olamaz.", "error");
        return null;
    }

    const user = auth.currentUser;
    const author = user?.displayName || user?.email?.split("@")[0] || "Anonim";
    const uid = user?.uid || "anonymous";

    if (await isLive()) {
        try {
            const docRef = await addDoc(collection(db, "comments"), {
                postId,
                uid,
                author,
                text: text.trim(),
                createdAt: serverTimestamp()
            });
            toast("Yorum eklendi!", "success");
            return docRef.id;
        } catch (err) {
            console.warn("Yorum eklenemedi:", err);
            toast("Yorum eklenemedi.", "error");
            return null;
        }
    }

    const local = JSON.parse(localStorage.getItem("dulukhub-comments") || "[]");
    const newComment = {
        id: "local-" + Date.now(),
        postId,
        uid,
        author,
        text: text.trim(),
        createdAt: new Date().toISOString()
    };
    local.push(newComment);
    localStorage.setItem("dulukhub-comments", JSON.stringify(local));
    toast("Yorum eklendi (yerel)!", "success");
    return newComment.id;
}

/* ---------- Yorum sil ---------- */

export async function deleteComment(commentId) {
    if (!commentId) return;

    if (await isLive()) {
        try {
            await deleteDoc(doc(db, "comments", commentId));
            toast("Yorum silindi.", "success");
            return true;
        } catch (err) {
            console.warn("Yorum silinemedi:", err);
            toast("Yorum silinemedi.", "error");
            return false;
        }
    }

    const local = JSON.parse(localStorage.getItem("dulukhub-comments") || "[]");
    localStorage.setItem(
        "dulukhub-comments",
        JSON.stringify(local.filter((c) => c.id !== commentId))
    );
    toast("Yorum silindi.", "success");
    return true;
}

/* ---------- Yorum UI render ---------- */

export async function renderComments(postId, container) {
    if (!container) return;

    const comments = await getComments(postId);
    const user = auth.currentUser;

    let html = '<div class="comments-section">' +
        '<h3 class="comments-title">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
        ' Yorumlar <span class="comment-count">' + comments.length + '</span></h3>';

    if (user) {
        html += '<form class="comment-form" id="commentForm">' +
            '<div class="comment-input-row">' +
            '<div class="comment-avatar">' + esc(initials(user.displayName || user.email)) + '</div>' +
            '<textarea class="comment-input" id="commentInput" placeholder="Yorumunuzu yazın..." rows="2" maxlength="500"></textarea>' +
            '</div>' +
            '<div class="comment-form-actions">' +
            '<span class="comment-char-count"><span id="commentCharCount">0</span>/500</span>' +
            '<button type="submit" class="btn btn-primary btn-sm">Gönder</button>' +
            '</div>' +
            '</form>';
    } else {
        html += '<p class="comment-login-hint">Yorum yapmak için <a href="#/profile">giriş yapın</a>.</p>';
    }

    html += '<div class="comments-list" id="commentsList">';

    if (!comments.length) {
        html += '<div class="comment-empty">Henüz yorum yok. İlk yorumu sen yap!</div>';
    } else {
        comments.forEach((c) => {
            const isOwner = user && (user.uid === c.uid || user.uid === "admin");
            html += '<div class="comment-item" data-comment-id="' + esc(c.id) + '">' +
                '<div class="comment-header">' +
                '<div class="comment-avatar small">' + esc(initials(c.author)) + '</div>' +
                '<div class="comment-meta">' +
                '<strong class="comment-author">' + esc(c.author) + '</strong>' +
                '<time class="comment-date">' + fmtDateTime(c.createdAt) + '</time>' +
                '</div>' +
                (isOwner ? '<button type="button" class="comment-delete" data-delete="' + esc(c.id) + '" aria-label="Yorumu sil">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>' +
                    '</button>' : '') +
                '</div>' +
                '<p class="comment-text">' + esc(c.text) + '</p>' +
                '</div>';
        });
    }

    html += '</div></div>';
    container.innerHTML = html;

    /* ---------- Olay bağlayıcıları ---------- */

    const form = container.querySelector("#commentForm");
    const input = container.querySelector("#commentInput");
    const charCount = container.querySelector("#commentCharCount");

    if (input && charCount) {
        input.addEventListener("input", () => {
            charCount.textContent = input.value.length;
        });
    }

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const text = input.value.trim();
            if (!text) return;

            const submitBtn = form.querySelector('[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = "Gönderiliyor...";
            }

            const newId = await addComment(postId, text);
            if (newId) {
                input.value = "";
                if (charCount) charCount.textContent = "0";
                await renderComments(postId, container);
            }

            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = "Gönder";
            }
        });
    }

    $$(".comment-delete", container).forEach((btn) => {
        btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            const cid = btn.dataset.delete;
            if (confirm("Bu yorumu silmek istediğinize emin misiniz?")) {
                await deleteComment(cid);
                await renderComments(postId, container);
            }
        });
    });
}
