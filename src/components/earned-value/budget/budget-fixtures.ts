import type {
  EvBudgetView,
  EvRevisionDiffOut,
  EvRevisionOut,
  EvScheduleOut,
  EvPreviewOut,
} from "@/lib/api/models";

// PLN-F1.6 · Adam-Saat Bütçesi testlerinin ORTAK fikstürü (yalnız testler
// ithal eder). Değerler mockup örnek verisinden (Adam-Saat Bütçesi.dc.html:
// 526-536) ve Ek Formlar M1/M4'ten alınmıştır.

export const D_KAB = "11111111-0000-0000-0000-00000000000a";
export const D_DUV = "11111111-0000-0000-0000-00000000000b";
export const G_BET = "22222222-0000-0000-0000-000000000001";
export const G_IZO = "22222222-0000-0000-0000-000000000002";
export const G_GEN = "22222222-0000-0000-0000-000000000003";
export const I_BETON = "33333333-0000-0000-0000-000000000001";
export const I_MOBIL = "33333333-0000-0000-0000-000000000002";
export const I_IZO = "33333333-0000-0000-0000-000000000003";
export const S_TML = "44444444-0000-0000-0000-000000000001";
export const S_CAT = "44444444-0000-0000-0000-000000000004";

export const LEAF_TML = `l:${I_BETON}:${S_TML}`;
export const LEAF_CAT = `l:${I_BETON}:${S_CAT}`;
export const LEAF_MOBIL = `l:${I_MOBIL}:none`;
export const LEAF_IZO = `l:${I_IZO}:none`;

export function revision(over: Partial<EvRevisionOut> = {}): EvRevisionOut {
  return {
    id: "rev-2",
    number: 2,
    status: "draft",
    name: "Rev 2 — Temel beton revizyonu",
    description: null,
    created_at: "2026-09-20T08:00:00Z",
    last_edited_at: "2026-09-23T08:00:00Z",
    frozen_at: null,
    frozen_by: null,
    ...over,
  };
}

export const ACTIVE_REV_1 = revision({
  id: "rev-1",
  number: 1,
  status: "active",
  name: "Rev 1",
  frozen_at: "2026-07-02T09:00:00Z",
  frozen_by: { id: "u-1", full_name: "Ahmet Yılmaz" },
});

export const ARCHIVED_REV_0 = revision({
  id: "rev-0",
  number: 0,
  status: "archived",
  name: null,
  frozen_at: "2026-04-28T09:00:00Z",
  frozen_by: { id: "u-1", full_name: "Ahmet Yılmaz" },
});

type Leaf = EvBudgetView["disciplines"][number]["groups"][number]["items"][number]["leaves"][number];

function leaf(over: Partial<Leaf> & Pick<Leaf, "id" | "item_id">): Leaf {
  return {
    section_id: null,
    section_name: null,
    planned_qty: "0",
    unit_mhr: null,
    rate_source: null,
    budget_mhr: "0",
    share: null,
    contractor_type: "own",
    contractor_source: "inherited",
    is_direct: true,
    is_direct_source: "inherited",
    window_start: null,
    window_end: null,
    window_source: null,
    outside_section_dates: false,
    ...over,
  };
}

