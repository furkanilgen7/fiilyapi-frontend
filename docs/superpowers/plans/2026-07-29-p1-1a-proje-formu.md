# P1.1a — Proje Oluştur formu (uygulama planı)

Tarih: 2026-07-29
Bağlı spec: `frontend/docs/superpowers/specs/2026-07-29-p1-1a-proje-formu-design.md`
Kapsam: **iki repo** — `backend/` (Task B1–B7) ve `frontend/` (Task F1–F14)
Yürütme: `superpowers:subagent-driven-development` — task-by-task, her task bağımsız review'lı

---

## ⚠️ Başlamadan önce — dal ve repo bağımlılığı

P2 (Şantiye & Bölüm) **merge'li ve canlıda**; backend `head` revizyonu `c41a7e2b9d05`.
Bu dilim iki dal açar:

```
# backend
git checkout main && git checkout -b feat/p1-1a-proje-formu
# frontend
git checkout main && git checkout -b feat/p1-1a-proje-formu
```

**İki repo tek çalışma ağacını paylaşır.** Aynı repoda **aynı anda iki ajan
çalıştırılmaz**. Backend + frontend ajanının paralel koşması serbesttir, ama
F1 (gen:api) B7'yi beklemek zorundadır (§Sıralama).

**Ürün sahibi kararları (kapalı, tartışılmaz):**

1. Sözleşme süresi **uç-dahil**: `durationDays = end − start + 1`. (Spec §11.1 cevabı.)
2. Taslak projeler, **projeyi görebilen herkese görünür**. Ayrı görünürlük kuralı yok;
   mevcut `user_project_access` filtresi aynen geçerli. (Spec §11.2 cevabı.)
3. KDV listesi (20 / 10 / 1) **kodda sabittir**. Ayarlar › Şirket Bilgileri'nden
   yönetmek ayrı bir gelecek özelliktir, bu dilimde YOK. (Spec §11.3 cevabı.)

**Spec'ten tek bilinçli sapma (planlama kararı):** spec §2 "hepsi tek Alembic
revizyonunda" diyor. Plan bunu **iki revizyona** böler — `project_status` enum
takası kendi revizyonunda izole edilir (B1), geri kalan şema ikinci revizyonda
gelir (B2). Gerekçe: enum takası canlı veriye ve iki ayrı modüle (dashboard
sayaçları, proje listesi sekmeleri) dokunan tek riskli adımdır; başarısız olursa
`employers` / `project_contracts` işini bloke etmemesi gerekir.

---

## Kurallar (her task için, istisnasız)

- **TDD:** önce test yaz, **kırmızı gör**, sonra implementasyon. Test yazmadan kod yok.
- **Backend test veritabanı — KRİTİK:** `backend/.env` içindeki `TEST_DATABASE_URL`
  **UZAK Railway sunucusunu** gösteriyor ve `tests/conftest.py` oturum başında
  `Base.metadata.drop_all` çağırıyor. Testler ASLA o URL ile koşturulmaz. Her
  backend task'ı kendi **tek kullanımlık yerel** veritabanını açar:

  ```
  # postgresql@18, port 5432
  createdb fiil_test_<taskadi>
  TEST_DATABASE_URL="postgresql+asyncpg://<localuser>@localhost:5432/fiil_test_<taskadi>" \
    .venv/bin/pytest
  dropdb fiil_test_<taskadi>     # task sonunda, başarısızlıkta bile
  ```

  Env değişkeni **komut satırında** verilir; `.env` düzenlenmez.
- **Python yorumlayıcısı:** PATH'te `python` YOK. Her zaman `.venv/bin/python`,
  `.venv/bin/pytest`, `.venv/bin/ruff`. Ruff **0.15.22**'ye sabitli
  (`pyproject.toml:34`); global 0.8.6 yanlış pozitif üretir — global ruff kullanılmaz.
- **Mockup birebir:** ölçüler spec §4'te `projedesign/Form - Proje Oluştur.dc.html`
  satır numaralarıyla verili; ortak `.f-in`/`.lbl`/`.card`/`.drop` sınıfları
  `projedesign/Formlar.dc.html`'den. **Göz kararı yasak** — her ölçü satır
  numarasıyla gerekçelendirilir.
- **Token zorunlu:** çıplak hex ve çıplak px yazılmaz. Gereken yeni token'lar
  spec §6'da listeli; eksikse `src/styles/tokens.css`'e eklenir.
- **Ham `<select>` / `<input>` / `<label>` YASAK** (bellek kuralı
  `form-kontrolleri-primitive-kurali`). `src/components/ui/` primitive'leri
  (`Field`, `Input`, `Select`, `Checkbox`) kullanılır. Eksik kontrol varsa
  `ui/` altına **primitive olarak** eklenir; yerel kontrol yazılmaz.
- **Playwright koşturma, `.png` baseline ÜRETME.** macOS'ta görsel test
  çalıştırılmaz; baseline'lar Linux CI'ın işidir (`visual-baselines.yml`,
  workflow_dispatch).
