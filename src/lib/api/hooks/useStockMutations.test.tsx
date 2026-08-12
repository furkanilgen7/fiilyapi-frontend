import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import {
  useCreateStockEntry,
  useCreateStockItem,
  useCreateWarehouse,
  type StockEntryCreate,
} from "./useStockMutations";
import { STOCK_ITEMS_QUERY_KEY } from "./useStockItems";
import { STOCK_SUMMARY_QUERY_KEY } from "./useStockSummary";
import { SITE_STOCK_QUERY_KEY } from "./useSiteStock";
import { WAREHOUSES_QUERY_KEY } from "./useWarehouses";
import { backendClient } from "@/lib/api/client";
import { BackendError } from "@/lib/api/unwrap";

// F-ST T1 · Stok yazma hook'lari (`useDocumentMutations.test.tsx` deseni).
vi.mock("@/lib/api/client", () => ({
  backendClient: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() },
}));

const ENTRY: StockEntryCreate = {
  entry_type: "purchase",
  entry_date: "2026-08-12",
  warehouse_id: "wh-1",
  lines: [{ item_id: "it-1", quantity: "5.000", unit_price: "1200.00", quality: "ok" }],
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

describe("useCreateStockEntry", () => {
  it("POST /stock/entries cagirir; govde AYNEN gecer", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue(okResponse({ id: "se-1" }));

    const { result } = renderHook(() => useCreateStockEntry(), { wrapper });
    result.current.mutate(ENTRY);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.POST).toHaveBeenCalledWith("/stock/entries", { body: ENTRY });
  });

  /**
   * Bakiye/durum TÜREVDİR: bir hareket yazıldığında E3 özeti, künye listesi ve
   * şantiye stok tablosunun ÜÇÜ de bayatlar. Biri unutulursa ekran eski
   * bakiyeyi basmaya devam eder.
   */
  it("basarida uc turev sorgu da gecersiz kilinir", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue(okResponse({ id: "se-1" }));
    const invalidate = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useCreateStockEntry(), { wrapper });
    result.current.mutate(ENTRY);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const keys = invalidate.mock.calls.map((call) => (call[0] as { queryKey: string[] }).queryKey[0]);
    expect(keys).toContain(STOCK_SUMMARY_QUERY_KEY);
    expect(keys).toContain(STOCK_ITEMS_QUERY_KEY);
    expect(keys).toContain(SITE_STOCK_QUERY_KEY);
  });

  /**
   * `transfer` gövdesinde `source_warehouse_id` ZORUNLUDUR ve ÇİFT BACAĞI
   * SUNUCU yazar — istemci ikinci bir çağrı YAPMAZ.
   */
  it("transfer govdesinde kaynak depo tasinir ve TEK cagri yapilir", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue(okResponse({ id: "se-2" }));

    const { result } = renderHook(() => useCreateStockEntry(), { wrapper });
    result.current.mutate({
      ...ENTRY,
      entry_type: "transfer",
      source_warehouse_id: "wh-0",
      lines: [{ item_id: "it-1", quantity: "3.000", quality: "ok" }],
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.POST).toHaveBeenCalledTimes(1);
    const body = vi.mocked(backendClient.POST).mock.calls[0][1] as { body: StockEntryCreate };
    expect(body.body.source_warehouse_id).toBe("wh-0");
  });

  /** ST §4b: gövde içi VARLIK referansı 404'tür ve hata YUTULMAZ. */
  it("404'te BackendError firlatir", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue(errorResponse(404, "Depo bulunamadı."));

    const { result } = renderHook(() => useCreateStockEntry(), { wrapper });
    result.current.mutate(ENTRY);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as BackendError).status).toBe(404);
  });

  /** ST §4b: biçim/kural ihlali 422'dir. */
  it("422'de BackendError firlatir", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue(errorResponse(422, "Miktar sıfır olamaz."));

    const { result } = renderHook(() => useCreateStockEntry(), { wrapper });
    result.current.mutate(ENTRY);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as BackendError).status).toBe(422);
  });
});

describe("useCreateStockItem", () => {
  it("POST /stock/items cagirir ve katalog sorgularini tazeler", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue(okResponse({ id: "it-9" }));
    const invalidate = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useCreateStockItem(), { wrapper });
    result.current.mutate({
      code: "SNK-0001",
      name: "Çimento",
      category: "structural",
      unit: "Torba",
      is_active: true,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.POST).toHaveBeenCalledWith("/stock/items", {
      body: {
        code: "SNK-0001",
        name: "Çimento",
        category: "structural",
        unit: "Torba",
        is_active: true,
      },
    });
    const keys = invalidate.mock.calls.map((call) => (call[0] as { queryKey: string[] }).queryKey[0]);
    expect(keys).toContain(STOCK_ITEMS_QUERY_KEY);
    expect(keys).toContain(STOCK_SUMMARY_QUERY_KEY);
  });
});

describe("useCreateWarehouse", () => {
  it("POST /warehouses cagirir ve depo listesini tazeler", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue(okResponse({ id: "wh-9" }));
    const invalidate = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useCreateWarehouse(), { wrapper });
    result.current.mutate({ name: "D-4 Ambar", site_id: "s-1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.POST).toHaveBeenCalledWith("/warehouses", {
      body: { name: "D-4 Ambar", site_id: "s-1" },
    });
    const keys = invalidate.mock.calls.map((call) => (call[0] as { queryKey: string[] }).queryKey[0]);
    expect(keys).toContain(WAREHOUSES_QUERY_KEY);
  });

  /** `site_id: null` MERKEZ DEPO demektir — kaza değil, sözleşmenin kendisi. */
  it("site_id null gonderilirse govdede AYNEN kalir (merkez depo)", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue(okResponse({ id: "wh-10" }));

    const { result } = renderHook(() => useCreateWarehouse(), { wrapper });
    result.current.mutate({ name: "Merkez Depo (Sincan)", site_id: null });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.POST).toHaveBeenCalledWith("/warehouses", {
      body: { name: "Merkez Depo (Sincan)", site_id: null },
    });
  });
});
