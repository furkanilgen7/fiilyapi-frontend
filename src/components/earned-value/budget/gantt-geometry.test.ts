import { describe, it, expect } from "vitest";

import { dayNumber, ganttGeometry, GANTT_LEFT, GANTT_WIDTH, isoFromDayNumber, nextWindows } from "./gantt-geometry";
import { D_KAB, S_CAT, S_TML, scheduleOut } from "./budget-fixtures";

const DISCIPLINES = new Map([[`d:${D_KAB}`, { name: "Kaba İnşaat", color: "#2563eb" }]]);

describe("dayNumber / isoFromDayNumber — UTC gün sayısı (yerel saat kayması yok)", () => {
  it("gidiş-dönüş", () => {
    expect(isoFromDayNumber(dayNumber("2026-05-06"))).toBe("2026-05-06");
    expect(dayNumber("2026-05-07") - dayNumber("2026-05-06")).toBe(1);
  });
});

describe("ganttGeometry (BÜT:682-697 `gantt()`, Ek Formlar M3/M4)", () => {
  const geo = ganttGeometry(scheduleOut(), DISCIPLINES, "2026-09-24");

  it("satır dizisi: bölüm başlığı + altında disiplin çubuğu (Temel → Çatı)", () => {
    expect(geo.rows.map((r) => [r.kind, r.label])).toEqual([
      ["section", "Temel"],
      ["bar", "Kaba İnşaat"],
      ["section", "Çatı"],
      ["bar", "Kaba İnşaat"],
    ]);
  });

  it("alan en erken başlangıçtan en geç bitişe; ilk çubuk sol kenarda, son çubuk sağ kenarda biter", () => {
    const first = geo.rows[1].bar!;
    const last = geo.rows[3].bar!;
    expect(first.x).toBe(GANTT_LEFT);
    expect(last.x + last.w).toBe(GANTT_LEFT + GANTT_WIDTH);
  });

  it("bütün koordinatlar TAM SAYI (görsel spec 4. parça)", () => {
    const numbers = geo.rows.flatMap((r) => [r.lineY, r.textY, r.bar?.x ?? 0, r.bar?.w ?? 0, r.bar?.y ?? 0]);
    numbers.push(...geo.holidays.flatMap((h) => [h.x, h.w]), ...geo.months.map((m) => m.x), geo.height);
    expect(numbers.every(Number.isInteger)).toBe(true);
  });

  it("ezilmiş pencere: bayrak + bölüm tarihinin gölgesi + dışına taşma (F0-4)", () => {
    const override = geo.rows[3];
    expect(override).toMatchObject({ override: true, outside: true, sectionId: S_CAT, disciplineId: D_KAB });
    expect(override.ghost).not.toBeNull();
    expect(override.dates).toBe("01.12.26–20.01.27");
    expect(geo.rows[1]).toMatchObject({ override: false, sectionId: S_TML, ghost: null });
  });

  it("tatil + haftalık izin günü (Pazar = 6) şeritleri; bugün çizgisi alan içinde", () => {
    expect(geo.holidays.length).toBeGreaterThan(30);
    expect(geo.todayX).not.toBeNull();
    expect(ganttGeometry(scheduleOut(), DISCIPLINES, "2030-01-01").todayX).toBeNull();
  });

  it("bölümsüz çubuklar ayrı 'Bölümsüz' başlığı altında (M4 b)", () => {
    const base = scheduleOut();
    const unsectioned = { ...base.bars[0], section_id: null, section_name: null, source: "union" as const };
    const out = ganttGeometry({ ...base, bars: [...base.bars, unsectioned] }, DISCIPLINES, "2026-09-24");
    expect(out.rows.slice(-2).map((r) => [r.kind, r.label])).toEqual([
      ["section", "Bölümsüz"],
      ["bar", "Kaba İnşaat"],
    ]);
  });

  it("veri yoksa boş geometri", () => {
    const out = ganttGeometry({ sections: [], bars: [], holidays: [], weekly_off_days: [] }, DISCIPLINES, "2026-09-24");
    expect(out.rows).toEqual([]);
    expect(out.todayX).toBeNull();
  });
});

describe("nextWindows — PUT /windows TAM değiştirme gövdesi (B1-3)", () => {
  const bars = scheduleOut().bars; // Temel: bölüm · Çatı: ezilmiş

  it("yeni ezme eklenir, mevcut ezmeler KORUNUR", () => {
    expect(nextWindows(bars, D_KAB, S_TML, { start: "2026-05-10", end: "2026-07-20" })).toEqual([
      { discipline_id: D_KAB, section_id: S_CAT, start_date: "2026-12-01", end_date: "2027-01-20" },
      { discipline_id: D_KAB, section_id: S_TML, start_date: "2026-05-10", end_date: "2026-07-20" },
    ]);
  });

  it("aynı pencerenin ezmesi değiştirilir (çift kayıt yok)", () => {
    expect(nextWindows(bars, D_KAB, S_CAT, { start: "2026-12-05", end: "2027-01-10" })).toEqual([
      { discipline_id: D_KAB, section_id: S_CAT, start_date: "2026-12-05", end_date: "2027-01-10" },
    ]);
  });

  it("'Bölüm tarihine dön' = o ezme gövdeden DÜŞER", () => {
    expect(nextWindows(bars, D_KAB, S_CAT, null)).toEqual([]);
  });
});
