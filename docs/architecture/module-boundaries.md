# Modül sınırları

| Frontend modülü | Domain bağlamları                                                      | Sorumluluk                                    |
| --------------- | ---------------------------------------------------------------------- | --------------------------------------------- |
| booking         | Catalog, Staff, Scheduling, Reservation, Payment                       | Müşteri rezervasyon yolculuğunun kompozisyonu |
| identity        | Identity & Access                                                      | Oturum ve role göre UX                        |
| appointments    | Customer, Reservation                                                  | Kendi randevularını listeleme/değiştirme      |
| operations      | Organization, Staff, Resource, Scheduling, Daily Operations, Reporting | Yönetici/çalışan operasyonları                |

Frontend modülleri backend bounded context'lerinin bire bir kopyası değildir. Ortak API sözleşmeleri ayrı katmandadır; backend domain mantığı UI'a taşınmaz. Bildirim gönderimi, veri tabanı ve ödeme sağlayıcısı uygulaması kapsam dışıdır.

Modüller başka modülün private dosyasını import edemez. shared modülleri/routes/mocks import edemez; contracts shared/UI import edemez. Domain React, UI ve HTTP import edemez. Cycle yasaktır. dependency-cruiser bu kuralları quality gate olarak uygular. Ortak bileşen yalnızca gerçek kullanım ihtiyacıyla çıkarılır.
