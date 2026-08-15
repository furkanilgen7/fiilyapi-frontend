import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { EmployerContractDetailView } from "./EmployerContractDetailView";
import {
  useEmployerContract,
  useEmployerContractItems,
  type EmployerContractDetail,
  type EmployerContractItemsResponse,
} from "@/lib/api/hooks/useContract";
import {
  useProgressPayments,
  type ProgressPaymentListResponse,
} from "@/lib/api/hooks/useProgressPayments";
import { useProject } from "@/lib/api/hooks/useProjects";

vi.mock("@/lib/api/hooks/useContract", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useContract")>()),
  useEmployerContract: vi.fn(),
  useEmployerContractItems: vi.fn(),
}));
vi.mock("@/lib/api/hooks/useProgressPayments", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useProgressPayments")>()),
  useProgressPayments: vi.fn(),
}));
vi.mock("@/lib/api/hooks/useProjects", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useProjects")>()),
  useProject: vi.fn(),
}));

// Sekme durumu URL'dedir; testler `?tab=` parametresini bu değişkenle sürer.
let searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/sozlesmeler/isveren/p-1",
  useSearchParams: () => searchParams,
}));

const SUMMARY: EmployerContractDetail["progress_payment_summary"] = {
  contract_amount: "11200000.00",
  cumulative_gross: "8400000.00",
  progress_pct: "75.00",
  advance_deduction_total: "1680000.00",
  retention_total: "420000.00",
  net_total: "6300000.00",
  payment_count: 5,
  pending_count: 1,
  remaining: "2800000.00",
};

const DETAIL: EmployerContractDetail = {
  project_id: "p-1",
  contract_no: "SZL-2025-001",
  signature_date: "2025-03-15",
  amount: "11200000.00",
  advance_pct: "20.00",
  retainage_pct: "5.00",
  vat_pct: "20.00",
  late_penalty_daily: "15000.00",
  has_price_escalation: true,
  index_type: "tufe",
  status: "active",
  start_date: "2025-04-01",
  end_date: "2026-12-31",
  employer_name: "Güneşkent Gayrimenkul A.Ş.",
  contractor_name: "FİİL Yapı Ltd. Şti.",
  items_total: "12054000.00",
  items_total_diff: "854000.00",
  advance_amount: "2240000.00",
  progress_payment_summary: SUMMARY,
  milestones: null,
  documents: null,
  pending_modules: [],
};

const ITEMS: EmployerContractItemsResponse = {
  groups: [
    {
      id: "cg-1",
      name: "A — Betonarme İşleri",
      sort_order: 0,
      items: [
        {
          id: "ci-1",
          group_id: "cg-1",
          code: "03.001",
          description: "Kat Döşemesi Betonu C25/30",
          unit: "m³",
          quantity: "3200.000",
          unit_price: "1850.00",
          sort_order: 0,
          distributed_quantity: "3200.000",
          remaining_quantity: "0.000",
        },
        {
          id: "ci-2",
          group_id: "cg-1",
          code: "03.002",
          description: "Kolon Betonu C30/37",
          unit: "m³",
          quantity: "620.000",
          unit_price: "2100.00",
          sort_order: 1,
          distributed_quantity: "400.000",
          remaining_quantity: "220.000",
        },
      ],
    },
  ],
};

const PAYMENTS: ProgressPaymentListResponse = {
  items: [
    {
      id: "pp-1",
      project_id: "p-1",
      project_name: "Kule A",
      sequence_no: 5,
      period_year: 2026,
      period_month: 7,
      description: "Temmuz hakedişi",
      gross_total: "2100000.00",
      status: "approved",
    },
  ],
} as ProgressPaymentListResponse;

function mockAll({
  detail = DETAIL,
  contractExtra = {},
  items = ITEMS,
  itemsExtra = {},
  payments = PAYMENTS,
  paymentsExtra = {},
}: {
  detail?: EmployerContractDetail;
  contractExtra?: Record<string, unknown>;
  items?: EmployerContractItemsResponse;
  itemsExtra?: Record<string, unknown>;
  payments?: ProgressPaymentListResponse;
  paymentsExtra?: Record<string, unknown>;
} = {}) {
  vi.mocked(useEmployerContract).mockReturnValue({
    data: detail,
    isLoading: false,
    isError: false,
    error: null,
    ...contractExtra,
  } as never);
  vi.mocked(useEmployerContractItems).mockReturnValue({
    data: items,
    isLoading: false,
    isError: false,
    error: null,
    ...itemsExtra,
  } as never);
  vi.mocked(useProgressPayments).mockReturnValue({
    data: payments,
    isLoading: false,
    isError: false,
    error: null,
    ...paymentsExtra,
  } as never);
  vi.mocked(useProject).mockReturnValue({
    data: { id: "p-1", name: "Güneşkent Konut A-Blok İnşaatı" },
    isLoading: false,
    isError: false,
    error: null,
  } as never);
}

