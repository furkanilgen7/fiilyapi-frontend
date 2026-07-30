# Ekran 13 · İş Kalemleri (BOQ) — uygulama planı

Tarih: 2026-07-30
Bağlı spec: `frontend/docs/superpowers/specs/2026-07-30-ekran-13-is-kalemleri-boq-design.md` (**revizyon 2, onaylı**)
Kapsam: **tek repo** — `frontend/` (Task F1–F12 teslim, F13 bloklu)
Yürütme: `superpowers:subagent-driven-development` — task-by-task, her task bağımsız review'lı
Mockup kanonu: `projedesign/Ekran 13 - İş Kalemleri.dc.html` (içerik alanı satır 61–182)
GOREV-SIRASI referansı: §1 (task iskeleti), §3 (sabit kurallar), §4 (kalıcı kararlar)

---

## ⚠️ Başlamadan önce — tuzaklar (hepsi zorunlu okuma)

Bu bölüm plan boyunca **tekrar edilmez**; her task'ın ajanı buradan sorumludur.

### T1 — macOS'ta Playwright KOŞULMAZ, `.png` baseline ÜRETİLMEZ

GOREV-SIRASI §3. Görsel testin **kodu** yazılır (`e2e/*.spec.ts`), **anlık görüntüsü**
yazılmaz. macOS'ta üretilen PNG **asla commit edilmez** — font/hinting farkı yüzünden
Linux CI'da anında kırmızı olur.

Teslim akışı (tek yol):

```
visual-baselines.yml → workflow_dispatch (ilgili dalda)
  → koşum bitince artifact İNDİR (workflow commit ATMAZ)
  → arşivi `e2e/` altına aç
  → tek commit ile işle
```

### T2 — Üç baseline TEK turda alınır

Spec §11.2. Bu dilim üç anlık görüntüyü birden kaydırıyor:

| # | Baseline dosyası | Neden kayıyor |
|---|---|---|
| 1 | `e2e/boq-visual.spec.ts-snapshots/is-kalemleri-chromium-linux.png` | **yeni** ekran |
| 2 | `e2e/site-detail-visual.spec.ts-snapshots/santiye-detay-chromium-linux.png` | sekme barına 7. sekme eklendi (spec §2.2, onaylı sapma B) |
| 3 | `e2e/settings-visual.spec.ts-snapshots/ayarlar-izin-matrisi-*.png` | X2/X2b — mock 17 modüle çıktı, `boq × procurement` = `view/limited` |

