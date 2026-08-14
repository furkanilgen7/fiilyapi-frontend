import { describe, expect, it } from "vitest";

import {
  buildEquipmentCreateBody,
  buildEquipmentUpdateBody,
  submittableEquipmentValues,
  DEFAULT_MONTHLY_CAPACITY_HOURS,
} from "./build-body";
import {
  emptyEquipmentFormValues,
  SITE_UNASSIGNED_VALUE,
  type EquipmentFormValues,
} from "./form-state";
import { OMITTABLE_EQUIPMENT_FIELDS } from "./omit-fields";

function values(overrides: Partial<EquipmentFormValues> = {}) {
  const merged = { ...emptyEquipmentFormValues(), category: "crane" as const, ...overrides };
  const submittable = submittableEquipmentValues(merged);
  if (!submittable) throw new Error("kategori seçili olmalı");
  return submittable;
}

describe("submittableEquipmentValues", () => {
  it("kategori seçilmemişse null döner (tip kapısı)", () => {
    expect(submittableEquipmentValues(emptyEquipmentFormValues())).toBeNull();
  });
});

describe("buildEquipmentCreateBody", () => {
  it("boş metin alanları null'a düşer — sunucuya \"\" yazılmaz", () => {
    expect(buildEquipmentCreateBody(values())).toMatchObject({
      brand: null,
      model: null,
      serial_no: null,
      plate_no: null,
      model_year: null,
      purchase_amount: null,
      purchase_date: null,
      supplier_id: null,
      market_value: null,
      rate_amount: null,
      site_id: null,
      operator_id: null,
      norm_consumption: null,
    });
  });

  it("mockup'ın gösterdiği varsayılanları AYNEN gönderir (K5 kapısı oluşturmada YOK)", () => {
    expect(buildEquipmentCreateBody(values())).toMatchObject({
      ownership: "owned", // 54
      status: "working", // 120
      financing: "cash", // 102
      rate_period: "hourly", // 109
      fuel_type: "diesel", // 121
      norm_unit: "lt_hour",
      maintenance_period: "hours_500", // 123
      depreciation_years: 10, // 100
      is_company_asset: true, // 166
    });
  });

  it("K5 alanlarının HEPSİ oluşturma gövdesinde HER ZAMAN bulunur", () => {
    const body = buildEquipmentCreateBody(values()) as Record<string, unknown>;
    for (const field of OMITTABLE_EQUIPMENT_FIELDS) {
      expect(field in body).toBe(true);
    }
  });

  it("mockup'ta çizilmeyen `monthly_capacity_hours` sunucu varsayılanıyla gider", () => {
    expect(buildEquipmentCreateBody(values()).monthly_capacity_hours).toBe(
      DEFAULT_MONTHLY_CAPACITY_HOURS,
    );
  });

  it("yeni ekipman AKTİF açılır", () => {
    expect(buildEquipmentCreateBody(values()).is_active).toBe(true);
  });

  it("model yılı tamsayıya çevrilir", () => {
    expect(buildEquipmentCreateBody(values({ modelYear: "2022" })).model_year).toBe(2022);
  });

  it("“Depoda (Atanmadı)” ve “Seçiniz...” İKİSİ DE site_id null üretir (K6)", () => {
    expect(buildEquipmentCreateBody(values({ siteId: SITE_UNASSIGNED_VALUE })).site_id).toBeNull();
    expect(buildEquipmentCreateBody(values({ siteId: "" })).site_id).toBeNull();
    expect(buildEquipmentCreateBody(values({ siteId: "site-7" })).site_id).toBe("site-7");
  });

  it("tek `supplier_id` gider — ikinci bir kiralama firması anahtarı YOK (MK-1 K3)", () => {
    const body = buildEquipmentCreateBody(values({ supplierId: "sup-3" })) as Record<
      string,
      unknown
    >;
    expect(body.supplier_id).toBe("sup-3");
    expect("rental_supplier_id" in body).toBe(false);
  });

  it("mockup'ta çizilmeyen alanlar gövdeye SIZMAZ", () => {
    const body = buildEquipmentCreateBody(values()) as Record<string, unknown>;
    expect("status_note" in body).toBe(false);
    expect("status_expected_date" in body).toBe(false);
    expect("photo" in body).toBe(false);
  });
});

describe("buildEquipmentUpdateBody · K5 kapısı", () => {
  it("`omitFields` boşken TÜM anahtarlar gider", () => {
    const body = buildEquipmentUpdateBody(values()) as Record<string, unknown>;
    for (const field of OMITTABLE_EQUIPMENT_FIELDS) {
      expect(field in body).toBe(true);
    }
  });

  it("atlanan anahtar gövdede HİÇ YOKTUR — `null` da GÖNDERİLMEZ", () => {
    const body = buildEquipmentUpdateBody(values(), {
      omitFields: ["fuel_type", "maintenance_period"],
    }) as Record<string, unknown>;

    expect("fuel_type" in body).toBe(false);
    expect("maintenance_period" in body).toBe(false);
    // `null` göndermek de sunucudaki değeri EZERDİ — anahtarın yokluğu şarttır.
    expect(body.fuel_type).toBeUndefined();
    expect(body.maintenance_period).toBeUndefined();
    // Atlanmayanlar normal gider.
    expect(body.financing).toBe("cash");
    expect(body.rate_period).toBe("hourly");
  });

  it("altı alanın HER BİRİ tek tek atlanabilir", () => {
    for (const field of OMITTABLE_EQUIPMENT_FIELDS) {
      const body = buildEquipmentUpdateBody(values(), { omitFields: [field] }) as Record<
        string,
        unknown
      >;
      expect(field in body).toBe(false);
      // Diğer beşi gövdede KALIR.
      for (const other of OMITTABLE_EQUIPMENT_FIELDS) {
        if (other !== field) expect(other in body).toBe(true);
      }
    }
  });

  it("K5 kapısı dışındaki alanlar atlamadan ETKİLENMEZ", () => {
    const body = buildEquipmentUpdateBody(values({ name: "Loder L-9" }), {
      omitFields: [...OMITTABLE_EQUIPMENT_FIELDS],
    }) as Record<string, unknown>;

    expect(body.name).toBe("Loder L-9");
    expect(body.category).toBe("crane");
    expect(body.status).toBe("working");
    expect(body.ownership).toBe("owned");
  });

  it("PATCH gövdesi `monthly_capacity_hours` ve `is_active` GÖNDERMEZ", () => {
    // İkisi de M2'de çizili değildir; sunucudaki mevcut değer KORUNUR.
    const body = buildEquipmentUpdateBody(values()) as Record<string, unknown>;
    expect("monthly_capacity_hours" in body).toBe(false);
    expect("is_active" in body).toBe(false);
  });
});
