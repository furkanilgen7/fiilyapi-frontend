# Ayarlar (Settings) Pixel-Faithful Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild all 9 FİİL Yapı ERP "Ayarlar" screens to match the `../projedesign/Ayarlar*.dc.html` mockups exactly, with a settings-sidebar navigation takeover, restyling the 3 existing data-wired screens and adding 6 new sections (3 fully wired to existing backend, 3 static placeholder).

**Architecture:** An `(app)/ayarlar` route-group layout replaces the global app Sidebar with a purpose-built **settings sidebar** (`← Gösterge Paneli` back-link + GENEL/KULLANICI & ERİŞİM/SİSTEM groups + `Çıkış Yap`) and a **breadcrumb topbar overlay**. All screens are composed from a shared set of settings primitives (card, rich-table, badges, form controls) driven by design tokens. Data-wired screens reuse the existing TanStack Query hooks unchanged; only the view layer is rebuilt. Static screens render hardcoded, visibly-non-functional UI.

**Tech Stack:** Next.js 15 App Router · React 19 · TypeScript strict · **pnpm only** · raw CSS + `src/styles/tokens.css` (no Tailwind) · TanStack Query (existing hooks) · `openapi-fetch` BFF client · Vitest (unit) · Playwright (visual, Linux-only baselines).

## Global Constraints

- **pnpm only.** Never `npm`/`yarn`. Gates: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`. Visual: `pnpm test:visual`.
- **Mockup is law.** Every value comes from `../projedesign/Ayarlar*.dc.html` + the reference doc `docs/superpowers/specs/2026-07-19-ayarlar-mockup-reference.md`. No free design. When a mockup detail conflicts with architecture, the mockup wins unless flagged as an **OPEN QUESTION**.
- **No bare hex in CSS.** Every color/size is a `var(--token)`. New values → add a token to `src/styles/tokens.css` first (Task 1).
- **Code/identifiers/filenames English; UI text + comments Turkish.** Commit titles English: `<type>: <desc>`.
- **Component props typed** (`type Props = {}`), no `any`, immutable updates, files < 800 lines (target 200–400), functions < 50 lines, early returns over deep nesting.
- **Server/Client boundary:** default Server Component; add `"use client"` (line 1) only when hooks/state/handlers are used.
- **Visual baselines are Linux-only.** Never commit macOS `*.png` snapshots. New/changed visual specs are committed **without** baselines; baselines are generated on CI via the `visual-baselines.yml` `workflow_dispatch` and the resulting `linux-baselines` artifact is committed by the maintainer. Locally, run `pnpm test:visual` only to confirm the spec executes (it will fail on missing snapshot — that is expected and must NOT block).
- **Every route/UI task ends with a `pnpm build` gate.** Route-group + Suspense boundary build errors are a known trap; a green `pnpm build` is the task's exit criterion.
- **Theme is server-locked to light.** `PreferencesUpdate._only_light_theme` rejects any non-`light` theme (backend `settings/schemas.py`). Koyu/Sistem theme cards render but are non-selectable.
- **Reduced motion:** the `fadeUp` content animation must be wrapped in `@media (prefers-reduced-motion: no-preference)`.

---

## File Structure (decisions locked here)

```
src/
├── styles/tokens.css                         (MODIFY — Task 1: ~16 new tokens)
├── components/settings/
│   ├── shell/                                (NEW — Task 2)
│   │   ├── SettingsSidebar.tsx               settings nav takeover
│   │   ├── SettingsBreadcrumb.tsx            topbar breadcrumb overlay
│   │   ├── SettingsHeader.tsx                h1 + subtitle (+ optional action)
│   │   ├── settings-nav-config.ts            9 items in 3 groups
│   │   └── settings-shell.css
│   ├── primitives/                           (NEW — Task 1)
│   │   ├── SettingsCard.tsx                  card + header/count-badge/actions
│   │   ├── RolePill.tsx                      per-role colored pill
│   │   ├── UserAvatar.tsx                    gradient 2-letter avatar
│   │   ├── AccessChip.tsx                    matrix/preview access chip
│   │   ├── settings-primitives.css
│   │   └── role-visuals.ts                   role→color/gradient map (logic, TDD)
│   ├── users/UsersScreen.tsx                 (REWRITE — Task 3, restyle)
│   ├── roles/RolesScreen.tsx                 (REWRITE — Task 4, master-detail)
│   ├── roles/role-summary.ts                 (NEW — Task 4, module-scope summary, TDD)
│   ├── permissions/PermissionMatrix.tsx      (REWRITE chrome only — Task 5)
│   ├── company/CompanyScreen.tsx             (NEW — Task 6)
│   ├── notifications/NotificationsScreen.tsx (NEW — Task 7)
│   ├── appearance/AppearanceScreen.tsx       (NEW — Task 8)
│   ├── integrations/IntegrationsScreen.tsx   (NEW — Task 9, static)
│   ├── backup/BackupScreen.tsx               (NEW — Task 10, static)
│   ├── audit/AuditLogScreen.tsx              (NEW — Task 11, static)
│   └── ... (existing modals reused unchanged: UserFormModal, RoleFormModal, ProjectAccessModal, PasswordResetModal, ConfirmDialog, Modal, AccessDenied)
├── lib/
│   ├── settings/last-login.ts                (NEW — Task 3, relative-time formatter, TDD)
│   └── api/hooks/
│       ├── useCompany.ts                     (NEW — Task 6)
│       ├── useNotificationPrefs.ts           (NEW — Task 7)
│       └── usePreferences.ts                 (NEW — Task 8)
├── app/(app)/ayarlar/
│   ├── layout.tsx                            (REWRITE — Task 2: sidebar takeover)
│   ├── ayarlar.css                           (REWRITE — Task 2)
│   ├── page.tsx                              (KEEP — redirect to /kullanicilar)
│   ├── kullanicilar/page.tsx                 (KEEP wrapper — Task 3)
│   ├── roller/page.tsx                       (KEEP wrapper — Task 4)
│   ├── izin-matrisi/page.tsx                 (KEEP wrapper — Task 5)
│   ├── sirket-bilgileri/page.tsx             (NEW — Task 6)
│   ├── bildirimler/page.tsx                  (NEW — Task 7)
│   ├── gorunum/page.tsx                      (NEW — Task 8)
│   ├── entegrasyonlar/page.tsx               (NEW — Task 9)
│   ├── yedekleme/page.tsx                    (NEW — Task 10)
│   └── denetim-gunlugu/page.tsx              (NEW — Task 11)
├── lib/api/schema.d.ts                       (REGEN — Task 3a via gen:api)
└── openapi/openapi.json                      (REGEN — Task 3a from backend)
e2e/
├── mock-backend.ts                           (MODIFY — Task 3a/13: add /company,/settings routes + more seed)
└── ayarlar-visual.spec.ts                    (NEW — Task 13; extends existing settings-visual.spec.ts)
```

**Route strategy note (KEEP `roller` slug):** the existing route segment is `/ayarlar/roller` but the sidebar/breadcrumb label is "Rol Yönetimi". Keep the URL slug `roller` (no rename — avoids breaking the existing route + visual snapshot names); only the visible label changes. Confirmed against mockup: mockups are static and do not encode URLs, so slug is our choice.

---

## Task 1: Design tokens + shared visual primitives

**Amaç:** Add every missing token the 9 mockups require and build the reusable presentational primitives (card, role pill, gradient avatar, access chip) plus the role→color logic. No routes yet; pure building blocks + one visual smoke.

**Files:**
- Modify: `src/styles/tokens.css`
- Create: `src/components/settings/primitives/role-visuals.ts`
- Create: `src/components/settings/primitives/role-visuals.test.ts`
- Create: `src/components/settings/primitives/RolePill.tsx`
- Create: `src/components/settings/primitives/UserAvatar.tsx`
- Create: `src/components/settings/primitives/AccessChip.tsx`
- Create: `src/components/settings/primitives/SettingsCard.tsx`
- Create: `src/components/settings/primitives/settings-primitives.css`

**Interfaces:**
- Consumes: existing tokens in `src/styles/tokens.css`; `cx` from `@/lib/cx`.
- Produces:
  - `roleVisual(roleKey: string): { badgeBg: string; badgeText: string; gradFrom: string; gradTo: string }` — returns CSS `var(--token)` strings.
  - `<RolePill roleKey={string} name={string} />`
  - `<UserAvatar roleKey={string} name={string} />` (renders `initials(name)`; reuse `@/lib/shell/initials`)
  - `<AccessChip presetKey={PresetKey | ""} label={string} />` (from `@/lib/api/permission-presets`)
  - `<SettingsCard title? actions? count? bodyPad? className?>{children}</SettingsCard>`

- [ ] **Step 1: Add tokens.** Append to `:root` in `src/styles/tokens.css` (before the closing `}`):

```css
  /* Ayarlar redesign — layout + accent tokens (mockup-derived, ref §A) */
  --settings-sidebar-width: 240px;
  --text-settings-nav-label: 10px;     /* sidebar grup etiketi */
  --text-page-title-settings: 22px;    /* Ayarlar alt-sayfa h1 (26px genel değil) */

  /* Muhasebe (mor) ailesi */
  --color-accent-purple: #7c3aed;        /* pill/metin */
  --color-accent-purple-soft: #ede9fe;   /* pill zemin */
  --color-accent-purple-grad-start: #8b5cf6;
  --color-accent-purple-grad-end: #a78bfa;

  /* Avatar gradyan uçları */
  --color-accent-teal-start: #0f766e;
  --color-accent-teal-end: #14b8a6;
  --color-avatar-amber-end: #fbbf24;
  --color-avatar-blue-end: #60a5fa;
  --color-avatar-slate-end: #cbd5e1;

  /* Yeşil ton varyantı (info banner / vurgulu izin satırı) */
  --color-success-tint: #f0fdf4;
  --color-success-tint-border: #bbf7d0;

  /* Sistem rolü gradyan/çerçeve + koyu grup başlığı */
  --color-slate-700: #334155;

  /* İkinci ton uyarı/tehlike (pill metni + audit satır tinti) */
  --color-warning-strong: #d97706;
  --color-danger-strong: #dc2626;
  --color-audit-danger-row-bg: #fff7f7;
```

(16 new tokens. Verify none duplicate an existing value: `--color-slate-700` etc. are new; `#dc2626`/`#d97706` were previously folded into `--color-danger`/`--color-warning` — now split out for pill text fidelity.)

- [ ] **Step 2: Write failing test for `roleVisual`.** `src/components/settings/primitives/role-visuals.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { roleVisual } from "./role-visuals";

describe("roleVisual", () => {
  it("patron için koyu badge + primary gradyan döner", () => {
    const v = roleVisual("patron");
    expect(v.badgeBg).toBe("var(--color-text)");
    expect(v.badgeText).toBe("var(--color-on-brand)");
    expect(v.gradFrom).toBe("var(--color-primary)");
    expect(v.gradTo).toBe("var(--color-avatar-blue-end)");
  });
  it("muhasebe için mor aile döner", () => {
    const v = roleVisual("accounting");
    expect(v.badgeBg).toBe("var(--color-accent-purple-soft)");
    expect(v.badgeText).toBe("var(--color-accent-purple)");
  });
  it("bilinmeyen rol için nötr slate fallback döner", () => {
    const v = roleVisual("__yok__");
    expect(v.badgeBg).toBe("var(--color-surface-muted)");
    expect(v.badgeText).toBe("var(--color-text-muted)");
    expect(v.gradFrom).toBe("var(--color-text-subtle)");
  });
});
```

- [ ] **Step 3: Run test, verify FAIL.** Run: `pnpm test src/components/settings/primitives/role-visuals.test.ts` → Expected: FAIL "roleVisual is not defined".

- [ ] **Step 4: Implement `role-visuals.ts`.** Keys map to backend role `key` values (`roles/seed_data.py`: `system_admin, patron, site_chief, field_engineer, hr_manager, accounting, project_manager, procurement`). Mockup defines colors for 5; the 2 extras (`field_engineer`, `hr_manager`) reuse on-palette analogues (flagged in ref §C.1).

```ts
// Rol -> renk/gradyan eşlemesi (yalnızca token referansları; çıplak hex yok).
// Mockup ref §A.5: Patron/Şef/Muhasebe/PM/Satınalma. Ekstra roller on-palette analog.
export interface RoleVisual {
  badgeBg: string;
  badgeText: string;
  gradFrom: string;
  gradTo: string;
}

const MAP: Record<string, RoleVisual> = {
  system_admin: { badgeBg: "var(--color-text)", badgeText: "var(--color-on-brand)", gradFrom: "var(--color-slate-700)", gradTo: "var(--color-text)" },
  patron: { badgeBg: "var(--color-text)", badgeText: "var(--color-on-brand)", gradFrom: "var(--color-primary)", gradTo: "var(--color-avatar-blue-end)" },
  site_chief: { badgeBg: "var(--color-primary-soft)", badgeText: "var(--color-primary)", gradFrom: "var(--color-accent-teal-start)", gradTo: "var(--color-accent-teal-end)" },
  accounting: { badgeBg: "var(--color-accent-purple-soft)", badgeText: "var(--color-accent-purple)", gradFrom: "var(--color-accent-purple-grad-start)", gradTo: "var(--color-accent-purple-grad-end)" },
  project_manager: { badgeBg: "var(--color-warning-soft)", badgeText: "var(--color-warning-strong)", gradFrom: "var(--color-warning)", gradTo: "var(--color-avatar-amber-end)" },
  procurement: { badgeBg: "var(--color-surface-muted)", badgeText: "var(--color-text-muted)", gradFrom: "var(--color-text-subtle)", gradTo: "var(--color-avatar-slate-end)" },
  // Ekstra seed roller (mockup badge tanımı yok — on-palette analog):
  field_engineer: { badgeBg: "var(--color-primary-soft)", badgeText: "var(--color-primary)", gradFrom: "var(--color-accent-teal-start)", gradTo: "var(--color-accent-teal-end)" },
  hr_manager: { badgeBg: "var(--color-accent-purple-soft)", badgeText: "var(--color-accent-purple)", gradFrom: "var(--color-accent-purple-grad-start)", gradTo: "var(--color-accent-purple-grad-end)" },
};

const FALLBACK: RoleVisual = {
  badgeBg: "var(--color-surface-muted)",
  badgeText: "var(--color-text-muted)",
  gradFrom: "var(--color-text-subtle)",
  gradTo: "var(--color-avatar-slate-end)",
};

export function roleVisual(roleKey: string): RoleVisual {
  return MAP[roleKey] ?? FALLBACK;
}
```

- [ ] **Step 5: Run test, verify PASS.** Run: `pnpm test src/components/settings/primitives/role-visuals.test.ts` → Expected: PASS (3 tests).

- [ ] **Step 6: Write the primitive CSS.** `src/components/settings/primitives/settings-primitives.css`:

```css
/* Kart — mockup ref §A.4 (tüm 9 sayfada aynı) */
.s-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-14);
  box-shadow: var(--shadow-card);
}
.s-card__header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 14px 18px;
  border-bottom: 1px solid var(--color-border);
}
.s-card__title { font-size: 14px; font-weight: 600; color: var(--color-text); }
.s-card__count {
  font-size: 11px; font-weight: 500;
  background: var(--color-surface-muted); color: var(--color-text-muted);
  padding: 2px 8px; border-radius: var(--radius-10);
}
.s-card__actions { margin-left: auto; display: flex; align-items: center; gap: var(--space-2); }
.s-card__body { padding: 20px; }
.s-card__body--flush { padding: 0; }        /* tablo gövdeleri için */
.s-card__body--tight { padding: 18px; }     /* Entegrasyonlar kartı */

/* Rol pill — ref §A.5 */
.role-pill {
  display: inline-block;
  font-size: 11px; font-weight: 600;
  padding: 3px 10px; border-radius: var(--radius-10);
}

/* Gradyan avatar — ref §A.5 */
.user-avatar {
  width: 34px; height: 34px; border-radius: var(--radius-8);
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: var(--color-on-brand);
  flex-shrink: 0;
}

/* Erişim çipi — ref §A.7 */
.access-chip { font-size: 11px; font-weight: 600; padding: 2px 7px; border-radius: var(--radius-8); }
.access-chip--full { color: var(--color-success); font-weight: 700; background: transparent; padding: 0; }
.access-chip--none { color: var(--color-border-strong); background: transparent; padding: 0; }
.access-chip--blue { background: var(--color-primary-soft); color: var(--color-primary); }
.access-chip--amber { background: var(--color-warning-soft); color: var(--color-warning-strong); }
.access-chip--green { background: var(--color-success-soft); color: var(--color-success); }
```

- [ ] **Step 7: Write `SettingsCard.tsx`** (Server Component — no `"use client"`):

```tsx
import { cx } from "@/lib/cx";
import "./settings-primitives.css";

type Props = {
  title?: React.ReactNode;
  count?: React.ReactNode;
  actions?: React.ReactNode;
  bodyPad?: "default" | "flush" | "tight";
  className?: string;
  children: React.ReactNode;
};

export function SettingsCard({ title, count, actions, bodyPad = "default", className, children }: Props) {
  const hasHeader = title || actions || count;
  const bodyClass =
    bodyPad === "flush" ? "s-card__body--flush" : bodyPad === "tight" ? "s-card__body--tight" : "";
  return (
    <section className={cx("s-card", className)}>
      {hasHeader && (
        <div className="s-card__header">
          {title && <span className="s-card__title">{title}</span>}
          {count != null && <span className="s-card__count">{count}</span>}
          {actions && <span className="s-card__actions">{actions}</span>}
        </div>
      )}
      <div className={cx("s-card__body", bodyClass)}>{children}</div>
    </section>
  );
}
```

- [ ] **Step 8: Write `RolePill.tsx` and `UserAvatar.tsx`:**

```tsx
// RolePill.tsx
import { roleVisual } from "./role-visuals";
import "./settings-primitives.css";

export function RolePill({ roleKey, name }: { roleKey: string; name: string }) {
  const v = roleVisual(roleKey);
  return <span className="role-pill" style={{ background: v.badgeBg, color: v.badgeText }}>{name}</span>;
}
```

```tsx
// UserAvatar.tsx
import { initials } from "@/lib/shell/initials";
import { roleVisual } from "./role-visuals";
import "./settings-primitives.css";

export function UserAvatar({ roleKey, name }: { roleKey: string; name: string }) {
  const v = roleVisual(roleKey);
  return (
    <span className="user-avatar" aria-hidden="true"
      style={{ backgroundImage: `linear-gradient(135deg, ${v.gradFrom}, ${v.gradTo})` }}>
      {initials(name)}
    </span>
  );
}
```

- [ ] **Step 9: Write `AccessChip.tsx`.** Maps preset → chip color class per ref §A.7:

```tsx
import { cx } from "@/lib/cx";
import type { PresetKey } from "@/lib/api/permission-presets";
import "./settings-primitives.css";

// Ref §A.7: full=düz yeşil metin, none=düz gri "—", diğerleri renkli çip.
const CLASS: Record<string, string> = {
  super: "access-chip--green", full: "access-chip--full", none: "access-chip--none",
  view: "access-chip--amber", limited: "access-chip--blue", finance: "access-chip--blue",
  own: "access-chip--blue", project: "access-chip--blue", stock: "access-chip--blue",
  draft: "access-chip--blue", request: "access-chip--blue", approve: "access-chip--green",
};

export function AccessChip({ presetKey, label }: { presetKey: PresetKey | ""; label: string }) {
  if (presetKey === "none" || presetKey === "") return <span className="access-chip access-chip--none">—</span>;
  if (presetKey === "full") return <span className="access-chip access-chip--full">✓ {label}</span>;
  return <span className={cx("access-chip", CLASS[presetKey] ?? "access-chip--blue")}>{label}</span>;
}
```

- [ ] **Step 10: Typecheck + lint + full unit test.** Run: `pnpm typecheck && pnpm lint && pnpm test` → Expected: PASS (existing suite + 3 new role-visuals tests).

- [ ] **Step 11: Commit.**

```bash
git add src/styles/tokens.css src/components/settings/primitives
git commit -m "feat: add ayarlar design tokens and shared settings primitives"
```

---

## Task 2: Settings-sidebar takeover layout + breadcrumb

**Amaç:** Inside `(app)/ayarlar`, replace the global app Sidebar with the settings sidebar and overlay a breadcrumb into the topbar's middle region, matching all 9 mockups. This is the navigation model decision baked in.

