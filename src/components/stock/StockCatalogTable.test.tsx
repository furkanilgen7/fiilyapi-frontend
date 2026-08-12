import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { StockCatalogTable } from "./StockCatalogTable";
import type { StockSummaryRow } from "@/lib/api/hooks/useStockSummary";

function row(overrides: Partial<StockSummaryRow> = {}): StockSummaryRow {
  return {
    id: "it-1",
    code: "SNK-0421",
    name: "Nervürlü Demir Ø12",
    category: "steel",
    unit: "Ton",
    min_stock: "10.000",
    balance: "2.400",
    status: "critical",
    last_unit_price: "32000.00",
    warehouses: [
      { warehouse_id: "wh-1", warehouse_name: "D-1 Ambar", site_id: "s-1", balance: "2.400" },
    ],
    ...overrides,
  };
}

function renderTable(
  rows: StockSummaryRow[] | undefined,
  extra?: Partial<{
    isLoading: boolean;
    isError: boolean;
    errorMessage: string;
    hasFilter: boolean;
  }>,
) {
  return render(
    <StockCatalogTable
      rows={rows}
      isLoading={extra?.isLoading ?? false}
      isError={extra?.isError ?? false}
      errorMessage={extra?.errorMessage}
      hasFilter={extra?.hasFilter ?? false}
    />,
  );
}

describe("StockCatalogTable — E3 108-185", () => {
  it("YEDİ kolon başlığı mockup sırasıyla basılır", () => {
    renderTable([]);
    const headers = screen.getAllByRole("columnheader").map((th) => th.textContent);
    expect(headers).toEqual([
      "Malzeme",
      "Kategori",
      "Birim",
      "Stok",
      "Min Stok",
      "Depo",
      "Durum",
    ]);
  });

  it("satır künyesi ad + kod + kategori etiketi + birim + depo taşır", () => {
    renderTable([row()]);
    expect(screen.getByText("Nervürlü Demir Ø12")).toBeInTheDocument();
    expect(screen.getByText("SNK-0421")).toBeInTheDocument();
    expect(screen.getByText("Demir-Çelik")).toBeInTheDocument();
    expect(screen.getByText("Ton")).toBeInTheDocument();
    expect(screen.getByText("D-1 Ambar")).toBeInTheDocument();
  });

  it("rozet SUNUCUNUN status alanından basılır (dört durum)", () => {
    renderTable([
      row({ id: "1", code: "A-1", status: "critical" }),
      row({ id: "2", code: "A-2", status: "low" }),
      row({ id: "3", code: "A-3", status: "normal" }),
      row({ id: "4", code: "A-4", status: "excess" }),
    ]);
    expect(screen.getByTestId("stok-status-A-1")).toHaveTextContent("Kritik");
    expect(screen.getByTestId("stok-status-A-2")).toHaveTextContent("Düşük");
    expect(screen.getByTestId("stok-status-A-3")).toHaveTextContent("Normal");
    expect(screen.getByTestId("stok-status-A-4")).toHaveTextContent("Fazla");
  });

  it("bakiyesi eşiğin ALTINDA olsa da sunucu 'normal' derse NORMAL basılır", () => {
    // Kanıt: istemci eşik formülünü YENİDEN HESAPLAMIYOR (spec §3).
    renderTable([row({ balance: "1.000", min_stock: "999.000", status: "normal" })]);
    expect(screen.getByTestId("stok-status-SNK-0421")).toHaveTextContent("Normal");
  });

  it("min_stock null ⇒ min hücresi ve durum hücresi '—' basar, rozet YOK", () => {
    renderTable([row({ code: "ICY-0090", min_stock: null, status: null, balance: "40.000" })]);
    const status = screen.getByTestId("stok-status-ICY-0090");
    expect(status).toHaveTextContent("—");
    expect(status).toHaveAttribute("title", expect.stringContaining("Min stok tanımlı değil"));
    const cells = screen.getAllByRole("cell").map((td) => td.textContent);
    expect(cells).toContain("—");
  });

  it("EKSİ bakiye kırmızı basılır (meşru değer — hata metni DEĞİL)", () => {
    renderTable([row({ code: "NEG-1", balance: "-5.000", status: null, min_stock: null })]);
    const balance = screen.getByTestId("stok-balance-NEG-1");
    expect(balance).toHaveTextContent("-5");
    expect(balance.className).toContain("stok-balance--danger");
  });

  it("kritik/düşük satır vurgulanır, normal satır vurgulanmaz (121/139/166)", () => {
    renderTable([
      row({ id: "1", code: "A-1", status: "critical" }),
      row({ id: "2", code: "A-2", status: "low" }),
      row({ id: "3", code: "A-3", status: "normal" }),
    ]);
    expect(screen.getByTestId("stok-row-A-1").className).toContain("stok-row--flagged");
    expect(screen.getByTestId("stok-row-A-2").className).toContain("stok-row--flagged");
    expect(screen.getByTestId("stok-row-A-3").className).not.toContain("stok-row--flagged");
  });

  it("deposu olmayan kalemin depo hücresi '—'dir", () => {
    renderTable([row({ code: "NO-WH", warehouses: [] })]);
    expect(screen.getByTestId("stok-row-NO-WH").textContent).toContain("—");
  });

  it("birden fazla depoda duran kalemin depoları birlikte listelenir", () => {
    renderTable([
      row({
        warehouses: [
          { warehouse_id: "wh-1", warehouse_name: "D-1 Ambar", site_id: "s-1", balance: "2.000" },
          { warehouse_id: "wh-2", warehouse_name: "D-2 Açık Alan", site_id: "s-1", balance: "0.400" },
        ],
      }),
    ]);
    expect(screen.getByText("D-1 Ambar, D-2 Açık Alan")).toBeInTheDocument();
  });

  it("mockup'ın örnek satırları SABİT basılmaz: veri yokken tablo boştur", () => {
    renderTable([]);
    expect(screen.queryByText("CTP32,5 Çimento")).not.toBeInTheDocument();
    expect(screen.getByText("Henüz malzeme kartı yok.")).toBeInTheDocument();
  });

  it("yükleniyor/hata/süzgeç boşluğu ayrı metinlerle basılır", () => {
    const loading = renderTable(undefined, { isLoading: true });
    expect(screen.getByText("Stok listesi yükleniyor…")).toBeInTheDocument();
    loading.unmount();

    const failed = renderTable(undefined, { isError: true });
    expect(screen.getByText("Stok listesi yüklenemedi.")).toBeInTheDocument();
    failed.unmount();

    // ST §4b: sunucunun Türkçe cümlesi geldiğinde SABİT metin DEĞİL o basılır
    // (SiteStockView ile aynı kanon — F-ST final review bulgusu).
    const server = renderTable(undefined, {
      isError: true,
      errorMessage: "Bu kaydı görüntüleme yetkiniz yok.",
    });
    expect(screen.getByText("Bu kaydı görüntüleme yetkiniz yok.")).toBeInTheDocument();
    expect(screen.queryByText("Stok listesi yüklenemedi.")).not.toBeInTheDocument();
    server.unmount();

    renderTable([], { hasFilter: true });
    expect(screen.getByText("Bu süzgeçle eşleşen malzeme yok.")).toBeInTheDocument();
  });
});
