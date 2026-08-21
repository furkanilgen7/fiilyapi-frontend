import { describe, it, expect } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

import { UnitFormTabs } from "./UnitFormTabs";
import { UNIT_FORM_TABS, unitFormTabsPendingReason } from "./routes";

/** Rotası HENÜZ yazılmamış sekmeler — liste sabit DEĞİL, tanımdan türer. */
const pendingLabels = UNIT_FORM_TABS.filter((tab) => tab.href === undefined).map(
  (tab) => tab.label,
);
/** Rotası YAZILMIŞ, ama bu ekranda aktif OLMAYAN sekmeler gerçek bağlantıdır. */
const routedTabs = UNIT_FORM_TABS.filter((tab) => tab.href !== undefined);

describe("UnitFormTabs — BE 47-53 / UE 49-55 / TU 47-53", () => {
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

  it("rotası YAZILMIŞ her sekme gerçek hedefine bağlıdır", () => {
    // Aktif sekme `<span>` olduğu için kapsam dışı bırakılır; geri kalanın
    // hepsi `href` taşır. Liste tanımdan TÜRER: yeni rota eklendiğinde bu
    // iddia onu kendiliğinden kapsar.
    render(<UnitFormTabs activeTab="Blok Ekle" />);
    for (const tab of routedTabs) {
      if (tab.label === "Blok Ekle") continue;
      expect(screen.getByRole("tab", { name: tab.label }), tab.label).toHaveAttribute(
        "href",
        tab.href,
      );
    }
  });

  it("TU 50 'Toplu Üretim' sekmesi GERÇEK rotaya bağlandı (F-UNIT2 T2a)", () => {
    render(<UnitFormTabs activeTab="Blok Ekle" />);
    const tab = screen.getByRole("tab", { name: "Toplu Üretim" });
    expect(tab).toHaveAttribute("href", "/satis/toplu-uretim");
    expect(tab).not.toHaveAttribute("aria-disabled");
  });

  it("EI 51 'Excel İçe Aktar' sekmesi GERÇEK rotaya bağlandı (F-UNIT2 T2b)", () => {
    render(<UnitFormTabs activeTab="Blok Ekle" />);
    const tab = screen.getByRole("tab", { name: "Excel İçe Aktar" });
    expect(tab).toHaveAttribute("href", "/satis/excel-ice-aktar");
    expect(tab).not.toHaveAttribute("aria-disabled");
  });

  it("EI 51 aktifken 'Excel İçe Aktar' KONUM bildirir (bağlantı değil)", () => {
    render(<UnitFormTabs activeTab="Excel İçe Aktar" />);
    const active = screen.getByRole("tab", { name: "Excel İçe Aktar" });
    expect(active).toHaveAttribute("aria-selected", "true");
    expect(active).not.toHaveAttribute("href");
  });

  it("TU 50 aktifken 'Toplu Üretim' KONUM bildirir (bağlantı değil)", () => {
    render(<UnitFormTabs activeTab="Toplu Üretim" />);
    const active = screen.getByRole("tab", { name: "Toplu Üretim" });
    expect(active).toHaveAttribute("aria-selected", "true");
    expect(active).not.toHaveAttribute("href");
  });
});

describe("UnitFormTabs — pending gerekçe BAYATLAMAZ", () => {
  it("rotasız sekmeler devre dışıdır ve gerekçe GÖRÜNÜR bir paragraftadır", () => {
    render(<UnitFormTabs activeTab="Blok Ekle" />);
    for (const label of pendingLabels) {
      expect(screen.getByRole("tab", { name: label }), label).toHaveAttribute(
        "aria-disabled",
        "true",
      );
    }
    const reason = unitFormTabsPendingReason();
    if (reason === null) {
      expect(screen.queryByTestId("unite-form-sekme-gerekce")).toBeNull();
      return;
    }
    // 🔴 Gerekçe `title`da SAKLANMAZ; ekranda metin olarak da bulunur.
    expect(screen.getByTestId("unite-form-sekme-gerekce")).toHaveTextContent(reason);
  });

  it("gerekçe CANLI sekmeyi ADIYLA saymaz — cümle kendiliğinden kısaldı", () => {
    // Donmuş cümle üç ekranı sayıyordu; "Toplu Üretim" canlıya geçince o
    // cümle YALAN olurdu. Gerekçe artık `href`i olmayan sekmelerden türediği
    // için canlı sekmenin adı içinde GEÇEMEZ.
    const reason = unitFormTabsPendingReason();
    for (const tab of routedTabs) {
      expect(reason ?? "", tab.label).not.toContain(tab.label);
    }
  });

  it("gerekçe paragrafı sekme tanımından TÜRER — hepsi rotalanınca KENDİLİĞİNDEN kalkar", () => {
    // `ProjectDetailTabs`in düzelttiği çürüme sınıfı: sabit basılan bir not,
    // sekmeler canlandıktan sonra ekranda onları YALANLAYARAK kalırdı. Bu
    // iddia bugün geçerli (rotasız sekme var) ve son sekme de yazıldığında
    // paragrafın kaybolduğunu ölçmek için burada durur.
    const hasPendingTab = pendingLabels.length > 0;
    render(<UnitFormTabs activeTab="Blok Ekle" />);
    expect(screen.queryByTestId("unite-form-sekme-gerekce") !== null).toBe(hasPendingTab);
    expect(unitFormTabsPendingReason() !== null).toBe(hasPendingTab);
    cleanup();
  });

  it("🔴 T2b sonrası gerekçe TEK sekmeye indi — cümle kendiliğinden kısaldı", () => {
    // "Excel İçe Aktar" rotaya bağlandığı anda gerekçeden DÜŞTÜ; geriye yalnız
    // "Paylaşım Girişi" kaldı ve cümle TEKİL yazıldı. Ayrı bir temizlik adımı
    // gerekmedi — bu, gerekçenin türev olmasının ÖLÇÜLEBİLİR sonucudur.
    expect(pendingLabels).toEqual(["Paylaşım Girişi"]);
    expect(unitFormTabsPendingReason()).toBe(
      "Paylaşım Girişi ekranı henüz açılmadı — bu sekme şimdilik tıklanamaz",
    );
  });

  it("boş kümede gerekçe `null`dur (sabit metin DÖNMEZ)", () => {
    expect(unitFormTabsPendingReason([{ label: "Blok Ekle", href: "/satis/blok-ekle" }])).toBeNull();
  });

  it("tek rotasız sekmede cümle TEKİL yazılır", () => {
    expect(unitFormTabsPendingReason([{ label: "Paylaşım Girişi" }])).toBe(
      "Paylaşım Girişi ekranı henüz açılmadı — bu sekme şimdilik tıklanamaz",
    );
  });
});
