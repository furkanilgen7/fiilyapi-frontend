import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { EquipmentTabsStrip } from "./EquipmentTabsStrip";
import {
  EQUIPMENT_TAB_LEASE_SETTLEMENT_REASON,
  EQUIPMENT_TAB_MAINTENANCE_CALENDAR_REASON,
} from "./equipment-labels";

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

  it("K1 — 'Kira Hakedişi' ve 'Bakım Takvimi' DEVRE-DIŞIdır ve gerekçesi görünür", () => {
    render(<EquipmentTabsStrip />);

    const lease = screen.getByRole("tab", { name: "Kira Hakedişi" });
    expect(lease).toHaveAttribute("aria-disabled", "true");
    expect(lease).toHaveAttribute("title", EQUIPMENT_TAB_LEASE_SETTLEMENT_REASON);
    expect(lease.tagName).not.toBe("A");

    const maintenance = screen.getByRole("tab", { name: "Bakım Takvimi" });
    expect(maintenance).toHaveAttribute("aria-disabled", "true");
    expect(maintenance).toHaveAttribute("title", EQUIPMENT_TAB_MAINTENANCE_CALENDAR_REASON);
    expect(maintenance.tagName).not.toBe("A");
  });

  it("iki devre-dışı sekmenin gerekçesi FARKLIDIR (Kira Hakedişi ≠ Bakım Takvimi)", () => {
    expect(EQUIPMENT_TAB_LEASE_SETTLEMENT_REASON).not.toBe(
      EQUIPMENT_TAB_MAINTENANCE_CALENDAR_REASON,
    );
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
