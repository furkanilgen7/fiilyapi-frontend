import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { EV_DAY_KEYS, useEvCodeTree, useEvDay, usePreviousAllocation } from "./useEvDay";
import { backendClient } from "@/lib/api/client";
import { BackendError } from "@/lib/api/unwrap";

// PLN-F2.1 · Saha okuma hook'ları (B2 uçları; `useEvBudget.test.tsx` deseni).
vi.mock("@/lib/api/client", () => ({
  backendClient: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() },
}));

const SITE = "site-1";
const DAY = "2026-09-24";

let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function ok(data: unknown) {
  return { data, error: undefined, response: new Response() } as never;
}

function fail(status: number, detail = "x") {
  return { data: undefined, error: { detail }, response: new Response(null, { status }) } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

describe("EV_DAY_KEYS — sorgu anahtarları tek sabitte", () => {
  it("üç kök birbirinden ve bütçe köklerinden ayrıdır", () => {
    const roots = Object.values(EV_DAY_KEYS);
    expect(new Set(roots).size).toBe(roots.length);
    expect(roots).not.toContain("ev-budget");
  });
});

describe("useEvDay", () => {
  it("GET /days/{day}; yanıt [gün kökü, site, gün] anahtarında", async () => {
    const view = { day: DAY, rows: [], lock: { locked: false } };
    vi.mocked(backendClient.GET).mockResolvedValue(ok(view));
    const { result } = renderHook(() => useEvDay(SITE, DAY), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/sites/{site_id}/earned-value/days/{day}", {
      params: { path: { site_id: SITE, day: DAY } },
    });
    expect(client.getQueryData([EV_DAY_KEYS.day, SITE, DAY])).toEqual(view);
  });

  it("boş şantiye ya da boş gün ile ağa çıkmaz", () => {
    renderHook(() => useEvDay("", DAY), { wrapper });
    renderHook(() => useEvDay(SITE, ""), { wrapper });
    expect(backendClient.GET).not.toHaveBeenCalled();
  });

  it("hata BackendError olarak yüzer (403 → izin yok dalı)", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(fail(403));
    const { result } = renderHook(() => useEvDay(SITE, DAY), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(BackendError);
    expect((result.current.error as BackendError).status).toBe(403);
  });
});

describe("useEvCodeTree", () => {
  it("GET /code-tree; şantiye başına tek anahtar", async () => {
    const nodes = [{ id: "n1", parent_id: null, level: 1, code: "01", label: "Kaba", uom: null, has_rate: null, unit_mhr: null }];
    vi.mocked(backendClient.GET).mockResolvedValue(ok(nodes));
    const { result } = renderHook(() => useEvCodeTree(SITE), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/sites/{site_id}/earned-value/code-tree", {
      params: { path: { site_id: SITE } },
    });
    expect(client.getQueryData([EV_DAY_KEYS.codeTree, SITE])).toEqual(nodes);
  });

  it("`enabled: false` iken (popover kapalı) ağa çıkmaz", () => {
    renderHook(() => useEvCodeTree(SITE, false), { wrapper });
    expect(backendClient.GET).not.toHaveBeenCalled();
  });
});

describe("usePreviousAllocation", () => {
  it("GET /days/{day}/previous-allocation — yalnız istendiğinde (\"Dünkü dağılımı kopyala\")", async () => {
    const prev = { day: "2026-09-23", codes: [], rows: [] };
    vi.mocked(backendClient.GET).mockResolvedValue(ok(prev));
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => usePreviousAllocation(SITE, DAY, enabled),
      { wrapper, initialProps: { enabled: false } },
    );
    expect(backendClient.GET).not.toHaveBeenCalled();
    rerender({ enabled: true });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith(
      "/sites/{site_id}/earned-value/days/{day}/previous-allocation",
      { params: { path: { site_id: SITE, day: DAY } } },
    );
    expect(client.getQueryData([EV_DAY_KEYS.previousAllocation, SITE, DAY])).toEqual(prev);
  });
});
