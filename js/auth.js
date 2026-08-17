/* ============================================================
   Dülük Hub — auth.js
   Giriş / kayıt, profil ve admin yönetimi (haber, fotoğraf,
   etkinlik, duyuru ekleme / silme).
   Not: Yetkiler Firestore Security Rules ile korunur; yalnızca
   UI'da gizlenmesi güvenlik değildir. İlk admin, Firebase
   konsolundan users/{uid} doc'una role: "admin" eklenerek atanır.
   ============================================================ */

import { $, $$, esc, toast, initials, fmtDate, openModal } from "./app.js";
import {
    auth,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
    createPost,
    createPhoto,
    createEvent,
    createAnnouncement,
    deleteItem,
    saveUserProfile,
    getUserProfile,
    uploadPhotoFile,
    listPosts,
    listPhotos,
    listEvents,
    listAnnouncements
} from "./firebase.js";

let currentUser = null;
let currentProfile = null;
let adminListsState = null;

const AUTH_ERRORS = {
    "auth/invalid-email": "Geçersiz e-posta adresi.",
    "auth/user-not-found": "Bu e-posta ile kayıtlı hesap bulunamadı.",
    "auth/wrong-password": "Şifre hatalı.",
    "auth/invalid-credential": "E-posta veya şifre hatalı.",
    "auth/email-already-in-use": "Bu e-posta zaten kayıtlı.",
    "auth/weak-password": "Şifre en az 6 karakter olmalı.",
    "auth/too-many-requests": "Çok fazla deneme yapıldı. Lütfen biraz bekleyin.",
    "auth/network-request-failed": "Ağ bağlantısı kurulamadı. Tekrar deneyin.",
    "auth/internal-error": "Beklenmeyen bir hata oluştu. Tekrar deneyin."
};

function errorMessage(err) {
    return AUTH_ERRORS[err && err.code] || "Bir hata oluştu. Tekrar deneyin.";
}

/* ---------- Oturum ---------- */

export function initAuth() {
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        currentProfile = null;

        if (user) {
            try {
                currentProfile = await getUserProfile(user.uid);
            } catch (err) {
                console.warn("Kullanıcı profili yüklenemedi:", err);
            }
            if (!currentProfile) {
                currentProfile = {
                    displayName: user.displayName || "",
                    username: "",
                    email: user.email || "",
                    role: "user"
                };
                saveUserProfile(user.uid, {
                    uid: user.uid,
                    displayName: currentProfile.displayName,
                    username: currentProfile.username,
                    email: user.email,
                    createdAt: new Date().toISOString(),
                    role: "user"
                }).catch((err) => console.warn("Profil oluşturulamadı:", err));
            }
        }

        updateHeader();

        const profileScreen = $('.screen[data-screen="profile"]');
        if (profileScreen && !profileScreen.hidden) {
            renderProfileScreen();
        }
    });
}

function updateHeader() {
    const name = currentUser ? (currentProfile && currentProfile.displayName) || currentUser.email || "?" : null;
    $("#headerAvatar").textContent = currentUser ? initials(name) : "G";
    const label = $("#moreProfileLabel");
    if (label) label.textContent = currentUser ? "Profilim" : "Giriş Yap";
}

/* ---------- Profil ekranı ---------- */

