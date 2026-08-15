import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";

import { useSession } from "@/components/shell/SessionProvider";
import type { ChartAccountListResponse } from "@/lib/api/hooks/useChartOfAccounts";
import { useChartOfAccounts } from "@/lib/api/hooks/useChartOfAccounts";
import type {
  JournalEntryDetailResponse,
  JournalEntryListResponse,
  JournalEntryResponse,
} from "@/lib/api/hooks/useJournalEntries";
import { useJournalEntries } from "@/lib/api/hooks/useJournalEntries";
import {
  useDeleteJournalEntry,
  usePostJournalEntry,
  useReverseJournalEntry,
} from "@/lib/api/hooks/useJournalEntryMutations";
import type { JournalSummaryResponse } from "@/lib/api/hooks/useJournalSummary";
import { useJournalSummary } from "@/lib/api/hooks/useJournalSummary";
import type { LedgerResponse, LedgerRow } from "@/lib/api/hooks/useLedger";
import { useLedger } from "@/lib/api/hooks/useLedger";
import { BackendError } from "@/lib/api/unwrap";
import type { MeResponse } from "@/lib/auth/types";

import { useJournalEntry } from "@/lib/api/hooks/useJournalEntry";
import {
  useCreateJournalEntry,
  useReplaceJournalLines,
  useUpdateJournalEntry,
} from "@/lib/api/hooks/useJournalEntryFormMutations";

import { AccountingView } from "./AccountingView";

vi.mock("@/lib/api/hooks/useJournalSummary", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useJournalSummary")>()),
  useJournalSummary: vi.fn(),
}));
vi.mock("@/lib/api/hooks/useLedger", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useLedger")>()),
  useLedger: vi.fn(),
}));
vi.mock("@/lib/api/hooks/useJournalEntries", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useJournalEntries")>()),
  useJournalEntries: vi.fn(),
}));
vi.mock("@/lib/api/hooks/useChartOfAccounts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useChartOfAccounts")>()),
  useChartOfAccounts: vi.fn(),
}));
vi.mock("@/lib/api/hooks/useJournalEntryMutations", () => ({
  usePostJournalEntry: vi.fn(),
  useReverseJournalEntry: vi.fn(),
  useDeleteJournalEntry: vi.fn(),
}));
vi.mock("@/lib/api/hooks/useJournalEntry", () => ({ useJournalEntry: vi.fn() }));
vi.mock("@/lib/api/hooks/useJournalEntryFormMutations", () => ({
  useCreateJournalEntry: vi.fn(),
  useUpdateJournalEntry: vi.fn(),
  useReplaceJournalLines: vi.fn(),
}));
vi.mock("@/components/shell/SessionProvider", () => ({ useSession: vi.fn() }));

const SUMMARY: JournalSummaryResponse = {
  year: 2026,
  month: 7,
  total_debit: "3842600.00",
  total_credit: "4120000.00",
  net_balance: "277400.00",
};

const CREDIT_ROW: LedgerRow = {
  entry_id: "entry-1",
  entry_date: "2026-07-17",
  entry_status: "posted",
  account_id: "acc-120",
  account_code: "120.01",
  account_name: "Alıcılar",
  description: "Hakediş Tahsilatı – Güneşkent",
  detail_note: "Ziraat Bank · TRF-20260717",
  debit: "0.00",
  credit: "1240000.00",
  running_balance: "4120000.00",
};

const DEBIT_ROW: LedgerRow = {
  entry_id: "entry-2",
  entry_date: "2026-07-16",
  entry_status: "reversed",
  account_id: "acc-320",
  account_code: "320.04",
  account_name: "Satıcılar",
  description: "Taşeron Ödemesi – Akın İnşaat",
  detail_note: null,
  debit: "1016800.00",
  credit: "0.00",
  running_balance: "2880000.00",
};

const LEDGER: LedgerResponse = {
  items: [CREDIT_ROW, DEBIT_ROW],
  total: 2,
  limit: 200,
  offset: 0,
  carried_balance: "0.00",
};

function entry(overrides: Partial<JournalEntryResponse> = {}): JournalEntryResponse {
  return {
    id: "entry-draft",
    entry_date: "2026-07-18",
    period_year: 2026,
    period_month: 7,
    description: "Kasa Devri",
    detail_note: null,
    status: "draft",
    total_debit: "1000.00",
    total_credit: "1000.00",
    reversal_of_id: null,
    created_by_id: "user-1",
    created_at: "2026-07-18T09:00:00Z",
    updated_at: "2026-07-18T09:00:00Z",
    ...overrides,
  };
}

const DRAFTS: JournalEntryListResponse = { items: [entry()], total: 1, limit: 200, offset: 0 };

