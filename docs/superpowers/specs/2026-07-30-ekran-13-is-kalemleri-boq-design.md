# Ekran 13 · İş Kalemleri (BOQ) — frontend tasarım

Tarih: 2026-07-30 · **Revizyon 2 (2026-07-30): kullanıcı kararları işlendi**

> **Revizyon 2 özeti:** önceki taslaktaki 10 açık sorunun tamamı karara bağlandı
> (§12), "Onaylı sapmalar" bölümü eklendi (§13), task listesi spec'e taşındı ve
> iki yeni task doğdu (§14: F12 izin altyapısı, F13 silme — **bloklu**).
> Değişen bölümler: §1.1/1.2, §2.1, §2.2, §2.3, §2.4, **§2.5 (yeni)**, §4, §5.4,
> §6.1, §6.3, **§7 (tümü yeniden yazıldı, §7.5 yeni)**, **§8.1 (yeniden yazıldı)**,
> **§9.2 (yeni)**, §10, §11.1, §11.2, **§12 (yeniden yazıldı)**, **§13–§14 (yeni)**.
Repo: `frontend/` (Next.js 15, App Router)
Mockup kanonu: `projedesign/Ekran 13 - İş Kalemleri.dc.html` (186 satır; içerik alanı **satır 61–182**)
Backend sözleşmesi: `backend/docs/superpowers/specs/2026-07-29-alt-proje-2-p4-is-kalemleri-boq-design.md` (§5.1 uçlar/şemalar)
Görev listesi: `GOREV-SIRASI.md` §1 (F0–F11), §3 (sabit kurallar), §4 (kalıcı kararlar)
Önceki dilim kanonları: `2026-07-27-frontend-p2-santiye-bolum-design.md` (drill kabuğu, hero, tablo/kart deseni),
`2026-07-29-p1-1a-proje-formu-design.md` (form/primitive/token deseni)
Üretilmiş tipler: `frontend/src/lib/api/schema.d.ts` — `chore/p4-boq-frontend-sync` dalında (commit `7a2e736`), PR #5 açık

> **Dal notu (F1 kapısı için):** `git log --all` ile doğrulandı — `BoqListResponse`,
> `BoqTotals`, `BoqGroupCreate/Update`, `BoqItemCreate/Update`, `BoqGroupResponse`,
> `BoqItemResponse` **üretilmiş** ve `src/lib/api/schema.d.ts` içinde (satır 695–825).
> `boq` kökü `ALLOWED_ROOTS`'a eklenmiş (`2f7e4fe`), e2e mock 17 modüle çıkmış (`736eca1`).
> Bu spec'in uygulaması **PR #5 merge edildikten sonra** başlar; F1 no-op kapısıdır.

---

## 1. Kapsam ve kapsam dışı

### 1.1 Kapsam

Şantiye bağlamı altında tek ekran: **İş Kalemleri (BOQ)** listesi.

1. Rota kabuğu + başlık + breadcrumb + iki eylem butonu (mockup 61–69)
2. Dört özet kartı (72–89) — **dördü de yer tutucu** (§4)
3. Poz tablosu: 7 sütunlu başlık (95–103), grup başlık satırları (107–108, 129–130, 151–152),
   poz satırları (110–171), GENEL TOPLAM satırı (174–178)
4. Yazma akışları — **tamamı tek modal** (§7, *kullanıcı kararı*): "+ İş Kalemi" (67) yeni
   kayıt kipini, **poz satırına tıklama** düzenleme kipini açar; grup oluşturma aynı modalin
   içindedir; modalde **Sil** eylemi vardır (backend DELETE ucuna **bağımlı**, §7.5)
5. "Excel İndir" (66) — ikili indirme + BFF `Content-Type` düzeltmesi (§8)
6. Boş / yükleniyor / hata / yetkisiz durumları (§9)
7. İstemci tarafı **modül izin okuma altyapısı** (`useModulePermission`) — salt-okunur
   rollerde yazma butonlarını gizler (§2.5, *kullanıcı kararı*)

### 1.2 Kapsam dışı

| Konu | Gerekçe |
|---|---|
| Sözleşme bağı (`contract_id`), bölüm bağı (`section_id`) | GOREV-SIRASI §4.1 kalıcı karar: hiçbir ileri bağ açılmaz |
| Gerçekleşme yüzdesi gerçek verisi | Backend `progress_pct` = yer tutucu (`progress_payments`, P7) |
| `Gerç. %` renk eşikleri | **P7'ye bırakıldı** (2026-07-30 kararı); bu dilimde nötr basılır, eşik kodlanmaz (§5.4) |
| Grup silme / sürükle-bırak sıralama | Mockup'ta hiçbir affordance yok |
| Mobil / <1280 düzen | GOREV-SIRASI §4.5 |
| İzin matrisi ekranına `boq` satırı | X2/X2b işi, bu dilim değil |
| Sözleşmeler modülü sidebar rotası (`/sozlesmeler`) | Mockup sol menüde "Sözleşmeler" aktif görünür; o modül P5, bu dilimde yazılmaz |

---

## 2. Rota, navigasyon, breadcrumb, erişim

### 2.1 Rota

```
src/app/(app)/projeler/[projectId]/santiyeler/[siteId]/is-kalemleri/page.tsx
```

Gerekçe: BOQ **şantiyeye** bağlıdır (backend spec §2.1 + §8 karar 1: `site_id`
kalır, `contract_id` açılmaz). Uç `GET /sites/{site_id}/boq` — ekranın tek zorunlu
parametresi `siteId`. `projectId` yalnız drill kabuğunun (P2 §3) ebeveyn segmenti
olduğu için yolda vardır; sorguya girmez.

Rota `[projectId]/layout.tsx` altında olduğundan **DrillSidebar otomatik gelir**
(P2 kod inceleme notu: kabuğun sahibi tek seviyedir, bu rota kendi layout'unu
kurmaz). İçerik ofseti/padding `.drill-content` (`drill-sidebar.css:21–25`,
`padding: 24px 32px`) tarafından verilir — mockup satır 61'deki `padding:28px 32px`
ile **dikeyde 4px sapar**.

> **Karar (2026-07-30):** 4px sapma **kabul edilir**, `.drill-content` 28px'e çekilmez
> ve ekran başına ezilmez. Gerekçe: bu ofset P2'de kabuk düzeyinde sabitlendi;
> değiştirmek Proje Detay + Şantiye Detay + BOQ baseline'larının üçünü birden kaydırır.
> Onaylı sapma olarak §13'te kayıtlıdır.

### 2.2 Navigasyon (iki dokunuş) — **karara bağlandı (2026-07-30)**

Giriş noktası **hem** Şantiye Detay sekme barı **hem** drill sidebar'dır. Şantiye Detay
mockup'ında "İş Kalemleri" sekmesi yoktur → **onaylı sapma** (§13), kullanıcı kararı.

| Dosya | Değişiklik | Gerekçe |
|---|---|---|
| `src/components/site-detail/SiteDetailTabs.tsx` | `TABS` dizisine `{ label: "İş Kalemleri", slug: "is-kalemleri" }` — **Bölümler'den hemen sonra**, 7. sekme | Şantiye sekmeleri kanonu (P2 §5.3); yazılmış tek ikinci rota |
| `src/components/shell/drill/project-nav-config.ts` | `activeSiteGroup` içine `{ label: "İş Kalemleri", href: `${base}/is-kalemleri`, emoji: "📐" }` — Bölümler'den sonra | Drill sidebar ile sekme barı aynı 6 öğeyi taşıyor (P2 §3.3); ayrışmamalı |

> ⚠️ **Görsel baseline etkisi — kesin:** iki dosya da Şantiye Detay ekranında render
> edilir → `e2e/site-detail-visual.spec.ts-snapshots/santiye-detay-chromium-linux.png`
> **kayacaktır**. Bu kaçınılmazdır ve kullanıcı tarafından kabul edilmiştir.
> Baseline turu planı (F11): **tek Linux CI turunda üç baseline** —
> (1) yeni `is-kalemleri`, (2) yenilenen `santiye-detay`, (3) X2/X2b nedeniyle kayan
> `ayarlar-izin-matrisi`. Ayrı turlar açılmaz.

### 2.3 Breadcrumb — **onaylı sapma** (karara bağlandı 2026-07-30)

Mockup satır 62:

```html
<div style="font-size:12px;color:#94a3b8;margin-bottom:6px;cursor:pointer;">
  <span style="color:#2563eb;">← Sözleşmeler</span> · Güneşkent A-Blok / SZL-2025-001
</div>
```

Yani mockup BOQ'yu bir **sözleşmeye** bağlar (`SZL-2025-001`). `contracts` modülü
yok (P5) ve GOREV-SIRASI §4.1 ileri bağ açılmasını yasaklıyor. Sapma **onaylandı**;
sözleşme parçası için görünür yer tutucu da **basılmaz** (uydurma bağ izlenimi yaratır):

| Mockup parçası | Uygulanacak | Gerekçe |
|---|---|---|
| `← Sözleşmeler` (mavi link) | `← {şantiye adı}` → `/projeler/{projectId}/santiyeler/{siteId}` | Gerçek ebeveyn şantiyedir; "bir seviye yukarı" kuralı (P2 §3.1) |
| `Güneşkent A-Blok` | `{proje adı} / {şantiye adı}` — `useSite(siteId)` yanıtından (`site.project.name`, `site.name`) | Bağlam kaybolmasın |
| `/ SZL-2025-001` | **basılmaz** | Sözleşme numarası bu dilimde yok; uydurulmaz |

Ölçüler mockup'tan birebir korunur (12px, `--color-text-subtle`, `margin-bottom:6px`,
link rengi `--color-primary`).

### 2.4 Erişim izni

- Modül anahtarı **`boq`** (GOREV-SIRASI §4.2 / backend spec §4): okuma `boq:view`,
  yazma `boq:full`. `site_chief` görür, `field_engineer` görmez, `procurement`
  `_LIM` (yalnız okuma), `hr_manager` görmez.
- **Güvenlik sınırı değişmedi:** yetki zorlaması **her zaman backend'dedir**. 403
  `isForbidden(error)` ile yakalanır, `<AccessDenied />` basılır
  (`src/components/settings/AccessDenied.tsx`, Şantiye Detay page.tsx deseni).
  §2.5'teki istemci kapısı **yalnız görsel gürültüyü azaltır**, yetki kontrolü değildir.
- Görünmeyen şantiye → backend 404 → "Bu şantiyenin iş kalemleri yüklenemedi" (§9).
- Sekme/nav öğesi **herkese görünür kalır**; izni olmayan tıklarsa AccessDenied
  görür. Bu, yazılmamış rotaların da görünür kaldığı P2 deseniyle tutarlıdır.

### 2.5 İstemci tarafı izin okuma altyapısı — **kullanıcı kararı (2026-07-30)**

**Karar:** salt-okunur roller (`procurement` → `boq` = `_LIM` = `view`) için **yazma
butonları gizlenir**: "+ İş Kalemi" basılmaz, poz satırı tıklanabilir olmaz (düzenleme
modalı açılmaz), modaldeki "Sil" görünmez. "Excel İndir" **görünür kalır** (okuma ucu,
`boq:view` yeter). Mockup'ta bu davranışın karşılığı yoktur → *kullanıcı kararı*
etiketiyle §13'te kayıtlı.

**Bugün repoda böyle bir altyapı yok** (grep: `src/lib` altında izin okuyan hiçbir
yardımcı yok). Bu dilimde açılır ve sonraki tüm ekranlar aynı hook'u kullanır.

