/* ============================================================
   Dülük Hub — auth.js
   Zorunlu kayıt / giriş kapısı (misafir girişi yok), profil,
   Yönetim kodu (355334) ve admin paneli.
   Not: Yetkiler Firestore Security Rules ile korunur; UI'daki
   gizleme güvenlik değildir. İlk admin, Firebase konsolundan
   users/{uid} doc'una role: "admin" eklenerek atanır.
   ============================================================ */

import { $, $$, esc, toast, initials, fmtDate, openModal, closeModal } from "./app.js";
import { navigateTo } from "./navigation.js";
import {
    auth,
    authMode,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
    saveUserProfile,
    getUserProfile,
    demoGetSession,
    demoSetSession,
    createPost,
    createPhoto,
    createEvent,
    createAnnouncement,
    createGiveaway,
    createStory,
    createHeritageItem,
    deleteItem,
    processPhotoFile,
    listPosts,
    listPhotos,
    listEvents,
    listAnnouncements,
    listGiveaways,
    listStories,
    listHeritage
} from "./firebase.js";

const ADMIN_CODE = "355334";
const ADMIN_SESSION_KEY = "dulukhub-admin-session";
const DEMO_USERS_KEY = "dulukhub-demo-users";

let currentUser = null;
let currentProfile = null;
let authModeValue = "demo";

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

function normalizePhone(raw) {
    const digits = String(raw || "").replace(/\D/g, "");
    if (!digits || digits.length < 10) return "";
    return digits.length === 10 ? "+90" + digits : "+" + digits;
}

function phoneToEmail(phone) {
    return "phone" + phone.replace(/\D/g, "") + "@dulukhub.app";
}

/* ---------- Oturum erişimcileri ---------- */

export function getCurrentUser() {
    return currentUser;
}

export function getCurrentProfile() {
    return currentProfile;
}

export function isAdminSession() {
    return localStorage.getItem(ADMIN_SESSION_KEY) === "1" && !!currentProfile && currentProfile.role === "admin";
}

function setAdminSession(on) {
    if (on) localStorage.setItem(ADMIN_SESSION_KEY, "1");
    else localStorage.removeItem(ADMIN_SESSION_KEY);
}

/* ---------- Oturum başlangıcı ---------- */

export function initAuth() {
    const drawerLogout = $("#drawerLogout");
    if (drawerLogout) drawerLogout.addEventListener("click", logout);

    authMode().then((mode) => {
        authModeValue = mode;
        if (mode === "live") {
            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    await loadProfile(user.uid, {
                        displayName: user.displayName || "",
                        email: user.email || ""
                    });
                } else {
                    endSession();
                }
            });
        } else {
            const session = demoGetSession();
            if (session && session.uid) {
                loadProfile(session.uid, session);
            } else {
                endSession();
            }
        }
    });
}

async function loadProfile(uid, defaults) {
    currentUser = { uid, email: defaults.email || "", displayName: defaults.displayName || "" };
    currentProfile = null;
    try {
        currentProfile = await getUserProfile(uid);
    } catch (err) {
        console.warn("Kullanıcı profili yüklenemedi:", err);
    }
    if (!currentProfile) {
        currentProfile = {
            uid,
            username: defaults.displayName || "",
            displayName: defaults.displayName || "",
            email: defaults.email || "",
            phone: defaults.phone || "",
            role: "user",
            createdAt: new Date().toISOString()
        };
        saveUserProfile(uid, currentProfile).catch(() => {});
    }
    startSession();
}

function startSession() {
    $("#authGate").hidden = true;
    $("#app").hidden = false;
    if (!location.hash || location.hash === "#/" || location.hash === "#/news") {
        navigateTo("news");
    } else {
        navigateTo(parseScreen());
    }
}

function endSession() {
    currentUser = null;
    currentProfile = null;
    setAdminSession(false);
    if (authModeValue === "live" && auth.currentUser) {
        signOut(auth).catch(() => {});
    }
    $("#app").hidden = true;
    const gate = $("#authGate");
    gate.hidden = false;
    renderGate("login");
    bindGate();
}

function parseScreen() {
    const raw = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean)[0] || "news";
    return ["news", "announcements", "events", "giveaway", "gallery", "stories", "heritage", "settings", "social", "profile", "admin"].includes(raw) ? raw : "news";
}

