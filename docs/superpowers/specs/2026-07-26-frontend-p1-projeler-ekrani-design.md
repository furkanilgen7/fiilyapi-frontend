# P1 — Projeler ekranı (tasarım)

Tarih: 2026-07-26
Kapsam: Alt-Proje 2 · P1 (Projeler ekranı — Ekran 4)
Mockup kanonu: `projedesign/Ekran 4 - Projeler.dc.html`
Bağımlı: B7/P1 backend (`GET/POST/PATCH /projects`, yeni `projects` izin modülü)

---

## 1. Amaç

`/projeler` rotası şu an `[...slug]` catch-all üzerinden ComingSoon'a düşüyor; gerçek
sayfa olur. Üç proje tipini (Taahhüt / Kendi Yatırım / Kat Karşılığı) tanıtan açıklama
kartları, sayaçlı sekme barı ve tip-varyantlı proje kartları mockup'tan birebir gelir.

Ana ilke (F6 ile aynı): **kabuk gerçek, veri dürüst.** Yazılmamış modüllere bağlı
alanlar (Harcanan, işçi/taşeron, satış, kâr/marj, Final Hakediş) boş durum gösterir;
kart iskeleti, ölçüleri ve başlıkları mockup'la birebir kalır, sahte rakam basılmaz.

## 2. Rota ve dosyalar

F6 desenine paralel: `page.tsx` istemci görünümünü sarar, istek F2'deki
`/api/backend/[...path]` BFF proxy'si üzerinden gider (httpOnly çerezli oturum).

```
src/app/(app)/projeler/page.tsx            # yeni — ProjectsView'u sarar
src/components/projects/
├── ProjectsView.tsx                       # düzen: breadcrumb, başlık+buton, legend, sekmeler, ızgara
├── TypeLegend.tsx                         # 3 tip açıklama kartı
├── ProjectTabs.tsx                        # 5 sekme + sayaçlar
├── tabs.ts                                # sekme sabitleri + parse/filtre yardımcıları (saf)
├── ProjectCard.tsx                        # tek kart — üç tip varyantı + tamamlanmış görünüm
├── ShareBar.tsx                           # kat karşılığı pay çubuğu
├── ProjectFormModal.tsx                   # "+ Yeni Proje" (mockup'sız — §8)
└── projects.css                           # tüm ölçüler
src/lib/pending-modules.ts                 # ortak pending_module → metin eşlemesi (yeni)
src/lib/format.ts                          # + formatMonthYear (mevcut dosyaya eklenir)
src/lib/api/hooks/useProjects.ts           # değişir — yeni yanıt şekli + filtre parametresi
src/lib/api/hooks/useProjectMutations.ts   # yeni — POST /projects
```

Statik `projeler/` segmenti Next'te `[...slug]` catch-all'ından önceliklidir; catch-all
dosyasına dokunulmaz.

## 3. Backend sözleşmesi (B7/P1, paralel yazılıyor)

`GET /projects` → `{ counts: { all, taahhut, kendi_yatirim, kat_karsiligi, completed }, items: [...] }`

`item`: `id, code, name, project_type ("taahhut"|"kendi_yatirim"|"kat_karsiligi"),
status ("active"|"on_hold"|"completed"), category, city, employer_name, contract_no,
contract_amount, start_date, end_date, budget, progress_pct,
investment: { sales_target, land_cost } | null,
land_share: { landowner_name, our_share_pct, owner_share_pct, ... } | null,
spent / headcount / subcontractor_count / sales / profit: yer tutucu
({ available: false, pending_module })`.

- Filtreler: `?type=...` ve `?status=completed`. **Sayaçlar filtreden etkilenmez** —
  her yanıtta tam `counts` döner, sekme barı daima onları basar.
- `POST /projects` (full izni) → "+ Yeni Proje". `PATCH /projects/{id}` bu ekranda
  kullanılmaz (P2+).
- Yeni izin modülü **`projects`**. İzin Matrisi ekranı `GET /modules` üzerinden
  veri-güdümlü olduğundan frontend değişikliği gerektirmez; Ayarlar'daki proje erişim
  ekranı da backend tarafında bu izinle korunur — frontend'de ek iş yok.
- İzin kapıları F4 kuralıyla aynı: liste isteği 403 → `AccessDenied`
  (`isForbidden`), `POST` 403 → form içi `backendErrorMessage`. Buton önden gizlenmez.

