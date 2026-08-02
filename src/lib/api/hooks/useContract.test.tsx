import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import {
  useContractDistribution,
  useEmployerContract,
  CONTRACT_DISTRIBUTION_QUERY_KEY,
  EMPLOYER_CONTRACT_QUERY_KEY,
} from "./useContract";
import { backendClient } from "@/lib/api/client";

vi.mock("@/lib/api/client", () => ({ backendClient: { GET: vi.fn() } }));

const PROJECT_ID = "proj-1";

let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function okResponse(data: unknown) {
  return { data, error: undefined, response: new Response() } as never;
}

const DISTRIBUTION = {
  sites: [{ id: "site-1", name: "A-Blok" }],
  groups: [],
  undistributed_item_count: 0,
  undistributed_item_names: [],
  site_summaries: [],
  distributed_item_count: 0,
  total_item_count: 0,
};

const CONTRACT = {
  project_id: PROJECT_ID,
  contract_no: "SZL-2025-001",
  has_price_escalation: true,
  status: "active",
};

beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

describe("useContractDistribution", () => {
  it("projectId boşken ağa çıkmaz", () => {
    renderHook(() => useContractDistribution(""), { wrapper });
    expect(backendClient.GET).not.toHaveBeenCalled();
  });

  it("dağıtım yanıtını unwrap ile döndürür, sorgu anahtarı [key, projectId]", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(DISTRIBUTION));

    const { result } = renderHook(() => useContractDistribution(PROJECT_ID), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(backendClient.GET).toHaveBeenCalledWith("/projects/{project_id}/contract/distribution", {
      params: { path: { project_id: PROJECT_ID } },
    });
    expect(client.getQueryData([CONTRACT_DISTRIBUTION_QUERY_KEY, PROJECT_ID])).toEqual(
      DISTRIBUTION,
    );
    expect(result.current.data?.sites).toHaveLength(1);
  });

  it("backend hatasında sorgu hataya düşer", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: undefined,
      error: { detail: "Bu projenin işveren sözleşmesi yok." },
      response: new Response(null, { status: 422 }),
    } as never);

    const { result } = renderHook(() => useContractDistribution(PROJECT_ID), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useEmployerContract", () => {
  it("projectId boşken ağa çıkmaz", () => {
    renderHook(() => useEmployerContract(""), { wrapper });
    expect(backendClient.GET).not.toHaveBeenCalled();
  });

  it("sözleşme detayını unwrap ile döndürür, sorgu anahtarı [key, projectId]", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(CONTRACT));

    const { result } = renderHook(() => useEmployerContract(PROJECT_ID), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(backendClient.GET).toHaveBeenCalledWith("/projects/{project_id}/contract", {
      params: { path: { project_id: PROJECT_ID } },
    });
    expect(client.getQueryData([EMPLOYER_CONTRACT_QUERY_KEY, PROJECT_ID])).toEqual(CONTRACT);
    expect(result.current.data?.has_price_escalation).toBe(true);
  });

  it("backend hatasında sorgu hataya düşer", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: undefined,
      error: { detail: "yetkiniz yok" },
      response: new Response(null, { status: 403 }),
    } as never);

    const { result } = renderHook(() => useEmployerContract(PROJECT_ID), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
