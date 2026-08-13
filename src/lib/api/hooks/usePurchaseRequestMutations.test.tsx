import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import {
  useCreatePurchaseRequest,
  useSubmitPurchaseRequest,
  useUpdatePurchaseRequest,
  type PurchaseRequestCreate,
} from "./usePurchaseRequestMutations";
import {
  PURCHASE_REQUESTS_QUERY_KEY,
  PURCHASE_REQUEST_QUERY_KEY,
} from "./usePurchaseRequests";
import { PURCHASING_SUMMARY_QUERY_KEY } from "./usePurchasingSummary";
import { backendClient } from "@/lib/api/client";
import { BackendError } from "@/lib/api/unwrap";

// F-SA T1 · Talep yazma hook'lari (`useStockMutations.test.tsx` deseni).
vi.mock("@/lib/api/client", () => ({
  backendClient: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() },
}));

/**
 * FST gövdesi: BIR katalog kalemi + BIR serbest kalem. Serbest kalemin
 * `estimated_unit_price`i BILEREK `null` — NULL-ESIK KANONU'nun (SA dersi)
 * istemci tarafindaki karsiligi: fiyatsiz kalem "0 TL" DEGILDIR ve tahmini
 * toplama girmez.
 */
const REQUEST: PurchaseRequestCreate = {
  project_id: "p-1",
  request_date: "2026-08-12",
  priority: "urgent",
  site_id: "s-1",
  needed_by: "2026-08-25",
  justification: "Kalıp imalatı için acil.",
  lines: [
    { stock_item_id: "it-1", quantity: "50.000", estimated_unit_price: "1200.00" },
    { free_text_name: "Özel kalıp yağı", free_text_unit: "Litre", quantity: "20.000" },
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

function invalidatedKeys(spy: { mock: { calls: unknown[][] } }): string[] {
  return spy.mock.calls.map((call) => (call[0] as { queryKey: string[] }).queryKey[0]);
}

beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

describe("useCreatePurchaseRequest", () => {
  /**
   * Govde anahtar kumesi TAM iddia edilir (F-PT2 karari 5): kismi bir govde
   * sessizce alan dusurur ve veri yalani uretir. `request_no` GOVDEDE
   * OLMAMALIDIR — numarayi sunucu uretir.
   */
  it("POST /purchase-requests cagirir; govde AYNEN gecer, request_no KONMAZ", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue(okResponse({ id: "pr-9" }));

    const { result } = renderHook(() => useCreatePurchaseRequest(), { wrapper });
    result.current.mutate(REQUEST);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.POST).toHaveBeenCalledWith("/purchase-requests", { body: REQUEST });
    const sent = vi.mocked(backendClient.POST).mock.calls[0][1] as {
      body: Record<string, unknown>;
    };
    expect(Object.keys(sent.body).sort()).toEqual(
      [
        "project_id",
        "request_date",
        "priority",
        "site_id",
        "needed_by",
        "justification",
        "lines",
      ].sort(),
    );
    expect(sent.body).not.toHaveProperty("request_no");
  });

  /** Fiyatsiz serbest kalem govdede FIYATSIZ kalir — 0 uydurulmaz. */
  it("fiyatsiz kalem govdede fiyatsiz kalir (0 uydurulmaz)", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue(okResponse({ id: "pr-9" }));

    const { result } = renderHook(() => useCreatePurchaseRequest(), { wrapper });
    result.current.mutate(REQUEST);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const sent = vi.mocked(backendClient.POST).mock.calls[0][1] as { body: PurchaseRequestCreate };
    expect(sent.body.lines?.[1]).not.toHaveProperty("estimated_unit_price");
  });

  it("basarida liste + detay + KPI seridi birlikte gecersiz kilinir", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue(okResponse({ id: "pr-9" }));
    const invalidate = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useCreatePurchaseRequest(), { wrapper });
    result.current.mutate(REQUEST);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const keys = invalidatedKeys(invalidate);
    expect(keys).toContain(PURCHASE_REQUESTS_QUERY_KEY);
    expect(keys).toContain(PURCHASING_SUMMARY_QUERY_KEY);
    expect(keys).toContain(PURCHASE_REQUEST_QUERY_KEY);
  });

  it("422'de BackendError firlatir — hata YUTULMAZ", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue(errorResponse(422, "Miktar sıfır olamaz."));

    const { result } = renderHook(() => useCreatePurchaseRequest(), { wrapper });
    result.current.mutate(REQUEST);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as BackendError).status).toBe(422);
  });
});

