import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import {
  useCreateSale,
  useGenerateSalePlan,
  useSaveSaleInstallments,
} from "./useSaleMutations";
import { SALES_QUERY_KEY, SALE_QUERY_KEY } from "./useSales";
import { SALES_SUMMARY_QUERY_KEY } from "./useSalesSummary";
import { SALE_INSTALLMENTS_QUERY_KEY } from "./useSaleInstallments";
import { backendClient } from "@/lib/api/client";
import { BackendError } from "@/lib/api/unwrap";

// F-P8 T1 · satis YAZMA hook'lari (`useStockMutations.test.tsx` deseni).
vi.mock("@/lib/api/client", () => ({
  backendClient: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() },
}));

const PLAN = {
  sale_id: "sale-1",
  sale_price: "1200000.00",
  total_amount: "1200000.00",
  paid_amount: "0.00",
  term_interest_amount: "0.00",
  items: [
    {
      id: "inst-1",
      sale_id: "sale-1",
      sequence_no: 1,
      label: "1. Taksit",
      due_date: "2026-09-05",
      amount: "600000.00",
      payment_method: null,
      paid_amount: "0.00",
      paid_at: null,
      remaining_amount: "600000.00",
      is_overdue: false,
    },
    {
      id: "inst-2",
      sale_id: "sale-1",
      sequence_no: 2,
      label: "2. Taksit",
      due_date: "2026-10-05",
      amount: "600000.00",
      payment_method: null,
      paid_amount: "0.00",
      paid_at: null,
      remaining_amount: "600000.00",
      is_overdue: false,
    },
  ],
};

let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function okResponse(data: unknown) {
  return { data, error: undefined, response: new Response() } as never;
}

function errorResponse(status: number, detail: string) {
  return { data: undefined, error: { detail }, response: new Response(null, { status }) } as never;
}

const DERIVED_KEYS = [
  SALES_QUERY_KEY,
  SALES_SUMMARY_QUERY_KEY,
  SALE_QUERY_KEY,
  SALE_INSTALLMENTS_QUERY_KEY,
];

beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

describe("useCreateSale", () => {
  it("POST /projects/{project_id}/sales cagirir ve DORT turevi de gecersiz kilar", async () => {
    // Arrange
    vi.mocked(backendClient.POST).mockResolvedValue(okResponse({ id: "sale-1" }));
    const invalidate = vi.spyOn(client, "invalidateQueries");

    // Act
    const { result } = renderHook(() => useCreateSale(), { wrapper });
    result.current.mutate({
      projectId: "p-1",
      body: {
        unit_id: "u-1",
        customer_id: "cus-1",
        sale_type: "sale",
        sale_price: "1200000.00",
        has_condominium_easement: false,
        has_mortgage: false,
      },
    });

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.POST).toHaveBeenCalledWith("/projects/{project_id}/sales", {
      params: { path: { project_id: "p-1" } },
      body: {
        unit_id: "u-1",
        customer_id: "cus-1",
        sale_type: "sale",
        sale_price: "1200000.00",
        has_condominium_easement: false,
        has_mortgage: false,
      },
    });
    for (const key of DERIVED_KEYS) {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: [key] });
    }
  });

  // P8: landowner unite → 422, acik satis → 409. Ikisi de YUTULMAZ.
  it.each([
    [422, "arsa sahibi ünitesi satılamaz"],
    [409, "bu ünitenin açık bir satışı var"],
  ])("%s hatasi cagirana BackendError olarak gider", async (status, detail) => {
    // Arrange
    vi.mocked(backendClient.POST).mockResolvedValue(errorResponse(status, detail));

    // Act
    const { result } = renderHook(() => useCreateSale(), { wrapper });
    result.current.mutate({
      projectId: "p-1",
      body: {
        unit_id: "u-1",
        customer_id: "cus-1",
        sale_type: "sale",
        sale_price: "1.00",
        has_condominium_easement: false,
        has_mortgage: false,
      },
    });

    // Assert
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as BackendError).status).toBe(status);
  });
});

