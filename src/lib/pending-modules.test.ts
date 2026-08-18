import { describe, it, expect } from "vitest";

import { pendingModuleLabel } from "./pending-modules";

describe("pendingModuleLabel", () => {
  it("F6 anahtarlarini esler", () => {
    expect(pendingModuleLabel("progress_payments")).toBe("Hakediş modülüyle birlikte gelir");
    expect(pendingModuleLabel("invoicing")).toBe("Fatura yönetimiyle birlikte gelir");
    expect(pendingModuleLabel("approvals")).toBe("Onay kutusuyla birlikte gelir");
    expect(pendingModuleLabel("inventory")).toBe("Stok ve saha modülleriyle birlikte gelir");
  });

  it("P1 anahtarlarini esler", () => {
    expect(pendingModuleLabel("timesheet")).toBe("Puantaj modülüyle birlikte gelir");
    expect(pendingModuleLabel("subcontracts")).toBe("Taşeron sözleşmeleriyle birlikte gelir");
    expect(pendingModuleLabel("units")).toBe("Ünite satış modülüyle birlikte gelir");
    expect(pendingModuleLabel("project_costs")).toBe("Maliyet takibiyle birlikte gelir");
  });

  it("P2 anahtarlarini esler", () => {
    expect(pendingModuleLabel("contracts")).toBe("Sözleşme modülüyle birlikte gelir");
    expect(pendingModuleLabel("boq")).toBe("İş kalemleri modülüyle birlikte gelir");
    expect(pendingModuleLabel("stock")).toBe("Stok modülüyle birlikte gelir");
    expect(pendingModuleLabel("documents")).toBe("Belge modülüyle birlikte gelir");
    expect(pendingModuleLabel("site_diary")).toBe("Şantiye günlüğüyle birlikte gelir");
  });

  it("F-TH T2 anahtarlarini esler", () => {
    expect(pendingModuleLabel("work_category")).toBe("İş kategorisi alanıyla birlikte gelir");
    expect(pendingModuleLabel("vat")).toBe("KDV hesaplamasıyla birlikte gelir");
    expect(pendingModuleLabel("progress")).toBe("İlerleme takibiyle birlikte gelir");
  });

  it("F-TH T5 fix round 1 anahtarini esler (bolum adi cozumlemesi)", () => {
    expect(pendingModuleLabel("section_name")).toBe("Bölüm adı çözümlemesiyle birlikte gelir");
  });

  // F-ST T3: canli sunucunun stok anahtarlari (`inventory/service.py`).
  it("F-ST anahtarlarini esler (purchasing + site_planning)", () => {
    expect(pendingModuleLabel("purchasing")).toBe("Satınalma modülüyle birlikte gelir");
    expect(pendingModuleLabel("site_planning")).toBe("Şantiye planlama türeviyle birlikte gelir");
  });

  // 🔴 F-BOLLINK: bölüm detayına özel anahtarlar. Metin "modül yok" DEMEZ —
  // beş modülün de şantiye seviyesinde yazılı rotası var, eksik olan bölüm bağı.
  // 🔴 BOQ-SEC-F GÖÇÜ: `section_boq` listeden ÇIKARILDI — o bağ artık AÇIK,
  // sekme gerçek tablo basıyor. Anahtarın YOKLUĞU ayrıca çakılır (aşağıda).
  it("F-BOLLINK bolum anahtarlarini esler ve 'modulle birlikte gelir' DEMEZ", () => {
    const keys = [
      "section_timesheet",
      "section_stock",
      "section_progress_payments",
      "section_site_diary",
    ];
    for (const key of keys) {
      const label = pendingModuleLabel(key);
      expect(label).not.toBe("İlgili modülle birlikte gelir");
      expect(label).not.toMatch(/modülüyle birlikte gelir/);
    }
  });

  // BOQ-SEC-F bekçisi: anahtar geri gelirse birileri canlı sekmeye yeniden
  // "henüz bağlanamıyor" gerekçesi bağlamış demektir — bu test o çürümeyi
  // yakalar. (Yedek metne düşmesi, eşlenmemiş olmasının kanıtıdır.)
  it("section_boq anahtari ARTIK YOK - bolum bagi acildi", () => {
    expect(pendingModuleLabel("section_boq")).toBe("İlgili modülle birlikte gelir");
  });

  // Paylasilan anahtarlarin metni DEGISMEDI (baska ekranlar okuyor).
  it("paylasilan anahtarlarin metni F-BOLLINK'te degismedi", () => {
    expect(pendingModuleLabel("boq")).toBe("İş kalemleri modülüyle birlikte gelir");
    expect(pendingModuleLabel("stock")).toBe("Stok modülüyle birlikte gelir");
    expect(pendingModuleLabel("timesheet")).toBe("Puantaj modülüyle birlikte gelir");
  });

  it("bilinmeyen anahtarda genel metin doner", () => {
    expect(pendingModuleLabel("bilinmeyen")).toBe("İlgili modülle birlikte gelir");
  });

  // P10 devri: `app__modules__projects__schemas__MetricPlaceholder.pending_module`
  // artik `string | null` (ve zorunlu degil). Anahtar yoksa da genel metne dusulur.
  it("null/undefined anahtarda genel metne duser", () => {
    expect(pendingModuleLabel(null)).toBe("İlgili modülle birlikte gelir");
    expect(pendingModuleLabel(undefined)).toBe("İlgili modülle birlikte gelir");
  });
});
