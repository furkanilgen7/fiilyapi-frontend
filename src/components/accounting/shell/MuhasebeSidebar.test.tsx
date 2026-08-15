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
});

describe("🔴 devre dışı sekmeler: tıklanamaz + gerekçesi GÖRÜNÜR", () => {
  const CASES: readonly [string, string][] = [
    // MU-2 canlıda: Mizan/KDV backend'i hazır, eksik olan yalnız ekran.
    ["Mizan", "Mizan backend'i MU-2 ile canlıda; ekranı sonraki dilimde açılacak."],
    ["Banka Mutabakatı", "Banka Mutabakatı'nın backend ucu henüz yok."],
    ["e-Fatura", "e-Fatura/GİB entegrasyonu ertelendi (kullanıcı kararı)."],
    ["KDV Beyanı", "KDV Beyanı backend'i MU-2 ile canlıda; ekranı sonraki dilimde açılacak."],
  ];

  it("dördü de bağlantı DEĞİLDİR ve aria-disabled taşır", () => {
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