- **Kapılar:** backend task'ı → `.venv/bin/pytest` (yerel DB ile) + `.venv/bin/ruff
  check` + `.venv/bin/ruff format --check` temiz. Frontend task'ı →
  `pnpm typecheck` + `pnpm lint` + `pnpm vitest run` + `pnpm build` temiz.
- **Ajanlar push etmez.** Commit serbest; merge/push/deploy kararı kullanıcıdadır.
- **P1.1b sınırı:** belge yükleme (`<input type="file">`, bytea saklama, BOQ Excel
  içe aktarımı) ve **düzenleme kipi** (mevcut projeyi bu formda açmak, taslağı
  kesinleştirmek) bu dilimde YOK (spec §8). Hiçbir task bu sınırı geçmez.

---

# BACKEND

## Task B1 — [backend] `project_status` enum genişlemesi (izole revizyon)

**Spec:** §2.1, §7.2
**Dosyalar:** `alembic/versions/<yeni>_p1_1a_status_enum.py`,
`app/modules/projects/models.py:13`, `app/modules/dashboard/service.py:31`,
`app/modules/projects/schemas.py` (`ProjectCounts`),
`tests/modules/test_project_model.py:35`

Parent revision: **`c41a7e2b9d05`**. Yeni enum sırası:
`planning | active | on_hold | completed`.

Göç, `ALTER TYPE ... ADD VALUE` ile DEĞİL **tip takası** ile yapılır (spec §2.1'deki
yedi satırlık SQL birebir uygulanır: yeni tip → `DROP DEFAULT` → `USING
status::text::project_status_new` → eski tipi düşür → rename → `SET DEFAULT 'active'`).

**Tuzaklar:**
- `completed` **KALIR** (§7.2). `ProjectCounts.completed` ve dashboard
  `active_project_count` ona bağlı; kaldırmak canlı veriyi ve iki ekranı kırar.
- Mevcut satırların hiçbiri `planning`'e taşınmaz — göç veri değiştirmez.
- Downgrade'de **önce** `UPDATE projects SET status='active' WHERE status='planning'`,
  sonra ters takas. Sırayı ters yaparsan downgrade patlar.
- `site_status` enum'una **DOKUNULMAZ** (P2 spec §2.3 bilinçli ayrı tuttu).
- Modeldeki `Enum(ProjectStatus, name="project_status")` ile migration'daki tip
  adı aynı kalmalı; rename adımı bunu sağlıyor.

**Testler:** `planning` yazılıp okunabiliyor; mevcut üç değer korunuyor;
`{s.value for s in ProjectStatus}` beklentisi güncelleniyor; upgrade→downgrade→upgrade
turu temiz.

---

## Task B2 — [backend] Şema revizyonu 2: `employers`, `project_contracts`, `projects` sütunları, `sites` sütunu, veri göçü

**Spec:** §2.2, §2.3, §2.4, §2.6, §7.5
**Dosyalar:** `alembic/versions/<yeni>_p1_1a_proje_formu.py` (parent = B1),
`app/modules/projects/models.py`, `app/modules/sites/models.py`

Bu task **yalnız şema + model + veri göçü**dür; API uçları B3–B6'da.

İçerik:
- Yeni tablo `employers` (spec §2.2 sütun tablosu), `uq_employers_tax_number`
  **kısmi** benzersiz indeks (`WHERE tax_number IS NOT NULL`) ve `ix_employers_name`.
- Yeni enum `price_index_type`: `ufe | tufe | construction_cost | fixed_coefficient`.
- Yeni tablo `project_contracts` (1-1, `project_id` hem PK hem FK,
  `ondelete CASCADE`), CHECK'ler `ck_contract_pct_range` ve `ck_contract_escalation`.
- `projects`: `employer_id` (FK `ondelete RESTRICT`), `parcel`, `address`,
  `budget_material/labor/subcontractor/overhead` (NOT NULL default 0), `is_draft`
  (NOT NULL default false).
- `sites.construction_area_m2` `Numeric(12,2)` nullable.
- **Veri göçü:** her farklı (kırpılmış) `employer_name` için bir `employers`
  satırı üret, projelerin `employer_id`'sini bağla. Boş/NULL `employer_name`
  → `employer_id` NULL.

**Tuzaklar:**
- Kısmi indeks deseni **zaten var**: `app/modules/sites/models.py`,
  `uq_sections_site_code`. Aynı desen kopyalanır, yenisi icat edilmez.
- `employer_name` sütunu **SİLİNMEZ** — türev anlık görüntü olarak kalır
  (`app/modules/sites/schemas.py:96` ve proje liste kartları join'siz okuyor).
- `budget` mevcut değerini korur; dört kalem eski satırlarda `0` kalır ve
  **dağıtılmaz** (§7.5). `budget = Σ kalemler` değişmezi yalnız bu dilimden sonra
  yazılan satırlar için geçerlidir — bunu model dosyasında yorumla belirt.
- `sites` değişikliği additive + nullable olmalı; P2 yüzeylerini kırma.
- `tests/conftest.py` şemayı `Base.metadata.create_all` ile kuruyor; yeni modeller
  conftest'in import ettiği modüllerden erişilebilir olmalı (aksi halde tablo
  oluşmaz ve testler sessizce başka yerde patlar).

**Testler:** `employers` oluşturma; iki NULL VKN satırı serbest; aynı dolu VKN →
`IntegrityError`; `project_contracts` CHECK'leri (`vat_pct=150` reddedilir;
`has_price_escalation=false` + dolu `index_type` reddedilir); göç testi —
`employer_name` dolu satırlar `employers`'a taşınıyor ve `employer_id` bağlanıyor.

---

## Task B3 — [backend] `employers` API + `DuplicateError` → 409

**Spec:** §3.1, §3.2, §2.5, §7.6
**Dosyalar:** `app/modules/projects/schemas.py` (veya yeni
`app/modules/projects/employers_*`), `.../repository.py`, `.../service.py`,
`.../router.py`, `app/core/exception_handlers.py`

- `GET /employers` — izin **`projects` · `view`**. Sorgu: `q` (ada göre `ILIKE`),
  `active_only` (varsayılan `true`). Yanıt `EmployerListResponse { items: [] }`,
  `ORDER BY name` (sıralama DB'de, istemcide değil).
- `POST /employers` — izin **`projects` · `admin`**. Gövde `EmployerCreate`:
  `name` (1..200 zorunlu), `tax_number` (`^\d{10,11}$`, opsiyonel),
  `contact_person` (≤200, opsiyonel). `201` + `EmployerResponse`.
- Yinelenen VKN → **409** `{"detail": "Bu VKN ile kayıtlı bir işveren zaten var."}`.
  Servis önce `SELECT` ile bakar ve yeni `DuplicateError(DomainError)` fırlatır;
  handler eklenir. Mevcut `IntegrityError → 409 "Veri bütünlüğü hatası"` handler'ı
  **yarış durumu emniyet ağı olarak kalır** — kaldırma.
- VKN biçim hatası → 422, mesaj: "VKN 10 veya 11 haneli rakam olmalıdır."

**Tuzaklar:**
- **YENİ İZİN MODÜLÜ AÇILMAZ** (§2.5, §7.6). `app/modules/roles/seed_data.py`
  `MODULES` listesine 17. satır **eklenmez**, `MATRIX` (satır ~146 `"projects"`
  satırı) **değiştirilmez**. `employers` uçları `projects` modülünün
  `view`/`admin` seviyeleriyle korunur. Firma kartoteksi Alt-Proje 3'te kendi
  `companies` modülünü alacak.
- Router `require_permission("projects", AccessLevel.view|admin)` desenini
  `app/modules/projects/router.py:32,64`'ten birebir izler.

**Testler:** oluşturma 201; yinelenen VKN 409 + tam Türkçe mesaj; NULL VKN'li çoklu
satır serbest; `q` filtresi; `active_only`; `projects · full` kullanıcı `POST` →
403, `admin` → 201; `projects` izni olmayan `GET` → 403.

---

## Task B4 — [backend] `ProjectCreate` şeması, doğrulama kuralları, otomatik kod

**Spec:** §3.3, §3.5, §3.6
**Dosyalar:** `app/modules/projects/schemas.py`, `.../service.py`, `.../repository.py`

- `code` artık **opsiyonel** (`str | None`); boşsa sunucu üretir. Biçim
  `PRJ-{YYYY}-{NNN}` — o yılın mevcut `PRJ-{YYYY}-%` kodlarının en büyüğü + 1,
  3 hane sıfır dolgulu, 1'den başlar. Benzersizlik kısıtı yarışı `409`'a çevirir.
- Yeni alanlar: `status` (artık `planning` de geçerli), `parcel`, `address`,
  `employer_id`, `contract` (`ProjectContractInput`), `budget_lines`
  (`ProjectBudgetInput`, 4 alan `ge=0` varsayılan 0), `sites`
  (`list[ProjectSiteInput]`), `is_draft` (varsayılan `false`).
- `employer_name` istek gövdesinden **KALDIRILIR** (serbest metin işveren yolu kapanır).
- Doğrulama (§3.6): taslak değilken 1–7 kuralları; taslakken **yalnız 1, 4, 6, 7**.
  Var olmayan `employer_id` → 404 "İşveren bulunamadı".
  `project_type != taahhut` iken `contract`/`employer_id` gönderilirse 422
  "Sözleşme ve işveren bilgileri yalnızca taahhüt projelerine girilebilir."
  (P1'deki `ProjectTypeMismatchError` deseni ve handler'ı aynen kullanılır.)

**Tuzaklar:**
- `is_draft=true` **kural 4, 6, 7'yi atlamaz** — bunlar "eksik" değil "yanlış"
  veri kuralları (§5.2). Yalnız zorunluluk kuralları (2, 3, 5) atlanır.
- `employer_name`'i gövdeden kaldırmak mevcut testleri kırar; kırılanlar
  düzeltilir, testler `employer_id`'ye taşınır.
- P1'in `investment` / `land_share` tip tutarlılık korkuluğu **aynen kalır**.
- Kod üreticisi sayımla değil **maksimum + 1** ile çalışmalı (silinen kod
  yeniden kullanılmasın); taslaklar da kod alır (§5.3).

**Testler:** kodsuz istekte `PRJ-2026-001`; ikinci istekte `-002`; taahhüt dışı tipte
`contract` → 422; `end_date < start_date` → 422 tam mesajla; taslakta `city`'siz
istek 201, taslak olmayanda 422; yüzde 0..100 dışı → 422; olmayan `employer_id` → 404.

---

## Task B5 — [backend] Oluşturma servisi: sözleşme, bütçe, satır içi şantiyeler

**Spec:** §2.3, §2.4, §3.4, §7.7
**Dosyalar:** `app/modules/projects/service.py`, `.../repository.py`

Tek transaction içinde:
- `project_contracts` satırı yazılır (yalnız `taahhut`). `contract_no` ve `amount`
  burada otoritedir, servis bunları `projects.contract_no` / `contract_amount`
  sütunlarına **kopyalar** (anlık görüntü).
- `employer_id` doluysa `employer.name` → `projects.employer_name` kopyalanır.
- `budget = budget_material + budget_labor + budget_subcontractor + budget_overhead`
  **servis tarafından hesaplanır**; istemciden gelen `budget` yok sayılır.
- Satır içi `sites` satırları yazılır. Kod verilmemişse **P2'nin
  `app/modules/sites/service._derive_code` fonksiyonu yeniden kullanılır** —
  ikinci bir türetme mantığı YAZILMAZ.

**Tuzaklar:**
- Şantiye kodu çakışırsa `uq_sites_project_code` → 409 ve **proje de yazılmaz**.
  Yarım kayıt kesinlikle olmamalı — tek transaction, tek rollback.
- Satır içi şantiye yazımı ayrıca `sites` izni **aramaz** (§7.7); `projects · admin`
  yeterlidir. Buraya ikinci bir `require_permission` ekleme.
- `Süre (Gün)` **saklanmaz** — türevdir (§2.4). Sütun açma.
- Başlangıç/bitiş tarihi `projects.start_date`/`end_date`'te durur;
  `project_contracts`'a ikinci kopya AÇILMAZ.

**Testler:** `budget` = kalem toplamı (istemci yanlış `budget` gönderse bile);
sözleşme alanlarının `projects`'e kopyalanması; `employer_name` anlık görüntüsü;
satır içi iki şantiyenin aynı transaction'da yazılması; ikinci şantiyede kod
çakışmasında `projects` tablosunda satır oluşmaması.

---

## Task B6 — [backend] Okuma yanıtları: `employer`, `contract`, `budget_lines`, `is_draft`, `ProjectCounts.draft`

**Spec:** §3.3, §5.4, §5.5
**Dosyalar:** `app/modules/projects/schemas.py`, `.../repository.py`, `.../service.py`,
`app/modules/dashboard/service.py:31`

- `ProjectDetailResponse` ve `ProjectListItem`'e eklenir (kırıcı değil, yalnız ekleme):
  `employer: EmployerResponse | None`, `contract: ProjectContractResponse | None`,
  `budget_lines: {material, labor, subcontractor, overhead}`, `is_draft: bool`.
  `employer_name` **kalır**.
- `ProjectCounts`'a `draft: int` eklenir.
- Dashboard `active_project_count` artık `status == active AND NOT is_draft` sayar (§5.5).

**Tuzaklar:**
- Taslaklar **listede görünür** (§5.4) — filtrelenip gizlenmez. Görünürlük kuralı
  değişmez: projeyi görebilen taslağı da görür (ürün sahibi kararı 2).
- Liste sorgusunda `employer`/`contract` için N+1 açma — `selectinload`/join kullan.
- `ProjectCounts.completed` ve mevcut sekme sayaçları aynen çalışmaya devam etmeli.

**Testler:** liste yanıtında yeni alanlar; `draft` sayacı; taslak proje
`active_project_count`'a **girmiyor**; taslak olmayan aktif proje giriyor;
tek sorguda N+1 olmadığını doğrulayan sorgu sayısı testi (varsa mevcut desen).

---

## Task B7 — [backend] `openapi.json` üretimi ve backend kapısı

**Dosyalar:** `backend/openapi.json`

Tüm backend uçları bittikten sonra `openapi.json` yeniden üretilir. Bitti tanımı:
şemada `EmployerResponse`, `EmployerCreate`, `EmployerListResponse`,
`ProjectContractInput`, `ProjectContractResponse`, `ProjectBudgetInput`,
`ProjectSiteInput` var; `ProjectStatus`'ta `planning` var; `ProjectCounts.draft` var;
`GET /employers` + `POST /employers` yolları var; tüm backend kapıları yeşil.

**Tuzak:** `MetricPlaceholder` şemada düz adıyla değil
`app__modules__projects__schemas__MetricPlaceholder` olarak geçer (dashboard ve
projects'te aynı adlı iki sınıf var). Bu **beklenen davranıştır**, "düzeltme".

---

# FRONTEND

## Task F1 — [frontend] OpenAPI aktarımı ve tipler

**Bağımlılık: B7 bitmeden başlamaz.**

`backend/openapi.json` → `frontend/openapi/` → `pnpm gen:api`.

**Bitti tanımı:** üretilen tiplerde `EmployerResponse`, `ProjectContractInput`,
`ProjectBudgetInput`, `ProjectSiteInput`, `planning` durumu ve `ProjectCounts.draft`
var; `pnpm typecheck` temiz. Bu task'ta el ile tip yazılmaz.

---

## Task F2 — [frontend] Token'lar + `ui/textarea` primitive'i

**Spec:** §4.2, §6
**Dosyalar:** `src/styles/tokens.css`, `src/components/ui/textarea/` (yeni),
`src/components/ui/index.ts`, `src/components/ui/form-control-metrics.test.ts`

- Spec §6'daki 11 token eklenir (yalnız `tokens.css`'te eksik olanlar):
  `--color-form-card-accent`, `--color-badge-info-bg`, `--color-type-card-desc`,
  `--color-surface-success-soft`, `--color-success-text-soft`,
  `--color-danger-border-soft`, `--color-danger-text`, `--color-dashed-border`,
  `--radius-form-card`, `--radius-type-card`, `--form-column-max`.
- Yeni `Textarea` primitive'i (Açık Adres için): `rows` desteği,
  `resize:none; line-height:1.5`.

**Tuzaklar:**
- `Textarea` **aynı üç ölçü token'ını** kullanmak ZORUNDA:
  `--border-width-form: 1.5px`, `--space-form-y: 9px`, kontrol yüksekliği kuralı.
  `.f-in` ölçüleri zaten `ui/input` + `ui/select`'e taşındı; **yeniden ölçülmez**.
- `form-control-metrics.test.ts` `Textarea`'yı da kapsayacak şekilde genişletilir —
  bu, ölçü kaymasını yakalayan kapı testidir.
- Mevcut token varsa **yeniden tanımlama**; önce `tokens.css`'te ara.

**Testler:** `form-control-metrics.test.ts` genişlemesi (kırmızı → yeşil);
`Textarea` `Field` ile bağlı `<label>` üretiyor.

---

## Task F3 — [frontend] `derive.ts` — süre ve kâr marjı türevleri

**Spec:** §4.5, §4.8
**Dosyalar:** `src/components/project-form/derive.ts` + `derive.test.ts`

Saf fonksiyonlar, DOM'suz:

```
durationDays(start, end) = differenceInCalendarDays(end, start) + 1   // UÇ-DAHİL
totalBudget = material + labor + subcontractor + overhead
profit      = contractAmount − totalBudget
marginPct   = contractAmount > 0 ? profit / contractAmount × 100 : null
```

**Tuzaklar:**
- Süre **uç-dahil** (`+1`) — ürün sahibi kararı 1. Bunu "düzeltme".
- Tarihlerden biri boşsa `durationDays` **null** döner (0 değil). Negatifse null.
- `contractAmount` boş veya 0 → `marginPct` null; UI `—` basar, sahte `%0` YOK.
- Para hesapları float yuvarlama hatasına düşmemeli; tam sayı kuruş veya
  ondalık-güvenli yaklaşım kullanılır.

**Testler:** mockup örneği birebir — `22.400.000 − 21.860.000 = 540.000`,
`540.000 / 22.400.000 = %2,4` (satır 110, 152–155, 159). Ayrıca negatif kâr;
`contractAmount = 0`; ters tarih; boş tarih; tek günlük sözleşme (`start == end` → 1).

---

## Task F4 — [frontend] API hook'ları

**Spec:** §3.1, §3.2, §3.3, §4.1
**Dosyalar:** `src/lib/api/hooks/useEmployers.ts` + test,
`useEmployerMutations.ts` + test, `useProjectMutations.ts` (genişletilir)

- `useEmployers` → `GET /employers`.
- `useEmployerMutations` → `POST /employers`; başarıda işveren listesini
  invalidate eder; 409'u çağırana anlamlı şekilde iletir.
- `useProjectMutations` yeni `ProjectCreate` gövdesine göre genişletilir
  (`employer_id`, `contract`, `budget_lines`, `sites`, `is_draft`, opsiyonel `code`).

**Tuzaklar:**
- Tipler F1'in ürettiği tiplerden gelir; el ile arayüz yazılmaz.
- `employer_name` artık gövdede YOK — eski çağrı yerlerinden temizlenir.
- Mevcut `useSiteMutations` / `useSectionMutations` desenleri kanon; yeni bir
  sorgu-anahtarı şeması icat etme.

**Testler:** mevcut `useSites.test.tsx` deseniyle; başarı + 409 yolu.

---

## Task F5 — [frontend] `/projeler/yeni` rotası, sayfa kabuğu, `ProjectFormModal`'ın kaldırılması

**Spec:** §4.1, §4.2, §4.9, §7.10
**Dosyalar:** `src/app/(app)/projeler/yeni/page.tsx` (yeni),
`src/components/project-form/ProjectCreateView.tsx` + test,
`FormActions.tsx`, `project-form.css`,
`src/components/projects/ProjectsView.tsx`,
`src/components/project-detail/SiteFormModal.tsx:11` (yorum),
**SİLİNİR:** `src/components/projects/ProjectFormModal.tsx` +
`ProjectFormModal.test.tsx`

- Sayfa kabuğu: içerik sütunu `max-width:1000px; margin:0 auto; padding:24px 32px`
  (satır 44), sayfa alt boşluğu `padding-bottom:40px` (43), giriş animasyonu
  `fadeUp .4s ease` (15, 44), `h1` `22px/700/-.3px` (46), alt başlık `13px` (47),
  kırıntı yolu `Projeler / Yeni Proje` (34–36).
- Yapışkan form başlığı: mockup üst barındaki İptal + Projeyi Oluştur çifti
  (37–40, `padding:8px 14px` / `8px 18px`) içerik sütununun üstünde yapışkan
  başlık olarak render edilir. **Topbar + Sidebar korunur** (§7.10) — kabuktan
  çıkılmaz, rota `(app)` grubunda kalır.
- Alt eylem şeridi `FormActions`: İptal · Taslak Kaydet · Projeyi Oluştur
  (212–216 ölçüleri birebir).
- **`ProjectFormModal` tamamen silinir.** Tek çağıranı `ProjectsView.tsx:71`'dir.
  `isFormOpen` state'i ve `prj__new-btn` `onClick`'i kaldırılır; buton
  `/projeler/yeni`'ye giden `Link` olur — **görsel stil değişmez**.
- `SiteFormModal.tsx:11` yorumu "ProjectFormModal kanonu birebir izlenir" diyor;
  dosya silindiği için yorum Ayarlar form kanonuna (`settings-form`) işaret edecek
  şekilde güncellenir. **`SiteFormModal`'ın kendisine dokunulmaz** — P2 yüzeyi.

**Tuzaklar:**
- Silmeden önce `ProjectFormModal` için repo genelinde referans taraması yapılır;
  ölü import kalmamalı. `pnpm typecheck` bunu yakalar ama arama yine de yapılır.
- Bu task'ta form kartları HENÜZ YOK — kabuk + eylemler + boş gövde. Kartlar
  F6–F11'de gelir. Kapsamı büyütme.
- İptal → `/projeler`. **`beforeunload` uyarısı verilmez** (Ayarlar deseniyle
  tutarlı; veri kaybına karşı "Taslak Kaydet" var).
- Sayfada tek `<h1>`; kart başlıkları `<h2>`.

**Testler:** `/projeler/yeni` render oluyor; `ProjectsView`'da "+ Yeni Proje" artık
`/projeler/yeni`'ye giden bir link (eski modal testi silinir, yerine bu gelir);
İptal `/projeler`'e gidiyor.

---

## Task F6 — [frontend] `ProjectTypeCards` + `BasicInfoCard`

**Spec:** §4.3, §4.4, §7.1, §7.8
**Dosyalar:** `src/components/project-form/ProjectTypeCards.tsx` + test,
`BasicInfoCard.tsx` + test, `project-form.css`

**Tip kartları (50–77):** ızgara `1fr 1fr 1fr; gap:12px` (52). Seçili kart
`border:2px solid` mavi + açık mavi yüzey + `radius:12px; padding:16px` (55),
emoji `24px; margin-bottom:8px` (56), başlık `14px/700` (57), açıklama
`11px; line-height:1.5` (58); seçili olmayan varyant 63/65/66. Üç kart:
🏗 Taahhüt · 🏠 Kendi Yatırım · 🤝 Kat Karşılığı, metinler spec §4.3 tablosundan
birebir. Varsayılan seçim `taahhut` (54).

**Temel Bilgiler (81–92):** ızgara `2fr 1fr; gap:14px` (83). Alanlar spec §4.4
tablosu: Proje Adı (84), Proje Kodu mono + ipucu "Boş bırakılırsa otomatik" (85),
**Tür** `category` (86), Durum (87), İl/İlçe (88), Ada/Parsel mono (89),
Açık Adres `Textarea rows=2, grid-column:span 2` (90).

**Tuzaklar:**
- Satır 86 etiketi mockup'ta "Proje Tipi" yazıyor; **"Tür" basılır** (§7.1).
  Kayıtlı karar — sapma diye geri alınmaz.
- Durum açılırında **yalnız üç seçenek**: Planlama · **Aktif (seçili)** · Beklemede.
  `completed` UI'da görünmez ama backend'de vardır (§7.2).
- Tip seçimi **gerçek radio grubu** kalır (`role` uydurulmaz), görsel olarak
  gizlenir, kart `<label>`'dır; ok tuşlarıyla gezinilir. `:focus-visible` halkası
  karta uygulanır (mockup'ta odak stili yok — §7.8 onaylı ekleme).
- Mono alanlarda `--font-mono` token'ı (85, 89) — çıplak `'JetBrains Mono'` yazma.
- `category` seçenekleri: Konut / Ticari / Ofis / Endüstriyel / Altyapı /
  Restorasyon; mockup'ta "Ticari / Ofis" tek seçenek olduğundan değer
  `Ticari / Ofis` olarak saklanır (spec §4.4 notu).

**Testler:** varsayılan `taahhut` seçili; ok tuşuyla seçim değişiyor; her kontrol
`Field` üzerinden bağlı `<label>`'a sahip; Durum açılırında `completed` YOK.

---

## Task F7 — [frontend] `EmployerCard` + `EmployerFormModal`

**Spec:** §4.6
**Dosyalar:** `src/components/project-form/EmployerCard.tsx` + test,
`EmployerFormModal.tsx` + test

Kart kenarlığı `--color-form-card-accent` (95). Başlık rozeti "Taahhüt projesi"
`11px/400`, `--color-badge-info-bg` yüzey, `padding:2px 8px; radius:7px` (96).
Izgara `2fr 1fr 1fr; gap:14px` (97). Alanlar: İşveren Firma `Select` (98, zorunlu),
VKN `Input` mono **readOnly** (99), Yetkili Kişi `Input` **readOnly** (100).

`Select` içeriği: "Seçiniz veya yeni ekle…" + `GET /employers` sonuçları + son
seçenek **"+ Yeni İşveren Ekle"**. Seçilince `EmployerFormModal` açılır
(Ticari Ünvan ✔ · VKN · Yetkili Kişi — yalnız 3 alan). Başarıda modal kapanır,
liste invalidate edilir, yeni işveren **otomatik seçili** gelir. 409'da modal
**açık kalır** ve içinde "Bu VKN ile kayıtlı bir işveren zaten var." gösterilir.

**Tuzaklar:**
- VKN ve Yetkili Kişi formda **düzenlenmez** — işveren kartoteksi tek kaynaktır.
  İşveren seçilmemişken ikisi boş ve `disabled`.
- `Form - Isveren Ekle.dc.html`'in diğer alanları (kısa ad, cari kod, vergi
  dairesi, adres, IBAN, risk limiti, hissedar tekrarlayıcısı, firma belgeleri)
  bu dilimde **YOK** — Alt-Proje 3'ün işi. Modal 3 alandan fazlasını sormaz.
- Alt-Proje 3'ün tam firma formuna kısayol verilmez (henüz yok).
- Bu kart yalnız `project_type = taahhut` iken görünür.

**Testler:** "+ Yeni İşveren Ekle" seçimi modal açıyor; başarıda yeni işveren
seçili geliyor; 409'da modal açık kalıyor + Türkçe mesaj; işveren seçilince
VKN/Yetkili doluyor ve readOnly.

---

## Task F8 — [frontend] `ContractCard` + taahhüt dışı tip alan grupları

**Spec:** §4.5, §7.3, §7.4
**Dosyalar:** `src/components/project-form/ContractCard.tsx` + test
(+ `investment` / `land_share` alan grupları)

Üst ızgara `1fr 1fr 1fr; gap:14px` (107), ayırıcı `height:1px; margin:16px 0` (115),
alt ızgara `1fr 1fr 1fr 1fr` (116). 13 alan spec §4.5 tablosundan birebir
(108–129), varsayılanlar: Avans `20`, Teminat `5`, KDV ilk seçenek `20`,
Fiyat farkı kutucuğu **işaretli** (124, `accent-color` mavi, 15×15).
Fiyat farkı alt bloğu `1fr 1fr; gap:14px; margin-top:10px; padding-left:23px` (127).

Süre (Gün) alanı **readOnly**, `derive.durationDays`'ten beslenir, ipucu
"Tarihlerden otomatik hesaplanır" (113).

**Tuzaklar:**
- Kutucuk kapatılınca endeks bloğu **DOM'dan kaldırılır** (§7.4) — gizlenmez,
  kaldırılır. Gerekçe: `ck_contract_escalation` kapalıyken endeks saklamıyor;
  doldurulabilir görünen ama kaydedilmeyen alan yanıltıcıdır.
- KDV listesi (20/10/1) **kodda sabittir** — ürün sahibi kararı 3. Ayarlar'dan
  okuma bu dilimde yok.
- Bu kart **yalnız `taahhut`** iken görünür. Diğer iki tipte yerine P1'den gelen
  `investment` (Satış Hedefi, Arsa Maliyeti) ve `land_share` (Arsa Sahibi, paylar,
  noter tarihi, teslim tarihi, günlük ceza, teminat, hissedarlar) alan grupları
  **aynı `.card` kabuğunda, aynı `.lbl`/`.f-in` ölçüleriyle** gösterilir (§7.3).
  Bu alanları düşürmek canlı veri modelini görünmez kılar.
- Tarihler `projects.start_date`/`end_date`'e gider; ikinci kopya yok.

**Testler:** tip `taahhut` → işveren + sözleşme kartları görünür; `kendi_yatirim` →
gizli, investment grubu görünür; `kat_karsiligi` → land_share grubu görünür;
fiyat farkı kutucuğu kapanınca endeks alanları DOM'da YOK; süre alanı
tarih girilince hesaplanıyor ve readOnly.

---

## Task F9 — [frontend] `SiteRepeaterCard`

**Spec:** §4.7, §7.9
**Dosyalar:** `src/components/project-form/SiteRepeaterCard.tsx` + test

Satır ızgarası `2fr 1.5fr 1fr 40px; gap:10px; align-items:end; padding:12px;
radius:10px` açık gri yüzey (138); satırlar arası `gap:10px` (137).
Alanlar: Şantiye Adı (139), Şantiye Şefi `Select` (140), İnşaat Alanı m² mono sağa
(141), Sil butonu `1px solid` kırmızı kenar + kırmızı metin, `radius:8px;
padding:9px; height:38px`, içerik `×` (142). Ekle butonu `1px dashed`,
`radius:10px; padding:11px; 12px/500`, metin "+ Şantiye Ekle" (144).
Kart başlığı yanında gri not: "Proje birden fazla şantiyeye bölünebilir" (136).

**Tuzaklar:**
- Başlangıçta **bir boş satır** vardır (mockup böyle).
- **Sıfır satır geçerlidir** — sil butonu son satırı da silebilir; şantiyesiz proje
  geçerli bir durumdur (P2 spec §7.4). Hata gibi gösterme.
- Adı boş ama diğer alanları dolu satır **hatadır**: "Şantiye adı zorunludur."
- Şantiye Şefi `GET /users`'tan beslenir, ilk seçenek "Seçiniz…", **nullable**.
  Seçilen kullanıcının tam adı `sites.site_manager_name` (String 200) sütununa
  **metin olarak** yazılır — **FK açılmaz** (§7.9). P2'nin gerekçesi geçerli:
  şantiye şefi her zaman sistem kullanıcısı olmayabilir.
- Şantiye kodu bu formda sorulmaz; backend türetir.

**Testler:** ekle/sil; sıfır satır geçerli; adsız-dolu satır hatası; şef seçimi ad
metnine dönüşüyor; boş bırakılan tüm satırlar gönderime dahil edilmiyor.

---

## Task F10 — [frontend] `BudgetCard` + kâr marjı kutusu

**Spec:** §4.8, §7.8, §9
**Dosyalar:** `src/components/project-form/BudgetCard.tsx` + test

Izgara `1fr 1fr 1fr 1fr; gap:14px` (151); dört alan mono sağa yaslı:
Malzeme (152) · İşçilik (153) · Taşeron (154) · Genel Gider (155).
Kâr marjı kutusu (157): `margin-top:14px; padding:12px 14px;
--color-surface-success-soft; radius:9px; justify-content:space-between`.
Başlık "Tahmini Kâr Marjı" `13px/600` (158); alt satır "Sözleşme bedeli −
toplam bütçe" `11px` (158); tutar `18px/700` mono (159); yüzde `11px/600` (159).

**Tuzaklar:**
- Hesap **F3'ün `derive.ts`'inden** gelir; burada yeniden yazılmaz.
- `contractAmount` boş/0 → tutar `—`, **yüzde satırı basılmaz** (sahte %0 yok).
- `profit < 0` → kutu kırmızıya döner (`--color-danger-*`) ve metin
  **"Tahmini Zarar"** olur (§7.8 onaylı ekleme; zararı yeşil basmak yanıltıcı).
- Sayı biçimi `tr-TR`: binlik `.`, ondalık `,`, para `₺` ön ek + mono;
  yüzde `%2,4` (işaret önde). P1 §10 / spec §9 ile aynı.

**Testler:** mockup örneği (`540.000` / `%2,4`); negatif kârda kırmızı + "Tahmini
Zarar"; `contractAmount = 0` → `—` ve yüzde yok; `tr-TR` biçimi.

---

## Task F11 — [frontend] `DocumentsPlaceholderCard` (P1.1b yer tutucusu)

**Spec:** §8, §7.11
**Dosyalar:** `src/components/project-form/DocumentsPlaceholderCard.tsx` + test

Mockup'ın "📎 Proje Belgeleri" kartı **düzeniyle birebir**: aynı `1fr 1fr` ızgara
(166), aynı `.drop` kutuları (25), aynı ikon renkleri ve başlık/alt başlık
metinleri (167–202), alt sürükle-bırak alanı (204–209).

**Tuzaklar (hepsi zorunlu):**
- `<input type="file">` **render EDİLMEZ** — dosya kabul ediyormuş izlenimi olmaz.
- Kutular `aria-disabled="true"`, `cursor:default`, `:hover` efekti kapalı.
- Sağdaki "Yükle" / "İçe Aktar" rozetleri yerine gri **"Yakında"** rozeti.
- Kart başlığı yanında not: *"Belge yükleme yakında eklenecek — proje
  oluşturduktan sonra belgeleri yükleyebileceksiniz."*
- Her kutuda `title="Belge yükleme yakında (P1.1b)"`.
- Mockup'ta `*` taşıyan iki alanın (İşveren Sözleşmesi, Poz Listesi) yıldızı
  **BASILMAZ** — yüklenemeyen alanı zorunlu göstermek yanlış olur.
- `pending_module: "documents"` anahtarı `pendingModuleLabel()`'a eklenir (§7.11).
- Bu task **P1.1b sınırıdır**: gerçek yükleme, bytea, BOQ Excel içe aktarımı
  buraya sızmaz.

**Testler:** `input[type=file]` YOK; "Yakında" rozeti VAR; `aria-disabled="true"`;
zorunluluk yıldızı basılmıyor.

---

## Task F12 — [frontend] Gönderim, doğrulama ve hata mesajları (ProjectCreateView tamamlanması)

**Spec:** §4.10, §5
**Dosyalar:** `src/components/project-form/ProjectCreateView.tsx` + test

- Tüm kartları birleştirir; "Projeyi Oluştur" `is_draft:false`, "Taslak Kaydet"
  `is_draft:true` ile `POST /projects` atar.
- İstemci doğrulaması sunucununkini **taklit eder, yerine geçmez** — her ikisi de
  uygulanır. Hatalı alan `--color-danger` kenarlığı alır, mesaj alan altına
  `.hint` ölçüsünde kırmızı basılır, **ilk hatalı alana odak taşınır**, mesaj
  `aria-describedby` ile alana bağlanır.
- Mesaj tablosu spec §4.10'dan **birebir** alınır (17 satır). Sunucu 409 (kod
  çakışması) → "Proje kodu üretilemedi, tekrar deneyin."; diğer sunucu hataları
  mevcut `backendErrorMessage()` yardımcısıyla.
- Başarıda `/projeler`'e dönülür ve liste sorgusu invalidate edilir.

**Tuzaklar:**
- **Taslak Kaydet, eksik zorunlu alanlara rağmen POST atar** (§5.2) — ama tutarlılık
  kuralları (tarih sırası, negatif tutar, tip uyumu) taslakta da uygulanır.
- Taslak **tarayıcı yerel depolamasına yazılmaz** — gerçekten sunucuya kaydedilir (§5.1).
- Düzenleme kipi / taslağı kesinleştirme **bu dilimde YOK** (§5.6, §8). Form
  yalnız OLUŞTURMA yüzeyidir.
- Gönderim gövdesinde `employer_name` **yoktur**; `code` boşsa **gönderilmez**
  (boş string değil, alan yok/undefined).

**Testler:** Taslak Kaydet eksik alanlara rağmen `is_draft:true` ile POST atıyor;
zorunlu alan eksikken "Projeyi Oluştur" POST atmıyor ve ilk hatalı alana odak
taşınıyor; her doğrulama mesajı birebir metniyle; başarıda `/projeler`'e yönlenme;
409 mesajı.

---

## Task F13 — [frontend] Mockup karşılaştırma kapısı

`scripts/render-mockup.mjs "projedesign/Form - Proje Oluştur.dc.html" … 1440` ile
render alınır ve uygulama yan yana konur. Sapmalar **göz kararıyla değil ölçüyle**
raporlanır (satır numarası + beklenen değer + gerçek değer).

**Sapma sayılmayan, kayıtlı istisnalar:** "Tür" etiketi (§7.1), `completed`'in
açılırda olmaması (§7.2), tip bazlı kart değişimi (§7.3), fiyat farkı bloğunun
kaldırılması (§7.4), `:focus-visible` halkası / negatif marj kırmızısı / alan altı
hata mesajları (§7.8), şantiye şefinin FK olmaması (§7.9), uygulama kabuğunun
korunması (§7.10), belge kartının "Yakında" hali (§8).

---

## Task F14 — [frontend] Görsel spec + kod incelemesi

- `e2e/`'ye `/projeler/yeni` (1440px, taahhüt varyantı) görsel testi eklenir.
  **Baseline ÜRETİLMEZ, Playwright lokalde koşturulmaz** — Linux CI'ın işi.
- `react-reviewer` + `typescript-reviewer` çalıştırılır; CRITICAL/HIGH düzeltilir.
- Erişilebilirlik denetimi: tip kartları gerçek radiogroup; her kontrolün `Field`
  üzerinden bağlı `<label>`'ı; hata mesajları `aria-describedby` ile bağlı;
  kart başlıkları `<h2>`; sayfada tek `<h1>`; belge kartı `aria-disabled`.
- Ölü kod denetimi: `ProjectFormModal`'a referans kalmamış olmalı.

---

## Sıralama

**Backend:** B1 → B2 → B3 → B4 → B5 → B6 → B7.
**Frontend:** F1 → F2 → F3 → F4 → F5 → (F6 → F7 → F8 → F9 → F10 → F11) → F12 → F13 → F14.

**Kritik yol:** B1 → B2 → B4 → B5 → B6 → B7 → **F1** → F5 → F12 → F14.
F1 dışındaki hiçbir frontend task'ı backend'i beklemez; ama F4 (hook'lar) ve
F12 (gönderim) F1'in ürettiği tiplere bağlıdır.

**Bağımlılık notları:**
- **B7 → F1 sert bariyerdir.** `openapi.json` üretilmeden `pnpm gen:api`
  koşturulmaz ve F4/F12 el yazması tiple yazılmaz.
- **B1 izoledir.** Enum takası başarısız olursa B3 (employers API) ve F2/F3
  (token'lar, saf türevler) etkilenmez — bunlar B1'siz de ilerleyebilir.
- B3, B2'den sonra ama B4–B6'dan bağımsızdır; sıkışıklıkta öne alınabilir.
- F2 ve F3 backend'den tamamen bağımsızdır — B fazı sürerken paralel koşabilirler
  (farklı repo, kural gereği serbest).
- F5, F6–F11'in tamamından önce gelmeli (kabuk + kaldırılan modal).
- F6–F11 birbirinden bağımsızdır, ama **aynı repoda aynı anda iki ajan
  çalıştırılmaz** — sırayla koşarlar.
- F12, F6–F11'in hepsi bittikten sonra; F13 ve F14 en sonda.
