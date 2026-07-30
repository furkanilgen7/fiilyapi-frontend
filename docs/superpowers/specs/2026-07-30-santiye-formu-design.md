# Şantiye Ekle formu — yeniden yazım (tasarım spec'i)

Tarih: 2026-07-30
Mockup kanonu: `projedesign/Form - Santiye Ekle.dc.html` (234 satır, 1440px'te render edilir)
Yan kanonlar: `projedesign/Form - Proje Oluştur.dc.html` (aynı form ailesi),
`projedesign/Formlar.dc.html` (form kataloğu — satır 73–78 bu formu
"Konum, bölümler, depo, altyapı + 6 belge" diye özetler)
Desen kaynağı: `frontend/docs/superpowers/specs/2026-07-29-p1-1a-proje-formu-design.md`
(P1.1a — aynı ölçekte, çözülmüş problemler), uygulaması `src/components/project-form/`
Kurallar: `GOREV-SIRASI.md` §3 (Frontend), §4 (Kalıcı kararlar)
Bellek kararları: `mockup-birebir-tasarim-kurali`, `form-kontrolleri-primitive-kurali`,
`alt-proje-2-p2-kararlari`

Bu belge **frontend yüzeyinin** spec'idir. Ancak mockup'ın alanlarının çoğunun
bugün backend karşılığı YOKTUR; §3 bu yüzden **backend ön koşulunu** sözleşme
düzeyinde yazar. §17 task **iskeletini** verir; ayrıntılı uygulama planı
(`docs/superpowers/plans/`) ayrı bir adımda yazılır.

> **Revizyon 2026-07-30:** kullanıcı kararları (şantiye kodu, tesis kolonları,
> Tahmini Bedel, İSG, GPS, silme izni, bölüm şablonu, tesis ön-işaretleri) ve
> koordinatör kararları (başarı hedefi, taslak görünürlüğü, bütçe uyarısı,
> `GET /users` sınırı, `SiteFormModal`) işlendi. Açık soruların tamamı §16.1'de
> kapatıldı. **GPS maddesi aynı gün ikinci kez revize edildi:** puantaj konum
> doğrulaması yapılmayacağı için ayrıştırma/doğrulama tamamen düştü (§4.2.1).

---

## 1. Kapsam

### 1.1 Kapsam içi

- `SiteFormModal` (9 alanlı modal) → **tam sayfa form** dönüşümü (§2).
- Mockup'ın **altı bölümünün tamamı** (kullanıcı kararı 1):
  Şantiye Bilgileri · Konum & Alan · Takvim & Bütçe · Bölümler (Fazlar) ·
  Depo & Şantiye Altyapısı · Şantiye Belgeleri.
- Üst bilgi şeridi: kırıntı yolu + "Bağlı Proje" bilgi kutusu (satır 53–60).
- **Bölümler (Fazlar)** satır satır tablo; şantiye ile **aynı gönderimde** yazılır
  (kullanıcı kararı 4).
- **Taslak Kaydet** — P1.1a §5 taslak deseninin birebiri; taslak projeye erişimi
  olan herkese görünür, listede **rozetle** ayırt edilir (§9.4).
- **İSG Uzmanı** = mevcut sistem kullanıcılarından seçim veya "Dış Kaynak —
  OSGB"; **zorunlu değildir** (kullanıcı kararı 4).
- Otomatik türevler: şantiye kodu **`SNT-{YYYY}-{NNN}`** (boşsa sunucu üretir,
  §3.6), süre (gün, uç-dahil).
- **Tesisler** 8 ayrı Boolean alandır ve **hepsi boş başlar** (§4.5).
- **GPS** tek serbest metindir; ayrıştırılmaz, doğrulanmaz (§4.2.1).
- Bölüm **"Tahmini Bedel"** sütunu yer tutucudur; girdi kontrolü basılmaz (§3.5).
- Doğrulama, hata/başarı durumları, a11y, testler, metin envanteri.

### 1.2 Kapsam dışı (ama yüzeyde yer tutar)

| Konu | Nasıl ele alınır | Gerekçe |
|---|---|---|
| **Şantiye Belgeleri** — 6 belge kutusu (satır 180–209) + sürükle-bırak alanı (211–216) | **Kapsam dışı ama yerinde basılır.** Altı kutunun ve sürükle-bırak alanının **düzeni, metni, ikonu, rengi mockup'la birebir** çıkar; hepsi `pendingModuleLabel("documents")` yer tutucusudur. `<input type="file">` **render edilmez**; `onDrop`/`onChange`/`FormData`/yükleme isteği **hiç yazılmaz**; gövdede belge alanı **yoktur**. Yani yüzey var, kod yok | Kullanıcı kararı 5; `GOREV-SIRASI.md` §4.4 (dosya yükleme alt sistemi repoda hiç yok); backend spec §2.7 "backend'e hiçbir belge kolonu/tablosu/ucu eklenmez" |
| "+ Yeni Personel Ekle" seçeneği (satır 69) | **Basılmaz** | Kullanıcı kararı 3; personel modülü yok |
| "Poz Dağılımı →" bağlantısı (satır 59) ve "Oluşturduktan sonra poz dağılımı ekranına git" kutucuğu (satır 220–223) | Görünür ama **edilgen**: bağlantı tıklanamaz `<span>`, kutucuk `disabled` + işaretsiz, ikisinde de `title={pendingModuleLabel("contracts")}` | Poz dağılımı ekranı yok; sessiz atlama yasak |
| Düzenleme kipi (mevcut şantiyeyi bu formda açmak) ve dolayısıyla taslağı kesinleştirme | Ertelenir; bu dilimde taslak **yazılabilir ama kesinleştirilemez** | P1.1a §5.6 ile aynı bilinçli sınır |
| Şantiye Detay ekranında yeni alanların gösterimi | Bu dilim yalnız **oluşturma** yüzeyidir | Okuma yüzeyi ayrı dilim |

---

## 2. Rota kararı: modal → tam sayfa

### 2.1 Neden

| Konu | Bugün (`SiteFormModal.tsx`) | Mockup (kanon) |
|---|---|---|
| Yüzey | `Modal` (Ayarlar form kanonu, satır 11–13 yorumu) | Tam sayfa, `max-width:1000px; margin:0 auto` (satır 47) |
| Alan sayısı | 9 | 30+ alan, 6 kart |
| Bölümler | yok (ayrı ekrandan eklenir) | form içinde tablo (satır 102–144) |
| Eylemler | Vazgeç · Kaydet | İptal · **Taslak Kaydet** · Şantiyeyi Oluştur (225–227) + üst barda ikinci çift (41–42) |
| Kırıntı yolu | yok | `Projeler / Güneşkent Konut / Yeni Şantiye` (satır 36–38) |

Satır 36–38 kırıntı yolu üç seviyelidir ve orta seviye **proje adıdır** — yani
form, proje bağlamının altında bir sayfadır, modal değildir.

### 2.2 Önerilen rota

```
/projeler/[projectId]/santiyeler/yeni
```

Dosya: `src/app/(app)/projeler/[projectId]/santiyeler/yeni/page.tsx`

- `santiyeler/[siteId]` zaten var; Next.js'te **statik segment dinamikten önce
  eşleşir**, bu yüzden `yeni` çakışmaz. (Task'ta bu davranış bir testle sabitlenir.)
- Kırıntı yolu satır 36–38 ile birebir eşleşir: `Projeler` → `/projeler`,
  `{proje adı}` → `/projeler/{projectId}`, `Yeni Şantiye` (aktif, bağlantısız).
- Rota `(app)` grubunda kalır → **Topbar + Sidebar korunur** (P1.1a §7.10 ile
  aynı gerekçe: F3 gezinme kanonundan çıkılmaz). Mockup'ın üst barındaki kırıntı
  yolu + eylem çifti (satır 35–43), içerik sütununun üstünde **yapışkan form
  başlığı** olarak basılır — P1.1a'daki `.pf-topbar` deseninin aynısı.

### 2.3 Mevcut modalin akıbeti

**`SiteFormModal.tsx` ve `SiteFormModal.test.tsx` SİLİNİR.** Gerekçe ve etki:

- Tek çağıran `src/app/(app)/projeler/[projectId]/page.tsx:96`'dır (doğrulandı).
- O sayfadaki `isSiteFormOpen` durumu (satır 64) ve `AddSiteButton`'ın `onClick`
  sözleşmesi kaldırılır; `AddSiteButton` `/projeler/{projectId}/santiyeler/yeni`'ye
  giden bir `Link` olur. **Görsel stil değişmez** (`project-detail__add-btn`
  sınıfı korunur) — iki çağrı noktası da (üst bar satır 81, boş durum satır 86)
  aynı linke gider.
- Düzenleme kipi için **saklanmaz**: düzenleme bu dilimde yok (§1.2) ve geldiğinde
  aynı tam sayfa formun `?edit` kipi olacak (P1.1a §5.6 deseni). İki ayrı yazma
  yüzeyi bırakmak, mockup sadakat denetimini iki yerde yapmayı zorunlu kılar.
- `SiteFormModal.tsx:11` yorumundaki "settings-form kanonu" referansı dosyayla
  birlikte gider; `settings.css` başka tüketicilere sahiptir, dokunulmaz.

---

## 3. Backend ön koşulu (bu dilimin kilidi)

> **Kanon:** `backend/docs/superpowers/specs/2026-07-30-santiye-formu-genisleme-design.md`
> (2026-07-30). Bu bölüm o belgenin **son hâlini** yansıtır; alan adları, tipleri
> ve enum değerleri oradan alınmıştır. Frontend tarafında bir alan adı uydurulmaz.
>
> Özet: `sites` tablosuna **22 yeni kolon**, `sections` tablosuna **yalnızca
> `manager_user_id`**, `site_status` enum'una **`preparation`**.
> `sections.estimated_amount` **AÇILMAZ** (kullanıcı kararı 3, §3.5).

Mockup'ın alanlarının çoğunun bugün `sites` / `sections` tablolarında karşılığı
**yoktur**. Aşağıdaki tablolar tek tek durumu verir. Kullanıcı kararı 1
("mockup'taki tüm bölümler") ve kararı 5 ("yalnız belgeler yer tutucu")
birlikte okunduğunda backend eşlik dilimi **zorunludur** — belgeler dışındaki
alanlar gerçek olmalıdır. Bu spec, backend diliminin **tamamlanmış** olmasını
ön koşul sayar; task listesi (§17) ilk kapıyı buna koşar.

### 3.1 Bugün var olan alanlar (`SiteCreate`, `app/modules/sites/schemas.py`)

| Mockup alanı | Satır | Backend alanı | Not |
|---|---|---|---|
| Şantiye Adı | 66 | `name` (150) | ✔ |
| Şantiye Kodu | 67 | `code` (50, opsiyonel) | ✔ boşsa sunucu türetir |
| Şantiye Şefi | 69 | `site_manager_name` (200, serbest metin) | ✔ ama artık **ikincil**: FK eklendi (§3.2) |
| Durum | 71 | `status` (`site_status`) | ⚠ "Hazırlık" karşılığı yok — §3.3 |
| İl / İlçe | 79 | `city` (100) | ✔ tek serbest metin (ayrı `district` yok) |
| Açık Adres | 82 | `address` (300) | ✔ |
| Başlangıç Tarihi | 94 | `start_date` | ✔ |
| Planlanan Bitiş | 95 | `end_date` | ✔ |
| İnşaat Alanı (m²) | 85 | `construction_area_m2` | ✔ **model kolonu var** (P1.1a §2.6); backend dilimi `SiteCreate`/`SiteCard` şemalarına ekliyor |
| Bölüm Adı / Sorumlu / Başlangıç / Bitiş | 119–122 | `Section.name / manager_name / start_date / end_date` | ✔ ama satır içi gönderim yeni — §3.4 |

### 3.2 Gereken yeni `sites` sütunları (backend spec §3.0 — 22 kolon)

Sıra ve adlar backend spec'inin son hâlinden **birebir** alınmıştır.

| # | Kolon | Tip | Null | Mockup | Frontend notu |
|---|---|---|---|---|---|
| 1 | `site_manager_user_id` | UUID FK → `users.id` | ✔ | 69 | Şef seçicisi artık **FK gönderir** |
| 2 | `safety_officer_user_id` | UUID FK → `users.id` | ✔ | 70 | İSG seçicisi kullanıcı seçilirse |
| 3 | `safety_officer_name` | String(200) | ✔ | 70 | sunucu anlık görüntü yazar; frontend göndermez |
| 4 | `safety_officer_is_outsourced` | Boolean (`false`) | ✗ | 70 | "Dış Kaynak — OSGB" seçilirse `true` |
| 5 | `neighborhood` | String(150) | ✔ | 80 | — |
| 6 | `parcel` | String(50) | ✔ | 81 | — |
| 7 | `gps_coordinates` | String(50) | ✔ | 83 | ⚠ **kullanıcı kararı 5 bunu değiştiriyor** — §3.5 |
| 8 | `land_area_m2` | Numeric(12,2) | ✔ | 84 | — |
| 9 | `floor_info` | String(100) | ✔ | 86 | **serbest metin** (mockup `type="text"`) |
| 10 | `budget` | Numeric(18,2) | ✔ | 97 | kullanıcı girdisi, türev değil |
| 11–18 | `has_closed_warehouse`, `has_open_storage`, `has_cold_storage`, `has_site_office`, `has_canteen`, `has_changing_room_wc`, `has_dormitory`, `has_infirmary` | Boolean (`false`) | ✗ | 153–165 | **8 ayrı Boolean — JSONB DEĞİL** (§3.2.1) |
| 19 | `electricity_subscription_no` | String(50) | ✔ | 170 | — |
| 20 | `water_subscription_no` | String(50) | ✔ | 171 | — |
| 21 | `planned_worker_count` | Integer | ✔ | 172 | tam sayı |
| 22 | `is_draft` | Boolean (`false`) | ✗ | 226 | Taslak Kaydet |

`sections` tablosuna **yalnızca `manager_user_id`** (UUID FK → `users.id`)
eklenir. **`sections.estimated_amount` AÇILMAZ** — kullanıcı kararı 3, §3.5.

#### 3.2.1 Tesisler: 8 ayrı Boolean kolon (JSONB değil) — kullanıcı kararı 2

Bu spec'in önceki sürümü `warehouse_areas` / `facilities` JSONB `list[str]`
varsaymıştı. **O varsayım geçersizdir.** Backend spec §4 "Seçenek A"yı seçti ve
kullanıcı 2026-07-30'da onayladı: DB'de 8 düz `Boolean` kolon.

Frontend'i ilgilendiren tek şey **tel üzerindeki biçim**: DB düz olsa da
sözleşme **gruplu bir nesnedir** (backend spec §4 "Öneri" + §6.1
`SiteFacilitiesInput`) — mockup'ın iki grubu değil, tek düz nesne, 8 anahtar:

```ts
facilities: {
  closed_warehouse: boolean;  open_storage: boolean;  cold_storage: boolean;
  site_office: boolean;       canteen: boolean;       changing_room_wc: boolean;
  dormitory: boolean;         infirmary: boolean;
}
```

Anahtarlar **backend'in adlarıdır** (`has_` öneki DB'de kalır, sözleşmede yok).
Frontend'in eski `d1_kapali_ambar` / `santiye_ofisi` anahtar seti **kullanılmaz**.
Etiketler §4.5'te, gruplama (3 depo + 5 tesis) yalnızca **görsel**dir.

### 3.3 `site_status` — "Hazırlık" = `preparation`

Mockup satır 71: `Hazırlık · Aktif (seçili) · Beklemede`.
Bugün `site_status` = `active | on_hold | completed`.
Backend dilimi enum'a **`preparation`** ekler (bu spec'in önceki sürümündeki
`planning` adı **yanlıştı**; kanon `preparation`):

