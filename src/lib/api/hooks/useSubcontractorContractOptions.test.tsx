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

function listItem(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "scpp-x",
    contract_id: "sc-1",
    project_id: "proj-1",
    project_name: "Kule A",
    subcontractor_name: "Aydın Elektrik Taah.",
    contract_no: "TSD-2026-01",
    sequence_no: 1,
    period_year: 2026,
    period_month: 7,
    description: null,
    status: "draft",
    section_id: null,
    created_at: "2026-07-01T00:00:00Z",
    gross_total: "0.00",
    net_total: "0.00",
    is_revision_required: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

describe("useSubcontractorContractOptions", () => {
  it("hakediş listesinden limit:200 ile ağa çıkar", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: { items: [], total: 0, limit: 200, offset: 0 },
      error: undefined,
      response: new Response(),
    } as never);

    renderHook(() => useSubcontractorContractOptions(), { wrapper });

    await waitFor(() =>
      expect(backendClient.GET).toHaveBeenCalledWith("/subcontractor-progress-payments", {
        params: { query: { limit: 200 } },
      }),
    );
  });

  it("contract_id'ye göre tekilleştirir ve taşeron adına göre alfabetik sıralar", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: {
        items: [
          listItem({ id: "scpp-1", contract_id: "sc-2", subcontractor_name: "Çelik İnşaat" }),
          listItem({ id: "scpp-2", contract_id: "sc-1", subcontractor_name: "Aydın Elektrik Taah." }),
          // Aynı sözleşmenin ikinci hakedişi — tekilleştirilmeli.
          listItem({ id: "scpp-3", contract_id: "sc-1", subcontractor_name: "Aydın Elektrik Taah." }),
        ],
        total: 3,
        limit: 200,
        offset: 0,
      },
      error: undefined,
      response: new Response(),
    } as never);

    const { result } = renderHook(() => useSubcontractorContractOptions(), { wrapper });

    await waitFor(() => expect(result.current.options).toHaveLength(2));
    expect(result.current.options.map((o) => o.contractId)).toEqual(["sc-1", "sc-2"]);
    expect(result.current.options[0].subcontractorName).toBe("Aydın Elektrik Taah.");
    expect(result.current.options[0]).toEqual({
      contractId: "sc-1",
      contractNo: "TSD-2026-01",
      subcontractorName: "Aydın Elektrik Taah.",
      projectId: "proj-1",
      projectName: "Kule A",
    });
  });

  it("subcontractor_name null ise boş string düşer, sızma olmaz", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: {
        items: [listItem({ subcontractor_name: null })],
        total: 1,
        limit: 200,
        offset: 0,
      },
      error: undefined,
      response: new Response(),
    } as never);

    const { result } = renderHook(() => useSubcontractorContractOptions(), { wrapper });

    await waitFor(() => expect(result.current.options).toHaveLength(1));
    expect(result.current.options[0].subcontractorName).toBe("");
  });

  it("isDerivedFromPayments her zaman true — T3 bilgi notu için", () => {
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: { items: [], total: 0, limit: 200, offset: 0 },
      error: undefined,
      response: new Response(),
    } as never);

    const { result } = renderHook(() => useSubcontractorContractOptions(), { wrapper });
    expect(result.current.isDerivedFromPayments).toBe(true);
  });

  it("dönüş tipinde ham liste öğesi alanları (ör. gross_total) sızmaz", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: { items: [listItem()], total: 1, limit: 200, offset: 0 },
      error: undefined,
      response: new Response(),
    } as never);

    const { result } = renderHook(() => useSubcontractorContractOptions(), { wrapper });
    await waitFor(() => expect(result.current.options).toHaveLength(1));
    expect(Object.keys(result.current.options[0]).sort()).toEqual(
      ["contractId", "contractNo", "projectId", "projectName", "subcontractorName"].sort(),
    );
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