### Mevcut `useProjects` tüketicileri (kırılma)

`GET /projects` yanıtı düz diziden `{ counts, items }`e döner. Mevcut tüketiciler
güncellenir: `src/components/settings/ProjectAccessModal.tsx` ve
`src/components/settings/users/UsersScreen.tsx` (`projectsQuery.data` → `data.items`).

## 4. Ölçüler (mockup satır içi stillerinden)

Renkler token üzerinden (§5); çıplak hex yazılmaz. Satır referansları mockup dosyasına.

### 4.1 Sayfa başlığı (satır 61-66)

| Öğe | Değer |
|---|---|
| İçerik alanı | `padding: 28px 32px`, `animation: fadeUp .4s ease` |
| Breadcrumb | 12px, `--color-text-subtle`, `margin-bottom: 6px` — metin: `Portföy · {counts.all - counts.completed} Aktif Proje` (mockup'taki "4" gerçek sayıyla) |
| Başlık satırı | flex, `align-items: center`, `justify-content: space-between`, `margin-bottom: 24px` |
| `h1` | 26px/700, `letter-spacing: -0.5px` — "Projeler" |
| "+ Yeni Proje" butonu | zemin `--color-primary`, beyaz, `border: none`, `padding: 9px 18px`, `radius: 8px`, 13px/600 |

Breadcrumb'daki "Aktif" sayısı: mockup 4 aktif gösteriyor; gerçek değer
`counts.all - counts.completed` (backend ayrı `active` sayacı vermiyor; `on_hold`
projeler de "aktif portföy" içindedir — tamamlanmamış her şey).

### 4.2 Tip açıklama kartları (satır 69-91)

Izgara: `grid-template-columns: 1fr 1fr 1fr` · `gap: 14px` · `margin-bottom: 20px`.
Kart: `radius: 12px`, `padding: 14px 16px`, `border: 1px solid`.

| Tip | Zemin | Kenarlık | Rozet zemini | Sayı metni | Açıklama metni |
|---|---|---|---|---|---|
| TAAHHÜT | `#eff6ff` | `#bfdbfe` | `#2563eb` | `#1d4ed8` | `#3b82f6` |
| KENDİ YATIRIM | `#f5f3ff` | `#ddd6fe` | `#8b5cf6` | `#6d28d9` | `#8b5cf6` |
| KAT KARŞILIĞI | `#f0fdfa` | `#99f6e4` | `#0f766e` | `#0f766e` | `#14b8a6` |

İç ölçüler (üç kartta aynı):

| Öğe | Değer |
|---|---|
| Üst satır | flex, `gap: 8px`, `margin-bottom: 6px` |
| Tip rozeti | 10px/700, beyaz, `padding: 2px 8px`, `radius: 8px`, uppercase |
| Proje sayısı | 13px/600 — `{counts.<tip>} proje` (gerçek sayaç) |
| Açıklama | 12px, `line-height: 1.6`, vurgulu kelime `<strong>` |

Açıklama metinleri mockup'tan aynen: taahhüt "İşveren adına yapılan işler. Gelir
**hakediş** ile alınır, poz listesi işveren sözleşmesinden gelir." · kendi yatırım
"Arsa bize ait, işveren yok. Gelir **daire/dükkan satışından** gelir, kâr satış−maliyet
farkıdır." · kat karşılığı "Arsa sahibinin arsasına inşaat, karşılığında **ünite payı**
alırız. Arsa maliyeti yok, kendi payımızı satarız."

### 4.3 Sekme barı (satır 94-100)

| Öğe | Değer |
|---|---|
| Kapsayıcı | flex, `gap: 4px`, zemin `--color-surface`, `border: 1px solid var(--color-border)`, `radius: 10px`, `padding: 4px`, `width: fit-content`, `margin-bottom: 24px` |
| Sekme (pasif) | `padding: 7px 18px`, 13px/400, `--color-text-muted`, zemin transparent, `border: none`, `radius: 7px` |
| Sekme (aktif) | aynı kutu + 13px/**600**, `--color-primary`, zemin `--color-nav-active-bg` |

Sekmeler ve etiketleri: `Tümü ({counts.all})` · `Taahhüt ({counts.taahhut})` ·
`Kendi Yatırım ({counts.kendi_yatirim})` · `Kat Karşılığı ({counts.kat_karsiligi})` ·
`Tamamlanan ({counts.completed})`.

Sekme durumu URL'ye yazılır: `/projeler?tab=taahhut` (paylaşılabilir durum).
Geçersiz/boş `tab` → `all`. Eşleme: `all` → filtresiz, tip sekmeleri → `?type=...`,
`completed` → `?status=completed`. Sayaçlar aktif sekmeden bağımsız her yanıttan basılır.

### 4.4 Kart ızgarası ve kart kabuğu (satır 103-106, 166, 265)

Izgara: `grid-template-columns: repeat(3, 1fr)` · `gap: 20px`. Sütun sayısı sabittir.

Kart kabuğu (tüm varyantlar): `radius: 16px`, `overflow: hidden`, zemin
`--color-surface`, iç dolgu 20px, üstte tam genişlik **6px** renk şeridi.

| Varyant | Kenarlık | Gölge | Şerit |
|---|---|---|---|
| Taahhüt | `1px solid #e2e8f0` | `0 1px 4px rgba(0,0,0,0.06)` (`--shadow-card`) | `linear-gradient(90deg, #2563eb, #60a5fa)` |
| Kendi Yatırım | `2px solid #ddd6fe` | `0 2px 8px rgba(139,92,246,0.12)` | `linear-gradient(90deg, #6d28d9, #a78bfa)` |
| Kat Karşılığı | `2px solid #99f6e4` | `0 2px 8px rgba(15,118,110,0.12)` | `linear-gradient(90deg, #0f766e, #5eead4)` |
| Tamamlanmış (her tip) | `1px solid #e2e8f0` | `--shadow-card` | düz `#e2e8f0`, kart `opacity: 0.85` |

Mockup taahhüt kartlarına projeye göre değişen şeritler (yeşil/amber/mor) çizmiş;
bu, tip taksonomisi öncesi kalıntıdır ve §7.1'de normalize edilmiştir.

### 4.5 Kart başlık bloğu (satır 109-117)

| Sıra | Öğe | Değer |
|---|---|---|
| 1 | Başlık satırı | flex, `align-items: flex-start`, `justify-content: space-between`, `margin-bottom: 14px` |
| 2 | Tip rozeti | **9px**/700, beyaz, `padding: 2px 7px`, `radius: 7px`, `margin-bottom: 4px`; zemin: taahhüt `#2563eb`, kendi yatırım `#8b5cf6`, kat karşılığı `#0f766e` |
| 3 | Proje adı | 16px/700, `--color-text`, `margin-bottom: 4px` |
| 4 | Meta satırı | 12px, `--color-text-subtle` |
| 5 | Durum rozeti | 11px/600, `padding: 3px 10px`, `radius: 20px`, `white-space: nowrap` (renkler §6) |

Meta satırı tipe göre: taahhüt `{category} · {city} · İşveren: {employer_name}` ·
kendi yatırım `{category} · {city}` · kat karşılığı
`{category} · {city} · Arsa Sahibi: {land_share.landowner_name}`.

### 4.6 KPI ızgarası (satır 119-124, 179-184)

`grid-template-columns: 1fr 1fr` · `gap: 12px` · `margin-bottom: 16px`.
Hücre: etiket 11px `--color-text-subtle` `margin-bottom: 3px`; değer 14px/600 Mono
(kâr hücresi 700). Tarih hücreleri Mono değil: 13px `--color-text-secondary`.

Hücre içerikleri ve veri kaynağı (— = yer tutucu, §7.2):

| Varyant | 1 | 2 | 3 | 4 |
|---|---|---|---|---|
| Taahhüt (aktif/beklemede) | Sözleşme Bedeli = `contract_amount` | Harcanan = `spent` → — | Başlangıç = `start_date` | Bitiş = `end_date` |
| Taahhüt (tamamlanmış, satır 275-278) | Sözleşme Bedeli = `contract_amount` | Final Hakediş = — (`progress_payments`) | *(yok)* | *(yok)* |
| Kendi Yatırım | Satış Hedefi = `investment.sales_target` | Satılan = `sales` → — | Toplam Maliyet = `spent` → — | Tahmini Kâr = `profit` → — |
| Kat Karşılığı | Kendi Pay Değeri = `sales` → — | Arsa Maliyeti = `₺0` (tanımsal, §7.3) | İnşaat Maliyeti = `spent` → — | Tahmini Kâr = `profit` → — |

Mockup'taki değer renkleri: nötr `--color-text`; Satılan/Final Hakediş/₺0 yeşil
`#16a34a`; maliyet `#ef4444`; kâr tip vurgu rengi (`#8b5cf6` / `#0f766e`). Yer tutucu
hücrede renk uygulanmaz — değer `—`, `--color-text-subtle`.

### 4.7 Kat karşılığı pay çubuğu (satır 147-150)

| Öğe | Değer |
|---|---|
| Kapsayıcı | flex, `height: 32px`, `radius: 8px`, `overflow: hidden`, `margin-bottom: 14px` |
| Bizim pay | genişlik `{our_share_pct}%`, zemin `#0f766e`, beyaz 11px/700, ortalı — metin `Biz %{our_share_pct}` |
| Arsa payı | genişlik `{owner_share_pct}%`, zemin `#94a3b8`, beyaz 11px/700, ortalı — metin `Arsa %{owner_share_pct}` |

Mockup segment metinlerinde ünite sayıları da var ("· 23 ünite"); ünite verisi `units`
modülüne bağlı olduğundan v1'de basılmaz (§7.4).

### 4.8 İlerleme satırı (satır 125, 185)

| Öğe | Değer |
|---|---|
| Blok | `margin-bottom: 8px` |
| Etiket satırı | flex space-between, `margin-bottom: 4px`; sol 12px `--color-text-muted`, sağ yüzde 12px/600 tip vurgu renginde |
| Çubuk | `height: 6px`, zemin `#f1f5f9`, `radius: 3px`, `overflow: hidden` |
| Dolgu | `width: {progress_pct}%`, tip gradyanı (şeritle aynı), `radius: 3px` |
| Tamamlanmış | çubuk zemini `#dcfce7`, dolgu düz `#16a34a` (satır 279) |

Etiket: taahhüt ve kat karşılığı "Fiziksel İlerleme" / "İnşaat İlerlemesi" — mockup'ta
ikisi de geçiyor; tip başına mockup'taki metin korunur (taahhüt: "Fiziksel İlerleme",
kat karşılığı: "İnşaat İlerlemesi"). Kendi yatırımda mockup "Satış Oranı (34/52 ünite)"
diyor; satış/ünite verisi yokken bu etiket yalan olur — v1'de "İnşaat İlerlemesi" +
`progress_pct` basılır, `units` gelince satış oranına döner (§7.5). Yüzde değeri sağda
`formatPercent(progress_pct)`.

