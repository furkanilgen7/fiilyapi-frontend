import { describe, expect, it } from "vitest";

import { buildUnitBody } from "./build-body";
import {
  emptyUnitFormValues,
  type UnitFormField,
  type UnitFormValues,
  type UnitTouched,
} from "./form-state";

function values(overrides: Partial<UnitFormValues> = {}): UnitFormValues {
  return { ...emptyUnitFormValues(), ...overrides };
}

function touchedSet(...fields: UnitFormField[]): UnitTouched {
  return new Set<UnitFormField>(fields);
}

const NOTHING_TOUCHED: UnitTouched = new Set<UnitFormField>();

/** UE'nin kendi örnek verisi — mockup satır satır okundu. */
const MOCKUP_VALUES: UnitFormValues = values({
  projectId: "prj-1", // UE 63
  siteId: "site-1", // UE 64 — YALNIZ süzgeç
  blockId: "blk-b", // UE 65
  floor: "3. Kat", // UE 66 — METİN
  unitNo: "B-12", // UE 73
  unitKind: "apartment", // UE 74
  layout: "3+1", // UE 75
  grossAreaM2: "178", // UE 76
  netAreaM2: "152", // UE 77
  facing: "southwest", // UE 78
  balconyAreaM2: "14", // UE 79
  bathroomCount: "2", // UE 80
  parkingRight: "one_closed", // UE 81
  listPrice: "1480000", // UE 88
  appraisalValue: "1420000", // UE 90
  minSalePrice: "1380000", // UE 92
  vatRate: "10", // UE 93
  salesStatus: "listed", // UE 94
  ownerSide: "contractor", // UE 95
});

const ALL_TOUCHED: UnitTouched = touchedSet(
  "blockId",
  "floor",
  "unitNo",
  "unitKind",
  "layout",
  "grossAreaM2",
  "netAreaM2",
  "facing",
  "balconyAreaM2",
  "bathroomCount",
  "parkingRight",
  "listPrice",
  "appraisalValue",
  "minSalePrice",
  "vatRate",
  "salesStatus",
  "ownerSide",
);

describe("buildUnitBody — 🔴 KARAR 3: maliyet sızıntısı YASAK", () => {
  it("gövdede cost / unit_cost / expected_profit / profit ADINDA anahtar OLAMAZ", () => {
    // Sunucuda maliyet SÜTUNU YOKTUR (`units/models.py`): maliyet proje
    // bütçesinden hesaplanır, `unit_cost` / `expected_profit` yer tutucu döner.
    // UE 91 kutusu ekranda devre dışı basılır ama gövdeye HİÇ dokunmaz.
    for (const body of [
      buildUnitBody(emptyUnitFormValues(), NOTHING_TOUCHED),
      buildUnitBody(MOCKUP_VALUES, ALL_TOUCHED),
    ]) {
      for (const forbidden of [
        "cost",
        "unit_cost",
        "expected_profit",
        "profit",
        "margin",
        "maliyet",
      ]) {
        expect(body, forbidden).not.toHaveProperty(forbidden);
      }
    }
  });

  it("maliyet FORM DURUMUNDA da yoktur — sızıntı yapısal olarak imkânsızdır", () => {
    const stateKeys = Object.keys(emptyUnitFormValues());
    expect(stateKeys.filter((key) => /cost|profit|margin|maliyet/i.test(key))).toEqual([]);
  });

  it("UE 104-121 belge kutuları gövdeye anahtar eklemez", () => {
    const body = buildUnitBody(MOCKUP_VALUES, ALL_TOUCHED);
    for (const forbidden of ["documents", "files", "floor_plan", "images", "deed"]) {
      expect(body, forbidden).not.toHaveProperty(forbidden);
    }
  });
});

describe("buildUnitBody — KARAR 11: hiçbir alan zorunlu değil", () => {
  it("BOŞ form da gövde üretir; anahtar kümesi YALNIZ üretilmiş-tip zorunlularıdır", () => {
    const body = buildUnitBody(emptyUnitFormValues(), NOTHING_TOUCHED);
    expect(Object.keys(body).sort()).toEqual([
      "block_id",
      "sales_status",
      "sort_order",
      "unit_kind",
      "unit_no",
    ]);
    expect(body.unit_no).toBe("");
    expect(body.block_id).toBe("");
  });

  it("boş formda hata fırlatmaz (istemci tarafı 'zorunlu alan' reddi YOK)", () => {
    expect(() => buildUnitBody(emptyUnitFormValues(), NOTHING_TOUCHED)).not.toThrow();
  });
});

