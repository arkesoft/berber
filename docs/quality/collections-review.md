# Tahsilat ve ödeme tercihleri — 27 Ekim 2026

## Kullanım

- Yönetim → Tahsilat kayıtları veya randevu satırı → Tahsilat: alınan tutar (TL), yöntem ve açıklama girilir. Kapora/kısmi ödeme ve kalan bakiye ayrı görünür. Hatalı kayıt gerekçeyle ters çevrilir, geçmiş silinmez.
- Yönetim → Ödeme ayarları: kapora talebi ve müşteri POS alanı görünürlüğü bağımsız kaydedilir. Eski randevuların kapora/fiyat snapshot'ları korunur. Görünürlüğü açmak sağlayıcı bağlantısı kurmaz.
- Yerel uygulama: http://127.0.0.1:5174/giris. Mevcut üç rol hesabı korunmuştur.

## Değişiklikler ve veri bütünlüğü

`app/contracts/schemas.ts`, `contracts/openapi.json`: 1.3.0 ayar/tahsilat sözleşmeleri, rezervasyonda received.

`backend/src/modules/payments/index.ts`: yönetici yetkisi, defter, ters kayıt, idempotency ve audit. `salon/index.ts` kalıcı versiyonlu tercihleri; `reservations/domain.ts`, `application.ts`, `postgres.ts` kapora snapshot'ını, net tutarı, izinli durumları ve onay geçişini uygular. HTTP adapter ve mimari sınır kontrolleri güncellendi.

`backend/migrations/1793200000000-collections-settings.sql`: aynı salon/randevu/aktör FK'ları, bir kez ters kayıt, immutable tarihçe ve para CHECK kısıtları; mevcut booking/user ilişkilerinde aynı salon composite FK. `backend/deploy/runtime-grants.sql` deftere yalnız SELECT/INSERT verir. Eski belirsiz paid/refunded işaretleri migration'ı durdurur; bunlardan para tutarı uydurulmaz.

`app/modules/payments/index.tsx`, `operations/PaymentSettings.tsx`, `Operations.tsx`, `appointments/Appointments.tsx`, `booking/Booking.tsx`: modal kayıt/düzeltme, kalan tutar, durum filtreleri, raporda net tahsilat, kalıcı ayarlar ve public görünürlük. Yerel metin anahtarları, demo adapter, sticky modal başlığı ve stil tokenları güncellendi.

## Doğrulamalar

- Frontend `npm run check`: strict tip, lint, OpenAPI drift, mimari sınır, 23 test geçti.
- Backend: strict tip/mimari kontrolleri ve gerçek PostgreSQL üzerinde 19 test geçti. Kısmi/tam/yanlış tutar, aynı/farklı anahtarla yarış, iptal-tahsilat yarışı, response replay, düzeltmenin tekrarı, DB immutable/FK, hold expiry, çalışan/müşteri/anonim reddi ve snapshot korunması dahil.
- `npm run test:e2e`: 54 test geçti. Üç genişlik (390/768/1440), açık/koyu tema, axe, modal/focus, düzeltme, kayıp yanıtın aynı işlemle tekrarı, iki bağımsız tercih ve kaporasız oluşturma dahil.
- `npm run format:check` geçti. Gerçek yerel API ile üç rol giriş/erişim smoke kontrolü ve üç genişlikte ödeme ayarları kontrolü geçti; tarayıcı hatası yok.
- İlk ayar navigasyon testinde önbellekteki eski versiyon sorunu bulundu ve cache güncellenerek düzeltildi; tam 54 testlik koşu düzeltme sonrası geçti.
- Demo ve gerçek API build'leri geçti. `scripts/check-live.mjs` gerçek build'de mock worker/demo hesapları bulunmadığını ve public HTML render edildiğini doğruladı. Gzip JS 191.290 bayt, en büyük chunk 66.625 bayt; mevcut bütçeler içinde.
- Görsel inceleme mevcut framed-sheet yönünü (seed 822710821), Outfit ve marka renklerini korudu. Ayar ekranı “kapora/görünürlük politikam nedir?”, tahsilat modalı “ne kadar alındı, ne kadar kaldı?” sorularını cevaplar. Üç genişlikte görüntüler okundu; yatay taşma yok. Inspector 0 FAIL/0 WARN: sadece `covered-text` kontrolünde native modalın arka plan başlıklarını kasıtlı örtmesi istisna tutuldu. Modalın kendi metinleri, focus ve klavye davranışı gerçek tarayıcı testlerinde ayrıca kontrol edildi. Inspector statik demo görüntüsünü, yerel smoke ise gerçek API'yi kullandı. Demo örnekleri `app/mocks/data.ts` ve `app/mocks/handlers.ts` içindedir; gerçek build bunları içermez.

## Yerel geçiş ve geri dönüş

Geçişten önce `.local/backups/salon-local-before-panels-1793085225690.dump` alındı. Migration mevcut salon_local üzerinde başarıyla uygulandı; API ve worker yeni kodla yeniden başlatıldı. Yerel kullanıcı/randevu verisi silinmedi; gerçek yerel ekranda tahsilat testi için sahte para girişi yapılmadı. Otomatik down finansal geçmişi silmemek için reddedilir. Forward-fix veya doğrulanmış yedek geri yükleme gerekir; restore tatbikatı bu görevde yapılmadı.

## Sınırlar

Gerçek sanal POS, webhook, otomatik/kısmi banka iadesi yoktur. Hatalı kayıt düzeltmesi fiilî iade değildir. İptal/expired kayıtta alınmış para varsa inceleme bilgisi gösterilir; kaporanın otomatik yanacağı varsayılmaz. Banka/IBAN/sağlayıcı formu geçici taslaktır.

Genel operasyon snapshot'ı ve randevu başına tahsilat geçmişi UI'da sayfalanır; backend müşteri rezervasyon listesi SQL sayfalıdır. Çalışan-hizmet atamaları hâlâ salon dokümanında doğrulanan serviceIds dizisidir; bu çalışma bütün eski JSON alanlarını normalize etmiş sayılmaz. Production deploy, load, backup restore ve gerçek provider doğrulaması yapılmadı.