const ACCOUNTS: ChartAccountListResponse = {
  items: [
    {
      id: "acc-120",
      code: "120.01",
      name: "Alıcılar",
      account_type: "asset",
      is_active: true,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      balance: "0.00",
      class_code: "1",
      level: 3,
    },
    {
      id: "acc-320",
      code: "320.04",
      name: "Satıcılar",
      account_type: "liability",
      is_active: true,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      balance: "0.00",
      class_code: "3",
      level: 3,
    },
  ],
  total: 2,
  limit: 200,
  offset: 0,
};

function queryOk<T>(data: T): UseQueryResult<T, Error> {
  return { data, isLoading: false, isError: false, error: null } as UseQueryResult<T, Error>;
}

function queryLoading<T>(): UseQueryResult<T, Error> {
  return {
    data: undefined,
    isLoading: true,
    isError: false,
    error: null,
  } as UseQueryResult<T, Error>;
}

function queryError<T>(error: Error): UseQueryResult<T, Error> {
  return { data: undefined, isLoading: false, isError: true, error } as UseQueryResult<T, Error>;
}

const mutateSpies = {
  post: vi.fn(),
  reverse: vi.fn(),
  remove: vi.fn(),
};

/** T4 diyaloğu `mutateAsync` kullanır (düzenlemede iki adımlı yazma sırası var). */
const formSpies = {
  create: vi.fn(),
  update: vi.fn(),
  replaceLines: vi.fn(),
};

function asyncMutationStub<TVariables>(
  mutateAsync: ReturnType<typeof vi.fn>,
): UseMutationResult<JournalEntryDetailResponse, Error, TVariables> {
  return { mutateAsync, isPending: false } as unknown as UseMutationResult<
    JournalEntryDetailResponse,
    Error,
    TVariables
  >;
}

/** Sunucudan gelen DENGELİ taslak fiş — düzenleme kipinin kaynağı. */
const DRAFT_DETAIL: JournalEntryDetailResponse = {
  ...entry(),
  lines: [
    {
      id: "line-1",
      sort_order: 0,
      account_id: "acc-120",
      account_code: "120.01",
      account_name: "Alıcılar",
      debit: "1000.00",
      credit: "0.00",
    },
    {
      id: "line-2",
      sort_order: 1,
      account_id: "acc-320",
      account_code: "320.04",
      account_name: "Satıcılar",
      debit: "0.00",
      credit: "1000.00",
    },
  ],
};

function mutationStub(mutate: ReturnType<typeof vi.fn>) {
  return { mutate } as unknown as UseMutationResult<JournalEntryDetailResponse, Error, string>;
}

function setSession(level: string | undefined = "full") {
  vi.mocked(useSession).mockReturnValue({
    me: (level === undefined
      ? { permissions: {} }
      : { permissions: { accounting: level } }) as unknown as MeResponse,
  } as ReturnType<typeof useSession>);
}

beforeEach(() => {
  vi.clearAllMocks();
  // 17 Temmuz 2026 YEREL öğle — E8:75 "Temmuz 2026" başlığının kaynağı.
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 6, 17, 12, 0, 0));
  setSession();
  vi.mocked(useJournalSummary).mockReturnValue(queryOk(SUMMARY));
  vi.mocked(useLedger).mockReturnValue(queryOk(LEDGER));
  vi.mocked(useJournalEntries).mockReturnValue(queryOk(DRAFTS));
  vi.mocked(useChartOfAccounts).mockReturnValue(queryOk(ACCOUNTS));
  vi.mocked(usePostJournalEntry).mockReturnValue(mutationStub(mutateSpies.post));
  vi.mocked(useReverseJournalEntry).mockReturnValue(mutationStub(mutateSpies.reverse));
  vi.mocked(useDeleteJournalEntry).mockReturnValue(
    mutationStub(mutateSpies.remove) as unknown as UseMutationResult<void, Error, string>,
  );
  formSpies.create.mockResolvedValue(undefined);
  formSpies.update.mockResolvedValue(undefined);
  formSpies.replaceLines.mockResolvedValue(undefined);
  vi.mocked(useCreateJournalEntry).mockReturnValue(asyncMutationStub(formSpies.create));
  vi.mocked(useUpdateJournalEntry).mockReturnValue(asyncMutationStub(formSpies.update));
  vi.mocked(useReplaceJournalLines).mockReturnValue(asyncMutationStub(formSpies.replaceLines));
  vi.mocked(useJournalEntry).mockReturnValue(queryOk(DRAFT_DETAIL));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("AccountingView — başlık ve eylemler (E8:62-67)", () => {
  it("breadcrumb, baslik ve iki dugme basilir", () => {
    render(<AccountingView />);
    expect(screen.getByText("Sözleşme & Mali")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Muhasebe", level: 1 })).toBeInTheDocument();
    expect(screen.getByTestId("mu-export")).toBeInTheDocument();
    expect(screen.getByTestId("mu-create-entry")).toBeInTheDocument();
  });

  /**
   * 🔴 KANON: ucu olmayan düğme SİLİNMEZ, devre dışı basılır ve gerekçesi
   * `title`da SAKLANMAZ — EKRANDA görünür.
   */
  it("'Disa Aktar' devre disidir ve gerekcesi EKRANDA gorunur", () => {
    render(<AccountingView />);
    expect(screen.getByTestId("mu-export")).toBeDisabled();
    expect(screen.getByTestId("mu-export-reason")).toHaveTextContent(
      "Yevmiye defteri dışa aktarma ucu henüz açılmadı",
    );
  });

  it("'+ Yevmiye Kaydi' GERCEK diyalogu OLUSTURMA kipinde acar", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AccountingView />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByTestId("mu-create-entry"));
    expect(screen.getByRole("dialog", { name: "Yeni Yevmiye Fişi" })).toBeInTheDocument();
    // 📅 Varsayılan tarih YEREL takvimden (sistem saati 17 Temmuz 2026).
    expect(screen.getByTestId("mu-entry-date")).toHaveValue("2026-07-17");
  });

  it("yazma yetkisi yoksa '+ Yevmiye Kaydi' devre disidir ve gerekce gorunur", () => {
    setSession("view");
    render(<AccountingView />);
    expect(screen.getByTestId("mu-create-entry")).toBeDisabled();
    expect(screen.getByTestId("mu-write-notice")).toBeInTheDocument();
  });

  it("izin 'none' ise ekran ACILMAZ", () => {
    setSession("none");
    render(<AccountingView />);
    expect(screen.getByText("Bu alana yetkiniz yok")).toBeInTheDocument();
  });
});

