/* ============================================================
   Dülük Hub — data.js
   Demo içerik. Firestore bağlantısı kurulamadığında
   (Security Rules kapalı / kurulum tamamlanmamış) gösterilir.
   ============================================================ */

const img = (seed) => `https://picsum.photos/seed/duluk${seed}`;

export const DEMO = {
    posts: [
        {
            id: "demo-post-1",
            title: "Köy Meydanındaki Çınar Ağacı Yenilendi",
            description: "Köy meydanımızdaki tarihi çınar ağacının bakımı tamamlandı.",
            category: "Güncel",
            date: "2026-08-14T10:00:00.000Z",
            cover: img("cinar") + "/1200/675",
            content: [
                "Köy meydanımızdaki yıllara tanıklık eden çınar ağacının bakım ve yenileme çalışmaları tamamlandı. Gönüllü köylülerimizin katkısıyla ağacın çevresi düzenlendi, oturma alanları yenilendi.",
                "Meydanda yapılan düzenlemeyle hem büyüklerimiz hem de çocuklarımız için daha güvenli ve ferah bir buluşma alanı oluşturuldu. Çalışmalar sırasında emeği geçen herkese teşekkür ederiz.",
                "Önümüzdeki hafta meydana iki adet çöp konteyneri ve aydınlatma lambası daha eklenecek. Köyümüzün her köşesini güzelleştirmeye devam edeceğiz."
            ]
        },
        {
            id: "demo-post-2",
            title: "Mahalle Arası Futbol Turnuvası Başlıyor",
            description: "Yaz sonu futbol turnuvasına tüm mahalleler davetli. Kayıtlar devam ediyor.",
            category: "Güncel",
            date: "2026-08-12T09:00:00.000Z",
            cover: img("futbol") + "/1200/675",
            content: [
                "Geleneksel mahalle arası futbol turnuvası bu yıl da düzenleniyor. Turnuva 24 Ağustos'ta köy spor sahasında başlayacak ve iki hafta boyunca hafta sonları oynanacak.",
                "Takımınızı kurmak için en az 7 oyuncudan oluşan bir liste hazırlayıp muhtarlığa başvurabilirsiniz. Turnuva sonunda ilk üç takıma kupa ve madalya verilecek.",
                "Kayıt için son tarih 21 Ağustos. Spor yapmak ve birlikte eğlenmek isteyen herkesi bekliyoruz."
            ]
        },
        {
            id: "demo-post-3",
            title: "Yeni Su Deposu İnşaatına Başlandı",
            description: "Köyümüzün yeni su deposu için temel çalışmaları başladı.",
            category: "Güncel",
            date: "2026-08-10T08:30:00.000Z",
            cover: img("su") + "/1200/675",
            content: [
                "Yaz aylarında yaşanan su sıkıntısına kalıcı çözüm getirecek yeni su deposunun temel çalışmalarına başlandı. İnşaatın sonbahar sonunda tamamlanması planlanıyor.",
                "Depo tamamlandığında köyümüzün günlük su kapasitesi iki katına çıkacak. Belediye ve kaymakamlık desteğiyle gerçekleştirilen proje, köyümüzün önümüzdeki yıllardaki ihtiyaçlarını karşılayacak.",
                "Çalışmalar devam ederken yol kullanımında dikkatli olmanızı rica ederiz."
            ]
        },
        {
            id: "demo-post-4",
            title: "Köy Kütüphanesi Kitap Bağışı Kampanyası",
            description: "Köy kütüphanemiz için kitap bağışı kampanyası başlattık.",
            category: "Güncel",
            date: "2026-08-08T14:00:00.000Z",
            cover: img("kitap") + "/1200/675",
            content: [
                "Köy kütüphanemizin raflarını zenginleştirmek için kitap bağışı kampanyası başlattık. Okuduğunuz ve artık ihtiyacınız olmayan kitaplarınızı kütüphaneye bırakabilirsiniz.",
                "Özellikle çocuk kitapları, hikâye kitapları ve ansiklopedilere öncelik veriyoruz. Bağışlanan her kitap kütüphaneye kayıt altına alınıp köyümüzün kullanımına sunulacak.",
                "Kampanya dönemi sonunda en çok kitap bağışlayan üç kişiye teşekkür plaketi verilecek. Desteklerinizi bekliyoruz."
            ]
        },
        {
            id: "demo-post-5",
            title: "Elektrik Şebekesi Yenileme Çalışması",
            description: "Köy genelinde elektrik şebekesi yenileme çalışması yapılacak.",
            category: "Güncel",
            date: "2026-08-06T11:00:00.000Z",
            cover: img("elektrik") + "/1200/675",
            content: [
                "Enerji dağıtım firması tarafından köyümüzdeki elektrik şebekesinin yenileme çalışmalarına başlanacak. Çalışmalar mahalle mahalle ilerleyecek.",
                "Çalışma yapılan sokaklarda gün içinde kısa süreli elektrik kesintileri yaşanabilecek. Kesinti saatleri bir gün önceden muhtarlık tarafından duyurulacak.",
                "Elektrikli cihazlarınızı korumak için duyurulan saatlerde hassas cihazlarınızı fişten çekebilirsiniz. Anlayışınız için teşekkür ederiz."
            ]
        },
        {
            id: "demo-post-6",
            title: "Bağ Bozumu Şenliği Bu Yıl 12 Eylül'de",
            description: "Geleneksel bağ bozumu şenliğimiz için hazırlıklar başladı.",
            category: "Güncel",
            date: "2026-08-04T16:00:00.000Z",
            cover: img("bag") + "/1200/675",
            content: [
                "Her yıl geleneksel olarak düzenlenen bağ bozumu şenliği bu yıl 12 Eylül Cumartesi günü gerçekleştirilecek. Şenlikte üzüm sergisi, yerel ürünler ve müzik dinletisi olacak.",
                "Şenlik alanında köylülerimizin el emeği ürünlerinin sergileneceği stantlar kurulacak. Stant açmak isteyenler en geç 5 Eylül'e kadar muhtarlığa başvurmalı.",
                "Tüm köylülerimiz, akrabalarımız ve misafirlerimiz şenliğimize davetlidir."
            ]
        }
    ],

    photos: [
        { id: "demo-photo-1", title: "Köy meydanı", description: "Sabah ışığında köy meydanımız.", category: "Köy", date: "2026-08-15T08:00:00.000Z", thumbs: img("meydan") + "/400/300", full: img("meydan") + "/1400/1050" },
        { id: "demo-photo-2", title: "Bağlar", description: "Yeşil bağlar, hasat öncesi.", category: "Doğa", date: "2026-08-12T09:00:00.000Z", thumbs: img("baglar") + "/400/300", full: img("baglar") + "/1400/1050" },
        { id: "demo-photo-3", title: "Muhtarlık binası", description: "Köy muhtarlık binamız.", category: "Köy", date: "2026-08-10T10:00:00.000Z", thumbs: img("muhtarlik") + "/400/300", full: img("muhtarlik") + "/1400/1050" },
        { id: "demo-photo-4", title: "Gün batımı", description: "Tepeden köyümüzün gün batımı manzarası.", category: "Doğa", date: "2026-08-08T18:00:00.000Z", thumbs: img("gunbatimi") + "/400/300", full: img("gunbatimi") + "/1400/1050" },
        { id: "demo-photo-5", title: "Köy düğünü", description: "Yaz düğünlerinden bir kare.", category: "Etkinlik", date: "2026-08-05T20:00:00.000Z", thumbs: img("dugun") + "/400/300", full: img("dugun") + "/1400/1050" },
        { id: "demo-photo-6", title: "Çocuklar", description: "Mahallede oyun oynayan çocuklarımız.", category: "Köy", date: "2026-08-03T15:00:00.000Z", thumbs: img("cocuklar") + "/400/300", full: img("cocuklar") + "/1400/1050" },
        { id: "demo-photo-7", title: "Zeytinlik", description: "Köyümüzün zeytin ağaçları.", category: "Doğa", date: "2026-07-30T11:00:00.000Z", thumbs: img("zeytin") + "/400/300", full: img("zeytin") + "/1400/1050" },
        { id: "demo-photo-8", title: "Çeşme", description: "Tarihi köy çeşmemiz.", category: "Köy", date: "2026-07-28T09:00:00.000Z", thumbs: img("cesme") + "/400/300", full: img("cesme") + "/1400/1050" },
        { id: "demo-photo-9", title: "Kış manzarası", description: "Geçen kıştan bir kare.", category: "Doğa", date: "2026-01-15T10:00:00.000Z", thumbs: img("kis") + "/400/300", full: img("kis") + "/1400/1050" },
        { id: "demo-photo-10", title: "Tarla günü", description: "Birlikte tarla çalışmaları.", category: "Etkinlik", date: "2026-07-20T13:00:00.000Z", thumbs: img("tarla") + "/400/300", full: img("tarla") + "/1400/1050" },
        { id: "demo-photo-11", title: "Yayla yolunda", description: "Yayla yolundan bir kesit.", category: "Doğa", date: "2026-07-15T09:00:00.000Z", thumbs: img("yayla") + "/400/300", full: img("yayla") + "/1400/1050" },
        { id: "demo-photo-12", title: "Çarşı pazarı", description: "Pazar günü çarşıdan bir görünüm.", category: "Köy", date: "2026-07-12T12:00:00.000Z", thumbs: img("pazar") + "/400/300", full: img("pazar") + "/1400/1050" }
    ],

    events: [
        {
            id: "demo-event-1",
            title: "Mahalle Arası Futbol Turnuvası Açılışı",
            date: "2026-08-24",
            time: "16:00",
            location: "Köy Spor Sahası",
            description: "Yaz sonu futbol turnuvamızın açılış maçı ve kura çekimi yapılacak. Tüm köylülerimiz davetlidir. İki takım arasında eğlenceli bir karşılaşma bizi bekliyor."
        },
        {
            id: "demo-event-2",
            title: "Köy Genel Toplantısı",
            date: "2026-08-21",
            time: "19:00",
            location: "Köy Konağı",
            description: "Güz dönemi çalışmaları, su deposu inşaatı ve bağ bozumu şenliği gündemleriyle köy genel toplantısı düzenlenecektir. Kanaat önderlerimiz ve tüm köylülerimiz için önemli konular görüşülecek."
        },
        {
            id: "demo-event-3",
            title: "Kitap Bağışı Günü",
            date: "2026-08-18",
            time: "14:00",
            location: "Köy Kütüphanesi",
            description: "Kütüphane kampanyamız kapsamında kitap bağışlarını topluyoruz. Bağışçılarımıza çay ikramımız olacak. Getiremeyenler için evlerden de alım yapılacaktır."
        },
        {
            id: "demo-event-4",
            title: "Bağ Bozumu Şenliği Hazırlık Toplantısı",
            date: "2026-08-15",
            time: "20:00",
            location: "Köy Konağı",
            description: "12 Eylül'de düzenlenecek bağ bozumu şenliğinin organizasyon ekibi toplanacak. Görev dağılımı ve sponsorluk konuları görüşülecek."
        }
    ],

    announcements: [
        {
            id: "demo-announce-1",
            title: "Su deposu inşaatı nedeniyle Cumartesi günü 09:00-13:00 arası su kesintisi olacaktır.",
            date: "2026-08-17T08:00:00.000Z",
            important: true
        },
        {
            id: "demo-announce-2",
            title: "Futbol turnuvası takım kayıtları 21 Ağustos'ta sona eriyor. Kayıt için muhtarlığa uğrayın.",
            date: "2026-08-16T09:00:00.000Z",
            important: false
        },
        {
            id: "demo-announce-3",
            title: "Köy toplantısı 21 Ağustos Cuma akşamı saat 19:00'da köy konağında yapılacaktır.",
            date: "2026-08-14T10:00:00.000Z",
            important: true
        },
        {
            id: "demo-announce-4",
            title: "Çarşı pazarına gidecek araçlar için otopark alanı düzenlendi.",
            date: "2026-08-12T09:00:00.000Z",
            important: false
        }
    ],

    giveaways: [
        {
            id: "demo-giveaway-1",
            title: "Buğday Hasadı Çekilişi",
            description: "Üç şanslı aileye yarım ton doğal buğday hediye! Katılım için yalnızca köy sakinlerinin ayrılması yeterli.",
            prize: "Yarım ton buğday",
            endDate: "2026-09-10T20:00:00.000Z",
            participants: 34,
            target: 60
        },
        {
            id: "demo-giveaway-2",
            title: "Bağ Bozumu Şenliği Sürpriz Çekilişi",
            description: "Şenlik günü sahne önünde yapılacak çekilişte geleneksel yöresel sepet hediye edilecek.",
            prize: "Yöresel sepet",
            endDate: "2026-09-12T16:00:00.000Z",
            participants: 18,
            target: 40
        },
        {
            id: "demo-giveaway-3",
            title: "Çocuklar İçin Okul Seti Çekilişi",
            description: "Okul dönemi öncesi çocuklarımız için kırtasiye seti çekilişi düzenliyoruz.",
            prize: "Okul kırtasiye seti",
            endDate: "2026-09-01T10:00:00.000Z",
            participants: 52,
            target: 50
        }
    ],

    stories: [
        {
            id: "demo-story-1",
            title: "Eski Köy Değirmeni",
            content: "Köyümüzün doğusundaki tarihi su değirmeni, yıllarca tüm köyün ununu öğüttü. Babalarımız anlatır: Sabahın ilk ışığıyla değirmen taşı dönmeye başlar, suyun sesi köyün uyanış çanı gibiydi. Değirmenin son sahibi Hüseyin Amca, ununu kimseden esirgemez, borcunu ödeyemeyenin gönlünü alırdı.",
            author: "Mehmet K.",
            likes: 24,
            date: "2026-08-10T10:00:00.000Z"
        },
        {
            id: "demo-story-2",
            title: "Çınarın Gölgesinde Nikâh",
            content: "Meydandaki çınarın altında üç kuşaktır nikâh kıyılır. Derler ki çınar, gelinlerin duasını yapraklarında saklar. Geçen yaz, yetmiş yıl önce aynı çınarın altında nikâhlanan Halil Dede ile Hatice Nine'nin el ele tutuşan fotoğrafı köyde viral oldu.",
            author: "Zeynep T.",
            likes: 41,
            date: "2026-08-08T09:00:00.000Z"
        },
        {
            id: "demo-story-3",
            title: "Su Yolu Efsanesi",
            content: "Büyüklerimizin anlattığına göre köyümüzün su yolu, asırlar önce taş ustası bir usta tarafından tek başına yapılmış. Usta, her taşı oğlunun adıyla mühürlemiş. Bugün bile o mühürleri taşların arasında bulabilirsiniz.",
            author: "Ali R.",
            likes: 17,
            date: "2026-08-05T14:00:00.000Z"
        }
    ],

    heritage: [
        {
            id: "demo-heritage-1",
            title: "Köy Değirmeni Kalıntıları",
            era: "Osmanlı Dönemi",
            description: "Köyün doğusundaki dere kenarında yer alan değirmen kalıntıları, bölgenin tarım geçmişinin en önemli izlerinden biridir. Değirmen taşı hâlâ yerinde durmaktadır.",
            imageUrl: img("demirmen") + "/1200/750"
        },
        {
            id: "demo-heritage-2",
            title: "Tarihi Köy Çeşmesi",
            era: "Cumhuriyet Dönemi",
            description: "Meydandaki çeşme, 1930'larda köy halkının ortak emeğiyle inşa edilmiştir. Kitabesindeki yazı, 'Su gibi aziz ol' duasıyla başlar.",
            imageUrl: img("tcesme") + "/1200/750"
        },
        {
            id: "demo-heritage-3",
            title: "Antik Dülük Mağaraları",
            era: "Roma Dönemi",
            description: "Köyün kuzey yamaçlarındaki kaya mağaraları, Roma döneminde yerleşim ve atölye olarak kullanılmıştır. Duvarlardaki nişler ve merdiven izleri hâlâ görülebilmektedir.",
            imageUrl: img("magara") + "/1200/750"
        },
        {
            id: "demo-heritage-4",
            title: "Eski Mezarlık Kapısı",
            era: "Cumhuriyet Dönemi",
            description: "Köy mezarlığının taş kapısı, yöresel taş işçiliğinin güzel bir örneğidir. Kapı kemerindeki el oyması süslemeler 1940'lı yıllara aittir.",
            imageUrl: img("mezarlik") + "/1200/750"
        }
    ]
};