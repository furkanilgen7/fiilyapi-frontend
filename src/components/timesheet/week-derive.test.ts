import { describe, expect, it } from "vitest";

import type { PersonnelListItem } from "@/lib/api/hooks/usePersonnel";
import type { TimesheetWeek, TimesheetWeekRow } from "@/lib/api/hooks/useTimesheet";

import { buildTimesheetWeekView } from "./week-derive";
import { buildWeekSaveBody, timesheetDraftKey, type TimesheetDraft } from "./timesheet-draft";

/** Mockup'ın haftası: 2026 · 29 = 13–19 Temmuz 2026. */
const WEEK = { isoYear: 2026, isoWeek: 29 } as const;

function person(id: string, fullName: string, trade: string | null = "Kalıpçı"): PersonnelListItem {
  return {
    id,
    full_name: fullName,
    trade,
    source: "company",
    is_active: true,
  } as unknown as PersonnelListItem;
}

function weekRow(
  personnelId: string,
  fullName: string,
  cells: TimesheetWeekRow["cells"],
  totals = { normal_hours: "0", overtime_hours: "0", total_hours: "0" },
): TimesheetWeekRow {
  return {
    personnel_id: personnelId,
    full_name: fullName,
    trade: "Kalıpçı",
    source: "company",
    subcontractor_name: null,
    cells,
    totals,
  } as TimesheetWeekRow;
}

function weekPayload(rows: TimesheetWeekRow[]): TimesheetWeek {
  return {
    site_id: "s-1",
    site_name: "A-Blok",
    project_id: "p-1",
    project_name: "Güneşkent",
    iso_year: WEEK.isoYear,
    iso_week: WEEK.isoWeek,
    start_date: "2026-07-13",
    end_date: "2026-07-19",
    section_id: null,
    section_name: null,
    normal_day_hours: "9",
    weekly_normal_hours: "45",
    worker_count: rows.length,
    totals: { normal_hours: "0", overtime_hours: "0", total_hours: "0" },
    leave_day_count: 0,
    temporary_duty_day_count: 0,
    rows,
    day_totals: [],
    month_year: 2026,
    month_month: 7,
    month_total_hours: "588",
    month_man_days: "65.3",
    month_weeks: [],
  } as TimesheetWeek;
}

describe("buildTimesheetWeekView · gün iskeleti", () => {
  it("hafta HER ZAMAN 7 sütundur — hiç kaydı olmayan hafta da (yanıttan değil takvimden)", () => {
    const view = buildTimesheetWeekView({
      week: WEEK,
      personnel: [],
      weekData: undefined,
      sectionId: null,
    });
    expect(view.days).toHaveLength(7);
    expect(view.days.map((d) => d.workDate)).toEqual([
      "2026-07-13",
      "2026-07-14",
      "2026-07-15",
      "2026-07-16",
      "2026-07-17",
      "2026-07-18",
      "2026-07-19",
    ]);
    expect(view.days.map((d) => d.weekday)).toEqual([
      "Pzt",
      "Sal",
      "Çar",
      "Per",
      "Cum",
      "Cmt",
      "Paz",
    ]);
    expect(view.days[0].dayMonth).toBe("13 Tem");
    // Hafta sonu sütunları AYRI zemin taşır (E5 222-223).
    expect(view.days.map((d) => d.isSaturday)).toEqual([
      false, false, false, false, false, true, false,
    ]);
    expect(view.days.map((d) => d.isSunday)).toEqual([
      false, false, false, false, false, false, true,
    ]);
  });
});

describe("buildTimesheetWeekView · satır kümesi (K1)", () => {
  it("hafta kaydı OLMAYAN aktif personel de satır alır — yoksa yeni işçiye puantaj girilemez", () => {
    const view = buildTimesheetWeekView({
      week: WEEK,
      personnel: [person("p1", "Ahmet Yılmaz")],
      weekData: weekPayload([]),
      sectionId: null,
    });
    expect(view.rows.map((r) => r.personnelId)).toEqual(["p1"]);
    expect(view.rows[0].cells).toEqual({});
    // Sunucu bu satırı bilmiyor → Normal/FM UYDURULMAZ.
    expect(view.rows[0].normalHours).toBeNull();
    expect(view.rows[0].overtimeHours).toBeNull();
  });

  it("kartotekste OLMAYAN ama haftada hücresi olan personel de satır alır (birleşim)", () => {
    const view = buildTimesheetWeekView({
      week: WEEK,
      personnel: [],
      weekData: weekPayload([
        weekRow("p9", "Pasif Kişi", [
          { work_date: "2026-07-13", hours: "9", code: null, section_id: null },
        ]),
      ]),
      sectionId: null,
    });
    expect(view.rows.map((r) => r.personnelId)).toEqual(["p9"]);
    // Kaydetme gövdesinden düşseydi bu hücre SİLİNİRDİ.
    expect(view.allCells).toHaveLength(1);
  });

  it("satırlar tr-TR adına göre sıralanır", () => {
    const view = buildTimesheetWeekView({
      week: WEEK,
      personnel: [person("p2", "Şule Ak"), person("p1", "Ali Kaya")],
      weekData: weekPayload([]),
      sectionId: null,
    });
    expect(view.rows.map((r) => r.fullName)).toEqual(["Ali Kaya", "Şule Ak"]);
  });
});

