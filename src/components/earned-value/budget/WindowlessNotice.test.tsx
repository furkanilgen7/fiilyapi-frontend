import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { WindowlessNotice } from "./WindowlessNotice";

describe("WindowlessNotice — M4 alt satırı", () => {
  it("BOQ rotası yoksa (şantiye çözülmedi) bağlantı DÜZ METİN kalır", () => {
    render(<WindowlessNotice disciplineName="Peyzaj" code="missing_window" boqHref={null} />);
    expect(screen.getByText("İş Kalemleri'nde bölüme tahsis et →")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("iş günü olmayan pencere ayrı metin taşır, BOQ bağlantısı yok", () => {
    render(<WindowlessNotice disciplineName="Elektrik" code="no_working_day" boqHref="/x" />);
    expect(screen.getByText("Penceresinde iş günü yok")).toBeInTheDocument();
    expect(screen.getByText("Elektrik'in penceresi yalnız tatil ve çalışılmayan günlerden oluşuyor; bu satır dağıtılamaz, dondurma engellenir.")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});

describe("WindowlessNotice — bölümlü yaprak", () => {
  it("bölüm tarihi yoksa bölüm adını söyler ve bölüm tarihlerine yönlendirir", () => {
    render(<WindowlessNotice disciplineName="Kaba İnşaat" code="missing_window" boqHref="/boq" sectionName="Çatı" sectionsHref="/santiye" />);
    expect(screen.getByText("Çatı bölümünün tarihi yok; bu satır dağıtılamaz, dondurma engellenir.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Bölüm tarihlerini düzenle →" })).toHaveAttribute("href", "/santiye");
  });
});
