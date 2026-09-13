import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import {
  useDeletePersonnelDocument,
  useUpdatePersonnelDocument,
} from "./usePersonnelDocumentMutations";
import { HR_DOCUMENTS_SUMMARY_QUERY_KEY, PERSONNEL_DOCUMENTS_QUERY_KEY } from "./useHrDocuments";
import { backendClient } from "@/lib/api/client";

// `useEquipmentMutations.test.tsx` / `useProjectMutations.test.tsx` deseni.
vi.mock("@/lib/api/client", () => ({
  backendClient: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() },
}));

const PERSONNEL_ID = "per-1";
const DOCUMENT_ID = "pd-1";

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
  vi.mocked(backendClient.DELETE).mockResolvedValue({
    data: undefined,
    error: undefined,
    response: new Response(null, { status: 204 }),
  } as never);
  vi.mocked(backendClient.PATCH).mockResolvedValue({
    data: { id: DOCUMENT_ID, personnel_id: PERSONNEL_ID, valid_until: "2027-02-01" },
    error: undefined,
    response: new Response(),
  } as never);
});

describe("useDeletePersonnelDocument — DELETE /personnel/documents/{document_id}", () => {
  it("yanlış takip kaydını SUNUCUDAN siler (uç bugün hiç çağrılmıyor)", async () => {
    // Arrange
    const { result } = renderHook(() => useDeletePersonnelDocument(PERSONNEL_ID), { wrapper });

    // Act
    act(() => result.current.mutate(DOCUMENT_ID));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert — yol ve künye birebir
    expect(backendClient.DELETE).toHaveBeenCalledWith("/personnel/documents/{document_id}", {
      params: { path: { document_id: DOCUMENT_ID } },
    });
  });

  it("İK ÖZETİNİ de tazeler — atlanırsa 'süresi doldu' kırmızı bandı silmeden SONRA da ekranda kalır", async () => {
    // Arrange
    const { result } = renderHook(() => useDeletePersonnelDocument(PERSONNEL_ID), { wrapper });

    // Act
    act(() => result.current.mutate(DOCUMENT_ID));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert
    expect(invalidatedKeys()).toContainEqual([PERSONNEL_DOCUMENTS_QUERY_KEY, PERSONNEL_ID]);
    expect(invalidatedKeys()).toContainEqual([HR_DOCUMENTS_SUMMARY_QUERY_KEY]);
  });
});

describe("useUpdatePersonnelDocument — PATCH /personnel/documents/{document_id}", () => {
  it("yanlış yazılan geçerlilik tarihini düzeltir (kısmi gövde AYNEN gider)", async () => {
    // Arrange
    const { result } = renderHook(() => useUpdatePersonnelDocument(PERSONNEL_ID), { wrapper });

    // Act
    act(() =>
      result.current.mutate({ documentId: DOCUMENT_ID, body: { valid_until: "2027-02-01" } }),
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert
    expect(backendClient.PATCH).toHaveBeenCalledWith("/personnel/documents/{document_id}", {
      params: { path: { document_id: DOCUMENT_ID } },
      body: { valid_until: "2027-02-01" },
    });
  });

  it("düzeltmeden sonra İK ÖZETİ de tazelenir (KPI + kritik bant aynı uçtan besleniyor)", async () => {
    // Arrange
    const { result } = renderHook(() => useUpdatePersonnelDocument(PERSONNEL_ID), { wrapper });

    // Act
    act(() =>
      result.current.mutate({ documentId: DOCUMENT_ID, body: { valid_until: "2027-02-01" } }),
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert
    expect(invalidatedKeys()).toContainEqual([PERSONNEL_DOCUMENTS_QUERY_KEY, PERSONNEL_ID]);
    expect(invalidatedKeys()).toContainEqual([HR_DOCUMENTS_SUMMARY_QUERY_KEY]);
  });
});
