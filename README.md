# FİİL YAPI İnşaat ERP — Frontend

Next.js (App Router) + React arayüzü. Backend ayrı bir repodadır: [fiilyapi-backend](https://github.com/furkanilgen7/fiilyapi-backend)

## Durum

Henüz iskelet kurulmadı. Backend çekirdeği (B0–B2) tamamlandıktan sonra F0 fazıyla başlanacak.

## Mimari

- **Oturum:** JWT `httpOnly` cookie'de tutulur; tarayıcı JavaScript'i token'a erişemez. Next.js Route Handler'ları backend'e proxy yapar (BFF deseni).
- **Veri:** TanStack Query.
- **Tipler:** Backend'in OpenAPI şemasından üretilir — elle yazılmaz. Backend bir alan değiştirdiğinde burada derleme hatası çıkar.
- **Tasarım:** Açık tema; `projedesign/` altındaki 68 HTML mockup kanon. Token katmanı `src/styles/tokens.css`.
- **Hedef:** Masaüstü (≥1280px). Mobil tasarımı sonra eklenecek.

## Kaynak dokümanlar

Kanonik tasarım spec'i backend reposundadır:
`fiilyapi-backend/docs/superpowers/specs/2026-07-17-temel-modul-design.md`

Frontend fazları (F0–F6) spec §8'de tanımlıdır; uygulama planı yazıldığında `docs/` altına eklenecek.