/* ---------- Kayıt / giriş kapısı ---------- */

function renderGate(mode) {
    const host = $("#gateContent");
    const isRegister = mode === "register";
    const modeVal = gateMode;

    host.innerHTML =
        '<div class="card auth-card">' +
        '<div class="auth-head">' +
        "<h2>" + (isRegister ? "Hesap Oluştur" : "Giriş Yap") + "</h2>" +
        "<p>" + (isRegister ? "Dülük Hub'a kayıt ol ve köyün dijital hayatına katıl." : "Dülük Hub'a hoş geldin. Devam etmek için giriş yap.") + "</p>" +
        "</div>" +
        '<div class="chips gate-tabs">' +
        '<button type="button" class="chip' + (modeVal === "email" ? " active" : "") + '" data-gate-tab="email">E-posta</button>' +
        '<button type="button" class="chip' + (modeVal === "phone" ? " active" : "") + '" data-gate-tab="phone">Telefon</button>' +
        "</div>" +
        '<form class="form" id="authForm" novalidate>' +
        (isRegister
            ? '<div class="form-group"><label for="afUsername">Kullanıcı adı *</label>' +
              '<input id="afUsername" class="form-control" name="username" maxlength="24" autocomplete="username" placeholder="ör. Ali Yılmaz">' +
              '<p class="form-hint">Köyde nasıl tanınmak istiyorsan öyle yaz.</p></div>'
            : "") +
        (modeVal === "email"
            ? '<div class="form-group"><label for="afContact">E-posta *</label>' +
              '<input id="afContact" class="form-control" name="contact" type="email" autocomplete="email" placeholder="ad@eposta.com"></div>'
            : '<div class="form-group"><label for="afContact">Telefon *</label>' +
              '<input id="afContact" class="form-control" name="contact" type="tel" inputmode="tel" autocomplete="tel" placeholder="05XX XXX XX XX"></div>') +
        '<div class="form-group"><label for="afPassword">Şifre *</label>' +
        '<input id="afPassword" class="form-control" name="password" type="password" autocomplete="' + (isRegister ? "new-password" : "current-password") + '"></div>' +
        '<p class="form-error" id="afError" hidden></p>' +
        '<button type="submit" class="btn btn-primary btn-block">' + (isRegister ? "Kayıt Ol" : "Giriş Yap") + "</button>" +
        "</form>" +
        '<p class="form-hint" style="margin-top:16px;text-align:center">' +
        (isRegister ? "Zaten hesabın var mı? " : "Hesabın yok mu? ") +
        '<button type="button" id="afToggle" class="link-btn">' + (isRegister ? "Giriş Yap" : "Kayıt Ol") + "</button></p>" +
        "</div>";
}

let gateMode = "email";

/* ---------- Kapı form davranışı ---------- */

function bindGate() {
    const host = $("#gateContent");

    $$(".gate-tabs .chip", host).forEach((chip) => {
        chip.addEventListener("click", () => {
            gateMode = chip.dataset.gateTab;
            renderGate($("#afUsername") ? "register" : "login");
            bindGate();
        });
    });

    const toggle = $("#afToggle", host);
    if (toggle) {
        toggle.addEventListener("click", () => {
            renderGate($("#afUsername") ? "login" : "register");
            bindGate();
        });
    }

    const form = $("#authForm", host);
    if (form) form.addEventListener("submit", (e) => {
        e.preventDefault();
        submitAuth(!!$("#afUsername"), form);
    });
}

