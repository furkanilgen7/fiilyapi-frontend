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

  // 🔴 F-DATE: bu iddia SILINMEDI, GENISLETILDI. Eski hali `type="date"`
  // sabitliyordu; artik tarih alanlari `ui/date-input` primitive'idir ve
  // native kontrole donus BICIMI geri kirardi (native gosterim tarayicinin
  // ARAYUZ DILINE baglidir, uygulamanin erisimi yoktur — T0 olcumu).
  it("tarih alanlari TR bicimli tarih primitive'idir (native type=date DEGIL)", () => {
    renderCard();
    for (const label of ["Başlangıç Tarihi", "Planlanan Bitiş"]) {
      const field = screen.getByLabelText(label);
      expect(field).toHaveAttribute("type", "text");
      expect(field).not.toHaveAttribute("type", "date");
      expect(field).toHaveAttribute("placeholder", "gg.aa.yyyy");
    }
  });

  it("tarih alanlari ISO degeri TR biciminde gosterir", () => {
    renderCard({ startDate: "2026-03-01", endDate: "2027-06-30" });
    expect(screen.getByLabelText("Başlangıç Tarihi")).toHaveValue("01.03.2026");
    expect(screen.getByLabelText("Planlanan Bitiş")).toHaveValue("30.06.2027");
  });

  it("butce alani type=number kalir", () => {
    renderCard();
    expect(screen.getByLabelText("Şantiye Bütçesi (₺)")).toHaveAttribute("type", "number");
  });
});
