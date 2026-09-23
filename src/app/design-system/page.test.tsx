import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import DesignSystemPage from "./page";

// Kayıt 376 — vitrin `Textarea`/`FileInput`/`AnchoredPopover`ı hiç basmıyordu
// (üç primitif de `ui/` altında VAR ve barrel'den dışa açık, yalnız vitrine
// eklenmemişti). Burada davranışsal olarak render edildikleri doğrulanır;
// görsel baseline (Playwright) macOS'ta commit edilmez — bu bekçi onun yerine
// GEÇMEZ, yalnız primitiflerin vitrinden tamamen DÜŞMEDİĞİNİ ölçer.
describe("DesignSystemPage — Textarea/FileInput/AnchoredPopover vitrini (kayıt 376)", () => {
  it("Textarea bölümünü basar", () => {
    render(<DesignSystemPage />);
    const section = screen.getByTestId("section-textarea");
    expect(section.querySelectorAll("textarea")).toHaveLength(4);
  });

  it("FileInput bölümünü basar", () => {
    render(<DesignSystemPage />);
    const section = screen.getByTestId("section-file-input");
    expect(section.querySelectorAll('input[type="file"]')).toHaveLength(3);
  });

  it("AnchoredPopover bölümünü basar ve tetikleyici yüzeyi acar", async () => {
    const user = userEvent.setup();
    render(<DesignSystemPage />);
    expect(screen.getByTestId("section-anchored-popover")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Yüzeyi aç" }));
    expect(screen.getByRole("dialog", { name: "Örnek düzenleme yüzeyi" })).toBeInTheDocument();
  });
});