describe("buildUnitBody — üretilmiş tip tuzağı / NOT NULL alanlar", () => {
  it("unit_kind DOKUNULMASA BİLE gövdededir (sunucuda NOT NULL)", () => {
    // Dokunma kapısı NULLABLE sütunları korur; burada ezilecek bir NULL YOKTUR.
    const body = buildUnitBody(MOCKUP_VALUES, NOTHING_TOUCHED);
    expect(body.unit_kind).toBe("apartment"); // UE 74 `selected` "Daire"
  });

  it("sales_status DOKUNULMASA BİLE gövdededir ve 'listed'tır", () => {
    // UE 94 `selected` "Satışta (Boş)" ile sunucu varsayılanı `listed` AYNI
    // değerdir; üretilmiş tip anahtarı zorunlu kıldığı için atlanamaz.
    const body = buildUnitBody(emptyUnitFormValues(), NOTHING_TOUCHED);
    expect(body.sales_status).toBe("listed");
  });

  it("sort_order gövdede DAİMA 0'dır ve FORMDA yoktur", () => {
    expect(buildUnitBody(MOCKUP_VALUES, ALL_TOUCHED).sort_order).toBe(0);
    expect(Object.keys(emptyUnitFormValues())).not.toContain("sortOrder");
  });
});

describe("buildUnitBody — dokunma kapısı (UE 66 · 75 · 78 · 81 · 93 · 95)", () => {
  const GATED: readonly [UnitFormField, string][] = [
    ["floor", "floor"], // UE 66
    ["layout", "layout"], // UE 75
    ["facing", "facing"], // UE 78
    ["parkingRight", "parking_right"], // UE 81 — "Yok" GERÇEK bir enum değeridir
    ["vatRate", "vat_rate"], // UE 93
    ["ownerSide", "owner_side"], // UE 95
  ];

  it("dokunulmamış seçicinin varsayılanı gövdeye GİRMEZ (sütun NULL kalır)", () => {
    const body = buildUnitBody(MOCKUP_VALUES, touchedSet("blockId", "unitNo"));
    for (const [, key] of GATED) {
      expect(body, key).not.toHaveProperty(key);
    }
  });

  it("dokunulan seçici gövdeye girer", () => {
    for (const [field, key] of GATED) {
      const body = buildUnitBody(MOCKUP_VALUES, touchedSet(field));
      expect(body, key).toHaveProperty(key, MOCKUP_VALUES[field]);
    }
  });

  it("dokunma ALAN BAZLIDIR: birine dokunmak diğerlerini açmaz", () => {
    const body = buildUnitBody(MOCKUP_VALUES, touchedSet("facing"));
    expect(body).toHaveProperty("facing", "southwest");
    expect(body).not.toHaveProperty("parking_right");
    expect(body).not.toHaveProperty("owner_side");
    expect(body).not.toHaveProperty("vat_rate");
  });
});

describe("buildUnitBody — UE 66 Kat METİNDİR (KARAR 4)", () => {
  it("sayı olmayan kat değeri OLDUĞU GİBİ gider", () => {
    const body = buildUnitBody(values({ floor: "Zemin" }), ALL_TOUCHED);
    expect(body.floor).toBe("Zemin");
    expect(typeof body.floor).toBe("string");
  });

  it("sayı gibi görünen kat da METİN kalır (Number'a çevrilmez)", () => {
    const body = buildUnitBody(values({ floor: "3" }), ALL_TOUCHED);
    expect(body.floor).toBe("3");
    expect(typeof body.floor).toBe("string");
  });

  it("boş kat anahtar açmaz", () => {
    const body = buildUnitBody(values({ floor: "   " }), ALL_TOUCHED);
    expect(body).not.toHaveProperty("floor");
  });
});