async function submitAuth(isRegister, form) {
    const errorBox = $("#afError", form);
    errorBox.hidden = true;

    const username = form.elements.username ? form.elements.username.value.trim() : "";
    const contact = form.elements.contact.value.trim();
    const password = form.elements.password.value;

    let email = "";
    let phone = "";
    if (gateMode === "email") {
        email = contact;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            toast("Geçerli bir e-posta adresi girin.", "error");
            return;
        }
    } else {
        phone = normalizePhone(contact);
        if (!phone) {
            toast("Geçerli bir telefon numarası girin.", "error");
            return;
        }
    }

    if (isRegister) {
        if (username.length < 3) {
            toast("Kullanıcı adı en az 3 karakter olmalı.", "error");
            return;
        }
        if (password.length < 6) {
            toast("Şifre en az 6 karakter olmalı.", "error");
            return;
        }
    } else if (!password) {
        toast("Şifre gerekli.", "error");
        return;
    }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;

    try {
        let uid = "";
        if (authModeValue === "live") {
            if (isRegister) {
                const cred = await createUserWithEmailAndPassword(auth, gateMode === "email" ? email : phoneToEmail(phone), password);
                uid = cred.user.uid;
                await updateProfile(cred.user, { displayName: username });
                await saveUserProfile(uid, {
                    uid,
                    username,
                    displayName: username,
                    email: gateMode === "email" ? email : "",
                    phone: gateMode === "phone" ? phone : "",
                    role: "user",
                    createdAt: new Date().toISOString()
                });
            } else {
                const cred = await signInWithEmailAndPassword(auth, gateMode === "email" ? email : phoneToEmail(phone), password);
                uid = cred.user.uid;
            }
        } else {
            const users = readDemoUsers();
            const key = gateMode === "email" ? email.toLowerCase() : phone;
            if (isRegister) {
                if (users[key]) {
                    toast(gateMode === "email" ? "Bu e-posta zaten kayıtlı." : "Bu telefon zaten kayıtlı.", "error");
                    btn.disabled = false;
                    return;
                }
                uid = "demo-" + Date.now();
                const profile = {
                    uid,
                    username,
                    displayName: username,
                    email: gateMode === "email" ? email : "",
                    phone: gateMode === "phone" ? phone : "",
                    role: "user",
                    createdAt: new Date().toISOString()
                };
                users[key] = { ...profile, pass: password };
                writeDemoUsers(users);
                saveUserProfile(uid, profile);
            } else {
                const found = users[key];
                if (!found || found.pass !== password) {
                    toast("Kullanıcı adı / iletişim veya şifre hatalı.", "error");
                    btn.disabled = false;
                    return;
                }
                uid = found.uid;
            }
            demoSetSession({ uid, email: gateMode === "email" ? email : "", phone: gateMode === "phone" ? phone : "", displayName: username || "" });
        }

        if (uid) await loadProfile(uid, { email, phone, displayName: username });
    } catch (err) {
        console.error("Kimlik doğrulama hatası:", err);
        errorBox.textContent = errorMessage(err);
        errorBox.hidden = false;
        btn.disabled = false;
    }
}

function readDemoUsers() {
    try {
        return JSON.parse(localStorage.getItem(DEMO_USERS_KEY)) || {};
    } catch (err) {
        return {};
    }
}

function writeDemoUsers(users) {
    try {
        localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(users));
    } catch (err) {
        console.error("Demo kullanıcılar yazılamadı:", err);
    }
}

/* ---------- Yönetim kodu (355334) ---------- */

export function openAdminCodeModal() {
    openModal({
        title: "Yönetim Girişi",
        content:
            '<p class="form-hint">Yönetim paneli için yetki kodunu girin.</p>' +
            '<div class="form-group"><label for="adminCode">Yetki kodu</label>' +
            '<input id="adminCode" class="form-control" type="password" inputmode="numeric" maxlength="8" placeholder="••••••" autocomplete="off"></div>' +
            '<p class="form-error" id="adminCodeError" hidden></p>' +
            '<button type="button" class="btn btn-primary btn-block" id="adminCodeSubmit">Doğrula</button>'
    });

    const input = $("#adminCode");
    const errorBox = $("#adminCodeError");
    const submit = $("#adminCodeSubmit");

    const verify = () => {
        const code = input.value.trim();
        if (code !== ADMIN_CODE) {
            errorBox.textContent = "Kod hatalı. Tekrar deneyin.";
            errorBox.hidden = false;
            input.classList.add("field-error");
            return;
        }
        if (!currentProfile || currentProfile.role !== "admin") {
            errorBox.textContent = "Bu kod için hesabının yönetici yetkisi yok.";
            errorBox.hidden = false;
            return;
        }
        setAdminSession(true);
        toast("Yönetim paneli açıldı.");
        closeModal();
        navigateTo("admin");
    };

    submit.addEventListener("click", verify);
    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") verify();
    });
    input.focus();
}

/* ---------- Çıkış ---------- */

