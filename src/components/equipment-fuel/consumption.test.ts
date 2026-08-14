import { describe, it, expect } from "vitest";

import { consumptionTone, deviationReasonText, normUnitLabel } from "./consumption";

describe("consumptionTone — K2: rozet SUNUCUDAN gelir, eşik istemcide HESAPLANMAZ", () => {
  it("sunucunun consumption_status damgasını doğrudan tona çevirir", () => {
    expect(consumptionTone("normal")).toBe("success");
    expect(consumptionTone("warning")).toBe("warning");
    expect(consumptionTone("critical")).toBe("danger");
  });

  it("status null iken nötr basar — istemci uydurma bir eşik uygulamaz", () => {
    expect(consumptionTone(null)).toBe("neutral");
  });
});

describe("deviationReasonText — K3/K16 fail-closed gerekçe metinleri", () => {
  it("üç gerekçenin ÜÇÜNÜ de Türkçe metne çevirir", () => {
    expect(deviationReasonText("no_distance_data")).toContain("Kilometre verisi");
    expect(deviationReasonText("no_norm_consumption")).toContain("Norm tüketim");
    expect(deviationReasonText("no_work_hours")).toContain("Çalışma saati");
  });

  it("gerekçe null iken genel bir metin döner (uydurma detay yok)", () => {
    expect(deviationReasonText(null)).toBe("Sapma sunucuda hesaplanamadı.");
  });
});

describe("normUnitLabel", () => {
  it("lt_km ve lt_hour birimlerini Türkçe etikete çevirir", () => {
    expect(normUnitLabel("lt_km")).toBe("Lt/km");
    expect(normUnitLabel("lt_hour")).toBe("Lt/saat");
  });

  it("null/undefined için boş metin döner", () => {
    expect(normUnitLabel(null)).toBe("");
    expect(normUnitLabel(undefined)).toBe("");
  });
});
