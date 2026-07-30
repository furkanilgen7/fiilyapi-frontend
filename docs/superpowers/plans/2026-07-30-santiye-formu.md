# Şantiye Ekle formu — uygulama planı

Tarih: 2026-07-30
Bağlı spec: `frontend/docs/superpowers/specs/2026-07-30-santiye-formu-design.md` (**onaylı**)
Backend sözleşmesi: `backend/docs/superpowers/specs/2026-07-30-santiye-formu-genisleme-design.md` (§3.0, §6.1)
Kapsam: **tek repo** — `frontend/` (T0–T14, 15 task)
Yürütme: `superpowers:subagent-driven-development` — task-by-task, her task bağımsız review'lı
Mockup kanonu: `projedesign/Form - Santiye Ekle.dc.html` (234 satır, 1440px)
GOREV-SIRASI referansı: §1 (dilim akışı), §3 (sabit kurallar), §4 (kalıcı kararlar)
Emsal: P1.1a proje formu — `docs/superpowers/plans/2026-07-29-p1-1a-proje-formu.md`,
uygulaması `src/components/project-form/`, rotası `src/app/(app)/projeler/yeni/page.tsx`

---

## ⚠️ Başlamadan önce — tuzaklar (hepsi zorunlu okuma)

Bu bölüm plan boyunca **tekrar edilmez**; her task'ın ajanı buradan sorumludur.

### TZ-1 — T0 bir KAPIDIR: backend olmadan T4 ve T6+ başlamaz

Formun altı bölümünden **beşi** backend'in 22 yeni `sites` kolonuna, `sections.manager_user_id`
FK'sine, `site_status.preparation` değerine ve `SiteCreate.sections[]` + `facilities` +
`is_draft` sözleşmesine bağlıdır (spec §3, §3.2).

**Doğrulandı (2026-07-30):** `src/lib/api/schema.d.ts` içinde `site_manager_user_id` ve
`facilities` **YOK** → backend dilimi henüz merge edilmemiş, `pnpm gen:api` koşulmamış.
Yani bugün T0 **kırmızıdır**.

Backend dilimi merge + `openapi/openapi.json` yenilenmiş + `pnpm gen:api` koşulmuş olmadan
**T4, T6, T7, T8, T10, T11, T12, T13, T14 BAŞLAMAZ.** Tipsiz yazılan gövde derleyicisi
`as any`'ye ya da elle yazılmış tipe iter; ikisi de yasak (GOREV-SIRASI §3).

**Backend'siz ilerleyebilen task'lar** (aşağıda her birinin başlığında da işaretli):

| Task | Neden backend'siz koşabilir |
|---|---|
| **T1** — form kabuğunun ortaklaştırılması | Salt taşıma; hiçbir API tipine dokunmuyor |
| **T2** — primitive varyantları (`size="row"`, `size="lg"`) | Salt UI ölçüsü |
| **T3** — 22 yeni token | Salt `tokens.css` |
| **T5** — rota kabuğu + kırıntı yolu + bilgi kutusu | Yalnız `useProject` kullanır (mevcut, `ProjectDetail` tipi var) |
| **T9** — Belgeler yer tutucusu + alt eylem şeridi | Tamamı yer tutucu; hiçbir alan gövdeye girmiyor |

Bu beşi tek bir "backend'siz ön dilim" olarak T0 beklenirken paralel koşabilir.
**T9'un tek şartı:** alt şeritteki üç butonun `onClick`'i T10'a kadar `noop` kalır
(buton yüzeyi basılır, gönderim mantığı T10'da bağlanır).

### TZ-2 — macOS'ta Playwright KOŞULMAZ, `.png` baseline ÜRETİLMEZ

GOREV-SIRASI §3. Görsel testin **kodu** yazılır (`e2e/*.spec.ts`), **anlık görüntüsü**
yazılmaz. macOS'ta üretilen PNG **asla commit edilmez** — font/hinting farkı Linux CI'da
anında kırmızı verir.

Teslim akışı (tek yol):

```
visual-baselines.yml → workflow_dispatch (ilgili dalda)
  → koşum bitince artifact İNDİR (workflow commit ATMAZ)
  → arşivi `e2e/` altına aç
  → tek commit ile işle
```

### TZ-3 — Bu dilim ÜÇ baseline'ı birden kaydırır; tur TEK'tir

T11 `SiteFormModal`'ı silip iki "+ Şantiye Ekle" butonunu `Link`'e çeviriyor. Buton
`<button>` → `<a>` olduğu için **proje detay** anlık görüntüsü kayabilir (stil sınıfı
korunsa bile tarayıcı varsayılan `<a>` davranışı, `line-height`/`text-decoration` farkı).

| # | Baseline dosyası | Neden kayıyor |
|---|---|---|
| 1 | `e2e/site-form-visual.spec.ts-snapshots/santiye-formu-chromium-linux.png` | **yeni** ekran (T13) |
| 2 | `e2e/project-detail-visual.spec.ts-snapshots/proje-detay-chromium-linux.png` | T11 — buton → link dönüşümü |
| 3 | `e2e/projects-visual.spec.ts-snapshots/projects-chromium-linux.png` | **risk**: T1'in CSS taşıması `.pf-*` bloklarını global `form-shell.css`'e alıyor; import sırası değişirse kaskad kayar. T1'in kabul kriteri "sıfır görsel fark" — ama tur açılırken bu üçüncüsü de **kontrol edilir** |

**Ayrı turlar açılmaz.** Tek `workflow_dispatch` koşusunun artifact'i açılır, tek commit
ile işlenir (T13).

### TZ-4 — BFF kökü tuzağı (GOREV-SIRASI §3)

Yeni backend kökü `src/app/api/backend/[...path]/route.ts` `ALLOWED_ROOTS`'a eklenmezse
modül **yalnız canlıda 404** verir; jsdom testleri görmez.

Bu dilimde **yeni kök gerekmiyor**: `projects`, `sites`, `users` üçü de listede
(`route.ts:7` doğrulandı — `users, roles, modules, projects, sites, company, settings,
audit-log, dashboard, employers, boq`). Yine de **T4 ve T12'nin kapısı** olarak grep ile
doğrulanır ve `route.test.ts:380`'deki dinamik allow-list testinin (istemci çağrılarından
kök çıkaran test) yeni hook'lardan sonra da yeşil olduğu görülür.

### TZ-4b — `GET /users` üç seçicide 403 verir: KABUL EDİLMİŞ SINIRLAMA

**Backend bulgusu (koddan ölçüldü, 2026-07-30):**
`backend/app/modules/users/router.py:36` → `GET /users` ucu
`require_permission("user_management", AccessLevel.view)` istiyor. İzin matrisinde
`user_management` satırı **yalnız sistem yöneticisinde** açık.

**Sonuç:** `sites:full` yetkili bir proje müdürü formu açtığında **Şantiye Şefi (69),
İSG Uzmanı (70) ve bölüm Sorumlusu (120) seçicileri 403 alır.**

**Kullanıcı kararı (2026-07-30): "şimdilik böyle kalsın."** Yeni bir seçici ucu
**açılmayacak**, `GET /users` izni **gevşetilmeyecek**. Bu bir hata değil, **kabul
edilmiş sınırlamadır**.

Frontend'in yapması gerekenler — üçü de pazarlığa kapalı:

