# ADR 0002 — Sözleşme, state, form ve HTTP

Durum: kabul edildi.

## Context

Backend yok; keyfi frontend modelleri ve sessiz API drift'i önlenmeli. Ödeme ve booking retry güvenli olmalı.

## Decision

Zod 4 şemaları executable contract kaynağıdır; OpenAPI 3.1 bu şemalardan üretilir ve git'e alınır. Native fetch response şemasını runtime doğrular, timeout ve abort destekler. TanStack Query server state'i; React/RHF yerel UI ve form state'i tutar. RHF + Zod resolver ana giriş/rezervasyon formlarında kullanılır. Yönetim editörü aynı contract şemasıyla submit doğrular.

## Alternatives

OpenAPI-first dış dosyadan istemci üretimi backend ortak depoya geçtiğinde yeniden değerlendirilebilir; bugün aynı şemadan tip ve runtime doğrulama daha az drift yaratır. Axios gereken bir özellik sağlamadığı için eklenmedi. Redux/Zustand global store server cache'i çoğaltacağı için eklenmedi. Formik yerine RHF'nin native input ve resolver yaklaşımı seçildi.

## Consequences

Request/response modelleri domain aggregate değildir. Şema değişikliği OpenAPI diff ve contract test gerektirir. Mutation otomatik retry kapalıdır. Booking anahtarı belirsiz ağ hatasında korunur; kesin slot çakışmasında yeni seçimle yenilenir. MSW aynı şemaları kullandığından contract test yanında bağımsız negatif örnekler gerekir.

## Migration/Rollback

/api/v1 major sözleşme korunur; breaking değişiklik /api/v2 veya açık göç planı ister. HTTP adapter ve MSW kaldırılabilir; UI aynı sözleşmeyi tüketir.

## Verification

OpenAPI parser + drift, negatif validation, replay/mismatch, timeout/ağ, ownership testleri. [Zod JSON Schema](https://zod.dev/json-schema), [Query defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults), [RHF](https://react-hook-form.com/get-started).
