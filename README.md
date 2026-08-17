# Dülük Hub

Dülük Köyü için hazırlanmış modern, sade ve hızlı bir topluluk web sitesi. Tek sayfa uygulama (SPA) mantığında çalışır: sayfa yenilenmez, ekranlar aynı görünüm alanı içinde değişir.

**Web adresi:** https://dulukhub.com

## Özellikler

- SPA mantığı — sayfa yenilenmeden ekran değişimi (`#/home`, `#/news`, `#/gallery` …)
- Ekranlar: Ana Sayfa, Haberler (filtre + ekran içi detay), Galeri (lightbox), Etkinlikler, Duyurular, Hakkımızda, Profil
- Tarayıcı geri/ileri tuşu desteği (hash tabanlı yönlendirme)
- Karanlık tema (sistem algılama + manuel seçim, `localStorage`'da saklanır)
- Firebase: Authentication (e-posta/şifre), Firestore, Storage
- Admin yönetimi: haber, fotoğraf, etkinlik, duyuru ekleme/silme
- Demo mod: Firestore erişilemezse site bozulmaz; örnek içerik + yerel (localStorage) kayıtlarla çalışır
- Erişilebilirlik: semantik HTML, klavye (Tab/Enter/Esc), `aria-current`, focus yönetimi, `prefers-reduced-motion`
- Tümüyle Türkçe arayüz, Türkiye tarih/saat formatı
- Responsive: mobil alt menü, tablet, masaüstü üst menü; 320px – 1920px arası test edilmiştir
- Görseller lazy-load; yüklenen fotoğraflar istemci tarafında sıkıştırılır (thumbnail + full)

## Klasör yapısı

```
dulukhub/
│
├── index.html               SPA kabuğu (header, ekranlar, alt menü)
├── css/
│   ├── style.css            Değişkenler, tema, yerleşim, header, ekranlar
│   ├── components.css       Buton, kart, modal, form, toast, skeleton…
│   └── responsive.css       Mobil/tablet/desktop media sorguları
├── js/
│   ├── app.js               Giriş noktası: tema, toast, modal, ana sayfa, duyurular
│   ├── navigation.js        Ekran yöneticisi ve hash router
│   ├── firebase.js          Firebase kurulumu + veri servisi (demo mod dahil)
│   ├── data.js              Demo içerik (Firestore boşken gösterilir)
│   ├── news.js              Haberler listesi ve detay
│   ├── gallery.js           Galeri ızgarası ve lightbox
│   ├── events.js            Etkinlikler ve detay modali
│   └── auth.js              Giriş/kayıt, profil, admin yönetimi
├── assets/
│   ├── logo.svg
│   └── favicon.svg
├── firestore.rules
├── storage.rules
└── README.md
```

## Firebase kurulumu

1. [Firebase Console](https://console.firebase.google.com) → projeyi açın
   (mevcut proje: `dulukhub`).
2. **Authentication** → Sign-in method → *E-posta/Şifre* yöntemini etkinleştirin.
3. **Firestore Database** oluşturun (production mode önerilir) ve `firestore.rules`
   dosyasındaki kuralları yayınlayın:
   ```bash
   firebase deploy --only firestore:rules
   ```
4. **Storage** başlatın ve `storage.rules` dosyasını yayınlayın:
   ```bash
   firebase deploy --only storage:rules
   ```
5. **İlk admin'i atayın:** Firebase konsolunda manuel olarak ilk kullanıcıyı
   oluşturun (veya kayıt formuyla kaydolun). Ardından Firestore'da `users/{uid}`
   belgesine gidip `role: "admin"` alanını ekleyin. Diğer kullanıcıları da
   konsol/Cloud Functions üzerinden yönetebilirsiniz.
6. Firebase yapılandırması `js/firebase.js` içinde hazırdır:
   `apiKey`, `authDomain`, `projectId`, `storageBucket`, `appId` vb.

### Güvenlik notları

- Yetki kontrolü **yalnızca** Security Rules ile yapılır; admin panelini arayüzde
  gizlemek güvenlik değildir.
- Şifreler Firestore'da saklanmaz (Firebase Authentication yönetir).
- Fotoğraflar Storage'a yüklenir; Firestore yalnızca metadata tutar.
- Firestore kuralları: normal kullanıcılar yalnızca kendi profillerini düzenler,
  içerik yazma/silme işlemleri admin'e özeldir.

### Demo mod

Firestore'a erişim yoksa (kurallar kapalı / kurulum tamamlanmadı) site otomatik
demo moda geçer: `js/data.js` içindeki örnek içerik ve tarayıcı `localStorage`'ında
tutulan yerele yazılan içerik kullanılır. `localStorage.clear()` ile sıfırlanır.

## Yerelde çalıştırma

```bash
# Kök klasörde:
npx serve .
# veya
python -m http.server 8080
# → http://localhost:8080
```

Dosyaları `file://` üzerinden değil, bir sunucu üzerinden açın (ES modülleri
için gerekir).

## GitHub Pages kurulumu

1. Bu klasörü bir GitHub deposuna gönderin:
   ```bash
   git init
   git add .
   git commit -m "Dülük Hub başlangıç"
   git branch -M main
   git remote add origin https://github.com/byalizza/dulukhub.git
   git push -u origin main
   ```
2. GitHub → Repo → **Settings → Pages** → Source: `Deploy from a branch`,
   branch: `main`, klasör: `/ (root)` → Save.
3. Site `https://byalizza.github.io/dulukhub/` adresinde yayına girer.

### Özel alan adı (dulukhub.com)

1. Domain sağlayıcınızda bir `CNAME` kaydı oluşturun:
   - Host: `www` → Value: `byalizza.github.io`
2. GitHub Pages → **Custom domain** → `dulukhub.com` yazın → Save
   (GitHub otomatik `CNAME` dosyası oluşturur).
3. Root domain için sağlayıcınızda `A` kayıtları (GitHub'ın önerdiği IP'ler)
   ve `CNAME` (`www` → `byalizza.github.io`) ekleyin.
4. HTTPS otomatik etkinleşir (DNS yayılınca yeniden dene).

> `dulukhub.com` isteğe bağlıdır; proje GitHub Pages'de doğrudan da çalışır.

## Geliştirme adımları

1. `js/data.js` içindeki demo içeriği Firestore'a taşıyın (admin paneli veya
   konsol üzerinden).
2. İlk admin kullanıcısını atayın (yukarıya bkz.).
3. Kuralları yayınlayın; demo mod yerine canlı veriler yüklenir.
4. Fotoğraflar için Storage'a yükleme akışı hazırdır (admin paneli).

## SEO

- `index.html` içinde `title`, `description`, Open Graph meta etiketleri hazırdır.
- Ekran değişiminde `document.title` güncellenir:
  - `Dülük Hub — Dülük Köyü`
  - `Haberler — Dülük Hub`
  - `Galeri — Dülük Hub` …

## Teknolojiler

Yalnızca vanilya HTML/CSS/JavaScript (ES modülleri) + Firebase Web SDK v11
(CDN üzerinden). Framework veya ağır paket yok.

---

© 2026 Dülük Hub