export async function logout() {
    try {
        if (authModeValue === "live") {
            await signOut(auth);
        } else {
            demoSetSession(null);
        }
        toast("Çıkış yapıldı.");
    } catch (err) {
        console.error("Çıkış hatası:", err);
    }
    endSession();
}

/* ---------- Profil ekranı ---------- */

export async function renderProfileScreen() {
    const el = $("#profileContent");
    if (!currentUser || !currentProfile) {
        el.innerHTML = '<div class="empty-state"><h4>Oturum yok.</h4><p>Lütfen giriş yapın.</p></div>';
        return;
    }

    const p = currentProfile;
    const name = (p.displayName || p.username || currentUser.email || "Kullanıcı").trim();
    const contact = p.phone || p.email || currentUser.email || "";

    const joined = readStoredSet("dulukhub-giveaway-joined");
    const liked = readStoredSet("dulukhub-story-likes");

    el.innerHTML =
        '<header class="screen-head"><h1>Profilim</h1><p>Hesap bilgilerin ve katılımların</p></header>' +
        '<div class="card" style="padding:20px">' +
        '<div class="profile-head">' +
        '<span class="avatar">' + esc(initials(name)) + "</span>" +
        "<div><h2>" + esc(name) + "</h2>" +
        "<p>" + esc(contact) + (p.role === "admin" ? ' <span class="badge badge-admin">Yönetici</span>' : "") + "</p>" +
        "</div></div>" +
        '<div class="profile-stats">' +
        '<div class="profile-stat"><strong>' + joined.size + "</strong><span>Çekiliş</span></div>" +
        '<div class="profile-stat"><strong>' + liked.size + "</strong><span>Beğenilen hikâye</span></div>" +
        "</div>" +
        '<ul class="profile-details">' +
        "<li><span>Kullanıcı adı</span><strong>" + esc((p.username || name).replace(/^@/, "")) + "</strong></li>" +
        "<li><span>İletişim</span><strong>" + esc(contact || "-") + "</strong></li>" +
        "<li><span>Katılım</span><strong>" + esc(fmtDate(p.createdAt)) + "</strong></li>" +
        "</ul>" +
        '<div class="profile-actions">' +
        '<button type="button" class="btn btn-ghost" id="editProfileBtn">Profili Düzenle</button>' +
        '<button type="button" class="btn btn-danger" id="logoutBtn">Çıkış Yap</button>' +
        "</div></div>" +
        '<div class="card profile-mine">' +
        "<h3>Katıldığım çekilişler</h3>" +
        '<div id="profileGiveaways">' + '<div class="loader"><div class="spinner"></div></div>' + "</div>" +
        "</div>";

    $("#editProfileBtn", el).addEventListener("click", openEditProfileModal);
    $("#logoutBtn", el).addEventListener("click", logout);
    renderProfileGiveaways($("#profileGiveaways"), joined);
}

function readStoredSet(key) {
    try {
        return new Set(JSON.parse(localStorage.getItem(key)) || []);
    } catch (err) {
        return new Set();
    }
}

async function renderProfileGiveaways(box, joined) {
    if (!joined.size) {
        box.innerHTML =
            '<p class="form-hint" style="margin:0">Henüz bir çekilişe katılmadın. <a href="#/giveaway" class="link-btn">Çekilişlere göz at</a></p>';
        return;
    }
    try {
        const all = await listGiveaways();
        const mine = all.filter((g) => joined.has(g.id));
        if (!mine.length) {
            box.innerHTML = '<p class="form-hint" style="margin:0">Katıldığın çekilişler sona erdi. Yeni çekilişleri kaçırma!</p>';
            return;
        }
        box.innerHTML = mine.map((g) =>
            '<div class="profile-mine-item"><span class="badge badge-giveaway">' + esc(g.prize || "Hediye") + "</span>" +
            "<strong>" + esc(g.title) + "</strong>" +
            "<small>Bitiş: " + esc(fmtDate(g.endDate)) + "</small></div>"
        ).join("");
    } catch (err) {
        console.error("Katılımlar yüklenemedi:", err);
        box.innerHTML = '<p class="form-hint" style="margin:0">Katılımların listelenemedi.</p>';
    }
}

/* ---------- Profil düzenleme ---------- */