describe("buildUnitBody — ondalık ve sayı alanları", () => {
  it("ondalık alanlar STRING olarak normalize edilir (TR virgülü)", () => {
    const body = buildUnitBody(
      values({
        grossAreaM2: "178,50",
        netAreaM2: "152,25",
        balconyAreaM2: "14,5",
        listPrice: "1480000,00",
        appraisalValue: "1420000,90",
        minSalePrice: "1380000,10",
      }),
      ALL_TOUCHED,
    );
    expect(body.gross_area_m2).toBe("178.50");
    expect(body.net_area_m2).toBe("152.25");
    expect(body.balcony_area_m2).toBe("14.5");
    expect(body.list_price).toBe("1480000.00");
    expect(body.appraisal_value).toBe("1420000.90");
    expect(body.min_sale_price).toBe("1380000.10");
  });

  it("boş ondalık kutusu anahtar açmaz (0 UYDURULMAZ)", () => {
    const body = buildUnitBody(values({ unitNo: "B-12" }), ALL_TOUCHED);
    for (const key of [
      "gross_area_m2",
      "net_area_m2",
      "balcony_area_m2",
      "list_price",
      "appraisal_value",
      "min_sale_price",
    ]) {
      expect(body, key).not.toHaveProperty(key);
    }
  });

  it("banyo sayısı SAYI olarak gider; boşsa anahtar kurulmaz", () => {
    expect(buildUnitBody(values({ bathroomCount: "2" }), ALL_TOUCHED).bathroom_count).toBe(2);
    expect(buildUnitBody(values({ unitNo: "B" }), ALL_TOUCHED)).not.toHaveProperty(
      "bathroom_count",
    );
  });

  it("sayı/metin kutuları dokunma kapısına GİRMEZ: dolu kutu kayıtsız da gider", () => {
    const body = buildUnitBody(
      values({ unitNo: "B-12", grossAreaM2: "178", bathroomCount: "2" }),
      NOTHING_TOUCHED,
    );
    expect(body.unit_no).toBe("B-12");
    expect(body.gross_area_m2).toBe("178");
    expect(body.bathroom_count).toBe(2);
  });

  it("anlamsız sayı/ondalık girdi anahtar açmaz (NaN kaçmaz)", () => {
    const body = buildUnitBody(
      values({ bathroomCount: "abc", listPrice: "abc" }),
      ALL_TOUCHED,
    );
    expect(body).not.toHaveProperty("bathroom_count");
    expect(body).not.toHaveProperty("list_price");
  });
});

describe("buildUnitBody — KARAR 2: min_sale_price > list_price MEŞRUDUR", () => {
  it("istemci bu bileşimi ENGELLEMEZ, kırpmaz, düzeltmez", () => {
    const body = buildUnitBody(
      values({ listPrice: "1000000", minSalePrice: "1500000" }),
      ALL_TOUCHED,
    );
    expect(body.list_price).toBe("1000000");
    expect(body.min_sale_price).toBe("1500000");
  });
});

describe("buildUnitBody — PATH parametresi ve süzgeç sızıntısı", () => {
  it("project_id (UE 63) ve site_id (UE 64) gövdeye GİRMEZ", () => {
    // Şantiye BLOK ÜZERİNDEN türetilir; iki ayrı yoldan aynı gerçeğe ulaşmak
    // senkron kayması demektir (`units/models.py`).
    const body = buildUnitBody(MOCKUP_VALUES, ALL_TOUCHED);
    expect(body).not.toHaveProperty("project_id");
    expect(body).not.toHaveProperty("site_id");
  });

  it("tamamı dolu formda gövde TAM OLARAK 18 anahtar taşır (fazlası kırmızıdır)", () => {
    const body = buildUnitBody(MOCKUP_VALUES, ALL_TOUCHED);
    expect(Object.keys(body).sort()).toEqual([
      "appraisal_value",
      "balcony_area_m2",
      "bathroom_count",
      "block_id",
      "facing",
      "floor",
      "gross_area_m2",
      "layout",
      "list_price",
      "min_sale_price",
      "net_area_m2",
      "owner_side",
      "parking_right",
      "sales_status",
      "sort_order",
      "unit_kind",
      "unit_no",
      "vat_rate",
    ]);
  });

  it("ünite no ve oda tipi kırpılır", () => {
    const body = buildUnitBody(values({ unitNo: " B-12 ", layout: " 3+1 " }), ALL_TOUCHED);
    expect(body.unit_no).toBe("B-12");
    expect(body.layout).toBe("3+1");
  });
});
