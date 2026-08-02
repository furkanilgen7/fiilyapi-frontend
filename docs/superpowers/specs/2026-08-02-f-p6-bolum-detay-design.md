# F-P6 — Bölüm Detay Ekranı + Bölüm Formu (frontend spec)

Tarih: 2026-08-02 · Durum: **ONAYLANDI (2026-08-02)** — kullanıcı kararı (verbatim): "mockupta ne
varsa aynısını istiyorum yorum yapma". Yorumu: mockup'taki HER öğe ekranda birebir basılır; backend'in
desteklemediği parçalar ATLANMAZ — pending/devre-dışı halde görünür, sessiz atlama yok. §7'nin dört
sorusu buna göre kapandı: S1 tam sayfa form + modal emekli · S2 "Hakediş Oluştur" BASILIR
(`/hakedisler/yeni?project=` linki — mevcut ekran) · S3 TÜM form kartları basılır (iş-kalemi atama,
taşeron, makine → pending/devre-dışı; belge → DocumentsPlaceholderCard; VERİ YAZMAZLAR — kalıcı karar 1
ve modül yoklukları veri katmanında geçerli kalır) · S4 kapanış sırası onaylı.
Mockup'lar: `projedesign/Bölüm Detay.dc.html` (D) · `projedesign/Form - Bolum Ekle.dc.html` (F)
Backend: P6 dalı `feat/p6-bolum-detay` (PR #12, **HENÜZ CANLI DEĞİL**) — `GET /sections/{id}` +
genişlemiş POST/PATCH + 7 yeni kolon + `on_hold` durumu.

## 1. KAPANIŞ SIRALAMASI (bu dilimin özel kuralı)
Frontend kodu **P6 openapi tipleriyle** yazılır (frontend main'de zaten senkron, commit `091df6f`).
Sıra: F-P6 kodu hazır + review temiz → **P6 backend merge (re-parent'lı) + deploy** (Dockerfile
otomatik migrate eder) → backend main'den TAZE openapi (P6+P8 birlikte) üret → frontend'e devir +
`gen:api` → F-P6 merge + deploy → canlı smoke. Bu sıra bozulursa ya bölüm formu canlıda kırılır
(P6'sız backend'e yeni alanlar) ya da openapi devri P6/P8'den birini ezer.

## 2. Rotalar
| Rota | Ekran | Not |
|---|---|---|
| `.../santiyeler/[siteId]/bolumler/[sectionId]` | Bölüm Detay (D) | drill sidebar bağlamında |
| `.../santiyeler/[siteId]/bolumler/yeni` | Bölüm formu (F) — tam sayfa (§7 S1) | şantiye formu deseni |
| `.../bolumler/[sectionId]/duzenle` | aynı form, düzenleme kipi | giriş: detaydaki "Düzenle" (D65) |
Şantiye Detay Bölümler sekmesindeki `SectionCard` detaya link olur; `SectionFormModal` §7 S1'e göre emekli edilir.

## 3. Bölüm Detay (D) — basılacaklar
- **Hero (D54-96):** "BÖLÜM {sort_order}" rozeti (D58) · durum rozeti (D59; `on_hold`="Beklemede"
  GERÇEK tasarım — P7'deki geçici nötr stil değişir) · ad (D61) · meta: şantiye adı + "Sorumlu:
  {manager_name}" + tarih aralığı (D62) · **Düzenle** butonu (D65, `sites:full`).
- **KPI şeridi (D69-95):** Bölüm Bedeli = `budget_amount` GERÇEK (D76) · Fiziksel İlerleme /
  Aktif İşçi / İş Kalemleri / "Gerçekleşen" → yer tutucu-pending desenleri (backend placeholder alanları) ·
  Kalan Gün = `end_date`'ten türev (D91).
- **Sekmeler (D99-105):** yalnız başlıklar; İş Kalemleri/İşçiler&Puantaj/Malzeme/Hakediş/Günlük Kayıt
  → hepsi pending-modules kartı (ara çözüm YOK; BOQ-bölüm bağı kalıcı karar 1 gereği kapalı).
- **"Hakediş Oluştur" butonu (D66):** BASILIR — `/hakedisler/yeni?project={projectId}` linki
  (mevcut P7 ekranı, proje bağlamı önseçili).
- İşçiler kartı (D215-250) + Malzeme kartı (D253-272): pending-modules.

## 4. Bölüm formu (F) — basılacaklar
Backend P6 alan eşlemesi (zorunlular `*` yalnız TASLAK-DIŞI — **OpenAPI'de kodlu DEĞİL**, kural
runtime'da; form kendi doğrulamasını bu listeden yazar):
Şantiye* (F66, yeni kayıtta rotadan sabit) · Bölüm Adı* (F67 `name`) · Bölüm Kodu (F68 `code`, boşsa
`BLM-NN` sunucu üretir — hint basılır) · Bölüm Sırası* (F69 `sort_order`) · Bölüm Tipi* (F70
`section_type` 7 seçenek) · Durum (F71 `status`, `on_hold` dahil) · Açıklama (F74 `description`) ·
Sorumlu* (F83 `manager_user_id`, izinli personel seçilebilir) · Yardımcı Sorumlu (F84 `deputy_manager_user_id`) ·
Planlanan İşçi (F85 `planned_worker_count`) · Başlangıç*/Bitiş* (F107/108) · Süre readonly türev (F109) ·
Bölüm Bedeli* (F110 `budget_amount`) · **Taslak Kaydet** (F242 `is_draft:true`) + **Bölümü Oluştur** (F243).
Kod çakışması 409 → Türkçe alan hatası.
**Backend'i olmayan kartlar — GÖRSEL OLARAK BİREBİR BASILIR, VERİ YAZMAZ** (kullanıcı kararı:
"mockupta ne varsa aynısını istiyorum"): İş kalemi atama kartı (F131-211) mockup'taki tablo/görünümüyle
basılır, kontroller devre-dışı + "İş kalemi bağları ile birlikte gelir" notu (kalıcı karar 1 veri
katmanında geçerli) · Taşeron + makine seçimleri (F88-98) basılır, devre-dışı + pending notu ·
Bağımlılık/milestone/Gantt checkbox'ı (F115-123, F237) basılır, devre-dışı (→P11) · Belgeler (F214-233)
`DocumentsPlaceholderCard` deseniyle 3 alan olarak basılır. Gönderilen POST/PATCH gövdesine bu
kartlardan HİÇBİR alan girmez.

## 5. Teknik zincir
BFF: `sites` kökü ZATEN listede — yeni kök GEREKMEZ (grep'le yine doğrulanır). Hook'lar:
`useSection(sectionId)` + create/update mutasyonları. `SectionCard` yeni alanları (tip etiketi,
`on_hold` rozeti) gösterecek şekilde güncellenir; drill sidebar'a bölüm seviyesi EKLENMEZ (kabuk canon:
tek seviye). Görsel spec'ler: detay + form (+ SectionCard değişirse site-detay baseline'ı yenilenir).

## 6. Testler
Vitest: form doğrulama (taslak/taslak-dışı ayrımı!), 409 dalı, rozet eşlemesi, hook'lar. e2e mock-backend'e
`GET /sections/{id}` + genişlemiş gövdeler. Görsel spec + Linux baseline turu.

## 7. AÇIK SORULAR (kullanıcı cevabı ŞART)
- **S1 — Form biçimi:** Mockup TAM SAYFA form (breadcrumb+kartlar). Mevcut `SectionFormModal` (P2'den,
  küçük modal) EMEKLİ edilsin ve hem ekleme hem düzenleme tam sayfaya taşınsın mı? Önerim: **evet** —
  mockup otoritesi + şantiye formu deseniyle tutarlı.
- **S2 — "Hakediş Oluştur" butonu (D66):** hakediş proje düzeyinde, bölüm bağı yok. Önerim: bu dilimde
  BASILMAZ (taşeron hakedişi/bölüm kırılımı gelince değerlendirilir).
- **S3 — Basılmayan form kartları:** taşeron/makine/belge/iş-kalemi kartları formda "yakında" yer
  tutucusuyla mı görünsün, yoksa HİÇ mi basılmasın? Önerim: **hiç basılmasın** (belge kartı hariç —
  o `DocumentsPlaceholderCard` deseniyle basılır, diğer formlarla tutarlı).
- **S4 — Kapanış sırası onayı:** §1'deki sıralama (F-P6 hazır → P6 merge+deploy → taze openapi devri →
  F-P6 merge) — onay?
