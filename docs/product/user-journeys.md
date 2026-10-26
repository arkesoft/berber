# Kullanıcı yolculukları

## Misafir

Ana sayfa → hizmet → çalışan → salon yerel tarihi → canlı müsait saat → iletişim → özet → geçici rezervasyon → kapora simülasyonu → onay.
Çakışmada saat adımına dönülür. Ödeme başarısızlığında aynı rezervasyon tekrar tahsil edilmeden yeniden deneme yapılır. Belirsiz ağ sonucunda aynı idempotency key korunur. Hold süresi dolduğunda yeni saat seçilir. Kart verisi uygulamaya alınmaz.

## Müşteri

Giriş/kayıt → randevularım → gelecek/geçmiş → detay → uygun saatle yeniden planla veya iptal onayı. Hesap değişiminde query cache temizlenir.

## Yönetici

Giriş → günlük özet → günlük/haftalık takvim → rezervasyon ve hizmet durumları. Ayrı navigasyonla hizmet/fiyat, çalışan, koltuk, mesai/izin, müşteri, ödeme kayıtları, rapor ve salon ayarları.

## Çalışan

Giriş → kendi günlük planı → randevu detayı → hizmeti başlat/tamamla. Diğer çalışanın kaydına API erişimi reddedilir. Mola/izin bilgileri ayrı plan ekranındadır.

## Ortak başarısızlıklar

401: yeniden giriş; 403: erişim reddi; 409: çakışma/değişmiş kayıt; 422: alan hatası; 503/ağ: tekrar dene. Hatalar kullanıcı verilerini loglamaz. UI loading, empty, error ve başarı durumlarını birbirinden ayırır.
