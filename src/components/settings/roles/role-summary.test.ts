import { describe, it, expect } from "vitest";
import { roleModuleSummary } from "./role-summary";
import type { PermissionCell, ModuleResponse } from "@/lib/api/models";

const modules: ModuleResponse[] = [
  { id: "1", key: "dashboard", name: "Gösterge Paneli", group: "GENEL", sort_order: 1 },
  { id: "2", key: "inventory", name: "Stok & Depo", group: "STOK_SATINALMA", sort_order: 1 },
] as ModuleResponse[];

describe("roleModuleSummary", () => {
  it("tüm modüllere tam erişimde 'Tüm modüller' özetler", () => {
    const cells: PermissionCell[] = [
      { module_key: "dashboard", access_level: "full", scope: "all" },
      { module_key: "inventory", access_level: "full", scope: "all" },
    ];
    expect(roleModuleSummary(cells, modules)).toBe("Tüm modüller");
  });
  it("kısmi erişimde erişilen modül adlarını listeler", () => {
    const cells: PermissionCell[] = [
      { module_key: "dashboard", access_level: "view", scope: "all" },
      { module_key: "inventory", access_level: "none", scope: "all" },
    ];
    expect(roleModuleSummary(cells, modules)).toBe("Gösterge Paneli");
  });
  it("hiç erişim yoksa 'Erişim yok' döner", () => {
    const cells: PermissionCell[] = [
      { module_key: "dashboard", access_level: "none", scope: "all" },
      { module_key: "inventory", access_level: "none", scope: "all" },
    ];
    expect(roleModuleSummary(cells, modules)).toBe("Erişim yok");
  });
});
