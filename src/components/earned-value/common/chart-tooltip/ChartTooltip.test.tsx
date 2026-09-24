import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { EMPTY_CELL } from "@/lib/format";

import { ChartTooltip } from "./ChartTooltip";
import { TOOLTIP_GAP } from "./tooltip-position";

const BOUNDS = { width: 460, height: 250 };

describe("ChartTooltip", () => {
  it("başlık, etiketler ve DEĞERLER DOM'da görünür (histogram kusurunun tersi, Panel.dc.html:338-343)", () => {
    const { container } = render(
      <ChartTooltip
        x={100}
        y={80}
        bounds={BOUNDS}
        title="H21 · 18–24.09"
        rows={[
          { label: "Planlı gereken", value: "18" },
          { label: "Gerçekleşen", value: "16" },
        ]}
      />,
    );
    expect(screen.getByText("H21 · 18–24.09")).toBeInTheDocument();
    expect(screen.getByText("Planlı gereken")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeVisible();
    expect(screen.getByText("16")).toBeVisible();
    // her satırda etiket + değer çifti
    const values = container.querySelectorAll(".chart-tooltip__value");
    expect([...values].map((v) => v.textContent)).toEqual(["18", "16"]);
  });

  it("boş değer sessizce boş basılmaz, ürün kanonu boş hücre görünür (K20)", () => {
    render(<ChartTooltip x={10} y={10} bounds={BOUNDS} title="T" rows={[{ label: "Planlı", value: "" }]} />);
    expect(screen.getByText(EMPTY_CELL)).toBeInTheDocument();
  });

  it("tone sınıfı değere işlenir; varsayılan ton sınıf eklemez", () => {
    render(
      <ChartTooltip
        x={100}
        y={80}
        bounds={BOUNDS}
        title="24.09.2026 · Gün 142"
        rows={[
          { label: "Planlı", value: "%48,5" },
          { label: "Sapma", value: "-2,6 · Geride", tone: "negative", strong: true },
          { label: "Günlük PF", value: "1,04", tone: "positive" },
        ]}
      />,
    );
    const neg = screen.getByText("-2,6 · Geride");
    expect(neg).toHaveClass("chart-tooltip__value--negative");
    expect(neg).toHaveClass("chart-tooltip__value--strong");
    expect(screen.getByText("1,04")).toHaveClass("chart-tooltip__value--positive");
    expect(screen.getByText("%48,5").className).toBe("chart-tooltip__value");
  });

  it("aria-hidden: grafik verisinin erişilebilir karşılığı ipucu DEĞİLDİR", () => {
    const { container } = render(
      <ChartTooltip x={1} y={1} bounds={BOUNDS} title="T" rows={[{ label: "a", value: "1" }]} />,
    );
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("konum saf fonksiyondan gelir: sağa sığıyorsa x + boşluk", () => {
    const { container } = render(
      <ChartTooltip x={100} y={80} bounds={BOUNDS} title="T" rows={[{ label: "a", value: "1" }]} />,
    );
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.left).toBe(`${100 + TOOLTIP_GAP}px`);
    expect(el.dataset.placement).toBe("right");
  });

  it("sağ kenarda sola çevrilir", () => {
    const { container } = render(
      <ChartTooltip x={458} y={80} bounds={BOUNDS} title="T" rows={[{ label: "a", value: "1" }]} />,
    );
    expect((container.firstElementChild as HTMLElement).dataset.placement).toBe("left");
  });
});
