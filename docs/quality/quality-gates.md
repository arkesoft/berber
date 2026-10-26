# Kalite kapıları

Komutlar: npm run typecheck, lint, contracts:check, architecture, test, build:demo, test:e2e, build, budget; npm audit. npm ci lockfile ile tekrarlanabilir kurulumdur.

Kritik akış, tip, lint, contract drift, bağımlılık ihlali, erişilebilirlik ve build hataları teslim/release bloklar. Sonuçlar verification.md içinde komut ve kanıtla kaydedilir. Çalıştırılmayan test geçmedi sayılır.

## Canlı yayın öncesi

Backend auth/CSRF/session/ownership, rezervasyon constraint/transaction, ödeme hosted checkout ve imzalı callback, hold expiry/reconciliation, gizlilik metinleri ve işletme yapılandırması tamamlanmalıdır. CSP ve güvenlik başlıkları hosting katmanında uygulanmalı; demo worker canlı build'den çıkarılmalıdır. Gerçek cihaz, ekran okuyucu, load ve saha performans doğrulaması gerekir. Bu frontend tek başına production-ready sistem değildir.