### 4.9 Alt çipler (satır 126-129, 186-189)

Mockup'taki alt çipler (işçi/taşeron, marj, daire+dükkan, hissedar) tamamı yazılmamış
modüllere bağlı yer tutuculardır (`headcount`, `subcontractor_count`, `profit`,
`units`). Çip yalnızca ilgili alan `available: true` iken basılır → v1'de hiç çip
görünmez. Mockup'un kendisi de Belediye Yol kartında (satır 243-262) çipsiz kart
gösteriyor; iskelet bozulmaz. Ölçüler (ileride kullanılmak üzere): satır flex
`gap: 8px` `margin-top: 14px`; çip flex `gap: 4px`, ikon 12px, metin 11px
`--color-text-muted`.

## 5. Renk → token eşlemesi

### 5.1 Mevcut token'lar (tokens.css'ten doğrulandı)

| Mockup hex | Token |
|---|---|
| `#2563eb` | `--color-primary` |
| `#1d4ed8` | `--color-primary-hover` |
| `#3b82f6` | `--color-primary-light` |
| `#eff6ff` | `--color-nav-active-bg` |
| `#bfdbfe` | `--color-primary-ring` |
| `#60a5fa` | `--color-avatar-blue-end` |
| `#8b5cf6` | `--color-accent-purple-grad-start` |
| `#a78bfa` | `--color-accent-purple-grad-end` |
| `#0f766e` | `--color-accent-teal-start` |
| `#14b8a6` | `--color-accent-teal-end` |
| `#dcfce7` | `--color-success-soft` |
| `#16a34a` | `--color-success` |
| `#fef3c7` | `--color-warning-soft` |
| `#d97706` | `--color-warning-strong` |
| `#f1f5f9` | `--color-neutral-soft` |
| `#64748b` | `--color-text-muted` |
| `#94a3b8` | `--color-text-subtle` |
| `#e2e8f0` | `--color-border` |
| `#ef4444` | `--color-danger` |
| `#475569` | `--color-text-secondary` |
| `#1e293b` | `--color-text` |
| `0 1px 4px rgba(0,0,0,0.06)` | `--shadow-card` |