export function budgetView(over: Partial<EvBudgetView> = {}): EvBudgetView {
  return {
    boq_synced_at: "2026-09-18T10:00:00Z",
    editable: true,
    revision: revision(),
    totals: {
      direct_budget_mhr: "3516",
      indirect_budget_mhr: "1400",
      item_count: 3,
      leaf_count: 4,
      empty_rate_leaf_count: 1,
    },
    freeze_blockers: [{ code: "disciplineless_group", count: 1, node_ids: [`g:${G_IZO}`] }],
    freeze_warnings: [{ code: "empty_rate", count: 1, node_ids: [LEAF_CAT] }],
    disciplines: [
      {
        id: `d:${D_KAB}`,
        discipline_id: D_KAB,
        code: "KAB",
        name: "Kaba İnşaat",
        color: "#2563eb",
        default_contractor_type: "own",
        distribution: "linear",
        budget_mhr: "3776",
        direct_budget_mhr: "2376",
        share: "0.6758",
        groups: [
          {
            id: `g:${G_BET}`,
            group_id: G_BET,
            discipline_id: D_KAB,
            name: "Betonarme",
            budget_mhr: "2376",
            direct_budget_mhr: "2376",
            share: "0.6758",
            items: [
              {
                id: `i:${I_BETON}`,
                item_id: I_BETON,
                code: "KAB.01.03",
                description: "Beton döküm",
                uom: "m³",
                planned_qty: "1570",
                contractor_type: "own",
                contractor_source: "inherited",
                is_direct: true,
                catalog_item_id: null,
                budget_mhr: "2376",
                direct_budget_mhr: "2376",
                share: "0.6758",
                empty_rate_count: 1,
                leaves: [
                  leaf({
                    id: LEAF_TML,
                    item_id: I_BETON,
                    section_id: S_TML,
                    section_name: "Temel",
                    planned_qty: "1320",
                    unit_mhr: "1.800000",
                    rate_source: "catalog",
                    budget_mhr: "2376",
                    share: "0.6758",
                    window_start: "2026-05-06",
                    window_end: "2026-07-15",
                    window_source: "section",
                  }),
                  leaf({
                    id: LEAF_CAT,
                    item_id: I_BETON,
                    section_id: S_CAT,
                    section_name: "Çatı",
                    planned_qty: "250",
                    contractor_type: "subcon",
                    contractor_source: "override",
                    window_start: "2026-12-01",
                    window_end: "2027-01-15",
                    window_source: "section",
                  }),
                ],
              },
            ],
          },
          {
            id: `g:${G_GEN}`,
            group_id: G_GEN,
            discipline_id: D_KAB,
            name: "Şantiye genel",
            budget_mhr: "1400",
            direct_budget_mhr: "0",
            share: "0",
            items: [
              {
                id: `i:${I_MOBIL}`,
                item_id: I_MOBIL,
                code: "GEN.01.01",
                description: "Mobilizasyon",
                uom: "gtr",
                planned_qty: "1",
                contractor_type: "own",
                contractor_source: "inherited",
                is_direct: false,
                catalog_item_id: null,
                budget_mhr: "1400",
                direct_budget_mhr: "0",
                share: null,
                empty_rate_count: 0,
                leaves: [
                  leaf({
                    id: LEAF_MOBIL,
                    item_id: I_MOBIL,
                    planned_qty: "1",
                    unit_mhr: "1400",
                    rate_source: "manual",
                    budget_mhr: "1400",
                    is_direct: false,
                  }),
                ],
              },
            ],
          },
        ],
      },
      {
        id: "d:none",
        discipline_id: null,
        code: null,
        name: null,
        color: null,
        default_contractor_type: "own",
        distribution: "linear",
        budget_mhr: "1140",
        direct_budget_mhr: "1140",
        share: "0.3242",
        groups: [
          {
            id: `g:${G_IZO}`,
            group_id: G_IZO,
            discipline_id: null,
            name: "Su yalıtımı",
            budget_mhr: "1140",
            direct_budget_mhr: "1140",
            share: "0.3242",
            items: [
              {
                id: `i:${I_IZO}`,
                item_id: I_IZO,
                code: "IZO.01.01",
                description: "Membran yalıtım",
                uom: "m²",
                planned_qty: "2280",
                contractor_type: "own",
                contractor_source: "inherited",
                is_direct: true,
                catalog_item_id: null,
                budget_mhr: "1140",
                direct_budget_mhr: "1140",
                share: "0.3242",
                empty_rate_count: 0,
                leaves: [
                  leaf({
                    id: LEAF_IZO,
                    item_id: I_IZO,
                    planned_qty: "2280",
                    unit_mhr: "0.5",
                    rate_source: "manual",
                    budget_mhr: "1140",
                    share: "0.3242",
                  }),
                ],
              },
            ],
          },
        ],
      },
    ],
    ...over,
  };
}

/** İkinci disiplin (Duvar & Sıva) — seçici seçenekleri için. */
export function viewWithTwoDisciplines(): EvBudgetView {
  const base = budgetView();
  const duv = {
    ...base.disciplines[0],
    id: `d:${D_DUV}`,
    discipline_id: D_DUV,
    code: "DUV",
    name: "Duvar & Sıva",
    color: "#93c5fd",
    default_contractor_type: "subcon" as const,
    groups: [],
  };
  return { ...base, disciplines: [base.disciplines[0], duv, base.disciplines[1]] };
}

