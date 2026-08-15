import { describe, it, expect } from "vitest";

import { buildWarehouseBody } from "./build-body";

const SITE_ID = "ssssssss-0000-0000-0000-000000000001";

describe("buildWarehouseBody", () => {
  it("🔴 şantiye seçilmezse `site_id` gövdede HİÇ TAŞINMAZ (= MERKEZ depo)", () => {
    const body = buildWarehouseBody("Merkez Depo (Sincan)", "");
    expect(body).toEqual({ name: "Merkez Depo (Sincan)" });
    expect(body).not.toHaveProperty("site_id");
  });

  it("boş dize DEĞİL, anahtarın kendisi düşer (boş dize UUID alanında 422 olurdu)", () => {
    expect(Object.keys(buildWarehouseBody("D-1", "   "))).toEqual(["name"]);
  });

  it("şantiye seçilirse `site_id` taşınır", () => {
    expect(buildWarehouseBody("D-1 Ambar", SITE_ID)).toEqual({
      name: "D-1 Ambar",
      site_id: SITE_ID,
    });
  });

  it("ad kırpılır", () => {
    expect(buildWarehouseBody("  D-4 Kapalı Ambar  ", "")).toEqual({ name: "D-4 Kapalı Ambar" });
  });
});
