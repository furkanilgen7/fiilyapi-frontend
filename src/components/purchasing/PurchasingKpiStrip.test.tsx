import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { PurchasingKpiStrip } from "./PurchasingKpiStrip";
import type { PurchasingSummaryResponse } from "@/lib/api/hooks/usePurchasingSummary";

const SUMMARY: PurchasingSummaryResponse = {
  open_requests: 8,
  quote_wait_requests: 5,
  pending_approval_requests: 2,
  orders_this_month_total: "1240000.00",
  active_orders: 12,
  in_transit_orders: 3,
  delivered_orders: 24,
};

describe("PurchasingKpiStrip — SAT 68-86", () => {
  it("mockup'ın DÖRT kartını sırasıyla basar", () => {
    render(<PurchasingKpiStrip summary={SUMMARY} />);
    const labels = Array.from(
      screen.getByTestId("sat-kpi-strip").querySelectorAll(".sat-kpi__label"),
    ).map((node) => node.textContent);
    expect(labels).toEqual([
      "Açık Talepler",
      "Teklif Bekleniyor",
      "Bu Ay Sipariş",
      "Onay Bekleyen",
    ]);
  });

  it("sayıları sunucudan basar; para kartı kısaltılır (80: ₺1,24M)", () => {
    render(<PurchasingKpiStrip summary={SUMMARY} />);
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("₺ 1,2M")).toBeInTheDocument();
  });

  // Zarf YOKTUR: `0` GERÇEK bir cevaptır ("hiç açık talep yok"), pending değil.
  it("sıfır değerini SIFIR olarak basar (pending ile karıştırmaz)", () => {
    render(<PurchasingKpiStrip summary={{ ...SUMMARY, open_requests: 0 }} />);
    const strip = screen.getByTestId("sat-kpi-strip");
    const values = Array.from(strip.querySelectorAll(".sat-kpi__value")).map(
      (node) => node.textContent,
    );
    expect(values[0]).toBe("0");
  });

  it("veri yokken sahte sıfır BASMAZ — dört kart da '—' gösterir", () => {
    render(<PurchasingKpiStrip summary={undefined} />);
    const values = Array.from(
      screen.getByTestId("sat-kpi-strip").querySelectorAll(".sat-kpi__value"),
    ).map((node) => node.textContent);
    expect(values).toEqual(["—", "—", "—", "—"]);
  });
});
