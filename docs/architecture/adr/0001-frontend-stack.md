# ADR 0001 — Frontend stack ve render

Durum: kabul edildi. Tarih: 2026-10-26.

## Context

Boş repo; public salon SEO'su ve yoğun etkileşimli üç rol. Backend bu aşamada yok, Next.js yasak. Ücretli paket/servis, satın alma ve kart işlemi kullanıcı tarafından yasaklandı.

## Decision

React 19, React Router 7.18.4 framework, Vite 8, strict TypeScript. Public ana sayfa statik prerender; özel ekranlar route splitting ile SPA. Node 24 geliştirme/build; runtime uygulama sunucusu yok. Bağımlılıklar ücretsiz açık kaynak. Lockfile npm ci ile yeniden kurulabilir.

## Alternatives

SvelteKit static adapter uygun alternatif; React form/query/test ekosistemiyle bütünleşik çözüm tercih edildi. Nuxt ek framework seçeneği fakat ihtiyaç için ek faydası kanıtlanmadı. Yalın Vite SPA SEO için özel ön üretim kodu gerektirir. Next.js proje yasağıyla elendi. React Router 8 major yükseltmesi bu teslimde alınmadı; v7 patch hattı seçildi.

## Consequences

Render sırasında window kullanılmaz. Build-time giriş dosyası açıkça sağlanır; framework otomatik paket kurulumuna bırakılmaz. İşletme metadata snapshot değişiminde rebuild gerekir. React Router ve Vite birlikte uyumlu sürümlerde tutulur. Gerçek CWV ancak saha verisiyle doğrulanır.

## Migration/Rollback

Statik build artifact önceki sürüme alınır; mevcut modüller runtime SSR gerekirse taşınabilir. Domain/API sözleşmeleri routing framework'üne bağımlı değildir.

## Verification

Typegen, strict tsc, prerender HTML kontrolü, production build ve üç viewport E2E. Kaynaklar: [React Router prerender](https://reactrouter.com/how-to/pre-rendering), [SPA](https://reactrouter.com/how-to/spa), [SvelteKit static](https://svelte.dev/docs/kit/adapter-static).
