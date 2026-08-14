import { describe, expect, it } from "vitest";

import type { EquipmentDetailResponse } from "@/lib/api/hooks/useEquipmentDetail";

import type { EquipmentFormValues } from "./form-state";
import {
  OMITTABLE_EQUIPMENT_FIELDS,
  OMITTABLE_FIELD_SOURCES,
  omittedEquipmentFields,
  type OmittableEquipmentField,
} from "./omit-fields";

/** Kapıya giren ALTI alanın hepsi `null` olan künye. */
const NULL_DETAIL: EquipmentDetailResponse = {
  id: "eq-1",
  name: "Tower Crane TC-48",
  category: "crane",
  brand: null,
  model: null,
  serial_no: null,
  plate_no: null,
  model_year: null,
  ownership: "owned",
  purchase_amount: null,
  purchase_date: null,
  depreciation_years: null,
  supplier_id: null,
  financing: null,
  market_value: null,
  rate_amount: null,
  rate_period: null,
  site_id: null,
  operator_id: null,
  status: "working",
  status_note: null,
  status_expected_date: null,
  fuel_type: null,
  norm_consumption: null,
  norm_unit: null,
  maintenance_period: null,
  monthly_capacity_hours: 200,
  is_company_asset: true,
  is_active: true,
  created_at: "2026-08-14T00:00:00Z",
};

/** Kapıya giren ALTI alanın hepsi DOLU olan künye. */
const FILLED_DETAIL: EquipmentDetailResponse = {
  ...NULL_DETAIL,
  depreciation_years: 15,
  financing: "leasing",
  rate_period: "monthly",
  fuel_type: "electric",
  norm_unit: "lt_km",
  maintenance_period: "hours_1000",
};

function touchedSet(...fields: (keyof EquipmentFormValues)[]) {
  return new Set<keyof EquipmentFormValues>(fields);
}

describe("OmittableEquipmentField — kapının kapsamı", () => {
  it("mockup'ta boş seçeneği OLMAYAN ve sunucuda nullable olan ALTI alanı kapsar", () => {
    // 🔴 Bu liste M2'den satır satır çıkarıldı; büyümesi/küçülmesi ancak
    // mockup ya da sunucu sözleşmesi değişirse meşrudur.
    expect([...OMITTABLE_EQUIPMENT_FIELDS].sort()).toEqual([
      "depreciation_years",
      "financing",
      "fuel_type",
      "maintenance_period",
      "norm_unit",
      "rate_period",
    ]);
  });

  it("sunucuda NOT NULL olan seçicileri (category/status/ownership) KAPSAMAZ", () => {
    // Ezilecek bir `null` yoktur; kapıya alınsalardı ölü kod yolu doğardı.
    const covered: readonly string[] = OMITTABLE_EQUIPMENT_FIELDS;
    expect(covered).not.toContain("category");
    expect(covered).not.toContain("status");
    expect(covered).not.toContain("ownership");
  });

  it("boş seçeneği OLAN seçicileri (site_id/supplier_id/operator_id) KAPSAMAZ", () => {
    const covered: readonly string[] = OMITTABLE_EQUIPMENT_FIELDS;
    expect(covered).not.toContain("site_id");
    expect(covered).not.toContain("supplier_id");
    expect(covered).not.toContain("operator_id");
  });

  it("her sunucu anahtarının BİR form alanı karşılığı vardır", () => {
    for (const field of OMITTABLE_EQUIPMENT_FIELDS) {
      expect(OMITTABLE_FIELD_SOURCES[field]).toBeTruthy();
    }
  });
});

describe("omittedEquipmentFields — K5 dört durum", () => {
  it("1) sunucu null + DOKUNULMAMIŞ → alanın hepsi ATLANIR", () => {
    expect([...omittedEquipmentFields(NULL_DETAIL, touchedSet())].sort()).toEqual([
      "depreciation_years",
      "financing",
      "fuel_type",
      "maintenance_period",
      "norm_unit",
      "rate_period",
    ]);
  });

  it("2) sunucu null + DOKUNULMUŞ → o alan ATLANMAZ (kullanıcının kararı gider)", () => {
    for (const field of OMITTABLE_EQUIPMENT_FIELDS) {
      const omitted = omittedEquipmentFields(
        NULL_DETAIL,
        touchedSet(OMITTABLE_FIELD_SOURCES[field]),
      );
      expect(omitted).not.toContain(field);
      // Diğer beşi ATLANMAYA devam eder — dokunma alan bazlıdır.
      expect(omitted).toHaveLength(OMITTABLE_EQUIPMENT_FIELDS.length - 1);
    }
  });

  it("3) sunucu DOLU + dokunulmamış → hiçbir alan ATLANMAZ (gerileme koruması)", () => {
    expect(omittedEquipmentFields(FILLED_DETAIL, touchedSet())).toEqual([]);
  });

  it("4) oluşturma kipi (künye YOK) → hiçbir alan atlanmaz", () => {
    expect(omittedEquipmentFields(undefined, touchedSet())).toEqual([]);
  });

  it("tek alanı null olan künyede YALNIZ o alan atlanır", () => {
    const detail = { ...FILLED_DETAIL, fuel_type: null };
    expect(omittedEquipmentFields(detail, touchedSet())).toEqual(["fuel_type"]);
  });

  it("dönen dizi `OmittableEquipmentField` birleşimindedir (tip kilidi)", () => {
    const omitted: readonly OmittableEquipmentField[] = omittedEquipmentFields(
      NULL_DETAIL,
      touchedSet(),
    );
    expect(omitted.length).toBeGreaterThan(0);
  });
});
