# Landing page doğrulaması — Barbero revizyonu

26 Ekim 2026. Bu kayıt, kullanıcı tarafından reddedilen önceki yeşil-bej / büyük işletme adı tasarımının doğrulama kaydının yerini alır. Referans [Prix Studio Barbero](https://prix-studio.com/templates/framer-barbero); tasarım kararı [landing-direction.md](../design-system/landing-direction.md) içindedir.

## Uygulama

Home.tsx yeniden düzenlendi; landing.css ayrı scope içinde siyah/beyaz ve sarı-yeşil tasarımı uygular. PhotoReel.tsx duraklatılabilen fotoğraf şeridini yönetir. app/config/landing.ts beş yerel fotoğrafı, landing.tr.ts tipli metinleri tanımlar. Stok fotoğraf kaynakları footer ve image-credits.md içinde bulunur. Global skip link gizleme biçimi, uzun sayfa ekran görüntülerinde ekran dışında duran bağlantının görünmesini önleyecek şekilde düzeltildi; klavye odağında görünür kalır.

API sözleşmeleri, kimlik, rezervasyon ve yönetim domain mantığı değişmedi; migration ve backend geliştirmesi yok. Paket/ücretli servis eklenmedi. Canlı API ve gerçek ödeme bu teslimatın parçası değildir.

## Otomatik kanıtlar

- npm run check: strict TypeScript, ESLint, OpenAPI drift/validation, mimari kontrolü ve 23 Vitest testi başarılı. 54 modül / 147 bağımlılık; ihlal yok.
- Tam E2E: 21 test başarılı (40,8 s). Önceki müşteri, çalışan, yönetici, çakışma ve kapora simülasyonu akışları dahil.
- Son hareket katmanı sonrası odaklı E2E: 5 landing testi başarılı (30,8 s). Fotoğrafların yüklenmesi, hizmetten seçili rezervasyona geçiş, SSS açılması, koyu tema, klavye, duraklat/sürdür, reduced-motion ve 390/768/1440 genişlikleri doğrulandı.
- Axe WCAG 2 A/AA, 2.1 AA, 2.2 AA otomatik taramalarında ihlal bulunmadı; testlerde yatay sayfa taşması ve pageerror yok.
- Tip/lint son TS değişikliklerinden sonra tekrar geçti. Prettier kontrolü başarılı.
- Demo production build başarılı; toplam JS gzip 346.197 bayt, en büyük chunk 162.085 bayt (450.000 / 220.000 sınırları altında). Beş yerel WebP toplam 663.850 bayt. Fotoğraflar ve font için dış servis isteği yok.
- Canlı production build ve scripts/check-live.mjs başarılı: MSW worker/demo hesapları artefakta dahil değil; public HTML hazır. Canlı JS gzip 182.409 bayt, en büyük chunk 66.627 bayt.
- Son tablet SSS düzeltmesinden sonra 768px landing E2E yeniden başarılı (5,7 s); fotoğraf yüklenmesi, axe, taşma, SSS ve rezervasyon bağlantısı birlikte doğrulandı.
- Tasarım kaynak denetimi: 0 FAIL / 0 WARN. Son tarayıcı tasarım denetimi: 0 FAIL / 4 WARN; gerekçeleri aşağıdadır.

## Gerçek tarayıcı incelemesi

.taste-skill/barbero-final altında desktop/tablet/mobile fold ve page görselleri açılarak incelendi. Hero başlığı 1440'da 107,3px, 768'de 57,2px, 390'da 44px; üçünde de iki satır. Bütün metinler en az 16px. Türkçe büyük harflerin satır aralığı 1.08'e çıkarıldı. Tablet SSS bölümü tek sütuna alındı; tablet-faq-fixed.png bunu gösterir. Ana container kenarları DOM ölçümünde 1440'ta 144/144px, 768'de 38,406/38,406px olarak eşittir.

ROUND 3

Seen in one second: Siyah alanda büyük kesim/tarz başlığı ve hareketli berber fotoğrafları.
Idea (one sentence): Kullanıcının seçtiği Barbero kompozisyonu, yerel fotoğraflar ve çalışan hizmet kataloğuyla Türkçe bir salon deneyimine uyarlanır.
Live thing: Fotoğraf hareketi duraklatılabilir; hizmetin görseli doğrudan o hizmet seçili rezervasyon akışına gider.
Layout words by section: hero=başlık/fotoğraf şeridi / salon=asimetrik / hizmetler=geniş fotoğraf listesi / berberler=ters renkli bölünmüş / SSS=açılır liste / iletişim=çağrı ve sütunlar.
Scores: design 7 · usability 8.5 · creativity 7 · content 8 → overall 7.6.
Caps applied: still-page sayacı 15 hareketli eleman ölçtüğü için tasarım puanı temkinli olarak 7 ile sınırlandı. Bu öz değerlendirmedir; kullanıcı beğenisi veya dış kalite sertifikası değildir.
Top three problems (most visible first), each with the screenshot it shows in and the fix:

1. İlk desktop/mobile-fold görüntülerinde Türkçe başlığın noktaları ve alt satır fazla yakındı. Line-height 0.97 → 1.08; son fold görüntülerinde düzeltildi.
2. tablet-page-01 görüntüsünde Aklınızdakiler kelimesi son harften bölünüyordu. Tablet SSS tek sütuna alındı; tablet-faq-fixed.png ile düzeltildi.
3. Stok fotoğraflar işletmeye özgü kimlik sağlamıyor (tüm page görüntüleri). Gerçek işletme çekimleri mevcut değil. Fotoğraflar personel veya müşteri sonucu olarak sunulmadı; kaynak ve temsilî kullanım açıklaması eklendi. Gerçek işletme yayınında izinli salon çekimleriyle değiştirilmesi içerik işi olarak kalır.

## Tasarım denetimi uyarılarının yorumu

- eyebrow: Fotoğraf üzerindeki Hizmeti seç yazısı işlevsel rezervasyon bağlantısının etiketi. Başlık üstü dekoratif etiket değildir; gerekçeli istisna direction.json içinde kayıtlıdır.
- off-centre: Ölçüm, tam genişlikte hareket eden görselleri de değerlendiriyor. Metin container'larının eşit kenarları yukarıdaki DOM ölçümünde doğrulandı.
- untitled-section: SSS içinde gerçek h2#faq-title ve aria-labelledby var; ekranda görünür. Otomatik tespit hatası.
- no-footage: Video yok. Kullanıcının fotoğraflı Barbero referansı ve ücretsiz/yerel görsel sınırı içinde fotoğraf şeridi kullanıldı; video yükü ve yeni stok kaynağı eklenmedi.
- still-page: 15 hareketli öğe, 55 saniyelik fotoğraf döngüsü ve hafif bölüm girişleri mevcut. Yalnız sayacı yükseltmek için ilave hareket eklenmedi. Reduced-motion altında bütün dekoratif animasyonlar kapalı.

## Sınırlar

Otomatik axe ve Edge testleri tam WCAG sertifikası veya bütün gerçek cihazlarda başarı garantisi değildir. Safari/Firefox, ekran okuyucu ve gerçek cihaz incelemeleri ayrıca gerekir. Vite envFile ve React Router v8 geçiş uyarıları mevcut; bu görsel görevde bağımlılık güncellemesi yapılmadı. Gerçek müsaitlik, yetki, ödeme ve transaction güvenliği backend entegrasyonu gerektirir.
