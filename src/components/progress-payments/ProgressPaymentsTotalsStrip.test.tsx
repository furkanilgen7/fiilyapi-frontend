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
    expect(taseronValue).toHaveAttribute("title", "Taşeron sözleşmesi verisi bu yüzeye henüz bağlanmadı");
    expect(margeValue).toHaveTextContent("—");
    expect(margeValue).toHaveAttribute("title", "Taşeron sözleşmesi verisi bu yüzeye henüz bağlanmadı");
    // Sahte/0 değer basılmadığını doğrular — rakam İÇERMEZ.
    expect(taseronValue.textContent).not.toMatch(/\d/);
    expect(margeValue.textContent).not.toMatch(/\d/);
  });

  it("boş liste (0 kalem) 'boş durum' olarak da şeridi basar, gerçek kartlar 0 gösterir", () => {
    render(<ProgressPaymentsTotalsStrip items={[]} />);
    expect(screen.getByText("Onay Bekleyen").nextSibling).toHaveTextContent("0");
    expect(screen.getByText("Toplam İşveren Hakedişi").nextSibling).toHaveTextContent("₺ 0");
  });

  // Round 2 (coordinator review): mockup satır 82 "4 hakediş · %75" alt
  // metni — sayı HER ZAMAN, yüzde yalnız `summary` verilip `progressPct`
  // null OLMADIĞINDA basılır.
  describe("alt metin (mockup 82: '4 hakediş · %75')", () => {
    it("summary verilmezse (T2 /hakedisler) yalnız items.length sayısı basılır, yüzde YOK", () => {
      render(
        <ProgressPaymentsTotalsStrip
          items={[item({}), item({}), item({})]}
          summary={undefined}
        />,
      );
      expect(screen.getByTestId("pp-kpi-subtitle")).toHaveTextContent("3 hakediş");
      expect(screen.getByTestId("pp-kpi-subtitle").textContent).not.toMatch(/%/);
    });

    it("summary verilirse sayı VE yüzde birlikte basılır, sayı payment_count'tan gelir (items.length DEĞİL)", () => {
      render(
        <ProgressPaymentsTotalsStrip
          items={[item({})]}
          summary={{ paymentCount: 4, progressPct: "75.00" }}
        />,
      );
      expect(screen.getByTestId("pp-kpi-subtitle")).toHaveTextContent("4 hakediş · %75");
    });

    it("progressPct null ise yüzde BASILMAZ, yalnız sayı kalır (sahte '—' uydurulmaz)", () => {
      render(
        <ProgressPaymentsTotalsStrip
          items={[item({}), item({})]}
          summary={{ paymentCount: 2, progressPct: null }}
        />,
      );
      expect(screen.getByTestId("pp-kpi-subtitle")).toHaveTextContent("2 hakediş");
      expect(screen.getByTestId("pp-kpi-subtitle").textContent).not.toMatch(/%/);
    });

    it("summary undefined iken (özet sorgusu hata/yüklenmedi) şeridin geri kalanı normal render edilir", () => {
      render(<ProgressPaymentsTotalsStrip items={[item({ status: "pending_approval" })]} />);
      const strip = screen.getByTestId("pp-totals-strip");
      expect(strip).toBeInTheDocument();
      expect(screen.getAllByTestId("pp-kpi-value")).toHaveLength(2);
      expect(screen.getAllByTestId("pp-kpi-pending")).toHaveLength(2);
    });
  });

  // F-TH T5 — `subcontractor` prop verildiğinde (Şantiye "Hakedişler" sekmesi)
  // iki kart GERÇEK değer basar, "Onay Bekleyen" iki tarafı toplar.
  describe("subcontractor prop (F-TH T5, Şantiye Hakedişler sekmesi)", () => {
    it("subcontractor verilmezse davranış DEĞİŞMEZ (T2 /hakedisler geriye dönük uyumlu)", () => {
      render(<ProgressPaymentsTotalsStrip items={[item({ status: "pending_approval" })]} />);
      expect(screen.getAllByTestId("pp-kpi-pending")).toHaveLength(2);
      expect(screen.getByText("Onay Bekleyen").nextSibling).toHaveTextContent("1");
    });

    it("hazır (ready) durumda: taşeron toplamı, distinct sayısı ve marj GERÇEK basılır", () => {
      render(
        <ProgressPaymentsTotalsStrip
          items={[item({ gross_total: "8400000", status: "pending_approval" })]}
          subcontractor={{
            isLoading: false,
            isPartial: false,
            grossTotal: "4820000",
            distinctSubcontractorCount: 12,
            pendingApprovalCount: 2,
            marginPct: "42.62",
          }}
        />,
      );
      expect(screen.getByText("Toplam Taşeron Ödemesi").nextSibling).toHaveTextContent("₺ 4,8M");
      expect(screen.getByText("12 taşeron")).toBeInTheDocument();
      expect(screen.getByText("Brüt Kar Marjı").nextSibling).toHaveTextContent("%42,6");
      // Onay Bekleyen = 1 işveren (pending_approval) + 2 taşeron = 3 (mockup kanıtı).
      expect(screen.getByText("Onay Bekleyen").nextSibling).toHaveTextContent("3");
    });

    it("yükleniyor durumunda iki kart da 'Yükleniyor…' gösterir, Onay Bekleyen yalnız işveren sayısını basar", () => {
      render(
        <ProgressPaymentsTotalsStrip
          items={[item({ status: "pending_approval" })]}
          subcontractor={{
            isLoading: true,
            isPartial: false,
            grossTotal: "0",
            distinctSubcontractorCount: 0,
            pendingApprovalCount: 5,
            marginPct: null,
          }}
        />,
      );
      expect(screen.getAllByTestId("pp-kpi-loading")).toHaveLength(2);
      expect(screen.getByText("Onay Bekleyen").nextSibling).toHaveTextContent("1");
    });

    it("kısmi hatada (isPartial) taşeron toplamı VE marj basılmaz, görünür bir ipucuyla pending gösterilir", () => {
      render(
        <ProgressPaymentsTotalsStrip
          items={[item({})]}
          subcontractor={{
            isLoading: false,
            isPartial: true,
            grossTotal: "1000000",
            distinctSubcontractorCount: 3,
            pendingApprovalCount: 1,
            marginPct: "10.00",
          }}
        />,
      );
      const taseronValue = screen.getByText("Toplam Taşeron Ödemesi").nextSibling as HTMLElement;
      const margeValue = screen.getByText("Brüt Kar Marjı").nextSibling as HTMLElement;
      expect(taseronValue.textContent).not.toMatch(/\d/);
      expect(margeValue.textContent).not.toMatch(/\d/);
      expect(taseronValue).toHaveAttribute(
        "title",
        "Bazı taşeron sözleşmeleri yüklenemedi — toplam eksik olabilir",
      );
      expect(margeValue).toHaveAttribute(
        "title",
        "Bazı taşeron sözleşmeleri yüklenemedi — kâr marjı eksik olabilir",
      );
    });

    it("marginPct null ise (işveren toplamı 0) marj basılmaz — kısmi hata OLMASA bile", () => {
      render(
        <ProgressPaymentsTotalsStrip
          items={[item({ gross_total: "0" })]}
          subcontractor={{
            isLoading: false,
            isPartial: false,
            grossTotal: "0",
            distinctSubcontractorCount: 0,
            pendingApprovalCount: 0,
            marginPct: null,
          }}
        />,
      );
      const margeValue = screen.getByText("Brüt Kar Marjı").nextSibling as HTMLElement;
      expect(margeValue.textContent).not.toMatch(/\d/);
    });
  });
});
