import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { MuhasebeSidebar } from "./MuhasebeSidebar";

const pathname = vi.hoisted(() => ({ current: "/muhasebe" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));

function renderAt(path: string) {
  pathname.current = path;
  return render(<MuhasebeSidebar />);
}

describe("MuhasebeSidebar — HP:28-38", () => {
  it("grup başlığı ve üst öğe basılır (HP:29-30)", () => {
    renderAt("/muhasebe");
    expect(screen.getByText("Sözleşme & Mali")).toBeInTheDocument();
    expect(screen.getByTestId("mu-nav-parent")).toHaveTextContent("Muhasebe");
  });

  it("🔴 üst öğe BAĞLANTI DEĞİLDİR (kökte çift aktiflik doğururdu)", () => {
    renderAt("/muhasebe");
    expect(screen.getByTestId("mu-nav-parent").tagName).not.toBe("A");
  });

  it("altı alt sekmenin hepsi EKRANDA görünür (silinmez)", () => {
    renderAt("/muhasebe");
    for (const label of [
      "Yevmiye Defteri",
      "Hesap Planı",
      "Mizan",
      "Banka Mutabakatı",
      "e-Fatura",
      "KDV Beyanı",
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });
});

describe("🔴 çift aktiflik bekçisi (F-SD T7 dersi)", () => {
  it("`/muhasebe/hesap-plani`de aria-current TEK öğededir", () => {
    renderAt("/muhasebe/hesap-plani");
    const current = screen.getAllByRole("link").filter((el) => el.getAttribute("aria-current"));
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent("Hesap Planı");
  });

  it("`/muhasebe` kökünde aria-current TEK öğededir", () => {
    renderAt("/muhasebe");
    const current = screen.getAllByRole("link").filter((el) => el.getAttribute("aria-current"));
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent("Yevmiye Defteri");
  });

  // 🔴 F-MU2: iki yeni yol da bekçiye alındı — kök `exact` olmasaydı burada
  // İKİ öğe birden yanardı.
  it("`/muhasebe/mizan`de aria-current TEK öğededir", () => {
    renderAt("/muhasebe/mizan");
    const current = screen.getAllByRole("link").filter((el) => el.getAttribute("aria-current"));
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent("Mizan");
  });

  it("`/muhasebe/kdv-beyani`de aria-current TEK öğededir", () => {
    renderAt("/muhasebe/kdv-beyani");
    const current = screen.getAllByRole("link").filter((el) => el.getAttribute("aria-current"));
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent("KDV Beyanı");
  });
});

describe("🔴 devre dışı sekmeler: tıklanamaz + gerekçesi GÖRÜNÜR", () => {
  // 🔴 F-MU2: Mizan ve KDV Beyanı artık BAĞLANTIDIR (ekranları açıldı);
  // liste 4 → 2 girdiye indi. İddia silinmedi, yeni gerçeğe taşındı.
  const CASES: readonly [string, string][] = [
    ["Banka Mutabakatı", "Banka Mutabakatı'nın backend ucu henüz yok."],
    ["e-Fatura", "e-Fatura/GİB entegrasyonu ertelendi (kullanıcı kararı)."],
  ];

  it("ikisi de bağlantı DEĞİLDİR ve aria-disabled taşır", () => {
    renderAt("/muhasebe");
    for (const [label] of CASES) {
      expect(screen.queryByRole("link", { name: new RegExp(label) })).toBeNull();
      expect(screen.getByText(label).closest("[aria-disabled]")).not.toBeNull();
    }
  });

  it("gerekçe METİN olarak basılır — `title` içinde SAKLANMAZ", () => {
    const { container } = renderAt("/muhasebe");
    for (const [, reason] of CASES) {
      expect(screen.getByText(reason)).toBeInTheDocument();
    }
    // Kanon: gerekçe `title` özniteliğine gizlenemez (ekran okuyucu ve göz
    // için görünür olmalı).
    expect(container.querySelectorAll("[title]")).toHaveLength(0);
  });
});
