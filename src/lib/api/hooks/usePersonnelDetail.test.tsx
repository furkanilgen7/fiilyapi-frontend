import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { usePersonnelDetail, PERSONNEL_DETAIL_QUERY_KEY } from "./usePersonnelDetail";
import { backendClient } from "@/lib/api/client";
import { BackendError } from "@/lib/api/unwrap";

// F-PT2 T1 · personel detay hook'u (`useSection.ts` deseni: takma ad tipler,
// `unwrap`, bos id ile aga cikmama).
vi.mock("@/lib/api/client", () => ({ backendClient: { GET: vi.fn() } }));

const PERSONNEL_ID = "per-1";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const DETAIL = {
  id: PERSONNEL_ID,
  full_name: "Mehmet Kılıç",
  trade: "Kalıpçı",
  source: "company",
  subcontractor_id: null,
  user_id: null,
  is_active: true,
};

describe("usePersonnelDetail", () => {
  beforeEach(() => vi.clearAllMocks());

  it("personel id ile detay govdesini ceker", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: DETAIL,
      error: undefined,
      response: new Response(),
    } as never);

    const { result } = renderHook(() => usePersonnelDetail(PERSONNEL_ID), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.full_name).toBe("Mehmet Kılıç");
    expect(backendClient.GET).toHaveBeenCalledWith("/personnel/{personnel_id}", {
      params: { path: { personnel_id: PERSONNEL_ID } },
    });
  });

  it("bos id ile aga cikmaz", () => {
    const { result } = renderHook(() => usePersonnelDetail(""), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(backendClient.GET).not.toHaveBeenCalled();
  });

  it("backend hata verirse BackendError firlatir", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: undefined,
      error: { detail: "personel yok" },
      response: new Response(null, { status: 404 }),
    } as never);

    const { result } = renderHook(() => usePersonnelDetail(PERSONNEL_ID), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(BackendError);
  });

  it("sorgu anahtari personel id'sini tasir", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: DETAIL,
      error: undefined,
      response: new Response(),
    } as never);

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => usePersonnelDetail(PERSONNEL_ID), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getQueryData([PERSONNEL_DETAIL_QUERY_KEY, PERSONNEL_ID])).toEqual(DETAIL);
  });
});
