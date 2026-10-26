# Test stratejisi

- Unit: para/saat biçimleme, seçim geçişleri, validation.
- Component: etiket/hata ilişkisi, klavye, loading/error.
- Integration: gerçek fetch + MSW/node; auth, ownership, slot conflict, idempotency replay/mismatch, hold expiry, ödeme başarısızlığı.
- Contract: Zod request/response, OpenAPI parse ve üretilen dosya drift kontrolü.
- Architecture: dependency-cruiser döngü ve private import kontrolleri.
- E2E: misafir rezervasyonu/ödeme, çakışma, müşteri iptal/yeniden planlama, rol sınırları, yönetici/çalışan yolculukları.
- Accessibility: axe + klavye; mobil/tablet/desktop overflow ve konsol hataları.
- Performance: statik asset gzip bütçesi ve tarayıcı navigation ölçümü. Laboratuvar sonuçları saha Core Web Vitals değildir.

Mock testleri PostgreSQL constraint, dağıtık transaction, webhook imzası veya gerçek güvenliği kanıtlamaz. Bunlar backend entegrasyonu/release öncesi ayrı gate'tir. Testler sabit bir mock saat ve başlangıç verisi kullanır.
