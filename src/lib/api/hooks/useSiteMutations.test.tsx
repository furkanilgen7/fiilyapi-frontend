import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useCreateSite } from "./useSiteMutations";
import { SITES_QUERY_KEY } from "./useSites";
import { PROJECT_QUERY_KEY } from "./useProjects";
import { backendClient } from "@/lib/api/client";

vi.mock("@/lib/api/client", () => ({ backendClient: { POST: vi.fn() } }));

const PROJECT_ID = "p-1";

function spyOnInvalidate(client: QueryClient) {
  return vi.spyOn(client, "invalidateQueries");
}

// KOD INCELEME BULGUSU: modal testleri bu hook'u mockluyor, dolayisiyla
// onSuccess'teki gecersiz kilma anahtarlari hicbir yerde dogrulanmiyordu.
// Davranis DOGRU — bu testler onu kilitler (yeni sadece kapsam).
describe("useCreateSite — onSuccess sorgu gecersiz kilma", () => {
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

  it("santiye olusturunca HEM ['sites', projectId] HEM ['project', projectId] gecersiz kilinir", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue({
      data: { id: "s-1", name: "A-Blok Şantiyesi" }, error: undefined, response: new Response(),
    } as never);

    const { result } = renderHook(() => useCreateSite(PROJECT_ID), { wrapper });
    act(() => result.current.mutate({ name: "A-Blok Şantiyesi" } as never));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(backendClient.POST).toHaveBeenCalledWith("/projects/{project_id}/sites", {
      params: { path: { project_id: PROJECT_ID } },
      body: { name: "A-Blok Şantiyesi" },
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [SITES_QUERY_KEY, PROJECT_ID] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [PROJECT_QUERY_KEY, PROJECT_ID] });
    expect(invalidateSpy).toHaveBeenCalledTimes(2);
  });

  it("backend hata verirse hicbir sorgu gecersiz kilinmaz", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue({
      data: undefined,
      error: { detail: "patladi" },
      response: new Response(null, { status: 500 }),
    } as never);

    const { result } = renderHook(() => useCreateSite(PROJECT_ID), { wrapper });
    act(() => result.current.mutate({ name: "A-Blok Şantiyesi" } as never));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
