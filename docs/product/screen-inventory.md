# Ekran envanteri

Durum: aşağıdaki ekranlar mock API ile uygulanmıştır. Gerçek API, tahsilat, kimlik doğrulama, bildirim gönderimi veya production güvenliği tamamlanmış değildir.

| Rol            | Route / ekran             | Uygulanan davranış                                                                       |
| -------------- | ------------------------- | ---------------------------------------------------------------------------------------- |
| Public         | /                         | Statik HTML salon tanıtımı, API katalog listesi, hizmete doğrudan rezervasyon bağlantısı |
| Public/müşteri | /randevu                  | Hizmet, berber, tarih/saat, misafir iletişim, özet, süreli hold, demo kapora, onay       |
| Public         | /giris                    | Giriş, müşteri kayıt, doğrulama, demo hesap açıklaması                                   |
| Müşteri        | /randevularim             | Gelecek/geçmiş, detay, yeniden planlama, iptal onayı ve sayfalama                        |
| Yönetici       | /yonetim                  | Günlük operasyon özeti, gerçek fixture sayımlarından KPI, durum işlemleri                |
| Yönetici       | /yonetim/takvim           | Günlük/haftalık tarih gruplu randevu ajandası; yeni randevu ortak akış üzerinden         |
| Yönetici       | /yonetim/hizmetler        | Hizmet ekleme/düzenleme, süre, fiyat, kapora, aktiflik                                   |
| Yönetici       | /yonetim/calisanlar       | Çalışan ekleme/düzenleme ve aktiflik; yeni çalışana mevcut hizmetler atanır              |
| Yönetici       | /yonetim/koltuklar        | Koltuk ekleme/düzenleme ve aktiflik                                                      |
| Yönetici       | /yonetim/mesai            | Tarihli mesai, mola ve izin ekleme/düzenleme                                             |
| Yönetici       | /yonetim/musteriler       | Müşteri arama, ekleme ve iletişim bilgilerini düzenleme                                  |
| Yönetici       | /yonetim/odemeler         | Kapora/ödeme durumu kayıtları; gerçek tahsilat/iade yok                                  |
| Yönetici       | /yonetim/raporlar         | Tamamlanan ziyaret, hizmet tutarı, kapora ve hizmet dağılımı                             |
| Yönetici       | /yonetim/ayarlar          | Salon adı/açıklaması/adres/telefon düzenleme                                             |
| Çalışan        | /calisan, /calisan/takvim | Kendi günlük/haftalık planı, detay, başlat/tamamla/gelmedi                               |
| Çalışan        | /calisan/mesai            | Yalnız kendi mesai, mola ve izinlerini görüntüleme                                       |
| Ortak          | erişim/404/hata           | Giriş gereksinimi, rol reddi, bulunamayan sayfa ve retry                                 |

## Bilinçli MVP sınırları

26 Ekim 2026 görsel güncellemesi: public ana sayfa artık fotoğraflı landing page'dir; Barbero referanslı siyah-beyaz hero, hareketli fotoğraf şeridi, büyük fotoğraflı hizmetler, berberler, SSS ve iletişim içerir. Rezervasyon bağlantıları mevcut akışa gider. Görsellerin kaynakları ve simülasyon sınırı sayfada belirtilir; doğrulama docs/quality/landing-verification.md içindedir.

Takvim erişilebilir tarih gruplu ajandadır; sürükle-bırak veya iki boyutlu zaman çizelgesi yoktur. Mesai kayıtları tarihlidir; tekrarlayan vardiya şablonu yoktur. Çalışan-hizmet eşleştirmesi contract'ta vardır; detaylı atama editörü ilk sürümde bulunmaz. Bildirim gönderimi ve guest OTP ile sonradan randevu erişimi backend entegrasyonuna bırakılmıştır. Fiziksel silme ve audit geçmişi bu frontend'de üretilmez. Salon public SEO snapshot değişiklikleri yeniden build gerektirir.

Tüm API bloklarında loading/error/empty durumu veya geçerli sıfır değeri vardır. Route guard UX içindir; MSW testleri gerçek sunucu yetkilendirmesini kanıtlamaz. İlgili test kanıtları docs/quality/verification.md içindedir.