describe("dönem seçici (E8:74-77)", () => {
  /** 🔴 TB5 dersi: varsayılan ay YEREL takvimden gelir, ham UTC gününden değil. */
  it("varsayilan donem YEREL takvimin ayidir", () => {
    render(<AccountingView />);
    expect(screen.getByTestId("mu-period-label")).toHaveTextContent("Temmuz 2026");
  });

  it("ok tuslari donemi kaydirir ve sorgulara gecirir", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AccountingView />);

    await user.click(screen.getByTestId("mu-period-prev"));
    expect(screen.getByTestId("mu-period-label")).toHaveTextContent("Haziran 2026");
    expect(vi.mocked(useJournalSummary)).toHaveBeenLastCalledWith(2026, 6);
    expect(vi.mocked(useLedger).mock.lastCall?.[0]).toMatchObject({ year: 2026, month: 6 });
    expect(vi.mocked(useJournalEntries).mock.lastCall?.[0]).toMatchObject({
      year: 2026,
      month: 6,
    });
    // 🔴 T5 BULGUSU BEKÇİSİ: `status` süzgeci GÖNDERİLMEZ. Gönderilseydi
    // `posted` fiş panelde hiç görünmez ve "Storno" düğmesi kullanıcı için
    // ULAŞILAMAZ olurdu (defterde eylem yoktur). Bu iddia geri dönüşü yakalar.
    expect(vi.mocked(useJournalEntries).mock.lastCall?.[0]).not.toHaveProperty("status");
  });
});

describe("KPI şeridi (E8:78-89)", () => {
  it("uc kart mockup bicimiyle basilir", () => {
    render(<AccountingView />);
    expect(screen.getByTestId("mu-kpi-debit")).toHaveTextContent("₺ 3.842.600");
    expect(screen.getByTestId("mu-kpi-credit")).toHaveTextContent("₺ 4.120.000");
    expect(screen.getByTestId("mu-kpi-net")).toHaveTextContent("₺ 277.400");
  });

  it("pozitif net bakiye YESIL, negatif KIRMIZI basilir", () => {
    const { unmount } = render(<AccountingView />);
    expect(screen.getByTestId("mu-kpi-net-value").className).toContain("--success");
    unmount();

    vi.mocked(useJournalSummary).mockReturnValue(
      queryOk({ ...SUMMARY, net_balance: "-277400.00" }),
    );
    render(<AccountingView />);
    expect(screen.getByTestId("mu-kpi-net-value").className).toContain("--danger");
  });

  it("ozet hatasi GORUNUR bir bantla basilir (sessiz yutma YOK)", () => {
    vi.mocked(useJournalSummary).mockReturnValue(
      queryError(new BackendError(500, { detail: "Özet hesaplanamadı." })),
    );
    render(<AccountingView />);
    expect(screen.getByTestId("mu-summary-error")).toHaveTextContent("Özet hesaplanamadı.");
  });
});

