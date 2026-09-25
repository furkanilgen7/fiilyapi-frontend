import { describe, expect, it } from "vitest";

import { paginateByGroup } from "./paginate";

interface Row {
  group: string;
  id: string;
}

const row = (group: string, id: string): Row => ({ group, id });
const groupOf = (r: Row) => r.group;
const ids = (rows: readonly Row[]) => rows.map((r) => r.id);

describe("paginateByGroup — GİR miktar ağacı A4 sayfalaması (GİR:299-386)", () => {
  it("boş girdi → boş sayfa listesi", () => {
    expect(paginateByGroup([], 4, groupOf)).toEqual([]);
  });

  it("tam sığma — tek grup, kapasiteyi tam dolduruyor → tek sayfa, tek kırılmamış parça", () => {
    const rows = [row("A", "1"), row("A", "2"), row("A", "3"), row("A", "4")];
    const pages = paginateByGroup(rows, 4, groupOf);
    expect(pages).toHaveLength(1);
    expect(pages[0]).toHaveLength(1);
    expect(pages[0][0].continued).toBe(false);
    expect(ids(pages[0][0].rows)).toEqual(["1", "2", "3", "4"]);
  });

  it("taşma — ikinci grup kapasiteye sığmayınca TAMAMEN sonraki sayfaya geçer (grup bölünmez)", () => {
    const rows = [row("A", "1"), row("A", "2"), row("B", "3"), row("B", "4")];
    const pages = paginateByGroup(rows, 3, groupOf);
    expect(pages).toHaveLength(2);
    expect(pages[0]).toHaveLength(1);
    expect(ids(pages[0][0].rows)).toEqual(["1", "2"]);
    expect(pages[0][0].continued).toBe(false);
    expect(pages[1]).toHaveLength(1);
    expect(ids(pages[1][0].rows)).toEqual(["3", "4"]);
    expect(pages[1][0].continued).toBe(false);
  });

  it("tek grup kapasiteden büyük → grup zorunlu bölünür, ilk parça continued=false, sonrakiler true", () => {
    const rows = [row("A", "1"), row("A", "2"), row("A", "3"), row("A", "4"), row("A", "5")];
    const pages = paginateByGroup(rows, 2, groupOf);
    expect(pages).toHaveLength(3);
    expect(ids(pages[0][0].rows)).toEqual(["1", "2"]);
    expect(pages[0][0].continued).toBe(false);
    expect(ids(pages[1][0].rows)).toEqual(["3", "4"]);
    expect(pages[1][0].continued).toBe(true);
    expect(ids(pages[2][0].rows)).toEqual(["5"]);
    expect(pages[2][0].continued).toBe(true);
  });

  it("küçük gruplar aynı sayfada birikir (kapasite doluncaya dek)", () => {
    const rows = [row("A", "1"), row("B", "2"), row("C", "3")];
    const pages = paginateByGroup(rows, 5, groupOf);
    expect(pages).toHaveLength(1);
    expect(pages[0]).toHaveLength(3);
  });

  it("capacity <= 0 → RangeError", () => {
    expect(() => paginateByGroup([row("A", "1")], 0, groupOf)).toThrow(RangeError);
  });
});
