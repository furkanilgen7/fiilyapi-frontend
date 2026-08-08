import { describe, it, expect } from "vitest";

import type { PersonnelListItem } from "@/lib/api/hooks/usePersonnel";
import type { TimesheetMatrix } from "@/lib/api/hooks/useTimesheet";

import { buildTimesheetView, dayTotalModifier, dayTotalText } from "./derive";

// F-PT T2 · turev katmani. Fikstur e2e mock-backend'in 2026-08 · s-1 kumesiyle
// AYNI hikayeyi anlatir: 03 Agu -> "4+", 04 Agu -> "3G".

const PERSONNEL: PersonnelListItem[] = [
  { id: "per-1", full_name: "Ahmet Yılmaz", trade: "Kalıpçı", source: "company", subcontractor_id: null, user_id: null, is_active: true },
  { id: "per-2", full_name: "Barış Demir", trade: "Demirci", source: "company", subcontractor_id: null, user_id: null, is_active: true },
  { id: "per-3", full_name: "Cem Aksoy", trade: "Elektrikçi", source: "subcontractor", subcontractor_id: "sub-1", user_id: null, is_active: true },
  { id: "per-4", full_name: "Deniz Kaya", trade: "Duvarcı", source: "subcontractor", subcontractor_id: "sub-2", user_id: null, is_active: true },
  // Hic hucresi olmayan AKTIF personel — K1: matriste satiri OLMASA DA gorunur.
  { id: "per-9", full_name: "Zeki Yeni", trade: "Sıvacı", source: "company", subcontractor_id: null, user_id: null, is_active: true },
];

const MATRIX: TimesheetMatrix = {
  site_id: "s-1",
  site_name: "A-Blok",
  project_id: "p-1",
  project_name: "Güneşkent",
  year: 2026,
  month: 8,
  section_id: null,
  section_name: null,
  worker_count: 4,
  total_man_days: 0,
  total_overtime_hours: "0",
  day_totals: [],
  rows: [
    {
      personnel_id: "per-1",
      full_name: "Ahmet Yılmaz",
      trade: "Kalıpçı",
      source: "company",
      subcontractor_name: null,
      man_days: 0,
      cells: [
        { work_date: "2026-08-03", code: "worked", overtime_hours: null, section_id: "sec-1" },
        { work_date: "2026-08-04", code: "worked", overtime_hours: null, section_id: "sec-1" },
        { work_date: "2026-08-05", code: "leave", overtime_hours: null, section_id: "sec-1" },
      ],
    },
    {
      personnel_id: "per-2",
      full_name: "Barış Demir",
      trade: "Demirci",
      source: "company",
      subcontractor_name: null,
      man_days: 0,
      cells: [
        { work_date: "2026-08-03", code: "worked", overtime_hours: null, section_id: "sec-1" },
        { work_date: "2026-08-04", code: "worked", overtime_hours: null, section_id: "sec-1" },
      ],
    },
    {
      personnel_id: "per-3",
      full_name: "Cem Aksoy",
      trade: "Elektrikçi",
      source: "subcontractor",
      subcontractor_name: "Aydın Elektrik",
      man_days: 0,
      cells: [
        // Saatli FM (3.00) + saatsiz FM (null) — ikincisi toplama 0 katar.
        { work_date: "2026-08-03", code: "overtime", overtime_hours: "3.00", section_id: "sec-1" },
        { work_date: "2026-08-04", code: "temporary_duty", overtime_hours: null, section_id: "sec-1" },
        { work_date: "2026-08-06", code: "overtime", overtime_hours: null, section_id: "sec-1" },
      ],
    },
    {
      personnel_id: "per-4",
      full_name: "Deniz Kaya",
      trade: "Duvarcı",
      source: "subcontractor",
      subcontractor_name: "Çelik İnşaat",
      man_days: 0,
      cells: [
        { work_date: "2026-08-03", code: "worked", overtime_hours: null, section_id: "sec-2" },
        { work_date: "2026-08-04", code: "worked", overtime_hours: null, section_id: "sec-2" },
        { work_date: "2026-08-05", code: "holiday", overtime_hours: null, section_id: "sec-2" },
        { work_date: "2026-08-07", code: "overtime", overtime_hours: "2.50", section_id: "sec-2" },
      ],
    },
  ],
};

