# Yönetici ödeme ayarları ve tahsilat

27 Ekim 2026 güncellemesi: [ADR 0008](../adr/0008-manual-collections-and-payment-policy.md) ile üst bölüme kalıcı kapora ve müşteri POS görünürlüğü tercihleri eklendi. Kaydet sunucuya yazar; eski randevu tutarları değişmez. Alt banka/sağlayıcı bölümü geçici önizleme olmaya devam eder. Aşağıdaki 26 Ekim notları yalnız bu eski taslak bölümünü anlatır.

`/yonetim/odemeler` ve yönetici randevu satırlarının Tahsilat düğmesi, focus ve kaydedilmemiş değişiklik koruması olan modal açar. Tutar, yöntem, alınan/kalan ve gerekçeli hata düzeltme geçmişi bulunur. Düzeltme banka iadesi yapmaz. Müşteri/çalışan özeti görebilir; sadece yönetici kayıt girer. Ücret kuruş olarak saklanır; randevu durumu ve tahsilat durumu ayrıdır. Liste durum filtresi, arama ve sayfalama sunar.

Yeni doğrulamalar: `tests/e2e/collections.spec.ts`, backend PostgreSQL entegrasyon testleri. Güncel sonuçlar `docs/quality/collections-review.md` içindedir.

## Tarihsel taslak kapsamı (26 Ekim)

26 Ekim 2026: Kullanıcı ödeme/POS altyapısının geliştirilmesini erteledi. Sağlayıcı seçilmedi.

Yol: `/yonetim/odeme-ayarlari`. Yönetici menüsünden veya Kapora kayıtları ekranından açılır; mevcut rol kapısı uygulanır.

`operations/PaymentSettings.tsx` banka adı, hesap sahibi, IBAN, sağlayıcı adı ve üye işyeri numarası için geçici form sunar. Sağlayıcı alanı boş başlar; yazılması sağlayıcı seçimi veya bağlantı kurmaz. Bağlantı bilgileri alanı pasiftir; parola/API anahtarı toplanmaz. Taslağı önizle yalnız ekranda özet gösterir. Alanları temizle formu sıfırlar. Ayrılınca bileşen state'i silinir. API çağrısı, tarayıcı depolaması, kalıcı kayıt veya tahsilat yoktur. Alanlar opsiyoneldir; IBAN doğrulaması veya kullanılabilir banka hesabı onayı vaat edilmez.

Mevcut Outfit, semantik tema tokenları, Field/Button/Notice bileşenleri kullanılır. Form etiketleri, durum duyurusu, mobil tek sütun, geniş ekranda açıklama/form ayrımı ve açık/koyu tema desteklenir. Önizleme müşteriye gösterilmez.

Bu görevde eklenmiş backend ödeme modülü, ödeme endpointleri, manuel tahsilat/iade kodu ve ödeme tabloları geri alındı. Eski frontend demo rezervasyon akışındaki ödeme simülasyonu korunur; gerçek ödeme entegrasyonu değildir. Yeni ayar ekranının backend sözleşmesi yoktur. Sağlayıcı belli olduğunda sözleşme, veri saklama, yetkilendirme ve entegrasyon ayrı kapsamda tasarlanacaktır.

Doğrulama: `tests/e2e/payment-settings.spec.ts`; üç ekran genişliği, açık/koyu tema, axe, yatay taşma, önizleme/temizleme, navigasyonda sıfırlama, yazma isteği ve storage değişimi olmaması, çalışan erişim reddi.

Son kontrol (26 Ekim 2026): 40/40 tarayıcı testi, 23/23 frontend birim/bileşen/sözleşme testi, 13/13 backend domain/PostgreSQL testi geçti. Ödeme route ve şemasının bulunmaması backend regresyon testiyle doğrulandı. Tip, lint, mimari sınırlar ve OpenAPI drift kontrolleri geçti. Bu sonuçlar gerçek POS entegrasyonu veya production dağıtım onayı değildir.
