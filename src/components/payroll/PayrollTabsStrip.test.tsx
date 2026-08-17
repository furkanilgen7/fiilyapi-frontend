import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PAYROLL_TABS, PayrollTabsStrip } from "./PayrollTabsStrip";

const pathname = { current: "/bordro" };
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));

function renderAt(path: string) {
  pathname.current = path;
  return render(<PayrollTabsStrip />);
}

describe("PayrollTabsStrip — bordro ekranlarının ortak şeridi (BG:27-31)", () => {
  it("üç sekmeyi mockup sırasında basar", () => {
    renderAt("/bordro");
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "Aylık Bordro",
      "Bordro Geçmişi",
      "SGK Bildirimi",
    ]);
  });

  it.each(PAYROLL_TABS)("$href yolunda YALNIZ $label aktiftir", (active) => {
    renderAt(active.href);

    const tabs = screen.getAllByRole("tab");
    const selected = tabs.filter((tab) => tab.getAttribute("aria-selected") === "true");
    expect(selected).toHaveLength(1);
    expect(selected[0]).toHaveTextContent(active.label);

    // Aktif sekme kendi sayfasına BAĞLANMAZ (konum bildirir, gezinme değil).
    expect(selected[0]).not.toHaveAttribute("href");
  });

  it("aktif olmayan her sekme GERÇEK rotasına bağlanır", () => {
    renderAt("/bordro/gecmis");
    expect(screen.getByRole("tab", { name: "Aylık Bordro" })).toHaveAttribute("href", "/bordro");
    expect(screen.getByRole("tab", { name: "SGK Bildirimi" })).toHaveAttribute(
      "href",
      "/bordro/sgk",
    );
  });

  it("ön ek eşleşmesi YOKTUR: /bordro/gecmis'te 'Aylık Bordro' aktif GÖRÜNMEZ", () => {
    renderAt("/bordro/gecmis");
    expect(screen.getByRole("tab", { name: "Aylık Bordro" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("şeridin kapsamadığı bir yolda hiçbir sekme aktif değildir", () => {
    renderAt("/personel");
    const selected = screen
      .getAllByRole("tab")
      .filter((tab) => tab.getAttribute("aria-selected") === "true");
    expect(selected).toHaveLength(0);
  });
});