```
preparation · active · on_hold · completed
```

Eşleme: `Hazırlık → preparation`, `Aktif → active`, `Beklemede → on_hold`.
`completed` mockup'ta görünmez ama enum'da **kalır** — `SiteCounts.completed` ve
şantiye listesi sekmesi ona bağlıdır. Sunucu ve form varsayılanı `active`
(satır 71'de `Aktif` seçili).

### 3.4 Bölümlerin aynı gönderimde yazılması (atomik)

Kullanıcı kararı 4: "şantiye kaydedilirken birlikte gider." Backend spec §8 bunu
**garanti eder**: `SiteCreate.sections: list[SiteSectionInput]`, istek başına tek
transaction, herhangi bir adımda hata → `rollback` → **hiçbir satır yazılmaz**.
Kısmi başarı mümkün değildir.

Bölüm satırının sözleşmesi (backend spec §6.1 `SiteSectionInput`):

```
name (zorunlu) · code? · manager_user_id? · start_date? · end_date?
```

`sort_order` gövdede **yoktur**; sunucu dizi sırasından 0,1,2… atar.
`estimated_amount` **yoktur** (§3.5). Bölüm kodu bu formda girilmez → hep `None`
gider; `uq_sections_site_code` kısmi indeksi (`code IS NOT NULL`) çoklu NULL'a
izin verir. `sites · full` yetkisi bölüm satırlarını yazmaya **yeter**; bölüm
şantiyenin iç kırılımıdır, ayrı izin modülü değildir (backend spec §8.2).

> Bu spec'in önceki sürümündeki "önce şantiye, sonra tek tek bölüm" yedek yolu
> ve ona bağlı kısmi-başarı mesajı **kaldırılmıştır** — backend dilimi ön koşul
> olduğu için atomik olmayan bir ikinci yol yaşatmaya gerek yok.
> `useCreateSection` bu formda **kullanılmaz**.

### 3.5 Bölüm "Tahmini Bedel" — sütun yer tutucudur (kullanıcı kararı 3)

Mockup satır 114/123 bölüm satırında **Tahmini Bedel** sütunu istiyor.
`Section` modelinde bedel sütunu **bilinçli olarak yoktur**
(`sites/models.py`: "bölüm bedeli BOQ kalemlerinin toplamıdır, türevdir") ve
`GOREV-SIRASI.md` §4.1 ileri bağ açmayı yasaklıyor.

**Karar (2026-07-30):** `sections.estimated_amount` **eklenmiyor.** Backend spec
§1.2/7 ve §3.4'teki "estimated_amount açılsın" önerisi bu kararla **düşmüştür**;
backend dilimi `sections`'a yalnız `manager_user_id` ekler.

Frontend karşılığı:

- Sütun mockup'taki **yerinde, genişliğinde ve hizasında** (satır 114: `130px`,
  sağa dayalı) durur — kaldırılmaz, `colspan` değişmez.
- Hücrede **girdi kontrolü basılmaz** (`disabled` bir `Input` de basılmaz).
  Hücre içeriği düz `—`'dir; `--color-text-subtle`, sağa dayalı, mono değil.
- Hücre `title={pendingModuleLabel("boq")}` taşır → "İş kalemleri modülüyle
  birlikte gelir"; ekran okuyucu için `<td>` içinde
  `<span class="sr-only">İş kalemlerinden hesaplanacak</span>`.
- Odak sırasında **yer almaz** (kontrol yok, `tabindex` yok) → §6.6 sekme sırası
  bedel hücresini hiç görmez.
- İleride BOQ geldiğinde bu hücre **hesaplanan** değeri gösterecek; kullanıcı
  girdisi hiçbir zaman olmayacak.

### 3.6 Şantiye kodu üretici biçimi — `SNT-{YYYY}-{NNN}` (kullanıcı kararı 1)

Mockup satır 67 yer tutucusu `SNT-2026-003`; bugünkü `sites.service.derive_code`
**addan slug** üretir (`C-Blok Şantiyesi` → `C-BLOK`).

