# Ayarlar Mockup Reference — Pixel-Faithful Rebuild Spec

**Purpose:** Single source of truth for rebuilding all 9 Ayarlar (Settings) screens to match `../projedesign/Ayarlar*.dc.html` mockups exactly. Values below are extracted directly from mockup source (not guessed). Do not free-design — if a mockup value has no token, add one to `src/styles/tokens.css` per the mapping given; bare hex is forbidden per project CLAUDE.md.

**Source mockups** (repo-external, `/Users/furkanilgen/Documents/Projeler/insaat/projedesign/`):
`Ayarlar.dc.html` (Kullanıcılar landing) · `Ayarlar - Rol Yönetimi.dc.html` · `Ayarlar - İzin Matrisi.dc.html` · `Ayarlar - Şirket Bilgileri.dc.html` · `Ayarlar - Bildirimler.dc.html` · `Ayarlar - Görünüm.dc.html` · `Ayarlar - Entegrasyonlar.dc.html` · `Ayarlar - Yedekleme.dc.html` · `Ayarlar - Denetim Günlüğü.dc.html`

Screenshots rendered to `/private/tmp/claude-501/-Users-furkanilgen-Documents-Projeler-insaat/eb8210cf-ead2-4729-8a85-c303c8415553/scratchpad/mockshots/`: `01-ayarlar-kullanicilar.png` … `09-denetim-gunlugu.png`, `10-design-system.png` (this is a **scratchpad path**, not committed — re-render from mockup HTML if screenshots are needed again; see method in the task that produced this doc).

**IMPORTANT discrepancy found:** `../projedesign/uploads/FİİL ERP design system/Design System.dc.html` documents a **different, unrelated design language** — dark-luxury/blue-gray palette (`#020609`, `#5BA4F5`, `#3EC86C`, IBM Plex Sans/Mono, §5.B+§5.C token names like `--color-surface-0`). This does **not** match the actual Ayarlar mockups, which use Inter + JetBrains Mono, `#2563eb` blue, `#f0f4f8` background — i.e., they match the **current `src/styles/tokens.css`** almost exactly (see §A.9). This `Design System.dc.html` file appears to be a separate, later design-system exploration (see project memory "Design system çekirdek" — koyu tema geçişi, still in planning). **Do not pull colors from it for this rebuild** — use the Ayarlar mockups + existing `tokens.css` as ground truth. This reference document is scoped to the Ayarlar mockups only.

**Existing frontend state (checked before writing this doc):** F4 already shipped Kullanıcılar (`src/app/(app)/ayarlar/kullanicilar/page.tsx`), Roller (`.../roller/page.tsx`), İzin Matrisi (`.../izin-matrisi/page.tsx`), plus shared components in `src/components/settings/` (UsersScreen, RolesScreen, PermissionMatrix, UserFormModal, RoleFormModal, ProjectAccessModal, StatusBadge, Modal, ConfirmDialog, AccessDenied). The other 5 sections (Şirket Bilgileri, Bildirimler, Görünüm, Entegrasyonlar, Yedekleme, Denetim Günlüğü) have **no route and no component yet** — this doc's §B.4–§B.9 and §C are the primary net-new scope. §A/§B.1–§B.3 document the existing 3 screens' mockup fidelity for reference/audit of what's already built.

---

## A. Shared design primitives

### A.1 Settings sidebar

Fixed left column, `width: 240px` (mockup uses 240px consistently; the very first `Ayarlar.dc.html` uses 260px for the topbar-left-block only, everything else — including its own sidebar — is 240px; treat 240px as canon), `position: fixed; top: 52px; left: 0; bottom: 0`, `background: #fff`, `border-right: 1px solid #e2e8f0`, `overflow-y: auto`, `padding: 14px 0` (16px 0 in the very first users-landing page — negligible; use 14px 0 for new build to match the other 8 pages).

Structure (identical across all 9 pages, differs only in which item is "active"):

```
GENEL
  🏢 Şirket Bilgileri
  🔔 Bildirimler
  🎨 Görünüm
――― divider ―――
KULLANICI & ERİŞİM
  👤 Kullanıcılar
  🔐 Rol Yönetimi
  📋 İzin Matrisi
――― divider ―――
SİSTEM
  🔗 Entegrasyonlar
  📦 Yedekleme
  📜 Denetim Günlüğü
――― divider ―――
🚪 Çıkış Yap  (red)
```

- Group label: `padding: 0 10px 4px` (0 12px 6px on the users-landing variant), `font-size: 10px`, `font-weight: 600`, `color: #94a3b8`, `letter-spacing: 1px`, `text-transform: uppercase`.
- Item row: `padding: 8px 12px`, `border-radius: 8px`, `font-size: 13px`, `color: #475569`, no text-decoration (rendered as `<a>` on non-active items, plain `<div>` on the active one).
- **Active item:** `background: #eff6ff`, `font-weight: 600`, `color: #2563eb` (no border).
- List gap between items: `gap: 1px` (2px on users-landing).
- Divider: `height: 1px; background: #f1f5f9; margin: 10px 12px`.
- Çıkış Yap: `display:flex; align-items:center; gap:8px; margin:2px 8px; padding:8px 12px; border-radius:8px; color:#ef4444; font-size:13px` (font-weight:500 on users-landing only).

**Token mapping:**
| Mockup value | Existing token | New token needed? |
|---|---|---|
| `#fff` sidebar bg | `--color-surface` | no |
| `#e2e8f0` border | `--color-border` | no |
| `#94a3b8` group label | `--color-text-subtle` | no |
| `#475569` item text | `--color-text-secondary` | no |
| `#eff6ff` active bg | `--color-nav-active-bg` | no |
| `#2563eb` active text | `--color-primary` | no |
| `#f1f5f9` divider | `--color-divider` | no |
| `#ef4444` danger text | `--color-danger` | no |
| sidebar width 240px | none — F3 canon `--sidebar-width: 220px` is for the **main app** shell | **new:** `--settings-sidebar-width: 240px` (Ayarlar sidebar is narrower context than main 220px is actually *wider*; they are independent widths — do not conflate) |
| group label size 10px | none (closest is `--text-small: 11px`) | **new:** `--text-settings-nav-label: 10px` or reuse 11px if a 1px diff is deemed acceptable — flag for design sign-off |

