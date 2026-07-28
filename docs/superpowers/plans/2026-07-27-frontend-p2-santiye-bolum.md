# P2 — Şantiye & Bölüm (frontend uygulama planı)

Tarih: 2026-07-27
Bağlı spec: `docs/superpowers/specs/2026-07-27-frontend-p2-santiye-bolum-design.md`
Backend sözleşmesi: `fiilyapi-backend` PR #1 (`feat/p2-santiye-bolum`, CI yeşil)
Yürütme: `superpowers:subagent-driven-development` — task-by-task, her task bağımsız review'lı

---

## ⚠️ Başlamadan önce — dal bağımlılığı

`fix/select-primitive-birlesme` dalında **üç iş birikti ve henüz merge edilmedi**:
select primitive birleştirmesi, form kontrolü ölçü token'ları, `Field` etiket primitive'i.

P2 formları (`SiteFormModal`, `SectionFormModal`) bu üçünü de kullanmak zorunda —
`Field` + `Input`/`Select`. Bu yüzden **P2 dalı o dalın üzerine açılır**:

```
git checkout fix/select-primitive-birlesme
git checkout -b feat/p2-santiye-bolum
```

Form dalı önce main'e merge edilirse P2 dalı main'den açılır ve rebase edilir.
**Ham `<select>`/`<input>`/`<label>` yazmak yasak** — bellek kuralı
`form-kontrolleri-primitive-kurali`.

## Kurallar (her task için)

- **TDD:** önce test (Vitest + Testing Library), kırmızı gör, sonra implementasyon.
- **Mockup birebir:** ölçüler spec §4–5'te satır numaralarıyla verili. Göz kararı yok.
- **Token zorunlu:** çıplak px/hex yazılmaz; gereken yeni token'lar spec §6'da listeli.
- **Görsel baseline ÜRETME.** macOS'ta PNG üretilmez; Linux CI (`visual-baselines.yml`,
  workflow_dispatch) üretir. Görsel testleri lokalde koşma.
- Her task sonunda: `pnpm typecheck` + `pnpm lint` + `pnpm vitest run` + `pnpm build` temiz.
- **Ajanlar push etmez.** Merge/push/deploy kararı kullanıcıdadır.

---

## Task 1 — OpenAPI aktarımı ve tipler

Backend'de üretilmiş `openapi.json` → `frontend/openapi/` → `pnpm gen:api`.

**Dikkat (backend incelemesinden çıktı):** `MetricPlaceholder` şemada düz adıyla değil,
**`app__modules__projects__schemas__MetricPlaceholder`** olarak geçiyor — `dashboard` ve
`projects` modüllerinde aynı adlı iki sınıf olduğu için FastAPI adı niteliyor. Bu P2'nin
getirdiği bir şey değil, `6fc91c2`'de de böyleydi; üretilen tip adı değişmiyor.
`SiteCard.progress_pct`, `SectionResponse.budget`, `SiteListTotals.*` bu uzun ada
`$ref` veriyor.

**Bitti tanımı:** `gen:api` çıktısında 7 `sites` ucu ve `SiteCard`/`SiteDetailResponse`/
`SectionResponse` tipleri var; `pnpm typecheck` temiz.

---

## Task 2 — `DrillSidebar` primitive'i

**Dosya:** `src/components/shell/drill/DrillSidebar.tsx` + `drill-sidebar.css` + testler

Spec §3. Kanon uygulama `settings/shell/SettingsSidebar.tsx` — yapı birebir aynı:
üstte geri linki, gruplu liste, `isActivePath` ile aktif işaretleme.

- Genel bileşen: geri linki (etiket + href), gruplar, aktif yol prop olarak dışarıdan
- Genişlik `--drill-sidebar-width` (260px); ana sidebar 220px kalır
- `<nav aria-label>` zorunlu

**`SettingsSidebar`'ı bu dilimde DEVRETME** — kapsam kayması olur, ayrı iş.

