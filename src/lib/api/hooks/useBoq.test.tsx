import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useBoq, BOQ_QUERY_KEY } from "./useBoq";
import { backendClient } from "@/lib/api/client";

vi.mock("@/lib/api/client", () => ({ backendClient: { GET: vi.fn() } }));

const SITE_ID = "s-1";

let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function placeholder() {
  return { available: false, value: null, pending_module: "contracts" };
}

const LIST_RESPONSE = {
  totals: {
    contract_total: placeholder(),
    realized_total: placeholder(),
    remaining_total: placeholder(),
    revision_total: placeholder(),
    grand_total: "12399900.00",
    grand_progress_pct: placeholder(),
  },
  groups: [
    {
      id: "g-1",
      name: "TOPRAK VE TEMEL İŞLERİ",
      sort_order: 10,
      group_total: "347200.00",
      items: [],
    },
  ],
};

describe("useBoq", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it("siteId boşken ağa çıkmaz", () => {
    renderHook(() => useBoq(""), { wrapper });
    expect(backendClient.GET).not.toHaveBeenCalled();
  });

  it("sorgu anahtarı ['boq', siteId]", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: LIST_RESPONSE,
      error: undefined,
      response: new Response(),
    } as never);

    const { result } = renderHook(() => useBoq(SITE_ID), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(BOQ_QUERY_KEY).toBe("boq");
    expect(client.getQueryData([BOQ_QUERY_KEY, SITE_ID])).toEqual(LIST_RESPONSE);
  });

  it("BoqListResponse gövdesini unwrap ile döndürür", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: LIST_RESPONSE,
      error: undefined,
      response: new Response(),
    } as never);

    const { result } = renderHook(() => useBoq(SITE_ID), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(backendClient.GET).toHaveBeenCalledWith("/sites/{site_id}/boq", {
      params: { path: { site_id: SITE_ID } },
    });
    expect(result.current.data?.totals.grand_total).toBe("12399900.00");
    expect(result.current.data?.groups).toHaveLength(1);
  });

  it("backend hatasında sorgu hataya düşer", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: undefined,
      error: { detail: "yetkiniz yok" },
      response: new Response(null, { status: 403 }),
    } as never);

    const { result } = renderHook(() => useBoq(SITE_ID), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
