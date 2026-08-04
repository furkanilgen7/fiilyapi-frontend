import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useSitePlan, SITE_PLAN_QUERY_KEY } from "./useSitePlan";
import { backendClient } from "@/lib/api/client";
import { BackendError } from "@/lib/api/unwrap";

// F-PL T1 · haftalik izgaranin okuma hook'u (`useSiteDiary.test.tsx` deseni).
vi.mock("@/lib/api/client", () => ({
  backendClient: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() },
}));

const SITE_ID = "s-1";
const WEEK_START = "2026-08-03";
const WEEK = { site_id: SITE_ID, week_start: WEEK_START, days: [], groups: [], goals: [] };

let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function okResponse(data: unknown) {
  return { data, error: undefined, response: new Response() } as never;
}

function errorResponse(status: number, detail: string) {
  return { data: undefined, error: { detail }, response: new Response(null, { status }) } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

describe("useSitePlan", () => {
  it("GET /sites/{id}/plan cagirir; week_start ZORUNLU sorgu parametresidir", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(WEEK));

    const { result } = renderHook(() => useSitePlan(SITE_ID, WEEK_START), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/sites/{site_id}/plan", {
      params: { path: { site_id: SITE_ID }, query: { week_start: WEEK_START } },
    });
    expect(client.getQueryData([SITE_PLAN_QUERY_KEY, SITE_ID, WEEK_START])).toEqual(WEEK);
  });

  it.each([
    ["bos siteId", "", WEEK_START],
    ["bos weekStart", SITE_ID, ""],
  ])("%s ile aga CIKMAZ", async (_case, siteId, weekStart) => {
    const { result } = renderHook(() => useSitePlan(siteId, weekStart), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(backendClient.GET).not.toHaveBeenCalled();
  });

  it("403'te BackendError firlatir (yetkisiz santiye)", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(errorResponse(403, "yetkisiz"));

    const { result } = renderHook(() => useSitePlan(SITE_ID, WEEK_START), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    const error = result.current.error as BackendError;
    expect(error).toBeInstanceOf(BackendError);
    expect(error.status).toBe(403);
  });
});
