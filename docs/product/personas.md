# Roller

| Rol      | Temel ihtiyaç                               | Erişim                                                                          |
| -------- | ------------------------------------------- | ------------------------------------------------------------------------------- |
| Misafir  | Hesap açmadan randevu                       | Katalog, müsaitlik, kendi geçici rezervasyon oturumu                            |
| Müşteri  | Gelecek/geçmiş randevu yönetimi             | Yalnızca kendi randevuları                                                      |
| Yönetici | Günlük salon operasyonu                     | Salon randevuları, kaynaklar, hizmetler, mesai, müşteriler, kayıtlar ve ayarlar |
| Çalışan  | Sıradaki müşteriyi ve çalışma planını görme | Kendi randevuları, mola/izin, izin verilen hizmet geçişleri                     |

Rol seçimi yalnızca demo girişinde yer alır. Canlı girişte rol request ile seçilemez; backend session cevabından gelir. Route guard yalnızca UX sağlar; API her istekte yetki ve sahiplik denetler.
