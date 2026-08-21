import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { SiteStockTable } from "./SiteStockTable";
import type { SiteStockRow } from "@/lib/api/hooks/useSiteStock";

/** Sunucunun BUGÜNKÜ zarfları: iki sütun da `available: false` gelir. */
function row(overrides: Partial<SiteStockRow> = {}): SiteStockRow {
  return {
    id: "it-1",
    code: "SNK-0421",
    name: "Nervürlü Demir Ø12",
    category: "steel",
    unit: "Ton",
    min_stock: "10.000",
    balance: "2.400",
    status: "critical",
    monthly_need: { available: false, value: null, pending_module: "site_planning" },
    section: { available: false, items: [], pending_module: "site_planning" },
    ...overrides,
  };
}

function renderTable(
  rows: SiteStockRow[] | undefined,
  extra?: Partial<{ isLoading: boolean; isError: boolean }>,
) {
  return render(
    <SiteStockTable
      rows={rows}
      isLoading={extra?.isLoading ?? false}
      isError={extra?.isError ?? false}
    />,
  );
}

describe("SiteStockTable — ŞS 95-163", () => {
  it("YEDİ kolon mockup sırasıyla basılır (aksiyon başlığı görünürde boştur)", () => {
    renderTable([]);
    const headers = screen.getAllByRole("columnheader").map((th) => th.textContent);
    expect(headers).toEqual([
      "Malzeme",
      "Birim",
      "Mevcut Stok",
      "Aylık İhtiyaç",
      "Bölüm",
      "Durum",
      "İşlem",
    ]);
  });

  it("satır künyesi ad + kod + birim + bakiye taşır (mockup örnekleri değil)", () => {
    renderTable([row()]);
    expect(screen.getByText("Nervürlü Demir Ø12")).toBeInTheDocument();
    expect(screen.getByText("SNK-0421")).toBeInTheDocument();
    expect(screen.getByText("Ton")).toBeInTheDocument();
    expect(screen.getByTestId("santiye-stok-balance-SNK-0421")).toHaveTextContent("2,4");
    // Mockup'ın sabit örnekleri UYDURULMAZ.
    expect(screen.queryByText("Kat 6–10 Kaba İnşaat")).not.toBeInTheDocument();
  });

  it("rozet SUNUCUNUN status damgasıdır; 'normal' ŞS'de 'Yeterli' basılır", () => {
    renderTable([
      row({ id: "1", code: "A-1", status: "critical" }),
      row({ id: "2", code: "A-2", status: "low" }),
      row({ id: "3", code: "A-3", status: "normal" }),
      row({ id: "4", code: "A-4", status: "excess" }),
    ]);
    expect(screen.getByTestId("santiye-stok-status-A-1")).toHaveTextContent("Kritik");
    expect(screen.getByTestId("santiye-stok-status-A-2")).toHaveTextContent("Düşük");
    expect(screen.getByTestId("santiye-stok-status-A-3")).toHaveTextContent("Yeterli");
    expect(screen.getByTestId("santiye-stok-status-A-4")).toHaveTextContent("Fazla");
  });

  it("bakiyesi eşiğin ALTINDA olsa da sunucu 'normal' derse YETERLİ basılır", () => {
    // Kanıt: istemci eşik formülünü YENİDEN HESAPLAMIYOR (spec §3).
    renderTable([row({ balance: "1.000", min_stock: "999.000", status: "normal" })]);
    expect(screen.getByTestId("santiye-stok-status-SNK-0421")).toHaveTextContent("Yeterli");
  });

  it("min_stock yoksa durum '—' + gerekçe; rozet İCAT EDİLMEZ", () => {
    renderTable([row({ code: "ICY-0090", min_stock: null, status: null })]);
    const cell = screen.getByTestId("santiye-stok-status-ICY-0090");
    expect(cell).toHaveTextContent("—");
    expect(cell).toHaveAttribute("title", "Min stok tanımlı değil — durum hesaplanmaz");
  });

  it("eksi bakiye MEŞRUDUR ve kırmızı basılır (durum null olsa bile)", () => {
    renderTable([row({ code: "EKS-1", balance: "-5.000", min_stock: null, status: null })]);
    expect(screen.getByTestId("santiye-stok-balance-EKS-1")).toHaveClass("stok-balance--danger");
  });

  it("'Aylık İhtiyaç' ve 'Bölüm' PENDING'dir: '—' + sunucunun gerekçesi", () => {
    renderTable([row()]);
    const need = screen.getByTestId("santiye-stok-need-SNK-0421");
    const section = screen.getByTestId("santiye-stok-section-SNK-0421");
    expect(need).toHaveTextContent("—");
    expect(section).toHaveTextContent("—");
    for (const cell of [need, section]) {
      expect(cell).toHaveAttribute("title", "Şantiye planlama verisi bu yüzeye henüz bağlanmadı");
    }
  });

  it("zarflar available=true dönerse SUNUCUNUN değeri olduğu gibi basılır", () => {
    renderTable([
      row({
        monthly_need: { available: true, value: "15.000", pending_module: null },
        section: { available: true, items: ["Kat 6–10"], pending_module: "site_planning" },
      }),
    ]);
    expect(screen.queryByTestId("santiye-stok-need-SNK-0421")).not.toBeInTheDocument();
    expect(screen.queryByTestId("santiye-stok-section-SNK-0421")).not.toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("Kat 6–10")).toBeInTheDocument();
  });

  it("satır aksiyonu duruma göre adlanır ve HEPSİ devre dışıdır (S5)", () => {
    renderTable([
      row({ id: "1", code: "A-1", status: "critical" }),
      row({ id: "2", code: "A-2", status: "low" }),
      row({ id: "3", code: "A-3", status: "normal" }),
    ]);
    const critical = screen.getByTestId("santiye-stok-action-A-1");
    const low = screen.getByTestId("santiye-stok-action-A-2");
    const normal = screen.getByTestId("santiye-stok-action-A-3");

    expect(critical).toHaveTextContent("Acil Sipariş");
    expect(low).toHaveTextContent("Sipariş Ver");
    expect(normal).toHaveTextContent("Detay");
    for (const button of [critical, low, normal]) expect(button).toBeDisabled();

    expect(critical).toHaveAttribute("title", "Satınalma verisi bu yüzeye henüz bağlanmadı");
    expect(low).toHaveAttribute("title", "Satınalma verisi bu yüzeye henüz bağlanmadı");
    expect(normal).toHaveAttribute(
      "title",
      "Malzeme detay ekranı henüz tasarlanmadı — mockup çizilince açılacak",
    );
  });

  it("kritik/düşük satırlar vurgulanır, yeterli satır vurgulanmaz", () => {
    renderTable([
      row({ id: "1", code: "A-1", status: "critical" }),
      row({ id: "2", code: "A-2", status: "low" }),
      row({ id: "3", code: "A-3", status: "normal" }),
    ]);
    expect(screen.getByTestId("santiye-stok-row-A-1")).toHaveClass("stok-row--flagged");
    expect(screen.getByTestId("santiye-stok-row-A-2")).toHaveClass("stok-row--flagged");
    expect(screen.getByTestId("santiye-stok-row-A-3")).not.toHaveClass("stok-row--flagged");
  });

  it("boş/yükleniyor/hata durumları ayrı metin basar, sahte satır BASMAZ", () => {
    const { rerender } = renderTable(undefined, { isLoading: true });
    expect(screen.getByText("Şantiye stok listesi yükleniyor…")).toBeInTheDocument();

    rerender(<SiteStockTable rows={undefined} isLoading={false} isError />);
    expect(screen.getByText("Şantiye stok listesi yüklenemedi.")).toBeInTheDocument();

    rerender(<SiteStockTable rows={[]} isLoading={false} isError={false} />);
    expect(
      screen.getByText("Bu şantiyenin depolarında hareket görmüş malzeme yok."),
    ).toBeInTheDocument();
  });
});