export async function renderProfileScreen() {
    const el = $("#profileContent");

    if (!currentUser) {
        renderAuthForms(el, false);
        return;
    }

    const p = currentProfile || {};
    const email = (currentUser.email || p.email || "").trim();
    const displayName = p.displayName && p.displayName.trim() ? p.displayName.trim() : email.split("@")[0];

    el.innerHTML =
        '<header class="screen-head"><h1>Profil</h1><p>Hesap bilgilerin</p></header>' +
        '<div class="card profile-card">' +
        '<div class="profile-avatar" aria-hidden="true">' + esc(initials(displayName)) + "</div>" +
        "<h2>" + esc(displayName) + "</h2>" +
        '<p class="email">' + esc(email) + "</p>" +
        '<ul class="profile-details">' +
        "<li><span>Katılım</span><strong>" + esc(fmtDate(currentUser.metadata && currentUser.metadata.creationTime)) + "</strong></li>" +
        (p.username ? "<li><span>Kullanıcı adı</span><strong>@" + esc(p.username) + "</strong></li>" : "") +
        "</ul>" +
        '<div class="profile-actions">' +
        '<button type="button" class="btn btn-ghost" data-profile-action="edit">Profili Düzenle</button>' +
        '<button type="button" class="btn btn-danger" data-profile-action="logout">Çıkış Yap</button>' +
        "</div></div>";

    $("[data-profile-action='edit']", el).addEventListener("click", openEditProfileModal);
    $("[data-profile-action='logout']", el).addEventListener("click", async () => {
        try {
            await signOut(auth);
            toast("Çıkış yapıldı.");
            location.hash = "#/home";
        } catch (err) {
            console.error("Çıkış hatası:", err);
            toast("Çıkış yapılamadı.", "error");
        }
    });

    if (p.role === "admin") {
        await renderAdminSection(el);
    }
}

/* ---------- Giriş / kayıt ---------- */

function renderAuthForms(el, isRegister) {
    el.innerHTML =
        '<div class="card auth-card">' +
        '<div class="auth-head">' +
        "<h1>" + (isRegister ? "Hesap Oluştur" : "Giriş Yap") + "</h1>" +
        "<p>" + (isRegister ? "Dülük Hub'a katıl" : "Dülük Hub'a hoş geldin") + "</p>" +
        "</div>" +
        '<form class="form" id="authForm" novalidate>' +
        (isRegister
            ? '<div class="field"><label for="afUsername">Kullanıcı adı</label>' +
              '<input id="afUsername" name="username" maxlength="24" autocomplete="username"></div>'
            : "") +
        '<div class="field"><label for="afEmail">E-posta</label>' +
        '<input id="afEmail" name="email" type="email" autocomplete="email" required></div>' +
        '<div class="field"><label for="afPassword">Şifre</label>' +
        '<input id="afPassword" name="password" type="password" autocomplete="' + (isRegister ? "new-password" : "current-password") + '" required>' +
        (isRegister ? '<p class="error" id="afHint" hidden></p>' : "") +
        "</div>" +
        '<div class="form-error" id="afError" hidden></div>' +
        '<button type="submit" class="btn btn-primary btn-block">' + (isRegister ? "Kayıt Ol" : "Giriş Yap") + "</button>" +
        "</form>" +
        '<p class="form-alt" style="margin-top:16px">' +
        (isRegister ? "Zaten hesabın var mı? " : "Hesabın yok mu? ") +
        '<button type="button" id="afToggle">' + (isRegister ? "Giriş Yap" : "Kayıt Ol") + "</button></p>" +
        "</div>";

    const form = $("#authForm", el);
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        submitAuth(isRegister, form);
    });

    $("#afToggle", el).addEventListener("click", () => {
        renderAuthForms(el, !isRegister);
    });
}

async function submitAuth(isRegister, form) {
    const errorBox = $("#afError", form);

    const email = form.elements.email.value.trim();
    const password = form.elements.password.value;
    const username = form.elements.username ? form.elements.username.value.trim() : "";

    errorBox.hidden = true;

    if (!email || !password) {
        toast("E-posta ve şifre gerekli.", "error");
        return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        toast("Geçerli bir e-posta adresi girin.", "error");
        return false;
    }
    if (isRegister && password.length < 6) {
        toast("Şifre en az 6 karakter olmalı.", "error");
        return false;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
        if (isRegister) {
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            const safeUsername = username || email.split("@")[0];
            await updateProfile(cred.user, { displayName: safeUsername });
            await saveUserProfile(cred.user.uid, {
                uid: cred.user.uid,
                displayName: safeUsername,
                username: safeUsername,
                email,
                createdAt: new Date().toISOString(),
                role: "user"
            });
            toast("Hesabın oluşturuldu. Hoş geldin!");
        } else {
            await signInWithEmailAndPassword(auth, email, password);
            toast("Giriş yapıldı.");
        }
    } catch (err) {
        console.error("Kimlik doğrulama hatası:", err);
        errorBox.textContent = errorMessage(err);
        errorBox.hidden = false;
        submitBtn.disabled = false;
        return false;
    }
    return true;
}

