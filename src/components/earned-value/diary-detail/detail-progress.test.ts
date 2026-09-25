import { describe, expect, it } from "vitest";

import { buildCodeIndex } from "../diary/code-tree";
import {
  GROUP_KAB,
  ITEM_BETON,
  ITEM_KALIP,
  LEAF_BETON,
  LEAF_KALIP,
  LEAF_PRIZ_CAT,
  P_EMRE,
  P_MEHMET,
  SEC_K610,
  SUB_KAYA,
  codeTree,
  dayView,
} from "../diary/diary-fixtures";
import { hourSummary, leafSectionId, sectionProgress } from "./detail-progress";

// DET-1.3 · Günlük kayıt detayının planlama türevleri — SAF.

describe("leafSectionId", () => {
  it("yaprak düğümünün bölümü; Bölümsüz yaprakta null; yaprak olmayan düğümde undefined", () => {
    expect(leafSectionId(LEAF_KALIP)).toBe(SEC_K610);
    expect(leafSectionId(LEAF_PRIZ_CAT)).toBeNull();
    expect(leafSectionId(GROUP_KAB)).toBeUndefined();
    expect(leafSectionId(`i:${ITEM_KALIP}`)).toBeUndefined();
  });
});

describe("sectionProgress — Kural A ara toplamı / KPI (bu bölüm)", () => {
  it("bölümün yapraklarının kazanılmış + harcanan toplamı; PF = kazanılmış ÷ harcanan", () => {
    const view = dayView();
    expect(sectionProgress(view.progress, SEC_K610)).toEqual({ earned: "79.05", spent: "18.0", pf: "4.3917" });
  });

  it("bölümde yaprak yoksa sıfır ve PF yok (sıfıra bölünmez)", () => {
    expect(sectionProgress(dayView().progress, "baska-bolum")).toEqual({ earned: "0", spent: "0", pf: null });
    expect(sectionProgress(null, SEC_K610)).toEqual({ earned: "0", spent: "0", pf: null });
  });
});

describe("hourSummary — S6 iş kodu başına tek satır", () => {
  const index = buildCodeIndex(codeTree());

  it("bu bölümün kodları ÖNCE (yaprak + altında bu bölüm yaprağı olan üst grup), diğerleri SONRA", () => {
    const view = dayView({
      codes: [
        { node_id: LEAF_PRIZ_CAT, rule: "direct", label: "Bölümsüz", level: 4 },
        { node_id: GROUP_KAB, rule: "prorata_by_daily_qty", label: "Betonarme işleri", level: 2 },
        { node_id: LEAF_KALIP, rule: "direct", label: "Kat 6–10", level: 4 },
      ],
    });
    const summary = hourSummary(view, index, SEC_K610);

    expect(summary.current.map((row) => row.nodeId)).toEqual([GROUP_KAB, LEAF_KALIP]);
    expect(summary.others.map((row) => row.nodeId)).toEqual([LEAF_PRIZ_CAT]);
  });

  it("yaprak satırı: harcanan/kazanılmış/PF motordan; doğrudan saat + grup payı ayrılır", () => {
    const summary = hourSummary(dayView(), index, SEC_K610);
    const kalip = summary.current.find((row) => row.nodeId === LEAF_KALIP);

    expect(kalip).toMatchObject({ isLeaf: true, spent: "13.5", earned: "79.05", pf: "0.9449", direct: 900, groupShare: 450 });
    expect(kalip?.short).toBe("Kalıp · Kat 6–10");
    expect(kalip?.code).toBe("KAB.01.01");
  });

  it("üst grup satırı: kazanılmış/PF yok, kip ve gruba yazılan saat taşınır", () => {
    const summary = hourSummary(dayView(), index, SEC_K610);
    const group = summary.current.find((row) => row.nodeId === GROUP_KAB);

    expect(group).toMatchObject({ isLeaf: false, rule: "prorata_by_daily_qty", direct: 900, earned: null, pf: null });
  });

  it("koda saat yazan taşeron firmaları kod satırında adıyla", () => {
    const view = dayView({
      cells: [
        { kind: "personnel", ref_id: P_MEHMET, node_id: LEAF_KALIP, hours: "9.00" },
        { kind: "subcontractor", ref_id: SUB_KAYA, node_id: LEAF_KALIP, hours: "4.50" },
        { kind: "personnel", ref_id: P_EMRE, node_id: GROUP_KAB, hours: "9.00" },
      ],
    });
    const kalip = hourSummary(view, index, SEC_K610).current.find((row) => row.nodeId === LEAF_KALIP);

    expect(kalip?.firms).toEqual(["Kaya Duvar"]);
    expect(kalip?.direct).toBe(1350);
  });

  it("bölüm bağlamı yoksa Kural A kurulmaz: hepsi tek grupta (current boş)", () => {
    const summary = hourSummary(dayView(), index, null);

    expect(summary.current).toEqual([]);
    expect(summary.others.map((row) => row.nodeId)).toEqual([GROUP_KAB, LEAF_KALIP]);
  });

  it("kod ağacında olmayan yaprak yine yaprak sayılır (backend uyarısı ayrı)", () => {
    const orphan = `l:${ITEM_BETON}:${SEC_K610}`;
    const view = dayView({ codes: [{ node_id: orphan, rule: "direct", label: "Kat 6–10", level: 4 }] });
    const summary = hourSummary(view, buildCodeIndex([]), SEC_K610);

    expect(summary.current[0]).toMatchObject({ nodeId: LEAF_BETON, isLeaf: true });
  });
});
