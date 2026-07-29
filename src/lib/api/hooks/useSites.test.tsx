import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useSites } from "./useSites";
import { backendClient } from "@/lib/api/client";

vi.mock("@/lib/api/client", () => ({ backendClient: { GET: vi.fn() } }));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useSites", () => {
  beforeEach(() => vi.clearAllMocks());

  it("proje id ile santiye listesini ceker", async () => {
    const response = {
      counts: { all: 2, active: 1, on_hold: 0, completed: 1 },
      items: [],
      totals: {
        total_progress_payment: { available: false, value: null, pending_module: "progress_payments" },
        subcontractor_count: { available: false, count: null, pending_module: "subcontracts" },
        active_worker_count: { available: false, count: null, pending_module: "timesheet" },
        average_margin: { available: false, value: null, pending_module: "project_costs" },
      },
    };
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: response, error: undefined, response: new Response(),
    } as never);

    const { result } = renderHook(() => useSites("p-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.counts.all).toBe(2);
    expect(backendClient.GET).toHaveBeenCalledWith("/projects/{project_id}/sites", {
      params: { path: { project_id: "p-1" } },
    });
  });
});