describe("EmployerContractDetailView · E14 işveren sözleşme detayı", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParams = new URLSearchParams();
  });

  describe("başlık kartı (mockup 65-87)", () => {
    it("sözleşme no, durum rozeti, başlık ve tarafları basar (69/70/72/73)", () => {
      mockAll();
      render(<EmployerContractDetailView projectId="p-1" />);

      expect(screen.getByText("SZL-2025-001")).toBeInTheDocument();
      expect(screen.getByText("Aktif")).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Güneşkent Konut A-Blok İnşaatı" }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "İşveren: Güneşkent Gayrimenkul A.Ş. · Yüklenici: FİİL Yapı Ltd. Şti.",
        ),
      ).toBeInTheDocument();
    });

    it("5 metriği mockup 81-85 sırası ve etiketleriyle basar", () => {
      mockAll();
      render(<EmployerContractDetailView projectId="p-1" />);

      const metrics = screen.getByTestId("ecd-metrics");
      const labels = within(metrics)
        .getAllByText(/Sözleşme Bedeli|İmza Tarihi|Başlangıç|Bitiş Tarihi|Avans/)
        .map((node) => node.textContent);
      expect(labels).toEqual([
        "Sözleşme Bedeli",
        "İmza Tarihi",
        "Başlangıç",
        "Bitiş Tarihi",
        "Avans",
      ]);
    });

    // ⚠️ Avans tutarı mockup 85'te "₺ 2,24M" yazar; uygulamanın ORTAK kompakt
    // biçimlendiricisi (`formatCompactCurrency`, mockup 81'in "₺ 11,2M"siyle
    // birebir) en fazla BİR ondalık basar → "₺ 2,2M". Mockup kendi içinde
    // tutarsız; ortak biçimlendiriciyi bu ekran için değiştirmek diğer TÜM
    // ekranların gösterimini kaydırırdı — repo kuralı korundu, sapma rapora
    // yazıldı.
    it("5 metriğin değerlerini şemadan basar (₺ 11,2M · 15.03.2025 · 01.04.2025 · 31.12.2026 · %20 · ₺ 2,2M)", () => {
      mockAll();
      render(<EmployerContractDetailView projectId="p-1" />);

      const metrics = screen.getByTestId("ecd-metrics");
      expect(within(metrics).getByText("₺ 11,2M")).toBeInTheDocument();
      expect(within(metrics).getByText("15.03.2025")).toBeInTheDocument();
      expect(within(metrics).getByText("01.04.2025")).toBeInTheDocument();
      expect(within(metrics).getByText("31.12.2026")).toBeInTheDocument();
      expect(within(metrics).getByText("%20 · ₺ 2,2M")).toBeInTheDocument();
    });

    it("boş alanlarda metrik SİLİNMEZ, '—' düşer", () => {
      mockAll({
        detail: { ...DETAIL, amount: null, signature_date: null, end_date: null },
      });
      render(<EmployerContractDetailView projectId="p-1" />);

      const metrics = screen.getByTestId("ecd-metrics");
      expect(within(metrics).getAllByText("—")).toHaveLength(3);
      expect(within(metrics).getByText("Bitiş Tarihi")).toBeInTheDocument();
    });

    it("PDF ve Düzenle butonları DEVRE DIŞI basılır ve gerekçeleri görünür (76-77)", () => {
      mockAll();
      render(<EmployerContractDetailView projectId="p-1" />);

      const pdf = screen.getByTestId("ecd-pdf-disabled");
      expect(pdf).toBeDisabled();
      expect(pdf).toHaveTextContent("PDF");
      expect(pdf).toHaveAttribute("title", "Dışa aktarma modülüyle birlikte gelir");

      const edit = screen.getByTestId("ecd-edit-disabled");
      expect(edit).toBeDisabled();
      expect(edit).toHaveTextContent("Düzenle");
      expect(edit).toHaveAttribute(
        "title",
        "İşveren sözleşmesi proje formunda kurulur; ayrı düzenleme ekranı henüz yok",
      );

      // Gerekçe yalnız `title`da saklı kalmaz — ekranda da yazar.
      expect(screen.getByText(/Dışa aktarma modülüyle birlikte gelir/)).toBeInTheDocument();
      expect(
        screen.getByText(/İşveren sözleşmesi proje formunda kurulur/),
      ).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "projeye git →" })).toHaveAttribute(
        "href",
        "/projeler/p-1",
      );
    });

    it("'← Sözleşmeler' dönüş linki liste rotasına gider (62)", () => {
      mockAll();
      render(<EmployerContractDetailView projectId="p-1" />);
      expect(screen.getByRole("link", { name: "← Sözleşmeler" })).toHaveAttribute(
        "href",
        "/sozlesmeler",
      );
    });
  });

  describe("Hakediş Özeti kartı (mockup 126-148)", () => {
    it("`progress_payment_summary` alanlarını satır satır eşler", () => {
      mockAll();
      render(<EmployerContractDetailView projectId="p-1" />);

      expect(screen.getByTestId("ecd-pps-contract-amount")).toHaveTextContent(
        "₺ 11.200.000",
      );
      expect(screen.getByTestId("ecd-pps-cumulative")).toHaveTextContent("₺ 8.400.000");
      expect(screen.getByTestId("ecd-pps-caption")).toHaveTextContent("%75 hakkedildi");
      expect(screen.getByTestId("ecd-pps-advance")).toHaveTextContent("- ₺ 1.680.000");
      expect(screen.getByTestId("ecd-pps-retention")).toHaveTextContent("- ₺ 420.000");
      expect(screen.getByTestId("ecd-pps-net")).toHaveTextContent("₺ 6.300.000");
    });

    it("teminat satırının parantezli oranı `retainage_pct`ten gelir (140)", () => {
      mockAll({ detail: { ...DETAIL, retainage_pct: "7.50" } });
      render(<EmployerContractDetailView projectId="p-1" />);
      expect(screen.getByText("Teminat Kesintisi (%7,5)")).toBeInTheDocument();
    });

    it("ilerleme çubuğu `progress_pct` genişliğinde çizilir (131)", () => {
      mockAll();
      render(<EmployerContractDetailView projectId="p-1" />);
      const bar = screen.getByTestId("ecd-pps-bar");
      expect(bar.firstElementChild).toHaveStyle({ width: "75%" });
    });

    it("`progress_pct` null → çubuk çizilmez, kart silinmez, gerekçe basılır", () => {
      mockAll({
        detail: {
          ...DETAIL,
          progress_payment_summary: {
            ...SUMMARY,
            contract_amount: null,
            progress_pct: null,
            remaining: null,
          },
        },
      });
      render(<EmployerContractDetailView projectId="p-1" />);

      expect(screen.queryByTestId("ecd-pps-bar")).not.toBeInTheDocument();
      expect(screen.getByTestId("ecd-pps-pct-pending")).toHaveTextContent(
        "Sözleşme bedeli girilmeden hakediş yüzdesi hesaplanamaz",
      );
      expect(screen.getByTestId("ecd-pps-contract-amount")).toHaveTextContent("—");
      expect(screen.getByText("Hakediş Özeti")).toBeInTheDocument();
    });
  });

  describe("Milestone Takvimi → PENDING (mockup 99-123)", () => {
    it("bölüm SİLİNMEZ: başlık durur, içerik gerekçeli pending'dir", () => {
      mockAll();
      render(<EmployerContractDetailView projectId="p-1" />);

      expect(screen.getByText("Milestone Takvimi")).toBeInTheDocument();
      expect(screen.getByTestId("ecd-milestones-pending")).toHaveTextContent(
        "Proje takvimi (P11) ile birlikte gelir",
      );
    });

    it("mockup'ın sahte milestone metinleri BASILMAZ (uydurma veri yok)", () => {
      mockAll();
      render(<EmployerContractDetailView projectId="p-1" />);

      expect(screen.queryByText("Temel ve Bodrum Katlar")).not.toBeInTheDocument();
      expect(screen.queryByText(/Devam Ediyor/)).not.toBeInTheDocument();
    });
  });

  describe("§7 S3 · Sözleşme Koşulları (salt-okunur)", () => {
    it("dört koşul alanını da basar", () => {
      mockAll();
      render(<EmployerContractDetailView projectId="p-1" />);

      expect(screen.getByTestId("ecd-term-vat")).toHaveTextContent("%20");
      expect(screen.getByTestId("ecd-term-penalty")).toHaveTextContent("₺ 15.000");
      expect(screen.getByTestId("ecd-term-escalation")).toHaveTextContent("Var");
      expect(screen.getByTestId("ecd-term-index")).toHaveTextContent("TÜFE");
    });

    it("SALT-OKUNURDUR — blokta hiçbir form kontrolü yoktur", () => {
      mockAll();
      render(<EmployerContractDetailView projectId="p-1" />);

      const terms = screen.getByTestId("ecd-terms");
      expect(terms.querySelectorAll("input, select, textarea, button")).toHaveLength(0);
    });

    it("mockup'ın kendi gövdesine SIZMAZ — başlık kartının ve Hakediş Özeti'nin DIŞINDADIR", () => {
      mockAll();
      render(<EmployerContractDetailView projectId="p-1" />);

      const terms = screen.getByTestId("ecd-terms");
      // Ne 5 metrik ızgarasının ne de özet kartının içinde.
      expect(screen.getByTestId("ecd-metrics").contains(terms)).toBe(false);
      expect(
        screen.getByTestId("ecd-pps-net").closest("section")?.contains(terms),
      ).toBe(false);
      // Mockup'ın iki sütunlu ızgarasının (97) da dışındadır.
      expect(terms.closest(".ecd-grid")).toBeNull();
    });

    it("boş/kapalı değerlerde zarif düşer (gecikme cezası yok, fiyat farkı yok)", () => {
      mockAll({
        detail: {
          ...DETAIL,
          late_penalty_daily: null,
          has_price_escalation: false,
          index_type: null,
        },
      });
      render(<EmployerContractDetailView projectId="p-1" />);

      expect(screen.getByTestId("ecd-term-penalty")).toHaveTextContent("—");
      expect(screen.getByTestId("ecd-term-escalation")).toHaveTextContent("Yok");
      expect(screen.getByTestId("ecd-term-index")).toHaveTextContent("—");
    });
  });

  describe("sekmeler (mockup 90-95) — URL durumu", () => {
    it("parametresiz URL'de Genel aktiftir; diğer sekmelerin içeriği basılmaz", () => {
      mockAll();
      render(<EmployerContractDetailView projectId="p-1" />);

      expect(screen.getByRole("link", { name: "Genel" })).toHaveAttribute(
        "aria-current",
        "page",
      );
      expect(screen.getByRole("link", { name: "İş Kalemleri" })).not.toHaveAttribute(
        "aria-current",
      );
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("ecd-documents-pending")).not.toBeInTheDocument();
    });

    it("sekmeler gerçek link'tir — hedefleri paylaşılabilir URL'lerdir", () => {
      mockAll();
      render(<EmployerContractDetailView projectId="p-1" />);

      expect(screen.getByRole("link", { name: "Genel" })).toHaveAttribute(
        "href",
        "/sozlesmeler/isveren/p-1",
      );
      expect(screen.getByRole("link", { name: "İş Kalemleri" })).toHaveAttribute(
        "href",
        "/sozlesmeler/isveren/p-1?tab=items",
      );
      expect(screen.getByRole("link", { name: "Hakedişler" })).toHaveAttribute(
        "href",
        "/sozlesmeler/isveren/p-1?tab=payments",
      );
      expect(screen.getByRole("link", { name: "Belgeler" })).toHaveAttribute(
        "href",
        "/sozlesmeler/isveren/p-1?tab=documents",
      );
    });

    it("`?tab=documents` Belgeler sekmesini aktif eder", () => {
      searchParams = new URLSearchParams("tab=documents");
      mockAll();
      render(<EmployerContractDetailView projectId="p-1" />);

      expect(screen.getByRole("link", { name: "Belgeler" })).toHaveAttribute(
        "aria-current",
        "page",
      );
    });
  });

  describe("İş Kalemleri sekmesi (`?tab=items`)", () => {
    beforeEach(() => {
      searchParams = new URLSearchParams("tab=items");
    });

    it("kolon başlıklarını POZ 77-84 sırasıyla basar (Dağıtılan + Kalan dahil)", () => {
      mockAll();
      render(<EmployerContractDetailView projectId="p-1" />);

      expect(screen.getAllByRole("columnheader").map((th) => th.textContent)).toEqual([
        "Poz No",
        "Poz Adı",
        "Birim",
        "Sözl. Birim F.",
        "Toplam Miktar",
        "Dağıtılan",
        "Kalan",
      ]);
    });

    it("`distributed_quantity` ve `remaining_quantity` kolonlarını satır satır basar", () => {
      mockAll();
      render(<EmployerContractDetailView projectId="p-1" />);

      const distributed = screen
        .getAllByTestId("ecd-item-distributed")
        .map((cell) => cell.textContent);
      expect(distributed).toEqual(["3.200", "400"]);

      const remaining = screen.getAllByTestId("ecd-item-remaining");
      // Baştaki boşluk KASITLIDIR: ikonla sayı arasındaki literal U+0020
      // metin düğümü (mockup da literal boşluk kullanır; margin'e ÇEVRİLMEZ).
      expect(remaining.map((cell) => cell.textContent)).toEqual([" 0", "220"]);
      // Kalan 0 → POZ 100'deki yeşil "✓ 0" rozeti. `✓` artık inline SVG
      // (F-SEM), metinden okunamaz; iddia `data-settled` damgasıyla YAPISAL
      // olarak kurulur — "0" basan ama kapanmamış rozet buradan geçemez.
      expect(remaining.map((cell) => cell.dataset.settled)).toEqual(["true", "false"]);
      expect(remaining[0].querySelector("svg")).not.toBeNull();
      expect(remaining[1].querySelector("svg")).toBeNull();
    });

    it("grup başlığını ayrı satırda basar", () => {
      mockAll();
      render(<EmployerContractDetailView projectId="p-1" />);
      expect(screen.getByText("A — Betonarme İşleri")).toBeInTheDocument();
    });

    it("POZ ekranına GÖRÜNÜR giriş taşır", () => {
      mockAll();
      render(<EmployerContractDetailView projectId="p-1" />);
      expect(screen.getByTestId("ecd-distribution-link")).toHaveAttribute(
        "href",
        "/sozlesmeler/isveren/p-1/poz-dagilimi",
      );
    });

    it("`items_total` / `items_total_diff` tfoot'ta gösterilir (veri kaybı yok)", () => {
      mockAll();
      render(<EmployerContractDetailView projectId="p-1" />);

      expect(screen.getByTestId("ecd-items-total")).toHaveTextContent("12.054.000");
      expect(screen.getByTestId("ecd-items-diff")).toHaveTextContent("854.000");
    });

    it("yükleme, hata ve boş durumlarını ayırır", () => {
      mockAll({ itemsExtra: { data: undefined, isLoading: true } });
      const first = render(<EmployerContractDetailView projectId="p-1" />);
      expect(screen.getByText("Yükleniyor…")).toBeInTheDocument();
      first.unmount();

      mockAll({ itemsExtra: { data: undefined, isError: true } });
      const second = render(<EmployerContractDetailView projectId="p-1" />);
      expect(screen.getByText("İş kalemleri yüklenemedi")).toBeInTheDocument();
      second.unmount();

      mockAll({ items: { groups: [] } });
      render(<EmployerContractDetailView projectId="p-1" />);
      expect(screen.getByText("Bu sözleşmede henüz iş kalemi yok")).toBeInTheDocument();
    });
  });

  describe("Hakedişler sekmesi (`?tab=payments`)", () => {
    it("listeyi PROJE FİLTRESİYLE çeker (proje-genel liste DEĞİL)", () => {
      searchParams = new URLSearchParams("tab=payments");
      mockAll();
      render(<EmployerContractDetailView projectId="p-1" />);

      expect(vi.mocked(useProgressPayments)).toHaveBeenCalledWith({ project_id: "p-1" });
    });

    it("F-P7'nin liste gövdesini PAYLAŞIR ve proje adını tekrar basmaz", () => {
      searchParams = new URLSearchParams("tab=payments");
      mockAll();
      render(<EmployerContractDetailView projectId="p-1" />);

      expect(screen.getByText("Temmuz hakedişi")).toBeInTheDocument();
      // `showProjectName={false}` — proje adı başlıkta zaten var.
      expect(screen.queryByText("Kule A")).not.toBeInTheDocument();
    });
  });

  describe("Belgeler sekmesi (`?tab=documents`) → PENDING (ONAYLI KARAR)", () => {
    it("sekme basılır, içerik gerekçeli pending kartıdır", () => {
      searchParams = new URLSearchParams("tab=documents");
      mockAll();
      render(<EmployerContractDetailView projectId="p-1" />);

      expect(screen.getByText("Belgeler", { selector: "h2" })).toBeInTheDocument();
      expect(screen.getByTestId("ecd-documents-pending")).toHaveTextContent(
        "Belge modülüyle birlikte gelir",
      );
    });
  });

  describe("yükleme / hata", () => {
    it("sözleşme yüklenirken ve hata durumunda ayrı mesaj basar", () => {
      mockAll({ contractExtra: { data: undefined, isLoading: true } });
      const first = render(<EmployerContractDetailView projectId="p-1" />);
      expect(screen.getByText("Yükleniyor…")).toBeInTheDocument();
      first.unmount();

      mockAll({ contractExtra: { data: undefined, isError: true } });
      render(<EmployerContractDetailView projectId="p-1" />);
      expect(screen.getByText("Sözleşme yüklenemedi")).toBeInTheDocument();
    });
  });
});
