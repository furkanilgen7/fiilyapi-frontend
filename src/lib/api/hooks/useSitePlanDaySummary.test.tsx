import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import {
  useSitePlanDaySummary,
  SITE_PLAN_DAY_SUMMARY_DEFAULT_DAYS,
} from "./useSitePlanDaySummary";
import { backendClient } from "@/lib/api/client";

// F-SD T6 · GK'nin gömülü planlama bloğu (SALT-OKUNUR). `start` ZORUNLUDUR —
// eksikken ağa çıkmak gerçek backend'de 422 üretirdi.
vi.mock("@/lib/api/client", () => ({ backendClient: { GET: vi.fn() } }));

let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function okResponse(data: unknown) {
  return { data, error: undefined, response: new Response() } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

describe("useSitePlanDaySummary", () => {
  it("start + days ile kayan pencereyi okur", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse({ site_id: "s-1", days: [] }));

    const { result } = renderHook(() => useSitePlanDaySummary("s-1", "2026-08-03", 7), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/sites/{site_id}/plan/day-summary", {
      params: { path: { site_id: "s-1" }, query: { start: "2026-08-03", days: 7 } },
    });
  });

  it("gün sayısı verilmezse backend varsayılanı (5) gönderilir", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse({ site_id: "s-1", days: [] }));

    const { result } = renderHook(() => useSitePlanDaySummary("s-1", "2026-08-03"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(SITE_PLAN_DAY_SUMMARY_DEFAULT_DAYS).toBe(5);
    expect(backendClient.GET).toHaveBeenCalledWith("/sites/{site_id}/plan/day-summary", {
      params: { path: { site_id: "s-1" }, query: { start: "2026-08-03", days: 5 } },
    });
  });

  it("boş `start` ile AĞA ÇIKMAZ (uç 422 verirdi)", () => {
    renderHook(() => useSitePlanDaySummary("s-1", ""), { wrapper });

    expect(backendClient.GET).not.toHaveBeenCalled();
  });

  it("boş `siteId` ile ağa çıkmaz", () => {
    renderHook(() => useSitePlanDaySummary("", "2026-08-03"), { wrapper });

    expect(backendClient.GET).not.toHaveBeenCalled();
  });
});
