import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useProjects, useProject } from "./useProjects";
import { backendClient } from "@/lib/api/client";

vi.mock("@/lib/api/client", () => ({ backendClient: { GET: vi.fn() } }));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const RESPONSE = {
  counts: { all: 4, taahhut: 2, kendi_yatirim: 1, kat_karsiligi: 1, completed: 1 },
  items: [],
};

describe("useProjects", () => {
  beforeEach(() => vi.clearAllMocks());

  it("filtresiz istekte query bos gider", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: RESPONSE, error: undefined, response: new Response(),
    } as never);

    const { result } = renderHook(() => useProjects(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.counts.all).toBe(4);
    expect(backendClient.GET).toHaveBeenCalledWith("/projects", { params: { query: {} } });
  });

  it("tip ve durum filtrelerini query parametresine cevirir", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: RESPONSE, error: undefined, response: new Response(),
    } as never);

    const { result } = renderHook(() => useProjects({ type: "taahhut" }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/projects", {
      params: { query: { type: "taahhut" } },
    });
  });
});

describe("useProject", () => {
  beforeEach(() => vi.clearAllMocks());

  it("proje_id ile tekil proje ceker", async () => {
    const detail = { id: "p-1", name: "Güneşkent Konut", site_count: 2 };
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: detail, error: undefined, response: new Response(),
    } as never);

    const { result } = renderHook(() => useProject("p-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.name).toBe("Güneşkent Konut");
    expect(backendClient.GET).toHaveBeenCalledWith("/projects/{project_id}", {
      params: { path: { project_id: "p-1" } },
    });
  });
});