**Ayrı turlar açılmaz.** Tek `workflow_dispatch` koşusunun artifact'i açılır, tek commit
ile işlenir. (X3 — mock'a `field_engineer` + `hr_manager` rollerinin eklenmesi — bu tura
sığdırılabilirse sığdırılır; sığmazsa matris baseline'ı dördüncü kez kayar ve ayrı iş kalır.)

### T3 — BFF kökü tuzağı (GOREV-SIRASI §3)

Yeni backend kökü `src/app/api/backend/[...path]/route.ts` `ALLOWED_ROOTS`'a eklenmezse
modül **yalnız canlıda 404** verir; jsdom testleri görmez.

Bu dilimde **yeni kök gerekmiyor** — `sites` ve `boq` köklerinin ikisi de listede
(`route.ts:8–28` doğrulandı). Yine de **F3'ün kapısı** olarak grep ile doğrulanır ve
dinamik allow-list testinin yeni hook'lardan sonra da yeşil olduğu görülür.

### T4 — BFF ikili düzeltmesi kırılgan (spec §8.1)

F9'da `route.ts`'in GET dalı yeniden yazılıyor. İki kural pazarlığa kapalı:

1. **`status >= 400` HER ZAMAN JSON dalına gider** — `Content-Type` ne olursa olsun.
   Aksi halde backend'in 403/409/422 **Türkçe hata gövdeleri** ikili sayılıp kaybolur.
2. `.xlsx` suffix kuralı **silinmez**, yalnız `Content-Type` yokken devreye giren
   **yedek** kurala düşürülür.

Spec §8.1'deki **altı satırlık regresyon tablosunun tamamı** F9'un kabul kriteridir;
biri bile eksikse task bitmemiştir.

### T5 — Primitive ve token yasakları

- Ham `<select>` / `<input>` / `<label>` **YASAK** → `src/components/ui/`
  (`Field`, `Input`, `Select`, `Button`, `Textarea`, `Checkbox` mevcut).
  Ham `<table>` yasak **değildir** (spec §3.6; `settings-table` da ekran sınıfıdır).
- Çıplak hex / çıplak px **YASAK** → `src/styles/tokens.css`. Yeni token listesi
  spec §3.5'te 13 satır olarak hazır; oradaki değerlerin dışına çıkılmaz.
- `as any` / `@ts-ignore` ile typecheck susturmak **YASAK**.
- Mevcut token varsa **yeniden tanımlanmaz** — önce `tokens.css` içinde aranır
  (spec §3.5'in ikinci listesi zaten eşlemeyi veriyor).

### T6 — F13 BLOKLU, bu dilim onu BEKLEMEZ

Backend `DELETE /boq/items/{item_id}` **yoktur** (spec §7.5, takip işi **BE-B**).
F13'ün hiçbir satırı bu dilimde yazılmaz — `useDeleteBoqItem`, `Sil` butonu, onay
adımı, silme metinleri (§9.2 metin envanteri 25–29) **ölü kod olur**. F13 ayrı ve
küçük bir PR'dır; BE-B canlıya çıktıktan sonra açılır.

### T7 — BE-A gelene kadar "bilinmezlik kuralı" geçerli

`MeResponse`'ta izin alanı yok (spec §2.5.1, backend `schemas.py:23–29` ile doğrulandı).
F12 bunu **bloklamaz**: `level === undefined` → **butonlar görünür** (bugünkü davranış).
Gizleme yalnız seviye **bilinip** yazma seviyesinin altında kaldığında yapılır.
BE-A canlıya çıktığı an gizleme kendiliğinden devreye girer, ikinci frontend sürümü gerekmez.

### T8 — Onaylı sapma listesi kapalıdır

Spec §13'teki üç sapma (A: 4px ofset, B: 7. sekme, C: sözleşmesiz breadcrumb) ve
§13.1'deki yedi ek yüzey **onaylıdır, geri alınmaz**. Ama **bu listeye dayanarak
başka sapma meşrulaştırılamaz** — F10 kapısı listede olmayan her sapmayı reddeder.

### T9 — Ajanlar push etmez

Commit serbest. Push / PR / merge / deploy kararı **kullanıcıdadır** (GOREV-SIRASI §3).

### T10 — Dal ve ön koşul

Bu dilim **PR #5 (`chore/p4-boq-frontend-sync`) merge edildikten sonra** başlar:
üretilmiş BOQ tipleri, `boq` kökü ve 17 modüllük e2e mock oradan gelir.

```
git checkout main && git pull && git checkout -b feat/p4-boq-frontend
```

---

## Kurallar (her task için, istisnasız)

- **TDD:** önce test yaz, **KIRMIZI GÖR** (testin doğru sebepten kırmızı olduğunu
  çıktıda doğrula), sonra implementasyon, sonra yeşil. Test yazmadan kod yok.
- **Mockup birebir:** her ölçü spec §3'teki tablodan, **mockup satır numarasıyla**
  gerekçeli. Göz kararı ölçü icat etmek yasak.
- **Metin envanteri kapalı:** ekranda görünen ve spec §9.2'de **olmayan** hiçbir yeni
  dize yazılamaz. Yeni metin gerekiyorsa önce spec'e eklenir (kullanıcı onayı).
- **Kapı komutu (her task sonunda, dördü de yeşil olacak):**

  ```
  pnpm lint && pnpm typecheck && pnpm test && pnpm build
  ```

- **Aynı repoda aynı anda iki ajan çalışmaz.** Task'lar sırayla koşar.

---

# TASK'LAR

## Task F1 — Tip doğrulama kapısı (no-op olması beklenir)

**Boyut:** S · **Bağımlı:** X2 (PR #5 merge) · **Spec:** §6.2, §14 F1

**Ne yapılacak:** üretilmiş tiplerin varlığını **kapı olarak** doğrula. Spec dal notu
(satır 19–23) bunların `src/lib/api/schema.d.ts` satır 695–825'te olduğunu söylüyor;
bu task o iddiayı doğrular.

**Önce test — KIRMIZI GÖR:**

`src/lib/api/schema.test.ts` (mevcut dosya, genişletilir):

- `"BoqListResponse, BoqTotals, BoqGroupResponse, BoqItemResponse tipleri üretilmiş"`
- `"BoqGroupCreate/Update ve BoqItemCreate/Update tipleri üretilmiş"`
- `"AccessLevel tipi üretilmiş"` (F12 buna dayanacak)

Tip-düzeyi kontrol `satisfies` / atama ile yapılır; `as any` yok. Tipler eksikse
`pnpm typecheck` kırmızı olur — **KIRMIZI GÖR adımı budur**.

**Dosyalar:** `src/lib/api/schema.test.ts`

**Kabul kriteri:** dört kapı yeşil; sekiz BOQ tipi + `AccessLevel` şemada mevcut.
Eksik çıkarsa **task durur**, `backend/openapi.json` yeniden kopyalanıp `pnpm gen:api`
koşulur (el ile tip yazmak yasak).

---

## Task F2 — Token'lar + sayı biçimlendirme yardımcıları

**Boyut:** M · **Bağımlı:** F1 · **Spec:** §3.4, §3.5, §3.6

**Ne yapılacak:**

1. Spec §3.5'teki **13 yeni token** `src/styles/tokens.css`'e eklenir (mockup satır
   numaralı yorumlarıyla birlikte). Spec §3.5'in ikinci listesindeki değerler
   **yeniden tanımlanmaz** — mevcut token'lara eşlenir.
2. `src/lib/format.ts`'e üç fonksiyon: `formatDecimal(value, maxFractionDigits)`,
   `formatQuantity` (3 hane), `formatAmount` (2 hane). **`₺` basmaz** — mevcut
   `formatCurrency` `₺` bastığı için bu ekranda kullanılamaz (spec §3.4).
3. **Yeni `ui/` primitive'i AÇILMAZ** (spec §3.6).

**Önce testler — KIRMIZI GÖR:**

`src/lib/format.test.ts` (mevcut, genişletilir):
- `"formatQuantity sondaki sıfırları atar: 1240.000 → 1.240"`
- `"formatQuantity ondalığı korur: 1240.500 → 1.240,5"`
- `"formatAmount iki ondalığa kadar: 280.00 → 280"`
- `"formatAmount büyük tutarı binlik ayraçla basar: 12399900.00 → 12.399.900"`
- `"formatQuantity ve formatAmount ₺ sembolü basmaz"`
- `"formatDecimal sayı ve string girdiyi aynı biçimler"`

`src/styles/tokens.test.ts` (mevcut, genişletilir):
- `"BOQ token'ları tanımlı"` — 13 token adının hepsi ve mockup değerleri.

**Dosyalar:** `src/styles/tokens.css`, `src/styles/tokens.test.ts`,
`src/lib/format.ts`, `src/lib/format.test.ts`

**Tuzaklar:**
- `formatQuantity("1240.000")` → `"1.240"`; `maximumFractionDigits` `Intl`'de zaten
  sondaki sıfırları atar, ama **string Decimal girdisi** `Number()`'a çevrilmelidir.
- Frontend'de **hiçbir aritmetik yapılmaz** (spec §3.4 sonu): `amount`, `group_total`,
  `grand_total` backend'den hazır gelir. Tek istisna modal önizlemesidir (F8, §7.1.3).

**Kabul kriteri:** dört kapı yeşil; 13 token `tokens.css`'te; üç format fonksiyonu
testli; hiçbir yerde çıplak hex/px yok.

---

## Task F3 — API hook'ları (`useBoq` + `useBoqMutations`) + BFF kök doğrulaması

**Boyut:** M · **Bağımlı:** F1 · **Spec:** §6.1, §6.2, §6.3, §6.4

**Ne yapılacak:** `useSites.ts` / `useSectionMutations.ts` desenleri **birebir**.

```ts
// src/lib/api/hooks/useBoq.ts
export const BOQ_QUERY_KEY = "boq";
export function useBoq(siteId: string): UseQueryResult<BoqListResponse, Error>;
//   enabled: siteId.length > 0 ; queryKey: [BOQ_QUERY_KEY, siteId]
```

```ts
// src/lib/api/hooks/useBoqMutations.ts
export function useCreateBoqGroup(siteId: string): UseMutationResult<BoqGroup, Error, BoqGroupCreate>;
export function useCreateBoqItem(siteId: string):  UseMutationResult<BoqItem,  Error, BoqItemCreate>;
export function useUpdateBoqItem(siteId: string):
  UseMutationResult<BoqItem, Error, { itemId: string; body: BoqItemUpdate }>;
```

Üçü de `onSuccess` → `invalidateQueries({ queryKey: [BOQ_QUERY_KEY, siteId] })`.

**Önce testler — KIRMIZI GÖR:**

`src/lib/api/hooks/useBoq.test.tsx`:
- `"siteId boşken ağa çıkmaz"` (enabled kapısı)
- `"sorgu anahtarı ['boq', siteId]"`
- `"BoqListResponse gövdesini unwrap ile döndürür"`

`src/lib/api/hooks/useBoqMutations.test.tsx`:
- `"useCreateBoqGroup başarıda ['boq', siteId] anahtarını geçersiz kılar"`
- `"useCreateBoqItem başarıda ['boq', siteId] anahtarını geçersiz kılar"`
- `"useUpdateBoqItem başarıda ['boq', siteId] anahtarını geçersiz kılar"`
- `"useUpdateBoqItem uç yolunda siteId kullanmaz (/boq/items/{item_id})"`

**Dosyalar:** `src/lib/api/hooks/useBoq.ts` + test,
`src/lib/api/hooks/useBoqMutations.ts` + test

**Tuzaklar:**
- **Optimistik güncelleme YOK** (spec §6.3): `amount`/`grand_total` sunucu türevidir,
  iyimser yazmak yanlış toplam gösterir.
- `useUpdateBoqItem` `siteId`'yi **yalnız invalidate anahtarı için** alır.
- `useDeleteBoqItem` ve grup PATCH hook'u **YAZILMAZ** (spec §7.4, §7.5 — ölü kod).
- **BFF kapısı:** `ALLOWED_ROOTS` içinde `sites` ve `boq` köklerinin bulunduğu grep ile
  doğrulanır; dinamik allow-list testinin yeni hook'lardan sonra da yeşil olduğu görülür.
  (Bu bir doğrulama adımıdır, `route.ts` bu task'ta **değiştirilmez**.)
- Tipler `components["schemas"][...]` takma adlarıyla gelir; el ile arayüz yazılmaz.

**Kabul kriteri:** dört kapı yeşil; iki hook dosyası testli; allow-list testi yeşil;
`route.ts` diff'te **yok**.

---

## Task F4 — Rota kabuğu, breadcrumb, başlık, iki eylem butonu + navigasyon girişleri 🔶 RİSKLİ

**Boyut:** M · **Bağımlı:** F2 · **Spec:** §2.1, §2.2, §2.3, §3.1, §9, §13 (sapma B, C)

**Ne yapılacak:**

1. Rota: `src/app/(app)/projeler/[projectId]/santiyeler/[siteId]/is-kalemleri/page.tsx`
   (client bileşen; DrillSidebar `[projectId]/layout.tsx`'ten otomatik gelir, kendi
   layout'u **kurulmaz**).
2. Breadcrumb (mockup 62, **onaylı sapma C**): `← {şantiye adı}` linki
   `/projeler/{projectId}/santiyeler/{siteId}`'e; yanında `{proje adı} / {şantiye adı}`.
   `SZL-2025-001` **basılmaz**. Kaynak: `useSite(siteId)`.
3. Başlık şeridi (63–67): `<h1>İş Kalemleri (BOQ)</h1>` + `Excel İndir`
   (`Button variant="secondary"`) + `+ İş Kalemi` (`Button variant="primary"`).
   Bu task'ta **iki buton da tıklanınca hiçbir şey yapmaz** — davranış F8/F9'da bağlanır.
4. Durum dalları (spec §9): `Yükleniyor…` / `<AccessDenied />` (403) /
   `İş kalemleri yüklenemedi` (diğer). Şantiye Detay `page.tsx` deseni birebir.
5. **Onaylı sapma B — iki navigasyon girişi:**
   - `src/components/site-detail/SiteDetailTabs.tsx`: `TABS` dizisine
     `{ label: "İş Kalemleri", slug: "is-kalemleri" }` — **Bölümler'den hemen sonra**,
     7. sekme.
   - `src/components/shell/drill/project-nav-config.ts`: `activeSiteGroup` içine
     `{ label: "İş Kalemleri", href: \`${base}/is-kalemleri\`, emoji: "📐" }` —
     Bölümler'den sonra.
6. `src/components/boq/boq.css` — `.boq`, `.boq__crumb`, `.boq__title-bar`,
   `.boq-action`, `.boq-action--primary`, `.boq__message`. Ölçüler spec §3.1'den.

**Önce testler — KIRMIZI GÖR:**

`src/app/(app)/projeler/[projectId]/santiyeler/[siteId]/is-kalemleri/page.test.tsx`:
- `"yükleniyorken Yükleniyor… basar"`
- `"403 alındığında AccessDenied basar"`
- `"diğer hatada İş kalemleri yüklenemedi basar"`
- `"başlık İş Kalemleri (BOQ) olarak tek h1 ile basılır"`
- `"breadcrumb şantiyeye geri link verir ve proje/şantiye adını gösterir"`
- `"breadcrumb sözleşme numarası basmaz"` (sapma C kapısı)

`src/components/site-detail/SiteDetailTabs.test.tsx` (mevcut, genişletilir):
- `"İş Kalemleri sekmesi Bölümler'den sonra 7. sırada"`
- `"İş Kalemleri sekmesi /is-kalemleri rotasına gider ve 'yakında' başlığı taşımaz"`

`src/components/shell/drill/project-nav-config.test.ts` (mevcut, genişletilir):
- `"aktif şantiye grubunda İş Kalemleri öğesi var ve sekme barıyla aynı sırada"`

**Dosyalar:** yeni `…/is-kalemleri/page.tsx` + `page.test.tsx`,
`src/components/boq/boq.css`, `src/components/site-detail/SiteDetailTabs.tsx` + test,
`src/components/shell/drill/project-nav-config.ts` + test

**Tuzaklar:**
- 🔶 **Sekme eklemek `santiye-detay` baseline'ını kesin kaydırır** (T2). Bu kaçınılmaz
  ve onaylıdır; F11'in baseline turunda yenilenir. Sekmeyi "baseline kaymasın diye"
  eklememek **yasaktır**.
- İçerik ofseti `.drill-content`'ten gelir; **28px'e çekilmez** (onaylı sapma A).
- Sekme/nav öğesi **herkese görünür** kalır; izni olmayan tıklarsa backend 403 → AccessDenied.
- Sayfada **tek `<h1>`**; ileride eklenecek başlıklar `<h2>`.
- `useSite(siteId)` zaten var; **ikinci bir şantiye sorgusu açılmaz**.

**Kabul kriteri:** dört kapı yeşil; rota render oluyor; dört durum dalı testli; iki
navigasyon girişi eklendi ve testli; mockup 61–67 ölçüleri token'lardan geliyor.

---

## Task F5 — Dört özet kartı (dördü de yer tutucu)

**Boyut:** S · **Bağımlı:** F4 · **Spec:** §3.2, §4, §10

**Ne yapılacak:** `BoqTotalsStrip` — mockup 72–89 ölçüleriyle 4'lü ızgara.
Dört kartın **dördü de** `MetricPlaceholder`: değer yerine `—`,
`title={pendingModuleLabel(totals.X.pending_module)}` + `<span class="sr-only">` aynı metin.
Etiketler birebir: `Toplam Sözleşme` · `Gerçekleşen` · `Kalan İş` · `Revize / Ek İş`.

**Önce testler — KIRMIZI GÖR:**

`src/components/boq/BoqTotalsStrip.test.tsx`:
- `"dört kart da — basar"`
- `"kart etiketleri mockup metinleriyle birebir"`
- `"pendingModuleLabel metni yükten okunur, koda gömülü değildir"`
  (yükte `pending_module: "contracts"` → "Sözleşme modülüyle birlikte gelir";
   uydurma bir anahtar → fallback metin)
- `"yer tutucu değer sr-only metinle de erişilebilir (title tek başına yeterli değil)"`
- `"grand_total kart olarak basılmaz"`

**Dosyalar:** `src/components/boq/BoqTotalsStrip.tsx` + test, `src/components/boq/boq.css`

**Tuzaklar:**
- **`ui/card/Card` KULLANILMAZ** (spec §3.2): Card `radius-14` + `shadow-card` +
  24px gövde taşır; mockup 12px/gölgesiz/16px ister. `.boq-kpi` ekran sınıfı yazılır
  (`SiteTotalsStrip` deseni).
- Renk sınıfları (mavi/amber/mor — mockup 79/83/87) CSS'te **tanımlı kalır** ama
  yer tutucu hâlde `.boq-kpi__value--pending` ile soluk (`--color-text-subtle`) basılır.
  Veri geldiğinde tek sınıf değişimiyle mockup'a dönülür.
- `src/lib/pending-modules.ts` **değişmez** — `contracts` ve `progress_payments`
  anahtarları zaten var.
- Kart şeridi yükleme/hata/boş durumlarında da basılır (spec §9 sonu).

**Kabul kriteri:** dört kapı yeşil; dört kart `—` basıyor; ipucu metni yükten okunuyor;
`formatCompactCurrency` bu ekranda **hiç çağrılmıyor**.

---

## Task F6 — Poz tablosu (7 sütun + grup başlıkları + `Gerç. %` yer tutucu)

**Boyut:** M · **Bağımlı:** F4 · **Spec:** §3.3, §5.1–5.4, §10

**Ne yapılacak:** `BoqTable` — ham `<table class="boq-table">`:

- `<caption class="sr-only">İş kalemleri listesi</caption>`
- `<thead>`: 7 × `<th scope="col">` (mockup 96–102, genişlikler dahil)
- `<tbody>`: grup başlığı `<tr><th colSpan={7} scope="colgroup">` (107–108) +
  poz satırları (110–171)
- Grup numarası **`${dizinIndex + 1}. ${group.name}`** — `sort_order` ham değeri **değil**
- Büyük harf **CSS ile** (`text-transform: uppercase`), JS `toLocaleUpperCase` **yok**
- Son `<tbody>` satırında alt çizgi yok (mockup 163)
- `Gerç. %` hücresi: ortalı `—` + `title` + `sr-only`; **nötr** (`--color-text-subtle`)
- Boş durum: `groups: []` → tablo başlığı korunur, `<tbody>` yerine tam genişlikte tek
  satır `Bu şantiyede henüz iş kalemi tanımlanmadı.` + `+ İş Kalemi` butonu

**Önce testler — KIRMIZI GÖR:**

`src/components/boq/BoqTable.test.tsx`:
- `"grup numaraları 1. 2. 3. olarak dizinden türetilir (sort_order 10/20/30 iken bile)"`
- `"grup ve kalem sırası yüklerden geldiği gibi korunur, yeniden sıralanmaz"`
- `"tutar backend'den basılır, miktar × fiyat olarak yeniden hesaplanmaz"`
- `"son poz satırında alt çizgi sınıfı yok"`
- `"Gerç. % hücreleri — basar ve sr-only bekleme metnini taşır"`
- `"Gerç. % sütun başlığı kaybolmaz"`
- `"grup başlığı th scope=colgroup olarak basılır"`
- `"kalemi olmayan grup için başlık basılır, uydurma boş satır eklenmez"`
- `"groups boşken boş durum metni ve + İş Kalemi butonu basılır, thead korunur"`
- `"grup alt-toplam satırı basılmaz"` (mockup'ta yok)

**Dosyalar:** `src/components/boq/BoqTable.tsx` + test, `src/components/boq/boq.css`,
`…/is-kalemleri/page.tsx` (tabloyu bağlar)

**Tuzaklar:**
- **`Gerç. %` renk eşiği KODLANMAZ** (spec §5.4, karar 9 — P7'ye bırakıldı).
  `.boq-table__pct--success/--warning/--danger` gibi **ölü sınıflar yazılmaz**.
- **Tabloya 8. sütun / eylem sütunu / kebap menüsü EKLENMEZ** (karar 4).
- Satır tıklanabilirliği bu task'ta **yok** — F8'de, `canWrite` kapısının arkasında gelir.
- `group_total` backend'de var ama **basılmaz** (mockup'ta grup alt-toplamı yok).

**Kabul kriteri:** dört kapı yeşil; 7 sütun mockup ölçüleriyle; grup numaralandırma
dizin tabanlı; yer tutucu sütunu görünür ve dürüst; boş durum testli.

---

## Task F7 — GENEL TOPLAM satırı (`<tfoot>`)

**Boyut:** S · **Bağımlı:** F6 · **Spec:** §3.3 (174–178), §5.5, §10

**Ne yapılacak:** `<tfoot><tr>`: `<th colSpan={5} scope="row">GENEL TOPLAM</th>` +
`formatAmount(totals.grand_total)` (**gerçek veri**) + `totals.grand_progress_pct`
(**yer tutucu** → `—` + title + sr-only). Ölçüler mockup 174–177.

**Önce testler — KIRMIZI GÖR:**

`src/components/boq/BoqTable.test.tsx` (genişletilir):
- `"GENEL TOPLAM tutarı grand_total'dan formatAmount ile basılır"`
- `"ilk hücre colSpan=5 ve scope=row"`
- `"yüzde hücresi — basar ve hakediş bekleme metnini taşır"`
- `"boş BOQ'da tfoot yine basılır ve 0 gösterir"` (backend `grand_total: "0.00"`)

**Dosyalar:** `src/components/boq/BoqTable.tsx` + test, `src/components/boq/boq.css`

**Tuzaklar:**
- Yüzde hücresi mockup'ta **rozet değil düz metin** (177).
- `--color-info-tint` (#f0f9ff) ve `--border-width-total` (2px) F2'de eklendi;
  burada çıplak değer yazılmaz.
- Toplam frontend'de **hesaplanmaz** — backend'den gelir.

**Kabul kriteri:** dört kapı yeşil; tfoot mockup ölçüleriyle; boş BOQ'da `0` basıyor.

---

## Task F12 — İstemci izin altyapısı (`permissions.ts` + `useModulePermission`) ⚠️ F8'DEN ÖNCE

**Boyut:** M · **Bağımlı:** F1 · **Spec:** §2.5, §2.5.1–2.5.4, §12 karar 8

> **Sıra uyarısı:** F12 **F8'den ÖNCE** bitmelidir — F8 tüm yazma yüzeylerini
> `canWrite` kapısının arkasına koyar. Numarası büyük olduğu için sona bırakılmaz.

**Ne yapılacak:** iki **ekran-bağımsız** dosya:

```ts
// src/lib/auth/permissions.ts
export type AccessLevel = components["schemas"]["AccessLevel"];
export const WRITE_LEVELS: readonly AccessLevel[];   // draft, request, approve, full, admin
export function canWrite(level: AccessLevel | undefined): boolean;  // undefined → true
```

```ts
// src/lib/auth/useModulePermission.ts   ("use client")
export interface ModulePermission { level: AccessLevel | undefined; canView: boolean; canWrite: boolean }
export function useModulePermission(moduleKey: string): ModulePermission;
```

Kaynak `useSession()` — **yeni fetch yok, yeni context yok**. `me?.permissions?.[moduleKey]`
okunur; alan yoksa `undefined`. Ardından BOQ yazma yüzeyleri kapıya bağlanır:
`+ İş Kalemi` butonu, satır tetikleyicisi, (F13 geldiğinde) `Sil`. **`Excel İndir`
her zaman görünür** (okuma ucu).

**Önce testler — KIRMIZI GÖR:**

`src/lib/auth/permissions.test.ts`:
- `"WRITE_LEVELS backend AccessLevel sıralamasıyla birebir (none/view yazma değildir)"`
- `"canWrite(undefined) true döner — bilinmezlik yasak sayılmaz"`
- `"canWrite('view') false, canWrite('full') true"`

`src/lib/auth/useModulePermission.test.tsx`:
- `"permissions alanı yokken canWrite true (bilinmezlik kuralı)"`
- `"boq: 'view' iken canWrite false, canView true"`
- `"boq: 'full' iken canWrite true"`
- `"hook hiçbir ağ isteği atmaz"` (fetch spy çağrılmadı)
- `"moduleKey parametre olarak alınır; koda gömülü modül listesi yoktur"`

`…/is-kalemleri/page.test.tsx` (genişletilir):
- `"canWrite false iken + İş Kalemi butonu DOM'da yok"`
- `"canWrite false iken Excel İndir butonu görünür kalır"`

**Dosyalar:** `src/lib/auth/permissions.ts` + test,
`src/lib/auth/useModulePermission.ts` + test, `…/is-kalemleri/page.tsx` + test

**Tuzaklar:**
- ⚠️ **Bilinmezlik kuralı ters çevrilemez** (T7): `undefined` → görünür. Aksi hâlde
  tam yetkili kullanıcı ekranı salt-okunur görür — sessiz yetenek kaybı.
- **İstemcide sabit rol→seviye haritası YASAK** (spec §2.5.1): matris Ayarlar'dan
  çalışma anında değiştirilebiliyor; sabit harita ilk düzenlemede yalan söyler.
- `GET /roles/{id}/permissions` **kullanılamaz** — `user_management:view` istiyor,
  `procurement` kendi izinlerini okuyamaz (403).
- Bu iki dosya **BOQ'ya özel hiçbir şey içermez**; sonraki dilimler `moduleKey`
  değiştirerek kullanır. Ekran başına izin yardımcısı yazmak yasaktır.
- **Güvenlik sınırı değişmedi:** yetki zorlaması her zaman backend'dedir; bu kapı
  yalnız görsel gürültüyü azaltır.

**Kabul kriteri:** dört kapı yeşil; hook ağ isteği atmıyor; bilinmezlik kuralı testli;
BOQ yazma yüzeyleri kapıya bağlı; `permissions.ts` içinde modül adı sabiti yok.

---

## Task F8 — `BoqItemFormModal` (create + edit) + satır tıklaması + `+ Yeni Grup` 🔶 RİSKLİ

**Boyut:** L · **Bağımlı:** F3, F6, **F12** · **Spec:** §7.1–7.4, §9.2, §10

**Ne yapılacak:** tek bileşen, iki kip (`settings/Modal` + `ui/Field/Input/Select`,
SectionFormModal kanonu birebir).

| Kip | Açan | Başlık | Birincil |
|---|---|---|---|
| `create` | `+ İş Kalemi` (mockup 67) veya boş durum eylemi | `Yeni İş Kalemi` | `Kaydet` |
| `edit` | **poz satırına tıklama** | `İş Kalemi Düzenle` | `Kaydet` |

Alanlar (§7.1.1): `Grup` (Select) · `Poz No` · `İş Kalemi Tarifi` · `Birim` ·
`Miktar` · `Birim Fiyat`. Etiketler tablo sütun başlıklarından birebir.

Ek yüzeyler:
- **`Tutar (hesaplanan)`** önizlemesi — düz `<p class="boq-modal__preview">`,
  `Field`/`Input` **değil**, hiçbir isteğe girmez; girdiler geçersizse `—`.
- **`+ Yeni Grup`** — Grup açılırının son seçeneği; seçilince `Grup Adı` alanı belirir.
  Kaydet: önce `POST …/boq/groups`, dönen `id` ile `POST …/boq/items`.
- **Satır tetikleyicisi:** Poz No hücresi içeriği
  `<button type="button" class="boq-table__row-trigger">` ile sarılır;
  `aria-label="{code} — {description} kalemini düzenle"`. Satırda
  `cursor:pointer` + `:hover { background: var(--color-surface-2) }`.

**Önce testler — KIRMIZI GÖR:**

`src/components/boq/BoqItemFormModal.test.tsx`:

*create kipi:*
- `"altı doğrulama mesajı birebir metniyle basılır"` (§7.1.4'ün altı satırı)
- `"Kaydet doğrulama geçmeden istek atmaz"`
- `"ilk hatalı alan odaklanır"`
- `"sort_order seçili grubun max sort_order + 1 olarak gönderilir"`
- `"409 → 'Bu poz numarası bu şantiyede zaten kullanılıyor.' basılır"`
- `"+ Yeni Grup seçilince Grup Adı alanı belirir ve boşsa 'Grup adı zorunludur.' der"`
- `"+ Yeni Grup ile kaydetme önce grubu, sonra kalemi POST eder"`
- `"ikinci istek hata verirse 'Grup oluşturuldu, kalem eklenemedi: …' basılır (sessiz yutma yok)"`

*edit kipi:*
- `"alanlar mode.item'dan dolu açılır"`
- `"quantity/unit_price string olarak doldurulur, Number'a çevrilip geri yazılmaz"`
- `"PATCH gövdesi yalnız değişen alanı taşır"`
- `"hiçbir alan değişmediyse istek atılmaz, modal kapanır"`
- `"sort_order edit kipinde hiç gönderilmez"`
- `"group_id değişimi kalemi başka gruba taşır"`

*önizleme:*
- `"Tutar (hesaplanan) miktar × birim fiyattan hesaplanır"`
- `"önizleme değeri istek gövdesine girmez"`
- `"girdilerden biri boşken önizleme — basar (0 basmaz)"`

`src/components/boq/BoqTable.test.tsx` (genişletilir):
- `"canWrite true iken Poz No hücresi düzenleme butonu içerir ve aria-label taşır"`
- `"canWrite false iken satır tetikleyici buton yok, Poz No düz span"`
- `"tabloya 8. sütun eklenmez"`

**Dosyalar:** `src/components/boq/BoqItemFormModal.tsx` + test,
`src/components/boq/BoqTable.tsx` + test, `src/components/boq/boq.css`,
`…/is-kalemleri/page.tsx` + test

**Tuzaklar:**
- 🔶 **Modal + satır tıklaması bu dilimin en riskli yüzeyi** — mockup'ta karşılığı yok,
  tamamı kullanıcı kararı (spec §13.1). Spec §7'nin dışına **tek satır** çıkılmaz.
- **`<tr tabIndex={0} role="button">` KULLANILMAZ** (satır semantiğini bozar) —
  tetikleyici Poz No hücresindeki gerçek `<button>`'dır.
- `canWrite === false` → satır tıklaması **bağlanmaz**, hover/cursor eklenmez,
  Poz No düz `<span>` olur. "Görünüp çalışmayan" odaklanabilir öğe bırakılmaz.
- **Grup PATCH hook'u yazılmaz** (spec §7.4).
- **Silme yok** (T6) — `Sil` butonu, onay adımı, silme metinleri bu task'a sızmaz.
- SectionFormModal'daki görünür "Sıra" alanı **kopyalanmaz** — mockup'ta karşılığı yok.
- Yeni piksel eklenmez: hover dışında tablo ölçüsü/sütunu/dolgusu değişmez, böylece
  görsel baseline sapmaz.

**Kabul kriteri:** dört kapı yeşil; iki kip de testli; `+ Yeni Grup` iki adımlı yazması
ve kısmi hata bildirimi testli; önizleme isteğe girmiyor; izin kapısı bağlı;
tablo hâlâ 7 sütun.

---

## Task F9 — "Excel İndir" + BFF `Content-Type` düzeltmesi 🔴 EN RİSKLİ

**Boyut:** L · **Bağımlı:** F3, F4 · **Spec:** §8.1, §8.2, §8.3

**Ne yapılacak — üç parça:**

**(a) `src/lib/auth/backend.ts`:** `proxyAuthenticatedBinary` → **`proxyAuthenticatedRaw`**
olarak genelleştirilir. Gövde **her durumda** `ArrayBuffer` okunur (bugünkü `binaryResult`
`!res.ok` iken gövdeyi düşürüyor → 403/409/422 Türkçe hata gövdeleri kaybolurdu).
401 → `/auth/refresh` → tek retry davranışı **korunur**. Eski `proxyAuthenticatedBinary`
**silinir** (tek çağıranı `route.ts`).

**(b) `src/app/api/backend/[...path]/route.ts`:** GET istekleri `proxyAuthenticatedRaw`'dan
geçer; ikili/JSON kararı **yanıt geldikten sonra** verilir:

```ts
const TEXTUAL_CONTENT_TYPES = [/^application\/json/i, /^application\/problem\+json/i, /^text\//i];
const BINARY_DOWNLOAD_SUFFIXES = [".xlsx"];   // yedek kural

function isBinaryResponse(contentType: string | null, path: string[]): boolean {
  if (contentType && TEXTUAL_CONTENT_TYPES.some((re) => re.test(contentType))) return false;
  if (contentType) return true;                       // ASIL ÖLÇÜT
  return BINARY_DOWNLOAD_SUFFIXES.some((s) => path[path.length - 1].endsWith(s));
}
```

**`status >= 400` her zaman JSON dalına gider** (T4). GET dışı metodlar bugünkü
`proxyAuthenticated` yolunda **kalır** — blast radius küçük tutulur.

**(c) İstemci:** `src/lib/api/boq-client.ts` — `downloadAuditExport` kanonu birebir
(ham `fetch`, `credentials: "same-origin"`, `Blob` → `createObjectURL` → gizli
`<a download>` → `revokeObjectURL` **`finally` içinde**). `exportFilename`
`audit-client.ts`'ten `src/lib/api/export-filename.ts`'e taşınır ve **varsayılan
parametre** alır (DRY; iki çağıran da testli). `siteId` şablona girmeden
`encodeURIComponent`'ten geçer.

Buton durumları (§8.3): istek sürerken `disabled` + `İndiriliyor…`; 403 →
`Bu işlem için yetkiniz yok`; diğer → `Excel dosyası indirilemedi.`; başarıda ek
geri bildirim yok.

**Önce testler — KIRMIZI GÖR:**

`src/app/api/backend/[...path]/route.test.ts` (mevcut, genişletilir) — **spec §8.1'in
altı satırlık tablosu birebir:**
- `"uzantısız export ikili geçer: sites/{id}/boq/export bayt bayt aynı döner"` ← **asıl regresyon kapısı**
- `"content-type ve content-disposition başlıkları korunur"`
- `"uzantılı export hâlâ ikili: audit-log/export.xlsx"`
- `"Content-Type yokken uzantı yedeği devreye girer"`
- `"JSON regresyonu: sites/{id}/boq application/json ile JSON dalına gider"`
- `"hata gövdesi korunur: 403 + application/json Türkçe gövde aynen geçer"`
- `"401 + refresh davranışı değişmedi"`

`src/lib/auth/backend.test.ts` (mevcut, genişletilir):
- `"proxyAuthenticatedRaw hata yanıtında da gövdeyi okur"`
- `"401'de refresh sonrası tek retry yapar"`
- `"proxyAuthenticatedBinary artık export edilmiyor"` (ölü kod kapısı)

`src/lib/api/export-filename.test.ts` (yeni):
- `"Content-Disposition'dan güvenli dosya adı çıkarır"`
- `"yol ayracı/kontrol karakteri içeren adı reddeder ve varsayılana düşer"`
- `"varsayılan ad parametre olarak verilebilir"`

`src/lib/api/boq-client.test.ts` (yeni):
- `"doğru yola credentials: same-origin ile fetch atar"`
- `"siteId encodeURIComponent'ten geçer"`
- `"revokeObjectURL finally içinde çağrılır (hata durumunda da)"`
- `"2xx dışı yanıt BackendError fırlatır"`

`…/is-kalemleri/page.test.tsx` (genişletilir):
- `"indirme sürerken buton disabled ve İndiriliyor… yazar"`
- `"403'te 'Bu işlem için yetkiniz yok' satırı basılır"`
- `"diğer hatada 'Excel dosyası indirilemedi.' basılır"`

**Dosyalar:** `src/lib/auth/backend.ts` + test,
`src/app/api/backend/[...path]/route.ts` + test,
`src/lib/api/export-filename.ts` (yeni) + test,
`src/lib/api/audit-client.ts` (import taşınması),
`src/lib/api/boq-client.ts` (yeni) + test, `…/is-kalemleri/page.tsx` + test

**Tuzaklar:**
- 🔴 **Bu task uygulamanın TÜM GET trafiğini değiştiriyor.** Regresyon tablosunun altı
  satırı da yeşil olmadan task bitmiş sayılmaz.
- **Backend'e dokunulmaz** (karar 1): uç yeniden adlandırılmaz, yeniden deploy yok.
- `.xlsx` deseni **silinmez** — yedek kural olarak kalır.
- Denetim günlüğü indirmesi **mevcut çağıranıdır**; `exportFilename` taşınırken
  `audit-client.ts` ve testleri kırılmamalı, varsayılan adı `denetim-gunlugu.xlsx` kalmalı.
- `proxyAuthenticatedBinary` **silinir**; ölü kod bırakılmaz (F11 kapısı bunu arar).
- Token URL'e **konmaz** — httpOnly cookie + `same-origin` (audit kanonu).

**Kabul kriteri:** dört kapı yeşil; altı regresyon testi yeşil; `proxyAuthenticatedBinary`
repoda yok; `exportFilename` tek yerde ve iki çağıran da testli; Excel butonu üç durumu
da basıyor.

---

## Task F10 — Mockup karşılaştırma kapısı

**Boyut:** S · **Bağımlı:** F5–F9, F12 · **Spec:** §3, §13

**Ne yapılacak:**

```
scripts/render-mockup.mjs "projedesign/Ekran 13 - İş Kalemleri.dc.html" … 1440
```

ile mockup render'ı alınır, uygulama yan yana konur. **Sapmalar göz kararıyla değil
ölçüyle** raporlanır: *mockup satır no + beklenen değer + gerçek değer*.

**Sapma sayılmayan, kayıtlı istisnalar (spec §13 / §13.1):**

| Kod | İstisna |
|---|---|
| A | İçerik ofseti `24px 32px` (dikeyde 4px sapma) |
| B | Şantiye Detay'a 7. sekme + drill sidebar kalemi |
| C | Breadcrumb'ın sözleşmesiz hâli (`SZL-2025-001` basılmaz) |
| — | Dört kartın `—` yer tutucu hâli (§4) |
| — | `Gerç. %` rozetlerinin hiç render edilmemesi (§5.4) |
| — | `BoqItemFormModal`, satır hover'ı, `+ Yeni Grup`, `Tutar (hesaplanan)` (§13.1) |
| — | Yükleniyor / boş / hata metinleri (§9.2) |
| — | İzne göre gizlenen yazma butonları (§2.5) |

**Kabul kriteri:** rapor üretildi; **listede olmayan hiçbir sapma kalmadı**. Kalan
sapma varsa ya düzeltilir ya kullanıcıya sorulur — sessizce kabul edilmez.

---

## Task F11 — Görsel spec + review + a11y + ölü kod + baseline turu 🔶 RİSKLİ

**Boyut:** M · **Bağımlı:** F10 · **Spec:** §10, §11.2, §11.3

**Ne yapılacak:**

1. **Görsel test kodu:** `e2e/boq-visual.spec.ts` — 1440×900, anlık görüntü adı
   `is-kalemleri.png`. **Playwright lokalde koşturulmaz, `.png` üretilmez** (T1).
2. **Mock veri:** `e2e/mock-backend.ts`'e `GET /sites/:siteId/boq` yanıtı —
   **mockup'taki 3 grup / 6 kalem birebir** (kod, tarif, birim, miktar, birim fiyat,
   tutar değerleri mockup 111–171'den), `grand_total: "12399900.00"`, altı yer tutucu.
3. **Review:** `react-reviewer` + `typescript-reviewer` çalıştırılır; CRITICAL/HIGH düzeltilir.
4. **A11y denetimi:** `<caption class="sr-only">`; 7 × `<th scope="col">`;
   grup başlığı `scope="colgroup"`; tfoot `<th colSpan={5} scope="row">`; yer tutucu
   hücrelerde `title` **+** `sr-only`; satır tetikleyicisinin erişilebilir adı;
   `canWrite=false` iken ölü odaklanabilir öğe yok; sayfada tek `<h1>`;
   `--focus-ring` odak halkası.
5. **Ölü kod denetimi:** `proxyAuthenticatedBinary` referansı yok; grup PATCH hook'u yok;
   `useDeleteBoqItem` yok; ölü `.boq-table__pct--*` renk sınıfı yok.
6. **Baseline turu (T2):** `visual-baselines.yml` → workflow_dispatch → artifact indir →
   `e2e/` altına aç → **üç baseline tek commit**.

**Tuzaklar:**
- 🔶 Mock e2e oturumunda `permissions` alanı **yoktur** → §2.5.3 gereği baseline
  **yazma butonları görünür** hâlde alınır. BE-A/BE-B sonrası mock'a alan eklenirse
  baseline yeniden kayar (o gün ayrıca planlanır).
- Baseline turu **push gerektirir** → T9 gereği kullanıcı kararıdır; ajan kendiliğinden
  workflow tetiklemez, kullanıcıya adım listesini verir.
- Kontrast notu (spec §10): yer tutucu `—` `--color-text-subtle` üzerinde 3.0:1 — bilgi
  `sr-only` metinle verildiği için **kabul edilmiştir**, "düzeltme".

**Kabul kriteri:** dört kapı yeşil; görsel test kodu commit'li (PNG'siz); review
CRITICAL/HIGH sıfır; a11y listesi tek tek doğrulanmış; ölü kod yok; üç baseline
CI artifact'inden alınıp tek commit ile işlenmiş.

---

## Task F13 — Silme akışı 🔴 **BLOKLU — AYRI PR**

**Boyut:** M · **Bağımlı:** F8 **+ BE-B** · **Spec:** §7.5, §9.2 (25–29), §12.2

> 🔴 **Bu dilim F13'ü BEKLEMEZ.** Backend `DELETE /boq/items/{item_id}` ucu yoktur.
> Uç canlıya çıkana kadar **tek satır kod yazılmaz** — ölü kod olur.

**BE-B'den beklenen sözleşme:** `DELETE /boq/items/{item_id}`, izin `boq:full`,
başarı `204`, kayıt yok `404`, görünmeyen şantiye `404` (403 değil), denetim günlüğüne yazar.

**BE-B geldiğinde yapılacak (ayrı, küçük PR):**
1. `openapi` senkronu + `pnpm gen:api`
2. `useDeleteBoqItem(siteId)` → `useBoqMutations.ts`'e eklenir
3. `edit` kipindeki modalin alt şeridinde solda `Sil`; `create` kipinde basılmaz
4. Onay adımı **aynı modal içinde** (ikinci diyalog yok): form alanları gizlenir,
   `{code} — {description} kalemi silinecek. Bu işlem geri alınamaz.` + `Vazgeç` / `Evet, sil`
5. 204 → modal kapanır → `invalidateQueries([BOQ_QUERY_KEY, siteId])`
6. Hata metinleri: 404 → `Kalem bulunamadı, listeyi tazeleyin.`; 403 → `backendErrorMessage`;
   diğer → `İş kalemi silinemedi.`
7. `canWrite === false` → `Sil` hiç basılmaz
8. **Grup silme yoktur** — son kalemi silinen grup başlığı boş kalır

**Testler (o gün yazılacak):** `Sil` yalnız `edit` kipinde; onay adımı; 204 → invalidate;
404/403/diğer mesajları; `canWrite=false` → buton yok.

**BFF notu:** `DELETE` metodu `route.ts`'te zaten destekleniyor ve `boq` kökü
allow-list'te → **BFF tarafında ek iş yok**.

---

## Sıralama

```
F1 → F2 → F3 → F4 → F5 → F6 → F7 → F12 → F8 → F9 → F10 → F11
                                                         ⋯⋯ (BE-B) ⋯⋯ → F13 (ayrı PR)
```

**Kritik yol:** **F1 → F2 → F4 → F6 → F7 → F12 → F8 → F10 → F11**

F5 ve F9 kritik yolun dışındadır (F5 kısa ve F4'e; F9 F3+F4'e bağlı), ama F10 ikisini
de bekler. F3, F2'den bağımsızdır ve sıkışıklıkta F2 ile yer değiştirebilir.

**Bağımlılık notları:**

- **F12 → F8 sert bariyerdir.** F8 yazma yüzeylerini `canWrite` kapısının arkasına
  koyduğu için izin altyapısı önce bitmelidir. Numara sırasına bakıp F12'yi sona
  bırakmak F8'i yeniden yazdırır.
- **F1 kapı task'ıdır.** No-op olması beklenir; kırmızı çıkarsa tüm zincir durur.
- F2 ve F3 birbirinden bağımsızdır (token/format vs. hook), ama **aynı repoda aynı anda
  iki ajan çalışmaz** → sırayla.
- F5, F6, F7 hepsi F4'ün kabuğuna bağlıdır; F7 F6'nın tablosuna.
- F9 `route.ts`'e dokunduğu için **tek başına** koşturulmalı; başka bir task'la aynı
  commit'e karışmamalı (geri alınabilirlik).
- F10 ve F11 en sonda; F11 push gerektiren tek adımı (baseline turu) içerir.

---

## Riskli task'lar

| Task | Risk | Azaltma |
|---|---|---|
| 🔴 **F9** | `route.ts` GET dalının yeniden yazımı **tüm uygulamanın okuma trafiğini** etkiler. Yanlış yapılırsa Türkçe hata gövdeleri kaybolur, JSON uçları ikili sanılır | Spec §8.1'in **altı satırlık regresyon tablosu** kabul kriteridir; `status >= 400` her zaman JSON dalı; GET dışı metodlar dokunulmaz; task tek başına commit'lenir |
| 🔶 **F4** | Sekme barı + drill nav değişikliği `santiye-detay` baseline'ını **kesin** kaydırır; ayrıca `[projectId]` kabuğuna dokunur | Kayma onaylı (sapma B); F11'in tek baseline turunda toplanır; nav ve sekme **aynı task'ta** değişir ki ayrışma olmasın |
| 🔶 **F8** | Modal + satır tıklaması **mockup'ta yok** — tamamı kullanıcı kararı; kapsam kayması riski en yüksek yüzey | Spec §7'nin dışına çıkılmaz; tabloya 8. sütun yasak; silme yasak; §9.2 metin envanteri kapalı |
| 🔶 **F11** | Baseline turu üç anlık görüntüyü birden etkiler; yanlış turda alınırsa CI iki kez kırmızı olur | Tek `workflow_dispatch`, tek commit; PNG **asla** macOS'ta üretilmez |
| ⚠️ **F12** | Bilinmezlik kuralının ters çevrilmesi tam yetkili kullanıcıya ekranı salt-okunur gösterir | `canWrite(undefined) === true` testi kapıdır; sabit rol haritası yasak |

---

## PR bölünmesi (öneri)

| PR | İçerik | Neden ayrı |
|---|---|---|
| **PR 1 — ana dilim** | F1–F10 + F12 (kod + jsdom testleri + `e2e/boq-visual.spec.ts` **kodu**, PNG'siz) | Tek tutarlı ekran; CI yalnız build+unit'te yeşil olur, görsel iş **kasıtlı olarak** kırmızı/atlanır |
| **PR 2 — baseline turu** | F11'in 6. adımı: üç `.png` (yeni `is-kalemleri`, yenilenen `santiye-detay`, yenilenen `ayarlar-izin-matrisi`) | PNG'ler Linux CI artifact'inden gelir; kod PR'ıyla karışırsa review'da 3 binary diff gürültü yapar. PR 1 merge edildikten **sonra** o dal üzerinde workflow_dispatch |
| **PR 3 — F13 silme** | `useDeleteBoqItem` + modal `Sil` + onay adımı + testler | **BE-B'ye bağımlı**; bu dilimi bloklamamalı. Küçük ve bağımsız |

**Alternatif (F9 ayrılırsa):** `route.ts` değişikliği risk iştahına göre **PR 0** olarak
öne alınabilir — BFF düzeltmesi + regresyon testleri tek başına merge edilir, ekran
işi onun üstüne gelir. Geri alınabilirlik açısından en temiz seçenek budur; kullanıcı
tercihi.

---

## Bitti tanımı — kontrol listesi

Dilim ancak aşağıdakilerin **tamamı** işaretliyken bitmiştir.

**Kapılar**
- [ ] `pnpm lint` yeşil
- [ ] `pnpm typecheck` yeşil (`as any` / `@ts-ignore` yok)
- [ ] `pnpm test` yeşil
- [ ] `pnpm build` yeşil

**Mockup sadakati (F10)**
- [ ] `Ekran 13 - İş Kalemleri.dc.html` render'ı ile yan yana karşılaştırma yapıldı
- [ ] Her sapma **mockup satır no + beklenen + gerçek** üçlüsüyle raporlandı
- [ ] Raporlanan sapmaların tamamı spec §13 / §13.1 listesinde; **listede olmayan sapma yok**
- [ ] Çıplak hex / çıplak px yok; 13 yeni token `tokens.css`'te ve satır no ile gerekçeli
- [ ] Ham `<select>` / `<input>` / `<label>` yok

**Üç baseline (F11)**
- [ ] `is-kalemleri` (yeni) — Linux CI artifact'inden
- [ ] `santiye-detay` (yenilendi — 7. sekme)
- [ ] `ayarlar-izin-matrisi` (yenilendi — 17 modül)
- [ ] Üçü **tek workflow_dispatch turundan, tek commit** ile geldi
- [ ] macOS'ta üretilmiş hiçbir `.png` commit edilmedi

**A11y (F11)**
- [ ] `<caption class="sr-only">İş kalemleri listesi</caption>` var
- [ ] 7 × `<th scope="col">`; grup başlığı `scope="colgroup"`; tfoot `<th colSpan={5} scope="row">`
- [ ] Yer tutucu hücrelerde `title` **ve** `sr-only` metin (yalnız `title` yeterli değil)
- [ ] Satır tetikleyicisi gerçek `<button>`; erişilebilir adı `{code} — {description} kalemini düzenle`
- [ ] `canWrite === false` iken odaklanabilir ölü öğe yok
- [ ] Sayfada tek `<h1>`; odak halkası `--focus-ring`
- [ ] Yeni animasyon eklenmedi (`prefers-reduced-motion` yüzeyi büyümedi)

**Ölü kod**
- [ ] `proxyAuthenticatedBinary` repoda yok (tek çağıranıyla birlikte silindi)
- [ ] Grup PATCH hook'u yazılmadı (§7.4)
- [ ] `useDeleteBoqItem` / `Sil` / silme metinleri yazılmadı (T6)
- [ ] Ölü `.boq-table__pct--success/--warning/--danger` sınıfı yok (§5.4)
- [ ] `exportFilename` tek yerde (`src/lib/api/export-filename.ts`), iki çağıran da testli

**Review**
- [ ] `react-reviewer` + `typescript-reviewer` koştu; CRITICAL/HIGH sıfır

**Sonrası (kullanıcı kararı, ajan yapmaz)**
- [ ] PR → CI → merge → baseline turu → Railway deploy → canlıda uçtan uca doğrulama
      (BOQ ekranı açılıyor, Excel iniyor, kalem ekleme/düzenleme çalışıyor)
