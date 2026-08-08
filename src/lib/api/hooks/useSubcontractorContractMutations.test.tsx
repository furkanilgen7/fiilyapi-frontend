import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import {
  useCreateSubcontractorContract,
  useUpdateSubcontractorContract,
  useCreateSubcontractorContractItem,
  useUpdateSubcontractorContractItem,
  useDeleteSubcontractorContractItem,
  useLoadSubcontractorContractItemsFromEmployer,
} from "./useSubcontractorContractMutations";
import {
  SUBCONTRACTOR_CONTRACT_QUERY_KEY,
  SUBCONTRACTOR_CONTRACTS_LIST_QUERY_KEY,
} from "./useSubcontractorProgressPayments";
import { backendClient } from "@/lib/api/client";

vi.mock("@/lib/api/client", () => ({
  backendClient: { POST: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() },
}));

const PROJECT_ID = "p-1";
const CONTRACT_ID = "sc-1";

let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const CONTRACT_DETAIL = { id: CONTRACT_ID, project_id: PROJECT_ID, contract_total: "4820000.00" };
const ITEM = { id: "sci-1", contract_id: CONTRACT_ID, unit_price: "45.00" };

function ok(data: unknown, status = 200) {
  return { data, error: undefined, response: new Response(null, { status }) } as never;
}

function spyOnInvalidate(queryClient: QueryClient) {
  return vi.spyOn(queryClient, "invalidateQueries");
}

function expectContractInvalidated(spy: ReturnType<typeof spyOnInvalidate>) {
  expect(spy).toHaveBeenCalledWith({
    queryKey: [SUBCONTRACTOR_CONTRACT_QUERY_KEY, CONTRACT_ID],
  });
  expect(spy).toHaveBeenCalledWith({ queryKey: [SUBCONTRACTOR_CONTRACTS_LIST_QUERY_KEY] });
}

beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
});

describe("useCreateSubcontractorContract", () => {
  it("proje altındaki uca POST eder ve yanıttaki kimlikle geçersiz kılar", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue(ok(CONTRACT_DETAIL));
    const invalidateSpy = spyOnInvalidate(client);

    const { result } = renderHook(() => useCreateSubcontractorContract(PROJECT_ID), { wrapper });
    act(() => result.current.mutate({ work_category: "Elektrik", items: [] } as never));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.POST).toHaveBeenCalledWith(
      "/projects/{project_id}/subcontractor-contracts",
      {
        params: { path: { project_id: PROJECT_ID } },
        body: { work_category: "Elektrik", items: [] },
      },
    );
    expectContractInvalidated(invalidateSpy);
  });

  it("backend hatasında hiçbir sorgu geçersiz kılınmaz", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue({
      data: undefined,
      error: { detail: "Bu proje için işveren sözleşmesi yok." },
      response: new Response(null, { status: 422 }),
    } as never);
    const invalidateSpy = spyOnInvalidate(client);

    const { result } = renderHook(() => useCreateSubcontractorContract(PROJECT_ID), { wrapper });
    act(() => result.current.mutate({ items: [] } as never));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});

describe("useUpdateSubcontractorContract", () => {
  it("kısmi gövdeyi PATCH eder (TSD Şartlar bölümü) ve iki anahtarı tazeler", async () => {
    vi.mocked(backendClient.PATCH).mockResolvedValue(ok(CONTRACT_DETAIL));
    const invalidateSpy = spyOnInvalidate(client);

    const { result } = renderHook(() => useUpdateSubcontractorContract(CONTRACT_ID), { wrapper });
    act(() => result.current.mutate({ retainage_pct: "5" } as never));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.PATCH).toHaveBeenCalledWith("/subcontractor-contracts/{contract_id}", {
      params: { path: { contract_id: CONTRACT_ID } },
      body: { retainage_pct: "5" },
    });
    expectContractInvalidated(invalidateSpy);
  });
});

describe("useCreateSubcontractorContractItem", () => {
  it("kalemi sözleşme altına POST eder", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue(ok(ITEM));
    const invalidateSpy = spyOnInvalidate(client);

    const { result } = renderHook(() => useCreateSubcontractorContractItem(CONTRACT_ID), {
      wrapper,
    });
    act(() =>
      result.current.mutate({
        code: "E.04",
        description: "Kablo Kanalı",
        unit: "m",
        quantity: "100",
        unit_price: null,
      } as never),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.POST).toHaveBeenCalledWith(
      "/subcontractor-contracts/{contract_id}/items",
      expect.objectContaining({ params: { path: { contract_id: CONTRACT_ID } } }),
    );
    expectContractInvalidated(invalidateSpy);
  });
});

describe("useUpdateSubcontractorContractItem", () => {
  // ⚠️ Uç KALEM kimliğiyle çalışır, sözleşme kimliğini TAŞIMAZ — geçersiz
  // kılma için sözleşme kimliği hook'a ayrıca bağlanır.
  it("kalem kimliğini yola, sözleşme kimliğini yalnız geçersiz kılmaya kullanır", async () => {
    vi.mocked(backendClient.PATCH).mockResolvedValue(ok({ ...ITEM, unit_price: "52.00" }));
    const invalidateSpy = spyOnInvalidate(client);

    const { result } = renderHook(() => useUpdateSubcontractorContractItem(CONTRACT_ID), {
      wrapper,
    });
    act(() => result.current.mutate({ itemId: "sci-1", body: { unit_price: "52.00" } }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.PATCH).toHaveBeenCalledWith("/subcontractor-contracts/items/{item_id}", {
      params: { path: { item_id: "sci-1" } },
      body: { unit_price: "52.00" },
    });
    expectContractInvalidated(invalidateSpy);
  });
});

describe("useDeleteSubcontractorContractItem", () => {
  it("kalemi siler (204) ve iki anahtarı tazeler", async () => {
    vi.mocked(backendClient.DELETE).mockResolvedValue(ok(undefined, 204));
    const invalidateSpy = spyOnInvalidate(client);

    const { result } = renderHook(() => useDeleteSubcontractorContractItem(CONTRACT_ID), {
      wrapper,
    });
    act(() => result.current.mutate("sci-1"));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.DELETE).toHaveBeenCalledWith("/subcontractor-contracts/items/{item_id}", {
      params: { path: { item_id: "sci-1" } },
    });
    expectContractInvalidated(invalidateSpy);
  });
});

describe("useLoadSubcontractorContractItemsFromEmployer", () => {
  it("created/skipped sayılarını çağırana taşır (sessiz atlama yasak)", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue(ok({ created_count: 4, skipped_count: 2 }));
    const invalidateSpy = spyOnInvalidate(client);

    const { result } = renderHook(
      () => useLoadSubcontractorContractItemsFromEmployer(CONTRACT_ID),
      { wrapper },
    );
    act(() => result.current.mutate());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.POST).toHaveBeenCalledWith(
      "/subcontractor-contracts/{contract_id}/items/load-from-employer",
      { params: { path: { contract_id: CONTRACT_ID } } },
    );
    expect(result.current.data).toEqual({ created_count: 4, skipped_count: 2 });
    expectContractInvalidated(invalidateSpy);
  });
});
