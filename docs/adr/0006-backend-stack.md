# ADR 0006 — Backend modüler monolit

Durum: kabul edildi, 26 Ekim 2026. Kullanıcı backend geliştirmesini bu görevde yetkilendirdi; önceki frontend-only kapsamı sona erdi. CI/CD açık talep ile ertelendi.

## Context

Frontend'in mevcut OpenAPI/Zod sözleşmeleri, tek salon, üç rol, misafir rezervasyonu ve PostgreSQL tutarlılığı korunmalı. Ücretli servis veya hesap açılmayacak. Dış servis kimlik bilgileri kullanıcı tarafından sunucuda girilecek.

Ödeme kapsamı kullanıcı tarafından geri çekildi: POS sağlayıcısı seçilmedi. Ödeme adapteri, manuel tahsilat/iade endpointleri ve ödeme tabloları kaldırıldı. Yalnız yönetici frontend form taslağı hazırlanır; kaydetme veya sağlayıcı bağlantısı yoktur.

## Decision

Node.js 24 + TypeScript strict + Fastify 5; PostgreSQL 18; pg ile parametreli SQL ve node-pg-migrate ile sürümlü SQL migration. Fastify session/cookie/CSRF eklentileri ve PostgreSQL session store; standart scrypt parola özeti. ORM üretilmez. PostgreSQL transaction ve exclusion constraints açık SQL ile görünür kalır. Temporal polyfill salon zamanı, DST ve gece yarısı aralıkları içindir.

Modüller identity, salon, scheduling, reservations, notifications ve operations. Domain saf fonksiyon/aggregate; application portları, SQL ve HTTP adapterlerinden ayrı. API ve worker aynı kod tabanı/artefakt, ayrı çalıştırılabilir süreçlerdir; mikroservis yok. Kalıcı outbox PostgreSQL'dedir; Redis/broker gerekmez. Bildirim gönderimi varsayılan kapalı; SMTP ve yapılandırılabilir SMS gateway adapterleri dış bağımlılığı sınırlar.

## Alternatives

ASP.NET Core/Identity olgun alternatiftir; mevcut SDK 5/7 eski ve desteklenen sürüm kurulumu gerektirir; mevcut TypeScript sözleşmelerini paylaşmak ve bakımda ikinci dil maliyetini azaltmak için seçilmedi. NestJS ek DI/decorator katmanı bu ölçek için gerekli değil. Express daha çok manuel HTTP standardizasyonu ister. Prisma/Drizzle uygun olabilir; bu uygulamada exclusion constraint ve transaction odaklı sınırlı SQL için ek ORM katmanı alınmadı. Hosted auth/DB/queue hesabı ve maliyet bağımlılığı oluşturacağı için seçilmedi.

## Consequences

SQL migration ve mapping bakımı bize aittir; integration test zorunlu. Session revocation PostgreSQL'de uygulanır. Tek işletme transaction kilidi yönetim/rezervasyon yarışlarını basitleştirir; throughput çok işletme ölçeğinde yeniden değerlendirilir. Domain modülleri frontend klasörlerinin bire bir kopyası değildir. Sağlayıcı belli değilken herhangi bir SMS/ödeme markasıyla entegrasyon tamamlandı denmez.

## Migration/Rollback

Yeni backend ve yeni veritabanı; mevcut demo verileri taşınmaz. Migration uygulanması ayrı komuttur. İlk kurulum boş veritabanına açık setup komutuyla yapılır. Yıkıcı otomatik down yok; yedek/geri yükleme ve forward-fix runbook'u kullanılır. Frontend demo modu korunur.

## Verification

Domain, gerçek PostgreSQL migration/concurrency/idempotency, auth/CSRF/ownership, contract ve bildirim retry testleri. CI/CD bu görev kapsamı dışıdır.

Kaynaklar: [Fastify LTS](https://fastify.dev/docs/latest/Reference/LTS/), [session](https://github.com/fastify/session), [CSRF](https://github.com/fastify/csrf-protection), [PostgreSQL range constraints](https://www.postgresql.org/docs/current/rangetypes.html), [pg transactions](https://node-postgres.com/features/transactions), [Temporal](https://tc39.es/proposal-temporal/docs/zoneddatetime.html).