/* ---------- Profil düzenle ---------- */

function openEditProfileModal() {
    const p = currentProfile || {};
    openModal({
        title: "Profili Düzenle",
        content:
            '<form class="form" id="editProfileForm" novalidate>' +
            '<div class="field"><label for="epName">Ad soyad</label>' +
            '<input id="epName" maxlength="40" value="' + esc(p.displayName || "") + '"></div>' +
            '<div class="field"><label for="epUsername">Kullanıcı adı</label>' +
            '<input id="epUsername" maxlength="24" value="' + esc(p.username || "") + '"></div>' +
            '<button type="submit" class="btn btn-primary">Kaydet</button>' +
            "</form>"
    });

    const form = $("#editProfileForm");
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const displayName = $("#epName").value.trim();
        const username = $("#epUsername").value.trim();

        if (!displayName) {
            toast("Ad soyad boş bırakılamaz.", "error");
            return;
        }

        try {
            await updateProfile(auth.currentUser, { displayName });
            await saveUserProfile(currentUser.uid, { displayName, username });
            currentProfile = { ...(currentProfile || {}), displayName, username };
            updateHeader();
            renderProfileScreen();
            toast("Profil güncellendi.");
        } catch (err) {
            console.error("Profil güncellenemedi:", err);
            toast("Profil güncellenemedi.", "error");
        }
    });
}

/* ---------- Admin yönetimi ---------- */

async function renderAdminSection(el) {
    el.insertAdjacentHTML("beforeend",
        '<section class="admin-section" id="adminSection">' +
        '<div class="screen-sub"><h2>Yönetim</h2><p>İçerik ekle ve sil</p></div>' +
        '<div class="admin-forms">' +
        adminPostForm() + adminPhotoForm() + adminEventForm() + adminAnnounceForm() +
        "</div>" +
        '<div id="adminLists" style="margin-top:26px"></div>' +
        "</section>"
    );

    bindAdminForms(el);
    await updateAdminLists();
}

function adminPostForm() {
    return (
        '<form class="card admin-form" data-admin-form="post" novalidate>' +
        "<h3>Haber Ekle</h3>" +
        '<div class="field"><label for="apTitle">Başlık *</label><input id="apTitle" maxlength="150" required></div>' +
        '<div class="field"><label for="apDesc">Kısa açıklama</label><textarea id="apDesc" maxlength="500"></textarea></div>' +
        '<div class="field"><label for="apCat">Kategori</label><select id="apCat"><option>Güncel</option><option>Etkinlik</option><option>Köy</option></select></div>' +
        '<div class="field"><label for="apCover">Görsel bağlantısı</label><input id="apCover" type="url" placeholder="https://..."></div>' +
        '<div class="field"><label for="apContent">İçerik (her satır bir paragraf)</label><textarea id="apContent" maxlength="8000"></textarea></div>' +
        '<button type="submit" class="btn btn-primary btn-sm">Haber Ekle</button>' +
        "</form>"
    );
}

function adminPhotoForm() {
    return (
        '<form class="card admin-form" data-admin-form="photo" novalidate>' +
        "<h3>Fotoğraf Ekle</h3>" +
        '<div class="field"><label for="afTitle">Başlık *</label><input id="afTitle" maxlength="120" required></div>' +
        '<div class="field"><label for="afDesc">Açıklama</label><textarea id="afDesc" maxlength="300"></textarea></div>' +
        '<div class="field"><label for="afCat">Kategori</label><select id="afCat"><option>Köy</option><option>Doğa</option><option>Etkinlik</option></select></div>' +
        '<div class="field"><label for="afFile">Fotoğraf dosyası</label><input id="afFile" type="file" accept="image/*"></div>' +
        '<div class="field"><label for="afUrl">veya görsel bağlantısı (demo mod)</label><input id="afUrl" type="url" placeholder="https://..."></div>' +
        '<button type="submit" class="btn btn-primary btn-sm">Fotoğraf Ekle</button>' +
        "</form>"
    );
}

