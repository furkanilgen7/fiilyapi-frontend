import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useJournalSummary, JOURNAL_SUMMARY_QUERY_KEY } from "./useJournalSummary";
import { useLedger, LEDGER_QUERY_KEY, LEDGER_MAX_LIMIT } from "./useLedger";
import {
  useJournalEntries,
  JOURNAL_ENTRIES_QUERY_KEY,
  JOURNAL_ENTRIES_MAX_LIMIT,
} from "./useJournalEntries";
import {
  useChartOfAccounts,
  CHART_OF_ACCOUNTS_QUERY_KEY,
  CHART_ACCOUNTS_MAX_LIMIT,
} from "./useChartOfAccounts";
import { backendClient } from "@/lib/api/client";
import { BackendError } from "@/lib/api/unwrap";

// F-MU1 T2 · Muhasebe okuma hook'ları (`useStockSummary.test.tsx` deseni).
vi.mock("@/lib/api/client", () => ({
  backendClient: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() },
}));

const SUMMARY = {
  year: 2026,
  month: 7,
  total_debit: "3842600.00",
  total_credit: "4120000.00",
  net_balance: "277400.00",
};

const LEDGER = { items: [], total: 0, limit: 200, offset: 0, carried_balance: "0.00" };
const ENTRY_LIST = { items: [], total: 0, limit: 200, offset: 0 };
const ACCOUNT_LIST = { items: [], total: 0, limit: 200, offset: 0 };

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

function queryOf(callIndex = 0): Record<string, unknown> {
  const call = vi.mocked(backendClient.GET).mock.calls[callIndex][1] as {
    params: { query: Record<string, unknown> };
  };
  return call.params.query;
}

beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

describe("useJournalSummary", () => {
  it("donemi query'ye gecirir ve yaniti onbellege yazar", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(SUMMARY));

    const { result } = renderHook(() => useJournalSummary(2026, 7), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/journal-entries/summary", {
      params: { query: { year: 2026, month: 7 } },
    });
    expect(client.getQueryData([JOURNAL_SUMMARY_QUERY_KEY, 2026, 7])).toEqual(SUMMARY);
  });

  /**
   * 🔴 Şerit hesap süzgeci ALMAZ (E8:72 — KPI'lar filtre çubuğunun
   * DIŞINDADIR); uç `account_id` parametresi tanımlamaz, gönderilseydi 422
   * olurdu. Bekçi: sorguda YALNIZ iki anahtar bulunur.
   */
  it("sorguya HESAP suzgeci EKLEMEZ", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(SUMMARY));

    const { result } = renderHook(() => useJournalSummary(2026, 7), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(Object.keys(queryOf())).toEqual(["year", "month"]);
  });

  it("403'te BackendError firlatir (govde YUTULMAZ)", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(errorResponse(403, "yetkisiz"));

    const { result } = renderHook(() => useJournalSummary(2026, 7), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    const error = result.current.error as BackendError;
    expect(error).toBeInstanceOf(BackendError);
    expect(error.status).toBe(403);
  });
});

describe("useLedger", () => {
  it("GET /journal cagirir; donem + tavan query'ye gecer", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(LEDGER));

    const { result } = renderHook(
      () => useLedger({ year: 2026, month: 7, limit: LEDGER_MAX_LIMIT }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/journal", {
      params: { query: { year: 2026, month: 7, limit: 200 } },
    });
    expect(
      client.getQueryData([LEDGER_QUERY_KEY, 2026, 7, null, null, 200, null]),
    ).toEqual(LEDGER);
  });

  it("hesap suzgeci verilince account_id gonderilir", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(LEDGER));

    const { result } = renderHook(
      () => useLedger({ year: 2026, month: 7, accountId: "acc-1" }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryOf()).toEqual({ year: 2026, month: 7, account_id: "acc-1" });
  });

  /**
   * E8:96 "Tüm Hesaplar" = süzgeç YOK. Boş dize gönderilseydi sunucu boş bir
   * UUID ile eşleşme arar ve defter tamamen boşalırdı.
   */
  it("bos hesap kimligi sorguya HIC eklenmez", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(LEDGER));

    const { result } = renderHook(() => useLedger({ year: 2026, month: 7, accountId: "" }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(Object.keys(queryOf())).toEqual(["year", "month"]);
  });

  it("LEDGER_MAX_LIMIT semadaki tavanla ayni", () => {
    expect(LEDGER_MAX_LIMIT).toBe(200);
  });

  it("500'de BackendError firlatir", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(errorResponse(500, "sunucu hatasi"));

    const { result } = renderHook(() => useLedger({ year: 2026, month: 7 }), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as BackendError).status).toBe(500);
  });
});

