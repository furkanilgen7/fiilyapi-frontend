import type { UseQueryResult } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useSession } from "@/components/shell/SessionProvider";
import type {
  TrialBalanceResponse,
  TrialBalanceRow,
  TrialBalanceTotals,
} from "@/lib/api/hooks/useTrialBalance";
import { useTrialBalance } from "@/lib/api/hooks/useTrialBalance";
import { BackendError } from "@/lib/api/unwrap";
import type { MeResponse } from "@/lib/auth/types";

import { TrialBalanceView } from "./TrialBalanceView";

vi.mock("@/lib/api/hooks/useTrialBalance", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useTrialBalance")>()),
  useTrialBalance: vi.fn(),
}));
vi.mock("@/components/shell/SessionProvider", () => ({ useSession: vi.fn() }));
// 🔴 F-MUP: modül sekme şeridi (`AccountingTabs`) artık görünümün İÇİNDEDİR
// (drill-in sidebar kalktı) ve `usePathname` okur. Mock olmadan jsdom'da
// `null` döner ve şeridin aktiflik kararı çökerdi.
vi.mock("next/navigation", () => ({ usePathname: () => "/muhasebe/mizan" }));


/**
 * 🔴 K3 — MOCKUP'IN 8 SATIRI DENGESİZDİR (tfoot'un iki kapanış rakamı
 * satırlarla tutmuyor: gerçek toplam 21.729.500 / 27.466.500, tfoot ise
 * ikisine de 47.284.520 yazıyor). Mockup'tan alınan şey YAPIdır — sütun,
 * renk, biçim, satır türü — RAKAM değil. Fikstür bu yüzden DENGELİ kurulur:
 * tasarım niyeti (tfoot'un iki kapanışı EŞİT basması) budur.
 */
function row(partial: Partial<TrialBalanceRow> & { account_code: string }): TrialBalanceRow {
  return {
    account_id: `acc-${partial.account_code}`,
    account_name: "Hesap",
    opening_debit: "0.00",
    opening_credit: "0.00",
    period_debit: "0.00",
    period_credit: "0.00",
    closing_debit: "0.00",
    closing_credit: "0.00",
    ...partial,
  };
}

const ROWS: TrialBalanceRow[] = [
  // MZ:80-89 — açılış NET borç, dönem BRÜT (İKİ TARAF DOLU), kapanış NET borç.
  row({
    account_code: "100",
    account_name: "Kasa",
    opening_debit: "180000.00",
    period_debit: "2640000.00",
    period_credit: "2535200.00",
    closing_debit: "284800.00",
  }),
  // MZ:120-129 — açılış NET alacak, dönem BRÜT, kapanış NET ALACAK (yeşil dal).
  row({
    account_code: "320",
    account_name: "Satıcılar",
    opening_credit: "840000.00",
    period_debit: "6120000.00",
    period_credit: "7464000.00",
    closing_credit: "2184000.00",
  }),
  // MZ:140-149 — açılışı HİÇ olmayan hesap: dört hücre birden `—`.
  row({
    account_code: "600",
    account_name: "Yurt İçi Satışlar",
    period_credit: "24870500.00",
    closing_credit: "24870500.00",
  }),
  // K3'ün eksik bıraktığı BORÇ tarafı — fikstür kendi içinde DENGELİ olsun.
  row({
    account_code: "730",
    account_name: "Genel Üretim Giderleri",
    period_debit: "26769700.00",
    closing_debit: "26769700.00",
  }),
];

/**
 * 🔴 Toplamlar SATIRLARIN gerçek toplamıdır — uydurulmuş değil. Bir toplam
 * satırının satırlarıyla uzlaşmak zorunda olduğu bu dilimin kendi ilkesidir
 * (`vat-return.ts` notu); fikstürün onu çiğnemesi okuyucuyu yanıltırdı.
 * İki kapanış toplamı EŞİT ⇒ `is_balanced` doğrudur (K3'ün dengeli kesiti).
 */
const BALANCED_TOTALS: TrialBalanceTotals = {
  opening_debit: "180000.00",
  opening_credit: "840000.00",
  period_debit: "35529700.00", // 2.640.000 + 6.120.000 + 26.769.700
  period_credit: "34869700.00", // 2.535.200 + 7.464.000 + 24.870.500
  closing_debit: "27054500.00", // 284.800 + 26.769.700
  closing_credit: "27054500.00", // 2.184.000 + 24.870.500
};

