import { describe, expect, it } from "vitest";

import type { SiteDiaryLineRead } from "@/lib/api/hooks/useSiteDiary";

import { buildDetailLineGroups } from "./lines-derive";

// DET-1.3 · Kural A (kullanıcı kararı): miktar tablosunda ÖNCE bu bölümün
// satırları + ara toplam, SONRA "Diğer bölümler" (soluk), altta günün toplamı.

const K610 = { id: "k610", name: "Kat 6–10 Kaba İnşaat" };

function line(overrides: Partial<SiteDiaryLineRead>): SiteDiaryLineRead {
  return {
    id: "l",
    boq_item_id: "boq",
    code: "KAB.01.01",
    description: "Kalıp",
    unit: "m²",
    unit_price: "185.00",
    quantity: "93.000",
    cumulative_quantity: "1273.000",
    leaf_cumulative_quantity: null,
    planned_quantity: "5300.000",
    remaining_quantity: "4027.000",
    line_amount: "17205.00",
    overrun_reason: null,
    section_id: "k610",
    section_name: "Kat 6–10",
    ...overrides,
  };
}

const LINES = [
  line({ id: "o1", section_id: "k15", section_name: "Kat 1–5", description: "Buat/priz", line_amount: "2090.00" }),
  line({ id: "c1", line_amount: "17205.00" }),
  line({ id: "o2", section_id: null, section_name: null, description: "Genel", line_amount: "570.00" }),
  line({ id: "c2", description: "Demir", line_amount: "73100.00" }),
];

describe("buildDetailLineGroups — Kural A", () => {
  it("bu bölümün satırları ÖNCE, diğer bölümler SONRA; iki grupta da kayıt sırası korunur", () => {
    const groups = buildDetailLineGroups({ lines: LINES, lines_total: "92965.00" }, K610);

    expect(groups.current?.rows.map((row) => row.lineId)).toEqual(["c1", "c2"]);
    expect(groups.others.map((row) => row.lineId)).toEqual(["o1", "o2"]);
    expect(groups.current?.sectionName).toBe("Kat 6–10 Kaba İnşaat");
  });

  it("ara toplam YALNIZ bu bölümün Hakediş ₺'sidir; gün toplamı kaydın lines_total'ıdır (istemci toplamaz)", () => {
    const groups = buildDetailLineGroups({ lines: LINES, lines_total: "92965.00" }, K610);

    expect(groups.current?.amountTotal).toBe("90305.00");
    expect(groups.dayAmountTotal).toBe("92965.00");
    expect(groups.totalCount).toBe(4);
  });

  it("Bölümsüz satırın etiketi 'Bölümsüz', bölümlü satırın etiketi satırın bölüm adı", () => {
    const groups = buildDetailLineGroups({ lines: LINES, lines_total: "0" }, K610);

    expect(groups.others.map((row) => row.sectionLabel)).toEqual(["Kat 1–5", "Bölümsüz"]);
  });

  it("bölüm bağlamı yoksa (bölüm okunamadı) Kural A kurulmaz: current=null, satırların hepsi sırayla", () => {
    const groups = buildDetailLineGroups({ lines: LINES, lines_total: "0" }, undefined);

    expect(groups.current).toBeNull();
    expect(groups.others.map((row) => row.lineId)).toEqual(["o1", "c1", "o2", "c2"]);
  });

  it("bu bölümde satır yoksa grup BOŞ döner (hâl k: boş gövde + altında diğerleri)", () => {
    const groups = buildDetailLineGroups({ lines: [LINES[0]], lines_total: "2090.00" }, K610);

    expect(groups.current?.rows).toEqual([]);
    expect(groups.current?.amountTotal).toBe("0");
    expect(groups.others).toHaveLength(1);
  });
});

describe("buildDetailLineGroups — satır türevleri", () => {
  it("kümülatif = yaprak kümülatifi (varsa); kalan backend'den", () => {
    const [row] = buildDetailLineGroups(
      { lines: [line({ leaf_cumulative_quantity: "200.000", cumulative_quantity: "900.000" })], lines_total: "0" },
      K610,
    ).current!.rows;

    expect(row.cumulative).toBe("200.000");
    expect(row.remaining).toBe("4027.000");
  });

  it("planlı aşıldıysa aşım miktarı + gerekçe (İ:236-237); aşılmadıysa null", () => {
    const over = line({
      id: "x",
      cumulative_quantity: "1212.000",
      planned_quantity: "1200.000",
      remaining_quantity: "-12.000",
      overrun_reason: "proje revizyonu, ilave priz",
    });
    const [overRow, normalRow] = buildDetailLineGroups({ lines: [over, line({})], lines_total: "0" }, K610).current!
      .rows;

    expect(overRow.overrunExcess).toBe("12.000");
    expect(overRow.overrunReason).toBe("proje revizyonu, ilave priz");
    expect(normalRow.overrunExcess).toBeNull();
  });

  it("kalan backend'de yoksa planlı − kümülatif türetilir; planlı da yoksa null", () => {
    const rows = buildDetailLineGroups(
      {
        lines: [
          line({ id: "a", remaining_quantity: null, planned_quantity: "10", cumulative_quantity: "4" }),
          line({ id: "b", remaining_quantity: null, planned_quantity: null }),
        ],
        lines_total: "0",
      },
      K610,
    ).current!.rows;

    expect(rows[0].remaining).toBe("6");
    expect(rows[1].remaining).toBeNull();
    expect(rows[1].overrunExcess).toBeNull();
  });
});
