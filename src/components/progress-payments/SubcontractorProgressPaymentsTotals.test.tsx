import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { SubcontractorProgressPaymentsTotals } from "./SubcontractorProgressPaymentsTotals";
import type { SubcontractorProgressPaymentSummary } from "@/lib/api/hooks/useSubcontractorProgressPayments";

const SUMMARY: SubcontractorProgressPaymentSummary = {
  total_gross: "4820000.00",
  pending_gross: "1240000.00",
  paid_period_gross: "2100000.00",
  active_subcontractor_count: 12,
  period_year: 2026,
  period_month: 7,
};

describe("SubcontractorProgressPaymentsTotals", () => {
  it("summary yoksa hicbir sey basmaz (sahte 0 gosterilmez)", () => {
    const { container } = render(<SubcontractorProgressPaymentsTotals />);
    expect(container).toBeEmptyDOMElement();
  });

  it("dort karti mockup sirasi ve etiketleriyle basar", () => {
    render(<SubcontractorProgressPaymentsTotals summary={SUMMARY} />);
    expect(screen.getByText("Toplam Hakediş")).toBeInTheDocument();
    expect(screen.getByText("Onay Bekliyor")).toBeInTheDocument();
    expect(screen.getByText("Bu Ay Ödenen")).toBeInTheDocument();
    expect(screen.getByText("Aktif Taşeron")).toBeInTheDocument();
  });

  it("para kartlari kompakt bicimde basar, aktif taseron duz sayi basar", () => {
    render(<SubcontractorProgressPaymentsTotals summary={SUMMARY} />);
    const values = screen.getAllByTestId("thk-kpi-value");
    expect(values.map((el) => el.textContent)).toEqual(["₺ 4,8M", "₺ 1,2M", "₺ 2,1M", "12"]);
  });

  it("onay bekliyor kartinda amber, bu ay odenen kartinda yesil renk sinifi tasir", () => {
    render(<SubcontractorProgressPaymentsTotals summary={SUMMARY} />);
    const values = screen.getAllByTestId("thk-kpi-value");
    expect(values[1]).toHaveClass("thk-kpi__value--warning");
    expect(values[2]).toHaveClass("thk-kpi__value--success");
    expect(values[0]).toHaveClass("thk-kpi__value--neutral");
    expect(values[3]).toHaveClass("thk-kpi__value--neutral");
  });
});