function response(partial: Partial<TrialBalanceResponse> = {}): TrialBalanceResponse {
  return {
    year: 2026,
    month: 7,
    is_balanced: true,
    rows: ROWS,
    totals: BALANCED_TOTALS,
    ...partial,
  };
}

function queryResult(partial: Record<string, unknown>) {
  return {
    data: undefined,
    error: null,
    isLoading: false,
    isError: false,
    ...partial,
  } as unknown as UseQueryResult<TrialBalanceResponse, Error>;
}

function setSession(level: string | undefined) {
  vi.mocked(useSession).mockReturnValue({
    me: { permissions: level === undefined ? {} : { accounting: level } } as unknown as MeResponse,
  } as unknown as ReturnType<typeof useSession>);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true });
  // 📅 YEREL takvim (TB5): `currentPeriod` `getFullYear()/getMonth()` okur.
  vi.setSystemTime(new Date(2026, 6, 20, 9, 0, 0));
  setSession("full");
  vi.mocked(useTrialBalance).mockReturnValue(queryResult({ data: response() }));
});

describe("Mizan ekranı — MZ başlık şeridi", () => {
  it("geri bağlantısı `← Muhasebe` (MZ:39) ve başlık (MZ:41) basılır", () => {
    render(<TrialBalanceView />);
    expect(screen.getByTestId("mz-back")).toHaveAttribute("href", "/muhasebe");
    expect(screen.getByRole("heading", { name: "Mizan" })).toBeInTheDocument();
  });

  it("🔴 MZ:45 dönem etiketi BİRİKİMLİ ARALIKTIR, tek ay DEĞİL", () => {
    render(<TrialBalanceView />);
    expect(screen.getByTestId("mu-period-label")).toHaveTextContent("Ocak–Temmuz 2026");
  });

  it("🔴 varsayılan dönem YEREL takvimdendir ve UÇ'a o çift gider", () => {
    render(<TrialBalanceView />);
    expect(vi.mocked(useTrialBalance)).toHaveBeenCalledWith(2026, 7);
  });

  it("`›` bir ay ileri gider — ÜST SINIR YOKTUR (K4: mockup sınır çizmiyor)", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<TrialBalanceView />);
    await user.click(screen.getByTestId("mu-period-next"));
    expect(vi.mocked(useTrialBalance)).toHaveBeenLastCalledWith(2026, 8);
    expect(screen.getByTestId("mu-period-label")).toHaveTextContent("Ocak–Ağustos 2026");
  });

  it("Ocak'a inince aralık TEK aya düşer (aynı pencerenin kısa yazımı)", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<TrialBalanceView />);
    for (let step = 0; step < 6; step += 1) {
      await user.click(screen.getByTestId("mu-period-prev"));
    }
    expect(screen.getByTestId("mu-period-label")).toHaveTextContent("Ocak 2026");
  });

  it("MZ:48-49 `Excel` ve `PDF` devre dışıdır, gerekçe EKRANDA görünür", () => {
    render(<TrialBalanceView />);
    expect(screen.getByTestId("mz-export-excel")).toBeDisabled();
    expect(screen.getByTestId("mz-export-pdf")).toBeDisabled();
    expect(screen.getByTestId("mz-export-reason")).toHaveTextContent(
      "Mizan dışa aktarma ucu henüz açılmadı",
    );
  });
});

