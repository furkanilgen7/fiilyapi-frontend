# F-TB3 — Borç Paketi (frontend) · tasarım spec'i

Tarih: 2026-08-14 · Yönetim oturumu · Repo: `frontend/`
Dal: `feat/f-tb3-borc-paketi` (base: `main` @ `89b296d`)

---

## 0. Bu dilimin varlık sebebi ve SERT SINIRI

**GitHub Actions kapalı** (faturalandırma; kullanıcı kararı: para ödenmeyecek). Backend'in yerel CI
eşdeğeri var (Docker + PG 16), **frontend GÖRSEL tarafında YOK** → görsel baseline gerektiren
dilimler şu an KAPANAMAZ.

🔴 **Bu dilim GÖRSEL KARE DEĞİŞTİRMEZ.** Her task'ın kabul kriteri, DOM'un fikstür evreninde
**değişmediğini** kanıtlamayı içerir. Bir task kaçınılmaz olarak kare değiştiriyorsa **o task
DURUR ve yönetime rapor edilir** — baseline turu koşulamaz.

🔴 **DOKUNULMAYACAK DOSYALAR (paralel açık PR #29 `feat/f-tb2-font-determinizmi` üzerinde):**
`openapi/openapi.json` · `src/lib/api/schema.d.ts` · `src/app/layout.tsx` · `src/middleware.ts` ·
`src/styles/fonts.css` · `public/fonts/**`.
→ **`pnpm gen:api` KOŞULMAZ, openapi devri YAPILMAZ.** (Devir zaten PR #29'da `24b8263` ile
183 yola çıkarılmış durumda, merge bekliyor.)

🔴 **`ARCHITECTURE.md` (repo-üstü) dosyasına DOKUNULMAZ** — paralel koşan backend dilimiyle
çakışır; yönetim güncelleyecek. Yalnız `ARCHITECTURE-FRONTEND.md` + `ROADMAP-FRONTEND.md`.

---

## 🔴 SPEC DÜZELTMESİ (yönetim, 2026-08-14 — dilim koşarken)

**§1 (T1) ve §2 (T2) İPTAL EDİLDİ.** İkisi de **ZATEN KAPALIYDI**; tarifleri
`ROADMAP-FRONTEND.md` §3'ün **bayat** satırlarından yazılmıştı (yönetim hatası).

- **T1 kanıtı:** `09ab33a` (F-P5 T1) join'i sökmüş, `main`de.
  `src/lib/api/hooks/useSiteSubcontractorPayments.ts:22-26` gerekçeyi yazıyor, `:105`
  `payment.work_category`'den okuyor. Dört kabul kriteri de test-kilitli.
- **T2 kanıtı:** `useSubcontractorContractOptions.ts:3,19-25,71,75,90-91` — `buildListTruncation`
  bağlı, `limit` açıkça gönderiliyor, `total` ile kırpılma hesaplanıyor;
  `SubcontractorContractPickerStep.tsx:45` görünür bandı basıyor.

Yerlerine **T-A** geçti (aşağıda). Task sırası: **T-A → T3 → T4 → T5.**

---

## 1-A. T-A — 🔴 ROADMAP-FRONTEND §3 BAYAT BORÇ DENETİMİ

**Bulunan kusur sınıfı:** *"§3'te açık görünen borç, sonraki bir dilimde sessizce kapanmış ama
satır güncellenmemiş."* Dört borçtan **ikisi** bu sınıfa girdi (%50) → yönetim yanlış dilim açıyor.
Gerçek ve pahalı bir kusur.

**Kapsam:** §3'teki **üstü çizili OLMAYAN her satır** kod gerçeğine karşı denetlenir.

**Kabul kriteri**
- Satır başına verdict: **AÇIK** / **KAPALI** (kanıt: commit + `dosya:satır`) / **KISMİ** (ne kaldı).
- "Muhtemelen açık" YAZILMAZ — kanıtsız satır AÇIK sayılmaz; `grep` / `git log` ile bakılır.
- KAPALI çıkanlar `~~üstü çizili~~` + ✅ + kanıt commit'i ile işaretlenir (repo yazım düzeni birebir).
- Raporda **sayı**: kaç satır denetlendi, kaçı bayat çıktı.
- ⚠️ **Doküman task'ıdır** — ürün koduna dokunulmaz, kare değişmez.
- 🔴 Kredi doğru dilime yazılır: "F-TB3 kapattı" DEĞİL → **"F-P5 T1 (`09ab33a`) ile zaten
  kapanmıştı, satır bayattı; F-TB3/T-A denetiminde tespit edildi."**

---

## 1. ~~T1 — `work_category` join'inin kaldırılması~~ ⛔ İPTAL (yukarı bak)

**Borç kaydı:** ROADMAP-FRONTEND §3 "TB3 adayı — hakediş liste şemasına `work_category` snapshot'ı".

Bugün `useSiteSubcontractorPayments`, `work_category` için `GET /subcontractor-progress-payments`
(U2) yanında **TEK ek** `GET /subcontractor-contracts?site_id=…` isteği atıp `contract_id`
üzerinden join ediyor. Backend **TB3/T1** (`a53b096`, 2026-08-07, PR #21 merge `b55ad74`) alanı
`SubcontractorProgressPaymentListItem` **liste şemasına ekledi** ve N+1 yokluğu ölçümle kapatıldı.

**Yapılacak:** join TAMAMEN kaldırılır → sabit **2 istek** yerine **1 istek**.

**Kabul kriteri**
- Ek `GET /subcontractor-contracts` isteği artık **atılmıyor** (test: istek sayacı 1).
- `workCategory` değeri U2 yanıtındaki `work_category` alanından okunuyor.
- 🔴 `work_category` **nullable'dır** (taslak sözleşmede boş bırakılabilir — backend testli).
  Bugünkü join da `undefined` üretebiliyordu; **zarif düşüş DAVRANIŞI DEĞİŞMEZ**, aynı boş gösterim
  korunur. Bunu kilitleyen test yazılır.
- `e2e/mock-backend.ts` hakediş **liste** üreticisi `work_category` basıyor (F-P5 `ed72d74`
  dersinde eklendi — **varsayılmaz, doğrulanır**; eksikse eklenir).
- Şantiye hakediş sekmesinde görünen metin **birebir aynı** (ör. `Elektrik · Tüm Bölümler`) —
  F-P5'te bu tam olarak sessizce kaybolmuştu, o regresyon testi korunur/eklenir.

---

## 2. ~~T2 — U1 sayfalama korkuluğu~~ ⛔ İPTAL (yukarı bak)

**Borç kaydı:** ROADMAP-FRONTEND §3 "U1'in sayfalaması yok" + ROADMAP-BACKEND §3 "TB3-B …
**Frontend takibi açık:** varsayılan 50 → seçim kutusu artık kırpılabilir, `total` korkuluğu
bağlanmalı".

Backend **TB3/T2** (`d89d1a1`) `GET /subcontractor-contracts`e `limit` (varsayılan **50**,
`ge=1, le=200`, tavan aşımı **422** — kırpma DEĞİL) + `offset` + `total`/`limit`/`offset` ekledi.
Frontend hâlâ korkuluksuz: 50'den fazla sözleşmede seçim kutusu **sessizce eksik** listeler.

**Yapılacak:** `shared/list-truncation.ts` deseni (U2'de zaten kurulu) bu uca da bağlanır.

**Kabul kriteri**
- `total > items.length` olduğunda görünür bir sınır göstergesi basılır; **aynı desen, aynı metin
  kaynağı** (yeni metin İCAT EDİLMEZ, U2'deki kanonik dize kullanılır).
- 🔴 **Gösterge yalnız kırpılma VARSA basılır.** Fikstür evreninde 50'yi aşan sözleşme listesi
  YOKTUR → **hiçbir görsel karede yeni DOM belirmez.** Şef bunu `e2e/mock-backend.ts`'ten
  **sayarak** doğrular ("varsayılmaz"), rapora yazar.
- Kırpılma hâli için ayrı bir birim testi (mock `total: 120, items: 50`) yazılır.
- `limit` tavanı (`>200`) **istemciden hiç gönderilmez** (422 üretecek çağrı yazılmaz).

---

## 3. T3 — 🔴 BFF kök bekçi testi (kalıcı tuzağın YAPISAL kapatılması)

**Tuzak (WORKFLOW §4):** yeni backend kökü `src/app/api/backend/[...path]/route.ts` içindeki
`ALLOWED_ROOTS`'a eklenmezse modül **YALNIZ CANLIDA 404** verir. Dört kapının hiçbiri görmez;
jsdom testleri görmez. Bugüne kadar **her dilimde elle** hatırlanmak zorunda kaldı
(`diary`, `documents`, `stock`, `payroll`, `equipment` … hepsi ayrı ayrı yakalandı).

**Yapılacak:** bekçi testi — `src/` içinde `/api/backend/<kök>/…` yoluna istek atan **her kök**,
`ALLOWED_ROOTS` kümesinde olmalıdır.

**Kabul kriteri**
- Bekçi, kökleri **kaynak koddan** (BFF istemci sarmalayıcısının çağrı yerlerinden) toplar;
  `openapi.json`'dan DEĞİL (openapi backend'in tamamıdır, frontend'in çağırmadığı kök gürültüdür —
  ve o dosyaya bu dilimde dokunulmuyor).
- Bekçi **BUGÜN YEŞİL** olmalıdır. Kırmızıysa **gerçek bir canlı 404 bulunmuş demektir** →
  eksik kök `ALLOWED_ROOTS`'a **gerekçe yorumuyla** eklenir (mevcut yorum düzeni birebir) ve
  bulgu rapora **ayrı madde** olarak yazılır.
- Bekçi, bir kök silinip test koşulunca **KIRMIZI olduğu KANITLANIR** (mutasyon denetimi) —
  yoksa bekçi hiçbir şey bekçilik etmiyor demektir.
- `route.ts`'in geri kalanına (path traversal sertleştirmesi, ikili indirme dalı, başlık kurulumu)
  **DOKUNULMAZ**.

---

## 4. T4 — `site-planning.spec.ts:340` flake'inin kök nedeni

**Borç kaydı:** ROADMAP-FRONTEND §3 "🆕🟠 BİLİNEN FLAKE" — **iki kez** rapor edildi (F-P8 ve F-SA
turlarında), yani "tek seferlik" DEĞİL. `.plan-goals__row` 0 yerine **2** görüyor; aynı taahhütte
ikinci turda GEÇİYOR. Şüphe: paralel yazma mutasyonlarının (`s-2` planlama) birbiriyle yarışması /
fikstür izolasyon eksikliği.

**Yapılacak:** kök neden bulunur ve **fikstür izole edilir** — testin kendisi gevşetilmez.

**Kabul kriteri**
- Kök neden **kanıtla** yazılır (hangi spec hangi kaydı mutasyona uğratıyor, hangi sırada).
- Çözüm, F-PT'nin `pinRoster` / F-SA'nın `pinPurchasingFixtures` **emsalindedir**: kadraja/iddiaya
  giren kayıtlar mutasyona uğrayan kayıtlardan AYRILIR.
- ⚠️ `retry` eklemek, `waitForTimeout` koymak, iddiayı gevşetmek **YASAK** — flake gizlenmez.
- 5. kapı (`--grep-invert "gorsel"`) **arka arkaya 3 kez** koşulur ve üçünde de yeşil olduğu
  raporlanır. Üç turda bir kez düşerse **kök neden bulunamamıştır** → DUR + rapor.
- Görsel spec dosyalarının **kadraj/iddia sırası değişmez** (kare değişmez).

---

## 5. T5 — FINAL REVIEW (Opus) + doküman

1. **Sınıf araması:** T1'in çözdüğü kusur sınıfı ("liste ucu artık alanı taşıyor ama istemci hâlâ
   join yapıyor") repo genelinde aranır — başka bir hook aynı deseni sürdürüyor mu?
   Bulgular listelenir; **dilim içinde kapatılabilecek olanlar kapatılır**, kalanı borç yazılır.
2. **Dört kapı:** `pnpm lint` + `pnpm typecheck` + `pnpm test` + `pnpm build`.
3. **🔴 5. kapı — BAYAT SUNUCU DENETİMİ ÖNCE (F-TB1 kanonu):** `pnpm exec playwright test
   --grep-invert "gorsel"` koşmadan ÖNCE `lsof -nP -iTCP:3000 -sTCP:LISTEN` ile port denetlenir,
   bayat `next-server` **öldürülür**. Bayat sunucu 5. kapıyı **YEŞİL de geçirebilir** — asıl
   tehlike başarısızlık değil, sahte başarıdır.
4. **Görsel kare değişmedi kanıtı:** bu dilim `*-snapshots/*.png` dosyalarına **DOKUNMAZ**
   (`git status` ile kanıtlanır) ve DOM'u fikstür evreninde değiştirmediği T1/T2/T3'ün kabul
   kriterlerinden okunur. Baseline turu **koşulmaz** (CI kapalı).
5. `ROADMAP-FRONTEND.md` §3'te kapanan dört borç satırı ✅ işaretlenir + `ARCHITECTURE-FRONTEND.md`
   (BFF envanteri + bekçi testi) güncellenir. **`ARCHITECTURE.md`'ye DOKUNULMAZ.**

---

## 6. Kararlar (yönetim bağladı)

| # | Karar | Gerekçe |
|---|---|---|
| K1 | openapi devri bu dilimde **YAPILMAZ** | PR #29 aynı iki dosyada açık; ikinci devir çakışır |
| K2 | Kırpılma göstergesi **yalnız kırpılma varsa** basılır | fikstür evreni 50'yi aşmıyor → kare değişmez |
| K3 | BFF bekçisi **kaynak koddan** kök toplar, openapi'den değil | openapi backend'in tamamı; ayrıca o dosya bu dilimde dokunulmaz |
| K4 | Flake **izole edilerek** çözülür, gevşetilerek değil | iki kez tekrarladı; gizlenirse gerçek regresyonu da yutar |
| K5 | `work_category` boş gösterimi **DEĞİŞMEZ** | alan nullable; davranış değişirse kare değişir |
