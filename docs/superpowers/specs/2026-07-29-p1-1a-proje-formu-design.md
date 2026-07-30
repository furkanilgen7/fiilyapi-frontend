# P1.1a — Proje Oluştur formu (backend + frontend tasarım)

Tarih: 2026-07-29
Mockup kanonu: `projedesign/Form - Proje Oluştur.dc.html` (1440px'te render edildi)
Form kütüphanesi: `projedesign/Formlar.dc.html` (ortak `.f-in` / `.lbl` / `.card` / `.drop`)
Yan kanon (yalnız işveren alanları için): `projedesign/Form - Isveren Ekle.dc.html`
Önceki dilimler: `2026-07-26-frontend-p1-projeler-ekrani-design.md`, `2026-07-27-frontend-p2-santiye-bolum-design.md`
Onaylı kararlar: bellek notları `p1-1-form-duzeltmesi-ve-ik`, `alt-proje-2-p2-kararlari`, `form-kontrolleri-primitive-kurali`, `mockup-birebir-tasarim-kurali`

Bu belge **iki repoyu birden** kapsar: `backend/` (FastAPI + Postgres) ve
`frontend/` (Next.js 15). Uygulama planı (task listesi) AYRI bir adımdır, burada yok.

---

## 1. Amaç ve P1'in yanlışı

Alt-Proje 2 · P1'de proje oluşturma bir **modal** olarak yazıldı
(`frontend/src/components/projects/ProjectFormModal.tsx`) — o an mockup YOKTU, bu
yüzden Ayarlar form kanonu taklit edildi. Mockup sonradan geldi ve modal ile
uyuşmuyor. Somut farklar:

| Konu | P1 (bugün) | Mockup (kanon) |
|---|---|---|
| Yüzey | 560px modal | Tam sayfa form, `max-width:1000px` (satır 44) |
| Tip seçimi | `<Select>` üç seçenek | 3 ikon kartı + açıklama (satır 52–77) |
| Durum | gönderilmiyor, sabit `active` | `Planlama / Aktif / Beklemede` seçicisi (satır 87) |
| İşveren | serbest metin `employer_name` | firma seçici + VKN + Yetkili Kişi (satır 98–100) |
| Sözleşme | yalnız no + bedel | 10 alan + fiyat farkı bloğu (satır 108–131) |
| Bütçe | hiç yok (tek `budget` sütunu) | 4 kalem + türev kâr marjı (satır 152–160) |
| Şantiye | yok | satır içi şantiye tekrarlayıcısı (satır 138–144) |
| Eylemler | Vazgeç · Kaydet | İptal · **Taslak Kaydet** · Projeyi Oluştur (satır 212–216) |
| Kod alanı | zorunlu | boş bırakılırsa otomatik (satır 85 ipucu) |

P2 (Şantiye & Bölüm) **bitti ve canlıda**; bu dilim P2 yüzeylerine dokunmaz.
`sites` tablosuna yalnız toplamalı (nullable) bir sütun eklenir (§2.6).

Ayrıca P1'de "Tip" etiketi altında iki ayrı kavram karıştı. Kalıcı ayrım:

- **`project_type`** — `taahhut` / `kendi_yatirim` / `kat_karsiligi`. UI etiketi
  **"Proje Tipi"**, ikon kartlarıyla seçilir (satır 51–77). İş modelini belirler.
- **`category`** — `Konut / Ticari-Ofis / Endüstriyel / Altyapı / Restorasyon`.
  UI etiketi **"Tür"**. Mockup satır 86 bu açılırı yanlışlıkla "Proje Tipi" diye
  etiketler; **onaylı sapmadır** (§7.1), etiket "Tür" basılır.

---

## 2. Backend — veri modeli

Hepsi tek Alembic revizyonunda. **Parent revision: `c41a7e2b9d05`** (P2 —
şantiye/bölüm; bugünkü `head`). Yeni revizyon adı önerisi
`p1_1a_proje_formu`.

### 2.1 `project_status` enum genişlemesi

Bugün: `active | on_hold | completed` (`app/modules/projects/models.py:13`).
Mockup Durum açılırı: `Planlama · Aktif · Beklemede` (satır 87, `Aktif` seçili).

Yeni enum: **`planning | active | on_hold | completed`**.

`completed` mockup'ta olmamasına rağmen **KALIR**: `ProjectCounts.completed` (P1
liste sekmesi) ve dashboard `active_project_count`
(`app/modules/dashboard/service.py:31`) bu değere bağlı; kaldırmak canlı veriyi
ve iki ekranı kırar. Mockup açılırında görünmez, ama backend değeri kabul eder ve
bir proje tamamlandığında (ileriki dilim) bu değere geçer. Onaylı sapma §7.2.

**Göç planı (tip değiştirme, `ADD VALUE` değil):** `ALTER TYPE ... ADD VALUE`
aynı işlem içinde kullanılamadığı için tip **takas** edilir:

```
CREATE TYPE project_status_new AS ENUM ('planning','active','on_hold','completed');
ALTER TABLE projects ALTER COLUMN status DROP DEFAULT;
ALTER TABLE projects ALTER COLUMN status TYPE project_status_new
  USING status::text::project_status_new;
DROP TYPE project_status;
ALTER TYPE project_status_new RENAME TO project_status;
ALTER TABLE projects ALTER COLUMN status SET DEFAULT 'active';
```

**Mevcut satırlara ne olur:** hiçbiri değişmez. `active` → `active`,
`on_hold` → `on_hold`, `completed` → `completed`. `planning`'e taşınan satır
YOKTUR; yeni değer yalnız bundan sonra oluşturulan projelerde kullanılabilir.
Sunucu varsayılanı `active` kalır (mockup satır 87'de `Aktif` seçili).

`site_status` enum'una **DOKUNULMAZ** — P2 spec §2.3 bilinçli olarak ayrı tuttu.

Downgrade: ters takas; `planning` satırları `active`'e düşürülür (downgrade
öncesi `UPDATE projects SET status='active' WHERE status='planning'`).

### 2.2 Yeni tablo: `employers`

Alt-Proje 3'ten (Firma / Cari Hesap) **öne çekilen asgari çekirdek**. Bugün
`projects.employer_name` serbest metin; aynı işveren her projede yeniden yazılıyor.

| Sütun | Tip | Null | Not |
|---|---|---|---|
| `id` | UUID | hayır | PK, `uuid4` |
| `name` | String(200) | hayır | Ticari ünvan (`Form - Isveren Ekle` satır 84) |
| `tax_number` | String(11) | evet | VKN/TCKN (mockup satır 99) |
| `contact_person` | String(200) | evet | Yetkili kişi (mockup satır 100) |
| `is_active` | Boolean | hayır | `default true`, `server_default true` |
| `created_at` / `updated_at` | TIMESTAMPTZ | hayır | proje tablosundaki desenin aynısı |

Kısıtlar:

