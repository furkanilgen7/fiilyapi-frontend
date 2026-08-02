# F-P6 — Bölüm Detay + Bölüm Formu (uygulama planı)

Spec: `../specs/2026-08-02-f-p6-bolum-detay-design.md` (**ONAYLI** — kullanıcı: "mockupta ne varsa
aynısını istiyorum yorum yapma"; backend'i olmayan her kart GÖRSEL basılır + devre-dışı, veri yazmaz).
Dal: `feat/f-p6-bolum-detay` (frontend main'den — P6 openapi tipleri zaten main'de, `091df6f`).
Her task = tek subagent + commit · Kapılar her task'ta: `pnpm lint`+`typecheck`+`test`.

## T1 — Altyapı
- `sites` BFF kökü grep doğrulaması (yeni kök beklenmiyor; yoksa DUR ve rapor et).
- Hook'lar: `useSection(sectionId)` + create/update mutasyonları (P6 gövdeleriyle).
- e2e mock-backend'e `GET /sections/{id}` + genişlemiş POST/PATCH gövdeleri (P6 sözleşmesine birebir;
  taslak-dışı zorunluluk kuralını mock da uygulasın ki jsdom/e2e testleri gerçeği yansıtsın).

## T2 — Bölüm Detay ekranı
- Rota `.../bolumler/[sectionId]` + hero + KPI şeridi (budget_amount gerçek, kalanlar placeholder/pending)
  + sekme başlıkları pending-modules + işçi/malzeme kartları pending. Mockup satır-numaralı sadakat.
- `on_hold` = "Beklemede" GERÇEK rozet tasarımı (D59); `SectionCard`'daki geçici nötr stil de buna geçer.
- `SectionCard` → detaya link. İzin: `sites:view`; Düzenle butonu `sites:full`.

## T3 — Bölüm formu (tam sayfa — mockup birebir: TÜM kartlar basılır, backend'i olmayanlar devre-dışı/pending, gövdeye alan sızdırmaz)
- `.../bolumler/yeni` + `.../[sectionId]/duzenle` (tek bileşen iki kip, hakediş formu deseni).
- Alan seti + taslak/taslak-dışı doğrulama spec §4 listesinden (OpenAPI'de kodlu değil — form kendi
  doğrulamasını yazar); 409 kod çakışması Türkçe alan hatası; `maxLength` sınırları.
- S1 onaylıysa `SectionFormModal` emekli edilir (Bölümler sekmesindeki "+ Bölüm Ekle" yeni rotaya gider);
  modalın testleri taşınır/uyarlanır, ölü kod bırakılmaz.
- Tüm kontroller `ui/` primitive; token'lı CSS; form-shell deseni.

## T4 — Test + görsel
- Vitest: taslak/yayın doğrulama ayrımı, 409, rozet eşlemesi, hook'lar; site-detail etkilenen testler.
- Görsel spec'ler: bölüm-detay + bölüm-formu (+ SectionCard değiştiyse site-detay görselinin
  baseline'ı YENİLENECEK listesine yazılır). macOS'ta PNG üretilmez.

## T5 — FINAL REVIEW (Opus)
- Mockup sadakati (satır no) · modal emekliliğinde kopuk akış kalmadı mı · taslak doğrulamasının
  backend runtime kuralıyla birebirliği · kapılar + `pnpm build`.
- `ARCHITECTURE-FRONTEND.md` (rotalar/bileşenler/hook'lar) + `ROADMAP-FRONTEND.md` (F-P6 borç
  satırlarının kapanışı) güncellenir, commit. **Push/PR sonrası kapanış sırası spec §1'dedir** —
  P6 backend merge+deploy ve taze openapi devri KULLANICI koordinasyonundadır; şef kendiliğinden
  backend'e dokunmaz.
