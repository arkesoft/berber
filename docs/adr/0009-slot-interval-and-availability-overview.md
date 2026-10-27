# 0009 — Yönetilebilir saat aralığı ve müsaitlik görünümü

Durum: Kabul edildi, 27 Ekim 2026. Kullanıcı saat periyodunu yöneticiye bırakmak, dolu saatleri seçilemez biçimde göstermek ve renk açıklaması istedi.

## Context

Backend 15, eski demo 30 dakikalık sabit başlangıç aralığı kullanıyordu. Dolu saatler tamamen kaldırılıyor, kullanıcı neden seçilemediklerini göremiyordu.

## Decision

- Salon ayarlarında `slotIntervalMinutes`: 5–120 dakika arası tam sayı, varsayılan 15. Aralık her çalışan mesaisinin başlangıcından hesaplanır. Hizmet süresi ve hazırlık süresinden ayrıdır. Mevcut yönetici yetkili management sözleşmesi, CSRF, idempotency, audit ve salon transaction kilidi kullanılır.
- `salon.settings.slot_interval_minutes` mevcut belge alanından üretilen, aralık CHECK'i olan sütundur; ayrı ve drift edebilen ayar kopyası oluşturulmaz. Salon kimliği mevcut PK'ya bağlı kalır.
- Domain `slotOverview` aynı hizmet süresi, buffer, mesai/mola/izin/kapalı gün, çalışan ve uygun koltuk hesabını kullanarak available/busy/unavailable/past üretir. Mesaiye hizmet+buffer sığmayan başlangıçlar ve tarih penceresi dışı günler gösterilmez. Örtüşen mesailerde aynı başlangıç tek kez döner.
- API 1.4.0, mevcut `slots` alanını yalnız seçilebilir saatler olarak korur; `unavailableSlots` ekler. Böylece eski istemciler yanlışlıkla dolu saat seçmez. Public yanıt müşteri, randevu, koltuk veya izin nedeni bilgisi içermez; sadece saat, çalışan kimliği ve genel durum taşır.
- Oluşturma ve yeniden planlama yine yalnız available sonuçları kabul eder. Değişen aralığa uymayan eski slot ile commit 409 olur; mevcut randevular değiştirilmez. Veritabanındaki exclusion constraint ve transaction protokolü değişmez.
- Ortak SlotPicker rezervasyon ve saat değiştirmede kullanılır. Native disabled radio, durum metni, renk anahtarı ve açılır açıklama vardır. Sadece renge dayanılmaz. Müsaitlik 30 saniyede ve pencereye geri dönüldüğünde yenilenir; kayıt anındaki sunucu kontrolü belirleyicidir.

## Alternatives

Yalnız renk değiştirmek erişilebilir değildir. Dolu saatleri aynı `slots` dizisine eklemek eski API tüketicilerinin varsayımlarını bozar. Çalışan/hizmet bazlı ayrı periyotlar bu talep için gerekli değildir; mesailer zaten çalışan bazında yönetilir.

## Consequences

Gün tamamen doluysa saatler görünmeye devam eder. Kapasite genel bir durum olarak public görünür; kişisel bilgiler paylaşılmaz. Saat aralığı değiştirilmeden önce açılmış bir ekrandaki eski seçim commit aşamasında reddedilebilir, kullanıcı yenilenmiş listeye döner. Müsaitlik listesi yer ayırma garantisi değildir.

Regresyon kontrolünde saat değiştirmenin slot nesnesini Object.assign ile kopyalayarak randevu kimliğini ezebildiği bulundu. Domain artık yalnız startsAt/endsAt/occupiedUntil/chairId alanlarını kopyalar; kimlik, durum ve fiyat snapshot'ları korunur, gerçek PostgreSQL kalıcılığı test edilir. Salon formundaki bookingDays metin/sayı dönüşümü de düzeltildi.

## Migration/Rollback

`1793300000000-slot-interval.sql` ek sütun ve CHECK içerir; eksik alan 15 kabul edilir, veri silmez. Down yalnız ek sütunu kaldırır, salon belgesindeki tercih korunur. Eski uygulama sabit 15 kullanacağından kod rollback'i kontrollü yapılmalı veya forward-fix tercih edilmelidir. Önce isolated PostgreSQL testleri, sonra yedekli yerel geçiş. Production deploy kapsam dışı.

## Verification

Domain: keyfi aralık, invalid aralık, busy/past/break/chair/closure ayrımı; eski DST/gece yarısı testleri. PostgreSQL: yönetici yetkisi, DB CHECK, ayarın kalıcılığı, mevcut randevu snapshot'ı, dolu ve aralık dışı saatle commit reddi, koltuk paylaşımı, iptal sonrası serbestleşme, kişisel veri sızmaması. UI: üç genişlik, açık/koyu tema, axe, disabled ve klavye, açıklama, tamamen dolu gün, refresh sonrası seçimin düşmesi, yönetici kaydı ve public aralık.