describe("🔴 MZ:54-57 kontrol banner'ı — İKİ dal (K2)", () => {
  it("dengedeyken YEŞİL dal: kapanış toplamı basılır", () => {
    render(<TrialBalanceView />);
    const banner = screen.getByTestId("mz-banner");
    expect(banner).toHaveTextContent("Mizan Dengede — Toplam Borç = Toplam Alacak: ₺ 27.054.500");
    expect(banner).toHaveClass("mu-banner--ok");
  });

  it("🔴 dengesizken KIRMIZI dal: fark hesaplanıp basılır", () => {
    vi.mocked(useTrialBalance).mockReturnValue(
      queryResult({
        data: response({
          is_balanced: false,
          totals: { ...BALANCED_TOTALS, closing_credit: "27194500.00" },
        }),
      }),
    );
    render(<TrialBalanceView />);
    const banner = screen.getByTestId("mz-banner");
    expect(banner).toHaveTextContent("Mizan Dengede Değil");
    expect(banner).toHaveTextContent("fark: ₺ 140.000");
    expect(banner).toHaveClass("mu-banner--off");
  });

  it("🔴 DENGE KARARI SUNUCUNUNDUR — istemci toplamları yeniden karşılaştırmaz", () => {
    // Toplamlar EŞİT ama sunucu `is_balanced: false` diyor: ekran SUNUCUYU
    // izler. İstemci kendi karşılaştırmasını koşsaydı burada yeşil basardı.
    vi.mocked(useTrialBalance).mockReturnValue(
      queryResult({ data: response({ is_balanced: false }) }),
    );
    render(<TrialBalanceView />);
    expect(screen.getByTestId("mz-banner")).toHaveClass("mu-banner--off");
    // Fark sıfır olduğu için cümle "₺ 0" der — sayı UYDURULMAZ.
    expect(screen.getByTestId("mz-banner")).toHaveTextContent("fark: ₺ 0");
  });

  it("veri gelmeden banner HİÇ basılmaz (denge bilinmiyorken iddia edilmez)", () => {
    vi.mocked(useTrialBalance).mockReturnValue(queryResult({ isLoading: true }));
    render(<TrialBalanceView />);
    expect(screen.queryByTestId("mz-banner")).toBeNull();
    expect(screen.getByTestId("mz-loading")).toBeInTheDocument();
  });
});

