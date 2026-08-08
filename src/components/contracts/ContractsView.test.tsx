import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { ContractsView } from "./ContractsView";
import { useContracts } from "@/lib/api/hooks/useContracts";
import type { ContractListItem, ContractListResponse } from "@/lib/api/hooks/useContracts";

vi.mock("@/lib/api/hooks/useContracts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useContracts")>()),
  useContracts: vi.fn(),
}));

// Sekme durumu URL'dedir; testler `?type=` parametresini bu değişkenle sürer.
let searchParams = new URLSearchParams();
const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
  usePathname: () => "/sozlesmeler",
  useSearchParams: () => searchParams,
}));

const EMPLOYER_ROW: ContractListItem = {
  id: "p-1",
  title: "Güneşkent Konut A-Blok",
  contract_no: "SZL-2025-001",
  counterparty_name: "Güneşkent Gayrimenkul A.Ş.",
  amount: "11200000.00",
  start_date: "2025-04-01",
  end_date: "2026-12-31",
  progress_pct: "75.00",
  status: "active",
  is_draft: false,
};

const SUBCONTRACTOR_ROW: ContractListItem = {
  ...EMPLOYER_ROW,
  id: "sc-1",
  title: "Yılmaz İnşaat — Kaba Yapı",
  contract_no: "TSZ-2025-004",
  counterparty_name: "Yılmaz İnşaat Ltd.",
  // Taşeron sekmesinde backend BİLEREK `None` döner (spec §2).
  progress_pct: null,
};

function mockContracts(data?: ContractListResponse, extra: Record<string, unknown> = {}) {
  vi.mocked(useContracts).mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    error: null,
    ...extra,
  } as never);
}

function employerResponse(): ContractListResponse {
  return {
    summary: {
      total_amount: "56200000.00",
      active_count: 4,
      progress_payment_total: "42400000.00",
      expiring_this_month_count: 1,
    },
    items: [EMPLOYER_ROW],
  };
}

function subcontractorResponse(): ContractListResponse {
  return {
    summary: {
      total_amount: "9400000.00",
      active_count: 2,
      progress_payment_total: null,
      expiring_this_month_count: 0,
    },
    items: [SUBCONTRACTOR_ROW],
  };
}