1. **Form çökmez.** 403 sorgu hatasıdır; `SiteCreateView` render edilmeye devam eder.
2. **Sessiz boş açılır liste YASAK** (GOREV-SIRASI §3: "zarif düşüş **+ kullanıcıya
   bildirim**, sessiz atlama yok"). Üç seçici de `disabled` kalır ve **görünür bir
   açıklama** basar. P1.1a deseninin aynısı: belge kartı gibi, yüzey durur ama neden
   kullanılamadığı yazılır.
3. **Form yine kaydedilebilir.** Üç alan da backend'de nullable
   (`site_manager_user_id`, `safety_officer_user_id`, `sections[].manager_user_id`) ve
   GOREV-SIRASI §4.3 "şantiye şefi nullable" der.

> ⚠️ **Spec çelişkisi — T6/T10 ajanı buna dikkat edecek:** spec §10.1 Şantiye Şefi'ni
> **★ zorunlu** sayıyor. Kullanıcı listesi 403 ise bu kural formu **gönderilemez**
> hâle getirir (kullanıcı seçemediği bir alanı zorunlu görüyor). Karar:
> **kullanıcı listesi yüklenemediğinde (403 veya diğer hata) şef zorunluluğu kalkar**;
> liste geldiğinde kural aynen işler. Bu bir **yeni sapmadır** → T14'ün mockup kapısına
> girmeden önce **spec §10.1 + §11'e eklenmesi ve kullanıcı onayı alınması gerekir**.
> Aynı şekilde 403 açıklama metni **spec §15 metin envanterinde yoktur** — envantere
> eklenmeden ekrana basılamaz (TZ-10). İkisi de T4'ün çıktısında **kullanıcıya
> sorulacak madde** olarak raporlanır.

**Spec düzeltmesi — D1 tespiti YANLIŞTI:** spec §9.2.1 "`GET /users` 20 kayıtta
kesiliyor" diyor. Koddan ölçüldü (`router.py:40`): varsayılan **`limit=50`**, tavan
**`le=200`**. Yani `useUserOptions` `limit=200` isteyebilir ve 200 kullanıcıya kadar
sorun yoktur. `useUsers`'ın `PAGE_SIZE = 20`'si o hook'un **kendi** sayfalama tercihidir,
sunucu sınırı değildir.
→ Planda "20 kullanıcı sınırlaması" için **iş açılmaz**; spec §9.2.1'in sayısı yanlıştır
ve T4'ün çıktısında düzeltilmesi raporlanır. 200 üstü için sunucu tarafı arama gerekir;
o **kullanıcı yönetimi diliminin** işidir, bu dilimin değil.

### TZ-5 — `SiteFormModal` SİLİNİYOR, düzenleme kipi için saklanmıyor

Tek çağıran `src/app/(app)/projeler/[projectId]/page.tsx:10` (import), `:64`
(`isSiteFormOpen`), `:95–97` (render). İki `AddSiteButton` çağrı noktası (üst bar ~`:81`,
boş durum ~`:86`) **aynı** `/projeler/{projectId}/santiyeler/yeni` linkine gider.

- `project-detail__add-btn` sınıfı **korunur** → görsel stil değişmemeli.
- `SiteFormModal.tsx` + `SiteFormModal.test.tsx` silinir (`src/components/project-detail/`).
- `SectionFormModal.tsx` **dokunulmaz** — ayrı yüzey, bu dilimin kapsamı dışı.
- Düzenleme kipi geldiğinde aynı tam sayfa formun `?edit` kipi olacak (spec §2.3).

### TZ-6 — Primitive ve token yasakları

- Ham `<select>` / `<input>` / `<label>` **YASAK** → `src/components/ui/`
  (`Field`, `Input`, `Select`, `Textarea`, `Checkbox`, `Button` mevcut).
  Ham `<table>` yasak **değildir** (bölüm tablosu gerçek `<table>`, spec §13).
- Çıplak hex / çıplak px **YASAK** → `src/styles/tokens.css`. Yeni token listesi spec
  §5.1'de **22 satır** olarak hazır; oradaki değerlerin dışına çıkılmaz.
  Doğrulandı: `--radius-9`, `--leading-loose`, `--width-col-*` **yok**; eklenecek.
  Spec §5.1 sonundaki renk listesi **mevcut** → yeni renk token'ı **açılmaz**.
- `as any` / `@ts-ignore` **YASAK**.
- `field-adoption.test.ts` (src ağacını tarayan mevcut test) ham `<label htmlFor>`
  kullanımını yakalar — kırılırsa `Field` kullanılmamış demektir.

### TZ-7 — Belgeler: yüzey var, kod YOK

Spec §1.2, §4.6, §11.10. Altı belge kutusu + sürükle-bırak alanının **düzeni, metni,
ikonu, rengi mockup'la birebir** çıkar, ama:

- `<input type="file">` **render edilmez**
- `onDrop` / `onDragOver` / `onChange` / `FormData` / yükleme isteği **hiç yazılmaz**
- gövdede belge alanı **yoktur**
- mockup'taki ★ (satır 183, 188, 193) **basılmaz**

Testte bunun negatifi sabitlenir: `container.querySelector('input[type="file"]')` `null`.

### TZ-8 — GPS düz metindir

Spec §4.2.1, §11.13. **Ayrıştırma yok, regex yok, normalleştirme yok, hata mesajı yok.**
Kullanıcı ne yazarsa gövdeye o gider. Yer tutucu (`39.9042, 32.8597`) ve ipucu
("Puantaj konum doğrulaması için") mockup'tan aynen basılır — ipucu **kural değildir**.

> Backend'e devredilmiş iş D2: backend spec §3.5'teki GPS regex'i **kaldırılmalıdır**.
> Kalırsa kullanıcı istemcide hiç uyarılmadan sunucu 422'sine çarpar. T0 bunu **kontrol
> eder ve raporlar**, ama frontend'e regex **yazmaz**.

### TZ-9 — Bu formda kayıt SİLME yüzeyi YOKTUR

Spec §6.3. Bölüm satırındaki `×` **kaydedilmemiş istemci satırını** kaldırır:
ağ isteği yok, izin kapısı yok, onay diyaloğu yok. `DELETE /sites/{id}` ve
`DELETE /sections/{id}` backend'de `admin` iznine açılıyor ama **bu form onları çağırmaz**.
`canDelete` yardımcısı bu dilimde **eklenmez** — gelecek düzenleme diliminin işidir.

### TZ-10 — Metin envanteri kapalıdır

Spec §15'te **82 satır** var. Ekranda görünen ve o listede **olmayan** hiçbir dize
yazılamaz. Yeni metin gerekiyorsa önce spec'e eklenir (kullanıcı onayı).
Onaylı sapma listesi (spec §11, 14 madde) da kapalıdır: listede olmayan sapma meşru
değildir; yeni sapma çıkarsa **önce spec'e eklenir**, sonra uygulanır.

### TZ-11 — Ajanlar push etmez

Commit serbest. Push / PR / merge / deploy kararı **kullanıcıdadır** (GOREV-SIRASI §3).

### TZ-12 — Dal

Bugün `fix/project-card-links` dalındayız. Bu dilim `main`'den ayrı bir daldan başlar:

```
git checkout main && git pull && git checkout -b feat/santiye-formu
```

---

## Kurallar (her task için, istisnasız)

- **TDD:** önce test yaz, **KIRMIZI GÖR** (testin *doğru sebepten* kırmızı olduğunu
  çıktıda doğrula — "modül bulunamadı" da geçerli kırmızıdır, ama beklenen mesaj
  task'ta yazılıdır), sonra implementasyon, sonra yeşil. Test yazmadan kod yok.
- **Mockup birebir:** her ölçü spec §4'teki tablodan, **mockup satır numarasıyla**
  gerekçeli. Göz kararı ölçü icat etmek yasak.
- **Test konumu:** kaynağın **yanında**, aynı klasörde (`X.test.tsx`). `__tests__` yok.
- **Kapı komutu (her task sonunda, dördü de yeşil olacak):**

  ```
  pnpm lint && pnpm typecheck && pnpm test && pnpm build
  ```

- **Aynı repoda aynı anda iki ajan çalışmaz.** Task'lar sırayla koşar.

---

# TASK'LAR

## Task T0 — Backend ön koşul kapısı 🔒 KİLİT

**Boyut:** S · **Bağımlı:** backend dilimi (merge + deploy) · **Spec:** §3, §3.2, §17 T0
**Backend'siz koşamaz** — zaten kapının kendisidir.

**Ne yapılacak:** backend dilimi merge edildikten sonra `backend/openapi.json` →
`frontend/openapi/openapi.json` kopyalanır, `pnpm gen:api` koşulur, üretilmiş tipler
**test ile** doğrulanır. Tip elle yazılmaz.

**Önce test — KIRMIZI GÖR:**

`src/lib/api/schema.test.ts` (mevcut dosya, genişletilir):

- `"SiteCreate 22 yeni alanı taşır"` — `site_manager_user_id`, `safety_officer_user_id`,
  `safety_officer_is_outsourced`, `neighborhood`, `parcel`, `gps_coordinates`,
  `land_area_m2`, `construction_area_m2`, `floor_info`, `budget`,
  `electricity_subscription_no`, `water_subscription_no`, `planned_worker_count`,
  `is_draft` alanlarının tipleri
- `"SiteCreate.facilities sekiz Boolean anahtar taşır"` — `closed_warehouse,
  open_storage, cold_storage, site_office, canteen, changing_room_wc, dormitory,
  infirmary`
- `"SiteCreate.sections SiteSectionInput dizisidir"` — `name` zorunlu;
  `manager_user_id`, `start_date`, `end_date` opsiyonel; **`estimated_amount` YOK**;
  **`sort_order` YOK**
- `"SiteStatus preparation degerini icerir"` — `preparation | active | on_hold | completed`
- `"SectionResponse manager_user_id tasir"`
- `"SiteCounts draft sayacini tasir"`

Kontroller `satisfies` / atama ile yapılır (`as any` yok). Tipler eksikse `pnpm typecheck`
kırmızı olur — **KIRMIZI GÖR adımı budur**. Bugün bu test **kırmızıdır** (doğrulandı:
`schema.d.ts`'te `site_manager_user_id` yok).

**Dosyalar:**
- `frontend/openapi/openapi.json` (backend'den kopyalanır — gitignore'lu değilse commit'lenir, mevcut desene uyulur)
- `src/lib/api/schema.d.ts` (üretilir, elle düzenlenmez)
- `src/lib/api/schema.test.ts`

**Ek doğrulama (kod değil, rapor):**
1. **D2 kontrolü:** backend'de GPS regex doğrulaması kaldı mı? Kaldıysa kullanıcıya
   bildirilir (TZ-8) — frontend'e regex **yazılmaz**.
2. **D3 kontrolü:** `sections.estimated_amount` yine de açıldı mı? Açıldıysa frontend
   onu **yazmaz**, yer tutucu kararı değişmez (spec §11.6).
3. `SiteCreate.site_manager_name` ve `delivery_date` sözleşmede kalmış olabilir
   (backend spec §6.1 satır 564–566) — **frontend göndermez** (spec §9.3, §11.4).

**Kabul kriteri:** dört kapı yeşil; altı şema testi de yeşil; `schema.d.ts` üretilmiş
(elle düzenlenmemiş — `git diff` yalnız üretici çıktısı); D2/D3 durumu rapor edildi.
Eksik çıkarsa **task durur ve dilim beklemeye alınır**.

**Kapı:** `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

---

## Task T1 — Paylaşılan form kabuğunun çıkarılması ✅ backend'siz

**Boyut:** M · **Bağımlı:** — · **Spec:** §5.3, §8.2, §17 T1
**RİSKLİ** (bkz. TZ-3 madde 3): CSS taşıması kaskad kaydırabilir.

**Ne yapılacak:** iki forma da ait olan blokları ortaklaştır. **Sınıf adları değişmez**,
görsel/davranışsal fark **sıfır** olmalı.

1. `src/components/project-form/project-form.css` (445 satır) içindeki ortak bloklar
   → `src/styles/form-shell.css`: `.pf`, `.pf-topbar*`, `.pf-breadcrumb`, `.pf-head`,
   `.pf-title`, `.pf-subtitle`, `.pf-card*`, `.pf-grid*`, `.pf-col-span-2`,
   `.pf-actions*`, `.pf-action--*`, `.pf-doc*`, `.pf-req`, `.pf-form-error`.
   Forma özgü bloklar (`project-form.css`'te kalanlar: tip kartları, bütçe, işveren,
   hissedar satırı, şantiye repeater'ı) **yerinde kalır**.
2. `durationDays` → `src/components/project-form/derive.ts`'ten `src/lib/form/derive.ts`'e
   taşınır; `project-form/derive.ts` oradan **re-export eder** (P1.1a çağrı noktaları
   kırılmaz). `totalBudget` / `profitMargin` **taşınmaz** — proje formuna özgüdür.
3. `DocumentsPlaceholderCard` genelleştirilir: `columns?: 2 | 3` (varsayılan `2`) +
   `items: DocumentPlaceholderItem[]` prop'u alır. Proje formunun mevcut iki sütunlu
   kalem listesi `project-form/` altında bir sabit diziye taşınır — **bileşen içinde
   gömülü kalmaz**. Bileşen `src/components/form-shell/DocumentsPlaceholderCard.tsx`'e
   taşınır; `project-form/DocumentsPlaceholderCard.tsx` kaldırılır (import'lar güncellenir).
4. `FormActions`'a `variant?: "end" | "split"` eklenir (`"split"` = mockup satır 219
   `justify-content: space-between`); varsayılan `"end"` P1.1a davranışını korur.
   `FormActions` da `src/components/form-shell/`'e taşınır.

**Önce testler — KIRMIZI GÖR:**

- `src/lib/form/derive.test.ts` (**yeni**)
  - `"durationDays uc-dahil hesaplar: 01.01 - 10.01 => 10"`
  - `"durationDays ters tarihte null doner"`
  - `"durationDays tek tarih girildiginde null doner"`
  - KIRMIZI: modül yok → "Cannot find module '@/lib/form/derive'"
- `src/components/form-shell/DocumentsPlaceholderCard.test.tsx` (**yeni** — mevcut
  `project-form/DocumentsPlaceholderCard.test.tsx` taşınır + genişletilir)
  - `"columns=3 verildiginde izgara ucluye gecer"`
  - `"columns verilmezse iki sutun kalir"`
  - `"items prop'undaki her kalem icin bir kutu basilir"`
  - `"hicbir kutuda input[type=file] yok"`
- `src/components/form-shell/FormActions.test.tsx` (**yeni**)
  - `"variant=split eylem seridine split sinifini ekler"`
  - `"varsayilan variant end davranisini korur"`
- `src/styles/form-shell.test.ts` (**yeni**, `@vitest-environment node` — mevcut
  `form-control-metrics.test.ts` deseni)
  - `"form-shell.css .pf-card ve .pf-grid bloklarini tasir"`
  - `"project-form.css artik .pf-card tanimlamiyor"` (çift tanım = kaskad riski)
- **Regresyon kapısı:** `src/components/project-form/*.test.tsx` (12 dosya) **hiç
  değiştirilmeden** yeşil kalmalı. Değiştirilmesi gereken tek şey import yollarıdır.

**Dosyalar:**
- yeni: `src/styles/form-shell.css`, `src/styles/form-shell.test.ts`,
  `src/lib/form/derive.ts`, `src/lib/form/derive.test.ts`,
  `src/components/form-shell/DocumentsPlaceholderCard.tsx` (+ `.test.tsx`),
  `src/components/form-shell/FormActions.tsx` (+ `.test.tsx`),
  `src/components/form-shell/index.ts`
- düzenlenen: `src/components/project-form/project-form.css`,
  `src/components/project-form/derive.ts`, `ProjectCreateView.tsx` (import'lar)
- silinen: `src/components/project-form/DocumentsPlaceholderCard.tsx` (+ testi),
  `src/components/project-form/FormActions.tsx`

**Tuzaklar:**
- `form-shell.css` **kim import eder?** `ProjectCreateView.tsx` ve (T5'te) yeni şantiye
  formu — global `globals.css`'e eklenmez (kapsam sızıntısı). İki dosyanın da import
  sırası: önce `form-shell.css`, sonra forma özgü CSS (özgü olan kazansın).
- CSS blokları **kopyalanmaz, taşınır**: çift tanım kaskad kayması demektir. `form-shell.test.ts`
  bunu kapıya bağlar.
- `durationDays` P1.1a'da `null` mu `""` mü dönüyor — mevcut imza **birebir korunur**,
  taşıma sırasında davranış değiştirilmez.

**Kabul kriteri:** dört kapı yeşil; P1.1a'nın 12 test dosyası **davranışsal değişiklik
olmadan** yeşil; `.pf-*` blokları tek bir dosyada tanımlı; `git diff --stat` CSS'te net
satır artışı ~0 (taşıma olduğunun kanıtı).

**Kapı:** `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

---

## Task T2 — Primitive varyantları: `size="row"` ve `size="lg"` ✅ backend'siz

**Boyut:** M · **Bağımlı:** T1 · **Spec:** §5.2, §4.0 (satır 27), §4.7 (satır 221)

**Ne yapılacak:** mockup iki yeni kontrol ölçüsü getiriyor. **Yeni dosya açılmaz**,
mevcut primitive'lere varyant eklenir.

| # | Primitive | Değişiklik | Ölçü (mockup satırı) |
|---|---|---|---|
| 1 | `ui/input`, `ui/select` | `size?: "form" \| "row"`, varsayılan `"form"` | `.row-in` (27): 1px kenar, `--radius-6` köşe, 6/8px iç boşluk, 12px yazı |
| 2 | `ui/checkbox` | `size?: "md" \| "lg"`, varsayılan `"md"` | `"lg"` = 15×15 (221) |

Ölçüler token'dan gelir (T3'te tanımlanan `--space-row-control-y/x`, `--text-row-control`,
`--border-width-row-control`, `--radius-row-control`, `--size-checkbox-lg`).
**T3 ile sıra bağı:** T3 önce koşarsa daha temiz; koşmadıysa T2 token'ları da ekler ve
T3 no-op'a düşer. Plan sırası: **T3 → T2** önerilir.

**Önce testler — KIRMIZI GÖR:**

`src/components/ui/form-control-metrics.test.ts` (mevcut, genişletilir):
- `"tokens.css row-control olculerini tanimlar"` — beş token adı + değeri
- `"input size=row ve select size=row ayni yuksekligi uretir"`
- `"row varyanti cıplak px kullanmaz, token'a bagli"`
- `"tokens.css --size-checkbox-lg tanimlar"`

`src/components/ui/input/Input.test.tsx` (mevcut, genişletilir):
- `"size verilmezse form varyanti sinifi basilir"`
- `"size=row ui-input--row sinifini ekler"`
- `"size=row status=error ile birlikte calisir"`

`src/components/ui/select/Select.test.tsx`:
- `"size=row ui-select--row sinifini ekler"`

`src/components/ui/checkbox/Checkbox.test.tsx`:
- `"size=lg ui-checkbox--lg sinifini ekler"`
- `"size verilmezse md kalir"`

**Dosyalar:** `src/components/ui/input/{Input.tsx,input.css,Input.test.tsx}`,
`src/components/ui/select/{Select.tsx,select.css,Select.test.tsx}`,
`src/components/ui/checkbox/{Checkbox.tsx,checkbox.css,Checkbox.test.tsx}`,
`src/components/ui/form-control-metrics.test.ts`

**Tuzaklar:**
- `InputProps` bugün `React.InputHTMLAttributes<HTMLInputElement>`'i genişletiyor ve
  DOM'un **kendi `size` özniteliği** (number) orada var. Yeni `size` prop'u onu gölgeler
  → `Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">` ile çakışma çözülür.
  Aynı sorun `Select` ve `Checkbox` için de geçerlidir. Bu, task'ın en olası
  typecheck kırılma noktasıdır.
- Varsayılan **değişmez**: `size` verilmeyen tüm mevcut çağrı noktaları (P1.1a, Ayarlar)
  bugünkü ölçüsünü korur. Regresyon kanıtı: mevcut primitive testleri değişmeden yeşil.

**Kabul kriteri:** dört kapı yeşil; iki varyant token'la ölçülmüş; mevcut `size`'sız
çağrı noktalarında görsel fark yok; `Omit` ile DOM `size` çakışması `as any`'siz çözülmüş.

**Kapı:** `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

---

## Task T3 — 22 yeni token ✅ backend'siz

**Boyut:** S · **Bağımlı:** — · **Spec:** §5.1

**Ne yapılacak:** spec §5.1'deki **22 token** `src/styles/tokens.css`'e eklenir, her biri
mockup satır numaralı yorumla. Spec §5.1 sonundaki **19 renk** mevcut token'lara eşlenir
— **yeni renk token'ı açılmaz**.

Eklenecekler (spec §5.1 tablosu birebir): `--radius-9`, `--leading-loose`,
`--space-info-banner-y`, `--space-info-banner-x`, `--space-card-head-gap`,
`--space-section-cell-y`, `--space-section-cell-x`, `--space-section-cell-x-lead`,
`--tracking-section-head`, `--width-col-responsible`, `--width-col-date`,
`--width-col-amount`, `--width-col-action`, `--space-dashed-btn-y`,
`--space-dashed-btn-x`, `--space-checkbox-list-gap`, `--size-checkbox-lg`,
`--space-row-control-y`, `--space-row-control-x`, `--text-row-control`,
`--border-width-row-control`, `--radius-row-control`.

**Önce test — KIRMIZI GÖR:**

`src/styles/tokens.test.ts` (mevcut, genişletilir):
- `"santiye formu token'lari tanimli"` — 22 token adı **ve** mockup değeri (`--radius-9: 9px`,
  `--leading-loose: 1.7`, `--width-col-date: 130px` …)
- `"--radius-row-control mevcut --radius-6'ya baglidir"` (yeni px değeri icat edilmemiş)
- `"yeni renk token'i eklenmedi"` — spec §5.1'in 19 rengi zaten mevcut token'larda
  (dosyada `#`'li yeni satır sayısı artmamalı)

**Dosyalar:** `src/styles/tokens.css`, `src/styles/tokens.test.ts`

**Tuzaklar:**
- `--tracking-section-head: 0.7px` mevcut `--text-table-head`'in 0.8px'inden **farklıdır**
  (spec §5.1). Mevcut token'ı değiştirmek başka ekranları kaydırır → **yeni token açılır**.
- Mevcut token varsa yeniden tanımlanmaz; önce `tokens.css` içinde aranır.

**Kabul kriteri:** dört kapı yeşil; 22 token tanımlı ve testli; `tokens.css`'te yeni
çıplak hex yok.

**Kapı:** `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

---

## Task T4 — `useUserOptions()` + `userOptionLabel()` + **403 zarif düşüşü**

**Boyut:** M · **Bağımlı:** **T0** · **Spec:** §9.2, §9.2.1, §4.1.2, §11.2 · **TZ-4b**

**Ne yapılacak:** üç seçicinin (şef 69, İSG 70, bölüm sorumlusu 120) paylaştığı tek
sorgu + tek önbellek anahtarı **ve `user_management:view` yoksa zarif düşüş**.

- `useUserOptions(): UseQueryResult<UserOption[], Error>` — `GET /users` tek istek,
  `{ id, full_name, title }`'a indirger. `useUsers`'ın sayfalı deseni **kopyalanmaz**;
  yeni hook `limit=200` (sunucu tavanı, `router.py:40` `le=200`) ile tek istek atar.
- `userOptionLabel(user)` = `title` doluysa `"{full_name} ({title})"`, boşsa `"{full_name}"`.
- **403 ayrı bir durum olarak taşınır** (TZ-4b): hook `{ isForbidden: boolean }` türevi
  yayımlar (HTTP durumunu yutmaz). Tüketiciler (T6/T7) "hata" ile "yetkisiz"i ayırt
  edebilmelidir — mesajları farklıdır.
- **20-kullanıcı iddiası YANLIŞTIR** (TZ-4b): sunucu varsayılanı `limit=50`, tavanı
  `200`. Sayfa döngüsü, istemci birleştirme, uydurma tavan (`limit=1000`) **yazılmaz**.
  Spec §9.2.1'in sayısı ve §16.2 D1 maddesi **düzeltilmelidir** — T4 bunu rapor eder.
- **Yeni uç açılmaz, izin gevşetilmez** (kullanıcı kararı).

**Önce testler — KIRMIZI GÖR:**

`src/lib/api/hooks/useUserOptions.test.tsx` (**yeni**):
- `"GET /users'i tek istekle limit=200 ile cagirir"`
- `"yaniti {id, full_name, title} listesine indirger"`
- `"hata durumunda error doner, veri uydurmaz"`
- `"403'te isForbidden true doner ve veri bos listedir"`
- `"500'de isForbidden false doner"` (403 ile genel hata karışmaz)
- `"403'te sorgu yeniden denenmez"` (retry kapalı — yetki hatası geçici değildir)
- `"USER_OPTIONS_QUERY_KEY tek onbellek anahtari kullanir"`

`src/lib/api/hooks/userOptionLabel.test.ts` (**yeni** — ya da hook dosyasının yanındaki
aynı test dosyasına konur):
- `"title doluysa 'Ad (Unvan)' doner"`
- `"title bossa yalniz 'Ad' doner"`
- `"title bosluktan ibaretse parantez basmaz"`

**Dosyalar:** `src/lib/api/hooks/useUserOptions.ts` (+ `.test.tsx`),
`src/lib/api/hooks/index.ts` (varsa barrel)

**Tuzaklar:**
- `users` kökü `ALLOWED_ROOTS`'ta **var** (TZ-4) — yine de `route.test.ts:380` dinamik
  allow-list testinin yeni hook eklendikten sonra yeşil kaldığı doğrulanır.
- `UserResponse.title` tipinin `schema.d.ts`'te gerçekten olduğu doğrulanır (spec §11.2);
  yoksa **task durur**, uydurma alan yazılmaz.
- **403, `AccessDenied` ile tüm formu kapatmaz** — etkilenen yalnız üç alandır (TZ-4b).
  `AccessDenied` yalnız **proje** 403'ünde kullanılır (spec §12).
- BFF 403 gövdesini nasıl aktardığı doğrulanır: `unwrap()` HTTP durumunu koruyor mu,
  yoksa jenerik `Error`'a mı çeviriyor? Korumuyorsa `isForbidden` türevi için
  `backendErrorMessage()` yanındaki durum bilgisi kullanılır — **`as any` ile durum
  okumak yasak**.

**T4'ün rapor çıktısı (kod değil, kullanıcıya sorulacak iki madde):**
1. **Yeni dize onayı:** 403 açıklama metni spec §15 metin envanterinde **yok**.
   Önerilen: *"Kişi listesini görme yetkiniz yok — bu alanları boş bırakabilirsiniz."*
   (üç seçicinin altında, `.hint` ölçüsünde). **Spec'e eklenip onaylanmadan ekrana
   basılmaz** (TZ-10). Onaya kadar T6/T7 testleri metni bir sabitten okur, dize tek
   yerde durur.
2. **Spec düzeltmesi:** §9.2.1'in "20 kayıt" sayısı ve §16.2'nin D1 maddesi yanlış;
   doğrusu `limit` varsayılan 50 / tavan 200 (TZ-4b).

**Kabul kriteri:** dört kapı yeşil; üç seçici tek sorgu paylaşabilir; allow-list testi
yeşil; 403 ayrı durum olarak yayımlanıyor ve yeniden denenmiyor; sayfa döngüsü/uydurma
tavan kodu **yazılmadı**; iki rapor maddesi kullanıcıya iletildi.

**Kapı:** `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

---

## Task T5 — Rota + sayfa iskeleti ✅ backend'siz

**Boyut:** M · **Bağımlı:** T1, T3 · **Spec:** §2.2, §4.0, §4.0.1, §12
**RİSKLİ:** yeni rota segmenti + dinamik segment çakışması.

**Ne yapılacak:** `/projeler/[projectId]/santiyeler/yeni` rotası ve sayfa kabuğu.

- `src/app/(app)/projeler/[projectId]/santiyeler/yeni/page.tsx` — ince sarmalayıcı
  (P1.1a'nın `projeler/yeni/page.tsx` deseni: 5 satır, yalnız `<SiteCreateView />`).
- `src/components/site-form/SiteCreateView.tsx` — client bileşeni, bu task'ta yalnız:
  yapışkan form barı (`.pf-topbar`, satır 35–43), kırıntı yolu (36–38:
  `Projeler` → `/projeler`, `{proje adı}` → `/projeler/{projectId}`, `Yeni Şantiye` aktif),
  `h1` "Yeni Şantiye Ekle" (49) + alt başlık (50), **Bağlı Proje bilgi kutusu** (53–60),
  boş kart yuvaları.
- `src/components/site-form/site-form.css` — bu ekrana özgü bloklar
  (`form-shell.css`'ten sonra import edilir).
- Bilgi kutusundaki "Poz Dağılımı →" (59) **edilgen** `<span>` +
  `title={pendingModuleLabel("contracts")}`.
- Yükleme/404/403 durumları (spec §12): proje yüklenirken kırıntı yolunda `…` + bilgi
  kutusunda gri şerit, form alanları **doldurulabilir kalır**; 404 → "Proje bulunamadı"
  + `/projeler` linki; 403 → mevcut `AccessDenied`.

**Önce testler — KIRMIZI GÖR:**

`src/app/(app)/projeler/[projectId]/santiyeler/yeni/page.test.tsx` (**yeni**):
- `"'yeni' segmenti [siteId] dinamik segmentinden once eslesir"` — dosya sistemi
  iddiası: `santiyeler/yeni/page.tsx` **var** ve `santiyeler/[siteId]/page.tsx`'ten
  ayrıdır (Next.js statik-önce kuralı; test dosya varlığını + route export'unu sabitler)
- `"sayfa SiteCreateView'i render eder"`

`src/components/site-form/SiteCreateView.test.tsx` (**yeni**):
- `"kirinti yolu uc seviyelidir: Projeler / {proje adi} / Yeni Santiye"`
- `"Projeler kirintisi /projeler'e, orta kirinti /projeler/{id}'ye baglanir"`
- `"aktif kirinti bagsizdir"`
- `"h1 'Yeni Santiye Ekle' basar ve sayfada tek h1 vardir"`
- `"Bagli Proje bilgi kutusu proje adi, kodu ve tipini basar"`
- `"Poz Dagilimi baglantisi tiklanamaz span'dir ve pendingModuleLabel('contracts') title'i tasir"`
- `"proje yuklenirken kirinti yolunda ... basar, form alanlari devre disi degildir"`
- `"proje 404 ise 'Proje bulunamadi' ve /projeler donus baglantisi basar, form basilmaz"`
- `"proje 403 ise AccessDenied basar"`
- KIRMIZI: bileşen yok → "Cannot find module"

**Dosyalar:**
`src/app/(app)/projeler/[projectId]/santiyeler/yeni/page.tsx` (+ `.test.tsx`),
`src/components/site-form/SiteCreateView.tsx` (+ `.test.tsx`),
`src/components/site-form/site-form.css`,
`src/components/site-form/index.ts`

**Tuzaklar:**
- Rota `(app)` grubunda kalır → **Topbar + Sidebar korunur** (spec §11.14). Mockup'ın
  kendi üst barı (31–43) `.pf-topbar` yapışkan form barına döner, uygulama Topbar'ının
  yerine geçmez.
- Bilgi kutusu satır 56'daki metin: `Bağlı Proje: {ad} ({kod}) · {tip}` — proje tipi
  etiketi P1.1a'nın mevcut eşlemesinden alınır, yeni sözlük yazılmaz.
- Üst bardaki eylem çifti (41–42) ile alt şerittekiler (225–227) **aynı işlevi** çağırır;
  bu task'ta ikisi de basılır ama `onClick` T10'a kadar `noop`'tur.

**Kabul kriteri:** dört kapı yeşil; `/projeler/{id}/santiyeler/yeni` gezilebilir; kırıntı
yolu ve bilgi kutusu mockup satır 36–60 ile birebir; üç yükleme durumu testli.

**Kapı:** `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

---

## Task T6 — Kart 1–3: Şantiye Bilgileri · Konum & Alan · Takvim & Bütçe

**Boyut:** L · **Bağımlı:** T0, T2, T4, T5 · **Spec:** §4.1, §4.2, §4.3, §8.2

**Ne yapılacak:** mockup satır 63–99, üç kart.

1. **📍 Şantiye Bilgileri** (63–73), ızgara `.pf-grid--2-1-1`:
   Ad ★ · Kod (mono, hint "Boş bırakılırsa otomatik") · **Bağlı Proje `disabled`** ·
   Şef ★ (`Select`, değer = `user.id`) · İSG (opsiyonel, son seçenek "Dış Kaynak — OSGB",
   sabit değer `__outsourced__`) · Durum (`preparation | active | on_hold`, varsayılan `active`).
   "+ Yeni Personel Ekle" **basılmaz** (§11.7).
2. **🗺 Konum & Alan** (76–88), `.pf-grid--3`:
   İl/İlçe ★ · Mahalle · Ada/Parsel (mono) · Açık Adres (`Textarea rows=2`, `span 2`) ·
   **GPS (düz metin, kural yok — TZ-8)** · Arsa Alanı · İnşaat Alanı ★ ·
   Kat Sayısı (**metin**, `floor_info`).
3. **📅 Takvim & Bütçe** (91–99), `.pf-grid--4`:
   Başlangıç ★ · Planlanan Bitiş ★ · **Süre (Gün) `readOnly`** (türev, `--` hint
   "Otomatik hesaplanır") · Şantiye Bütçesi.

Form state: `src/components/site-form/form-state.ts` (`SiteFormValues`,
`emptySiteFormValues()`) — P1.1a `project-form/form-state.ts` deseni.

**Önce testler — KIRMIZI GÖR:**

`src/components/site-form/SiteInfoCard.test.tsx` (**yeni**):
- `"Bagli Proje secicisi disabled ve baglamdaki projeyi gosterir"`
- `"Bagli Proje secicisi 'Santiye, girildigi projeye baglidir' title'i tasir"`
- `"sef secicisi kullanici listesini basar, deger user.id'dir"`
- `"secenek metni title doluysa 'Ad (Unvan)', bossa 'Ad'"`
- `"sef secicisinde '+ Yeni Personel Ekle' YOK"`
- `"ISG secicisinin son secenegi 'Dis Kaynak — OSGB'"`
- `"ISG etiketinde zorunluluk yildizi YOK, ipucu 'ISG mevzuati geregi zorunlu' VAR"`
- `"durum secicisi varsayilan olarak Aktif secili"`
- `"kullanici listesi yuklenirken seciciler disabled + 'Yukleniyor…'"`
- `"kullanici listesi hatasinda disabled + 'Kullanicilar yuklenemedi', form gonderilebilir kalir"`
- `"secicilerin altinda 'Listede aradiginiz kisi yoksa…' notu basar"`

**403 zarif düşüşü — ayrı `describe` bloğu (TZ-4b, kullanıcı kararı 2026-07-30):**
- `"(a) kullanici sorgusu 403 donunce form COKMEZ, kartlar render edilir"`
- `"(b) sef ve ISG secicilerinin altinda gorunur aciklama basilir"` (metin sabitten;
  spec onayına kadar sabit tek yerde)
- `"(b2) aciklama role/aria ile secicilere baglidir (aria-describedby)"`
- `"403'te seciciler disabled ve BOS acilir listeyle SESSIZCE birakilmaz"`
  (negatif: açıklama olmadan boş `<select>` kalması testi kırar)
- `"(c) 403'e ragmen 'Santiyeyi Olustur' calisir; govdede site_manager_user_id=null,
  safety_officer_user_id=null, safety_officer_is_outsourced=false gider"`
- `"(c2) 403'te sef zorunlulugu KALKAR — 'Santiye sefi seciniz.' hatasi basilmaz"`
- `"(d) 403 diger alanlari etkilemez: ad, il/ilce, insaat alani, tarihler yazilabilir
   ve zorunluluklari aynen isler"`
- `"(d2) 403'te tum formu kapatan AccessDenied basilmaz"`
- `"liste geldiginde sef zorunlulugu yeniden isler"` (403 gevşemesi kalıcı değil)

`src/components/site-form/LocationCard.test.tsx` (**yeni**):
- `"GPS alani serbest metindir: 'kuzey kapi' girilince hata uretmez"`
- `"GPS alani type=text'tir ve hicbir normallestirme yapmaz"`
- `"Acik Adres textarea'dir ve iki sutuna yayilir"`
- `"Kat Sayisi metin alanidir, type=number degildir"`
- `"Insaat Alani zorunluluk yildizi tasir, Arsa Alani tasimaz"`

`src/components/site-form/ScheduleCard.test.tsx` (**yeni**):
- `"Sure alani readOnly'dir"`
- `"iki tarih girilince sure uc-dahil hesaplanir (01.01-10.01 => 10)"`
- `"tek tarih girilince sure alani bos kalir, 0 basmaz"`
- `"ters tarihte sure alani bos kalir"`

`src/components/site-form/form-state.test.ts` (**yeni**):
- `"emptySiteFormValues durumu 'active' baslatir"`
- `"emptySiteFormValues sekiz tesis kutucugunu da false baslatir"`

**Dosyalar:**
`src/components/site-form/SiteInfoCard.tsx`, `LocationCard.tsx`, `ScheduleCard.tsx`
(+ üç test), `form-state.ts` (+ test), `site-form.css`, `SiteCreateView.tsx` (kartları bağlar)

**Tuzaklar:**
- **Kişi seçicileri sistem yöneticisi dışındaki rollerde boş gelir — bu BEKLENEN
  davranıştır, hata olarak raporlanmasın** (TZ-4b). Manuel/canlı doğrulamada "seçiciler
  boş" bulgusu **kusur değildir**; kusur olan, açıklamanın basılmamasıdır.
- İSG seçicisinin `"__outsourced__"` sabiti **gövdeye gitmez** — T10'daki gövde
  derleyicisi onu `{ safety_officer_user_id: null, safety_officer_is_outsourced: true }`'e
  çevirir. Sabit dize `site-form/constants.ts`'te tek yerde durur.
- `Süre` alanı gövdede **gönderilmez** (türev, spec §8.2).
- Ham `<label>` yasak → hepsi `Field` render-prop'uyla (TZ-6).

**Kabul kriteri:** dört kapı yeşil; üç kart mockup satır 63–99 ile birebir; GPS'te
sıfır doğrulama; süre türevi uç-dahil.

**Kapı:** `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

---

## Task T7 — Kart 4: Bölümler (Fazlar) tablosu

**Boyut:** L · **Bağımlı:** T0, T2, T4, T5 · **Spec:** §4.4, §6
**RİSKLİ:** en karmaşık etkileşim yüzeyi (satır ekle/sil, odak yönetimi, klavye, yer tutucu sütun).

**Ne yapılacak:** mockup satır 102–144. Kart `.pf-card--flush` (`padding:0; overflow:hidden`).

- Başlık şeridi (103–106): başlık + yan not + "+ Bölüm Ekle" metin butonu.
- Gerçek `<table>`: `<caption class="sr-only">Bölümler</caption>`, `<th scope="col">`.
  Altı sütun: Bölüm Adı · Sorumlu (170px) · Başlangıç (130px) · Bitiş (130px) ·
  **Tahmini Bedel (130px, YER TUTUCU)** · eylem (40px).
- Satır kontrolleri: `size="row"` `Input`/`Select` (T2).
- **Tahmini Bedel hücresi:** kontrol **YOK**, düz `—`, sağa dayalı,
  `title={pendingModuleLabel("boq")}`, `<span class="sr-only">İş kalemlerinden
  hesaplanacak</span>`, odak sırasında **yok**.
- Alt satır (134–137): kesikli "Bölüm ekle" butonu (**"veya şablon kullan" YOK**, §11.3).
- Satır modeli `SectionRow` (spec §6.1): `id` istemci id'si — **index key OLAMAZ**.
- Başlangıçta **bir boş satır**; hepsi silinirse boş durum satırı basılır.
- `×` butonu: `aria-label="{n}. bölümü sil"`, **ağ isteği yok, izin kapısı yok** (TZ-9).
- Klavye (§6.6): tablo içinde `Enter` → `preventDefault` + yeni satır + odak yeni satırın
  adına; form **gönderilmez**. `Escape` → hiçbir şey.
- Doğrulama (§6.5) mesajları **tablonun altında** listelenir (`{n}. satır: {mesaj}`),
  hatalı hücre kırmızı kenarlık + `aria-describedby`.

**Önce testler — KIRMIZI GÖR:**

`src/components/site-form/SectionsCard.test.tsx` (**yeni**):
- `"acilista bir bos satir vardir"`
- `"basliktaki '+ Bolum Ekle' yeni satir ekler ve odak yeni satirin adina gider"`
- `"alttaki kesikli buton da ayni isi yapar"`
- `"kesikli butonun metni 'Bolum ekle'dir — 'veya sablon kullan' YOK"`
- `"× butonu satiri kaldirir ve hicbir ag istegi atmaz"`
- `"son satir da silinebilir; sifir bolum gecerlidir"`
- `"tum satirlar silinince bos durum satiri basar"`
- `"silme sonrasi odak sonraki satirin adina, yoksa kesikli butona gider"`
- `"Tahmini Bedel hucresinde hicbir input yoktur"`
- `"Tahmini Bedel hucresi '—' metni + boq pendingModuleLabel title'i tasir"`
- `"sekme sirasi: ad -> sorumlu -> baslangic -> bitis -> sil"`
- `"tablo icinde Enter yeni satir ekler ve formu GONDERMEZ"`
- `"tablo icinde Escape hicbir sey yapmaz"`
- `"sorumlu secicisinin degeri user.id'dir"`
- `"kullanici sorgusu 403 iken sorumlu secicisi disabled acilir ve tablo altinda
   gorunur aciklama basar"` (TZ-4b — sessiz boş liste yasak)
- `"403'e ragmen bolum satiri eklenebilir ve govdede manager_user_id gonderilmez"`
  (sorumlusuz bölüm geçerlidir; `manager_user_id` nullable)
- `"satir silme butonu aria-label='{n}. bolumu sil' tasir"`
- `"satirlar id ile anahtarlanir, index ile degil"` (satır ekleyip baştaki satırın
  girdisini değiştirerek karışma olmadığı doğrulanır)
- `"tablo caption ve th scope=col tasir"`

`src/components/site-form/sections-validate.test.ts` (**yeni**):
- `"tumu bos satir sessizce atilir, hata uretmez"`
- `"adi bos ama baska alani dolu satir 'Bolum adi zorunludur.' hatasi verir"`
- `"bolum bitis < baslangic 'Bolum bitis tarihi baslangictan once olamaz.' verir"`
- `"ayni ad iki satirda uyari uretmez"`
- `"taslakta adsiz-dolu satir hata vermez, sessizce atilir"`
- `"taslakta bolum tarih sirasi yine uygulanir"`
- `"collectSectionInputs govdeye {name, manager_user_id?, start_date?, end_date?} uretir"`
- `"govdede sort_order YOK"`
- `"govdede estimated_amount YOK"`
- `"govdede manager_name YOK"`

**Dosyalar:** `src/components/site-form/SectionsCard.tsx` (+ test),
`src/components/site-form/sections-validate.ts` (+ test),
`src/components/site-form/site-form.css`, `SiteCreateView.tsx`

**Tuzaklar:**
- `Enter`'ın form gönderimini engellemesi **yalnız tablo içinde** geçerlidir; tablo
  dışında varsayılan gönderim (Şantiyeyi Oluştur) korunur (§6.6).
- Odak yönetimi (`useRef` + yeni satırın id'si) test edilebilir olmalı — `document.activeElement`
  iddiaları jsdom'da çalışır ama render sonrası `await` gerekir.
- `useCreateSection` bu formda **kullanılmaz** (§3.4) — import edilmesi bile ölü koddur.

**Kabul kriteri:** dört kapı yeşil; 17 + 10 test yeşil; Tahmini Bedel hücresinde sıfır
kontrol; gövde derleyicisi `sort_order`/`estimated_amount`/`manager_name` üretmiyor.

**Kapı:** `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

---

## Task T8 — Kart 5: Depo & Şantiye Altyapısı

**Boyut:** M · **Bağımlı:** T0, T2, T5 · **Spec:** §4.5, §7, §11.12

**Ne yapılacak:** mockup satır 147–174.

- Üst ızgara `.pf-grid--2`: solda **Depo Alanları** (3 kutucuk), sağda
  **Şantiye Tesisleri** (5 kutucuk). Her liste `#f8fafc` zeminli, `--radius-9` köşeli,
  12px iç boşluklu kutu; satır aralığı `--space-checkbox-list-gap`.
- Anahtarlar **backend sözleşmesinden** (spec §4.5 tablosu): `closed_warehouse,
  open_storage, cold_storage, site_office, canteen, changing_room_wc, dormitory, infirmary`.
  Eski `d1_kapali_ambar` / `santiye_ofisi` anahtar seti **kullanılmaz**.
- **Sekizi de işaretsiz başlar** (§11.12). Mockup'taki 6 `checked` örnek veridir.
- Her liste `role="group"` + `aria-labelledby={grup etiketi id}`.
- Alt ızgara `.pf-grid--3`: Elektrik Aboneliği (mono) · Su Aboneliği (mono) ·
  Planlanan İşçi Sayısı (`type=number`, sağa).
- Sayaç/rozet/çip/arama **yok** (§7).

**Önce testler — KIRMIZI GÖR:**

`src/components/site-form/FacilitiesCard.test.tsx` (**yeni**):
- `"sekiz kutucugun HEPSI isaretsiz acilir"`
- `"depo grubunda 3, tesis grubunda 5 kutucuk vardir"`
- `"kutucuk etiketleri mockup metinleriyle birebir"` (8 etiket)
- `"her grup role=group ve aria-labelledby tasir"`
- `"kutucuk isaretlenince ilgili facilities anahtari true olur"`
- `"cip, sayac veya arama kutusu YOK"`
- `"grup basliklari 'Depo Alanlari' ve 'Santiye Tesisleri'"`
- `"planlanan isci sayisi type=number'dir"`

`src/components/site-form/form-state.test.ts` (T6'da açıldı, genişletilir):
- `"buildFacilities sekiz anahtari da uretir, isaretsizler false"`

**Dosyalar:** `src/components/site-form/FacilitiesCard.tsx` (+ test),
`src/components/site-form/constants.ts` (kutucuk listesi sabiti),
`form-state.ts`, `site-form.css`

**Tuzaklar:**
- İki grup **yalnız görseldir**; veride tek düz `facilities` nesnesi vardır (§3.2.1).
  "depo" ve "tesis" diye ayrı iki state alanı **açılmaz**.
- Sekiz anahtar gövdeye **her zaman** gider (`false` dahil, §4.5).

**Kabul kriteri:** dört kapı yeşil; sekiz kutucuk işaretsiz; anahtarlar backend adlarıyla;
`role="group"` a11y'si testli.

**Kapı:** `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

---

## Task T9 — Kart 6: Belgeler yer tutucusu + alt eylem şeridi ✅ backend'siz

**Boyut:** M · **Bağımlı:** T1, T5 · **Spec:** §4.6, §4.7, §11.8, §11.9, §11.10

**Ne yapılacak:** mockup satır 177–229. **Yükleme kodu YAZILMAZ** (TZ-7).

1. **📎 Şantiye Belgeleri** — T1'de genelleştirilen `DocumentsPlaceholderCard`'a
   `columns={3}` (satır 179) + altı kalemlik dizi (spec §4.6 tablosu: emoji, ikon zemini
   token'ı, başlık, alt başlık) verilir. Kart başlığı yanında not:
   "Belge modülü bekleniyor — şantiyeyi oluşturduktan sonra belgeleri yükleyebileceksiniz."
2. Alt sürükle-bırak alanı (211–216): `.pf-doc--drop`, "Diğer şantiye belgelerini
   sürükleyin" + "Sigorta poliçesi, çevre izni, hafriyat izni vb." — **tıklanamaz**.
3. **Alt eylem şeridi** (219–229): `FormActions variant="split"` (T1).
   - Sol: **edilgen kutucuk** `ui/checkbox size="lg"` (T2), `disabled` + **işaretsiz**,
     metin "Oluşturduktan sonra poz dağılımı ekranına git",
     `title={pendingModuleLabel("contracts")}`.
   - Sağ: İptal · Taslak Kaydet · Şantiyeyi Oluştur.
   - Bu task'ta üç butonun `onClick`'i **`noop`**; T10 bağlar.

**Önce testler — KIRMIZI GÖR:**

`src/components/site-form/SiteDocumentsCard.test.tsx` (**yeni**):
- `"alti belge kutusu basar ve izgara uc sutundur"`
- `"hicbir yerde input[type=file] YOK"`
- `"hicbir kutuda onDrop/onDragOver isleyicisi YOK"` (prop denetimi)
- `"her kutu 'Yakinda' rozeti ve documents pendingModuleLabel title'i tasir"`
- `"kutular aria-disabled=true tasir ve odak sirasinda degildir"`
- `"mockup'taki zorunluluk yildizlari basilmaz"`
- `"surukle-birak alani basar ama tiklanabilir degildir"`
- `"kart basliginda 'Belge modulu bekleniyor…' notu vardir"`

`src/components/site-form/SiteFormActions.test.tsx` (**yeni**, ya da `SiteCreateView.test.tsx`
içinde):
- `"eylem seridi split varyantiyla basar"`
- `"poz dagilimi kutucugu disabled ve isaretsizdir"`
- `"poz dagilimi kutucugu contracts pendingModuleLabel title'i tasir"`
- `"ust bar ve alt serit ayni uc eylemi sunar"`

**Dosyalar:** `src/components/site-form/SiteDocumentsCard.tsx` (+ test),
`src/components/site-form/document-items.ts` (altı kalem sabiti),
`SiteCreateView.tsx`, `site-form.css`

**Tuzaklar:**
- İkon zeminleri **mevcut token'lardan** (`--color-danger-soft`, `--color-warning-soft`,
  `--color-primary-soft`, `--color-accent-purple-soft`, `--color-success-soft`,
  `--color-success-tint`) — yeni renk açılmaz.
- Yer tutucu kutular `<div aria-disabled="true">`, `cursor:default`, `:hover` **kapalı**.

**Kabul kriteri:** dört kapı yeşil; `input[type=file]` sıfır; altı kutu + sürükle-bırak
mockup satır 177–217 ile birebir; ★ basılmamış; eylem şeridi `split`.

**Kapı:** `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

---

## Task T10 — Gönderim: gövde derleyicisi + doğrulama + taslak + durumlar

**Boyut:** L · **Bağımlı:** T6, T7, T8, T9 (+ T0) · **Spec:** §9.3, §9.4, §10, §12
**RİSKLİ:** atomik gönderim; tek istekte 30+ alan; kısmi başarı yolu **yok**.

**Ne yapılacak:**

1. **Gövde derleyicisi** `buildSiteCreateBody(values, { isDraft })` (spec §9.3):
   - boş metin → `null`; `code` boşsa **anahtar hiç yok**
   - sayılar boşsa `null`, doluysa `Number(...)`
   - İSG `"__outsourced__"` → `{ safety_officer_user_id: null, safety_officer_is_outsourced: true }`
   - `facilities` sekiz anahtar **her zaman**
   - `sections` `collectSectionInputs()`'ten (T7)
   - **Gönderilmeyenler:** `site_manager_name`, `safety_officer_name`,
     `sections[].manager_name`, `sections[].sort_order`, `sections[].estimated_amount`,
     `duration_days`, `delivery_date`, `project_id`, belge alanları
2. **Doğrulama** `validateSiteForm(values, { isDraft })` (spec §10) — mesajlar
   `MESSAGES` sabitinde, metin envanteri #82 kapsamı.
3. **Taslak yolu** (§9.4): aynı uç, `is_draft: true`; yalnız `name` zorunlu.
4. **Durumlar** (§12): kaydediliyor (üç buton `disabled`, birincil metni "Kaydediliyor…",
   alanlar `disabled` **değil**), sunucu hatası `.pf-form-error` şeridi, 409 kod çakışması
   alan hatası.
5. **Yönlendirmeler:** oluştur → `/projeler/{projectId}/santiyeler/{yeni siteId}`
   (yanıt `SiteDetailResponse`, `id` taşır); taslak → `/projeler/{projectId}`;
   iptal → `/projeler/{projectId}`. `beforeunload` uyarısı **yok**.
6. İlk hatalı alana **odak**; hata özeti `role="alert"`.

**Önce testler — KIRMIZI GÖR:**

`src/components/site-form/build-body.test.ts` (**yeni**):
- `"kod bosken govdede 'code' anahtari HIC YOK"`
- `"bos metin alanlari null gider"`
- `"sayi alanlari bosken null, doluyken Number"`
- `"GPS metni oldugu gibi gider: '41.0082N 28.9784E'"`
- `"'Dis Kaynak — OSGB' secilince is_outsourced=true ve user_id=null"`
- `"kullanici secilince user_id UUID, is_outsourced=false"`
- `"hicbiri secilmeyince user_id=null, is_outsourced=false"`
- `"facilities sekiz anahtari da tasir, isaretsizler false"`
- `"govdede site_manager_name / safety_officer_name YOK"`
- `"govdede duration_days, delivery_date, project_id YOK"`
- `"govdede belge anahtari YOK"`
- `"durum secimi preparation/active/on_hold olarak gider"`
- `"is_draft=true taslak yolunda gider"`

`src/components/site-form/validate.test.ts` (**yeni**):
- yedi zorunlu alan mesajı (spec §10.1 tablosu) — her biri ayrı test
- `"ISG Uzmani zorunlu DEGILDIR"`
- `"kullanici listesi yuklenemediginde (403) sef zorunlulugu kalkar"` (TZ-4b)
- `"kullanici listesi geldiginde sef zorunlulugu aynen isler"`
- `"GPS icin hicbir dogrulama kurali yoktur"`
- `"bitis < baslangic 'Planlanan bitis tarihi baslangictan once olamaz.' verir"`
- `"negatif deger 'Deger negatif olamaz.' verir"`
- `"isci sayisi ondalikli 'Isci sayisi tam sayi olmalidir.' verir"`
- `"taslakta yalniz ad zorunlu, digerleri atlanir"`
- `"taslakta ad bosken yine hata verir"`
- `"taslakta tarih sirasi ve negatif kurali UYGULANIR"`

`src/components/site-form/SiteCreateView.test.tsx` (T5'te açıldı, genişletilir):
- `"'Santiyeyi Olustur' tek POST atar ve bolumleri ayni govdede gonderir"`
- `"useCreateSection HIC cagrilmaz"`
- `"basarida /projeler/{id}/santiyeler/{yeni siteId}'e yonlendirir"`
- `"'Taslak Kaydet' is_draft=true ile POST atar"`
- `"taslak basarisinda /projeler/{id}'e yonlendirir"`
- `"'Iptal' /projeler/{id}'e gider ve beforeunload uyarisi vermez"`
- `"kaydederken uc buton da disabled, birincil metni 'Kaydediliyor…'"`
- `"kaydederken form alanlari disabled DEGIL"`
- `"409'da 'Bu santiye kodu zaten kullaniliyor…' mesaji basar"`
- `"dogrulama basarisizsa ilk hatali alana odak tasinir"`
- `"hata ozeti role=alert ile duyurulur"`
- `"kismi basari mesaji YOKTUR"` (metin envanterinde olmadığının negatifi)

**Dosyalar:** `src/components/site-form/build-body.ts` (+ test),
`src/components/site-form/validate.ts` (+ test), `SiteCreateView.tsx` (+ test),
`src/lib/api/hooks/useSiteMutations.ts` (`SiteCreateRequest` tipi genişlemiş gövdeyi
kabul eder — üretilmiş tipten gelir, elle genişletilmez)

**Tuzaklar:**
- **Atomiklik istemcinin işi değildir** — tek istek atılır, backend transaction'ı
  garantiler (§3.4). İstemcide "önce şantiye sonra bölümler" yedek yolu **yazılmaz**.
- `useCreateSite` bugün `SiteListItem` döndürüyor; backend dilimi sonrası
  `SiteDetailResponse` döner ve `id` taşır. Yönlendirme buna dayanır — dönüş tipi
  üretilmiş şemadan doğrulanır, varsayılmaz.
- `useCreateSite` önbellek geçersizleştirmesi (`SITES_QUERY_KEY` + `PROJECT_QUERY_KEY`)
  **değişmez** (§9.5).

**Kabul kriteri:** dört kapı yeşil; uçtan uca form çalışıyor; tek POST; taslak yolu;
üç yönlendirme; `useCreateSection` çağrısı sıfır.

**Kapı:** `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

---

## Task T11 — `SiteFormModal`'ın silinmesi + iki butonun `Link`'e çevrilmesi

**Boyut:** S · **Bağımlı:** T10 · **Spec:** §2.3, §16.1
**RİSKLİ:** modal kaldırma + görsel baseline kayması (TZ-3).

**Ne yapılacak:**

1. `src/components/project-detail/SiteFormModal.tsx` ve `SiteFormModal.test.tsx` **silinir**.
2. `src/app/(app)/projeler/[projectId]/page.tsx`:
   - `:10` import kaldırılır
   - `:64` `isSiteFormOpen` state kaldırılır
   - `:95–97` koşullu render kaldırılır
   - `AddSiteButton` `onClick` yerine `href` alır → `Link` döner,
     `project-detail__add-btn` sınıfı **korunur**
   - iki çağrı noktası (üst bar, boş durum) **aynı** `/projeler/{projectId}/santiyeler/yeni`
     linkine gider
3. Ölü kod taraması: `useCreateSite`'ın başka çağrısı kaldı mı (P1.1a satır içi şantiye
   akışı ayrı uçtan gider, dokunulmaz).

**Önce testler — KIRMIZI GÖR:**

`src/app/(app)/projeler/[projectId]/page.test.tsx` (mevcut, güncellenir):
- `"ust bardaki '+ Santiye Ekle' /projeler/{id}/santiyeler/yeni linkidir"`
- `"bos durumdaki '+ Santiye Ekle' ayni linke gider"`
- `"iki buton da project-detail__add-btn sinifini korur"`
- `"SiteFormModal artik render edilmiyor"` (tıklayınca modal açılmadığı)
- Mevcut modal testleri **silinir** (davranış artık yok)

**Dosyalar:**
- silinen: `src/components/project-detail/SiteFormModal.tsx`, `SiteFormModal.test.tsx`
- düzenlenen: `src/app/(app)/projeler/[projectId]/page.tsx` (+ `page.test.tsx`),
  `src/components/project-detail/index.ts` (barrel varsa)

**Tuzaklar:**
- `SectionFormModal.tsx` **dokunulmaz** (TZ-5).
- `<button>` → `<a>` dönüşümü stil sınıfı korunsa bile küçük görsel fark üretebilir
  (`text-decoration`, `line-height`, `display`). CSS'te `.project-detail__add-btn`'e
  gerekiyorsa `text-decoration: none` + `display: inline-flex` eklenir — **yeni token
  gerekmez**. Bu, T13 baseline turunun **2. kalemi**.

**Kabul kriteri:** dört kapı yeşil; `SiteFormModal` referansı repoda sıfır
(`grep -r SiteFormModal src` boş); iki buton aynı linke gidiyor; sınıf korunmuş.

**Kapı:** `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

---

## Task T12 — Test tamamlama + BFF allow-list kapısı

**Boyut:** M · **Bağımlı:** T11 · **Spec:** §14

**Ne yapılacak:** spec §14'ün birim/bileşen listesinde T6–T11'de **karşılanmamış** kalan
maddeleri kapat ve kapıları koş. Bu task **yeni yüzey açmaz**, boşluk doldurur.

Kapatılacak boşluklar (T6–T11 sonrası kalanlar):
- `form-control-metrics.test.ts` — `size="row"` / `size="lg"` ölçüleri (T2'de yazıldıysa no-op)
- BFF: `route.test.ts:380` dinamik allow-list testi yeni hook'lardan sonra yeşil;
  ayrıca `grep -n "projects\|sites\|users" src/app/api/backend/[...path]/route.ts` ile
  üç kökün varlığı **kapı olarak** doğrulanır (TZ-4)
- `field-adoption.test.ts` yeşil (ham `<label>` sızmamış)
- Kapsam: `src/components/site-form/` altındaki her dosyanın testi var mı — yoksa yazılır

**Önce testler — KIRMIZI GÖR:** boşluk analizinde eksik çıkan her madde için önce test.

**Dosyalar:** `src/components/site-form/**/*.test.tsx`,
`src/app/api/backend/[...path]/route.test.ts` (gerekirse),
`src/components/ui/form-control-metrics.test.ts`

**Kabul kriteri:** dört kapı yeşil; spec §14'ün birim/bileşen listesindeki **her madde**
bir teste eşlenmiş (task çıktısı: madde → test adı eşleme tablosu); allow-list testi yeşil.

**Kapı:** `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

---

## Task T13 — Görsel regresyon + baseline turu (TEK tur)

**Boyut:** M · **Bağımlı:** T12 · **Spec:** §14 (görsel), TZ-2, TZ-3
**RİSKLİ:** üç baseline aynı anda kayıyor; macOS'ta PNG üretmek yasak.

**Ne yapılacak:**

1. `e2e/site-form-visual.spec.ts` (**yeni**) — 1440px'te
   `/projeler/{id}/santiyeler/yeni` tam sayfa anlık görüntüsü
   (`santiye-formu-chromium-linux.png`).
2. `e2e/mock-backend.ts` genişletilir: `GET /users` yanıtı (seçiciler için),
   `POST /projects/{id}/sites` yanıtı (yeni alanlarla, `SiteDetailResponse` şekli),
   proje detay yanıtı zaten var.
3. **macOS'ta `pnpm test:visual` KOŞULMAZ, `.png` ÜRETİLMEZ.**
4. Baseline turu (tek `workflow_dispatch`):

```
gh workflow run visual-baselines.yml --ref feat/santiye-formu
# koşum bitince:
gh run download <run-id> -n <artifact>
# arşiv e2e/ altına açılır, TEK commit
```

5. Turdan çıkan üç anlık görüntü **kontrol edilir**:
   - `santiye-formu-*.png` — **yeni** (beklenen)
   - `proje-detay-*.png` — T11 buton→link (beklenen; fark **yalnız** butonlarda olmalı,
     başka yerde fark varsa **T11 regresyonudur**)
   - `projects-*.png` + `project-form-new-*.png` — T1'in CSS taşımasından **fark
     ÇIKMAMALI**. Çıkarsa T1'in "sıfır görsel fark" kabul kriteri ihlal edilmiştir →
     kaskad hatası aranır, baseline **körlemesine kabul edilmez**.

**Dosyalar:** `e2e/site-form-visual.spec.ts`, `e2e/mock-backend.ts`,
`e2e/*-snapshots/*.png` (yalnız Linux artifact'inden)

**Kabul kriteri:** dört kapı yeşil; Linux CI görsel koşusu yeşil; commit'te **hiç macOS
PNG'si yok** (`file e2e/**/*.png` çıktısı artifact'ten geldiğini doğrular); üç baseline
kaymasının her biri **gerekçeli**.

**Kapı:** `pnpm lint && pnpm typecheck && pnpm test && pnpm build` + Linux CI görsel koşusu

---

## Task T14 — Mockup karşılaştırma kapısı + review + a11y + ölü kod

**Boyut:** M · **Bağımlı:** T13 · **Spec:** §14 (mockup kapısı), §11, §13

**Ne yapılacak:**

1. **Mockup karşılaştırma:**

```
node scripts/render-mockup.mjs "../projedesign/Form - Santiye Ekle.dc.html" /tmp/mockup-santiye.png 1440
```

   uygulamanın 1440px görüntüsüyle yan yana konur. Her sapma **satır no + beklenen +
   gerçek** üçlüsüyle raporlanır. Göz kararı "yakın duruyor" kabul edilmez.
   Spec §11'deki **14 onaylı sapma** dışındaki her fark ya düzeltilir ya spec'e eklenir
   (kullanıcı onayı) — sessizce bırakılmaz.
2. **Metin envanteri denetimi:** spec §15'in 82 satırı ekrandaki dizelerle karşılaştırılır;
   listede olmayan dize varsa **kaldırılır** (TZ-10). **İstisna:** T4'ün rapor ettiği
   403 açıklama dizesi — spec'e eklenip onaylandıysa geçerlidir, onaylanmadıysa
   **ekran bu dilimde tamamlanmış sayılmaz**.
2b. **403 sınırlaması PR açıklamasına yazılır** (TZ-4b): "kişi seçicileri sistem
   yöneticisi dışındaki rollerde boş gelir — **beklenen davranış**, hata olarak
   raporlanmasın." Manuel/canlı doğrulama notuna da girer.
3. **Review:** `ecc:react-reviewer` + `ecc:typescript-reviewer` (paralel).
   CRITICAL/HIGH bulgular kapanır.
4. **A11y denetimi** (spec §13): tek `<h1>`, kart başlıkları `<h2>`, `Field` bağlantıları,
   `aria-required`/`aria-invalid`/`aria-describedby`, kutucuk `role="group"`,
   tablo `caption` + `th scope`, devre dışı yer tutucularda `aria-disabled` + Türkçe
   `title`, odak sırası (Tahmini Bedel hücresine uğramaz), `role="alert"` hata özeti.
5. **Ölü kod:** `SiteFormModal` referansı sıfır; `useCreateSection` bu formda
   kullanılmıyor; `project-form/`'da T1 sonrası yetim kalan blok yok
   (`pnpm knip`/`ts-prune` varsa koşulur, yoksa grep).

**Dosyalar:** düzeltme çıkarsa `src/components/site-form/**`; rapor commit'e girmez
(PR açıklamasına yazılır).

**Kabul kriteri:** dört kapı yeşil; sapma raporu **satır numaralı**; listede olmayan
sapma sıfır; review CRITICAL/HIGH sıfır; a11y kontrol listesi tam; ölü kod sıfır.

**Kapı:** `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

---

# Riskli task'lar (özet)

| Task | Risk | Azaltma |
|---|---|---|
| **T1** | CSS taşıması kaskad kaydırır → P1.1a görsel regresyonu | Sınıf adı değişmez; `form-shell.test.ts` çift tanımı yasaklar; T13'te `projects` + `project-form-new` baseline'ları fark **çıkarmamalı** |
| **T2** | DOM'un kendi `size` özniteliğiyle prop çakışması | `Omit<…, "size">`; `as any` yasak; mevcut çağrı noktaları `size`'sız kalır |
| **T5** | `yeni` statik segmenti `[siteId]` dinamiğiyle çakışabilir | Next.js statik-önce kuralı testle sabitlenir; rota `(app)` grubunda kalır |
| **T7** | En karmaşık etkileşim: satır ekle/sil, odak, klavye, yer tutucu sütun | 27 test; `id` anahtarlama; `Enter` yalnız tablo içinde yakalanır |
| **T10** | Atomik gönderim, 30+ alanlı gövde, kısmi başarı yolu yok | Gövde derleyicisi ayrı saf fonksiyon + 13 test; "gönderilmeyenler" negatif testleri |
| **T11** | Modal kaldırma + `<button>`→`<a>` görsel kayması | Sınıf korunur; `grep SiteFormModal` sıfır; baseline turunda fark **yalnız butonlarda** |
| **T13** | Üç baseline aynı anda kayıyor; macOS PNG tuzağı | TEK `workflow_dispatch`; artifact indirilir; her kayma gerekçelenir |

---

# PR bölünmesi önerisi

Üç PR. İlki backend'i **beklemez** → dilim beklerken ilerleme sağlar.

### PR-A — "Form kabuğu ortaklaştırma + primitive varyantları + token'lar" (backend'siz)

**Task'lar:** T1, T3, T2, T5, T9
**Neden ayrı:** hiçbiri backend sözleşmesine dokunmuyor; T1 P1.1a'yı da ilgilendiren bir
refactor olduğu için **küçük ve erken** review edilmesi değerli.
**Riski:** T1'in kaskad riski burada yalnız P1.1a'yı etkiler → `project-form-visual` ve
`projects` baseline'ları bu PR'da **kontrol edilir** (fark çıkmamalı).
**Not:** T5 ve T9'un ürettiği sayfa bu PR'da **gezilebilir ama gönderemez** (butonlar
`noop`). Kullanıcıya görünür bir yarım yüzey bırakmamak için T5'in rotası bu PR'da
**yalnız test yoluyla** erişilir kalabilir — alternatif olarak T5+T9'u PR-B'ye kaydırın.
**Karar kullanıcıda:** yarım rotayı `main`'e almak istemiyorsanız **PR-A = T1 + T2 + T3**,
T5/T9 PR-B'ye geçer.

### PR-B — "Şantiye Ekle formu" (ana dilim, backend'e bağlı)

**Task'lar:** T0, T4, T6, T7, T8, T10, T11, T12, T14 (görsel kod dahil, PNG hariç)
**Ön koşul:** backend dilimi merge + deploy + `pnpm gen:api`.
**İçerik:** uçtan uca çalışan form, `SiteFormModal` silinmesi, testler, mockup kapısı.
**Baseline PNG'si YOK** — bu PR'ın görsel testi CI'da kırmızı görünecektir (yeni ekranın
baseline'ı yok). Bu **beklenen** durumdur; PR-C onu kapatır.

### PR-C — "Görsel baseline turu"

**Task:** T13 (artifact commit'i)
**İçerik:** tek `workflow_dispatch` artifact'inden gelen üç PNG (`santiye-formu`,
`proje-detay`, gerekiyorsa `projects`).
**Neden ayrı PR:** baseline commit'i **yalnız PNG** içermeli; kod diff'iyle karışırsa
"hangi PNG neden değişti" sorusu cevaplanamaz.

> Alternatif (daha az PR isteniyorsa): PR-B ve PR-C birleştirilir, ama baseline'lar
> **ayrı commit** olarak kalır ve commit mesajı kaymanın gerekçesini taşır.

---

# "Bitti" tanımı — kontrol listesi

Dilim ancak aşağıdakilerin **hepsi** işaretlenince biter.

### 1. Dört kapı
- [ ] `pnpm lint` yeşil
- [ ] `pnpm typecheck` yeşil (`as any` / `@ts-ignore` sıfır — `grep` ile doğrulandı)
- [ ] `pnpm test` yeşil
- [ ] `pnpm build` yeşil
- [ ] GitHub Actions CI (`ci.yml`) yeşil

### 2. Mockup karşılaştırma (T14)
- [ ] `scripts/render-mockup.mjs` ile 1440px render alındı, uygulamayla yan yana konuldu
- [ ] Her sapma **mockup satır no + beklenen + gerçek** üçlüsüyle raporlandı
- [ ] Spec §11'deki 14 onaylı sapma dışında **sapma yok**; yeni sapma çıktıysa **önce
      spec'e eklendi** (kullanıcı onayı), sonra uygulandı
- [ ] Metin envanteri (spec §15, 82 satır) ile ekrandaki dizeler birebir; listede
      olmayan dize sıfır

### 3. Baseline turu (T13)
- [ ] Baseline'lar **yalnız Linux CI** artifact'inden geldi; macOS PNG'si commit'lenmedi
- [ ] `santiye-formu-chromium-linux.png` **yeni** olarak eklendi
- [ ] `proje-detay-chromium-linux.png` kayması **yalnız buton→link** farkı; başka fark yok
- [ ] `projects` / `project-form-new` baseline'ları **fark çıkarmadı** (T1 kaskad kanıtı);
      çıktıysa gerekçesi yazıldı
- [ ] Baseline commit'i tek commit, gerekçeli mesajla

### 4. A11y (spec §13)
- [ ] Sayfada tek `<h1>`, kart başlıkları `<h2>`
- [ ] Her kontrol `Field` ile bağlı; ham `<label>` sıfır (`field-adoption.test.ts` yeşil)
- [ ] `aria-required` / `aria-invalid` / `aria-describedby` bağları testli
- [ ] Kutucuk listeleri `role="group"` + `aria-labelledby`
- [ ] Bölüm tablosu: `<caption class="sr-only">`, `<th scope="col">`, `aria-label`'lı sil butonları
- [ ] Devre dışı yer tutucular `aria-disabled="true"` + Türkçe `title`, odak sırasında değil
- [ ] Odak sırası Tahmini Bedel hücresine **uğramıyor**
- [ ] Gönderim reddinde ilk hatalı alana odak + `role="alert"` özet

### 5. Yer tutucu dürüstlüğü
- [ ] `input[type=file]` repoda bu form için **sıfır**; `onDrop` sıfır; gövdede belge alanı sıfır
- [ ] Belge kutularında ★ basılmamış, "Yakında" rozeti var
- [ ] Poz dağılımı bağlantısı ve kutucuğu edilgen (`contracts` `pendingModuleLabel`)
- [ ] Tahmini Bedel hücresinde kontrol yok, `—` + `boq` `pendingModuleLabel` + `sr-only`
- [ ] **Kullanıcı listesi 403'ünde** (TZ-4b): form çökmüyor, üç seçicinin altında
      görünür açıklama var, kaydetme çalışıyor, diğer alanlar etkilenmiyor,
      `AccessDenied` ile form kapanmıyor
- [ ] 403 açıklama dizesi **spec §15'e eklendi ve onaylandı** (uydurma dize yok)
- [ ] Spec §9.2.1 / §16.2 D1 düzeltmesi kullanıcıya raporlandı
      (`limit` varsayılan 50, tavan 200 — "20 kayıt" yanlıştı)
- [ ] 403 için yeni uç/izin gevşetmesi/sayfa döngüsü kodu **yazılmadı**

### 6. Ölü kod
- [ ] `grep -r SiteFormModal src` **boş**
- [ ] `useCreateSection` bu formda kullanılmıyor
- [ ] T1 sonrası `project-form.css`'te yetim `.pf-*` bloğu yok
- [ ] Kullanılmayan import/sabit yok

### 7. Review
- [ ] `ecc:react-reviewer` — CRITICAL/HIGH sıfır
- [ ] `ecc:typescript-reviewer` — CRITICAL/HIGH sıfır
- [ ] Yeni token'lar `tokens.css`'te, çıplak hex/px sıfır
- [ ] BFF allow-list testi yeşil; `projects`/`sites`/`users` kökleri doğrulandı

### 8. Teslim
- [ ] Ajan **push etmedi**; push/PR/merge/deploy kararı kullanıcıda
- [ ] PR açıklamasında: mockup sapma raporu + baseline kayma gerekçeleri +
      backend'e devredilen işler (D2–D4; **D1 düşer** — yanlış tespitti) + bilinen
      sınırlamalar: **kişi seçicileri sistem yöneticisi dışındaki rollerde boş gelir
      (`user_management:view` gerekiyor — beklenen davranış, hata değil)**, 200 üstü
      kullanıcıda sunucu tarafı arama gerekir (kullanıcı yönetimi diliminin işi),
      düzenleme kipi yok, detay ekranında yeni alanlar görünmüyor
