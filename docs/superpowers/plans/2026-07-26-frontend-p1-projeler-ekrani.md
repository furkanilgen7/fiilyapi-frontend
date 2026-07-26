# P1 — Projeler ekranı: uygulama planı

> **Ajan işçiler için:** ZORUNLU ALT-SKILL: Bu planı task-by-task uygulamak için
> `superpowers:subagent-driven-development` (önerilen) veya `superpowers:executing-plans`
> kullanın. Adımlar takip için checkbox (`- [ ]`) söz dizimindedir.

**Hedef:** `/projeler` rotasını (şu an catch-all ComingSoon) mockup'a birebir Projeler ekranıyla değiştirmek: tip açıklama kartları, sayaçlı sekmeler, üç tip varyantlı proje kartları, mockup'sız "+ Yeni Proje" modalı.

**Mimari:** `page.tsx` → `ProjectsView` (istemci, `Suspense` içinde — `useSearchParams`) → `useProjects(filter)` (TanStack Query) → `backendClient.GET("/projects")` → BFF proxy. Kartlar `src/components/projects/` altında; `pending_module` eşlemesi `src/lib/pending-modules.ts`te tek kaynak (F6 `CardEmptyState` de oraya bağlanır).

**Teknoloji:** Next.js (App Router) · TanStack Query · openapi-fetch · Vitest + Testing Library · Playwright

**Spec:** `docs/superpowers/specs/2026-07-26-frontend-p1-projeler-ekrani-design.md`
**Mockup kanonu:** `projedesign/Ekran 4 - Projeler.dc.html`
**Önkoşul:** **B7/P1 backend tamamlanmış olmalı** — `openapi/openapi.json` yeni `GET/POST /projects` şemasını içermeli (`ProjectListResponse` + `counts`). Task 1 bunu doğrular; yoksa dur ve bildir.

## Küresel kısıtlar

- **Mockup birebir.** Ölçüler mockup'ın satır içi stillerinden okunur, göz kararı yok. UI'a başlamadan önce `node scripts/render-mockup.mjs "projedesign/Ekran 4 - Projeler.dc.html" 1440` ile render alıp karşılaştır.
- **Çıplak hex yasak.** Tüm renkler `tokens.css` değişkenleri üzerinden; eksik token'lar Task 2'de eklenir (spec §5.2).
- Onaylı normalizasyonlar (geri düzeltilmeyecek, gerekçeler spec §7): şerit/çubuk rengi tipten gelir, yer tutucu KPI hücreleri `—`, ünite/hissedar/marj/çip verileri basılmaz, kendi yatırım çubuk etiketi "İnşaat İlerlemesi", kırmızı bitiş tarihi yok, tip rozeti tüm kartlarda, tek para biçimi `formatCompactCurrency`.
- Gezinme (spec §9): **hiçbir kart tıklanmaz** — link/onClick/cursor:pointer verilmez. Sahte hedef yasak.
- **Görsel baseline'lar yalnızca Linux'ta üretilir.** `visual-baselines.yml` (workflow_dispatch) → `linux-baselines` artifact → `gh run download` → `e2e/` altına kopyala → commit. macOS'ta PNG üretme.
- Paket yöneticisi `pnpm`. Test: `pnpm test`, lint: `pnpm lint`, tip: `pnpm typecheck`. **Push yok** — push/merge/deploy kararı kullanıcınındır.
- Metinler Türkçe, sayı biçimi `tr-TR`. Commit başlıkları İngilizce `<type>: <desc>`, ASCII.

## Dosya yapısı

| Dosya | Sorumluluk |
|---|---|
| `openapi/openapi.json` (değişir) | B7/P1'den kopyalanan şema |
| `src/lib/api/schema.d.ts` (üretilir) | `pnpm gen:api` çıktısı |
| `src/lib/api/hooks/useProjects.ts` (değişir) | `{ counts, items }` yanıtı + filtre parametresi |
| `src/lib/api/hooks/useProjectMutations.ts` | `useCreateProject` |
| `src/components/settings/ProjectAccessModal.tsx` (değişir) | `.data` → `.data?.items` migrasyonu |
| `src/components/settings/users/UsersScreen.tsx` (değişir) | aynı migrasyon |
| `src/styles/tokens.css` (değişir) | spec §5.2 token'ları |
| `src/lib/format.ts` (değişir) | + `formatMonthYear` |
| `src/lib/pending-modules.ts` | ortak `pendingModuleLabel` |
| `src/components/dashboard/CardEmptyState.tsx` (değişir) | yerel eşleme → `pendingModuleLabel` |
| `src/components/projects/tabs.ts` | sekme sabitleri + saf yardımcılar |
| `src/components/projects/TypeLegend.tsx` | 3 tip açıklama kartı |
| `src/components/projects/ProjectTabs.tsx` | 5 sekme + sayaçlar |
| `src/components/projects/ShareBar.tsx` | kat karşılığı pay çubuğu |
| `src/components/projects/ProjectCard.tsx` | tip varyantlı kart |
| `src/components/projects/ProjectFormModal.tsx` | "+ Yeni Proje" (mockup'sız, Ayarlar kanonu) |
| `src/components/projects/ProjectsView.tsx` | düzen + veri bağlama + URL sekme durumu |
| `src/components/projects/projects.css` | tüm ölçüler |
| `src/app/(app)/projeler/page.tsx` | `ProjectsView`'u sarar |
| `e2e/mock-backend.ts` (değişir) | yeni `/projects` şekli + `projects` modülü |
| `e2e/projects.spec.ts`, `e2e/projects-visual.spec.ts` | E2E + görsel |

---

## Task 1: Şema, sorgu/mutasyon hook'ları ve tüketici migrasyonu

**Dosyalar:**
- Değiştir: `openapi/openapi.json`, `src/lib/api/hooks/useProjects.ts`,
  `src/components/settings/ProjectAccessModal.tsx`, `src/components/settings/users/UsersScreen.tsx`
- Üret: `src/lib/api/schema.d.ts`
- Oluştur: `src/lib/api/hooks/useProjectMutations.ts`
- Test: `src/lib/api/hooks/useProjects.test.tsx`

**Arayüzler (Task 2-7 bu adları birebir kullanır):**
- `useProjects(filter?: ProjectListFilter): UseQueryResult<ProjectListResponse, Error>`
- `useCreateProject(): UseMutationResult<ProjectListItem, Error, ProjectCreateRequest>`
- `export type ProjectListResponse = components["schemas"]["ProjectListResponse"]`
- `export type ProjectListItem = components["schemas"]["ProjectResponse"]`
- `export type ProjectCounts = ProjectListResponse["counts"]`
- `export type ProjectTypeFilter = "taahhut" | "kendi_yatirim" | "kat_karsiligi"`
- `export interface ProjectListFilter { type?: ProjectTypeFilter; status?: "completed" }`

- [ ] **Adım 1: Şemayı üret ve doğrula**

```bash
pnpm gen:api
grep -c "ProjectListResponse" src/lib/api/schema.d.ts
grep -c "project_type" src/lib/api/schema.d.ts
```

Beklenen: her ikisi en az 1. Çıkmazsa B7/P1 backend tamamlanmamıştır — **dur ve bildir**.
Item şemasının adı `ProjectResponse` değilse (ör. `ProjectListItem`), gerçek adı
`schema.d.ts`ten oku ve aşağıdaki tip takma adlarında onu kullan — uydurma.

- [ ] **Adım 2: Başarısız testi yaz**

`src/lib/api/hooks/useProjects.test.tsx` (yeni dosya):

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useProjects } from "./useProjects";
import { backendClient } from "@/lib/api/client";

vi.mock("@/lib/api/client", () => ({ backendClient: { GET: vi.fn() } }));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const RESPONSE = {
  counts: { all: 4, taahhut: 2, kendi_yatirim: 1, kat_karsiligi: 1, completed: 1 },
  items: [],
};

describe("useProjects", () => {
  beforeEach(() => vi.clearAllMocks());

  it("filtresiz istekte query bos gider", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: RESPONSE, error: undefined, response: new Response(),
    } as never);

    const { result } = renderHook(() => useProjects(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.counts.all).toBe(4);
    expect(backendClient.GET).toHaveBeenCalledWith("/projects", { params: { query: {} } });
  });

  it("tip ve durum filtrelerini query parametresine cevirir", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: RESPONSE, error: undefined, response: new Response(),
    } as never);

    const { result } = renderHook(() => useProjects({ type: "taahhut" }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/projects", {
      params: { query: { type: "taahhut" } },
    });
  });
});
```

- [ ] **Adım 3: Testin başarısız olduğunu doğrula**

Çalıştır: `pnpm test src/lib/api/hooks/useProjects.test.tsx`
Beklenen: FAIL — mevcut `useProjects` filtre almıyor ve düz dizi bekliyor

- [ ] **Adım 4: Hook'ları yaz**

`src/lib/api/hooks/useProjects.ts` — tamamen değiştir:

```ts
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type { components } from "@/lib/api/schema";
import type { ProjectAccessResponse } from "@/lib/api/models";

export type ProjectListResponse = components["schemas"]["ProjectListResponse"];
export type ProjectListItem = components["schemas"]["ProjectResponse"];
export type ProjectCounts = ProjectListResponse["counts"];
export type ProjectTypeFilter = "taahhut" | "kendi_yatirim" | "kat_karsiligi";

export interface ProjectListFilter {
  type?: ProjectTypeFilter;
  status?: "completed";
}

export const PROJECTS_QUERY_KEY = "projects";
export const PROJECT_ACCESS_QUERY_KEY = "project-access";

export function useProjects(
  filter: ProjectListFilter = {},
): UseQueryResult<ProjectListResponse, Error> {
  return useQuery({
    queryKey: [PROJECTS_QUERY_KEY, filter.type ?? null, filter.status ?? null],
    queryFn: async () =>
      unwrap(
        await backendClient.GET("/projects", {
          params: {
            query: {
              ...(filter.type ? { type: filter.type } : {}),
              ...(filter.status ? { status: filter.status } : {}),
            },
          },
        }),
      ),
  });
}

