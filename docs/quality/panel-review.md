# Rol panelleri incelemesi

27 Ekim 2026. Yönetici, çalışan ve müşteri panellerinin kullanılabilirlik ve ilişki incelemesi.

## Düzeltilen bulgular

| Bulgu                                                 | Değişiklik                                                                                                                    |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Uzun kaynak listelerinde sayfalama/arama yok          | Hizmet, çalışan, koltuk, mesai, müşteri, ödeme kayıtları ve hizmet raporunda arama, 10/20/50 sayfa boyutu, aralık ve toplam   |
| Müşteri filtresi sayfalandıktan sonra uygulanıyor     | API/SQL filtresi sayfalama öncesine alındı; sekme ve sayfa URL'ye yazılıyor; boşalan son sayfa düzeltiliyor                   |
| Düzenleyici listenin altında ve odak dışında          | Native dialog, mobil boyut sınırı, klavye odağı ve açan düğmeye geri dönüş                                                    |
| Değişiklik yanlışlıkla kaybolabiliyor                 | Kirli formda kapat/Escape/iptal uyarısı; kaydetme sırasında kapatma kilidi                                                    |
| Koltuk kime ait belirsiz                              | Ortak/atanmış çalışan seçimi, PostgreSQL FK, çalışan satırında kullanılabilir koltuklar                                       |
| Kayıtlar arasında gezinme yok                         | Koltuk/çalışan/hizmet/müşteri satırından ilişkili randevu penceresi; hizmetten çalışan ve çalışandan koltuk ekranına bağlantı |
| Randevu detayında koltuk eksik                        | Koltuk adıyla detay penceresi                                                                                                 |
| Takvimde çalışan/durum/arama filtresi yok             | Filtreler, önceki/sonraki gün ve Bugün düğmesi                                                                                |
| Gün gruplaması UTC tarih parçasına dayanıyor          | Salon saat diliminde gün hesaplaması                                                                                          |
| Yeni mesai sabit eski tarih ve zorunlu notla açılıyor | Salonun bugünkü tarihi, isteğe bağlı not ve gece yarısını aşan mesai açıklaması                                               |
| Tamamla/gelmedi işlemleri tek tıkla kesinleşiyor      | Sonucu açıklayan onay penceresi                                                                                               |
| Müşteri iletişim kaydı ile giriş hesabı karışabiliyor | Kayıt formunun hesap açmadığı açıklandı; sahiplik e-postadan türetilmiyor                                                     |

## Tasarım

Mevcut Outfit, 16px metin alt sınırı ve marka renkleri korundu. `design-taste-frontend`: framed-sheet, seed 822710821; yeniden çekim yok. Panelin ayırt edici içeriği çalışan–hizmet–koltuk ilişkileridir. Yönetici “hangi kayıt ve ilişkileri düzenlenecek”, çalışan “hangi randevu/mesai bana ait”, müşteri “randevuma hangi işlem uygulanabilir” sorularını yanıtlar. Veriler mevcut yerel örnek salon veya izole demo/test kayıtlarıdır; gerçek işletme verisi olarak sunulmaz.

## Kalan sınırlar

- Yönetim/çalışan sayfalaması snapshot üzerinde çalışır; sunucuya taşınan kaynak bazlı sayfalama büyük veri için gerekir. Müşteri rezervasyon sayfalaması SQL'dedir.
- Çalışan kaydı açmak otomatik giriş hesabı açmaz; mevcut `staff-account` komutu kullanılır. Müşteri iletişim kaydı ile kullanıcı hesabı da ayrı kavramlardır.
- `staff.serviceIds` JSON alanı uygulamada doğrulanır; bu işte normalize bir çalışan–hizmet bağlantı tablosu kurulmadı. Koltuk ve mesai için salon kapsamlı gerçek FK vardır.
- Tekrarlayan mesai şablonu, sürükle-bırak takvim, misafir OTP, gerçek ödeme ve production işletim doğrulaması bu değişikliğe dahil değildir.

## Doğrulama

