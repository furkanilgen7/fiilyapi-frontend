import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useSiteSubcontractorPayments } from "./useSiteSubcontractorPayments";
import { backendClient } from "@/lib/api/client";

vi.mock("@/lib/api/client", () => ({ backendClient: { GET: vi.fn() } }));

let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function paymentItem(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "scpp-1",
    contract_id: "sc-1",
    project_id: "proj-1",
    project_name: "Güneşkent A-Blok",
    subcontractor_name: "Akın İnşaat",
    contract_no: "TSD-2026-01",
    sequence_no: 47,
    period_year: 2026,
    period_month: 7,
    description: null,
    status: "pending_approval",
    // TB3 ile liste şemasına DOĞRUDAN eklendi — join'in söküldüğü alan.
    work_category: "Betonarme İşleri",
    section_id: null,
    created_at: "2026-07-01T00:00:00Z",
    gross_total: "1240000.00",
    net_total: "1016800.00",
    is_revision_required: false,
    ...overrides,
  };
}

// F-P5 T1 — YALNIZ U2 tanımlıdır. Sökülen U1 join'i geri gelirse (ya da
// başka bir uç eklenirse) mock FIRLATIR: sessizce yeşil kalamaz.
function mockGet(handlers: {
  payments: Record<string, unknown>[];
  paymentsTotal?: number;
}) {
  vi.mocked(backendClient.GET).mockImplementation(async (path: string) => {
    if (path === "/subcontractor-progress-payments") {
      return {
        data: {
          items: handlers.payments,
          total: handlers.paymentsTotal ?? handlers.payments.length,
          limit: 200,
          offset: 0,
        },
        error: undefined,
        response: new Response(),
      } as never;
    }
    throw new Error(`beklenmeyen uç: ${path}`);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

describe("useSiteSubcontractorPayments", () => {
  it("U2'ye `project_id` + `site_id` ile çıkar (süzme sunucuda, N+1 YOK)", async () => {
    mockGet({
      payments: [paymentItem({ id: "scpp-1", contract_id: "sc-1" })],
    });

    const { result } = renderHook(() => useSiteSubcontractorPayments("proj-1", "site-1"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.items[0]).toMatchObject({
      id: "scpp-1",
      contractId: "sc-1",
      subcontractorName: "Akın İnşaat",
      workCategory: "Betonarme İşleri",
      sectionId: null,
    });
    expect(backendClient.GET).toHaveBeenCalledWith("/subcontractor-progress-payments", {
      params: { query: { project_id: "proj-1", site_id: "site-1", limit: 200 } },
    });
  });

  // ⛔ F-P5 T1 — SÖKÜLEN JOIN'İN KANITI. TB3 `work_category`yi hakediş liste
  // şemasına eklediği için ikinci istek (`GET /subcontractor-contracts`)
  // TAMAMEN kaldırıldı: kaç farklı sözleşme olursa olsun SADECE U2 çağrılır.
  it("U1 join'i SÖKÜLDÜ — yalnız U2 isteği gider, `/subcontractor-contracts` HİÇ çağrılmaz", async () => {
    mockGet({
      payments: [
        paymentItem({ id: "scpp-1", contract_id: "sc-1" }),
        paymentItem({ id: "scpp-2", contract_id: "sc-2", subcontractor_name: "Çelik İnşaat" }),
      ],
    });

    const { result } = renderHook(() => useSiteSubcontractorPayments("proj-1", "site-1"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.items).toHaveLength(2));
    const calledPaths = vi.mocked(backendClient.GET).mock.calls.map((call) => call[0]);
    expect(calledPaths).not.toContain("/subcontractor-contracts");
    expect(calledPaths).toEqual(["/subcontractor-progress-payments"]);
  });

  it("workCategory DOĞRUDAN hakediş liste öğesinden okunur (join yok)", async () => {
    mockGet({
      payments: [paymentItem({ id: "scpp-1", work_category: "Elektrik" })],
    });

    const { result } = renderHook(() => useSiteSubcontractorPayments("proj-1", "site-1"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.items[0].workCategory).toBe("Elektrik");
  });

  it("work_category null ise `null`a zarif düşer — hata FIRLATILMAZ", async () => {
    mockGet({
      payments: [paymentItem({ id: "scpp-1", work_category: null })],
    });

    const { result } = renderHook(() => useSiteSubcontractorPayments("proj-1", "site-1"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.items[0].workCategory).toBeNull();
    expect(result.current.isError).toBe(false);
  });

  // Join söküldüğü için `isLoading` ARTIK yalnız U2'ye bağlıdır.
  it("isLoading yalnız U2'ye bağlıdır — U2 çözülünce yükleme biter", async () => {
    mockGet({ payments: [paymentItem()] });

    const { result } = renderHook(() => useSiteSubcontractorPayments("proj-1", "site-1"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items).toHaveLength(1);
  });

  it("hakediş liste ucu hata verirse isError=true", async () => {
    vi.mocked(backendClient.GET).mockImplementation(async (path: string) => {
      if (path === "/subcontractor-progress-payments") {
        return {
          data: undefined,
          error: "boom",
          response: new Response(null, { status: 500 }),
        } as never;
      }
      return { data: { items: [] }, error: undefined, response: new Response() } as never;
    });

    const { result } = renderHook(() => useSiteSubcontractorPayments("proj-1", "site-1"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.items).toHaveLength(0);
  });

  // Fix round 1 (coordinator review) — `section_id` liste öğesinden SIZDIRILMALI
  // (isim DEĞİL, yalnız kimlik): `SiteSubcontractorPaymentsPanel` bölüm
  // görünümünü (pending / "Tüm Bölümler") bu alandan türetir.
  it("hakedişin section_id'sini (dolu ya da null) ham şekilde çağırana taşır", async () => {
    mockGet({
      payments: [paymentItem({ id: "scpp-1", contract_id: "sc-1", section_id: "sec-9" })],
    });

    const { result } = renderHook(() => useSiteSubcontractorPayments("proj-1", "site-1"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.items[0].sectionId).toBe("sec-9");
  });

  it("liste sunucu tavanında kırpıldıysa isPartial=true, sınır görünür kılınır", async () => {
    mockGet({
      payments: [paymentItem({ id: "scpp-1", contract_id: "sc-1" })],
      paymentsTotal: 210,
    });

    const { result } = renderHook(() => useSiteSubcontractorPayments("proj-1", "site-1"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isPartial).toBe(true));
    expect(result.current.truncation).toEqual({
      isTruncated: true,
      shownCount: 1,
      totalCount: 210,
    });
  });

  it("liste kırpılmamışsa isPartial=false", async () => {
    mockGet({
      payments: [paymentItem({ id: "scpp-1", contract_id: "sc-1" })],
    });

    const { result } = renderHook(() => useSiteSubcontractorPayments("proj-1", "site-1"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.isPartial).toBe(false);
  });
});