describe("useGenerateSalePlan", () => {
  it("POST /sales/{sale_id}/generate-plan cagirir; GOVDE gondermez", async () => {
    // Arrange
    vi.mocked(backendClient.POST).mockResolvedValue(okResponse(PLAN));

    // Act
    const { result } = renderHook(() => useGenerateSalePlan(), { wrapper });
    result.current.mutate("sale-1");

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.POST).toHaveBeenCalledWith("/sales/{sale_id}/generate-plan", {
      params: { path: { sale_id: "sale-1" } },
    });
    expect(vi.mocked(backendClient.POST).mock.calls[0][1]).not.toHaveProperty("body");
  });

  // Kurus dengelemesi SUNUCUDA, son taksitte: Σ = sale_price.
  it("plan toplami satis bedeline esit doner (Σ kurali sunucudan)", async () => {
    // Arrange
    vi.mocked(backendClient.POST).mockResolvedValue(okResponse(PLAN));

    // Act
    const { result } = renderHook(() => useGenerateSalePlan(), { wrapper });
    result.current.mutate("sale-1");

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.total_amount).toBe(result.current.data?.sale_price);
  });
});

describe("useSaveSaleInstallments", () => {
  // 🛑 DEGISTIRME semantigi (spec K5): govde TAM plani tasir.
  it("PUT /sales/{sale_id}/installments cagirir; govde TAM plani tasir", async () => {
    // Arrange
    vi.mocked(backendClient.PUT).mockResolvedValue(okResponse(PLAN));
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const items = [
      { sequence_no: 1, label: "1. Taksit", due_date: "2026-09-05", amount: "600000.00" },
      { sequence_no: 2, label: "2. Taksit", due_date: "2026-10-05", amount: "600000.00" },
    ];

    // Act
    const { result } = renderHook(() => useSaveSaleInstallments(), { wrapper });
    result.current.mutate({ saleId: "sale-1", items });

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.PUT).toHaveBeenCalledWith("/sales/{sale_id}/installments", {
      params: { path: { sale_id: "sale-1" } },
      body: { items },
    });
    for (const key of DERIVED_KEYS) {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: [key] });
    }
  });

  it("odeme yontemi tasiyan satir govdede aynen gider", async () => {
    // Arrange
    vi.mocked(backendClient.PUT).mockResolvedValue(okResponse(PLAN));
    const items = [
      {
        sequence_no: 1,
        label: "Peşinat",
        due_date: "2026-09-05",
        amount: "1200000.00",
        payment_method: "cheque" as const,
      },
    ];

    // Act
    const { result } = renderHook(() => useSaveSaleInstallments(), { wrapper });
    result.current.mutate({ saleId: "sale-1", items });

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const body = vi.mocked(backendClient.PUT).mock.calls[0][1] as {
      body: { items: { payment_method?: string }[] };
    };
    expect(body.body.items[0].payment_method).toBe("cheque");
  });

  // Σ ihlali sunucuda 422 uretir; istemci kurus dengelemesi YAPMAZ.
  it("Σ ihlalinde 422 cagirana gider (istemci dengeleme yapmaz)", async () => {
    // Arrange
    vi.mocked(backendClient.PUT).mockResolvedValue(
      errorResponse(422, "plan toplamı satış bedeline eşit olmalı"),
    );

    // Act
    const { result } = renderHook(() => useSaveSaleInstallments(), { wrapper });
    result.current.mutate({
      saleId: "sale-1",
      items: [{ sequence_no: 1, label: "1. Taksit", due_date: "2026-09-05", amount: "1.00" }],
    });

    // Assert
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as BackendError).status).toBe(422);
  });
});

describe("F-P8 kapsam siniri (spec §2 / K3)", () => {
  // Satis DETAY ekrani YOK → durum aksiyonu / tahsilat hook'u YAZILMAZ.
  it("durum aksiyonu ve tahsilat hook'u DISA AKTARILMAZ", async () => {
    // Act
    const mutations = await import("./useSaleMutations");

    // Assert
    expect(Object.keys(mutations).sort()).toEqual([
      "useCreateSale",
      "useGenerateSalePlan",
      "useSaveSaleInstallments",
    ]);
  });
});
