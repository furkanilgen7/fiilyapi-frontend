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
    section_id: null,
    created_at: "2026-07-01T00:00:00Z",
    gross_total: "1240000.00",
    net_total: "1016800.00",
    is_revision_required: false,
    ...overrides,
  };
}

function contractListItem(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "sc-1",
    contract_no: "TSD-2026-01",
    subcontractor_name: "Akın İnşaat",
    work_category: "Betonarme İşleri",
    project_id: "proj-1",
    project_name: "Güneşkent A-Blok",
    site_id: "site-1",
    site_name: "A-Blok",
    status: "active",
    is_draft: false,
    ...overrides,
  };
}

function mockGet(handlers: {
  payments: Record<string, unknown>[];
  contracts: Record<string, unknown>[];
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
    if (path === "/subcontractor-contracts") {
      return {
        data: { items: handlers.contracts },
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
      contracts: [contractListItem({ site_id: "site-1" })],
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

  it("workCategory join'i: TEK U1 isteği gider — sözleşme sayısından BAĞIMSIZ (N+1 YOK)", async () => {
    mockGet({
      payments: [
        paymentItem({ id: "scpp-1", contract_id: "sc-1" }),
        paymentItem({ id: "scpp-2", contract_id: "sc-2", subcontractor_name: "Çelik İnşaat" }),
      ],
      contracts: [
        contractListItem({ id: "sc-1", site_id: "site-1" }),
        contractListItem({ id: "sc-2", site_id: "site-1", work_category: "Duvar/Sıva" }),
      ],
    });

    const { result } = renderHook(() => useSiteSubcontractorPayments("proj-1", "site-1"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.items).toHaveLength(2));
    // TEK U1 çağrısı — kaç farklı sözleşme olursa olsun (N+1'in aksine, ki
    // eski implementasyon burada 2 çağrı yapardı: sc-1 + sc-2).
    const contractListCalls = vi
      .mocked(backendClient.GET)
      .mock.calls.filter((call) => call[0] === "/subcontractor-contracts");
    expect(contractListCalls).toHaveLength(1);
    expect(contractListCalls[0][1]).toEqual({ params: { query: { site_id: "site-1" } } });
  });

  // Coordinator review (Minor 3) — yalnız çağrı SAYISI (1+1) sıralı bir
  // zincirle de üretilebilir, bu yüzden gerçek paralelliği (U1'in U2'nin
  // sonucunu BEKLEMEDEN ateşlenmesi) ayrı kanıtlıyoruz: U2 (hakediş listesi)
  // isteği kasıtlı olarak HİÇ ÇÖZÜLMEZ (asılı `Promise`); eğer U1 sıralı
  // olarak U2'ye BAĞIMLI olsaydı (ör. `enabled: paymentsQuery.isSuccess`),
  // U2 asılı kaldığı sürece U1'in `queryFn`i HİÇ ÇAĞRILMAZDI. U1'in yine de
  // çağrılması, iki sorgunun birbirinden BAĞIMSIZ (paralel) ateşlendiğini
  // kanıtlar.
  it("U1 (workCategory join'i), U2 hiç çözülmeden de ateşlenir — PARALEL, sıralı zincir DEĞİL", async () => {
    vi.mocked(backendClient.GET).mockImplementation(async (path: string) => {
      if (path === "/subcontractor-progress-payments") {
        // Kasıtlı olarak HİÇ ÇÖZÜLMEYEN promise — U2 sonsuza dek "pending".
        return new Promise(() => {});
      }
      if (path === "/subcontractor-contracts") {
        return {
          data: { items: [contractListItem({ id: "sc-1" })] },
          error: undefined,
          response: new Response(),
        } as never;
      }
      throw new Error(`beklenmeyen uç: ${path}`);
    });

    renderHook(() => useSiteSubcontractorPayments("proj-1", "site-1"), { wrapper });

    // U2 hiç çözülmediği hâlde U1'in çağrıldığını bekle — sıralı bir zincirde
    // (U1, U2'nin başarısını beklerdi) bu ASLA gerçekleşmezdi.
    await waitFor(() =>
      expect(
        vi.mocked(backendClient.GET).mock.calls.some((call) => call[0] === "/subcontractor-contracts"),
      ).toBe(true),
    );
  });

  it("workCategory join'i EŞLEŞİRSE gerçek değeri taşır", async () => {
    mockGet({
      payments: [paymentItem({ id: "scpp-1", contract_id: "sc-1" })],
      contracts: [contractListItem({ id: "sc-1", work_category: "Betonarme İşleri" })],
    });

    const { result } = renderHook(() => useSiteSubcontractorPayments("proj-1", "site-1"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.items[0].workCategory).toBe("Betonarme İşleri");
  });

  it("workCategory join'i EŞLEŞMEZSE (yarış durumu) `null`a zarif düşer — hata FIRLATILMAZ", async () => {
    mockGet({
      payments: [paymentItem({ id: "scpp-1", contract_id: "sc-1" })],
      // U1 yanıtında sc-1 YOK — hakediş listesi geldi, sözleşme o anda
      // değişti/silindi senaryosu.
      contracts: [],
    });

    const { result } = renderHook(() => useSiteSubcontractorPayments("proj-1", "site-1"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.items[0].workCategory).toBeNull();
    expect(result.current.isError).toBe(false);
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
      contracts: [contractListItem({ id: "sc-1" })],
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
      contracts: [contractListItem({ id: "sc-1" })],
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
      contracts: [contractListItem({ id: "sc-1" })],
    });

    const { result } = renderHook(() => useSiteSubcontractorPayments("proj-1", "site-1"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.isPartial).toBe(false);
  });
});
