import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useUpdateEquipment } from "./useEquipmentMutations";
import { EQUIPMENT_QUERY_KEY } from "./useEquipment";
import { EQUIPMENT_DETAIL_SCREEN_QUERY_KEY } from "./useEquipmentDetailScreen";
import { backendClient } from "@/lib/api/client";

// `useProjectMutations.test.tsx` / `useDocumentMutations.test.tsx` deseni.
vi.mock("@/lib/api/client", () => ({
  backendClient: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() },
}));

const EQUIPMENT_ID = "eq-1";
const UPDATED = { id: EQUIPMENT_ID, name: "Tower Crane TC-48", plate_no: "34 XYZ 789" };

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
  vi.mocked(backendClient.PATCH).mockResolvedValue({
    data: UPDATED,
    error: undefined,
    response: new Response(),
  } as never);
});

describe("useUpdateEquipment", () => {
  it("MK-4 detay EKRANININ anahtarini da tazeler (yoksa 30 sn'lik staleTime boyunca bayat govde basilir)", async () => {
    // Arrange
    const { result } = renderHook(() => useUpdateEquipment(EQUIPMENT_ID), { wrapper });

    // Act
    act(() => result.current.mutate({ plate_no: "34 XYZ 789" } as never));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert — ad tuzagi: EQUIPMENT_DETAIL_QUERY_KEY (duzenleme formunun ucu)
    // DEGIL, EQUIPMENT_DETAIL_SCREEN_QUERY_KEY tazelenmelidir.
    expect(invalidatedKeys()).toContainEqual([EQUIPMENT_DETAIL_SCREEN_QUERY_KEY, EQUIPMENT_ID]);
    // Mevcut davranis korunur.
    expect(invalidatedKeys()).toContainEqual([EQUIPMENT_QUERY_KEY]);
  });
});
