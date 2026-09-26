import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { indexScale } from "../charts/scale";
import { PF_LEFT, PF_RIGHT } from "../charts/pf-trend-geometry";
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

  /**
   * FIX-F2 · Ajan B madde 2 — KANIT. `title={`${dayShort(shownRaw.day)} · Bugün`}`
   * (PanelPfTrendChart.tsx:113) fare konumundan BAĞIMSIZ hep "· Bugün" ekler.
   * Fare GELECEK bir güne (dizinin son elemanı, `reportDay`den SONRA) gelince
   * ipucu o günü "· Bugün" diye basar — emsal `PanelSCurveChart`ın (fare
   * üstündeyken hover'daki günün TARİHİNİ basar, "Bugün" yalnız ANKORDA)
   * kuralına aykırı.
   */
  it("fare GELECEK bir güne gelince ipucu o günü 'Bugün' diye basmamalı (emsal: PanelSCurveChart)", () => {
    render(<PanelPfTrendChart pfTrend={FIXTURE.pf_trend} pfBands={FIXTURE.pf_bands} rangeLabel="son 4 hafta" reportDay={FIXTURE.day} />);
    const futureIndex = FIXTURE.pf_trend.length - 1;
    const futureDay = FIXTURE.pf_trend[futureIndex]!.day;
    expect(futureDay > FIXTURE.day).toBe(true); // fikstür varsayımı: son nokta GELECEK

    const svg = screen.getByRole("img", { name: "PF trendi" });
    const viewX = indexScale(futureIndex, FIXTURE.pf_trend.length, PF_LEFT, PF_RIGHT);
    fireEvent.mouseMove(svg, { clientX: viewX });

    const title = document.querySelector(".chart-tooltip__title");
    expect(title?.textContent).toContain(futureDay.slice(8, 10) + ".");
    expect(title?.textContent).not.toContain("Bugün");
  });

  /**
   * FIX-F2 · Ajan D madde 2 — KANIT. `panel-fixtures.ts`teki `pf_trend`
   * GELECEK günler için de (backend şeması `PfPoint`de `is_future` YOK,
   * `pf_day`/`pf_rolling` nullanmaz garantisi de yok — bkz. `schema.d.ts`)
   * HAM `pf_day`/`pf_rolling` taşır (fikstür: `pf_day: String(0.97 + i*0.02)`
   * her offset için, gelecek de dahil). Tooltip `shownRaw = pfTrend[shownIndex]`
   * DOĞRUDAN bu ham veriyi basıyordu — fare GELECEK bir güne gelince ipucu
   * o günün ham PF değerlerini basıyordu. Kural `PanelSCurveChart` ile AYNI
   * olmalı: gelecek günde "Gerçek"/"Sapma" alanları HER ZAMAN boş (`—`) basılır
   * (bkz. `sCurveGeometry`: `p.is_future` → `actualY: null`). PF trendinde
   * "planlı" kavramı YOK — `pf_day`/`pf_rolling` İKİSİ DE "gerçek" ölçümdür,
   * bu yüzden gelecek günde İKİSİ DE boş basılmalıdır.
   */
  it("fare GELECEK bir güne gelince ipucu ham pf_day/pf_rolling BASMAMALI (emsal: PanelSCurveChart gelecek gün kuralı)", () => {
    render(<PanelPfTrendChart pfTrend={FIXTURE.pf_trend} pfBands={FIXTURE.pf_bands} rangeLabel="son 4 hafta" reportDay={FIXTURE.day} />);
    const futureIndex = FIXTURE.pf_trend.length - 1;
    const futurePoint = FIXTURE.pf_trend[futureIndex]!;
    expect(futurePoint.day > FIXTURE.day).toBe(true); // fikstür varsayımı: son nokta GELECEK
    // fikstür varsayımı: gelecek nokta HAM veri taşıyor (backend şeması bunu nullamaz).
    expect(futurePoint.pf_day).not.toBeNull();
    expect(futurePoint.pf_rolling).not.toBeNull();

    const svg = screen.getByRole("img", { name: "PF trendi" });
    const viewX = indexScale(futureIndex, FIXTURE.pf_trend.length, PF_LEFT, PF_RIGHT);
    fireEvent.mouseMove(svg, { clientX: viewX });

    const values = document.querySelectorAll(".chart-tooltip__value");
    expect(values).toHaveLength(2);
    // KIRMIZI: bugün ham `formatPf(futurePoint.pf_day)` / `formatPf(futurePoint.pf_rolling)` basılıyor.
    values.forEach((value) => expect(value.textContent).toBe("—"));
  });
});
