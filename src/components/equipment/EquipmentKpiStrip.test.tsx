import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { EquipmentKpiStrip } from "./EquipmentKpiStrip";
import type { EquipmentSummaryResponse } from "@/lib/api/hooks/useEquipmentSummary";

const SUMMARY: EquipmentSummaryResponse = {
  working: 18,
  broken: 3,
  maintenance: 5,
  idle: 7,
  monthly_cost: "124000.00",
  monthly_cost_unknown_count: 0,
};

describe("EquipmentKpiStrip — M1 66-83", () => {
  it("mockup'ın ÜÇ durum kartını + maliyet kartını basar", () => {
    render(<EquipmentKpiStrip summary={SUMMARY} />);
    const strip = screen.getByTestId("makine-kpi-strip");
    const labels = Array.from(strip.querySelectorAll(".makine-kpi__label")).map(
      (node) => node.textContent,
    );
    expect(labels).toEqual(["Aktif Çalışıyor", "Arızalı", "Bakımda", "Aylık Maliyet"]);
  });

  it("K9 — dördüncü sayaç (idle) EKRANDA BASILMAZ", () => {
    render(<EquipmentKpiStrip summary={SUMMARY} />);
    const strip = screen.getByTestId("makine-kpi-strip");
    expect(strip.textContent).not.toMatch(/Boşta/);
    // `idle: 7` değeri hiçbir kartta görünmemeli.
    const values = Array.from(strip.querySelectorAll(".makine-kpi__value")).map(
      (node) => node.textContent,
    );
    expect(values).not.toContain("7");
  });

  it("sayaçları sunucudan basar, maliyet kartı kısaltılır", () => {
    render(<EquipmentKpiStrip summary={SUMMARY} />);
    expect(screen.getByText("18")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("₺ 124B")).toBeInTheDocument();
  });

  it("veri yokken sahte sıfır BASMAZ — dört kart da '—' gösterir", () => {
    render(<EquipmentKpiStrip summary={undefined} />);
    const strip = screen.getByTestId("makine-kpi-strip");
    const values = Array.from(strip.querySelectorAll(".makine-kpi__value")).map(
      (node) => node.textContent,
    );
    expect(values).toEqual(["—", "—", "—", "—"]);
  });

  it("bedeli bilinmeyen ekipman varsa görünür bir not eklenir, sessizce atlanmaz", () => {
    render(<EquipmentKpiStrip summary={{ ...SUMMARY, monthly_cost_unknown_count: 2 }} />);
    expect(screen.getByTestId("makine-kpi-cost-unknown-hint")).toHaveTextContent("2 ekipman");
  });
});
