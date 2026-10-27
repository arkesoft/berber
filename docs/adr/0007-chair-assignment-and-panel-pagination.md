# ADR 0007 — Koltuk ataması ve panel listeleri

Durum: kabul edildi, 27 Ekim 2026. Kullanıcı ortak veya çalışana atanmış koltuk kullanımını seçti.

## Context

Koltuklar ortak kaynak olarak kullanılıyor, randevudaki koltuk arayüze taşınmıyordu. Uzun yönetim listeleri ve listenin altında açılan formlar kayıt bulmayı zorlaştırıyordu. Müşteri randevu filtresi sayfalama sonrasında uygulanıyor, toplam ile görünen kayıtlar uyuşmayabiliyordu.

## Decision

- Koltuk `assignedStaffId` boşsa ortak, doluysa yalnız ilgili çalışana ayrılır. Bir çalışana birden fazla koltuk atanabilir; koltuk aynı anda tek çalışana atanabilir. Çalışan hizmet ataması ayrı kalır.
- `salon.chairs.assigned_staff_id`, mevcut JSON belge alanından üretilen bir sütundur. `(salon_id, assigned_staff_id)` composite foreign key aynı salondaki gerçek çalışana bağlanır. Mevcut koltuklar ortak kalır. Mesai–çalışan ilişkisine de salon kapsamlı FK eklenir.
- Müsaitlik ve rezervasyon commit'i aynı koltuk filtresini kullanır. Mevcut salon transaction kilidi ile exclusion constraint korunur. Aktif randevuyu geçersiz kılan atama veya kaynak kapatma transaction içinde reddedilir. Manuel/online rezervasyon aynı use case'i kullanır.
- Randevu çıktısına geriye uyumlu `chairId` ve okunabilir `chairName` eklenir. Ekranlardaki ilişkiler bu kimliklerden türetilir; e-posta eşleşmesinden müşteri sahipliği çıkarılmaz.
- Müşteri randevu listesinde rol, durum grubu ve tarih SQL'de filtrelenir; ardından kararlı sıralama, LIMIT/OFFSET ve toplam uygulanır. `period=all|upcoming|past` durum gruplarını ifade eder. Eski istemciler için varsayılan `all` korunur.
- Yönetim kaynakları ve çalışan listelerinde mevcut operations snapshot üzerinde arama/filtreleme ve sayfalama uygulanır. Bu, aktarılan veri miktarını azaltmaz; büyük veri için ayrı kaynak endpointleri sonraki adımdır.
- Ortak native dialog, odak geri dönüşü, Escape, kaydedilmemiş değişiklik uyarısı ve işlem sürerken kapatmayı engelleme sağlar. Hatalar pencere içinde görünür kalır.

## Alternatives

Her çalışana zorunlu tek koltuk atamak ortak salon kaynaklarını gereksiz kısıtlardı. Sadece frontend eşleştirmesi güvenilir olmazdı. Tüm yönetim API'sini parçalamak bu kullanılabilirlik düzeltmesinin kapsamını gereksiz büyütürdü.

## Consequences

Atama artık müsaitliği etkileyen gerçek bir iş kuralıdır. Hiç uygun aktif koltuğu olmayan çalışana randevu alınamaz; çalışan listesi bu durumu gösterir. Yeni müşteri iletişim kaydı giriş hesabı oluşturmaz; mevcut randevu snapshot'ları yeniden yazılmaz. Kalıcı silme eklenmez.

## Migration/Rollback

`1793100000000-chair-assignment.sql` mevcut veriyi silmez ve belge içeriğini değiştirmez. Önce ayrı PostgreSQL test veritabanında, ardından yedeği alınmış yerel kurulumda uygulanır. Down, ek sütun/index/FK'leri kaldırabilir ve JSON atama bilgisini korur; atama kuralını yok sayan eski uygulamaya otomatik dönüş yapılmaz. Tercih edilen yol forward-fix'tir. Production migration/deploy bu işin kapsamı değildir.

## Verification

Gerçek PostgreSQL: geçersiz çalışan FK reddi, çalışan yetki reddi, ortak/atanmış koltuk müsaitliği, eski slotla commit reddi, mevcut aktif randevuda atama değişikliğinin rollback'i, SQL sayfalama/toplam/sahiplik. Mevcut eşzamanlı rezervasyon ve idempotency testleri korunur. Tarayıcı: üç genişlikte pencere/odak, kaydetme/çakışma, ilişkili randevular, sayfa boyutu, arama, müşteri filtreleri ve çalışan görünümü.