function openEditProfileModal() {
    if (!currentProfile) return;
    const p = currentProfile;

    openModal({
        title: "Profili Düzenle",
        content:
            '<form id="editProfileForm" novalidate>' +
            '<div class="form-group"><label for="epName">Ad soyad / görünen ad</label>' +
            '<input id="epName" class="form-control" maxlength="40" value="' + esc(p.displayName || "") + '"></div>' +
            '<div class="form-group"><label for="epUsername">Kullanıcı adı</label>' +
            '<input id="epUsername" class="form-control" maxlength="24" value="' + esc(p.username || "") + '"></div>' +
            '<button type="submit" class="btn btn-primary">Kaydet</button></form>'
    });

    $("#editProfileForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const displayName = $("#epName").value.trim();
        const username = $("#epUsername").value.trim();
        if (!displayName) {
            toast("Ad soyad boş bırakılamaz.", "error");
            return;
        }
        try {
            if (authModeValue === "live") {
                await updateProfile(auth.currentUser, { displayName });
            }
            await saveUserProfile(currentUser.uid, { displayName, username });
            currentProfile = { ...currentProfile, displayName, username };
            renderProfileScreen();
            toast("Profil güncellendi.");
        } catch (err) {
            console.error("Profil güncellenemedi:", err);
            toast("Profil güncellenemedi.", "error");
        }
    });
}

/* ---------- Yönetim paneli ---------- */

export async function renderAdminPanel() {
    const el = $("#adminContent");

    if (!isAdminSession()) {
        el.innerHTML =
            '<header class="screen-head"><h1>Yönetim</h1><p></p></header>' +
            '<div class="card" style="padding:24px;text-align:center">' +
            '<p style="margin:0 0 16px">Yönetim paneli kilitli. Yetki kodu ile giriş yapın.</p>' +
            '<button type="button" class="btn btn-primary" id="adminEntry2">Yönetim Girişi</button></div>';
        $("#adminEntry2", el).addEventListener("click", openAdminCodeModal);
        return;
    }

    el.innerHTML =
        '<header class="screen-head"><h1>Yönetim</h1><p>İçerik ekle ve yönet</p></header>' +
        '<div class="admin-forms">' +
        adminForm("post", "Haber Ekle", postFields()) +
        adminForm("photo", "Fotoğraf Ekle", photoFields()) +
        adminForm("event", "Etkinlik Ekle", eventFields()) +
        adminForm("giveaway", "Çekiliş Ekle", giveawayFields()) +
        adminForm("story", "Hikâye Ekle", storyFields()) +
        adminForm("heritage", "Tarihi Eser Ekle", heritageFields()) +
        adminForm("announce", "Duyuru Ekle", announceFields()) +
        "</div>" +
        '<div style="margin-top:26px" id="adminLists"></div>';

    bindAdminForms(el);
    await updateAdminLists();
}

function adminForm(kind, title, fields) {
    return (
        '<form class="card admin-form" data-admin-form="' + kind + '" novalidate>' +
        "<h3>" + esc(title) + "</h3>" + fields +
        '<button type="submit" class="btn btn-primary btn-sm">Ekle</button></form>'
    );
}

function postFields() {
    return ['<div class="form-group"><label for="apTitle">Başlık *</label><input id="apTitle" class="form-control" maxlength="150" required></div>',
        '<div class="form-group"><label for="apDesc">Kısa açıklama</label><textarea id="apDesc" class="form-control" maxlength="500"></textarea></div>',
        '<div class="form-group"><label for="apDate">Haber tarihi (boş bırakılırsa şimdi)</label><input id="apDate" class="form-control" type="datetime-local"></div>',
        imgField("ap", "Görsel"),
        '<div class="form-group"><label for="apContent">İçerik (her satır bir paragraf)</label><textarea id="apContent" class="form-control" maxlength="8000"></textarea></div>'
    ].join("");
}

function photoFields() {
    return ['<div class="form-group"><label for="afTitle">Başlık *</label><input id="afTitle" class="form-control" maxlength="120" required></div>',
        '<div class="form-group"><label for="afDesc">Açıklama</label><textarea id="afDesc" class="form-control" maxlength="300"></textarea></div>',
        imgField("afImg", "Fotoğraf", true)
    ].join("");
}

