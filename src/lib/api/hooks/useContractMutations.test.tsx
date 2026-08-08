import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useSaveContractDistribution } from "./useContractMutations";
import {
  CONTRACT_DISTRIBUTION_QUERY_KEY,
  EMPLOYER_CONTRACT_QUERY_KEY,
  EMPLOYER_CONTRACT_ITEMS_QUERY_KEY,
} from "./useContract";
import { buildDistributionSaveBody } from "@/lib/contract-distribution-save";
import { backendClient } from "@/lib/api/client";

vi.mock("@/lib/api/client", () => ({ backendClient: { PUT: vi.fn() } }));

const PROJECT_ID = "p-1";

let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const SAVED_DISTRIBUTION = {
  sites: [{ id: "s-1", name: "A-Blok" }],
  groups: [],
  undistributed_item_count: 0,
  undistributed_item_names: [],
  site_summaries: [],
  distributed_item_count: 0,
  total_item_count: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
});

describe("useSaveContractDistribution", () => {
  it("gövdeyi PUT ile aynen gönderir (dönüştürme YAPMAZ — kural saf üreticide)", async () => {
    vi.mocked(backendClient.PUT).mockResolvedValue({
      data: SAVED_DISTRIBUTION,
      error: undefined,
      response: new Response(),
    } as never);

    // BİRLEŞTİRME gövdesi saf üreticiden gelir; hook onu bozmadan taşır.
    const { body } = buildDistributionSaveBody([
      { contractItemId: "ci-1", siteId: "s-1", value: "120" },
      { contractItemId: "ci-2", siteId: "s-1", value: "" },
    ]);

    const { result } = renderHook(() => useSaveContractDistribution(PROJECT_ID), { wrapper });
    act(() => result.current.mutate(body));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.PUT).toHaveBeenCalledWith(
      "/projects/{project_id}/contract/distribution",
      {
        params: { path: { project_id: PROJECT_ID } },
        body: {
          allocations: [
            { contract_item_id: "ci-1", site_id: "s-1", quantity: "120" },
            { contract_item_id: "ci-2", site_id: "s-1", quantity: null },
          ],
        },
      },
    );
  });

  it("başarıda yanıtı dağılım önbelleğine yazar ve türev okumaları geçersiz kılar", async () => {
    vi.mocked(backendClient.PUT).mockResolvedValue({
      data: SAVED_DISTRIBUTION,
      error: undefined,
      response: new Response(),
    } as never);
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useSaveContractDistribution(PROJECT_ID), { wrapper });
    act(() => result.current.mutate({ allocations: [] }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getQueryData([CONTRACT_DISTRIBUTION_QUERY_KEY, PROJECT_ID])).toEqual(
      SAVED_DISTRIBUTION,
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: [EMPLOYER_CONTRACT_ITEMS_QUERY_KEY, PROJECT_ID],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: [EMPLOYER_CONTRACT_QUERY_KEY, PROJECT_ID],
    });
  });

  it("backend 422'sinde hiçbir önbellek güncellenmez", async () => {
    vi.mocked(backendClient.PUT).mockResolvedValue({
      data: undefined,
      error: { detail: "Dağıtılan miktar sözleşme miktarını aşamaz." },
      response: new Response(null, { status: 422 }),
    } as never);
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useSaveContractDistribution(PROJECT_ID), { wrapper });
    act(() => result.current.mutate({ allocations: [] }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(client.getQueryData([CONTRACT_DISTRIBUTION_QUERY_KEY, PROJECT_ID])).toBeUndefined();
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
