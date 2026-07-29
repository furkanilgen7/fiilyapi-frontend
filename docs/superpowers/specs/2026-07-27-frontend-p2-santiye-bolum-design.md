# P2 — Şantiye & Bölüm ekranları (frontend tasarım)

Tarih: 2026-07-27
Mockup kanonu: `projedesign/Proje Detay - Şantiyeler.dc.html`, `projedesign/Şantiye Detay.dc.html`
Backend sözleşmesi: `backend/docs/superpowers/specs/2026-07-27-alt-proje-2-p2-santiye-bolum-design.md` §4
Onaylı kararlar: bellek notu `alt-proje-2-p2-kararlari`
Önceki dilim: `2026-07-26-frontend-p1-projeler-ekrani-design.md`

---

## 1. Amaç

İki yeni ekran + bir yeni kabuk deseni:

1. **Proje Detay › Şantiyeler** — `/projeler/[projectId]`
2. **Şantiye Detay › Bölümler** — `/projeler/[projectId]/santiyeler/[siteId]`
3. **Drill-in sidebar** — Karar 1; Ayarlar desenine birebir

`Ekran 6 - Şantiye Detay.dc.html` **kanon değildir** (backend spec §1.1). Görsel
karşılaştırmada yalnız `Şantiye Detay.dc.html` kullanılır.

---

## 2. Rota ve dosyalar

```
src/app/(app)/projeler/
  page.tsx                                    (P1, değişmez)
  [projectId]/
    layout.tsx                                YENİ — ProjectSidebar'ı takar
    page.tsx                                  YENİ — Şantiyeler sekmesi
    santiyeler/[siteId]/
      layout.tsx                              YENİ — SiteSidebar'ı takar
      page.tsx                                YENİ — Bölümler sekmesi

src/components/project-detail/
  ProjectHeroBar.tsx     ProjectHeroBar.test.tsx
  ProjectDetailTabs.tsx  ProjectDetailTabs.test.tsx
  SiteCard.tsx           SiteCard.test.tsx
  SiteFormModal.tsx      SiteFormModal.test.tsx
  SiteTotalsStrip.tsx
  project-detail.css

src/components/site-detail/
  SiteHeroBar.tsx        SiteHeroBar.test.tsx
  SiteDetailTabs.tsx     SiteDetailTabs.test.tsx
  SectionCard.tsx        SectionCard.test.tsx
  SectionFormModal.tsx   SectionFormModal.test.tsx
  site-detail.css

src/components/shell/drill/
  DrillSidebar.tsx       DrillSidebar.test.tsx      genel drill-in kabuğu
  drill-sidebar.css
  project-nav-config.ts  project-nav-config.test.ts
```

`DrillSidebar` **genel** bir bileşendir; `SettingsSidebar` bir sonraki dilimde ona
devredilebilir ama P2'de Ayarlar'a dokunulmaz (kapsam kayması olmasın).

---

## 3. Drill-in sidebar (Karar 1)

Kanon uygulama: `src/components/settings/shell/SettingsSidebar.tsx`. Yapı birebir
aynı — üstte geri linki, gruplu liste, `isActivePath` ile aktif işaretleme.

### 3.1 Geri oku hedefi — bir seviye yukarı

| Bulunduğun yer | Geri linki |
|---|---|
| Proje Detay | `← Projeler` → `/projeler` |
| Şantiye Detay | `← Güneşkent Konut` → `/projeler/{projectId}` |
| Bölüm Detay (P3) | `← A-Blok Şantiyesi` → `…/santiyeler/{siteId}` |

Etiket **üst seviyenin adıdır**, sabit metin değil. `Proje Detay - Şantiyeler`
mockup'ı satır 62 zaten `← Projeler` gösteriyor (içerik alanında); drill sidebar'da
aynı link sidebar başına taşınır.

### 3.2 Sidebar genişliği — 220px → 260px

`Şantiye Detay.dc.html` satır 90 `margin-left:260px`; eski düz sidebar 220px
(`Proje Detay - Şantiyeler` satır 59). Drill sidebar **260px**'tir; ana sidebar
220px kalır. Genişlik `--sidebar-width` / `--drill-sidebar-width` token'larına
bağlanır, çıplak px yazılmaz.

