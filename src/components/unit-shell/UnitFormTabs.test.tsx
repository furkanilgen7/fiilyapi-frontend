import { describe, it, expect } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

import { UnitFormTabs } from "./UnitFormTabs";
import { UNIT_FORM_TABS, UNIT_FORM_TABS_PENDING_REASON } from "./routes";

describe("UnitFormTabs — BE 47-53 / UE 49-55", () => {
  it("beş sekme basar ve SIRA mockup'tan gelir", () => {
    render(<UnitFormTabs activeTab="Blok Ekle" />);
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "Blok Ekle",
      "Ünite Ekle",
      "Toplu Üretim",
      "Excel İçe Aktar",
      "Paylaşım Girişi",
    ]);
  });

  it("aktif sekme <a> DEĞİLDİR — gezinme değil KONUM bildirir (mockup `.tab-on` bir <span>)", () => {
    render(<UnitFormTabs activeTab="Ünite Ekle" />);
    const active = screen.getByRole("tab", { name: "Ünite Ekle" });
    expect(active).toHaveAttribute("aria-selected", "true");
    expect(active).not.toHaveAttribute("href");
    // Aktif olmayan gerçek sekme GERÇEK bağlantıdır.
    expect(screen.getByRole("tab", { name: "Blok Ekle" })).toHaveAttribute(
      "href",
      "/satis/blok-ekle",
    );
  });
});

describe("UnitFormTabs — pending gerekçe BAYATLAMAZ", () => {
  it("rotasız sekmeler devre dışıdır ve gerekçe GÖRÜNÜR bir paragraftadır", () => {
    render(<UnitFormTabs activeTab="Blok Ekle" />);
    for (const label of ["Toplu Üretim", "Excel İçe Aktar", "Paylaşım Girişi"]) {
      expect(screen.getByRole("tab", { name: label }), label).toHaveAttribute(
        "aria-disabled",
        "true",
      );
    }
    // 🔴 Gerekçe `title`da SAKLANMAZ; ekranda metin olarak da bulunur.
    expect(screen.getByTestId("unite-form-sekme-gerekce")).toHaveTextContent(
      UNIT_FORM_TABS_PENDING_REASON,
    );
  });

  it("gerekçe paragrafı sekme tanımından TÜRER — hepsi rotalanınca KENDİLİĞİNDEN kalkar", () => {
    // `ProjectDetailTabs`in düzelttiği çürüme sınıfı: sabit basılan bir not,
    // sekmeler canlandıktan sonra ekranda onları YALANLAYARAK kalırdı. Bu
    // iddia bugün geçerli (rotasız sekme var) ve F-UNIT2 üçünü de yazdığında
    // paragrafın kaybolduğunu ölçmek için burada durur.
    const hasPendingTab = UNIT_FORM_TABS.some((tab) => tab.href === undefined);
    render(<UnitFormTabs activeTab="Blok Ekle" />);
    expect(screen.queryByTestId("unite-form-sekme-gerekce") !== null).toBe(hasPendingTab);
    cleanup();
  });
});
