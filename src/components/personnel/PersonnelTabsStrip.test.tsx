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

  it("'İzin Yönetimi' GERÇEK bir bağlantıdır (F-IZN T5)", () => {
    render(<PersonnelTabsStrip />);
    expect(screen.getByRole("tab", { name: "İzin Yönetimi" })).toHaveAttribute(
      "href",
      "/personel/izinler",
    );
  });

  it("rotasız İKİ sekme DEVRE-DIŞIdır ve gerekçesi title'da görünür (kalıcı kural)", () => {
    render(<PersonnelTabsStrip />);
    for (const label of ["Bordro", "SGK"]) {
      const tab = screen.getByRole("tab", { name: label });
      expect(tab).toHaveAttribute("aria-disabled", "true");
      expect(tab).toHaveAttribute("title", "Bu ekran henüz yazılmadı.");
      expect(tab.tagName).not.toBe("A");
    }
  });

  it("canlanan 'İzin Yönetimi' sekmesi gerekçe title'ı TAŞIMAZ (görünür gerekçe canonu)", () => {
    render(<PersonnelTabsStrip />);
    expect(screen.getByRole("tab", { name: "İzin Yönetimi" })).not.toHaveAttribute("title");
  });
});
