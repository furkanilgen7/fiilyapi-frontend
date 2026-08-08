import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { usePersonnel, PERSONNEL_QUERY_KEY, PERSONNEL_MAX_LIMIT } from "./usePersonnel";
import { backendClient } from "@/lib/api/client";
import { BackendError } from "@/lib/api/unwrap";

// F-PT T1 · personel liste hook'u (`useEmployers.test.tsx` deseni).
vi.mock("@/lib/api/client", () => ({
  backendClient: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() },
}));

const LIST = {
  items: [
    {
      id: "per-1",
      full_name: "Mehmet Kılıç",
      trade: "Kalıpçı",
      source: "company",
      subcontractor_id: null,
      user_id: null,
      is_active: true,
    },
  ],
  total: 87,
  limit: 50,
  offset: 0,
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

describe("usePersonnel", () => {
  it("GET /personnel cagirir; filtre verilmediginde sorgu BOS gider", async () => {
    // Arrange
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(LIST));

    // Act
    const { result } = renderHook(() => usePersonnel(), { wrapper });

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/personnel", { params: { query: {} } });
    expect(
      client.getQueryData([PERSONNEL_QUERY_KEY, null, null, null, null, null, null]),
    ).toEqual(LIST);
  });

  it("filtre alanlari backend adlarina eslenir (subcontractorId → subcontractor_id)", async () => {
    // Arrange
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(LIST));

    // Act
    const { result } = renderHook(
      () =>
        usePersonnel({
          q: "kılıç",
          source: "subcontractor",
          subcontractorId: "sub-1",
          isActive: true,
          limit: PERSONNEL_MAX_LIMIT,
          offset: 0,
        }),
      { wrapper },
    );

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/personnel", {
      params: {
        query: {
          q: "kılıç",
          source: "subcontractor",
          subcontractor_id: "sub-1",
          is_active: true,
          limit: 200,
          offset: 0,
        },
      },
    });
  });

  it("isActive: false suzgeci ATLANMAZ (falsy alan sessizce dusmez)", async () => {
    // Arrange
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(LIST));

    // Act
    const { result } = renderHook(() => usePersonnel({ isActive: false, offset: 0 }), { wrapper });

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/personnel", {
      params: { query: { is_active: false, offset: 0 } },
    });
  });

  // ⚠️ F-TH dersi: `total` SAYFALAMA TAVANIDIR, `items.length` DEGIL.
  it("total sayfalama tavanidir; items.length ile ayni DEGILDIR", async () => {
    // Arrange
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(LIST));

    // Act
    const { result } = renderHook(() => usePersonnel({ limit: 50 }), { wrapper });

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.total).toBe(87);
    expect(result.current.data?.items).toHaveLength(1);
  });

  it("farkli filtreler AYRI sorgu anahtari uretir", async () => {
    // Arrange
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(LIST));

    // Act
    const { result: first } = renderHook(() => usePersonnel({ source: "company" }), { wrapper });
    await waitFor(() => expect(first.current.isSuccess).toBe(true));
    const { result: second } = renderHook(() => usePersonnel({ source: "general" }), { wrapper });
    await waitFor(() => expect(second.current.isSuccess).toBe(true));

    // Assert
    expect(backendClient.GET).toHaveBeenCalledTimes(2);
  });

  it("403'te BackendError firlatir", async () => {
    // Arrange
    vi.mocked(backendClient.GET).mockResolvedValue(errorResponse(403, "yetkisiz"));

    // Act
    const { result } = renderHook(() => usePersonnel(), { wrapper });

    // Assert
    await waitFor(() => expect(result.current.isError).toBe(true));
    const error = result.current.error as BackendError;
    expect(error).toBeInstanceOf(BackendError);
    expect(error.status).toBe(403);
  });
});
