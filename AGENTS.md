# Codex Agent Rules — Berber Rezervasyon Yazılımı

> **Durum:** Bağlayıcı proje mühendislik kuralları (v1.0)
> **Ürün stratejisi:** Önce **tek işletmeye anahtar teslim** production yazılımı. Daha sonra kontrollü şekilde SaaS'a dönüşebilir.
> **Dil:** Açıklamalar, görev özetleri ve kullanıcıya dönük dokümantasyon Türkçe; kod sembolleri ve API anahtarları tutarlı İngilizce.

## 0. Codex için yürütme protokolü

1. Her göreve başlamadan önce bu dosyayı, ilgili modül dokümanlarını ve varsa ADR'leri oku. Mevcut kodu incelemeden yeniden mimari kurma.
2. Görevin kapsamını, etkilenen modülleri, veri modelini, riskleri ve doğrulama planını kısa biçimde belirle.
3. **Önce tek işletme MVP'si** için en küçük doğru çözümü uygula. SaaS aboneliği, tenant kayıt paneli, marketplace ve mikroservisleri kendiliğinden geliştirme.
4. Bu dosyanın yasaklarını ihlal eden bir talepte güvenli seçenek sun; gerekli mimari değişiklik için ADR öner. Belgelenmemiş teknolojiyi seçilmiş gibi varsayma.
5. Her değişiklikte testleri, migration etkisini, güvenliği, geri alma yolunu ve gözlemlenebilirliği değerlendir.
6. Görevi bitirirken değişen dosyaları, yapılan doğrulamaları, çalıştırılamayan testleri ve kalan riskleri dürüstçe raporla. Test çalışmadıysa 'başarılı' deme.
7. İzin almadan mevcut kullanıcı verisini silme, production secret'larını okuma/yayınlama, geri alınamaz migration veya doğrudan production deploy yapma.

## 1. Bağlayıcı mimari kararları

- **Deployment birimi:** Modular Monolith. İlk sürümde mikroservis mimarisi yok.
- **Domain modelleme:** Domain-Driven Design (DDD), bounded context, entity, value object, aggregate ve explicit state transition.
- **Bağımlılık yönü:** Clean / Hexagonal Architecture (Ports & Adapters); domain altyapıdan bağımsız.
- **Tasarım:** OOP'nin encapsulation, abstraction ve polymorphism ilkeleri; SOLID, composition over inheritance, high cohesion/low coupling, DRY, KISS, YAGNI.
- **İstisna:** Her kavram için class/interface oluşturma. İş değeri olmayan soyutlama ve premature generalization yasaktır. Pure function ve immutable value object uygun yerde kullanılabilir.
- **Sınırlar:** Modüller birbirinin private tablolarını veya implementation detaylarını değiştirmez; yayınlanmış uygulama sözleşmelerini ve olayları kullanır.
- **Veri deposu:** PostgreSQL; ACID transaction, uygun unique/check/foreign-key/exclusion constraints, migration sürümleme.
- **API:** Contract-first, OpenAPI ile belgelenmiş ve doğrulanmış, sürümlemeye uygun; giriş/çıkış sözleşmeleri tipli.
- **Asenkron:** Güvenilir background jobs; veri + olay atomikliği gereken yerlerde transactional outbox; consumer idempotent.
- **Güvenlik:** Server-side authorization, least privilege, role/policy checks, secrets management, OWASP ASVS temel alınır.
- **Teslim:** CI/CD, kod incelemesi, otomatik kalite kapıları, monitoring, backup/restore, rollback/forward-fix planı.

## 2. Ürün sınırı ve modüller

**MVP modülleri:**
1. Identity & Access
2. Organization & Salon (tek işletme, tek salon akışı)
3. Staff Management
4. Resource / Chair Management
5. Service Catalog
6. Scheduling & Availability
7. Reservation Management
8. Customer Management (üyeli ve misafir)
9. Payment & Deposit
10. Notifications
11. Daily Operations
12. Basic Reporting

**İlk sürüme DAHİL DEĞİL:** İşletmelerin self-service kaydı, SaaS abonelik paketleri, platform-admin çoklu tenant yönetimi, açık pazar yeri, gelişmiş CRM, sadakat cüzdanı, AI asistan, kapsamlı stok/muhasebe, mikroservis, CQRS, event sourcing ve sharding.

**SaaS hazırlığı:** İşletme marka/ayarlarını hardcode etme; mantıksal işletme kimliğini ve veri sahipliğini tutarlı tanımla. Tek işletme MVP'sinde tenant seçme veya çoklu tenant erişimi açma. İleride shared-tenancy'ye geçerken uygulanacak izolasyon, veri göçü ve yetki değişiklikleri ayrıca tasarlanıp test edilmelidir; yalnızca `organization_id` eklemek tam izolasyon değildir.

