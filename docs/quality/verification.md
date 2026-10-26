# Frontend doğrulama kaydı

Tarih: 26 Ekim 2026. Ortam: Windows, Node 24, yerel Microsoft Edge/Chromium. Bu kayıt frontend ve bellek içi mock davranışını doğrular; gerçek backend, ödeme veya production işletim garantisi değildir.

## Teslim edilen kapsam

React Router framework mode, statik public HTML, strict TypeScript, modüler uygulama, Zod/OpenAPI sözleşmeleri, native fetch, TanStack Query, React Hook Form ve MSW kuruldu. Müşteri rezervasyonu, hesap akışları, randevu değiştirme/iptal, yönetici kaynak düzenleme ve çalışan planı uygulanmıştır. Ayrıntılı kapsam: [ekran envanteri](../product/screen-inventory.md).

İşletme örnek değerleri app/config/salon.ts ve app/mocks/data.ts içindedir. Gerçek işletme verisi değildir. Mock saat 2026-10-26 başlangıcından ilerler; sayfa yenilenince bellek sıfırlanır. Canlı build ayrı API bekler ve tahsilat entegrasyonu etkin değildir.

## Çalıştırılan kontroller

| Kontrol                     | Sonuç / kanıt                                                                                      |
| --------------------------- | -------------------------------------------------------------------------------------------------- |
| npm run check               | Başarılı: strict typecheck, sıfır ESLint uyarısı, OpenAPI 3.1 doğrulaması ve drift kontrolü        |
| Mimari bağımlılıklar        | 50 modül / 139 bağımlılık; ihlal ve döngü yok                                                      |
| Vitest                      | 4 dosya, 23 test geçti: domain, format, component, sözleşme/MSW entegrasyonu ve retry intent       |
| Playwright                  | 16 test geçti; HTML raporu playwright-report/index.html                                            |
| build:demo / build          | Her iki build başarılı; public sayfa HTML olarak önceden render ediliyor                           |
| node scripts/check-live.mjs | Canlı çıktıda demo hesabı, MSW worker ve mock imzaları yok; public HTML mevcut                     |
| npm run budget              | Canlı JS gzip toplamı yaklaşık 180 KB; en büyük chunk yaklaşık 67 KB; 450/220 KB sınırları altında |
| npm audit                   | Kurulum ve yükseltme sonrası bilinen açık: 0; bu sonuç gelecekteki açıkları dışlamaz               |
| npm ls --depth=0            | Doğrudan bağımlılıklar kurulu; geçersiz peer ağacı yok                                             |
| Gerçek tarayıcı UI denetimi | 390/768/1440 px; taşma ve konsol hatası yok; Outfit yükleniyor; minimum metin 16 px                |

Tarayıcı testleri misafir rezervasyonu, çakışma, başarısız kapora/yeniden deneme, kayıt, müşteri düzenleme, müşteri randevu değiştirme/iptal, çalışan yetki sınırı, yönetici ekranları, ağ/sunucu hata ve boş durumlarını kapsar. Yanıt kaybı testinde kayıt oluşturulup yanıt düşürüldükten ve müsaitlik yenilendikten sonra aynı idempotency key ile ilk kayıt geri alınır. Yeni rezervasyon oluşturulmaz.

Axe denetimi rezervasyon ve yönetici ana ekranında üç genişlikte; koyu tema ve uzun TR/DE/FR metninde de çalıştırıldı. Test edilen ekranlarda ihlal yok. Klavye/focus ve label/error bağları kontrol edildi. Bu otomatik sonuçlar tam WCAG uygunluk sertifikası değildir. Navigasyon performans ölçümü Playwright raporunda navigation-performance eki olarak tutulur; yerel masaüstü ölçümü gerçek mobil ağ veya saha Core Web Vitals kanıtı değildir.

## Görsel inceleme

design-taste-frontend yönü: framed-sheet, seed 1277758608. Outfit proje kuralı olarak korundu; yeniden çekim yok. İmza: açık nötr zemin üstünde tek çalışma yüzeyi, yeşil vurgu ve metin ağırlıklı randevu satırları. design-system token/durum kuralları ve ui-ux-pro-max erişilebilirlik/form ilkeleri uygulandı.

Rezervasyonun sorusu hangi hizmete, kime, ne zaman randevu alınacağıdır; beş adımlı başlık ve özet bunu taşır. Yönetici görünümü bugün hangi ziyaretlerle ilgilenileceğini, çalışan görünümü kişinin kendi sıradaki hizmetini cevaplar. Desktop, tablet ve mobile fold/full-page görüntüleri .taste-skill/inspect/ altında incelendi. Yönetici, ana sayfa ve koyu tema görüntüleri test-results/ altında incelendi.

Mobil başlık 24 px'e indirildi; yönetim navigasyonu açılır menüye alındı; dekoratif onay işaretleri kaldırıldı. Veri satırları ortak kenarlara oturuyor, mobilde aksiyonlar satır kırıyor. Örnekte 4 randevu / 4 bekleyen / 0 tamamlanan sayıları gösterilen dört satırla tutarlı. Sıfır değerleri 0, eksik seçimler açıklama veya çizgi ile gösterilir. Gerçek fotoğraf veya harici görsel kullanılmadı. Inspector son raporunda findings boş; kaynak denetimindeki padStart uyarısı saat biçimlendirmesidir, dekoratif numaralandırma değildir.

## Tamamlanmayan ve yayın öncesi gerekli işler

- Gerçek backend, kalıcı session, sunucuda rol/sahiplik/CSRF/rate limit, PostgreSQL transaction/constraint ve eşzamanlılık kanıtları.
- Gerçek kapora/tahsilat, webhook doğrulama, mutabakat, iade, guest OTP ve bildirimler. Bu çalışma bunları kurmadı veya çalıştırmadı.
- Hosting, CI/CD, izleme, yedekleme/kurtarma ve rollback tatbikatı. Yerel kalite komutları var; harici pipeline yok.
- Gerçek cihaz, Safari/Firefox, ekran okuyucu, yavaş ağ/CPU, yük ve saha performans ölçümleri.
- Tekrarlayan vardiya, ayrıntılı çalışan-hizmet atama editörü, tam çoklu dil çevirileri; MVP sınırları ekran envanterinde.
- Büyük operasyon verisi için sunucu sayfalaması ve filtreleme; mevcut snapshot API sınırlı salon demo verisine uygundur.

React Router/Vite build'i envFile kullanımının ileride değişeceğine ilişkin upstream deprecation uyarısı üretir; build'i engellemez. Güncelleme ayrı uyumluluk doğrulaması gerektirir.

Son görsel düzeltme sonrasında 16 E2E testi yeniden geçti (21,7 saniye); format:check başarılı. Demo JS gzip toplamı 343.406 bayt, en büyük chunk 162.085 bayt; mock altyapısı dahil iki bütçe de geçiyor. Kaynak tasarım denetimi 0 FAIL ve saat biçimlendirmesi için açıklanan 1 WARN verdi.

Ücretli servis, satın alma, abonelik, kredi kartı alanı, ücretli hesap, gerçek ödeme veya dışarı yayın yoktur. Açık kaynak paketler ve yerel araçlar kullanılmıştır. Mock sınırı kullanıcı arayüzünde görünürdür.
