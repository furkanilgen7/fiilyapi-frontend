import { describe, expect, it } from "vitest";

import {
  BULK_DEFAULT_PREFIX,
  BULK_UNSET_FLOOR,
  BULK_UNSET_UNITS_PER_FLOOR,
  buildBulkUnitBody,
} from "./build-body";
import { deriveFloorRange, ROOF_FLOOR_SENTINEL, type BlockFloorSource } from "./floor-range";
import {
  emptyBulkUnitFormValues,
  setUnitsPerFloor,
  type BulkUnitFormValues,
} from "./form-state";
import { setSlotField } from "./slots";

function block(overrides: Partial<BlockFloorSource> = {}): BlockFloorSource {
  return { floor_count: 8, basement_floor_count: 2, roof_type: "duplex", ...overrides };
}

const RANGE = deriveFloorRange(block());
const EMPTY_RANGE = deriveFloorRange(null);

/** TU'nun kendi örnek verisi — mockup satır satır okundu. */
function mockupValues(): BulkUnitFormValues {
  const base = setUnitsPerFloor(
    {
      ...emptyBulkUnitFormValues(),
      projectId: "prj-1", // TU 61 — PATH
      siteId: "site-1", // TU 62 — YALNIZ süzgeç
      blockId: "blk-c", // TU 63
      unitKind: "apartment",
      startFloor: "1", // TU 70 — "1. Kat"
      endFloor: "8", // TU 71 — "8. Kat"
      numbering: "block_sequence", // TU 79
      startNumber: "1", // TU 84
      floorPriceIncreaseEnabled: true, // TU 137
      floorPriceIncreasePct: "1.5", // TU 138
    },
    "3", // TU 72
  );

  // TU 109-113 — birinci satır
  let slots = setSlotField(base.slots, 0, "layout", "3+1");
  slots = setSlotField(slots, 0, "grossAreaM2", "148");
  slots = setSlotField(slots, 0, "netAreaM2", "128");
  slots = setSlotField(slots, 0, "facing", "south");
  slots = setSlotField(slots, 0, "listPrice", "1280000");
  return { ...base, slots };
}

describe("buildBulkUnitBody — 🔴 GUARD 3: MALİYET SIZINTISI YASAK (karar 3)", () => {
  it("gövdede — SLOT'LAR DAHİL — maliyet/kâr adında hiçbir anahtar olamaz", () => {
    const forbidden = /cost|maliyet|profit|kar/i;

    for (const body of [
      buildBulkUnitBody(emptyBulkUnitFormValues(), EMPTY_RANGE),
      buildBulkUnitBody(mockupValues(), RANGE),
    ]) {
      expect(Object.keys(body).filter((key) => forbidden.test(key))).toEqual([]);
      for (const slot of body.slots ?? []) {
        expect(Object.keys(slot).filter((key) => forbidden.test(key))).toEqual([]);
      }
    }
  });

  it("maliyet FORM DURUMUNDA da yoktur — sızıntı yapısal olarak imkânsızdır", () => {
    const values = mockupValues();
    expect(Object.keys(values).filter((key) => /cost|profit|maliyet/i.test(key))).toEqual([]);
    for (const slot of values.slots) {
      expect(Object.keys(slot).filter((key) => /cost|profit|maliyet/i.test(key))).toEqual([]);
    }
  });
});

describe("buildBulkUnitBody — 🔴 GUARD 4: `site_id` TOPLU ÜRETİM GÖVDESİNE GİRMEZ", () => {
  it("TU 62 şantiyesi YALNIZ süzgeçtir; gövdede karşılığı yoktur", () => {
    const body = buildBulkUnitBody(mockupValues(), RANGE);
    expect(body).not.toHaveProperty("site_id");
    expect(body).not.toHaveProperty("siteId");
  });

  it("TU 61 projesi PATH parametresidir; gövdeye girmez", () => {
    const body = buildBulkUnitBody(mockupValues(), RANGE);
    expect(body).not.toHaveProperty("project_id");
    expect(body).not.toHaveProperty("projectId");
  });
});