#### 2.5.1 Kaynak — 🔴 doğrulanmış bağımlılık

| Aday kaynak | Durum |
|---|---|
| `MeResponse` (`/api/auth/me`, `SessionProvider`) | `id, email, full_name, title, role_key, status` — **izin alanı YOK** (`backend/app/modules/auth/schemas.py:23–29` ile doğrulandı) |
| `GET /roles/{role_id}/permissions` | `require_permission("user_management", view)` (`backend/app/modules/roles/router.py:54–57`) → **`procurement` kendi izinlerini okuyamaz, 403 alır**. Kullanılamaz |
| İstemcide sabit rol→seviye haritası | **Yasak.** Matris çalışma anında Ayarlar › İzin Matrisi ekranından değiştirilebiliyor; sabit harita ilk düzenlemede yalan söyler |

**Sonuç:** doğru kaynak `/auth/me` yanıtına eklenecek bir izin haritasıdır →
**backend takip işi** (aşağıda "BE-A"). Bu, ekranı **bloklamaz**, çünkü altyapı
alan yokken bugünkü davranışa (buton görünür + 403) düşecek şekilde tasarlanır.

**BE-A (P3 dışı backend takip işi):** `MeResponse`'a
`permissions: dict[str, AccessLevel]` (modül anahtarı → etkin seviye) eklenir;
`/auth/me` kendi kullanıcısının izinlerini döndürür, ek izin gerektirmez.
Sonrasında frontend'de yalnız `openapi` senkronu gerekir, hook değişmez.

#### 2.5.2 İmza ve konum

```ts
// src/lib/auth/permissions.ts
import type { components } from "@/lib/api/schema";
export type AccessLevel = components["schemas"]["AccessLevel"];
// "none" | "view" | "draft" | "request" | "approve" | "full" | "admin"

/** Yazma yetkisi sayılan seviyeler (backend AccessLevel sıralamasıyla birebir). */
export const WRITE_LEVELS: readonly AccessLevel[];   // draft, request, approve, full, admin

/** Seviye bilinmiyorsa `true` döner — bilinmezlik yasak sayılmaz (§2.5.3). */
export function canWrite(level: AccessLevel | undefined): boolean;
```

```ts
// src/lib/auth/useModulePermission.ts   ("use client")
export interface ModulePermission {
  /** Seviye bilinmiyorsa undefined (oturum yükleniyor ya da alan yok). */
  level: AccessLevel | undefined;
  canView: boolean;   // level === undefined → true
  canWrite: boolean;  // level === undefined → true
}

/** Oturum yükünden tek modülün izin seviyesini okur. Ağ isteği YAPMAZ. */
export function useModulePermission(moduleKey: string): ModulePermission;
```

- Kaynak: `useSession()` (`src/components/shell/SessionProvider.tsx`) — **yeni fetch yok**,
  yeni context yok, `SessionProvider` zaten `(app)` kabuğunun tamamını sarıyor.
- `me?.permissions?.[moduleKey]` okunur; alan yoksa `undefined`.
- Bileşene geçiş: `const { canWrite } = useModulePermission("boq")` → `{canWrite && <Button …/>}`.
- Modül anahtarı **string parametredir**, koda gömülü modül listesi tutulmaz;
  sonraki ekranlar `useModulePermission("contracts")`, `("progress_payments")` … der.

#### 2.5.3 Bilinmezlik kuralı (kritik)

`level === undefined` → **butonlar görünür** (bugünkü davranış). Gerekçe: alan
gelmeden butonları gizlemek, tam yetkili kullanıcıya ekranı **salt-okunur** gösterir —
sessiz yetenek kaybı olur. Gizleme yalnız `level` **bilinip** yazma seviyesinin altında
kaldığında yapılır. Böylece BE-A canlıya çıktığı an gizleme kendiliğinden devreye girer,
frontend'de ikinci bir sürüm gerekmez.

#### 2.5.4 Yeniden kullanım sözü

Bu iki dosya (`permissions.ts` + `useModulePermission.ts`) **ekran-bağımsızdır**;
BOQ'ya özel hiçbir şey içermez. Sonraki dilimlerde (Sözleşmeler, Hakedişler, Stok…)
aynı hook `moduleKey` değiştirilerek kullanılır; ekran başına izin yardımcısı yazmak yasaktır.

---

## 3. Mockup ölçü tablosu

> Kural: bu tabloda olmayan hiçbir ölçü koda girmez. "yeni token" işaretli satırlar
> `src/styles/tokens.css`'e eklenir (§3.5).

### 3.1 Sayfa başlığı bloğu (satır 61–69)

