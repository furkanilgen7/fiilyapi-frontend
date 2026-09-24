import { describe, it, expect } from "vitest";
import {
  collectLeafIds,
  initialExpanded,
  selectionState,
  toggleExpanded,
  toggleSelection,
  visibleRows,
  type TreeNode,
} from "./tree-rows";

// Adam-Saat Bütçesi mockup'ının (601-640) dört seviyesi: disiplin › alt grup ›
// iş tipi › bölüm satırı (yaprak).
const TREE: readonly TreeNode<string>[] = [
  {
    id: "KAB",
    data: "Kaba İnşaat",
    children: [
      {
        id: "KAB.01",
        data: "Betonarme",
        children: [
          {
            id: "KAB.01.01",
            data: "Kalıp",
            children: [
              { id: "KAB.01.01-TML", data: "Temel" },
              { id: "KAB.01.01-K15", data: "Kat 1-5" },
            ],
          },
          { id: "KAB.01.02", data: "Demir", children: [{ id: "KAB.01.02-TML", data: "Temel" }] },
        ],
      },
    ],
  },
  { id: "GEN", data: "Genel / Dolaylı", children: [] },
];

const ids = (rows: readonly { id: string }[]) => rows.map((r) => r.id);

describe("visibleRows", () => {
  it("hiçbir düğüm açık değilse yalnız kökler görünür", () => {
    const rows = visibleRows(TREE, new Set());
    expect(ids(rows)).toEqual(["KAB", "GEN"]);
  });

  it("açık düğümün çocukları sırayla, derinlikleriyle görünür", () => {
    const rows = visibleRows(TREE, new Set(["KAB", "KAB.01"]));
    expect(ids(rows)).toEqual(["KAB", "KAB.01", "KAB.01.01", "KAB.01.02", "GEN"]);
    expect(rows.map((r) => r.depth)).toEqual([0, 1, 2, 2, 0]);
  });

  it("kapalı atanın altındaki açık düğüm GİZLİ kalır", () => {
    const rows = visibleRows(TREE, new Set(["KAB.01", "KAB.01.01"]));
    expect(ids(rows)).toEqual(["KAB", "GEN"]);
  });

  it("hasChildren boş çocuk dizisinde false (yaprak sayılır)", () => {
    const rows = visibleRows(TREE, new Set(["KAB"]));
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
    expect(byId.KAB.hasChildren).toBe(true);
    expect(byId.GEN.hasChildren).toBe(false);
  });

  it("expanded bayrağı yalnız çocuklu düğümde true olur", () => {
    const rows = visibleRows(TREE, new Set(["KAB", "GEN"]));
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
    expect(byId.KAB.expanded).toBe(true);
    expect(byId["KAB.01"].expanded).toBe(false);
    expect(byId.GEN.expanded).toBe(false);
  });

  it("parentId satıra taşınır", () => {
    const rows = visibleRows(TREE, new Set(["KAB"]));
    expect(rows.find((r) => r.id === "KAB.01")?.parentId).toBe("KAB");
    expect(rows.find((r) => r.id === "KAB")?.parentId).toBeNull();
  });
});

describe("initialExpanded", () => {
  it('"none" boş küme döndürür', () => {
    expect([...initialExpanded(TREE, "none")]).toEqual([]);
  });

  it('"all" yalnız çocuklu düğümleri açar', () => {
    expect([...initialExpanded(TREE, "all")].sort()).toEqual(
      ["KAB", "KAB.01", "KAB.01.01", "KAB.01.02"].sort(),
    );
  });

  it("sayı verilirse o derinliğin ÜSTÜNDEKİ düğümler açılır", () => {
    // 2 → derinlik 0 ve 1 açık: disiplin + alt grup (mockup ekran görüntüsü)
    expect([...initialExpanded(TREE, 2)].sort()).toEqual(["KAB", "KAB.01"]);
  });

  it("kimlik listesi verilirse aynen o küme kurulur", () => {
    expect([...initialExpanded(TREE, ["KAB.01"])]).toEqual(["KAB.01"]);
  });
});

