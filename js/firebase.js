/* ============================================================
   DÃ¼lÃ¼k Hub â€” firebase.js
   Firebase kurulumu (config, auth, firestore, storage) ve
   veri servisi. Firestore eriÅŸilemiyorsa otomatik "demo moda"
   geÃ§ilir: demo iÃ§erik + localStorage yedekleri kullanÄ±lÄ±r.
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
export { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
export { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import {
    getFirestore,
    collection,
    query,
    orderBy,
    where,
    limit,
    getDocs,
    addDoc,
    setDoc,
    doc,
    updateDoc,
    deleteDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-storage.js";

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
    console.warn("Analytics baÅŸlatÄ±lamadÄ±:", err);
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

/* ---------- Demo mod tespiti ---------- */

let live = null; // null: henÃ¼z bilinmiyor

async function isLive() {
    if (live !== null) return live;
    try {
        await getDocs(query(collection(db, "posts"), limit(1)));
        live = true;
    } catch (err) {
        console.warn("Firestore eriÅŸilemedi, demo mod kullanÄ±lacak:", err);
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
        console.error("Yerel veri okunamadÄ±:", err);
        return {};
    }
}

function writeLocal(merged) {
    try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(merged));
    } catch (err) {
        console.error("Yerel veri yazÄ±lamadÄ±:", err);
    }
}

const COLLECTIONS = {
    posts: { demo: "posts", filter: null },
    photos: { demo: "photos", filter: null },
    events: { demo: "events", filter: null },
    announcements: { demo: "announcements", filter: null }
};

function getDemoList(name) {
    const local = readLocal();
    const stored = local[name] || [];
    const demo = COLLECTIONS[name] ? DEMO[COLLECTIONS[name].demo] || [] : [];
    return [...stored, ...demo];
}

function sortByDateAsc(list) {
    return [...list].sort((a, b) => {
        const da = new Date(a.date || a.eventDate || 0).getTime();
        const dbx = new Date(b.date || b.eventDate || 0).getTime();
        return da - dbx;
    });
}

/* ---------- Okuma ---------- */

export async function listPosts() {
    if (await isLive()) {
        const snap = await getDocs(query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(40)));
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
            const snap = await getDocs(query(collection(db, "users"), where("uid", "==", uid), limit(1)));
            if (!snap.empty) return snap.docs[0].data();
        } catch (err) {
            console.warn("KullanÄ±cÄ± profili okunamadÄ±:", err);
        }
        return null;
    }
    const local = readLocal();
    return (local.users || {})[uid] || null;
}

/* ---------- Storage (fotoÄŸraf yÃ¼kleme) ---------- */

export async function uploadPhotoFile(file, onProgress) {
    if (await isLive()) {
        const thumbBlob = await compressImage(file, 640, 0.75);
        const fullBlob = await compressImage(file, 1600, 0.82);
        const base = "photos/" + Date.now();
        const thumbRef = ref(storage, base + "/thumb.jpg");
        const fullRef = ref(storage, base + "/full.jpg");
        if (onProgress) onProgress(25);
        await uploadBytes(thumbRef, thumbBlob, { contentType: "image/jpeg" });
        if (onProgress) onProgress(60);
        await uploadBytes(fullRef, fullBlob, { contentType: "image/jpeg" });
        if (onProgress) onProgress(90);
        const thumbnailUrl = await getDownloadURL(thumbRef);
        const imageUrl = await getDownloadURL(fullRef);
        if (onProgress) onProgress(100);
        return { thumbnailUrl, imageUrl };
    }
    throw new Error("demo");
}

export async function deletePhoto(name, thumbUrl, fullUrl) {
    if (await isLive()) {
        if (thumbUrl) await deleteObject(ref(storage, thumbUrl)).catch(() => {});
        if (fullUrl) await deleteObject(ref(storage, fullUrl)).catch(() => {});
        await deleteItem("photos", name);
        return true;
    }
    return deleteItem("photos", name);
}

/* ---------- GÃ¶rsel sÄ±kÄ±ÅŸtÄ±rma (client-side) ---------- */

function compressImage(file, maxDim, quality) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
                if (scale === 1 && file.size < 300 * 1024) {
                    resolve(file);
                    return;
                }
                const canvas = document.createElement("canvas");
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(
                    (blob) => (blob ? resolve(blob) : reject(new Error("SÄ±kÄ±ÅŸtÄ±rma baÅŸarÄ±sÄ±z"))),
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

/* ---------- Firestore dÃ¶nÃ¼ÅŸÃ¼mleri ---------- */

function postToItem(doc) {
    const d = doc.data();
    return {
        id: doc.id,
        title: d.title || "",
        description: d.description || "",
        category: d.category || "GÃ¼ncel",
        date: (d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toISOString() : new Date().toISOString()),
        cover: d.imageUrl || "",
        content: d.content || []
    };
}

function photoToItem(doc) {
    const d = doc.data();
    return {
        id: doc.id,
        title: d.title || "",
        description: d.description || "",
        category: d.category || "",
        date: (d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toISOString() : new Date().toISOString()),
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
        date: (d.date && d.date.toDate ? d.date.toDate().toISOString() : new Date().toISOString()),
        important: !!d.important
    };
}
