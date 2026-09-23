import { describe, expect, it } from "vitest";

import {
  ALLOCATION_LEFT_UNASSIGNED_MESSAGE,
  ALLOCATION_SKIPPED_WITHOUT_VALUE_MESSAGE,
} from "./constants";
import {
  assignUnit,
  effectiveAllocation,
  emptyAllocationState,
  type LandShareUnitRow,
} from "./allocation-state";
import { autoDistribute } from "./auto-distribute";

function unitRow(
  unitId: string,
  appraisal: string | null,
  overrides: Partial<LandShareUnitRow> = {},
): LandShareUnitRow {
  return {
    unit_id: unitId,
    block_id: "blk-a",
    block_name: "A",
    unit_no: unitId.toUpperCase(),
    unit_kind: "apartment",
    layout: "3+1",
    floor: "3",
    gross_area_m2: "148",
    appraisal_value: appraisal,
    owner_side: null,
    shareholder_id: null,
    shareholder_name: null,
    buyer_name: null,
    sales_status: "listed",
    ...overrides,
  };
}

/**
 * 10 ünite · sözleşme %55/%45 · DÖRDÜ zaten atanmış (ikisi bizde, ikisi arsa
 * sahibinde, dördü de 1.000.000 rayiçli). Kalan altısı 600/500/400/300/200/100
 * bin rayiçli. Sunucunun beklenen adetleri: bize 6, arsa sahibine 4.
 */
const ROWS: readonly LandShareUnitRow[] = [
  unitRow("u1", "1000000", { owner_side: "contractor" }),
  unitRow("u2", "1000000", { owner_side: "contractor" }),
  unitRow("u3", "1000000", { owner_side: "landowner" }),
  unitRow("u4", "1000000", { owner_side: "landowner" }),
  unitRow("u5", "600000"),
  unitRow("u6", "500000"),
  unitRow("u7", "400000"),
  unitRow("u8", "300000"),
  unitRow("u9", "200000"),
  unitRow("u10", "100000"),
];

const TARGETS = {
  ourSharePct: "55.00",
  ourExpectedCount: 6,
  ownerExpectedCount: 4,
  // SUNUCUNUN proje geneli sayıları — bu fixture'da görünen satırlarla AYNI
  // (süzgeç "Tümü"), yani fark uygulanmaz ve sonuç değişmez.
  ourAssignedCount: 2,
  ownerAssignedCount: 2,
  ourAssignedValue: "2000000",
  ownerAssignedValue: "2000000",
};

function countBySide(rows: readonly LandShareUnitRow[], state: ReturnType<typeof emptyAllocationState>) {
  let ours = 0;
  let theirs = 0;
  let unassigned = 0;
  for (const row of rows) {
    const side = effectiveAllocation(row, state).ownerSide;
    if (side === "contractor") ours += 1;
    else if (side === "landowner") theirs += 1;
    else unassigned += 1;
  }
  return { ours, theirs, unassigned };
}

describe("autoDistribute — 🔴 GUARD 12: adetler ELLE yazılmış beklentilerdir", () => {
  const result = autoDistribute({ rows: ROWS, state: emptyAllocationState(), ...TARGETS });

  it("altı atanmamış üniteden DÖRDÜ bize, İKİSİ arsa sahibine gider", () => {
    expect(result.assignedToUs).toHaveLength(4);
    expect(result.assignedToOwner).toHaveLength(2);
  });

  it("dağıtımdan sonra toplam adetler sözleşme hedefini TAM tutar: 6 / 4 / 0", () => {
    const counts = countBySide(ROWS, result.state);
    expect(counts.ours).toBe(6);
    expect(counts.theirs).toBe(4);
    expect(counts.unassigned).toBe(0);
  });

  it("değer sırası kullanılır: en büyük rayiçli ünite değer açığı EN BÜYÜK tarafa gider", () => {
    // Elle izlendi (rayiç DESC: 600k → 500k → 400k → 300k → 200k → 100k):
    // 600k bize · 500k arsaya · 400k bize · 300k bize · 200k arsaya · 100k bize.
    expect([...result.assignedToUs]).toEqual(["u5", "u7", "u8", "u10"]);
    expect([...result.assignedToOwner]).toEqual(["u6", "u9"]);
  });

  it("hiçbir ünite atanmadan kalmaz ve uyarı üretilmez", () => {
    expect(result.leftUnassigned).toEqual([]);
    expect(result.skippedWithoutValue).toEqual([]);
    expect(result.notices).toEqual([]);
  });

  it("ZATEN atanmış satırlara DOKUNULMAZ", () => {
    for (const unitId of ["u1", "u2", "u3", "u4"]) {
      expect(result.state.pending.has(unitId)).toBe(false);
    }
  });
});

