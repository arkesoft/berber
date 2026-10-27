# 0008 — Manuel tahsilat defteri ve ödeme tercihleri

Durum: Kabul edildi, 27 Ekim 2026. Kullanıcının yeni talebi ADR 0006'nın manuel tahsilatı erteleme kararını değiştirir. Sağlayıcı entegrasyonu hâlâ kapsam dışıdır.

## Context

Yönetici kapora/kısmi/tam ödeme tutarını, alınan parayı ve kalan bakiyeyi takip etmek; kapora talebini ve müşteriye POS alanı gösterimini bağımsız açıp kapatmak istiyor. Bir boolean ödeme geçmişini, kısmi tutarı ve hatalı girişleri açıklayamaz.

## Decision

- `payments.collections` eklemeli tahsilat defteridir. Tutar kuruş cinsinden integer, para birimi TRY. Tahsilat yöntemi nakit, fiziksel kart/POS veya havale. Bankadan para çekmez.
- Kayıt salon+randevu ve salon+aktör composite FK ile bağlıdır. Ters kayıt aynı salon/randevunun tek bir orijinal kaydına bağlıdır; aynı orijinal iki kez ters çevrilemez. DB trigger UPDATE/DELETE ve tutarı/yöntemi farklı ters kaydı reddeder. Runtime yetkisi SELECT/INSERT ile sınırlıdır.
- Hatalı kayıt düzeltmesi gerekçe ve ters kayıt ekler; eski kayıt korunur. Banka iadesi değildir. Kısmi veya otomatik iade geliştirilmedi. İptal/expired randevuda alınmış para varsa `refund_pending` inceleme sinyali korunur; para otomatik olarak işletmeye kalmış sayılmaz.
- Rezervasyonun `received_amount` alanı aynı transaction'da güncellenen projeksiyondur. Payments, reservations'ın yayınlanmış store/domain sözleşmesini kullanır. Modüller birbirinin private tablosuna yazmaz. Her yazmada defter toplamı ile projeksiyon eşitliği kontrol edilir.
- Ortak salon lock'u rezervasyon, iptal, hold expiry, ayar ve tahsilat işlemlerini seri hale getirir. İstek anahtarı replay sağlar, farklı gövde 409; rezervasyon versiyonu farklı anahtarla eşzamanlı çift tahsilatı önler. Kayıt, projeksiyon, audit ve gereken onay outbox olayı tek transaction'dadır.
- Pozitif kayıt toplam ücreti aşamaz; iptal/expired/no_show randevuya girilemez. Hold süresi dolduktan sonra tahsilat randevuyu canlandıramaz. Kapora tamamlanırsa pending_payment -> confirmed; sonradan kayıt düzeltmek mevcut onayı geri almaz veya yeni hold oluşturmaz.
- Kapora ve görünürlük salon ayarlarının ayrı boolean kolonlarıdır; versiyonlu, yönetici yetkili, CSRF ve idempotency korumalıdır. Varsayılan kapora açık, POS görünürlüğü kapalı; eski hizmet politikası korunur. Kapora kapalıysa yeni rezervasyon deposit snapshot'ı 0; eski tutarlar değişmez. Hizmet kataloğunda tanımlı kapora korunur, public katalog etkin tutarı gösterir.
- POS görünürlüğü tahsilat yetkisi değildir. Bağlantı olmadığında yalnız kullanılamıyor bilgisi gösterilir. API anahtarı/kart bilgisi toplanmaz. Banka/sağlayıcı formu hâlâ geçici önizlemedir.
- Mevcut randevu ve kullanıcı ilişkilerine aynı salon composite FK eklendi. Tek işletme sınırı korunur; çoklu tenant erişimi açılmaz.

## Alternatives

Sadece alındı boolean'ı kısmi ödeme ve geçmiş için yetersiz. Silinebilir ödeme satırları audit kaybına yol açar. POS sağlayıcısı seçimi bu talep için gerekli değildir.

## Consequences

Kayıt tutma ve rezervasyon onayı tutarlı hale gelir. Bu bir fatura/muhasebe sistemi değildir. Tahsilat geçmişi rezervasyon başına alınır ve UI'da sayfalanır; yönetici genel operasyon listesi mevcut snapshot yaklaşımını sürdürür. İadeler ayrıca tasarlanmalı; yanlış kayıt düzeltmesi fiilî iadeyi temsil etmez.

## Migration/Rollback

`1793200000000-collections-settings.sql` additive migration. Mevcut paid/refunded/refund_pending işaretleri varsa belirsiz tarihsel tutar uydurmak yerine migration durur; doğrulanmış kayıtlarla ayrıca mutabakat gerekir. Foreign key uyumsuzluğu varsa migration atomik başarısız olur. Önce pg_dump ve isolated test DB doğrulaması. Finansal geçmişten dolayı otomatik down migration reddedilir; forward-fix veya doğrulanmış backup restore uygulanır. Uygulama sürümü geri alınırken yeni tahsilat yazmaları durdurulmalı, projeksiyonu eski kodla ezmemek için kontrollü bakım penceresi kullanılmalıdır.

## Verification

PostgreSQL entegrasyon testleri: ayar yetkisi/versiyon/replay, snapshot korunması, kısmi/tam tahsilat, invalid amounts, paralel farklı/aynı anahtar, bir kez düzeltme, FK ve immutable kayıt, kapora süresi ve iptal. UI testleri: tutar/kalan, modal, düzeltme, ayar görünürlüğü, üç ekran genişliği ve axe. Test sonuçları `docs/quality/collections-review.md` içinde raporlanır.
