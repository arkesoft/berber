# ADR 0005 — Kalite kapıları ve statik dağıtım

Durum: kabul edildi; hosting sağlayıcısı seçilmedi.

## Context

Çalışan UI yanında sınır, contract, erişilebilirlik ve kritik yolculuk kanıtları gerekir. Ücretli bulut/CI kurulmayacak.

## Decision

Vitest + Testing Library + MSW/node; Playwright + axe; ESLint, TypeScript, dependency-cruiser, Prettier. Yerel kalite komutları, npm ci ve lockfile. CI sağlayıcısı ve pipeline henüz kurulmadı; aynı komutların gelecekte ücretsiz veya işletmenin kendi runner'ında çalıştırılması gerekir. Tek statik artifact; CDN/hosting sağlayıcısından bağımsız. Preview yalnızca statik dosya sunar, backend endpoint uygulamaz.

## Alternatives

Jest ayrı dönüşüm konfigürasyonu gerektirir. Cypress yerine Playwright'ın çoklu viewport/a11y ekosistemi seçildi. Ağır microfrontend/monorepo paketleme tek deployment gereksiniminde gereksiz. Ücretli hosting, CI runner ve monitoring bağlanmadı.

## Consequences

ESLint 10 seçildi. eslint-plugin-jsx-a11y güncel sürümünün peer aralığı yalnız ESLint 9'a kadar desteklediği için uyumsuz paket zorla kurulmadı. Erişilebilirlik gerçek render üzerinde axe, klavye ve component testleriyle denetlenir. eslint-plugin-react-hooks ve typescript-eslint'in ESLint 10 desteği registry'den doğrulandı.

CSP script hash'leri HTML'e göre hesaplanmalı, frame-ancestors ve nosniff uygulanmalı. Statik host SPA fallback'i ve /api yönlendirmesini ayırmalıdır. Gzip bütçesi tüm JS için 450KB ve tek chunk için 220KB; saha performansı yerine geçmez. Browser testleri Chromium'a odaklanır; Safari/Firefox/gerçek cihaz ayrıca gate'tir.

## Migration/Rollback

Dağıtım kurulduğunda immutable artifact atomik değiştirilmeli; önceki build'e geri dönülebilmelidir. Hosting seçimi ayrı ADR'dir. Harici hesap, pipeline veya ücretli koşu başlatılmadı.

## Verification

Check, E2E, build, budget, audit; sonuçlar docs/quality/verification.md içinde gerçek çıktılarla kaydedilir.