describe("ContractsView · SZL sekmeli liste", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParams = new URLSearchParams();
  });

  describe("KPI şeridi (mockup 34-38)", () => {
    it("dört kartı mockup sırası ve etiketleriyle basar", () => {
      mockContracts(employerResponse());
      render(<ContractsView />);

      const strip = screen.getByTestId("szl-kpi-strip");
      const labels = within(strip)
        .getAllByText(/Toplam Bedel|Aktif|Toplam Hakediş|Bu Ay Dolacak/)
        .map((node) => node.textContent);
      expect(labels).toEqual(["Toplam Bedel", "Aktif", "Toplam Hakediş", "Bu Ay Dolacak"]);
    });

    it("değerleri `ContractSummary`den basar (₺ 56,2M · 4 Sözleşme · ₺ 42,4M · 1 Sözleşme)", () => {
      mockContracts(employerResponse());
      render(<ContractsView />);

      const strip = screen.getByTestId("szl-kpi-strip");
      expect(within(strip).getByText("₺ 56,2M")).toBeInTheDocument();
      expect(within(strip).getByText("4 Sözleşme")).toBeInTheDocument();
      expect(within(strip).getByText("₺ 42,4M")).toBeInTheDocument();
      expect(within(strip).getByText("1 Sözleşme")).toBeInTheDocument();
    });

    it("başlık alt satırı aktif sözleşme sayısını taşır (mockup 24)", () => {
      mockContracts(employerResponse());
      render(<ContractsView />);
      expect(screen.getByText("Tüm projeler · 4 aktif sözleşme")).toBeInTheDocument();
    });

    it("taşeron sekmesinde `progress_payment_total` null → kart silinmez, '—' + gerekçe", () => {
      searchParams = new URLSearchParams("type=subcontractor");
      mockContracts(subcontractorResponse());
      render(<ContractsView />);

      const card = screen.getByTestId("szl-kpi-payment-total");
      expect(card).toHaveTextContent("—");
      expect(card).toHaveAttribute(
        "title",
        "Taşeron hakediş toplamı henüz hesaplanmıyor",
      );
      expect(screen.getByText("Toplam Hakediş")).toBeInTheDocument();
    });
  });

  describe("sekmeler (mockup 26-29) — URL durumu", () => {
    it("parametresiz URL'de İşveren sekmesi aktiftir ve uca `employer` gider", () => {
      mockContracts(employerResponse());
      render(<ContractsView />);

      expect(screen.getByRole("link", { name: "İşveren" })).toHaveAttribute(
        "aria-current",
        "page",
      );
      expect(screen.getByRole("link", { name: "Taşeron" })).not.toHaveAttribute("aria-current");
      expect(vi.mocked(useContracts)).toHaveBeenCalledWith({ type: "employer" });
    });

    it("`?type=subcontractor` ile Taşeron sekmesi aktiftir ve uca `subcontractor` gider", () => {
      searchParams = new URLSearchParams("type=subcontractor");
      mockContracts(subcontractorResponse());
      render(<ContractsView />);

      expect(screen.getByRole("link", { name: "Taşeron" })).toHaveAttribute(
        "aria-current",
        "page",
      );
      expect(vi.mocked(useContracts)).toHaveBeenCalledWith({ type: "subcontractor" });
    });

    it("sekmeler gerçek link'tir — hedefleri paylaşılabilir URL'lerdir", () => {
      mockContracts(employerResponse());
      render(<ContractsView />);

      expect(screen.getByRole("link", { name: "İşveren" })).toHaveAttribute(
        "href",
        "/sozlesmeler",
      );
      expect(screen.getByRole("link", { name: "Taşeron" })).toHaveAttribute(
        "href",
        "/sozlesmeler?type=subcontractor",
      );
    });
  });

  describe("+ Yeni Sözleşme (ONAYLI KARAR S2)", () => {
    it("işveren sekmesinde DEVRE DIŞI basılır ve gerekçesi görünür", () => {
      mockContracts(employerResponse());
      render(<ContractsView />);

      const button = screen.getByTestId("szl-new-contract-disabled");
      expect(button).toBeDisabled();
      expect(button).toHaveTextContent("+ Yeni Sözleşme");
      expect(button).toHaveAttribute("title", "İşveren sözleşmesi proje formunda kurulur.");
      // Gerekçe yalnız `title`da saklı kalmaz — ekranda da yazar.
      expect(
        screen.getByText("İşveren sözleşmesi proje formunda kurulur."),
      ).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "+ Yeni Sözleşme" })).not.toBeInTheDocument();
    });

    it("taşeron sekmesinde FSO formuna giden link olur", () => {
      searchParams = new URLSearchParams("type=subcontractor");
      mockContracts(subcontractorResponse());
      render(<ContractsView />);

      expect(screen.getByRole("link", { name: "+ Yeni Sözleşme" })).toHaveAttribute(
        "href",
        "/sozlesmeler/taseron/yeni",
      );
      expect(screen.queryByTestId("szl-new-contract-disabled")).not.toBeInTheDocument();
    });
  });

  describe("Taşeron Firmaları → girişi (spec §1)", () => {
    it("YALNIZ taşeron sekmesinde görünür ve TL rotasına gider", () => {
      searchParams = new URLSearchParams("type=subcontractor");
      mockContracts(subcontractorResponse());
      render(<ContractsView />);

      expect(screen.getByRole("link", { name: "Taşeron Firmaları →" })).toHaveAttribute(
        "href",
        "/sozlesmeler/taseronlar",
      );
    });

    it("işveren sekmesinde HİÇ basılmaz", () => {
      mockContracts(employerResponse());
      render(<ContractsView />);
      expect(screen.queryByRole("link", { name: "Taşeron Firmaları →" })).not.toBeInTheDocument();
    });
  });

  describe("tablo (mockup 41-106)", () => {
    it("kolon başlıklarını mockup sırasıyla basar", () => {
      mockContracts(employerResponse());
      render(<ContractsView />);

      const headers = screen.getAllByRole("columnheader").map((th) => th.textContent);
      expect(headers).toEqual([
        "Sözleşme",
        "İşveren",
        "Bedel",
        "Başlangıç",
        "Bitiş",
        "İlerleme",
        "Durum",
        "",
      ]);
    });

    it("taşeron sekmesinde ikinci kolon başlığı 'Taşeron' olur", () => {
      searchParams = new URLSearchParams("type=subcontractor");
      mockContracts(subcontractorResponse());
      render(<ContractsView />);

      const headers = screen.getAllByRole("columnheader").map((th) => th.textContent);
      expect(headers[1]).toBe("Taşeron");
    });

    it("işveren satırını mockup biçimleriyle basar (bedel, tarihler, yüzde, durum)", () => {
      mockContracts(employerResponse());
      render(<ContractsView />);

      const row = screen.getByRole("row", { name: "Güneşkent Konut A-Blok" });
      expect(within(row).getByText("SZL-2025-001")).toBeInTheDocument();
      expect(within(row).getByText("Güneşkent Gayrimenkul A.Ş.")).toBeInTheDocument();
      expect(within(row).getByText("₺ 11,2M")).toBeInTheDocument();
      expect(within(row).getByText("01.04.2025")).toBeInTheDocument();
      expect(within(row).getByText("31.12.2026")).toBeInTheDocument();
      expect(within(row).getByText("%75")).toBeInTheDocument();
      expect(within(row).getByText("Aktif")).toBeInTheDocument();
    });

    it("işveren satırının detay hedefi PROJE kimliğidir", () => {
      mockContracts(employerResponse());
      render(<ContractsView />);

      expect(screen.getByRole("link", { name: "Detay →" })).toHaveAttribute(
        "href",
        "/sozlesmeler/isveren/p-1",
      );
    });

    it("taşeron satırının detay hedefi SÖZLEŞME kimliğidir", () => {
      searchParams = new URLSearchParams("type=subcontractor");
      mockContracts(subcontractorResponse());
      render(<ContractsView />);

      expect(screen.getByRole("link", { name: "Detay →" })).toHaveAttribute(
        "href",
        "/sozlesmeler/taseron/sc-1",
      );
    });

    it("taşeron satırında `progress_pct` null → çubuk yerine '—' + gerekçe", () => {
      searchParams = new URLSearchParams("type=subcontractor");
      mockContracts(subcontractorResponse());
      render(<ContractsView />);

      const cell = screen.getByTestId("szl-progress-pending");
      expect(cell).toHaveTextContent("—");
      expect(cell).toHaveAttribute(
        "title",
        "Taşeron sözleşmesinde ilerleme henüz hesaplanmıyor",
      );
      expect(screen.queryByTestId("szl-progress")).not.toBeInTheDocument();
    });

    it("boş listede tablo yerine boş durum basar", () => {
      mockContracts({ ...employerResponse(), items: [] });
      render(<ContractsView />);
      expect(screen.getByText("Henüz işveren sözleşmesi yok")).toBeInTheDocument();
    });

    it("yükleme ve hata durumlarını ayırır", () => {
      mockContracts(undefined, { isLoading: true });
      const { unmount } = render(<ContractsView />);
      expect(screen.getByText("Yükleniyor…")).toBeInTheDocument();
      unmount();

      mockContracts(undefined, { isError: true });
      render(<ContractsView />);
      expect(screen.getByText("Sözleşmeler yüklenemedi")).toBeInTheDocument();
    });
  });
});
