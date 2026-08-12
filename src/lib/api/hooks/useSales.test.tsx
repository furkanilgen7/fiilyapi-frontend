import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useSales, useSale, SALES_QUERY_KEY, SALE_QUERY_KEY } from "./useSales";
import { useSalesSummary, SALES_SUMMARY_QUERY_KEY } from "./useSalesSummary";
import { useSaleInstallments, SALE_INSTALLMENTS_QUERY_KEY } from "./useSaleInstallments";
import { backendClient } from "@/lib/api/client";
import { BackendError } from "@/lib/api/unwrap";

// F-P8 T1 · satis okuma hook'lari (`useProgressPayments.test.tsx` deseni).
vi.mock("@/lib/api/client", () => ({
  backendClient: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() },
}));

const SALE = {
  id: "sale-1",
  project_id: "p-1",
  unit_id: "u-1",
  customer_id: "cus-1",
  sale_type: "sale" as const,
  status: "active" as const,
  block_name: "A Blok",
  unit_no: "12",
  unit_label: "A Blok · 12",
  customer_name: "Ayşe Yılmaz",
  customer_type: "person" as const,
  customer_national_id: "12345678901",
  customer_tax_number: null,
  list_price_snapshot: "2500000.00",
  discount_amount: "100000.00",
  sale_price: "2400000.00",
  vat_pct: "1.00",
  advisor_user_id: null,
  advisor_name: null,
  reservation_deposit: null,
  reservation_due_date: null,
  deed_condition: "full_payment" as const,
  planned_deed_date: null,
  delivery_date: null,
  has_condominium_easement: false,
  has_mortgage: false,
  late_fee_monthly_pct: "1.50",
  payment_plan_type: "down_payment_installments" as const,
  down_payment: "600000.00",
  installment_count: 12,
  first_installment_date: "2026-09-05",
  term_interest_pct: "0.80",
  paid_amount: "600000.00",
  remaining_amount: "1800000.00",
  installment_total: 12,
  installment_paid_count: 0,
  overdue_installment_count: 0,
};

const LIST = {
  totals: {
    count: 1,
    sale_price_total: "2400000.00",
    paid_total: "600000.00",
    remaining_total: "1800000.00",
  },
  items: [SALE],
};

const SUMMARY = {
  project_id: "p-1",
  as_of: "2026-08-12",
  sold: { count: 4, deed_transferred_count: 1, amount: "9600000.00" },
  reserved: { count: 2, expired_count: 1, amount: "800000.00" },
  available_units: { count: 7, list_price_total: "17500000.00" },
  collection: {
    collected_amount: "2400000.00",
    contracted_amount: "9600000.00",
    collection_pct: "25.00",
  },
  overdue: { installment_count: 3, amount: "450000.00", late_fee_amount: "6750.00" },
  upcoming_collections: [
    {
      installment_id: "inst-1",
      sale_id: "sale-1",
      unit_label: "A Blok · 12",
      customer_name: "Ayşe Yılmaz",
      sequence_no: 1,
      label: "1. Taksit",
      due_date: "2026-09-05",
      amount: "150000.00",
      paid_amount: "0.00",
      remaining_amount: "150000.00",
      is_overdue: false,
      days_overdue: 0,
      late_fee_amount: "0.00",
    },
  ],
  expired_reservations: [],
};

const PLAN = {
  sale_id: "sale-1",
  sale_price: "2400000.00",
  total_amount: "2400000.00",
  paid_amount: "600000.00",
  term_interest_amount: "19200.00",
  items: [
    {
      id: "inst-1",
      sale_id: "sale-1",
      sequence_no: 1,
      label: "1. Taksit",
      due_date: "2026-09-05",
      amount: "150000.00",
      payment_method: "transfer" as const,
      paid_amount: "0.00",
      paid_at: null,
      remaining_amount: "150000.00",
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

beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

describe("useSales", () => {
  it("GET /projects/{project_id}/sales cagirir", async () => {
    // Arrange
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(LIST));

    // Act
    const { result } = renderHook(() => useSales("p-1"), { wrapper });

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/projects/{project_id}/sales", {
      params: { path: { project_id: "p-1" } },
    });
    expect(client.getQueryData([SALES_QUERY_KEY, "p-1"])).toEqual(LIST);
  });

  // ⚠️ Uc HIC query parametresi ALMAZ: uydurma `status`/`limit` 422 uretirdi.
  it("query parametresi HIC gondermez (uc suzgecsiz + sayfasiz)", async () => {
    // Arrange
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(LIST));

    // Act
    const { result } = renderHook(() => useSales("p-1"), { wrapper });

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(vi.mocked(backendClient.GET).mock.calls[0][1]).not.toHaveProperty("params.query");
    expect(result.current.data).not.toHaveProperty("total");
    expect(result.current.data).not.toHaveProperty("limit");
  });

  // `totals` bir sayfalama alani DEGIL, tfoot toplamidir; sunucudan gelir.
  it("totals tfoot toplamidir ve items'ten yeniden hesaplanmaz", async () => {
    // Arrange
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(LIST));

    // Act
    const { result } = renderHook(() => useSales("p-1"), { wrapper });

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totals.sale_price_total).toBe("2400000.00");
    expect(result.current.data?.totals.count).toBe(1);
  });

  it("bos projectId ile aga CIKMAZ", () => {
    // Arrange
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(LIST));

    // Act
    renderHook(() => useSales(""), { wrapper });

    // Assert
    expect(backendClient.GET).not.toHaveBeenCalled();
  });

  it("403'te BackendError firlatir", async () => {
    // Arrange
    vi.mocked(backendClient.GET).mockResolvedValue(errorResponse(403, "yetkisiz"));

    // Act
    const { result } = renderHook(() => useSales("p-1"), { wrapper });

    // Assert
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as BackendError).status).toBe(403);
  });
});

