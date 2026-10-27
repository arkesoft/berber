# Berber rezervasyon frontend'i

Tek işletme için modüler React frontend ve Fastify/PostgreSQL backend. Yerel backend oturum, yetkilendirme ve kalıcı rezervasyon işlemlerini içerir; gerçek ödeme sağlayıcısı bağlı değildir.

## Mevcut yerel kurulumu açma (Windows)

`npm.cmd run start:local` komutunu çalıştırıp [giriş sayfasını](http://127.0.0.1:5174/giris) açın. Yönetici, çalışan ve müşteri hesapları git dışında tutulan `.local/local-accounts.json` dosyasındadır. Ayrıntılar: [yerel backend kullanımı](docs/quality/local-backend-testing.md). Aşağıdaki demo akışı farklı hesaplar ve geçici veriler kullanır.

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

Playwright varsayılan olarak bilgisayardaki Microsoft Edge'i kullanır; PLAYWRIGHT_CHANNEL ile kurulu başka bir Chromium kanalı seçilebilir. Tarayıcı indirilmedi. Canlı build varsayılan olarak mock içermez ve /api/v1 backend'i bekler; backend kodu backend/ altındadır. Preview sunucusu canlı API'ye proxy yapmaz; gerçek backend ile yerel kullanım için start:local komutunu kullanın. Dışarı yayın yapılmadı. E2E testlerinden önce build:demo çalıştırılmalıdır; build komutu bu demo çıktısının üzerine canlı çıktıyı yazar.

Belgeler: docs/architecture/frontend-architecture.md, docs/architecture/technology-evaluation.md, docs/architecture/adr/, docs/quality/verification.md. Tamamlanma ve sınırlar ekran envanteri/verification dosyalarında açıkça kayıtlıdır.