### 3.3 Menü içeriği

`Şantiye Detay.dc.html` satır 66–86'dan:

- **Bağlam bloğu** (üst): `📁 Tüm Projeler`, aktif proje (● işaretli), altında
  aktif şantiye `📍` ve onun 6 sekmesi, diğer projeler
- **Saha & İK**: 👷 Puantaj · 👤 Personel · 🏗 Makine & Ekipman · 💰 Bordro
- **Stok & Satınalma**: 📦 Stok & Depo · 🛒 Satınalma
- **Mali**: 📋 Sözleşmeler · 🏗 Taşeron Hakediş · 💼 İşveren Hakediş · 📒 Muhasebe · 🏦 Hazine · 📊 Mali Tablolar

Öğe stili (satır 67): `padding:7px 10px; border-radius:8px; font-size:13px;
color:#475569; gap:8px`. Grup başlığı (satır 73): `font-size:10px; font-weight:600;
color:#94a3b8; letter-spacing:1px; text-transform:uppercase; padding:0 12px 4px`.
Ayırıcı (satır 72): `height:1px; background:#f1f5f9; margin:8px 12px`.

**Yazılmamış rotalar** mevcut catch-all üzerinden `ComingSoon`'a düşer (F3 deseni).

---

## 4. Ölçüler — Proje Detay › Şantiyeler

Kaynak: `Proje Detay - Şantiyeler.dc.html`, satır numaraları belirtildi.

### 4.1 Hero şerit (satır 68–91)

| Öğe | Değer |
|---|---|
| Kapsayıcı | `background: linear-gradient(135deg,#1d4ed8,#3b82f6); border-radius:16px; padding:24px 28px; margin-bottom:24px; color:#fff` |
| Üst satır (kategori · şehir) | `font-size:12px; color:rgba(255,255,255,.7); margin-bottom:6px` |
| Başlık `h1` | `font-size:24px; font-weight:700; letter-spacing:-0.3px; margin-bottom:6px` |
| Meta satırı | `font-size:13px; color:rgba(255,255,255,.8); gap:12px` |
| Sağ blok etiketi | `font-size:11px; color:rgba(255,255,255,.7); margin-bottom:4px` |
| Sağ blok değeri | `font-size:28px; font-weight:700; font-family:'JetBrains Mono',monospace` |
| Sağ blok alt not | `font-size:12px; color:rgba(255,255,255,.7); margin-top:2px` |
| Sekme barı | `display:flex; gap:4px; margin-top:20px` |
| Aktif sekme | `padding:6px 14px; font-size:12px; font-weight:600; color:#fff; background:rgba(255,255,255,.2); border-radius:7px` |
| Pasif sekme | `padding:6px 14px; font-size:12px; color:rgba(255,255,255,.7); background:transparent; border-radius:7px` |

Sekmeler: **Şantiyeler · İş Kalemleri · İşveren Hakediş · Taşeron Hakediş · Belgeler**.
P2'de yalnız *Şantiyeler* yazılır; diğer dördü **görünür ama devre dışı** (§7.3).

### 4.2 Bölüm başlığı ve ekleme butonu (satır 96–98)

`h2`: `font-size:16px; font-weight:600; color:#1e293b` — metin `Şantiyeler (2)`.
Buton: `background:#2563eb; color:#fff; padding:8px 16px; border-radius:8px;
font-size:13px; font-weight:600` — `+ Şantiye Ekle`.

### 4.3 Şantiye kartı ızgarası (satır 101–169)

Izgara: `display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:24px`.

