# Teknoloji değerlendirmesi

Tarih: 2026-10-26. Başlangıçta depoda yalnızca AGENTS.md ve frontend.md vardı. Aşağıdaki değerlendirme 15 kriteri kapsar; performans ve bakım kolaylığı varsayımı ölçümün yerini tutmaz.

| Seçenek                        | Kararlılık/ekosistem                         | Performans/SEO                              | Type safety/test                | Bakım/entegrasyon                                                                          | Karar                              |
| ------------------------------ | -------------------------------------------- | ------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------- |
| React + React Router framework | Yaygın React araçları; v7 güncel patch hattı | Statik ön üretim, route splitting           | TS, Testing Library, Playwright | API bağımsız; birkaç kütüphane birlikte yönetilir                                          | Seçildi                            |
| SvelteKit                      | Güçlü bütünleşik framework                   | Static adapter ve küçük istemci potansiyeli | TS ve test araçları             | Uygun alternatif; bu ürünün form/query/component araçlarıyla React bütünlüğü tercih edildi | Reddedildi, kötü olduğu için değil |
| Nuxt/Vue                       | Bütünleşik rendering ve routing              | SSR/SSG                                     | TS ve test araçları             | Bu aşamada sunucu özellikleri gereksiz; ikinci framework eklenmez                          | Seçilmedi                          |
| React + yalnız Vite SPA        | Basit ve olgun                               | Public HTML/SEO için ek çözüm gerekir       | İyi                             | Özel prerender altyapısı bakım maliyeti                                                    | Seçilmedi                          |
| Next.js                        | Değerlendirme dışı                           | —                                           | —                               | Proje tarafından yasak                                                                     | Kullanılmaz                        |

## Bütünleşik stack

React 19 + React Router 7 framework + Vite 8 + TypeScript strict; semantic CSS ve native HTML primitives; TanStack Query 5; React Hook Form 7 + Zod 4; native fetch; MSW 2; Vitest 4 + Testing Library; Playwright + axe; ESLint + dependency-cruiser; npm lockfile; statik build.

Güvenlik: aynı origin API, HttpOnly Secure SameSite oturum beklentisi, CSRF doğrulama, runtime şema doğrulaması, mutation retry kapalı. Erişilebilirlik/mobile-first: native controls, 1rem alt sınır, focus ve 44px hedefler. SaaS maliyeti: scope'u API/query sınırında tutmak; erken tenant mimarisi yok. Güncelleme riski: lockfile, npm ci, audit ve CI. React Router 8 registry'de mevcut; v7.18.4 patch hattı ve belgelenmiş stabil prerender API tercih edildi; major yükseltme ayrı ADR/test gerektirir.

## Resmî kaynaklar

- https://reactrouter.com/how-to/pre-rendering — statik HTML ve SPA fallback
- https://reactrouter.com/how-to/spa — runtime SSR olmadan root prerender
- https://svelte.dev/docs/kit/adapter-static — alternatif statik dağıtım
- https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults — stale/retry davranışı
- https://mswjs.io/guides/integrations/browser — ağ seviyesinde mock
- https://zod.dev/json-schema — OpenAPI ile uyumlu JSON Schema üretimi
- https://react-hook-form.com/get-started — form ve schema resolver

Nuxt rendering sayfası araştırma aracında okunamadı; güncel sürüm davranışı doğrulanmış kabul edilmedi. Sürüm uyumluluğu npm registry ve gerçek kurulum/build ile kontrol edilir. Hosting sağlayıcısı seçilmedi; statik çıktı sağlayıcı bağımsızdır.
