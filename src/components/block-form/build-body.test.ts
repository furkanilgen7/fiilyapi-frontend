import { describe, expect, it } from "vitest";

import { buildBlockBody } from "./build-body";
import {
  emptyBlockFormValues,
  type BlockFormField,
  type BlockFormValues,
  type BlockTouched,
} from "./form-state";

function values(overrides: Partial<BlockFormValues> = {}): BlockFormValues {
  return { ...emptyBlockFormValues(), ...overrides };
}

function touchedSet(...fields: BlockFormField[]): BlockTouched {
  return new Set<BlockFormField>(fields);
}

const NOTHING_TOUCHED: BlockTouched = new Set<BlockFormField>();

/** BE'nin kendi örnek verisi — mockup satır satır okundu. */
const MOCKUP_VALUES: BlockFormValues = values({
  projectId: "prj-1",
  siteId: "site-1",
  name: "C Blok", // BE 70 placeholder
  code: "YV-C", // BE 71 placeholder
  basementFloorCount: "2", // BE 78
  floorCount: "8", // BE 79
  roofType: "duplex", // BE 80
  unitsPerFloor: "3", // BE 81
  groundFloorUsage: "commercial", // BE 82
  shopCount: "2", // BE 83
  constructionAreaM2: "3200", // BE 84
  elevatorCount: "1", // BE 85
  parkingType: "closed", // BE 86
  estimatedDeliveryDate: "2027-06-30", // BE 100
  status: "construction", // BE 101
  notes: "Köşe parsel", // BE 102
});

const ALL_TOUCHED: BlockTouched = touchedSet(
  "siteId",
  "name",
  "code",
  "basementFloorCount",
  "floorCount",
  "roofType",
  "unitsPerFloor",
  "groundFloorUsage",
  "shopCount",
  "constructionAreaM2",
  "elevatorCount",
  "parkingType",
  "estimatedDeliveryDate",
  "status",
  "notes",
);

describe("buildBlockBody — KARAR 11: hiçbir alan zorunlu değil", () => {
  it("BOŞ form da geçerli bir gövde üretir; anahtar kümesi YALNIZ name + sort_order'dır", () => {
    const body = buildBlockBody(emptyBlockFormValues(), NOTHING_TOUCHED);
    // Kırmızı `*` bir UI ipucudur: istemci kaydı ENGELLEMEZ, 422 taklidi
    // yapmaz. Boş ad da gövdeye girer — kararı sunucu verir.
    expect(Object.keys(body).sort()).toEqual(["name", "sort_order"]);
    expect(body.name).toBe("");
  });

  it("boş formda hata fırlatmaz (istemci tarafı 'zorunlu alan' reddi YOK)", () => {
    expect(() => buildBlockBody(emptyBlockFormValues(), NOTHING_TOUCHED)).not.toThrow();
  });
});

describe("buildBlockBody — üretilmiş tip tuzağı (sort_order)", () => {
  it("sort_order gövdede DAİMA bulunur ve şema varsayılanı 0'dır", () => {
    expect(buildBlockBody(emptyBlockFormValues(), NOTHING_TOUCHED).sort_order).toBe(0);
    expect(buildBlockBody(MOCKUP_VALUES, ALL_TOUCHED).sort_order).toBe(0);
  });

  it("sort_order FORMDA yoktur — mockup'ta kutusu çizilmemiştir", () => {
    expect(Object.keys(emptyBlockFormValues())).not.toContain("sortOrder");
    expect(Object.keys(emptyBlockFormValues())).not.toContain("sort_order");
  });
});

