import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { ProgressPaymentsTotalsStrip } from "./ProgressPaymentsTotalsStrip";
import type { ProgressPaymentListItem } from "@/lib/api/hooks/useProgressPayments";

function item(overrides: Partial<ProgressPaymentListItem>): ProgressPaymentListItem {
  return {
    id: "22222222-2222-2222-2222-222222222222",
    project_id: "33333333-3333-3333-3333-333333333333",
    project_name: "Güneşkent A-Blok",
    sequence_no: 1,
    period_year: 2026,
    period_month: 1,
    description: null,
    status: "paid",
    gross_total: "0.00",
    net_total: "0.00",
    ...overrides,
  } as ProgressPaymentListItem;
}

// Mockup `Şantiye - Hakedişler.dc.html` satır 81-86 — coordinator review T6
// fix: şerit hiç atlanmaz, karma basılır.
describe("ProgressPaymentsTotalsStrip", () => {
  it("items undefined (yükleniyor/hata) iken hiç basılmaz", () => {
    const { container } = render(<ProgressPaymentsTotalsStrip items={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("boş listede dört kart da basılır: gerçek kartlar 0/₺0, pending kartlar tire", () => {
    render(<ProgressPaymentsTotalsStrip items={[]} />);
    const strip = screen.getByTestId("pp-totals-strip");
    expect(strip).toBeInTheDocument();
    expect(screen.getAllByTestId("pp-kpi-value")).toHaveLength(2);
    expect(screen.getAllByTestId("pp-kpi-pending")).toHaveLength(2);
    expect(screen.getByText("Onay Bekleyen").nextSibling).toHaveTextContent("0");
  });

  it("dört mockup etiketini birebir basar (satır 82-85)", () => {
    render(<ProgressPaymentsTotalsStrip items={[]} />);
    expect(screen.getByText("Toplam İşveren Hakedişi")).toBeInTheDocument();
    expect(screen.getByText("Toplam Taşeron Ödemesi")).toBeInTheDocument();
    expect(screen.getByText("Onay Bekleyen")).toBeInTheDocument();
    expect(screen.getByText("Brüt Kar Marjı")).toBeInTheDocument();
  });

  it("gerçek kartlar: toplam tutar ve onay bekleyen sayısı liste verisinden türetilir", () => {
    render(
      <ProgressPaymentsTotalsStrip
        items={[
          item({ gross_total: "2100000.00", status: "pending_approval" }),
          item({ gross_total: "2240000.00", status: "paid" }),
        ]}
      />,
    );
    expect(screen.getByText("Onay Bekleyen").nextSibling).toHaveTextContent("1");
    // formatCompactCurrency: 4.340.000,00 → "₺ 4,3M"
    expect(screen.getByText("Toplam İşveren Hakedişi").nextSibling).toHaveTextContent("₺ 4,3M");
  });

  it("taşeron modülüne bağlı kartlar GERÇEK DEĞER basmaz, yalnız pending-modül ipucu taşır", () => {
    render(<ProgressPaymentsTotalsStrip items={[item({})]} />);
    const taseronValue = screen.getByText("Toplam Taşeron Ödemesi").nextSibling as HTMLElement;
    const margeValue = screen.getByText("Brüt Kar Marjı").nextSibling as HTMLElement;
    expect(taseronValue).toHaveTextContent("—");
    expect(taseronValue).toHaveAttribute("title", "Taşeron sözleşmeleriyle birlikte gelir");
    expect(margeValue).toHaveTextContent("—");
    expect(margeValue).toHaveAttribute("title", "Taşeron sözleşmeleriyle birlikte gelir");
    // Sahte/0 değer basılmadığını doğrular — rakam İÇERMEZ.
    expect(taseronValue.textContent).not.toMatch(/\d/);
    expect(margeValue.textContent).not.toMatch(/\d/);
  });

  it("boş liste (0 kalem) 'boş durum' olarak da şeridi basar, gerçek kartlar 0 gösterir", () => {
    render(<ProgressPaymentsTotalsStrip items={[]} />);
    expect(screen.getByText("Onay Bekleyen").nextSibling).toHaveTextContent("0");
    expect(screen.getByText("Toplam İşveren Hakedişi").nextSibling).toHaveTextContent("₺ 0");
  });
});