describe("autoDistribute — 🔴 rayiç değeri OLMAYAN ünite SIFIR SAYILMAZ", () => {
  const rows: readonly LandShareUnitRow[] = [
    unitRow("a1", "1000000", { owner_side: "contractor" }),
    unitRow("a2", "1000000", { owner_side: "landowner" }),
    unitRow("a3", "600000"),
    unitRow("a4", "400000"),
    unitRow("a5", null), // rayiç GİRİLMEMİŞ
  ];

  const result = autoDistribute({
    rows,
    state: emptyAllocationState(),
    ourSharePct: "55.00",
    ourExpectedCount: 3,
    ownerExpectedCount: 2,
    ourAssignedCount: 1,
    ownerAssignedCount: 1,
    ourAssignedValue: "1000000",
    ownerAssignedValue: "1000000",
  });

  it("değersiz ünite dağıtıma GİRMEZ ve bekleyen atama almaz", () => {
    expect([...result.skippedWithoutValue]).toEqual(["a5"]);
    expect(result.state.pending.has("a5")).toBe(false);
    expect(effectiveAllocation(rows[4], result.state).ownerSide).toBeNull();
  });

  it("atlanan ünite kullanıcıya GÖRÜNÜR bir cümleyle bildirilir", () => {
    expect(result.notices).toContain(ALLOCATION_SKIPPED_WITHOUT_VALUE_MESSAGE);
  });

  it("değeri olan iki ünite yine dağıtılır", () => {
    expect(result.assignedToUs.length + result.assignedToOwner.length).toBe(2);
  });
});

describe("autoDistribute — hedefler dolduğunda", () => {
  it("fazla üniteler ATANMADAN bırakılır ve bu SÖYLENİR", () => {
    const rows: readonly LandShareUnitRow[] = [
      unitRow("b1", "500000"),
      unitRow("b2", "400000"),
      unitRow("b3", "300000"),
    ];
    const result = autoDistribute({
      rows,
      state: emptyAllocationState(),
      ourSharePct: "55.00",
      ourExpectedCount: 1,
      ownerExpectedCount: 1,
      ourAssignedCount: 0,
      ownerAssignedCount: 0,
      ourAssignedValue: "0",
      ownerAssignedValue: "0",
    });

    expect(result.assignedToUs.length + result.assignedToOwner.length).toBe(2);
    expect(result.leftUnassigned).toHaveLength(1);
    expect(result.notices).toContain(ALLOCATION_LEFT_UNASSIGNED_MESSAGE);
  });

  it("hedefler zaten dolmuşsa hiçbir şey atanmaz", () => {
    const rows: readonly LandShareUnitRow[] = [
      unitRow("c1", "500000", { owner_side: "contractor" }),
      unitRow("c2", "400000", { owner_side: "landowner" }),
      unitRow("c3", "300000"),
    ];
    const result = autoDistribute({
      rows,
      state: emptyAllocationState(),
      ourSharePct: "55.00",
      ourExpectedCount: 1,
      ownerExpectedCount: 1,
      ourAssignedCount: 1,
      ownerAssignedCount: 1,
      ourAssignedValue: "500000",
      ownerAssignedValue: "400000",
    });
    expect(result.assignedToUs).toEqual([]);
    expect(result.assignedToOwner).toEqual([]);
    expect([...result.leftUnassigned]).toEqual(["c3"]);
  });
});

