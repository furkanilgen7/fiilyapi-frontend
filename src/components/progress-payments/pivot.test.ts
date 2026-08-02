import { describe, it, expect } from "vitest";

import { buildPivotRows, buildLinesSaveBody, rowQuantityTotal, rowAmountTotal } from "./pivot";
import type { ContractDistributionResponse } from "@/lib/api/hooks/useContract";
import type { ProgressPaymentLineDetail } from "@/lib/api/hooks/useProgressPayments";

const SITE_A = { id: "site-a", name: "A-Blok" };
const SITE_B = { id: "site-b", name: "B-Blok" };

const ITEM_1 = {
  id: "item-1",
  code: "03.001",
  description: "Kat Döşemesi C25/30",
  unit: "m³",
  quantity: "1500.000",
  unit_price: "1850.00",
  allocations: [
    { site_id: SITE_A.id, quantity: "900.000", boq_item_id: "boq-1" },
    { site_id: SITE_B.id, quantity: "420.000", boq_item_id: "boq-2" },
  ],
  remaining_quantity: "180.000",
};

// item-2 yalnız A-Blok'a dağıtılmış: B-Blok hücresi KAPALI olmalı.
const ITEM_2 = {
  id: "item-2",
  code: "03.002",
  description: "Kolon Betonu C30/37",
  unit: "m³",
  quantity: "300.000",
  unit_price: "2100.00",
  allocations: [{ site_id: SITE_A.id, quantity: "300.000", boq_item_id: "boq-3" }],
  remaining_quantity: "0.000",
};

const DISTRIBUTION: Pick<ContractDistributionResponse, "groups" | "sites"> = {
  sites: [SITE_A, SITE_B],
  groups: [
    { id: "g-1", name: "A — Betonarme İşleri", sort_order: 10, items: [ITEM_1, ITEM_2] },
  ],
};

function line(overrides: Partial<ProgressPaymentLineDetail>): ProgressPaymentLineDetail {
  return {
    id: "line-x",
    contract_item_id: ITEM_1.id,
    site_id: SITE_A.id,
    code: ITEM_1.code,
    description: ITEM_1.description,
    unit: ITEM_1.unit,
    contract_unit_price: ITEM_1.unit_price,
    coefficient: "1.000",
    quantity: "900.000",
    group_name: "A — Betonarme İşleri",
    sort_order: 0,
    adjusted_unit_price: ITEM_1.unit_price,
    line_total: "1665000.00",
    previous_quantity: "0.000",
    previous_amount: "0.00",
    cumulative_quantity: "900.000",
    cumulative_amount: "1665000.00",
    is_price_stale: false,
    ...overrides,
  };
}

describe("buildPivotRows", () => {
  it("her kalem için grup adı + site sayısı kadar hücre üretir", () => {
    const rows = buildPivotRows(DISTRIBUTION);
    expect(rows).toHaveLength(2);
    expect(rows[0].groupName).toBe("A — Betonarme İşleri");
    expect(rows[0].cells).toHaveLength(2);
  });

  it("tahsis VARSA hücre düzenlenebilir ve varsayılan miktar '0'dır", () => {
    const rows = buildPivotRows(DISTRIBUTION);
    const cellA = rows[0].cells.find((c) => c.siteId === SITE_A.id)!;
    expect(cellA.editable).toBe(true);
    expect(cellA.quantity).toBe("0");
  });

  it("tahsis YOKSA hücre kapalıdır (editable false, miktar boş)", () => {
    const rows = buildPivotRows(DISTRIBUTION);
    const item2Row = rows.find((r) => r.item.id === ITEM_2.id)!;
    const cellB = item2Row.cells.find((c) => c.siteId === SITE_B.id)!;
    expect(cellB.editable).toBe(false);
    expect(cellB.quantity).toBe("");
  });

  it("mevcut satır varsa hücre onun miktarıyla önceden doldurulur (edit kipi)", () => {
    const lines = [line({ site_id: SITE_A.id, quantity: "750.500" })];
    const rows = buildPivotRows(DISTRIBUTION, lines);
    const cellA = rows[0].cells.find((c) => c.siteId === SITE_A.id)!;
    expect(cellA.quantity).toBe("750.500");
    expect(cellA.lineTotal).toBe("1665000.00");
  });

  it("0 miktarlı mevcut satır da (silinmiş değil) '0' olarak doldurulur", () => {
    const lines = [line({ site_id: SITE_A.id, quantity: "0" })];
    const rows = buildPivotRows(DISTRIBUTION, lines);
    const cellA = rows[0].cells.find((c) => c.siteId === SITE_A.id)!;
    expect(cellA.quantity).toBe("0");
  });

  it("contract_item_id null olan (kopmuş) satır pivot'a yerleştirilmez", () => {
    const lines = [line({ contract_item_id: null, site_id: SITE_A.id })];
    const rows = buildPivotRows(DISTRIBUTION, lines);
    const cellA = rows[0].cells.find((c) => c.siteId === SITE_A.id)!;
    // kopmuş satır eşleşmediği için hücre varsayılan "0"a düşer, çökme yok
    expect(cellA.quantity).toBe("0");
  });
});

