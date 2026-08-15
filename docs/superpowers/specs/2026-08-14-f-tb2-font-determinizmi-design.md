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

1. **Yazı tiplerini repoya al** → derleme anında ağ erişimi KALMAZ.
2. **openapi devri:** frontend 171 → **183 yol** (MK-2'nin 12 kira hakedişi ucu) + `gen:api`.

### 🔴 Mekanizma DEĞİŞTİ: `next/font/local` DEĞİL, üretilen çıktının birebir kopyası

İlk yazımda mekanizma `next/font/local` diye bağlanmıştı. **Şef ölçtü, yönetim onayladı
(2026-08-14): o araç bu göçü SADAKATLE YAPAMAZ.**

Ölçüm: bugün fiilen üretilen şey **27 `@font-face` kuralı / 13 `.woff2` dosyası**; kuralları ayıran
tek şey **`unicode-range`**. `next/font/local`ın `src` girdisi yalnız `{path, weight, style}` kabul
ediyor — **`unicode-range` YOK**; `declarations` ise her yüze aynı satırı basıyor, dosya-başına
aralık veremiyor. Sonuç: aynı family+weight+style için `unicode-range`siz iki kural doğar, CSS
eşleştirmesinde **sonuncusu öncekini ölü bırakır** ve `latin-ext` dosyası SADECE ek harfleri
taşıdığı için **`ğ ş İ` yedek yazı tipine düşer** — dilimin tek yasağı olan görünür tipografi
değişikliğinin ta kendisi.

**Uygulanan yol:** `next/font` tümüyle bırakılır; 13 `.woff2` **`.next/static/media/`den bayt-aynı
kopyalanır** (Google'dan yeniden indirilmez), 27 kural harfiyen bir `fonts.css`e yazılır (aynı
`unicode-range`, aynı `display:swap`, iki yedek kuralı ölçüleriyle), `--font-*` değişkenleri
`:root`ta bugünkü değerleriyle tanımlanır (`tokens.css` DEĞİŞMEZ), Next'in bastığı üç
`rel="preload"` elle korunur.

**Neden bu daha güçlü:** K2'nin karşılığı artık ölçüleri `adjustFontFallback`a *yeniden
hesaplatmak* değil, **bugünküleri aynen taşımak** — bayt-aynı kare beklentisini daha iyi karşılar.

**Ek şartlar (yönetim):** 13 dosyanın **HEPSİ** alınır (kullanılmayan cyrillic/greek/vietnamese
dahil — her birinin kendi `unicode-range`i var, indirilmiyorlar; silmek göçü "sadık kopya"
olmaktan çıkarır) · hash'li dosya adları **korunur** (önbellek doğruluğu) · 🔴 **nüks koruyucusu
ZORUNLU**: elle yazılan CSS çürür, bir `unicode-range`in ya da kuralın sessizce düşmesini hiçbir
kapı yakalamaz → `@font-face` sayısını (27), `unicode-range` taşıyan kural sayısını ve iki yedek
kuralının dört ölçüsünü kilitleyen bir test yazılır.

**Kapsam dışı:** yeni ekran, yeni rota, tasarım değişikliği, yeni yazı tipi/ağırlık/alt küme.

---

## 3. 🔴 Bağlanan karar: BU BİR DAVRANIŞ KORUYAN GÖÇTÜR

**K1 — Alt kümeler ve ağırlıklar BUGÜNKÜYLE BİREBİR AYNI kalır.**
Bugün: `Inter` → `subsets: ["latin","latin-ext"]`, değişken ağırlık, `display: "swap"` ·
`JetBrains_Mono` → `subsets: ["latin"]`, `weight: ["400","600","700"]`, `display: "swap"`.
**Hiçbiri genişletilmez, daraltılmaz.** Amaç ağ bağımlılığını kaldırmaktır, tipografiyi
değiştirmek DEĞİL.

~~⚠️ **Gözlem:** JetBrains Mono yalnız `latin` alıyor → Türkçe harfler mono metinde yedeğe
düşüyor. ROADMAP §3'e borç yazılır.~~
✅ **BU GÖZLEM YANLIŞTI — şef ölçtü, yönetim doğruladı (2026-08-14).** Google, `subsets: ["latin"]`
istenmiş olsa da mono için de **`latin-ext` dosyasını gönderiyor** (`u+0100-02ba`), yani `ğ ş İ`
mono'da da **gerçek fontla** basılıyor. **"Mono latin-ext borcu" diye bir borç YOKTUR** ve
ROADMAP'e YAZILMAZ. Ders: `subsets:` istenen değil, **teslim edilen** dosya kümesini belirlemiyor —
iddia üretilen CSS'ten doğrulanır.

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