describe("buildBlockBody — dokunma kapısı (BE 80 · 82 · 86 · 101)", () => {
  const GATED: readonly [BlockFormField, string][] = [
    ["roofType", "roof_type"], // BE 80 — "Yok" GERÇEK bir enum değeridir
    ["groundFloorUsage", "ground_floor_usage"], // BE 82
    ["parkingType", "parking_type"], // BE 86
    ["status", "status"], // BE 101 — mockup `selected` = "İnşaat Halinde"
  ];

  it("dokunulmamış seçicinin varsayılanı gövdeye GİRMEZ (sütun NULL kalır)", () => {
    // Form dolu olsa bile: kullanıcı O SEÇİCİYİ açmadıysa kararı o vermemiştir.
    const body = buildBlockBody(MOCKUP_VALUES, touchedSet("name", "siteId"));
    for (const [, key] of GATED) {
      expect(body, key).not.toHaveProperty(key);
    }
  });

  it("dokunulan seçici gövdeye girer", () => {
    for (const [field, key] of GATED) {
      const body = buildBlockBody(MOCKUP_VALUES, touchedSet(field));
      expect(body, key).toHaveProperty(key, MOCKUP_VALUES[field]);
    }
  });

  it("dokunma ALAN BAZLIDIR: birine dokunmak diğer üçünü açmaz", () => {
    const body = buildBlockBody(MOCKUP_VALUES, touchedSet("roofType"));
    expect(body).toHaveProperty("roof_type", "duplex");
    expect(body).not.toHaveProperty("ground_floor_usage");
    expect(body).not.toHaveProperty("parking_type");
    expect(body).not.toHaveProperty("status");
  });
});

describe("buildBlockBody — sayı kutuları (BE 78 · 79 · 81 · 83 · 85)", () => {
  const INT_KEYS = [
    "basement_floor_count",
    "floor_count",
    "units_per_floor",
    "shop_count",
    "elevator_count",
  ] as const;

  it("boş sayı kutusu için anahtar HİÇ kurulmaz — 0 UYDURULMAZ", () => {
    const body = buildBlockBody(values({ name: "C Blok" }), ALL_TOUCHED);
    for (const key of INT_KEYS) {
      expect(body, key).not.toHaveProperty(key);
    }
  });

  it("dolu sayı kutusu SAYI olarak gider (string değil)", () => {
    const body = buildBlockBody(MOCKUP_VALUES, ALL_TOUCHED);
    expect(body.floor_count).toBe(8);
    expect(body.basement_floor_count).toBe(2);
    expect(body.units_per_floor).toBe(3);
    expect(body.shop_count).toBe(2);
    expect(body.elevator_count).toBe(1);
    expect(typeof body.floor_count).toBe("number");
  });

  it("sayı/metin kutuları dokunma kapısına GİRMEZ: dolu kutu kayıtsız da gider", () => {
    // Kapı yalnız BOŞ SEÇENEĞİ OLMAYAN seçiciler içindir. Dolu bir kutu
    // belirsiz değildir: kullanıcı o değeri yazmıştır.
    const body = buildBlockBody(
      values({ name: "C Blok", floorCount: "8", notes: "Köşe parsel" }),
      NOTHING_TOUCHED,
    );
    expect(body.floor_count).toBe(8);
    expect(body.notes).toBe("Köşe parsel");
  });

  it("anlamsız sayı girdisi anahtar açmaz (NaN gövdeye KAÇMAZ)", () => {
    const body = buildBlockBody(values({ floorCount: "abc" }), ALL_TOUCHED);
    expect(body).not.toHaveProperty("floor_count");
  });
});

describe("buildBlockBody — metin ve ondalık alanlar", () => {
  it("boş metin/tarih alanları anahtar açmaz", () => {
    const body = buildBlockBody(values({ name: "C Blok" }), ALL_TOUCHED);
    for (const key of ["site_id", "code", "estimated_delivery_date", "notes"]) {
      expect(body, key).not.toHaveProperty(key);
    }
  });

  it("blok kodu boşsa GÖNDERİLMEZ — sunucu üretir (BE 71 ipucu)", () => {
    const body = buildBlockBody(values({ name: "C Blok", code: "   " }), ALL_TOUCHED);
    expect(body).not.toHaveProperty("code");
  });

  it("ad, kod ve not kırpılır", () => {
    const body = buildBlockBody(
      values({ name: "  C Blok  ", code: " YV-C ", notes: " Köşe parsel " }),
      ALL_TOUCHED,
    );
    expect(body.name).toBe("C Blok");
    expect(body.code).toBe("YV-C");
    expect(body.notes).toBe("Köşe parsel");
  });

  it("construction_area_m2 ondalık STRING olarak normalize edilir (TR virgülü)", () => {
    const body = buildBlockBody(
      values({ name: "C", constructionAreaM2: "3200,50" }),
      ALL_TOUCHED,
    );
    expect(body.construction_area_m2).toBe("3200.50");
  });

  it("anlamsız ondalık girdi anahtar açmaz", () => {
    const body = buildBlockBody(values({ name: "C", constructionAreaM2: "abc" }), ALL_TOUCHED);
    expect(body).not.toHaveProperty("construction_area_m2");
  });
});