**Architecture decision (resolves global-Sidebar-vs-settings-sidebar):** The global `Topbar` + `Sidebar` are rendered by `AppShell` in `(app)/layout.tsx` and cannot be removed by a nested layout. Instead, the `ayarlar/layout.tsx`:
1. Renders its own **fixed settings sidebar** at `left:0; top:52px; width:240px`, painting **over** the global 220px sidebar (higher `z-index`, opaque `--color-surface` background, full height). The global sidebar is visually fully occluded.
2. Renders a **fixed breadcrumb bar** at `top:0; left:var(--settings-sidebar-width); right:0; height:52px` painting over the global topbar's center/right, with `Çıkış Yap` at the right. The global topbar's left logo block (0–220px) stays visible (matches mockups: FİİL logo top-left on all 9).
3. Sets the content `margin-left` to `240px` (overriding the shell's 220px) via an `.ayarlar-content` wrapper.

This is deliberate over-paint (no change to `AppShell`), keeping F3 shell intact for the rest of the app. **OPEN QUESTION (non-blocking):** the global topbar right side has a bell + avatar (F3). The mockups show only `Çıkış Yap` at top-right on 8 pages and `← Gösterge Paneli` + avatar on the root. The breadcrumb bar paints over the bell/avatar region with an opaque background so only the settings chrome shows. If the product owner wants the global bell/avatar retained inside Ayarlar, revisit — default: mockup wins (occlude).

**Files:**
- Create: `src/components/settings/shell/settings-nav-config.ts`
- Create: `src/components/settings/shell/settings-nav-config.test.ts`
- Create: `src/components/settings/shell/SettingsSidebar.tsx`
- Create: `src/components/settings/shell/SettingsBreadcrumb.tsx`
- Create: `src/components/settings/shell/SettingsHeader.tsx`
- Create: `src/components/settings/shell/settings-shell.css`
- Modify (rewrite): `src/app/(app)/ayarlar/layout.tsx`
- Modify (rewrite): `src/app/(app)/ayarlar/ayarlar.css`

**Interfaces:**
- Consumes: `usePathname` (next/navigation), `isActivePath` from `@/lib/shell/isActive`, `cx`, tokens.
- Produces:
  - `SETTINGS_NAV: { heading: string; items: { label: string; href: string; emoji: string }[] }[]`
  - `settingsLabelForPath(pathname: string): string` (breadcrumb current-page label)
  - `<SettingsSidebar />`, `<SettingsBreadcrumb />`, `<SettingsHeader title subtitle action? variant?>`.

- [ ] **Step 1: Write failing test for nav config.** `settings-nav-config.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { SETTINGS_NAV, settingsLabelForPath } from "./settings-nav-config";

describe("SETTINGS_NAV", () => {
  it("3 grup ve 9 öğe içerir", () => {
    expect(SETTINGS_NAV.map((g) => g.heading)).toEqual(["GENEL", "KULLANICI & ERİŞİM", "SİSTEM"]);
    expect(SETTINGS_NAV.flatMap((g) => g.items)).toHaveLength(9);
  });
  it("her href /ayarlar ile başlar", () => {
    for (const item of SETTINGS_NAV.flatMap((g) => g.items)) {
      expect(item.href.startsWith("/ayarlar/")).toBe(true);
    }
  });
});

describe("settingsLabelForPath", () => {
  it("izin-matrisi için 'İzin Matrisi' döner", () => {
    expect(settingsLabelForPath("/ayarlar/izin-matrisi")).toBe("İzin Matrisi");
  });
  it("bilinmeyen yol için 'Ayarlar' döner", () => {
    expect(settingsLabelForPath("/ayarlar/__yok__")).toBe("Ayarlar");
  });
});
```

- [ ] **Step 2: Run test, verify FAIL.** Run: `pnpm test settings-nav-config` → FAIL "SETTINGS_NAV is not defined".

- [ ] **Step 3: Implement `settings-nav-config.ts`.** Emojis + labels + order exactly per ref §A.1:

```ts
export interface SettingsNavItem { label: string; href: string; emoji: string }
export interface SettingsNavGroup { heading: string; items: SettingsNavItem[] }

export const SETTINGS_NAV: SettingsNavGroup[] = [
  { heading: "GENEL", items: [
    { label: "Şirket Bilgileri", href: "/ayarlar/sirket-bilgileri", emoji: "🏢" },
    { label: "Bildirimler", href: "/ayarlar/bildirimler", emoji: "🔔" },
    { label: "Görünüm", href: "/ayarlar/gorunum", emoji: "🎨" },
  ]},
  { heading: "KULLANICI & ERİŞİM", items: [
    { label: "Kullanıcılar", href: "/ayarlar/kullanicilar", emoji: "👤" },
    { label: "Rol Yönetimi", href: "/ayarlar/roller", emoji: "🔐" },
    { label: "İzin Matrisi", href: "/ayarlar/izin-matrisi", emoji: "📋" },
  ]},
  { heading: "SİSTEM", items: [
    { label: "Entegrasyonlar", href: "/ayarlar/entegrasyonlar", emoji: "🔗" },
    { label: "Yedekleme", href: "/ayarlar/yedekleme", emoji: "📦" },
    { label: "Denetim Günlüğü", href: "/ayarlar/denetim-gunlugu", emoji: "📜" },
  ]},
];

export function settingsLabelForPath(pathname: string): string {
  for (const group of SETTINGS_NAV) {
    const found = group.items.find((i) => pathname.startsWith(i.href));
    if (found) return found.label;
  }
  return "Ayarlar";
}
```

- [ ] **Step 4: Run test, verify PASS.** Run: `pnpm test settings-nav-config` → PASS (4 tests).

- [ ] **Step 5: Write `settings-shell.css`.** Values from ref §A.1/A.2:

```css
/* Ayarlar sidebar — global sidebar'ın üstüne opak boyanır (ref §A.1) */
.settings-sidebar {
  position: fixed; top: 52px; left: 0; bottom: 0;
  width: var(--settings-sidebar-width);
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  overflow-y: auto;
  padding: 14px 0;
  z-index: 90;              /* global sidebar (yok) üstünde, topbar (100) altında */
}
.settings-sidebar__back {
  display: flex; align-items: center; gap: 6px;
  margin: 0 12px 10px; padding: 6px 10px;
  font-size: 12px; color: var(--color-primary); text-decoration: none;
  border-radius: var(--radius-8);
}
.settings-sidebar__back:hover { background: var(--color-nav-active-bg); }
.settings-group { margin-bottom: 4px; }
.settings-group__label {
  padding: 0 10px 4px; font-size: var(--text-settings-nav-label);
  font-weight: 600; color: var(--color-text-subtle);
  letter-spacing: 1px; text-transform: uppercase;
}
.settings-nav-list { display: flex; flex-direction: column; gap: 1px; padding: 0 8px; }
.settings-nav-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; border-radius: var(--radius-8);
  font-size: 13px; color: var(--color-text-secondary); text-decoration: none;
}
.settings-nav-item:hover { background: var(--color-surface-2); }
.settings-nav-item--active { background: var(--color-nav-active-bg); color: var(--color-primary); font-weight: 600; }
.settings-divider { height: 1px; background: var(--color-divider); margin: 10px 12px; }
.settings-logout {
  display: flex; align-items: center; gap: 8px;
  margin: 2px 8px; padding: 8px 12px; border-radius: var(--radius-8);
  color: var(--color-danger); font-size: 13px; font-weight: 500;
  background: none; border: none; cursor: pointer; width: calc(100% - 16px); text-align: left;
}

/* Breadcrumb bar — global topbar orta/sağını örter (ref §A.1) */
.settings-breadcrumb {
  position: fixed; top: 0; left: var(--settings-sidebar-width); right: 0; height: 52px;
  display: flex; align-items: center; gap: 8px;
  padding: 0 24px 0 8px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  box-shadow: var(--shadow-topbar);
  z-index: 101;            /* global topbar (100) üstünde */
}
.settings-breadcrumb__link { font-size: 13px; color: var(--color-primary); text-decoration: none; }
.settings-breadcrumb__sep { color: var(--color-border); }
.settings-breadcrumb__current { font-size: 13px; font-weight: 600; color: var(--color-text); }
.settings-breadcrumb__logout { margin-left: auto; font-size: 13px; color: var(--color-danger); background: none; border: none; cursor: pointer; }

/* İçerik alanı — 240px sidebar'a göre (shell 220px override) */
.ayarlar-content { margin-left: var(--settings-sidebar-width); padding: 28px 32px; }
@media (prefers-reduced-motion: no-preference) { .ayarlar-content { animation: var(--anim-fade-up); } }

/* Sayfa başlığı — ref §A.2 */
.settings-header { margin-bottom: var(--space-6); }
.settings-header--root { margin-bottom: 28px; }
.settings-header__row { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); }
.settings-header__title { margin: 0 0 4px; font-size: var(--text-page-title-settings); font-weight: 700; color: var(--color-text); }
.settings-header--root .settings-header__title { font-size: 24px; letter-spacing: -0.4px; margin-bottom: 6px; }
.settings-header__subtitle { margin: 0; font-size: var(--text-body); color: var(--color-text-subtle); }
```

- [ ] **Step 6: Write `SettingsSidebar.tsx`** (`"use client"` — needs pathname + logout):

```tsx
"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cx } from "@/lib/cx";
import { SETTINGS_NAV } from "./settings-nav-config";
import "./settings-shell.css";

export function SettingsSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }
  return (
    <aside className="settings-sidebar" aria-label="Ayarlar menüsü">
      <Link href="/" className="settings-sidebar__back">← Gösterge Paneli</Link>
      {SETTINGS_NAV.map((group, gi) => (
        <div key={group.heading}>
          <div className="settings-group">
            <div className="settings-group__label">{group.heading}</div>
            <nav className="settings-nav-list">
              {group.items.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href}
                    className={cx("settings-nav-item", active && "settings-nav-item--active")}
                    aria-current={active ? "page" : undefined}>
                    <span aria-hidden="true">{item.emoji}</span> {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          {gi < SETTINGS_NAV.length - 1 && <div className="settings-divider" />}
        </div>
      ))}
      <div className="settings-divider" />
      <button type="button" className="settings-logout" onClick={handleLogout}>🚪 Çıkış Yap</button>
    </aside>
  );
}
```

- [ ] **Step 7: Write `SettingsBreadcrumb.tsx`** (`"use client"`):

```tsx
"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { settingsLabelForPath } from "./settings-nav-config";
import "./settings-shell.css";

export function SettingsBreadcrumb() {
  const pathname = usePathname();
  const router = useRouter();
  const current = settingsLabelForPath(pathname);
  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }
  return (
    <div className="settings-breadcrumb">
      <Link href="/ayarlar/kullanicilar" className="settings-breadcrumb__link">Ayarlar</Link>
      <span className="settings-breadcrumb__sep" aria-hidden="true">/</span>
      <span className="settings-breadcrumb__current">{current}</span>
      <button type="button" className="settings-breadcrumb__logout" onClick={handleLogout}>Çıkış Yap</button>
    </div>
  );
}
```

- [ ] **Step 8: Write `SettingsHeader.tsx`** (Server Component):

```tsx
import { cx } from "@/lib/cx";
import "./settings-shell.css";

type Props = { title: string; subtitle: string; action?: React.ReactNode; variant?: "sub" | "root" };

export function SettingsHeader({ title, subtitle, action, variant = "sub" }: Props) {
  return (
    <header className={cx("settings-header", variant === "root" && "settings-header--root")}>
      <div className="settings-header__row">
        <h1 className="settings-header__title">{title}</h1>
        {action}
      </div>
      <p className="settings-header__subtitle">{subtitle}</p>
    </header>
  );
}
```

- [ ] **Step 9: Rewrite `ayarlar/layout.tsx`** (remove the old in-content tab strip; render the takeover shell):

```tsx
import { SettingsSidebar } from "@/components/settings/shell/SettingsSidebar";
import { SettingsBreadcrumb } from "@/components/settings/shell/SettingsBreadcrumb";
import "./ayarlar.css";

export default function AyarlarLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SettingsSidebar />
      <SettingsBreadcrumb />
      <div className="ayarlar-content">{children}</div>
    </>
  );
}
```

- [ ] **Step 10: Rewrite `ayarlar.css`.** Replace old `.ayarlar*` rules with a single import bridge (all real styles now live in `settings-shell.css`, imported by the components). Set the file to:

```css
/* Ayarlar route-group stilleri artık settings-shell.css içinde; bu dosya yer tutucu. */
```

(Do not delete the file — `layout.tsx` imports it; keeping the import stable avoids a churn in other references.)

- [ ] **Step 11: Delete the obsolete `isActive` tab usage.** Confirm no other file imports the removed `TABS`/`.ayarlar-tab`. Run: `grep -rn "ayarlar-tab\|ayarlar__tabs" src` → Expected: no matches. If matches exist (e.g. in a test), update them.

- [ ] **Step 12: Typecheck + lint + build gate.** Run: `pnpm typecheck && pnpm lint && pnpm build` → Expected: build SUCCESS (route group compiles; existing 3 ayarlar pages still render inside the new shell).

- [ ] **Step 13: Commit.**

```bash
git add src/components/settings/shell src/app/(app)/ayarlar/layout.tsx src/app/(app)/ayarlar/ayarlar.css
git commit -m "feat: ayarlar settings-sidebar takeover layout with breadcrumb"
```

---

## Task 3: Kullanıcılar — restyle to rich table (reuse hooks)

**Amaç:** Rebuild `UsersScreen` as the mockup's "Kullanıcı Listesi" card + rich table (avatar cell, role pill, project-access text, status badge, Düzenle link) with a header count-badge, search, and "+ Kullanıcı Ekle". Reuse all existing hooks/modals. **Hide "Son Giriş"** column (graceful degradation) but ship the relative-time formatter for the future backend field.

**Mockup:** `Ayarlar.dc.html` / screenshot `01-kullanicilar.png` / ref §B.1 + §A.5. **Note:** the mockup's landing page also shows a "Roller" + "İzin Matrisi" preview grid below the table and an in-content pill tab strip. Per ref §A.3 + §B.1, the in-content tab strip is NOT rebuilt (sidebar is the single nav). **OPEN QUESTION (non-blocking):** rebuild the two preview cards (Roller list + İzin Matrisi mini-table) below the users table? They duplicate the dedicated Rol Yönetimi (T4) and İzin Matrisi (T5) pages. Default decision baked into this task: **omit the preview grid** — the Kullanıcılar page shows only the Kullanıcı Listesi card (the previews are dashboard-style duplication superseded by dedicated pages). If product owner wants the previews, add a follow-up task.

**Files:**
- Rewrite: `src/components/settings/UsersScreen.tsx` → move to `src/components/settings/users/UsersScreen.tsx` (update the import in `kullanicilar/page.tsx`)
- Create: `src/components/settings/users/users-screen.css`
- Create: `src/lib/settings/last-login.ts`
- Create: `src/lib/settings/last-login.test.ts`
- Modify: `src/app/(app)/ayarlar/kullanicilar/page.tsx` (import path + root header)
- Reuse unchanged: `useUsers`, `useRoles`, `useDeleteUser`, `UserFormModal`, `PasswordResetModal`, `ProjectAccessModal`, `ConfirmDialog`, `StatusBadge`, `AccessDenied`, `useProjectAccess`/`useProjects` (for the project-access column).

**Interfaces:**
- Consumes: `roleVisual`/`RolePill`/`UserAvatar`/`SettingsCard` (T1); `SettingsHeader` (T2); `useUsers({limit,offset})`, `useRoles()`, `useProjects()`, `useProjectAccess(userId)` (existing).
- Produces: `formatLastLogin(iso: string | null, now?: Date): string` (exported from `last-login.ts`, used later when backend exposes the field).

- [ ] **Step 1: Write failing test for `formatLastLogin`.** `last-login.test.ts`. Format per ref §A.5 (`Bugün HH:mm` / `Dün HH:mm` / `N gün önce`):

```ts
import { describe, it, expect } from "vitest";
import { formatLastLogin } from "./last-login";

const now = new Date("2026-07-19T12:00:00");

describe("formatLastLogin", () => {
  it("bugün için 'Bugün HH:mm' döner", () => {
    expect(formatLastLogin("2026-07-19T09:14:00", now)).toBe("Bugün 09:14");
  });
  it("dün için 'Dün HH:mm' döner", () => {
    expect(formatLastLogin("2026-07-18T17:30:00", now)).toBe("Dün 17:30");
  });
  it("daha eski için 'N gün önce' döner", () => {
    expect(formatLastLogin("2026-07-16T08:00:00", now)).toBe("3 gün önce");
  });
  it("null için '—' döner", () => {
    expect(formatLastLogin(null, now)).toBe("—");
  });
});
```

- [ ] **Step 2: Run test, verify FAIL.** Run: `pnpm test last-login` → FAIL.

- [ ] **Step 3: Implement `last-login.ts`:**

```ts
// Son giriş görünümü (ref §A.5). Backend last_login_at'i UserResponse'a eklerse kullanılır.
function pad(n: number): string { return String(n).padStart(2, "0"); }

export function formatLastLogin(iso: string | null, now: Date = new Date()): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dayDiff = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (dayDiff <= 0) return `Bugün ${hm}`;
  if (dayDiff === 1) return `Dün ${hm}`;
  return `${dayDiff} gün önce`;
}
```

- [ ] **Step 4: Run test, verify PASS.** Run: `pnpm test last-login` → PASS (4 tests).

- [ ] **Step 5: Write `users-screen.css`** (rich table per ref §A.5):

```css
.users-toolbar { display: flex; align-items: center; gap: var(--space-3); }
.users-toolbar__spacer { flex: 1; }
.users-search {
  display: flex; align-items: center; gap: 8px;
  background: var(--color-surface-2); border: 1px solid var(--color-border);
  border-radius: var(--radius-8); padding: 6px 12px;
}
.users-search input { border: none; background: none; font-size: 12px; color: var(--color-text-secondary); width: 120px; outline: none; }
.users-table { width: 100%; border-collapse: collapse; }
.users-table thead tr { background: var(--color-surface-2); border-bottom: 1px solid var(--color-border); }
.users-table th {
  text-align: left; padding: 10px 12px; font-size: 11px; font-weight: 600;
  color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.8px;
}
.users-table th:first-child, .users-table td:first-child { padding-left: 18px; }
.users-table th--center, .users-table td--center { text-align: center; }
.users-table tbody tr { border-bottom: 1px solid var(--color-divider); }
.users-table tbody tr:last-child { border-bottom: none; }
.users-table td { padding: 12px; font-size: 13px; color: var(--color-text); }
.users-cell-user { display: flex; align-items: center; gap: 10px; }
.users-cell-user__name { font-size: 13px; font-weight: 600; color: var(--color-text); }
.users-cell-user__sub { font-size: 11px; color: var(--color-text-subtle); }
.users-cell-access { font-size: 12px; color: var(--color-text-secondary); }
.users-edit { background: none; border: none; color: var(--color-primary); font-size: 12px; font-weight: 500; cursor: pointer; }
.users-pager { display: flex; align-items: center; gap: var(--space-4); margin-top: var(--space-4); }
.users-pager__label { font-size: var(--text-sm); color: var(--color-text-secondary); }
```

- [ ] **Step 6: Rewrite `UsersScreen.tsx`** at `src/components/settings/users/UsersScreen.tsx`. Keep all existing modal/pagination/delete logic; replace only the toolbar+table markup. Note the modal-action set is preserved but folded behind the single "Düzenle" link + a row action menu is out of scope — mockup shows only "Düzenle". Keep Parola/Projeler/Sil reachable from the edit modal is out of scope; **decision: "Düzenle" opens the edit modal; Parola/Projeler/Sil remain as small ghost buttons in the action cell** (mockup shows one "Düzenle" link only — to avoid losing shipped functionality, render "Düzenle" as the mockup-styled link and keep the other three as `Button variant="ghost" size="sm"` after it; flag minor deviation). Project-access text column resolves via `useProjects()` + per-user `useProjectAccess`.

Full component:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui";
import { SettingsCard } from "@/components/settings/primitives/SettingsCard";
import { UserAvatar } from "@/components/settings/primitives/UserAvatar";
import { RolePill } from "@/components/settings/primitives/RolePill";
import { StatusBadge } from "@/components/settings/StatusBadge";
import { useUsers, PAGE_SIZE } from "@/lib/api/hooks/useUsers";
import { useRoles } from "@/lib/api/hooks/useRoles";
import { useProjects } from "@/lib/api/hooks/useProjects";
import { useDeleteUser } from "@/lib/api/hooks/useUserMutations";
import { UserFormModal } from "@/components/settings/UserFormModal";
import { PasswordResetModal } from "@/components/settings/PasswordResetModal";
import { ProjectAccessModal } from "@/components/settings/ProjectAccessModal";
import { ConfirmDialog } from "@/components/settings/ConfirmDialog";
import { AccessDenied } from "@/components/settings/AccessDenied";
import { backendErrorMessage } from "@/lib/settings/error-message";
import { isForbidden } from "@/lib/api/unwrap";
import type { RoleResponse, UserResponse } from "@/lib/api/models";
import "./users-screen.css";

type ModalState =
  | { type: "create" } | { type: "edit"; user: UserResponse }
  | { type: "password"; user: UserResponse } | { type: "project"; user: UserResponse }
  | { type: "delete"; user: UserResponse } | null;

function role(roles: RoleResponse[] | undefined, roleId: string): RoleResponse | undefined {
  return roles?.find((r) => r.id === roleId);
}
function pageFromParams(v: string | null): number {
  const n = Number(v); return Number.isInteger(n) && n >= 1 ? n : 1;
}

export function UsersScreen() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const page = pageFromParams(searchParams.get("sayfa"));
  const offset = (page - 1) * PAGE_SIZE;

  const usersQuery = useUsers({ limit: PAGE_SIZE, offset });
  const rolesQuery = useRoles();
  const projectsQuery = useProjects();  // proje adı çözümü (ref §C.1)
  const deleteUser = useDeleteUser();

  const [modal, setModal] = useState<ModalState>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const total = usersQuery.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function goToPage(next: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sayfa", String(next));
    router.push(`${pathname}?${params.toString()}`);
  }
  function closeModal() { setModal(null); setDeleteError(null); }
  function confirmDelete(user: UserResponse) {
    setDeleteError(null);
    deleteUser.mutate(user.id, { onSuccess: closeModal, onError: (e) => setDeleteError(backendErrorMessage(e)) });
  }

  useEffect(() => {
    if (usersQuery.data && page > pageCount) goToPage(pageCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageCount, usersQuery.data]);

  if (usersQuery.isLoading) return <p className="settings-note">Yükleniyor…</p>;
  if (isForbidden(usersQuery.error)) return <AccessDenied />;
  if (usersQuery.isError || !usersQuery.data) return <p className="settings-note settings-note--error">Kullanıcılar yüklenemedi.</p>;
  if (page > pageCount) return null;

  const { items } = usersQuery.data;

  return (
    <>
      <SettingsCard
        title="Kullanıcı Listesi"
        count={`${total} kullanıcı`}
        bodyPad="flush"
        actions={
          <>
            <span className="users-search">
              <span aria-hidden="true">🔍</span>
              <input type="search" placeholder="Kullanıcı ara..." aria-label="Kullanıcı ara" />
            </span>
            <Button variant="primary" size="sm" onClick={() => setModal({ type: "create" })}>+ Kullanıcı Ekle</Button>
          </>
        }
      >
        <table className="users-table">
          <thead>
            <tr>
              <th>Kullanıcı</th><th>E-posta</th><th className="users-table__th--center">Rol</th>
              <th>Proje Erişimi</th><th className="users-table__th--center">Durum</th><th aria-label="İşlemler" />
            </tr>
          </thead>
          <tbody>
            {items.map((user) => {
              const r = role(rolesQuery.data, user.role_id);
              return (
                <tr key={user.id}>
                  <td>
                    <div className="users-cell-user">
                      <UserAvatar roleKey={r?.key ?? ""} name={user.full_name} />
                      <div>
                        <div className="users-cell-user__name">{user.full_name}</div>
                        <div className="users-cell-user__sub">{user.title}</div>
                      </div>
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td className="users-table__td--center">{r ? <RolePill roleKey={r.key} name={r.name} /> : "—"}</td>
                  <td className="users-cell-access">—{/* Proje erişimi metni: ProjectAccessCell (opsiyonel alt-görev, aşağıdaki NOT) */}</td>
                  <td className="users-table__td--center"><StatusBadge status={user.status} /></td>
                  <td>
                    <div className="settings-row-actions">
                      <button className="users-edit" onClick={() => setModal({ type: "edit", user })}>Düzenle</button>
                      <Button variant="ghost" size="sm" onClick={() => setModal({ type: "password", user })}>Parola</Button>
                      <Button variant="ghost" size="sm" onClick={() => setModal({ type: "project", user })}>Projeler</Button>
                      <Button variant="danger" size="sm" onClick={() => setModal({ type: "delete", user })}>Sil</Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </SettingsCard>

      <div className="users-pager">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => goToPage(page - 1)}>Önceki</Button>
        <span className="users-pager__label">Sayfa {page} / {pageCount}</span>
        <Button variant="secondary" size="sm" disabled={page >= pageCount} onClick={() => goToPage(page + 1)}>Sonraki</Button>
      </div>

      {modal?.type === "create" && <UserFormModal mode="create" onClose={closeModal} />}
      {modal?.type === "edit" && <UserFormModal mode="edit" user={modal.user} onClose={closeModal} />}
      {modal?.type === "password" && <PasswordResetModal user={modal.user} onClose={closeModal} />}
      {modal?.type === "project" && <ProjectAccessModal user={modal.user} onClose={closeModal} />}
      {modal?.type === "delete" && (
        <ConfirmDialog title="Kullanıcıyı Sil"
          message={`"${modal.user.full_name}" kullanıcısını silmek istediğinize emin misiniz?`}
          confirmLabel="Sil" danger isPending={deleteUser.isPending} errorText={deleteError}
          onConfirm={() => confirmDelete(modal.user)} onClose={closeModal} />
      )}
    </>
  );
}
```

**NOT (Proje Erişimi column):** Per ref §C.1 the per-user project-access summary needs a `useProjectAccess(userId)` call per row (client N+1) joined against `useProjects()` names. Rendering a live cell inside `map()` would require a hook-per-row (illegal — hooks can't run in a loop). **Decision for this task:** render `—` placeholder in the column now and add a dedicated follow-up task to implement a `ProjectAccessCell` child component (one component instance per row, each calling `useProjectAccess` legally at its own top level) that renders "Tüm Projeler" when `all_projects`, else the comma-joined project names resolved from `useProjects()`. Flag this to the user as a known partial. (Column header stays "Proje Erişimi" to match the mockup.)

- [ ] **Step 7: Update `kullanicilar/page.tsx`** to add the root header + new import path:

```tsx
import { Suspense } from "react";
import { SettingsHeader } from "@/components/settings/shell/SettingsHeader";
import { UsersScreen } from "@/components/settings/users/UsersScreen";

export default function KullanicilarPage() {
  return (
    <>
      <SettingsHeader variant="root" title="Ayarlar" subtitle="FİİL Yapı ERP sistem yönetimi" />
      <Suspense fallback={<p className="settings-note">Yükleniyor…</p>}>
        <UsersScreen />
      </Suspense>
    </>
  );
}
```

(The Kullanıcılar landing uses the "root" 24px header "Ayarlar / FİİL Yapı ERP sistem yönetimi" per ref §A.2/§B.1.)

- [ ] **Step 8: Delete the old file + update the old test.** Remove `src/components/settings/UsersScreen.tsx` and `src/components/settings/UsersScreen.test.tsx` (moved). Recreate `src/components/settings/users/UsersScreen.test.tsx` adapting the existing assertions (query `getByRole("cell")` for a user name, header count text `8 kullanıcı`, "+ Kullanıcı Ekle" button). Run: `pnpm test users` and adjust selectors until green.

- [ ] **Step 9: Gates.** Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` → Expected: all PASS. (`pnpm build` gate mandatory — Suspense boundary in the page.)

- [ ] **Step 10: Commit.**

```bash
git add src/components/settings/users src/lib/settings/last-login.ts src/lib/settings/last-login.test.ts src/app/(app)/ayarlar/kullanicilar
git rm src/components/settings/UsersScreen.tsx src/components/settings/UsersScreen.test.tsx
git commit -m "feat: restyle Kullanıcılar to mockup rich table"
```

---

## Task 3a: API schema sync + backend additions + gen:api (PREREQUISITE for T6–T8)

**Amaç:** The frontend `openapi/openapi.json` snapshot is **stale** — it omits `/company`, `/settings/preferences`, `/settings/notifications` (confirmed: grep count 0) even though the backend routers are mounted. Regenerate it and the typed `schema.d.ts`, and make the two small backend additions the mockups require (`last_login_at` in `UserResponse`; 2 extra notification events). This unblocks the data-wired new sections.

**Files (frontend):**
- Regenerate: `src/openapi/openapi.json` (from backend)  → NOTE path is `openapi/openapi.json` relative to `frontend/`
- Regenerate: `src/lib/api/schema.d.ts` (via `pnpm gen:api`)
- Modify: `e2e/mock-backend.ts` (add `/company`, `/settings/preferences`, `/settings/notifications` handlers + richer seed — needed by T6–T8 visual specs; can be split into T13 but do it here so those tasks can run)

**Files (backend, repo `../backend`, Python/FastAPI, pip/pytest — NOT pnpm):**
- Modify: `app/modules/users/schemas.py` (add `last_login_at: datetime | None` to `UserResponse`)
- Modify: `app/modules/settings/constants.py` (add 2 events to reach the mockup's 7)
- Test: `../backend/tests/...` (extend existing users + settings tests)

- [ ] **Step 1: Backend — add `last_login_at` to `UserResponse`.** In `../backend/app/modules/users/schemas.py`, add to the `UserResponse` model: `last_login_at: datetime | None = None` (import `from datetime import datetime` if missing). Update/repository already selects the column (`models.py:33`).

- [ ] **Step 2: Backend — add missing notification events.** In `../backend/app/modules/settings/constants.py`, extend `NOTIFICATION_EVENTS` to the 7 mockup rows (ref §B.5 / §C.5). The mockup's 3 categories/7 events:
  - 💰 Hakediş & Ödeme: `progress_payment_created` (exists), `progress_payment_approved` (**NEW** — "Hakediş onaylandı"), `vat_due_soon` (exists)
  - 📦 Stok & Satınalma: `stock_low` (exists), `purchase_approval_pending` (**NEW** — "Satınalma onay bekliyor") — note existing generic `approval_pending` can be reused instead; **decision: add `purchase_approval_pending` distinct key** to match the mockup's Stok & Satınalma grouping.
  - 👷 Saha & İK: `payroll_payday` (**NEW** — "Bordro ödeme günü"), `daily_log_missing` (**NEW** — "Günlük kayıt girilmedi")

  Add the 4 new event dicts (`event_key`, `label`, `email`, `in_app`, `sms` defaults). Keep `user_added` and `approval_pending` in the catalog (harmless extras; the UI groups only the 7 mockup events by key — see T7 grouping map). **OPEN QUESTION (non-blocking):** whether to keep or drop the legacy `user_added`/`approval_pending` events — default: keep (backfill-free per constants docstring); the UI simply doesn't render them.

- [ ] **Step 3: Backend — write/extend failing test.** In the backend test suite, assert `UserResponse` includes `last_login_at` and `GET /settings/notifications` returns ≥ 7 items with the new keys. Run: `cd ../backend && pytest -k "user_response or notifications" -q` → RED, then implement (steps 1–2 already do), rerun → GREEN. (Follow the backend's existing pytest conventions.)

- [ ] **Step 4: Export backend OpenAPI → frontend snapshot.** From the backend, produce `frontend/openapi/openapi.json`. Preferred (running backend): `curl -s http://127.0.0.1:8000/openapi.json -o ../frontend/openapi/openapi.json`. Offline fallback (from `../backend`, venv active): `python -c "import json; from app.main import app; print(json.dumps(app.openapi(), ensure_ascii=False))" > ../frontend/openapi/openapi.json`. **OPEN QUESTION (non-blocking):** confirm the exact repo-blessed export command with the user if a Makefile/script target exists; both above are equivalent.

- [ ] **Step 5: Regenerate typed schema.** Run (in `frontend/`): `pnpm gen:api` → rewrites `src/lib/api/schema.d.ts`. Verify: `grep -c "\"/company\"\|preferences\|notifications\|last_login_at" src/lib/api/schema.d.ts` → Expected: > 0.

- [ ] **Step 6: Extend `models.ts` type aliases.** Add to `src/lib/api/models.ts`:

```ts
export type CompanyRead = components["schemas"]["CompanyRead"];
export type CompanyUpdate = components["schemas"]["CompanyUpdate"];
export type PreferencesRead = components["schemas"]["PreferencesRead"];
export type PreferencesUpdate = components["schemas"]["PreferencesUpdate"];
export type NotificationPrefItem = components["schemas"]["NotificationPrefItem"];
export type NotificationPrefsUpdate = components["schemas"]["NotificationPrefsUpdate"];
```

(Confirm the exact generated schema names after `gen:api` — adjust if the generator emits e.g. `NotificationPrefUpdateItem`.)

- [ ] **Step 7: Extend `e2e/mock-backend.ts`.** Add in-memory handlers so the T6–T8 visual specs render: `GET/PUT /company` (return a `CompanyRead`-shaped object with the mockup's seed values — Firma: "FİİL Yapı Ltd. Şti.", tax_number "1234567890", brand_color "#2563eb", etc.), `GET/PUT /settings/preferences` (light theme, TRY, DD.MM.YYYY, normal density), `GET/PUT /settings/notifications` (the 7 events with mockup default channel checks). Mirror the existing handler style in the file.

- [ ] **Step 8: Frontend gates.** Run: `pnpm typecheck && pnpm test && pnpm build` → Expected: PASS (schema change is additive; nothing consumes the new types yet).

- [ ] **Step 9: Commit (two repos).**

```bash
# backend
( cd ../backend && git add app/modules/users/schemas.py app/modules/settings/constants.py tests && git commit -m "feat: expose last_login_at and add notification events for ayarlar UI" )
# frontend
git add openapi/openapi.json src/lib/api/schema.d.ts src/lib/api/models.ts e2e/mock-backend.ts
git commit -m "chore: regenerate openapi schema for company/settings endpoints"
```

---

## Task 4: Rol Yönetimi — master-detail rebuild

**Amaç:** Rebuild `RolesScreen` as the mockup's master-detail: left 290px role-card list (Sistem Yöneticisi gradient-emphasized; SİSTEM tag pills; user-count; module-scope summary; dashed "+ Özel Rol Oluştur") + right detail panel (header, "Kopyala", optional system info banner, "Modül Erişimleri" rows with access badges). Selecting a role updates the detail. Reuse role + permission hooks; keep create/rename/delete modals.

**Mockup:** `Ayarlar - Rol Yönetimi.dc.html` / `02-rol.png` / ref §B.2 + §A.6.

**Files:**
- Rewrite: move `src/components/settings/RolesScreen.tsx` → `src/components/settings/roles/RolesScreen.tsx`
- Create: `src/components/settings/roles/roles-screen.css`
- Create: `src/components/settings/roles/role-summary.ts` + `.test.ts` (module-scope one-liner)
- Modify: `src/app/(app)/ayarlar/roller/page.tsx`
- Reuse: `useRoles`, `useModules`, `useAllRolePermissions`/`useRolePermissions`, `useCreateRole`/`useRenameRole`/`useDeleteRole`, `usePermissionMutation` (for Kopyala replication), `RoleFormModal`, `ConfirmDialog`, `AccessDenied`, `permission-presets`.

**Interfaces:**
- Consumes: T1 primitives; T2 header; existing hooks.
- Produces: `roleModuleSummary(cells: PermissionCell[], modules: ModuleResponse[]): string` — "Tüm modüller · Tüm projeler" style one-liner from a role's permission cells.

- [ ] **Step 1: Write failing test for `roleModuleSummary`.** `role-summary.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { roleModuleSummary } from "./role-summary";
import type { PermissionCell, ModuleResponse } from "@/lib/api/models";

const modules: ModuleResponse[] = [
  { id: "1", key: "dashboard", name: "Gösterge Paneli", group: "GENEL", sort_order: 1 },
  { id: "2", key: "inventory", name: "Stok & Depo", group: "STOK_SATINALMA", sort_order: 1 },
] as ModuleResponse[];

describe("roleModuleSummary", () => {
  it("tüm modüllere tam erişimde 'Tüm modüller' özetler", () => {
    const cells: PermissionCell[] = [
      { module_key: "dashboard", access_level: "full", scope: "all" },
      { module_key: "inventory", access_level: "full", scope: "all" },
    ];
    expect(roleModuleSummary(cells, modules)).toBe("Tüm modüller");
  });
  it("kısmi erişimde erişilen modül adlarını listeler", () => {
    const cells: PermissionCell[] = [
      { module_key: "dashboard", access_level: "view", scope: "all" },
      { module_key: "inventory", access_level: "none", scope: "all" },
    ];
    expect(roleModuleSummary(cells, modules)).toBe("Gösterge Paneli");
  });
  it("hiç erişim yoksa 'Erişim yok' döner", () => {
    const cells: PermissionCell[] = [
      { module_key: "dashboard", access_level: "none", scope: "all" },
      { module_key: "inventory", access_level: "none", scope: "all" },
    ];
    expect(roleModuleSummary(cells, modules)).toBe("Erişim yok");
  });
});
```

- [ ] **Step 2: Run test, verify FAIL.** Run: `pnpm test role-summary` → FAIL.

- [ ] **Step 3: Implement `role-summary.ts`:**

```ts
import type { PermissionCell, ModuleResponse } from "@/lib/api/models";

// Rol kartı alt-satırı için modül-kapsam özeti (ref §A.6).
export function roleModuleSummary(cells: PermissionCell[], modules: ModuleResponse[]): string {
  const accessible = cells.filter((c) => c.access_level !== "none");
  if (accessible.length === 0) return "Erişim yok";
  if (accessible.length === modules.length && accessible.every((c) => c.access_level === "full" || c.access_level === "admin")) {
    return "Tüm modüller";
  }
  const nameByKey = new Map(modules.map((m) => [m.key, m.name]));
  return accessible
    .map((c) => nameByKey.get(c.module_key))
    .filter((n): n is string => Boolean(n))
    .slice(0, 4)
    .join(" · ");
}
```

- [ ] **Step 4: Run test, verify PASS.** Run: `pnpm test role-summary` → PASS.

- [ ] **Step 5: Write `roles-screen.css`.** Master-detail per ref §A.6 (290px grid, gradient system card, SİSTEM tag, dashed create button, detail rows, info banner). Full stylesheet:

```css
.roles-grid { display: grid; grid-template-columns: 290px 1fr; gap: 20px; }
.roles-list { display: flex; flex-direction: column; gap: 8px; }
.role-card {
  border-radius: var(--radius-lg); padding: 14px 16px;
  background: var(--color-surface); border: 1px solid var(--color-border);
  cursor: pointer; text-align: left; width: 100%;
}
.role-card--active { box-shadow: var(--focus-ring); }
.role-card--system {
  background: linear-gradient(135deg, var(--color-text), var(--color-slate-700));
  border: 2px solid var(--color-slate-700); color: var(--color-on-brand);
}
.role-card__head { display: flex; align-items: center; gap: 8px; }
.role-card__emoji { font-size: 18px; }
.role-card__name { font-size: 14px; font-weight: 700; }
.role-card--plain .role-card__name { font-weight: 600; }
.role-card__count { font-size: 11px; color: var(--color-text-subtle); }
.role-card--system .role-card__count { color: var(--color-on-brand-60); }
.role-card__tag {
  margin-left: auto; font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: var(--radius-8);
  background: var(--color-text); color: var(--color-on-brand);
}
.role-card--system .role-card__tag { background: var(--color-on-brand-15); color: var(--color-on-brand); }
.role-card__summary { margin-top: 6px; font-size: 12px; color: var(--color-text-muted); }
.role-card--system .role-card__summary { color: var(--color-on-brand-70); }
.role-create {
  background: var(--color-surface-2); border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-lg); padding: 12px; font-size: 12px; color: var(--color-text-subtle);
  font-weight: 500; cursor: pointer; width: 100%;
}
.role-detail__head { display: flex; align-items: center; gap: 12px; padding-bottom: 16px; margin-bottom: 18px; border-bottom: 1px solid var(--color-divider); }
.role-detail__emoji { font-size: 28px; }
.role-detail__name { font-size: 16px; font-weight: 700; color: var(--color-text); }
.role-detail__sub { font-size: 12px; color: var(--color-text-subtle); }
.role-detail__copy { margin-left: auto; background: var(--color-surface-muted); color: var(--color-text-secondary); border: none; padding: 7px 14px; border-radius: var(--radius-8); font-size: 12px; cursor: pointer; }
.role-banner {
  display: flex; align-items: center; gap: 8px;
  background: var(--color-success-tint); border: 1px solid var(--color-success-tint-border);
  border-radius: var(--radius-10); padding: 12px 14px; margin-bottom: 18px;
  font-size: 13px; color: var(--color-success); font-weight: 500;
}
.role-modules__label { font-size: 13px; font-weight: 600; color: var(--color-text); margin-bottom: 12px; }
.role-modules__list { display: flex; flex-direction: column; gap: 6px; }
.role-module-row { display: flex; align-items: center; padding: 10px 14px; background: var(--color-surface-2); border-radius: var(--radius-8); }
.role-module-row--emph { background: var(--color-success-tint); border: 1px solid var(--color-success-tint-border); }
.role-module-row__name { font-size: 13px; color: var(--color-text); }
.role-module-row--emph .role-module-row__name { font-weight: 600; }
.role-module-row__badge { margin-left: auto; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: var(--radius-10); background: var(--color-success-soft); color: var(--color-success); }
.role-module-row--emph .role-module-row__badge { background: var(--color-success); color: var(--color-on-brand); }
```

- [ ] **Step 6: Rewrite `RolesScreen.tsx`.** Client component. Selection state `selectedRoleId` (default first role). Left list uses `roleModuleSummary` + `useAllRolePermissions(roleIds)`; right detail uses selected role's cells. "Kopyala" = composite client flow per ref §C.2 (create role then replicate 13 permission rows). Structure:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { SettingsCard } from "@/components/settings/primitives/SettingsCard";
import { AccessChip } from "@/components/settings/primitives/AccessChip";
import { useRoles } from "@/lib/api/hooks/useRoles";
import { useModules } from "@/lib/api/hooks/useModules";
import { useAllRolePermissions } from "@/lib/api/hooks/useRolePermissions";
import { useCreateRole, useDeleteRole } from "@/lib/api/hooks/useRoleMutations";
import { usePermissionMutation } from "@/lib/api/hooks/usePermissionMutation";
import { RoleFormModal } from "@/components/settings/RoleFormModal";
import { ConfirmDialog } from "@/components/settings/ConfirmDialog";
import { AccessDenied } from "@/components/settings/AccessDenied";
import { matchPreset } from "@/lib/api/permission-presets";
import { roleModuleSummary } from "./role-summary";
import { isForbidden } from "@/lib/api/unwrap";
import { cx } from "@/lib/cx";
import type { PermissionCell } from "@/lib/api/models";
import "./roles-screen.css";

// SİSTEM vurgulu modül anahtarları (ref §A.6 — koyu/ters badge):
const EMPH_MODULES = new Set(["settings", "user_management"]);

export function RolesScreen() {
  const rolesQuery = useRoles();
  const modulesQuery = useModules();
  const roles = rolesQuery.data ?? [];
  const permQueries = useAllRolePermissions(roles.map((r) => r.id));
  const createRole = useCreateRole();
  const deleteRole = useDeleteRole();
  const permMutation = usePermissionMutation();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modal, setModal] = useState<{ type: "create" } | { type: "delete"; id: string; name: string } | null>(null);

  if (rolesQuery.isLoading || modulesQuery.isLoading) return <p className="settings-note">Yükleniyor…</p>;
  if (isForbidden(rolesQuery.error) || isForbidden(modulesQuery.error)) return <AccessDenied />;
  if (rolesQuery.isError || modulesQuery.isError || !modulesQuery.data) return <p className="settings-note settings-note--error">Roller yüklenemedi.</p>;

  const modules = modulesQuery.data;
  const cellsByRole: Record<string, PermissionCell[]> = {};
  roles.forEach((r, i) => { cellsByRole[r.id] = permQueries[i]?.data ?? []; });
  const selected = roles.find((r) => r.id === (selectedId ?? roles[0]?.id));

  async function handleCopy() {
    if (!selected) return;
    const created = await createRole.mutateAsync({
      key: `${selected.key}_kopya_${Date.now()}`, name: `${selected.name} (Kopya)`,
      emoji: selected.emoji, description: selected.description,
    });
    // 13 izin satırını replikле (ref §C.2)
    for (const cell of cellsByRole[selected.id] ?? []) {
      await permMutation.mutateAsync({ roleId: created.id, moduleKey: cell.module_key, update: { access_level: cell.access_level, scope: cell.scope } });
    }
  }

  return (
    <div className="roles-grid">
      <div className="roles-list">
        {roles.map((r, i) => {
          const cells = permQueries[i]?.data ?? [];
          const active = r.id === selected?.id;
          const isGradient = r.key === "system_admin";
          return (
            <button key={r.id} type="button"
              className={cx("role-card", isGradient ? "role-card--system" : "role-card--plain", active && "role-card--active")}
              onClick={() => setSelectedId(r.id)}>
              <span className="role-card__head">
                <span className="role-card__emoji" aria-hidden="true">{r.emoji}</span>
                <span>
                  <span className="role-card__name">{r.name}</span>
                  <span className="role-card__count"> · {/* kullanıcı sayısı: opsiyonel, useUsers count join */}</span>
                </span>
                {r.is_system && <span className="role-card__tag">SİSTEM</span>}
              </span>
              <span className="role-card__summary">{roleModuleSummary(cells, modules)}</span>
            </button>
          );
        })}
        <button type="button" className="role-create" onClick={() => setModal({ type: "create" })}>+ Özel Rol Oluştur</button>
      </div>

      {selected && (
        <SettingsCard>
          <div className="role-detail__head">
            <span className="role-detail__emoji" aria-hidden="true">{selected.emoji}</span>
            <div>
              <div className="role-detail__name">{selected.name}</div>
              <div className="role-detail__sub">{selected.description}</div>
            </div>
            <button type="button" className="role-detail__copy" onClick={handleCopy} disabled={createRole.isPending}>Kopyala</button>
          </div>
          {selected.is_system && (
            <div className="role-banner">✓ Bu rol tüm modüllere ve tüm sistem ayarlarına tam erişime sahiptir.</div>
          )}
          <div className="role-modules__label">Modül Erişimleri</div>
          <div className="role-modules__list">
            {modules.map((m) => {
              const cell = (cellsByRole[selected.id] ?? []).find((c) => c.module_key === m.key);
              const preset = cell ? matchPreset(cell.access_level, cell.scope) : null;
              const emph = EMPH_MODULES.has(m.key);
              return (
                <div key={m.id} className={cx("role-module-row", emph && "role-module-row--emph")}>
                  <span className="role-module-row__name">{m.emoji ?? ""} {m.name}</span>
                  <span className="role-module-row__badge">{preset?.label ?? "—"}{emph && " ✓"}</span>
                </div>
              );
            })}
          </div>
        </SettingsCard>
      )}

      {modal?.type === "create" && <RoleFormModal mode="create" onClose={() => setModal(null)} />}
      {modal?.type === "delete" && (
        <ConfirmDialog title="Rolü Sil" message={`"${modal.name}" rolünü silmek istediğinize emin misiniz?`}
          confirmLabel="Sil" danger isPending={deleteRole.isPending}
          onConfirm={() => deleteRole.mutate(modal.id, { onSuccess: () => setModal(null) })} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
```

**NOTE (user-count subtitle):** the mockup shows "N kullanıcı" per role card. Deriving it needs a role→user-count map. **Decision:** omit the exact count for now (render just the role, no count) OR add a lightweight `useUsers({limit:200,offset:0})` count-by-role reduction — flag as minor. Keep the `role-card__count` span empty-safe. `matchPreset` may return `null` for admin/all on system_admin → the badge shows the preset label; verify `super` preset (admin/all) maps to "Süper (silme dahil)" which the mockup renders as "Tam Erişim" — **override:** for system roles, render the badge text "Tam Erişim" when `access_level` is `full` or `admin` to match the mockup wording. Add that conditional in the badge expression.

- [ ] **Step 7: Update `roller/page.tsx`:**

```tsx
import { Suspense } from "react";
import { SettingsHeader } from "@/components/settings/shell/SettingsHeader";
import { RolesScreen } from "@/components/settings/roles/RolesScreen";

export default function RollerPage() {
  return (
    <>
      <SettingsHeader title="Rol Yönetimi" subtitle="Rolleri ve modül erişim yetkilerini özelleştirin" />
      <Suspense fallback={<p className="settings-note">Yükleniyor…</p>}>
        <RolesScreen />
      </Suspense>
    </>
  );
}
```

(Mockup shows a "+ Yeni Rol" primary button inline with the h1. To match, pass `action={<Button variant="primary" size="sm">+ Yeni Rol</Button>}` wired to open the create modal — but the button must live inside the client screen to access state. **Decision:** render the "+ Yeni Rol" button inside `RolesScreen` as a floating header action is not possible from the page-level header; instead keep the dashed "+ Özel Rol Oluştur" (already in the list) as the create entry and add the inline "+ Yeni Rol" as a secondary create trigger inside `RolesScreen` positioned via CSS at the top-right of the grid. Flag: the header-inline button placement is approximated. **OPEN QUESTION (non-blocking):** move `SettingsHeader` action rendering into the client screen so the "+ Yeni Rol" button sits exactly inline with the h1? Recommended follow-up if pixel fidelity requires it.)

- [ ] **Step 8: Delete old + migrate test.** `git rm src/components/settings/RolesScreen.tsx src/components/settings/RolesScreen.test.tsx`; create `src/components/settings/roles/RolesScreen.test.tsx` asserting the list renders role names and the detail shows "Modül Erişimleri". Run: `pnpm test roles` → green.

- [ ] **Step 9: Gates.** Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` → PASS.

- [ ] **Step 10: Commit.**

```bash
git add src/components/settings/roles src/app/(app)/ayarlar/roller
git rm src/components/settings/RolesScreen.tsx src/components/settings/RolesScreen.test.tsx
git commit -m "feat: rebuild Rol Yönetimi as master-detail per mockup"
```

---

## Task 5: İzin Matrisi — chrome restyle only

**Amaç:** Keep the existing matrix interaction (dropdown `Select` + optimistic PUT) and the "Erişim düzeyleri" legend — **restyle only the surrounding chrome**: wrap in a full-width `SettingsCard`, dark group-header rows, per-role brand-colored column headers, and a bottom action bar (İptal / Değişiklikleri Kaydet). Do NOT convert cells to static chips.

**Mockup:** `Ayarlar - İzin Matrisi.dc.html` / `03-izin.png` / ref §B.3 + §A.7.

**Files:**
- Rewrite (chrome): move `src/components/settings/PermissionMatrix.tsx` → `src/components/settings/permissions/PermissionMatrix.tsx` (interaction logic unchanged)
- Modify: `src/components/settings/settings.css` matrix rules (or new `permissions/permission-matrix.css`) for dark group headers + role-color heads + action bar
- Modify: `src/app/(app)/ayarlar/izin-matrisi/page.tsx`
- Reuse: `useModules`, `useRoles`, `useAllRolePermissions`, `usePermissionMutation`, `permission-presets`, `roleVisual`.

- [ ] **Step 1: Add matrix chrome CSS.** Create `src/components/settings/permissions/permission-matrix.css` (import from the component). Group-header dark row + role head colors + action bar (ref §A.7). **Decision on the mockup's group-header inconsistency (ref §A.7): make ALL group headers uniformly dark** (`--color-text` bg) for internal consistency — flagged and chosen:

```css
.matrix-scroll { overflow-x: auto; }
.matrix-table { border-collapse: collapse; min-width: 800px; width: 100%; background: var(--color-surface); }
.matrix-table thead tr { background: var(--color-surface-2); border-bottom: 2px solid var(--color-border); }
.matrix-table th.matrix-col-head { padding: 12px 16px; min-width: 180px; font-size: 12px; font-weight: 600; color: var(--color-text-muted); text-align: left; }
.matrix-role-head { padding: 12px 10px; min-width: 90px; font-size: 11px; font-weight: 700; text-align: center; }
.matrix-role-head__emoji { display: block; }
.matrix-group-row td, .matrix-group-row th {
  background: var(--color-text); color: var(--color-on-brand-70);
  padding: 8px 16px; font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.5px; text-align: left;
}
.matrix-table tbody td { padding: 12px 10px; text-align: center; border-bottom: 1px solid var(--color-divider); }
.matrix-module-name { text-align: left; font-size: 13px; color: var(--color-text); font-weight: 600; padding-left: 16px; }
.matrix-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }
```

(Keep the legend card styles from `settings.css` as-is; the legend stays.)

- [ ] **Step 2: Restyle `PermissionMatrix.tsx` chrome.** Wrap the table in `<SettingsCard bodyPad="flush">`, apply role-brand color to each role column header via `roleVisual(role.key).badgeText`, use the uniformly-dark `.matrix-group-row`, and add the bottom action bar. The `Select`/optimistic-mutation logic and legend are copied verbatim from the existing component (no behavior change). Key header change:

```tsx
{roles.map((role) => (
  <th key={role.id} className="matrix-role-head" style={{ color: roleVisual(role.key).badgeText }}>
    <span className="matrix-role-head__emoji" aria-hidden="true">{role.emoji}</span>
    {role.name}
  </th>
))}
```

Add below the table (inside the card body wrapper or after the scroll container):

```tsx
<div className="matrix-actions">
  <Button variant="secondary">İptal</Button>
  <Button variant="primary">Değişiklikleri Kaydet</Button>
</div>
```

**NOTE:** the matrix already persists each change optimistically on `Select` change (per-cell PUT), so "Değişiklikleri Kaydet" has no batch to save. **Decision:** render the action bar for visual fidelity but make "Değişiklikleri Kaydet" a no-op-with-toast ("Değişiklikler otomatik kaydedildi") and "İptal" navigate back, OR hide the bar behind a comment. To match the mockup exactly, render both buttons; wire "Değişiklikleri Kaydet" to `router.refresh()` (re-fetch) and "İptal" to `router.back()`. Flag this as a cosmetic bar over an already-autosaving grid. **OPEN QUESTION (non-blocking):** should the matrix switch to a batch "save on button" model to make the bar functional? Default: keep autosave; bar is cosmetic + refresh.

- [ ] **Step 3: Update `izin-matrisi/page.tsx`** with `SettingsHeader title="İzin Matrisi" subtitle="Her rol için modül bazlı erişim düzeyini ayarlayın"` + Suspense wrapper + new import path.

- [ ] **Step 4: Migrate the existing test.** Move `PermissionMatrix.test.tsx` to `permissions/`; keep the interaction assertions (Select change triggers mutation). Run: `pnpm test PermissionMatrix` → green.

- [ ] **Step 5: Gates.** Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` → PASS.

- [ ] **Step 6: Commit.**

```bash
git add src/components/settings/permissions src/app/(app)/ayarlar/izin-matrisi src/components/settings/settings.css
git rm src/components/settings/PermissionMatrix.tsx src/components/settings/PermissionMatrix.test.tsx
git commit -m "feat: restyle İzin Matrisi chrome to mockup (interaction unchanged)"
```

---

## Task 6: Şirket Bilgileri — wired form (backend exists)

**Amaç:** Build the 2×2 form-card grid (Firma Bilgileri, İletişim & Adres, Logo & Marka, Fatura & e-Fatura Ayarları) wired to `GET/PUT /company`. Requires T3a (typed schema).

**Mockup:** `Ayarlar - Şirket Bilgileri.dc.html` / `04-sirket.png` / ref §B.4 + §A.8. Backend: ref §C.4.

**Files:**
- Create: `src/lib/api/hooks/useCompany.ts` (+ `.test.tsx` optional)
- Create: `src/components/settings/company/CompanyScreen.tsx`
- Create: `src/components/settings/company/company-screen.css`
- Create: `src/app/(app)/ayarlar/sirket-bilgileri/page.tsx`

**Interfaces:**
- Produces: `useCompany(): UseQueryResult<CompanyRead>`, `useUpdateCompany(): UseMutationResult<CompanyRead, Error, CompanyUpdate>`.

- [ ] **Step 1: Write `useCompany.ts`** (mirror existing hook style):

```ts
import { useQuery, useMutation, useQueryClient, type UseQueryResult, type UseMutationResult } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type { CompanyRead, CompanyUpdate } from "@/lib/api/models";

export const COMPANY_QUERY_KEY = "company";

export function useCompany(): UseQueryResult<CompanyRead, Error> {
  return useQuery({ queryKey: [COMPANY_QUERY_KEY], queryFn: async () => unwrap(await backendClient.GET("/company", {})) });
}

export function useUpdateCompany(): UseMutationResult<CompanyRead, Error, CompanyUpdate> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CompanyUpdate) => unwrap(await backendClient.PUT("/company", { body })),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [COMPANY_QUERY_KEY] }); },
  });
}
```

(Confirm the generated path string is `"/company"` after `gen:api`; adjust if it emits a trailing form.)

- [ ] **Step 2: Write `company-screen.css`.** Form grid + inputs (ref §A.8):

```css
.company-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.company-form { display: flex; flex-direction: column; gap: 16px; }
.company-field { display: flex; flex-direction: column; gap: 4px; }
.company-field__label { font-size: 12px; font-weight: 500; color: var(--color-text-muted); }
.company-field input, .company-field textarea, .company-field select {
  width: 100%; border: 1px solid var(--color-border); border-radius: var(--radius-8);
  padding: 8px 12px; font-size: 13px; color: var(--color-text); background: var(--color-surface);
}
.company-field input.is-mono, .company-field .hex-input { font-family: var(--font-mono); }
.company-logo { display: flex; align-items: center; gap: 16px; }
.company-logo__preview { width: 80px; height: 80px; border-radius: var(--radius-lg); background: var(--color-primary-soft); display: flex; align-items: center; justify-content: center; }
.company-color-row { display: flex; align-items: center; gap: 10px; }
.company-swatch { width: 28px; height: 28px; border-radius: var(--radius-8); border: 1px solid var(--color-border); }
.company-toggle-row { display: flex; align-items: center; justify-content: space-between; }
.company-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
```

- [ ] **Step 3: Write `CompanyScreen.tsx`.** Client component; controlled form seeded from `useCompany`, PUT on save. Use `SettingsCard` per quadrant, `Toggle` for auto e-Fatura. Render logo preview from `company.logo_url` when `has_logo`. Structure (abbreviated fields shown — include ALL fields from ref §B.4):

```tsx
"use client";
import { useEffect, useState } from "react";
import { Button, Toggle } from "@/components/ui";
import { SettingsCard } from "@/components/settings/primitives/SettingsCard";
import { useCompany, useUpdateCompany } from "@/lib/api/hooks/useCompany";
import { AccessDenied } from "@/components/settings/AccessDenied";
import { isForbidden } from "@/lib/api/unwrap";
import { backendErrorMessage } from "@/lib/settings/error-message";
import type { CompanyUpdate } from "@/lib/api/models";
import "./company-screen.css";

export function CompanyScreen() {
  const query = useCompany();
  const update = useUpdateCompany();
  const [form, setForm] = useState<CompanyUpdate>({});
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (query.data) setForm({
      name: query.data.name, tax_number: query.data.tax_number, tax_office: query.data.tax_office,
      trade_registry_no: query.data.trade_registry_no, kep_address: query.data.kep_address,
      phone: query.data.phone, email: query.data.email, website: query.data.website, address: query.data.address,
      brand_color: query.data.brand_color, gib_integration_code: query.data.gib_integration_code,
      earsiv_portal: query.data.earsiv_portal, default_vat_rate: query.data.default_vat_rate, auto_einvoice: query.data.auto_einvoice,
    });
  }, [query.data]);

  if (query.isLoading) return <p className="settings-note">Yükleniyor…</p>;
  if (isForbidden(query.error)) return <AccessDenied />;
  if (query.isError || !query.data) return <p className="settings-note settings-note--error">Şirket bilgileri yüklenemedi.</p>;

  const set = (patch: Partial<CompanyUpdate>) => setForm((f) => ({ ...f, ...patch }));
  const field = (label: string, key: keyof CompanyUpdate, mono = false) => (
    <label className="company-field">
      <span className="company-field__label">{label}</span>
      <input className={mono ? "is-mono" : undefined} value={(form[key] as string) ?? ""} onChange={(e) => set({ [key]: e.target.value } as Partial<CompanyUpdate>)} />
    </label>
  );

  function save() {
    setErr(null);
    update.mutate(form, { onError: (e) => setErr(backendErrorMessage(e)) });
  }

  return (
    <>
      <div className="company-grid">
        <SettingsCard title="Firma Bilgileri">
          <div className="company-form">
            {field("Firma Adı", "name")}{field("Vergi No", "tax_number")}{field("Vergi Dairesi", "tax_office")}
            {field("Ticaret Sicil No", "trade_registry_no")}{field("KEP Adresi", "kep_address")}
          </div>
        </SettingsCard>
        <SettingsCard title="İletişim & Adres">
          <div className="company-form">
            {field("Telefon", "phone")}{field("E-posta", "email")}{field("Web Sitesi", "website")}
            <label className="company-field"><span className="company-field__label">Adres</span>
              <textarea rows={2} value={form.address ?? ""} onChange={(e) => set({ address: e.target.value })} /></label>
          </div>
        </SettingsCard>
        <SettingsCard title="Logo & Marka">
          <div className="company-logo">
            <span className="company-logo__preview" aria-hidden="true">🏢</span>
            <div>
              <div className="company-field__label">FİİL Yapı Logo</div>
              <Button variant="secondary" size="sm">↑ Logo Yükle</Button>
            </div>
          </div>
          <label className="company-field" style={{ marginTop: 16 }}>
            <span className="company-field__label">Birincil Renk</span>
            <span className="company-color-row">
              <span className="company-swatch" style={{ background: form.brand_color ?? "#2563eb" }} />
              <input className="hex-input" value={form.brand_color ?? ""} onChange={(e) => set({ brand_color: e.target.value })} />
            </span>
          </label>
        </SettingsCard>
        <SettingsCard title="Fatura & e-Fatura Ayarları">
          <div className="company-form">
            {field("GİB Entegrasyon Kodu", "gib_integration_code", true)}
            <label className="company-field"><span className="company-field__label">e-Arşiv Portalı</span>
              <select value={form.earsiv_portal ?? ""} onChange={(e) => set({ earsiv_portal: e.target.value })}>
                <option value="Logo e-Fatura">Logo e-Fatura</option><option value="GİB Portal">GİB Portal</option>
              </select></label>
            <label className="company-field"><span className="company-field__label">KDV Oranı (Varsayılan)</span>
              <select value={String(form.default_vat_rate ?? "20")} onChange={(e) => set({ default_vat_rate: e.target.value as unknown as number })}>
                <option value="20">%20</option><option value="10">%10</option><option value="1">%1</option>
              </select></label>
            <div className="company-toggle-row">
              <span className="company-field__label">Otomatik e-Fatura</span>
              <Toggle checked={form.auto_einvoice ?? false} onChange={(e) => set({ auto_einvoice: e.target.checked })} aria-label="Otomatik e-Fatura" />
            </div>
          </div>
        </SettingsCard>
      </div>
      {err && <p className="settings-note settings-note--error">{err}</p>}
      <div className="company-actions">
        <Button variant="secondary" onClick={() => query.refetch()}>İptal</Button>
        <Button variant="primary" onClick={save} disabled={update.isPending}>Değişiklikleri Kaydet</Button>
      </div>
    </>
  );
}
```

**NOTE (logo upload + brand_color validation):** logo upload uses `POST /company/logo` (multipart) — out of scope for the first pass; the "Logo Yükle" button is present but wiring the upload is a flagged follow-up. `brand_color`/`default_vat_rate` have backend patterns/ranges; on 4xx show `backendErrorMessage`. `default_vat_rate` is `Decimal` — send as string; confirm the generated type accepts it (the cast above is a pragmatic bridge; adjust to the generated `number | string`).

- [ ] **Step 4: Write `sirket-bilgileri/page.tsx`:**

```tsx
import { SettingsHeader } from "@/components/settings/shell/SettingsHeader";
import { CompanyScreen } from "@/components/settings/company/CompanyScreen";

export default function SirketBilgileriPage() {
  return (
    <>
      <SettingsHeader title="Şirket Bilgileri" subtitle="Firma bilgilerini ve iletişim ayarlarını yönetin" />
      <CompanyScreen />
    </>
  );
}
```

- [ ] **Step 5: Gates.** Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` → PASS.

- [ ] **Step 6: Commit.**

```bash
git add src/lib/api/hooks/useCompany.ts src/components/settings/company src/app/(app)/ayarlar/sirket-bilgileri
git commit -m "feat: add Şirket Bilgileri wired form"
```

---

## Task 7: Bildirimler — wired category checklist

**Amaç:** Build 3 category cards (💰 Hakediş & Ödeme, 📦 Stok & Satınalma, 👷 Saha & İK) of event rows × 3 channel checkboxes (E-posta / Uygulama / SMS), wired to `GET/PUT /settings/notifications`. Requires T3a (7 events in backend).

**Mockup:** `Ayarlar - Bildirimler.dc.html` / `05-bildirimler.png` / ref §B.5 + §C.5.

**Files:**
- Create: `src/lib/api/hooks/useNotificationPrefs.ts`
- Create: `src/components/settings/notifications/NotificationsScreen.tsx`
- Create: `src/components/settings/notifications/notification-groups.ts` (+ `.test.ts` — maps event_key → category)
- Create: `src/components/settings/notifications/notifications-screen.css`
- Create: `src/app/(app)/ayarlar/bildirimler/page.tsx`

**Interfaces:**
- Produces: `useNotificationPrefs()`, `useUpdateNotificationPrefs()`; `NOTIF_GROUPS: { heading: string; emoji: string; keys: string[] }[]`.

- [ ] **Step 1: Write failing test for grouping.** `notification-groups.test.ts` asserts each of the 7 event keys is assigned to exactly one of the 3 categories and unknown keys are ignored:

```ts
import { describe, it, expect } from "vitest";
import { NOTIF_GROUPS, groupNotifications } from "./notification-groups";
import type { NotificationPrefItem } from "@/lib/api/models";

describe("NOTIF_GROUPS", () => {
  it("3 kategori tanımlar", () => {
    expect(NOTIF_GROUPS.map((g) => g.heading)).toEqual(["Hakediş & Ödeme", "Stok & Satınalma", "Saha & İK"]);
  });
});

describe("groupNotifications", () => {
  it("olayları kategoriye dağıtır, bilinmeyeni atar", () => {
    const items: NotificationPrefItem[] = [
      { event_key: "vat_due_soon", label: "KDV", email: true, in_app: true, sms: false },
      { event_key: "stock_low", label: "Stok", email: false, in_app: true, sms: false },
      { event_key: "user_added", label: "Ekstra", email: false, in_app: true, sms: false },
    ];
    const grouped = groupNotifications(items);
    expect(grouped[0].items.map((i) => i.event_key)).toContain("vat_due_soon");
    expect(grouped[1].items.map((i) => i.event_key)).toContain("stock_low");
    expect(grouped.flatMap((g) => g.items).map((i) => i.event_key)).not.toContain("user_added");
  });
});
```

- [ ] **Step 2: Run test, verify FAIL.** Run: `pnpm test notification-groups` → FAIL.

- [ ] **Step 3: Implement `notification-groups.ts`.** Keys must match the backend event keys added in T3a:

```ts
import type { NotificationPrefItem } from "@/lib/api/models";

export interface NotifGroup { heading: string; emoji: string; keys: string[] }

export const NOTIF_GROUPS: NotifGroup[] = [
  { heading: "Hakediş & Ödeme", emoji: "💰", keys: ["progress_payment_created", "progress_payment_approved", "vat_due_soon"] },
  { heading: "Stok & Satınalma", emoji: "📦", keys: ["stock_low", "purchase_approval_pending"] },
  { heading: "Saha & İK", emoji: "👷", keys: ["payroll_payday", "daily_log_missing"] },
];

export function groupNotifications(items: NotificationPrefItem[]): { heading: string; emoji: string; items: NotificationPrefItem[] }[] {
  const byKey = new Map(items.map((i) => [i.event_key, i]));
  return NOTIF_GROUPS.map((g) => ({
    heading: g.heading, emoji: g.emoji,
    items: g.keys.map((k) => byKey.get(k)).filter((i): i is NotificationPrefItem => Boolean(i)),
  }));
}
```

- [ ] **Step 4: Run test, verify PASS.** Run: `pnpm test notification-groups` → PASS.

- [ ] **Step 5: Write `useNotificationPrefs.ts`:**

```ts
import { useQuery, useMutation, useQueryClient, type UseQueryResult, type UseMutationResult } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type { NotificationPrefItem, NotificationPrefsUpdate } from "@/lib/api/models";

export const NOTIF_QUERY_KEY = "notification-prefs";

export function useNotificationPrefs(): UseQueryResult<NotificationPrefItem[], Error> {
  return useQuery({ queryKey: [NOTIF_QUERY_KEY], queryFn: async () => unwrap(await backendClient.GET("/settings/notifications", {})) });
}

export function useUpdateNotificationPrefs(): UseMutationResult<NotificationPrefItem[], Error, NotificationPrefsUpdate> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: NotificationPrefsUpdate) => unwrap(await backendClient.PUT("/settings/notifications", { body })),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [NOTIF_QUERY_KEY] }); },
  });
}
```

- [ ] **Step 6: Write `notifications-screen.css`** (category card rows + 3-checkbox cluster, ref §B.5):

```css
.notif-stack { display: flex; flex-direction: column; gap: 16px; }
.notif-card__head { display: flex; align-items: center; gap: 8px; padding: 13px 18px; background: var(--color-surface-2); border-bottom: 1px solid var(--color-border); font-size: 14px; font-weight: 600; color: var(--color-text); }
.notif-row { display: flex; align-items: center; padding: 12px 18px; border-bottom: 1px solid var(--color-divider); }
.notif-row:last-child { border-bottom: none; }
.notif-row__name { font-size: 13px; font-weight: 500; color: var(--color-text); }
.notif-row__desc { font-size: 11px; color: var(--color-text-subtle); }
.notif-row__channels { margin-left: auto; display: flex; gap: 20px; }
.notif-channel { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--color-text-secondary); }
.notif-channel input { accent-color: var(--color-primary); }
.notif-actions { display: flex; justify-content: flex-end; margin-top: 20px; }
```

- [ ] **Step 7: Write `NotificationsScreen.tsx`.** Client; local editable copy of items, checkbox toggles, single "Kaydet" (ref §B.5 has no İptal):

```tsx
"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { SettingsCard } from "@/components/settings/primitives/SettingsCard";
import { useNotificationPrefs, useUpdateNotificationPrefs } from "@/lib/api/hooks/useNotificationPrefs";
import { groupNotifications } from "./notification-groups";
import { AccessDenied } from "@/components/settings/AccessDenied";
import { isForbidden } from "@/lib/api/unwrap";
import type { NotificationPrefItem } from "@/lib/api/models";
import "./notifications-screen.css";

type Channel = "email" | "in_app" | "sms";
const CHANNEL_LABEL: Record<Channel, string> = { email: "E-posta", in_app: "Uygulama", sms: "SMS" };

export function NotificationsScreen() {
  const query = useNotificationPrefs();
  const update = useUpdateNotificationPrefs();
  const [items, setItems] = useState<NotificationPrefItem[]>([]);
  useEffect(() => { if (query.data) setItems(query.data); }, [query.data]);

  if (query.isLoading) return <p className="settings-note">Yükleniyor…</p>;
  if (isForbidden(query.error)) return <AccessDenied />;
  if (query.isError) return <p className="settings-note settings-note--error">Bildirim ayarları yüklenemedi.</p>;

  const toggle = (key: string, ch: Channel) =>
    setItems((prev) => prev.map((it) => (it.event_key === key ? { ...it, [ch]: !it[ch] } : it)));
  const save = () => update.mutate({ items: items.map(({ event_key, email, in_app, sms }) => ({ event_key, email, in_app, sms })) });
  const grouped = groupNotifications(items);

  return (
    <>
      <div className="notif-stack">
        {grouped.map((g) => (
          <SettingsCard key={g.heading} bodyPad="flush">
            <div className="notif-card__head"><span aria-hidden="true">{g.emoji}</span> {g.heading}</div>
            {g.items.map((it) => (
              <div key={it.event_key} className="notif-row">
                <div>
                  <div className="notif-row__name">{it.label}</div>
                </div>
                <div className="notif-row__channels">
                  {(["email", "in_app", "sms"] as Channel[]).map((ch) => (
                    <label key={ch} className="notif-channel">
                      <input type="checkbox" checked={it[ch]} onChange={() => toggle(it.event_key, ch)} /> {CHANNEL_LABEL[ch]}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </SettingsCard>
        ))}
      </div>
      <div className="notif-actions"><Button variant="primary" onClick={save} disabled={update.isPending}>Kaydet</Button></div>
    </>
  );
}
```

- [ ] **Step 8: Write `bildirimler/page.tsx`** with `SettingsHeader title="Bildirim Ayarları" subtitle="Hangi olaylarda ve hangi kanaldan bilgilendirileceğinizi seçin"` + `<NotificationsScreen />`.

- [ ] **Step 9: Gates.** Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` → PASS.

- [ ] **Step 10: Commit.**

```bash
git add src/lib/api/hooks/useNotificationPrefs.ts src/components/settings/notifications src/app/(app)/ayarlar/bildirimler
git commit -m "feat: add Bildirimler wired category checklist"
```

---

## Task 8: Görünüm — wired preferences (theme light-locked)

**Amaç:** Build the 2×2 grid — Tema (3 preview cards, only Açık selectable), Vurgu Rengi (7 swatches), Dil & Bölge (locale/currency/date_format selects), Arayüz Yoğunluğu (3 radio rows) — wired to `GET/PUT /settings/preferences`. Koyu/Sistem render but are disabled (server rejects). Requires T3a.

**Mockup:** `Ayarlar - Görünüm.dc.html` / `06-gorunum.png` / ref §B.6 + §C.6.

**Files:**
- Create: `src/lib/api/hooks/usePreferences.ts`
- Create: `src/components/settings/appearance/AppearanceScreen.tsx`
- Create: `src/components/settings/appearance/appearance-screen.css`
- Create: `src/app/(app)/ayarlar/gorunum/page.tsx`

- [ ] **Step 1: Write `usePreferences.ts`** (same shape as `useCompany`): `usePreferences()` (GET `/settings/preferences`) + `useUpdatePreferences()` (PUT). Types `PreferencesRead`/`PreferencesUpdate`.

- [ ] **Step 2: Write `appearance-screen.css`** (theme cards, swatch circles, density rows, ref §B.6):

```css
.appearance-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.theme-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.theme-card { border: 2px solid var(--color-border); border-radius: var(--radius-lg); padding: 14px; text-align: center; font-size: 12px; color: var(--color-text-secondary); cursor: pointer; background: var(--color-surface); }
.theme-card--active { border-color: var(--color-primary); }
.theme-card--disabled { opacity: 0.55; cursor: not-allowed; }
.accent-swatches { display: flex; gap: 12px; flex-wrap: wrap; }
.accent-swatch { width: 36px; height: 36px; border-radius: 50%; border: 3px solid transparent; cursor: pointer; }
.accent-swatch--active { border-color: var(--color-primary-soft); }
.pref-field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 14px; }
.pref-field__label { font-size: 12px; font-weight: 500; color: var(--color-text-muted); }
.pref-field select { width: 100%; border: 1px solid var(--color-border); border-radius: var(--radius-8); padding: 8px 12px; font-size: 13px; color: var(--color-text); }
.density-rows { display: flex; flex-direction: column; gap: 10px; }
.density-row { display: flex; flex-direction: column; gap: 2px; border: 2px solid var(--color-border); border-radius: var(--radius-10); padding: 12px 14px; cursor: pointer; }
.density-row--active { border-color: var(--color-primary); background: var(--color-nav-active-bg); }
.density-row__name { font-size: 13px; font-weight: 600; color: var(--color-text); }
.density-row__desc { font-size: 11px; color: var(--color-text-subtle); }
.appearance-actions { display: flex; justify-content: flex-end; margin-top: 20px; }
```

- [ ] **Step 3: Write `AppearanceScreen.tsx`.** Client. 3 theme cards: Açık (selectable), Koyu + Sistem rendered with `theme-card--disabled` + `title="Yakında"` and NOT clickable (ref §C.6 — server 4xx on non-light). 7 accent swatches (values on-palette; primary `#2563eb` default). Dil & Bölge selects bound to `locale`/`currency`/`date_format`. Density radios bound to `density`. Save PUTs only `{ locale, currency, date_format, density, accent_color }` (never send a non-light `theme`). Key theme block:

```tsx
const THEMES = [
  { key: "light", label: "Açık", enabled: true },
  { key: "dark", label: "Koyu", enabled: false },
  { key: "system", label: "Sistem", enabled: false },
];
// ...
<div className="theme-cards">
  {THEMES.map((t) => (
    <button key={t.key} type="button"
      className={cx("theme-card", t.enabled && form.theme === t.key && "theme-card--active", !t.enabled && "theme-card--disabled")}
      disabled={!t.enabled} title={!t.enabled ? "Yakında" : undefined}
      onClick={() => t.enabled && set({ theme: t.key })}>
      {t.label}{t.enabled && form.theme === t.key ? " ✓" : ""}
    </button>
  ))}
</div>
```

Density rows (ref §B.6): Rahat / Normal / Kompakt mapped to `density` enum values (`comfortable`/`normal`/`compact` — confirm exact enum members from `UIDensity` in generated schema). Accent swatch palette (7): `#2563eb, #16a34a, #7c3aed, #f59e0b, #ef4444, #0f766e, #64748b` — but **as tokens**: use `var(--color-primary)`, `var(--color-success)`, `var(--color-accent-purple)`, `var(--color-warning)`, `var(--color-danger)`, `var(--color-accent-teal-start)`, `var(--color-text-muted)`. Save button "Kaydet" (single, no İptal per mockup).

