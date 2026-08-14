import { describe, it, expect } from "vitest";
import { EQUIPMENT_CATEGORY_ICONS, equipmentCategoryIcon } from "./category-icon";
import type { EquipmentCategory } from "@/lib/api/hooks/useEquipment";

// K11 — altı kategorinin hepsi bir emojiye eşlenmeli, boşluk kalmamalı.
const ALL_CATEGORIES: EquipmentCategory[] = [
  "crane",
  "machinery",
  "truck",
  "concrete",
  "compressor",
  "hand_tool",
];

describe("equipmentCategoryIcon", () => {
  it.each(ALL_CATEGORIES)("%s kategorisi için bir emoji döner", (category) => {
    const icon = equipmentCategoryIcon(category);
    expect(typeof icon).toBe("string");
    expect(icon.length).toBeGreaterThan(0);
  });

  it("haritada altı kategorinin hepsi tanımlıdır", () => {
    expect(Object.keys(EQUIPMENT_CATEGORY_ICONS).sort()).toEqual(
      [...ALL_CATEGORIES].sort(),
    );
  });

  it("mockup emojileriyle birebir eşleşir (Makine & Ekipman.dc.html)", () => {
    expect(EQUIPMENT_CATEGORY_ICONS.crane).toBe("🏗");
    expect(EQUIPMENT_CATEGORY_ICONS.machinery).toBe("🚜");
    expect(EQUIPMENT_CATEGORY_ICONS.concrete).toBe("🔧");
    expect(EQUIPMENT_CATEGORY_ICONS.truck).toBe("🚛");
    expect(EQUIPMENT_CATEGORY_ICONS.hand_tool).toBe("⚙️");
    expect(EQUIPMENT_CATEGORY_ICONS.compressor).toBe("🏭");
  });
});