describe("buildBulkUnitBody — 🔴 GUARD 5: SLOT DOKUNMA KAPISI", () => {
  it("dokunulmamış `layout`/`facing` seçicileri NULL'ı EZMEZ", () => {
    // Kullanıcı yalnız brüt m² yazdı: satır gövdeye girer ama seçicilerin
    // varsayılan görünen değerleri (`Güney`) anahtar olarak KONMAZ.
    const base = setUnitsPerFloor(emptyBulkUnitFormValues(), "2");
    const values = { ...base, slots: setSlotField(base.slots, 0, "grossAreaM2", "148") };

    const body = buildBulkUnitBody(values, RANGE);
    expect(body.slots).toHaveLength(2);
    expect(Object.keys(body.slots?.[0] ?? {}).sort()).toEqual(["gross_area_m2", "sequence"]);
    expect(body.slots?.[0]).not.toHaveProperty("facing");
    expect(body.slots?.[0]).not.toHaveProperty("layout");
    // Dokunulmamış ikinci satır YALNIZ sırasını taşır.
    expect(Object.keys(body.slots?.[1] ?? {})).toEqual(["sequence"]);
  });

  it("DOKUNULMUŞ seçici gövdeye girer", () => {
    const base = setUnitsPerFloor(emptyBulkUnitFormValues(), "1");
    const values = { ...base, slots: setSlotField(base.slots, 0, "facing", "west") };
    expect(buildBulkUnitBody(values, RANGE).slots?.[0].facing).toBe("west");
  });

  it("dokunulmuş ama BOŞ bırakılmış `layout` anahtar kurmaz", () => {
    const base = setUnitsPerFloor(emptyBulkUnitFormValues(), "1");
    const values = { ...base, slots: setSlotField(base.slots, 0, "layout", "   ") };
    expect(buildBulkUnitBody(values, RANGE).slots?.[0]).not.toHaveProperty("layout");
  });
});

describe("buildBulkUnitBody — `slots` gövdeye NE ZAMAN girer", () => {
  it("hiçbir hücre doldurulmadıysa `slots` HİÇ konmaz (ortak varsayılanlar yolu açık kalır)", () => {
    const values = setUnitsPerFloor(emptyBulkUnitFormValues(), "3");
    const body = buildBulkUnitBody(values, RANGE);
    expect(body).not.toHaveProperty("slots");
  });

  it("bir hücre bile doluysa TÜM satırlar gönderilir (sunucu len(slots)==units_per_floor ister)", () => {
    const body = buildBulkUnitBody(mockupValues(), RANGE);
    expect(body.slots).toHaveLength(3);
    expect(body.slots?.map((slot) => slot.sequence)).toEqual([1, 2, 3]);
  });

  it("dolu satır TU 109-113'ün değerlerini taşır", () => {
    const slot = buildBulkUnitBody(mockupValues(), RANGE).slots?.[0];
    expect(slot).toEqual({
      sequence: 1,
      layout: "3+1",
      gross_area_m2: "148",
      net_area_m2: "128",
      facing: "south",
      list_price: "1280000",
    });
  });
});

