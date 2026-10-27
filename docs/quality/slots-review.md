# Saat aralığı ve doluluk görünümü — 27 Ekim 2026

## Kullanım

Yönetim → Salon ayarları → Düzenle → Randevu saat aralığı (dakika). Yönetici 5–120 arasında tam sayı kaydeder; varsayılan 15 dakikadır. Örneğin 20 dakika ve 09.00 mesai başlangıcı için 09.00, 09.20, 09.40 üretilir. Hizmet süresi ve hazırlık süresi ayrıca uygulanır; mevcut randevular değiştirilmez.

Rezervasyon ve saat değiştirme ekranlarında dolu saatler kırmızı zemin ve Dolu metniyle görünür, seçilemez. Müsait, Seçildi, Uygun değil ve Geçti durumları ayrıdır. Alt renk anahtarı ve açılır soru işareti açıklaması bulunur. Tamamen dolu gün de saatleri gösterir. Müsaitlik 30 saniyede yenilenir; son kontrol kayıt sırasında sunucudadır.

## Değişen dosyalar ve bütünlük

- `app/contracts/schemas.ts`, `scripts/contracts.ts`, `contracts/openapi.json`: 1.4.0 sözleşmesi; salon aralığı ve ayrı `unavailableSlots`. Eski `slots` yalnız seçilebilir sonuçları taşır.
- `backend/src/modules/scheduling/domain.ts`, `reservations/application.ts`: aynı mesai/mola/izin, hizmet/buffer ve ortak/atanmış koltuk kuralları üzerinden durum hesabı. Public yanıtta müşteri/randevu bilgisi yoktur. Dolu veya yeni aralığa uymayan saatle kayıt reddedilir; mevcut transaction ve exclusion constraint korunur.
- `backend/migrations/1793300000000-slot-interval.sql`: salon belgesinden üretilen sütun ve DB CHECK; bağımsız, çelişebilen ayar kopyası yoktur. Yönetici yetkisi, CSRF, audit ve mevcut ayar sürümleme akışı kullanılır.
- `app/shared/SlotPicker.tsx`, `locales/slots.tr.ts`, `i18n.ts`, `tokens.css`, `styles.css`; `booking/Booking.tsx`, `booking/api.ts`, `appointments/Appointments.tsx`, `operations/Management.tsx` ve `mocks/handlers.ts`: ortak erişilebilir saat seçimi, ayar formu, yenileme ve demo uyumu.
- `backend/src/modules/reservations/domain.ts`: yeniden planlamada slot nesnesinin randevu kimliği/durumunu ezmesi engellendi; yalnız zaman ve koltuk alanları kopyalanır. Salon formunda bookingDays sayı dönüşümü düzeltildi. `app/root.tsx` tema düğmesinin görünür metni erişilebilir adıyla eşleştirildi.
- `backend/tests/domain.test.ts`, `backend/tests/integration.test.ts`, `tests/slot-picker.test.tsx`, `tests/e2e/slots.spec.ts`: yeni kuralların ve bulunan hataların regresyon kontrolleri. Karar: `docs/adr/0009-slot-interval-and-availability-overview.md`; API belgesi güncellendi.

## Doğrulama

- Frontend `npm run check`: tip, lint, OpenAPI drift, mimari ve 25 test geçti.
- Backend tip/mimari ve gerçek PostgreSQL dahil 22 test geçti. Ayar yetkisi/kalıcılığı, DB CHECK, eski randevunun korunması, dolu/aralık dışı kayıt reddi, ortak koltuk çakışması, iptal sonrası serbestleşme, yeniden planlama kimliği ve mevcut yarış/idempotency testleri dahil.
- Tam Playwright koşusu: 58 test geçti. Yeni dört senaryo 390/768/1440 genişlikleri, açık/koyu tema, axe, klavye, seçilemeyen dolu saatler, açıklama ve yönetici ayarının rezervasyona yansımasını kapsar.
- Format kontrolü ve `git diff --check` geçti. Demo ve gerçek API derlemeleri geçti. Gerçek build'de mock worker/demo hesapları bulunmadığı ve public HTML ön üretimi doğrulandı; bundle bütçesi geçti.
- Gerçek yerel uygulamada yönetici ayarı okundu; API durumları ile ekrandaki saat sayısı ve disabled davranışı üç genişlikte eşleşti (kontrol anında 19 müsait, 22 seçilemeyen saat). Yatay taşma ve tarayıcı hatası yoktu. Bu kontrolde gerçek randevu veya tahsilat oluşturulmadı.
- Gerçek uygulama ve demo ekran görüntüleri incelendi. Outfit, mevcut marka ve framed-sheet yönü korundu. Inspector: 0 FAIL, 1 WARN. `emoji` istisnası yalnız mevcut adım tamamlandı işareti U+2713 için kullanıldı; bu işaret süs değil durum bilgisidir. Başlık boyutu uyarısı korundu: public rezervasyonun mevcut marka başlığı, bir yönetim ekranı başlığı değildir. Saatlerin durum metni, renk ve native disabled kontrolü birlikte çalışır. Inspector statik görüntüyü; Playwright etkileşimleri ve gerçek API kontrolü davranışı doğruladı.

## Yerel geçiş ve sınırlar

Önce `.local/backups/salon-local-before-panels-1793087182299.dump` yedeği alındı. Migration mevcut yerel veritabanına uygulandı; API güncel kodla çalışıyor. Veriler silinmedi. Down yalnız üretilen sütunu kaldırır, belgede tercih kalır; eski kod 15 dakika kullanacağından kod geri dönüşü kontrollü yapılmalıdır.

Production deploy, yük testi ve yedekten geri yükleme tatbikatı yapılmadı. Bu değişiklik gerçek POS entegrasyonu eklemez. Mesai dışında veya hizmet+hazırlığın mesaiye sığmadığı başlangıçlar gösterilmez. Build başarılıdır; araçların mevcut envFile deprecation ve React Router gelecek sürüm uyarıları sürmektedir.
