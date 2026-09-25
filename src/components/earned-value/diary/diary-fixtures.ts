import type { EvCodeNode, EvDayRow, EvDayView, EvPreviousAllocation } from "@/lib/api/models";

/**
 * PLN-F2.3 · Saat Dağıtımı testlerinin ORTAK örnek verisi (yalnız testler ithal
 * eder; `vitest` import ETMEZ). Değerler mockup İ:594-603'ün küçültülmüş
 * karşılığıdır: kalıpçı/betoncu kendi ekibi + bir taşeron firma satırı.
 */
export const SITE_ID = "11111111-1111-4111-8111-111111111111";
export const DAY = "2026-09-24";

export const ITEM_KALIP = "aaaaaaaa-0000-4000-8000-000000000001";
export const ITEM_BETON = "aaaaaaaa-0000-4000-8000-000000000002";
export const ITEM_PRIZ = "aaaaaaaa-0000-4000-8000-000000000003";
export const SEC_K610 = "bbbbbbbb-0000-4000-8000-000000000001";
export const GROUP_KAB = "g:cccccccc-0000-4000-8000-000000000001";
export const LEAF_KALIP = `l:${ITEM_KALIP}:${SEC_K610}`;
export const LEAF_BETON = `l:${ITEM_BETON}:${SEC_K610}`;
/** Oransız yaprak (İ:602 `ELK.01.02-CAT`, `rate: null`). */
export const LEAF_PRIZ_CAT = `l:${ITEM_PRIZ}:none`;

export const P_MEHMET = "dddddddd-0000-4000-8000-000000000001";
export const P_EMRE = "dddddddd-0000-4000-8000-000000000002";
export const P_RECEP = "dddddddd-0000-4000-8000-000000000003";
export const SUB_KAYA = "eeeeeeee-0000-4000-8000-000000000001";

export function personRow(refId: string, label: string, hours: string, extra: Partial<EvDayRow> = {}): EvDayRow {
  return {
    kind: "personnel",
    ref_id: refId,
    label,
    trade: "Kalıpçı",
    source: "company",
    subcontractor_name: null,
    headcount: null,
    hours,
    saved_hours: null,
    changed: false,
    ...extra,
  };
}

export function subRow(refId: string, label: string, headcount: number, hours: string): EvDayRow {
  return {
    kind: "subcontractor",
    ref_id: refId,
    label,
    trade: "Duvar",
    source: "subcontractor",
    subcontractor_name: label,
    headcount,
    hours,
    saved_hours: null,
    changed: false,
  };
}

export function dayView(overrides: Partial<EvDayView> = {}): EvDayView {
  return {
    day: DAY,
    day_no: 142,
    week_no: 21,
    has_baseline: true,
    revision_number: 1,
    lock: { locked: false, report_date: null, approved_at: null, approved_by: null, unlock: null },
    rows: [
      personRow(P_MEHMET, "Mehmet Demir", "11.00", { saved_hours: "9.00", changed: true }),
      personRow(P_EMRE, "Emre Koç", "9.00", { trade: "Betoncu" }),
      personRow(P_RECEP, "Recep Uçar", "8.00", { trade: "Yardımcı" }),
      subRow(SUB_KAYA, "Kaya Duvar", 7, "56.00"),
    ],
    codes: [
      { node_id: GROUP_KAB, rule: "prorata_by_daily_qty", label: "Betonarme işleri", level: 2 },
      { node_id: LEAF_KALIP, rule: "direct", label: "Kat 6–10", level: 4 },
    ],
    cells: [
      { kind: "personnel", ref_id: P_MEHMET, node_id: LEAF_KALIP, hours: "9.00" },
      { kind: "personnel", ref_id: P_EMRE, node_id: GROUP_KAB, hours: "9.00" },
    ],
    totals: { source_hours: "84.00", allocated_hours: "18.00", unallocated_hours: "66.00" },
    unallocated_reason: null,
    warnings: [],
    progress: {
      earned_day: "79.05",
      spent_day: "18.00",
      pf_day: "4.39",
      leaves: [
        { node_id: LEAF_KALIP, qty_day: "93", earned_day: "79.05", spent_day: "13.5", pf_day: "0.9449" },
        { node_id: LEAF_BETON, qty_day: "0", earned_day: "0", spent_day: "4.5", pf_day: "0" },
      ],
    },
    submit: { can_submit: true, reasons: [] },
    ...overrides,
  };
}

/** Kod ağacı — İ:597-603 hiyerarşisi (disiplin · grup · kalem · yaprak). */
export function codeTree(): EvCodeNode[] {
  const leaf = (id: string, parent: string, label: string, hasRate: boolean): EvCodeNode => ({
    id,
    parent_id: parent,
    level: 4,
    code: null,
    label,
    uom: "m²",
    has_rate: hasRate,
    unit_mhr: hasRate ? "0.85" : null,
  });
  const item = (id: string, code: string, label: string): EvCodeNode => ({
    id: `i:${id}`,
    parent_id: GROUP_KAB,
    level: 3,
    code,
    label,
    uom: "m²",
    has_rate: null,
    unit_mhr: null,
  });
  return [
    { id: "d:kaba", parent_id: null, level: 1, code: "KAB", label: "Kaba İnşaat", uom: null, has_rate: null, unit_mhr: null },
    { id: GROUP_KAB, parent_id: "d:kaba", level: 2, code: null, label: "Betonarme işleri", uom: null, has_rate: null, unit_mhr: null },
    item(ITEM_KALIP, "KAB.01.01", "Kalıp"),
    leaf(LEAF_KALIP, `i:${ITEM_KALIP}`, "Kat 6–10", true),
    item(ITEM_BETON, "KAB.01.03", "Beton döküm"),
    leaf(LEAF_BETON, `i:${ITEM_BETON}`, "Kat 6–10", true),
    item(ITEM_PRIZ, "ELK.01.02", "Buat/priz montajı"),
    leaf(LEAF_PRIZ_CAT, `i:${ITEM_PRIZ}`, "Bölümsüz", false),
  ];
}

export function previousAllocation(overrides: Partial<EvPreviousAllocation> = {}): EvPreviousAllocation {
  return {
    day: "2026-09-22",
    codes: [{ node_id: LEAF_BETON, rule: "direct" }],
    rows: [
      { kind: "personnel", ref_id: P_RECEP, shares: [{ node_id: LEAF_BETON, share: "1" }] },
      { kind: "personnel", ref_id: P_MEHMET, shares: [{ node_id: LEAF_KALIP, share: "1" }] },
    ],
    ...overrides,
  };
}