describe("yevmiye defteri (E8:93-159)", () => {
  it("alti sutun mockup sirasiyla basilir", () => {
    render(<AccountingView />);
    const headers = screen.getAllByRole("columnheader").slice(0, 6).map((el) => el.textContent);
    expect(headers).toEqual(["Tarih", "Hesap Kodu", "Açıklama", "Borç", "Alacak", "Bakiye"]);
  });

  it("aciklama IKI SATIRLIdir; detail_note null ise alt satir BASILMAZ", () => {
    render(<AccountingView />);
    expect(screen.getByText("Ziraat Bank · TRF-20260717")).toBeInTheDocument();
    expect(screen.getByText("Taşeron Ödemesi – Akın İnşaat")).toBeInTheDocument();
    // İkinci satırın notu `null` — o hücrede ikinci bir metin satırı yoktur.
    const ledgerPanel = screen.getByRole("region", { name: "Yevmiye Defteri" });
    expect(ledgerPanel.querySelectorAll(".mu-table__note")).toHaveLength(1);
  });

  it("bos taraf `—` basar; dolu taraf tutari basar", () => {
    render(<AccountingView />);
    const rows = screen.getAllByRole("row");
    // rows[0] başlık; ilk veri satırı ALACAK bacağıdır (borç boş).
    expect(rows[1].textContent).toContain("—");
    expect(rows[1].textContent).toContain("1.240.000");
  });

  /**
   * 🔴 `running_balance` OLDUĞU GİBİ basılır — istemcide yeniden hesaplanmaz.
   * Sunucunun verdiği iki değer birbirinin devamı değildir (pencere DESC
   * sıralı); istemci hesaplasaydı ikinci satır 4.120.000−1.016.800 çıkardı.
   */
  it("bakiye sunucunun running_balance'ini OLDUGU GIBI basar", () => {
    render(<AccountingView />);
    const rows = screen.getAllByRole("row");
    expect(rows[1].textContent).toContain("4.120.000");
    expect(rows[2].textContent).toContain("2.880.000");
    expect(rows[2].textContent).not.toContain("3.103.200");
  });

  /** 🔴 `reversed` fiş DEFTERDE KALIR — istemci yeniden süzmez. */
  it("reversed satir defterden ATILMAZ", () => {
    render(<AccountingView />);
    expect(screen.getByText("Taşeron Ödemesi – Akın İnşaat")).toBeInTheDocument();
  });

  it("carried_balance sifirsa devir bandi BASILMAZ", () => {
    render(<AccountingView />);
    expect(screen.queryByTestId("mu-carried-balance")).not.toBeInTheDocument();
  });

  it("carried_balance sifir DEGILSE gorunur devir bandi basilir", () => {
    vi.mocked(useLedger).mockReturnValue(queryOk({ ...LEDGER, carried_balance: "2880000.00" }));
    render(<AccountingView />);
    expect(screen.getByTestId("mu-carried-balance")).toHaveTextContent("Devir bakiyesi");
    expect(screen.getByTestId("mu-carried-balance")).toHaveTextContent("2.880.000");
  });

  it("kirpilma bandi total > items oldugunda GORUNUR", () => {
    vi.mocked(useLedger).mockReturnValue(queryOk({ ...LEDGER, total: 640 }));
    render(<AccountingView />);
    expect(screen.getByTestId("mu-ledger-truncation")).toHaveTextContent(
      "İlk 2 kayıt gösteriliyor (toplam 640) — liste eksik.",
    );
  });

  it("kirpilma yoksa bant BASILMAZ", () => {
    render(<AccountingView />);
    expect(screen.queryByTestId("mu-ledger-truncation")).not.toBeInTheDocument();
  });

  it("yukleniyor / bos / hata durumlarinin HEPSI gorunur", () => {
    vi.mocked(useLedger).mockReturnValue(queryLoading());
    const loading = render(<AccountingView />);
    expect(screen.getByTestId("mu-ledger-loading")).toBeInTheDocument();
    loading.unmount();

    vi.mocked(useLedger).mockReturnValue(queryOk({ ...LEDGER, items: [], total: 0 }));
    const empty = render(<AccountingView />);
    expect(screen.getByTestId("mu-ledger-empty")).toBeInTheDocument();
    empty.unmount();

    vi.mocked(useLedger).mockReturnValue(queryError(new BackendError(500, { detail: "Defter yüklenemedi." })));
    render(<AccountingView />);
    expect(screen.getByTestId("mu-ledger-error")).toHaveTextContent("Defter yüklenemedi.");
  });

  it("hesap suzgeci 'Tum Hesaplar' + sunucudan gelen hesaplari listeler", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AccountingView />);

    const select = screen.getByTestId("mu-account-filter");
    expect(select.tagName).toBe("SELECT");
    expect(screen.getByRole("option", { name: "Tüm Hesaplar" })).toBeInTheDocument();

    await user.selectOptions(select, "acc-120");
    expect(vi.mocked(useLedger).mock.lastCall?.[0]).toMatchObject({ accountId: "acc-120" });
  });
});