describe("buildBulkUnitBody — çatı sentinel'i ve zorunlu alanlar", () => {
  it("mockup bileşimi: 1..8 kat, 3 daire, {Blok}-{Sıra}", () => {
    const body = buildBulkUnitBody(mockupValues(), RANGE);
    expect(body.block_id).toBe("blk-c");
    expect(body.unit_kind).toBe("apartment");
    expect(body.start_floor).toBe(1);
    expect(body.end_floor).toBe(8);
    expect(body.roof_floor).toBe(false);
    expect(body.units_per_floor).toBe(3);
    expect(body.numbering).toBe("block_sequence");
    expect(body.start_number).toBe(1);
    expect(body.prefix).toBe(BULK_DEFAULT_PREFIX);
  });

  it("🔴 'Çatı Katı' seçimi `roof_floor=true` + en yüksek SAYISAL kattır", () => {
    const values = { ...mockupValues(), endFloor: ROOF_FLOOR_SENTINEL };
    const body = buildBulkUnitBody(values, RANGE);
    expect(body.roof_floor).toBe(true);
    expect(body.end_floor).toBe(8);
    // Sentinel metni gövdeye HİÇBİR ŞEKİLDE giremez.
    expect(JSON.stringify(body)).not.toContain(ROOF_FLOOR_SENTINEL);
  });

  it("boş form da gövde üretir; sayısal alanlar SUNUCUNUN REDDEDECEĞİ değerlerdir", () => {
    // KARAR 11 emsali: istemci "zorunlu alan" diye kaydı ENGELLEMEZ. Ama
    // seçilmemiş katı `0` ("Zemin") yapmak SESSİZCE YANLIŞ üretim demekti;
    // sunucu sınırlarının DIŞINDAKİ değer 422 döndürür ve hiçbir şey yazılmaz.
    const body = buildBulkUnitBody(emptyBulkUnitFormValues(), EMPTY_RANGE);
    expect(body.start_floor).toBe(BULK_UNSET_FLOOR);
    expect(body.end_floor).toBe(BULK_UNSET_FLOOR);
    expect(body.units_per_floor).toBe(BULK_UNSET_UNITS_PER_FLOOR);
    expect(BULK_UNSET_FLOOR).toBeLessThan(-5); // `Field(ge=-5)` dışı
    expect(BULK_UNSET_UNITS_PER_FLOOR).toBeLessThan(1); // `Field(ge=1)` dışı
  });

  it("boş formda hata fırlatmaz", () => {
    expect(() => buildBulkUnitBody(emptyBulkUnitFormValues(), EMPTY_RANGE)).not.toThrow();
  });

  it("'0' (Zemin) başlangıcı MEŞRUDUR ve olduğu gibi gider", () => {
    const values = { ...mockupValues(), startFloor: "0", endFloor: "0" };
    const body = buildBulkUnitBody(values, RANGE);
    expect(body.start_floor).toBe(0);
    expect(body.end_floor).toBe(0);
  });

  it("başlangıç numarası boşsa şema varsayılanı (1) gider", () => {
    const body = buildBulkUnitBody({ ...mockupValues(), startNumber: "" }, RANGE);
    expect(body.start_number).toBe(1);
  });

  it("başlangıç numarası 0 MEŞRUDUR (ge=0) — 1'e YUVARLANMAZ", () => {
    expect(buildBulkUnitBody({ ...mockupValues(), startNumber: "0" }, RANGE).start_number).toBe(0);
  });
});

describe("buildBulkUnitBody — TU 137/138 fiyat artışı", () => {
  it("kutucuk AÇIK + değer varsa gövdeye girer", () => {
    expect(buildBulkUnitBody(mockupValues(), RANGE).floor_price_increase_pct).toBe("1.5");
  });

  it("kutucuk KAPALIYSA değer yazılı olsa bile gövdeye GİRMEZ", () => {
    const values = { ...mockupValues(), floorPriceIncreaseEnabled: false };
    expect(buildBulkUnitBody(values, RANGE)).not.toHaveProperty("floor_price_increase_pct");
  });

  it("kutucuk açık ama değer boşsa anahtar KURULMAZ", () => {
    const values = { ...mockupValues(), floorPriceIncreasePct: "" };
    expect(buildBulkUnitBody(values, RANGE)).not.toHaveProperty("floor_price_increase_pct");
  });

  it("TR virgülü noktaya çevrilir", () => {
    const values = { ...mockupValues(), floorPriceIncreasePct: "1,5" };
    expect(buildBulkUnitBody(values, RANGE).floor_price_increase_pct).toBe("1.5");
  });
});

describe("buildBulkUnitBody — anahtar kümesi", () => {
  it("boş formun anahtar kümesi YALNIZ üretilmiş-tip zorunlularıdır", () => {
    expect(Object.keys(buildBulkUnitBody(emptyBulkUnitFormValues(), EMPTY_RANGE)).sort()).toEqual([
      "block_id",
      "end_floor",
      "numbering",
      "prefix",
      "roof_floor",
      "start_floor",
      "start_number",
      "unit_kind",
      "units_per_floor",
    ]);
  });

  it("ortak varsayılan alanları (layout/gross/net/list/appraisal) gövdeye HİÇ girmez", () => {
    const body = buildBulkUnitBody(mockupValues(), RANGE);
    for (const forbidden of [
      "layout",
      "gross_area_m2",
      "net_area_m2",
      "list_price",
      "appraisal_value",
    ]) {
      expect(body, forbidden).not.toHaveProperty(forbidden);
    }
  });
});