| Öğe | Aktif kart | Tamamlanmış kart |
|---|---|---|
| Kabuk | `background:#fff; border-radius:16px; border:1px solid #e2e8f0; box-shadow:0 1px 4px rgba(0,0,0,.06)` | aynı + `opacity:.8` |
| Üst şerit (satır 105/142) | `height:5px; background:linear-gradient(90deg,#2563eb,#60a5fa)` | `height:5px; background:#e2e8f0` |
| Gövde | `padding:20px` | aynı |
| Ad | `font-size:17px; font-weight:700; color:#1e293b` | aynı |
| Alt satır | `font-size:12px; color:#94a3b8; margin-top:2px` | aynı |
| Durum rozeti | `background:#dcfce7; color:#16a34a; font-size:11px; font-weight:600; padding:4px 10px; border-radius:20px` | `background:#f1f5f9; color:#64748b` |
| KPI ızgarası | `grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:14px` | aynı |
| KPI hücresi | `background:#f8fafc; border-radius:8px; padding:10px; text-align:center` | aynı |
| KPI değeri | `font-size:18px; font-weight:700` (3. hücre `16px`) | aynı |
| KPI etiketi | `font-size:10px; color:#94a3b8; margin-top:2px` | aynı |
| İlerleme çubuğu | `height:6px; background:#f1f5f9; border-radius:3px` + dolgu `linear-gradient(90deg,#2563eb,#60a5fa)` | iz `#dcfce7`, dolgu `#16a34a` |
| Çip | `background:#f1f5f9; color:#475569; padding:5px 12px; border-radius:6px; font-size:12px` | aynı |
| `→ Detay` çipi | `background:#eff6ff; color:#2563eb; font-weight:600` | `background:#f1f5f9; color:#475569; font-weight:600` |

KPI renk kuralı: İşçi `#1e293b` (tamamlanmışsa `#94a3b8`), İlerleme `#2563eb`
(tamamlanmışsa `#16a34a`), 3. hücre `#1e293b` / tamamlanmışta "Teslim" `#16a34a`.

### 4.4 Alt KPI şeridi (satır 176–191)

`grid-template-columns:repeat(4,1fr); gap:12px`. Kart: `background:#fff;
border-radius:12px; padding:16px; border:1px solid #e2e8f0`. Etiket:
`font-size:11px; color:#94a3b8; margin-bottom:5px; text-transform:uppercase;
letter-spacing:0.8px`. Değer: `font-size:20px; font-weight:700` — para değerlerinde
`font-family:'JetBrains Mono',monospace`, yeşil metrikler `#16a34a`.

---

## 5. Ölçüler — Şantiye Detay › Bölümler

Kaynak: `Şantiye Detay.dc.html`.

### 5.1 İçerik alanı (satır 90)

`margin-left:260px; padding:24px 32px` (drill sidebar 260px).

### 5.2 Hero şerit (satır 93–137)

Kapsayıcı: `linear-gradient(135deg,#1d4ed8 0%,#2563eb 60%,#3b82f6 100%);
border-radius:16px; padding:24px 28px; margin-bottom:20px`.

- Üst satır (satır 96): `font-size:12px; color:rgba(255,255,255,.65); margin-bottom:6px`
  — "Güneşkent Konut Projesi · İşveren: …"
- `h1` (97): `font-size:24px; font-weight:700; letter-spacing:-0.3px`
- Meta satırı (98): `font-size:13px; color:rgba(255,255,255,.8); gap:16px`
  — 📍 adres·şehir · 👷 Şantiye Şefi · tarih aralığı
- Butonlar (107–108): `Günlük Kayıt` → `background:rgba(255,255,255,.15);
  border:1px solid rgba(255,255,255,.3); color:#fff; padding:8px 14px;
  border-radius:8px; font-size:12px; font-weight:500` · `+ Bölüm Ekle` →
  `background:#fff; color:#2563eb; font-weight:700`

**Hero içi KPI ızgarası** (112–136): `grid-template-columns:repeat(5,1fr); gap:16px`.
Hücre: `background:rgba(255,255,255,.12); border-radius:10px; padding:12px 14px`.
Etiket `font-size:10px; color:rgba(255,255,255,.65); margin-bottom:4px`;
değer `font-size:22px; font-weight:700` (para hücresi `20px` + mono);
alt not `font-size:11px; color:rgba(255,255,255,.65); margin-top:4px`.
İlk hücrede mini çubuk: `height:4px; background:rgba(255,255,255,.2);
border-radius:2px; margin-top:6px`, dolgu beyaz.