describe("toggleExpanded", () => {
  it("kapalıyı açar, açığı kapatır ve GİRDİYİ DEĞİŞTİRMEZ", () => {
    const start: ReadonlySet<string> = new Set(["KAB"]);
    const opened = toggleExpanded(start, "KAB.01");
    expect([...opened].sort()).toEqual(["KAB", "KAB.01"]);
    const closed = toggleExpanded(opened, "KAB");
    expect([...closed]).toEqual(["KAB.01"]);
    expect([...start]).toEqual(["KAB"]);
    expect(opened).not.toBe(start);
  });
});

describe("collectLeafIds", () => {
  it("yaprak kendi kimliğini döndürür", () => {
    expect(collectLeafIds({ id: "x", data: "" })).toEqual(["x"]);
  });

  it("üst düğüm bütün alt yapraklarını sırayla döndürür", () => {
    expect(collectLeafIds(TREE[0])).toEqual(["KAB.01.01-TML", "KAB.01.01-K15", "KAB.01.02-TML"]);
  });
});

describe("selectionState — 3 durumlu türetme", () => {
  const kab = TREE[0];

  it("hiç yaprak seçili değilse unchecked", () => {
    expect(selectionState(kab, new Set())).toBe("unchecked");
  });

  it("bütün yapraklar seçiliyse checked", () => {
    expect(
      selectionState(kab, new Set(["KAB.01.01-TML", "KAB.01.01-K15", "KAB.01.02-TML"])),
    ).toBe("checked");
  });

  it("yaprakların bir kısmı seçiliyse indeterminate", () => {
    expect(selectionState(kab, new Set(["KAB.01.01-K15"]))).toBe("indeterminate");
  });

  it("ara düğüm kendi alt ağacına göre türetilir, kardeşe bakmaz", () => {
    const sel = new Set(["KAB.01.01-TML", "KAB.01.01-K15"]);
    const kalip = kab.children![0].children![0];
    const demir = kab.children![0].children![1];
    expect(selectionState(kalip, sel)).toBe("checked");
    expect(selectionState(demir, sel)).toBe("unchecked");
    expect(selectionState(kab, sel)).toBe("indeterminate");
  });

  it("yaprak düğüm yalnız checked/unchecked olur", () => {
    const leaf = { id: "L", data: "" };
    expect(selectionState(leaf, new Set(["L"]))).toBe("checked");
    expect(selectionState(leaf, new Set())).toBe("unchecked");
  });

  it("küme dışı bilinmeyen kimlikler durumu etkilemez", () => {
    expect(selectionState(kab, new Set(["BASKA"]))).toBe("unchecked");
  });
});

describe("toggleSelection", () => {
  const kab = TREE[0];
  const all = ["KAB.01.01-TML", "KAB.01.01-K15", "KAB.01.02-TML"];

  it("seçili olmayan üst düğüm bütün yapraklarını seçer", () => {
    expect([...toggleSelection(new Set(), kab)].sort()).toEqual([...all].sort());
  });

  it("kısmen seçili üst düğüm tıklanınca HEPSİNİ seçer (mockup 601 cbFor)", () => {
    const next = toggleSelection(new Set(["KAB.01.01-K15"]), kab);
    expect([...next].sort()).toEqual([...all].sort());
  });

  it("tamamen seçili üst düğüm yapraklarını kaldırır, alt ağaç dışını KORUR", () => {
    const next = toggleSelection(new Set([...all, "DUV.01-TML"]), kab);
    expect([...next]).toEqual(["DUV.01-TML"]);
  });

  it("girdi kümesini değiştirmez", () => {
    const start: ReadonlySet<string> = new Set(["KAB.01.01-K15"]);
    const next = toggleSelection(start, kab);
    expect([...start]).toEqual(["KAB.01.01-K15"]);
    expect(next).not.toBe(start);
  });
});
