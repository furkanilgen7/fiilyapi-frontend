import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import {
  useSubcontractorProgressPayments,
  useSubcontractorProgressPayment,
  useSubcontractorProgressPaymentSummary,
  useSubcontractorContract,
  SUBCONTRACTOR_PROGRESS_PAYMENTS_QUERY_KEY,
  SUBCONTRACTOR_PROGRESS_PAYMENT_QUERY_KEY,
  SUBCONTRACTOR_PROGRESS_PAYMENT_SUMMARY_QUERY_KEY,
  SUBCONTRACTOR_CONTRACT_QUERY_KEY,
} from "./useSubcontractorProgressPayments";
import { backendClient } from "@/lib/api/client";

vi.mock("@/lib/api/client", () => ({ backendClient: { GET: vi.fn() } }));

const PAYMENT_ID = "scpp-1";
const PROJECT_ID = "proj-1";
const CONTRACT_ID = "sc-1";

let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const LIST_RESPONSE = {
  items: [
    {
      id: PAYMENT_ID,
      contract_id: CONTRACT_ID,
      project_id: PROJECT_ID,
      project_name: "Kule A",
      subcontractor_name: "Aydın Elektrik Taah.",
      contract_no: "TSD-2026-01",
      sequence_no: 1,
      period_year: 2026,
      period_month: 7,
      description: "Temmuz hakedişi",
      status: "draft",
      section_id: null,
      created_at: "2026-07-01T00:00:00Z",
      gross_total: "100000.00",
      net_total: "90000.00",
      is_revision_required: false,
    },
  ],
  total: 1,
  limit: 50,
  offset: 0,
};

const SUMMARY_RESPONSE = {
  total_gross: "1000000.00",
  pending_gross: "200000.00",
  paid_period_gross: "300000.00",
  active_subcontractor_count: 3,
  period_year: 2026,
  period_month: 7,
};

beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

