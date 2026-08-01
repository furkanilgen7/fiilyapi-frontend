import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import {
  useProgressPayments,
  useProgressPayment,
  useProgressPaymentSummary,
  PROGRESS_PAYMENTS_QUERY_KEY,
  PROGRESS_PAYMENT_QUERY_KEY,
  PROGRESS_PAYMENT_SUMMARY_QUERY_KEY,
} from "./useProgressPayments";
import { backendClient } from "@/lib/api/client";

vi.mock("@/lib/api/client", () => ({ backendClient: { GET: vi.fn() } }));

const PAYMENT_ID = "pp-1";
const PROJECT_ID = "proj-1";

let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const LIST_RESPONSE = {
  items: [
    {
      id: PAYMENT_ID,
      project_id: PROJECT_ID,
      project_name: "Nirvana Konutları",
      sequence_no: 1,
      period_year: 2026,
      period_month: 7,
      description: "Temmuz hakedişi",
      status: "draft",
      gross_total: "1000000.00",
      net_total: "900000.00",
    },
  ],
  total: 1,
};

const SUMMARY_RESPONSE = {
  contract_amount: "5000000.00",
  cumulative_gross: "1000000.00",
  progress_pct: "20.00",
  advance_deduction_total: "100000.00",
  retention_total: "50000.00",
  net_total: "850000.00",
  payment_count: 1,
  pending_count: 0,
  remaining: "4000000.00",
};

beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

describe("useProgressPayments", () => {
  it("filtresiz istekte query boş gider", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: LIST_RESPONSE,
      error: undefined,
      response: new Response(),
    } as never);

    const { result } = renderHook(() => useProgressPayments(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(backendClient.GET).toHaveBeenCalledWith("/progress-payments", { params: { query: {} } });
    expect(result.current.data?.items).toHaveLength(1);
  });

  it("project_id/site_id/status filtrelerini query parametresine çevirir", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: LIST_RESPONSE,
      error: undefined,
      response: new Response(),
    } as never);

    const { result } = renderHook(
      () => useProgressPayments({ project_id: PROJECT_ID, site_id: "site-1", status: "draft" }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(backendClient.GET).toHaveBeenCalledWith("/progress-payments", {
      params: { query: { project_id: PROJECT_ID, site_id: "site-1", status: "draft" } },
    });
  });

  it("backend hatasında sorgu hataya düşer", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: undefined,
      error: { detail: "yetkiniz yok" },
      response: new Response(null, { status: 403 }),
    } as never);

    const { result } = renderHook(() => useProgressPayments(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useProgressPayment", () => {
  it("paymentId boşken ağa çıkmaz", () => {
    renderHook(() => useProgressPayment(""), { wrapper });
    expect(backendClient.GET).not.toHaveBeenCalled();
  });

  it("sorgu anahtarı ['progress-payment', paymentId] ve doğru uca gider", async () => {
    const detail = { id: PAYMENT_ID, project_id: PROJECT_ID };
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: detail,
      error: undefined,
      response: new Response(),
    } as never);

    const { result } = renderHook(() => useProgressPayment(PAYMENT_ID), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(backendClient.GET).toHaveBeenCalledWith("/progress-payments/{payment_id}", {
      params: { path: { payment_id: PAYMENT_ID } },
    });
    expect(PROGRESS_PAYMENT_QUERY_KEY).toBe("progress-payment");
    expect(client.getQueryData([PROGRESS_PAYMENT_QUERY_KEY, PAYMENT_ID])).toEqual(detail);
  });

  it("backend hatasında sorgu hataya düşer", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: undefined,
      error: { detail: "bulunamadı" },
      response: new Response(null, { status: 404 }),
    } as never);

    const { result } = renderHook(() => useProgressPayment(PAYMENT_ID), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useProgressPaymentSummary", () => {
  it("projectId boşken ağa çıkmaz", () => {
    renderHook(() => useProgressPaymentSummary(""), { wrapper });
    expect(backendClient.GET).not.toHaveBeenCalled();
  });

  it("sorgu anahtarı ['progress-payment-summary', projectId] ve doğru uca gider", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: SUMMARY_RESPONSE,
      error: undefined,
      response: new Response(),
    } as never);

    const { result } = renderHook(() => useProgressPaymentSummary(PROJECT_ID), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(backendClient.GET).toHaveBeenCalledWith("/projects/{project_id}/progress-payments/summary", {
      params: { path: { project_id: PROJECT_ID } },
    });
    expect(PROGRESS_PAYMENT_SUMMARY_QUERY_KEY).toBe("progress-payment-summary");
    expect(result.current.data?.payment_count).toBe(1);
  });

  it("backend hatasında sorgu hataya düşer", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: undefined,
      error: { detail: "yetkiniz yok" },
      response: new Response(null, { status: 403 }),
    } as never);

    const { result } = renderHook(() => useProgressPaymentSummary(PROJECT_ID), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// Kapı: PROGRESS_PAYMENTS_QUERY_KEY sabiti beklenen değeri taşır (mutasyon
// dosyasındaki gecersiz kilma bu degere baglidir).
it("PROGRESS_PAYMENTS_QUERY_KEY sabiti 'progress-payments'tir", () => {
  expect(PROGRESS_PAYMENTS_QUERY_KEY).toBe("progress-payments");
});
