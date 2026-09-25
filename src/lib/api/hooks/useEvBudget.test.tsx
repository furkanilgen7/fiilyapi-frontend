import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import {
  EV_BUDGET_KEY,
  useEvBudget,
  useEvBudgetPreview,
  useEvBudgetRevisions,
  useEvBudgetSchedule,
  useEvItemSuggestions,
  useEvRevisionDiff,
} from "./useEvBudget";
import { backendClient } from "@/lib/api/client";
import { BackendError } from "@/lib/api/unwrap";

// PLN-F1.6 · Adam-Saat Bütçesi okuma hook'ları (`useSitePlan.test.tsx` deseni).
vi.mock("@/lib/api/client", () => ({
  backendClient: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() },
}));

const SITE = "site-1";
const REV = "rev-2";
const ITEM = "item-9";

let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function ok(data: unknown) {
  return { data, error: undefined, response: new Response() } as never;
}

function fail(status: number) {
  return { data: undefined, error: { detail: "x" }, response: new Response(null, { status }) } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

describe("useEvBudget", () => {
  it("revizyonsuz: GET /budget sorgusuz; önbellek anahtarı revizyonu null taşır", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(ok({ editable: true }));
    const { result } = renderHook(() => useEvBudget(SITE, null), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/sites/{site_id}/earned-value/budget", {
      params: { path: { site_id: SITE } },
    });
    expect(client.getQueryData([EV_BUDGET_KEY, SITE, null])).toEqual({ editable: true });
  });

  it("revizyonlu: `revision_id` sorgu parametresi gönderilir", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(ok({ editable: false }));
    const { result } = renderHook(() => useEvBudget(SITE, REV), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/sites/{site_id}/earned-value/budget", {
      params: { path: { site_id: SITE }, query: { revision_id: REV } },
    });
  });

  it("boş şantiye ile ağa ÇIKMAZ", () => {
    const { result } = renderHook(() => useEvBudget("", null), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
    expect(backendClient.GET).not.toHaveBeenCalled();
  });

  it("403'te BackendError", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(fail(403));
    const { result } = renderHook(() => useEvBudget(SITE, null), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as BackendError).status).toBe(403);
  });
});

describe("useEvBudgetRevisions", () => {
  it("GET /budget/revisions", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(ok([{ id: REV }]));
    const { result } = renderHook(() => useEvBudgetRevisions(SITE), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual([{ id: REV }]));
    expect(backendClient.GET).toHaveBeenCalledWith("/sites/{site_id}/earned-value/budget/revisions", {
      params: { path: { site_id: SITE } },
    });
  });
});

describe("useEvRevisionDiff", () => {
  it("yalnız etkinken ve revizyon varken GET /diff", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(ok({ leaves: [] }));
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useEvRevisionDiff(SITE, REV, enabled),
      { wrapper, initialProps: { enabled: false } },
    );
    expect(backendClient.GET).not.toHaveBeenCalled();
    rerender({ enabled: true });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith(
      "/sites/{site_id}/earned-value/budget/revisions/{revision_id}/diff",
      { params: { path: { site_id: SITE, revision_id: REV } } },
    );
  });

  it("revizyon null ise ağa çıkmaz", () => {
    renderHook(() => useEvRevisionDiff(SITE, null, true), { wrapper });
    expect(backendClient.GET).not.toHaveBeenCalled();
  });
});

describe("useEvBudgetSchedule", () => {
  it("GET /budget/schedule (revision_id ile)", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(ok({ bars: [] }));
    const { result } = renderHook(() => useEvBudgetSchedule(SITE, REV), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/sites/{site_id}/earned-value/budget/schedule", {
      params: { path: { site_id: SITE }, query: { revision_id: REV } },
    });
  });
});

describe("useEvBudgetPreview", () => {
  it("POST /budget/preview — kalıcı değil; gövde yalnız revizyonu taşır", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue(ok({ disciplines: [] }));
    const { result } = renderHook(() => useEvBudgetPreview(SITE, REV), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.POST).toHaveBeenCalledWith("/sites/{site_id}/earned-value/budget/preview", {
      params: { path: { site_id: SITE } },
      body: { revision_id: REV, distributions: [], windows: [] },
    });
  });

  it("revizyonsuz önizleme `revision_id: null` gönderir", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue(ok({ disciplines: [] }));
    const { result } = renderHook(() => useEvBudgetPreview(SITE, null), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(vi.mocked(backendClient.POST).mock.calls[0][1]).toEqual({
      params: { path: { site_id: SITE } },
      body: { revision_id: null, distributions: [], windows: [] },
    });
  });
});

describe("useEvItemSuggestions", () => {
  it("kalem seçilince GET /items/{id}/suggestions; seçilmezse ağa çıkmaz", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(ok({ catalog: [], history: [] }));
    const { result, rerender } = renderHook(
      ({ item }: { item: string | null }) => useEvItemSuggestions(SITE, item),
      { wrapper, initialProps: { item: null as string | null } },
    );
    expect(backendClient.GET).not.toHaveBeenCalled();
    rerender({ item: ITEM });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith(
      "/sites/{site_id}/earned-value/budget/items/{boq_item_id}/suggestions",
      { params: { path: { site_id: SITE, boq_item_id: ITEM } } },
    );
  });
});