export function diffOut(over: Partial<EvRevisionDiffOut> = {}): EvRevisionDiffOut {
  return {
    revision: revision(),
    against: ACTIVE_REV_1,
    direct_before_mhr: "3291",
    direct_after_mhr: "3516",
    direct_delta_mhr: "225",
    leaves: [
      {
        leaf_id: LEAF_TML,
        item_code: "KAB.01.03",
        item_description: "Beton döküm",
        section_name: "Temel",
        uom: "m³",
        reason: "qty_changed",
        prev_qty: "1250",
        qty: "1320",
        prev_unit_mhr: "1.8",
        unit_mhr: "1.8",
        prev_budget_mhr: "2250",
        budget_mhr: "2376",
        delta_mhr: "126",
      },
      {
        leaf_id: LEAF_IZO,
        item_code: "IZO.01.01",
        item_description: "Membran yalıtım",
        section_name: null,
        uom: "m²",
        reason: "rate_changed",
        prev_qty: "2280",
        qty: "2280",
        prev_unit_mhr: "0.55",
        unit_mhr: "0.5",
        prev_budget_mhr: "1254",
        budget_mhr: "1140",
        delta_mhr: "-114",
      },
    ],
    ...over,
  };
}

export function scheduleOut(over: Partial<EvScheduleOut> = {}): EvScheduleOut {
  return {
    sections: [
      { id: S_TML, name: "Temel", start_date: "2026-05-06", end_date: "2026-07-15", planned_worker_count: 18 },
      { id: S_CAT, name: "Çatı", start_date: "2026-12-01", end_date: "2027-01-15", planned_worker_count: 10 },
    ],
    bars: [
      {
        discipline_id: D_KAB,
        discipline_node_id: `d:${D_KAB}`,
        section_id: S_TML,
        section_name: "Temel",
        start_date: "2026-05-06",
        end_date: "2026-07-15",
        source: "section",
        outside_section_dates: false,
        budget_mhr: "2376",
      },
      {
        discipline_id: D_KAB,
        discipline_node_id: `d:${D_KAB}`,
        section_id: S_CAT,
        section_name: "Çatı",
        start_date: "2026-12-01",
        end_date: "2027-01-20",
        source: "override",
        outside_section_dates: true,
        budget_mhr: "0",
      },
    ],
    weekly_off_days: [6],
    holidays: ["2026-07-15"],
    ...over,
  };
}

export function previewOut(): EvPreviewOut {
  const days = (values: [string, string, string, string | null][]) =>
    values.map(([day, mhr, cumulative_mhr, planned_pct_cum]) => ({ day, mhr, cumulative_mhr, planned_pct_cum }));
  const week = (week_no: number, start: string, end: string, mhr: string, req: string | null, planned: number | null) => ({
    week_no,
    week_start: start,
    week_end: end,
    mhr,
    working_days: 6,
    required_people: req,
    planned_people: planned,
  });
  return {
    start: "2026-05-04",
    end: "2026-05-17",
    indirect_budget_mhr: "1400",
    unspreadable: [],
    total: {
      budget_mhr: "200",
      start: "2026-05-04",
      end: "2026-05-17",
      days: days([
        ["2026-05-04", "100", "100", "0.5"],
        ["2026-05-11", "100", "200", "1"],
      ]),
      weeks: [week(1, "2026-05-04", "2026-05-10", "100", "1.85", 18), week(2, "2026-05-11", "2026-05-17", "100", "1.85", 18)],
      peak_week: week(1, "2026-05-04", "2026-05-10", "100", "1.85", 18),
    },
    disciplines: [
      {
        discipline_id: D_KAB,
        discipline_node_id: `d:${D_KAB}`,
        code: "KAB",
        name: "Kaba İnşaat",
        color: "#2563eb",
        distribution: "linear",
        share: "1",
        series: {
          budget_mhr: "200",
          start: "2026-05-04",
          end: "2026-05-17",
          days: days([
            ["2026-05-04", "100", "100", "0.5"],
            ["2026-05-11", "100", "200", "1"],
          ]),
          weeks: [],
          peak_week: week(1, "2026-05-04", "2026-05-10", "100", "1.85", 18),
        },
      },
    ],
  };
}
