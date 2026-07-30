import fs from "node:fs";
import path from "node:path";

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { SiteDocumentsCard } from "./SiteDocumentsCard";
import { SITE_DOCUMENTS } from "./document-items";
import { pendingModuleLabel } from "@/lib/pending-modules";

/** Yükleme kodunun kaynakta bile bulunmadığını kanıtlayan dosyalar (TZ-7). */
const UPLOAD_FREE_SOURCES = [
  path.resolve(__dirname, "SiteDocumentsCard.tsx"),
  path.resolve(__dirname, "document-items.ts"),
  path.resolve(__dirname, "../form-shell/DocumentsPlaceholderCard.tsx"),
];

describe("SiteDocumentsCard — yer tutucu (mockup 177–217)", () => {
  it("alti belge kutusu basar ve izgara uc sutundur", () => {
    const { container } = render(<SiteDocumentsCard />);
    const grid = container.querySelector(".pf-docs__grid");
    expect(grid).toHaveClass("pf-docs__grid--3");
    expect(grid?.children).toHaveLength(6);
    expect(SITE_DOCUMENTS).toHaveLength(6);
  });

  it("belge kutulari mockup basliklarini ve alt basliklarini birebir tasir", () => {
    render(<SiteDocumentsCard />);
    const expected: ReadonlyArray<[string, string]> = [
      ["Yapı Ruhsatı", "Belediye onaylı"],
      ["İSG Risk Değerlendirmesi", "Şantiye başlangıcında zorunlu"],
      ["Acil Durum Planı", "Tahliye ve müdahale planı"],
      ["Şantiye Yerleşim Planı", "Vaziyet planı, depo yerleşimi"],
      ["Zemin Etüt Raporu", "Jeoteknik rapor"],
      ["Başlangıç Fotoğrafları", "Arsa mevcut durumu"],
    ];
    for (const [title, subtitle] of expected) {
      expect(screen.getByText(title)).toBeInTheDocument();
      expect(screen.getByText(subtitle)).toBeInTheDocument();
    }
  });

  it("hicbir yerde input[type=file] YOK", () => {
    const { container } = render(<SiteDocumentsCard />);
    expect(container.querySelector('input[type="file"]')).toBeNull();
    expect(container.querySelector("input")).toBeNull();
  });

  it("hicbir kutuda onDrop/onDragOver isleyicisi YOK", () => {
    for (const file of UPLOAD_FREE_SOURCES) {
      const source = fs.readFileSync(file, "utf8");
      for (const banned of [
        "onDrop",
        "onDragOver",
        "onDragEnter",
        'type="file"',
        "FormData",
      ]) {
        expect(source).not.toContain(banned);
      }
    }
  });

  it("her kutu 'Yakinda' rozeti ve documents pendingModuleLabel title'i tasir", () => {
    const { container } = render(<SiteDocumentsCard />);
    // Altı kutu + sürükle-bırak alanı = yedi rozet
    expect(screen.getAllByText("Yakında")).toHaveLength(7);
    const boxes = container.querySelectorAll(".pf-doc");
    expect(boxes).toHaveLength(7);
    for (const box of boxes) {
      expect(box).toHaveAttribute("title", pendingModuleLabel("documents"));
    }
  });

  it("kutular aria-disabled=true tasir ve odak sirasinda degildir", () => {
    const { container } = render(<SiteDocumentsCard />);
    const boxes = container.querySelectorAll<HTMLElement>(".pf-doc");
    for (const box of boxes) {
      expect(box).toHaveAttribute("aria-disabled", "true");
      expect(box.tagName).toBe("DIV");
      expect(box.tabIndex).toBe(-1);
    }
  });

  it("mockup'taki zorunluluk yildizlari basilmaz", () => {
    const { container } = render(<SiteDocumentsCard />);
    expect(container.textContent).not.toContain("*");
    expect(container.querySelector(".pf-req")).toBeNull();
  });

  it("surukle-birak alani basar ama tiklanabilir degildir", () => {
    const { container } = render(<SiteDocumentsCard />);
    const drop = container.querySelector<HTMLElement>(".pf-doc--drop");
    expect(drop).not.toBeNull();
    expect(screen.getByText("Diğer şantiye belgelerini sürükleyin")).toBeInTheDocument();
    expect(
      screen.getByText("Sigorta poliçesi, çevre izni, hafriyat izni vb."),
    ).toBeInTheDocument();
    expect(drop?.tagName).toBe("DIV");
    expect(drop).toHaveAttribute("aria-disabled", "true");
    expect(drop?.querySelector("button, a, input")).toBeNull();
  });

  it("kart basliginda 'Belge modulu bekleniyor…' notu vardir", () => {
    render(<SiteDocumentsCard />);
    expect(
      screen.getByRole("heading", { name: /📎 Şantiye Belgeleri/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Belge modülü bekleniyor — şantiyeyi oluşturduktan sonra belgeleri yükleyebileceksiniz.",
      ),
    ).toBeInTheDocument();
  });

  it("ikon zeminleri token'dan gelir, ciplak hex degil", () => {
    for (const doc of SITE_DOCUMENTS) {
      expect(doc.iconBg).toMatch(/^var\(--color-/);
    }
  });
});