**Back-link / breadcrumb behavior:** The very first `Ayarlar.dc.html` (Kullanıcılar landing) shows a **topbar** back-link `← Gösterge Paneli` (`font-size:12px; color:#2563eb`) instead of a breadcrumb, because it's the Ayarlar root. All **other 8 pages** instead show a **breadcrumb** in the topbar's middle flex area: `Ayarlar / <Sayfa Adı>` — `Ayarlar` is a link (`color:#2563eb`), `/` separator (`color:#e2e8f0`), current page (`font-weight:600; color:#1e293b`). Topbar right side then only shows `Çıkış Yap` (red link), no back-link, on those 8 pages. **Per project CLAUDE.md, the actual app must always show "← Gösterge Paneli" at the top of the Ayarlar sidebar returning to the main app shell** — reconcile by keeping breadcrumb in the topbar (matches 8/9 mockups) AND ensuring a way back to the dashboard exists (existing F3 shell topbar/logo already links home per `Ayarlar.dc.html`'s FİİL logo `href`). Topbar height is `52px` across all pages, `background:#fff`, `border-bottom:1px solid #e2e8f0`, `box-shadow:0 1px 3px rgba(0,0,0,0.06)` (maps to `--shadow-topbar`).

### A.2 Page header pattern

```html
<h1 style="font-size:22px;font-weight:700;color:#1e293b;margin-bottom:4px;">{Title}</h1>
<p style="font-size:13px;color:#94a3b8;margin-bottom:24px;">{Subtitle}</p>
```
Exception: the Kullanıcılar landing page (`Ayarlar.dc.html`) uses `font-size:24px` + `letter-spacing:-0.4px` + `margin-bottom:6px` for `<h1>` and `margin-bottom:28px` for `<p>` — this is the "root" page variant; all 8 sub-pages use the `22px`/no-letter-spacing/`4px`/`24px` variant above. Some sub-pages (Rol Yönetimi) put a primary action button inline with `<h1>` via `display:flex;justify-content:space-between`.

Content area itself: `margin-left: 240px; flex:1; padding: 28px 32px; animation: fadeUp 0.4s ease` (maps directly to existing `--anim-fade-up`).

**Token mapping:** `22px`→new `--text-page-title-settings: 22px` (distinct from existing `--text-page-title: 26px` used elsewhere — the Ayarlar module intentionally uses a smaller page title than the rest of the app; confirm with design before unifying). `13px`/`#94a3b8` subtitle → `--text-body`(13px)/`--color-text-subtle`. `24px` margin → `--space-6`.

### A.3 Pill-style tab strip

Used **only** on the Kullanıcılar landing page (`Ayarlar.dc.html`) — a local tab strip for Kullanıcılar/Rol Yönetimi/İzin Matrisi/Şirket **within the content area**, separate from the sidebar nav (this appears to be a legacy/alternate nav pattern in the mockup; the sidebar is the authoritative nav per CLAUDE.md, so this in-page tab strip is likely superseded by the sidebar and should NOT be rebuilt as a duplicate nav — flag to product owner. Documented here for completeness only):

```css
container: display:flex;gap:2px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:4px;width:fit-content;
button (inactive): padding:7px 16px;font-size:13px;color:#64748b;background:transparent;border:none;border-radius:7px;
button (active): padding:7px 16px;font-size:13px;font-weight:600;color:#2563eb;background:#eff6ff;border-radius:7px;
```
None of the other 8 sub-pages use this pattern — they rely solely on the sidebar. **Recommendation:** do not implement this duplicate tab strip in the rebuild; treat the sidebar as the single nav (already how F4 shipped it).

### A.4 Card primitive

Universal card used for every panel across all 9 pages:
```css
background:#fff; border-radius:14px; border:1px solid #e2e8f0; box-shadow:0 1px 4px rgba(0,0,0,0.06);
```
This is an **exact match** for existing tokens: `--radius-14: 14px` (wait — tokens.css only defines up to `--radius-14: 14px`? Check: tokens.css has `--radius-6/8/10/14` — yes, `--radius-14` exists) + `--color-border` + `--shadow-card: 0 1px 4px rgba(0,0,0,0.06)` (exact match, already defined). **No new token needed** — this card is already fully covered by F1 tokens.

Card header (when present): `padding:14px 18px; border-bottom:1px solid #e2e8f0` (some cards use `13px 18px`), title `font-size:14px;font-weight:600;color:#1e293b` (some use `13px` — Yedekleme's "Yedek Geçmişi" header uses `13px`). Count badge next to title: `font-size:11px;background:#f1f5f9;color:#64748b;padding:2px 8px;border-radius:10px` (pill). Header action area is `margin-left:auto` flex.

Card body padding when not a table: `padding: 20px` (form-style cards) or `18px` (Entegrasyonlar cards).

### A.5 Rich data table (Kullanıcı Listesi — `Ayarlar.dc.html`)

```
thead tr: background:#f8fafc; border-bottom:1px solid #e2e8f0
th: padding:10px 18px (first col) / 10px 12px (rest); font-size:11px; font-weight:600; color:#64748b; text-transform:uppercase; letter-spacing:0.8px
tbody tr: border-bottom:1px solid #f1f5f9 (last row: none)
td: padding:12px 18px (first col) / 12px (rest)
```
Columns: **Kullanıcı** (avatar cell) · **E-posta** · **Rol** (badge, centered) · **Proje Erişimi** · **Son Giriş** (centered) · **Durum** (badge, centered) · action column (empty header, "Düzenle" link).

**Avatar cell:** `34×34px`, `border-radius:8px`, `linear-gradient(135deg, colorA, colorB)` per-user 2-letter initials, `font-size:12px;font-weight:700;color:white`. Two-line text beside it: name (`13px/600/#1e293b`) + subtitle "Title · Company" or just "Title" (`11px/#94a3b8`).

Gradient pairs observed (assign deterministically, e.g. by role or hash of user id — mockup hardcodes per person):
| Role example | Gradient |
|---|---|
| Patron (Ahmet Yılmaz) | `#2563eb → #60a5fa` |
| Şantiye Şefi (Sercan Öztürk) | `#0f766e → #14b8a6` |
| Muhasebe (Ayşe Demir) | `#8b5cf6 → #a78bfa` |
| Proje Müdürü (Kadir Arslan) | `#f59e0b → #fbbf24` |
| Satınalma (Yusuf Kaya) | `#94a3b8 → #cbd5e1` |

**Role badge** (pill, `font-size:11px;font-weight:600;padding:3px 10px;border-radius:10px`), color per role:
| Role | bg | text |
|---|---|---|
| Patron | `#1e293b` | `white` |
| Şantiye Şefi | `#dbeafe` | `#2563eb` |
| Muhasebe | `#ede9fe` | `#7c3aed` |
| Proje Müdürü | `#fef3c7` | `#d97706` |
| Satınalma | `#f1f5f9` | `#64748b` |

**Durum badge** (`border-radius:20px;font-size:11px;font-weight:600;padding:3px 9px`): Aktif = `#dcfce7`/`#16a34a`; İzinde = `#fef3c7`/`#d97706`. (Passive/other status not shown in mockup — infer `#fee2e2`/`#dc2626` or `#f1f5f9`/`#64748b` by analogy with badge system elsewhere; confirm with design.)

**Proje Erişimi** column: plain text `12px/#475569`, values seen: "Tüm Projeler", "Güneşkent Konut" (single project name), "Tüm Projeler (Mali)", "Liman Altyapı, Çelik OSB" (comma-joined names), "Tüm Projeler (Stok)" — i.e. either **"Tüm Projeler"** + optional scope-qualifier in parens, or a **comma-joined list of project names**.

**Son Giriş** column: `12px/#64748b`, relative/absolute mixed format: `"Bugün 09:14"`, `"Dün 17:30"`, `"3 gün önce"` — i.e. today → `Bugün HH:mm`, yesterday → `Dün HH:mm`, older → `N gün önce`.

**Düzenle** action: `background:none;border:none;color:#2563eb;font-size:12px;font-weight:500`.

Search input (table header-right): `display:flex;gap:8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:6px 12px` with inline magnifier SVG (`13×13`, stroke `#94a3b8`) + `input` (`border:none;font-size:12px;color:#475569;width:120px`). Primary button beside it: `background:#2563eb;color:white;padding:7px 14px;border-radius:8px;font-size:12px;font-weight:600`.

### A.6 Master-detail layout (Rol Yönetimi)

`display:grid; grid-template-columns:290px 1fr; gap:20px`.

**Left column** (role list, `display:flex;flex-direction:column;gap:8px`): each role is a card, `border-radius:12px; padding:14px 16px`. Regular role: `background:#fff;border:1px solid #e2e8f0`. **System-role emphasis** (Sistem Yöneticisi — first item): `background:linear-gradient(135deg,#1e293b,#334155); border:2px solid #334155`, white text (`rgba(255,255,255,0.5)`/`0.65` for muted lines), plus a `SİSTEM` tag pill (`background:rgba(255,255,255,0.15);color:white;font-size:10px;padding:2px 7px;border-radius:8px;font-weight:600`, `margin-left:auto`). Non-gradient system roles (e.g. "Patron") get the same `SİSTEM` tag but on white card with `background:#1e293b;color:white` tag instead.

Each role card header row: emoji (`font-size:18px`) + name (`font-size:14px;font-weight:700` / `600` for non-system) + user-count subtitle (`font-size:11px;color:#94a3b8` or `rgba(255,255,255,0.5)`) + optional right-aligned user-count pill + "Düzenle" link (only shown on the compact users-landing "Roller" card, not on this master-detail page). Below: one-line summary of module scope, `font-size:12px;color:#64748b` (`rgba(255,255,255,0.65)` on gradient card).

Bottom of list: dashed "+ Özel Rol Oluştur" button — `background:#f8fafc;border:1px dashed #cbd5e1;border-radius:12px;padding:12px;font-size:12px;color:#94a3b8;font-weight:500`.

**Right column** (detail panel): card (`padding:20px`), header row = emoji (`28px`) + name (`16px/700`) + subtitle (`12px/#94a3b8`, e.g. "Sistem rolü · Her şeye tam erişim · Silinemez") + right-aligned "Kopyala" secondary button (`background:#f1f5f9;color:#475569;padding:7px 14px;border-radius:8px;font-size:12px`). Below a divider (`border-bottom:1px solid #f1f5f9;padding-bottom:16px;margin-bottom:18px`).

Optional info banner (system-role note): `background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px 14px` with a green check-circle SVG (`stroke:#16a34a`) + text `13px;color:#15803d;font-weight:500`.

"Modül Erişimleri" section label: `13px/600/#1e293b;margin-bottom:12px`. Then a `flex-column;gap:6px` list of module rows: `padding:10px 14px;background:#f8fafc;border-radius:8px` (or `background:#f0fdf4;border:1px solid #bbf7d0` for the two emphasized system-permission rows — Sistem Ayarları, Kullanıcı & Rol Yönetimi). Module label left (`13px;color:#1e293b`, `font-weight:600` for the two emphasized rows), access badge right (pill `11px;font-weight:600;padding:3px 10px;border-radius:10px`): `background:#dcfce7;color:#16a34a` = "Tam Erişim"; emphasized rows use inverted `background:#16a34a;color:white` with a trailing `✓`.

### A.7 Permission matrix (İzin Matrisi)

Full-width card, table `min-width:800px` inside `overflow:auto` container.

```
thead tr: background:#f8fafc; border-bottom:2px solid #e2e8f0 (note: 2px here vs 1px elsewhere — intentional heavier rule under header)
th: padding:12px 16px (first) / 12px 10px (rest); min-width:180px (first) / 90px (rest)
th (module col): font-size:12px;font-weight:600;color:#64748b
th (role cols): font-size:11px;font-weight:700; emoji + <br/> + role short-label; text color = that role's brand color (Sys.Yön/Patron:#1e293b, Şantiye Şefi:#2563eb, Muhasebe:#7c3aed, PM:#d97706, Satınalma:#475569)
```

**Group header rows** (module category separators) — only the **first** group ("GENEL") is rendered fully dark; subsequent groups (SAHA, STOK & SATINALMA, MALİ, SİSTEM) use a lighter muted style. Exact as-authored:
- First group row: `background:#1e293b; td: padding:8px 16px;font-size:11px;font-weight:700;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:0.5px` (colspan=7).
- All subsequent group rows: `background:#f8fafc; td: same size/weight but color:#94a3b8` (no dark bg).
- **Do not implement all group headers as uniformly dark** — the mockup itself is inconsistent (only row 1 of 5 groups is dark); pick one treatment intentionally when rebuilding (recommend: make all group headers consistently `background:#1e293b` for a cleaner rebuilt system, OR replicate mockup's actual inconsistency if pixel-fidelity to source is prioritized over internal consistency — flag for design decision).

**Cell values** — two visual forms:
1. Full/tam or none: plain text, no pill. `✓ Tam` = `color:#16a34a;font-weight:700`. `—` (none) = `color:#cbd5e1`.
2. Any other level: colored pill, `font-size:11px;padding:2px 7px;border-radius:8px;font-weight:600`.

**Access-level chip colors** (from both `İzin Matrisi.dc.html` and `Ayarlar.dc.html`'s preview table):
| Label | bg | text | Maps to backend (access_level, scope) — see §C |
|---|---|---|---|
| ✓ Tam (no pill, plain green text) | — | `#16a34a` | `full, all` (or `admin, all` for Sys. Yön./"Süper") |
| — (no pill, plain muted text) | — | `#cbd5e1` | `none, all` |
| Sınırlı | `#dbeafe` | `#2563eb` | `view, limited` |
| Mali | `#dbeafe` | `#2563eb` | `view, finance` |
| Kendi | `#dbeafe` | `#2563eb` | `view, own` |
| Proje | `#dbeafe` | `#2563eb` | `view, project` |
| Stok | `#dbeafe` | `#2563eb` | `view, stock` |
| Görüntüle | `#fef3c7` | `#d97706` | `view, all` |
| Talep | `#dbeafe` | `#2563eb` | `request, all` |
| Onay | `#dcfce7` | `#16a34a` | `approve, all` |
| Taslak | `#dbeafe` | `#2563eb` | `draft, project` |

Note: the users-landing preview matrix (`Ayarlar.dc.html`) uses slightly different chip colors for the same labels (e.g. "Görüntüle" = `#fef3c7`/`#d97706` there too but "Taslak"=`#fef3c7`/`#d97706` and "Onay"=`#dcfce7`/`#16a34a` — consistent) — **use the dedicated İzin Matrisi page's palette above as canon** since it's the full/authoritative page; the landing preview is a condensed duplicate.

Bottom action bar: `display:flex;justify-content:flex-end;gap:10px;margin-top:16px`. Secondary "İptal": `background:#fff;color:#475569;border:1px solid #e2e8f0;padding:10px 20px;border-radius:8px;font-size:13px`. Primary "Değişiklikleri Kaydet": `background:#2563eb;color:white;border:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600`.

### A.8 Buttons, badges, inputs, toggles (cross-page inventory)

**Primary button:** `background:#2563eb;color:white;border:none;border-radius:8px;font-size:13px;font-weight:600;padding:9-10px 16-20px` (smaller variant `7px 14px` / `12px` font in table-header contexts). Maps to `--color-primary` + `--radius-8`.

**Secondary/ghost button:** `background:#fff;color:#475569;border:1px solid #e2e8f0;border-radius:8px;padding:10px 20px;font-size:13px` (İptal buttons); or `background:#f1f5f9;color:#475569;border:none` (Kopyala, Ayarlar-card actions).

**Danger text link:** `color:#ef4444` (Çıkış Yap).

**Text/icon-less link button:** `background:none;border:none;color:#2563eb;font-size:12px;font-weight:500` (Düzenle, Geri Yükle).

**Status/connection badges** (Entegrasyonlar cards): Bağlı = `#dcfce7`/`#16a34a` + `✓`; Yapılandırılmadı = `#fef3c7`/`#d97706`; Bağlı Değil = `#f1f5f9`/`#64748b`. All pill `font-size:11px;font-weight:600;padding:3px 10px;border-radius:10px`.

**Form inputs** (text/select/textarea, Şirket Bilgileri): `width:100%;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;font-size:13px;color:#1e293b`. Label above: `font-size:12px;font-weight:500;color:#64748b;margin-bottom:4px`. Monospace variant (`font-family:'JetBrains Mono',monospace`) used for codes (GİB kodu, hex color value) — maps to `--font-mono`.

**Toggle switch** (Otomatik e-Fatura, Yedekleme schedules): track `width:36px;height:20px;background:#2563eb;border-radius:10px` (on state — mockup shows no explicit "off" state, infer `background:#cbd5e1` or `#e2e8f0` for off), knob `width:16px;height:16px;background:white;border-radius:50%;position:absolute;right:2px;top:2px` (off state would be `left:2px`).

**Checkbox rows** (Bildirimler): native `<input type=checkbox accent-color:#2563eb>` + label `12px;color:#475569`.

**Search input** (also used in Denetim Günlüğü filters): `background:#fff` (vs `#f8fafc` in table-header search) `border:1px solid #e2e8f0;border-radius:8px;padding:7px 14px`.

### A.9 Color palette + typography (from mockups; cross-checked against `src/styles/tokens.css`)

All colors used across the 9 Ayarlar mockups already exist in `tokens.css` — **no new base color tokens are required**, only the layout/size tokens flagged in §A.1/A.2. Confirmed matches:

| Mockup hex | Token |
|---|---|
| `#f0f4f8` | `--color-bg` |
| `#ffffff` | `--color-surface` |
| `#f8fafc` | `--color-surface-2` |
| `#f1f5f9` | `--color-surface-muted` / `--color-divider` (same value, contextual) |
| `#1e293b` | `--color-text` / `--color-text-strong` |
| `#475569` | `--color-text-secondary` / `--color-label` |
| `#64748b` | `--color-text-muted` |
| `#94a3b8` | `--color-text-subtle` |
| `#e2e8f0` | `--color-border` |
| `#cbd5e1` | `--color-border-strong` |
| `#2563eb` | `--color-primary` |
| `#1d4ed8` | `--color-primary-hover` |
| `#eff6ff` | `--color-nav-active-bg` |
| `#dbeafe` | `--color-primary-soft` |
| `#16a34a` | `--color-success` |
| `#dcfce7` | `--color-success-soft` |
| `#f59e0b` / `#d97706` | `--color-warning` (mockup uses both shades for warning family — `#f59e0b` for solid fills, `#d97706` for pill text) |
| `#fef3c7` | `--color-warning-soft` |
| `#ef4444` / `#dc2626` | `--color-danger` (two shades used; `#dc2626` for "Silme" audit-log pill text specifically) |
| `#fee2e2` | `--color-danger-soft` |
| `#7c3aed` / `#8b5cf6` | **not in tokens.css** — Muhasebe-role purple family. **New tokens needed:** `--color-accent-purple: #7c3aed` (text/pill), `--color-accent-purple-soft: #ede9fe` (pill bg), `--color-accent-purple-gradient-start:#8b5cf6`/`-end:#a78bfa` (avatar gradient). |
| `#0f766e` / `#14b8a6` | teal, avatar gradient only — **new tokens:** `--color-accent-teal-start:#0f766e` / `-end:#14b8a6` |
| `#fbbf24`, `#60a5fa`, `#cbd5e1` (gradient ends) | avatar-gradient companions to existing primary/warning — new tokens `--color-avatar-amber-end:#fbbf24`, `--color-avatar-blue-end:#60a5fa`, `--color-avatar-slate-end:#cbd5e1` |
| `#f0fdf4`/`#bbf7d0` | success-tint variant distinct from `--color-success-soft` (`#dcfce7`) — **new tokens:** `--color-success-tint:#f0fdf4`, `--color-success-tint-border:#bbf7d0` (used for info banners / emphasized-permission rows) |
| `#334155` | **new:** `--color-slate-700:#334155` (gradient/border on Sistem Yöneticisi card) |

Typography: `font-family: 'Inter'` body (matches `--font-sans`), `'JetBrains Mono'` for numeric/code fields (matches `--font-mono`) — both already loaded per mockup `<link>` tags, consistent with tokens.css comment "Inter (gövde), JetBrains Mono (sayısal/tablo)". Sizes seen: `10, 11, 12, 13, 14, 16, 18, 22, 24px` — `11/12/13` are the workhorses (`--text-small`≈11, need `--text-xs`=12? tokens.css only has `--text-xs:0.75rem`(12px), `--text-sm:0.875rem`(13px) — both already covered). `22px` page title needs new token per §A.2. `24px`/`28px`/`36px` emoji sizes are inline, not tokenized (acceptable — decorative emoji sizing, not text tokens).

---

## B. Per-section layout

### B.1 Kullanıcılar (landing, `Ayarlar.dc.html` → screenshot `01-ayarlar-kullanicilar.png`)
Sidebar active: 👤 Kullanıcılar. Content: page header (24px variant) → local pill tab strip (§A.3, recommend dropping) → **Kullanıcı Listesi** card (§A.5 rich table, header has count badge "8 kullanıcı" + search + "+ Kullanıcı Ekle" primary button) → below, a 2-column grid (`1fr 1fr`) of **Roller** card (compact role list, §A.6-lite: emoji+name+user-count pill+Düzenle, one-line module summary, "+ Rol Ekle" header button) and **İzin Matrisi** card (condensed preview table, 5 role columns, first 9 modules only, no group headers — just a flat table, §A.7 chip palette). This page is a dashboard/overview; the dedicated Rol Yönetimi and İzin Matrisi pages (B.2/B.3) are the full editors.

### B.2 Rol Yönetimi (`Ayarlar - Rol Yönetimi.dc.html` → `02-rol-yonetimi.png`)
Sidebar active: 🔐 Rol Yönetimi. Header: `<h1>Rol Yönetimi</h1>` + inline "+ Yeni Rol" primary button (flex space-between) + subtitle. Body: §A.6 master-detail grid (290px list + 1fr detail). List shows 6 roles (Sistem Yöneticisi gradient-emphasized, then Patron/Şantiye Şefi/Muhasebe/Proje Müdürü/Satınalma as plain cards) + dashed "+ Özel Rol Oluştur". Detail panel shows selected role (Sistem Yöneticisi in mockup) with 10 module-access rows, 2 of which are emphasized system-permission rows.

### B.3 İzin Matrisi (`Ayarlar - İzin Matrisi.dc.html` → `03-izin-matrisi.png`)
Sidebar active: 📋 İzin Matrisi. Header (no inline button). Single full-width card containing §A.7 grouped table: 5 groups (GENEL: Gösterge Paneli, Onay Kutusu · SAHA: Günlük Kayıt, Puantaj, Personel, Bordro · STOK & SATINALMA: Stok & Depo, Satınalma & Teklif · MALİ: Hakedişler, Muhasebe, Hazine · SİSTEM: Ayarlar, Kullanıcı & Rol Yönetimi), 6 role columns (Sys. Yön./Patron/Şantiye Şefi/Muhasebe/PM/Satınalma). Bottom action bar (İptal / Değişiklikleri Kaydet).

### B.4 Şirket Bilgileri (`Ayarlar - Şirket Bilgileri.dc.html` → `04-sirket-bilgileri.png`)
Sidebar active: 🏢 Şirket Bilgileri. Header, no inline button. Body: 2×2 grid (`1fr 1fr`) of form cards: **Firma Bilgileri** (Firma Adı, Vergi No, Vergi Dairesi, Ticaret Sicil No, KEP Adresi — all text inputs), **İletişim & Adres** (Telefon, E-posta, Web Sitesi, Adres textarea), **Logo & Marka** (80×80 logo preview with gradient placeholder + "↑ Logo Yükle" file-upload button styled as a chip + "Birincil Renk" color swatch+hex input), **Fatura & e-Fatura Ayarları** (GİB Entegrasyon Kodu monospace input, e-Arşiv Portalı select, KDV Oranı select, "Otomatik e-Fatura" toggle row). Bottom-right: İptal + Değişiklikleri Kaydet (§A.7 button style).

### B.5 Bildirimler (`Ayarlar - Bildirimler.dc.html` → `05-bildirimler.png`)
Sidebar active: 🔔 Bildirimler. Body: vertical stack (`gap:16px`) of 3 category cards — **💰 Hakediş & Ödeme**, **📦 Stok & Satınalma**, **👷 Saha & İK** — each card header has muted bg (`#f8fafc`) + emoji+title, body is rows of `{event name (13px/500) + description (11px/#94a3b8)} ⟷ {3 checkboxes: E-posta / Uygulama / SMS}`, each row `padding:12px 18px` with `1px solid #f1f5f9` divider except last row per card. 9 total notification rows across 3 cards with varying pre-checked defaults per channel (not uniformly all-on). Bottom-right: single "Kaydet" primary button (no İptal on this page — differs from B.4/B.6).

### B.6 Görünüm (`Ayarlar - Görünüm.dc.html` → `06-gorunum.png`)
Sidebar active: 🎨 Görünüm. Body: 2×2 grid of cards — **Tema** (3-up radio-card grid: Açık/Koyu/Sistem, each a mini browser-chrome preview swatch, selected has `border:2px solid #2563eb`), **Vurgu Rengi** (7 color-swatch circles, `36px`, selected has `border:3px solid #bfdbfe` halo), **Dil & Bölge** (Arayüz Dili / Para Birimi / Tarih Formatı selects), **Arayüz Yoğunluğu** (3 radio rows: Rahat/Normal/Kompakt, selected row has `border:2px solid #2563eb;background:#eff6ff`). Bottom-right: single "Kaydet" button.

### B.7 Entegrasyonlar (`Ayarlar - Entegrasyonlar.dc.html` → `07-entegrasyonlar.png`)
Sidebar active: 🔗 Entegrasyonlar. Body: 3-column grid (`repeat(3,1fr)`) of 6 integration cards, each: 44×44 tinted icon-box + name + subtitle, one-line description, footer row = status badge (§A.8) + action button ("Ayarlar" secondary if connected, "Bağla" primary if not). Cards: GİB e-Fatura (bağlı), Logo e-Fatura (bağlı), Ziraat Bankası API (bağlı), SGK e-Bildirge (yapılandırılmadı), WhatsApp Business (bağlı değil), Bulut Depolama (bağlı değil).

### B.8 Yedekleme (`Ayarlar - Yedekleme.dc.html` → `08-yedekleme.png`)
Sidebar active: 📦 Yedekleme. Body: full-width success banner (`linear-gradient(135deg,#16a34a,#22c55e)`, white text, ✅ emoji, "Son Yedekleme Başarılı" + timestamp/size/location detail line + right-aligned "Manuel Yedek Al" ghost-on-color button) → 2-col grid: **Otomatik Yedekleme** (2 toggle rows: Günlük/Haftalık + Saklama Süresi select + Depolama Konumu select) and **Depolama Kullanımı** (big centered JetBrains-Mono stat "24,8 GB / 100 GB toplam" + progress bar (`height:8px`, filled `linear-gradient(90deg,#2563eb,#60a5fa)`) + 3-row breakdown list: Veritabanı/Belgeler & Dosyalar/Fotoğraflar with mono sizes) → **Yedek Geçmişi** table card (Tarih[mono]/Tür/Boyut[mono,right]/Durum[badge]/Geri Yükle-link columns, 4 rows).

### B.9 Denetim Günlüğü (`Ayarlar - Denetim Günlüğü.dc.html` → `09-denetim-gunlugu.png`)
Sidebar active: 📜 Denetim Günlüğü. Body: filter bar (`gap:10px`) = search input (max-width 300px) + 3 selects (Tüm Kullanıcılar / Tüm İşlemler / Son 7 Gün) + "Excel" export ghost button → full-width table card: columns Zaman(mono)/Kullanıcı(two-line: name 13px/600 + role 10px/#94a3b8)/İşlem(centered badge)/Detay(text)/IP Adresi(mono). Action-type badges: Giriş=`#dcfce7`/`#16a34a`, Oluşturma=`#dbeafe`/`#2563eb`, Onay=`#f0fdf4`/`#16a34a` (distinct tint from Giriş despite same-ish hue), Güncelleme=`#fef3c7`/`#d97706`, Silme=`#fee2e2`/`#dc2626` (row itself also tinted `background:#fff7f7` — the only row-level background tint in the table), Yedekleme=`#f1f5f9`/`#64748b`.

---

## C. Backend mapping

Backend contract reference confirmed two ways: (1) `docs/superpowers/specs/2026-07-18-frontend-f4-ayarlar-design.md` §10 (B3 live OpenAPI) + checking `src/app/(app)/ayarlar/*` for what the frontend already ships; (2) a direct backend-code audit (`/Users/furkanilgen/Documents/Projeler/insaat/backend`) done for this doc — the audit found **more backend support than the frontend currently exposes**: Şirket Bilgileri, Bildirimler, and Görünüm all have real models/endpoints already, they're just not wired into any frontend route yet (only Kullanıcılar/Roller/İzin Matrisi have pages today).

### C.1 Kullanıcılar — mostly supported, 2 known gaps
- Supported: `app/modules/users/models.py:19-48` `User(id, email, full_name, title, role_id, status)`, status enum `active/on_leave/passive` (lines 13-16). Full CRUD + password-reset + project-access router (`app/modules/users/router.py`): `GET/POST /users`, `GET/PATCH/DELETE /users/{id}`, `PATCH /users/{id}/password`, `GET/PUT /users/{id}/project-access`.
- **Gap 1 — "Son Giriş" (last_login): smaller than expected.** The `User` model already has a `last_login_at` column (nullable, `models.py:33`) — it is simply **not exposed** in `UserResponse` (`app/modules/users/schemas.py:38-46` only returns `id, email, full_name, title, role_id, status`). This is a quick backend fix (add the field to the response schema), not a missing-data problem. Until exposed, hide the column or show "—"; do not fabricate a value.
- **Gap 2 — "Proje Erişimi" summary column.** `UserProjectAccess` (`users/models.py:51-67`: `user_id, project_id (nullable), all_projects`) exists, and repository methods return project-id UUIDs only, no name join (`users/repository.py:45-70`). Resolving the mockup's "Tüm Projeler" / "Güneşkent Konut" / "Liman Altyapı, Çelik OSB" text requires a **separate** `GET /users/{id}/project-access` call per row plus a name-join via `GET /projects` (`ProjectResponse{id,code,name,status,budget,progress_pct}`, `app/modules/projects/router.py:18-27` — read-only reference, no project CRUD). **Recommendation:** accept the client-side N+1 (small user counts expected) and resolve via `useProjects()` + per-user project-access fetch, or request a backend enrichment (bulk endpoint or embedded summary field) before building this column — document the chosen approach in the implementation plan.
- Role seed data (`app/modules/roles/seed_data.py:13-70`) has **8 roles**, not 6: `system_admin, patron, site_chief, field_engineer, hr_manager, accounting, project_manager, procurement`. The mockup only shows 6 (Patron/Şantiye Şefi/Muhasebe/Proje Müdürü/Satınalma + implicit Sistem Yöneticisi) — 2 extra seeded roles (Saha Mühendisi = field_engineer, İK Müdürü = hr_manager) have no mockup badge color defined; assign colors consistent with the palette in §A.5 when building (don't invent off-palette colors).

### C.2 Rol Yönetimi — fully supported except "Kopyala"
`app/modules/roles/models.py:22-30` `Role(id, key, name, emoji, description, is_system)`. Router `app/modules/roles/router.py`: `GET/POST /roles` (26-76), `PATCH/DELETE /roles/{id}` (79-118, `is_system` blocks edits on protected roles). **Gap: no "copy role" endpoint exists.** "Kopyala" must be implemented client-side: read source role → `POST /roles` with copied `name/emoji/description` (new `key`) → then replicate its 13 permission rows via 13× `PUT /roles/{id}/permissions/{module_key}`. Flag this composite-client-flow requirement in the implementation plan.

### C.3 İzin Matrisi — fully supported
Modules (13, `app/modules/roles/seed_data.py:72-106`): dashboard, approvals, site_diary, timesheet, personnel, payroll, inventory, procurement, progress_payments, accounting, treasury, settings, user_management — matching the mockup's GENEL/SAHA/STOK_SATINALMA/MALI/SISTEM groups. Two-axis access model, not a flat enum (`app/core/access.py:10-27`): `AccessLevel(none,view,draft,request,approve,full,admin)` × `Scope(all,own,project,finance,stock,limited)`, stored in `RolePermission` (`roles/models.py:33-65`, unique on role_id+module_id). Router: `GET /modules`, `GET/PUT /roles/{id}/permissions[/{module_key}]`. The 12-preset mapping in F4 design §4.3 / this doc's §A.7 chip table covers every mockup chip label with no gap (Tam=full/all, Süper=admin/all, Görüntüle=view/all, Sınırlı=view/limited, Mali=view/finance, Kendi=view/own, Proje=view/project, Stok=view/stock, Taslak=draft/project, Talep=request/all, Onay=approve/all, none=none/all).

### C.4 Şirket Bilgileri — EXISTS, not yet wired to a frontend route
`app/modules/company/models.py:22-64` — single-row `Company(name, tax_number, tax_office, trade_registry_no, kep_address, phone, email, website, address, logo [bytea+content_type+filename], brand_color, gib_integration_code, earsiv_portal, default_vat_rate, auto_einvoice)` — a near 1:1 field match with the mockup's Firma Bilgileri / İletişim & Adres / Logo & Marka / Fatura & e-Fatura Ayarları cards. Router `app/modules/company/router.py`: `GET/PUT /company` + logo CRUD endpoints. Migration `6c98d5b8b142_b4_company_settings_tablolari.py`. **Note:** the e-Fatura fields (`gib_integration_code`, `earsiv_portal`) are static config values only — there is no live GİB/Logo e-Fatura connector behind them (that's §C.7's gap). **No known field gaps** — this page can be built against real data; only needs a `src/app/(app)/ayarlar/sirket-bilgileri/page.tsx` + form wiring, same pattern as the existing 3 pages.

### C.5 Bildirimler — EXISTS (storage only, no delivery), event-count gap
`app/modules/settings/models.py:86-107` — `NotificationPref(event_key, email, in_app, sms)` per user, unique on `(user_id, event_key)`. Router: `GET/PUT /settings/notifications`. **Note:** the model docstring explicitly states v1 stores preferences only — no actual email/SMS/push delivery is implemented, so toggling these won't send real notifications yet (that's expected/by design for this phase, not a build blocker). **Gap:** only **5 events** are defined in `app/modules/settings/constants.py:6-42`, but the mockup shows **7 rows across 3 categories** (💰 Hakediş & Ödeme: yeni hakediş talebi / onaylandı / KDV vade yaklaşıyor = 3 rows · 📦 Stok & Satınalma: kritik stok uyarısı / satınalma onay bekliyor = 2 rows · 👷 Saha & İK: bordro ödeme günü / günlük kayıt girilmedi = 2 rows). **Reconcile the exact event list with backend `constants.py` before building** — either add the missing event keys to the backend constant list or trim the mockup's rows to match; do not invent client-only event rows that silently no-op on save.

### C.6 Görünüm — EXISTS, but theme is locked to light-only
`app/modules/settings/models.py:43-83` — `UserPreferences(locale, currency, date_format, density, theme, accent_color)` — matches the mockup's Dil & Bölge (Arayüz Dili→locale, Para Birimi→currency, Tarih Formatı→date_format) and Arayüz Yoğunluğu (→density) cards almost exactly, plus `theme`/`accent_color` for the Tema and Vurgu Rengi cards. Router: `GET/PUT /settings/preferences`. **Constraint: `PreferencesUpdate._only_light_theme` validator (`app/modules/settings/schemas.py:30-36`) rejects any `theme` value except `"light"`** — Koyu/Sistem are modeled in the schema but **disabled server-side per spec §9** (matches this project's own CLAUDE.md: "Açık tema, ≥1280px... koyu tema yok" — this is intentional, not a bug). **Build implication:** render the Koyu/Sistem theme-preview cards as mockup shows (visual fidelity) but disable selecting them (or show a "yakında" tooltip) since the backend will 4xx on any non-light value — do not silently let the toggle appear functional.

### C.7 Entegrasyonlar — NO backend support (confirmed)
No integration/webhook/connector model anywhere in the backend (grep for integration/webhook/efatura/gib found nothing beyond Company's static e-Fatura config fields in §C.4). **Required for real functionality:** an `integrations` config store + per-integration OAuth/API-key flow for each of the 6 mockup cards (GİB e-Fatura, Logo e-Fatura, Ziraat Bankası API, SGK e-Bildirge, WhatsApp Business, Bulut Depolama) — effectively 6 separate external-system integrations, the largest single gap of the 9 sections. Build as static/informational UI (cards render with hardcoded status badges) until real integration work is scoped; do not wire "Bağla"/"Ayarlar" buttons to anything real without flagging to the user first.

### C.8 Yedekleme — NO backend support (confirmed)
Zero matches for "backup" anywhere in the backend. "Son Yedekleme Başarılı" banner, automatic-backup toggles, storage-usage stats, and Yedek Geçmişi table have no data source. **Required:** a backup-job table (timestamp, type, size, status) + `GET /backups`, `POST /backups` (manual trigger), `POST /backups/{id}/restore`, plus real storage-usage introspection — infrastructure-level work tied to the actual DB/file backup mechanism, not a typical CRUD add. Flag as a distinct ops workstream; build UI as static/placeholder until then.

### C.9 Denetim Günlüğü — NO generic backend support (confirmed)
No audit/activity_log table exists. The only proxies are `User.last_login_at` (single value, no history — see §C.1) and generic `created_at`/`updated_at` columns with no actor/IP tracking; `site_diary` is domain-specific, not a general audit trail. **Required:** a generic `audit_log` table + a mutation hook/middleware that writes an entry on security-sensitive actions at minimum (login, role/permission changes, deletions, approvals — ideally all mutating requests) + `GET /audit-log` with filter params matching the mockup's filters (user, action-type, date-range) + an Excel-export endpoint or client-side XLSX generation from the fetched page. This is cross-cutting instrumentation, not a single-table CRUD add — flag as its own workstream. Build UI as static/placeholder until then.

### Summary table

| Section | Backend status | Build approach |
|---|---|---|
| Kullanıcılar | Supported; `last_login_at` exists on model but not in response schema (quick fix); project-access summary needs client-side join or backend enrichment | Ship real data; fix schema gap, decide join strategy, flag both to user |
| Rol Yönetimi | Fully supported; "Kopyala" has no endpoint | Ship real; implement Kopyala as client-composite (create + copy 13 permission rows) |
| İzin Matrisi | Fully supported | Ship real |
| Şirket Bilgileri | **Fully supported, unused** (`Company` model + `GET/PUT /company` + logo endpoints exist) | Ship real — just needs a new route + form wiring |
| Bildirimler | **Supported, storage-only** (no delivery yet — by design); only 5 of ~7 mockup event rows exist in backend constants | Ship real for the 5 existing events; reconcile the remaining rows with backend before building them |
| Görünüm | **Supported**, but theme locked server-side to light only | Ship real; disable Koyu/Sistem theme selection (visual-only preview), rest is fully functional |
| Entegrasyonlar | No backend (6 separate integrations) | Static/informational UI, flag as largest gap |
| Yedekleme | No backend (ops-level) | Static UI, flag as ops workstream |
| Denetim Günlüğü | No backend (no generic audit trail) | Static UI, flag as cross-cutting instrumentation workstream |