Beş hücre: Fiziksel İlerleme · Aktif İşçi · Toplam Hakediş · Kalan Gün · Bölüm Sayısı.

### 5.3 Sekme barı (satır 142–148)

`display:flex; gap:2px; background:#fff; border:1px solid #e2e8f0;
border-radius:10px; padding:4px; width:fit-content; margin-bottom:20px`.
Aktif: `padding:7px 16px; font-size:13px; font-weight:600; color:#2563eb;
background:#eff6ff; border-radius:7px`. Pasif: `color:#64748b`, arka plan yok.

Sekmeler: **Bölümler · Puantaj · Stok · Hakedişler · Günlük Kayıt · Belgeler**.
P2'de yalnız *Bölümler* yazılır (§7.3).

### 5.4 Bölüm listesi (satır 152–)

Başlık: `font-size:14px; font-weight:600; color:#1e293b; margin-bottom:14px`
— `A-Blok Bölümleri (5)`. Liste: `display:flex; flex-direction:column; gap:12px`
(**dikey liste, ızgara değil**).

Kart içeriği: ad + durum rozeti, tarih·sorumlu satırı, 4 metrik ve sağda
`Detay →` / `Düzenle` bağlantısı. Kalan ölçüler kart bloğundan (satır 153+)
uygulama sırasında okunur — görsel karşılaştırma kapısı bunu zorunlu kılar.

**Metrik etiketleri duruma göre değişir — MOCKUP KAZANIR.** Bu spec'in ilk
sürümü sabit bir dörtlü (İlerleme · İş Kalemleri · Bölüm Bedeli · İşçi)
yazıyordu; canonical mockup ise satır bazında farklı etiket basıyor. Mockup ile
bu doküman çeliştiğinde mockup geçerlidir, dolayısıyla bağlayıcı etiket seti:

| Metrik | `completed` | `active` | `planned` |
|---|---|---|---|
| 1 | `İlerleme` (168/205) | `İlerleme` (242) | `İlerleme` (279/315) |
| 2 | `İş Kalemleri` (173/210) | `İş Kalemleri` (247) | `İş Kalemleri` (284/320) |
| 3 | `Bölüm Bedeli` (178/215) | `Bölüm Bedeli` (252) | `Tahmini Bedel` (288/324) |
| 4 | `İşçi (zirve)` (182/219) | `Aktif İşçi` (256) | `Planlanan İşçi` (292/328) |

Parantezdeki sayılar `../projedesign/Şantiye Detay.dc.html` satır numaralarıdır.
İlk iki etiket hiçbir durumda değişmez. Uygulama `STATUS_BADGE_CLASS` ile aynı
durum→harita desenini kullanır (`STATUS_BUDGET_LABEL`, `STATUS_WORKER_LABEL`).

Durum etiketleri mockup'tan birebir: **`Tamamlandı`** · **`Aktif — Devam Ediyor`** ·
**`Planlandı`**. Eylem bağlantısı duruma göre: `planned` → `Düzenle`, diğerleri →
`Detay →`.

---

## 6. Renk → token eşlemesi

P1 spec §5'te tanımlı token'lar yeniden kullanılır. Yeni gereken:

| Token | Değer | Kullanım |
|---|---|---|
| `--drill-sidebar-width` | `260px` | drill-in sidebar |
| `--gradient-hero-project` | `linear-gradient(135deg,#1d4ed8,#3b82f6)` | proje hero |
| `--gradient-hero-site` | `linear-gradient(135deg,#1d4ed8 0%,#2563eb 60%,#3b82f6 100%)` | şantiye hero |
| `--surface-hero-tile` | `rgba(255,255,255,.12)` | hero içi KPI hücresi |
| `--text-on-hero-muted` | `rgba(255,255,255,.65)` | hero etiketleri |

`#1e293b`, `#94a3b8`, `#e2e8f0`, `#f8fafc`, `#eff6ff`, `#2563eb`, `#16a34a`,
`#dcfce7`, `#f1f5f9` zaten `tokens.css`'te — **çıplak hex yazılmaz**, uygulama
öncesi her biri token adıyla doğrulanır.

