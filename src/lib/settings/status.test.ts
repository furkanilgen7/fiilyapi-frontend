import { describe, expect, it } from "vitest";
import { statusLabel, statusVariant } from "./status";

describe("kullanici durumu", () => {
  it("etiketleri Turkce dondurur", () => {
    expect(statusLabel("active")).toBe("Aktif");
    expect(statusLabel("on_leave")).toBe("İzinli");
    expect(statusLabel("passive")).toBe("Pasif");
  });

  it("rozet varyantlarini eslestirir", () => {
    expect(statusVariant("active")).toBe("success");
    expect(statusVariant("on_leave")).toBe("warning");
    expect(statusVariant("passive")).toBe("neutral");
  });
});
