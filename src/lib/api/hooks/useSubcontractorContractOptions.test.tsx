import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useSubcontractorContractOptions } from "./useSubcontractorContractOptions";
import { backendClient } from "@/lib/api/client";

vi.mock("@/lib/api/client", () => ({ backendClient: { GET: vi.fn() } }));

let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function contractListItem(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "sc-1",
    contract_no: "TSD-2026-01",
    subcontractor_name: "Aydın Elektrik Taah.",
    work_category: "Elektrik",
    project_id: "proj-1",
    project_name: "Kule A",
    site_id: "site-1",
    site_name: "A-Blok",
    status: "active",
    is_draft: false,
    ...overrides,
  };
}

function mockList(items: Record<string, unknown>[], total?: number) {
  vi.mocked(backendClient.GET).mockResolvedValue({
    data: { items, total: total ?? items.length, limit: 200, offset: 0 },
    error: undefined,
    response: new Response(),
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

describe("useSubcontractorContractOptions", () => {
  // F-P5 T1 — TB3 sayfalaması: AÇIK `limit` gönderilmezse sunucu varsayılanı
  // (50) yüzünden seçim kutusu sessizce kırpılırdı. Şema tavanı 200'dür
  // (openapi.json `limit.maximum`), daha büyüğü 422 verir.
  it("U1'e ŞEMA TAVANI kadar açık `limit` ile çıkar (sessiz 50 kırpması yok)", async () => {
    mockList([]);

    renderHook(() => useSubcontractorContractOptions(), { wrapper });

    await waitFor(() =>
      expect(backendClient.GET).toHaveBeenCalledWith("/subcontractor-contracts", {
        params: { query: { limit: 200 } },
      }),
    );
  });

  it("hiç hakedişi olmayan sözleşme de listede yer alır — eski sınır bitti", async () => {
    mockList([contractListItem({ id: "sc-3", subcontractor_name: "Yılmaz Boya A.Ş." })]);

    const { result } = renderHook(() => useSubcontractorContractOptions(), { wrapper });
    await waitFor(() => expect(result.current.options).toHaveLength(1));
    expect(result.current.options[0].contractId).toBe("sc-3");
  });

  it("taşeron adına göre alfabetik sıralar", async () => {
    mockList([
      contractListItem({ id: "sc-2", subcontractor_name: "Çelik İnşaat" }),
      contractListItem({ id: "sc-1", subcontractor_name: "Aydın Elektrik Taah." }),
    ]);

    const { result } = renderHook(() => useSubcontractorContractOptions(), { wrapper });

    await waitFor(() => expect(result.current.options).toHaveLength(2));
    expect(result.current.options.map((o) => o.contractId)).toEqual(["sc-1", "sc-2"]);
    expect(result.current.options[0]).toEqual({
      contractId: "sc-1",
      contractNo: "TSD-2026-01",
      subcontractorName: "Aydın Elektrik Taah.",
      projectId: "proj-1",
      projectName: "Kule A",
    });
  });

  it("subcontractor_name null ise boş string düşer, sızma olmaz", async () => {
    mockList([contractListItem({ subcontractor_name: null })]);

    const { result } = renderHook(() => useSubcontractorContractOptions(), { wrapper });

    await waitFor(() => expect(result.current.options).toHaveLength(1));
    expect(result.current.options[0].subcontractorName).toBe("");
  });

  it("dönüş tipinde ham liste öğesi alanları (ör. work_category, site_id) sızmaz", async () => {
    mockList([contractListItem()]);

    const { result } = renderHook(() => useSubcontractorContractOptions(), { wrapper });
    await waitFor(() => expect(result.current.options).toHaveLength(1));
    expect(Object.keys(result.current.options[0]).sort()).toEqual(
      ["contractId", "contractNo", "projectId", "projectName", "subcontractorName"].sort(),
    );
  });

  it("liste sunucu tavanında kırpıldıysa isPartial=true, truncation sızdırılır", async () => {
    mockList([contractListItem()], 315);

    const { result } = renderHook(() => useSubcontractorContractOptions(), { wrapper });

    await waitFor(() => expect(result.current.isPartial).toBe(true));
    expect(result.current.truncation).toEqual({
      isTruncated: true,
      shownCount: 1,
      totalCount: 315,
    });
  });

  it("kırpılma yoksa isPartial=false", async () => {
    mockList([contractListItem()]);

    const { result } = renderHook(() => useSubcontractorContractOptions(), { wrapper });

    await waitFor(() => expect(result.current.options).toHaveLength(1));
    expect(result.current.isPartial).toBe(false);
  });

  it("backend hatasında isError true olur", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: undefined,
      error: { detail: "yetkiniz yok" },
      response: new Response(null, { status: 403 }),
    } as never);

    const { result } = renderHook(() => useSubcontractorContractOptions(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.options).toEqual([]);
  });
});
