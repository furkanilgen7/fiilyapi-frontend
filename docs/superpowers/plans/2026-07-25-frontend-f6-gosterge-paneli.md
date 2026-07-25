# F6 — Gösterge Paneli ekranı: uygulama planı

> **Ajan işçiler için:** ZORUNLU ALT-SKILL: Bu planı task-by-task uygulamak için
> `superpowers:subagent-driven-development` (önerilen) veya `superpowers:executing-plans`
> kullanın. Adımlar takip için checkbox (`- [ ]`) söz dizimindedir.

**Hedef:** `/` rotasındaki geçici karşılama sayfasını mockup'a birebir gösterge paneliyle değiştirmek.

**Mimari:** `page.tsx` → `DashboardView` (istemci) → `useDashboardSummary` (TanStack Query) → `backendClient.GET("/dashboard/summary")` → BFF proxy. Kartlar `src/components/dashboard/` altında ayrı dosyalar; ortak boş durum tek bileşende.

**Teknoloji:** Next.js (App Router) · TanStack Query · openapi-fetch · Vitest + Testing Library · Playwright

**Spec:** `docs/superpowers/specs/2026-07-25-frontend-f6-gosterge-paneli-design.md`
**Mockup kanonu:** `projedesign/Ekran 1 - Gösterge Paneli.dc.html`
**Bağımlı:** B6 Task 5 tamamlanmış olmalı (`openapi/openapi.json` güncel).

## Küresel kısıtlar

- **Mockup birebir.** Ölçüler mockup'ın satır içi stillerinden okunur, göz kararı yok. UI'a başlamadan önce `scripts/render-mockup.mjs` ile 1440px render alıp karşılaştır.
- **Çıplak hex yasak.** Tüm renkler `tokens.css` değişkenleri üzerinden. Gerekli token yoksa önce token ekle.
- Onaylı sapmalar (geri düzeltilmeyecek): proje kartındaki `Bütçe` etiketi, `Tamamlandı` durumu, sıfır-proje boş durumu. Gerekçeleri spec §6'da.
- Yazılmamış modüllere ait mockup öğeleri **eklenmez**: topbar proje seçici, "4 proje aktif" açılırı, Onay Kutusu `7` rozeti, FİİL AI kartı.
- **Görsel baseline'lar yalnızca Linux'ta üretilir.** `visual-baselines.yml` (workflow_dispatch) → `linux-baselines` artifact → `gh run download` → `e2e/` altına kopyala → commit. macOS'ta PNG üretme.
- Paket yöneticisi `pnpm`. Test: `pnpm test`, lint: `pnpm lint`, tip: `pnpm tsc --noEmit`.
- Metinler Türkçe. Sayı biçimi `tr-TR`.
- Commit mesajları: `<type>: <açıklama>`, ASCII.

## Dosya yapısı

| Dosya | Sorumluluk |
|---|---|
| `openapi/openapi.json` (değişir) | B6'dan kopyalanan şema |
| `src/lib/api/schema.d.ts` (üretilir) | `pnpm gen:api` çıktısı |
| `src/lib/api/hooks/useDashboardSummary.ts` | tek sorgu hook'u |
| `src/lib/format.ts` | `formatCompactCurrency`, `formatCurrency`, `formatPercent` |
| `src/components/dashboard/CardEmptyState.tsx` | ortak boş durum bloğu + `pending_module` eşlemesi |
| `src/components/dashboard/KpiCard.tsx` | üst satır sağdaki iki 280px kart |
| `src/components/dashboard/PortfolioCard.tsx` | üst satır sol geniş kart + grafik alanı |
| `src/components/dashboard/ProjectCard.tsx` | tek proje kartı |
| `src/components/dashboard/ProjectGrid.tsx` | 4 sütun ızgara + sıfır-proje durumu |
| `src/components/dashboard/PendingApprovalsCard.tsx` | alt satır sol |
| `src/components/dashboard/RisksCard.tsx` | alt satır sağ |
| `src/components/dashboard/DashboardView.tsx` | düzen + veri bağlama |
| `src/components/dashboard/dashboard.css` | tüm ölçüler |
| `src/app/(app)/page.tsx` (değişir) | `DashboardView`'u sarar |
| `src/app/(app)/home.css` (silinir) | geçici karşılama stili |
| `src/components/shell/nav-config.ts` (değişir) | Şirket Varlıkları kalemi |

---

## Task 1: Şema tipleri ve sorgu hook'u