function adminEventForm() {
    return (
        '<form class="card admin-form" data-admin-form="event" novalidate>' +
        "<h3>Etkinlik Ekle</h3>" +
        '<div class="field"><label for="aeTitle">Etkinlik adı *</label><input id="aeTitle" maxlength="150" required></div>' +
        '<div class="field"><label for="aeDate">Tarih *</label><input id="aeDate" type="date" required></div>' +
        '<div class="field"><label for="aeTime">Saat</label><input id="aeTime" type="time"></div>' +
        '<div class="field"><label for="aeLoc">Konum</label><input id="aeLoc" maxlength="120"></div>' +
        '<div class="field"><label for="aeDesc">Açıklama</label><textarea id="aeDesc" maxlength="1500"></textarea></div>' +
        '<button type="submit" class="btn btn-primary btn-sm">Etkinlik Ekle</button>' +
        "</form>"
    );
}

function adminAnnounceForm() {
    return (
        '<form class="card admin-form" data-admin-form="announce" novalidate>' +
        "<h3>Duyuru Ekle</h3>" +
        '<div class="field"><label for="anTitle">Duyuru *</label><textarea id="anTitle" maxlength="300" required></textarea></div>' +
        '<div class="field"><label for="anImportant">Önemli duyuru</label><input id="anImportant" type="checkbox"></div>' +
        '<button type="submit" class="btn btn-primary btn-sm">Duyuru Ekle</button>' +
        "</form>"
    );
}

function bindAdminForms(el) {
    $$("[data-admin-form]", el).forEach((form) => {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            handleAdminSubmit(form);
        });
    });
}

async function handleAdminSubmit(form) {
    const type = form.dataset.adminForm;
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;

    try {
        if (type === "post") {
            const title = $("#apTitle", form).value.trim();
            if (!title) {
                toast("Başlık boş bırakılamaz.", "error");
                btn.disabled = false;
                return;
            }
            const description = $("#apDesc", form).value.trim();
            const category = $("#apCat", form).value;
            const cover = $("#apCover", form).value.trim();
            const content = $("#apContent", form).value.split("\n").map((l) => l.trim()).filter(Boolean);
            await createPost({
                title,
                description,
                category,
                imageUrl: cover,
                content,
                authorId: currentUser.uid,
                date: new Date().toISOString()
            });
            toast("Haber eklendi.");
        } else if (type === "photo") {
            const title = $("#afTitle", form).value.trim();
            if (!title) {
                toast("Başlık boş bırakılamaz.", "error");
                btn.disabled = false;
                return;
            }
            const description = $("#afDesc", form).value.trim();
            const category = $("#afCat", form).value;
            const file = $("#afFile", form).files[0];
            const url = $("#afUrl", form).value.trim();

            let thumbnailUrl = "";
            let imageUrl = "";
            if (file) {
                try {
                    const urls = await uploadPhotoFile(file);
                    thumbnailUrl = urls.thumbnailUrl;
                    imageUrl = urls.imageUrl;
                } catch (err) {
                    console.warn("Dosya yüklenemedi, bağlantı deneniyor:", err);
                }
            }
            if (!imageUrl && url) {
                thumbnailUrl = url;
                imageUrl = url;
            }
            if (!imageUrl) {
                toast("Fotoğraf dosyası veya görsel bağlantısı girin.", "error");
                btn.disabled = false;
                return;
            }
            await createPhoto({
                title,
                description,
                category,
                thumbnailUrl,
                imageUrl,
                authorId: currentUser.uid,
                date: new Date().toISOString()
            });
            toast("Fotoğraf eklendi.");
        } else if (type === "event") {
            const title = $("#aeTitle", form).value.trim();
            const date = $("#aeDate", form).value;
            if (!title) {
                toast("Etkinlik adı boş bırakılamaz.", "error");
                btn.disabled = false;
                return;
            }
            if (!date) {
                toast("Geçerli bir tarih seçin.", "error");
                btn.disabled = false;
                return;
            }
            await createEvent({
                title,
                date,
                time: $("#aeTime", form).value,
                location: $("#aeLoc", form).value.trim(),
                description: $("#aeDesc", form).value.trim(),
                authorId: currentUser.uid
            });
            toast("Etkinlik eklendi.");
        } else if (type === "announce") {
            const title = $("#anTitle", form).value.trim();
            if (!title) {
                toast("Duyuru boş bırakılamaz.", "error");
                btn.disabled = false;
                return;
            }
            await createAnnouncement({
                title,
                important: $("#anImportant", form).checked,
                date: new Date().toISOString(),
                authorId: currentUser.uid
            });
            toast("Duyuru yayınlandı.");
        }
        form.reset();
    } catch (err) {
        console.error("İçerik eklenemedi:", err);
        toast("İçerik eklenemedi.", "error");
    }
    btn.disabled = false;
    await updateAdminLists();
}

