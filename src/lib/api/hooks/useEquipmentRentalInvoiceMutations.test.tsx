import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { usePayRentalInvoice } from "./useEquipmentRentalInvoiceMutations";
import { EQUIPMENT_RENTAL_INVOICES_QUERY_KEY } from "./useEquipmentRentalInvoices";
import { EQUIPMENT_DETAIL_SCREEN_QUERY_KEY } from "./useEquipmentDetailScreen";
import { backendClient } from "@/lib/api/client";

vi.mock("@/lib/api/client", () => ({
  backendClient: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() },
}));

const PAID_INVOICE = { id: "ri-1", status: "paid" };

function spyOnInvalidate(queryClient: QueryClient) {
  return vi.spyOn(queryClient, "invalidateQueries");
}

let client: QueryClient;
let invalidateSpy: ReturnType<typeof spyOnInvalidate>;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function invalidatedKeys(): unknown[][] {
  return invalidateSpy.mock.calls.map((call) => (call[0] as { queryKey: unknown[] }).queryKey);
}

beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  invalidateSpy = spyOnInvalidate(client);
  vi.mocked(backendClient.POST).mockResolvedValue({
    data: PAID_INVOICE,
    error: undefined,
    response: new Response(),
  } as never);
});

describe("usePayRentalInvoice", () => {
  it("ODENDI damgasindan sonra ekipman detay ekranini da tazeler (cumulative_paid odenen hakedislerin TUREVIDIR)", async () => {
    // Arrange
    const { result } = renderHook(() => usePayRentalInvoice(), { wrapper });

    // Act
    act(() => result.current.mutate("ri-1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert — KOK anahtar: bir hakedis satirlari BIRDEN COK ekipmana dokunabilir.
    expect(invalidatedKeys()).toContainEqual([EQUIPMENT_DETAIL_SCREEN_QUERY_KEY]);
    expect(invalidatedKeys()).toContainEqual([EQUIPMENT_RENTAL_INVOICES_QUERY_KEY]);
  });
});
