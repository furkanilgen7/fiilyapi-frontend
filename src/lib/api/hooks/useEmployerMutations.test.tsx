import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useCreateEmployer } from "./useEmployerMutations";
import { EMPLOYERS_QUERY_KEY } from "./useEmployers";
import { backendClient } from "@/lib/api/client";
import { BackendError } from "@/lib/api/unwrap";

vi.mock("@/lib/api/client", () => ({ backendClient: { POST: vi.fn() } }));

function spyOnInvalidate(client: QueryClient) {
  return vi.spyOn(client, "invalidateQueries");
}

describe("useCreateEmployer", () => {
  let client: QueryClient;
  let invalidateSpy: ReturnType<typeof spyOnInvalidate>;

  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    invalidateSpy = spyOnInvalidate(client);
  });

  it("basari yolunda isveren listesini gecersiz kilar", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue({
      data: { id: "e-1", name: "ABC İnşaat", tax_number: null, contact_person: null, is_active: true },
      error: undefined,
      response: new Response(),
    } as never);

    const { result } = renderHook(() => useCreateEmployer(), { wrapper });
    act(() => result.current.mutate({ name: "ABC İnşaat" } as never));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(backendClient.POST).toHaveBeenCalledWith("/employers", { body: { name: "ABC İnşaat" } });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [EMPLOYERS_QUERY_KEY] });
  });

  it("ayni VKN icin 409 dondugunde BackendError olarak cagirana ulasir", async () => {
    const detail = { detail: "Bu VKN ile kayıtlı bir işveren zaten var." };
    vi.mocked(backendClient.POST).mockResolvedValue({
      data: undefined,
      error: detail,
      response: new Response(null, { status: 409 }),
    } as never);

    const { result } = renderHook(() => useCreateEmployer(), { wrapper });
    act(() =>
      result.current.mutate({ name: "ABC İnşaat", tax_number: "1234567890" } as never),
    );

    await waitFor(() => expect(result.current.isError).toBe(true));

    const error = result.current.error;
    expect(error).toBeInstanceOf(BackendError);
    expect((error as BackendError).status).toBe(409);
    expect((error as BackendError).body).toEqual(detail);
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
