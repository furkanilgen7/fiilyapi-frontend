import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useSession } from "@/components/shell/SessionProvider";
import type { AccountingPeriodListItem, AccountingPeriodResponse } from "@/lib/api/hooks/useAccountingPeriods";
import { useAccountingPeriods } from "@/lib/api/hooks/useAccountingPeriods";
import {
  useCloseAccountingPeriod,
  useReopenAccountingPeriod,
} from "@/lib/api/hooks/useAccountingPeriodMutations";
import { useTrialBalance } from "@/lib/api/hooks/useTrialBalance";
import { BackendError } from "@/lib/api/unwrap";
import type { MeResponse } from "@/lib/auth/types";

import { PeriodClosingView } from "./PeriodClosingView";

vi.mock("@/lib/api/hooks/useAccountingPeriods", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useAccountingPeriods")>()),
  useAccountingPeriods: vi.fn(),
}));
vi.mock("@/lib/api/hooks/useAccountingPeriodMutations", () => ({
  useCloseAccountingPeriod: vi.fn(),
  useReopenAccountingPeriod: vi.fn(),
}));
vi.mock("@/lib/api/hooks/useTrialBalance", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useTrialBalance")>()),
  useTrialBalance: vi.fn(),
}));
vi.mock("@/components/shell/SessionProvider", () => ({ useSession: vi.fn() }));

function item(partial: Partial<AccountingPeriodListItem>): AccountingPeriodListItem {
  return {
    id: `period-${partial.month}`,
    year: 2026,
    month: 1,
    status: "open",
    closed_at: null,
    closed_by_id: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    entry_count: 0,
    draft_count: 0,
    closed_by_name: null,
    ...partial,
  };
}

// DK:93-236 örnek dağılımı: Oca-Haz kapalı, Tem engelli, Ağu kapatılabilir,
// Eyl-Ara kayıt yok.
const DK_EXAMPLE_ITEMS: AccountingPeriodListItem[] = [
  item({ month: 1, status: "closed", entry_count: 142, closed_by_name: "Ayşe Demir", closed_at: "2026-02-05T09:00:00Z" }),
  item({ month: 2, status: "closed", entry_count: 168, closed_by_name: "Ayşe Demir", closed_at: "2026-03-04T09:00:00Z" }),
  item({ month: 3, status: "closed", entry_count: 184, closed_by_name: "Ayşe Demir", closed_at: "2026-04-06T09:00:00Z" }),
  item({ month: 4, status: "closed", entry_count: 176, closed_by_name: "Ayşe Demir", closed_at: "2026-05-05T09:00:00Z" }),
  item({ month: 5, status: "closed", entry_count: 192, closed_by_name: "Ayşe Demir", closed_at: "2026-06-04T09:00:00Z" }),
  item({ month: 6, status: "closed", entry_count: 204, closed_by_name: "Ayşe Demir", closed_at: "2026-07-07T09:00:00Z" }),
  item({ month: 7, status: "open", entry_count: 218, draft_count: 3 }),
  item({ month: 8, status: "open", entry_count: 86, draft_count: 0 }),
];

function queryResult(partial: Record<string, unknown>) {
  return {
    data: undefined,
    error: null,
    isLoading: false,
    isError: false,
    ...partial,
  } as unknown as UseQueryResult<AccountingPeriodListItem[], Error>;
}

function mutationStub(mutateAsync: ReturnType<typeof vi.fn>, isPending = false) {
  return { mutateAsync, isPending } as unknown as UseMutationResult<
    AccountingPeriodResponse,
    Error,
    { year: number; month: number }
  >;
}

function setSession(level: string | undefined) {
  vi.mocked(useSession).mockReturnValue({
    me: { permissions: level === undefined ? {} : { accounting: level } } as unknown as MeResponse,
  } as unknown as ReturnType<typeof useSession>);
}

const closeMutate = vi.fn();
const reopenMutate = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 6, 20, 9, 0, 0)); // 20 Temmuz 2026 — YEREL takvim
  setSession("full");
  vi.mocked(useAccountingPeriods).mockReturnValue(queryResult({ data: DK_EXAMPLE_ITEMS }));
  vi.mocked(useCloseAccountingPeriod).mockReturnValue(mutationStub(closeMutate));
  vi.mocked(useReopenAccountingPeriod).mockReturnValue(mutationStub(reopenMutate));
  vi.mocked(useTrialBalance).mockReturnValue(
    queryResult({ data: { year: 2026, month: 8, is_balanced: true, rows: [], totals: {} } }) as unknown as UseQueryResult<
      never,
      Error
    >,
  );
});

describe("DK — başlık + yetki notu", () => {
  it("başlık ve alt yazı basılır (DK:60-61)", () => {
    render(<PeriodClosingView />);
    expect(screen.getByRole("heading", { name: "Dönem Kapanışı" })).toBeInTheDocument();
    expect(screen.getByTestId("dkap-subtitle")).toHaveTextContent(
      "Kapatılan döneme yeni fiş girilemez, mevcut fişler değiştirilemez",
    );
  });

  it("K1 — yetki notu metni backend'le BİREBİR basılır", () => {
    render(<PeriodClosingView />);
    const note = screen.getByTestId("dkap-role-note");
    expect(note).toHaveTextContent("Muhasebe rolü dönem kapatabilir, ancak geri açamaz.");
    expect(note).toHaveTextContent(
      "Kapalı bir dönemin geri açılması yalnızca Sistem Yöneticisi tarafından yapılabilir ve denetim günlüğüne işlenir.",
    );
  });

  it("yıl seçici varsayılan yılı YEREL takvimden alır", () => {
    render(<PeriodClosingView />);
    expect(vi.mocked(useAccountingPeriods)).toHaveBeenCalledWith(2026);
  });
});

