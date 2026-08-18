import { describe, expect, it } from "vitest";

import { siteQuotaOf } from "./boq-quota";

/**
 * BOQ-SEC-F K2 — İKİ ANLAM TUZAĞI'nın bekçisi.
 *
 * Fikstürlerde ÜÇ alanın ÜÇÜ de FARKLIDIR (ayrışma noktası kuralı): eğer
 * `siteQuotaOf` yanlış alandan okursa test kırmızı olur. `quantity`yi döndüren
 * bir uygulama da, `quantity - allocated` hesabı yapan bir uygulama da bu
 * fikstürlerde YANLIŞ sayı üretir.
 */
describe("siteQuotaOf", () => {
  it("santiye kotasini allocated + unallocated toplamindan okur", () => {
    // Süzülmüş yanıt: quantity = bu bölüme tahsis (480), gerçek kota 700.
    expect(
      siteQuotaOf({ quantity: "480.000", allocated_quantity: "600.000", unallocated_quantity: "100.000" }),
    ).toBe("700.000");
  });

  it("quantity alanini KULLANMAZ - suzulmus yanitta o bolum payidir", () => {
    // `quantity` burada üç alanın en büyüğü; onu döndüren mutasyon yakalanır.
    expect(
      siteQuotaOf({ quantity: "9999", allocated_quantity: "12.500", unallocated_quantity: "7.250" }),
    ).toBe("19.750");
  });

  it("quantity - allocated hesabini YAPMAZ (suzulmus yanitta esitlik BOZULUR)", () => {
    // quantity - allocated = 380 ≠ 700 → yanlış formül burada ayrışır.
    expect(
      siteQuotaOf({ quantity: "480", allocated_quantity: "100", unallocated_quantity: "600" }),
    ).toBe("700");
  });

  it("kesirli olcekleri KAYIPSIZ toplar (float yuvarlama YOK)", () => {
    expect(
      siteQuotaOf({ quantity: "1", allocated_quantity: "0.1", unallocated_quantity: "0.2" }),
    ).toBe("0.3");
  });

  it("hic tahsis yokken kota unallocated'a esittir", () => {
    expect(
      siteQuotaOf({ quantity: "44", allocated_quantity: "0", unallocated_quantity: "44" }),
    ).toBe("44");
  });
});
