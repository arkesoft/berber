# Frontend mimarisi

## Yapı

Tek frontend build/deployment. Backend için modüler monolit hedefi korunur; backend bu depoda geliştirilmez.

```text
app/
  routes/                  # Route kompozisyonu ve erişim sınırları
  modules/
    booking/               # Katalog, müsaitlik, rezervasyon ve ödeme yolculuğu
    identity/              # Oturum, giriş ve kayıt arayüzü
    appointments/          # Müşterinin randevu yönetimi
    operations/            # Yönetici ve çalışanın operasyon ekranları
  contracts/               # Zod şemaları ve endpoint sözleşmeleri
  shared/                  # Domain bağımsız UI, HTTP, hata, i18n
  mocks/                   # MSW handler ve deterministik fixture; canlı build'den ayrılır
  config/                  # İşletmenin public build yapılandırması
scripts/                   # Sözleşme, build bütçesi, yerel statik preview
tests/                     # Unit, component, integration, E2E
contracts/openapi.json     # Şemalardan üretilen OpenAPI 3.1
```

Route → modülün index.ts public API'si → contracts/shared. Modül domain fonksiyonları React/HTTP bilmez. API sınırında Zod ile doğrulanan DTO'lar kullanılır; keyfi class veya repository katmanı yoktur. Aynı modülde kullanılan detaylar dışa açılmaz.

TanStack Query server state'i tutar; React state/form state yalnızca seçim ve etkileşim içindir. URL tarihi/filtreyi taşır. Parola ve token localStorage'a yazılmaz. Tema tercihi hassas olmayan tek kalıcı kullanıcı tercihidir.

Public ana sayfa build sırasında HTML olarak üretilir. Diğer ekranlar kod bölünmüş istemci route'larıdır. Katalog/müsaitlik istemcide API'den yüklenir. SEO snapshot güncellemeleri yeniden build gerektirir. Canlı işletme yapılandırması doğrulanmadan yayın yapılmaz.

Görsel sistem: shared/tokens.css bütün sayfaların marka ve light/dark semantik değerlerini sağlar. styles.css ortak kontrol ve yerleşimleri, booking/landing.css yalnız landing kompozisyonunu içerir. Shared PageIntro domain bağımsız başlık/fotoğraf sunumudur; booking ve appointments tarafından kullanılır. Bu katmanlar API sözleşmelerini veya domain state'ini değiştirmez. Header/footer marka bilgisi katalogdan gelir.

## Gelecekte genişleme

Yeni modül public index, route ve sözleşme ekler. Çok işletmeye geçiş: backend session scope, query key scope, host/işletme çözümlemesi, public SEO build ve izolasyon testleri yeniden tasarlanır. Bugün tenant selector yoktur; organizationId güvenlik garantisi değildir.