function eventFields() {
    return ['<div class="form-group"><label for="aeTitle">Etkinlik adı *</label><input id="aeTitle" class="form-control" maxlength="150" required></div>',
        '<div class="form-group"><label for="aeDate">Tarih *</label><input id="aeDate" class="form-control" type="date" required></div>',
        '<div class="form-group"><label for="aeEnd">Son tarih (isteğe bağlı)</label><input id="aeEnd" class="form-control" type="date"></div>',
        '<div class="form-group"><label for="aeTime">Saat</label><input id="aeTime" class="form-control" type="time"></div>',
        '<div class="form-group"><label for="aeLoc">Konum</label><input id="aeLoc" class="form-control" maxlength="120"></div>',
        imgField("aeImg", "Görsel"),
        '<div class="form-group"><label for="aeDesc">Açıklama</label><textarea id="aeDesc" class="form-control" maxlength="1500"></textarea></div>'
    ].join("");
}

function giveawayFields() {
    return ['<div class="form-group"><label for="agTitle">Çekiliş adı *</label><input id="agTitle" class="form-control" maxlength="120" required></div>',
        '<div class="form-group"><label for="agPrize">Ödül *</label><input id="agPrize" class="form-control" maxlength="120" required></div>',
        imgField("agImg", "Görsel"),
        '<div class="form-group"><label for="agDesc">Açıklama</label><textarea id="agDesc" class="form-control" maxlength="600"></textarea></div>',
        '<div class="form-group"><label for="agStart">Başlangıç tarihi (isteğe bağlı)</label><input id="agStart" class="form-control" type="datetime-local"></div>',
        '<div class="form-group"><label for="agEnd">Bitiş tarihi *</label><input id="agEnd" class="form-control" type="datetime-local" required></div>',
        '<div class="form-group"><label for="agTarget">Katılım hedefi</label><input id="agTarget" class="form-control" type="number" min="1" value="50"></div>'
    ].join("");
}

function storyFields() {
    return ['<div class="form-group"><label for="asTitle">Başlık *</label><input id="asTitle" class="form-control" maxlength="120" required></div>',
        '<div class="form-group"><label for="asContent">Hikâye *</label><textarea id="asContent" class="form-control" maxlength="2000" required></textarea></div>',
        imgField("asImg", "Görsel"),
        '<div class="form-group"><label for="asAuthor">Anlatan</label><input id="asAuthor" class="form-control" maxlength="60"></div>'
    ].join("");
}

function heritageFields() {
    return ['<div class="form-group"><label for="ahTitle">Ad *</label><input id="ahTitle" class="form-control" maxlength="120" required></div>',
        '<div class="form-group"><label for="ahEra">Dönem</label><input id="ahEra" class="form-control" maxlength="60" placeholder="ör. Roma Dönemi"></div>',
        imgField("ahImg", "Görsel"),
        '<div class="form-group"><label for="ahDesc">Açıklama</label><textarea id="ahDesc" class="form-control" maxlength="800"></textarea></div>'
    ].join("");
}

function announceFields() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const defaultValue = now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate()) + "T" + pad(now.getHours()) + ":" + pad(now.getMinutes());
    return ['<div class="form-group"><label for="anTitle">Duyuru *</label><textarea id="anTitle" class="form-control" maxlength="300" required></textarea></div>',
        '<div class="form-group"><label for="anDate">Yayın tarihi</label><input id="anDate" class="form-control" type="datetime-local" value="' + defaultValue + '"></div>',
        '<div class="form-group" style="display:flex;gap:8px;align-items:center"><input id="anImportant" type="checkbox" style="width:18px;height:18px"><label for="anImportant" style="margin:0">Önemli duyuru</label></div>'
    ].join("");
}

/* ---------- Görsel seçici (dosya + bağlantı + önizleme) ---------- */

function imgField(id, label, required) {
    return '<div class="form-group">' +
        "<label>" + esc(label) + (required ? " *" : "") + "</label>" +
        '<input type="file" accept="image/*" data-img-file="' + id + '">' +
        '<input class="form-control" type="url" placeholder="veya görsel bağlantısı (https://...)" data-img-url="' + id + '">' +
        '<img class="img-preview" data-img-preview="' + id + '" alt="Görsel önizleme" hidden></div>';
}

