import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { PanelPfTrendChart } from "./PanelPfTrendChart";
import { panelReportFixture } from "./panel-fixtures";

const FIXTURE = panelReportFixture();

describe("PanelPfTrendChart", () => {
  it("role=img erişilebilir isimle basılır", () => {
    render(<PanelPfTrendChart pfTrend={FIXTURE.pf_trend} pfBands={FIXTURE.pf_bands} rangeLabel="son 4 hafta" />);
    expect(screen.getByRole("img", { name: "PF trendi" })).toBeInTheDocument();
  });

  it("başlığa aralık etiketini ekler", () => {
    render(<PanelPfTrendChart pfTrend={FIXTURE.pf_trend} pfBands={FIXTURE.pf_bands} rangeLabel="son 4 hafta" />);
    expect(screen.getByText("PF trendi · son 4 hafta")).toBeInTheDocument();
  });

  it("lejant metinlerini basar (Günlük PF/7 günlük ort./PF bantları)", () => {
    render(<PanelPfTrendChart pfTrend={FIXTURE.pf_trend} pfBands={FIXTURE.pf_bands} rangeLabel="son 4 hafta" />);
    expect(screen.getByText("Günlük PF", { selector: ".ev-panel-chart-legend__item" })).toBeInTheDocument();
    expect(screen.getByText("7 günlük ort.")).toBeInTheDocument();
    expect(screen.getByText("PF bantları")).toBeInTheDocument();
  });

  it("pf_bands yoksa (null) varsayılan bantlara düşer, çökmez", () => {
    render(<PanelPfTrendChart pfTrend={FIXTURE.pf_trend} pfBands={null} rangeLabel="son 4 hafta" />);
    expect(screen.getByRole("img", { name: "PF trendi" })).toBeInTheDocument();
  });

  it("veri yoksa boş mesaj basar", () => {
    render(<PanelPfTrendChart pfTrend={[]} pfBands={FIXTURE.pf_bands} rangeLabel="son 4 hafta" />);
    expect(screen.getByText("PF trendi için veri yok.")).toBeInTheDocument();
  });
});