export function useProjectAccess(userId: string): UseQueryResult<ProjectAccessResponse, Error> {
  return useQuery({
    queryKey: [PROJECT_ACCESS_QUERY_KEY, userId],
    queryFn: async () =>
      unwrap(
        await backendClient.GET("/users/{user_id}/project-access", {
          params: { path: { user_id: userId } },
        }),
      ),
  });
}
```

`src/lib/api/hooks/useProjectMutations.ts` (yeni dosya):

```ts
import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type { components } from "@/lib/api/schema";
import { PROJECTS_QUERY_KEY, type ProjectListItem } from "./useProjects";

export type ProjectCreateRequest = components["schemas"]["ProjectCreateRequest"];

export function useCreateProject(): UseMutationResult<ProjectListItem, Error, ProjectCreateRequest> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body) => unwrap(await backendClient.POST("/projects", { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [PROJECTS_QUERY_KEY] }),
  });
}
```

`ProjectCreateRequest` şemada yoksa gerçek istek gövdesi şemasının adını
`schema.d.ts`ten oku ve onu kullan.

- [ ] **Adım 5: Mevcut tüketicileri geçir**

`src/components/settings/ProjectAccessModal.tsx` satır 64:

```tsx
// eski
{projectsQuery.data?.map((project) => (
// yeni
{projectsQuery.data?.items.map((project) => (
```

`src/components/settings/users/UsersScreen.tsx` satır 181:

```tsx
// eski
<ProjectAccessCell userId={user.id} projects={projectsQuery.data} />
// yeni
<ProjectAccessCell userId={user.id} projects={projectsQuery.data?.items} />
```

`src/lib/api/models.ts`teki `ProjectResponse` takma adı şema adı değişmediyse aynen
kalır; `pnpm typecheck` kırılırsa gerçek şema adına güncelle. Ayarlar testleri
`useProjects`u mock'luyorsa kontrol et:

```bash
grep -rn "useProjects" src/components/settings --include="*.test.tsx"
```

Dizi dönen mock'ları `{ counts: { all: N, taahhut: 0, kendi_yatirim: 0, kat_karsiligi: 0, completed: 0 }, items: [/* eski dizi */] }` şekline çevir.

- [ ] **Adım 6: Doğrula ve commit**

```bash
pnpm test src/lib/api/hooks/useProjects.test.tsx
pnpm test src/components/settings
pnpm typecheck
git add openapi/openapi.json src/lib/api src/components/settings
git commit -m "feat: projects list schema, filtered query hook and create mutation"
```

---

## Task 2: Token'lar, tarih biçimleyici ve ortak pending_module eşlemesi

**Dosyalar:**
- Değiştir: `src/styles/tokens.css`, `src/lib/format.ts`, `src/lib/format.test.ts`,
  `src/components/dashboard/CardEmptyState.tsx`
- Oluştur: `src/lib/pending-modules.ts`
- Test: `src/lib/pending-modules.test.ts`

**Arayüzler:**
- Üretir: `pendingModuleLabel(key: string): string`, `formatMonthYear(iso: string): string`,
  spec §5.2 token'ları — Task 3-6 bunları kullanır.

- [ ] **Adım 1: Başarısız testleri yaz**

`src/lib/pending-modules.test.ts`:

```ts
import { describe, it, expect } from "vitest";

import { pendingModuleLabel } from "./pending-modules";

describe("pendingModuleLabel", () => {
  it("F6 anahtarlarini esler", () => {
    expect(pendingModuleLabel("progress_payments")).toBe("Hakediş modülüyle birlikte gelir");
    expect(pendingModuleLabel("invoicing")).toBe("Fatura yönetimiyle birlikte gelir");
    expect(pendingModuleLabel("approvals")).toBe("Onay kutusuyla birlikte gelir");
    expect(pendingModuleLabel("inventory")).toBe("Stok ve saha modülleriyle birlikte gelir");
  });

  it("P1 anahtarlarini esler", () => {
    expect(pendingModuleLabel("timesheet")).toBe("Puantaj modülüyle birlikte gelir");
    expect(pendingModuleLabel("subcontracts")).toBe("Taşeron sözleşmeleriyle birlikte gelir");
    expect(pendingModuleLabel("units")).toBe("Ünite satış modülüyle birlikte gelir");
    expect(pendingModuleLabel("project_costs")).toBe("Maliyet takibiyle birlikte gelir");
  });

  it("bilinmeyen anahtarda genel metin doner", () => {
    expect(pendingModuleLabel("bilinmeyen")).toBe("İlgili modülle birlikte gelir");
  });
});
```

`src/lib/format.test.ts` sonuna ekle:

```ts
describe("formatMonthYear", () => {
  it("tr-TR kisa ay adiyla basar", () => {
    expect(formatMonthYear("2025-03-15")).toBe("Mar 2025");
  });
  it("aralik ayini Ara olarak basar", () => {
    expect(formatMonthYear("2026-12-01")).toBe("Ara 2026");
  });
});
```

(`formatMonthYear`u dosyanın başındaki import'a ekle.)

- [ ] **Adım 2: Testlerin başarısız olduğunu doğrula**

Çalıştır: `pnpm test src/lib/pending-modules.test.ts src/lib/format.test.ts`
Beklenen: FAIL — modül/fonksiyon yok

- [ ] **Adım 3: Uygula**

`src/lib/pending-modules.ts`:

```ts
// Backend pending_module anahtari doner; kullaniciya gosterilen metin frontend'in isi.
// Tek kaynak: hem gosterge paneli (F6) hem Projeler (P1) bunu kullanir (spec §7.2).
const MODULE_LABELS: Record<string, string> = {
  progress_payments: "Hakediş modülüyle birlikte gelir",
  invoicing: "Fatura yönetimiyle birlikte gelir",
  approvals: "Onay kutusuyla birlikte gelir",
  inventory: "Stok ve saha modülleriyle birlikte gelir",
  timesheet: "Puantaj modülüyle birlikte gelir",
  subcontracts: "Taşeron sözleşmeleriyle birlikte gelir",
  units: "Ünite satış modülüyle birlikte gelir",
  project_costs: "Maliyet takibiyle birlikte gelir",
};

const FALLBACK_LABEL = "İlgili modülle birlikte gelir";

export function pendingModuleLabel(key: string): string {
  return MODULE_LABELS[key] ?? FALLBACK_LABEL;
}
```

`src/components/dashboard/CardEmptyState.tsx` — yerel `MODULE_LABELS`/`FALLBACK_LABEL`
sabitlerini sil, ortak fonksiyona bağla:

```tsx
import { pendingModuleLabel } from "@/lib/pending-modules";

import "./dashboard.css";

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
      <p className="dash-empty__hint">{pendingModuleLabel(pendingModule)}</p>
    </div>
  );
}
```

`src/lib/format.ts` sonuna ekle:

```ts
/** Kart tarihleri: mockup'taki "Mar 2025" gosterimi. */
export function formatMonthYear(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, { month: "short", year: "numeric" }).format(
    new Date(iso),
  );
}
```

`src/styles/tokens.css` `:root` bloğunun sonuna ekle (spec §5.2 — mevcut
`--color-accent-purple-soft: #ede9fe` FARKLI bir tondur, yeniden kullanma):

```css
  /* P1 Projeler — tip aileleri (mockup Ekran 4) */
  --color-accent-purple-deep: #6d28d9; /* kendi yatirim gradyan koyu ucu + sayi metni */
  --color-accent-purple-tint: #f5f3ff; /* aciklama karti zemini */
  --color-accent-purple-line: #ddd6fe; /* aciklama + proje karti kenarligi */
  --color-accent-teal-tint: #f0fdfa; /* aciklama karti zemini */
  --color-accent-teal-line: #99f6e4; /* aciklama + proje karti kenarligi */
  --color-accent-teal-light: #5eead4; /* teal gradyan acik ucu */
  --shadow-card-purple: 0 2px 8px rgba(139, 92, 246, 0.12);
  --shadow-card-teal: 0 2px 8px rgba(15, 118, 110, 0.12);
  --gradient-type-taahhut: linear-gradient(90deg, var(--color-primary), var(--color-avatar-blue-end));
  --gradient-type-kendi-yatirim: linear-gradient(90deg, var(--color-accent-purple-deep), var(--color-accent-purple-grad-end));
  --gradient-type-kat-karsiligi: linear-gradient(90deg, var(--color-accent-teal-start), var(--color-accent-teal-light));
```

- [ ] **Adım 4: Doğrula ve commit**

```bash
pnpm test src/lib src/components/dashboard
pnpm typecheck
git add src/styles/tokens.css src/lib/format.ts src/lib/format.test.ts src/lib/pending-modules.ts src/lib/pending-modules.test.ts src/components/dashboard/CardEmptyState.tsx
git commit -m "feat: project type tokens, month formatter and shared pending-module labels"
```

Beklenen: `CardEmptyState` mevcut testleri dahil hepsi PASS (davranış değişmedi).

---

## Task 3: Sekme yardımcıları, sekme barı ve tip açıklama kartları

**Dosyalar:**
- Oluştur: `src/components/projects/tabs.ts`, `ProjectTabs.tsx`, `TypeLegend.tsx`, `projects.css`
- Test: `src/components/projects/tabs.test.ts`, `ProjectTabs.test.tsx`, `TypeLegend.test.tsx`

**Arayüzler:**
- Tüketir: `ProjectCounts`, `ProjectListFilter` (Task 1)
- Üretir: `ProjectTab`, `PROJECT_TABS`, `parseProjectTab`, `tabToFilter`,
  `<ProjectTabs active counts onChange />`, `<TypeLegend counts />` — Task 6 bunları kullanır.

- [ ] **Adım 1: Başarısız testleri yaz**

`src/components/projects/tabs.test.ts`:

```ts
import { describe, it, expect } from "vitest";

import { parseProjectTab, tabToFilter, PROJECT_TABS } from "./tabs";

describe("parseProjectTab", () => {
  it("gecerli anahtari doner", () => {
    expect(parseProjectTab("kat_karsiligi")).toBe("kat_karsiligi");
  });
  it("bos ve gecersiz degerde all doner", () => {
    expect(parseProjectTab(null)).toBe("all");
    expect(parseProjectTab("sacma")).toBe("all");
  });
});

describe("tabToFilter", () => {
  it("all filtresizdir", () => {
    expect(tabToFilter("all")).toEqual({});
  });
  it("tip sekmeleri type filtresine gider", () => {
    expect(tabToFilter("taahhut")).toEqual({ type: "taahhut" });
    expect(tabToFilter("kendi_yatirim")).toEqual({ type: "kendi_yatirim" });
  });
  it("tamamlanan status filtresine gider", () => {
    expect(tabToFilter("completed")).toEqual({ status: "completed" });
  });
});

it("bes sekme mockup sirasindadir", () => {
  expect(PROJECT_TABS.map((t) => t.label)).toEqual([
    "Tümü", "Taahhüt", "Kendi Yatırım", "Kat Karşılığı", "Tamamlanan",
  ]);
});
```

`src/components/projects/ProjectTabs.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { ProjectTabs } from "./ProjectTabs";

const counts = { all: 8, taahhut: 4, kendi_yatirim: 2, kat_karsiligi: 2, completed: 2 };

describe("ProjectTabs", () => {
  it("sayaclari basar ve aktif sekmeyi isaretler", () => {
    render(<ProjectTabs active="taahhut" counts={counts} onChange={() => {}} />);
    expect(screen.getByRole("tab", { name: "Tümü (8)" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Taahhüt (4)" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Tamamlanan (2)" })).toHaveAttribute("aria-selected", "false");
  });

  it("tiklanan sekmeyi bildirir", () => {
    const onChange = vi.fn();
    render(<ProjectTabs active="all" counts={counts} onChange={onChange} />);
    fireEvent.click(screen.getByRole("tab", { name: "Kat Karşılığı (2)" }));
    expect(onChange).toHaveBeenCalledWith("kat_karsiligi");
  });
});
```

`src/components/projects/TypeLegend.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { TypeLegend } from "./TypeLegend";

const counts = { all: 8, taahhut: 4, kendi_yatirim: 2, kat_karsiligi: 2, completed: 2 };

describe("TypeLegend", () => {
  it("uc tip kartini gercek sayaclarla basar", () => {
    render(<TypeLegend counts={counts} />);
    expect(screen.getByText("TAAHHÜT")).toBeInTheDocument();
    expect(screen.getByText("KENDİ YATIRIM")).toBeInTheDocument();
    expect(screen.getByText("KAT KARŞILIĞI")).toBeInTheDocument();
    expect(screen.getByText("4 proje")).toBeInTheDocument();
    expect(screen.getAllByText("2 proje")).toHaveLength(2);
  });

  it("aciklama metinlerini mockuptan aynen basar", () => {
    render(<TypeLegend counts={counts} />);
    expect(screen.getByText(/İşveren adına yapılan işler/)).toBeInTheDocument();
    expect(screen.getByText(/Arsa bize ait, işveren yok/)).toBeInTheDocument();
    expect(screen.getByText(/ünite payı/)).toBeInTheDocument();
  });
});
```

- [ ] **Adım 2: Testlerin başarısız olduğunu doğrula**

Çalıştır: `pnpm test src/components/projects`
Beklenen: FAIL — modüller yok

- [ ] **Adım 3: Uygula**

`src/components/projects/tabs.ts`:

```ts
import type { ProjectCounts, ProjectListFilter } from "@/lib/api/hooks/useProjects";

export type ProjectTab = "all" | "taahhut" | "kendi_yatirim" | "kat_karsiligi" | "completed";

export const PROJECT_TABS: Array<{ key: ProjectTab; label: string }> = [
  { key: "all", label: "Tümü" },
  { key: "taahhut", label: "Taahhüt" },
  { key: "kendi_yatirim", label: "Kendi Yatırım" },
  { key: "kat_karsiligi", label: "Kat Karşılığı" },
  { key: "completed", label: "Tamamlanan" },
];

export function parseProjectTab(value: string | null): ProjectTab {
  return PROJECT_TABS.some((tab) => tab.key === value) ? (value as ProjectTab) : "all";
}

export function tabToFilter(tab: ProjectTab): ProjectListFilter {
  if (tab === "all") return {};
  if (tab === "completed") return { status: "completed" };
  return { type: tab };
}

export function tabCount(tab: ProjectTab, counts: ProjectCounts): number {
  return counts[tab];
}
```

`src/components/projects/ProjectTabs.tsx`:

```tsx
"use client";

import { cx } from "@/lib/cx";
import type { ProjectCounts } from "@/lib/api/hooks/useProjects";

import { PROJECT_TABS, tabCount, type ProjectTab } from "./tabs";
import "./projects.css";

interface ProjectTabsProps {
  active: ProjectTab;
  counts: ProjectCounts;
  onChange: (tab: ProjectTab) => void;
}

// Sayaclar daima tam `counts`tan basilir — aktif filtreden etkilenmez (spec §4.3).
export function ProjectTabs({ active, counts, onChange }: ProjectTabsProps) {
  return (
    <div className="prj-tabs" role="tablist" aria-label="Proje sekmeleri">
      {PROJECT_TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={tab.key === active}
          className={cx("prj-tabs__tab", tab.key === active && "prj-tabs__tab--active")}
          onClick={() => onChange(tab.key)}
        >
          {tab.label} ({tabCount(tab.key, counts)})
        </button>
      ))}
    </div>
  );
}
```

`src/components/projects/TypeLegend.tsx`:

```tsx
import type { ReactNode } from "react";

import type { ProjectCounts } from "@/lib/api/hooks/useProjects";

import "./projects.css";

// Metinler mockup satir 75/82/89'dan aynen (spec §4.2).
const LEGEND: Array<{
  type: "taahhut" | "kendi_yatirim" | "kat_karsiligi";
  badge: string;
  desc: ReactNode;
}> = [
  {
    type: "taahhut",
    badge: "TAAHHÜT",
    desc: (
      <>İşveren adına yapılan işler. Gelir <strong>hakediş</strong> ile alınır, poz listesi işveren sözleşmesinden gelir.</>
    ),
  },
  {
    type: "kendi_yatirim",
    badge: "KENDİ YATIRIM",
    desc: (
      <>Arsa bize ait, işveren yok. Gelir <strong>daire/dükkan satışından</strong> gelir, kâr satış−maliyet farkıdır.</>
    ),
  },
  {
    type: "kat_karsiligi",
    badge: "KAT KARŞILIĞI",
    desc: (
      <>Arsa sahibinin arsasına inşaat, karşılığında <strong>ünite payı</strong> alırız. Arsa maliyeti yok, kendi payımızı satarız.</>
    ),
  },
];

export function TypeLegend({ counts }: { counts: ProjectCounts }) {
  return (
    <div className="prj-legend">
      {LEGEND.map((item) => (
        <section key={item.type} className={`prj-legend__card prj-legend__card--${item.type}`}>
          <div className="prj-legend__head">
            <span className="prj-type-badge prj-type-badge--legend">{item.badge}</span>
            <span className="prj-legend__count">{counts[item.type]} proje</span>
          </div>
          <p className="prj-legend__desc">{item.desc}</p>
        </section>
      ))}
    </div>
  );
}
```

`src/components/projects/projects.css` (yeni dosya; ölçüler mockup satır 62-100'den):

```css
/* Sayfa iskeleti */
.prj {
  animation: var(--anim-fade-up);
}
.prj__breadcrumb {
  font-size: 12px;
  color: var(--color-text-subtle);
  margin-bottom: 6px;
}
.prj__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}
.prj__title {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.5px;
  color: var(--color-text);
}
.prj__new-btn {
  background: var(--color-primary);
  color: var(--color-on-brand);
  border: none;
  padding: 9px 18px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.prj__new-btn:hover {
  background: var(--color-primary-hover);
}
.prj-message {
  font-size: 14px;
  color: var(--color-text-muted);
}

/* Tip aciklama kartlari (mockup satir 69-91) */
.prj-legend {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 14px;
  margin-bottom: 20px;
}
.prj-legend__card {
  border-radius: 12px;
  padding: 14px 16px;
  border: 1px solid transparent;
}
.prj-legend__card--taahhut {
  background: var(--color-nav-active-bg);
  border-color: var(--color-primary-ring);
}
.prj-legend__card--kendi_yatirim {
  background: var(--color-accent-purple-tint);
  border-color: var(--color-accent-purple-line);
}
.prj-legend__card--kat_karsiligi {
  background: var(--color-accent-teal-tint);
  border-color: var(--color-accent-teal-line);
}
.prj-legend__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.prj-legend__count {
  font-size: 13px;
  font-weight: 600;
}
.prj-legend__card--taahhut .prj-legend__count {
  color: var(--color-primary-hover);
}
.prj-legend__card--kendi_yatirim .prj-legend__count {
  color: var(--color-accent-purple-deep);
}
.prj-legend__card--kat_karsiligi .prj-legend__count {
  color: var(--color-accent-teal-start);
}
.prj-legend__desc {
  font-size: 12px;
  line-height: 1.6;
}
.prj-legend__card--taahhut .prj-legend__desc {
  color: var(--color-primary-light);
}
.prj-legend__card--kendi_yatirim .prj-legend__desc {
  color: var(--color-accent-purple-grad-start);
}
.prj-legend__card--kat_karsiligi .prj-legend__desc {
  color: var(--color-accent-teal-end);
}

/* Tip rozeti — legend 10px, kart 9px (mockup satir 72 / 112) */
.prj-type-badge {
  color: var(--color-on-brand);
  font-weight: 700;
  text-transform: uppercase;
}
.prj-type-badge--legend {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 8px;
}
.prj-type-badge--card {
  display: inline-block;
  font-size: 9px;
  padding: 2px 7px;
  border-radius: 7px;
  margin-bottom: 4px;
}
.prj-legend__card--taahhut .prj-type-badge,
.prj-card--taahhut .prj-type-badge {
  background: var(--color-primary);
}
.prj-legend__card--kendi_yatirim .prj-type-badge,
.prj-card--kendi_yatirim .prj-type-badge {
  background: var(--color-accent-purple-grad-start);
}
.prj-legend__card--kat_karsiligi .prj-type-badge,
.prj-card--kat_karsiligi .prj-type-badge {
  background: var(--color-accent-teal-start);
}

/* Sekme bari (mockup satir 94-100) */
.prj-tabs {
  display: flex;
  gap: 4px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 4px;
  width: fit-content;
  margin-bottom: 24px;
}
.prj-tabs__tab {
  padding: 7px 18px;
  font-size: 13px;
  color: var(--color-text-muted);
  background: transparent;
  border: none;
  border-radius: 7px;
  cursor: pointer;
}
.prj-tabs__tab--active {
  font-weight: 600;
  color: var(--color-primary);
  background: var(--color-nav-active-bg);
}
```

- [ ] **Adım 4: Doğrula ve commit**

```bash
pnpm test src/components/projects
pnpm typecheck
git add src/components/projects
git commit -m "feat: project tabs, type legend and tab helpers"
```

Beklenen: 9 PASS.

---

## Task 4: Proje kartı ve pay çubuğu

**Dosyalar:**
- Oluştur: `src/components/projects/ProjectCard.tsx`, `ShareBar.tsx`
- Değiştir: `src/components/projects/projects.css`
- Test: `src/components/projects/ProjectCard.test.tsx`

**Arayüzler:**
- Tüketir: `ProjectListItem` (Task 1), `formatCompactCurrency`/`formatPercent`/`formatMonthYear`,
  `pendingModuleLabel` (Task 2)
- Üretir: `<ProjectCard project />`, `<ShareBar share />` — Task 6 `ProjectCard`'ı kullanır.

- [ ] **Adım 1: Başarısız testi yaz**

`src/components/projects/ProjectCard.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { ProjectCard } from "./ProjectCard";

const PENDING = (m: string) => ({ available: false, value: null, pending_module: m });

const base = {
  id: "11111111-1111-1111-1111-111111111111",
  code: "GK-A",
  name: "Güneşkent A-Blok",
  status: "active" as const,
  category: "Konut",
  city: "Ankara",
  employer_name: "Güneşkent A.Ş.",
  contract_no: "SZL-2025-01",
  contract_amount: "11200000.00",
  start_date: "2025-03-01",
  end_date: "2026-12-01",
  budget: "1000000.00",
  progress_pct: "75.00",
  investment: null,
  land_share: null,
  spent: PENDING("project_costs"),
  headcount: PENDING("timesheet"),
  subcontractor_count: PENDING("subcontracts"),
  sales: PENDING("units"),
  profit: PENDING("progress_payments"),
};

describe("ProjectCard — taahhut", () => {
  it("sozlesme bedeli, tarihler ve yer tutucu harcanan ile basar", () => {
    render(<ProjectCard project={{ ...base, project_type: "taahhut" }} />);
    expect(screen.getByText("TAAHHÜT")).toBeInTheDocument();
    expect(screen.getByText("Güneşkent A-Blok")).toBeInTheDocument();
    expect(screen.getByText("Konut · Ankara · İşveren: Güneşkent A.Ş.")).toBeInTheDocument();
    expect(screen.getByText("Aktif")).toBeInTheDocument();
    expect(screen.getByText("Sözleşme Bedeli")).toBeInTheDocument();
    expect(screen.getByText("₺ 11,2M")).toBeInTheDocument();
    expect(screen.getByText("Mar 2025")).toBeInTheDocument();
    expect(screen.getByText("Ara 2026")).toBeInTheDocument();
    expect(screen.getByTitle("Maliyet takibiyle birlikte gelir")).toHaveTextContent("—");
    expect(screen.getByText("Fiziksel İlerleme")).toBeInTheDocument();
    expect(screen.getByText("%75")).toBeInTheDocument();
  });

  it("tiklanabilir degildir (spec §9)", () => {
    render(<ProjectCard project={{ ...base, project_type: "taahhut" }} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("tamamlanmis kart iki KPI hucresine iner", () => {
    render(
      <ProjectCard
        project={{ ...base, project_type: "taahhut", status: "completed", progress_pct: "100.00" }}
      />,
    );
    expect(screen.getByText("Tamamlandı")).toBeInTheDocument();
    expect(screen.getByText("Final Hakediş")).toBeInTheDocument();
    expect(screen.getByTitle("Hakediş modülüyle birlikte gelir")).toHaveTextContent("—");
    expect(screen.queryByText("Başlangıç")).not.toBeInTheDocument();
    expect(screen.getByText("%100")).toBeInTheDocument();
  });
});

describe("ProjectCard — kendi yatirim", () => {
  it("satis hedefi gercek, kalan KPI'lar yer tutucudur", () => {
    render(
      <ProjectCard
        project={{
          ...base,
          project_type: "kendi_yatirim",
          name: "Yeşilvadi Rezidans",
          employer_name: null,
          investment: { sales_target: "48200000.00", land_cost: "5000000.00" },
        }}
      />,
    );
    expect(screen.getByText("KENDİ YATIRIM")).toBeInTheDocument();
    expect(screen.getByText("Konut · Ankara")).toBeInTheDocument();
    expect(screen.getByText("Satış Hedefi")).toBeInTheDocument();
    expect(screen.getByText("₺ 48,2M")).toBeInTheDocument();
    expect(screen.getByTitle("Ünite satış modülüyle birlikte gelir")).toHaveTextContent("—");
    // Mockup "Satış Oranı" der; units modulu gelene kadar durust etiket (spec §7.5)
    expect(screen.getByText("İnşaat İlerlemesi")).toBeInTheDocument();
  });
});

describe("ProjectCard — kat karsiligi", () => {
  it("pay cubugu gercek yuzdelerle, arsa maliyeti sifir basar", () => {
    render(
      <ProjectCard
        project={{
          ...base,
          project_type: "kat_karsiligi",
          name: "Bahçelievler Konut",
          employer_name: null,
          land_share: { landowner_name: "Yılmaz Ailesi", our_share_pct: "55.00", owner_share_pct: "45.00" },
        }}
      />,
    );
    expect(screen.getByText("KAT KARŞILIĞI")).toBeInTheDocument();
    expect(screen.getByText("Konut · Ankara · Arsa Sahibi: Yılmaz Ailesi")).toBeInTheDocument();
    expect(screen.getByText("Biz %55")).toBeInTheDocument();
    expect(screen.getByText("Arsa %45")).toBeInTheDocument();
    expect(screen.getByText("Arsa Maliyeti")).toBeInTheDocument();
    expect(screen.getByText("₺ 0")).toBeInTheDocument();
    expect(screen.getByText("Kendi Pay Değeri")).toBeInTheDocument();
    expect(screen.getByTitle("Ünite satış modülüyle birlikte gelir")).toHaveTextContent("—");
  });
});
```

`land_share` şemasında ek zorunlu alanlar varsa (`...` sözleşmede açık uçlu) fixture'a
şemadaki gerçek adlarla ekle — `pnpm typecheck` söyler.

- [ ] **Adım 2: Testin başarısız olduğunu doğrula**

Çalıştır: `pnpm test src/components/projects/ProjectCard.test.tsx`
Beklenen: FAIL — modül yok

- [ ] **Adım 3: Uygula**

`src/components/projects/ShareBar.tsx`:

```tsx
import type { ProjectListItem } from "@/lib/api/hooks/useProjects";
import { formatPercent } from "@/lib/format";

import "./projects.css";

type LandShare = NonNullable<ProjectListItem["land_share"]>;

// Mockup satir 147-150. Unite sayilari (`· 23 ünite`) units modulune bagli — basilmaz (spec §7.4).
export function ShareBar({ share }: { share: LandShare }) {
  return (
    <div className="prj-share">
      <div className="prj-share__ours" style={{ width: `${Number(share.our_share_pct)}%` }}>
        Biz {formatPercent(share.our_share_pct)}
      </div>
      <div className="prj-share__owner" style={{ width: `${Number(share.owner_share_pct)}%` }}>
        Arsa {formatPercent(share.owner_share_pct)}
      </div>
    </div>
  );
}
```

`src/components/projects/ProjectCard.tsx`:

```tsx
import type { ReactNode } from "react";

import { cx } from "@/lib/cx";
import type { ProjectListItem } from "@/lib/api/hooks/useProjects";
import { formatCompactCurrency, formatMonthYear, formatPercent } from "@/lib/format";
import { pendingModuleLabel } from "@/lib/pending-modules";

import { ShareBar } from "./ShareBar";
import "./projects.css";

type Project = ProjectListItem;
type Metric = Project["spent"];

const TYPE_LABELS: Record<Project["project_type"], string> = {
  taahhut: "TAAHHÜT",
  kendi_yatirim: "KENDİ YATIRIM",
  kat_karsiligi: "KAT KARŞILIĞI",
};

const STATUS_LABELS: Record<Project["status"], string> = {
  active: "Aktif",
  on_hold: "Beklemede",
  completed: "Tamamlandı",
};

// Mockup kendi yatirimda "Satış Oranı" der; satis verisi units modulunde —
// o gelene kadar cubuk progress_pct bastigi icin etiket de onu soyler (spec §7.5).
const PROGRESS_LABELS: Record<Project["project_type"], string> = {
  taahhut: "Fiziksel İlerleme",
  kendi_yatirim: "İnşaat İlerlemesi",
  kat_karsiligi: "İnşaat İlerlemesi",
};

function metaLine(project: Project): string {
  const base = [project.category, project.city].filter(Boolean).join(" · ");
  if (project.project_type === "taahhut" && project.employer_name) {
    return `${base} · İşveren: ${project.employer_name}`;
  }
  if (project.project_type === "kat_karsiligi" && project.land_share) {
    return `${base} · Arsa Sahibi: ${project.land_share.landowner_name}`;
  }
  return base;
}

function KpiCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="prj-kpi__label">{label}</div>
      {children}
    </div>
  );
}

// available:false → etiket kalir, deger "—", ipucu title'da (spec §7.2).
function MetricValue({ metric, tone }: { metric: Metric; tone?: "success" | "danger" | "profit" }) {
  if (metric.available && metric.value !== null && metric.value !== undefined) {
    return (
      <span className={cx("prj-kpi__value", tone && `prj-kpi__value--${tone}`)}>
        {formatCompactCurrency(metric.value)}
      </span>
    );
  }
  return (
    <span className="prj-kpi__value prj-kpi__value--pending" title={pendingModuleLabel(metric.pending_module)}>
      —
    </span>
  );
}

function TaahhutKpis({ project }: { project: Project }) {
  if (project.status === "completed") {
    return (
      <div className="prj-kpis">
        <KpiCell label="Sözleşme Bedeli">
          <span className="prj-kpi__value">
            {project.contract_amount ? formatCompactCurrency(project.contract_amount) : "—"}
          </span>
        </KpiCell>
        <KpiCell label="Final Hakediş">
          <span
            className="prj-kpi__value prj-kpi__value--pending"
            title={pendingModuleLabel("progress_payments")}
          >
            —
          </span>
        </KpiCell>
      </div>
    );
  }
  return (
    <div className="prj-kpis">
      <KpiCell label="Sözleşme Bedeli">
        <span className="prj-kpi__value">
          {project.contract_amount ? formatCompactCurrency(project.contract_amount) : "—"}
        </span>
      </KpiCell>
      <KpiCell label="Harcanan">
        <MetricValue metric={project.spent} />
      </KpiCell>
      <KpiCell label="Başlangıç">
        <span className="prj-kpi__value prj-kpi__value--date">
          {project.start_date ? formatMonthYear(project.start_date) : "—"}
        </span>
      </KpiCell>
      <KpiCell label="Bitiş">
        <span className="prj-kpi__value prj-kpi__value--date">
          {project.end_date ? formatMonthYear(project.end_date) : "—"}
        </span>
      </KpiCell>
    </div>
  );
}

function KendiYatirimKpis({ project }: { project: Project }) {
  return (
    <div className="prj-kpis">
      <KpiCell label="Satış Hedefi">
        <span className="prj-kpi__value">
          {project.investment?.sales_target
            ? formatCompactCurrency(project.investment.sales_target)
            : "—"}
        </span>
      </KpiCell>
      <KpiCell label="Satılan">
        <MetricValue metric={project.sales} tone="success" />
      </KpiCell>
      <KpiCell label="Toplam Maliyet">
        <MetricValue metric={project.spent} tone="danger" />
      </KpiCell>
      <KpiCell label="Tahmini Kâr">
        <MetricValue metric={project.profit} tone="profit" />
      </KpiCell>
    </div>
  );
}

function KatKarsiligiKpis({ project }: { project: Project }) {
  return (
    <div className="prj-kpis">
      <KpiCell label="Kendi Pay Değeri">
        <MetricValue metric={project.sales} />
      </KpiCell>
      <KpiCell label="Arsa Maliyeti">
        {/* Tipin tanimsal gercegi, yer tutucu degil (spec §7.3) */}
        <span className="prj-kpi__value prj-kpi__value--success">{formatCompactCurrency(0)}</span>
      </KpiCell>
      <KpiCell label="İnşaat Maliyeti">
        <MetricValue metric={project.spent} tone="danger" />
      </KpiCell>
      <KpiCell label="Tahmini Kâr">
        <MetricValue metric={project.profit} tone="profit" />
      </KpiCell>
    </div>
  );
}

// Kart tiklanmaz: link/onClick yok, mockup'taki cursor:pointer susu uygulanmaz (spec §9).
export function ProjectCard({ project }: { project: Project }) {
  const isCompleted = project.status === "completed";
  return (
    <article
      className={cx(
        "prj-card",
        `prj-card--${project.project_type}`,
        isCompleted && "prj-card--completed",
      )}
    >
      <div className="prj-card__strip" aria-hidden="true" />
      <div className="prj-card__body">
        <div className="prj-card__head">
          <div>
            <span className="prj-type-badge prj-type-badge--card">
              {TYPE_LABELS[project.project_type]}
            </span>
            <h3 className="prj-card__name">{project.name}</h3>
            <p className="prj-card__meta">{metaLine(project)}</p>
          </div>
          <span className={`prj-status prj-status--${project.status}`}>
            {STATUS_LABELS[project.status]}
          </span>
        </div>
        {project.project_type === "kat_karsiligi" && project.land_share && (
          <ShareBar share={project.land_share} />
        )}
        {project.project_type === "taahhut" && <TaahhutKpis project={project} />}
        {project.project_type === "kendi_yatirim" && <KendiYatirimKpis project={project} />}
        {project.project_type === "kat_karsiligi" && <KatKarsiligiKpis project={project} />}
        <div className="prj-progress">
          <div className="prj-progress__labels">
            <span>{PROGRESS_LABELS[project.project_type]}</span>
            <span className="prj-progress__pct">{formatPercent(project.progress_pct)}</span>
          </div>
          <div className="prj-progress__bar">
            <div
              className="prj-progress__fill"
              style={{ width: `${Math.min(Number(project.progress_pct), 100)}%` }}
            />
          </div>
        </div>
      </div>
    </article>
  );
}
```

Not: alt çipler (işçi/taşeron/marj/daire/hissedar) bilinçli olarak **yok** — tümü
`available:false` yer tutucu, çip yalnızca veri gelince basılır (spec §4.9).

`projects.css` sonuna ekle (ölçüler mockup satır 103-281'den):

```css
/* Kart izgarasi (mockup satir 103) */
.prj-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

/* Proje karti kabugu (mockup satir 106/134/166/265) */
.prj-card {
  background: var(--color-surface);
  border-radius: 16px;
  overflow: hidden;
}
.prj-card--taahhut {
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-card);
}
.prj-card--kendi_yatirim {
  border: 2px solid var(--color-accent-purple-line);
  box-shadow: var(--shadow-card-purple);
}
.prj-card--kat_karsiligi {
  border: 2px solid var(--color-accent-teal-line);
  box-shadow: var(--shadow-card-teal);
}
.prj-card__strip {
  height: 6px;
}
.prj-card--taahhut .prj-card__strip,
.prj-card--taahhut .prj-progress__fill {
  background: var(--gradient-type-taahhut);
}
.prj-card--kendi_yatirim .prj-card__strip,
.prj-card--kendi_yatirim .prj-progress__fill {
  background: var(--gradient-type-kendi-yatirim);
}
.prj-card--kat_karsiligi .prj-card__strip,
.prj-card--kat_karsiligi .prj-progress__fill {
  background: var(--gradient-type-kat-karsiligi);
}
/* Tamamlanmis: notr serit + soluk kart + yesil cubuk (mockup satir 265-279) */
.prj-card--completed {
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-card);
  opacity: 0.85;
}
.prj-card--completed .prj-card__strip {
  background: var(--color-border);
}
.prj-card--completed .prj-progress__bar {
  background: var(--color-success-soft);
}
.prj-card--completed .prj-progress__fill {
  background: var(--color-success);
}
.prj-card__body {
  padding: 20px;
}
.prj-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 14px;
}
.prj-card__name {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 4px;
}
.prj-card__meta {
  font-size: 12px;
  color: var(--color-text-subtle);
}

/* Durum rozeti (spec §6) */
.prj-status {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
  white-space: nowrap;
}
.prj-status--active {
  background: var(--color-success-soft);
  color: var(--color-success);
}
.prj-status--on_hold {
  background: var(--color-warning-soft);
  color: var(--color-warning-strong);
}
.prj-status--completed {
  background: var(--color-neutral-soft);
  color: var(--color-text-muted);
}

/* KPI izgarasi (mockup satir 119, 179) */
.prj-kpis {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}
.prj-kpi__label {
  font-size: 11px;
  color: var(--color-text-subtle);
  margin-bottom: 3px;
}
.prj-kpi__value {
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}
.prj-kpi__value--date {
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 400;
  color: var(--color-text-secondary);
}
.prj-kpi__value--success {
  color: var(--color-success);
}
.prj-kpi__value--danger {
  color: var(--color-danger);
}
.prj-kpi__value--profit {
  font-weight: 700;
}
.prj-card--kendi_yatirim .prj-kpi__value--profit {
  color: var(--color-accent-purple-grad-start);
}
.prj-card--kat_karsiligi .prj-kpi__value--profit {
  color: var(--color-accent-teal-start);
}
.prj-kpi__value--pending {
  color: var(--color-text-subtle);
  font-weight: 400;
}

/* Kat karsiligi pay cubugu (mockup satir 147-150) */
.prj-share {
  display: flex;
  height: 32px;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 14px;
}
.prj-share__ours,
.prj-share__owner {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-on-brand);
  font-size: 11px;
  font-weight: 700;
}
.prj-share__ours {
  background: var(--color-accent-teal-start);
}
.prj-share__owner {
  background: var(--color-text-subtle);
}

/* Ilerleme satiri (mockup satir 125, 185) */
.prj-progress {
  margin-bottom: 8px;
}
.prj-progress__labels {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  font-size: 12px;
  color: var(--color-text-muted);
}
.prj-progress__pct {
  font-weight: 600;
}
.prj-card--taahhut .prj-progress__pct {
  color: var(--color-primary);
}
.prj-card--kendi_yatirim .prj-progress__pct {
  color: var(--color-accent-purple-grad-start);
}
.prj-card--kat_karsiligi .prj-progress__pct {
  color: var(--color-accent-teal-start);
}
.prj-card--completed .prj-progress__pct {
  color: var(--color-success);
}
.prj-progress__bar {
  height: 6px;
  background: var(--color-neutral-soft);
  border-radius: 3px;
  overflow: hidden;
}
.prj-progress__fill {
  height: 100%;
  border-radius: 3px;
}
```

- [ ] **Adım 4: Doğrula ve commit**

```bash
pnpm test src/components/projects
pnpm typecheck
git add src/components/projects
git commit -m "feat: project type variant cards and land share bar"
```

Beklenen: Task 3'ün 9 testi + 6 yeni = 15 PASS.

---

## Task 5: "+ Yeni Proje" modalı (mockup'sız — Ayarlar form kanonu)

**Dosyalar:**
- Oluştur: `src/components/projects/ProjectFormModal.tsx`
- Test: `src/components/projects/ProjectFormModal.test.tsx`

**Arayüzler:**
- Tüketir: `Modal` (`@/components/settings/Modal`), `Button`/`Input`/`Select` (`@/components/ui`),
  `useCreateProject` (Task 1), `backendErrorMessage` (`@/lib/settings/error-message`)
- Üretir: `<ProjectFormModal onClose />` — Task 6 kullanır.

Bu yüzeyin mockup'ı yok (spec §8) — `UserFormModal.tsx` birebir desen referansıdır:
`settings-form`/`settings-field` sınıfları, `Modal` footer'ında Vazgeç/Kaydet,
`isPending` disable, hata `settings-note--error`.

- [ ] **Adım 1: Başarısız testi yaz**

`src/components/projects/ProjectFormModal.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { ProjectFormModal } from "./ProjectFormModal";
import { useCreateProject } from "@/lib/api/hooks/useProjectMutations";

vi.mock("@/lib/api/hooks/useProjectMutations", () => ({ useCreateProject: vi.fn() }));

const mutate = vi.fn();

function setup() {
  vi.mocked(useCreateProject).mockReturnValue({ mutate, isPending: false } as never);
  render(<ProjectFormModal onClose={() => {}} />);
}

describe("ProjectFormModal", () => {
  beforeEach(() => vi.clearAllMocks());

  it("varsayilan tip taahhut: isveren alani var, satis hedefi yok", () => {
    setup();
    expect(screen.getByLabelText("İşveren")).toBeInTheDocument();
    expect(screen.queryByLabelText("Satış Hedefi")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Arsa Sahibi")).not.toBeInTheDocument();
  });

  it("tip degisince kosullu alanlar degisir", () => {
    setup();
    fireEvent.change(screen.getByLabelText("Tip"), { target: { value: "kendi_yatirim" } });
    expect(screen.getByLabelText("Satış Hedefi")).toBeInTheDocument();
    expect(screen.getByLabelText("Arsa Maliyeti")).toBeInTheDocument();
    expect(screen.queryByLabelText("İşveren")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Tip"), { target: { value: "kat_karsiligi" } });
    expect(screen.getByLabelText("Arsa Sahibi")).toBeInTheDocument();
    expect(screen.getByLabelText("Bizim Pay (%)")).toBeInTheDocument();
    expect(screen.getByLabelText("Arsa Sahibi Payı (%)")).toBeInTheDocument();
  });

  it("kat karsiliginda pay toplami 100 degilse hata basar", () => {
    setup();
    fireEvent.change(screen.getByLabelText("Kod"), { target: { value: "BK-1" } });
    fireEvent.change(screen.getByLabelText("Ad"), { target: { value: "Bahçelievler" } });
    fireEvent.change(screen.getByLabelText("Tip"), { target: { value: "kat_karsiligi" } });
    fireEvent.change(screen.getByLabelText("Arsa Sahibi"), { target: { value: "Yılmaz Ailesi" } });
    fireEvent.change(screen.getByLabelText("Bizim Pay (%)"), { target: { value: "55" } });
    fireEvent.change(screen.getByLabelText("Arsa Sahibi Payı (%)"), { target: { value: "40" } });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    expect(screen.getByText("Pay oranlarının toplamı 100 olmalıdır.")).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("gecerli kat karsiligi gonderiminde land_share gider", () => {
    setup();
    fireEvent.change(screen.getByLabelText("Kod"), { target: { value: "BK-1" } });
    fireEvent.change(screen.getByLabelText("Ad"), { target: { value: "Bahçelievler" } });
    fireEvent.change(screen.getByLabelText("Tip"), { target: { value: "kat_karsiligi" } });
    fireEvent.change(screen.getByLabelText("Arsa Sahibi"), { target: { value: "Yılmaz Ailesi" } });
    fireEvent.change(screen.getByLabelText("Bizim Pay (%)"), { target: { value: "55" } });
    fireEvent.change(screen.getByLabelText("Arsa Sahibi Payı (%)"), { target: { value: "45" } });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "BK-1",
        name: "Bahçelievler",
        project_type: "kat_karsiligi",
        land_share: expect.objectContaining({
          landowner_name: "Yılmaz Ailesi",
          our_share_pct: "55",
          owner_share_pct: "45",
        }),
      }),
      expect.anything(),
    );
  });
});
```

- [ ] **Adım 2: Testin başarısız olduğunu doğrula**

Çalıştır: `pnpm test src/components/projects/ProjectFormModal.test.tsx`
Beklenen: FAIL — modül yok

- [ ] **Adım 3: Uygula**

`src/components/projects/ProjectFormModal.tsx`:

```tsx
"use client";

import { useState } from "react";

import { Button, Input, Select } from "@/components/ui";
import { Modal } from "@/components/settings/Modal";
import { useCreateProject } from "@/lib/api/hooks/useProjectMutations";
import type { ProjectTypeFilter } from "@/lib/api/hooks/useProjects";
import { backendErrorMessage } from "@/lib/settings/error-message";
// Mockup'siz tek yuzey — Ayarlar form kanonu birebir izlenir (spec §8):
// settings-form/settings-field siniflari settings.css'ten gelir.
import "@/components/settings/settings.css";

interface ProjectFormModalProps {
  onClose: () => void;
}

export function ProjectFormModal({ onClose }: ProjectFormModalProps) {
  const createProject = useCreateProject();

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [projectType, setProjectType] = useState<ProjectTypeFilter>("taahhut");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [employerName, setEmployerName] = useState("");
  const [contractNo, setContractNo] = useState("");
  const [contractAmount, setContractAmount] = useState("");
  const [salesTarget, setSalesTarget] = useState("");
  const [landCost, setLandCost] = useState("");
  const [landownerName, setLandownerName] = useState("");
  const [ourSharePct, setOurSharePct] = useState("");
  const [ownerSharePct, setOwnerSharePct] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const isPending = createProject.isPending;

  function validate(): string | null {
    if (!code.trim()) return "Kod zorunludur.";
    if (!name.trim()) return "Ad zorunludur.";
    if (projectType === "taahhut") {
      if (!employerName.trim()) return "İşveren zorunludur.";
      if (contractAmount && Number.isNaN(Number(contractAmount))) {
        return "Sözleşme bedeli sayı olmalıdır.";
      }
    }
    if (projectType === "kendi_yatirim") {
      if (!salesTarget.trim() || Number.isNaN(Number(salesTarget))) {
        return "Satış hedefi sayı olmalıdır.";
      }
      if (landCost && Number.isNaN(Number(landCost))) return "Arsa maliyeti sayı olmalıdır.";
    }
    if (projectType === "kat_karsiligi") {
      if (!landownerName.trim()) return "Arsa sahibi zorunludur.";
      const ours = Number(ourSharePct);
      const owner = Number(ownerSharePct);
      if (!ourSharePct.trim() || Number.isNaN(ours) || ours < 0 || ours > 100) {
        return "Bizim pay 0-100 arası olmalıdır.";
      }
      if (!ownerSharePct.trim() || Number.isNaN(owner) || owner < 0 || owner > 100) {
        return "Arsa sahibi payı 0-100 arası olmalıdır.";
      }
      if (ours + owner !== 100) return "Pay oranlarının toplamı 100 olmalıdır.";
    }
    return null;
  }

  function handleSubmit() {
    const problem = validate();
    if (problem) {
      setFormError(problem);
      return;
    }
    setFormError(null);
    createProject.mutate(
      {
        code,
        name,
        project_type: projectType,
        category: category || null,
        city: city || null,
        ...(projectType === "taahhut"
          ? {
              employer_name: employerName,
              contract_no: contractNo || null,
              contract_amount: contractAmount || null,
            }
          : {}),
        ...(projectType === "kendi_yatirim"
          ? { investment: { sales_target: salesTarget, land_cost: landCost || null } }
          : {}),
        ...(projectType === "kat_karsiligi"
          ? {
              land_share: {
                landowner_name: landownerName,
                our_share_pct: ourSharePct,
                owner_share_pct: ownerSharePct,
              },
            }
          : {}),
      },
      { onSuccess: onClose, onError: (err) => setFormError(backendErrorMessage(err)) },
    );
  }

  return (
    <Modal
      title="Yeni Proje"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Vazgeç
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isPending}>
            Kaydet
          </Button>
        </>
      }
    >
      <div className="settings-form">
        <label className="settings-field">
          <span className="settings-field__label">Kod</span>
          <Input value={code} onChange={(e) => setCode(e.target.value)} />
        </label>
        <label className="settings-field">
          <span className="settings-field__label">Ad</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="settings-field">
          <span className="settings-field__label">Tip</span>
          <Select
            value={projectType}
            onChange={(e) => setProjectType(e.target.value as ProjectTypeFilter)}
          >
            <option value="taahhut">Taahhüt</option>
            <option value="kendi_yatirim">Kendi Yatırım</option>
            <option value="kat_karsiligi">Kat Karşılığı</option>
          </Select>
        </label>
        <label className="settings-field">
          <span className="settings-field__label">Kategori</span>
          <Input value={category} onChange={(e) => setCategory(e.target.value)} />
        </label>
        <label className="settings-field">
          <span className="settings-field__label">Şehir</span>
          <Input value={city} onChange={(e) => setCity(e.target.value)} />
        </label>
        {projectType === "taahhut" && (
          <>
            <label className="settings-field">
              <span className="settings-field__label">İşveren</span>
              <Input value={employerName} onChange={(e) => setEmployerName(e.target.value)} />
            </label>
            <label className="settings-field">
              <span className="settings-field__label">Sözleşme No</span>
              <Input value={contractNo} onChange={(e) => setContractNo(e.target.value)} />
            </label>
            <label className="settings-field">
              <span className="settings-field__label">Sözleşme Bedeli</span>
              <Input value={contractAmount} onChange={(e) => setContractAmount(e.target.value)} />
            </label>
          </>
        )}
        {projectType === "kendi_yatirim" && (
          <>
            <label className="settings-field">
              <span className="settings-field__label">Satış Hedefi</span>
              <Input value={salesTarget} onChange={(e) => setSalesTarget(e.target.value)} />
            </label>
            <label className="settings-field">
              <span className="settings-field__label">Arsa Maliyeti</span>
              <Input value={landCost} onChange={(e) => setLandCost(e.target.value)} />
            </label>
          </>
        )}
        {projectType === "kat_karsiligi" && (
          <>
            <label className="settings-field">
              <span className="settings-field__label">Arsa Sahibi</span>
              <Input value={landownerName} onChange={(e) => setLandownerName(e.target.value)} />
            </label>
            <label className="settings-field">
              <span className="settings-field__label">Bizim Pay (%)</span>
              <Input value={ourSharePct} onChange={(e) => setOurSharePct(e.target.value)} />
            </label>
            <label className="settings-field">
              <span className="settings-field__label">Arsa Sahibi Payı (%)</span>
              <Input value={ownerSharePct} onChange={(e) => setOwnerSharePct(e.target.value)} />
            </label>
          </>
        )}
        {formError && <p className="settings-note settings-note--error">{formError}</p>}
      </div>
    </Modal>
  );
}
```

Gövde alan adları (`employer_name`, `investment`, `land_share`, `null` kabulü)
`ProjectCreateRequest` şemasıyla uyuşmazsa `pnpm typecheck` söyler — şemaya uy,
spec'i değil şemayı kanon say ve sapmayı commit mesajında not et.

- [ ] **Adım 4: Doğrula ve commit**

```bash
pnpm test src/components/projects/ProjectFormModal.test.tsx
pnpm typecheck
git add src/components/projects/ProjectFormModal.tsx src/components/projects/ProjectFormModal.test.tsx
git commit -m "feat: new project modal with type-conditional fields"
```

---

## Task 6: Görünüm, URL sekme durumu ve rota

**Dosyalar:**
- Oluştur: `src/components/projects/ProjectsView.tsx`, `src/app/(app)/projeler/page.tsx`
- Değiştir: `src/components/projects/projects.css`
- Test: `src/components/projects/ProjectsView.test.tsx`

**Arayüzler:**
- Tüketir: `useProjects` (Task 1), `ProjectTabs`/`TypeLegend`/`tabs` (Task 3),
  `ProjectCard` (Task 4), `ProjectFormModal` (Task 5), `AccessDenied` + `isForbidden`
- Üretir: `<ProjectsView />` — `page.tsx` render eder.

- [ ] **Adım 1: Başarısız testi yaz**

`src/components/projects/ProjectsView.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { ProjectsView } from "./ProjectsView";
import { useProjects } from "@/lib/api/hooks/useProjects";
import { BackendError } from "@/lib/api/unwrap";

vi.mock("@/lib/api/hooks/useProjects", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useProjects")>()),
  useProjects: vi.fn(),
}));

const nav = vi.hoisted(() => ({ search: "", replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: nav.replace }),
  usePathname: () => "/projeler",
  useSearchParams: () => new URLSearchParams(nav.search),
}));

const PENDING = (m: string) => ({ available: false, value: null, pending_module: m });
const item = {
  id: "11111111-1111-1111-1111-111111111111",
  code: "GK-A",
  name: "Güneşkent A-Blok",
  project_type: "taahhut" as const,
  status: "active" as const,
  category: "Konut",
  city: "Ankara",
  employer_name: "Güneşkent A.Ş.",
  contract_no: null,
  contract_amount: "11200000.00",
  start_date: "2025-03-01",
  end_date: "2026-12-01",
  budget: "1000000.00",
  progress_pct: "75.00",
  investment: null,
  land_share: null,
  spent: PENDING("project_costs"),
  headcount: PENDING("timesheet"),
  subcontractor_count: PENDING("subcontracts"),
  sales: PENDING("units"),
  profit: PENDING("progress_payments"),
};
const data = {
  counts: { all: 4, taahhut: 2, kendi_yatirim: 1, kat_karsiligi: 1, completed: 1 },
  items: [item],
};

function mockQuery(value: Partial<ReturnType<typeof useProjects>>) {
  vi.mocked(useProjects).mockReturnValue({
    data: undefined, isLoading: false, isError: false, error: null, ...value,
  } as never);
}

describe("ProjectsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nav.search = "";
  });

  it("breadcrumb aktif sayisi counts'tan turer (all - completed)", () => {
    mockQuery({ data });
    render(<ProjectsView />);
    expect(screen.getByText("Portföy · 3 Aktif Proje")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Projeler" })).toBeInTheDocument();
    expect(screen.getByText("Güneşkent A-Blok")).toBeInTheDocument();
  });

  it("sekme tiklaninca URL'e yazar", () => {
    mockQuery({ data });
    render(<ProjectsView />);
    fireEvent.click(screen.getByRole("tab", { name: "Taahhüt (2)" }));
    expect(nav.replace).toHaveBeenCalledWith("/projeler?tab=taahhut", { scroll: false });
  });

  it("tumu sekmesi bosken kurulum bos durumu basar", () => {
    mockQuery({ data: { ...data, items: [] } });
    render(<ProjectsView />);
    expect(screen.getByText("Henüz proje tanımlanmadı")).toBeInTheDocument();
  });

  it("filtreli sekme bosken sekme bos durumu basar", () => {
    nav.search = "tab=completed";
    mockQuery({ data: { ...data, items: [] } });
    render(<ProjectsView />);
    expect(screen.getByText("Bu sekmede proje yok")).toBeInTheDocument();
  });

  it("403'te erisim reddi basar", () => {
    mockQuery({ isError: true, error: new BackendError(403, { detail: "yasak" }) });
    render(<ProjectsView />);
    expect(screen.queryByRole("heading", { name: "Projeler" })).not.toBeInTheDocument();
  });

  it("diger hatalarda mesaj basar", () => {
    mockQuery({ isError: true, error: new Error("patladi") });
    render(<ProjectsView />);
    expect(screen.getByText("Projeler yüklenemedi")).toBeInTheDocument();
  });
});
```

- [ ] **Adım 2: Testin başarısız olduğunu doğrula**

Çalıştır: `pnpm test src/components/projects/ProjectsView.test.tsx`
Beklenen: FAIL — modül yok

- [ ] **Adım 3: Uygula**

`src/components/projects/ProjectsView.tsx`:

```tsx
"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { AccessDenied } from "@/components/settings/AccessDenied";
import { useProjects } from "@/lib/api/hooks/useProjects";
import { isForbidden } from "@/lib/api/unwrap";

import { ProjectCard } from "./ProjectCard";
import { ProjectFormModal } from "./ProjectFormModal";
import { ProjectTabs } from "./ProjectTabs";
import { TypeLegend } from "./TypeLegend";
import { parseProjectTab, tabToFilter, type ProjectTab } from "./tabs";
import "./projects.css";

export function ProjectsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = parseProjectTab(searchParams.get("tab"));
  const [isFormOpen, setFormOpen] = useState(false);

  const projectsQuery = useProjects(tabToFilter(tab));

  function handleTabChange(next: ProjectTab) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") params.delete("tab");
    else params.set("tab", next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  if (isForbidden(projectsQuery.error)) return <AccessDenied />;
  if (projectsQuery.isError) return <p className="prj-message">Projeler yüklenemedi</p>;
  if (projectsQuery.isLoading || !projectsQuery.data) {
    return <p className="prj-message">Yükleniyor…</p>;
  }

  const { counts, items } = projectsQuery.data;
  // Backend ayri "active" sayaci vermiyor; tamamlanmamis her sey portfoydedir (spec §4.1).
  const activeCount = counts.all - counts.completed;

  return (
    <div className="prj">
      <p className="prj__breadcrumb">Portföy · {activeCount} Aktif Proje</p>
      <div className="prj__title-row">
        <h1 className="prj__title">Projeler</h1>
        <button type="button" className="prj__new-btn" onClick={() => setFormOpen(true)}>
          + Yeni Proje
        </button>
      </div>
      <TypeLegend counts={counts} />
      <ProjectTabs active={tab} counts={counts} onChange={handleTabChange} />
      {items.length === 0 ? (
        <section className="prj-empty">
          <p className="prj-empty__title">
            {tab === "all" ? "Henüz proje tanımlanmadı" : "Bu sekmede proje yok"}
          </p>
          <p className="prj-empty__hint">
            {tab === "all" ? "+ Yeni Proje ile başlayın" : "Başka bir sekme seçin"}
          </p>
        </section>
      ) : (
        <div className="prj-grid">
          {items.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
      {isFormOpen && <ProjectFormModal onClose={() => setFormOpen(false)} />}
    </div>
  );
}
```

`src/app/(app)/projeler/page.tsx`:

```tsx
import { Suspense } from "react";

import { ProjectsView } from "@/components/projects/ProjectsView";

// useSearchParams kullanan istemci bilesen Suspense sinirinda sarilir (Next 15).
export default function ProjectsPage() {
  return (
    <Suspense>
      <ProjectsView />
    </Suspense>
  );
}
```

`projects.css` sonuna ekle:

```css
/* Bos liste durumu (mockup'ta tanimsiz — F6 sifir-proje deseni, spec §7.9) */
.prj-empty {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  box-shadow: var(--shadow-card);
  padding: 20px;
}
.prj-empty__title {
  font-size: 13px;
  color: var(--color-text-secondary);
}
.prj-empty__hint {
  font-size: 11px;
  color: var(--color-text-subtle);
  margin-top: 2px;
}
```

- [ ] **Adım 4: Doğrula ve commit**

```bash
pnpm test src/components/projects
pnpm lint
pnpm typecheck
pnpm build
git add src/components/projects "src/app/(app)/projeler"
git commit -m "feat: projects screen view with url tab state"
```

Beklenen: hepsi temiz; `/projeler` artık catch-all yerine gerçek sayfada.

---

## Task 7: Mock backend, E2E ve görsel regresyon

**Dosyalar:**
- Değiştir: `e2e/mock-backend.ts`
- Oluştur: `e2e/projects.spec.ts`, `e2e/projects-visual.spec.ts`

- [ ] **Adım 1: Mock backend'i yeni sözleşmeye geçir**

`e2e/mock-backend.ts` içinde `MockState.projects` tipini ve seed'i değiştir. Tip:

```ts
interface MockMetric {
  available: boolean;
  value: string | null;
  pending_module: string;
}
interface MockProject {
  id: string;
  code: string;
  name: string;
  project_type: string;
  status: string;
  category: string | null;
  city: string | null;
  employer_name: string | null;
  contract_no: string | null;
  contract_amount: string | null;
  start_date: string | null;
  end_date: string | null;
  budget: string;
  progress_pct: string;
  investment: { sales_target: string; land_cost: string | null } | null;
  land_share: { landowner_name: string; our_share_pct: string; owner_share_pct: string } | null;
  spent: MockMetric;
  headcount: MockMetric;
  subcontractor_count: MockMetric;
  sales: MockMetric;
  profit: MockMetric;
}
```

`MockState` içinde `projects: MockProject[];`. Seed (dört tip/durumu da kapsar; `Kule A`
ve `Villa B` adları korunur — mevcut dashboard/settings e2e'leri onlara bakıyor):

```ts
const PENDING = (m: string): MockMetric => ({ available: false, value: null, pending_module: m });
const PLACEHOLDERS = () => ({
  spent: PENDING("project_costs"),
  headcount: PENDING("timesheet"),
  subcontractor_count: PENDING("subcontracts"),
  sales: PENDING("units"),
  profit: PENDING("progress_payments"),
});
```

```ts
projects: [
  {
    id: "p-1", code: "PRJ-1", name: "Kule A", project_type: "taahhut", status: "active",
    category: "Konut", city: "Ankara", employer_name: "Güneşkent A.Ş.", contract_no: "SZL-2025-01",
    contract_amount: "11200000", start_date: "2025-03-01", end_date: "2026-12-01",
    budget: "1000000", progress_pct: "20", investment: null, land_share: null, ...PLACEHOLDERS(),
  },
  {
    id: "p-2", code: "PRJ-2", name: "Villa B", project_type: "kendi_yatirim", status: "active",
    category: "Konut Geliştirme", city: "Ankara", employer_name: null, contract_no: null,
    contract_amount: null, start_date: "2025-01-01", end_date: "2026-06-01",
    budget: "500000", progress_pct: "40",
    investment: { sales_target: "48200000", land_cost: "5000000" }, land_share: null,
    ...PLACEHOLDERS(),
  },
  {
    id: "p-3", code: "PRJ-3", name: "Bahçelievler Konut", project_type: "kat_karsiligi",
    status: "active", category: "Konut", city: "Ankara", employer_name: null, contract_no: null,
    contract_amount: null, start_date: "2025-06-01", end_date: "2027-03-01",
    budget: "700000", progress_pct: "42", investment: null,
    land_share: { landowner_name: "Yılmaz Ailesi", our_share_pct: "55", owner_share_pct: "45" },
    ...PLACEHOLDERS(),
  },
  {
    id: "p-4", code: "PRJ-4", name: "Güneşkent B-Blok", project_type: "taahhut",
    status: "completed", category: "Konut", city: "Ankara", employer_name: "Güneşkent A.Ş.",
    contract_no: "SZL-2023-04", contract_amount: "9400000", start_date: "2023-01-01",
    end_date: "2025-01-01", budget: "900000", progress_pct: "100", investment: null,
    land_share: null, ...PLACEHOLDERS(),
  },
],
```

`GET /projects` handler'ını değiştir (`if (method === "GET" && path === "/projects") return send(200, state.projects);` satırı yerine):

```ts
if (method === "GET" && path === "/projects") {
  const type = parsed.searchParams.get("type");
  const status = parsed.searchParams.get("status");
  const counts = {
    all: state.projects.length,
    taahhut: state.projects.filter((p) => p.project_type === "taahhut").length,
    kendi_yatirim: state.projects.filter((p) => p.project_type === "kendi_yatirim").length,
    kat_karsiligi: state.projects.filter((p) => p.project_type === "kat_karsiligi").length,
    completed: state.projects.filter((p) => p.status === "completed").length,
  };
  let items = state.projects;
  if (type) items = items.filter((p) => p.project_type === type);
  if (status) items = items.filter((p) => p.status === status);
  return send(200, { counts, items });
}
if (method === "POST" && path === "/projects") {
  return withBody((body) => {
    const project: MockProject = {
      id: `p-${state.projects.length + 1}`,
      code: String(body.code ?? ""),
      name: String(body.name ?? ""),
      project_type: String(body.project_type ?? "taahhut"),
      status: "active",
      category: body.category ? String(body.category) : null,
      city: body.city ? String(body.city) : null,
      employer_name: body.employer_name ? String(body.employer_name) : null,
      contract_no: body.contract_no ? String(body.contract_no) : null,
      contract_amount: body.contract_amount ? String(body.contract_amount) : null,
      start_date: null,
      end_date: null,
      budget: "0",
      progress_pct: "0",
      investment: (body.investment as MockProject["investment"]) ?? null,
      land_share: (body.land_share as MockProject["land_share"]) ?? null,
      ...PLACEHOLDERS(),
    };
    state.projects.push(project);
    return send(201, project);
  });
}
```

Modül seed'ine `projects` izin modülünü ekle (GENEL grubu, backend seed hizası —
`m-approvals` satırından sonra):

```ts
{ id: "m-projects", key: "projects", name: "Projeler", group: "GENEL", sort_order: 15 },
```

Not: `/dashboard/summary` handler'ı `state.projects`ten yalnızca
`id/code/name/status/budget/progress_pct` map'lediği için genişletilmiş şekille çalışmaya
devam eder; dokunma.

- [ ] **Adım 2: Mevcut testlerin durumunu doğrula**

```bash
pnpm test
pnpm typecheck
```

Beklenen: birim testleri yeşil. Not: modül listesi değiştiği için Ayarlar İzin Matrisi
**görsel** baseline'ları Adım 5'te yeniden üretilecek — birim testinde kırılma varsa
(modül sayısına bakan test) gerçek sayıya güncelle.

- [ ] **Adım 3: E2E ve görsel spec yaz**

`e2e/projects.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

// Diger e2e spec'lerindeki (auth/dashboard) giris akisinin ayni yardimcisi.
async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

test("projeler ekrani yuklenir ve sekme gecisi calisir", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Projeler" }).click();
  await expect(page).toHaveURL(/projeler/);
  await expect(page.getByRole("heading", { name: "Projeler" })).toBeVisible();
  await expect(page.getByText("Kule A")).toBeVisible();
  await expect(page.getByText("Bahçelievler Konut")).toBeVisible();

  await page.getByRole("tab", { name: "Taahhüt (2)" }).click();
  await expect(page).toHaveURL(/tab=taahhut/);
  await expect(page.getByText("Villa B")).not.toBeVisible();
  // Sayaclar filtreden etkilenmez
  await expect(page.getByRole("tab", { name: "Tümü (4)" })).toBeVisible();
});

test("yeni proje modali acilir", async ({ page }) => {
  await login(page);
  await page.goto("/projeler");
  await page.getByRole("button", { name: "+ Yeni Proje" }).click();
  await expect(page.getByText("Yeni Proje", { exact: true })).toBeVisible();
  await expect(page.getByLabel("İşveren")).toBeVisible();
});
```

`e2e/projects-visual.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("projeler ekrani gorsel", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();

  await page.goto("/projeler");
  await expect(page.getByRole("heading", { name: "Projeler" })).toBeVisible();
  await expect(page).toHaveScreenshot("projects.png", { fullPage: true });
});
```

Yazmadan önce mevcut bir e2e spec'ini aç ve giriş yardımcısının gerçek seçicilerini
doğrula (`e2e/dashboard.spec.ts` referans); farklıysa gerçeğini kullan.

- [ ] **Adım 4: Mockup karşılaştırması**

```bash
node scripts/render-mockup.mjs "projedesign/Ekran 4 - Projeler.dc.html" 1440
```

Uygulamanın 1440px görüntüsüyle yan yana karşılaştır. Sapma bulursan ölçüyü mockup'ın
satır içi stilinden oku ve CSS'i düzelt. Onaylı normalizasyonlar (spec §7: tip şeridi,
`—` hücreleri, çipsiz kartlar, "İnşaat İlerlemesi" etiketi, tip rozeti her kartta,
ünite sayısız pay çubuğu) **sapma değildir** — geri alma.

- [ ] **Adım 5: Doğrulama ve commit**

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
git add e2e
git commit -m "feat: projects screen e2e, visual spec and mock backend contract"
```

- [ ] **Adım 6: Baseline talimatını bildir**

macOS'ta PNG **üretme**. Kullanıcıya bildir: `visual-baselines.yml` workflow_dispatch
çalıştırılmalı → `linux-baselines` artifact indirilip `e2e/` altına kopyalanmalı →
ayrı commit. Beklenen baseline değişimleri: yeni `projects.png` + modül listesine
`Projeler` satırı eklendiği için Ayarlar İzin Matrisi snapshot'ları. Push/merge/deploy
kararı kullanıcınındır.

---

## Öz-inceleme

**Spec kapsamı:**

| Spec bölümü | Karşılayan task |
|---|---|
| §2 rota ve dosyalar | Task 6 (page.tsx + view), Task 3-5 (bileşenler) |
| §3 backend sözleşmesi + tüketici migrasyonu | Task 1 |
| §4.1 sayfa başlığı | Task 6 |
| §4.2 tip açıklama kartları | Task 3 |
| §4.3 sekme barı + URL durumu | Task 3, 6 |
| §4.4-4.6 kart kabuğu + başlık + KPI | Task 4 |
| §4.7 pay çubuğu | Task 4 |
| §4.8 ilerleme satırı | Task 4 |
| §4.9 alt çipler (v1'de yok) | Task 4 (bilinçli yokluk, yorumla işaretli) |
| §5 token'lar | Task 2 |
| §6 durum rozetleri | Task 4 |
| §7 dürüstlük/normalizasyonlar | Task 2 (eşleme), Task 4 (`—`, etiketler), Task 6 (boş liste) |
| §8 form | Task 5 |
| §9 gezinme (tıklanmazlık) | Task 4 (test: link/button yok) |
| §10 biçimleyiciler | Task 2 |
| §11 testler | Task 1-6 (birim), Task 7 (e2e + görsel) |
| §12 kapsam dışı | Hiçbir task kart linki, detay rotası veya panel tip rozeti eklemiyor |

Boşluk yok.

**Tip tutarlılığı:** `ProjectListResponse` / `ProjectListItem` / `ProjectCounts` /
`ProjectListFilter` / `ProjectTypeFilter` Task 1'de dışa aktarılır, Task 3-6'da aynı
adlarla tüketilir. `ProjectTab`, `parseProjectTab`, `tabToFilter` Task 3'te tanımlanır,
Task 6 aynı adlarla kullanır. Prop adları (`counts`, `active`, `onChange`, `project`,
`share`, `onClose`) tanım ve kullanım task'ları arasında birebir. Mock backend seed'i
(Task 7) fixture'larla aynı alan adlarını taşır; `Kule A`/`Villa B` adları mevcut
e2e/dashboard beklentileriyle uyumlu tutuldu.

**Şema riski (bilinçli):** Backend spec'i paralel yazıldığı için `ProjectResponse`,
`ProjectCreateRequest`, `land_share` alan adları gen:api sonrası doğrulanır; Task 1
Adım 1 ve Task 4/5'teki notlar uyuşmazlıkta şemayı kanon sayar.
