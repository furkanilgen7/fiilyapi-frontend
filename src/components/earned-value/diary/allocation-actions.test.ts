import { describe, expect, it } from "vitest";

import { draftFromView, rowKey, setCell } from "./allocation-model";
import { bulkAssign, copyPreviousPattern, distributeRemaining } from "./allocation-actions";
import {
  GROUP_KAB,
  LEAF_BETON,
  LEAF_KALIP,
  LEAF_PRIZ_CAT,
  P_EMRE,
  P_MEHMET,
  P_RECEP,
  SUB_KAYA,
  dayView,
  personRow,
  previousAllocation,
} from "./diary-fixtures";

const MEHMET = rowKey("personnel", P_MEHMET);
const EMRE = rowKey("personnel", P_EMRE);
const RECEP = rowKey("personnel", P_RECEP);
const KAYA = rowKey("subcontractor", SUB_KAYA);
const allowAll = () => true;

describe("copyPreviousPattern — Dünkü dağılımı kopyala (B2-7, İ:712)", () => {
  it("yalnız boş/eksik satırları doldurur; tam satıra dokunmaz; eksik kod eklenir", () => {
    const view = dayView();
    const result = copyPreviousPattern(draftFromView(view), previousAllocation(), view.rows, allowAll);
    expect(result.filledRows).toBe(2);
    expect(result.draft.cells[MEHMET]).toEqual({ [LEAF_KALIP]: "11" }); // 9 + kalan 2
    expect(result.draft.cells[RECEP]).toEqual({ [LEAF_BETON]: "8" });
    expect(result.draft.cells[EMRE]).toEqual({ [GROUP_KAB]: "9" });
    expect(result.draft.cells[KAYA]).toBeUndefined();
    expect(result.draft.codes.at(-1)).toEqual({ node_id: LEAF_BETON, rule: "direct" });
  });

  it("paylar 0,5 sa adımıyla; artık en büyük paya", () => {
    const view = dayView({ rows: [personRow(P_RECEP, "Recep Uçar", "8.00")], cells: [], codes: [] });
    const prev = previousAllocation({
      codes: [
        { node_id: LEAF_KALIP, rule: "direct" },
        { node_id: LEAF_BETON, rule: "direct" },
      ],
      rows: [
        {
          kind: "personnel",
          ref_id: P_RECEP,
          shares: [
            { node_id: LEAF_KALIP, share: "0.6" },
            { node_id: LEAF_BETON, share: "0.4" },
          ],
        },
      ],
    });
    const result = copyPreviousPattern(draftFromView(view), prev, view.rows, allowAll);
    expect(result.draft.cells[RECEP]).toEqual({ [LEAF_KALIP]: "5", [LEAF_BETON]: "3" });
  });

  it("izinsiz kod (oransız/ağaçta yok) atlanır, pay kalanlara yeniden bölünür", () => {
    const view = dayView({ rows: [personRow(P_RECEP, "Recep Uçar", "8.00")], cells: [], codes: [] });
    const prev = previousAllocation({
      codes: [
        { node_id: LEAF_PRIZ_CAT, rule: "direct" },
        { node_id: LEAF_BETON, rule: "direct" },
      ],
      rows: [
        {
          kind: "personnel",
          ref_id: P_RECEP,
          shares: [
            { node_id: LEAF_PRIZ_CAT, share: "0.5" },
            { node_id: LEAF_BETON, share: "0.5" },
          ],
        },
      ],
    });
    const result = copyPreviousPattern(draftFromView(view), prev, view.rows, (id) => id !== LEAF_PRIZ_CAT);
    expect(result.draft.cells[RECEP]).toEqual({ [LEAF_BETON]: "8" });
    expect(result.draft.codes.map((c) => c.node_id)).toEqual([LEAF_BETON]);
  });

  it("önceki gönderilmiş gün yoksa taslak değişmez", () => {
    const view = dayView();
    const draft = draftFromView(view);
    const result = copyPreviousPattern(draft, previousAllocation({ day: null, rows: [], codes: [] }), view.rows, allowAll);
    expect(result).toEqual({ draft, filledRows: 0 });
  });
});

describe("distributeRemaining — Kalanı orantılı dağıt (İ:713, 0,5 sa)", () => {
  it("dolu satırda satırın kendi dağılımına, boş satırda kolon toplamlarına göre", () => {
    const view = dayView();
    const result = distributeRemaining(draftFromView(view), view.rows);
    expect(result.draft.cells[MEHMET]).toEqual({ [LEAF_KALIP]: "11" });
    expect(result.draft.cells[RECEP]).toEqual({ [GROUP_KAB]: "4", [LEAF_KALIP]: "4" });
    expect(result.draft.cells[KAYA]).toEqual({ [GROUP_KAB]: "28", [LEAF_KALIP]: "28" });
    expect(result.draft.cells[EMRE]).toEqual({ [GROUP_KAB]: "9" });
    expect(result.changedRows).toBe(3);
  });

  it("0,5 adımına sığmayan artık en büyük tabana eklenir (toplam korunur)", () => {
    const view = dayView({ rows: [personRow(P_RECEP, "Recep Uçar", "2.25")], cells: [] });
    const withBase = setCell(setCell(draftFromView(view), RECEP, GROUP_KAB, "0"), RECEP, LEAF_KALIP, "0");
    // taban yok, kolon toplamı da 0 → dokunulmaz
    expect(distributeRemaining(withBase, view.rows).changedRows).toBe(0);
    const other = rowKey("personnel", "other");
    const based = { ...withBase, cells: { [other]: { [GROUP_KAB]: "1", [LEAF_KALIP]: "1" } } };
    const rows = [...view.rows, personRow("other", "Diğer", "2.00")];
    const result = distributeRemaining(based, rows);
    expect(result.draft.cells[RECEP]).toEqual({ [GROUP_KAB]: "1,25", [LEAF_KALIP]: "1" });
  });
});

describe("bulkAssign — Seçili kişilere toplu ata (İ:718)", () => {
  it("seçili satırların hedef koduna saati YAZAR (üstüne eklemez)", () => {
    const view = dayView();
    const next = bulkAssign(draftFromView(view), [MEHMET, RECEP], LEAF_KALIP, "4");
    expect(next.cells[MEHMET]).toEqual({ [LEAF_KALIP]: "4" });
    expect(next.cells[RECEP]).toEqual({ [LEAF_KALIP]: "4" });
    expect(next.cells[EMRE]).toEqual({ [GROUP_KAB]: "9" });
  });
});