- `uq_employers_tax_number` — **kısmi** benzersiz indeks:
  `UNIQUE (tax_number) WHERE tax_number IS NOT NULL`. VKN opsiyoneldir (mockup
  satır 99'da `*` yok), bu yüzden çoklu NULL serbest olmalı — `sections` tablosunda
  aynı desen zaten kullanıldı (`app/modules/sites/models.py`, `uq_sections_site_code`).
- `ix_employers_name` — ada göre listeleme için.

`Form - Isveren Ekle.dc.html`'deki diğer alanlar (kısa ad, cari kod, vergi
dairesi, adres, IBAN, risk limiti, yetkili kişi tekrarlayıcısı, firma belgeleri)
bu dilimde **YOKTUR** — Alt-Proje 3'ün işidir. Bu dilimin "+ Yeni İşveren Ekle"
akışı yalnız 3 alan sorar (§4.6).

### 2.3 `projects` — değişen ve eklenen sütunlar

**Kalanlar (dokunulmaz):** `id`, `code`, `name`, `project_type`, `category`,
`city`, `start_date`, `end_date`, `contract_no`, `contract_amount`, `budget`,
`progress_pct`, `created_at`, `updated_at`, ve `ProjectInvestment` /
`ProjectLandShare` / `LandShareShareholder` uzantı tabloları (P1'den; bu dilim
onları değiştirmez).

**Yeni sütunlar:**

| Sütun | Tip | Null | Varsayılan | Mockup kaynağı |
|---|---|---|---|---|
| `employer_id` | UUID FK → `employers.id` | evet | — | satır 98 |
| `parcel` | String(50) | evet | — | satır 89 "Ada / Parsel" |
| `address` | String(300) | evet | — | satır 90 "Açık Adres" |
| `budget_material` | Numeric(18,2) | hayır | `0` | satır 152 |
| `budget_labor` | Numeric(18,2) | hayır | `0` | satır 153 |
| `budget_subcontractor` | Numeric(18,2) | hayır | `0` | satır 154 |
| `budget_overhead` | Numeric(18,2) | hayır | `0` | satır 155 |
| `is_draft` | Boolean | hayır | `false` | satır 214 "Taslak Kaydet" (§5) |

FK davranışı: `ondelete="RESTRICT"` — projesi olan işveren silinemez. (Employer
silme ucu bu dilimde zaten yok; kısıt ileri dönük korkuluk.)

`employer_name` **KALIR** ve `String(200)` nullable olarak durur, ama artık
**türev/anlık görüntüdür**: `employer_id` doluysa servis her yazmada
`employer.name` değerini oraya kopyalar. Gerekçe: P1 liste ekranı, dashboard ve
`sites` şeması (`app/modules/sites/schemas.py:96`) bu alanı okuyor; join
eklemeden kırılmasınlar. Yeni kod `employer_id`'yi otorite kabul eder.

**Veri göçü:** `employer_name` dolu her farklı değer için bir `employers` satırı
üretilir (`name = employer_name`, `tax_number = NULL`,
`contact_person = NULL`) ve ilgili projelerin `employer_id`'si bağlanır.
Boşluk kırpılarak eşleştirilir; `employer_name` boş/NULL olan projeler
`employer_id = NULL` kalır.

**Bütçe sütunları ve `budget` ilişkisi:** `budget` "toplam bütçe" anlamını
korur. Bu dilimden sonra yazılan her satırda değişmez şudur:
`budget = budget_material + budget_labor + budget_subcontractor + budget_overhead`,
servis tarafından hesaplanır (istemciden gelen `budget` yok sayılır).
Göç **eski satırlara dokunmaz**: dört kalem `0` kalır, `budget` eski değerini
korur; bu dilim yalnız OLUŞTURMA yüzeyidir, eski satırlar bu formdan geçmez.
Onaylı sapma §7.5.

### 2.4 Yeni tablo: `project_contracts` (1-1)

İşveren sözleşmesi **proje düzeyindedir, tekildir**; şantiye payı BOQ dağıtımının
türevidir (P2 kararı). Bu yüzden sözleşme alanları `sites`'a değil buraya yazılır.

| Sütun | Tip | Null | Varsayılan | Mockup satırı |
|---|---|---|---|---|
| `project_id` | UUID | hayır | — | PK + FK → `projects.id` `ondelete CASCADE` |
| `contract_no` | String(100) | evet | — | 108 |
| `signature_date` | Date | evet | — | 109 |
| `amount` | Numeric(18,2) | evet | — | 110 |
| `advance_pct` | Numeric(5,2) | hayır | `20` | 117 (`value="20"`) |
| `retainage_pct` | Numeric(5,2) | hayır | `5` | 118 (`value="5"`) |
| `vat_pct` | Numeric(5,2) | hayır | `20` | 119 (ilk seçenek `20`) |
| `late_penalty_daily` | Numeric(18,2) | evet | — | 120 |
| `has_price_escalation` | Boolean | hayır | `true` | 124 (`checked`) |
| `index_type` | Enum `price_index_type` | evet | — | 128 |
| `base_index_value` | Numeric(12,3) | evet | — | 129 (`step="0.001"`) |

`price_index_type` enum: `ufe` (ÜFE), `tufe` (TÜFE), `construction_cost`
(İnşaat Maliyet Endeksi), `fixed_coefficient` (Sabit Katsayı) — mockup satır 128
sırasıyla.

Kısıtlar (CHECK):
- `ck_contract_pct_range` — `advance_pct`, `retainage_pct`, `vat_pct` hepsi `0..100`.
- `ck_contract_escalation` — `has_price_escalation = false` iken `index_type` ve
  `base_index_value` NULL olmalı. (Kapalı kutucukla dolu endeks saklanmaz.)

**Başlangıç/bitiş tarihi ve süre:** mockup satır 111–113'te sözleşme kartında
görünürler ama `projects.start_date` / `projects.end_date` sütunları
otoritedir — ikinci bir kopya AÇILMAZ. `Süre (Gün)` **saklanmaz**, türevdir
(§4.5); mockup satır 113 ipucu zaten "Tarihlerden otomatik hesaplanır" diyor.

