import { describe, it, expect } from "vitest";

import { emptySiteFormValues, FACILITY_KEYS, buildFacilities } from "./form-state";

describe("emptySiteFormValues", () => {
  it("durumu 'active' baslatir (mockup satir 71 'Aktif' secili)", () => {
    expect(emptySiteFormValues().status).toBe("active");
  });

  it("sekiz tesis kutucugunu da false baslatir (§11.12 — mockup on-isaretleri ornek veridir)", () => {
    const values = emptySiteFormValues();
    expect(Object.keys(values.facilities)).toHaveLength(8);
    expect(Object.values(values.facilities).every((v) => v === false)).toBe(true);
  });

  it("tum metin alanlarini bos dize baslatir (kontrolsuz alan yok)", () => {
    const values = emptySiteFormValues();
    expect(values.name).toBe("");
    expect(values.code).toBe("");
    expect(values.siteManagerUserId).toBe("");
    expect(values.safetyOfficer).toBe("");
    expect(values.gpsCoordinates).toBe("");
    expect(values.plannedWorkerCount).toBe("");
  });
});

describe("FACILITY_KEYS", () => {
  it("backend sozlesmesinin sekiz anahtarini tasir — eski d1_* seti kullanilmaz", () => {
    expect(FACILITY_KEYS).toEqual([
      "closed_warehouse",
      "open_storage",
      "cold_storage",
      "site_office",
      "canteen",
      "changing_room_wc",
      "dormitory",
      "infirmary",
    ]);
  });
});

describe("buildFacilities", () => {
  it("sekiz anahtari da uretir, isaretsizler false gider", () => {
    const facilities = buildFacilities({
      ...emptySiteFormValues().facilities,
      site_office: true,
    });
    expect(facilities).toEqual({
      closed_warehouse: false,
      open_storage: false,
      cold_storage: false,
      site_office: true,
      canteen: false,
      changing_room_wc: false,
      dormitory: false,
      infirmary: false,
    });
  });
});
