# Dülük Hub

Dülük Köyü için hazırlanmış **mobil-first** topluluk web sitesi — telefonda bir uygulama gibi hissettirir. Tek sayfa uygulama (SPA) mantığında çalışır: sayfa yenilenmez, ekranlar aynı görünüm alanı içinde değişir.

**Web adresi:** https://dulukhub.com

## Özellikler

- Mobil-first tasarım: sol üst hamburger menü, soldan açılan renkli çekmece (tablar dikey sıralanır), telefonda uygulama hissi
- **Zorunlu kayıt / giriş** — misafir girişi yoktur. Kayıt: kullanıcı adı + **e-posta veya telefon** + şifre (Firebase'e kaydedilir)
- Ekranlar: Haberler (filtre + detay), Etkinlikler, Çekilişler (katılım + ilerleme), Köy Galerisi (kare ızgara + lightbox), Köy Hikayeleri (beğeni), Tarihi Eserler, Ayarlar, Profilim, Yönetim
- Yönetim paneli: çekmecedeki **"Yönetim"** satırı → yetki kodu (**355334**) girişi; yalnızca `role: "admin"` sahibi hesaplar içeri girer
- SPA hash router, geri/ileri tuşu desteği, karanlık tema (sistem algılama + manuel)
- Firebase: Authentication (e-posta/şifre; telefon girişi de e-posta eşlemesiyle çalışır) ve Firestore
- Admin yönetimi: haber, fotoğraf, etkinlik, çekiliş, hikâye, tarihi eser, duyuru ekleme/silme
- Demo mod: Firestore erişilemezse site bozulmaz; örnek içerik + yerel (localStorage) kayıtlarla çalışır
- Görseller lazy-load; galeri görselleri görsel bağlantısıyla eklenir
- Erişilebilirlik: semantik HTML, klavye (Tab/Enter/Esc), `aria-current`, focus yönetimi, `prefers-reduced-motion`

## Klasör yapısı

```
dulukhub/
│
├── index.html               SPA kabuğu (header, çekmece menü, auth kapısı, ekranlar)
├── css/
│   ├── style.css            Değişkenler, tema, yerleşim, çekmece, auth kapısı
│   ├── components.css       Buton, kart, modal, form, lightbox, toast, skeleton…
│   └── responsive.css       Mobil/tablet/desktop media sorguları
├── js/
│   ├── app.js               Giriş noktası: yardımcılar, tema, toast, modal
│   ├── navigation.js        Router + çekmece menü kontrolü
│   ├── firebase.js          Firebase kurulumu + veri servisi (demo mod dahil)
│   ├── data.js              Demo içerik (Firestore boşken gösterilir)
│   ├── auth.js              Zorunlu kayıt/giriş kapısı, profil, Yönetim kodu, admin paneli
│   ├── news.js              Haberler listesi ve detay
│   ├── events.js            Etkinlikler ve detay modali
│   ├── giveaway.js          Çekilişler ve katılım
│   ├── gallery.js           Galeri ızgarası ve lightbox
│   ├── stories.js           Köy hikayeleri ve beğeni
│   ├── heritage.js          Tarihi eserler
│   └── settings.js          Ayarlar
├── assets/
│   ├── logo.svg
│   └── favicon.svg
├── firestore.rules
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
4. **İlk admin'i atayın:** Kayıt formuyla kaydolun, sonra Firestore'da `users/{uid}`
   belgesinin içine `role: "admin"` alanını ekleyin. Bu yapılmadan "Yönetim" kodu
   (355334) doğru girilse bile panel açılmaz.
5. Firebase yapılandırması `js/firebase.js` içinde hazırdır.

### Güvenlik notları

- Yetki kontrolü **yalnızca** Security Rules ile yapılır; Yönetim kodu (355334)
  yalnızca arayüz kapısıdır, gerçek yetki Firestore kurallarındadır.
- Şifreler Firestore'da saklanmaz (Firebase Authentication yönetir).
- Telefonla kayıt: telefon numarası sabit bir e-posta adresine eşlenir
  (`phone<numara>@dulukhub.app`) — SMS doğrulaması gerektirmez, şifre koruması vardır.
- Çekilişe katılım, Firestore kuralıyla yalnızca `participants + 1` güncellemesine
  izin verir (oturum açmış kullanıcı).
- Demo modda kullanıcılar ve oturum `localStorage`'da tutulur; `localStorage.clear()`
  ile sıfırlanır.

### Demo mod

Firestore'a erişim yoksa site otomatik demo moda geçer: `js/data.js` içindeki örnek
içerik ve `localStorage` kullanılır. Kayıt/giriş de yerel olarak çalışır.

## Yerelde çalıştırma

```bash
npx serve .
# → http://localhost:3000
```

Dosyaları `file://` üzerinden değil, bir sunucu üzerinden açın (ES modülleri
için gerekir).

## GitHub Pages

Site `https://byalizza.github.io/dulukhub/` adresinde yayındadır
(`.github/workflows/deploy.yml` ile statik deploy). Özel alan adı (`dulukhub.com`)
için DNS yönlendirmesi yeterlidir.

## SEO

- `index.html` içinde `title`, `description`, Open Graph meta etiketleri hazırdır.
- Ekran değişiminde `document.title` güncellenir (`Haberler — Dülük Hub`, `Galeri — Dülük Hub` …).

## Teknolojiler

Yalnızca vanilya HTML/CSS/JavaScript (ES modülleri) + Firebase Web SDK v10
(CDN üzerinden). Framework veya ağır paket yok.

---

© 2026 Dülük Hub
