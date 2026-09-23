import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { EquipmentRentalCard } from "./EquipmentRentalCard";
import type { EquipmentResponse } from "@/lib/api/hooks/useEquipment";
import type { EquipmentRentalTotals } from "@/lib/api/hooks/useEquipmentDetailScreen";

/**
 * kalan-4 · #182 — tedarikçi sorgusunun HATA hâli yoktu.
 *
 * `GET /suppliers/{supplier_id}` `procurement:view` ister; ekranın kapısı
 * yalnız `equipment`tır. `equipment:view` + `procurement:none` olan bir
 * kullanıcıda bu uç 403 döner ve `supplierName` SONSUZA KADAR `undefined`
 * kalır (react-query hata sonrası `data`yı geri getirmez) — kart kalıcı
 * "Yükleniyor…" basardı.
 */

const EQUIPMENT: EquipmentResponse = {
  id: "eq-1",
  name: "Tower Crane TC-48",
  category: "crane",
  brand: "Liebherr",
  model: "154 EC-H",
  serial_no: "LBH-2022-8842",
  plate_no: null,
  model_year: 2022,
  ownership: "rented",
  purchase_amount: null,
  purchase_date: null,
  depreciation_years: null,
  supplier_id: "sup-1",
  financing: null,
  market_value: null,
  rate_amount: "8500.00",
  rate_period: "daily",
  site_id: "site-1",
  operator_id: null,
  status: "working",
  status_note: null,
  status_expected_date: null,
  fuel_type: "diesel",
  norm_consumption: "4.20",
  norm_unit: "lt_hour",
  maintenance_period: "hours_500",
  monthly_capacity_hours: 200,
  engine_power_kw: "45.00",
  capacity_description: "8 Ton",
  hourmeter_hours: "14286.00",
  rental_contract_no: "LT-KRA-2026-004",
  rental_start_date: "2026-03-01",
  rental_end_date: "2026-12-31",
  rental_min_monthly_hours: 160,
  rental_payment_terms: "Aylık",
  last_service_date: "2026-05-18",
  last_service_hourmeter: "14000.00",
  is_company_asset: false,
  is_active: true,
  created_at: "2026-01-05T08:00:00Z",
};

const RENTAL: EquipmentRentalTotals = {
  cumulative_paid: "284160.00",
  cumulative_paid_unknown_count: 0,
  paid_invoice_count: 3,
};

describe("EquipmentRentalCard — tedarikçi sorgusu hata hâli (kalan-4 #182)", () => {
  it("supplierName pending (undefined) iken 'Yükleniyor…' basar", () => {
    render(
      <EquipmentRentalCard equipment={EQUIPMENT} rental={RENTAL} supplierName={undefined} />,
    );
    expect(screen.getByTestId("makine-det-supplier")).toHaveTextContent("Yükleniyor…");
  });

  it("tedarikçi sorgusu HATA verince kalıcı 'Yükleniyor…' BASILMAZ", () => {
    render(
      <EquipmentRentalCard
        equipment={EQUIPMENT}
        rental={RENTAL}
        supplierName={undefined}
        supplierIsError
      />,
    );
    expect(screen.getByTestId("makine-det-supplier")).not.toHaveTextContent("Yükleniyor…");
  });
});
