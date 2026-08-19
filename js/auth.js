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
import { updateLastSeen } from "./analytics.js";
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
    listGiveawaysAll
} from "./firebase.js";

const ADMIN_CODE = "355334";
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
    return !!currentProfile && currentProfile.role === "admin";
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
    if (currentUser && currentUser.uid) updateLastSeen(currentUser.uid);
    if (!location.hash || location.hash === "#/" || location.hash === "#/news") {
        navigateTo("news");
    } else {
        navigateTo(parseScreen());
    }
}

function endSession() {
    currentUser = null;
    currentProfile = null;
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
    return ["news", "announcements", "events", "giveaway", "gallery", "stories", "heritage", "settings", "social", "profile"].includes(raw) ? raw : "news";
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
    const livePhone = currentUser.phoneNumber || "";
    const autoEmail = (currentUser.email || "").match(/^phone(\d+)@/);
    const fallbackName = livePhone || (autoEmail ? autoEmail[1] : "") || currentUser.email || "Kullanıcı";
    const name = (p.displayName || p.username || fallbackName).trim();
    const contact = p.phone || livePhone || p.email || (autoEmail ? autoEmail[1] : "") || currentUser.email || "";

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
        const all = await listGiveawaysAll();
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