function bindImageFields(form) {
    $$("[data-img-file]", form).forEach((fileInput) => {
        const id = fileInput.dataset.imgFile;
        const urlInput = form.querySelector('[data-img-url="' + id + '"]');
        const preview = form.querySelector('[data-img-preview="' + id + '"]');

        const show = (src) => {
            if (!src) return;
            preview.src = src;
            preview.hidden = false;
        };

        fileInput.addEventListener("change", () => {
            const file = fileInput.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => show(reader.result);
            reader.readAsDataURL(file);
            if (urlInput) urlInput.value = "";
        });

        if (urlInput) {
            urlInput.addEventListener("input", () => {
                if (urlInput.value.trim()) {
                    fileInput.value = "";
                    show(urlInput.value.trim());
                }
            });
        }
    });
}

async function readImage(form, id) {
    const fileInput = form.querySelector('[data-img-file="' + id + '"]');
    const urlInput = form.querySelector('[data-img-url="' + id + '"]');
    if (!fileInput || !urlInput) return null;
    const file = fileInput.files[0];
    const url = urlInput.value.trim();
    if (file) {
        const urls = await processPhotoFile(file);
        return urls;
    }
    if (url) return { thumbnailUrl: url, imageUrl: url };
    return null;
}

function bindAdminForms(el) {
    $$("[data-admin-form]", el).forEach((form) => {
        bindImageFields(form);
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            handleAdminSubmit(form);
        });
    });
}

async function handleAdminSubmit(form) {
    const kind = form.dataset.adminForm;
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    const uid = currentUser ? currentUser.uid : "admin";

    try {
        if (kind === "post") {
            const title = $("#apTitle", form).value.trim();
            if (!title) throw new Error("Başlık gerekli");
            const img = await readImage(form, "ap");
            const dateInput = $("#apDate", form).value;
            await createPost({
                title,
                description: $("#apDesc", form).value.trim(),
                category: "Güncel",
                imageUrl: img ? img.imageUrl : "",
                thumbnailUrl: img ? img.thumbnailUrl : "",
                content: $("#apContent", form).value.split("\n").map((l) => l.trim()).filter(Boolean),
                authorId: uid,
                date: dateInput ? new Date(dateInput).toISOString() : new Date().toISOString()
            });
            toast("Haber eklendi.");
        } else if (kind === "photo") {
            const title = $("#afTitle", form).value.trim();
            if (!title) throw new Error("Başlık gerekli");
            const img = await readImage(form, "afImg");
            if (!img) throw new Error("Bir fotoğraf dosyası seçin veya görsel bağlantısı girin");
            await createPhoto({
                title,
                description: $("#afDesc", form).value.trim(),
                thumbnailUrl: img.thumbnailUrl,
                imageUrl: img.imageUrl,
                authorId: uid,
                date: new Date().toISOString()
            });
            toast("Fotoğraf eklendi.");
        } else if (kind === "event") {
            const title = $("#aeTitle", form).value.trim();
            const date = $("#aeDate", form).value;
            if (!title) throw new Error("Etkinlik adı gerekli");
            if (!date) throw new Error("Tarih gerekli");
            const img = await readImage(form, "aeImg");
            await createEvent({
                title,
                date,
                endDate: $("#aeEnd", form).value || "",
                time: $("#aeTime", form).value,
                location: $("#aeLoc", form).value.trim(),
                description: $("#aeDesc", form).value.trim(),
                imageUrl: img ? img.imageUrl : "",
                authorId: uid
            });
            toast("Etkinlik eklendi.");
        } else if (kind === "giveaway") {
            const title = $("#agTitle", form).value.trim();
            const prize = $("#agPrize", form).value.trim();
            const end = $("#agEnd", form).value;
            if (!title) throw new Error("Çekiliş adı gerekli");
            if (!prize) throw new Error("Ödül gerekli");
            if (!end) throw new Error("Bitiş tarihi gerekli");
            const img = await readImage(form, "agImg");
            const startInput = $("#agStart", form).value;
            await createGiveaway({
                title,
                prize,
                description: $("#agDesc", form).value.trim(),
                startDate: startInput ? new Date(startInput).toISOString() : "",
                endDate: new Date(end).toISOString(),
                target: Number($("#agTarget", form).value) || 50,
                imageUrl: img ? img.imageUrl : "",
                thumbnailUrl: img ? img.thumbnailUrl : "",
                authorId: uid
            });
            toast("Çekiliş eklendi.");
        } else if (kind === "story") {
            const title = $("#asTitle", form).value.trim();
            const content = $("#asContent", form).value.trim();
            if (!title) throw new Error("Başlık gerekli");
            if (!content) throw new Error("Hikâye gerekli");
            const img = await readImage(form, "asImg");
            await createStory({
                title,
                content,
                author: $("#asAuthor", form).value.trim(),
                likes: 0,
                imageUrl: img ? img.imageUrl : "",
                thumbnailUrl: img ? img.thumbnailUrl : "",
                authorId: uid,
                date: new Date().toISOString()
            });
            toast("Hikâye eklendi.");
        } else if (kind === "heritage") {
            const title = $("#ahTitle", form).value.trim();
            if (!title) throw new Error("Ad gerekli");
            const img = await readImage(form, "ahImg");
            await createHeritageItem({
                title,
                era: $("#ahEra", form).value.trim(),
                description: $("#ahDesc", form).value.trim(),
                imageUrl: img ? img.imageUrl : "",
                thumbnailUrl: img ? img.thumbnailUrl : "",
                authorId: uid,
                date: new Date().toISOString()
            });
            toast("Tarihi eser eklendi.");
        } else if (kind === "announce") {
            const title = $("#anTitle", form).value.trim();
            if (!title) throw new Error("Duyuru gerekli");
            const dateInput = $("#anDate", form).value;
            await createAnnouncement({
                title,
                important: $("#anImportant", form).checked,
                authorId: uid,
                date: dateInput ? new Date(dateInput).toISOString() : new Date().toISOString()
            });
            toast("Duyuru yayınlandı.");
        }
        form.reset();
    } catch (err) {
        console.error("İçerik eklenemedi:", err);
        toast(err.message || "İçerik eklenemedi.", "error");
    }
    btn.disabled = false;
    await updateAdminLists();
}