## 3. Domain modelleme kuralları

- Aggregate root, invariant'larını kendi kontrollü operasyonlarıyla korur; dışarıdan `reservation.status = ...` benzeri serbest değişiklik yapma.
- Reservation yaşam döngüsü açık state machine ile tanımlanır; izin verilen ve yasak geçişler test edilir.
- Çalışan (Staff), koltuk/kaynak (Chair/Resource), hizmet (Service), müşteri (Customer) ve rezervasyon (Reservation) ayrı kavramlardır.
- Hizmet süresi, hazırlık/buffer, personel mesaisi, mola, izin, salon kapalı günleri ve gerekli kaynaklar müsaitliği etkiler.
- Fiyat ve hizmet ayrıntıları rezervasyon anında immutable snapshot mantığıyla korunur; katalog fiyatı değişince geçmiş randevunun fiyatı sessizce değişmez.
- Para değerlerini floating point ile tutma; `Money` value object veya güvenli decimal/minor-unit stratejisi ve para birimi kullan.
- Zamanları açık timezone politikasıyla yönet; depolama, hesaplama ve salonun yerel saat gösterimini karıştırma. DST ve gece yarısını geçen aralıkları test et.
- Domain katmanına HTTP request, ORM model, Redis client, vendor SDK veya framework nesnesi sokma.
- Application use case işlemi orkestre eder; domain invariant'ları domain'de, dış erişim kontrolü application/API sınırında, transaction/kalıcılık altyapıda uygulanır.

## 4. Rezervasyon tutarlılığı (kritik)

- **Aynı çalışana ya da aynı zorunlu koltuğa çakışan aktif rezervasyon oluşturulamaz.** Sadece frontend kontrolüne veya `SELECT` sonrasında `INSERT` varsayımına güvenme.
- Rezervasyon alma/yeniden planlama işlemlerini transaction içinde, veritabanı düzeyindeki uygun exclusion constraint, lock veya seri hale getirme stratejisiyle koru; state'e göre constraint kapsamını test et.
- Geçici saat tutma (hold) işleminin benzersiz kimliği, bitiş zamanı, tüketim/serbest bırakma davranışı belirli olmalı. Süresi dolan hold kalıcı rezervasyon yaratmamalı.
- Paralel istek, retry, double-click, network timeout, iptal ile ödeme yarışları ve worker tekrar çalışması test edilmeden işlem tamamlanmış sayılmaz.
- İşletmenin manuel randevusu ve müşterinin online randevusu **aynı müsaitlik ve çakışma kurallarını** uygular.
- Availability hesaplaması ve booking commit'i ayrı aşamalardır; ekranda görülen slot kesin rezervasyon garantisi değildir.

## 5. Ödeme ve kapora bütünlüğü (kritik)

- SaaS abonelik tahsilatı (gelecek) ile müşteriden berbere alınan kapora iki farklı bounded context'tir; şimdilik sadece müşteri kaporası geliştirilir.
- Provider adapter sözleşmesini domain'den ayır. Sağlayıcı callback/webhook'u imza ve ödeme durumu doğrulanmadan güvenilir kabul edilmez.
- İstek, callback ve consumer tekrarlarında idempotency ve unique provider-reference uygulanır; iki defa ödeme/rezervasyon işlenmez.
- Ödeme durumları ve randevu durumları ayrı state machine'dir. Gecikmiş callback, başarısız ödeme, iptal, iade ve kısmi iade senaryoları tanımlanır.
- Haricî ödeme sağlayıcısı çağrısı sırasında uzun süreli DB transaction açık tutulmaz. Uygun intent/hold, reconciliation ve compensation akışı kur.
- Kart numarası, CVV, hassas ödeme token'ı uygulama loglarına veya kendi veritabanına gereksiz şekilde kaydedilmez.
- İade kararları iş kuralı ve güncel yasal yükümlülüklerle uyumlu ayrıca doğrulanır; otomatik 'kapora yanar' varsayımı yoktur.

## 6. Modüller arası iletişim

