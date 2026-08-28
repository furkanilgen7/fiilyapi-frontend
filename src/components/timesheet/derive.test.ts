import { describe, it, expect } from "vitest";

import { EMPTY_PERSONNEL_HR_FIELDS } from "@/lib/api/hooks/personnel-fixtures";
import type { PersonnelListItem } from "@/lib/api/hooks/usePersonnel";
import type { TimesheetMatrix, TimesheetMatrixRow } from "@/lib/api/hooks/useTimesheet";

import { buildTimesheetView } from "./derive";

// PUAN-SAAT · AYLIK türev katmanı (artık YALNIZ salt-okur yüzeyler kullanır).
// Fikstür e2e mock-backend'in 2026-08 · s-1 kümesiyle AYNI hikâyeyi anlatır.

function person(id: string, fullName: string, trade: string): PersonnelListItem {
  return {
    ...EMPTY_PERSONNEL_HR_FIELDS,
    id,
    full_name: fullName,
    trade,
    source: "company",
    subcontractor_id: null,
    user_id: null,
    is_active: true,
  } as PersonnelListItem;
}

const PERSONNEL: PersonnelListItem[] = [
  person("per-1", "Ahmet Yılmaz", "Kalıpçı"),
  person("per-2", "Barış Demir", "Demirci"),
  // Hiç hücresi olmayan AKTİF personel — K1: matriste satırı OLMASA DA görünür.
  person("per-9", "Zeki Yeni", "Sıvacı"),
];

function matrixRow(
  personnelId: string,
  fullName: string,
  cells: TimesheetMatrixRow["cells"],
): TimesheetMatrixRow {
  return {
    personnel_id: personnelId,
    full_name: fullName,
    trade: "Kalıpçı",
    source: "company",
    subcontractor_name: null,
    total_hours: "0",
    man_days: "0",
    cells,
  } as TimesheetMatrixRow;
}

const MATRIX: TimesheetMatrix = {
  site_id: "s-1",
  site_name: "A-Blok",
  project_id: "p-1",
  project_name: "Güneşkent",
  year: 2026,
  month: 8,
  section_id: null,
  section_name: null,
  worker_count: 2,
  total_hours: "0",
  total_man_days: "0",
  day_totals: [],
  rows: [
    matrixRow("per-1", "Ahmet Yılmaz", [
      { work_date: "2026-08-03", hours: "9", code: null, section_id: "sec-1" },
      { work_date: "2026-08-05", hours: null, code: "leave", section_id: "sec-1" },
    ]),
    matrixRow("per-2", "Barış Demir", [
      { work_date: "2026-08-03", hours: "6.5", code: null, section_id: "sec-2" },
      { work_date: "2026-08-04", hours: null, code: "temporary_duty", section_id: "sec-2" },
    ]),
  ],
} as TimesheetMatrix;

function view(sectionId: string | null = null, normalDayHours: string | null = null) {
  return buildTimesheetView({
    year: 2026,
    month: 8,
    personnel: PERSONNEL,
    matrix: MATRIX,
    sectionId,
    normalDayHours,
  });
}

describe("buildTimesheetView · gün iskeleti", () => {
  it("ay HER ZAMAN tam basılır — hücreler seyrek, sütunlar DEĞİL", () => {
    expect(view().days).toHaveLength(31);
    expect(view().days[0].workDate).toBe("2026-08-01");
  });

  it("hiç kaydı olmayan ay da 31 sütun basar (matris yokken bile)", () => {
    const empty = buildTimesheetView({
      year: 2026,
      month: 8,
      personnel: [],
      matrix: undefined,
      sectionId: null,
    });
    expect(empty.days).toHaveLength(31);
    expect(empty.rows).toEqual([]);
  });
});

describe("buildTimesheetView · satır kümesi (K1)", () => {
  it("hücresi olmayan aktif personel de satır alır", () => {
    expect(view().rows.map((row) => row.personnelId)).toContain("per-9");
    expect(view().rows.find((row) => row.personnelId === "per-9")?.cells).toEqual({});
  });

  it("işçi sayısı YALNIZ hücresi olan satırları sayar", () => {
    expect(view().rows).toHaveLength(3);
    expect(view().workerCount).toBe(2);
  });

  it("satırlar tr-TR adına göre sıralanır", () => {
    expect(view().rows.map((row) => row.fullName)).toEqual([
      "Ahmet Yılmaz",
      "Barış Demir",
      "Zeki Yeni",
    ]);
  });
});

describe("buildTimesheetView · SAAT XOR KOD", () => {
  it("saat hücresi saat taşır, kod hücresi kod — ikisi birden DOLMAZ", () => {
    const row = view().rows.find((r) => r.personnelId === "per-1");
    expect(row?.cells["2026-08-03"]).toEqual({ hours: "9", code: null, sectionId: "sec-1" });
    expect(row?.cells["2026-08-05"]).toEqual({ hours: null, code: "leave", sectionId: "sec-1" });
  });

  it("satır toplamı DÜZ saat toplamıdır; kodlu hücre 0 katar", () => {
    expect(Number(view().rows.find((r) => r.personnelId === "per-1")?.totalHours)).toBe(9);
    expect(Number(view().rows.find((r) => r.personnelId === "per-2")?.totalHours)).toBe(6.5);
    expect(Number(view().totalHours)).toBe(15.5);
  });

  it("gün sütunu: saatli hücre çalışılmış sayılır, kodlu hücre AYRI sayaçtadır", () => {
    const days = view().days;
    const aug3 = days.find((d) => d.workDate === "2026-08-03");
    const aug4 = days.find((d) => d.workDate === "2026-08-04");
    const aug5 = days.find((d) => d.workDate === "2026-08-05");
    expect(Number(aug3?.totalHours)).toBe(15.5);
    expect(aug3?.workedDayCount).toBe(2);
    expect(aug4?.temporaryDutyCount).toBe(1);
    expect(aug4?.workedDayCount).toBe(0);
    expect(aug5?.leaveCount).toBe(1);
  });
});

describe("buildTimesheetView · bölüm süzgeci (K2)", () => {
  it("süzgeç satırları, gün toplamlarını ve işçi sayısını süzer", () => {
    const filtered = view("sec-1");
    expect(filtered.rows.find((r) => r.personnelId === "per-2")?.cells).toEqual({});
    expect(filtered.workerCount).toBe(1);
    expect(Number(filtered.totalHours)).toBe(9);
    expect(Number(filtered.days.find((d) => d.workDate === "2026-08-03")?.totalHours)).toBe(9);
  });
});

describe("buildTimesheetView · renk eşiği", () => {
  it("🔴 aylık uç `normal_day_hours` YAYINLAMAZ — eşik verilmezse `null` kalır, UYDURULMAZ", () => {
    expect(view().normalDayHours).toBeNull();
  });

  it("çağıran biliyorsa eşik aynen taşınır", () => {
    expect(view(null, "7.5").normalDayHours).toBe("7.5");
  });
});
