import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { PanelPfTrendChart } from "./PanelPfTrendChart";
import { panelReportFixture } from "./panel-fixtures";

const FIXTURE = panelReportFixture();

describe("PanelPfTrendChart", () => {
  it("role=img erişilebilir isimle basılır", () => {
    render(<PanelPfTrendChart pfTrend={FIXTURE.pf_trend} pfBands={FIXTURE.pf_bands} rangeLabel="son 4 hafta" reportDay={FIXTURE.day} />);
    expect(screen.getByRole("img", { name: "PF trendi" })).toBeInTheDocument();
  });

  it("başlığa aralık etiketini ekler", () => {
    render(<PanelPfTrendChart pfTrend={FIXTURE.pf_trend} pfBands={FIXTURE.pf_bands} rangeLabel="son 4 hafta" reportDay={FIXTURE.day} />);
    expect(screen.getByText("PF trendi · son 4 hafta")).toBeInTheDocument();
  });

  it("lejant metinlerini basar (Günlük PF/7 günlük ort./PF bantları)", () => {
    render(<PanelPfTrendChart pfTrend={FIXTURE.pf_trend} pfBands={FIXTURE.pf_bands} rangeLabel="son 4 hafta" reportDay={FIXTURE.day} />);
    expect(screen.getByText("Günlük PF", { selector: ".ev-panel-chart-legend__item" })).toBeInTheDocument();
    expect(screen.getByText("7 günlük ort.")).toBeInTheDocument();
    expect(screen.getByText("PF bantları")).toBeInTheDocument();
  });

  it("pf_bands yoksa (null) varsayılan bantlara düşer, çökmez", () => {
    render(<PanelPfTrendChart pfTrend={FIXTURE.pf_trend} pfBands={null} rangeLabel="son 4 hafta" reportDay={FIXTURE.day} />);
    expect(screen.getByRole("img", { name: "PF trendi" })).toBeInTheDocument();
  });

  it("veri yoksa boş mesaj basar", () => {
    render(<PanelPfTrendChart pfTrend={[]} pfBands={FIXTURE.pf_bands} rangeLabel="son 4 hafta" reportDay={FIXTURE.day} />);
    expect(screen.getByText("PF trendi için veri yok.")).toBeInTheDocument();
  });

  /**
   * 🔴 LİDER DENETİMİ KUSURU (P2, 2026-09-26) — ipucu varsayılanı ÖNCEDEN
   * dizinin SON elemanıydı; fikstürde `pf_trend` GELECEĞE uzanıyorsa
   * (S-eğrisi ile AYNI pencere) bu bir gelecek günü "Bugün" diye basıyordu.
   */
  it("varsayılan ipucu rapor gününe (FIXTURE.day) oturur, dizinin SON GÜNÜNE DEĞİL (fikstür GELECEĞE uzanır)", () => {
    const lastTrendDay = FIXTURE.pf_trend[FIXTURE.pf_trend.length - 1]!.day;
    expect(lastTrendDay).not.toBe(FIXTURE.day); // fikstür varsayımı: S_CURVE_DAYS geleceğe uzanır
    render(<PanelPfTrendChart pfTrend={FIXTURE.pf_trend} pfBands={FIXTURE.pf_bands} rangeLabel="son 4 hafta" reportDay={FIXTURE.day} />);
    expect(screen.getByText(/· Bugün/)).toHaveTextContent(FIXTURE.day.slice(8, 10) + ".");
  });
});