describe("Taslak Fişler paneli (onaylı sapma adayı)", () => {
  it("taslak satirinda Duzenle + Kayitlastir + Sil vardir, Storno YOKTUR", () => {
    render(<AccountingView />);
    expect(screen.getByTestId("mu-draft-edit-entry-draft")).toBeInTheDocument();
    expect(screen.getByTestId("mu-draft-post-entry-draft")).toBeInTheDocument();
    expect(screen.getByTestId("mu-draft-delete-entry-draft")).toBeInTheDocument();
    expect(screen.queryByTestId("mu-draft-reverse-entry-draft")).not.toBeInTheDocument();
  });

  /** 🔴 BEKÇİ (yönetim kararı 2): `posted` fişte düzenle/sil HİÇ SUNULMAZ. */
  it("posted fiste duzenle/sil YOKTUR, YALNIZ Storno vardir", () => {
    vi.mocked(useJournalEntries).mockReturnValue(
      queryOk({ ...DRAFTS, items: [entry({ id: "e-p", status: "posted" })] }),
    );
    render(<AccountingView />);
    expect(screen.queryByTestId("mu-draft-edit-e-p")).not.toBeInTheDocument();
    expect(screen.queryByTestId("mu-draft-delete-e-p")).not.toBeInTheDocument();
    expect(screen.queryByTestId("mu-draft-post-e-p")).not.toBeInTheDocument();
    expect(screen.getByTestId("mu-draft-reverse-e-p")).toBeInTheDocument();
  });

  it("reversed fiste HICBIR eylem sunulmaz", () => {
    vi.mocked(useJournalEntries).mockReturnValue(
      queryOk({ ...DRAFTS, items: [entry({ id: "e-r", status: "reversed" })] }),
    );
    render(<AccountingView />);
    expect(screen.queryByTestId("mu-draft-edit-e-r")).not.toBeInTheDocument();
    expect(screen.queryByTestId("mu-draft-delete-e-r")).not.toBeInTheDocument();
    expect(screen.queryByTestId("mu-draft-reverse-e-r")).not.toBeInTheDocument();
  });

  it("durum rozetleri Turkce etiketleri basar (ham enum DEGIL)", () => {
    vi.mocked(useJournalEntries).mockReturnValue(
      queryOk({
        ...DRAFTS,
        items: [
          entry({ id: "e-d", status: "draft" }),
          entry({ id: "e-p", status: "posted" }),
          entry({ id: "e-r", status: "reversed" }),
        ],
        total: 3,
      }),
    );
    render(<AccountingView />);
    expect(screen.getByText("Taslak")).toBeInTheDocument();
    expect(screen.getByText("Kayıtlı")).toBeInTheDocument();
    expect(screen.getByText("Ters Kayıtlı")).toBeInTheDocument();
  });

  it("'Kayitlastir' mutation'i FIS KIMLIGIYLE cagirir", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AccountingView />);

    await user.click(screen.getByTestId("mu-draft-post-entry-draft"));
    expect(mutateSpies.post).toHaveBeenCalledWith("entry-draft", expect.anything());
  });

  it("'Sil' mutation'i FIS KIMLIGIYLE cagirir", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AccountingView />);

    await user.click(screen.getByTestId("mu-draft-delete-entry-draft"));
    expect(mutateSpies.remove).toHaveBeenCalledWith("entry-draft", expect.anything());
  });

  /**
   * 🔴 İstek uçarken satırın TÜM eylemleri kapanır — aksi hâlde iki kez
   * "Kayıtlaştır" tıklanabilir ve ikincisi 409 alırdı (kullanıcıya hata gibi
   * görünen bir yarış). `onSettled` gelene kadar düğmeler devre dışıdır.
   */
  it("islem surerken ayni satirin dugmeleri KAPANIR", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AccountingView />);

    await user.click(screen.getByTestId("mu-draft-post-entry-draft"));
    expect(screen.getByTestId("mu-draft-post-entry-draft")).toBeDisabled();
    expect(screen.getByTestId("mu-draft-delete-entry-draft")).toBeDisabled();
    expect(screen.getByTestId("mu-draft-edit-entry-draft")).toBeDisabled();
  });

  it("Duzenle diyalogu FIS KIMLIGIYLE acar ve bacaklari doldurur", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AccountingView />);

    await user.click(screen.getByTestId("mu-draft-edit-entry-draft"));
    expect(vi.mocked(useJournalEntry)).toHaveBeenCalledWith("entry-draft");
    expect(screen.getByRole("dialog", { name: "Yevmiye Fişi Düzenle" })).toBeInTheDocument();
    expect(screen.getAllByTestId("mu-line-row")).toHaveLength(2);
    // SIFIR taraf formda BOŞ görünür (tek-taraf kısıtı ekranda anlaşılsın).
    expect(screen.getByTestId("mu-line-debit-0")).toHaveValue(1000);
    expect(screen.getByTestId("mu-line-credit-0")).toHaveValue(null);
  });

  it("mutation hatasi GORUNUR bir bantla basilir", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    mutateSpies.post.mockImplementation(
      (_id: string, options: { onError: (e: Error) => void; onSettled: () => void }) => {
        options.onError(new BackendError(422, { detail: "Fiş dengeli değil." }));
        options.onSettled();
      },
    );
    render(<AccountingView />);

    await user.click(screen.getByTestId("mu-draft-post-entry-draft"));
    expect(screen.getByTestId("mu-action-error")).toHaveTextContent("Fiş dengeli değil.");
  });

  it("bos / yukleniyor / hata durumlarinin HEPSI gorunur", () => {
    vi.mocked(useJournalEntries).mockReturnValue(queryOk({ ...DRAFTS, items: [], total: 0 }));
    const empty = render(<AccountingView />);
    expect(screen.getByTestId("mu-drafts-empty")).toBeInTheDocument();
    empty.unmount();

    vi.mocked(useJournalEntries).mockReturnValue(queryLoading());
    const loading = render(<AccountingView />);
    expect(screen.getByTestId("mu-drafts-loading")).toBeInTheDocument();
    loading.unmount();

    vi.mocked(useJournalEntries).mockReturnValue(
      queryError(new BackendError(500, { detail: "Taslaklar yüklenemedi." })),
    );
    render(<AccountingView />);
    expect(screen.getByTestId("mu-drafts-error")).toHaveTextContent("Taslaklar yüklenemedi.");
  });
});

