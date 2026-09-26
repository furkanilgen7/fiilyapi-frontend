import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { D_LEFT } from "../charts/daily-bars-geometry";
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

  /**
   * FIX-F2 · Ajan B madde 2 — KANIT. `title={`${dayShort(shownRaw.day)} · Bugün`}`
   * (PanelDailyBarsChart.tsx:106) fare konumundan BAĞIMSIZ hep "· Bugün"
   * ekler. Fikstürde son çubuk (offset 0) "bugün"dür; fare BAŞKA (geçmiş) bir
   * çubuğa gelince ipucu o günü de "· Bugün" diye basar — emsal
   * `PanelSCurveChart`ın kuralına aykırı (fare üstündeyken ANKOR DIŞI bir
   * günde "Bugün" basılmaz).
   */
  it("fare BAŞKA (bugün olmayan) bir çubuğa gelince ipucu 'Bugün' basmamalı (emsal: PanelSCurveChart)", () => {
    render(<PanelDailyBarsChart bars={BARS} />);
    const firstDay = BARS[0]!.day;
    const todayDay = BARS[BARS.length - 1]!.day;
    expect(firstDay).not.toBe(todayDay); // fikstür varsayımı: ilk çubuk bugün DEĞİL

    const svg = screen.getByRole("img", { name: "Günlük kazanılmış ve harcanan saat" });
    fireEvent.mouseMove(svg, { clientX: D_LEFT + 1 });

    const title = document.querySelector(".chart-tooltip__title");
    expect(title?.textContent).toContain(firstDay.slice(8, 10) + ".");
    expect(title?.textContent).not.toContain("Bugün");
  });
});