describe("buildTimesheetWeekView · Normal/FM SUNUCUDAN okunur", () => {
  it("satırın Normal/FM değeri backend türevidir — ekranda hesaplanmaz", () => {
    // Mockup E5 244-246: Mehmet 9+11+9+9+9+6 = 53 saat, Normal 45, FM 8.
    const view = buildTimesheetWeekView({
      week: WEEK,
      personnel: [],
      weekData: weekPayload([
        weekRow(
          "p1",
          "Mehmet Yılmaz",
          [
            { work_date: "2026-07-13", hours: "9", code: null, section_id: null },
            { work_date: "2026-07-14", hours: "11", code: null, section_id: null },
            { work_date: "2026-07-15", hours: "9", code: null, section_id: null },
            { work_date: "2026-07-16", hours: "9", code: null, section_id: null },
            { work_date: "2026-07-17", hours: "9", code: null, section_id: null },
            { work_date: "2026-07-18", hours: "6", code: null, section_id: null },
          ],
          { normal_hours: "45", overtime_hours: "8", total_hours: "53" },
        ),
      ]),
      sectionId: null,
    });
    expect(view.rows[0].normalHours).toBe("45");
    expect(view.rows[0].overtimeHours).toBe("8");
    // Hafta toplamı DÜZ toplamdır (türev değil) — 9+11+9+9+9+6.
    expect(Number(view.rows[0].totalHours)).toBe(53);
    expect(Number(view.totalHours)).toBe(53);
    expect(Number(view.normalHours)).toBe(45);
    expect(Number(view.overtimeHours)).toBe(8);
  });

  it("🔴 kaydedilmemiş düzenleme Normal/FM'i BAYAT yapar — sessizce eski sayı basılmaz", () => {
    const draft: TimesheetDraft = {
      [timesheetDraftKey("p1", "2026-07-15")]: { hours: "12", code: null, sectionId: null },
    };
    const view = buildTimesheetWeekView({
      week: WEEK,
      personnel: [],
      weekData: weekPayload([
        weekRow(
          "p1",
          "Mehmet Yılmaz",
          [{ work_date: "2026-07-13", hours: "9", code: null, section_id: null }],
          { normal_hours: "9", overtime_hours: "0", total_hours: "9" },
        ),
      ]),
      sectionId: null,
      draft,
    });
    expect(view.rows[0].isStale).toBe(true);
    expect(view.isStale).toBe(true);
    // Toplam CANLIDIR (düz toplama serbest): 9 + 12.
    expect(Number(view.rows[0].totalHours)).toBe(21);
    // Normal/FM eski değerdir — ekran onu BAYAT diye işaretler.
    expect(view.rows[0].normalHours).toBe("9");
  });
});

describe("buildTimesheetWeekView · gün sütunu toplamları", () => {
  it("saatli hücre çalışılmış sayılır, kodlu hücre SAYILMAZ; izin/görev AYRI sayaçtır", () => {
    const view = buildTimesheetWeekView({
      week: WEEK,
      personnel: [],
      weekData: weekPayload([
        weekRow("p1", "A", [
          { work_date: "2026-07-13", hours: "9", code: null, section_id: null },
        ]),
        weekRow("p2", "B", [
          { work_date: "2026-07-13", hours: null, code: "leave", section_id: null },
        ]),
        weekRow("p3", "C", [
          { work_date: "2026-07-13", hours: null, code: "temporary_duty", section_id: null },
        ]),
        weekRow("p4", "D", [
          { work_date: "2026-07-13", hours: "6.5", code: null, section_id: null },
        ]),
      ]),
      sectionId: null,
    });
    const monday = view.days[0];
    expect(Number(monday.totalHours)).toBe(15.5);
    expect(monday.workedDayCount).toBe(2);
    expect(monday.leaveCount).toBe(1);
    expect(monday.temporaryDutyCount).toBe(1);
  });
});

