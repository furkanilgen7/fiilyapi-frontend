import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { PersonnelTabsStrip } from "./PersonnelTabsStrip";

describe("PersonnelTabsStrip", () => {
  it("'Personel Listesi' aktif sekmedir", () => {
    render(<PersonnelTabsStrip />);
    const active = screen.getByRole("tab", { name: "Personel Listesi" });
    expect(active).toHaveAttribute("aria-selected", "true");
  });

  it("'Puantaj' GERÇEK bir bağlantıdır (spec K3)", () => {
    render(<PersonnelTabsStrip />);
    expect(screen.getByRole("tab", { name: "Puantaj" })).toHaveAttribute("href", "/puantaj");
  });

  it("'Belge & Sertifika' GERÇEK bir bağlantıdır (F-İK T2)", () => {
    render(<PersonnelTabsStrip />);
    expect(screen.getByRole("tab", { name: "Belge & Sertifika" })).toHaveAttribute(
      "href",
      "/personel/belgeler",
    );
  });

  it("rotasız ÜÇ sekme DEVRE-DIŞIdır ve gerekçesi title'da görünür (kalıcı kural)", () => {
    render(<PersonnelTabsStrip />);
    for (const label of ["İzin Yönetimi", "Bordro", "SGK"]) {
      const tab = screen.getByRole("tab", { name: label });
      expect(tab).toHaveAttribute("aria-disabled", "true");
      expect(tab).toHaveAttribute("title", "Bu ekran henüz yazılmadı.");
      expect(tab.tagName).not.toBe("A");
    }
  });
});