describe("useJournalEntries", () => {
  it("durum + donem + tavan query'ye gecer", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(ENTRY_LIST));

    const { result } = renderHook(
      () =>
        useJournalEntries({
          status: "draft",
          year: 2026,
          month: 7,
          limit: JOURNAL_ENTRIES_MAX_LIMIT,
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/journal-entries", {
      params: { query: { status: "draft", year: 2026, month: 7, limit: 200 } },
    });
    expect(
      client.getQueryData([JOURNAL_ENTRIES_QUERY_KEY, "draft", 2026, 7, 200, null]),
    ).toEqual(ENTRY_LIST);
  });

  it("suzgecsiz cagride BOS sorgu gonderilir", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(ENTRY_LIST));

    const { result } = renderHook(() => useJournalEntries(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryOf()).toEqual({});
  });

  it("JOURNAL_ENTRIES_MAX_LIMIT semadaki tavanla ayni", () => {
    expect(JOURNAL_ENTRIES_MAX_LIMIT).toBe(200);
  });
});

describe("useChartOfAccounts", () => {
  it("GET /chart-of-accounts cagirir; suzgecler query'ye gecer", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(ACCOUNT_LIST));

    const { result } = renderHook(
      () => useChartOfAccounts({ q: "kasa", accountType: "asset", limit: CHART_ACCOUNTS_MAX_LIMIT }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryOf()).toEqual({ q: "kasa", account_type: "asset", limit: 200 });
    // Anahtarın SONU `allPages`tir: kırpılmış sayfa ile TAM katalog aynı
    // süzgeçte FARKLI yanıtlardır, tek anahtar paylaşsalardı biri ötekinin
    // önbelleğini okurdu.
    expect(
      client.getQueryData([CHART_OF_ACCOUNTS_QUERY_KEY, "kasa", "asset", null, 200, null, false]),
    ).toEqual(ACCOUNT_LIST);
  });

  /**
   * 🔴 Tavan 200 ve aşım 422'dir (kırpma DEĞİL) — 200'den çok hesabı olan bir
   * katalog TEK istekle alınamaz. `allPages` sayfaları YÜRÜR; yaprak kuralı
   * (`isLeafChartAccount`) kırpılmış kümede yanlış cevap verdiği için fiş
   * satırı seçicisinin tam kümeye ihtiyacı vardır.
   */
  it("allPages=true sayfalari YURUR ve TEK kumede birlestirir", async () => {
    const page = (codes: readonly string[], offset: number) =>
      okResponse({
        items: codes.map((code) => ({ code })),
        total: 3,
        limit: 2,
        offset,
      });
    vi.mocked(backendClient.GET)
      .mockResolvedValueOnce(page(["100", "120"], 0))
      .mockResolvedValueOnce(page(["600"], 2));

    const { result } = renderHook(() => useChartOfAccounts({ limit: 2, allPages: true }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledTimes(2);
    expect(queryOf(0)).toEqual({ limit: 2, offset: 0 });
    expect(queryOf(1)).toEqual({ limit: 2, offset: 2 });
    expect(result.current.data?.items.map((item) => item.code)).toEqual(["100", "120", "600"]);
    // Zarf dönen PENCEREYİ anlatır: tamamı geldi, `total` değişmez.
    expect(result.current.data?.limit).toBe(3);
    expect(result.current.data?.total).toBe(3);
  });

  /** Boş sayfa DURDURUR: `total` yanlış büyük gelse bile döngü kilitlenmez. */
  it("allPages=true bos sayfada DURUR (sonsuz donmez)", async () => {
    vi.mocked(backendClient.GET)
      .mockResolvedValueOnce(okResponse({ items: [{ code: "100" }], total: 9, limit: 1, offset: 0 }))
      .mockResolvedValueOnce(okResponse({ items: [], total: 9, limit: 1, offset: 1 }));

    const { result } = renderHook(() => useChartOfAccounts({ limit: 1, allPages: true }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledTimes(2);
    expect(result.current.data?.items).toHaveLength(1);
  });

  /** `isActive: false` MEŞRU bir süzgeçtir (kaldırılmış hesaplar). */
  it("isActive=false sorguda KORUNUR", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(ACCOUNT_LIST));

    const { result } = renderHook(() => useChartOfAccounts({ isActive: false }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryOf()).toEqual({ is_active: false });
  });

  it("enabled=false iken aga HIC cikilmaz", () => {
    renderHook(() => useChartOfAccounts({ enabled: false }), { wrapper });
    expect(backendClient.GET).not.toHaveBeenCalled();
  });

  it("CHART_ACCOUNTS_MAX_LIMIT semadaki tavanla ayni", () => {
    expect(CHART_ACCOUNTS_MAX_LIMIT).toBe(200);
  });
});
