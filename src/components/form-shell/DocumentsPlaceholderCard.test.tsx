import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import {
  DocumentsPlaceholderCard,
  type DocumentPlaceholderItem,
} from "./DocumentsPlaceholderCard";
import { pendingModuleLabel } from "@/lib/pending-modules";

const ITEMS: readonly DocumentPlaceholderItem[] = [
  { emoji: "📄", iconBg: "var(--color-danger-soft)", title: "Belge A", subtitle: "Alt A" },
  { emoji: "📊", iconBg: "var(--color-success-soft)", title: "Belge B", subtitle: "Alt B" },
  { emoji: "🏛", iconBg: "var(--color-warning-soft)", title: "Belge C", subtitle: "Alt C" },
];

const SOON = "Belge yükleme yakında";

function renderCard(
  props: Partial<React.ComponentProps<typeof DocumentsPlaceholderCard>> = {},
) {
  return render(
    <DocumentsPlaceholderCard
      title="📎 Belgeler"
      note="Belge modülü bekleniyor."
      items={ITEMS}
      dropTitle="Diğer belgeleri sürükleyin"
      dropSubtitle="Poliçe, izin vb."
      soonTitle={SOON}
      {...props}
    />,
  );
}

describe("DocumentsPlaceholderCard (paylaşılan yer tutucu)", () => {
  it("columns verilmezse iki sütun kalır", () => {
    const { container } = renderCard();
    const grid = container.querySelector(".pf-docs__grid");
    expect(grid).not.toBeNull();
    expect(grid).not.toHaveClass("pf-docs__grid--3");
  });

  it("columns=3 verildiğinde ızgara üçlüye geçer", () => {
    const { container } = renderCard({ columns: 3 });
    expect(container.querySelector(".pf-docs__grid")).toHaveClass(
      "pf-docs__grid--3",
    );
  });

  it("items prop'undaki her kalem için bir kutu basılır", () => {
    const { container } = renderCard();
    expect(container.querySelectorAll(".pf-docs__grid .pf-doc")).toHaveLength(
      ITEMS.length,
    );
    for (const item of ITEMS) {
      expect(screen.getByText(item.title)).toBeInTheDocument();
      expect(screen.getByText(item.subtitle)).toBeInTheDocument();
    }
  });

  it("hiçbir kutuda input[type=file] yok", () => {
    const { container } = renderCard();
    expect(container.querySelector('input[type="file"]')).toBeNull();
    expect(container.querySelector("input")).toBeNull();
  });

  it("başlığı ve notu prop'tan basar", () => {
    renderCard({ title: "📎 Şantiye Belgeleri", note: "Belge modülü bekleniyor." });
    expect(screen.getByText("📎 Şantiye Belgeleri")).toBeInTheDocument();
    expect(screen.getByText("Belge modülü bekleniyor.")).toBeInTheDocument();
  });

  it("sürükle-bırak metinlerini prop'tan basar ve yükleme işleyicisi taşımaz", () => {
    const { container } = renderCard();
    expect(screen.getByText("Diğer belgeleri sürükleyin")).toBeInTheDocument();
    expect(screen.getByText("Poliçe, izin vb.")).toBeInTheDocument();
    expect(container.querySelector(".pf-doc--drop")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("kutular aria-disabled ve soonTitle başlığı taşır", () => {
    renderCard();
    const boxes = screen.getAllByTitle(SOON);
    expect(boxes.length).toBe(ITEMS.length + 1); // kalemler + sürükle-bırak
    for (const box of boxes) {
      expect(box).toHaveAttribute("aria-disabled", "true");
    }
  });

  it("'Yükle'/'İçe Aktar' yerine gri 'Yakında' rozeti gösterir", () => {
    renderCard();
    expect(screen.getAllByText("Yakında").length).toBe(ITEMS.length + 1);
    expect(screen.queryByText("Yükle")).not.toBeInTheDocument();
    expect(screen.queryByText("İçe Aktar")).not.toBeInTheDocument();
  });

  it("zorunluluk yıldızı (*) basılmaz — yüklenemeyen alan zorunlu gösterilmez", () => {
    renderCard();
    for (const item of ITEMS) {
      expect(screen.getByText(item.title).textContent).not.toContain("*");
    }
  });

  it("documents pending_module etiketi tanımlı", () => {
    expect(pendingModuleLabel("documents")).toBe("Belge modülüyle birlikte gelir");
  });
});
