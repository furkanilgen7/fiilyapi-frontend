import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import type { CashFlowResponse } from "@/lib/api/hooks/useCashFlow";

import { CashFlowPanel } from "./CashFlowPanel";

const RESPONSE: CashFlowResponse = {
  year: 2026,
  month: 7,
  series: [
    { day: "2026-07-01", inflow: "100000.00", outflow: "40000.00" },
    { day: "2026-07-11", inflow: "250000.00", outflow: "310000.00" },
    { day: "2026-07-31", inflow: "500000.00", outflow: "120000.00" },
  ],
  inflow_total: "4120000.00",
  outflow_total: "3840000.00",
};

function renderPanel(cashFlow: CashFlowResponse | undefined) {
  return render(
    <CashFlowPanel cashFlow={cashFlow} isLoading={false} errorMessage={undefined} />,
  );
}

describe("CashFlowPanel — E9:90-106", () => {
  it("E9:91 başlığındaki ay adını SUNUCUNUN echo'sundan türetir", () => {
    renderPanel(RESPONSE);
    expect(screen.getByText("Temmuz Nakit Akışı")).toBeInTheDocument();
    // İstemci saatinden türeseydi bu iddia yılın 11 ayında kırılırdı.
    renderPanel({ ...RESPONSE, month: 2 });
    expect(screen.getByText("Şubat Nakit Akışı")).toBeInTheDocument();
  });

  it("E9:102-105 açıklama şeridini iki toplamdan BİREBİR kompakt basar", () => {
    renderPanel(RESPONSE);
    // T3.0 · mockup sadakati: BOŞLUKSUZ + İKİ ondalık (E9:103-104).
    expect(screen.getByText("Giriş ₺4,12M")).toBeInTheDocument();
    expect(screen.getByText("Çıkış ₺3,84M")).toBeInTheDocument();
    // Kart bakiyesinin boşluklu biçimi (E9:72) buraya SIZMAZ.
    expect(screen.queryByText("Giriş ₺ 4,1M")).not.toBeInTheDocument();
  });

  it("E9:92 SVG'yi mockup ölçüleriyle basar", () => {
    renderPanel(RESPONSE);
    const svg = screen.getByTestId("hazine-cashflow-chart");
    expect(svg.getAttribute("viewBox")).toBe("0 0 400 120");
    expect(svg.getAttribute("preserveAspectRatio")).toBe("none");
  });

  it("E9:98/100 iki eğrinin çizgi biçimleri ayrışır (çıkış KESİKLİdir)", () => {
    renderPanel(RESPONSE);
    const inflow = screen.getByTestId("hazine-cashflow-inflow-line");
    const outflow = screen.getByTestId("hazine-cashflow-outflow-line");
    expect(inflow.getAttribute("stroke-dasharray")).toBeNull();
    expect(outflow.getAttribute("stroke-dasharray")).toBe("4,3");
    expect(inflow.getAttribute("stroke-linecap")).toBe("round");
  });

  it("🔴 basılan yol dizesinde KESİRLİ koordinat yoktur", () => {
    // 30 günlük ay + asal değerler kesirli koordinatı zorlar.
    renderPanel({
      ...RESPONSE,
      month: 4,
      series: [
        { day: "2026-04-03", inflow: "37.00", outflow: "11.00" },
        { day: "2026-04-07", inflow: "101.00", outflow: "53.00" },
        { day: "2026-04-23", inflow: "7.00", outflow: "97.00" },
      ],
    });
    const paths = Array.from(
      screen.getByTestId("hazine-cashflow-chart").querySelectorAll("path"),
    ).map((node) => node.getAttribute("d") ?? "");
    expect(paths.length).toBeGreaterThan(0);
    for (const path of paths) {
      expect(path, `kesirli koordinat sızdı: ${path}`).not.toMatch(/\d\.\d/);
    }
  });

  it("boş seri: sessiz boş SVG YERİNE zarif boş durum basar", () => {
    renderPanel({ ...RESPONSE, series: [], inflow_total: "0.00", outflow_total: "0.00" });
    expect(screen.getByTestId("hazine-cashflow-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("hazine-cashflow-chart")).not.toBeInTheDocument();
    // Toplamlar 0'dır (NULL değil) — açıklama şeridi yine basılır.
    expect(screen.getByText("Giriş ₺0")).toBeInTheDocument();
  });

  it("yüklenirken 'Yükleniyor…' basar, sahte grafik çizmez", () => {
    render(<CashFlowPanel cashFlow={undefined} isLoading errorMessage={undefined} />);
    expect(screen.getByText("Yükleniyor…")).toBeInTheDocument();
    expect(screen.queryByTestId("hazine-cashflow-chart")).not.toBeInTheDocument();
    expect(screen.queryByTestId("hazine-cashflow-empty")).not.toBeInTheDocument();
  });

  it("hata durumu görünür uyarı basar", () => {
    render(
      <CashFlowPanel cashFlow={undefined} isLoading={false} errorMessage="Sunucu hatası" />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Sunucu hatası");
  });
});
