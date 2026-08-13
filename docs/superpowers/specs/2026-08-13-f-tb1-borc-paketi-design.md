# F-TB1 — Frontend Borç Paketi (BORÇ 1 + openapi devri + enum yüzeyleri)

Tarih: 2026-08-13 · Repo: `frontend/` · Dal: `feat/f-tb1-borc-paketi`
Yönetim oturumu yazdı (⚡ hızlandırılmış düzen — spec onayı yönetimde).

---

## 1. Neden bu dilim

Üç açık borç aynı sınıftan: **sunucudaki gerçeğin istemci tarafından sessizce ezilmesi** ya da
**sunucunun genişlettiği bir kümenin istemcide karşılıksız kalması**. İkisi de yeni ekran
gerektirmez; biri bir **para yüzeyine** (hakediş) dokunur.

| # | Borç | Kaynak |
|---|---|---|
| **B1** | Hakediş formları `period_year`/`period_month`de sunucudaki `null`ı **bugünün ay/yılıyla** eziyor | ROADMAP-FRONTEND §3 · F-İK dilimi kaydı |
| **B2** | openapi kopyası **149 yol**, canlı backend **162 yol** (İK-3 bordro) | ROADMAP-BACKEND §3 · ARCHITECTURE-BACKEND §1 |
| **B3** | `worker_source` enum'u dört değere genişledi (`freelance`/`intern`); `personnel` yüzeyi karşılandı ama **`site_diary` ve `timesheet` yüzeyleri sınanmadı** | ROADMAP-FRONTEND §3 (F-İK'de açıldı) |

---

## 2. B1 — kusurun tam anatomisi

### Gözlem (kod)

`ProgressPaymentForm.tsx:100-101`
```ts
setPeriodYear(detail?.period_year ?? new Date().getFullYear());
setPeriodMonth(detail?.period_month ?? new Date().getMonth() + 1);
```
`ProgressPaymentForm.tsx:204-205` (`handleSave` → `headerBody`)
```ts
period_year: periodYear,
period_month: periodMonth,
```

`SubcontractorProgressPaymentForm.tsx:117-118` ve `188-189` — **birebir aynı** desen
(`headerBody()` fonksiyonu içinde).

### Sunucu sözleşmesi (openapi, `376ffaf`ten üretildi — yönetim doğruladı)

`ProgressPaymentUpdate` · `ProgressPaymentCreate` · `SubcontractorProgressPaymentUpdate` ·
`SubcontractorProgressPaymentCreate` — **dördünde de** `period_year` ve `period_month`
`anyOf: [integer, null]`, `required` **yok**. Yani sunucu "dönem bilinmiyor" hâlini
MEŞRU sayıyor ve anahtar hiç gönderilmediğinde mevcut değeri korur.

### Kusur

Düzenleme kipinde sunucuda `period_year = null` olan bir **taslak hakediş** açılır. Tohumlama
`??` ile bugünün ay/yılını basar. Kullanıcı dönem seçicisine **hiç dokunmadan** yalnız miktar
girip kaydederse, `PATCH` gövdesi bugünün ay/yılını taşır → **kullanıcının vermediği bir dönem
kararı hakediş kaydına yazılır.** Hakediş bir **para yüzeyidir**: yanlış dönem, maliyeti/geliri
yanlış aya yazar (P10 maliyet kartları, P11 takvimi ve gösterge paneli hep `period_*` üzerinden
gruplar).

### Neden görünmüyordu

Ekranda dönem **hep dolu görünür** — mockup'ta seçicinin boş seçeneği yoktur
(`İşveren Hakediş Oluştur.dc.html:82`, `Taşeron Hakediş Oluştur.dc.html:56`: iki `<option>`,
biri `selected`, boş seçenek **YOK**). Kullanıcı ekranda "Temmuz 2026" görür ve o değerin
kayıttan geldiğini sanır; oysa istemci uydurmuştur.

### Emsal — ÇÖZÜM DESENİ HAZIR