describe("MZ:59-173 tablo — sekiz sütun, iki katmanlı başlık", () => {
  it("üst katman ÜÇ grubu `colspan=2` ile toplar (MZ:65-67)", () => {
    render(<TrialBalanceView />);
    for (const group of ["Açılış Bakiyesi", "Dönem Hareketi", "Kapanış Bakiyesi"]) {
      expect(screen.getByRole("columnheader", { name: group })).toHaveAttribute("colspan", "2");
    }
  });

  it("alt katman ALTI taraf başlığıdır; Borç kırmızı, Alacak yeşil (MZ:71-76)", () => {
    render(<TrialBalanceView />);
    expect(screen.getAllByRole("columnheader", { name: "Borç" })).toHaveLength(3);
    expect(screen.getAllByRole("columnheader", { name: "Alacak" })).toHaveLength(3);
    for (const th of screen.getAllByRole("columnheader", { name: "Borç" })) {
      expect(th).toHaveClass("mu-tb__side--debit");
    }
    for (const th of screen.getAllByRole("columnheader", { name: "Alacak" })) {
      expect(th).toHaveClass("mu-tb__side--credit");
    }
  });

  it("🔴 `period_*` BRÜTtür: iki taraf BİRDEN dolu basılır (MZ:85-86)", () => {
    render(<TrialBalanceView />);
    const cells = within(screen.getByTestId("mz-row-100")).getAllByRole("cell");
    // 0 kod · 1 ad · 2-3 açılış · 4-5 dönem · 6-7 kapanış
    expect(cells[4]).toHaveTextContent("2.640.000");
    expect(cells[5]).toHaveTextContent("2.535.200");
  });

  it("🔴 `opening_*`/`closing_*` NETtir: boş taraf `—` basar, `0` DEĞİL", () => {
    render(<TrialBalanceView />);
    const cells = within(screen.getByTestId("mz-row-100")).getAllByRole("cell");
    expect(cells[2]).toHaveTextContent("180.000");
    expect(cells[3]).toHaveTextContent("—");
    expect(cells[3]).not.toHaveTextContent("0");
    expect(cells[7]).toHaveTextContent("—");
  });

  it("açılışı HİÇ olmayan hesapta İKİ açılış hücresi de `—`dır (MZ:143-144)", () => {
    render(<TrialBalanceView />);
    const cells = within(screen.getByTestId("mz-row-600")).getAllByRole("cell");
    expect(cells[2]).toHaveTextContent("—");
    expect(cells[3]).toHaveTextContent("—");
    expect(cells[4]).toHaveTextContent("—");
    expect(cells[5]).toHaveTextContent("24.870.500");
  });

  it("🔴 RENK: kapanış hücresi RENKLİ, açılış/dönem hücreleri NÖTRdür", () => {
    render(<TrialBalanceView />);
    const kasa = within(screen.getByTestId("mz-row-100")).getAllByRole("cell");
    // 2. katman — açılış + dönem nötr.
    expect(kasa[2]?.querySelector(".mu-tb__plain")).not.toBeNull();
    expect(kasa[4]?.querySelector(".mu-amount--debit")).toBeNull();
    // 3. katman — kapanış borcu KIRMIZI (MZ:87).
    expect(kasa[6]?.querySelector(".mu-amount--debit")).not.toBeNull();
    // MZ:128 — kapanış ALACAĞI yeşil (öbür dal).
    const satici = within(screen.getByTestId("mz-row-320")).getAllByRole("cell");
    expect(satici[7]?.querySelector(".mu-amount--credit")).not.toBeNull();
  });

  it("🔴 SATIR TIKLANABİLİR DEĞİLDİR — MZ:80-159 drill-in ÇİZMEZ", () => {
    render(<TrialBalanceView />);
    const tr = screen.getByTestId("mz-row-100");
    expect(tr.querySelector("a")).toBeNull();
    expect(tr.querySelector("button")).toBeNull();
    expect(tr).not.toHaveAttribute("onclick");
  });

  it("MZ:161-171 tfoot GENEL TOPLAM sunucunun `totals` alanından gelir", () => {
    render(<TrialBalanceView />);
    const foot = screen.getByTestId("mz-totals");
    expect(foot).toHaveTextContent("GENEL TOPLAM");
    expect(foot).toHaveTextContent("35.529.700");
    expect(foot).toHaveTextContent("34.869.700");
    // 🔴 K15: iki kapanış toplamı dengede EŞİTtir (mockup'ın yapısal iddiası).
    const cells = within(foot).getAllByRole("cell");
    expect(cells[5]).toHaveTextContent("27.054.500");
    expect(cells[6]).toHaveTextContent("27.054.500");
    // Kapanış ikilisi 1px büyüktür (MZ:168-169) — sınıfla kilitlenir.
    expect(cells[5]?.className).toContain("mu-tb__cell--closing");
    expect(cells[6]?.className).toContain("mu-tb__cell--closing");
  });

  it("boş dönemde tablo boş DURUM metni basar, sessiz kalmaz", () => {
    vi.mocked(useTrialBalance).mockReturnValue(
      queryResult({ data: response({ rows: [] }) }),
    );
    render(<TrialBalanceView />);
    expect(screen.getByTestId("mz-empty")).toBeInTheDocument();
    // Altı `—` taşıyan bir GENEL TOPLAM, "hesap yok" mesajının altında
    // gürültüdür ve toplamın bir şeyi topladığını ima ederdi (hata dalının
    // kardeşi kural).
    expect(screen.queryByTestId("mz-totals")).toBeNull();
  });

  it("hata YUTULMAZ: sunucunun Türkçe metni tabloya basılır", () => {
    vi.mocked(useTrialBalance).mockReturnValue(
      queryResult({
        isError: true,
        error: new BackendError(500, { detail: "Mizan hesaplanamadı." }),
      }),
    );
    render(<TrialBalanceView />);
    expect(screen.getByTestId("mz-error")).toHaveTextContent("Mizan hesaplanamadı.");
    // Hata varken tfoot BASILMAZ — boş bir "GENEL TOPLAM" yanıltıcı olurdu.
    expect(screen.queryByTestId("mz-totals")).toBeNull();
  });
});

describe("yetki", () => {
  it("görüntüleme yetkisi AÇIKÇA `none` ise erişim reddedilir", () => {
    // 🔴 "Bilinmezlik kuralı" (spec §2.5.3): seviye YOKSA ekran AÇIK kalır;
    // yalnız açıkça `none` olduğunda kapanır. `undefined` ile test etmek bu
    // kapıyı hiç sınamazdı.
    setSession("none");
    render(<TrialBalanceView />);
    expect(screen.queryByRole("heading", { name: "Mizan" })).toBeNull();
  });

  it("sunucu 403 verirse de erişim reddedilir", () => {
    vi.mocked(useTrialBalance).mockReturnValue(
      queryResult({ isError: true, error: new BackendError(403, { detail: "yok" }) }),
    );
    render(<TrialBalanceView />);
    expect(screen.queryByRole("heading", { name: "Mizan" })).toBeNull();
  });
});
