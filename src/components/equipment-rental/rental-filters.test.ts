// @vitest-environment node
//
// Saf TS katmanı + metin-taramalı bekçi: DOM gerekmez ve `import.meta.url`
// jsdom altında dosya URL'si olarak çözülmez (`TypeError: The URL must be of
// scheme file`) — o hâlde suite HİÇ YÜKLENMEZ ve iddiaları değerlendirilmez
// (sahte-KIRMIZI). `src/test-guards/` emsalinin aynısı.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

import {
  RENTAL_STATUS_FILTER_OPTIONS,
  parseRentalFilters,
  withRentalFilterParams,
} from "./rental-filters";
import { RENTAL_STATUS_BADGE } from "./rental-labels";

const selfDir = fileURLToPath(new URL(".", import.meta.url));

function params(query: string): URLSearchParams {
  return new URLSearchParams(query);
}

describe("parseRentalFilters · varsayilan yol", () => {
  /* 🔴 MU-2 dersi: her test bayragi ACIKCA geciyorsa varsayilan yol
   * BEKCISIZ kalir. Bos query bir testle acikca cakilir. */
  it("bos query TUM suzgecleri null verir", () => {
    expect(parseRentalFilters(params(""))).toEqual({
      supplierId: null,
      siteId: null,
      status: null,
      periodYear: null,
      periodMonth: null,
    });
  });

  it("tam yuk tipli okunur", () => {
    expect(
      parseRentalFilters(
        params("supplier_id=sup-1&site_id=s-1&status=approved&period_year=2026&period_month=7"),
      ),
    ).toEqual({
      supplierId: "sup-1",
      siteId: "s-1",
      status: "approved",
      periodYear: 2026,
      periodMonth: 7,
    });
  });
});

describe("parseRentalFilters · durum suzgeci", () => {
  it.each(["draft", "pending_verification", "approved", "paid"] as const)(
    "%s gecerli bir durumdur (DORDU de suzulebilir)",
    (status) => {
      expect(parseRentalFilters(params(`status=${status}`)).status).toBe(status);
    },
  );

  it("bilinmeyen durum sessizce null'a duser (elle yazilan URL kirmizi vermez)", () => {
    expect(parseRentalFilters(params("status=rejected")).status).toBeNull();
    expect(parseRentalFilters(params("status=cop")).status).toBeNull();
  });

  it("secenek listesi DORT durumu tasir ve etiketler rozet sozlugunden TURER", () => {
    expect(RENTAL_STATUS_FILTER_OPTIONS).toHaveLength(4);
    for (const option of RENTAL_STATUS_FILTER_OPTIONS) {
      expect(option.label).toBe(RENTAL_STATUS_BADGE[option.value].label);
    }
  });

  it("`rejected` HICBIR secenekte yoktur (sema dort degerlidir)", () => {
    expect(RENTAL_STATUS_FILTER_OPTIONS.map((option) => option.value)).not.toContain("rejected");
  });
});

describe("parseRentalFilters · donem SINIR degerleri", () => {
  /* 🔴 MU-2 dersi: pencere siniri olan her hesapta test SINIR degerini
   * acikca kullanir (ilk gun / son gun / tam esitlik). */
  it("SINIR: yil 2000 ve 2200 KABUL edilir (tam esitlik)", () => {
    expect(parseRentalFilters(params("period_year=2000")).periodYear).toBe(2000);
    expect(parseRentalFilters(params("period_year=2200")).periodYear).toBe(2200);
  });

  it("SINIR: yil 1999 ve 2201 REDDEDILIR", () => {
    expect(parseRentalFilters(params("period_year=1999")).periodYear).toBeNull();
    expect(parseRentalFilters(params("period_year=2201")).periodYear).toBeNull();
  });

  it("SINIR: ay 1 ve 12 KABUL, 0 ve 13 RED", () => {
    expect(parseRentalFilters(params("period_month=1")).periodMonth).toBe(1);
    expect(parseRentalFilters(params("period_month=12")).periodMonth).toBe(12);
    expect(parseRentalFilters(params("period_month=0")).periodMonth).toBeNull();
    expect(parseRentalFilters(params("period_month=13")).periodMonth).toBeNull();
  });

  it("ondalik/metin donem degeri null'a duser", () => {
    expect(parseRentalFilters(params("period_year=2026.5")).periodYear).toBeNull();
    expect(parseRentalFilters(params("period_month=temmuz")).periodMonth).toBeNull();
  });
});

describe("withRentalFilterParams", () => {
  it("mevcut nesneyi MUTATE ETMEZ (yeni URLSearchParams doner)", () => {
    const current = params("supplier_id=sup-1");
    const next = withRentalFilterParams(current, { site_id: "s-1" });
    expect(current.toString()).toBe("supplier_id=sup-1");
    expect(next).not.toBe(current);
    expect(next.get("site_id")).toBe("s-1");
  });

  it("null ve bos deger alani SILER", () => {
    const next = withRentalFilterParams(params("supplier_id=sup-1&status=paid"), {
      supplier_id: null,
      status: "",
    });
    expect(next.has("supplier_id")).toBe(false);
    expect(next.has("status")).toBe(false);
  });

  it("dokunulmayan parametre KORUNUR", () => {
    const next = withRentalFilterParams(params("supplier_id=sup-1&period_year=2026"), {
      status: "paid",
    });
    expect(next.get("supplier_id")).toBe("sup-1");
    expect(next.get("period_year")).toBe("2026");
    expect(next.get("status")).toBe("paid");
  });
});

/* --------------------------------------------------------------------------
 * YAPISAL YASAK — ARAMA PARAMETRESI YOK.
 *
 * Uc yedi parametre tanir ve `q` bunlarin arasinda DEGILDIR. Emsal
 * (`SubcontractorProgressPaymentsView`) bir arama kutusu basiyor; buraya
 * kopyalanirsa yazdigi metnin hicbir etkisi olmayan bir kutu dogar. Bekci
 * metin taramasidir cunku kusur DAVRANISTA degil VARLIKTA yasar.
 * ----------------------------------------------------------------------- */
describe("rental-filters · arama parametresi YASAK", () => {
  const filtersSource = readFileSync(`${selfDir}rental-filters.ts`, "utf8");

  it("bekci canlidir: taranan kaynak gercekten okunuyor", () => {
    expect(filtersSource.length).toBeGreaterThan(500);
    expect(filtersSource).toMatch(/parseRentalFilters/);
  });

  it("`q` suzgeci ne durumda ne de yamada gecer", () => {
    expect(filtersSource).not.toMatch(/["']q["']\s*:/);
    expect(filtersSource).not.toMatch(/\bsearchParams\.get\(\s*["']q["']\s*\)/);
  });

  it("suzgec durumu TAM BES alandir (uc parametresinin yansimasi)", () => {
    expect(Object.keys(parseRentalFilters(params("")))).toEqual([
      "supplierId",
      "siteId",
      "status",
      "periodYear",
      "periodMonth",
    ]);
  });
});
