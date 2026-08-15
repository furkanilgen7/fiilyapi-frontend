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
    expect(
      client.getQueryData([CHART_OF_ACCOUNTS_QUERY_KEY, "kasa", "asset", null, 200, null]),
    ).toEqual(ACCOUNT_LIST);
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
