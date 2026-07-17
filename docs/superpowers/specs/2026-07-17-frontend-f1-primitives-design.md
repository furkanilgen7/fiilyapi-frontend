# Frontend F1 — Primitive'ler · Tasarım Dokümanı

**Tarih:** 2026-07-17
**Faz:** F1 (bağımlılık: F0 iskelet — BİTTİ+canlı)
**Kanon kaynak:** `fiilyapi-backend/docs/superpowers/specs/2026-07-17-temel-modul-design.md` §6 (Frontend) ve `projedesign/*.dc.html` (68 mockup). Bu doküman kanonu tekrar etmez; F1'e özgü uygulama kararlarını kanona ekler.

## 1. Amaç

F0 iskeletinin üstüne, tüm ekranların üzerine oturacağı **primitive bileşen kütüphanesini** kurmak. Ekran veya iş mantığı yok — yalnızca tekrar kullanılabilir, token-tabanlı, erişilebilir UI parçaları + bunları sergileyen bir showcase sayfası + davranış ve görsel regresyon testleri.

Sıra (§6.2): `tokens.css` (genişlet) → primitive'ler → showcase → test.

## 2. Kapsam — Primitive'ler (kanon §6.2)

| Bileşen | Varyasyon |
|---|---|
| **Button** | 4 boyut × 7 varyant: primary, secondary, light-blue, success, danger, warning, ghost |
| **Input** | durumlar: normal / focus / error / success / disabled; sol-sağ ikon; para (sayısal, JetBrains Mono) |
| **Select** | native `<select>` sarmalayıcı, Input ile aynı durum seti |
| **Checkbox / Radio** | işaretli / işaretsiz / disabled |
| **Toggle** | açık / kapalı / disabled |
| **Badge** | durum pill · sayı · rol etiketi |
| **Alert** | 4 tip (info / success / warning / danger) + sol-kenar varyantı (4px) |
| **Card** | başlık / gövde / aksiyon slotları; kart gölgesi + radius 14 |

**Kapsam dışı (sonraki fazlar):** KPI kartı, tablo, modal, progress bar, breadcrumb, avatar, grafik, durum noktası (§6.2 "ekranlardan türetilecekler" — F3+). Topbar/Sidebar kabuğu F3.

## 3. Token genişletme (kanon §6.1)

F0'ın `src/styles/tokens.css`'i temel bir set içeriyor; F1 onu §6.1'in tam setine çıkarır. Tüm bileşenler **yalnızca token** kullanır — çıplak hex yasak.

- **Tipografi ölçeği:** sayfa başlığı 26/700 (ls −0.5px), bölüm başlığı 16/600, gövde 13/400, küçük 11/400, tablo başlığı 11/600 uppercase (ls 0.8px), sayısal 22/700 Mono.
- **Radius:** 6 · 8 (standart) · 10 · 14 (kart).
- **Gölge:** kart `0 1px 4px rgba(0,0,0,0.06)` · topbar `0 1px 3px rgba(0,0,0,0.06)` · focus-ring `0 0 0 3px rgba(37,99,235,0.1)`.
- **Hareket:** `fadeUp` (opacity + translateY(8px), 0.4s ease); geçişler 0.15s. Yalnız compositor-dostu özellikler (transform/opacity).
- **Renk ekleri:** ikincil yüzey `#f8fafc`, ayırıcı `#f1f5f9`, ek metin tonları (`#475569`), yumuşak zeminler (kırmızı `#fee2e2` vb.).
- **Sabitlenen tutarsızlıklar (§6.1):** kart gölge `.06`; alert sol kenar `4px`; label rengi `#475569`; bölüm başlığı ağırlığı `600`; sidebar `220px` (F3'te kullanılacak, token olarak tanımlanabilir).
- **Font düzeltmesi:** JetBrains Mono **700** ağırlığı next/font'ta yüklenir (KPI/sayısal veri için; F0'da yalnız 400 vardı → 700 eklenir).

## 4. Mimari

**Dosya yapısı** (kullanıcının `web/coding-style.md` konvansiyonu — feature/bileşen bazlı, co-located CSS):

```
src/components/ui/
├── button/        Button.tsx · button.css · index.ts
├── input/         Input.tsx · input.css · index.ts
├── select/        Select.tsx · select.css · index.ts
├── checkbox/      Checkbox.tsx · Radio.tsx · checkbox.css · index.ts
├── toggle/        Toggle.tsx · toggle.css · index.ts
├── badge/         Badge.tsx · badge.css · index.ts
├── alert/         Alert.tsx · alert.css · index.ts
├── card/          Card.tsx · card.css · index.ts
├── icons/         yerel inline SVG bileşenleri (EyeIcon, CheckIcon, ...)
└── index.ts       barrel (tüm primitive'leri yeniden dışa aktarır)
```