`contract_no` ve `amount` burada otoritedir; servis her yazmada bunları
`projects.contract_no` / `projects.contract_amount` sütunlarına da kopyalar
(`employer_name` ile aynı anlık-görüntü gerekçesi: P1 liste kartları join'siz okur).

### 2.5 İzin matrisi

**Yeni izin modülü AÇILMAZ.** `employers` ve `project_contracts`, `projects`
modülünün izinleriyle korunur. Gerekçe: bugün matris 16 modül × 8 rol; işveren
kartoteksi Alt-Proje 3'te kendi modülünü (`companies`) alacak, bu dilim için
17. modül açıp sonra taşımak matrisi iki kez göç ettirmek olur. Onaylı sapma §7.6.

### 2.6 `sites` — tek toplamalı sütun

Mockup satır 141 şantiye satırında **"İnşaat Alanı (m²)"** var; `sites` tablosunda
karşılığı yok. Eklenir:

| Sütun | Tip | Null |
|---|---|---|
| `construction_area_m2` | Numeric(12,2) | evet |

Additive ve nullable — P2 yüzeylerini kırmaz, P2 ekranları bu alanı okumaz
(okuma P3'ün işidir). Şantiye kartında gösterimi bu dilimin kapsamında değildir.

---

## 3. Backend — API sözleşmesi

### 3.1 `GET /employers`

- İzin: **`projects` · `view`**.
- Sorgu: `q` (ada göre `ILIKE`, opsiyonel), `active_only` (varsayılan `true`).
- Yanıt `EmployerListResponse`: `{ items: EmployerResponse[] }`.
- `EmployerResponse`: `id, name, tax_number, contact_person, is_active`.
- Sıralama: `name` artan (`tr-TR` sıralaması istemcide değil, DB `ORDER BY name`).

### 3.2 `POST /employers`

- İzin: **`projects` · `admin`** (proje oluşturma ile aynı seviye — bu formdan
  başka çağıran yok).
- Gövde `EmployerCreate`: `name` (1..200, zorunlu), `tax_number`
  (`^\d{10,11}$`, opsiyonel), `contact_person` (≤200, opsiyonel).
- `201` + `EmployerResponse`.
- **Hata semantiği:** aynı `tax_number` varsa `409` +
  `{"detail": "Bu VKN ile kayıtlı bir işveren zaten var."}`. Servis önce
  `SELECT` ile bakar ve yeni `DuplicateError(DomainError)` fırlatır
  (`app/core/exception_handlers.py` içine 409'a eşleyen handler eklenir);
  yarış durumunda mevcut `IntegrityError → 409 "Veri bütünlüğü hatası"`
  handler'ı emniyet ağı olarak kalır.
- VKN biçimi hatalı → `422` (Pydantic), Türkçe mesaj:
  "VKN 10 veya 11 haneli rakam olmalıdır."

### 3.3 `POST /projects` (mevcut uç, genişletilir)

İzin **değişmez**: `projects` · `admin` (router yorumundaki gerekçe geçerli).

`ProjectCreate` yeni/değişen alanlar:

| Alan | Tip | Zorunlu | Kural |
|---|---|---|---|
| `code` | `str \| None` | **hayır (değişti)** | Boşsa sunucu üretir (§3.5). Verilirse 1..50 |
| `name` | `str` | evet | 1..150 |
| `project_type` | enum | evet | değişmedi |
| `status` | enum | hayır | varsayılan `active`; `planning` artık geçerli |
| `category` | `str \| None` | hayır | ≤100 — UI etiketi "Tür" |
| `city` | `str \| None` | hayır* | ≤100 — UI etiketi "İl / İlçe" |
| `parcel` | `str \| None` | hayır | ≤50 |
| `address` | `str \| None` | hayır | ≤300 |
| `employer_id` | `UUID \| None` | hayır* | Var olmayan id → `404 "İşveren bulunamadı"` |
| `contract` | `ProjectContractInput \| None` | hayır* | §2.4 alanları |
| `budget_lines` | `ProjectBudgetInput` | hayır | 4 alan, hepsi `ge=0`, varsayılan `0` |
| `sites` | `list[ProjectSiteInput]` | hayır | §3.4 |
| `is_draft` | `bool` | hayır | varsayılan `false` (§5) |
| `investment` / `land_share` | değişmedi | | P1 §3.5 tip tutarlılık korkuluğu aynen kalır |

`*` = `is_draft=false` **ve** `project_type=taahhut` iken zorunlu; ayrıntı §3.6.

`employer_name` istek gövdesinden **kaldırılır** (yalnız yanıtta türev olarak
kalır). Serbest metin işveren yazma yolu kapanır; işveren seçilir veya oluşturulur.

`ProjectDetailResponse` / `ProjectListItem` eklemeleri (kırıcı değil, yalnız ekleme):

- `employer: EmployerResponse | None`
- `contract: ProjectContractResponse | None`
- `budget_lines: { material, labor, subcontractor, overhead }`
- `is_draft: bool`
- `employer_name` — **kalır**, artık `employer.name`'in anlık görüntüsü

`ProjectCounts` yeni alan: `draft: int`.

### 3.4 Satır içi şantiyeler

`ProjectSiteInput`: `name` (1..150, zorunlu), `code` (≤50, opsiyonel),
`site_manager_name` (≤200, opsiyonel), `construction_area_m2` (`ge=0`, opsiyonel).

Aynı transaction içinde `sites` satırları yazılır; kod verilmemişse **P2'nin
`sites.service._derive_code` fonksiyonu yeniden kullanılır** (kopya türetme
mantığı yazılmaz). Proje içinde kod çakışırsa `uq_sites_project_code` →
`409`; hepsi tek transaction olduğu için proje de yazılmaz (yarım kayıt yok).

`projects` · `admin` yetkisi şantiye satırlarını yazmaya **yeter**; ayrıca
`sites` izni aranmaz — çünkü bu, proje oluşturmanın bölünmez parçasıdır.
Onaylı sapma §7.7.

### 3.5 Otomatik proje kodu

Mockup satır 85: "Boş bırakılırsa otomatik". Biçim: **`PRJ-{YYYY}-{NNN}`**
(`NNN` = o yılın 3 haneli sırası, 1'den başlar, sıfır dolgulu). Üretim, o yıl
mevcut `PRJ-{YYYY}-%` kodlarının en büyüğü + 1'dir; `projects.code` benzersiz
kısıtı yarış durumunda `409`'a çevirir ve istemci tekrar dener (formda "Proje
kodu üretilemedi, tekrar deneyin." mesajı).

### 3.6 Doğrulama kuralları (sunucu)

Taslak DEĞİLKEN (`is_draft=false`):

1. `name` zorunlu.
2. `city` zorunlu (mockup satır 88 `*`).
3. `project_type=taahhut` ise: `employer_id` zorunlu (satır 98 `*`),
   `contract.contract_no` (108 `*`), `contract.signature_date` (109 `*`),
   `contract.amount` (110 `*`), `start_date` (111 `*`), `end_date` (112 `*`) zorunlu.
4. `end_date >= start_date` — değilse `422` "Bitiş tarihi başlangıçtan önce olamaz."
5. `has_price_escalation=true` ise `index_type` ve `base_index_value` zorunlu.
6. Yüzde alanları `0..100`, para alanları `>= 0`.
7. `project_type != taahhut` iken `contract` veya `employer_id` gönderilirse
   `422` "Sözleşme ve işveren bilgileri yalnızca taahhüt projelerine girilebilir."
   (P1'deki `ProjectTypeMismatchError` deseninin aynısı, aynı handler.)

Taslak İKEN (`is_draft=true`): yalnız 1, 4, 6 ve 7 uygulanır — 2, 3, 5 atlanır (§5).

Hata gövdesi biçimi değişmez: `{"detail": "<Türkçe mesaj>"}`.

---

## 4. Frontend — yüzey

### 4.1 Rota ve dosyalar

```
src/app/(app)/projeler/
  page.tsx                    (P1 — "+ Yeni Proje" artık Link)
  yeni/page.tsx               YENİ — ProjectCreateView'ı sarar

src/components/project-form/          YENİ dizin
  ProjectCreateView.tsx        + test        sayfa kabuğu, durum, gönderim
  ProjectTypeCards.tsx         + test        3 ikon kartı
  BasicInfoCard.tsx            + test        Temel Bilgiler
  EmployerCard.tsx             + test        İşveren + "Yeni İşveren Ekle"
  ContractCard.tsx             + test        Sözleşme + fiyat farkı
  SiteRepeaterCard.tsx         + test        Şantiyeler
  BudgetCard.tsx               + test        Bütçe + kâr marjı
  DocumentsPlaceholderCard.tsx + test        P1.1b yer tutucusu (§8)
  FormActions.tsx                            İptal · Taslak Kaydet · Projeyi Oluştur
  EmployerFormModal.tsx        + test        3 alanlı hızlı işveren ekleme
  project-form.css
  derive.ts                    + test        süre + kâr marjı türevleri (saf)

src/components/ui/textarea/    YENİ primitive (Açık Adres için)

src/lib/api/hooks/
  useEmployers.ts              + test        GET /employers
  useEmployerMutations.ts      + test        POST /employers
  useProjectMutations.ts       genişletilir  yeni ProjectCreate gövdesi
```

**Silinen:** `src/components/projects/ProjectFormModal.tsx` ve
`ProjectFormModal.test.tsx`. Tek çağıran `ProjectsView.tsx:71`'dir (proje
oluşturma); başka kullanımı yoktur — doğrulandı. `ProjectsView`'daki
`isFormOpen` durumu ve `prj__new-btn` `onClick`'i kaldırılır, buton
`/projeler/yeni`'ye giden `Link` olur (görsel stil değişmez).

**Dikkat:** `src/components/project-detail/SiteFormModal.tsx:11` yorumu
"ProjectFormModal kanonu birebir izlenir" diyor. Dosya silindiği için bu yorum
Ayarlar form kanonuna (`settings-form`) işaret edecek şekilde güncellenir;
`SiteFormModal`'ın kendisi **modal kalır** (P2 yüzeyi, dokunulmaz).

### 4.2 Sayfa düzeni ve ölçüler

Kaynak: `Form - Proje Oluştur.dc.html`. Satır numaraları verilmiştir.

| Öğe | Değer | Satır |
|---|---|---|
| İçerik sütunu | `max-width:1000px; margin:0 auto; padding:24px 32px` | 44 |
| Sayfa alt boşluğu | `padding-bottom:40px` | 43 |
| Giriş animasyonu | `fadeUp .4s ease` (`translateY(8px)` → 0) | 15, 44 |
| `h1` | `font-size:22px; font-weight:700; letter-spacing:-.3px; margin-bottom:4px` | 46 |
| Alt başlık | `font-size:13px; color:#94a3b8; margin-bottom:20px` | 47 |
| Kırıntı yolu | `Projeler / Yeni Proje`, `font-size:12px; gap:5px`, ayraç rengi `#e2e8f0`, aktif `600/#1e293b` | 34–36 |

Ortak form sınıfları (`Formlar.dc.html` ile birebir aynı, `Form - Proje Oluştur`
satırları):

| Sınıf | Değer | Satır |
|---|---|---|
| `.card` | `background:#fff; border-radius:14px; border:1px solid #e2e8f0; padding:20px; box-shadow:0 1px 4px rgba(0,0,0,.06); margin-bottom:16px` | 23 |
| `.card-t` | `font-size:14px; font-weight:600; margin-bottom:16px; display:flex; gap:8px` | 24 |

> **Düzeltme, 2026-07-30.** Bu satırdaki **14px** uygulamaya yanlış geçmişti:
> `.pf-card__title` `--text-body` (13px) kullanıyordu. Şantiye formu dilimi
> paylaşılan `form-shell.css`'i mockup'a döndürdü (`--text-form-card-title:
> 14px`). Proje formunun görsel baseline'ı (`project-form-new-*`) bu yüzden
> **bilerek** kayar — kullanıcı kararı, bkz. `2026-07-30-santiye-formu-design.md`
> §5.1 ve plan TZ-3.

| `.lbl` | `font-size:12px; font-weight:600; color:#475569; margin-bottom:5px` | 20 |
| `.f-in` | `border:1.5px solid #e2e8f0; border-radius:8px; padding:9px 12px; font-size:13px; background:#fff` | 17 |
| `.f-in:focus` | `border-color:#2563eb; box-shadow:0 0 0 3px rgba(37,99,235,.1)` | 18 |
| placeholder | `color:#94a3b8` | 19 |
| `.hint` | `font-size:11px; color:#94a3b8; margin-top:4px` | 22 |
| `.req` | `color:#ef4444` | 21 |

`.f-in` ölçüleri **zaten** `ui/input` + `ui/select` primitivelerine taşındı
(`--border-width-form: 1.5px`, `--space-form-y: 9px`, kontrol yüksekliği 41px;
bkz. `src/components/ui/form-control-metrics.test.ts`). Bu dilimde yeniden
ölçülmez, aynı token'lar kullanılır. Yeni `ui/textarea` primitivesi **aynı üç
token'ı** kullanmak zorundadır ve `form-control-metrics.test.ts` ona da genişletilir.

### 4.3 Proje Tipi ikon kartları (satır 50–77)

Izgara: `grid-template-columns:1fr 1fr 1fr; gap:12px` (satır 52).

| Durum | Kart | Emoji | Başlık | Açıklama |
|---|---|---|---|---|
| Seçili | `border:2px solid #2563eb; background:#eff6ff; border-radius:12px; padding:16px` (55) | `font-size:24px; margin-bottom:8px` (56) | `14px/700; color:#1d4ed8; margin-bottom:4px` (57) | `11px; color:#3b82f6; line-height:1.5` (58) |
| Seçili değil | `border:2px solid #e2e8f0; background:#fff` (63) | aynı | `14px/700; color:#475569` (65) | `11px; color:#94a3b8` (66) |

| `project_type` | Emoji | Başlık | Açıklama | Satır |
|---|---|---|---|---|
| `taahhut` | 🏗 | Taahhüt | "İşveren adına iş yaparsın, gelir hakediş ile alınır" | 56–58 |
| `kendi_yatirim` | 🏠 | Kendi Yatırım | "Arsa senin, daire satarsın" | 64–66 |
| `kat_karsiligi` | 🤝 | Kat Karşılığı | "Arsa sahibinin, karşılığında ünite payı alırsın" | 72–74 |

Varsayılan seçim `taahhut` (satır 54 `checked`). Erişilebilirlik: mockup gizli
`<input type="radio">` kullanıyor (54); uygulamada da **gerçek radio grubu**
kalır (`role` uydurulmaz), görsel olarak gizlenir, kart `<label>`'dır —
klavyeyle ok tuşlarıyla gezinilir, `:focus-visible` halkası karta uygulanır
(mockup'ta odak stili yok; §7.8 onaylı ekleme).

### 4.4 Temel Bilgiler (satır 81–92)

Izgara: `grid-template-columns:2fr 1fr; gap:14px` (satır 83).

| Alan | Kontrol | Zorunlu | Yer tutucu / ipucu | Satır |
|---|---|---|---|---|
| Proje Adı | `Input` | ✔ | "Güneşkent Konut Kompleksi" | 84 |
| Proje Kodu | `Input` (mono) | — | "PRJ-2026-005"; ipucu "Boş bırakılırsa otomatik" | 85 |
| **Tür** (`category`) | `Select` | ✔ | "Seçiniz…" + Konut / Ticari / Ofis / Endüstriyel / Altyapı / Restorasyon | 86 |
| Durum (`status`) | `Select` | — | Planlama · **Aktif** (seçili) · Beklemede | 87 |
| İl / İlçe (`city`) | `Input` | ✔ | "Çankaya / Ankara" | 88 |
| Ada / Parsel (`parcel`) | `Input` (mono) | — | "1234 / 5" | 89 |
| Açık Adres (`address`) | `Textarea` `rows=2`, `resize:none; line-height:1.5`, `grid-column:span 2` | — | "Mahalle, Cadde, No" | 90 |

Mono alanlarda `font-family:'JetBrains Mono',monospace` (85, 89) — `--font-mono`
token'ı üzerinden.

Not: mockup satır 86 etiketi "Proje Tipi" der; **"Tür"** basılır (§7.1). Ayrıca
mockup'ta "Ticari / Ofis" tek seçenektir; `category` serbest metin sütunu olduğu
için değer `Ticari / Ofis` olarak saklanır.

### 4.5 Sözleşme Bilgileri (satır 105–132)

Üst ızgara `1fr 1fr 1fr; gap:14px` (107), ayırıcı `height:1px; background:#f1f5f9;
margin:16px 0` (115), alt ızgara `1fr 1fr 1fr 1fr` (116).

| Alan | Kontrol | Zorunlu | Varsayılan / ipucu | Satır |
|---|---|---|---|---|
| Sözleşme No | `Input` mono | ✔ | "SZL-2026-005" | 108 |
| İmza Tarihi | `Input type=date` | ✔ | — | 109 |
| Sözleşme Bedeli (₺) | `Input` mono, sağa yaslı | ✔ | — | 110 |
| Başlangıç Tarihi | `Input type=date` | ✔ | → `projects.start_date` | 111 |
| Bitiş Tarihi | `Input type=date` | ✔ | → `projects.end_date` | 112 |
| **Süre (Gün)** | `Input` mono, sağa yaslı, **readOnly** | — | ipucu "Tarihlerden otomatik hesaplanır" | 113 |
| Avans Oranı (%) | `Input` mono sağa | — | `20` | 117 |
| Teminat Kesintisi (%) | `Input` mono sağa | — | `5` | 118 |
| KDV Oranı (%) | `Select` | — | 20 · 10 · 1 | 119 |
| Gecikme Cezası (₺/gün) | `Input` mono sağa | — | "15000" | 120 |
| Fiyat farkı uygulanacak | `Checkbox` | — | **işaretli** (`accent-color:#2563eb; 15×15`) | 124 |
| Endeks Tipi | `Select` | ✔ (kutu açıkken) | ÜFE · TÜFE · İnşaat Maliyet Endeksi · Sabit Katsayı | 128 |
| Baz Endeks Değeri (D0) | `Input` mono sağa, `step=0.001` | ✔ (kutu açıkken) | "1.000" | 129 |

Fiyat farkı alt bloğu: `grid-template-columns:1fr 1fr; gap:14px; margin-top:10px;
padding-left:23px` (127). Kutucuk kapatılınca blok **DOM'dan kaldırılır** (mockup
her zaman gösteriyor çünkü statik; kapalıyken saklanan endeks olmadığı için —
bkz. `ck_contract_escalation` — gösterilmesi yanıltıcı olur; §7.4).

**Türev — Süre (Gün):** `derive.ts` içinde saf fonksiyon:
`durationDays(start, end) = differenceInCalendarDays(end, start) + 1` (her iki uç
gün dahil; mockup 640 örneği için doğrulanabilir bir tanım gerekiyordu, uç-dahil
sözleşme süresi Türkiye inşaat pratiğidir). Tarihlerden biri boşsa alan boş kalır.
Negatifse alan boş kalır ve tarih doğrulama mesajı çıkar.

Bu kart **yalnız `project_type=taahhut`** iken görünür. Diğer iki tipte yerine
P1'den gelen `investment` / `land_share` alan grupları aynı `.card` kabuğunda
gösterilir (§7.3).

### 4.6 İşveren Bilgileri (satır 94–102)

Kart kenarlığı `#bfdbfe` (95). Başlık rozeti: "Taahhüt projesi",
`font-size:11px; font-weight:400; background:#dbeafe; color:#2563eb;
padding:2px 8px; border-radius:7px` (96). Izgara `2fr 1fr 1fr; gap:14px` (97).

| Alan | Kontrol | Zorunlu | Satır |
|---|---|---|---|
| İşveren Firma | `Select` — "Seçiniz veya yeni ekle…" + `GET /employers` sonuçları + son seçenek **"+ Yeni İşveren Ekle"** | ✔ | 98 |
| VKN | `Input` mono, **readOnly** | — | 99 |
| Yetkili Kişi | `Input`, **readOnly** | — | 100 |

VKN ve Yetkili Kişi seçilen işverenin kayıtlı değerleridir; formda düzenlenmez
(işveren kartoteksi tek kaynaktır, proje formundan işveren güncellenmez).
İşveren seçilmemişken ikisi boş ve `disabled`'dır.

**"+ Yeni İşveren Ekle"** seçilince `EmployerFormModal` açılır: Ticari Ünvan (✔),
VKN, Yetkili Kişi. `POST /employers` başarılıysa modal kapanır, liste
invalidate edilir ve yeni işveren **otomatik seçili** gelir. `409` dönerse
modal içinde "Bu VKN ile kayıtlı bir işveren zaten var." gösterilir ve modal
açık kalır. Alt-Proje 3'ün tam firma formuna kısayol verilmez (henüz yok).

Bu kart da yalnız `taahhut` iken görünür (rozet zaten bunu söylüyor).

### 4.7 Şantiyeler (satır 135–146)

Satır ızgarası: `2fr 1.5fr 1fr 40px; gap:10px; align-items:end; padding:12px;
background:#f8fafc; border-radius:10px` (138). Satırlar arası `gap:10px` (137).

| Alan | Kontrol | Satır |
|---|---|---|
| Şantiye Adı | `Input`, "A-Blok Şantiyesi" | 139 |
| Şantiye Şefi | `Select` — `GET /users` üzerinden aktif kullanıcı adları, ilk seçenek "Seçiniz…", **nullable** | 140 |
| İnşaat Alanı (m²) | `Input` mono sağa | 141 |
| Sil | `background:#fff; border:1px solid #fca5a5; color:#dc2626; border-radius:8px; padding:9px; height:38px` içerik `×` | 142 |

Ekle butonu: `border:1px dashed #cbd5e1; border-radius:10px; padding:11px;
font-size:12px; color:#64748b; font-weight:500`, metin "+ Şantiye Ekle" (144).
Kart başlığı yanında gri not: "Proje birden fazla şantiyeye bölünebilir" (136).

Başlangıçta **bir boş satır** vardır (mockup böyle). Tümü boş bırakılırsa
şantiyesiz proje oluşur — P2 spec §7.4 bunu geçerli bir durum sayıyor. Adı boş
ama diğer alanları dolu satır **hata**dır: "Şantiye adı zorunludur."
Sil butonu son satırı da silebilir (sıfır satır geçerli).

`site_manager_name` şu an `sites` tablosunda **serbest metin**tir (P2 spec:
şantiye şefi her zaman sistem kullanıcısı olmayabilir). Seçilen kullanıcının
tam adı bu sütuna yazılır; FK açılmaz. Onaylı sapma §7.9.

### 4.8 Bütçe Planlaması (satır 148–161)

Izgara `1fr 1fr 1fr 1fr; gap:14px` (151). Dört alan, hepsi `Input` mono sağa
yaslı: Malzeme Bütçesi (152), İşçilik Bütçesi (153), Taşeron Bütçesi (154),
Genel Gider (155).

Kâr marjı kutusu (157): `margin-top:14px; padding:12px 14px; background:#f0fdf4;
border-radius:9px; justify-content:space-between`.

| Öğe | Değer | Satır |
|---|---|---|
| Başlık | "Tahmini Kâr Marjı", `13px/600` | 158 |
| Alt satır | "Sözleşme bedeli − toplam bütçe", `11px; color:#15803d` | 158 |
| Tutar | `18px/700; color:#16a34a; mono` | 159 |
| Yüzde | `11px/600; color:#16a34a` | 159 |

**Türev — kâr marjı** (`derive.ts`, saf):

```
totalBudget = material + labor + subcontractor + overhead
profit      = contractAmount − totalBudget
marginPct   = contractAmount > 0 ? profit / contractAmount × 100 : null
```

Mockup örneğiyle doğrulanır: `22.400.000 − 21.860.000 = 540.000`,
`540.000 / 22.400.000 = %2,4` (satır 110, 152–155, 159). Testte bu tam örnek
kullanılır.

`contractAmount` boş veya 0 ise: tutar `—`, yüzde satırı basılmaz (sahte %0 yok).
`profit < 0` ise kutu yeşilden kırmızıya döner (`--color-danger-*` token'ları) ve
metin "Tahmini Zarar" olur — mockup'ta yoktur, §7.8 onaylı ekleme (aksi halde
zarar yeşil gösterilir, yanıltıcı).

Sayı biçimi: `tr-TR`, binlik `.`, ondalık `,`, para `₺` ön ek + mono
(P1 spec §10 ile aynı).

### 4.9 Eylemler (satır 212–216 ve 37–40)

Alt eylem şeridi: `display:flex; justify-content:flex-end; gap:10px` (212).

| Buton | Stil | Satır |
|---|---|---|
| İptal | `background:#fff; color:#475569; border:1.5px solid #e2e8f0; padding:10px 20px; border-radius:8px; 13px/500` | 213 |
| Taslak Kaydet | `background:#fff; color:#2563eb; border:1.5px solid #bfdbfe; padding:10px 20px; 13px/600` | 214 |
| Projeyi Oluştur | `background:#2563eb; color:#fff; border:none; padding:10px 24px; 13px/600` | 215 |

Mockup üst barda da bir İptal + Projeyi Oluştur çifti taşır (37–40, `padding:8px 14px`
/ `8px 18px`). Bu çift, uygulama kabuğu korunduğu için içerik sütununun üstünde
**yapışkan bir form başlığı** olarak render edilir (§7.10).

İptal → `/projeler`. Kirli formda `beforeunload` uyarısı verilmez (Ayarlar
deseniyle tutarlı); veri kaybı riskine karşı "Taslak Kaydet" vardır.

### 4.10 Doğrulama mesajları (Türkçe)

İstemci doğrulaması sunucununkini **taklit eder, yerine geçmez**; her ikisi de
uygulanır. Hatalı alan `--color-danger` kenarlığı alır, mesaj alanın altına
`.hint` ölçüsünde kırmızı basılır; ilk hatalı alana odak taşınır.

| Durum | Mesaj |
|---|---|
| Ad boş | "Proje adı zorunludur." |
| Tür seçilmemiş | "Tür seçiniz." |
| İl / İlçe boş | "İl / ilçe zorunludur." |
| İşveren seçilmemiş (taahhüt) | "İşveren firma seçiniz." |
| Sözleşme no boş | "Sözleşme no zorunludur." |
| İmza tarihi boş | "İmza tarihi zorunludur." |
| Sözleşme bedeli boş/geçersiz | "Sözleşme bedeli sayı olmalıdır." |
| Başlangıç/bitiş boş | "Başlangıç ve bitiş tarihi zorunludur." |
| Bitiş < başlangıç | "Bitiş tarihi başlangıçtan önce olamaz." |
| Yüzde 0–100 dışında | "Oran 0 ile 100 arasında olmalıdır." |
| Negatif tutar | "Tutar negatif olamaz." |
| Fiyat farkı açık, endeks boş | "Endeks tipi ve baz endeks değeri zorunludur." |
| Şantiye adı boş ama satır dolu | "Şantiye adı zorunludur." |
| VKN biçimi | "VKN 10 veya 11 haneli rakam olmalıdır." |
| Yinelenen VKN (409) | "Bu VKN ile kayıtlı bir işveren zaten var." |
| Sunucu 409 (kod çakışması) | "Proje kodu üretilemedi, tekrar deneyin." |
| Diğer sunucu hataları | mevcut `backendErrorMessage()` yardımcısı |

Başarıda `/projeler` listesine dönülür ve liste sorgusu invalidate edilir.

---

## 5. "Taslak Kaydet" semantiği

Mockup butonu gösteriyor (satır 214), backend'de taslak kavramı yok. Karar:

**Taslak bir DURUM DEĞİL, bir BAYRAKTIR** — `projects.is_draft` (Boolean, NOT
NULL, `default false`). Gerekçe: mockup'ın Durum açılırında (satır 87) "Taslak"
seçeneği YOK; bir taslağın da Planlama/Aktif/Beklemede durumu vardır. `status`
enum'una `draft` eklemek iki ortogonal kavramı tek sütuna sıkıştırır ve
`ProjectCounts` / dashboard sayaçlarını sessizce bozar.

Taslağın tanımı:

1. **Gerçekten kalıcıdır.** `POST /projects` ile `is_draft=true` gönderilir;
   satır `projects` tablosuna yazılır. Tarayıcı yerel depolaması KULLANILMAZ.
2. **Gevşetilmiş doğrulama.** Yalnız `name` zorunludur; `city`, işveren,
   sözleşme alanları ve endeks alanları atlanır (§3.6). Tutarlılık kuralları
   (tarih sırası, negatif tutar, tip uyumu) taslakta da geçerlidir — çünkü
   bunlar "eksik" değil "yanlış" veridir.
3. **Kodu yine de vardır.** Boşsa §3.5 üreticisi çalışır; taslaklar da benzersiz
   kod alır (aksi halde listede ayırt edilemezler).
4. **Görünürdür, gizlenmez.** Proje listesinde `Taslak` rozetiyle çıkar
   (`--color-warning` yüzeyi). `ProjectCounts.draft` eklenir. Görünmez bir
   kuyruğa atmak, kullanıcının kaydını kaybetmesi demektir.
5. **Sayaçlardan dışlanır.** Dashboard `active_project_count` artık
   `status == active AND NOT is_draft` sayar. Taslak, aktif iş demek değildir.
6. **Taslaktan çıkış** düzenleme yüzeyiyle olur: aynı form düzenleme kipinde
   açılır, "Projeyi Oluştur" `is_draft=false` ile PATCH atar ve tam doğrulamayı
   çalıştırır. Düzenleme kipi **P1.1a'da yoktur** (§8) — P1.1a'da taslak
   yazılabilir ama henüz kesinleştirilemez. Bu bilinçli ve bu belgede kayıtlıdır.

---

## 6. Renk → token eşlemesi

`tokens.css` zaten şunları taşıyor: `#1e293b`, `#475569`, `#94a3b8`, `#e2e8f0`,
`#f8fafc`, `#f1f5f9`, `#eff6ff`, `#2563eb`, `#1d4ed8`, `#16a34a`, `#dcfce7`.
Çıplak hex YAZILMAZ; aşağıdakiler eksikse token olarak eklenir:

| Token | Değer | Kullanım | Satır |
|---|---|---|---|
| `--color-form-card-accent` | `#bfdbfe` | işveren kartı kenarlığı, Taslak butonu kenarlığı | 95, 214 |
| `--color-badge-info-bg` | `#dbeafe` | "Taahhüt projesi" rozeti | 96 |
| `--color-type-card-desc` | `#3b82f6` | seçili tip kartı açıklaması | 58 |
| `--color-surface-success-soft` | `#f0fdf4` | kâr marjı kutusu | 157 |
| `--color-success-text-soft` | `#15803d` | kâr marjı alt satırı | 158 |
| `--color-danger-border-soft` | `#fca5a5` | şantiye satırı sil butonu | 142 |
| `--color-danger-text` | `#dc2626` | sil butonu metni | 142 |
| `--color-dashed-border` | `#cbd5e1` | "+ Şantiye Ekle", `.drop` | 25, 144 |
| `--radius-form-card` | `14px` | `.card` | 23 |
| `--radius-type-card` | `12px` | tip kartları | 55 |
| `--form-column-max` | `1000px` | içerik sütunu | 44 |

---

## 7. Onaylı sapmalar ve yer tutucu kuralları

### 7.1 "Proje Tipi" açılırı → "Tür"
Mockup satır 86 bu `<select>`'i "Proje Tipi" diye etiketliyor, ama içeriği
Konut / Ticari / Endüstriyel / Altyapı / Restorasyon — yani `category`. Aynı
sayfada satır 51 zaten **gerçek** Proje Tipi'ni (ikon kartları) taşıyor. Etiket
**"Tür"** basılır. Kayıtlı karar; sapma diye geri alınmaz.

### 7.2 `completed` durumu açılırda görünmez ama enum'da kalır
Mockup üç seçenek gösteriyor. `completed` UI'da seçilemez (proje tamamlama
ileriki dilimin işi), enum'da ve API'de kalır. Liste ekranının "Tamamlanan"
sekmesi çalışmaya devam eder.

### 7.3 Kendi Yatırım / Kat Karşılığı için kart yok
Mockup yalnız taahhüt varyantını çiziyor (üst yazı: "alanlar seçime göre
değişir", satır 47). Diğer iki tipte İşveren ve Sözleşme kartları **gizlenir**;
yerine P1'de zaten var olan `investment` (Satış Hedefi, Arsa Maliyeti) ve
`land_share` (Arsa Sahibi, paylar, noter tarihi, teslim tarihi, günlük ceza,
teminat, hissedarlar) alan grupları aynı `.card` kabuğunda, aynı `.lbl`/`.f-in`
ölçüleriyle gösterilir. Bu alanları düşürmek canlı veri modelini görünmez kılardı.

### 7.4 Fiyat farkı alt bloğu kutucuk kapalıyken kaldırılır
Mockup statik olduğu için hep görünür. `ck_contract_escalation` kısıtı gereği
kapalıyken endeks saklanmadığından, doldurulabilir görünen ama kaydedilmeyen
alan bırakmak yanıltıcıdır.

### 7.5 Eski projelerin bütçe kalemleri boş kalır
Göç, mevcut satırların `budget` değerini dört kaleme **dağıtmaz** (hangi kaleme
ait olduğu bilinmiyor; uydurmak veri yalanı olurdu). Eski satırlarda dört kalem
`0`, `budget` eski değerinde kalır. `budget = Σ kalemler` değişmezi yalnız bu
dilimden sonra yazılan satırlar için geçerlidir ve kod yorumunda belirtilir.

### 7.6 `employers` ve `project_contracts` için yeni izin modülü açılmaz
İkisi de `projects` modülünün `view` / `admin` seviyeleriyle korunur. Firma
kartoteksi Alt-Proje 3'te kendi modülünü alacak; şimdi 17. modülü açıp sonra
taşımak izin matrisini iki kez göç ettirmek olur.

### 7.7 Satır içi şantiye yazımı `sites` izni aramaz
`POST /projects` zaten `projects · admin` ister; satır içi şantiyeler proje
oluşturmanın bölünmez parçasıdır ve aynı transaction'dadır.

### 7.8 Mockup'ta olmayan, eklenen davranışlar
- Tip kartlarına `:focus-visible` halkası (mockup'ta odak stili yok; klavye
  erişilebilirliği için zorunlu).
- Negatif kâr marjında kırmızı kutu + "Tahmini Zarar" metni (mockup yalnız
  pozitif örneği gösteriyor; zararı yeşil basmak yanıltıcı olur).
- Alan altı hata mesajları (mockup hata durumu çizmiyor).

### 7.9 Şantiye Şefi seçici, ama FK değil
Kontrol `Select`'tir (kayıtlı karar) ve `GET /users`'tan beslenir; seçilen adın
metni `sites.site_manager_name` (String 200) sütununa yazılır. FK açılmaz —
P2 spec'in gerekçesi (şantiye şefi her zaman sistem kullanıcısı olmayabilir)
geçerliliğini koruyor. Alan nullable'dır.

### 7.10 Uygulama kabuğu korunur
Mockup'ta sol sidebar yok; sayfa tam genişlikte bir üst bar + içerik. Uygulamada
rota `(app)` grubunda kalır, **Topbar + Sidebar korunur**; mockup'ın üst bar
kırıntı yolu ve eylem çifti, içerik sütununun üstünde yapışkan bir form başlığı
olarak render edilir. Gerekçe: kabuktan çıkmak F3'te kurulan gezinme kanonunu
kırar ve Ayarlar/Proje Detay yüzeyleriyle tutarsızlaşır.

### 7.11 Yer tutucu deseni
Backend'in veremediği hiçbir değer sessizce düşürülmez: hücre düzenini korur,
`—` basar, `title` ile Türkçe açıklama verir ve `pending_module` anahtarı
`pendingModuleLabel()`'a eklenir (P1/P2 deseni). Bu formda yalnız §8'deki belge
alanı bu duruma düşer (`pending_module: "documents"`).

---

## 8. P1.1b'ye ertelenenler

**Kapsam dışı:** altı belge alanı (İşveren Sözleşmesi, Poz Listesi/BOQ, Yapı
Ruhsatı, Mimari & Statik Proje, Zemin Etüt Raporu, Teminat Mektubu — satır
167–202) ve sürükle-bırak toplu yükleme alanı (satır 204–209). Gerekçe: belge
saklama (bytea/nesne deposu), BOQ Excel içe aktarımı ve dosya güvenliği kendi
başına bir dilimdir; proje formunu bunlar için bekletmek P1'in yanlış modalini
canlıda tutmak demektir.

Ayrıca ertelenen: **düzenleme kipi** (mevcut projeyi bu formda açmak) ve
dolayısıyla taslağı kesinleştirme (§5.6).

**Bu arada kullanıcıya nasıl gösterilir** (sessizce atlanmaz):

`DocumentsPlaceholderCard` mockup'ın "📎 Proje Belgeleri" kartını **düzeniyle
birebir** basar — aynı `1fr 1fr` ızgara (166), aynı `.drop` kutuları (25), aynı
ikon renkleri ve başlık/alt başlık metinleri — ancak:

- `<input type="file">` **render edilmez** (dosya kabul ediyormuş izlenimi olmaz),
- kutular `aria-disabled="true"`, `cursor:default`, `:hover` efekti kapalı,
- sağdaki "Yükle" / "İçe Aktar" rozetleri yerine gri **"Yakında"** rozeti,
- kart başlığının yanında not: *"Belge yükleme yakında eklenecek — proje
  oluşturduktan sonra belgeleri yükleyebileceksiniz."*,
- her kutuda `title="Belge yükleme yakında (P1.1b)"`,
- mockup'ta `*` taşıyan iki alanın (İşveren Sözleşmesi, Poz Listesi) yıldızı
  **basılmaz** — yüklenemeyen bir alanı zorunlu göstermek yanlış olur.

Alt sürükle-bırak alanı (204–209) aynı kurallarla, tıklanamaz ve "Yakında"
notuyla gösterilir.

---

## 9. Sayı, tarih ve dil biçimi

P1 §10 / P2 §8 ile aynı: `tr-TR`; binlik `.`, ondalık `,`; para `₺` + mono font;
tarih girişi `type="date"` (tarayıcı yereli), gösterim `15.03.2025`; saat dilimi
**Europe/Istanbul**. Yüzdeler `%2,4` biçiminde (yüzde işareti önde).

---

## 10. Testler

**Backend (pytest):**
- enum göçü: `planning` yazılıp okunabiliyor; mevcut üç değer korunuyor;
  `{s.value for s in ProjectStatus}` beklentisi güncellenir
  (`tests/modules/test_project_model.py:35`).
- `employers`: oluşturma, yinelenen VKN → 409 + Türkçe mesaj, NULL VKN çoklu
  satır serbest.
- `POST /projects`: kodsuz istekte `PRJ-2026-001` üretimi; `budget` = kalem
  toplamı; taahhüt dışı tipte `contract` gönderilince 422; taslakta gevşetilmiş
  doğrulama; satır içi şantiyelerin aynı transaction'da yazılması ve kod
  çakışmasında projenin de yazılmaması.
- izin: `projects · full` kullanıcı `POST /projects` ve `POST /employers`
  alamıyor (403), `admin` alıyor.
- göç testi: `employer_name` dolu satırların `employers`'a taşınması.

**Frontend (Vitest + Testing Library):**
- `derive.ts`: mockup örneğiyle kâr marjı (`540.000` / `%2,4`), negatif kâr,
  `contractAmount=0` durumunda `—`; süre hesabı ve ters tarih.
- tip kartı seçimi işveren/sözleşme kartlarını gösterip gizliyor.
- fiyat farkı kutucuğu kapatılınca endeks alanları DOM'dan kalkıyor.
- "+ Yeni İşveren Ekle" seçimi modal açıyor, başarıda yeni işveren seçili geliyor.
- şantiye tekrarlayıcısı: ekle/sil, sıfır satır geçerli, adsız dolu satır hatası.
- belge kartı: `input[type=file]` YOK, "Yakında" rozeti VAR, `aria-disabled`.
- Taslak Kaydet, eksik zorunlu alanlara rağmen `is_draft:true` ile POST atıyor.
- `ProjectsView`: "+ Yeni Proje" artık `/projeler/yeni`'ye giden link.

**Görsel regresyon:** 1440px'te `/projeler/yeni` (taahhüt varyantı). Baseline'lar
**yalnız Linux CI'da** üretilir (`visual-baselines.yml` → workflow_dispatch),
macOS'ta PNG üretilmez.

**Mockup karşılaştırma kapısı:** her ekran task'ının sonunda
`scripts/render-mockup.mjs "projedesign/Form - Proje Oluştur.dc.html" … 1440`
ile render alınır ve uygulamayla yan yana konur; sapmalar göz kararıyla değil
ölçüyle raporlanır.

**Erişilebilirlik:** tip kartları gerçek radiogroup; her kontrolün `Field`
üzerinden bağlı `<label>`'ı; hata mesajları `aria-describedby` ile alana bağlı;
kart başlıkları `<h2>`; sayfa tek `<h1>`.

---

## 11. Ürün sahibine açık sorular

1. **Sözleşme süresi uç-dahil mi?** `640 gün` örneği (satır 113) hem
   `end − start` hem `end − start + 1` ile tutarlı olabilir. Spec uç-dahil
   (`+1`) varsaydı; farklıysa `derive.ts` tek satırda düzeltilir.
2. **Taslağı kim görür?** Taslak projeler, o projeye erişimi olan herkese mi
   görünsün, yoksa yalnız oluşturana mı? Spec bugünkü `user_project_access`
   görünürlüğünü aynen uyguladı (oluşturana özel bir filtre yok).
3. **KDV oranı listesi sabit mi?** Mockup 20/10/1 veriyor (satır 119). Oran
   değişirse bu liste kodda mı kalsın, yoksa Ayarlar › Şirket Bilgileri'nden mi
   yönetilsin? Spec kodda sabit varsaydı.
