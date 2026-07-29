import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { DocumentsPlaceholderCard } from "./DocumentsPlaceholderCard";
import { pendingModuleLabel } from "@/lib/pending-modules";

describe("DocumentsPlaceholderCard (F11, P1.1b sınırı)", () => {
  it("dosya girişi render ETMEZ (kabul ediyormuş izlenimi yok)", () => {
    const { container } = render(<DocumentsPlaceholderCard />);
    expect(container.querySelector('input[type="file"]')).toBeNull();
    expect(container.querySelector("input")).toBeNull();
  });

  it("'Yükle'/'İçe Aktar' yerine gri 'Yakında' rozeti gösterir", () => {
    render(<DocumentsPlaceholderCard />);
    expect(screen.getAllByText("Yakında").length).toBeGreaterThan(0);
    expect(screen.queryByText("Yükle")).not.toBeInTheDocument();
    expect(screen.queryByText("İçe Aktar")).not.toBeInTheDocument();
  });

  it("kutular aria-disabled='true' ve 'yakında' başlığı taşır", () => {
    render(<DocumentsPlaceholderCard />);
    const boxes = screen.getAllByTitle("Belge yükleme yakında (P1.1b)");
    expect(boxes.length).toBeGreaterThanOrEqual(6);
    for (const box of boxes) {
      expect(box).toHaveAttribute("aria-disabled", "true");
    }
  });

  it("zorunluluk yıldızı (*) basılmaz — yüklenemeyen alan zorunlu gösterilmez", () => {
    render(<DocumentsPlaceholderCard />);
    expect(screen.getByText("İşveren Sözleşmesi").textContent).not.toContain("*");
    expect(screen.getByText("Poz Listesi (BOQ)").textContent).not.toContain("*");
  });

  it("başlık yanında 'yakında' notu gösterir", () => {
    render(<DocumentsPlaceholderCard />);
    expect(
      screen.getByText(/Belge yükleme yakında eklenecek/),
    ).toBeInTheDocument();
  });

  it("documents pending_module etiketi tanımlı", () => {
    expect(pendingModuleLabel("documents")).toBe("Belge modülüyle birlikte gelir");
  });
});
