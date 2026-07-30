import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { ScheduleCard } from "./ScheduleCard";
import { emptySiteFormValues } from "./form-state";

function renderCard(values: Partial<ReturnType<typeof emptySiteFormValues>> = {}) {
  return render(
    <ScheduleCard values={{ ...emptySiteFormValues(), ...values }} onChange={vi.fn()} />,
  );
}

describe("ScheduleCard", () => {
  it("kart basligi mockup satir 92 ile birebir", () => {
    renderCard();
    expect(screen.getByText("📅 Takvim & Bütçe")).toBeInTheDocument();
  });

  it("Sure alani readOnly'dir", () => {
    renderCard();
    expect(screen.getByLabelText("Süre (Gün)")).toHaveAttribute("readonly");
  });

  it("iki tarih girilince sure UC-DAHIL hesaplanir (01.01-10.01 => 10)", () => {
    renderCard({ startDate: "2026-01-01", endDate: "2026-01-10" });
    expect(screen.getByLabelText("Süre (Gün)")).toHaveValue("10");
  });

  it("tek tarih girilince sure alani bos kalir, 0 basmaz", () => {
    renderCard({ startDate: "2026-01-01" });
    expect(screen.getByLabelText("Süre (Gün)")).toHaveValue("");
  });

  it("ters tarihte sure alani bos kalir", () => {
    renderCard({ startDate: "2026-06-01", endDate: "2026-01-01" });
    expect(screen.getByLabelText("Süre (Gün)")).toHaveValue("");
  });

  it("Sure ipucu 'Otomatik hesaplanir' basar", () => {
    renderCard();
    expect(screen.getByText("Otomatik hesaplanır")).toBeInTheDocument();
  });

  it("iki tarih de zorunludur", () => {
    renderCard();
    expect(screen.getByLabelText("Başlangıç Tarihi")).toHaveAttribute("aria-required", "true");
    expect(screen.getByLabelText("Planlanan Bitiş")).toHaveAttribute("aria-required", "true");
    expect(screen.getByLabelText("Şantiye Bütçesi (₺)")).not.toHaveAttribute("aria-required");
  });

  it("tarih alanlari type=date, butce type=number", () => {
    renderCard();
    expect(screen.getByLabelText("Başlangıç Tarihi")).toHaveAttribute("type", "date");
    expect(screen.getByLabelText("Planlanan Bitiş")).toHaveAttribute("type", "date");
    expect(screen.getByLabelText("Şantiye Bütçesi (₺)")).toHaveAttribute("type", "number");
  });
});
