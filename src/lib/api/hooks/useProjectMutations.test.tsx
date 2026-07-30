import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useCreateProject } from "./useProjectMutations";
import { PROJECTS_QUERY_KEY } from "./useProjects";
import { backendClient } from "@/lib/api/client";

vi.mock("@/lib/api/client", () => ({ backendClient: { POST: vi.fn() } }));

const PROJECT_RESPONSE = { id: "p-1", name: "Yeni Proje" };

function spyOnInvalidate(client: QueryClient) {
  return vi.spyOn(client, "invalidateQueries");
}

describe("useCreateProject", () => {
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
    vi.mocked(backendClient.POST).mockResolvedValue({
      data: PROJECT_RESPONSE, error: undefined, response: new Response(),
    } as never);
  });

  it("yeni ProjectCreate govdesini (employer_id, contract, budget_lines, sites, is_draft) aynen iletir", async () => {
    const body = {
      name: "Yeni Proje",
      project_type: "taahhut",
      status: "planning",
      employer_id: "emp-1",
      contract: { contract_no: "SZ-1", advance_pct: 20, retainage_pct: 5, vat_pct: 20, has_price_escalation: false },
      budget_lines: { material: 0, labor: 0, subcontractor: 0, overhead: 0 },
      sites: [{ name: "A Şantiyesi" }],
      is_draft: true,
    };

    const { result } = renderHook(() => useCreateProject(), { wrapper });
    act(() => result.current.mutate(body as never));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(backendClient.POST).toHaveBeenCalledWith("/projects", { body });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [PROJECTS_QUERY_KEY] });
  });

  it("code bos string ise alan hic gonderilmez (undefined degil, tamamen yok)", async () => {
    const { result } = renderHook(() => useCreateProject(), { wrapper });
    act(() =>
      result.current.mutate({ code: "", name: "Yeni Proje", project_type: "taahhut", is_draft: true } as never),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(backendClient.POST).toHaveBeenCalledWith("/projects", {
      body: { name: "Yeni Proje", project_type: "taahhut", is_draft: true },
    });
  });

  it("code doluysa oldugu gibi (kirpilmis) iletilir", async () => {
    const { result } = renderHook(() => useCreateProject(), { wrapper });
    act(() =>
      result.current.mutate(
        { code: "  PRJ-2026-001  ", name: "Yeni Proje", project_type: "taahhut", is_draft: true } as never,
      ),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(backendClient.POST).toHaveBeenCalledWith("/projects", {
      body: { code: "PRJ-2026-001", name: "Yeni Proje", project_type: "taahhut", is_draft: true },
    });
  });
});