`8ac9369` (`fix(personnel): keep server nulls when untouched wage/payment selects are saved`)
**tam olarak bu sınıfın** temiz karşıtıdır: mockup'ta boş seçeneği olmayan `wage_type` /
`payment_method` seçicileri için:
1. `touched: ReadonlySet<keyof FormValues>` izi — alan yazıcısı her yazışta alanı işaretler.
2. `omitFields` — **yalnız düzenleme kipinde** ve **yalnız `detail.<alan> === null` && `!touched`**
   iken anahtar gövdeden tamamen düşürülür (`is_draft` ile aynı "anahtar hiç gönderilmez" deseni).
3. **Oluşturma kipi DEĞİŞMEZ** — orada ezilecek sunucu değeri yoktur.

---

## 3. B1 — bağlanan kararlar (yönetim; yeniden tartışılmaz)

**K1 — Mockup kazanır: dönem seçicisine BOŞ SEÇENEK EKLENMEZ.**
Alternatif "Dönem seçiniz" boş seçeneği ekranın görünümünü değiştirir; iki mockup da boş
seçenek çizmiyor (§2). WORKFLOW §3 gereği mockup kazanır. Personel formunda alınan kararla da
aynıdır (`8ac9369` boş seçenek EKLEMEDİ).

**K2 — Çözüm `8ac9369` deseninin BİREBİR kopyasıdır** (`touched` izi + tip-kilitli
`omitFields`). Yeni yaklaşım icat edilmez. İki formun ortak deseni paylaşılan bir yardımcıya
çıkarılabilir ama zorunlu değildir (YAGNI — iki çağıran için soyutlama zorlanmaz); şef hangisini
seçtiyse gerekçesini raporlar.

**K3 — `omitFields` TİP-KİLİTLİDİR.** Serbest `string[]` kabul eden bir imza, yanlış yazılmış bir
alan adını sessizce yutar. Gövde kurucunun imzası yalnız gerçekten atlanabilir alanların
birleşimini (`"period_year" | "period_month"`) kabul eder — `8ac9369`teki
`OmittablePersonnelField` emsali.

**K4 — Kapsam yalnız `period_year` + `period_month`.** Aynı dosyalardaki `default_coefficient`
(`?? "1"`) ve `description` (`?? ""`) bu dilimde **DEĞİŞTİRİLMEZ**.
⚠️ **Düzeltme (T4 bulgusu, yönetim doğruladı 2026-08-13):** `default_coefficient` *`Update`
şemasında* **nullable'dır** — ilk gerekçe yanlış şemaya atıf veriyordu. Kararı ayakta tutan
gerçek şudur: **`ProgressPaymentDetail` / `SubcontractorProgressPaymentDetail` YANIT şemasında
`default_coefficient` non-nullable `string`tir**, yani tohumlamadaki `?? "1"` bir sunucu
`null`ından **hiç tetiklenemez** → ezme yolu YOKTUR. `description` ise `null`a normalize
edilerek gönderilir (`.trim() ? … : null`) — orada da ezme yoktur.
**T4 sınıf araması bu kararı DOĞRULADI; başka kusur bulunmadı.**

**K5 — `section_id` (taşeron) zaten doğrudur** (`detail?.section_id ?? null`) — `null` `null`
kalır. Değiştirilmez; nüksü engelleyen bir gerileme testi eklenir.

---

## 4. B2 — openapi devri

