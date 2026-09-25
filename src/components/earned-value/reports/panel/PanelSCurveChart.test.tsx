import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { PanelSCurveChart } from "./PanelSCurveChart";
import { panelReportFixture } from "./panel-fixtures";

const S_CURVE = panelReportFixture().s_curve;

describe("PanelSCurveChart", () => {
  it("role=img erişilebilir isimle basılır", () => {
    render(<PanelSCurveChart sCurve={S_CURVE} revisionNumber={1} />);
    expect(screen.getByRole("img", { name: "S-eğrisi, kümülatif ilerleme" })).toBeInTheDocument();
  });

  it("başlık ve lejant metinlerini basar (Planlı/Gerçek/Gecikme/Önde)", () => {
    render(<PanelSCurveChart sCurve={S_CURVE} revisionNumber={1} />);
    expect(screen.getByText("S-eğrisi · kümülatif ilerleme")).toBeInTheDocument();
    expect(screen.getByText("Planlı (Rev 1)")).toBeInTheDocument();
    expect(screen.getByText("Gerçek", { selector: ".ev-panel-chart-legend__item" })).toBeInTheDocument();
    expect(screen.getByText("Gecikme")).toBeInTheDocument();
    expect(screen.getByText("Önde")).toBeInTheDocument();
  });

  it("revizyon numarası yoksa 'Planlı' lejantı parantez EKLEMEZ", () => {
    render(<PanelSCurveChart sCurve={S_CURVE} revisionNumber={null} />);
    expect(screen.getByText("Planlı", { selector: ".ev-panel-chart-legend__item" })).toBeInTheDocument();
  });

  it("veri yoksa boş mesaj basar, SVG basılmaz", () => {
    render(<PanelSCurveChart sCurve={[]} revisionNumber={1} />);
    expect(screen.getByText("S-eğrisi için veri yok.")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("fare olmadan DURAĞAN 'Bugün' ipucu basılır (son gerçek günün başlığı)", () => {
    render(<PanelSCurveChart sCurve={S_CURVE} revisionNumber={1} />);
    expect(screen.getByText("Sapma")).toBeInTheDocument();
  });
});
