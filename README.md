# Berber rezervasyon frontend'i

Tek işletme için modüler React frontend. Backend, gerçek kimlik doğrulama ve ödeme sağlayıcısı içermez. Kullanılan araçlar ücretsiz/açık kaynaktır; satın alma, kredi kartı veya ücretli servis entegrasyonu yoktur.

## Yerel geliştirme

Node 24 ve npm gerekir. Windows PowerShell'de npm.cmd kullanın.

```sh
npm ci --include=dev
npm run dev
```

Geliştirme MSW demo modundadır. Üretim benzeri demo:

```sh
npm run build:demo
npm run preview
```

http://127.0.0.1:4173 — /randevu, /giris, /randevularim, /yonetim, /calisan.

Demo parola Demo12345!; e-postalar musteri@example.test, yonetici@example.test, berber@example.test. Gerçek kişisel bilgi kullanmayın. Demo state bellektedir, yenilemede sıfırlanır. Kapora yalnız simülasyondur.

## Kontroller

```sh
npm run check
npm run build:demo
npm run test:e2e
npm run build
npm run budget
npm run format:check
```

Playwright varsayılan olarak bilgisayardaki Microsoft Edge'i kullanır; PLAYWRIGHT_CHANNEL ile kurulu başka bir Chromium kanalı seçilebilir. Tarayıcı indirilmedi. Canlı build varsayılan olarak mock içermez ve /api/v1 backend'i bekler; API henüz geliştirilmemiştir. Dışarı yayın yapılmadı. E2E testlerinden önce build:demo çalıştırılmalıdır; build komutu bu demo çıktısının üzerine canlı çıktıyı yazar.

Belgeler: docs/architecture/frontend-architecture.md, docs/architecture/technology-evaluation.md, docs/architecture/adr/, docs/quality/verification.md. Tamamlanma ve sınırlar ekran envanteri/verification dosyalarında açıkça kayıtlıdır.
