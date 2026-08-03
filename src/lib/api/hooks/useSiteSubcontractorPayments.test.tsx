import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useSiteSubcontractorPayments } from "./useSiteSubcontractorPayments";
import { backendClient } from "@/lib/api/client";

vi.mock("@/lib/api/client", () => ({ backendClient: { GET: vi.fn() } }));

let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function paymentItem(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "scpp-1",
    contract_id: "sc-1",
    project_id: "proj-1",
    project_name: "Güneşkent A-Blok",
    subcontractor_name: "Akın İnşaat",
    contract_no: "TSD-2026-01",
    sequence_no: 47,
    period_year: 2026,
    period_month: 7,
    description: null,
    status: "pending_approval",
    section_id: null,
    created_at: "2026-07-01T00:00:00Z",
    gross_total: "1240000.00",
    net_total: "1016800.00",
    is_revision_required: false,
    ...overrides,
  };
}

function contract(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "sc-1",
    project_id: "proj-1",
    site_id: "site-1",
    subcontractor_id: "sub-1",
    subcontractor_name: "Akın İnşaat",
    work_category: "Betonarme İşleri",
    contract_no: "TSD-2026-01",
    ...overrides,
  };
}

function mockGet(handlers: {
  payments: Record<string, unknown>[];
  contracts: Record<string, Record<string, unknown>>;
}) {
  vi.mocked(backendClient.GET).mockImplementation(async (path: string, options?: unknown) => {
    if (path === "/subcontractor-progress-payments") {
      return {
        data: { items: handlers.payments, total: handlers.payments.length, limit: 200, offset: 0 },
        error: undefined,
        response: new Response(),
      } as never;
    }
    if (path === "/subcontractor-contracts/{contract_id}") {
      const contractId = (options as { params: { path: { contract_id: string } } }).params.path
        .contract_id;
      const found = handlers.contracts[contractId];
      if (!found) {
        return { data: undefined, error: "not found", response: new Response(null, { status: 404 }) } as never;
      }
      return { data: found, error: undefined, response: new Response() } as never;
    }
    throw new Error(`beklenmeyen uç: ${path}`);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

describe("useSiteSubcontractorPayments", () => {
  it("proje ucuna `project_id` ile çıkar, site_id EŞLEŞEN sözleşmenin hakedişini dahil eder", async () => {
    mockGet({
      payments: [paymentItem({ id: "scpp-1", contract_id: "sc-1" })],
      contracts: { "sc-1": contract({ site_id: "site-1" }) },
    });

    const { result } = renderHook(() => useSiteSubcontractorPayments("proj-1", "site-1"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.items[0]).toMatchObject({
      id: "scpp-1",
      contractId: "sc-1",
      subcontractorName: "Akın İnşaat",
      workCategory: "Betonarme İşleri",
    });
    expect(backendClient.GET).toHaveBeenCalledWith("/subcontractor-progress-payments", {
      params: { query: { project_id: "proj-1", limit: 200 } },
    });
  });

  it("site_id EŞLEŞMEYEN (başka şantiye) sözleşmenin hakedişini HARİÇ TUTAR", async () => {
    mockGet({
      payments: [paymentItem({ id: "scpp-2", contract_id: "sc-2" })],
      contracts: { "sc-2": contract({ id: "sc-2", site_id: "site-OTHER" }) },
    });

    const { result } = renderHook(() => useSiteSubcontractorPayments("proj-1", "site-1"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items).toHaveLength(0);
  });

  it("site_id NULL (proje-geneli sözleşme) hakedişini şantiye sekmesine DAHİL ETMEZ", async () => {
    mockGet({
      payments: [paymentItem({ id: "scpp-3", contract_id: "sc-3" })],
      contracts: { "sc-3": contract({ id: "sc-3", site_id: null }) },
    });

    const { result } = renderHook(() => useSiteSubcontractorPayments("proj-1", "site-1"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items).toHaveLength(0);
  });

  it("bazı sözleşme detayları hata verirse isPartial=true, o hakedişler HARİÇ TUTULUR", async () => {
    mockGet({
      payments: [
        paymentItem({ id: "scpp-1", contract_id: "sc-1" }),
        paymentItem({ id: "scpp-4", contract_id: "sc-4", subcontractor_name: "Yılmaz Elektrik" }),
      ],
      contracts: { "sc-1": contract({ site_id: "site-1" }) }, // sc-4 KASITLI eksik → 404
    });

    const { result } = renderHook(() => useSiteSubcontractorPayments("proj-1", "site-1"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isPartial).toBe(true));
    expect(result.current.failedContractCount).toBe(1);
    // sc-1 çözüldü ve site eşleşti → yine de listede kalır (kısmi hata TÜM
    // listeyi silmez, yalnız çözülemeyeni dışarıda bırakır + bayrak kaldırır).
    expect(result.current.items.map((i) => i.id)).toEqual(["scpp-1"]);
  });

  it("hakediş liste ucu hata verirse isError=true", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: undefined,
      error: "boom",
      response: new Response(null, { status: 500 }),
    } as never);

    const { result } = renderHook(() => useSiteSubcontractorPayments("proj-1", "site-1"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.items).toHaveLength(0);
  });

  it("aynı sözleşmeye ait BİRDEN ÇOK hakediş varsa sözleşme detayı YALNIZ BİR KEZ istenir (distinct + önbellek)", async () => {
    mockGet({
      payments: [
        paymentItem({ id: "scpp-1", contract_id: "sc-1" }),
        paymentItem({ id: "scpp-1b", contract_id: "sc-1" }),
      ],
      contracts: { "sc-1": contract({ site_id: "site-1" }) },
    });

    const { result } = renderHook(() => useSiteSubcontractorPayments("proj-1", "site-1"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.items).toHaveLength(2));
    const contractCalls = vi
      .mocked(backendClient.GET)
      .mock.calls.filter((call) => call[0] === "/subcontractor-contracts/{contract_id}");
    expect(contractCalls).toHaveLength(1);
  });
});
