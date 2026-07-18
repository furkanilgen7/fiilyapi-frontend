# F3: Uygulama Kabuğu — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** FİİL Yapı ERP frontend'ine uygulama kabuğu eklemek: sabit Topbar + Sidebar + içerik alanı; giriş sonrası korumalı sayfalar kabuk içinde; yapılmamış modüller "yakında" sayfasına düşer.

**Architecture:** Next.js App Router `(app)` route group + `(app)/layout.tsx` kabuğu render eder. `AppShell` (client) içinde `SessionProvider` (`/api/auth/me` tek fetch) + Topbar + Sidebar + `<main>`. Sidebar statik `NAV_GROUPS`'tan render olur, aktif öğe `usePathname()` ile vurgulanır. `[...slug]` catch-all yapılmamış modülleri ComingSoon'a düşürür. Login + design-system grup dışı (kabuksuz).

**Tech Stack:** Next.js 15 App Router · React 19 · TS strict · pnpm · Vitest + RTL · Playwright. Yeni runtime bağımlılığı yok.

## Global Constraints

- Yalnız **pnpm**. Tailwind YOK — ham CSS + `src/styles/tokens.css`. Mevcut 8 primitive + F2 auth altyapısı kullanılır.
- Açık tema, ≥1280px. Responsive/koyu tema yok.
- Kod/isim/dosya **İngilizce**; UI metni + yorumlar **Türkçe**.
- Commit başlıkları **İngilizce** `<type>: <desc>`, Türkçe özel karakter yok.
- Token-only CSS: çıplak hex yasak (fallback dahil; gerçek token adı kullan).
- Kabuk canon: Topbar 52px (logo 220px bloğu + inert bildirim + avatar) · Sidebar 220px (4 grup + aktif vurgu + sticky kullanıcı bloğu). Proje seçici YOK, FİİL AI kartı YOK, bildirim rozeti YOK.
- Aktif nav stili: açık-mavi zemin + primary metin/ikon + 600; **sol-kenar YOK** (canon).
- `me` verisi `/api/auth/me`'den tek fetch (SessionProvider); Topbar/Sidebar context'ten okur.
- Çıkış: `POST /api/auth/logout` → `router.push("/login")`.
- TDD: kırmızı → yeşil → refactor. Task sonu commit; birkaç task'ta bir push.
- **UI task'larında `pnpm build` koşulur** (F2 dersi: useSearchParams/Suspense gibi build hataları diff review'da kaçar).
- Görsel snapshot: Linux baseline `visual-baselines.yml` (workflow_dispatch); tam-sayı line-height.
- Mevcut ikon kalıbı: `src/components/ui/icons/index.tsx` içindeki `base(props)` helper'ı (viewBox 24, stroke currentColor, width/height prop ile ezilebilir).

## Dosya haritası

**Oluşturulacak:**
- `src/components/shell/nav-config.ts` — `NAV_GROUPS`, `NavGroup`/`NavItem` tipleri, `moduleNameForSlug`.
- `src/lib/shell/initials.ts` — `initials(fullName)`.
- `src/components/shell/SessionProvider.tsx` — context + `useSession`.
- `src/components/shell/Topbar.tsx` + `topbar.css`
- `src/components/shell/Sidebar.tsx` + `sidebar.css`
- `src/components/shell/AppShell.tsx` + `shell.css`
- `src/components/shell/ComingSoon.tsx` + `coming-soon.css`
- `src/app/(app)/layout.tsx` · `src/app/(app)/page.tsx` · `src/app/(app)/[...slug]/page.tsx`
- Testler: her mantık/bileşen yanında `*.test.ts(x)`.