- [ ] **Step 4: Write `gorunum/page.tsx`** with `SettingsHeader title="Görünüm Ayarları" subtitle="Tema, dil ve arayüz tercihlerinizi ayarlayın"` + `<AppearanceScreen />`.

- [ ] **Step 5: Gates.** Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` → PASS.

- [ ] **Step 6: Commit.**

```bash
git add src/lib/api/hooks/usePreferences.ts src/components/settings/appearance src/app/(app)/ayarlar/gorunum
git commit -m "feat: add Görünüm wired preferences (theme light-locked)"
```

---

## Task 9: Entegrasyonlar — static placeholder

**Amaç:** 3-column grid of 6 integration cards (icon-box, name/subtitle, description, status badge + action button), matching the mockup. No backend (ref §C.7) — hardcoded, visibly informational. Buttons are inert (no handlers).

**Mockup:** `Ayarlar - Entegrasyonlar.dc.html` / `07-entegrasyonlar.png` / ref §B.7 + §A.8.

**Files:**
- Create: `src/components/settings/integrations/IntegrationsScreen.tsx`
- Create: `src/components/settings/integrations/integrations-screen.css`
- Create: `src/app/(app)/ayarlar/entegrasyonlar/page.tsx`

- [ ] **Step 1: Write `integrations-screen.css`:**

```css
.integrations-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.integration-card__head { display: flex; align-items: center; gap: 12px; }
.integration-card__icon { width: 44px; height: 44px; border-radius: var(--radius-10); display: flex; align-items: center; justify-content: center; font-size: 20px; background: var(--color-primary-soft); }
.integration-card__name { font-size: 14px; font-weight: 600; color: var(--color-text); }
.integration-card__sub { font-size: 11px; color: var(--color-text-subtle); }
.integration-card__desc { font-size: 12px; color: var(--color-text-secondary); margin: 12px 0; }
.integration-card__footer { display: flex; align-items: center; justify-content: space-between; }
.integration-badge { font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: var(--radius-10); }
.integration-badge--connected { background: var(--color-success-soft); color: var(--color-success); }
.integration-badge--unconfigured { background: var(--color-warning-soft); color: var(--color-warning-strong); }
.integration-badge--off { background: var(--color-surface-muted); color: var(--color-text-muted); }
```

- [ ] **Step 2: Write `IntegrationsScreen.tsx`.** Hardcode the 6 cards (ref §B.7). Include a visible non-functional note. Data array:

```tsx
import { Button } from "@/components/ui";
import { SettingsCard } from "@/components/settings/primitives/SettingsCard";
import { cx } from "@/lib/cx";
import "./integrations-screen.css";