**Dosyalar:**
- Değiştir: `openapi/openapi.json` (B6 Task 5'te kopyalandı)
- Üret: `src/lib/api/schema.d.ts`
- Oluştur: `src/lib/api/hooks/useDashboardSummary.ts`
- Test: `src/lib/api/hooks/useDashboardSummary.test.tsx`

**Arayüzler:**
- Tüketir: `backendClient` (`src/lib/api/client.ts`), `unwrap` (`src/lib/api/unwrap.ts`)
- Üretir: `useDashboardSummary(): UseQueryResult<DashboardSummary, Error>`,
  `export type DashboardSummary = components["schemas"]["DashboardSummaryResponse"]`,
  `export type DashboardProjectCard = components["schemas"]["DashboardProjectCard"]` —
  Task 3-5 bu tipleri kullanır.

- [ ] **Adım 1: Şemayı üret ve doğrula**

```bash
pnpm gen:api
grep -c "DashboardSummaryResponse" src/lib/api/schema.d.ts
```

Beklenen: en az 1. Çıkmazsa B6 Task 5 tamamlanmamıştır — dur ve bildir.

- [ ] **Adım 2: Başarısız testi yaz**

`src/lib/api/hooks/useDashboardSummary.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useDashboardSummary } from "./useDashboardSummary";
import { backendClient } from "@/lib/api/client";

vi.mock("@/lib/api/client", () => ({ backendClient: { GET: vi.fn() } }));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useDashboardSummary", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ozet ucundan veriyi doner", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: { role_name: "Patron", active_project_count: 1, projects: [] },
      error: undefined,
      response: new Response(),
    } as never);

    const { result } = renderHook(() => useDashboardSummary(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.role_name).toBe("Patron");
    expect(backendClient.GET).toHaveBeenCalledWith("/dashboard/summary");
  });
});
```

- [ ] **Adım 3: Testin başarısız olduğunu doğrula**

Çalıştır: `pnpm test src/lib/api/hooks/useDashboardSummary.test.tsx`
Beklenen: FAIL — modül bulunamadı

- [ ] **Adım 4: Asgari uygulamayı yaz**

`src/lib/api/hooks/useDashboardSummary.ts`:

```ts
import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type { components } from "@/lib/api/schema";

export type DashboardSummary = components["schemas"]["DashboardSummaryResponse"];
export type DashboardProjectCard = components["schemas"]["DashboardProjectCard"];

export const DASHBOARD_SUMMARY_QUERY_KEY = "dashboard-summary";

export function useDashboardSummary(): UseQueryResult<DashboardSummary, Error> {
  return useQuery({
    queryKey: [DASHBOARD_SUMMARY_QUERY_KEY],
    queryFn: async () => unwrap(await backendClient.GET("/dashboard/summary")),
  });
}
```

- [ ] **Adım 5: Testin geçtiğini doğrula**

Çalıştır: `pnpm test src/lib/api/hooks/useDashboardSummary.test.tsx`
Beklenen: PASS

- [ ] **Adım 6: Tip kontrolü ve commit**

```bash
pnpm tsc --noEmit
git add openapi/openapi.json src/lib/api/schema.d.ts src/lib/api/hooks/useDashboardSummary.ts src/lib/api/hooks/useDashboardSummary.test.tsx
git commit -m "feat: gosterge paneli ozet sorgusu ve sema tipleri"
```

---

## Task 2: Sayı biçimleyicileri

**Dosyalar:**
- Oluştur: `src/lib/format.ts`
- Test: `src/lib/format.test.ts`

**Arayüzler:**
- Üretir: `formatCompactCurrency(value: string | number): string`,
  `formatCurrency(value: string | number): string`,
  `formatPercent(value: string | number): string` — Task 3-5 bunları kullanır.
  Girdi `string | number` çünkü backend `Decimal` alanları JSON'da metin olarak döner.

- [ ] **Adım 1: Başarısız testi yaz**

`src/lib/format.test.ts`:

```ts
import { describe, it, expect } from "vitest";

import { formatCompactCurrency, formatCurrency, formatPercent } from "./format";

describe("formatCompactCurrency", () => {
  it("milyonu M kisaltmasiyla verir", () => {
    expect(formatCompactCurrency("1500000.00")).toBe("₺ 1,5M");
  });
  it("tam milyonda ondalik basmaz", () => {
    expect(formatCompactCurrency(8000000)).toBe("₺ 8M");
  });
  it("binleri B kisaltmasiyla verir", () => {
    expect(formatCompactCurrency(800000)).toBe("₺ 800B");
  });
  it("sifiri oldugu gibi basar", () => {
    expect(formatCompactCurrency(0)).toBe("₺ 0");
  });
});

describe("formatCurrency", () => {
  it("binlik ayraciyla tam tutar verir", () => {
    expect(formatCurrency("24870500.00")).toBe("₺ 24.870.500");
  });
});

describe("formatPercent", () => {
  it("ondalikli yuzdeyi virgulle verir", () => {
    expect(formatPercent("42.50")).toBe("%42,5");
  });
  it("tam sayida ondalik basmaz", () => {
    expect(formatPercent("75.00")).toBe("%75");
  });
  it("sifiri basar", () => {
    expect(formatPercent(0)).toBe("%0");
  });
});
```

- [ ] **Adım 2: Testin başarısız olduğunu doğrula**

Çalıştır: `pnpm test src/lib/format.test.ts`
Beklenen: FAIL — modül bulunamadı

- [ ] **Adım 3: Asgari uygulamayı yaz**

`src/lib/format.ts`:

```ts
const LOCALE = "tr-TR";
const MILLION = 1_000_000;
const THOUSAND = 1_000;

function toNumber(value: string | number): number {
  return typeof value === "number" ? value : Number(value);
}

/** Sondaki sifirlari atarak en fazla bir ondalik basar: 1,5 · 8 · 42,5 */
function short(value: number): string {
  return new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 }).format(value);
}

/** Kart tutarlari: mockup'taki "₺ 8,4M" gosterimi. */
export function formatCompactCurrency(value: string | number): string {
  const n = toNumber(value);
  if (Math.abs(n) >= MILLION) return `₺ ${short(n / MILLION)}M`;
  if (Math.abs(n) >= THOUSAND) return `₺ ${short(n / THOUSAND)}B`;
  return `₺ ${short(n)}`;
}

/** Portfoy tutari: mockup'taki "24.870.500" gosterimi. */
export function formatCurrency(value: string | number): string {
  const formatted = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 }).format(
    toNumber(value),
  );
  return `₺ ${formatted}`;
}

/** Ilerleme yuzdesi: "%42,5" · "%75" */
export function formatPercent(value: string | number): string {
  return `%${short(toNumber(value))}`;
}
```

- [ ] **Adım 4: Testin geçtiğini doğrula**

Çalıştır: `pnpm test src/lib/format.test.ts`
Beklenen: 8 PASS. `Intl` çıktısı beklenenden farklıysa (ör. ince boşluk karakteri) testi
gerçek çıktıya göre düzelt — biçimleyiciyi elle string birleştirmeye çevirme.

- [ ] **Adım 5: Commit**

```bash
git add src/lib/format.ts src/lib/format.test.ts
git commit -m "feat: tr-TR sayi bicimleyicileri"
```

---

## Task 3: Boş durum bloğu ve KPI kartları

**Dosyalar:**
- Oluştur: `src/components/dashboard/CardEmptyState.tsx`, `KpiCard.tsx`, `PortfolioCard.tsx`, `dashboard.css`
- Test: `src/components/dashboard/CardEmptyState.test.tsx`, `KpiCard.test.tsx`

**Arayüzler:**
- Tüketir: `formatCompactCurrency`, `formatCurrency` (Task 2), `components` (Task 1)
- Üretir: `<CardEmptyState title pendingModule />`, `<KpiCard label emptyTitle metric />`,
  `<PortfolioCard metric />` — Task 5 bunları kullanır.

- [ ] **Adım 1: Başarısız testi yaz**

`src/components/dashboard/CardEmptyState.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { CardEmptyState } from "./CardEmptyState";

describe("CardEmptyState", () => {
  it("baslik ve modul metnini basar", () => {
    render(<CardEmptyState title="Henüz hakediş verisi yok" pendingModule="progress_payments" />);
    expect(screen.getByText("Henüz hakediş verisi yok")).toBeInTheDocument();
    expect(screen.getByText("Hakediş modülüyle birlikte gelir")).toBeInTheDocument();
  });

  it("bilinmeyen modul anahtarinda genel metin basar", () => {
    render(<CardEmptyState title="Uyarı yok" pendingModule="bilinmeyen" />);
    expect(screen.getByText("İlgili modülle birlikte gelir")).toBeInTheDocument();
  });

  it("fatura modulunu esler", () => {
    render(<CardEmptyState title="Henüz fatura verisi yok" pendingModule="invoicing" />);
    expect(screen.getByText("Fatura yönetimiyle birlikte gelir")).toBeInTheDocument();
  });
});
```

`src/components/dashboard/KpiCard.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { KpiCard } from "./KpiCard";

describe("KpiCard", () => {
  it("veri yokken bos durum basar", () => {
    render(
      <KpiCard
        label="Tahsil Edilecek"
        emptyTitle="Henüz fatura verisi yok"
        metric={{ available: false, value: null, pending_module: "invoicing" }}
      />,
    );
    expect(screen.getByText("Tahsil Edilecek")).toBeInTheDocument();
    expect(screen.getByText("Henüz fatura verisi yok")).toBeInTheDocument();
  });

  it("veri varken tutari basar", () => {
    render(
      <KpiCard
        label="Tahsil Edilecek"
        emptyTitle="Henüz fatura verisi yok"
        metric={{ available: true, value: "8400000.00", pending_module: "invoicing" }}
      />,
    );
    expect(screen.getByText("₺ 8,4M")).toBeInTheDocument();
  });
});
```

- [ ] **Adım 2: Testin başarısız olduğunu doğrula**

Çalıştır: `pnpm test src/components/dashboard`
Beklenen: FAIL — modüller bulunamadı

- [ ] **Adım 3: Asgari uygulamayı yaz**

`src/components/dashboard/CardEmptyState.tsx`:

```tsx
import "./dashboard.css";

// Backend pending_module anahtari doner; kullaniciya gosterilen metin frontend'in isi.
const MODULE_LABELS: Record<string, string> = {
  progress_payments: "Hakediş modülüyle birlikte gelir",
  invoicing: "Fatura yönetimiyle birlikte gelir",
  approvals: "Onay kutusuyla birlikte gelir",
  inventory: "Stok ve saha modülleriyle birlikte gelir",
};

const FALLBACK_LABEL = "İlgili modülle birlikte gelir";

export function CardEmptyState({
  title,
  pendingModule,
}: {
  title: string;
  pendingModule: string;
}) {
  return (
    <div className="dash-empty">
      <p className="dash-empty__title">{title}</p>
      <p className="dash-empty__hint">{MODULE_LABELS[pendingModule] ?? FALLBACK_LABEL}</p>
    </div>
  );
}
```

`src/components/dashboard/KpiCard.tsx`:

```tsx
import type { components } from "@/lib/api/schema";
import { formatCompactCurrency } from "@/lib/format";

import { CardEmptyState } from "./CardEmptyState";
import "./dashboard.css";

type MetricPlaceholder = components["schemas"]["MetricPlaceholder"];

export function KpiCard({
  label,
  emptyTitle,
  metric,
}: {
  label: string;
  emptyTitle: string;
  metric: MetricPlaceholder;
}) {
  return (
    <section className="dash-card dash-kpi">
      <h2 className="dash-card__label">{label}</h2>
      {metric.available && metric.value !== null && metric.value !== undefined ? (
        <p className="dash-kpi__value">{formatCompactCurrency(metric.value)}</p>
      ) : (
        <CardEmptyState title={emptyTitle} pendingModule={metric.pending_module} />
      )}
      <div className="dash-bar dash-bar--kpi">
        <div className="dash-bar__fill" style={{ width: "0%" }} />
      </div>
    </section>
  );
}
```

`src/components/dashboard/PortfolioCard.tsx`:

```tsx
import type { components } from "@/lib/api/schema";
import { formatCurrency } from "@/lib/format";

import { CardEmptyState } from "./CardEmptyState";
import "./dashboard.css";

type MetricPlaceholder = components["schemas"]["MetricPlaceholder"];

export function PortfolioCard({ metric }: { metric: MetricPlaceholder }) {
  return (
    <section className="dash-card dash-portfolio">
      <h2 className="dash-card__label">Portföy · Toplam Hakediş</h2>
      {metric.available && metric.value !== null && metric.value !== undefined ? (
        <p className="dash-portfolio__value">{formatCurrency(metric.value)}</p>
      ) : (
        <CardEmptyState
          title="Henüz hakediş verisi yok"
          pendingModule={metric.pending_module}
        />
      )}
      {/* Mockup'taki alan grafigi kutusu; veri gelene kadar bos cizim alani. */}
      <svg
        className="dash-portfolio__chart"
        viewBox="0 0 500 80"
        preserveAspectRatio="none"
        aria-hidden="true"
      />
    </section>
  );
}
```

`src/components/dashboard/dashboard.css` (bu task'ta kullanılan sınıflar; ölçüler
mockup'tan, renkler token):

```css
.dash-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  box-shadow: var(--shadow-card);
  padding: 24px;
}
.dash-card__label {
  font-size: 11px;
  font-weight: 600;
  line-height: 14px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--color-text-subtle);
  margin-bottom: 16px;
}
.dash-kpi {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.dash-kpi__value {
  font-family: var(--font-mono);
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -1px;
  color: var(--color-text);
  margin-bottom: 8px;
}
.dash-portfolio__value {
  font-family: var(--font-mono);
  font-size: 42px;
  font-weight: 700;
  letter-spacing: -2px;
  color: var(--color-text);
  margin-bottom: 8px;
}
.dash-portfolio__chart {
  width: 100%;
  height: 80px;
}
.dash-bar {
  background: var(--color-divider);
  border-radius: 2px;
  overflow: hidden;
}
.dash-bar--kpi {
  height: 4px;
}
.dash-bar__fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: 2px;
}
.dash-empty__title {
  font-size: 13px;
  line-height: 20px;
  color: var(--color-text-secondary);
}
.dash-empty__hint {
  font-size: 11px;
  line-height: 16px;
  color: var(--color-text-subtle);
  margin-top: 2px;
}
```

`--font-mono`, `--color-primary`, `--color-text-secondary` adlarını `src/styles/tokens.css`'ten
doğrula; farklıysa gerçek adı kullan, yeni hex yazma.

- [ ] **Adım 4: Testin geçtiğini doğrula**

Çalıştır: `pnpm test src/components/dashboard`
Beklenen: 5 PASS

- [ ] **Adım 5: Commit**

```bash
git add src/components/dashboard
git commit -m "feat: gosterge paneli kpi kartlari ve bos durum blogu"
```

---

## Task 4: Proje kartı ve ızgara

**Dosyalar:**
- Oluştur: `src/components/dashboard/ProjectCard.tsx`, `ProjectGrid.tsx`
- Değiştir: `src/components/dashboard/dashboard.css`
- Test: `src/components/dashboard/ProjectCard.test.tsx`, `ProjectGrid.test.tsx`

**Arayüzler:**
- Tüketir: `formatCompactCurrency`, `formatPercent` (Task 2), `components` (Task 1)
- Üretir: `<ProjectCard project />`, `<ProjectGrid projects />` — Task 5 `ProjectGrid`'i kullanır.

- [ ] **Adım 1: Başarısız testi yaz**

`src/components/dashboard/ProjectCard.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { ProjectCard } from "./ProjectCard";

const base = {
  id: "11111111-1111-1111-1111-111111111111",
  code: "GK-A",
  name: "Güneşkent A-Blok",
  budget: "1500000.00",
  progress_pct: "42.50",
};

describe("ProjectCard", () => {
  it("aktif projeyi butce etiketiyle basar", () => {
    render(<ProjectCard project={{ ...base, status: "active" }} />);
    expect(screen.getByText("Aktif")).toBeInTheDocument();
    expect(screen.getByText("Güneşkent A-Blok")).toBeInTheDocument();
    expect(screen.getByText("₺ 1,5M")).toBeInTheDocument();
    expect(screen.getByText("Bütçe")).toBeInTheDocument();
    expect(screen.getByText("%42,5 tamamlandı")).toBeInTheDocument();
  });

  it("beklemedeki projeyi etiketler", () => {
    render(<ProjectCard project={{ ...base, status: "on_hold" }} />);
    expect(screen.getByText("Beklemede")).toBeInTheDocument();
  });

  it("tamamlanan projeyi etiketler", () => {
    render(<ProjectCard project={{ ...base, status: "completed", progress_pct: "100.00" }} />);
    expect(screen.getByText("Tamamlandı")).toBeInTheDocument();
    expect(screen.getByText("%100 tamamlandı")).toBeInTheDocument();
  });
});
```

`src/components/dashboard/ProjectGrid.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { ProjectGrid } from "./ProjectGrid";

function makeProjects(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `1111111${i}-1111-1111-1111-111111111111`,
    code: `P-${i}`,
    name: `Proje ${i}`,
    status: "active" as const,
    budget: "1000000.00",
    progress_pct: "10.00",
  }));
}

describe("ProjectGrid", () => {
  it("proje yoksa bos durum basar", () => {
    render(<ProjectGrid projects={[]} />);
    expect(screen.getByText("Henüz proje tanımlanmadı")).toBeInTheDocument();
  });

  it("uc projeyi basar", () => {
    render(<ProjectGrid projects={makeProjects(3)} />);
    expect(screen.getAllByText(/^Proje \d$/)).toHaveLength(3);
  });

  it("yedi projeyi de basar", () => {
    render(<ProjectGrid projects={makeProjects(7)} />);
    expect(screen.getAllByText(/^Proje \d$/)).toHaveLength(7);
  });
});
```

- [ ] **Adım 2: Testin başarısız olduğunu doğrula**

Çalıştır: `pnpm test src/components/dashboard`
Beklenen: yeni 6 test FAIL — modüller bulunamadı

- [ ] **Adım 3: Asgari uygulamayı yaz**

`src/components/dashboard/ProjectCard.tsx`:

```tsx
import type { components } from "@/lib/api/schema";
import { formatCompactCurrency, formatPercent } from "@/lib/format";

import "./dashboard.css";

type Project = components["schemas"]["DashboardProjectCard"];

// Mockup Ekran 1'de yalnizca Aktif/Beklemede var; Tamamlandi rozeti
// "Ekran 4 - Projeler.dc.html" satir 273'ten alindi (spec §3.4).
const STATUS_LABELS: Record<Project["status"], string> = {
  active: "Aktif",
  on_hold: "Beklemede",
  completed: "Tamamlandı",
};

export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className={`dash-project dash-project--${project.status}`}>
      <p className="dash-project__status">
        <span className="dash-project__dot" aria-hidden="true" />
        {STATUS_LABELS[project.status]}
      </p>
      <h3 className="dash-project__name">{project.name}</h3>
      <p className="dash-project__value">{formatCompactCurrency(project.budget)}</p>
      <p className="dash-project__value-label">Bütçe</p>
      <div className="dash-bar dash-bar--project">
        <div
          className="dash-bar__fill dash-project__fill"
          style={{ width: `${Math.min(Number(project.progress_pct), 100)}%` }}
        />
      </div>
      <p className="dash-project__progress">
        {formatPercent(project.progress_pct)} tamamlandı
      </p>
    </article>
  );
}
```

`src/components/dashboard/ProjectGrid.tsx`:

```tsx
import type { components } from "@/lib/api/schema";

import { ProjectCard } from "./ProjectCard";
import "./dashboard.css";

type Project = components["schemas"]["DashboardProjectCard"];

export function ProjectGrid({ projects }: { projects: Project[] }) {
  if (projects.length === 0) {
    return (
      <section className="dash-card dash-projects-empty">
        <p className="dash-empty__title">Henüz proje tanımlanmadı</p>
        <p className="dash-empty__hint">Projeler tanımlandığında burada listelenir</p>
      </section>
    );
  }

  return (
    <div className="dash-projects">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}
```

`dashboard.css` sonuna ekle:

```css
.dash-projects {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}
.dash-projects-empty {
  margin-bottom: 16px;
}
.dash-project {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  box-shadow: var(--shadow-card);
  padding: 18px;
}
.dash-project__status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  line-height: 14px;
  color: var(--color-text-subtle);
  margin-bottom: 4px;
}
.dash-project__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-success);
}
.dash-project--on_hold .dash-project__dot {
  background: var(--color-warning);
}
.dash-project--completed .dash-project__dot {
  background: var(--color-neutral);
}
.dash-project__name {
  font-size: 14px;
  font-weight: 600;
  line-height: 18px;
  color: var(--color-text);
  margin-bottom: 12px;
}
.dash-project__value {
  font-family: var(--font-mono);
  font-size: 22px;
  font-weight: 700;
  line-height: 26px;
  color: var(--color-text);
  margin-bottom: 2px;
}
.dash-project__value-label {
  font-size: 11px;
  line-height: 14px;
  color: var(--color-text-subtle);
  margin-bottom: 10px;
}
.dash-bar--project {
  height: 3px;
}
.dash-project--on_hold .dash-project__fill {
  background: var(--color-warning);
}
.dash-project--completed .dash-project__fill {
  background: var(--color-neutral);
}
.dash-project__progress {
  font-size: 11px;
  line-height: 14px;
  color: var(--color-text-subtle);
  margin-top: 6px;
}
```

`--color-success`, `--color-warning`, `--color-neutral` adlarını `tokens.css`'ten doğrula.

- [ ] **Adım 4: Testin geçtiğini doğrula**

Çalıştır: `pnpm test src/components/dashboard`
Beklenen: 11 PASS (Task 3'ün 5 testi + 6 yeni)

- [ ] **Adım 5: Commit**

```bash
git add src/components/dashboard
git commit -m "feat: gosterge paneli proje kartlari ve izgara"
```

---

## Task 5: Alt satır kartları, düzen ve sayfa

**Dosyalar:**
- Oluştur: `src/components/dashboard/PendingApprovalsCard.tsx`, `RisksCard.tsx`, `DashboardView.tsx`
- Değiştir: `src/components/dashboard/dashboard.css`, `src/app/(app)/page.tsx`
- Sil: `src/app/(app)/home.css`, `src/app/(app)/page.test.tsx`
- Test: `src/components/dashboard/DashboardView.test.tsx`

**Arayüzler:**
- Tüketir: `useDashboardSummary` (Task 1), `PortfolioCard`/`KpiCard` (Task 3), `ProjectGrid` (Task 4)
- Üretir: `<DashboardView />` — `page.tsx` bunu render eder.

- [ ] **Adım 1: Başarısız testi yaz**

`src/components/dashboard/DashboardView.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import { DashboardView } from "./DashboardView";
import { useDashboardSummary } from "@/lib/api/hooks/useDashboardSummary";

vi.mock("@/lib/api/hooks/useDashboardSummary", () => ({
  useDashboardSummary: vi.fn(),
}));

const summary = {
  role_name: "Patron",
  active_project_count: 1,
  projects: [
    {
      id: "11111111-1111-1111-1111-111111111111",
      code: "GK-A",
      name: "Güneşkent A-Blok",
      status: "active" as const,
      budget: "1500000.00",
      progress_pct: "42.50",
    },
  ],
  portfolio: { available: false, value: null, pending_module: "progress_payments" },
  receivables: { available: false, value: null, pending_module: "invoicing" },
  average_margin: { available: false, value: null, pending_module: "progress_payments" },
  pending_approvals: { available: false, count: 0, items: [], pending_module: "approvals" },
  risks: { available: false, items: [], pending_module: "inventory" },
};

describe("DashboardView", () => {
  beforeEach(() => vi.clearAllMocks());

  it("breadcrumb, baslik ve proje kartini basar", () => {
    vi.mocked(useDashboardSummary).mockReturnValue({
      data: summary,
      isLoading: false,
      isError: false,
    } as never);

    render(<DashboardView />);

    expect(screen.getByRole("heading", { name: "Gösterge Paneli" })).toBeInTheDocument();
    expect(screen.getByText("Patron Görünümü")).toBeInTheDocument();
    expect(screen.getByText("1 Aktif Proje")).toBeInTheDocument();
    expect(screen.getByText("Güneşkent A-Blok")).toBeInTheDocument();
  });

  it("sayac sifirken onay rozetini basmaz", () => {
    vi.mocked(useDashboardSummary).mockReturnValue({
      data: summary,
      isLoading: false,
      isError: false,
    } as never);

    render(<DashboardView />);

    expect(screen.queryByTestId("dash-approvals-badge")).not.toBeInTheDocument();
  });

  it("hata durumunda mesaj basar", () => {
    vi.mocked(useDashboardSummary).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as never);

    render(<DashboardView />);

    expect(screen.getByText("Gösterge paneli yüklenemedi")).toBeInTheDocument();
  });
});
```

- [ ] **Adım 2: Testin başarısız olduğunu doğrula**

Çalıştır: `pnpm test src/components/dashboard/DashboardView.test.tsx`
Beklenen: FAIL — modül bulunamadı

- [ ] **Adım 3: Asgari uygulamayı yaz**

`src/components/dashboard/PendingApprovalsCard.tsx`:

```tsx
import type { components } from "@/lib/api/schema";

import { CardEmptyState } from "./CardEmptyState";
import "./dashboard.css";

type Placeholder = components["schemas"]["PendingApprovalsPlaceholder"];

export function PendingApprovalsCard({ data }: { data: Placeholder }) {
  return (
    <section className="dash-card dash-list-card">
      <h2 className="dash-list-card__title">
        Onay Bekleyenler
        {data.count > 0 && (
          <span className="dash-list-card__badge" data-testid="dash-approvals-badge">
            {data.count}
          </span>
        )}
      </h2>
      {data.available && data.items.length > 0 ? (
        <ul className="dash-list">
          {data.items.map((item) => (
            <li key={item} className="dash-list__row">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <CardEmptyState title="Onay bekleyen kayıt yok" pendingModule={data.pending_module} />
      )}
    </section>
  );
}
```

`src/components/dashboard/RisksCard.tsx`:

```tsx
import type { components } from "@/lib/api/schema";

import { CardEmptyState } from "./CardEmptyState";
import "./dashboard.css";

type Placeholder = components["schemas"]["ListPlaceholder"];

export function RisksCard({ data }: { data: Placeholder }) {
  return (
    <section className="dash-card dash-list-card">
      <h2 className="dash-list-card__title">Risk &amp; Uyarılar</h2>
      {data.available && data.items.length > 0 ? (
        <ul className="dash-list">
          {data.items.map((item) => (
            <li key={item} className="dash-risk">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <CardEmptyState title="Uyarı yok" pendingModule={data.pending_module} />
      )}
    </section>
  );
}
```

`src/components/dashboard/DashboardView.tsx`:

```tsx
"use client";

import { useDashboardSummary } from "@/lib/api/hooks/useDashboardSummary";

import { KpiCard } from "./KpiCard";
import { PendingApprovalsCard } from "./PendingApprovalsCard";
import { PortfolioCard } from "./PortfolioCard";
import { ProjectGrid } from "./ProjectGrid";
import { RisksCard } from "./RisksCard";
import "./dashboard.css";

export function DashboardView() {
  const { data, isLoading, isError } = useDashboardSummary();

  if (isError) {
    return <p className="dash-message">Gösterge paneli yüklenemedi</p>;
  }
  if (isLoading || !data) {
    return <p className="dash-message">Yükleniyor…</p>;
  }

  return (
    <div className="dash">
      <p className="dash__breadcrumb">
        <span>{data.role_name} Görünümü</span>
        <span aria-hidden="true">·</span>
        <span>{data.active_project_count} Aktif Proje</span>
      </p>
      <h1 className="dash__title">Gösterge Paneli</h1>

      <div className="dash__top-row">
        <PortfolioCard metric={data.portfolio} />
        <KpiCard
          label="Tahsil Edilecek"
          emptyTitle="Henüz fatura verisi yok"
          metric={data.receivables}
        />
        <KpiCard
          label="Ortalama Marj"
          emptyTitle="Henüz marj hesabı yok"
          metric={data.average_margin}
        />
      </div>

      <ProjectGrid projects={data.projects} />

      <div className="dash__bottom-row">
        <PendingApprovalsCard data={data.pending_approvals} />
        <RisksCard data={data.risks} />
      </div>
    </div>
  );
}
```

`src/app/(app)/page.tsx` — tamamen değiştir:

```tsx
import { DashboardView } from "@/components/dashboard/DashboardView";

export default function DashboardPage() {
  return <DashboardView />;
}
```

`dashboard.css` sonuna ekle:

```css
.dash {
  animation: fadeUp 0.4s ease;
}
.dash__breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  line-height: 16px;
  color: var(--color-text-subtle);
  margin-bottom: 6px;
}
.dash__title {
  font-size: 26px;
  font-weight: 700;
  line-height: 32px;
  letter-spacing: -0.5px;
  color: var(--color-text);
  margin-bottom: 24px;
}
.dash__top-row {
  display: grid;
  grid-template-columns: 1fr 280px 280px;
  gap: 16px;
  margin-bottom: 16px;
}
.dash__bottom-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.dash-list-card {
  padding: 20px;
}
.dash-list-card__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  line-height: 18px;
  color: var(--color-text);
  margin-bottom: 16px;
}
.dash-list-card__badge {
  background: var(--color-danger);
  color: var(--color-surface);
  font-size: 10px;
  font-weight: 700;
  line-height: 14px;
  padding: 2px 7px;
  border-radius: 10px;
}
.dash-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.dash-list__row {
  padding: 10px 12px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 13px;
  line-height: 18px;
}
.dash-risk {
  padding: 12px;
  border-radius: 8px;
  border-left: 4px solid var(--color-warning);
  background: var(--color-surface-2);
  font-size: 13px;
  line-height: 18px;
}
.dash-message {
  font-size: 14px;
  line-height: 22px;
  color: var(--color-text-muted);
}
```

`fadeUp` keyframe'i `globals.css`'te tanımlı değilse oraya ekle — mockup'taki tanım:
`@keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`.

Eski dosyaları sil:

```bash
git rm "src/app/(app)/home.css" "src/app/(app)/page.test.tsx"
```

- [ ] **Adım 4: Testin geçtiğini doğrula**

Çalıştır: `pnpm test src/components/dashboard`
Beklenen: 14 PASS

- [ ] **Adım 5: Tam doğrulama**

```bash
pnpm test
pnpm lint
pnpm tsc --noEmit
pnpm build
```

Beklenen: hepsi temiz.

- [ ] **Adım 6: Commit**

```bash
git add -A src/components/dashboard "src/app/(app)"
git commit -m "feat: gosterge paneli ekrani"
```

---

## Task 6: Sidebar kalemi, e2e ve görsel regresyon

**Dosyalar:**
- Değiştir: `src/components/shell/nav-config.ts`, `src/components/shell/nav-config.test.ts`
- Oluştur: `e2e/dashboard.spec.ts`, `e2e/dashboard.visual.spec.ts`

**Arayüzler:**
- Tüketir: `NAV_GROUPS` (`src/components/shell/nav-config.ts`)
- Üretir: `/sirket-varliklari` nav kalemi (rota mevcut `[...slug]` catch-all'ına düşer)

- [ ] **Adım 1: Başarısız testi yaz**

`src/components/shell/nav-config.test.ts` sonuna ekle:

```ts
it("sirket varliklari kalemi bordro ile belge arsivi arasindadir", () => {
  const mali = NAV_GROUPS.find((g) => g.heading === "Sözleşme & Mali");
  const labels = mali!.items.map((i) => i.label);
  expect(labels.indexOf("Şirket Varlıkları")).toBe(labels.indexOf("Bordro") + 1);
  expect(labels.indexOf("Belge Arşivi")).toBe(labels.indexOf("Şirket Varlıkları") + 1);
});
```

- [ ] **Adım 2: Testin başarısız olduğunu doğrula**

Çalıştır: `pnpm test src/components/shell/nav-config.test.ts`
Beklenen: FAIL — kalem yok

- [ ] **Adım 3: Asgari uygulamayı yaz**

`src/components/shell/nav-config.ts` — "Sözleşme & Mali" grubunda `Bordro` ile
`Belge Arşivi` arasına ekle:

```ts
      { label: "Şirket Varlıkları", href: "/sirket-varliklari", Icon: BuildingIcon },
```

`BuildingIcon` zaten Projeler için içe aktarılmış durumda. Yeni SVG çizme; mevcut
ikon setinden yeniden kullan.

- [ ] **Adım 4: Testin geçtiğini doğrula**

Çalıştır: `pnpm test src/components/shell/nav-config.test.ts`
Beklenen: PASS

- [ ] **Adım 5: E2E ve görsel spec yaz**

Önce `e2e/` altındaki mevcut bir spec'i aç ve oturum açma yardımcısının gerçek adını
oku; aşağıdaki iskelette onu kullan (kendi giriş akışını yazma).

`e2e/dashboard.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("gosterge paneli yuklenir", async ({ page }) => {
  // Mevcut e2e spec'lerindeki oturum acma yardimcisini burada cagir.
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
  await expect(page.getByText(/Görünümü/)).toBeVisible();
});

test("sirket varliklari kalemi acilir", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Şirket Varlıkları" }).click();
  await expect(page).toHaveURL(/sirket-varliklari/);
});
```

`e2e/dashboard.visual.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("gosterge paneli gorsel", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
  await expect(page).toHaveScreenshot("dashboard.png", { fullPage: true });
});
```

- [ ] **Adım 6: Mockup karşılaştırması**

```bash
node scripts/render-mockup.mjs "projedesign/Ekran 1 - Gösterge Paneli.dc.html" 1440
```

Uygulamanın 1440px görüntüsüyle yan yana karşılaştır. Sapma bulursan ölçüyü mockup'ın
satır içi stilinden oku ve CSS'i düzelt. Onaylı sapmalar (Bütçe etiketi, Tamamlandı
rozeti, sıfır-proje kartı) **sapma değildir** — geri alma.

- [ ] **Adım 7: Doğrulama ve commit**

```bash
pnpm test
pnpm lint
pnpm tsc --noEmit
pnpm build
git add src/components/shell e2e
git commit -m "feat: sirket varliklari nav kalemi ve gosterge paneli e2e"
```

- [ ] **Adım 8: Baseline talimatını bildir**

macOS'ta PNG **üretme**. Kullanıcıya bildir: `visual-baselines.yml` workflow_dispatch
çalıştırılmalı → `linux-baselines` artifact indirilip `e2e/` altına kopyalanmalı →
ayrı commit. Push/merge/deploy kararı kullanıcınındır.

---

## Öz-inceleme

**Spec kapsamı:**

| Spec bölümü | Karşılayan task |
|---|---|
| §2 rota ve dosyalar | Task 3, 4, 5 |
| §3.1 sayfa ölçüleri | Task 5 |
| §3.2 kart temeli | Task 3 |
| §3.3 üst satır | Task 3, 5 |
| §3.4 proje ızgarası + durum renkleri | Task 4 |
| §3.5 alt satır | Task 5 |
| §4 boş durumlar + `pending_module` eşlemesi | Task 3 |
| §5 sayı biçimi | Task 2 |
| §6 bilinçli eklemeler | Task 4 (Bütçe etiketi, Tamamlandı, sıfır proje) |
| §7 sidebar | Task 6 |
| §8 testler | Task 3, 4, 5 (birim), Task 6 (e2e + görsel) |
| §9 kapsam dışı | Hiçbir task topbar seçici, sahte rozet veya tip rozeti eklemiyor |

Boşluk yok.

**Tip tutarlılığı:** `DashboardSummary` ve `DashboardProjectCard` Task 1'de dışa aktarılıp
Task 3-5'te aynı adla kullanılıyor. Bileşen prop adları (`metric`, `data`, `project`,
`projects`) tanımlandıkları task ile kullanıldıkları task arasında birebir eşleşiyor.
`data-testid="dash-approvals-badge"` Task 5'te hem bileşende hem testte aynı.