---

## 7. Dürüstlük ve boş durumlar

### 7.1 Yer tutucu hücreler

Backend `{available:false, pending_module:"…"}` döndüğünde hücre **düzeni korur**,
değeri yerine `—` basar ve `title` ile Türkçe açıklama verir. Türkçe kopya
frontend'de, `pendingModuleLabel()` yardımcısında (P1'de eklendi) tutulur; yeni
anahtarlar eklenir: `boq`, `stock`, `documents`, `site_diary`, `subcontracts`.

Yer tutucu **ilerleme çubuğu** çizilmez (sahte %0 izlenimi verir); çubuğun yerine
boş iz bırakılır.

### 7.2 "3 gecikme riski" basılmaz

Backend bu alanı hiç döndürmez (backend spec §3.3); frontend satırı basmaz.
Mockup'ta görünmesi sapma sayılmaz — spec'te kayıtlı.

### 7.3 Yazılmamış sekmeler

Proje hero sekmeleri (İş Kalemleri, İşveren/Taşeron Hakediş, Belgeler) ve şantiye
sekmeleri (Puantaj, Stok, Hakedişler, Günlük Kayıt, Belgeler) **görünür kalır**
— mockup birebir kuralı. Tıklanınca `ComingSoon` gösterilir; `aria-disabled`
verilmez (gezinilebilir olmalı), ama `title` ile "Bu bölüm yakında" denir.

### 7.4 Boş liste durumları

- Şantiyesiz proje: "Bu projede henüz şantiye yok." + `+ Şantiye Ekle`
- Bölümsüz şantiye (Karar 4, **geçerli bir durum**): "Bu şantiyede henüz bölüm
  tanımlanmadı." + `+ Bölüm Ekle`. Hata gibi gösterilmez; Bölüm Sayısı KPI'ı `0`
  basar (yer tutucu değil — gerçek değer).

### 7.5 Gecikmiş bitiş tarihi

`remaining_days < 0` ise Kalan Gün hücresi kırmızıya döner ve "X gün gecikme"
yazar. Backend negatif değeri kırpmadan döndürüyor (backend spec §4.2).

---

## 8. Sayı ve tarih biçimi

P1 §10 ile aynı: `tr-TR`, binlik `.`, ondalık `,`; para `₺` + mono font; büyük
tutarlar `₺ 22,4M`. Tarih `Mar 2025`, tam tarih `15.03.2025`. Saat dilimi
**Europe/Istanbul**, UTC gösterilmez.

---

## 9. Testler

- **Vitest + Testing Library:** her bileşen için davranış testi; yer tutucu
  hücrenin `—` bastığı; boş durum metinleri; `remaining_days` negatifken kırmızı;
  drill sidebar geri linkinin doğru üst seviyeye gittiği; aktif öğe işaretlemesi.
- **Görsel regresyon:** 1440px'te `/projeler/{id}` ve `/projeler/{id}/santiyeler/{siteId}`.
  Baseline'lar **yalnız Linux CI'da** üretilir (`visual-baselines.yml` →
  workflow_dispatch → artifact → `e2e/`). macOS'ta PNG üretilmez.
- **Mockup karşılaştırması (kapı):** her ekran task'ının sonunda
  `scripts/render-mockup.mjs` ile ilgili mockup 1440px'te render edilir ve
  uygulamayla yan yana konur. Göz kararı yok — sapmalar ölçüyle raporlanır.
- **Erişilebilirlik:** sidebar `<nav aria-label>`; sekme barı `role="tablist"`;
  kart eylemleri klavyeyle erişilebilir.

---

## 10. Kapsam dışı

Bölüm Detay ekranı (`Bölüm Detay.dc.html` — P3), şantiyenin 5 yazılmamış sekmesi,
hakediş ekranları, `SettingsSidebar`'ın `DrillSidebar`'a devri, mobil kırılım
(mockup yalnız 1440px veriyor; responsive davranış P1 ile aynı kurala tabi).