- Aynı işlem anında güçlü tutarlılık gerekiyorsa açık application contract üzerinden senkron çağrı veya tek DB transaction.
- E-posta, SMS, bildirim ve analitik gibi gecikmeye toleranslı işlerde domain/integration event ve durable worker.
- Domain event ile integration event ayrı kavramlardır; dışa yayınlanan olayların sözleşmeleri sürümlenir.
- Transactional outbox gereken akışlarda event verisi iş verisiyle aynı transaction'da yazılır.
- **Exactly-once delivery vaat etme**; en az bir kez teslim + idempotent effect hedefle.
- Retry: sonlu sayıda, timeout + exponential backoff + jitter; non-idempotent işlemler körlemesine tekrar edilmez.
- Hata yaşam döngüsü: gözlemlenebilir durum, kontrollü tekrar, gerektiğinde dead-letter/reconciliation/runbook.

## 7. API ve kimlik

- Tüm girişleri server tarafında validate et; DTO ve domain modeli otomatik olarak aynı sınıf kabul edilmez.
- Yetki kontrolü her hassas endpoint ve use case'te uygulanır. Sahiplik kontrolü yalnızca ID'nin varlığına dayanmaz.
- Üyeli müşteri ve misafir randevu ayrımını açık modelle; misafir işlemlerinde tahmin edilemeyen token + doğrulama + süre sınırı kullan.
- Kimlik doğrulama ile yetkilendirmeyi ayır; en az privilege ve deny-by-default.
- Rate limit, brute-force/bot koruması, session güvenliği, CSRF/CORS stratejisi ve güvenli hata mesajları bulunur.
- OpenAPI sözleşmesinin gerçeği yansıttığını contract test ile kontrol et; breaking değişikliklerde sürüm/deprecation kararı yaz.

## 8. Frontend kalite kuralları

- **Mobile-first**, responsive ve erişilebilir arayüz. Varsayılan metin boyutu **minimum 1rem**; seçilmiş font **Outfit**.
- i18n uyumlu metin anahtarları; uzun metinler ve TR/DE/FR karakterleri kesilmeden gösterilmeli.
- Public rezervasyon sayfası için SEO'ya uygun render stratejisi; **Next.js kullanılmayacak**.
- Design tokens, erişilebilir bileşenler, klavye erişimi, focus state, form hata açıklamaları, loading/empty/error durumları zorunlu.
- Server state ve local UI state'i ayır; frontend asla müsaitlik/ödeme yetkisi konusunda nihai doğruluk kaynağı değildir.
- TypeScript strict, kod bölme, anlamlı bundle/performance bütçesi; gereksiz bağımlılık ekleme.

## 9. Security ve gizlilik

- OWASP ASVS hedefli kontroller; tehdit modelleme özellikle auth, ödeme, misafir token ve yönetici işlemleri için yapılır.
- TLS, uygun at-rest encryption, secret manager/env secrets, rotation yaklaşımı, dependency/security scanning.
- Loglarda parola, OTP, token, hassas kişisel bilgi veya kart verisi bulunmaz.
- KVKK, saklama/silme, aydınlatma ve ticari ileti izinleri ürüne göre ayrı ele alınır; hukuk kuralı kod varsayımıyla icat edilmez.
- Audit trail: kritik durum değişikliklerinde aktör, olay, zaman ve korelasyon kimliği tutulur; log kişisel veriyi gereksiz çoğaltmaz.
- İleride SaaS için tenant erişim sınırları mutlaka kapsamlı saldırı/izolasyon testlerinden geçer.

## 10. Test ve kalite kapıları

Her görev etkisine göre aşağıdaki kontrolleri uygula:

- Format, lint, strict type-check, static analysis.
- Domain invariant unit tests.
- PostgreSQL ile gerçek integration tests ve migration tests.
- API contract tests; kritik kullanıcı yolculuklarına E2E.
- Rezervasyon ve ödeme için concurrency, retry, webhook duplication ve timeout testleri.
- Auth/authorization için negatif testler (IDOR, yetkisiz erişim, misafir token istismarı).
- Mimari import/dependency testleri: domain -> infrastructure veya modüller arası private import yasak.
- Production öncesi ölçülebilir load tests, backup restore testi, rollback/forward-fix tatbikatı.

**Quality Gate:** Kritik test, yetkilendirme, migration doğrulaması, veri bütünlüğü veya güvenlik taraması başarısızsa merge/release bloklanır. Test sonucu olmadan 'production-ready' iddiası kullanma.

## 11. Operasyon, performans ve güvenilirlik

