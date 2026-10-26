# Uygulama genelinde tasarım tutarlılığı

26 Ekim 2026. Kullanıcı landing ile randevu ve diğer ekranların kopuk göründüğünü bildirdi. Mevcut Barbero referanslı kimlik müşteri, kimlik, yönetici ve çalışan deneyimine taşındı. Yeni görsel yön veya bağımlılık seçilmedi.

## Uygulama

- app/shared/tokens.css bütün uygulamanın renk, tipografi, ölçü ve tema kaynağıdır. Eski yeşil uygulama paleti kaldırıldı. Siyah/beyaz yüzeyler, lime eylemler, Outfit ve en az 1rem metin ortaklaşır.
- Header, marka yazısı, sayfa genişliği ve footer tek sistem kullanır. Hizmetler/berberler/iletişim bağlantıları ilgili landing bölümüne döner. Hash geçişinde h1 odağının bölüm kaydırmasını bozması düzeltildi.
- PageIntro yalnız sunum bileşenidir. Randevu ve randevularım aynı siyah başlık ve dekoratif fotoğraf düzenini kullanır. Mobilde fotoğraf gizlenerek seçim alanı korunur.
- Hizmet/berber/saat seçimleri, doğrulama, özet, demo kapora, hata ve onay ortak tasarıma alındı. Mobil hizmet açıklamalarına daha geniş alan ayrıldı. Onay siyah panel ve okunabilir makbuzla sunulur.
- Giriş/kayıt masaüstünde fotoğraf ve form sütunları; mobilde siyah başlık ve tek sütun form kullanır. Fotoğrafın yükseklik niteliğinden kaynaklanan uzama height:auto/aspect-ratio ile giderildi.
- Yönetici ve çalışan ekranları ortak menü, başlık, metrik, liste, editör ve durum stillerini kullanır. Çalışanın mobil düğmesi Çalışma menüsü olarak adlandırılır.
- 404 ve erişim ekranları ortak sistem panelini kullanır. 404 başlığı/noindex eklendi. Geçmiş randevu sekmesinin hover kontrastı düzeltildi. Demo araçları içerikten sonra tek yerde sunulur.

API/domain mantığı, veri modelleri ve sözleşmeler değiştirilmedi. Backend, ücretli servis, paket, yeni fotoğraf kaynağı veya gerçek tahsilat eklenmedi.

## Doğrulama

tests/e2e/visual-consistency.spec.ts içindeki 15 yeni test mevcut 21 testi tamamlar. Tam koşum **36/36 başarılı (2,2 dakika)**.

| Alan          | Ekran ve durumlar                                                                                                     | Genişlikler         |
| ------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------- |
| Yönetici      | Günlük bakış, takvim, hizmetler, çalışanlar, koltuklar, mesai, müşteriler, ödemeler, raporlar, ayarlar ve altı editör | 390, 768, 1440      |
| Çalışan       | Günlük plan, takvim, mola/izin                                                                                        | 390, 768, 1440      |
| Kimlik/erişim | Giriş, kayıt, geçersiz kayıt, 404, giriş gereksinimi, rol reddi                                                       | 390, 768, 1440      |
| Müşteri       | Gelecek/geçmiş randevular, saat değiştirme, iptal diyaloğu/Escape                                                     | 390, 768, 1440      |
| Rezervasyon   | Hizmet, berber, saat, geçersiz form, özet, hold, başarısız demo ödeme/tekrar, onay                                    | 390 açık, 1440 koyu |
| Geçişler      | Ortak marka fontu/boyutu/rengi, CTA rengi, hizmetler bölümüne dönüş                                                   | Masaüstü            |

Üç genişlikli matrisin 768px koşumu koyu temadır. Her denetlenen durumda tek ana h1, yatay taşma ve axe WCAG 2 A/AA, 2.1 AA, 2.2 AA kontrol edilir; ihlal bulunmadı. Ekran görüntüleri .taste-skill/consistency-audit altındadır; bunlar görsel regresyon baseline karşılaştırması değildir. Mevcut testler landing, klavye, reduced-motion, ağ/boş durumlar, çakışma, işlem tekrarı ve rol davranışlarını da doğrular.

- npm run check: strict tip, sıfır uyarıyla lint, güncel OpenAPI, 55 modül/153 bağımlılıkta sıfır mimari ihlal; **23/23 Vitest testi** başarılı.
- Son çalışan menü etiketi değişikliğinden sonra tip/lint ve üç çalışan tarayıcı testi ayrıca geçti (11,7 saniye).
- Prettier kontrolü başarılı.
- Demo ve canlı production build başarılı. Demo JS gzip toplamı 346.763 bayt, en büyük chunk 162.085 bayt; 450.000/220.000 bütçelerinin altında.
- scripts/check-live.mjs başarılı: canlı artefakta mock worker/demo hesapları dahil değil; ana sayfa HTML'i önceden oluşturulmuş. Canlı JS gzip toplamı 182.973 bayt, en büyük chunk 66.624 bayt; bütçelerin altında.

## Görsel inceleme

design-system ve design-taste-frontend kullanıldı. Önce/sonra görüntüleri .taste-skill/consistency-before, consistency-review ve consistency-audit dizinlerindedir. Randevu masaüstü/mobil, giriş masaüstü/mobil, koyu randevularım, yönetici masaüstü ve mobil hizmetler, çalışan mobil mesai, mobil onay ve koyu ödeme hata ekranları açılarak incelendi. İnceleme sonrası mobil hizmet metni, giriş fotoğrafı oranı ve kimlik/onay başlıkları düzeltildi.

Randevu tarayıcı tasarım denetimi: **0 FAIL / 2 WARN**, .taste-skill/consistency-booking/report.json. Heavy-borders tespiti hizmet seçimindeki radio kontrollerini panel sayar; sınırlar seçilebilir kontrollere aittir. App-title-size, müşteri yolculuğunun 48px masaüstü/32px mobil marka başlığı içindir. Kullanıcının landing ile devamlılık isteği doğrultusunda korunur; operasyon başlıkları daha kompakttır. Metinlerde 1rem alt sınırı korunur. Denetimde kırık görsel, yüklenmemiş font, taşma veya konsol hatası bulunmadı.

## Sınırlar

Edge/axe otomasyonu tam WCAG sertifikası değildir. Gerçek cihaz, Safari/Firefox ve ekran okuyucu incelemesi yapılmadı. Fotoğraflar mevcut ücretsiz lisanslı stoklardır; çalışan portresi veya gerçek salon çekimi olarak tanıtılmaz. Kaynaklar docs/design-system/image-credits.md içindedir. Gerçek kimlik, müsaitlik, veri bütünlüğü ve ödeme backend gerektirir; uygulama demodur. Mevcut React Router/Vite envFile ve v8 geçiş uyarıları sürer; bağımlılık güncellemesi yapılmadı.
