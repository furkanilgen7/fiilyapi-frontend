import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import {
  useEmployerDiarySuggestion,
  useSubcontractorDiarySuggestion,
} from "./useDiarySuggestion";
import { backendClient } from "@/lib/api/client";

// F-SD T6 · "Günlükten Doldur" öneri uçları (T1). En kritik davranış:
// `enabled: false` iken ÖNERİ ÇEKİLMEZ — form açılışında istek atmak hem
// gereksiz hem de kullanıcının elle girdiği satırların üzerine gelme riski.
vi.mock("@/lib/api/client", () => ({ backendClient: { GET: vi.fn() } }));

let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function okResponse(data: unknown) {
  return { data, error: undefined, response: new Response() } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

describe("useEmployerDiarySuggestion", () => {
  it("proje + dönem ile öneri ucunu çağırır", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(
      okResponse({ lines: [], skipped_unbridged_count: 0, reason: null }),
    );

    const { result } = renderHook(
      () => useEmployerDiarySuggestion("p-1", { year: 2026, month: 7, enabled: true }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith(
      "/projects/{project_id}/progress-payments/diary-suggestion",
      { params: { path: { project_id: "p-1" }, query: { year: 2026, month: 7 } } },
    );
  });

  it("enabled=false iken ağa ÇIKMAZ (butona basılmadan öneri çekilmez)", () => {
    renderHook(() => useEmployerDiarySuggestion("p-1", { year: 2026, month: 7, enabled: false }), {
      wrapper,
    });

    expect(backendClient.GET).not.toHaveBeenCalled();
  });

  it("boş `projectId` ile ağa çıkmaz", () => {
    renderHook(() => useEmployerDiarySuggestion("", { enabled: true }), { wrapper });

    expect(backendClient.GET).not.toHaveBeenCalled();
  });

  it("dönem verilmezse query BOŞ gider (uç kendi varsayılanını uygular)", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(
      okResponse({ lines: [], skipped_unbridged_count: 0, reason: null }),
    );

    const { result } = renderHook(() => useEmployerDiarySuggestion("p-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith(
      "/projects/{project_id}/progress-payments/diary-suggestion",
      { params: { path: { project_id: "p-1" }, query: {} } },
    );
  });
});

describe("useSubcontractorDiarySuggestion", () => {
  it("sözleşme + dönem ile öneri ucunu çağırır", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(
      okResponse({ site_id: "s-2", lines: [], skipped_unbridged_count: 0, reason: null }),
    );

    const { result } = renderHook(
      () => useSubcontractorDiarySuggestion("sc-2", { year: 2026, month: 7, enabled: true }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith(
      "/subcontractor-contracts/{contract_id}/progress-payments/diary-suggestion",
      { params: { path: { contract_id: "sc-2" }, query: { year: 2026, month: 7 } } },
    );
  });

  it("enabled=false iken ağa çıkmaz", () => {
    renderHook(() => useSubcontractorDiarySuggestion("sc-2", { enabled: false }), { wrapper });

    expect(backendClient.GET).not.toHaveBeenCalled();
  });

  it("boş `contractId` ile ağa çıkmaz", () => {
    renderHook(() => useSubcontractorDiarySuggestion("", { enabled: true }), { wrapper });

    expect(backendClient.GET).not.toHaveBeenCalled();
  });

  it("proje geneli sözleşmede yanıttaki `site_id` null gelir — hook onu OLDUĞU GİBİ taşır", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(
      okResponse({
        site_id: null,
        lines: [],
        skipped_unbridged_count: 0,
        reason: "Sözleşme bir şantiyeye bağlı değil.",
      }),
    );

    const { result } = renderHook(() => useSubcontractorDiarySuggestion("sc-9"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.site_id).toBeNull();
    expect(result.current.data?.reason).toBe("Sözleşme bir şantiyeye bağlı değil.");
  });
});