function build(sectionId: string | null) {
  return buildTimesheetView({
    year: 2026,
    month: 8,
    personnel: PERSONNEL,
    matrix: MATRIX,
    sectionId,
  });
}

function dayOf(view: ReturnType<typeof build>, iso: string) {
  const day = view.days.find((candidate) => candidate.workDate === iso);
  if (!day) throw new Error(`gun bulunamadi: ${iso}`);
  return day;
}

describe("buildTimesheetView · gun iskeleti", () => {
  it("gun sutunlari GERCEK takvimden gelir (matris day_totals BOS olsa bile)", () => {
    expect(build(null).days).toHaveLength(31);
  });
});

describe("buildTimesheetView · K1 satir kumesi", () => {
  it("hic hucresi olmayan AKTIF personel de satir alir (matris bos kalmasin)", () => {
    const row = build(null).rows.find((candidate) => candidate.personnelId === "per-9");
    expect(row).toBeDefined();
    expect(row?.manDays).toBe(0);
  });

  it("kartotekste OLMAYAN ama matriste hucresi olan personel DUSMEZ", () => {
    const view = buildTimesheetView({
      year: 2026,
      month: 8,
      personnel: [],
      matrix: MATRIX,
      sectionId: null,
    });
    expect(view.rows.map((row) => row.personnelId)).toContain("per-3");
  });

  it("satirlar ada gore sirali", () => {
    expect(build(null).rows.map((row) => row.fullName)).toEqual([
      "Ahmet Yılmaz",
      "Barış Demir",
      "Cem Aksoy",
      "Deniz Kaya",
      "Zeki Yeni",
    ]);
  });
});

describe("buildTimesheetView · adam-gun", () => {
  it("adam-gun = worked + overtime; izin/tatil/gecici gorev SAYILMAZ", () => {
    const rows = build(null).rows;
    // per-1: 2 worked + 1 leave
    expect(rows.find((row) => row.personnelId === "per-1")?.manDays).toBe(2);
    // per-3: 2 overtime + 1 temporary_duty
    expect(rows.find((row) => row.personnelId === "per-3")?.manDays).toBe(2);
    // per-4: 2 worked + 1 holiday + 1 overtime
    expect(rows.find((row) => row.personnelId === "per-4")?.manDays).toBe(3);
  });

  it("genel adam-gun kisi toplamlarinin toplamidir", () => {
    // 2 + 2 + 2 + 3 + 0
    expect(build(null).totalManDays).toBe(9);
  });

  it("isci sayisi YALNIZ hucresi olan personeli sayar", () => {
    expect(build(null).workerCount).toBe(4);
  });
});

// D1 — E5 ve SP ayak satiri isaretleri AYRIDIR (kullanici karari 2026-08-07):
// SP 237/245 `4+`/`3G` basar; E5 203 FM verisi varken bile duz sayi basar.
describe("buildTimesheetView · ayak satiri isaretleri (SP varyanti)", () => {
  it("FM'li gun '4+' basar — '+' sayiyi DEGISTIRMEZ", () => {
    const day = dayOf(build(null), "2026-08-03");
    expect(day.workedCount).toBe(4);
    expect(day.hasOvertime).toBe(true);
    expect(dayTotalText(day, "site")).toBe("4+");
    expect(dayTotalModifier(day, "site")).toBe("overtime");
  });

  it("gecici gorevli gun '3G' basar — G adam-gune GIRMEZ", () => {
    const day = dayOf(build(null), "2026-08-04");
    expect(day.workedCount).toBe(3);
    expect(day.temporaryDutyCount).toBe(1);
    expect(dayTotalText(day, "site")).toBe("3G");
    expect(dayTotalModifier(day, "site")).toBe("duty");
  });

  it("yalniz izin/tatil olan gun 0 basar", () => {
    const day = dayOf(build(null), "2026-08-05");
    expect(dayTotalText(day, "site")).toBe("0");
    expect(dayTotalModifier(day, "site")).toBe("zero");
  });

  it("kayitsiz gun 0 basar", () => {
    expect(dayTotalText(dayOf(build(null), "2026-08-20"), "site")).toBe("0");
  });
});

