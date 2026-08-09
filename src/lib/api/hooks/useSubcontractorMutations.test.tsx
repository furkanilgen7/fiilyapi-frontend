import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useCreateSubcontractor, useUpdateSubcontractor } from "./useSubcontractorMutations";
import { SUBCONTRACTORS_QUERY_KEY } from "./useSubcontractors";
import { backendClient } from "@/lib/api/client";

vi.mock("@/lib/api/client", () => ({ backendClient: { POST: vi.fn(), PATCH: vi.fn() } }));

let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const CREATED = {
  id: "sub-9",
  name: "Yılmaz Boya A.Ş.",
  tax_number: "1234567890",
  contact_person: null,
  phone: null,
  email: null,
  category: "Boya",
  is_active: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
});

describe("useCreateSubcontractor", () => {
  it("gövdeyi POST /subcontractors'a gönderir ve taşeron listesini geçersiz kılar", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue({
      data: CREATED,
      error: undefined,
      response: new Response(),
    } as never);
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useCreateSubcontractor(), { wrapper });
    act(() =>
      result.current.mutate({
        name: "Yılmaz Boya A.Ş.",
        tax_number: "1234567890",
        contact_person: null,
        phone: null,
        email: null,
        category: "Boya",
        is_active: true,
      }),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.POST).toHaveBeenCalledWith("/subcontractors", {
      body: expect.objectContaining({ name: "Yılmaz Boya A.Ş." }),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [SUBCONTRACTORS_QUERY_KEY] });
  });

  it("backend hatasında liste geçersiz KILINMAZ", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue({
      data: undefined,
      error: { detail: "Bu vergi numarası zaten kayıtlı." },
      response: new Response(null, { status: 422 }),
    } as never);
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useCreateSubcontractor(), { wrapper });
    act(() => result.current.mutate({ name: "X" } as never));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});

describe("useUpdateSubcontractor", () => {
  it("kimliği yola koyar, kısmi gövde gönderir, listeyi geçersiz kılar", async () => {
    vi.mocked(backendClient.PATCH).mockResolvedValue({
      data: { ...CREATED, category: "Boya/İzolasyon" },
      error: undefined,
      response: new Response(),
    } as never);
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useUpdateSubcontractor("sub-9"), { wrapper });
    act(() => result.current.mutate({ category: "Boya/İzolasyon" } as never));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.PATCH).toHaveBeenCalledWith("/subcontractors/{subcontractor_id}", {
      params: { path: { subcontractor_id: "sub-9" } },
      body: { category: "Boya/İzolasyon" },
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [SUBCONTRACTORS_QUERY_KEY] });
  });
});
