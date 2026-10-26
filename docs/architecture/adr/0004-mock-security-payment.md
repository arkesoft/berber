# ADR 0004 — Mock, kimlik ve ödeme sınırları

Durum: kabul edildi.

## Context

Ürün frontend'i test edilecek; gerçek backend ve tahsilat kapsam dışı. Kullanıcı ücretli servis, satın alma, abonelik ve kredi kartı işlemini açıkça yasakladı.

## Decision

MSW browser/node aynı handler seti. Sabit tarihli fixture; hold için seed saat + test kontrollü geçen süre. Demo kullanıcıları ve kayıtları yalnızca bellekte. Hiçbir ödeme sağlayıcı SDK'sı, API anahtarı veya kart formu yok. Kapora düğmesi yalnızca mock state değiştirir. Live build varsayılanı API modudur; demo ayrıca build:demo ile oluşturulur.

## Alternatives

Sahte çalışan backend, gerçek ödeme test hesabı, ücretli hosted mock ve auth servisleri kapsam/maliyet sınırıyla reddedildi. Component içi fixture doğrudan fetch, hata ve ownership davranışlarını test etmediği için seçilmedi.

## Consequences

Yenileme demo oturumu/verilerini sıfırlar. Demo hesap parolaları güvenli auth örneği değildir. Gerçek oturum HttpOnly Secure SameSite cookie; CSRF ve authorization backend görevidir. Guest token bellekte tutulur; gerçek üründe OTP/doğrulama, süre sınırı ve rate-limit gerekir. Mock yalnızca simülasyondur; concurrency ve veri bütünlüğü kanıtı değildir.

## Migration/Rollback

Mock import build flag ile kapanır; API client aynı /api/v1 yollarını kullanır. Worker canlı artifact'ten çıkarılır. API hazır olmadan canlı release yapılmaz. Gelecekte ödeme entegrasyonu ayrıca kullanıcı talebi gerektirir; bu teslimde tahsilat yoktur.

## Verification

Scope/role/CSRF negatif testleri, idempotency, conflict, hold expiry, failed payment ve demo/production build ayrımı. [MSW browser](https://mswjs.io/guides/integrations/browser).
