import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { EquipmentFuelLogTable } from "./EquipmentFuelLogTable";

function baseProps() {
  return {
    year: 2026,
    month: 9,
    onShiftMonth: vi.fn(),
    equipmentId: "",
    onEquipmentChange: vi.fn(),
    equipment: undefined,
    logs: undefined,
    isLoading: false,
    resolveSiteLabel: vi.fn(),
    resolveEnteredByName: vi.fn(),
  };
}

describe("EquipmentFuelLogTable — sorgu hatası", () => {
  it("🔴 isError=true iken panel BOŞ KALMAZ, bir hata notu gösterir", () => {
    render(<EquipmentFuelLogTable {...baseProps()} isError />);

    expect(screen.queryByTestId("makine-yakit-log-empty")).not.toBeInTheDocument();
    expect(screen.getByTestId("makine-yakit-log-error")).toBeInTheDocument();
  });
});
