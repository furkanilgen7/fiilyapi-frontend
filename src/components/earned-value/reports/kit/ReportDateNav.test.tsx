import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ReportDateNav } from "./ReportDateNav";

describe("ReportDateNav · gün modu", () => {
  it("başlık + Gün/Hafta ekini basar, ok değişiminde onChange ±1 gün çağırır", () => {
    const onChange = vi.fn();
    render(
      <ReportDateNav mode="day" day="2026-09-24" dayNo={142} weekNo={21} onChange={onChange} />,
    );
    expect(screen.getByText("24 Eylül 2026 Perşembe")).toBeInTheDocument();
    expect(screen.getByText("Gün 142 · H21")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Sonraki gün"));
    expect(onChange).toHaveBeenCalledWith("2026-09-25");

    fireEvent.click(screen.getByLabelText("Önceki gün"));
    expect(onChange).toHaveBeenCalledWith("2026-09-23");
  });

  it("min sınırındayken önceki gün pasif; max sınırındayken sonraki gün pasif", () => {
    render(
      <ReportDateNav
        mode="day"
        day="2026-09-22"
        dayNo={140}
        weekNo={21}
        min="2026-09-22"
        max="2026-09-24"
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Önceki gün")).toBeDisabled();
    expect(screen.getByLabelText("Sonraki gün")).not.toBeDisabled();
  });

  it("dayNo/weekNo ikisi de null → ek satır basılmaz", () => {
    render(<ReportDateNav mode="day" day="2026-09-24" dayNo={null} weekNo={null} onChange={vi.fn()} />);
    expect(screen.queryByText(/Gün|H\d/)).not.toBeInTheDocument();
  });
});

describe("ReportDateNav · hafta modu", () => {
  it("\"Hafta N\" + kısa ay aralığını basar, ok değişiminde onChange ±1 hafta çağırır", () => {
    const onChange = vi.fn();
    render(
      <ReportDateNav
        mode="week"
        weekNo={21}
        weekStart="2026-09-18"
        weekEnd="2026-09-24"
        onChange={onChange}
      />,
    );
    expect(screen.getByText("Hafta 21")).toBeInTheDocument();
    expect(screen.getByText("18–24 Eyl 2026")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Sonraki hafta"));
    expect(onChange).toHaveBeenCalledWith(22);

    fireEvent.click(screen.getByLabelText("Önceki hafta"));
    expect(onChange).toHaveBeenCalledWith(20);
  });

  it("minWeek/maxWeek sınırında ilgili ok pasif olur", () => {
    render(
      <ReportDateNav
        mode="week"
        weekNo={21}
        weekStart="2026-09-18"
        weekEnd="2026-09-24"
        minWeek={21}
        maxWeek={21}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Önceki hafta")).toBeDisabled();
    expect(screen.getByLabelText("Sonraki hafta")).toBeDisabled();
  });

  it("maxWeek null → sınırsız, sonraki hafta her zaman aktif", () => {
    render(
      <ReportDateNav
        mode="week"
        weekNo={21}
        weekStart="2026-09-18"
        weekEnd="2026-09-24"
        maxWeek={null}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Sonraki hafta")).not.toBeDisabled();
  });
});