**Karar (2026-07-30):** ad-slug türevi **kaldırılır**; üretici
**`SNT-{YYYY}-{NNN}`** olur (o yılın en büyük sonekinin +1'i, sayım değil),
`PRJ-{YYYY}-{NNN}` emsaliyle tutarlıdır. Numaralandırma **şirket geneli**,
benzersizlik kısıtı proje içi kalır (backend spec §3.2). Mevcut satırların
kodları **değişmez**.

Frontend karşılığı: alan boşsa gövdede `code` anahtarı **hiç gönderilmez**;
yer tutucu metni `SNT-2026-003` (mockup satır 67) ve ipucu "Boş bırakılırsa
otomatik" aynen basılır. Kullanıcı elle kod girip çakışırsa `409` → §10.3 mesajı.

### 3.7 BFF `ALLOWED_ROOTS` kontrolü

`src/app/api/backend/[...path]/route.ts` bugün `projects`, `sites`, `users`
köklerini **zaten** taşıyor → bu dilim için **yeni kök gerekmiyor**. Yine de
task'larda kapı olarak koşulur: yeni kök eklenmezse modül **yalnız canlıda 404**
verir, jsdom testleri görmez (`GOREV-SIRASI.md` §3, "BFF TUZAĞI").

---

## 4. Mockup ölçü tablosu

Tüm satır numaraları `Form - Santiye Ekle.dc.html` içindir.
Çıplak hex/px yazılmaz; sağ sütun token/primitive karşılığıdır.

### 4.0 Ortak sınıflar ve sayfa kabuğu

| Satır | Element | Ölçü / değer | Token / primitive |
|---|---|---|---|
| 14 | gövde zemini | `#f0f4f8` | `--color-bg` (kabuk zaten uyguluyor) |
| 15 | giriş animasyonu | `fadeUp .4s ease` (`translateY(8px)`→0) | `--anim-fade-up` |
| 17 | `.f-in` | `border:1.5px #e2e8f0; radius:8px; padding:9px 12px; 13px; bg #fff` | `ui/input`, `ui/select`, `ui/textarea` — `--border-width-form`, `--space-form-y`, `--space-form-x`, `--radius-8` (mevcut, ölçüler `form-control-metrics.test.ts`'te sabitli) |
| 18 | `.f-in:focus` | `border #2563eb; shadow 0 0 0 3px rgba(37,99,235,.1)` | `--color-primary`, `--focus-ring` |
| 19 | placeholder | `#94a3b8` | `--color-text-subtle` |
| 20 | `.lbl` | `12px/600 #475569; mb 5px` | `ui/field` — `--text-form-label`, `--color-label`, `--space-form-label-gap` |
| 21 | `.req` | `#ef4444` | `--color-danger` |
| 22 | `.hint` | `11px #94a3b8; mt 4px` | `--text-form-hint`, `--space-form-hint-gap` |
| 23 | `.card` | `bg #fff; radius 14px; border 1px #e2e8f0; padding 20px; shadow 0 1px 4px rgba(0,0,0,.06); mb 16px` | `.pf-card` (mevcut) — `--radius-form-card`, `--space-5`, `--shadow-card`, `--space-4` |
| 24 | `.card-t` | `14px/600 #1e293b; mb 16px; flex gap 8px` | `.pf-card__title` |
| 25 | `.drop` | `border 2px dashed #cbd5e1; radius 10px; padding 14px; bg #f8fafc; flex gap 12px` | `.pf-doc` (mevcut) — `--color-dashed-border`, `--radius-10`, `--color-surface-2` |
| 27 | `.row-in` | `border 1px #e2e8f0; radius 6px; padding 6px 8px; 12px` | **YENİ:** `ui/input`+`ui/select` `size="row"` varyantı — §5 |
| 31 | üst bar | `h 52px; bg #fff; border-bottom 1px #e2e8f0; shadow 0 1px 3px` | uygulama Topbar'ı korunur; form barı `.pf-topbar` (yapışkan) |
| 36–38 | kırıntı yolu | `12px; gap 5px; ayraç #e2e8f0; aktif 600/#1e293b` | `.pf-breadcrumb` (mevcut) |
| 41 | üst bar İptal | `bg #fff; #475569; border 1px #e2e8f0; padding 8px 14px; radius 8px; 13px` | `.pf-topbar-cancel` (mevcut) |
| 42 | üst bar birincil | `bg #2563eb; #fff; padding 8px 18px; radius 8px; 13px/600` | `.pf-topbar-submit` (mevcut) |
| 46 | sayfa | `padding-top 52px; padding-bottom 40px` | kabuk + `.pf` alt boşluğu |
| 47 | içerik sütunu | `padding 24px 32px; max-width 1000px; margin 0 auto` | `.pf` — `--space-6`, `--space-8`, `--form-column-max` |
| 49 | `h1` | `22px/700; ls -.3px; mb 4px` | `.pf-title` |
| 50 | alt başlık | `13px #94a3b8; mb 20px` | `.pf-subtitle` — `--text-body`, `--color-text-subtle` |

### 4.0.1 "Bağlı Proje" bilgi kutusu (satır 53–60)

| Satır | Element | Ölçü / değer | Token |
|---|---|---|---|
| 53 | kutu | `bg #eff6ff; border 1px #bfdbfe; radius 12px; padding 14px 18px; mb 16px; flex; gap 12px` | `--color-nav-active-bg`, `--color-primary-ring`, `--radius-lg`, **YENİ** `--space-info-banner-y: 14px`, `--space-info-banner-x: 18px` |
| 54 | ikon | `20×20 svg`, çizgi `#2563eb` | `--color-primary` |
| 55 | metin | `12px #1d4ed8; line-height 1.7` | `--text-xs`, `--color-primary-hover`, **YENİ** `--leading-loose: 1.7` |
| 56 | 1. satır | `<strong>Bağlı Proje:</strong> {ad} ({kod}) · {tip}` | veri: `useProject` |
| 57 | 2. satır | "Şantiye oluşturulduktan sonra **poz dağılımı** ekranından bu şantiyeye kota atayabilirsiniz." | sabit metin |
| 59 | bağlantı | `12px/600; white-space nowrap` "Poz Dağılımı →" | **edilgen** `<span>` + `title={pendingModuleLabel("contracts")}` (§1.2) |

### 4.1 📍 Şantiye Bilgileri (satır 63–73)

Izgara satır 65: `grid-template-columns: 2fr 1fr 1fr; gap: 14px`
→ `.pf-grid` + **YENİ** `.pf-grid--2-1-1` zaten var (P1.1a işveren kartı), yeniden kullanılır.

| Satır | Alan | Kontrol | Zorunlu | Yer tutucu / ipucu / seçenekler |
|---|---|---|---|---|
| 66 | Şantiye Adı | `Input` | ★ | ph "C-Blok Şantiyesi" |
| 67 | Şantiye Kodu | `Input` mono | — | ph "SNT-2026-003"; hint "Boş bırakılırsa otomatik" (§3.6) |
| 68 | Bağlı Proje | `Select` **disabled**, tek seçenek = bağlamdaki proje | ★ (karşılanmış) | §4.1.1 |
| 69 | Şantiye Şefi | `Select` — "Seçiniz…" + `GET /users`; **değer = `user.id`** → `site_manager_user_id` | ★ | "+ Yeni Personel Ekle" **basılmaz** (kullanıcı kararı 3) |
| 70 | İSG Uzmanı | `Select` — "Seçiniz…" + `GET /users` + son seçenek "Dış Kaynak — OSGB" (sabit değer `__outsourced__`) | — (**nullable**, kullanıcı kararı 4) | hint "İSG mevzuatı gereği zorunlu" aynen basılır ama **kural değildir** (§4.1.2) |
| 71 | Durum | `Select` | — | Hazırlık (`preparation`) · **Aktif** (`active`, seçili) · Beklemede (`on_hold`) |

Mono alanlar (67): `font-family:'JetBrains Mono'` → `--font-mono`.

#### 4.1.1 "Bağlı Proje" neden kilitli

Mockup satır 68 dört projeli bir açılır gösteriyor. Uygulamada rota `projectId`
taşır (satır 37 kırıntı yolu da projeyi zaten sabitliyor) ve backend `SiteCreate`
gövdesinde `project_id` **yoktur**; `SiteUpdate` yorumu da açıkça "şantiye başka
projeye taşınamaz" der. Kontrol düzeni ve ölçüsü korunur, `disabled` basılır,
`title="Şantiye, girildiği projeye bağlıdır"`. Onaylı sapma §11.1.

#### 4.1.2 "Dış Kaynak — OSGB" nasıl ele alınır (kullanıcı kararı 3'ün cevabı)

**Karar: tek `Select` korunur; kullanıcı listesinin sonuna sabit bir
"Dış Kaynak — OSGB" seçeneği eklenir. Alan zorunlu DEĞİLDİR (kullanıcı kararı 4).**

Gövdeye çeviri (backend spec §3.3, üç kolon):

| Seçim | `safety_officer_user_id` | `safety_officer_is_outsourced` |
|---|---|---|
| "Seçiniz…" (boş) | `null` | `false` |
| bir kullanıcı | `user.id` | `false` |
| "Dış Kaynak — OSGB" | `null` | `true` |

`safety_officer_name` **frontend'den gönderilmez** — sunucu FK'den anlık görüntü
yazar, OSGB'de sabit `"Dış Kaynak — OSGB"` yazar. İkisini aynı anda göndermek
backend `ck_sites_safety_officer` kısıtına takılır (422); seçici tek değer
taşıdığı için bu durum istemcide **oluşamaz**.

Mockup satırıyla gerekçe:

- Satır 70'in kendisi: `<option>Emre Şahin (A Sınıfı)</option>` ile
  `<option>Dış Kaynak — OSGB</option>` **aynı `<select>` içindedir**. Yani mockup
  OSGB'yi kişiye alternatif bir **değer** olarak modelliyor, ayrı bir "kaynak
  tipi" kontrolü açmıyor. Ayrı bir alan icat etmek mockup'a alan eklemek olur.
- Satır 69 ile karşıtlık: aynı formda son seçenek slotunun bir **eyleme**
  ("+ Yeni Personel Ekle") ayrıldığı tek yer satır 69'dur ve o düşürülüyor
  (kullanıcı kararı 3). Satır 70'in son seçeneği eylem değil değerdir, bu yüzden
  **kalır**.
- Alan **zorunlu değildir** (kullanıcı kararı 4): etikette `*` yok, backend
  `_validate_site`'ta taslak-dışında da aranmıyor. İpucu metni ("İSG mevzuatı
  gereği zorunlu") mockup satır 70'ten **aynen** basılır; yasal hatırlatmadır,
  form kuralı değildir. Onaylı sapma §11.5.
- Mockup'taki "(A Sınıfı)" eki **uydurulmaz ama atılmaz da**: `UserResponse.title`
  alanı vardır (`schema.d.ts`). Seçenek metni `title` doluysa
  `{full_name} ({title})`, boşsa yalnız `{full_name}` olur. Aynı kural şef (69)
  ve bölüm sorumlusu (120) seçicilerinde de geçerlidir — tek yardımcı
  (`userOptionLabel`). Onaylı sapma §11.2.

### 4.2 🗺 Konum & Alan (satır 76–88)

Izgara satır 78: `1fr 1fr 1fr; gap 14px` → `.pf-grid--3` (mevcut).

| Satır | Alan | Kontrol | Zorunlu | Yer tutucu / ipucu |
|---|---|---|---|---|
| 79 | İl / İlçe | `Input` | ★ | ph "Çankaya / Ankara" |
| 80 | Mahalle | `Input` | — | ph "Kuyubaşı Mah." |
| 81 | Ada / Parsel | `Input` mono | — | ph "1234 / 5" |
| 82 | Açık Adres | `Textarea` `rows=2`, `resize:none`, `line-height:1.5`, **`grid-column: span 2`** | — | ph "Cadde, sokak, no" |
| 83 | GPS Koordinatı | `Input` **`type="text"`** mono | — | ph "39.9042, 32.8597"; hint "Puantaj konum doğrulaması için" — §4.2.1 |
| 84 | Arsa Alanı (m²) | `Input` `type=number` mono, `text-align:right` | — | ph "2840" |
| 85 | İnşaat Alanı (m²) | `Input` `type=number` mono sağa | ★ | ph "6420" |
| 86 | Kat Sayısı | `Input` (metin) | — | ph "2 bodrum + 10 normal" — **sayı değil**, `floor_info` |

Yerleşim (ızgara akışı): 1. satır 79·80·81 · 2. satır 82 (span 2) + 83 ·
3. satır 84·85·86. `.pf-col-span-2` mevcut.

#### 4.2.1 GPS Koordinatı — tek serbest metin, ayrıştırma yok (kullanıcı kararı, 2026-07-30)

**Karar:** puantaj konum doğrulaması bu aşamada **yapılmayacak**. Dolayısıyla:

- Ekranda **tek kutu** (mockup satır 83 ile birebir), `type="text"`, mono yazı tipi.
- Veride de **tek metin**: `gps_coordinates` (String 50). `latitude`/`longitude`
  sayı çifti **açılmaz**.
- **Ayrıştırma yok, biçim doğrulaması yok.** Kullanıcı ne yazarsa o saklanır;
  "koordinat okunamadı" / "biçim: 39.9042, 32.8597" gibi bir hata **üretilmez**.
  Ne istemcide ne de gönderim öncesi bir normalleştirme çalışır.
- Yer tutucu (`39.9042, 32.8597`) ve ipucu ("Puantaj konum doğrulaması için")
  mockup'tan **aynen** basılır — ipucu alanın *amacını* anlatır, kural koymaz.

**Gerekçe:** koordinatın bugün hiçbir tüketicisi yok — puantaj/konum modülü
repoda mevcut değil. Tüketicisi olmayan bir alan için ayrıştırıcı + hata sözlüğü
yazmak spekülatif olurdu (YAGNI) ve kullanıcının elindeki geçerli ama farklı
biçimli girdiyi (DMS, `41.0082N 28.9784E`, tersine sıralı vb.) sebepsiz reddederdi.

**Gelecek iş (bu dilimin işi DEĞİL):** puantaj dilimi konum doğrulaması
getirdiğinde ayrıştırma + normalleştirme **o dilimde** yapılır; o zaman
`gps_coordinates` metninden `latitude`/`longitude` sayılarına göç tek migration'la
mümkündür (backend spec §3.5 aynı gerekçeyi taşıyor).

> **Backend'e devredilen iş:** backend spec §3.5 bugün gevşek bir regex
> doğrulaması (`^-?\d{1,2}(\.\d+)?\s*,\s*-?\d{1,3}(\.\d+)?$` → 422 "GPS
> koordinatı 'enlem, boylam' biçiminde olmalıdır.") öngörüyor. Bu karar o
> doğrulamayı **düşürür**: sunucu da biçim dayatmamalıdır. Regex kalırsa
> kullanıcı istemcide hiç uyarılmadan sunucu 422'sine çarpar — sessiz değil ama
> açıklanamaz bir hata olur. Backend spec'inin §3.5, §5.1/5 ve §7.1 satırları
> buna göre güncellenmelidir; frontend tarafında **hiçbir GPS kuralı yoktur**.

### 4.3 📅 Takvim & Bütçe (satır 91–99)

Izgara satır 93: `1fr 1fr 1fr 1fr; gap 14px` → `.pf-grid--4` (mevcut).

| Satır | Alan | Kontrol | Zorunlu | Not |
|---|---|---|---|---|
| 94 | Başlangıç Tarihi | `Input type=date` | ★ | — |
| 95 | Planlanan Bitiş | `Input type=date` | ★ | — |
| 96 | Süre (Gün) | `Input` mono sağa, **`readOnly`** | — | ph "480"; hint "Otomatik hesaplanır" (§8.2) |
| 97 | Şantiye Bütçesi (₺) | `Input type=number` mono sağa | — | ph "11200000" |

### 4.4 🏗 Bölümler (Fazlar) (satır 102–144)

Bu kart `padding:0; overflow:hidden` (satır 102) — diğer kartlardan **farklıdır**,
`.pf-card--flush` varyantı eklenir.

| Satır | Element | Ölçü / değer | Token |
|---|---|---|---|
| 102 | kart | `.card` + `padding:0; overflow:hidden` | `.pf-card .pf-card--flush` |
| 103 | başlık şeridi | `padding 16px 20px; border-bottom 1px #e2e8f0; flex; gap 10px` | `--space-4`, `--space-5`, `--color-border`, **YENİ** `--space-card-head-gap: 10px` |
| 104 | başlık | `14px/600 #1e293b` "🏗 Bölümler (Fazlar)" | `.pf-card__title` ölçüsü |
| 105 | yan not | `11px #94a3b8` "Şantiye iş fazlarına bölünür — her bölümün kendi iş kalemleri olur" | `--text-small`, `--color-text-subtle` |
| 106 | "+ Bölüm Ekle" | `margin-left auto; 12px/600 #2563eb; bağsız buton` | `--text-xs`, `--color-primary` |
| 108 | tablo | `width 100%; border-collapse collapse` | — |
| 109 | thead satırı | `bg #f8fafc; border-bottom 1px #e2e8f0` | `--color-surface-2` |
| 110 | th "Bölüm Adı" | `padding 10px 16px; 11px/600 #64748b; uppercase; ls .7px; sola` | `--text-table-head`, `--color-text-muted`, **YENİ** `--space-section-cell-y: 10px`, `--space-section-cell-x-lead: 16px`, `--tracking-section-head: .7px` |
| 111 | th "Sorumlu" | `padding 10px 12px; width 170px; sola` | **YENİ** `--space-section-cell-x: 12px`, `--width-col-responsible: 170px` |
| 112 | th "Başlangıç" | `width 130px; ortalı` | **YENİ** `--width-col-date: 130px` |
| 113 | th "Bitiş" | `width 130px; ortalı` | `--width-col-date` |
| 114 | th "Tahmini Bedel" | `width 130px; sağa` | **YENİ** `--width-col-amount: 130px` — sütun **yer tutucudur** (§3.5) |
| 115 | th (eylem) | `width 40px` | **YENİ** `--width-col-action: 40px` |
| 118 | tbody satırı | `border-bottom 1px #f1f5f9` | `--color-divider` |
| 119 | ad hücresi | `padding 10px 16px`; `.row-in` metin | `size="row"` Input |
| 120 | sorumlu | `.row-in` `<select>` (değer `user.id` → `manager_user_id`) | `size="row"` Select |
| 121–122 | tarihler | `.row-in` `type=date` | `size="row"` Input |
| 123 | tahmini bedel | **kontrol YOK** — hücrede düz `—`, sağa dayalı; `title={pendingModuleLabel("boq")}` | `--color-text-subtle`; §3.5 |
| 124 | sil | `ortalı`; `background none; border none; #94a3b8; 14px` içerik `×` | `--color-text-subtle`, `--text-body`; **kaydedilmemiş satırı kaldırır**, izin kapısı yok (§6.3) |
| 134 | alt satır | `bg #f8fafc`, `colspan 6` | `--color-surface-2` |
| 136 | ekle butonu | `border 1px dashed #cbd5e1; radius 7px; padding 7px 14px; 12px #64748b; flex gap 6px` | `--color-dashed-border`, `--radius-7`, **YENİ** `--space-dashed-btn-y: 7px`, `--space-dashed-btn-x: 14px` |
| 137 | ikon | `12×12 artı svg`, çizgi `#94a3b8` | `--color-text-subtle` |

Örnek satırlar (119–133: "Temel & Bodrum Katlar", "Kat 1–5 Kaba İnşaat" ve
`1840000` / `2960000` bedelleri) **örnek veridir, varsayılan değer değildir** —
basılmaz.

### 4.5 📦 Depo & Şantiye Altyapısı (satır 147–174)

Not: kullanıcı brief'i bu bölümü "Şantiye Tesisleri" diye anıyor; **mockup
başlığı** (satır 148) "📦 Depo & Şantiye Altyapısı"dır ve o basılır.

| Satır | Element | Ölçü / değer | Token |
|---|---|---|---|
| 149 | üst ızgara | `1fr 1fr; gap 14px; mb 14px` | `.pf-grid--2` (mevcut) |
| 151 / 159 | grup etiketleri | `.lbl` — "Depo Alanları" / "Şantiye Tesisleri" | `ui/field` etiket ölçüsü |
| 152 / 160 | kutucuk kutusu | `flex column; gap 7px; padding 12px; bg #f8fafc; radius 9px` | `--space-3`, `--color-surface-2`, **YENİ** `--radius-9: 9px`, `--space-checkbox-list-gap: 7px` |
| 153–155 | depo kutucukları | satır `flex; gap 8px; 13px #475569`; kutu `accent-color #2563eb` | `ui/checkbox`, `--space-2`, `--text-body`, `--color-text-secondary` |
| 161–165 | tesis kutucukları | aynı | aynı |
| 169 | alt ızgara | `1fr 1fr 1fr; gap 14px` | `.pf-grid--3` |
| 170 | Elektrik Aboneliği | `Input` mono; ph "Abone no" | — |
| 171 | Su Aboneliği | `Input` mono; ph "Abone no" | — |
| 172 | Planlanan İşçi Sayısı | `Input type=number` mono sağa; ph "48" | — |

Kutucuk listeleri (anahtarlar **backend sözleşmesinden**, §3.2.1):

| Grup | Anahtar (`facilities.*`) | Etiket | Satır | Mockup'ta | Formda başlangıç |
|---|---|---|---|---|---|
| Depo | `closed_warehouse` | D-1 Kapalı Ambar | 153 | ✔ işaretli | **boş** |
| Depo | `open_storage` | D-2 Açık Alan (Demir, kum, çakıl) | 154 | ✔ işaretli | **boş** |
| Depo | `cold_storage` | D-3 Soğuk Hava Deposu | 155 | ✗ | boş |
| Tesis | `site_office` | Şantiye Ofisi (Konteyner) | 161 | ✔ işaretli | **boş** |
| Tesis | `canteen` | İşçi Yemekhanesi | 162 | ✔ işaretli | **boş** |
| Tesis | `changing_room_wc` | Soyunma / WC | 163 | ✔ işaretli | **boş** |
| Tesis | `dormitory` | İşçi Yatakhanesi | 164 | ✗ | boş |
| Tesis | `infirmary` | Revir / İlk Yardım | 165 | ✔ işaretli | **boş** |

**Karar (kullanıcı kararı 8, 2026-07-30): sekiz kutucuğun HEPSİ boş başlar.**
Mockup'taki altı `checked` özniteliği — bu formdaki diğer ön-doldurulmuş
değerler gibi (satır 119/123'teki "Temel & Bodrum Katlar", `1840000`) —
**örnek veridir, varsayılan değildir.** Ön-işaretli açmak, kullanıcının hiç
bakmadığı bir kutuyu "bu şantiyede kapalı ambar var" diye kaydeder; bu, doldurma
kolaylığı değil **veri yalanıdır**. Onaylı sapma §11.12.

Gövdede sekiz anahtar da **her zaman** gider (`false` dahil) — backend
`SiteFacilitiesInput` varsayılanları da `False`, yani eksik anahtar da aynı
sonucu verir; yine de açık gönderim tercih edilir (kısmi güncelleme
belirsizliği doğmasın).

### 4.6 📎 Şantiye Belgeleri — yer tutucu (satır 177–217)

Düzen birebir korunur, **yükleme kodu yazılmaz** (kullanıcı kararı 5).

| Satır | Element | Ölçü / değer | Token |
|---|---|---|---|
| 179 | ızgara | `1fr 1fr 1fr; gap 12px` | `.pf-docs__grid` **`--columns: 3`** varyantı (P1.1a'daki `1fr 1fr`'den farklı — §5.3) |
| 180 vb. | kutu | `.drop` (satır 25) | `.pf-doc` |
| 182 vb. | ikon kutusu | `38×38; radius 9px; font 18px` | `--radius-9`, `.pf-doc__icon` |
| 183 vb. | başlık | `13px/600 #1e293b` | `.pf-doc__title` |
| 183 vb. | alt başlık | `11px #94a3b8; mt 1px` | `.pf-doc__sub` |
| 211 | sürükle-bırak | `mt 12px; column; center; padding 18px; gap 6px` | `.pf-doc--drop` |
| 213 | ikon | `24×24 yukarı-ok svg`, çizgi `#94a3b8` | `--color-text-subtle` |
| 214 | metin | `13px/500 #64748b` | `--color-text-muted` |
| 215 | alt metin | `11px #94a3b8` | `--color-text-subtle` |

Altı belge kutusu:

| Satır | Emoji | İkon zemini | Başlık | Alt başlık | Mockup ★ |
|---|---|---|---|---|---|
| 180–184 | 🏛 | `#fee2e2` → `--color-danger-soft` | Yapı Ruhsatı | Belediye onaylı | ★ |
| 185–189 | ⛑ | `#fef3c7` → `--color-warning-soft` | İSG Risk Değerlendirmesi | Şantiye başlangıcında zorunlu | ★ |
| 190–194 | 📋 | `#dbeafe` → `--color-primary-soft` | Acil Durum Planı | Tahliye ve müdahale planı | ★ |
| 195–199 | 📐 | `#ede9fe` → `--color-accent-purple-soft` | Şantiye Yerleşim Planı | Vaziyet planı, depo yerleşimi | — |
| 200–204 | 🔬 | `#dcfce7` → `--color-success-soft` | Zemin Etüt Raporu | Jeoteknik rapor | — |
| 205–209 | 📷 | `#f0fdf4` → `--color-success-tint` | Başlangıç Fotoğrafları | Arsa mevcut durumu | — |

Yer tutucu kuralları (P1.1a §8 ile birebir):

- `<input type="file">` **render edilmez**.
- Kutular `<div aria-disabled="true">`, `cursor:default`, `:hover` efekti kapalı.
- Her kutuda gri **"Yakında"** rozeti (`.pf-doc__badge`) ve
  `title={pendingModuleLabel("documents")}` → "Belge modülüyle birlikte gelir".
- Kart başlığının yanında not: *"Belge modülü bekleniyor — şantiyeyi
  oluşturduktan sonra belgeleri yükleyebileceksiniz."* (`.pf-card__note`).
- Mockup'ta ★ taşıyan üç alanın (183, 188, 193) yıldızı **basılmaz** —
  yüklenemeyen alanı zorunlu göstermek yanlış olur.
- Alt sürükle-bırak alanı (211–216) aynı kurallarla, tıklanamaz.

### 4.7 Alt eylem şeridi (satır 219–229)

| Satır | Element | Ölçü / değer | Token |
|---|---|---|---|
| 219 | şerit | `flex; justify-content space-between; align center; gap 12px` | `.pf-actions--split` varyantı |
| 220–223 | kutucuk | `15×15; accent #2563eb`; metin `13px #475569` "Oluşturduktan sonra poz dağılımı ekranına git" | `ui/checkbox` `size="lg"` (**YENİ varyant**, §5.2) — **disabled + işaretsiz**, `title={pendingModuleLabel("contracts")}` |
| 225 | İptal | `bg #fff; #475569; border 1.5px #e2e8f0; padding 10px 20px; radius 8px; 13px/500` | `.pf-action--cancel` (mevcut) |
| 226 | Taslak Kaydet | `bg #fff; #2563eb; border 1.5px #bfdbfe; padding 10px 20px; 13px/600` | `.pf-action--draft` (mevcut) |
| 227 | Şantiyeyi Oluştur | `bg #2563eb; #fff; padding 10px 24px; 13px/600` | `.pf-action--submit` (mevcut) |

---

## 5. Yeni token ve yeni primitive

### 5.1 Yeni token'lar (`src/styles/tokens.css`)

| Token | Değer | Kullanım | Satır |
|---|---|---|---|
| `--radius-9` | `9px` | kutucuk kutusu, belge ikon kutusu | 152, 160, 182 |
| `--leading-loose` | `1.7` | bilgi kutusu metni | 55 |
| `--space-info-banner-y` | `14px` | bilgi kutusu dikey iç boşluk | 53 |
| `--space-info-banner-x` | `18px` | bilgi kutusu yatay iç boşluk | 53 |
| `--space-card-head-gap` | `10px` | Bölümler kartı başlık şeridi | 103 |
| `--space-section-cell-y` | `10px` | bölüm tablosu hücre dikey | 110–124 |
| `--space-section-cell-x` | `12px` | bölüm tablosu hücre yatay | 111–124 |
| `--space-section-cell-x-lead` | `16px` | ilk sütun yatay | 110, 119 |
| `--tracking-section-head` | `0.7px` | tablo başlığı harf aralığı (mevcut `--text-table-head` 0.8px kullanır, bu form 0.7px ister) | 110–114 |
| `--width-col-responsible` | `170px` | Sorumlu sütunu | 111 |
| `--width-col-date` | `130px` | Başlangıç / Bitiş sütunları | 112, 113 |
| `--width-col-amount` | `130px` | Tahmini Bedel sütunu | 114 |
| `--width-col-action` | `40px` | sil sütunu | 115 |
| `--space-dashed-btn-y` | `7px` | "Bölüm ekle" butonu | 136 |
| `--space-dashed-btn-x` | `14px` | "Bölüm ekle" butonu | 136 |
| `--space-checkbox-list-gap` | `7px` | kutucuk listesi satır aralığı | 152, 160 |
| `--size-checkbox-lg` | `15px` | alt şerit kutucuğu | 221 |
| `--space-row-control-y` | `6px` | `.row-in` dikey iç boşluk | 27 |
| `--space-row-control-x` | `8px` | `.row-in` yatay iç boşluk | 27 |
| `--text-row-control` | `12px` | `.row-in` yazı boyu | 27 |
| `--border-width-row-control` | `1px` | `.row-in` kenarlık | 27 |
| `--radius-row-control` | `var(--radius-6)` | `.row-in` köşe | 27 |
| `--space-form-action-gap` | `10px` | alt eylem grubu boşluğu (İptal · Taslak · Birincil). Kabuk `--space-2`=8px kullanıyordu; **proje mockup'ı 212 de 10px ister**, düzeltme paylaşılan kabuktadır (2026-07-30) | 224 |

**Kart başlığı düzeltmesi (2026-07-30, kullanıcı kararı).** Paylaşılan
`.pf-card__title` `--text-body` (13px) kullanıyordu; **iki mockup da**
(`Form - Santiye Ekle.dc.html:24` ve `Form - Proje Oluştur.dc.html:24`)
`.card-t{font-size:14px}` ilan ediyor. Bu bilinçli bir sapma değil, P1.1a'da
fark edilmemiş bir kaymaydı — **mockup kazanır**. Düzeltme paylaşılan kabukta
yapıldığı için (`--text-form-card-title: 14px`) **Proje Oluştur formu da 14px
olur**; bu beklenen ve kabul edilen sonuçtur. Görsel etkisi için plan TZ-3.

**Mevcut olduğu doğrulanan** ve yeniden kullanılan renkler: `#1e293b`, `#475569`,
`#64748b`, `#94a3b8`, `#e2e8f0`, `#cbd5e1`, `#f8fafc`, `#f1f5f9`, `#eff6ff`,
`#dbeafe`, `#bfdbfe`, `#2563eb`, `#1d4ed8`, `#ef4444`, `#fee2e2`, `#fef3c7`,
`#ede9fe`, `#dcfce7`, `#f0fdf4`. **Yeni renk token'ı gerekmiyor.**

### 5.2 Yeni primitive (varyantlar) — `src/components/ui/`

Ham `<select>/<input>/<label>` yasak (`GOREV-SIRASI.md` §3). Mockup iki yeni
kontrol ölçüsü getiriyor; ikisi de **yeni dosya değil, mevcut primitive'lere
varyant** olarak eklenir ve `form-control-metrics.test.ts` genişletilir.

| # | Primitive | Değişiklik | Mockup satırı |
|---|---|---|---|
| 1 | `ui/input`, `ui/select` | `size?: "form" \| "row"` — `"row"` = `.row-in` (1px kenar, 6px köşe, 6/8px iç boşluk, 12px yazı). Varsayılan `"form"` değişmez | 27 |
| 2 | `ui/checkbox` | `size?: "md" \| "lg"` — `"lg"` = 15×15 | 221 |

Gerekçe: `.row-in` yalnız bu formda değil, tüm satır-içi düzenleme tablolarında
(BOQ, hakediş kalemleri) gerekecek; ayrı bir `RowInput` bileşeni açmak aynı
odak/etiket/`aria-describedby` mantığını ikinci kez yazmak olurdu.

### 5.3 Paylaşılan form kabuğunun çıkarılması (öneri)

`src/components/project-form/project-form.css` bugün **iki forma da ait olan**
blokları taşıyor: `.pf`, `.pf-topbar`, `.pf-breadcrumb`, `.pf-head`, `.pf-card`,
`.pf-grid*`, `.pf-actions*`, `.pf-doc*`. Öneri:

- Bu bloklar **sınıf adları değişmeden** `src/styles/form-shell.css`'e taşınır
  (görsel/davranışsal fark sıfır, P1.1a testleri kırılmaz).
- Her iki form da onu import eder; forma özgü bloklar kendi CSS dosyasında kalır
  (`project-form.css`, yeni `site-form.css`).
- `DocumentsPlaceholderCard` sütun sayısı (`2` → proje, `3` → şantiye, satır 179)
  ve kalem listesi **prop** alacak biçimde genelleştirilir; iki formun belge
  metinleri ayrı sabit dizilerde durur.
- `FormActions` "İptal · Taslak Kaydet · Birincil" üçlüsünü zaten karşılıyor;
  yalnız `.pf-actions--split` (satır 219 `space-between`) varyantı eklenir.

---

## 6. Bölümler tablosu UI'ı

### 6.1 Satır modeli

```ts
interface SectionRow {
  id: string;              // istemci id'si — index KEY OLAMAZ (P1.1a SiteRepeaterCard notu)
  name: string;
  managerUserId: string;   // seçilen kullanıcının UUID'si; "" = seçilmedi
  startDate: string;
  endDate: string;
  // estimatedAmount YOK — sütunda kontrol basılmaz, hücrede "—" (§3.5)
}
```

`manager_name` **gönderilmez**: sunucu `manager_user_id`den anlık görüntü yazar
(backend spec §2.5). `sort_order` da **gönderilmez**: sunucu dizi sırasından
atar (§3.4). Gövdeye giden bölüm satırı yalnız
`{ name, manager_user_id?, start_date?, end_date? }`'dir.

### 6.2 Satır ekleme

İki ekleme yolu vardır ve **ikisi de aynı işi yapar** (mockup 106 ve 136):

- Başlıktaki metin butonu "+ Bölüm Ekle" (satır 106).
- Tablo altındaki kesikli buton (satır 136).

Yeni satır listenin **sonuna** eklenir ve odak yeni satırın **Bölüm Adı**
kontrolüne taşınır.

**Mockup metni sapması (kullanıcı kararı 7, 2026-07-30 — KESİN):** satır 138'in
metni "Bölüm ekle veya şablon kullan". **Bölüm şablonu özelliği YOKTUR ve bu
dilimde planlanmamıştır.** Olmayan bir özelliği vaat eden metin basmak, ölçü
sapmasından daha zararlıdır → buton metni **"Bölüm ekle"** olarak kısaltılır;
metnin ikinci yarısı basılmaz, yerine devre dışı bir "şablon" yüzeyi de
konmaz. Onaylı sapma §11.3. Bu artık açık soru **değildir**.

### 6.3 Satır silme (≠ kayıtlı bölüm silme)

> **Ayrım (kullanıcı kararı 6, 2026-07-30):** *satır kaldırma* ile *kayıt silme*
> iki ayrı şeydir ve bu formda yalnız birincisi vardır.
>
> | | Bu formdaki `×` (satır 124) | `DELETE /sections/{id}` |
> |---|---|---|
> | Neye dokunur | henüz **kaydedilmemiş** istemci satırı | veritabanındaki bölüm kaydı |
> | Ağ isteği | yok | var |
> | İzin | **kapı yok** — form zaten `sites:full` gerektirir | `sites` · **`admin`** |
> | Bu dilimde | **var** | **yok** |
>
> Backend dilimi `DELETE /sites/{id}` ve `DELETE /sections/{id}` uçlarını
> `admin` izniyle açıyor. **Bu form onları çağırmaz** — form yalnızca oluşturma
> yüzeyidir; silinecek bir kayıt henüz yoktur. Dolayısıyla bu dilimde
> `canDelete` kapısı **kullanılmaz** ve `×` butonu izin kontrolü **taşımaz**;
> onu izne bağlamak, `sites:full` yetkisiyle formu açan kullanıcının kendi
> yazdığı satırı geri alamamasına yol açardı.
>
> **Gelecek iş (bu dilimin işi DEĞİL):** silme yüzeyi ilk kez şantiye/bölüm
> **düzenleme** kipinde ya da liste ekranında doğacak. O gün:
> `src/lib/auth/permissions.ts` bugün yalnız `canWrite`'ı taşıyor; oraya aynı
> desenle (`level === undefined → true`, aksi hâlde `level === "admin"`)
> bir **`canDelete`** eklenir ve kaydedilmiş kayda dokunan **her** silme yüzeyi
> onun arkasına konur — `canWrite`'ın arkasına **konmaz**, çünkü `full` silmeyi
> kapsamıyor (backend spec §9).

- Her satırın son hücresinde `×` butonu (satır 124), `aria-label="{n}. bölümü sil"`.
- **Son satır da silinebilir** — sıfır bölüm geçerlidir
  (`sites/models.py` `Section` sınıf yorumu: "şantiye sıfır bölümle geçerlidir,
  otomatik 'Genel' bölümü AÇILMAZ").
- Silme sonrası odak: sonraki satırın Bölüm Adı kontrolüne; sonraki satır yoksa
  kesikli ekle butonuna.
- Onay diyaloğu **yok** (satır henüz kaydedilmemiş veridir).

### 6.4 Başlangıç durumu ve boş durum

- Form açıldığında **bir adet boş satır** vardır (P1.1a §4.7 deseninin aynısı).
- Tüm satırlar silinirse `tbody` içinde tek hücreli boş durum satırı basılır:
  *"Henüz bölüm eklenmedi — şantiye bölümsüz de oluşturulabilir."*
  (`--text-body`, `--color-text-subtle`, ortalı, `padding: var(--space-5)`).
  Kesikli ekle satırı (134) her hâlükârda görünür kalır.

### 6.5 Doğrulama

| Kural | Davranış |
|---|---|
| Tümü boş satır | Gönderimde **sessizce atılır** (hata değil) |
| Adı boş ama başka alanı dolu | Hata: "Bölüm adı zorunludur." — ilgili hücre `--color-danger` kenarlık alır |
| Bitiş < Başlangıç | Hata: "Bölüm bitiş tarihi başlangıçtan önce olamaz." |
| Aynı ad iki satırda | Uyarı **yok** (backend kısıtı yalnız `code` üzerinde ve kod bu formda girilmiyor) |
| Taslakta | Yalnız "tümü boş → at" ve tarih sırası kuralı çalışır; ad boşluğu **hata vermez**, o satır atılır |

Hata mesajı satırın altında değil, **tablonun altında** listelenir
(`{n}. satır: {mesaj}`), çünkü hücre yüksekliği 10px iç boşlukla sabittir ve
hücre içi mesaj tabloyu zıplatır. Hatalı hücre yine kırmızı kenarlık alır ve
`aria-describedby` ile listedeki mesaja bağlanır.

### 6.6 Klavye davranışı

| Tuş | Bağlam | Davranış |
|---|---|---|
| `Tab` / `Shift+Tab` | tablo | Normal DOM sırası: ad → sorumlu → başlangıç → bitiş → **(bedel hücresinde kontrol yok, hiç uğranmaz)** → sil → sonraki satır |
| `Enter` | tablo içindeki herhangi bir kontrol | `preventDefault` + **yeni satır ekler**, odak yeni satırın adına gider (elektronik tablo beklentisi). Form **gönderilmez** |
| `Enter` | tablo dışındaki herhangi bir alan | Formun varsayılan gönderimi = "Şantiyeyi Oluştur" |
| `Escape` | tablo | Bir şey yapmaz (yanlışlıkla sayfadan çıkmayı önler) |

---

## 7. Tesisler UI'ı (mockup'ta ne şekilde)

**Onay kutusu listesi.** Çip yok, sayaç yok, arama yok — mockup satır 153–155 ve
161–165 düz `<label><input type="checkbox">` satırlarıdır.

- İki sütun yan yana (satır 149: `1fr 1fr`): solda **Depo Alanları** (3 kalem),
  sağda **Şantiye Tesisleri** (5 kalem).
- Her liste, `#f8fafc` zeminli, 9px köşeli, 12px iç boşluklu bir kutu içinde
  dikey akar; satır aralığı 7px (satır 152, 160).
- Satır: kutucuk + 8px boşluk + 13px `#475569` etiket; kutucuk vurgusu
  `accent-color:#2563eb` (`ui/checkbox` zaten bu rengi kullanır).
- Liste sabittir (§4.5 anahtar tablosu); kullanıcı kalem **ekleyemez**.
- Grup başlıkları `.lbl` ölçüsündedir (satır 151, 159) ve `ui/field`'ın etiket
  katmanıyla basılır; her liste bir `role="group"` + `aria-labelledby` taşır.
- Sayaç/rozet mockup'ta **yoktur** → eklenmez.
- **Hepsi işaretsiz başlar** (kullanıcı kararı 8, §4.5). Mockup'taki altı işaret
  örnek veridir; ne form varsayılanı ne DB varsayılanıdır (backend'de sekizinin
  de `server_default=false` olması zaten zorunlu — backend spec §2.6 notu).
- İki grup yalnız **görsel**dir: veri tarafında tek düz `facilities` nesnesi
  vardır (§3.2.1), "depo" ve "tesis" diye ayrı iki alan **yoktur**.
- Kutucuklar zorunlu değildir, doğrulamaya girmez; hiçbiri işaretlenmeden
  şantiye oluşturulabilir.

---

## 8. Otomatik hesaplananlar

### 8.1 Şantiye kodu (satır 67)

- Alan boş bırakılırsa gövdeden **hiç gönderilmez**; sunucu üretir
  (`SiteFormModal.tsx:59` bugün de böyle yapıyor, desen korunur).
- Kullanıcı açıkça bir kod verirse ve çakışırsa `409` → alan hatası:
  "Bu şantiye kodu zaten kullanılıyor. Farklı bir kod girin veya kodu boş bırakın."
  (mevcut `DUPLICATE_CODE_MESSAGE` metni korunur.)
- Üretici biçimi `SNT-{YYYY}-{NNN}` önerisi §3.6'da, açık soru §14.4.

### 8.2 Süre (Gün) (satır 96)

**Uç-dahil**, P1.1a ile aynı — `GOREV-SIRASI.md` §4.3 bunu kalıcı karar olarak
sabitliyor ("Süre uç-dahil (`end − start + 1`)"):

```
durationDays(start, end) = differenceInCalendarDays(end, start) + 1
```

- Tarihlerden biri boşsa alan **boş** kalır (0 basılmaz).
- Sonuç negatifse alan boş kalır ve tarih doğrulama mesajı çıkar.
- Alan `readOnly`'dir, gövdede **gönderilmez** (türev; saklanmaz).
- Saf fonksiyon `site-form/derive.ts` içindedir; P1.1a'nın `project-form/derive.ts`
  dosyasındaki `durationDays` **yeniden kullanılır** (kopyalanmaz — §5.3'teki
  paylaşım hamlesiyle birlikte `src/lib/form/derive.ts`'e taşınır).

### 8.3 Türev olmayan ama otomatik görünen alanlar

`Şantiye Bütçesi` (97) **kullanıcı girdisidir**, bölüm bedellerinin toplamı
değildir — bölüm bedeli sütunu zaten yer tutucudur (§3.5). Mockup'ta hiçbir
toplam/kâr kutusu **yoktur** (P1.1a'daki kâr marjı kutusunun karşılığı bu formda
yok), bu yüzden hesaplanan hiçbir özet basılmaz.

---

## 9. Veri sözleşmesi

### 9.1 Kullanılan uçlar

| Uç | Hook | Amaç | BFF kökü |
|---|---|---|---|
| `GET /projects/{project_id}` | `useProject` (mevcut) | kırıntı yolu proje adı + bilgi kutusu (ad, kod, tip) | `projects` ✔ |
| `GET /users` | **yeni** `useUserOptions()` | Şantiye Şefi, İSG Uzmanı, Bölüm Sorumlusu seçicileri | `users` ✔ |
| `POST /projects/{project_id}/sites` | `useCreateSite` (mevcut, gövdesi genişler) | şantiye + bölümler, **tek atomik istek** (§3.4) | `projects` ✔ |

Bu form **başka uç çağırmaz**. Özellikle:

- `POST /sites/{site_id}/sections` (`useCreateSection`) **kullanılmaz** — §3.4'ün
  yedek yolu kaldırıldı.
- `DELETE /sites/{id}` ve `DELETE /sections/{id}` backend'de `admin` iznine
  açılıyor ama **bu formdan çağrılmaz** (§6.3).

**`ALLOWED_ROOTS` kontrolü:** `projects`, `sites`, `users` üçü de
`src/app/api/backend/[...path]/route.ts` içinde **zaten kayıtlı** — bu dilim
yeni kök açmıyor. Task'ta yine de kapı olarak doğrulanır (kök eksikse modül
yalnız canlıda 404 verir, jsdom testleri görmez).

### 9.2 `useUserOptions` (yeni hook)

`useUsers` bugün sayfalıdır (`limit`/`offset`, `PAGE_SIZE = 20`). Yeni hook tek
istekle çeker, `{ id, full_name, title }` listesine indirger ve üç seçici
tarafından paylaşılır (tek sorgu, tek önbellek anahtarı). Seçenek metni
`userOptionLabel(user)` = `title` doluysa `"{full_name} ({title})"`, değilse
`"{full_name}"` (§4.1.2).

#### 9.2.1 BİLİNEN SINIRLAMA: seçiciler sunucu tavanı olan 200 kullanıcıda kesilir

> **Düzeltme (2026-07-30, plan TZ-4b / D1):** bu bölümün önceki sürümü "seçiciler
> **20 kullanıcıda** kesilir" diyordu. **Bu tespit yanlıştı.** Koddan ölçüldü
> (`backend/app/modules/users/router.py:40`): `GET /users` `limit` parametresi
> **varsayılan 50**, **tavan `le=200`**'dür. `useUsers`'ın `PAGE_SIZE = 20`'si o
> hook'un **kendi sayfalama tercihidir**, sunucu sınırı değildir.

**Bugünkü durum:** `useUserOptions` tek istekle `limit=200` (sunucu tavanı) ister
→ **200 kullanıcıya kadar sorun yoktur**. 200'den fazla kullanıcısı olan bir
kurulumda 201. kullanıcıdan itibaren hiçbir seçicide görünmez.

Bu bir tasarım tercihi değil, **kabul edilmiş bir eksikliktir** ve burada
kayıtlıdır ki sessizce kaybolmasın. Bu dilimde uydurma bir çözüm
(sunucu tavanının üstünde keyfi bir değer, ardışık sayfa döngüsü, istemci tarafı
birleştirme) **yazılmaz** — 200 sözleşmenin ilan ettiği tavandır, üstü tahmindir.

**Backend'e devredilen iş (bu dilimin işi DEĞİL):** 200 üstü kurulumlar için
sunucu tarafı arama (`?q=`) backend tarafında kararlaştırılıp açılmalıdır.
Uç geldiğinde `useUserOptions` tek noktadan ona geçer; form kodu değişmez.

**Bu dilimde ne yapılır:** liste tam gelmemiş olabileceği için seçicilerin
altında ipucu ölçüsünde bir not durur — *"Listede aradığınız kişi yoksa
kullanıcı listesi henüz tamamlanmamış olabilir."* Sessiz kesme yasak
(`GOREV-SIRASI.md` §3).

Yükleme sırasında seçiciler `disabled` + "Yükleniyor…" tek seçeneği gösterir;
hata durumunda `disabled` + "Kullanıcılar yüklenemedi" gösterir ve form
gönderilebilir kalır.

**403 ayrı bir durumdur** (§10.1.1, §11.15): hook `isForbidden` türevi yayımlar,
seçicilerin altında §15/23b metni (*"Kişi listesini görme yetkiniz yok — bu
alanları boş bırakabilirsiniz."*) basılır ve **şef zorunluluğu kalkar**. Sessiz
boş açılır liste her durumda yasaktır (`GOREV-SIRASI.md` §3).

### 9.3 Gönderim gövdesi

```ts
// POST /projects/{projectId}/sites   (tek istek, atomik — §3.4)
{
  // kimlik (63–73)
  name,                                  // ★
  code?,                                 // boşsa ANAHTAR HİÇ YOK (§3.6)
  status,                                // "preparation" | "active" | "on_hold"
  site_manager_user_id,                  // UUID | null   (69)
  safety_officer_user_id,                // UUID | null   (70)
  safety_officer_is_outsourced,          // boolean       (70)
  // konum & alan (76–88)
  city, neighborhood, parcel, address,
  gps_coordinates,                       // serbest metin, ayrıştırılmaz (§4.2.1)
  land_area_m2, construction_area_m2,
  floor_info,                            // metin (86)
  // takvim & bütçe (91–99)
  start_date, end_date, budget,
  // tesisler (147–174)
  facilities: {                          // 8 anahtar, hepsi her zaman gider (§3.2.1)
    closed_warehouse, open_storage, cold_storage,
    site_office, canteen, changing_room_wc, dormitory, infirmary,
  },
  electricity_subscription_no, water_subscription_no, planned_worker_count,
  // bölümler + taslak
  sections: [{ name, manager_user_id?, start_date?, end_date? }],   // 102–144
  is_draft,                              // 226
}
```

Kurallar:

- Boş metin alanları `null` gönderilir (`SiteFormModal.tsx:61-66` deseni).
- `code` boşsa **anahtar hiç gönderilmez** (mevcut desen, satır 59).
- Sayısal alanlar boşsa `null`; girilmişse `Number(...)`.
- **Gönderilmeyen alanlar** ve nedenleri:
  - `site_manager_name` / `safety_officer_name` / `sections[].manager_name` →
    sunucu FK'den anlık görüntü yazar (backend spec §6.1 notu). İstemciden
    göndermek iki gerçek üretir.
  - `sections[].sort_order` → dizi sırasından sunucu atar (§3.4).
  - `sections[].estimated_amount` → **sütun yok** (§3.5).
  - `duration_days` → türev, saklanmaz (§8.2).
  - `delivery_date` → mockup'ta yok (onaylı sapma §11.4).
  - `project_id` → yol parametresidir, gövdede taşınmaz (§4.1.1).
  - belge alanları → **hiç yok** (§1.2, §4.6).
- `status` değerleri **backend enum'udur**; Türkçe etiketler yalnız görüntüdür
  (`Hazırlık→preparation`, `Aktif→active`, `Beklemede→on_hold`).

### 9.4 Taslak gönderimi

P1.1a §5'in birebiri:

1. **Kalıcıdır** — `POST` ile `is_draft: true`; tarayıcı yerel depolaması
   KULLANILMAZ.
2. **Gevşetilmiş doğrulama** — yalnız `name` zorunlu (§10.2).
3. **Kodu yine de vardır** — boşsa sunucu üretir.
4. **Görünürdür — projeye erişimi olan HERKESE** (koordinatör kararı,
   2026-07-30). "Yalnız oluşturan görür" gibi bir süzgeç **yoktur**; görünürlük
   tamamen mevcut `user_project_access` kuralına bırakılır.
5. **Rozetle ayırt edilir, ayrı sekmeyle değil** (koordinatör kararı): şantiye
   listesinde kayıt `Taslak` rozetiyle çıkar (`--color-warning-soft` yüzeyi,
   `ProjectListItem.is_draft` deseni). **Yeni sekme açılmaz.**
6. **Sayaçlardan dışlanmaz**: backend `SiteCounts`'a ayrı bir `draft` sayacı
   ekler, ama taslaklar durum sayaçlarından (`active`/`on_hold`/`completed`)
   **düşülmez** (backend spec §5.2). Bu spec'in önceki sürümündeki "aktif
   şantiye sayan her yer `NOT is_draft` ekler" cümlesi **geçersizdir** —
   backend'le çelişiyordu.
7. **Taslaktan çıkış** düzenleme kipiyle olur → bu dilimde **yok** (§1.2).

### 9.5 Önbellek geçersizleştirme

`useCreateSite` zaten `SITES_QUERY_KEY` + `PROJECT_QUERY_KEY` geçersiz kılıyor
(şantiye listesi + proje hero'sundaki `site_count`). Değişiklik gerekmiyor.

---

## 10. Doğrulama

İstemci doğrulaması sunucununkini **taklit eder, yerine geçmez**; ikisi de
uygulanır. Hatalı alan `--color-danger` kenarlık alır, mesaj alanın altına
`.hint` ölçüsünde kırmızı basılır (`aria-describedby` ile bağlı) ve **ilk hatalı
alana odak taşınır**.

### 10.1 Zorunlu alanlar (mockup ★ işaretlileri)

| Satır | Alan | Mesaj |
|---|---|---|
| 66 | Şantiye Adı | "Şantiye adı zorunludur." |
| 68 | Bağlı Proje | — (rota bağlamından gelir, kullanıcı hata yapamaz) |
| 69 | Şantiye Şefi | "Şantiye şefi seçiniz." (**istisna aşağıda**) |
| 79 | İl / İlçe | "İl / ilçe zorunludur." |
| 85 | İnşaat Alanı (m²) | "İnşaat alanı zorunludur." |
| 94 | Başlangıç Tarihi | "Başlangıç tarihi zorunludur." |
| 95 | Planlanan Bitiş | "Planlanan bitiş tarihi zorunludur." |

Mockup'ta ★ taşıyan üç **belge** alanı (183, 188, 193) zorunlu **basılmaz**
(§4.6). **İSG Uzmanı (70) zorunlu değildir** (kullanıcı kararı 4, 2026-07-30):
alanda ★ yoktur, backend `_validate_site` taslak-dışında da aramaz; ipucu metni
("İSG mevzuatı gereği zorunlu") aynen basılır ama kural koymaz.
Onaylı sapma §11.5.

**GPS Koordinatı (83) için hiçbir doğrulama kuralı yoktur** — ne zorunluluk, ne
biçim (§4.2.1).

#### 10.1.1 İSTİSNA: kişi listesi yüklenemediğinde Şantiye Şefi zorunluluğu kalkar

**Kullanıcı kararı (2026-07-30).** `GET /users` `user_management:view` ister ve bu
izin yalnız sistem yöneticisindedir; `sites:full` yetkili bir proje müdürü formu
açtığında üç kişi seçicisi de **403** alır (plan TZ-4b).

Kural:

- **Kullanıcı listesi yüklenemediğinde (403 veya diğer hata) Şantiye Şefi
  zorunluluğu KALKAR** — alan boş bırakılabilir, `"Şantiye şefi seçiniz."` mesajı
  basılmaz ve form gönderilebilir (`site_manager_user_id: null` gider; alan
  backend'de nullable).
- **Liste başarıyla geldiğinde zorunluluk aynen işler.** Gevşeme kalıcı değildir,
  yalnızca sorgunun hatalı olduğu duruma bağlıdır.
- Seçicinin serbest metin kutusuna düşmesi **reddedildi** (kullanıcı kararı): boş
  geçilebilir bir seçici kalır, altında §15/23b metni basılır.

Onaylı sapma §11.15.

### 10.2 Taslakta gevşeyen kurallar

| Kural | Kaydet | Taslak |
|---|---|---|
| Şantiye adı | zorunlu | **zorunlu** (kimliksiz taslak listede ayırt edilemez) |
| Şef / İl-İlçe / İnşaat alanı / tarihler | zorunlu | **atlanır** |
| Bitiş ≥ Başlangıç | uygulanır | **uygulanır** (eksik değil, yanlış veri) |
| Negatif sayı yok | uygulanır | **uygulanır** |
| GPS | **kural yok** | **kural yok** (§4.2.1) |
| Tesis kutucukları | kural yok | kural yok |
| Bölüm satırı adı | zorunlu (dolu satırda) | **atlanır** — adsız satır sessizce atılır |
| Bölüm tarih sırası | uygulanır | **uygulanır** |

### 10.3 Tutarlılık kuralları ve mesajları

| Durum | Mesaj |
|---|---|
| Bitiş < Başlangıç | "Planlanan bitiş tarihi başlangıçtan önce olamaz." |
| Negatif alan/bütçe/işçi sayısı | "Değer negatif olamaz." |
| Sayı alanına metin | "Bu alan sayı olmalıdır." |
| Planlanan işçi sayısı ondalıklı | "İşçi sayısı tam sayı olmalıdır." |
| Şantiye kodu çakışması (409) | "Bu şantiye kodu zaten kullanılıyor. Farklı bir kod girin veya kodu boş bırakın." |
| Bölüm adı boş, satır dolu | "Bölüm adı zorunludur." |
| Bölüm bitiş < başlangıç | "Bölüm bitiş tarihi başlangıçtan önce olamaz." |
| Diğer sunucu hataları | mevcut `backendErrorMessage()` yardımcısı |

**GPS için istemci doğrulaması YOKTUR** (§4.2.1): ne biçim regex'i, ne
"koordinat okunamadı" mesajı, ne normalleştirme. Alan serbest metindir.

**Kısmi başarı durumu yoktur**: gönderim atomiktir (§3.4), ya hepsi yazılır ya
hiçbiri. Önceki sürümdeki "Şantiye oluşturuldu, ancak {n} bölüm eklenemedi…"
mesajı **kaldırılmıştır**.

**Şantiye bütçesinin proje bütçesiyle karşılaştırılması YOKTUR** (koordinatör
kararı, 2026-07-30): şantiye bütçelerinin toplamı proje bütçesini aşsa bile
**uyarı verilmez**. Gerekçe: proje bütçesi P1.1a'da dört kalemden hesaplanıyor,
şantiye bütçesi elle giriliyor; ikisi aynı anlam katmanında değil ve bu formda
diğer şantiyelerin bütçesi zaten okunmuyor — okumak için ek istek gerekirdi.

---

## 11. Onaylı sapmalar

Her satır: **mockup satır no + ne yapılmadı + neden**. Bu listede olmayan hiçbir
sapma meşru değildir; uygulama sırasında yeni sapma çıkarsa buraya eklenir.

| # | Sapma | Mockup satırı | Gerekçe |
|---|---|---|---|
| 11.1 | "Bağlı Proje" açılırı **kilitli** | 68 | Rota `projectId` taşır; `SiteCreate` gövdesinde `project_id` yok; `SiteUpdate` "şantiye başka projeye taşınamaz" der |
| 11.2 | İSG/şef seçeneklerindeki unvan eki mockup'taki "(A Sınıfı)" **sabiti değil**, `UserResponse.title`tan üretilir; `title` boşsa parantez hiç basılmaz | 70 (ayrıca 69, 120) | Kullanıcı kaydında "İSG sınıfı" diye bir alan yok; sabiti basmak veri yalanı olurdu. `title` gerçek veridir → mockup'ın biçimi korunur, içeriği uydurulmaz |
| 11.3 | **"Bölüm ekle veya şablon kullan" → "Bölüm ekle"** (metin kısaltılır; yerine devre dışı bir şablon yüzeyi de konmaz) | 138 | Bölüm şablonu (hazır faz seti) kavramı sistemde **yok** ve planlanmıyor (kullanıcı kararı 7, 2026-07-30). Olmayan bir özelliği vaat eden metin, ölçü sapmasından daha zararlıdır: kullanıcı tıklanacak bir "şablon" arar ve bulamaz |
| 11.4 | `delivery_date` (Teslim Tarihi) düşer | — (mockup'ta yok) | Mevcut modalde vardı; mockup'ta yok — mockup kazanır. Sunucuda kolon kalır, formdan yazılmaz |
| 11.5 | İSG Uzmanı **opsiyonel**; ipucu "İSG mevzuatı gereği zorunlu" yine de aynen basılır | 70 | Etikette ★ yok → ★ otoritedir (kullanıcı kararı 4, 2026-07-30). İpucu yasal hatırlatmadır; metni silmek mockup sadakatini bozardı, kural saymak kullanıcıyı bloke ederdi |
| 11.6 | Bölüm **"Tahmini Bedel" sütunu yer tutucudur**: sütun başlığı, genişliği ve hizası korunur, ama hücrede **girdi kontrolü basılmaz** — düz `—` gösterilir | 114, 123 | `sections.estimated_amount` **eklenmiyor** (kullanıcı kararı 3, 2026-07-30). Bölüm bedeli BOQ kalemlerinin türevidir (`sites/models.py`); elle girilen bir tahmin, BOQ toplamıyla yan yana **iki ayrı gerçek** üretir ve hangisinin otorite olduğu sorusu bu dilimde cevaplanamaz. Sütunun kaldırılması yerine yer tutucu bırakılması, İş Kalemleri geldiğinde tablonun yeniden çizilmesini gereksiz kılar |
| 11.7 | **"+ Yeni Personel Ekle" seçeneği basılmaz** — şef seçicisinin son seçeneği düşer | 69 | Personel modülü repoda yok (`personnel` izin satırı var, kodu yok). Tıklandığında hiçbir yere gitmeyen bir "ekle" seçeneği, eylem vaat edip yerine getirmez; devre dışı basmak da seçici içinde anlamsız gürültü olurdu (kullanıcı kararı 3) |
| 11.8 | Poz dağılımı bağlantısı ve kutucuğu **edilgen** (tıklanamaz `<span>` / `disabled` + işaretsiz kutucuk) | 59, 220–223 | Hedef ekran (poz dağılımı) yok; gizlemek yerine `pendingModuleLabel("contracts")` ile dürüst gösterim |
| 11.9 | Belge kutularındaki ★ basılmaz | 183, 188, 193 | Yüklenemeyen bir alanı zorunlu göstermek, karşılanamayacak bir kural ilan etmektir (P1.1a §8 ile aynı) |
| 11.10 | **Altı belge kutusu + sürükle-bırak alanı yalnız yer tutucudur**: düzen/metin/ikon birebir, ama `input[type=file]` yok, sürükleme işleyicisi yok, gövdede belge alanı yok | 177–217 | Dosya yükleme alt sistemi repoda **hiç yok** ve backend spec §2.7 belge kolonu/tablosu/ucu açmıyor. Kartı tamamen silmek mockup'ın bir bölümünü yok ederdi; çalışır göstermek ise sessiz veri kaybı olurdu (kullanıcı yükledim sanır) |
| 11.11 | Kontrollerde `:focus-visible` halkası, alan altı hata mesajları, bölüm tablosu boş durumu, seçici altı "liste tamamlanmamış olabilir" notu | — (mockup çizmiyor) | Mockup hata/odak/boş/eksik durum çizmiyor; a11y ve dürüstlük için zorunlu eklemeler |
| 11.12 | **Tesis/depo kutucuklarının ön-işaretleri uygulanmaz** — sekizi de boş başlar | 153, 154, 161, 162, 163, 165 | Mockup'taki `checked`'lar, satır 119/123'teki "Temel & Bodrum Katlar"/`1840000` gibi **örnek veridir** (kullanıcı kararı 8, 2026-07-30). Kullanıcının hiç bakmadığı bir kutuyu işaretli kaydetmek, kolaylık değil veri yalanıdır |
| 11.13 | **GPS alanı ayrıştırılmaz ve doğrulanmaz** — mockup'taki tek kutu birebir, girilen metin olduğu gibi saklanır | 83 | Koordinatın bugün tüketicisi yok (puantaj/konum modülü repoda mevcut değil); ayrıştırıcı + hata sözlüğü yazmak spekülatif olur ve geçerli ama farklı biçimli girdiyi sebepsiz reddederdi (§4.2.1) |
| 11.14 | Uygulama kabuğu (Topbar + Sidebar) korunur; mockup'ın kendi üst barı yapışkan form başlığına dönüşür | 31–43 | P1.1a §7.10 ile aynı — F3 gezinme kanonundan çıkılmaz |
| 11.15 | **Kişi listesi 403 alınca Şantiye Şefi ★ zorunluluğu kalkar**; alan boş geçilebilir ve üç seçicinin altında §15/23b açıklaması basılır. Seçicinin serbest metin kutusuna düşmesi **reddedildi** | 69 (ayrıca 70, 120) | `GET /users` `user_management:view` ister, bu izin yalnız sistem yöneticisindedir (plan TZ-4b). `sites:full` yetkili bir proje müdürü seçemediği bir alan yüzünden formu **hiç gönderemez** hâle gelirdi. Alan backend'de nullable; boş geçilebilir bir seçici, kullanıcının uydurma isim yazacağı serbest metinden dürüsttür. Kullanıcı kararı 2026-07-30; §10.1.1 |

---

## 12. Durumlar

| Durum | Yüzey |
|---|---|
| **Proje yükleniyor** | Sayfa iskeleti basılır; kırıntı yolunda proje adı yerine `…`, bilgi kutusunda satır yüksekliğini koruyan gri şerit. Form alanları görünür ve **doldurulabilir** (proje verisi yalnız gösterim içindir) |
| **Proje bulunamadı / 404** | `"Proje bulunamadı"` mesajı + `/projeler`'e dönüş bağlantısı; form basılmaz |
| **Proje 403** | Mevcut `AccessDenied` bileşeni (Proje Detay deseni) |
| **Kullanıcı listesi yükleniyor/hatalı** | §9.2 |
| **Kaydediliyor** | Üç eylem butonu da `disabled`; birincil butonun metni "Kaydediliyor…"; form alanları `disabled` **değil** (kullanıcı yazdığını görebilmeli) |
| **Sunucu hatası** | `.pf-form-error` şeridi (mevcut sınıf) eylem şeridinin üstünde; alan hatası varsa ayrıca alanın altında |
| **Başarı — Şantiyeyi Oluştur** | **Yeni şantiyenin detay sayfasına gidilir** (koordinatör kararı, 2026-07-30): `/projeler/{projectId}/santiyeler/{yeni siteId}`. Yanıt `SiteDetailResponse`'tur, `id` taşır. Ara bir "başarılı" ekranı basılmaz |
| **Başarı — Taslak Kaydet** | `/projeler/{projectId}` (şantiye listesi); kayıt orada **`Taslak` rozetiyle** görünür (§9.4). Ayrı taslak sekmesi yoktur |
| **İptal** | `/projeler/{projectId}`. Kirli formda `beforeunload` uyarısı **verilmez** (Ayarlar/P1.1a deseniyle tutarlı); veri kaybına karşı "Taslak Kaydet" vardır |

---

## 13. A11y ve klavye

- Sayfada tek `<h1>` (satır 49); her kart başlığı `<h2>` (`.pf-card__title`).
- Her kontrol `ui/field`'ın `Field` sarmalayıcısıyla bağlı `<label>` alır;
  ham `<label>` yazılmaz.
- Zorunluluk yıldızı `<span class="pf-req" aria-hidden="true">*</span>` +
  kontrolde `required` / `aria-required="true"` (yıldız ekran okuyucuya iki kez
  okunmaz).
- Hata mesajları `aria-describedby` ile alana bağlı; hata anında `aria-invalid`.
- Gönderim reddedilirse **ilk hatalı alana odak** taşınır; hata özeti
  `role="alert"` ile duyurulur.
- Kutucuk listeleri (§7) `role="group"` + `aria-labelledby={grup etiketi id}`.
- Bölüm tablosu gerçek `<table>`'dır: `<caption class="sr-only">Bölümler</caption>`,
  `<th scope="col">`. Sil butonları `aria-label="{n}. bölümü sil"`.
- Devre dışı yer tutucular (`Bağlı Proje`, belge kutuları, poz dağılımı
  kutucuğu) `aria-disabled="true"` + Türkçe `title` taşır; odak sırasından
  çıkarılır. **Tahmini Bedel hücresinde kontrol hiç yoktur** — devre dışı bir
  kontrol de basılmaz; hücre `title` + `sr-only` açıklama taşır (§3.5).
- Klavye: tablo davranışı §6.6; `Enter` tablo dışında formu gönderir; üst bardaki
  ve alttaki eylem çiftleri aynı işlevi çağırır (ikisi de klavyeyle erişilir).
- Kontrast: tüm metin/zemin çiftleri mevcut token'lardan gelir (Design System
  kontrast denetiminden geçmiş).

---

## 14. Test stratejisi

**Birim / bileşen (Vitest + Testing Library, jsdom):**

- `derive.ts`: `durationDays` uç-dahil (`01.01`–`10.01` → 10), ters tarihte boş,
  tek tarih girildiğinde boş.
- Bölüm tablosu: ekle (iki butondan da), sil (son satır dahil), sıfır satır boş
  durumu, `Enter` satır ekler ve form göndermez, adsız-dolu satır hatası,
  tümü-boş satır sessizce atılır, gövdede `sort_order` **hiç yok**.
- Bölüm satırında **Tahmini Bedel hücresinde hiçbir `input` yok**; hücre metni
  `—`; sekme sırası ad → sorumlu → başlangıç → bitiş → sil.
- Kutucuk listeleri: **sekizi de işaretsiz** açılır; gövdeye `facilities`
  **nesnesi** olarak (8 anahtar, hepsi `false`) gider; işaretlenen kutu
  ilgili anahtarı `true` yapar.
- GPS alanı: girilen metin **olduğu gibi** gövdeye gider (`"41.0082,28.9784"`,
  `"kuzey kapı"` dahil); hiçbir girdi hata üretmez, hiçbir normalleştirme olmaz.
- Şef/İSG/bölüm sorumlusu seçicileri gövdeye **UUID** gönderir; `*_name` alanları
  gövdede **yoktur**. "Dış Kaynak — OSGB" → `safety_officer_is_outsourced: true`
  ve `safety_officer_user_id: null`.
- Seçenek metni: `title` doluysa `"Ad (Unvan)"`, boşsa `"Ad"`.
- `Bağlı Proje` seçici `disabled` ve bağlamdaki projeyi gösterir.
- Durum seçicisi gövdeye `preparation` / `active` / `on_hold` gönderir;
  varsayılan `active`.
- İSG seçicisinde "Dış Kaynak — OSGB" son seçenek olarak var,
  "+ Yeni Personel Ekle" **yok** (şef seçicisinde de yok).
- Belge kartı: `input[type=file]` **YOK**, "Yakında" rozeti VAR,
  `aria-disabled="true"`, ★ basılmamış.
- Taslak Kaydet: eksik zorunlu alanlara rağmen `is_draft: true` ile POST atar;
  ad boşken atmaz.
- Süre alanı `readOnly` ve gövdede gönderilmez.
- Kod boşken gövdede `code` anahtarı **hiç yok**; 409'da doğru mesaj.
- Başarı yönlendirmeleri: oluştur → **yeni şantiyenin detay sayfası**
  (`/projeler/{projectId}/santiyeler/{siteId}`), taslak → proje detayı.
- Belge kartı ve sürükle-bırak alanı: `input[type=file]` yok, `onDrop` yok,
  gövdede belge anahtarı yok.
- Bölüm satırındaki `×` hiçbir ağ isteği atmaz ve izin kapısına bağlı değildir.
- `ProjectDetailPage`: iki "+ Şantiye Ekle" de `/projeler/{id}/santiyeler/yeni`
  linkidir; `SiteFormModal` artık import edilmiyor.
- `form-control-metrics.test.ts`: `size="row"` ve `size="lg"` varyantlarının
  ölçüleri (§5.2) sabitlenir.
- BFF: allow-list testi (`src/lib/api` çağrılarından kök çıkaran mevcut dinamik
  test) yeşil kalır.

**Görsel regresyon:** 1440px'te `/projeler/{id}/santiyeler/yeni`.
Baseline'lar **yalnız Linux CI'da** üretilir (`visual-baselines.yml` →
workflow_dispatch → artifact indir → `e2e/` altına aç → commit).
**macOS'ta Playwright KOŞULMAZ, `.png` üretilmez** (`GOREV-SIRASI.md` §3).

**Mockup karşılaştırma kapısı:** dilim sonunda
`scripts/render-mockup.mjs "projedesign/Form - Santiye Ekle.dc.html" … 1440`
ile render alınır, uygulamayla yan yana konur; sapmalar **satır no + beklenen +
gerçek** üçlüsüyle raporlanır, göz kararıyla değil.

**Kapılar:** `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm build`.

---

## 15. Metin envanteri (kullanıcıya görünen tüm dizeler)

| # | Metin | Satır | Yer |
|---|---|---|---|
| 1 | Projeler | 36 | kırıntı yolu |
| 2 | *{proje adı}* | 37 | kırıntı yolu (veri) |
| 3 | Yeni Şantiye | 38 | kırıntı yolu (aktif) |
| 4 | İptal | 41, 225 | üst bar + alt şerit |
| 5 | Şantiyeyi Oluştur | 42, 227 | üst bar + alt şerit |
| 6 | Yeni Şantiye Ekle | 49 | `h1` |
| 7 | Şantiye bir projeye bağlıdır — poz kotaları proje sözleşmesinden dağıtılır | 50 | alt başlık |
| 8 | Bağlı Proje: | 56 | bilgi kutusu (kalın) |
| 8a | Taahhüt Projesi / Kendi Yatırım Projesi / Kat Karşılığı Projesi | 56 | bilgi kutusundaki proje tipi etiketi. Mockup 56 **"Taahhüt Projesi"** yazar — sekme sözlüğündeki kısa "Taahhüt" değil; ayrı sözlük (`project-type-label.ts`), `PROJECT_TABS` **bozulmaz**. `kendi_yatirim` karşılığı "Proje - Kendi Yatırım.dc.html" 57'de kanıtlı; `kat_karsiligi` bu bağlamda mockup'ta geçmiyor, kanıtlı `{tip} Projesi` kalıbı uygulandı (2026-07-30) |
| 9 | Şantiye oluşturulduktan sonra **poz dağılımı** ekranından bu şantiyeye kota atayabilirsiniz. | 57 | bilgi kutusu |
| 10 | Poz Dağılımı → | 59 | edilgen bağlantı |
| 11 | 📍 Şantiye Bilgileri | 64 | kart başlığı |
| 12 | Şantiye Adı | 66 | etiket |
| 13 | C-Blok Şantiyesi | 66 | yer tutucu |
| 14 | Şantiye Kodu | 67 | etiket |
| 15 | SNT-2026-003 | 67 | yer tutucu |
| 16 | Boş bırakılırsa otomatik | 67 | ipucu |
| 17 | Bağlı Proje | 68 | etiket |
| 18 | Şantiye, girildiği projeye bağlıdır | — | `title` (§11.1) |
| 19 | Şantiye Şefi | 69 | etiket |
| 20 | Seçiniz… | 68–71 | seçici ilk seçeneği |
| 21 | İSG Uzmanı | 70 | etiket |
| 22 | Dış Kaynak — OSGB | 70 | seçenek |
| 23 | İSG mevzuatı gereği zorunlu | 70 | ipucu (**kural değil** — §11.5) |
| 23a | Listede aradığınız kişi yoksa kullanıcı listesi henüz tamamlanmamış olabilir. | — | seçici altı notu (§9.2.1) |
| 23b | Kişi listesini görme yetkiniz yok — bu alanları boş bırakabilirsiniz. | — | seçici altı notu, **yalnız 403'te** (§10.1.1, §11.15) — kullanıcı onayı 2026-07-30 |
| 24 | Durum | 71 | etiket |
| 25 | Hazırlık / Aktif / Beklemede | 71 | seçenekler |
| 26 | 🗺 Konum & Alan | 77 | kart başlığı |
| 27 | İl / İlçe · Çankaya / Ankara | 79 | etiket · yer tutucu |
| 28 | Mahalle · Kuyubaşı Mah. | 80 | etiket · yer tutucu |
| 29 | Ada / Parsel · 1234 / 5 | 81 | etiket · yer tutucu |
| 30 | Açık Adres · Cadde, sokak, no | 82 | etiket · yer tutucu |
| 31 | GPS Koordinatı · 39.9042, 32.8597 | 83 | etiket · yer tutucu (**serbest metin**) |
| 32 | Puantaj konum doğrulaması için | 83 | ipucu — alanın amacı; **kural değil** (§4.2.1). GPS için hata metni **yoktur** |
| 33 | Arsa Alanı (m²) · 2840 | 84 | etiket · yer tutucu |
| 34 | İnşaat Alanı (m²) · 6420 | 85 | etiket · yer tutucu |
| 35 | Kat Sayısı · 2 bodrum + 10 normal | 86 | etiket · yer tutucu |
| 36 | 📅 Takvim & Bütçe | 92 | kart başlığı |
| 37 | Başlangıç Tarihi | 94 | etiket |
| 38 | Planlanan Bitiş | 95 | etiket |
| 39 | Süre (Gün) · 480 | 96 | etiket · yer tutucu |
| 40 | Otomatik hesaplanır | 96 | ipucu |
| 41 | Şantiye Bütçesi (₺) · 11200000 | 97 | etiket · yer tutucu |
| 42 | 🏗 Bölümler (Fazlar) | 104 | kart başlığı |
| 43 | Şantiye iş fazlarına bölünür — her bölümün kendi iş kalemleri olur | 105 | yan not |
| 44 | + Bölüm Ekle | 106 | başlık butonu |
| 45 | Bölüm Adı / Sorumlu / Başlangıç / Bitiş / Tahmini Bedel | 110–114 | tablo başlıkları (**Tahmini Bedel** başlığı kalır, hücresi `—`) |
| 45a | — | 123 | Tahmini Bedel hücresi (yer tutucu, §3.5) |
| 45b | İş kalemlerinden hesaplanacak | — | Tahmini Bedel hücresi `sr-only` açıklaması |
| 46 | Bölüm ekle | 138 | kesikli buton — mockup'taki "veya şablon kullan" **kısaltıldı** (§11.3) |
| 47 | Henüz bölüm eklenmedi — şantiye bölümsüz de oluşturulabilir. | — | boş durum (§6.4) |
| 48 | {n}. bölümü sil | 124 | `aria-label` |
| 49 | 📦 Depo & Şantiye Altyapısı | 148 | kart başlığı |
| 50 | Depo Alanları | 151 | grup etiketi |
| 51 | D-1 Kapalı Ambar | 153 | kutucuk |
| 52 | D-2 Açık Alan (Demir, kum, çakıl) | 154 | kutucuk |
| 53 | D-3 Soğuk Hava Deposu | 155 | kutucuk |
| 54 | Şantiye Tesisleri | 159 | grup etiketi |
| 55 | Şantiye Ofisi (Konteyner) | 161 | kutucuk |
| 56 | İşçi Yemekhanesi | 162 | kutucuk |
| 57 | Soyunma / WC | 163 | kutucuk |
| 58 | İşçi Yatakhanesi | 164 | kutucuk |
| 59 | Revir / İlk Yardım | 165 | kutucuk |
| 60 | Elektrik Aboneliği · Abone no | 170 | etiket · yer tutucu |
| 61 | Su Aboneliği · Abone no | 171 | etiket · yer tutucu |
| 62 | Planlanan İşçi Sayısı · 48 | 172 | etiket · yer tutucu |
| 63 | 📎 Şantiye Belgeleri | 178 | kart başlığı |
| 64 | Belge modülü bekleniyor — şantiyeyi oluşturduktan sonra belgeleri yükleyebileceksiniz. | — | kart notu |
| 65 | Yapı Ruhsatı · Belediye onaylı | 183 | belge kutusu |
| 66 | İSG Risk Değerlendirmesi · Şantiye başlangıcında zorunlu | 188 | belge kutusu |
| 67 | Acil Durum Planı · Tahliye ve müdahale planı | 193 | belge kutusu |
| 68 | Şantiye Yerleşim Planı · Vaziyet planı, depo yerleşimi | 198 | belge kutusu |
| 69 | Zemin Etüt Raporu · Jeoteknik rapor | 203 | belge kutusu |
| 70 | Başlangıç Fotoğrafları · Arsa mevcut durumu | 208 | belge kutusu |
| 71 | Yakında | — | belge rozeti |
| 72 | Belge modülüyle birlikte gelir | — | `pendingModuleLabel("documents")` |
| 73 | Diğer şantiye belgelerini sürükleyin | 214 | sürükle-bırak |
| 74 | Sigorta poliçesi, çevre izni, hafriyat izni vb. | 215 | sürükle-bırak alt metni |
| 75 | Oluşturduktan sonra poz dağılımı ekranına git | 222 | edilgen kutucuk |
| 76 | Sözleşme modülüyle birlikte gelir | — | `pendingModuleLabel("contracts")` |
| 77 | İş kalemleri modülüyle birlikte gelir | — | `pendingModuleLabel("boq")` — Tahmini Bedel |
| 78 | Taslak Kaydet | 226 | alt şerit |
| 79 | Kaydediliyor… | — | gönderim durumu |
| 80 | Yükleniyor… / Kullanıcılar yüklenemedi | — | seçici durumları |
| 81 | Proje bulunamadı | — | hata durumu |
| 82 | *(§10 doğrulama mesajlarının tamamı)* | — | alan hataları |

---

## 16. Kararlar ve kalan açık sorular

### 16.1 Karara bağlandı (2026-07-30)

Bu spec'in önceki sürümündeki on açık sorunun **tamamı** kapandı. Aşağıdaki
tablo kaydı tutar; hiçbiri yeniden tartışılmaz.

| Eski soru | Karar | Kaynak | Spec yeri |
|---|---|---|---|
| 1. Backend eşlik dilimi onaylanıyor mu? | **Evet** — `sites`'a 22 yeni kolon, `sections`'a yalnız `manager_user_id`, `site_status`'a `preparation`. Backend spec kanondur | backend spec §3.0 | §3, §3.2 |
| 2. Depo/tesis JSONB mi, sütun mu? | **8 ayrı Boolean kolon** (JSONB değil). Tel üzerinde tek düz `facilities` nesnesi, 8 anahtar | kullanıcı kararı 2 | §3.2.1, §9.3 |
| 3. Bölüm "Tahmini Bedel" | **Yer tutucu.** `sections.estimated_amount` **eklenmiyor**; sütun yerinde durur, hücrede `—`, **girdi kontrolü basılmaz** | kullanıcı kararı 3 | §3.5, §11.6 |
| 4. Şantiye kodu biçimi | **`SNT-{YYYY}-{NNN}`** (boşsa sunucu üretir). Ad-slug türevi kaldırılır | kullanıcı kararı 1 | §3.6 |
| 5. Tesis ön-işaretleri | **Hepsi boş başlar.** Mockup'taki 6 işaret örnek veridir | kullanıcı kararı 8 | §4.5, §11.12 |
| 6. "veya şablon kullan" | **Şablon YOK.** Metin "Bölüm ekle"ye kısaltılır; devre dışı şablon yüzeyi de konmaz | kullanıcı kararı 7 | §6.2, §11.3 |
| 7. `GET /users` limit tavanı | **Sunucu sözleşmesi: `limit` varsayılan 50, tavan `le=200`** (`users/router.py:40`). Hook `limit=200` ister → 200 kullanıcıya kadar sorun yok. *(Önceki "20'de kesiliyor" tespiti **yanlıştı**, 2026-07-30'da düzeltildi.)* 200 üstü için sunucu tarafı arama **backend'e devredildi** | koordinatör; düzeltme plan TZ-4b | §9.2.1 |
| 8. Başarı sonrası hedef | **Yeni şantiyenin detay sayfası** | koordinatör | §12 |
| 9. Taslağı kim görür? | **Projeye erişimi olan herkes**; listede **rozet**, ayrı sekme yok; sayaçlardan düşülmez | koordinatör | §9.4 |
| 10. Bütçe aşım uyarısı | **YOK** — hiçbir çapraz kontrol yapılmaz | koordinatör | §10.3 |
| (yeni) İSG Uzmanı zorunlu mu? | **Hayır, nullable.** İpucu metni aynen basılır ama kural değildir | kullanıcı kararı 4 | §4.1.2, §11.5 |
| (yeni) GPS nasıl ele alınır? | **Ekranda da veride de tek serbest metin.** Ayrıştırma YOK, biçim doğrulaması YOK, hata mesajı YOK. Puantaj konum doğrulaması yapılmayacak | kullanıcı kararı, 2026-07-30 (revizyon) | §4.2.1, §11.13 |
| (yeni) Silme uçları | `DELETE /sites/{id}` + `DELETE /sections/{id}` backend'de **`admin`** izniyle açılıyor; **bu formda silme yüzeyi YOK**. Satır `×`'i kaydedilmemiş satırı kaldırır, izin kapısı taşımaz | kullanıcı kararı 6 | §6.3 |
| (yeni) `SiteFormModal` | **Silinir**; tam sayfa forma geçilir, iki "+ Şantiye Ekle" aynı linke gider | koordinatör | §2.3 |

### 16.2 Backend'e devredilen işler (bu dilimin işi DEĞİL)

Bunlar bu spec'in çözemeyeceği, backend tarafında karara bağlanması gereken
işlerdir. Frontend tarafında **uydurma çözüm yazılmaz**.

| # | İş | Etki |
|---|---|---|
| D1 | `GET /users` için 200 üstü kurulumlarda sunucu tarafı arama (`?q=`). *(Düzeltme 2026-07-30: bu maddenin "yüksek/sınırsız `limit` sözleşmesi" kısmı **gereksizdi** — sunucu zaten `le=200` tavanı ilan ediyor.)* | Gelene kadar üç seçici de **ilk 200 kullanıcıyla** sınırlıdır (§9.2.1) |
| D1b | `GET /users` bugün `user_management:view` istiyor; `sites:full` yetkili proje müdürü **403** alıyor. Kullanıcı kararı: **şimdilik böyle kalsın** — yeni seçici ucu açılmayacak, izin gevşetilmeyecek | Frontend zarif düşer: şef zorunluluğu kalkar, alan boş geçilir, §15/23b metni basılır (§10.1.1, §11.15) |
| D2 | Backend spec §3.5'teki **GPS regex doğrulamasının kaldırılması** (ve §5.1/5, §7.1'deki karşılıkları) | Kalırsa kullanıcı istemcide hiç uyarılmadan sunucu 422'sine çarpar (§4.2.1) |
| D3 | Backend spec §1.2/7 ve §3.4'teki **`sections.estimated_amount` önerisinin düşürülmesi** | Kolon yine de açılırsa frontend onu **yazmaz**; yer tutucu kararı değişmez (§3.5) |
| D4 | `DELETE /sites/{id}` + `DELETE /sections/{id}` uçlarının `admin` iznine açılması | Bu formu etkilemez; **düzenleme/liste dilimi**nin ön koşuludur (§6.3) |

### 16.3 Hâlâ açık (uygulama başlamadan cevaplanması gerekmeyen)

1. **Düzenleme kipi ne zaman gelir?** Bu dilim yalnız oluşturmadır; taslak
   **yazılabilir ama kesinleştirilemez** (§1.2). Kesinleştirme, `canDelete`
   kapısının eklenmesi (§6.3) ve kayıtlı bölüm silme yüzeyi hep aynı gelecek
   dilime bağlıdır — o dilim planlanmadı.
2. **Şantiye Detay ekranında yeni 22 alan nasıl gösterilecek?** Bu dilim yalnız
   yazma yüzeyidir; okuma yüzeyi ayrı dilimdir (§1.2). Alanlar bugün
   kaydediliyor ama detay ekranında **görünmüyor** olacak — bilinçli, geçici.
3. **`SiteCounts.draft` liste ekranında nereye basılacak?** Karar rozet yönünde
   (§9.4), ama şantiye listesi bu dilimin kapsamında değil; rozetin
   yerleştirilmesi P2 liste ekranına dokunan ayrı bir küçük iştir.

---

## 17. Task iskeleti

Sıra bağlayıcıdır: her task kendinden öncekinin kapılarını yeşil bırakır.
Ayrıntılı plan (dosya dosya, test test) `docs/superpowers/plans/` altında ayrıca
yazılır; buradaki liste **kapsam ve sıra** içindir.

| # | Task | Çıktı | Bağımlılık |
|---|---|---|---|
| T0 | **Backend ön koşul kapısı** — backend dilimi merge'li mi, `openapi.json` yeniden üretilip `pnpm gen:api` koşuldu mu; `SiteCreate` gövdesinde 22 alan + `facilities` + `sections` + `is_draft` görünüyor mu | doğrulama notu; şema tipleri | backend dilimi |
| T1 | Paylaşılan form kabuğunun çıkarılması: `project-form.css` → `src/styles/form-shell.css` (sınıf adları **değişmeden**), `durationDays` → `src/lib/form/derive.ts` | görsel/davranışsal fark **sıfır**, P1.1a testleri yeşil | — |
| T2 | Primitive varyantları: `ui/input` + `ui/select` `size="row"`, `ui/checkbox` `size="lg"`; `form-control-metrics.test.ts` genişler | §5.2 ölçüleri sabitlenir | T1 |
| T3 | Yeni token'lar (`tokens.css`, §5.1) | çıplak hex/px yok | — |
| T4 | `useUserOptions()` + `userOptionLabel()` + 20-kullanıcı sınırlaması notu | tek sorgu, üç seçici | T0 |
| T5 | Rota + sayfa iskeleti: `/projeler/[projectId]/santiyeler/yeni`, kırıntı yolu, yapışkan form barı, `Bağlı Proje` bilgi kutusu; statik segmentin dinamikten önce eşleştiği testle sabitlenir | boş ama gezinilebilir sayfa | T1, T3 |
| T6 | Kart 1–3: Şantiye Bilgileri · Konum & Alan · Takvim & Bütçe (+ süre türevi) | §4.1–4.3 | T2, T4, T5 |
| T7 | Kart 4: Bölümler tablosu (satır ekle/sil, boş durum, klavye, Tahmini Bedel yer tutucusu) | §4.4, §6 | T2, T4, T5 |
| T8 | Kart 5: Depo & Şantiye Altyapısı (8 kutucuk **işaretsiz** + 3 alan) | §4.5, §7 | T2, T5 |
| T9 | Kart 6: Şantiye Belgeleri **yer tutucusu** (yükleme kodu YAZILMAZ) + alt eylem şeridi (poz dağılımı kutucuğu edilgen) | §4.6, §4.7 | T5 |
| T10 | Gönderim: gövde derleyicisi (§9.3), doğrulama (§10), taslak yolu, hata/başarı durumları, yönlendirmeler (§12) | uçtan uca çalışan form | T6–T9 |
| T11 | `SiteFormModal.tsx` + testinin **silinmesi**; `ProjectDetailPage`'te iki "+ Şantiye Ekle" aynı `Link`'e bağlanır; `isSiteFormOpen` durumu kaldırılır | tek yazma yüzeyi | T10 |
| T12 | Testler (§14) + BFF allow-list kapısı | `pnpm lint · typecheck · test · build` yeşil | T11 |
| T13 | Görsel regresyon (1440px) — baseline **yalnız Linux CI**; macOS'ta Playwright koşulmaz | baseline artifact | T12 |
| T14 | Mockup karşılaştırma kapısı: `scripts/render-mockup.mjs` ile render, sapmalar **satır no + beklenen + gerçek** üçlüsüyle raporlanır | sadakat raporu | T13 |

**Toplam: 15 task (T0–T14).**