describe("useUpdatePurchaseRequest", () => {
  it("PATCH yolunu path parametresiyle cagirir; govde AYNEN gecer", async () => {
    vi.mocked(backendClient.PATCH).mockResolvedValue(okResponse({ id: "pr-1" }));

    const { result } = renderHook(() => useUpdatePurchaseRequest("pr-1"), { wrapper });
    result.current.mutate({ priority: "critical" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.PATCH).toHaveBeenCalledWith("/purchase-requests/{request_id}", {
      params: { path: { request_id: "pr-1" } },
      body: { priority: "critical" },
    });
  });

  /**
   * `lines` KISMI DEGIL TAM DEGISTIRMEDIR: govdeye konursa dizi talebin
   * kalemleriyle YER DEGISTIRIR. Bu test o sozlesmeyi kapiya baglar —
   * yalnizca degisen satiri gondermek digerlerini SILER.
   */
  it("lines govdede TAM dizi olarak gecer (kismi satir gonderimi yok)", async () => {
    vi.mocked(backendClient.PATCH).mockResolvedValue(okResponse({ id: "pr-1" }));

    const { result } = renderHook(() => useUpdatePurchaseRequest("pr-1"), { wrapper });
    result.current.mutate({
      lines: [
        { stock_item_id: "it-1", quantity: "60.000", estimated_unit_price: "1250.00" },
        { free_text_name: "Özel kalıp yağı", free_text_unit: "Litre", quantity: "20.000" },
      ],
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const sent = vi.mocked(backendClient.PATCH).mock.calls[0][1] as {
      body: { lines?: unknown[] };
    };
    expect(sent.body.lines).toHaveLength(2);
  });

  /** Kalemler degismediyse `lines` anahtari govdeye HIC konmaz. */
  it("kalem degismediyse lines anahtari govdede BULUNMAZ", async () => {
    vi.mocked(backendClient.PATCH).mockResolvedValue(okResponse({ id: "pr-1" }));

    const { result } = renderHook(() => useUpdatePurchaseRequest("pr-1"), { wrapper });
    result.current.mutate({ justification: "Gerekçe güncellendi." });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const sent = vi.mocked(backendClient.PATCH).mock.calls[0][1] as {
      body: Record<string, unknown>;
    };
    expect(Object.keys(sent.body)).toEqual(["justification"]);
  });

  it("409'da BackendError firlatir (taslak disi talep duzenlenemez)", async () => {
    vi.mocked(backendClient.PATCH).mockResolvedValue(
      errorResponse(409, "Onaya gönderilmiş talep düzenlenemez."),
    );

    const { result } = renderHook(() => useUpdatePurchaseRequest("pr-1"), { wrapper });
    result.current.mutate({ priority: "normal" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as BackendError).status).toBe(409);
  });
});

describe("useSubmitPurchaseRequest", () => {
  it("GOVDESIZ POST atar; yalniz path parametresi tasinir", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue(
      okResponse({ id: "pr-1", status: "pending_approval" }),
    );

    const { result } = renderHook(() => useSubmitPurchaseRequest("pr-1"), { wrapper });
    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.POST).toHaveBeenCalledWith("/purchase-requests/{request_id}/submit", {
      params: { path: { request_id: "pr-1" } },
    });
    const sent = vi.mocked(backendClient.POST).mock.calls[0][1] as Record<string, unknown>;
    expect(sent).not.toHaveProperty("body");
  });

  it("basarida KPI seridi de gecersiz kilinir (Onay Bekleyen sayaci degisir)", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue(
      okResponse({ id: "pr-1", status: "pending_approval" }),
    );
    const invalidate = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useSubmitPurchaseRequest("pr-1"), { wrapper });
    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidatedKeys(invalidate)).toContain(PURCHASING_SUMMARY_QUERY_KEY);
  });

  /**
   * ₺500K esigi ve yetki SUNUCUDADIR: istemci gondermeden once kendi kapisini
   * KURMAZ, 403'u gorunur kilar.
   */
  it("403'te BackendError firlatir — esik/yetki kapisi SUNUCUDADIR", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue(
      errorResponse(403, "Bu tutarda talebi onaya gönderme yetkiniz yok."),
    );

    const { result } = renderHook(() => useSubmitPurchaseRequest("pr-1"), { wrapper });
    result.current.mutate();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as BackendError).status).toBe(403);
  });
});
