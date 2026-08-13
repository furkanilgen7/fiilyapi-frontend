import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useCreatePersonnel, useUpdatePersonnel } from "./usePersonnelMutations";
import { PERSONNEL_QUERY_KEY } from "./usePersonnel";
import { PERSONNEL_DETAIL_QUERY_KEY } from "./usePersonnelDetail";
import { backendClient } from "@/lib/api/client";
import { BackendError } from "@/lib/api/unwrap";

// F-PT T1 · personel olusturma (`useEmployerMutations.test.tsx` deseni).
vi.mock("@/lib/api/client", () => ({
  backendClient: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() },
}));

const CREATED = {
  id: "per-9",
  full_name: "Hasan Demirci",
  trade: "Demirci",
  source: "company",
  subcontractor_id: null,
  user_id: null,
  is_active: true,
};

function spyOnInvalidate(queryClient: QueryClient) {
  return vi.spyOn(queryClient, "invalidateQueries");
}

let client: QueryClient;
let invalidateSpy: ReturnType<typeof spyOnInvalidate>;

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
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  invalidateSpy = spyOnInvalidate(client);
});

describe("useCreatePersonnel", () => {
  it("POST /personnel cagirir; govde AYNEN gecirilir", async () => {
    // Arrange
    vi.mocked(backendClient.POST).mockResolvedValue(okResponse(CREATED));
    const body = {
      full_name: "Hasan Demirci",
      trade: "Demirci",
      source: "company" as const,
      is_active: true,
      is_draft: false,
    };

    // Act
    const { result } = renderHook(() => useCreatePersonnel(), { wrapper });
    const created = await act(async () => result.current.mutateAsync(body));

    // Assert
    expect(backendClient.POST).toHaveBeenCalledWith("/personnel", { body });
    expect(created).toEqual(CREATED);
  });

  it("basarida personel listesini gecersiz kilar", async () => {
    // Arrange
    vi.mocked(backendClient.POST).mockResolvedValue(okResponse(CREATED));

    // Act
    const { result } = renderHook(() => useCreatePersonnel(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        full_name: "Hasan Demirci",
        source: "company",
        is_active: true,
        is_draft: false,
      });
    });

    // Assert
    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [PERSONNEL_QUERY_KEY] }),
    );
  });

  it("422 YUTULMAZ — BackendError cagirana ulasir", async () => {
    // Arrange
    vi.mocked(backendClient.POST).mockResolvedValue(
      errorResponse(422, "taşeron kaynağı için taşeron seçilmeli"),
    );

    // Act
    const { result } = renderHook(() => useCreatePersonnel(), { wrapper });
    const error = await act(async () =>
      result.current
        .mutateAsync({ full_name: "X", source: "subcontractor", is_active: true, is_draft: false })
        .catch((err: unknown) => err),
    );

    // Assert
    expect(error).toBeInstanceOf(BackendError);
    expect((error as BackendError).status).toBe(422);
  });
});

// F-PT2 T1 · Personel Detay düzenleme kipinin PATCH ucu (`useUpdateSection`
// deseni: hem liste HEM detay sorgusu gecersiz kilinir).
describe("useUpdatePersonnel", () => {
  it("PATCH /personnel/{personnel_id} cagirir; govde AYNEN gecirilir", async () => {
    // Arrange
    vi.mocked(backendClient.PATCH).mockResolvedValue(okResponse({ ...CREATED, id: "per-1" }));
    const body = { trade: "Sıvacı" };

    // Act
    const { result } = renderHook(() => useUpdatePersonnel("per-1"), { wrapper });
    const updated = await act(async () => result.current.mutateAsync(body));

    // Assert
    expect(backendClient.PATCH).toHaveBeenCalledWith("/personnel/{personnel_id}", {
      params: { path: { personnel_id: "per-1" } },
      body,
    });
    expect(updated).toEqual({ ...CREATED, id: "per-1" });
  });

  it("basarida HEM personel listesini HEM detayini gecersiz kilar", async () => {
    // Arrange
    vi.mocked(backendClient.PATCH).mockResolvedValue(okResponse({ ...CREATED, id: "per-1" }));

    // Act
    const { result } = renderHook(() => useUpdatePersonnel("per-1"), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ trade: "Sıvacı" });
    });

    // Assert
    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [PERSONNEL_QUERY_KEY] }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: [PERSONNEL_DETAIL_QUERY_KEY, "per-1"],
    });
  });

  it("422 YUTULMAZ — BackendError cagirana ulasir; hicbir sorgu gecersiz kilinmaz", async () => {
    // Arrange
    vi.mocked(backendClient.PATCH).mockResolvedValue(
      errorResponse(422, "taşeron kaynağı için taşeron seçilmeli"),
    );

    // Act
    const { result } = renderHook(() => useUpdatePersonnel("per-1"), { wrapper });
    const error = await act(async () =>
      result.current.mutateAsync({ source: "subcontractor" }).catch((err: unknown) => err),
    );

    // Assert
    expect(error).toBeInstanceOf(BackendError);
    expect((error as BackendError).status).toBe(422);
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
