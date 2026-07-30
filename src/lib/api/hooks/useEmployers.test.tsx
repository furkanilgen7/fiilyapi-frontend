import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useEmployers } from "./useEmployers";
import { backendClient } from "@/lib/api/client";

vi.mock("@/lib/api/client", () => ({ backendClient: { GET: vi.fn() } }));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useEmployers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("filtresiz cagrildiginda isveren listesini ceker", async () => {
    const response = {
      items: [
        { id: "e-1", name: "ABC İnşaat", tax_number: "1234567890", contact_person: null, is_active: true },
      ],
    };
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: response, error: undefined, response: new Response(),
    } as never);

    const { result } = renderHook(() => useEmployers(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toHaveLength(1);
    expect(backendClient.GET).toHaveBeenCalledWith("/employers", { params: { query: {} } });
  });

  it("q ve activeOnly verildiginde sorgu parametrelerine yansitir", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: { items: [] }, error: undefined, response: new Response(),
    } as never);

    const { result } = renderHook(() => useEmployers({ q: "ABC", activeOnly: false }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/employers", {
      params: { query: { q: "ABC", active_only: false } },
    });
  });
});