### 5.2 Yeni token önerileri (tokens.css'e eklenir)

Mockup'ta olup token karşılığı **olmayan** değerler. Dikkat: mor soft ailesi mevcutta
`#ede9fe` (`--color-accent-purple-soft`) — mockup'taki `#ddd6fe`/`#f5f3ff` farklı
tonlar, yeniden kullanılamaz.

```css
/* P1 Projeler — tip aileleri (mockup Ekran 4) */
--color-accent-purple-deep: #6d28d9;   /* kendi yatırım gradyan koyu ucu + sayı metni */
--color-accent-purple-tint: #f5f3ff;   /* açıklama kartı zemini */
--color-accent-purple-line: #ddd6fe;   /* açıklama kartı + proje kartı kenarlığı */
--color-accent-teal-tint: #f0fdfa;     /* açıklama kartı zemini */
--color-accent-teal-line: #99f6e4;     /* açıklama kartı + proje kartı kenarlığı */
--color-accent-teal-light: #5eead4;    /* teal gradyan açık ucu */
--shadow-card-purple: 0 2px 8px rgba(139, 92, 246, 0.12);
--shadow-card-teal: 0 2px 8px rgba(15, 118, 110, 0.12);
--gradient-type-taahhut: linear-gradient(90deg, var(--color-primary), var(--color-avatar-blue-end));
--gradient-type-kendi-yatirim: linear-gradient(90deg, var(--color-accent-purple-deep), var(--color-accent-purple-grad-end));
--gradient-type-kat-karsiligi: linear-gradient(90deg, var(--color-accent-teal-start), var(--color-accent-teal-light));
```