describe("useSubcontractorProgressPayments", () => {
  it("filtresiz istekte query boş gider", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: LIST_RESPONSE,
      error: undefined,
      response: new Response(),
    } as never);

    const { result } = renderHook(() => useSubcontractorProgressPayments(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(backendClient.GET).toHaveBeenCalledWith("/subcontractor-progress-payments", {
      params: { query: {} },
    });
    expect(result.current.data?.items).toHaveLength(1);
  });

  it("tum filtreleri (project_id/period_year/period_month/status/q/limit/offset) query parametresine cevirir", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: LIST_RESPONSE,
      error: undefined,
      response: new Response(),
    } as never);

    const { result } = renderHook(
      () =>
        useSubcontractorProgressPayments({
          project_id: PROJECT_ID,
          period_year: 2026,
          period_month: 7,
          status: "draft",
          q: "aydın",
          limit: 20,
          offset: 10,
        }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(backendClient.GET).toHaveBeenCalledWith("/subcontractor-progress-payments", {
      params: {
        query: {
          project_id: PROJECT_ID,
          period_year: 2026,
          period_month: 7,
          status: "draft",
          q: "aydın",
          limit: 20,
          offset: 10,
        },
      },
    });
  });

  it("backend hatasında sorgu hataya düşer", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: undefined,
      error: { detail: "yetkiniz yok" },
      response: new Response(null, { status: 403 }),
    } as never);

    const { result } = renderHook(() => useSubcontractorProgressPayments(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useSubcontractorProgressPayment", () => {
  it("paymentId boşken ağa çıkmaz", () => {
    renderHook(() => useSubcontractorProgressPayment(""), { wrapper });
    expect(backendClient.GET).not.toHaveBeenCalled();
  });

  it("sorgu anahtarı ['subcontractor-progress-payment', paymentId] ve doğru uca gider", async () => {
    const detail = { id: PAYMENT_ID, contract_id: CONTRACT_ID, project_id: PROJECT_ID };
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: detail,
      error: undefined,
      response: new Response(),
    } as never);

    const { result } = renderHook(() => useSubcontractorProgressPayment(PAYMENT_ID), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(backendClient.GET).toHaveBeenCalledWith("/subcontractor-progress-payments/{payment_id}", {
      params: { path: { payment_id: PAYMENT_ID } },
    });
    expect(SUBCONTRACTOR_PROGRESS_PAYMENT_QUERY_KEY).toBe("subcontractor-progress-payment");
    expect(client.getQueryData([SUBCONTRACTOR_PROGRESS_PAYMENT_QUERY_KEY, PAYMENT_ID])).toEqual(detail);
  });

  it("backend hatasında sorgu hataya düşer", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: undefined,
      error: { detail: "bulunamadı" },
      response: new Response(null, { status: 404 }),
    } as never);

    const { result } = renderHook(() => useSubcontractorProgressPayment(PAYMENT_ID), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useSubcontractorProgressPaymentSummary", () => {
  it("filtresiz istekte query boş gider", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: SUMMARY_RESPONSE,
      error: undefined,
      response: new Response(),
    } as never);

    const { result } = renderHook(() => useSubcontractorProgressPaymentSummary(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(backendClient.GET).toHaveBeenCalledWith("/subcontractor-progress-payments/summary", {
      params: { query: {} },
    });
    expect(SUBCONTRACTOR_PROGRESS_PAYMENT_SUMMARY_QUERY_KEY).toBe(
      "subcontractor-progress-payment-summary",
    );
    expect(result.current.data?.active_subcontractor_count).toBe(3);
  });

  it("project_id/status filtrelerini query parametresine cevirir", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: SUMMARY_RESPONSE,
      error: undefined,
      response: new Response(),
    } as never);

    const { result } = renderHook(
      () => useSubcontractorProgressPaymentSummary({ project_id: PROJECT_ID, status: "paid" }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(backendClient.GET).toHaveBeenCalledWith("/subcontractor-progress-payments/summary", {
      params: { query: { project_id: PROJECT_ID, status: "paid" } },
    });
  });

  it("backend hatasında sorgu hataya düşer", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: undefined,
      error: { detail: "yetkiniz yok" },
      response: new Response(null, { status: 403 }),
    } as never);

    const { result } = renderHook(() => useSubcontractorProgressPaymentSummary(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useSubcontractorContract", () => {
  it("contractId boşken ağa çıkmaz", () => {
    renderHook(() => useSubcontractorContract(""), { wrapper });
    expect(backendClient.GET).not.toHaveBeenCalled();
  });

  it("sorgu anahtarı ['subcontractor-contract', contractId] ve doğru uca gider", async () => {
    const detail = { id: CONTRACT_ID, project_id: PROJECT_ID };
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: detail,
      error: undefined,
      response: new Response(),
    } as never);

    const { result } = renderHook(() => useSubcontractorContract(CONTRACT_ID), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(backendClient.GET).toHaveBeenCalledWith("/subcontractor-contracts/{contract_id}", {
      params: { path: { contract_id: CONTRACT_ID } },
    });
    expect(SUBCONTRACTOR_CONTRACT_QUERY_KEY).toBe("subcontractor-contract");
  });

  it("backend hatasında sorgu hataya düşer", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: undefined,
      error: { detail: "bulunamadı" },
      response: new Response(null, { status: 404 }),
    } as never);

    const { result } = renderHook(() => useSubcontractorContract(CONTRACT_ID), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// Kapı: SUBCONTRACTOR_PROGRESS_PAYMENTS_QUERY_KEY sabiti beklenen değeri
// taşır (mutasyon dosyasındaki gecersiz kilma bu degere baglidir).
it("SUBCONTRACTOR_PROGRESS_PAYMENTS_QUERY_KEY sabiti 'subcontractor-progress-payments'tir", () => {
  expect(SUBCONTRACTOR_PROGRESS_PAYMENTS_QUERY_KEY).toBe("subcontractor-progress-payments");
});
