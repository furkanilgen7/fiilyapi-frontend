import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import {
  SITE_DIARY_ENTRY_QUERY_KEY,
  siteDiaryEntryQueryKey,
  useSiteDiaryEntries,
  useSiteDiaryEntry,
  useSiteDiarySummary,
  type SiteDiaryEntryDetail,
  type SiteDiaryEntryListResponse,
  type SiteDiarySummary,
} from "./useSiteDiary";
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

const SITE_ID = "s-1";

/** `GET /diary/{id}` yanıtı TAM detaydır (hook yalnız geçirir; testler `id` okur). */
function entryDetail(id: string): SiteDiaryEntryDetail {
  return {
    id,
    site_id: SITE_ID,
    project_id: "p-1",
    entry_date: "2026-07-15",
    section_id: null,
    weather: "sunny",
    temperature_c: null,
    work_done: null,
    chief_note: null,
    safety_meeting_held: false,
    ppe_checked: false,
    has_incident: false,
    incident_note: null,
    status: "draft",
    submitted_at: null,
    created_by: "u-2",
    created_at: "2026-07-15T08:00:00Z",
    updated_at: "2026-07-15T09:00:00Z",
    lines: [],
    worker_counts: [],
    lines_total: "0.00",
    worker_total: 0,
    // DET-1.B salt-okunur detay alanları — başlıksız taslak: gönderen yok, kilit yok.
    site_name: "A-Blok Şantiyesi",
    project_name: "Güneşkent",
    section_name: null,
    created_by_name: "Mehmet Demir",
    submitted_by: null,
    submitted_by_name: null,
    locked: false,
    lock_report_date: null,
    prev_id: null,
    next_id: null,
    prev_entry_date: null,
    next_entry_date: null,
  } satisfies SiteDiaryEntryDetail;
}

function listResponse(limit: number, offset: number): SiteDiaryEntryListResponse {
  return { items: [], total: 0, limit, offset } satisfies SiteDiaryEntryListResponse;
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
      okResponse(listResponse(50, 0)),
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
      okResponse(listResponse(50, 0)),
    );

    const { result } = renderHook(() => useSiteDiaryEntries("s-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/sites/{site_id}/diary", {
      params: { path: { site_id: "s-1" }, query: {} },
    });
  });

  it("limit/offset verilirse sayfalama parametreleri gider", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(
      okResponse(listResponse(200, 200)),
    );

    const { result } = renderHook(() => useSiteDiaryEntries("s-1", { limit: 200, offset: 200 }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/sites/{site_id}/diary", {
      params: { path: { site_id: "s-1" }, query: { limit: 200, offset: 200 } },
    });
  });

  it("DET-1.1 — `sectionId` verilirse `section_id` sunucu süzgeci gider (Kural A)", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(
      okResponse(listResponse(200, 0)),
    );

    const { result } = renderHook(
      () => useSiteDiaryEntries("s-1", { limit: 200, sectionId: "sec-1" }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/sites/{site_id}/diary", {
      params: { path: { site_id: "s-1" }, query: { limit: 200, section_id: "sec-1" } },
    });
  });

  it("DET-1.1 — `sectionId` İSTENİP henüz boşken ağa ÇIKMAZ (süzgeçsiz tam liste sızmaz)", () => {
    renderHook(() => useSiteDiaryEntries("s-1", { sectionId: "" }), { wrapper });

    expect(backendClient.GET).not.toHaveBeenCalled();
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
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(entryDetail("d-1")));

    const { result } = renderHook(() => useSiteDiaryEntry("d-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/diary/{entry_id}", {
      params: { path: { entry_id: "d-1" } },
    });
  });

  it("DET-1.1 — `sectionId` verilirse `?section_id=` gider (önceki/sonraki bölüm bağlamında)", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(entryDetail("d-1")));

    const { result } = renderHook(() => useSiteDiaryEntry("d-1", { sectionId: "sec-1" }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/diary/{entry_id}", {
      params: { path: { entry_id: "d-1" }, query: { section_id: "sec-1" } },
    });
  });

  it("önbellek anahtarı: bölümsüz çağrı BUGÜNKÜ anahtarı korur, bölümlü çağrı ayrışır", () => {
    expect(siteDiaryEntryQueryKey("d-1")).toEqual([SITE_DIARY_ENTRY_QUERY_KEY, "d-1"]);
    expect(siteDiaryEntryQueryKey("d-1", "sec-1")).toEqual([SITE_DIARY_ENTRY_QUERY_KEY, "d-1", "sec-1"]);
  });

  it("`enabled: false` iken ağa çıkmaz (bölüm kimliği çözülmeden istenmez)", () => {
    renderHook(() => useSiteDiaryEntry("d-1", { enabled: false }), { wrapper });

    expect(backendClient.GET).not.toHaveBeenCalled();
  });

  it("kimlik boşken (o gün kayıt YOK) ağa çıkmaz", () => {
    renderHook(() => useSiteDiaryEntry(""), { wrapper });

    expect(backendClient.GET).not.toHaveBeenCalled();
  });

  it("farklı kayıtlar ayrı önbellek anahtarı kullanır", async () => {
    vi.mocked(backendClient.GET).mockImplementation(async (_path, options) =>
      okResponse(entryDetail((options as { params: { path: { entry_id: string } } }).params.path.entry_id)),
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
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse({
        site_id: SITE_ID,
        year: 2026,
        month: 7,
        entry_count: 0,
        total_amount: "0.00",
        items: [],
      } satisfies SiteDiarySummary));

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