type Status = "connected" | "unconfigured" | "off";
const CARDS: { emoji: string; name: string; sub: string; desc: string; status: Status; action: string; primary: boolean }[] = [
  { emoji: "🧾", name: "GİB e-Fatura", sub: "Gelir İdaresi Başkanlığı", desc: "Otomatik e-fatura gönderimi ve e-arşiv entegrasyonu", status: "connected", action: "Ayarlar", primary: false },
  { emoji: "📗", name: "Logo e-Fatura", sub: "Logo Yazılım", desc: "Logo Tiger / Wings muhasebe entegrasyonu", status: "connected", action: "Ayarlar", primary: false },
  { emoji: "🏦", name: "Ziraat Bankası API", sub: "Açık Bankacılık", desc: "Günlük ekstre ve mutabakat otomasyonu", status: "connected", action: "Ayarlar", primary: false },
  { emoji: "📋", name: "SGK e-Bildirge", sub: "Sosyal Güvenlik Kurumu", desc: "Aylık SGK bildirgesi otomatik hazırlama", status: "unconfigured", action: "Bağla", primary: true },
  { emoji: "💬", name: "WhatsApp Business", sub: "Bildirim ve onay mesajları", desc: "Hakediş ve onay bildirimlerini WhatsApp ile gönder", status: "off", action: "Bağla", primary: true },
  { emoji: "☁️", name: "Bulut Depolama", sub: "OneDrive / Google Drive", desc: "Belge arşivini otomatik buluta yedekle", status: "off", action: "Bağla", primary: true },
];
const STATUS_LABEL: Record<Status, string> = { connected: "Bağlı ✓", unconfigured: "Yapılandırılmadı", off: "Bağlı Değil" };

