import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import {
  useSubcontractorContractPayments,
  useSubcontractorPaymentLines,
} from "./useSubcontractorContractPayments";
import { backendClient } from "@/lib/api/client";

vi.mock("@/lib/api/client", () => ({ backendClient: { GET: vi.fn() } }));

let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function paymentItem(overrides: Record<string, unknown> = {}) {
  return {
    id: "scpp-1",
    contract_id: "sc-1",
    project_id: "p-1",
    project_name: "Güneşkent Konut",
    subcontractor_name: "Akın İnşaat",
    contract_no: "TSZ-2025-001",
    work_category: "Betonarme",
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

let lastListQuery: Record<string, unknown> | undefined;

function mockGet(items: Record<string, unknown>[], total: number) {
  vi.mocked(backendClient.GET).mockImplementation(
    async (path: string, options?: { params?: { query?: Record<string, unknown> } }) => {
      if (path === "/subcontractor-progress-payments") {
        lastListQuery = options?.params?.query;
        return { data: { items, total }, error: undefined, response: new Response() };
      }
      throw new Error(`beklenmeyen uç: ${path}`);
    },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  lastListQuery = undefined;
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

describe("useSubcontractorContractPayments", () => {
  it("proje kimliği yokken AĞA ÇIKMAZ (boş filtre TÜM projeleri çekerdi)", async () => {
    mockGet([], 0);
    renderHook(() => useSubcontractorContractPayments("sc-1", ""), { wrapper });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(backendClient.GET).not.toHaveBeenCalled();
  });

  it("sunucuda PROJE süzer, sözleşmeyi İSTEMCİDE süzer (uçta contract_id yok)", async () => {
    mockGet([paymentItem(), paymentItem({ id: "scpp-9", contract_id: "sc-2" })], 2);
    const { result } = renderHook(() => useSubcontractorContractPayments("sc-1", "p-1"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.items[0].id).toBe("scpp-1");
    expect(lastListQuery).toMatchObject({ project_id: "p-1" });
    expect(lastListQuery).not.toHaveProperty("contract_id");
  });

  it("şema tavanı AÇIKÇA gönderilir (varsayılan 50 sessizce kırpardı)", async () => {
    mockGet([paymentItem()], 1);
    const { result } = renderHook(() => useSubcontractorContractPayments("sc-1", "p-1"), {
      wrapper,
    });
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(lastListQuery).toMatchObject({ limit: 200 });
  });

  it("kümülatif brüt tüm hakedişlerin toplamıdır (mockup 74 aritmetiği)", async () => {
    mockGet(
      [
        paymentItem({ id: "a", gross_total: "1240000.00" }),
        paymentItem({ id: "b", sequence_no: 38, gross_total: "960000.00" }),
        paymentItem({ id: "c", sequence_no: 31, gross_total: "736000.00" }),
      ],
      3,
    );
    const { result } = renderHook(() => useSubcontractorContractPayments("sc-1", "p-1"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.items).toHaveLength(3));
    expect(Number(result.current.cumulativeGross)).toBe(2936000);
    // 199-201 sırası: en yeni önce.
    expect(result.current.items.map((item) => item.sequence_no)).toEqual([47, 38, 31]);
  });

  it("liste kırpıldıysa para değeri BASILMAZ (`null`) ve isPartial doğrudur", async () => {
    mockGet([paymentItem()], 260);
    const { result } = renderHook(() => useSubcontractorContractPayments("sc-1", "p-1"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isPartial).toBe(true));
    expect(result.current.cumulativeGross).toBeNull();
    expect(result.current.truncation.totalCount).toBe(260);
  });
});

describe("useSubcontractorPaymentLines", () => {
  it("kapalıyken ağa çıkmaz ve PENDING kalır", async () => {
    mockGet([], 0);
    const { result } = renderHook(() => useSubcontractorPaymentLines(["scpp-1"], false), {
      wrapper,
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(backendClient.GET).not.toHaveBeenCalled();
    expect(result.current.isPending).toBe(true);
    expect(result.current.lines).toEqual([]);
  });

  it("açıkken hakediş detaylarını PARALEL çeker ve satırları düzleştirir", async () => {
    vi.mocked(backendClient.GET).mockImplementation(
      async (path: string, options?: { params?: { path?: Record<string, string> } }) => {
        if (path === "/subcontractor-progress-payments/{payment_id}") {
          const id = options?.params?.path?.payment_id;
          return {
            data: { lines: [{ id: `l-${id}`, contract_item_id: "sci-1", quantity: "10.000" }] },
            error: undefined,
            response: new Response(),
          };
        }
        throw new Error(`beklenmeyen uç: ${path}`);
      },
    );

    const { result } = renderHook(
      () => useSubcontractorPaymentLines(["scpp-1", "scpp-2"], true),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.lines).toHaveLength(2);
    expect(backendClient.GET).toHaveBeenCalledTimes(2);
  });

  it("detaylardan biri HATA verirse yüzde basılmaz (PENDING kalır)", async () => {
    vi.mocked(backendClient.GET).mockImplementation(async () => ({
      data: undefined,
      error: { detail: "patladı" },
      response: new Response(null, { status: 500 }),
    }));

    const { result } = renderHook(() => useSubcontractorPaymentLines(["scpp-1"], true), {
      wrapper,
    });

    await waitFor(() => expect(backendClient.GET).toHaveBeenCalled());
    expect(result.current.isPending).toBe(true);
  });
});
