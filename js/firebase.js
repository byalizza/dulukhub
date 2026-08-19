/* ============================================================
   Dülük Hub — firebase.js
   Firebase kurulumu (config, auth, firestore) ve
   veri servisi. Firestore erişilemiyorsa otomatik "demo moda"
   geçilir: demo içerik + localStorage yedekleri kullanılır.
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-analytics.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
export { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
export { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import {
    getFirestore,
    collection,
    query,
    orderBy,
    limit,
    getDocs,
    getDoc,
    addDoc,
    setDoc,
    doc,
    updateDoc,
    deleteDoc,
    where,
    serverTimestamp,
    increment
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

import { DEMO } from "./data.js";

const firebaseConfig = {
    apiKey: "AIzaSyDH_hZKMLL8vqM1ee_UGCo68Sr1TDQHlE4",
    authDomain: "dulukhub.firebaseapp.com",
    databaseURL: "https://dulukhub-default-rtdb.firebaseio.com",
    projectId: "dulukhub",
    storageBucket: "dulukhub.firebasestorage.app",
    messagingSenderId: "249826345730",
    appId: "1:249826345730:web:ac33bcc750260b3734781b",
    measurementId: "G-Z5DY8Y9SNY"
};

const app = initializeApp(firebaseConfig);

try {
    getAnalytics(app);
} catch (err) {
    console.warn("Analytics başlatılamadı:", err);
}

export const auth = getAuth(app);
export const db = getFirestore(app);

/* ---------- Demo mod tespiti ---------- */

let live = null; // null: henüz bilinmiyor

export async function isLive() {
    if (live !== null) return live;
    try {
        await getDocs(query(collection(db, "posts"), limit(1)));
        live = true;
    } catch (err) {
        console.warn("Firestore erişilemedi, demo mod kullanılacak:", err);
        live = false;
    }
    return live;
}

/* ---------- Yerel (demo) depolama ---------- */

const LOCAL_KEY = "dulukhub-local-data";

function readLocal() {
    try {
        return JSON.parse(localStorage.getItem(LOCAL_KEY)) || {};
    } catch (err) {
        console.error("Yerel veri okunamadı:", err);
        return {};
    }
}

function writeLocal(merged) {
    try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(merged));
    } catch (err) {
        console.error("Yerel veri yazılamadı:", err);
    }
}

const COLLECTIONS = {
    posts: { demo: "posts" },
    photos: { demo: "photos" },
    events: { demo: "events" },
    announcements: { demo: "announcements" },
    giveaways: { demo: "giveaways" },
    stories: { demo: "stories" },
    heritage: { demo: "heritage" },
    comments: { demo: "comments" }
};

function getDemoList(name) {
    const local = readLocal();
    const stored = local[name] || [];
    const demo = COLLECTIONS[name] ? DEMO[COLLECTIONS[name].demo] || [] : [];
    return [...stored, ...demo];
}

function sortByDateAsc(list) {
    return [...list].sort((a, b) => {
        const da = new Date(a.date || a.eventDate || a.endDate || 0).getTime();
        const dbx = new Date(b.date || b.eventDate || b.endDate || 0).getTime();
        return da - dbx;
    });
}

/* ---------- Okuma ---------- */

export async function listPosts() {
    if (await isLive()) {
        const snap = await getDocs(query(collection(db, "posts"), orderBy("date", "desc"), limit(40)));
        return snap.docs.map(postToItem).filter((p) => p.published !== false);
    }
    return [...getDemoList("posts")].sort((a, b) => new Date(b.date) - new Date(a.date));
}

export async function listPhotos() {
    if (await isLive()) {
        const snap = await getDocs(query(collection(db, "photos"), orderBy("createdAt", "desc"), limit(60)));
        return snap.docs.map(photoToItem);
    }
    return [...getDemoList("photos")].sort((a, b) => new Date(b.date) - new Date(a.date));
}

export async function listEvents() {
    if (await isLive()) {
        const snap = await getDocs(query(collection(db, "events"), orderBy("date", "asc"), limit(40)));
        return snap.docs.map(eventToItem).filter((e) => new Date(e.date) >= new Date(Date.now() - 86400000));
    }
    const upcoming = getDemoList("events").filter((e) => new Date(e.date + "T" + (e.time || "00:00") + ":00") >= new Date());
    return sortByDateAsc(upcoming);
}

export async function listAnnouncements() {
    if (await isLive()) {
        const snap = await getDocs(query(collection(db, "announcements"), orderBy("date", "desc"), limit(30)));
        return snap.docs.map(announceToItem);
    }
    return [...getDemoList("announcements")].sort((a, b) => new Date(b.date) - new Date(a.date));
}