**Bileşen API konvansiyonu:**
- `variant` / `size` gibi discriminated string prop'ları; varsayılanlar mantıklı.
- `React.forwardRef` ile ref geçişi (form entegrasyonu F2 için hazır).
- Native HTML prop passthrough (`...rest`) + dışarıdan `className` merge (küçük bir `cx`/`clsx`-benzeri yerel yardımcı; yeni bağımlılık yok).
- CSS: her bileşen kendi `.css`'inde token'larla; sınıf adları kebab-case (`btn`, `btn--primary`, `btn--lg`).
- **Immutability:** prop mutasyonu yok; saf render.

**İkonlar:** `src/components/ui/icons/` altında küçük yerel inline SVG bileşenleri (mockup'lar 150 inline SVG kullanıyor, ikon-font/lib yok). Yalnız primitive'lerin ihtiyaç duyduğu ikonlar (göz/göz-kapalı, check, chevron, uyarı, x). Lib eklenmez.

**Davranış kaynağı:** `Tasarım Sistemi.dc.html` input/select davranışının tek yazılı spesifikasyonu (§6.2 notu) — davranış alınır, `fiil-*` sınıf adları TAŞINMAZ.

## 5. Showcase sayfası

`src/app/design-system/page.tsx` (rota: `/design-system`) — tüm primitive'leri tüm varyant/boyut/durumlarıyla, bölümlere ayrılmış olarak render eder. Amaç: (1) geliştirme sırasında görsel doğrulama, (2) review yüzeyi, (3) görsel regresyon snapshot hedefi. İş mantığı yok; statik/istemci-etkileşimli örnekler (toggle/checkbox için `useState` demo).

## 6. Test stratejisi

**Vitest + RTL (davranış):** her primitive için — variant/size → doğru sınıf; disabled durumu; ikon render; kontrollü bileşenlerde `onChange`/`onClick`; erişilebilirlik rolleri (button/checkbox/switch), label ilişkisi, focus. Mock değil gerçek davranış.

**Playwright (görsel regresyon):** @1280px, açık tema. Snapshot'lar: showcase sayfasının bölümleri + kritik primitive state'leri (button varyantları, input error/success/focus, alert tipleri, card). Baseline'lar commit'lenir. Deterministik bekleme (font yüklenmesi), animasyon devre dışı/tamamlanmış durumda snapshot.

## 7. CI değişikliği

Mevcut `ci.yml` job'u (install→lint→typecheck→test→build) korunur. Görsel regresyon için: Playwright browser kurulumu (`pnpm exec playwright install --with-deps chromium`) + görsel snapshot adımı. Baseline'lar Linux CI ortamında üretilmeli — yerel macOS snapshot'ları CI'da font/render farkıyla patlar; bu yüzden baseline'lar CI-Linux'ta üretilip commit'lenir (opt-in baseline workflow'u).

## 8. Kısıtlar (F0'dan devam)

- **pnpm only.** Yeni bağımlılık yalnızca `@playwright/test` (görsel regresyon için); başka lib yok.
- Kod/isim/dosya İngilizce; UI metni + yorumlar Türkçe.
- Ham CSS + token'lar; **Tailwind yasak**; çıplak hex yasak.
- Açık tema kanon; `prefers-color-scheme: dark` yok.
- Tek dosya ≤ 400 satır.
- Commit başlıkları İngilizce (`<type>: <desc>`), Türkçe özel karakter yok.
- Secret yok.
- Hedef masaüstü ≥1280px.

## 9. Kabul kriterleri (F1 bitişi)

- 8 primitive ailesi de kanon varyant/durum setini karşılar, yalnız token kullanır (çıplak hex taraması temiz).
- `tokens.css` §6.1'in tam setini içerir; JetBrains Mono 700 yüklü.
- `/design-system` tüm primitive'leri render eder; `pnpm build` temiz.
- Her primitive için Vitest+RTL davranış testi geçer; kapsam anlamlı.
- Playwright görsel snapshot'lar @1280px yeşil; baseline'lar commit'li.
- `pnpm lint`/`typecheck`/`test`/`build` + görsel job CI'da yeşil.
- F2 (auth formları) ve F3 (kabuk/ekranlar) bu primitive'lerin üstüne oturabilir.
