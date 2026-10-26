# Müşteri landing page — Barbero referansı

## Tasarım kararı

26 Ekim 2026: Kullanıcı önceki büyük işletme adı / yeşil-bej tasarımı reddetti ve [Prix Studio Barbero](https://prix-studio.com/templates/framer-barbero) şablonunu referans gösterdi. Önceki name-as-monument yönü geçersizdir. Referansın canlı demosu tarayıcıda incelendi; şablon satın alınmadı, kodu veya görselleri kopyalanmadı.

frontend-design ve design-taste-frontend, kullanıcının seçtiği yönü uygulamak ve tarayıcı çıktısını değerlendirmek için kullanıldı. Rastgele yeni bir yön seçilmedi. Büyük harfli başlıklar, yuvarlak CTA ve kemer biçimli fotoğraflar bu açık referans tercihinin parçalarıdır. Outfit ve 1rem alt sınırı korunur.

## Kompozisyon ve tokenlar

Beyaz başlık çubuğu → siyah hero / iki satırlı güçlü başlık → sürekli hareket eden siyah-beyaz fotoğraf şeridi → asimetrik salon anlatımı → üç büyük fotoğraflı hizmet → berber isimleri ve araç fotoğrafı → SSS → siyah randevu çağrısı / iletişim.

landing.css ayrı bir CSS layer ve .landing-frame scope kullanır. Renkler artık bütün uygulamayla ortak olan app/shared/tokens.css kaynağından gelir: zemin #f4f4f1, mürekkep #111, siyah blok #080808, beyaz #fff, CTA #e7f465; koyu temada açık gövde #191919 olur. İçerik en fazla 72rem, mobil dış boşluk 1.25rem. Başlıklar Outfit 800–850; Türkçe noktalı harfler için satır yüksekliği 1.08/1.12. CTA dışındaki metin alanları kartlaştırılmaz. Randevu, kimlik ve operasyon ekranları aynı renk, tipografi, düğme ve navigasyon sistemini kullanır; sayfa düzenleri görevlerine göre farklılaşır. Uygulama genelindeki denetim [tasarım tutarlılığı raporundadır](../quality/design-consistency.md).

## Davranış ve içerik sınırları

- PhotoReel yalnız yerel UI state taşır. 55 saniyelik döngü, duraklat/sürdür düğmesi, hover/focus duraklaması bulunur. Tekrar grubu erişilebilirlik ağacından çıkarılmıştır. Reduced-motion açıkken animasyon yok; tek grup elle yatay kaydırılabilir ve klavyeyle odaklanabilir.
- Destekleyen tarayıcılarda fotoğraflar kaydırmayla hafifçe yaklaşır; bölüm metinleri 24px giriş hareketi yapar. İçerik opaklığı kapatılmaz, destek yokken içerik statik ve görünürdür. Reduced-motion bu hareketleri de kaldırır.
- Hizmet bağlantısı fotoğrafı, adı, açıklaması, fiyatı ve süreyi birlikte sunar; seçilen hizmetle /randevu?hizmet=... akışını açar. API sözleşmeleri ve domain kuralları değişmedi.
- Hizmet görselleri dekoratif atmosfer görselleridir; isimler ve fiyatlar katalogdan, salon bilgileri yapılandırma/API üzerinden gelir.
- Personel portresi, müşteri yorumu, ödül veya tarihçe uydurulmadı. Stok kişiler çalışan olarak tanıtılmaz.
- Fotoğraflar yerel WebP; font da yerel. İlk şerit fotoğrafı öncelikli, alt bölümler lazy-load. Yeni bağımlılık, ücretli servis, video veya Framer kurulumu yok.
- Klavye odağı, skip link, native details SSS, loading/error/empty durumları korunur. Sahte veri simülasyon olduğu belirtilerek kullanılır.

Görsel kanıtlar .taste-skill/barbero-review ve barbero-final altında; test sonuçları [doğrulama belgesinde](../quality/landing-verification.md), fotoğraf izinleri [kaynak kaydında](image-credits.md).
