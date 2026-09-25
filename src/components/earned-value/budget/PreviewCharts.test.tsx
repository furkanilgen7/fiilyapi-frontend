import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { SCurveChart, WorkerHistogram } from "./PreviewCharts";
import { previewOut } from "./budget-fixtures";

// PLN-F1.6.3 · CEO n — fare grafikte değilken durağan ipucu (mockup BÜT:351-356, 376-381).

describe("SCurveChart — bugün noktasında durağan ipucu", () => {
  it("fare yokken bugünün ipucu basılır (tarih · Gün n, Planlı (Rev n))", () => {
    render(<SCurveChart preview={previewOut()} revisionNumber={2} todayIso="2026-05-07" />);
    expect(screen.getByText("07.05.2026 · Gün 4")).toBeInTheDocument();
    expect(screen.getByText("Planlı (Rev 2)")).toBeInTheDocument();
    expect(screen.getByText("%50,0")).toBeInTheDocument();
  });

  it("bugün aralık dışındaysa ipucu YOK", () => {
    render(<SCurveChart preview={previewOut()} revisionNumber={2} todayIso="2026-09-24" />);
    expect(screen.queryByText(/· Gün/)).not.toBeInTheDocument();
  });

  it("fare üstündeyken o gün, çıkınca bugüne döner (kalkmaz)", () => {
    render(<SCurveChart preview={previewOut()} revisionNumber={2} todayIso="2026-05-07" />);
    const svg = screen.getByRole("img", { name: "Planlı S-eğrisi" });
    fireEvent.mouseMove(svg, { clientX: 99999 });
    expect(screen.getByText("17.05.2026 · Gün 14")).toBeInTheDocument();
    fireEvent.mouseLeave(svg);
    expect(screen.getByText("07.05.2026 · Gün 4")).toBeInTheDocument();
  });
});

describe("WorkerHistogram — tepe haftada durağan ipucu", () => {
  it("fare yokken tepe hafta ipucu: 'H1 · tepe hafta', Gereken + Bölüm planı", () => {
    render(<WorkerHistogram preview={previewOut()} />);
    expect(screen.getByText("H1 · tepe hafta")).toBeInTheDocument();
    expect(screen.getByText("Bölüm planı")).toBeInTheDocument();
  });

  it("fare başka haftadayken o hafta, çıkınca tepe haftaya döner", () => {
    render(<WorkerHistogram preview={previewOut()} />);
    const svg = screen.getByRole("img", { name: "Haftalık gereken işçi" });
    fireEvent.mouseMove(svg, { clientX: 99999 });
    expect(screen.getByText("H2")).toBeInTheDocument();
    fireEvent.mouseLeave(svg);
    expect(screen.getByText("H1 · tepe hafta")).toBeInTheDocument();
  });

  it("tepe yoksa (bütçe 0) ipucu YOK", () => {
    const preview = previewOut();
    render(<WorkerHistogram preview={{ ...preview, total: { ...preview.total, peak_week: null } }} />);
    expect(screen.queryByText("Gereken")).not.toBeInTheDocument();
  });
});
