import { describe, it, expect } from "vitest";

import { MAX_LENGTH } from "./constants";
import {
  validateEmployerItem,
  validateSubcontractorItem,
  type ContractItemFormValues,
  type EmployerItemFormValues,
} from "./validate";

const VALID: ContractItemFormValues = {
  code: "03.012",
  description: "Perde betonu C30/37",
  unit: "m³",
  quantity: "1240.5",
  unitPrice: "2850",
  sortOrder: "",
};

const VALID_EMPLOYER: EmployerItemFormValues = {
  ...VALID,
  groupId: "gggggggg-0000-0000-0000-000000000001",
  groupName: "",
};

describe("validateSubcontractorItem (TAŞ)", () => {
  it("geçerli formda sorun bulmaz", () => {
    expect(validateSubcontractorItem(VALID)).toBeNull();
  });

  it("🔴 birim fiyat BOŞ bırakılabilir — hata değildir", () => {
    expect(validateSubcontractorItem({ ...VALID, unitPrice: "" })).toBeNull();
  });

  it("zorunlu alanları mockup sırasıyla yakalar", () => {
    expect(validateSubcontractorItem({ ...VALID, code: " " })?.field).toBe("code");
    expect(validateSubcontractorItem({ ...VALID, description: "" })?.field).toBe("description");
    expect(validateSubcontractorItem({ ...VALID, unit: "" })?.field).toBe("unit");
    expect(validateSubcontractorItem({ ...VALID, quantity: "" })?.field).toBe("quantity");
  });

  it("miktar sıfır veya negatifken reddeder (şema `exclusiveMinimum: 0`)", () => {
    expect(validateSubcontractorItem({ ...VALID, quantity: "0" })?.field).toBe("quantity");
    expect(validateSubcontractorItem({ ...VALID, quantity: "-5" })?.field).toBe("quantity");
  });

  it("sayı olmayan miktarı reddeder", () => {
    expect(validateSubcontractorItem({ ...VALID, quantity: "abc" })?.field).toBe("quantity");
  });

  it("negatif birim fiyatı reddeder (şema `minimum: 0`)", () => {
    expect(validateSubcontractorItem({ ...VALID, unitPrice: "-1" })?.field).toBe("unitPrice");
  });

  it("uzunluk sınırlarını şemadan uygular", () => {
    const longCode = "x".repeat(MAX_LENGTH.code + 1);
    expect(validateSubcontractorItem({ ...VALID, code: longCode })?.field).toBe("code");
    const longUnit = "x".repeat(MAX_LENGTH.unit + 1);
    expect(validateSubcontractorItem({ ...VALID, unit: longUnit })?.field).toBe("unit");
  });

  it("Sıra boş olabilir ama ondalık/negatif olamaz", () => {
    expect(validateSubcontractorItem({ ...VALID, sortOrder: "" })).toBeNull();
    expect(validateSubcontractorItem({ ...VALID, sortOrder: "3" })).toBeNull();
    expect(validateSubcontractorItem({ ...VALID, sortOrder: "-1" })?.field).toBe("sortOrder");
    expect(validateSubcontractorItem({ ...VALID, sortOrder: "1.5" })?.field).toBe("sortOrder");
  });
});

describe("validateEmployerItem (İŞV)", () => {
  it("geçerli formda sorun bulmaz", () => {
    expect(validateEmployerItem(VALID_EMPLOYER)).toBeNull();
  });

  it("🔴 poz grubu ZORUNLUdur ve ilk sırada denetlenir", () => {
    const problem = validateEmployerItem({ ...VALID_EMPLOYER, groupId: "", code: "" });
    expect(problem?.field).toBe("group");
  });

  it("🔴 birim fiyat ZORUNLUdur — TAŞ formunun tersine boş geçilemez", () => {
    const problem = validateEmployerItem({ ...VALID_EMPLOYER, unitPrice: "" });
    expect(problem?.field).toBe("unitPrice");
    expect(problem?.message).toBe("Birim Fiyat zorunludur.");
  });

  it("negatif birim fiyatı reddeder", () => {
    expect(validateEmployerItem({ ...VALID_EMPLOYER, unitPrice: "-3" })?.field).toBe("unitPrice");
  });
});
