import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useSiteDiaryEntries, useSiteDiaryEntry, useSiteDiarySummary } from "./useSiteDiary";
import { backendClient } from "@/lib/api/client";
import { BackendError } from "@/lib/api/unwrap";

// F-SD T6 · T1'in okuma sorguları. `useProgressPayments.test.tsx` deseni:
// ağ katmanı taklit edilir, hook'un ÇAĞRI SÖZLEŞMESİ (yol + parametre) ve
// boş kimlikte ağa ÇIKMAMA kuralı doğrulanır.
vi.mock("@/lib/api/client", () => ({ backendClient: { GET: vi.fn() } }));

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

describe("useSiteDiaryEntries", () => {
  it("ay süzmesini query parametresi olarak gönderir", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(
      okResponse({ items: [], total: 0, limit: 50, offset: 0 }),
    );

    const { result } = renderHook(() => useSiteDiaryEntries("s-1", { year: 2026, month: 7 }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/sites/{site_id}/diary", {
      params: { path: { site_id: "s-1" }, query: { year: 2026, month: 7 } },
    });
  });

  it("verilmeyen süzme/sayfalama alanları gövdeye HİÇ girmez", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(
      okResponse({ items: [], total: 0, limit: 50, offset: 0 }),
    );

    const { result } = renderHook(() => useSiteDiaryEntries("s-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/sites/{site_id}/diary", {
      params: { path: { site_id: "s-1" }, query: {} },
    });
  });

  it("limit/offset verilirse sayfalama parametreleri gider", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(
      okResponse({ items: [], total: 0, limit: 200, offset: 200 }),
    );

    const { result } = renderHook(() => useSiteDiaryEntries("s-1", { limit: 200, offset: 200 }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/sites/{site_id}/diary", {
      params: { path: { site_id: "s-1" }, query: { limit: 200, offset: 200 } },
    });
  });

  it("boş `siteId` ile AĞA ÇIKMAZ (rota parametresi henüz gelmemiş olabilir)", () => {
    renderHook(() => useSiteDiaryEntries(""), { wrapper });

    expect(backendClient.GET).not.toHaveBeenCalled();
  });

  it("403'te hata BackendError olur — ekran erişim reddi dalına düşebilsin", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(errorResponse(403, "yasak"));

    const { result } = renderHook(() => useSiteDiaryEntries("s-1"), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(BackendError);
    expect((result.current.error as BackendError).status).toBe(403);
  });
});

describe("useSiteDiaryEntry", () => {
  it("tekil kaydı kimlikle okur", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse({ id: "d-1" }));

    const { result } = renderHook(() => useSiteDiaryEntry("d-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/diary/{entry_id}", {
      params: { path: { entry_id: "d-1" } },
    });
  });

  it("kimlik boşken (o gün kayıt YOK) ağa çıkmaz", () => {
    renderHook(() => useSiteDiaryEntry(""), { wrapper });

    expect(backendClient.GET).not.toHaveBeenCalled();
  });

  it("farklı kayıtlar ayrı önbellek anahtarı kullanır", async () => {
    vi.mocked(backendClient.GET).mockImplementation(async (_path, options) =>
      okResponse({ id: (options as { params: { path: { entry_id: string } } }).params.path.entry_id }),
    );

    const first = renderHook(() => useSiteDiaryEntry("d-1"), { wrapper });
    await waitFor(() => expect(first.result.current.data?.id).toBe("d-1"));

    const second = renderHook(() => useSiteDiaryEntry("d-2"), { wrapper });
    await waitFor(() => expect(second.result.current.data?.id).toBe("d-2"));
    expect(vi.mocked(backendClient.GET).mock.calls).toHaveLength(2);
  });
});

describe("useSiteDiarySummary", () => {
  it("poz bazlı aylık birikimi ay süzmesiyle okur", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse({ site_id: "s-1", items: [] }));

    const { result } = renderHook(() => useSiteDiarySummary("s-1", { year: 2026, month: 7 }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/sites/{site_id}/diary/summary", {
      params: { path: { site_id: "s-1" }, query: { year: 2026, month: 7 } },
    });
  });

  it("boş `siteId` ile ağa çıkmaz", () => {
    renderHook(() => useSiteDiarySummary("", { year: 2026, month: 7 }), { wrapper });

    expect(backendClient.GET).not.toHaveBeenCalled();
  });
});
