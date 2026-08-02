import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useCreateSection, useUpdateSection } from "./useSectionMutations";
import { SITE_QUERY_KEY } from "./useSites";
import { SECTION_QUERY_KEY } from "./useSection";
import { backendClient } from "@/lib/api/client";

vi.mock("@/lib/api/client", () => ({ backendClient: { POST: vi.fn(), PATCH: vi.fn() } }));

const SITE_ID = "s-1";

function spyOnInvalidate(client: QueryClient) {
  return vi.spyOn(client, "invalidateQueries");
}

// KOD INCELEME BULGUSU: SectionFormModal testi bu hook'u mockluyor, bu yuzden
// gecersiz kilma anahtari test edilmemisti. Bolum listesi VE hero sayaclari tek
// sorgudan (useSite) geldigi icin tek anahtar yeterlidir — davranis dogru,
// burada kilitleniyor.
describe("useCreateSection — onSuccess sorgu gecersiz kilma", () => {
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

  it("bolum olusturunca ['site', siteId] gecersiz kilinir", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue({
      data: { id: "sec-1", name: "Kat 6–10" }, error: undefined, response: new Response(),
    } as never);

    const { result } = renderHook(() => useCreateSection(SITE_ID), { wrapper });
    act(() => result.current.mutate({ name: "Kat 6–10" } as never));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(backendClient.POST).toHaveBeenCalledWith("/sites/{site_id}/sections", {
      params: { path: { site_id: SITE_ID } },
      body: { name: "Kat 6–10" },
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [SITE_QUERY_KEY, SITE_ID] });
    expect(invalidateSpy).toHaveBeenCalledTimes(1);
  });

  it("backend hata verirse hicbir sorgu gecersiz kilinmaz", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue({
      data: undefined,
      error: { detail: "patladi" },
      response: new Response(null, { status: 500 }),
    } as never);

    const { result } = renderHook(() => useCreateSection(SITE_ID), { wrapper });
    act(() => result.current.mutate({ name: "Kat 6–10" } as never));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});

describe("useUpdateSection — onSuccess sorgu gecersiz kilma", () => {
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

  it("govdeyi PATCH /sections/{section_id}'e gecirir ve bolum+santiye sorgularini gecersiz kilar", async () => {
    vi.mocked(backendClient.PATCH).mockResolvedValue({
      data: { id: "sec-1", site_id: SITE_ID, name: "Kat 6–10 (guncel)" },
      error: undefined,
      response: new Response(),
    } as never);

    const { result } = renderHook(() => useUpdateSection("sec-1"), { wrapper });
    act(() => result.current.mutate({ name: "Kat 6–10 (guncel)" } as never));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(backendClient.PATCH).toHaveBeenCalledWith("/sections/{section_id}", {
      params: { path: { section_id: "sec-1" } },
      body: { name: "Kat 6–10 (guncel)" },
    });
    // Santiye id'si SectionUpdate govdesinde YOK — yanittan (site_id) turetilir.
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [SECTION_QUERY_KEY, "sec-1"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [SITE_QUERY_KEY, SITE_ID] });
    expect(invalidateSpy).toHaveBeenCalledTimes(2);
  });

  it("backend hata verirse hicbir sorgu gecersiz kilinmaz", async () => {
    vi.mocked(backendClient.PATCH).mockResolvedValue({
      data: undefined,
      error: { detail: "Bölüm tipi seçiniz." },
      response: new Response(null, { status: 422 }),
    } as never);

    const { result } = renderHook(() => useUpdateSection("sec-1"), { wrapper });
    act(() => result.current.mutate({ is_draft: false } as never));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