describe("autoDistribute — 🔴 SUNUCUYA HİÇBİR ŞEY YAZILMAZ", () => {
  it("yalnız BEKLEYEN durum üretir; satırlar dokunulmadan kalır", () => {
    const rows = ROWS.map((row) => ({ ...row }));
    const snapshot = JSON.parse(JSON.stringify(rows));
    const result = autoDistribute({ rows, state: emptyAllocationState(), ...TARGETS });

    // Atamalar YALNIZ bekleyen eşlemede yaşar; sunucu satırları değişmedi.
    expect(rows).toEqual(snapshot);
    expect(result.state.pending.size).toBe(6);
    for (const row of rows) expect(row.owner_side).toBe(snapshot.find((r: LandShareUnitRow) => r.unit_id === row.unit_id).owner_side);
  });

  it("senkron bir işlevdir — söz (Promise) döndürmez, ağ çağrısı yapmaz", () => {
    const result = autoDistribute({ rows: ROWS, state: emptyAllocationState(), ...TARGETS });
    expect(result).not.toBeInstanceOf(Promise);
    expect(typeof (result as { then?: unknown }).then).toBe("undefined");
  });

  it("önceden yapılmış BEKLEYEN atamalar korunur ve dağıtımda ATANMIŞ sayılır", () => {
    const before = assignUnit(emptyAllocationState(), ROWS[4], "contractor"); // u5 → biz
    const result = autoDistribute({ rows: ROWS, state: before, ...TARGETS });

    expect(result.assignedToUs).not.toContain("u5");
    expect(effectiveAllocation(ROWS[4], result.state).ownerSide).toBe("contractor");
    expect(countBySide(ROWS, result.state).unassigned).toBe(0);
  });
});

/**
 * 🔴 KUSUR 76 — VARSAYILAN SÜZGEÇ ("Atanmayan") LİSTEDE ATANMIŞ SATIR
 * BIRAKMAZ. Sayaçlar yalnız GÖRÜNEN satırlardan doldurulursa `remainingOur`
 * TÜM hedefi sayar ve dağıtım AŞIRI ATAMA üretir. Hedefler de, zaten atanmış
 * adet/değer de SUNUCUDAN gelir (`LandShareCountBalance` · `LandShareValueBalance`)
 * ve süzgeçten BAĞIMSIZDIR (`land_share.py:213`).
 */
describe("autoDistribute — 🔴 ZATEN ATANMIŞ ÜNİTELER SÜZGEÇ YÜZÜNDEN GÖRÜNMESE DE SAYILIR", () => {
  // 42 ünite · %55/%45 → hedef 23 / 19. Noter sonrası 24'ü elle girilmiş
  // (22 bize, 2 arsa sahibine); ekranda YALNIZ 18 atanmamış satır görünür.
  const rows: readonly LandShareUnitRow[] = Array.from({ length: 18 }, (_, index) =>
    unitRow(`v${String(index + 1).padStart(2, "0")}`, String(1_000_000 - (index + 1) * 10_000)),
  );

  const result = autoDistribute({
    rows,
    state: emptyAllocationState(),
    ourSharePct: "55.00",
    ourExpectedCount: 23,
    ownerExpectedCount: 19,
    ourAssignedCount: 22,
    ownerAssignedCount: 2,
    ourAssignedValue: "22000000",
    ownerAssignedValue: "2000000",
  });

  it("kalan kapasite SUNUCUNUN atanmış adetlerinden düşülür: 1 bize, 17 arsa sahibine", () => {
    expect(result.assignedToUs).toHaveLength(1);
    expect(result.assignedToOwner).toHaveLength(17);
  });

  it("hedef aşılmaz: 18 ünite tam kapasiteye oturur, atanmadan kalan YOKTUR", () => {
    expect(result.leftUnassigned).toEqual([]);
    expect(result.state.pending.size).toBe(18);
  });
});

describe("autoDistribute — 🔴 DEĞER DENGESİ de sunucudan TOHUMLANIR", () => {
  // Adet kapasitesi İKİ TARAFTA DA EŞİT (4/4) — tek ayrım zaten atanmış DEĞER.
  const rows: readonly LandShareUnitRow[] = [
    unitRow("w1", "500000"),
    unitRow("w2", "500000"),
    unitRow("w3", "500000"),
    unitRow("w4", "500000"),
  ];

  const result = autoDistribute({
    rows,
    state: emptyAllocationState(),
    ourSharePct: "50.00",
    ourExpectedCount: 6,
    ownerExpectedCount: 6,
    ourAssignedCount: 2,
    ownerAssignedCount: 2,
    // Bizim iki ünitemiz PAHALI, arsa sahibininki UCUZ: değer açığı ONDA.
    ourAssignedValue: "3000000",
    ownerAssignedValue: "1000000",
  });

  it("değerce GERİDE olan taraf önceliklidir — dördü de arsa sahibine gider", () => {
    expect([...result.assignedToOwner]).toEqual(["w1", "w2", "w3", "w4"]);
    expect(result.assignedToUs).toEqual([]);
  });
});
