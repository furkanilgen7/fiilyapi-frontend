import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useContracts } from "./useContracts";
import { backendClient } from "@/lib/api/client";

vi.mock("@/lib/api/client", () => ({ backendClient: { GET: vi.fn() } }));

let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const LIST_RESPONSE = {
  summary: {
    total_amount: "125000000.00",
    active_count: 4,
    progress_payment_total: "48000000.00",
    expiring_this_month_count: 1,
  },
  items: [
    {
      id: "c-1",
      title: "Güneşkent Konut",
      contract_no: "SZL-2026-01",
      counterparty_name: "Emlak Konut",
      amount: "125000000.00",
      start_date: "2026-01-01",
      end_date: "2027-06-30",
      progress_pct: "36.20",
      status: "active",
      is_draft: false,
    },
  ],
};

function mockList() {
  vi.mocked(backendClient.GET).mockResolvedValue({
    data: LIST_RESPONSE,
    error: undefined,
    response: new Response(),
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

describe("useContracts", () => {
  it("zorunlu `type` parametresini her zaman gönderir", async () => {
    mockList();

    renderHook(() => useContracts({ type: "employer" }), { wrapper });

    await waitFor(() =>
      expect(backendClient.GET).toHaveBeenCalledWith("/contracts", {
        params: { query: { type: "employer" } },
      }),
    );
  });

  it("boş isteğe bağlı filtreler sorguya EKLENMEZ", async () => {
    mockList();

    renderHook(() => useContracts({ type: "subcontractor", q: "", project_id: "" }), { wrapper });

    await waitFor(() =>
      expect(backendClient.GET).toHaveBeenCalledWith("/contracts", {
        params: { query: { type: "subcontractor" } },
      }),
    );
  });

  it("dolu filtreler sorguya eklenir", async () => {
    mockList();

    renderHook(
      () => useContracts({ type: "subcontractor", project_id: "p-1", status: "active", q: "beton" }),
      { wrapper },
    );

    await waitFor(() =>
      expect(backendClient.GET).toHaveBeenCalledWith("/contracts", {
        params: {
          query: { type: "subcontractor", project_id: "p-1", status: "active", q: "beton" },
        },
      }),
    );
  });

  it("summary + items yanıtını olduğu gibi taşır", async () => {
    mockList();

    const { result } = renderHook(() => useContracts({ type: "employer" }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.summary.active_count).toBe(4);
    expect(result.current.data?.items).toHaveLength(1);
  });

  it("`type` değişince ayrı önbellek anahtarı kullanılır (yeni istek)", async () => {
    mockList();

    const { rerender } = renderHook(({ type }: { type: "employer" | "subcontractor" }) => useContracts({ type }), {
      wrapper,
      initialProps: { type: "employer" as "employer" | "subcontractor" },
    });
    await waitFor(() => expect(backendClient.GET).toHaveBeenCalledTimes(1));

    rerender({ type: "subcontractor" });
    await waitFor(() => expect(backendClient.GET).toHaveBeenCalledTimes(2));
  });

  it("backend hatasında isError true olur", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: undefined,
      error: { detail: "yetkiniz yok" },
      response: new Response(null, { status: 403 }),
    } as never);

    const { result } = renderHook(() => useContracts({ type: "employer" }), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