## 6. Durum rozetleri (mockup satır 117, 227, 273)

| `status` | Zemin | Metin | Token |
|---|---|---|---|
| `active` — Aktif | `#dcfce7` | `#16a34a` | `--color-success-soft` / `--color-success` |
| `on_hold` — Beklemede | `#fef3c7` | `#d97706` | `--color-warning-soft` / `--color-warning-strong` |
| `completed` — Tamamlandı | `#f1f5f9` | `#64748b` | `--color-neutral-soft` / `--color-text-muted` |

F6 spec'i `Tamamlandı` rengini zaten bu mockup'ın 273. satırından almıştı; buradaki
kanonla aynıdır.

## 7. Dürüstlük: boş durumlar ve bilinçli normalizasyonlar

### 7.1 Şerit/çubuk rengi tipten gelir

Mockup taahhüt kartlarına kart başına farklı şerit ve çubuk rengi (yeşil, amber, mor)
vermiş; tip açıklama kartlarının kurduğu renk dili (mavi=taahhüt, mor=kendi yatırım,
teal=kat karşılığı) ile çelişir ve veri karşılığı yoktur. Karar: şerit + çubuk dolgusu
**daima tip gradyanı**; tek istisna tamamlanmış kart (§4.4, §4.8). Durum yalnızca
rozetle anlatılır.

### 7.2 Yer tutucu KPI hücreleri

`available: false` dönen alan (Harcanan, Satılan, Toplam/İnşaat Maliyet, Tahmini Kâr,
Final Hakediş, Kendi Pay Değeri) hücresinde etiket mockup'taki gibi kalır, değer yerine
`—` basılır (`--color-text-subtle`), hücre `title` niteliği `pending_module`
eşlemesinden gelir. F6'daki iki satırlık `CardEmptyState` bloğu 14px'lik KPI hücresine
sığmaz; bu ekranda F6 deseninin hücre-ölçekli karşılığı budur. Eşleme F6'daki
`CardEmptyState` içindeki tablodan `src/lib/pending-modules.ts`e taşınır ve iki ekran
aynı kaynağı kullanır (dallanma daima `available` alanına bakar, sabite değil):