describe("buildTimesheetWeekView · KPI sayaçları", () => {
  it("🔴 İzin ve Geçici Görev AYRI sayılır (yönetim kararı) — görev bir izin değildir", () => {
    const view = buildTimesheetWeekView({
      week: WEEK,
      personnel: [],
      weekData: weekPayload([
        weekRow("p1", "A", [
          { work_date: "2026-07-13", hours: null, code: "leave", section_id: null },
          { work_date: "2026-07-14", hours: null, code: "leave", section_id: null },
          { work_date: "2026-07-15", hours: null, code: "temporary_duty", section_id: null },
        ]),
      ]),
      sectionId: null,
    });
    expect(view.leaveDayCount).toBe(2);
    expect(view.temporaryDutyDayCount).toBe(1);
    // Toplanmış olsaydı ikisi de 3 olurdu — mockup'ın "27 saat · 3 gün" kartı
    // tam olarak bu toplamayı yapıyordu.
    expect(view.leaveDayCount + view.temporaryDutyDayCount).toBe(3);
  });

  it("işçi sayısı GÖRÜNEN kümede hücresi olan personeldir", () => {
    const view = buildTimesheetWeekView({
      week: WEEK,
      personnel: [person("p1", "A"), person("p2", "B")],
      weekData: weekPayload([
        weekRow("p1", "A", [
          { work_date: "2026-07-13", hours: "9", code: null, section_id: null },
        ]),
      ]),
      sectionId: null,
    });
    expect(view.rows).toHaveLength(2);
    expect(view.workerCount).toBe(1);
  });
});

describe("🔴 K2 KAPSAM KURALI · bölüm süzgeci YALNIZ görünüme uygulanır", () => {
  const payload = weekPayload([
    weekRow("p1", "Görünen Kişi", [
      { work_date: "2026-07-13", hours: "9", code: null, section_id: "sec-1" },
    ]),
    weekRow("p2", "Gizli Kişi", [
      { work_date: "2026-07-14", hours: "8", code: null, section_id: "sec-2" },
    ]),
  ]);

  it("süzgeç satırları ve toplamları süzer", () => {
    const view = buildTimesheetWeekView({
      week: WEEK,
      personnel: [],
      weekData: payload,
      sectionId: "sec-1",
    });
    expect(view.rows.find((r) => r.personnelId === "p2")?.cells).toEqual({});
    expect(Number(view.totalHours)).toBe(9);
    expect(Number(view.days[1].totalHours)).toBe(0);
  });

  it("🔴 süzgeç AÇIKKEN BİLE `allCells` şantiyenin TAM hafta kümesidir — gövde eksilmez", () => {
    const view = buildTimesheetWeekView({
      week: WEEK,
      personnel: [],
      weekData: payload,
      sectionId: "sec-1",
    });
    const body = buildWeekSaveBody(view.allCells);
    // POZİTİF KONTROL: süzgeç DIŞINDAKİ bölümün hücresi gövdede DURUYOR.
    // Düşseydi `PUT` onu SİLERDİ (bu dilimin en kritik tuzağı).
    expect(body.cells).toEqual([
      expect.objectContaining({ personnel_id: "p1", section_id: "sec-1" }),
      expect.objectContaining({ personnel_id: "p2", section_id: "sec-2", hours: "8" }),
    ]);
  });

  it("🔴 gövde YALNIZ bu haftanın günlerini taşır — ayın öbür haftasına dokunulmaz", () => {
    const view = buildTimesheetWeekView({
      week: WEEK,
      personnel: [],
      weekData: payload,
      sectionId: "sec-1",
      draft: {
        [timesheetDraftKey("p1", "2026-07-15")]: { hours: "7", code: null, sectionId: "sec-1" },
      },
    });
    const dates = buildWeekSaveBody(view.allCells).cells.map((c) => c.work_date);
    for (const date of dates) {
      expect(date >= "2026-07-13" && date <= "2026-07-19").toBe(true);
    }
  });
});

describe("buildTimesheetWeekView · ek satır süzgeçleri (E5 100-122)", () => {
  it("satır süzgeci GÖRÜNÜMÜ eler ama `allCells`e DOKUNMAZ", () => {
    const view = buildTimesheetWeekView({
      week: WEEK,
      personnel: [],
      weekData: weekPayload([
        weekRow("p1", "Kalıpçı Kişi", [
          { work_date: "2026-07-13", hours: "9", code: null, section_id: null },
        ]),
        weekRow("p2", "Öteki Kişi", [
          { work_date: "2026-07-14", hours: "8", code: null, section_id: null },
        ]),
      ]),
      sectionId: null,
      rowFilter: (row) => row.personnelId === "p1",
    });
    expect(view.rows.map((r) => r.personnelId)).toEqual(["p1"]);
    expect(view.allCells).toHaveLength(2);
  });
});