describe("buildTimesheetView · ayak satiri isaretleri (E5 varyanti)", () => {
  it("FM'li gunde '+' BASMAZ — E5 203 duz '4' gosterir", () => {
    const day = dayOf(build(null), "2026-08-03");
    expect(day.hasOvertime).toBe(true);
    expect(dayTotalText(day, "general")).toBe("4");
    expect(dayTotalText(day, "general")).not.toContain("+");
    expect(dayTotalModifier(day, "general")).toBe("worked");
  });

  it("gecici gorevli gunde 'G' BASMAZ — E5 legend'i dortludur", () => {
    const day = dayOf(build(null), "2026-08-04");
    expect(day.temporaryDutyCount).toBe(1);
    expect(dayTotalText(day, "general")).toBe("3");
    expect(dayTotalModifier(day, "general")).toBe("worked");
  });

  it("sayi iki varyantta da AYNIDIR — yalniz isaretler farklidir", () => {
    for (const iso of ["2026-08-03", "2026-08-04", "2026-08-05", "2026-08-20"]) {
      const day = dayOf(build(null), iso);
      expect(dayTotalText(day, "site")).toContain(dayTotalText(day, "general"));
    }
  });
});

describe("buildTimesheetView · FM saat toplami", () => {
  it("YALNIZ girilmis saatleri toplar (saatsiz FM 0 katar)", () => {
    // 3.00 (03 Agu) + 2.50 (07 Agu); 06 Agu'nun saatsiz FM'i 0.
    expect(Number(build(null).totalOvertimeHours)).toBe(5.5);
  });

  it("ondalik toplam STRING aritmetigidir — float 0.1+0.2 hatasi SIZMAZ", () => {
    const view = buildTimesheetView({
      year: 2026,
      month: 8,
      personnel: [],
      matrix: {
        ...MATRIX,
        rows: [
          {
            ...MATRIX.rows[0],
            cells: [
              { work_date: "2026-08-03", code: "overtime", overtime_hours: "0.10", section_id: null },
              { work_date: "2026-08-04", code: "overtime", overtime_hours: "0.20", section_id: null },
            ],
          },
        ],
      },
      sectionId: null,
    });
    // Float toplami "0.30000000000000004" verirdi; `lib/decimal.ts` vermez.
    expect(view.totalOvertimeHours).toBe("0.30");
  });
});

describe("buildTimesheetView · K2 bolum suzgeci", () => {
  it("suzgec YALNIZ gorunumu daraltir; TAM hucre kumesi elde KALIR", () => {
    const filtered = build("sec-2");
    expect(filtered.allCells).toHaveLength(12);
    // Gorunen kume yalniz sec-2'nin dort hucresi.
    const visible = filtered.rows.reduce(
      (sum, row) => sum + Object.keys(row.cells).length,
      0,
    );
    expect(visible).toBe(4);
  });

  it("suzulmus kumede turevler yeniden hesaplanir", () => {
    const filtered = build("sec-2");
    expect(filtered.workerCount).toBe(1);
    expect(filtered.totalManDays).toBe(3);
    expect(Number(filtered.totalOvertimeHours)).toBe(2.5);
    expect(dayTotalText(dayOf(filtered, "2026-08-03"), "site")).toBe("1");
    expect(dayTotalText(dayOf(filtered, "2026-08-04"), "site")).toBe("1");
  });

  it("sec-1 suzgeci diger bolumun hucrelerini gorunumden cikarir", () => {
    const filtered = build("sec-1");
    const denizCells = filtered.rows.find((row) => row.personnelId === "per-4")?.cells;
    expect(Object.keys(denizCells ?? {})).toHaveLength(0);
    expect(dayTotalText(dayOf(filtered, "2026-08-03"), "site")).toBe("3+");
  });
});

describe("buildTimesheetView · veri yokken", () => {
  it("matris yuklenmeden de gun iskeleti basilir, cokme olmaz", () => {
    const view = buildTimesheetView({
      year: 2026,
      month: 2,
      personnel: undefined,
      matrix: undefined,
      sectionId: null,
    });
    expect(view.days).toHaveLength(28);
    expect(view.rows).toHaveLength(0);
    expect(view.totalManDays).toBe(0);
    expect(Number(view.totalOvertimeHours)).toBe(0);
  });
});
