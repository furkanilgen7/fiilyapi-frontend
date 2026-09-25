import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { PanelNoFieldDataState } from "./PanelNoFieldDataState";
import type { EvPanelReport } from "@/lib/api/models";

type CurvePoint = EvPanelReport["s_curve"][number];

function point(overrides: Partial<CurvePoint> = {}): CurvePoint {
  return { day: "2026-09-24", is_future: false, planned_pct_cum: "0.485", progress_pct_cum: null, status: null, variance: null, ...overrides };
}

describe("PanelNoFieldDataState (b)", () => {
  it("GERÇEK % ve KÜM. PF HER ZAMAN '–' basar (uydurma yok)", () => {
    render(<PanelNoFieldDataState sCurve={[point()]} />);
    expect(screen.getByText("GERÇEK %")).toBeInTheDocument();
    expect(screen.getByText("KÜM. PF")).toBeInTheDocument();
    expect(screen.getAllByText("–")).toHaveLength(2);
  });

  it("altyazı metni birebir mockup metnidir", () => {
    render(<PanelNoFieldDataState sCurve={[point()]} />);
    expect(screen.getByText("İlk günlük gönderildiğinde gerçek eğri ve PF hesaplanır.")).toBeInTheDocument();
  });

  it("'Bugün · yalnız planlı eğri' etiketi basılır (gerçek veri OLMASA da son güne oturur)", () => {
    render(
      <PanelNoFieldDataState
        sCurve={[point({ day: "2026-09-22" }), point({ day: "2026-09-23" }), point({ day: "2026-09-24" })]}
      />,
    );
    expect(screen.getByText("Bugün · yalnız planlı eğri")).toBeInTheDocument();
  });

  it("gerçek eğri (path) HİÇ ÇİZİLMEZ — yalnız planlı görünür", () => {
    render(<PanelNoFieldDataState sCurve={[point()]} />);
    const svg = screen.getByRole("img", { name: "Yalnız planlı S-eğrisi" });
    expect(svg.querySelector(".ev-panel-chart__actual")).toBeNull();
    expect(svg.querySelector(".ev-panel-chart__planned")).not.toBeNull();
  });

  it("boş dizi → grafik yerine mesaj (çökmez)", () => {
    render(<PanelNoFieldDataState sCurve={[]} />);
    expect(screen.getByText("Eğri için veri yok.")).toBeInTheDocument();
  });
});
