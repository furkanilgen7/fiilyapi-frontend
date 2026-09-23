import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { SoldUnitCard } from "./SoldUnitCard";
import { emptySaleFormValues } from "./form-state";
import type { UnitBlockGroup, UnitResponse } from "@/lib/api/hooks/useProjectUnits";

/**
 * F-P8 · DS 55 "Blok / Ünite" seçicisi. Kanıtlanan ilke: seçici, SUNUCUNUN
 * REDDEDECEĞİ üniteyi seçtirmez. Kaynak backend korkulukları:
 *   • `ensure_unit_sellable` → `owner_side='landowner'` = 422
 *   • `ensure_no_open_sale` → ünitede açık satış kaydı varsa 409; ünitenin
 *     `sales_status`u (`sold`/`reserved`) o kaydın TÜREVİDİR.
 * İstemci kural UYDURMAZ, bu iki damgayı okur.
 */

function makeUnit(overrides: Partial<UnitResponse> = {}): UnitResponse {
  return {
    id: "u-bos",
    label: "A Blok · 3",
    layout: "4+1",
    sales_status: "listed",
    owner_side: "contractor",
    is_landowner_share: false,
    unit_cost: { available: false, value: null, pending_module: null },
    ...overrides,
  } as UnitResponse;
}

function renderCard(units: UnitResponse[]) {
  const blocks: UnitBlockGroup[] = [
    { block: { id: "blk-1", name: "A Blok" }, units } as unknown as UnitBlockGroup,
  ];
  render(
    <SoldUnitCard
      values={{ ...emptySaleFormValues(), projectId: "p-1" }}
      errors={{}}
      projects={[{ id: "p-1", name: "Villa B" }] as never}
      blocks={blocks}
      selectedUnit={null}
      projectsDisabled={false}
      unitsDisabled={false}
      unitsNotice={null}
      onChangeProject={vi.fn()}
      onChangeField={vi.fn()}
      locked={false}
      lockReason=""
    />,
  );
}

function optionFor(id: string): HTMLOptionElement {
  const select = screen.getByTestId("satis-form-unite") as HTMLSelectElement;
  const option = Array.from(select.options).find((candidate) => candidate.value === id);
  if (!option) throw new Error(`"${id}" için <option> basılmamış`);
  return option;
}

describe("SoldUnitCard — ünite seçicisi sunucunun damgalarını OKUR (DS 55)", () => {
  it("satışa açık ünite seçilebilir kalır", () => {
    renderCard([makeUnit()]);
    expect(optionFor("u-bos").disabled).toBe(false);
  });

  it("arsa sahibi payı ünite SEÇİLEMEZ (backend 422) ve gerekçesi etiketinde yazar", () => {
    renderCard([
      makeUnit({
        id: "u-arsa",
        label: "A Blok · 7",
        owner_side: "landowner",
        is_landowner_share: true,
      }),
    ]);
    const option = optionFor("u-arsa");
    expect(option.disabled).toBe(true);
    expect(option.textContent).toContain("Arsa sahibi payı");
  });

  it("satılmış ünite SEÇİLEMEZ (backend 409) ve gerekçesi etiketinde yazar", () => {
    renderCard([makeUnit({ id: "u-satildi", label: "A Blok · 8", sales_status: "sold" })]);
    const option = optionFor("u-satildi");
    expect(option.disabled).toBe(true);
    expect(option.textContent).toContain("Satıldı");
  });

  it("rezerve ünite SEÇİLEMEZ (açık satış kaydı vardır → 409)", () => {
    renderCard([makeUnit({ id: "u-rezerve", label: "A Blok · 9", sales_status: "reserved" })]);
    const option = optionFor("u-rezerve");
    expect(option.disabled).toBe(true);
    expect(option.textContent).toContain("Rezerve");
  });
});