**Testler:** geri linkinin doğru href'e gittiği; aktif öğe işaretlemesi; grup başlıkları.

---

## Task 3 — `project-nav-config` ve drill menü içeriği

**Dosya:** `src/components/shell/drill/project-nav-config.ts` + test

Spec §3.3. Bağlam bloğu (Tüm Projeler → aktif proje → aktif şantiye → 6 sekme) +
Saha & İK · Stok & Satınalma · Mali grupları.

Geri oku **bir seviye yukarı** (spec §3.1): Şantiye → Proje → `/projeler`.
Etiket üst seviyenin **adı**, sabit metin değil.

Yazılmamış rotalar mevcut catch-all ile `ComingSoon`'a düşer (F3 deseni).

**Testler:** her seviyede doğru geri hedefi + etiketi; aktif şantiye varken 6 sekmenin
göründüğü, yokken görünmediği.

---

## Task 4 — Proje Detay rotası ve hero şeridi

**Dosya:** `src/app/(app)/projeler/[projectId]/layout.tsx`, `page.tsx`,
`src/components/project-detail/ProjectHeroBar.tsx`, `ProjectDetailTabs.tsx`

Spec §4.1–4.2. Hero (gradyan, başlık, sağ blok, sekme barı) + `Şantiyeler (2)` başlığı +
`+ Şantiye Ekle` butonu.

Sekmeler: Şantiyeler · İş Kalemleri · İşveren Hakediş · Taşeron Hakediş · Belgeler.
Yalnız *Şantiyeler* yazılır; diğerleri **görünür kalır** (spec §7.3) ve `ComingSoon`'a
gider. `aria-disabled` verilmez; `title` ile "Bu bölüm yakında".

Sağ bloktaki "Toplam Sözleşme" **yer tutucu** (`contracts`).

---

## Task 5 — `SiteCard`

**Dosya:** `src/components/project-detail/SiteCard.tsx` + test

Spec §4.3 tablosu — aktif ve tamamlanmış kart iki ayrı ölçü kümesi taşıyor
(üst şerit gradyan vs düz, `opacity:.8`, KPI renkleri, ilerleme çubuğu izi).

- 3 KPI: İşçi (yer tutucu) · İlerleme (yer tutucu) · Kalan Gün / Teslim
- Yer tutucu hücre düzeni korur, `—` basar, `title` ile Türkçe açıklama (§7.1)
- Yer tutucu **ilerleme çubuğu çizilmez** — sahte %0 izlenimi verir; boş iz bırakılır
- `remaining_days < 0` → kırmızı + "X gün gecikme" (§7.5)
- Çipler: İş Kalemleri · İşveren Hak. · Taşeron Hak. · → Detay
  (tamamlanmışta "Final Hakediş", `→ Detay` çip stili değişiyor)

**Testler:** iki durum varyantı; yer tutucu `—`; negatif gün kırmızı; çubuk çizilmemesi.

---

## Task 6 — `SiteTotalsStrip` ve boş durum

**Dosya:** `src/components/project-detail/SiteTotalsStrip.tsx`

Spec §4.4. 4 KPI kartı — **dördü de yer tutucu** (`progress_payments`, `subcontracts`,
`timesheet`, `project_costs`).

Boş durum (§7.4): "Bu projede henüz şantiye yok." + `+ Şantiye Ekle`.

---

## Task 7 — `SiteFormModal`

**Dosya:** `src/components/project-detail/SiteFormModal.tsx` + test

`Field` + `Input`/`Select` primitive'leriyle. Alanlar backend `SiteCreate`/`SiteUpdate`
şemasından: ad, kod (boş bırakılırsa backend türetir — hint olarak yaz), durum, adres,
şehir, **şantiye şefi (serbest metin — bu dilimde select DEĞİL)**, başlangıç/bitiş/teslim.

