import { describe, expect, it } from "vitest";

import {
  assignUnit,
  emptyAllocationState,
  setUnitShareholder,
  type LandShareUnitRow,
} from "./allocation-state";
import { buildAllocationBody, hasAllocationChanges } from "./build-body";

function unitRow(overrides: Partial<LandShareUnitRow> = {}): LandShareUnitRow {
  return {
    unit_id: "u-1",
    block_id: "blk-a",
    block_name: "A",
    unit_no: "A-9",
    unit_kind: "apartment",
    layout: "3+1",
    floor: "3",
    gross_area_m2: "148",
    appraisal_value: "1380000",
    owner_side: null,
    shareholder_id: null,
    shareholder_name: null,
    buyer_name: null,
    sales_status: "listed",
    ...overrides,
  };
}

const UNASSIGNED = unitRow({ unit_id: "u-1", unit_no: "A-9" });
const OURS = unitRow({ unit_id: "u-2", unit_no: "A-1", owner_side: "contractor" });
const THEIRS = unitRow({
  unit_id: "u-3",
  unit_no: "A-2",
  owner_side: "landowner",
  shareholder_id: "sh-1",
});
const ROWS: readonly LandShareUnitRow[] = [UNASSIGNED, OURS, THEIRS];

describe("buildAllocationBody — 🔴 GUARD 13: YALNIZ DEĞİŞEN satırlar gider", () => {
  it("sunucuda zaten `contractor` olan satırı yine `contractor` yapmak gövdeye GİRMEZ", () => {
    // Uç ATOMİKTİR (*"tek satir bile reddedilirse hicbiri yazilmaz"*):
    // gereksiz büyük gövde tüm kaydın yıkılma yüzeyini büyütür.
    const state = assignUnit(emptyAllocationState(), OURS, "contractor");
    expect(buildAllocationBody(ROWS, state).items).toEqual([]);
    expect(hasAllocationChanges(ROWS, state)).toBe(false);
  });

  it("gerçekten değişen satır gider", () => {
    const state = assignUnit(emptyAllocationState(), OURS, "landowner");
    expect(buildAllocationBody(ROWS, state).items).toEqual([
      { unit_id: "u-2", owner_side: "landowner", shareholder_id: null },
    ]);
    expect(hasAllocationChanges(ROWS, state)).toBe(true);
  });

  it("YALNIZ hissedarı değişen satır da DEĞİŞMİŞTİR", () => {
    const state = setUnitShareholder(emptyAllocationState(), THEIRS, "sh-2");
    expect(buildAllocationBody(ROWS, state).items).toEqual([
      { unit_id: "u-3", owner_side: "landowner", shareholder_id: "sh-2" },
    ]);
  });

  it("aynı hissedarı yeniden seçmek gövdeye satır EKLEMEZ", () => {
    const state = setUnitShareholder(emptyAllocationState(), THEIRS, "sh-1");
    expect(buildAllocationBody(ROWS, state).items).toEqual([]);
  });

  it("listede olmayan bekleyen atama gövdeye giremez (başka projenin ünitesi 404 üretirdi)", () => {
    const yabanci = unitRow({ unit_id: "u-99" });
    const state = assignUnit(emptyAllocationState(), yabanci, "contractor");
    expect(buildAllocationBody(ROWS, state).items).toEqual([]);
  });

  it("birden çok değişiklik listedeki SIRAYLA gider", () => {
    let state = assignUnit(emptyAllocationState(), UNASSIGNED, "contractor");
    state = assignUnit(state, THEIRS, "contractor");
    expect(buildAllocationBody(ROWS, state).items.map((item) => item.unit_id)).toEqual([
      "u-1",
      "u-3",
    ]);
  });
});

describe("buildAllocationBody — 🔴 GUARD 14: `owner_side: null` MEŞRU BİR DEĞERDİR", () => {
  it("atamayı kaldırmak gövdeye `null` olarak GİRER, düşürülmez", () => {
    const state = assignUnit(emptyAllocationState(), OURS, null);
    const items = buildAllocationBody(ROWS, state).items;
    expect(items).toHaveLength(1);
    expect(items[0].owner_side).toBeNull();
    // Doğruluk kontrolü (`if (ownerSide)`) `null`ı da `undefined`ı da eler;
    // burada anahtar VARDIR ve değeri `null`dır.
    expect(Object.keys(items[0])).toContain("owner_side");
    expect(items[0].owner_side).not.toBeUndefined();
  });

  it("zaten atanmamış satırı `null` yapmak DEĞİŞİKLİK DEĞİLDİR", () => {
    const state = assignUnit(emptyAllocationState(), UNASSIGNED, null);
    expect(buildAllocationBody(ROWS, state).items).toEqual([]);
  });

  it("arsa satırından çıkan ünitenin hissedarı AYNI istekte temizlenir", () => {
    const state = assignUnit(emptyAllocationState(), THEIRS, null);
    expect(buildAllocationBody(ROWS, state).items).toEqual([
      { unit_id: "u-3", owner_side: null, shareholder_id: null },
    ]);
  });
});

describe("buildAllocationBody — gövde biçimi", () => {
  it("hiçbir değişiklik yokken BOŞ liste döner (uç min_length=1 ister)", () => {
    const body = buildAllocationBody(ROWS, emptyAllocationState());
    expect(body).toEqual({ items: [] });
    expect(hasAllocationChanges(ROWS, emptyAllocationState())).toBe(false);
  });

  it("satırlarda YALNIZ üç sözleşme anahtarı bulunur", () => {
    const state = assignUnit(emptyAllocationState(), UNASSIGNED, "landowner");
    for (const item of buildAllocationBody(ROWS, state).items) {
      expect(Object.keys(item).sort()).toEqual(["owner_side", "shareholder_id", "unit_id"]);
    }
  });

  it("PG 270-272 PDF kutucuğu gövdeye anahtar EKLEMEZ", () => {
    const state = assignUnit(emptyAllocationState(), UNASSIGNED, "landowner");
    const body = buildAllocationBody(ROWS, state);
    expect(Object.keys(body)).toEqual(["items"]);
    expect(JSON.stringify(body)).not.toMatch(/pdf|tutanak/i);
  });

  it("girdileri MUTASYONA UĞRATMAZ", () => {
    const rows = ROWS.map((row) => ({ ...row }));
    const snapshot = JSON.parse(JSON.stringify(rows));
    const state = assignUnit(emptyAllocationState(), rows[0], "landowner");
    buildAllocationBody(rows, state);
    expect(rows).toEqual(snapshot);
  });
});
