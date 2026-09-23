import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { TimesheetWeekKpis } from "./TimesheetWeekKpis";

const BASE = {
  normalHours: "18",
  overtimeHours: "3",
  totalHours: "21",
  leaveDayCount: 1,
  temporaryDutyDayCount: 0,
  workerCount: 2,
};

/**
 * 🔴 triyaj #351 — "Hafta Toplamı" kartı `isStale` ALMIYORDU ama notu
 * "Normal + FM" diyordu. `totalHours` DÜZ toplamdan (taze), `normalHours`/
 * `overtimeHours` ise backend türevinden (taslak varken BAYAT) gelir —
 * ikisi bağımsız kaynaktır ve toplamları tutmayabilir. Kart bu bayatlığı
 * DİĞER İKİ kart gibi işaretlemeli.
 */
describe("TimesheetWeekKpis · Hafta Toplamı bayatlık işareti", () => {
  it("isStale=false iken hiçbir kart yıldız basmaz", () => {
    render(<TimesheetWeekKpis {...BASE} isStale={false} />);
    expect(screen.queryByText("*")).not.toBeInTheDocument();
  });

  it("isStale=true iken 'Hafta Toplamı' da Normal/FM kartları gibi yıldız basar", () => {
    render(<TimesheetWeekKpis {...BASE} isStale={true} />);
    const totalCard = screen.getByText("Hafta Toplamı").closest(".ts-kpi") as HTMLElement;
    expect(totalCard.className).toContain("ts-kpi--stale");
    expect(totalCard).toHaveTextContent("*");
  });

  it("isStale=true iken Normal ve FM kartları da (önceden zaten) yıldız basar", () => {
    render(<TimesheetWeekKpis {...BASE} isStale={true} />);
    const normalCard = screen.getByText("Normal Mesai").closest(".ts-kpi") as HTMLElement;
    const overtimeCard = screen.getByText("Fazla Mesai").closest(".ts-kpi") as HTMLElement;
    expect(normalCard.className).toContain("ts-kpi--stale");
    expect(overtimeCard.className).toContain("ts-kpi--stale");
  });
});