Şantiye şefinin neden select olmadığı: backend spec §2.1.1 — Personel modülü gelince
bağlanacak. Mockup select gösteriyor, bu **onaylı erteleme**, sapma sayılmaz.

**Testler:** zorunlu alan doğrulaması; 409 (kod çakışması) kullanıcıya anlaşılır mesajla.

---

## Task 8 — Şantiye Detay rotası ve hero

**Dosya:** `src/app/(app)/projeler/[projectId]/santiyeler/[siteId]/layout.tsx`, `page.tsx`,
`src/components/site-detail/SiteHeroBar.tsx`, `SiteDetailTabs.tsx`

Spec §5.1–5.3. İçerik alanı `margin-left:260px`. Hero içinde **5 KPI hücresi**
(Fiziksel İlerleme · Aktif İşçi · Toplam Hakediş · Kalan Gün · Bölüm Sayısı).

**Bölüm Sayısı gerçek değerdir** (`section_count` + "3 aktif · 2 bekliyor" kırılımı),
diğer dördü yer tutucu. Bu ayrımı karıştırma.

Sekme barı: Bölümler · Puantaj · Stok · Hakedişler · Günlük Kayıt · Belgeler —
yalnız *Bölümler* yazılır.

---

## Task 9 — `SectionCard` ve bölüm listesi

**Dosya:** `src/components/site-detail/SectionCard.tsx` + test

Spec §5.4. **Dikey liste, ızgara değil** (`flex-direction:column; gap:12px`).

- Durum etiketleri mockup'tan birebir: `Tamamlandı` · `Aktif — Devam Ediyor` · `Planlandı`
- Eylem duruma göre: `planned` → `Düzenle`, diğerleri → `Detay →`
- 4 metrik: İlerleme · İş Kalemleri · Bölüm Bedeli · İşçi — **dördü de yer tutucu**
- **"3 gecikme riski" BASILMAZ** (§7.2) — backend bu alanı hiç döndürmüyor.
  Mockup'ta görünmesi sapma değil, spec'te kayıtlı.
- Kalan ölçüler mockup satır 153+ bloğundan okunur

Boş durum (§7.4): "Bu şantiyede henüz bölüm tanımlanmadı." + `+ Bölüm Ekle`.
**Hata gibi gösterme** — bölümsüz şantiye geçerli bir durum (Karar 4).

---

## Task 10 — `SectionFormModal`

`Field` + primitive'lerle. Alanlar: ad, kod (opsiyonel), durum (varsayılan `Planlandı`),
sorumlu, başlangıç/bitiş, sıra.

---

## Task 11 — Mockup karşılaştırma kapısı

Her iki ekran için `scripts/render-mockup.mjs` ile 1440px render + uygulamayla yan yana:

- `projedesign/Proje Detay - Şantiyeler.dc.html`
- `projedesign/Şantiye Detay.dc.html`

**`Ekran 6 - Şantiye Detay.dc.html` KULLANILMAZ** — eski, kanon değil (backend spec §1.1).

Sapmalar ölçüyle raporlanır. Onaylı istisnalar (yer tutucu `—`, gecikme riski
basılmaması, şantiye şefinin serbest metin olması) sapma sayılmaz.

---

## Task 12 — Görsel testler ve kod incelemesi

`e2e/visual.spec.ts`'e iki yeni ekran eklenir; **baseline üretilmez** — Linux CI'ın işi.

`react-reviewer` + `typescript-reviewer`. CRITICAL/HIGH düzeltilir.
Erişilebilirlik: sidebar `<nav aria-label>`, sekme barı `role="tablist"`, kart eylemleri
klavyeyle erişilebilir.

---

## Sıralama

1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12.

Task 2–3 (drill sidebar) Task 4'ten önce bitmeli — iki rota da onu kullanıyor.
Task 5–7 ve Task 9–10 birbirinden bağımsız ama aynı repoda **aynı anda iki ajan
çalıştırılmaz**.
