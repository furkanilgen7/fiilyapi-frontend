import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useSiteSections } from "./useSiteSections";
import { backendClient } from "@/lib/api/client";
import { BackendError } from "@/lib/api/unwrap";

vi.mock("@/lib/api/client", () => ({ backendClient: { GET: vi.fn() } }));

const SITE_ID = "s-1";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const LIST = {
  counts: { planned: 0, active: 1, completed: 0 },
  items: [
    { id: "sec-1", code: "A-01", name: "Kat 6–10 Kaba", status: "active", sort_order: 0 },
  ],
};

describe("useSiteSections", () => {
  beforeEach(() => vi.clearAllMocks());

  it("santiye id ile bolum listesini ceker", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: LIST, error: undefined, response: new Response(),
    } as never);

    const { result } = renderHook(() => useSiteSections(SITE_ID), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items[0]?.name).toBe("Kat 6–10 Kaba");
    expect(backendClient.GET).toHaveBeenCalledWith("/sites/{site_id}/sections", {
      params: { path: { site_id: SITE_ID } },
    });
  });

  it("bos id ile aga cikmaz (kosullu drill kabugu senaryosu)", () => {
    const { result } = renderHook(() => useSiteSections(""), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(backendClient.GET).not.toHaveBeenCalled();
  });

  it("backend hata verirse BackendError firlatir", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: undefined,
      error: { detail: "santiye yok" },
      response: new Response(null, { status: 404 }),
    } as never);

    const { result } = renderHook(() => useSiteSections(SITE_ID), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(BackendError);
  });
});
