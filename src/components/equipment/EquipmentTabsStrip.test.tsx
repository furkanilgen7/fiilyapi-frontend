import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { EquipmentTabsStrip } from "./EquipmentTabsStrip";
import { EQUIPMENT_TAB_MAINTENANCE_CALENDAR_REASON } from "./equipment-labels";

describe("EquipmentTabsStrip", () => {
  it("'Ekipman Listesi' varsayılan aktif sekmedir", () => {
    render(<EquipmentTabsStrip />);
    const active = screen.getByRole("tab", { name: "Ekipman Listesi" });
    expect(active).toHaveAttribute("aria-selected", "true");
  });

  it("'Çalışma Kaydı' ve 'Yakıt Takibi' GERÇEK bağlantılardır (spec §1 rota tablosu)", () => {
    render(<EquipmentTabsStrip />);
    expect(screen.getByRole("tab", { name: "Çalışma Kaydı" })).toHaveAttribute(
      "href",
      "/makine/calisma",
    );
    expect(screen.getByRole("tab", { name: "Yakıt Takibi" })).toHaveAttribute(
      "href",
      "/makine/yakit",
    );
  });

  /* 🔴 F-KIRA — BIR YUZEYIN OLUDEN CANLIYA GECTIGINI GORSEL KAPI KANITLAMAZ.
   * Sekme devre-disi `<span>`den `<a href>`e gecti ama rengi
   * `--color-text-subtle` -> `--color-text-muted` degisimidir ve pixelmatch
   * esigi (`threshold: 0.2` -> 35215 * 0.2^2 = 1408.6) o gecisin YIQ delta'sini
   * (1120) ASMAZ -> kare OYNAMAZ (F-IZN dersi, aritmetikle kanitlandi).
   * Kanit bu yuzden DOM'dan alinir. */
  it("F-KIRA — 'Kira Hakedişi' CANLI bir bağlantıdır (`/makine/kira`)", () => {
    render(<EquipmentTabsStrip />);
    const lease = screen.getByRole("tab", { name: "Kira Hakedişi" });
    expect(lease).toHaveAttribute("href", "/makine/kira");
    expect(lease.tagName).toBe("A");
    expect(lease).not.toHaveAttribute("aria-disabled", "true");
  });

  it("K1 — YALNIZ 'Bakım Takvimi' DEVRE-DIŞIdır ve gerekçesi görünür", () => {
    render(<EquipmentTabsStrip />);

    const maintenance = screen.getByRole("tab", { name: "Bakım Takvimi" });
    expect(maintenance).toHaveAttribute("aria-disabled", "true");
    expect(maintenance).toHaveAttribute("title", EQUIPMENT_TAB_MAINTENANCE_CALENDAR_REASON);
    expect(maintenance.tagName).not.toBe("A");
  });

  it("K1 — kalan gerekçe EKRANDA GÖRÜNÜR metindir (yalnız `title` YETMEZ)", () => {
    render(<EquipmentTabsStrip />);
    // `title` imleç bekletmeden okunamaz; spec K1 "görünür Türkçe gerekçe" der.
    // Bu iddia bir metin düğümü arar, öznitelik DEĞİL.
    expect(
      screen.getByText(EQUIPMENT_TAB_MAINTENANCE_CALENDAR_REASON, { exact: false }),
    ).toBeVisible();
  });

  /* 🔴 F-PRJTAB kanonu: GORUNUR GEREKCE, ACIKLADIGI OGEDEN TURETILIR.
   * Gerekce paragrafi `TABS`ten turer; "Kira Hakedisi" href kazandigi anda
   * cumlesi de dusmelidir. Sabit basilsaydi ekranda kalir ve ARTIK CALISAN
   * bir sekmeyi yalanlardi — rota bekcileri `href` denetler, METNI denetlemez. */
  it("F-KIRA — düşen sekmenin gerekçesi paragraftan da KALKAR (metin çürümesi bekçisi)", () => {
    render(<EquipmentTabsStrip />);
    const reasons = screen.getByTestId("makine-tabs-reasons");
    expect(reasons).toHaveTextContent(EQUIPMENT_TAB_MAINTENANCE_CALENDAR_REASON);
    expect(reasons.textContent).not.toMatch(/[Kk]ira hakedişi/);
  });

  it("aktif sekme başka bir aktivite ile geçilebilir (T3/T4 aynı bileşeni paylaşır)", () => {
    render(<EquipmentTabsStrip activeTab="Çalışma Kaydı" />);
    const active = screen.getByRole("tab", { name: "Çalışma Kaydı" });
    expect(active).toHaveAttribute("aria-selected", "true");
    expect(active.tagName).not.toBe("A");
    expect(screen.getByRole("tab", { name: "Ekipman Listesi" })).toHaveAttribute(
      "href",
      "/makine",
    );
  });
});