| Satır | Element | Ölçü / değer | Karşılık |
|---|---|---|---|
| 61 | içerik kabı | `padding:28px 32px`, `animation:fadeUp .4s ease` | `.drill-content` (24px 32px + `--anim-fade-up`) — §2.1 sapma notu |
| 62 | breadcrumb | `font-size:12px` · `color:#94a3b8` · `margin-bottom:6px` | `--text-xs`(12px) · `--color-text-subtle` · yeni `--space-boq-crumb-gap: 6px` |
| 62 | breadcrumb linki | `color:#2563eb` | `--color-primary` |
| 63 | başlık şeridi | `display:flex; align-items:center; justify-content:space-between; margin-bottom:24px` | flex + `--space-6` (24px) |
| 64 | `<h1>` | `26px / 700` · `color:#1e293b` · `letter-spacing:-0.5px` · metin **"İş Kalemleri (BOQ)"** | `--text-page-title`(26px) · `--weight-bold` · `--color-text` · `--tracking-tight` |
| 65 | buton grubu | `display:flex; gap:10px` | yeni `--space-boq-action-gap: 10px` |
| 66 | **Excel İndir** | `bg:#fff` · `color:#475569` · `border:1px solid #e2e8f0` · `padding:9px 16px` · `radius:8px` · `13px` (ağırlık verilmemiş → normal) | `<Button variant="secondary">` + `.boq-action` ezme: `--color-surface` / `--color-text-secondary` / `--color-border` / `--radius-8` / `--text-body`. **Not:** `btn--secondary` kenarlığı `--color-border-strong` (#cbd5e1); mockup `#e2e8f0` → ekran sınıfı ile `--color-border`'a çekilir |
| 67 | **+ İş Kalemi** | `bg:#2563eb` · `color:#fff` · `border:none` · `padding:9px 18px` · `radius:8px` · `13px / 600` | `<Button variant="primary">` + `.boq-action--primary` (`padding:9px 18px`, `--weight-semibold`) |

`btn--md` padding'i `8px 16px`; mockup `9px 16px` / `9px 18px`. İki buton da ekran
sınıfıyla dikeyde `--space-form-y` (9px, mevcut token) ve yatayda yeni
`--space-boq-btn-x: 18px` alır. Metinler birebir: "Excel İndir", "+ İş Kalemi".

### 3.2 Özet kartı şeridi (satır 72–89)

| Satır | Element | Ölçü / değer | Karşılık |
|---|---|---|---|
| 72 | ızgara | `grid-template-columns:repeat(4,1fr)` · `gap:12px` · `margin-bottom:20px` | `--space-3`(12px) · yeni `--space-boq-strip-gap: 20px` |
| 73, 77, 81, 85 | kart | `bg:#fff` · `radius:12px` · `padding:16px` · `border:1px solid #e2e8f0` | `--color-surface` · `--radius-lg` · `--space-4` · `--color-border`. **`ui/card/Card` kullanılmaz** — Card `radius-14` + `shadow-card` + `card-body padding 24px` taşır, mockup 12px/gölgesiz/16px. `.boq-kpi` ekran sınıfı yazılır (P2 `SiteTotalsStrip` deseni) |
| 74, 78, 82, 86 | etiket | `11px` · `color:#94a3b8` · `margin-bottom:5px` · `uppercase` · `letter-spacing:0.8px` | `--text-small` · `--color-text-subtle` · yeni `--space-boq-kpi-label-gap: 5px` · `--tracking-wide` |
| 75 | değer 1 | `20px / 700` · `color:#1e293b` · JetBrains Mono | yeni `--text-kpi-value: 20px` · `--weight-bold` · `--color-text` · `--font-mono` |
| 79 | değer 2 | aynı ölçü · `color:#2563eb` | `--color-primary` |
| 83 | değer 3 | aynı ölçü · `color:#f59e0b` | `--color-warning` |
| 87 | değer 4 | aynı ölçü · `color:#8b5cf6` | `--color-accent-purple-grad-start` (#8b5cf6, mevcut) |

Etiket metinleri birebir: `Toplam Sözleşme` (74) · `Gerçekleşen` (78) · `Kalan İş` (82) ·
`Revize / Ek İş` (86).

### 3.3 Poz tablosu (satır 92–178)

| Satır | Element | Ölçü / değer | Karşılık |
|---|---|---|---|
| 92 | tablo kabı | `bg:#fff` · `radius:14px` · `border:1px solid #e2e8f0` · `overflow:hidden` · `box-shadow:0 1px 4px rgba(0,0,0,.06)` | `--color-surface` · `--radius-14` · `--color-border` · `--shadow-card` (birebir aynı değer) |
| 93 | `<table>` | `width:100%` · `border-collapse:collapse` | — |
| 95 | `<thead><tr>` | `bg:#f8fafc` · `border-bottom:1px solid #e2e8f0` | `--color-surface-2` · `--color-border` |
| 96 | th "Poz No" | `padding:11px 16px` · sola · `11/600` · `#64748b` · uppercase · `ls .8` · **`width:80px`** | yeni `--space-boq-cell-y: 11px`, `--space-boq-cell-x: 16px` · `--text-table-head` · `--weight-semibold` · `--color-text-muted` · `--tracking-wide` |
| 97 | th "İş Kalemi Tarifi" | `padding:11px 16px` · sola · genişlik **yok** (esner) | aynı |
| 98 | th "Birim" | `padding:11px 12px` · **ortala** · `width:60px` | `--space-3` (12px) yatay |
| 99 | th "Miktar" | `padding:11px 12px` · **sağa** · `width:80px` | aynı |
| 100 | th "Birim Fiyat" | `padding:11px 12px` · sağa · `width:110px` | aynı |
| 101 | th "Tutar" | `padding:11px 12px` · sağa · `width:120px` | aynı |
| 102 | th "Gerç. %" | `padding:11px 12px` · ortala · `width:80px` | aynı |
| 107, 129, 151 | grup satırı `<tr>` | `bg:#eff6ff` · `border-bottom:1px solid #e2e8f0` | `--color-nav-active-bg` · `--color-border` |
| 108, 130, 152 | grup hücresi | `colspan="7"` · `padding:9px 16px` · `12/700` · `#2563eb` · uppercase · `ls .5` | `--space-form-y`(9px)/`--space-boq-cell-x` · yeni `--text-boq-group: 12px` · `--weight-bold` · `--color-primary` · yeni `--tracking-group: 0.5px` |
| 110, 119, 132, 141, 154 | poz satırı | `border-bottom:1px solid #f1f5f9` | `--color-divider` |
| 163 | **son poz satırı** | `border-bottom` **YOK** | `tbody tr:last-child td { border-bottom: none }` |
| 111 | Poz No hücresi | `padding:11px 16px` · `12px` · `#64748b` · Mono | `--text-xs` · `--color-text-muted` · `--font-mono` |
| 112 | Tarif hücresi | `padding:11px 16px` · `13px` · `#1e293b` (ağırlık yok) | `--text-body` · `--color-text` |
| 113 | Birim hücresi | `padding:11px 12px` · ortala · `13px` · `#64748b` | `--text-body` · `--color-text-muted` |
| 114 | Miktar hücresi | `padding:11px 12px` · sağa · `13px` · `#1e293b` · Mono · örnek `1.240` | `--text-body` · `--color-text` · `--font-mono` |
| 115 | Birim Fiyat hücresi | aynı · örnek `280`, `18.500` (147) | aynı |
| 116 | Tutar hücresi | aynı **+ `font-weight:600`** · örnek `347.200` | `--weight-semibold` |
| 117 | Gerç. % hücresi | `padding:11px 12px` · ortala; içinde rozet `<div>` | §5.4 |
| 117 rozet | | `bg:#dcfce7` · `color:#16a34a` · `11/700` · `padding:2px 8px` · `radius:10px` · `inline-block` | `--color-success-soft` / `--color-success` / `--text-small` / `--radius-10` |
| 139, 148 rozet | | `bg:#dbeafe` · `color:#2563eb` | `--color-primary-soft` / `--color-primary` |
| 161 rozet | | `bg:#fef3c7` · `color:#d97706` | `--color-warning-soft` / `--color-warning-strong` |
| 170 rozet | | `bg:#fee2e2` · `color:#dc2626` | `--color-danger-soft` / `--color-danger-strong` |
| 174 | `<tfoot><tr>` | `bg:#f0f9ff` · `border-top:2px solid #e2e8f0` | **yeni** `--color-info-tint: #f0f9ff` · `--color-border` + yeni `--border-width-total: 2px` |
| 175 | "GENEL TOPLAM" | `colspan="5"` · `padding:13px 16px` · `13/700` · `#1e293b` | yeni `--space-boq-total-y: 13px` · `--text-body` · `--weight-bold` · `--color-text` |
| 176 | toplam tutar | `padding:13px 12px` · sağa · `15/700` · `#1e293b` · Mono · `12.399.900` | yeni `--text-total-amount: 15px` |
| 177 | toplam % | `padding:13px 12px` · ortala · `13/700` · `#2563eb` · `%75` (rozet DEĞİL, düz metin) | `--text-body` · `--weight-bold` · `--color-primary` |

### 3.4 Sayı biçimlendirme (mockup'tan türetilen kurallar)

| Mockup değeri | Satır | Kural |
|---|---|---|
| `1.240`, `860`, `3.200`, `180`, `4.800`, `9.200` | 114, 123, 136, 145, 158, 167 | Miktar: `tr-TR` binlik ayraç, **ondalık gösterilmez çünkü örneklerin tamamı tam sayı**. Backend `numeric(14,3)` gönderdiği için kural: **en fazla 3 ondalık, sondaki sıfırlar atılır** (`1240.000` → `1.240`, `1240.500` → `1.240,5`) |
| `280`, `145`, `1.850`, `18.500` | 115, 124, 137, 146 | Birim fiyat: binlik ayraç, **en fazla 2 ondalık, sondaki sıfırlar atılır** (`280.00` → `280`) |
| `347.200`, `5.920.000` | 116, 138 | Tutar: birim fiyatla aynı kural |
| `12.399.900` | 176 | Genel toplam: aynı kural |
| `₺ 11,2M`, `₺ 340K` | 75, 87 | Kart değeri: mevcut `formatCompactCurrency` — **ama bu dilimde hiç çağrılmaz** (dördü de yer tutucu, §4) |

**Tabloda `₺` sembolü YOKTUR** (114–116, 176 — hiçbirinde yok). Mevcut
`formatCurrency` `₺` basıyor → **kullanılamaz**. `src/lib/format.ts`'e eklenecek:

```ts
/** Tablo sayıları — ₺ YOK, tr-TR binlik ayraç, sondaki sıfırlar atılır. */
export function formatDecimal(value: string | number, maxFractionDigits: number): string
export const formatQuantity = (v) => formatDecimal(v, 3);   // mockup 114
export const formatAmount   = (v) => formatDecimal(v, 2);   // mockup 115, 116, 176
```

Backend değerleri **string Decimal** olarak gelir (`quantity: "1240.000"`);
görüntüleme için `Number()`'a çevrilir. Bu ekrandaki büyüklükler `2^53`'ün çok
altında olduğundan görüntü hassasiyeti kaybı yoktur; **hiçbir aritmetik frontend'de
yapılmaz** — `amount`, `group_total`, `grand_total` backend'den hazır gelir.

### 3.5 Yeni token listesi (`src/styles/tokens.css`)

```css
/* Ekran 13 — İş Kalemleri (BOQ). Değerlerin tamamı mockup satır no ile gerekçeli. */
--color-info-tint: #f0f9ff;          /* GENEL TOPLAM satırı zemini (174) */
--border-width-total: 2px;           /* GENEL TOPLAM üst çizgisi (174) */
--text-kpi-value: 20px;              /* özet kartı değeri (75, 79, 83, 87) */
--text-boq-group: 12px;              /* grup başlık satırı (108) */
--text-total-amount: 15px;           /* genel toplam tutarı (176) */
--tracking-group: 0.5px;             /* grup başlığı harf aralığı (108) */
--space-boq-cell-y: 11px;            /* tablo hücre dikey iç boşluğu (96, 111) */
--space-boq-cell-x: 16px;            /* Poz No / Tarif yatay iç boşluğu (96, 97, 111, 112) */
--space-boq-total-y: 13px;           /* tfoot hücre dikey iç boşluğu (175, 176) */
--space-boq-kpi-label-gap: 5px;      /* kart etiketi → değer (74) */
--space-boq-strip-gap: 20px;         /* kart şeridi alt boşluğu (72) */
--space-boq-action-gap: 10px;        /* iki buton arası (65) */
--space-boq-btn-x: 18px;             /* birincil buton yatay iç boşluğu (67) */
--space-boq-crumb-gap: 6px;          /* breadcrumb alt boşluğu (62) */
```

Mevcut token'larla karşılanan ve **yeniden tanımlanmayacak** değerler:
`#fff`→`--color-surface`, `#f8fafc`→`--color-surface-2`, `#f1f5f9`→`--color-divider`,
`#eff6ff`→`--color-nav-active-bg`, `#e2e8f0`→`--color-border`, `#1e293b`→`--color-text`,
`#475569`→`--color-text-secondary`, `#64748b`→`--color-text-muted`,
`#94a3b8`→`--color-text-subtle`, `#2563eb`→`--color-primary`, `#f59e0b`→`--color-warning`,
`#8b5cf6`→`--color-accent-purple-grad-start`, `#dcfce7/#16a34a`→`--color-success-soft/--color-success`,
`#dbeafe`→`--color-primary-soft`, `#fef3c7/#d97706`→`--color-warning-soft/--color-warning-strong`,
`#fee2e2/#dc2626`→`--color-danger-soft/--color-danger-strong`, radius 8/10/12/14 →
`--radius-8/--radius-10/--radius-lg/--radius-14`, `0 1px 4px rgba(0,0,0,.06)`→`--shadow-card`.

### 3.6 Yeni primitive gerekiyor mu?

**Hayır — yeni `ui/` primitive'i açılmaz.** Gerekçeler:

| İhtiyaç | Karşılık |
|---|---|
| Tablo | Ham `<table>` + ekran sınıfı (`.boq-table`). Repo'da tablo primitive'i yok; `settings.css .settings-table` de ekran sınıfıdır. Yasak olan ham `<input>/<select>/<label>`'dır, ham `<table>` değil |
| Butonlar (66, 67) | `ui/button/Button` (`secondary` / `primary`) + ekran ezmesi |
| Yüzde rozeti (117) | Bu dilimde **hiç render edilmez** (yer tutucu, §5.4). P7'de `ui/badge/Badge` yeterli olur; **ama `Badge` `font-weight:500` taşır, mockup `700` ister** — o gün ya `--weight-bold` varyantı eklenir ya ekran sınıfı ezer. Bugün karar gerektirmez, **not olarak kayıtta** |
| Modal + form alanları (§7) | Mevcut `settings/Modal` + `ui/field/Field` + `ui/input/Input` + `ui/select/Select` (SectionFormModal kanonu) |
| Özet kartları | `.boq-kpi` ekran sınıfı (`SiteTotalsStrip` deseni); `ui/card/Card` ölçüleri tutmuyor (§3.2) |

---

## 4. Dört özet kartı (satır 74–87) — **karara bağlandı (2026-07-30)**

> **Karar:** dört kart da **mockup'taki yerinde, mockup ölçüleriyle kalır**; veri
> gelene kadar değer yerine `—` + `pendingModuleLabel` ipucu basılır. Sözleşme
> (`contracts`) ve hakediş (`progress_payments`) modülleri geldiğinde kartlar
> **kendiliğinden** dolar — ekran yeniden yazılmaz, yalnız backend alanları dolar.
> "Şeridi hiç basma" ve "tek gerçek kart bas" alternatifleri **elendi**.


Backend `BoqTotals` (schema.d.ts 813–825) → **dördü de `MetricPlaceholder`**:

| # | Mockup etiketi | Satır | Mockup değeri | Backend alanı | Durum | `pending_module` |
|---|---|---|---|---|---|---|
| 1 | Toplam Sözleşme | 74–75 | ₺ 11,2M | `totals.contract_total` | **YER TUTUCU** | `contracts` |
| 2 | Gerçekleşen | 78–79 | ₺ 8,4M | `totals.realized_total` | **YER TUTUCU** | `progress_payments` |
| 3 | Kalan İş | 82–83 | ₺ 2,8M | `totals.remaining_total` | **YER TUTUCU** | `progress_payments` |
| 4 | Revize / Ek İş | 86–87 | ₺ 340K | `totals.revision_total` | **YER TUTUCU** | `contracts` |

Backend spec §3.2 gerekçesi: `11,2M ≠ 12.399.900` — kart sözleşme bedelini gösterir,
BOQ toplamını değil; sözleşme modülü yok.

**Render kuralı (P2 `SiteTotalsStrip` kanonu, birebir):**

- Değer yerine `—` basılır, `title={pendingModuleLabel(totals.X.pending_module)}`.
- `pending_module` **koda gömülmez**, gelen yükten okunur (P2 kod inceleme bulgusu):
  backend modülü değiştirirse ipucu metni de değişir.
- `pendingModuleLabel` haritasında `contracts` ("Sözleşme modülüyle birlikte gelir")
  ve `progress_payments` ("Hakediş modülüyle birlikte gelir") **zaten var**
  (`src/lib/pending-modules.ts`) — dosya değişmez.
- Renk sınıfı (mavi/amber/mor, satır 79/83/87) **korunur ama soluk** basılır:
  `.boq-kpi__value--pending` ile `color: var(--color-text-subtle)`. Gerekçe:
  yer tutucu değerin mockup'taki vurgulu rengiyle basılması sahte veri izlenimi
  yaratır (dürüstlük kuralı). Renk token'ları CSS'te tanımlı kalır ki veri
  geldiğinde tek sınıf değişimiyle mockup'a dönülsün.
- Bu ekranda **gerçek veri gösteren tek toplam** `grand_total`'dır (satır 176).
  `grand_total` kart olarak **basılmaz** — mockup'ta öyle bir kart yok.

Görünür sonuç: dört kart da `—` gösterir. Bu sessiz atlama **değildir**: her hücre
kendi bekleme modülünü `title` + `sr-only` metniyle söyler (§10).

---

## 5. Poz tablosu

### 5.1 Yapı

```
<table class="boq-table">
  <caption class="sr-only">İş kalemleri listesi</caption>          ← a11y, §10
  <thead> 7 × <th scope="col">                                      ← 96–102
  <tbody>
    grup 1 başlığı  <tr><th colSpan={7} scope="colgroup">           ← 107–108
    grup 1 kalemleri <tr> × n                                        ← 110–127
    grup 2 başlığı …                                                 ← 129–130
  </tbody>
  <tfoot> GENEL TOPLAM                                               ← 174–178
</table>
```

Gruplar `groups` dizisinin **geldiği sırada** basılır (backend spec §5.1:
`sort_order, created_at`); kalemler `group.items` sırasında (`sort_order, code`).
Frontend **yeniden sıralama yapmaz**.

### 5.2 Grup başlık satırı (107–108, 129–130, 151–152)

Mockup metni: `1. TOPRAK VE TEMEL İŞLERİ` — baştaki numara. Backend `name` alanında
numara **saklamaz** (backend spec §3.1: "sıra numarası `sort_order`'dan türetilir,
frontend basar").

Kural: **`${dizinIndex + 1}. ${group.name}`** — yani listedeki görünüm sırası
(1'den başlayan), `sort_order` alanının ham değeri **değil**. Gerekçe: `sort_order`
0 tabanlı ve seyrek olabilir (10, 20, 30); mockup 1-2-3 kesintisiz sayıyor.

Büyük harfe çevirme **CSS ile** (`text-transform: uppercase`, satır 108) — JS ile
`toLocaleUpperCase` yapılmaz; `<html lang="tr">` sayesinde tarayıcı `i → İ`
dönüşümünü doğru yapar.

### 5.3 Poz satırı (110–117)

| Sütun | Kaynak | Biçim |
|---|---|---|
| Poz No | `item.code` | ham metin, Mono (111) |
| İş Kalemi Tarifi | `item.description` | ham metin (112) |
| Birim | `item.unit` | ham metin, ortalı (113) |
| Miktar | `item.quantity` | `formatQuantity` (114) |
| Birim Fiyat | `item.unit_price` | `formatAmount` (115) |
| Tutar | `item.amount` (**backend türevi**, salt-okunur) | `formatAmount` (116) |
| Gerç. % | `item.progress_pct` (**yer tutucu**) | §5.4 |

`group_total` backend'de vardır (`BoqGroupResponse.group_total`) ama **mockup'ta
grup alt-toplam satırı YOKTUR** → basılmaz. Uydurma satır eklenmez.

### 5.4 "Gerç. %" sütunu — tamamı yer tutucu

`BoqItemResponse.progress_pct` = `MetricPlaceholder` (`available:false`, `value:null`,
`pending_module:"progress_payments"`). Dolayısıyla mockup'taki **dört renkli rozet
(117 yeşil, 139/148 mavi, 161 amber, 170 kırmızı) bu dilimde hiç render edilmez.**

Basılacak: ortalı `—`, `title={pendingModuleLabel(item.progress_pct.pending_module)}`,
`.boq-table__pct--pending { color: var(--color-text-subtle) }`.

Sütun **başlıkta durur** (mockup 102 birebir) — sütun gizlemek sessiz atlamadır.
Aynı karar backend'in Excel çıktısında da alınmış (backend spec §5.3: "başlık durur,
hücreler boş").

**Renk eşikleri — P7'ye bırakıldı (karar, 2026-07-30).** Bu dilimde `Gerç. %`
hücresi **nötr** basılır (`--color-text-subtle`); hiçbir eşik sabiti koda girmez,
`.boq-table__pct--success/--warning/--danger` gibi ölü sınıflar da yazılmaz.

Yalnız **kayıt** olarak (kod değil): mockup dört örnek gösteriyor — `%100`→success (117),
`%72–75`→primary (139/148), `%60`→warning (161), `%30`→danger (170). Eşik sınırları
(ör. "≥90 yeşil mi ≥100 mü") mockup'ta tanımsız; P7 kendi spec'inde karara bağlayacak.

### 5.5 GENEL TOPLAM satırı (174–178)

| Hücre | Satır | Kaynak | Durum |
|---|---|---|---|
| `GENEL TOPLAM` (colspan 5) | 175 | sabit metin | — |
| tutar | 176 | `totals.grand_total` | **GERÇEK** — `formatAmount(grand_total)` |
| yüzde | 177 | `totals.grand_progress_pct` | **YER TUTUCU** (`progress_payments`) → `—` + title |

`colspan={5}` mockup'la birebir (Poz No + Tarif + Birim + Miktar + Birim Fiyat).
Boş BOQ'da bile tfoot basılır: backend `grand_total: "0.00"` döner → `0`.

---

## 6. Veri sözleşmesi

### 6.1 Uçlar (schema.d.ts ile doğrulandı)

| Yöntem | Yol | İzin | Kullanım |
|---|---|---|---|
| GET | `/sites/{site_id}/boq` | `boq:view` | ekranın tek okuma sorgusu |
| POST | `/sites/{site_id}/boq/groups` | `boq:full` | grup oluştur (§7.3) |
| POST | `/sites/{site_id}/boq/items` | `boq:full` | "+ İş Kalemi" (§7.1) |
| PATCH | `/boq/groups/{group_id}` | `boq:full` | grup güncelle — **bu dilimde UI'dan çağrılmaz** (§7.4) |
| PATCH | `/boq/items/{item_id}` | `boq:full` | kalem düzenle (§7.2) |
| GET | `/sites/{site_id}/boq/export` | `boq:view` | Excel (§8) |
| ~~DELETE~~ | ~~`/boq/items/{item_id}`~~ | ~~`boq:full`~~ | 🔴 **UÇ YOK** — silme kararı verildi ama backend takip işi BE-B bekleniyor (§7.5, F13 bloklu) |

### 6.2 Tipler

`src/lib/api/hooks/useBoq.ts` içinde `schema.d.ts`'ten takma adlar (`useSites.ts`
deseni; `as any` / elle tip yazımı yasak):

```ts
export type BoqListResponse = components["schemas"]["BoqListResponse"];
export type BoqTotals       = components["schemas"]["BoqTotals"];
export type BoqGroup        = components["schemas"]["BoqGroupResponse"];
export type BoqItem         = components["schemas"]["BoqItemResponse"];
export type BoqGroupCreate  = components["schemas"]["BoqGroupCreate"];
export type BoqGroupUpdate  = components["schemas"]["BoqGroupUpdate"];
export type BoqItemCreate   = components["schemas"]["BoqItemCreate"];
export type BoqItemUpdate   = components["schemas"]["BoqItemUpdate"];
```

Dikkat: `BoqItemCreate.quantity` / `unit_price` tipi `number | string`; formdan
**string** gönderilir (Decimal hassasiyeti korunsun diye float'a çevrilmez).
`BoqItemCreate.sort_order` zorunlu değil (`default 0`) ama §7.1'de hesaplanıp
gönderilir.

### 6.3 Hook imzaları

```ts
// src/lib/api/hooks/useBoq.ts
export const BOQ_QUERY_KEY = "boq";

export function useBoq(siteId: string): UseQueryResult<BoqListResponse, Error>;
//   enabled: siteId.length > 0   (useSite deseni — boş id ile ağa çıkmaz)
//   queryKey: [BOQ_QUERY_KEY, siteId]
//   queryFn: unwrap(await backendClient.GET("/sites/{site_id}/boq", { params: { path: { site_id: siteId } } }))
```

```ts
// src/lib/api/hooks/useBoqMutations.ts   (useSectionMutations deseni)
export function useCreateBoqGroup(siteId: string): UseMutationResult<BoqGroup, Error, BoqGroupCreate>;
export function useCreateBoqItem(siteId: string):  UseMutationResult<BoqItem,  Error, BoqItemCreate>;
export function useUpdateBoqItem(siteId: string):
  UseMutationResult<BoqItem, Error, { itemId: string; body: BoqItemUpdate }>;
```

- Üçü de `onSuccess` → `queryClient.invalidateQueries({ queryKey: [BOQ_QUERY_KEY, siteId] })`.
  Tek sorgu hem tabloyu hem toplamları taşıdığından tek geçersiz kılma yeter.
- `useUpdateBoqItem` `siteId`'yi **yalnız geçersiz kılma anahtarı için** alır; uç
  `/boq/items/{item_id}` (şantiyesiz).
- Optimistik güncelleme **yok**: `grand_total`/`amount` sunucu türevi; iyimser
  yazmak yanlış toplam gösterir.
- `useDeleteBoqItem` **bu dosyaya BE-B geldiğinde eklenir** (§7.5); bugün yazılmaz
  (uç yok → ölü kod).

### 6.4 BFF `ALLOWED_ROOTS` kontrolü

- `sites` kökü **var** (satır: `"sites"`) → `GET /sites/{id}/boq`, `/boq/groups`,
  `/boq/items`, `/boq/export` bu kökten geçer. ✔
- `boq` kökü **var** (`2f7e4fe` ile eklendi, açıklama satırlarıyla) → `PATCH /boq/items/{id}`
  ve `PATCH /boq/groups/{id}`. ✔
- **Yeni kök eklenmesi gerekmiyor.** Ama §8'de anlatılan ikili indirme kusuru
  `route.ts`'te ayrı bir düzeltme gerektirir.

---

## 7. Yazma akışları — **karara bağlandı (2026-07-30)**

> ### Karar özeti (*kullanıcı kararı*; mockup'ta karşılığı yoktur)
>
> 1. **Tek modal, iki kip.** "+ İş Kalemi" → *oluşturma* kipi; **poz satırına tıklama**
>    → *düzenleme* kipi. Aynı bileşen (`BoqItemFormModal`), aynı alanlar.
> 2. **Alanlar tablo sütunlarından türetilir** (mockup'ta form yok).
> 3. **Grup ekleme aynı modalin içinden** yapılır (Grup açılırındaki `+ Yeni Grup`).
> 4. **Tabloya eylem sütunu EKLENMEZ.** Mockup'ın 7 sütunlu düzeni (96–102) korunur;
>    satır sonu "Düzenle/Sil" ikonu, kebap menüsü, 8. sütun **yasak**.
> 5. **Modalde "Sil" eylemi vardır** — ancak backend DELETE ucu yok → **bloklu** (§7.5).
> 6. **Tutar önizlemesi** modalde gösterilir (§7.1.3) — mockup'ta yok, kullanıcı kararı.
> 7. Yazma yüzeylerinin tamamı `useModulePermission("boq").canWrite` kapısının arkasındadır (§2.5).

> **Mockup boşluğu — açıkça kayıt altında:** `projedesign/` altında BOQ kalem/grup
> formu mockup'ı **yoktur** (78 dosya tarandı; `grep -ril "iş kalemi\|poz no"` yalnız
> tablo ekranlarını buldu: `Ekran 13`, `Bölüm Detay`, `Form - Sözleşme Oluştur`,
> `İşveren Sözleşme - Poz Dağılımı`, `Taşeron Hakediş Oluştur`, `İşveren Hakediş Oluştur`).
> `Form - Sözleşme Oluştur.dc.html` satır 118–175 satır içi düzenlenebilir poz tablosu
> gösterir, ama o **taşeron sözleşmesi** ekranıdır (satır 126 "⭐ Taşeron B.F."),
> Ekran 13'ün kanonu değildir. Bu yüzden aşağıdaki form **tablo sütunlarından türetilir**
> (backend spec §8 soru 7 ile aynı gerekçe) — 2026-07-30'da onaylandı.

### 7.1 `BoqItemFormModal` — tek bileşen, iki kip

`settings/Modal` + `ui/field/Field` + `ui/input/Input` + `ui/select/Select`
(SectionFormModal kanonu birebir). Ham `<input>/<select>/<label>` yasağı geçerlidir.

```ts
type BoqItemFormMode =
  | { kind: "create" }
  | { kind: "edit"; item: BoqItem; groupId: string };

interface BoqItemFormModalProps {
  siteId: string;
  groups: BoqGroup[];        // Grup açılırını doldurur; listeden gelir, yeniden çekilmez
  mode: BoqItemFormMode;
  onClose: () => void;
}
```

| Kip | Açan | Başlık | Birincil buton | Ek eylem |
|---|---|---|---|---|
| `create` | "+ İş Kalemi" (mockup 67) | **"Yeni İş Kalemi"** | `Kaydet` | — |
| `edit` | poz satırına tıklama (§7.2) | **"İş Kalemi Düzenle"** | `Kaydet` | **`Sil`** (§7.5, bloklu) |

Alt buton şeridi: solda `Sil` (yalnız `edit`), sağda `Vazgeç` / `Kaydet`
(SectionFormModal deseni; mockup'ta modal olmadığından metinler repo kanonundan gelir).

#### 7.1.1 Alanlar (her ikisi de aynı)

| Alan | Etiket | Kontrol | Zorunlu | Türetildiği mockup satırı |
|---|---|---|---|---|
| `group_id` | **Grup** | `Select` (mevcut gruplar + `+ Yeni Grup`) | ✔ | grup başlık satırları 107–108 / 129–130 / 151–152 |
| `code` | **Poz No** | `Input` | ✔ | th 96 / hücre 111 |
| `description` | **İş Kalemi Tarifi** | `Input` | ✔ | th 97 / hücre 112 |
| `unit` | **Birim** | `Input` (serbest metin) | ✔ | th 98 / hücre 113 (`m³`, `Ton`, `m²` — sabit liste yok, backend spec §8 soru 4) |
| `quantity` | **Miktar** | `Input type="number" numeric` | ✔ | th 99 / hücre 114 |
| `unit_price` | **Birim Fiyat** | `Input type="number" numeric` | ✔ | th 100 / hücre 115 |

`edit` kipinde alanlar `mode.item`'dan doldurulur; `quantity`/`unit_price` **string
olarak** (Decimal metni) doldurulur, `Number()`'a çevrilip geri yazılmaz (hassasiyet).

**Formda OLMAYAN alanlar ve gerekçeleri:**

- `amount` (th 101) — türev, backend hesaplar; **girdi değil** (yalnız önizleme, §7.1.3).
- `progress_pct` (th 102) — yer tutucu; girdi değil.
- `sort_order` — mockup'ta karşılığı yok, **UI alanı açılmaz**:
  - `create`: `(seçili grubun mevcut kalemlerinin max sort_order) + 1` → kalem grubun sonuna eklenir.
  - `edit`: **hiç gönderilmez** (mevcut sıra korunur). Grup değişirse de dokunulmaz —
    yeniden sıralama bu dilimin kapsamı dışı.
  - (SectionFormModal'daki görünür "Sıra" alanı **kopyalanmaz** — o ekranın mockup'ında
    karşılığı vardı, burada yok.)

#### 7.1.2 Kip başına gönderim

| Kip | İstek | Gövde |
|---|---|---|
| `create` | `POST /sites/{siteId}/boq/items` | `BoqItemCreate`: `group_id, code, description, unit, quantity, unit_price, sort_order` |
| `edit` | `PATCH /boq/items/{itemId}` | `BoqItemUpdate` — **yalnız değişen alanlar** (hepsi opsiyonel). Hiçbir alan değişmediyse istek **atılmaz**, modal kapanır |

`group_id` düzenlemede de değiştirilebilir (backend §3.3 invariant 4 izin verir) →
kalem başka gruba taşınır. Bu, tabloda "taşıma" affordance'ı açmadan grup değiştirmenin
tek yoludur.

#### 7.1.3 Tutar önizlemesi — *kullanıcı kararı*

Modal içinde, `Birim Fiyat` alanının hemen altında **salt-okunur** bir satır:

```
Tutar (hesaplanan)      347.200
```

- Değer `formatAmount(quantity × unit_price)` ile **yalnız görüntü** amaçlı hesaplanır.
- `<Field>`/`<Input>` **değildir** — düz `<p class="boq-modal__preview">`; forma girmez,
  hiçbir isteğe konmaz. Backend'in hesapladığı `amount` tek doğru kaynaktır.
- Girdilerden biri boş/geçersizse `—` basılır (0 basmaz — sahte değer).
- Etiket metni: **"Tutar (hesaplanan)"** — mockup'ta karşılığı yok, §9.2 metin envanterinde.

#### 7.1.4 İstemci doğrulaması (yalnız metni belli olanlar)

| Kural | Mesaj |
|---|---|
| `code` boş | "Poz No zorunludur." |
| `description` boş | "İş Kalemi Tarifi zorunludur." |
| `unit` boş | "Birim zorunludur." |
| `quantity` boş / `<= 0` | "Miktar sıfırdan büyük olmalıdır." (backend CHECK `> 0`, backend spec §3.3) |
| `unit_price` boş / `< 0` | "Birim Fiyat negatif olamaz." (backend CHECK `>= 0`) |
| `group_id` seçilmemiş | "Grup seçin." |

Doğrulama, modal içinde `settings-note--error` satırı olarak basılır; **ilk hatalı
alan odaklanır**. `Kaydet` doğrulama geçmeden istek atmaz.

#### 7.1.5 Sunucu hataları (`backendErrorMessage` + özel eşleme)

| Durum | Ekranda |
|---|---|
| 409 (`(site_id, code)` çakışması) | "Bu poz numarası bu şantiyede zaten kullanılıyor." (backend §5.4 metni) |
| 422 (`BoqGroupSiteMismatchError`) | backend gövdesindeki Türkçe mesaj |
| 403 | `backendErrorMessage` genel metni (modal içinde satır olarak) |

### 7.2 Satır tıklaması ile düzenleme — *kullanıcı kararı*

Mockup'ta satır sonu eylem sütunu, kalem ikonu veya "Düzenle" bağlantısı **yoktur**
(110–171 arası hiçbir satırda buton yok) ve **eklenmeyecektir**. Bunun yerine:

- **Poz satırının tamamı tıklanabilir**; tıklama `BoqItemFormModal`'ı
  `mode = { kind: "edit", item, groupId }` ile açar.
- Görsel olarak **yeni piksel eklenmez**: yalnız `cursor: pointer` +
  `:hover { background: var(--color-surface-2) }` (mockup'ta hover tanımı yok;
  `settings-table tbody tr:hover` repo kanonu). Boyut/sütun/dolgu değişmez →
  görsel baseline yalnız hover'sız durumu yakalar, sapma oluşmaz.
- **Klavye/a11y:** `<tr tabIndex={0} role="button">` **kullanılmaz** (satır semantiği
  bozulur). Poz No hücresi içeriği `<button type="button" class="boq-table__row-trigger">`
  ile sarılır; buton görünüşte düz metindir (`background:none;border:0;padding:0;font:inherit;color:inherit`),
  `aria-label="{code} — {description} kalemini düzenle"` taşır (§10).
- `canWrite === false` ise (§2.5): satır tıklaması **bağlanmaz**, `cursor`/hover
  eklenmez, Poz No hücresi düz `<span>` olur (odaklanabilir ölü buton bırakılmaz).

### 7.3 Grup ekleme — modalin içinden (*kullanıcı kararı*)

Mockup'ta "+ Grup" butonu yoktur (65–68'de yalnız iki buton var), ama grup olmadan
kalem eklenemez (`group_id` zorunlu). Çözüm, yeni yüzey açmadan:

- Kalem modalındaki **Grup** açılırının son seçeneği `+ Yeni Grup` (her iki kipte de).
- Seçilince altında **Grup Adı** (`Input`, zorunlu) belirir — `EmployerCard`'ın
  "+ Yeni İşveren Ekle" deseninin aynısı (P1.1a §4.6).
- Kaydet: önce `POST …/boq/groups` (`{ name, sort_order: mevcutMaxSortOrder + 1 }`),
  dönen `id` ile `POST …/boq/items`. İkinci istek hata verirse grup **kalır** ve
  kullanıcıya "Grup oluşturuldu, kalem eklenemedi: …" denir (sessiz yutma yok).
- BOQ tamamen boşsa (`groups: []`) boş durum eylemi doğrudan bu modalı, "+ Yeni Grup"
  seçili başlangıç durumuyla açar.

### 7.4 Grup güncelleme (PATCH `/boq/groups/{id}`)

Bu dilimde **UI'dan çağrılmaz** (karar, 2026-07-30): mockup'ta grup adı/sırası
düzenleme affordance'ı yok (108/130/152 düz metin) ve kullanıcı kararı yalnız
**kalem** düzenlemesini kapsıyor. Uç `ALLOWED_ROOTS`'tan geçer ve şemada durur; hook
**yazılmaz** (ölü kod kapısı F11 bunu bulur).

### 7.5 Kalem silme — *kullanıcı kararı*, 🔴 **BACKEND'E BAĞIMLI / BLOKLU**

> **Bağımlılık — açık:** backend'de `DELETE /boq/items/{item_id}` ucu **ŞU AN YOKTUR**.
> `backend/app/modules/boq/router.py` içindeki uçların tamamı doğrulandı:
> `GET /sites/{id}/boq`, `GET …/boq/export`, `POST …/boq/groups`, `POST …/boq/items`,
> `PATCH /boq/groups/{id}`, `PATCH /boq/items/{id}` — **DELETE yok.**
> Bu, P3 dışı bir **backend takip işi** olarak açıldı ("BE-B").
> **Aşağıdaki akışın uygulaması, BE-B canlıya çıkana kadar BLOKLUDUR** (task F13).

**BE-B'den beklenen sözleşme (frontend'in varsaydığı):** `DELETE /boq/items/{item_id}`,
izin `boq:full`, başarı `204 No Content`, kayıt yoksa `404`, görünmeyen şantiye `404`
(403 değil — GOREV-SIRASI backend kuralı), denetim günlüğüne yazar.

**Akış (BE-B geldiğinde uygulanacak):**

1. `edit` kipindeki modalin alt şeridinde solda **`Sil`** butonu
   (`<Button variant="danger">`; yoksa `.boq-modal__delete` ekran sınıfı ile
   `--color-danger-strong`). `create` kipinde **basılmaz**.
2. Tıklanınca **aynı modal içinde** onay adımına geçilir (ikinci modal açılmaz):
   form alanları gizlenir, yerine tek satır uyarı + `Vazgeç` / `Evet, sil` gelir.
   Metin: **"{code} — {description} kalemi silinecek. Bu işlem geri alınamaz."**
3. Onayda `DELETE /boq/items/{itemId}` → 204 → modal kapanır →
   `invalidateQueries([BOQ_QUERY_KEY, siteId])` (toplamlar da tazelenir).
4. Hata: 404 → "Kalem bulunamadı, listeyi tazeleyin."; 403 → `backendErrorMessage`;
   diğer → "İş kalemi silinemedi."
5. **Grup silme yoktur** — grubun son kalemi silinse bile grup başlığı boş olarak kalır
   (§9 "grubu olan ama kalemi olmayan grup" satırı). Grup temizliği ayrı bir iştir.
6. `canWrite === false` → `Sil` **hiç basılmaz** (§2.5).

**BFF notu:** `DELETE` metodu `route.ts`'te zaten destekleniyor (`export function DELETE`)
ve `boq` kökü allow-list'te → **BFF tarafında ek iş yok**.

**Hook (BE-B sonrası):**

```ts
export function useDeleteBoqItem(siteId: string): UseMutationResult<void, Error, string /* itemId */>;
```

---

## 8. "Excel İndir" (mockup satır 66)

Uç: `GET /sites/{site_id}/boq/export` → `.xlsx` ikili yanıt,
`Content-Disposition: attachment; filename="is-kalemleri-{site.code}.xlsx"`
(backend spec §5.3).

### 8.1 🔴 BFF ikili indirme kusuru — düzeltilmeden akış ÇALIŞMAZ

`src/app/api/backend/[...path]/route.ts`:

```ts
const BINARY_DOWNLOAD_SUFFIXES = [".xlsx"];
function isBinaryDownload(method, path) {
  const last = path[path.length - 1];
  return BINARY_DOWNLOAD_SUFFIXES.some((suffix) => last.endsWith(suffix));
}
```

BOQ ucunun son segmenti **`export`** (uzantısız), denetim günlüğününki
`export.xlsx` idi. Dolayısıyla BOQ indirmesi ikili yoldan **geçmez**; JSON yoluna
düşer, `parseBody` `res.json()`'da patlar ve `null` döner → istemciye **200 + `null`
gövde** gider, dosya asla inmez. jsdom testleri bunu görmez (BFF Node route'u),
yalnız canlıda ortaya çıkar — `boq` kökünün allow-list'e eklenmesiyle **aynı sınıf
tuzak** (GOREV-SIRASI §3 "BFF TUZAĞI").

#### Karar (2026-07-30): düzeltme **frontend'de**, ölçüt **`Content-Type`**

Backend'e **dokunulmaz** (uç yeniden adlandırılmaz, yeniden deploy yok). BFF, ikili
yanıtı **uzantıdan değil, backend'in döndürdüğü `Content-Type` başlığından** tanır.
`.xlsx` deseni **kaldırılmaz** ama **tek ölçüt olmaktan çıkar** (yedek kural olur).
Böylece `/sites/{id}/boq/export` gibi **uzantısız** uçlar ve gelecekteki tüm export
uçları — `contracts`, `progress_payments`, `reports` — kendiliğinden kapsanır;
her yeni export ucunda desen listesine satır eklemek gerekmez.

**Sorunun özü:** karar bugün istek **atılmadan önce** veriliyor, oysa `Content-Type`
ancak yanıt geldikten sonra bilinir. Bu yüzden yalnız `isBinaryDownload` değiştirilmez,
**istek/karar sırası** değişir.

**Uygulama:**

1. `src/lib/auth/backend.ts`: `proxyAuthenticatedBinary` → **`proxyAuthenticatedRaw`**
   olarak genelleştirilir. Fark: gövde **her durumda** `ArrayBuffer` olarak okunur
   (bugünkü `binaryResult` `!res.ok` iken gövdeyi düşürüyor — 403/409/422 Türkçe hata
   gövdeleri kaybolurdu). Aynı 401 → `/auth/refresh` → tek retry davranışı korunur.
   ```ts
   export interface ProxyRawResult {
     status: number;
     contentType: string | null;
     contentDisposition: string | null;
     data: ArrayBuffer;           // her zaman okunur (hata gövdesi dahil)
     refreshedAccessToken?: string;
   }
   export async function proxyAuthenticatedRaw(
     accessToken: string | undefined, refreshToken: string | undefined,
     path: string, options?: ProxyOptions,
   ): Promise<ProxyRawResult>;
   ```
   Eski `proxyAuthenticatedBinary` **silinir** (tek çağıranı `route.ts`); ölü kod bırakılmaz.
2. `route.ts`: **GET** istekleri `proxyAuthenticatedRaw`'dan geçer. Yanıt geldikten sonra:
   ```ts
   // JSON/metin sayılan icerik tipleri: govde metne cozulup JSON olarak islenir.
   const TEXTUAL_CONTENT_TYPES = [/^application\/json/i, /^application\/problem\+json/i, /^text\//i];
   // Yedek kural: Content-Type eksik/genelse uzanti hala ikili sayilir.
   const BINARY_DOWNLOAD_SUFFIXES = [".xlsx"];

   function isBinaryResponse(contentType: string | null, path: string[]): boolean {
     if (contentType && TEXTUAL_CONTENT_TYPES.some((re) => re.test(contentType))) return false;
     if (contentType) return true;                       // ASIL OLCUT
     return BINARY_DOWNLOAD_SUFFIXES.some((s) => path[path.length - 1].endsWith(s));
   }
   ```
   - `isBinaryResponse === true` → bugünkü `handleBinary` gövdesi: `content-type` +
     `content-disposition` + `cache-control: no-store` korunarak aynen geçirilir.
   - `false` → gövde `TextDecoder` ile çözülüp `JSON.parse` edilir (başarısızsa `null`)
     ve **bugünkü JSON dalı aynen** işler: 401 → çerez temizleme, ≥500 → gövde sızdırmama,
     204 → boş yanıt, diğer 2xx/4xx → gövde+status aynen geçirme.
   - **Hata yanıtları asla ikili sayılmaz:** `status >= 400` ise (`Content-Type` ne olursa
     olsun) JSON dalına gidilir; backend hata gövdeleri `application/json` döner ve
     403/409/422 Türkçe mesajları korunmalıdır.
3. **GET dışı metodlar** (`POST/PATCH/PUT/DELETE`) bugünkü `proxyAuthenticated`
   yolunda kalır — ikili yükleme akışı yok, davranış değişmez, blast radius küçük tutulur.

**Bellek notu:** GET gövdeleri artık önce `ArrayBuffer`'a okunuyor. Mevcut GET uçlarının
tamamı küçük JSON; export dosyaları zaten `ArrayBuffer`'dan geçiyordu → pratik fark yok.

#### Regresyon testi (zorunlu, Node ortamı)

`src/app/api/backend/[...path]/route.test.ts` içine, `fetch` mock'lanarak:

| Test | Girdi | Beklenen |
|---|---|---|
| **Uzantısız export ikili geçer** (asıl regresyon kapısı) | `GET sites/{id}/boq/export`, backend yanıtı `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` + `Content-Disposition: attachment; filename="is-kalemleri-STE-01.xlsx"` + ikili gövde | Yanıt gövdesi **bayt bayt aynı**, `content-type` ve `content-disposition` korunur, JSON'a çevrilmez, `200` |
| Uzantılı export hâlâ ikili | `GET audit-log/export.xlsx`, aynı içerik tipi | ikili yol (mevcut davranış korunur) |
| `Content-Type` yokken uzantı yedeği | `GET audit-log/export.xlsx`, `Content-Type` başlığı **yok** | ikili yol (suffix kuralı devrede) |
| JSON regresyonu | `GET sites/{id}/boq`, `application/json` | JSON dalı: gövde ayrıştırılır, `200` |
| Hata gövdesi korunur | `GET sites/{id}/boq/export` → `403` + `application/json` Türkçe gövde | JSON dalı: gövde + `403` aynen geçer (ikili sayılmaz) |
| 401 + refresh | mevcut test | davranış değişmedi |

### 8.2 İstemci

`src/lib/api/boq-client.ts` — `audit-client.ts`'teki `downloadAuditExport` kanonu
birebir (ham `fetch`, `credentials: "same-origin"`, `Blob` → `URL.createObjectURL`
→ gizli `<a download>` → `revokeObjectURL` `finally` içinde):

```ts
const BOQ_EXPORT_PATH = (siteId: string) => `/api/backend/sites/${siteId}/boq/export`;
const DEFAULT_EXPORT_FILENAME = "is-kalemleri.xlsx";
export async function downloadBoqExport(siteId: string): Promise<void>;
```

Dosya adı `exportFilename(contentDisposition)` ile çözülür. Bu yardımcı bugün
`audit-client.ts` içinde **özel** ve varsayılanı `denetim-gunlugu.xlsx` sabitine
bağlı → `src/lib/api/export-filename.ts`'e taşınıp varsayılan parametre alacak
şekilde genelleştirilir (DRY; iki çağıran da testli).

`siteId` şablona girmeden önce **URL kaçışı** yapılır (`encodeURIComponent`);
UUID beklenir ama rota parametresi kullanıcı girdisidir.

### 8.3 Durumlar

| Durum | Davranış |
|---|---|
| İstek sürerken | Buton `disabled`, metin **"İndiriliyor…"** (mockup'ta yok — §9.2 metin envanteri, onaylandı) |
| 403 | Başlık altında satır: "Bu işlem için yetkiniz yok" |
| 4xx/5xx | "Excel dosyası indirilemedi." |
| Başarı | Ek geri bildirim yok (tarayıcı indirmesi görünür) |

---

## 9. Boş / yükleniyor / hata durumları

**Mockup'ta bu durumların HİÇBİRİ yok** (dolu tablo çizilmiş) — aşağıdakiler repo
kanonundan gelir, tek tek işaretlidir.

| Durum | Davranış | Kaynak |
|---|---|---|
| Yükleniyor | `<p class="boq__message">Yükleniyor…</p>` | **mockup'ta yok** — Şantiye Detay `site-detail__message` deseni |
| 403 | `<AccessDenied />` | **mockup'ta yok** — `isForbidden(query.error)` kanonu |
| 404 / diğer hata | `<p class="boq__message">İş kalemleri yüklenemedi</p>` | **mockup'ta yok** — Şantiye Detay deseni |
| Boş BOQ (`groups: []`) | Başlık + kartlar + **tablo başlığı ve tfoot (0) korunur**; `<tbody>` yerine tam genişlikte tek satır: "Bu şantiyede henüz iş kalemi tanımlanmadı." + `+ İş Kalemi` butonu | **mockup'ta yok** — `site-detail__empty` deseni; backend "boş BOQ hata değildir" (spec §5.1) |
| Grubu olan ama kalemi olmayan grup | Grup başlığı basılır, altında kalem satırı olmaz (uydurma "boş" satırı eklenmez) | backend `items: []` mümkün |
| Yazma sırasında hata | Modal içinde `settings-note--error` satırı | SectionFormModal deseni |

Yükleme/hata/boş durumlarında **kart şeridi yine basılır** (yer tutucu `—` ile),
çünkü verisi zaten sorguya bağlı değil.

### 9.2 Metin envanteri — mockup'ta karşılığı OLMAYAN tüm dizeler

> **Karara bağlandı (2026-07-30):** aşağıdaki metinlerin tamamı önerilen hâliyle
> **onaylandı**. Ekranda görünen ve bu tabloda **olmayan** hiçbir yeni dize yazılamaz;
> yeni metin gerekirse önce buraya eklenir. Mockup'ta karşılığı olan metinler
> (başlık, sütun adları, kart etiketleri, buton metinleri) bu tabloda **yer almaz** —
> onlar §3'teki ölçü tablolarından satır numarasıyla gelir.

| # | Metin | Nerede | Kaynak/gerekçe |
|---|---|---|---|
| 1 | `Yükleniyor…` | sayfa gövdesi (§9) | Şantiye Detay `site-detail__message` deseni |
| 2 | `İş kalemleri yüklenemedi` | sayfa gövdesi, 404/diğer hata (§9) | Şantiye Detay deseni |
| 3 | `Bu şantiyede henüz iş kalemi tanımlanmadı.` | boş BOQ (§9) | `site-detail__empty` deseni |
| 4 | `İndiriliyor…` | Excel butonu, istek sürerken (§8.3) | yeni |
| 5 | `Excel dosyası indirilemedi.` | Excel 4xx/5xx (§8.3) | yeni |
| 6 | `Bu işlem için yetkiniz yok` | Excel 403 (§8.3) | mevcut `backendErrorMessage` metni |
| 7 | `Yeni İş Kalemi` | modal başlığı, `create` (§7.1) | SectionFormModal deseni |
| 8 | `İş Kalemi Düzenle` | modal başlığı, `edit` (§7.1) | SectionFormModal deseni |
| 9 | `Vazgeç` / `Kaydet` | modal alt butonları (§7.1) | SectionFormModal deseni |
| 10 | `Grup` · `Poz No` · `İş Kalemi Tarifi` · `Birim` · `Miktar` · `Birim Fiyat` | modal alan etiketleri (§7.1.1) | tablo sütun başlıklarından **birebir** (mockup 96–100) |
| 11 | `+ Yeni Grup` | Grup açılırının son seçeneği (§7.3) | EmployerCard "+ Yeni İşveren Ekle" deseni |
| 12 | `Grup Adı` | `+ Yeni Grup` seçilince beliren alan (§7.3) | yeni |
| 13 | `Tutar (hesaplanan)` | modal önizleme satırı (§7.1.3) | yeni, *kullanıcı kararı* |
| 14 | `Poz No zorunludur.` | doğrulama (§7.1.4) | yeni |
| 15 | `İş Kalemi Tarifi zorunludur.` | doğrulama | yeni |
| 16 | `Birim zorunludur.` | doğrulama | yeni |
| 17 | `Miktar sıfırdan büyük olmalıdır.` | doğrulama (backend CHECK `> 0`) | yeni |
| 18 | `Birim Fiyat negatif olamaz.` | doğrulama (backend CHECK `>= 0`) | yeni |
| 19 | `Grup seçin.` | doğrulama | yeni |
| 20 | `Grup adı zorunludur.` | `+ Yeni Grup` doğrulaması (§7.3) | yeni |
| 21 | `Bu poz numarası bu şantiyede zaten kullanılıyor.` | 409 (§7.1.5) | backend spec §5.4 metni |
| 22 | `Grup oluşturuldu, kalem eklenemedi: {mesaj}` | iki adımlı yazmada ikinci istek hatası (§7.3) | yeni; sessiz yutma yasağı |
| 23 | `İş kalemleri listesi` | `<caption class="sr-only">` (§10) | a11y |
| 24 | `{code} — {description} kalemini düzenle` | satır tetikleyicisi `aria-label` (§7.2, §10) | a11y |
| 25 | `Sil` | modal alt şeridi, `edit` (§7.5) | **BLOKLU** — BE-B'ye bağlı |
| 26 | `{code} — {description} kalemi silinecek. Bu işlem geri alınamaz.` | silme onayı (§7.5) | **BLOKLU** |
| 27 | `Evet, sil` | silme onay butonu (§7.5) | **BLOKLU** |
| 28 | `Kalem bulunamadı, listeyi tazeleyin.` | silme 404 (§7.5) | **BLOKLU** |
| 29 | `İş kalemi silinemedi.` | silme diğer hata (§7.5) | **BLOKLU** |
| 30 | `Sözleşme modülüyle birlikte gelir` / `Hakediş modülüyle birlikte gelir` | yer tutucu `title` + `sr-only` (§4, §5.4) | **mevcut** `src/lib/pending-modules.ts` — yeniden yazılmaz |

---

## 10. A11y ve klavye

| Konu | Karar |
|---|---|
| Tablo semantiği | `<table>` + `<caption class="sr-only">İş kalemleri listesi</caption>`; `<th scope="col">` × 7 (96–102) |
| Grup başlık satırı | `<th colSpan={7} scope="colgroup">` — `<td>` değil; grup, altındaki satırların başlığıdır |
| Sayısal hizalama | `text-align` görsel; ekran okuyucu için ek işaret gerekmez |
| Yer tutucu hücreler | `—` görünür + `title` + `<span class="sr-only">{pendingModuleLabel(...)}</span>`. Yalnız `title` yeterli değildir (klavye/ekran okuyucu ulaşamaz) — P2'deki `title`-only desenin **üstüne** eklenir |
| GENEL TOPLAM | `<tfoot>` içinde; ilk hücre `<th colSpan={5} scope="row">` |
| Satır düzenleme tetikleyicisi (§7.2) | Poz No hücresinde `<button type="button" class="boq-table__row-trigger">{code}</button>`; erişilebilir ad: `"{code} — {description} kalemini düzenle"` (`aria-label`). Tab sırası doğal satır sırasını izler |
| Yazma yetkisi yokken (§2.5) | Tetikleyici buton **hiç render edilmez** (düz `<span>`); "görünüp çalışmayan" odaklanabilir öğe bırakılmaz |
| Silme onayı (§7.5) | Onay adımı **aynı modalin içinde**; ikinci bir diyalog açılmaz, odak tuzağı tek kalır. `Evet, sil` odağı onay adımına geçince alır |
| Modal | `settings/Modal` odak yönetimi P2'de eklendi (`706f52c`) — yeniden yazılmaz |
| Buton odak halkası | `--focus-ring` (button.css `:focus-visible`) |
| Renk kontrastı | Yer tutucu `—` `--color-text-subtle` (#94a3b8) üzerinde beyaz zemin: **3.0:1**, normal metin için AA altı. `—` bilgi taşımadığı ve gerçek bilgi `sr-only` metinle verildiği için kabul edilir (§12 karar 3 ile kesinleşti) |
| `prefers-reduced-motion` | `.drill-content` animasyonu zaten korumalı; yeni animasyon eklenmez |

---

## 11. Test stratejisi

### 11.1 jsdom birim (Vitest) — zorunlu

| Dosya | Kapsam |
|---|---|
| `src/lib/format.test.ts` (ek) | `formatQuantity`/`formatAmount`: `"1240.000"→"1.240"`, `"1240.500"→"1.240,5"`, `"280.00"→"280"`, `"12399900.00"→"12.399.900"`, `₺` **basılmadığı** |
| `useBoq.test.tsx` | `enabled` kapalıyken ağa çıkmaz; sorgu anahtarı `["boq", siteId]` |
| `useBoqMutations.test.tsx` | üç mutasyonun `["boq", siteId]` anahtarını geçersiz kıldığı (P2 "mutation invalidation" testi deseni) |
| `BoqTable.test.tsx` | grup numaralandırması `1.`/`2.`/`3.` (dizin tabanlı, `sort_order` 10/20/30 iken bile); satır sırası korunur; `amount` backend'den basılır (yeniden hesaplanmaz); son satırda alt çizgi yok |
| `BoqTotalsStrip.test.tsx` | dört kartın da `—` bastığı + `pendingModuleLabel` metninin **yükten** okunduğu (koda gömülü olmadığı) |
| `BoqTable` yer tutucu | `Gerç. %` hücreleri `—` + sr-only metin; sütun başlığının **kaybolmadığı** |
| `page.test.tsx` | yükleniyor / 403→AccessDenied / hata / boş durum dalları |
| `BoqItemFormModal.test.tsx` | **`create` kipi:** doğrulama mesajları; `sort_order` = max+1 hesabı; 409 → poz no mesajı; "+ Yeni Grup" iki adımlı yazma; ikinci istek hatasında grubun kaldığının bildirilmesi. **`edit` kipi:** alanların dolu açıldığı; PATCH gövdesinin **yalnız değişen alanı** taşıdığı; hiçbir şey değişmediyse **istek atılmadığı**; `sort_order`'ın gönderilmediği; `group_id` değişiminin taşımayı ürettiği. **Önizleme:** `Tutar (hesaplanan)` değerinin miktar×fiyattan hesaplandığı ve **istek gövdesine girmediği**; alan boşken `—` bastığı |
| `useModulePermission.test.tsx` | `permissions` alanı **yokken** `canWrite === true` (§2.5.3 bilinmezlik kuralı); `boq: "view"` iken `false`; `boq: "full"` iken `true`; hook'un **ağ isteği atmadığı** |
| `BoqTable` / `page` izin kapısı | `canWrite === false` iken "+ İş Kalemi" **DOM'da yok**, satır tetikleyici buton **yok**, "Excel İndir" **var** |
| `boq-client.test.ts` | `fetch` çağrısının yolu/kimlik bilgisi; `revokeObjectURL` `finally` çağrısı; hata → `BackendError` |
| `route.test.ts` (BFF) | §8.1'deki **altı satırlık** regresyon tablosu; asıl kapı: uzantısız `sites/{id}/boq/export` GET'inin `Content-Type` sayesinde **ikili yola** düştüğü |
| `BoqItemFormModal` silme (**BLOKLU**, F13) | `Sil` yalnız `edit` kipinde; onay adımı; 204 → invalidate; 404/403/diğer mesajları. BE-B gelene kadar **yazılmaz** |
| ALLOWED_ROOTS dinamik testi | mevcut test `src/lib/api` altındaki `backendClient` çağrılarından kökleri çıkarır → yeni hook'lar eklendiğinde kendiliğinden koşar |

### 11.2 Görsel regresyon

- Yeni `e2e/boq-visual.spec.ts` → anlık görüntü adı `is-kalemleri`.
- `e2e/mock-backend.ts`'e `GET /sites/:siteId/boq` yanıtı eklenir: **mockup'taki
  3 grup / 6 kalem birebir** (kod, tarif, birim, miktar, birim fiyat, tutar
  değerleri satır 111–171'den), `grand_total: "12399900.00"`, altı yer tutucu.
- `e2e/site-detail-visual.spec.ts` baseline'ı **da yenilenir** (§2.2 — yeni sekme).
- **macOS'ta Playwright KOŞULMAZ, `.png` üretilmez** (GOREV-SIRASI §3). Teslim:
  `visual-baselines.yml` → workflow_dispatch → artifact indir → `e2e/` altına aç → commit.

**Baseline turu planı (karara bağlandı, F11) — tek Linux CI turu, üç baseline:**

| # | Baseline | Neden kayıyor |
|---|---|---|
| 1 | `is-kalemleri` (**yeni**) | bu ekran |
| 2 | `santiye-detay` | sekme barına "İş Kalemleri" eklendi (§2.2, onaylı sapma) |
| 3 | `ayarlar-izin-matrisi` | X2/X2b — mock 17 modüle çıktı, `boq × procurement` = `view/limited` |

Üçü **ayrı turlarda alınmaz**; tek `workflow_dispatch` koşusunun artifact'i açılır ve
tek commit ile işlenir. (X3 yapılırsa aynı matris baseline'ı **dördüncü kez** kayar —
X3 bu tura sığdırılabilirse sığdırılır, sığmazsa ayrı iş olarak kalır.)
- Mock e2e oturumunda `permissions` alanı **yoktur** → §2.5.3 gereği görsel baseline
  **yazma butonları görünür** hâlde alınır; BE-B/BE-A sonrası mock'a alan eklenirse
  baseline yeniden kayar (o gün ayrıca planlanır).

### 11.3 Kapılar

`pnpm lint` + `pnpm typecheck` + `pnpm test` + `pnpm build`. `as any` / `@ts-ignore` yasak.

---

## 12. Karara bağlandı (2026-07-30)

Aşağıdaki maddeler **kesindir, yeniden tartışılmayacaktır**. Önceki taslaktaki
"açık sorular" listesi bu tabloyla kapatılmıştır.

| # | Konu | Karar | Spec bölümü |
|---|---|---|---|
| 1 | BFF ikili indirme kusuru | Düzeltme **frontend'de**; ölçüt **yanıtın `Content-Type`'ı**, `.xlsx` deseni yedek kural olarak kalır. Backend'e dokunulmaz. Regresyon testi zorunlu | §8.1 |
| 2 | Breadcrumb | `← {şantiye} · {proje} / {şantiye}`. Sözleşme bağı **kurulmaz**, görünür yer tutucu da basılmaz | §2.3, §13-C |
| 3 | Dört özet kartı | Mockup'taki yerinde kalır; veri gelene kadar `—` + `pendingModuleLabel`. Sözleşme/hakediş modülleri gelince kendiliğinden dolar. Alternatifler elendi | §4 |
| 4 | Yazma UI | **Modal + satır tıklama.** "+ İş Kalemi" → oluşturma kipi, satır tıklaması → düzenleme kipi; grup ekleme modalin içinden. **Tabloya eylem sütunu eklenmez**, 7 sütun korunur | §7.1–7.3 |
| 5 | Tutar önizlemesi | Modalde **gösterilir** (`Tutar (hesaplanan)`), salt-okunur, isteğe girmez | §7.1.3 |
| 6 | Grup adı düzenleme (PATCH `/boq/groups`) | Bu dilimde **UI'sız kalır**; hook yazılmaz | §7.4 |
| 7 | Silme | **Onaylandı** — modalde `Sil` + aynı modal içinde onay adımı. 🔴 **Backend DELETE ucu yok → task F13 BLOKLU** (BE-B) | §7.5 |
| 8 | Salt-okunur roller (`procurement` = `_LIM`) | Yazma butonları **gizlenir**. Bunun için istemci izin altyapısı açılır (`useModulePermission`), sonraki tüm ekranlarda yeniden kullanılır | §2.5, F12 |
| 9 | `Gerç. %` renk eşikleri | **P7'ye bırakıldı.** Şimdi nötr basılır, eşik kodlanmaz, ölü renk sınıfı yazılmaz | §5.4 |
| 10 | Giriş noktası | **Hem** Şantiye Detay sekme barı **hem** drill sidebar. `santiye-detay` baseline'ının kayacağı kabul edildi; üç baseline tek CI turunda alınır | §2.2, §11.2, §13-B |
| 11 | İçerik ofseti | Kabuğun `24px 32px` değeri korunur; mockup'la **4px sapma kabul** | §2.1, §13-A |
| 12 | Mockup'ta karşılığı olmayan metinler | Önerilen hâliyle **onaylandı**; tamamı tek "metin envanteri" tablosunda | §9.2 |

### 12.1 Hâlâ açık olan tek konu

| Konu | Neden hâlâ açık | Etkisi |
|---|---|---|
| **Poz No formatı zorlanacak mı?** (`01.001` gibi) | GOREV-SIRASI §5'te açık soru olarak duruyor; backend bugün **serbest metin** kabul ediyor, yalnız şantiye içi benzersizlik var | Bu dilimi **bloklamaz**. Cevap gelene kadar istemci yalnız "boş olamaz" der (§7.1.4); format kuralı gelirse tek doğrulama satırı + tek metin eklenir |

### 12.2 Bu dilimden doğan backend takip işleri (P3 dışı)

| Kod | İş | Kimi bloklar |
|---|---|---|
| **BE-A** | `MeResponse`'a `permissions: {modül → AccessLevel}` eklenmesi; `/auth/me` kendi izinlerini döndürsün (ek izin gerektirmeden) | Hiçbir task'ı bloklamaz — F12 bilinmezlik kuralıyla (§2.5.3) bugün de teslim edilir; gizleme BE-A canlıya çıkınca **kendiliğinden** devreye girer |
| **BE-B** | `DELETE /boq/items/{item_id}` (izin `boq:full`, 204/404, denetim günlüğü) | **F13'ü tamamen bloklar** |

---

## 13. Onaylı sapmalar (mockup'tan bilinçli ayrılmalar)

> Kural (GOREV-SIRASI §3): mockup kanondur. Aşağıdakiler **tek tek kullanıcı
> tarafından onaylanmış** sapmalardır; "sapma" diye geri alınmaz, ama başka hiçbir
> sapma bu listeye dayanılarak meşrulaştırılamaz.

| Kod | Sapma | Mockup satırı | Gerekçe |
|---|---|---|---|
| **A** | İçerik ofseti `28px 32px` yerine kabuğun `24px 32px` değeri — **dikeyde 4px** | 61 | Ofset P2'de kabuk düzeyinde sabitlendi. Ekran başına ezmek kabuğu bölerdi; kabuğu değiştirmek Proje Detay + Şantiye Detay + BOQ baseline'larının **üçünü birden** kaydırırdı. 4px görsel olarak ihmal edilebilir, mimari maliyet ise büyük |
| **B** | Şantiye Detay sekme barına **7. sekme "İş Kalemleri"** eklendi (+ drill sidebar kalemi) | Şantiye Detay mockup'ında bu sekme yok | BOQ şantiyeye bağlı (backend `site_id`) ve mockup'taki giriş noktası (Sözleşmeler) **var olmayan** bir modül. Şantiye bağlamı tek gerçek ebeveyn. Sekme barı ile drill sidebar'ın **aynı öğeleri** taşıması P2 kanonu; birini eklemek diğerini zorunlu kılar. `santiye-detay` baseline kayması kabul edildi |
| **C** | Breadcrumb'ın sözleşmesiz hâli: `← {şantiye} · {proje} / {şantiye}`; `SZL-2025-001` **basılmaz** | 62 | `contracts` modülü yok (P5) ve GOREV-SIRASI §4.1 ileri bağ açılmasını yasaklıyor. Var olmayan bir sözleşme numarası basmak **uydurma veri** olurdu; görünür yer tutucu basmak da olmayan bir bağ vaat ederdi. Ölçüler (12px, `--color-text-subtle`, 6px alt boşluk, mavi link) birebir korunur |

### 13.1 Mockup'ta karşılığı olmayan, *kullanıcı kararıyla* eklenen yüzeyler

> Bunlar "sapma" değil **ek**tir: mockup'taki hiçbir piksel değişmez, mockup'ın
> sessiz kaldığı yerler doldurulur. Her biri kullanıcı kararıdır.

| Yüzey | Mockup'ta | Karar |
|---|---|---|
| `BoqItemFormModal` (oluşturma + düzenleme) | Form mockup'ı **yok** | Alanlar tablo sütunlarından türetilir (§7.1) |
| Poz satırının tıklanabilirliği + hover | Hover/eylem tanımı **yok** | Yeni piksel eklenmez, yalnız `cursor` + hover zemini (§7.2) |
| `+ Yeni Grup` seçeneği | "+ Grup" butonu **yok** | Yeni yüzey açılmaz, açılırın içinde kalır (§7.3) |
| Modalde `Sil` + onay adımı | Silme affordance'ı **yok** | Onaylandı; **BE-B'ye bağımlı** (§7.5) |
| Yazma butonlarının gizlenmesi | İzne göre değişen görünüm **yok** | Salt-okunur rolde gizlenir (§2.5) |
| `Tutar (hesaplanan)` önizlemesi | **yok** | Modalde salt-okunur satır (§7.1.3) |
| Yükleniyor / boş / hata metinleri | **yok** (dolu tablo çizilmiş) | §9.2 metin envanteri |

---

## 14. Task listesi (güncel)

> GOREV-SIRASI §1'deki F0–F11 listesi bu spec'in kararlarıyla **gözden geçirildi**;
> izin altyapısı ve silme akışı **iki yeni task** doğurdu (F12, F13). Numaralar
> GOREV-SIRASI ile hizalı kalsın diye mevcut F0–F11 **yeniden numaralanmadı**.

| Task | Ne yapılacak | Bağımlı | Durum |
|---|---|---|---|
| **F0** | Bu spec (revize edildi 2026-07-30) → **kullanıcı onayı**; sonra plan → **onay** | X2 | spec revize edildi |
| **F1** | Tip doğrulama kapısı: `BoqListResponse`, `BoqTotals`, `BoqItemCreate/Update`, `BoqGroupCreate/Update` üretilmiş mi (X2 yaptıysa no-op) | X2 | — |
| **F2** | Token'lar (§3.5 — 13 yeni token) + `formatDecimal/formatQuantity/formatAmount` (§3.4). **Yeni `ui/` primitive'i açılmaz** (§3.6) | F0 | — |
| **F3** | Hook'lar: `useBoq(siteId)` + `useBoqMutations` (grup/kalem POST + kalem PATCH). `boq` kökünün `ALLOWED_ROOTS`'ta olduğunu doğrula | F1 | — |
| **F4** | Rota kabuğu + breadcrumb (§2.3, sapma C) + sayfa başlığı + iki eylem butonu. Sekme + drill nav kalemi (§2.2, sapma B) | F2 | — |
| **F5** | Dört özet kartı — **dördü de yer tutucu**, `—` + `pendingModuleLabel` (§4) | F4 | — |
| **F6** | Poz tablosu: 7 sütun + grup başlık satırları + `Gerç. %` yer tutucu (**nötr**, eşik yok) | F4 | — |
| **F7** | GENEL TOPLAM satırı — tutar **gerçek**, yüzde yer tutucu (§5.5) | F6 | — |
| **F8** | `BoqItemFormModal`: `create` + `edit` kipleri, `+ Yeni Grup` iki adımlı yazma, tutar önizlemesi, doğrulamalar, satır tıklaması (§7.1–7.3). **Silme HARİÇ** | F3, F6, F12 | — |
| **F9** | "Excel İndir" + **BFF `Content-Type` düzeltmesi** (`proxyAuthenticatedRaw`, §8.1) + `export-filename.ts` genelleştirmesi + route regresyon testleri | F3, F4 | — |
| **F10** | Mockup karşılaştırma kapısı — sapmalar **satır no + beklenen + gerçek** ile; §13'te olmayan sapma **kabul edilmez** | F5–F9, F12 | — |
| **F11** | Görsel spec + review (react/ts) + a11y + ölü kod; **baseline üretimi Linux CI'da, üç baseline tek turda** (§11.2) | F10 | — |
| **F12** | 🆕 **İstemci izin altyapısı:** `src/lib/auth/permissions.ts` + `useModulePermission` hook'u (§2.5); BOQ yazma yüzeylerine bağlanması; bilinmezlik kuralı + testler | F0 | BE-A **olmadan da teslim edilir** (fallback = bugünkü davranış); gizleme BE-A ile devreye girer |
| **F13** | 🆕 **Silme akışı:** modalde `Sil` + onay adımı + `useDeleteBoqItem` + hata metinleri + testler (§7.5) | F8, **BE-B** | 🔴 **BLOKLU** — backend `DELETE /boq/items/{id}` ucu yok; uç gelene kadar başlanmaz |

**Sıra notu:** F12, F8'den **önce** bitmelidir (F8 yazma yüzeylerini `canWrite`
kapısının arkasına koyar). F13 bu dilimin PR'ından **çıkarılabilir**; BE-B geldiğinde
ayrı ve küçük bir PR olarak eklenir — bu dilim F13'ü beklemez.

**Bu dilimde teslim edilen task sayısı: 13** (F0–F12) · **bloklu: 1** (F13).