- Dev/staging/prod ayrımı, tekrarlanabilir build, immutable artifact, CI/CD, IaC, health/readiness probe.
- Structured log, request/correlation ID, metric, trace; OpenTelemetry uygun araçlardan biridir.
- SLI/SLO belirle; örnek **başlangıç hedefleri** (ölçülecek, garanti değil): kritik API p95 <= 300 ms, rezervasyon işlemi ödeme dışı p95 <= 800 ms, hizmet ulaşılabilirliği aylık %99,9.
- RPO <= 15 dk ve RTO <= 60 dk başlangıç hedefleridir; altyapı, yedekleme ve kurtarma testleriyle kanıtlanmadan sağlandı sayılmaz.
- Performans sorununu profillemeden cache, queue, sharding veya mikroservis ekleme.
- Redis varsa rezervasyonun tek doğruluk kaynağı değildir; kritik tutarlılığı PostgreSQL korur.
- Background worker durduğunda rezervasyon kaybolmaz; birikmiş olaylar idempotent şekilde işlenebilir.
- Runbook: ödeme mutabakatı, stuck hold, bildirim aksaması, DB kurtarma, deployment geri dönüşü.

## 12. Engineering Foundation — kapsam ve sınır

Ortak ihtiyaç görüldüğünde geliştirilebilecek bileşenler:
- domain-kernel (yalın temel tipler)
- contracts (API/event sözleşmeleri)
- errors / validation
- identity-policy contracts
- transaction/outbox primitives
- observability helpers
- testing fixtures / architecture test rules
- module scaffolding templates

**Yasak:** Kendi HTTP framework'ünü, ORM'ni, auth protokolünü veya event broker'ını sıfırdan yazma. Foundation'a `Barber`, `Reservation`, `Deposit` gibi ürüne özel domain kavramlarını koyma. Henüz ikinci kullanım noktası bulunmayan soyutlamayı ayrı package'a çıkarma.

## 13. Mimari anti-pattern yasağı

- God Class, Fat Controller, Anemic Domain Model'e bilinçsiz kayma.
- Circular Dependencies, cross-module database writes, domain'den vendor SDK import'u.
- Her nesneye interface açma, generic repository zorunluluğu, aşırı inheritance.
- Ödeme veya rezervasyon için eventual consistency'yi gerekçesiz kullanma.
- Kritik doğrulamayı sadece frontend'de yapma.
- Migration olmadan şema değiştirme; production'da veri kaybı riski taşıyan operasyonu otomatik çalıştırma.
- Test geçmeden veya gözlemlenebilirlik olmadan production'a çıkarma.
- Mimari ihtiyaç kanıtı olmadan mikroservis, CQRS, event sourcing ve sharding kurma.

## 14. ADR ve değişiklik prosedürü

Aşağıdaki kararlar için `docs/adr/NNNN-konu.md` oluştur:
- Backend dili/framework, ORM, auth, queue/worker, ödeme sağlayıcısı, hosting, monitoring ürünleri.
- Domain sınırını değiştiren kararlar.
- Veri izolasyon modeli, çoklu şube/tenant geçişi.
- Rezervasyon conflict çözümü veya ödeme transaction protokolü değişiklikleri.

ADR şablonu: **Context, Decision, Alternatives, Consequences, Migration/Rollback, Verification**.

## 15. Henüz seçilmemiş teknolojiler

Aşağıdakileri Codex **kesin seçim sanmayacak**: Backend dili/framework, ORM, frontend framework, BFF implementasyonu, queue sistemi, auth sağlayıcısı, ödeme sağlayıcısı, hosting, monitoring ürünü. Mevcut repository kullanıyorsa onu incele; aksi durumda gerekçeli seçenekler çıkar ve yeni teknoloji kararı için ADR hazırla.

## 16. Definition of Done (her görev)

- [ ] İş ihtiyacı ve değişiklik kapsamı karşılandı.
- [ ] Domain sınırları ve invariant'lar korunuyor.
- [ ] Auth/authorization ve veri erişimi değerlendirildi.
- [ ] Veri modeli/migration/backfill/rollback etkisi değerlendirildi.
- [ ] Başarılı ve başarısız iş yolları test edildi.
- [ ] Eşzamanlılık/idempotency gerekli yerde doğrulandı.
- [ ] API/event sözleşmeleri güncellendi.
- [ ] Log/metric/trace ve gizlilik etkisi ele alındı.
- [ ] İlgili otomatik kontroller başarıyla çalıştı veya eksikler açıklandı.
- [ ] Kullanıcıya değişiklik, kanıt ve riskler kısa şekilde raporlandı.

---

**Yönetici ilke:** *MVP'de ürün kapsamını küçült; veri bütünlüğünü, güvenliği, modül sınırlarını, testleri ve production disiplinini küçültme.*

## Frontend Instructions

For every frontend, UI, UX, styling, or
responsive design task:

1. Read `frontend.md` before starting.
2. Follow its design principles and skill rules.
3. Treat `frontend.md` as mandatory project guidance.