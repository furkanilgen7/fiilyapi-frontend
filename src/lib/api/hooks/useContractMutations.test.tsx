import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import {
  useCreateEmployerContractItem,
  useSaveContractDistribution,
} from "./useContractMutations";
import {
  CONTRACT_DISTRIBUTION_QUERY_KEY,
  EMPLOYER_CONTRACT_QUERY_KEY,
  EMPLOYER_CONTRACT_ITEMS_QUERY_KEY,
} from "./useContract";
import { buildDistributionSaveBody } from "@/lib/contract-distribution-save";
import { backendClient } from "@/lib/api/client";

vi.mock("@/lib/api/client", () => ({ backendClient: { PUT: vi.fn(), POST: vi.fn() } }));

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

const CREATED_ITEM = {
  id: "iiiiiiii-0000-0000-0000-000000000009",
  group_id: "gggggggg-0000-0000-0000-000000000001",
  code: "03.012",
  description: "Perde betonu C30/37",
  unit: "m³",
  quantity: "1240.500",
  unit_price: "2850.75",
  sort_order: 11,
  distributed_quantity: "0.000",
  remaining_quantity: "1240.500",
};

const CREATE_BODY = {
  group_id: CREATED_ITEM.group_id,
  code: CREATED_ITEM.code,
  description: CREATED_ITEM.description,
  unit: CREATED_ITEM.unit,
  quantity: "1240.5",
  unit_price: "2850.75",
  sort_order: 11,
};

describe("useCreateEmployerContractItem", () => {
  it("gövdeyi proje kimliğiyle POST eder (decimal string BOZULMAZ)", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue({
      data: CREATED_ITEM,
      error: undefined,
      response: new Response(),
    } as never);

    const { result } = renderHook(() => useCreateEmployerContractItem(PROJECT_ID), { wrapper });
    act(() => result.current.mutate(CREATE_BODY));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.POST).toHaveBeenCalledWith("/projects/{project_id}/contract/items", {
      params: { path: { project_id: PROJECT_ID } },
      body: CREATE_BODY,
    });
  });

  it("başarıda kalem/dağıtım/sözleşme okumalarını geçersiz kılar", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue({
      data: CREATED_ITEM,
      error: undefined,
      response: new Response(),
    } as never);
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useCreateEmployerContractItem(PROJECT_ID), { wrapper });
    act(() => result.current.mutate(CREATE_BODY));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    for (const key of [
      EMPLOYER_CONTRACT_ITEMS_QUERY_KEY,
      CONTRACT_DISTRIBUTION_QUERY_KEY,
      EMPLOYER_CONTRACT_QUERY_KEY,
    ]) {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [key, PROJECT_ID] });
    }
  });

  it("backend hatasında hiçbir önbellek tazelenmez", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue({
      data: undefined,
      error: { detail: "Bu poz numarası zaten var." },
      response: new Response(null, { status: 409 }),
    } as never);
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useCreateEmployerContractItem(PROJECT_ID), { wrapper });
    act(() => result.current.mutate(CREATE_BODY));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
