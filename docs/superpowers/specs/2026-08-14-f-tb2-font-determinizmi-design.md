# F-TB2 — Yazı tipi determinizmi + openapi devri (frontend)

Tarih: 2026-08-14 · Repo: `frontend/` · Dal: `feat/f-tb2-font-determinizmi`
Yönetim oturumu yazdı. Doğuran olay: **F-MK diliminde bir saat kaybı** — bkz. WORKFLOW §4
"GÖRSEL CI KIRMIZISINI ÖNCE KARE Mİ BUILD Mİ DİYE AYIR".

---

## 1. Sorun (ölçülmüş, tahmin değil)

`src/app/layout.tsx:2` → `import { Inter, JetBrains_Mono } from "next/font/google"`.
`next/font/google` yazı tipi dosyalarını **derleme anında `fonts.gstatic.com`tan indirir.**
GitHub runner'ı bu adrese ara sıra ulaşamıyor ve build **patlıyor**:

```
[WebServer] Failed to fetch font file from https://fonts.gstatic.com/s/jetbrainsmono/...
[WebServer] NextFontError: Failed to fetch `JetBrains Mono` from Google Fonts.
[WebServer] > Build failed because of webpack errors
Error: Process from config.webServer was not able to start. Exit code: 1
```
(CI run **31791721117**, `visual` işi.)

Sonuç: **testler hiç koşmaz** ama iş "visual failed" görünür. Bu **her frontend dilimini**
etkileyen bir kumardır; bugüne kadar şanslıydık. F-MK'de kırmızı, kare oynaması sanıldı ve bir
saat baseline kovalandı.

---

## 2. Kapsam

1. **Yazı tiplerini repoya al** (`next/font/local`) → derleme anında ağ erişimi KALMAZ.
2. **openapi devri:** frontend 171 → **183 yol** (MK-2'nin 12 kira hakedişi ucu) + `gen:api`.

**Kapsam dışı:** yeni ekran, yeni rota, tasarım değişikliği, yeni yazı tipi/ağırlık/alt küme.

---

## 3. 🔴 Bağlanan karar: BU BİR DAVRANIŞ KORUYAN GÖÇTÜR

**K1 — Alt kümeler ve ağırlıklar BUGÜNKÜYLE BİREBİR AYNI kalır.**
Bugün: `Inter` → `subsets: ["latin","latin-ext"]`, değişken ağırlık, `display: "swap"` ·
`JetBrains_Mono` → `subsets: ["latin"]`, `weight: ["400","600","700"]`, `display: "swap"`.
**Hiçbiri genişletilmez, daraltılmaz.** Amaç ağ bağımlılığını kaldırmaktır, tipografiyi
değiştirmek DEĞİL.

⚠️ **Gözlem (bu dilimde DÜZELTİLMEZ):** JetBrains Mono yalnız `latin` alıyor → Türkçe harfler
(`ğ ş İ ı ç ö ü`) mono metinde **yedek yazı tipine düşüyor**. Bugünkü davranış budur; düzeltmek
tipografiyi değiştirir ve kareleri oynatır. **ROADMAP §3'e ayrı borç olarak yazılır.**

**K2 — 🔴 BEKLENEN SONUÇ: BASELINE'LAR BAYT AYNI KALIR.**
`next/font/google` zaten indirdiği dosyaları **self-host eder**; aynı dosyaları repodan vermek
render'ı değiştirmemelidir. **Kare değişirse bu bir BULGUdur, kabul edilecek bir yan etki değil.**
Değişen her kare için sebep bulunur ve raporlanır; "font değişti, olur böyle" **KABUL EDİLMEZ.**

En olası sapma kaynağı: `next/font/google` yedek yazı tipi ölçülerini (`size-adjust`,
`ascent-override` …) **otomatik üretir**; `next/font/local`da bu `adjustFontFallback` ile açıkça
verilmezse ilk boyama (FOUT) farklı olur. **Karşılığı açıkça ayarlanır.**

**K3 — Lisans dosyaları repoya girer.** Inter ve JetBrains Mono **SIL Open Font License**
altındadır; `.woff2` dosyalarının yanına `OFL.txt` konur. Lisanssız font commit'lemek yapılmaz.

**K4 — Kaynak izlenebilir olur.** Font dosyalarının hangi sürümden/URL'den alındığı, dosyaların
yanındaki kısa bir `README.md`de yazılır (yenileme gerektiğinde tahmin yürütülmesin).

---

## 4. Kabul kriterleri

1. `grep -rn "next/font/google" src/` → **sıfır sonuç**.
2. Build **ağ erişimi olmadan** tamamlanır. Kanıt: şef `fonts.gstatic.com`a çıkışı engelleyerek
   ya da en azından build logunda **hiçbir `fonts.gstatic.com` isteği olmadığını** göstererek
   doğrular (log grep'i yeterli kanıttır).
3. openapi **183 yol** + `schema.d.ts` senkron, **TEK commit**.
   🔴 `gen:api` görünür bir UI değişikliği ZORUNLU kılarsa (F-İK'deki `worker_source` gibi):
   **DUR ve raporla** — font ölçümüne karıştırma.
4. Beş kapı yeşil. 🔴 **5. kapıdan ÖNCE port denetimi** (`lsof -nP -iTCP:3000 -sTCP:LISTEN`).
5. **Baseline turu — bu dilimin ASIL ölçümü:** beklenen **80/80 bayt-aynı**.
   `cmp` ile ÖLÇÜLÜR. Değişen kare varsa **DUR ve raporla**, sebebini bulmadan baseline yenileme.
6. Lisans + kaynak notu yerinde (K3/K4).

---

## 5. Neden ayrı dilim

80 baseline'ın tamamını oynatma **riski** taşıyor. Bir özellik dilimine bindirilseydi, oynayan
karenin sebebi (özellik mi font mu) ayırt edilemezdi — F-MK'de tam olarak bu karışıklık bir saate
mal oldu.
