# API sözleşmeleri

Kaynak: app/contracts/schemas.ts; üretilen OpenAPI: contracts/openapi.json. npm run contracts üretir; contracts:check drift ve OpenAPI doğrulamasını yapar. Backend çalışması `backend/` altında bulunmaktadır; dağıtım doğrulaması tamamlanmış değildir. Ödeme backend'i kullanıcı isteğiyle kaldırıldı: POST /payments yalnız mevcut frontend demo sözleşmesidir, gerçek API tarafından sunulmaz. Yönetici ödeme ayarları yalnız geçici frontend formudur; endpoint veya kalıcı kayıt içermez.

| Endpoint                                 | Amaç                                               | Yetki                                                              |
| ---------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------ |
| GET /api/v1/catalog                      | Salon, hizmetler, çalışanlar, salon tarihi         | Public                                                             |
| GET /availability?serviceId&staffId&date | Tarihli slot listesi                               | Public                                                             |
| GET /session                             | Oturum ve CSRF                                     | Public                                                             |
| POST /session, POST /customers           | Giriş / müşteri kayıt                              | CSRF; rol backend tarafından atanır                                |
| DELETE /session                          | Çıkış                                              | Oturum + CSRF                                                      |
| GET /reservations?page&pageSize&date     | Rol/sahiplik kapsamlı liste                        | Oturum                                                             |
| POST /reservations                       | Snapshot ve süreli hold                            | CSRF + Idempotency-Key                                             |
| PATCH /reservations/{id}                 | cancel/reschedule/start/complete/no_show           | Sahiplik/rol + version + CSRF + idempotency                        |
| POST /payments                           | Kapora akışı                                       | Oturum veya guest token + CSRF + idempotency; bu sürüm yalnız mock |
| GET /operations                          | Yönetici veya çalışana filtreli operasyon snapshot | Yönetici/çalışan                                                   |
| PUT /management                          | Hizmet, çalışan, koltuk, mesai veya salon kaydı    | Yönetici + CSRF + idempotency                                      |

Paths tablosunda ilk satırdan sonraki yollar /api/v1 altındadır. Para integer minor unit/kuruş + TRY. ISO datetime offset zorunlu; tarih salon yerel takvim günüdür. Demo slot üreticisi Europe/Istanbul için yazılmıştır; başka timezone ve overnight mesai backend kapsamındadır. Buffer, kaynak ataması ve vardiya istisnaları gerçek backend'de modellenmelidir.

Rezervasyon durumları: pending_payment, confirmed, in_service, completed, cancelled, no_show, expired. Ödeme ayrı: unpaid, pending, paid, failed, refund_pending, refunded, partially_refunded. UI allowedActions kullanır; backend aynı aksiyonu ayrıca doğrular. İptal edilmiş veya completed kayıt tekrar başlatılamaz. Optimistic version stale update'i 409 yapar.

Başarılı cevap 200; hata {code,message,requestId,fieldErrors?}. 401 oturum, 403 yetki/CSRF, 404 bulunamadı/sahiplik, 409 çakışma/hold/version/idempotency/geçiş, 422 validation/ödeme simülasyonu, 503 ulaşılamama. Client ağ hatalarını NETWORK_ERROR olarak ayırır, ham sunucu içeriğini loglamaz.

Sayfalama 1 tabanlı page, varsayılan 20, en fazla 100. Liste {items,total,page,pageSize}; tarih filtresi YYYY-MM-DD. Büyük veri için operations snapshot sözleşmesi paginated endpointlere ayrılacaktır; MVP fixture kapsamı sınırlıdır.

Idempotency key kriptografik UUID; aynı actor+operation+key+payload sonucu tekrar döndürür, farklı payload 409. Production backend retention (en az retry penceresi), atomiklik ve concurrency garantilerini ayrıca uygulamalıdır. Guest erişim token'ı response'ta bir kez gelir, bellekte tutulur, loglanmaz; kalıcı self-service erişim gerçek backend OTP akışı gerektirir.

Mock senaryolar: success, slow, empty, network-error, server-error, unauthorized, conflict, payment-failed, expired, response-lost. Sonuncusu rezervasyonu kaydettikten sonra yanıtı düşürür; aynı anahtarla tekrar deneme ikinci rezervasyon oluşturmadan ilk sonucu döndürür. Header yalnız demo build'de gönderilir. Test senaryoları gerçek backend API'sinin parçası değildir.

PUT /management müşteri iletişim kaydı ekleme/düzenlemeyi de destekler (resource: customers). Bu işlem yeni kullanıcı hesabı veya parola oluşturmaz. Önceki rezervasyonların iletişim/fiyat snapshot'larını değiştirmez. Request modelleri ve discriminated resource union OpenAPI kaynağında doğrulanır.