async function updateAdminLists() {
    const listsBox = $("#adminLists");
    if (!listsBox) return;

    const [posts, photos, events, announcements] = await Promise.allSettled([
        listPosts(),
        listPhotos(),
        listEvents(),
        listAnnouncements()
    ]);

    adminListsState = { posts, photos, events, announcements };

    const section = (title, items, kind) => {
        const rows = items.length
            ? items.slice(0, 6).map((it) => {
                const name = it.title || "";
                const date = it.date || it.eventDate || "";
                return (
                    '<li style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--color-border)">' +
                    "<span style=\"flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap\">" + esc(name) + " <small style=\"color:var(--color-muted)\">" + esc(fmtDate(date)) + "</small></span>" +
                    '<button type="button" class="btn btn-danger btn-sm" data-delete="' + kind + '" data-id="' + encodeURIComponent(it.id) + '">Sil</button>' +
                    "</li>"
                );
            }).join("")
            : "<li style=\"padding:8px 0;color:var(--color-muted)\">Henüz içerik yok.</li>";
        return (
            '<div class="card" style="padding:14px 18px;margin-bottom:14px">' +
            "<h3 style=\"margin:0 0 8px;font-size:15px\">" + esc(title) + "</h3><ul style=\"list-style:none;margin:0;padding:0\">" + rows + "</ul></div>"
        );
    };

    listsBox.innerHTML =
        section("Haberler", posts.status === "fulfilled" ? posts.value : [], "posts") +
        section("Fotoğraflar", photos.status === "fulfilled" ? photos.value : [], "photos") +
        section("Etkinlikler", events.status === "fulfilled" ? events.value : [], "events") +
        section("Duyurular", announcements.status === "fulfilled" ? announcements.value : [], "announcements") +
        '<p style="font-size:12.5px;color:var(--color-muted)">Silme işlemi yalnızca yetkili admin hesaplarıyla gerçekleşir (Firebase Security Rules).</p>';

    $$("[data-delete]", listsBox).forEach((btn) => {
        btn.addEventListener("click", () => {
            const kind = btn.dataset.delete;
            const id = decodeURIComponent(btn.dataset.id);
            removeItem(kind, id);
        });
    });
}

async function removeItem(kind, id) {
    const msg = "Bu öğe kalıcı olarak silinsin mi?";
    if (!window.confirm(msg)) return;
    try {
        await deleteItem(kind, id);
        toast("Öğe silindi.");
        await updateAdminLists();
        const screen = $('.screen:not([hidden]) .screen-inner');
        if (screen && (kind === "photos" || kind === "posts")) {
            // Görüntülenen liste varsa yenile
        }
    } catch (err) {
        console.error("Öğe silinemedi:", err);
        toast("Öğe silinemedi.", "error");
    }
}