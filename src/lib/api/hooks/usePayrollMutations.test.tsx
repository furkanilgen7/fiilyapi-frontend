import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import {
  useApprovePayrollPeriod,
  useComputePayrollPeriod,
  usePayPayrollPeriod,
} from "./usePayrollMutations";
import { PAYROLL_PERIOD_QUERY_KEY, PAYROLL_PERIODS_QUERY_KEY } from "./usePayroll";
import { PAYROLL_SGK_SUMMARY_QUERY_KEY } from "./usePayrollSgk";
import { backendClient } from "@/lib/api/client";

vi.mock("@/lib/api/client", () => ({
  backendClient: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn() },
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  wrapper.client = client;
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
wrapper.client = undefined as unknown as QueryClient;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(backendClient.POST).mockResolvedValue({
    data: { id: "period-1" },
    error: undefined,
    response: new Response(),
  } as never);
});

/**
 * Kayıt no 158 — bekçi: `compute`/`approve`/`pay` üçü de dönem detayı VE
 * dönem listesi YANINDA SGK özetini de tazelemeli. `usePayrollSgk.ts::
 * useSubmitPayrollSgk` bu üçünü zaten birlikte tazeliyordu; asimetri
 * `usePayrollInvalidator`de eksikti.
 *
 * MUTASYON KANITI: `usePayrollMutations.ts`teki
 * `queryClient.invalidateQueries({ queryKey: [PAYROLL_SGK_SUMMARY_QUERY_KEY] })`
 * satırı silinirse bu üç test KIRMIZI döner (bkz. rapor).
 */
describe.each([
  ["useComputePayrollPeriod", useComputePayrollPeriod],
  ["useApprovePayrollPeriod", useApprovePayrollPeriod],
  ["usePayPayrollPeriod", usePayPayrollPeriod],
] as const)("%s", (_name, useHook) => {
  it("PAYROLL_SGK_SUMMARY_QUERY_KEY dahil ucunu tazeler", async () => {
    const { result } = renderHook(() => useHook(), { wrapper });
    const invalidateSpy = vi.spyOn(wrapper.client, "invalidateQueries");

    act(() => result.current.mutate("period-1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [PAYROLL_PERIOD_QUERY_KEY] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [PAYROLL_PERIODS_QUERY_KEY] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [PAYROLL_SGK_SUMMARY_QUERY_KEY] });
  });
});
