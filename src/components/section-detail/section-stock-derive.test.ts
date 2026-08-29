import { describe, it, expect } from "vitest";

import type { SectionStockRow } from "@/lib/api/hooks/useSectionStock";

import { boqLabel, totalsByItem } from "./section-stock-derive";

// STOK-BOLUM · `A1 › Malzeme` türevleri.

function row(overrides: Partial<SectionStockRow> = {}): SectionStockRow {
  return {
    item_id: "it-1",
    code: "DMR-0421",
    name: "Nervürlü Demir Ø12",
    category: "steel",
    unit: "Ton",
    boq_item_id: "bi-4",
    boq_code: "02.002",
    boq_description: "Demir Donatı",
    assigned_quantity: "10.000",
    issued_quantity: "4.000",
    net_quantity: "6.000",
    total_value: "320000.00",
    ...overrides,
  };
}

describe("totalsByItem", () => {
  it("ayni malzemenin POZ satirlarini toplar", () => {
    const totals = totalsByItem([
      row({ boq_item_id: "bi-1", assigned_quantity: "10.000", issued_quantity: "4.000" }),
      row({ boq_item_id: "bi-2", assigned_quantity: "5.500", issued_quantity: "1.250" }),
    ]);

    expect(totals).toHaveLength(1);
    expect(totals[0].assigned).toBe("15.500");
    expect(totals[0].issued).toBe("5.250");
    expect(totals[0].lineCount).toBe(2);
  });

  // 🔴 BU DİLİMİN ANA KURALI: iki etiket AYRI toplanır. Tek bir toplam
  // üretilseydi `+10 alım` ile `−4 sarf` birbirini götürür ve kart 4 birimin
  // harcandığını HİÇ söyleyemezdi.
  it("ATANAN ve SARF ayri toplanir - biri otekini GOTURMEZ", () => {
    const totals = totalsByItem([
      row({ assigned_quantity: "10.000", issued_quantity: "10.000", net_quantity: "0.000" }),
    ]);

    // Net SIFIR olsa bile iki sayı ayrı ayrı görünür kalır.
    expect(totals[0].assigned).toBe("10.000");
    expect(totals[0].issued).toBe("10.000");
    expect(totals[0].assigned).not.toBe("0.000");
  });

  it("farkli malzemeler AYRI satir olur ve SUNUCU SIRASI korunur", () => {
    const totals = totalsByItem([
      row({ item_id: "it-2", code: "CIM-1", name: "Çimento" }),
      row({ item_id: "it-1", code: "DMR-0421", name: "Demir" }),
    ]);

    expect(totals.map((t) => t.itemId)).toEqual(["it-2", "it-1"]);
  });

  // Ondalık toplama `Number` ile yapılsaydı 3 basamaklı miktarlarda kayan
  // nokta artığı üretirdi (`0.1 + 0.2 = 0.30000000000000004`).
  it("ondalik toplamada kayan nokta artigi URETMEZ", () => {
    const totals = totalsByItem([
      row({ assigned_quantity: "0.100", issued_quantity: "0.000" }),
      row({ boq_item_id: "bi-9", assigned_quantity: "0.200", issued_quantity: "0.000" }),
    ]);

    expect(totals[0].assigned).toBe("0.300");
  });

  it("bos kume bos dizi verir", () => {
    expect(totalsByItem([])).toEqual([]);
  });
});

describe("boqLabel", () => {
  it("kod ve aciklamayi birlestirir", () => {
    expect(boqLabel(row())).toBe("02.002 · Demir Donatı");
  });

  // Poz atfı YOKLUĞU MEŞRUDUR (backend fail-open) — `null` bir HATA değildir.
  it("poz atfi yoksa null verir (hata DEGIL, mesru hal)", () => {
    expect(
      boqLabel(row({ boq_item_id: null, boq_code: null, boq_description: null })),
    ).toBeNull();
  });

  it("yalniz biri doluysa DOLU olani basar - ayirac uydurulmaz", () => {
    expect(boqLabel(row({ boq_description: null }))).toBe("02.002");
    expect(boqLabel(row({ boq_code: null }))).toBe("Demir Donatı");
  });

  it("bosluktan ibaret alan DOLU sayilmaz", () => {
    expect(boqLabel(row({ boq_code: "   ", boq_description: null }))).toBeNull();
  });
});
