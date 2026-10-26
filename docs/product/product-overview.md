# Ürün ve kapsam

Tek işletme ve tek salon için müşteri rezervasyonu, yönetici operasyonları ve çalışan çalışma planı. İlk sürüm SaaS değildir. İşletme markası, yerel saat dilimi ve iletişim bilgileri yapılandırmadan/API'den gelir.

## Teslim yaklaşımı

1. Sözleşmeler ve modül sınırları.
2. Çalışan frontend foundation ve misafir rezervasyonu.
3. Müşteri hesabı, randevu yönetimi, yönetici ve çalışan akışları.
4. Otomatik kontroller ve tarayıcı doğrulaması.

Mock sürüm gerçek rezervasyon, kimlik doğrulama veya tahsilat sağlamaz. Tarayıcı belleği yenilemede sıfırlanır. Örnek kişiler ve salon bilgileri demo verisidir. Canlı sürüm API olmadan işlem gerçekleştiremez.

## Backend otoritesi

Müsaitlik, chair/staff çakışması, hold süresi, fiyat/kapora, ödeme sağlayıcı callback'i, durum geçişleri, kimlik ve yetkiler, transaction ve iade politikası backend tarafından uygulanmalıdır. UI yalnızca sonuçlarını temsil eder.
