import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useCustomers, CUSTOMERS_QUERY_KEY } from "./useCustomers";
import { useCreateCustomer } from "./useCustomerMutations";
import { backendClient } from "@/lib/api/client";
import { BackendError } from "@/lib/api/unwrap";

// F-P8 T1 · musteri okuma + olusturma hook'lari (`usePersonnel.test.tsx` deseni).
vi.mock("@/lib/api/client", () => ({
  backendClient: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() },
}));

const CUSTOMER = {
  id: "cus-1",
  customer_type: "person" as const,
  name: "Ayşe Yılmaz",
  national_id: "12345678901",
  tax_number: null,
  phone: "0532 000 00 00",
  email: null,
  address: null,
};

const LIST = { items: [CUSTOMER] };

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

describe("useCustomers", () => {
  it("GET /customers cagirir; filtre verilmediginde sorgu BOS gider", async () => {
    // Arrange
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(LIST));

    // Act
    const { result } = renderHook(() => useCustomers(), { wrapper });

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/customers", { params: { query: {} } });
    expect(client.getQueryData([CUSTOMERS_QUERY_KEY, null])).toEqual(LIST);
  });

  it("q suzgeci sorguya gecer ve AYRI anahtar uretir", async () => {
    // Arrange
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(LIST));

    // Act
    const { result } = renderHook(() => useCustomers({ q: "yılmaz" }), { wrapper });

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/customers", {
      params: { query: { q: "yılmaz" } },
    });
    expect(client.getQueryData([CUSTOMERS_QUERY_KEY, "yılmaz"])).toEqual(LIST);
  });

  // ⚠️ Uc SAYFASIZDIR: uydurma `limit`/`offset` gondermek 422 uretir.
  it("sayfalama parametresi GONDERMEZ (uc sayfasiz)", async () => {
    // Arrange
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(LIST));

    // Act
    const { result } = renderHook(() => useCustomers(), { wrapper });

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const query = vi.mocked(backendClient.GET).mock.calls[0][1] as {
      params: { query: Record<string, unknown> };
    };
    expect(query.params.query).not.toHaveProperty("limit");
    expect(query.params.query).not.toHaveProperty("offset");
    expect(result.current.data).not.toHaveProperty("total");
  });

  it("403'te BackendError firlatir", async () => {
    // Arrange
    vi.mocked(backendClient.GET).mockResolvedValue(errorResponse(403, "yetkisiz"));

    // Act
    const { result } = renderHook(() => useCustomers(), { wrapper });

    // Assert
    await waitFor(() => expect(result.current.isError).toBe(true));
    const error = result.current.error as BackendError;
    expect(error).toBeInstanceOf(BackendError);
    expect(error.status).toBe(403);
  });
});

describe("useCreateCustomer", () => {
  it("POST /customers cagirir ve musteri listesini gecersiz kilar", async () => {
    // Arrange
    vi.mocked(backendClient.POST).mockResolvedValue(okResponse(CUSTOMER));
    const invalidate = vi.spyOn(client, "invalidateQueries");

    // Act
    const { result } = renderHook(() => useCreateCustomer(), { wrapper });
    result.current.mutate({ customer_type: "person", name: "Ayşe Yılmaz" });

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.POST).toHaveBeenCalledWith("/customers", {
      body: { customer_type: "person", name: "Ayşe Yılmaz" },
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: [CUSTOMERS_QUERY_KEY] });
  });

  it("422'de hata YUTULMAZ, BackendError cagirana gider", async () => {
    // Arrange
    vi.mocked(backendClient.POST).mockResolvedValue(errorResponse(422, "TCKN 11 hane olmalı"));

    // Act
    const { result } = renderHook(() => useCreateCustomer(), { wrapper });
    result.current.mutate({ customer_type: "person", name: "X", national_id: "1" });

    // Assert
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as BackendError).status).toBe(422);
  });
});