export function IntegrationsScreen() {
  return (
    <>
      <p className="settings-note">Bu bölüm henüz canlı entegrasyonlara bağlı değildir; kartlar bilgilendirme amaçlıdır.</p>
      <div className="integrations-grid" style={{ marginTop: 16 }}>
        {CARDS.map((c) => (
          <SettingsCard key={c.name} bodyPad="tight">
            <div className="integration-card__head">
              <span className="integration-card__icon" aria-hidden="true">{c.emoji}</span>
              <div>
                <div className="integration-card__name">{c.name}</div>
                <div className="integration-card__sub">{c.sub}</div>
              </div>
            </div>
            <p className="integration-card__desc">{c.desc}</p>
            <div className="integration-card__footer">
              <span className={cx("integration-badge", `integration-badge--${c.status}`)}>{STATUS_LABEL[c.status]}</span>
              <Button variant={c.primary ? "primary" : "secondary"} size="sm" disabled>{c.action}</Button>
            </div>
          </SettingsCard>
        ))}
      </div>
    </>
  );
}
```

(Buttons `disabled` = visibly non-functional per the "clearly non-functional" requirement.)

- [ ] **Step 3: Write `entegrasyonlar/page.tsx`** with `SettingsHeader title="Entegrasyonlar" subtitle="Dış sistemler ve servislerle bağlantı kurun"` + `<IntegrationsScreen />`.

- [ ] **Step 4: Gates.** Run: `pnpm typecheck && pnpm lint && pnpm build` → PASS.

- [ ] **Step 5: Commit.**

```bash
git add src/components/settings/integrations src/app/(app)/ayarlar/entegrasyonlar
git commit -m "feat: add Entegrasyonlar static placeholder page"
```

---

## Task 10: Yedekleme — static placeholder

**Amaç:** Success banner + Otomatik Yedekleme (toggles/selects) + Depolama Kullanımı (mono stat + progress bar + breakdown) + Yedek Geçmişi table. No backend (ref §C.8) — hardcoded, controls inert.

**Mockup:** `Ayarlar - Yedekleme.dc.html` / `08-yedekleme.png` / ref §B.8.

**Files:**
- Create: `src/components/settings/backup/BackupScreen.tsx`
- Create: `src/components/settings/backup/backup-screen.css`
- Create: `src/app/(app)/ayarlar/yedekleme/page.tsx`

- [ ] **Step 1: Write `backup-screen.css`** (banner gradient, progress bar, mono stat, history table). Progress fill uses compositor-safe `transform`? No — width is fine for a static bar; use fixed width via inline style. Key rules:

```css
.backup-banner { display: flex; align-items: center; gap: 14px; background: linear-gradient(135deg, var(--color-success), #22c55e); color: var(--color-on-brand); border-radius: var(--radius-14); padding: 18px 20px; }
.backup-banner__spacer { flex: 1; }
.backup-banner__title { font-size: 15px; font-weight: 700; }
.backup-banner__detail { font-size: 12px; color: var(--color-on-brand-85); }
.backup-banner__btn { background: var(--color-on-brand-15); color: var(--color-on-brand); border: 1px solid var(--color-on-brand-40); border-radius: var(--radius-8); padding: 8px 14px; font-size: 12px; font-weight: 600; cursor: pointer; }
.backup-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }
.backup-toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; }
.backup-toggle-row__name { font-size: 13px; color: var(--color-text); }
.backup-toggle-row__sub { font-size: 11px; color: var(--color-text-subtle); }
.storage-stat { text-align: center; font-family: var(--font-mono); font-size: 28px; font-weight: 700; color: var(--color-primary); }
.storage-stat__total { font-size: 12px; color: var(--color-text-subtle); }
.storage-bar { height: 8px; border-radius: 4px; background: var(--color-surface-muted); overflow: hidden; margin: 14px 0; }
.storage-bar__fill { height: 100%; background: linear-gradient(90deg, var(--color-primary), var(--color-avatar-blue-end)); }
.storage-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: var(--color-text-secondary); }
.storage-row__value { font-family: var(--font-mono); }
.backup-history { width: 100%; border-collapse: collapse; }
.backup-history th { text-align: left; padding: 10px 12px; font-size: 11px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.8px; background: var(--color-surface-2); }
.backup-history td { padding: 12px; font-size: 13px; border-bottom: 1px solid var(--color-divider); }
.backup-history td.is-mono { font-family: var(--font-mono); }
.backup-history td.is-right { text-align: right; }
.backup-history__restore { background: none; border: none; color: var(--color-primary); font-size: 12px; font-weight: 500; cursor: pointer; }
```

- [ ] **Step 2: Write `BackupScreen.tsx`.** Hardcode banner ("Son Yedekleme Başarılı · 17 Temmuz 2026, 02:00 · 2,4 GB · AWS S3 Frankfurt"), toggles (Günlük on, Haftalık on — `disabled` inert `Toggle`), selects (Saklama 90 Gün, Konum AWS S3), storage stat "24,8 GB / 100 GB toplam", fill `width: 24.8%`, breakdown (Veritabanı 18,2 GB / Belgeler & Dosyalar 5,8 GB / Fotoğraflar 0,8 GB), and 4 history rows (ref §B.8). Include a visible "Bu bölüm örnek verilerle gösterilmektedir." note. All buttons `disabled`.

- [ ] **Step 3: Write `yedekleme/page.tsx`** with `SettingsHeader title="Yedekleme & Geri Yükleme" subtitle="Verilerinizi güvende tutun"` + `<BackupScreen />`.

- [ ] **Step 4: Gates.** Run: `pnpm typecheck && pnpm lint && pnpm build` → PASS.

- [ ] **Step 5: Commit.**

```bash
git add src/components/settings/backup src/app/(app)/ayarlar/yedekleme
git commit -m "feat: add Yedekleme static placeholder page"
```

---

## Task 11: Denetim Günlüğü — static placeholder

**Amaç:** Filter bar (search + 3 selects + Excel button) + audit table (Zaman mono / Kullanıcı two-line / İşlem badge / Detay / IP mono) with the Silme row tinted. No backend (ref §C.9) — hardcoded, filters/export inert.

**Mockup:** `Ayarlar - Denetim Günlüğü.dc.html` / `09-denetim.png` / ref §B.9.

**Files:**
- Create: `src/components/settings/audit/AuditLogScreen.tsx`
- Create: `src/components/settings/audit/audit-screen.css`
- Create: `src/app/(app)/ayarlar/denetim-gunlugu/page.tsx`

- [ ] **Step 1: Write `audit-screen.css`** (filter bar + table + action badges, ref §B.9):

```css
.audit-filters { display: flex; gap: 10px; margin-bottom: 20px; }
.audit-filters input, .audit-filters select { border: 1px solid var(--color-border); border-radius: var(--radius-8); padding: 7px 14px; font-size: 12px; color: var(--color-text-secondary); background: var(--color-surface); }
.audit-filters input { max-width: 300px; flex: 1; }
.audit-filters__spacer { flex: 1; }
.audit-table { width: 100%; border-collapse: collapse; }
.audit-table th { text-align: left; padding: 10px 12px; font-size: 11px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.8px; background: var(--color-surface-2); }
.audit-table td { padding: 12px; font-size: 13px; border-bottom: 1px solid var(--color-divider); }
.audit-table td.is-mono { font-family: var(--font-mono); font-size: 12px; color: var(--color-text-secondary); }
.audit-user__name { font-size: 13px; font-weight: 600; color: var(--color-text); }
.audit-user__role { font-size: 10px; color: var(--color-text-subtle); }
.audit-row--danger { background: var(--color-audit-danger-row-bg); }
.audit-badge { font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: var(--radius-10); }
.audit-badge--login { background: var(--color-success-soft); color: var(--color-success); }
.audit-badge--create { background: var(--color-primary-soft); color: var(--color-primary); }
.audit-badge--approve { background: var(--color-success-tint); color: var(--color-success); }
.audit-badge--update { background: var(--color-warning-soft); color: var(--color-warning-strong); }
.audit-badge--delete { background: var(--color-danger-soft); color: var(--color-danger-strong); }
.audit-badge--backup { background: var(--color-surface-muted); color: var(--color-text-muted); }
```

- [ ] **Step 2: Write `AuditLogScreen.tsx`.** Filter bar (search `disabled`, 3 `disabled` selects: "Tüm Kullanıcılar" / "Tüm İşlemler" / "Son 7 Gün", `disabled` "Excel" ghost button) + `SettingsCard bodyPad="flush"` table with ~6 hardcoded rows (ref §B.9), the Silme row using `.audit-row--danger`. Action badges via a `type→class` map. Include a visible "Örnek kayıtlar (canlı denetim günlüğü henüz aktif değil)." note.

- [ ] **Step 3: Write `denetim-gunlugu/page.tsx`** with `SettingsHeader title="Denetim Günlüğü" subtitle="Sistemdeki tüm işlemlerin kaydı"` + `<AuditLogScreen />`.

- [ ] **Step 4: Gates.** Run: `pnpm typecheck && pnpm lint && pnpm build` → PASS.

- [ ] **Step 5: Commit.**

```bash
git add src/components/settings/audit src/app/(app)/ayarlar/denetim-gunlugu
git commit -m "feat: add Denetim Günlüğü static placeholder page"
```

---

## Task 12: Navigation entry + shell reconciliation

**Amaç:** Ensure users can reach Ayarlar from the main shell and that the sidebar "Ayarlar" link (already present in `Sidebar.tsx`) lands on `/ayarlar/kullanicilar`. Verify the takeover shell coexists with the global shell without z-index/scroll glitches across all 9 routes.

**Files:**
- Verify/Modify: `src/components/shell/Sidebar.tsx` (existing `href="/ayarlar"` → confirm redirect chain `/ayarlar` → `/ayarlar/kullanicilar` works)
- No new files expected.

- [ ] **Step 1: Confirm redirect.** `ayarlar/page.tsx` already `redirect("/ayarlar/kullanicilar")`. Manually verify (dev): the global sidebar "Ayarlar" button navigates into the settings shell.

- [ ] **Step 2: Z-index audit.** Confirm `--shadow-topbar` + z-index layering: global topbar `z-index:100`; settings breadcrumb `101` (over topbar center/right); settings sidebar `90` (over content, under topbar). Verify the global topbar's left FİİL logo (0–220px) remains visible and the settings sidebar starts at `left:0` painting over the global sidebar. Adjust `settings-shell.css` if any global chrome bleeds through.

- [ ] **Step 3: Scroll audit.** Confirm no horizontal body overflow on any of the 9 routes at 1280px and 1440px; the İzin Matrisi table scrolls inside `.matrix-scroll` only.

- [ ] **Step 4: Gates.** Run: `pnpm typecheck && pnpm lint && pnpm build` → PASS.

- [ ] **Step 5: Commit (if changes).**

```bash
git add -A && git commit -m "fix: reconcile settings shell z-index and nav entry"
```

---

## Task 13: E2E + visual baselines + phase close

**Amaç:** Add/extend Playwright visual specs for all 9 Ayarlar routes and one nav-flow E2E, seed the mock backend fully, and prepare Linux baselines via CI. macOS PNGs are never committed.

**Files:**
- Modify: `e2e/settings-visual.spec.ts` (extend to all 9 routes) OR create `e2e/ayarlar-visual.spec.ts`
- Modify: `e2e/mock-backend.ts` (ensure `/company`, `/settings/*` handlers seeded — done in T3a; verify richer user/role seed so the rich table renders ≥ 5 users with distinct roles)
- Modify: `e2e/settings.spec.ts` (add a nav-flow assertion: settings sidebar back-link returns to dashboard)

- [ ] **Step 1: Extend the mock backend seed** so visual specs render mockup-like data: ≥ 5 users across `patron/site_chief/accounting/project_manager/procurement`, the 6 mockup roles, 13 modules, permission presets producing the mockup chips. (Build on the existing `seedState()`.)

- [ ] **Step 2: Add visual specs.** For each of the 9 routes, add a `toHaveScreenshot` test following the existing `settings-visual.spec.ts` pattern (login → goto → assert a stable element visible → `toHaveScreenshot("ayarlar-<slug>.png", { fullPage: true })`). Deterministic waits only (assert a known cell/text), never timeouts.

```ts
test("gorsel: ayarlar sirket bilgileri", async ({ page }) => {
  await login(page);
  await page.goto("/ayarlar/sirket-bilgileri");
  await expect(page.getByText("Firma Bilgileri")).toBeVisible();
  await expect(page).toHaveScreenshot("ayarlar-sirket-bilgileri.png", { fullPage: true });
});
// ... bildirimler, gorunum, entegrasyonlar, yedekleme, denetim-gunlugu, and re-baseline kullanicilar/roller/izin-matrisi
```

- [ ] **Step 3: Add nav-flow E2E** in `settings.spec.ts`: from `/ayarlar/kullanicilar`, click "← Gösterge Paneli", assert URL is `/` and a dashboard element is visible; click a settings sidebar item, assert the breadcrumb current label updates.

- [ ] **Step 4: Run the non-visual E2E locally.** Run: `pnpm test:visual settings.spec.ts` (nav-flow) → PASS. Do NOT commit any macOS snapshot PNGs. Confirm `git status` shows no new `*-snapshots/*.png` staged from your machine.

- [ ] **Step 5: Confirm visual specs execute (expected snapshot-missing failure is OK).** Run: `pnpm test:visual ayarlar-visual.spec.ts` → each new test FAILS with "snapshot doesn't exist" — this is the expected state; it proves the spec runs. Do not commit macOS PNGs.

- [ ] **Step 6: Commit specs only (no PNGs).**

```bash
git add e2e/settings-visual.spec.ts e2e/settings.spec.ts e2e/mock-backend.ts
git commit -m "test: add ayarlar visual specs and nav-flow e2e (baselines via CI)"
```

- [ ] **Step 7: Generate Linux baselines on CI.** After merge to the working branch, trigger the `visual-baselines.yml` `workflow_dispatch`. Download the `linux-baselines` artifact and commit the `e2e/**/*-snapshots/**` PNGs it produces (Linux-rendered). This is a maintainer step, done once the specs are merged.

- [ ] **Step 8: Full gate + branch close.** Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build` → all PASS. Then follow `superpowers:finishing-a-development-branch` to open the PR.

---

## Self-Review

### Mockup section → Task mapping

| Mockup / ref section | Task |
|---|---|
| Shared primitives (card, pill, avatar, chip) §A.4–A.5, A.7 | T1 |
| Tokens §A.9 (~16 new) | T1 |
| Settings sidebar + breadcrumb + header §A.1–A.2 | T2 |
| Kullanıcılar §B.1 (rich table) | T3 |
| `last_login_at` + notification events backend + gen:api §C.1/§C.5 | T3a |
| Rol Yönetimi §B.2 (master-detail, Kopyala §C.2) | T4 |
| İzin Matrisi §B.3 (chrome restyle §A.7) | T5 |
| Şirket Bilgileri §B.4 (§C.4) | T6 |
| Bildirimler §B.5 (§C.5) | T7 |
| Görünüm §B.6 (§C.6 theme-lock) | T8 |
| Entegrasyonlar §B.7 (§C.7 static) | T9 |
| Yedekleme §B.8 (§C.8 static) | T10 |
| Denetim Günlüğü §B.9 (§C.9 static) | T11 |
| Nav entry + shell reconciliation §A.1 | T12 |
| Visual baselines + E2E | T13 |

### Placeholder scan

- No "TBD/TODO/implement later" left. Every logic unit (roleVisual, formatLastLogin, roleModuleSummary, groupNotifications, settingsLabelForPath) has RED→GREEN TDD steps with concrete code. UI tasks have full CSS + component code. Deliberately-deferred items are explicitly flagged (not silent): Proje Erişimi cell (T3 NOTE), logo upload (T6 NOTE), role user-count (T4 NOTE), matrix cosmetic action bar (T5 NOTE).

### Type consistency

- Hook names used verbatim from source: `useUsers`, `useRoles`, `useModules`, `useAllRolePermissions`, `usePermissionMutation`, `useProjects`/`useProjectAccess`, `useCreateRole`/`useDeleteRole`/`useRenameRole`, `useCreateUser`/`useDeleteUser`. New hooks: `useCompany`/`useUpdateCompany`, `useNotificationPrefs`/`useUpdateNotificationPrefs`, `usePreferences`/`useUpdatePreferences`.
- `PresetKey`, `matchPreset`, `presetToUpdate`, `PRESETS` names match `permission-presets.ts`.
- `roleVisual` return shape (`badgeBg/badgeText/gradFrom/gradTo`) consistent between T1 definition and T3/T4/T5 consumers.
- `SettingsCard` prop names (`title/count/actions/bodyPad`) consistent across all consuming tasks.

### OPEN QUESTIONS requiring user decision (all defaulted so execution is unblocked)

1. **Global topbar bell/avatar inside Ayarlar** (T2) — default: occlude with the breadcrumb bar (mockup wins).
2. **Kullanıcılar preview grid** (Roller + İzin Matrisi mini-cards below the table, T3) — default: omit (superseded by dedicated pages).
3. **Proje Erişimi column** (T3) — default: `—` placeholder now, `ProjectAccessCell` follow-up.
4. **"+ Yeni Rol" inline-with-h1 placement** (T4) — default: approximated via in-screen button; exact header-inline is a follow-up.
5. **İzin Matrisi action bar** (T5) — default: cosmetic bar over autosaving grid ("Kaydet" = refresh).
6. **Group-header uniformity** (T5) — default: all headers dark (chose consistency over replicating the mockup's row-1-only-dark inconsistency).
7. **OpenAPI export command** (T3a) — default: curl running backend `/openapi.json`, python one-liner fallback; confirm the repo-blessed command.
8. **Legacy notification events** `user_added`/`approval_pending` (T3a) — default: keep in catalog, UI ignores.
