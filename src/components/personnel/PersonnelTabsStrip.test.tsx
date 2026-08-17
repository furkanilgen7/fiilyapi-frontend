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

  // 🔴 F-BOR T5 · K8/K9 · İDDİA GÖÇÜ. Buradaki iki test eskiden "Bordro" ve
  // "SGK" sekmelerinin DEVRE-DIŞI olduğunu (aria-disabled + gerekçe title'ı +
  // `A` olmayan etiket) iddia ediyordu. O iddia SİLİNMEDİ, tersine ÇEVRİLEREK
  // taşındı: aynı iki sekme artık gerçek rotaya bağlanır.
  //
  // 🔴 Bu iddia GÖRSEL KAPIYLA DEĞİL, DOM'la kanıtlanır ve bu zorunluluktur:
  // devre-dışı sekme `--color-text-subtle` (#94a3b8), canlı sekme
  // `--color-text-muted` (#64748b) basar; ölçülmüş pixelmatch delta'sı 1120,
  // görsel kapının eşiği 1408.6 ⇒ KARE OYNAMAZ. Yüzeyin ölüden canlıya
  // geçtiğini yalnız `href` kanıtlayabilir.
  it("'Bordro' GERÇEK bir bağlantıdır (F-BOR T5 · K8)", () => {
    render(<PersonnelTabsStrip />);
    const tab = screen.getByRole("tab", { name: "Bordro" });
    expect(tab).toHaveAttribute("href", "/bordro");
    expect(tab.tagName).toBe("A");
  });

  it("'SGK' GERÇEK bir bağlantıdır (F-BOR T5 · K8)", () => {
    render(<PersonnelTabsStrip />);
    const tab = screen.getByRole("tab", { name: "SGK" });
    expect(tab).toHaveAttribute("href", "/bordro/sgk");
    expect(tab.tagName).toBe("A");
  });

  it("şeritte artık DEVRE-DIŞI sekme KALMADI (gerekçe title'ı da yok)", () => {
    render(<PersonnelTabsStrip />);
    for (const tab of screen.getAllByRole("tab")) {
      expect(tab).not.toHaveAttribute("aria-disabled");
      expect(tab).not.toHaveAttribute("title");
    }
  });
});