describe("K4 — özet şeridinin dört sayısı SAYILARAK basılır", () => {
  it("DK:69 örnek dağılımıyla aynı: 6/1/1/4", () => {
    render(<PeriodClosingView />);
    expect(screen.getByTestId("dkap-summary")).toHaveTextContent(
      "6 kapalı · 1 kapatılabilir · 1 engelli · 4 kayıt yok",
    );
  });
});

describe("K2 — engelli satır (draft_count > 0)", () => {
  it("Temmuz satırı engelli görünür, 'Dönemi Kapat' devre dışı ve gerekçe görünür bant taşır", () => {
    render(<PeriodClosingView />);
    const closeButton = screen.getByTestId("dkap-close-7");
    expect(closeButton).toBeDisabled();
    expect(closeButton).toHaveAttribute("title", "Dönem kapatılamıyor — 3 taslak fiş var");

    const banner = screen.getByTestId("dkap-blocked-reason-7");
    expect(within(banner).getByText("Dönem kapatılamıyor — 3 taslak fiş var")).toBeInTheDocument();
  });

  it("Ağustos (kapatılabilir) satırında düğme AKTİFtir", () => {
    render(<PeriodClosingView />);
    expect(screen.getByTestId("dkap-close-8")).toBeEnabled();
    expect(screen.queryByTestId("dkap-blocked-reason-8")).not.toBeInTheDocument();
  });
});

describe("K3 — kayıt yok ayları eylemsizdir", () => {
  it("Eylül (kayıt yok) satırında 'Dönemi Kapat' devre dışıdır, gerekçe tooltip'te", () => {
    render(<PeriodClosingView />);
    const button = screen.getByTestId("dkap-close-9");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute(
      "title",
      "Kaydı olmayan dönem zaten açıktır, kapatmaya gerek yok",
    );
  });

  it("Fiş sütununda '0' basılır, tire DEĞİL (DK:63)", () => {
    render(<PeriodClosingView />);
    expect(screen.getByTestId("dkap-row-9")).toHaveTextContent("0");
  });
});

describe("K1 — 'Geri Aç' yalnız admin'de aktif", () => {
  it("full seviyeli kullanıcıda devre dışı ve gerekçe tooltip'te", () => {
    setSession("full");
    render(<PeriodClosingView />);
    const reopen = screen.getByTestId("dkap-reopen-1");
    expect(reopen).toBeDisabled();
    expect(reopen).toHaveAttribute("title", "Geri açma yetkisi yalnızca Sistem Yöneticisinde");
  });

  it("admin seviyeli kullanıcıda AKTİFtir", () => {
    setSession("admin");
    render(<PeriodClosingView />);
    expect(screen.getByTestId("dkap-reopen-1")).toBeEnabled();
  });

  it("kapatma yetkisi olmayan (view) kullanıcıda 'Dönemi Kapat' devre dışıdır", () => {
    setSession("view");
    render(<PeriodClosingView />);
    expect(screen.getByTestId("dkap-close-8")).toBeDisabled();
  });
});

describe("K5 — closed_by_name / kapatma tarihi", () => {
  it("kapalı satırda kapatan + tarih basılır", () => {
    render(<PeriodClosingView />);
    const row = screen.getByTestId("dkap-row-1");
    expect(row).toHaveTextContent("Ayşe Demir");
    expect(row).toHaveTextContent("05.02.2026");
  });

  it("açık/kayıt-yok satırlarda tire basılır, 'Bilinmiyor' UYDURULMAZ", () => {
    render(<PeriodClosingView />);
    const row = screen.getByTestId("dkap-row-8");
    expect(row).toHaveTextContent("—");
    expect(row).not.toHaveTextContent("Bilinmiyor");
  });
});

describe("K8 — 'Dönemi Kapat' onay diyaloğu ister", () => {
  it("tıklayınca hemen kapatmaz, onay diyaloğu açar", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<PeriodClosingView />);
    await user.click(screen.getByTestId("dkap-close-8"));
    expect(closeMutate).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Ağustos 2026 Kapatılsın mı?" })).toBeInTheDocument();
  });

  it("onay kutucuğu işaretlenmeden 'Dönemi Kapat' diyalog düğmesi devre dışıdır", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<PeriodClosingView />);
    await user.click(screen.getByTestId("dkap-close-8"));
    expect(screen.getByTestId("dkap-confirm-close")).toBeDisabled();
    await user.click(screen.getByTestId("dkap-confirm-ack"));
    expect(screen.getByTestId("dkap-confirm-close")).toBeEnabled();
  });

  it("onaylanınca mutation çağrılır ve başarıyla kapanır", async () => {
    closeMutate.mockResolvedValueOnce({});
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<PeriodClosingView />);
    await user.click(screen.getByTestId("dkap-close-8"));
    await user.click(screen.getByTestId("dkap-confirm-ack"));
    await user.click(screen.getByTestId("dkap-confirm-close"));
    expect(closeMutate).toHaveBeenCalledWith({ year: 2026, month: 8 });
  });

  it("🔴 tek gerçek kapı sunucudur: 409 yutulmaz, mesaj gösterilir", async () => {
    closeMutate.mockRejectedValueOnce(
      new BackendError(409, { detail: "Dönem zaten kapalı." }),
    );
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<PeriodClosingView />);
    await user.click(screen.getByTestId("dkap-close-8"));
    await user.click(screen.getByTestId("dkap-confirm-ack"));
    await user.click(screen.getByTestId("dkap-confirm-close"));
    expect(await screen.findByTestId("dkap-confirm-error")).toHaveTextContent(
      "Dönem zaten kapalı.",
    );
  });
});
