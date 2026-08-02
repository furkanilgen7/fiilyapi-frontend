# P7 — İşveren Hakedişi Ekranları (uygulama planı)

Spec: `../specs/2026-08-02-p7-hakedis-ekranlari-design.md` · Ön şart: spec §6 sorularının kullanıcı cevabı.
Her task = tek subagent + commit. Kapılar her task'ta: `pnpm lint`+`typecheck`+`test`.

## T1 — Altyapı
- BFF `ALLOWED_ROOTS`'a `progress-payments` (+S3 onaylıysa `contracts`); grep doğrulaması + route testi.
- Backend'den güncel `openapi.json` kopyala → `pnpm gen:api`; `schema.test.ts` güncelle.
- `lib/api/hooks/`: liste/detay/summary/create/update/lines/submit/durum aksiyonları/refresh-prices hook'ları.

## T2 — `/hakedisler` liste ekranı
- `ListItem` alanları; rozet eşlemesi (pending_approval=Onay Bekliyor, approved=Onaylandı, paid=Ödendi,
  draft=Taslak); tutar S6 kararına göre; izin kapısı `progress_payments:view`; boş/hata/AccessDenied durumları.
- nav-config'te rota zaten var; catch-all'dan gerçek sayfaya geçiş.

## T3 — `/hakedisler/[id]` detay (Ekran 15)
- KPI şeridi + grup tablosu + Ödeme Hesabı + İlerleme kartı (spec §2 eşlemeleri, satır no'lu sadakat).
- Durum aksiyon butonları S1 kararına göre; `dropped_orphan_count>0` uyarı bandı.

## T4 — Oluştur/düzenle formu
- FF banner (S3 kararına göre) + dönem/kapsam üst formu + şantiye-pivot satır tablosu.
- Kaydet = TÜM satırlar `PUT lines` (değiştirme semantiği!); 409/422 Türkçe hata gösterimi;
  `refresh-prices` + `is_price_stale` uyarısı; tfoot `calculation`.
- Tüm kontroller `ui/` primitive; token'lı CSS; `maxLength` sınırları.

## T5 — Şantiye sekmesi
- `/projeler/[pid]/santiyeler/[sid]/hakedisler` rotası (drill sidebar zaten listeliyor; SiteDetailTabs
  sırasıyla birebir). İşveren listesi proje-düzeyi (S4); taşeron sütunu + kar KPI'ları pending-modules.

## T6 — Test + görsel
- Vitest birim testleri (hook'lar, pivot dönüşümü, rozet eşlemesi, hata dalları).
- e2e mock-backend'e hakediş uçları; fonksiyonel spec + her ekran için `*-visual.spec.ts`.
- macOS'ta PNG üretilmez; baseline turu push sonrası Linux CI.

## T7 — FINAL REVIEW (Opus)
- Mockup sadakati (satır no), BFF/izin, `PUT lines` semantiği, kapılar + `pnpm build`.
- `ARCHITECTURE-FRONTEND.md` (rota+BFF+hook envanteri) + `ROADMAP-FRONTEND.md` güncelle, commit.
