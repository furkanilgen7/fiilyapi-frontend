import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";

import type {
  SectionStockKpis,
  SectionStockRow,
} from "@/lib/api/hooks/useSectionStock";

import { SectionStockPanel } from "./SectionStockPanel";

// STOK-BOLUM · Bölüm Detay › "Malzeme" sekmesinin gövdesi.
//
// 🔴 SEKME ARTIK PENDING DEĞİL. Önceki iddia seti bu panelin `section_stock`
// gerekçesini BASTIĞINI kilitliyordu; o gerekçe bir ÖLÇÜME dayanıyordu
// ("`inventory/` içinde `section_id` SIFIR isabet") ve ölçüm backend `186ffe9`
// ile ÇÜRÜDÜ. İddialar SİLİNMEDİ, YENİ GERÇEĞE TAŞINDI (F-MU2 kanonu).

const SECTION_NAME = "Kat 6–10 Kaba İnşaat";
const STOCK_HREF = "/projeler/p-1/santiyeler/s-1/stok?section=sec-1";

function row(overrides: Partial<SectionStockRow> = {}): SectionStockRow {
  return {
    item_id: "it-1",
    code: "DMR-0421",
    name: "Nervürlü Demir Ø12",
    category: "steel",
    unit: "Ton",
    boq_item_id: "bi-4",
    boq_code: "02.002",
    boq_description: "Demir Donatı (Ø8-Ø20)",
    assigned_quantity: "10.000",
    issued_quantity: "4.000",
    net_quantity: "6.000",
    total_value: "320000.00",
    ...overrides,
  };
}

const KPIS: SectionStockKpis = {
  issued_value: "128000.00",
  total_value: "320000.00",
  item_count: 1,
  lines_without_price: 0,
};

function renderPanel(
  props: Partial<React.ComponentProps<typeof SectionStockPanel>> = {},
) {
  return render(
    <SectionStockPanel
      sectionName={SECTION_NAME}
      siteStockHref={STOCK_HREF}
      rows={[row()]}
      kpis={KPIS}
      isLoading={false}
      isError={false}
      {...props}
    />,
  );
}