/**
 * T4 · Yevmiye Kaydı diyaloğu. Form mockup'ı YOKTUR (S-FRM kanonu): alanlar
 * `JournalEntryCreate` + `JournalLineInput`tan birebir türer.
 */
describe("Yevmiye Kaydı diyaloğu (T4)", () => {
  async function openCreate() {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AccountingView />);
    await user.click(screen.getByTestId("mu-create-entry"));
    return user;
  }

  it("hesap secicisi YALNIZ yaprak hesaplari sunar (backend §4c)", async () => {
    await openCreate();
    const options = within(screen.getByTestId("mu-line-account-0")).getAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual([
      "Hesap seçin",
      "120.01 · Alıcılar",
      "320.04 · Satıcılar",
    ]);
  });

  /** 🔴 TEK TARAF: aynı satırda hem borç hem alacak dolamaz. */
  it("bir tarafa deger girilince oteki TEMIZLENIR ve KILITLENIR", async () => {
    const user = await openCreate();
    await user.type(screen.getByTestId("mu-line-credit-0"), "500");
    expect(screen.getByTestId("mu-line-debit-0")).toBeDisabled();

    await user.clear(screen.getByTestId("mu-line-credit-0"));
    await user.type(screen.getByTestId("mu-line-debit-0"), "300");
    expect(screen.getByTestId("mu-line-credit-0")).toBeDisabled();
    expect(screen.getByTestId("mu-line-credit-0")).toHaveValue(null);
  });

  /**
   * 🔴 DENGE KAPISI — kullanıcı dengesizliği GÖNDERMEDEN ÖNCE görür.
   * Kuruş farkı da dengesizdir (tolerans YOK).
   */
  it("denge kapisi: esitken ACIK, bir kurus kayinca KAPALI", async () => {
    const user = await openCreate();
    await user.type(screen.getByTestId("mu-entry-description"), "Kasa Devri");
    await user.selectOptions(screen.getByTestId("mu-line-account-0"), "acc-120");
    await user.selectOptions(screen.getByTestId("mu-line-account-1"), "acc-320");
    await user.type(screen.getByTestId("mu-line-debit-0"), "100.00");
    await user.type(screen.getByTestId("mu-line-credit-1"), "100.01");

    expect(screen.getByTestId("mu-balance-difference")).toHaveTextContent("-0,01");
    expect(screen.getByTestId("mu-balance-state")).toHaveTextContent("Fiş dengede değil");
    expect(screen.getByTestId("mu-entry-dialog-save")).toBeDisabled();
    expect(screen.getByTestId("mu-entry-dialog-blockers")).toHaveTextContent(
      "Fiş dengede değil: borç ve alacak toplamları eşit olmalıdır",
    );

    // Tek karakter geri alınır → kapı AÇILIR.
    await user.clear(screen.getByTestId("mu-line-credit-1"));
    await user.type(screen.getByTestId("mu-line-credit-1"), "100.00");
    expect(screen.getByTestId("mu-balance-state")).toHaveTextContent("Fiş dengede.");
    expect(screen.getByTestId("mu-entry-dialog-save")).toBeEnabled();
  });

  /** 🔴 AYRIŞMA NOKTASI: float aritmetiğiyle bu fiş "dengesiz" görünürdü. */
  it("0.1 + 0.2 vs 0.3 fisinde kapi ACIKTIR (kayan nokta kapiya sizmaz)", async () => {
    const user = await openCreate();
    await user.type(screen.getByTestId("mu-entry-description"), "Kuruş testi");
    await user.click(screen.getByTestId("mu-line-add"));
    await user.selectOptions(screen.getByTestId("mu-line-account-0"), "acc-120");
    await user.selectOptions(screen.getByTestId("mu-line-account-1"), "acc-120");
    await user.selectOptions(screen.getByTestId("mu-line-account-2"), "acc-320");
    await user.type(screen.getByTestId("mu-line-debit-0"), "0.1");
    await user.type(screen.getByTestId("mu-line-debit-1"), "0.2");
    await user.type(screen.getByTestId("mu-line-credit-2"), "0.3");

    expect(screen.getByTestId("mu-balance-state")).toHaveTextContent("Fiş dengede.");
    expect(screen.getByTestId("mu-entry-dialog-save")).toBeEnabled();
  });

  it("tek satirli fiste kaydet KAPALIdir (sunucu en az iki satir ister)", async () => {
    const user = await openCreate();
    await user.type(screen.getByTestId("mu-entry-description"), "Tek bacak");
    await user.click(screen.getByTestId("mu-line-remove-1"));
    expect(screen.getAllByTestId("mu-line-row")).toHaveLength(1);
    expect(screen.getByTestId("mu-entry-dialog-blockers")).toHaveTextContent(
      "Fişte en az iki satır olmalıdır",
    );
    expect(screen.getByTestId("mu-entry-dialog-save")).toBeDisabled();
  });

  it("olusturma govdesi: bos taraf '0' GIDER, turev alan SIZMAZ", async () => {
    const user = await openCreate();
    await user.type(screen.getByTestId("mu-entry-description"), "Kasa Devri");
    await user.type(screen.getByTestId("mu-entry-detail-note"), "Ziraat · TRF-1");
    await user.selectOptions(screen.getByTestId("mu-line-account-0"), "acc-120");
    await user.selectOptions(screen.getByTestId("mu-line-account-1"), "acc-320");
    await user.type(screen.getByTestId("mu-line-debit-0"), "1000");
    await user.type(screen.getByTestId("mu-line-credit-1"), "1000");
    await user.click(screen.getByTestId("mu-entry-dialog-save"));

    expect(formSpies.create).toHaveBeenCalledWith({
      entry_date: "2026-07-17",
      description: "Kasa Devri",
      detail_note: "Ziraat · TRF-1",
      lines: [
        { account_id: "acc-120", debit: "1000", credit: "0" },
        { account_id: "acc-320", debit: "0", credit: "1000" },
      ],
    });
    const [body] = formSpies.create.mock.calls[0] as [Record<string, unknown>];
    for (const derived of ["status", "total_debit", "total_credit", "period_year"]) {
      expect(body).not.toHaveProperty(derived);
    }
  });

  /**
   * 🔴 T7 BULGUSU (mutasyon hayatta kalmıştı): katalog sayfalanmış ya da
   * süzülmüş gelirse düzenlenen fişin hesabı seçenek listesinde OLMAYABİLİR.
   * Seçenek basılmazsa tarayıcı `value`yu sessizce ilk seçeneğe ("Hesap seçin")
   * kaydırır — kullanıcı yalnız tarihi değiştirdiğini sanırken fişin HESABINI
   * kaybederdi. `JournalLinesEditor`ın `isKnown` dalı bunun için yazılmıştı ama
   * hiçbir test onu ölçmüyordu.
   */
  it("🔴 katalogda OLMAYAN hesap secenekten DUSMEZ; secili kalir ve kendi adiyla basilir", async () => {
    // Katalog yalnız `acc-320`yi döndürür: fişin `acc-120` bacağı sayfada YOK.
    vi.mocked(useChartOfAccounts).mockReturnValue(
      queryOk({ ...ACCOUNTS, items: [ACCOUNTS.items[1]], total: 1 }),
    );
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AccountingView />);
    await user.click(screen.getByTestId("mu-draft-edit-entry-draft"));

    const select = screen.getByTestId("mu-line-account-0");
    // Değer KAYMAZ: hâlâ fişin kendi hesabı seçilidir.
    expect(select).toHaveValue("acc-120");
    // Etiket fişin KENDİ satırından okunur (katalogdan değil).
    expect(within(select).getByRole("option", { name: "120.01 · Alıcılar" })).toBeInTheDocument();

    // Ve bu tek başına bir DEĞİŞİKLİK sayılmaz: kaydet hiçbir satır isteği atmaz.
    await user.click(screen.getByTestId("mu-entry-dialog-save"));
    expect(formSpies.replaceLines).not.toHaveBeenCalled();
  });

  it("duzenlemede yalniz BASLIK oynarsa PUT …/lines HIC atilmaz", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AccountingView />);
    await user.click(screen.getByTestId("mu-draft-edit-entry-draft"));

    await user.clear(screen.getByTestId("mu-entry-description"));
    await user.type(screen.getByTestId("mu-entry-description"), "Düzeltilmiş açıklama");
    await user.click(screen.getByTestId("mu-entry-dialog-save"));

    expect(formSpies.update).toHaveBeenCalledWith({
      entryId: "entry-draft",
      body: { description: "Düzeltilmiş açıklama" },
    });
    expect(formSpies.replaceLines).not.toHaveBeenCalled();
  });

  it("duzenlemede hicbir sey degismediyse HICBIR istek atilmaz", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AccountingView />);
    await user.click(screen.getByTestId("mu-draft-edit-entry-draft"));
    await user.click(screen.getByTestId("mu-entry-dialog-save"));

    expect(formSpies.update).not.toHaveBeenCalled();
    expect(formSpies.replaceLines).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  /** 🔴 KISMİ BAŞARISIZLIK SESSİZCE YUTULMAZ. */
  it("baslik yazilip satirlar patlarsa kullaniciya IKISI de soylenir", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    formSpies.replaceLines.mockRejectedValue(
      new BackendError(422, { detail: "Fiş dengede değil: borç ve alacak toplamları eşit olmalıdır" }),
    );
    render(<AccountingView />);
    await user.click(screen.getByTestId("mu-draft-edit-entry-draft"));

    await user.clear(screen.getByTestId("mu-entry-description"));
    await user.type(screen.getByTestId("mu-entry-description"), "Yeni açıklama");
    await user.clear(screen.getByTestId("mu-line-debit-0"));
    await user.type(screen.getByTestId("mu-line-debit-0"), "1500");
    await user.clear(screen.getByTestId("mu-line-credit-1"));
    await user.type(screen.getByTestId("mu-line-credit-1"), "1500");
    await user.click(screen.getByTestId("mu-entry-dialog-save"));

    const error = await screen.findByTestId("mu-entry-dialog-error");
    expect(error).toHaveTextContent("Başlık güncellendi ancak satırlar kaydedilemedi");
    expect(error).toHaveTextContent("Fiş dengede değil");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("🔴 sunucu hatasi TURKCE cumleyle basilir; ham govde EKRANA CIKMAZ", async () => {
    const user = await openCreate();
    formSpies.create.mockRejectedValue(
      new BackendError(422, { detail: [{ loc: ["body", "lines"], type: "missing" }] }),
    );
    await user.type(screen.getByTestId("mu-entry-description"), "Kasa Devri");
    await user.selectOptions(screen.getByTestId("mu-line-account-0"), "acc-120");
    await user.selectOptions(screen.getByTestId("mu-line-account-1"), "acc-320");
    await user.type(screen.getByTestId("mu-line-debit-0"), "1000");
    await user.type(screen.getByTestId("mu-line-credit-1"), "1000");
    await user.click(screen.getByTestId("mu-entry-dialog-save"));

    const error = await screen.findByTestId("mu-entry-dialog-error");
    expect(error).toHaveTextContent("Fiş oluşturulamadı.");
    expect(error.textContent).not.toContain("loc");
  });

  it("SAVUNMACI: draft OLMAYAN fisle acilirsa form KILITLIDIR", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.mocked(useJournalEntry).mockReturnValue(
      queryOk({ ...DRAFT_DETAIL, status: "posted" as const }),
    );
    render(<AccountingView />);
    await user.click(screen.getByTestId("mu-draft-edit-entry-draft"));

    expect(screen.getByTestId("mu-entry-dialog-locked")).toBeInTheDocument();
    expect(screen.getByTestId("mu-entry-dialog-save")).toBeDisabled();
    expect(screen.getByTestId("mu-entry-description")).toBeDisabled();
  });

  it("detay yuklenirken ve hata verirken diyalog SESSIZ kalmaz", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.mocked(useJournalEntry).mockReturnValue(queryLoading());
    const loading = render(<AccountingView />);
    await user.click(screen.getByTestId("mu-draft-edit-entry-draft"));
    expect(screen.getByTestId("mu-entry-dialog-loading")).toBeInTheDocument();
    loading.unmount();

    vi.mocked(useJournalEntry).mockReturnValue(
      queryError(new BackendError(404, { detail: "Fiş bulunamadı" })),
    );
    render(<AccountingView />);
    await user.click(screen.getByTestId("mu-draft-edit-entry-draft"));
    expect(screen.getByTestId("mu-entry-dialog-load-error")).toHaveTextContent("Fiş bulunamadı");
  });
});
