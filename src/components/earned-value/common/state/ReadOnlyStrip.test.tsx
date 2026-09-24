import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ReadOnlyStrip } from "./ReadOnlyStrip";

describe("ReadOnlyStrip", () => {
  it("note rolünde metni ve kilit ikonunu basar (Panel.dc.html:440)", () => {
    const { container } = render(<ReadOnlyStrip>Görüntüleyici · yalnız okuma</ReadOnlyStrip>);
    const note = screen.getByRole("note");
    expect(note).toHaveTextContent("Görüntüleyici · yalnız okuma");
    const icon = container.querySelector(".ev-readonly-strip__icon svg");
    expect(icon).not.toBeNull();
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });

  it("varsayılan varyant compact, banner istenince banner sınıfı", () => {
    const { rerender } = render(<ReadOnlyStrip>Metin</ReadOnlyStrip>);
    expect(screen.getByRole("note")).toHaveClass("ev-readonly-strip", "ev-readonly-strip--compact");
    rerender(<ReadOnlyStrip variant="banner">Metin</ReadOnlyStrip>);
    expect(screen.getByRole("note")).toHaveClass("ev-readonly-strip--banner");
    expect(screen.getByRole("note")).not.toHaveClass("ev-readonly-strip--compact");
  });

  it("lead kalın basılır ve metinle birlikte okunur (Bütçe:149)", () => {
    render(
      <ReadOnlyStrip variant="banner" lead="Rev 1 dondurulmuş.">
        Oran ve dağılım değiştirilemez; değişiklik için taslak revizyonu açın.
      </ReadOnlyStrip>,
    );
    const lead = screen.getByText("Rev 1 dondurulmuş.");
    expect(lead.tagName).toBe("STRONG");
    expect(screen.getByRole("note")).toHaveTextContent(
      "Rev 1 dondurulmuş. Oran ve dağılım değiştirilemez; değişiklik için taslak revizyonu açın.",
    );
  });

  it("eylem verilmezse düğme yoktur", () => {
    render(<ReadOnlyStrip>Metin</ReadOnlyStrip>);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("eylem düğmesi onClick'i çağırır (Bütçe:150 'Taslak Rev 2'ye dön')", async () => {
    const onClick = vi.fn();
    render(
      <ReadOnlyStrip variant="banner" action={{ label: "Taslak Rev 2'ye dön", onClick }}>
        Metin
      </ReadOnlyStrip>,
    );
    const button = screen.getByRole("button", { name: "Taslak Rev 2'ye dön" });
    expect(button).toHaveClass("btn");
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("eylem disabled iken tıklama yutulur", async () => {
    const onClick = vi.fn();
    render(
      <ReadOnlyStrip action={{ label: "Düzenleme görünümüne dön", onClick, disabled: true }}>
        Metin
      </ReadOnlyStrip>,
    );
    const button = screen.getByRole("button", { name: "Düzenleme görünümüne dön" });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
