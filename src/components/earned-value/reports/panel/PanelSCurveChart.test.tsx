import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { PanelSCurveChart } from "./PanelSCurveChart";
import { panelReportFixture } from "./panel-fixtures";

const S_CURVE = panelReportFixture().s_curve;

describe("PanelSCurveChart", () => {
  it("role=img erişilebilir isimle basılır", () => {
    render(<PanelSCurveChart sCurve={S_CURVE} revisionNumber={1} dayNo={142} range="all" />);
    expect(screen.getByRole("img", { name: "S-eğrisi, kümülatif ilerleme" })).toBeInTheDocument();
  });

  it("başlık ve lejant metinlerini basar (Planlı/Gerçek/Gecikme/Önde)", () => {
    render(<PanelSCurveChart sCurve={S_CURVE} revisionNumber={1} dayNo={142} range="all" />);
    expect(screen.getByText("S-eğrisi · kümülatif ilerleme")).toBeInTheDocument();
    expect(screen.getByText("Planlı (Rev 1)")).toBeInTheDocument();
    expect(screen.getByText("Gerçek", { selector: ".ev-panel-chart-legend__item" })).toBeInTheDocument();
    expect(screen.getByText("Gecikme")).toBeInTheDocument();
    expect(screen.getByText("Önde")).toBeInTheDocument();
  });

  it("revizyon numarası yoksa 'Planlı' lejantı parantez EKLEMEZ", () => {
    render(<PanelSCurveChart sCurve={S_CURVE} revisionNumber={null} dayNo={142} range="all" />);
    expect(screen.getByText("Planlı", { selector: ".ev-panel-chart-legend__item" })).toBeInTheDocument();
  });

  it("veri yoksa boş mesaj basar, SVG basılmaz", () => {
    render(<PanelSCurveChart sCurve={[]} revisionNumber={1} dayNo={142} range="all" />);
    expect(screen.getByText("S-eğrisi için veri yok.")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("fare olmadan DURAĞAN 'Bugün' ipucu basılır (son gerçek günün başlığı)", () => {
    render(<PanelSCurveChart sCurve={S_CURVE} revisionNumber={1} dayNo={142} range="all" />);
    expect(screen.getByText("Sapma")).toBeInTheDocument();
  });

  /**
   * PLN-F3.6b LİDER DENETİMİ KUSURU — ipucu ÖNCEDEN "Gün {dizi indeksi+1}"
   * basıyordu (4 noktalı bir dizide hep "Gün 1".."Gün 4"), rapor gününün
   * GERÇEK proje gününü (`day_no`) DEĞİL. `s_curve` ARDIŞIK günlerdir ve son
   * nokta HER ZAMAN rapor günüdür; "Gün N" artık `dayNo`dan GERİYE doğru
   * ofsetlenir.
   */
  it("durağan 'Bugün' ipucu GERÇEK proje gününü basar (dizi indeksi DEĞİL)", () => {
    render(<PanelSCurveChart sCurve={S_CURVE} revisionNumber={1} dayNo={142} range="all" />);
    expect(screen.getByText(/· Gün 142$/)).toBeInTheDocument();
    expect(screen.queryByText(/· Gün 4$/)).toBeNull();
  });

  it("dayNo=null ise 'Gün N' HİÇ basılmaz (uydurma sayı YOK, yalnız tarih)", () => {
    render(<PanelSCurveChart sCurve={S_CURVE} revisionNumber={1} dayNo={null} range="all" />);
    expect(screen.queryByText(/· Gün/)).toBeNull();
  });

  /**
   * Hover'la S_CURVE'ün İLK noktasına (fikstürde bugünden 10 gün ÖNCE)
   * gidilince "Gün 132" basmalı — sabit `dizi indeksi+1` ("Gün 1") DEĞİL,
   * `dayNo`ya göreli ofset (`geo.today` ÇAPA). jsdom'da `getBoundingClientRect`
   * sıfır döndüğü için `toChartViewX` ölçeği 1 sayar; `clientX=S_LEFT` (44)
   * en SOL bandı (indeks 0) hedefler.
   */
  it("hover EARLİER bir noktaya giderse 'Gün N' dayNo'ya GÖRECELİ hesaplanır", () => {
    render(<PanelSCurveChart sCurve={S_CURVE} revisionNumber={1} dayNo={142} range="all" />);
    const svg = screen.getByRole("img", { name: "S-eğrisi, kümülatif ilerleme" });
    fireEvent.mouseMove(svg, { clientX: 44, clientY: 100 });
    expect(screen.getByText(/· Gün 132$/)).toBeInTheDocument();
  });
});
