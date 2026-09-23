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
    resolveEquipmentName: vi.fn(),
  };
}

describe("EquipmentFuelLogTable — sorgu hatası", () => {
  it("🔴 isError=true iken panel BOŞ KALMAZ, bir hata notu gösterir", () => {
    render(<EquipmentFuelLogTable {...baseProps()} isError />);

    expect(screen.queryByTestId("makine-yakit-log-empty")).not.toBeInTheDocument();
    expect(screen.getByTestId("makine-yakit-log-error")).toBeInTheDocument();
  });
});

function oneLog() {
  return {
    items: [
      {
        id: "l-1",
        equipment_id: "e-1",
        fuel_date: "2026-09-10",
        site_id: null,
        liters: "10.00",
        unit_price: "45.0000",
        amount: "450.00",
        entered_by_id: null,
      },
    ],
    limit: 50,
    offset: 0,
    total: 1,
  };
}

describe("KAYIT 90 — ekipman adı çözümü isLoading/isError ayrımı yapar", () => {
  it("resolveEquipmentName undefined dönerse 'Yükleniyor…' basar", () => {
    render(
      <EquipmentFuelLogTable
        {...baseProps()}
        logs={oneLog() as never}
        resolveSiteLabel={() => null}
        resolveEnteredByName={() => null}
        resolveEquipmentName={() => undefined}
      />,
    );
    expect(screen.getAllByText("Yükleniyor…")).toHaveLength(1);
  });

  it("resolveEquipmentName null dönerse (yüklendi ama bulunamadı) KALICI 'Yükleniyor…' basmaz", () => {
    render(
      <EquipmentFuelLogTable
        {...baseProps()}
        logs={oneLog() as never}
        resolveSiteLabel={() => null}
        resolveEnteredByName={() => null}
        resolveEquipmentName={() => null}
      />,
    );
    expect(screen.queryByText("Yükleniyor…")).not.toBeInTheDocument();
  });
});
