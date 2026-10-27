# Bileşen davranışları

27 Ekim 2026 panel güncellemesi: düzenleme, detay, ilişkili randevu ve yeniden planlama native dialog içinde açılır. Klavye odağı pencere içinde kalır ve kapatılınca açan düğmeye döner. Kirli formda Escape/kapat/iptal kayıp uyarısı verir; işlem sürerken pencere kapatılamaz. Tamamlandı ve gelmedi işlemlerinde sonuç açıklamasıyla ikinci onay vardır. Listelerde arama, filtre, 10/20/50 sayfa boyutu, toplam ve görünen aralık aynı ortak sayfalama bileşenini kullanır. Ayrıntılar: [panel incelemesi](../quality/panel-review.md).

| Bileşen              | Davranış ve durumlar                                            | Erişilebilirlik                                |
| -------------------- | --------------------------------------------------------------- | ---------------------------------------------- |
| Button/link          | Primary, secondary, pending, disabled                           | Native semantik, 44px, focus-visible           |
| Field                | Label, helper, inline error                                     | htmlFor/id, aria-invalid, aria-describedby     |
| QueryState           | Loading, error+retry, empty                                     | status/alert; boş durumda sonraki eylem        |
| Service/staff choice | Tek seçim, seçili durum                                         | Native radio + label; klavye okları            |
| Slot choice          | Seçilebilir saatler; veri yenilenince geçersiz seçim temizlenir | Radio group, yerel saat bilgisi                |
| Booking summary      | Hizmet, çalışan, tarih, süre, toplam, kapora                    | dl semantiği, para/saat yerelleştirme          |
| Confirm action       | İptal öncesi açık sonuç ve ikinci onay                          | Native dialog, focus geri dönüşü               |
| Navigation           | Role göre linkler, mobile disclosure                            | nav landmark, aria-current, gerçek bağlantılar |

İş kuralları bileşen içinde hesaplanmaz; fiyat/kapora/izin verilen aksiyonlar API sonucudur. Form validation UX içindir; backend doğrulamasını ikame etmez.

Çalışan düzenleyicisindeki **Verebildiği hizmetler** alanı, etiketli native checkbox ve fieldset/legend kullanır. Mevcut atamalar seçili açılır; yeni çalışan için hizmetler açıkça seçilir. En az bir seçim gerekir; hatada grup odaklanır ve açıklama duyurulur. Pasif hizmetler etiketlenir. Seçimler mevcut `PUT /management` sözleşmesinin `staff.serviceIds` alanına gönderilir; backend hizmet kimliklerini doğrular. Kayıt sonrası çalışan listesi ve rezervasyon kataloğu yenilenir. Yeni oluşturulan hizmet mevcut çalışanlara kendiliğinden atanmaz. `tests/e2e/staff-services.spec.ts` atama/çıkarma, seçim hatası, rezervasyonda berber filtreleme, üç ekran genişliği ve erişilebilirliği kapsar.

## Ortak marka uygulaması

- Renk, font, ölçü ve control/panel/button radius değerleri shared/tokens.css içinde tek kaynaktır. Primary sarı-yeşil/siyah; secondary nötr; disabled ayrı yüzey/metin değerleri kullanır.
- PageIntro: müşteri rezervasyon/randevular başlığı, açıklaması ve dekoratif fotoğrafı. H1 odaklanabilir; fotoğraf alt metni boş ve erişilebilirlik ağacından çıkarılmıştır. Giriş ekranının fotoğrafı da temsilîdir.
- Booking summary: her iki temada siyah, okunur ters metin, sarı-yeşil toplam. Geçerli adım aria-current; tamamlanan adımlarda işaret. Native radio seçimi klavyede korunur.
- Seçili sekme hover sırasında seçili renklerini korur. Bu davranış geçmiş randevu görünümünde axe ile kontrol edilir.
- Shell: aynı logo/font/gutter/header/footer; hash bağlantıları gerçek ana sayfa bölümüne gider. Demo araçları içeriğin altında tek disclosure'dadır.
- Onay, erişim reddi ve 404 sayfaları aynı marka diliyle, açık sonraki eylemle sunulur. 404 anlamlı document title içerir.