describe("buildBlockBody — pending sızıntısı ve PATH parametresi", () => {
  it("tamamı dolu formda gövde TAM OLARAK 16 anahtar taşır (fazlası kırmızıdır)", () => {
    const body = buildBlockBody(MOCKUP_VALUES, ALL_TOUCHED);
    expect(Object.keys(body).sort()).toEqual([
      "basement_floor_count",
      "code",
      "construction_area_m2",
      "elevator_count",
      "estimated_delivery_date",
      "floor_count",
      "ground_floor_usage",
      "name",
      "notes",
      "parking_type",
      "roof_type",
      "shop_count",
      "site_id",
      "sort_order",
      "status",
      "units_per_floor",
    ]);
  });

  it("project_id gövdeye GİRMEZ — PATH parametresidir", () => {
    const body = buildBlockBody(MOCKUP_VALUES, ALL_TOUCHED);
    expect(body).not.toHaveProperty("project_id");
  });

  it("🔴 BE 109 gezinme bayrağı GÖVDEYE SIZMAZ (durumda yaşar, gövdede yaşamaz)", () => {
    // 🔴 BU BEKÇİ DARALTILDI, SİLİNMEDİ. Eskiden hem DURUM hem GÖVDE anahtarları
    // `/bulk|batch|toplu|generate/i` ile eşleşmesin diye bakıyordu; o hâliyle
    // doğruydu çünkü kutucuğun hedefi yoktu ve `BlockFormValues`ta alanı da
    // yoktu. T2c'de hedef (`/satis/toplu-uretim`) açıldı ve kutucuk GERÇEK
    // oldu: `goToBulkUnits` artık durumun meşru bir üyesidir — tıpkı gövdeye
    // girmeyen `projectId` (PATH parametresi) gibi.
    //
    // Korunması GEREKEN kısım DEĞİŞMEDİ ve burada güçlendirildi: bayrak bir
    // GEZİNME kararıdır, `BlockCreate` gövdesinde karşılığı YOKTUR ve oraya
    // sızarsa sunucu 422 döner. Bu yüzden desen artık YALNIZ gövdeye
    // uygulanır — ve durum tarafında bayrağın GERÇEKTEN VAR OLDUĞU ayrıca
    // ölçülür, yoksa kutucuk sessizce ölü bir yüzeye dönebilirdi.
    const stateKeys = Object.keys(emptyBlockFormValues());
    expect(stateKeys).toContain("goToBulkUnits");

    const body = buildBlockBody(
      { ...MOCKUP_VALUES, goToBulkUnits: true },
      ALL_TOUCHED,
    ) as Record<string, unknown>;
    // Gövdede desenle eşleşen TEK BİR anahtar bile olmamalı (adlarını tek tek
    // saymak yeni bir isim uydurulduğunda kaçırırdı).
    expect(Object.keys(body).filter((key) => /bulk|batch|toplu|generate/i.test(key))).toEqual([]);
    for (const forbidden of [
      "bulk_units",
      "generate_units",
      "create_units",
      "go_to_bulk",
      "goToBulkUnits",
      "documents",
    ]) {
      expect(body, forbidden).not.toHaveProperty(forbidden);
    }
  });

  it("gezinme bayrağı AÇIK/KAPALI iken gövde AYNIDIR", () => {
    // Bayrağın gövdeyi hiçbir şekilde etkilemediğinin doğrudan ölçümü:
    // anahtar kümesi karşılaştırması bir gün gevşerse bu iddia yine tutar.
    expect(buildBlockBody({ ...MOCKUP_VALUES, goToBulkUnits: true }, ALL_TOUCHED)).toEqual(
      buildBlockBody({ ...MOCKUP_VALUES, goToBulkUnits: false }, ALL_TOUCHED),
    );
  });
});