export async function listGiveaways() {
    if (await isLive()) {
        const snap = await getDocs(query(collection(db, "giveaways"), orderBy("endDate", "asc"), limit(40)));
        return snap.docs.map(giveawayToItem).filter((g) => new Date(g.endDate) >= Date.now());
    }
    const active = getDemoList("giveaways").filter((g) => new Date(g.endDate) >= Date.now());
    return sortByDateAsc(active);
}

export async function listGiveawaysAll() {
    if (await isLive()) {
        const snap = await getDocs(query(collection(db, "giveaways"), orderBy("endDate", "asc"), limit(200)));
        return snap.docs.map(giveawayToItem);
    }
    return sortByDateAsc(getDemoList("giveaways"));
}

export async function listStories() {
    if (await isLive()) {
        const snap = await getDocs(query(collection(db, "stories"), orderBy("date", "desc"), limit(40)));
        return snap.docs.map(storyToItem);
    }
    return [...getDemoList("stories")].sort((a, b) => new Date(b.date) - new Date(a.date));
}

export async function listHeritage() {
    if (await isLive()) {
        const snap = await getDocs(query(collection(db, "heritage"), orderBy("date", "desc"), limit(40)));
        return snap.docs.map(heritageToItem);
    }
    return [...getDemoList("heritage")].sort((a, b) => new Date(b.date) - new Date(a.date));
}

/* ---------- Yazma (admin) ---------- */

async function writeLiveOrLocal(name, payload, id) {
    if (await isLive()) {
        if (id) {
            await updateDoc(doc(db, name, id), payload);
        } else {
            await addDoc(collection(db, name), { ...payload, createdAt: serverTimestamp() });
        }
        return true;
    }
    const local = readLocal();
    const list = local[name] || [];
    const item = { ...payload, id: id || "local-" + Date.now() };
    if (id) {
        const idx = list.findIndex((x) => x.id === id);
        if (idx >= 0) list[idx] = item;
        else list.push(item);
    } else {
        list.push(item);
    }
    local[name] = list;
    writeLocal(local);
    return true;
}

export function createPost(data) {
    return writeLiveOrLocal("posts", { ...data, published: true });
}

export function createPhoto(data) {
    return writeLiveOrLocal("photos", data);
}

export function createEvent(data) {
    return writeLiveOrLocal("events", data);
}

export function createAnnouncement(data) {
    return writeLiveOrLocal("announcements", data);
}

export function createGiveaway(data) {
    return writeLiveOrLocal("giveaways", { ...data, participants: Number(data.participants) || 0 });
}

export function createStory(data) {
    return writeLiveOrLocal("stories", data);
}

export function createHeritageItem(data) {
    return writeLiveOrLocal("heritage", data);
}

/* --- Çekilişe katılma --- */

export async function enterGiveaway(id, userInfo) {
    if (await isLive()) {
        let isNew = true;
        if (userInfo && userInfo.uid) {
            try {
                const phoneKey = (userInfo.phone || "").replace(/\D/g, "");
                const entryId = id + (phoneKey ? "_p" + phoneKey : "_u" + userInfo.uid);
                const entryRef = doc(db, "giveawayEntries", entryId);
                const existing = await getDoc(entryRef);
                if (existing.exists()) {
                    isNew = false;
                } else {
                    await setDoc(entryRef, {
                        giveawayId: id,
                        uid: userInfo.uid,
                        name: userInfo.name || "",
                        phone: userInfo.phone || "",
                        joinedAt: new Date().toISOString()
                    });
                }
            } catch (err) {
                console.warn("Katılım kaydı eklenemedi:", err);
                isNew = false;
            }
        }
        if (isNew) {
            await updateDoc(doc(db, "giveaways", id), { participants: increment(1) });
        }
        return isNew;
    }
    const local = readLocal();
    const list = local.giveaways || [];
    const item = list.find((x) => x.id === id);
    if (item) item.participants = (Number(item.participants) || 0) + 1;
    local.giveaways = list;
    writeLocal(local);
    return true;
}