- `npm run check`: strict TypeScript, ESLint, OpenAPI drift/doğrulama, mimari sınırlar ve 23 Vitest testi başarılı.
- Backend: TypeScript ve mimari kontrol başarılı; gerçek PostgreSQL kullanan toplam 15 domain/integration testi geçti. Yeni migration test veritabanında uygulandı.
- Tam Playwright paketi: 49 test başarılı. Son mobil başlık/liste boşluğu düzenlemesinden sonra ilgili 6 panel testi tekrar geçti.
- 390/768/1440 px, açık/koyu tema, Axe erişilebilirlik, odak geri dönüşü, kirli form/Escape, çakışma hata penceresi, ilişkili kayıtlar, sayfalama ve filtreler kontrol edildi. Görseller `test-results/chair-*.png` altında üretildi ve incelendi.
- Gerçek yerel backend'de yönetici, çalışan ve müşteri girişleri ve rol yönlendirmeleri tekrar doğrulandı. Yeni migration öncesi `.local/backups/salon-local-before-panels-1793081450870.dump` yedeği alındı; yerel migration uygulandı ve API/worker yeniden başlatıldı.
- İlk sandbox görsel denetiminde CDP zaman aşımı görüldü; aynı araç sandbox dışında çalıştı. Kimlik doğrulanmış demo ekranının statik HTML görüntüsü üzerinden denetlendi; etkileşimler ayrı Playwright testlerindedir.
- Son inspector sonucu: 0 FAIL, 0 WARN. Son metin aralığı düzeltmesi gerçek yerel panelde 390/768/1440 px ile ayrıca kontrol edildi; durum metni ayrı satırda, taşma yok, düzenleyici/odak geri dönüşü başarılı. Görseller `.local/panel-live-*.png` altında.
- Demo ve canlı build başarılı; canlı çıktıda demo hesapları/MSW yok. Canlı JS gzip 188.147 bayt, en büyük parça 66.625 bayt; 450.000/220.000 bütçelerinin altında. Format kontrolü başarılı; önceden biçim hatası bulunan `backend/setup.example.json` yalnız biçimlendirildi.
- İlk tam tarayıcı turunda bir form hata metni sorunu düzeltildi; yeni modal ve durum filtrelerine göre eski testlerin hedefleri güncellendi. Test sonundaki preview süreç kapanışı Windows ortamında takıldığından yalnız ilgili preview süreci durduruldu; test komutu 0 çıkış koduyla 49 başarılı sonucu verdi.

Bu kontroller production yük, yedekten geri yükleme veya Safari/Firefox doğrulaması değildir. Migration veriyi korur; production dağıtımı yapılmadı. Eklenen alanlar mevcut audit akışını kullanır; yeni kişisel bilgi veya secret loglaması eklenmedi.

## Değişen ana dosyalar

- `app/modules/operations/Management.tsx`, `Operations.tsx`: kaynak listeleri, filtreler, editör ve ilişkiler.
- `app/modules/appointments/Appointments.tsx`: müşteri sayfalaması, randevu pencereleri ve işlem onayları.
- `app/shared/ui.tsx`, `Pagination.tsx`, `PagedList.tsx`, `locales/panels.tr.ts`, `i18n.ts`, `format.ts`, `app/styles.css`: ortak bileşenler, Türkçe metinler ve salon günü.
- `app/contracts/schemas.ts`, `scripts/contracts.ts`, `contracts/openapi.json`, `app/mocks/{data,handlers}.ts`: sözleşmeler ve demo uyumu.
- `backend/src/app.ts`, `modules/reservations/{application,ports,postgres}.ts`, `modules/{salon,operations}/index.ts`, `backend/migrations/1793100000000-chair-assignment.sql`: atama, FK ve SQL sayfalaması.
- `backend/tests/integration.test.ts`, `tests/e2e/{panels,journeys,visual-consistency}.spec.ts`: regresyonlar ve yeni kullanıcı akışları.
- ADR 0007, API ve bileşen dokümanları bu davranışları açıklar. Önceki görevin başlatma scripti/README değişiklikleri korundu.