- Backend **`main` @ `376ffaf`** (İK-3 merge'lü, canlıda doğrulanmış) şemasından **TAZE üretilmiş**
  kopya yönetim oturumunca hazırlandı, **162 yol** doğrulandı, şu yolda duruyor:
  `<SCRATCHPAD>/openapi-376ffaf.json` (tam yol görev emrindedir).
  🔴 **Şef backend reposuna DOKUNMAZ ve orada komut koşturmaz** — backend'de aynı anda başka bir
  dilim çalışıyor (WORKFLOW: aynı repoda iki ajan yok).
- Şef bu dosyayı `frontend/openapi/openapi.json` üzerine kopyalar → `pnpm gen:api` →
  **openapi + `schema.d.ts` TEK commit** (WORKFLOW §4 OPENAPI DEVİR KURALI).
- **Beklenen fark: 149 → 162 yol**, 13 yeni `payroll` yolu. `-Input`/`-Output` ayrışmasının
  KIRILMADIĞI doğrulanır (F-TH tuzağı).
- 🔴 **BFF `payroll` kökü:** `src/app/api/backend/[...path]/route.ts` içindeki `ALLOWED_ROOTS`'a
  `payroll` **EKLENİR** ve testle kilitlenir. Ekran henüz yoktur; kök şimdi açılır çünkü bu tuzak
  **yalnız canlıda 404 verir, jsdom testleri görmez** ve neredeyse her modülde bir dilim geç fark
  edilmiştir. Kökün varlığı `grep`le doğrulanır, "zaten var" varsayılmaz.

---

## 5. B3 — `worker_source` iki yüzeyi

İK-3 `worker_source` enum'una **`freelance` + `intern`** ekledi (ARCHITECTURE-BACKEND §5, S10
yönetim onaylı). Enum **dört modül tarafından paylaşılıyor**: `site_diary` · `timesheet` ·
`personnel` · `payroll`. F-İK yalnız `personnel` yüzeyini karşıladı (`personnel-list-labels.ts`).

**Etiketler (bağlayıcı): `freelance` → "Serbest" · `intern` → "Stajyer".**
`personnel-list-labels.ts`teki mevcut karşılıklarla AYNI olmak zorunda — iki ekranda iki farklı
Türkçe etiket kabul edilemez. Şef mevcut dosyadaki metni **okur** ve ona uyar; farklıysa mevcut
dosyanınki kazanır ve bu spec düzeltilir.

Kapsam: `site_diary` (günlük işçi sayımı kaynak seçici/rozeti) ve `timesheet` (puantaj kaynak
rozeti) yüzeylerinde dört değerin de karşılığı olduğu **testle kilitlenir**. Bilinmeyen değere
düşen bir yüzey varsa düzeltilir; **hiçbir yüzey ham enum değerini kullanıcıya basmaz.**

**Not:** mockup'larda `freelance`/`intern` çizili değildir. Bu bir ekran tasarımı değil, mevcut
etiket haritasının genişletilmesidir — yeni görsel öğe eklenmez, mevcut rozet/seçici bileşenleri
aynı stiliyle yeni değeri karşılar (F-İK'de `personnel` yüzeyinde izlenen yol).

---

## 6. Kapsam DIŞI

- Bordro (`payroll`) **ekranları** — ayrı dilim (mockup'lar var: `Bordro Yönetimi` ·
  `Bordro Geçmişi`). Bu dilim yalnız BFF kökünü + şemayı hazırlar.
- İzin Yönetimi ekranı ve belge ekleme formu — **mockup yok**, PENDING.
- Bayat baseline taraması · `site-planning.spec.ts:340` bilinen flake — ayrı iş.
- Yeni rota, yeni ekran, görsel yeniden tasarım **YOK**.

---

## 7. Kabul kriterleri

1. Sunucuda `period_year`/`period_month` `null` olan bir taslak hakediş, dönem seçicisine
   **dokunulmadan** kaydedildiğinde `PATCH` gövdesinde **o anahtarlar HİÇ YOKTUR** — iki formda da.
2. Kullanıcı dönemi **seçerse** değer gövdede gider — iki formda da.
3. Sunucudan **dolu** gelen dönem, dokunulmasa da **aynı değerle** gider (gerileme koruması).
4. **Oluşturma kipi etkilenmez** — iki anahtar da her zaman gider.
5. `openapi/openapi.json` **162 yol**; `schema.d.ts` senkron; ikisi TEK commit.
6. `ALLOWED_ROOTS` `payroll` içerir, test kilitli.
7. `worker_source`un dört değeri de `site_diary` + `timesheet` yüzeylerinde etiketli, test kilitli.
8. Beş kapı yeşil (`lint` · `typecheck` · `test` · `build` · fonksiyonel e2e) + görsel baseline
   turu: **bu dilimde görsel değişiklik BEKLENMİYOR** → beklenen sonuç **0 değişen kare**; iddia
   `cmp` ile **ÖLÇÜLEREK** kanıtlanır, "değişmedi" varsayılmaz.