export async function listGiveawayEntries(giveawayId) {
    if (!(await isLive())) return [];
    const snap = await getDocs(query(collection(db, "giveawayEntries"), where("giveawayId", "==", giveawayId)));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function deleteItem(name, id) {
    if (await isLive()) {
        await deleteDoc(doc(db, name, id));
        return true;
    }
    const local = readLocal();
    local[name] = (local[name] || []).filter((x) => x.id !== id);
    writeLocal(local);
    return true;
}

/* ---------- Profil (users koleksiyonu) ---------- */

export async function saveUserProfile(uid, data) {
    if (await isLive()) {
        await setDoc(doc(db, "users", uid), data, { merge: true });
        return true;
    }
    const local = readLocal();
    local.users = { ...(local.users || {}), [uid]: { ...(local.users || {})[uid], ...data } };
    writeLocal(local);
    return true;
}

export async function getUserProfile(uid) {
    if (await isLive()) {
        try {
            const snap = await getDoc(doc(db, "users", uid));
            if (snap.exists()) return snap.data();
        } catch (err) {
            console.warn("Kullanıcı profili okunamadı:", err);
        }
        return null;
    }
    const local = readLocal();
    return (local.users || {})[uid] || null;
}

export async function authMode() {
    return (await isLive()) ? "live" : "demo";
}

/* ---------- Demo oturum (Firebase Auth yoksa) ---------- */

const SESSION_KEY = "dulukhub-session";

export function demoGetSession() {
    try {
        return JSON.parse(localStorage.getItem(SESSION_KEY)) || null;
    } catch (err) {
        return null;
    }
}

export function demoSetSession(session) {
    try {
        if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        else localStorage.removeItem(SESSION_KEY);
    } catch (err) {
        console.error("Oturum kaydedilemedi:", err);
    }
}

/* ---------- Fotoğraf işleme (Storage yok: küçült + base64) ---------- */

export async function processPhotoFile(file, onProgress) {
    const thumbBlob = await compressImage(file, 640, 0.72);
    if (onProgress) onProgress(50);
    const fullBlob = await compressImage(file, 2000, 0.92);
    if (onProgress) onProgress(80);
    const thumbnailUrl = await blobToDataUrl(thumbBlob);
    const imageUrl = await blobToDataUrl(fullBlob);
    if (onProgress) onProgress(100);
    return { thumbnailUrl, imageUrl };
}

function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function compressImage(file, maxDim, quality) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
                if (scale === 1 && file.size < 250 * 1024) {
                    resolve(file);
                    return;
                }
                const canvas = document.createElement("canvas");
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(
                    (blob) => (blob ? resolve(blob) : reject(new Error("Sıkıştırma başarısız"))),
                    "image/jpeg",
                    quality
                );
            };
            img.onerror = reject;
            img.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/* ---------- Firestore dönüşümleri ---------- */

function postToItem(doc) {
    const d = doc.data();
    return {
        id: doc.id,
        title: d.title || "",
        description: d.description || "",
        category: d.category || "Güncel",
        date: normDate(toISO(d.date)) || toISO(d.createdAt) || new Date().toISOString(),
        cover: d.imageUrl || "",
        content: d.content || []
    };
}

function normDate(v) {
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v + "T12:00:00";
    return v;
}

function photoToItem(doc) {
    const d = doc.data();
    return {
        id: doc.id,
        title: d.title || "",
        description: d.description || "",
        category: d.category || "",
        date: toISO(d.createdAt) || new Date().toISOString(),
        thumbs: d.thumbnailUrl || "",
        full: d.imageUrl || ""
    };
}

function eventToItem(doc) {
    const d = doc.data();
    return {
        id: doc.id,
        title: d.title || "",
        date: d.date || "",
        endDate: d.endDate || "",
        time: d.time || "",
        location: d.location || "",
        description: d.description || ""
    };
}

function announceToItem(doc) {
    const d = doc.data();
    return {
        id: doc.id,
        title: d.title || "",
        date: toISO(d.date || d.createdAt) || new Date().toISOString(),
        important: !!d.important,
        content: d.content || ""
    };
}

function giveawayToItem(doc) {
    const d = doc.data();
    return {
        id: doc.id,
        title: d.title || "",
        description: d.description || "",
        prize: d.prize || "",
        startDate: toISO(d.startDate) || "",
        endDate: toISO(d.endDate) || d.endDate || new Date().toISOString(),
        participants: Number(d.participants) || 0,
        target: Number(d.target) || 1
    };
}

function storyToItem(doc) {
    const d = doc.data();
    return {
        id: doc.id,
        title: d.title || "",
        content: d.content || "",
        author: d.author || "",
        likes: Number(d.likes) || 0,
        date: toISO(d.date || d.createdAt) || new Date().toISOString()
    };
}

function heritageToItem(doc) {
    const d = doc.data();
    return {
        id: doc.id,
        title: d.title || "",
        era: d.era || "",
        description: d.description || "",
        imageUrl: d.imageUrl || "",
        date: toISO(d.date || d.createdAt) || new Date().toISOString()
    };
}

function toISO(value) {
    if (!value) return null;
    if (value && typeof value.toDate === "function") return value.toDate().toISOString();
    if (typeof value === "string") return value;
    return null;
}