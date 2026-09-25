import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { PanelHistogramChart } from "./PanelHistogramChart";
import { panelReportFixture } from "./panel-fixtures";

const FIXTURE = panelReportFixture();

describe("PanelHistogramChart", () => {
  it("role=img erişilebilir isimle basılır", () => {
    render(<PanelHistogramChart histogram={FIXTURE.histogram} rangeLabel="son 4 hafta" actualBasis="headcount" />);
    expect(screen.getByRole("img", { name: "Haftalık işçi histogramı" })).toBeInTheDocument();
  });

  it("actual_basis=headcount → lejant 'Gerçekleşen (puantaj)'", () => {
    render(<PanelHistogramChart histogram={FIXTURE.histogram} rangeLabel="son 4 hafta" actualBasis="headcount" />);
    expect(screen.getByText("Gerçekleşen (puantaj)", { selector: ".ev-panel-chart-legend__item" })).toBeInTheDocument();
  });

  it("actual_basis=equivalent → lejant 'Gerçekleşen (eşdeğer)'", () => {
    render(<PanelHistogramChart histogram={FIXTURE.histogram} rangeLabel="son 4 hafta" actualBasis="equivalent" />);
    expect(screen.getByText("Gerçekleşen (eşdeğer)", { selector: ".ev-panel-chart-legend__item" })).toBeInTheDocument();
  });

  it("tooltip'te SAYILAR 'kişi' birimiyle basılır (spec §1)", () => {
    render(<PanelHistogramChart histogram={FIXTURE.histogram} rangeLabel="son 4 hafta" actualBasis="headcount" />);
    expect(screen.getByText("Planlı gereken")).toBeInTheDocument();
    expect(screen.getAllByText(/^\d+ kişi$/).length).toBeGreaterThan(0);
  });

  it("hafta etiketi backend week_no'dan gelir (H21 gibi)", () => {
    render(<PanelHistogramChart histogram={FIXTURE.histogram} rangeLabel="son 4 hafta" actualBasis="headcount" />);
    expect(screen.getByText("H21")).toBeInTheDocument();
  });

  it("veri yoksa boş mesaj basar", () => {
    render(<PanelHistogramChart histogram={[]} rangeLabel="son 4 hafta" actualBasis="headcount" />);
    expect(screen.getByText("Haftalık dağılım yok.")).toBeInTheDocument();
  });
});
