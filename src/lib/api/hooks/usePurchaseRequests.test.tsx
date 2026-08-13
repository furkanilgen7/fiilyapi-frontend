import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { usePurchaseRequest, usePurchaseRequests } from "./usePurchaseRequests";
import { backendClient } from "@/lib/api/client";
import { BackendError } from "@/lib/api/unwrap";

// F-SA T1 · Talep okuma hook'lari (`useStockSummary.test.tsx` deseni).
vi.mock("@/lib/api/client", () => ({
  backendClient: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() },
}));

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

describe("usePurchaseRequests", () => {
  it("suzgecsiz cagrida query BOSTUR — uydurma parametre gonderilmez", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(
      okResponse({ items: [], total: 0, limit: 50, offset: 0 }),
    );

    const { result } = renderHook(() => usePurchaseRequests(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/purchase-requests", {
      params: { query: {} },
    });
  });

  /**
   * Spec §1'in UC suzgecinin UCU DE SUNUCUYA duser (openapi `parameters`:
   * status/project_id/priority/q/limit/offset). Istemcide suzulen hicbir sey
   * YOKTUR — bu test o karari kapiya baglar: biri istemciye kaydirilirsa
   * cagri govdesi degisir ve test kirilir.
   */
  it("tum suzgecler SUNUCU query'sine duser (istemcide suzme YOK)", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(
      okResponse({ items: [], total: 0, limit: 20, offset: 40 }),
    );

    const { result } = renderHook(
      () =>
        usePurchaseRequests({
          status: "quote_wait",
          projectId: "p-1",
          priority: "urgent",
          q: "çimento",
          limit: 20,
          offset: 40,
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/purchase-requests", {
      params: {
        query: {
          status: "quote_wait",
          project_id: "p-1",
          priority: "urgent",
          q: "çimento",
          limit: 20,
          offset: 40,
        },
      },
    });
  });

  /** K3: "Teklifler" sekmesi = SAT tablosunun `quote_wait` suzgulu hali. */
  it("teklif sekmesi ayri bir uc DEGIL, status=quote_wait suzgecidir", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(
      okResponse({ items: [], total: 0, limit: 50, offset: 0 }),
    );

    const { result } = renderHook(() => usePurchaseRequests({ status: "quote_wait" }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(vi.mocked(backendClient.GET).mock.calls[0][0]).toBe("/purchase-requests");
  });

  it("suzgec degisince query anahtari degisir (yeni istek atilir)", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(
      okResponse({ items: [], total: 0, limit: 50, offset: 0 }),
    );

    const { rerender, result } = renderHook(
      ({ status }: { status: "draft" | "ordered" }) => usePurchaseRequests({ status }),
      { wrapper, initialProps: { status: "draft" as "draft" | "ordered" } },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    rerender({ status: "ordered" });

    await waitFor(() => expect(backendClient.GET).toHaveBeenCalledTimes(2));
    expect(vi.mocked(backendClient.GET).mock.calls[1][1]).toEqual({
      params: { query: { status: "ordered" } },
    });
  });

  it("403'te BackendError firlatir — hata YUTULMAZ", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(errorResponse(403, "Yetkiniz yok."));

    const { result } = renderHook(() => usePurchaseRequests(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as BackendError).status).toBe(403);
  });
});

describe("usePurchaseRequest", () => {
  it("bos id ile aga CIKILMAZ", () => {
    renderHook(() => usePurchaseRequest(""), { wrapper });
    expect(backendClient.GET).not.toHaveBeenCalled();
  });

  it("dogru yol + path parametresiyle cagirir", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse({ id: "pr-1", lines: [] }));

    const { result } = renderHook(() => usePurchaseRequest("pr-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/purchase-requests/{request_id}", {
      params: { path: { request_id: "pr-1" } },
    });
  });

  it("404'te BackendError firlatir", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(errorResponse(404, "Talep bulunamadı."));

    const { result } = renderHook(() => usePurchaseRequest("yok"), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as BackendError).status).toBe(404);
  });
});
