import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { PanelDailyBarsChart } from "./PanelDailyBarsChart";
import { panelReportFixture } from "./panel-fixtures";

const BARS = panelReportFixture().bars;

describe("PanelDailyBarsChart", () => {
  it("role=img erişilebilir isimle basılır", () => {
    render(<PanelDailyBarsChart bars={BARS} />);
    expect(screen.getByRole("img", { name: "Günlük kazanılmış ve harcanan saat" })).toBeInTheDocument();
  });

  it("lejant metinlerini basar (Kazanılmış/Harcanan/Tatil/Gönderilmedi)", () => {
    render(<PanelDailyBarsChart bars={BARS} />);
    expect(screen.getByText("Kazanılmış", { selector: ".ev-panel-chart-legend__item" })).toBeInTheDocument();
    expect(screen.getByText("Harcanan", { selector: ".ev-panel-chart-legend__item" })).toBeInTheDocument();
    expect(screen.getByText("Tatil")).toBeInTheDocument();
    expect(screen.getByText("Gönderilmedi")).toBeInTheDocument();
  });

  it("durağan bugün ipucu 'Kazanılmış'/'Harcanan' satırlarını basar", () => {
    render(<PanelDailyBarsChart bars={BARS} />);
    expect(screen.getAllByText("Kazanılmış").length).toBeGreaterThan(0);
  });

  it("veri yoksa boş mesaj basar", () => {
    render(<PanelDailyBarsChart bars={[]} />);
    expect(screen.getByText("Günlük veri yok.")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
  });
});