describe("SectionStockPanel", () => {
  it("başlık bölüm adını taşır (jenerik doldur-boşluk DEĞİL)", () => {
    renderPanel();

    expect(screen.getByTestId("section-stock")).toHaveTextContent(SECTION_NAME);
  });

  // 🔴 TERS BEKÇİ — eski pending gerekçesi GERİ GELİRSE kırmızı. Bağ AÇIKKEN
  // "bölüm alanı taşımıyor" basmak CANLI BİR YALANDIR.
  it("eski pending gerekcesini ARTIK BASMAZ (bag acildi)", () => {
    renderPanel();

    expect(
      screen.queryByText(/Stok hareketi bölüm alanı taşımıyor/),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/henüz görüntülenemiyor/)).not.toBeInTheDocument();
  });

  // 🔴 BU DİLİMİN ANA İDDİASI: alım etiketi ile sarf etiketi AYRI SAYILIR.
  // Tek toplam basılsaydı `+10` ile `−4` birbirini götürür ve ekran 4 birimin
  // harcandığını HİÇ söyleyemezdi. İkisi de AYNI ANDA görünür olmalıdır.
  it("ATANAN ve SARF ayri ayri basilir - biri otekini goturmez", () => {
    renderPanel();

    const line = screen.getByTestId("section-stock-row-DMR-0421");
    expect(line).toHaveTextContent("10 Ton"); // atanan
    expect(within(line).getByTestId("section-stock-issued-DMR-0421")).toHaveTextContent(
      "4 Ton",
    );
    // Net de sunucudan gelir ve İSTEMCİDE HESAPLANMAZ.
    expect(line).toHaveTextContent("6 Ton");
  });

  // POZİTİF KONTROL — yukarıdaki iddia "her metne kızan" bir kural değildir:
  // sarf SIFIRKEN de hücre basılır (satır kaybolmaz), yalnız değeri 0'dır.
  it("POZITIF KONTROL - sarf SIFIR iken de hucre basilir", () => {
    renderPanel({ rows: [row({ issued_quantity: "0.000", net_quantity: "10.000" })] });

    expect(screen.getByTestId("section-stock-issued-DMR-0421")).toHaveTextContent("0 Ton");
  });

  it("poz kirilimi basilir (kod + aciklama)", () => {
    renderPanel();

    expect(screen.getByTestId("section-stock-row-DMR-0421")).toHaveTextContent(
      "02.002 · Demir Donatı (Ø8-Ø20)",
    );
  });

  // Poz atfının YOKLUĞU MEŞRUDUR (backend fail-open) — "pending" DEĞİLDİR.
  it("pozsuz satir mesru bir hal olarak basilir, pending gerekcesi DEGIL", () => {
    renderPanel({
      rows: [row({ boq_item_id: null, boq_code: null, boq_description: null })],
    });

    const cell = screen.getByTestId("section-stock-noboq-DMR-0421");
    expect(cell).toHaveTextContent("Poz atanmadı");
    expect(cell).toHaveTextContent(/poz kırılımı zorunlu değildir/i);
  });

  it("KPI seridi DORT gercek sayi basar (yer tutucu YOK)", () => {
    renderPanel();

    expect(screen.getByTestId("section-stock-kpi-issued-value")).toHaveTextContent("128.000");
    expect(screen.getByTestId("section-stock-kpi-item-count")).toHaveTextContent("1");
    expect(screen.getByTestId("section-stock-kpi-lines-without-price")).toHaveTextContent("0");
  });

  it("fiyatsiz satir varsa tutarin EKSIKLIGI gorunur cumleyle bildirilir", () => {
    renderPanel({ kpis: { ...KPIS, lines_without_price: 2 } });

    expect(screen.getByTestId("section-stock-price-notice")).toHaveTextContent(
      /2 satırın birim fiyatı yok/,
    );
  });

  it("fiyatsiz satir YOKKEN uyari BASILMAZ", () => {
    renderPanel();

    expect(screen.queryByTestId("section-stock-price-notice")).not.toBeInTheDocument();
  });

  // Yükleme/hata/boş dalları AYRI basılır: veri yokken boş tablo basmak
  // "bu bölümde hiç hareket yok" YALANINI söylerdi.
  it("yukleme dali bos tabloya DUSMEZ", () => {
    renderPanel({ rows: undefined, kpis: undefined, isLoading: true });

    expect(screen.getByText("Yükleniyor…")).toBeInTheDocument();
    expect(screen.queryByTestId("section-stock-table")).not.toBeInTheDocument();
    expect(screen.queryByTestId("section-stock-empty")).not.toBeInTheDocument();
  });

  it("hata dali GORUNUR cumle basar (sessiz bos tablo YOK)", () => {
    renderPanel({ rows: undefined, kpis: undefined, isError: true });

    expect(screen.getByTestId("section-stock-error")).toBeInTheDocument();
    expect(screen.queryByTestId("section-stock-table")).not.toBeInTheDocument();
  });

  it("GERCEKTEN bos kume icin ayri, dogru cumle basar", () => {
    renderPanel({ rows: [], kpis: { ...KPIS, item_count: 0 } });

    expect(screen.getByTestId("section-stock-empty")).toHaveTextContent(
      /atfedilmiş stok hareketi yok/,
    );
  });

  // 🔴 Bu bağlantı — alt karttaki "Tümü →"nün AKSİNE — süzgeci TAŞIR: sekmenin
  // cümlesi zaten "bu bölümün malzemesi"dir, `?section=` etiketle ÇELİŞMEZ.
  it("santiye stok baglantisi bolum suzgecini TASIR", () => {
    renderPanel();

    const panel = screen.getByTestId("section-stock");
    const link = within(panel).getByRole("link");
    expect(link).toHaveAttribute("href", STOCK_HREF);
    expect(link.getAttribute("href")).toContain("?section=");
  });
});