**Değiştirilecek:**
- `src/components/ui/icons/index.tsx` — nav ikonları eklenir.
- `src/styles/tokens.css` — `--color-nav-active-bg`.
- `e2e/auth.spec.ts` — kabuk gerçeğine güncellenir (çıkış sidebar'da "Çıkış").

**Silinecek/taşınacak:**
- `src/app/page.tsx` → `src/app/(app)/page.tsx` (içerik sadeleşir; /me fetch + çıkış kalkar).
- `src/app/page.test.tsx` → `src/app/(app)/page.test.tsx` (yeni davranış).
- `src/app/home.css` → kabuk içi içerik stiline uyarlanır (taşı/yeniden yaz).

---

### Task 1: Nav config + initials + nav ikonları

**Files:**
- Create: `src/lib/shell/initials.ts`, `src/lib/shell/initials.test.ts`
- Create: `src/components/shell/nav-config.ts`, `src/components/shell/nav-config.test.ts`
- Modify: `src/components/ui/icons/index.tsx`

**Interfaces:**
- Produces: `initials(fullName: string): string`. `type NavItem = { label: string; href: string; Icon: (p: React.SVGProps<SVGSVGElement>) => React.ReactElement }`. `type NavGroup = { heading: string; items: NavItem[] }`. `NAV_GROUPS: NavGroup[]`. `moduleNameForSlug(slug: string): string`. Yeni ikonlar: `DashboardIcon, InboxIcon, BarChartIcon, BuildingIcon, CalendarCheckIcon, UserIcon, TruckIcon, BoxIcon, CartIcon, FileTextIcon, BankIcon, WalletIcon, ClockIcon, TrendingUpIcon, ListIcon, FolderIcon, BellIcon, SettingsIcon`.

- [ ] **Step 1: Failing test — initials**

`src/lib/shell/initials.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { initials } from "./initials";

describe("initials", () => {
  it("iki kelimeden bas harfleri alir", () => {
    expect(initials("Ahmet Yılmaz")).toBe("AY");
  });
  it("tek kelimede ilk harfi alir", () => {
    expect(initials("Ahmet")).toBe("A");
  });
  it("bos/bosluk icin bos string", () => {
    expect(initials("   ")).toBe("");
    expect(initials("")).toBe("");
  });
  it("uc kelimede ilk iki kelimeyi kullanir", () => {
    expect(initials("Ali Veli Han")).toBe("AV");
  });
});
```

- [ ] **Step 2: Kırmızı**

Run: `pnpm test src/lib/shell/initials.test.ts` → FAIL.

- [ ] **Step 3: initials implementasyonu**

`src/lib/shell/initials.ts`:
```ts
// Tam addan avatar bas harflerini uretir ("Ahmet Yılmaz" → "AY").
export function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toLocaleUpperCase("tr-TR") ?? "")
    .join("");
}
```

- [ ] **Step 4: Yeşil**

Run: `pnpm test src/lib/shell/initials.test.ts` → PASS.

- [ ] **Step 5: Nav ikonlarını ekle**

`src/components/ui/icons/index.tsx` — dosyanın SONUNA ekle (mevcut `base` helper'ı kullan; mevcut ikonlar korunur):
```tsx
export const DashboardIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);
export const InboxIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" />
  </svg>
);
export const BarChartIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <line x1="6" y1="20" x2="6" y2="12" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="18" y1="20" x2="18" y2="14" />
  </svg>
);
export const BuildingIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="4" y="2" width="16" height="20" rx="1" />
    <path d="M9 6h1M14 6h1M9 10h1M14 10h1M9 14h1M14 14h1" />
    <path d="M10 22v-4h4v4" />
  </svg>
);
export const CalendarCheckIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <path d="m9 16 2 2 4-4" />
  </svg>
);
export const UserIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
export const TruckIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M1 3h15v13H1z" />
    <path d="M16 8h4l3 3v5h-7V8Z" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);
export const BoxIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
    <path d="m3 8 9 5 9-5M12 13v8" />
  </svg>
);
export const CartIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);
export const FileTextIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
    <path d="M14 2v6h6M8 13h8M8 17h8M8 9h2" />
  </svg>
);
export const BankIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 10 12 3l9 7" />
    <path d="M4 10v10h16V10M8 14v4M12 14v4M16 14v4M3 20h18" />
  </svg>
);
export const WalletIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
    <path d="M4 6v12a2 2 0 0 0 2 2h14v-4" />
    <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
  </svg>
);
export const ClockIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <polyline points="12 7 12 12 15 14" />
  </svg>
);
export const TrendingUpIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);
export const ListIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);
export const FolderIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2Z" />
  </svg>
);
export const BellIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);
export const SettingsIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
);
```

- [ ] **Step 6: Failing test — nav-config**

`src/components/shell/nav-config.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { NAV_GROUPS, moduleNameForSlug } from "./nav-config";

describe("NAV_GROUPS", () => {
  it("4 grup icerir (canon)", () => {
    expect(NAV_GROUPS).toHaveLength(4);
    expect(NAV_GROUPS.map((g) => g.heading)).toEqual([
      "Genel",
      "Saha & İK",
      "Stok & Satınalma",
      "Sözleşme & Mali",
    ]);
  });
  it("her ogenin label, href ve Icon'u vardir", () => {
    for (const g of NAV_GROUPS) {
      for (const item of g.items) {
        expect(item.label).toBeTruthy();
        expect(item.href.startsWith("/")).toBe(true);
        expect(typeof item.Icon).toBe("function");
      }
    }
  });
  it("hrefler benzersizdir", () => {
    const hrefs = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href));
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
  it("Gosterge Paneli / rotasina gider", () => {
    const dash = NAV_GROUPS[0].items[0];
    expect(dash.label).toBe("Gösterge Paneli");
    expect(dash.href).toBe("/");
  });
});

describe("moduleNameForSlug", () => {
  it("bilinen slug'i modul adina cevirir", () => {
    expect(moduleNameForSlug("projeler")).toBe("Projeler");
    expect(moduleNameForSlug("mali-tablolar")).toBe("Mali Tablolar");
  });
  it("bilinmeyen slug'i baslik-case fallback yapar", () => {
    expect(moduleNameForSlug("bilinmeyen-modul")).toBe("Bilinmeyen Modul");
  });
});
```

- [ ] **Step 7: Kırmızı**

Run: `pnpm test src/components/shell/nav-config.test.ts` → FAIL.

- [ ] **Step 8: nav-config implementasyonu**

`src/components/shell/nav-config.ts`:
```ts
import {
  DashboardIcon,
  InboxIcon,
  BarChartIcon,
  BuildingIcon,
  CalendarCheckIcon,
  UserIcon,
  TruckIcon,
  BoxIcon,
  CartIcon,
  FileTextIcon,
  BankIcon,
  WalletIcon,
  ClockIcon,
  TrendingUpIcon,
  ListIcon,
  FolderIcon,
} from "@/components/ui/icons";

export type NavItem = {
  label: string;
  href: string;
  Icon: (p: React.SVGProps<SVGSVGElement>) => React.ReactElement;
};
export type NavGroup = { heading: string; items: NavItem[] };

// Kabuk sol menusu — canon: Ekran 1 (4 duz grup). Cogu modul henuz yok;
// yapilmamis rotalar [...slug] catch-all ile ComingSoon'a duser.
export const NAV_GROUPS: NavGroup[] = [
  {
    heading: "Genel",
    items: [
      { label: "Gösterge Paneli", href: "/", Icon: DashboardIcon },
      { label: "Onay Kutusu", href: "/onay-kutusu", Icon: InboxIcon },
      { label: "Raporlar", href: "/raporlar", Icon: BarChartIcon },
      { label: "Projeler", href: "/projeler", Icon: BuildingIcon },
    ],
  },
  {
    heading: "Saha & İK",
    items: [
      { label: "Puantaj", href: "/puantaj", Icon: CalendarCheckIcon },
      { label: "Personel", href: "/personel", Icon: UserIcon },
      { label: "Makine & Ekipman", href: "/makine", Icon: TruckIcon },
    ],
  },
  {
    heading: "Stok & Satınalma",
    items: [
      { label: "Stok & Depo", href: "/stok", Icon: BoxIcon },
      { label: "Satınalma & Teklif", href: "/satinalma", Icon: CartIcon },
    ],
  },
  {
    heading: "Sözleşme & Mali",
    items: [
      { label: "Sözleşmeler", href: "/sozlesmeler", Icon: FileTextIcon },
      { label: "Muhasebe", href: "/muhasebe", Icon: BankIcon },
      { label: "Hazine", href: "/hazine", Icon: WalletIcon },
      { label: "Hakedişler", href: "/hakedisler", Icon: ClockIcon },
      { label: "Mali Tablolar", href: "/mali-tablolar", Icon: TrendingUpIcon },
      { label: "Bordro", href: "/bordro", Icon: ListIcon },
      { label: "Belge Arşivi", href: "/belge-arsivi", Icon: FolderIcon },
    ],
  },
];

// Slug'dan modul adi: once nav'da ara, yoksa baslik-case fallback.
export function moduleNameForSlug(slug: string): string {
  const href = "/" + slug;
  for (const group of NAV_GROUPS) {
    const found = group.items.find((i) => i.href === href);
    if (found) return found.label;
  }
  return slug
    .split("-")
    .map((w) => w.charAt(0).toLocaleUpperCase("tr-TR") + w.slice(1))
    .join(" ");
}
```

- [ ] **Step 9: Yeşil + kapılar**

Run: `pnpm test src/components/shell/nav-config.test.ts src/lib/shell/initials.test.ts` → PASS. Sonra `pnpm typecheck` + `pnpm lint`.

- [ ] **Step 10: Commit**

```bash
git add src/lib/shell/initials.ts src/lib/shell/initials.test.ts src/components/shell/nav-config.ts src/components/shell/nav-config.test.ts src/components/ui/icons/index.tsx
git commit -m "feat: add shell nav config, initials util and nav icons"
```

---

### Task 2: SessionProvider + useSession

**Files:**
- Create: `src/components/shell/SessionProvider.tsx`, `src/components/shell/SessionProvider.test.tsx`

**Interfaces:**
- Consumes: `MeResponse` (`@/lib/auth/types`).
- Produces: `SessionProvider` (client), `useSession(): { me: MeResponse | null; isLoading: boolean }`. Mount'ta `/api/auth/me` tek fetch; 401/hata → `router.push("/login")`.

- [ ] **Step 1: Failing test**

`src/components/shell/SessionProvider.test.tsx`:
```tsx
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { SessionProvider, useSession } from "./SessionProvider";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

function Probe() {
  const { me, isLoading } = useSession();
  if (isLoading) return <span>yukleniyor</span>;
  return <span>{me?.full_name ?? "yok"}</span>;
}

afterEach(() => {
  vi.restoreAllMocks();
  pushMock.mockReset();
});

describe("SessionProvider", () => {
  it("me verisini context'e saglar", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ full_name: "Ahmet Yılmaz", role_key: "patron", title: "Patron" }), { status: 200 }),
    );
    render(<SessionProvider><Probe /></SessionProvider>);
    expect(await screen.findByText("Ahmet Yılmaz")).toBeInTheDocument();
  });

  it("401'de /login'e yonlendirir", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response("{}", { status: 401 }));
    render(<SessionProvider><Probe /></SessionProvider>);
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/login"));
  });

  it("me'yi yalnizca bir kez fetch eder", async () => {
    const spy = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ full_name: "Ali", role_key: "x", title: "y" }), { status: 200 }),
    );
    render(<SessionProvider><Probe /></SessionProvider>);
    await screen.findByText("Ali");
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Kırmızı**

Run: `pnpm test src/components/shell/SessionProvider.test.tsx` → FAIL.

- [ ] **Step 3: Implementasyon**

`src/components/shell/SessionProvider.tsx`:
```tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { MeResponse } from "@/lib/auth/types";

type SessionValue = { me: MeResponse | null; isLoading: boolean };

const SessionContext = createContext<SessionValue>({ me: null, isLoading: true });

export function useSession(): SessionValue {
  return useContext(SessionContext);
}

// Kabuk oturum saglayicisi: /api/auth/me'yi bir kez ceker, Topbar+Sidebar tuketir.
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Yalnizca mount'ta calisir. useRouter() App Router'da kararli referans dondurur.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) {
          if (active) router.push("/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (active && data) {
          setMe(data as MeResponse);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (active) router.push("/login");
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <SessionContext.Provider value={{ me, isLoading }}>
      {children}
    </SessionContext.Provider>
  );
}
```

- [ ] **Step 4: Yeşil + kapılar**

Run: `pnpm test src/components/shell/SessionProvider.test.tsx` → PASS. Sonra `pnpm typecheck` + `pnpm lint`.

- [ ] **Step 5: Commit**

```bash
git add src/components/shell/SessionProvider.tsx src/components/shell/SessionProvider.test.tsx
git commit -m "feat: add shell SessionProvider fetching me once"
```

---

### Task 3: Topbar

**Files:**
- Create: `src/components/shell/Topbar.tsx`, `topbar.css`, `Topbar.test.tsx`
- Modify: `src/styles/tokens.css` (`--color-nav-active-bg` — Sidebar da kullanacak, burada eklenir)

**Interfaces:**
- Consumes: `useSession` (Task 2), `initials` (Task 1), `BellIcon` (Task 1).
- Produces: `Topbar` (client, default export).

- [ ] **Step 1: Failing test**

`src/components/shell/Topbar.test.tsx`:
```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Topbar from "./Topbar";

vi.mock("./SessionProvider", () => ({
  useSession: () => ({ me: { full_name: "Ahmet Yılmaz", role_key: "patron", title: "Patron" }, isLoading: false }),
}));

describe("Topbar", () => {
  it("marka adini gosterir", () => {
    render(<Topbar />);
    expect(screen.getByText("FİİL")).toBeInTheDocument();
    expect(screen.getByText("YAPI")).toBeInTheDocument();
  });
  it("kullanici bas harflerini avatar'da gosterir", () => {
    render(<Topbar />);
    expect(screen.getByText("AY")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Kırmızı**

Run: `pnpm test src/components/shell/Topbar.test.tsx` → FAIL.

- [ ] **Step 3: Implementasyon**

`src/styles/tokens.css` — `--color-primary-soft: #dbeafe;` satırından sonra ekle:
```css
  --color-nav-active-bg: #eff6ff;
```

`src/components/shell/Topbar.tsx`:
```tsx
"use client";

import { BellIcon } from "@/components/ui/icons";
import { initials } from "@/lib/shell/initials";
import { useSession } from "./SessionProvider";
import "./topbar.css";

export default function Topbar() {
  const { me } = useSession();
  const avatar = me ? initials(me.full_name) : "";

  return (
    <header className="topbar">
      <div className="topbar-logo">
        <span className="topbar-logo__mark" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="8" height="8" rx="1.5" fill="var(--color-on-brand)" />
            <rect x="13" y="3" width="8" height="8" rx="1.5" fill="var(--color-on-brand)" opacity=".6" />
            <rect x="3" y="13" width="8" height="8" rx="1.5" fill="var(--color-on-brand)" opacity=".6" />
            <rect x="13" y="13" width="8" height="8" rx="1.5" fill="var(--color-on-brand)" opacity=".3" />
          </svg>
        </span>
        <span className="topbar-logo__name">FİİL</span>
        <span className="topbar-logo__sub">YAPI</span>
      </div>

      <div className="topbar-actions">
        <button type="button" className="topbar-bell" aria-label="Bildirimler">
          <BellIcon width={18} height={18} />
        </button>
        <span className="topbar-avatar" aria-hidden="true">{avatar}</span>
      </div>
    </header>
  );
}
```

`src/components/shell/topbar.css`:
```css
.topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 52px;
  display: flex;
  align-items: center;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  z-index: 100;
}
.topbar-logo {
  width: 220px;
  height: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 20px;
  border-right: 1px solid var(--color-border);
}
.topbar-logo__mark {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.topbar-logo__name {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text);
}
.topbar-logo__sub {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 1px;
  color: var(--color-text-subtle);
}
.topbar-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 20px;
}
.topbar-bell {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: var(--color-primary-soft);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.topbar-avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--color-primary);
  color: var(--color-on-brand);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
}
```

- [ ] **Step 4: Yeşil + kapılar**

Run: `pnpm test src/components/shell/Topbar.test.tsx` → PASS. Sonra `pnpm typecheck` + `pnpm lint`.

- [ ] **Step 5: Commit**

```bash
git add src/components/shell/Topbar.tsx src/components/shell/topbar.css src/components/shell/Topbar.test.tsx src/styles/tokens.css
git commit -m "feat: add shell Topbar with logo, inert bell and avatar"
```

---

### Task 4: Sidebar

**Files:**
- Create: `src/components/shell/Sidebar.tsx`, `sidebar.css`, `Sidebar.test.tsx`

**Interfaces:**
- Consumes: `NAV_GROUPS` (Task 1), `useSession` (Task 2), `initials` (Task 1), `SettingsIcon` (Task 1), `cx` (`@/lib/cx`). `usePathname`/`useRouter` (`next/navigation`).
- Produces: `Sidebar` (client, default export). Aktif öğe `usePathname()` ile; çıkış `POST /api/auth/logout` → `/login`.

- [ ] **Step 1: Failing test**

`src/components/shell/Sidebar.test.tsx`:
```tsx
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Sidebar from "./Sidebar";

const pushMock = vi.fn();
let currentPath = "/";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => currentPath,
}));
vi.mock("./SessionProvider", () => ({
  useSession: () => ({ me: { full_name: "Ahmet Yılmaz", role_key: "patron", title: "Patron" }, isLoading: false }),
}));

afterEach(() => {
  vi.restoreAllMocks();
  pushMock.mockReset();
  currentPath = "/";
});

describe("Sidebar", () => {
  it("dort grup basligini ve nav ogelerini gosterir", () => {
    render(<Sidebar />);
    expect(screen.getByText("Genel")).toBeInTheDocument();
    expect(screen.getByText("Saha & İK")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Gösterge Paneli/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Projeler/ })).toBeInTheDocument();
  });

  it("aktif rotayi vurgular (aria-current)", () => {
    currentPath = "/";
    render(<Sidebar />);
    expect(screen.getByRole("link", { name: /Gösterge Paneli/ })).toHaveAttribute("aria-current", "page");
  });

  it("prefix eslesmeyle alt rotayi aktif sayar", () => {
    currentPath = "/projeler/123";
    render(<Sidebar />);
    expect(screen.getByRole("link", { name: /Projeler/ })).toHaveAttribute("aria-current", "page");
  });

  it("kullanici adini gosterir ve cikis /login'e yonlendirir", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    render(<Sidebar />);
    expect(screen.getByText("Ahmet Yılmaz")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /çıkış/i }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/login"));
  });
});
```

- [ ] **Step 2: Kırmızı**

Run: `pnpm test src/components/shell/Sidebar.test.tsx` → FAIL.

- [ ] **Step 3: Implementasyon**

`src/components/shell/Sidebar.tsx`:
```tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cx } from "@/lib/cx";
import { initials } from "@/lib/shell/initials";
import { SettingsIcon } from "@/components/ui/icons";
import { NAV_GROUPS } from "./nav-config";
import { useSession } from "./SessionProvider";
import "./sidebar.css";

// Aktif eslestirme: "/" tam eslesme; digerleri prefix (alt rotalar da aktif).
function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { me } = useSession();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {NAV_GROUPS.map((group) => (
          <div key={group.heading} className="sidebar-group">
            <div className="sidebar-group__heading">{group.heading}</div>
            {group.items.map(({ label, href, Icon }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cx("sidebar-item", active && "sidebar-item--active")}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon width={18} height={18} className="sidebar-item__icon" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-user">
        <Link href="/ayarlar" className="sidebar-user__row">
          <span className="sidebar-user__avatar" aria-hidden="true">{me ? initials(me.full_name) : ""}</span>
          <span className="sidebar-user__meta">
            <span className="sidebar-user__name">{me?.full_name ?? ""}</span>
            <span className="sidebar-user__role">{me?.title ?? ""}</span>
          </span>
        </Link>
        <div className="sidebar-user__actions">
          <Link href="/ayarlar" className="sidebar-user__btn">
            <SettingsIcon width={14} height={14} /> Ayarlar
          </Link>
          <button type="button" className="sidebar-user__btn sidebar-user__btn--logout" onClick={handleLogout}>
            Çıkış
          </button>
        </div>
      </div>
    </aside>
  );
}
```

`src/components/shell/sidebar.css`:
```css
.sidebar {
  position: fixed;
  top: 52px;
  left: 0;
  bottom: 0;
  width: 220px;
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
}
.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: 12px 0;
}
.sidebar-group {
  margin-bottom: 12px;
}
.sidebar-group__heading {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--color-text-subtle);
  padding: 0 16px 6px;
}
.sidebar-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  font-size: 13px;
  line-height: 18px;
  color: var(--color-text-muted);
  text-decoration: none;
}
.sidebar-item:hover {
  background: var(--color-surface-2);
}
.sidebar-item__icon {
  flex-shrink: 0;
  color: var(--color-text-subtle);
}
.sidebar-item--active {
  background: var(--color-nav-active-bg);
  color: var(--color-primary);
  font-weight: 600;
}
.sidebar-item--active .sidebar-item__icon {
  color: var(--color-primary);
}
.sidebar-user {
  position: sticky;
  bottom: 0;
  background: var(--color-surface);
  border-top: 1px solid var(--color-divider);
  padding: 10px 8px 8px;
}
.sidebar-user__row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px;
  text-decoration: none;
}
.sidebar-user__avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--color-primary);
  color: var(--color-on-brand);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}
.sidebar-user__meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.sidebar-user__name {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text);
}
.sidebar-user__role {
  font-size: 10px;
  color: var(--color-text-subtle);
}
.sidebar-user__actions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}
.sidebar-user__btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 7px;
  border: none;
  cursor: pointer;
  text-decoration: none;
  background: var(--color-surface-2);
  color: var(--color-text-muted);
}
.sidebar-user__btn--logout {
  background: var(--color-danger-soft);
  color: var(--color-danger);
}
```

- [ ] **Step 4: Yeşil + kapılar**

Run: `pnpm test src/components/shell/Sidebar.test.tsx` → PASS. Sonra `pnpm typecheck` + `pnpm lint`.

- [ ] **Step 5: Commit**

```bash
git add src/components/shell/Sidebar.tsx src/components/shell/sidebar.css src/components/shell/Sidebar.test.tsx
git commit -m "feat: add shell Sidebar with nav, active state and logout"
```

---

### Task 5: AppShell + (app) layout + home taşıma

**Files:**
- Create: `src/components/shell/AppShell.tsx`, `shell.css`
- Create: `src/app/(app)/layout.tsx`, `src/app/(app)/page.tsx`, `src/app/(app)/page.test.tsx`, `src/app/(app)/home.css`
- Delete: `src/app/page.tsx`, `src/app/page.test.tsx`, `src/app/home.css`

**Interfaces:**
- Consumes: `SessionProvider` (Task 2), `Topbar` (Task 3), `Sidebar` (Task 4), `useSession` (Task 2).
- Produces: `AppShell` (client). `(app)/layout.tsx` (server) → `<AppShell>{children}</AppShell>`. `(app)/page.tsx` (client) — sade karşılama, `useSession` ile ad.

- [ ] **Step 1: AppShell + shell.css**

`src/components/shell/AppShell.tsx`:
```tsx
"use client";

import { SessionProvider } from "./SessionProvider";
import Topbar from "./Topbar";
import Sidebar from "./Sidebar";
import "./shell.css";

// Uygulama kabugu: oturum saglayici + sabit topbar/sidebar + icerik alani.
export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <Topbar />
      <Sidebar />
      <main className="app-content">{children}</main>
    </SessionProvider>
  );
}
```

`src/components/shell/shell.css`:
```css
.app-content {
  margin-top: 52px;
  margin-left: 220px;
  min-height: calc(100vh - 52px);
  background: var(--color-bg);
  padding: 24px;
}
```

- [ ] **Step 2: (app)/layout.tsx**

`src/app/(app)/layout.tsx`:
```tsx
import AppShell from "@/components/shell/AppShell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
```

- [ ] **Step 3: Failing test — yeni home**

`src/app/(app)/page.test.tsx`:
```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import HomePage from "./page";

vi.mock("@/components/shell/SessionProvider", () => ({
  useSession: () => ({ me: { full_name: "Ahmet Yılmaz", role_key: "patron", title: "Patron" }, isLoading: false }),
}));

describe("HomePage (kabuk ici)", () => {
  it("kullanici adiyla karsilama gosterir", () => {
    render(<HomePage />);
    expect(screen.getByText(/Ahmet Yılmaz/)).toBeInTheDocument();
  });
  it("kendi cikis butonu YOK (cikis sidebar'da)", () => {
    render(<HomePage />);
    expect(screen.queryByRole("button", { name: /çıkış/i })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Kırmızı**

Run: `pnpm test "src/app/(app)/page.test.tsx"` → FAIL (dosya yok).

- [ ] **Step 5: Yeni home + home.css + eski dosyaları sil**

`src/app/(app)/page.tsx`:
```tsx
"use client";

import { useSession } from "@/components/shell/SessionProvider";
import "./home.css";

// Kabuk ici gecici ana sayfa. Gercek gosterge paneli F6'da gelir.
export default function HomePage() {
  const { me, isLoading } = useSession();

  return (
    <div className="home">
      <h1 className="home__title">
        Hoş geldiniz{me ? `, ${me.full_name}` : ""}
      </h1>
      <p className="home__note">
        {isLoading
          ? "Yükleniyor…"
          : "Gösterge paneli ve modüller sonraki fazlarda eklenecek. Sol menüden gezinebilirsiniz."}
      </p>
    </div>
  );
}
```

`src/app/(app)/home.css`:
```css
.home {
  max-width: 640px;
}
.home__title {
  font-size: 26px;
  font-weight: 700;
  line-height: 32px;
  letter-spacing: -0.5px;
  color: var(--color-text);
  margin-bottom: 8px;
}
.home__note {
  font-size: 14px;
  line-height: 22px;
  color: var(--color-text-muted);
}
```

Eski dosyaları sil:
```bash
git rm src/app/page.tsx src/app/page.test.tsx src/app/home.css
```

- [ ] **Step 6: Yeşil + build kapısı**

Run: `pnpm test "src/app/(app)/page.test.tsx"` → PASS. Sonra `pnpm typecheck`, `pnpm lint`, ve **`pnpm build`** (route group + layout build-zamanı doğrulaması; `/` kabuk içinde derlenmeli).

- [ ] **Step 7: Commit**

```bash
git add src/components/shell/AppShell.tsx src/components/shell/shell.css "src/app/(app)/layout.tsx" "src/app/(app)/page.tsx" "src/app/(app)/page.test.tsx" "src/app/(app)/home.css"
git commit -m "feat: add app shell layout and move home into shell"
```

---

### Task 6: ComingSoon + catch-all rota

**Files:**
- Create: `src/components/shell/ComingSoon.tsx`, `coming-soon.css`, `ComingSoon.test.tsx`
- Create: `src/app/(app)/[...slug]/page.tsx`

**Interfaces:**
- Consumes: `moduleNameForSlug` (Task 1).
- Produces: `ComingSoon` (`{ moduleName: string }` prop). Catch-all page slug'dan modül adını türetir.

- [ ] **Step 1: Failing test**

`src/components/shell/ComingSoon.test.tsx`:
```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ComingSoon from "./ComingSoon";

describe("ComingSoon", () => {
  it("modul adini ve yakinda mesajini gosterir", () => {
    render(<ComingSoon moduleName="Projeler" />);
    expect(screen.getByText("Projeler")).toBeInTheDocument();
    expect(screen.getByText(/yakında/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Kırmızı**

Run: `pnpm test src/components/shell/ComingSoon.test.tsx` → FAIL.

- [ ] **Step 3: Implementasyon**

`src/components/shell/ComingSoon.tsx`:
```tsx
import "./coming-soon.css";

// Henuz yapilmamis modul icin durust yer tutucu (kabuk gercek, veri durust).
export default function ComingSoon({ moduleName }: { moduleName: string }) {
  return (
    <div className="coming-soon">
      <div className="coming-soon__card">
        <h1 className="coming-soon__title">{moduleName}</h1>
        <p className="coming-soon__note">Bu modül yakında eklenecek.</p>
      </div>
    </div>
  );
}
```

`src/components/shell/coming-soon.css`:
```css
.coming-soon {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 52px - 48px);
}
.coming-soon__card {
  text-align: center;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  padding: 40px 48px;
}
.coming-soon__title {
  font-size: 22px;
  font-weight: 700;
  line-height: 28px;
  color: var(--color-text);
  margin-bottom: 8px;
}
.coming-soon__note {
  font-size: 14px;
  line-height: 20px;
  color: var(--color-text-muted);
}
```

`src/app/(app)/[...slug]/page.tsx`:
```tsx
import ComingSoon from "@/components/shell/ComingSoon";
import { moduleNameForSlug } from "@/components/shell/nav-config";

// Next 15: params bir Promise'tir.
export default async function CatchAllPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const moduleName = moduleNameForSlug(slug[0] ?? "");
  return <ComingSoon moduleName={moduleName} />;
}
```

- [ ] **Step 4: Yeşil + build kapısı**

Run: `pnpm test src/components/shell/ComingSoon.test.tsx` → PASS. Sonra `pnpm typecheck`, `pnpm lint`, **`pnpm build`** (catch-all rota derlenmeli; `params` Promise tipi doğru olmalı).

- [ ] **Step 5: Commit**

```bash
git add src/components/shell/ComingSoon.tsx src/components/shell/coming-soon.css src/components/shell/ComingSoon.test.tsx "src/app/(app)/[...slug]/page.tsx"
git commit -m "feat: add coming-soon placeholder for unbuilt modules"
```

---

### Task 7: E2E kabuk akışı

**Files:**
- Modify: `e2e/auth.spec.ts` (kabuk gerçeğine güncelle)

**Interfaces:**
- Consumes: mevcut hermetik mock backend (F2). Mock `MeResponse` `full_name: "Ahmet Yılmaz"` döndürür.

- [ ] **Step 1: auth.spec.ts'i kabuk akışına güncelle**

`e2e/auth.spec.ts` — "giris → ana sayfa → cikis" testini kabuk gerçeğine göre değiştir (çıkış artık sidebar'da "Çıkış" butonu; kullanıcı adı sidebar kullanıcı bloğunda), ve kabuk + yakında akışını ekle. Diğer testler (yanlış parola, oturumsuz redirect, httpOnly cookie) **değişmez**:
```ts
import { test, expect } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
}

test("giris → kabuk → yakinda → cikis akisi", async ({ page }) => {
  await login(page);

  // Kabuk gorunur: sidebar grup basligi + kullanici adi + karsilama
  await expect(page.getByText("Genel")).toBeVisible();
  await expect(page.getByText("Ahmet Yılmaz")).toBeVisible();
  await expect(page.getByText(/Hoş geldiniz/)).toBeVisible();
  // Gosterge Paneli aktif
  await expect(page.getByRole("link", { name: /Gösterge Paneli/ })).toHaveAttribute("aria-current", "page");

  // Yapilmamis modul → yakinda
  await page.getByRole("link", { name: /Projeler/ }).click();
  await expect(page).toHaveURL(/\/projeler/);
  await expect(page.getByText(/yakında/i)).toBeVisible();

  // Sidebar'dan cikis
  await page.getByRole("button", { name: /çıkış/i }).click();
  await expect(page).toHaveURL(/\/login/);
});

test("yanlis parola hata gosterir", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("wrong");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByText(/e-posta veya şifre hatalı/i)).toBeVisible();
});

test("oturumsuz korumali rota /login'e yonlendirir", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login\?next=%2F/);
});

test("token cookie httpOnly — document.cookie'de gorunmez", async ({ page }) => {
  await login(page);
  await expect(page.getByText("Ahmet Yılmaz")).toBeVisible();
  const cookieStr = await page.evaluate(() => document.cookie);
  expect(cookieStr).not.toContain("fiil_access");
});
```

- [ ] **Step 2: E2E'yi çalıştır**

Run: `pnpm test:visual e2e/auth.spec.ts` (gerekirse `pnpm exec playwright install chromium`). 4 test PASS olmalı. Build webServer içinde ~60s.

- [ ] **Step 3: Commit**

```bash
git add e2e/auth.spec.ts
git commit -m "test: update auth E2E for app shell flow"
```

---

### Task 8: Kabuk görsel regresyonu

**Files:**
- Create: `e2e/shell-visual.spec.ts`
- Create (CI'dan): `e2e/shell-visual.spec.ts-snapshots/shell-home-chromium-linux.png`

**Interfaces:**
- Consumes: mevcut mock backend (giriş sonrası kabuk render eder).

- [ ] **Step 1: Görsel test yaz**

`e2e/shell-visual.spec.ts`:
```ts
import { test, expect } from "@playwright/test";

test("kabuk ana sayfa gorsel", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  // Kabuk oturmasi icin kullanici adi + karsilama gorunur olmali
  await expect(page.getByText("Ahmet Yılmaz")).toBeVisible();
  await expect(page.getByText(/Hoş geldiniz/)).toBeVisible();
  await expect(page).toHaveScreenshot("shell-home.png", { fullPage: true });
});
```

- [ ] **Step 2: Yerelde çalıştır — baseline üretimini gör, macOS PNG'yi SİL**

Run: `pnpm test:visual e2e/shell-visual.spec.ts` (macOS baseline üretir/uyumsuzluk — EXPECTED). Sonra `rm -rf e2e/shell-visual.spec.ts-snapshots` — **macOS PNG commit etme**. `git status` ile yalnız `.spec.ts` yeni olduğunu doğrula.

- [ ] **Step 3: Spec'i commit + push (Linux baseline için)**

```bash
git add e2e/shell-visual.spec.ts
git commit -m "test: add app shell visual regression spec"
git push origin main
```

- [ ] **Step 4: Linux baseline üret (controller, gh ile)**

- `gh workflow run visual-baselines.yml --ref main` → `gh run watch <id> --exit-status`.
- `gh run download <id> -n linux-baselines -D <scratch>` → `shell-visual.spec.ts-snapshots/shell-home-chromium-linux.png`'yi `e2e/shell-visual.spec.ts-snapshots/` altına kopyala.
- Commit + push:
```bash
git add e2e/shell-visual.spec.ts-snapshots/shell-home-chromium-linux.png
git commit -m "test: add app shell visual regression baseline (linux)"
git push origin main
```

- [ ] **Step 5: CI doğrula**

CI (build+visual) yeşil olmalı (shell-home + login-page + design-system baseline'ları eşleşir).

---

### Task 9: Faz kapanışı — kapılar + review + defter

**Files:**
- Create: `.superpowers/sdd/progress-f3.md`

- [ ] **Step 1: Tüm kapıları çalıştır**

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```
Hepsi yeşil olmalı. Kırmızı varsa düzelt + commit.

- [ ] **Step 2: Kod incelemesi (react-reviewer)**

`react-reviewer` ile tüm F3 diff'ini incele (server/client sınırı, hook doğruluğu, erişilebilirlik: nav `aria-current`, avatar `aria-hidden`, bildirim `aria-label`; token disiplini). CRITICAL/HIGH düzelt + commit.

- [ ] **Step 3: CI yeşilini doğrula**

```bash
git push origin main
```
`ci.yml` (build + visual) YEŞİL. Kırmızıysa düzelt.

- [ ] **Step 4: İlerleme defteri + hafıza**

`.superpowers/sdd/progress-f3.md` — tamamlanan task'lar, kararlar (kabuk client, proje-seçici/AI/rozet yok, catch-all ComingSoon), bilinen limitler, sonraki faz (F4 Ayarlar — B3'e bağımlı). Hafıza: yeni `frontend-f3-kabuk.md` kaydı + `MEMORY.md` satırı; canlı deploy doğrulaması (Railway).

---

## Self-Review

**1. Spec coverage:**
- §2 Rota (route group, catch-all, login/design-system dışı) → Task 5, 6 ✓
- §3.2 AppShell → Task 5 ✓
- §3.3 SessionProvider tek fetch → Task 2 ✓
- §3.4 Topbar (logo, inert bell, avatar) → Task 3 ✓
- §3.5 Sidebar (4 grup, aktif vurgu, kullanıcı bloğu, çıkış) → Task 4 ✓
- §3.6 ComingSoon → Task 6 ✓
- §3.7 nav ikonları → Task 1 ✓
- §4 veri akışı → Task 2, 3, 4 ✓
- §5 testler (unit + E2E + görsel) → Task 1-8 ✓
- §6 tokens (--color-nav-active-bg) → Task 3 ✓
- Home taşıma → Task 5 ✓

**2. Placeholder scan:** Kod bloklarında TBD/TODO yok; her adımda gerçek kod. İkonlar tam SVG.

**3. Type consistency:** `NavItem.Icon` tipi (Task 1) Sidebar/nav-config'de tutarlı. `useSession()` dönüşü `{ me, isLoading }` Task 2'de tanımlı, Topbar/Sidebar/home'da aynı. `initials(fullName)` Task 1, Topbar/Sidebar'da kullanılır. `moduleNameForSlug` Task 1, catch-all'da (Task 6) kullanılır. Next 15 `params: Promise<...>` catch-all'da doğru.