async function updateAdminLists() {
    const box = $("#adminLists");
    if (!box) return;

    const [posts, photos, events, giveaways, stories, heritage, announcements] = await Promise.allSettled([
        listPosts(),
        listPhotos(),
        listEvents(),
        listGiveaways(),
        listStories(),
        listHeritage(),
        listAnnouncements()
    ]);

    const section = (title, items, kind) => {
        const rows = items.length
            ? items.slice(0, 8).map((it) =>
                '<li><span>' + esc(it.title || "") +
                ' <small style="color:var(--color-muted)">' + esc(fmtDate(it.date || it.endDate || "")) + "</small></span>" +
                '<button type="button" class="btn btn-danger btn-sm" data-delete="' + kind + '" data-id="' + encodeURIComponent(it.id) + '">Sil</button></li>'
            ).join("")
            : '<li style="color:var(--color-muted)">Henüz içerik yok.</li>';
        return '<div class="card admin-list"><h3>' + esc(title) + '</h3><ul>' + rows + "</ul></div>";
    };

    box.innerHTML =
        section("Haberler", posts.status === "fulfilled" ? posts.value : [], "posts") +
        section("Fotoğraflar", photos.status === "fulfilled" ? photos.value : [], "photos") +
        section("Etkinlikler", events.status === "fulfilled" ? events.value : [], "events") +
        section("Çekilişler", giveaways.status === "fulfilled" ? giveaways.value : [], "giveaways") +
        section("Hikâyeler", stories.status === "fulfilled" ? stories.value : [], "stories") +
        section("Tarihi Eserler", heritage.status === "fulfilled" ? heritage.value : [], "heritage") +
        section("Duyurular", announcements.status === "fulfilled" ? announcements.value : [], "announcements") +
        '<p style="font-size:12.5px;color:var(--color-muted);margin-top:6px">Silme işlemi yetkili yönetici hesaplarıyla gerçekleşir (Firebase Security Rules).</p>';

    $$("[data-delete]", box).forEach((btn) => {
        btn.addEventListener("click", () => removeItem(btn.dataset.delete, decodeURIComponent(btn.dataset.id)));
    });
}

async function removeItem(kind, id) {
    if (!window.confirm("Bu öğe kalıcı olarak silinsin mi?")) return;
    try {
        await deleteItem(kind, id);
        toast("Öğe silindi.");
        await updateAdminLists();
    } catch (err) {
        console.error("Öğe silinemedi:", err);
        toast("Öğe silinemedi.", "error");
    }
}