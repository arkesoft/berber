# Tasarım temelleri

## Tek marka, ortak tokenlar

Barbero referanslı siyah-beyaz görünüm artık yalnız ana sayfaya ait değildir. Ana sayfa, rezervasyon, giriş/kayıt, randevular, yönetici/çalışan ekranları, onay pencereleri ve hata sayfaları aynı marka sistemini kullanır. Eski yeşil framed-sheet görünümü kaldırılmıştır.

Tek kaynak app/shared/tokens.css: primitive → semantic → component. Siyah #080808, beyaz #fff, nötr zemin #f4f4f1 ve vurgu #e7f465. Sarı-yeşil ana eylem, geçerli adım ve özet rakamlarında kullanılır. Başarı, hata ve bekleme renkleri ayrıca semantik tokenlarla tanımlanır; renk tek durum göstergesi değildir. Bütün CSS renk değerleri bu dosyadadır. Landing alias'ları ortak tokenlara bağlanır; ayrı palet üretmez.

Light/dark tema aynı anahtarları değiştirir. Siyah başlık/özet blokları her iki temada siyah kalır; yüzey ve normal metinler değişir. inverse-muted ve inverse-line değerleri koyu bloklardaki okunabilirliği korur. Odak rengi açık zeminde koyu zeytin, koyu zeminde sarı-yeşildir.

## Tipografi ve yerleşim

Outfit yerel sunulur; bütün metinler en az 1rem. Metin satır yüksekliği 1.55. Landing başlıkları kendi büyük ölçeğini korur. Müşteri yolculuğu başlıkları 32–48px/800, operasyon başlıkları 28–40px; form ve liste başlıkları 24–28px. Büyük harfli Türkçe başlıklarda 1.12 satır yüksekliği, uzun metinlerde sarma kullanılır. Sayfa başlıklarında normal satır kesilmesi korunur.

Ortak içerik genişliği 72rem; gutter clamp(1.25rem, 5vw, 4rem). Logo, header ve footer kenarları bu ölçüye uyar. Yönetimde 12.5rem sidebar + 3rem aralık + kalan içerik; 68rem altında navigasyon açılır menüye dönüşür. Form/özet iki sütun 48rem altında tek sütundur. Girişteki atmosfer fotoğrafı küçük ekranlarda kaldırılır; siyah başlık alanı marka devamlılığını sağlar.

Kontroller en az 44px; ana düğmeler 52px ve pill biçimlidir. Form alanları 4px radius, büyük yüzeyler düz köşelidir. Radius bütün bileşenlere körlemesine uygulanmaz. Liste sınırları ve field borderları işlevsel ayrım içindir. Gölge, gradient veya glass yoktur.

## Kullanım ve davranış

PageIntro ortak sunum bileşeni rezervasyon ve randevular ekranında başlık, kısa açıklama, atmosfer fotoğrafı ve isteğe bağlı eylem içerir; domain/API bilgisi taşımaz. Header/footer salon bilgilerini aynı katalog/yapılandırmadan alır. Ana sayfa bölümlerine bağlantılar diğer sayfalardan da çalışır; hash bağlantılarında başlığa otomatik odaklama hedef kaydırmasını bozmaz.

Seçim hem native radio hem arka plan/sınırla anlaşılır. Geçilen rezervasyon adımları işaretlenir. Aktif sekmeler hover sırasında da kontrastını korur. Hata, loading ve empty durumları aynı tokenları kullanır. İptal native dialog; Escape ve odak geri dönüşü korunur. 404 için anlamlı sayfa başlığı ve dönüş eylemi bulunur. Demo kontrolleri ana içeriğin sonunda, tek noktadadır.

Arayüz metinleri tipli i18n kataloğunda tutulur. Yalnız Türkçe çeviri sağlanmıştır; uzun metin/karakter dayanıklılığı test edilir. API kaynaklı hizmet, kişi ve salon isimleri çeviri kataloğundan ayrı kalır.

## Erişilebilirlik ve sınırlar

WCAG 2.2 AA hedefi: 4.5:1 normal metin kontrastı, görünür klavye odağı, native form etiketleri, aria-invalid/describedby, semantik başlıklar, skip link, adımda odak ve reduced-motion. Otomatik axe sonuçları tam WCAG sertifikası değildir. Gerçek ekran okuyucu ve cihaz testleri ayrıca gerekir.

Landing fotoğraf/animasyon ayrıntıları [tasarım yönünde](landing-direction.md), ücretsiz görsel kaynakları [lisans kaydında](image-credits.md), bütün uygulama taraması [tutarlılık doğrulamasında](../quality/design-consistency.md) bulunur. Yeni fotoğraf, paket veya ücretli servis eklenmedi.