describe("useSale", () => {
  it("GET /sales/{sale_id} cagirir", async () => {
    // Arrange
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(SALE));

    // Act
    const { result } = renderHook(() => useSale("sale-1"), { wrapper });

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/sales/{sale_id}", {
      params: { path: { sale_id: "sale-1" } },
    });
    expect(client.getQueryData([SALE_QUERY_KEY, "sale-1"])).toEqual(SALE);
  });

  it("bos saleId ile aga CIKMAZ", () => {
    // Act
    renderHook(() => useSale(""), { wrapper });

    // Assert
    expect(backendClient.GET).not.toHaveBeenCalled();
  });
});

describe("useSalesSummary", () => {
  it("GET /projects/{project_id}/sales/summary cagirir", async () => {
    // Arrange
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(SUMMARY));

    // Act
    const { result } = renderHook(() => useSalesSummary("p-1"), { wrapper });

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/projects/{project_id}/sales/summary", {
      params: { path: { project_id: "p-1" } },
    });
    expect(client.getQueryData([SALES_SUMMARY_QUERY_KEY, "p-1"])).toEqual(SUMMARY);
  });

  // SPEC K4: KPI'lar GERCEKTIR — "Bos" sayisi da bu uctan gelir, ayri bir
  // unite ucuna gidilmez ve hicbir KPI pending zarfa dusmez.
  it("bes KPI kutusunun kaynagi da bu tek uctadir (pending zarf YOK)", async () => {
    // Arrange
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(SUMMARY));

    // Act
    const { result } = renderHook(() => useSalesSummary("p-1"), { wrapper });

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.sold.count).toBe(4);
    expect(result.current.data?.reserved.count).toBe(2);
    expect(result.current.data?.available_units.count).toBe(7);
    expect(result.current.data?.collection.collection_pct).toBe("25.00");
    expect(result.current.data?.overdue.installment_count).toBe(3);
    // Yuzde SUNUCUDAN gelir; istemci collected/contracted bolmesi YAPMAZ.
    expect(backendClient.GET).toHaveBeenCalledTimes(1);
  });

  it("yaklasan tahsilatlarda gecikme faizi SUNUCU turevidir", async () => {
    // Arrange
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(SUMMARY));

    // Act
    const { result } = renderHook(() => useSalesSummary("p-1"), { wrapper });

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const upcoming = result.current.data?.upcoming_collections[0];
    expect(upcoming?.is_overdue).toBe(false);
    expect(upcoming?.days_overdue).toBe(0);
    expect(upcoming?.late_fee_amount).toBe("0.00");
  });

  it("bos projectId ile aga CIKMAZ", () => {
    // Act
    renderHook(() => useSalesSummary(""), { wrapper });

    // Assert
    expect(backendClient.GET).not.toHaveBeenCalled();
  });
});

describe("useSaleInstallments", () => {
  it("GET /sales/{sale_id}/installments cagirir", async () => {
    // Arrange
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(PLAN));

    // Act
    const { result } = renderHook(() => useSaleInstallments("sale-1"), { wrapper });

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/sales/{sale_id}/installments", {
      params: { path: { sale_id: "sale-1" } },
    });
    expect(client.getQueryData([SALE_INSTALLMENTS_QUERY_KEY, "sale-1"])).toEqual(PLAN);
  });

  // P8 karari: `term_interest_pct` plani SISIRMEZ → Σ = sale_price.
  it("plan toplami satis bedeline esittir; vade farki AYRI bilgi alanidir", async () => {
    // Arrange
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(PLAN));

    // Act
    const { result } = renderHook(() => useSaleInstallments("sale-1"), { wrapper });

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.total_amount).toBe(result.current.data?.sale_price);
    expect(result.current.data?.term_interest_amount).toBe("19200.00");
  });

  // Spec §1/DS'nin "pending hucre" ihtimali GERCEKLESMEDI.
  it("satir odeme yontemi semada GERCEKTIR (pending hucre degil)", async () => {
    // Arrange
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(PLAN));

    // Act
    const { result } = renderHook(() => useSaleInstallments("sale-1"), { wrapper });

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items[0].payment_method).toBe("transfer");
  });

  it("bos saleId ile aga CIKMAZ", () => {
    // Act
    renderHook(() => useSaleInstallments(""), { wrapper });

    // Assert
    expect(backendClient.GET).not.toHaveBeenCalled();
  });
});
