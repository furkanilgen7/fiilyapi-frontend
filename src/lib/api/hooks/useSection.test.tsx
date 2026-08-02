import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useSection } from "./useSection";
import { backendClient } from "@/lib/api/client";
import { BackendError } from "@/lib/api/unwrap";

vi.mock("@/lib/api/client", () => ({ backendClient: { GET: vi.fn() } }));

const SECTION_ID = "sec-1";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const DETAIL = {
  id: SECTION_ID,
  site_id: "s-1",
  code: "A-01",
  name: "Kat 6–10 Kaba İnşaat",
  status: "active",
  manager_name: "Sercan Öztürk",
  start_date: "2026-01-01",
  end_date: "2026-09-30",
  sort_order: 0,
};

describe("useSection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("bolum id ile detay govdesini ceker", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: DETAIL, error: undefined, response: new Response(),
    } as never);

    const { result } = renderHook(() => useSection(SECTION_ID), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.name).toBe("Kat 6–10 Kaba İnşaat");
    expect(backendClient.GET).toHaveBeenCalledWith("/sections/{section_id}", {
      params: { path: { section_id: SECTION_ID } },
    });
  });

  it("bos id ile aga cikmaz (kosullu drill kabugu senaryosu)", () => {
    const { result } = renderHook(() => useSection(""), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(backendClient.GET).not.toHaveBeenCalled();
  });

  it("backend hata verirse BackendError firlatir", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: undefined,
      error: { detail: "bolum yok" },
      response: new Response(null, { status: 404 }),
    } as never);

    const { result } = renderHook(() => useSection(SECTION_ID), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(BackendError);
  });
});