describe("buildLinesSaveBody — PUT …/lines DEĞİŞTİRME semantiği", () => {
  it("TÜM düzenlenebilir hücreleri içerir (kapalı hücreler HARİÇ)", () => {
    const rows = buildPivotRows(DISTRIBUTION);
    const body = buildLinesSaveBody(rows);
    // item-1: 2 editable hücre, item-2: 1 editable hücre → toplam 3
    expect(body).toHaveLength(3);
    expect(body.some((l) => l.contract_item_id === ITEM_2.id && l.site_id === SITE_B.id)).toBe(
      false,
    );
  });

  it("0 miktarlı hücre gövdeden DÜŞÜRÜLMEZ (0 meşrudur)", () => {
    const rows = buildPivotRows(DISTRIBUTION);
    const body = buildLinesSaveBody(rows);
    const zeroLine = body.find((l) => l.contract_item_id === ITEM_1.id && l.site_id === SITE_A.id);
    expect(zeroLine).toBeDefined();
    expect(zeroLine?.quantity).toBe("0");
  });

  it("aynı (kalem, şantiye) çifti gövdede yalnız BİR kez geçer (Map tekilleştirmesi)", () => {
    const rows = buildPivotRows(DISTRIBUTION);
    // Kasıtlı olarak aynı hücreyi iki kez içeren bozuk bir satır simüle edilir.
    const corrupted = [
      rows[0],
      { ...rows[0], cells: [...rows[0].cells] }, // aynı item-1 tekrar
    ];
    const body = buildLinesSaveBody(corrupted);
    const keys = body.map((l) => `${l.contract_item_id}::${l.site_id}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(body.filter((l) => l.contract_item_id === ITEM_1.id && l.site_id === SITE_A.id)).toHaveLength(
      1,
    );
  });

  it("boş pivot → boş gövde (hakedişin tüm satırlarını temizlemek meşru bir istektir)", () => {
    const body = buildLinesSaveBody([]);
    expect(body).toEqual([]);
  });
});

describe("rowQuantityTotal", () => {
  it("düzenlenebilir hücrelerin miktarını kuruş hassasiyetli toplar", () => {
    const lines = [line({ site_id: SITE_A.id, quantity: "900.500" }), line({ site_id: SITE_B.id, quantity: "420.250" })];
    const rows = buildPivotRows(DISTRIBUTION, lines);
    expect(rowQuantityTotal(rows[0])).toBe("1320.750");
  });
});

describe("rowAmountTotal", () => {
  it("hiç kaydedilmiş satır yoksa null döner (henüz hesaplanmadı)", () => {
    const rows = buildPivotRows(DISTRIBUTION);
    expect(rowAmountTotal(rows[0])).toBeNull();
  });

  it("kaydedilmiş satırların line_total'larını toplar (yeni çarpma yapmaz)", () => {
    const lines = [
      line({ site_id: SITE_A.id, line_total: "1665000.00" }),
      line({ site_id: SITE_B.id, line_total: "777000.00" }),
    ];
    const rows = buildPivotRows(DISTRIBUTION, lines);
    expect(rowAmountTotal(rows[0])).toBe("2442000.00");
  });
});
