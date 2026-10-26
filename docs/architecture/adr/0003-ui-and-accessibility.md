# ADR 0003 — Native primitives ve token tabanlı CSS

Durum: kabul edildi.

## Context

Outfit, en az 1rem, mobile-first, erişilebilir ve özgün ürün. Başlangıçtaki ihtiyaçlar seçim, form, liste ve onay diyaloğudur.

## Decision

Native input/radio/select/button/dialog + küçük React bileşenleri; CSS layers ve üç katmanlı custom properties. Yerel Outfit font paketi. Ortak marka tokenları app/shared/tokens.css içinde tek kaynaktır; landing ve ürün ekranları bunları paylaşır. Light/dark semantic token seti. Kullanıcı projesindeki font/ölçü sınırları önceliklidir.

## Alternatives

shadcn/Radix, karmaşık combobox/popover ihtiyacı kanıtlanırsa kullanılabilir; bugün ek paket gerektirmez. Tam UI kit'leri marka/spacing uyarlama maliyeti getirir. Tailwind uygun fakat bu boyutta CSS token yaklaşımının üzerine ikinci API katmanı olarak eklenmedi.

## Consequences

26 Ekim 2026 tasarım tutarlılığı revizyonu: kullanıcı, landing ile diğer ekranların kopuk göründüğünü belirtti. Eski yeşil framed-sheet tasarımı kaldırıldı; siyah-beyaz/sarı-yeşil marka dili rezervasyon, kimlik, müşteri, operasyon ve hata ekranlarına yayıldı. Landing kompozisyonu scope edilmiş CSS katmanında kalır; renk/font/gutter/düğme değerleri ortak tokenlardan gelir. Alternatif olan sayfa başına ayrı paletler bakım ve görsel tutarlılık riski nedeniyle reddedildi. PageIntro yalnız iki müşteri yolculuğunda tekrar eden sunumu paylaşır; iş mantığı taşımaz. Yönetim yoğunluğu için büyük hero kullanılmaz. Yeni UI veya animasyon bağımlılığı eklenmedi.

Native dialog focus/escape davranışı tarayıcıda test edilir. Native kontroller otomatik olarak tam WCAG uyumu garantilemez. Renk, focus, uzun metin, hata duyurusu ve sıra testleri zorunlu. Düşük görsel yoğunluk, 44px kontrol yüksekliği ve 1rem alt sınır korunur.

## Migration/Rollback

Shared bileşen public props korunarak primitive değişebilir. Tema tokenları tek yerden geri alınır.

## Verification

Axe, klavye, mobil/tablet/desktop screenshot ve gerçek render incelemesi. Dış font CDN veya ücretli görsel servis yoktur.
