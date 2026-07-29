import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DrillSidebar } from "./DrillSidebar";
import type { DrillNavGroup } from "./DrillSidebar";

const groups: DrillNavGroup[] = [
  {
    heading: "SAHA & İK",
    items: [
      { label: "Puantaj", href: "/projeler/1/puantaj", emoji: "👷" },
      { label: "Personel", href: "/projeler/1/personel", emoji: "👤" },
    ],
  },
  {
    heading: "MALİ",
    items: [{ label: "Sözleşmeler", href: "/projeler/1/sozlesmeler", emoji: "📋" }],
  },
];

describe("DrillSidebar", () => {
  it("geri linki doğru üst seviye href'ine gider", () => {
    render(
      <DrillSidebar
        backLabel="Projeler"
        backHref="/projeler"
        ariaLabel="Proje gezinme"
        groups={groups}
        activePath="/projeler/1/puantaj"
      />,
    );
    expect(screen.getByRole("link", { name: /Projeler/ })).toHaveAttribute("href", "/projeler");
  });

  it("aktif öğeyi aria-current=page ile işaretler, digerlerini isaretlemez", () => {
    render(
      <DrillSidebar
        backLabel="Projeler"
        backHref="/projeler"
        ariaLabel="Proje gezinme"
        groups={groups}
        activePath="/projeler/1/puantaj"
      />,
    );
    expect(screen.getByRole("link", { name: /Puantaj/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Personel/ })).not.toHaveAttribute("aria-current");
  });

  it("alt rotayi prefix eslesmeyle aktif sayar", () => {
    render(
      <DrillSidebar
        backLabel="Projeler"
        backHref="/projeler"
        ariaLabel="Proje gezinme"
        groups={groups}
        activePath="/projeler/1/puantaj/detay"
      />,
    );
    expect(screen.getByRole("link", { name: /Puantaj/ })).toHaveAttribute("aria-current", "page");
  });

  it("grup basliklarini gosterir", () => {
    render(
      <DrillSidebar
        backLabel="Projeler"
        backHref="/projeler"
        ariaLabel="Proje gezinme"
        groups={groups}
        activePath="/projeler/1"
      />,
    );
    expect(screen.getByText("SAHA & İK")).toBeInTheDocument();
    expect(screen.getByText("MALİ")).toBeInTheDocument();
  });

  it("nav aria-label tasir", () => {
    render(
      <DrillSidebar
        backLabel="Projeler"
        backHref="/projeler"
        ariaLabel="Proje gezinme"
        groups={groups}
        activePath="/projeler/1"
      />,
    );
    expect(screen.getByRole("navigation", { name: "Proje gezinme" })).toBeInTheDocument();
  });
});

// Davranissal klavye odak testi (kod inceleme bulgusu duzeltmesi — Task 12 takibi):
// css.test.ts dosyalari yalniz CSS metninde bir kural oldugunu dogrular, gercek
// odaklanabilirligi veya Tab sirasini dogrulamaz. Burada gercek jsdom + Testing
// Library davranisiyla geri linkinden nav ogelerine Tab sirasi test edilir.
describe("DrillSidebar — klavye odak sirasi (davranissal)", () => {
  it("Tab sirasi: geri linki -> ilk grup ogeleri -> ikinci grup ogesi", async () => {
    const user = userEvent.setup();
    render(
      <DrillSidebar
        backLabel="Projeler"
        backHref="/projeler"
        ariaLabel="Proje gezinme"
        groups={groups}
        activePath="/projeler/1/puantaj"
      />,
    );

    const backLink = screen.getByRole("link", { name: /Projeler/ });
    const puantaj = screen.getByRole("link", { name: /Puantaj/ });
    const personel = screen.getByRole("link", { name: /Personel/ });
    const sozlesmeler = screen.getByRole("link", { name: /Sözleşmeler/ });

    await user.tab();
    expect(backLink).toHaveFocus();

    await user.tab();
    expect(puantaj).toHaveFocus();

    await user.tab();
    expect(personel).toHaveFocus();

    await user.tab();
    expect(sozlesmeler).toHaveFocus();
  });
});
