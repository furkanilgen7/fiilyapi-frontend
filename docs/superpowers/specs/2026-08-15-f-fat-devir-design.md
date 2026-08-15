# F-FAT — Mali Devir Paketi (frontend) · tasarım spec'i

Tarih: 2026-08-15 · Yönetim oturumu · Repo: `frontend/` · base `main` @ `79936bf`

---

## 0. Bu dilim NEDEN var

Backend'de üst üste **iki mali dilim** canlıya girdi ve ikisinin de frontend devri yapılmadı
(gerekçe: PR #29 `openapi.json` + `schema.d.ts` üzerinde açıktı — o PR artık **merge edildi**):

| Dilim | Merge | Getirdiği |
|---|---|---|
| **FAT-1** Fatura Çekirdeği | `54fbe35` | `invoices` + `invoice_lines`, 8 yol, iki yönlü durum makinesi |
| **HZ-1** Hazine Çekirdeği | `dd16da6` | `bank_accounts` + `payments`, 6 yol, türetilmiş bakiye |

Frontend openapi kopyası **183 yol**, backend main **197 yol** → **14 yolluk devir borcu**.

🔴 **Ve daha kritiği: ÜÇ BFF KÖKÜ AÇIK DEĞİL** — `invoices` · `bank-accounts` · `payments`.
`ALLOWED_ROOTS`'a eklenmezse bu modüller **YALNIZ CANLIDA 404** verir (WORKFLOW §4 kalıcı tuzağı).

## 1. 🔴 SERT SINIR — bu dilim GÖRSEL KARE DEĞİŞTİRMEZ

GitHub Actions **kapalı** (faturalandırma) → baseline turu koşulamaz → kare değiştiren iş
**kapanamaz**. Bu dilim **yeni ekran YAZMAZ**; yalnız tip/sözleşme/altyapı katmanına dokunur.
`*-snapshots/*.png` dosyalarına **DOKUNULMAZ**; `git status` ile kanıtlanır.

Yeni rota, yeni bileşen, yeni DOM **YOK**. Fatura ve Hazine **ekranları** ayrı dilimlerin işidir
(ve mockup'ları hazır: `Fatura Yönetimi` · `Fatura - Gelen/Giden Detay` · `Fatura - Kes` ·
`Ekran 9 - Hazine`).

## 2. T1 — openapi devri (183 → 197)

**Kabul kriteri**
- `openapi.json` backend `main` @ `dd16da6`'da **TAZE üretilir** (checkout'taki dosya gitignore'lu
  bir üretim çıktısıdır ve **BAYAT olabilir** — BC dersi: `maxLength: 2000` kısıtı eksik inmişti).
- Kopyalamadan önce **frontend `main`de ve temiz** olduğu doğrulanır (WORKFLOW §4 devir kuralı).
- `pnpm gen:api` koşulur; `openapi.json` + `schema.d.ts` **TEK commit**.
- 🔴 **`-Input`/`-Output` ayrışması KIRILMAMALI** (F-TH tuzağı) — devir sonrası doğrulanır.
- Yol sayısı **197** olarak ölçülür ve raporlanır.
- Typecheck, inen yeni/değişen tiplerin mevcut kodu kırmadığını gösterir. Kırılan olursa
  **düzeltilir** (uyarlama; yeni yüzey açmak DEĞİL).

## 3. T2 — 🔴 ÜÇ BFF KÖKÜ

`src/app/api/backend/[...path]/route.ts` → `ALLOWED_ROOTS`'a **`invoices`**, **`bank-accounts`**,
**`payments`** eklenir; her biri **mevcut yorum düzeniyle birebir**, gerekçesiyle
(hangi dilim · hangi uçlar · eksikse ne bozulur).

**Kabul kriteri**
- ✅ **F-TB3'ün yapısal bekçisi** (`route.test.ts`) bu üç kökü **artık talep etmiyor olabilir** —
  çünkü bekçi *çağrılan* kökleri tarar ve bu dilimde henüz çağıran kod YOK. Bu yüzden:
  🔴 **kökler bekçiye GÜVENİLEREK değil, backend'in yol listesinden ADLI olarak eklenir**;
  bekçinin yeşil olması burada **kanıt değildir** ve rapora böyle yazılır.
- Üç kök için **adlı kapı testi** yazılır (F-şantiye formu emsali): kök izin listesindeyse
  forward edilir, uydurma kök **404**. Kökler sessizce düşerse test kırılır.
- `route.ts`in geri kalanına (path traversal sertleştirmesi, ikili indirme dalı, başlık kurulumu)
  **DOKUNULMAZ**.

## 4. T3 — ROADMAP-FRONTEND §3 bayat borç denetimi (ikinci tur)

F-TB3/T-A'da §3'ün **56 satırından 8'i** bayat çıkmıştı (%14); backend'de aynı denetim **16
satırın 5'ini** (%31) yakaladı. Aradan üç dilim geçti (F-TB3, F-TB2 merge, FAT-1/HZ-1 devri).

**Kabul kriteri:** §3'teki üstü çizili OLMAYAN her satır kod gerçeğine karşı denetlenir; verdict
**AÇIK / KAPALI (commit + `dosya:satır`) / KISMİ**. Kanıtsız satır AÇIK sayılmaz. Kredi
**gerçekten kapatan dilime** yazılır. Raporda **sayı**: kaç satır denetlendi / kaçı bayat.
⚠️ Özellikle **F-TB2 ile kapananlar** (font borcu satırları) ve **openapi devir satırı** taranır.

## 5. T4 — FINAL REVIEW (Opus) + doküman

1. **Dört kapı:** `pnpm lint` + `pnpm typecheck` + `pnpm test` + `pnpm build`.
2. **🔴 5. kapı — bayat sunucu denetimi ÖNCE:** `lsof -nP -iTCP:3000 -sTCP:LISTEN`, kalmış
   `next-server` **öldürülür**, sonra `pnpm exec playwright test --grep-invert "gorsel"`.
   Bayat sunucu testlere dilimin kodunu hiç göstermeden **YEŞİL de verebilir**.
3. **Görsel kare değişmedi kanıtı:** `git diff --stat origin/main...HEAD` çıktısında
   `*-snapshots/*.png` **sıfır**.
4. `ROADMAP-FRONTEND.md` + `ARCHITECTURE-FRONTEND.md` güncellenir ·
   🔴 **`ARCHITECTURE.md`'ye DOKUNULMAZ** (yönetim günceller).
5. **Fatura ve Hazine ekranlarının** sıradaki dilimler olduğu, mockup'larıyla birlikte
   ROADMAP'e yazılır (F-FAT2 / F-HZ adayları).

## 6. Kararlar

| # | Karar | Gerekçe |
|---|---|---|
| K1 | Yeni ekran/rota/DOM **YOK** | CI kapalı → baseline turu koşulamaz |
| K2 | openapi backend'de **taze üretilir**, checkout'taki kullanılmaz | BC dersi: bayat kopya kısıt kaçırdı |
| K3 | Üç BFF kökü **adlı olarak** eklenir, bekçiye güvenilmez | bekçi *çağrılan* kökleri tarar; çağıran kod henüz yok |
| K4 | Devir + BFF **tek dilimde** | ikisi de "yalnız canlıda 404" sınıfı; ayrılırsa biri unutulur |
