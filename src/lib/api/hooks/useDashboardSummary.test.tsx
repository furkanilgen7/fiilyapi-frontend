import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useDashboardSummary } from "./useDashboardSummary";
import { backendClient } from "@/lib/api/client";

vi.mock("@/lib/api/client", () => ({ backendClient: { GET: vi.fn() } }));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useDashboardSummary", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ozet ucundan veriyi doner", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: { role_name: "Patron", active_project_count: 1, projects: [] },
      error: undefined,
      response: new Response(),
    } as never);

    const { result } = renderHook(() => useDashboardSummary(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.role_name).toBe("Patron");
    expect(backendClient.GET).toHaveBeenCalledWith("/dashboard/summary", {});
  });
});