| `pending_module` | Metin |
|---|---|
| `progress_payments` | Hakediş modülüyle birlikte gelir |
| `invoicing` | Fatura yönetimiyle birlikte gelir |
| `approvals` | Onay kutusuyla birlikte gelir |
| `inventory` | Stok ve saha modülleriyle birlikte gelir |
| `timesheet` | Puantaj modülüyle birlikte gelir |
| `subcontracts` | Taşeron sözleşmeleriyle birlikte gelir |
| `units` | Ünite satış modülüyle birlikte gelir |
| `project_costs` | Maliyet takibiyle birlikte gelir |
| *(bilinmeyen)* | İlgili modülle birlikte gelir |

İlk dördü F6'dan taşınır, son dördü P1 ile eklenir.

### 7.3 Kat karşılığı `₺0`

"Arsa Maliyeti ₺0" sahte rakam değildir: kat karşılığı tipinin tanımsal gerçeğidir
(açıklama kartındaki "Arsa maliyeti yok" cümlesinin sayısal hali) ve mockup'ta yeşil
vurgulanır. Sabit basılır, yer tutucu değildir.

### 7.4 Ünite/hissedar sayıları basılmaz

Pay çubuğundaki "· 23 ünite", alt çiplerdeki "48 daire + 4 dükkan", "3 hissedar",
"%38,2 marj", satış oranındaki "(34/52 ünite)" — tamamı `units`/`land_share` detayı ve
`profit` modüllerine bağlı. v1'de hiçbiri basılmaz; sözleşmede karşılığı olan yüzdeler
(`our_share_pct`, `owner_share_pct`, `progress_pct`) gerçek değerle basılır.

### 7.5 Kendi yatırım çubuk etiketi

Mockup'taki "Satış Oranı" çubuğu satış verisi ister; v1'de çubuk `progress_pct`
(inşaat ilerlemesi) bastığından etiket "İnşaat İlerlemesi" olur. Etiketi koruyup başka
sayı basmak "hangi sayı gerçek" kuralını çiğnerdi. `units` modülüyle satış oranına döner.

### 7.6 Kırmızı bitiş tarihi basılmaz

Mockup Liman Altyapı kartında bitiş tarihi kırmızı (`#ef4444`) — gecikme riski
göstergesi. Risk hesabı v1'de yok; tüm tarihler `--color-text-secondary` basılır.
Risk modülüyle gelir.

### 7.7 Tip rozeti tüm kartlarda

Mockup yalnızca ilk üç kartta tip rozeti gösteriyor (sonraki taahhüt kartlarında
unutulmuş). `project_type` her item'da gerçek veri olduğundan rozet tüm kartlarda
basılır — açıklama kartlarının kurduğu dili tamamlar.

### 7.8 Para biçimi

Mockup iki yazım karışık kullanıyor: `₺48,2M` (boşluksuz) ve `₺ 11,2M` (boşluklu).
F5/F6'da yerleşen `formatCompactCurrency` ("₺ 8,4M") tüm kartlarda kullanılır; ayrı
biçimleyici yazılmaz.

### 7.9 Boş liste durumu

Mockup'ta tanımsız. Izgara yerine tam genişlik tek kart (F6 sıfır-proje deseni):
- `tab === "all"` ve `items` boş → "Henüz proje tanımlanmadı" / "+ Yeni Proje ile başlayın"
- filtreli sekmede boş → "Bu sekmede proje yok" / "Başka bir sekme seçin"

## 8. "+ Yeni Proje" oluşturma yüzeyi — MOCKUP'SIZ

**Bu ekranın mockup'ında form/modal yok (yalnızca buton). Bu, projenin mockup'sız tek
yüzeyidir; Ayarlar form kanonu izlenir** — `src/components/settings/` desenleri:
`Modal` bileşeni (başlık + `footer`'da Vazgeç/Kaydet `Button`'ları), `settings-form` /
`settings-field` alan düzeni, alan-üstü doğrulama, hata `settings-note--error`,
mutation `isPending` iken butonlar disabled (`UserFormModal.tsx` birebir referans).

Alanlar:

| Alan | Bileşen | Koşul | Doğrulama |
|---|---|---|---|
| Kod | `Input` | daima | zorunlu |
| Ad | `Input` | daima | zorunlu |
| Tip | `Select` (Taahhüt / Kendi Yatırım / Kat Karşılığı) | daima | zorunlu |
| Kategori | `Input` | daima | — |
| Şehir | `Input` | daima | — |
| İşveren | `Input` | tip = taahhüt | zorunlu |
| Sözleşme No | `Input` | tip = taahhüt | — |
| Sözleşme Bedeli | `Input` | tip = taahhüt | sayı |
| Satış Hedefi | `Input` | tip = kendi yatırım | sayı, zorunlu |
| Arsa Maliyeti | `Input` | tip = kendi yatırım | sayı |
| Arsa Sahibi | `Input` | tip = kat karşılığı | zorunlu |
| Bizim Pay (%) | `Input` | tip = kat karşılığı | 0-100 |
| Arsa Sahibi Payı (%) | `Input` | tip = kat karşılığı | 0-100, ikisinin toplamı 100 |

Tip değişince yalnızca ilgili koşullu alanlar görünür (UserFormModal'daki
`mode === "create"` dalı deseni). Gönderim: `POST /projects`, tip-özel alanlar
`investment` / `land_share` nesnelerinde. Başarıda modal kapanır, `projects` sorgusu
invalidate edilir. Tarih/bütçe gibi kalan alanlar P2 düzenleme yüzeyine bırakılır —
minimal oluşturma yüzeyi budur.

## 9. Gezinme kararları (ONAYLANMIŞ)

- **Taahhüt kartı P2 gelene kadar tıklanmaz** — mockup'ta da taahhüt kartlarında
  `href` yok (`div`), yalnızca `cursor: pointer` süsü var. Kart `article` olarak
  basılır, link/onClick verilmez.
- **Kendi yatırım / kat karşılığı kartlarının hedef ekranları P9/P10'da** gelir
  (mockup'taki `Proje - Kendi Yatırım.dc.html` / `Proje - Kat Karşılığı.dc.html`
  bağları); o zamana kadar onlar da tıklanmaz. Sahte hedef (`#`, ComingSoon linki vb.)
  verilmez.
- `cursor: pointer` tıklanmayan karta uygulanmaz — süs davranış vaat etmesin.

## 10. Sayı ve tarih biçimi

`src/lib/format.ts` mevcut fonksiyonları yeniden kullanılır: `formatCompactCurrency`
(KPI tutarları), `formatPercent` (ilerleme + pay yüzdeleri). Eklenen:

| Fonksiyon | Girdi → Çıktı |
|---|---|
| `formatMonthYear` | `"2025-03-15"` → `Mar 2025` (`Intl.DateTimeFormat("tr-TR", { month: "short", year: "numeric" })`) |

Mockup'taki "Mar 2025 / Ara 2026 / Oca 2025 / Haz 2026 / Ağu 2026" örnekleri tr-TR
kısa ay adlarıyla birebir örtüşür.

## 11. Testler

| Katman | Kapsam |
|---|---|
| Birim | `ProjectCard` üç tip varyantı + tamamlanmış görünüm (KPI etiketleri, yer tutucu `—`, rozetler, tıklanmazlık) · `ShareBar` yüzdeler · `ProjectTabs` sayaçlar + aktif sekme · `tabs.ts` parse/filtre eşlemesi · boş liste iki dalı · `ProjectFormModal` tip-koşullu alanlar + pay toplamı doğrulaması · `pendingModuleLabel` eşlemeleri · `formatMonthYear` |
| Görsel regresyon | `/projeler` @ 1440px, oturumlu. Baseline'lar **YALNIZ Linux CI** (`visual-baselines.yml` workflow_dispatch → `linux-baselines` artifact → `e2e/` altına kopya). macOS'ta PNG üretilmez. |
| E2E | Giriş → sidebar "Projeler" → `/projeler` → başlık + en az bir kart görünür → sekme geçişi (`?tab=` değişir, liste filtrelenir, sayaçlar sabit kalır) → "+ Yeni Proje" modalı açılır |

Ana spec kuralı gereği responsive hedef yok; tek kırılım 1440px.

## 12. Kapsam dışı

- Proje detay ekranları (P2 taahhüt, P9 kendi yatırım, P10 kat karşılığı) — kartlar
  tıklanmaz (§9).
- Şantiye ekranları.
- Gösterge panelinde tip rozeti gösterimi — F6 kartları değişmez.
- `PATCH /projects/{id}` düzenleme yüzeyi.
- Topbar proje seçici, Onay Kutusu rozeti vb. F6 §9'daki kalemler — aynen kapsam dışı.
